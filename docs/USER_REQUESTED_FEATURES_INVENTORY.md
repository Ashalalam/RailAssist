# RAILASSIST — USER REQUESTED FEATURES & REQUIREMENTS INVENTORY

**Project:** RailAssist (Offline-First Railway Employee Platform)  
**Workspace Path:** `C:\Users\ashal\.gemini\antigravity\scratch\railassist`  
**Document Generated:** 2026-11-05  
**Audit Source:** Project Transcripts (Prompts 0 to 49), Source Code, Schema Definitions, and Architectural Reports  

---

## EXECUTIVE SUMMARY

This document provides a comprehensive, non-destructive audit of **every feature, workflow, schema requirement, UI specification, and architectural pattern** explicitly requested or discussed by the project owner across the history of the RailAssist platform.

Every entry is categorized strictly according to its real implementation state in the active codebase as of Phase 2.5 (`master` commit `52bc36e`), clearly separating what is fully functional, what is partial or mocked, and what remains discussed but unbuilt.

---

## 1. EVERY ADDITIONAL FEATURE EXPLICITLY REQUESTED

Below is the complete inventory of all features and modules explicitly requested by the user, cross-referenced with prompt indices and timestamps:

### 1.1 Core PWA & Offline-First Foundation (Prompts 0 & 1 — 2026-06-15)
- **Installable PWA Application:** Installable on Android, iOS, Windows, and desktop browsers with "Add to Home Screen" support, Web App Manifest, app icons, and splash screens.
- **Offline-First Storage Architecture:** Local-first data entry with IndexedDB caching (`RailAssistDB`) as the offline cache/sync layer, backed by MongoDB Atlas as the primary cloud database.
- **Mobile-First Native Experience:** Bottom navigation bar, touch-friendly large tap targets, optimized for railway employees on mobile devices in real-world running conditions.
- **Service Worker Lifecycle:** Cache-first app shell strategy, dynamic API caching, and background sync when network connectivity restores.
- **Cross-Platform Future Packaging:** Architecture structured to allow conversion to React Native (Android/iOS) and Electron (Desktop) without major rewrites.

### 1.2 Enterprise Railway Domain & Authentication (Prompt 1 — 2026-06-15)
- **Official Railway Roles (9 Designated Roles):**
  1. TTE (Traveling Ticket Examiner)
  2. TC (Ticket Collector)
  3. Guard
  4. Loco Pilot
  5. Assistant Loco Pilot
  6. Station Master
  7. Commercial Inspector
  8. Chief Ticket Inspector
  9. Railway Supervisor
- **Enterprise Database Models:**
  - `User`: Roles, divisions, hashed credentials, subscription metadata.
  - `Journey`: Full shift parameters, timestamps, calculated allowances, `localId`.
  - `AllowanceRule`: TA daily rates and NDA hourly rates per employee role.
  - `Train`: Catalog for lookup and distance autocomplete.
  - `Division`: Railway division codes and zones.
  - `ReportHistory`: Archive of compiled monthly statements.
  - `JourneyTemplate`: Frequently operated recurring routes.
  - `Subscription`: Commercial tier tracking.
  - `AuditLog`: Immutable security and operations audit trail.

### 1.3 Reports & Allowance Statements Module (Prompt 1 — 2026-06-15)
- **Dedicated Reports Screen (`src/pages/Reports.jsx`):**
  - Generate Travelling Allowance (TA) Statement.
  - Generate Night Duty Allowance (NDA) Statement.
  - Monthly Journey Diary.
  - Export PDF format.
  - Export Excel / CSV format.
  - Print Preview container.
- **Authoritative Allowance Calculations (7th Pay Commission Rules):**
  - TA evaluated on 24h absence duration plus remainder slabs ($\le 6\text{h} \to 30\%$, $6\text{h}\text{--}12\text{h} \to 70\%$, $> 12\text{h} \to 100\%$).
  - NDA evaluated in 5-minute increments within the 22:00–06:00 IST window at role-specific hourly rates.

### 1.4 Admin & Operations Management (Prompt 1 — 2026-06-15)
- **Admin Dashboard (`src/pages/admin/Dashboard.jsx`):** System metrics, financial disbursements, average delay tracking.
- **Admin Users Console (`src/pages/admin/Users.jsx`):** Directory, role elevation, employee deletion.
- **Admin Analytics Console (`src/pages/admin/Analytics.jsx`):** System-wide analytics and trends.

### 1.5 AI-Powered Capabilities (Prompts 4, 5, 6, 7 — 2026-06-26)
- **📸 Smart Duty Slip Parser:** Optical character recognition of paper sign-on/sign-off duty slips via Gemini Vision, extracting train number, stations, departure/arrival timestamps, coach, and duty type with confidence scoring.
- **🎤 Voice Journey Logging:** Spoken duty notes transcription and structured natural language field extraction (e.g., "Started duty at Vizag 5:30 PM" $\to$ Station: VSKP, Time: 17:30).
- **🧠 Smart Form Completion:** Auto-suggesting route, stations, distance, and coaches upon entering a train number.
- **🛡️ AI Claim Validation & Compliance Audit:** Deterministic pre-submission checks (negative durations, shift overlaps, station sequence gaps) paired with Gemini-generated plain-language explanations and a percentage Health Score.
- **🤖 RAG AI Copilot Assistant:** In-app floating chat copilot grounded in the user's historical shift logs from MongoDB, equipped with an action protocol to navigate to `/reports`, `/journeys/new`, or `/analytics`.
- **Binary Blob Image Pipeline:** Avoid Base64 overhead by storing raw image Blobs in IndexedDB and transmitting via `multipart/form-data`.
- **Modular AI Backend Architecture:** Dedicated routes (`aiOcr.js`, `aiVoice.js`, `aiChat.js`, `aiAudit.js`), controllers, services, repositories, and prompt registries.

### 1.6 Enterprise UI/UX Refinement (Prompts 31, 32, 33, 34 — 2026-06-30)
- **Design System:** Dark slate aesthetic inspired by Stripe, Linear, Notion, Vercel (`#0B0F17` background, `#131722` surface, `#1B2232` elevated cards; Indigo, Emerald, Amber, Rose accents; zero neon/glowing effects).
- **Authentic Railway Terminology:**
  - Journey Logs $\to$ **Duty Logs**
  - Reports $\to$ **Monthly Statements**
  - Analytics $\to$ **Performance Overview**
  - Calendar $\to$ **Duty Roster**
  - Templates $\to$ **Statement Templates**
  - Capture Sign-On $\to$ **Snap / Upload Slip**
- **Stripe/GitHub-Style Data Tables:** Sticky headers, multi-column sorting (Date, Train, Distance, Claims), inline search, sync-state filters, and pagination.
- **Dynamic Contextual Details:** Time-based greeting (Good Morning / Afternoon / Evening), user profile division and zone badges, real database-driven charts.
- **PWA Polish:** Loading skeleton placeholders, offline status banners, sync indicators, retry triggers, and keyboard shortcuts (`Ctrl+N` for New Duty Log).

---

## 2. FEATURES DISCUSSED BUT NOT YET IMPLEMENTED

These features were explicitly specified or agreed upon during project planning and reviews, but no functional screen, route, or backend service currently exists in the codebase:

| Feature / Requirement | Original Request / Context | Current Implementation State | Missing Elements |
| :--- | :--- | :--- | :--- |
| **Admin Analytics Screen (`admin/Analytics.jsx`)** | Prompt 1 explicitly listed `src/pages/admin/Analytics.jsx` as part of the admin management suite. | **Not Created.** Directory `client/src/pages/admin/` contains only `Dashboard.jsx` and `Users.jsx`. | Frontend view component, route `/admin/analytics`, and aggregate analytics API. |
| **Duty Roster / Calendar View (`/calendar`)** | Prompts 32 & 34 requested a dedicated "Duty Calendar" / "Duty Roster" screen. | **UI Stub.** Clicking in `Sidebar.jsx` executes: `alert('Duty Roster is under construction.')`. | Calendar UI component, route `/calendar`, and monthly schedule visualization. |
| **Allowances Matrix Screen (`/allowances`)** | Prompt 32 requested an "Allowances Matrix" screen showing 7th CPC rate tables. | **UI Stub.** Clicking in `Sidebar.jsx` executes: `alert('Allowances Matrix is under construction.')`. | Frontend allowances table/editor view. (Backend `GET /api/rules` exists). |
| **Official Train Directory Screen (`/train-directory`)** | Prompts 32 & 34 requested a searchable "Train Directory" view. | **UI Stub.** Clicking in `Sidebar.jsx` executes: `alert('Official Train Directory is under construction.')`. | Directory browsing UI and route `/train-directory`. (Backend `GET /api/trains?q=` exists). |
| **Statement Templates Screen (`/templates`)** | Prompts 32 & 34 requested a "Statement Templates" management page. | **UI Stub.** Clicking in `Sidebar.jsx` executes: `alert('Statement Templates are under construction.')`. | UI screen for creating/managing recurring templates. (Backend `/api/templates` CRUD exists). |
| **Help & Documentation Center (`/help`)** | Prompt 32 requested a dedicated "Help" screen. | **UI Stub.** Clicking in `Sidebar.jsx` executes: `alert('RailAssist Enterprise Documentation: Contact Support Master.')`. | Help center documentation screen and route `/help`. |
| **Delay Reason Prediction (`aiPrediction.js`)** | Prompts 5 & 6 discussed predicting operational delay causes (signal failure, locomotive defects, crossing). | **Not Implemented.** No route, controller, or ML/heuristic model exists in `server/routes/`. | `server/routes/aiPrediction.js`, controller, prompt template, and UI badge. |
| **Intelligent Reminders Engine** | Prompt 5 discussed background offline-capable reminders ("Forgot to sign off", "Pending June TA claim"). | **Not Implemented.** `Notifications.jsx` contains only static demo switches. | Background cron/scheduler, offline notification triggers, and missing duty detector. |
| **Server-Side Compiled Binary PDF Generation** | Prompt 1 highlighted "Export PDF... The PDF feature is the reason users will pay." | **Not Implemented.** PDFs are generated solely via client-side `window.print()` browser print preview. | Headless server PDF generator (e.g., Puppeteer, PDFKit, or jsPDF server-side) delivering signed binary PDFs. |
| **WebPush / VAPID Server Push Infrastructure** | Prompts 0 & 5 required push notifications for duty alerts and report deadlines. | **Not Implemented.** No `web-push` library, no VAPID keys in `server/.env`, and no `PushSubscription` database collection. | Backend push sender, VAPID key pairs, and subscription registration endpoint. |
| **Payment Gateway & Subscription Upgrade Workflow** | Prompt 1 discussed a commercial subscription business model (`Subscription` model created). | **Not Implemented.** Model exists in schema, but no payment gateway (Razorpay/Stripe) or plan upgrade UI is integrated. | Payment gateway SDK, webhook handler, and tier restriction enforcement. |
| **Mobile / Desktop App Shell Packaging** | Prompt 0 specified architecture should support conversion to React Native (Android/iOS) and Electron. | **Not Implemented.** Application exists exclusively as a browser-based PWA. | Capacitor, React Native, or Electron wrapper projects. |

---

## 3. FEATURES IMPLEMENTED PARTIALLY

These features have real code written across frontend or backend, but only partial functionality is complete, leaving key user-facing aspects unfinished:

### 3.1 🎤 Voice Journey Logging
- **What is Implemented:**
  - Client: `JourneyForm.jsx#L94-L125` initializes browser `webkitSpeechRecognition`. Spoken voice input is converted to text and appended to the `notes` textarea.
  - Server: `server/routes/aiVoice.js` and `server/controllers/aiVoiceController.js` exist with `voicePrompt.js` configured to parse natural language strings into structured JSON.
- **What is Missing / Broken:**
  - **The frontend never calls the backend API.** Spoken text is dumped into the raw `notes` textarea. The AI intent parsing pipeline (`POST /api/ai/voice/parse`) is completely disconnected from the UI form fields.

### 3.2 🧠 Smart Form Autocomplete & Contextual Suggestion
- **What is Implemented:**
  - Entering a train number (e.g., `12951`) queries `GET /api/trains?q=12951` and automatically populates `departureStation`, `arrivalStation`, and `distanceKm`.
- **What is Missing / Broken:**
  - The requested "GitHub Copilot for railway forms" capabilities (Prompt 5)—such as auto-suggesting previously checked coaches (e.g., `A1-A3`), inferring shift start times from historical duty logs, or predicting the return leg of a round trip—were never built.

### 3.3 📸 Smart Duty Slip Parser
- **What is Implemented:**
  - Multer multipart file upload (`POST /api/ai/ocr/upload`) queues an asynchronous background task in `ocrWorker.js`.
  - Gemini Vision API extracts duty slip attributes and returns per-field confidence scores.
  - Polling endpoint (`GET /api/ai/ocr/status/:jobId`) reports progress, and `JourneyForm.jsx` auto-fills fields having $\ge 80\%$ confidence.
  - Offline images are preserved as binary Blobs in IndexedDB `photos` store.
- **What is Missing / Broken:**
  - In-memory `ocrWorker.js` queue is volatile: all active/pending jobs are wiped if the server restarts.
  - Camera hardware scanning (viewfinder streaming with automatic document boundary detection) is not implemented; it relies solely on standard file picker inputs (`<input type="file">`).

### 3.4 Notifications Center (`Notifications.jsx`)
- **What is Implemented:**
  - UI page exists with toggles for Duty Reminders, Allowance Alerts, Sync Notifications, and Report Deadlines.
  - A "Test Push Dispatch" button triggers a simulated notification via `setTimeout(3000)`.
- **What is Missing / Broken:**
  - Preference toggles exist only in local React component state; they are not saved to the database or `localStorage` and reset on page reload.
  - No server-side notification dispatcher exists.

### 3.5 Commercial Subscriptions
- **What is Implemented:**
  - `User.subscriptionTier` ('Free', 'Premium', 'Enterprise') and `User.subscriptionStatus` ('Active', 'Trial', 'Expired') exist on user models.
  - `Subscription` schema exists with compound index (`userId: 1, status: 1`).
- **What is Missing / Broken:**
  - No upgrade buttons, pricing tables, payment integrations, or feature gating exist in the UI. All accounts function with full access regardless of subscription tier.

---

## 4. FEATURES IMPLEMENTED BUT NOT FULLY FUNCTIONAL

These features are deployed and active, but contain operational gaps, edge-case limitations, or architectural caveats:

### 4.1 PWA Dynamic Chunk Loading While Fully Offline
- **Current Behavior:**
  - The core app shell (`index.html`, `logo.svg`, `manifest.json`) is precached during Service Worker install.
  - In Phase 2.4, route-level code splitting (`React.lazy`) separated heavy routes (`Analytics-*.js`, `Reports-*.js`, `react-apexcharts-*.js`).
  - Dynamic chunks are cached at runtime upon first visit.
- **Operational Flaw:**
  - If an employee opens the application for the first time while offline and attempts to navigate to a page they **never visited while connected to the internet**, the SPA shell renders, but dynamic script loading fails. Full offline reliability requires build-time Workbox precaching.

### 4.2 PDF Statement Export in `Reports.jsx`
- **Current Behavior:**
  - Clicking "Export PDF" executes `window.print()` targeting an `@media print` CSS container.
- **Operational Flaw:**
  - On mobile devices (Android/iOS Chrome), `window.print()` behavior is inconsistent across browsers and often formats poorly or fails to download a standalone `.pdf` file to the device's downloads folder.

### 4.3 Duty Logbook Query Scalability (Server-Side Pagination)
- **Current Behavior:**
  - `GET /api/journeys` returns every journey document associated with the authenticated user in a single unpaginated array.
  - Pagination (10 items per page) is handled entirely in client-side React memory in `Journeys.jsx`.
- **Operational Flaw:**
  - Over multiple years of railway service (hundreds or thousands of shifts), downloading the entire duty history on initial load will cause mobile bandwidth and memory degradation.

---

## 5. REQUIREMENTS NOT REFLECTED IN CURRENT APPLICATION

The following specific requirements and design guidelines were noted in user requests but have not yet been incorporated into the production build:

1. **Absence Boundaries for Home Station Calculations:**
   - The `Journey` model contains `departureFromHq` and `arrivalAtHq`. However, form inputs in `JourneyForm.jsx` automatically set these to journey departure and arrival, omitting true home-to-station transit time tracking.
2. **Dynamic Division to Zone Resolution:**
   - Prompt 33 requested that Railway Zone badges be resolved dynamically from the authenticated user's profile and database.
   - Currently, `Sidebar.jsx` and `Dashboard.jsx` resolve Railway Zones via a hardcoded client-side switch statement (`BCT -> Western Railway`, `BB -> Central Railway`, etc.) rather than querying the `Division` collection.
3. **Automated Production Precache Manifest:**
   - Prompt 0 requested automated PWA precaching. `sw.js` currently relies on a manually maintained static array of strings (`ASSETS_TO_CACHE`).
4. **Offline Roster Synchronization:**
   - Offline sync currently syncs `journeys`, `templates`, and `reports`. There is no synchronization pipeline for duty rosters or roster modifications.

---

## 6. IMPORTANT WORKFLOWS, FIELDS, VALIDATIONS & INTEGRATIONS SPECIFIED

For fast reference during future phases, the exact technical rules, database fields, and validation logic specified across all user requests are codified below:

### 6.1 Shift Journey Data Schema
```typescript
interface JourneyRecord {
  userId: ObjectId;                     // Reference to User
  localId: string;                      // Client-generated UUID for offline conflict resolution
  trainNumber: string;                  // e.g., "12951"
  trainName: string;                    // e.g., "Mumbai Rajdhani Express"
  departureStation: string;             // 3-4 letter IR station code (e.g., "MMCT")
  arrivalStation: string;               // 3-4 letter IR station code (e.g., "NDLS")
  scheduledDeparture: Date;             // Timetable departure
  scheduledArrival: Date;               // Timetable arrival
  actualDeparture: Date;                // Actual sign-on / departure
  actualArrival: Date;                  // Actual sign-off / arrival
  departureFromHq?: Date;               // Departure from home station (TA absence start)
  arrivalAtHq?: Date;                   // Return to home station (TA absence end)
  distanceKm: number;                   // Distance traveled
  delayMinutes: number;                 // Calculated delay at destination
  taAmount: number;                     // Computed Travelling Allowance (₹)
  ndaAmount: number;                    // Computed Night Duty Allowance (₹)
  nightDutyHours: number;               // Elapsed hours between 22:00 and 06:00 IST
  notes?: string;                       // Voice dictation remarks / operational notes
  syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}
```

### 6.2 7th Pay Commission Allowance Rules Engine
1. **Travelling Allowance (TA):**
   $$\text{Absence Hours} = \frac{\text{arrivalAtHq} - \text{departureFromHq}}{3,600,000}$$
   - Completed 24-hour periods: $\lfloor \text{days} \rfloor \times \text{taDailyRate}$
   - Fractional remainder hours ($H$):
     - $H \le 6\text{h} \implies 30\% \times \text{taDailyRate}$
     - $6\text{h} < H \le 12\text{h} \implies 70\% \times \text{taDailyRate}$
     - $H > 12\text{h} \implies 100\% \times \text{taDailyRate}$
2. **Night Duty Allowance (NDA):**
   - Window: Evaluated exclusively between **22:00 IST and 06:00 IST** (normalized to UTC+5:30).
   - Stepping: Evaluated in 5-minute discrete intervals.
   - Formula:
     $$\text{NDA Amount} = \text{nightDutyHours} \times \text{ndaHourlyRate}$$

### 6.3 Offline-First Synchronization Protocol
```
[User Action in Offline Mode]
       │
       ▼
Write to IndexedDB ('RailAssistDB' v3)
Tagged: syncStatus = 'pending_create' | 'pending_update' | 'pending_delete'
       │
       ▼
[Browser Event: 'online' / App Reconnection]
       │
       ├─► Step 1: Flush 'pending_delete' records -> DELETE /api/journeys/:id
       │
       ├─► Step 2: Batch 'pending_create' & 'pending_update' -> POST /api/journeys/sync
       │            │
       │            └─► Server recalculates TA & NDA against authoritative rules
       │                Upserts by { userId, localId } (Idempotent duplicate prevention)
       │
       ├─► Step 3: Server returns synchronized records with persistent MongoDB _id
       │
       ├─► Step 4: Overwrite local IndexedDB records, transition status -> 'synced'
       │
       └─► Step 5: Flush offline binary photos queue ('photos' store) -> POST /api/ai/ocr/upload
```

### 6.4 AI Pre-Submission Audit Validations
Before compiling a monthly statement, `aiAuditController.js` deterministically verifies:
1. **Negative Duration Check:** $\text{actualArrival} > \text{actualDeparture}$ (Violations trigger critical deduction).
2. **Shift Collision Check:** Active shift interval $[\text{start}, \text{end}]$ does not overlap with any existing shift for that officer.
3. **Station Continuity Check:** Current departure station must match the arrival station of the preceding chronological duty ($\text{curr.departureStation} == \text{prev.arrivalStation}$).
4. **Health Score Metric:** Starts at 100%; deducts 10–25 points per anomaly; prompts Gemini to explain the discrepancies in plain English.

---

## 7. COMPLETE FEATURE STATUS SUMMARY MATRIX

| Feature Area | Sub-Feature | Implementation Status | Functional Level |
| :--- | :--- | :--- | :--- |
| **PWA & Offline** | App Shell Caching | Fully Implemented | 100% Functional |
| | Offline Duty Creation / Editing | Fully Implemented | 100% Functional |
| | Background Sync Reconnection | Fully Implemented | 100% Functional |
| | Offline Dynamic Chunks | Partially Implemented | Runtime only (Fails if unvisited) |
| | Push Notifications | Mocked | Client `setTimeout` only |
| **Authentication** | Login / Register / JWT | Fully Implemented | 100% Functional |
| | Secure Password Recovery | Fully Implemented | 100% Functional (Single-use tokens) |
| | Offline Authentication | Fully Implemented | 100% Functional (IndexedDB profile) |
| **Duty Logging** | Shift CRUD & Table View | Fully Implemented | 100% Functional |
| | Train Number Autocomplete | Partially Implemented | Seeded database lookup only |
| | Server-Side Pagination | Not Implemented | Client-side 10/page only |
| **Calculations** | 7th CPC TA Slabs | Fully Implemented | 100% Functional |
| | IST 22:00–06:00 NDA Window | Fully Implemented | 100% Functional |
| **Statements** | TA / NDA / Diary Generator | Fully Implemented | 100% Functional |
| | CSV Download | Fully Implemented | 100% Functional |
| | PDF Export | Partially Implemented | Browser `window.print()` only |
| **AI Features** | OCR Duty Slip Parser | Partially Implemented | Backend works; in-memory queue; file picker |
| | Voice Journey Logging | Partially Implemented | Transcribes to notes; API unwired |
| | RAG Copilot Assistant | Fully Implemented | 100% Functional |
| | Claim Compliance Audit | Fully Implemented | 100% Functional |
| | Delay Reason Prediction | Not Implemented | Discussed only |
| **Navigation & Admin** | Admin Dashboard / Users | Fully Implemented | 100% Functional |
| | Admin Analytics (`/admin/analytics`) | Not Implemented | Discussed only |
| | Duty Roster (`/calendar`) | UI Stub | `alert()` dialog only |
| | Allowances Matrix (`/allowances`) | UI Stub | `alert()` dialog only |
| | Train Directory (`/train-directory`)| UI Stub | `alert()` dialog only |
| | Statement Templates (`/templates`) | UI Stub | `alert()` dialog only |
| | Help Screen (`/help`) | UI Stub | `alert()` dialog only |
| **Subscriptions** | Database Schema / Tiers | Partially Implemented | Models exist; no billing gateway |
