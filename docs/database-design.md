# Database Design Document

## Overview

The database uses PostgreSQL 17 with Prisma ORM 5 for type-safe access. The schema follows a multi-tenant hierarchy: **Organization → Project → Queue → Job**, with separate models for workers, execution logs, retry history, and authentication tokens.

## Entity Descriptions

### 1. User (`users`)

Stores registered user accounts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `uuid()` | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email (stored lowercase) |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2 hash of password |
| `first_name` | VARCHAR(50) | NOT NULL | User's first name |
| `last_name` | VARCHAR(50) | NOT NULL | User's last name |
| `is_active` | BOOLEAN | DEFAULT true | Soft-delete flag |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

**Cascade**: Deleting a user cascades to their `RefreshToken` and `Membership` records.

### 2. RefreshToken (`refresh_tokens`)

Stores hashed refresh tokens for session management with rotation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner of the token |
| `token_hash` | VARCHAR(255) | NOT NULL | SHA-256 hash of the refresh token |
| `user_agent` | VARCHAR(255) | Nullable | Browser/device user agent |
| `ip_address` | VARCHAR(45) | Nullable | Client IP address |
| `revoked` | BOOLEAN | DEFAULT false | Whether token has been revoked |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Token expiry |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Index**: `(user_id)` — fast lookup of all tokens for a user.
**Cascade**: `ON DELETE CASCADE` — tokens are removed when user is deleted.

### 3. Organization (`organizations`)

Top-level multi-tenant entity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `slug` | VARCHAR(50) | UNIQUE, NOT NULL | URL-friendly identifier |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

### 4. Membership (`memberships`)

Join table linking users to organizations with role-based access.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users(id), NOT NULL | User reference |
| `organization_id` | UUID | FK → organizations(id), NOT NULL | Organization reference |
| `role` | ENUM | NOT NULL, DEFAULT 'DEVELOPER' | OWNER, ADMIN, DEVELOPER, VIEWER |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Unique**: `(user_id, organization_id)` — prevents duplicate memberships.
**Index**: `(organization_id)` — fast member listing.
**Cascade**: `ON DELETE CASCADE` from both User and Organization.

### 5. Project (`projects`)

A container for queues within an organization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `organization_id` | UUID | FK → organizations(id), NOT NULL | Parent organization |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `slug` | VARCHAR(50) | NOT NULL | URL-friendly identifier (unique per org) |
| `description` | TEXT | Nullable | Optional description |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

**Unique**: `(organization_id, slug)` — multi-tenant slug uniqueness.
**Index**: `(organization_id)` — project listing per org.
**Cascade**: `ON DELETE CASCADE` from Organization.

### 6. Queue (`queues`)

A message queue with configurable processing behavior.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `project_id` | UUID | FK → projects(id), NOT NULL | Parent project |
| `name` | VARCHAR(100) | NOT NULL | Queue name (unique per project) |
| `status` | ENUM | DEFAULT 'ACTIVE' | ACTIVE, PAUSED |
| `priority` | INTEGER | DEFAULT 0 | Queue priority (higher = more important) |
| `concurrency_limit` | INTEGER | DEFAULT 5 | Max parallel job execution |
| `retry_strategy` | ENUM | DEFAULT 'EXPONENTIAL' | FIXED, LINEAR, EXPONENTIAL |
| `max_retries` | INTEGER | DEFAULT 3 | Max retry attempts |
| `base_retry_delay_ms` | INTEGER | DEFAULT 1000 | Base delay between retries |
| `shard_count` | INTEGER | DEFAULT 1 | Number of shards for parallel processing |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

**Unique**: `(project_id, name)` — multi-tenant unique queue name.
**Index**: `(project_id)` — queue listing per project.
**Cascade**: `ON DELETE CASCADE` from Project.

### 7. Job (`jobs`)

A unit of work to be processed by a worker.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `queue_id` | UUID | FK → queues(id), NOT NULL | Parent queue |
| `type` | ENUM | DEFAULT 'IMMEDIATE' | IMMEDIATE, DELAYED, SCHEDULED, RECURRING, BATCH |
| `status` | ENUM | DEFAULT 'QUEUED' | QUEUED, SCHEDULED, CLAIMED, RUNNING, COMPLETED, RETRYING, FAILED, DEAD_LETTER, CANCELLED |
| `payload` | JSONB | NOT NULL | Job data payload |
| `priority` | INTEGER | DEFAULT 0 | Job priority (higher = processed first) |
| `attempts` | INTEGER | DEFAULT 0 | Number of execution attempts |
| `max_retries` | INTEGER | DEFAULT 3 | Inherited from queue, can be overridden |
| `cron_expression` | VARCHAR(100) | Nullable | Cron schedule for recurring jobs |
| `run_at` | TIMESTAMPTZ | Nullable | When to execute (for delayed/scheduled) |
| `claimed_by` | VARCHAR(255) | Nullable | Worker ID that claimed the job |
| `claimed_at` | TIMESTAMPTZ | Nullable | When the job was claimed |
| `started_at` | TIMESTAMPTZ | Nullable | Execution start time |
| `completed_at` | TIMESTAMPTZ | Nullable | Completion time |
| `failed_at` | TIMESTAMPTZ | Nullable | Failure time |
| `idempotency_key` | VARCHAR(255) | Nullable | For idempotent job submission |
| `batch_id` | VARCHAR(255) | Nullable | Batch grouping identifier |
| `parent_job_id` | VARCHAR(255) | Nullable | Parent job for DAG workflows |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

**Unique**: `(queue_id, idempotency_key)` — idempotency (only when key provided).
**Index**: `(queue_id, status)` — composite index for efficient worker polling.
**Index**: `(run_at)` — index for scheduled job queries.
**Cascade**: `ON DELETE CASCADE` from Queue.

### 8. ExecutionLog (`execution_logs`)

Immutable audit trail for job execution events.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `job_id` | UUID | FK → jobs(id), NOT NULL | Parent job |
| `worker_id` | VARCHAR(255) | Nullable | Worker that logged the event |
| `level` | VARCHAR(20) | DEFAULT 'info' | Log level (info, warn, error) |
| `message` | TEXT | NOT NULL | Log message |
| `metadata` | JSONB | Nullable | Additional structured data |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Index**: `(job_id)` — fast job timeline queries.
**Cascade**: `ON DELETE CASCADE` from Job.

### 9. RetryHistory (`retry_history`)

Tracks each retry attempt for failed jobs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `job_id` | UUID | FK → jobs(id), NOT NULL | Parent job |
| `attempt` | INTEGER | NOT NULL | Attempt number (1-based) |
| `reason` | TEXT | Nullable | Failure reason |
| `delay_ms` | INTEGER | NOT NULL | Delay applied before this retry |
| `scheduled_at` | TIMESTAMPTZ | NOT NULL | When the retry is scheduled |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

**Index**: `(job_id)` — fast retry history queries.
**Cascade**: `ON DELETE CASCADE` from Job.

### 10. Worker (`workers`)

Represents a worker process that can claim and execute jobs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Worker name |
| `status` | ENUM | DEFAULT 'OFFLINE' | ONLINE, OFFLINE, DRAINING |
| `last_heartbeat` | TIMESTAMPTZ | Nullable | Last heartbeat timestamp |
| `hostname` | VARCHAR(255) | Nullable | Machine hostname |
| `concurrency` | INTEGER | DEFAULT 1 | Max concurrent jobs this worker can handle |
| `metadata` | JSONB | Nullable | Worker metadata (version, tags, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last update timestamp |

## Relationships Diagram

```
User ──1:N──> RefreshToken
User ──1:N──> Membership ──N:1──> Organization
Organization ──1:N──> Project ──1:N──> Queue ──1:N──> Job
Job ──1:N──> ExecutionLog
Job ──1:N──> RetryHistory
Worker ──1:N──> ExecutionLog (implicit, via worker_id)
```

## Normalization

The schema is in **Third Normal Form (3NF)**:

1. **1NF**: All columns are atomic (JSONB payload is a single atomic value, not a relation).
2. **2NF**: All non-key attributes depend on the full primary key (UUID — no partial dependencies).
3. **3NF**: No transitive dependencies — every non-key attribute directly depends on the primary key.

## Indexing Strategy

| Index | Type | Rationale |
|---|---|---|
| `refresh_tokens(user_id)` | B-tree | O(log n) lookup for token rotation |
| `memberships(organization_id)` | B-tree | Fast member enumeration |
| `memberships(user_id, org_id)` | Unique B-tree | Uniqueness enforcement for membership |
| `projects(organization_id)` | B-tree | Project listing per org |
| `projects(org_id, slug)` | Unique B-tree | Multi-tenant slug enforcement |
| `queues(project_id)` | B-tree | Queue listing per project |
| `queues(project_id, name)` | Unique B-tree | Multi-tenant queue name enforcement |
| `jobs(queue_id, status)` | Composite B-tree | Primary worker polling path |
| `jobs(run_at)` | B-tree | Scheduled job queries |
| `jobs(queue_id, idempotency_key)` | Unique B-tree | Idempotency enforcement |
| `execution_logs(job_id)` | B-tree | Job detail timeline |
| `retry_history(job_id)` | B-tree | Retry analysis |

## Cascading Rules

| Parent → Child | Delete Behavior | Rationale |
|---|---|---|
| User → RefreshToken | CASCADE | No orphaned tokens |
| User → Membership | CASCADE | Clean user removal |
| Organization → Membership | CASCADE | Clean org removal |
| Organization → Project | CASCADE | Cascade to projects → queues → jobs |
| Project → Queue | CASCADE | Cascade to queues → jobs → logs |
| Queue → Job | CASCADE | Clean job removal |
| Job → ExecutionLog | CASCADE | No orphaned logs |
| Job → RetryHistory | CASCADE | No orphaned retry records |

## Performance Considerations

### Atomic Operations

Job claiming uses a **Prisma interactive transaction** to atomically:
1. Find available jobs (QUEUED or SCHEDULED status, run_at <= now)
2. Update their status to CLAIMED with the worker ID
3. Create execution log entries

This prevents two workers from claiming the same job.

### Locking Strategy

- **Database-level**: Jobs are claimed within a serializable-like transaction. The update's `where` clause includes the current status, making it an optimistic lock — if another worker already claimed the job, the update affects zero rows and Prisma throws `P2025` (record not found), causing the transaction to roll back.
- **Redis-level**: A `SET NX PX` distributed locking pattern is available via `RedisService.acquireLock()` for future multi-replica coordination (e.g., scheduled job dispatching).

### Idempotency

Jobs can be submitted with an `idempotencyKey`. The `(queue_id, idempotency_key)` unique constraint ensures that duplicate submissions are rejected at the database level, preventing double-processing without the need for application-level checks.

## Scalability Decisions

1. **UUID Primary Keys**: Allows ID generation without a central sequence, enabling application-level generation and future database sharding.

2. **Composite Indexes**: The `(queue_id, status)` index on the `jobs` table is the primary access path for worker polling. Workers specify which queues they want jobs from, and the index allows efficient filtering.

3. **Denormalized `maxRetries` on Job**: Each job stores its own `maxRetries` value (inherited from queue at creation). This allows per-job overrides and preserves the setting even if the queue configuration changes later.

4. **JSONB Columns**: `payload`, `metadata`, and `result` use JSONB for schema flexibility. Different job types can store different data shapes without table inheritance.

5. **Separate ExecutionLog Table**: Immutable append-only log table prevents the `jobs` table from growing too wide and allows efficient sequential log scanning.

6. **Worker Heartbeat Model**: Workers are simple HTTP clients with no persistent connection. The `lastHeartbeat` timestamp and 30-second stale threshold provide at-most-once delivery semantics appropriate for a polling architecture.
