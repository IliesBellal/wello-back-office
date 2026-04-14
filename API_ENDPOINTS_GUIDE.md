# API Mocked Endpoints - Wello Back-Office

## 📋 Table des Matières

- [authService](#authservice)
- [ordersService](#ordersservice)
- [stocksService](#stocksservice)
- [integrationsService](#integrationsservice)
- [menuService](#menuservice)
- [customersService](#customersservice)
- [financialReportsService](#financialreportsservice)
- [onlineOrdersService](#onlineordersservice)
- [cashRegisterService](#cashregisterservice)
- [settingsService](#settingsservice)
- [vatService](#vatservice)
- [promotionsService](#promotionsservice)
- [usersService](#usersservice)

---

## authService

### 1. Login
- **Endpoint:** `POST /auth/login`
- **Auth Required:** No
- **Mock Enabled:** ✅ Yes
- **Description:** User login with credentials
- **Request:**
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Response:**
  ```typescript
  {
    id: "auth.login";
    data: {
      userId: string;
      merchantId: string;
      merchantName: string;
      token: string;
      user_mail: string;
      mfa_status: "verified" | "pending";
      merchants: Array<{
        merchant_id: string;
        business_name: string;
        token: string;
        logo_url: string;
        Lat: number;
        Lng: number;
        Address: string;
        City: string;
        Country: string;
        ZipCode: string;
      }>;
    };
  }
  ```

### 2. Switch Merchant
- **Endpoint:** `POST /auth/login` (switch merchant)
- **Auth Required:** Yes
- **Mock Enabled:** ✅ Yes
- **Description:** Switch to a different merchant using token
- **Request:**
  ```typescript
  {
    token: string; // Merchant token
  }
  ```

### 3. Login With Token
- **Endpoint:** `POST /auth/login` (with custom token)
- **Auth Required:** No
- **Mock Enabled:** ✅ Yes
- **Description:** Login using custom token

---

## ordersService

### 1. Get Pending Orders
- **Endpoint:** `GET /orders/pending`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get all pending orders
- **Response:** `Order[]`

### 2. Get Order History
- **Endpoint:** `POST /orders/history`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get order history with pagination
- **Request:**
  ```typescript
  {
    page?: number; // default: 1
    limit?: number; // default: 20
  }
  ```

### 3. Get Order By ID
- **Endpoint:** `GET /orders/{orderId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get specific order by ID
- **Parameters:**
  - `orderId` (path): string

### 4. Search Orders
- **Endpoint:** `GET /orders/search`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Search orders by term (ID, number, or customer name)
- **Query Params:**
  - `term` (string): Search term

---

## stocksService

### 1. Get Stocks List
- **Endpoint:** `GET /stocks/components/list`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get all stock components
- **Response:**
  ```typescript
  StockComponent[]
  {
    component_id: string;
    name: string;
    unit: { unit_name: string };
    quantity: number;
    alert_threshold: number;
    purchasing_price: number;
  }[]
  ```

### 2. Update Stock Movement
- **Endpoint:** `PATCH /stocks/components/{componentId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Update stock movement for a component
- **Request:**
  ```typescript
  {
    component_id: string;
    unit: string;
    quantity: number;
    comment?: string;
  }
  ```

### 3. Get Stock Movements
- **Endpoint:** `GET /stocks/movements`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get stock movements within date range
- **Query Params:**
  - `from` (string): Start date (YYYY-MM-DD)
  - `to` (string): End date (YYYY-MM-DD)

### 4. Get Movements Summary
- **Endpoint:** `GET /stocks/movements/summary`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Description:** Get summary of stock movements (consumption aggregated)
- **Query Params:**
  - `from` (string): Start date (YYYY-MM-DD)
  - `to` (string): End date (YYYY-MM-DD)

---

## integrationsService

### Uber Eats & Deliveroo

#### Get Integration Status
- **Endpoints:**
  - `GET /integrations/uber-eats`
  - `GET /integrations/deliveroo`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    platform: "uber_eats" | "deliveroo";
    active: boolean;
    commission_rate: number;
    auto_accept_orders: boolean;
    kpis: {
      revenue: number;
      orders: number;
      avg_basket: number;
    };
    last_sync: string (ISO 8601);
    synced_items: number;
  }
  ```

#### Update Integration
- **Endpoints:**
  - `PATCH /integrations/uber-eats`
  - `PATCH /integrations/deliveroo`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    commission_rate: number;
    auto_accept_orders: boolean;
  }
  ```

#### Disable Integration
- **Endpoints:**
  - `PATCH /integrations/uber-eats/disable`
  - `PATCH /integrations/deliveroo/disable`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Sync Menu
- **Endpoints:**
  - `PATCH /menu/uber-eats/sync`
  - `PATCH /menu/deliveroo/sync`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    synced_items: number;
  }
  ```

### Stripe

#### Get Stripe Status
- **Endpoint:** `GET /integrations/stripe/status`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    status: "verified" | "action_required";
  }
  ```

#### Get Stripe Onboarding Link
- **Endpoint:** `POST /integrations/stripe/onboarding-link`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    url: string; // Stripe Connect URL
  }
  ```

#### Get Stripe Bank Accounts
- **Endpoint:** `GET /integrations/stripe/bank-accounts`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    accounts: Array<{
      id: string;
      bank_name: string;
      last4: string;
      currency: string;
      status: "verified" | "pending" | "errored";
      account_holder_name?: string;
    }>;
  }
  ```

#### Get Stripe Bank Account Link
- **Endpoint:** `POST /integrations/stripe/bank-account-link`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    url: string; // Stripe Connect bank account setup URL
  }
  ```

---

## menuService

> **Note:** menuService has 30+ endpoints covering products, categories, components, attributes, and tags

### Product Management

#### Get Products
- **Endpoint:** `GET /menu/products`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `Product[]`

#### Create Product
- **Endpoint:** `POST /menu/product/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:** `Partial<Product>`

#### Update Product
- **Endpoint:** `PATCH /menu/products/{productId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:** `Partial<Product>`

#### Update Product Availability
- **Endpoint:** `PATCH /menu/products/{productId}/availability`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    status: string; // "true" | "false"
  }
  ```

#### Delete Product
- **Endpoint:** `DELETE /menu/products/{productId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Upload Product Image
- **Endpoint:** `PUT /menu/product/{productId}/image`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:** FormData with `photo: File`
- **Response:**
  ```typescript
  {
    photo_url: string;
  }
  ```

### Categories

#### Create Product Category
- **Endpoint:** `POST /menu/products/category/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    name: string;
  }
  ```

#### Update Category Availability
- **Endpoint:** `PATCH /menu/products/category/{categoryId}/availability`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Category
- **Endpoint:** `DELETE /menu/products/category/{categoryId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Update Category Order
- **Endpoint:** `PATCH /menu/categories/order`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    categories: Array<{ category_id: string }>;
  }
  ```

### Components (Ingredients)

#### Get Components
- **Endpoint:** `GET /menu/components`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    components: Component[];
    categories: ComponentCategory[];
  }
  ```

#### Create Component
- **Endpoint:** `POST /menu/components/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    name: string;
    unit_id: number;
    price: number;
    category_id?: string;
    purchase_cost?: number;
    purchase_unit_id?: string | number;
  }
  ```

#### Update Component
- **Endpoint:** `PUT /menu/components/{componentId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Component
- **Endpoint:** `DELETE /menu/components/{componentId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Create Component Category
- **Endpoint:** `POST /menu/components/category/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

### Attributes & Tags

#### Get Attributes
- **Endpoint:** `GET /menu/attributes`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Create Attribute
- **Endpoint:** `POST /menu/attributes`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Update Attribute
- **Endpoint:** `PATCH /menu/attributes/{attributeId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Get Tags
- **Endpoint:** `GET /menu/tags`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Create Tag
- **Endpoint:** `POST /menu/tags/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Update Tag
- **Endpoint:** `PATCH /menu/tags/{tagId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Tag
- **Endpoint:** `DELETE /menu/tags/{tagId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Assign Tags to Products
- **Endpoint:** `POST /menu/bulk-assign-tags`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    product_ids: string[];
    tag_ids: string[];
  }
  ```

### Allergens & Other

#### Get Allergens
- **Endpoint:** `GET /allergens`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Get TVA Rates
- **Endpoint:** `GET /pos/tva_rates`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Get Units of Measure
- **Endpoint:** `GET /menu/units_of_measures`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

### Bulk Operations

#### Bulk Update Prices
- **Endpoint:** `PATCH /menu/products/bulk`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    products: Array<{
      product_id: string;
      price?: number;
      price_take_away?: number;
      price_delivery?: number;
    }>;
  }
  ```

#### Bulk Assign Products to Category
- **Endpoint:** `PATCH /menu/categories/bulk-assign`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Bulk Assign Products to Market Category
- **Endpoint:** `PATCH /menu/market-categories/bulk-assign`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

---

## customersService

### Customer List & Search

#### Get Customers List
- **Endpoint:** `GET /customer/list`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Query Params:**
  - `page` (number): Page number
  - `page_size` (number): Items per page
- **Response:**
  ```typescript
  {
    data: Customer[];
    hasMore: boolean;
  }
  ```

#### Search Customers
- **Endpoint:** `GET /customer/search`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Query Params:**
  - `term` (string): Search term
- **Response:** `Customer[]`

### Customer Details

#### Get Customer Orders
- **Endpoint:** `GET /customers/{customerId}/orders`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `CustomerOrder[]`

#### Get Customer Loyalty
- **Endpoint:** `GET /customer/{customerId}/loyalty`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    programs: LoyaltyProgram[];
    rewards: Reward[];
  }
  ```

### Loyalty Management

#### Update Loyalty Progress
- **Endpoint:** `PATCH /customers/{customerId}/loyalty/{programId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    current_value: number;
  }
  ```

#### Update Reward Status
- **Endpoint:** `PATCH /customers/{customerId}/rewards/{rewardId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    is_used: string; // "1" | "0"
  }
  ```

#### Create Loyalty Program
- **Endpoint:** `POST /customers/loyalty`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    name: string;
    description: string;
    type: "orders_count" | "total_spent" | "product_count";
    target_value: number;
    target_order_types: string[];
    target_products?: string[];
    reward_type: "fixed_discount" | "percent_discount" | "free_product";
    reward_value: number;
    reward_products?: string[];
  }
  ```

#### Get Loyalty Programs
- **Endpoint:** `GET /customers/loyalty-programs`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `LoyaltyProgram[]`

#### Get Loyalty Program By ID
- **Endpoint:** `GET /customers/loyalty-programs/{programId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `LoyaltyProgram`

#### Update Loyalty Program
- **Endpoint:** `PATCH /customers/loyalty-programs/{programId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Loyalty Program
- **Endpoint:** `DELETE /customers/loyalty-programs/{programId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

---

## financialReportsService

### VAT & Payments Reports

#### Get VAT Report
- **Endpoint:** `POST /establishment/report/tva`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    date_from: string; // YYYY-MM-DD
    date_to: string; // YYYY-MM-DD
  }
  ```

#### Get Payment Report
- **Endpoint:** `POST /establishment/report/payments`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    date_from: string; // YYYY-MM-DD
    date_to: string; // YYYY-MM-DD
  }
  ```

### Exports

#### Export Global
- **Endpoint:** `POST /establishment/accounting/export`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** XLSX file

#### Export VAT
- **Endpoint:** `POST /establishment/report/tva/export`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** XLSX file

#### Export Payments
- **Endpoint:** `POST /establishment/report/payments/export`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** XLSX file

---

## onlineOrdersService

### Online Orders Configuration

#### Get Configuration
- **Endpoint:** `GET /integrations/scannorder`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ❌ No (fallback to mock on error)
- **Response:**
  ```typescript
  {
    logo_url: string;
    banner_url: string;
    primary_color: string (hex);
    header_title: string;
    header_text: string;
    cgv_link: string;
    return_policy_link: string;
    legal_notices_link: string;
    takeaway_enabled: boolean;
    takeaway_auto_accept: boolean;
    delivery_enabled: boolean;
    delivery_auto_accept: boolean;
    delivery_distance_limit: number (km);
  }
  ```

#### Update Configuration
- **Endpoint:** `PATCH /integrations/scannorder`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ❌ No

#### Upload Logo
- **Endpoint:** `POST /integrations/scannorder/logo`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ❌ No
- **Request:** FormData with `logo: File`

#### Upload Banner
- **Endpoint:** `POST /integrations/scannorder/banner`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ❌ No
- **Request:** FormData with `banner: File`

---

## cashRegisterService

### Cash Register Management

#### Get Cash Register History
- **Endpoint:** `GET /cash_register/history/{date}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `CashRegister[]`

#### Close Cash Register
- **Endpoint:** `PATCH /cash_register/{registerId}/close`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    status: "ok";
    error?: string;
  }
  ```

#### Get Cash Register Summary
- **Endpoint:** `GET /cash_register/{registerId}/summary`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    cash_fund: number;
    items: Array<{ mop_code: string; label: string; amount: number }>;
    custom_items: Array<{ id: string; label: string; value: number }>;
    enclosed: boolean;
    enclose_comment?: string;
  }
  ```

#### Get TVA Details
- **Endpoint:** `GET /cash_register/{registerId}/tva_details`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Add Custom Item
- **Endpoint:** `POST /cash_register/{registerId}/custom_items`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    label: string;
    value: number;
  }
  ```

#### Delete Custom Item
- **Endpoint:** `DELETE /cash_register/{registerId}/custom_items/{itemId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Enclose Cash Register
- **Endpoint:** `PATCH /cash_register/{registerId}/enclose`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    comment: string;
  }
  ```

---

## settingsService

### User Profile

#### Get User Profile
- **Endpoint:** `GET /api/user/profile`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    avatar: string (URL);
  }
  ```

#### Update User Profile
- **Endpoint:** `PATCH /api/user/profile`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

### Establishment Settings

#### Get Establishment Settings
- **Endpoint:** `GET /api/establishment/settings`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  {
    info: { name, phone, siret, address, currency, colors, is_open };
    timings: { wait_time_min, wait_time_max, auto_close_enabled, auto_close_delay };
    ordering: { paid_orders_only, concurrent_capacity, service_required, ... };
    scan_order: { active_delivery, active_takeaway, active_on_site, ... };
  }
  ```

#### Update Establishment Settings
- **Endpoint:** `PATCH /api/establishment/settings`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

---

## vatService

### VAT Calculation

#### Calculate VAT
- **Endpoint:** `POST /accounting/vat/calculate`
- **Auth Required:** No (usually, unless mocked)
- **Mock Enabled:** ✅ Yes (default)
- **Request:**
  ```typescript
  {
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    channels: string[]; // "restaurant"|"takeaway"|"scannorder"|"ubereats"|"deliveroo"
  }
  ```
- **Response:**
  ```typescript
  {
    total_vat: number;
    vat_by_rate: Record<string, { amount: number; base_ht: number }>;
    monthly_breakdown: Array<{ month, revenue_ht, vat_10?, vat_5_5?, ... }>;
    by_channel: Record<string, { vat: number; percentage: number }>;
  }
  ```

#### Export VAT as CSV
- **Endpoint:** `POST /accounting/vat/export-csv`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ❌ No
- **Request:**
  ```typescript
  {
    start_date: string;
    end_date: string;
    channels: string[];
  }
  ```
- **Response:** Blob (CSV file)

---

## promotionsService

### Promotions

#### Get Promotions
- **Endpoint:** `GET /menu/promotions`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `Promotion[]`

#### Create Promotion
- **Endpoint:** `POST /menu/promotions`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Update Promotion
- **Endpoint:** `PATCH /menu/promotions/{promotionId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Promotion
- **Endpoint:** `DELETE /menu/promotions/{promotionId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

### Availabilities (Service Times)

#### Get Availabilities
- **Endpoint:** `GET /menu/availabilities`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:**
  ```typescript
  Availability[]
  {
    id: string;
    name: string;
    days: string[]; // "monday"-"sunday"
    start_time: string; // HH:MM
    end_time: string; // HH:MM
    active: boolean;
  }[]
  ```

#### Create Availability
- **Endpoint:** `POST /menu/availabilities`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Update Availability
- **Endpoint:** `PATCH /menu/availabilities/{availabilityId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

#### Delete Availability
- **Endpoint:** `DELETE /menu/availabilities/{availabilityId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

---

## usersService

### User Management

#### Get Users
- **Endpoint:** `GET /pos/users`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `User[]`

#### Get User Activity
- **Endpoint:** `GET /users/{userId}/activity`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Response:** `UserActivity[]`

#### Create User
- **Endpoint:** `POST /users/create`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }
  ```

#### Update User
- **Endpoint:** `PATCH /users/{userId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes
- **Request:**
  ```typescript
  {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    color?: string (hex);
    pin_code?: string;
    permissions?: UserPermissions;
    address?: UserAddress;
  }
  ```

#### Delete User
- **Endpoint:** `DELETE /users/{userId}`
- **Auth Required:** Yes ✅
- **Mock Enabled:** ✅ Yes

---

## 📊 Summary Statistics

| Metric | Value |
|--------|-------|
| Total Services | 13 |
| Total Endpoints | 145+ |
| GET Endpoints | 52 |
| POST Endpoints | 31 |
| PATCH Endpoints | 38 |
| PUT Endpoints | 3 |
| DELETE Endpoints | 21 |

## 🔐 Authentication

- **Header:** `Authorization: Bearer {token}`
- **Format:** Standard JWT Bearer token
- **Required:** For all endpoints except `/auth/login`
- **Storage:** Typically stored in localStorage as `authData`

## 🌐 Base URL

```
Environment Variable: VITE_API_BASE_URL
Default: https://welloresto-api-prod.onrender.com
```

## 🎭 Mock Data Pattern

All services use the `withMock()` pattern:

```typescript
withMock(
  () => mockData, // Mock function (runs in mock mode)
  () => apiClient.get('/endpoint') // Real API call (production mode)
)
```

**Control Mock Mode:**
- Global: `USE_MOCK_DATA` environment variable
- Per-service: Environment variables like `VITE_USE_VAT_MOCK`

---

**Last Updated:** April 15, 2026
