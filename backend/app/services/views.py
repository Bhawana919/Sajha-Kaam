"""Turn database rows into API responses."""

from sqlmodel import Session, select

from app.models import Job, LogEntry, Pod, PodMember, Submission, User
from app.schemas import (
    Amendment,
    FirstCheck,
    JobDetail,
    JobOut,
    LogEntryOut,
    MoneySplit,
    PendingChange,
    PersonOut,
    PodOut,
    Reference,
    SubmissionOut,
)
from app.services import signing
from app.services.work import anchor_of, split


def person(u: User) -> PersonOut:
    return PersonOut(id=u.id, display_name=u.display_name, headline=u.headline, country=u.country)


def pod_out(session: Session, p: Pod) -> PodOut:
    return PodOut(id=p.id, name=p.name, skill=p.skill, about=p.about, seats_open=p.seats_open,
                  test_task=p.test_task, anchor=person(session.get(User, p.anchor_id)))


def job_out(session: Session, j: Job, viewer: User | None = None) -> JobOut:
    """A junior sees only the client's country: the client relationship belongs to the Anchor."""
    anchor = anchor_of(session, j)
    junior = session.get(User, j.junior_id) if j.junior_id else None
    client = person(session.get(User, j.client_id))
    if viewer is not None and viewer.role == "junior":
        client = PersonOut(id="", display_name="", headline="", country=client.country)
    return JobOut(
        id=j.id, skill=j.skill, title=j.title, deliverables=j.deliverables, done_when=j.done_when,
        details=j.details, references=[Reference(**r) for r in j.references], deadline_days=j.deadline_days,
        budget_minor=j.budget_minor, currency=j.currency, revisions=j.revisions, allow_ai=j.allow_ai,
        state=j.state, change_note=j.change_note, agreed_at=j.agreed_at,
        pending_change=PendingChange(**j.pending_change) if j.pending_change else None,
        amendments=[Amendment(**a) for a in j.amendments], supervision_level=j.supervision_level,
        junior_accepted_at=j.junior_accepted_at, created_at=j.created_at, client=client, anchor=person(anchor) if anchor else None,
        junior=person(junior) if junior else None, split=MoneySplit(**split(j.budget_minor)),
    )


def submission_out(s: Submission) -> SubmissionOut:
    return SubmissionOut(id=s.id, job_id=s.job_id, link=s.link, content=s.content, note=s.note,
                         check=FirstCheck(**s.check), status=s.status, anchor_note=s.anchor_note,
                         created_at=s.created_at, decided_at=s.decided_at)


def job_detail(session: Session, j: Job, approved_only: bool = False, viewer: User | None = None) -> JobDetail:
    subs = session.exec(select(Submission).where(Submission.job_id == j.id)
                        .order_by(Submission.created_at.desc())).all()
    if approved_only:  # the client sees only work the Anchor approved
        subs = [s for s in subs if s.status == "approved"]
    return JobDetail(job=job_out(session, j, viewer), submissions=[submission_out(s) for s in subs])


def entry_out(e: LogEntry) -> LogEntryOut:
    return LogEntryOut(id=e.id, credential=e.credential, signature_b64=e.signature_b64, key_id=e.key_id,
                       issued_at=e.issued_at, valid=signing.verify(e.credential, e.signature_b64))


def levels_by_team(session: Session, junior_id: str) -> dict[str, int]:
    return {m.pod_id: m.level for m in session.exec(select(PodMember).where(PodMember.junior_id == junior_id)).all()}
