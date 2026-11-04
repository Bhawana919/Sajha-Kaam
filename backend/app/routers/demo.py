"""Demo controls (DEMO_MODE=1 only)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.config import settings
from app.db import engine, init_db
from app.seed import reset_demo, seed


def demo_only() -> None:
    if not settings().demo_mode:
        raise HTTPException(404, "not found")


router = APIRouter(prefix="/demo", tags=["demo"], dependencies=[Depends(demo_only)])


@router.post("/reset", response_model=dict)
def reset() -> dict:
    """Start the demo again with fresh sample data. Only the demo people are reset: real accounts stay."""
    init_db()
    with Session(engine) as session:
        reset_demo(session)
        seed(session)
    return {"ok": True}
