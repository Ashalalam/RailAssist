import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJourneys } from '../contexts/JourneyContext';
import InstallPrompt from '../components/InstallPrompt';
import Chart from 'react-apexcharts';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  FileText, 
  Download, 
  Share2, 
  ArrowRight, 
  Plus, 
  RefreshCw,
  FolderOpen,
  Keyboard,
  Info,
  Map
} from 'lucide-react';

const Dashboard = () => {
  const { user, isOnline } = useAuth();
  const { journeys, reports, syncing, triggerManualSync, loading } = useJourneys();
  const navigate = useNavigate();
  const [syncTime, setSyncTime] = useState('Just now');

  // Dynamic greeting based on user's local time
  const getDynamicGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  // Keyboard shortcut listener: Ctrl + N for New Journey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/journeys/new');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Simulate last sync time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncTime(prev => {
        if (prev === 'Just now') return '1m ago';
        if (prev === '1m ago') return '2m ago';
        if (prev === '2m ago') return '5m ago';
        return '10m ago';
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper date boundary checks
  const getTodayStartEnd = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // 1. Current/Today's Duty
  const { start: todayStart, end: todayEnd } = getTodayStartEnd();
  const todayJourneys = journeys.filter(j => {
    const dep = new Date(j.actualDeparture);
    return dep >= todayStart && dep <= todayEnd;
  });
  const currentDuty = todayJourneys.length > 0 ? todayJourneys[0] : null;

  // 2. Upcoming Journeys
  const upcomingJourneys = journeys
    .filter(j => new Date(j.scheduledDeparture) > todayEnd)
    .sort((a, b) => new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture));
  const nextJourney = upcomingJourneys.length > 0 ? upcomingJourneys[0] : null;

  // 3. Current Month Calculations & KPI Computations (memoized)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const { monthlyTA, monthlyNDA, monthlyDistance, monthlyDutyHours, unsyncedCount } = useMemo(() => {
    const monthlyJourneys = journeys.filter(j => {
      const dep = new Date(j.scheduledDeparture);
      return dep.toISOString().substring(0, 7) === currentMonthStr;
    });

    const taSum = monthlyJourneys.reduce((sum, j) => sum + (j.taAmount || 0), 0);
    const ndaSum = monthlyJourneys.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);
    const distSum = monthlyJourneys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);
    const dutyHours = parseFloat(monthlyJourneys.reduce((sum, j) => {
      const dep = new Date(j.actualDeparture);
      const arr = new Date(j.actualArrival);
      if (!isNaN(dep) && !isNaN(arr) && arr > dep) {
        return sum + (arr - dep) / (1000 * 60 * 60);
      }
      return sum;
    }, 0).toFixed(1));
    const unsynced = journeys.filter(j => j.syncStatus && j.syncStatus !== 'synced').length;

    return {
      monthlyTA: taSum,
      monthlyNDA: ndaSum,
      monthlyDistance: distSum,
      monthlyDutyHours: dutyHours,
      unsyncedCount: unsynced
    };
  }, [journeys, currentMonthStr]);

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

  const getCoachFromNotes = (notes) => {
    if (!notes) return 'N/A';
    const match = notes.match(/Coach(?:es)?\s+([A-Za-z0-9-\s]+)/i);
    return match ? match[1].trim().split(' ')[0] : 'A1';
  };

  // Sort journeys for clean analytics charts (chronological order)
  const chartJourneys = [...journeys]
    .sort((a, b) => new Date(a.actualDeparture) - new Date(b.actualDeparture))
    .slice(-6); // last 6 logged journeys

  const hasInsufficientChartData = chartJourneys.length < 2;

  // Chart configuration
  const taChartOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#0EA5E9'],
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.2,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E5E7EB', strokeDashArray: 3 },
    xaxis: {
      categories: chartJourneys.map(j => new Date(j.actualDeparture).toLocaleDateString([], { month: 'short', day: 'numeric' })),
      labels: { style: { colors: '#64748B', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B', fontSize: '11px' },
        formatter: (val) => `₹${val}`
      }
    },
    tooltip: { theme: 'light' }
  };

  const ndaChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#10B981'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '40%'
      }
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E5E7EB', strokeDashArray: 3 },
    xaxis: {
      categories: chartJourneys.map(j => new Date(j.actualDeparture).toLocaleDateString([], { month: 'short', day: 'numeric' })),
      labels: { style: { colors: '#64748B', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B', fontSize: '11px' },
        formatter: (val) => `₹${val}`
      }
    },
    tooltip: { theme: 'light' }
  };

  const chartSeriesTA = [{
    name: 'Traveling Allowance',
    data: chartJourneys.map(j => j.taAmount || 0)
  }];

  const chartSeriesNDA = [{
    name: 'Night Duty Allowance',
    data: chartJourneys.map(j => j.ndaAmount || 0)
  }];

  if (loading) {
    return (
      <div className="app-container">
        {/* Top Header Status Bar Skeleton */}
        <div className="d-flex justify-content-between align-items-center mb-3 pb-3" style={{ borderBottom: '1px solid #DBEAFE' }}>
          <div className="skeleton" style={{ width: '120px', height: '24px' }}></div>
          <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
        </div>
        
        {/* Hero greeting Skeleton */}
        <div className="mb-4">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton" style={{ width: '40%', height: '16px' }}></div>
        </div>

        {/* KPI Grid Skeleton */}
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="col-12 col-md-6 col-lg-3">
              <div className="card-saas h-100">
                <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
                <div className="skeleton skeleton-title" style={{ height: '32px', marginTop: '12px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="row g-3 mb-4">
          {[1, 2].map(n => (
            <div key={n} className="col-12 col-lg-6">
              <div className="card-saas">
                <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
                <div className="skeleton skeleton-rect" style={{ height: '260px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Split grid timeline skeleton */}
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card-saas h-100">
              <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
              <div className="mt-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="mb-4 pb-3 last-border-none" style={{ borderBottom: '1px solid #DBEAFE' }}>
                    <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="card-saas h-100">
              <div className="skeleton skeleton-title" style={{ width: '50%' }}></div>
              <div className="mt-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="skeleton skeleton-rect mb-3" style={{ height: '54px' }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Header Status Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print border-bottom border-secondary pb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-dark border border-secondary text-secondary-custom d-flex align-items-center gap-1">
            <Map size={12} className="text-secondary" />
            {getRailwayZone(user?.division)}
          </span>
          <span className={`badge ${isOnline ? 'badge-synced' : 'badge-pending'} d-flex align-items-center gap-1`}>
            <span className="rounded-circle" style={{ width: '6px', height: '6px', backgroundColor: isOnline ? 'var(--color-success)' : 'var(--color-warning)' }}></span>
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>
        <div className="d-flex align-items-center gap-3 text-secondary-custom" style={{ fontSize: '12px' }}>
          <span className="d-flex align-items-center gap-1">
            <RefreshCw size={13} className={syncing ? 'spin' : ''} />
            Last Sync: {syncTime}
          </span>
          {unsyncedCount > 0 && (
            <button 
              onClick={triggerManualSync}
              className="btn btn-link text-warning p-0 border-0 text-decoration-none font-weight-bold d-flex align-items-center gap-1"
              style={{ fontSize: '12px' }}
              disabled={syncing}
            >
              Sync Pending ({unsyncedCount})
            </button>
          )}
        </div>
      </div>

      {/* Hero Greeting Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4"
      >
        <div>
          <span className="text-secondary-custom uppercase font-weight-semibold" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            Official Roster Summary
          </span>
          <h1 className="text-white mt-1 mb-1 font-weight-bold" style={{ fontSize: '28px' }}>
            {getDynamicGreeting()} <span className="font-weight-normal text-secondary-custom">{user?.name}</span>
          </h1>
          <p className="text-secondary-custom mb-0" style={{ fontSize: '14px' }}>
            {getFullTitle(user?.role)} • <span className="text-white">{user?.division} Division</span>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/journeys/new" className="btn btn-glow-primary py-2 px-3 d-flex align-items-center gap-2">
            <Plus size={16} />
            <span>Log Shift Duty</span>
          </Link>
        </div>
      </motion.div>

      {/* PWA Install Promotion */}
      <InstallPrompt />

      {/* KPI Cards Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="row g-3 mb-4"
      >
        {/* KPI 1: Today's Duty */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary-custom uppercase" style={{ fontSize: '11px', fontWeight: '600' }}>Current Duty</span>
                <span className={`badge ${currentDuty ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-dark border border-secondary text-secondary-custom'}`} style={{ fontSize: '10px' }}>
                  {currentDuty ? 'Active' : 'Off Duty'}
                </span>
              </div>
              {currentDuty ? (
                <div>
                  <div className="text-white font-weight-bold fs-6 mb-1">{currentDuty.trainNumber} - {currentDuty.trainName}</div>
                  <div className="text-secondary-custom small mb-2">{currentDuty.departureStation} → {currentDuty.arrivalStation}</div>
                  <div className="d-flex gap-4">
                    <div>
                      <small className="text-secondary-custom d-block" style={{ fontSize: '10px' }}>DEPARTURE</small>
                      <span className="text-white font-weight-semibold small">
                        {new Date(currentDuty.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <small className="text-secondary-custom d-block" style={{ fontSize: '10px' }}>COACH</small>
                      <span className="text-white font-weight-semibold small">{getCoachFromNotes(currentDuty.notes)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-secondary-custom small">No active train shifts logged for today.</span>
                </div>
              )}
            </div>
            {currentDuty && (
              <div className="pt-2 border-top border-secondary mt-2">
                <Link to={`/journeys/edit/${currentDuty.localId}`} className="text-primary text-decoration-none small d-flex align-items-center gap-1 font-weight-medium">
                  Modify Log <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* KPI 2: Upcoming Journey */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary-custom uppercase" style={{ fontSize: '11px', fontWeight: '600' }}>Next Journey</span>
                <span className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '10px' }}>Timetable</span>
              </div>
              {nextJourney ? (
                <div>
                  <div className="text-white font-weight-bold fs-6 mb-1">{nextJourney.trainNumber} - {nextJourney.trainName}</div>
                  <div className="text-secondary-custom small mb-2">{nextJourney.departureStation} → {nextJourney.arrivalStation}</div>
                  <div>
                    <small className="text-secondary-custom d-block" style={{ fontSize: '10px' }}>SCHEDULED DEPARTURE</small>
                    <span className="text-white font-weight-semibold small">
                      {new Date(nextJourney.scheduledDeparture).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(nextJourney.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-secondary-custom small">No upcoming rosters logged.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Allowance stats: TA & NDA */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-secondary-custom uppercase d-block mb-1" style={{ fontSize: '11px', fontWeight: '600' }}>Travelling Allowance</span>
              <div className="widget-stat-number text-success" style={{ fontSize: '28px', color: 'var(--color-success) !important' }}>₹{monthlyTA}</div>
              <small className="text-secondary-custom" style={{ fontSize: '12px' }}>
                Pending TA Claims
              </small>
            </div>
            <div className="pt-2 border-top border-secondary mt-2 d-flex justify-content-between align-items-center text-secondary-custom" style={{ fontSize: '11px' }}>
              <span>NDA Claim Amount:</span>
              <span className="text-white font-weight-semibold">₹{monthlyNDA}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Monthly Duty Hours & Distance */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-secondary-custom uppercase d-block mb-1" style={{ fontSize: '11px', fontWeight: '600' }}>Duty Hours (Month)</span>
              <div className="widget-stat-number" style={{ fontSize: '28px' }}>{monthlyDutyHours} hrs</div>
              <small className="text-secondary-custom" style={{ fontSize: '12px' }}>
                Total roster duty hours
              </small>
            </div>
            <div className="pt-2 border-top border-secondary mt-2 d-flex justify-content-between align-items-center text-secondary-custom" style={{ fontSize: '11px' }}>
              <span>Distance Covered:</span>
              <span className="text-white font-weight-semibold">{monthlyDistance} km</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Analytics Charts - Real Data Check */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="row g-3 mb-4"
      >
        <div className="col-12 col-lg-6">
          <div className="card-saas">
            <h6 className="text-white mb-3" style={{ fontSize: '14px', fontWeight: '600' }}>Traveling Allowance Trend (TA)</h6>
            {hasInsufficientChartData ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center" style={{ minHeight: '260px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                <Info size={32} className="text-secondary-custom mb-2" />
                <h6 className="text-white small mb-1">Insufficient Data for TA Analysis</h6>
                <p className="text-secondary-custom small mb-0 max-width-75" style={{ maxWidth: '280px' }}>Log at least 2 duty journeys in the system to view historical allowance charts.</p>
              </div>
            ) : (
              <Chart options={taChartOptions} series={chartSeriesTA} type="area" height={260} />
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card-saas">
            <h6 className="text-white mb-3" style={{ fontSize: '14px', fontWeight: '600' }}>Night Duty Allowance Trend (NDA)</h6>
            {hasInsufficientChartData ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center" style={{ minHeight: '260px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                <Info size={32} className="text-secondary-custom mb-2" />
                <h6 className="text-white small mb-1">Insufficient Data for NDA Analysis</h6>
                <p className="text-secondary-custom small mb-0 max-width-75" style={{ maxWidth: '280px' }}>Log at least 2 duty journeys in the system to view historical allowance charts.</p>
              </div>
            ) : (
              <Chart options={ndaChartOptions} series={chartSeriesNDA} type="bar" height={260} />
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Grid: Duty Logs Timeline & Monthly Statements */}
      <div className="row g-3">
        {/* Vertical Journey Timeline from DB */}
        <div className="col-12 col-lg-8">
          <div className="card-saas h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0" style={{ fontSize: '16px' }}>Duty Logs Timeline</h5>
              <Link to="/journeys" className="text-primary text-decoration-none small font-weight-medium">
                View All Logs
              </Link>
            </div>

            {journeys.length > 0 ? (
              <div className="timeline-list">
                {journeys.slice(0, 4).map(j => {
                  const depDate = new Date(j.actualDeparture);
                  const isSynced = j.syncStatus === 'synced';
                  return (
                    <div key={j.localId} className="timeline-milestone">
                      <div className={`timeline-node ${isSynced ? 'success' : 'warning'}`}></div>
                      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                        <div>
                          <div className="text-white font-weight-semibold" style={{ fontSize: '14px' }}>
                            {j.trainNumber} - {j.trainName}
                          </div>
                          <small className="text-secondary-custom d-block mb-1" style={{ fontSize: '12px' }}>
                            <MapPin size={11} className="me-1 text-danger" style={{ transform: 'translateY(-1px)' }} />
                            {j.departureStation} → {j.arrivalStation}
                          </small>
                          <small className="text-secondary-custom d-block" style={{ fontSize: '11px' }}>
                            <Clock size={11} className="me-1" style={{ transform: 'translateY(-1px)' }} />
                            Shift Date: {depDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                          {j.notes && (
                            <div className="p-2 rounded bg-dark border border-secondary text-secondary-custom small mt-2" style={{ fontSize: '12px', backgroundColor: 'rgba(27, 34, 50, 0.2)' }}>
                              {j.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-end">
                          <span className="text-success font-weight-semibold d-block" style={{ fontSize: '14px' }}>₹{j.taAmount} TA</span>
                          <small className="text-secondary-custom" style={{ fontSize: '11px' }}>₹{j.ndaAmount} NDA</small>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-5 d-flex flex-column align-items-center justify-content-center">
                <FolderOpen size={48} className="text-secondary-custom mb-3" />
                <h5 className="text-white mb-1" style={{ fontSize: '16px' }}>No Duty Logs Registered</h5>
                <p className="text-secondary-custom small mb-4 max-width-75" style={{ maxWidth: '320px' }}>You haven't recorded any shift duties yet. Begin logging your train journeys to track allowances offline.</p>
                <Link to="/journeys/new" className="btn btn-glow-primary py-2 px-4 d-flex align-items-center gap-2">
                  <Plus size={16} />
                  <span>Log Your First Shift</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports Archive list */}
        <div className="col-12 col-lg-4">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <h5 className="text-white mb-3" style={{ fontSize: '16px' }}>Monthly Statements</h5>
              {reports.slice(0, 3).length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {reports.slice(0, 3).map(r => (
                    <div key={r.id || r._id} className="p-3 rounded bg-dark border border-secondary d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-surface-secondary)' }}>
                      <div className="min-w-0">
                        <h6 className="text-white mb-1 text-truncate" style={{ fontSize: '13px', fontWeight: '500' }}>
                          <FileText size={14} className="me-1 text-primary" style={{ transform: 'translateY(-1px)' }} />
                          {r.fileName}
                        </h6>
                        <small className="text-secondary-custom d-block text-truncate" style={{ fontSize: '11px' }}>
                          Claims Total: <span className="text-success font-weight-medium">₹{r.totalAmount}</span>
                        </small>
                      </div>
                      <div className="d-flex gap-1">
                        <Link to="/reports" className="btn btn-saas-secondary p-1 px-2 border-0 bg-transparent text-secondary-custom hover-text-white">
                          <Download size={15} />
                        </Link>
                        <button onClick={() => alert('Share feature available soon.')} className="btn btn-saas-secondary p-1 px-2 border-0 bg-transparent text-secondary-custom hover-text-white">
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <FileText size={36} className="text-secondary-custom mb-2" />
                  <p className="text-secondary-custom small mb-0">No statements compiled. Go to Monthly Statements to run exports.</p>
                </div>
              )}
            </div>

            {/* Quick Actions / Shortcuts Widget */}
            <div className="pt-3 border-top border-secondary mt-3 text-secondary-custom" style={{ fontSize: '11px' }}>
              <div className="d-flex align-items-center gap-1 font-weight-medium text-white mb-1">
                <Keyboard size={12} className="text-primary" />
                <span>Keyboard Shortcuts:</span>
              </div>
              <div className="d-flex justify-content-between mt-1">
                <span>Log Shift Duty:</span>
                <span className="badge bg-dark border border-secondary font-weight-semibold">Ctrl + N</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
