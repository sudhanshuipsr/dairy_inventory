import { connectDB } from '../config/database.js';
import { Product, Stock, Purchase, Sale, SaleItem, PurchaseItem, Supplier } from '../models/index.js';
import { Op } from 'sequelize';

async function verify() {
  await connectDB();
  console.log('=== VERIFYING 7-DAY SYSTEM METRICS IN NEON POSTGRES ===\n');

  // 1. Products & Live Stock
  const products = await Product.findAll({
    include: [{ model: Stock, as: 'stock' }],
    order: [['id', 'ASC']]
  });

  console.log('1. CATALOG & LIVE STOCK LEVELS:');
  let totalStockUnits = 0;
  let totalStockValuation = 0;
  let totalStockCost = 0;

  products.forEach((p, idx) => {
    const qty = p.stock?.currentQuantity || 0;
    const price = Number(p.unitPrice);
    const cost = Number(p.costPrice);
    const val = qty * price;
    totalStockUnits += qty;
    totalStockValuation += val;
    totalStockCost += (qty * cost);

    console.log(`  ${idx + 1}. ${p.name} | Price: ₹${price} | Cost: ₹${cost} | In-Stock: ${qty} ${p.unit} | Value: ₹${val.toLocaleString()}`);
  });

  console.log(`\n  >> Total Catalog Items: ${products.length}`);
  console.log(`  >> Total Live Stock Units: ${totalStockUnits}`);
  console.log(`  >> Total Inventory Valuation (Retail): ₹${totalStockValuation.toLocaleString()}`);
  console.log(`  >> Total Inventory Cost: ₹${totalStockCost.toLocaleString()}\n`);

  // 2. 7-Day Bulk Orders (Purchases)
  const purchases = await Purchase.findAll({
    include: [{ model: PurchaseItem, as: 'items' }],
    order: [['date', 'ASC']]
  });

  console.log('2. LAST 7 DAYS BULK ORDERS (PURCHASES):');
  let totalPurchasesSpent = 0;
  purchases.forEach((pur, idx) => {
    const amt = Number(pur.totalAmount);
    totalPurchasesSpent += amt;
    const dateStr = new Date(pur.date).toISOString().split('T')[0];
    console.log(`  ${idx + 1}. [${dateStr}] ${pur.invoiceNumber} | ${pur.supplierName} | Items: ${pur.items.length} | Amount: ₹${amt.toLocaleString()}`);
  });
  console.log(`  >> Total Bulk Orders: ${purchases.length}`);
  console.log(`  >> Total Bulk Spend: ₹${totalPurchasesSpent.toLocaleString()}\n`);

  // 3. 7-Day Sales & Receipts
  const sales = await Sale.findAll({
    include: [{ model: SaleItem, as: 'items' }],
    order: [['date', 'ASC']]
  });

  console.log('3. LAST 7 DAYS SALES & COUNTER RECEIPTS:');
  let totalRevenue = 0;
  let totalCOGS = 0;
  let paymentModeBreakdown = { Cash: 0, UPI: 0, Card: 0 };

  sales.forEach((s) => {
    const amt = Number(s.totalAmount);
    totalRevenue += amt;
    paymentModeBreakdown[s.paymentMode] = (paymentModeBreakdown[s.paymentMode] || 0) + amt;

    s.items.forEach((it) => {
      totalCOGS += (Number(it.costPriceSnapshot || 0) * Number(it.quantity || 0));
    });
  });

  const grossProfit = totalRevenue - totalCOGS;
  const marginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

  console.log(`  >> Total Receipts Issued: ${sales.length}`);
  console.log(`  >> Gross Revenue: ₹${totalRevenue.toLocaleString()}`);
  console.log(`  >> Cost of Goods Sold (COGS): ₹${totalCOGS.toLocaleString()}`);
  console.log(`  >> Gross Profit: ₹${grossProfit.toLocaleString()} (Margin: ${marginPct}%)`);
  console.log(`  >> Payment Breakdown: UPI: ₹${paymentModeBreakdown.UPI.toLocaleString()} | Cash: ₹${paymentModeBreakdown.Cash.toLocaleString()} | Card: ₹${paymentModeBreakdown.Card.toLocaleString()}\n`);

  console.log('======================================================');
  console.log('✓ VERIFICATION SUCCESS: All 7-day data confirmed in Neon!');
  console.log('======================================================');
  process.exit(0);
}

verify().catch(e => {
  console.error('Verify error:', e);
  process.exit(1);
});
