/**
 * api.ts — Mock API service layer.
 *
 * To connect to a real backend, replace each function body with a fetch() call
 * to your actual endpoint. BASE_URL is read from REACT_APP_API_URL env var.
 *
 * Example swap:
 *   export async function login(email: string, password: string) {
 *     const res = await fetch(`${BASE_URL}/auth/login`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ email, password }),
 *     });
 *     if (!res.ok) throw new Error('Invalid credentials');
 *     return res.json() as Promise<{ user: User; token: string }>;
 *   }
 */

import { User, UserRole, AttendanceRecord, OverrideLog, ExportLog, Room } from '../types';

export const BASE_URL = process.env.DATABASE_URL || 'http://localhost:8000/api';

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('rfid_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated fetch wrapper — use this when replacing mock functions with real calls.
 *
 *  Example:
 *    const res = await apiFetch('/attendance?rooms=101');
 *    if (!res.ok) throw new Error('Failed to load attendance.');
 *    return res.json();
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@neumont.edu',
    password: 'admin123',
    role: 'admin',
    assignedRooms: [],
  },
  {
    id: 'u2',
    name: 'Jane Smith',
    email: 'jsmith@neumont.edu',
    password: 'teacher123',
    role: 'teacher',
    assignedRooms: ['101', '102'],
  },
  {
    id: 'u3',
    name: 'Mark Johnson',
    email: 'mjohnson@neumont.edu',
    password: 'teacher123',
    role: 'teacher',
    assignedRooms: ['201', '202'],
  },
  {
    id: 'u4',
    name: 'Tom Baker',
    email: 'tbaker@neumont.edu',
    password: 'student123',
    role: 'student',
    assignedRooms: [],
    assignedClasses: ['CSC220'],
  },
  {
    id: 'u5',
    name: 'Sara Chen',
    email: 'schen@neumont.edu',
    password: 'student123',
    role: 'student',
    assignedRooms: [],
    assignedClasses: ['NET101', 'SEC440'],
  },
];

const MOCK_ROOMS: Room[] = [
  { id: 'r1', number: '101', description: 'Computer Lab 1' },
  { id: 'r2', number: '102', description: 'Computer Lab 2' },
  { id: 'r3', number: '201', description: 'Lecture Hall A' },
  { id: 'r4', number: '202', description: 'Lecture Hall B' },
  { id: 'r5', number: '301', description: 'Capstone Lab' },
  { id: 'r6', number: '302', description: 'Server Room' },
];

// Full class roster. Backend marks all present=false at day start;
// arrivedAt is set when the student's RFID card is scanned.
const MOCK_ATTENDANCE: AttendanceRecord[] = [
  // Room 101 — CSC220
  { id: 'a01', studentName: 'Alice Harper',   studentId: 'N10001', classId: 'CSC220', room: '101', present: true,  arrivedAt: '2026-05-17T08:02:11Z' },
  { id: 'a02', studentName: 'Bob Martinez',   studentId: 'N10002', classId: 'CSC220', room: '101', present: true,  arrivedAt: '2026-05-17T08:03:45Z' },
  { id: 'a03', studentName: 'Grace Lee',      studentId: 'N10007', classId: 'CSC220', room: '101', present: false },
  { id: 'a04', studentName: 'Jake Rivera',    studentId: 'N10010', classId: 'CSC220', room: '101', present: true,  arrivedAt: '2026-05-17T08:10:33Z' },
  { id: 'a05', studentName: 'Olivia Clark',   studentId: 'N10015', classId: 'CSC220', room: '101', present: false },
  // Room 102 — WEB310
  { id: 'a06', studentName: 'Frank Torres',   studentId: 'N10006', classId: 'WEB310', room: '102', present: true,  arrivedAt: '2026-05-17T09:05:22Z' },
  { id: 'a07', studentName: 'Mia Brown',      studentId: 'N10013', classId: 'WEB310', room: '102', present: false },
  { id: 'a08', studentName: 'Rachel King',    studentId: 'N10018', classId: 'WEB310', room: '102', present: true,  arrivedAt: '2026-05-17T09:08:44Z' },
  { id: 'a09', studentName: 'Sam Wright',     studentId: 'N10019', classId: 'WEB310', room: '102', present: false },
  // Room 201 — NET101
  { id: 'a10', studentName: 'Carol Nguyen',   studentId: 'N10003', classId: 'NET101', room: '201', present: true,  arrivedAt: '2026-05-17T08:15:00Z' },
  { id: 'a11', studentName: 'Henry Adams',    studentId: 'N10008', classId: 'NET101', room: '201', present: true,  arrivedAt: '2026-05-17T08:17:22Z' },
  { id: 'a12', studentName: 'Noah Davis',     studentId: 'N10014', classId: 'NET101', room: '201', present: true,  arrivedAt: '2026-05-17T08:20:05Z' },
  { id: 'a13', studentName: 'Quinn Young',    studentId: 'N10017', classId: 'NET101', room: '201', present: true,  arrivedAt: '2026-05-17T08:22:18Z' },
  // Room 202 — SEC440
  { id: 'a14', studentName: 'David Park',     studentId: 'N10004', classId: 'SEC440', room: '202', present: true,  arrivedAt: '2026-05-17T08:20:30Z' },
  { id: 'a15', studentName: 'Karen White',    studentId: 'N10011', classId: 'SEC440', room: '202', present: false },
  { id: 'a16', studentName: 'Tina Lopez',     studentId: 'N10020', classId: 'SEC440', room: '202', present: false },
  // Room 301 — PRO200
  { id: 'a17', studentName: 'Emma Wilson',    studentId: 'N10005', classId: 'PRO200', room: '301', present: true,  arrivedAt: '2026-05-17T09:00:00Z' },
  { id: 'a18', studentName: 'Liam Scott',     studentId: 'N10012', classId: 'PRO200', room: '301', present: false },
  // Room 302 — SYS305
  { id: 'a19', studentName: 'Isla Chen',      studentId: 'N10009', classId: 'SYS305', room: '302', present: true,  arrivedAt: '2026-05-17T10:00:00Z' },
  { id: 'a20', studentName: 'Peter Hall',     studentId: 'N10016', classId: 'SYS305', room: '302', present: false },
];

let mockUsers = [...MOCK_USERS];
let mockRooms = [...MOCK_ROOMS];
let mockAttendance = [...MOCK_ATTENDANCE];
let mockOverrideLogs: OverrideLog[] = [];
let mockExportLogs: ExportLog[] = [];

function delay(ms = 300): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

// ─── Health ───────────────────────────────────────────────────────────────────

/** GET /api/health — resolves true if backend is reachable */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/auth/login */
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  await delay();
  const found = mockUsers.find(u => u.email === email && u.password === password);
  if (!found) throw new Error('Invalid email or password.');
  const { password: _pw, ...user } = found;
  return { user, token: `mock-token-${user.id}` };
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/** GET /api/attendance?rooms=101,201 — pass classes to filter by classId instead */
export async function getAttendance(rooms?: string[], classes?: string[]): Promise<AttendanceRecord[]> {
  await delay();
  let result = [...mockAttendance];
  if (rooms && rooms.length > 0) result = result.filter(r => rooms.includes(r.room));
  if (classes && classes.length > 0) result = result.filter(r => classes.includes(r.classId));
  return result;
}

/** GET /api/classes — unique classId→room mappings derived from attendance */
export async function getClasses(): Promise<{ classId: string; room: string }[]> {
  await delay();
  const seen = new Map<string, string>();
  mockAttendance.forEach(r => { if (!seen.has(r.classId)) seen.set(r.classId, r.room); });
  return Array.from(seen.entries()).map(([classId, room]) => ({ classId, room }));
}

/**
 * PATCH /api/attendance/:id
 * Marks a student present or absent and records the override.
 */
export async function markAttendance(
  recordId: string,
  present: boolean,
  overriddenBy: string,
): Promise<{ record: AttendanceRecord; log: OverrideLog }> {
  await delay(150);
  const idx = mockAttendance.findIndex(r => r.id === recordId);
  if (idx === -1) throw new Error('Record not found.');

  const prev = mockAttendance[idx];
  const updated: AttendanceRecord = {
    ...prev,
    present,
    arrivedAt: present ? (prev.arrivedAt ?? new Date().toISOString()) : undefined,
  };
  mockAttendance = mockAttendance.map(r => r.id === recordId ? updated : r);

  const log: OverrideLog = {
    id: `log-${Date.now()}`,
    studentName: prev.studentName,
    studentId: prev.studentId,
    classId: prev.classId,
    room: prev.room,
    overriddenBy,
    overriddenAt: new Date().toISOString(),
    from: prev.present,
    to: present,
  };
  mockOverrideLogs = [log, ...mockOverrideLogs];

  return { record: updated, log };
}

const FERPA_DISCLAIMER = '"FERPA PROTECTED — For authorized use only. Do not distribute without proper authorization."';

// Prefix cells starting with formula characters to prevent CSV injection in
// Excel / Google Sheets (OWASP CSV Injection prevention).
function sanitizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value.replace(/"/g, '""')}` : value.replace(/"/g, '""');
}

/** GET /api/attendance/export — returns CSV string */
export async function exportAttendanceCSV(records: AttendanceRecord[]): Promise<string> {
  const header = 'Student Name,Student ID,Class,Room,Arrival Time,Present';
  const rows = records.map(r => [
    sanitizeCsvCell(r.studentName),
    sanitizeCsvCell(r.studentId),
    sanitizeCsvCell(r.classId),
    sanitizeCsvCell(r.room),
    r.arrivedAt ? sanitizeCsvCell(new Date(r.arrivedAt).toLocaleString()) : '',
    r.present ? 'Yes' : 'No',
  ].map(v => `"${v}"`).join(','));
  return [FERPA_DISCLAIMER, header, ...rows].join('\n');
}

// ─── Override Logs (admin only) ───────────────────────────────────────────────

/** GET /api/attendance/overrides */
export async function getOverrideLogs(): Promise<OverrideLog[]> {
  await delay();
  return [...mockOverrideLogs];
}

/** GET /api/attendance/overrides/export — returns CSV string */
export async function exportOverrideLogCSV(logs: OverrideLog[]): Promise<string> {
  const header = 'Time,Student Name,Student ID,Class,Room,Changed By,From,To';
  const rows = logs.map(l => [
    sanitizeCsvCell(new Date(l.overriddenAt).toLocaleString()),
    sanitizeCsvCell(l.studentName),
    sanitizeCsvCell(l.studentId),
    sanitizeCsvCell(l.classId),
    sanitizeCsvCell(l.room),
    sanitizeCsvCell(l.overriddenBy),
    l.from ? 'Present' : 'Absent',
    l.to   ? 'Present' : 'Absent',
  ].map(v => `"${v}"`).join(','));
  return [FERPA_DISCLAIMER, header, ...rows].join('\n');
}

// ─── Export Logs (admin only) ─────────────────────────────────────────────────

/** POST /api/exports/log */
export async function logExport(
  exportType: ExportLog['exportType'],
  exportedBy: string,
  recordCount: number,
): Promise<void> {
  const entry: ExportLog = {
    id: `exp-${Date.now()}`,
    exportedBy,
    exportedAt: new Date().toISOString(),
    exportType,
    recordCount,
  };
  mockExportLogs = [entry, ...mockExportLogs];
}

/** GET /api/exports/log */
export async function getExportLogs(): Promise<ExportLog[]> {
  await delay();
  return [...mockExportLogs];
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

/** GET /api/rooms */
export async function getRooms(): Promise<Room[]> {
  await delay();
  return [...mockRooms];
}

/** POST /api/rooms */
export async function createRoom(number: string, description: string): Promise<Room> {
  await delay();
  const room: Room = { id: `r${Date.now()}`, number, description };
  mockRooms = [...mockRooms, room];
  return room;
}

/** PUT /api/rooms/:id */
export async function updateRoom(id: string, number: string, description: string): Promise<Room> {
  await delay();
  mockRooms = mockRooms.map(r => r.id === id ? { ...r, number, description } : r);
  return mockRooms.find(r => r.id === id)!;
}

/** DELETE /api/rooms/:id */
export async function deleteRoom(id: string): Promise<void> {
  await delay();
  mockRooms = mockRooms.filter(r => r.id !== id);
}

// ─── Users (admin only) ───────────────────────────────────────────────────────

/** GET /api/users */
export async function getUsers(): Promise<User[]> {
  await delay();
  return mockUsers.map(({ password: _pw, ...u }) => u);
}

/** POST /api/users */
export async function createUser(
  data: Omit<User, 'id'> & { password: string },
  createdBy?: { role: UserRole; assignedRooms: string[] },
): Promise<User> {
  await delay();

  if (data.role === 'admin') throw new Error('Admin accounts cannot be created in-app.');

  if (createdBy?.role === 'teacher') {
    if (data.role !== 'student') throw new Error('Teachers can only create student accounts.');
    if (data.assignedClasses && data.assignedClasses.length > 0) {
      const teacherClasses = new Set(
        mockAttendance.filter(r => createdBy.assignedRooms.includes(r.room)).map(r => r.classId)
      );
      const invalid = data.assignedClasses.filter(c => !teacherClasses.has(c));
      if (invalid.length > 0) throw new Error(`Class(es) not in your assigned rooms: ${invalid.join(', ')}`);
    }
  }

  const user = { ...data, id: `u${Date.now()}` };
  mockUsers = [...mockUsers, user];
  const { password: _pw, ...result } = user;
  return result;
}

/** PUT /api/users/:id */
export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
  await delay();
  mockUsers = mockUsers.map(u => u.id === id ? { ...u, ...data } : u);
  const { password: _pw, ...result } = mockUsers.find(u => u.id === id)!;
  return result;
}

/** DELETE /api/users/:id */
export async function deleteUser(id: string): Promise<void> {
  await delay();
  mockUsers = mockUsers.filter(u => u.id !== id);
}
