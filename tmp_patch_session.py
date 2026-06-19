from pathlib import Path

p = Path('backend/core/session.py')
text = p.read_text()

# Patch 1: remove silent started_at update
old1 = """        # Persist started_at to DB so end_session can compute duration reliably
        try:
            self.db.update_session(session_id, started_at=started_at)
        except Exception:
            pass
        self._sessions[session_id] = session_data"""
new1 = """        # Persist started_at to DB so end_session can compute duration reliably
        self.db.update_session(session_id, started_at=started_at, turn_count=session_data.get("turn_count", 1))
        self._sessions[session_id] = session_data"""
if old1 not in text:
    raise SystemExit('patch1 not found')
text = text.replace(old1, new1)

# Patch 2: add fallback load from DB when cache missed
old2 = """        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f\"Session not found: {session_id}\")"""
new2 = """        session = self._sessions.get(session_id)
        if not session:
            # Fallback: load session from DB so Render restarts dont break ended sessions
            user_sessions = self.db.get_user_sessions(user_id, limit=100)
            for s in user_sessions:
                if s.get(\"session_id\") == session_id:
                    session = s
                    break
            if not session:
                raise ValueError(f\"Session not found: {session_id}\")"""
if old2 not in text:
    raise SystemExit('patch2 not found')
text = text.replace(old2, new2)

p.write_text(text)
print('patched')