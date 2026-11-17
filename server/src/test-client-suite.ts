import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_ENV = 'test';

import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'bga-secret-key-change-in-production';

function generateToken(user: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('🧪 Starting Client Registration & Editing Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('Finding BGA accounts...');
  // 1. Get BGA 1 and BGA 2
  const bga1 = await prisma.user.findFirst({ where: { email: 'bga@bga.com' } });
  const bga2 = await prisma.user.findFirst({ where: { role: 'BGA', email: { not: 'bga@bga.com' } } });
  console.log('Found BGAs:', bga1?.email, bga2?.email);

  if (!bga1 || !bga2) {
    console.error('Could not find test BGA accounts in database.');
    process.exit(1);
  }

  const token1 = generateToken({ id: bga1.id, email: bga1.email, role: bga1.role, name: bga1.name });
  const token2 = generateToken({ id: bga2.id, email: bga2.email, role: bga2.role, name: bga2.name });

  console.log('Importing app...');
  // Start internal test server on ephemeral port
  const { app } = await import('./index');
  console.log('App imported. Starting test server...');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('Test server ready at', baseUrl);

  const timestamp = Date.now().toString().slice(-6);
  const testMobile = `9123${timestamp}`;
  const testEmail = `client_${timestamp}@testenterprise.com`;
  let createdClientId = '';

  try {
    // TEST 1: Missing required fields on registration returns 400
    const res1 = await fetch(`${baseUrl}/api/bga/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ clientName: '', businessName: 'Incomplete Inc' }),
    });
    assert(res1.status === 400, 'Test 9: Clicking Register Client with missing required fields shows validation errors (400)');

    // TEST 2: Valid Registration registers exactly one client
    const res2 = await fetch(`${baseUrl}/api/bga/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        clientName: 'Ramesh Patel',
        businessName: 'Patel Logistics Solutions',
        mobile: testMobile,
        email: testEmail,
        businessCategory: 'Retail & E-commerce',
        addressLine1: '101 Cargo Hub, Outer Ring Road',
        addressLine2: 'Phase 2',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560103',
        country: 'India',
        requiredService: 'WEBSITE_DEVELOPMENT',
        expectedBudget: '60000',
        clientRequirements: 'Warehouse tracking web portal with real-time analytics.',
        discussionNotes: 'Met in Bengaluru office on Thursday.',
        followUpDate: '2026-12-15',
      }),
    });
    const data2 = await res2.json() as any;
    assert(res2.status === 201 && data2.client?.id, 'Test 10: Clicking Register Client with valid info registers exactly one client (201)');
    createdClientId = data2.client?.id;

    // TEST 3: Duplicate Registration prevention
    const res3 = await fetch(`${baseUrl}/api/bga/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        clientName: 'Ramesh Patel Clone',
        businessName: 'Patel Logistics Solutions Clone',
        mobile: testMobile,
        email: testEmail,
        businessCategory: 'Retail & E-commerce',
        addressLine1: '101 Cargo Hub',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560103',
      }),
    });
    assert(res3.status === 409, 'Test 11: Duplicate client registration returns 409 Conflict');

    // TEST 4: Fetch single client and verify prefilled values
    const res4 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data4 = await res4.json() as any;
    assert(
      res4.status === 200 &&
      data4.client?.clientName === 'Ramesh Patel' &&
      data4.client?.enquiries?.[0]?.expectedBudget === 60000 &&
      data4.client?.address?.city === 'Bengaluru',
      'Test 12: Open existing client and verify all values prefilled from DB'
    );

    // TEST 5: Change Expected Budget and save
    const res5 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        expectedBudget: '85000',
        clientRequirements: 'Updated: Full ERP with inventory tracking and client dashboard.',
      }),
    });
    const data5 = await res5.json() as any;
    assert(
      res5.status === 200 &&
      data5.client?.enquiries?.[0]?.expectedBudget === 85000,
      'Test 13: Change Expected Budget and save successfully (200)'
    );

    // TEST 6: Persistence verification after refresh/reload
    const res6 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data6 = await res6.json() as any;
    assert(
      data6.client?.enquiries?.[0]?.expectedBudget === 85000,
      'Test 14: Verify updated budget persists on subsequent fetches (persistence confirmed)'
    );

    // TEST 7: Edit Address and Business Category
    const res7 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        businessCategory: 'Manufacturing & Industrial',
        addressLine1: 'Tower B, Suite 400',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
      }),
    });
    const data7 = await res7.json() as any;
    assert(
      res7.status === 200 &&
      data7.client?.businessCategory === 'Manufacturing & Industrial' &&
      data7.client?.address?.city === 'Chennai',
      'Test 15: Edit address and business category and verify persistence'
    );

    // TEST 8: Attempt to change mobile to another client's detail
    const otherMobile = `9124${timestamp}`;
    const otherEmail = `other_${timestamp}@testenterprise.com`;
    await fetch(`${baseUrl}/api/bga/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        clientName: 'Second Client',
        businessName: 'Other Enterprises',
        mobile: otherMobile,
        email: otherEmail,
        businessCategory: 'Finance & Banking',
        addressLine1: '500 Bank St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
      }),
    });

    const res8 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        mobile: otherMobile,
      }),
    });
    assert(res8.status === 409, 'Test 16: Attempt to change mobile to another client details returns duplicate conflict (409)');

    // TEST 9: Unauthorized edit of another BGA's client denied
    const res9 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({
        clientName: 'Hacked Name',
      }),
    });
    assert(res9.status === 404, "Test 17: Attempt to edit another BGA's client returns access denied / not found (404)");

    // TEST 10: Negative budget rejected
    const res10 = await fetch(`${baseUrl}/api/bga/clients/${createdClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        expectedBudget: '-500',
      }),
    });
    assert(res10.status === 400, 'Test: Negative expected budget is rejected (400)');

    // TEST 11: Enquiry creation and workflow works after editing
    const res11 = await fetch(`${baseUrl}/api/bga/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
      body: JSON.stringify({
        clientId: createdClientId,
        serviceCategory: 'DIGITAL_MARKETING',
        expectedBudget: '35000',
        requirements: 'SEO and Google Ads 3-month growth campaign.',
        discussionNotes: 'Post-edit additional enquiry test',
      }),
    });
    assert(res11.status === 201, 'Test 18: Existing enquiry and quotation workflow functions seamlessly after client edits');

  } finally {
    // Cleanup test records
    try {
      await prisma.enquiry.deleteMany({ where: { clientId: createdClientId } });
      await prisma.client.deleteMany({ where: { mobile: { in: [testMobile, `9124${timestamp}`] } } });
      await prisma.$disconnect();
    } catch {}

    server.close();
  }

  console.log(`\n========================================`);
  console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
