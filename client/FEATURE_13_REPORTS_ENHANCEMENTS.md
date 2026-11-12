# Feature 13: Reports Page Enhancements Implementation Guide

## Changes Required to client/src/pages/Reports.jsx

### 1. Add Imports (after existing imports)
```javascript
import FinancialDashboard from '../components/FinancialDashboard';
import { ChevronDown, ChevronUp } from 'lucide-react';
```

### 2. Add New State Variables (after existing useState declarations)
```javascript
// Date range state
const currentDate = new Date();
const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

const [dateRange, setDateRange] = useState({
  startDate: monthStart.toISOString().substring(0, 10),
  endDate: monthEnd.toISOString().substring(0, 10)
});
const [useCustomRange, setUseCustomRange] = useState(false);
const [dutyCategory, setDutyCategory] = useState('ALL');
const [claimStatus, setClaimStatus] = useState('ALL');
const [summaryData, setSummaryData] = useState(null);
const [showReconciliation, setShowReconciliation] = useState(false);
```

### 3. Update selectedMonth useEffect to sync with dateRange
```javascript
useEffect(() => {
  if (!useCustomRange) {
    const monthDate = new Date(selectedMonth + '-01');
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    setDateRange({
      startDate: start.toISOString().substring(0, 10),
      endDate: end.toISOString().substring(0, 10)
    });
  }
}, [selectedMonth, useCustomRange]);
```

### 4. Replace matchingJourneys useMemo with summaryData-based logic
```javascript
const matchingJourneys = useMemo(() => {
  if (summaryData && summaryData.journeys) {
    return summaryData.journeys.sort((a, b) => 
      new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture)
    );
  }
  // Fallback to context journeys if summary not loaded yet
  return journeys.filter(j => {
    const depDate = new Date(j.scheduledDeparture);
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999); // Include full end date
    return depDate >= start && depDate <= end;
  }).sort((a, b) => new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture));
}, [summaryData, journeys, dateRange]);

const totalTA = summaryData?.summary?.totalTA || 0;
const totalNDA = summaryData?.summary?.totalNDA || 0;
const totalNightHours = summaryData?.summary?.totalNightHours || 0;
const totalMR = summaryData?.summary?.totalMR || 0;
const mrCount = summaryData?.summary?.mrCount || 0;
```

### 5. Add callback for FinancialDashboard
```javascript
const handleSummaryLoad = (data) => {
  setSummaryData(data);
};
```

### 6. Insert FinancialDashboard Component (after title div, before Two-Panel Layout)
```javascript
{/* Feature 13: Financial Dashboard */}
<FinancialDashboard 
  dateRange={dateRange}
  dutyCategory={dutyCategory}
  claimStatus={claimStatus}
  onSummaryLoad={handleSummaryLoad}
/>
```

### 7. Enhance Compile Parameters (replace existing month selector section)
```javascript
<div className="mb-3">
  <label className="form-label-saas">Date Selection Mode</label>
  <div className="d-flex gap-2 mb-2">
    <button
      className={`btn ${!useCustomRange ? 'btn-primary' : 'btn-saas-secondary'} btn-sm flex-grow-1`}
      onClick={() => setUseCustomRange(false)}
    >
      Month
    </button>
    <button
      className={`btn ${useCustomRange ? 'btn-primary' : 'btn-saas-secondary'} btn-sm flex-grow-1`}
      onClick={() => setUseCustomRange(true)}
    >
      Custom Range
    </button>
  </div>
</div>

{!useCustomRange ? (
  <div className="mb-3">
    <label className="form-label-saas">Select Target Month</label>
    <input 
      type="month" 
      className="form-control form-control-saas" 
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
    />
  </div>
) : (
  <div className="row g-2 mb-3">
    <div className="col-6">
      <label className="form-label-saas">Start Date</label>
      <input 
        type="date" 
        className="form-control form-control-saas" 
        value={dateRange.startDate}
        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
      />
    </div>
    <div className="col-6">
      <label className="form-label-saas">End Date</label>
      <input 
        type="date" 
        className="form-control form-control-saas" 
        value={dateRange.endDate}
        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
      />
    </div>
  </div>
)}

<div className="mb-3">
  <label className="form-label-saas">Duty Category</label>
  <select 
    className="form-select form-control-saas" 
    value={dutyCategory}
    onChange={(e) => setDutyCategory(e.target.value)}
  >
    <option value="ALL">All Categories</option>
    <option value="TICKET_CHECKING">Ticket Checking</option>
    <option value="ON_DUTY">On Duty</option>
    <option value="STATION_DUTY">Station Duty</option>
    <option value="PF_CHECK">Platform Check</option>
    <option value="OTHER">Other</option>
  </select>
</div>

<div className="mb-4">
  <label className="form-label-saas">Claim Status</label>
  <select 
    className="form-select form-control-saas" 
    value={claimStatus}
    onChange={(e) => setClaimStatus(e.target.value)}
  >
    <option value="ALL">All Duties</option>
    <option value="ELIGIBLE">Eligible for Claim</option>
    <option value="NO_CLAIM">No-Claim Only</option>
  </select>
</div>
```

### 8. Add Reconciliation View (after Matching Summary, before action buttons)
```javascript
{matchingJourneys.length > 0 && summaryData && (
  <div className="mt-3">
    <button
      onClick={() => setShowReconciliation(!showReconciliation)}
      className="btn btn-saas-secondary btn-sm w-100 d-flex align-items-center justify-content-between"
    >
      <span>View Duty Breakdown</span>
      {showReconciliation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
    
    {showReconciliation && (
      <div className="mt-2 p-2 rounded border border-secondary" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '11px' }}>
        <table className="table table-dark-custom table-sm mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Train</th>
              <th>TA</th>
              <th>NDA</th>
              <th>MR</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {matchingJourneys.map(j => {
              const isEligible = j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE');
              return (
                <tr key={j._id || j.localId} className={!isEligible ? 'text-warning' : ''}>
                  <td>{new Date(j.scheduledDeparture).toLocaleDateString()}</td>
                  <td>{j.trainNumber}</td>
                  <td className={isEligible ? 'text-success' : 'text-muted'}>₹{j.taAmount || 0}</td>
                  <td className={isEligible ? 'text-info' : 'text-muted'}>₹{j.ndaAmount || 0}</td>
                  <td>{j.mrAmount ? `₹${j.mrAmount}` : '-'}</td>
                  <td>{isEligible ? 'Eligible' : j.noClaimReason || 'No Claim'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-top border-secondary">
            <tr className="fw-bold">
              <td colSpan="2">Totals:</td>
              <td className="text-success">₹{totalTA}</td>
              <td className="text-info">₹{totalNDA}</td>
              <td>₹{totalMR}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
  </div>
)}
```

### 9. Update Report Generation to use dateRange
```javascript
const handleGenerateReport = async () => {
  if (matchingJourneys.length === 0) {
    alert('No logged shifts found for the selected period to compile a statement.');
    return;
  }

  // ... existing audit check ...

  const periodLabel = useCustomRange 
    ? `${dateRange.startDate}_to_${dateRange.endDate}`
    : selectedMonth;
  
  const typeLabels = { 
    TA: 'TA_Statement', 
    NDA: 'NDA_Statement', 
    DIARY: 'Duty_Diary', 
    MR: 'MR_Statement',
    COMBINED: 'Combined_Statement'
  };
  const fileName = `${typeLabels[reportType]}_${periodLabel}.pdf`;
  
  // Use summaryData if available, else calculate from matchingJourneys
  const totalAmount = summaryData?.summary?.totalTA || totalTA;
  
  // ... rest of existing implementation ...
};
```

## Implementation Status

✅ FinancialDashboard component created
⏳ Reports.jsx enhancements (implement above changes)
⏳ Excel export
⏳ Testing

## Notes

- All calculations use backend `/api/journeys/summary` as source of truth
- Date range uses IST-aware boundaries via backend parseAsIST()
- Claim eligibility filtering preserved from Feature 03
- Template column selection still respected in exports
- Backward compatible with existing month-only selection
