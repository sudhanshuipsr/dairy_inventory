import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import sequelize from '../config/database.js';
import { 
  User, 
  Product, 
  Stock, 
  Purchase, 
  PurchaseItem, 
  Sale, 
  SaleItem, 
  Supplier 
} from '../models/index.js';
import { getAnalyticsReport, getDashboardStats } from '../controllers/reportController.js';

async function runTests() {
  console.log('=== Starting Phase 6: Profit & Loss Reporting + Dashboard Verification ===\n');

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Setup Test Admin User
    let admin = await User.findOne({ where: { email: 'admin@dairy.com' } });
    if (!admin) {
      admin = await User.findOne();
    }
    const adminId = admin ? admin.id : null;

    // 2. Setup 2 Controlled Products for mathematical assertions
    const testCodeA = `TEST-P6-A-${Date.now()}`;
    const testCodeB = `TEST-P6-B-${Date.now()}`;

    const productA = await Product.create({
      name: 'P6 Test Cow Milk 1L',
      category: 'milk',
      unit: 'litre',
      costPrice: 60.00,
      unitPrice: 80.00,
      currentQuantity: 100,
      reorderThreshold: 15,
      qrCode: testCodeA,
      isActive: true
    });

    const productB = await Product.create({
      name: 'P6 Test Premium Ghee 500ml',
      category: 'ghee',
      unit: 'tin',
      costPrice: 40.00,
      unitPrice: 100.00,
      currentQuantity: 100,
      reorderThreshold: 10,
      qrCode: testCodeB,
      isActive: true
    });

    console.log(`Created Product A: ID ${productA.id}, Cost ₹60, Sell ₹80 (Expected Margin: 25%)`);
    console.log(`Created Product B: ID ${productB.id}, Cost ₹40, Sell ₹100 (Expected Margin: 60%)`);

    // 3. Create a Controlled Multi-Line Purchase
    const purchase = await Purchase.create({
      supplierName: 'P6 Verification Supplier',
      invoiceNumber: `INV-P6-${Date.now()}`,
      totalAmount: 1100.00,
      date: new Date(),
      addedBy: adminId
    });

    await PurchaseItem.bulkCreate([
      {
        purchaseId: purchase.id,
        productId: productA.id,
        quantity: 10,
        costPrice: 60.00,
        subtotal: 600.00
      },
      {
        purchaseId: purchase.id,
        productId: productB.id,
        quantity: 10,
        costPrice: 50.00, // custom batch cost
        subtotal: 500.00
      }
    ]);
    console.log(`Created Multi-Line Purchase: ID ${purchase.id}, Total ₹1,100`);

    // 4. Create a Controlled Multi-Line Sale with Discount
    // Item 1: Product A, Qty: 5, Sell: ₹80, Cost: ₹60 => Subtotal ₹400, Cost: ₹300, Profit: ₹100 (Margin: 25%)
    // Item 2: Product B, Qty: 3, Sell: ₹100, Cost: ₹40 => Subtotal ₹300, Cost: ₹120, Profit: ₹180 (Margin: 60%)
    // Discount: ₹20
    // Total Revenue: 400 + 300 - 20 = ₹680
    // Total Cost: 300 + 120 = ₹420
    // Gross Profit: 680 - 420 = ₹260
    const saleReceipt = `REC-P6-${Date.now()}`;
    const sale = await Sale.create({
      receiptNumber: saleReceipt,
      customerName: 'P6 Test Auditor',
      date: new Date(),
      subtotal: 700.00,
      discount: 20.00,
      totalAmount: 680.00,
      paymentMode: 'Cash',
      outletOrRoute: 'Main Test Counter',
      addedBy: adminId
    });

    await SaleItem.bulkCreate([
      {
        saleId: sale.id,
        productId: productA.id,
        quantity: 5,
        sellingPrice: 80.00,
        costPriceSnapshot: 60.00,
        subtotal: 400.00
      },
      {
        saleId: sale.id,
        productId: productB.id,
        quantity: 3,
        sellingPrice: 100.00,
        costPriceSnapshot: 40.00,
        subtotal: 300.00
      }
    ]);
    console.log(`Created Multi-Line Sale: ID ${sale.id}, Total ₹680, Discount ₹20`);

    // 5. Test Controller Logic for Analytics / Reporting API
    console.log('\nTesting getAnalyticsReport endpoint...');
    let analyticsResponseData = null;
    const reqMock = {
      query: {
        range: 'today'
      }
    };
    const resMock = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        analyticsResponseData = data;
        return this;
      }
    };

    await getAnalyticsReport(reqMock, resMock);

    if (!analyticsResponseData || !analyticsResponseData.success) {
      throw new Error(`Analytics API failed: ${analyticsResponseData?.message}`);
    }

    const summary = analyticsResponseData.summary;
    console.log('Summary returned by Analytics API:');
    console.log(`- Gross Revenue: ₹${summary.totalSalesAmount}`);
    console.log(`- Total COGS: ₹${summary.totalCOGS}`);
    console.log(`- Gross Profit: ₹${summary.grossProfit}`);
    console.log(`- Profit Margin: ${summary.profitMarginPct}%`);

    // Verify mathematical accuracy
    console.log('\n--- Mathematical Verification ---');
    if (summary.totalSalesAmount < 680) {
      throw new Error(`Expected at least ₹680 sales amount, got ₹${summary.totalSalesAmount}`);
    }
    if (summary.totalCOGS < 420) {
      throw new Error(`Expected at least ₹420 COGS, got ₹${summary.totalCOGS}`);
    }
    console.log('✓ Sales and COGS aggregation mathematically verified.');

    // Verify Product Performance in Analytics
    const prodPerf = analyticsResponseData.productPerformance || [];
    const perfA = prodPerf.find(p => p.id === productA.id);
    const perfB = prodPerf.find(p => p.id === productB.id);

    if (!perfA || !perfB) {
      throw new Error('Test products missing from product performance breakdown!');
    }

    console.log(`Product A Performance: Revenue ₹${perfA.revenue}, Cost ₹${perfA.cost}, Profit ₹${perfA.profit}, Margin ${perfA.profitMargin}%`);
    console.log(`Product B Performance: Revenue ₹${perfB.revenue}, Cost ₹${perfB.cost}, Profit ₹${perfB.profit}, Margin ${perfB.profitMargin}%`);

    if (perfA.profit !== 100 || perfA.revenue !== 400 || perfA.profitMargin !== 25) {
      throw new Error(`Product A profit calculation mismatch! Expected profit ₹100 & 25% margin, got ₹${perfA.profit} & ${perfA.profitMargin}%`);
    }
    if (perfB.profit !== 180 || perfB.revenue !== 300 || perfB.profitMargin !== 60) {
      throw new Error(`Product B profit calculation mismatch! Expected profit ₹180 & 60% margin, got ₹${perfB.profit} & ${perfB.profitMargin}%`);
    }
    console.log('✓ Per-item profit = (sellingPrice - costPrice) * quantity mathematically exact!');

    // Check Best / Worst Performing Ranking
    const bestProducts = analyticsResponseData.bestPerformingProducts || [];
    const isBInBest = bestProducts.some(p => p.id === productB.id);
    if (!isBInBest) {
      console.warn('Warning: Product B not in best list (might be due to top-8 slice among existing demo data)');
    } else {
      console.log('✓ Product B correctly identified in Best Performing list.');
    }

    // 6. Test Controller Logic for Dashboard Stats
    console.log('\nTesting getDashboardStats endpoint...');
    let dashboardStatsData = null;
    const dashResMock = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        dashboardStatsData = data;
        return this;
      }
    };

    await getDashboardStats({}, dashResMock);

    if (!dashboardStatsData || !dashboardStatsData.success) {
      throw new Error(`Dashboard Stats API failed: ${dashboardStatsData?.message}`);
    }

    const dStats = dashboardStatsData.stats;
    console.log('Dashboard Stats returned:');
    console.log(`- Today Sales: ₹${dStats.today?.salesAmount} (${dStats.today?.salesCount} orders, ${dStats.today?.salesQuantity} items)`);
    console.log(`- Today Purchases: ₹${dStats.today?.purchasesAmount} (${dStats.today?.purchasesCount} orders)`);
    console.log(`- Stock Value: ₹${dStats.totalInventoryValue} (${dStats.totalStockUnits} units)`);
    console.log(`- Low-Stock Count: ${dStats.lowStockCount}`);
    console.log(`- Near Expiry Count: ${dStats.nearExpiryCount}`);
    console.log(`- Today Gross Profit: ₹${dStats.today?.grossProfit}`);

    if (dStats.today?.salesAmount < 680) {
      throw new Error(`Dashboard today sales expected >= 680, got ${dStats.today?.salesAmount}`);
    }
    if (dStats.today?.purchasesAmount < 1100) {
      throw new Error(`Dashboard today purchases expected >= 1100, got ${dStats.today?.purchasesAmount}`);
    }
    console.log('✓ Dashboard stats match underlying multi-line sales and purchases.');

    // Check recent activity feed
    const recentSales = dStats.recentActivity?.sales || [];
    const foundOurSale = recentSales.find(s => s.id === sale.id || s.receiptNumber === saleReceipt);
    if (!foundOurSale) {
      console.warn('Sale not in top-8 recent sales');
    } else {
      console.log(`✓ Recent activity feed correctly populated with receipt: ${foundOurSale.receiptNumber}, items: ${foundOurSale.items?.length}`);
    }

    // 7. Cleanup test records
    await SaleItem.destroy({ where: { saleId: sale.id } });
    await Sale.destroy({ where: { id: sale.id } });
    await PurchaseItem.destroy({ where: { purchaseId: purchase.id } });
    await Purchase.destroy({ where: { id: purchase.id } });
    await Product.destroy({ where: { id: [productA.id, productB.id] } });
    console.log('\n✓ Cleaned up test transactions & products.');

    console.log('\n======================================================');
    console.log('🎉 ALL PHASE 6 REPORTING & DASHBOARD TESTS PASSED! 🎉');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Phase 6 verification failed:', error);
    process.exit(1);
  }
}

runTests();
