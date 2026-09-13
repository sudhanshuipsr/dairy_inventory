import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Supplier extends Model {}

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Supplier name is required' }
      }
    },
    contactPerson: {
      type: DataTypes.STRING(100),
      defaultValue: ''
    },
    phone: {
      type: DataTypes.STRING(30),
      defaultValue: ''
    },
    email: {
      type: DataTypes.STRING(120),
      defaultValue: '',
      validate: {
        isEmailOrEmpty(val) {
          if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            throw new Error('Please provide a valid email address');
          }
        }
      }
    },
    address: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    gstNumber: {
      type: DataTypes.STRING(50),
      defaultValue: ''
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'raw-milk'
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
    timestamps: true
  }
);

export default Supplier;
