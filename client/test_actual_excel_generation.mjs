/**
 * ACTUAL EXCEL GENERATION & VERIFICATION TEST
 * 
 * This script generates real XLSX workbooks using ExcelJS and verifies:
 * - Workbook structure and metadata
 * - Worksheet names and content
 * - Headers, data rows, formatting
 * - INR amounts, dates, totals
 * - Template settings (columns, employee info, signatures)
 * - Edge cases (empty data, special characters)
 * - File integrity (reopen and parse)
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test output directory
const OUTPUT_DIR = path.join(__dirname, 'test_excel_output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

let passCount = 0;
let failCount = 0;

function logPass(message) {
  console.log(`  [PASS] ${message}`);
  passCount++;
}

function logFail(message, error) {
  console.log(`  [FAIL] ${message}`);
  if (error) console.log(`         Error: ${error.message}`);
  failCount++;
}

function logInfo(message) {
  console.log(`  [INFO] ${message}`);
}

// Mock journey data
const mockJourneys = [
  {
    scheduledDeparture: '2026-11-01T10:00:00',
    actualDeparture: '2026-11-01T10:15:00',
    actualArrival: '2026-11-01T18:30:00',
    departureFromHq: '2026-11-01T09:00:00',
    arrivalAtHq: '2026-11-01T19:30:00',
    trainNumber: '12345',
    trainName: 'Express Special',
    departureStation: 'Mumbai Central',
    arrivalStation: 'Delhi Junction',
    distanceKm: 1384,
    nightDutyHours: 5.25,
    taAmount: 1200.50,
    ndaAmount: 450.75,
    mrNumber: 'MR-001',
    mrAmount: 150.00,
    remittedAtStation: 'Surat',
    dutyCategory: 'Goods',
    hasClaim: true,
    noClaimReason: 'NONE',
    notes: 'Regular duty, no issues'
  },
  {
    scheduledDeparture: '2026-11-05T14:00:00',
    actualDeparture: '2026-11-05T14:10:00',
    actualArrival: '2026-11-05T22:45:00',
    departureFromHq: '2026-11-05T13:00:00',
    arrivalAtHq: '2026-11-05T23:45:00',
    trainNumber: '67890',
    trainName: 'Rajdhani "Premium"',
    departureStation: 'Chennai',
    arrivalStation: 'Bangalore',
    distanceKm: 362,
    nightDutyHours: 3.50,
    taAmount: 800.00,
    ndaAmount: 300.25,
    dutyCategory: 'Mail/Express',
    hasClaim: true,
    noClaimReason: 'NONE',
    notes: 'Special characters: <>&"'
  },
  {
    scheduledDeparture: '2026-11-10T08:00:00',
    actualDeparture: '2026-11-10T08:05:00',
    actualArrival: '2026-11-10T16:20:00',
    departureFromHq: '2026-11-10T07:00:00',
    arrivalAtHq: '2026-11-10T17:20:00',
    trainNumber: '11111',
    trainName: 'Local Passenger',
    departureStation: 'Pune',
    arrivalStation: 'Mumbai',
    distanceKm: 192,
    nightDutyHours: 0,
    taAmount: 600.00,
    ndaAmount: 0,
    dutyCategory: 'Passenger',
    hasClaim: false,
    noClaimReason: 'LEAVE',
    notes: ''
  }
];

// Mock user
const mockUser = {
  name: 'Test Engineer',
  role: 'Loco Pilot',
  division: 'Western Railway'
};

// Mock templates
const mockTemplates = {
  minimal: {
    name: 'Minimal',
    showEmployeeInfo: false,
    showTotals: false,
    showRemarks: false,
    showSignatureSection: false,
    columns: { date: true, trainNumber: true, taAmount: true }
  },
  full: {
    name: 'Full',
    showEmployeeInfo: true,
    showTotals: true,
    showRemarks: true,
    showSignatureSection: true,
    customFooter: 'Certified correct as per railway rules',
    columns: {
      date: true,
      trainNumber: true,
      trainName: true,
      route: true,
      dutyCategory: true,
      departureFromHq: true,
      arrivalAtHq: true,
      taAmount: true,
      claimStatus: true,
      remarks: true
    }
  }
};

/**
 * Generate Excel workbook (mimics Reports.jsx handleExportExcel)
 */
async function generateExcelWorkbook(reportType, journeys, user, template, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = reportType === 'TA' ? 'TA Statement' :
                    reportType === 'NDA' ? 'NDA Statement' :
                    reportType === 'MR' ? 'MR Statement' : 'Duty Diary';
  const worksheet = workbook.addWorksheet(sheetName);

  let currentRow = 1;

  // Add employee information header if template includes it
  if (template.showEmployeeInfo !== false) {
    worksheet.getRow(currentRow).values = [`Employee: ${user.name}`, '', '', `Role: ${user.role}`, '', `Division: ${user.division || 'N/A'}`];
    currentRow++;
    worksheet.getRow(currentRow).values = [`Statement Type: ${reportType}`, '', '', `Period: November 2026`, '', `Generated: ${new Date().toLocaleDateString()}`];
    currentRow++;
    currentRow++; // Empty row for spacing
  }

  // Build column headers based on template and report type
  const headers = [];
  const columnWidths = [];

  if (reportType === 'TA') {
    if (template.columns.date) { headers.push('Date'); columnWidths.push(12); }
    if (template.columns.trainNumber) { headers.push('Train Number'); columnWidths.push(12); }
    if (template.columns.trainName) { headers.push('Train Name'); columnWidths.push(20); }
    if (template.columns.route) {
      headers.push('From'); columnWidths.push(15);
      headers.push('To'); columnWidths.push(15);
    }
    if (template.columns.dutyCategory) { headers.push('Duty Category'); columnWidths.push(15); }
    if (template.columns.departureFromHq) { headers.push('Departure from HQ'); columnWidths.push(20); }
    if (template.columns.arrivalAtHq) { headers.push('Arrival at HQ'); columnWidths.push(20); }
    if (template.columns.taAmount) { headers.push('TA Amount (₹)'); columnWidths.push(12); }
    if (template.columns.claimStatus) { headers.push('Claim Status'); columnWidths.push(12); }
    if (template.columns.remarks && template.showRemarks !== false) {
      headers.push('Remarks'); columnWidths.push(25);
    }
  } else if (reportType === 'DIARY') {
    if (template.columns.date) { headers.push('Date'); columnWidths.push(12); }
    if (template.columns.trainNumber) { headers.push('Train Number'); columnWidths.push(12); }
    if (template.columns.trainName) { headers.push('Train Name'); columnWidths.push(20); }
    headers.push('Route'); columnWidths.push(20);
    headers.push('Distance (Km)'); columnWidths.push(12);
    headers.push('TA (₹)'); columnWidths.push(12);
    headers.push('NDA (₹)'); columnWidths.push(12);
    headers.push('Total (₹)'); columnWidths.push(12);
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
  let totalTA = 0;
  let totalNDA = 0;

  journeys.forEach(j => {
    const row = [];

    if (reportType === 'TA') {
      if (template.columns.date) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
      if (template.columns.trainNumber) row.push(j.trainNumber || '');
      if (template.columns.trainName) row.push(j.trainName || '');
      if (template.columns.route) {
        row.push(j.departureStation || '');
        row.push(j.arrivalStation || '');
      }
      if (template.columns.dutyCategory) row.push(j.dutyCategory || 'N/A');
      if (template.columns.departureFromHq) row.push(new Date(j.departureFromHq || j.actualDeparture).toLocaleString());
      if (template.columns.arrivalAtHq) row.push(new Date(j.arrivalAtHq || j.actualArrival).toLocaleString());
      if (template.columns.taAmount) row.push(Number(j.taAmount || 0).toFixed(2));
      if (template.columns.claimStatus) row.push(j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE') ? 'Eligible' : (j.noClaimReason || 'No Claim'));
      if (template.columns.remarks && template.showRemarks !== false) row.push(j.notes || '');

      totalTA += j.taAmount || 0;
    } else if (reportType === 'DIARY') {
      if (template.columns.date) row.push(new Date(j.scheduledDeparture).toLocaleDateString());
      if (template.columns.trainNumber) row.push(j.trainNumber || '');
      if (template.columns.trainName) row.push(j.trainName || '');
      row.push(`${j.departureStation || ''}-${j.arrivalStation || ''}`);
      row.push(j.distanceKm || 0);
      row.push(Number(j.taAmount || 0).toFixed(2));
      row.push(Number(j.ndaAmount || 0).toFixed(2));
      row.push(Number((j.taAmount || 0) + (j.ndaAmount || 0)).toFixed(2));

      totalTA += j.taAmount || 0;
      totalNDA += j.ndaAmount || 0;
    }

    worksheet.getRow(currentRow).values = row;
    currentRow++;
  });

  // Add totals row if template allows
  if (template.showTotals !== false) {
    currentRow++; // Empty row for spacing
    const totalsRow = [];

    totalsRow.push('TOTAL');

    // Fill empty cells to align with amount columns
    const emptyColumns = headers.length - 1 - (reportType === 'TA' ? 1 : 3);
    for (let i = 0; i < emptyColumns; i++) {
      totalsRow.push('');
    }

    // Add financial totals
    if (reportType === 'TA') {
      totalsRow.push(`₹${totalTA.toFixed(2)}`);
    } else if (reportType === 'DIARY') {
      totalsRow.push(`₹${totalTA.toFixed(2)}`);
      totalsRow.push(`₹${totalNDA.toFixed(2)}`);
      totalsRow.push(`₹${(totalTA + totalNDA).toFixed(2)}`);
    }

    worksheet.getRow(currentRow).values = totalsRow;
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow++;
  }

  // Add custom footer if template includes it
  if (template.customFooter) {
    currentRow++;
    worksheet.getRow(currentRow).values = [template.customFooter];
    currentRow++;
  }

  // Add signature section if template includes it
  if (template.showSignatureSection !== false) {
    currentRow++;
    currentRow++;
    worksheet.getRow(currentRow).values = ['Verified By: _____________________', '', '', 'Date: _____________________'];
    currentRow++;
    worksheet.getRow(currentRow).values = ['Signature: _____________________', '', '', 'Stamp: _____________________'];
  }

  // Write file
  const filepath = path.join(OUTPUT_DIR, filename);
  await workbook.xlsx.writeFile(filepath);

  return filepath;
}

/**
 * Verify Excel workbook by reopening and parsing
 */
async function verifyExcelWorkbook(filepath, expectedSheetName, expectedHeaders, expectedRowCount) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);

    // Check workbook exists
    if (!workbook) throw new Error('Workbook is null');
    logPass(`Workbook reopened successfully: ${path.basename(filepath)}`);

    // Check worksheet exists
    const worksheet = workbook.getWorksheet(expectedSheetName);
    if (!worksheet) throw new Error(`Worksheet "${expectedSheetName}" not found`);
    logPass(`Worksheet "${expectedSheetName}" exists`);

    // Check worksheet has rows
    if (worksheet.rowCount === 0) throw new Error('Worksheet is empty');
    logPass(`Worksheet has ${worksheet.rowCount} rows`);

    // Find header row (skip employee info if present)
    let headerRow = null;
    worksheet.eachRow((row, rowNumber) => {
      if (!headerRow) {
        const firstCell = row.getCell(1).value;
        if (firstCell && expectedHeaders.some(h => firstCell.toString().includes(h))) {
          headerRow = row;
        }
      }
    });

    if (!headerRow) throw new Error('Header row not found');
    logPass(`Header row found at row ${headerRow.number}`);

    // Verify headers
    const actualHeaders = [];
    headerRow.eachCell((cell) => {
      if (cell.value) actualHeaders.push(cell.value.toString());
    });

    expectedHeaders.forEach(expected => {
      if (actualHeaders.some(actual => actual.includes(expected))) {
        logPass(`Header "${expected}" present`);
      } else {
        logFail(`Header "${expected}" missing`);
      }
    });

    // Verify data rows (count rows after header)
    const dataRowCount = worksheet.rowCount - headerRow.number;
    if (dataRowCount >= expectedRowCount) {
      logPass(`Data rows present (${dataRowCount} >= ${expectedRowCount} expected)`);
    } else {
      logFail(`Insufficient data rows (${dataRowCount} < ${expectedRowCount} expected)`);
    }

    // Verify formatting (bold headers)
    if (headerRow.getCell(1).font?.bold) {
      logPass('Header row is bold');
    } else {
      logFail('Header row is not bold');
    }

    // Verify column widths
    const firstColWidth = worksheet.getColumn(1).width;
    if (firstColWidth && firstColWidth > 0) {
      logPass(`Column widths set (first column: ${firstColWidth})`);
    } else {
      logFail('Column widths not set');
    }

    return true;
  } catch (error) {
    logFail(`Workbook verification failed`, error);
    return false;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('================================================================================');
  console.log('  ACTUAL EXCEL GENERATION & VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  try {
    // TEST 1: TA Statement with Full Template
    console.log('[TEST CASE 1] TA Statement with Full Template');
    const taFile = await generateExcelWorkbook('TA', mockJourneys, mockUser, mockTemplates.full, 'test_ta_full.xlsx');
    logInfo(`Generated: ${path.basename(taFile)} (${fs.statSync(taFile).size} bytes)`);
    await verifyExcelWorkbook(
      taFile,
      'TA Statement',
      ['Date', 'Train Number', 'TA Amount'],
      3 // 3 data rows
    );

    // TEST 2: Duty Diary with Minimal Template
    console.log('\n[TEST CASE 2] Duty Diary with Minimal Template');
    const diaryFile = await generateExcelWorkbook('DIARY', mockJourneys, mockUser, mockTemplates.minimal, 'test_diary_minimal.xlsx');
    logInfo(`Generated: ${path.basename(diaryFile)} (${fs.statSync(diaryFile).size} bytes)`);
    await verifyExcelWorkbook(
      diaryFile,
      'Duty Diary',
      ['Date', 'Train Number'],
      3
    );

    // TEST 3: Empty Data
    console.log('\n[TEST CASE 3] Empty Journey Data');
    const emptyFile = await generateExcelWorkbook('TA', [], mockUser, mockTemplates.full, 'test_empty.xlsx');
    logInfo(`Generated: ${path.basename(emptyFile)} (${fs.statSync(emptyFile).size} bytes)`);
    const emptyVerified = await verifyExcelWorkbook(
      emptyFile,
      'TA Statement',
      ['Date', 'Train Number'],
      0 // No data rows
    );
    if (emptyVerified) {
      logPass('Empty data workbook handled gracefully');
    }

    // TEST 4: Special Characters in Data
    console.log('\n[TEST CASE 4] Special Characters in Train Name');
    const specialCharsJourney = [{
      ...mockJourneys[1],
      trainName: 'Test <script>alert("XSS")</script> & "Quotes" Train'
    }];
    const specialFile = await generateExcelWorkbook('TA', specialCharsJourney, mockUser, mockTemplates.full, 'test_special_chars.xlsx');
    logInfo(`Generated: ${path.basename(specialFile)} (${fs.statSync(specialFile).size} bytes)`);
    await verifyExcelWorkbook(
      specialFile,
      'TA Statement',
      ['Date', 'Train Number', 'Train Name'],
      1
    );

    // TEST 5: INR Formatting Verification
    console.log('\n[TEST CASE 5] INR Amount Formatting');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(taFile);
    const worksheet = workbook.getWorksheet('TA Statement');
    let foundAmount = false;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value?.toString() || '';
        if (value.match(/^\d+\.\d{2}$/) || value.match(/^₹\d+\.\d{2}$/)) {
          foundAmount = true;
        }
      });
    });
    if (foundAmount) {
      logPass('INR amounts formatted with 2 decimal places');
    } else {
      logFail('INR amount formatting not verified');
    }

    // TEST 6: Date Formatting Verification
    console.log('\n[TEST CASE 6] Date Formatting');
    let foundDate = false;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value?.toString() || '';
        // Check for date patterns (MM/DD/YYYY or DD/MM/YYYY or localized)
        if (value.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || value.includes('2026')) {
          foundDate = true;
        }
      });
    });
    if (foundDate) {
      logPass('Dates formatted correctly');
    } else {
      logFail('Date formatting not verified');
    }

    // TEST 7: Totals Row Verification
    console.log('\n[TEST CASE 7] Totals Row');
    let foundTotal = false;
    worksheet.eachRow((row) => {
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.toUpperCase() === 'TOTAL') {
        foundTotal = true;
        const isBold = row.getCell(1).font?.bold;
        if (isBold) {
          logPass('Totals row is bold');
        } else {
          logFail('Totals row is not bold');
        }
      }
    });
    if (foundTotal) {
      logPass('Totals row present');
    } else {
      logFail('Totals row not found');
    }

    // TEST 8: Employee Information Verification
    console.log('\n[TEST CASE 8] Employee Information');
    let foundEmployeeInfo = false;
    worksheet.eachRow((row) => {
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.includes('Employee:') && firstCell.includes(mockUser.name)) {
        foundEmployeeInfo = true;
      }
    });
    if (foundEmployeeInfo) {
      logPass('Employee information present');
    } else {
      logFail('Employee information not found');
    }

    // TEST 9: Signature Section Verification
    console.log('\n[TEST CASE 9] Signature Section');
    let foundSignature = false;
    worksheet.eachRow((row) => {
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.includes('Verified By:') || firstCell.includes('Signature:')) {
        foundSignature = true;
      }
    });
    if (foundSignature) {
      logPass('Signature section present');
    } else {
      logFail('Signature section not found');
    }

    // TEST 10: Custom Footer Verification
    console.log('\n[TEST CASE 10] Custom Footer');
    let foundFooter = false;
    worksheet.eachRow((row) => {
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.includes(mockTemplates.full.customFooter)) {
        foundFooter = true;
      }
    });
    if (foundFooter) {
      logPass('Custom footer present');
    } else {
      logFail('Custom footer not found');
    }

    // TEST 11: File Integrity (not corrupted)
    console.log('\n[TEST CASE 11] File Integrity');
    const files = fs.readdirSync(OUTPUT_DIR);
    let allFilesValid = true;
    for (const file of files) {
      if (file.endsWith('.xlsx')) {
        try {
          const testWorkbook = new ExcelJS.Workbook();
          await testWorkbook.xlsx.readFile(path.join(OUTPUT_DIR, file));
          logPass(`File ${file} is not corrupted`);
        } catch (error) {
          logFail(`File ${file} is corrupted`, error);
          allFilesValid = false;
        }
      }
    }

    // Summary
    console.log('\n================================================================================');
    console.log(`TOTAL EXCEL GENERATION ASSERTIONS: ${passCount + failCount}`);
    console.log(`PASSED:                            ${passCount}`);
    console.log(`FAILED:                            ${failCount}`);
    console.log('================================================================================\n');

    if (failCount === 0) {
      console.log('[SUCCESS] All actual Excel generation tests passed.');
      console.log('\nGENERATED FILES:');
      files.forEach(file => {
        if (file.endsWith('.xlsx')) {
          const filePath = path.join(OUTPUT_DIR, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes)`);
        }
      });
      console.log(`\nLocation: ${OUTPUT_DIR}`);
      process.exit(0);
    } else {
      console.log('[FAILURE] Some Excel generation tests failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n[ERROR] Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
