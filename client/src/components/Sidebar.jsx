import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  IndianRupee, 
  BarChart3, 
  FileSpreadsheet, 
  Train, 
  MapPin,
  BookOpen, 
  Settings as SettingsIcon, 
  HelpCircle, 
  LogOut,
  ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getFullTitle = (role) => {
    switch (role) {
      case 'TTE': return 'Senior Travelling Ticket Examiner';
      case 'TC': return 'Ticket Collector';
      case 'Guard': return 'Train Operations Guard';
      case 'Loco Pilot': return 'Loco Pilot (Mail/Express)';
      case 'Assistant Loco Pilot': return 'Assistant Loco Pilot';
      case 'Station Master': return 'Station Superintendent';
      default: return role || 'Railway Officer';
    }
  };

  const getRailwayZone = (division) => {
    const div = division?.toUpperCase() || 'BCT';
    if (['BCT', 'BRC', 'ADI', 'RTM', 'RJT', 'BVP'].includes(div)) return 'Western Railway (WR)';
    if (['BB', 'BSL', 'NGP', 'SUR', 'PA'].includes(div)) return 'Central Railway (CR)';
    if (['DLI', 'UMB', 'FZR', 'LKO', 'MB'].includes(div)) return 'Northern Railway (NR)';
    if (['HWH', 'SDAH', 'ASN', 'MLDT'].includes(div)) return 'Eastern Railway (ER)';
    if (['MAS', 'TPJ', 'MDU', 'TVC', 'PGT', 'SA'].includes(div)) return 'Southern Railway (SR)';
    if (['SBC', 'MYS', 'UBL'].includes(div)) return 'South Western Railway (SWR)';
    return 'Indian Railways (IR)';
  };

  return (
    <aside className="sidebar-wrapper no-print">
      {/* Brand header */}
      <div className="sidebar-logo d-flex align-items-center gap-2">
        <img src="/logo.svg" alt="RailAssist Logo" width="28" height="28" />
        <h5 className="mb-0 font-weight-bold" style={{ fontSize: '16px', letterSpacing: '-0.02em', color: '#0C4A6E' }}>
          RailAssist <span className="font-weight-normal" style={{ fontSize: '11px', color: '#0EA5E9' }}>Enterprise</span>
        </h5>
      </div>

      {/* User profile Summary */}
      <div className="sidebar-profile">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold" style={{ width: '32px', height: '32px', fontSize: '14px', backgroundColor: '#E0F2FE', border: '2px solid #BAE6FD', color: '#0EA5E9' }}>
            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h6 className="mb-0 text-truncate" style={{ fontSize: '13px', fontWeight: '600', color: '#0C4A6E' }}>{user.name}</h6>
            <small className="d-block text-truncate" style={{ fontSize: '11px', color: '#64748B' }}>{getFullTitle(user.role)}</small>
          </div>
        </div>
        <div className="d-flex align-items-center justify-content-between gap-1 flex-wrap mt-2">
          <span className="badge" style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#F0F9FF', border: '1px solid #DBEAFE', color: '#64748B' }}>
            {user.division} Div • {getRailwayZone(user.division).split(' ')[0]}
          </span>
          <span className="badge" style={{ fontSize: '9px', padding: '3px 6px', backgroundColor: '#E0F2FE', border: '1px solid #BAE6FD', color: '#0EA5E9' }}>
            {user.subscriptionTier}
          </span>
        </div>
      </div>

      {/* Main navigation menu */}
      <nav className="sidebar-menu">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/journeys" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Duty Logs</span>
        </NavLink>

        <NavLink to="/roster" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Duty Roster</span>
        </NavLink>

        <NavLink to="/allowances" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IndianRupee size={20} />
          <span>Allowances Matrix</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={20} />
          <span>Performance Overview</span>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileSpreadsheet size={20} />
          <span>Monthly Statements</span>
        </NavLink>

        <NavLink to="/train-directory" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Train size={20} />
          <span>Train Directory</span>
        </NavLink>

        <NavLink to="/station-directory" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MapPin size={20} />
          <span>Station Directory</span>
        </NavLink>

        <NavLink to="/statement-templates" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} />
          <span>Statement Templates</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={20} />
          <span>Settings</span>
        </NavLink>

        <NavLink to="/help" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <HelpCircle size={20} />
          <span>Help</span>
        </NavLink>

        {user.isAdmin && (
          <>
            <div className="border-top my-2" style={{ borderColor: '#DBEAFE' }}></div>
            <NavLink to="/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={20} style={{ color: '#F59E0B' }} />
              <span style={{ color: '#F59E0B' }}>Admin Console</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Sidebar footer with log out */}
      <div className="sidebar-footer">
        <button 
          onClick={logout}
          className="btn sidebar-link border-0 text-start w-100 bg-transparent text-danger d-flex align-items-center gap-2"
          style={{ transition: 'all 0.15s ease' }}
        >
          <LogOut size={20} className="text-danger" />
          <span className="text-danger">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
