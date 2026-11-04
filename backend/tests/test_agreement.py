"""The job agreement: fixed template, rule check (no AI), open jobs and sending to an Anchor."""

from app.seed import ANUSHA_ID, CAFE_ID, MOMO_ID, OPEN_JOB, RAJAN_ID, THREADS_ID
from tests.conftest import GOOD_JOB, auth


def codes(client, job):
    return {(p["field"], p["code"]) for p in client.post("/v1/agreement/check", json=job).json()["problems"]}


def test_template_has_every_skill_and_its_questions(client):
    t = client.get("/v1/agreement/template").json()
    assert {s["id"] for s in t["skills"]} == {"video", "web", "writing", "design", "assistant"}
    assert all(t["skill_fields"][s["id"]] for s in t["skills"]) and set(t["levels"]) == {"1", "2", "3", "4", "5"}


def test_check_catches_missing_vague_and_unfair(client):
    assert client.post("/v1/agreement/check", json=GOOD_JOB).json() == {"ok": True, "problems": []}
    empty = codes(client, {"skill": "video"})
    assert {("title", "missing"), ("deliverables", "missing"), ("done_when", "missing"),
            ("details.length", "missing"), ("budget_minor", "below_minimum")} <= empty
    vague = client.post("/v1/agreement/check", json={**GOOD_JOB, "done_when": ["Looks professional and modern"]}).json()
    assert vague["problems"][0]["code"] == "vague" and set(vague["problems"][0]["words"]) == {"professional", "modern"}
    assert ("budget_minor", "below_minimum") in codes(client, {**GOOD_JOB, "budget_minor": 500})


def test_incomplete_agreement_cannot_be_posted(client):
    r = client.post("/v1/jobs", json={**GOOD_JOB, "done_when": []}, headers=auth(client, CAFE_ID))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "agreement_incomplete"


def test_open_job_reaches_anchors_with_that_skill(client):
    """Applying and choosing are covered in test_open_jobs.py."""
    anusha, rajan, momo = auth(client, ANUSHA_ID), auth(client, RAJAN_ID), auth(client, MOMO_ID)
    assert OPEN_JOB in [j["id"] for j in client.get("/v1/anchor/desk", headers=anusha).json()["open_jobs"]]
    assert OPEN_JOB not in [j["id"] for j in client.get("/v1/anchor/desk", headers=rajan).json()["open_jobs"]]
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={}, headers=rajan).status_code == 403  # wrong skill
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={}, headers=anusha).status_code == 201
    assert "job_application" in [n["kind"] for n in client.get("/v1/notifications", headers=momo).json()]


def test_send_to_anchor_only_works_for_your_own_anchor(client):
    threads = auth(client, THREADS_ID)
    video_job = {**GOOD_JOB, "skill": "video", "details": {"length": "30s", "format": "MP4 9:16", "source": "Drive"},
                 "budget_minor": 4000}
    assert client.post("/v1/jobs", json={**video_job, "send_to_anchor": RAJAN_ID}, headers=threads).status_code == 403
    sent = client.post("/v1/jobs", json={**video_job, "send_to_anchor": ANUSHA_ID}, headers=threads).json()
    assert sent["state"] == "with_anchor"
