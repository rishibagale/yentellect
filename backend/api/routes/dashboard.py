"""Dashboard and analytics API routes for the cognitive profile."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ...db.database import DatabaseManager

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
db = DatabaseManager()

MODE_COLORS = {
    "CONVERGENT": "#3B82F6",
    "DIVERGENT": "#8B5CF6",
    "ANALOGICAL": "#F59E0B",
    "METACOGNITIVE": "#10B981",
    "SYSTEMS": "#EF4444",
    "DMN": "#6366F1",
}


@router.get("/{user_id}")
async def get_dashboard(user_id: str):
    """Aggregated dashboard: fingerprint + recent sessions + training suggestion."""
    try:
        # Get user and sessions
        user = db.get_user(user_id)
        if not user:
            return {
                "fingerprint": None,
                "recent_sessions": [],
                "daily_suggestion": {
                    "suggested_mode": "CONVERGENT",
                    "reason": "Start your first session to begin cognitive training."
                },
                "streak_days": 0,
                "last_session_date": None,
            }

        sessions = db.get_user_sessions(user_id, limit=50)
        metrics = db.get_session_metrics(user_id, limit=20)

        # Build fingerprint from metrics
        all_scores = _compute_mode_scores(sessions, metrics)
        fingerprint = _build_fingerprint(user, all_scores, metrics)

        # Recent sessions (last 5)
        recent = _build_recent_sessions(sessions, metrics)

        # Daily suggestion
        suggestion = _get_daily_suggestion(fingerprint, sessions)

        return {
            "fingerprint": fingerprint,
            "recent_sessions": recent,
            "daily_suggestion": suggestion,
            "streak_days": _compute_streak(metrics),
            "last_session_date": _get_last_session_date(metrics),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fingerprint/{user_id}")
async def get_fingerprint(user_id: str):
    """Get the cognitive fingerprint (6 mode scores)."""
    try:
        user = db.get_user(user_id)
        if not user:
            return {
                "user_id": user_id,
                "scores": [],
                "dominant": None,
                "weakest": None,
                "improvement_rate": 0,
                "total_sessions": 0,
                "total_concepts": 0,
                "total_connections": 0,
                "domains": [],
            }

        sessions = db.get_user_sessions(user_id, limit=50)
        metrics = db.get_session_metrics(user_id, limit=20)
        all_scores = _compute_mode_scores(sessions, metrics)

        # Get concepts for domain info
        concepts = db.get_user_concepts(user_id)
        edges = db.get_user_edges(user_id)
        domains = list(set(c["domain"] for c in concepts)) if concepts else []

        # Determine dominant/weakest
        sorted_modes = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
        dominant = sorted_modes[0][0] if sorted_modes else None
        weakest = sorted_modes[-1][0] if sorted_modes else None

        # Improvement rate
        improvement_rate = _compute_improvement_rate(metrics)

        return {
            "user_id": user_id,
            "scores": [
                {
                    "mode": mode,
                    "label": mode.capitalize(),
                    "score": round(score),
                    "color": MODE_COLORS.get(mode, "#6B7280"),
                    "sessions": sum(1 for m in metrics if m.get("modes_activated") and mode in m["modes_activated"]),
                }
                for mode, score in sorted_modes
            ],
            "dominant": dominant,
            "weakest": weakest,
            "improvement_rate": round(improvement_rate, 3),
            "total_sessions": user.get("session_count", 0),
            "total_concepts": len(concepts) if concepts else 0,
            "total_connections": len(edges) if edges else 0,
            "domains": domains[:10],  # Top 10 domains
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{user_id}")
async def get_session_history(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Paginated session history."""
    try:
        sessions = db.get_user_sessions(user_id, limit=limit * page)
        metrics = db.get_session_metrics(user_id, limit=limit * page)

        # Build session list
        session_list = _build_recent_sessions(sessions, metrics)

        # Paginate
        start = (page - 1) * limit
        paginated = session_list[start:start + limit]

        return {
            "sessions": paginated,
            "total": len(session_list),
            "page": page,
            "limit": limit,
            "has_more": start + limit < len(session_list),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _compute_mode_scores(sessions: list, metrics: list) -> dict:
    """Compute average scores for each thinking mode from session metrics."""
    mode_scores: dict = {}
    mode_counts: dict = {}

    for m in metrics:
        mode_scores_raw = m.get("mode_scores", "{}")
        if isinstance(mode_scores_raw, str):
            try:
                import json
                mode_scores_raw = json.loads(mode_scores_raw)
            except (json.JSONDecodeError, TypeError):
                continue

        if isinstance(mode_scores_raw, dict):
            for mode, score in mode_scores_raw.items():
                if isinstance(score, (int, float)):
                    mode_scores[mode] = mode_scores.get(mode, 0) + score
                    mode_counts[mode] = mode_counts.get(mode, 0) + 1

    # Default modes
    all_modes = ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"]
    result = {}
    for mode in all_modes:
        if mode in mode_scores and mode_counts.get(mode, 0) > 0:
            result[mode] = (mode_scores[mode] / mode_counts[mode]) * 100
        else:
            result[mode] = 50  # Default baseline

    return result


def _build_fingerprint(user: dict, scores: dict, metrics: list) -> dict:
    """Build cognitive fingerprint dict."""
    sorted_modes = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    dominant = sorted_modes[0][0] if sorted_modes else None
    weakest = sorted_modes[-1][0] if sorted_modes else None

    concepts = 0
    connections = 0
    for m in metrics:
        concepts += m.get("concepts_added", 0) or 0
        connections += m.get("bridges_formed", 0) or 0

    return {
        "scores": [
            {"mode": mode, "score": round(score), "color": MODE_COLORS.get(mode, "#6B7280")}
            for mode, score in sorted_modes
        ],
        "dominant": dominant,
        "weakest": weakest,
        "improvement_rate": round(_compute_improvement_rate(metrics), 3),
        "total_sessions": user.get("session_count", 0),
        "total_concepts": concepts,
        "total_connections": connections,
    }


def _build_recent_sessions(sessions: list, metrics: list) -> list:
    """Build session summary list from sessions + metrics."""
    metric_map = {}
    for m in metrics:
        metric_map[m["session_id"]] = m

    result = []
    for s in sessions[:20]:  # Last 20
        m = metric_map.get(s["session_id"])
        if not m:
            continue

        import json
        modes_raw = m.get("modes_activated", "[]")
        if isinstance(modes_raw, str):
            try:
                modes_raw = json.loads(modes_raw)
            except (json.JSONDecodeError, TypeError):
                modes_raw = []

        result.append({
            "session_id": s["session_id"],
            "created_at": s.get("created_at", ""),
            "mode_target": s.get("mode_target", ""),
            "modes_activated": modes_raw if isinstance(modes_raw, list) else [],
            "overall_score": m.get("overall_score", 0) or 0,
            "concepts_added": m.get("concepts_added", 0) or 0,
            "bridges_formed": m.get("bridges_formed", 0) or 0,
            "duration_minutes": (m.get("session_duration_seconds", 0) or 0) // 60,
            "turn_count": s.get("turn_count", 0),
        })

    return result


def _get_daily_suggestion(fingerprint: dict, sessions: list) -> dict:
    """Get the training suggestion for today."""
    # If no sessions, suggest starting
    if fingerprint.get("total_sessions", 0) == 0:
        return {
            "suggested_mode": "CONVERGENT",
            "reason": "Ready for your first session? Let's start with convergent thinking to establish a baseline."
        }

    weakest = fingerprint.get("weakest")
    if weakest:
        return {
            "suggested_mode": weakest,
            "reason": f"Your weakest mode is {weakest.capitalize()}. Training this will improve your overall cognitive balance."
        }

    return {
        "suggested_mode": fingerprint.get("scores", [{"mode": "CONVERGENT"}])[0]["mode"],
        "reason": "Continue building on your strengths.",
    }


def _compute_improvement_rate(metrics: list) -> float:
    """Compute improvement rate between first and last sessions."""
    if len(metrics) < 2:
        return 0.0

    scores = [m.get("overall_score", 0) or 0 for m in reversed(metrics)]
    if len(scores) < 2:
        return 0.0

    first_half = scores[:len(scores)//2]
    second_half = scores[len(scores)//2:]

    avg_first = sum(first_half) / len(first_half) if first_half else 0
    avg_second = sum(second_half) / len(second_half) if second_half else 0

    if avg_first > 0:
        return (avg_second - avg_first) / avg_first
    return 0.0


def _compute_streak(metrics: list) -> int:
    """Compute consecutive days with sessions."""
    if not metrics:
        return 0

    from datetime import datetime, timedelta
    dates = []
    for m in metrics:
        created = m.get("created_at", "")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                dates.append(dt.date())
            except (ValueError, AttributeError):
                pass

    if not dates:
        return 0

    dates = sorted(set(dates), reverse=True)
    streak = 1
    for i in range(1, len(dates)):
        if (dates[i-1] - dates[i]).days == 1:
            streak += 1
        else:
            break

    return streak


def _get_last_session_date(metrics: list) -> Optional[str]:
    """Get the date of the most recent session."""
    if not metrics:
        return None
    return metrics[0].get("created_at", None)