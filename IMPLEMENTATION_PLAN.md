# Technical Implementation & Architecture Plan

This document outlines the structural foundation upon which the Shift Roster application was built. It is intended to guide future developers inside the organization on logic constraints and structural flows.

## Architecture Topology
The architecture relies on a closely coupled Node.js API server combined with a React Single Page Application (SPA).

- **Frontend Engine**: React 18, managed via Vite (`@vitejs/plugin-react`). Built on a dynamic CSS variables architecture to enforce unified dark/light mode standards without conflicting styles.
- **Backend Framework**: Express.js, routing all `/api/*` data traffic via JSON to securely validate logic limits.
- **Database Logic**: `pg` (Node-PostgreSQL) actively pools queries to external IP (`172.16.12.223`) over standard `5432` ports. Bypasses localized formatting by enforcing `TO_CHAR(date, 'YYYY-MM-DD')` strictly isolated within the DB queries to prevent arbitrary +05:30 IST / node standard locale timestamp overlaps.

## Database Schema Model

### 1. `employees` table
Stores persistent team member data mapped natively from `OrgTree.csv`.
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR 100) — Enforces `UNIQUE` to prevent duplicated team lists.
- `job_title` (VARCHAR 150)

### 2. `shifts` table
Acts as the volatile tracking log for schedules dynamically joined against the `employees` reference IDs.
- `id` (SERIAL PRIMARY KEY)
- `employee_id` (INT) — Cascades deletion natively.
- `date` (DATE NOT NULL)
- `shift_type` (VARCHAR 20) — Enforces programmatic SQL validity check boundary: `IN ('Morning', 'Normal', 'Noon', 'Extra Day', '-')` so malformed payloads immediately trigger standard code-rejections.
- `status` (VARCHAR 20) — Boundary: `IN ('Office', 'Home', 'Leave')`

*A Compound `UNIQUE(employee_id, date)` constraint is enforced at SQL table levels explicitly prohibiting any developer from injecting double-shifts on the exact same day for the exact same employee organically.*

## API Payload Flows

#### Read State
The `App.jsx` hooks natively listen to the `currentDate` object tracking actively selected month ranges. Every arrow-click triggers `[GET] /api/roster?month=YYYY-MM`. Express validates and securely pulls the literal date constraints mapping directly out of SQL.

#### Component Injection State
`App.jsx` translates database maps to state objects, sorting components logically into `<div className="shift-group">` trees while filtering logic bounds (for example filtering `Extra Day` uniquely from `Morning` maps) applying UI coloring variables directly extracted from the top of `index.css`.

#### Admin Authentication Pipeline
A persistent `isAdmin` React hook state determines explicit UI tree blocks (allowing `<button>` objects mapped to delete hooks to structurally render).
A password barrier (defined arbitrarily in `.env`) holds the verification logic intercept passing a `true/false` return on `[POST] /api/auth/verify`. Submitting Admin commands securely routes `x-admin-password` context headers directly to backend `requireAdmin` custom middlewares effectively stopping backend abuse even if developers simulate direct cURL commands against the backend port endpoints.
