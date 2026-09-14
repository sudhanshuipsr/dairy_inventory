import { connectDB, activeDatabaseType, sequelize } from '../config/database.js';
import { Product, Stock, Purchase, Sale, Supplier, User, ExpiryBatch } from '../models/index.js';

async function check() {
  console.log('Connecting...');
  await connectDB();
  console.log('Active DB type:', activeDatabaseType);

  const productCount = await Product.count();
  const stockCount = await Stock.count();
  const purchaseCount = await Purchase.count();
  const saleCount = await Sale.count();
  const supplierCount = await Supplier.count();
  const userCount = await User.count();
  const batchCount = await ExpiryBatch.count();

  console.log({
    productCount,
    stockCount,
    purchaseCount,
    saleCount,
    supplierCount,
    userCount,
    batchCount
  });

  const products = await Product.findAll({ limit: 5 });
  console.log('Sample products:', products.map(p => ({ id: p.id, name: p.name, price: p.unitPrice, cost: p.costPrice })));

  process.exit(0);
}

check().catch(err => {
  console.error('Check error:', err);
  process.exit(1);
});
