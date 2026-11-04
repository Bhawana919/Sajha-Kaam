"""The Anchor desk: only what needs the Anchor's decision. Plus team, seats, blind join requests,
levels, client invites and the Anchor's own review notes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth import require_role
from app.config import load_yaml
from app.db import get_session
from app.models import AnchorClient, AnchorNote, Job, JoinRequest, PodMember, User
from app.schemas import (
    AmendIn,
    AnchorJobIn,
    AssignIn,
    BlindRequest,
    DecideIn,
    DeskOut,
    Evidence,
    InviteOut,
    JobIn,
    JobOut,
    LevelIn,
    MemberEarning,
    MemberOut,
    NoteIn,
    NoteOut,
    PauseIn,
    PodOut,
    SeatsIn,
    SendBackIn,
    SubmissionOut,
    TeamMoney,
    TeamOut,
)
from app.services import work
from app.services.views import badge_change, job_detail, job_out, person, pod_out, progress_out, submission_out

router = APIRouter(prefix="/v1", tags=["anchor"])
anchor_only = require_role("anchor")


@router.get("/anchor/desk", response_model=DeskOut)
def desk(user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> DeskOut:
    pod = work.pod_of_anchor(session, user.id)
    mine = session.exec(select(Job).where(Job.pod_id == pod.id).order_by(Job.created_at)).all()
    open_jobs = work.open_jobs_for(session, user)
    requests = session.exec(select(func.count()).select_from(JoinRequest).where(
        JoinRequest.pod_id == pod.id, JoinRequest.status == "waiting")).one()
    clients = session.exec(select(func.count()).select_from(AnchorClient).where(AnchorClient.anchor_id == user.id)).one()
    active = sorted((j for j in mine if j.state in work.ACTIVE), key=work.due_at)
    totals, members = work.team_money(session, pod)
    return DeskOut(team=pod_out(session, pod),
                   waiting_review=[job_detail(session, j) for j in mine if j.state == "submitted"],
                   agreements=[job_out(session, j) for j in mine if j.state in ("draft", "with_anchor", "with_client")],
                   to_assign=[job_out(session, j) for j in mine if j.state == "agreed"],
                   open_jobs=[job_out(session, j) for j in open_jobs], join_requests=requests, with_clients=clients,
                   deadlines=[job_out(session, j) for j in active], money=[TeamMoney(**t) for t in totals],
                   supervising=work.leader_active(session, pod.id), supervise_limit=work.leader_limit(),
                   applied_jobs=[job_out(session, j) for j in work.open_jobs_for(session, user, applied=True)],
                   member_earnings=[MemberEarning(person=person(session.get(User, m["junior_id"])), currency=m["currency"],
                                                  amount_minor=m["amount_minor"], jobs=m["jobs"]) for m in members])


@router.post("/anchor/jobs", response_model=JobOut, status_code=201)
def write_job(body: AnchorJobIn, user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> JobOut:
    """The Anchor writes the agreement for a client; it goes to the client to agree."""
    data = body.model_dump()
    return job_out(session, work.anchor_create_job(session, user, data.pop("client_id"), data))


@router.put("/jobs/{job_id}", response_model=JobOut)
def edit_job(job_id: str, body: JobIn, user: User = Depends(anchor_only),
             session: Session = Depends(get_session)) -> JobOut:
    """Rewrite an agreement that isn't agreed yet; it goes (back) to the client."""
    return job_out(session, work.edit_job(session, user, work.get_job(session, job_id), body.model_dump()))


@router.post("/jobs/{job_id}/change", response_model=JobOut)
def propose_change(job_id: str, body: AmendIn, user: User = Depends(anchor_only),
                   session: Session = Depends(get_session)) -> JobOut:
    """Propose a new deadline or budget after agreement. The client must accept it."""
    return job_out(session, work.propose_change(session, user, work.get_job(session, job_id), **body.model_dump()))


@router.post("/jobs/{job_id}/assign", response_model=JobOut)
def assign(job_id: str, body: AssignIn, user: User = Depends(anchor_only),
           session: Session = Depends(get_session)) -> JobOut:
    return job_out(session, work.assign(session, user, work.get_job(session, job_id), body.junior_id))


@router.post("/submissions/{submission_id}/approve", response_model=SubmissionOut)
def approve(submission_id: str, user: User = Depends(anchor_only),
            session: Session = Depends(get_session)) -> SubmissionOut:
    return submission_out(work.approve(session, user, submission_id))


@router.post("/submissions/{submission_id}/send-back", response_model=SubmissionOut)
def send_back(submission_id: str, body: SendBackIn, user: User = Depends(anchor_only),
              session: Session = Depends(get_session)) -> SubmissionOut:
    return submission_out(work.send_back(session, user, submission_id, body.note))


@router.get("/anchor/team", response_model=TeamOut)
def team(user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> TeamOut:
    pod = work.pod_of_anchor(session, user.id)
    members = []
    for m in session.exec(select(PodMember).where(PodMember.pod_id == pod.id).order_by(PodMember.joined_at)).all():
        open_jobs = session.exec(select(func.count()).select_from(Job).where(
            Job.junior_id == m.junior_id, Job.pod_id == pod.id, Job.state != "client_accepted")).one()
        members.append(MemberOut(person=person(session.get(User, m.junior_id)), level=m.level,
                                 evidence=Evidence(**work.evidence(session, pod, m.junior_id)), open_jobs=open_jobs,
                                 jobs_30d=work.jobs_last_30_days(session, pod.id, m.junior_id),
                                 active_jobs=work.member_active(session, m.junior_id),
                                 job_limit=work.member_limit(session, m.junior_id, m.level),
                                 progress=progress_out(session, pod, m),
                                 last_change=badge_change(work.last_change(session, pod.id, m.junior_id))))
    clients = [session.get(User, link.client_id) for link in
               session.exec(select(AnchorClient).where(AnchorClient.anchor_id == user.id)).all()]
    return TeamOut(team=pod_out(session, pod), members=members, clients=[person(c) for c in clients])


@router.put("/anchor/seats", response_model=PodOut)
def seats(body: SeatsIn, user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> PodOut:
    return pod_out(session, work.set_seats(session, user, body.seats_open, body.test_task))


@router.get("/anchor/requests", response_model=list[BlindRequest])
def requests(user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> list[BlindRequest]:
    working = {w.lower() for w in load_yaml("skills.yaml")["working_languages"]}
    return [BlindRequest(id=r.id, label=label, skills=p.skills if p else [],
                         languages=[lang for lang in (p.languages if p else []) if lang.lower() in working],
                         tools=p.tools if p else [], hours_per_week=p.hours_per_week if p else 0,
                         sample_link=r.sample_link, note=r.note, test_answer=r.test_answer, created_at=r.created_at)
            for label, r, p in work.blind_requests(session, user)]


@router.post("/anchor/requests/{request_id}/decide", response_model=dict)
def decide(request_id: str, body: DecideIn, user: User = Depends(anchor_only),
           session: Session = Depends(get_session)) -> dict:
    req = work.decide_request(session, user, request_id, body.accept)
    return {"id": req.id, "status": req.status}


@router.post("/anchor/members/{junior_id}/level", response_model=dict)
def level(junior_id: str, body: LevelIn, user: User = Depends(anchor_only),
          session: Session = Depends(get_session)) -> dict:
    """Lower a badge (badges go up automatically by the rules). The member sees the reason."""
    m = work.set_level(session, user, junior_id, body.level, body.reason)
    return {"junior_id": m.junior_id, "level": m.level}


@router.post("/anchor/members/{junior_id}/pause", response_model=dict)
def pause(junior_id: str, body: PauseIn, user: User = Depends(anchor_only),
          session: Session = Depends(get_session)) -> dict:
    """Pause the member's next automatic promotion, once, with a reason the member sees."""
    m = work.pause_promotion(session, user, junior_id, body.reason)
    return {"junior_id": m.junior_id, "level": m.level, "paused_reason": m.hold_reason}


@router.post("/anchor/invites", response_model=InviteOut, status_code=201)
def invite(user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> InviteOut:
    return InviteOut(code=work.create_invite(session, user).code)


@router.get("/anchor/notes", response_model=list[NoteOut])
def notes(user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> list[NoteOut]:
    rows = session.exec(select(AnchorNote).where(AnchorNote.anchor_id == user.id)
                        .order_by(AnchorNote.created_at.desc())).all()
    return [NoteOut(id=r.id, text=r.text, source=r.source, created_at=r.created_at) for r in rows]


@router.post("/anchor/notes", response_model=NoteOut, status_code=201)
def add_note(body: NoteIn, user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> NoteOut:
    row = AnchorNote(anchor_id=user.id, text=body.text.strip())
    session.add(row)
    session.commit()
    session.refresh(row)
    return NoteOut(id=row.id, text=row.text, source=row.source, created_at=row.created_at)


@router.delete("/anchor/notes/{note_id}", response_model=dict)
def delete_note(note_id: str, user: User = Depends(anchor_only), session: Session = Depends(get_session)) -> dict:
    row = session.get(AnchorNote, note_id)
    if row is None or row.anchor_id != user.id:
        raise HTTPException(404, "note_not_found")
    session.delete(row)
    session.commit()
    return {"ok": True}
