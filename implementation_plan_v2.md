# Implementation Plan — Yentellect SaaS UI/UX Overhaul

**Overview:** Transform Yentellect from a bare-bones auth-gated app into a full SaaS experience where users land on a personalized dashboard after login, can explore their cognitive data through rich visualizations, and understand the value of the data their sessions generate.

**Scope:** This plan covers 6 new pages/views, 7 new/rewritten components, a new app-shell layout for authenticated users, backend endpoints for aggregated metrics, and a complete design system alignment. The product generates cognitive mode classifications, knowledge graphs, signal vectors, session transcripts, and progress scores — none of this data is currently surfaced in a way users can understand or act on.

**Design Direction (from frontend-design skill):**
- **Signature element:** The "Cognitive Fingerprint" — a hexagonal radar chart unique to each user that shows their 6 thinking mode scores. This is the single memorable visual that makes Yentellect feel like *your* brain.
- **Color-as-data:** Each of the 6 modes has a distinct color (blue=CONVERGENT, purple=DIVERGENT, amber=ANALOGICAL, emerald=METACOGNITIVE, red=SYSTEMS, indigo=DMN). All data visualizations use these colors to make mode data instantly legible.
- **The "Thinking Gym" metaphor** — session history is a workout log, progress is strength gains, weakest mode is the muscle group you're training.
- **Dark UI with glass hierarchy** — maintain the existing dark theme but use depth (opacity, blur, shadow) to create information hierarchy. Data sits on glass cards. Metrics are monumental type.
- **Typography:** Inter for UI, JetBrains Mono for data numbers. Set data-heavy values in 2-3x body size to make them feel significant.

---

## [Types]

**New frontend types for API responses and component props.**

```typescript
// frontend/lib/api.ts — additional types

export interface ModeScore {
  mode: ThinkingMode;
  label: string;
  score: number;           // 0-100 normalized
  color: string;
  sessions: number;
}

export interface CognitiveFingerprint {
  user_id: string;
  scores: ModeScore[];     // all 6 modes with scores
  dominant: ThinkingMode;
  weakest: ThinkingMode;
  improvement_rate: number; // % change over last 10 sessions
  total_sessions: number;
  total_concepts: number;
  total_connections: number;
  domains: string[];
}

export interface SessionSummary {
  session_id: string;
  created_at: string;
  mode_target: ThinkingMode;
  modes_activated: string[];
  overall_score: number;
  concepts_added: number;
  bridges_formed: number;
  duration_minutes: number;
  turn_count: number;
}

export interface DashboardData {
  fingerprint: CognitiveFingerprint;
  recent_sessions: SessionSummary[];
  daily_suggestion: {
    suggested_mode: ThinkingMode;
    reason: string;
  };
  streak_days: number;
  last_session_date: string | null;
}
```

---

## [Files]

**New files, modified files, and deleted files.**

### New Files to Create

| File | Purpose |
|------|---------|
| `frontend/app/dashboard/page.tsx` | Post-login home: fingerprint, recent sessions, training suggestion |
| `frontend/app/history/page.tsx` | Searchable/filterable session history list |
| `frontend/app/settings/page.tsx` | Account settings: name, email, avatar, link accounts |
| `frontend/components/AppShell.tsx` | Authenticated layout with sidebar + top nav |
| `frontend/components/CognitiveFingerprint.tsx` | Hexagonal radar chart component showing 6 mode scores |
| `frontend/components/SessionCard.tsx` | Reusable card for a single session summary |
| `frontend/components/ModeBadge.tsx` | Small colored pill/badge for a mode name |
| `frontend/components/CognitiveTimeline.tsx` | Horizontal timeline of mode scores across sessions |
| `frontend/components/DomainExplorer.tsx` | Interactive knowledge graph with clickable domains |
| `frontend/app/api/fingerprint/route.ts` | API route aggregating fingerprint data |
| `frontend/app/api/history/route.ts` | API route for session history with pagination |
| `frontend/lib/cn.ts` | Utility for className merging (if not already present) |

### Modified Files

| File | Change |
|------|--------|
| `frontend/app/layout.tsx` | Root layout stays as-is (SupabaseProvider + AuthGuard). The AppShell handles auth layout internally. |
| `frontend/middleware.ts` | Add `/dashboard`, `/history`, `/settings` to protected routes (currently only `/session` and `/profile` are protected) |
| `frontend/components/Header.tsx` | After login, show a different header that links to dashboard/profile/history/settings and includes user avatar |
| `frontend/lib/api.ts` | Add new API functions: `getDashboard()`, `getFingerprint()`, `getSessionHistory()` |
| `frontend/app/session/page.tsx` | After session ends, redirect to dashboard instead of just showing modal |
| `frontend/app/page.tsx` | When user is logged in, redirect to `/dashboard` |
| `frontend/app/profile/page.tsx` | Complete redesign with fingerprint, domain explorer, timeline |
| `frontend/next.config.js` | Add image domains for avatars |

---

## [Functions]

### Backend API — New Routes

| Function | Route | File | Purpose |
|----------|-------|------|---------|
| `get_dashboard` | `GET /dashboard/{user_id}` | `backend/api/routes/dashboard.py` | Aggregated dashboard: fingerprint + recent sessions + suggestion |
| `get_fingerprint` | `GET /fingerprint/{user_id}` | `backend/api/routes/dashboard.py` | Compute cognitive fingerprint from session history |
| `get_session_history` | `GET /history/{user_id}` | `backend/api/routes/dashboard.py` | Paginated session history with filters |

```python
# GET /dashboard/{user_id}
{
  "fingerprint": {
    "scores": [{"mode": "CONVERGENT", "score": 72}, ...],
    "dominant": "CONVERGENT",
    "weakest": "DMN",
    "improvement_rate": 0.12,
    "total_sessions": 23,
    "total_concepts": 47,
    "total_connections": 89,
    "domains": ["programming", "psychology", "physics"]
  },
  "recent_sessions": [...],
  "daily_suggestion": {
    "suggested_mode": "DIVERGENT",
    "reason": "Has been 4 sessions since divergent training"
  }
}
```

### Frontend — New Functions (in `lib/api.ts`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getDashboard` | `(userId: string): Promise<DashboardData>` | Fetch dashboard data |
| `getSessionHistory` | `(userId: string, page: number, limit: number): Promise<{sessions: SessionSummary[], total: number}>` | Paginated history |

### Frontend — Modified Functions

| Function | File | Change |
|----------|------|--------|
| `middleware` | `frontend/middleware.ts` | Add `/dashboard`, `/history`, `/settings` as protected routes |

---

## [Classes]

### New Components

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `AppShell` | `frontend/components/AppShell.tsx` | `{ children: ReactNode }` | Sidebar + top bar layout for authenticated pages. Sidebar has: Dashboard, Sessions, Profile, History, Settings. Top bar has: breadcrumbs, user avatar with dropdown. |
| `CognitiveFingerprint` | `frontend/components/CognitiveFingerprint.tsx` | `{ scores: ModeScore[], size?: number }` | Hexagonal SVG radar chart. 6 axes (one per mode). Colored polygon overlay. Mode labels at each vertex. Score value displayed near each vertex. Animated on entrance. |
| `SessionCard` | `frontend/components/SessionCard.tsx` | `{ session: SessionSummary, onClick?: () => void }` | Glass card showing: date, target mode badge, overall score (colored), modes activated as colored dots, duration, concepts added. |
| `ModeBadge` | `frontend/components/ModeBadge.tsx` | `{ mode: ThinkingMode, size?: "sm" | "md" | "lg" }` | Small colored pill with mode name, colored dot, and background tint. |
| `CognitiveTimeline` | `frontend/components/CognitiveTimeline.tsx` | `{ sessions: SessionSummary[] }` | Horizontal scrollable timeline. Each entry is a vertical line with a dot colored by the dominant mode, score shown as a small bar chart. |
| `DomainExplorer` | `frontend/components/DomainExplorer.tsx` | `{ graphData: D3GraphData }` | Enhanced knowledge graph with clickable domain clusters, zoom/pan, concept names on hover. |

---

## [Dependencies]

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | already present | Radar chart for cognitive fingerprint (Recharts has `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`) |
| `d3` | already present | Knowledge graph, timeline |

No new npm packages needed. All dependencies are already in `package.json`.

---

## [Testing]

**Manual validation plan:**

1. Create account → redirected to `/dashboard`
2. Dashboard shows: fingerprint radar chart, recent sessions list, training suggestion card
3. Click "New Session" → session page works
4. End session → redirected to dashboard with updated data
5. Check profile → fingerprint, mode cards, domain explorer all load
6. Check history → paginated list of all sessions, filterable by mode
7. Check settings → change name, update email
8. Mobile responsive: sidebar collapses, dashboard grid stacks

---

## [Implementation Order]

1. Create backend routes: `GET /dashboard/{user_id}`, `GET /fingerprint/{user_id}`, `GET /history/{user_id}`
2. Add new API functions to `frontend/lib/api.ts`
3. Create `AppShell` component (sidebar + top nav layout)
4. Create `CognitiveFingerprint` (radar chart) component
5. Create `SessionCard` and `ModeBadge` components
6. Create `CognitiveTimeline` component
7. Create `DomainExplorer` component
8. Build `/dashboard` page
9. Rewrite `/profile` page with new components
10. Build `/history` page
11. Build `/settings` page
12. Update middleware to protect new routes
13. Update `page.tsx` to redirect logged-in users to dashboard
14. Update session page end-flow to redirect to dashboard
15. Polish: responsive, animations, loading states, empty states