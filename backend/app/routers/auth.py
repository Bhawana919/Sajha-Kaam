"""Sign in and sign up. Sample people are one tap away in DEMO_MODE only."""

import time

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import check_password, current_user, decode, hash_password, issue_tokens
from app.config import settings
from app.db import get_session
from app.models import Pod, User
from app.schemas import LoginIn, MeOut, RefreshIn, RegisterIn, SampleIdentity, SampleLoginIn, SettingsIn, Tokens
from app.services import agreement, work

router = APIRouter(prefix="/v1", tags=["auth"])
ROLE_ORDER = {"anchor": 0, "junior": 1, "client": 2, "reviewer": 3}
DEMO_DOMAIN = "@demo.sajhakaam"

# Wrong passwords: at most 5 tries per email in 10 minutes, then wait. Kept in memory: one server.
TRIES, WINDOW_S = 5, 600
_failed: dict[str, list[float]] = {}


def _recent_failures(email: str) -> list[float]:
    now = time.monotonic()
    kept = [t for t in _failed.get(email, []) if now - t < WINDOW_S]
    _failed[email] = kept
    return kept


def me_out(u: User) -> MeOut:
    return MeOut(id=u.id, role=u.role, display_name=u.display_name, headline=u.headline, country=u.country,
                 profile_slug=u.profile_slug, ai_helper=u.ai_helper,
                 leader_verified=u.leader_verified)


@router.get("/auth/samples", response_model=list[SampleIdentity])
def samples(session: Session = Depends(get_session)) -> list[SampleIdentity]:
    if not settings().demo_mode:
        return []
    users = sorted(session.exec(select(User).where(User.email.endswith("@demo.sajhakaam"))).all(),
                   key=lambda u: (ROLE_ORDER[u.role], u.display_name))
    return [SampleIdentity(user_id=u.id, display_name=u.display_name, role=u.role, headline=u.headline) for u in users]


@router.post("/auth/sample-login", response_model=Tokens)
def sample_login(body: SampleLoginIn, session: Session = Depends(get_session)) -> dict:
    user = session.get(User, body.user_id) if settings().demo_mode else None
    if user is None or not user.email.endswith("@demo.sajhakaam"):
        raise HTTPException(404, "unknown_sample")
    return issue_tokens(user)


@router.post("/auth/register", response_model=Tokens, status_code=201)
def register(body: RegisterIn, session: Session = Depends(get_session)) -> dict:
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(422, "bad_email")
    if email.endswith(DEMO_DOMAIN):
        raise HTTPException(422, "bad_email")  # demo addresses sign in with one tap: nobody may sign up as one
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "email_taken")
    if body.role == "anchor" and (len(body.team_name.strip()) < 3 or body.team_skill not in agreement.skills()):
        raise HTTPException(422, "team_required")
    user = User(role=body.role, email=email, password_hash=hash_password(body.password),
                display_name=body.display_name.strip(), headline=body.headline.strip(), country=body.country.strip())
    session.add(user)
    session.flush()
    if body.role == "anchor":
        session.add(Pod(anchor_id=user.id, name=body.team_name.strip(), skill=body.team_skill))
    if body.role == "client" and body.invite_code.strip():
        work.use_invite(session, body.invite_code, user)
    session.commit()
    return issue_tokens(user)


@router.post("/auth/login", response_model=Tokens)
def login(body: LoginIn, session: Session = Depends(get_session)) -> dict:
    email = body.email.strip().lower()
    if len(_recent_failures(email)) >= TRIES:
        raise HTTPException(429, "too_many_tries")
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None or not check_password(body.password, user.password_hash):
        _failed.setdefault(email, []).append(time.monotonic())
        raise HTTPException(401, "wrong_email_or_password")
    _failed.pop(email, None)
    return issue_tokens(user)


@router.post("/auth/refresh", response_model=Tokens)
def refresh(body: RefreshIn, session: Session = Depends(get_session)) -> dict:
    user = session.get(User, decode(body.refresh_token, "refresh")["sub"])
    if user is None:
        raise HTTPException(401, "account not found")
    return issue_tokens(user)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(current_user)) -> MeOut:
    return me_out(user)


@router.put("/me/settings", response_model=MeOut)
def update_settings(body: SettingsIn, user: User = Depends(current_user),
                    session: Session = Depends(get_session)) -> MeOut:
    if user.role != "anchor":
        raise HTTPException(403, "only anchor can do this")
    user.ai_helper = body.ai_helper
    session.add(user)
    session.commit()
    session.refresh(user)
    return me_out(user)
