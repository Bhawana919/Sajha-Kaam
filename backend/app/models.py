"""SQLite tables (UUID keys, UTC times, money as integer minor units).

The loop: an Anchor writes a job agreement (from a template) and the client agrees (or the client
writes it and the Anchor agrees), the Anchor offers it to a junior who accepts the brief, the junior submits work, a first check runs (offline by default), the Anchor
approves or sends it back, the client accepts, and a signed logbook entry is issued to the junior.
Juniors join a team by asking with a work sample; the Anchor reviews requests blind.
"""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

UTC = timezone.utc  # same as datetime.UTC, which needs Python 3.11+


def new_id() -> str:
    return str(uuid.uuid4())


def new_slug() -> str:
    """Public id for a logbook page. Random, so it never reveals a name."""
    return secrets.token_urlsafe(8)


def new_code() -> str:
    return secrets.token_hex(4).upper()


def utcnow() -> datetime:
    return datetime.now(UTC)


def _json(default=list):
    return Field(default_factory=default, sa_column=Column(JSON, nullable=False))


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=new_id, primary_key=True)
    role: str = Field(index=True)  # anchor | junior | client
    email: str = Field(index=True, unique=True)  # sign-in only, never shown to others
    password_hash: str
    display_name: str
    locale: str = "en"
    headline: str = ""  # Anchor: job and city abroad. Client: business. Junior: optional.
    country: str = ""
    profile_slug: str = Field(default_factory=new_slug, index=True, unique=True)
    ai_helper: bool = False  # Anchor's choice to use an external AI for first checks (off by default)
    created_at: datetime = Field(default_factory=utcnow)


class JuniorProfile(SQLModel, table=True):
    """The junior's CV, filled from a fixed template. District is private."""

    __tablename__ = "junior_profiles"
    user_id: str = Field(foreign_key="users.id", primary_key=True)
    about: str = ""
    skills: list[str] = _json()
    languages: list[str] = _json()
    tools: list[str] = _json()
    samples: list[dict] = _json()  # [{title, link}]
    hours_per_week: int = 10
    education: str = ""
    district: str = ""  # private: never shown to Anchors or clients


class Pod(SQLModel, table=True):
    """An Anchor's team, built around one skill."""

    __tablename__ = "pods"
    id: str = Field(default_factory=new_id, primary_key=True)
    anchor_id: str = Field(foreign_key="users.id", index=True, unique=True)
    name: str
    skill: str = Field(index=True)
    about: str = ""
    seats_open: int = 0
    test_task: str = ""  # optional small task every applicant answers, so comparing is fair


class PodMember(SQLModel, table=True):
    __tablename__ = "pod_members"
    pod_id: str = Field(foreign_key="pods.id", primary_key=True)
    junior_id: str = Field(foreign_key="users.id", primary_key=True)
    level: int = 2  # 1 shadow · 2 close review · 3 spot check · 4 solo · 5 lead
    joined_at: datetime = Field(default_factory=utcnow)


class LevelChange(SQLModel, table=True):
    __tablename__ = "level_changes"
    id: str = Field(default_factory=new_id, primary_key=True)
    pod_id: str = Field(foreign_key="pods.id")
    junior_id: str = Field(foreign_key="users.id", index=True)
    old_level: int
    new_level: int
    reason: str
    created_at: datetime = Field(default_factory=utcnow)


class JoinRequest(SQLModel, table=True):
    """A junior asking to join a team. Reviewed blind: shown as "Applicant A" until decided."""

    __tablename__ = "join_requests"
    id: str = Field(default_factory=new_id, primary_key=True)
    pod_id: str = Field(foreign_key="pods.id", index=True)
    junior_id: str = Field(foreign_key="users.id", index=True)
    sample_link: str
    note: str = ""
    test_answer: str = ""
    status: str = Field(default="waiting", index=True)  # waiting | accepted | declined
    created_at: datetime = Field(default_factory=utcnow)
    decided_at: datetime | None = None


class AnchorClient(SQLModel, table=True):
    """A client the Anchor invited (or who sent the Anchor a job)."""

    __tablename__ = "anchor_clients"
    anchor_id: str = Field(foreign_key="users.id", primary_key=True)
    client_id: str = Field(foreign_key="users.id", primary_key=True)


class Invite(SQLModel, table=True):
    __tablename__ = "invites"
    code: str = Field(default_factory=new_code, primary_key=True)
    anchor_id: str = Field(foreign_key="users.id", index=True)
    used_by: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class Job(SQLModel, table=True):
    """The job agreement, from the fixed template, plus where the work is in the loop."""

    __tablename__ = "jobs"
    id: str = Field(default_factory=new_id, primary_key=True)
    client_id: str = Field(foreign_key="users.id", index=True)
    pod_id: str | None = Field(default=None, foreign_key="pods.id", index=True)
    junior_id: str | None = Field(default=None, foreign_key="users.id", index=True)
    skill: str = Field(index=True)
    title: str
    deliverables: list[str] = _json()
    done_when: list[str] = _json()
    details: dict = _json(dict)  # answers to the skill's extra questions
    references: list[dict] = _json()  # [{link, note, kind: like | not_like}]
    deadline_days: int
    budget_minor: int
    currency: str = "USD"
    revisions: int = 1
    allow_ai: bool = False  # client's consent for an external AI check on this job
    # Before agreement (whoever wrote the latest version waits for the other side):
    #   Anchor wrote it:  with_client -(client asks for changes)-> draft -(Anchor edits)-> with_client
    #   Client sent it to their Anchor: with_anchor
    #   Client posted it to everyone: open (Anchors and Mentors with the skill apply; the client chooses)
    # After: agreed -> assigned (offered to a junior) -> working (junior accepted the brief)
    #        -> submitted -> (sent_back -> submitted)* -> anchor_approved -> client_accepted
    state: str = Field(default="open", index=True)
    change_note: str = ""  # the client's "please change" note while the Anchor edits the draft
    agreed_at: datetime | None = None  # both sides agreed; juniors see nothing before this
    pending_change: dict = _json(dict)  # an Anchor's proposed amendment: {deadline_days, budget_minor, note}
    amendments: list[dict] = _json()  # accepted amendments: [{field, old, new, note, at}]
    supervision_level: int | None = None  # the junior's level when assigned, recorded in the logbook
    junior_accepted_at: datetime | None = None  # the junior tapped "I accept" on the brief
    # Demo payment (no real money): the client pays after agreeing, it is held until the client
    # accepts the work, then paid out as the split.  unpaid -> held -> paid_out
    payment: str = Field(default="unpaid", index=True)
    paid_at: datetime | None = None
    paid_out_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class JobApplication(SQLModel, table=True):
    """Someone going for a job a client posted to everyone: a Team Leader with that skill, or a member
    who is a Mentor (level 5) in a team with that skill. The client chooses one."""

    __tablename__ = "job_applications"
    id: str = Field(default_factory=new_id, primary_key=True)
    job_id: str = Field(foreign_key="jobs.id", index=True)
    applicant_id: str = Field(foreign_key="users.id", index=True)
    pod_id: str = Field(foreign_key="pods.id")  # the team the job goes into if chosen
    note: str = ""
    video_link: str = ""  # a short video (up to 2 minutes) on YouTube, Google Drive, Vimeo or Loom; Mentors must add one
    status: str = Field(default="waiting", index=True)  # waiting | chosen | not_chosen
    created_at: datetime = Field(default_factory=utcnow)
    decided_at: datetime | None = None


class Submission(SQLModel, table=True):
    __tablename__ = "submissions"
    id: str = Field(default_factory=new_id, primary_key=True)
    job_id: str = Field(foreign_key="jobs.id", index=True)
    junior_id: str = Field(foreign_key="users.id")
    link: str = ""
    content: str = ""
    note: str = ""
    check: dict = _json(dict)
    status: str = Field(default="waiting", index=True)  # waiting | sent_back | approved
    anchor_note: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    decided_at: datetime | None = None


class AnchorNote(SQLModel, table=True):
    """The Anchor's own review comments. Every "send back" note is added, so first checks
    quote the Anchor's real words more and more over time."""

    __tablename__ = "anchor_notes"
    id: str = Field(default_factory=new_id, primary_key=True)
    anchor_id: str = Field(foreign_key="users.id", index=True)
    text: str
    source: str = "added"  # added | send_back | seed
    created_at: datetime = Field(default_factory=utcnow)


class LogEntry(SQLModel, table=True):
    """Signed logbook entry: approved by the Anchor AND accepted by the client."""

    __tablename__ = "log_entries"
    id: str = Field(default_factory=new_id, primary_key=True)
    job_id: str = Field(foreign_key="jobs.id", unique=True)
    junior_id: str = Field(foreign_key="users.id", index=True)
    credential: dict = _json(dict)
    signature_b64: str
    key_id: str
    issued_at: datetime = Field(default_factory=utcnow)


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    kind: str
    ref: str = ""  # id of the job, team or request it is about
    read: bool = False
    created_at: datetime = Field(default_factory=utcnow)
