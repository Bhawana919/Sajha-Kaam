"""Wallet: balance and demo withdrawals (eSewa, Khalti, bank) for members and Team Leaders."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import require_role
from app.db import get_session
from app.models import User
from app.schemas import WalletBalance, WalletOut, WithdrawalOut, WithdrawIn
from app.services import wallet

router = APIRouter(prefix="/v1", tags=["wallet"])
earner = require_role("anchor", "junior")


def _out(session: Session, user: User) -> WalletOut:
    return WalletOut(balances=[WalletBalance(**b) for b in wallet.balances(session, user)],
                     withdrawals=[WithdrawalOut(id=w.id, amount_minor=w.amount_minor, currency=w.currency, method=w.method,
                                                account=w.account, status=w.status, created_at=w.created_at)
                                  for w in wallet.history(session, user)])


@router.get("/wallet", response_model=WalletOut)
def get_wallet(user: User = Depends(earner), session: Session = Depends(get_session)) -> WalletOut:
    return _out(session, user)


@router.post("/wallet/withdraw", response_model=WalletOut, status_code=201)
def withdraw(body: WithdrawIn, user: User = Depends(earner), session: Session = Depends(get_session)) -> WalletOut:
    wallet.withdraw(session, user, body.amount_minor, body.currency, body.method, body.account)
    return _out(session, user)
