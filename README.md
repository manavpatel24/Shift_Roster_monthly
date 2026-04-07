# Support Department Shift Roster

A full-stack, dynamic calendar-based web application built specifically to manage and display 14x7 Support Department shifts. Built with an Express.js backend, PostgreSQL database, and a React (Vite) frontend.

## Features

- **Read-Only Roster Calendar**: Staff can view who is scheduled for Morning, Normal, Noon, and Extra Day shifts across different locations (Office / Home / Leave).
- **Admin Management GUI**: Secure password-gated access to add, edit, or delete shift entries natively via dropdown logic.
- **Bulk Employee Multi-Select**: Instead of assigning one-by-one, Admins can bulk-select multiple employees and drop them simultaneously into the same shift and location tag natively via the UI.
- **CSV Smart Upload Engine**: Drag and drop `.csv` files into the GUI to autonomously map and mass-allocate monthly rosters.
- **Month-End Export Engine**: Built-in CSV exporting to instantly parse the currently displayed month's database into an active Excel-ready format.
- **Absolute Timezone Locking**: Uses `TO_CHAR` explicit PostgreSQL mapping to bypass localized Node.js timezone offsets so 17th of the month absolutely translates to the 17th, regardless of the browser locale.

## Setup & Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### 2. Database Initialization
Ensure PostgreSQL has a database named `postgres` (or as configured in your `.env`) available via `172.16.12.223:5432`.
The application autonomously runs the schema generation sequence located inside `/db/init.sql` upon booting to instantiate missing tables or team seed-data.

### 3. Environment Variables
Create a `.env` file at the root:
```env
DATABASE_URL=postgresql://username:password@HOST:5432/dbname
ADMIN_PASSWORD=your_secure_password
PORT=3001
```

### 4. Install & Run
```bash
npm install
npm run dev
```
The application will boot concurrently, mapping Vite hot-reloading on port `5173` while actively proxying `/api` endpoint requests to your Express backend process on port `3001`.

## Ubuntu Server Deployment Instructions

To successfully deploy this onto an Ubuntu CLI, follow standard Node.js daemon processes via `pm2`:

1. **Pull Code**: `scp` this directory over to your internal Ubuntu server.
2. **Build Distribution**: 
   ```bash
   npm install
   npm run build
   ```
3. **Daemonize Process**: Ensure the backend permanently stays alive:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "shift-roster"
   pm2 startup
   ```
*(Note: Because of production logic baked into `server.js`, Express will actively serve the static compiled UI files located in `/dist` without requiring you to set up complex Vite routing, effectively hosting the entire Full-Stack system out of `server.js` alone).*
