"""The job agreement (template + rule check, no AI) and the client's side of the loop."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import require_role
from app.config import load_yaml
from app.db import get_session
from app.models import Job, Notification, User
from app.schemas import (
    AcceptIn,
    AnswerIn,
    ApplyIn,
    ChangesIn,
    CheckOut,
    ChooseIn,
    ClientHome,
    JobDetail,
    JobIn,
    JobOut,
    LogEntryOut,
    NotificationOut,
    Problem,
)
from app.services import agreement, uploads, work
from app.services.views import entry_out, job_detail, job_out, person

router = APIRouter(prefix="/v1", tags=["jobs"])
any_user = require_role("anchor", "junior", "client")


@router.get("/agreement/template", response_model=dict)
def template() -> dict:
    """The fixed template: skills, extra questions per skill, examples and fair minimum budgets."""
    t = agreement.template()
    return {"skills": load_yaml("skills.yaml")["skills"], "levels": load_yaml("skills.yaml")["levels"],
            "required": t["required"], "minimum_budget_minor": t["minimum_budget_minor"],
            "skill_fields": t["skill_fields"], "done_when_examples": t["done_when_examples"]}


@router.post("/agreement/check", response_model=CheckOut)
def check(body: JobIn) -> CheckOut:
    problems = agreement.check(body.model_dump())
    return CheckOut(ok=not problems, problems=[Problem(**p) for p in problems])


@router.post("/jobs", response_model=JobOut, status_code=201)
def create(body: JobIn, user: User = Depends(require_role("client")), session: Session = Depends(get_session)) -> JobOut:
    data = body.model_dump()
    return job_out(session, work.create_job(session, user, data, data.pop("send_to_anchor")))


@router.get("/jobs/{job_id}", response_model=JobDetail)
def detail(job_id: str, user: User = Depends(any_user), session: Session = Depends(get_session)) -> JobDetail:
    job = work.get_job(session, job_id)
    if not work.can_see(session, user, job):
        raise HTTPException(404, "job_not_found")
    return job_detail(session, job, approved_only=user.role == "client", viewer=user)


@router.post("/jobs/{job_id}/agree", response_model=JobOut)
def agree(job_id: str, user: User = Depends(require_role("client", "anchor")),
          session: Session = Depends(get_session)) -> JobOut:
    """The side that didn't write the latest version agrees. Only then can juniors see the job."""
    return job_out(session, work.agree(session, user, work.get_job(session, job_id)))


@router.post("/jobs/{job_id}/apply", response_model=JobDetail, status_code=201)
def apply(job_id: str, body: ApplyIn, user: User = Depends(require_role("anchor", "junior")),
          session: Session = Depends(get_session)) -> JobDetail:
    """A Team Leader, or a Mentor (★★★★★) with the skill, applies for an open job. The client chooses."""
    job = work.get_job(session, job_id)
    work.apply_for_job(session, user, job, body.note, body.video_link)
    return job_detail(session, job, viewer=user)


@router.get("/uploads", response_model=dict)
def uploads_status() -> dict:
    """Whether the app can upload videos (Cloudinary set up on the server), and the limits."""
    return uploads.status()


@router.post("/uploads/video", response_model=dict)
def video_upload(user: User = Depends(require_role("anchor", "junior"))) -> dict:
    """A short-lived signature for one direct upload to Cloudinary. The secret never leaves the server."""
    if not uploads.enabled():
        raise HTTPException(503, "uploads_off")
    return uploads.video_signature()


@router.post("/jobs/{job_id}/choose", response_model=JobDetail)
def choose(job_id: str, body: ChooseIn, user: User = Depends(require_role("client")),
           session: Session = Depends(get_session)) -> JobDetail:
    job = work.choose_applicant(session, user, work.get_job(session, job_id), body.application_id)
    return job_detail(session, job, approved_only=True, viewer=user)


@router.post("/jobs/{job_id}/request-changes", response_model=JobOut)
def request_changes(job_id: str, body: ChangesIn, user: User = Depends(require_role("client")),
                    session: Session = Depends(get_session)) -> JobOut:
    return job_out(session, work.request_changes(session, user, work.get_job(session, job_id), body.note))


@router.post("/jobs/{job_id}/change/decide", response_model=JobOut)
def decide_change(job_id: str, body: AnswerIn, user: User = Depends(require_role("client")),
                  session: Session = Depends(get_session)) -> JobOut:
    """The client accepts or declines an amendment the Anchor proposed."""
    return job_out(session, work.decide_change(session, user, work.get_job(session, job_id), body.accept))


@router.get("/client/home", response_model=ClientHome)
def client_home(user: User = Depends(require_role("client")), session: Session = Depends(get_session)) -> ClientHome:
    jobs = session.exec(select(Job).where(Job.client_id == user.id).order_by(Job.created_at.desc())).all()
    to_agree = [j for j in jobs if j.state == "with_client" or j.pending_change]
    to_choose = [j for j in jobs if j.state == "open"
                 and any(a.status == "waiting" for a in work.applications_of(session, j))]
    return ClientHome(anchors=[person(a) for a in work.my_anchors(session, user.id)],
                      to_agree=[job_out(session, j) for j in to_agree],
                      to_choose=[job_out(session, j) for j in to_choose],
                      ready=[job_detail(session, j, approved_only=True) for j in jobs
                             if j.state == "anchor_approved" and j not in to_agree],
                      in_progress=[job_out(session, j) for j in jobs if j not in to_agree and j not in to_choose
                                   and j.state not in ("anchor_approved", "client_accepted")],
                      done=[job_out(session, j) for j in jobs if j.state == "client_accepted"])


@router.post("/jobs/{job_id}/pay", response_model=JobOut)
def pay(job_id: str, user: User = Depends(require_role("client")), session: Session = Depends(get_session)) -> JobOut:
    """Demo payment (no real money): held until the client accepts the work, then paid out as the split."""
    return job_out(session, work.pay(session, user, work.get_job(session, job_id)))


@router.post("/jobs/{job_id}/accept", response_model=LogEntryOut)
def accept(job_id: str, body: AcceptIn, user: User = Depends(require_role("client")),
           session: Session = Depends(get_session)) -> LogEntryOut:
    return entry_out(work.accept(session, user, work.get_job(session, job_id), body.show_client))


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(any_user), session: Session = Depends(get_session)) -> list[NotificationOut]:
    rows = session.exec(select(Notification).where(Notification.user_id == user.id)
                        .order_by(Notification.created_at.desc()).limit(50)).all()
    return [NotificationOut(id=n.id, kind=n.kind, ref=n.ref, read=n.read, created_at=n.created_at) for n in rows]


@router.post("/notifications/read", response_model=dict)
def read_all(user: User = Depends(any_user), session: Session = Depends(get_session)) -> dict:
    for n in session.exec(select(Notification).where(Notification.user_id == user.id, Notification.read == False)):  # noqa: E712
        n.read = True
        session.add(n)
    session.commit()
    return {"ok": True}
