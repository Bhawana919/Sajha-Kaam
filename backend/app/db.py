"""The database: SQLite on a laptop (and in tests), Postgres when hosted (Neon's free plan).

DATABASE_URL picks it. A Postgres link as Neon or any host gives it (postgres://… or postgresql://…)
is used as it is, with the psycopg driver.
"""

from collections.abc import Iterator

from sqlalchemy import Boolean, Integer, String, event, inspect, text
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
    added = add_missing_columns(engine)
    if "users.leader_verified" in added:
        # Leaders who were on Sajha Kaam before verification existed were checked when they joined.
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET leader_verified = :t WHERE role = 'anchor'"), {"t": True})


def add_missing_columns(eng) -> list[str]:
    """create_all makes new tables but never new columns; add those (with a safe default) so a hosted
    database keeps working when a model gains a field. Returns 'table.column' for each one added."""
    insp, added = inspect(eng), []
    sqlite = eng.dialect.name == "sqlite"
    with eng.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have:
                    continue
                kind = col.type.compile(dialect=eng.dialect)
                if isinstance(col.type, Boolean):
                    default = " DEFAULT " + ("0" if sqlite else "FALSE")
                elif isinstance(col.type, Integer):
                    default = " DEFAULT 0"
                elif isinstance(col.type, String) and not col.nullable:
                    default = " DEFAULT ''"
                else:  # JSON, dates and optional fields start empty
                    default = ""
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {kind}{default}'))
                added.append(f"{table.name}.{col.name}")
    return added


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
