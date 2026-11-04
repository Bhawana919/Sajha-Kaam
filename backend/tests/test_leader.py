"""Verified Leaders: a Mentor's record makes a Leader at once; anyone else sends proof for a reviewer;
only verified Leaders apply for jobs clients post."""

from app.seed import OPEN_JOB, PEMBA_ID, REVIEW_ID, SITA_ID
from tests.conftest import auth


def test_a_mentor_record_makes_a_leader_at_once(client):
    pemba = auth(client, PEMBA_ID)
    st = client.get("/v1/leader/status", headers=pemba).json()
    assert st["mentor_skills"] == ["video"] and st["application"] is None
    out = client.post("/v1/leader/apply", json={"skill": "video", "team_name": "Pemba's Trek Films"}, headers=pemba).json()
    assert out["role"] == "anchor" and out["verified"] and out["application"]["by_record"] is True
    assert client.get("/v1/me", headers=pemba).json()["role"] == "anchor"
    assert client.get("/v1/anchor/team", headers=pemba).json()["team"]["name"] == "Pemba's Trek Films"
    slug = client.get("/v1/me", headers=pemba).json()["profile_slug"]
    assert client.get(f"/p/{slug}").status_code == 200  # her Work Record stays


def test_others_send_proof_and_a_reviewer_decides(client):
    sita, review = auth(client, SITA_ID), auth(client, REVIEW_ID)
    body = {"skill": "writing", "team_name": "Sita's Words"}
    assert client.post("/v1/leader/apply", json=body, headers=sita).status_code == 422  # proof needed
    body["proof"] = ["https://www.linkedin.com/in/sita-example"]
    assert client.post("/v1/leader/apply", json=body, headers=sita).json()["application"]["status"] == "pending"
    assert client.post("/v1/leader/apply", json=body, headers=sita).status_code == 409
    waiting = client.get("/v1/review/leaders", headers=review).json()
    assert [w["person"]["display_name"] for w in waiting] == ["Sita Thapa"] and waiting[0]["signed_jobs"] >= 0
    assert client.get("/v1/review/leaders", headers=sita).status_code == 403
    assert client.post(f"/v1/review/leaders/{waiting[0]['id']}/decline", json={"reason": "no"}, headers=review).status_code == 422
    done = client.post(f"/v1/review/leaders/{waiting[0]['id']}/decline",
                       json={"reason": "Two more jobs first, please."}, headers=review).json()
    assert done["status"] == "declined"
    assert "leader_declined" in [n["kind"] for n in client.get("/v1/notifications", headers=sita).json()]
    again = client.post("/v1/leader/apply", json=body, headers=sita).json()["application"]
    ok = client.post(f"/v1/review/leaders/{again['id']}/approve", headers=review).json()
    assert ok["status"] == "approved" and client.get("/v1/me", headers=sita).json()["role"] == "anchor"


def test_only_verified_leaders_apply_for_client_jobs(client):
    reg = {"role": "anchor", "display_name": "New Leader", "email": "lead@new.example", "password": "long-pass-123",
           "team_name": "New Video Team", "team_skill": "video"}
    h = {"Authorization": f"Bearer {client.post('/v1/auth/register', json=reg).json()['access_token']}"}
    assert client.get("/v1/me", headers=h).json()["leader_verified"] is False
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"note": "Me"}, headers=h).status_code == 403
    st = client.post("/v1/leader/apply", json={"about": "Ten years of wedding films.",
                                               "proof": ["https://vimeo.com/123456"]}, headers=h).json()
    assert st["application"]["team_name"] == "New Video Team" and st["application"]["status"] == "pending"
    client.post(f"/v1/review/leaders/{st['application']['id']}/approve", headers=auth(client, REVIEW_ID))
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"note": "Me"}, headers=h).status_code == 201
    reg["role"], reg["email"] = "reviewer", "r@new.example"
    assert client.post("/v1/auth/register", json=reg).status_code == 422  # nobody signs up as a reviewer
