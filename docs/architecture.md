# Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        FE["Next.js 15 Frontend
             (App Router, TailwindCSS,
              Socket.IO Client, Recharts)"]
        EC["External Client
             (curl, Postman, Worker)"]
    end

    subgraph "API Gateway"
        NGINX["Reverse Proxy
               (Nginx / Traefik)"]
    end

    subgraph "Backend — NestJS Application"
        direction TB
        
        subgraph "Middleware"
            GEF["Global Exception Filter"]
            TI["Transform Interceptor"]
            LI["Logging Interceptor"]
            TG["Throttler Guard<br/>(100 req/min)"]
        end

        subgraph "Authentication"
            JAG["JWT Auth Guard<br/>(Global)"]
            JRS["JWT Strategy<br/>(Access Token)"]
            RFS["Refresh Strategy<br/>(Refresh Token)"]
            RG["Roles Guard<br/>(RBAC)"]
        end

        subgraph "Modules"
            AM["Auth Module<br/>register / login / refresh / logout"]
            ORM["Organizations Module<br/>CRUD + Members"]
            PRM["Projects Module<br/>CRUD"]
            QM["Queues Module<br/>CRUD + Pause/Resume + Stats"]
            JM["Jobs Module<br/>CRUD + Retry + Cancel"]
            WM["Workers Module<br/>Register / Claim / Complete / Fail"]
            DM["Dashboard Module<br/>Aggregate Metrics"]
            HM["Health Module<br/>DB + Redis health"]
        end

        subgraph "Real-time"
            WSC["WebSocket Gateway<br/>(Socket.IO /events)"]
            WSC -->|"job:created"| FE
            WSC -->|"job:updated"| FE
            WSC -->|"queue:updated"| FE
            WSC -->|"worker:heartbeat"| FE
        end
    end

    subgraph "Data Layer"
        PG[("PostgreSQL 17
             (Primary Database)
             Users / Orgs / Projects
             Queues / Jobs / Workers
             Execution Logs / Retries)")]
        RD[("Redis 7
             (Cache / Pub-Sub
              Distributed Locks
              Rate Limiting)")]
    end

    subgraph "Infrastructure"
        DC["Docker Compose
            (postgres / backend / frontend)"]
    end

    FE -->|HTTP/WS| NGINX
    EC -->|HTTP| NGINX
    NGINX -->|proxy_pass| JAG
    
    JAG --> AM
    JAG --> ORM
    JAG --> PRM
    JAG --> QM
    JAG --> JM
    JAG --> WM
    JAG --> DM
    
    RG --> ORM
    RG --> PRM
    RG --> QM
    RG --> JM

    AM --> JRS
    AM --> RFS
    AM -->|password hash| PG
    AM -->|tokens| PG

    ORM --> PG
    PRM --> PG
    QM --> PG
    JM --> PG
    WM --> PG
    DM --> PG
    HM --> PG
    HM --> RD

    WM -->|job claiming| PG
    WM -->|heartbeats| PG

    WSC -->|pub/sub| RD
```

## Component Descriptions

### Frontend (Next.js 15)
- **App Router** with route groups for auth and dashboard
- **TanStack Query** for server state management with automatic cache invalidation
- **Zustand** for client-side auth state (access token in memory only)
- **Socket.IO Client** for real-time job/queue/worker updates
- **Recharts** for dashboard analytics visualizations

### Backend (NestJS 10)
- **Clean Architecture** with modules, services, controllers, and DTOs
- **Global JWT Guard** — all routes authenticated by default, opt-out via `@Public()`
- **Roles Guard** — RBAC enforcement at the controller level
- **Transform Interceptor** — wraps all responses in `{ success, data, timestamp }` envelope
- **Global Exception Filter** — handles HTTP exceptions and Prisma errors uniformly

### Database (PostgreSQL)
- **Prisma ORM** for type-safe database access and migrations
- **UUID primary keys** for distributed-friendly ID generation
- **Cascade deletes** for clean resource cleanup
- **Composite unique constraints** for multi-tenant slugs and idempotency keys

### Cache (Redis)
- **ioredis** client with connection pooling
- **Pub/Sub** for WebSocket event broadcasting across multiple backend instances
- **Distributed Locking** via SET NX PX (Redlock-compatible pattern)
- **Rate Limiting** via `@nestjs/throttler` backed by Redis (configurable)

### WebSocket Gateway
- **Socket.IO** on `/events` namespace
- **Token-based authentication** via query parameter
- **Organization-scoped rooms** for targeted event delivery
- Emits events: `job:created`, `job:updated`, `queue:updated`, `worker:heartbeat`

### Worker Service
- External process that registers with the API
- Polls for jobs via atomic claim transaction
- Reports heartbeat at regular intervals
- Reports completion or failure with optional result/error payload
- Automatic retry with configurable backoff strategy
- Workers marked OFFLINE after 30s without heartbeat
