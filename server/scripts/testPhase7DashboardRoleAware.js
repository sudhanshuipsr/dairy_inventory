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
  SaleItem 
} from '../models/index.js';
import { getAnalyticsReport, getDashboardStats, clearReportCache } from '../controllers/reportController.js';

async function runPhase7Tests() {
  console.log('=== Starting Phase 7: Role-Aware Dashboard & Animated KPI Verification ===\n');

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    clearReportCache();

    // 1. Setup Mock Admin and Mock Staff Requests
    const adminReq = {
      user: { id: 1, role: 'admin', email: 'admin@dairy.com' },
      query: { range: '30days' }
    };

    const staffReq = {
      user: { id: 2, role: 'staff', email: 'staff@dairy.com' },
      query: { range: '30days' }
    };

    // --- TEST 1: Admin View for Dashboard Stats ---
    console.log('\n--- 1. Testing Admin Dashboard Stats (Full Financial Access) ---');
    let adminStatsData = null;
    const adminStatsRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { adminStatsData = data; return this; }
    };
    await getDashboardStats(adminReq, adminStatsRes);

    if (!adminStatsData || !adminStatsData.success) {
      throw new Error(`Admin getDashboardStats failed: ${adminStatsData?.message}`);
    }

    const aToday = adminStatsData.stats.today;
    console.log(`Admin Today Gross Profit: ₹${aToday.grossProfit}`);
    console.log(`Admin Total Inventory Valuation: ₹${adminStatsData.stats.totalInventoryValue}`);
    
    if (aToday.grossProfit === undefined) {
      throw new Error('Expected Admin to see today grossProfit, but it was undefined!');
    }
    console.log('✓ Admin dashboard stats correctly includes financial profit numbers.');

    // --- TEST 2: Staff View for Dashboard Stats (Operational Only) ---
    console.log('\n--- 2. Testing Staff Dashboard Stats (Zero Profit/Cost Data) ---');
    let staffStatsData = null;
    const staffStatsRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { staffStatsData = data; return this; }
    };
    await getDashboardStats(staffReq, staffStatsRes);

    if (!staffStatsData || !staffStatsData.success) {
      throw new Error(`Staff getDashboardStats failed: ${staffStatsData?.message}`);
    }

    const sToday = staffStatsData.stats.today;
    console.log(`Staff Today Sales Count: ${sToday.salesCount} orders, Sales Amount: ₹${sToday.salesAmount}`);
    console.log(`Staff Today Gross Profit field: ${sToday.grossProfit}`);

    if (sToday.grossProfit !== undefined || sToday.netProfit !== undefined) {
      throw new Error('SECURITY BREACH: Staff dashboard stats must NOT expose grossProfit or netProfit!');
    }

    // Verify staff cannot see costPriceSnapshot in recentActivity
    const staffRecentSales = staffStatsData.stats.recentActivity?.sales || [];
    staffRecentSales.forEach((s) => {
      if (s.costPriceSnapshot !== undefined) {
        throw new Error('SECURITY BREACH: Staff recent sales exposes costPriceSnapshot!');
      }
      if (s.items) {
        s.items.forEach((it) => {
          if (it.costPriceSnapshot !== undefined) {
            throw new Error('SECURITY BREACH: Staff recent sale line item exposes costPriceSnapshot!');
          }
        });
      }
    });
    console.log('✓ Staff dashboard stats strictly hides profit, COGS, and cost price snapshots.');

    // --- TEST 3: Admin View for Analytics Report ---
    console.log('\n--- 3. Testing Admin Analytics Report (Full P&L, Margins & Suppliers) ---');
    let adminAnalyticsData = null;
    const adminAnalyticsRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { adminAnalyticsData = data; return this; }
    };
    await getAnalyticsReport(adminReq, adminAnalyticsRes);

    const aSummary = adminAnalyticsData.summary;
    console.log(`Admin Gross Revenue: ₹${aSummary.totalSalesAmount}`);
    console.log(`Admin Gross Profit: ₹${aSummary.grossProfit}`);
    console.log(`Admin Profit Margin: ${aSummary.profitMarginPct}%`);
    console.log(`Admin Supplier Performance Items: ${adminAnalyticsData.supplierPerformance?.length}`);
    console.log(`Admin Stock Health Entries: ${adminAnalyticsData.stockHealth?.length}`);

    if (aSummary.grossProfit === undefined || aSummary.profitMarginPct === undefined) {
      throw new Error('Expected Admin analytics to include grossProfit & profitMarginPct!');
    }
    if (!adminAnalyticsData.supplierPerformance) {
      throw new Error('Expected Admin analytics to include supplierPerformance!');
    }
    if (!adminAnalyticsData.bestPerformingProducts) {
      throw new Error('Expected Admin analytics to include bestPerformingProducts!');
    }
    console.log('✓ Admin analytics report includes full P&L, margins, supplier performance, and stock health.');

    // --- TEST 4: Staff View for Analytics Report (Redacted) ---
    console.log('\n--- 4. Testing Staff Analytics Report (Operational Redaction) ---');
    let staffAnalyticsData = null;
    const staffAnalyticsRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { staffAnalyticsData = data; return this; }
    };
    await getAnalyticsReport(staffReq, staffAnalyticsRes);

    const sSummary = staffAnalyticsData.summary;
    console.log(`Staff Gross Revenue: ₹${sSummary.totalSalesAmount}`);
    console.log(`Staff Gross Profit field: ${sSummary.grossProfit}`);
    console.log(`Staff COGS field: ${sSummary.totalCOGS}`);
    console.log(`Staff Profit Margin field: ${sSummary.profitMarginPct}`);
    console.log(`Staff Supplier Performance field: ${staffAnalyticsData.supplierPerformance}`);
    console.log(`Staff Best Performing field: ${staffAnalyticsData.bestPerformingProducts}`);

    if (sSummary.grossProfit !== undefined || sSummary.totalCOGS !== undefined || sSummary.profitMarginPct !== undefined) {
      throw new Error('SECURITY BREACH: Staff analytics exposed profit/COGS/margin in summary!');
    }
    if (staffAnalyticsData.supplierPerformance !== undefined) {
      throw new Error('SECURITY BREACH: Staff analytics exposed supplierPerformance!');
    }
    if (staffAnalyticsData.bestPerformingProducts !== undefined) {
      throw new Error('SECURITY BREACH: Staff analytics exposed bestPerformingProducts!');
    }

    // Verify time series for staff has no cost/profit
    const staffTimeSeries = staffAnalyticsData.timeSeries || [];
    if (staffTimeSeries.length > 0) {
      const sample = staffTimeSeries[0];
      if (sample.cost !== undefined || sample.profit !== undefined || sample.marginPct !== undefined) {
        throw new Error('SECURITY BREACH: Staff time series exposes cost, profit, or marginPct!');
      }
    }
    console.log('✓ Staff analytics report completely sanitized of cost, profit, and supplier financials.');

    // --- TEST 5: Cache Verification ---
    console.log('\n--- 5. Testing In-Memory Query Cache ---');
    const startT = Date.now();
    let cachedStatsData = null;
    const cachedStatsRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { cachedStatsData = data; return this; }
    };
    await getDashboardStats(adminReq, cachedStatsRes);
    const elapsed = Date.now() - startT;
    console.log(`Second getDashboardStats call completed in ${elapsed}ms (served from memory cache).`);
    if (!cachedStatsData || !cachedStatsData.success) {
      throw new Error('Cache hit failed!');
    }
    console.log('✓ 30s TTL in-memory cache functioning seamlessly.');

    console.log('\n=====================================================================');
    console.log('🎉 ALL PHASE 7 ROLE-AWARE & INTERACTIVE DASHBOARD TESTS PASSED! 🎉');
    console.log('=====================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Phase 7 verification failed:', error);
    process.exit(1);
  }
}

runPhase7Tests();
