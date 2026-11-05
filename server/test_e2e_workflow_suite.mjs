/**
 * RailAssist Phase 2.5: Real End-to-End User Workflow Test Suite
 * 
 * Executes the 10 critical railway operational workflows against a live, isolated
 * test server and isolated MongoDB test database (no simulated or mocked responses):
 * 
 * 1. Staff registration and authenticated login
 * 2. Creating a duty journey with automated 7th CPC allowance calculations
 * 3. Editing and deleting a duty journey
 * 4. Viewing and validating calculated TA/NDA allowance breakdown
 * 5. Synchronizing offline-created journeys after reconnecting
 * 6. Preventing duplicate journey creation during repeated synchronization (idempotency)
 * 7. Uploading a duty slip for OCR processing (multipart file upload & status polling)
 * 8. Generating and archiving a monthly statement
 * 9. Admin viewing staff users and audit history (verifying historical attribution)
 * 10. Complete password recovery lifecycle (request -> reset token -> reset password -> re-authenticate)
 */

import http from 'http';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import User from './models/User.js';
import Journey from './models/Journey.js';

const TEST_PORT = 5099;
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/railassist_test';
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

async function httpRequest(options, bodyData = null, isMultipart = false, multipartBoundary = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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

    if (bodyData) {
      if (isMultipart) {
        req.setHeader('Content-Type', `multipart/form-data; boundary=${multipartBoundary}`);
        req.setHeader('Content-Length', Buffer.byteLength(bodyData));
        req.write(bodyData);
      } else {
        const payload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Content-Length', Buffer.byteLength(payload));
        req.write(payload);
      }
    }

    req.end();
  });
}

async function waitForServer(timeoutMs = 10000) {
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
  throw new Error(`Server failed to start on port ${TEST_PORT} within ${timeoutMs}ms`);
}

async function runE2ESuite() {
  console.log('================================================================================');
  console.log('          RAILASSIST PHASE 2.5: REAL END-TO-END WORKFLOW TEST SUITE             ');
  console.log('================================================================================\n');
  console.log(`Target Isolated Database: ${TEST_MONGODB_URI}\n`);

  await mongoose.connect(TEST_MONGODB_URI);

  // Spawn live server instance for E2E workflows
  const serverProcess = spawn('node', ['index.js'], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'),
    env: {
      ...process.env,
      PORT: TEST_PORT.toString(),
      MONGODB_URI: TEST_MONGODB_URI,
      NODE_ENV: 'test'
    },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', (d) => {
    const errText = d.toString();
    if (!errText.includes('DeprecationWarning') && !errText.includes('SECURITY NOTICE')) {
      console.error(`[Server STDERR] ${errText}`);
    }
  });

  try {
    await waitForServer();
    console.log(`Live test server listening on port ${TEST_PORT}.\n`);

    const runId = Date.now();

    // ========================================================================
    // WORKFLOW 1: STAFF REGISTRATION & AUTHENTICATED LOGIN
    // ========================================================================
    console.log('[WORKFLOW 1] Staff Registration & Authenticated Login');
    const crewEmail = `crew_${runId}@railassist.com`;
    const crewPassword = 'RailCrewSecret123!';

    const regRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      name: 'Anil Kumar',
      email: crewEmail,
      password: crewPassword,
      role: 'TTE',
      division: 'DLI'
    });
    assert(regRes.statusCode === 201 && Boolean(regRes.body.token), 'Workflow 1.1: New staff employee registers successfully (201 Created)');
    const initialToken = regRes.body.token;
    const staffUserId = regRes.body.user.id;

    // Login with registered credentials
    const loginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: crewEmail,
      password: crewPassword
    });
    assert(loginRes.statusCode === 200 && Boolean(loginRes.body.token), 'Workflow 1.2: Authenticated login returns active JWT session');
    const staffToken = loginRes.body.token;

    // ========================================================================
    // WORKFLOW 2: CREATING A DUTY JOURNEY WITH LIVE CALCULATION
    // ========================================================================
    console.log('\n[WORKFLOW 2] Creating a Duty Journey with Live Allowance Calculations');
    // Shift: 2026-11-04 18:00 IST to 2026-11-05 08:00 IST (14h absence @ 100% TA slab, 8h night duty)
    // Role: TTE (taDailyRate=800, ndaHourlyRate=180)
    // Expected: TA = 800 (100% of 800), NDA = 8 * 180 = 1440. Total = 2240.
    const createRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, {
      localId: `e2e-duty-${runId}`,
      trainNumber: '12301',
      trainName: 'Howrah Rajdhani Express',
      departureStation: 'HWH',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-04T18:00:00+05:30',
      scheduledArrival: '2026-11-05T08:00:00+05:30',
      actualDeparture: '2026-11-04T18:00:00+05:30',
      actualArrival: '2026-11-05T08:00:00+05:30',
      distanceKm: 1445,
      delayMinutes: 0
    });
    assert(createRes.statusCode === 201 && Boolean(createRes.body._id), 'Workflow 2.1: Duty journey created successfully in database');
    const journey = createRes.body;
    const journeyId = journey._id;

    // ========================================================================
    // WORKFLOW 3 & 4: VIEWING, EDITING & DELETING JOURNEY WITH ALLOWANCE BREAKDOWN
    // ========================================================================
    console.log('\n[WORKFLOW 3 & 4] Allowance Breakdown, Journey Editing & Deletion');
    assert(journey.nightDutyHours === 8, `Workflow 4.1: Night duty computed as exactly 8.00h (got ${journey.nightDutyHours}h)`);
    assert(journey.ndaAmount === 1440, `Workflow 4.2: NDA amount calculated as ₹1440 for TTE (got ₹${journey.ndaAmount})`);
    assert(journey.taAmount === 800, `Workflow 4.3: TA amount calculated as ₹800 (100% CPC slab) (got ₹${journey.taAmount})`);

    // Edit journey: Change departure time to 22:00 -> 10h absence (70% TA = ₹560), 8h night duty (₹1440)
    const updateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, {
      actualDeparture: '2026-11-04T22:00:00+05:30',
      actualArrival: '2026-11-05T08:00:00+05:30',
      delayMinutes: 20
    });
    assert(updateRes.statusCode === 200, 'Workflow 3.1: Journey record updated with new actual departure time');
    assert(updateRes.body.taAmount === 560, `Workflow 3.2: TA amount re-evaluated to ₹560 (70% slab) (got ₹${updateRes.body.taAmount})`);

    // Delete journey
    const deleteRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(deleteRes.statusCode === 200, 'Workflow 3.3: Journey record deleted successfully');

    // ========================================================================
    // WORKFLOW 5 & 6: OFFLINE SYNCHRONIZATION & DUPLICATE PREVENTION
    // ========================================================================
    console.log('\n[WORKFLOW 5 & 6] Offline Synchronization & Idempotency');
    const offlineLocalId = `offline-sync-${runId}`;
    const batchSyncPayload = {
      journeys: [{
        localId: offlineLocalId,
        trainNumber: '11020',
        trainName: 'Konark Express',
        departureStation: 'BBS',
        arrivalStation: 'CSMT',
        scheduledDeparture: '2026-11-07T15:00:00+05:30',
        scheduledArrival: '2026-11-08T04:00:00+05:30',
        actualDeparture: '2026-11-07T15:00:00+05:30',
        actualArrival: '2026-11-08T04:00:00+05:30',
        distanceKm: 1512,
        delayMinutes: 0
      }]
    };

    // First synchronization
    const syncRes1 = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, batchSyncPayload);
    assert(syncRes1.statusCode === 200 && syncRes1.body.success === true, 'Workflow 5.1: Offline created journey synchronized after reconnection');

    // Repeated synchronization (simulating flaky network retry)
    const syncRes2 = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, batchSyncPayload);
    assert(syncRes2.statusCode === 200 && syncRes2.body.success === true, 'Workflow 6.1: Repeated synchronization processed without errors');

    const totalSyncedDocs = await Journey.find({ userId: staffUserId, localId: offlineLocalId });
    assert(totalSyncedDocs.length === 1, `Workflow 6.2: Duplicate journey creation prevented (exactly 1 doc, got ${totalSyncedDocs.length})`);

    // ========================================================================
    // WORKFLOW 7: UPLOADING A SLIP FOR OCR PROCESSING
    // ========================================================================
    console.log('\n[WORKFLOW 7] Duty Slip Upload & Background OCR Pipeline');
    const boundary = '----WebKitFormBoundaryE2ETest' + runId;
    const fakeSlipContent = Buffer.from('DUTY_SLIP_SAMPLE_BINARY_BYTES');
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="duty_slip_${runId}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fakeSlipContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const ocrUploadRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/ocr/upload',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, multipartBody, true, boundary);
    assert(ocrUploadRes.statusCode === 202 && Boolean(ocrUploadRes.body.jobId), 'Workflow 7.1: Duty slip upload queues OCR processing job (202 Accepted)');
    const ocrJobId = ocrUploadRes.body && ocrUploadRes.body.jobId;

    const ocrStatusRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/ai/ocr/status/${ocrJobId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(ocrStatusRes.statusCode === 200 && Boolean(ocrStatusRes.body.status), 'Workflow 7.2: Background OCR job status polled successfully');

    // ========================================================================
    // WORKFLOW 8: GENERATING AND ARCHIVING MONTHLY STATEMENT
    // ========================================================================
    console.log('\n[WORKFLOW 8] Generating and Archiving Monthly Statement');
    const reportRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    }, {
      reportType: 'TA',
      month: '2026-11',
      fileName: `TA_Claim_${crewEmail.split('@')[0]}_2026-11.pdf`,
      totalAmount: 3200,
      journeyCount: 4,
      summaryData: { totalTA: 2400, totalNDA: 800, totalNightDutyHours: 4 }
    });
    assert(reportRes.statusCode === 201 && Boolean(reportRes.body._id), 'Workflow 8.1: Monthly statement archived successfully (201 Created)');

    const fetchReportsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(fetchReportsRes.statusCode === 200 && fetchReportsRes.body.length > 0, 'Workflow 8.2: Archived statement history retrieved for user');

    // ========================================================================
    // WORKFLOW 9: ADMIN VIEWING USERS & AUDIT TRAIL ATTRIBUTION
    // ========================================================================
    console.log('\n[WORKFLOW 9] Admin User Management & Audit Attribution');
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

    const adminUsersRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/users',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundUser = adminUsersRes.body.find(u => u.email === crewEmail);
    assert(Boolean(foundUser) && foundUser.name === 'Anil Kumar', 'Workflow 9.1: Admin views staff directory and locates registered employee');

    const adminLogsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundAudit = adminLogsRes.body.find(l => l.action === 'USER_REGISTER' && (l.details.includes(crewEmail) || (l.userId && l.userId.email === crewEmail)));
    assert(Boolean(foundAudit), 'Workflow 9.2: Historical audit trail captures employee registration event');

    // ========================================================================
    // WORKFLOW 10: COMPLETE SECURE PASSWORD RECOVERY LIFECYCLE
    // ========================================================================
    console.log('\n[WORKFLOW 10] Complete Secure Password Recovery Lifecycle');

    // 1. Request password reset
    const forgotRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/forgot-password',
      method: 'POST'
    }, {
      email: crewEmail
    });
    assert(forgotRes.statusCode === 200 && Boolean(forgotRes.body.devToken), 'Workflow 10.1: Forgot password generates single-use reset token');
    const resetToken = forgotRes.body.devToken;

    // 2. Submit new password
    const newPassword = 'BrandNewPassword2026!';
    const resetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/auth/reset-password/${encodeURIComponent(resetToken)}`,
      method: 'POST'
    }, {
      newPassword,
      token: resetToken
    });
    assert(resetRes.statusCode === 200, 'Workflow 10.2: Reset password endpoint accepts token and sets new password');

    // 3. Re-login with old password (Must fail)
    const oldLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: crewEmail,
      password: crewPassword
    });
    assert(oldLoginRes.statusCode === 400, 'Workflow 10.3: Old password rejected after password reset');

    // 4. Re-login with new password (Must succeed)
    const newLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: crewEmail,
      password: newPassword
    });
    assert(newLoginRes.statusCode === 200 && Boolean(newLoginRes.body.token), 'Workflow 10.4: Login with new password succeeds and grants session');

    // Clean up created user
    await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/admin/users/${staffUserId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

  } finally {
    serverProcess.kill('SIGTERM');
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(`TOTAL REAL E2E WORKFLOW ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED:                             ${passedCount}`);
  console.log(`FAILED:                             ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) process.exit(1);
  else process.exit(0);
}

runE2ESuite().catch((err) => {
  console.error('Unhandled E2E workflow test suite error:', err);
  process.exit(1);
});
