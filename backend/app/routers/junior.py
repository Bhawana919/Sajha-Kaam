"""Juniors: the CV-style profile, open teams to ask to join, home, work submission and logbook."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth import require_role
from app.db import get_session
from app.models import Job, JuniorProfile, LogEntry, Pod, PodMember, User
from app.schemas import (
    AnswerIn,
    JobOut,
    JoinIn,
    JuniorHome,
    LogEntryOut,
    MyMoney,
    MyTeamStatus,
    OpenTeam,
    ProfileIn,
    ProfileOut,
    ShareRow,
    SubmissionOut,
    SubmitIn,
)
from app.services import agreement, work
from app.services.views import (
    badge_change,
    entry_out,
    job_out,
    levels_by_team,
    person,
    pod_out,
    progress_out,
    submission_out,
)

router = APIRouter(prefix="/v1", tags=["junior"])
junior_only = require_role("junior")
STATE_ORDER = {"assigned": 0, "sent_back": 1, "working": 2, "submitted": 3, "anchor_approved": 4, "client_accepted": 5}


def _complete(p: JuniorProfile | None) -> bool:
    return bool(p and p.skills and p.samples and p.languages)


@router.get("/me/profile", response_model=ProfileOut)
def get_profile(user: User = Depends(junior_only), session: Session = Depends(get_session)) -> ProfileOut:
    p = session.get(JuniorProfile, user.id) or JuniorProfile(user_id=user.id)
    return ProfileOut(about=p.about, skills=p.skills or ["web"], languages=p.languages, tools=p.tools,
                      samples=p.samples, hours_per_week=p.hours_per_week, education=p.education,
                      district=p.district, complete=_complete(session.get(JuniorProfile, user.id)))


@router.put("/me/profile", response_model=ProfileOut)
def put_profile(body: ProfileIn, user: User = Depends(junior_only), session: Session = Depends(get_session)) -> ProfileOut:
    known = agreement.skills()
    if any(s not in known for s in body.skills):
        raise HTTPException(422, "unknown_skill")
    p = session.get(JuniorProfile, user.id) or JuniorProfile(user_id=user.id)
    data = body.model_dump()
    data["samples"] = [s for s in data["samples"] if s["link"].startswith(("https://", "http://"))]
    for k, v in data.items():
        setattr(p, k, v)
    session.add(p)
    session.commit()
    session.refresh(p)
    return ProfileOut(**data, complete=_complete(p))


@router.get("/teams/open", response_model=list[OpenTeam])
def open_teams(user: User = Depends(junior_only), session: Session = Depends(get_session)) -> list[OpenTeam]:
    return [OpenTeam(team=pod_out(session, pod), my_request=status) for pod, status in work.open_teams_for(session, user)]


@router.post("/teams/{team_id}/join", response_model=dict, status_code=201)
def join(team_id: str, body: JoinIn, user: User = Depends(junior_only), session: Session = Depends(get_session)) -> dict:
    req = work.request_join(session, user, team_id, **body.model_dump())
    return {"id": req.id, "status": req.status}


@router.get("/junior/home", response_model=JuniorHome)
def home(user: User = Depends(junior_only), session: Session = Depends(get_session)) -> JuniorHome:
    teams = [session.get(Pod, m.pod_id) for m in work.memberships(session, user.id)]
    jobs = sorted(session.exec(select(Job).where(Job.junior_id == user.id)).all(),
                  key=lambda j: (STATE_ORDER.get(j.state, 9), j.created_at))
    entries = session.exec(select(func.count()).select_from(LogEntry).where(LogEntry.junior_id == user.id)).one()
    return JuniorHome(profile_complete=_complete(session.get(JuniorProfile, user.id)),
                      teams=[pod_out(session, t) for t in teams], levels=levels_by_team(session, user.id),
                      jobs=[job_out(session, j, user) for j in jobs], open_teams=len(work.open_teams_for(session, user)),
                      log_entries=entries, profile_slug=user.profile_slug,
                      open_jobs=[job_out(session, j, user) for j in work.open_jobs_for(session, user)],
                      earnings=[MyMoney(**m) for m in work.junior_money(session, user.id)],
                      team_status=[_team_status(session, user, m) for m in work.memberships(session, user.id)])


def _team_status(session: Session, user: User, m: PodMember) -> MyTeamStatus:
    """The member's own progress and last badge change, and how the team's jobs were shared (visible to all)."""
    pod = session.get(Pod, m.pod_id)
    rows = session.exec(select(PodMember).where(PodMember.pod_id == pod.id).order_by(PodMember.joined_at)).all()
    return MyTeamStatus(team_id=pod.id, progress=progress_out(session, pod, m),
                        last_change=badge_change(work.last_change(session, pod.id, user.id)),
                        sharing=[ShareRow(person=person(session.get(User, r.junior_id)), level=r.level,
                                          jobs_30d=work.jobs_last_30_days(session, pod.id, r.junior_id)) for r in rows])


@router.post("/jobs/{job_id}/brief", response_model=JobOut)
def answer_brief(job_id: str, body: AnswerIn, user: User = Depends(junior_only),
                 session: Session = Depends(get_session)) -> JobOut:
    """The junior accepts (or declines) the task brief before starting."""
    return job_out(session, work.answer_brief(session, user, work.get_job(session, job_id), body.accept), user)


@router.post("/jobs/{job_id}/submit", response_model=SubmissionOut, status_code=201)
def submit(job_id: str, body: SubmitIn, user: User = Depends(junior_only),
           session: Session = Depends(get_session)) -> SubmissionOut:
    return submission_out(work.submit(session, user, work.get_job(session, job_id), **body.model_dump()))


@router.get("/me/logbook", response_model=list[LogEntryOut])
def my_logbook(user: User = Depends(junior_only), session: Session = Depends(get_session)) -> list[LogEntryOut]:
    rows = session.exec(select(LogEntry).where(LogEntry.junior_id == user.id).order_by(LogEntry.issued_at.desc())).all()
    return [entry_out(e) for e in rows]

