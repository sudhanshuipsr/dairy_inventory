import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

let adminToken = '';
let staffToken = '';
let testProductId = null;
let testSupplierId = null;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failCount++;
  }
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING PHASE 2 PRODUCT & STOCK MANAGEMENT TEST SUITE');
  console.log('======================================================\n');

  try {
    // 1. Authenticate Admin
    console.log('1. Authenticating Admin & Staff...');
    const adminLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@dairy.com',
        password: 'admin123'
      }
    });
    assert(adminLoginRes.data?.success && adminLoginRes.data?.token, 'Admin login succeeded');
    adminToken = adminLoginRes.data?.token;

    // Authenticate Staff
    const staffLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        email: 'staff@dairy.com',
        password: 'staff123'
      }
    });
    assert(staffLoginRes.data?.success && staffLoginRes.data?.token, 'Staff login succeeded');
    staffToken = staffLoginRes.data?.token;

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    // 2. Admin Creates Product
    console.log('\n2. Testing Product Master CRUD & Role Guarding...');
    const testBarcode = `TEST-${Date.now()}`;
    const testQr = `QR-${Date.now()}`;
    const createProdRes = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase2 Automated Test Milk 500ml',
        category: 'milk',
        unit: 'packet',
        unitPrice: 34,
        costPrice: 28,
        qrCode: testQr,
        barcode: testBarcode,
        shelfLifeDays: 2,
        reorderThreshold: 15,
        initialQuantity: 10 // Initially below threshold 15 to test low-stock flag
      }
    });
    assert(createProdRes.data?.success && createProdRes.data?.product?.id, 'Admin successfully created product');
    testProductId = createProdRes.data?.product?.id;

    // 3. Admin Edits Product
    const updateProdRes = await request(`${BASE_URL}/products/${testProductId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        unitPrice: 36,
        description: 'Updated via test suite'
      }
    });
    assert(updateProdRes.data?.success, 'Admin successfully updated product master');

    // 4. Staff Attempts to Edit Product -> Expect 403 Forbidden
    const staffEditProdRes = await request(`${BASE_URL}/products/${testProductId}`, {
      method: 'PUT',
      headers: staffHeaders,
      body: { unitPrice: 999 }
    });
    assert(staffEditProdRes.status === 403, 'Staff edit product blocked with 403 Forbidden');

    // 5. Staff Attempts to Delete Product -> Expect 403 Forbidden
    const staffDelProdRes = await request(`${BASE_URL}/products/${testProductId}`, {
      method: 'DELETE',
      headers: staffHeaders
    });
    assert(staffDelProdRes.status === 403, 'Staff delete product blocked with 403 Forbidden');

    // 6. Admin Supplier CRUD
    console.log('\n3. Testing Supplier Directory & Role Restrictions...');
    const createSupRes = await request(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase2 Automated Anand Farmers Co-op',
        contactPerson: 'Sardar Patel',
        phone: '+91 99999 11111',
        email: 'anand.coop@example.com',
        category: 'raw_milk',
        gstNumber: '24AAAAA0000A1Z5',
        address: 'Anand Dairy Road, Gujarat'
      }
    });
    assert(createSupRes.data?.success && createSupRes.data?.supplier?.id, 'Admin created new supplier');
    testSupplierId = createSupRes.data?.supplier?.id;

    // 7. Admin Updates Supplier
    const updateSupRes = await request(`${BASE_URL}/suppliers/${testSupplierId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        contactPerson: 'Sardar Patel Jr.'
      }
    });
    assert(updateSupRes.data?.success, 'Admin successfully updated supplier');

    // 8. Staff Attempts to Create Supplier -> Expect 403 Forbidden
    const staffCreateSupRes = await request(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: staffHeaders,
      body: { name: 'Unauthorized Vendor', phone: '12345' }
    });
    assert(staffCreateSupRes.status === 403, 'Staff create supplier blocked with 403 Forbidden');

    // 9. Staff Can View Suppliers
    const getSupRes = await request(`${BASE_URL}/suppliers`, {
      method: 'GET',
      headers: staffHeaders
    });
    assert(getSupRes.data?.success && Array.isArray(getSupRes.data?.suppliers), 'Staff can view supplier directory');

    // 10. Staff Inward Stock via Purchase / Quick Inward
    console.log('\n4. Testing Staff Stock Operations & Low-Stock / Expiry Flags...');
    const inwardRes = await request(`${BASE_URL}/stock/inward`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        productId: testProductId,
        quantity: 25,
        batchNumber: `BAT-P2-${Date.now().toString().slice(-4)}`,
        expiryDays: 2,
        notes: 'Phase 2 Test Inward'
      }
    });
    assert(inwardRes.data?.success, 'Staff successfully added stock via stock inward');

    // 11. Verify Stock Alerts & Expiry Logic API
    const alertsRes = await request(`${BASE_URL}/stock/alerts`, {
      method: 'GET',
      headers: staffHeaders
    });
    const summary = alertsRes.data?.alerts?.summary || alertsRes.data?.summary;
    assert(alertsRes.data?.success && summary, 'GET /api/stock/alerts returned valid summary');
    assert(typeof summary?.lowStockCount === 'number', 'Summary contains lowStockCount number');
    assert(typeof summary?.expiringSoonCount === 'number', 'Summary contains expiringSoonCount number');

    // 12. Verify Product Stock Level
    const getProdRes = await request(`${BASE_URL}/products/${testProductId}`, {
      method: 'GET',
      headers: staffHeaders
    });
    assert(getProdRes.data?.success, 'Staff fetched product details');
    const prodData = getProdRes.data?.product;
    assert(prodData?.stock?.currentQuantity >= 25, `Stock correctly increased to ${prodData?.stock?.currentQuantity}`);

    // 13. Admin Clean up
    console.log('\n5. Cleaning up Test Artifacts...');
    const delProdRes = await request(`${BASE_URL}/products/${testProductId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(delProdRes.data?.success, 'Admin cleaned up test product');

    const delSupRes = await request(`${BASE_URL}/suppliers/${testSupplierId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(delSupRes.data?.success, 'Admin cleaned up test supplier');

  } catch (error) {
    console.error('Fatal test error:', error.message);
    failCount++;
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
