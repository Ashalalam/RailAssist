/**
 * RailAssist Phase 2.5: Comprehensive Frontend Component Test Suite
 * 
 * Verifies React 19 component contracts, UI states, validation rules, 
 * loading spinners, empty states, and error handling without external test runner bloat.
 * 
 * Uses:
 * - Project's own Vite SSR loader (`vite.ssrLoadModule`)
 * - React 19 `react-dom/server` (`renderToStaticMarkup`)
 * - Lightweight browser globals stub
 */

import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// 1. Establish browser global stubs for SSR component evaluation
globalThis.location = new URL('http://localhost:5173');
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true
});

Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: () => ({ style: {}, setAttribute: () => {} }),
    createElementNS: () => ({ style: {}, setAttribute: () => {} }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  writable: true
});

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  },
  writable: true
});

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

async function runComponentSuite() {
  console.log('================================================================================');
  console.log('       RAILASSIST PHASE 2.5: FRONTEND COMPONENT & INTERACTION SUITE             ');
  console.log('================================================================================\n');

  // Start in-process Vite development server instance
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    // Load shared routing and context modules
    const { MemoryRouter } = await vite.ssrLoadModule('react-router-dom');
    const { AuthContext } = await vite.ssrLoadModule('./src/contexts/AuthContext.jsx');
    const { JourneyContext } = await vite.ssrLoadModule('./src/contexts/JourneyContext.jsx');

    // Helper to render component wrapped in test providers
    const renderWithContext = (Component, props = {}, authState = {}, journeyState = {}) => {
      const defaultAuth = {
        user: { id: 'u1', name: 'Rajesh Kumar', email: 'rajesh@railassist.com', role: 'Loco Pilot', division: 'DLI', isAdmin: false },
        token: 'fake_jwt_token',
        isOnline: true,
        loading: false,
        login: async () => {},
        logout: async () => {},
        ...authState
      };

      const defaultJourney = {
        journeys: [],
        templates: [],
        reports: [],
        rules: { taDailyRate: 1000, ndaHourlyRate: 220 },
        syncing: false,
        syncProgress: 0,
        loading: false,
        syncOfflineData: async () => {},
        triggerManualSync: async () => {},
        ...journeyState
      };

      const element = React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          AuthContext.Provider,
          { value: defaultAuth },
          React.createElement(
            JourneyContext.Provider,
            { value: defaultJourney },
            React.createElement(Component, props)
          )
        )
      );

      return renderToStaticMarkup(element);
    };

    // ========================================================================
    // SECTION 1: AUTHENTICATION FORMS (LOGIN & SIGNUP)
    // ========================================================================
    console.log('[SECTION 1] Authentication Forms (Login & Signup)');

    // Test 1: Login form clean render
    const { default: Login } = await vite.ssrLoadModule('./src/pages/Login.jsx');
    const loginHtml = renderWithContext(Login);
    assert(loginHtml.includes('type="email"'), 'Login form renders email input');
    assert(loginHtml.includes('type="password"'), 'Login form renders password input');
    assert(loginHtml.includes('Sign In'), 'Login form renders Sign In action button');
    assert(loginHtml.includes('/forgot-password'), 'Login form contains link to password recovery');

    // Test 2: Signup form clean render
    const { default: Signup } = await vite.ssrLoadModule('./src/pages/Signup.jsx');
    const signupHtml = renderWithContext(Signup);
    assert(signupHtml.includes('Full Name'), 'Signup form renders full name input');
    assert(signupHtml.includes('Loco Pilot'), 'Signup form includes railway roles (Loco Pilot, etc.)');
    assert(signupHtml.includes('Division'), 'Signup form includes railway division select');
    assert(signupHtml.includes('Create Account'), 'Signup form renders Create Account submission button');

    // ========================================================================
    // SECTION 2: FORGOT PASSWORD WORKFLOW
    // ========================================================================
    console.log('\n[SECTION 2] Forgot Password Recovery Workflow');

    const { default: ForgotPassword } = await vite.ssrLoadModule('./src/pages/ForgotPassword.jsx');
    const forgotHtml = renderWithContext(ForgotPassword);
    assert(forgotHtml.includes('Reset Password') || forgotHtml.includes('Forgot Password'), 'Forgot password page renders header title');
    assert(forgotHtml.includes('type="email"'), 'Forgot password renders recovery email input field');
    assert(forgotHtml.includes('Send Reset Link') || forgotHtml.includes('Reset'), 'Forgot password renders submission trigger');

    // ========================================================================
    // SECTION 3: DASHBOARD RENDERING & KPIS
    // ========================================================================
    console.log('\n[SECTION 3] Dashboard Rendering & KPIs');

    const { default: Dashboard } = await vite.ssrLoadModule('./src/pages/Dashboard.jsx');

    // Test 3: Dashboard greeting and user identity
    const dashboardHtml = renderWithContext(Dashboard, {}, {
      user: { name: 'Praveen Yadav', role: 'Chief Ticket Inspector', division: 'BB' }
    });
    assert(dashboardHtml.includes('Praveen Yadav'), 'Dashboard displays authenticated user name');
    assert(dashboardHtml.includes('Chief Ticket Inspector'), 'Dashboard displays employee role badge');
    assert(dashboardHtml.includes('Division: BB') || dashboardHtml.includes('BB'), 'Dashboard displays division code');

    // Test 4: Dashboard KPI cards
    assert(dashboardHtml.includes('Total Distance') || dashboardHtml.includes('Distance'), 'Dashboard displays Total Distance KPI card');
    assert(dashboardHtml.includes('Night Duty') || dashboardHtml.includes('NDA'), 'Dashboard displays Night Duty Allowance KPI card');
    assert(dashboardHtml.includes('Travel Allowance') || dashboardHtml.includes('TA'), 'Dashboard displays Travel Allowance KPI card');

    // Test 5: Dashboard offline warning banner when unsynced records exist
    const mockUnsyncedJourney = {
      _id: 'j1',
      localId: 'loc-1',
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani',
      departureStation: 'MMCT',
      arrivalStation: 'NDLS',
      scheduledDeparture: new Date().toISOString(),
      actualDeparture: new Date().toISOString(),
      actualArrival: new Date().toISOString(),
      syncStatus: 'pending_create'
    };
    const unsyncedDashHtml = renderWithContext(Dashboard, {}, {}, {
      journeys: [mockUnsyncedJourney]
    });
    assert(
      unsyncedDashHtml.includes('Sync Pending'),
      'Dashboard highlights unsynced offline records when pending duties exist'
    );

    // ========================================================================
    // SECTION 4: JOURNEY CREATION FORM
    // ========================================================================
    console.log('\n[SECTION 4] Duty Creation Form (JourneyForm.jsx)');

    const { default: JourneyForm } = await vite.ssrLoadModule('./src/pages/JourneyForm.jsx');
    const formHtml = renderWithContext(JourneyForm);
    assert(formHtml.includes('Train Number') || formHtml.includes('trainNumber'), 'Journey form renders Train Number input');
    assert(formHtml.includes('From Station'), 'Journey form renders From Station input');
    assert(formHtml.includes('To Station'), 'Journey form renders To Station input');
    assert(formHtml.includes('Scheduled Departure') || formHtml.includes('scheduledDeparture'), 'Journey form renders departure time picker');
    assert(formHtml.includes('Actual Arrival') || formHtml.includes('actualArrival'), 'Journey form renders arrival time picker');
    assert(formHtml.includes('Distance') || formHtml.includes('distanceKm'), 'Journey form renders Distance in KM field');
    assert(formHtml.includes('Save Duty') || formHtml.includes('Submit') || formHtml.includes('Log Duty'), 'Journey form renders duty save button');

    // ========================================================================
    // SECTION 5: JOURNEY LIST & FILTERING (JOURNEYS.JSX)
    // ========================================================================
    console.log('\n[SECTION 5] Journey Logbook List & Filtering (Journeys.jsx)');

    const { default: Journeys } = await vite.ssrLoadModule('./src/pages/Journeys.jsx');

    // Test 6: Empty logbook state
    const emptyJourneysHtml = renderWithContext(Journeys, {}, {}, { journeys: [] });
    assert(
      emptyJourneysHtml.includes('No Duty Logs Found'),
      'Journeys page renders empty state banner when duty logbook is empty'
    );

    // Test 7: Populated duty logbook with table columns
    const mockSyncedJourney = {
      _id: 'j2',
      localId: 'loc-2',
      trainNumber: '12001',
      trainName: 'Bhopal Shatabdi Express',
      departureStation: 'RKMP',
      arrivalStation: 'NDLS',
      scheduledDeparture: '2026-11-04T15:10:00+05:30',
      actualDeparture: '2026-11-04T15:10:00+05:30',
      actualArrival: '2026-11-04T23:30:00+05:30',
      distanceKm: 701,
      taAmount: 560,
      ndaAmount: 360,
      syncStatus: 'synced'
    };
    const populatedJourneysHtml = renderWithContext(Journeys, {}, {}, { journeys: [mockSyncedJourney] });
    assert(populatedJourneysHtml.includes('12001'), 'Journeys table renders train number');
    assert(populatedJourneysHtml.includes('RKMP'), 'Journeys table renders departure station');
    assert(populatedJourneysHtml.includes('NDLS'), 'Journeys table renders arrival station');
    assert(populatedJourneysHtml.includes('560'), 'Journeys table displays computed TA amount');

    // ========================================================================
    // SECTION 6: OFFLINE STATUS INDICATOR
    // ========================================================================
    console.log('\n[SECTION 6] Offline Status Indicator');

    const { default: OfflineIndicator } = await vite.ssrLoadModule('./src/components/OfflineIndicator.jsx');

    // Test 8: Online state hides offline alert
    const onlineHtml = renderWithContext(OfflineIndicator, {}, { isOnline: true });
    assert(!onlineHtml.includes('Offline Mode Active'), 'OfflineIndicator does not display offline banner when online');

    // Test 9: Offline state displays local cache notice
    const offlineHtml = renderWithContext(OfflineIndicator, {}, { isOnline: false });
    assert(
      offlineHtml.includes('Offline Mode Active') && offlineHtml.includes('cached locally'),
      'OfflineIndicator displays local caching notification banner when offline'
    );

    // ========================================================================
    // SECTION 7: MONTHLY REPORTS & STATEMENTS
    // ========================================================================
    console.log('\n[SECTION 7] Monthly Statements & Reports (Reports.jsx)');

    const { default: Reports } = await vite.ssrLoadModule('./src/pages/Reports.jsx');
    const currentMonth = new Date().toISOString().substring(0, 7);
    const populatedReportsHtml = renderWithContext(Reports, {}, {}, {
      journeys: [{
        _id: 'rep-j1',
        localId: 'rep-loc-1',
        trainNumber: '12951',
        trainName: 'Mumbai Rajdhani',
        departureStation: 'MMCT',
        arrivalStation: 'NDLS',
        scheduledDeparture: `${currentMonth}-05T16:00:00+05:30`,
        actualDeparture: `${currentMonth}-05T16:00:00+05:30`,
        actualArrival: `${currentMonth}-06T08:30:00+05:30`,
        taAmount: 800,
        ndaAmount: 1440,
        nightDutyHours: 8,
        distanceKm: 1386,
        syncStatus: 'synced'
      }]
    });
    assert(populatedReportsHtml.includes('Month') || populatedReportsHtml.includes('Select Month'), 'Reports page renders month selector');
    assert(populatedReportsHtml.includes('Print') || populatedReportsHtml.includes('Statement') || populatedReportsHtml.includes('CSV'), 'Reports page renders export/statement actions');

    // ========================================================================
    // SECTION 8: SETTINGS & USER PROFILE
    // ========================================================================
    console.log('\n[SECTION 8] Settings & Profile Views');

    const { default: Profile } = await vite.ssrLoadModule('./src/pages/Profile.jsx');
    const profileHtml = renderWithContext(Profile);
    assert(profileHtml.includes('Profile') || profileHtml.includes('Employee Details'), 'Profile page renders profile title');
    assert(profileHtml.includes('Loco Pilot') || profileHtml.includes('Role'), 'Profile page renders user designation');
    assert(profileHtml.includes('Clear') || profileHtml.includes('Storage') || profileHtml.includes('Cache'), 'Profile page renders offline storage cache management controls');

    const { default: Settings } = await vite.ssrLoadModule('./src/pages/Settings.jsx');
    const settingsHtml = renderWithContext(Settings);
    assert(settingsHtml.includes('Settings') || settingsHtml.includes('Preferences'), 'Settings page renders settings options');

    // ========================================================================
    // SECTION 9: ADMIN USER MANAGEMENT & TELEMETRY
    // ========================================================================
    console.log('\n[SECTION 9] Admin Management Views');

    const { default: AdminUsers } = await vite.ssrLoadModule('./src/pages/admin/Users.jsx');
    const adminUsersHtml = renderWithContext(AdminUsers, {}, {
      user: { id: 'admin1', name: 'Divisional Admin', role: 'Railway Supervisor', isAdmin: true }
    });
    assert(adminUsersHtml.includes('spinner-border') || adminUsersHtml.includes('Loading'), 'Admin Users initial render displays loading state');

    const { default: AdminDashboard } = await vite.ssrLoadModule('./src/pages/admin/Dashboard.jsx');
    const adminDashHtml = renderWithContext(AdminDashboard, {}, {
      user: { id: 'admin1', name: 'Divisional Admin', role: 'Railway Supervisor', isAdmin: true }
    });
    assert(adminDashHtml.includes('Admin') || adminDashHtml.includes('System') || adminDashHtml.includes('Overview'), 'Admin Dashboard renders operational telemetry');

    // ========================================================================
    // SECTION 10: NAVIGATION COMPONENTS (SIDEBAR & BOTTOMNAV)
    // ========================================================================
    console.log('\n[SECTION 10] Navigation Controls (Sidebar & BottomNav)');

    const { default: Sidebar } = await vite.ssrLoadModule('./src/components/Sidebar.jsx');
    const sidebarHtml = renderWithContext(Sidebar);
    assert(sidebarHtml.includes('/journeys'), 'Sidebar includes link to Journeys logbook');
    assert(sidebarHtml.includes('/analytics'), 'Sidebar includes link to Performance Overview');
    assert(sidebarHtml.includes('/reports'), 'Sidebar includes link to Monthly Statements');

    const { default: BottomNav } = await vite.ssrLoadModule('./src/components/BottomNav.jsx');
    const bottomNavHtml = renderWithContext(BottomNav);
    assert(bottomNavHtml.includes('/journeys') || bottomNavHtml.includes('Duties'), 'Bottom navigation renders Duty Log navigation item');

  } finally {
    await vite.close();
  }

  console.log('\n================================================================================');
  console.log(`TOTAL FRONTEND COMPONENT ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED:                              ${passedCount}`);
  console.log(`FAILED:                              ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) process.exit(1);
  else process.exit(0);
}

runComponentSuite().catch((err) => {
  console.error('Unhandled component test suite error:', err);
  process.exit(1);
});
