# LearnMate AI

<div align="center">

![LearnMate AI Banner](https://img.shields.io/badge/LearnMate-AI--Powered%20Learning%20Platform-6C46E8?style=for-the-badge&logo=rocket&logoColor=white)

**An intelligent, data-driven learning and assessment platform engineered for competitive exam aspirants, specialized for SSC JE (Staff Selection Commission Junior Engineer) Civil Engineering.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-learnmate--seven.vercel.app-22C7B8?style=for-the-badge&logo=vercel&logoColor=white)](https://learnmate-seven.vercel.app)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash-8E75B2?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

[🌐 Explore Live Application](https://learnmate-seven.vercel.app) • [📖 Documentation](#-system-architecture) • [🚀 Quickstart](#-quick-start) • [✨ Key Features](#-key-features)

</div>

---

## 🚀 Live Deployment

The frontend application is continuously deployed on **Vercel**:
- **Production URL:** [https://learnmate-seven.vercel.app](https://learnmate-seven.vercel.app)
- **Admin Control Center:** [https://learnmate-seven.vercel.app/admin](https://learnmate-seven.vercel.app/admin)

---

## ✨ Key Features

### 📚 1. Comprehensive Question Bank & PYQ Practice Engine
- **Hierarchical Question Mapping:** Practice questions organized meticulously by **Subject → Chapter → Topic**.
- **Real SSC JE Previous Year Questions (PYQs):** Authentic questions categorized with year, shift, topic metadata, and detailed markdown explanations.
- **Immediate Evaluation Mode:** Real-time answer validation with color-coded feedback (green/red) and codal reference callouts (IS 456, IS 800, IRC, etc.).

### ⏱️ 2. High-Fidelity Mock Test System
- **SSC JE Paper-1 Simulation:** Timed full-length and subject-specific mock tests.
- **Official Scoring Schema:** Standard +1.0 for correct answers, -0.25 negative marking penalty for incorrect responses.
- **Interactive Exam Interface:** Real-time question status palette (Answered, Unanswered, Marked for Review), section switching, and instant submission analysis.

### 📊 3. Performance Analytics & AI Candidate Profiling
- **Real-Time Dashboard:** Tracks overall syllabus completion percentage, total study hours, solved PYQ count, and daily practice streaks.
- **AI Personality Diagnostic:** Leverages Google Gemini to analyze test attempt patterns and generate actionable candidate study archetypes (e.g., *Analytical Perfectionist*, *Speed Strategist*).
- **Personalized Weakness Profiling:** Identifies low-scoring topics and dynamically generates customized daily revision plans.

### 🤖 4. AI Tutor & Smart Doubt Resolution
- **Contextual Copilot:** In-app AI tutor that explains complex Civil Engineering theories, derivations, and formulas.
- **Graceful Fallback Logic:** Resilient offline/development fallback ensures uninterrupted learning even during API rate limits.

### 🛡️ 5. Production Admin Control Center
- **User Management:** Server-side search, role assignment (Student/Admin), activation toggles, and attempt history drawer.
- **Question Ingestion Pipeline:** Automated parsing and batch validation of questions from JSON and formatted Word/PDF documents.
- **Syllabus Hierarchy Editor:** Live management of Exam, Branch, Subject, Chapter, and Topic nodes with referential integrity protection.

---

## 🏛️ System Architecture

```
                                  +-----------------------------+
                                  |     Vercel Edge Network     |
                                  |   React 18 + TypeScript SPA |
                                  +--------------+--------------+
                                                 |
                                         HTTPS / REST API
                                                 |
                                  +--------------v--------------+
                                  |    FastAPI Backend Server   |
                                  |     Python 3.11+ / Uvicorn  |
                                  +------+---------------+------+
                                         |               |
                         SQLAlchemy 2.0  |               |  REST API
                         (psycopg3 pool) |               |
                                         v               v
                        +----------------+--+   +--------+--------+
                        |   PostgreSQL DB   |   |  Google Gemini  |
                        | (Neon / Supabase) |   |  AI Flash Model |
                        +-------------------+   +-----------------+
```

### 📂 Domain Hierarchy
```
Exam (e.g., SSC JE)
└── Branch (e.g., Civil Engineering)
    └── Subject (e.g., Building Materials, RCC, Fluid Mechanics)
        └── Chapter (e.g., Cement, Concrete Technology)
            └── Topic (e.g., Types of Cement, Water-Cement Ratio)
                └── Questions (PYQs, Standard MCQs, Numerical Problems)
```

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React 18**, **TypeScript**, **Vite 5** | High-performance Single Page Application |
| **Styling** | **Tailwind CSS**, **Lucide Icons** | Responsive UI with custom design system variables |
| **Routing & State** | **React Router DOM v6**, **Context API** | Client-side routing with role-based route guards |
| **Backend** | **FastAPI**, **Python 3.11+**, **Uvicorn** | Asynchronous high-throughput REST API |
| **ORM & Database** | **SQLAlchemy 2.0**, **PostgreSQL**, **psycopg3** | Relational persistence with connection pooling |
| **Authentication** | **OAuth2**, **JWT**, **Passlib / Bcrypt** | Secure stateless token authentication |
| **AI Engine** | **Google Gemini (`gemini-flash-latest`)** | Candidate profiling, study plans & tutoring |
| **Deployment** | **Vercel** (Frontend), **Render / VPS** (Backend) | Cloud-native CI/CD infrastructure |

---

## 📁 Repository Structure

```
learnmate/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # REST API routes (auth, analytics, mock_tests, questions, admin, etc.)
│   │   ├── core/                # Configuration, security & database session management
│   │   ├── models/              # SQLAlchemy 2.0 relational models
│   │   ├── schemas/             # Pydantic v2 validation schemas
│   │   ├── scripts/             # Database seeding & ingestion utilities
│   │   └── services/            # AI personality profiling & test generation services
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt         # Backend Python dependencies
│   └── main.py                  # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── api/                 # Typed API client services (Axios)
│   │   ├── assets/              # Images, vector illustrations, and static icons
│   │   ├── components/          # Reusable UI components, modals, and navigation guards
│   │   ├── collab/              # Dashboard, performance views & study modules
│   │   ├── contexts/            # React AuthContext and theme providers
│   │   ├── pages/               # Public, student, and admin views
│   │   ├── types/               # TypeScript interface and type definitions
│   │   ├── App.tsx              # Application route tree
│   │   └── index.css            # Tailwind & SaaS design system styling
│   ├── package.json             # Frontend dependencies & scripts
│   ├── vite.config.ts           # Vite bundler configuration
│   └── vercel.json              # Vercel SPA routing rules
├── docs/                        # Architecture & database schema documentation
└── README.md                    # Project documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **PostgreSQL**: Local instance, Neon, or Supabase

---

### 2. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Configure your `.env` file:
```ini
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/learnmate_db
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key_here
```

Run database migrations and seed baseline data:
```powershell
alembic upgrade head
python -m app.scripts.seed_syllabus
```

Start the FastAPI development server:
```powershell
uvicorn main:app --host 127.0.0.1 --port 8002 --reload
```
- 📖 **Interactive Swagger Docs:** `http://localhost:8002/docs`
- 🩺 **Health Check:** `http://localhost:8002/api/v1/health`

---

### 3. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Set your API endpoint in `frontend/.env`:
```ini
VITE_API_URL=http://localhost:8002/api/v1
```

Start the Vite development server:
```powershell
npm run dev -- --port 5173
```
- 🌐 **Web Application:** `http://localhost:5173`
- 🛡️ **Admin Dashboard:** `http://localhost:5173/admin`

---

## 🧪 Testing & Verification

```powershell
# Run frontend TypeScript check & production build
cd frontend
npm run build

# Run backend pytest suite
cd backend
pytest
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Engineered with precision for SSC JE Civil Engineering aspirants • Built with ❤️ by the LearnMate Team</sub>
</div>
