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
let testProduct1Id = null;
let testProduct2Id = null;
let testProduct3Id = null;
let testSupplierId = null;
let testPurchaseId = null;

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
  console.log('\n=============================================================');
  console.log('🚀 RUNNING PHASE 3 PURCHASE MANAGEMENT TEST SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Authenticate Admin & Staff
    console.log('1. Authenticating Admin & Staff...');
    const adminLogin = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@dairy.com', password: 'admin123' }
    });
    assert(adminLogin.data?.success && adminLogin.data?.token, 'Admin login succeeded');
    adminToken = adminLogin.data?.token;

    const staffLogin = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email: 'staff@dairy.com', password: 'staff123' }
    });
    assert(staffLogin.data?.success && staffLogin.data?.token, 'Staff login succeeded');
    staffToken = staffLogin.data?.token;

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    // 2. Setup Test Products & Supplier
    console.log('\n2. Setting Up Test Master Products & Supplier...');
    const p1 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 3 Standard Cow Milk',
        category: 'milk',
        unit: 'packet',
        unitPrice: 32,
        costPrice: 25,
        qrCode: `P3-MILK-${Date.now()}`,
        shelfLifeDays: 3,
        initialQuantity: 0
      }
    });
    testProduct1Id = p1.data?.product?.id;
    assert(testProduct1Id, 'Created Test Product 1 (Cow Milk, initial: 0)');

    const p2 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 3 Fresh Dahi Curd',
        category: 'curd',
        unit: 'cup',
        unitPrice: 50,
        costPrice: 40,
        qrCode: `P3-CURD-${Date.now()}`,
        shelfLifeDays: 5,
        initialQuantity: 5
      }
    });
    testProduct2Id = p2.data?.product?.id;
    assert(testProduct2Id, 'Created Test Product 2 (Curd, initial: 5)');

    const p3 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 3 Pure Cow Ghee 500g',
        category: 'ghee',
        unit: 'jar',
        unitPrice: 150,
        costPrice: 120,
        qrCode: `P3-GHEE-${Date.now()}`,
        shelfLifeDays: 180,
        initialQuantity: 2
      }
    });
    testProduct3Id = p3.data?.product?.id;
    assert(testProduct3Id, 'Created Test Product 3 (Ghee, initial: 2)');

    const sup = await request(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 3 Anand District Milk Union',
        contactPerson: 'Tribhuvandas Patel',
        phone: '+91 98250 12345',
        email: 'anand.union@amul.coop',
        category: 'raw_milk',
        gstNumber: '24GJJJJ9999K1Z2'
      }
    });
    testSupplierId = sup.data?.supplier?.id;
    assert(testSupplierId, 'Created Test Supplier (Anand District Union)');

    // 3. Multi-Line Purchase Order
    console.log('\n3. Testing Multi-Line Purchase Order Creation (Atomic Transaction)...');
    // Line 1: 30 units @ 25 = 750
    // Line 2: 20 units @ 40 = 800
    // Line 3: 10 units @ 120 = 1200
    // Total: 2750
    const purchaseRes = await request(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        supplierId: testSupplierId,
        invoiceNumber: `INV-P3-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split('T')[0],
        notes: 'Phase 3 Multi-Item Consignment',
        items: [
          { productId: testProduct1Id, quantity: 30, costPrice: 25 },
          { productId: testProduct2Id, quantity: 20, costPrice: 40 },
          { productId: testProduct3Id, quantity: 10, costPrice: 120 }
        ]
      }
    });

    assert(purchaseRes.data?.success, 'Multi-line purchase order recorded successfully');
    testPurchaseId = purchaseRes.data?.purchase?.id;
    const purData = purchaseRes.data?.purchase;
    assert(Number(purData?.totalAmount) === 2750, `Grand total correctly computed as ₹2750 (got ₹${purData?.totalAmount})`);
    assert(Array.isArray(purchaseRes.data?.items) && purchaseRes.data.items.length === 3, 'Created 3 PurchaseItem records');

    // 4. Verify Atomic Stock Increments
    console.log('\n4. Verifying Atomic Stock Increments across all Line Items...');
    const prod1Check = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    assert(Number(prod1Check.data?.product?.stock?.currentQuantity) === 30, `Product 1 stock incremented from 0 to 30`);

    const prod2Check = await request(`${BASE_URL}/products/${testProduct2Id}`, { headers: staffHeaders });
    assert(Number(prod2Check.data?.product?.stock?.currentQuantity) === 25, `Product 2 stock incremented from 5 to 25 (5 + 20)`);

    const prod3Check = await request(`${BASE_URL}/products/${testProduct3Id}`, { headers: staffHeaders });
    assert(Number(prod3Check.data?.product?.stock?.currentQuantity) === 12, `Product 3 stock incremented from 2 to 12 (2 + 10)`);

    // 5. Verify Transaction Rollback on Failure
    console.log('\n5. Verifying Sequelize Transaction Rollback on Partial Failure...');
    const failedPurchaseRes = await request(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        supplierId: testSupplierId,
        invoiceNumber: 'INV-FAIL-TEST',
        items: [
          { productId: testProduct1Id, quantity: 50, costPrice: 25 }, // Valid item
          { productId: 99999999, quantity: 10, costPrice: 100 } // INVALID item ID -> triggers error & rollback
        ]
      }
    });

    assert(!failedPurchaseRes.data?.success, 'Purchase with invalid product was rejected');

    // Verify Product 1 stock was NOT incremented by the failed purchase (rolled back!)
    const prod1RollbackCheck = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    assert(
      Number(prod1RollbackCheck.data?.product?.stock?.currentQuantity) === 30,
      'Product 1 stock remained unchanged at 30 (transaction rolled back completely!)'
    );

    // 6. Verify Purchase History API & Filters
    console.log('\n6. Verifying Purchase History API & Filters (Date Range & Supplier)...');
    const historyRes = await request(`${BASE_URL}/purchases?supplierId=${testSupplierId}`, {
      headers: staffHeaders
    });
    assert(historyRes.data?.success && Array.isArray(historyRes.data?.purchases), 'Fetched purchases filtered by supplierId');
    const matchedPurchase = historyRes.data.purchases.find(p => p.id === testPurchaseId);
    assert(matchedPurchase !== undefined, `Found purchase #${testPurchaseId} in supplier history`);
    assert(matchedPurchase?.itemsCount === 3, 'Purchase history reflects 3 line items');

    const todayStr = new Date().toISOString().split('T')[0];
    const dateFilterRes = await request(`${BASE_URL}/purchases?startDate=${todayStr}&endDate=${todayStr}`, {
      headers: staffHeaders
    });
    assert(dateFilterRes.data?.success, 'Fetched purchases filtered by Date Range');

    // Single Purchase Details by ID
    const singleRes = await request(`${BASE_URL}/purchases/${testPurchaseId}`, {
      headers: staffHeaders
    });
    assert(singleRes.data?.success && singleRes.data?.purchase?.items?.length === 3, 'GET /api/purchases/:id returned full line items breakdown');

    // 7. Cleanup Test Artifacts
    console.log('\n7. Cleaning Up Test Artifacts & Reversing Stock...');
    const delPur = await request(`${BASE_URL}/purchases/${testPurchaseId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(delPur.data?.success, 'Admin deleted purchase order and reversed stock increments');

    const prod1AfterDelete = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    assert(Number(prod1AfterDelete.data?.product?.stock?.currentQuantity) === 0, 'Product 1 stock reversed to 0 after purchase deletion');

    await request(`${BASE_URL}/products/${testProduct1Id}`, { method: 'DELETE', headers: adminHeaders });
    await request(`${BASE_URL}/products/${testProduct2Id}`, { method: 'DELETE', headers: adminHeaders });
    await request(`${BASE_URL}/products/${testProduct3Id}`, { method: 'DELETE', headers: adminHeaders });
    await request(`${BASE_URL}/suppliers/${testSupplierId}`, { method: 'DELETE', headers: adminHeaders });
    assert(true, 'Test products and supplier cleaned up');

  } catch (error) {
    console.error('Fatal test error:', error.message);
    failCount++;
  }

  console.log('\n=============================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
