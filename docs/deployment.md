# Deployment Guide

## Docker Deployment (Recommended)

### Prerequisites

- Docker 24+
- Docker Compose v2+

### Production Deployment

```bash
# Clone the repository
git clone <repository-url>
cd jobqueue-saas

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env for production
# - Set strong JWT secrets (openssl rand -hex 32)
# - Update DATABASE_URL for production PostgreSQL
# - Set NODE_ENV=production

# Start all services
docker compose up --build -d

# Check logs
docker compose logs -f
```

### Production docker-compose.yml

Create a `docker-compose.prod.yml` for production-specific settings:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_USER: jobqueue
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: jobqueue
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jobqueue"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redisdata:/data

  backend:
    build: ./backend
    restart: always
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://jobqueue:${DB_PASSWORD}@postgres:5432/jobqueue?schema=public
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
      CORS_ORIGIN: https://app.yourdomain.com
      THROTTLE_TTL: 60
      THROTTLE_LIMIT: 100
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com
      NEXT_PUBLIC_WS_URL: wss://api.yourdomain.com
    depends_on:
      - backend

volumes:
  pgdata:
  redisdata:
```

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | development | `development`, `production`, or `test` |
| `PORT` | Yes | 4000 | Application port |
| `API_PREFIX` | Yes | api/v1 | API route prefix |
| `CORS_ORIGIN` | Yes | http://localhost:3000 | Allowed CORS origin |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | redis://localhost:6379 | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | — | At least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | Yes | 15m | Access token expiry |
| `JWT_REFRESH_SECRET` | Yes | — | At least 32 characters |
| `JWT_REFRESH_EXPIRES_IN` | Yes | 7d | Refresh token expiry |
| `THROTTLE_TTL` | No | 60 | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | 100 | Max requests per window |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:4000 | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | Yes | ws://localhost:4000 | WebSocket endpoint |

## Production Build

### Backend

```bash
cd backend
npm ci --omit=dev
npx prisma generate
npm run build
node dist/main.js
```

### Frontend

```bash
cd frontend
npm ci --omit=dev
npm run build
node_modules/.bin/next start
```

## Reverse Proxy Example

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/jobqueue

upstream backend {
    server 127.0.0.1:4000;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /events {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
    }
}
```

### Caddy Configuration

```caddy
app.yourdomain.com {
    reverse_proxy /api/* backend:4000
    reverse_proxy /events backend:4000 {
        header_up Upgrade {>Upgrade}
        header_up Connection {>Connection}
    }
    reverse_proxy frontend:3000
}
```

## Health Checks

### Endpoint

```
GET /api/v1/health
```

### Response

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

### Health Check Configuration

#### Docker Compose

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:4000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

#### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
```

#### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 30
```

## Scaling Workers

Workers are external processes that register with the API. To scale:

### Multiple Worker Instances

```bash
# Register and run worker 1
curl -X POST http://localhost:4000/api/v1/workers/register \
  -H "Content-Type: application/json" \
  -d '{"name": "worker-1", "concurrency": 5}'

# Register and run worker 2
curl -X POST http://localhost:4000/api/v1/workers/register \
  -H "Content-Type: application/json" \
  -d '{"name": "worker-2", "concurrency": 5}'
```

Each worker polls for jobs independently. The atomic claiming mechanism ensures no job is processed twice.

### Worker Polling Loop

Workers should implement a polling loop:

```python
import time
import requests

WORKER_ID = "worker-uuid"
API_URL = "http://localhost:4000/api/v1"

while True:
    # Heartbeat
    requests.post(f"{API_URL}/workers/{WORKER_ID}/heartbeat")

    # Claim jobs
    resp = requests.post(f"{API_URL}/workers/{WORKER_ID}/claim", json={
        "queueIds": ["queue-uuid"],
        "limit": 5
    })
    jobs = resp.json()["data"]["claimed"]

    for job in jobs:
        try:
            # Execute job
            result = process_job(job["payload"])
            requests.post(f"{API_URL}/workers/{WORKER_ID}/jobs/{job['id']}/complete",
                json={"result": result})
        except Exception as e:
            requests.post(f"{API_URL}/workers/{WORKER_ID}/jobs/{job['id']}/fail",
                json={"error": str(e)})

    time.sleep(1)
```

## Database Backup

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh — Schedule via cron: 0 2 * * * /path/to/backup.sh

BACKUP_DIR="/backups/postgres"
DB_URL="postgresql://jobqueue:password@localhost:5432/jobqueue"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="jobqueue_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump "$DB_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep last 30 days
find "$BACKUP_DIR" -name "jobqueue_*.sql.gz" -mtime +30 -delete

echo "Backup created: ${BACKUP_DIR}/${FILENAME}"
```

### Docker Volume Backup

```bash
# Backup PostgreSQL volume
docker run --rm -v jobqueue-saas_pgdata:/data -v /backups:/backup alpine \
  tar czf /backup/pgdata_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore

```bash
gunzip < jobqueue_20260703_020000.sql.gz | psql postgresql://jobqueue:password@localhost:5432/jobqueue
```

## Monitoring

### Application Metrics

The dashboard endpoint provides key metrics:

```
GET /api/v1/dashboard/metrics
```

Response includes:
- `totalJobs` — Total job count
- `jobsByStatus` — Breakdown by status
- `totalQueues` — Number of queues
- `totalWorkers` — Registered workers
- `onlineWorkers` — Currently online workers
- `recentJobs` — Last 10 jobs created

### Logging

The backend uses NestJS Logger with levels:
- **Error**: 500+ responses and database errors
- **Warn**: 4xx responses and non-critical issues
- **Log**: Application startup and lifecycle events
- **Debug**: Detailed request information (development only)

### Prometheus Integration (Future)

To add Prometheus metrics:

```bash
npm install @nestjs/prometheus prom-client
```

Expose metrics at `GET /metrics` for scraping by Prometheus + Grafana.

### Common Monitoring Tools

| Tool | Purpose |
|---|---|
| Docker logs | Container log aggregation |
| pgAdmin | Database administration and monitoring |
| Redis Insight | Redis monitoring |
| Prometheus + Grafana | Metrics collection and visualization |
| Sentry | Error tracking and performance monitoring |
| UptimeRobot | External health check monitoring |
