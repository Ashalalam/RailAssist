# RailAssist – Phase 2.3: Database Performance & Data Integrity Report

**Project:** RailAssist (Offline-First Railway Staff Assistant Platform)  
**Location:** `C:\Users\ashal\.gemini\antigravity\scratch\railassist`  
**Engineer:** Senior MongoDB Database Architect & Backend Engineer  
**Date:** November 2026  
**Status:** Completed & Verified (102/102 Assertions Passed Across 5 Test & Audit Suites)

---

## 1. Executive Summary

Phase 2.3 addressed foundational database performance, multi-tenant data isolation, offline synchronization idempotency, and lifecycle referential integrity across the RailAssist MongoDB database.

Prior to Phase 2.3, critical collections lacked indexes, resulting in collection scans (`COLLSCAN`) and memory-intensive in-memory sort operations (`Winning Stage: SORT`) on every query. Offline synchronization risked document collisions between different users sharing identical client-generated IDs, and administrative user deletion left orphaned operational documents while severing security audit attribution.

All items have been systematically resolved, audited, and verified under strict preservation constraints.

---

## 2. Duplicate Data Checks Before Indexing

In compliance with strict architectural guidelines (*"Never create a unique index before checking existing duplicate records"*), an automated audit script was executed prior to applying schema indexes:

```text
=== CHECKING FOR DUPLICATE DATA BEFORE INDEXING ===

[CHECK] journeys on [userId, localId] -> Duplicates: 0
[CHECK] journeys on [localId] -> Duplicates: 0
[CHECK] journeytemplates on [userId, templateName] -> Duplicates: 0
[CHECK] reporthistories on [userId, reportType, month] -> Duplicates: 1 (count: 3 archived statements)
[CHECK] subscriptions on [userId] -> Duplicates: 0
[CHECK] users on [email] -> Duplicates: 0
[CHECK] trains on [number] -> Duplicates: 0
[CHECK] divisions on [code] -> Duplicates: 0
```

### Key Architectural Finding:
- **`ReportHistory` Must NOT Be Unique:** Users generate and archive revised monthly statements over time (e.g., re-running TA statements after shift adjustments). A unique index on `[userId, month]` would cause production crashes during report re-generation. Therefore, a compound **non-unique** index `{ userId: 1, month: 1 }` was created.
- **`localId` Uniqueness Must Be Scoped to `userId`:** A global unique index on `localId` would prevent different mobile clients from using standard local IDs (e.g. `offline-1`). The compound index `{ userId: 1, localId: 1 }, { unique: true }` correctly enforces per-user isolation without inter-tenant collisions.

---

## 3. Index Definitions & Database Optimization

The following production indexes were created and synchronized across Mongoose models:

### 1. `Journey` (`server/models/Journey.js`)
```javascript
// 1. Primary dashboard query index: user journeys sorted by scheduled departure descending
JourneySchema.index({ userId: 1, scheduledDeparture: -1 });

// 2. Scoped unique compound index: guarantees offline sync idempotency per user
JourneySchema.index({ userId: 1, localId: 1 }, { unique: true });

// 3. Timeline & overlap range index: user journeys ordered by actual departure ascending
JourneySchema.index({ userId: 1, actualDeparture: 1 });
```

### 2. `AuditLog` (`server/models/AuditLog.js`)
```javascript
// 1. Per-user audit trail queries sorted descending
AuditLogSchema.index({ userId: 1, timestamp: -1 });

// 2. Global administrator audit log index sorted descending
AuditLogSchema.index({ timestamp: -1 });
```

### 3. `ReportHistory` (`server/models/ReportHistory.js`)
```javascript
// 1. Filtering generated statements by user and month
ReportHistorySchema.index({ userId: 1, month: 1 });

// 2. User statement history ordered by generation date descending
ReportHistorySchema.index({ userId: 1, generatedAt: -1 });
```

### 4. `JourneyTemplate` (`server/models/JourneyTemplate.js`)
```javascript
// Fast template retrieval by authenticated user
JourneyTemplateSchema.index({ userId: 1 });
```

### 5. `Subscription` (`server/models/Subscription.js`)
```javascript
// Active user subscription status verification
SubscriptionSchema.index({ userId: 1, status: 1 });
```

---

## 4. Query Performance Verification (`explain('executionStats')`)

Execution plans for mission-critical query patterns were measured before and after index creation:

| Query Pattern | Collection | Before Indexing Stage | After Indexing Stage | Index Used | Performance Gain |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `find({ userId }).sort({ scheduledDeparture: -1 })` | `journeys` | `COLLSCAN` + in-memory `SORT` | **`FETCH`** | `userId_1_scheduledDeparture_-1` | **Eliminated in-memory RAM sort; direct index order** |
| `findOne({ userId, localId: 'local-1' })` | `journeys` | `COLLSCAN` (examined all docs) | **`FETCH`** | `userId_1_localId_1` | **Exact index seek (`keysExamined: 1`, `docsExamined: 1`)** |
| `find({ userId, actualDeparture: { $gte } })` | `journeys` | `COLLSCAN` (examined all docs) | **`FETCH`** | `userId_1_actualDeparture_1` | **Bounded range index seek** |
| `find({}).sort({ timestamp: -1 }).limit(100)` | `auditlogs` | `COLLSCAN` + in-memory `SORT` | **`LIMIT` on Index** | `timestamp_-1` | **Zero in-memory sort buffer consumed** |
| `find({ userId }).sort({ generatedAt: -1 })` | `reporthistories` | `COLLSCAN` + in-memory `SORT` | **`FETCH`** | `userId_1_generatedAt_-1` | **Eliminated in-memory sort** |

### Execution Details:
- **Zero In-Memory RAM Sorts:** Previously, all sorted queries used `Winning Stage: SORT`, which risks query termination when result sets exceed MongoDB's 32 MB in-memory sort buffer limit. All sorted queries now execute with native index ordering.

---

## 5. Offline Sync Data Integrity Architecture

### Hardened Sync Workflow (`server/index.js` `POST /api/journeys/sync`):
1. **Payload Sanitization:** Client-side immutable `_id` and client `userId` fields are stripped (`const { _id, userId: clientUserId, ...safeItem } = item;`).
2. **User Scope Enforcement:** Upsert queries strictly filter on `{ localId: safeItem.localId, userId: req.user.id }`.
3. **Idempotent Updates:**
   - If document exists for that `userId`: Updates fields and recalculates authoritative TA/NDA.
   - If document does not exist: Creates document.
   - Under race conditions: The unique compound index `{ userId: 1, localId: 1 }` prevents duplicate insertions at the database engine level.
4. **Authoritative Server Calculations:** `nightDutyHours`, `ndaAmount`, and `taAmount` are recalculated on the server using the verified IST calculation engine, overwriting any client-side calculations.
5. **No Data Loss on Failure:** Client retains `syncStatus: 'pending_create'` or `'pending_update'` until `api.journeys.sync` returns `{ success: true }`.

---

## 6. Safe User Deletion & Historical Audit Retention Strategy

### The Problem Identified:
Legacy `DELETE /api/admin/users/:id` executed `User.findByIdAndDelete(id)`, which:
- Left orphaned documents across `journeys`, `journeytemplates`, `reporthistories`, and `subscriptions`.
- Severed audit trail references: `AuditLog.find({}).populate('userId')` returned `userId: null`, rendering deleted employee actions as anonymous `"System Service"`.

### The Solution Implemented:
1. **Administrative Self-Deletion Prevention:** Rejects self-deletion attempts (`req.params.id === req.user.id`) with HTTP 400.
2. **Historical Identity Preservation:**
   - Before deletion, extracts user snapshot: `${user.name} <${user.email}> (${user.role}, Division: ${user.division})`.
   - Updates all historical audit logs: `AuditLog.updateMany({ userId: user._id }, { $set: { userSnapshot } })`.
   - Never deletes audit logs.
   - Enriches `GET /api/admin/audit-logs` so historical actions render the official's name, archived email, and role.
3. **Cascading Operational Document Cleanup:**
   - Concurrently removes operational documents belonging to the user:
     - `Journey.deleteMany({ userId: user._id })`
     - `JourneyTemplate.deleteMany({ userId: user._id })`
     - `ReportHistory.deleteMany({ userId: user._id })`
     - `Subscription.deleteMany({ userId: user._id })`
4. **Transaction Support with Safe Sequential Fallback:**
   - Probes runtime MongoDB deployment for multi-document transaction support (`session.startTransaction()`).
   - If supported (replica set), wraps all deletions in an atomic session.
   - If standalone, executes in reverse-dependency order, guaranteeing the user document is deleted only after operational records are removed.

---

## 7. Verification & Test Execution Results

### 1. Database Integrity Audit Suite (`npm run test:audit`)
Executed [`server/scripts/validate_database_integrity.mjs`](file:///C:/Users/ashal/.gemini/antigravity/scratch/railassist/server/scripts/validate_database_integrity.mjs):
```text
================================================================================
                 RAILASSIST DATABASE INTEGRITY & VALIDATION AUDIT               
================================================================================

[SECTION 1] Schema Validation & Required Fields
  [PASS] All User documents contain required fields (name, email, role, division)
  [PASS] All Journey documents contain required fields (userId, trainNumber, localId, dates)

[SECTION 2] Referential Integrity & Orphaned Document Check
  [PASS] Zero orphaned Journey documents (all reference valid User accounts)
  [PASS] Zero orphaned JourneyTemplate documents
  [PASS] Zero orphaned ReportHistory documents
  [PASS] Zero orphaned Subscription documents

[SECTION 3] localId Validity & Scoped Uniqueness
  [PASS] All Journey localId values are non-empty valid strings
  [PASS] Zero duplicate (userId + localId) collisions across journeys

[SECTION 4] Active Index Verification on Collections
  [PASS] Journey index (userId + scheduledDeparture) active
  [PASS] Journey unique index (userId + localId) active
  [PASS] Journey index (userId + actualDeparture) active
  [PASS] AuditLog index (userId + timestamp) active
  [PASS] AuditLog global index (timestamp) active
  [PASS] ReportHistory index (userId + month) active
  [PASS] ReportHistory index (userId + generatedAt) active
  [PASS] JourneyTemplate index (userId) active
  [PASS] Subscription index (userId + status) active

[SECTION 5] Multi-User Data Isolation
  [PASS] User A (admin@railassist.com) query strictly returns User A records without cross-tenant leakage
  [PASS] User B (staff@railassist.com) query strictly returns User B records without cross-tenant leakage

TOTAL AUDIT CHECKS: 19 | PASSED: 19 | FAILED: 0
```

### 2. Multi-Tenant Sync & Data Integrity Suite (`npm run test:integrity`)
Executed [`server/test_integrity_suite.mjs`](file:///C:/Users/ashal/.gemini/antigravity/scratch/railassist/server/test_integrity_suite.mjs):
```text
================================================================================
               RAILASSIST PHASE 2.3 DATA INTEGRITY TEST SUITE                   
================================================================================

[SECTION 1] Base Authentication
  [PASS] Admin login succeeds with JWT
  [PASS] Staff login succeeds with JWT

[SECTION 2] User Registration & Multi-Tenant Setup
  [PASS] New user registration succeeds

[SECTION 3] Scoped localId Uniqueness & Collision Prevention
  [PASS] Staff sync with sharedLocalId succeeds
  [PASS] Second user sync with identical localId succeeds (scoped uniqueness per user)
  [PASS] Database holds two separate documents for shared localId isolated by userId

[SECTION 4] Repeated Offline Sync Idempotency
  [PASS] Repeated sync invocation #1 succeeds (200 OK)
  [PASS] Repeated sync invocation #2 succeeds (200 OK)
  [PASS] Repeated sync invocation #3 succeeds (200 OK)
  [PASS] Exact single document exists after 3 sync invocations (got 1)

[SECTION 5] Multi-User Data Isolation
  [PASS] Staff journey list excludes temp guard records
  [PASS] Temp guard journey list excludes staff records

[SECTION 6] Safe User Deletion & Historical Audit Preservation
  [PASS] Admin self-deletion blocked by safety constraint (400 Bad Request)
  [PASS] Admin safely deleted user and received cascading summary
  [PASS] Cascaded operational journey records
  [PASS] Cascaded operational template records
  [PASS] Cascaded operational report records
  [PASS] Zero orphaned documents remain in database for deleted user
  [PASS] Historical audit log entries preserved for deleted user (found 5 entries)
  [PASS] Audit log contains preserved userSnapshot with name, email, role, and division
  [PASS] Admin audit logs endpoint renders historic user attribution instead of null/blank

TOTAL INTEGRITY ASSERTIONS: 21 | PASSED: 21 | FAILED: 0
```

### Cumulative Test Breakdown
| Test Suite | Command | Assertions Passed | Failures |
| :--- | :--- | :---: | :---: |
| **Phase 2.1 Security Hardening** | `npm run test:security` | 20 / 20 | 0 |
| **Phase 2.2 Timezone & Slabs** | `npm run test:timezone` | 21 / 21 | 0 |
| **Phase 2.2 Functional Regression** | `npm run test:regression` | 21 / 21 | 0 |
| **Phase 2.3 Multi-Tenant Sync & Safe Deletion** | `npm run test:integrity` | 21 / 21 | 0 |
| **Phase 2.3 Database Validation & Referential Audit** | `npm run test:audit` | 19 / 19 | 0 |
| **Total Cumulative Assertions** | `npm test` | **102 / 102** | **0** |

### Frontend Build Status
- `npm run build` in `client/`: **Exit Code 0** (1900 modules transformed in 1.45s).

---

## 8. Exact Files Modified & Created

| File | Change Type | Purpose |
| :--- | :---: | :--- |
| `server/models/Journey.js` | **Modified** | Added compound indexes for scheduled departure, scoped localId, and actual departure. |
| `server/models/AuditLog.js` | **Modified** | Added compound index on timestamp, user timestamp, and `userSnapshot` preservation field. |
| `server/models/ReportHistory.js` | **Modified** | Added non-unique compound indexes on `userId + month` and `userId + generatedAt`. |
| `server/models/JourneyTemplate.js` | **Modified** | Added index on `userId`. |
| `server/models/Subscription.js` | **Modified** | Added compound index on `userId + status`. |
| `server/index.js` | **Modified** | Hardened `/api/journeys/sync` with ID stripping; implemented safe cascading user deletion and audit logs enrichment. |
| `server/package.json` | **Modified** | Configured `test:integrity`, `test:audit`, and updated unified `npm test`. |
| `server/scripts/check_duplicates.mjs` | **Created** | Pre-indexing duplicate data audit runner. |
| `server/scripts/measure_query_plans.mjs` | **Created** | Query execution plan profiler (`explain('executionStats')`). |
| `server/scripts/sync_indexes.mjs` | **Created** | Mongoose index synchronization script. |
| `server/scripts/validate_database_integrity.mjs` | **Created** | Automated database schema, referential integrity, and isolation checker. |
| `server/test_integrity_suite.mjs` | **Created** | End-to-end multi-tenant sync idempotency and safe deletion test suite. |

---

## 9. Remaining Risks & Phase 2.4 Recommendations

1. **MongoDB Replica Set for Live Deployments:** While RailAssist seamlessly falls back to sequential cascading deletion on standalone MongoDB instances, configuring a 3-node replica set in production ensures native ACID distributed transactions.
2. **Periodic Index Defragmentation / TTL for Audit Logs:** For long-term production deployments spanning millions of records, configuring archival storage or cold data tiering for audit logs older than 7 years is recommended.
3. **Database Connection Pool Sizing:** Ensure `maxPoolSize` is configured in `connectDB` when scaling to multi-division concurrency.
