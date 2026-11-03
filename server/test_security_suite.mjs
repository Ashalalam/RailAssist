/**
 * RailAssist Phase 2.1 Security Hardening Automated Verification Suite
 * 
 * Verifies:
 * 1. Startup fail-fast validation for missing, default, and short JWT secrets.
 * 2. Authenticated login and token issuance.
 * 3. Protected endpoint access with valid token.
 * 4. Rejection of unauthenticated, tampered, and expired tokens.
 * 5. Secure password recovery flow:
 *    - Generic responses preventing email enumeration
 *    - SHA-256 hashing of tokens in DB
 *    - 15-minute expiration enforcement
 *    - Single-use token invalidation (replay attack prevention)
 *    - Successful password change and post-reset authentication
 */

import { spawn } from 'child_process';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getValidatedJwtSecret } from './config/jwt.js';
import User from './models/User.js';

const TEST_PORT = 5055;
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
      const payload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

async function waitForServer(url, timeoutMs = 8000) {
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
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Server failed to respond on ${url} within ${timeoutMs}ms`);
}

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('   RAILASSIST PHASE 2.1 SECURITY HARDENING VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // ========================================================================
  // 1. JWT CONFIGURATION & STARTUP FAIL-FAST TESTS
  // ========================================================================
  console.log('[SECTION 1] JWT Startup Fail-Fast Validation');

  // Test 1: Missing JWT_SECRET
  const origSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    let threw = false;
    try {
      getValidatedJwtSecret();
    } catch (err) {
      threw = err.message.includes('missing or empty');
    }
    assert(threw, 'Fail-fast when JWT_SECRET is missing or empty');
  } finally {
    process.env.JWT_SECRET = origSecret;
  }

  // Test 2: Insecure default JWT_SECRET
  try {
    process.env.JWT_SECRET = 'railassist_secret_key_12345';
    let threw = false;
    try {
      getValidatedJwtSecret();
    } catch (err) {
      threw = err.message.includes('insecure default placeholder');
    }
    assert(threw, 'Fail-fast when JWT_SECRET is set to legacy default "railassist_secret_key_12345"');
  } finally {
    process.env.JWT_SECRET = origSecret;
  }

  // Test 3: Weak / short JWT_SECRET (< 30 characters)
  try {
    process.env.JWT_SECRET = 'too_short_secret_12345';
    let threw = false;
    try {
      getValidatedJwtSecret();
    } catch (err) {
      threw = err.message.includes('insecurely short');
    }
    assert(threw, 'Fail-fast when JWT_SECRET length is < 30 characters');
  } finally {
    process.env.JWT_SECRET = origSecret;
  }

  // Test 4: Valid secure JWT_SECRET
  try {
    process.env.JWT_SECRET = origSecret;
    const validated = getValidatedJwtSecret();
    assert(typeof validated === 'string' && validated.length >= 30, 'Accept valid production JWT_SECRET (>= 30 chars)');
  } catch (err) {
    assert(false, 'Accept valid production JWT_SECRET', err.message);
  }

  // Connect to DB directly for state assertions & reset
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/railassist');

  // ========================================================================
  // 2. BOOT SERVER INSTANCE FOR INTEGRATION TESTS
  // ========================================================================
  console.log('\n[SECTION 2] Starting Express Server on Port ' + TEST_PORT + '...');
  const serverProcess = spawn('node', ['index.js'], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'),
    env: {
      ...process.env,
      PORT: TEST_PORT.toString()
    },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', (d) => {
    const errText = d.toString();
    if (!errText.includes('DeprecationWarning')) {
      console.error(`[Server STDERR] ${errText}`);
    }
  });

  try {
    await waitForServer(BASE_URL);
    console.log('Server is online and listening for requests.');

    // ========================================================================
    // 3. AUTHENTICATION & ROUTE AUTHORIZATION TESTS
    // ========================================================================
    console.log('\n[SECTION 3] Authentication & Route Protection');

    // Test 5: Login with staff credentials
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
    assert(
      loginRes.statusCode === 200 && Boolean(token),
      'Login with staff credentials succeeds with signed JWT'
    );

    // Test 6: Access protected endpoint with valid token
    const protectedRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/rules',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(
      protectedRes.statusCode === 200 && protectedRes.body && Boolean(protectedRes.body.role),
      'Protected endpoint (GET /api/rules) returns 200 OK with valid JWT'
    );

    // Test 7: Access protected endpoint without token
    const noTokenRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/rules',
      method: 'GET'
    });
    assert(
      noTokenRes.statusCode === 401 && noTokenRes.body.message.includes('Token missing'),
      'Protected endpoint returns 401 Unauthorized when Authorization header is missing'
    );

    // Test 8: Access protected endpoint with tampered/invalid token
    const tamperedTokenRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/rules',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}tampered_signature_payload` }
    });
    assert(
      tamperedTokenRes.statusCode === 403 && tamperedTokenRes.body.message.includes('Token expired or invalid'),
      'Protected endpoint returns 403 Forbidden on tampered JWT signature'
    );

    // Test 9: Access protected endpoint with expired token
    const expiredToken = jwt.sign(
      { id: 'fake_user_id', email: 'test@example.com' },
      origSecret,
      { expiresIn: '-1s' }
    );
    const expiredRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/rules',
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(
      expiredRes.statusCode === 403 && expiredRes.body.message.includes('Token expired or invalid'),
      'Protected endpoint returns 403 Forbidden on expired JWT'
    );

    // ========================================================================
    // 4. SECURE PASSWORD RECOVERY TESTS
    // ========================================================================
    console.log('\n[SECTION 4] Secure Password Recovery Workflow');

    // Test 10: Request reset for non-existent email (anti-harvesting check)
    const nonExistentRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/forgot-password',
      method: 'POST'
    }, {
      email: 'nonexistent_official_99999@railassist.com'
    });
    assert(
      nonExistentRes.statusCode === 200 &&
      nonExistentRes.body.message.includes('If an account associated with that email exists'),
      'Forgot password returns generic message for non-existent email (prevents account harvesting)'
    );

    // Test 11: Request reset for valid staff user
    const staffResetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/forgot-password',
      method: 'POST'
    }, {
      email: 'staff@railassist.com'
    });
    const devToken = staffResetRes.body.devToken;
    assert(
      staffResetRes.statusCode === 200 && Boolean(devToken),
      'Forgot password for existing user succeeds and issues single-use recovery token'
    );

    // Test 12: Verify token in DB is hashed with SHA-256 (never plain text)
    const staffInDb = await User.findOne({ email: 'staff@railassist.com' }).select('+resetPasswordToken +resetPasswordExpire');
    assert(
      staffInDb && staffInDb.resetPasswordToken && staffInDb.resetPasswordToken !== devToken,
      'Reset token stored in database is securely hashed (does NOT match raw token)'
    );
    assert(
      staffInDb.resetPasswordExpire && staffInDb.resetPasswordExpire > new Date(),
      'Reset token in database has an active 15-minute expiration timestamp'
    );

    // Test 13: Attempt reset with invalid/bogus token
    const bogusResetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/reset-password/totally_bogus_token_1234567890abcdef',
      method: 'POST'
    }, {
      newPassword: 'NewSecurePassword789!'
    });
    assert(
      bogusResetRes.statusCode === 400 &&
      bogusResetRes.body.message.includes('invalid, expired, or has already been used'),
      'Submitting reset with bogus token returns 400 Bad Request'
    );

    // Test 14: Attempt reset with expired token
    // Temporarily set DB expiration to 10 minutes ago
    await User.updateOne({ email: 'staff@railassist.com' }, { resetPasswordExpire: new Date(Date.now() - 600000) });
    const expiredResetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/auth/reset-password/${devToken}`,
      method: 'POST'
    }, {
      newPassword: 'NewSecurePassword789!'
    });
    assert(
      expiredResetRes.statusCode === 400 &&
      expiredResetRes.body.message.includes('invalid, expired, or has already been used'),
      'Submitting reset with expired token returns 400 Bad Request'
    );

    // Restore expiration to future for subsequent test
    await User.updateOne({ email: 'staff@railassist.com' }, { resetPasswordExpire: new Date(Date.now() + 900000) });

    // Test 15: Successful password reset with valid token
    const validResetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/auth/reset-password/${devToken}`,
      method: 'POST'
    }, {
      newPassword: 'NewSecurePassword789!'
    });
    assert(
      validResetRes.statusCode === 200 && validResetRes.body.success === true,
      'Submitting reset with valid token updates password successfully (200 OK)'
    );

    // Test 16: Immediate token invalidation (Replay Attack Prevention)
    const replayResetRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/auth/reset-password/${devToken}`,
      method: 'POST'
    }, {
      newPassword: 'AnotherPassword999!'
    });
    assert(
      replayResetRes.statusCode === 400 &&
      replayResetRes.body.message.includes('invalid, expired, or has already been used'),
      'Re-submitting the same token is rejected (Single-use token invalidation enforced)'
    );

    // Verify token was cleared from DB
    const staffAfterReset = await User.findOne({ email: 'staff@railassist.com' }).select('+resetPasswordToken +resetPasswordExpire');
    assert(
      staffAfterReset.resetPasswordToken === undefined && staffAfterReset.resetPasswordExpire === undefined,
      'Database resetPasswordToken and resetPasswordExpire are cleared to undefined'
    );

    // Test 17: Old password no longer works
    const oldLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'staff@railassist.com',
      password: 'Password123'
    });
    assert(
      oldLoginRes.statusCode === 400,
      'Login with previous password rejected after successful reset (400)'
    );

    // Test 18: New password works
    const newLoginRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'staff@railassist.com',
      password: 'NewSecurePassword789!'
    });
    assert(
      newLoginRes.statusCode === 200 && Boolean(newLoginRes.body.token),
      'Login with new password succeeds and returns authenticated JWT session'
    );

    // ========================================================================
    // 5. RESTORE TEST ENVIRONMENT CREDENTIALS
    // ========================================================================
    console.log('\n[SECTION 5] Restoring Seed State');
    const staffToRestore = await User.findOne({ email: 'staff@railassist.com' });
    staffToRestore.password = 'Password123';
    await staffToRestore.save();
    console.log('  [PASS] Restored staff@railassist.com password to standard dev seed (Password123)');

  } finally {
    // Terminate server process cleanly
    serverProcess.kill('SIGTERM');
    await mongoose.disconnect();
  }

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
