"""The job room: opens when the agreement is final; the member and Team Leader keep tasks and files;
the client follows the tasks and deadline but never sees unfinished files."""

from app.seed import AGREE_JOB, BIKASH_ID, MOMO_ID, NIMA_ID, OPEN_JOB, RAJAN_ID, SITA_ID, SITA_JOB
from tests.conftest import auth


def room(client, who, job=SITA_JOB):
    return client.get(f"/v1/jobs/{job}/room", headers=auth(client, who))


def test_room_opens_only_after_agreement_and_only_for_the_three_people(client):
    assert room(client, RAJAN_ID, AGREE_JOB).status_code == 404  # not agreed yet
    assert room(client, MOMO_ID, OPEN_JOB).status_code == 404  # nobody chosen yet
    for outsider in (BIKASH_ID, NIMA_ID):
        assert room(client, outsider).status_code == 404
    sita = room(client, SITA_ID).json()
    assert sita["role"] == "member" and sita["can_edit"] and sita["due_at"]
    # The agreement's deliverable is the first task; the demo adds Sita's and Rajan's own.
    titles = [t["title"] for t in sita["tasks"]]
    assert titles[0] == "Five Instagram captions, one for each day of opening week" and len(titles) == 4
    assert [t["done"] for t in sita["tasks"]] == [False, True, False, False]
    assert sita["files"][0]["label"] == "Photos of the new branch (from Sunita)"
    assert sita["files"][0]["added_by"] == "Rajan Shrestha"


def test_client_follows_tasks_but_sees_no_unfinished_files_and_cannot_edit(client):
    momo = auth(client, MOMO_ID)
    r = room(client, MOMO_ID).json()
    assert r["role"] == "client" and not r["can_edit"] and r["files"] == [] and len(r["tasks"]) == 4
    assert client.post(f"/v1/jobs/{SITA_JOB}/room/tasks", json={"title": "Add emojis"}, headers=momo).status_code == 403
    assert client.post(f"/v1/jobs/{SITA_JOB}/room/files", json={"link": "https://x.example/a"},
                       headers=momo).status_code == 403


def test_member_and_leader_keep_the_list_and_share_files(client):
    sita, rajan = auth(client, SITA_ID), auth(client, RAJAN_ID)
    added = client.post(f"/v1/jobs/{SITA_JOB}/room/tasks", json={"title": "Ask Sunita for the offer", "due_date": "2026-11-20"},
                        headers=sita).json()
    task = next(t for t in added["tasks"] if t["title"] == "Ask Sunita for the offer")
    assert task["due_date"] == "2026-11-20" and not task["done"]
    ticked = client.patch(f"/v1/jobs/{SITA_JOB}/room/tasks/{task['id']}", json={"done": True}, headers=rajan).json()
    assert next(t for t in ticked["tasks"] if t["id"] == task["id"])["done"] is True
    left = client.delete(f"/v1/jobs/{SITA_JOB}/room/tasks/{task['id']}", headers=sita).json()
    assert task["id"] not in [t["id"] for t in left["tasks"]]

    assert client.post(f"/v1/jobs/{SITA_JOB}/room/files", json={"label": "Draft", "link": "http://not-safe.example"},
                       headers=sita).status_code == 422  # https only
    shared = client.post(f"/v1/jobs/{SITA_JOB}/room/files",
                         json={"label": "Caption draft", "link": "https://docs.google.com/document/d/captions-draft"},
                         headers=sita).json()
    assert shared["files"][0]["label"] == "Caption draft" and shared["files"][0]["added_by"] == "Sita Thapa"
    assert "room_file" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]


def test_room_is_read_only_once_the_client_accepts(client):
    sita, rajan, momo = auth(client, SITA_ID), auth(client, RAJAN_ID), auth(client, MOMO_ID)
    sub = client.post(f"/v1/jobs/{SITA_JOB}/submit", json={"content": "done"}, headers=sita).json()
    client.post(f"/v1/submissions/{sub['id']}/approve", headers=rajan)
    client.post(f"/v1/jobs/{SITA_JOB}/accept", json={}, headers=momo)
    assert room(client, SITA_ID).json()["can_edit"] is False
    assert client.post(f"/v1/jobs/{SITA_JOB}/room/tasks", json={"title": "One more"}, headers=sita).status_code == 409


def test_member_and_leader_talk_in_the_room_and_the_client_does_not_see_it(client):
    sita, rajan = auth(client, SITA_ID), auth(client, RAJAN_ID)
    seeded = room(client, SITA_ID).json()["messages"]
    assert [m["author"] for m in seeded] == ["Rajan Shrestha", "Sita Thapa"] and seeded[1]["mine"] is True
    out = client.post(f"/v1/jobs/{SITA_JOB}/room/messages", json={"text": "Draft is in Files."}, headers=sita).json()
    assert out["messages"][-1]["text"] == "Draft is in Files." and out["messages"][-1]["mine"] is True
    assert "room_message" in [n["kind"] for n in client.get("/v1/notifications", headers=rajan).json()]
    assert room(client, MOMO_ID).json()["messages"] == []
    assert client.post(f"/v1/jobs/{SITA_JOB}/room/messages", json={"text": "Hi"}, headers=auth(client, MOMO_ID)).status_code == 403
