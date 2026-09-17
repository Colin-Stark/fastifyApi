# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Development Commands

### Local Development
- **Start dev server (Docker)**: `docker compose up --build`
  -API available at http://localhost:3000
  -Uses bind mounts for instant code reloading
  -Node modules volume prevents container overwrites

- **Start dev server (direct)**: `npm run dev`
  -Uses nodemon for hot reloading
  -Runs node api/index.js directly

- **Start production server**: `npm start`
  -Runs node api/index.js without hot reloading

### Vercel Deployment
- **Vercel dev server**: `npm run vercel-dev`
  -Starts vercel dev for local testing

- **Deploy to Vercel**: `npm run vercel-deploy`
  -Deploys to production (`--prod` flag)
  
- **Live Deployment**: https://fastify-api-xi.vercel.app/

### Testing
- **Run tests**: `npm test`
  -Currently shows error: "Error: no test specified" (no test framework configured)
  -Add testing framework (Jest, Vitest, etc.) and update package.json to enable

### Database Connection
- The PostgreSQL connection check in api/index.js is commented out by default
- To enable DB connectivity verification, uncomment line 32: `await testNeonConnection();`
- Requires DATABASE_URL in .env file

## Code Architecture

### Entry Point
- **api/index.js**: Main Fastify application
  -Loads environment variables via dotenv
  -Optional Neon PostgreSQL connection sanity check
  -Initializes Fastify with logger and body limits
  -Registers routes via @fastify/autoload from routes directory
  -Exports Vercel-compatible handler

### Route Structure
- **routes/api/v1/**: Feature-based route organization
  -Each file exports an async function registering routes with Fastify
  -Uses Fastify plugin pattern: `async function routeName(fastify, options)`
  -Current routes:
    - health.js: GET /health → { status: 'OK' }
    - example.js: GET /api/example → { message: 'Hello World' }
    - server.js: GET /api/server → { message: 'Server Route' }

### Docker Configuration
- **Dockerfile**: Multi-stage not used; simple Node.js base
  -Installs dependencies with npm ci
  -Copies source, exposes port 3000
  -Runs node api/index.js

- **docker-compose.yml**: Development-optimized
  -Bind mounts source code: `./:/app:cached`
  -Anonymous volume for node_modules: `/app/node_modules`
  -Runs `npm run dev` (nodemon) for hot reloading
  -Sets NODE_ENV=development and PORT=3000

### Vercel Integration
- **vercel.json**: Configures @vercel/node builder
  -Builds api/index.js as serverless function
 -Routes all paths to the API handler
  -Enables identical codebase for Docker and Vercel

## Important Notes

### Environment Variables
- Copy .env.example to .env for local development
- DATABASE_URL is optional (PostgreSQL integration)
- NODE_ENV and PORT are pre-configured in docker-compose.yml
- Vercel automatically uses its environment variables

### Code Patterns
- Routes use Fastify autoload with ignorePattern for test files
- Error handling centralized in api/index.js via setErrorHandler
- Conditional server startup: only runs if imported directly (import.meta.main)
- Export pattern supports both direct node execution and Vercel serverless

### Development Tooling
- No ESLint, Prettier, or test framework configurations present in repository
- These would need to be added separately if desired for development workflow
- Current focus is on core Fastify/Vercel/Docker integration

### File Synchronization
- docker-compose.yml excludes Dockerfile and itself from .gitignore
- This prevents version control conflicts while keeping configs local
- Remember to manually sync these files if modified

## Troubleshooting

### Common Issues
1. **PostgreSQL connection failures**: 
   -Check .env file exists with correct DATABASE_URL
   -Verify Neon project is active (not paused)
   -Confirm IP allowlist includes current developer IP

2. **Port conflicts**: 
   -Docker compose maps host:container as 3000:3000
   -Ensure no other service uses localhost:3000

3. **Node modules mismatch**: 
   -Docker volume separates container/host node_modules
  -Run `docker compose rebuild` after dependency changes

## Database Schema

The project uses the following PostgreSQL schema (verified against Neon project "frosty-dream-67859921" on branch "br-green-morning-awwdadcf"):

```sql
CREATE TABLE "accounts" (
    "id" uuid PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "account_type" text NOT NULL,
    "balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "accounts_user_id_account_type_key" UNIQUE("user_id","account_type"),
    CONSTRAINT "accounts_account_type_check" CHECK ((account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'credit'::text]))),
    CONSTRAINT "accounts_balance_check" CHECK ((balance >= (0)::numeric))
);
CREATE TABLE "transactions" (
    "id" uuid PRIMARY KEY,
    "account_id" uuid NOT NULL,
    "type" text NOT NULL,
    "amount" numeric(15, 2) NOT NULL,
    "description" text,
    "idempotency_key" uuid NOT NULL CONSTRAINT "transactions_idempotency_key_key" UNIQUE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric)),
    CONSTRAINT "transactions_type_check" CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'transfer_in'::text, 'transfer_out'::text])))
);
CREATE TABLE "users" (
    "id" uuid PRIMARY KEY,
    "username" text NOT NULL CONSTRAINT "users_username_key" UNIQUE,
    "email" text NOT NULL CONSTRAINT "users_email_key" UNIQUE,
    "password_hash" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "accounts_pkey" ON "accounts" ("id");
CREATE UNIQUE INDEX "accounts_user_id_account_type_key" ON "accounts" ("user_id","account_type");
CREATE INDEX "idx_transactions_account" ON "transactions" ("account_id");
CREATE INDEX "idx_transactions_created" ON "transactions" ("created_at");
CREATE INDEX "idx_transactions_idempot" ON "transactions" ("idempotency_key");
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions" ("idempotency_key");
CREATE UNIQUE INDEX "transactions_pkey" ON "transactions" ("id");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;

```

## TESTING
call veronica to write test cases that the ci/cd will use

**NOTE** : THIS NODE JS PROJECT IS AN ES MODULE PROJECT