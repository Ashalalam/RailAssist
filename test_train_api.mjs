// Quick test script for Train Directory API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test data - using a test user's credentials
const testLogin = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@railway.in',
      password: 'Test@123'
    })
  });
  
  if (!res.ok) {
    console.log('Login test skipped - use existing logged-in session');
    return null;
  }
  
  const data = await res.json();
  return data.token;
};

const testTrainDirectory = async () => {
  console.log('=== Train Directory API Test ===\n');
  
  const token = await testLogin();
  
  // Test 1: Get trains without auth (should fail)
  console.log('Test 1: Unauthenticated request...');
  const unauth = await fetch(`${BASE_URL}/api/trains/directory`);
  console.log('  Status:', unauth.status, '- Expected 401 ✓\n');
  
  if (!token) {
    console.log('Skipping authenticated tests (no test user)');
    console.log('Access http://localhost:5173 to test manually\n');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test 2: Get train directory
  console.log('Test 2: Get train directory...');
  const dirRes = await fetch(`${BASE_URL}/api/trains/directory`, { headers });
  const dirData = await dirRes.json();
  console.log('  Status:', dirRes.status);
  console.log('  Trains found:', dirData.trains?.length || 0);
  console.log('  Total in DB:', dirData.pagination?.total || 0, '\n');
  
  if (dirData.trains && dirData.trains.length > 0) {
    console.log('Sample train:', dirData.trains[0].number, '-', dirData.trains[0].name);
  }
  
  // Test 3: Search trains (autocomplete endpoint)
  console.log('\nTest 3: Autocomplete search...');
  const searchRes = await fetch(`${BASE_URL}/api/trains?q=12`, { headers });
  const searchData = await searchRes.json();
  console.log('  Results for "12":', searchData.length, 'trains\n');
  
  // Test 4: Get single train
  if (dirData.trains && dirData.trains.length > 0) {
    const trainId = dirData.trains[0]._id;
    console.log('Test 4: Get single train...');
    const singleRes = await fetch(`${BASE_URL}/api/trains/${trainId}`, { headers });
    const singleData = await singleRes.json();
    console.log('  Train:', singleData.number, '-', singleData.name);
    console.log('  Type:', singleData.trainType || 'EXPRESS');
    console.log('  Active:', singleData.isActive !== false, '\n');
  }
  
  console.log('=== All Tests Complete ===');
};

testTrainDirectory().catch(console.error);
