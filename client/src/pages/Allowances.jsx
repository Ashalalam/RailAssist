import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useDemoMode } from '../contexts/DemoModeContext';
import { 
  Search, 
  Info, 
  Clock, 
  DollarSign,
  Calendar,
  User,
  Filter,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

const Allowances = () => {
  const { isDemoMode, demoAllowancesMatrix } = useDemoMode();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'ta', 'nda'

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        
        // DEMO MODE: Use synthetic allowances data
        if (isDemoMode) {
          setRules(demoAllowancesMatrix || []);
          setLoading(false);
          return;
        }
        
        const response = await api.rules.getAll();
        setRules(response.data || response);
      } catch (err) {
        console.error('Failed to fetch allowance rules:', err);
        setError(err.message || 'Failed to load allowance rules');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [isDemoMode, demoAllowancesMatrix]);

  // Filter and search rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.role.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="text-white mb-1">Allowances Matrix</h2>
        <p className="text-secondary-custom mb-0">
          Configured Traveling Allowance (TA) and Night Duty Allowance (NDA) rates per designation
        </p>
      </div>

      {/* Important Notice */}
      <div className="card-saas mb-4 border-info-subtle" style={{ backgroundColor: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <div className="d-flex align-items-start gap-2">
          <Info size={18} className="text-info mt-1 flex-shrink-0" />
          <div>
            <h6 className="text-white mb-1" style={{ fontSize: '14px', fontWeight: '600' }}>Configured Allowance Rates</h6>
            <p className="text-secondary-custom small mb-0" style={{ lineHeight: '1.5' }}>
              The rates displayed below are currently configured in the system database. These values are used for automatic 
              TA and NDA calculations in duty logs. Rates may be updated by system administrators to reflect current railway 
              policy. Always verify rates with official railway circulars and 7th CPC notifications before submission to accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card-saas mb-4" style={{ padding: '20px' }}>
        <div className="row g-2 align-items-center">
          {/* Search */}
          <div className="col-12 col-md-6 position-relative">
            <Search size={14} className="position-absolute text-secondary-custom" style={{ left: '20px', top: '15px' }} />
            <input 
              type="text" 
              className="form-control form-control-saas" 
              placeholder="Search by designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Filter Type */}
          <div className="col-12 col-md-3">
            <select 
              className="form-select form-control-saas" 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                backgroundPosition: 'right 0.75rem center', 
                backgroundSize: '16px 12px' 
              }}
            >
              <option value="all">All Allowances</option>
              <option value="ta">TA Only</option>
              <option value="nda">NDA Only</option>
            </select>
          </div>

          <div className="col-12 col-md-3">
            <span className="text-secondary-custom small">
              {filteredRules.length} designation{filteredRules.length !== 1 ? 's' : ''} configured
            </span>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card-saas mb-4 border-danger-subtle" style={{ backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={18} className="text-danger" />
            <span className="text-white">Failed to load allowance rules: {error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="card-saas">
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary-custom">Loading allowance rules...</p>
          </div>
        </div>
      ) : filteredRules.length === 0 ? (
        /* Empty State */
        <div className="card-saas">
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <FolderOpen size={48} className="text-secondary-custom mb-3" />
            <h6 className="text-white mb-1">No Rules Found</h6>
            <p className="text-secondary-custom small mb-0">
              {search ? 'No designation matches your search criteria.' : 'No allowance rules configured in the system.'}
            </p>
          </div>
        </div>
      ) : (
        /* Rules Grid */
        <div className="row g-3">
          {filteredRules.map(rule => (
            <div key={rule._id} className="col-12 col-lg-6">
              <div className="card-saas h-100">
                {/* Designation Header */}
                <div className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom border-secondary">
                  <div className="d-flex align-items-center gap-2">
                    <User size={18} className="text-primary" />
                    <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>
                      {rule.role}
                    </h5>
                  </div>
                  {rule.updatedAt && (
                    <div className="d-flex align-items-center gap-1 text-secondary-custom" style={{ fontSize: '11px' }}>
                      <Calendar size={11} />
                      <span>Updated: {new Date(rule.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* TA Section */}
                {(filterType === 'all' || filterType === 'ta') && (
                  <div className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Clock size={14} style={{ color: '#10B981' }} />
                      <h6 className="mb-0" style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>Traveling Allowance (TA)</h6>
                    </div>
                    <div className="p-3 rounded" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: '14px', color: '#334155' }}>Daily Rate:</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#0369A1' }}>₹{rule.taDailyRate}</span>
                      </div>
                      <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '12px', marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <strong style={{ color: '#0F172A', display: 'block', marginBottom: '8px' }}>Calculation Rules:</strong>
                          <ul className="mb-0 ps-3" style={{ color: '#334155' }}>
                            <li>≤ 6 hours absence: 30% of daily rate</li>
                            <li>6-12 hours absence: 70% of daily rate</li>
                            <li>&gt; 12 hours absence: 100% of daily rate</li>
                            <li>Each 24-hour block: 100% of daily rate</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NDA Section */}
                {(filterType === 'all' || filterType === 'nda') && (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <DollarSign size={14} style={{ color: '#3B82F6' }} />
                      <h6 className="mb-0" style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>Night Duty Allowance (NDA)</h6>
                    </div>
                    <div className="p-3 rounded" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: '14px', color: '#334155' }}>Hourly Rate:</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#0369A1' }}>₹{rule.ndaHourlyRate}/hr</span>
                      </div>
                      <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '12px', marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <strong style={{ color: '#0F172A', display: 'block', marginBottom: '8px' }}>Calculation Rules:</strong>
                          <ul className="mb-0 ps-3" style={{ color: '#334155' }}>
                            <li>Night window: 22:00 to 06:00 IST</li>
                            <li>Calculated in 5-minute increments</li>
                            <li>Handles midnight-crossing shifts</li>
                            <li>Multi-day shift support</li>
                            <li>Timezone: Indian Standard Time (IST)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration Source */}
                <div className="mt-3 pt-3 border-top border-secondary">
                  <div className="d-flex align-items-start gap-2">
                    <Info size={12} className="text-secondary-custom mt-1" />
                    <p className="text-secondary-custom mb-0" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                      <strong>Source:</strong> Database configured value. 
                      Verify with official railway circulars before submission. 
                      Contact system administrator to update rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TA/NDA Calculation Logic Info Panel */}
      {!loading && filteredRules.length > 0 && (
        <div className="card-saas mt-4">
          <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Allowance Calculation Reference</h5>
          
          <div className="row g-3">
            {/* TA Info */}
            <div className="col-12 col-md-6">
              <div className="p-3 rounded border border-success-subtle" style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Clock size={16} className="text-success" />
                  <h6 className="text-white mb-0" style={{ fontSize: '13px', fontWeight: '600' }}>TA Calculation Method</h6>
                </div>
                <div className="text-secondary-custom small" style={{ lineHeight: '1.6' }}>
                  <p className="mb-2">Based on hours of absence from headquarters:</p>
                  <ol className="mb-0 ps-3">
                    <li><strong>Step 1:</strong> Calculate duty duration from "Departure from HQ" to "Arrival at HQ"</li>
                    <li><strong>Step 2:</strong> Extract complete 24-hour blocks (each = 100% daily rate)</li>
                    <li><strong>Step 3:</strong> Apply slab percentage to remaining hours:
                      <ul className="mt-1 mb-0">
                        <li>0-6h: 30%</li>
                        <li>6-12h: 70%</li>
                        <li>12-24h: 100%</li>
                      </ul>
                    </li>
                    <li><strong>Step 4:</strong> Sum all components for total TA</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* NDA Info */}
            <div className="col-12 col-md-6">
              <div className="p-3 rounded border border-info-subtle" style={{ backgroundColor: 'rgba(59, 130, 246, 0.04)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-info" />
                  <h6 className="text-white mb-0" style={{ fontSize: '13px', fontWeight: '600' }}>NDA Calculation Method</h6>
                </div>
                <div className="text-secondary-custom small" style={{ lineHeight: '1.6' }}>
                  <p className="mb-2">Based on hours worked during night window:</p>
                  <ol className="mb-0 ps-3">
                    <li><strong>Step 1:</strong> Identify night duty window (22:00 to 06:00 IST)</li>
                    <li><strong>Step 2:</strong> Calculate overlap between duty hours and night window</li>
                    <li><strong>Step 3:</strong> Handle midnight crossing (split into two windows if needed)</li>
                    <li><strong>Step 4:</strong> Aggregate all night hours across multi-day shifts</li>
                    <li><strong>Step 5:</strong> Multiply total night hours by hourly rate</li>
                  </ol>
                  <div className="mt-2 p-2 rounded bg-dark border border-secondary">
                    <small className="text-warning d-block mb-1"><strong>Timezone Enforcement:</strong></small>
                    <small className="text-secondary-custom">All calculations use Indian Standard Time (IST, UTC+05:30) regardless of server or client timezone.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Eligibility Notes */}
          <div className="mt-3 p-3 rounded border border-warning-subtle" style={{ backgroundColor: 'rgba(245, 158, 11, 0.04)' }}>
            <div className="d-flex align-items-start gap-2">
              <AlertCircle size={16} className="text-warning mt-1 flex-shrink-0" />
              <div className="text-secondary-custom small" style={{ lineHeight: '1.6' }}>
                <strong className="text-white d-block mb-1">Eligibility Conditions:</strong>
                <ul className="mb-0 ps-3">
                  <li><strong>Claim Status:</strong> Duties marked with no-claim reasons (CL, CR, HQRS, LAP, LHAP, NH, PL, REST, SCL) are excluded from monthly statement totals</li>
                  <li><strong>NDA Eligibility:</strong> If "NDA Eligible" checkbox is unchecked in duty log, NDA amount will be ₹0 regardless of night hours</li>
                  <li><strong>Duty Category:</strong> All duty categories (Ticket Checking, On Duty, Station Duty, PF Check) are eligible for allowances unless marked as no-claim</li>
                  <li><strong>Verification:</strong> Always cross-reference calculated amounts with official railway allowance circulars before submitting claims to accounts department</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allowances;
