# Feature 13: Financial Reporting — Codebase Inspection Report

**Date:** November 9, 2026  
**Purpose:** Document existing financial reporting implementation before Feature 13 enhancements

---

## EXISTING IMPLEMENTATION ANALYSIS

### 1. Journey Model (server/models/Journey.js)

**Financial Fields Present:**
- `taAmount` (Number, default: 0) - Traveling Allowance
- `ndaAmount` (Number, default: 0) - Night Duty Allowance
- `nightDutyHours` (Number, default: 0) - Hours worked 22:00-06:00 IST
- `distanceKm` (Number, default: 0)
- `delayMinutes` (Number, default: 0)

**MR Management Fields (Feature 02):**
- `mrNumber` (String) - Money Remittance tracking number
- `mrAmount` (Number, min: 0) - Amount remitted in INR
- `remittedAtStation` (String) - Station code where MR was remitted
- `hasClaim` (Boolean, default: true) - Eligibility for claims

**Claim Status Fields (Feature 03):**
- `noClaimReason` (String, enum: NONE, CL, CR, HQRS, LAP, LHAP, NH, PL, REST, SCL, OTHER)
- `dutyCategory` (String, enum: TICKET_CHECKING, ON_DUTY, STATION_DUTY, PF_CHECK, OTHER)
- `ndaEligible` (Boolean, default: true) - NDA eligibility flag

**Indexes:**
- `{ userId: 1, scheduledDeparture: -1 }` - Dashboard queries
- `{ userId: 1, localId: 1 }` - Unique, offline sync idempotency
- `{ userId: 1, actualDeparture: 1 }` - Timeline queries

**Status:** ✅ Complete financial data model

---

### 2. Calculation Engine (server/utils/calculations.js)

**Functions Available:**

#### `parseAsIST(input)`
- Safely parses dates as Indian Standard Time (UTC+05:30)
- Handles timezone-less inputs (HTML datetime-local)
- Prevents double timezone conversion
- Returns JavaScript Date object

#### `calculateNightDutyHours(start, end)`
- **Rules:** Night duty window: 22:00 IST to 06:00 IST
- Handles multi-day shifts
- Handles partial-hour overlaps
- Returns hours rounded to 2 decimals
- **Status:** ✅ Production-tested timezone-agnostic logic

#### `calculateTA(start, end, dailyRate = 800)`
- **Rules:** Indian Railways 7th Pay Commission slabs
  - ≤6 hours: 30% of daily rate
  - >6 and ≤12 hours: 70% of daily rate
  - >12 hours: 100% of daily rate
  - Each complete 24-hour block: 100% of daily rate
- Returns amount rounded to 2 decimals
- **Status:** ✅ Production-ready

#### `calculateNDA(nightDutyHours, hourlyRate = 180)`
- Simple multiplication: hours × rate
- Returns amount rounded to 2 decimals
- **Status:** ✅ Production-ready

**Constants:**
- `IST_OFFSET_MINUTES` = 330 (UTC+05:30)
- `IST_OFFSET_MS` = 19,800,000 ms

**Status:** ✅ Complete, tested, timezone-safe calculation engine

---

### 3. AllowanceRule Model (server/models/AllowanceRule.js)

**Fields:**
- `role` (String, required, unique) - Railway staff role enum
- `taDailyRate` (Number, required, default: 800) - TA per day in INR
- `ndaHourlyRate` (Number, required, default: 200) - NDA per hour in INR (Note: Code shows 180, model shows 200)
- `updatedAt` (Date, default: Date.now)

**Supported Roles:**
- TTE, TC, Guard, Loco Pilot, Assistant Loco Pilot, Station Master, Commercial Inspector, Chief Ticket Inspector, Railway Supervisor

**Status:** ✅ Role-based allowance configuration exists

**⚠️ Discrepancy Found:**
- Model default: `ndaHourlyRate: 200`
- Calculation function default: `hourlyRate = 180`
- Server journey creation uses rule value correctly

---

### 4. Journey API Endpoints (server/index.js)

**Existing Endpoints:**

#### `GET /api/journeys` (Line 581)
- **Auth:** Required (authenticateToken)
- **Scope:** User's own journeys only (`userId: req.user.id`)
- **Sort:** `scheduledDeparture: -1` (descending)
- **Returns:** Array of Journey documents
- **Status:** ✅ Functional

#### `POST /api/journeys` (Line 591)
- **Auth:** Required
- **Logic:**
  - Fetches user's AllowanceRule by role
  - Calculates `nightDutyHours` via `calculateNightDutyHours()`
  - Respects `ndaEligible` flag (Feature 03)
  - Calculates `ndaAmount` (conditional on eligibility)
  - Calculates `taAmount` via `calculateTA()`
  - Uses `departureFromHq`/`arrivalAtHq` if provided, else falls back to actual times
- **Returns:** Created Journey document
- **Status:** ✅ Calculation logic integrated

#### `PUT /api/journeys/:id` (Line 629)
- **Auth:** Required + user scope
- **Logic:** Recalculates TA/NDA on update
- **Returns:** Updated Journey document
- **Status:** ✅ Functional

#### `DELETE /api/journeys/:id` (Line 662)
- **Auth:** Required + user scope
- **Returns:** Success message
- **Status:** ✅ Functional

#### `POST /api/journeys/sync` (Line 709)
- **Auth:** Required
- **Purpose:** Batch sync offline journeys
- **Logic:** Idempotent sync using `{ userId, localId }` unique index
- **Calculations:** Performed for each journey during sync
- **Returns:** `{ created, updated, skipped }`
- **Status:** ✅ Functional

**⚠️ Gap:** No dedicated financial aggregation endpoint for reports

---

### 5. StatementTemplate Model (server/models/StatementTemplate.js)

**Fields:**
- `userId` (ObjectId, required)
- `templateName` (String, required)
- `statementType` (String, enum: TA, NDA, DIARY, COMBINED, MR)
- `isDefault` (Boolean, default: false)
- `selectedColumns` (Array of Strings, default: [])
- `columnOrder` (Array of Strings, default: [])
- `groupByCategory` (Boolean, default: false)
- `groupByTrain` (Boolean, default: false)
- `showEmployeeInfo` (Boolean, default: true)
- `showSignatureSection` (Boolean, default: true)
- `showSummaryTotals` (Boolean, default: true)
- `showRemarks` (Boolean, default: true)
- `pageOrientation` (String, enum: portrait, landscape, default: portrait)
- `fontSize` (String, enum: small, medium, large, default: medium)
- `customHeader` (String, default: '')
- `customFooter` (String, default: '')
- `localId` (String, unique, sparse)
- `syncStatus` (String, enum: synced, pending)

**Hooks:**
- `pre('save')` - Ensures only one default template per type per user

**Indexes:**
- `{ userId: 1 }`
- `{ userId: 1, isDefault: 1 }`
- `{ userId: 1, statementType: 1 }`

**Status:** ✅ Complete template configuration model (Feature 07)

---

### 6. Reports Page (client/src/pages/Reports.jsx)

**Existing Features:**

#### State Management:
- `selectedMonth` - Month filter (YYYY-MM format)
- `reportType` - TA | NDA | DIARY | MR
- `showPreview` - Toggle print preview
- `templates` - Array of user templates
- `selectedTemplate` - Active template
- `auditResult` - Compliance audit results
- `matchingJourneys` - Filtered journeys for selected month
- `totalTA`, `totalNDA`, `totalNightHours`, `totalMR`, `mrCount` - Aggregated totals

#### Financial Calculation Logic (Lines 53-72):
```javascript
const filtered = journeys.filter(j => {
  const depDate = new Date(j.scheduledDeparture);
  const monthStr = depDate.toISOString().substring(0, 7);
  return monthStr === selectedMonth;
});

// Only calculate allowances for claim-eligible journeys
const claimEligible = filtered.filter(j => 
  j.hasClaim !== false && 
  (!j.noClaimReason || j.noClaimReason === 'NONE')
);

const taSum = claimEligible.reduce((sum, j) => sum + (j.taAmount || 0), 0);
const ndaSum = claimEligible.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);
const nightSum = claimEligible.reduce((sum, j) => sum + (j.nightDutyHours || 0), 0);
const mrSum = filtered.reduce((sum, j) => sum + (j.mrAmount || 0), 0);
const mrCountSum = filtered.filter(j => j.mrNumber && j.mrNumber.trim() !== '').length;
```

**Status:** ✅ Correct claim eligibility filtering, ✅ MR includes all journeys

#### Template Integration:
- Loads templates via `api.statementTemplates.getAll()`
- Auto-selects default template for report type
- `shouldShowColumn(columnId)` helper checks template column selection
- Template affects CSV export column visibility

**Status:** ✅ Feature 07 template integration present

#### Export Functionality:

**CSV Export (`handleExportCSV`):**
- ✅ Respects template column selection
- ✅ Separate logic for TA, NDA, MR, DIARY types
- ✅ Filters MR export to journeys with `mrNumber`
- ✅ Removes commas from text fields
- ✅ Filename: `RailAssist_{TYPE}_Statement_{YYYY-MM}.csv`
- **Status:** ✅ Functional CSV export

**Print/PDF (`handlePrintPDF`):**
- Uses `window.print()`
- CSS print media styles apply
- Preview container has `print-landscape` class support
- **Status:** ✅ Browser print dialog functional

#### Report History:
- Displays `reports` array from JourneyContext
- Shows: compiled date, month, filename, amount
- Click Eye icon to reload report parameters
- **Status:** ✅ History log exists

#### Compliance Audit:
- Calls `runAuditReport(selectedMonth)` on mount and when month/journeys change
- Displays health score percentage
- Shows AI explanation and warnings
- Warns if health score < 70%
- **Status:** ✅ AI-powered audit integration (Feature 08)

#### Print Preview Block:
- Full document header with Indian Railways branding
- Employee info section (name, role, division, emp number, bill unit, date range)
- Statement type-specific tables with configurable columns
- Summary totals section
- Signature section
- Custom header/footer from template
- **Status:** ⏳ Partially visible (content truncated in inspection)

**Gaps Identified:**
- ❌ No Excel (.xlsx) export (only CSV)
- ❌ No custom date range selector (only month picker)
- ❌ No duty category filter
- ❌ No designation filter for admin users
- ❌ No financial dashboard summary view (current month vs previous month)
- ❌ No month-wise trends visualization
- ❌ No reconciliation view showing individual duty breakdown
- ❌ No validation that template settings affect print output

---

### 7. JourneyContext (client/src/contexts/JourneyContext.jsx)

**Inferred Methods:**
- `saveReportToHistory(reportPayload)` - Saves generated report to IndexedDB
- `runAuditReport(month)` - Triggers compliance audit via AI
- `reports` state - Array of historical reports
- `journeys` state - Array of user journeys

**Status:** ✅ Context provides reports and audit functionality

---

### 8. IndexedDB Schema (client/src/services/db.js)

**Stores:**
- `journeys` (keyPath: `localId`)
- `templates` (keyPath: `id`)
- `reports` (keyPath: `id`)
- `rules` (keyPath: `role`)
- `profile` (keyPath: `key`)
- `photos` (keyPath: `id`)
- `trains` (keyPath: `number`)
- `rosters` (keyPath: `localId`)
- `statementTemplates` (keyPath: `localId`)
- `stations` (keyPath: `code`)

**DB Version:** 6

**Status:** ✅ Reports store exists for offline caching

---

### 9. API Service (client/src/services/api.js)

**Journey Endpoints:**
- `journeys.getAll()` → GET `/api/journeys`
- `journeys.create(data)` → POST `/api/journeys`
- `journeys.update(id, data)` → PUT `/api/journeys/:id`
- `journeys.delete(id)` → DELETE `/api/journeys/:id`
- `journeys.sync(journeys)` → POST `/api/journeys/sync`

**Reports Endpoints:**
- `reports.getAll()` → GET `/api/reports`
- `reports.create(data)` → POST `/api/reports`

**Status:** ✅ Journey APIs functional, ⚠️ Reports API endpoints need backend implementation

---

## SUMMARY: EXISTING VS REQUIRED FUNCTIONALITY

### ✅ COMPLETE
1. **Journey financial data model** - taAmount, ndaAmount, nightDutyHours, MR fields
2. **TA/NDA calculation engine** - Timezone-safe, IST-enforced, tested
3. **AllowanceRule configuration** - Role-based rates
4. **Journey CRUD APIs** - Create, read, update, delete with calculations
5. **Batch sync API** - Offline sync with idempotency
6. **StatementTemplate model** - Complete Feature 07 implementation
7. **Reports page UI** - Month filter, report type selector, template selector, CSV export, print preview
8. **Compliance audit** - AI-powered health score and warnings
9. **Claim eligibility filtering** - Respects `hasClaim` and `noClaimReason` fields
10. **IndexedDB offline support** - Reports store exists

### ⚠️ PARTIALLY COMPLETE
1. **Print preview** - Exists but content truncated in inspection (needs verification)
2. **Template application to output** - CSV respects templates, print preview needs verification
3. **Report history** - UI exists, backend `/api/reports` endpoints need implementation

### ❌ MISSING (Feature 13 Requirements)
1. **Financial dashboard** - Current month summary, previous month summary, trends
2. **Custom date range selector** - Only month picker exists
3. **Duty category filter** - Not implemented
4. **Designation filter** - Not implemented (admin access to other users' reports)
5. **Financial aggregation API** - No dedicated endpoint for monthly/date-range totals
6. **Monthly reconciliation view** - No drill-down to individual duties contributing to totals
7. **Excel (.xlsx) export** - Only CSV available
8. **Combined financial statement** - No TA+NDA+MR combined report type
9. **Month-wise trends visualization** - Not implemented
10. **Empty state handling** - Basic handling, needs improvement
11. **Automated tests** - No dedicated Feature 13 test suite

---

## RECOMMENDATIONS FOR FEATURE 13 IMPLEMENTATION

### Priority 1: Backend APIs
1. Create `/api/reports/summary` endpoint for financial aggregations
2. Implement `/api/reports` GET/POST endpoints (currently referenced but not implemented)
3. Add date range query parameters to journey filtering

### Priority 2: Financial Dashboard
1. Create `FinancialSummary` component displaying current/previous month totals
2. Add month-wise trends chart (line/bar chart)
3. Display duty count trends
4. Add KPI cards for TA, NDA, MR totals

### Priority 3: Enhanced Filtering
1. Add date range picker (start date, end date)
2. Add duty category multi-select filter
3. Add claim status filter (eligible, no-claim, specific reasons)

### Priority 4: Reconciliation View
1. Create expandable totals showing journey breakdown
2. Add drill-down from summary to individual journeys
3. Highlight discrepancies or unusual values

### Priority 5: Export Enhancements
1. Implement Excel (.xlsx) export using a library (e.g., SheetJS, ExcelJS)
2. Validate print preview rendering matches requirements
3. Add PDF download via print-to-PDF or library

### Priority 6: Testing
1. Create Feature 13 test suite
2. Test TA/NDA/MR calculation accuracy
3. Test claim eligibility filtering
4. Test IST date boundary handling
5. Test export file content validation
6. Test offline report caching

---

## CRITICAL SAFETY RULES

✅ **DO NOT:**
- Run seeders against `railassist` database
- Reset or clear existing databases
- Delete existing Journey records
- Modify historical financial data
- Invent Indian Railways official rates or rules
- Change existing calculation logic without regression tests
- Create duplicate calculation systems

✅ **DO:**
- Reuse existing `calculateTA()`, `calculateNDA()`, `calculateNightDutyHours()`
- Fetch AllowanceRule from database for rates
- Preserve `hasClaim` and `noClaimReason` filtering logic
- Use isolated test database for write tests
- Document any calculation limitations
- Verify exports contain expected data

---

**Inspection Completed:** November 9, 2026  
**Next Phase:** Implementation of Feature 13 enhancements
