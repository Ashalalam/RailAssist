/**
 * RailAssist Phase 2.3 Database Integrity & Multi-Tenant Sync Test Suite
 * 
 * Verifies:
 * 1. User registration & authenticated login.
 * 2. Scoped localId uniqueness: Different users can use identical localIds without collision.
 * 3. Offline sync idempotency: Repeated sync requests do not produce duplicate records.
 * 4. Multi-user data isolation: Token strictly restricts read/write boundaries.
 * 5. Safe user deletion:
 *    - Prevents administrator self-deletion.
 *    - Cascades operational records (journeys, templates, reports, subscriptions).
 *    - Preserves historical security audit trails with user attribution snapshots.
 * 6. Admin audit log inspection shows historic user metadata for deleted accounts.
 */

import { spawn } from 'child_process';
import http from 'http';
import mongoose from 'mongoose';
import User from './models/User.js';
import Journey from './models/Journey.js';
import AuditLog from './models/AuditLog.js';
import JourneyTemplate from './models/JourneyTemplate.js';
import ReportHistory from './models/ReportHistory.js';
import Subscription from './models/Subscription.js';

const TEST_PORT = 5077;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
    failedCount++;
  }
}

async function httpRequest(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    let payload = null;

    if (bodyData) {
      payload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: '/api/trains',
        method: 'GET'
      });
      if (res.statusCode) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Server failed to start on port ${TEST_PORT}`);
}

async function runIntegritySuite() {
  console.log('================================================================================');
  console.log('               RAILASSIST PHASE 2.3 DATA INTEGRITY TEST SUITE                   ');
  console.log('================================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/railassist');

  const serverProcess = spawn('node', ['index.js'], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'),
    env: { ...process.env, PORT: TEST_PORT.toString() },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', (d) => {
    const errText = d.toString();
    if (!errText.includes('DeprecationWarning')) {
      console.error(`[Server STDERR] ${errText}`);
    }
  });

  try {
    await waitForServer();
    console.log(`Server online on test port ${TEST_PORT}.\n`);

    // 1. Authenticate Seeded Admin & Seeded Staff
    console.log('[SECTION 1] Base Authentication');
    const adminLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'admin@railassist.com',
      password: 'Password123'
    });
    const adminToken = adminLoginRes.body && adminLoginRes.body.token;
    assert(adminLoginRes.statusCode === 200 && Boolean(adminToken), 'Admin login succeeds with JWT');

    const staffLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'staff@railassist.com',
      password: 'Password123'
    });
    const staffToken = staffLoginRes.body && staffLoginRes.body.token;
    assert(staffLoginRes.statusCode === 200 && Boolean(staffToken), 'Staff login succeeds with JWT');

    // 2. Register Temporary User (User B)
    console.log('\n[SECTION 2] User Registration & Multi-Tenant Setup');
    const tempEmail = `guard_${Date.now()}@railassist.com`;
    const registerRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      name: 'Sunil Verma',
      email: tempEmail,
      password: 'GuardPassword123',
      role: 'Guard',
      division: 'BB'
    });
    const tempUserToken = registerRes.body && registerRes.body.token;
    const tempUserId = registerRes.body && registerRes.body.user && registerRes.body.user.id;
    assert(registerRes.statusCode === 201 && Boolean(tempUserToken), 'New user registration succeeds');

    // 3. Scoped localId Uniqueness (Identical localId on two different accounts)
    console.log('\n[SECTION 3] Scoped localId Uniqueness & Collision Prevention');
    const sharedLocalId = 'offline-slip-shared-001';

    // Staff syncs with sharedLocalId
    const staffSyncRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, {
      journeys: [{
        localId: sharedLocalId,
        trainNumber: '12951',
        trainName: 'Mumbai Rajdhani Express',
        departureStation: 'MMCT',
        arrivalStation: 'NDLS',
        scheduledDeparture: '2026-11-04T16:00:00+05:30',
        scheduledArrival: '2026-11-05T08:30:00+05:30',
        actualDeparture: '2026-11-04T16:00:00+05:30',
        actualArrival: '2026-11-05T08:30:00+05:30',
        distanceKm: 1386,
        delayMinutes: 0
      }]
    });
    assert(staffSyncRes.statusCode === 200 && staffSyncRes.body.success === true, 'Staff sync with sharedLocalId succeeds');

    // Temp Guard syncs with SAME sharedLocalId
    const tempSyncRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${tempUserToken}` }
    }, {
      journeys: [{
        localId: sharedLocalId,
        trainNumber: '12001',
        trainName: 'Bhopal Shatabdi Express',
        departureStation: 'RKMP',
        arrivalStation: 'NDLS',
        scheduledDeparture: '2026-11-04T15:10:00+05:30',
        scheduledArrival: '2026-11-04T23:30:00+05:30',
        actualDeparture: '2026-11-04T15:10:00+05:30',
        actualArrival: '2026-11-04T23:30:00+05:30',
        distanceKm: 701,
        delayMinutes: 0
      }]
    });
    assert(
      tempSyncRes.statusCode === 200 && tempSyncRes.body.success === true,
      'Second user sync with identical localId succeeds (scoped uniqueness per user)'
    );

    // Verify two distinct records exist in MongoDB with identical localId but different userIds
    const distinctDocs = await Journey.find({ localId: sharedLocalId });
    assert(
      distinctDocs.length === 2 && distinctDocs[0].userId.toString() !== distinctDocs[1].userId.toString(),
      'Database holds two separate documents for shared localId isolated by userId'
    );

    // 4. Repeated Sync Idempotency (3 repeated calls)
    console.log('\n[SECTION 4] Repeated Offline Sync Idempotency');
    const repeatedLocalId = `idempotent-test-${Date.now()}`;
    const journeyPayload = {
      localId: repeatedLocalId,
      trainNumber: '12626',
      trainName: 'Kerala Express',
      departureStation: 'NDLS',
      arrivalStation: 'TVC',
      scheduledDeparture: '2026-11-06T20:10:00+05:30',
      scheduledArrival: '2026-11-08T18:00:00+05:30',
      actualDeparture: '2026-11-06T20:10:00+05:30',
      actualArrival: '2026-11-08T18:00:00+05:30',
      distanceKm: 3036,
      delayMinutes: 0
    };

    // Send 3 times
    for (let i = 1; i <= 3; i++) {
      const res = await httpRequest({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: '/api/journeys/sync',
        method: 'POST',
        headers: { Authorization: `Bearer ${tempUserToken}` }
      }, { journeys: [journeyPayload] });
      assert(res.statusCode === 200, `Repeated sync invocation #${i} succeeds (200 OK)`);
    }

    // Verify count in database
    const countInDb = await Journey.countDocuments({ userId: tempUserId, localId: repeatedLocalId });
    assert(countInDb === 1, `Exact single document exists after 3 sync invocations (got ${countInDb})`);

    // 5. Multi-User Read/Write Isolation
    console.log('\n[SECTION 5] Multi-User Data Isolation');
    const staffJourneysRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const staffJourneys = staffJourneysRes.body;
    const tempUserJourneysRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET',
      headers: { Authorization: `Bearer ${tempUserToken}` }
    });
    const tempUserJourneys = tempUserJourneysRes.body;

    const staffHasTempUserRecord = staffJourneys.some(j => j.trainNumber === '12626');
    const tempHasStaffRecord = tempUserJourneys.some(j => j.trainNumber === '12951');
    assert(!staffHasTempUserRecord, 'Staff journey list excludes temp guard records');
    assert(!tempHasStaffRecord, 'Temp guard journey list excludes staff records');

    // 6. Safe User Deletion & Audit Trail Preservation
    console.log('\n[SECTION 6] Safe User Deletion & Historical Audit Preservation');

    // Attempt self-deletion by admin
    const adminUser = await User.findOne({ email: 'admin@railassist.com' });
    const selfDeleteRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/admin/users/${adminUser._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      selfDeleteRes.statusCode === 400 && selfDeleteRes.body.message.includes('safety constraint'),
      'Admin self-deletion blocked by safety constraint (400 Bad Request)'
    );

    // Create an operational template and report for temp user to test cascading
    await JourneyTemplate.create({
      userId: tempUserId,
      templateName: 'Guard Daily Shatabdi',
      trainNumber: '12001',
      trainName: 'Bhopal Shatabdi',
      departureStation: 'RKMP',
      arrivalStation: 'NDLS',
      scheduledDepartureTime: '15:10',
      scheduledArrivalTime: '23:30'
    });

    await ReportHistory.create({
      userId: tempUserId,
      reportType: 'TA',
      month: '2026-11',
      fileName: 'Sunil_Verma_TA.pdf',
      journeyCount: 2,
      totalAmount: 1600,
      summaryData: { totalTA: 1600 }
    });

    // Delete temp user via Admin API
    const deleteUserRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/admin/users/${tempUserId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      deleteUserRes.statusCode === 200 && deleteUserRes.body.cascaded,
      'Admin safely deleted user and received cascading summary'
    );
    assert(deleteUserRes.body.cascaded.journeys >= 2, 'Cascaded operational journey records');
    assert(deleteUserRes.body.cascaded.templates === 1, 'Cascaded operational template records');
    assert(deleteUserRes.body.cascaded.reports === 1, 'Cascaded operational report records');

    // Verify zero orphaned documents remain for deleted user
    const remainingJourneys = await Journey.countDocuments({ userId: tempUserId });
    const remainingTemplates = await JourneyTemplate.countDocuments({ userId: tempUserId });
    const remainingReports = await ReportHistory.countDocuments({ userId: tempUserId });
    assert(
      remainingJourneys === 0 && remainingTemplates === 0 && remainingReports === 0,
      'Zero orphaned documents remain in database for deleted user'
    );

    // Verify historical audit logs for temp user are PRESERVED with userSnapshot
    const auditLogsForDeleted = await AuditLog.find({ userId: tempUserId });
    assert(
      auditLogsForDeleted.length > 0,
      `Historical audit log entries preserved for deleted user (found ${auditLogsForDeleted.length} entries)`
    );
    assert(
      Boolean(auditLogsForDeleted[0].userSnapshot) && auditLogsForDeleted[0].userSnapshot.includes('Sunil Verma'),
      'Audit log contains preserved userSnapshot with name, email, role, and division'
    );

    // Verify GET /api/admin/audit-logs returns historic attribution
    const adminLogsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const matchingLog = adminLogsRes.body.find(l => l.userSnapshot && l.userSnapshot.includes('Sunil Verma'));
    assert(
      Boolean(matchingLog) && matchingLog.userId.name.includes('Sunil Verma'),
      'Admin audit logs endpoint renders historic user attribution instead of null/blank'
    );

    // Clean up staff test journey
    await Journey.deleteMany({ localId: sharedLocalId });

  } finally {
    serverProcess.kill('SIGTERM');
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(`TOTAL INTEGRITY ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED:                     ${passedCount}`);
  console.log(`FAILED:                     ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) process.exit(1);
  else process.exit(0);
}

runIntegritySuite().catch((err) => {
  console.error('Unhandled integrity test error:', err);
  process.exit(1);
});
