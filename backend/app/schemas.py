"""Request and response shapes. No email, password or private district is ever in a response
about another person."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["anchor", "junior", "client"]
JobState = Literal["draft", "with_client", "with_anchor", "open", "agreed", "assigned", "working", "submitted",
                   "sent_back", "anchor_approved", "client_accepted"]


# ---------- auth ----------

class Tokens(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SampleIdentity(BaseModel):
    user_id: str
    display_name: str
    role: Role
    headline: str


class SampleLoginIn(BaseModel):
    user_id: str


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    role: Role
    display_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    headline: str = Field(default="", max_length=120)  # business name for clients, job for Anchors
    country: str = Field(default="", max_length=60)
    invite_code: str = ""  # clients invited by an Anchor
    team_name: str = ""  # Anchors: their team
    team_skill: str = ""


class RefreshIn(BaseModel):
    refresh_token: str


class MeOut(BaseModel):
    id: str
    role: Role
    display_name: str
    headline: str
    country: str
    profile_slug: str
    ai_helper: bool


class SettingsIn(BaseModel):
    ai_helper: bool


# ---------- people and teams ----------

class PersonOut(BaseModel):
    id: str
    display_name: str
    headline: str
    country: str


class Sample(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    link: str = Field(min_length=8, max_length=500)


class ProfileIn(BaseModel):
    about: str = Field(default="", max_length=600)
    skills: list[str] = Field(min_length=1, max_length=5)
    languages: list[str] = Field(default_factory=list, max_length=6)
    tools: list[str] = Field(default_factory=list, max_length=12)
    samples: list[Sample] = Field(default_factory=list, max_length=3)
    hours_per_week: int = Field(default=10, ge=1, le=60)
    education: str = Field(default="", max_length=200)
    district: str = Field(default="", max_length=60)


class ProfileOut(ProfileIn):
    complete: bool


class PodOut(BaseModel):
    id: str
    name: str
    skill: str
    about: str
    seats_open: int
    test_task: str
    anchor: PersonOut


class SeatsIn(BaseModel):
    seats_open: int = Field(ge=0, le=10)
    test_task: str = Field(default="", max_length=600)


class OpenTeam(BaseModel):
    team: PodOut
    my_request: Literal["waiting", "accepted", "declined"] | None


class JoinIn(BaseModel):
    sample_link: str = Field(min_length=8, max_length=500)
    note: str = Field(default="", max_length=600)
    test_answer: str = Field(default="", max_length=2000)


class BlindRequest(BaseModel):
    """What the Anchor sees: work and skills only, as "Applicant A". No name, district, about-me, or
    languages beyond the working languages clients use."""
    id: str
    label: str
    skills: list[str]
    languages: list[str]
    tools: list[str]
    hours_per_week: int
    sample_link: str
    note: str
    test_answer: str
    created_at: datetime


class DecideIn(BaseModel):
    accept: bool


class Evidence(BaseModel):
    signed_jobs: int
    first_try_streak: int
    sent_back_total: int


class RuleCheck(BaseModel):
    code: Literal["jobs", "last_first_time", "first_time_pct", "last_on_time"]
    need: int
    have: int
    ok: bool


class Progress(BaseModel):
    """The next badge and what is still needed, by the public rules. Badges go up automatically."""
    level: int
    next_level: int | None
    checks: list[RuleCheck]
    verified: int  # verified jobs in this skill, across all teams
    paused_reason: str  # the Team Leader paused the next promotion, with this reason


class BadgeChange(BaseModel):
    kind: Literal["auto", "lowered", "paused"]
    old_level: int
    new_level: int
    reason: str
    created_at: datetime


class MemberOut(BaseModel):
    person: PersonOut
    level: int
    evidence: Evidence
    open_jobs: int
    jobs_30d: int = 0  # jobs given to them in the last 30 days (fairness view)
    active_jobs: int = 0  # jobs in hand now (any team)
    job_limit: int = 1  # how many they may hold at once (badge and weekly hours)
    progress: Progress | None = None
    last_change: BadgeChange | None = None


class LevelIn(BaseModel):
    level: int = Field(ge=1, le=5)  # lower only: badges go up by the rules
    reason: str = Field(min_length=3, max_length=300)


class PauseIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class ShareRow(BaseModel):
    person: PersonOut
    level: int
    jobs_30d: int


class MyTeamStatus(BaseModel):
    """For a member: their progress in one team, the last badge change, and how jobs were shared."""
    team_id: str
    progress: Progress
    last_change: BadgeChange | None
    sharing: list[ShareRow]


class TeamOut(BaseModel):
    team: PodOut
    members: list[MemberOut]
    clients: list[PersonOut]


class InviteOut(BaseModel):
    code: str


# ---------- agreement and jobs ----------

class Reference(BaseModel):
    link: str = Field(max_length=500)
    note: str = Field(default="", max_length=200)
    kind: Literal["like", "not_like"] = "like"


class JobIn(BaseModel):
    skill: str
    title: str = Field(default="", max_length=120)
    deliverables: list[str] = Field(default_factory=list, max_length=10)
    done_when: list[str] = Field(default_factory=list, max_length=10)
    details: dict[str, str] = Field(default_factory=dict)
    references: list[Reference] = Field(default_factory=list, max_length=6)
    deadline_days: int = 0
    budget_minor: int = 0
    currency: str = Field(default="USD", min_length=3, max_length=3)
    revisions: int = 1
    allow_ai: bool = False
    send_to_anchor: str | None = None  # an Anchor the client is linked with; empty = open to all Anchors


class AnchorJobIn(JobIn):
    """The Anchor writes the agreement for one of their clients."""
    client_id: str


class ChangesIn(BaseModel):
    note: str = Field(min_length=3, max_length=1000)


class AmendIn(BaseModel):
    deadline_days: int = Field(ge=1, le=90)
    budget_minor: int = Field(ge=1)
    note: str = Field(min_length=3, max_length=500)


class PendingChange(BaseModel):
    deadline_days: int
    budget_minor: int
    note: str


class Amendment(BaseModel):
    field: Literal["deadline_days", "budget_minor"]
    old: int
    new: int
    note: str
    at: str


class Problem(BaseModel):
    field: str
    code: str
    index: int | None = None
    words: list[str] | None = None
    minimum: int | None = None


class CheckOut(BaseModel):
    ok: bool
    problems: list[Problem]


class MoneySplit(BaseModel):
    """The member's share follows their badge for this job; before a member is chosen it isn't known yet."""
    junior: int
    anchor: int  # the checker (Team Leader)
    platform: int
    level: int | None
    junior_pct: int | None
    anchor_pct: int | None
    platform_pct: int


class JobOut(BaseModel):
    id: str
    skill: str
    title: str
    deliverables: list[str]
    done_when: list[str]
    details: dict[str, str]
    references: list[Reference]
    deadline_days: int
    budget_minor: int
    currency: str
    revisions: int
    allow_ai: bool
    state: JobState
    change_note: str  # the client's "please change" note while the agreement is a draft
    agreed_at: datetime | None
    pending_change: PendingChange | None  # an amendment waiting for the client
    amendments: list[Amendment]
    supervision_level: int | None
    junior_accepted_at: datetime | None
    created_at: datetime
    due_at: datetime | None  # agreed date + deadline days; None before agreement
    payment: Literal["unpaid", "held", "paid_out"]  # demo payment, no real money
    paid_at: datetime | None
    paid_out_at: datetime | None
    client: PersonOut  # for juniors: only the client's country
    anchor: PersonOut | None
    junior: PersonOut | None
    split: MoneySplit


class ItemResult(BaseModel):
    item: str
    status: Literal["looks_done", "needs_work", "cant_tell"]
    comment: str


class FirstCheck(BaseModel):
    source: Literal["ai", "offline"]
    read_from: Literal["github", "google_doc", "pasted", "note_only"]
    link_note: Literal["unsupported", "unreadable"] | None = None
    items: list[ItemResult]
    done_count: int
    total: int
    to_fix: list[str]
    good: list[str]
    anchor_examples: list[str]
    summary: str


class SubmissionOut(BaseModel):
    id: str
    job_id: str
    link: str
    content: str
    note: str
    check: FirstCheck
    status: Literal["waiting", "sent_back", "approved"]
    anchor_note: str
    created_at: datetime
    decided_at: datetime | None


class ApplyIn(BaseModel):
    note: str = Field(default="", max_length=600)
    video_link: str = Field(default="", max_length=500)  # required for Mentors


class ChooseIn(BaseModel):
    application_id: str


ApplicationStatus = Literal["waiting", "chosen", "not_chosen"]


class ApplicationOut(BaseModel):
    """What the client sees about someone who applied for their open job."""
    id: str
    status: ApplicationStatus
    note: str
    video_link: str
    created_at: datetime
    applicant: PersonOut
    role: Literal["anchor", "junior"]
    team_name: str
    level: int | None  # Mentors only: their badge in that team
    signed_jobs: int  # verified jobs: the Mentor's own, or the Team Leader's team's
    profile_slug: str | None  # Mentors only: their public Work Record


class JobDetail(BaseModel):
    job: JobOut
    submissions: list[SubmissionOut]  # newest first
    my_application: ApplicationStatus | None = None  # for an Anchor or Mentor who applied
    applications: list[ApplicationOut] = Field(default_factory=list)  # the client's open job only


class RoomTaskOut(BaseModel):
    id: str
    title: str
    due_date: str
    done: bool
    done_at: datetime | None


class RoomFileOut(BaseModel):
    id: str
    label: str
    link: str
    added_by: str  # the person's name
    created_at: datetime


class RoomOut(BaseModel):
    """The job's shared room. The client sees tasks and the deadline; files stay between member and Leader."""
    role: Literal["member", "leader", "client"]
    can_edit: bool
    due_at: datetime | None
    tasks: list[RoomTaskOut]
    files: list[RoomFileOut]


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    due_date: str = Field(default="", max_length=10)


class TaskPatch(BaseModel):
    done: bool | None = None
    title: str | None = Field(default=None, max_length=160)
    due_date: str | None = Field(default=None, max_length=10)


class FileIn(BaseModel):
    label: str = Field(default="", max_length=120)
    link: str = Field(min_length=9, max_length=500)


class AssignIn(BaseModel):
    junior_id: str


class SubmitIn(BaseModel):
    link: str = Field(default="", max_length=500)
    content: str = Field(default="", max_length=20000)
    note: str = Field(default="", max_length=1000)


class SendBackIn(BaseModel):
    note: str = Field(min_length=3, max_length=1000)


class AnswerIn(BaseModel):
    accept: bool


class AcceptIn(BaseModel):
    show_client: bool = False  # show the business name and work link on the public logbook


# ---------- desks ----------

class TeamMoney(BaseModel):
    """Demo money for the team in one currency. Nothing real is paid."""
    currency: str
    paid_out_minor: int  # budgets of accepted jobs
    held_minor: int  # paid by clients, waiting for them to accept the work
    anchor_minor: int  # the Leader's 10% of what was paid out
    jobs_paid: int


class MemberEarning(BaseModel):
    person: PersonOut
    currency: str
    amount_minor: int  # the member's 75% of their accepted jobs
    jobs: int


class MyMoney(BaseModel):
    currency: str
    paid_out_minor: int
    held_minor: int  # the member's share of jobs paid but not accepted yet


class DeskOut(BaseModel):
    team: PodOut
    waiting_review: list[JobDetail]
    agreements: list[JobOut]  # not agreed yet: drafts, waiting for the client, sent by a client
    to_assign: list[JobOut]
    open_jobs: list[JobOut]  # posted by clients for this skill, client hasn't chosen yet
    join_requests: int
    with_clients: int
    deadlines: list[JobOut] = Field(default_factory=list)  # active jobs, soonest due first
    supervising: int = 0  # jobs the Leader supervises now
    supervise_limit: int = 8
    money: list[TeamMoney] = Field(default_factory=list)
    member_earnings: list[MemberEarning] = Field(default_factory=list)


class JuniorHome(BaseModel):
    profile_complete: bool
    teams: list[PodOut]
    levels: dict[str, int]  # team id -> level
    jobs: list[JobOut]
    open_teams: int
    log_entries: int
    profile_slug: str
    open_jobs: list[JobOut] = Field(default_factory=list)  # Mentors only: client jobs they may apply for
    earnings: list[MyMoney] = Field(default_factory=list)
    team_status: list[MyTeamStatus] = Field(default_factory=list)
    active_jobs: int = 0  # jobs in hand now
    job_limit: int = 1  # how many at once (the highest badge across teams, and weekly hours)


class ClientHome(BaseModel):
    anchors: list[PersonOut]
    to_agree: list[JobOut]  # agreements or changes waiting for the client's answer
    to_choose: list[JobOut] = Field(default_factory=list)  # open jobs with people waiting to be chosen
    ready: list[JobDetail]
    in_progress: list[JobOut]
    done: list[JobOut]


class NoteIn(BaseModel):
    text: str = Field(min_length=3, max_length=1000)


class NoteOut(BaseModel):
    id: str
    text: str
    source: Literal["added", "send_back", "seed"]
    created_at: datetime


class NotificationOut(BaseModel):
    id: str
    kind: str
    ref: str
    read: bool
    created_at: datetime


# ---------- logbook ----------

class LogEntryOut(BaseModel):
    id: str
    credential: dict
    signature_b64: str
    key_id: str
    issued_at: datetime
    valid: bool


class LogbookOut(BaseModel):
    display_name: str
    teams: list[PodOut]
    levels: dict[str, int]  # skill -> level
    entries: list[LogEntryOut]
