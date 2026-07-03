# Screenshots Guide

Capture the following screenshots before final submission. Images should be saved in a `docs/screenshots/` directory.

## Required Screenshots

### 1. Login Page
- **File**: `docs/screenshots/login.png`
- **Description**: The login page showing the email/password form with the Pulse grid animation background.
- **Capture**: Navigate to `/login` while not authenticated.

### 2. Register Page
- **File**: `docs/screenshots/register.png`
- **Description**: The registration page showing the full registration form (email, password, first name, last name).
- **Capture**: Navigate to `/register`.

### 3. Dashboard
- **File**: `docs/screenshots/dashboard.png`
- **Description**: The main dashboard showing aggregate metrics: total jobs, queues, workers, projects, organizations, jobs by status breakdown, and recent jobs list.
- **Capture**: Navigate to `/dashboard` after logging in.

### 4. Organization Dashboard
- **File**: `docs/screenshots/organization-dashboard.png`
- **Description**: View of an organization showing its details and member list.
- **Capture**: Navigate to `/organizations/my-org`.

### 5. Organization Members
- **File**: `docs/screenshots/organization-members.png`
- **Description**: Member list showing all members with their roles (OWNER, ADMIN, DEVELOPER, VIEWER).
- **Capture**: Navigate to `/organizations/my-org/members`.

### 6. Projects List
- **File**: `docs/screenshots/projects.png`
- **Description**: List of projects within an organization.
- **Capture**: Navigate to `/organizations/my-org/projects`.

### 7. Create Project
- **File**: `docs/screenshots/create-project.png`
- **Description**: The project creation form.
- **Capture**: Navigate to `/organizations/my-org/projects/new`.

### 8. Queues List
- **File**: `docs/screenshots/queues.png`
- **Description**: Queue list within a project showing status, priority, concurrency limit, and job count.
- **Capture**: Navigate to `/organizations/my-org/projects/my-project/queues`.

### 9. Create Queue
- **File**: `docs/screenshots/create-queue.png`
- **Description**: Queue creation form with name, priority, concurrency, retry strategy, and retry configuration fields.
- **Capture**: Navigate to `/organizations/my-org/projects/my-project/queues/new`.

### 10. Queue Configuration
- **File**: `docs/screenshots/queue-configuration.png`
- **Description**: Queue detail page showing configuration and the option to pause/resume the queue.
- **Capture**: Navigate to `/organizations/my-org/projects/my-project/queues/my-queue`.

### 11. Queue Statistics
- **File**: `docs/screenshots/queue-stats.png`
- **Description**: Queue statistics breakdown by job status (QUEUED, COMPLETED, FAILED, etc.).
- **Capture**: Navigate to the queue stats view.

### 12. Jobs Explorer
- **File**: `docs/screenshots/jobs-explorer.png`
- **Description**: Job list for a queue with filtering by status and type, pagination.
- **Capture**: Navigate to `/organizations/my-org/projects/my-project/queues/my-queue/jobs`.

### 13. Create Job
- **File**: `docs/screenshots/create-job.png`
- **Description**: Job creation form with type selection, payload editor, and advanced options.
- **Capture**: Navigate to the job creation page.

### 14. Job Detail
- **File**: `docs/screenshots/job-detail.png`
- **Description**: Job detail view showing full payload, execution timeline (logs), and retry history.
- **Capture**: Navigate to a specific job's detail page.

### 15. Worker Dashboard
- **File**: `docs/screenshots/workers.png`
- **Description**: Worker list showing registered workers, their status (ONLINE/OFFLINE), last heartbeat, and concurrency.
- **Capture**: Navigate to `/workers`.

### 16. Dark Mode
- **File**: `docs/screenshots/dark-mode.png`
- **Description**: Any dashboard page with dark theme enabled.
- **Capture**: Toggle theme to dark mode and capture the dashboard or queue list page.

### 17. Light Mode
- **File**: `docs/screenshots/light-mode.png`
- **Description**: Any dashboard page with light theme enabled.
- **Capture**: Toggle theme to light mode and capture the same page as dark mode for comparison.

### 18. Health Check (API)
- **File**: `docs/screenshots/health-check.png`
- **Description**: Response from the health endpoint showing database and Redis status as "up".
- **Capture**: `curl http://localhost:4000/api/v1/health` or browser output.

### 19. API Error Response
- **File**: `docs/screenshots/api-error.png`
- **Description**: Example error response from the API showing the standardized error format.
- **Capture**: Attempt to access a protected route without authentication.

### 20. Docker Compose Running
- **File**: `docs/screenshots/docker-running.png`
- **Description**: Output of `docker compose ps` showing all services running.
- **Capture**: Run `docker compose ps` in the project root.

## Bonus Screenshots

| Screenshot | Description |
|---|---|
| `auth-token-refresh.png` | Network tab showing automatic token refresh on 401 |
| `websocket-events.png` | WebSocket connection and events in browser DevTools |
| `prisma-studio.png` | Prisma Studio showing database tables |
| `test-coverage.png` | Output of `npm run test:cov` showing coverage report |
| `e2e-test-passing.png` | Output of `npm run test:e2e` showing passing tests |

## Screenshot Guidelines

- **Resolution**: 1920×1080 or higher
- **Format**: PNG (lossless)
- **Naming**: lowercase kebab-case, descriptive
- **Size**: Keep individual files under 500KB (use compression if needed)
- **Relevance**: Only capture content relevant to the project features
