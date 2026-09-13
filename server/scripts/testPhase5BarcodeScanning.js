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

const testBarcode = `890${Date.now().toString().slice(-10)}`;
const testQrCode = `QR-P5-${Date.now()}`;

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
  console.log('📷 RUNNING PHASE 5 BARCODE & QR SCANNING TEST SUITE');
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

    // 2. Create Master Products with 1D Barcode and QR Code
    console.log('\n2. Creating Master Products with 1D Barcode and QR Code...');
    const p1 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 5 Toned Fresh Milk (1L)',
        category: 'milk',
        unit: 'pouch',
        unitPrice: 54,
        costPrice: 44,
        barcode: testBarcode,
        qrCode: `P5-TONED-${Date.now()}`,
        shelfLifeDays: 4,
        initialQuantity: 30
      }
    });
    testProduct1Id = p1.data?.product?.id;
    assert(testProduct1Id, `Created Product 1 with 1D Barcode: ${testBarcode} (ID: ${testProduct1Id})`);

    const p2 = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Phase 5 Organic Paneer (200g)',
        category: 'paneer',
        unit: 'pack',
        unitPrice: 90,
        costPrice: 72,
        barcode: `890${(Date.now() + 100).toString().slice(-10)}`,
        qrCode: testQrCode,
        shelfLifeDays: 14,
        initialQuantity: 25
      }
    });
    testProduct2Id = p2.data?.product?.id;
    assert(testProduct2Id, `Created Product 2 with QR Code: ${testQrCode} (ID: ${testProduct2Id})`);

    // 3. Test GET /api/products/barcode/:code with 1D Barcode
    console.log('\n3. Testing GET /api/products/barcode/:code with 1D Barcode...');
    const lookup1 = await request(`${BASE_URL}/products/barcode/${encodeURIComponent(testBarcode)}`, {
      headers: staffHeaders
    });
    assert(lookup1.status === 200, `Barcode lookup HTTP status 200 (got ${lookup1.status})`);
    assert(lookup1.data?.success === true, 'Barcode lookup success flag is true');
    assert(lookup1.data?.product?.name === 'Phase 5 Toned Fresh Milk (1L)', `Correct product name resolved: "${lookup1.data?.product?.name}"`);
    assert(lookup1.data?.product?.barcode === testBarcode, 'Matched exact 1D barcode');
    assert(Number(lookup1.data?.product?.currentQuantity) === 30, `Stock verified via barcode lookup: 30 pouches`);

    // 4. Test GET /api/products/barcode/:code with 2D QR Code
    console.log('\n4. Testing GET /api/products/barcode/:code with 2D QR Code...');
    const lookup2 = await request(`${BASE_URL}/products/barcode/${encodeURIComponent(testQrCode)}`, {
      headers: staffHeaders
    });
    assert(lookup2.status === 200, `QR lookup HTTP status 200 (got ${lookup2.status})`);
    assert(lookup2.data?.success === true, 'QR lookup success flag is true');
    assert(lookup2.data?.product?.name === 'Phase 5 Organic Paneer (200g)', `Correct product name resolved: "${lookup2.data?.product?.name}"`);
    assert(lookup2.data?.product?.qrCode === testQrCode, 'Matched exact QR code');

    // 5. Test Case-Insensitive Lookup
    console.log('\n5. Testing Case-Insensitive Barcode/QR Lookup...');
    const lookupLower = await request(`${BASE_URL}/products/barcode/${encodeURIComponent(testQrCode.toLowerCase())}`, {
      headers: staffHeaders
    });
    assert(lookupLower.status === 200, `Case-insensitive QR lookup succeeded (HTTP 200)`);
    assert(lookupLower.data?.product?.id === testProduct2Id, 'Matched correct product ID regardless of case');

    // 6. Test Non-Existent Barcode Handling
    console.log('\n6. Testing Non-Existent Barcode Lookup (Not Found State)...');
    const unknownCode = '9999999999999';
    const notFoundRes = await request(`${BASE_URL}/products/barcode/${unknownCode}`, {
      headers: staffHeaders
    });
    assert(notFoundRes.status === 404, `Unknown barcode returns HTTP 404 (got ${notFoundRes.status})`);
    assert(notFoundRes.data?.success === false, 'Not found response returns success: false');
    assert(notFoundRes.data?.notFound === true, 'Not found response sets notFound: true');
    assert(Boolean(notFoundRes.data?.message?.includes('not found')), `Clear not found error message: "${notFoundRes.data?.message}"`);

    // 7. Test Purchase Order creation using Scanned Product ID
    console.log('\n7. Testing Purchase Order integration with scanned product...');
    const purchaseRes = await request(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        invoiceNumber: `INV-SCAN-${Date.now().toString().slice(-4)}`,
        items: [
          {
            productId: lookup1.data?.product?.id,
            quantity: 20,
            costPrice: 44
          }
        ]
      }
    });
    assert(purchaseRes.status === 201, `Purchase created for scanned product (HTTP 201)`);
    const p1AfterPurchase = await request(`${BASE_URL}/products/barcode/${testBarcode}`, { headers: staffHeaders });
    assert(Number(p1AfterPurchase.data?.product?.currentQuantity) === 50, `Stock increased from 30 to 50 pouches after purchase`);

    // 8. Test Sales Order creation using Scanned Product ID
    console.log('\n8. Testing Sales Order POS integration with scanned product...');
    const saleRes = await request(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        customerName: 'Quick Scanner Counter',
        paymentMode: 'Cash',
        items: [
          {
            productId: lookup1.data?.product?.id,
            quantity: 15,
            sellingPrice: 54
          }
        ]
      }
    });
    assert(saleRes.status === 201, `Sale created for scanned product with receipt (HTTP 201)`);
    assert(Boolean(saleRes.data?.receiptNumber?.startsWith('REC-')), `Receipt number issued: ${saleRes.data?.receiptNumber}`);

    const p1AfterSale = await request(`${BASE_URL}/products/barcode/${testBarcode}`, { headers: staffHeaders });
    assert(Number(p1AfterSale.data?.product?.currentQuantity) === 35, `Stock decreased from 50 to 35 pouches after sale`);

    // Cleanup
    console.log('\n9. Cleaning up test products...');
    if (saleRes.data?.sale?.id) {
      await request(`${BASE_URL}/sales/${saleRes.data.sale.id}`, { method: 'DELETE', headers: adminHeaders });
    }
    await request(`${BASE_URL}/products/${testProduct1Id}`, { method: 'DELETE', headers: adminHeaders });
    await request(`${BASE_URL}/products/${testProduct2Id}`, { method: 'DELETE', headers: adminHeaders });
    console.log('  Cleaned up test data.');

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
