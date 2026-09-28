from app.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;"))
        conn.execute(text("ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS is_baseline INTEGER DEFAULT 0;"))
    print("Added columns successfully.")
except Exception as e:
    print(f"Error altering table: {e}")
