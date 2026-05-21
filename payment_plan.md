# SoberFolk Payment System Integration Plan

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Current System Analysis](#current-system-analysis)
3. [Razorpay Integration](#razorpay-integration)
4. [Database Schema Changes](#database-schema-changes)
5. [Backend API Routes](#backend-api-routes)
6. [Frontend UI Changes](#frontend-ui-changes)
7. [Payment Flow](#payment-flow)
8. [Driver Wallet System](#driver-wallet-system)
9. [Withdrawal Request System](#withdrawal-request-system)
10. [Error Handling & Edge Cases](#error-handling--edge-cases)
11. [Security Considerations](#security-considerations)
12. [Implementation Phases](#implementation-phases)

---

## System Overview

### Goal

Integrate Razorpay payment gateway into SoberFolk to enable:

- Consumer payment after ride completion (drop OTP verified)
- Driver wallet system with 20% platform commission deduction
- Driver withdrawal request management

### Payment Flow Summary

```
Drop OTP Verified → Pay Now Button → Razorpay Checkout → Payment Success/Failure
                                                              ↓
                                           Success: Add to Driver Wallet (80%)
                                           Failure: Retry Payment
```

### Commission Structure

- **Platform Commission**: 20% of ride fare
- **Driver Earnings**: 80% of ride fare

---

## Current System Analysis

### Existing Ride Flow

1. Consumer requests ride → Driver accepts
2. Driver arrives → Consumer verifies **Pickup OTP**
3. Ride starts (status: `in_progress`)
4. Driver arrives at drop → Driver verifies **Drop OTP**
5. Ride completes (status: `completed`) ← **Payment triggers here**

### Current Fare Calculation

```javascript
// config/constants.js
const BASE_FARE = 50; // ₹50 base fare
const PER_KM_RATE = 10; // ₹10 per km

// utils/distance.js
function calculateFare(distanceKm) {
  return BASE_FARE + distanceKm * PER_KM_RATE;
}
```

### Key Files to Modify

| Area                | Files                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Backend Controllers | `controllers/rideController.js`, NEW: `controllers/paymentController.js`, `controllers/walletController.js` |
| Backend Routes      | `routes/rideRoutes.js`, NEW: `routes/paymentRoutes.js`, `routes/walletRoutes.js`                            |
| Frontend - Consumer | `src/components/ConsumerHome.tsx`                                                                           |
| Frontend - Driver   | `src/components/DriverScreen.tsx`                                                                           |
| Config              | `config/constants.js`, `.env`                                                                               |

---

## Razorpay Integration

### React Native SDK Installation

```bash
npm install react-native-razorpay
```

### Android Configuration

#### 1. android/app/build.gradle

```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.razorpay:checkout:1.6.33'
}
```

#### 2. android/app/src/main/AndroidManifest.xml

```xml
<manifest>
    <!-- Add internet permission if not present -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application>
        <!-- Add Razorpay activity -->
        <activity
            android:name="com.razorpay.CheckoutActivity"
            android:theme="@style/Theme.AppCompat.Light.NoActionBar"
            android:exported="true" />
    </application>
</manifest>
```

### Razorpay Checkout Options

```typescript
// Payment options configuration
const razorpayOptions = {
  description: "SoberFolk Ride Payment",
  image: "https://your-logo-url.png", // App logo
  currency: "INR",
  key: "rzp_test_XXXXXXXXXXXX", // Test API Key
  amount: rideAmount * 100, // Amount in paise (₹100 = 10000 paise)
  name: "SoberFolk",
  order_id: orderIdFromBackend, // Generated from backend
  prefill: {
    email: consumer.email || "",
    contact: consumer.phone,
    name: consumer.fullName,
  },
  theme: { color: "#667eea" }, // App theme color
  retry: {
    enabled: true,
    max_count: 3, // Allow 3 retry attempts
  },
  send_sms_hash: true,
  remember_customer: true,
  // Payment methods to show
  config: {
    display: {
      blocks: {
        utib: {
          // Show all payment methods
          name: "Pay using",
          instruments: [
            { method: "upi" },
            { method: "card" },
            { method: "netbanking" },
            { method: "wallet" },
          ],
        },
      },
      sequence: ["block.utib"],
      preferences: {
        show_default_blocks: true,
      },
    },
  },
};
```

### Payment Response Handling

```typescript
// Success Response
{
  razorpay_payment_id: "pay_XXXXXXXXXXXXX",
  razorpay_order_id: "order_XXXXXXXXXXXXX",
  razorpay_signature: "XXXXXXXXXXXXX"
}

// Failure Response (caught in catch block)
{
  code: 0, // Error code
  description: "Payment cancelled by user" // Error message
}
```

---

## Database Schema Changes

> **Migration File Created:** `migrations/001_add_payment_tables.sql`
>
> This schema follows your existing PostgreSQL conventions (sequences, naming, timestamp formats).

### New ENUM Types

```sql
CREATE TYPE payment_status_type AS ENUM ('pending', 'processing', 'success', 'failed', 'refunded');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit', 'withdrawal_request', 'withdrawal_processed', 'withdrawal_rejected');
CREATE TYPE withdrawal_status_type AS ENUM ('pending', 'processing', 'completed', 'rejected');
CREATE TYPE ride_payment_status AS ENUM ('pending', 'paid', 'failed');
```

### New Sequences

```sql
CREATE SEQUENCE IF NOT EXISTS payments_id_seq;
CREATE SEQUENCE IF NOT EXISTS driver_wallets_id_seq;
CREATE SEQUENCE IF NOT EXISTS wallet_transactions_id_seq;
CREATE SEQUENCE IF NOT EXISTS withdrawal_requests_id_seq;
```

### New Tables

#### 1. payments

```sql
CREATE TABLE payments (
    id                  integer             NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
    ride_id             integer             NOT NULL,
    consumer_id         integer             NOT NULL,
    driver_id           integer             NOT NULL,
    razorpay_order_id   varchar(100),
    razorpay_payment_id varchar(100),
    razorpay_signature  varchar(255),
    total_amount        integer             NOT NULL,  -- in paise (₹1 = 100 paise)
    platform_fee        integer             NOT NULL,  -- 20% commission in paise
    driver_amount       integer             NOT NULL,  -- 80% driver share in paise
    status              payment_status_type NOT NULL DEFAULT 'pending'::payment_status_type,
    payment_method      varchar(50),        -- upi, card, netbanking, wallet
    failure_reason      text,
    retry_count         integer             NOT NULL DEFAULT 0,
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at        timestamp without time zone
);
```

#### 2. driver_wallets

```sql
CREATE TABLE driver_wallets (
    id                  integer             NOT NULL DEFAULT nextval('driver_wallets_id_seq'::regclass),
    driver_id           integer             NOT NULL,
    balance             integer             NOT NULL DEFAULT 0,      -- in paise
    total_earnings      integer             NOT NULL DEFAULT 0,      -- in paise
    total_withdrawn     integer             NOT NULL DEFAULT 0,      -- in paise
    pending_withdrawal  integer             NOT NULL DEFAULT 0,      -- in paise
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. wallet_transactions

```sql
CREATE TABLE wallet_transactions (
    id                  integer             NOT NULL DEFAULT nextval('wallet_transactions_id_seq'::regclass),
    wallet_id           integer             NOT NULL,
    driver_id           integer             NOT NULL,
    type                transaction_type    NOT NULL,
    amount              integer             NOT NULL,  -- in paise
    reference_type      varchar(20),        -- 'payment' or 'withdrawal'
    reference_id        integer,            -- payment_id or withdrawal_request_id
    ride_id             integer,            -- link to ride for earnings
    balance_before      integer             NOT NULL,
    balance_after       integer             NOT NULL,
    description         text,
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. withdrawal_requests

```sql
CREATE TABLE withdrawal_requests (
    id                      integer                 NOT NULL DEFAULT nextval('withdrawal_requests_id_seq'::regclass),
    driver_id               integer                 NOT NULL,
    wallet_id               integer                 NOT NULL,
    amount                  integer                 NOT NULL,  -- in paise
    bank_account_holder     varchar(100),
    bank_account_number     varchar(20),
    bank_ifsc_code          varchar(11),
    upi_id                  varchar(100),
    status                  withdrawal_status_type  NOT NULL DEFAULT 'pending'::withdrawal_status_type,
    admin_notes             text,
    processed_by            integer,
    created_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at            timestamp without time zone
);
```

### Modify Existing Tables

#### rides table - Add payment_status column

```sql
ALTER TABLE rides
ADD COLUMN payment_status ride_payment_status NOT NULL DEFAULT 'pending'::ride_payment_status;

CREATE INDEX idx_rides_payment_status ON public.rides USING btree (payment_status);
```

### Constraints & Indexes Summary

| Table               | Primary Key | Unique                     | Foreign Keys                                                     |
| ------------------- | ----------- | -------------------------- | ---------------------------------------------------------------- |
| payments            | id          | razorpay_order_id, ride_id | ride_id → rides, consumer_id → consumers, driver_id → drivers    |
| driver_wallets      | id          | driver_id                  | driver_id → drivers                                              |
| wallet_transactions | id          | -                          | wallet_id → driver_wallets, driver_id → drivers, ride_id → rides |
| withdrawal_requests | id          | -                          | driver_id → drivers, wallet_id → driver_wallets                  |

---

## Backend API Routes

### Payment Routes (`routes/paymentRoutes.js`)

| Method | Endpoint                      | Description                  | Auth     |
| ------ | ----------------------------- | ---------------------------- | -------- |
| POST   | `/api/payments/create-order`  | Create Razorpay order        | Consumer |
| POST   | `/api/payments/verify`        | Verify payment signature     | Consumer |
| GET    | `/api/payments/ride/:rideId`  | Get payment details for ride | Both     |
| POST   | `/api/payments/retry/:rideId` | Retry failed payment         | Consumer |

### Wallet Routes (`routes/walletRoutes.js`)

| Method | Endpoint                   | Description                  | Auth   |
| ------ | -------------------------- | ---------------------------- | ------ |
| GET    | `/api/wallet`              | Get wallet balance & details | Driver |
| GET    | `/api/wallet/transactions` | Get transaction history      | Driver |
| POST   | `/api/wallet/withdraw`     | Create withdrawal request    | Driver |
| GET    | `/api/wallet/withdrawals`  | Get withdrawal history       | Driver |

### API Request/Response Schemas

#### POST /api/payments/create-order

```typescript
// Request
{
  rideId: number
}

// Response - Success
{
  success: true,
  order: {
    id: "order_XXXXXXXXX",
    amount: 15000, // in paise
    currency: "INR",
    receipt: "ride_123"
  },
  rideDetails: {
    fare: 150,
    distance: "10.0 km",
    pickup: "Address 1",
    drop: "Address 2"
  }
}

// Response - Error
{
  success: false,
  error: "Payment already completed for this ride"
}
```

#### POST /api/payments/verify

```typescript
// Request
{
  rideId: number,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
}

// Response - Success
{
  success: true,
  message: "Payment verified successfully",
  payment: {
    id: 1,
    amount: 150,
    driverAmount: 120,
    platformFee: 30
  }
}

// Response - Failure
{
  success: false,
  error: "Payment verification failed",
  retryAllowed: true
}
```

#### GET /api/wallet

```typescript
// Response
{
  success: true,
  wallet: {
    balance: 12000, // in paise (₹120)
    totalEarnings: 50000,
    totalWithdrawn: 38000,
    pendingWithdrawal: 0
  }
}
```

#### POST /api/wallet/withdraw

```typescript
// Request
{
  amount: 10000, // in paise (₹100)
  upiId: "driver@upi" // or bank details
}

// Response
{
  success: true,
  message: "Withdrawal request submitted",
  request: {
    id: 1,
    amount: 10000,
    status: "pending",
    estimatedProcessingTime: "2-3 business days"
  }
}
```

---

## Frontend UI Changes

### Consumer Home - Payment Screen

#### New State Variables

```typescript
// Payment states
const [showPaymentScreen, setShowPaymentScreen] = useState(false);
const [paymentLoading, setPaymentLoading] = useState(false);
const [paymentStatus, setPaymentStatus] = useState<
  "pending" | "processing" | "success" | "failed"
>("pending");
const [paymentError, setPaymentError] = useState<string>("");
```

#### UI Flow After Drop OTP Verified

```
┌─────────────────────────────────────────────────┐
│              RIDE COMPLETED! 🎉                 │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Trip Summary                           │    │
│  │  ─────────────────────────────────────  │    │
│  │  Distance:     10.5 km                  │    │
│  │  Duration:     25 mins                  │    │
│  │  Base Fare:    ₹50                      │    │
│  │  Distance:     ₹105                     │    │
│  │  ─────────────────────────────────────  │    │
│  │  TOTAL:        ₹155                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         💳 PAY NOW - ₹155              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Powered by Razorpay                            │
└─────────────────────────────────────────────────┘
```

#### Payment Success Screen

```
┌─────────────────────────────────────────────────┐
│                    ✅                           │
│           Payment Successful!                   │
│                                                 │
│  Amount Paid: ₹155                              │
│  Payment ID: pay_XXXXXXXXX                      │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           Rate Your Driver              │    │
│  │     ⭐ ⭐ ⭐ ⭐ ⭐                      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │              DONE                       │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

#### Payment Failed Screen

```
┌─────────────────────────────────────────────────┐
│                    ❌                           │
│           Payment Failed                        │
│                                                 │
│  Reason: Transaction declined by bank           │
│                                                 │
│  Don't worry! Your ride is complete.            │
│  Please try again to complete payment.          │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │           🔄 TRY AGAIN                  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         CONTACT SUPPORT                 │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Driver Screen - Wallet Tab

#### New Tab: Wallet

```
┌─────────────────────────────────────────────────┐
│  [Home] [Rides] [Wallet] [Profile]              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  💰 Wallet Balance                      │    │
│  │  ─────────────────────────────────────  │    │
│  │                                         │    │
│  │         ₹1,250.00                       │    │
│  │                                         │    │
│  │  Total Earnings: ₹15,000                │    │
│  │  Total Withdrawn: ₹13,750               │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │     💸 WITHDRAW                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Recent Transactions                            │
│  ─────────────────────────────────────────────  │
│  + ₹120.00  │ Ride #1234    │ Today, 2:30 PM   │
│  + ₹95.00   │ Ride #1233    │ Today, 11:15 AM  │
│  - ₹500.00  │ Withdrawal    │ Yesterday        │
│  + ₹150.00  │ Ride #1232    │ Yesterday        │
└─────────────────────────────────────────────────┘
```

#### Withdrawal Modal

```
┌─────────────────────────────────────────────────┐
│              💸 Withdraw Funds                  │
│                                                 │
│  Available Balance: ₹1,250.00                   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Amount to Withdraw                     │    │
│  │  ₹ [________________]                   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Minimum: ₹100  │  Maximum: ₹1,250              │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  UPI ID                                 │    │
│  │  [yourname@upi________________]         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ⚠️ Withdrawals are processed within           │
│     2-3 business days                           │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         REQUEST WITHDRAWAL              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Cancel]                                       │
└─────────────────────────────────────────────────┘
```

---

## Payment Flow

### Sequence Diagram

```
Consumer App          Backend           Razorpay        Driver Wallet
     │                   │                  │                │
     │ Drop OTP Verified │                  │                │
     │ ──────────────────>                  │                │
     │                   │                  │                │
     │  Show Pay Button  │                  │                │
     │ <──────────────────                  │                │
     │                   │                  │                │
     │ Click "Pay Now"   │                  │                │
     │ ──────────────────>                  │                │
     │                   │                  │                │
     │                   │ Create Order     │                │
     │                   │ ────────────────>│                │
     │                   │                  │                │
     │                   │ Order Created    │                │
     │                   │ <────────────────│                │
     │                   │                  │                │
     │  Open Razorpay    │                  │                │
     │ <──────────────────                  │                │
     │                   │                  │                │
     │                   │                  │                │
     │ ═══════════════ PAYMENT CHECKOUT ════════════════    │
     │                   │                  │                │
     │ Payment Success   │                  │                │
     │ ──────────────────>                  │                │
     │                   │                  │                │
     │                   │ Verify Signature │                │
     │                   │ ────────────────>│                │
     │                   │                  │                │
     │                   │ Signature Valid  │                │
     │                   │ <────────────────│                │
     │                   │                  │                │
     │                   │ Credit Wallet (80%)               │
     │                   │ ─────────────────────────────────>│
     │                   │                  │                │
     │ Payment Confirmed │                  │                │
     │ <──────────────────                  │                │
     │                   │                  │                │
     │ Show Success +    │                  │                │
     │ Rating Screen     │                  │                │
```

### State Machine for Ride Payment

```
                    ┌────────────────┐
                    │    pending     │
                    └───────┬────────┘
                            │
                    Click "Pay Now"
                            │
                            ▼
                    ┌────────────────┐
        ┌──────────│   processing   │──────────┐
        │          └────────────────┘          │
        │                                      │
   Payment                              Payment
   Failed                               Success
        │                                      │
        ▼                                      ▼
┌───────────────┐                    ┌────────────────┐
│    failed     │◄─── Retry ─────────│     paid       │
└───────┬───────┘     Limit          └────────────────┘
        │             Exceeded
        │
   Retry Payment
        │
        └─────────────> processing
```

---

## Driver Wallet System

### Wallet Credit Flow

```
Payment Verified
      │
      ▼
┌─────────────────────────────────────────┐
│  Calculate Amounts                      │
│  ─────────────────────────────────────  │
│  Total Fare: ₹150                       │
│  Platform Fee (20%): ₹30                │
│  Driver Amount (80%): ₹120              │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Create Wallet Transaction              │
│  ─────────────────────────────────────  │
│  Type: credit                           │
│  Amount: ₹120                           │
│  Reference: payment_id                  │
│  Balance Before: ₹1,000                 │
│  Balance After: ₹1,120                  │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Update Wallet Balance                  │
│  ─────────────────────────────────────  │
│  balance += ₹120                        │
│  total_earnings += ₹120                 │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  Emit Socket Event                      │
│  ─────────────────────────────────────  │
│  Event: wallet_credited                 │
│  Data: { amount, newBalance, rideId }   │
└─────────────────────────────────────────┘
```

### Wallet Operations

#### Create Wallet (on first payment)

```javascript
async function ensureDriverWallet(driverId) {
  // Check if wallet exists
  const existing = await db.query(
    "SELECT id FROM driver_wallets WHERE driver_id = $1",
    [driverId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new wallet
  const result = await db.query(
    `INSERT INTO driver_wallets (driver_id, balance, total_earnings, total_withdrawn)
     VALUES ($1, 0, 0, 0) RETURNING id`,
    [driverId],
  );

  return result.rows[0].id;
}
```

#### Credit Wallet

```javascript
async function creditDriverWallet(driverId, amount, paymentId, rideId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get current balance
    const wallet = await client.query(
      "SELECT id, balance FROM driver_wallets WHERE driver_id = $1 FOR UPDATE",
      [driverId],
    );

    const currentBalance = wallet.rows[0].balance;
    const newBalance = currentBalance + amount;

    // Update wallet
    await client.query(
      `UPDATE driver_wallets 
       SET balance = $1, total_earnings = total_earnings + $2, updated_at = NOW()
       WHERE driver_id = $3`,
      [newBalance, amount, driverId],
    );

    // Create transaction record
    await client.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, driver_id, type, amount, reference_type, reference_id, ride_id, balance_before, balance_after, description)
       VALUES ($1, $2, 'credit', $3, 'payment', $4, $5, $6, $7, $8)`,
      [
        wallet.rows[0].id,
        driverId,
        amount,
        paymentId,
        rideId,
        currentBalance,
        newBalance,
        `Earnings from ride #${rideId}`,
      ],
    );

    await client.query("COMMIT");

    return { success: true, newBalance };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Withdrawal Request System

### Withdrawal Flow

```
Driver Request                    Admin Queue
      │                               │
      ▼                               │
┌─────────────────┐                   │
│ Validate Amount │                   │
│ (min ₹100,      │                   │
│  max balance)   │                   │
└────────┬────────┘                   │
         │                            │
         ▼                            │
┌─────────────────┐                   │
│ Create Request  │                   │
│ Status: pending │ ─────────────────>│
└────────┬────────┘                   │
         │                            ▼
         │                   ┌─────────────────┐
         │                   │ Admin Dashboard │
         │                   │ (Future)        │
         │                   └─────────────────┘
         ▼
┌─────────────────┐
│ Update Wallet   │
│ pending_withdrawal│
│ += amount       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Wallet   │
│ Transaction     │
│ Type: withdrawal│
│       _request  │
└─────────────────┘
```

### Withdrawal Validation Rules

```javascript
const WITHDRAWAL_RULES = {
  MIN_AMOUNT: 10000, // ₹100 in paise
  MAX_AMOUNT: 5000000, // ₹50,000 in paise (per request)
  DAILY_LIMIT: 10000000, // ₹1,00,000 per day
  COOLDOWN_HOURS: 24, // 24 hours between requests
};

async function validateWithdrawalRequest(driverId, amount) {
  // Check minimum amount
  if (amount < WITHDRAWAL_RULES.MIN_AMOUNT) {
    return { valid: false, error: "Minimum withdrawal amount is ₹100" };
  }

  // Check wallet balance
  const wallet = await getDriverWallet(driverId);
  const availableBalance = wallet.balance - wallet.pending_withdrawal;

  if (amount > availableBalance) {
    return { valid: false, error: "Insufficient balance" };
  }

  // Check for pending requests
  const pendingRequests = await db.query(
    `SELECT COUNT(*) FROM withdrawal_requests 
     WHERE driver_id = $1 AND status = 'pending'`,
    [driverId],
  );

  if (pendingRequests.rows[0].count > 0) {
    return {
      valid: false,
      error: "You already have a pending withdrawal request",
    };
  }

  return { valid: true };
}
```

### Withdrawal Request Storage (Queue)

```javascript
// For now, we simply store in database
// Future: Can use Redis queue or message queue for processing

async function createWithdrawalRequest(driverId, amount, upiId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get wallet
    const wallet = await client.query(
      "SELECT id, balance, pending_withdrawal FROM driver_wallets WHERE driver_id = $1 FOR UPDATE",
      [driverId],
    );

    const walletData = wallet.rows[0];

    // Create withdrawal request
    const request = await client.query(
      `INSERT INTO withdrawal_requests (driver_id, wallet_id, amount, upi_id, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [driverId, walletData.id, amount, upiId],
    );

    // Update pending withdrawal in wallet
    await client.query(
      `UPDATE driver_wallets 
       SET pending_withdrawal = pending_withdrawal + $1, updated_at = NOW()
       WHERE driver_id = $2`,
      [amount, driverId],
    );

    // Create transaction record
    await client.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, driver_id, type, amount, reference_type, reference_id, balance_before, balance_after, description)
       VALUES ($1, $2, 'withdrawal_request', $3, 'withdrawal', $4, $5, $5, 'Withdrawal request initiated')`,
      [walletData.id, driverId, amount, request.rows[0].id, walletData.balance],
    );

    await client.query("COMMIT");

    return {
      success: true,
      requestId: request.rows[0].id,
      message: "Withdrawal request submitted successfully",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Error Handling & Edge Cases

### Payment Failure Scenarios

| Scenario                  | Handling                                            |
| ------------------------- | --------------------------------------------------- |
| User cancels payment      | Show retry option, ride remains complete but unpaid |
| Bank declines transaction | Show error message, allow retry                     |
| Network timeout           | Store payment intent, allow retry                   |
| Razorpay server error     | Show generic error, allow retry                     |
| Duplicate payment attempt | Check existing payment, prevent duplicate           |
| Invalid signature         | Log security event, reject payment                  |

### Critical Error Handling

```javascript
// Payment retry logic
async function handlePaymentRetry(rideId, consumerId) {
  // Check if payment already completed
  const existingPayment = await db.query(
    `SELECT id, status FROM payments 
     WHERE ride_id = $1 AND status = 'success'`,
    [rideId],
  );

  if (existingPayment.rows.length > 0) {
    throw new Error("Payment already completed for this ride");
  }

  // Check retry count
  const failedPayments = await db.query(
    `SELECT COUNT(*) FROM payments 
     WHERE ride_id = $1 AND status = 'failed'`,
    [rideId],
  );

  if (failedPayments.rows[0].count >= 5) {
    // Mark ride for manual intervention
    await markRideForManualReview(rideId);
    throw new Error(
      "Maximum payment attempts exceeded. Please contact support.",
    );
  }

  // Create new order for retry
  return createPaymentOrder(rideId, consumerId);
}
```

### Wallet Transaction Safety

```javascript
// Atomic transaction with retry
async function safeWalletCredit(
  driverId,
  amount,
  paymentId,
  rideId,
  retries = 3,
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await creditDriverWallet(driverId, amount, paymentId, rideId);
    } catch (error) {
      if (attempt === retries) throw error;

      // Wait before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100));
    }
  }
}
```

### Edge Cases

#### 1. Payment Success but Wallet Credit Fails

```javascript
// Store failed credit for retry
await db.query(
  `INSERT INTO pending_wallet_credits (payment_id, driver_id, amount, status, retry_count)
   VALUES ($1, $2, $3, 'pending', 0)`,
  [paymentId, driverId, amount],
);

// Background job will retry crediting
```

#### 2. App Crashes During Payment

- Razorpay handles this via webhooks
- Backend should have webhook endpoint for payment.captured event
- Reconcile payments periodically

#### 3. Driver Has No Wallet

```javascript
// Auto-create wallet on first payment credit
const walletId = await ensureDriverWallet(driverId);
```

---

## Security Considerations

### Razorpay Signature Verification

```javascript
const crypto = require("crypto");

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}
```

### API Security

```javascript
// Ensure payment belongs to requesting user
const verifyPaymentOwnership = async (req, res, next) => {
  const { rideId } = req.params;
  const userId = req.user.id;

  const ride = await db.query("SELECT consumer_id FROM rides WHERE id = $1", [
    rideId,
  ]);

  if (ride.rows[0].consumer_id !== userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  next();
};
```

### Environment Variables

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXX

# Webhook Secret (for future webhook implementation)
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXX
```

### Data Validation

```javascript
// Validate payment amounts
function validatePaymentAmount(rideId, amount) {
  // Fetch ride and calculate expected fare
  const ride = await getRideDetails(rideId);
  const expectedFare = calculateFare(ride.distance);
  const expectedPaise = expectedFare * 100;

  // Allow 1% tolerance for rounding
  const tolerance = expectedPaise * 0.01;

  if (Math.abs(amount - expectedPaise) > tolerance) {
    throw new Error('Payment amount mismatch');
  }

  return true;
}
```

---

## Implementation Phases

### Phase 1: Database Setup (Day 1)

- [ ] Create `payments` table
- [ ] Create `driver_wallets` table
- [ ] Create `wallet_transactions` table
- [ ] Create `withdrawal_requests` table
- [ ] Modify `rides` table (add payment_status)
- [ ] Create migration script

### Phase 2: Backend - Payment (Day 2-3)

- [ ] Install Razorpay Node SDK (`npm install razorpay`)
- [ ] Create `controllers/paymentController.js`
- [ ] Create `routes/paymentRoutes.js`
- [ ] Implement create-order endpoint
- [ ] Implement verify payment endpoint
- [ ] Add payment retry logic

### Phase 3: Backend - Wallet (Day 3-4)

- [ ] Create `controllers/walletController.js`
- [ ] Create `routes/walletRoutes.js`
- [ ] Implement wallet credit on payment success
- [ ] Implement get wallet balance
- [ ] Implement transaction history
- [ ] Implement withdrawal request

### Phase 4: Frontend - Consumer (Day 4-5)

- [ ] Install `react-native-razorpay`
- [ ] Add Razorpay Android configuration
- [ ] Create PaymentScreen component
- [ ] Integrate with ConsumerHome after drop OTP
- [ ] Add payment success/failure screens
- [ ] Add payment retry flow

### Phase 5: Frontend - Driver (Day 5-6)

- [ ] Create WalletTab component
- [ ] Create TransactionList component
- [ ] Create WithdrawalModal component
- [ ] Integrate wallet into DriverScreen
- [ ] Add real-time wallet balance updates

### Phase 6: Testing & Polish (Day 6-7)

- [ ] Test complete payment flow
- [ ] Test failure scenarios
- [ ] Test wallet credits
- [ ] Test withdrawal requests
- [ ] UI polish and error messages
- [ ] Load testing

---

## File Structure After Implementation

```
SoberFolk/
├── src/
│   ├── components/
│   │   ├── ConsumerHome.tsx      # Modified - add payment flow
│   │   ├── DriverScreen.tsx      # Modified - add wallet tab
│   │   ├── PaymentScreen.tsx     # NEW
│   │   ├── PaymentSuccess.tsx    # NEW
│   │   ├── PaymentFailed.tsx     # NEW
│   │   ├── WalletTab.tsx         # NEW
│   │   ├── TransactionList.tsx   # NEW
│   │   └── WithdrawalModal.tsx   # NEW
│   └── services/
│       ├── payment.ts            # NEW - payment API calls
│       └── wallet.ts             # NEW - wallet API calls
│
├── controllers/
│   ├── paymentController.js      # NEW
│   ├── walletController.js       # NEW
│   └── rideController.js         # Modified - payment status
│
├── routes/
│   ├── paymentRoutes.js          # NEW
│   ├── walletRoutes.js           # NEW
│   └── rideRoutes.js             # Modified
│
├── utils/
│   ├── razorpay.js               # NEW - Razorpay helper functions
│   └── wallet.js                 # NEW - wallet helper functions
│
├── config/
│   └── constants.js              # Modified - add payment constants
│
├── migrations/
│   └── 001_payment_tables.sql    # NEW - database migrations
│
└── android/
    └── app/
        └── build.gradle          # Modified - add Razorpay SDK
```

---

## Summary

This payment system will:

1. **Enable secure payments** via Razorpay after ride completion
2. **Automatically credit drivers** 80% of the fare to their wallet
3. **Allow drivers to request withdrawals** (stored for future processing)
4. **Handle payment failures gracefully** with retry options
5. **Maintain complete transaction history** for audit and support

**Next Steps**: Start with Phase 1 - Database Setup once this plan is approved.
