import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_ENV = 'test';

import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { Role, BgaStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'bga_super_secret_jwt_key_2026_growth_portal_secure_auth';

function generateAdminToken(admin: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(admin, JWT_SECRET, { expiresIn: '1h' });
}

async function runKycSafeguardTests() {
  console.log('🧪 Starting KYC Safeguard & Approval Prevention Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Get Admin User
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) {
    console.error('No admin user found to execute test.');
    process.exit(1);
  }
  const adminToken = generateAdminToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
  });

  // 2. Start internal test server
  const { app } = await import('./index');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}\n`);

  const testEmail = `test_safeguard_${Date.now()}@atriowings.test`;
  const testMobile = `9876${Date.now().toString().slice(-6)}`;
  let testUserId = '';

  try {
    // Setup: Create a temporary test BGA with SUBMITTED status and unverified documents
    const created = await prisma.user.create({
      data: {
        id: `TEST-BGA-${Date.now().toString().slice(-4)}`,
        name: 'Automated KYC Safeguard Test User',
        email: testEmail,
        mobile: testMobile,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: Role.BGA,
        status: BgaStatus.SUBMITTED,
        panNumber: 'ABCDE1234F',
        panVerified: false,
        aadhaarNumber: '123456789012',
        aadhaarMasked: '1234 5678 9012',
        aadhaarVerified: false,
        bankName: 'Test Bank',
        bankAccountHolder: 'Test User',
        bankAccountNumber: '9876543210',
        bankIfsc: 'TEST0001234',
        bankVerified: false,
      },
    });
    testUserId = created.id;
    console.log(`Created test BGA user: ${testUserId} (${testEmail})\n`);

    // TEST 1: Block activation when all 3 KYC items are unverified
    console.log('--- TEST 1: Activation with 0 of 3 verified ---');
    const res1 = await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'APPROVE_AND_ACTIVATE' }),
    });
    const body1 = await res1.json();
    assert(
      res1.status === 400 && body1.missingVerifications?.pan && body1.missingVerifications?.aadhaar && body1.missingVerifications?.bank,
      'Test 1: Backend rejects activation when all KYC items are unverified (HTTP 400)',
      JSON.stringify(body1)
    );

    const check1 = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(check1?.status === BgaStatus.SUBMITTED, 'Test 1b: User status remains SUBMITTED (not active)');

    // TEST 2: Block activation when PAN is unverified (Aadhaar & Bank verified)
    console.log('\n--- TEST 2: Activation when Aadhaar & Bank are verified, but PAN is pending ---');
    // Verify Aadhaar & Bank
    await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ aadhaarVerified: true, bankVerified: true }),
    });

    const res2 = await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'APPROVE_AND_ACTIVATE' }),
    });
    const body2 = await res2.json();
    assert(
      res2.status === 400 && body2.missingVerifications?.pan === true && !body2.missingVerifications?.aadhaar && !body2.missingVerifications?.bank,
      'Test 2: Backend rejects activation when PAN is missing verification (HTTP 400)',
      JSON.stringify(body2)
    );

    const check2 = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(check2?.status === BgaStatus.SUBMITTED, 'Test 2b: User status remains SUBMITTED');

    // TEST 3: Allow activation when PAN, Aadhaar, and Bank are ALL verified
    console.log('\n--- TEST 3: Activation when all 3 KYC items are verified ---');
    // Verify PAN
    await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ panVerified: true }),
    });

    const res3 = await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'APPROVE_AND_ACTIVATE' }),
    });
    const body3 = await res3.json();
    assert(res3.status === 200, 'Test 3: Backend successfully approves & activates when all 3 KYC items are verified', JSON.stringify(body3));

    const check3 = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(check3?.status === BgaStatus.ACTIVE && check3.approvedAt !== null, 'Test 3b: User status is now ACTIVE with approvedAt set');

    // TEST 4: Auto-Demote from ACTIVE to VERIFICATION_PENDING if PAN is revoked
    console.log('\n--- TEST 4: Auto-demote active user when PAN is revoked ---');
    const res4 = await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ panVerified: false }),
    });
    assert(res4.status === 200, 'Test 4: Admin successfully revokes PAN verification');

    const check4 = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(
      check4?.status === BgaStatus.VERIFICATION_PENDING,
      'Test 4b: Account status was AUTOMATICALLY demoted from ACTIVE to VERIFICATION_PENDING upon PAN revocation'
    );
    assert(check4?.panVerified === false, 'Test 4c: panVerified is false');

    // TEST 5: Auto-Demote when Bank is revoked
    console.log('\n--- TEST 5: Auto-demote active user when Bank is revoked ---');
    // First reactivate by re-verifying PAN and activating
    await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ panVerified: true }),
    });
    await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'APPROVE_AND_ACTIVATE' }),
    });
    const check5a = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(check5a?.status === BgaStatus.ACTIVE, 'Test 5a: Account reactivated');

    // Now revoke bank
    await fetch(`${baseUrl}/api/admin/bgas/${testUserId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ bankVerified: false }),
    });
    const check5b = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(
      check5b?.status === BgaStatus.VERIFICATION_PENDING,
      'Test 5b: Account status AUTOMATICALLY demoted from ACTIVE to VERIFICATION_PENDING upon Bank revocation'
    );

    console.log('\n=======================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=======================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // CLEANUP: Clean up test user and its audit logs
    if (testUserId) {
      console.log('Cleaning up temporary test user...');
      await prisma.auditLog.deleteMany({ where: { entityId: testUserId } });
      await prisma.notification.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      console.log('Cleanup complete. Real users like Manikandan were not touched.');
    }
    server.close();
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runKycSafeguardTests();
