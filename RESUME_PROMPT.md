# LEARNMATE AI — Session Resume & Project Context

> **Project Overview:**
> LEARNMATE is an AI-powered learning and assessment platform specialized for the **SSC JE (Staff Selection Commission Junior Engineer) Civil Engineering** exam.
> It includes an interactive student portal, full-featured mock test and PYQ practice engines, AI tutor support, advanced performance and weakness analytics with AI profiling, and a complete, production-grade Admin Control Center with zero mock/fake data.

---

## 1. Environment & Startup Instructions

### Claude CLI / Omniroute Environment Setup
```powershell
$env:CLAUDE_CONFIG_DIR = "$HOME\.claude-omniroute"
$env:ANTHROPIC_BASE_URL = "http://localhost:20128"
$env:ANTHROPIC_AUTH_TOKEN = "sk-d9538f7c28a62249-a8cad5-b7b22528"
$env:ANTHROPIC_API_KEY = ""
$env:ANTHROPIC_MODEL = "all"
```

### Freeing Ports (if needed)
```powershell
$ports = @(5710, 5171, 5172, 5173, 5174, 5175, 5176, 3000, 8000, 8001, 8002, 8003, 8004)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pidToKill = $c.OwningProcess
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}
```

### Backend Startup (Port 8002)
```powershell
cd C:\Users\ELYSIUM\Documents\VSCODE\learnmate\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8002 --reload
```
- API Docs: `http://localhost:8002/docs`
- Health check: `http://localhost:8002/api/v1/health`

### Frontend Startup (Port 5173)
```powershell
cd C:\Users\ELYSIUM\Documents\VSCODE\learnmate\frontend
npm run dev -- --port 5173
```
- Web Application: `http://localhost:5173`
- Admin Panel: `http://localhost:5173/admin`
- Configured API Base: `http://localhost:8002/api/v1` (set in `frontend/.env`)

---

## 2. Architecture & Tech Stack

- **Backend:** FastAPI, Python 3.11+, SQLAlchemy 2.0 (PostgreSQL via `psycopg3`), Pydantic v2, Passlib/Bcrypt, Uvicorn.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router DOM v6, Axios.
- **Database:** PostgreSQL (supports local Postgres, Neon serverless, and Supabase via NullPool / connection pooling).
- **AI Integrations:** Google Gemini (`gemini-flash-latest`) for AI candidate profiling, study planning, mistake explanation, question extraction, OCR correction, and AI tutoring.

---

## 3. Key Completed Modules & Recent Critical Integrations

### A. Progress & Performance Analytics Engine (Ported from branch `t2`)
Full-featured analytics and AI personality profiling system:
1. **Backend Analytics Endpoints (`backend/app/api/v1/endpoints/analytics.py`)**:
   - `GET /analytics/dashboard-stats`: Real-time syllabus completion %, study hours, solved PYQ count, streak tracking.
   - `GET /analytics/weekly-activity`: 7-day daily study time aggregation (test duration + question practice).
   - `GET /analytics/performance`: Overall average score, accuracy %, estimated percentile, weak topics, and strong topics.
   - `GET /analytics/progress`: Subject-wise topic completion percentages.
   - `GET /analytics/topic-progress`: Question completion breakdown by topic.
   - `GET /analytics/ai-profile`: AI candidate test-taking personality report powered by Gemini.
   - `GET /analytics/weakness-profile`: Personalized topic-level weakness metrics & trends.
   - `POST /analytics/generate-study-plan`: Personalized daily study plans based on weak areas and available study hours.
   - `POST /analytics/mistake-explanation`: Contextual AI explanations for incorrect choices.
2. **AI Personality Service (`backend/app/services/ai_personality.py`)**:
   - Integrated with Google Gemini `gemini-flash-latest` model.
   - Built-in graceful fallback logic for dev/offline mode to ensure the UI never crashes if the API key is unconfigured or rate-limited.
3. **Frontend Analytics Client (`frontend/src/api/analytics.ts`)**:
   - Added typed methods: `getAIProfile`, `getWeaknessProfile`, `generateStudyPlan`, `getMistakeExplanation`.
4. **Performance UI View (`frontend/src/collab/pages/Performance.jsx`)**:
   - Integrated AI Copilot Analysis card with pulse loader, custom gradient card styling, overall score cards, and weak/strong topic focus boxes.

### B. Scrollable Dashboard Navigation Options (Ported from branch `testing`)
1. **Sidebar Navigation Overflow & Scrollbar (`frontend/src/index.css`, `frontend/src/styles.css`, `frontend/src/collab/styles.css`)**:
   - Implemented `.sidebar nav { flex: 1; overflow-y: auto; padding-right: 8px; margin-right: -8px; }`.
   - Added custom thin webkit scrollbars (`width: 5px`, transparent track, subtle theme-aware scroll thumbs).
   - Keeps brand header and user profile pinned while enabling independent vertical scrolling on small screens/laptops.

### C. Admin Control Center (`/admin/*`)
A production-grade administrative dashboard with real server-side queries and zero fake statistics:
1. **Admin Users (`/admin/users`)**:
   - Server-side search (name/email), role filter (admin/student), active status filter, column sorting, pagination.
   - User progress side-drawer displaying real test attempt history, scores, and accuracy.
   - Activate/deactivate and toggle admin privileges with optimistic rollback and clear error boundaries.
2. **Admin Question Bank (`/admin/questions`)**:
   - Filter by subject, topic, difficulty (Easy/Medium/Hard), PYQ status, year, shift, and keyword search.
   - Question viewer modal displaying all 4-6 options (A-F) with correct answer highlighting and markdown explanation.
   - 3-step Question Ingestion with JSON format validator, conflict check, and batch creation.
3. **Admin Syllabus Hierarchy (`/admin/hierarchy`)**:
   - Subject -> Chapter -> Topic tree view with real-time question count badges.
   - Create, edit, and delete nodes with safety checks preventing orphaned child entities.
4. **Admin Mock Tests (`/admin/mock-tests`)**:
   - List, create, and manage mock tests with real question count aggregation and attempt averages.
5. **Admin Dashboard (`/admin`)**:
   - Real-time aggregate statistics: Total users, active students, question bank size, total test attempts, average score.
   - Real recent activity feed populated from test submissions.

### D. Critical SQLAlchemy 2.x `Row` Destructuring Fixes
- **File:** `backend/app/api/v1/endpoints/admin.py`
- **Root Cause of HTTP 500 / "Failed to fetch users":**
  Using `.outerjoin(...).add_columns(...)` produces SQLAlchemy `Row` tuples `(Entity, col1, ...)` rather than plain entity models. Direct attribute access like `u.id` triggered `AttributeError: id` (via internal `KeyError: 'id'`).
- **Resolved Endpoints:**
  - `get_all_users`: Unpacked `(user, total_attempts)` in list comprehension.
  - `list_questions`: Unpacked `(question, option_count)`.
  - `list_mock_tests`: Unpacked `(test, attempt_count, avg_score)`.

### E. Port Drift & Network Error Fix
- **Root Cause of "Cannot reach the API":** When port 5173 was held by background node processes, Vite silently jumped to ports 5174/5175. Because Vite dev mode bakes `VITE_API_URL` on server start, old stale dev servers were pointing to outdated or inactive backend ports.
- **Fix:** Automated cleanup script to kill processes on conflicting ports and bind cleanly to canonical ports (`8002` for FastAPI, `5173` for Vite).

### F. Modern 5-Level Dashboard Redesign & UI Integration (Ported from branch `origin/refine-ui`)
A modern, 5-level hierarchical dashboard layout with SaaS design system variables and real data binding:
1. **Level 1 — Welcome Hero & Exam Countdown**:
   - `welcome-hero` with personalized user greeting, dynamic remaining daily task counter, CTA button to textbook, and Civil engineering artwork (`frontend/src/assets/bgimg.jpg`).
   - `ExamCountdown.jsx` with real-time countdown to SSC JE Civil 2025.
2. **Level 2 — Four Key Metric Statistics**:
   - `DashboardStats.jsx` + `StatCard.jsx` showing syllabus completion %, study hours, solved PYQs, and daily streaks with circular progress rings and sparkline indicators.
3. **Level 3 & 4 (Left Column) — Learning & Performance Actionables**:
   - `ContinueLearning.jsx`: Active subject resume block with progress bar and direct links to syllabus chapters.
   - `SubjectPerformance.jsx`: Real-time subject accuracy matrix with alert callout identifying lowest-scoring subject and direct practice CTA.
   - `Goal.jsx`: Interactive daily study plan checklist with real-time add, toggle, and delete functionality.
4. **Level 3 & 4 (Right Column) — Insights & Milestone Achievements**:
   - `AIRecommendation.jsx`: AI Copilot study advice card with personalized recommendation triggers.
   - `WeeklyActivity.jsx`: 7-day study time bar chart.
   - `Achievements.jsx`: Milestone badges with real unlocked states (streak, PYQ count, accuracy, syllabus mastery) and fallback lock state.
5. **Level 5 — Motivational Engineering Banner**:
   - `Motivation.jsx`: Full-width Civil Engineering quote banner with vector art and direct link to performance tracking.
6. **Landing Page Redesign (`LandingPage.tsx`)**:
   - Modernized public landing page featuring top navigation, clean engineering hero with illustration asset (`frontend/src/assets/engineerimg.png`), quick register/login CTAs, and a 4-card feature overview grid (Question Bank, Mock Tests, Performance Analytics, AI Tutor).
7. **Design System & CSS Styling (`frontend/src/index.css`)**:
   - Integrated SaaS color palette variables (`--bg-color`, `--sidebar-bg`, `--primary-color: #6C46E8`, `--secondary-color: #22C7B8`, etc.).
   - Preserved independent `.sidebar nav` vertical scrolling rules with custom thin scrollbars.

---

## 4. Current Work & Next Up

### Reusable Topic-Based MCQ Practice Engine
- **Objective:** Convert `Topics.jsx` / `PracticeQuestions.jsx` into an interactive, parameter-driven question practice engine.
- **Scope:**
  1. Fix routing in `TopicContent.jsx` (`/learn/practice?topic_id=${topic.id}`).
  2. Implement immediate answer evaluation against `questionsAPI.submitAnswer` (lock selected option, color green/red, reveal explanation).
  3. Support next/prev navigation, question palette, progress indicator, and final score summary view.

---

## 5. Directory Structure & Key Files

```
learnmate/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── admin.py          # Admin API (users, questions, mock-tests, hierarchy, stats)
│   │   │   ├── analytics.py      # Dashboard stats, weekly activity, performance, AI profile & study plans
│   │   │   ├── auth.py           # Login, registration, token refresh, Google OAuth
│   │   │   ├── mock_tests.py     # Mock test creation, retrieval, and submission
│   │   │   ├── questions.py      # Question retrieval and answer verification
│   │   │   └── tutor.py          # AI Tutor Gemini endpoint
│   │   ├── services/
│   │   │   └── ai_personality.py # Gemini candidate profiling & study plan generator
│   │   ├── models/               # SQLAlchemy models (User, Subject, Chapter, Topic, Question, MockTest)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   └── core/                 # Config, security, database session
│   └── .env                      # Database URL and secret keys
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── admin.ts          # Typed admin API client
│   │   │   ├── analytics.ts      # Analytics, performance, and AI profile client
│   │   │   ├── mockTests.ts      # Test attempt & mock test API client
│   │   │   └── questions.ts      # Question fetching & answer verification API
│   │   ├── pages/admin/
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── AdminUsersPage.tsx
│   │   │   ├── AdminQuestionsPage.tsx
│   │   │   ├── AdminHierarchyPage.tsx
│   │   │   └── AdminMockTestsPage.tsx
│   │   ├── collab/
│   │   │   ├── components/
│   │   │   │   ├── layout/       # Sidebar (scrollable nav), Topbar
│   │   │   │   ├── learn/        # Topics, TopicContent, PracticeQuestions
│   │   │   │   └── test/         # MockTest and test simulation views
│   │   │   └── pages/
│   │   │       └── Performance.jsx # Performance metrics & AI Copilot Analysis
│   │   └── .env                  # VITE_API_URL=http://localhost:8002/api/v1
│   └── index.css                 # Main stylesheet with scrollable sidebar nav rules
└── resume_prompt.md              # This resume reference file
```
