# 📘 Wello Back-Office - API Specifications

**Version:** 1.0  
**Last Updated:** 2024-12-15  
**API Base URL:** `https://welloresto-api-prod.onrender.com`  
**Environment:** Development/Production  
**Target:** Go Backend Developer

---

## 📑 Table of Contents

1. [Introduction](#introduction)
2. [Authentication & Security](#authentication--security)
3. [API Conventions](#api-conventions)
4. [Error Handling](#error-handling)
5. [Authentication Module](#1-authentication-module)
6. [Orders Module](#2-orders-module)
7. [Customers Module](#3-customers-module)
8. [Stocks & Inventory Module](#4-stocks--inventory-module)
9. [Menu Management Module](#5-menu-management-module)
10. [Financial Reports Module](#6-financial-reports-module)
11. [Integrations Module (Stripe)](#7-integrations-module-stripe)
12. [Settings & Configuration Module](#8-settings--configuration-module)
13. [Users & Team Module](#9-users--team-module)
14. [Cash Registers Module](#10-cash-registers-module)
15. [VAT & Accounting Module](#11-vat--accounting-module)
16. [Promotions Module](#12-promotions-module)
17. [Online Orders Module](#13-online-orders-module)
18. [Real-Time Events (WebSockets)](#real-time-events-websockets)
19. [Rate Limiting & Performance](#rate-limiting--performance)
20. [Appendix](#appendix)

---

## Introduction

This document provides a comprehensive specification of all API endpoints used by the Wello Back-Office application. The application communicates with a Go-based backend that manages restaurant operations including orders, inventory, customers, payments, and analytics.

**Key Characteristics:**
- **Architecture:** RESTful API with optional WebSocket support for real-time updates
- **Authentication:** Bearer token-based JWT
- **Response Format:** Standardized JSON
- **Environment Configuration:** Controlled via VITE_* variables
- **Development Mode:** All endpoints are mocked for development consistency

---

## Authentication & Security

### 1. Authentication Header

All endpoints except `/auth/login` require the Authorization header:

```http
Authorization: Bearer <token>
```

The token is obtained from the login endpoint and stored client-side. Each merchant account has a unique token.

### 2. Response Header - Merchant Context

Some endpoints require the merchant context header:

```http
X-Merchant-Id: <merchant_id>
```

This header identifies which merchant's data should be accessed in multi-tenant scenarios.

### 3. Token Types

| Token Type | Used For | Expiry | Refresh |
|-----------|---------|--------|---------|
| **Access Token** | API requests | ~1 hour | Via refresh endpoint |
| **Merchant Token** | Switching merchants | Session | Obtained at login |
| **MFA Token** | OTP verification | 15 minutes | Automatic after SMS/Email |

### 4. Security Considerations

- **HTTPS Only:** All API calls must use HTTPS
- **CORS:** Front-end domain must be whitelisted
- **Rate Limiting:** 100 requests/minute per merchant
- **IP Whitelisting:** Optional for production environments
- **Sensitive Data:** PII, payment tokens, and credentials are encrypted in transit and at rest

---

## API Conventions

### Request Format

All requests follow standard HTTP conventions:

```http
METHOD /endpoint/path?param1=value1&param2=value2 HTTP/1.1
Host: welloresto-api-prod.onrender.com
Authorization: Bearer token
Content-Type: application/json

{
  "key1": "value1",
  "key2": "value2"
}
```

### Response Format

Every API response follows a standardized wrapper:

```typescript
interface APIResponse<T> {
  id: string;                    // Unique operation ID (e.g., "auth.login")
  data: T;                       // Actual response payload
  timestamp?: string;            // ISO 8601 timestamp
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **200** | OK | Successful GET/POST/PUT/PATCH |
| **201** | Created | Successful POST creating new resource |
| **204** | No Content | Successful DELETE or empty response |
| **400** | Bad Request | Invalid parameters or malformed request |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | User lacks permission for resource |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Resource already exists or state conflict |
| **422** | Unprocessable Entity | Validation error on input data |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **503** | Service Unavailable | Maintenance or service down |

---

## Error Handling

### Error Response Format

When an error occurs, the API returns a structured error response:

```typescript
interface ErrorResponse {
  id: string;                    // Error operation ID (e.g., "error.validation")
  error: {
    code: string;                // Machine-readable error code
    message: string;             // Human-readable error message
    details?: Record<string, string[]>; // Field-level validation errors
    timestamp: string;            // ISO 8601 timestamp
  };
}
```

### Example Error Responses

**Validation Error (422):**
```json
{
  "id": "error.validation",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Valid email required"],
      "password": ["Minimum 8 characters required"]
    },
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

**Authentication Error (401):**
```json
{
  "id": "error.auth",
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid or expired",
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

**Business Logic Error (409):**
```json
{
  "id": "error.business_logic",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Product quantity exceeds available stock",
    "details": {
      "product_id": "prod_123",
      "requested": 50,
      "available": 30
    },
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

---

# 1. Authentication Module

## Overview

The Authentication module handles user login, merchant switching, MFA verification, and session management.

## Endpoints

### 1.1 User Login

**Endpoint:** `POST /auth/login`  
**Authentication:** None  
**Rate Limit:** 5 requests/minute per IP  
**Purpose:** Authenticate user with email and password

**Request:**
```typescript
interface LoginRequest {
  email: string;        // User email address
  password: string;     // User password (unhashed)
}
```

**Response:**
```typescript
interface LoginResponse {
  id: "auth.login";
  data: {
    userId: string;                    // User unique ID
    merchantId: string;                // Current merchant ID
    merchantName: string;              // Current merchant name
    token: string;                     // Bearer token for API requests
    user_mail: string;                 // User email
    mfa_status: "verified" | "pending"; // MFA verification status
    merchants: Array<{                 // List of merchant accounts user has access to
      merchant_id: string;
      business_name: string;
      token: string;                   // Merchant-specific token
      logo_url: string;
      Lat: number;                     // Establishment latitude
      Lng: number;                     // Establishment longitude
      Address: string;
      City: string;
      Country: string;
      ZipCode: string;
    }>;
  };
}
```

**Example cURL:**
```bash
curl -X POST https://welloresto-api-prod.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@wello.fr",
    "password": "SecurePass123"
  }'
```

**Error Cases:**
| Code | Message | Reason |
|------|---------|--------|
| 401 | Invalid credentials | Email doesn't exist or password incorrect |
| 422 | Invalid email format | Email doesn't match RFC 5322 |
| 429 | Too many login attempts | Rate limit exceeded |

---

### 1.2 Switch Merchant

**Endpoint:** `POST /auth/switch-merchant`  
**Authentication:** Bearer token  
**Purpose:** Switch current context to a different merchant

**Request:**
```typescript
interface SwitchMerchantRequest {
  merchant_id: string;    // Target merchant ID
}
```

**Response:**
```typescript
interface MerchantSwitchResponse {
  id: "auth.switch_merchant";
  data: {
    merchantId: string;
    merchantName: string;
    token: string;         // New merchant-scoped token
    logo_url: string;
    // ... other merchant details
  };
}
```

**Error Cases:**
| Code | Message | Reason |
|------|---------|--------|
| 401 | Unauthorized | Token expired or invalid |
| 403 | Forbidden | User doesn't have access to this merchant |
| 404 | Not Found | Merchant doesn't exist |

---

### 1.3 Verify MFA (SMS/Email OTP)

**Endpoint:** `POST /auth/verify-mfa`  
**Authentication:** None (uses MFA token)  
**Purpose:** Verify OTP sent via SMS or email

**Request:**
```typescript
interface VerifyMFARequest {
  mfa_token: string;      // MFA token from login response (mfa_status: pending)
  otp_code: string;       // 6-digit OTP from SMS/email
  mode: "sms" | "email";  // Verification method
}
```

**Response:**
```typescript
interface VerifyMFAResponse {
  id: "auth.verify_mfa";
  data: {
    mfa_status: "verified";
    token: string;          // Updated bearer token with MFA verified
    userId: string;
  };
}
```

**Error Cases:**
| Code | Message | Reason |
|------|---------|--------|
| 401 | Invalid OTP | Code doesn't match or expired (< 15 min) |
| 422 | Invalid OTP format | Must be 6 digits |

---

### 1.4 Resend MFA Code

**Endpoint:** `POST /auth/resend-mfa`  
**Authentication:** None (uses MFA token)  
**Purpose:** Request a new OTP to be sent

**Request:**
```typescript
interface ResendMFARequest {
  mfa_token: string;
  mode: "sms" | "email";
}
```

**Response:**
```typescript
interface ResendMFAResponse {
  id: "auth.resend_mfa";
  data: {
    message: "OTP sent to registered phone/email";
    cooldown_seconds: 60;   // Minimum wait time before next resend
  };
}
```

---

### 1.5 Logout

**Endpoint:** `POST /auth/logout`  
**Authentication:** Bearer token  
**Purpose:** Invalidate current session

**Request:**
```typescript
interface LogoutRequest {
  // Empty body
}
```

**Response:**
```typescript
interface LogoutResponse {
  id: "auth.logout";
  data: {
    message: "Logged out successfully";
  };
}
```

---

# 2. Orders Module

## Overview

The Orders module manages order creation, updates, history, and status management for in-store and delivery orders.

### Core Types

```typescript
enum OrderStatus {
  PENDING = "pending",           // Awaiting confirmation
  CONFIRMED = "confirmed",       // Kitchen preparing
  READY = "ready",               // Ready for pickup/delivery
  COMPLETED = "completed",       // Delivered or picked up
  CANCELLED = "cancelled",       // Cancelled by customer/restaurant
}

enum OrderType {
  DINE_IN = "dine_in",          // Eat on site
  TAKEAWAY = "takeaway",        // Customer pickup
  DELIVERY = "delivery",        // Delivery service
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;           // Price at time of order
  notes?: string;               // Customer special requests
  modifiers?: Array<{           // Product variants/add-ons
    id: string;
    name: string;
    price: number;
  }>;
}

interface Order {
  id: string;
  merchant_id: string;
  customer_id?: string;
  order_number: number;          // Sequential number for receipt
  order_type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  delivery_fee?: number;
  tip?: number;
  total: number;
  created_at: string;            // ISO 8601
  updated_at: string;
  completed_at?: string;
  notes?: string;
  delivery_address?: {
    street: string;
    city: string;
    zipcode: string;
    lat: number;
    lng: number;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}
```

## Endpoints

### 2.1 Get Pending Orders

**Endpoint:** `GET /orders/pending`  
**Authentication:** Required (Bearer token)  
**Purpose:** Get all orders awaiting confirmation/kitchen work

**Query Parameters:**
```typescript
interface GetPendingOrdersQuery {
  limit?: number;           // Default: 50, Max: 100
  offset?: number;          // Default: 0
  include_takeaway?: boolean; // Include takeaway orders (default: true)
  include_delivery?: boolean; // Include delivery orders (default: true)
}
```

**Response:**
```typescript
interface GetPendingOrdersResponse {
  id: "orders.get_pending";
  data: Order[];
  pagination: {
    page: 1;
    limit: 50;
    total: 12;
    hasMore: false;
  };
}
```

---

### 2.2 Get Order History

**Endpoint:** `POST /orders/history`  
**Authentication:** Required  
**Purpose:** Retrieve order history with pagination and filtering

**Request:**
```typescript
interface GetOrderHistoryRequest {
  page?: number;                      // Default: 1
  limit?: number;                     // Default: 20, Max: 100
  status?: OrderStatus[];             // Filter by status
  order_type?: OrderType[];           // Filter by type
  start_date?: string;                // ISO 8601 date
  end_date?: string;                  // ISO 8601 date
  customer_id?: string;               // Filter by customer
  search_query?: string;              // Search order number or customer name
}
```

**Response:**
```typescript
interface GetOrderHistoryResponse {
  id: "orders.get_history";
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

### 2.3 Create Order

**Endpoint:** `POST /orders/create`  
**Authentication:** Required  
**Purpose:** Create a new order

**Request:**
```typescript
interface CreateOrderRequest {
  order_type: OrderType;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ id: string; quantity: number }>;
  }>;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_address?: {
    street: string;
    city: string;
    zipcode: string;
    instructions?: string;
  };
  table_number?: number;              // Required if order_type = DINE_IN
  notes?: string;
}
```

**Response:**
```typescript
interface CreateOrderResponse {
  id: "orders.create";
  data: Order;
}
```

**Error Cases:**
| Code | Message | Reason |
|------|---------|--------|
| 422 | Invalid order type | order_type not in enum |
| 422 | Table not found | Table number doesn't exist |
| 409 | Insufficient stock | One or more items out of stock |

---

### 2.4 Update Order Status

**Endpoint:** `PATCH /orders/{order_id}/status`  
**Authentication:** Required  
**Purpose:** Update order status (by kitchen or delivery driver)

**Path Parameters:**
```typescript
interface UpdateOrderStatusParams {
  order_id: string;
}
```

**Request:**
```typescript
interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
  completed_at?: string;              // Required if status = COMPLETED
}
```

**Response:**
```typescript
interface UpdateOrderStatusResponse {
  id: "orders.update_status";
  data: Order;
}
```

---

### 2.5 Cancel Order

**Endpoint:** `DELETE /orders/{order_id}`  
**Authentication:** Required  
**Purpose:** Cancel an order

**Request:**
```typescript
interface CancelOrderRequest {
  reason?: string;                    // Cancellation reason
  refund?: boolean;                   // Process refund if paid
}
```

**Response:**
```typescript
interface CancelOrderResponse {
  id: "orders.cancel";
  data: {
    order_id: string;
    status: "cancelled";
    refund_processed: boolean;
  };
}
```

---

# 3. Customers Module

## Overview

The Customers module manages customer profiles, preferences, loyalty points, and communication preferences.

### Core Types

```typescript
interface Customer {
  id: string;
  merchant_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  gender?: "M" | "F" | "Other";
  birth_date?: string;               // ISO 8601 date
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  preferred_payment?: string;        // Card token ID or payment method ID
  addresses: Array<{
    id: string;
    type: "home" | "work" | "other";
    street: string;
    city: string;
    zipcode: string;
    default: boolean;
  }>;
  preferences: {
    marketing_email: boolean;
    marketing_sms: boolean;
    order_notifications: boolean;
  };
  created_at: string;
  updated_at: string;
}
```

## Endpoints

### 3.1 Get Customer Profile

**Endpoint:** `GET /customers/{customer_id}`  
**Authentication:** Required  
**Purpose:** Get detailed customer information

**Response:**
```typescript
interface GetCustomerResponse {
  id: "customers.get";
  data: Customer;
}
```

---

### 3.2 List All Customers

**Endpoint:** `GET /customers`  
**Authentication:** Required  
**Purpose:** Get list of all customers for merchant

**Query Parameters:**
```typescript
interface ListCustomersQuery {
  page?: number;                      // Default: 1
  limit?: number;                     // Default: 50, Max: 200
  search?: string;                    // Search by name or email
  sort_by?: "name" | "total_spent" | "created_at"; // Default: name
  sort_order?: "asc" | "desc";
}
```

**Response:**
```typescript
interface ListCustomersResponse {
  id: "customers.list";
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

### 3.3 Create Customer

**Endpoint:** `POST /customers`  
**Authentication:** Required  
**Purpose:** Register new customer

**Request:**
```typescript
interface CreateCustomerRequest {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  gender?: string;
  birth_date?: string;
  preferred_address?: {
    street: string;
    city: string;
    zipcode: string;
  };
}
```

**Response:**
```typescript
interface CreateCustomerResponse {
  id: "customers.create";
  data: Customer;
}
```

---

### 3.4 Update Customer Profile

**Endpoint:** `PUT /customers/{customer_id}`  
**Authentication:** Required  
**Purpose:** Update customer information

**Request:**
```typescript
interface UpdateCustomerRequest {
  first_name?: string;
  last_name?: string;
  gender?: string;
  birth_date?: string;
  preferences?: Partial<{
    marketing_email: boolean;
    marketing_sms: boolean;
    order_notifications: boolean;
  }>;
}
```

---

### 3.5 Add Customer Address

**Endpoint:** `POST /customers/{customer_id}/addresses`  
**Authentication:** Required  
**Purpose:** Add new delivery address to customer profile

**Request:**
```typescript
interface AddCustomerAddressRequest {
  type: "home" | "work" | "other";
  street: string;
  city: string;
  zipcode: string;
  default?: boolean;
}
```

---

### 3.6 Update Loyalty Points

**Endpoint:** `PATCH /customers/{customer_id}/loyalty`  
**Authentication:** Required  
**Purpose:** Add or deduct loyalty points

**Request:**
```typescript
interface UpdateLoyaltyRequest {
  points: number;                     // Positive or negative integer
  reason: string;                     // Reason for change (e.g., "order_reward", "manual_adjustment")
  reference_id?: string;              // Order ID or transaction ID
}
```

**Response:**
```typescript
interface UpdateLoyaltyResponse {
  id: "customers.update_loyalty";
  data: {
    customer_id: string;
    new_balance: number;
    transaction: {
      points_added: number;
      reason: string;
      created_at: string;
    };
  };
}
```

---

# 4. Stocks & Inventory Module

## Overview

The Stocks module manages product inventory, stock movements, restocking, and inventory audits.

### Core Types

```typescript
enum StockMovementType {
  PURCHASE = "purchase",             // Stock added from supplier
  SALE = "sale",                     // Stock removed by sale
  ADJUSTMENT = "adjustment",         // Manual inventory adjustment
  RETURN = "return",                 // Stock returned
  DAMAGE = "damage",                 // Stock damaged/expired
  TRANSFER = "transfer",             // Transfer between locations
}

interface StockMovement {
  id: string;
  product_id: string;
  merchant_id: string;
  type: StockMovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost?: number;
  notes?: string;
  created_by: string;                // User ID who made the movement
  created_at: string;
}

interface ProductStock {
  product_id: string;
  product_name: string;
  sku: string;
  current_quantity: number;
  unit: string;                      // "piece", "kg", "liter", etc.
  min_threshold: number;             // Alert when below this
  reorder_quantity: number;           // Suggested purchase quantity
  supplier_id?: string;
  last_restocked?: string;
  last_movement?: StockMovement;
  is_low_stock: boolean;
}
```

## Endpoints

### 4.1 Get Current Stock levels

**Endpoint:** `GET /stocks`  
**Authentication:** Required  
**Purpose:** Get inventory levels for all products

**Query Parameters:**
```typescript
interface GetStocksQuery {
  include_zero_stock?: boolean;       // Default: false
  only_low_stock?: boolean;           // Show only items below threshold
  sort_by?: "name" | "quantity" | "reorder_date";
}
```

**Response:**
```typescript
interface GetStocksResponse {
  id: "stocks.get";
  data: ProductStock[];
}
```

---

### 4.2 Get Stock Movements

**Endpoint:** `GET /stocks/movements`  
**Authentication:** Required  
**Purpose:** Get history of stock movements

**Query Parameters:**
```typescript
interface GetStockMovementsQuery {
  page?: number;
  limit?: number;
  product_id?: string;
  movement_type?: StockMovementType[];
  start_date?: string;
  end_date?: string;
  created_by?: string;
}
```

**Response:**
```typescript
interface GetStockMovementsResponse {
  id: "stocks.get_movements";
  data: StockMovement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

### 4.3 Record Stock Movement

**Endpoint:** `POST /stocks/movements`  
**Authentication:** Required  
**Purpose:** Record stock addition, removal, or adjustment

**Request:**
```typescript
interface RecordStockMovementRequest {
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost?: number;                // Cost per unit for PURCHASE movements
  notes?: string;
  reference_id?: string;             // Purchase order ID, return ID, etc.
}
```

**Response:**
```typescript
interface RecordStockMovementResponse {
  id: "stocks.record_movement";
  data: {
    movement: StockMovement;
    updated_product_stock: ProductStock;
  };
}
```

**Error Cases:**
| Code | Message | Reason |
|------|---------|--------|
| 409 | Cannot remove more stock than available | Quantity exceeds current stock |
| 422 | Invalid movement type | Type not in enum |

---

### 4.4 Perform Stock Audit

**Endpoint:** `POST /stocks/audit`  
**Authentication:** Required  
**Purpose:** Conduct physical inventory count and adjust system quantities

**Request:**
```typescript
interface PerformStockAuditRequest {
  audit_date: string;
  items: Array<{
    product_id: string;
    physical_count: number;
  }>;
  notes?: string;
}
```

**Response:**
```typescript
interface PerformStockAuditResponse {
  id: "stocks.audit";
  data: {
    audit_id: string;
    total_items: number;
    discrepancies: Array<{
      product_id: string;
      expected_quantity: number;
      physical_count: number;
      variance: number;
    }>;
  };
}
```

---

# 5. Menu Management Module

## Overview

The Menu module manages restaurant menu structure, products, categories, pricing, and product variants.

### Core Types

```typescript
interface MenuItem {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;                     // Cost for margin calculation
  sku?: string;
  image_url?: string;
  available: boolean;
  preparation_time?: number;         // Seconds
  spicy_level?: 0 | 1 | 2 | 3;      // 0=none, 3=very spicy
  allergens?: string[];              // "nuts", "dairy", "gluten", etc.
  dietary?: string[];                // "vegan", "vegetarian", "gluten-free"
  modifiers?: Array<{                // Add-ons and variants
    id: string;
    name: string;
    type: "choice" | "multiple";     // choice=select one, multiple=select many
    options: Array<{
      id: string;
      name: string;
      price_modifier: number;        // Price change
    }>;
  }>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;               // Soft delete
}

interface MenuCategory {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  position: number;                  // Sort order
  image_url?: string;
  available: boolean;
  items_count: number;
  created_at: string;
}
```

## Endpoints

### 5.1 Get Menu Structure

**Endpoint:** `GET /menu`  
**Authentication:** Not required (public menu)  
**Purpose:** Get complete menu with categories and items

**Query Parameters:**
```typescript
interface GetMenuQuery {
  merchant_id: string;               // Required for public menu
  include_unavailable?: boolean;     // Default: false
}
```

**Response:**
```typescript
interface GetMenuResponse {
  id: "menu.get";
  data: {
    categories: MenuCategory[];
    items: MenuItem[];
  };
}
```

---

### 5.2 Get Category Items

**Endpoint:** `GET /menu/categories/{category_id}/items`  
**Authentication:** Not required  
**Purpose:** Get all items in a specific category

**Response:**
```typescript
interface GetCategoryItemsResponse {
  id: "menu.get_category_items";
  data: MenuItem[];
}
```

---

### 5.3 Create Menu Item

**Endpoint:** `POST /menu/items`  
**Authentication:** Required  
**Purpose:** Add new product to menu

**Request:**
```typescript
interface CreateMenuItemRequest {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  image_url?: string;
  preparation_time?: number;
  spicy_level?: number;
  allergens?: string[];
  dietary?: string[];
  modifiers?: Array<{
    name: string;
    type: "choice" | "multiple";
    options: Array<{
      name: string;
      price_modifier: number;
    }>;
  }>;
}
```

**Response:**
```typescript
interface CreateMenuItemResponse {
  id: "menu.create_item";
  data: MenuItem;
}
```

---

### 5.4 Update Menu Item

**Endpoint:** `PUT /menu/items/{item_id}`  
**Authentication:** Required  
**Purpose:** Update product details, pricing, or availability

**Request:**
```typescript
interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  cost?: number;
  available?: boolean;
  preparation_time?: number;
  modifiers?: Array<any>;
}
```

---

### 5.5 Update Menu Item Availability

**Endpoint:** `PATCH /menu/items/{item_id}/availability`  
**Authentication:** Required  
**Purpose:** Quickly toggle item availability

**Request:**
```typescript
interface UpdateAvailabilityRequest {
  available: boolean;
}
```

---

### 5.6 Create Menu Category

**Endpoint:** `POST /menu/categories`  
**Authentication:** Required  
**Purpose:** Add new category to menu

**Request:**
```typescript
interface CreateMenuCategoryRequest {
  name: string;
  description?: string;
  image_url?: string;
}
```

---

### 5.7 Reorder Menu Categories

**Endpoint:** `POST /menu/categories/reorder`  
**Authentication:** Required  
**Purpose:** Set sort order for categories

**Request:**
```typescript
interface ReorderCategoriesRequest {
  categories: Array<{
    id: string;
    position: number;
  }>;
}
```

---

# 6. Financial Reports Module

## Overview

The Financial Reports module provides revenue analytics, transaction histories, and financial performance metrics.

## Endpoints

### 6.1 Get Revenue Report

**Endpoint:** `GET /reports/revenue`  
**Authentication:** Required  
**Purpose:** Get revenue breakdown by period, product, or payment method

**Query Parameters:**
```typescript
interface GetRevenueReportQuery {
  period: "day" | "week" | "month" | "year";
  start_date?: string;               // Required if period = "custom"
  end_date?: string;
  group_by?: "product" | "category" | "payment_method" | "none";
}
```

**Response:**
```typescript
interface GetRevenueReportResponse {
  id: "reports.revenue";
  data: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
    breakdown: Array<{
      label: string;                 // Product name, category name, or payment method
      revenue: number;
      transaction_count: number;
    }>;
  };
}
```

---

### 6.2 Get Transaction History

**Endpoint:** `GET /reports/transactions`  
**Authentication:** Required  
**Purpose:** Get detailed transaction listing

**Query Parameters:**
```typescript
interface GetTransactionHistoryQuery {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  status?: "completed" | "pending" | "failed";
}
```

---

### 6.3 Export Financial Report

**Endpoint:** `GET /reports/export`  
**Authentication:** Required  
**Purpose:** Download report as CSV or PDF

**Query Parameters:**
```typescript
interface ExportReportQuery {
  report_type: "revenue" | "transactions" | "inventory" | "payroll";
  format: "csv" | "pdf";
  period: string;
  start_date?: string;
  end_date?: string;
}
```

**Headers:**
```http
Content-Type: text/csv  // or application/pdf
Content-Disposition: attachment; filename="report_2024_12.csv"
```

---

# 7. Integrations Module (Stripe)

## Overview

The Integrations module manages third-party service integrations, particularly Stripe for payments and bank account management.

### Core Types

```typescript
interface StripeOnboarding {
  stripe_account_id?: string;
  onboarding_status: "not_started" | "pending" | "verified";
  business_verified: boolean;
  stripe_connect_url?: string;       // Onboarding link
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string;
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number_last4: string;      // Last 4 digits
  bank_name: string;
  country: string;
  currency: string;
  verified: boolean;
  default: boolean;
}

interface StripeBalance {
  available: Array<{
    amount: number;                  // Cents
    currency: string;
  }>;
  pending: Array<{
    amount: number;
    currency: string;
  }>;
}
```

## Endpoints

### 7.1 Get Stripe Onboarding Status

**Endpoint:** `GET /integrations/stripe/status`  
**Authentication:** Required  
**Purpose:** Check Stripe Connect onboarding progress

**Response:**
```typescript
interface GetStripeStatusResponse {
  id: "integrations.stripe_status";
  data: StripeOnboarding;
}
```

---

### 7.2 Get Stripe Onboarding Link

**Endpoint:** `GET /integrations/stripe/onboarding-link`  
**Authentication:** Required  
**Purpose:** Generate Stripe Connect onboarding URL

**Query Parameters:**
```typescript
interface GetOnboardingLinkQuery {
  return_url: string;                // URL to return to after onboarding
}
```

**Response:**
```typescript
interface GetOnboardingLinkResponse {
  id: "integrations.stripe_onboarding_link";
  data: {
    onboarding_url: string;
    expires_at: string;               // ISO 8601
  };
}
```

---

### 7.3 Get Bank Accounts

**Endpoint:** `GET /integrations/stripe/bank-accounts`  
**Authentication:** Required  
**Purpose:** List bank accounts linked to Stripe account

**Response:**
```typescript
interface GetBankAccountsResponse {
  id: "integrations.stripe_bank_accounts";
  data: BankAccount[];
}
```

---

### 7.4 Add Bank Account

**Endpoint:** `POST /integrations/stripe/bank-accounts`  
**Authentication:** Required  
**Purpose:** Add new bank account for payouts

**Request:**
```typescript
interface AddBankAccountRequest {
  account_holder_name: string;
  account_number: string;
  routing_number?: string;           // For US/CA accounts
  iban?: string;                     // For EU/International accounts
  country: string;
  currency: string;
}
```

**Response:**
```typescript
interface AddBankAccountResponse {
  id: "integrations.stripe_add_bank_account";
  data: BankAccount;
}
```

---

### 7.5 Get Stripe Balance

**Endpoint:** `GET /integrations/stripe/balance`  
**Authentication:** Required  
**Purpose:** Get available and pending balance

**Response:**
```typescript
interface GetStripeBalanceResponse {
  id: "integrations.stripe_balance";
  data: StripeBalance;
}
```

---

### 7.6 Initiate Payout

**Endpoint:** `POST /integrations/stripe/payout`  
**Authentication:** Required  
**Purpose:** Request manual payout to bank account

**Request:**
```typescript
interface InitiatePayoutRequest {
  amount: number;                    // Cents
  currency: string;                  // "EUR", "GBP", etc.
  bank_account_id?: string;          // Optional, uses default if not specified
}
```

**Response:**
```typescript
interface InitiatePayoutResponse {
  id: "integrations.stripe_payout";
  data: {
    payout_id: string;
    amount: number;
    status: "pending" | "in_transit" | "paid" | "failed";
    created_at: string;
  };
}
```

---

# 8. Settings & Configuration Module

## Overview

The Settings module manages establishment configuration, business hours, payment methods, and general preferences.

### Core Types

```typescript
interface EstablishmentSettings {
  merchant_id: string;
  info: {
    business_name: string;
    business_registration: string;     // SIRET, RCS, etc.
    address: string;
    city: string;
    zipcode: string;
    country: string;
    phone: string;
    email: string;
    logo_url?: string;
    cover_image_url?: string;
  };
  ordering: {
    active_on_site: boolean;           // Dine-in enabled
    active_takeaway: boolean;          // Takeaway enabled
    active_delivery: boolean;          // Delivery enabled
    online_ordering_enabled: boolean;
    delivery_radius_km?: number;
  };
  production: {
    production_lines: number;          // Number of kitchen chains
    estimated_prep_time_minutes: number;
  };
  timings: Array<{
    day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 6=Saturday
    open_time: string;                // HH:MM format
    close_time: string;
    is_closed: boolean;
  }>;
}
```

## Endpoints

### 8.1 Get Establishment Settings

**Endpoint:** `GET /settings/establishment`  
**Authentication:** Required  
**Purpose:** Get all establishment configuration

**Response:**
```typescript
interface GetSettingsResponse {
  id: "settings.get_establishment";
  data: EstablishmentSettings;
}
```

---

### 8.2 Update Establishment Info

**Endpoint:** `PUT /settings/establishment/info`  
**Authentication:** Required  
**Purpose:** Update basic business information

**Request:**
```typescript
interface UpdateEstablishmentInfoRequest {
  business_name?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}
```

---

### 8.3 Update Ordering Modes

**Endpoint:** `PATCH /settings/establishment/ordering`  
**Authentication:** Required  
**Purpose:** Configure which ordering modes are available

**Request:**
```typescript
interface UpdateOrderingModesRequest {
  active_on_site: boolean;
  active_takeaway: boolean;
  active_delivery: boolean;
  delivery_radius_km?: number;
}
```

---

### 8.4 Update Opening Hours

**Endpoint:** `PUT /settings/establishment/hours`  
**Authentication:** Required  
**Purpose:** Set restaurant opening/closing times

**Request:**
```typescript
interface UpdateOpeningHoursRequest {
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
}
```

---

# 9. Users & Team Module

## Overview

The Users module manages team member accounts, roles, permissions, and access control.

### Core Types

```typescript
enum UserRole {
  OWNER = "owner",                   // Full access
  MANAGER = "manager",               // Operational management
  CASHIER = "cashier",               // Sales transactions
  KITCHEN = "kitchen",               // Order preparation
  DELIVERY = "delivery",             // Delivery management
  STAFF = "staff",                   // General staff
}

interface TeamMember {
  id: string;
  merchant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}
```

## Endpoints

### 9.1 Get Team Members

**Endpoint:** `GET /users/team`  
**Authentication:** Required  
**Purpose:** Get list of team members

**Query Parameters:**
```typescript
interface GetTeamQuery {
  active_only?: boolean;             // Default: true
  role?: UserRole;
}
```

**Response:**
```typescript
interface GetTeamResponse {
  id: "users.get_team";
  data: TeamMember[];
}
```

---

### 9.2 Invite Team Member

**Endpoint:** `POST /users/team/invite`  
**Authentication:** Required  
**Purpose:** Send invitation to new team member

**Request:**
```typescript
interface InviteTeamMemberRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}
```

**Response:**
```typescript
interface InviteTeamMemberResponse {
  id: "users.invite_team_member";
  data: {
    invitation_sent: true;
    expires_at: string;
  };
}
```

---

### 9.3 Update Team Member Role

**Endpoint:** `PATCH /users/team/{user_id}/role`  
**Authentication:** Required  
**Purpose:** Change team member's role

**Request:**
```typescript
interface UpdateTeamMemberRoleRequest {
  role: UserRole;
}
```

---

### 9.4 Remove Team Member

**Endpoint:** `DELETE /users/team/{user_id}`  
**Authentication:** Required  
**Purpose:** Remove team member access (soft delete)

**Request:**
```typescript
interface RemoveTeamMemberRequest {
  reason?: string;
}
```

---

# 10. Cash Registers Module

## Overview

The Cash Registers module manages point-of-sale functionalities, cash drawer operations, and reconciliation.

## Endpoints

### 10.1 Get Registers

**Endpoint:** `GET /cash-registers`  
**Authentication:** Required  
**Purpose:** Get all POS registers for establishment

**Response:**
```typescript
interface GetRegistersResponse {
  id: "cash_registers.get";
  data: Array<{
    id: string;
    name: string;
    is_active: boolean;
    current_operator?: string;
    drawer_state: "open" | "closed";
  }>;
}
```

---

### 10.2 Open Cash Drawer

**Endpoint:** `POST /cash-registers/{register_id}/open`  
**Authentication:** Required  
**Purpose:** Open cash drawer and start shift

**Request:**
```typescript
interface OpenDrawerRequest {
  opening_balance: number;           // Starting cash amount
  cashier_id: string;
}
```

---

### 10.3 Close Cash Drawer

**Endpoint:** `POST /cash-registers/{register_id}/close`  
**Authentication:** Required  
**Purpose:** Close cash drawer and reconcile

**Request:**
```typescript
interface CloseDrawerRequest {
  closing_balance: number;           // Actual cash counted
  notes?: string;
}
```

**Response:**
```typescript
interface CloseDrawerResponse {
  id: "cash_registers.close_drawer";
  data: {
    drawer_id: string;
    expected_balance: number;
    actual_balance: number;
    variance: number;
    shift_summary: {
      total_sales: number;
      transactions: number;
      cash_payments: number;
    };
  };
}
```

---

# 11. VAT & Accounting Module

## Overview

The VAT module manages tax calculations, compliance reporting, and accounting entries.

## Endpoints

### 11.1 Get VAT Report

**Endpoint:** `GET /reports/vat`  
**Authentication:** Required  
**Purpose:** Generate VAT report for tax authority

**Query Parameters:**
```typescript
interface GetVATReportQuery {
  period: "monthly" | "quarterly" | "yearly";
  year: number;
  month?: number;                    // For monthly reports
  quarter?: number;                  // For quarterly reports
}
```

**Response:**
```typescript
interface GetVATReportResponse {
  id: "reports.vat";
  data: {
    report_period: string;
    total_net_sales: number;
    total_vat_collected: number;
    vat_rate: number;                // Percentage
    vat_by_rate: Array<{
      rate: number;                  // 5.5%, 20%, etc.
      net_sales: number;
      vat_amount: number;
    }>;
  };
}
```

---

### 11.2 Export VAT Declaration

**Endpoint:** `GET /reports/vat/export`  
**Authentication:** Required  
**Purpose:** Export VAT report in official format (e.g., ECDF, XML)

**Query Parameters:**
```typescript
interface ExportVATQuery {
  format: "pdf" | "csv" | "xml";
  period: string;
}
```

---

# 12. Promotions Module

## Overview

The Promotions module manages discounts, coupons, loyalty programs, and special offers.

## Endpoints

### 12.1 Create Promotion

**Endpoint:** `POST /promotions`  
**Authentication:** Required  
**Purpose:** Create new discount or promotional campaign

**Request:**
```typescript
interface CreatePromotionRequest {
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  code?: string;                     // Coupon code
  valid_from: string;                // ISO 8601
  valid_until: string;
  max_uses?: number;
  max_uses_per_customer?: number;
  minimum_order_value?: number;
  applicable_items?: string[];       // Product IDs (empty = all items)
  enabled: boolean;
}
```

---

### 12.2 Get Active Promotions

**Endpoint:** `GET /promotions`  
**Authentication:** Not required  
**Purpose:** Get current active promotions for customer view

**Query Parameters:**
```typescript
interface GetPromotionsQuery {
  merchant_id: string;
  include_expired?: boolean;         // Default: false
}
```

---

### 12.3 Validate Coupon Code

**Endpoint:** `POST /promotions/validate`  
**Authentication:** Required  
**Purpose:** Validate coupon code before applying to order

**Request:**
```typescript
interface ValidateCouponRequest {
  coupon_code: string;
  order_subtotal: number;
  customer_id?: string;
}
```

**Response:**
```typescript
interface ValidateCouponResponse {
  id: "promotions.validate_coupon";
  data: {
    is_valid: boolean;
    discount_amount: number;
    reason_invalid?: string;         // If not valid
  };
}
```

---

# 13. Online Orders Module

## Overview

The Online Orders module manages orders placed through website/app, integrating with Deliveroo, UberEats (optional).

## Endpoints

### 13.1 Get Online Orders

**Endpoint:** `GET /online-orders`  
**Auth Required:** Yes  
**Purpose:** Get orders from online platforms

**Query Parameters:**
```typescript
interface GetOnlineOrdersQuery {
  platform?: "deliveroo" | "ubereats" | "all";
  status?: OrderStatus[];
  page?: number;
  limit?: number;
}
```

---

# Real-Time Events (WebSockets)

## Overview

The application supports real-time event streaming via WebSocket for live notifications about order status changes, customer arrivals, and system alerts.

### WebSocket Connection

**Server:** `wss://welloresto-api-prod.onrender.com/ws`

**Authentication:**
```javascript
const ws = new WebSocket(
  `wss://welloresto-api-prod.onrender.com/ws?token=${bearerToken}&merchant_id=${merchantId}`
);
```

### Event Types

#### Order Status Changed
```typescript
{
  "event": "order.status_changed",
  "data": {
    "order_id": "ord_123",
    "previous_status": "pending",
    "new_status": "confirmed",
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

#### New Order Received
```typescript
{
  "event": "order.new",
  "data": {
    "order": Order,
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

#### Stock Alert
```typescript
{
  "event": "stock.low_warning",
  "data": {
    "product_id": "prod_456",
    "product_name": "Tomato Sauce",
    "current_quantity": 5,
    "threshold": 10
  }
}
```

#### Payment Received
```typescript
{
  "event": "payment.received",
  "data": {
    "order_id": "ord_123",
    "amount": 5000,
    "currency": "EUR",
    "payment_method": "card"
  }
}
```

---

# Rate Limiting & Performance

## Rate Limits

All APIs are rate limited to prevent abuse:

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| **Auth** | 5 req | 1 minute (per IP) |
| **Read** | 100 req | 1 minute |
| **Write** | 25 req | 1 minute |
| **Export** | 5 req | 1 hour |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1639584000
```

## Performance Best Practices

1. **Pagination:** Always use pagination for list endpoints (default limit: 50, max: 200)
2. **Caching:** Cache menu and settings data client-side for 1 hour
3. **Batch Operations:** Use bulk endpoints when available instead of multiple individual requests
4. **Async Operations:** Long-running exports should be requested asynchronously with webhook callbacks
5. **Compression:** Enable gzip compression for responses > 10KB

---

# Appendix

## A. Common Type Definitions

```typescript
// Pagination
interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Address
interface Address {
  street: string;
  city: string;
  zipcode: string;
  country?: string;
}

// Contact
interface Contact {
  email?: string;
  phone?: string;
  mobile?: string;
}

// Money
interface Money {
  amount: number;          // Always in cents
  currency: string;        // ISO 4217 code
}

// DateTime
type DateTime = string;    // ISO 8601 format
type Date = string;        // YYYY-MM-DD format
type Time = string;        // HH:MM format
```

## B. Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://welloresto-api-prod.onrender.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_ENABLE_MOCK_API=false

# Session
VITE_SESSION_TIMEOUT_MINUTES=60
VITE_MFA_TIMEOUT_MINUTES=15

# Features
VITE_ENABLE_ONLINE_ORDERS=true
VITE_ENABLE_DELIVEROO=true
VITE_ENABLE_UBEREATS=false
```

## C. HTTP Status Code Summary

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Success with no data |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business logic conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server error |

## D. Merchant API Context

**Multi-Tenant Architecture:**

Each merchant operates independently with isolated data. The merchant context is determined by:

1. **Login Token:** Contains merchant_id
2. **X-Merchant-Id Header:** Optional override (with proper permissions)
3. **Merchant Switch:** Change active merchant via `/auth/switch-merchant`

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-15 | Initial comprehensive specification |

---

**Document Prepared For:** Go Backend Development Team  
**Frontend Application:** Wello Back-Office React UI  
**Last Reviewed:** December 15, 2024  
**Next Review:** March 15, 2025
