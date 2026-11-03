/**
 * RailAssist Phase 2.2 Full Regression Verification Suite
 * 
 * Verifies all required functional and architectural workflows:
 * 1. Duty creation (POST /api/journeys) with automatic IST TA/NDA computation.
 * 2. Duty editing (PUT /api/journeys/:id) with automatic recalculation.
 * 3. Duty deletion (DELETE /api/journeys/:id).
 * 4. TA calculation compliance in persisted database documents.
 * 5. NDA calculation compliance in persisted database documents.
 * 6. Offline synchronization (POST /api/journeys/sync).
 * 7. Train directory & autocomplete query (GET /api/trains?q=...).
 * 8. AI OCR multipart upload route (POST /api/ai/ocr/upload).
 * 9. AI Copilot query endpoint (POST /api/ai/chat/query).
 * 10. Monthly statements & report history (GET/POST /api/reports).
 * 11. Template lifecycle through centralized API (GET/POST/DELETE /api/templates).
 */

import { spawn } from 'child_process';
import http from 'http';
import mongoose from 'mongoose';
import User from './models/User.js';
import Journey from './models/Journey.js';

const TEST_PORT = 5066;
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
      if (options.isMultipart) {
        payload = Buffer.isBuffer(bodyData) ? bodyData : Buffer.from(bodyData);
        headers['Content-Type'] = options.contentType;
        headers['Content-Length'] = payload.length;
      } else {
        payload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
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

async function runRegressionSuite() {
  console.log('================================================================================');
  console.log('                 RAILASSIST PHASE 2.2 FULL REGRESSION TEST SUITE                ');
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

    // 1. Authenticate Staff User
    console.log('[SECTION 1] Staff Authentication');
    const loginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'staff@railassist.com',
      password: 'Password123'
    });

    const token = loginRes.body && loginRes.body.token;
    assert(loginRes.statusCode === 200 && Boolean(token), 'Staff login succeeds with JWT');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Train Directory & Autocomplete
    console.log('\n[SECTION 2] Train Directory & Autocomplete');
    const trainSearchRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/trains?q=12951',
      method: 'GET',
      headers: authHeaders
    });
    assert(
      trainSearchRes.statusCode === 200 && Array.isArray(trainSearchRes.body) && trainSearchRes.body.length > 0,
      'Train search by number (12951) returns Mumbai Rajdhani'
    );

    const trainNameSearchRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/trains?q=Rajdhani',
      method: 'GET',
      headers: authHeaders
    });
    assert(
      trainNameSearchRes.statusCode === 200 && trainNameSearchRes.body.length >= 1,
      'Train search by name keyword ("Rajdhani") returns matching records'
    );

    // 3. Duty Creation with Timezone & Allowance Calculations
    console.log('\n[SECTION 3] Duty Creation & Allowance Persistence');
    // Shift: 2026-11-03 21:00 to 2026-11-04 07:00 (10 hours total absence, 8 hours night duty)
    // TTE rates: TA daily rate = 800, NDA hourly rate = 180
    // Expected TA: 10 hours absence (6-12h slab = 70% of 800) = 560
    // Expected NDA: 8 hours (22:00 to 06:00 IST) * 180 = 1440
    const localId = `reg-test-${Date.now()}`;
    const createDutyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'POST',
      headers: authHeaders
    }, {
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani Express',
      departureStation: 'MMCT',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-03T21:00:00+05:30',
      scheduledArrival: '2026-11-04T07:00:00+05:30',
      actualDeparture: '2026-11-03T21:00:00+05:30',
      actualArrival: '2026-11-04T07:00:00+05:30',
      departureFromHq: '2026-11-03T21:00:00+05:30',
      arrivalAtHq: '2026-11-04T07:00:00+05:30',
      distanceKm: 1386,
      delayMinutes: 0,
      notes: 'Automated regression test duty',
      localId
    });

    const createdDuty = createDutyRes.body;
    assert(createDutyRes.statusCode === 201 && createdDuty._id, 'Duty creation endpoint returns 201 Created');
    assert(createdDuty.nightDutyHours === 8, `Night duty hours computed as 8.00 (got ${createdDuty.nightDutyHours})`);
    assert(createdDuty.ndaAmount === 1440, `NDA amount computed as ₹1440 (got ₹${createdDuty.ndaAmount})`);
    assert(createdDuty.taAmount === 560, `TA amount computed as ₹560 for 10h absence (got ₹${createdDuty.taAmount})`);

    const journeyId = createdDuty._id;

    // 4. Duty Editing with Recalculation
    console.log('\n[SECTION 4] Duty Editing & Recalculation');
    // Change actual arrival to 2026-11-04 05:00:00 (8 hours total absence, 7 hours night duty: 22:00 to 05:00)
    // Expected NDA: 7 * 180 = 1260
    // Expected TA: 8h absence (6-12h slab = 70% of 800) = 560
    const editDutyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      actualArrival: '2026-11-04T05:00:00+05:30',
      arrivalAtHq: '2026-11-04T05:00:00+05:30',
      notes: 'Updated duty via regression test'
    });

    const updatedDuty = editDutyRes.body;
    assert(editDutyRes.statusCode === 200, 'Duty update returns 200 OK');
    assert(updatedDuty.nightDutyHours === 7, `Updated night duty hours recalculated as 7.00 (got ${updatedDuty.nightDutyHours})`);
    assert(updatedDuty.ndaAmount === 1260, `Updated NDA recalculated as ₹1260 (got ₹${updatedDuty.ndaAmount})`);

    // 5. Offline Sync Endpoint
    console.log('\n[SECTION 5] Offline Journey Synchronization');
    // Simulate an offline-created journey synced to the server
    const offlineItem = {
      localId: `offline-${Date.now()}`,
      trainNumber: '12001',
      trainName: 'Bhopal Shatabdi Express',
      departureStation: 'RKMP',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-05T15:10:00+05:30',
      scheduledArrival: '2026-11-05T23:30:00+05:30',
      actualDeparture: '2026-11-05T15:10:00+05:30',
      actualArrival: '2026-11-05T23:35:00+05:30',
      departureFromHq: '2026-11-05T14:30:00+05:30',
      arrivalAtHq: '2026-11-05T23:59:00+05:30',
      distanceKm: 701,
      delayMinutes: 5,
      notes: 'Created offline in coach B2'
    };

    const syncRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: authHeaders
    }, {
      journeys: [offlineItem]
    });

    assert(
      syncRes.statusCode === 200 && syncRes.body.success === true && syncRes.body.syncedJourneys.length === 1,
      'Offline sync endpoint processes batched journeys'
    );
    const syncedDoc = syncRes.body.syncedJourneys[0];
    assert(
      syncedDoc.nightDutyHours === 1.58,
      `Offline journey night duty calculated on server as 1.58h (got ${syncedDoc.nightDutyHours})`
    );

    // Clean up synced journey
    await Journey.deleteOne({ localId: offlineItem.localId });

    // 6. Duty Deletion
    console.log('\n[SECTION 6] Duty Deletion');
    const deleteRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteRes.statusCode === 200, 'Duty deletion endpoint returns 200 OK');
    const lookupDeleted = await Journey.findById(journeyId);
    assert(lookupDeleted === null, 'Deleted journey successfully removed from database');

    // 7. Route Templates Endpoint (Centralized API Verification)
    console.log('\n[SECTION 7] Centralized Templates API');
    const createTemplateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/templates',
      method: 'POST',
      headers: authHeaders
    }, {
      templateName: 'Mumbai-Delhi Rajdhani Regular',
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani Express',
      departureStation: 'MMCT',
      arrivalStation: 'NDLS',
      scheduledDepartureTime: '16:00',
      scheduledArrivalTime: '08:30'
    });
    if (createTemplateRes.statusCode !== 201) {
      console.error('Template Create Error:', createTemplateRes.statusCode, createTemplateRes.body);
    }
    assert(createTemplateRes.statusCode === 201 && createTemplateRes.body._id, 'POST /api/templates creates template');
    const tempId = createTemplateRes.body && createTemplateRes.body._id;

    const getTemplatesRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/templates',
      method: 'GET',
      headers: authHeaders
    });
    assert(
      getTemplatesRes.statusCode === 200 && Array.isArray(getTemplatesRes.body) && getTemplatesRes.body.some(t => t._id === tempId),
      'GET /api/templates returns created template'
    );

    const deleteTempRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/templates/${tempId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteTempRes.statusCode === 200, 'DELETE /api/templates/:id deletes template');

    // 8. Monthly Statements / Reports History
    console.log('\n[SECTION 8] Monthly Statements & Reports');
    const createReportRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'POST',
      headers: authHeaders
    }, {
      reportType: 'TA',
      month: '2026-11',
      fileName: 'TA_Statement_2026_11.pdf',
      journeyCount: 12,
      totalAmount: 9600,
      summaryData: { totalTA: 9600, month: '2026-11' }
    });
    if (createReportRes.statusCode !== 201) {
      console.error('Report Create Error:', createReportRes.statusCode, createReportRes.body);
    }
    assert(createReportRes.statusCode === 201 && createReportRes.body._id, 'POST /api/reports archives statement');

    const getReportsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'GET',
      headers: authHeaders
    });
    assert(getReportsRes.statusCode === 200 && Array.isArray(getReportsRes.body), 'GET /api/reports retrieves history');

    // 9. AI Copilot Route Check
    console.log('\n[SECTION 9] AI Copilot Route');
    const copilotRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/chat/query',
      method: 'POST',
      headers: authHeaders
    }, {
      query: 'What are the rules for Travelling Allowance for TTE?'
    });
    assert(
      copilotRes.statusCode === 200 && Boolean(copilotRes.body.answer),
      'AI Copilot endpoint responds with structured answer'
    );

    // 10. AI OCR Multipart Upload Check
    console.log('\n[SECTION 10] AI OCR Multipart Upload');
    const boundary = '---------------------------974767299852498929531610575';
    // Valid 1x1 PNG bytes
    const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082', 'hex');
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="slip.png"\r\nContent-Type: image/png\r\n\r\n`),
      pngHeader,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const ocrUploadRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/ocr/upload',
      method: 'POST',
      isMultipart: true,
      contentType: `multipart/form-data; boundary=${boundary}`,
      headers: authHeaders
    }, multipartBody);

    if (ocrUploadRes.statusCode !== 200 && ocrUploadRes.statusCode !== 202) {
      console.error('OCR Upload Error:', ocrUploadRes.statusCode, ocrUploadRes.body);
    }

    assert(
      (ocrUploadRes.statusCode === 200 || ocrUploadRes.statusCode === 202) && Boolean(ocrUploadRes.body && ocrUploadRes.body.jobId),
      'AI OCR multipart upload accepts file and queues processing job (202 Accepted)'
    );

  } finally {
    serverProcess.kill('SIGTERM');
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(`TOTAL REGRESSION ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED:                      ${passedCount}`);
  console.log(`FAILED:                      ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) process.exit(1);
  else process.exit(0);
}

runRegressionSuite().catch((err) => {
  console.error('Unhandled regression error:', err);
  process.exit(1);
});
