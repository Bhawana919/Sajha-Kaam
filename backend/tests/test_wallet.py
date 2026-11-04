"""Wallet: shares arrive when the client accepts; withdrawals (demo) never go past the balance."""

from app.seed import MOMO_ID, RAJAN_ID, SITA_ID, SITA_JOB
from tests.conftest import auth


def finish(client):
    sita, rajan, momo = auth(client, SITA_ID), auth(client, RAJAN_ID), auth(client, MOMO_ID)
    client.post(f"/v1/jobs/{SITA_JOB}/pay", headers=momo)
    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "Five captions"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=rajan)
    assert client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=momo).status_code in (200, 201)
    return sita, rajan


def usd(client, who):
    return next(b for b in client.get("/v1/wallet", headers=who).json()["balances"] if b["currency"] == "USD")


def test_shares_arrive_on_accept_and_can_be_withdrawn(client):
    sita = auth(client, SITA_ID)
    before = usd(client, sita)
    rajan_before = usd(client, auth(client, RAJAN_ID))["available_minor"]
    finish(client)
    after = usd(client, sita)
    assert after["available_minor"] - before["available_minor"] == 3600  # \u2605\u2605 = 60% of $60
    assert usd(client, auth(client, RAJAN_ID))["available_minor"] - rajan_before == 1500  # 25%
    too_much = {"amount_minor": after["available_minor"] + 1, "method": "esewa", "account": "9800000001"}
    assert client.post("/v1/wallet/withdraw", json=too_much, headers=sita).status_code == 409
    out = client.post("/v1/wallet/withdraw", json={"amount_minor": 2000, "method": "khalti", "account": "9800000001"},
                      headers=sita).json()
    assert out["withdrawals"][0]["account"].endswith("0001") and out["withdrawals"][0]["status"] == "sent"
    assert next(b for b in out["balances"] if b["currency"] == "USD")["available_minor"] == after["available_minor"] - 2000
    assert "withdrawal_sent" in [n["kind"] for n in client.get("/v1/notifications", headers=sita).json()]


def test_only_members_and_leaders_have_a_wallet(client):
    assert client.get("/v1/wallet", headers=auth(client, MOMO_ID)).status_code == 403
    bad = {"amount_minor": 100, "method": "paypal", "account": "x@y.z"}
    assert client.post("/v1/wallet/withdraw", json=bad, headers=auth(client, SITA_ID)).status_code == 422
