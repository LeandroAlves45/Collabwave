# Backend Endpoints Documentation

## Base URL
```
http://localhost:3001/api
```

## Response Format
Todos os endpoints retornam respostas no seguinte formato:

```json
{
  "status": "success|error",
  "data": {},
  "message": "Optional error message"
}
```

---

## Authentication Endpoints

### 1. Register User
- **Method:** `POST`
- **Route:** `/auth/register`
- **Auth Required:** ❌ No
- **Rate Limited:** ⚠️ Yes (configurable)

**Request Body:**
```json
{
  "name": "string",
  "email": "string (valid email)",
  "password": "string (min 8 chars, must contain letters and numbers)",
  "passwordConfirmation": "string (must match password)"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "avatarUrl": "string|null"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

**Error Codes:**
- `400` - Invalid input or password mismatch
- `409` - Email already registered
- `429` - Too many requests

---

### 2. Login User
- **Method:** `POST`
- **Route:** `/auth/login`
- **Auth Required:** ❌ No
- **Rate Limited:** ⚠️ Yes (configurable)

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "avatarUrl": "string|null"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

**Error Codes:**
- `401` - Invalid email or password
- `429` - Too many requests

---

### 3. Refresh Tokens
- **Method:** `POST`
- **Route:** `/auth/refresh`
- **Auth Required:** ❌ No
- **Rate Limited:** ✅ No

**Request Body:**
```json
{
  "refreshToken": "jwt"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "avatarUrl": "string|null"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

**Error Codes:**
- `401` - Invalid or expired refresh token

---

### 4. Logout User
- **Method:** `POST`
- **Route:** `/auth/logout`
- **Auth Required:** ❌ No
- **Rate Limited:** ✅ No

**Request Body:**
```json
{
  "refreshToken": "jwt"
}
```

**Response (204 No Content):**
```
(empty body)
```

**Notes:**
- Idempotent: Always succeeds, even if token already expired
- Revokes refresh token in backend

---

## Workspace Endpoints

### 5. Get User Workspaces
- **Method:** `GET`
- **Route:** `/api/workspaces`
- **Auth Required:** ✅ Yes (Bearer token)

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "ownerId": "uuid",
      "inviteCode": "string",
      "createdAt": "ISO8601",
      "role": "owner|admin|member"
    }
  ]
}
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - Access denied

---

### 6. Create Workspace
- **Method:** `POST`
- **Route:** `/api/workspaces`
- **Auth Required:** ✅ Yes (Bearer token)

**Request Body:**
```json
{
  "name": "string (required, max 255)",
  "description": "string (optional, max 500)"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "ownerId": "uuid",
    "inviteCode": "string (6-char code)",
    "createdAt": "ISO8601",
    "role": "owner"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `409` - Workspace name already exists for user

---

### 7. Join Workspace
- **Method:** `POST`
- **Route:** `/api/workspaces/join`
- **Auth Required:** ✅ Yes (Bearer token)

**Request Body:**
```json
{
  "inviteCode": "string (6 characters)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "ownerId": "uuid",
    "inviteCode": "string",
    "createdAt": "ISO8601",
    "role": "member"
  }
}
```

**Error Codes:**
- `400` - Invalid invite code format
- `401` - Missing or invalid token
- `404` - Workspace not found or invite code invalid
- `409` - User already member of workspace

**Notes:**
- Route must come before `/:id` to match correctly
- User is added with 'member' role

---

### 8. Get Workspace by ID
- **Method:** `GET`
- **Route:** `/api/workspaces/:id`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "ownerId": "uuid",
    "inviteCode": "string",
    "createdAt": "ISO8601"
  }
}
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Workspace not found

---

### 9. Get Workspace Members
- **Method:** `GET`
- **Route:** `/api/workspaces/:id/members`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "workspaceId": "uuid",
      "userId": "uuid",
      "role": "owner|admin|member",
      "joinedAt": "ISO8601",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string",
        "avatarUrl": "string|null"
      }
    }
  ]
}
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Workspace not found

---

## Task Endpoints

### 10. Get Workspace Tasks
- **Method:** `GET`
- **Route:** `/api/workspaces/:id/tasks`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "columnId": "uuid",
      "title": "string",
      "description": "string|null",
      "assigneeId": "uuid|null",
      "priority": "low|medium|high|urgent",
      "dueDate": "ISO8601|null",
      "position": "number",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Workspace not found

---

### 11. Create Task
- **Method:** `POST`
- **Route:** `/api/workspaces/:id/tasks`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Request Body:**
```json
{
  "columnId": "uuid (required)",
  "title": "string (required, max 255)",
  "description": "string (optional, max 2000)",
  "priority": "low|medium|high|urgent (required)",
  "dueDate": "ISO8601 (optional)"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "columnId": "uuid",
    "title": "string",
    "description": "string|null",
    "assigneeId": null,
    "priority": "string",
    "dueDate": "ISO8601|null",
    "position": "number",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Workspace or column not found

---

### 12. Update Task
- **Method:** `PATCH`
- **Route:** `/api/tasks/:taskId`
- **Auth Required:** ✅ Yes (Bearer token)
- **Authorization:** ✅ Task owner or workspace admin

**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "assigneeId": "uuid (optional)",
  "priority": "low|medium|high|urgent (optional)",
  "dueDate": "ISO8601 (optional)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "columnId": "uuid",
    "title": "string",
    "description": "string|null",
    "assigneeId": "uuid|null",
    "priority": "string",
    "dueDate": "ISO8601|null",
    "position": "number",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not authorized (not owner or admin)
- `404` - Task not found

**Notes:**
- Route must come after `/:taskId/move` to match correctly

---

### 13. Move Task
- **Method:** `PATCH`
- **Route:** `/api/tasks/:taskId/move`
- **Auth Required:** ✅ Yes (Bearer token)
- **Authorization:** ✅ Task owner or workspace admin

**Request Body:**
```json
{
  "targetColumnId": "uuid (required)",
  "newPosition": "number (required, >= 0)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "columnId": "uuid",
    "title": "string",
    "description": "string|null",
    "assigneeId": "uuid|null",
    "priority": "string",
    "dueDate": "ISO8601|null",
    "position": "number",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not authorized
- `404` - Task or target column not found

**Notes:**
- Route must come BEFORE `/:taskId` to match correctly

---

### 14. Delete Task
- **Method:** `DELETE`
- **Route:** `/api/tasks/:taskId`
- **Auth Required:** ✅ Yes (Bearer token)
- **Authorization:** ✅ Task owner or workspace admin

**Response (204 No Content):**
```
(empty body)
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - User is not authorized
- `404` - Task not found

---

## Column Endpoints

### 15. Create Column
- **Method:** `POST`
- **Route:** `/api/workspaces/:id/columns`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Request Body:**
```json
{
  "title": "string (required, max 100)"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "title": "string",
    "position": "number"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Workspace not found

---

### 16. Update Column
- **Method:** `PATCH`
- **Route:** `/api/columns/:columnId`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Request Body:**
```json
{
  "title": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "title": "string",
    "position": "number"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Column not found

**Notes:**
- Route must come BEFORE `/:columnId/reorder` to match correctly

---

### 17. Reorder Column
- **Method:** `PATCH`
- **Route:** `/api/columns/:columnId/reorder`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Request Body:**
```json
{
  "newPosition": "number (required, >= 0)"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "title": "string",
    "position": "number"
  }
}
```

**Error Codes:**
- `400` - Invalid input
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Column not found

**Notes:**
- Route must come BEFORE `/:columnId` to match correctly

---

### 18. Delete Column
- **Method:** `DELETE`
- **Route:** `/api/columns/:columnId`
- **Auth Required:** ✅ Yes (Bearer token)
- **Membership Required:** ✅ Yes

**Response (204 No Content):**
```
(empty body)
```

**Error Codes:**
- `401` - Missing or invalid token
- `403` - User is not member of workspace
- `404` - Column not found

---

## Health Check

### Health Status
- **Method:** `GET`
- **Route:** `/health`
- **Auth Required:** ❌ No

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "ISO8601"
}
```

---

## Security & Rate Limiting

### Global Rate Limit
- **Window:** Configurable (default: 15 minutes)
- **Max Requests:** Configurable (default: 100 per window)
- **Applied to:** All endpoints

### Auth-Specific Rate Limit
- **Window:** Configurable (default: 15 minutes)
- **Max Requests:** Configurable (default: 10 per window)
- **Applied to:** `/auth/login` and `/auth/register`

### Response Headers
```
RateLimit-Limit: number
RateLimit-Remaining: number
RateLimit-Reset: ISO8601
```

---

## Error Handling

All errors return appropriate HTTP status codes with the following format:

```json
{
  "status": "error",
  "message": "string",
  "code": "string (optional)"
}
```

### Common Error Codes
| Code | Status | Meaning |
|------|--------|---------|
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but not authorized for resource |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## Authentication

### Token Storage
- **Access Token:** Stored in memory (expires in ~15 minutes)
- **Refresh Token:** Stored in localStorage (expires in ~7 days)

### Token Format
Both tokens are JWT with payload:
```json
{
  "sub": "user_id",
  "email": "user_email",
  "name": "user_name",
  "iat": "timestamp",
  "exp": "timestamp"
}
```

### How to Use Tokens
Include access token in Authorization header:
```
Authorization: Bearer {accessToken}
```

---

## Notes

- All timestamps are in ISO8601 format
- All IDs are UUIDs
- Request/response bodies use `Content-Type: application/json`
- CORS is enabled for configured origin
- Maximum payload size: 10KB
