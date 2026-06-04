import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceChart from '../components/AttendanceChart';
import { useAuth } from '../context/AuthContext';
import { getAttendance, getRooms, exportAttendanceCSV, markAttendance, logExport, getDailyAttendance } from '../services/api';
import { AttendanceRecord, Room, DailyAttendance } from '../types';
import './DashboardPage.css';

// Render a "YYYY-MM-DD" string as a friendly label without going through a
// timezone-aware Date parse (which can shift the day backward).
function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [daily, setDaily] = useState<DailyAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const canExport = !isStudent;

  // Days that actually have attendance, ascending. The navigator steps through
  // these so prev/next always land on a day with data.
  const dates = useMemo(() => daily.map(d => d.date), [daily]);
  const dateIndex = selectedDate ? dates.indexOf(selectedDate) : -1;
  const canPrev = dateIndex > 0;
  const canNext = dateIndex >= 0 && dateIndex < dates.length - 1;

  // Attendance trend loads independently of the table so it renders for every
  // role even when the per-record query is scoped or restricted. Default the
  // viewed day to the most recent one with data.
  useEffect(() => {
    getDailyAttendance()
      .then(d => {
        setDaily(d);
        if (d.length) setSelectedDate(prev => prev ?? d[d.length - 1].date);
        else setLoading(false);
      })
      .catch(() => { setDaily([]); setLoading(false); });
  }, []);

  // Reload the table whenever the selected day (or scope) changes.
  useEffect(() => {
    if (!selectedDate) return;
    const taMode = isStudent && (user?.assignedRooms?.length ?? 0) > 0;
    const allowedRooms = isAdmin ? undefined : user?.assignedRooms;
    const allowedClasses = isStudent && !taMode ? (user?.assignedClasses ?? []) : undefined;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [data, roomData] = await Promise.all([
          getAttendance(allowedRooms, allowedClasses, selectedDate!),
          getRooms(),
        ]);
        if (cancelled) return;
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
        if (!cancelled) setError('Failed to load attendance data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate, isAdmin, isStudent, user?.assignedRooms, user?.assignedClasses]);

  async function handleExport() {
    const csv = await exportAttendanceCSV(records);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate ?? new Date().toISOString().slice(0, 10)}.csv`;
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
            <h2 className="page-title">Attendance</h2>
            <p className="page-subtitle">
              {isAdmin
                ? 'All rooms'
                : isStudent && !(user?.assignedRooms?.length)
                  ? `Classes: ${user?.assignedClasses?.join(', ') ?? 'None'}`
                  : `Rooms: ${user?.assignedRooms?.join(', ')}`}
            </p>
          </div>

          {selectedDate && (
            <div className="day-nav">
              <button
                className="day-nav-btn"
                onClick={() => canPrev && setSelectedDate(dates[dateIndex - 1])}
                disabled={!canPrev}
                aria-label="Previous day"
              >
                ‹
              </button>
              <span className="day-nav-label">{formatLongDate(selectedDate)}</span>
              <button
                className="day-nav-btn"
                onClick={() => canNext && setSelectedDate(dates[dateIndex + 1])}
                disabled={!canNext}
                aria-label="Next day"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <AttendanceChart data={daily} />

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
