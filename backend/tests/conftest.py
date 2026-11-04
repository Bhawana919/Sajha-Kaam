import os
import tempfile

# TEST_DATABASE_URL runs the suite on Postgres (for example a local one); else a fresh SQLite file.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["DEMO_MODE"] = "1"
os.environ["LLM_PROVIDER"] = "none"
os.environ["READ_LINKS"] = "0"  # tests never touch the network

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    from app.db import init_db
    with TestClient(app) as c:
        init_db(reset=True)  # each test starts from an empty database, then the demo
        assert c.post("/demo/reset").status_code == 200
        yield c


def auth(c: TestClient, user_id: str) -> dict:
    token = c.post("/v1/auth/sample-login", json={"user_id": user_id}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


GOOD_JOB = {
    "skill": "writing", "title": "Write the About page for our shop", "deliverables": ["About page text"],
    "done_when": ["Between 300 and 400 words", "Mentions 'Nepali coffee'"],
    "details": {"words": "300–400", "audience": "Customers in Melbourne", "tone": "Warm, simple"},
    "deadline_days": 4, "budget_minor": 3000, "revisions": 1,
}
