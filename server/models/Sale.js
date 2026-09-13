import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Sale extends Model {}

Sale.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    receiptNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    customerName: {
      type: DataTypes.STRING(150),
      defaultValue: 'Walk-in Customer'
    },
    outletOrRoute: {
      type: DataTypes.STRING(100),
      defaultValue: 'Counter POS'
    },
    paymentMode: {
      type: DataTypes.ENUM('Cash', 'UPI', 'Card', 'Credit'),
      defaultValue: 'Cash'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    addedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    // Legacy single-line columns (retained for backward compatibility)
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0
    },
    costPriceSnapshot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0
    }
  },
  {
    sequelize,
    modelName: 'Sale',
    tableName: 'sales',
    timestamps: true
  }
);

export default Sale;
