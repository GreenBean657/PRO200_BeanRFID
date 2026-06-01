const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

pool.query(`
  CREATE TABLE IF NOT EXISTS access_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    route       VARCHAR(100) NOT NULL,
    query_params JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create access_logs table:', err));

function logAccess(userId, route, queryParams = {}) {
  pool.query(
    'INSERT INTO access_logs (user_id, route, query_params) VALUES ($1, $2, $3)',
    [userId, route, queryParams],
  ).catch(err => console.error('Access log failed:', err));
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
  next();
}

function requireStaff(req, res, next) {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden.' });
  next();
}

function toUser(row) {
  return {
    id: String(row.id),
    name: row.username,
    email: row.email,
    role: row.role === 'assistant' ? 'student' : row.role,
    assignedRooms: row.assigned_rooms || [],
  };
}

function toRecord(row) {
  return {
    id: String(row.id),
    studentName: row.student_name,
    studentId: row.student_id,
    classId: row.class_id,
    room: row.room_id,
    present: row.present,
    enrolled: row.enrolled,
    ...(row.arrived_at ? { arrivedAt: row.arrived_at.toISOString() } : {}),
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'db unavailable', error: err.message });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const dbUser = result.rows[0];
    if (!dbUser || !(await bcrypt.compare(password, dbUser.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = toUser(dbUser);
    const token = jwt.sign(
      { id: user.id, role: user.role, assignedRooms: user.assignedRooms },
      JWT_SECRET,
      { expiresIn: '8h' },
    );
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/attendance', verifyToken, requireStaff, async (req, res) => {
  const { classes } = req.query;
  let requestedRooms = req.query.rooms ? req.query.rooms.split(',').map(r => r.trim()) : null;

  if (req.user.role === 'teacher') {
    const allowed = req.user.assignedRooms;
    requestedRooms = requestedRooms ? requestedRooms.filter(r => allowed.includes(r)) : allowed;
  }

  let query = 'SELECT id, student_name, student_id, class_id, room_id, present, enrolled, arrived_at FROM attendance WHERE 1=1';
  const params = [];

  if (requestedRooms) {
    params.push(requestedRooms);
    query += ` AND room_id = ANY($${params.length})`;
  }
  if (classes) {
    params.push(classes.split(',').map(c => c.trim()));
    query += ` AND class_id = ANY($${params.length})`;
  }

  try {
    const result = await pool.query(query, params);
    logAccess(req.user.id, 'GET /api/attendance', { rooms: requestedRooms, classes: classes ?? null });
    res.json(result.rows.map(toRecord));
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/classes', verifyToken, requireStaff, async (req, res) => {
  try {
    let query = 'SELECT DISTINCT class_id, room_id FROM attendance';
    const params = [];

    if (req.user.role === 'teacher') {
      params.push(req.user.assignedRooms);
      query += ' WHERE room_id = ANY($1)';
    }

    query += ' ORDER BY class_id';
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({ classId: row.class_id, room: row.room_id })));
  } catch (err) {
    console.error('Classes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/attendance/overrides', verifyToken, requireStaff, async (req, res) => {
  try {
    let query = `
      SELECT ol.id, ol.overridden_by, ol.from_status, ol.to_status, ol.created_at,
             a.student_name, a.student_id, a.class_id, a.room_id
      FROM override_logs ol
      JOIN attendance a ON ol.attendance_id = a.id
    `;
    const params = [];

    if (req.user.role === 'teacher') {
      params.push(req.user.assignedRooms);
      query += ' WHERE a.room_id = ANY($1)';
    }

    query += ' ORDER BY ol.created_at DESC';
    const result = await pool.query(query, params);
    logAccess(req.user.id, 'GET /api/attendance/overrides');
    res.json(result.rows.map(row => ({
      id: String(row.id),
      studentName: row.student_name,
      studentId: row.student_id,
      classId: row.class_id,
      room: row.room_id,
      overriddenBy: row.overridden_by,
      overriddenAt: row.created_at.toISOString(),
      from: row.from_status,
      to: row.to_status,
    })));
  } catch (err) {
    console.error('Override logs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.patch('/api/attendance/:id', verifyToken, requireStaff, async (req, res) => {
  const { present, overriddenBy } = req.body;
  const id = parseInt(req.params.id);
  try {
    const existing = await pool.query('SELECT * FROM attendance WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Record not found.' });

    const prev = existing.rows[0];
    if (req.user.role === 'teacher' && !req.user.assignedRooms.includes(prev.room_id)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const arrivedAt = present ? (prev.arrived_at ?? new Date()) : null;
    const updated = await pool.query(
      'UPDATE attendance SET present = $1, arrived_at = $2 WHERE id = $3 RETURNING *',
      [present, arrivedAt, id],
    );
    const log = await pool.query(
      'INSERT INTO override_logs (attendance_id, overridden_by, from_status, to_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, overriddenBy, prev.present, present],
    );

    const logRow = log.rows[0];
    res.json({
      record: toRecord(updated.rows[0]),
      log: {
        id: String(logRow.id),
        studentName: prev.student_name,
        studentId: prev.student_id,
        classId: prev.class_id,
        room: prev.room_id,
        overriddenBy: logRow.overridden_by,
        overriddenAt: logRow.created_at.toISOString(),
        from: logRow.from_status,
        to: logRow.to_status,
      },
    });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/rooms', verifyToken, requireStaff, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, description FROM rooms ORDER BY id');
    res.json(result.rows.map(row => ({ id: row.id, number: row.id, description: row.description || '' })));
  } catch (err) {
    console.error('Rooms error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/rooms', verifyToken, requireAdmin, async (req, res) => {
  const { number, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO rooms (id, description) VALUES ($1, $2) RETURNING *',
      [number, description],
    );
    const row = result.rows[0];
    res.status(201).json({ id: row.id, number: row.id, description: row.description || '' });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/api/rooms/:id', verifyToken, requireAdmin, async (req, res) => {
  const { number, description } = req.body;
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (number !== id) {
      await client.query('INSERT INTO rooms (id, description) VALUES ($1, $2)', [number, description]);
      await client.query('UPDATE attendance SET room_id = $1 WHERE room_id = $2', [number, id]);
      await client.query(
        'UPDATE users SET assigned_rooms = array_replace(assigned_rooms, $1, $2) WHERE $1 = ANY(assigned_rooms)',
        [id, number],
      );
      await client.query('DELETE FROM rooms WHERE id = $1', [id]);
    } else {
      await client.query('UPDATE rooms SET description = $1 WHERE id = $2', [description, id]);
    }
    await client.query('COMMIT');
    res.json({ id: number, number, description });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

app.delete('/api/rooms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, assigned_rooms FROM users ORDER BY id');
    res.json(result.rows.map(toUser));
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/users', verifyToken, requireStaff, async (req, res) => {
  const { name, email, password, role, assignedRooms } = req.body;
  if (role === 'admin') return res.status(403).json({ error: 'Admin accounts cannot be created in-app.' });
  if (req.user.role === 'teacher' && role !== 'student') {
    return res.status(403).json({ error: 'Teachers can only create student accounts.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const dbRole = role === 'student' ? 'assistant' : role;
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, assigned_rooms) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, hash, dbRole, assignedRooms || []],
    );
    res.status(201).json(toUser(result.rows[0]));
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.put('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, role, assignedRooms } = req.body;
  const dbRole = role === 'student' ? 'assistant' : role;
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, role = $3, assigned_rooms = $4 WHERE id = $5 RETURNING *',
      [name, email, dbRole, assignedRooms || [], req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(toUser(result.rows[0]));
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/exports/log', verifyToken, requireStaff, async (req, res) => {
  const { exportType, exportedBy, recordCount } = req.body;
  try {
    await pool.query(
      'INSERT INTO export_logs (exported_by, export_type, record_count) VALUES ($1, $2, $3)',
      [exportedBy, exportType, recordCount],
    );
    res.status(201).end();
  } catch (err) {
    console.error('Log export error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/exports/log', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM export_logs ORDER BY created_at DESC');
    res.json(result.rows.map(row => ({
      id: String(row.id),
      exportedBy: row.exported_by,
      exportedAt: row.created_at.toISOString(),
      exportType: row.export_type,
      recordCount: row.record_count,
    })));
  } catch (err) {
    console.error('Export logs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(port);
