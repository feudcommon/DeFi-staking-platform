# Intern Registration API

A RESTful API built with **Node.js** and **Express** for managing intern registrations.

---

## Setup

```bash
npm install
node server.js
# → API running on http://localhost:3000
```

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interns` | List all interns |
| GET | `/api/interns/:id` | Get a single intern |
| POST | `/api/interns` | Register a new intern |
| PATCH | `/api/interns/:id` | Update intern details |
| DELETE | `/api/interns/:id` | Delete an intern |
| GET | `/api/stats/summary` | Get aggregated stats |

---

## Query Parameters

**GET /api/interns**
- `?department=Engineering` — filter by department
- `?status=active` — filter by status (`active`, `completed`, `terminated`)

---

## Request Body — POST /api/interns

```json
{
  "name":       "Jane Doe",
  "email":      "jane@example.com",
  "department": "Engineering",
  "startDate":  "2025-06-01",
  "duration":   12
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Min 2 characters |
| `email` | string | ✅ | Must be unique |
| `department` | string | ✅ | See valid values below |
| `startDate` | string | ✅ | ISO format: `YYYY-MM-DD` |
| `duration` | number | ❌ | Weeks (1–52), default 12 |

**Valid departments:** `Engineering`, `Design`, `Marketing`, `Finance`, `HR`, `Operations`

---

## Responses

All responses follow this shape:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "..." }
{ "success": false, "errors": ["...", "..."] }
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 404 | Not found |
| 409 | Email conflict |
| 500 | Server error |

---

## Examples

### Register an intern
```bash
curl -X POST http://localhost:3000/api/interns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Chen",
    "email": "alice@example.com",
    "department": "Engineering",
    "startDate": "2025-06-01",
    "duration": 16
  }'
```

### List Engineering interns
```bash
curl http://localhost:3000/api/interns?department=Engineering
```

### Update status
```bash
curl -X PATCH http://localhost:3000/api/interns/<id> \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```

### Stats summary
```bash
curl http://localhost:3000/api/stats/summary
```

---

## Data Model

```json
{
  "id":         "uuid-v4",
  "name":       "Alice Chen",
  "email":      "alice@example.com",
  "department": "Engineering",
  "startDate":  "2025-06-01",
  "duration":   16,
  "status":     "active",
  "createdAt":  "2025-05-27T10:00:00.000Z",
  "updatedAt":  "2025-05-27T10:00:00.000Z"
}
```

---

> **Note:** Data is stored in-memory. Swap the `interns` array with a database (MongoDB, PostgreSQL, etc.) for production use.
