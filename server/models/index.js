import sequelize from '../config/database.js';
import User from './User.js';
import Product from './Product.js';
import Stock from './Stock.js';
import Purchase from './Purchase.js';
import Sale from './Sale.js';
import Production from './Production.js';
import ProductionOutput from './ProductionOutput.js';
import ExpiryBatch from './ExpiryBatch.js';
import AuditLog from './AuditLog.js';
import Feedback from './Feedback.js';
import Supplier from './Supplier.js';

// --- Associations ---

// Product <-> Stock (1:1)
Product.hasOne(Stock, { foreignKey: 'productId', as: 'stock', onDelete: 'CASCADE' });
Stock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Supplier <-> Purchases (1:N)
Supplier.hasMany(Purchase, { foreignKey: 'supplierId', as: 'purchases' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// Product <-> Purchases (1:N)
Product.hasMany(Purchase, { foreignKey: 'productId', as: 'purchases', onDelete: 'CASCADE' });
Purchase.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(Purchase, { foreignKey: 'addedBy', as: 'purchases' });
Purchase.belongsTo(User, { foreignKey: 'addedBy', as: 'user' });

// Product <-> Sales (1:N)
Product.hasMany(Sale, { foreignKey: 'productId', as: 'sales', onDelete: 'CASCADE' });
Sale.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(Sale, { foreignKey: 'addedBy', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'addedBy', as: 'user' });

// Product <-> ExpiryBatches (1:N)
Product.hasMany(ExpiryBatch, { foreignKey: 'productId', as: 'batches', onDelete: 'CASCADE' });
ExpiryBatch.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(ExpiryBatch, { foreignKey: 'addedBy', as: 'batches' });
ExpiryBatch.belongsTo(User, { foreignKey: 'addedBy', as: 'user' });

// Production <-> Raw Milk Product & User
Production.belongsTo(Product, { foreignKey: 'rawMilkProductId', as: 'rawMilkProduct' });
Production.belongsTo(User, { foreignKey: 'addedBy', as: 'user' });

// Production <-> ProductionOutputs (1:N)
Production.hasMany(ProductionOutput, { foreignKey: 'productionId', as: 'outputProducts', onDelete: 'CASCADE' });
ProductionOutput.belongsTo(Production, { foreignKey: 'productionId', as: 'production' });
ProductionOutput.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User <-> AuditLogs (1:N)
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  Product,
  Stock,
  Purchase,
  Sale,
  Production,
  ProductionOutput,
  ExpiryBatch,
  AuditLog,
  Feedback,
  Supplier
};


export default {
  sequelize,
  User,
  Product,
  Stock,
  Purchase,
  Sale,
  Production,
  ProductionOutput,
  ExpiryBatch,
  AuditLog,
  Feedback
};

