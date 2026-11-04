"""The whole loop: submit, first check, send back, resubmit, approve, client accepts, signed logbook."""

from app.seed import BIKASH_ID, CAFE_ID, RAJAN_ID, REVIEW_JOB, SITA_ID, SITA_JOB
from tests.conftest import auth

MENU_V1 = "<button>Order</button> <table class='menu'>prices</table>"
MENU_V2 = """.menu { width: 100%; } /* fits a phone 375px wide, no sideways scrolling */
button { min-height: 44px; background: #1F5B4B; } /* buttons 44px tall, café green */
.price { text-align: right; } /* prices line up on the right */"""


def test_full_loop_ends_in_a_signed_logbook_entry(client):
    sita, rajan, cafe = auth(client, SITA_ID), auth(client, RAJAN_ID), auth(client, CAFE_ID)

    first = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": MENU_V1}, headers=sita)
    assert first.status_code == 201
    check = first.json()["check"]
    assert check["source"] == "offline" and check["total"] == 4 and check["done_count"] < 4
    # The offline check quotes Rajan's own words for what's missing.
    assert any("44px" in i["comment"] for i in check["items"] if i["status"] == "needs_work")

    desk = client.get("/v1/anchor/desk", headers=rajan).json()
    waiting = {d["job"]["id"]: d for d in desk["waiting_review"]}
    assert SITA_JOB in waiting and REVIEW_JOB in waiting
    sub_id = waiting[SITA_JOB]["submissions"][0]["id"]

    back = client.post(f"/v1/submissions/{sub_id}/send-back", json={"note": "Prices must align right on mobile."},
                       headers=rajan)
    assert back.json()["status"] == "sent_back"
    assert "Prices must align right on mobile." in [n["text"] for n in client.get("/v1/anchor/notes", headers=rajan).json()]

    second = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": MENU_V2}, headers=sita).json()
    assert second["check"]["done_count"] == 4
    assert client.post(f"/v1/submissions/{second['id']}/approve", headers=rajan).json()["status"] == "approved"

    home = client.get("/v1/client/home", headers=cafe).json()
    ready = next(r for r in home["ready"] if r["job"]["id"] == SITA_JOB)
    assert [s["status"] for s in ready["submissions"]] == ["approved"]  # the client never sees rejected tries

    entry = client.post(f"/v1/jobs/{SITA_JOB}/accept", json={"show_client": False}, headers=cafe).json()
    assert entry["valid"] is True
    s = entry["credential"]["credentialSubject"]
    assert s["supervision"] == {"level": 2, "name": "Learner"}
    assert s["approvedBy"]["name"] == "Rajan Shrestha" and s["acceptedBy"] == {"name": None, "country": "Australia"}

    slug = client.get("/v1/me", headers=sita).json()["profile_slug"]
    page = client.get(f"/p/{slug}").text
    assert "Make the café menu page work on phones" in page and "✓ Verified" in page
    assert client.get(f"/v1/public/logbook/{slug}").json()["levels"] == {"web": 2}


def test_only_the_right_people_can_act(client):
    sita, bikash, rajan, cafe = (auth(client, u) for u in (SITA_ID, BIKASH_ID, RAJAN_ID, CAFE_ID))
    assert client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "x"}, headers=bikash).status_code == 403
    assert client.get("/v1/anchor/desk", headers=sita).status_code == 403
    assert client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=cafe).status_code == 409  # not approved yet
    assert client.post(f"/v1/jobs/{SITA_JOB}/submit", json={}, headers=sita).status_code == 422  # nothing to check
    anusha = auth(client, "u-anchor-anusha")
    assert client.get(f"/v1/jobs/{SITA_JOB}", headers=anusha).status_code == 404
    assert client.get(f"/v1/jobs/{SITA_JOB}", headers=rajan).status_code == 200


def test_notifications_follow_the_work(client):
    sita, rajan = auth(client, SITA_ID), auth(client, RAJAN_ID)
    client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": MENU_V2}, headers=sita)
    kinds = [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]
    assert "work_submitted" in kinds
    client.post("/v1/notifications/read", headers=rajan)
    assert all(n["read"] for n in client.get("/v1/notifications", headers=rajan).json())
