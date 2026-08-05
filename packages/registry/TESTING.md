# Testing Guide

## Overview

The TAIS Registry uses **Jest** for testing with the following test types:
- **Unit Tests** - Individual functions and modules
- **Integration Tests** - API routes with database
- **End-to-End Tests** - Full user workflows (future)

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts               # Test configuration and database cleanup
│   └── routes/
│       ├── health.test.ts     # Health endpoint tests
│       ├── skills.test.ts     # Skills API tests
│       ├── audits.test.ts     # Audits API tests
│       ├── agent.e2e.test.ts  # Agent routes end-to-end tests
│       ├── billing.e2e.test.ts # Billing routes end-to-end tests
│       ├── oauth.e2e.test.ts  # OAuth routes end-to-end tests
│       └── rcrt.e2e.test.ts   # RCRT routes end-to-end tests
```

There is no `factories.ts` test-data-generator file in `src/__tests__/`; test data is constructed inline in each test file.

## Running Tests

```bash
# Run all tests
cd packages/registry
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- skills.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

## Test Database

Tests use a separate PostgreSQL database to avoid affecting development data:

**Default:** `postgresql://postgres:postgres@localhost:5432/tais_registry_test`

**Configuration:** Set `TEST_DATABASE_URL` environment variable

### Setup Test Database

```bash
# Create test database
createdb tais_registry_test

# Or using Docker
docker run -d \
  --name tais-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tais_registry_test \
  -p 5432:5432 \
  postgres:15-alpine
```

## Writing Tests

There are no shared test-data factories in this codebase — each test builds the request payloads it needs inline.

### API Route Tests

```typescript
import request from 'supertest';
import app from '../../index';

describe('Skills API', () => {
  describe('GET /api/v1/skills', () => {
    it('should return skills list with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/skills')
        .expect(200);

      expect(response.body).toHaveProperty('skills');
    });
  });

  describe('POST /api/v1/skills', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/skills')
        .send({ name: 'Test Skill' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/skills/:hash', () => {
    it('should return 404 for non-existent skill', async () => {
      await request(app)
        .get('/api/v1/skills/nonexistenthash123')
        .expect(404);
    });
  });
});
```

### Database Tests

```typescript
import { prismaTest } from '../setup';

it('should store skill in database', async () => {
  const skill = await prismaTest.skill.create({
    data: {
      skillHash: 'test-hash',
      name: 'Test',
      version: '1.0.0',
      author: '0x123...',
      manifestCid: 'Qm...',
    },
  });

  const found = await prismaTest.skill.findUnique({
    where: { id: skill.id },
  });

  expect(found?.name).toBe('Test');
});
```

## Test Coverage

Coverage reports are generated in the `coverage/` directory:

```bash
# View HTML report
open coverage/lcov-report/index.html
```

`jest.config.js` does not currently define a `coverageThreshold`, so there is no enforced minimum coverage percentage — coverage is reported but not gated.

## Best Practices

1. **Clean Database State**
   - Database is automatically cleaned before/after each test
   - Use `beforeEach()` for test-specific setup
   - Avoid relying on data from other tests

2. **Test Independence**
   ```typescript
   // Good: Each test is independent
   it('should create skill', async () => {
     const response = await request(app).post('/api/v1/skills').send({ /* ... */ });
     // test logic
   });

   // Bad: Relies on previous test state
   it('should use skill from previous test', async () => {
     // This will fail unpredictably
   });
   ```

3. **Descriptive Test Names**
   ```typescript
   // Good
   it('should return 404 when skill does not exist', async () => {});

   // Bad
   it('test skill endpoint', async () => {});
   ```

4. **Test Edge Cases**
   ```typescript
   it('should handle empty arrays', async () => {});
   it('should validate input', async () => {});
   it('should handle database errors gracefully', async () => {});
   ```

5. **Keep Test Data Minimal**
   ```typescript
   // Only set the fields the test actually needs
   const skill = await prisma.skill.create({
     data: { skillHash: 'test', name: 'Test', version: '1.0.0', author: '0x123...', manifestCid: 'Qm...' }
   });
   ```

## CI/CD Testing

GitHub Actions runs tests automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

Tests run in parallel with:
1. **Lint Check** - Code style validation
2. **Unit Tests** - Jest with coverage
3. **Build Verification** - TypeScript compilation

## Debugging Tests

```bash
# Run single test file with verbose output
npm test -- health.test.ts --verbose

# Run with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Add console.log to tests
it('should work', async () => {
  const result = await someFunction();
  console.log('Result:', result);
  expect(result).toBe(true);
});
```

## Troubleshooting

### Database Connection Errors

```
Error: P1001: Can't reach database server
```

**Solution:** Ensure PostgreSQL is running:
```bash
# Check if database is running
docker ps | grep postgres

# Start database
docker start tais-test-db
```

### Migration Errors

```
Error: P3005: The database schema is not empty
```

**Solution:** Reset test database:
```bash
# Drop and recreate
dropdb tais_registry_test
createdb tais_registry_test

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tais_registry_test" npx prisma migrate dev
```

### Test Timeouts

```
thrown: "Exceeded timeout of 5000 ms for a test"
```

**Solution:** Tests have 30 second timeout by default. If hitting limits:
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // test logic
}, 60000);
```

## Future Improvements

- [ ] End-to-end tests with Playwright
- [ ] Load testing with k6
- [ ] Property-based testing with fast-check
- [ ] Contract testing with Pact
- [ ] Visual regression testing