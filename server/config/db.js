const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../pos.sqlite'),
  logging: false, // Set to console.log to see SQL queries in dev
  define: {
    timestamps: false, // Disable default timestamps globally; we will define manually if needed
    underscored: true // Use snake_case in column naming
  }
});

module.exports = sequelize;
