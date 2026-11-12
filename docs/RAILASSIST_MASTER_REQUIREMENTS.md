# RAILASSIST — CONSOLIDATED MASTER REQUIREMENTS SPECIFICATION

**Document:** `docs/RAILASSIST_MASTER_REQUIREMENTS.md`  
**Project:** RailAssist (Offline-First Railway Employee Platform)  
**Workspace Root:** `C:\Users\ashal\.gemini\antigravity\scratch\railassist`  
**Document Generated:** 2026-11-05  
**Version:** 2.1 (Updated with Confirmed User Decisions & Pending Requirements Section)  
**Audit Sources:** Historical User Prompts (0–49), Screenshot Directives, System Architecture, Codebase AST  
**Strict Scope Rule:** Requirements documentation only. No application source code, databases, or storage modified.

---

## EXECUTIVE SUMMARY

This document serves as the authoritative, consolidated master requirements specification for the **RailAssist** platform. It integrates:
1. All initial architectural and functional requirements from project inception (Prompts 0–1, 2026-06-15).
2. Advanced AI, OCR, and voice logging capabilities discussed in June 2026 (Prompts 4–7).
3. Enterprise UI/UX design, terminology overhauls, and table standards established in June 2026 (Prompts 31–34).
4. Screenshot-derived requirements for extended Employee Profiles, "My Stations" management, Account Menu items, About page specifications, and Money Receipt (MR) statement workflows.
5. Confirmed architectural decisions on Support Contacts, Conditional Model fields, Money Receipt (MR) tripartite fields, and Dual-Credential Account Deletion safeguards.

Every requirement in this specification is explicitly attributed to its source (Historical User Prompt or Screenshot Directive), categorized by technical tier, and mapped to its underlying database models, API routes, and frontend views.

---

## 1. CONFIRMED ARCHITECTURAL DECISIONS & DECISION LOG

The following formal decisions have been confirmed by the user and are permanently recorded in this specification:

| Decision ID | Domain Area | Decision Summary & Technical Scope | Decision Status |
| :--- | :--- | :--- | :---: |
| **DEC-01** | **Support Contacts** | WhatsApp support contact and Support email must be marked as **Pending User-Provided Official Details**. Both channels must be completely configurable via environment variables (`VITE_SUPPORT_WHATSAPP`, `VITE_SUPPORT_EMAIL`) or dynamic app config. Under no circumstances should contact details be copied from RailLog or invented with dummy production values. | **Confirmed / Pending Config** |
| **DEC-02** | **Conditional Model Field** | The `model` field in the Employee Profile must be **conditional based on employee designation/role**. For running crew (Loco Pilot, Assistant Loco Pilot), it must support locomotive/traction equipment classes (e.g. WAP-7, WAG-9, EMU, Diesel/Electric). For commercial staff (TTE, TC), guards, station superintendents, or inspectors, it must support relevant domain categories (e.g. Squad/Link/Cadre or remain hidden/optional). Locomotive models must **never** be forced on non-running staff. Specific designation-specific options are marked as pending clarification. | **Confirmed / Clarification Pending** |
| **DEC-03** | **Money Receipt (MR) Tripartite Fields** | All three remittance fields are mandatory across data models, backend APIs, offline storage/sync, duty form inputs, and MR statement generation:<br>1. **MR Number** (`mrNumber`): Cash remittance receipt number.<br>2. **MR Amount** (`mrAmount`): Cash collected from excess fares/penalties (₹).<br>3. **Remitted At Station** (`remittedAtStation`): Station code where funds were deposited. | **Confirmed** |
| **DEC-04** | **Dual-Credential Account Deletion** | Self-service account deletion strictly requires **BOTH**:<br>1. Current account password verification (`bcrypt.compare`).<br>2. Exact typed confirmation phrase: `DELETE MY ACCOUNT`.<br>Enforces secure cascading deletion (purging journeys, reports, templates, followed by the user document), strict multi-tenant authorization (`req.user.id`), audit log creation (`USER_ACCOUNT_DELETED`) prior to purge, and explicit confirmation/error feedback. | **Confirmed** |

---

## 2. REQUIREMENT CLASSIFICATION SYSTEM

Every requirement across both master documents is evaluated against the following standardized criteria:

| Code | Status Label | Technical Definition |
| :---: | :--- | :--- |
| **A** | **Fully Implemented & Verified** | Code is complete across frontend, backend, and database; verified with passing automated test assertions. |
| **B** | **Implemented (Needs Functional Verification)** | Code is implemented in both frontend and backend, but lacks comprehensive end-to-end browser/user interaction testing. |
| **C** | **Partially Implemented** | Subset of functionality exists (e.g., backend API exists but frontend is unwired, or form exists but misses key fields). |
| **D** | **UI Stub Only** | User interface element exists (e.g. sidebar navigation link), but triggers a placeholder `alert()` or dummy modal with no backing route or logic. |
| **E** | **Not Implemented** | Feature was explicitly requested or discussed, but zero code, routes, schemas, or UI components exist. |
| **F** | **Needs Clarification** | Requirement contains domain ambiguities or operational definitions needing user confirmation before building. |

---

## 3. CONSOLIDATED MASTER REQUIREMENTS CHECKLIST

### MODULE 1: EXTENDED EMPLOYEE PROFILE & "MY STATIONS" MANAGEMENT

*Source: Screenshot-Derived Directive (2026-11-05)*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **PRF-01** | **Full Name & Designation:** Capture employee full name and railway designation (e.g. Senior Travelling Ticket Examiner, Loco Pilot Mail/Express, Station Superintendent). | Screenshot | Explicit User Req | **C** | `client/src/pages/Profile.jsx`, `server/models/User.js`, `server/index.js` (`PUT /api/auth/profile`) |
| **PRF-02** | **Conditional Operating Model & Branch:** Capture railway operating model/equipment conditional on designation/role (e.g., Traction/Locomotive class for Loco Pilots / ALPs; Link/Cadre for TTE/TC commercial staff; designation options pending clarification; not forced on all staff) and department/branch (Operating, Commercial, Mechanical, Electrical, Civil, Signal & Telecom). | Screenshot & DEC-02 | Explicit User Req | **E** | `server/models/User.js`, `client/src/pages/Profile.jsx`, `RailAssistDB.profile` |
| **PRF-03** | **Zone & Division:** Store official Railway Zone (e.g. WR, CR, NR, SR, ECoR) and Division Code (e.g. BCT, BB, DLI, HWH). | Screenshot & Prompt 1, 33 | Explicit User Req | **C** | `server/models/User.js`, `server/models/Division.js`, `client/src/components/Sidebar.jsx` |
| **PRF-04** | **HQ Station Code:** Store officer's permanent Headquarters station code (e.g., `MMCT`, `NDLS`, `BBS`) used as default home-absence origin. | Screenshot | Explicit User Req | **E** | `server/models/User.js`, `client/src/pages/Profile.jsx`, `client/src/pages/JourneyForm.jsx` |
| **PRF-05** | **Pay Hierarchy (Level, Basic Pay, Pay Scale, Grade Pay):** Store 7th/6th CPC financial parameters: Pay Level (Level 1–14), Basic Pay (₹), Pay Scale (band range), and Grade Pay (₹). | Screenshot | Explicit User Req | **E** | `server/models/User.js`, `client/src/pages/Profile.jsx`, `server/models/AllowanceRule.js` |
| **PRF-06** | **Administrative Metadata (Bill Unit Number, Date of Appointment):** Store Railway Bill Unit Number (salary ledger allocation code) and Date of Joining/Appointment. | Screenshot | Explicit User Req | **E** | `server/models/User.js`, `client/src/pages/Profile.jsx` |
| **PRF-07** | **"My Stations" Management:** Dedicated UI management allowing running staff to add, view, and remove frequently visited station codes (e.g., `MMCT`, `BVI`, `ST`, `BRC`, `NDLS`). | Screenshot | Explicit User Req | **E** | `server/models/User.js`, `client/src/pages/Profile.jsx`, `RailAssistDB.profile` |
| **PRF-08** | **Profile Form Population:** Auto-populate saved profile attributes (HQ code, designation, division, zone, bill unit, pay level) into Duty Log forms and Monthly Statement headers. | Screenshot & Prompt 33 | Explicit User Req | **C** | `client/src/pages/JourneyForm.jsx`, `client/src/pages/Reports.jsx` |
| **PRF-09** | **"My Stations" Quick Selection Chips:** Render saved "My Stations" as quick-tap suggestion chips in "From Station", "To Station", and "Remitted At Station" inputs. | Screenshot | Explicit User Req | **E** | `client/src/pages/JourneyForm.jsx`, `client/src/services/db.js` |

---

### MODULE 2: ACCOUNT MENU & APPLICATION NAVIGATION

*Source: Screenshot-Derived Directive (2026-11-05) & Prompt 32*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **ACC-01** | **Home Navigation Action:** Direct navigation trigger redirecting users to the main operational Dashboard (`/`). | Screenshot | Explicit User Req | **A** | `client/src/components/Sidebar.jsx`, `client/src/components/BottomNav.jsx` |
| **ACC-02** | **Profile Navigation Action:** Direct navigation trigger opening the employee credentials and profile management page (`/profile`). | Screenshot | Explicit User Req | **A** | `client/src/pages/Settings.jsx`, `client/src/App.jsx` |
| **ACC-03** | **Share App Action:** Functional action invoking the native Web Share API (`navigator.share({ title, text, url })`) on supported mobile devices, with automatic clipboard copy fallback on desktop. | Screenshot | Explicit User Req | **E** | `client/src/pages/Settings.jsx` or Account Menu component |
| **ACC-04** | **About Navigation Action:** Direct navigation trigger opening the official About RailAssist information screen (`/about`). | Screenshot | Explicit User Req | **E** | `client/src/pages/About.jsx`, `client/src/App.jsx`, `client/src/components/Sidebar.jsx` |
| **ACC-05** | **Privacy Policy Navigation Action:** Direct navigation trigger opening the official Privacy Policy and data governance view (`/privacy-policy`). | Screenshot | Explicit User Req | **E** | `client/src/pages/PrivacyPolicy.jsx`, `client/src/App.jsx` |
| **ACC-06** | **Self-Service Delete Account Action:** Functional user account deletion modal requiring BOTH current account password verification AND exact typed confirmation phrase `DELETE MY ACCOUNT`. Cascading deletion across user journeys, templates, reports, and user document, with audit logging and client IndexedDB purge. | Screenshot & DEC-04 | Explicit User Req | **E** | `client/src/pages/Profile.jsx`, `server/index.js` (`POST /api/auth/delete-account`) |

---

### MODULE 3: ABOUT SCREEN, DISCLAIMERS & SUPPORT CHANNELS

*Source: Screenshot-Derived Directive (2026-11-05)*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **ABT-01** | **Application Overview & Mission:** Comprehensive description explaining RailAssist's offline-first architecture for Indian Railways running personnel. | Screenshot | Explicit User Req | **E** | `client/src/pages/About.jsx` |
| **ABT-02** | **Key Features Showcase:** Card grid highlighting Daily Diary, Automated Allowances (TA/NDA/MR), Offline Sync, and AI Document Parser. | Screenshot | Explicit User Req | **E** | `client/src/pages/About.jsx` |
| **ABT-03** | **Independent Application Disclaimer:** Prominent official disclaimer stating that RailAssist is an independent utility application built for railway personnel and is not officially affiliated with or endorsed by the Ministry of Railways / CRIS / IRCTC. | Screenshot | Explicit User Req | **E** | `client/src/pages/About.jsx` |
| **ABT-04** | **Semantic Version Display:** Dynamic rendering of current build version, bundle timestamp, and PWA Service Worker cache version. | Screenshot | Explicit User Req | **E** | `client/src/pages/About.jsx`, `client/package.json` |
| **ABT-05** | **WhatsApp Direct Support Channel:** Configurable WhatsApp support action linking to `https://wa.me/<number>` with pre-filled support query template. (Status: Configurable; pending user-provided official phone number; no RailLog data copied). | Screenshot & DEC-01 | Explicit User Req | **E** | `client/src/pages/About.jsx` |
| **ABT-06** | **Email Direct Support Channel:** Configurable `mailto:` support link pre-populating support subject, user division, and app version. (Status: Configurable; pending user-provided official email address; no RailLog data copied). | Screenshot & DEC-01 | Explicit User Req | **E** | `client/src/pages/About.jsx` |

---

### MODULE 4: STATEMENTS & REPORTS GENERATION (TA, NDA, DIARY, MR)

*Source: Historical Prompts 1, 34 & Screenshot-Derived Directive*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REP-01** | **Travelling Allowance (TA) Statement:** Monthly compilation calculating 24h absence blocks and 7th CPC remainder slabs (30%, 70%, 100%) by employee role daily rate. | Prompt 1, 34 | Explicit User Req | **A** | `client/src/pages/Reports.jsx`, `server/models/AllowanceRule.js`, `@shared/railwayCalculations.js` |
| **REP-02** | **Night Duty Allowance (NDA) Statement:** Monthly compilation calculating elapsed duty hours between 22:00 and 06:00 IST in 5-minute increments multiplied by role hourly rate. | Prompt 1, 34 | Explicit User Req | **A** | `client/src/pages/Reports.jsx`, `server/index.js`, `@shared/railwayCalculations.js` |
| **REP-03** | **Daily Duty Diary Statement:** Monthly tabular chronological summary of all shifts worked, train numbers, stations, delays, and duty notes. | Prompt 1, 34 & Screenshot | Explicit User Req | **A** | `client/src/pages/Reports.jsx`, `server/models/ReportHistory.js` |
| **REP-04** | **Money Receipt (MR) Remittance Statement:** Generation of monthly cash remittance statement for commercial staff / TTEs, aggregating all three remittance fields: MR Number (`mrNumber`), Remittance Amount (`mrAmount`), and Remitted At Station (`remittedAtStation`), with monthly total cash sum, printable cashier receipt layout, and CSV export. | Screenshot & DEC-03 | Explicit User Req | **E** | `server/models/Journey.js`, `server/models/ReportHistory.js`, `client/src/pages/Reports.jsx` |
| **REP-05** | **Pre-Submission Compliance Audit:** Deterministic verification of negative durations, overlapping shifts, and station continuity with health score and Gemini explanations. | Prompt 5, 34 | Explicit User Req | **A** | `server/routes/aiAudit.js`, `server/controllers/aiAuditController.js`, `client/src/pages/Reports.jsx` |
| **REP-06** | **Spreadsheet Export (CSV):** Deterministic client-side generation and downloading of UTF-8 CSV files matching selected statement type (including MR statements). | Prompt 1, DEC-03 | Explicit User Req | **A** | `client/src/pages/Reports.jsx` (`handleExportCSV`) |
| **REP-07** | **Print Preview Container:** High-contrast CSS `@media print` container formatted to standard A4 printable sheets with officer and cashier signature blocks. | Prompt 1, 34 | Explicit User Req | **A** | `client/src/pages/Reports.jsx` (`PrintPreviewContainer`) |
| **REP-08** | **Server-Side Binary PDF Generation:** Generating an official, downloadable `.pdf` binary file compiled on the server without relying exclusively on client browser print dialogs. | Prompt 1 | Explicit User Req | **E** | `server/routes/reports.js`, `server/controllers/reportController.js` |
| **REP-09** | **Statement Archival & History:** Storing compiled statements in `ReportHistory` collection and IndexedDB `reports` store for historical re-download. | Prompt 1, 2.3 | Explicit User Req | **A** | `server/models/ReportHistory.js`, `client/src/services/db.js` |

---

### MODULE 5: DUTY LOGGING, STATIONS & CORE CRUD

*Source: Historical Prompts 0, 1, 16, 32, 34 & Screenshot Directives*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DTY-01** | **Shift Creation & Editing:** Form inputs for train number, train name, departure station, arrival station, departure/arrival timestamps (scheduled and actual), distance (km), and remarks. | Prompt 1, 16 | Explicit User Req | **A** | `client/src/pages/JourneyForm.jsx`, `server/models/Journey.js`, `server/index.js` |
| **DTY-02** | **Remittance Details (`remittedAtStation`, `mrNumber`, `mrAmount`):** Duty log fields allowing commercial staff / TTEs to record remittance station code, money receipt number, and collected cash amount for excess fare/penalty receipts. | Screenshot & DEC-03 | Explicit User Req | **E** | `server/models/Journey.js`, `client/src/pages/JourneyForm.jsx`, `client/src/pages/Journeys.jsx` |
| **DTY-03** | **Train Autocomplete & Auto-Populate:** Typing train number queries train directory and automatically fills train name, from station, to station, and distance in km. | Prompt 1, 16 | Explicit User Req | **A** | `client/src/pages/JourneyForm.jsx`, `server/index.js` (`GET /api/trains?q=`) |
| **DTY-04** | **Multi-Tenant Scoped Data Isolation:** Strict enforcement ensuring running officers can only view, edit, or delete their own duty records (`{ userId: req.user.id }`). | Prompt 1, Phase 2.3 | Explicit User Req | **A** | `server/index.js`, `server/repositories/JourneyRepository.js` |
| **DTY-05** | **Stripe/GitHub Style Table:** Duty logs table with sticky headers, multi-column sorting (Date, Train, Distance, Allowances), free-text search, sync filter, and pagination. | Prompt 34 | Explicit User Req | **A** | `client/src/pages/Journeys.jsx` |
| **DTY-06** | **Server-Side Query Pagination:** Paginated query parameters (`?page=1&limit=20`) on `GET /api/journeys` to prevent mobile memory bloat over years of duty records. | Prompt 34, Phase 1 Audit | Recommendation | **E** | `server/index.js` (`GET /api/journeys`), `client/src/contexts/JourneyContext.jsx` |
| **DTY-07** | **Keyboard Shortcuts (Ctrl+N):** Global keyboard shortcut listener opening New Duty Form instantly. | Prompt 32 | Explicit User Req | **A** | `client/src/pages/Dashboard.jsx` |
| **DTY-08** | **Station Directory Management:** Searchable directory of railway stations with zone/division/type filters, pagination, station detail views, admin CRUD operations (create/update/deactivate), audit logging, and offline IndexedDB caching for quick station lookup. | Feature 11 | Explicit User Req | **B** | `server/models/Station.js`, `server/controllers/stationController.js`, `server/routes/stations.js`, `client/src/pages/StationDirectory.jsx`, `client/src/services/db.js` |
| **DTY-09** | **Station Autocomplete Integration:** Reusable StationAutocomplete component integrated into JourneyForm (departure/arrival/remittedAt), Roster form (departure/arrival), with online API search and offline IndexedDB fallback, keyboard navigation, and explicit selection required. Maintains backward compatibility with free-text station names. | Feature 12 | Explicit User Req | **B** | `client/src/components/StationAutocomplete.jsx`, `client/src/pages/JourneyForm.jsx`, `client/src/pages/Roster.jsx` |
| **DTY-10** | **My Stations Management:** Visual management interface in Profile page allowing users to add/remove frequently used station codes with StationAutocomplete picker, displayed as dismissible badge chips. Replaces comma-separated text input with structured array storage. | Feature 12 | Explicit User Req | **B** | `client/src/pages/Profile.jsx`, `server/models/User.js` (myStations field) |
| **DTY-11** | **Station OCR/Voice Enhancement:** Enhanced OCR and Voice modules with station name matching, suggestion confirmation, and disambiguation for improved duty logging accuracy. Includes stationMatcher.js utility with exact/fuzzy/batch matching, inline confirmation UI for ambiguous matches, and original text preservation. | Feature 12 Phase 2 | Explicit User Req | **B** | `client/src/utils/stationMatcher.js`, `client/src/pages/JourneyForm.jsx` (OCR/Voice handlers, confirmation UI) |

---

### MODULE 6: OFFLINE-FIRST PWA, INDEXEDDB & SYNCHRONIZATION

*Source: Historical Prompts 0, 1, 6, Phase 2.5*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **PWA-01** | **Offline Duty Logging:** Seamless duty creation, editing, and deletion while offline, persisting records to IndexedDB `RailAssistDB` v3. | Prompt 0, 1 | Explicit User Req | **A** | `client/src/services/db.js`, `client/src/contexts/JourneyContext.jsx` |
| **PWA-02** | **Client-Generated `localId` UUIDs:** UUIDs generated client-side to ensure zero document collisions when multiple offline duties sync to MongoDB Atlas. | Prompt 1, Phase 2.3 | Explicit User Req | **A** | `client/src/contexts/JourneyContext.jsx`, `server/models/Journey.js` |
| **PWA-03** | **Idempotent Batch Cloud Sync:** Batch push of offline queued items (`pending_create`, `pending_update`, `pending_delete`) serializing all journey fields including `remittedAtStation`, `mrNumber`, and `mrAmount` upon network reconnection. | Prompt 0, Phase 2.3, DEC-03 | Explicit User Req | **A** | `server/index.js` (`POST /api/journeys/sync`), `JourneyContext.jsx` |
| **PWA-04** | **Cache API Method Safety:** Service worker strictly filters `event.request.method === 'GET'` before caching, avoiding Cache API rejections on POST/PUT requests. | Phase 2.5 Audit | Recommendation | **A** | `client/public/sw.js` |
| **PWA-05** | **Offline SPA Navigation Catch-All:** Service Worker navigation handler serving cached `/index.html` on network disconnection. | Phase 2.5 Audit | Recommendation | **A** | `client/public/sw.js` |
| **PWA-06** | **Build-Time Workbox Precache Manifest:** Automated injection of hashed production chunk URLs into Service Worker during `vite build` for 100% upfront offline reliability. | Prompt 0, Phase 2.5 Audit | Explicit User Req / Rec | **E** | `client/vite.config.js`, `client/public/sw.js` |
| **PWA-07** | **Offline Binary Photo Queuing:** Storing captured duty slip photos as raw Blobs in IndexedDB `photos` store and uploading via multipart upon reconnection. | Prompt 6 | Explicit User Req | **A** | `client/src/services/db.js`, `client/src/contexts/JourneyContext.jsx` |

---

### MODULE 7: AI AUTOMATION & SMART WORKFLOWS

*Source: Historical Prompts 4, 5, 6, 7*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **AI-01** | **Smart Duty Slip OCR Parser:** Vision AI extracting train number, stations, departure/arrival timestamps, coach, and duty type from physical slips. | Prompt 5, 6 | Explicit User Req | **B** | `server/routes/aiOcr.js`, `server/workers/ocrWorker.js`, `client/src/pages/JourneyForm.jsx` |
| **AI-02** | **Voice Journey Logging Transcription:** Speech-to-text recording duty remarks into structured notes. | Prompt 5 | Explicit User Req | **C** | `client/src/pages/JourneyForm.jsx` (`webkitSpeechRecognition`) |
| **AI-03** | **Voice Natural Language Intent Parsing:** AI parsing of transcribed speech (e.g. "Started at Vizag 5:30 PM") into discrete form fields. | Prompt 5, 6 | Explicit User Req | **C** | `server/routes/aiVoice.js` *(Backend ready; Unwired to frontend)* |
| **AI-04** | **RAG AI Copilot Assistant:** In-app chat modal grounded in user's MongoDB shift logs with analytical responses and client navigation actions. | Prompt 5, 6, 7 | Explicit User Req | **A** | `client/src/components/AIChatModal.jsx`, `server/routes/aiChat.js` |
| **AI-05** | **Smart Form Context Suggestions:** Predicting previous coaches, return leg journeys, and historical duty habits. | Prompt 5 | Explicit User Req | **E** | `client/src/pages/JourneyForm.jsx` |
| **AI-06** | **Delay Reason Prediction:** Heuristic or AI prediction of operational delay causes (signals, crossings, track maintenance). | Prompt 5, 6 | Explicit User Req | **E** | `server/routes/aiPrediction.js` |
| **AI-07** | **Intelligent Proactive Reminders:** Background engine alerting users to missing sign-offs or pending monthly statements. | Prompt 5 | Explicit User Req | **E** | `client/src/pages/Notifications.jsx`, `client/public/sw.js` |

---

### MODULE 8: SIDEBAR NAVIGATION & SUBSCRIPTION BUSINESS

*Source: Historical Prompts 1, 32, 34*

| Req ID | Requirement Description | Source | Type | Status | Affected Components |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **NAV-01** | **Duty Roster View (`/calendar`):** Monthly roster calendar view showing scheduled shifts, rest days, and off-duty periods. | Prompt 32, 34 | Explicit User Req | **D** | `client/src/components/Sidebar.jsx` *(Currently UI stub alert)* |
| **NAV-02** | **Allowances Matrix Screen (`/allowances`):** Interactive screen displaying official 7th CPC daily TA rates and hourly NDA rates across all 9 railway roles. | Prompt 32 | Explicit User Req | **D** | `client/src/components/Sidebar.jsx` *(Currently UI stub alert)* |
| **NAV-03** | **Train Directory Screen (`/train-directory`):** Searchable browsing interface for Indian Railways train schedules, distances, and station stops. | Prompt 32, 34 | Explicit User Req | **D** | `client/src/components/Sidebar.jsx` *(Currently UI stub alert)* |
| **NAV-04** | **Statement Templates Screen (`/templates`):** Standalone interface for saving, editing, and applying recurring shift templates. | Prompt 32, 34 | Explicit User Req | **D** | `client/src/components/Sidebar.jsx` *(Currently UI stub alert)* |
| **NAV-05** | **Admin Analytics Console (`/admin/analytics`):** System-wide analytics screen for administrators showing divisional disbursement trends. | Prompt 1 | Explicit User Req | **E** | `client/src/pages/admin/` |
| **NAV-06** | **Commercial Subscriptions & Gating:** Integration of payment gateway (Razorpay/Stripe) and tier restriction enforcement. | Prompt 1 | Explicit User Req | **C** | `server/models/Subscription.js`, `server/models/User.js` |

---

## 4. ADDITIONAL USER REQUIREMENTS – PENDING

> [!IMPORTANT]
> **Scope Notice:** The 57 requirements cataloged above represent the verified baseline of historical user requests (Prompts 0–49) and initial screenshot-derived directives. **They do not constitute the final or complete application scope.**
> 
> The user has indicated that additional features and operational workflows will be provided in subsequent project stages. All existing requirements remain strictly preserved without deletion, unwarranted merging, or silent modification.

The following additional requirement placeholders are established to receive forthcoming specifications:

| Pending ID | Anticipated Domain / Category | Description / Scope Placeholder | Status |
| :--- | :--- | :--- | :---: |
| **ADD-PEND-01** | **Official Support Contact Details** | Specific WhatsApp support telephone number and official support email address to be provided by the user. | Pending User Input |
| **ADD-PEND-02** | **Role-Specific Model Option Sets** | Granular designation-to-model mapping options for Commercial Staff, Operating Staff, and Supervisors. | Pending User Input |
| **ADD-PEND-03** | **Future Operational Workflows** | Additional features, validation rules, statement formats, and integrations to be specified by the user. | Pending User Input |
