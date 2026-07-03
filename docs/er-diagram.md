# Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Membership : "has"
    User ||--o{ RefreshToken : "has"
    Organization ||--o{ Membership : "has"
    Organization ||--o{ Project : "has"
    Project ||--o{ Queue : "has"
    Queue ||--o{ Job : "has"
    Job ||--o{ ExecutionLog : "has"
    Job ||--o{ RetryHistory : "has"
    Worker ||--o{ ExecutionLog : "writes"

    User {
        uuid id PK
        string email UK "unique, lowercase"
        string password_hash
        string first_name
        string last_name
        boolean is_active "default true"
        datetime created_at
        datetime updated_at
    }

    RefreshToken {
        uuid id PK
        string user_id FK "references User(id)"
        string token_hash "SHA-256 of refresh token"
        string user_agent "nullable"
        string ip_address "nullable"
        boolean revoked "default false"
        datetime expires_at
        datetime created_at
        index user_id "for fast lookup"
    }

    Organization {
        uuid id PK
        string name
        string slug UK "unique"
        datetime created_at
        datetime updated_at
    }

    Membership {
        uuid id PK
        string user_id FK "references User(id)"
        string organization_id FK "references Organization(id)"
        enum role "OWNER | ADMIN | DEVELOPER | VIEWER"
        datetime created_at
        unique user_id + organization_id "composite unique"
        index organization_id "for org member listing"
    }

    Project {
        uuid id PK
        string organization_id FK "references Organization(id)"
        string name
        string slug "unique per org"
        string description "nullable"
        datetime created_at
        datetime updated_at
        unique organization_id + slug "composite unique"
        index organization_id "for org project listing"
    }

    Queue {
        uuid id PK
        string project_id FK "references Project(id)"
        string name "unique per project"
        enum status "ACTIVE | PAUSED"
        int priority "default 0"
        int concurrency_limit "default 5"
        enum retry_strategy "FIXED | LINEAR | EXPONENTIAL"
        int max_retries "default 3"
        int base_retry_delay_ms "default 1000"
        int shard_count "default 1"
        datetime created_at
        datetime updated_at
        unique project_id + name "composite unique"
        index project_id "for project queue listing"
    }

    Job {
        uuid id PK
        string queue_id FK "references Queue(id)"
        enum type "IMMEDIATE | DELAYED | SCHEDULED | RECURRING | BATCH"
        enum status "QUEUED | SCHEDULED | CLAIMED | RUNNING | COMPLETED | RETRYING | FAILED | DEAD_LETTER | CANCELLED"
        json payload
        int priority "default 0"
        int attempts "default 0"
        int max_retries "default 3"
        string cron_expression "nullable"
        datetime run_at "nullable, for delayed/scheduled"
        string claimed_by "nullable, worker ID"
        datetime claimed_at "nullable"
        datetime started_at "nullable"
        datetime completed_at "nullable"
        datetime failed_at "nullable"
        string idempotency_key "nullable, unique per queue"
        string batch_id "nullable"
        string parent_job_id "nullable"
        datetime created_at
        datetime updated_at
        unique queue_id + idempotency_key "when key provided"
        index queue_id + status "for job polling"
        index run_at "for scheduled job queries"
    }

    ExecutionLog {
        uuid id PK
        string job_id FK "references Job(id)"
        string worker_id "nullable"
        string level "info | warn | error"
        string message
        json metadata "nullable"
        datetime created_at
        index job_id "for job timeline queries"
    }

    RetryHistory {
        uuid id PK
        string job_id FK "references Job(id)"
        int attempt
        string reason "nullable"
        int delay_ms
        datetime scheduled_at
        datetime created_at
        index job_id "for retry history queries"
    }

    Worker {
        uuid id PK
        string name
        enum status "ONLINE | OFFLINE | DRAINING"
        datetime last_heartbeat "nullable"
        string hostname "nullable"
        int concurrency "default 1"
        json metadata "nullable"
        datetime created_at
        datetime updated_at
    }
```

## Cardinality Summary

| Relationship | Type | Description |
|---|---|---|
| User → Membership | One-to-Many | A user can belong to many organizations |
| User → RefreshToken | One-to-Many | A user can have many active refresh tokens |
| Organization → Membership | One-to-Many | An organization can have many members |
| Organization → Project | One-to-Many | An organization can have many projects |
| Project → Queue | One-to-Many | A project can have many queues |
| Queue → Job | One-to-Many | A queue can have many jobs |
| Job → ExecutionLog | One-to-Many | A job can have many execution log entries |
| Job → RetryHistory | One-to-Many | A job can have many retry history entries |
| Worker → ExecutionLog | One-to-Many (implicit) | A worker can write many execution logs |

## Index Recommendations

| Table | Index | Type | Purpose |
|---|---|---|---|
| `refresh_tokens` | `(user_id)` | B-tree | Fast lookup of user refresh tokens |
| `memberships` | `(organization_id)` | B-tree | List members by organization |
| `memberships` | `(user_id, organization_id)` | Unique | Prevent duplicate memberships |
| `projects` | `(organization_id)` | B-tree | List projects by organization |
| `projects` | `(organization_id, slug)` | Unique | Multi-tenant unique slug |
| `queues` | `(project_id)` | B-tree | List queues by project |
| `queues` | `(project_id, name)` | Unique | Multi-tenant unique queue name |
| `jobs` | `(queue_id, status)` | Composite B-tree | Efficient worker job polling |
| `jobs` | `(run_at)` | B-tree | Scheduled job queries |
| `jobs` | `(queue_id, idempotency_key)` | Unique | Idempotency enforcement |
| `execution_logs` | `(job_id)` | B-tree | Job timeline queries |
| `retry_history` | `(job_id)` | B-tree | Retry history queries |
