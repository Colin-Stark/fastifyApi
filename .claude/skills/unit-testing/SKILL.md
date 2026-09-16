---
name: unit-testing
description: Writes unit test for our Fastify API endpoints. it focuses on testing the API's functionality, response status codes, and data validation using the ES MODULE.
allowed-tools: Read, Grep, Glob, Write, Bash
---

When testing the API, take these into account:

- Project is using Fastify framework and has a RESTful API structure which is located at routes/api/v1/.
- Test the API's functionality, response status codes, and data validation.
- It can generate test cases for GET, POST, PUT, DELETE requests, and more.
- Uses Vitest as the testing framework (already configured in devDependencies).
- Tests should be placed in the `/test` directory at the project root.
- The project uses a PostgreSQL database (Neon) for data persistence.

## How to Write Unit Tests

1. **Test Structure**: Each test file should follow the naming convention `[route-name].test.js` and be placed in the `/test` directory.

2. **What to Test**:
   - Status codes for successful and error cases
   - Response body structure and content
   - Data validation (both valid and invalid inputs)
   - Authentication and authorization checks
   - Database interactions (when applicable)
   - Specific business logic for each endpoint
