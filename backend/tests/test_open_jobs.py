"""Open client jobs: Team Leaders and Mentors (★★★★★) with the skill apply; the client chooses one.
A chosen Mentor works straight away, and their own Team Leader still checks the work."""

from app.seed import ANUSHA_ID, ASHA_ID, BIKASH_ID, MOMO_ID, OPEN_JOB, PEMBA_ID, RAJAN_ID
from tests.conftest import auth

VIDEO = {"video_link": "https://youtu.be/pembaIntro2m"}  # a Mentor adds a short video


def kinds(client, uid):
    return [n["kind"] for n in client.get("/v1/notifications", headers=auth(client, uid)).json()]


def apps(client, momo):
    rows = client.get(f"/v1/jobs/{OPEN_JOB}", headers=momo).json()["applications"]
    return {a["applicant"]["display_name"]: a for a in rows}


def test_only_mentors_and_leaders_with_the_skill_can_apply(client):
    pemba, bikash, rajan = auth(client, PEMBA_ID), auth(client, BIKASH_ID), auth(client, RAJAN_ID)
    assert "job_open" in kinds(client, PEMBA_ID)  # Mentors hear about new client jobs too
    assert [j["id"] for j in client.get("/v1/junior/home", headers=pemba).json()["open_jobs"]] == [OPEN_JOB]
    assert client.get("/v1/junior/home", headers=bikash).json()["open_jobs"] == []  # ★★★ is not enough
    assert client.get(f"/v1/jobs/{OPEN_JOB}", headers=bikash).status_code == 404
    for who in (bikash, rajan, auth(client, ASHA_ID)):  # not a Mentor / wrong skill / not in the team
        assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={}, headers=who).status_code == 403
    # The Mentor sees only the client's country, like any member.
    job = client.get(f"/v1/jobs/{OPEN_JOB}", headers=pemba).json()["job"]
    assert job["client"]["display_name"] == "" and job["client"]["country"] == "Australia"


def test_client_chooses_between_a_leader_and_a_mentor(client):
    pemba, anusha, momo = auth(client, PEMBA_ID), auth(client, ANUSHA_ID), auth(client, MOMO_ID)
    r = client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={**VIDEO, "note": "I cut two reels for you already."},
                    headers=pemba)
    assert r.status_code == 201 and r.json()["my_application"] == "waiting"
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json=VIDEO, headers=pemba).status_code == 409
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={}, headers=anusha).status_code == 201
    assert "job_application" in kinds(client, MOMO_ID)

    home = client.get("/v1/client/home", headers=momo).json()
    assert [j["id"] for j in home["to_choose"]] == [OPEN_JOB]
    assert OPEN_JOB not in [j["id"] for j in home["in_progress"]]
    a = apps(client, momo)
    assert a["Pemba Sherpa"]["role"] == "junior" and a["Pemba Sherpa"]["level"] == 5
    assert a["Pemba Sherpa"]["signed_jobs"] == 20 and a["Pemba Sherpa"]["profile_slug"]
    assert a["Anusha Gurung"]["role"] == "anchor" and a["Anusha Gurung"]["level"] is None
    assert a["Pemba Sherpa"]["video_link"] == VIDEO["video_link"] and a["Anusha Gurung"]["video_link"] == ""
    assert "@demo" not in str(a)

    # Only the client who posted it chooses.
    pick_pemba = {"application_id": a["Pemba Sherpa"]["id"]}
    assert client.post(f"/v1/jobs/{OPEN_JOB}/choose", json=pick_pemba, headers=anusha).status_code == 403
    chosen = client.post(f"/v1/jobs/{OPEN_JOB}/choose", json=pick_pemba, headers=momo).json()["job"]
    assert chosen["state"] == "working" and chosen["junior"]["display_name"] == "Pemba Sherpa"
    assert chosen["anchor"]["display_name"] == "Anusha Gurung" and chosen["supervision_level"] == 5
    assert "application_chosen" in kinds(client, PEMBA_ID)
    assert {"application_not_chosen", "mentor_chosen"} <= set(kinds(client, ANUSHA_ID))
    assert client.get(f"/v1/jobs/{OPEN_JOB}", headers=anusha).json()["my_application"] == "not_chosen"
    assert client.post(f"/v1/jobs/{OPEN_JOB}/choose", json={"application_id": a["Anusha Gurung"]["id"]},
                       headers=momo).status_code == 409  # already chosen


def test_mentor_work_still_needs_the_team_leader(client):
    pemba, anusha, momo = auth(client, PEMBA_ID), auth(client, ANUSHA_ID), auth(client, MOMO_ID)
    client.post(f"/v1/jobs/{OPEN_JOB}/apply", json=VIDEO, headers=pemba)
    client.post(f"/v1/jobs/{OPEN_JOB}/choose", json={"application_id": apps(client, momo)["Pemba Sherpa"]["id"]},
                headers=momo)
    sub = client.post(f"/v1/jobs/{OPEN_JOB}/submit", json={"link": "https://drive.google.com/file/d/dashainReel"},
                      headers=pemba).json()
    assert client.post(f"/v1/jobs/{OPEN_JOB}/accept", json={}, headers=momo).status_code == 409  # not approved yet
    desk = client.get("/v1/anchor/desk", headers=anusha).json()
    assert OPEN_JOB in [w["job"]["id"] for w in desk["waiting_review"]]
    assert client.post(f"/v1/submissions/{sub['id']}/approve", headers=pemba).status_code == 403
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=anusha)
    assert client.post(f"/v1/jobs/{OPEN_JOB}/accept", json={}, headers=momo).json()["detail"] == "not_paid"
    assert client.post(f"/v1/jobs/{OPEN_JOB}/pay", headers=momo).json()["payment"] == "held"
    entry = client.post(f"/v1/jobs/{OPEN_JOB}/accept", json={}, headers=momo).json()
    s = entry["credential"]["credentialSubject"]
    assert s["supervision"]["level"] == 5 and s["approvedBy"]["name"] == "Anusha Gurung" and entry["valid"]


def test_mentor_who_loses_the_badge_cannot_be_chosen(client):
    pemba, anusha, momo = auth(client, PEMBA_ID), auth(client, ANUSHA_ID), auth(client, MOMO_ID)
    client.post(f"/v1/jobs/{OPEN_JOB}/apply", json=VIDEO, headers=pemba)
    client.post(f"/v1/anchor/members/{PEMBA_ID}/level", json={"level": 4, "reason": "Missed two deadlines."},
                headers=anusha)
    pick = {"application_id": apps(client, momo)["Pemba Sherpa"]["id"]}
    assert client.post(f"/v1/jobs/{OPEN_JOB}/choose", json=pick, headers=momo).status_code == 409
    assert client.get(f"/v1/jobs/{OPEN_JOB}", headers=momo).json()["job"]["state"] == "open"


def test_mentor_must_add_a_video_from_a_video_site(client):
    pemba = auth(client, PEMBA_ID)
    no_video = client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"note": "Hi"}, headers=pemba)
    assert no_video.status_code == 422 and no_video.json()["detail"] == "video_required"
    for bad in ("http://youtu.be/x", "https://evil.example/video.mp4", "javascript:alert(1)"):
        r = client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"video_link": bad}, headers=pemba)
        assert r.status_code == 422 and r.json()["detail"] == "video_link_not_supported", bad
    ok = client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"video_link": "https://drive.google.com/file/d/abc/view"},
                     headers=pemba)
    assert ok.status_code == 201


def test_applied_jobs_move_from_apply_to_waiting(client):
    pemba = auth(client, PEMBA_ID)
    assert [j["id"] for j in client.get("/v1/junior/home", headers=pemba).json()["open_jobs"]] == [OPEN_JOB]
    client.post(f"/v1/jobs/{OPEN_JOB}/apply", json=VIDEO, headers=pemba)
    home = client.get("/v1/junior/home", headers=pemba).json()
    assert home["open_jobs"] == [] and [j["id"] for j in home["applied_jobs"]] == [OPEN_JOB]


def test_the_bell_starts_quiet_after_a_reset(client):
    for who in (PEMBA_ID, RAJAN_ID, MOMO_ID):
        assert not [n for n in client.get("/v1/notifications", headers=auth(client, who)).json() if not n["read"]]
