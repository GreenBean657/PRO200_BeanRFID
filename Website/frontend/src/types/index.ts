export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedRooms: string[];
  assignedClasses?: string[];
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  studentId: string;
  classId: string; // e.g. "CSC220" — always 6 characters
  room: string;    // 3-digit room number, e.g. "101"
  present: boolean;
  arrivedAt?: string; // ISO 8601 — only set when present === true
}

export interface OverrideLog {
  id: string;
  studentName: string;
  studentId: string;
  classId: string;
  room: string;
  overriddenBy: string; // display name of the staff member
  overriddenAt: string; // ISO 8601
  from: boolean;
  to: boolean;
}

export interface ExportLog {
  id: string;
  exportedBy: string;
  exportedAt: string;
  exportType: 'attendance' | 'override-log';
  recordCount: number;
}

export interface Room {
  id: string;
  number: string;    // 3-digit, e.g. "101"
  description: string;
}

export type SortField = 'studentName' | 'studentId' | 'classId' | 'room' | 'present' | 'arrivedAt';
export type SortDirection = 'asc' | 'desc';
