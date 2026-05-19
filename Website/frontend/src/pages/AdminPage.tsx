import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { User, Room, UserRole, OverrideLog, ExportLog } from '../types';
import { getClassChipStyle, getRoomChipStyle } from '../utils/classColor';
import {
  getUsers, createUser, updateUser, deleteUser,
  getRooms, createRoom, updateRoom, deleteRoom,
  getOverrideLogs, exportOverrideLogCSV,
  getExportLogs, logExport, getClasses,
} from '../services/api';
import './AdminPage.css';

type Tab = 'users' | 'rooms' | 'logs' | 'exports';
type LogSortField = 'overriddenAt' | 'overriddenBy' | 'classId' | 'room';
type SortDir = 'asc' | 'desc';

// ─── User Form ────────────────────────────────────────────────────────────────

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedRooms: string;
  assignedClasses: string;
}

function UserModal({
  initial,
  creatableRoles,
  availableClasses,
  onSave,
  onClose,
}: {
  initial?: User;
  creatableRoles: UserRole[];
  availableClasses: { classId: string; room: string }[];
  onSave: (data: UserFormData) => Promise<void>;
  onClose: () => void;
}) {
  const defaultRole = creatableRoles[0] ?? 'student';
  const [form, setForm] = useState<UserFormData>(
    initial
      ? {
          name: initial.name,
          email: initial.email,
          password: '',
          role: initial.role,
          assignedRooms: initial.assignedRooms.join(', '),
          assignedClasses: (initial.assignedClasses ?? []).join(', '),
        }
      : { name: '', email: '', password: '', role: defaultRole, assignedRooms: '', assignedClasses: '' }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(key: keyof UserFormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await onSave(form);
    } catch (e: any) {
      setErr(e.message || 'Save failed.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial ? 'Edit User' : 'Add User'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label>Full Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="jsmith@neumont.edu" />
          </div>
          <div className="form-field">
            <label>{initial ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required={!initial} placeholder="••••••••" />
          </div>

          {creatableRoles.length > 1 ? (
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value as UserRole)}>
                {creatableRoles.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label>Role</label>
              <input value={creatableRoles[0]} disabled />
            </div>
          )}

          {form.role === 'teacher' && (
            <div className="form-field">
              <label>Assigned Rooms (comma-separated)</label>
              <input value={form.assignedRooms} onChange={e => set('assignedRooms', e.target.value)} placeholder="101, 202" />
            </div>
          )}

          {form.role === 'student' && (
            <div className="form-field">
              <label>Assigned Classes</label>
              {availableClasses.length > 0 ? (
                <div className="class-checkboxes">
                  {availableClasses.map(({ classId, room }) => (
                    <label key={classId} className="class-checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.assignedClasses.split(',').map(s => s.trim()).includes(classId)}
                        onChange={e => {
                          const current = form.assignedClasses.split(',').map(s => s.trim()).filter(Boolean);
                          const next = e.target.checked
                            ? [...current, classId]
                            : current.filter(c => c !== classId);
                          set('assignedClasses', next.join(', '));
                        }}
                      />
                      <span style={getClassChipStyle(classId)}>{classId}</span>
                      <span className="class-room-hint">Room {room}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input value={form.assignedClasses} onChange={e => set('assignedClasses', e.target.value)} placeholder="CSC220, NET101" />
              )}
            </div>
          )}

          {err && <div className="form-error">{err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Room Form ────────────────────────────────────────────────────────────────

interface RoomFormData { number: string; description: string }
const emptyRoomForm: RoomFormData = { number: '', description: '' };

function RoomModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Room;
  onSave: (data: RoomFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoomFormData>(
    initial ? { number: initial.number, description: initial.description } : emptyRoomForm
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(key: keyof RoomFormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await onSave(form);
    } catch (e: any) {
      setErr(e.message || 'Save failed.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial ? 'Edit Room' : 'Add Room'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label>Room Number</label>
            <input value={form.number} onChange={e => set('number', e.target.value)} required placeholder="A101" />
          </div>
          <div className="form-field">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Computer Lab 1" />
          </div>
          {err && <div className="form-error">{err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<OverrideLog[]>([]);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [allClasses, setAllClasses] = useState<{ classId: string; room: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSort, setLogSort] = useState<{ field: LogSortField; dir: SortDir }>({ field: 'overriddenAt', dir: 'desc' });

  const [userModal, setUserModal] = useState<{ open: boolean; editing?: User }>({ open: false });
  const [roomModal, setRoomModal] = useState<{ open: boolean; editing?: Room }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'room'; id: string; label: string } | null>(null);

  useEffect(() => {
    const loads: Promise<any>[] = [getUsers(), getClasses()];
    if (isAdmin) loads.push(getRooms(), getOverrideLogs(), getExportLogs());

    Promise.all(loads).then(([u, cls, r, l, e]) => {
      setUsers(u);
      setAllClasses(cls);
      if (isAdmin) {
        setRooms(r);
        setLogs(l);
        setExportLogs(e);
      }
      setLoading(false);
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'logs') getOverrideLogs().then(setLogs);
    if (tab === 'exports') getExportLogs().then(setExportLogs);
  }, [tab, isAdmin]);

  // Classes the current user is allowed to assign to students they create
  const creatableClasses = isAdmin
    ? allClasses
    : allClasses.filter(c => user?.assignedRooms.includes(c.room));

  // Roles the current user is allowed to assign
  const creatableRoles: UserRole[] = isAdmin ? ['teacher', 'student'] : ['student'];

  // Users shown in the list
  const visibleUsers = isAdmin
    ? users
    : users.filter(u =>
        u.role === 'student' &&
        u.assignedClasses?.some(c => {
          const cls = allClasses.find(ac => ac.classId === c);
          return cls && user?.assignedRooms.includes(cls.room);
        })
      );

  // ─── User actions ──────────────────────────────────────────────────────────

  async function handleSaveUser(data: UserFormData) {
    const assignedRooms = data.role === 'teacher'
      ? data.assignedRooms.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const assignedClasses = data.role === 'student'
      ? data.assignedClasses.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (userModal.editing) {
      const updated = await updateUser(userModal.editing.id, {
        name: data.name,
        email: data.email,
        role: data.role,
        assignedRooms,
        assignedClasses,
      });
      setUsers(us => us.map(u => u.id === updated.id ? updated : u));
    } else {
      const created = await createUser(
        { name: data.name, email: data.email, password: data.password, role: data.role, assignedRooms, assignedClasses },
        isAdmin ? undefined : { role: user!.role, assignedRooms: user!.assignedRooms },
      );
      setUsers(us => [...us, created]);
    }
    setUserModal({ open: false });
  }

  async function handleDeleteUser(id: string) {
    await deleteUser(id);
    setUsers(us => us.filter(u => u.id !== id));
    setConfirmDelete(null);
  }

  // ─── Room actions ──────────────────────────────────────────────────────────

  async function handleSaveRoom(data: RoomFormData) {
    if (roomModal.editing) {
      const updated = await updateRoom(roomModal.editing.id, data.number, data.description);
      setRooms(rs => rs.map(r => r.id === updated.id ? updated : r));
    } else {
      const created = await createRoom(data.number, data.description);
      setRooms(rs => [...rs, created]);
    }
    setRoomModal({ open: false });
  }

  async function handleDeleteRoom(id: string) {
    await deleteRoom(id);
    setRooms(rs => rs.filter(r => r.id !== id));
    setConfirmDelete(null);
  }

  // ─── Log sort & export ────────────────────────────────────────────────────

  function handleLogSort(field: LogSortField) {
    setLogSort(s => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    );
  }

  const sortedLogs = [...logs].sort((a, b) => {
    const av = a[logSort.field] as string;
    const bv = b[logSort.field] as string;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return logSort.dir === 'asc' ? cmp : -cmp;
  });

  async function handleExportLogs() {
    const csv = await exportOverrideLogCSV(sortedLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `override-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logExport('override-log', 'Admin User', sortedLogs.length);
  }

  function LogSortIcon({ field }: { field: LogSortField }) {
    if (logSort.field !== field) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{logSort.dir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">{isAdmin ? 'Admin Panel' : 'Student Management'}</h2>
            <p className="page-subtitle">
              {isAdmin ? 'Manage users and room configurations' : 'Create and manage student (TA) accounts for your classes'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="admin-tabs">
            <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
              Users
            </button>
            <button className={`tab ${tab === 'rooms' ? 'active' : ''}`} onClick={() => setTab('rooms')}>
              Rooms
            </button>
            <button className={`tab ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
              Override Logs
              {logs.length > 0 && <span className="tab-badge">{logs.length}</span>}
            </button>
            <button className={`tab ${tab === 'exports' ? 'active' : ''}`} onClick={() => setTab('exports')}>
              Export Logs
              {exportLogs.length > 0 && <span className="tab-badge">{exportLogs.length}</span>}
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (!isAdmin || tab === 'users') ? (
          <div className="admin-section">
            <div className="section-toolbar">
              <span className="record-count">{visibleUsers.length} user{visibleUsers.length !== 1 ? 's' : ''}</span>
              <button className="btn-primary" onClick={() => setUserModal({ open: true })}>+ Add User</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>{isAdmin ? 'Assigned Rooms / Classes' : 'Assigned Classes'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="monospace">{u.email}</td>
                      <td><span className={`navbar-role-badge role-${u.role}`}>{u.role}</span></td>
                      <td>
                        {u.role === 'student'
                          ? (u.assignedClasses && u.assignedClasses.length > 0
                              ? u.assignedClasses.map(c => <span key={c} style={{ ...getClassChipStyle(c), marginRight: 4 }}>{c}</span>)
                              : <span className="text-muted">No classes</span>)
                          : (u.assignedRooms.length > 0
                              ? u.assignedRooms.map(r => <span key={r} style={{ ...getRoomChipStyle(r), marginRight: 4 }}>{r}</span>)
                              : <span className="text-muted">All rooms</span>)
                        }
                      </td>
                      <td className="row-actions">
                        <button className="btn-row-edit" onClick={() => setUserModal({ open: true, editing: u })}>Edit</button>
                        <button className="btn-row-delete" onClick={() => setConfirmDelete({ type: 'user', id: u.id, label: u.name })}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'logs' ? (
          <div className="admin-section">
            <div className="section-toolbar">
              <span className="record-count">{logs.length} override{logs.length !== 1 ? 's' : ''} today</span>
              {logs.length > 0 && (
                <button className="btn-primary" onClick={handleExportLogs}>Export CSV</button>
              )}
            </div>
            <div className="admin-table-wrap">
              {logs.length === 0 ? (
                <p className="empty-logs">No manual overrides have been recorded today.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="sortable-th" onClick={() => handleLogSort('overriddenAt')}>
                        Time <LogSortIcon field="overriddenAt" />
                      </th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th className="sortable-th" onClick={() => handleLogSort('classId')}>
                        Class <LogSortIcon field="classId" />
                      </th>
                      <th className="sortable-th" onClick={() => handleLogSort('room')}>
                        Room <LogSortIcon field="room" />
                      </th>
                      <th className="sortable-th" onClick={() => handleLogSort('overriddenBy')}>
                        Changed By <LogSortIcon field="overriddenBy" />
                      </th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLogs.map(log => (
                      <tr key={log.id}>
                        <td className="monospace">{formatDateTime(log.overriddenAt)}</td>
                        <td>{log.studentName}</td>
                        <td className="monospace">{log.studentId}</td>
                        <td><span style={getClassChipStyle(log.classId)}>{log.classId}</span></td>
                        <td><span style={getRoomChipStyle(log.room)}>{log.room}</span></td>
                        <td>{log.overriddenBy}</td>
                        <td>
                          <span className={`status-badge ${log.from ? 'status-present' : 'status-absent'}`}>
                            {log.from ? 'Present' : 'Absent'}
                          </span>
                          <span className="log-arrow">→</span>
                          <span className={`status-badge ${log.to ? 'status-present' : 'status-absent'}`}>
                            {log.to ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : tab === 'exports' ? (
          <div className="admin-section">
            <div className="section-toolbar">
              <span className="record-count">{exportLogs.length} export{exportLogs.length !== 1 ? 's' : ''} today</span>
            </div>
            <div className="admin-table-wrap">
              {exportLogs.length === 0 ? (
                <p className="empty-logs">No exports have been recorded today.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Exported By</th>
                      <th>Type</th>
                      <th>Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportLogs.map(entry => (
                      <tr key={entry.id}>
                        <td className="monospace">{formatDateTime(entry.exportedAt)}</td>
                        <td>{entry.exportedBy}</td>
                        <td>
                          <span className={`export-type-badge type-${entry.exportType}`}>
                            {entry.exportType === 'attendance' ? 'Attendance' : 'Override Log'}
                          </span>
                        </td>
                        <td className="monospace">{entry.recordCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="admin-section">
            <div className="section-toolbar">
              <span className="record-count">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
              <button className="btn-primary" onClick={() => setRoomModal({ open: true })}>+ Add Room</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r.id}>
                      <td><span style={getRoomChipStyle(r.number)}>{r.number}</span></td>
                      <td>{r.description || <span className="text-muted">—</span>}</td>
                      <td className="row-actions">
                        <button className="btn-row-edit" onClick={() => setRoomModal({ open: true, editing: r })}>Edit</button>
                        <button className="btn-row-delete" onClick={() => setConfirmDelete({ type: 'room', id: r.id, label: r.number })}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {userModal.open && (
        <UserModal
          initial={userModal.editing}
          creatableRoles={userModal.editing ? creatableRoles : creatableRoles}
          availableClasses={creatableClasses}
          onSave={handleSaveUser}
          onClose={() => setUserModal({ open: false })}
        />
      )}

      {isAdmin && roomModal.open && (
        <RoomModal
          initial={roomModal.editing}
          onSave={handleSaveRoom}
          onClose={() => setRoomModal({ open: false })}
        />
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p className="confirm-text">
              Are you sure you want to delete <strong>{confirmDelete.label}</strong>? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirmDelete.type === 'user') handleDeleteUser(confirmDelete.id);
                  else handleDeleteRoom(confirmDelete.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
