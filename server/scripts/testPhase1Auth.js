import http from 'http';
import app, { ensureDbConnected } from '../app.js';

const PORT = 5055;

const runRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runAuthTests = async () => {
  console.log('==============================================');
  console.log('PHASE 1: AUTH & ROLE-BASED ACCESS CONTROL TESTS');
  console.log('==============================================\n');

  await ensureDbConnected();

  const server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}\n`);
    let passed = 0;
    let failed = 0;

    const assert = (condition, testName, detail = '') => {
      if (condition) {
        console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
        passed++;
      } else {
        console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
        failed++;
      }
    };

    try {
      // 1. Test Admin Login
      console.log('1. Testing Authentication...');
      const adminLoginRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'admin@dairy.com', password: 'admin123' }
      );
      assert(adminLoginRes.status === 200, 'Admin login status is 200', `Status: ${adminLoginRes.status}`);
      assert(adminLoginRes.body?.user?.role === 'admin', 'Admin user role is admin', `Role: ${adminLoginRes.body?.user?.role}`);
      assert(Boolean(adminLoginRes.body?.token), 'Admin login returns JWT token');
      const adminToken = adminLoginRes.body?.token;

      // 2. Test Staff Login
      const staffLoginRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'staff@dairy.com', password: 'staff123' }
      );
      assert(staffLoginRes.status === 200, 'Staff login status is 200', `Status: ${staffLoginRes.status}`);
      assert(staffLoginRes.body?.user?.role === 'staff', 'Staff user role is staff', `Role: ${staffLoginRes.body?.user?.role}`);
      assert(Boolean(staffLoginRes.body?.token), 'Staff login returns JWT token');
      const staffToken = staffLoginRes.body?.token;

      // 3. Test Invalid Password Login
      const invalidLoginRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: 'admin@dairy.com', password: 'wrongpassword' }
      );
      assert(invalidLoginRes.status === 401, 'Invalid password rejected with 401', `Status: ${invalidLoginRes.status}`);

      // 4. Test Protected Route without Token
      console.log('\n2. Testing JWT Authentication Guard (protect)...');
      const noTokenRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET'
      });
      assert(noTokenRes.status === 401, 'Request without token rejected with 401', `Status: ${noTokenRes.status}`);

      // 5. Test Protected Route with Invalid Token
      const invalidTokenRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: 'Bearer fake-invalid-jwt-token-123' }
      });
      assert(invalidTokenRes.status === 401, 'Request with invalid token rejected with 401', `Status: ${invalidTokenRes.status}`);

      // 6. Test Protected Route with Valid Tokens
      const adminMeRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(adminMeRes.status === 200 && adminMeRes.body?.user?.role === 'admin', 'Admin token retrieves admin profile');

      const staffMeRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      assert(staffMeRes.status === 200 && staffMeRes.body?.user?.role === 'staff', 'Staff token retrieves staff profile');

      // 7. Test Role-Based Restrictions (Staff hitting Admin routes)
      console.log('\n3. Testing Role-Based Restrictions (requireAdmin)...');
      const staffHitUsersRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      assert(staffHitUsersRes.status === 403, 'Staff hitting /api/users is blocked with 403 Forbidden', `Status: ${staffHitUsersRes.status}`);

      const staffHitRegisterRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffToken}`
          }
        },
        { name: 'Unauthorized Staff', email: 'unauthorized@dairy.com', password: 'pass', role: 'staff' }
      );
      assert(staffHitRegisterRes.status === 403, 'Staff creating staff is blocked with 403 Forbidden', `Status: ${staffHitRegisterRes.status}`);

      // 8. Test Admin successfully hitting Admin-only routes
      const adminHitUsersRes = await runRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(adminHitUsersRes.status === 200, 'Admin hitting /api/users succeeds with 200 OK', `Status: ${adminHitUsersRes.status}`);

      // 9. Test Admin creating a new staff member
      const testEmail = `operator_${Date.now()}@dairy.com`;
      const adminRegisterRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          }
        },
        {
          name: 'New Line Operator',
          email: testEmail,
          password: 'operator123',
          role: 'staff',
          phone: '+91 99999 88888'
        }
      );
      assert(adminRegisterRes.status === 201, 'Admin can register new staff account with 201 Created', `Status: ${adminRegisterRes.status}`);

      // 10. Test newly registered staff can log in
      const newStaffLoginRes = await runRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: testEmail, password: 'operator123' }
      );
      assert(newStaffLoginRes.status === 200 && newStaffLoginRes.body?.user?.role === 'staff', 'Newly created staff can log in successfully');

    } catch (err) {
      console.error('Test Execution Error:', err);
      failed++;
    } finally {
      server.close();
      console.log('\n==============================================');
      console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
      console.log('==============================================\n');
      process.exit(failed > 0 ? 1 : 0);
    }
  });
};

runAuthTests();
