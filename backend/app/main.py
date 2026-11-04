"""Sajha Kaam API.

Run (from backend/):  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.config import settings
from app.db import IS_SQLITE, engine, init_db
from app.routers import anchor, auth, demo, jobs, junior, leader, public, wallet
from app.seed import seed

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not IS_SQLITE and settings().jwt_secret.startswith("dev-only"):
        raise RuntimeError("Set JWT_SECRET to a long random value before using a real database.")
    init_db()
    with Session(engine) as session:
        seed(session)
    yield


app = FastAPI(title="Sajha Kaam API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, junior.router, anchor.router, jobs.router, public.router, demo.router, wallet.router, leader.router):
    app.include_router(r)


@app.get("/health", tags=["meta"])
def health() -> dict:
    s = settings()
    return {"ok": True, "demo_mode": s.demo_mode, "llm": s.llm_provider}


# Hosted: the web app (npx expo export -p web) is served from the same address as the API.
_web = Path(os.environ.get("WEB_DIR", "")).resolve() if os.environ.get("WEB_DIR") else None
if _web and (_web / "index.html").is_file():

    @app.get("/{path:path}", include_in_schema=False)
    def web_app(path: str) -> FileResponse:
        """A real file if there is one, otherwise the app's index.html (it handles its own routes)."""
        if path.startswith(("v1/", "demo/", "p/", ".well-known/")):
            raise HTTPException(404, "not found")  # an API address that doesn't exist stays a JSON 404
        f = (_web / path).resolve()
        if path and f.is_file() and f.is_relative_to(_web):
            return FileResponse(f)
        return FileResponse(_web / "index.html", headers={"Cache-Control": "no-cache"})
