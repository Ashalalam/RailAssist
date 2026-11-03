import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BottomNav = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="bottom-nav no-print">
      <NavLink 
        to="/" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <i className="bi bi-grid-fill"></i>
        <span>Dashboard</span>
      </NavLink>

      <NavLink 
        to="/journeys" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className="bi bi-calendar-event-fill"></i>
        <span>Duty Logs</span>
      </NavLink>

      <NavLink 
        to="/reports" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className="bi bi-file-earmark-bar-graph-fill"></i>
        <span>Statements</span>
      </NavLink>

      <NavLink 
        to="/settings" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className="bi bi-gear-fill"></i>
        <span>Settings</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
