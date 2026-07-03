# Testing Documentation

## Overview

The project uses a multi-layered testing strategy combining unit tests, integration tests, and end-to-end tests. The backend uses Jest + Supertest, and the frontend uses Playwright for E2E testing.

## Test Structure

```
backend/
├── src/
│   └── modules/
│       ├── auth/
│       │   └── auth.service.spec.ts
│       ├── projects/
│       │   └── projects.service.spec.ts
│       ├── queues/
│       │   └── queues.service.spec.ts
│       └── jobs/
│           └── jobs.service.spec.ts
└── test/
    ├── jest-e2e.json
    └── auth.e2e-spec.ts
```

## Unit Tests

Unit tests verify individual service methods in isolation with mocked dependencies.

### Running Unit Tests

```bash
cd backend
npm run test           # Run all unit tests
npm run test:watch     # Watch mode
npm run test:cov       # With coverage report
```

### Jest Configuration

Defined in `backend/package.json`:
- **Root directory**: `src`
- **Test pattern**: `*.spec.ts`
- **Transformer**: ts-jest
- **Environment**: node
- **Coverage directory**: `../coverage`

### Current Unit Tests

| Test File | What It Tests | Coverage |
|---|---|---|
| `auth.service.spec.ts` | AuthService.register (duplicate email, success), AuthService.login (unknown user, wrong password, valid credentials) | AuthService methods |
| `projects.service.spec.ts` | ProjectsService.create (duplicate slug, success), findBySlug (not found, found) | ProjectsService CRUD |
| `queues.service.spec.ts` | QueuesService.create (duplicate name, success with defaults), findByName (not found) | QueuesService CRUD |
| `jobs.service.spec.ts` | JobsService.create (queue not found, job created with defaults) | JobsService creation |

### Writing Unit Tests

Tests use `@nestjs/testing` to create isolated test modules:

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should throw on duplicate email', async () => {
    await expect(service.register(...)).rejects.toThrow(ConflictException);
  });
});
```

## Integration Tests

Integration tests verify the interaction between services and the database.

Since Prisma is used as the data access layer, integration tests typically:
1. Create a test module with real PrismaService (connected to a test database)
2. Execute service methods
3. Verify database state via Prisma queries
4. Clean up test data

The `PrismaService.cleanDatabase()` method truncates all tables (except `_prisma_migrations`) for test isolation.

## End-to-End Tests

E2E tests verify the full HTTP request/response cycle from controller to database.

### Running E2E Tests

```bash
cd backend
npm run test:e2e       # Run full E2E test suite
```

### E2E Configuration

Defined in `backend/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

### Current E2E Tests

| Test File | What It Tests |
|---|---|
| `auth.e2e-spec.ts` | Full auth flow: register → duplicate register → login → wrong password → refresh via cookie |

The E2E test requires:
- Running PostgreSQL instance (with migrations applied)
- Running Redis instance
- The test cleans up after itself via `cleanDatabase()`

### Writing E2E Tests

Tests use Supertest for HTTP assertions:

```typescript
import * as request from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /auth/register', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'test@test.com', password: 'TestPass1', firstName: 'Test', lastName: 'User' });
    expect(res.status).toBe(201);
  });
});
```

## Frontend Tests

### E2E Tests (Playwright)

```bash
cd frontend
npm run test:e2e
```

Playwright is configured in `frontend/package.json`:
```json
"test:e2e": "playwright test"
```

No Playwright test files exist yet. To add frontend E2E tests, create spec files in `frontend/tests/`.

## Test Strategy Summary

| Layer | Tool | Scope | Frequency |
|---|---|---|---|
| Unit Tests | Jest | Individual services with mocked deps | Every commit |
| Integration Tests | Jest + Prisma | Service + database interaction | Per feature |
| E2E Tests | Jest + Supertest | Full HTTP request/response cycle | Per feature |
| Frontend E2E | Playwright | User flows in browser | Per release |

## Coverage Goals

| Area | Target Coverage |
|---|---|
| Services | 90%+ |
| Controllers | 80%+ |
| Guards/Decorators | 100% |
| Overall | 85%+ |

## CI/CD Integration

Tests should be run in CI pipeline:
1. `npm run test` — unit tests
2. `npm run test:cov` — coverage report
3. `npm run test:e2e` — E2E tests (requires PostgreSQL + Redis services)
4. `cd frontend && npm run test:e2e` — frontend E2E tests

## Running All Tests

```bash
# Backend
cd backend
npm run test
npm run test:cov
npm run test:e2e       # Requires running PostgreSQL + Redis

# Frontend
cd frontend
npm run test:e2e       # Requires running application
```
