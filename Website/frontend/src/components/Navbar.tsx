import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">N</span>
        <span className="navbar-title">BeanRFID</span>
        <span className="navbar-school">Neumont University</span>
      </div>

      <div className="navbar-links">
        <Link
          to="/dashboard"
          className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          Attendance
        </Link>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Link
            to="/admin"
            className={`navbar-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
          >
            {user.role === 'admin' ? 'Admin' : 'Students'}
          </Link>
        )}
      </div>

      <div className="navbar-user">
        <span className="navbar-user-name">{user?.name}</span>
        <span className={`navbar-role-badge role-${user?.role}`}>{user?.role}</span>
        <button className="navbar-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
