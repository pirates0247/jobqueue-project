# API Documentation

Base URL: `http://localhost:4000/api/v1`

All responses are wrapped in a standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-07-03T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

Error responses:
```json
{
  "success": false,
  "statusCode": 401,
  "path": "/api/v1/auth/login",
  "timestamp": "2026-07-03T12:00:00.000Z",
  "message": "Invalid email or password",
  "error": "UnauthorizedException"
}
```

Paginated responses:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  },
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

---

## Authentication

### POST /auth/register

Register a new user account.

**Authentication**: None (Public)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules**:
- `email`: valid email format
- `password`: 8-72 chars, must contain uppercase, lowercase, and digit
- `firstName`: 1-50 chars
- `lastName`: 1-50 chars

**Response** `201 Created`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbG..."
}
```

Also sets `refresh_token` as httpOnly cookie (path: `/api/v1/auth`, 7d expiry).

**Status Codes**:
| Code | Description |
|---|---|
| 201 | User created successfully |
| 409 | Email already exists |

---

### POST /auth/login

Authenticate with email and password.

**Authentication**: None (Public)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response** `200 OK`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbG..."
}
```

Also sets `refresh_token` as httpOnly cookie.

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Login successful |
| 401 | Invalid email or password |

---

### POST /auth/refresh

Exchange a refresh token for a new access + refresh token pair (rotation).

**Authentication**: Refresh Token (from httpOnly cookie, body, or Authorization header)

**Request Body**: (none required, can pass `refreshToken` in body)

**Response** `200 OK`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbG..."
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Token refreshed |
| 401 | Invalid or expired refresh token |

---

### POST /auth/logout

Revoke the current refresh token.

**Authentication**: Refresh Token

**Response** `204 No Content`

---

### GET /auth/me

Get the currently authenticated user's information.

**Authentication**: JWT Access Token (Bearer)

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | User info returned |
| 401 | Invalid or expired access token |

---

## Health

### GET /health

Check if the database and Redis are reachable.

**Authentication**: None (Public)

**Response** `200 OK`:
```json
{
  "status": "ok",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "uptime": 12345.67
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | All services healthy (or degraded) |

---

## Organizations

### POST /organizations

Create a new organization. The creator becomes the OWNER.

**Authentication**: JWT

**Request Body**:
```json
{
  "name": "My Organization",
  "slug": "my-org"
}
```

**Validation**: slug must match `^[a-z0-9-]+$`, 2-50 chars.

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "name": "My Organization",
  "slug": "my-org",
  "role": "OWNER",
  "memberCount": 1,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 201 | Organization created |
| 409 | Slug already exists |

---

### GET /organizations

List organizations the current user belongs to.

**Authentication**: JWT

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "name": "My Organization",
    "slug": "my-org",
    "role": "OWNER",
    "memberCount": 5,
    "createdAt": "2026-07-03T12:00:00.000Z",
    "updatedAt": "2026-07-03T12:00:00.000Z"
  }
]
```

---

### GET /organizations/:slug

Get organization details by slug.

**Authentication**: JWT (must be a member)

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "name": "My Organization",
  "slug": "my-org",
  "role": "OWNER",
  "memberCount": 5,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Organization found |
| 404 | Not found or not a member |

---

### PUT /organizations/:slug

Update organization name.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Request Body**:
```json
{
  "name": "Updated Name"
}
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "slug": "my-org",
  "role": "OWNER",
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Organization updated |
| 403 | Insufficient permissions |
| 404 | Organization not found |

---

### DELETE /organizations/:slug

Delete an organization and all associated resources.

**Authentication**: JWT — Roles: OWNER

**Response** `204 No Content`

**Status Codes**:
| Code | Description |
|---|---|
| 204 | Organization deleted |
| 403 | Not the owner |

---

### GET /organizations/:slug/members

List all members of an organization.

**Authentication**: JWT (must be a member)

**Response** `200 OK`:
```json
[
  {
    "id": "membership-uuid",
    "userId": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "DEVELOPER",
    "createdAt": "2026-07-03T12:00:00.000Z"
  }
]
```

---

### POST /organizations/:slug/members

Invite a user to the organization.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Request Body**:
```json
{
  "email": "user@example.com",
  "role": "DEVELOPER"
}
```

**Role Options**: OWNER, ADMIN, DEVELOPER, VIEWER

**Response** `201 Created`:
```json
{
  "id": "membership-uuid",
  "userId": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "DEVELOPER",
  "createdAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 201 | Member invited |
| 404 | User with email not found |
| 409 | Already a member |

---

### PUT /organizations/:slug/members/:memberId

Update a member's role.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Request Body**:
```json
{
  "role": "ADMIN"
}
```

**Response** `200 OK`:
```json
{
  "id": "membership-uuid",
  "userId": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN",
  "createdAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Role updated |
| 403 | Cannot modify owner role (non-owner) |
| 404 | Member not found |

---

### DELETE /organizations/:slug/members/:memberId

Remove a member from the organization.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `204 No Content`

**Status Codes**:
| Code | Description |
|---|---|
| 204 | Member removed |
| 403 | Cannot remove owner, cannot remove self |

---

## Projects

### POST /organizations/:slug/projects

Create a new project within an organization.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Request Body**:
```json
{
  "name": "My Project",
  "slug": "my-project",
  "description": "Optional description"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "organizationId": "org-uuid",
  "name": "My Project",
  "slug": "my-project",
  "description": "Optional description",
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 201 | Project created |
| 409 | Slug already exists in this org |

---

### GET /organizations/:slug/projects

List projects in an organization.

**Authentication**: JWT (must be a member)

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | string | desc | asc or desc |
| `search` | string | — | Search by name or slug |

**Response** `200 OK`:
```json
{
  "projects": [
    {
      "id": "uuid",
      "organizationId": "org-uuid",
      "name": "My Project",
      "slug": "my-project",
      "description": null,
      "createdAt": "2026-07-03T12:00:00.000Z",
      "updatedAt": "2026-07-03T12:00:00.000Z",
      "_count": { "queues": 3 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET /organizations/:slug/projects/:projectSlug

Get project details.

**Authentication**: JWT (must be a member)

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "organizationId": "org-uuid",
  "name": "My Project",
  "slug": "my-project",
  "description": null,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z",
  "_count": { "queues": 3 }
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Project found |
| 404 | Project not found |

---

### PUT /organizations/:slug/projects/:projectSlug

Update a project.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Request Body**:
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "organizationId": "org-uuid",
  "name": "Updated Name",
  "slug": "my-project",
  "description": "Updated description",
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

---

### DELETE /organizations/:slug/projects/:projectSlug

Delete a project and all its queues and jobs.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `204 No Content`

---

## Queues

### POST /organizations/:slug/projects/:projectSlug/queues

Create a new queue within a project.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Request Body**:
```json
{
  "name": "email-tasks",
  "priority": 0,
  "concurrencyLimit": 5,
  "retryStrategy": "EXPONENTIAL",
  "maxRetries": 3,
  "baseRetryDelayMs": 1000
}
```

**Defaults**: priority=0, concurrencyLimit=5, retryStrategy=EXPONENTIAL, maxRetries=3, baseRetryDelayMs=1000

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "name": "email-tasks",
  "status": "ACTIVE",
  "priority": 0,
  "concurrencyLimit": 5,
  "retryStrategy": "EXPONENTIAL",
  "maxRetries": 3,
  "baseRetryDelayMs": 1000,
  "shardCount": 1,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 201 | Queue created |
| 409 | Queue name already exists in this project |

---

### GET /organizations/:slug/projects/:projectSlug/queues

List queues in a project.

**Authentication**: JWT (must be a member)

**Query Parameters**: page, limit, sortBy, sortOrder, search

**Response** `200 OK`:
```json
{
  "queues": [
    {
      "id": "uuid",
      "projectId": "project-uuid",
      "name": "email-tasks",
      "status": "ACTIVE",
      "priority": 0,
      "concurrencyLimit": 5,
      "retryStrategy": "EXPONENTIAL",
      "maxRetries": 3,
      "baseRetryDelayMs": 1000,
      "shardCount": 1,
      "createdAt": "2026-07-03T12:00:00.000Z",
      "updatedAt": "2026-07-03T12:00:00.000Z",
      "_count": { "jobs": 42 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET /organizations/:slug/projects/:projectSlug/queues/:name

Get queue details by name.

**Authentication**: JWT

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "name": "email-tasks",
  "status": "ACTIVE",
  "priority": 0,
  "concurrencyLimit": 5,
  "retryStrategy": "EXPONENTIAL",
  "maxRetries": 3,
  "baseRetryDelayMs": 1000,
  "shardCount": 1,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z",
  "_count": { "jobs": 42 }
}
```

---

### PUT /organizations/:slug/projects/:projectSlug/queues/:name

Update queue configuration.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Request Body**:
```json
{
  "priority": 5,
  "concurrencyLimit": 10,
  "retryStrategy": "LINEAR",
  "maxRetries": 5,
  "baseRetryDelayMs": 2000
}
```

All fields optional.

**Response** `200 OK` (returns updated queue)

---

### POST /organizations/:slug/projects/:projectSlug/queues/:name/pause

Pause a queue. No new jobs will be processed while paused.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "name": "email-tasks",
  "status": "PAUSED",
  ...
}
```

---

### POST /organizations/:slug/projects/:projectSlug/queues/:name/resume

Resume a paused queue.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "name": "email-tasks",
  "status": "ACTIVE",
  ...
}
```

---

### DELETE /organizations/:slug/projects/:projectSlug/queues/:name

Delete a queue and all its jobs.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `204 No Content`

---

### GET /organizations/:slug/projects/:projectSlug/queues/:name/stats

Get queue statistics broken down by job status.

**Authentication**: JWT

**Response** `200 OK`:
```json
{
  "total": 100,
  "byStatus": {
    "QUEUED": 30,
    "SCHEDULED": 5,
    "CLAIMED": 3,
    "RUNNING": 2,
    "COMPLETED": 50,
    "FAILED": 8,
    "CANCELLED": 2
  }
}
```

---

## Jobs

### POST /organizations/:slug/projects/:projectSlug/queues/:name/jobs

Create a new job in a queue.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Request Body**:
```json
{
  "type": "IMMEDIATE",
  "payload": { "task": "send-email", "to": "user@example.com" },
  "priority": 0,
  "maxRetries": 3,
  "cronExpression": null,
  "runAt": null,
  "idempotencyKey": null,
  "batchId": null,
  "parentJobId": null
}
```

**Types**: IMMEDIATE, DELAYED, SCHEDULED, RECURRING, BATCH
- `IMMEDIATE`: Processed as soon as a worker claims it
- `DELAYED`: Requires `runAt` (future timestamp)
- `SCHEDULED` / `RECURRING`: Requires `cronExpression`

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "queueId": "queue-uuid",
  "type": "IMMEDIATE",
  "status": "QUEUED",
  "payload": { "task": "send-email" },
  "priority": 0,
  "attempts": 0,
  "maxRetries": 3,
  "cronExpression": null,
  "runAt": null,
  "claimedBy": null,
  "claimedAt": null,
  "startedAt": null,
  "completedAt": null,
  "failedAt": null,
  "idempotencyKey": null,
  "batchId": null,
  "parentJobId": null,
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 201 | Job created |
| 400 | Queue is paused, invalid type, or idempotency key duplicate |
| 404 | Queue not found |

---

### GET /organizations/:slug/projects/:projectSlug/queues/:name/jobs

List jobs in a queue.

**Authentication**: JWT

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | string | desc | asc or desc |
| `status` | string | — | Filter by job status |
| `type` | string | — | Filter by job type |

**Response** `200 OK`:
```json
{
  "jobs": [
    {
      "id": "uuid",
      "queueId": "queue-uuid",
      "type": "IMMEDIATE",
      "status": "QUEUED",
      "payload": { "task": "send-email" },
      "priority": 0,
      "attempts": 0,
      "maxRetries": 3,
      "createdAt": "2026-07-03T12:00:00.000Z",
      "updatedAt": "2026-07-03T12:00:00.000Z",
      "_count": { "executionLogs": 0 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET /organizations/:slug/projects/:projectSlug/queues/:name/jobs/:jobId

Get job details with execution logs and retry history.

**Authentication**: JWT

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "queueId": "queue-uuid",
  "type": "IMMEDIATE",
  "status": "COMPLETED",
  "payload": { "task": "send-email" },
  "priority": 0,
  "attempts": 1,
  "maxRetries": 3,
  "claimedBy": "worker-uuid",
  "claimedAt": "2026-07-03T12:00:00.000Z",
  "startedAt": "2026-07-03T12:00:01.000Z",
  "completedAt": "2026-07-03T12:00:02.000Z",
  "executionLogs": [
    {
      "id": "log-uuid",
      "jobId": "job-uuid",
      "workerId": "worker-uuid",
      "level": "info",
      "message": "Job claimed by worker worker-1",
      "createdAt": "2026-07-03T12:00:01.000Z"
    }
  ],
  "retryHistory": []
}
```

---

### POST /organizations/:slug/projects/:projectSlug/queues/:name/jobs/:jobId/retry

Manually retry a failed job. Resets attempts to 0 and sets status to QUEUED.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "status": "QUEUED",
  "attempts": 0,
  ...
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Job queued for retry |
| 400 | Job is not in FAILED status |

---

### POST /organizations/:slug/projects/:projectSlug/queues/:name/jobs/:jobId/cancel

Cancel a queued or scheduled job.

**Authentication**: JWT — Roles: OWNER, ADMIN, DEVELOPER

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "status": "CANCELLED",
  ...
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Job cancelled |
| 400 | Job is not in QUEUED or SCHEDULED status |

---

### DELETE /organizations/:slug/projects/:projectSlug/queues/:name/jobs/:jobId

Delete a job permanently.

**Authentication**: JWT — Roles: OWNER, ADMIN

**Response** `204 No Content`

---

## Workers

### POST /workers/register

Register a new worker process.

**Authentication**: None (Worker registration)

**Request Body**:
```json
{
  "name": "worker-1",
  "hostname": "server-01",
  "concurrency": 5,
  "metadata": { "version": "1.0.0", "tags": ["production"] }
}
```

**Response** `201 Created`:
```json
{
  "id": "worker-uuid",
  "name": "worker-1",
  "status": "ONLINE",
  "lastHeartbeat": "2026-07-03T12:00:00.000Z",
  "hostname": "server-01",
  "concurrency": 5,
  "metadata": { "version": "1.0.0", "tags": ["production"] },
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:00.000Z"
}
```

---

### POST /workers/:id/heartbeat

Update worker heartbeat to keep it marked as ONLINE.

**Authentication**: None

**Response** `200 OK`:
```json
{
  "id": "worker-uuid",
  "status": "ONLINE",
  "lastHeartbeat": "2026-07-03T12:00:01.000Z",
  ...
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Heartbeat recorded |
| 404 | Worker not found |

---

### POST /workers/:id/claim

Atomically claim available jobs for a worker.

**Authentication**: None

**Request Body**:
```json
{
  "queueIds": ["queue-uuid-1", "queue-uuid-2"],
  "limit": 5
}
```

**Response** `200 OK`:
```json
{
  "claimed": [
    {
      "id": "job-uuid",
      "queueId": "queue-uuid-1",
      "type": "IMMEDIATE",
      "status": "CLAIMED",
      "payload": { "task": "send-email" },
      "priority": 5,
      "claimedBy": "worker-uuid",
      "claimedAt": "2026-07-03T12:00:01.000Z",
      "startedAt": "2026-07-03T12:00:01.000Z"
    }
  ]
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Jobs claimed (may be empty array) |
| 404 | Worker not found |

---

### POST /workers/:id/jobs/:jobId/complete

Mark a claimed job as completed.

**Authentication**: None

**Request Body**:
```json
{
  "result": "Email sent successfully"
}
```

**Response** `200 OK` (returns updated job):
```json
{
  "id": "job-uuid",
  "status": "COMPLETED",
  "completedAt": "2026-07-03T12:00:02.000Z",
  ...
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Job completed |
| 400 | Job not claimed by this worker |
| 404 | Job or worker not found |

---

### POST /workers/:id/jobs/:jobId/fail

Mark a claimed job as failed. If retries remain, the job is rescheduled with backoff delay.

**Authentication**: None

**Request Body**:
```json
{
  "error": "Connection timeout"
}
```

**Response** `200 OK`:
```json
{
  "id": "job-uuid",
  "status": "SCHEDULED",
  "attempts": 1,
  "runAt": "2026-07-03T12:00:03.000Z",
  ...
}
```

When max retries exceeded:
```json
{
  "id": "job-uuid",
  "status": "FAILED",
  "attempts": 4,
  "failedAt": "2026-07-03T12:00:03.000Z",
  ...
}
```

**Retry Delay Calculation**:
- **FIXED**: `baseRetryDelayMs`
- **LINEAR**: `baseRetryDelayMs * attempt`
- **EXPONENTIAL**: `baseRetryDelayMs * 2^(attempt - 1)`

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Job failed (with or without scheduling retry) |
| 400 | Job not claimed by this worker |
| 404 | Job or worker not found |

---

### GET /workers

List all workers. Stale workers (no heartbeat for 30s) are automatically marked OFFLINE.

**Authentication**: None

**Response** `200 OK`:
```json
[
  {
    "id": "worker-uuid",
    "name": "worker-1",
    "status": "ONLINE",
    "lastHeartbeat": "2026-07-03T12:00:01.000Z",
    "hostname": "server-01",
    "concurrency": 5,
    "metadata": { "version": "1.0.0" },
    "createdAt": "2026-07-03T12:00:00.000Z",
    "updatedAt": "2026-07-03T12:00:01.000Z"
  }
]
```

---

### GET /workers/:id

Get worker details.

**Authentication**: None

**Response** `200 OK`:
```json
{
  "id": "worker-uuid",
  "name": "worker-1",
  "status": "ONLINE",
  "lastHeartbeat": "2026-07-03T12:00:01.000Z",
  "hostname": "server-01",
  "concurrency": 5,
  "metadata": { "version": "1.0.0" },
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:00:01.000Z"
}
```

**Status Codes**:
| Code | Description |
|---|---|
| 200 | Worker found |
| 404 | Worker not found |

---

### DELETE /workers/:id

Remove a worker.

**Authentication**: None

**Response** `204 No Content`

---

## Dashboard

### GET /dashboard/metrics

Get aggregate metrics across the entire system.

**Authentication**: JWT

**Response** `200 OK`:
```json
{
  "totalJobs": 1000,
  "totalQueues": 10,
  "totalWorkers": 5,
  "onlineWorkers": 3,
  "totalProjects": 8,
  "totalOrganizations": 2,
  "jobsByStatus": {
    "QUEUED": 45,
    "SCHEDULED": 12,
    "CLAIMED": 3,
    "RUNNING": 2,
    "COMPLETED": 880,
    "RETRYING": 1,
    "FAILED": 45,
    "DEAD_LETTER": 0,
    "CANCELLED": 12
  },
  "recentJobs": [
    {
      "id": "job-uuid",
      "type": "IMMEDIATE",
      "status": "COMPLETED",
      "queueId": "queue-uuid",
      "createdAt": "2026-07-03T12:00:00.000Z"
    }
  ]
}
```

---

## WebSocket Events

**Endpoint**: `ws://localhost:4000/events`

**Connection**: Pass JWT token and optional orgSlug as query parameters:
```
ws://localhost:4000/events?token=eyJhbG...&orgSlug=my-org
```

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `job:created` | `{ queueId, job }` | A new job was created |
| `job:updated` | `{ jobId, status, queueId }` | A job's status changed |
| `queue:updated` | `{ queueId, status }` | A queue was paused or resumed |
| `worker:heartbeat` | `{ workerId, status }` | A worker sent a heartbeat |
