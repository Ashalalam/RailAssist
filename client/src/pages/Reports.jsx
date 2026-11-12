import { useState, useEffect, useMemo } from 'react';
import { useJourneys } from '../contexts/JourneyContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import localDB from '../services/db';
import FinancialDashboard from '../components/FinancialDashboard';
// ExcelJS lazy-loaded on demand (see handleExportExcel)
import { 
  FileSpreadsheet, 
  Printer, 
  Info, 
  FileText,
  FileCheck,
  AlertTriangle,
  FolderOpen,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const { journeys, reports, saveReportToHistory, runAuditReport, loading } = useJourneys();

  // Date range state (default to current month)
  const currentDate = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [dateRange, setDateRange] = useState({
    startDate: monthStart.toISOString().substring(0, 10),
    endDate: monthEnd.toISOString().substring(0, 10)
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"
  const [useCustomRange, setUseCustomRange] = useState(false);
  
  const [reportType, setReportType] = useState('TA'); // "TA", "NDA", "DIARY", "MR", "COMBINED"
  const [showPreview, setShowPreview] = useState(false);
  const [dutyCategory, setDutyCategory] = useState('ALL');
  const [claimStatus, setClaimStatus] = useState('ALL');

  // Feature 13: Summary from backend API
  const [summaryData, setSummaryData] = useState(null);
  const [showReconciliation, setShowReconciliation] = useState(false);

  // Callback for FinancialDashboard
  const handleSummaryLoad = (data) => {
    setSummaryData(data);
  };

  // Sync dateRange with selectedMonth when not using custom range
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

  // Feature 07: Template integration
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Compliance Audit states
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Feature 13: Use summaryData as source of truth when available
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

  // Feature 07: Load templates on mount and when report type changes
  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    // Load default template when report type changes
    if (templates.length > 0) {
      const defaultTemplate = templates.find(t => 
        t.statementType === reportType && t.isDefault
      );
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      } else {
        setSelectedTemplate(null);
      }
    }
  }, [reportType, templates]);

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await api.statementTemplates.getAll();
      setTemplates(response);

      // Cache in IndexedDB
      const db = await localDB.init();
      for (const template of response) {
        await db.put('statementTemplates', { ...template, localId: template._id || template.localId });
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      
      // Fallback to offline data
      try {
        const db = await localDB.init();
        const offlineTemplates = await db.getAll('statementTemplates');
        setTemplates(offlineTemplates);
      } catch (dbErr) {
        console.error('Failed to load offline templates:', dbErr);
      }
    } finally {
      setTemplatesLoading(false);
    }
  };

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
      alert('No logged shifts found for the selected period to compile a statement.');
      return;
    }

    if (auditResult && auditResult.healthScore < 70) {
      if (!window.confirm(`WARNING: Your logbook has a low compliance health score (${auditResult.healthScore}%). Generating a statement with sequence overlaps might lead to audit rejection. Continue?`)) {
        return;
      }
    }

    const periodLabel = useCustomRange 
      ? `${dateRange.startDate}_to_${dateRange.endDate}`
      : selectedMonth;

    const typeLabels = { TA: 'TA_Statement', NDA: 'NDA_Statement', DIARY: 'Duty_Diary', MR: 'MR_Statement', COMBINED: 'Combined_Statement' };
    const fileName = `${typeLabels[reportType]}_${periodLabel}.pdf`;
    const totalAmount = reportType === 'TA' ? totalTA : (reportType === 'NDA' ? totalNDA : (reportType === 'MR' ? totalMR : (totalTA + totalNDA)));

    const reportPayload = {
      reportType,
      month: useCustomRange ? periodLabel : selectedMonth,
      fileName,
      totalAmount,
      journeyCount: matchingJourneys.length,
      summaryData: {
        totalTA,
        totalNDA,
        totalNightHours,
        totalMR,
        mrCount,
        generatedBy: user.name,
        role: user.role,
        division: user.division,
        dateRange: useCustomRange ? dateRange : undefined,
        journeys: matchingJourneys.map(j => ({
          trainNumber: j.trainNumber,
          date: j.scheduledDeparture,
          route: `${j.departureStation}-${j.arrivalStation}`,
          ta: j.taAmount,
          nda: j.ndaAmount,
          nightHours: j.nightDutyHours,
          mrNumber: j.mrNumber,
          mrAmount: j.mrAmount,
          remittedAtStation: j.remittedAtStation,
          dutyCategory: j.dutyCategory,
          noClaimReason: j.noClaimReason,
          hasClaim: j.hasClaim
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

  // Feature 07: Helper to check if column should be displayed
  const shouldShowColumn = (columnId) => {
    if (!selectedTemplate || !selectedTemplate.selectedColumns) return true;
    return selectedTemplate.selectedColumns.includes(columnId);
  };

  const handleExportCSV = () => {
    if (matchingJourneys.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'TA') {
      // Build header based on template
      const headers = [];
      if (shouldShowColumn('date')) headers.push('Date');
      if (shouldShowColumn('trainNumber')) headers.push('Train Number');
      if (shouldShowColumn('trainName')) headers.push('Train Name');
      if (shouldShowColumn('route')) headers.push('From');
      if (shouldShowColumn('route')) headers.push('To');
      if (shouldShowColumn('departureFromHq')) headers.push('Departure from HQ');
      if (shouldShowColumn('arrivalAtHq')) headers.push('Arrival at HQ');
      if (shouldShowColumn('taAmount')) headers.push('Total TA (INR)');
      if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) headers.push('Remarks');
      csvContent += headers.join(',') + "\n";

      matchingJourneys.forEach(j => {
        const row = [];
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber);
        if (shouldShowColumn('trainName')) row.push(j.trainName.replace(/,/g, ''));
        if (shouldShowColumn('route')) {
          row.push(j.departureStation);
          row.push(j.arrivalStation);
        }
        if (shouldShowColumn('departureFromHq')) row.push(new Date(j.departureFromHq || j.actualDeparture).toLocaleString().replace(/,/g, ''));
        if (shouldShowColumn('arrivalAtHq')) row.push(new Date(j.arrivalAtHq || j.actualArrival).toLocaleString().replace(/,/g, ''));
        if (shouldShowColumn('taAmount')) row.push(j.taAmount);
        if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) row.push((j.notes || '').replace(/,/g, ''));
        csvContent += row.join(",") + "\n";
      });
    } else if (reportType === 'NDA') {
      const headers = [];
      if (shouldShowColumn('date')) headers.push('Date');
      if (shouldShowColumn('trainNumber')) headers.push('Train Number');
      if (shouldShowColumn('trainName')) headers.push('Train Name');
      if (shouldShowColumn('route')) {
        headers.push('From');
        headers.push('To');
      }
      if (shouldShowColumn('actualDeparture')) headers.push('Actual Departure');
      if (shouldShowColumn('actualArrival')) headers.push('Actual Arrival');
      if (shouldShowColumn('nightDutyHours')) headers.push('Night Hours');
      if (shouldShowColumn('ndaAmount')) headers.push('Total NDA (INR)');
      if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) headers.push('Remarks');
      csvContent += headers.join(',') + "\n";

      matchingJourneys.forEach(j => {
        const row = [];
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber);
        if (shouldShowColumn('trainName')) row.push(j.trainName.replace(/,/g, ''));
        if (shouldShowColumn('route')) {
          row.push(j.departureStation);
          row.push(j.arrivalStation);
        }
        if (shouldShowColumn('actualDeparture')) row.push(new Date(j.actualDeparture).toLocaleString().replace(/,/g, ''));
        if (shouldShowColumn('actualArrival')) row.push(new Date(j.actualArrival).toLocaleString().replace(/,/g, ''));
        if (shouldShowColumn('nightDutyHours')) row.push(j.nightDutyHours);
        if (shouldShowColumn('ndaAmount')) row.push(j.ndaAmount);
        if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) row.push((j.notes || '').replace(/,/g, ''));
        csvContent += row.join(",") + "\n";
      });
    } else if (reportType === 'MR') {
      const headers = [];
      if (shouldShowColumn('date')) headers.push('Date');
      if (shouldShowColumn('trainNumber')) headers.push('Train Number');
      if (shouldShowColumn('trainName')) headers.push('Train Name');
      if (shouldShowColumn('route')) {
        headers.push('From');
        headers.push('To');
      }
      if (shouldShowColumn('mrNumber')) headers.push('MR Number');
      if (shouldShowColumn('mrAmount')) headers.push('MR Amount (INR)');
      if (shouldShowColumn('remittedAtStation')) headers.push('Remitted At Station');
      if (shouldShowColumn('claimStatus')) headers.push('Claim Status');
      csvContent += headers.join(',') + "\n";

      matchingJourneys.forEach(j => {
        if (j.mrNumber && j.mrNumber.trim() !== '') {
          const row = [];
          if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
          if (shouldShowColumn('trainNumber')) row.push(j.trainNumber);
          if (shouldShowColumn('trainName')) row.push(j.trainName.replace(/,/g, ''));
          if (shouldShowColumn('route')) {
            row.push(j.departureStation);
            row.push(j.arrivalStation);
          }
          if (shouldShowColumn('mrNumber')) row.push(j.mrNumber);
          if (shouldShowColumn('mrAmount')) row.push(j.mrAmount || 0);
          if (shouldShowColumn('remittedAtStation')) row.push(j.remittedAtStation || '');
          if (shouldShowColumn('claimStatus')) row.push(j.hasClaim ? 'Pending' : 'Processed');
          csvContent += row.join(",") + "\n";
        }
      });
    } else {
      const headers = [];
      if (shouldShowColumn('date')) headers.push('Date');
      if (shouldShowColumn('trainNumber')) headers.push('Train Number');
      if (shouldShowColumn('trainName')) headers.push('Train Name');
      if (shouldShowColumn('route')) headers.push('Route');
      if (shouldShowColumn('distance')) headers.push('Distance (Km)');
      if (shouldShowColumn('nightDutyHours')) headers.push('Night Hours');
      if (shouldShowColumn('taAmount')) headers.push('TA (INR)');
      if (shouldShowColumn('ndaAmount')) headers.push('NDA (INR)');
      if (shouldShowColumn('totalAllowance')) headers.push('Total Allowance (INR)');
      csvContent += headers.join(',') + "\n";

      matchingJourneys.forEach(j => {
        const row = [];
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber);
        if (shouldShowColumn('trainName')) row.push(j.trainName.replace(/,/g, ''));
        if (shouldShowColumn('route')) row.push(`${j.departureStation}-${j.arrivalStation}`);
        if (shouldShowColumn('distance')) row.push(j.distanceKm);
        if (shouldShowColumn('nightDutyHours')) row.push(j.nightDutyHours);
        if (shouldShowColumn('taAmount')) row.push(j.taAmount);
        if (shouldShowColumn('ndaAmount')) row.push(j.ndaAmount);
        if (shouldShowColumn('totalAllowance')) row.push(j.taAmount + j.ndaAmount);
        csvContent += row.join(",") + "\n";
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

  // Feature 13: Excel (.xlsx) Export using ExcelJS (lazy-loaded)
  const handleExportExcel = async () => {
    if (matchingJourneys.length === 0) return;

    // Lazy-load ExcelJS only when export is requested
    const ExcelJS = (await import('exceljs')).default;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const sheetName = reportType === 'TA' ? 'TA Statement' :
                      reportType === 'NDA' ? 'NDA Statement' :
                      reportType === 'MR' ? 'MR Statement' : 'Duty Diary';
    const worksheet = workbook.addWorksheet(sheetName);

    let currentRow = 1;

    // Add employee information header if template includes it
    if (selectedTemplate?.showEmployeeInfo !== false) {
      worksheet.getRow(currentRow).values = [`Employee: ${user.name}`, '', '', `Role: ${user.role}`, '', `Division: ${user.division || 'N/A'}`];
      currentRow++;
      worksheet.getRow(currentRow).values = [`Statement Type: ${reportType}`, '', '', `Period: ${useCustomRange ? `${dateRange.startDate} to ${dateRange.endDate}` : selectedMonth}`, '', `Generated: ${new Date().toLocaleDateString()}`];
      currentRow++;
      currentRow++; // Empty row for spacing
    }

    // Build column headers based on template and report type
    const headers = [];
    const columnWidths = [];

    if (reportType === 'TA') {
      if (shouldShowColumn('date')) { headers.push('Date'); columnWidths.push(12); }
      if (shouldShowColumn('trainNumber')) { headers.push('Train Number'); columnWidths.push(12); }
      if (shouldShowColumn('trainName')) { headers.push('Train Name'); columnWidths.push(20); }
      if (shouldShowColumn('route')) { 
        headers.push('From'); columnWidths.push(15);
        headers.push('To'); columnWidths.push(15);
      }
      if (shouldShowColumn('dutyCategory')) { headers.push('Duty Category'); columnWidths.push(15); }
      if (shouldShowColumn('departureFromHq')) { headers.push('Departure from HQ'); columnWidths.push(20); }
      if (shouldShowColumn('arrivalAtHq')) { headers.push('Arrival at HQ'); columnWidths.push(20); }
      if (shouldShowColumn('taAmount')) { headers.push('TA Amount (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('claimStatus')) { headers.push('Claim Status'); columnWidths.push(12); }
      if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) { 
        headers.push('Remarks'); columnWidths.push(25); 
      }
    } else if (reportType === 'NDA') {
      if (shouldShowColumn('date')) { headers.push('Date'); columnWidths.push(12); }
      if (shouldShowColumn('trainNumber')) { headers.push('Train Number'); columnWidths.push(12); }
      if (shouldShowColumn('trainName')) { headers.push('Train Name'); columnWidths.push(20); }
      if (shouldShowColumn('route')) { 
        headers.push('From'); columnWidths.push(15);
        headers.push('To'); columnWidths.push(15);
      }
      if (shouldShowColumn('dutyCategory')) { headers.push('Duty Category'); columnWidths.push(15); }
      if (shouldShowColumn('actualDeparture')) { headers.push('Actual Departure'); columnWidths.push(20); }
      if (shouldShowColumn('actualArrival')) { headers.push('Actual Arrival'); columnWidths.push(20); }
      if (shouldShowColumn('nightDutyHours')) { headers.push('Night Hours'); columnWidths.push(12); }
      if (shouldShowColumn('ndaAmount')) { headers.push('NDA Amount (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('claimStatus')) { headers.push('Claim Status'); columnWidths.push(12); }
      if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) { 
        headers.push('Remarks'); columnWidths.push(25); 
      }
    } else if (reportType === 'MR') {
      if (shouldShowColumn('date')) { headers.push('Date'); columnWidths.push(12); }
      if (shouldShowColumn('trainNumber')) { headers.push('Train Number'); columnWidths.push(12); }
      if (shouldShowColumn('trainName')) { headers.push('Train Name'); columnWidths.push(20); }
      if (shouldShowColumn('route')) { 
        headers.push('From'); columnWidths.push(15);
        headers.push('To'); columnWidths.push(15);
      }
      if (shouldShowColumn('mrNumber')) { headers.push('MR Number'); columnWidths.push(15); }
      if (shouldShowColumn('mrAmount')) { headers.push('MR Amount (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('remittedAtStation')) { headers.push('Remitted At'); columnWidths.push(15); }
      if (shouldShowColumn('dutyCategory')) { headers.push('Duty Category'); columnWidths.push(15); }
      if (shouldShowColumn('claimStatus')) { headers.push('Claim Status'); columnWidths.push(12); }
    } else {
      // DIARY or COMBINED
      if (shouldShowColumn('date')) { headers.push('Date'); columnWidths.push(12); }
      if (shouldShowColumn('trainNumber')) { headers.push('Train Number'); columnWidths.push(12); }
      if (shouldShowColumn('trainName')) { headers.push('Train Name'); columnWidths.push(20); }
      if (shouldShowColumn('route')) { headers.push('Route'); columnWidths.push(20); }
      if (shouldShowColumn('dutyCategory')) { headers.push('Duty Category'); columnWidths.push(15); }
      if (shouldShowColumn('distance')) { headers.push('Distance (Km)'); columnWidths.push(12); }
      if (shouldShowColumn('nightDutyHours')) { headers.push('Night Hours'); columnWidths.push(12); }
      if (shouldShowColumn('taAmount')) { headers.push('TA (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('ndaAmount')) { headers.push('NDA (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('totalAllowance')) { headers.push('Total (₹)'); columnWidths.push(12); }
      if (shouldShowColumn('claimStatus')) { headers.push('Claim Status'); columnWidths.push(12); }
    }

    // Set column widths
    headers.forEach((_, idx) => {
      worksheet.getColumn(idx + 1).width = columnWidths[idx];
    });

    // Add headers
    worksheet.getRow(currentRow).values = headers;
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow++;

    // Add data rows
    const relevantJourneys = reportType === 'MR' 
      ? matchingJourneys.filter(j => j.mrNumber && j.mrNumber.trim() !== '')
      : matchingJourneys;

    relevantJourneys.forEach(j => {
      const row = [];

      if (reportType === 'TA') {
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber || '');
        if (shouldShowColumn('trainName')) row.push(j.trainName || '');
        if (shouldShowColumn('route')) {
          row.push(j.departureStation || '');
          row.push(j.arrivalStation || '');
        }
        if (shouldShowColumn('dutyCategory')) row.push(j.dutyCategory || 'N/A');
        if (shouldShowColumn('departureFromHq')) row.push(new Date(j.departureFromHq || j.actualDeparture).toLocaleString());
        if (shouldShowColumn('arrivalAtHq')) row.push(new Date(j.arrivalAtHq || j.actualArrival).toLocaleString());
        if (shouldShowColumn('taAmount')) row.push(Number(j.taAmount || 0).toFixed(2));
        if (shouldShowColumn('claimStatus')) row.push(j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE') ? 'Eligible' : (j.noClaimReason || 'No Claim'));
        if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) row.push(j.notes || '');
      } else if (reportType === 'NDA') {
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber || '');
        if (shouldShowColumn('trainName')) row.push(j.trainName || '');
        if (shouldShowColumn('route')) {
          row.push(j.departureStation || '');
          row.push(j.arrivalStation || '');
        }
        if (shouldShowColumn('dutyCategory')) row.push(j.dutyCategory || 'N/A');
        if (shouldShowColumn('actualDeparture')) row.push(new Date(j.actualDeparture).toLocaleString());
        if (shouldShowColumn('actualArrival')) row.push(new Date(j.actualArrival).toLocaleString());
        if (shouldShowColumn('nightDutyHours')) row.push(Number(j.nightDutyHours || 0).toFixed(2));
        if (shouldShowColumn('ndaAmount')) row.push(Number(j.ndaAmount || 0).toFixed(2));
        if (shouldShowColumn('claimStatus')) row.push(j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE') ? 'Eligible' : (j.noClaimReason || 'No Claim'));
        if (shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false) row.push(j.notes || '');
      } else if (reportType === 'MR') {
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber || '');
        if (shouldShowColumn('trainName')) row.push(j.trainName || '');
        if (shouldShowColumn('route')) {
          row.push(j.departureStation || '');
          row.push(j.arrivalStation || '');
        }
        if (shouldShowColumn('mrNumber')) row.push(j.mrNumber || '');
        if (shouldShowColumn('mrAmount')) row.push(Number(j.mrAmount || 0).toFixed(2));
        if (shouldShowColumn('remittedAtStation')) row.push(j.remittedAtStation || '');
        if (shouldShowColumn('dutyCategory')) row.push(j.dutyCategory || 'N/A');
        if (shouldShowColumn('claimStatus')) row.push(j.hasClaim ? 'Pending' : 'Processed');
      } else {
        if (shouldShowColumn('date')) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
        if (shouldShowColumn('trainNumber')) row.push(j.trainNumber || '');
        if (shouldShowColumn('trainName')) row.push(j.trainName || '');
        if (shouldShowColumn('route')) row.push(`${j.departureStation || ''}-${j.arrivalStation || ''}`);
        if (shouldShowColumn('dutyCategory')) row.push(j.dutyCategory || 'N/A');
        if (shouldShowColumn('distance')) row.push(j.distanceKm || 0);
        if (shouldShowColumn('nightDutyHours')) row.push(Number(j.nightDutyHours || 0).toFixed(2));
        if (shouldShowColumn('taAmount')) row.push(Number(j.taAmount || 0).toFixed(2));
        if (shouldShowColumn('ndaAmount')) row.push(Number(j.ndaAmount || 0).toFixed(2));
        if (shouldShowColumn('totalAllowance')) row.push(Number((j.taAmount || 0) + (j.ndaAmount || 0)).toFixed(2));
        if (shouldShowColumn('claimStatus')) row.push(j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE') ? 'Eligible' : (j.noClaimReason || 'No Claim'));
      }

      worksheet.getRow(currentRow).values = row;
      currentRow++;
    });

    // Add totals row if template allows
    if (selectedTemplate?.showTotals !== false) {
      currentRow++; // Empty row for spacing
      const totalsRow = [];
      
      // Add "TOTAL" label in first column
      totalsRow.push('TOTAL');
      
      // Fill empty cells to align with amount columns
      const emptyColumns = headers.length - 1 - (reportType === 'TA' ? 1 : reportType === 'NDA' ? 2 : reportType === 'MR' ? 1 : 3);
      for (let i = 0; i < emptyColumns; i++) {
        totalsRow.push('');
      }
      
      // Add financial totals
      if (reportType === 'TA') {
        totalsRow.push(`₹${totalTA.toFixed(2)}`);
      } else if (reportType === 'NDA') {
        totalsRow.push(totalNightHours.toFixed(2));
        totalsRow.push(`₹${totalNDA.toFixed(2)}`);
      } else if (reportType === 'MR') {
        totalsRow.push(`₹${totalMR.toFixed(2)}`);
      } else {
        totalsRow.push(`₹${totalTA.toFixed(2)}`);
        totalsRow.push(`₹${totalNDA.toFixed(2)}`);
        totalsRow.push(`₹${(totalTA + totalNDA).toFixed(2)}`);
      }
      
      worksheet.getRow(currentRow).values = totalsRow;
      worksheet.getRow(currentRow).font = { bold: true };
      currentRow++;
    }

    // Add custom footer if template includes it
    if (selectedTemplate?.customFooter) {
      currentRow++;
      worksheet.getRow(currentRow).values = [selectedTemplate.customFooter];
      currentRow++;
    }

    // Add signature section if template includes it
    if (selectedTemplate?.showSignatureSection !== false) {
      currentRow++;
      currentRow++;
      worksheet.getRow(currentRow).values = ['Verified By: _____________________', '', '', 'Date: _____________________'];
      currentRow++;
      worksheet.getRow(currentRow).values = ['Signature: _____________________', '', '', 'Stamp: _____________________'];
    }

    // Generate filename
    const periodLabel = useCustomRange 
      ? `${dateRange.startDate}_to_${dateRange.endDate}`
      : selectedMonth;
    const filename = `RailAssist_${reportType}_Statement_${periodLabel}.xlsx`;

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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

      {/* Feature 13: Financial Dashboard */}
      <FinancialDashboard 
        dateRange={dateRange}
        dutyCategory={dutyCategory}
        claimStatus={claimStatus}
        onSummaryLoad={handleSummaryLoad}
      />

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
                  <option value="MR">Money Remittance (MR) Statement</option>
                  <option value="DIARY">Monthly Journey Diary (Full Log)</option>
                </select>
              </div>

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
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                    backgroundPosition: 'right 0.75rem center', 
                    backgroundSize: '16px 12px' 
                  }}
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
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                    backgroundPosition: 'right 0.75rem center', 
                    backgroundSize: '16px 12px' 
                  }}
                >
                  <option value="ALL">All Duties</option>
                  <option value="ELIGIBLE">Eligible for Claim</option>
                  <option value="NO_CLAIM">No-Claim Only</option>
                </select>
              </div>

              {/* Feature 07: Template Selector */}
              <div className="mb-4">
                <label className="form-label-saas">
                  <Settings size={14} className="me-1" style={{ transform: 'translateY(-2px)' }} />
                  Statement Template (Optional)
                </label>
                <select 
                  className="form-select form-control-saas" 
                  value={selectedTemplate?._id || ''}
                  onChange={(e) => {
                    const template = templates.find(t => t._id === e.target.value);
                    setSelectedTemplate(template || null);
                  }}
                  disabled={templatesLoading}
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                    backgroundPosition: 'right 0.75rem center', 
                    backgroundSize: '16px 12px' 
                  }}
                >
                  <option value="">Default Layout (All Columns)</option>
                  {templates
                    .filter(t => t.statementType === reportType)
                    .map(t => (
                      <option key={t._id} value={t._id}>
                        {t.templateName} {t.isDefault ? '★' : ''}
                      </option>
                    ))}
                </select>
                {selectedTemplate && (
                  <small className="text-secondary-custom d-block mt-1" style={{ fontSize: '11px' }}>
                    {selectedTemplate.selectedColumns?.length || 0} columns • {selectedTemplate.pageOrientation || 'portrait'}
                  </small>
                )}
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
                    <span className="text-success font-weight-semibold">₹{totalTA.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary-custom" style={{ fontSize: '12px' }}>
                    <span>Total NDA (Night Hours):</span>
                    <span className="text-info font-weight-semibold">₹{totalNDA.toFixed(2)} ({totalNightHours}h)</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary-custom" style={{ fontSize: '12px' }}>
                    <span>Total MR Remittances:</span>
                    <span className="text-warning font-weight-semibold">₹{totalMR.toFixed(2)} ({mrCount} MRs)</span>
                  </div>
                </div>
              )}

              {/* Feature 13: Reconciliation View */}
              {matchingJourneys.length > 0 && summaryData && (
                <div className="mb-3">
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
                                <td className={isEligible ? 'text-success' : 'text-muted'}>₹{(j.taAmount || 0).toFixed(2)}</td>
                                <td className={isEligible ? 'text-info' : 'text-muted'}>₹{(j.ndaAmount || 0).toFixed(2)}</td>
                                <td>{j.mrAmount ? `₹${j.mrAmount.toFixed(2)}` : '-'}</td>
                                <td>{isEligible ? 'Eligible' : j.noClaimReason || 'No Claim'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-top border-secondary">
                          <tr className="fw-bold">
                            <td colSpan="2">Totals:</td>
                            <td className="text-success">₹{totalTA.toFixed(2)}</td>
                            <td className="text-info">₹{totalNDA.toFixed(2)}</td>
                            <td>₹{totalMR.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
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
        <div 
          className={`card-saas p-4 mb-4 ${selectedTemplate?.pageOrientation === 'landscape' ? 'print-landscape' : ''}`} 
          style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #d1d5db' }}
        >
          {/* Print Toolbar */}
          <div className="no-print d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
            <span className="text-black small">
              <Info size={14} className="me-1 text-primary" style={{ transform: 'translateY(-1px)' }} />
              Print Preview: This container styles automatically for paper layouts when printing.
            </span>
            <div className="d-flex gap-2">
              <button onClick={handleExportCSV} className="btn btn-saas-secondary text-black border-dark btn-sm py-1 px-3">
                <FileSpreadsheet size={12} className="me-1" /> CSV Export
              </button>
              <button onClick={handleExportExcel} className="btn btn-saas-secondary text-black border-dark btn-sm py-1 px-3">
                <FileSpreadsheet size={12} className="me-1" /> Excel (.xlsx)
              </button>
              <button onClick={handlePrintPDF} className="btn btn-glow-primary btn-sm py-1 px-3">
                <Printer size={12} className="me-1" /> Print Sheet
              </button>
            </div>
          </div>

          {/* Document Header */}
          <div className="text-center pb-3 border-bottom border-dark mb-4">
            {selectedTemplate?.customHeader ? (
              <h4 className="mb-2" style={{ color: '#000', fontWeight: 'bold' }}>{selectedTemplate.customHeader}</h4>
            ) : (
              <h3 className="mb-1" style={{ color: '#000', fontWeight: 'bold' }}>INDIAN RAILWAYS</h3>
            )}
            <h5 className="mb-1" style={{ color: '#000' }}>
              {reportType === 'TA' ? 'TRAVELING ALLOWANCE JOURNAL / CLAIM' : (reportType === 'NDA' ? 'NIGHT DUTY ALLOWANCE STATEMENT' : (reportType === 'MR' ? 'MONEY REMITTANCE (MR) STATEMENT' : 'MONTHLY JOURNAL DIARY'))}
            </h5>
            <h6 className="mb-0 text-muted" style={{ color: '#4b5563' }}>For the Month of: {selectedMonth}</h6>
          </div>

          {/* Staff details */}
          {(!selectedTemplate || selectedTemplate.showEmployeeInfo !== false) && (
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
          )}

          {/* Tabular Preview */}
          <div className="table-responsive">
            <table className="table table-bordered border-dark text-black align-middle" style={{ 
              fontSize: selectedTemplate?.fontSize === 'small' ? '11px' : (selectedTemplate?.fontSize === 'large' ? '15px' : '13px'), 
              color: '#000' 
            }}>
              <thead>
                <tr className="table-secondary border-dark" style={{ color: '#000' }}>
                  {shouldShowColumn('date') && <th>Date</th>}
                  {shouldShowColumn('trainNumber') && <th>Train No</th>}
                  {shouldShowColumn('trainName') && <th>Train Name</th>}
                  {shouldShowColumn('route') && <th>From/To Stations</th>}
                  
                  {reportType === 'TA' && (
                    <>
                      {shouldShowColumn('departureFromHq') && <th>Departure HQ</th>}
                      {shouldShowColumn('arrivalAtHq') && <th>Arrival HQ</th>}
                      {shouldShowColumn('distanceKm') && <th>Distance (km)</th>}
                      {shouldShowColumn('taAmount') && <th>TA Amt (₹)</th>}
                      {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <th>Remarks</th>}
                    </>
                  )}
                  
                  {reportType === 'NDA' && (
                    <>
                      {shouldShowColumn('actualDeparture') && <th>Actual Dep</th>}
                      {shouldShowColumn('actualArrival') && <th>Actual Arr</th>}
                      {shouldShowColumn('nightDutyHours') && <th>Night Hours</th>}
                      {shouldShowColumn('ndaAmount') && <th>NDA Amt (₹)</th>}
                      {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <th>Remarks</th>}
                    </>
                  )}
                  
                  {reportType === 'MR' && (
                    <>
                      {shouldShowColumn('mrNumber') && <th>MR Number</th>}
                      {shouldShowColumn('mrAmount') && <th>MR Amount (₹)</th>}
                      {shouldShowColumn('remittedAtStation') && <th>Remitted At</th>}
                      {shouldShowColumn('claimStatus') && <th>Status</th>}
                    </>
                  )}
                  
                  {reportType === 'DIARY' && (
                    <>
                      {shouldShowColumn('distanceKm') && <th>Distance</th>}
                      {shouldShowColumn('nightDutyHours') && <th>Night Hrs</th>}
                      {shouldShowColumn('taAmount') && <th>TA (₹)</th>}
                      {shouldShowColumn('ndaAmount') && <th>NDA (₹)</th>}
                      {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <th>Remarks</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {matchingJourneys.map(j => (
                  <tr key={j.localId} className="border-dark">
                    {shouldShowColumn('date') && <td>{new Date(j.scheduledDeparture).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}</td>}
                    {shouldShowColumn('trainNumber') && <td>{j.trainNumber}</td>}
                    {shouldShowColumn('trainName') && <td>{j.trainName}</td>}
                    {shouldShowColumn('route') && <td>{j.departureStation} - {j.arrivalStation}</td>}
                    
                    {reportType === 'TA' && (
                      <>
                        {shouldShowColumn('departureFromHq') && <td>{new Date(j.departureFromHq || j.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>}
                        {shouldShowColumn('arrivalAtHq') && <td>{new Date(j.arrivalAtHq || j.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>}
                        {shouldShowColumn('distanceKm') && <td>{j.distanceKm} km</td>}
                        {shouldShowColumn('taAmount') && <td className="font-weight-bold">₹{j.taAmount}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td>{j.notes || '-'}</td>}
                      </>
                    )}

                    {reportType === 'NDA' && (
                      <>
                        {shouldShowColumn('actualDeparture') && <td>{new Date(j.actualDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>}
                        {shouldShowColumn('actualArrival') && <td>{new Date(j.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>}
                        {shouldShowColumn('nightDutyHours') && <td>{j.nightDutyHours}h</td>}
                        {shouldShowColumn('ndaAmount') && <td className="font-weight-bold">₹{j.ndaAmount}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td>{j.notes || '-'}</td>}
                      </>
                    )}

                    {reportType === 'MR' && (
                      <>
                        {shouldShowColumn('mrNumber') && <td>{j.mrNumber || '-'}</td>}
                        {shouldShowColumn('mrAmount') && <td className="font-weight-bold">₹{j.mrAmount || 0}</td>}
                        {shouldShowColumn('remittedAtStation') && <td>{j.remittedAtStation || '-'}</td>}
                        {shouldShowColumn('claimStatus') && (
                          <td>
                            <span className={`badge ${j.hasClaim ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`}>
                              {j.hasClaim ? 'Pending' : 'Processed'}
                            </span>
                          </td>
                        )}
                      </>
                    )}

                    {reportType === 'DIARY' && (
                      <>
                        {shouldShowColumn('distanceKm') && <td>{j.distanceKm} km</td>}
                        {shouldShowColumn('nightDutyHours') && <td>{j.nightDutyHours}h</td>}
                        {shouldShowColumn('taAmount') && <td>₹{j.taAmount}</td>}
                        {shouldShowColumn('ndaAmount') && <td>₹{j.ndaAmount}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td>{j.notes || '-'}</td>}
                      </>
                    )}
                  </tr>
                ))}
                
                {/* Calculations Summary Row */}
                {(!selectedTemplate || selectedTemplate.showSummaryTotals !== false) && (
                  <tr className="table-light border-dark font-weight-bold" style={{ fontWeight: 'bold' }}>
                    <td colSpan={Math.max(1,
                      (shouldShowColumn('date') ? 1 : 0) + 
                      (shouldShowColumn('trainNumber') ? 1 : 0) + 
                      (shouldShowColumn('trainName') ? 1 : 0) + 
                      (shouldShowColumn('route') ? 1 : 0) +
                      (reportType === 'TA' ? (shouldShowColumn('departureFromHq') ? 1 : 0) + (shouldShowColumn('arrivalAtHq') ? 1 : 0) + (shouldShowColumn('distanceKm') ? 1 : 0) : 0) +
                      (reportType === 'NDA' ? (shouldShowColumn('actualDeparture') ? 1 : 0) + (shouldShowColumn('actualArrival') ? 1 : 0) : 0) +
                      (reportType === 'MR' ? (shouldShowColumn('mrNumber') ? 1 : 0) : 0) +
                      (reportType === 'DIARY' ? (shouldShowColumn('distanceKm') ? 1 : 0) + (shouldShowColumn('nightDutyHours') ? 1 : 0) : 0) - 1
                    )} className="text-end">TOTALS:</td>
                    
                    {reportType === 'TA' && (
                      <>
                        {shouldShowColumn('taAmount') && <td>₹{totalTA}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td></td>}
                      </>
                    )}
                    
                    {reportType === 'NDA' && (
                      <>
                        {shouldShowColumn('nightDutyHours') && <td>{totalNightHours}h</td>}
                        {shouldShowColumn('ndaAmount') && <td>₹{totalNDA}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td></td>}
                      </>
                    )}
                    
                    {reportType === 'MR' && (
                      <>
                        {shouldShowColumn('mrAmount') && <td>₹{totalMR}</td>}
                        {shouldShowColumn('remittedAtStation') && <td></td>}
                        {shouldShowColumn('claimStatus') && <td>{mrCount} MRs</td>}
                      </>
                    )}
                    
                    {reportType === 'DIARY' && (
                      <>
                        {shouldShowColumn('taAmount') && <td>₹{totalTA}</td>}
                        {shouldShowColumn('ndaAmount') && <td>₹{totalNDA}</td>}
                        {shouldShowColumn('remarks') && selectedTemplate?.showRemarks !== false && <td></td>}
                      </>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signature Box */}
          {(!selectedTemplate || selectedTemplate.showSignatureSection !== false) && (
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
          )}

          {/* Custom Footer */}
          {selectedTemplate?.customFooter && (
            <div className="text-center mt-4 pt-3 border-top border-secondary-subtle" style={{ fontSize: '12px', color: '#6b7280' }}>
              {selectedTemplate.customFooter}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
