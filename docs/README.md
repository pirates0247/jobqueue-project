# Pulse — Distributed Job Queue SaaS

A production-grade distributed job queue and worker orchestration platform built with NestJS, PostgreSQL, Prisma, Redis, and Next.js 15.

## Features

- **Multi-tenant Organizations** — RBAC with OWNER, ADMIN, DEVELOPER, VIEWER roles
- **Projects & Queues** — Hierarchical resource organization with configurable queues
- **Job Scheduling** — Immediate, delayed, scheduled (cron), recurring, and batch jobs
- **Retry Strategies** — Fixed, linear, and exponential backoff per queue
- **Worker Service** — Autonomous workers with atomic job claiming, heartbeats, and graceful shutdown
- **Real-time Updates** — WebSocket gateway broadcasting job/queue/worker events
- **Dashboard & Analytics** — Aggregate metrics, job status breakdowns, and recent activity
- **JWT Authentication** — Access tokens (15m) + rotating refresh tokens (7d, httpOnly cookie)
- **Idempotency** — Idempotency key support for safe job re-submission
- **Dockerized** — Multi-stage Docker builds with Docker Compose orchestration
- **Dark/Light Mode** — Full theme support via next-themes

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend Framework** | NestJS 10, TypeScript |
| **API** | REST (JSON) + WebSocket (Socket.IO) |
| **Database** | PostgreSQL 17 (via Prisma ORM 5) |
| **Cache / Pub-Sub** | Redis 7 (via ioredis) |
| **Authentication** | JWT (passport-jwt), Argon2 password hashing |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | TailwindCSS 3, Radix UI Primitives, Framer Motion |
| **State Mgmt** | TanStack Query 5, Zustand 5 |
| **Charts** | Recharts 2 |
| **Validation** | Zod (frontend), class-validator (backend) |
| **Testing** | Jest, Supertest, Playwright |
| **Infrastructure** | Docker, Docker Compose |

## System Architecture

```
┌──────────────┐     ┌─────────────────────────────────────┐     ┌──────────┐
│  Next.js 15   │────▶│         NestJS Backend API          │────▶│PostgreSQL│
│  Frontend     │     │  ┌──────┐ ┌──────┐ ┌───────────┐  │     └──────────┘
│  (App Router) │     │  │Auth  │ │Org & │ │ Queues &  │  │     ┌──────────┐
│  TailwindCSS  │     │  │Module│ │Proj. │ │ Jobs      │  │────▶│  Redis   │
│  Socket.IO    │◀───▶│  └──────┘ └──────┘ └───────────┘  │     └──────────┘
│  Client       │     │  ┌──────────┐ ┌──────────┐       │
└──────────────┘     │  │Workers   │ │Dashboard │       │
                     │  │Module    │ │Module    │       │
                     │  └──────────┘ └──────────┘       │
                     │  ┌─────────────────────────────┐  │
                     │  │  WebSocket Gateway (/events) │  │
                     │  └─────────────────────────────┘  │
                     └─────────────────────────────────────┘
```

## Folder Structure

```
jobqueue-saas/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── configuration.ts
│   │   │   └── env.validation.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── redis/
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   ├── common/
│   │   │   ├── dto/
│   │   │   │   ├── api-response.dto.ts
│   │   │   │   └── pagination-query.dto.ts
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── organizations/
│   │       ├── projects/
│   │       ├── queues/
│   │       ├── jobs/
│   │       ├── workers/
│   │       ├── dashboard/
│   │       ├── health/
│   │       └── events/
│   ├── test/
│   │   ├── jest-e2e.json
│   │   └── auth.e2e-spec.ts
│   └── coverage/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   └── (dashboard)/
│       │       ├── dashboard/page.tsx
│       │       ├── workers/page.tsx
│       │       ├── organizations/
│       │       └── ...
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── store/
│       └── types/
└── docs/
    ├── README.md
    ├── architecture.md
    ├── er-diagram.md
    ├── database-design.md
    ├── api-documentation.md
    ├── design-decisions.md
    ├── testing.md
    ├── deployment.md
    ├── screenshots.md
    ├── SUBMISSION_CHECKLIST.md
    ├── openapi.json
    └── postman/
        └── pulse-collection.json
```

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (running locally or via Docker)
- **Redis** 7+ (running locally or via Docker)
- **Docker** & **Docker Compose** (for containerized setup)
- **npm** or **yarn**

## Installation

### Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your local values

# Frontend
cp frontend/.env.example frontend/.env.local
```

### Backend `.env.example`

```env
# ---------- App ----------
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3000

# ---------- Database ----------
DATABASE_URL=postgresql://jobqueue:jobqueue@localhost:5432/jobqueue?schema=public

# ---------- Redis ----------
REDIS_URL=redis://localhost:6379

# ---------- Auth ----------
JWT_ACCESS_SECRET=change_me_access_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# ---------- Rate limiting ----------
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Frontend `.env.example`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Docker Setup (Recommended)

```bash
# Clone and start all services
docker compose up --build
```

- Backend API: http://localhost:4000/api/v1
- Frontend: http://localhost:3000
- Health check: http://localhost:4000/api/v1/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

The backend container runs `prisma migrate deploy` automatically on startup (if configured).

## Local Development Setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed          # Creates demo user: demo@jobqueue.dev / DemoPass1
npm run start:dev            # Starts with hot-reload on port 4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                  # Starts with turbopack on port 3000
```

### Worker Service

Workers are processes that connect to the API to claim and execute jobs. A worker registers itself via:

```bash
POST /api/v1/workers/register
{
  "name": "my-worker-1",
  "hostname": "worker-host",
  "concurrency": 5
}
```

Then polls for jobs via:

```bash
POST /api/v1/workers/:id/claim
{
  "queueIds": ["queue-uuid-1", "queue-uuid-2"],
  "limit": 5
}
```

### Running Database Migrations

```bash
cd backend
npm run prisma:migrate       # Create a new migration (dev)
npm run prisma:deploy        # Apply migrations in production
npm run prisma:studio        # Open Prisma Studio GUI
npm run prisma:seed          # Seed demo data
```

## Running Tests

```bash
# Backend unit tests
cd backend
npm run test

# Backend test coverage
npm run test:cov

# Backend E2E tests (requires running PostgreSQL + Redis)
npm run test:e2e

# Frontend E2E tests
cd frontend
npm run test:e2e
```

## API Documentation

Full API documentation is available in [api-documentation.md](./api-documentation.md).

### Quick Reference

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Health | `/api/v1/health` |
| Organizations | `/api/v1/organizations` |
| Projects | `/api/v1/organizations/:slug/projects` |
| Queues | `/api/v1/organizations/:slug/projects/:projectSlug/queues` |
| Jobs | `/api/v1/organizations/:slug/projects/:projectSlug/queues/:name/jobs` |
| Workers | `/api/v1/workers` |
| Dashboard | `/api/v1/dashboard` |
| WebSocket | `ws://host/events` |

## Screenshots

See [screenshots.md](./screenshots.md) for a complete list of screenshots to capture.

## Deployment

See [deployment.md](./deployment.md) for detailed deployment instructions.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `JWT_ACCESS_SECRET` must be at least 32 characters | Generate a 32+ character secret: `openssl rand -hex 32` |
| Prisma migration fails | Ensure PostgreSQL is running and `DATABASE_URL` is correct |
| Redis connection refused | Ensure Redis is running on localhost:6379 |
| CORS errors | Verify `CORS_ORIGIN` matches the frontend URL |
| WebSocket not connecting | Check `NEXT_PUBLIC_WS_URL` matches the backend URL |

## Future Improvements

- **Workflow Dependencies** — Directed acyclic graph (DAG) of job dependencies
- **Distributed Locking** — Redlock-based distributed locking for multi-replica workers
- **Sharding** — Queue sharding across multiple PostgreSQL partitions or Redis streams
- **Advanced Analytics** — Job duration percentiles, failure heatmaps, SLA tracking
- **Webhook Notifications** — Outbound webhooks on job completion/failure
- **AI Failure Classification** — Automated failure pattern analysis and remediation suggestions
- **Rate Limiting UI** — Configurable rate limit policies per organization
- **Audit Log** — Immutable audit trail for all resource mutations
