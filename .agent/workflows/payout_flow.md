---
description: end-to-end service, payment, and provider payout cycle
---

# End-to-End Operational Workflow

Follow these steps to complete a full service cycle from booking to provider payout.

### 1. Service Booking & Acceptance
1. **Customer**: Selects a service and creates a booking.
2. **Provider**: Receives the request in "New Requests" and clicks **Accept**.
3. **Provider**: Transitions status to **On The Way** when departing.

### 2. Service Execution
1. **Customer**: Scans the Provider's QR code (if identity verification is enabled) to unlock the job.
2. **Provider**: Sets status to **In Progress** while performing the work.
3. **Provider**: Sets status to **Completed** once the job is finished.

### 3. Payment (Escrow Phase)
1. **Customer**: Navigates to "My Bookings" and clicks **Pay Now** (available for 'Accepted', 'In Progress', or 'Completed' jobs).
2. **System**: Creates a record in the `payments` table with:
   - `status`: 'Paid'
   - `payout_status`: 'Pending' (This is the Escrow state).

### 4. Withdrawal Request
1. **Provider**: Navigates to the **Payouts** section in their dashboard.
2. **Provider**: Views the "Pending Settlement" balance and clicks **Execute Withdrawal**.
3. **System**: Updates `payout_status` to **Requested**.

### 5. Admin Disbursement
1. **Admin**: Navigates to the **Payout** section in the Admin Sidebar.
2. **Admin**: Reviews the withdrawal request and clicks **Process**.
3. **System**: Updates `payout_status` to **Paid** (or 'Approved').
4. **Provider**: Funds move to "Historical Payouts" and the balance resets.
