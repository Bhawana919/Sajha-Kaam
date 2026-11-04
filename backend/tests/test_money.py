"""Demo payment (no real money), pay by badge, and the Team Leader's dashboard: deadlines and earnings."""

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
    # Her first two jobs as ★ Starter (50% of $40 and $30), this one as ★★ Learner (60% of $80).
    assert earned == [{"currency": "USD", "paid_out_minor": 2000 + 1500 + 4800, "held_minor": 0}]


def test_dashboard_shows_deadlines_and_earnings_split_by_badge(client):
    rajan = auth(client, RAJAN_ID)
    d = client.get("/v1/anchor/desk", headers=rajan).json()
    assert [j["id"] for j in d["deadlines"]] == [REVIEW_JOB, SITA_JOB]  # Bikash's is due first
    assert all(j["due_at"] for j in d["deadlines"])
    # Seven accepted jobs, each split by the badge at the time: Bikash $120 + $60 as ★ (50/35),
    # then $70 + $30 + $50 as ★★ (60/25); Sita $40 + $30 as ★ (50/35). Held: Sita's $80, Bikash's $40.
    assert d["money"] == [{"currency": "USD", "paid_out_minor": 40000, "held_minor": 12000,
                           "anchor_minor": 4200 + 2100 + 1750 + 750 + 1250 + 1400 + 1050, "jobs_paid": 7}]
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in d["member_earnings"]] == [
        (BIKASH_ID, 6000 + 3000 + 4200 + 1800 + 3000, 5), (SITA_ID, 2000 + 1500, 2)]
    # Bikash's job waiting for review was given to him as ★★★ Trusted: 70% of $40 is held for him.
    assert client.get("/v1/junior/home", headers=auth(client, BIKASH_ID)).json()["earnings"] == [
        {"currency": "USD", "paid_out_minor": 18000, "held_minor": 2800}]
    # Pemba's 20 reels: 2 as ★, 3 as ★★, 5 as ★★★, 10 as ★★★★ (he became Mentor after the 20th).
    video = client.get("/v1/anchor/desk", headers=auth(client, ANUSHA_ID)).json()
    assert [(m["person"]["id"], m["amount_minor"], m["jobs"]) for m in video["member_earnings"]] == [
        (PEMBA_ID, 1500 + 2250 + 3 * 1800 + 5 * 2100 + 10 * 2340, 20)]
