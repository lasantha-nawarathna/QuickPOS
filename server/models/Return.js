const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Return = sequelize.define('Return', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sale_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'returns'
});

module.exports = Return;
