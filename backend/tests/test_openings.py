"""Project openings: the Leader asks everyone with the skill; members (in the team or not) see their share
and ask to join; the Leader approves one, who joins the team if new and starts at once."""

from app.seed import AGREE_JOB, MOMO_ID, RAJAN_ID, SITA_ID
from tests.conftest import auth


def new_writer(client, name):
    reg = {"role": "junior", "display_name": name, "email": f"{name.split()[0].lower()}@writer.example",
           "password": "long-pass-123"}
    h = {"Authorization": f"Bearer {client.post('/v1/auth/register', json=reg).json()['access_token']}"}
    client.put("/v1/me/profile", json={"skills": ["writing"], "languages": ["Nepali", "English"], "hours_per_week": 20,
                                       "samples": [{"title": "Posts", "link": "https://docs.google.com/document/d/x"}]}, headers=h)
    return h, client.get("/v1/me", headers=h).json()["id"]


def open_it(client):
    momo, rajan = auth(client, MOMO_ID), auth(client, RAJAN_ID)
    client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=momo)
    r = client.post(f"/v1/jobs/{AGREE_JOB}/opening", headers=rajan)
    assert r.status_code == 200 and r.json()["job"]["opening"] is True
    return rajan


def test_everyone_with_the_skill_hears_and_sees_their_share(client):
    kiran, kiran_id = new_writer(client, "Kiran Joshi")
    open_it(client)
    for who in (kiran, auth(client, SITA_ID)):
        assert "job_opening" in [n["kind"] for n in client.get("/v1/notifications", headers=who).json()]
    home = client.get("/v1/junior/home", headers=kiran).json()
    assert [j["id"] for j in home["openings"]] == [AGREE_JOB]
    job = client.get(f"/v1/jobs/{AGREE_JOB}", headers=kiran).json()["job"]
    assert job["client"]["display_name"] == ""  # members see only the client's country
    assert (job["split"]["junior"], job["split"]["junior_pct"]) == (2000, 50)  # a new member: ★ Starter, 50% of $40
    sita_view = client.get(f"/v1/jobs/{AGREE_JOB}", headers=auth(client, SITA_ID)).json()["job"]
    assert sita_view["split"]["junior_pct"] == 60  # Sita is ★★ in this team


def test_leader_approves_one_who_joins_the_team_and_starts(client):
    kiran, kiran_id = new_writer(client, "Kiran Joshi")
    rajan = open_it(client)
    sita = auth(client, SITA_ID)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/ask-to-join", json={"note": "I write for two cafes."}, headers=kiran).status_code == 201
    assert client.post(f"/v1/jobs/{AGREE_JOB}/ask-to-join", json={}, headers=kiran).status_code == 409  # once
    assert client.post(f"/v1/jobs/{AGREE_JOB}/ask-to-join", json={}, headers=sita).status_code == 201
    assert "job_join_request" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]
    apps = {a["applicant"]["display_name"]: a for a in client.get(f"/v1/jobs/{AGREE_JOB}", headers=rajan).json()["applications"]}
    assert apps["Kiran Joshi"]["level"] == 1 and apps["Sita Thapa"]["level"] == 2
    done = client.post(f"/v1/jobs/{AGREE_JOB}/approve-worker", json={"application_id": apps["Kiran Joshi"]["id"]},
                       headers=rajan).json()["job"]
    assert done["state"] == "working" and done["junior"]["display_name"] == "Kiran Joshi" and done["opening"] is False
    team = [m["person"]["display_name"] for m in client.get("/v1/anchor/team", headers=rajan).json()["members"]]
    assert "Kiran Joshi" in team  # joined the team at the badge their record earned
    assert "worker_approved" in [n["kind"] for n in client.get("/v1/notifications", headers=kiran).json()]
    assert "application_not_chosen" in [n["kind"] for n in client.get("/v1/notifications", headers=sita).json()]
    assert client.post(f"/v1/jobs/{AGREE_JOB}/submit", json={"content": "Event text"}, headers=kiran).status_code == 201


def test_only_the_leader_opens_and_approves(client):
    momo, sita = auth(client, MOMO_ID), auth(client, SITA_ID)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/opening", headers=auth(client, RAJAN_ID)).status_code == 409  # not agreed
    client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=momo)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/opening", headers=sita).status_code == 403
    assert client.post(f"/v1/jobs/{AGREE_JOB}/ask-to-join", json={}, headers=sita).status_code == 409  # not open yet
