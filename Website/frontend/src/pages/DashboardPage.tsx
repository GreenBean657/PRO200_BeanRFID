import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceTable from '../components/AttendanceTable';
import { useAuth } from '../context/AuthContext';
import { getAttendance, getRooms, exportAttendanceCSV, markAttendance, logExport } from '../services/api';
import { AttendanceRecord, Room } from '../types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const canExport = !isStudent;

  useEffect(() => {
    const allowedRooms = isAdmin || isStudent ? undefined : user?.assignedRooms;
    const allowedClasses = isStudent ? (user?.assignedClasses ?? []) : undefined;

    async function load() {
      try {
        const [data, roomData] = await Promise.all([
          getAttendance(allowedRooms, allowedClasses),
          getRooms(),
        ]);
        setRecords(data);

        let filteredRooms = roomData;
        if (!isAdmin) {
          if (isStudent) {
            const studentRooms = new Set(data.map(r => r.room));
            filteredRooms = roomData.filter(r => studentRooms.has(r.number));
          } else {
            filteredRooms = roomData.filter(r => user?.assignedRooms.includes(r.number));
          }
        }
        setRooms(filteredRooms);
      } catch {
        setError('Failed to load attendance data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin, isStudent, user?.assignedRooms, user?.assignedClasses]);

  async function handleExport() {
    const csv = await exportAttendanceCSV(records);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logExport('attendance', user!.name, records.length);
  }

  async function handleOverride(recordId: string, present: boolean) {
    const { record } = await markAttendance(recordId, present, user!.name);
    setRecords(rs => rs.map(r => r.id === recordId ? record : r));
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Today's Attendance</h2>
            <p className="page-subtitle">
              {isAdmin
                ? 'All rooms'
                : isStudent
                  ? `Classes: ${user?.assignedClasses?.join(', ')}`
                  : `Rooms: ${user?.assignedRooms.join(', ')}`}
            </p>
          </div>
        </div>

        {loading && <div className="loading-state">Loading records…</div>}
        {error && <div className="error-state">{error}</div>}

        {!loading && !error && (
          <AttendanceTable
            records={records}
            canExport={canExport}
            alwaysMaskIds={isStudent}
            onExport={canExport ? handleExport : undefined}
            onOverride={handleOverride}
            availableRooms={rooms.map(r => r.number)}
          />
        )}
      </main>
    </div>
  );
}
