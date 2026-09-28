from sqlalchemy import text

def add_missing_columns(engine):
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP WITHOUT TIME ZONE;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR;"))
        except Exception:
            pass
