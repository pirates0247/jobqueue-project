# Pulse — Distributed Job Queue SaaS

A production-grade distributed job queue and worker orchestration platform.
Backend: NestJS + PostgreSQL (Prisma) + Redis. Frontend: Next.js 15 (App Router).

This repository is being built feature by feature. **Current state: base architecture + full JWT authentication (register / login / refresh / logout).**

## Stack

| Layer    | Tech                                                                 |
|----------|-----------------------------------------------------------------------|
| Backend  | NestJS, TypeScript, PostgreSQL, Prisma, Redis, JWT, WebSockets, Docker |
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn-style UI, TanStack Query, React Hook Form, Zod, Framer Motion, Recharts |
| Testing  | Jest, Supertest, Playwright                                           |

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

- Backend: http://localhost:4000/api/v1
- Frontend: http://localhost:3000
- Health check: http://localhost:4000/api/v1/health

The backend container runs `prisma migrate deploy` automatically on startup.
To create the first migration locally instead of via Docker, see below.

## Quick start (local, no Docker)

Requires Node 20+, PostgreSQL 16, Redis 7 running locally.

```bash
# Backend
cd backend
cp .env.example .env        # edit DATABASE_URL / REDIS_URL if not using defaults
npm install
npx prisma migrate dev --name init
npm run prisma:seed         # optional demo user: Email: demo@test.com and Password: Demo123!

After launching, create a demo account via the UI at http://localhost:3000/register, or use the API:

```bash
# Register a new user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Demo","lastName":"User","email":"demo@test.com","password":"Demo123!"}'

# Demo credentials (if using above registration)
#   Email:    demo@test.com
#   Password: Demo123!
```
npm run start:dev

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Remote / Non-Local Client Connections

When running the application without Docker and connecting remote clients (e.g. from other machines or networks):

1. **Host Binding**: The NestJS backend binds to `0.0.0.0` by default, meaning it listens to connections from all IP addresses.
2. **CORS Configuration**: Update `CORS_ORIGIN` in `backend/.env` to include your remote frontend's IP address/domain:
   ```env
   CORS_ORIGIN=http://<frontend-ip>:3000
   ```
3. **Frontend API Endpoint**: Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to point to the backend server's remote IP address:
   ```env
   NEXT_PUBLIC_API_URL=http://<backend-ip>:4000
   ```
4. **WebSocket Connection**: The frontend `useSocket` client hooks will automatically resolve connections to the remote namespace endpoint `ws://<backend-ip>:4000/events` based on `NEXT_PUBLIC_API_URL`.

## Architecture notes


**Backend (`/backend`)**
- `src/config` — typed configuration + env validation (`class-validator`), fails fast on boot if secrets are missing/too short.
- `src/prisma` — global `PrismaModule`/`PrismaService`, exposes `runInTransaction` for atomic multi-step writes (used later for job claiming).
- `src/redis` — global `RedisModule`/`RedisService`, exposes a Redlock-style `acquireLock`/`releaseLock` pair for the future distributed-locking work.
- `src/common` — global exception filter (maps Prisma errors to clean HTTP responses), logging + response-transform interceptors, `@Public()` / `@CurrentUser()` / `@Roles()` decorators, pagination DTO.
- `src/modules/auth` — JWT access tokens (15m) + rotating refresh tokens (7d, httpOnly cookie, hashed at rest, single-use). `JwtAuthGuard` is registered globally; routes opt out with `@Public()`.
- `src/modules/users` — thin repository-style service reused by Auth and future features.
- `prisma/schema.prisma` — full domain model (Users, Organizations, Memberships, Projects, Queues, Jobs, ExecutionLogs, RetryHistory, Workers) is defined now so migrations are stable as features land; only Auth/Users are wired into the app today.

**Frontend (`/frontend`)**
- Design direction: a dense "control plane" dashboard (Linear/Vercel/Datadog register) — deep neutral surfaces, a signature violet accent reserved for anything "live," JetBrains Mono for IDs/timestamps/cron expressions. Tokens live in `src/app/globals.css` (light + dark) and `tailwind.config.ts`.
- `src/store/auth-store.ts` — access token kept in memory only (Zustand), never localStorage; refresh token is an httpOnly cookie the client never touches directly.
- `src/lib/api-client.ts` — Axios instance with automatic silent refresh-and-retry on a 401.
- `src/hooks/use-auth.ts` — `useAuthBootstrap()` silently exchanges the refresh cookie for a session on load; `useAuth()` exposes login/register/logout mutations.
- `(auth)` route group — split-screen login/register with a signature animated "pulse grid" (`PulseGrid`), the page's one deliberate visual flourish.
- `(dashboard)` route group — client-side auth guard; redirects to `/login` if there's no session after bootstrap. Currently a placeholder page confirming the full auth loop; replaced by the real Dashboard feature next.

## Testing

```bash
cd backend
npm run test          # unit tests (AuthService)
npm run test:e2e       # full HTTP auth flow against a running Postgres/Redis
```

## Roadmap (built feature by feature, in order)

1. Base architecture, Docker, Prisma, Redis, Authentication
2. Organizations & Projects (+ RBAC guard)
3. Queues & Queue Configuration
4. Jobs (immediate/delayed/scheduled/recurring/batch)
5. Worker Service (polling, atomic claiming, heartbeats, graceful shutdown)
6. Job lifecycle, retries, execution logs, WebSocket live updates
7. Dashboard, Queue Management, Worker Monitoring, Job Explorer UI
8. Analytics, bonus features (workflow deps, sharding, distributed locking, RBAC UI, rate limiting, AI failure summary placeholder)
