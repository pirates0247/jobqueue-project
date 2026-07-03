# Design Decisions

## Why NestJS?

NestJS was chosen over Express, Fastify, or other Node.js frameworks because:

- **Modular Architecture**: Built-in module system mirrors domain boundaries (Auth, Organizations, Projects, Queues, Jobs, Workers). Each module is self-contained with its own controllers, services, DTOs, and tests.
- **Dependency Injection**: First-class DI container simplifies service orchestration and testing via mocked providers.
- **Decorator-based API**: `@Controller`, `@Get`, `@Post`, `@UseGuards`, `@Body` provide a declarative route definition style that reduces boilerplate.
- **Guard Pipeline**: The global guard pipeline (`JwtAuthGuard` → `RolesGuard` → `ThrottlerGuard`) provides cross-cutting security without controller-level duplication.
- **WebSocket Integration**: `@nestjs/websockets` and `@nestjs/platform-socket.io` provide the same DI and module patterns for real-time communication.
- **Testing Utilities**: `@nestjs/testing` provides `Test.createTestingModule()` for isolated integration tests.

**Trade-off**: NestJS adds framework overhead vs. plain Express. The modularity and guard pipeline benefits outweigh this for a multi-module SaaS application.

## Why PostgreSQL?

PostgreSQL was chosen for the primary data store because:

- **Maturity & Reliability**: Battle-tested ACID compliance for transactional job claiming and financial-grade data integrity.
- **JSONB Support**: Job payloads and worker metadata benefit from schema-less JSONB columns within an otherwise structured schema.
- **Advanced Indexing**: Composite indexes, partial indexes, and concurrent index creation support the query patterns needed for job polling.
- **Prisma Compatibility**: PostgreSQL has first-class Prisma support with the richest feature set (enums, array types, JSONB, etc.).

**Trade-off**: PostgreSQL is heavier than SQLite or MySQL for simple setups. The operational complexity is justified by the need for concurrent transactional access.

## Why Redis?

Redis serves four distinct roles:

1. **Cache**: Reduce database load for frequently accessed configuration data.
2. **Pub/Sub**: Broadcast WebSocket events across multiple backend instances in a scaled deployment.
3. **Distributed Locks**: The `acquireLock`/`releaseLock` pattern (SET NX PX with Lua verification) provides coordination primitives for scheduled job dispatching and rate limiting.
4. **Rate Limiting Backend**: The `@nestjs/throttler` package can use Redis as a store for distributed rate limit counters.

**Trade-off**: Redis adds an infrastructure dependency. For single-instance deployments, the Pub/Sub and locking features aren't strictly needed, but they enable horizontal scaling without architectural changes.

## Why Prisma?

Prisma was chosen as the ORM because:

- **Type Safety**: The Prisma Client generates TypeScript types directly from the schema, eliminating the mismatch between database schema and application code.
- **Schema Migrations**: `prisma migrate` provides declarative, version-controlled schema changes with rollback support.
- **Interactive Transactions**: `prisma.$transaction()` with callback-based API supports the multi-step atomic operations needed for job claiming and retry bookkeeping.
- **Query Performance**: The generated queries are well-optimized, and the `include` API prevents N+1 problems.
- **Schema-first Approach**: `schema.prisma` serves as the single source of truth, generating both the client types and migration files.

**Trade-off**: Prisma adds a build step and some runtime overhead vs. raw SQL or lighter query builders like Knex. The type safety and developer experience benefits outweigh this.

## Why JWT (JSON Web Tokens)?

JWT was chosen for stateless authentication:

- **Stateless**: Access tokens are self-contained and verified without database lookups, enabling horizontal scaling without shared session state.
- **Short-lived Access Tokens (15m)**: Limits the damage window if a token is leaked.
- **Rotating Refresh Tokens (7d)**: Single-use refresh tokens with SHA-256 hashing at rest. Each refresh invalidates the previous token, preventing token replay attacks.
- **httpOnly Cookie**: Refresh tokens are never accessible to JavaScript, mitigating XSS-based token theft.
- **Argon2 Password Hashing**: Memory-hard hash function resistant to GPU-based brute force attacks.

**Trade-off**: JWT revocation requires a blocklist or short expiry. The rotation pattern mitigates this for refresh tokens, and the 15-minute access token window limits exposure.

## Why WebSockets (Socket.IO)?

WebSockets provide real-time updates for the dashboard and monitoring UI:

- **Event-driven Architecture**: The server pushes events (`job:created`, `job:updated`, `queue:updated`, `worker:heartbeat`) to connected clients without polling.
- **Background**: Redis Pub/Sub enables cross-instance event broadcasting for horizontally scaled deployments.
- **Organization Rooms**: Clients can subscribe to organization-specific events by providing `orgSlug` during connection.

**Trade-off**: WebSockets add complexity vs. polling. The real-time dashboard requirement justifies this, and Socket.IO provides automatic reconnection and fallback transports.

## Why Repository Pattern?

The thin service layer (`UsersService`, `OrganizationsService`, etc.) follows the repository pattern:

- **Single Responsibility**: Services encapsulate database access logic away from controllers.
- **Testability**: Services can be unit-tested with mocked Prisma clients.
- **Reusability**: AuthService reuses UsersService for user lookups; other modules can similarly reuse existing services.
- **Domain Logic Isolation**: Business rules (e.g., "only owners can delete organizations") are enforced in service methods, not scattered across controllers.

## Why Clean Architecture?

The project follows a layered architecture inspired by Clean Architecture principles:

```
Controllers (HTTP layer) → Services (Business logic) → Prisma Service (Data access)
```

- **Controllers** handle HTTP concerns: request parsing, response formatting, guard application.
- **Services** contain business logic, validation, and orchestration.
- **DTOs** define the contract between layers.
- **Global Infrastructure** (filters, interceptors, guards) operates cross-cutting.

This separation ensures that business logic is not coupled to HTTP transport, making it possible to add GraphQL or gRPC interfaces later without rewriting domain logic.

## Retry Strategy Choices

Three retry strategies are supported, chosen for common distributed systems patterns:

| Strategy | Formula | Use Case |
|---|---|---|
| **FIXED** | `delay = baseDelayMs` | Idempotent operations (e.g., idempotent API calls) |
| **LINEAR** | `delay = baseDelayMs * attempt` | Gradually back off for rate-limited services |
| **EXPONENTIAL** | `delay = baseDelayMs * 2^(attempt-1)` | Default — standard for transient failures (network issues, service unavailability) |

The strategy is configurable per queue, allowing different queues to have different retry behaviors based on the nature of their jobs.

## Queue Design

- **Active/Paused States**: Queues can be paused to stop new job processing without losing existing jobs. Useful for maintenance windows or incident response.
- **Priority-based Ordering**: Jobs within a queue are ordered by priority (descending) then creation time (ascending). Higher priority jobs are processed first.
- **Concurrency Limits**: Each queue has a configurable `concurrencyLimit` that constrains how many jobs can be processed simultaneously across all workers polling that queue.
- **Shard Count**: The `shardCount` field exists for future horizontal sharding of queue processing across multiple partitions.

## Worker Design

- **Stateless Workers**: Workers are simple HTTP clients with no persistent connection to the backend. This simplifies worker implementation (any HTTP-capable language) and deployment (no long-lived connections to manage).
- **Heartbeat-based Liveness**: Workers send periodic heartbeat requests. Workers without a heartbeat for 30 seconds are marked OFFLINE. This provides eventual consistency without a separate monitoring system.
- **Atomic Job Claiming**: Jobs are claimed within a Prisma transaction that atomically reads available jobs and updates their status. The `where` clause includes the current status as an optimistic lock, preventing double-claiming.
- **Graceful Shutdown**: Workers can be set to DRAINING status to finish current jobs without accepting new ones (future enhancement).

## Concurrency Handling

- **Prisma Interactive Transactions**: Job claiming uses `$transaction()` with the `where` status check for optimistic concurrency control.
- **Optimistic Locking**: The update operation's `where` clause includes `status: 'QUEUED'`. If another transaction already claimed the job, the update affects zero rows and Prisma throws a `P2025` error, causing a safe rollback.
- **Worker-side Concurrency**: Workers report their `concurrency` level during registration. The claim endpoint respects this by limiting claimed jobs to the worker's capacity.

## Atomic Job Claiming

The job claiming flow is the most critical concurrent operation:

1. Worker sends `POST /workers/:id/claim` with desired queue IDs and limit.
2. Backend queries for jobs with `status IN (QUEUED, SCHEDULED)` AND `(runAt IS NULL OR runAt <= NOW())`.
3. Each job is updated in a transaction: `UPDATE jobs SET status='CLAIMED', claimedBy=..., claimedAt=NOW() WHERE id=... AND status='QUEUED'`.
4. The `where` condition prevents two workers from claiming the same job.
5. Execution logs are created for each claimed job.

This design provides **at-most-once** delivery semantics: a job is only claimed by one worker, and the claim is atomic.

## Scalability

- **Stateless API**: The NestJS backend can be horizontally scaled behind a load balancer. No server-side session state.
- **Distributed Locking**: Redis-backed distributed locks (via `RedisService.acquireLock`) coordinate scheduled job dispatching across instances.
- **Redis Pub/Sub**: WebSocket events are published to Redis and forwarded to all connected clients, regardless of which backend instance they're connected to.
- **Database Indexing**: The composite index on `(queue_id, status)` ensures efficient job polling even with millions of jobs.
- **UUID Primary Keys**: Enable application-level ID generation and future database sharding.

## Trade-offs

| Decision | Trade-off |
|---|---|
| REST over GraphQL | Simpler caching, wider tooling support, but potentially over-fetching |
| HTTP polling workers | Simpler than persistent gRPC streams, but higher latency |
| PostgreSQL over Redis streams | Stronger consistency guarantees, but more operational overhead |
| Prisma over raw SQL | Type safety and DX, but some query optimization flexibility lost |
| Cookie-based refresh tokens | CSRF protection needed, but XSS-safe |
| Monolithic backend (NestJS) | Simpler deployment than microservices, but co-tenancy of concerns |

## Reliability Considerations

1. **Idempotent Job Submission**: The `idempotencyKey` with unique constraint prevents duplicate job creation even if the request is retried.
2. **Token Rotation**: Refresh tokens are single-use; stolen tokens are invalidated on first use by the legitimate client.
3. **Global Exception Filter**: Catches and formats all exceptions uniformly, including Prisma errors which are mapped to appropriate HTTP status codes.
4. **Environment Validation**: On startup, required env vars are validated. The app fails fast if secrets are missing or too short, avoiding runtime errors.
5. **Helmet Middleware**: Sets secure HTTP headers (CSP, X-Frame-Options, etc.) to mitigate common web vulnerabilities.
6. **Rate Limiting**: Global throttle of 100 requests per 60 seconds (configurable) prevents API abuse.
7. **Graceful Shutdown**: NestJS `enableShutdownHooks` ensures clean database connection teardown.
