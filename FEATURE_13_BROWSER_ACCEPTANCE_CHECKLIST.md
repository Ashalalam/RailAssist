# Feature 13: Browser Acceptance Testing Checklist
**Date:** November 9, 2026  
**Feature:** Financial Reporting & Monthly Statement Generation  
**Environment:** Development Server (http://localhost:5173)  
**Test Account:** Isolated test user (NOT production)

---

## Pre-Testing Setup

### 1. Start Development Server
```bash
cd client
npm run dev
```
**Expected:** Server starts on http://localhost:5173

### 2. Create Isolated Test Account
- Navigate to Signup page
- Register new user: `test_f13@railway.test`
- Role: Loco Pilot
- Division: Test Division
- **IMPORTANT:** Do NOT use existing production accounts

### 3. Create Test Data
- Login as test user
- Add 3-5 test journeys with various:
  - Train numbers and names
  - Routes (different stations)
  - Distances (100-1500 km)
  - Night duty hours (0-8 hours)
  - TA/NDA amounts
  - MR numbers (1-2 journeys)
  - Claim statuses (eligible + no-claim)

---

## Test Case A: Financial Dashboard

### A1. Dashboard Visibility
- [ ] Navigate to Reports page
- [ ] Verify "Financial Overview" section displays above report table
- [ ] Dashboard has 4 metric cards visible
- [ ] Dashboard has filter controls (month selector, category, claim status)

**Expected:** Dashboard renders without console errors

### A2. Current Period Metrics
- [ ] Total TA displays with ₹ symbol and 2 decimals
- [ ] Total NDA displays with ₹ symbol and 2 decimals
- [ ] Total MR displays with ₹ symbol and 2 decimals
- [ ] Combined Allowance calculates correctly (TA + NDA + MR)
- [ ] Eligible Duties count displays
- [ ] No-Claim Duties count displays
- [ ] All numbers match test data expectations

**Expected:** Metrics calculate correctly from backend API

### A3. Previous Period Comparison
- [ ] Previous period metrics display below current
- [ ] Trend indicators (↑/↓) show for each metric
- [ ] Percentage changes display correctly
- [ ] Green for positive trends, red for negative

**Expected:** Comparison calculations accurate

### A4. Dashboard Filters
- [ ] Change month selector → metrics update
- [ ] Apply duty category filter → totals recalculate
- [ ] Apply claim status filter (Eligible) → counts update
- [ ] Clear filters → returns to all data

**Expected:** Filters affect both dashboard and report table

### A5. Browser Console
- [ ] Open DevTools Console (F12)
- [ ] Verify NO red errors
- [ ] Verify NO unhandled promise rejections
- [ ] Verify API calls return 200 status

**Expected:** No console errors or warnings

---

## Test Case B: Excel Export

### B1. Excel Export Button
- [ ] Locate "Export Excel (.xlsx)" button in Reports page
- [ ] Button is enabled (not disabled/grayed out)
- [ ] Button has FileSpreadsheet icon
- [ ] Button label clearly says ".xlsx"

**Expected:** Button visible and clickable

### B2. Generate TA Statement (Full Template)
- [ ] Select Report Type: TA
- [ ] Select Month: Current month
- [ ] Select Template: Full template (if available)
- [ ] Click "Export Excel (.xlsx)" button
- [ ] File downloads automatically

**Download Expected:**
- Filename: `RailAssist_TA_Statement_[MONTH].xlsx`
- File size: 7-15 KB (depending on data)

### B3. Open Downloaded File
- [ ] Open file in Microsoft Excel, LibreOffice, or Google Sheets
- [ ] File opens without errors or corruption warnings
- [ ] No password protection or security prompts

**Expected:** File opens successfully

### B4. Verify Workbook Structure
- [ ] Worksheet name: "TA Statement"
- [ ] Single worksheet (no extra sheets)
- [ ] No formulas errors (#REF!, #VALUE!, etc.)

**Expected:** Workbook structure correct

### B5. Verify Employee Information Header
- [ ] Row 1: Employee name, role, division display
- [ ] Row 2: Statement type, period, generated date display
- [ ] Row 3: Empty (spacing)
- [ ] Values match logged-in user details

**Expected:** Employee info accurate

### B6. Verify Column Headers
- [ ] Row 4: Column headers (Date, Train Number, etc.)
- [ ] Headers are bold
- [ ] Headers match selected template columns
- [ ] All expected columns present (check template settings)

**Expected:** Headers formatted and complete

### B7. Verify Data Rows
- [ ] Data starts at Row 5
- [ ] All test journeys present (3-5 rows)
- [ ] No duplicate rows
- [ ] No missing rows

**Expected:** All data exported

### B8. Verify Data Formatting

**Dates:**
- [ ] Dates formatted as locale string (MM/DD/YYYY or DD/MM/YYYY)
- [ ] Dates readable (not Excel serial numbers)
- [ ] Dates match test journey departure dates

**INR Amounts:**
- [ ] TA amounts formatted with 2 decimal places (e.g., 1200.50)
- [ ] NDA amounts formatted with 2 decimal places
- [ ] No missing decimal places (not 1200 or 1200.5)
- [ ] Currency symbol present (₹) or values clearly numeric

**Text Fields:**
- [ ] Train numbers display correctly
- [ ] Train names display correctly (no truncation)
- [ ] Station names display correctly
- [ ] Special characters handled (quotes, ampersands, etc.)

**Expected:** All formatting correct

### B9. Verify Totals Row
- [ ] Totals row present (after data rows)
- [ ] Empty row before totals (spacing)
- [ ] First cell says "TOTAL"
- [ ] Total row is bold
- [ ] TA total calculates correctly (sum of all TA amounts)
- [ ] Total matches dashboard display

**Expected:** Totals accurate and formatted

### B10. Verify Signature Section
- [ ] Two empty rows after totals
- [ ] "Verified By:" row present
- [ ] "Signature:" row present
- [ ] Date field present
- [ ] Stamp field present
- [ ] All fields have underscores for manual completion

**Expected:** Signature section complete

### B11. Verify Custom Footer (if configured)
- [ ] Custom footer text displays
- [ ] Footer text matches template configuration

**Expected:** Footer present if template includes it

### B12. Verify Column Widths
- [ ] Columns are readable width (not too narrow or wide)
- [ ] Train Name column wide enough (~20 characters)
- [ ] Date column not too wide (~12 characters)
- [ ] No text truncated with "..."

**Expected:** Column widths appropriate

### B13. Generate NDA Statement
- [ ] Repeat steps B2-B12 with Report Type: NDA
- [ ] Worksheet name: "NDA Statement"
- [ ] NDA-specific columns: Night Hours, NDA Amount
- [ ] NDA totals calculate correctly

**Expected:** NDA statement generates correctly

### B14. Generate MR Statement
- [ ] Repeat steps B2-B12 with Report Type: MR
- [ ] Worksheet name: "MR Statement"
- [ ] Only journeys with MR numbers included
- [ ] MR-specific columns: MR Number, MR Amount, Remitted At
- [ ] MR totals calculate correctly

**Expected:** MR statement generates correctly

### B15. Generate Duty Diary (Combined)
- [ ] Repeat steps B2-B12 with Report Type: DIARY
- [ ] Worksheet name: "Duty Diary"
- [ ] Combined columns: Date, Train, Route, Distance, TA, NDA, Total
- [ ] All journeys included (not filtered)
- [ ] Total combines TA + NDA

**Expected:** Diary generates correctly

### B16. Test Empty Data
- [ ] Apply filters that result in 0 journeys
- [ ] Click "Export Excel (.xlsx)" button
- [ ] File downloads
- [ ] Open file: Headers present, no data rows, no totals
- [ ] File not corrupted

**Expected:** Empty export handled gracefully

### B17. Test Custom Date Range
- [ ] Enable custom date range mode
- [ ] Set start and end dates
- [ ] Export Excel
- [ ] Verify filename includes date range: `RailAssist_TA_Statement_YYYY-MM-DD_to_YYYY-MM-DD.xlsx`

**Expected:** Custom range works correctly

### B18. Test Template Column Filtering
- [ ] Select template with limited columns (minimal)
- [ ] Export Excel
- [ ] Verify only selected columns present in Excel
- [ ] No unexpected columns

**Expected:** Column filtering works

### B19. Test Special Characters
- [ ] Edit one test journey to include special characters in train name:
  - `Test "Quotes" & Ampersand <Tag>`
- [ ] Export Excel
- [ ] Verify special characters display correctly (not corrupted or escaped)

**Expected:** Special characters handled

### B20. Test Large Data Set
- [ ] Add 20+ test journeys (if possible)
- [ ] Export Excel
- [ ] File downloads (may take 1-2 seconds)
- [ ] All rows present in Excel
- [ ] Totals calculate correctly

**Expected:** Large exports work

---

## Test Case C: PDF/Print Layout

### C1. Print Preview Button
- [ ] Locate "Print/PDF" button in Reports page
- [ ] Button is enabled
- [ ] Button has Printer icon

**Expected:** Button visible

### C2. Print Preview Modal
- [ ] Click "Print/PDF" button
- [ ] Print preview modal/window displays
- [ ] Modal shows full report content

**Expected:** Preview renders

### C3. Print Layout Content
- [ ] Statement title prominent
- [ ] Employee details visible (name, role, division)
- [ ] Statement metadata (type, period, generated date)
- [ ] Table with all journeys
- [ ] Totals row visible
- [ ] Signature section visible (if enabled)

**Expected:** All content present

### C4. Print Layout Formatting
- [ ] Table fits page width (no horizontal scroll)
- [ ] Rows are readable (not cramped)
- [ ] Font size appropriate (not too small)
- [ ] Column headers visible

**Expected:** Layout professional

### C5. Print Hide CSS
- [ ] Verify navigation bar hidden in print preview
- [ ] Verify sidebar hidden
- [ ] Verify filters/controls hidden
- [ ] Verify export buttons hidden
- [ ] Only report content visible

**Expected:** UI elements hidden in print

### C6. Browser Print Dialog
- [ ] Press Ctrl+P (Windows) or Cmd+P (Mac)
- [ ] Browser print dialog opens
- [ ] Print preview shows report only (no UI)
- [ ] Page breaks logical (not mid-row)

**Expected:** Browser print works

### C7. Test Portrait Orientation
- [ ] Select template with portrait orientation
- [ ] Open print preview
- [ ] Verify layout fits portrait page

**Expected:** Portrait works

### C8. Test Landscape Orientation
- [ ] Select template with landscape orientation
- [ ] Open print preview
- [ ] Verify layout fits landscape page
- [ ] More columns visible than portrait

**Expected:** Landscape works

### C9. Test Page Breaks
- [ ] Add enough data for multiple pages (20+ rows)
- [ ] Open print preview
- [ ] Verify page breaks don't split rows
- [ ] Headers repeat on each page (if browser supports)

**Expected:** Page breaks logical

### C10. Close Print Preview
- [ ] Close print preview modal
- [ ] Returns to Reports page
- [ ] No modal overlay stuck on screen

**Expected:** Modal closes cleanly

---

## Test Case D: Regression Testing

### D1. Dashboard KPIs
- [ ] Navigate to Dashboard (home)
- [ ] Verify Total Distance KPI displays
- [ ] Verify Night Duty Allowance KPI displays
- [ ] Verify Travel Allowance KPI displays
- [ ] All KPIs show numeric values (not NaN or undefined)

**Expected:** Dashboard KPIs work

### D2. Journeys List
- [ ] Navigate to Journeys page
- [ ] Verify journey list displays
- [ ] Verify all test journeys visible
- [ ] Click a journey row → journey details display

**Expected:** Journeys page works

### D3. Journey Form
- [ ] Click "Add Journey" button
- [ ] Form displays
- [ ] Fill out all fields
- [ ] Click "Save" button
- [ ] Journey saves successfully
- [ ] New journey appears in list

**Expected:** Journey creation works

### D4. CSV Export
- [ ] Navigate to Reports page
- [ ] Click "Export CSV" button
- [ ] CSV file downloads
- [ ] Open CSV: Data present and formatted

**Expected:** CSV export works

### D5. Template Selection
- [ ] Navigate to Reports page
- [ ] Change template dropdown
- [ ] Verify table columns change to match template
- [ ] Export Excel → verify columns match

**Expected:** Template selection works

### D6. Month Selection
- [ ] Navigate to Reports page
- [ ] Change month dropdown
- [ ] Verify report table updates with selected month's data
- [ ] Verify dashboard metrics update

**Expected:** Month selection works

### D7. Filter Application
- [ ] Apply duty category filter
- [ ] Verify table filters to selected category
- [ ] Apply claim status filter
- [ ] Verify table filters to selected status
- [ ] Clear filters
- [ ] Verify all data returns

**Expected:** Filters work

### D8. Offline Indicator
- [ ] Disconnect network (turn off Wi-Fi or disable network in DevTools)
- [ ] Verify offline indicator banner displays
- [ ] Reconnect network
- [ ] Verify offline indicator disappears

**Expected:** Offline detection works

### D9. Navigation
- [ ] Click sidebar navigation links
- [ ] Verify correct pages load
- [ ] Click bottom navigation (if mobile view)
- [ ] Verify navigation works

**Expected:** Navigation functional

### D10. Logout
- [ ] Click Logout button (user menu or sidebar)
- [ ] Verify redirected to Login page
- [ ] Verify can re-login with test account

**Expected:** Logout works

---

## Test Case E: Browser Console Monitoring

### E1. Console Errors
- [ ] Keep DevTools Console open during all tests
- [ ] Monitor for red error messages
- [ ] Monitor for yellow warnings (acceptable for deprecations)
- [ ] Document any errors found

**Expected:** No critical errors (red)

### E2. Network Requests
- [ ] Open DevTools Network tab
- [ ] Click "Export Excel (.xlsx)" button
- [ ] Verify NO network request made (lazy-loaded module only)
- [ ] Navigate to Reports page
- [ ] Verify `/api/journeys/summary` returns 200 OK
- [ ] Verify response contains financial totals

**Expected:** API calls successful, ExcelJS lazy-loaded

### E3. JavaScript Errors
- [ ] Check for `Uncaught TypeError`
- [ ] Check for `Uncaught ReferenceError`
- [ ] Check for `Promise rejection`
- [ ] Check for `ExcelJS is not defined`

**Expected:** No JavaScript errors

### E4. Memory Leaks (Optional)
- [ ] Open DevTools Performance tab
- [ ] Export Excel 5-10 times in a row
- [ ] Take memory snapshot
- [ ] Verify memory doesn't grow unbounded

**Expected:** No significant memory leaks

---

## Data Safety Verification

### Safety Checklist
- [ ] All tests performed on isolated test account
- [ ] NO production user data accessed
- [ ] NO database seeders run during testing
- [ ] NO IndexedDB/LocalStorage cleared manually
- [ ] NO sync operations triggered on existing data
- [ ] NO historical journeys modified
- [ ] Test journeys created have unique identifiers
- [ ] Test account can be safely deleted after testing

**Critical:** If ANY data safety rule violated, STOP TESTING and document incident.

---

## Pass/Fail Criteria

### PASS Criteria (Release Verified ✅)
- [ ] All Test Case A (Dashboard) steps PASS
- [ ] All Test Case B (Excel Export) steps PASS (at least B1-B12, B16-B19)
- [ ] All Test Case C (Print/PDF) steps PASS (at least C1-C5)
- [ ] All Test Case D (Regression) steps PASS
- [ ] Test Case E (Console) has NO critical errors
- [ ] Data Safety Verification: 100% compliant
- [ ] At least 4 Excel files generated and verified
- [ ] Zero critical bugs found

**Result:** **RELEASE VERIFIED** → Approve for production

### ACCEPTABLE WITH DOCUMENTED RISK (⚠️)
- [ ] Minor UI issues (alignment, spacing) that don't block functionality
- [ ] 1-2 non-critical warnings in console
- [ ] Optional features not working (custom footer, landscape orientation)
- [ ] Performance acceptable (Excel export < 3 seconds for 20 rows)

**Result:** **RELEASE WITH DOCUMENTED RISK** → Approve with known issues documented

### FAIL Criteria (Not Ready ❌)
- [ ] Excel export fails or corrupts files
- [ ] Data mismatch between dashboard and Excel
- [ ] Critical console errors (ExcelJS undefined, API 500)
- [ ] Financial calculations incorrect
- [ ] Data safety violations
- [ ] Existing features broken (journeys, dashboard)
- [ ] Cannot complete 50% of test steps

**Result:** **NOT READY FOR RELEASE** → Fix critical issues and re-test

---

## Test Results Documentation

### Test Execution Details
- **Date:** ___________________________
- **Tester:** ___________________________
- **Browser:** _________________________ (Chrome, Firefox, Edge)
- **Browser Version:** _________________
- **Operating System:** _________________
- **Test Account:** _____________________
- **Test Duration:** ____________________ minutes

### Test Case Results
| Test Case | Steps Completed | Steps Passed | Steps Failed | Critical Issues |
|-----------|-----------------|--------------|--------------|-----------------|
| A. Dashboard | ___/23 | ___/23 | ___/23 | ___ |
| B. Excel Export | ___/72 | ___/72 | ___/72 | ___ |
| C. Print/PDF | ___/10 | ___/10 | ___/10 | ___ |
| D. Regression | ___/10 | ___/10 | ___/10 | ___ |
| E. Console | ___/4 | ___/4 | ___/4 | ___ |
| **TOTAL** | **___/119** | **___/119** | **___/119** | **___** |

### Issues Found
1. ___________________________________________________________________
2. ___________________________________________________________________
3. ___________________________________________________________________

### Final Decision
- [ ] **RELEASE VERIFIED** ✅ (All tests pass, no critical issues)
- [ ] **RELEASE WITH DOCUMENTED RISK** ⚠️ (Minor issues acceptable)
- [ ] **NOT READY FOR RELEASE** ❌ (Critical issues found)

**Justification:**  
___________________________________________________________________  
___________________________________________________________________  
___________________________________________________________________

---

## Notes

**Browser Automation Alternative:**
If browser automation tools (Puppeteer, Playwright, Selenium) are available:
- Automate Test Cases A-D
- Capture screenshots at each step
- Generate automated test report
- Still perform manual verification of Excel file content

**Manual Testing Required:**
- Excel file opening and content verification (B3-B12)
- Print layout visual inspection (C3-C9)
- Special characters display (B19)
- Large data set performance (B20)

**Testing Time Estimate:**
- Test Case A: 10 minutes
- Test Case B: 25 minutes (main effort)
- Test Case C: 10 minutes
- Test Case D: 10 minutes
- Test Case E: 5 minutes
- **Total: 60 minutes**

**Recommended Testing Order:**
1. E (Console monitoring) - keep open throughout
2. D (Regression) - ensure baseline functionality
3. A (Dashboard) - verify metrics
4. B (Excel Export) - main feature
5. C (Print/PDF) - visual verification

---

**END OF CHECKLIST**
