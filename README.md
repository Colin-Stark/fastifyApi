# Fastify-Vercel-Docker-Serverless-API

A serverless Fastify API that deploys to Vercel while maintaining identical codebase for local Docker development with bind mounts.

## Overview
This project demonstrates how to create a Fastify-based API that:
- Runs locally in Docker with bind mounts for hot reloading during development
- Deploys to Vercel as serverless functions with identical codebase
- Maintains environment parity between local and production environments

## Project Structure
```
/api/index.js          # Main Fastify application
/Dockerfile            # Docker configuration
/docker-compose.yml    # Docker Compose for local dev
/package.json          # Project dependencies and scripts
/.gitignore            # Git ignore rules
/README.md             # This file
/.env.example          # Example environment variables
```

## Local Development

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development environment:
   ```bash
   docker compose up --build
   ```

   The API will be available at http://localhost:3000

### Alternative Local Development (without Docker)
```bash
npm run dev
```
This uses nodemon for hot reloading.

## Vercel Deployment

### Live Demo
The API is deployed and accessible at: **https://fastify-api-xi.vercel.app/**

### Prerequisites
- Vercel CLI (`npm i -D vercel`)

### Development
```bash
npm run vercel-dev
```

### Production Deployment
```bash
npm run vercel-deploy
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns: `{ status: "OK" }`

### Example API
- **GET** `/api/example`
- Returns: `{ message: "Hello World" }`

## Environment Variables
See `.env.example` for required environment variables.

## Docker Configuration
The Docker setup uses bind mounts for instant code reloading during development:
- `./:/app:cached` mounts your source code into the container
- `/app/node_modules` is mounted as a volume to prevent overwriting container node_modules

## License
MIT