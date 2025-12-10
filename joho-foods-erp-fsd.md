# **FUNCTIONAL SPECIFICATION DOCUMENT (FSD)**

## **Joho Foods ERP System**

**Version:** 1.0
**Date:** November 24, 2025
**Document Type:** Business Functional Specification
**Target Audience:** Business stakeholders, operations managers, end users

---

## **TABLE OF CONTENTS**

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Roles and Access Rights](#3-user-roles-and-access-rights)
4. [Customer Portal Functions](#4-customer-portal-functions)
5. [Admin Portal Functions](#5-admin-portal-functions)
6. [Order Lifecycle and Business Rules](#6-order-lifecycle-and-business-rules)
7. [Packing and Delivery Process](#7-packing-and-delivery-process)
8. [Pricing and Customer Management](#8-pricing-and-customer-management)
9. [Inventory Management](#9-inventory-management)
10. [Accounting Integration](#10-accounting-integration)
11. [Notifications and Communications](#11-notifications-and-communications)
12. [Business Rules Summary](#12-business-rules-summary)

---

## **1. INTRODUCTION**

### **1.1 Purpose**

This document describes how the Joho Foods ERP system works from a business perspective. It explains what users can do, how processes flow, and what rules govern the system's behavior. This document does not cover technical implementation details.

### **1.2 Scope**

The system consists of two web portals:
- **Customer Portal** - For business customers to browse products and place orders
- **Admin Portal** - For Joho Foods staff to manage operations

### **1.3 Business Objectives**

- Enable customers to place orders online 24/7
- Streamline order processing and reduce manual work
- Optimize delivery routes for efficiency
- Maintain accurate inventory levels
- Integrate with Xero accounting system
- Provide visibility into order status for customers and staff

---

## **2. SYSTEM OVERVIEW**

### **2.1 What the System Does**

The Joho Foods ERP system manages the entire order-to-delivery workflow for a B2B meat distribution business in Australia:

1. **Customers** register online, apply for credit terms, browse products with their negotiated pricing, and place orders
2. **Sales/Admin staff** approve credit applications, manage customer accounts, and confirm orders
3. **Warehouse packers** receive consolidated packing lists, pack orders in optimal sequence for van loading, and mark orders ready for delivery
4. **Drivers** receive delivery schedules with optimized routes, deliver orders, and capture proof of delivery
5. **The system** automatically manages inventory, creates accounting invoices, sends email notifications, and optimizes delivery routes

### **2.2 Key Business Processes**

| Process | Description |
|---------|-------------|
| **Customer Onboarding** | New business customers register, provide business details, and apply for credit terms |
| **Credit Approval** | Admin reviews credit applications and sets credit limits and payment terms |
| **Order Placement** | Customers select products and place orders (subject to cutoff time and credit limits) |
| **Order Processing** | Admin confirms orders, inventory is reserved, orders are queued for packing |
| **Packing** | Warehouse staff pack orders in optimal sequence (LIFO for van loading) |
| **Delivery** | Drivers follow optimized routes, deliver orders, and capture proof of delivery |
| **Invoicing** | System automatically creates invoices in Xero when orders are delivered |
| **Inventory Management** | System tracks stock levels, alerts on low stock, and maintains transaction history |

---

## **3. USER ROLES AND ACCESS RIGHTS**

### **3.1 Customer (External User)**

**Who They Are:** Business buyers purchasing meat products from Joho Foods

**What They Can Do:**
- Register for a new account and apply for credit terms
- Browse product catalog with their specific pricing
- Place orders online (if credit approved)
- View order history and track delivery status
- Update contact details and delivery address
- Cancel pending orders (before admin confirmation)

**What They Cannot Do:**
- View other customers' information or orders
- Access admin functions or internal operations
- Place orders if credit application is pending or rejected
- Cancel orders once admin has confirmed them

### **3.2 Admin (Internal User)**

**Who They Are:** Senior management with full system access

**What They Can Do:**
- Everything in the system
- Approve or reject credit applications
- Manage all customers, products, and orders
- Configure system settings (cutoff times, delivery areas, tax rates)
- Connect to Xero accounting system
- View all reports and analytics
- Cancel orders at any stage (with manager approval for late-stage cancellations)

**What They Cannot Do:**
- (No restrictions - full access)

### **3.3 Sales (Internal User)**

**Who They Are:** Sales representatives managing customer relationships

**What They Can Do:**
- View and update customer information
- Set customer-specific pricing for products
- Place orders on behalf of customers
- View all orders
- Confirm pending orders

**What They Cannot Do:**
- Approve credit applications (Admin only)
- Access inventory management
- Change company settings
- Access packing or delivery interfaces

### **3.4 Packer (Internal User)**

**Who They Are:** Warehouse staff responsible for packing orders

**What They Can Do:**
- View packing interface for selected delivery date
- See consolidated product list (total quantities needed)
- See individual orders in optimal packing sequence
- Mark items as packed
- Mark orders as "Ready for Delivery"
- Add packing notes

**What They Cannot Do:**
- Access customer management
- View pricing information
- Cancel or modify orders
- Access other modules

### **3.5 Driver (Internal User)**

**Who They Are:** Delivery drivers delivering orders to customers

**What They Can Do:**
- View assigned deliveries for the day
- See delivery addresses and route sequence
- Mark orders as "Out for Delivery"
- Upload proof of delivery (photo or signature)
- Mark orders as "Delivered"
- Return undelivered orders with reason

**What They Cannot Do:**
- Access other customers' orders (only assigned deliveries)
- Modify order details
- Access admin functions

### **3.6 Manager (Internal User)**

**Who They Are:** Operations managers overseeing business performance

**What They Can Do:**
- View all data across the system (read-only)
- Access reports and analytics
- Export data for analysis

**What They Cannot Do:**
- Modify any data
- Approve credit applications
- Process orders

---

## **4. CUSTOMER PORTAL FUNCTIONS**

### **4.1 Customer Registration**

**Process Flow:**

1. Customer visits the Customer Portal website
2. Clicks "Sign Up" and creates account with email and password
3. Fills out business profile form with:
   - Business name and ABN (Australian Business Number)
   - Contact person details (name, phone, email)
   - Delivery address (street, suburb, state, postcode)
   - Billing address (if different from delivery)
   - Optional: Requested credit limit and payment terms preference
   - Agrees to terms and conditions
4. System validates:
   - ABN format (11 digits)
   - Suburb is in serviced delivery area
   - Email is unique
5. System creates customer account with status "Pending Approval"
6. Customer receives confirmation email
7. Admin receives notification to review credit application

**Business Rules:**
- New customers cannot place orders until credit is approved
- Delivery address must be in a serviced suburb (North, East, South, or West area)
- If suburb is not in system, customer can still register but requires admin approval
- System automatically assigns delivery area based on suburb

### **4.2 Product Browsing**

**What Customers See:**

- **Product Catalog** showing all available products
- **Product Details** for each item:
  - Product name and description
  - SKU (product code)
  - Unit type (kg, piece, box, carton)
  - Package size (e.g., "5kg box")
  - **Their specific price** (if negotiated) or base price
  - Stock availability indicator:
    - 🟢 "In Stock" - plenty available
    - 🟡 "Low Stock" - running low
    - 🔴 "Out of Stock" - cannot order

**Features:**
- Search by product name or SKU
- Filter by category (Beef, Lamb, Pork, Poultry)
- Sort by name, price, or category
- View product descriptions and specifications

**Business Rules:**
- Customers see their negotiated pricing if sales team has set custom prices
- If no custom price exists, they see the standard base price
- Discontinued products are hidden from customers
- Out-of-stock products are visible but cannot be added to cart

### **4.3 Order Placement**

**Process Flow:**

1. Customer browses products and adds items to cart
2. Customer specifies quantity for each product
3. Customer proceeds to checkout
4. System displays order cutoff warning:
   - **Before 2:00 PM** (configurable): "Order by 2:00 PM for next-day delivery"
   - **After 2:00 PM**: "Order cutoff has passed. Your order will be scheduled for [date]. Contact us for urgent delivery."
5. Customer reviews:
   - Order items and quantities
   - Prices (customer-specific pricing applied)
   - Subtotal
   - GST (10% Australian tax)
   - Total amount
   - Delivery address
   - Requested delivery date
6. Customer submits order
7. System validates:
   - Customer has approved credit
   - Order total doesn't exceed credit limit
   - Delivery date is valid
8. System checks stock availability:
   - **If all items in stock**: Order created normally, inventory reserved
   - **If any items exceed stock**: Order becomes a **backorder** requiring admin approval (see 4.5 Backorder Process)
9. System creates order and sends confirmation email
10. Admin/Sales team receives notification

**Business Rules:**
- **Order Cutoff Time**: Orders placed before cutoff time (e.g., 2:00 PM) are scheduled for next-day delivery
- **After Cutoff**: Orders placed after cutoff require admin review for delivery date
- **Credit Limit**: System checks if current outstanding balance + new order ≤ credit limit
- **Stock Reservation**: For normal orders, inventory is immediately reduced when order is placed to prevent overselling
- **Backorders**: Orders exceeding stock are submitted for admin approval rather than rejected outright
- **Minimum Order**: No minimum order quantity (configurable if needed)

### **4.4 Order Tracking**

**What Customers Can See:**

| Order Status | Customer Sees | What It Means |
|--------------|---------------|---------------|
| **Pending** | "Your order is being processed" | Order submitted, awaiting admin confirmation |
| **Confirmed** | "Order confirmed, preparing for packing" | Admin approved, ready for warehouse |
| **Packing** | "Your order is being packed" | Warehouse is packing the order |
| **Ready for Delivery** | "Order packed and ready for dispatch" | Packed, waiting for driver assignment |
| **Out for Delivery** | "Your order is on the way" + Driver name | Driver is en route to deliver |
| **Delivered** | "Order delivered on [date]" + Proof of delivery | Successfully delivered |
| **Cancelled** | "Order cancelled" + Reason | Order was cancelled |

**Backorder Status (shown alongside order status when applicable):**

| Backorder Status | Customer Sees | What It Means |
|------------------|---------------|---------------|
| **Awaiting Approval** | "Order pending approval due to stock" | Some items exceed current stock, admin is reviewing |
| **Approved Backorder** | "Backorder approved" | Admin approved the order despite stock shortfall |
| **Partially Approved** | "Partially approved - see details" | Some quantities were reduced by admin |
| **Backorder Rejected** | "Backorder rejected" | Admin could not approve the order |

**Features:**
- View all past orders with dates, totals, and status
- Filter orders by status or date range
- Click on order to see full details
- View backorder status and details for orders with stock shortfalls
- Download order confirmation as PDF (future)
- View proof of delivery photo/signature when delivered

**Business Rules:**
- Customers can only view their own orders
- Customer can cancel orders in "Pending" status only
- Once order is "Confirmed" or later, cancellation requires admin assistance
- Backorders awaiting approval can be cancelled by the customer

### **4.5 Backorder Process (Customer Experience)**

**What Happens When Stock is Insufficient:**

1. Customer completes checkout normally
2. At submission, system detects one or more items exceed available stock
3. Customer sees notification: "Some items in your order exceed current stock. Your order has been submitted for approval."
4. Order appears in "My Orders" with status badge showing "Awaiting Approval"
5. Customer receives email explaining the backorder process and expected timeline

**During the Wait:**

- Customer can view order details to see which items have stock shortfalls
- Customer can cancel the order if they no longer want to wait
- Customer can place other orders (pending backorders don't block credit)
- Typical review time: 1-2 business days

**After Admin Decision:**

| Decision | What Customer Sees | Email Notification |
|----------|-------------------|-------------------|
| **Full Approval** | Order moves to "Confirmed" with "Approved Backorder" badge | "Great news! Your backorder has been approved and will be fulfilled." |
| **Partial Approval** | Order updated with new quantities and totals | "Your order has been partially approved. Some quantities were adjusted." |
| **Rejection** | Order moves to "Cancelled" with "Backorder Rejected" badge | "Unfortunately, we cannot fulfill your order. Please contact us for alternatives." |

**What Customers Cannot Do:**

- Cannot modify a backorder while it's awaiting approval
- Cannot bypass stock checks to force an order through
- Cannot see internal admin notes about the decision

---

## **5. ADMIN PORTAL FUNCTIONS**

### **5.1 Dashboard**

**What Admin Sees on Login:**

**Key Metrics (at a glance):**
- Number of pending credit applications awaiting approval
- **Number of pending backorders awaiting approval**
- Today's orders: count and total value
- Orders ready for packing today: count
- Orders out for delivery: count
- Low stock alerts: count of products below threshold
- Last Xero sync status and timestamp

**Quick Actions:**
- "Review Pending Credit Applications" button
- **"Review Pending Backorders" button**
- "View Today's Packing List" button
- "View Today's Deliveries" button
- "Check Low Stock" button
- "Sync with Xero" button

### **5.2 Company Settings**

**What Admin Can Configure:**

**Business Information:**
- Company name, ABN, email, phone
- Physical address

**Order Settings:**
- **Order cutoff time** (e.g., "14:00" for 2:00 PM)
- Time zone (Australia/Sydney)

**Financial Settings:**
- Currency (AUD)
- GST rate (10%)

**Inventory Settings:**
- Low stock threshold (default alert level)
- Email addresses for low stock alerts

**Delivery Areas:**
- Define geographic delivery areas: North, East, South, West
- Assign suburbs to each area
- Add new suburbs to servicing area

**Xero Integration:**
- Connect to Xero accounting system (OAuth setup)
- Disconnect Xero
- View sync status and errors

**Business Rules:**
- Only Admin role can modify company settings
- Changing cutoff time affects orders placed after the change (not retroactive)
- Suburb assignments determine delivery route optimization

### **5.3 Customer Management**

**Customer List View:**

Admin can view all customers with columns:
- Business name
- Contact person and email
- Credit status (Pending, Approved, Rejected)
- Credit limit
- Delivery area
- Account status (Active, Suspended, Closed)
- Registration date

**Filters:**
- Credit status: Pending, Approved, Rejected
- Delivery area: North, East, South, West
- Account status: Active, Suspended, Closed
- Search by: Business name, email, ABN

**Credit Approval Workflow:**

1. Admin clicks "Pending Applications" to see new customers
2. Admin reviews customer details:
   - Business information
   - Requested credit limit
   - Delivery address
3. Admin sets:
   - **Approved credit limit** (dollar amount)
   - **Payment terms** (e.g., "Net 30", "COD")
   - **Internal notes** (reason for limit, risk assessment)
4. Admin clicks "Approve" or "Reject"
5. System sends email to customer:
   - **If approved**: "Congratulations! Your credit application has been approved. You can now place orders up to $[amount]."
   - **If rejected**: "Unfortunately, we cannot approve credit at this time. Please contact us to discuss alternatives."
6. If approved, system creates customer record in Xero accounting system

**Customer Account Management:**

Admin can:
- **Update customer information** (address, contact details)
- **Change credit limit** (increase or decrease)
- **Suspend account** (prevents ordering, with reason)
- **Reactivate suspended account**
- **Close account** (permanently disable)

**Activity Summary:**

For each customer, admin can view:
- Total orders placed
- Total spent (lifetime value)
- Average order value
- Last order date
- Outstanding balance
- Credit limit utilization

**Business Rules:**
- Customer must be "Approved" to place orders
- Suspended customers cannot login or place orders
- Closed accounts cannot be reopened (must create new account)
- Changing credit limit does not affect existing pending orders
- Admin must provide reason when suspending or closing accounts

### **5.4 Product Management**

**Product List View:**

Shows all products with:
- SKU (product code)
- Product name
- Category (Beef, Lamb, Pork, Poultry)
- Base price per unit
- Current stock level
- Stock status (OK, Low, Out)
- Product status (Active, Discontinued)

**Add/Edit Product:**

Admin can create or modify products:
- **SKU**: Unique product code (required)
- **Name**: Product name (required)
- **Description**: Details about the product
- **Category**: Product category for filtering
- **Unit**: kg, piece, box, or carton
- **Package size**: e.g., 5 for "5kg box"
- **Base price**: Default price in dollars (required)
- **Current stock**: Quantity in inventory
- **Low stock threshold**: Alert when stock falls below this level
- **Status**: Active (customers can order) or Discontinued (hidden from customers)

**Stock Management:**

Admin can:
- **View current stock level** for each product
- **Receive stock** (add to inventory when supplier delivers)
  - Enter quantity received
  - Add notes (e.g., "Invoice #123 from Supplier X")
- **Adjust stock** (manual corrections)
  - Enter positive quantity (add stock)
  - Enter negative quantity (reduce stock)
  - Select reason: Stock count correction, Damaged goods, Expired stock
  - Add notes explaining adjustment
- **View stock transaction history** (all additions and reductions with dates, who did it, and why)

**Low Stock Alerts:**

- System automatically sends email alert when product stock falls below threshold
- Alert includes: Product name, current stock, suggested reorder quantity
- Alerts sent to warehouse manager and admin emails
- Batched hourly to avoid spam

**Business Rules:**
- SKU must be unique across all products
- Base price must be greater than zero
- Stock cannot go below zero (system blocks orders if insufficient stock)
- Discontinued products are hidden from Customer Portal but remain in system
- Stock history is permanent and cannot be deleted (audit trail)

### **5.5 Customer-Specific Pricing**

**Purpose:** Allow sales team to offer negotiated prices to individual customers

**How It Works:**

**Option 1: Set pricing by customer**
1. Admin selects a customer
2. Views list of all products with two price columns:
   - Base price (default for all customers)
   - Customer-specific price (if set)
3. Admin can:
   - Add custom price for a product
   - Edit existing custom price
   - Remove custom price (customer reverts to base price)
   - Set effective date range (optional): "This price valid from [date] to [date]"
   - Add notes (e.g., "Contract pricing until December 2025")

**Option 2: Set pricing by product**
1. Admin selects a product
2. Views list of customers who have custom pricing for this product
3. Admin can add new customers with special pricing

**What Customers See:**
- If customer has custom pricing: They see their negotiated price
- If no custom pricing: They see the base price
- Customers never see other customers' pricing

**Audit Trail:**
- System records every pricing change
- Shows: Who changed it, when, old price, new price, reason

**Business Rules:**
- Custom pricing overrides base pricing
- Only Admin and Sales roles can set custom pricing
- Effective date range is optional (if blank, price is always active)
- Expired custom pricing automatically reverts customer to base price
- Pricing changes do not affect existing orders (order locked at time of placement)

### **5.6 Order Management**

**Order List Views:**

**All Orders View:**
- Shows every order in the system
- Columns: Order number, Customer, Date, Status, Total, Delivery date, Area
- Filters: Status, Date range, Customer, Delivery area
- Sort by: Date, Status, Total value
- Bulk actions: Export to Excel/CSV

**Today's Orders View:**
- Shows only orders for today's delivery
- Grouped by status:
  - Pending (need confirmation)
  - Confirmed (ready for packing)
  - Packing (being packed now)
  - Ready for delivery (packed, waiting for driver)
  - Out for delivery (with driver)
  - Delivered (completed today)
- Quick action buttons for status updates

**Order Detail Page:**

Shows complete order information:
- **Customer details**: Name, contact, delivery address
- **Order items**: Products, quantities, unit prices, subtotals
- **Pricing breakdown**: Subtotal, GST (10%), Total
- **Delivery information**: Requested date, area, delivery instructions
- **Status history**: Timeline showing every status change with timestamps and who did it
- **Internal notes**: Admin can add notes visible only to staff
- **Xero sync status**: Invoice number if created, error message if failed

**Actions Admin Can Take:**

1. **Confirm Order** (Pending → Confirmed)
   - Validates stock still available
   - Validates customer credit limit
   - Adds order to packing queue
   - Sends confirmation email to customer

2. **Cancel Order** (Any status → Cancelled)
   - Enter cancellation reason
   - System restores inventory immediately
   - If Xero invoice exists, system creates credit note
   - Sends cancellation email to customer
   - If order is "Out for Delivery", sends urgent alert to driver to return order

3. **Modify Delivery Address** (Before packing)
   - Update delivery address for special requests
   - System re-validates suburb and area

4. **Add Internal Notes**
   - Private notes visible only to staff
   - For example: "Customer called - needs delivery by 10 AM"

5. **Resend Confirmation Email**
   - If customer didn't receive original email

6. **Manual Xero Sync**
   - If automatic sync failed, admin can retry

**Place Order on Behalf of Customer:**

Sales/Admin can create orders for customers who phone in:
1. Select customer from dropdown
2. Add products and quantities
3. Review pricing (customer's specific pricing applied automatically)
4. Set delivery date
5. Add internal notes if needed
6. Admin can bypass cutoff time (special permission)
7. Admin can bypass credit limit (with justification note)
8. System sends order confirmation to customer

**Business Rules:**
- Only Admin and Sales can confirm, cancel, or modify orders
- Customers can only cancel their own orders in Pending status
- Once order is "Confirmed" or later, only Admin can cancel (requires manager approval)
- Cancelling order restores inventory immediately
- Order numbers are unique and sequential (ORD-2025-001234)

### **5.7 Backorder Management**

**What Admin Sees:**

When backorders exist, admin sees a notification on the dashboard showing the count of pending backorders. Clicking "Review Pending Backorders" opens the backorder queue.

**Backorder Queue View:**

A dedicated list view showing all orders with backorder status "Pending Approval":
- Order number and customer name
- Order total amount
- Requested delivery date
- Date submitted
- Stock shortfall summary (e.g., "2 items below stock")

**Reviewing a Backorder:**

When admin clicks on a backorder, they see:

1. **Order Details Card:**
   - Order number, customer name, requested delivery date
   - Order total amount
   - Date order was placed

2. **Stock Availability Panel:**
   - For each item with insufficient stock:
     - Product name and SKU
     - Quantity requested by customer
     - Quantity currently available
     - Shortfall amount (how many units short)
     - Visual bar showing availability percentage (color-coded)

3. **Approval Decision Section:**
   Three mutually exclusive options:

   | Option | Description | Required Input |
   |--------|-------------|----------------|
   | **Approve Full Order** | Commit to fulfilling entire order when stock arrives | Optional: Expected fulfillment date, admin notes |
   | **Partial Approval** | Approve only available quantities | Per-product quantity fields, optional notes |
   | **Reject Order** | Cannot fulfill the order | Required: Rejection reason (minimum 10 characters) |

**Partial Approval Process:**

When admin chooses partial approval:
1. For each product with shortfall, admin enters approved quantity
2. System validates: quantity must be positive and not exceed requested amount
3. System recalculates order totals based on approved quantities
4. Customer is notified of the changes
5. Order proceeds with adjusted quantities

**What Happens After Decision:**

| Decision | Order Status | Backorder Status | Inventory | Customer Notification |
|----------|-------------|------------------|-----------|----------------------|
| **Approve Full** | Confirmed | Approved | Stock reserved | Approval email with fulfillment date |
| **Partial Approval** | Confirmed | Partially Approved | Approved qty reserved | Email showing original vs approved |
| **Reject** | Cancelled | Rejected | No change | Rejection email with reason |

**Admin Business Rules:**

- Only Admin and Sales roles can approve/reject backorders
- Rejection requires explanation (minimum 10 characters)
- Approved backorders move directly to "Confirmed" status (skip manual confirmation)
- Inventory is only reserved when backorder is approved (not at submission)
- Partial approvals automatically recalculate GST and totals
- Admin who approved/rejected is recorded for audit trail

**Backorder Filters in Order List:**

The main orders list now includes a "Backorder Status" filter with options:
- All Backorder Statuses
- Normal Orders (no backorder)
- Pending Approval
- Approved
- Partially Approved
- Rejected

---

## **6. ORDER LIFECYCLE AND BUSINESS RULES**

### **6.1 Order Status Flow**

**Complete Order Journey:**

```
Order Created (Customer or Admin places order)
    ↓
[Pending] - Order awaiting admin confirmation
    ↓ (Admin confirms)
[Confirmed] - Order approved, ready for packing
    ↓ (Packer accesses order - automatic)
[Packing] - Warehouse is packing the order
    ↓ (Packer marks all items packed)
[Ready for Delivery] - Packed, waiting for driver
    ↓ (Driver marks out for delivery)
[Out for Delivery] - Driver is delivering
    ↓ (Driver uploads proof of delivery)
[Delivered] - Order complete ✓
```

**Alternative Paths:**
- Any status → **Cancelled** (with restrictions - see below)
- Packing → Confirmed (if packer abandons session for 30+ minutes - automatic timeout)
- Out for Delivery → Ready for Delivery (if driver cannot deliver and returns order)

### **6.2 Order Status Rules**

#### **Pending Status**

**What it means:** Order submitted, awaiting admin review

**What happens automatically:**
- Inventory is reduced immediately (stock reserved)
- Credit limit is checked
- Customer receives order confirmation email
- Admin receives new order notification

**Who can take action:**
- Admin/Sales: Confirm order → moves to Confirmed
- Admin/Sales/Customer: Cancel order → moves to Cancelled

**Business validations:**
- Customer must have approved credit
- Order total must not exceed available credit limit
- All items must be in stock
- Delivery date must be valid

#### **Confirmed Status**

**What it means:** Admin approved, ready for warehouse packing

**What happens automatically:**
- Order appears in packing interface for warehouse staff
- Customer receives "Order Confirmed" email
- Warehouse receives notification

**Who can take action:**
- Packer: Opens order → automatically moves to Packing
- Admin/Sales: Cancel order → moves to Cancelled

#### **Packing Status**

**What it means:** Warehouse staff is actively packing

**What happens automatically:**
- Packer sees order in their packing interface
- 30-minute timeout starts (if inactive, reverts to Confirmed)

**Who can take action:**
- Packer: Mark all items packed → moves to Ready for Delivery
- Packer: Abandon session → automatically reverts to Confirmed after 30 min
- Admin: Cancel order (requires manager approval) → moves to Cancelled

**Business rules:**
- Only one packer can work on order at a time
- Packer must mark all items as packed before completing
- If session times out, order becomes available for any packer again

#### **Ready for Delivery Status**

**What it means:** Order is packed and ready for driver pickup

**What happens automatically:**
- Order appears in delivery interface for drivers
- Delivery team receives notification
- Route optimization may be triggered if all orders for the day are ready

**Who can take action:**
- Driver: Mark out for delivery → moves to Out for Delivery
- Packer: Reopen for repacking → moves back to Packing
- Admin: Cancel order (requires manager approval) → moves to Cancelled

#### **Out for Delivery Status**

**What it means:** Driver has order and is en route to customer

**What happens automatically:**
- Customer receives "Order is on the way" email with driver name
- Driver sees order in their delivery list with route sequence

**Who can take action:**
- Driver: Mark delivered (with proof) → moves to Delivered
- Driver: Return order (customer unavailable) → moves back to Ready for Delivery
- Admin: Emergency cancel (requires manager approval, driver alerted immediately) → moves to Cancelled

**Business rules:**
- Driver must upload proof of delivery (photo or signature) to complete
- Only assigned driver can update this order
- If driver returns order, reason must be provided

#### **Delivered Status (Final)**

**What it means:** Order successfully delivered to customer

**What happens automatically:**
- Customer receives "Order Delivered" email with proof of delivery
- System automatically creates Xero invoice (asynchronous)
- Driver's delivery count updates
- Order is complete and locked (no further changes)

**Who can take action:**
- No one can change status (final state)
- Admin can view delivery details and proof of delivery
- If customer issues arise, use separate return/refund process

**Business rules:**
- Cannot undo delivered status
- Proof of delivery is permanently stored
- Xero invoice creation happens in background (if fails, admin is notified for retry)

#### **Cancelled Status (Final)**

**What it means:** Order was cancelled and will not be fulfilled

**What happens automatically:**
- Inventory is restored immediately (stock returned)
- Customer receives cancellation email with reason
- If Xero invoice exists, system creates credit note
- If order was out for delivery, driver receives urgent alert to return

**Who can take action:**
- No one can change status (final state)
- Cannot be un-cancelled (must create new order)

**Business rules:**
- Cancellation reason must be provided
- Delivered orders cannot be cancelled (use return process instead)

### **6.2.1 Backorder Workflow**

**What is a Backorder?**

A backorder occurs when a customer places an order for quantities that exceed current stock availability. Instead of rejecting the order outright, the system allows the order to be submitted for admin approval.

**When Backorders Are Created:**

When a customer submits an order and one or more items exceed available stock, the system:
1. Creates the order with status "Pending"
2. Marks the order with backorder status "Pending Approval"
3. Records which products have insufficient stock and by how much
4. Does NOT reduce inventory (unlike normal orders)
5. Sends notification to customer explaining the situation
6. Sends notification to admin team requesting review

**Example Scenario:**
```
Customer orders:
  - Beef Rump 5kg: 100 units (only 60 in stock)
  - Pork Loin 3kg: 50 units (80 in stock - sufficient)

Result:
  - Order created with backorder status "Pending Approval"
  - Stock shortfall recorded: Beef Rump needs 40 more units
  - Customer notified: "Your order is pending approval due to stock availability"
  - Admin notified: "New backorder requires your review"
```

**Backorder Status Flow:**

```
Order Created (Stock Shortfall Detected)
    ↓
[Pending Approval] - Awaiting admin decision
    ↓
Admin Reviews and chooses one of three options:
    ├── Approve Full Order → [Approved] → Order moves to Confirmed
    ├── Approve Partial Quantities → [Partially Approved] → Order moves to Confirmed (with reduced quantities)
    └── Reject Order → [Rejected] → Order is Cancelled
```

**Admin Approval Options:**

| Option | What It Means | What Happens |
|--------|--------------|--------------|
| **Approve Full Order** | Admin commits to fulfilling entire order when stock arrives | Order proceeds, inventory reserved, customer notified of expected fulfillment date |
| **Approve Partial Quantities** | Admin approves only available quantities | Order updated with reduced quantities, new totals calculated, customer notified of changes |
| **Reject Order** | Admin cannot fulfill the order | Order cancelled, customer notified with reason, no inventory changes |

**What Customers See:**

| Backorder Status | Customer Portal Display |
|------------------|------------------------|
| Pending Approval | "Awaiting Approval" - Your order is being reviewed due to stock availability |
| Approved | "Approved Backorder" - Your backorder has been approved and will be fulfilled |
| Partially Approved | "Partially Approved" - Some items were adjusted. See details below |
| Rejected | "Backorder Rejected" - Unfortunately, we cannot fulfill this order. Please contact us |

**Business Rules for Backorders:**

1. **Stock is NOT reduced when backorder is created** - Only when approved
2. **Pending backorders do NOT count against credit limit** - Customer can place other orders while waiting
3. **Admin must provide notes when rejecting** - Minimum 10 characters explaining the reason
4. **Expected fulfillment date is optional** - Admin can set when stock is expected to arrive
5. **Partial approval recalculates totals** - Order amounts adjusted to match approved quantities
6. **Rejected backorders become cancelled** - Order status changes to Cancelled automatically

**Customer Email Notifications:**

| Event | Email Content |
|-------|--------------|
| Backorder submitted | "Your order has been submitted for review. Some items exceed current stock levels. We will notify you within 1-2 business days." |
| Backorder approved | "Great news! Your backorder has been approved. Expected fulfillment: [date if provided]" |
| Backorder partially approved | "Your order has been partially approved. Original request: [X units], Approved: [Y units]. Order total has been adjusted." |
| Backorder rejected | "Unfortunately, we cannot fulfill your order at this time. Reason: [admin reason]. Please contact us for alternatives." |

---

### **6.3 Credit Limit Enforcement**

**How Credit Limits Work:**

1. **Setting Credit Limit:** Admin sets dollar amount during credit approval (e.g., $10,000)

2. **Calculating Available Credit:**
   ```
   Available Credit = Credit Limit - Outstanding Balance
   ```

3. **Outstanding Balance includes:**
   - All orders in status: Pending, Confirmed, Packing, Ready for Delivery, Out for Delivery
   - Excludes: Delivered (invoiced), Cancelled (restored)
   - **Excludes: Pending backorders** (backorder status = "Pending Approval") - These don't count against credit until approved

4. **Order Validation:**
   - When customer places order, system checks: `New Order Total ≤ Available Credit`
   - If exceeds, order is rejected with message: "This order would exceed your credit limit. Please contact sales."

**Admin Override:**
- Admin/Sales can bypass credit limit when placing order on behalf of customer
- Must provide justification note (e.g., "Approved by manager - long-standing customer")

**Example Scenario:**
- Credit limit: $10,000
- Current outstanding orders: $7,500
- Available credit: $2,500
- New order: $3,000
- Result: ❌ Rejected - exceeds available credit by $500

### **6.4 Order Cutoff Time**

**Purpose:** Ensures orders are processed in time for next-day delivery

**How It Works:**

1. **Cutoff Time Set:** Admin configures cutoff time (e.g., 2:00 PM) in Company Settings

2. **Before Cutoff (e.g., 1:45 PM):**
   - Customer sees: "Order by 2:00 PM for next-day delivery"
   - Order is scheduled for: Tomorrow
   - Example: Order placed Monday 1:45 PM → Delivery Tuesday

3. **After Cutoff (e.g., 2:15 PM):**
   - Customer sees: "Order cutoff time (2:00 PM) has passed. Please contact us for delivery arrangement."
   - Order is scheduled for: Day after tomorrow (or admin reviews)
   - Example: Order placed Monday 2:15 PM → Delivery Wednesday (or later)

**Admin Override:**
- Admin can place orders after cutoff and manually set next-day delivery
- Used for urgent/priority orders
- Must document reason in order notes

**Business Rules:**
- Cutoff time applies to Customer Portal orders only
- Admin-placed orders can bypass cutoff
- Cutoff time is in company's local timezone (Australia/Sydney)
- System checks cutoff at moment of order submission, not when customer starts shopping

---

## **7. PACKING AND DELIVERY PROCESS**

### **7.1 Packing Interface**

**Purpose:** Help warehouse staff pack orders efficiently in correct sequence for van loading

**How Packers Use the System:**

1. **Select Delivery Date:**
   - Packer chooses date (default: tomorrow)
   - System shows all orders for that date in status: Confirmed, Packing, or Ready for Delivery

2. **View 1: Product Summary (Consolidated List)**
   - Shows total quantities needed across ALL orders
   - Example:
     ```
     Beef Rump (5kg): 50 units
     Pork Loin (3kg): 30 units
     Chicken Breast (2kg): 20 units
     ```
   - Packer uses this to gather all products from warehouse efficiently
   - Checklist to mark products as gathered

3. **View 2: Order List (Packing Sequence)**
   - Shows individual orders in **optimal packing sequence**
   - Orders are numbered 1, 2, 3, etc.
   - **Pack in order shown** (important for van loading)
   - Each order card shows:
     - Order number
     - Customer name
     - Delivery address and area
     - Items to pack (product, quantity, unit)
     - Checklist for each item
     - Notes field

4. **Packing Process:**
   - Packer clicks on Order #1 (first to pack)
   - System automatically changes order status to "Packing"
   - Packer marks each item as packed (checkbox)
   - Packer adds any notes (e.g., "Short 1kg - called customer")
   - When all items checked, packer clicks "Mark Ready for Delivery"
   - System changes status to "Ready for Delivery"
   - Packer moves to Order #2

5. **Route Optimization:**
   - System automatically calculates optimal packing sequence when packer opens interface
   - If not yet calculated, packer sees "Optimizing routes..." for 2-5 seconds
   - Packer can click "Re-optimize Route" if orders have been added

**Why Packing Sequence Matters:**

**LIFO Strategy (Last-In, First-Out):**
- Orders are packed in **reverse delivery order**
- Last delivery goes into van first (bottom/front of van)
- First delivery goes into van last (top/back of van)
- When driver arrives at first delivery, order is easily accessible at back/top of van

**Example:**
```
Delivery Route (optimized by system):
  Stop 1: North Suburb A (first delivery)
  Stop 2: North Suburb B
  Stop 3: East Suburb C
  Stop 4: East Suburb D (last delivery)

Packing Order (reverse for LIFO):
  Pack First:  East Suburb D  (goes in van first, comes out last)
  Pack Second: East Suburb C
  Pack Third:  North Suburb B
  Pack Last:   North Suburb A  (goes in van last, comes out first)
```

**Business Rules:**
- Packer must mark all items as packed before completing order
- If packer does not interact with order for 30 minutes, order automatically reverts to "Confirmed" (session timeout)
- Only one packer can work on an order at a time
- Packer can reopen "Ready for Delivery" orders if repacking needed
- System groups orders by delivery area: North, East, South, West

### **7.2 Delivery Route Optimization**

**How the System Determines Optimal Routes:**

**Step 1: Group by Area**
- System groups orders by delivery area (North, East, South, West)
- Each area is optimized separately

**Step 2: Calculate Best Route**
- System uses mapping service to find shortest route visiting all addresses
- Considers: Distance, traffic patterns, one-way streets
- Solves "traveling salesman problem" - finds most efficient order to visit all stops

**Step 3: Assign Delivery Sequence**
- Orders are numbered in delivery order: 1, 2, 3, etc.
- Sequence #1 = First delivery stop
- Sequence #8 = Last delivery stop

**Step 4: Calculate Packing Sequence**
- Packing sequence is reverse of delivery sequence (LIFO)
- Last delivery = Pack first
- First delivery = Pack last

**Step 5: Show to Users**
- Packers see orders in packing sequence
- Drivers see orders in delivery sequence
- Both see estimated arrival times

**When Optimization Happens:**
- **Automatically** when packer opens packing interface (if not done already)
- **Automatically** when order count changes (new orders added)
- **Manually** when packer/admin clicks "Optimize Route"
- Takes 2-5 seconds to calculate

**What Drivers Get:**
- List of deliveries in optimal sequence
- Each delivery shows:
  - Sequence number (1st stop, 2nd stop, etc.)
  - Customer name and contact phone
  - Full delivery address
  - Delivery instructions (gate code, loading dock info, etc.)
  - Items to deliver
  - Estimated arrival time
  - "Open in Google Maps" button for navigation

### **7.3 Delivery Process**

**Driver's Workflow:**

1. **Morning Preparation:**
   - Driver logs into Admin Portal on mobile device/tablet
   - Views today's deliveries in delivery interface
   - Sees deliveries sorted by sequence: 1st stop, 2nd stop, etc.
   - Reviews route on map (if displayed)

2. **Loading Van:**
   - Warehouse staff load orders into van based on packing sequence
   - Orders are stacked so first delivery is accessible first

3. **Starting Delivery Run:**
   - Driver marks first delivery as "Out for Delivery"
   - System sends email to customer: "Your order is on the way! Driver [Name] is en route."
   - Driver clicks "Open in Google Maps" for navigation

4. **Arriving at Customer:**
   - Driver unloads order
   - Delivers to customer contact person

5. **Proof of Delivery:**
   - Driver must capture proof before marking delivered
   - **Option A: Photo** - Driver takes photo of delivered goods or delivery location
   - **Option B: Signature** - Customer signs on driver's device screen

6. **Completing Delivery:**
   - Driver uploads proof of delivery
   - Driver marks order as "Delivered"
   - System sends email to customer: "Order delivered! Thank you for your business."
   - System automatically creates Xero invoice in background

7. **Next Stop:**
   - Driver moves to next delivery in sequence
   - Repeats steps 3-6

**If Customer is Not Available:**
- Driver cannot complete delivery
- Driver clicks "Return Order"
- Driver enters reason: "Customer not available", "Business closed", "Wrong address", etc.
- Order status changes back to "Ready for Delivery"
- Admin is notified to contact customer and reschedule

**Emergency Situations:**
- If admin needs to cancel order while driver is en route (rare):
  - Admin cancels order with "Emergency cancellation" flag
  - Driver receives urgent notification: "DO NOT DELIVER ORDER #[number] - Return to warehouse"
  - Driver returns order
  - Customer is notified of cancellation

**Business Rules:**
- Driver must upload proof of delivery (photo or signature) to complete delivery
- Proof of delivery is stored permanently for disputes
- Driver can only update orders assigned to them
- If delivery cannot be completed, driver must provide reason
- System tracks actual arrival time for future route optimization improvements

---

## **8. PRICING AND CUSTOMER MANAGEMENT**

### **8.1 Pricing Strategy**

**Three Types of Prices:**

1. **Base Price** (Default)
   - Set by admin for each product
   - Applies to all customers unless overridden
   - Example: Beef Rump 5kg = $45.00 base price

2. **Customer-Specific Price** (Negotiated)
   - Sales team sets custom price for individual customer
   - Overrides base price for that customer only
   - Example: Customer ABC negotiated $42.00 (vs. $45.00 base)

3. **Contract Price** (Time-Limited)
   - Customer-specific price with expiration date
   - Example: Special price valid from Jan 1 to Dec 31, 2025
   - After expiry, customer reverts to base price

**How Pricing is Displayed:**

- **Customer Portal:**
  - If customer has custom price: Shows negotiated price only
  - If no custom price: Shows base price
  - Customer never sees both prices (no comparison)

- **Admin Portal:**
  - Shows both base price and custom price (if set)
  - Shows effective date range if applicable
  - Shows price history (audit trail)

**Price Changes:**
- Changing prices does NOT affect existing orders
- Orders lock in price at time of placement
- Future orders use new pricing

### **8.2 Payment Terms**

**Common Payment Terms:**

- **COD (Cash on Delivery):** Customer pays upon delivery
- **Net 7:** Payment due within 7 days
- **Net 14:** Payment due within 14 days
- **Net 30:** Payment due within 30 days
- **Custom terms:** Admin can enter any text (e.g., "2% discount if paid within 10 days")

**How Payment Terms Work:**
- Admin sets payment terms during credit approval
- Terms are stored with customer account
- When Xero invoice is created, due date is calculated based on terms
- Example: Order delivered March 15 + Net 30 = Due April 14

**System Does Not Handle Payments:**
- ERP tracks credit limits and orders
- Actual payment collection happens outside system (bank transfer, Xero, etc.)
- Xero integration creates invoices for customer to pay

### **8.3 GST (Australian Tax) Handling**

**GST Basics:**
- GST (Goods and Services Tax) = 10% in Australia
- Applied to all product sales
- Included in Xero invoices

**How GST is Calculated:**

Example order:
```
Item 1: Beef Rump 5kg × 10 units × $42.00 = $420.00
Item 2: Pork Loin 3kg × 5 units × $28.00 = $140.00
─────────────────────────────────────────────────
Subtotal:                                 $560.00
GST (10%):                               + $56.00
─────────────────────────────────────────────────
Total:                                    $616.00
```

**Display to Customers:**
- Order summary shows: Subtotal + GST + Total
- Clearly labeled: "GST (10%)"
- Complies with Australian tax invoice requirements

**Xero Integration:**
- System sends tax-inclusive amounts to Xero
- Xero invoice shows GST breakdown
- Xero handles GST reporting for BAS (Business Activity Statement)

---

## **9. INVENTORY MANAGEMENT**

### **9.1 How Inventory Works**

**Stock Levels:**

For each product, system tracks:
- **Current Stock:** Quantity currently available in warehouse
- **Low Stock Threshold:** Alert level (e.g., 10 units)
- **Stock Status:**
  - 🟢 **OK**: Stock above threshold
  - 🟡 **Low**: Stock at or below threshold
  - 🔴 **Out of Stock**: Zero stock

**Stock Movements:**

Every change to inventory is recorded as a **transaction** with:
- Product affected
- Transaction type (see below)
- Quantity (positive for additions, negative for reductions)
- Before and after stock levels
- Who made the change
- Date and time
- Notes explaining why

**Transaction Types:**

| Type | What It Means | When It Happens | Quantity |
|------|---------------|-----------------|----------|
| **Sale** | Stock sold to customer | **Automatic** when order is placed | Negative (reduces stock) |
| **Adjustment** | Manual stock change | Admin adds or removes stock for any reason | Positive or Negative |
| **Return** | Customer return or cancelled order | **Automatic** when order is cancelled | Positive (adds back stock) |

**Note:** All manual stock changes (receiving deliveries, count corrections, damage write-offs) use the Adjustment type with an "Adjustment Type" category to capture the business reason.

### **9.2 Stock Reservation (Critical Business Rule)**

**When Stock is Reduced:**

**❗ IMMEDIATELY when order is placed (status = Pending)**

**Why this matters:**
- Prevents overselling: If 50 units in stock and 3 customers order 20 units each (60 total), first 2 orders succeed, 3rd order fails
- Real-time accuracy: Stock levels are always current
- No surprises: Packer won't discover shortage during packing

**Example Timeline:**
```
9:00 AM: Current stock: 100 units
9:05 AM: Customer A places order for 30 units
         → Stock immediately reduced to 70 units
9:10 AM: Customer B places order for 40 units
         → Stock immediately reduced to 30 units
9:15 AM: Customer C tries to place order for 50 units
         → Order REJECTED - insufficient stock (only 30 available)
```

**When Stock is Restored:**

**❗ IMMEDIATELY when order is cancelled (any status)**

If order is cancelled for any reason, stock is added back:
- Cancelled before packing: Stock returned
- Cancelled during packing: Stock returned
- Cancelled while out for delivery: Stock returned when driver brings back

**Example:**
```
Order placed: 30 units reserved (stock: 100 → 70)
Order cancelled: 30 units restored (stock: 70 → 100)
```

### **9.3 Manual Stock Management**

**Purpose:** All manual changes to inventory levels are handled through Stock Adjustments. This includes receiving new stock, correcting count discrepancies, and writing off damaged or expired goods.

**When to Use Stock Adjustments:**

| Scenario | Quantity | Adjustment Type | Example Notes |
|----------|----------|-----------------|---------------|
| Stock received from supplier | Positive | Stock Received | "50 units from Supplier ABC, Invoice #12345" |
| Physical count higher than system | Positive | Stock Count Correction | "Annual stocktake - found 2 extra in Shelf D4" |
| Physical count lower than system | Negative | Stock Count Correction | "Quarterly count - 3 units missing" |
| Damaged goods | Negative | Damaged Goods | "5 units water damaged, disposed" |
| Expired stock | Negative | Expired Stock | "Batch #789 past use-by date" |

**Adjustment Types (dropdown options):**

1. **Stock Received** - Adding stock from supplier deliveries, transfers, or other sources
2. **Stock Count Correction** - Fixing discrepancy discovered during stocktake (can be positive or negative)
3. **Damaged Goods** - Writing off damaged inventory that cannot be sold
4. **Expired Stock** - Writing off inventory past its expiry/use-by date

**Process Flow:**

1. Admin goes to Admin Portal → Inventory → Select Product
2. Clicks "Adjust Stock"
3. Selects **Adjustment Type** from dropdown
4. Enters quantity:
   - **Positive number** to add stock (e.g., +100 for receiving delivery)
   - **Negative number** to reduce stock (e.g., -5 for damaged goods)
5. Enters **required notes** explaining the adjustment
6. Clicks "Save"
7. System:
   - Updates current stock level
   - Creates "Adjustment" transaction record with type and notes
   - Records admin name and timestamp for audit trail
   - Updates stock status (may trigger low stock alert or clear existing alert)

**Examples:**

**Example 1 - Receiving Stock:**
```
Scenario: Supplier ABC delivers 100 boxes of Beef Rump
Admin enters:
  - Adjustment Type: Stock Received
  - Quantity: +100
  - Notes: "Invoice #12345 from Supplier ABC, Delivery date 2025-01-15"
Result: Stock increases from 20 to 120 units
```

**Example 2 - Stock Count Correction (Negative):**
```
Scenario: Stocktake finds only 48 units, system shows 50
Admin enters:
  - Adjustment Type: Stock Count Correction
  - Quantity: -2
  - Notes: "Annual stocktake - 2 units missing from Shelf B3"
Result: Stock decreases from 50 to 48 units
```

**Example 3 - Damaged Goods:**
```
Scenario: 5 units damaged by forklift
Admin enters:
  - Adjustment Type: Damaged Goods
  - Quantity: -5
  - Notes: "Forklift accident in warehouse, units disposed"
Result: Stock decreases, inventory variance recorded for audit
```

**Business Rules:**
- All adjustments require notes (mandatory field)
- Admin name and timestamp are automatically recorded
- Transaction history cannot be deleted (permanent audit trail)
- Adjustments are immediately reflected in available stock
- Low stock alerts may be triggered or cleared based on new stock level

### **9.4 Low Stock Alerts**

**How Alerts Work:**

1. **Threshold Set:** Each product has low stock threshold (e.g., 10 units)
2. **Monitoring:** System continuously checks stock levels
3. **Alert Triggered:** When stock falls to or below threshold
4. **Notification:** Email sent to warehouse manager and admin
5. **Alert Contents:**
   - Product name and SKU
   - Current stock level
   - Low stock threshold
   - Suggested reorder quantity (optional)

**Alert Frequency:**
- First alert: Immediate when threshold reached
- Follow-up alerts: Batched hourly digest (avoids spam)
- Alert clears: When stock is replenished above threshold

**Dashboard Indicator:**
- Admin dashboard shows count of low-stock products
- Click to see full list
- Products color-coded: 🟡 Low, 🔴 Out of Stock

---

## **10. ACCOUNTING INTEGRATION**

### **10.1 Xero Integration Overview**

**What is Xero:**
- Cloud-based accounting software widely used in Australia
- Handles invoicing, payments, GST reporting, financial reports

**Why Integration Matters:**
- **Eliminates double entry:** Orders from ERP automatically become invoices in Xero
- **Reduces errors:** No manual invoice creation
- **Saves time:** Automatic sync when orders are delivered
- **Accurate accounting:** Order totals, GST, customer details sync perfectly

**What Gets Synced to Xero:**

1. **Customers** → Xero Contacts (when credit is approved)
2. **Delivered Orders** → Xero Invoices (when delivery is completed)
3. **Cancelled Orders** → Xero Credit Notes (if invoice exists)

### **10.2 Customer Sync**

**When Customer is Synced to Xero:**
- **Trigger:** Admin approves credit application
- **What Happens:**
  - System creates contact in Xero with customer's business details:
    - Business name
    - Contact person name
    - Email and phone
    - Delivery address
    - ABN (Australian Business Number)
  - System stores Xero Contact ID in customer record
  - Future updates to customer details can sync to Xero

**Business Rules:**
- Customer must be approved before syncing
- If Xero sync fails, customer approval still succeeds (accounting is not critical for operations)
- Admin is notified of sync failures
- Admin can manually retry sync

### **10.3 Invoice Creation**

**When Invoices are Created:**

**❗ AUTOMATICALLY when order status changes to "Delivered"**

**The Process:**

1. **Driver marks order as Delivered** (with proof of delivery)
2. **Order status changes to "Delivered"** - this step completes immediately
3. **System queues background job:** "Create Xero Invoice for Order #[number]"
4. **Background job runs** (within seconds, does not delay delivery completion):
   - Retrieves order details: customer, items, prices, GST
   - Checks if customer exists in Xero (if not, syncs customer first)
   - Creates invoice in Xero with:
     - Customer as contact
     - Order items as line items
     - GST calculated
     - Order number as invoice reference
     - Due date calculated from payment terms
   - Stores Xero Invoice ID and Invoice Number in order record
5. **Invoice appears in Xero** for business owner to manage payments

**Example Invoice in Xero:**

```
Invoice #: INV-2025-00123
Customer: ABC Butchers Pty Ltd
Date: 2025-01-15
Due Date: 2025-02-14 (Net 30)
Reference: ORD-2025-001234

Line Items:
  Beef Rump 5kg × 10   @ $42.00 = $420.00
  Pork Loin 3kg × 5    @ $28.00 = $140.00
                        Subtotal = $560.00
                        GST 10%  = $56.00
                        TOTAL    = $616.00
```

**Error Handling:**

- **If invoice creation fails:**
  - Order remains "Delivered" (delivery is complete regardless)
  - Error message stored in order record
  - Admin receives email notification: "Xero sync failed for Order #[number]"
  - System automatically retries 3 times (1 minute apart)
  - If still fails, admin can manually trigger sync from order details page

**Why Automatic Background:**
- Delivery completion is critical and must not be delayed
- Accounting can be done seconds later without affecting operations
- Driver does not need to wait for Xero response
- Allows system to retry failed syncs without affecting workflow

### **10.4 Credit Notes**

**When Credit Notes are Created:**

**Trigger:** Order is cancelled AND Xero invoice already exists

**The Process:**

1. **Admin cancels order** (e.g., customer called to cancel)
2. **System changes order to "Cancelled"** and restores inventory
3. **System checks:** Does this order have a Xero Invoice ID?
4. **If YES:**
   - System queues background job: "Create Xero Credit Note for Order #[number]"
   - Background job creates credit note in Xero:
     - Same customer
     - Same line items
     - Same amounts (full credit)
     - Reference: "Credit for Order ORD-2025-001234 - [Reason]"
   - Stores Xero Credit Note ID in order record
   - Customer receives email with credit note details
5. **If NO:**
   - No action needed (invoice was never created)

**Example Scenario:**

```
Timeline:
Jan 15: Order placed and delivered → Xero invoice created
Jan 20: Customer calls to return entire order → Order cancelled
        → System creates credit note in Xero
        → Customer's account credited $616.00
```

**Business Rules:**
- Credit notes only created if invoice exists
- Credit notes match original invoice amounts exactly
- Cancellation reason is included in credit note reference
- Customer is notified of credit note creation

### **10.5 Xero Setup and Monitoring**

**Initial Setup (One-Time):**

1. Admin goes to Admin Portal → Company Settings → Xero Integration
2. Clicks "Connect to Xero"
3. Redirected to Xero website to authorize
4. Admin logs into Xero and approves access
5. System stores secure connection tokens
6. Admin is returned to Company Settings showing "Connected to Xero ✓"

**Monitoring Sync Status:**

**Xero Dashboard:**
- Last sync time: "Last synced: 2025-01-15 3:45 PM"
- Total customers synced: 47
- Total invoices created: 234
- Total credit notes created: 5
- Failed syncs: 2 (with error details)

**Sync Error Log:**
- Order number
- Error message (e.g., "Customer not found in Xero", "Invalid invoice data")
- Date and time
- "Retry" button for each failed sync

**Manual Actions:**
- "Sync All Pending Invoices" - Creates invoices for all delivered orders missing invoice ID
- "Sync Customer" - Manually sync individual customer to Xero
- "Retry Failed Sync" - Retry invoice/credit note creation for specific order
- "Disconnect Xero" - Remove connection (admin must reconnect later)

**Business Rules:**
- Only Admin role can connect/disconnect Xero
- Connection tokens are securely encrypted
- Tokens expire after 60 days - system auto-refreshes
- If token refresh fails, admin must reconnect manually

---

## **11. NOTIFICATIONS AND COMMUNICATIONS**

### **11.1 Email Notification Matrix**

**Complete list of when emails are sent, to whom, and why:**

#### **Customer-Facing Emails** (External Communication)

| When | Email Sent | To | Content | Priority |
|------|-----------|-----|---------|----------|
| Customer registers | "Registration Confirmation" | Customer | Welcome message, application is pending approval, expect response in 1-2 business days | High |
| Credit approved | "Credit Application Approved" | Customer | Congratulations, credit limit amount, payment terms, can now place orders | High | ✅ Implemented |
| Credit rejected | "Credit Application Update" | Customer | Application declined, reason provided, contact sales for alternatives | High | ✅ Implemented |
| Order placed | "Order Confirmation" | Customer | Order number, items, total, delivery date, "Thank you" | High |
| Order confirmed by admin | "Order Confirmed" | Customer | Order is being prepared for packing | High |
| Order ready for delivery | "Order Packed" (optional) | Customer | Order is packed and ready for dispatch | Low |
| Driver starts delivery | "Order Out for Delivery" | Customer | Driver name, "Your order is on the way" | High |
| Order delivered | "Order Delivered" | Customer | Thank you, proof of delivery image/signature, invoice will follow | High |
| Order cancelled (early) | "Order Cancelled" | Customer | Cancellation reason, inventory restored, refund if applicable | High |
| Order cancelled (late) | "Order Cancelled - Urgent" | Customer | Apology, cancellation reason, full refund, contact details | High |
| Credit note created | "Credit Note Issued" | Customer | Refund amount, credit note number, reason | High |
| **Backorder submitted** | "Backorder Submitted for Review" | Customer | Order details, which items have shortfall, expected review timeline (1-2 days) | High |
| **Backorder approved** | "Backorder Approved" | Customer | Approval confirmation, expected fulfillment date if provided | High |
| **Backorder partially approved** | "Backorder Partially Approved" | Customer | Original vs approved quantities, updated order total, admin notes | High |
| **Backorder rejected** | "Backorder Rejected" | Customer | Rejection reason, alternative actions (contact us, adjust order) | High |

#### **Internal Staff Emails** (Internal Communication)

| When | Email Sent | To | Content | Priority |
|------|-----------|-----|---------|----------|
| New customer registers | "New Customer Registration" | Admin, Sales | Customer details, review credit application | Medium |
| Order placed | "New Order Notification" | Admin, Sales | Order details, customer, total value | Medium |
| **Backorder submitted** | "New Backorder Requires Approval" | Admin, Sales | Customer name, order details, stock shortfall breakdown, link to approve | High |
| Order confirmed | "New Order for Warehouse" | Warehouse Team | Order confirmed, prepare for packing tomorrow | Medium |
| Order ready for delivery | "New Delivery Ready" | Delivery Team | Order packed and ready for driver assignment | Medium |
| Packer session timeout | "Packing Session Timeout Alert" | Warehouse Manager | Order was in packing for 30+ min without activity, reverted to confirmed | Medium |
| Low stock alert | "Low Stock Alert Digest" | Warehouse Manager, Admin | List of products below threshold, current levels, suggested reorder | Medium (hourly batch) |
| Xero sync success (optional) | "Xero Sync Complete" | Admin | Number of invoices created, timestamp | Low |
| Xero sync failure | "Xero Sync Error" | Admin | Order number, error message, manual action required | High |
| Order cancelled (packing+) | "Order Cancellation - Warehouse" | Warehouse Team | Order cancelled during packing, remove from queue | High |
| Order cancelled (out for delivery) | "Order Cancellation - Driver URGENT" | Assigned Driver | DO NOT DELIVER ORDER #[number], return to warehouse immediately | Critical | ✅ Implemented |
| Route optimization complete | "Route Optimized" | Warehouse Manager | Delivery date, number of orders, total distance, map link | Low |
| Delivery completed (optional) | "Delivery Completed Report" | Admin | Daily delivery summary, successful deliveries, issues | Low |

### **11.2 Email Timing**

**Immediate (Synchronous) - Sent during user action:**
- Order confirmation (customer places order - must receive confirmation)
- Order confirmed (admin confirms - customer needs to know)
- Order out for delivery (driver starts - customer expects notification)
- Order delivered (driver completes - proof of delivery sent)
- Order cancelled (any cancellation - customer must be informed)
- Backorder submitted (customer and admin need to know immediately)
- Backorder decision (approved/rejected/partial - customer needs prompt notification)

**Background (Asynchronous) - Sent by system job:**
- Xero sync results (happens after order completion)
- Low stock alerts (batched hourly to avoid spam)
- Route optimization complete (informational)
- Daily delivery reports (end of day summary)

**Why This Matters:**
- **Immediate emails** may delay user action by 1-2 seconds (acceptable for critical notifications)
- **Background emails** do not delay user actions (better user experience)
- **Critical operations** (like delivery completion) must not fail if email fails

### **11.3 Email Content Guidelines**

**Good Email Practices:**

1. **Clear Subject Lines:**
   - ✅ "Order Confirmation - ORD-2025-001234"
   - ❌ "Your order"

2. **Personalized:**
   - Address customer by contact name
   - Include relevant details (order number, customer name)

3. **Actionable:**
   - Include next steps if needed
   - Provide contact information for questions

4. **Professional:**
   - Joho Foods branding
   - Consistent formatting
   - Proper grammar and spelling

5. **Mobile-Friendly:**
   - Many customers read on phones
   - Large buttons for links
   - Concise content

**Email Templates Include:**
- Company logo
- Clear heading
- Order details table (items, quantities, prices)
- Call-to-action button (e.g., "View Order", "Contact Us")
- Footer with contact information
- Unsubscribe link (for marketing emails, not transactional)

---

## **12. BUSINESS RULES SUMMARY**

### **12.1 Customer Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Credit approval required** | Customer must have approved credit application to place orders | Unapproved customers see "pending approval" message, cannot checkout |
| **Credit limit enforcement** | Order total + outstanding balance cannot exceed credit limit | Orders rejected if exceeding limit, customer must contact sales |
| **Serviced suburbs only** | Delivery address must be in system's suburb list | Registration allowed but requires admin approval if suburb not found |
| **Unique email** | Each customer must have unique email address | Registration fails if email already exists |
| **ABN format** | Australian Business Number must be 11 digits | Registration fails if ABN invalid |
| **Account suspension** | Suspended accounts cannot login or place orders | Customer sees "account suspended" message |
| **Self-cancellation window** | Customers can cancel orders only in Pending status | After confirmation, must contact admin |

### **12.2 Order Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Order cutoff time** | Orders placed before cutoff (e.g., 2 PM) qualify for next-day delivery | After cutoff, delivery date is day after tomorrow |
| **Stock reservation** | Inventory reduced immediately when order placed (normal orders) OR when backorder is approved | Prevents overselling, ensures packer has stock |
| **Minimum quantities** | No minimum order quantity (unless configured) | Small orders allowed |
| **Sequential order numbers** | Order numbers auto-generated in sequence | Format: ORD-2025-001234 |
| **Price locking** | Order locks in prices at time of placement | Future price changes don't affect existing orders |
| **Status progression** | Orders must follow valid status transitions | Cannot skip statuses (e.g., pending cannot jump to delivered) |
| **Cancellation rules** | Delivered orders cannot be cancelled (use return process) | After delivery, must handle as return/refund |
| **Manager approval** | Cancelling orders in packing/delivery requires manager approval | Prevents accidental cancellations late in process |

### **12.3 Inventory Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **No negative stock** | Stock cannot go below zero | Normal orders rejected if insufficient stock; backorders submitted for approval |
| **Immediate reservation** | Stock reduced when order placed (normal orders) or when backorder approved | Real-time inventory accuracy |
| **Immediate restoration** | Stock restored when order cancelled | Cancelled stock immediately available for new orders |
| **Transaction history** | All stock changes permanently logged | Complete audit trail, cannot delete transactions |
| **Low stock threshold** | Product-specific or company default | Alerts sent when stock falls to/below threshold |
| **Manual adjustments** | Require admin role and mandatory notes | Prevents unauthorized changes, documents reasons |

### **12.4 Pricing Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Base price fallback** | If no custom price, customer sees base price | All customers see a price |
| **Custom price priority** | Customer-specific price overrides base price | Negotiated deals honored |
| **Effective date range** | Custom prices can have start and end dates | Contract pricing with automatic expiry |
| **Order price locking** | Orders lock in price at placement time | Retroactive price changes don't affect orders |
| **Audit trail** | All pricing changes logged with who/when/why | Complete pricing history |

### **12.5 Delivery Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Proof of delivery required** | Cannot mark delivered without photo or signature | Prevents delivery disputes |
| **LIFO packing sequence** | Orders packed in reverse delivery order | Last delivery goes in van first, easily accessible |
| **Route optimization** | System calculates optimal route | Minimizes distance, reduces fuel costs, faster deliveries |
| **Delivery area grouping** | Orders grouped by area (North, East, South, West) | Efficient routing, predictable schedules |
| **Driver assignment** | Only assigned driver can update order | Prevents confusion, accountability |
| **Return process** | Driver can return undeliverable orders | Handles customer unavailable, wrong address, etc. |
| **Estimated arrival times** | System calculates ETAs for each stop | Customers know when to expect delivery |

### **12.6 Xero Integration Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Invoice on delivery** | Invoice created automatically when order delivered | No manual invoice entry needed |
| **Credit note on cancellation** | Credit note created if order cancelled after invoicing | Proper accounting for cancelled orders |
| **Async processing** | Xero operations run in background | Doesn't delay delivery completion |
| **Retry logic** | Failed syncs retry 3 times automatically | Handles temporary Xero API issues |
| **Manual fallback** | Admin can manually trigger sync | If automatic sync fails, admin can fix |
| **GST compliance** | All invoices include 10% GST | Meets Australian tax requirements |

### **12.7 Backorder Rules**

| Rule | Description | Impact |
|------|-------------|--------|
| **Stock shortfall triggers backorder** | Orders exceeding available stock become backorders | Customers not rejected outright, orders submitted for review |
| **Admin approval required** | Backorders require explicit admin decision | Admin controls commitment to fulfill unavailable stock |
| **Three approval options** | Admin can approve full, approve partial, or reject | Flexibility in handling stock shortages |
| **Delayed stock reservation** | Stock NOT reduced when backorder created | Only reserved when admin approves |
| **Credit limit exclusion** | Pending backorders don't count against credit | Customer can place other orders while waiting |
| **Rejection reason required** | Admin must provide minimum 10-character explanation | Customer understands why order was rejected |
| **Partial approval recalculation** | Order totals recalculated when partial quantities approved | Accurate billing for reduced orders |
| **Automatic status progression** | Approved backorders move directly to Confirmed | No additional confirmation step needed |
| **Customer notification** | Customer receives email for every backorder decision | Transparency throughout the process |
| **Audit trail** | Admin who approved/rejected and timestamp recorded | Accountability for decisions |

---

## **APPENDIX: BUSINESS TERMS GLOSSARY**

| Term | Definition |
|------|------------|
| **ABN** | Australian Business Number - unique 11-digit identifier for Australian businesses |
| **Admin** | Internal staff member with full system access |
| **Area Tag** | Geographic designation (North, East, South, West) assigned to delivery address |
| **Backorder** | An order that cannot be immediately fulfilled due to insufficient stock, requiring admin approval |
| **Backorder Status** | Current state of a backorder: Pending Approval, Approved, Partially Approved, or Rejected |
| **Base Price** | Default price for product, applies unless overridden by custom pricing |
| **Credit Application** | Customer request for credit terms and credit limit |
| **Credit Limit** | Maximum dollar amount customer can have in outstanding orders |
| **Credit Note** | Accounting document refunding customer for cancelled order |
| **Cutoff Time** | Daily deadline for orders to qualify for next-day delivery (e.g., 2:00 PM) |
| **Custom Pricing** | Negotiated price specific to individual customer |
| **Delivery Sequence** | Numerical order in which driver visits delivery addresses (1st stop, 2nd stop, etc.) |
| **Expected Fulfillment** | Estimated date when a backorder will be fulfilled (when stock is expected to arrive) |
| **GST** | Goods and Services Tax - 10% Australian sales tax |
| **Inventory Transaction** | Record of stock change (sale, adjustment, return) |
| **Invoice** | Accounting document requesting payment for delivered order |
| **LIFO** | Last-In-First-Out - packing strategy where last delivery goes in van first |
| **Low Stock Threshold** | Quantity level triggering low stock alert |
| **Order Number** | Unique identifier for each order (format: ORD-2025-001234) |
| **Outstanding Balance** | Total value of undelivered orders counting against credit limit |
| **Packing Sequence** | Numerical order in which warehouse packs orders (reverse of delivery sequence) |
| **Partial Approval** | Admin decision to approve a backorder with reduced quantities (only available stock approved) |
| **Payment Terms** | Agreement on when customer pays invoice (COD, Net 30, etc.) |
| **POD** | Proof of Delivery - photo or signature confirming delivery |
| **Route Optimization** | Algorithm calculating most efficient delivery route |
| **SKU** | Stock Keeping Unit - unique product code |
| **Stock Adjustment** | Manual change to inventory levels by admin, used for receiving stock, correcting counts, or writing off damaged/expired goods. Categorized by type: Stock Received, Stock Count Correction, Damaged Goods, Expired Stock |
| **Stock Reservation** | Reducing inventory when order placed (not when delivered) |
| **Stock Shortfall** | The difference between requested quantity and available stock that triggers a backorder |
| **Suburb Area Mapping** | Database linking suburbs to delivery areas |
| **Suspended Account** | Customer account temporarily disabled (cannot login or order) |
| **Xero** | Cloud-based accounting software used by Joho Foods |

---

**END OF FUNCTIONAL SPECIFICATION DOCUMENT**
