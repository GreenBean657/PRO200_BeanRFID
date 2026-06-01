/*
       5 -AI DISCLAIMER
       6 -SEED.JS IS AI GENERATED CODE.
       7 -SEED.JS IS AI GENERATED CODE.
       8 -AI DISCLAIMER
       */
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rooms = [
  { id: '101', description: 'Computer Lab 1' },
  { id: '102', description: 'Computer Lab 2' },
  { id: '201', description: 'Lecture Hall A' },
  { id: '202', description: 'Lecture Hall B' },
  { id: '301', description: 'Capstone Lab' },
  { id: '302', description: 'Server Room' },
];

const users = [
  { name: 'Admin User',    email: 'admin@neumont.edu',    password: 'admin123',   role: 'admin',     rooms: [] },
  { name: 'Jane Smith',    email: 'jsmith@neumont.edu',   password: 'teacher123', role: 'teacher',   rooms: ['101', '102'] }, //Here
  { name: 'Mark Johnson',  email: 'mjohnson@neumont.edu', password: 'teacher123', role: 'teacher',   rooms: ['201', '202'] },
  { name: 'Tom Baker',     email: 'tbaker@neumont.edu',   password: 'student123', role: 'assistant', rooms: [] },
  { name: 'Sara Chen',     email: 'schen@neumont.edu',    password: 'student123', role: 'assistant', rooms: [] },
];

// Translation layer: RFID badge number -> student identity (see backend/port.py).
// Mock raw badge data — one entry per student so every scan resolves to someone.
const badges = [
  { badgeNumber: '0004820017', studentId: 'N10001', studentName: 'Alice Harper' },
  { badgeNumber: '0006910238', studentId: 'N10002', studentName: 'Bob Martinez' },
  { badgeNumber: '0003110492', studentId: 'N10003', studentName: 'Carol Nguyen' },
  { badgeNumber: '0008450671', studentId: 'N10004', studentName: 'David Park' },
  { badgeNumber: '0002730845', studentId: 'N10005', studentName: 'Emma Wilson' },
  { badgeNumber: '0009120304', studentId: 'N10006', studentName: 'Frank Torres' },
  { badgeNumber: '0005640199', studentId: 'N10007', studentName: 'Grace Lee' },
  { badgeNumber: '0001980526', studentId: 'N10008', studentName: 'Henry Adams' },
  { badgeNumber: '0007360410', studentId: 'N10009', studentName: 'Isla Chen' },
  { badgeNumber: '0004410783', studentId: 'N10010', studentName: 'Jake Rivera' },
  { badgeNumber: '0006050277', studentId: 'N10011', studentName: 'Karen White' },
  { badgeNumber: '0003890164', studentId: 'N10012', studentName: 'Liam Scott' },
  { badgeNumber: '0008720935', studentId: 'N10013', studentName: 'Mia Brown' },
  { badgeNumber: '0002340658', studentId: 'N10014', studentName: 'Noah Davis' },
  { badgeNumber: '0009480021', studentId: 'N10015', studentName: 'Olivia Clark' },
  { badgeNumber: '0005170390', studentId: 'N10016', studentName: 'Peter Hall' },
  { badgeNumber: '0001650742', studentId: 'N10017', studentName: 'Quinn Young' },
  { badgeNumber: '0007940113', studentId: 'N10018', studentName: 'Rachel King' },
  { badgeNumber: '0004260588', studentId: 'N10019', studentName: 'Sam Wright' },
  { badgeNumber: '0006830947', studentId: 'N10020', studentName: 'Tina Lopez' },
  { badgeNumber: '0001460855', studentId: 'N10021', studentName: 'Nathaniel Cruz' },
];

const attendance = [
  { studentName: 'Alice Harper',  studentId: 'N10001', classId: 'CSC220', roomId: '101', present: true,  arrivedAt: '2026-05-17T08:02:11Z' },
  { studentName: 'Bob Martinez',  studentId: 'N10002', classId: 'CSC220', roomId: '101', present: true,  arrivedAt: '2026-05-17T08:03:45Z' },
  { studentName: 'Grace Lee',     studentId: 'N10007', classId: 'CSC220', roomId: '101', present: false },
  { studentName: 'Jake Rivera',   studentId: 'N10010', classId: 'CSC220', roomId: '101', present: true,  arrivedAt: '2026-05-17T08:10:33Z' },
  { studentName: 'Olivia Clark',  studentId: 'N10015', classId: 'CSC220', roomId: '101', present: false },
  { studentName: 'Frank Torres',  studentId: 'N10006', classId: 'WEB310', roomId: '102', present: true,  arrivedAt: '2026-05-17T09:05:22Z' },
  { studentName: 'Mia Brown',     studentId: 'N10013', classId: 'WEB310', roomId: '102', present: false },
  { studentName: 'Rachel King',   studentId: 'N10018', classId: 'WEB310', roomId: '102', present: true,  arrivedAt: '2026-05-17T09:08:44Z' },
  { studentName: 'Sam Wright',    studentId: 'N10019', classId: 'WEB310', roomId: '102', present: false },
  { studentName: 'Carol Nguyen',  studentId: 'N10003', classId: 'NET101', roomId: '201', present: true,  arrivedAt: '2026-05-17T08:15:00Z' },
  { studentName: 'Henry Adams',   studentId: 'N10008', classId: 'NET101', roomId: '201', present: true,  arrivedAt: '2026-05-17T08:17:22Z' },
  { studentName: 'Noah Davis',    studentId: 'N10014', classId: 'NET101', roomId: '201', present: true,  arrivedAt: '2026-05-17T08:20:05Z' },
  { studentName: 'Quinn Young',   studentId: 'N10017', classId: 'NET101', roomId: '201', present: true,  arrivedAt: '2026-05-17T08:22:18Z' },
  { studentName: 'David Park',    studentId: 'N10004', classId: 'SEC440', roomId: '202', present: true,  arrivedAt: '2026-05-17T08:20:30Z' },
  { studentName: 'Karen White',   studentId: 'N10011', classId: 'SEC440', roomId: '202', present: false },
  { studentName: 'Tina Lopez',    studentId: 'N10020', classId: 'SEC440', roomId: '202', present: false },
  { studentName: 'Emma Wilson',   studentId: 'N10005', classId: 'PRO200', roomId: '301', present: true,  arrivedAt: '2026-05-17T09:00:00Z' },
  { studentName: 'Liam Scott',    studentId: 'N10012', classId: 'PRO200', roomId: '301', present: false },
  { studentName: 'Isla Chen',     studentId: 'N10009', classId: 'SYS305', roomId: '302', present: true,  arrivedAt: '2026-05-17T10:00:00Z' },
  { studentName: 'Peter Hall',    studentId: 'N10016', classId: 'SYS305', roomId: '302', present: false },
];

async function seed() {
  try {
    for (const room of rooms) {
      await pool.query(
        'INSERT INTO rooms (id, description) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [room.id, room.description],
      );
    }

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'INSERT INTO users (username, email, password_hash, role, assigned_rooms) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
        [user.name, user.email, hash, user.role, user.rooms],
      );
    }

    for (const badge of badges) {
      await pool.query(
        'INSERT INTO badges (badge_number, student_id, student_name) VALUES ($1, $2, $3) ON CONFLICT (badge_number) DO NOTHING',
        [badge.badgeNumber, badge.studentId, badge.studentName],
      );
    }

    for (const record of attendance) {
      await pool.query(
        `INSERT INTO attendance (student_name, student_id, class_id, room_id, present, arrived_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [record.studentName, record.studentId, record.classId, record.roomId, record.present, record.arrivedAt ?? null],
      );
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
