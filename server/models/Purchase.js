import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Purchase extends Model {}

Purchase.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    supplierName: {
      type: DataTypes.STRING(150),
      defaultValue: 'Local Dairy Cooperative'
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
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
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: ''
    }
  },
  {
    sequelize,
    modelName: 'Purchase',
    tableName: 'purchases',
    timestamps: true
  }
);

export default Purchase;
