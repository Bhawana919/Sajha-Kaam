"""Demo payment (no real money) and the Team Leader's dashboard: deadlines and earnings."""

from app.seed import AGREE_JOB, ANUSHA_ID, BIKASH_ID, CAFE_ID, PEMBA_ID, RAJAN_ID, REVIEW_JOB, SITA_ID, SITA_JOB
from tests.conftest import auth


def test_payment_is_held_until_the_client_accepts_then_paid_out(client):
    cafe, rajan, sita = auth(client, CAFE_ID), auth(client, RAJAN_ID), auth(client, SITA_ID)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/pay", headers=cafe).json()["detail"] == "cannot_pay_now"  # not agreed
    job = client.get(f"/v1/jobs/{SITA_JOB}", headers=cafe).json()["job"]
    assert job["payment"] == "held" and job["paid_at"]
    assert client.post(f"/v1/jobs/{SITA_JOB}/pay", headers=cafe).json()["detail"] == "already_paid"
    assert client.post(f"/v1/jobs/{SITA_JOB}/pay", headers=rajan).status_code == 403  # only the client pays

    # After payment only the deadline can change, not the budget.
    r = client.post(f"/v1/jobs/{SITA_JOB}/change", json={"deadline_days": 3, "budget_minor": 9000, "note": "More"},
                    headers=rajan)
    assert r.status_code == 409 and r.json()["detail"] == "already_paid"
    assert client.post(f"/v1/jobs/{SITA_JOB}/change", json={"deadline_days": 5, "budget_minor": 8000, "note": "Later"},
                       headers=rajan).status_code == 200

    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "done"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=rajan)
    client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=cafe)
    job = client.get(f"/v1/jobs/{SITA_JOB}", headers=cafe).json()["job"]
    assert job["payment"] == "paid_out" and job["paid_out_at"]
    earned = client.get("/v1/junior/home", headers=sita).json()["earnings"]
    assert earned == [{"currency": "USD", "paid_out_minor": 6000, "held_minor": 0}]  # 75% of $80


def test_dashboard_shows_deadlines_and_earnings(client):
    rajan = auth(client, RAJAN_ID)
    d = client.get("/v1/anchor/desk", headers=rajan).json()
    assert [j["id"] for j in d["deadlines"]] == [REVIEW_JOB, SITA_JOB]  # Bikash's is due first
    assert all(j["due_at"] for j in d["deadlines"])
    # Bikash: two accepted jobs, $120 + $60. Held: Sita's $80 and Bikash's $40.
    assert d["money"] == [{"currency": "USD", "paid_out_minor": 18000, "held_minor": 12000, "anchor_minor": 1800,
                           "jobs_paid": 2}]
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in d["member_earnings"]] == [(BIKASH_ID, 13500, 2)]
    assert client.get("/v1/junior/home", headers=auth(client, BIKASH_ID)).json()["earnings"] == [
        {"currency": "USD", "paid_out_minor": 13500, "held_minor": 3000}]
    video = client.get("/v1/anchor/desk", headers=auth(client, ANUSHA_ID)).json()
    assert [(m["person"]["id"], m["amount_minor"]) for m in video["member_earnings"]] == [(PEMBA_ID, 5625)]
