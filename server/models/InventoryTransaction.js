const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InventoryTransaction = sequelize.define('InventoryTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.ENUM('sale', 'purchase', 'return', 'adjustment', 'transfer'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false // positive for stock addition, negative for stock reduction
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true // references sale_id, purchase_id, return_id, etc.
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory_transactions'
});

module.exports = InventoryTransaction;
