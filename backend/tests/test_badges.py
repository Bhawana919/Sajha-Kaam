"""Badges go up automatically by public rules; the Team Leader can only lower one or pause one promotion,
always with a reason the member sees; a Leader supervises at most 2 Starter jobs at once; everyone in
the team sees how jobs were shared."""

from app.seed import (
    ANUSHA_ID,
    ANUSHA_TEAM,
    ASHA_ID,
    BIKASH_ID,
    MOMO_ID,
    NIMA_ID,
    PEMBA_ID,
    RAJAN_ID,
    SITA_ID,
    SITA_JOB,
    THREADS_ID,
)
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
    """Another writing job from Rajan for Sunita (the name is kept from the earlier story)."""
    body = {**GOOD_JOB, "client_id": MOMO_ID}
    job = client.post("/v1/anchor/jobs", json=body, headers=rajan).json()
    client.post(f"/v1/jobs/{job['id']}/agree", headers=cafe)
    client.post(f"/v1/jobs/{job['id']}/assign", json={"junior_id": junior_id}, headers=rajan)
    client.post(f"/v1/jobs/{job['id']}/brief", json={"accept": True}, headers=auth(client, junior_id))
    return job["id"]


def test_demo_badges_were_earned_by_the_rules(client):
    team = members(client, auth(client, RAJAN_ID))
    web = members(client, auth(client, NIMA_ID))
    assert web["Bikash Tamang"]["level"] == 3 and web["Bikash Tamang"]["progress"]["verified"] == 5
    assert team["Sita Thapa"]["level"] == 2 and team["Sita Thapa"]["progress"]["verified"] == 2
    assert web["Bikash Tamang"]["last_change"]["kind"] == "auto"
    assert members(client, auth(client, ANUSHA_ID))["Pemba Sherpa"]["level"] == 5


def test_progress_shows_what_is_still_needed(client):
    p = members(client, auth(client, RAJAN_ID))["Sita Thapa"]["progress"]
    assert p["next_level"] == 3
    assert p["checks"] == [{"code": "jobs", "need": 5, "have": 2, "ok": False},
                           {"code": "last_first_time", "need": 3, "have": 2, "ok": False}]


def test_badge_goes_up_automatically_when_the_rule_is_met(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, MOMO_ID), auth(client, SITA_ID)
    finish(client, rajan, cafe, sita, SITA_JOB)  # 3 verified
    for _ in range(2):  # 4 and 5 verified, all first time -> Trusted
        finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))
    sita_m = members(client, rajan)["Sita Thapa"]
    assert sita_m["level"] == 3 and sita_m["last_change"]["kind"] == "auto"
    assert "level_up" in [n["kind"] for n in client.get("/v1/notifications", headers=sita).json()]
    assert "member_level_up" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]


def test_changes_asked_hold_back_the_first_time_streak(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, MOMO_ID), auth(client, SITA_ID)
    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "v1"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/send-back", json={"note": "Align the prices right."}, headers=rajan)
    finish(client, rajan, cafe, sita, SITA_JOB)  # accepted, but not first time
    for _ in range(2):
        finish(client, rajan, cafe, sita, new_web_job(client, rajan, cafe, SITA_ID))
    m = members(client, rajan)["Sita Thapa"]
    assert m["progress"]["verified"] == 5 and m["level"] == 2  # the last 3 were not all first time yet
    assert {"code": "last_first_time", "need": 3, "have": 2, "ok": False} in m["progress"]["checks"]


def test_leader_can_only_lower_a_badge_with_a_reason_the_member_sees(client):
    nima, bikash = auth(client, NIMA_ID), auth(client, BIKASH_ID)
    up = client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json={"level": 4, "reason": "Good work"}, headers=nima)
    assert up.status_code == 422 and up.json()["detail"] == "can_only_lower"
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json={"level": 2, "reason": "x"},
                       headers=nima).status_code == 422  # a reason is required
    lower = {"level": 2, "reason": "Copied a template."}
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json=lower, headers=auth(client, MOMO_ID)).status_code == 403
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json=lower, headers=auth(client, RAJAN_ID)).status_code == 404
    assert client.post(f"/v1/anchor/members/{BIKASH_ID}/level", json=lower, headers=nima).json()["level"] == 2
    change = client.get("/v1/junior/home", headers=bikash).json()["team_status"][0]["last_change"]
    assert (change["kind"], change["old_level"], change["new_level"], change["reason"]) == \
        ("lowered", 3, 2, "Copied a template.")


def test_pause_skips_one_promotion_then_the_next_job_counts(client):
    rajan, cafe, sita = auth(client, RAJAN_ID), auth(client, MOMO_ID), auth(client, SITA_ID)
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


def _new_starter(client, anusha, name):
    """A new video member who joins Anusha's team through the real steps (and starts as a Starter)."""
    reg = {"role": "junior", "display_name": name, "email": f"{name.split()[0].lower()}@new.example",
           "password": "long-pass-1"}
    h = {"Authorization": f"Bearer {client.post('/v1/auth/register', json=reg).json()['access_token']}"}
    client.put("/v1/me/profile", json={"skills": ["video"], "languages": ["Nepali"], "hours_per_week": 20,
                                       "samples": [{"title": "Reel", "link": "https://youtu.be/abcdefgh"}]}, headers=h)
    client.post(f"/v1/teams/{ANUSHA_TEAM}/join", json={"sample_link": "https://youtu.be/abcdefgh"}, headers=h)
    req = next(r for r in client.get("/v1/anchor/requests", headers=anusha).json())
    client.post(f"/v1/anchor/requests/{req['id']}/decide", json={"accept": True}, headers=anusha)
    return client.get("/v1/me", headers=h).json()["id"]


def _video_job(client, anusha, threads):
    job = client.post("/v1/anchor/jobs", json={**VIDEO_JOB, "client_id": THREADS_ID}, headers=anusha).json()
    client.post(f"/v1/jobs/{job['id']}/agree", headers=threads)
    return job["id"]


def test_a_starter_holds_one_job_and_a_leader_supervises_two_starters_at_once(client):
    anusha, threads = auth(client, ANUSHA_ID), auth(client, THREADS_ID)
    client.put("/v1/anchor/seats", json={"seats_open": 4}, headers=anusha)
    req = client.get("/v1/anchor/requests", headers=anusha).json()[0]
    client.post(f"/v1/anchor/requests/{req['id']}/decide", json={"accept": True}, headers=anusha)
    assert members(client, anusha)["Asha Rai"]["level"] == 1  # new members start where their record is
    first, second = _video_job(client, anusha, threads), _video_job(client, anusha, threads)
    assert client.post(f"/v1/jobs/{first}/assign", json={"junior_id": ASHA_ID}, headers=anusha).status_code == 200
    full = client.post(f"/v1/jobs/{second}/assign", json={"junior_id": ASHA_ID}, headers=anusha)
    assert full.status_code == 409 and full.json()["detail"] == "member_full"  # a Starter holds 1 job at once
    asha_m = members(client, anusha)["Asha Rai"]
    assert (asha_m["active_jobs"], asha_m["job_limit"]) == (1, 1)

    dawa = _new_starter(client, anusha, "Dawa Lama")
    assert client.post(f"/v1/jobs/{second}/assign", json={"junior_id": dawa}, headers=anusha).status_code == 200
    third = _video_job(client, anusha, threads)
    karma = _new_starter(client, anusha, "Karma Gurung")
    limit = client.post(f"/v1/jobs/{third}/assign", json={"junior_id": karma}, headers=anusha)
    assert limit.status_code == 409 and limit.json()["detail"] == "beginner_limit"  # 2 Starter jobs at once
    # Experienced members are not limited by that.
    assert client.post(f"/v1/jobs/{third}/assign", json={"junior_id": PEMBA_ID}, headers=anusha).status_code == 200
    desk = client.get("/v1/anchor/desk", headers=anusha).json()
    assert (desk["supervising"], desk["supervise_limit"]) == (3, 8)


def test_member_limit_follows_badge_and_weekly_hours(client):
    home = client.get("/v1/junior/home", headers=auth(client, SITA_ID)).json()
    assert (home["active_jobs"], home["job_limit"]) == (1, 2)  # ★★ Learner, 20 hours a week
    pemba = client.get("/v1/junior/home", headers=auth(client, PEMBA_ID)).json()
    assert pemba["job_limit"] == 1  # ★★★★★ allows 3, but he said 15 hours a week: 1 job at a time


def test_a_leader_who_is_full_cannot_take_more(client, monkeypatch):
    from app.services import work as w
    monkeypatch.setattr(w, "leader_limit", lambda: 1)
    rajan, momo = auth(client, RAJAN_ID), auth(client, MOMO_ID)
    job = new_web_job(client, rajan, momo, SITA_ID)  # Sita's captions already use Rajan's one place
    assert client.get(f"/v1/jobs/{job}", headers=rajan).json()["job"]["state"] == "agreed"
    r = client.post(f"/v1/jobs/{job}/assign", json={"junior_id": SITA_ID}, headers=rajan)
    assert r.status_code == 409 and r.json()["detail"] == "leader_full"


def test_everyone_in_the_team_sees_how_jobs_were_shared(client):
    status = client.get("/v1/junior/home", headers=auth(client, PEMBA_ID)).json()["team_status"][0]
    rows = {r["person"]["display_name"]: r for r in status["sharing"]}
    assert rows["Pemba Sherpa"]["level"] == 5 and rows["Pemba Sherpa"]["jobs_30d"] == 2  # 20 jobs over five months
    assert members(client, auth(client, ANUSHA_ID))["Pemba Sherpa"]["jobs_30d"] == 2
