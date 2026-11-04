"""The agreement comes first: the Anchor writes it, the client agrees, then the junior accepts a brief.
Later changes are amendments the client must accept."""

from app.seed import AGREE_JOB, ANUSHA_ID, BIKASH_ID, MOMO_ID, RAJAN_ID, SITA_ID, THREADS_ID
from tests.conftest import auth

WEB_JOB = {  # a writing job for Rajan's social media team (name kept for the tests below)
    "skill": "writing", "title": "Menu descriptions for the new branch", "deliverables": ["Menu descriptions"],
    "done_when": ["Describes 3 dishes", "Each description under 25 words"],
    "details": {"words": "Under 25 words per dish", "audience": "Families in Parramatta", "tone": "Warm"},
    "deadline_days": 4, "budget_minor": 6000, "revisions": 1,
}


def test_anchor_writes_client_asks_for_changes_then_agrees(client):
    rajan, cafe = auth(client, RAJAN_ID), auth(client, MOMO_ID)
    job = client.post("/v1/anchor/jobs", json={**WEB_JOB, "client_id": MOMO_ID}, headers=rajan)
    assert job.status_code == 201 and job.json()["state"] == "with_client"
    job_id = job.json()["id"]

    home = client.get("/v1/client/home", headers=cafe).json()
    assert job_id in [j["id"] for j in home["to_agree"]]
    assert "agreement_ready" in [n["kind"] for n in client.get("/v1/notifications", headers=cafe).json()]

    # Nothing can be given to a junior before the client agrees.
    assert client.post(f"/v1/jobs/{job_id}/assign", json={"junior_id": SITA_ID}, headers=rajan).status_code == 409

    back = client.post(f"/v1/jobs/{job_id}/request-changes", json={"note": "Please describe 4 dishes, not 3."}, headers=cafe)
    assert back.json()["state"] == "draft" and back.json()["change_note"] == "Please describe 4 dishes, not 3."
    assert job_id in [j["id"] for j in client.get("/v1/anchor/desk", headers=rajan).json()["agreements"]]

    fixed = {**WEB_JOB, "done_when": ["Describes 4 dishes", "Each description under 25 words"]}
    edited = client.put(f"/v1/jobs/{job_id}", json=fixed, headers=rajan).json()
    assert edited["state"] == "with_client" and edited["change_note"] == ""

    agreed = client.post(f"/v1/jobs/{job_id}/agree", headers=cafe).json()
    assert agreed["state"] == "agreed" and agreed["agreed_at"]
    # Locked: the Anchor can't rewrite it any more, and the client can't agree twice.
    assert client.put(f"/v1/jobs/{job_id}", json=WEB_JOB, headers=rajan).status_code == 409
    assert client.post(f"/v1/jobs/{job_id}/agree", headers=cafe).status_code == 409


def test_only_the_right_people_write_and_agree(client):
    rajan, anusha, threads = auth(client, RAJAN_ID), auth(client, ANUSHA_ID), auth(client, THREADS_ID)
    # Rajan can't write for a client who isn't his, or in another skill.
    assert client.post("/v1/anchor/jobs", json={**WEB_JOB, "client_id": THREADS_ID}, headers=rajan).status_code == 403
    assert client.post("/v1/anchor/jobs", json={**WEB_JOB, "skill": "video", "client_id": MOMO_ID},
                       headers=rajan).status_code == 422
    # The template rules still apply.
    weak = {**WEB_JOB, "done_when": ["Looks nice"], "client_id": MOMO_ID}
    assert client.post("/v1/anchor/jobs", json=weak, headers=rajan).status_code == 422
    # Another client, another Anchor or a junior can't agree for Sunita.
    assert client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=threads).status_code == 409
    assert client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=anusha).status_code == 409
    assert client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=auth(client, SITA_ID)).status_code == 403
    # Juniors can't see it at all.
    assert client.get(f"/v1/jobs/{AGREE_JOB}", headers=auth(client, SITA_ID)).status_code == 404


def test_a_job_a_client_sends_waits_for_the_anchor_to_agree(client):
    rajan, cafe = auth(client, RAJAN_ID), auth(client, MOMO_ID)
    sent = client.post("/v1/jobs", json={**WEB_JOB, "send_to_anchor": RAJAN_ID}, headers=cafe).json()
    assert sent["state"] == "with_anchor"
    assert client.post(f"/v1/jobs/{sent['id']}/agree", headers=cafe).status_code == 409  # Sunita wrote it
    assert client.post(f"/v1/jobs/{sent['id']}/agree", headers=rajan).json()["state"] == "agreed"


def test_junior_accepts_the_brief_before_starting(client):
    rajan, cafe, sita, bikash = (auth(client, u) for u in (RAJAN_ID, MOMO_ID, SITA_ID, BIKASH_ID))
    client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=cafe)
    offered = client.post(f"/v1/jobs/{AGREE_JOB}/assign", json={"junior_id": SITA_ID}, headers=rajan).json()
    assert offered["state"] == "assigned"

    brief = client.get(f"/v1/jobs/{AGREE_JOB}", headers=sita).json()["job"]
    assert brief["client"] == {"id": "", "display_name": "", "headline": "", "country": "Australia"}
    assert brief["split"]["junior"] == 2400 and brief["split"]["junior_pct"] == 60  # ★★ Learner: 60% of $40
    # No work before "I accept", and only Sita can answer.
    assert client.post(f"/v1/jobs/{AGREE_JOB}/submit", json={"content": "x"}, headers=sita).status_code == 409
    assert client.post(f"/v1/jobs/{AGREE_JOB}/brief", json={"accept": True}, headers=bikash).status_code == 403

    declined = client.post(f"/v1/jobs/{AGREE_JOB}/brief", json={"accept": False}, headers=sita).json()
    assert declined["state"] == "agreed" and declined["junior"] is None
    assert "brief_declined" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]

    # Bikash is in another team (web), so he can't be given this writing job.
    assert client.post(f"/v1/jobs/{AGREE_JOB}/assign", json={"junior_id": BIKASH_ID}, headers=rajan).status_code == 422
    client.post(f"/v1/jobs/{AGREE_JOB}/assign", json={"junior_id": SITA_ID}, headers=rajan)
    started = client.post(f"/v1/jobs/{AGREE_JOB}/brief", json={"accept": True}, headers=sita).json()
    assert started["state"] == "working" and started["junior_accepted_at"]
    assert client.post(f"/v1/jobs/{AGREE_JOB}/submit", json={"content": "Event title and description"},
                       headers=sita).status_code == 201


def test_changes_after_agreement_need_the_client(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, MOMO_ID), auth(client, SITA_ID)
    client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=cafe)

    assert client.post(f"/v1/jobs/{AGREE_JOB}/change", json={"deadline_days": 2, "budget_minor": 4000, "note": "Same"},
                       headers=rajan).status_code == 422  # nothing changed
    assert client.post(f"/v1/jobs/{AGREE_JOB}/change", json={"deadline_days": 2, "budget_minor": 100, "note": "Cheaper"},
                       headers=rajan).status_code == 422  # below the fair minimum

    proposed = client.post(f"/v1/jobs/{AGREE_JOB}/change",
                           json={"deadline_days": 4, "budget_minor": 6000, "note": "Sunita wants a Nepali version too"},
                           headers=rajan).json()
    assert proposed["pending_change"]["budget_minor"] == 6000 and proposed["budget_minor"] == 4000  # not yet
    assert AGREE_JOB in [j["id"] for j in client.get("/v1/client/home", headers=cafe).json()["to_agree"]]

    done = client.post(f"/v1/jobs/{AGREE_JOB}/change/decide", json={"accept": True}, headers=cafe).json()
    assert done["deadline_days"] == 4 and done["budget_minor"] == 6000 and done["pending_change"] is None
    assert [(a["field"], a["old"], a["new"]) for a in done["amendments"]] == [("deadline_days", 2, 4),
                                                                            ("budget_minor", 4000, 6000)]
    assert client.post(f"/v1/jobs/{AGREE_JOB}/change/decide", json={"accept": True}, headers=cafe).status_code == 409

    # Declining leaves the agreement as it was.
    client.post(f"/v1/jobs/{AGREE_JOB}/change", json={"deadline_days": 9, "budget_minor": 6000, "note": "More time"},
                headers=rajan)
    kept = client.post(f"/v1/jobs/{AGREE_JOB}/change/decide", json={"accept": False}, headers=cafe).json()
    assert kept["deadline_days"] == 4 and kept["pending_change"] is None
    assert "change_declined" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]
    assert client.post(f"/v1/jobs/{AGREE_JOB}/change/decide", json={"accept": True}, headers=sita).status_code == 403
