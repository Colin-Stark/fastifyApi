# Fastify Vercel Docker Serverless API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018-blue.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/framework-fastify-green.svg)](https://www.fastify.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


<img width="1730" height="1026" alt="expandedAPI" src="https://github.com/user-attachments/assets/37ee7b99-d068-4a3e-bdec-8e40aab463e2" />

## TEST API WITH THIS URL

**API Documentation**: [https://fastify-api-xi.vercel.app/docs](https://fastify-api-xi.vercel.app/docs)

<img width="1700" height="1031" alt="swaggerapi" src="https://github.com/user-attachments/assets/664ce097-3d23-4b76-94d9-0c756e057e3b" />


https://github.com/user-attachments/assets/cf5f3d7b-0f16-4cb4-bffb-99facb6634db




Add PNG/JPG/SVG files to this folder for use in documentation.

**Live Demo**: [https://fastify-api-xi.vercel.app/](https://fastify-api-xi.vercel.app/)



## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
  - [Docker Development](#docker-development)
  - [Direct Node.js Development](#direct-nodejs-development)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Available Endpoints](#available-endpoints)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project provides a robust foundation for building serverless APIs with Fastify that can be:
- 🐳 Developed locally using Docker with PostgreSQL database
- 💻 Run directly with Node.js and nodemon for hot reloading
- ☁️ Deployed to Vercel as serverless functions
- 🐘 Connected to Neon PostgreSQL (or any PostgreSQL-compatible database)
- 📖 Self-documenting with built-in Swagger/OpenAPI support
- 🔐 Secured with JWT authentication, CORS, Helmet, and rate limiting
- 🧪 Tested with Vitest for reliable test suites

The API includes a complete banking-style account management system with:
- User registration and authentication (JWT-based)
- Account creation and management (checking, savings, credit)
- Transaction processing (deposits, withdrawals, transfers)
- Idempotency protection for financial operations
- Atomic database operations for consistency

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/) (for Docker development option)
- [Vercel CLI](https://vercel.com/docs/cli) (for Vercel deployment)
- [PostgreSQL](https://www.postgresql.org/) (local or remote database)

### One-Liner Setup
```bash
# Clone the repository
git clone https://github.com/your-username/fastify-api.git
cd fastify-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your actual values (see Environment Variables section below)
# For quick testing without DB, you can leave DATABASE_URL blank initially
```

## Local Development

### Docker Development (Recommended)

This method uses Docker Compose with a PostgreSQL database for local development.

```bash
# Start all services (app + PostgreSQL database)
docker compose up --build

# The API will be available at: http://localhost:3000
# Swagger UI documentation at: http://localhost:3000/docs

# To stop and clean up:
docker compose down
```

**Benefits:**
- Isolated development environment with PostgreSQL
- Consistent development environment across team members
- Includes PostgreSQL service for full-stack testing
- NODE_ENV=development and PORT=3000 pre-configured
- Multi-stage Docker build with integrated testing (fails if tests don't pass)

### Direct Node.js Development

For faster iteration without Docker overhead:

```bash
# Start the development server with nodemon
npm run dev

# The API will be available at: http://localhost:3000
# Swagger UI documentation at: http://localhost:3000/docs

# For production-like execution (no hot reloading):
npm start
```

**Note:** When using direct Node.js development, you'll need to run your own PostgreSQL instance and update the DATABASE_URL in your .env file accordingly.

## Vercel Deployment

### Local Vercel Development
```bash
# Start Vercel dev server for local testing
npm run vercel-dev
```

### Production Deployment
```bash
# Deploy to Vercel production environment
npm run vercel-deploy
```

**Important:** Before deploying to Vercel, ensure you have:
1. Set up a Vercel account and installed the Vercel CLI
2. Linked your project to Vercel (`vercel login` and `vercel`)
3. Configured environment variables in your Vercel project settings:
   - `DATABASE_URL` (your Neon PostgreSQL connection string)
   - `JWT_SECRET` (a strong secret for JWT token signing)
   - Optional: `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `DB_POOL_MAX`, etc.

Your API will be accessible at your Vercel domain (e.g., `https://your-project-name.vercel.app`).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string for pooled connections | Yes (for DB features) | `postgresql://user:pass@host:5432/db` |
| `DATABASE_URL_UNPOOLED` | PostgreSQL connection string for direct connections | No | Same as DATABASE_URL |
| `NEON_BRANCH` | Neon database branch name | No | `production` |
| `PORT` | Server port | No (defaults to 3000) | `3000` |
| `NODE_ENV` | Node environment | No (defaults to development) | `development` or `production` |
| `JWT_SECRET` | Secret for JWT token signing | Yes | `your-super-secret-jwt-key-change-in-production` |
| `DB_POOL_MAX` | Maximum PostgreSQL pool size | No | `20` |
| `DB_IDLE_TIMEOUT` | Connection idle timeout in ms | No | `30000` |
| `DB_CONNECTION_TIMEOUT` | Connection timeout in ms | No | `2000` |

**Vercel Deployment Note:** When deploying to Vercel, set these environment variables in your Vercel project settings rather than in a local .env file.

## API Documentation

This API includes automatic Swagger/OpenAPI documentation:

- **Swagger UI**: Accessible at `/docs` endpoint (e.g., `http://localhost:3000/docs`)
- **OpenAPI JSON**: Available at `/openapi.json`

The documentation is automatically generated from the route schemas and includes:
- All available endpoints
- Request/response schemas
- Example values
- Tag grouping
- Security schemes (JWT bearer token)

## Available Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check endpoint returning `{ status: 'OK' }` |

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user/register` | Register new user: username, email, password (bcrypt hashed) |
| `POST` | `/user/login` | Login and get JWT token: email/username + password |

### User Management (Protected - Requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/getUsers` | List all users (admin only) |
| `GET` | `/user/:id` | Get user by ID (users can only access their own data) |
| `PUT` | `/user/:id` | Update user (users can only update their own data) |
| `DELETE` | `/user/:id` | Delete user (users can only delete their own data) |

### Account Management (Protected - Requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounts` | List all accounts for authenticated user (filter by `account_type`: checking, savings, credit) |
| `GET` | `/accounts/:id` | Get specific account by ID (must belong to authenticated user) |
| `POST` | `/accounts` | Create new account for authenticated user (initial balance 0.00) |
| `DELETE` | `/accounts/:id` | Delete account (must belong to user AND have zero balance) |

### Transaction Management (Protected - Requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List transactions for authenticated user with filtering: filter by `account_id`, `type` (deposit/withdrawal/transfer), `start_date`, `end_date`; supports pagination with `limit` (max 100) and `offset` |
| `GET` | `/transactions/:id` | Get specific transaction by ID (must belong to user's account) |
| `POST` | `/transactions` | Create deposit/withdrawal transaction (atomic balance update) |
| `POST` | `/transfers` | Create atomic transfer between accounts (with validations: source/destination must be different accounts; sufficient funds required in source account) |

### Security & Implementation Details
- All protected endpoints use JWT token verification
- PostgreSQL database with parameterized queries to prevent SQL injection
- Proper error handling with appropriate HTTP status codes (400, 401, 403, 404, 409, 500)
- Account types: checking, savings, credit
- Transaction types: deposit, withdrawal, transfer
- Idempotency support for transactions/transfers using UUID keys
- Atomic operations for balance updates and transfers using database transactions

## Database Schema

The PostgreSQL schema includes three main tables:

```sql
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" text NOT NULL CONSTRAINT "users_username_key" UNIQUE,
	"email" text NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"account_type" text NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_account_type_key" UNIQUE("user_id","account_type"),
	CONSTRAINT "accounts_account_type_check" CHECK ((account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'credit'::text]))),
	CONSTRAINT "accounts_balance_check" CHECK ((balance >= (0)::numeric)),
	CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"destination_account_id" uuid,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"idempotency_key" uuid NOT NULL CONSTRAINT "uq_transactions_idempotency_key" UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_amount_positive" CHECK ((amount > (0)::numeric)),
	CONSTRAINT "chk_destination_account" CHECK ((((type = 'transfer'::text) AND (destination_account_id IS NOT NULL)) OR ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text])) AND (destination_account_id IS NULL)))),
	CONSTRAINT "chk_transaction_type" CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'transfer'::text]))),
	CONSTRAINT "fk_transactions_source_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
	CONSTRAINT "fk_transactions_destination_account" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "accounts_pkey" ON "accounts" ("id");
CREATE UNIQUE INDEX "accounts_user_id_account_type_key" ON "accounts" ("user_id","account_type");
CREATE INDEX "ix_transactions_account_id" ON "transactions" ("account_id");
CREATE INDEX "ix_transactions_created_at" ON "transactions" ("created_at");
CREATE INDEX "ix_transactions_destination_account_id" ON ("destination_account_id");
CREATE UNIQUE INDEX "transactions_pkey" ON "transactions" ("id");
CREATE UNIQUE INDEX "uq_transactions_idempotency_key" ON "transactions" ("idempotency_key");
```

**Note:** This schema is verified against the Neon project "frosty-dream-67859921" on branch "br-green-morning-awwdadcf".

## Testing

This project includes a Vitest testing setup for reliable test execution.

```bash
# Run tests once
npm test

# Run tests in watch mode (for TDD)
npm run test:watch
```

**Note:** Currently, the test suites are minimal and should be expanded as the project grows. The Docker build process includes test execution (via `npm test` in the test stage) to ensure code quality before production deployment.

## Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Failures
**Symptoms:** ❌ Failed to connect to Neon PostgreSQL errors

**Solutions:**
- Check `.env` file exists with correct `DATABASE_URL`
- Verify Neon project is active (not paused/suspended)
- Confirm IP allowlist in Neon console includes your current IP
- Ensure username/password in URL are correct
- For local Docker development, ensure the `db` service is running

#### 2. Port Conflicts
**Symptoms:** Address already in use errors when starting the server

**Solutions:**
- Ensure no other service uses localhost:3000
- Change the PORT in your `.env` file
- Stop conflicting services: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)

#### 3. Environment Variable Issues
**Symptoms:** Undefined variable errors

**Solutions:**
- Verify `.env` file is in the project root
- Check variable names match exactly (case-sensitive)
- Ensure no extra spaces around `=` in `.env` file
- Remember Vercel uses project settings, not `.env` file

#### 4. Test Failures in Docker Build
**Symptoms:** Docker build fails during test stage

**Solutions:**
- Run `npm test` locally to see what's failing
- Fix failing tests before rebuilding
- Ensure your test environment has access to required resources (database, etc.)

### Getting Help
- Check the logs: `docker compose logs app` (for Docker) or terminal output (for direct)
- Review the live demo: [https://fastify-api-xi.vercel.app/](https://fastify-api-xi.vercel.app/)
- Consult the [Fastify documentation](https://www.fastify.io/docs/latest/)

## Project Structure

```
fastify-api/
├── api/
│   └── index.js           # Main Fastify application entry point
├── assets/
│   ├── brag.mp4           # Project showcase video
│   └── trailer.mp4        # Project trailer video
├── docker/
│   └── init-db.sql        # Database initialization script
├── routes/
│   └── api/
│       └── v1/            # API version 1 routes
│           ├── accounts.js    # Account management endpoints
│           ├── health.js      # Health check endpoint
│           ├── server.js      # Server information endpoint
│           ├── transactions.js # Transaction management endpoints
│           └── user.js        # User management endpoints
├── .dockerignore          # Docker ignore file
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose configuration
├── package.json           # Project dependencies and scripts
├── vercel.json            # Vercel configuration
└── README.md              # This file
```

### Key Components

- **api/index.js**: 
  - Loads environment variables via dotenv
  - Optional Neon PostgreSQL connection sanity check (commented out by default)
  - Initializes Fastify with logger and body limits
  - Registers security plugins (CORS, Helmet, JWT, Rate Limiting)
  - Registers PostgreSQL plugin
  - Registers Swagger/OpenAPI plugins for API documentation
  - Registers routes via @fastify/autoload from routes directory
  - Exports Vercel-compatible handler

- **Route Structure** (`routes/api/v1/`):
  - Each file exports an async function registering routes with Fastify
  - Uses Fastify plugin pattern: `async function routeName(fastify, options)`
  - Features automatic API documentation generation

- **Docker Configuration**:
  - **Dockerfile**: Multi-stage build (test → production)
  - **docker-compose.yml**: Development-optimized with named volumes for persistence
  - Database service: PostgreSQL 15 with initialization script
  - Application service: Built from Dockerfile, depends on db, runs `npm run dev`
  - Port mapping: 3000:3000 for app, 5432:5432 for db

- **Vercel Integration**:
  - **vercel.json**: Configures @vercel/node builder
  - Builds api/index.js as serverless function
  - Routes all paths to the API handler
  - Enables identical codebase for Docker and Vercel

## System Architecture

```mermaid
graph TD
    A[Client/Browser] -->|HTTPS Requests| B(Vercel Edge Network)
    B --> C[Fastify Serverless Function]
    C --> D[PostgreSQL Database]
    C --> E[Redis Cache - Optional]
    C --> F[External APIs - Optional]
    
    subgraph Development Environment
        G[Local Docker Compose] --> H[App Container]
        G --> I[PostgreSQL Container]
        H -->|Volume Mounts| J[Source Code]
        H -->|Environment Variables| K[.env File]
    end
    
    subgraph Deployment Options
        L[Vercel Serverless] --> C
        M[Docker Container] --> C
        N[Direct Node.js] --> C
    end
    
    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bfb,stroke:#333
    style D fill:#fbb,stroke:#333
    style E fill:#ff9,stroke:#333
    style F fill:#9ff,stroke:#333
    style G fill:#9f9,stroke:#333
    style H fill:#9cf,stroke:#333
    style I fill:#f9c,stroke:#333
    style J fill:#fc9,stroke:#333
    style K fill:#cf9,stroke:#333
    style L fill:#f96,stroke:#333
    style M fill:#96f,stroke:#333
    style N fill:#69f,stroke:#333
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing patterns and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Fastify](https://www.fastify.io/) - fast and low overhead web framework
- Deployed to [Vercel](https://vercel.com/) - platform for frontend frameworks and static sites
- Containerized with [Docker](https://www.docker.com/) - platform for developing, shipping, and running applications
- Database powered by [Neon](https://neon.tech/) - serverless PostgreSQL
- Tested with [Vitest](https://vitest.dev/) - fast unit test framework
- Inspired by modern full-stack development practices
