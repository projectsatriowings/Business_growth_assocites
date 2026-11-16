# Business Growth Associates (BGA) Management System
## Centralized Four Role-Based Portals Platform

A centralized company management and partner growth platform built with React, Vite, Tailwind CSS, Node.js, Express, TypeScript, and Prisma ORM backed by Neon Cloud PostgreSQL.

---

### 🌐 System Architecture & Unified Workflow

The application is engineered as **one unified platform** operating across a single database and business engine, with strict role-based access control and data isolation across four distinct departments:

```
[ Public Landing Page / BGA Registration ]
                   │
                   ▼ (Status: SUBMITTED)
      [ 1. Admin Verification & Approval ]
                   │
                   ▼ (Status: ACTIVE)
    [ 2. BGA Registers Exclusive Client & Submits Enquiry ]
                   │
                   ▼
       [ 3. Admin Reviews & Approves Enquiry ]
                   │
                   ▼
     [ 4. Accounts Prepares Official Branded Quotation ]
                   │
                   ▼
      [ 5. BGA Presents to Client -> Client Accepts ]
                   │
                   ▼ (Work Order Generated: PENDING_ADVANCE)
     [ 6. Accounts Verifies Actual Bank Receipt of Advance ]
                   │
                   ▼ (Handover Trigger)
   [ 7. Technical Project Activated (READY_TO_START -> IN_PROGRESS) ]
                   │
                   ▼ (Milestones, Deliverables & QA)
     [ 8. Technical Project Marked COMPLETED ]
                   │
                   ▼
[ 9. Accounts & Admin Process Commission Payout with Bank UTR ]
```

---

### 🔑 Pre-Seeded Portal Login Credentials

All accounts are pre-seeded in Neon PostgreSQL with 1-click test fill buttons available on the login page:

| Portal | Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Portal** | `ADMIN` | `admin@bga.com` | `Admin@123` | Complete executive control, KYC approvals, service pricing, audit logs, payout approvals |
| **BGA Portal** | `BGA` | `bga@bga.com` | `Bga@123` | Exclusive client management, enquiry submissions, quotation presentation, commission earnings |
| **Secondary BGA** | `BGA` | `bga2@bga.com` | `Bga2@123` | Used for testing client ownership isolation (cannot view BGA 1 data) |
| **Accounts Portal** | `ACCOUNTS` | `accounts@bga.com` | `Accounts@123` | Official quotation preparation, version revisions, advance verification, commission calculations |
| **Technical Portal**| `TECHNICAL` | `tech@bga.com` | `Tech@123` | Engineering execution, milestones, deliverable releases, bug fixes (Financial data isolated) |

---

### 🚀 Quick Start Guide

#### 1. Start the Production Server (Serves Backend APIs & Frontend on Port 5000):
```bash
npm start
```
Open your browser at: **`http://localhost:5000`**

#### 2. Development Mode (Concurrent Vite & Server with Hot-Reload):
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```
Frontend runs at: **`http://localhost:5173`** (proxied to API port 5000).

#### 3. Run Automated E2E Test Suite:
```bash
cd server
npx tsx tests/e2e.test.ts
```

---

### 🛡️ Key Features & Business Rules Implemented

1. **Strict Client Ownership & Duplicate Blocking**:
   - Every client is exclusively owned by the introducing BGA.
   - When registering a client, normalized phone (`10 digits`) and email are checked across the entire system.
   - Duplicate attempts are blocked with a generic notice: *"Registration Conflict: A client with this mobile number or email address is already registered in the system."*
   - Never discloses the identity of the existing BGA or confidential prospect data.
   - Only authorized Admins can transfer ownership, with every transfer logged in the immutable audit trail.

2. **Quotation Workflow**:
   - BGAs request quotations; the Accounts Department prepares the official commercial quotation.
   - Includes service fees, ad budgets, discounts, GST (18%), mandatory advance percentage (e.g. 50%), payment terms, and validity.
   - High-fidelity PDF generation (`/api/resources/quotations/:id/pdf`).
   - Supports revisions with version tracking (`v1`, `v2`, `v3`) while preserving immutable history.
   - Client acceptance recording captures BGA ID, timestamp, and PO reference notes.

3. **Advance Verification & Technical Handover Trigger**:
   - Accounts must verify actual receipt in the company bank account before project execution can start.
   - Screenshots or BGA declarations are not sufficient.
   - Once advance payment is marked `VERIFIED`, the system automatically activates the `TechnicalProject` in `READY_TO_START` status, generates milestones, and alerts the Technical team.

4. **Service Classification & Commission Engine**:
   - **Digital Marketing (DM)**: Monthly recurring commission (default 15%) calculated per verified monthly fee. **Advertisement spend is strictly excluded** from the commissionable base!
   - **Website, Mobile Application, & Software Development**: Project-based commission (default 10-12%) eligible **only after project completion AND verified final payment**.
   - Admin configures commission rates and authorizes disbursements.
   - Payout records maintain bank UTR references and timestamps.

5. **Role-Based Security & Isolation**:
   - Protected routes on frontend and JWT + Server-side middleware guards on all backend endpoints.
   - Technical users are strictly restricted from viewing BGA bank details, commission calculations, or unrelated financial ledgers.
   - Audit logs recorded for logins, approvals, ownership transfers, payment verifications, and payouts.

