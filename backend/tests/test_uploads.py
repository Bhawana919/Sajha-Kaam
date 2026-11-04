"""Video uploads: off unless Cloudinary is set up; signed by the server; only our videos accepted."""

import hashlib

import pytest

from app.config import settings
from app.seed import CAFE_ID, OPEN_JOB, PEMBA_ID
from app.services import uploads
from tests.conftest import auth

CLOUD = {"api_key": "123456", "api_secret": "s3cret", "cloud_name": "sajha-demo"}


@pytest.fixture
def cloudinary(monkeypatch):
    monkeypatch.setattr(settings(), "cloudinary", CLOUD)


def test_uploads_are_off_without_cloudinary(client):
    assert client.get("/v1/uploads").json()["video"] is False
    r = client.post("/v1/uploads/video", headers=auth(client, PEMBA_ID))
    assert r.status_code == 503 and r.json()["detail"] == "uploads_off"


def test_signature_matches_cloudinarys_scheme_and_hides_the_secret(client, cloudinary):
    s = client.get("/v1/uploads").json()
    assert s == {"video": True, "cloud_name": "sajha-demo", "max_seconds": 120, "max_mb": 100}
    assert client.post("/v1/uploads/video", headers=auth(client, CAFE_ID)).status_code == 403  # clients don't upload
    sig = client.post("/v1/uploads/video", headers=auth(client, PEMBA_ID)).json()
    assert "s3cret" not in str(sig) and sig["api_key"] == "123456"
    expected = hashlib.sha1(f"allowed_formats={uploads.FORMATS}&folder={uploads.FOLDER}&timestamp={sig['timestamp']}s3cret"
                            .encode()).hexdigest()
    assert sig["signature"] == expected
    assert sig["upload_url"] == "https://api.cloudinary.com/v1_1/sajha-demo/video/upload"


def test_only_videos_from_our_cloudinary_folder_are_accepted(client, cloudinary):
    pemba = auth(client, PEMBA_ID)
    other = "https://res.cloudinary.com/someone-else/video/upload/v1/sajha-kaam/videos/x.mp4"
    r = client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"video_link": other}, headers=pemba)
    assert r.status_code == 422
    ours = "https://res.cloudinary.com/sajha-demo/video/upload/v17/sajha-kaam/videos/pemba.mp4"
    assert client.post(f"/v1/jobs/{OPEN_JOB}/apply", json={"video_link": ours}, headers=pemba).status_code == 201


def test_cloudinary_url_is_parsed():
    from app.config import _cloudinary
    assert _cloudinary("cloudinary://123456:s3cret@sajha-demo") == CLOUD
    assert _cloudinary("") is None and _cloudinary("https://x") is None
