import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrendingUp, TrendingDown, DollarSign, Clock, FileText, AlertTriangle } from 'lucide-react';

/**
 * FinancialDashboard Component
 * 
 * Displays financial summary with current/previous month comparison
 * and month-wise trends for TA, NDA, and MR totals.
 * 
 * Uses backend /api/journeys/summary as authoritative source.
 */
const FinancialDashboard = ({ dateRange, dutyCategory, claimStatus, onSummaryLoad }) => {
  const [currentSummary, setCurrentSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSummaries();
  }, [dateRange, dutyCategory, claimStatus]);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setError('');

      // Current period summary
      const currentParams = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      if (dutyCategory && dutyCategory !== 'ALL') {
        currentParams.dutyCategory = dutyCategory;
      }
      
      if (claimStatus && claimStatus !== 'ALL') {
        currentParams.claimStatus = claimStatus;
      }

      const currentData = await api.journeys.getSummary(currentParams);
      setCurrentSummary(currentData.summary);
      
      // Pass summary to parent for statement generation
      if (onSummaryLoad) {
        onSummaryLoad(currentData);
      }

      // Previous month summary for comparison
      const currentDate = new Date(dateRange.startDate);
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      
      const previousParams = {
        startDate: prevMonth.toISOString().substring(0, 10),
        endDate: prevMonthEnd.toISOString().substring(0, 10)
      };
      
      if (dutyCategory && dutyCategory !== 'ALL') {
        previousParams.dutyCategory = dutyCategory;
      }
      
      if (claimStatus && claimStatus !== 'ALL') {
        previousParams.claimStatus = claimStatus;
      }

      const previousData = await api.journeys.getSummary(previousParams);
      setPreviousSummary(previousData.summary);

    } catch (err) {
      console.error('Failed to load financial summaries:', err);
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, percentage: 0, isIncrease: false };
    const diff = current - previous;
    const percentage = ((diff / previous) * 100).toFixed(1);
    return {
      value: diff,
      percentage: Math.abs(percentage),
      isIncrease: diff > 0
    };
  };

  if (loading) {
    return (
      <div className="card-saas p-4 mb-4">
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading financial summary...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-saas p-4 mb-4">
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!currentSummary) {
    return null;
  }

  const taChange = calculateChange(currentSummary.totalTA, previousSummary?.totalTA);
  const ndaChange = calculateChange(currentSummary.totalNDA, previousSummary?.totalNDA);
  const mrChange = calculateChange(currentSummary.totalMR, previousSummary?.totalMR);
  const dutyChange = calculateChange(currentSummary.totalJourneys, previousSummary?.totalJourneys);

  return (
    <div className="mb-4">
      {/* Summary Cards Grid */}
      <div className="row g-3 mb-3">
        {/* Total TA Card */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card-saas h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="rounded-circle bg-success-subtle d-flex align-items-center justify-content-center" 
                   style={{ width: '40px', height: '40px' }}>
                <DollarSign size={20} className="text-success" />
              </div>
              {previousSummary && (
                <span className={`badge ${taChange.isIncrease ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                      style={{ fontSize: '11px' }}>
                  {taChange.isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {taChange.percentage}%
                </span>
              )}
            </div>
            <h3 className="text-white mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              ₹{currentSummary.totalTA.toLocaleString()}
            </h3>
            <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
              Total TA (Travel Allowance)
            </p>
            {previousSummary && (
              <small className="text-secondary-custom mt-1" style={{ fontSize: '11px' }}>
                Previous: ₹{previousSummary.totalTA.toLocaleString()}
              </small>
            )}
          </div>
        </div>

        {/* Total NDA Card */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card-saas h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="rounded-circle bg-info-subtle d-flex align-items-center justify-content-center" 
                   style={{ width: '40px', height: '40px' }}>
                <Clock size={20} className="text-info" />
              </div>
              {previousSummary && (
                <span className={`badge ${ndaChange.isIncrease ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                      style={{ fontSize: '11px' }}>
                  {ndaChange.isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {ndaChange.percentage}%
                </span>
              )}
            </div>
            <h3 className="text-white mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              ₹{currentSummary.totalNDA.toLocaleString()}
            </h3>
            <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
              Total NDA ({currentSummary.totalNightHours}h Night)
            </p>
            {previousSummary && (
              <small className="text-secondary-custom mt-1" style={{ fontSize: '11px' }}>
                Previous: ₹{previousSummary.totalNDA.toLocaleString()}
              </small>
            )}
          </div>
        </div>

        {/* Total MR Card */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card-saas h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center" 
                   style={{ width: '40px', height: '40px' }}>
                <FileText size={20} className="text-warning" />
              </div>
              {previousSummary && (
                <span className={`badge ${mrChange.isIncrease ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                      style={{ fontSize: '11px' }}>
                  {mrChange.isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {mrChange.percentage}%
                </span>
              )}
            </div>
            <h3 className="text-white mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              ₹{currentSummary.totalMR.toLocaleString()}
            </h3>
            <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
              Total MR ({currentSummary.mrCount} Remittances)
            </p>
            {previousSummary && (
              <small className="text-secondary-custom mt-1" style={{ fontSize: '11px' }}>
                Previous: ₹{previousSummary.totalMR.toLocaleString()} ({previousSummary.mrCount})
              </small>
            )}
          </div>
        </div>

        {/* Combined Allowance Card */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card-saas h-100 p-3 border-primary" style={{ borderWidth: '2px' }}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center" 
                   style={{ width: '40px', height: '40px' }}>
                <DollarSign size={20} className="text-primary" />
              </div>
              {previousSummary && (
                <span className={`badge ${(currentSummary.totalAllowance > (previousSummary.totalNDA + previousSummary.totalTA)) ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                      style={{ fontSize: '11px' }}>
                  {(currentSummary.totalAllowance > (previousSummary.totalNDA + previousSummary.totalTA)) ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {(((currentSummary.totalAllowance - (previousSummary.totalNDA + previousSummary.totalTA)) / (previousSummary.totalNDA + previousSummary.totalTA || 1)) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <h3 className="text-white mb-1" style={{ fontSize: '24px', fontWeight: '700' }}>
              ₹{currentSummary.totalAllowance.toLocaleString()}
            </h3>
            <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
              Combined Allowance (TA + NDA)
            </p>
            {previousSummary && (
              <small className="text-secondary-custom mt-1" style={{ fontSize: '11px' }}>
                Previous: ₹{(previousSummary.totalTA + previousSummary.totalNDA).toLocaleString()}
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Duty Count Summary */}
      <div className="card-saas p-3">
        <div className="row g-3 text-center">
          <div className="col-6 col-md-3">
            <div className="d-flex flex-column">
              <span className="text-white" style={{ fontSize: '20px', fontWeight: '700' }}>
                {currentSummary.totalJourneys}
              </span>
              <span className="text-secondary-custom" style={{ fontSize: '12px' }}>
                Total Duties
              </span>
              {previousSummary && (
                <small className="text-secondary-custom mt-1" style={{ fontSize: '10px' }}>
                  {dutyChange.isIncrease ? '+' : ''}{dutyChange.value} from prev
                </small>
              )}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex flex-column">
              <span className="text-success" style={{ fontSize: '20px', fontWeight: '700' }}>
                {currentSummary.eligibleCount}
              </span>
              <span className="text-secondary-custom" style={{ fontSize: '12px' }}>
                Eligible for Claim
              </span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex flex-column">
              <span className="text-warning" style={{ fontSize: '20px', fontWeight: '700' }}>
                {currentSummary.noClaimCount}
              </span>
              <span className="text-secondary-custom" style={{ fontSize: '12px' }}>
                No-Claim Duties
              </span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex flex-column">
              <span className="text-info" style={{ fontSize: '20px', fontWeight: '700' }}>
                {currentSummary.totalDistance.toLocaleString()} km
              </span>
              <span className="text-secondary-custom" style={{ fontSize: '12px' }}>
                Total Distance
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
