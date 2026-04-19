# CollabWave

> Real-time collaborative workspace and Kanban board application built with React, Express, PostgreSQL, Redis and Socket.io.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)
![React](https://img.shields.io/badge/react-19-61dafb)
![Express](https://img.shields.io/badge/express-5-black)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

CollabWave is a full-stack collaboration platform where users can create workspaces, invite other members with join codes, and manage shared Kanban boards with real-time task updates.

---

## ✨ Highlights

- 🔐 JWT authentication with access tokens and refresh token rotation
- 🧑‍🤝‍🧑 Workspace membership with `owner`, `admin` and `member` roles
- 🔗 Invite-code based workspace sharing
- 📋 Kanban boards with columns and draggable task cards
- ⚡ Real-time task synchronization through Socket.io
- 🟢 Workspace presence layer backed by Redis
- 🧪 Unit, integration and E2E test coverage
- 🐳 Docker Compose setup for PostgreSQL, Redis and backend services
- 🎨 React + Vite frontend with Zustand state management

---

## 📚 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Core API Routes](#-core-api-routes)
- [WebSocket Events](#-websocket-events)
- [Product Flow](#-product-flow)
- [Documentation](#-documentation)
- [Author](#-author)

---

## 🧰 Tech Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React 19 | User interface |
| TypeScript | Type-safe frontend development |
| Vite | Dev server and production build |
| React Router | Client-side routing |
| Zustand | Global client state |
| React Hook Form + Zod | Forms and validation |
| Socket.io Client | Real-time communication |
| Tailwind CSS | Styling system |
| Playwright | End-to-end tests |
| Vitest + Testing Library | Unit and integration tests |

### Backend

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript runtime |
| Express 5 | REST API |
| TypeScript | Type-safe backend development |
| PostgreSQL | Relational data store |
| Knex | Query builder and migrations |
| Redis | Refresh token storage, presence and Socket.io adapter |
| Socket.io | WebSocket server |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Zod | Request validation |
| Jest + Supertest | Unit and integration tests |

### Infrastructure

| Technology | Purpose |
| --- | --- |
| Docker Compose | Local service orchestration |
| PostgreSQL 15 | Database container |
| Redis 7 | Cache/pub-sub container |
| GitHub Actions | CI pipeline |

---

## 🏗️ Architecture

CollabWave uses a modular full-stack architecture:

```text
React + Vite Client
        |
        | REST / Socket.io
        v
Express API + Socket.io Server
        |
        | SQL
        v
PostgreSQL
        |
        | token storage, pub/sub, presence
        v
Redis
```

The backend exposes REST endpoints for persistent operations such as authentication, workspace management, columns and tasks. Socket.io is used for real-time collaboration events such as task creation, updates, moves and deletes.

---

## 📁 Project Structure

```text
CollabWave/
├── backend/
│   ├── migrations/              # Knex database migrations
│   ├── src/
│   │   ├── config/              # Environment, database and Redis setup
│   │   ├── middleware/          # Auth and error handling
│   │   ├── modules/
│   │   │   ├── auth/            # Register, login, refresh and logout
│   │   │   ├── columns/         # Kanban columns
│   │   │   ├── tasks/           # Task CRUD and movement
│   │   │   └── workspaces/      # Workspace creation, invite codes and members
│   │   ├── sockets/             # Socket.io server and handlers
│   │   ├── utils/               # Shared backend utilities
│   │   ├── app.ts               # Express application
│   │   └── server.ts            # HTTP + Socket.io bootstrap
│   └── tests/                   # Backend unit and integration tests
├── frontend/
│   ├── src/
│   │   ├── components/          # Shared UI and product components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Login, register, workspaces and board pages
│   │   ├── schemas/             # Zod frontend validation
│   │   ├── services/            # API and Socket.io clients
│   │   ├── stores/              # Zustand stores
│   │   ├── styles/              # Global styles
│   │   └── types/               # Frontend TypeScript types
│   └── tests/
│       ├── E2E/                 # Playwright tests
│       ├── integration/         # Component/page integration tests
│       └── unit/                # Unit tests
├── docs/                        # Project notes, testing plans and analysis
├── docker-compose.yml           # Local backend infrastructure
├── .env.example                 # Environment variable template
└── README.MD
```

---

## 🚀 Getting Started

### Prerequisites

Install the following tools:

- Node.js `>= 20`
- npm `>= 10`
- Docker and Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/LeandroAlves45/collabwave.git
cd collabwave
```

### 2. Install dependencies

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure environment variables

Create a local `.env` file:

```bash
cp .env.example .env
```

Generate secure JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update `.env` with your database, Redis and JWT values.

### 4. Start infrastructure and backend

The Docker Compose file starts PostgreSQL, Redis and the backend API:

```bash
docker compose up --build
```

Services:

- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- PostgreSQL host port: `5433`
- Redis host port: `6379`

### 5. Run database migrations

In another terminal:

```bash
npm run migrate --prefix backend
```

### 6. Start the frontend

```bash
npm run dev --prefix frontend
```

Frontend:

```text
http://localhost:5173
```

---

## 🔐 Environment Variables

The main environment variables are:

| Variable | Description |
| --- | --- |
| `PORT` | Backend HTTP port, usually `3001` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime |
| `CORS_ORIGIN` | Allowed frontend origin |
| `VITE_API_URL` | Frontend REST API base URL |
| `VITE_SOCKET_URL` | Frontend Socket.io server URL |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per rate limit window |

See [`.env.example`](.env.example) for the full template.

---

## 🧑‍💻 Available Scripts

### Root

```bash
npm run lint
npm run lint:backend
npm run lint:frontend
```

### Backend

```bash
npm run dev --prefix backend
npm run build --prefix backend
npm run start --prefix backend
npm run migrate --prefix backend
npm run migrate:rollback --prefix backend
npm run test:unit --prefix backend
npm run test:integration --prefix backend
npm run test:ci --prefix backend
```

### Frontend

```bash
npm run dev --prefix frontend
npm run build --prefix frontend
npm run preview --prefix frontend
npm run test --prefix frontend
npm run test:e2e --prefix frontend
npm run test:coverage --prefix frontend
```

---

## 🧪 Testing

CollabWave includes multiple test layers:

| Layer | Tooling | Location |
| --- | --- | --- |
| Backend unit tests | Jest | `backend/tests/unit` |
| Backend integration tests | Jest + Supertest | `backend/tests/integration` |
| Frontend unit tests | Vitest | `frontend/tests/unit` |
| Frontend integration tests | Vitest + Testing Library | `frontend/tests/integration` |
| E2E tests | Playwright | `frontend/tests/E2E` |

Run frontend E2E tests:

```bash
npm run test:e2e --prefix frontend
```

The E2E suite uses:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

The current E2E suite validates authentication, workspace creation/join flows, board loading, task creation, deletion, movement and real-time synchronization.

---

## 🌐 Core API Routes

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a new user |
| `POST` | `/api/auth/login` | Authenticate user |
| `POST` | `/api/auth/refresh` | Rotate access and refresh tokens |
| `POST` | `/api/auth/logout` | Revoke refresh token |

### Workspaces

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/workspaces` | List workspaces for current user |
| `POST` | `/api/workspaces` | Create workspace and default columns |
| `POST` | `/api/workspaces/join` | Join a workspace using an invite code |
| `GET` | `/api/workspaces/:id` | Get workspace details |
| `GET` | `/api/workspaces/:id/members` | List workspace members |

### Columns

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/workspaces/:workspaceId/columns` | List columns |
| `POST` | `/api/workspaces/:workspaceId/columns` | Create column |
| `PATCH` | `/api/columns/:columnId` | Update column title |
| `PATCH` | `/api/columns/:columnId/reorder` | Reorder column |
| `DELETE` | `/api/columns/:columnId` | Delete column |

### Tasks

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/workspaces/:workspaceId/tasks` | List task columns |
| `POST` | `/api/workspaces/:workspaceId/tasks` | Create task |
| `PATCH` | `/api/workspaces/:workspaceId/tasks/:taskId` | Update task |
| `PATCH` | `/api/workspaces/:workspaceId/tasks/:taskId/move` | Move task |
| `DELETE` | `/api/workspaces/:workspaceId/tasks/:taskId` | Delete task |

---

## ⚡ WebSocket Events

### Client to Server

| Event | Payload |
| --- | --- |
| `workspace:join` | `{ workspaceId }` |
| `workspace:leave` | `{ workspaceId }` |
| `task:create` | `{ workspaceId, columnId, title, description?, priority, dueDate? }` |
| `task:update` | `{ taskId, fields }` |
| `task:move` | `{ taskId, targetColumnId, newPosition }` |
| `task:delete` | `{ taskId }` |

### Server to Client

| Event | Payload |
| --- | --- |
| `workspace:presence_update` | `{ onlineUsers }` |
| `task:created` | `{ task }` |
| `task:updated` | `{ task }` |
| `task:moved` | `{ taskId, targetColumnId, newPosition, movedBy }` |
| `task:deleted` | `{ taskId, deletedBy }` |
| `notification:new` | `{ notification }` |

---

## 🧭 Product Flow

1. A user registers or signs in.
2. The user creates a workspace.
3. The backend automatically creates default Kanban columns.
4. The owner shares the workspace invite code.
5. Another user joins using the invite code.
6. Members collaborate on the same board.
7. Task changes are synchronized in real time through Socket.io.

---

## 📝 Documentation

Useful project documents:

- [Backend endpoints](docs/Endpoints_Backend.md)
- [Testing plan](docs/TESTING_PLAN.md)
- [Frontend test analysis](docs/ANALISE_TESTES_FRONTEND.md)
- [E2E update notes](docs/E2E_TESTS_UPDATE_2026-04-19.md)

---

## 🛡️ Security Notes

- Passwords are hashed with bcrypt.
- Access tokens are short-lived.
- Refresh tokens are stored and revocable through Redis.
- Protected routes require JWT authentication.
- Workspace, column and task actions validate membership.
- CORS is restricted by `CORS_ORIGIN`.
- Express rate limiting is enabled for API protection.

---

## 🧑‍🚀 Author

**Leandro Alves**  
Full Stack Developer

- GitHub: [@LeandroAlves45](https://github.com/LeandroAlves45)

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
