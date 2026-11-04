"""Real accounts next to the demo: a demo reset keeps them; nobody signs up as a demo person;
repeated wrong passwords are slowed down."""

from app.routers import auth as auth_router
from app.seed import ANUSHA_ID
from tests.conftest import auth

REAL = {"role": "client", "display_name": "Mina Gurung", "email": "mina@shop.example", "password": "long-pass-123",
        "headline": "Mina's Tea, Perth", "country": "Australia"}


def test_a_demo_reset_keeps_real_accounts(client):
    assert client.post("/v1/auth/register", json=REAL).status_code == 201
    anchor = {**REAL, "role": "anchor", "email": "dev@real.example", "team_name": "Dev's Design Team", "team_skill": "design"}
    assert client.post("/v1/auth/register", json=anchor).status_code == 201
    assert client.post("/demo/reset").status_code == 200
    assert client.post("/v1/auth/login", json={"email": "mina@shop.example", "password": "long-pass-123"}).status_code == 200
    me = client.post("/v1/auth/login", json={"email": "dev@real.example", "password": "long-pass-123"}).json()
    team = client.get("/v1/anchor/team", headers={"Authorization": f"Bearer {me['access_token']}"}).json()
    assert team["team"]["name"] == "Dev's Design Team"
    # The demo is back as new, and real people never show up as one-tap demo people.
    names = [s["display_name"] for s in client.get("/v1/auth/samples").json()]
    assert "Sunita Basnet" in names and "Mina Gurung" not in names
    assert client.get("/v1/anchor/team", headers=auth(client, ANUSHA_ID)).status_code == 200


def test_nobody_signs_up_with_a_demo_address(client):
    r = client.post("/v1/auth/register", json={**REAL, "email": "sneaky@demo.sajhakaam"})
    assert r.status_code == 422


def test_wrong_passwords_are_slowed_down(client):
    auth_router._failed.clear()
    client.post("/v1/auth/register", json=REAL)
    bad = {"email": "mina@shop.example", "password": "wrong-pass-1"}
    assert [client.post("/v1/auth/login", json=bad).status_code for _ in range(5)] == [401] * 5
    assert client.post("/v1/auth/login", json=bad).status_code == 429
    good = {"email": "mina@shop.example", "password": "long-pass-123"}
    assert client.post("/v1/auth/login", json=good).status_code == 429  # wait first, even with the right one
    auth_router._failed.clear()
