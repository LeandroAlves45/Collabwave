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

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Sprint Plan](#sprint-plan)
- [Deployment](#deployment)
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

| Feature | Status |
| --- | --- |
| JWT authentication with refresh token rotation | Planned — Sprint 1 |
| Workspace creation and invite-code based joining | Planned — Sprint 1 |
| Role-based access control (Owner / Admin / Member) | Planned — Sprint 1 |
| Kanban board with draggable task cards | Planned — Sprint 5 |
| Real-time task sync across all connected clients | Planned — Sprint 3 |
| Live user presence (online indicators + cursors) | Planned — Sprint 6 |
| In-app notification system | Planned — Sprint 6 |
| Workspace activity log | Planned — Sprint 3 |
| Full OpenAPI / Swagger documentation | Planned — Sprint 8 |
| Docker Compose single-command setup | Planned — Sprint 1 |

---

## Architecture

CollabWave follows a layered architecture with a clear separation between the
REST API layer and the WebSocket layer. Both services share the same PostgreSQL
database and communicate asynchronously through a Redis pub/sub channel.

---

## Tech Stack

> To be documented.

---

## Project Structure

> To be documented.

---

## Getting Started

> To be documented.

---

## Environment Variables

> To be documented.

---

## API Reference

> To be documented.

---

## WebSocket Events

> To be documented.

---

## Database Schema

> To be documented.

---

## Testing

> To be documented.

---

## Sprint Plan

> To be documented.

---

## Deployment

> To be documented.

---

## Author

> To be documented.
