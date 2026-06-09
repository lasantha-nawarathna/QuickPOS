# Build a Complete Point of Sale (POS) System

Create a modern, production-ready Point of Sale (POS) system using:

* Backend: Node.js (Express.js)
* Database: SQLite
* Frontend: HTML, CSS, JavaScript
* Authentication: JWT
* UI Framework: Bootstrap 5
* ORM: Sequelize
* API Style: REST API

## Core Features

### User Management

* Login/Logout
* JWT Authentication
* Role-based access control
* Roles:

  * Administrator
  * Manager
  * Cashier

### Dashboard

* Daily sales summary
* Monthly sales summary
* Total products
* Low stock alerts
* Top-selling products
* Recent transactions

### Product Management

* Add/Edit/Delete products
* Product categories
* Barcode support
* SKU support
* Product image upload
* Cost price
* Selling price
* Tax percentage
* Stock quantity
* Reorder level

### Category Management

* Create categories
* Edit categories
* Delete categories
* Assign products to categories

### Customer Management

* Add/Edit/Delete customers
* Customer loyalty points
* Customer purchase history
* Customer contact details

### Supplier Management

* Add/Edit/Delete suppliers
* Supplier contact information
* Purchase history

### Inventory Management

* Stock adjustments
* Stock transfers
* Purchase orders
* Inventory history
* Low stock notifications

### Sales Module

* POS interface optimized for touch screens
* Product search
* Barcode scanning
* Add products to cart
* Quantity adjustment
* Discount support
* Tax calculation
* Multiple payment methods:

  * Cash
  * Card
  * Bank Transfer
  * Mixed Payment
* Print receipt
* Generate invoice
* Hold sale
* Resume sale

### Returns & Refunds

* Return products
* Refund transactions
* Return history

### Reporting

Generate reports with filters:

* Daily sales
* Weekly sales
* Monthly sales
* Product sales
* Category sales
* Cashier performance
* Inventory valuation
* Profit and loss
* Customer purchases

Allow:

* Export to PDF
* Export to Excel
* Print reports

### Settings

* Store information
* Tax settings
* Receipt customization
* Currency settings
* Backup settings

### Backup & Restore

* SQLite database backup
* Restore from backup
* Scheduled backup support

## Database Design

Create SQLite tables:

### users

* id
* username
* password_hash
* full_name
* role
* created_at

### categories

* id
* name
* description

### products

* id
* category_id
* barcode
* sku
* name
* description
* image
* cost_price
* selling_price
* tax_rate
* stock_quantity
* reorder_level
* created_at

### customers

* id
* first_name
* last_name
* phone
* email
* address
* loyalty_points

### suppliers

* id
* name
* phone
* email
* address

### purchases

* id
* supplier_id
* purchase_date
* total_amount

### purchase_items

* id
* purchase_id
* product_id
* quantity
* cost_price

### sales

* id
* customer_id
* cashier_id
* sale_date
* subtotal
* discount
* tax
* total
* payment_method

### sale_items

* id
* sale_id
* product_id
* quantity
* unit_price
* tax_amount

### returns

* id
* sale_id
* return_date
* refund_amount

### inventory_transactions

* id
* product_id
* transaction_type
* quantity
* reference_id
* created_at

## API Requirements

Create REST APIs for:

* Authentication
* Products
* Categories
* Customers
* Suppliers
* Purchases
* Sales
* Returns
* Reports
* Settings

Use:

* Express Router
* Sequelize ORM
* Input validation
* Error handling middleware
* JWT middleware
* Logging middleware

## UI Requirements

### POS Screen

* Responsive design
* Product grid
* Search bar
* Shopping cart panel
* Payment modal
* Receipt preview

### Admin Panel

* Sidebar navigation
* Dashboard widgets
* Data tables
* Pagination
* Search and filters
* CRUD forms

## Technical Requirements

Project structure:

/server
/controllers
/models
/routes
/middleware
/services
/utils

/client
/pages
/components
/assets

Use:

* Express.js
* Sequelize
* SQLite
* JWT
* bcrypt
* multer
* Bootstrap 5
* Chart.js

## Deliverables

Generate:

1. Complete SQLite schema
2. Sequelize models
3. Express API routes
4. Controllers
5. Middleware
6. Authentication system
7. Bootstrap frontend
8. Dashboard charts
9. POS sales screen
10. Receipt printing
11. Database seed data
12. Installation instructions
13. Environment configuration
14. Sample admin account

Provide all source code files with clear folder structure and comments.
