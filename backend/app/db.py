"""The database: SQLite on a laptop (and in tests), Postgres when hosted (Neon's free plan).

DATABASE_URL picks it. A Postgres link as Neon or any host gives it (postgres://… or postgresql://…)
is used as it is, with the psycopg driver.
"""

from collections.abc import Iterator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from app import models  # noqa: F401  (registers tables)
from app.config import settings


def _url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _url(settings().database_url)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _sqlite_speed(dbapi_conn, _record) -> None:
        """Write-ahead log: each save no longer waits for the disk, which keeps the demo fast."""
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()
else:
    # A free Postgres sleeps when idle and drops idle connections: check each one before use.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5, pool_recycle=300)


def init_db(reset: bool = False) -> None:
    """Create the tables. `reset` drops everything first: for tests and a laptop only (demo reset
    removes only the demo people, see app.seed.reset_demo)."""
    if reset:
        SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
