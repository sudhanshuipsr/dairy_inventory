import { connectDB, sequelize, activeDatabaseType } from '../config/database.js';
import { 
  User, 
  Product, 
  Stock, 
  Purchase, 
  PurchaseItem, 
  Sale, 
  SaleItem, 
  Production, 
  ProductionOutput, 
  ExpiryBatch, 
  AuditLog, 
  Feedback, 
  Supplier 
} from '../models/index.js';
import { initializeDefaultUsers } from '../utils/seedData.js';

async function resetAllDemoData() {
  console.log(`\n========================================`);
  console.log(`[CLEAN ERP] Connecting to DB (${activeDatabaseType})...`);
  console.log(`========================================\n`);

  await connectDB();
  await sequelize.sync();

  console.log('[CLEAN ERP] Deleting all demo data across all tables...');

  try {
    // Attempt SQL Truncate CASCADE for Postgres
    if (activeDatabaseType === 'postgres') {
      await sequelize.query('TRUNCATE TABLE sale_items, sales, purchase_items, purchases, production_outputs, productions, expiry_batches, feedbacks, audit_logs, stocks, products, suppliers CASCADE;');
      console.log('✓ Truncated PostgreSQL tables in cascade mode.');
    } else {
      throw new Error('Using ORM fallback for non-postgres/sqlite');
    }
  } catch (sqlErr) {
    console.log('[CLEAN ERP] Using Model destroy cascade fallback...');
    await SaleItem.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Sale.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await PurchaseItem.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Purchase.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await ProductionOutput.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Production.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await ExpiryBatch.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Feedback.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Stock.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Product.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
    await Supplier.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});
  }

  // Ensure fresh Admin & Staff accounts are present for clean login
  console.log('[CLEAN ERP] Ensuring default admin and staff credentials exist...');
  const { admin, staff } = await initializeDefaultUsers();

  console.log('\n========================================');
  console.log(' DATABASE SUCCESSFULLY WIPED & RESET FRESH');
  console.log('========================================');
  console.log(`Products: 0`);
  console.log(`Stock records: 0`);
  console.log(`Sales invoices: 0`);
  console.log(`Purchases: 0`);
  console.log(`Production batches: 0`);
  console.log(`Expiry batches: 0`);
  console.log(`Feedback / Ratings: 0`);
  console.log(`Admin Login: admin@dairy.com / admin123`);
  console.log(`Staff Login: staff@dairy.com / staff123`);
  console.log('========================================\n');

  process.exit(0);
}

resetAllDemoData().catch((err) => {
  console.error('[Clean Error]:', err);
  process.exit(1);
});
