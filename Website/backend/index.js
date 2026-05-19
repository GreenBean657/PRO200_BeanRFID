const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'db unavailable', error: err.message });
  }
});

// TODO: implement API routes
// POST   /api/auth/login
// GET    /api/attendance
// PATCH  /api/attendance/:id
// GET    /api/attendance/overrides
// GET    /api/rooms
// POST   /api/rooms
// PUT    /api/rooms/:id
// DELETE /api/rooms/:id
// GET    /api/users
// POST   /api/users
// PUT    /api/users/:id
// DELETE /api/users/:id

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
