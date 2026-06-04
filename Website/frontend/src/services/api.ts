import { User, UserRole, AttendanceRecord, OverrideLog, ExportLog, Room, DailyAttendance } from '../types';

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('rfid_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Invalid email or password.');
  return body;
}

export async function getAttendance(rooms?: string[], classes?: string[], date?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (rooms?.length) params.set('rooms', rooms.join(','));
  if (classes?.length) params.set('classes', classes.join(','));
  if (date) params.set('date', date);
  const query = params.size ? `?${params}` : '';
  const res = await apiFetch(`/attendance${query}`);
  if (!res.ok) throw new Error('Failed to load attendance.');
  return res.json();
}

export async function getDailyAttendance(): Promise<DailyAttendance[]> {
  const res = await apiFetch('/attendance/daily');
  if (!res.ok) throw new Error('Failed to load attendance trend.');
  return res.json();
}

export async function getClasses(): Promise<{ classId: string; room: string }[]> {
  const res = await apiFetch('/classes');
  if (!res.ok) throw new Error('Failed to load classes.');
  return res.json();
}

export async function markAttendance(
  recordId: string,
  present: boolean,
  overriddenBy: string,
): Promise<{ record: AttendanceRecord; log: OverrideLog }> {
  const res = await apiFetch(`/attendance/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ present, overriddenBy }),
  });
  if (!res.ok) throw new Error('Failed to update attendance.');
  return res.json();
}

const FERPA_DISCLAIMER = '"FERPA PROTECTED — For authorized use only. Do not distribute without proper authorization."';

function sanitizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value.replace(/"/g, '""')}` : value.replace(/"/g, '""');
}

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

export async function getOverrideLogs(): Promise<OverrideLog[]> {
  const res = await apiFetch('/attendance/overrides');
  if (!res.ok) throw new Error('Failed to load override logs.');
  return res.json();
}

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

export async function logExport(
  exportType: ExportLog['exportType'],
  exportedBy: string,
  recordCount: number,
): Promise<void> {
  await apiFetch('/exports/log', {
    method: 'POST',
    body: JSON.stringify({ exportType, exportedBy, recordCount }),
  });
}

export async function getExportLogs(): Promise<ExportLog[]> {
  const res = await apiFetch('/exports/log');
  if (!res.ok) throw new Error('Failed to load export logs.');
  return res.json();
}

export async function getRooms(): Promise<Room[]> {
  const res = await apiFetch('/rooms');
  if (!res.ok) throw new Error('Failed to load rooms.');
  return res.json();
}

export async function createRoom(number: string, description: string): Promise<Room> {
  const res = await apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify({ number, description }),
  });
  if (!res.ok) throw new Error('Failed to create room.');
  return res.json();
}

export async function updateRoom(id: string, number: string, description: string): Promise<Room> {
  const res = await apiFetch(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ number, description }),
  });
  if (!res.ok) throw new Error('Failed to update room.');
  return res.json();
}

export async function deleteRoom(id: string): Promise<void> {
  const res = await apiFetch(`/rooms/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete room.');
}

export async function getUsers(): Promise<User[]> {
  const res = await apiFetch('/users');
  if (!res.ok) throw new Error('Failed to load users.');
  return res.json();
}

export async function createUser(
  data: Omit<User, 'id'> & { password: string },
  _createdBy?: { role: UserRole; assignedRooms: string[] },
): Promise<User> {
  const res = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to create user.');
  return body;
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
  const res = await apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user.');
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user.');
}