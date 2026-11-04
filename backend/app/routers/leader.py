"""Verified Leaders: apply (a Mentor record approves at once) and the Sajha Kaam reviewer's list."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.auth import require_role
from app.db import get_session
from app.models import LeaderApplication, LogEntry, PodMember, User
from app.schemas import DeclineIn, LeaderApplicationOut, LeaderApplyIn, LeaderStatus
from app.services import leader
from app.services.views import person

router = APIRouter(prefix="/v1", tags=["leader"])
can_lead = require_role("junior", "anchor")
reviewer = require_role("reviewer")


def app_out(session: Session, a: LeaderApplication) -> LeaderApplicationOut:
    u = session.get(User, a.user_id)
    jobs = session.exec(select(func.count()).select_from(LogEntry).where(LogEntry.junior_id == u.id)).one()
    top = session.exec(select(func.max(PodMember.level)).where(PodMember.junior_id == u.id)).one()
    return LeaderApplicationOut(id=a.id, person=person(u), skill=a.skill, team_name=a.team_name, about=a.about,
                                proof=list(a.proof or []), status=a.status, by_record=a.by_record, reason=a.reason,
                                created_at=a.created_at, signed_jobs=jobs, top_level=top)


def status_out(session: Session, user: User) -> LeaderStatus:
    last = leader.latest(session, user)
    return LeaderStatus(role=user.role, verified=user.leader_verified, mentor_skills=leader.mentor_skills(session, user),
                        application=app_out(session, last) if last else None)


@router.get("/leader/status", response_model=LeaderStatus)
def status(user: User = Depends(can_lead), session: Session = Depends(get_session)) -> LeaderStatus:
    return status_out(session, user)


@router.post("/leader/apply", response_model=LeaderStatus, status_code=201)
def apply(body: LeaderApplyIn, user: User = Depends(can_lead), session: Session = Depends(get_session)) -> LeaderStatus:
    leader.apply(session, user, body.skill, body.team_name, body.about, body.proof)
    session.refresh(user)
    return status_out(session, user)


@router.get("/review/leaders", response_model=list[LeaderApplicationOut])
def waiting(_: User = Depends(reviewer), session: Session = Depends(get_session)) -> list[LeaderApplicationOut]:
    return [app_out(session, a) for a in leader.pending(session)]


@router.post("/review/leaders/{app_id}/approve", response_model=LeaderApplicationOut)
def approve(app_id: str, _: User = Depends(reviewer), session: Session = Depends(get_session)) -> LeaderApplicationOut:
    return app_out(session, leader.decide(session, app_id, True))


@router.post("/review/leaders/{app_id}/decline", response_model=LeaderApplicationOut)
def decline(app_id: str, body: DeclineIn, _: User = Depends(reviewer),
            session: Session = Depends(get_session)) -> LeaderApplicationOut:
    return app_out(session, leader.decide(session, app_id, False, body.reason))
