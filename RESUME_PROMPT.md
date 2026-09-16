# LearnMate AI - Session Resume Context

*Copy and paste the text below into Claude Code (or any AI assistant) when starting a new session to instantly resume our progress.*

***

**System Context:**
You are assisting me in developing "LearnMate," an AI-powered educational platform with a Python FastAPI backend and a React (Vite) frontend.

**Current State of the Project:**
1. **Architecture Overview:** We have a strict 6-tier educational relational hierarchy: `Exam -> Branch -> Subject -> Chapter -> Topic -> Question`. All AI and Database keys are securely kept in the backend. 
2. **Frontend Integration Completed:** We successfully completed a "hybrid integration" of a collaborator's frontend code. All `.jsx` components (like Dashboard, Topics, Mock Tests) live in `frontend/src/collab/` and are mounted in `frontend/src/App.tsx` under our secure `<ProtectedRoute>`. We use TypeScript (`allowJs: true`) alongside React Router v6.
3. **Database Migration to Supabase:** We've shifted our database to Supabase PostgreSQL (cloud) to fix registration/login issues and improve collaboration. The DB connection string is managed via Supabase connection pooling parameters.
4. **PDF Question Extraction Pipeline:** A teammate is handling the AI pipeline extraction (`PyMuPDF` + `Google Gemini 1.5 Flash`) to pull questions from scanned PDFs. We are waiting on the final JSON array generation.

**Most Recent Actions Done:**
- Shifted PostgreSQL database connection to Supabase cloud.
- Fixed severe Vite runtime errors (`import` collision and missing default exports) in the frontend that caused a blank page on `localhost:5174`. Specifically, resolved Windows case-insensitivity conflicts by renaming `testAnalytics.js` to `analyticsLogic.js`.
- Fixed the mock test functionality in `MockTest.jsx`: Corrected the question timers to prevent staleness and tracking errors, and successfully implemented an "Early Submit" button ahead of completing all questions.

**Immediate Next Steps / Tasks:**
1. Refine and finish building out the remaining frontend UI components independently of real question data, utilizing the mock schema while the backend dataset is being processed by the teammate.
2. Initialize backend Alembic migrations and create database schema on the new Supabase cloud Postgres instance.
3. Once the PDF JSON data is ready, build a SQLAlchemy ingestion script (`backend/app/scripts/ingest_questions.py`) that reads the resulting parsed JSON array and injects them into the Supabase database.

**Commands to Remember:**
- Backend Env: `source backend/venv/Scripts/activate` (or `.\backend\venv\Scripts\activate` in PowerShell)
- Run Backend: `cd backend && uvicorn main:app --reload --port 8001`
- Run Frontend: `cd frontend && npm run dev`

*Please acknowledge this context and ask me what I would like to do next.*
