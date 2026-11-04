"""Badges go up automatically by public rules; the Team Leader can only lower one or pause one promotion,
always with a reason the member sees; a Leader supervises at most 2 Starter jobs at once; everyone in
the team sees how jobs were shared."""

from app.seed import ANUSHA_ID, ASHA_ID, BIKASH_ID, CAFE_ID, PEMBA_ID, RAJAN_ID, SITA_ID, SITA_JOB, THREADS_ID
from tests.conftest import GOOD_JOB, auth

VIDEO_JOB = {**GOOD_JOB, "skill": "video", "details": {"length": "30s", "format": "MP4 9:16", "source": "Drive"},
             "budget_minor": 4000}


def members(client, leader):
    return {m["person"]["display_name"]: m for m in client.get("/v1/anchor/team", headers=leader).json()["members"]}


def finish(client, leader, client_h, member_h, job_id):
    """Submit, approve first time, pay if needed, accept: one more verified job."""
    sub = client.post(f"/v1/jobs/{job_id}/submit", json={"content": "done"}, headers=member_h).json()
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=leader)
    if client.get(f"/v1/jobs/{job_id}", headers=client_h).json()["job"]["payment"] == "unpaid":
        client.post(f"/v1/jobs/{job_id}/pay", headers=client_h)
    assert client.post(f"/v1/jobs/{job_id}/accept", json={}, headers=client_h).status_code == 200


def new_web_job(client, rajan, cafe, junior_id):
    body = {**GOOD_JOB, "skill": "web", "details": {"stack": "Wix", "devices": "Mobile"}, "client_id": CAFE_ID}
    job = client.post("/v1/anchor/jobs", json=body, headers=rajan).json()
    client.post(f"/v1/jobs/{job['id']}/agree", headers=cafe)
    client.post(f"/v1/jobs/{job['id']}/assign", json={"junior_id": junior_id}, headers=rajan)
    client.post(f"/v1/jobs/{job['id']}/brief", json={"accept": True}, headers=auth(client, junior_id))
    return job["id"]


def test_demo_badges_were_earned_by_the_rules(client):
    team = members(client, auth(client, RAJAN_ID))
    assert team["Bikash Tamang"]["level"] == 3 and team["Bikash Tamang"]["progress"]["verified"] == 5
    assert team["Sita Thapa"]["level"] == 2 and team["Sita Thapa"]["progress"]["verified"] == 2
    assert team["Bikash Tamang"]["last_change"]["kind"] == "auto"
    assert members(client, auth(client, ANUSHA_ID))["Pemba Sherpa"]["level"] == 5


def test_progress_shows_what_is_still_needed(client):
    p = members(client, auth(client, RAJAN_ID))["Sita Thapa"]["progress"]
    assert p["next_level"] == 3
    assert p["checks"] == [{"code": "jobs", "need": 5, "have": 2, "ok": False},
                           {"code": "last_first_time", "need": 3, "have": 2, "ok": False}]


def test_badge_goes_up_automatically_when_the_rule_is_met(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, CAFE_ID), auth(client, SITA_ID)
    finish(client, rajan, cafe, sita, SITA_JOB)  # 3 verified
    for _ in range(2):  # 4 and 5 verified, all first time -> Trusted
        finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))
    sita_m = members(client, rajan)["Sita Thapa"]
    assert sita_m["level"] == 3 and sita_m["last_change"]["kind"] == "auto"
    assert "level_up" in [n["kind"] for n in client.get("/v1/notifications", headers=sita).json()]
    assert "member_level_up" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]


def test_changes_asked_hold_back_the_first_time_streak(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, CAFE_ID), auth(client, SITA_ID)
    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "v1"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/send-back", json={"note": "Align the prices right."}, headers=rajan)
    finish(client, rajan, cafe, sita, SITA_JOB)  # accepted, but not first time
    for _ in range(2):
        finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))
    m = members(client, rajan)["Sita Thapa"]
    assert m["progress"]["verified"] == 5 and m["level"] == 2  # the last 3 were not all first time yet
    assert {"code": "last_first_time", "need": 3, "have": 2, "ok": False} in m["progress"]["checks"]


def test_leader_can_only_lower_a_badge_with_a_reason_the_member_sees(client):
    rajan, bikash = auth(client, RAJAN_ID), auth(client, BIKASH_ID)
    up = client.post(f"/v1/anchor/members/{SITA_ID}/level", json={"level": 3, "reason": "Good work"}, headers=rajan)
    assert up.status_code == 422 and up.json()["detail"] == "can_only_lower"
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json={"level": 2, "reason": "x"},
                       headers=rajan).status_code == 422  # a reason is required
    lower = {"level": 2, "reason": "Copied a template."}
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json=lower, headers=auth(client, CAFE_ID)).status_code == 403
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json=lower, headers=rajan).json()["level"] == 2
    change = client.get("/v1/junior/home", headers=bikash).json()["team_status"][0]["last_change"]
    assert (change["kind"], change["old_level"], change["new_level"], change["reason"]) == \
        ("lowered", 3, 2, "Copied a template.")


def test_pause_skips_one_promotion_then_the_next_job_counts(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, CAFE_ID), auth(client, SITA_ID)
    finish(client, rajan, cafe, sita, SITA_JOB)  # 3
    finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))  # 4
    reason = {"reason": "One more client job first, please."}
    assert client.post(f"/v1/anchor/members/{SITA_ID}/pause", json=reason, headers=rajan).status_code == 200
    assert client.post(f"/v1/anchor/members/{SITA_ID}/pause", json=reason, headers=rajan).status_code == 409
    mine = client.get("/v1/junior/home", headers=sita).json()["team_status"][0]
    assert mine["progress"]["paused_reason"] == reason["reason"]
    finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))  # 5: would promote, but paused
    assert members(client, rajan)["Sita Thapa"]["level"] == 2
    finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))  # 6: counts again
    assert members(client, rajan)["Sita Thapa"]["level"] == 3


def test_a_leader_supervises_at_most_two_starter_jobs_at_once(client):
    anusha, threads = auth(client, ANUSHA_ID), auth(client, THREADS_ID)
    req = client.get("/v1/anchor/requests", headers=anusha).json()[0]
    client.post(f"/v1/anchor/requests/{req['id']}/decide", json={"accept": True}, headers=anusha)
    assert members(client, anusha)["Asha Rai"]["level"] == 1  # new members start where their record is
    codes = []
    for _ in range(3):
        job = client.post("/v1/anchor/jobs", json={**VIDEO_JOB, "client_id": THREADS_ID}, headers=anusha).json()
        client.post(f"/v1/jobs/{job['id']}/agree", headers=threads)
        codes.append(client.post(f"/v1/jobs/{job['id']}/assign", json={"junior_id": ASHA_ID}, headers=anusha))
    assert [c.status_code for c in codes] == [200, 200, 409] and codes[2].json()["detail"] == "beginner_limit"
    # Experienced members are not limited.
    assert client.post(f"/v1/jobs/{job['id']}/assign", json={"junior_id": PEMBA_ID}, headers=anusha).status_code == 200


def test_everyone_in_the_team_sees_how_jobs_were_shared(client):
    status = client.get("/v1/junior/home", headers=auth(client, PEMBA_ID)).json()["team_status"][0]
    rows = {r["person"]["display_name"]: r for r in status["sharing"]}
    assert rows["Pemba Sherpa"]["level"] == 5 and rows["Pemba Sherpa"]["jobs_30d"] == 2  # 20 jobs over five months
    assert members(client, auth(client, ANUSHA_ID))["Pemba Sherpa"]["jobs_30d"] == 2
