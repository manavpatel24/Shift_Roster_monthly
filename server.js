import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Admin auth middleware
function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
  }
  next();
}

// Initialize database
async function initDB() {
  try {
    const sqlPath = path.join(__dirname, 'db', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

// ─── ROUTES ─────────────────────────────────────────────

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET roster data — optionally filter by month or specific date
app.get('/api/roster', async (req, res) => {
  try {
    const { month, date } = req.query;
    let query = `
      SELECT s.id, TO_CHAR(s.date, 'YYYY-MM-DD') as date, s.shift_type, s.status, e.name, e.job_title, e.id as employee_id
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id
    `;
    const params = [];

    if (date) {
      query += ' WHERE s.date = $1';
      params.push(date);
    } else if (month) {
      // month format: 2026-04
      query += ` WHERE TO_CHAR(s.date, 'YYYY-MM') = $1`;
      params.push(month);
    }

    query += ' ORDER BY s.date, e.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create/update a shift entry (admin only)
app.post('/api/roster', requireAdmin, async (req, res) => {
  try {
    const { employee_id, date, shift_type, status } = req.body;

    if (!employee_id || !date || !shift_type || !status) {
      return res.status(400).json({ error: 'Missing required fields: employee_id, date, shift_type, status' });
    }

    const result = await pool.query(
      `INSERT INTO shifts (employee_id, date, shift_type, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, date) 
       DO UPDATE SET shift_type = EXCLUDED.shift_type, status = EXCLUDED.status
       RETURNING *`,
      [employee_id, date, shift_type, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk create shifts (admin only)
app.post('/api/roster/bulk', requireAdmin, async (req, res) => {
  try {
    const { entries } = req.body; // Array of { employee_id, date, shift_type, status }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const results = [];
    for (const entry of entries) {
      const result = await pool.query(
        `INSERT INTO shifts (employee_id, date, shift_type, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, date) 
         DO UPDATE SET shift_type = EXCLUDED.shift_type, status = EXCLUDED.status
         RETURNING *`,
        [entry.employee_id, entry.date, entry.shift_type, entry.status]
      );
      results.push(result.rows[0]);
    }

    res.json({ created: results.length, entries: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a shift entry (admin only)
app.delete('/api/roster/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify admin password
app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

// Serve frontend static files in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── START ───────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Shift Roster API running on http://localhost:${PORT}`);
  });
});
