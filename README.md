# HostelOS

A full-stack property and co-living management platform built for PG accommodations, hostels, and managed residences. HostelOS consolidates resident management, access control, finance tracking, mess operations, and complaints into a single production-ready application.

---

## Overview

Managing a co-living space involves coordinating across multiple operational domains simultaneously — resident onboarding, rent collection, visitor security, maintenance, and daily dining. HostelOS was built to replace fragmented spreadsheets and manual processes with a unified, real-time dashboard that any staff role can use without training overhead.

The application is split into a React + TypeScript frontend served via Vite, and an Express + SQLite backend API. The frontend can be deployed independently as a static SPA on Vercel or Netlify; the backend is designed to migrate to PostgreSQL for production use.

---

## Features

**Resident Management**
- Onboard residents with contact details, emergency contacts, and bed assignments
- Track status across the full lifecycle: pending → active → notice → checked out
- Visual bed and room grid showing occupancy at a glance

**Access Control & Visitor Security**
- Pre-register visitors against a resident record
- Issue QR-code gate passes with tokenized, time-limited access
- Self check-in portal (`/self-check-in.html`) — a standalone mobile page visitors open without logging in
- Overdue checkout alerts for visitors who have not exited

**Finance & Ledger**
- Track rent invoices, partial payments, and outstanding dues per resident
- Log operational expenses against categories
- Interactive charts for monthly collections and expense trends
- Export ledger data for accounting

**Complaints & Maintenance**
- Submit, assign, and resolve maintenance tickets or resident complaints
- Priority levels (low / medium / high / urgent) with SLA due dates
- Status workflow: open → in progress → resolved → closed

**Mess & Dining Operations**
- Set daily menus (breakfast, lunch, snacks, dinner)
- Mark and track meal attendance per resident per day

**Notice Board**
- Publish notices scoped to all residents or specific audiences
- Draft, publish, archive workflow with expiry support

**Audit Log**
- Immutable audit trail of all create, update, and delete actions with before/after state

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Vanilla CSS with CSS custom properties |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| QR codes | qrcode.react |
| Backend | Node.js + Express |
| Database (dev) | JSON flat-file (zero config) |
| Database (prod) | PostgreSQL (schema included) |
| Validation | Zod |
| Security headers | Helmet |
| Testing | Vitest + Supertest |
| Deployment | Vercel (frontend) · Railway / Render (backend) |

---

## Project Structure

```
HostelOS/
├── backend/
│   ├── index.js          # All API route handlers
│   ├── server.js         # Express app entry point
│   ├── schema.sql        # Production PostgreSQL schema
│   ├── data.json         # Zero-config development data store
│   └── index.test.js     # API integration tests
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── vercel.json        # SPA routing for Vercel
    └── src/
        ├── App.tsx        # Main application shell + all views
        ├── styles.css     # Global design system
        ├── main.tsx       # React entry point
        └── shaders/
            └── landing-pages/   # 3D WebGL landing page renderer
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
node index.js
# API runs on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### Environment variables

Copy `.env.example` to `.env` and fill in values before starting either service.

```
VITE_API_URL=http://localhost:3001
```

---

## Database

The development backend uses a local `data.json` file — no database setup required to run locally.

For production, `backend/schema.sql` contains the full PostgreSQL schema including:
- UUID primary keys via `pgcrypto`
- Role-based access control on users
- Multi-property support
- Unique partial indexes for active bed assignments
- Full audit event log table

---

## Deployment

**Frontend (Vercel)**

Import the repository into Vercel. Set the root directory to `frontend`. Build command: `npm run build`. Output directory: `dist`. The included `vercel.json` handles SPA client-side routing automatically.

**Frontend (Netlify)**

Same build settings. The `public/_redirects` file handles routing.

**Backend**

Deploy to Railway, Render, or any Node-compatible host. Set `DATABASE_URL` in environment variables to point to a managed PostgreSQL instance. Run `schema.sql` once to initialize tables.

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover the core API routes using Vitest and Supertest against the in-memory data store.

---

## Security

- HTTP security headers via Helmet
- Input validation on all API endpoints using Zod schemas
- Visitor pass tokens are hashed before storage — raw tokens are never persisted
- CORS configured to accept requests only from the frontend origin
- Audit log records actor, action, entity, and before/after state for all mutations

---

## License

MIT
