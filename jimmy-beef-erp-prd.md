# Product Requirements Document (PRD)
## Jimmy Beef ERP System

**Version:** 1.0  
**Date:** November 13, 2025  
**Document Owner:** Project Team  
**Status:** Draft

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Requirements](#6-technical-requirements)
7. [Integration Requirements](#7-integration-requirements)
8. [Data Requirements](#8-data-requirements)
9. [Business Rules](#9-business-rules)
10. [Assumptions and Constraints](#10-assumptions-and-constraints)
11. [Out of Scope](#11-out-of-scope)

---

## 1. Executive Summary

### 1.1 Purpose
This document defines the system requirements for Jimmy Beef ERP, a dual-portal web application designed for B2B meat distribution operations in Australia. The system comprises a Customer Portal for order management and an Admin Portal for operations, inventory, packing, delivery, and accounting integration.

### 1.2 Business Objectives
- Streamline customer onboarding and credit application process
- Enable online order placement with customer-specific pricing
- Optimize packing and delivery operations
- Automate invoicing through Xero integration
- Improve delivery route efficiency through area-based logistics
- Maintain comprehensive audit trails for pricing and inventory

### 1.3 Target Users
- **B2B Customers**: Restaurants, butchers, food service businesses
- **Administrative Staff**: Office staff managing customers, products, and pricing
- **Packing Staff**: Warehouse staff preparing orders
- **Delivery Drivers**: Staff delivering orders to customers
- **Management**: Business owners/managers overseeing operations

---

## 2. System Overview

### 2.1 System Architecture
The system consists of two separate web applications:

#### 2.1.1 Customer Portal
- Public-facing web application
- Customer registration and authentication
- Order placement and tracking
- Account management

#### 2.1.2 Admin/Operations Portal
- Internal web application (requires authentication)
- Customer and product management
- Inventory tracking
- Order processing
- Packing interface
- Delivery management
- Xero integration
- Company settings

### 2.2 System Context
```
┌─────────────────┐
│  Customer       │
│  Portal         │
└────────┬────────┘
         │
         │ API
         │
┌────────▼────────────────────────────────────┐
│         Backend API Server                  │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL Database                 │  │
│  └──────────────────────────────────────┘  │
└────────┬────────────────────────────────────┘
         │
         │ API
         │
┌────────▼────────┐         ┌──────────────┐
│  Admin/Ops      │────────▶│  Xero API    │
│  Portal         │         └──────────────┘
└─────────────────┘         ┌──────────────┐
                            │ Google Maps  │
                            └──────────────┘
                            ┌──────────────┐
                            │ Email Service│
                            └──────────────┘
```

---

## 3. User Roles and Permissions

### 3.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Customer** | B2B clients placing orders | Customer Portal only |
| **Admin** | Full system access, manages all aspects | Full access to Admin Portal |
| **Sales/Customer Service** | Manages customers, orders, pricing | Customer management, order placement |
| **Packer** | Prepares orders for delivery | Packing interface only |
| **Driver** | Delivers orders to customers | Delivery interface only |
| **Manager** | Oversees operations and reports | Read access to most modules, settings |

### 3.2 Permission Matrix

| Module/Feature | Customer | Admin | Sales | Packer | Driver | Manager |
|----------------|----------|-------|-------|--------|--------|---------|
| Customer Registration | ✓ | - | - | - | - | - |
| Place Order | ✓ | ✓ | ✓ | - | - | - |
| View Own Orders | ✓ | - | - | - | - | - |
| Manage All Customers | - | ✓ | ✓ | - | - | Read |
| Credit Approval | - | ✓ | - | - | - | - |
| Product Management | - | ✓ | Read | - | - | Read |
| Pricing Management | - | ✓ | - | - | - | Read |
| Inventory Management | - | ✓ | Read | - | - | Read |
| Packing Interface | - | ✓ | - | ✓ | - | Read |
| Delivery Interface | - | ✓ | - | - | ✓ | Read |
| Xero Integration | - | ✓ | - | - | - | - |
| Company Settings | - | ✓ | - | - | - | Read |
| Reports | - | ✓ | Read | - | - | ✓ |

---

## 4. Functional Requirements

### 4.1 Customer Portal

#### 4.1.1 Customer Registration (CP-REG)

**CP-REG-001: Registration Form**
- **Priority:** High
- **Description:** Allow new customers to register for an account
- **Requirements:**
  - Form fields:
    - Business name (required)
    - ABN (Australian Business Number) (required)
    - Contact person name (required)
    - Email address (required, unique)
    - Phone number (required)
    - Business address (required)
      - Street address
      - Suburb (required) - dropdown or autocomplete
      - State (required)
      - Postcode (required)
    - Delivery address (optional, can be same as business address)
      - Street address
      - Suburb (required) - dropdown or autocomplete
      - State (required)
      - Postcode (required)
    - Password (required, minimum 8 characters)
    - Confirm password (required)
  - Email validation (format and uniqueness check)
  - ABN format validation
  - Password strength indicator
  - Terms and conditions acceptance checkbox
  - Upon submission, account status = "Pending Approval"

**CP-REG-002: Automated Suburb-to-Area Tagging**
- **Priority:** High
- **Description:** Automatically assign delivery area based on suburb selection
- **Requirements:**
  - Suburb selection triggers automatic area tagging (North, South, East, West, etc.)
  - Use Australian suburb database with predefined area mappings
  - Display selected area to customer during registration (read-only)
  - Area assignment affects delivery routing in admin portal

**CP-REG-003: Credit Application Process**
- **Priority:** High
- **Description:** Submit credit application as part of registration
- **Requirements:**
  - Credit application form fields:
    - Requested credit limit
    - Trade references (minimum 2)
      - Company name
      - Contact person
      - Phone number
      - Email
    - Bank details
      - Bank name
      - Account number
      - BSB
    - Years in business
    - Annual revenue range (dropdown)
    - Business type (dropdown: Restaurant, Butcher, Catering, Other)
  - Upload capability for supporting documents:
    - Business registration certificate
    - Bank statements (optional)
    - Trade references (optional)
    - Maximum file size: 5MB per file
    - Accepted formats: PDF, JPG, PNG
  - Submission creates record in admin portal for approval
  - Email notification sent to admin upon submission
  - Confirmation email sent to customer

**CP-REG-004: Registration Confirmation**
- **Priority:** Medium
- **Description:** Provide feedback to customer after registration
- **Requirements:**
  - Success message displayed on screen
  - Confirmation email sent with:
    - Registration details
    - Pending approval status
    - Expected approval timeframe
    - Contact information for inquiries
  - Redirect to login page after 5 seconds

#### 4.1.2 Customer Authentication (CP-AUTH)

**CP-AUTH-001: Customer Login**
- **Priority:** High
- **Description:** Allow approved customers to access their account
- **Requirements:**
  - Login form with email and password
  - "Remember me" checkbox (30-day session)
  - "Forgot password" link
  - Login only allowed for approved accounts
  - Display error message for pending/rejected accounts
  - Account lockout after 5 failed attempts (15-minute cooldown)
  - Session timeout after 4 hours of inactivity

**CP-AUTH-002: Password Reset**
- **Priority:** High
- **Description:** Allow customers to reset forgotten password
- **Requirements:**
  - Request password reset via email
  - Send password reset link (valid for 1 hour)
  - Password reset form with:
    - New password field
    - Confirm password field
    - Password strength indicator
  - Email confirmation upon successful reset
  - Invalidate all existing sessions on password reset

**CP-AUTH-003: Customer Profile Management**
- **Priority:** Medium
- **Description:** Allow customers to update their profile information
- **Requirements:**
  - Editable fields:
    - Contact person name
    - Phone number
    - Business address
    - Delivery address
    - Email (requires verification)
  - Non-editable fields (require admin approval):
    - Business name
    - ABN
    - Credit limit
  - Password change functionality
  - View credit application status
  - View account status (Active, Suspended, Pending)

#### 4.1.3 Product Catalog (CP-PROD)

**CP-PROD-001: Browse Products**
- **Priority:** High
- **Description:** Display available products to customers
- **Requirements:**
  - Product listing with:
    - Product name
    - Product code/SKU
    - Description
    - Product image (if available)
    - Unit of measure (kg, units, cartons, etc.)
    - Customer-specific price (visible only to logged-in customers)
    - Stock availability indicator (In Stock, Low Stock, Out of Stock)
  - Category/filter options:
    - By product type (Beef, Lamb, Pork, Poultry, Processed, etc.)
    - By availability (In Stock only)
  - Search functionality
  - Sort options (Name A-Z, Price Low-High, Price High-Low)
  - Grid or list view toggle

**CP-PROD-002: Product Details**
- **Priority:** Medium
- **Description:** Show detailed product information
- **Requirements:**
  - Full product description
  - Nutritional information (if available)
  - Storage instructions
  - Customer-specific price with GST breakdown
  - Multiple product images
  - Related products suggestions
  - Add to cart button
  - Quantity selector

#### 4.1.4 Order Placement (CP-ORDER)

**CP-ORDER-001: Shopping Cart**
- **Priority:** High
- **Description:** Allow customers to build an order
- **Requirements:**
  - Add products to cart
  - Update quantities
  - Remove items
  - Display running total with GST
  - Display estimated delivery date based on current time vs. cutoff time
  - Cart persists across sessions (saved to database)
  - Stock validation on add to cart
  - Show delivery address
  - Option to add order notes/special instructions
  - Proceed to checkout button

**CP-ORDER-002: Order Cutoff Time Enforcement**
- **Priority:** High
- **Description:** Enforce order cutoff time for next-day delivery
- **Requirements:**
  - Display current order cutoff time on cart/checkout page
  - Show time remaining until cutoff (countdown)
  - Orders placed before cutoff: eligible for next-day delivery
  - Orders placed after cutoff:
    - Display message: "Orders placed after [cutoff time] require admin contact for delivery scheduling"
    - Order still submitted but flagged as "After Cutoff"
    - Email notification sent to admin
    - Customer notified to expect contact from admin
  - Cutoff time configurable by admin (system-wide setting)
  - Consider public holidays and weekends (future enhancement)

**CP-ORDER-003: Order Checkout**
- **Priority:** High
- **Description:** Finalize and submit order
- **Requirements:**
  - Review order summary:
    - Product list with quantities and prices
    - Subtotal
    - GST
    - Total amount
  - Confirm delivery address
  - Add purchase order number (optional)
  - Add delivery instructions (optional)
  - Review estimated delivery date
  - Accept terms and conditions (checkbox)
  - Submit order button
  - Validation:
    - Cart not empty
    - Stock availability check
    - Credit limit check (if applicable)

**CP-ORDER-004: Order Confirmation**
- **Priority:** High
- **Description:** Confirm successful order submission
- **Requirements:**
  - Display order confirmation page with:
    - Order number
    - Order date and time
    - Estimated delivery date
    - Order summary
    - Delivery address
  - Send confirmation email with:
    - Order details
    - Estimated delivery date
    - Invoice (if applicable)
    - Contact information
  - Option to print order confirmation
  - Redirect to order history after 10 seconds

#### 4.1.5 Order Management (CP-ORDER-MGMT)

**CP-ORDER-MGMT-001: Order History**
- **Priority:** High
- **Description:** View past orders
- **Requirements:**
  - List all orders with:
    - Order number
    - Order date
    - Total amount
    - Status (Pending, Processing, Packed, Out for Delivery, Delivered)
    - Delivery date
  - Filter by:
    - Date range
    - Status
  - Search by order number
  - Sort by date (newest first by default)
  - Pagination (20 orders per page)
  - Click to view order details

**CP-ORDER-MGMT-002: Order Details**
- **Priority:** High
- **Description:** View detailed information for a specific order
- **Requirements:**
  - Order information:
    - Order number
    - Order date and time
    - Status with status history/timeline
    - Delivery address
    - Purchase order number
    - Delivery instructions
  - Product list with quantities and prices
  - Subtotal, GST, total
  - Estimated/actual delivery date
  - Delivery tracking information (when available)
  - Invoice link (if generated)
  - Print order button
  - Reorder button (copy items to cart)

**CP-ORDER-MGMT-003: Delivery Tracking**
- **Priority:** Medium
- **Description:** Track order delivery status
- **Requirements:**
  - Order status timeline:
    - Order Placed
    - Processing
    - Packed
    - Out for Delivery
    - Delivered
  - Each status shows timestamp
  - For "Out for Delivery" status:
    - Display driver name (optional)
    - Display expected delivery time window (if available)
  - For "Delivered" status:
    - Display delivery date and time
    - Display delivery proof (signature image or photo)
    - Display recipient name
  - Email notifications on status changes
  - Real-time status updates (poll every 30 seconds when on order details page)

---

### 4.2 Admin Portal - Customer Management

#### 4.2.1 Customer Administration (ADM-CUST)

**ADM-CUST-001: Customer List**
- **Priority:** High
- **Description:** View and manage all customers
- **Requirements:**
  - Display customer list with:
    - Business name
    - Contact person
    - Email
    - Phone
    - Suburb
    - Delivery area (North, South, East, West)
    - Account status (Pending, Approved, Active, Suspended, Rejected)
    - Credit limit
    - Outstanding balance (future enhancement)
    - Date registered
  - Filter by:
    - Account status
    - Delivery area
    - Date registered range
  - Search by business name, email, ABN, suburb
  - Sort by any column
  - Pagination (50 customers per page)
  - Bulk actions:
    - Export to CSV
    - Bulk status change (with confirmation)
  - Click to view/edit customer details

**ADM-CUST-002: Customer Details**
- **Priority:** High
- **Description:** View and edit detailed customer information
- **Requirements:**
  - View/edit fields:
    - Business name
    - ABN
    - Contact person name
    - Email
    - Phone
    - Business address
    - Delivery address
    - Delivery area (auto-assigned, can override)
    - Account status
    - Credit limit
    - Payment terms
    - Customer notes (internal, not visible to customer)
  - Display registration date
  - Display last login date
  - Display last order date
  - View order history for this customer
  - View pricing overrides for this customer
  - View credit application details
  - View uploaded documents
  - Activity log:
    - Status changes
    - Credit limit changes
    - Pricing changes
    - Order history summary
  - Save changes button
  - Validation on save
  - Audit trail of all changes

**ADM-CUST-003: Credit Application Management**
- **Priority:** High
- **Description:** Review and approve/reject credit applications
- **Requirements:**
  - Dedicated "Credit Applications" page showing:
    - Pending applications count (badge/notification)
    - List of pending applications with:
      - Business name
      - Requested credit limit
      - Date submitted
      - Priority indicator
  - Credit application details:
    - All submitted information
    - Uploaded documents (view/download)
    - Trade references
    - Bank details
    - Business information
  - Actions:
    - Approve (opens dialog to set credit limit and payment terms)
    - Reject (requires reason, sent to customer via email)
    - Request more information (sends email to customer)
  - Upon approval:
    - Customer account status changes to "Approved"
    - Credit limit set
    - Email notification sent to customer with approval details
    - Customer can now place orders
  - Upon rejection:
    - Customer account status changes to "Rejected"
    - Email notification sent with reason
    - Customer cannot place orders
  - Approval history with approver name and timestamp

**ADM-CUST-004: Customer Status Management**
- **Priority:** High
- **Description:** Manage customer account status
- **Requirements:**
  - Status options:
    - Pending: New registration, awaiting approval
    - Approved: Credit approved, can place orders
    - Active: Has placed at least one order
    - Suspended: Temporarily disabled (e.g., payment issues)
    - Rejected: Credit application declined
  - Status change requires confirmation
  - Status change triggers:
    - Email notification to customer (if applicable)
    - Activity log entry
    - Audit trail
  - Suspended accounts:
    - Cannot place new orders
    - Can view order history
    - Display message on customer login

---

### 4.3 Admin Portal - Product & Inventory Management

#### 4.3.1 Product Management (ADM-PROD)

**ADM-PROD-001: Product List**
- **Priority:** High
- **Description:** View and manage all products
- **Requirements:**
  - Display product list with:
    - Product code/SKU
    - Product name
    - Category
    - Base price (default price)
    - Unit of measure
    - Current stock level
    - Status (Active, Inactive)
  - Filter by:
    - Category
    - Status
    - Stock level (In Stock, Low Stock, Out of Stock)
  - Search by product name, SKU, description
  - Sort by any column
  - Pagination (50 products per page)
  - Actions:
    - Add new product
    - Edit product
    - Activate/deactivate product
    - Bulk update base price (with percentage or fixed amount)
    - Export to CSV
  - Click to view/edit product details

**ADM-PROD-002: Product Creation/Editing**
- **Priority:** High
- **Description:** Create new products or edit existing ones
- **Requirements:**
  - Product fields:
    - Product code/SKU (required, unique)
    - Product name (required)
    - Category (required, dropdown)
    - Description (rich text editor)
    - Unit of measure (required, dropdown: kg, units, cartons, boxes)
    - Base price (required, decimal, GST exclusive)
    - GST applicable (checkbox, default: yes)
    - Product images (upload multiple, max 5 images, 2MB each)
    - Nutritional information (optional, structured fields)
    - Storage instructions (optional)
    - Minimum order quantity (optional)
    - Status (Active/Inactive)
  - Image management:
    - Upload images (drag and drop or file picker)
    - Set primary image
    - Delete images
    - Reorder images
  - Save/update button
  - Validation on save
  - Audit trail of all changes

**ADM-PROD-003: Product Categories**
- **Priority:** Medium
- **Description:** Manage product categories
- **Requirements:**
  - Category management page
  - CRUD operations for categories:
    - Create new category
    - Edit category name
    - Delete category (only if no products assigned)
    - Reorder categories
  - Categories examples:
    - Beef
    - Lamb
    - Pork
    - Poultry
    - Processed Meats
    - Specialty Items

#### 4.3.2 Pricing Management (ADM-PRICE)

**ADM-PRICE-001: Base Pricing**
- **Priority:** High
- **Description:** Manage default product prices
- **Requirements:**
  - Base price set at product level (see ADM-PROD-002)
  - Base price applies to all customers unless overridden
  - Price includes GST calculation
  - Historical price tracking (audit trail)

**ADM-PRICE-002: Customer-Specific Pricing**
- **Priority:** High
- **Description:** Set custom prices for individual customers per product
- **Requirements:**
  - Access from customer details page or product details page
  - Customer-specific pricing page showing:
    - Customer name
    - Product list with:
      - Product name
      - Base price
      - Customer-specific price (if set)
      - Effective date
      - Status (Active/Inactive)
  - Actions:
    - Add price override for a product
    - Edit existing price override
    - Remove price override (revert to base price)
    - Bulk price update (apply percentage discount to all products)
  - Price override form:
    - Product selector (search/dropdown)
    - Override price (required, decimal)
    - Effective from date (optional, defaults to current date)
    - Effective to date (optional, for temporary pricing)
    - Notes (optional, internal)
  - Price comparison:
    - Show base price vs. customer price
    - Show percentage difference
    - Show cost savings for customer
  - Validation:
    - Price must be greater than zero
    - Effective from date cannot be in the past
    - Effective to date must be after effective from date
  - Save changes
  - Audit trail required (see ADM-PRICE-003)

**ADM-PRICE-003: Pricing Audit Trail**
- **Priority:** High
- **Description:** Track all pricing changes for compliance and analysis
- **Requirements:**
  - Audit log records:
    - Date and time of change
    - User who made the change (name and email)
    - Change type (Created, Updated, Deleted)
    - Product affected (name and SKU)
    - Customer affected (if customer-specific price)
    - Old price
    - New price
    - Percentage change
    - Reason/notes (if provided)
  - Audit log accessible from:
    - Product details page (product-specific audit)
    - Customer details page (customer-specific audit)
    - Dedicated "Price Changes Report" page (all changes)
  - Filter audit log by:
    - Date range
    - User
    - Product
    - Customer
    - Change type
  - Export audit log to CSV
  - Audit records are immutable (cannot be edited or deleted)
  - Retention period: 7 years (configurable)

**ADM-PRICE-004: Bulk Pricing Updates**
- **Priority:** Medium
- **Description:** Update multiple prices at once
- **Requirements:**
  - Bulk update wizard:
    1. Select scope:
       - All products (base pricing)
       - Specific category
       - Specific customer (all products)
    2. Select products (multi-select)
    3. Define update:
       - Increase by percentage (e.g., +5%)
       - Decrease by percentage (e.g., -10%)
       - Set fixed price (applies to all selected products)
       - Multiply by factor (e.g., ×1.05)
    4. Preview changes:
       - Show before/after prices
       - Show total impact
    5. Confirm and apply
  - Effective date selector (apply now or schedule for future)
  - Reason for change (required for audit trail)
  - Confirmation dialog with summary
  - Apply changes
  - Audit trail records all changes individually

#### 4.3.3 Inventory Management (ADM-INV)

**ADM-INV-001: Stock Levels Overview**
- **Priority:** High
- **Description:** Monitor current stock levels across all products
- **Requirements:**
  - Stock dashboard showing:
    - Total products
    - Low stock items count (below threshold)
    - Out of stock items count
    - Total inventory value
  - Product stock list with:
    - Product name and SKU
    - Category
    - Current stock level
    - Unit of measure
    - Reorder level (threshold for low stock alert)
    - Stock status indicator (In Stock, Low Stock, Out of Stock)
    - Last stock movement date
    - Last updated by
  - Color coding:
    - Green: Stock > reorder level
    - Yellow: Stock ≤ reorder level (Low Stock)
    - Red: Stock = 0 (Out of Stock)
  - Filter by:
    - Category
    - Stock status
    - Date range (last movement)
  - Search by product name/SKU
  - Sort by any column
  - Export to CSV

**ADM-INV-002: Stock Adjustments**
- **Priority:** High
- **Description:** Manually adjust stock levels
- **Requirements:**
  - Stock adjustment form:
    - Product selector (search/dropdown)
    - Adjustment type:
      - Add stock (stock receipt, returns)
      - Remove stock (damage, waste, theft)
      - Set stock (stocktake correction)
    - Quantity (required, positive number)
    - Reason (required, dropdown + free text):
      - Stock Receipt
      - Stocktake Adjustment
      - Damage/Waste
      - Customer Return
      - Theft/Loss
      - Other (specify)
    - Reference number (optional, e.g., supplier invoice, stocktake sheet)
    - Notes (optional, internal)
    - Date of adjustment (defaults to current date)
  - Calculations:
    - Display current stock
    - Display adjustment amount
    - Display new stock level (calculated)
  - Confirmation before applying
  - Save adjustment
  - Audit trail of all adjustments (see ADM-INV-004)
  - Email notification to manager if adjustment > threshold value

**ADM-INV-003: Stock Movements (Automatic)**
- **Priority:** High
- **Description:** Automatically track stock changes from orders
- **Requirements:**
  - Stock automatically reduced when:
    - Order is marked as "Packed"
    - Quantity deducted = order quantity
  - Stock automatically increased when:
    - Credit note issued (product return)
  - Each movement creates audit record with:
    - Product
    - Quantity changed
    - Movement type (Order Fulfillment, Return)
    - Related order number
    - Date and time
    - User who triggered the movement
    - Previous stock level
    - New stock level
  - Stock movement history visible on product details page
  - Cannot process order if insufficient stock (validation)

**ADM-INV-004: Inventory Audit Trail**
- **Priority:** High
- **Description:** Complete history of all stock movements
- **Requirements:**
  - Audit log records:
    - Date and time
    - Product (name and SKU)
    - Movement type (Receipt, Adjustment, Order Fulfillment, Return)
    - Quantity change (+/-)
    - Previous stock level
    - New stock level
    - Reason/reference
    - User who made the change
    - Related order number (if applicable)
  - Audit log page with filters:
    - Date range
    - Product
    - Movement type
    - User
  - Search by reference number or order number
  - Export to CSV
  - Audit records are immutable
  - Retention period: 7 years

**ADM-INV-005: Stock Alerts**
- **Priority:** Medium
- **Description:** Notify staff when stock levels are low
- **Requirements:**
  - Low stock threshold configurable per product
  - Alert triggers when stock level ≤ reorder level
  - Alerts displayed on:
    - Inventory dashboard (banner notification)
    - Product list (icon/badge on low stock items)
  - Email notifications:
    - Sent to designated email addresses (configurable)
    - Daily digest of low stock items
    - Immediate alert for out of stock items
  - Email includes:
    - Product name and SKU
    - Current stock level
    - Reorder level
    - Suggested reorder quantity (future enhancement)

**ADM-INV-006: Stock Receiving**
- **Priority:** Medium
- **Description:** Record stock receipts from suppliers
- **Requirements:**
  - Stock receiving form:
    - Supplier name (dropdown or free text)
    - Invoice/delivery note number (optional)
    - Received date (defaults to current date)
    - Products received:
      - Product selector
      - Quantity received
      - Unit cost (optional, for inventory valuation)
      - Expiry date (optional)
      - Notes
    - Add multiple products to single receipt
  - Save receipt
  - Automatically creates stock adjustment records
  - Audit trail of all receipts
  - Print/export receipt for records

---

### 4.4 Admin Portal - Order Management

#### 4.4.1 Order Administration (ADM-ORDER)

**ADM-ORDER-001: Order List**
- **Priority:** High
- **Description:** View and manage all orders
- **Requirements:**
  - Display order list with:
    - Order number
    - Customer name
    - Order date and time
    - Total amount
    - Status (Pending, Processing, Packed, Out for Delivery, Delivered)
    - Delivery date (estimated or actual)
    - Delivery area
    - After cutoff flag (Yes/No, highlighted)
    - Payment status (Paid, Pending, Overdue) - future enhancement
  - Filter by:
    - Status
    - Date range
    - Delivery area
    - After cutoff (Yes/No)
    - Customer
  - Search by order number, customer name, PO number
  - Sort by any column (default: newest first)
  - Pagination (50 orders per page)
  - Bulk actions:
    - Export to CSV
    - Print packing slips (multiple orders)
    - Change status (with confirmation)
  - Click to view/edit order details

**ADM-ORDER-002: Order Details**
- **Priority:** High
- **Description:** View and edit detailed order information
- **Requirements:**
  - Order header:
    - Order number
    - Customer name (link to customer details)
    - Order date and time
    - Status (editable via dropdown)
    - After cutoff flag
    - Delivery address
    - Delivery area
    - Estimated/actual delivery date
    - Purchase order number
    - Delivery instructions
    - Order notes (customer)
    - Internal notes (admin only)
  - Product line items:
    - Product name
    - SKU
    - Quantity ordered
    - Unit price (customer-specific price)
    - Line total
    - Edit/remove line item (if order not packed)
  - Order totals:
    - Subtotal
    - GST
    - Total amount
  - Actions:
    - Edit order (add/remove products, change quantities)
    - Change status
    - Cancel order (requires reason)
    - Generate/regenerate invoice (Xero)
    - Print packing slip
    - Print delivery note
    - View related invoice in Xero (link)
  - Order timeline:
    - Status history with timestamps and user
    - Notes/comments with timestamps
  - Validation:
    - Cannot edit order if status = Packed, Out for Delivery, or Delivered
    - Stock check when adding products or increasing quantities
    - Credit limit check for customer
  - Save changes
  - Audit trail of all changes

**ADM-ORDER-003: Create Order on Behalf of Customer**
- **Priority:** High
- **Description:** Allow admin to place orders for customers
- **Requirements:**
  - "New Order" button on admin portal
  - Order creation form:
    - Customer selector (search/dropdown, required)
    - Loads customer's delivery address and area
    - Product selector with search/autocomplete
    - Add products with quantities
    - Apply customer-specific pricing automatically
    - Display stock availability
    - Display order total with GST
    - Delivery date selector (defaults to next available)
    - Purchase order number (optional)
    - Delivery instructions (optional)
    - Internal notes (optional)
  - Validation:
    - Customer must be active
    - Stock availability check
    - Credit limit check
  - Submit order button
  - Order confirmation page
  - Email notification sent to customer
  - Order appears in customer's order history

**ADM-ORDER-004: After-Cutoff Order Management**
- **Priority:** High
- **Description:** Handle orders placed after cutoff time
- **Requirements:**
  - Orders placed after cutoff automatically flagged
  - Flag visible in order list and order details
  - Email notification sent to admin immediately
  - Admin dashboard shows count of after-cutoff orders
  - Admin can:
    - Contact customer to arrange delivery
    - Schedule delivery date manually
    - Update order status
    - Add notes about delivery arrangement
  - Customer receives email notification:
    - Acknowledging order receipt
    - Informing them admin will contact them
    - Providing contact information
  - Once delivery arranged:
    - Admin updates delivery date
    - Customer receives confirmation email

**ADM-ORDER-005: Order Status Management**
- **Priority:** High
- **Description:** Manage order lifecycle through status changes
- **Requirements:**
  - Status workflow:
    ```
    Pending → Processing → Packed → Out for Delivery → Delivered
    ```
  - Status definitions:
    - **Pending**: Order submitted, awaiting processing
    - **Processing**: Order being prepared
    - **Packed**: Order packed and ready for delivery
    - **Out for Delivery**: Order assigned to driver, in transit
    - **Delivered**: Order successfully delivered
    - **Cancelled**: Order cancelled (terminal status)
  - Status change triggers:
    - **Pending → Processing**: Manual (admin changes status)
    - **Processing → Packed**: Manual (admin or packer marks as packed)
      - Triggers stock deduction
      - Generates invoice in Xero
    - **Packed → Out for Delivery**: Automatic when driver starts delivery run or manual
    - **Out for Delivery → Delivered**: Manual (driver marks as delivered with proof)
    - **Cancelled**: Manual (admin cancels, requires reason)
  - Status change notifications:
    - Email sent to customer on each status change
    - Include updated delivery information
  - Status change validation:
    - Cannot skip statuses (must follow workflow)
    - Cannot revert to previous status (except admin override)
    - Cannot change status of cancelled order
  - Audit trail of all status changes

**ADM-ORDER-006: Order Cancellation**
- **Priority:** Medium
- **Description:** Cancel orders when necessary
- **Requirements:**
  - Cancel order button (available if order not delivered)
  - Cancellation dialog:
    - Reason for cancellation (required, dropdown + free text):
      - Customer request
      - Stock unavailable
      - Delivery issue
      - Duplicate order
      - Other (specify)
    - Confirmation checkbox
  - Upon cancellation:
    - Order status changes to "Cancelled"
    - If stock already deducted, return stock to inventory
    - If invoice already created in Xero, create credit note
    - Email notification sent to customer
    - Audit trail entry
  - Cancelled orders visible in order list with filter
  - Cannot un-cancel an order (must create new order)

---

### 4.5 Admin Portal - Packing Interface

#### 4.5.1 Packing Management (ADM-PACK)

**ADM-PACK-001: Packing Dashboard**
- **Priority:** High
- **Description:** Overview of orders ready for packing
- **Requirements:**
  - Dashboard showing:
    - Total orders ready to pack (status = Processing)
    - Orders by delivery area (North, South, East, West)
    - Expected delivery date for current batch
    - Packing session summary (today's orders)
  - Quick actions:
    - Start packing session
    - View packing list
    - Print all packing slips
  - Filter orders by:
    - Delivery date
    - Delivery area
    - Customer
  - Refresh button (updates in real-time)

**ADM-PACK-002: Consolidated Packing List**
- **Priority:** High
- **Description:** Show total products needed across all orders in a packing session
- **Requirements:**
  - Packing session selector:
    - Today's orders (default)
    - Tomorrow's orders
    - Custom date selection
    - Specific delivery area
  - Consolidated product list showing:
    - Product name
    - SKU
    - Total quantity needed (sum of all orders)
    - Unit of measure
    - Number of orders containing this product
    - Stock availability (In Stock, Insufficient Stock)
    - Pick location (future enhancement)
  - Sort by:
    - Product name
    - Total quantity
    - Pick location
  - Export to CSV
  - Print consolidated list
  - Stock validation:
    - Highlight products with insufficient stock (in red)
    - Show available quantity vs. required quantity
    - Prevent packing session if stock insufficient

**ADM-PACK-003: Order-by-Order Packing Checklist**
- **Priority:** High
- **Description:** Pack individual orders with checklist functionality
- **Requirements:**
  - Order packing list showing all orders in session:
    - Order number
    - Customer name
    - Delivery address
    - Delivery area
    - Number of items
    - Total weight (future enhancement)
    - Packing status (Not Started, In Progress, Completed)
  - Click on order to view order details:
    - Product list with:
      - Product name
      - SKU
      - Quantity
      - Unit of measure
      - Checkbox (to mark as picked)
    - Special instructions/notes
    - Delivery instructions
    - Packing notes (editable, internal)
  - Checklist functionality:
    - Check off each product as it's packed
    - Visual progress indicator (X of Y items packed)
    - Warning if not all items checked before marking as complete
  - Mark order as packed button:
    - Requires all items checked (or confirmation to override)
    - Changes order status to "Packed"
    - Deducts stock from inventory
    - Triggers Xero invoice generation
    - Moves order to delivery queue
    - Email notification sent to customer
  - Print packing slip for individual order
  - Print delivery label (future enhancement)

**ADM-PACK-004: Packing Slip Generation**
- **Priority:** High
- **Description:** Generate printable packing slips for orders
- **Requirements:**
  - Packing slip includes:
    - Company logo and details (Jimmy Beef)
    - Order number
    - Order date
    - Customer name and delivery address
    - Product list with:
      - Product name
      - SKU
      - Quantity
      - Unit of measure
    - Total items
    - Special instructions
    - Barcode (order number, future enhancement)
  - Print options:
    - Print single packing slip
    - Print multiple packing slips (bulk)
    - Print consolidated list + individual slips
  - Format: A4 or thermal printer compatible
  - PDF export option

**ADM-PACK-005: Packing History**
- **Priority:** Low
- **Description:** View historical packing data
- **Requirements:**
  - Packing history page showing:
    - Date
    - Packing session ID
    - Number of orders packed
    - Total items packed
    - Packed by (user)
    - Time taken (start to finish)
  - Filter by:
    - Date range
    - User (packer)
    - Delivery area
  - Click to view session details
  - Export to CSV for analysis

---

### 4.6 Admin Portal - Delivery Management

#### 4.6.1 Delivery Interface (ADM-DEL)

**ADM-DEL-001: Delivery Dashboard**
- **Priority:** High
- **Description:** Overview of orders ready for delivery
- **Requirements:**
  - Dashboard showing:
    - Total orders ready for delivery (status = Packed)
    - Orders by delivery area with counts
    - Delivery runs available (today, tomorrow)
    - Driver assignment status
  - Quick actions:
    - Create delivery run
    - Assign orders to driver
    - Print delivery manifest
    - View map
  - Filter orders by:
    - Delivery date
    - Delivery area
    - Driver assignment (Assigned, Unassigned)
  - Refresh button

**ADM-DEL-002: Delivery Run Planning**
- **Priority:** High
- **Description:** Create and manage delivery runs
- **Requirements:**
  - Delivery run creation:
    - Select delivery date
    - Select delivery area (filters orders)
    - Select orders for this run (multi-select)
    - Assign driver (dropdown)
    - Estimated start time
    - Vehicle (optional, dropdown)
    - Notes (optional)
  - Order list for selected area:
    - Order number
    - Customer name
    - Delivery address with suburb
    - Number of items
    - Total weight (future enhancement)
    - Priority (Normal, Urgent)
    - Select checkbox
  - Display selected orders summary:
    - Total orders
    - Total items
    - Estimated total delivery time
  - Create delivery run button
  - Delivery run details page:
    - Run number
    - Driver assigned
    - Delivery date
    - Number of orders
    - Status (Planned, In Progress, Completed)
    - Orders in run (list)

**ADM-DEL-003: Delivery Route Suggestion**
- **Priority:** High
- **Description:** Suggest optimal delivery sequence based on area tagging
- **Requirements:**
  - Route suggestion algorithm:
    - Group orders by delivery area (North, South, East, West)
    - Within each area, sort by:
      - Suburb (alphabetical or by distance)
      - Priority (Urgent first)
      - Address (street number)
    - Suggested route optimization logic:
      - North area: North to South progression
      - South area: South to North progression
      - East area: East to West progression
      - West area: West to North progression
    - Display suggested delivery sequence with numbered stops
  - Route display:
    - List view with delivery order:
      - Stop number
      - Customer name
      - Address
      - Suburb
      - Number of items
      - Estimated delivery time (future enhancement)
    - Reorder capability (drag and drop stops)
    - Manual adjustments allowed
  - Save route button
  - Print delivery manifest (route sheet)

**ADM-DEL-004: Map View with "Open in Google Maps"**
- **Priority:** High
- **Description:** Provide map visualization and navigation support
- **Requirements:**
  - Embedded map showing:
    - All delivery addresses as pins/markers
    - Color-coded by delivery area
    - Numbered markers matching delivery sequence
    - Driver's current location (if tracking enabled, future enhancement)
  - Map features:
    - Zoom in/out
    - Pan
    - Toggle between list view and map view
    - Click marker to see order details
  - **"Open in Google Maps" functionality**:
    - "Navigate" button for each order
    - Opens Google Maps mobile app (on mobile) or website (on desktop)
    - Pre-loads destination address
    - Provides turn-by-turn navigation
    - Implementation:
      - Uses Google Maps URL scheme
      - Format: `https://www.google.com/maps/dir/?api=1&destination=ADDRESS`
      - Opens in new tab/window or app
  - **"Open All in Google Maps" button**:
    - Creates multi-stop route in Google Maps
    - Includes all delivery addresses in sequence
    - Uses waypoints parameter for multiple stops
    - Note: Google Maps has 10 waypoint limit - handle longer routes by splitting
  - Print map view

**ADM-DEL-005: Delivery Execution (Driver Interface)**
- **Priority:** High
- **Description:** Mobile-optimized interface for drivers to manage deliveries
- **Requirements:**
  - Driver login (separate authentication or same as admin)
  - Driver sees assigned delivery runs only
  - Delivery run details:
    - Run number and date
    - Total orders
    - Suggested route/sequence
    - Current stop indicator
  - Order list for current run:
    - Delivery sequence number
    - Customer name
    - Address (tap to open in Google Maps)
    - Phone number (tap to call)
    - Number of items
    - Special instructions
    - Delivery status (Pending, In Transit, Delivered)
  - For each order:
    - "Navigate" button (opens Google Maps)
    - "Mark as Delivered" button
    - Delivery proof requirement (see ADM-DEL-006)
  - Status updates:
    - "Start Delivery Run" button (changes order status to Out for Delivery)
    - Mark individual orders as delivered
    - Complete delivery run when all orders delivered
  - Offline capability (future enhancement):
    - Cache delivery run data
    - Upload proof of delivery when back online

**ADM-DEL-006: Proof of Delivery**
- **Priority:** High
- **Description:** Capture delivery proof when order is delivered
- **Requirements:**
  - Delivery proof options:
    - **Digital signature**: Capture signature on screen (touch/mouse)
    - **Photo**: Take photo using device camera or upload image
  - Delivery confirmation form:
    - Select proof type (signature or photo)
    - Signature pad (if signature selected):
      - Draw signature on screen
      - Clear button to redo
      - Preview signature
    - Photo capture (if photo selected):
      - Access device camera (with permission)
      - Take photo of delivered goods or delivery location
      - Retake option
      - Maximum 2 photos per delivery
    - Recipient name (optional, who received the delivery)
    - Delivery notes (optional, e.g., "Left at front door")
    - Delivery time (auto-captured)
  - Submit delivery button:
    - Validates proof (signature drawn or photo taken)
    - Uploads proof to server
    - Changes order status to "Delivered"
    - Records delivery timestamp
    - Email notification sent to customer with delivery confirmation
    - Proof of delivery visible in order details (admin and customer portals)
  - Image/signature storage:
    - Stored securely on server
    - Associated with order record
    - Accessible from order details
    - Retained for 2 years

**ADM-DEL-007: Delivery History**
- **Priority:** Medium
- **Description:** View historical delivery data
- **Requirements:**
  - Delivery history page showing:
    - Delivery date
    - Run number
    - Driver name
    - Number of orders delivered
    - Delivery area
    - Start time
    - End time
    - Total duration
    - Status (Completed, Partially Completed, Cancelled)
  - Filter by:
    - Date range
    - Driver
    - Delivery area
    - Status
  - Click to view delivery run details
  - Export to CSV for analysis
  - Driver performance metrics (future enhancement)

**ADM-DEL-008: Failed Delivery Management**
- **Priority:** Medium
- **Description:** Handle unsuccessful delivery attempts
- **Requirements:**
  - "Unable to Deliver" option when marking delivery
  - Failed delivery form:
    - Reason for failure (required, dropdown):
      - Customer not available
      - Address incorrect
      - Access issue
      - Customer refused delivery
      - Other (specify)
    - Photo of location/attempt (optional)
    - Notes (required)
    - Contact attempted (checkbox)
  - Submit failed delivery:
    - Order status changes to "Delivery Failed"
    - Order remains with driver or returned to warehouse
    - Notification sent to admin
    - Notification sent to customer
    - Admin can reschedule delivery
  - Failed delivery history visible in order details

---

### 4.7 Admin Portal - Xero Integration

#### 4.7.1 Xero Integration (ADM-XERO)

**ADM-XERO-001: Xero Authentication**
- **Priority:** High
- **Description:** Connect admin portal to Xero account
- **Requirements:**
  - Xero OAuth 2.0 setup
  - Admin initiates connection from Company Settings page
  - "Connect to Xero" button
  - OAuth flow:
    - Redirects to Xero login
    - User authorizes Jimmy Beef ERP app
    - Receives OAuth tokens (access token and refresh token)
    - Stores tokens securely (encrypted)
  - Display connection status:
    - Connected (green indicator)
    - Not Connected (red indicator)
    - Connection error (yellow indicator with error message)
  - "Disconnect from Xero" button
  - Token refresh mechanism (automatic):
    - Refresh access token before expiry
    - Handle refresh failures gracefully
    - Notify admin if reconnection required

**ADM-XERO-002: Invoice Generation**
- **Priority:** High
- **Description:** Automatically create invoices in Xero when orders are packed
- **Requirements:**
  - Trigger: Order status changes to "Packed"
  - Invoice creation via Xero API:
    - Invoice type: ACCREC (Accounts Receivable)
    - Customer: Match by name or create new contact in Xero
    - Invoice date: Current date
    - Due date: Based on customer payment terms (e.g., Net 30)
    - Line items:
      - Description: Product name
      - Quantity: Order quantity
      - Unit amount: Customer-specific price (GST exclusive)
      - Tax type: OUTPUT (GST)
      - Account code: Sales account (configurable in settings)
    - Reference: Order number
    - Status: DRAFT or AUTHORISED (configurable in settings)
  - Invoice number:
    - Use Xero's auto-numbering or custom prefix (configurable)
  - After successful creation:
    - Store Xero invoice ID in order record
    - Store Xero invoice number in order record
    - Display invoice link in order details
    - Update order with invoice status
  - Error handling:
    - If invoice creation fails:
      - Log error details
      - Display error message in order details
      - Flag order for manual review
      - Send notification to admin
      - Provide "Retry" button to attempt invoice creation again
    - Common errors to handle:
      - Customer not found in Xero (create contact automatically)
      - Network timeout
      - Invalid data (validation errors)
      - API rate limits
      - Authentication expired

**ADM-XERO-003: Credit Note Generation**
- **Priority:** High
- **Description:** Create credit notes in Xero for returns or cancellations
- **Requirements:**
  - Trigger options:
    - Manual: Admin creates credit note from order details
    - Automatic: Order cancelled after invoice generated
  - Credit note creation form:
    - Linked to existing invoice (required)
    - Credit note type: Full credit or partial credit
    - Line items:
      - For full credit: Copy all items from invoice
      - For partial credit: Select products and quantities to credit
      - Unit amount matches original invoice
    - Reason for credit (required, dropdown):
      - Order cancelled
      - Product return
      - Quality issue
      - Pricing error
      - Other (specify)
    - Notes (optional)
  - Credit note creation via Xero API:
    - Credit note type: ACCRECCREDIT
    - Customer: Same as original invoice
    - Date: Current date
    - Line items from form
    - Reference: Original order number + "Credit Note"
    - Status: DRAFT or AUTHORISED (configurable)
  - After successful creation:
    - Store Xero credit note ID in order record
    - Display credit note link in order details
    - Update order status (add "Credit Note Issued" flag)
    - Email notification to customer
  - Error handling: Similar to invoice creation (ADM-XERO-002)

**ADM-XERO-004: Invoice Status Sync**
- **Priority:** Medium
- **Description:** Synchronize payment status from Xero to ERP
- **Requirements:**
  - Periodic sync (every hour or configurable interval)
  - Fetch invoice status from Xero API:
    - PAID
    - AUTHORISED (unpaid)
    - VOIDED
  - Update order record with payment status:
    - Paid date
    - Payment amount
    - Payment method (if available)
  - Display payment status in order details:
    - Invoice status (Paid, Unpaid, Overdue)
    - Amount paid
    - Amount due
    - Paid date
  - Visual indicators:
    - Green: Paid
    - Orange: Overdue
    - Grey: Unpaid, not yet due
  - Manual sync button in order details ("Refresh from Xero")
  - Webhook option (future enhancement):
    - Xero sends webhook when invoice paid
    - Immediate update instead of periodic sync

**ADM-XERO-005: Xero Error Handling and Logging**
- **Priority:** High
- **Description:** Comprehensive error handling for Xero integration
- **Requirements:**
  - Error logging:
    - Log all Xero API calls (request and response)
    - Log errors with full details:
      - Timestamp
      - Order ID
      - Operation (Invoice Create, Credit Note Create, etc.)
      - Error type
      - Error message
      - Stack trace
    - Retention period: 90 days
  - Admin error notifications:
    - Email notification for critical errors
    - Dashboard notification for all errors
    - Error count badge in Xero settings
  - Error resolution:
    - "Retry" button for failed operations
    - "View Error Details" link
    - Manual override option (create invoice in Xero manually, then link)
    - Bulk retry for multiple failed invoices
  - Xero integration health check:
    - Test connection button
    - Display API rate limit status
    - Display last successful sync time
    - Display connection status (connected, expired, error)

**ADM-XERO-006: Xero Settings and Configuration**
- **Priority:** Medium
- **Description:** Configure Xero integration options
- **Requirements:**
  - Xero settings page:
    - Connection status
    - Connect/Disconnect buttons
    - Default invoice settings:
      - Invoice status (Draft or Authorised)
      - Payment terms (Net 15, Net 30, Net 60, etc.)
      - Sales account code (dropdown from Xero chart of accounts)
      - Invoice number prefix (optional)
      - Invoice branding theme (dropdown from Xero)
    - Credit note settings:
      - Credit note status (Draft or Authorised)
      - Default reason
    - Sync settings:
      - Enable automatic invoice creation (checkbox)
      - Enable automatic credit note creation (checkbox)
      - Sync frequency (hourly, daily, manual)
      - Enable email notifications (checkbox)
    - Error handling:
      - Retry failed invoices automatically (checkbox)
      - Maximum retry attempts (number)
      - Notify admin on error (checkbox)
  - Save settings button
  - Test connection button (validates settings)

---

### 4.8 Admin Portal - Company Settings

#### 4.8.1 Company Management (ADM-COMPANY)

**ADM-COMPANY-001: Company Profile**
- **Priority:** Medium
- **Description:** Manage Jimmy Beef business information
- **Requirements:**
  - Company profile fields:
    - Company name (required)
    - ABN (required)
    - Business address (required)
    - Phone number (required)
    - Email address (required)
    - Website (optional)
    - Logo upload (max 2MB, PNG/JPG)
  - Display logo preview
  - Save changes button
  - Logo displayed in:
    - Admin portal header
    - Customer portal header
    - Packing slips
    - Delivery notes
    - Emails

**ADM-COMPANY-002: Order Cutoff Time Configuration**
- **Priority:** High
- **Description:** Set daily cutoff time for next-day delivery
- **Requirements:**
  - Cutoff time settings:
    - Cutoff time (required, time picker, e.g., 3:00 PM)
    - Time zone (required, dropdown, default: Australian Eastern Time)
    - Next-day delivery enabled (checkbox)
    - Weekend delivery enabled (checkbox)
  - Cutoff time logic:
    - Orders placed before cutoff: Eligible for next business day delivery
    - Orders placed after cutoff: Flagged as "After Cutoff", requires admin contact
  - Business days configuration:
    - Select delivery days (checkboxes for each day of week)
    - Default: Monday - Friday
  - Public holidays handling (future enhancement):
    - Import Australian public holidays
    - Mark specific dates as no-delivery days
  - Save settings button
  - Display cutoff time on:
    - Customer portal cart/checkout
    - Admin order creation form
  - Cutoff time adjustment notification:
    - Notify customers via email when cutoff time changes

**ADM-COMPANY-003: Delivery Area Management**
- **Priority:** High
- **Description:** Define and manage delivery areas for route planning
- **Requirements:**
  - Delivery areas list:
    - Area name (e.g., North, South, East, West, CBD)
    - Color code (for map visualization)
    - Number of suburbs assigned
    - Status (Active, Inactive)
  - CRUD operations:
    - Create new area
    - Edit area name/color
    - Deactivate area
    - Delete area (only if no suburbs assigned)
  - Suburb assignment:
    - Search Australian suburbs (typeahead)
    - Assign suburb to delivery area
    - View all suburbs in an area
    - Unassign suburb from area
    - Bulk suburb assignment (CSV upload)
  - Area tagging validation:
    - Ensure each suburb assigned to only one area
    - Warn if suburb not assigned to any area
  - Default area:
    - Set a default area for unassigned suburbs
    - Or flag as "Unassigned" and prompt admin for manual assignment
  - Export suburb-area mappings to CSV

**ADM-COMPANY-004: Email Notification Settings**
- **Priority:** Medium
- **Description:** Configure email notifications sent by the system
- **Requirements:**
  - Email notification toggles:
    - Customer notifications:
      - Registration confirmation
      - Credit application received
      - Credit application approved/rejected
      - Order confirmation
      - Order status updates (Processing, Packed, Out for Delivery, Delivered)
      - Delivery confirmation
      - Invoice available
      - After-cutoff order notification
    - Admin notifications:
      - New customer registration
      - New credit application
      - After-cutoff order placed
      - Low stock alerts
      - Xero integration errors
  - Email templates (future enhancement):
    - Customize email subject and body for each notification type
    - Use variables (e.g., {customer_name}, {order_number})
    - Preview email templates
  - Email sender settings:
    - From email address (e.g., orders@jimmybeef.com.au)
    - From name (e.g., Jimmy Beef)
    - Reply-to email address
  - Email service configuration:
    - SMTP settings or API credentials for email service (AWS SES, SendGrid)
    - Test email functionality (send test email)
  - Save settings button

**ADM-COMPANY-005: User Management**
- **Priority:** Medium
- **Description:** Manage admin portal users and their roles
- **Requirements:**
  - User list showing:
    - Name
    - Email
    - Role (Admin, Sales, Packer, Driver, Manager)
    - Status (Active, Inactive)
    - Last login
  - Add new user:
    - Name (required)
    - Email (required, unique)
    - Role (required, dropdown)
    - Password (required, minimum 8 characters)
    - Send welcome email (checkbox)
  - Edit user:
    - Update name, email, role
    - Reset password (send reset email)
    - Deactivate/reactivate user
  - Delete user (only if no associated activities)
  - Role-based access control (see Section 3.2)
  - User activity log:
    - Login history
    - Actions performed (future enhancement)
  - Password policy:
    - Minimum 8 characters
    - Require uppercase, lowercase, number, special character (configurable)
    - Password expiry (optional, e.g., 90 days)

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

**NFR-PERF-001: Response Time**
- Page load time: ≤ 2 seconds for 95% of requests
- API response time: ≤ 500ms for 95% of requests
- Search results: ≤ 1 second
- Report generation: ≤ 5 seconds for standard reports

**NFR-PERF-002: Concurrent Users**
- Support at least 100 concurrent users without performance degradation
- Customer portal: 50 concurrent customers
- Admin portal: 50 concurrent staff members

**NFR-PERF-003: Scalability**
- Horizontal scaling capability for API servers
- Database optimization for 10,000+ orders
- Support for 1,000+ active customers
- Handle 500+ products in catalog

**NFR-PERF-004: Image Optimization**
- Product images compressed for web delivery
- Lazy loading for image-heavy pages
- Thumbnail generation for product listings
- CDN delivery for static assets

### 5.2 Security Requirements

**NFR-SEC-001: Authentication**
- Strong password policy (minimum 8 characters, complexity requirements)
- Secure password hashing (bcrypt or Argon2)
- Session management with secure cookies
- Session timeout after 4 hours of inactivity
- Account lockout after 5 failed login attempts

**NFR-SEC-002: Authorization**
- Role-based access control (RBAC)
- Least privilege principle
- API endpoint authorization checks
- Secure direct object reference prevention

**NFR-SEC-003: Data Protection**
- HTTPS/TLS encryption for all communications
- Encryption at rest for sensitive data (passwords, credit application documents)
- PCI-DSS compliance not required (no credit card storage)
- Personal data handling compliant with Australian Privacy Act

**NFR-SEC-004: API Security**
- API authentication using JWT tokens
- API rate limiting (100 requests per minute per user)
- CORS policy enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS prevention

**NFR-SEC-005: Xero Integration Security**
- OAuth 2.0 tokens stored encrypted
- Token refresh mechanism
- Secure API key storage
- Audit logging of all Xero API calls

**NFR-SEC-006: File Upload Security**
- File type validation (whitelist: PDF, JPG, PNG)
- File size limits (5MB per file)
- Virus scanning for uploaded files
- Secure file storage (S3 or equivalent)

### 5.3 Reliability Requirements

**NFR-REL-001: Availability**
- System uptime: 99.5% (excluding planned maintenance)
- Planned maintenance windows: Outside business hours (e.g., Saturday midnight)
- Maximum planned downtime: 4 hours per month

**NFR-REL-002: Backup and Recovery**
- Automated daily database backups
- Backup retention: 30 days
- Point-in-time recovery capability (last 7 days)
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours
- Backup verification and testing monthly

**NFR-REL-003: Error Handling**
- Graceful degradation when external services unavailable
- User-friendly error messages (no stack traces exposed)
- Error logging and monitoring
- Automated alerts for critical errors

**NFR-REL-004: Data Integrity**
- Database transactions for critical operations
- Foreign key constraints
- Data validation at application and database level
- Audit trails for critical data changes

### 5.4 Usability Requirements

**NFR-USE-001: User Interface**
- Responsive design (desktop, tablet, mobile)
- Consistent UI/UX across both portals
- Intuitive navigation
- Accessibility standards compliance (WCAG 2.1 Level AA)
- Modern, clean design

**NFR-USE-002: Mobile Optimization**
- Customer portal fully functional on mobile devices
- Delivery interface optimized for mobile (driver use)
- Touch-friendly controls (minimum 44×44 pixels)
- Readable text without zooming

**NFR-USE-003: Browser Compatibility**
- Support for latest versions of:
  - Google Chrome
  - Mozilla Firefox
  - Apple Safari
  - Microsoft Edge
- Graceful degradation for older browsers (warning message)

**NFR-USE-004: Help and Documentation**
- Contextual help text/tooltips
- User guide for customer portal
- Admin manual for admin portal
- FAQ section
- Contact support option

### 5.5 Maintainability Requirements

**NFR-MAINT-001: Code Quality**
- Clean, readable, well-documented code
- Coding standards adherence
- Code review process
- Automated linting and formatting

**NFR-MAINT-002: Testing**
- Unit test coverage: 70% minimum
- Integration testing for critical workflows
- End-to-end testing for user journeys
- Automated testing in CI/CD pipeline

**NFR-MAINT-003: Logging and Monitoring**
- Application logging (info, warning, error levels)
- Structured logging (JSON format)
- Log aggregation and analysis
- Performance monitoring (response times, error rates)
- Uptime monitoring with alerts

**NFR-MAINT-004: Deployment**
- Continuous Integration/Continuous Deployment (CI/CD)
- Zero-downtime deployments
- Rollback capability
- Environment separation (dev, staging, production)

### 5.6 Compatibility Requirements

**NFR-COMP-001: Third-Party Integrations**
- Xero API v2 compatibility
- Google Maps API compatibility
- Email service provider API compatibility

**NFR-COMP-002: Data Import/Export**
- CSV export capability for all data tables
- CSV import for bulk data (products, customers, suburbs)
- Standard date/time formats (ISO 8601)

---

## 6. Technical Requirements

### 6.1 Technology Stack

**Frontend:**
- Framework: React.js 18+ with TypeScript
- State Management: Redux or React Context API
- UI Library: Tailwind CSS or Material-UI
- Form Handling: React Hook Form
- API Client: Axios
- Build Tool: Vite or Webpack

**Backend:**
- Language: Node.js (Express) or Python (Django/FastAPI)
- API Architecture: RESTful API
- Authentication: JWT tokens
- File Upload: Multer or equivalent

**Database:**
- Primary Database: PostgreSQL 14+
- ORM: Sequelize (Node.js) or SQLAlchemy (Python)
- Migration Tool: Database-specific migration tools

**Third-Party Services:**
- Xero API: OAuth 2.0, REST API
- Google Maps: Maps JavaScript API, Geocoding API, Directions API
- Email Service: AWS SES, SendGrid, or Mailgun
- File Storage: AWS S3, Google Cloud Storage, or Azure Blob Storage

**Infrastructure:**
- Hosting: AWS, Google Cloud Platform, or Digital Ocean
- Web Server: Nginx or Apache
- SSL/TLS: Let's Encrypt or commercial certificate
- CDN: CloudFlare or AWS CloudFront

**Development Tools:**
- Version Control: Git (GitHub, GitLab, or Bitbucket)
- CI/CD: GitHub Actions, GitLab CI, or Jenkins
- Testing: Jest, Pytest, Cypress
- Code Quality: ESLint, Prettier, SonarQube

### 6.2 Architecture

**System Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │  Customer Portal    │  │  Admin/Ops Portal   │     │
│  │  (React SPA)        │  │  (React SPA)        │     │
│  └──────────┬──────────┘  └──────────┬──────────┘     │
└─────────────┼─────────────────────────┼────────────────┘
              │                         │
              │ HTTPS                   │ HTTPS
              │                         │
┌─────────────▼─────────────────────────▼────────────────┐
│               API Gateway / Load Balancer              │
└─────────────┬──────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│                  Application Layer                     │
│  ┌──────────────────────────────────────────────┐     │
│  │         Backend API Server                   │     │
│  │  - Authentication & Authorization            │     │
│  │  - Business Logic                            │     │
│  │  - API Endpoints                             │     │
│  │  - File Upload Handler                       │     │
│  └──────────┬───────────────────────────────────┘     │
└─────────────┼──────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│                   Data Layer                           │
│  ┌──────────────────────────────────────────────┐     │
│  │         PostgreSQL Database                  │     │
│  │  - Application data                          │     │
│  │  - Audit logs                                │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│              External Services Layer                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Xero API   │  │ Google Maps │  │Email Service│   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│  ┌─────────────────────────────────────────────────┐  │
│  │         File Storage (S3/GCS)                   │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 6.3 API Design

**API Endpoints Structure:**

```
/api/v1/
  /auth
    POST /register
    POST /login
    POST /logout
    POST /password-reset
    POST /password-reset/confirm
  
  /customers
    GET    /                     (list customers)
    POST   /                     (create customer)
    GET    /:id                  (get customer details)
    PUT    /:id                  (update customer)
    DELETE /:id                  (delete customer)
    GET    /:id/orders           (get customer orders)
    GET    /:id/pricing          (get customer-specific pricing)
    PUT    /:id/pricing          (update customer pricing)
    POST   /:id/approve          (approve credit application)
    POST   /:id/reject           (reject credit application)
  
  /products
    GET    /                     (list products)
    POST   /                     (create product)
    GET    /:id                  (get product details)
    PUT    /:id                  (update product)
    DELETE /:id                  (delete product)
    GET    /:id/pricing          (get pricing for product)
  
  /inventory
    GET    /                     (list stock levels)
    GET    /:productId           (get stock for product)
    POST   /adjustment           (create stock adjustment)
    GET    /history              (get stock movement history)
    POST   /receive              (receive stock)
  
  /orders
    GET    /                     (list orders)
    POST   /                     (create order)
    GET    /:id                  (get order details)
    PUT    /:id                  (update order)
    POST   /:id/cancel           (cancel order)
    PUT    /:id/status           (update order status)
    GET    /:id/invoice          (get invoice details)
  
  /packing
    GET    /session              (get packing session)
    GET    /consolidated         (get consolidated packing list)
    PUT    /order/:id/pack       (mark order as packed)
    GET    /order/:id/slip       (get packing slip)
  
  /delivery
    GET    /runs                 (list delivery runs)
    POST   /runs                 (create delivery run)
    GET    /runs/:id             (get delivery run details)
    PUT    /runs/:id             (update delivery run)
    POST   /runs/:id/start       (start delivery run)
    POST   /runs/:id/complete    (complete delivery run)
    PUT    /order/:id/deliver    (mark order as delivered)
    POST   /order/:id/proof      (upload proof of delivery)
    GET    /order/:id/route      (get delivery route)
  
  /xero
    POST   /connect              (initiate OAuth connection)
    POST   /disconnect           (disconnect Xero)
    GET    /status               (get connection status)
    POST   /invoice/:orderId     (create/retry invoice)
    POST   /creditnote/:orderId  (create credit note)
    GET    /sync/:orderId        (sync invoice status)
  
  /settings
    GET    /company              (get company settings)
    PUT    /company              (update company settings)
    GET    /areas                (get delivery areas)
    POST   /areas                (create delivery area)
    PUT    /areas/:id            (update delivery area)
    DELETE /areas/:id            (delete delivery area)
    GET    /users                (list users)
    POST   /users                (create user)
    PUT    /users/:id            (update user)
    DELETE /users/:id            (delete user)
```

**API Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "errors": [ ... ]
}
```

### 6.4 Database Schema

**Key Tables:**

1. **users**
   - id (UUID, PK)
   - email (VARCHAR, UNIQUE)
   - password_hash (VARCHAR)
   - role (ENUM: customer, admin, sales, packer, driver, manager)
   - status (ENUM: pending, active, inactive)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

2. **customers**
   - id (UUID, PK)
   - user_id (UUID, FK to users)
   - business_name (VARCHAR)
   - abn (VARCHAR)
   - contact_person (VARCHAR)
   - phone (VARCHAR)
   - business_address (TEXT)
   - delivery_address (TEXT)
   - suburb (VARCHAR)
   - state (VARCHAR)
   - postcode (VARCHAR)
   - delivery_area_id (UUID, FK to delivery_areas)
   - credit_limit (DECIMAL)
   - payment_terms (VARCHAR)
   - account_status (ENUM: pending, approved, active, suspended, rejected)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

3. **credit_applications**
   - id (UUID, PK)
   - customer_id (UUID, FK to customers)
   - requested_credit_limit (DECIMAL)
   - trade_references (JSON)
   - bank_details (JSON)
   - years_in_business (INTEGER)
   - annual_revenue_range (VARCHAR)
   - business_type (VARCHAR)
   - documents (JSON - array of file URLs)
   - status (ENUM: pending, approved, rejected)
   - approved_by (UUID, FK to users)
   - approved_at (TIMESTAMP)
   - rejection_reason (TEXT)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

4. **products**
   - id (UUID, PK)
   - sku (VARCHAR, UNIQUE)
   - name (VARCHAR)
   - description (TEXT)
   - category_id (UUID, FK to categories)
   - unit_of_measure (VARCHAR)
   - base_price (DECIMAL)
   - gst_applicable (BOOLEAN)
   - images (JSON - array of image URLs)
   - nutritional_info (JSON)
   - storage_instructions (TEXT)
   - minimum_order_qty (DECIMAL)
   - status (ENUM: active, inactive)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

5. **inventory**
   - id (UUID, PK)
   - product_id (UUID, FK to products)
   - quantity (DECIMAL)
   - reorder_level (DECIMAL)
   - last_movement_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

6. **inventory_movements**
   - id (UUID, PK)
   - product_id (UUID, FK to products)
   - movement_type (ENUM: receipt, adjustment, order_fulfillment, return)
   - quantity_change (DECIMAL)
   - previous_quantity (DECIMAL)
   - new_quantity (DECIMAL)
   - reason (VARCHAR)
   - reference_number (VARCHAR)
   - order_id (UUID, FK to orders, nullable)
   - user_id (UUID, FK to users)
   - created_at (TIMESTAMP)

7. **customer_pricing**
   - id (UUID, PK)
   - customer_id (UUID, FK to customers)
   - product_id (UUID, FK to products)
   - price (DECIMAL)
   - effective_from (DATE)
   - effective_to (DATE, nullable)
   - notes (TEXT)
   - created_by (UUID, FK to users)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

8. **pricing_audit**
   - id (UUID, PK)
   - change_type (ENUM: created, updated, deleted)
   - product_id (UUID, FK to products)
   - customer_id (UUID, FK to customers, nullable)
   - old_price (DECIMAL)
   - new_price (DECIMAL)
   - percentage_change (DECIMAL)
   - reason (TEXT)
   - changed_by (UUID, FK to users)
   - changed_at (TIMESTAMP)

9. **orders**
   - id (UUID, PK)
   - order_number (VARCHAR, UNIQUE)
   - customer_id (UUID, FK to customers)
   - order_date (TIMESTAMP)
   - delivery_address (TEXT)
   - delivery_area_id (UUID, FK to delivery_areas)
   - estimated_delivery_date (DATE)
   - actual_delivery_date (DATE, nullable)
   - status (ENUM: pending, processing, packed, out_for_delivery, delivered, cancelled)
   - after_cutoff (BOOLEAN)
   - purchase_order_number (VARCHAR)
   - delivery_instructions (TEXT)
   - order_notes (TEXT)
   - internal_notes (TEXT)
   - subtotal (DECIMAL)
   - gst (DECIMAL)
   - total (DECIMAL)
   - xero_invoice_id (VARCHAR, nullable)
   - xero_invoice_number (VARCHAR, nullable)
   - xero_credit_note_id (VARCHAR, nullable)
   - created_by (UUID, FK to users)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

10. **order_items**
    - id (UUID, PK)
    - order_id (UUID, FK to orders)
    - product_id (UUID, FK to products)
    - quantity (DECIMAL)
    - unit_price (DECIMAL)
    - line_total (DECIMAL)
    - created_at (TIMESTAMP)

11. **order_status_history**
    - id (UUID, PK)
    - order_id (UUID, FK to orders)
    - status (VARCHAR)
    - notes (TEXT)
    - changed_by (UUID, FK to users)
    - changed_at (TIMESTAMP)

12. **delivery_runs**
    - id (UUID, PK)
    - run_number (VARCHAR, UNIQUE)
    - delivery_date (DATE)
    - delivery_area_id (UUID, FK to delivery_areas)
    - driver_id (UUID, FK to users)
    - vehicle (VARCHAR)
    - status (ENUM: planned, in_progress, completed, cancelled)
    - estimated_start_time (TIME)
    - actual_start_time (TIME, nullable)
    - actual_end_time (TIME, nullable)
    - notes (TEXT)
    - created_by (UUID, FK to users)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)

13. **delivery_run_orders**
    - id (UUID, PK)
    - delivery_run_id (UUID, FK to delivery_runs)
    - order_id (UUID, FK to orders)
    - sequence_number (INTEGER)
    - delivery_status (ENUM: pending, in_transit, delivered, failed)
    - proof_of_delivery_type (ENUM: signature, photo, nullable)
    - proof_of_delivery_url (VARCHAR, nullable)
    - recipient_name (VARCHAR, nullable)
    - delivery_notes (TEXT, nullable)
    - failed_reason (VARCHAR, nullable)
    - delivered_at (TIMESTAMP, nullable)

14. **delivery_areas**
    - id (UUID, PK)
    - name (VARCHAR)
    - color_code (VARCHAR)
    - status (ENUM: active, inactive)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)

15. **suburbs**
    - id (UUID, PK)
    - name (VARCHAR)
    - state (VARCHAR)
    - postcode (VARCHAR)
    - delivery_area_id (UUID, FK to delivery_areas)
    - latitude (DECIMAL)
    - longitude (DECIMAL)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)

16. **categories**
    - id (UUID, PK)
    - name (VARCHAR)
    - sort_order (INTEGER)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)

17. **xero_logs**
    - id (UUID, PK)
    - operation_type (ENUM: invoice_create, credit_note_create, sync)
    - order_id (UUID, FK to orders)
    - request_payload (JSON)
    - response_payload (JSON)
    - status (ENUM: success, error)
    - error_message (TEXT, nullable)
    - created_at (TIMESTAMP)

18. **company_settings**
    - id (UUID, PK)
    - company_name (VARCHAR)
    - abn (VARCHAR)
    - address (TEXT)
    - phone (VARCHAR)
    - email (VARCHAR)
    - website (VARCHAR)
    - logo_url (VARCHAR)
    - order_cutoff_time (TIME)
    - timezone (VARCHAR)
    - xero_connected (BOOLEAN)
    - xero_access_token (VARCHAR, encrypted)
    - xero_refresh_token (VARCHAR, encrypted)
    - xero_token_expiry (TIMESTAMP)
    - updated_at (TIMESTAMP)

### 6.5 File Storage Structure

```
/uploads
  /products
    /{product_id}
      /image1.jpg
      /image2.jpg
  /credit_applications
    /{customer_id}
      /document1.pdf
      /document2.pdf
  /proof_of_delivery
    /{order_id}
      /signature.png
      /photo1.jpg
      /photo2.jpg
  /company
    /logo.png
```

---

## 7. Integration Requirements

### 7.1 Xero Integration

**INT-XERO-001: Authentication**
- OAuth 2.0 implementation
- Secure token storage
- Automatic token refresh
- Connection status monitoring

**INT-XERO-002: Invoice Management**
- Create invoices via API
- Support for line items, taxes, discounts
- Invoice status synchronization
- Invoice PDF retrieval (future)

**INT-XERO-003: Credit Note Management**
- Create credit notes via API
- Link to original invoices
- Support for partial and full credits

**INT-XERO-004: Contact Management**
- Automatic contact creation for new customers
- Contact synchronization (optional, future)

**INT-XERO-005: Error Handling**
- Comprehensive error logging
- Retry mechanism for failed operations
- Admin notifications for critical errors

### 7.2 Google Maps Integration

**INT-MAPS-001: Geocoding**
- Convert addresses to coordinates
- Validate delivery addresses
- Suburb lookup and validation

**INT-MAPS-002: Navigation Support**
- Generate Google Maps URLs with destinations
- Support for multi-stop routes (waypoints)
- "Open in Google Maps" functionality

**INT-MAPS-003: Map Visualization**
- Embed maps in delivery interface
- Display delivery locations as markers
- Color-coded markers by area

### 7.3 Email Service Integration

**INT-EMAIL-001: Transactional Emails**
- Order confirmations
- Status update notifications
- Credit application notifications
- Password reset emails

**INT-EMAIL-002: Delivery**
- Reliable delivery with retry
- Bounce handling
- Unsubscribe management (for marketing, future)

**INT-EMAIL-003: Templates**
- HTML email templates
- Dynamic content population
- Responsive design

---

## 8. Data Requirements

### 8.1 Data Retention

- **Orders**: Retain indefinitely for business records
- **Inventory movements**: Retain for 7 years
- **Pricing audit trail**: Retain for 7 years
- **User activity logs**: Retain for 2 years
- **Xero integration logs**: Retain for 90 days
- **Proof of delivery images**: Retain for 2 years
- **Credit application documents**: Retain for 7 years
- **Email logs**: Retain for 1 year

### 8.2 Data Backup

- **Frequency**: Daily automated backups
- **Backup Type**: Full database dump
- **Storage**: Off-site backup storage (S3, Google Cloud Storage)
- **Testing**: Monthly restore testing
- **Retention**: 30 daily backups, 12 monthly backups

### 8.3 Data Privacy

- **Customer Data**: Comply with Australian Privacy Act 1988
- **Consent**: Obtain consent for data collection during registration
- **Access**: Customers can access their own data
- **Deletion**: Support for account deletion requests (with order history retention)
- **Encryption**: Sensitive data encrypted at rest

### 8.4 Data Migration

- **Initial Data Load**: Support for importing existing data:
  - Customers (CSV format)
  - Products (CSV format)
  - Pricing (CSV format)
  - Suburbs and area mappings (CSV format)
- **Data Validation**: Validate all imported data
- **Error Reporting**: Generate import error reports
- **Rollback**: Ability to rollback failed imports

---

## 9. Business Rules

### 9.1 Order Management Rules

**BR-ORD-001**: Orders placed before cutoff time are eligible for next business day delivery.

**BR-ORD-002**: Orders placed after cutoff time are flagged and require admin contact for delivery scheduling.

**BR-ORD-003**: Orders cannot be placed if customer account status is not "Active" or "Approved".

**BR-ORD-004**: Orders cannot be placed if product is out of stock.

**BR-ORD-005**: Order total cannot exceed customer credit limit (if credit limit is set).

**BR-ORD-006**: Orders can only be edited before status changes to "Packed".

**BR-ORD-007**: Cancelled orders do not count against credit limit.

**BR-ORD-008**: Stock is deducted when order status changes to "Packed".

### 9.2 Pricing Rules

**BR-PRICE-001**: If customer-specific price exists, it takes precedence over base price.

**BR-PRICE-002**: If multiple customer-specific prices exist, use the one with latest effective_from date that is ≤ current date.

**BR-PRICE-003**: If customer-specific price has expired (effective_to < current date), revert to base price.

**BR-PRICE-004**: All pricing changes must be recorded in pricing audit trail.

**BR-PRICE-005**: Prices are always stored GST exclusive; GST calculated at display/invoice time.

### 9.3 Inventory Rules

**BR-INV-001**: Stock cannot go below zero (validation on order placement and stock adjustments).

**BR-INV-002**: Low stock alert triggered when quantity ≤ reorder level.

**BR-INV-003**: All stock movements must be recorded in inventory_movements table.

**BR-INV-004**: Stock adjustments require reason and are audited.

**BR-INV-005**: Stock is automatically deducted when order is marked as "Packed".

### 9.4 Delivery Rules

**BR-DEL-001**: Delivery area is automatically assigned based on customer's delivery suburb.

**BR-DEL-002**: Delivery route suggestion follows area-specific progression logic (North→South, etc.).

**BR-DEL-003**: Proof of delivery is required to mark order as "Delivered".

**BR-DEL-004**: Delivery proof can be signature OR photo, at least one required.

**BR-DEL-005**: Orders cannot be marked as delivered without proof.

### 9.5 Customer Management Rules

**BR-CUST-001**: New customers have status "Pending" until credit application approved.

**BR-CUST-002**: Only approved customers can place orders.

**BR-CUST-003**: Customer email must be unique across all customers.

**BR-CUST-004**: Suspended customers cannot place new orders but can view existing orders.

**BR-CUST-005**: Rejected customers cannot access the system (login disabled).

### 9.6 Xero Integration Rules

**BR-XERO-001**: Invoice is automatically created in Xero when order status changes to "Packed".

**BR-XERO-002**: Credit note is created when order is cancelled after invoice generation.

**BR-XERO-003**: If invoice creation fails, order remains in "Packed" status and admin is notified.

**BR-XERO-004**: Failed Xero operations can be retried manually.

**BR-XERO-005**: All Xero API calls are logged for audit purposes.

---

## 10. Assumptions and Constraints

### 10.1 Assumptions

1. **Single Location**: Jimmy Beef operates from a single warehouse/location. Multi-warehouse support not required.

2. **Australian Market Only**: System designed for Australian market (ABN, GST, AU addresses, AU currency).

3. **B2B Only**: No B2C (retail) functionality required. All customers are businesses.

4. **Internet Connectivity**: Delivery drivers have reliable mobile internet connection for accessing delivery interface and uploading proof of delivery.

5. **Xero Account**: Jimmy Beef has an active Xero subscription.

6. **Email Delivery**: Customers have valid email addresses and check email regularly for order notifications.

7. **Manual Credit Assessment**: Credit applications are reviewed and approved manually by admin staff, not automated.

8. **No Live Tracking**: Real-time GPS tracking of delivery vehicles is out of scope (future enhancement).

9. **English Language Only**: All system content in English. No multi-language support required.

10. **Single Currency**: All pricing in Australian Dollars (AUD). No multi-currency support.

11. **Standard Product Variants**: Products do not have complex variants (e.g., different cuts are separate products).

12. **No Integration with Suppliers**: Supplier management and purchase orders are out of scope.

13. **No Advanced Warehouse Management**: FIFO, lot tracking, bin locations, pick paths are out of scope.

14. **No Built-in Payment Processing**: Payments handled through Xero, not within the ERP system.

### 10.2 Constraints

**Technical Constraints:**
1. **Budget**: Development budget limited (see project proposal).
2. **Timeline**: Project must be completed within 10-15 weeks.
3. **Team Size**: Small development team (2-3 developers).
4. **Third-Party API Limits**: Subject to Xero API rate limits and Google Maps API quotas.

**Business Constraints:**
1. **Existing Processes**: System must accommodate current business processes with minimal disruption.
2. **Training Time**: Limited time available for staff training (1-2 days).
3. **Data Migration**: Existing customer and product data must be migrated (if available).
4. **Regulatory Compliance**: Must comply with Australian business regulations (GST, Privacy Act).

**Operational Constraints:**
1. **Deployment Window**: Production deployment must occur outside business hours.
2. **Support Availability**: Limited post-launch support budget.
3. **Maintenance Window**: Planned maintenance must be scheduled on weekends.

**User Constraints:**
1. **Technical Proficiency**: Staff have varying levels of technical proficiency; UI must be intuitive.
2. **Device Availability**: Drivers may use personal mobile devices (BYOD).
3. **Internet Access**: Occasional connectivity issues in remote delivery areas.

---

## 11. Out of Scope

The following features are explicitly out of scope for the initial release:

### 11.1 Features Excluded

1. **Real-Time GPS Tracking**: Live tracking of delivery vehicles on map.
2. **Customer Mobile App**: Native iOS/Android app for customers (web app only).
3. **Multi-Warehouse Management**: Support for multiple warehouse locations.
4. **Advanced Inventory Features**:
   - FIFO/LIFO tracking
   - Batch/lot tracking
   - Expiry date tracking
   - Serial number tracking
   - Bin/location management
5. **Supplier Management**: Purchase orders, supplier invoicing, supplier portal.
6. **Advanced Reporting and Analytics**: Business intelligence dashboards, custom report builder.
7. **Payment Gateway Integration**: Credit card processing within the system.
8. **Automated Credit Scoring**: Automatic credit limit approval based on algorithms.
9. **Marketing Features**: Email campaigns, promotions, discounts, loyalty programs.
10. **Multi-Currency Support**: Support for currencies other than AUD.
11. **Multi-Language Support**: Languages other than English.
12. **CRM Features**: Lead management, opportunity tracking, sales pipeline.
13. **HR/Payroll Integration**: Employee management, time tracking, payroll.
14. **Advanced Route Optimization**: AI-powered route optimization with traffic data.
15. **Offline Mode**: Full offline capability for customer portal or delivery interface.
16. **Integration with Other Accounting Systems**: QuickBooks, MYOB, etc. (Xero only).
17. **Integration with Other Delivery Platforms**: Third-party delivery services, route optimization tools.
18. **Barcode Scanning**: Barcode generation and scanning for products/orders.
19. **QR Code Check-in**: QR code scanning for delivery confirmation.
20. **Voice Commands**: Voice-activated ordering or navigation.
21. **Chatbot/Live Chat**: Customer support chat functionality.
22. **Social Media Integration**: Social login, social sharing.
23. **API for Third-Party Developers**: Public API for external integrations.
24. **White Labeling**: Customization for reselling to other meat distributors.
25. **Multi-Tenancy**: Support for multiple businesses in a single instance.

### 11.2 Future Enhancements (Post-Launch)

The following features may be considered for future releases:

1. **Real-time GPS tracking** for delivery vehicles
2. **Advanced reporting and analytics** dashboard
3. **Automated low stock reordering** from suppliers
4. **Customer mobile app** (iOS/Android)
5. **Driver mobile app** (native app with offline support)
6. **Integration with additional accounting systems**
7. **Barcode scanning** for inventory and order picking
8. **FIFO/lot tracking** for inventory
9. **Promotional pricing** and discount management
10. **Customer loyalty program**
11. **Advanced route optimization** with traffic and time windows
12. **Integration with IoT devices** (temperature sensors for cold chain)
13. **Predictive analytics** for demand forecasting
14. **Webhook API** for third-party integrations
15. **Multi-warehouse support**

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **ABN** | Australian Business Number |
| **API** | Application Programming Interface |
| **B2B** | Business-to-Business |
| **B2C** | Business-to-Consumer |
| **CRUD** | Create, Read, Update, Delete |
| **CSV** | Comma-Separated Values |
| **ERP** | Enterprise Resource Planning |
| **FIFO** | First In, First Out |
| **GST** | Goods and Services Tax (Australian VAT) |
| **JWT** | JSON Web Token |
| **OAuth** | Open Authorization |
| **ORM** | Object-Relational Mapping |
| **POD** | Proof of Delivery |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **SPA** | Single Page Application |
| **SKU** | Stock Keeping Unit |
| **SSL/TLS** | Secure Sockets Layer / Transport Layer Security |
| **UAT** | User Acceptance Testing |
| **UUID** | Universally Unique Identifier |
| **WCAG** | Web Content Accessibility Guidelines |

---

## Appendix B: User Stories Summary

### Customer Portal User Stories

**Registration & Authentication:**
- As a new customer, I want to register for an account so that I can place orders online.
- As a new customer, I want to submit a credit application so that I can get approved for credit terms.
- As a customer, I want to log in to my account so that I can access my order history and place new orders.
- As a customer, I want to reset my password if I forget it.

**Product Browsing & Ordering:**
- As a customer, I want to browse available products so that I can see what's available for purchase.
- As a customer, I want to see my customer-specific pricing so that I know my actual costs.
- As a customer, I want to add products to my cart and adjust quantities.
- As a customer, I want to see the order cutoff time so that I know if my order will be delivered the next day.
- As a customer, I want to place an order and receive confirmation.

**Order Management:**
- As a customer, I want to view my order history so that I can track past purchases.
- As a customer, I want to see the status of my current orders so that I know when they will be delivered.
- As a customer, I want to see proof of delivery for completed orders.

### Admin Portal User Stories

**Customer Management:**
- As an admin, I want to view all customer registrations so that I can approve or reject them.
- As an admin, I want to review credit applications so that I can make informed approval decisions.
- As an admin, I want to manage customer information so that records are accurate.
- As an admin, I want to set customer-specific pricing so that I can offer different rates to different customers.

**Product & Inventory Management:**
- As an admin, I want to add and manage products so that the catalog is up to date.
- As an admin, I want to adjust stock levels so that inventory is accurate.
- As an admin, I want to see low stock alerts so that I can reorder products.
- As an admin, I want to track all inventory movements so that I can audit stock changes.

**Order Management:**
- As an admin, I want to view all orders so that I can monitor business activity.
- As an admin, I want to place orders on behalf of customers so that I can assist with phone orders.
- As an admin, I want to manage after-cutoff orders so that I can arrange delivery.
- As an admin, I want to cancel orders if necessary.

**Packing:**
- As a packer, I want to see a consolidated list of products needed so that I can pick efficiently.
- As a packer, I want to pack orders one by one with a checklist so that I don't miss items.
- As a packer, I want to mark orders as packed so that they move to the delivery queue.
- As a packer, I want to print packing slips so that orders are labeled correctly.

**Delivery:**
- As a delivery planner, I want to create delivery runs so that orders are organized by area.
- As a delivery planner, I want to see a suggested delivery route so that deliveries are efficient.
- As a driver, I want to see my assigned delivery run so that I know where to go.
- As a driver, I want to navigate to each address using Google Maps.
- As a driver, I want to capture proof of delivery (signature or photo) so that deliveries are documented.

**Xero Integration:**
- As an admin, I want invoices to be automatically created in Xero when orders are packed.
- As an admin, I want credit notes to be created in Xero when orders are cancelled.
- As an admin, I want to see Xero integration errors so that I can resolve issues.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | Project Team | Initial draft |

---

**End of Product Requirements Document**
