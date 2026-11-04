"""Video uploads go straight from the phone to Cloudinary; Sajha Kaam only signs them.

The app asks for a signature, uploads the file to Cloudinary with it, and saves the returned link as
the application's video. The API secret never leaves the server. Cloudinary rejects an upload whose
signature doesn't match, so only signed-in Team Leaders and members can upload, only into our folder,
and only video formats.
"""

import hashlib
import time

from app.config import settings

FOLDER = "sajha-kaam/videos"
FORMATS = "mp4,mov,webm,m4v,3gp"
MAX_SECONDS = 120  # the 2-minute video
MAX_MB = 100  # Cloudinary's free plan limit for one video


def enabled() -> bool:
    return settings().cloudinary is not None


def status() -> dict:
    c = settings().cloudinary
    return {"video": c is not None, "cloud_name": c["cloud_name"] if c else None,
            "max_seconds": MAX_SECONDS, "max_mb": MAX_MB}


def sign(params: dict, api_secret: str) -> str:
    """Cloudinary's signature: the params sorted as k=v joined by &, then the secret, SHA-1 hex."""
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1((to_sign + api_secret).encode()).hexdigest()  # noqa: S324 (Cloudinary's scheme)


def video_signature(now: int | None = None) -> dict:
    c = settings().cloudinary
    params = {"allowed_formats": FORMATS, "folder": FOLDER, "timestamp": int(now or time.time())}
    return {**params, "api_key": c["api_key"], "cloud_name": c["cloud_name"], "signature": sign(params, c["api_secret"]),
            "upload_url": f"https://api.cloudinary.com/v1_1/{c['cloud_name']}/video/upload"}


def is_our_video(link: str, host: str, path: str) -> bool:
    """A video uploaded through the app: on our Cloudinary account, in our folder."""
    c = settings().cloudinary
    return bool(c) and host == "res.cloudinary.com" and path.startswith(f"/{c['cloud_name']}/video/upload/") \
        and f"/{FOLDER}/" in path
