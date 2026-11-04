"""Privacy, AI consent, signatures and the offline helpers."""

from sqlmodel import Session, select

from app.db import engine
from app.models import Job, LogEntry, User
from app.seed import CAFE_ID, RAJAN_ID, SITA_ID, SITA_JOB
from app.services import links, signing, style, work
from tests.conftest import auth


class FakeLLM:
    def __init__(self):
        self.prompts = []

    def json(self, system, user, schema):
        self.prompts.append(user)
        n = user.count("\n", user.index("list:"), user.index("past review notes")) - 2
        return {"items": [{"item": "x", "status": "looks_done", "comment": "ok"}] * n, "to_fix": [], "good": ["all"],
                "summary": "Looks good."}


def _submit_with(llm, *, helper: bool, allow: bool) -> dict:
    with Session(engine) as s:
        anchor, job = s.get(User, RAJAN_ID), s.get(Job, SITA_JOB)
        anchor.ai_helper, job.allow_ai = helper, allow
        s.add_all([anchor, job])
        s.commit()
        return work.submit(s, s.get(User, SITA_ID), s.get(Job, SITA_JOB), link="", content="menu css",
                           note="", llm=llm).check


def test_ai_runs_only_with_both_anchor_and_client_consent(client):
    for helper, allow in ((False, False), (True, False), (False, True)):
        llm = FakeLLM()
        client.post("/demo/reset")
        assert _submit_with(llm, helper=helper, allow=allow)["source"] == "offline" and llm.prompts == []
    client.post("/demo/reset")
    llm = FakeLLM()
    result = _submit_with(llm, helper=True, allow=True)
    assert result["source"] == "ai" and len(llm.prompts) == 1
    for private in ("Sita", "Thapa", "Rajan", "Harbour", "Emma", "@", "Kaski"):
        assert private not in llm.prompts[0], private


def test_logbook_entry_holds_no_private_details(client):
    with Session(engine) as s:
        entries = s.exec(select(LogEntry)).all()
        assert entries
        for e in entries:
            text = str(e.credential).lower()
            for leak in ("price", "budget", "@demo", "rupandehi", "kaski", "12000", "6000"):
                assert leak not in text, leak


def test_tampered_entry_fails_the_signature_check(client):
    slug = client.get("/v1/me", headers=auth(client, "u-junior-bikash")).json()["profile_slug"]
    entry = client.get(f"/v1/public/logbook/{slug}").json()["entries"][0]
    assert signing.verify(entry["credential"], entry["signature_b64"])
    entry["credential"]["credentialSubject"]["job"] = "Built Facebook"
    assert not signing.verify(entry["credential"], entry["signature_b64"])
    keys = client.get("/.well-known/sajha-kaam-keys.json").json()["keys"][0]
    assert keys["alg"] == "Ed25519" and keys["key_id"] == entry["key_id"]


def test_only_public_github_prs_and_google_docs_are_ever_read():
    assert links.source_of("https://github.com/acme/site/pull/12") == "github"
    assert links.fetch_url("https://github.com/acme/site/pull/12") == "https://github.com/acme/site/pull/12.diff"
    assert links.source_of("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit") == "google_doc"
    for other in ("http://localhost:8000/admin", "https://169.254.169.254/latest", "https://evil.example/pull/1",
                  "https://github.com.evil.example/a/b/pull/1"):
        assert links.fetch_url(other) is None


def test_style_search_finds_the_anchors_closest_note():
    notes = ["Buttons need to be at least 44px tall.", "Compress images to WebP.", "Use the café green."]
    assert style.rank("the button is too small to tap", notes, k=1) == ["Buttons need to be at least 44px tall."]
    assert style.rank("zzz", notes) == []


def test_split_always_adds_up_and_follows_the_badge():
    for price in (1, 999, 8000, 12345):
        for level in (1, 2, 3, 4, 5):
            p = work.split(price, level)
            assert p["junior"] + p["anchor"] + p["platform"] == price
            assert p["junior_pct"] + p["anchor_pct"] + p["platform_pct"] == 100
    shares = [work.split(10000, level) for level in (1, 2, 3, 4, 5)]
    assert [(s["junior"], s["anchor"], s["platform"]) for s in shares] == [
        (5000, 3500, 1500), (6000, 2500, 1500), (7000, 1500, 1500), (7800, 700, 1500), (8000, 500, 1500)]
    unassigned = work.split(10000, None)  # before a member is chosen, only the platform part is known
    assert unassigned["level"] is None and unassigned["junior"] == 0 and unassigned["platform"] == 1500


def test_client_cannot_switch_ai_setting(client):
    assert client.put("/v1/me/settings", json={"ai_helper": True}, headers=auth(client, CAFE_ID)).status_code == 403
    assert client.put("/v1/me/settings", json={"ai_helper": True},
                      headers=auth(client, RAJAN_ID)).json()["ai_helper"] is True
