# CollabWave

> Real-time collaborative task management SaaS — built as a portfolio project
> demonstrating WebSocket architecture, Redis pub/sub, and JWT authentication
> in a production-grade full-stack application.

![CI](https://github.com/LeandroAlves45/collabwave/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-in%20development-orange)
![Node](https://img.shields.io/badge/node-20.x-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Table of Contents

- [CollabWave](#collabwave)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Tech Stack](#tech-stack)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Infrastructure](#infrastructure)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Local Setup (Docker Compose)](#local-setup-docker-compose)
    - [Running Migrations](#running-migrations)
    - [Running Tests](#running-tests)
  - [Environment Variables](#environment-variables)
  - [API Reference](#api-reference)
  - [WebSocket Events](#websocket-events)
    - [Client → Server](#client--server)
    - [Server → Client](#server--client)
  - [Database Schema](#database-schema)
  - [Testing](#testing)
  - [Sprint Plan](#sprint-plan)
  - [Deployment](#deployment)
  - [Known Issues](#known-issues)
    - [npm audit — devDependencies (25 moderate vulnerabilities)](#npm-audit--devdependencies-25-moderate-vulnerabilities)
  - [Author](#author)

---

## Overview

CollabWave enables teams to create shared workspaces, manage tasks on interactive
Kanban boards, and see each other's activity live — without any page refresh.

The platform targets small-to-medium engineering and creative teams that require
synchronous collaboration with minimal latency.

**Target delivery:** June 2026 | **Current status:** Sprint 0 — Project Setup

---

## Features

| Feature                                            | Status             |
| -------------------------------------------------- | ------------------ |
| JWT authentication with refresh token rotation     | Planned — Sprint 1 |
| Workspace creation and invite-code based joining   | Planned — Sprint 1 |
| Role-based access control (Owner / Admin / Member) | Planned — Sprint 1 |
| Kanban board with draggable task cards             | Planned — Sprint 5 |
| Real-time task sync across all connected clients   | Planned — Sprint 3 |
| Live user presence (online indicators + cursors)   | Planned — Sprint 6 |
| In-app notification system                         | Planned — Sprint 6 |
| Workspace activity log                             | Planned — Sprint 3 |
| Full OpenAPI / Swagger documentation               | Planned — Sprint 8 |
| Docker Compose single-command setup                | Planned — Sprint 1 |

---

## Architecture

CollabWave follows a layered architecture with a clear separation between the
REST API layer and the WebSocket layer. Both services share the same PostgreSQL
database and communicate asynchronously through a Redis pub/sub channel.

```
┌─────────────────────────────────────────────────┐
│                    CLIENT                        │
│          React 18 + Zustand + Socket.io          │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────┐
│                    NGINX                         │
│         Reverse Proxy + SSL Termination          │
│   /api/* → Express    /socket.io/* → Socket.io  │
└──────────┬───────────────────────┬──────────────┘
           │                       │
┌──────────▼──────────┐ ┌─────────▼──────────────┐
│    REST API          │ │   WebSocket Server      │
│  Express 5           │ │   Socket.io v4          │
│  JWT middleware      │ │   JWT handshake auth    │
│  Rate limiting       │ │   Workspace rooms       │
└──────────┬───────────┘ └─────────┬──────────────┘
           │                       │
           └───────────┬───────────┘
                       │
          ┌────────────▼────────────┐
          │       PostgreSQL 15     │
          │    Primary data store   │
          └─────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │         Redis 7         │
          │  Pub/Sub + Presence     │
          └─────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology              | Version | Purpose                        |
| ----------------------- | ------- | ------------------------------ |
| Node.js                 | 20.x    | Runtime                        |
| Express                 | 5.x     | REST API framework             |
| Socket.io               | 4.x     | WebSocket server               |
| socket.io-redis-adapter | latest  | Horizontal WS scaling          |
| Knex.js                 | latest  | SQL query builder + migrations |
| jsonwebtoken            | latest  | JWT signing and verification   |
| bcrypt                  | latest  | Password hashing               |

### Frontend

| Technology       | Version | Purpose                 |
| ---------------- | ------- | ----------------------- |
| React            | 18.x    | UI framework            |
| TypeScript       | 5.x     | Type safety             |
| Vite             | 5.x     | Build tool + dev server |
| Zustand          | latest  | Client state management |
| Socket.io-client | 4.x     | WebSocket client        |
| React Router     | 6.x     | Client-side routing     |
| dnd-kit          | latest  | Drag-and-drop           |
| Tailwind CSS     | 3.x     | Utility-first styling   |

### Infrastructure

| Technology                  | Purpose                     |
| --------------------------- | --------------------------- |
| PostgreSQL 15               | Primary relational database |
| Redis 7                     | Pub/sub + presence state    |
| Docker + Docker Compose     | Containerisation            |
| Nginx                       | Reverse proxy + SSL         |
| GitHub Actions              | CI/CD pipeline              |
| AWS EC2 + RDS + ElastiCache | Production deployment       |

---

## Project Structure

```
collabwave/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── backend/
│   ├── src/
│   │   ├── config/             # Environment config, DB and Redis setup
│   │   ├── middleware/         # Auth, error handling, rate limiting
│   │   ├── modules/
│   │   │   ├── auth/           # Register, login, refresh, logout
│   │   │   ├── workspaces/     # Workspace CRUD + membership
│   │   │   └── tasks/          # Task CRUD + column management
│   │   ├── sockets/            # Socket.io server + event handlers
│   │   └── app.ts              # Express app setup
│   ├── migrations/             # Knex database migrations
│   ├── tests/                  # Jest integration + unit tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level page components
│   │   ├── stores/             # Zustand state stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API and Socket.io client wrappers
│   │   └── types/              # Shared TypeScript type definitions
│   └── Dockerfile
├── nginx/
│   └── nginx.conf              # Nginx reverse proxy configuration
├── docker-compose.yml          # Local development environment
├── docker-compose.prod.yml     # Production environment
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 20](https://nodejs.org/) (for local development without Docker)
- [Git](https://git-scm.com/)

### Local Setup (Docker Compose)

```bash
# 1. Clone the repository
git clone https://github.com/LeandroAlves45/collabwave.git
cd collabwave

# 2. Create your local environment file
cp .env.example .env

# 3. Fill in the required values in .env
#    At minimum: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
#    Generate secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Start all services
docker-compose up --build

# The following will be available:
#   Frontend:  http://localhost:5173
#   Backend:   http://localhost:3001
#   API Docs:  http://localhost:3001/api/docs
```

### Running Migrations

```bash
# Run all pending database migrations
docker-compose exec backend npm run migrate

# Rollback the last migration batch
docker-compose exec backend npm run migrate:rollback
```

### Running Tests

```bash
# Run the full test suite with coverage report
docker-compose exec backend npm run test:ci

# Run tests in watch mode (development)
docker-compose exec backend npm run test
```

---

## Environment Variables

See [`.env.example`](.env.example) for a full list of required variables with
descriptions. Copy it to `.env` and fill in the values before starting the
application.

**Never commit your `.env` file.** It is listed in `.gitignore`.

---

## API Reference

Full API documentation is available via Swagger UI at:

```
http://localhost:3001/api/docs
```

A summary of available endpoints:

| Method | Endpoint                    | Auth            | Description                  |
| ------ | --------------------------- | --------------- | ---------------------------- |
| POST   | `/api/auth/register`        | None            | Register a new user          |
| POST   | `/api/auth/login`           | None            | Login and receive JWT tokens |
| POST   | `/api/auth/refresh`         | Refresh token   | Rotate access token          |
| POST   | `/api/auth/logout`          | Bearer          | Invalidate refresh token     |
| GET    | `/api/workspaces`           | Bearer          | List user workspaces         |
| POST   | `/api/workspaces`           | Bearer          | Create a workspace           |
| POST   | `/api/workspaces/join`      | Bearer          | Join via invite code         |
| GET    | `/api/workspaces/:id/tasks` | Bearer + Member | Fetch all tasks              |
| POST   | `/api/workspaces/:id/tasks` | Bearer + Member | Create a task                |
| PATCH  | `/api/tasks/:taskId/move`   | Bearer + Member | Move task to column          |

See the full SDD documentation for the complete API reference.

---

## WebSocket Events

Clients connect to the Socket.io server and join a workspace room via
`workspace:join`. All board updates are broadcast in real time.

### Client → Server

| Event            | Payload                                    |
| ---------------- | ------------------------------------------ |
| `workspace:join` | `{ workspaceId }`                          |
| `task:create`    | `{ columnId, title, priority?, dueDate? }` |
| `task:move`      | `{ taskId, targetColumnId, newPosition }`  |
| `task:update`    | `{ taskId, fields }`                       |
| `task:delete`    | `{ taskId }`                               |
| `cursor:move`    | `{ workspaceId, x, y }`                    |

### Server → Client

| Event                       | Payload                                            |
| --------------------------- | -------------------------------------------------- |
| `workspace:presence_update` | `{ onlineUsers }`                                  |
| `task:created`              | `{ task }`                                         |
| `task:moved`                | `{ taskId, targetColumnId, newPosition, movedBy }` |
| `task:deleted`              | `{ taskId, deletedBy }`                            |
| `notification:new`          | `{ notification }`                                 |

---

## Database Schema

Core entities and their relationships:

```
users ──────────────────────────────────────────────┐
  id (PK), name, email, password_hash, avatar_url   │
                                                     │
workspaces ─────────────────────────────────────────┤
  id (PK), name, description, owner_id (FK), invite_code
                                                     │
workspace_members ───────────────────────────────────┤
  workspace_id (FK), user_id (FK), role, joined_at  │
                                                     │
columns                                              │
  id (PK), workspace_id (FK), title, position       │
                                                     │
tasks                                                │
  id (PK), column_id (FK), title, description,      │
  assignee_id (FK), priority, due_date, position    │
                                                     │
activity_log                                         │
  id (PK), workspace_id (FK), user_id (FK),         │
  action, metadata (JSONB), created_at              │
└────────────────────────────────────────────────────┘
```

---

## Testing

The project follows a testing pyramid strategy with a minimum target of 60%
code coverage on the backend.

| Type           | Tool                           | Target Coverage |
| -------------- | ------------------------------ | --------------- |
| Unit           | Jest + ts-jest                 | > 80%           |
| Integration    | Jest + Supertest               | > 60%           |
| WebSocket      | Jest + socket.io-client        | > 60%           |
| Component      | Vitest + React Testing Library | > 50%           |
| E2E (optional) | Playwright                     | Key flows only  |

---

## Sprint Plan

| Sprint   | Phase                                                    | Status      |
| -------- | -------------------------------------------------------- | ----------- |
| Sprint 0 | Project setup, ESLint, Prettier, Husky, GitHub Actions   | ✅ Complete |
| Sprint 1 | Docker Compose, DB schema, Knex migrations, Auth API     | 🔄 Next     |
| Sprint 2 | Socket.io server, JWT WS auth, Workspace rooms, Presence | Planned     |
| Sprint 3 | Task Board REST API + WebSocket events                   | Planned     |
| Sprint 4 | React shell, routing, Auth pages, Zustand stores         | Planned     |
| Sprint 5 | Kanban board, drag-and-drop, real-time sync              | Planned     |
| Sprint 6 | Presence bar, cursor broadcast, notifications            | Planned     |
| Sprint 7 | Tests, CI/CD, production Docker Compose, deploy          | Planned     |
| Sprint 8 | README, Swagger docs, portfolio write-up                 | Planned     |

---

## Deployment

The application is designed to run via a single command in any environment:

```bash
# Local development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

**Production infrastructure:**

- **Compute:** AWS EC2 t3.micro
- **Database:** AWS RDS PostgreSQL 15
- **Cache:** AWS ElastiCache Redis 7
- **Reverse Proxy:** Nginx with Let's Encrypt SSL
- **CI/CD:** GitHub Actions → Railway (staging) → AWS (production)

---

## Known Issues

### npm audit — devDependencies (25 moderate vulnerabilities)

Remaining vulnerabilities are confined exclusively to the test runner toolchain
(`ts-jest` → `jest` dependency chain) and are never present in production builds.

| Package           | Affected via                 | Production risk         | Status     |
| ----------------- | ---------------------------- | ----------------------- | ---------- |
| `brace-expansion` | `ts-jest` → `jest` toolchain | None — test runner only | Monitoring |

**Why not fixed:** The available fix requires a breaking downgrade of `jest`
to v25, which is incompatible with the current test configuration.
These will be resolved when the upstream packages update their dependency ranges.

**Production dependencies are clean** — verified via `npm audit --omit=dev`.

---

## Author

**Leandro Alves**
Junior Full Stack Developer — Maia, Porto, Portugal

- GitHub: [@LeandroAlves45](https://github.com/LeandroAlves45)

---

_This project is part of my development portfolio, built to demonstrate
production-grade full-stack architecture with real-time capabilities._
