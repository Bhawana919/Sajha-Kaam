"""Joining a team (blind review), seats, levels and client invites."""

from app.seed import ANUSHA_ID, ASHA_ID, BIKASH_ID, NIMA_ID, PEMBA_ID, RAJAN_ID, SITA_ID
from tests.conftest import GOOD_JOB, auth


def test_junior_asks_to_join_and_anchor_decides_blind(client):
    asha, anusha = auth(client, ASHA_ID), auth(client, ANUSHA_ID)
    teams = client.get("/v1/teams/open", headers=asha).json()
    assert [t["team"]["name"] for t in teams] == ["Anusha's Video Team"]
    assert teams[0]["my_request"] == "waiting"  # Asha asked in the demo data
    team_id = teams[0]["team"]["id"]
    join = {"sample_link": "https://drive.google.com/file/d/1cafePromoClip", "note": "Again."}
    assert client.post(f"/v1/teams/{team_id}/join", json=join, headers=asha).status_code == 409

    reqs = client.get("/v1/anchor/requests", headers=anusha).json()
    assert [r["label"] for r in reqs] == ["A"]
    text = str(reqs).lower()
    for leak in ("asha", "rai", "sunsari", ASHA_ID, "@demo"):
        assert leak not in text, leak

    assert client.post(f"/v1/anchor/requests/{reqs[0]['id']}/decide", json={"accept": True},
                       headers=anusha).json()["status"] == "accepted"
    team = client.get("/v1/anchor/team", headers=anusha).json()
    assert team["team"]["seats_open"] == 1
    assert [m["person"]["display_name"] for m in team["members"]] == ["Pemba Sherpa", "Asha Rai"]
    assert "join_accepted" in [n["kind"] for n in client.get("/v1/notifications", headers=asha).json()]


def test_blind_review_hides_background_languages(client):
    """Languages beyond the working ones (e.g. Sherpa) reveal background, so the Anchor never sees them."""
    nima, pemba = auth(client, NIMA_ID), auth(client, PEMBA_ID)
    profile = client.get("/v1/me/profile", headers=pemba).json()
    client.put("/v1/me/profile", json={**profile, "skills": ["video", "web"]}, headers=pemba)
    web_team = next(t["team"]["id"] for t in client.get("/v1/teams/open", headers=pemba).json()
                    if t["team"]["skill"] == "web")
    assert client.post(f"/v1/teams/{web_team}/join", json={"sample_link": "https://youtu.be/k7Tr3kReel9"},
                       headers=pemba).status_code == 201
    reqs = client.get("/v1/anchor/requests", headers=nima).json()
    assert reqs[0]["languages"] == ["Nepali", "English"]
    text = str(reqs).lower()
    for leak in ("pemba", "sherpa", "solukhumbu", PEMBA_ID, "@demo"):
        assert leak not in text, leak


def test_join_needs_the_skill_and_a_sample(client):
    sita, asha = auth(client, SITA_ID), auth(client, ASHA_ID)
    video_team = client.get("/v1/teams/open", headers=asha).json()[0]["team"]["id"]
    bad = {"sample_link": "https://example.com/x"}
    assert client.post(f"/v1/teams/{video_team}/join", json=bad, headers=sita).status_code == 422  # web only
    assert client.get("/v1/teams/open", headers=sita).json() == []  # already in Rajan's team


def test_opening_seats_notifies_everyone_with_the_skill(client):
    nima = auth(client, NIMA_ID)
    client.put("/v1/anchor/seats", json={"seats_open": 0}, headers=nima)
    client.put("/v1/anchor/seats", json={"seats_open": 2, "test_task": "Explain lazy loading."}, headers=nima)
    # Bikash is already in Nima's web team; nobody else lists web, so nobody else is told.
    for uid in (SITA_ID, BIKASH_ID, ASHA_ID, PEMBA_ID):
        assert "seats_open" not in [n["kind"] for n in client.get("/v1/notifications", headers=auth(client, uid)).json()]
    asha = auth(client, ASHA_ID)
    profile = client.get("/v1/me/profile", headers=asha).json()
    client.put("/v1/me/profile", json={**profile, "skills": ["video", "web"]}, headers=asha)
    client.put("/v1/anchor/seats", json={"seats_open": 0}, headers=nima)
    client.put("/v1/anchor/seats", json={"seats_open": 1}, headers=nima)
    assert "seats_open" in [n["kind"] for n in client.get("/v1/notifications", headers=asha).json()]


def test_invited_client_signs_up_and_sends_a_job(client):
    rajan = auth(client, RAJAN_ID)
    code = client.post("/v1/anchor/invites", headers=rajan).json()["code"]
    signup = {"role": "client", "display_name": "Lena Park", "email": "lena@salon.example", "password": "salon-pass-1",
              "headline": "Park Hair Studio, Sydney", "country": "Australia", "invite_code": code}
    tokens = client.post("/v1/auth/register", json=signup).json()
    lena = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert [a["display_name"] for a in client.get("/v1/client/home", headers=lena).json()["anchors"]] == ["Rajan Shrestha"]
    words_job = {**GOOD_JOB, "send_to_anchor": RAJAN_ID}  # a writing job, Rajan's team's skill
    assert client.post("/v1/jobs", json=words_job, headers=lena).json()["state"] == "with_anchor"
    assert client.post("/v1/auth/register", json={**signup, "email": "x@y.example"}).status_code == 404  # code used


def test_anchor_signup_needs_a_team(client):
    base = {"role": "anchor", "display_name": "Kiran", "email": "kiran@x.example", "password": "long-pass-1"}
    assert client.post("/v1/auth/register", json=base).status_code == 422
    ok = client.post("/v1/auth/register", json={**base, "team_name": "Kiran's Design Team", "team_skill": "design"})
    assert ok.status_code == 201


def test_an_invite_link_carries_the_agreement_to_a_new_client(client):
    rajan = auth(client, RAJAN_ID)
    job = {**GOOD_JOB, "title": "Captions for our Diwali sale"}
    inv = client.post("/v1/anchor/invites", json={"job": job}, headers=rajan).json()
    assert inv["job_title"] == "Captions for our Diwali sale"
    info = client.get(f"/v1/invites/{inv['code']}").json()  # the join page, before sign-up
    assert info["leader"]["display_name"] == "Rajan Shrestha" and info["job_title"] == job["title"] and not info["used"]
    signup = {"role": "client", "display_name": "Kamala Shah", "email": "kamala@shop.example", "password": "long-pass-123",
              "headline": "Kamala Fashion, Sydney", "country": "Australia", "invite_code": inv["code"]}
    token = client.post("/v1/auth/register", json=signup).json()["access_token"]
    home = client.get("/v1/client/home", headers={"Authorization": f"Bearer {token}"}).json()
    assert [j["title"] for j in home["to_agree"]] == ["Captions for our Diwali sale"]
    assert [a["display_name"] for a in home["anchors"]] == ["Rajan Shrestha"]
    assert client.get(f"/v1/invites/{inv['code']}").json()["used"] is True
    # A bad agreement is refused when the link is made, not when the client joins.
    assert client.post("/v1/anchor/invites", json={"job": {**job, "done_when": []}}, headers=rajan).status_code == 422
