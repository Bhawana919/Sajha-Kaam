"""The whole loop on the demo's hero job: Sita's opening-week captions for Himalayan Momo House.
Submit, quick check (quoting Rajan's advice), send back, fix, approve, Sunita accepts, signed Work Record."""

from app.seed import (
    BIKASH_ID,
    CAPTIONS_V1,
    CAPTIONS_V2,
    MOMO_ID,
    NIMA_ID,
    RAJAN_ID,
    REVIEW_JOB,
    SITA_ID,
    SITA_JOB,
)
from tests.conftest import auth


def test_full_loop_ends_in_a_signed_work_record_entry(client):
    sita, rajan, momo = auth(client, SITA_ID), auth(client, RAJAN_ID), auth(client, MOMO_ID)

    first = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": CAPTIONS_V1}, headers=sita)
    assert first.status_code == 201
    check = first.json()["check"]
    assert check["source"] == "offline" and check["total"] == 4 and check["done_count"] == 2
    # The quick check quotes Rajan's own advice for each missing point.
    missing = {i["item"]: i["comment"] for i in check["items"] if i["status"] == "needs_work"}
    assert "Every post needs one line in Nepali" in missing["Every caption has one line in Nepali"]
    assert "#MomoHouseParramatta" in missing["Ends with #MomoHouseParramatta"]

    desk = client.get("/v1/anchor/desk", headers=rajan).json()
    waiting = {d["job"]["id"]: d for d in desk["waiting_review"]}
    assert SITA_JOB in waiting
    sub_id = waiting[SITA_JOB]["submissions"][0]["id"]

    note = "Add one Nepali line and the hashtag to every caption."
    back = client.post(f"/v1/submissions/{sub_id}/send-back", json={"note": note}, headers=rajan)
    assert back.json()["status"] == "sent_back"
    assert note in [n["text"] for n in client.get("/v1/anchor/notes", headers=rajan).json()]

    second = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": CAPTIONS_V2}, headers=sita).json()
    assert second["check"]["done_count"] == 4
    assert client.post(f"/v1/submissions/{second['id']}/approve", headers=rajan).json()["status"] == "approved"

    home = client.get("/v1/client/home", headers=momo).json()
    ready = next(r for r in home["ready"] if r["job"]["id"] == SITA_JOB)
    assert [s["status"] for s in ready["submissions"]] == ["approved"]  # the client never sees rejected tries
    assert "परिवारको स्वादमा" in ready["submissions"][0]["content"]  # Sunita reads the captions themselves

    entry = client.post(f"/v1/jobs/{SITA_JOB}/accept", json={"show_client": True}, headers=momo).json()
    assert entry["valid"] is True
    s = entry["credential"]["credentialSubject"]
    assert s["supervision"] == {"level": 2, "name": "Learner"}
    assert s["approvedBy"]["name"] == "Rajan Shrestha"
    assert s["acceptedBy"] == {"name": "Himalayan Momo House, Sydney", "country": "Australia"}

    slug = client.get("/v1/me", headers=sita).json()["profile_slug"]
    page = client.get(f"/p/{slug}").text
    assert "Instagram captions for our opening week" in page and "✓ Verified" in page
    assert client.get(f"/v1/public/logbook/{slug}").json()["levels"] == {"writing": 2}


def test_the_website_bikash_built_is_ready_for_sunita(client):
    momo = auth(client, MOMO_ID)
    ready = {r["job"]["id"]: r for r in client.get("/v1/client/home", headers=momo).json()["ready"]}
    site = ready[REVIEW_JOB]
    assert site["job"]["anchor"]["display_name"] == "Nima Lama" and site["job"]["junior"]["display_name"] == "Bikash Tamang"
    assert site["submissions"][0]["link"] == "/samples/momo-house"
    page = client.get("/samples/momo-house")
    assert page.status_code == 200 and "Order online" in page.text and "Opening 21 November" in page.text
    entry = client.post(f"/v1/jobs/{REVIEW_JOB}/accept", json={"show_client": True}, headers=momo).json()
    assert entry["credential"]["credentialSubject"]["approvedBy"]["name"] == "Nima Lama"


def test_only_the_right_people_can_act(client):
    sita, bikash, rajan, momo = (auth(client, u) for u in (SITA_ID, BIKASH_ID, RAJAN_ID, MOMO_ID))
    assert client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "x"}, headers=bikash).status_code == 403
    assert client.get("/v1/anchor/desk", headers=sita).status_code == 403
    assert client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=momo).status_code == 409  # not approved yet
    assert client.post(f"/v1/jobs/{SITA_JOB}/submit", json={}, headers=sita).status_code == 422  # nothing to check
    assert client.get(f"/v1/jobs/{SITA_JOB}", headers=auth(client, NIMA_ID)).status_code == 404  # another team
    assert client.get(f"/v1/jobs/{SITA_JOB}", headers=rajan).status_code == 200


def test_notifications_follow_the_work(client):
    sita, rajan = auth(client, SITA_ID), auth(client, RAJAN_ID)
    client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": CAPTIONS_V2}, headers=sita)
    kinds = [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]
    assert "work_submitted" in kinds
    client.post("/v1/notifications/read", headers=rajan)
    assert all(n["read"] for n in client.get("/v1/notifications", headers=rajan).json())
