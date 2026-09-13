import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.API_URL || `http://localhost:${PORT}/api`;

let adminToken = '';
let staffToken = '';
let testProduct1Id = null;
let testProduct2Id = null;
let testSaleId = null;
let testReceiptNumber = null;

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
  console.log('🛒 RUNNING PHASE 4 SALES & RECEIPTS MANAGEMENT TEST SUITE');
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

    // 2. Setup Test Products with Known Stock
    console.log('\n2. Setting Up Test Master Products with Initial Stock...');
    const p1 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 4 Full Cream Milk 500ml',
        category: 'milk',
        unit: 'packet',
        unitPrice: 35,
        costPrice: 28,
        qrCode: `P4-MILK-${Date.now()}`,
        shelfLifeDays: 3,
        initialQuantity: 50
      }
    });
    testProduct1Id = p1.data?.product?.id;
    assert(testProduct1Id, `Created Test Product 1 (Milk, initial stock: 50, id: ${testProduct1Id})`);

    const p2 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 4 Cow Ghee 500g Jar',
        category: 'ghee',
        unit: 'jar',
        unitPrice: 320,
        costPrice: 260,
        qrCode: `P4-GHEE-${Date.now()}`,
        shelfLifeDays: 180,
        initialQuantity: 20
      }
    });
    testProduct2Id = p2.data?.product?.id;
    assert(testProduct2Id, `Created Test Product 2 (Ghee, initial stock: 20, id: ${testProduct2Id})`);

    // Verify initial stock levels
    const s1 = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    const s2 = await request(`${BASE_URL}/products/${testProduct2Id}`, { headers: staffHeaders });
    assert(Number(s1.data?.product?.currentQuantity) === 50, 'Product 1 stock verified at 50 units');
    assert(Number(s2.data?.product?.currentQuantity) === 20, 'Product 2 stock verified at 20 units');

    // 3. Multi-Item Sale Creation with Receipt Generation
    console.log('\n3. Testing Multi-Item Sale Order with Transactional Receipt...');
    const salePayload = {
      customerName: 'Shri Ram Sweets & Caterers',
      outletOrRoute: 'Sector 18 Market Counter',
      paymentMode: 'UPI',
      discount: 20,
      notes: 'Festival special order',
      items: [
        {
          productId: testProduct1Id,
          quantity: 10,
          sellingPrice: 35
        },
        {
          productId: testProduct2Id,
          quantity: 5,
          sellingPrice: 320
        }
      ]
    };

    // Subtotal: (10 * 35) + (5 * 320) = 350 + 1600 = 1950.
    // Discount: 20 -> Net Total: 1930.
    const createSaleRes = await request(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: staffHeaders,
      body: salePayload
    });

    if (createSaleRes.status !== 201) {
      console.log('    \x1b[33mcreateSale response:\x1b[0m', createSaleRes.status, createSaleRes.data);
    }
    assert(createSaleRes.status === 201, `Sale creation HTTP status 201 (got ${createSaleRes.status})`);
    assert(createSaleRes.data?.success === true, 'Sale creation success flag is true');
    assert(createSaleRes.data?.sale?.items?.length === 2, 'Sale created with 2 line items');
    assert(Boolean(createSaleRes.data?.receiptNumber?.startsWith('REC-')), `Unique receipt number generated: ${createSaleRes.data?.receiptNumber}`);
    assert(Number(createSaleRes.data?.sale?.subtotal) === 1950, `Subtotal calculated accurately as ₹1950 (got ₹${createSaleRes.data?.sale?.subtotal})`);
    assert(Number(createSaleRes.data?.sale?.discount) === 20, `Discount recorded as ₹20`);
    assert(Number(createSaleRes.data?.sale?.totalAmount) === 1930, `Total net amount accurately calculated as ₹1930 (got ₹${createSaleRes.data?.sale?.totalAmount})`);

    testSaleId = createSaleRes.data?.sale?.id;
    testReceiptNumber = createSaleRes.data?.receiptNumber;

    // 4. Verify Stock Deduction
    console.log('\n4. Verifying Stock Levels Decremented...');
    const s1After = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    const s2After = await request(`${BASE_URL}/products/${testProduct2Id}`, { headers: staffHeaders });
    assert(Number(s1After.data?.product?.currentQuantity) === 40, `Product 1 stock decreased from 50 to 40 (got ${s1After.data?.product?.currentQuantity})`);
    assert(Number(s2After.data?.product?.currentQuantity) === 15, `Product 2 stock decreased from 20 to 15 (got ${s2After.data?.product?.currentQuantity})`);

    // 5. Test Insufficient Stock Rejection
    console.log('\n5. Testing Insufficient Stock Rejection & Transaction Rollback...');
    // Attempt to sell 30 units of Ghee when only 15 exist
    const overSaleRes = await request(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        customerName: 'Excessive Buyer',
        items: [
          {
            productId: testProduct2Id,
            quantity: 30, // exceeds available stock 15
            sellingPrice: 320
          }
        ]
      }
    });

    assert(overSaleRes.status === 400, `Over-selling rejected with HTTP 400 (got ${overSaleRes.status})`);
    assert(overSaleRes.data?.success === false, 'Over-selling returns success: false');
    assert(overSaleRes.data?.message?.includes('Insufficient stock'), `Clear error message returned: "${overSaleRes.data?.message}"`);

    // Verify stock remains untouched
    const s2AfterFail = await request(`${BASE_URL}/products/${testProduct2Id}`, { headers: staffHeaders });
    assert(Number(s2AfterFail.data?.product?.currentQuantity) === 15, `Product 2 stock remained intact at 15`);

    // 6. Test Multi-line Over-selling Atomicity
    console.log('\n6. Testing Multi-Line Transaction Atomicity (Partial failure rolls back all items)...');
    // Line 1 is valid (5 units of Milk, 40 available), Line 2 exceeds (100 units of Ghee, 15 available)
    const partialFailRes = await request(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        customerName: 'Mixed Order',
        items: [
          { productId: testProduct1Id, quantity: 5, sellingPrice: 35 },
          { productId: testProduct2Id, quantity: 100, sellingPrice: 320 }
        ]
      }
    });

    assert(partialFailRes.status === 400, `Mixed order rejected with HTTP 400 (got ${partialFailRes.status})`);
    const s1AfterPartial = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    assert(Number(s1AfterPartial.data?.product?.currentQuantity) === 40, `Valid line item did NOT decrement (Product 1 remained at 40) due to transaction rollback`);

    // 7. Test Receipt Fetch by ID
    console.log('\n7. Testing Single Receipt Retrieval via GET /api/sales/:id...');
    const singleSaleRes = await request(`${BASE_URL}/sales/${testSaleId}`, {
      headers: staffHeaders
    });
    assert(singleSaleRes.status === 200, `Fetched single sale HTTP 200`);
    assert(singleSaleRes.data?.sale?.receiptNumber === testReceiptNumber, `Fetched correct receipt number: ${singleSaleRes.data?.sale?.receiptNumber}`);
    assert(singleSaleRes.data?.sale?.items?.length === 2, `Receipt contains all 2 itemized rows`);

    // 8. Test Sales History Query & Filters
    console.log('\n8. Testing Sales History Search & Filters...');
    const filterByReceipt = await request(`${BASE_URL}/sales?receiptNumber=${encodeURIComponent(testReceiptNumber)}`, {
      headers: staffHeaders
    });
    assert(filterByReceipt.data?.sales?.length >= 1, `Filter by receiptNumber returned matching record`);
    assert(filterByReceipt.data?.sales?.[0]?.receiptNumber === testReceiptNumber, `Receipt number matched exactly in query results`);

    const filterByCustomer = await request(`${BASE_URL}/sales?customer=Shri%20Ram`, {
      headers: staffHeaders
    });
    assert(filterByCustomer.data?.sales?.length >= 1, `Filter by customer search returned matching record`);

    const filterByProduct = await request(`${BASE_URL}/sales?productId=${testProduct1Id}`, {
      headers: staffHeaders
    });
    assert(filterByProduct.data?.sales?.length >= 1, `Filter by productId returned sales containing that product`);

    // 9. Role-Based Access Control on Sales
    console.log('\n9. Testing Role-Based Permissions (Staff cannot delete, Admin can delete & restock)...');
    const staffDelete = await request(`${BASE_URL}/sales/${testSaleId}`, {
      method: 'DELETE',
      headers: staffHeaders
    });
    assert(staffDelete.status === 403, `Staff blocked from deleting sale (HTTP 403)`);

    const adminDelete = await request(`${BASE_URL}/sales/${testSaleId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(adminDelete.status === 200, `Admin successfully deleted sale and reversed stock (HTTP 200)`);

    // Verify stock restored after Admin deletion
    const s1Restored = await request(`${BASE_URL}/products/${testProduct1Id}`, { headers: staffHeaders });
    const s2Restored = await request(`${BASE_URL}/products/${testProduct2Id}`, { headers: staffHeaders });
    assert(Number(s1Restored.data?.product?.currentQuantity) === 50, `Product 1 stock reversed back to 50 (got ${s1Restored.data?.product?.currentQuantity})`);
    assert(Number(s2Restored.data?.product?.currentQuantity) === 20, `Product 2 stock reversed back to 20 (got ${s2Restored.data?.product?.currentQuantity})`);

    // Cleanup test products
    await request(`${BASE_URL}/products/${testProduct1Id}`, { method: 'DELETE', headers: adminHeaders });
    await request(`${BASE_URL}/products/${testProduct2Id}`, { method: 'DELETE', headers: adminHeaders });

  } catch (err) {
    console.error('Unhandled error during testing:', err);
    failCount++;
  }

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: \x1b[32m${passCount} PASSED\x1b[0m | \x1b[31m${failCount} FAILED\x1b[0m`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
