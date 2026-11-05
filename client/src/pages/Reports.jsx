import { useState, useEffect, useMemo } from 'react';
import { useJourneys } from '../contexts/JourneyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileSpreadsheet, 
  Printer, 
  Info, 
  FileText,
  FileCheck,
  AlertTriangle,
  FolderOpen,
  Eye
} from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const { journeys, reports, saveReportToHistory, runAuditReport, loading } = useJourneys();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"
  const [reportType, setReportType] = useState('TA'); // "TA", "NDA", "DIARY"
  const [showPreview, setShowPreview] = useState(false);

  // Compliance Audit states
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load matching journeys based on filters via useMemo
  const { matchingJourneys, totalTA, totalNDA, totalNightHours } = useMemo(() => {
    const filtered = journeys
      .filter(j => {
        const depDate = new Date(j.scheduledDeparture);
        const monthStr = depDate.toISOString().substring(0, 7);
        return monthStr === selectedMonth;
      })
      .sort((a, b) => new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture));

    const taSum = filtered.reduce((sum, j) => sum + (j.taAmount || 0), 0);
    const ndaSum = filtered.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);
    const nightSum = filtered.reduce((sum, j) => sum + (j.nightDutyHours || 0), 0);

    return {
      matchingJourneys: filtered,
      totalTA: taSum,
      totalNDA: ndaSum,
      totalNightHours: parseFloat(nightSum.toFixed(2))
    };
  }, [selectedMonth, journeys]);

  // Trigger Audit check whenever selectedMonth or journeys update
  useEffect(() => {
    let active = true;
    if (selectedMonth) {
      const runAudit = async () => {
        setAuditLoading(true);
        try {
          const res = await runAuditReport(selectedMonth);
          if (active) setAuditResult(res);
        } catch (err) {
          console.error('Audit run failed:', err);
        } finally {
          if (active) setAuditLoading(false);
        }
      };
      runAudit();
    }
    return () => {
      active = false;
    };
  }, [selectedMonth, journeys, runAuditReport]);

  // Generate and archive report
  const handleGenerateReport = async () => {
    if (matchingJourneys.length === 0) {
      alert('No logged shifts found for the selected month to compile a statement.');
      return;
    }

    if (auditResult && auditResult.healthScore < 70) {
      if (!window.confirm(`WARNING: Your logbook has a low compliance health score (${auditResult.healthScore}%). Generating a statement with sequence overlaps might lead to audit rejection. Continue?`)) {
        return;
      }
    }

    const typeLabels = { TA: 'TA_Statement', NDA: 'NDA_Statement', DIARY: 'Duty_Diary' };
    const fileName = `${typeLabels[reportType]}_${selectedMonth}.pdf`;
    const totalAmount = reportType === 'TA' ? totalTA : (reportType === 'NDA' ? totalNDA : (totalTA + totalNDA));

    const reportPayload = {
      reportType,
      month: selectedMonth,
      fileName,
      totalAmount,
      journeyCount: matchingJourneys.length,
      summaryData: {
        totalTA,
        totalNDA,
        totalNightHours,
        generatedBy: user.name,
        role: user.role,
        division: user.division,
        journeys: matchingJourneys.map(j => ({
          trainNumber: j.trainNumber,
          date: j.scheduledDeparture,
          route: `${j.departureStation}-${j.arrivalStation}`,
          ta: j.taAmount,
          nda: j.ndaAmount,
          nightHours: j.nightDutyHours
        }))
      }
    };

    try {
      await saveReportToHistory(reportPayload);
      alert('Monthly statement compiled and added to history log!');
    } catch (err) {
      alert('Failed to save statement: ' + err.message);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (matchingJourneys.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'TA') {
      csvContent += "Date,Train Number,Train Name,From,To,Departure from HQ,Arrival at HQ,Total TA (INR),Remarks\n";
      matchingJourneys.forEach(j => {
        const row = [
          new Date(j.scheduledDeparture).toLocaleDateString(),
          j.trainNumber,
          j.trainName.replace(/,/g, ''),
          j.departureStation,
          j.arrivalStation,
          new Date(j.departureFromHq || j.actualDeparture).toLocaleString().replace(/,/g, ''),
          new Date(j.arrivalAtHq || j.actualArrival).toLocaleString().replace(/,/g, ''),
          j.taAmount,
          (j.notes || '').replace(/,/g, '')
        ].join(",");
        csvContent += row + "\n";
      });
    } else if (reportType === 'NDA') {
      csvContent += "Date,Train Number,Train Name,From,To,Actual Departure,Actual Arrival,Night Hours,Total NDA (INR),Remarks\n";
      matchingJourneys.forEach(j => {
        const row = [
          new Date(j.scheduledDeparture).toLocaleDateString(),
          j.trainNumber,
          j.trainName.replace(/,/g, ''),
          j.departureStation,
          j.arrivalStation,
          new Date(j.actualDeparture).toLocaleString().replace(/,/g, ''),
          new Date(j.actualArrival).toLocaleString().replace(/,/g, ''),
          j.nightDutyHours,
          j.ndaAmount,
          (j.notes || '').replace(/,/g, '')
        ].join(",");
        csvContent += row + "\n";
      });
    } else {
      csvContent += "Date,Train Number,Train Name,Route,Distance (Km),Night Hours,TA (INR),NDA (INR),Total Allowance (INR)\n";
      matchingJourneys.forEach(j => {
        const row = [
          new Date(j.scheduledDeparture).toLocaleDateString(),
          j.trainNumber,
          j.trainName.replace(/,/g, ''),
          `${j.departureStation}-${j.arrivalStation}`,
          j.distanceKm,
          j.nightDutyHours,
          j.taAmount,
          j.ndaAmount,
          j.taAmount + j.ndaAmount
        ].join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RailAssist_${reportType}_Statement_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      {/* Title */}
      <div className="no-print d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Monthly Statements</h2>
          <p className="text-secondary-custom mb-0">Compile, print, and export your official TA and NDA allowance claim sheets</p>
        </div>
      </div>

      {/* Two-Panel Layout (Desktop) */}
      <div className="row g-3 mb-4 no-print">
        {/* Left Panel: Compile Parameters */}
        <div className="col-12 col-lg-5">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Compile Statement</h5>
              
              <div className="mb-3">
                <label className="form-label-saas">Statement Type</label>
                <select 
                  className="form-select form-control-saas" 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                    backgroundPosition: 'right 0.75rem center', 
                    backgroundSize: '16px 12px' 
                  }}
                >
                  <option value="TA">Traveling Allowance (TA) Journal</option>
                  <option value="NDA">Night Duty Allowance (NDA) Sheet</option>
                  <option value="DIARY">Monthly Journey Diary (Full Log)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label-saas">Select Target Month</label>
                <input 
                  type="month" 
                  className="form-control form-control-saas" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              {/* Matching Summary if journeys exist */}
              {matchingJourneys.length > 0 && (
                <div className="p-3 rounded bg-dark border border-secondary mb-3" style={{ backgroundColor: 'rgba(27, 34, 50, 0.2)' }}>
                  <div className="d-flex justify-content-between text-secondary-custom mb-1" style={{ fontSize: '12px' }}>
                    <span>Logged Duties:</span>
                    <span className="text-white font-weight-semibold">{matchingJourneys.length} shifts</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary-custom mb-1" style={{ fontSize: '12px' }}>
                    <span>Total TA Claim:</span>
                    <span className="text-success font-weight-semibold">₹{totalTA}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary-custom" style={{ fontSize: '12px' }}>
                    <span>Total NDA (Night Hours):</span>
                    <span className="text-info font-weight-semibold">₹{totalNDA} ({totalNightHours}h)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 pt-2 border-top border-secondary mt-3">
              <button 
                onClick={handleGenerateReport} 
                className="btn btn-glow-primary py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                disabled={matchingJourneys.length === 0}
              >
                <FileCheck size={15} />
                <span>Compile Statement</span>
              </button>
              <button 
                onClick={() => setShowPreview(!showPreview)} 
                className="btn btn-saas-secondary py-2"
                disabled={matchingJourneys.length === 0}
              >
                <Eye size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: History Archive Table (Stripe Style) */}
        <div className="col-12 col-lg-7">
          <div className="card-saas h-100 p-0 overflow-hidden d-flex flex-column justify-content-between">
            <div>
              <div className="p-3 border-bottom border-secondary">
                <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Statement History Log</h5>
              </div>
              <div className="table-responsive" style={{ maxHeight: '280px' }}>
                <table className="table table-hover table-dark-custom align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Compiled Date</th>
                      <th>Month</th>
                      <th>Statement Title</th>
                      <th>Amount</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [1, 2, 3].map(n => (
                        <tr key={n}>
                          <td><div className="skeleton skeleton-text" style={{ width: '70px', marginBottom: 0 }}></div></td>
                          <td><div className="skeleton skeleton-text" style={{ width: '50px', marginBottom: 0 }}></div></td>
                          <td><div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: 0 }}></div></td>
                          <td><div className="skeleton skeleton-text" style={{ width: '40px', marginBottom: 0 }}></div></td>
                          <td className="text-end"><div className="skeleton skeleton-text ms-auto" style={{ width: '50px', marginBottom: 0 }}></div></td>
                        </tr>
                      ))
                    ) : reports.length > 0 ? (
                      reports.map(r => (
                        <tr key={r.id || r._id}>
                          <td className="text-secondary-custom" style={{ fontSize: '13px' }}>
                            {new Date(r.generatedAt).toLocaleDateString()}
                          </td>
                          <td className="text-white font-weight-medium" style={{ fontSize: '13px' }}>{r.month}</td>
                          <td className="text-secondary-custom text-truncate" style={{ fontSize: '13px', maxWidth: '160px' }}>
                            <div className="d-flex align-items-center gap-1">
                              <FileText size={12} className="text-primary" />
                              <span>{r.fileName}</span>
                            </div>
                          </td>
                          <td className="text-success font-weight-medium" style={{ fontSize: '13px' }}>₹{r.totalAmount}</td>
                          <td className="text-end">
                            <button 
                              onClick={() => {
                                setSelectedMonth(r.month);
                                setReportType(r.reportType);
                                setShowPreview(true);
                                alert(`Loaded calculations for ${r.month} ${r.reportType}. Scroll down to inspect and print.`);
                              }} 
                              className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-secondary-custom hover-text-white"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="d-flex flex-column align-items-center justify-content-center">
                            <FolderOpen size={32} className="text-secondary-custom mb-2" />
                            <h6 className="text-white mb-1" style={{ fontSize: '13px' }}>No Statements Archived</h6>
                            <p className="text-secondary-custom small mb-0">Statements you compile will be saved here offline.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logbook Compliance Quality Check (RAG Rule Engine + AI Explanation) */}
      {matchingJourneys.length > 0 && (
        <div className="card-saas mb-4 no-print border-secondary">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="rounded-circle bg-primary d-inline-block" style={{ width: '6px', height: '6px' }}></span>
              <h5 className="text-white mb-0" style={{ fontSize: '14px', fontWeight: '600' }}>Compliance Quality Audit</h5>
            </div>
            {auditLoading && <span className="spinner-border spinner-border-sm text-primary" role="status"></span>}
          </div>

          {auditResult && (
            <div className="row g-3">
              {/* Health Score Gauge */}
              <div className="col-12 col-md-3 text-center d-flex flex-column align-items-center justify-content-center border-end border-secondary">
                <span className="text-secondary-custom small mb-1">Roster Compliance Health</span>
                <div 
                  className={`widget-stat-number fs-1 ${auditResult.healthScore >= 90 ? 'text-success' : (auditResult.healthScore >= 70 ? 'text-warning' : 'text-danger')}`}
                  style={{ webkitTextFillColor: 'initial', background: 'none' }}
                >
                  {auditResult.healthScore}%
                </div>
                <span className={`badge py-1 px-3 mt-1 ${auditResult.healthScore >= 90 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                  {auditResult.healthScore >= 90 ? 'Ready for Submission' : 'Fix Warnings'}
                </span>
              </div>

              {/* Warnings List & AI Summary */}
              <div className="col-12 col-md-9 ps-md-4">
                <h6 className="text-white mb-2" style={{ fontSize: '13px' }}>AI Compliance Summary</h6>
                <p className="text-secondary-custom small mb-3" style={{ lineHeight: '1.5' }}>
                  {auditResult.aiExplanation}
                </p>

                {auditResult.warnings.length > 0 && (
                  <div className="d-flex flex-column gap-2">
                    {auditResult.warnings.map((w, idx) => (
                      <div key={idx} className="p-2 rounded text-danger border border-danger-subtle small d-flex align-items-start gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239,68,68,0.1) !important' }}>
                        <AlertTriangle size={14} className="mt-1 flex-shrink-0" />
                        <div>
                          <strong>{w.type}:</strong> {w.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Print Preview Template Block */}
      {(showPreview || matchingJourneys.length === 0) ? null : (
        <div className="no-print text-center mb-4">
          <button onClick={() => setShowPreview(true)} className="btn btn-saas-secondary py-2 px-4 gap-2 d-inline-flex align-items-center">
            <Printer size={15} />
            <span>Open Printable Statement Sheet</span>
          </button>
        </div>
      )}

      {showPreview && matchingJourneys.length > 0 && (
        <div className="card-saas p-4 mb-4" style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #d1d5db' }}>
          {/* Print Toolbar */}
          <div className="no-print d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
            <span className="text-black small">
              <Info size={14} className="me-1 text-primary" style={{ transform: 'translateY(-1px)' }} />
              Print Preview: This container styles automatically for paper layouts when printing.
            </span>
            <div className="d-flex gap-2">
              <button onClick={handleExportCSV} className="btn btn-saas-secondary text-black border-dark btn-sm py-1 px-3">
                <FileSpreadsheet size={12} className="me-1" /> Excel CSV
              </button>
              <button onClick={handlePrintPDF} className="btn btn-glow-primary btn-sm py-1 px-3">
                <Printer size={12} className="me-1" /> Print Sheet
              </button>
            </div>
          </div>

          {/* Document Header */}
          <div className="text-center pb-3 border-bottom border-dark mb-4">
            <h3 className="mb-1" style={{ color: '#000', fontWeight: 'bold' }}>INDIAN RAILWAYS</h3>
            <h5 className="mb-1" style={{ color: '#000' }}>
              {reportType === 'TA' ? 'TRAVELING ALLOWANCE JOURNAL / CLAIM' : (reportType === 'NDA' ? 'NIGHT DUTY ALLOWANCE STATEMENT' : 'MONTHLY JOURNAL DIARY')}
            </h5>
            <h6 className="mb-0 text-muted" style={{ color: '#4b5563' }}>For the Month of: {selectedMonth}</h6>
          </div>

          {/* Staff details */}
          <div className="row mb-4" style={{ fontSize: '14px', color: '#000' }}>
            <div className="col-6">
              <div><strong>Employee Name:</strong> {user?.name}</div>
              <div><strong>Designation/Role:</strong> {user?.role}</div>
            </div>
            <div className="col-6 text-end">
              <div><strong>Division:</strong> {user?.division}</div>
              <div><strong>Sub. Tier:</strong> {user?.subscriptionTier}</div>
            </div>
          </div>

          {/* Tabular Preview */}
          <div className="table-responsive">
            <table className="table table-bordered border-dark text-black align-middle" style={{ fontSize: '13px', color: '#000' }}>
              <thead>
                <tr className="table-secondary border-dark" style={{ color: '#000' }}>
                  <th>Date</th>
                  <th>Train No</th>
                  <th>From/To Stations</th>
                  {reportType === 'TA' && (
                    <>
                      <th>Departure HQ</th>
                      <th>Arrival HQ</th>
                      <th>TA Amt (₹)</th>
                    </>
                  )}
                  {reportType === 'NDA' && (
                    <>
                      <th>Act Dep/Arr</th>
                      <th>Night Hours</th>
                      <th>NDA Amt (₹)</th>
                    </>
                  )}
                  {reportType === 'DIARY' && (
                    <>
                      <th>Distance</th>
                      <th>Night Hrs</th>
                      <th>TA (₹)</th>
                      <th>NDA (₹)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {matchingJourneys.map(j => (
                  <tr key={j.localId} className="border-dark">
                    <td>{new Date(j.scheduledDeparture).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}</td>
                    <td>{j.trainNumber}</td>
                    <td>{j.departureStation} - {j.arrivalStation}</td>
                    
                    {reportType === 'TA' && (
                      <>
                        <td>{new Date(j.departureFromHq || j.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{new Date(j.arrivalAtHq || j.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="font-weight-bold">₹{j.taAmount}</td>
                      </>
                    )}

                    {reportType === 'NDA' && (
                      <>
                        <td>
                          {new Date(j.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} / {new Date(j.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>{j.nightDutyHours}h</td>
                        <td className="font-weight-bold">₹{j.ndaAmount}</td>
                      </>
                    )}

                    {reportType === 'DIARY' && (
                      <>
                        <td>{j.distanceKm} km</td>
                        <td>{j.nightDutyHours}h</td>
                        <td>₹{j.taAmount}</td>
                        <td>₹{j.ndaAmount}</td>
                      </>
                    )}
                  </tr>
                ))}
                
                {/* Calculations Summary Row */}
                <tr className="table-light border-dark font-weight-bold" style={{ fontWeight: 'bold' }}>
                  <td colSpan="3" className="text-end">TOTALS:</td>
                  {reportType === 'TA' && (
                    <>
                      <td></td>
                      <td></td>
                      <td>₹{totalTA}</td>
                    </>
                  )}
                  {reportType === 'NDA' && (
                    <>
                      <td></td>
                      <td>{totalNightHours}h</td>
                      <td>₹{totalNDA}</td>
                    </>
                  )}
                  {reportType === 'DIARY' && (
                    <>
                      <td></td>
                      <td>{totalNightHours}h</td>
                      <td>₹{totalTA}</td>
                      <td>₹{totalNDA}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Box */}
          <div className="row mt-5 pt-4" style={{ fontSize: '13px', color: '#000' }}>
            <div className="col-6">
              <div className="border-top border-dark pt-1 text-center" style={{ width: '150px' }}>
                Claimant Signature
              </div>
            </div>
            <div className="col-6 text-end d-flex justify-content-end">
              <div className="border-top border-dark pt-1 text-center" style={{ width: '150px' }}>
                Controlling Officer
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
