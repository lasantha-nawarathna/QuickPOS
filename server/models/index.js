const sequelize = require('../config/db');

const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Customer = require('./Customer');
const Supplier = require('./Supplier');
const Purchase = require('./Purchase');
const PurchaseItem = require('./PurchaseItem');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Return = require('./Return');
const InventoryTransaction = require('./InventoryTransaction');
const Setting = require('./Setting');

// Setup Associations

// Product & Category
Category.hasMany(Product, { foreignKey: 'category_id', onDelete: 'SET NULL' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'Category' });

// Supplier & Purchase
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', onDelete: 'SET NULL' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'Supplier' });

// Purchase & PurchaseItem
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id' });

// Product & PurchaseItem
Product.hasMany(PurchaseItem, { foreignKey: 'product_id', onDelete: 'RESTRICT' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });

// Customer & Sale
Customer.hasMany(Sale, { foreignKey: 'customer_id', onDelete: 'SET NULL' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'Customer' });

// User (Cashier) & Sale
User.hasMany(Sale, { foreignKey: 'cashier_id', onDelete: 'RESTRICT' });
Sale.belongsTo(User, { foreignKey: 'cashier_id', as: 'Cashier' });

// Sale & SaleItem
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });

// Product & SaleItem
Product.hasMany(SaleItem, { foreignKey: 'product_id', onDelete: 'RESTRICT' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });

// Sale & Return
Sale.hasOne(Return, { foreignKey: 'sale_id', onDelete: 'CASCADE' });
Return.belongsTo(Sale, { foreignKey: 'sale_id', as: 'Sale' });

// Product & InventoryTransaction
Product.hasMany(InventoryTransaction, { foreignKey: 'product_id', onDelete: 'CASCADE' });
InventoryTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Customer,
  Supplier,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  Return,
  InventoryTransaction,
  Setting
};
