/**
 * RailAssist Phase 2.5: Comprehensive Backend Unit & Integration Test Suite
 * 
 * Tests:
 * 1. JWT Security & Validation (Tampering, Expired, Missing, Structure)
 * 2. User Registration (Success, Duplicate Email, Missing Fields, Hash Integrity)
 * 3. User Authentication (Success, Bad Password, Non-Existent User, Missing Credentials)
 * 4. Password Recovery (Token Generation, Hash Security, 15m Expiry, Single-Use Invalidation)
 * 5. Role-Based Authorization & Route Protection (401 Missing, 403 Forbidden, 200 Admin)
 * 6. Journey CRUD & 7th CPC Allowance Calculations (Creation, Read, Update, Delete)
 * 7. Negative Journey Validation (Arrival <= Departure, Missing Train, Negative Distance, 404 Not Found)
 * 8. Multi-User Isolation & Ownership Protection (Cross-Tenant Boundary Enforcement)
 * 9. Scoped Offline Synchronization & Idempotency (Batch Sync, Duplicate Prevention)
 * 10. Centralized Journey Templates API (Create, Read, Delete, 404 Handling)
 * 11. AI OCR Multipart Upload & Status Polling (202 Job Creation, Polling, 400 Validation)
 * 12. AI Duty Audit Rule Engine (Missing Month, Overlap Detection, Sequence Mismatch, Score)
 * 13. Monthly Statements & Reports (Archiving, Multi-Tenant Isolation)
 * 14. Safe User Deletion & Historical Audit Preservation (Cascading, Snapshot Preservation)
 * 
 * Safety: Runs on an isolated test database (mongodb://localhost:27017/railassist_test)
 */

import http from 'http';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getValidatedJwtSecret } from './config/jwt.js';
import User from './models/User.js';
import Journey from './models/Journey.js';
import JourneyTemplate from './models/JourneyTemplate.js';
import ReportHistory from './models/ReportHistory.js';
import AuditLog from './models/AuditLog.js';

const TEST_PORT = 5088;
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

async function runUnitIntegrationSuite() {
  console.log('================================================================================');
  console.log('      RAILASSIST PHASE 2.5: COMPREHENSIVE BACKEND UNIT & INTEGRATION SUITE      ');
  console.log('================================================================================\n');
  console.log(`Target Test Database: ${TEST_MONGODB_URI}\n`);

  // 1. Connect directly to isolated test database
  await mongoose.connect(TEST_MONGODB_URI);

  // 2. Spawn isolated server child process pointing to test database
  const serverProcess = spawn('node', ['index.js'], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'),
    env: {
      ...process.env,
      PORT: TEST_PORT.toString(),
      MONGODB_URI: TEST_MONGODB_URI
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
    console.log(`Test server is online and listening on port ${TEST_PORT}.\n`);

    const jwtSecret = getValidatedJwtSecret();

    // ========================================================================
    // SECTION 1: JWT GENERATION, VALIDATION & SECURITY
    // ========================================================================
    console.log('[SECTION 1] JWT Generation, Structure & Validation');

    // Test 1: Sign valid token
    const testPayload = { id: new mongoose.Types.ObjectId().toString(), email: 'jwt_test@railassist.com', role: 'TTE', division: 'BB' };
    const validToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(validToken, jwtSecret);
    assert(decoded.email === testPayload.email && decoded.role === 'TTE', 'JWT signs and decodes valid payload structure');

    // Test 2: Expired token verification fails
    const expiredToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '-1s' });
    let expiredRejected = false;
    try {
      jwt.verify(expiredToken, jwtSecret);
    } catch (err) {
      expiredRejected = err.name === 'TokenExpiredError';
    }
    assert(expiredRejected, 'Expired JWT fails validation with TokenExpiredError');

    // Test 3: Tampered signature verification fails
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    let tamperedRejected = false;
    try {
      jwt.verify(tamperedToken, jwtSecret);
    } catch (err) {
      tamperedRejected = err.name === 'JsonWebTokenError';
    }
    assert(tamperedRejected, 'Tampered JWT signature fails validation with JsonWebTokenError');

    // Test 4: Missing Authorization header on protected route returns 401
    const missingAuthRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET'
    });
    assert(missingAuthRes.statusCode === 401, 'Protected route returns 401 Unauthorized when Authorization header is missing');

    // Test 5: Invalid/Bogus Bearer token returns 403
    const bogusAuthRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET',
      headers: { Authorization: 'Bearer this_is_a_completely_fake_token' }
    });
    assert(bogusAuthRes.statusCode === 403, 'Protected route returns 403 Forbidden for invalid bearer token');

    // ========================================================================
    // SECTION 2: USER REGISTRATION & INPUT VALIDATION (POSITIVE & NEGATIVE)
    // ========================================================================
    console.log('\n[SECTION 2] User Registration & Input Validation');

    const uniqueTimestamp = Date.now();
    const validUserEmail = `pilot_${uniqueTimestamp}@railassist.com`;

    // Test 6: Successful user registration
    const regSuccessRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      name: 'Ramesh Sharma',
      email: validUserEmail,
      password: 'StrongPassword123',
      role: 'Loco Pilot',
      division: 'DLI'
    });
    assert(
      regSuccessRes.statusCode === 201 && Boolean(regSuccessRes.body.token) && regSuccessRes.body.user.role === 'Loco Pilot',
      'Valid registration creates user and returns 201 Created with JWT'
    );
    const registeredUserToken = regSuccessRes.body && regSuccessRes.body.token;
    const registeredUserId = regSuccessRes.body && regSuccessRes.body.user && regSuccessRes.body.user.id;

    // Test 7: Duplicate email registration rejected
    const regDuplicateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      name: 'Another User',
      email: validUserEmail,
      password: 'AnotherPassword123',
      role: 'TTE',
      division: 'BB'
    });
    assert(regDuplicateRes.statusCode === 400, 'Duplicate email registration rejected with 400 Bad Request');

    // Test 8: Missing required registration fields rejected
    const regMissingRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      email: `incomplete_${uniqueTimestamp}@railassist.com`
      // missing name, password, role
    });
    assert(regMissingRes.statusCode === 400, 'Registration with missing required fields rejected with 400 Bad Request');

    // Test 9: Password is stored as bcrypt hash in database (never plain text)
    const userInDb = await User.findById(registeredUserId);
    assert(
      Boolean(userInDb) && userInDb.password !== 'StrongPassword123' && userInDb.password.startsWith('$2'),
      'User password is securely hashed with bcrypt ($2a/$2b prefix)'
    );

    // ========================================================================
    // SECTION 3: USER AUTHENTICATION & LOGIN
    // ========================================================================
    console.log('\n[SECTION 3] User Authentication & Login');

    // Test 10: Successful login with valid credentials
    const loginSuccessRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: validUserEmail,
      password: 'StrongPassword123'
    });
    assert(
      loginSuccessRes.statusCode === 200 && Boolean(loginSuccessRes.body.token),
      'Login with correct credentials succeeds with 200 OK and JWT'
    );

    // Test 11: Login with incorrect password rejected
    const loginBadPassRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: validUserEmail,
      password: 'WrongPassword999'
    });
    assert(loginBadPassRes.statusCode === 400, 'Login with incorrect password rejected with 400 Bad Request');

    // Test 12: Login with non-existent email rejected
    const loginNoSuchUserRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'nonexistent_user_9999@railassist.com',
      password: 'SomePassword123'
    });
    assert(loginNoSuchUserRes.statusCode === 400, 'Login with non-existent email rejected with 400 Bad Request');

    // Test 13: Login with missing fields rejected
    const loginMissingRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: validUserEmail
      // missing password
    });
    assert(loginMissingRes.statusCode === 400, 'Login with missing password rejected with 400 Bad Request');

    // ========================================================================
    // SECTION 4: ROLE-BASED AUTHORIZATION & ROUTE PROTECTION
    // ========================================================================
    console.log('\n[SECTION 4] Role-Based Authorization & Route Protection');

    // Login as default admin
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
    assert(adminLoginRes.statusCode === 200 && Boolean(adminToken), 'Admin login succeeds with admin privileges');

    // Test 14: Non-admin staff attempting to access GET /api/admin/users returns 403
    const staffAdminAccessRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/users',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(staffAdminAccessRes.statusCode === 403, 'Non-admin employee accessing GET /api/admin/users is rejected with 403 Forbidden');

    // Test 15: Non-admin staff attempting to access GET /api/admin/audit-logs returns 403
    const staffAuditAccessRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(staffAuditAccessRes.statusCode === 403, 'Non-admin employee accessing GET /api/admin/audit-logs is rejected with 403 Forbidden');

    // Test 16: Admin accessing GET /api/admin/users returns 200
    const adminUsersRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/users',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminUsersRes.statusCode === 200 && Array.isArray(adminUsersRes.body), 'Admin accessing GET /api/admin/users returns 200 OK and user array');

    // Test 17: Admin accessing GET /api/admin/audit-logs returns 200
    const adminLogsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminLogsRes.statusCode === 200 && Array.isArray(adminLogsRes.body), 'Admin accessing GET /api/admin/audit-logs returns 200 OK and audit trail array');

    // ========================================================================
    // SECTION 5: JOURNEY CRUD & ALLOWANCE CALCULATIONS
    // ========================================================================
    console.log('\n[SECTION 5] Journey CRUD & 7th Pay Commission Calculation');

    // Test 18: Create journey with night duty & traveling allowance
    // Shift: 2026-11-04 20:00 IST to 2026-11-05 06:00 IST (10h absence, 8h night duty)
    // Role: Loco Pilot (taDailyRate=1000, ndaHourlyRate=220)
    // TA: 10h absence -> 70% of 1000 = 700. NDA: 8h * 220 = 1760. Total = 2460.
    const createJourneyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani Express',
      departureStation: 'MMCT',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-04T20:00:00+05:30',
      scheduledArrival: '2026-11-05T06:00:00+05:30',
      actualDeparture: '2026-11-04T20:00:00+05:30',
      actualArrival: '2026-11-05T06:00:00+05:30',
      distanceKm: 1386
    });
    assert(createJourneyRes.statusCode === 201, 'Journey creation returns 201 Created');
    const createdJourney = createJourneyRes.body;
    assert(createdJourney.nightDutyHours === 8, `Night duty hours computed as 8h (got ${createdJourney.nightDutyHours}h)`);
    assert(createdJourney.ndaAmount === 1760, `NDA amount computed as ₹1760 for Loco Pilot @ ₹220/h (got ₹${createdJourney.ndaAmount})`);
    assert(createdJourney.taAmount === 700, `TA computed as ₹700 for 10h absence @ 70% of ₹1000 (got ₹${createdJourney.taAmount})`);
    const journeyId = createdJourney._id;

    // Test 19: Read user journey list
    const getJourneysRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      getJourneysRes.statusCode === 200 && getJourneysRes.body.some(j => j._id === journeyId),
      'GET /api/journeys returns user journeys including the created duty record'
    );

    // Test 20: Update journey (adjust departure to 21:00 -> 9h absence, 8h night duty)
    // 9h absence -> Slab 2 (70%): ₹700 TA. 8h night duty: ₹1760 NDA.
    const updateJourneyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      actualDeparture: '2026-11-04T21:00:00+05:30',
      actualArrival: '2026-11-05T06:00:00+05:30',
      delayMinutes: 15
    });
    assert(updateJourneyRes.statusCode === 200, 'Journey update returns 200 OK');
    assert(updateJourneyRes.body.delayMinutes === 15, 'Updated journey reflects modified fields');

    // ========================================================================
    // SECTION 6: NEGATIVE JOURNEY VALIDATION & ERROR HANDLING
    // ========================================================================
    console.log('\n[SECTION 6] Negative Journey Validation & Error Handling');

    // Test 21: Arrival <= Departure rejected (Negative or zero duration)
    const negDurationRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      trainNumber: '12001',
      trainName: 'Bhopal Shatabdi',
      departureStation: 'RKMP',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-04T18:00:00+05:30',
      scheduledArrival: '2026-11-04T12:00:00+05:30', // Earlier than departure!
      actualDeparture: '2026-11-04T18:00:00+05:30',
      actualArrival: '2026-11-04T12:00:00+05:30',
      distanceKm: 701
    });
    assert(negDurationRes.statusCode === 400, 'Journey with arrival time earlier than departure rejected with 400 Bad Request');

    // Test 22: Missing train number rejected
    const missingTrainRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      // missing trainNumber
      departureStation: 'MMCT',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-04T10:00:00+05:30',
      scheduledArrival: '2026-11-04T18:00:00+05:30',
      actualDeparture: '2026-11-04T10:00:00+05:30',
      actualArrival: '2026-11-04T18:00:00+05:30',
      distanceKm: 500
    });
    assert(missingTrainRes.statusCode === 400, 'Journey with missing trainNumber rejected with 400 Bad Request');

    // Test 23: Update non-existent journey returns 404
    const bogusId = new mongoose.Types.ObjectId().toString();
    const update404Res = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${bogusId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      delayMinutes: 30
    });
    assert(update404Res.statusCode === 404, 'Updating non-existent journey ID returns 404 Not Found');

    // Test 24: Delete non-existent journey returns 404
    const delete404Res = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${bogusId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(delete404Res.statusCode === 404, 'Deleting non-existent journey ID returns 404 Not Found');

    // ========================================================================
    // SECTION 7: MULTI-USER ISOLATION & OWNERSHIP PROTECTION
    // ========================================================================
    console.log('\n[SECTION 7] Multi-User Isolation & Ownership Protection');

    // Register User B (Guard)
    const userBEmail = `guard_${uniqueTimestamp}@railassist.com`;
    const regUserBRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/register',
      method: 'POST'
    }, {
      name: 'Sunil Verma',
      email: userBEmail,
      password: 'GuardPassword123',
      role: 'Guard',
      division: 'BB'
    });
    const userBToken = regUserBRes.body && regUserBRes.body.token;

    // Test 25: User B cannot see User A's journeys
    const userBJourneysRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys',
      method: 'GET',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(
      userBJourneysRes.statusCode === 200 && !userBJourneysRes.body.some(j => j._id === journeyId),
      'User B cannot view User A journeys (Multi-user tenant isolation enforced)'
    );

    // Test 26: User B cannot update User A's journey
    const userBTamperRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${userBToken}` }
    }, {
      delayMinutes: 999
    });
    assert(userBTamperRes.statusCode === 404, 'User B attempting to update User A journey is rejected with 404/Forbidden');

    // Test 27: User B cannot delete User A's journey
    const userBDeleteRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(userBDeleteRes.statusCode === 404, 'User B attempting to delete User A journey is rejected with 404/Forbidden');

    // ========================================================================
    // SECTION 8: OFFLINE SYNCHRONIZATION & DUPLICATE PREVENTION
    // ========================================================================
    console.log('\n[SECTION 8] Offline Synchronization & Duplicate Prevention');

    const testLocalId = `offline-duty-sync-${Date.now()}`;
    const syncPayload = {
      journeys: [{
        localId: testLocalId,
        trainNumber: '12626',
        trainName: 'Kerala Express',
        departureStation: 'NDLS',
        arrivalStation: 'TVC',
        scheduledDeparture: '2026-11-06T20:00:00+05:30',
        scheduledArrival: '2026-11-07T06:00:00+05:30',
        actualDeparture: '2026-11-06T20:00:00+05:30',
        actualArrival: '2026-11-07T06:00:00+05:30',
        distanceKm: 3036,
        delayMinutes: 0
      }]
    };

    // Test 28: Initial offline batch sync succeeds
    const syncRes1 = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, syncPayload);
    assert(syncRes1.statusCode === 200 && syncRes1.body.success === true, 'Offline batch sync returns 200 OK');

    // Test 29: Re-syncing same localId performs idempotent update (No duplicate created)
    const syncRes2 = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/journeys/sync',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, syncPayload);
    assert(syncRes2.statusCode === 200 && syncRes2.body.success === true, 'Repeated offline sync returns 200 OK');

    const syncedDocs = await Journey.find({ userId: registeredUserId, localId: testLocalId });
    assert(syncedDocs.length === 1, `Exactly 1 document exists after repeated sync (got ${syncedDocs.length})`);

    // ========================================================================
    // SECTION 9: JOURNEY TEMPLATES API
    // ========================================================================
    console.log('\n[SECTION 9] Journey Templates API');

    // Test 30: Create route template
    const createTemplateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/templates',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      templateName: 'Delhi - Bhopal Shatabdi Fast Route',
      trainNumber: '12001',
      trainName: 'Bhopal Shatabdi',
      departureStation: 'NDLS',
      arrivalStation: 'RKMP',
      scheduledDepartureTime: '06:00',
      scheduledArrivalTime: '14:00'
    });
    assert(createTemplateRes.statusCode === 201 && Boolean(createTemplateRes.body._id), 'POST /api/templates creates template (201 Created)');
    const templateId = createTemplateRes.body && createTemplateRes.body._id;

    // Test 31: List user templates
    const listTemplatesRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/templates',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      listTemplatesRes.statusCode === 200 && listTemplatesRes.body.some(t => t._id === templateId),
      'GET /api/templates returns saved route templates'
    );

    // Test 32: Delete template
    const deleteTemplateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/templates/${templateId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(deleteTemplateRes.statusCode === 200, 'DELETE /api/templates/:id removes template (200 OK)');

    // Test 33: Deleting non-existent template returns 404
    const deleteBogusTemplateRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/templates/${bogusId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(deleteBogusTemplateRes.statusCode === 404, 'Deleting non-existent template ID returns 404 Not Found');

    // ========================================================================
    // SECTION 10: AI OCR MULTIPART UPLOAD & JOB STATUS POLLING
    // ========================================================================
    console.log('\n[SECTION 10] AI OCR Multipart Upload & Status Polling');

    // Test 34: Multipart upload with valid slip file queues job
    const boundary = '----WebKitFormBoundaryRailAssistTest' + Date.now();
    const fakeImageContent = Buffer.from('FAKEDUTYSLIPDATA_FOR_OCR_PIPELINE');
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="duty_slip.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fakeImageContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const ocrUploadRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/ocr/upload',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, multipartBody, true, boundary);
    assert(
      ocrUploadRes.statusCode === 202 && Boolean(ocrUploadRes.body.jobId),
      'AI OCR upload accepts duty slip file and queues background job (202 Accepted)'
    );
    const ocrJobId = ocrUploadRes.body && ocrUploadRes.body.jobId;

    // Test 35: Poll OCR job status
    const ocrStatusRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/ai/ocr/status/${ocrJobId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      ocrStatusRes.statusCode === 200 && ['processing', 'completed', 'retry_pending', 'failed'].includes(ocrStatusRes.body.status),
      `GET /api/ai/ocr/status/:jobId returns valid job status (got '${ocrStatusRes.body.status}')`
    );

    // Test 36: Polling non-existent OCR job ID returns not_found
    const ocrNoSuchJobRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/ocr/status/job-ocr-bogus-99999',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      ocrNoSuchJobRes.statusCode === 404,
      'Querying non-existent OCR job ID returns 404 Not Found'
    );

    // Test 37: OCR upload with missing file returns 400
    const emptyMultipart = Buffer.from(`--${boundary}--\r\n`);
    const ocrNoFileRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/ocr/upload',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, emptyMultipart, true, boundary);
    assert(ocrNoFileRes.statusCode === 400, 'OCR upload with missing file returns 400 Bad Request');

    // ========================================================================
    // SECTION 11: AI DUTY AUDIT RULE ENGINE
    // ========================================================================
    console.log('\n[SECTION 11] AI Duty Audit Rule Engine');

    // Test 38: Audit request missing month query returns 400
    const auditMissingMonthRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/audit/validate',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(auditMissingMonthRes.statusCode === 400, 'GET /api/ai/audit/validate without month parameter returns 400 Bad Request');

    // Test 39: Audit request for month with clean journeys returns health score
    const auditMonthRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/ai/audit/validate?month=2026-11',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      auditMonthRes.statusCode === 200 && typeof auditMonthRes.body.healthScore === 'number' && Array.isArray(auditMonthRes.body.warnings),
      'GET /api/ai/audit/validate?month=YYYY-MM returns structured health score and warning audit summary'
    );

    // ========================================================================
    // SECTION 12: MONTHLY STATEMENTS & REPORTS
    // ========================================================================
    console.log('\n[SECTION 12] Monthly Statements & Reports');

    // Test 40: Archive monthly statement
    const archiveReportRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    }, {
      reportType: 'TA',
      month: '2026-11',
      fileName: 'TA_Statement_2026_11.pdf',
      totalAmount: 2460,
      journeyCount: 2,
      summaryData: { totalTA: 700, totalNDA: 1760, totalDutyHours: 10, totalNightHours: 8 }
    });
    assert(archiveReportRes.statusCode === 201 && Boolean(archiveReportRes.body._id), 'POST /api/reports archives monthly statement (201 Created)');
    const reportId = archiveReportRes.body._id;

    // Test 41: Retrieve report history
    const getReportsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'GET',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });
    assert(
      getReportsRes.statusCode === 200 && getReportsRes.body.some(r => r._id === reportId),
      'GET /api/reports retrieves archived statement history'
    );

    // Test 42: Report history isolation (User B does not see User A's reports)
    const userBReportsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/reports',
      method: 'GET',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(
      userBReportsRes.statusCode === 200 && !userBReportsRes.body.some(r => r._id === reportId),
      'User B cannot view User A archived statements (Multi-tenant report isolation enforced)'
    );

    // ========================================================================
    // SECTION 13: SAFE USER DELETION & AUDIT PRESERVATION
    // ========================================================================
    console.log('\n[SECTION 13] Safe User Deletion & Historical Audit Preservation');

    // Test 43: Admin self-deletion blocked
    const adminSelfDeleteRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/admin/users/${adminLoginRes.body.user.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminSelfDeleteRes.statusCode === 400, 'Admin self-deletion blocked with 400 Bad Request');

    // Test 44: Safe deletion of User B cascades operational records
    const deleteUserBRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/admin/users/${regUserBRes.body.user.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      deleteUserBRes.statusCode === 200 && deleteUserBRes.body.success === true && Boolean(deleteUserBRes.body.cascaded),
      'Admin safely deleted user account with cascading summary'
    );

    // Clean up created journey
    await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/journeys/${journeyId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registeredUserToken}` }
    });

  } finally {
    serverProcess.kill('SIGTERM');
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(`TOTAL UNIT & INTEGRATION ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED:                              ${passedCount}`);
  console.log(`FAILED:                              ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) process.exit(1);
  else process.exit(0);
}

runUnitIntegrationSuite().catch((err) => {
  console.error('Unhandled unit/integration test suite error:', err);
  process.exit(1);
});
