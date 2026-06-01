import React, { useState, useMemo } from 'react';
import { AttendanceRecord, SortField, SortDirection } from '../types';
import { getClassChipStyle, getRoomChipStyle } from '../utils/classColor';
import './AttendanceTable.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

interface TableProps {
  records: AttendanceRecord[];
  canExport: boolean;
  alwaysMaskIds?: boolean;
  onExport?: () => void;
  onOverride: (recordId: string, present: boolean) => Promise<void>;
  availableRooms: string[];
}

export default function AttendanceTable({ records, canExport, alwaysMaskIds, onExport, onOverride, availableRooms }: TableProps) {
  const [sortField, setSortField] = useState<SortField>('studentName');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [roomFilter, setRoomFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [maskIds, setMaskIds] = useState(true);

  const availableClasses = useMemo(() => {
    const seen = new Set<string>();
    records.forEach(r => seen.add(r.classId));
    return Array.from(seen).sort();
  }, [records]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  async function handleOverride(recordId: string, present: boolean) {
    setPendingId(recordId);
    try {
      await onOverride(recordId, present);
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    return records.filter(r => {
      const roomMatch = roomFilter === 'all' || r.room === roomFilter;
      const classMatch = classFilter === 'all' || r.classId === classFilter;
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'present' && r.present) ||
        (statusFilter === 'absent' && !r.present);
      return roomMatch && classMatch && statusMatch;
    });
  }, [records, roomFilter, classFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | boolean | undefined;
      let bv: string | boolean | undefined;

      if (sortField === 'arrivedAt') {
        // Absent students sort to end regardless of direction
        if (!a.arrivedAt && !b.arrivedAt) return 0;
        if (!a.arrivedAt) return 1;
        if (!b.arrivedAt) return -1;
        av = a.arrivedAt;
        bv = b.arrivedAt;
      } else {
        av = a[sortField] as string | boolean;
        bv = b[sortField] as string | boolean;
      }

      const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const presentCount = filtered.filter(r => r.present).length;

  function SortIndicator({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="attendance-wrapper">
      <div className="table-toolbar">
        <div className="table-filters">
          <div className="filter-group">
            <label>Room</label>
            <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
              <option value="all">All Rooms</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Class</label>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Students</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        <div className="table-toolbar-right">
          <span className="record-count">
            {presentCount} / {filtered.length} present
          </span>
          {!alwaysMaskIds && (
            <button
              className="btn-mask-toggle"
              onClick={() => setMaskIds(m => !m)}
              title={maskIds ? 'Show full student IDs' : 'Mask student IDs'}
            >
              {maskIds ? '👁 Show IDs' : '🚫 Hide IDs'}
            </button>
          )}
          {canExport && (
            <button className="btn-export" onClick={onExport}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table className="attendance-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('studentName')} className="sortable">
                Student Name <SortIndicator field="studentName" />
              </th>
              <th onClick={() => handleSort('studentId')} className="sortable">
                Student ID <SortIndicator field="studentId" />
              </th>
              <th onClick={() => handleSort('classId')} className="sortable">
                Class <SortIndicator field="classId" />
              </th>
              <th onClick={() => handleSort('room')} className="sortable">
                Room <SortIndicator field="room" />
              </th>
              <th onClick={() => handleSort('arrivedAt')} className="sortable">
                Arrived At <SortIndicator field="arrivedAt" />
              </th>
              <th onClick={() => handleSort('present')} className="sortable">
                Status <SortIndicator field="present" />
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">No students match the current filters.</td>
              </tr>
            ) : (
              sorted.map(record => {
                const isPending = pendingId === record.id;
                const notInSystem = record.enrolled === false;
                const rowClass = [record.present ? '' : 'row-absent', notInSystem ? 'row-unenrolled' : '']
                  .filter(Boolean)
                  .join(' ');
                return (
                  <tr key={record.id} className={rowClass}>
                    <td>
                      {record.studentName}
                      {notInSystem && (
                        <span
                          className="badge-unenrolled"
                          title="Scanned in / here, but not on this room's roster — not in the system"
                        >
                          ⚠ Not in system
                        </span>
                      )}
                    </td>
                    <td className="monospace">
                      {maskIds
                        ? <span className="masked-id">{record.studentId.slice(0, 3)}{'•'.repeat(record.studentId.length - 3)}</span>
                        : record.studentId}
                    </td>
                    <td><span style={getClassChipStyle(record.classId)}>{record.classId}</span></td>
                    <td><span style={getRoomChipStyle(record.room)}>{record.room}</span></td>
                    <td className="monospace">
                      {record.arrivedAt ? formatTime(record.arrivedAt) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${record.present ? 'status-present' : 'status-absent'}`}>
                        {record.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-override ${record.present ? 'override-absent' : 'override-present'}`}
                        onClick={() => handleOverride(record.id, !record.present)}
                        disabled={isPending}
                      >
                        {isPending ? '…' : record.present ? 'Mark Absent' : 'Mark Present'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
