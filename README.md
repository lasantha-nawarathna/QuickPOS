# QuickPOS - Premium Retail Point of Sale System

QuickPOS is an enterprise-grade, feature-rich Point of Sale (POS) and inventory management system designed for modern retail storefronts. It combines a secure, robust Node.js backend (using Express, SQLite, and Sequelize ORM) with a high-fidelity glassmorphic Single Page Application (SPA) frontend styled with Bootstrap 5 and animated via Chart.js.

---

## Technical Stack

* **Frontend**: Single Page Application (SPA) utilizing HTML5, CSS3 Custom Properties (supporting Light/Dark Themes), Bootstrap 5, FontAwesome 6, Chart.js, and client-side router/API modules.
* **Backend**: Node.js & Express.js API.
* **Database**: SQLite with Sequelize ORM for schema definitions and migrations.
* **Security**: JSON Web Tokens (JWT) for session control and Role-Based Access Control (RBAC) middleware.
* **Exporters**: PDFKit for generating dynamic PDF reports; SheetJS (`xlsx`) for exporting Excel sheets.
* **File Handling**: Multer middleware for validating and storing uploaded product images.

---

## Key Features

1. **POS Screen**: Interactive checkout cart, real-time tax/discount computation, customer linking, and checkout handling Cash, Card, or Mixed Payments (cash + card split).
2. **Hold/Resume Sales**: Park incomplete sales/carts as pending and resume them later from a visual management modal.
3. **Thermal Receipt Printing**: Automatic creation of a monospace formatted thermal slip (`TXN-XXXX`) utilizing clean print styling.
4. **Dashboard & Analytics**: Real-time sales visualizations, daily/monthly summaries, top-selling items lists, and low-stock alerts.
5. **Inventory Control & Purchase Orders**: Detailed product list management, Category classifications, Customer database, Supplier records, and restocking via Purchase Orders.
6. **Returns & Refunds**: Return items from completed sales to automatically restore inventories and issue customer adjustments.
7. **Document Exporters**: Single-click PDF and Excel sheet creation for sales, valuation, categories, and cashier logs.
8. **Settings & Backups**: Dynamic store layout configuration, multi-user system account registration, and SQLite database backup/restore operations.

---

## Setup & Run Guide

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v16.x or higher is recommended).

### 2. Install Dependencies
Run the following command in the root directory to install the package dependencies:
```bash
npm install
```

### 3. Environment Configuration
Verify that the `.env` file in the root directory is set up:
```ini
PORT=3000
JWT_SECRET=super_secret_pos_system_key_2026
NODE_ENV=development
```

### 4. Run the Server
Launch the Node.js application server:
```bash
node server.js
```
The server will synchronize the SQLite database schemas and automatically seed default categories, settings, products, suppliers, customers, and 6 months of historical transactions.

### 5. Access the Web Application
Open your browser and navigate to:
```text
http://localhost:3000
```
* **Default Administrator Username**: `admin`
* **Default Administrator Password**: `admin123`

---

## Core Operations Guide

### A. Completing a POS Sale
1. Go to the **POS Screen** using the sidebar.
2. Select a customer from the dropdown (or leave as **Walk-in Customer**).
3. Search for items or filter using the category pills, then click a card to add the product to your cart.
4. Set a flat discount in the **Discount ($)** field if applicable.
5. Click **Checkout**.
6. Select the **Payment Method**:
   * *Cash*: Enter the Cash Paid. The system displays the change due.
   * *Card / Bank Transfer*: Total amount is charged.
   * *Mixed Payment*: Specify how much is paid by Cash and how much by Card.
7. Click **Complete & Print** to record the sale. A print preview dialog will show the thermal receipt; click **Print Receipt** to open the browser print manager.

### B. Parking (Holding) and Resuming a Sale
* **To Hold**: Add products to your cart and click **Hold Sale** at the bottom of the checkout sidebar. The items will be saved as a pending record and the cart will be cleared.
* **To Resume**: Click the **Resume** button (with the count badge) at the bottom of the checkout sidebar. In the modal, locate the invoice and click **Resume** to restore the cart. Click the **Trash** icon to discard.

### C. Creating a Purchase Order (Restocking)
1. Go to the **Purchases** view.
2. Click **New Purchase Order**.
3. Choose a **Supplier** from the dropdown.
4. Select a product, enter the quantity and cost price, and click **Add Item**.
5. Repeat for other products and click **Submit Purchase Order**. The system will update stock quantities and cost averages.

### D. Exporting Reports
1. Navigate to the **Reports** page.
2. Choose a report type: **Detailed Sales**, **Product Sales**, **Category Sales**, **Cashier Performance**, **Inventory Valuation**, or **Profit & Loss**.
3. Filter by date if needed.
4. Click **Download PDF** or **Download Excel** to export the analytics.

### E. Database Backup & Restore
1. Go to the **Settings** page.
2. Under **Backup & Restore Database**, click **Create SQLite Backup**. The backup file will be created in the `backups/` folder and listed under "Available Database Backups".
3. To restore the database: click **Choose File** in the restore section, select your SQL file, and click **Restore Database**.
