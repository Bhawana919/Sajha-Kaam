"""Demo payment (no real money), pay by badge, and the Team Leader's dashboard: deadlines and earnings."""

from app.seed import (
    AGREE_JOB,
    ANUSHA_ID,
    BIKASH_ID,
    MOMO_ID,
    NIMA_ID,
    PEMBA_ID,
    RAJAN_ID,
    REVIEW_JOB,
    SITA_ID,
    SITA_JOB,
)
from tests.conftest import auth


def test_payment_is_held_until_the_client_accepts_then_paid_out(client):
    momo, rajan, sita = auth(client, MOMO_ID), auth(client, RAJAN_ID), auth(client, SITA_ID)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/pay", headers=momo).json()["detail"] == "cannot_pay_now"  # not agreed
    job = client.get(f"/v1/jobs/{SITA_JOB}", headers=momo).json()["job"]
    assert job["payment"] == "held" and job["paid_at"]
    assert client.post(f"/v1/jobs/{SITA_JOB}/pay", headers=momo).json()["detail"] == "already_paid"
    assert client.post(f"/v1/jobs/{SITA_JOB}/pay", headers=rajan).status_code == 403  # only the client pays

    # After payment only the deadline can change, not the budget.
    r = client.post(f"/v1/jobs/{SITA_JOB}/change", json={"deadline_days": 3, "budget_minor": 9000, "note": "More"},
                    headers=rajan)
    assert r.status_code == 409 and r.json()["detail"] == "already_paid"
    assert client.post(f"/v1/jobs/{SITA_JOB}/change", json={"deadline_days": 5, "budget_minor": 6000, "note": "Later"},
                       headers=rajan).status_code == 200

    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "done"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=rajan)
    client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=momo)
    job = client.get(f"/v1/jobs/{SITA_JOB}", headers=momo).json()["job"]
    assert job["payment"] == "paid_out" and job["paid_out_at"]
    earned = client.get("/v1/junior/home", headers=sita).json()["earnings"]
    # Her first two jobs as ★ Starter (50% of $40 and $30), the captions as ★★ Learner (60% of $60).
    assert earned == [{"currency": "USD", "paid_out_minor": 2000 + 1500 + 3600, "held_minor": 0}]


def test_dashboard_shows_deadlines_and_earnings_split_by_badge(client):
    d = client.get("/v1/anchor/desk", headers=auth(client, RAJAN_ID)).json()
    assert [j["id"] for j in d["deadlines"]] == [SITA_JOB] and d["deadlines"][0]["due_at"]
    # Rajan's team: Sita's two earlier jobs ($40 + $30) as ★ (50/35); her $60 captions are held.
    assert d["money"] == [{"currency": "USD", "paid_out_minor": 7000, "held_minor": 6000,
                           "anchor_minor": 1400 + 1050, "jobs_paid": 2}]
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in d["member_earnings"]] == [(SITA_ID, 3500, 2)]

    # Nima's team: Bikash's five jobs, $120 + $60 as ★ (50/35), then $70 + $30 + $50 as ★★ (60/25).
    web = client.get("/v1/anchor/desk", headers=auth(client, NIMA_ID)).json()
    assert web["money"] == [{"currency": "USD", "paid_out_minor": 33000, "held_minor": 25000,
                             "anchor_minor": 4200 + 2100 + 1750 + 750 + 1250, "jobs_paid": 5}]
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in web["member_earnings"]] == [
        (BIKASH_ID, 6000 + 3000 + 4200 + 1800 + 3000, 5)]
    # The $250 website was given to him as ★★★ Trusted: 70% of it is held until Sunita accepts.
    assert client.get("/v1/junior/home", headers=auth(client, BIKASH_ID)).json()["earnings"] == [
        {"currency": "USD", "paid_out_minor": 18000, "held_minor": 17500}]
    momo = auth(client, MOMO_ID)
    assert REVIEW_JOB in [r["job"]["id"] for r in client.get("/v1/client/home", headers=momo).json()["ready"]]

    # Pemba's 20 reels: 2 as ★, 3 as ★★, 5 as ★★★, 10 as ★★★★ (he became Mentor after the 20th).
    video = client.get("/v1/anchor/desk", headers=auth(client, ANUSHA_ID)).json()
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in video["member_earnings"]] == [
        (PEMBA_ID, 1500 + 2250 + 3 * 1800 + 5 * 2100 + 10 * 2340, 20)]
