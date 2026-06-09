require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, User, Category, Setting, Product, Customer, Supplier, Sale, SaleItem } = require('./server/models');
const apiRoutes = require('./server/routes');
const logger = require('./server/middleware/logger');
const errorHandler = require('./server/middleware/error');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Serve Static Client Files
app.use(express.static(path.join(__dirname, 'client')));

// Serve Uploaded Images Statically
app.use('/uploads', express.static(path.join(__dirname, 'client/uploads')));

// Mount API Routes
app.use('/api', apiRoutes);

// Fallback to client SPA index.html for undefined routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

// Error Handler Middleware
app.use(errorHandler);

// Database Sync and Seed Function
const initializeDatabase = async () => {
  try {
    // Sync Database
    await sequelize.sync({ force: false }); // Do not overwrite existing database tables
    console.log('SQLite database synced successfully.');

    // 1. Seed default administrator
    const userCount = await User.count();
    let defaultAdmin;
    if (userCount === 0) {
      console.log('Seeding default administrator...');
      defaultAdmin = await User.create({
        username: 'admin',
        password_hash: 'admin123',
        full_name: 'System Admin',
        role: 'Administrator'
      });
      console.log('Default administrator created (admin / admin123).');
    } else {
      defaultAdmin = await User.findOne({ where: { role: 'Administrator' } });
    }

    // 2. Seed default settings
    const settingsCount = await Setting.count();
    if (settingsCount === 0) {
      console.log('Seeding default settings...');
      await Setting.bulkCreate([
        { key: 'store_name', value: 'Antigravity Retail POS' },
        { key: 'currency_symbol', value: '$' },
        { key: 'tax_rate', value: '8.00' },
        { key: 'receipt_footer', value: 'Thank you for shopping with us!\nCome back again!' }
      ]);
      console.log('Default settings seeded.');
    }

    // 3. Seed default categories
    const categoryCount = await Category.count();
    let categoriesList = [];
    if (categoryCount === 0) {
      console.log('Seeding default categories...');
      categoriesList = await Category.bulkCreate([
        { name: 'Beverages', description: 'Soft drinks, water, tea, and coffee' },
        { name: 'Snacks', description: 'Chips, crackers, cookies, and nuts' },
        { name: 'Electronics', description: 'Cables, chargers, and accessories' },
        { name: 'Apparel', description: 'T-shirts, caps, and clothing items' }
      ]);
      console.log('Default categories seeded.');
    } else {
      categoriesList = await Category.findAll();
    }

    // 4. Seed Suppliers, Customers, Products, and Sales if Products table is empty
    const productCount = await Product.count();
    if (productCount === 0) {
      console.log('Seeding rich dummy products, suppliers, customers, and sales history...');

      // A. Suppliers
      const suppliers = await Supplier.bulkCreate([
        { name: 'Global Beverages Inc.', phone: '555-0211', email: 'supply@globalbev.com', address: '100 Supply Road, NY' },
        { name: 'MegaSnacks Distributor', phone: '555-0222', email: 'orders@megasnacks.com', address: '200 Warehouse Lane, CA' },
        { name: 'TechWorld Wholesale', phone: '555-0233', email: 'sales@techworld.com', address: '300 Tech Plaza, TX' }
      ]);

      // B. Customers
      const customers = await Customer.bulkCreate([
        { first_name: 'John', last_name: 'Doe', phone: '555-0199', email: 'john@example.com', address: '123 Main St, Springfield', loyalty_points: 150 },
        { first_name: 'Jane', last_name: 'Smith', phone: '555-0144', email: 'jane@example.com', address: '456 Elm St, Metropoly', loyalty_points: 320 },
        { first_name: 'Robert', last_name: 'Johnson', phone: '555-0177', email: 'robert@example.com', address: '789 Oak Ave, Riverdale', loyalty_points: 45 }
      ]);

      // Map Categories by Name
      const catMap = {};
      categoriesList.forEach(c => {
        catMap[c.name] = c.id;
      });

      // C. Products
      const productsList = await Product.bulkCreate([
        // Beverages
        { name: 'Coca Cola 355ml', sku: 'COCA100', barcode: '88001', cost_price: 1.00, selling_price: 2.50, tax_rate: 8.00, stock_quantity: 50, reorder_level: 10, category_id: catMap['Beverages'] },
        { name: 'Pepsi 355ml', sku: 'PEPS200', barcode: '88002', cost_price: 0.90, selling_price: 2.40, tax_rate: 8.00, stock_quantity: 40, reorder_level: 10, category_id: catMap['Beverages'] },
        { name: 'Orange Juice 1L', sku: 'OJUIC300', barcode: '88003', cost_price: 1.50, selling_price: 3.50, tax_rate: 8.00, stock_quantity: 30, reorder_level: 8, category_id: catMap['Beverages'] },
        // Snacks
        { name: 'Snickers Candy Bar', sku: 'SNIK400', barcode: '88004', cost_price: 0.50, selling_price: 1.20, tax_rate: 8.00, stock_quantity: 60, reorder_level: 12, category_id: catMap['Snacks'] },
        { name: 'Lays Potato Chips', sku: 'LAYC500', barcode: '88005', cost_price: 0.80, selling_price: 1.99, tax_rate: 8.00, stock_quantity: 25, reorder_level: 10, category_id: catMap['Snacks'] },
        { name: 'Choc Chip Cookie 6pk', sku: 'COOK600', barcode: '88006', cost_price: 1.20, selling_price: 2.99, tax_rate: 8.00, stock_quantity: 15, reorder_level: 8, category_id: catMap['Snacks'] },
        // Electronics
        { name: 'USB-C Charging Cable', sku: 'USBC700', barcode: '88007', cost_price: 3.00, selling_price: 9.99, tax_rate: 8.00, stock_quantity: 20, reorder_level: 5, category_id: catMap['Electronics'] },
        { name: 'Wireless Mouse', sku: 'WMOU800', barcode: '88008', cost_price: 6.50, selling_price: 19.99, tax_rate: 8.00, stock_quantity: 12, reorder_level: 4, category_id: catMap['Electronics'] },
        { name: 'Bluetooth Earbuds', sku: 'BEAR900', barcode: '88009', cost_price: 12.00, selling_price: 34.99, tax_rate: 8.00, stock_quantity: 8, reorder_level: 3, category_id: catMap['Electronics'] },
        // Apparel
        { name: 'V-Neck Cotton T-Shirt', sku: 'TSHIR010', barcode: '88010', cost_price: 5.00, selling_price: 14.99, tax_rate: 8.00, stock_quantity: 18, reorder_level: 5, category_id: catMap['Apparel'] },
        { name: 'Sport Baseball Cap', sku: 'RCAP011', barcode: '88011', cost_price: 4.00, selling_price: 11.99, tax_rate: 8.00, stock_quantity: 10, reorder_level: 4, category_id: catMap['Apparel'] }
      ]);

      // D. Sales History over the last 6 months (Jan to Jun)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      const salesData = [
        { monthOffset: 5, day: 12, subtotal: 150.00, discount: 5.00, tax: 12.00, total: 157.00 },
        { monthOffset: 4, day: 8, subtotal: 280.00, discount: 10.00, tax: 22.40, total: 292.40 },
        { monthOffset: 3, day: 15, subtotal: 350.00, discount: 15.00, tax: 28.00, total: 363.00 },
        { monthOffset: 2, day: 22, subtotal: 420.00, discount: 20.00, tax: 33.60, total: 433.60 },
        { monthOffset: 1, day: 5, subtotal: 510.00, discount: 25.00, tax: 40.80, total: 525.80 },
        { monthOffset: 0, day: 2, subtotal: 180.00, discount: 0.00, tax: 14.40, total: 194.40 }
      ];

      for (let s of salesData) {
        const saleDate = new Date(currentYear, currentMonth - s.monthOffset, s.day, 14, 30, 0);
        
        const sale = await Sale.create({
          customer_id: customers[0].id, // John Doe
          cashier_id: defaultAdmin ? defaultAdmin.id : 1,
          subtotal: s.subtotal,
          discount: s.discount,
          tax: s.tax,
          total: s.total,
          payment_method: 'Cash',
          status: 'completed',
          sale_date: saleDate
        });

        // Add 2 items per sale
        await SaleItem.create({
          sale_id: sale.id,
          product_id: productsList[0].id, // Coca Cola
          quantity: 4,
          unit_price: productsList[0].selling_price,
          tax_amount: (4 * productsList[0].selling_price) * 0.08
        });

        await SaleItem.create({
          sale_id: sale.id,
          product_id: productsList[6].id, // USB Cable
          quantity: 1,
          unit_price: productsList[6].selling_price,
          tax_amount: productsList[6].selling_price * 0.08
        });
      }

      console.log('Dummy data populated successfully.');
    }

  } catch (error) {
    console.error('Error during database initialization:', error);
  }
};


// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}...`);
  await initializeDatabase();
});
