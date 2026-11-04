"""The live recording, phone by phone: Sunita agrees and pays, Rajan gives the job to Sita, Sita accepts
the offer and sends the work, Rajan approves, Sunita releases the money, and each share lands."""

from app.seed import AGREE_JOB, EVENT_TEXT, MOMO_ID, RAJAN_ID, SITA_ID
from tests.conftest import auth


def test_one_job_from_agreement_to_payout(client):
    momo, rajan, sita = auth(client, MOMO_ID), auth(client, RAJAN_ID), auth(client, SITA_ID)
    # Phone 1, the client: agree to the terms, then pay ($40, held).
    assert client.post(f"/v1/jobs/{AGREE_JOB}/agree", headers=momo).json()["state"] == "agreed"
    assert client.post(f"/v1/jobs/{AGREE_JOB}/pay", headers=momo).json()["payment"] == "held"
    # Phone 2, the Leader: give it to Sita.
    assert client.post(f"/v1/jobs/{AGREE_JOB}/assign", json={"junior_id": SITA_ID}, headers=rajan).status_code == 200
    # Phone 3, the member: the offer shows her share before she accepts it.
    offer = client.get(f"/v1/jobs/{AGREE_JOB}", headers=sita).json()["job"]
    assert (offer["split"]["junior"], offer["split"]["junior_pct"]) == (2400, 60)
    client.post(f"/v1/jobs/{AGREE_JOB}/brief", json={"accept": True}, headers=sita)
    sent = client.post(f"/v1/jobs/{AGREE_JOB}/submit", json={"content": EVENT_TEXT}, headers=sita).json()
    assert sent["check"]["done_count"] == 3
    # The Leader approves; the client accepts and releases the money.
    client.post(f"/v1/submissions/{sent['id']}/approve", headers=rajan)
    assert client.post(f"/v1/jobs/{AGREE_JOB}/accept", json={"show_client": True}, headers=momo).status_code == 200
    job = client.get(f"/v1/jobs/{AGREE_JOB}", headers=momo).json()["job"]
    assert job["payment"] == "paid_out" and job["paid_out_at"]
    assert (job["split"]["junior"], job["split"]["anchor"], job["split"]["platform"]) == (2400, 1000, 600)
    for who in (SITA_ID, RAJAN_ID):
        assert "payment_released" in [n["kind"] for n in client.get("/v1/notifications", headers=auth(client, who)).json()]
