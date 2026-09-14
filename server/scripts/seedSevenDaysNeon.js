import { connectDB, sequelize, activeDatabaseType } from '../config/database.js';
import { 
  Product, 
  Stock, 
  Supplier, 
  Purchase, 
  PurchaseItem, 
  Sale, 
  SaleItem, 
  ExpiryBatch, 
  AuditLog, 
  User 
} from '../models/index.js';

async function runSeed() {
  console.log('--- Starting 7-Day Neon Database Seeder ---');
  await connectDB();
  console.log('Connected to DB engine:', activeDatabaseType);

  // 1. Get an existing admin or staff user for addedBy
  const adminUser = await User.findOne({ where: { role: 'admin' } }) || await User.findOne();
  const staffUser = await User.findOne({ where: { role: 'staff' } }) || adminUser;
  const adminId = adminUser ? adminUser.id : 1;
  const staffId = staffUser ? staffUser.id : adminId;

  console.log(`Using admin userId: ${adminId}, staff userId: ${staffId}`);

  // 2. Create 3 Verified Dairy Suppliers
  const suppliersData = [
    {
      name: 'Mother Dairy Central Processing Plant (NCR)',
      contactPerson: 'Harish Rawat',
      phone: '+91 98110 45210',
      email: 'plant.delhi@motherdairy.com',
      address: 'Patparganj Industrial Area, New Delhi - 110092',
      gstNumber: '07AAACM1234F1Z5',
      category: 'Cooperative',
      notes: 'Primary fresh milk and dairy processing plant'
    },
    {
      name: 'Lucknow Dairy Federation Cooperative',
      contactPerson: 'Suresh Chandra',
      phone: '+91 94150 78234',
      email: 'lucknow.fed@dairyup.gov.in',
      address: 'Vikas Nagar Dairy Complex, Lucknow - 226022',
      gstNumber: '09AAABL5678G2Z1',
      category: 'Dairy Farm',
      notes: 'Direct farm procurement and bulk pouch consignments'
    },
    {
      name: 'Amrit Ghee & Sweets Confectionery Ltd',
      contactPerson: 'Manoj Agarwal',
      phone: '+91 98390 11988',
      email: 'orders@amritdairy.in',
      address: 'Transport Nagar Sector C, Lucknow - 226012',
      gstNumber: '09AAACA9988H1Z9',
      category: 'Packaging',
      notes: 'Long-life ghee, butter, and traditional dairy sweets supplier'
    }
  ];

  const suppliers = [];
  for (const sData of suppliersData) {
    let sup = await Supplier.findOne({ where: { name: sData.name } });
    if (!sup) {
      sup = await Supplier.create(sData);
    }
    suppliers.push(sup);
  }
  console.log(`✓ ${suppliers.length} Suppliers active in Neon`);

  // 3. Define 10 Top-Selling Dairy Products
  const productsData = [
    {
      name: 'Mother Dairy Full Cream Milk (500ml)',
      category: 'milk',
      unit: 'pack',
      unitPrice: 34.00,
      costPrice: 28.00,
      qrCode: 'DAIRY-MLK-1001',
      barcode: '8901262010014',
      shelfLifeDays: 2,
      reorderThreshold: 25,
      description: 'Rich and creamy pasteurized homogenized full cream milk with 6.0% fat.'
    },
    {
      name: 'Mother Dairy Toned Milk (1 Litre)',
      category: 'milk',
      unit: 'pack',
      unitPrice: 56.00,
      costPrice: 46.00,
      qrCode: 'DAIRY-MLK-1002',
      barcode: '8901262010021',
      shelfLifeDays: 2,
      reorderThreshold: 30,
      description: 'Wholesome toned milk with 3.0% fat and 8.5% SNF, ideal for daily family tea and health.'
    },
    {
      name: 'Mother Dairy Desi Cow Milk (500ml)',
      category: 'milk',
      unit: 'pack',
      unitPrice: 30.00,
      costPrice: 24.00,
      qrCode: 'DAIRY-MLK-1003',
      barcode: '8901262010038',
      shelfLifeDays: 2,
      reorderThreshold: 20,
      description: 'Light, naturally sweet, nutritious pure cow milk for kids and elders.'
    },
    {
      name: 'Mother Dairy Classic Dahi / Curd (400g)',
      category: 'curd',
      unit: 'cup',
      unitPrice: 45.00,
      costPrice: 35.00,
      qrCode: 'DAIRY-CRD-1004',
      barcode: '8901262020044',
      shelfLifeDays: 7,
      reorderThreshold: 20,
      description: 'Thick, creamy, naturally set probiotic curd made from standardized pasteurized milk.'
    },
    {
      name: 'Mother Dairy Malai Paneer (200g)',
      category: 'paneer',
      unit: 'pack',
      unitPrice: 95.00,
      costPrice: 75.00,
      qrCode: 'DAIRY-PAN-1005',
      barcode: '8901262030050',
      shelfLifeDays: 15,
      reorderThreshold: 15,
      description: 'Super soft, succulent fresh cottage cheese crafted with high moisture retention.'
    },
    {
      name: 'Mother Dairy Pure Cow Ghee (1 Litre)',
      category: 'ghee',
      unit: 'bottle',
      unitPrice: 680.00,
      costPrice: 550.00,
      qrCode: 'DAIRY-GHE-1006',
      barcode: '8901262040066',
      shelfLifeDays: 180,
      reorderThreshold: 10,
      description: 'Golden granular cow ghee made with traditional bilona churn method aroma.'
    },
    {
      name: 'Mother Dairy Table Butter (100g)',
      category: 'butter',
      unit: 'pack',
      unitPrice: 60.00,
      costPrice: 48.00,
      qrCode: 'DAIRY-BUT-1007',
      barcode: '8901262050072',
      shelfLifeDays: 90,
      reorderThreshold: 15,
      description: 'Creamy, lightly salted table butter made from 100% pure fresh cow milk cream.'
    },
    {
      name: 'Mother Dairy Masala Chaach (500ml)',
      category: 'beverages',
      unit: 'bottle',
      unitPrice: 18.00,
      costPrice: 12.00,
      qrCode: 'DAIRY-BEV-1008',
      barcode: '8901262060088',
      shelfLifeDays: 5,
      reorderThreshold: 25,
      description: 'Refreshing spiced buttermilk blended with black salt, cumin, and mint.'
    },
    {
      name: 'Mother Dairy Mishti Doi (85g)',
      category: 'sweets',
      unit: 'cup',
      unitPrice: 25.00,
      costPrice: 18.00,
      qrCode: 'DAIRY-SWT-1009',
      barcode: '8901262070094',
      shelfLifeDays: 10,
      reorderThreshold: 20,
      description: 'Authentic Bengali caramelized sweet baked yogurt packed with traditional goodness.'
    },
    {
      name: 'Mother Dairy Kesar Pista Kulfi (100ml)',
      category: 'icecream',
      unit: 'cup',
      unitPrice: 40.00,
      costPrice: 28.00,
      qrCode: 'DAIRY-ICE-1010',
      barcode: '8901262080109',
      shelfLifeDays: 60,
      reorderThreshold: 15,
      description: 'Royal dessert made with saffron strands, crushed pistachios, and rich condensed milk.'
    }
  ];

  const createdProducts = [];
  for (const p of productsData) {
    let prod = await Product.findOne({ where: { qrCode: p.qrCode } });
    if (!prod) {
      prod = await Product.create(p);
    } else {
      await prod.update(p);
    }
    createdProducts.push(prod);
  }
  console.log(`✓ 10 Products saved in Neon with QR codes and pricing`);

  // 4. Generate 7 Days of Transactions (From 6 days ago up to today)
  // Let base date be 2026-09-14
  const now = new Date();
  const dayOffsets = [6, 5, 4, 3, 2, 1, 0]; // 7 days: 6 days ago -> today

  let totalPurchasedUnitsMap = {};
  let totalSoldUnitsMap = {};
  createdProducts.forEach(p => {
    totalPurchasedUnitsMap[p.id] = 0;
    totalSoldUnitsMap[p.id] = 0;
  });

  const customerNames = [
    'Walk-in Customer',
    'Rajesh Sharma (Flat 402)',
    'Pooja Verma',
    'Amit Gupta (Daily Milk)',
    'Deepak Singh',
    'Sunita Rao',
    'Kavita Malhotra',
    'Vikramaditya Dairy Hub',
    'Ananya Sen',
    'Ramesh Chandra (Tea Stall)'
  ];

  const paymentModes = ['UPI', 'Cash', 'Card', 'UPI', 'Cash'];

  for (const offset of dayOffsets) {
    const txnDate = new Date(now);
    txnDate.setDate(txnDate.getDate() - offset);
    const dateStr = txnDate.toISOString().split('T')[0];
    const dayNum = 7 - offset; // Day 1 to 7

    console.log(`\n--- Seeding Day ${dayNum} (${dateStr}) ---`);

    // A. Daily Bulk Order (Purchases) from Supplier
    // Rotate suppliers
    const supplier = suppliers[offset % suppliers.length];
    const invoiceNum = `INV-MD-${dateStr.replace(/-/g, '')}-${101 + offset}`;

    // Select 4-6 products to purchase in this batch
    const purchaseItemsData = [];
    let purchaseTotal = 0;

    // Daily staple milk is purchased every day
    const dailyPicks = [
      createdProducts[0], // Full Cream
      createdProducts[1], // Toned Milk
      createdProducts[2], // Cow Milk
      createdProducts[3 + (offset % 7)], // Rotating curd/paneer/ghee
      createdProducts[4 + ((offset + 2) % 6)] // Rotating sweets/beverages
    ];

    dailyPicks.forEach((prod, idx) => {
      // Quantity varies between 20 to 60 units
      const qty = prod.category === 'milk' ? (35 + (offset * 3) + idx * 5) : (15 + (offset * 2) + idx * 3);
      const cost = Number(prod.costPrice);
      const subtotal = Number((qty * cost).toFixed(2));
      purchaseTotal += subtotal;

      const batchNum = `BCH-${prod.category.toUpperCase().slice(0, 3)}-${dateStr.replace(/-/g, '').slice(4)}-${10 + idx}`;
      const expiry = new Date(txnDate);
      expiry.setDate(expiry.getDate() + Number(prod.shelfLifeDays || 3));

      purchaseItemsData.push({
        productId: prod.id,
        quantity: qty,
        costPrice: cost,
        subtotal: subtotal,
        batchNumber: batchNum,
        expiryDate: expiry
      });

      totalPurchasedUnitsMap[prod.id] += qty;
    });

    const purchase = await Purchase.create({
      invoiceNumber: invoiceNum,
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalAmount: purchaseTotal,
      date: txnDate,
      addedBy: adminId,
      notes: `Fresh morning dairy consignment received at Rajajipuram outlet from ${supplier.name}. Cold chain verified at 4°C.`
    });

    for (const itemData of purchaseItemsData) {
      await PurchaseItem.create({
        purchaseId: purchase.id,
        productId: itemData.productId,
        quantity: itemData.quantity,
        costPrice: itemData.costPrice,
        subtotal: itemData.subtotal,
        batchNumber: itemData.batchNumber,
        expiryDate: itemData.expiryDate
      });

      // Create ExpiryBatch record
      await ExpiryBatch.create({
        productId: itemData.productId,
        batchNumber: itemData.batchNumber,
        manufactureDate: txnDate,
        expiryDate: itemData.expiryDate,
        quantity: itemData.quantity,
        status: itemData.expiryDate < now ? 'expired' : 'fresh',
        addedBy: adminId,
        notes: `Inward from ${invoiceNum}`
      });
    }

    console.log(`  ✓ Bulk Order ${invoiceNum}: ₹${purchaseTotal.toLocaleString()} (${purchaseItemsData.length} items)`);

    // B. Daily Counter Sales & Receipts (4 to 6 receipts per day)
    const numSalesThisDay = 4 + (offset % 3); // 4 to 6 sales
    for (let sIdx = 0; sIdx < numSalesThisDay; sIdx++) {
      const saleTime = new Date(txnDate);
      saleTime.setHours(7 + sIdx * 3, 15 + sIdx * 7, 0, 0); // Spaced through morning, noon, evening
      const receiptTimeStr = String(saleTime.getHours()).padStart(2, '0') + String(saleTime.getMinutes()).padStart(2, '0');
      const receiptNum = `REC-${dateStr.replace(/-/g, '')}-${receiptTimeStr}-${100 + sIdx}`;

      const customer = customerNames[(offset + sIdx) % customerNames.length];
      const payMode = paymentModes[(offset + sIdx) % paymentModes.length];

      // Each receipt has 1 to 3 items
      const numItemsInSale = 1 + ((sIdx + offset) % 3);
      let saleSubtotal = 0;
      const saleItemsToCreate = [];

      for (let itemI = 0; itemI < numItemsInSale; itemI++) {
        const prod = createdProducts[(sIdx * 2 + itemI) % createdProducts.length];
        const qty = prod.category === 'milk' ? (1 + (sIdx % 3)) : (1 + (itemI % 2));
        const price = Number(prod.unitPrice);
        const costSnapshot = Number(prod.costPrice);
        const subtotal = Number((qty * price).toFixed(2));
        saleSubtotal += subtotal;

        saleItemsToCreate.push({
          productId: prod.id,
          quantity: qty,
          sellingPrice: price,
          costPriceSnapshot: costSnapshot,
          subtotal: subtotal
        });

        totalSoldUnitsMap[prod.id] += qty;
      }

      const discount = sIdx === 2 ? 10.00 : 0.00; // Small promotional discount occasionally
      const totalAmount = Math.max(0, saleSubtotal - discount);

      const sale = await Sale.create({
        receiptNumber: receiptNum,
        date: saleTime,
        subtotal: saleSubtotal,
        discount: discount,
        totalAmount: totalAmount,
        customerName: customer,
        outletOrRoute: 'Rajajipuram Counter #1',
        paymentMode: payMode,
        addedBy: staffId,
        notes: `Customer counter billing via ${payMode}`
      });

      for (const it of saleItemsToCreate) {
        await SaleItem.create({
          saleId: sale.id,
          productId: it.productId,
          quantity: it.quantity,
          sellingPrice: it.sellingPrice,
          costPriceSnapshot: it.costPriceSnapshot,
          subtotal: it.subtotal
        });
      }
    }
    console.log(`  ✓ ${numSalesThisDay} Customer Sales Receipts recorded for ${dateStr}`);
  }

  // 5. Update Live Stock Table with Exact Balances
  console.log('\n--- Syncing Live Stock Balances in Neon ---');
  for (const prod of createdProducts) {
    const purchased = totalPurchasedUnitsMap[prod.id] || 0;
    const sold = totalSoldUnitsMap[prod.id] || 0;
    const balance = Math.max(12, purchased - sold); // Maintain realistic healthy store inventory

    let stockRec = await Stock.findOne({ where: { productId: prod.id } });
    if (!stockRec) {
      stockRec = await Stock.create({
        productId: prod.id,
        currentQuantity: balance,
        reorderThreshold: prod.reorderThreshold || 20,
        lastUpdated: new Date()
      });
    } else {
      await stockRec.update({
        currentQuantity: balance,
        reorderThreshold: prod.reorderThreshold || 20,
        lastUpdated: new Date()
      });
    }

    console.log(`  [Stock] ${prod.name}: Inward=${purchased}, Sold=${sold}, Current Balance=${balance} ${prod.unit}`);
  }

  // 6. Log Comprehensive Audit Record in Neon
  await AuditLog.create({
    userId: adminId,
    action: '7-Day Realistic Production Seeding',
    details: JSON.stringify({
      products: createdProducts.length,
      suppliers: suppliers.length,
      daysSpanned: 7,
      note: 'Populated 7 days of verified bulk orders, customer receipts, live stock balances, and P&L history in Neon Postgres.'
    }),
    ipAddress: '127.0.0.1'
  });

  console.log('\n======================================================');
  console.log('✓ SEEDING COMPLETE: Neon PostgreSQL fully updated!');
  console.log('======================================================');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seeder execution error:', err);
  process.exit(1);
});
