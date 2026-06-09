const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cashier_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sale_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING, // 'Cash', 'Card', 'Bank Transfer', 'Mixed Payment'
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'held', 'returned'),
    allowNull: false,
    defaultValue: 'completed'
  }
}, {
  tableName: 'sales'
});

module.exports = Sale;
