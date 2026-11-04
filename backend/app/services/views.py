"""Turn database rows into API responses."""

from sqlmodel import Session, func, select

from app.models import Job, JobApplication, LevelChange, LogEntry, Pod, PodMember, Submission, User
from app.schemas import (
    Amendment,
    ApplicationOut,
    BadgeChange,
    FirstCheck,
    JobDetail,
    JobOut,
    LogEntryOut,
    MoneySplit,
    PendingChange,
    PersonOut,
    PodOut,
    Progress,
    Reference,
    RuleCheck,
    SubmissionOut,
)
from app.services import signing, work
from app.services.work import anchor_of, applications_of, due_at, my_application, split


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
        junior_accepted_at=j.junior_accepted_at, created_at=j.created_at, due_at=due_at(j), payment=j.payment,
        paid_at=j.paid_at, paid_out_at=j.paid_out_at, client=client, anchor=person(anchor) if anchor else None,
        junior=person(junior) if junior else None, split=MoneySplit(**split(j.budget_minor, j.supervision_level)),
    )


def submission_out(s: Submission) -> SubmissionOut:
    return SubmissionOut(id=s.id, job_id=s.job_id, link=s.link, content=s.content, note=s.note,
                         check=FirstCheck(**s.check), status=s.status, anchor_note=s.anchor_note,
                         created_at=s.created_at, decided_at=s.decided_at)


def application_out(session: Session, a: JobApplication) -> ApplicationOut:
    u, pod = session.get(User, a.applicant_id), session.get(Pod, a.pod_id)
    mentor = u.role == "junior"
    if mentor:
        signed = session.exec(select(func.count()).select_from(LogEntry).where(LogEntry.junior_id == u.id)).one()
        level = session.get(PodMember, (pod.id, u.id))
    else:
        signed = session.exec(select(func.count()).select_from(Job).where(
            Job.pod_id == pod.id, Job.state == "client_accepted")).one()
        level = None
    return ApplicationOut(id=a.id, status=a.status, note=a.note, video_link=a.video_link, created_at=a.created_at, applicant=person(u),
                          role=u.role, team_name=pod.name, level=level.level if level else None, signed_jobs=signed,
                          profile_slug=u.profile_slug if mentor else None)


def job_detail(session: Session, j: Job, approved_only: bool = False, viewer: User | None = None) -> JobDetail:
    subs = session.exec(select(Submission).where(Submission.job_id == j.id)
                        .order_by(Submission.created_at.desc())).all()
    if approved_only:  # the client sees only work the Anchor approved
        subs = [s for s in subs if s.status == "approved"]
    out = JobDetail(job=job_out(session, j, viewer), submissions=[submission_out(s) for s in subs])
    if viewer is not None and viewer.id == j.client_id:
        if j.state == "open":
            out.applications = [application_out(session, a) for a in applications_of(session, j)]
    elif viewer is not None:
        mine = my_application(session, viewer, j)
        out.my_application = mine.status if mine else None
    return out


def entry_out(e: LogEntry) -> LogEntryOut:
    return LogEntryOut(id=e.id, credential=e.credential, signature_b64=e.signature_b64, key_id=e.key_id,
                       issued_at=e.issued_at, valid=signing.verify(e.credential, e.signature_b64))


def badge_change(lc: LevelChange | None) -> BadgeChange | None:
    return BadgeChange(kind=lc.kind, old_level=lc.old_level, new_level=lc.new_level, reason=lc.reason,
                       created_at=lc.created_at) if lc else None


def progress_out(session: Session, pod: Pod, m: PodMember) -> Progress:
    p = work.progress(session, m, pod.skill)
    return Progress(level=p["level"], next_level=p["next_level"], checks=[RuleCheck(**c) for c in p["checks"]],
                    verified=p["verified"], paused_reason=p["paused_reason"])


def levels_by_team(session: Session, junior_id: str) -> dict[str, int]:
    return {m.pod_id: m.level for m in session.exec(select(PodMember).where(PodMember.junior_id == junior_id)).all()}
