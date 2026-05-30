# 🚀 YukSales - Sales Tracking System

<div align="center">

![YukSales Logo](apps/web/public/pwa-512.svg)

**Platform Multi-Company / Multi-Tenant untuk Sales Tracking Lapangan**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)]()
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)]()

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Business Flow](#-business-flow)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Installation](#-installation)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)

---

## 🎯 Overview

**YukSales** adalah sistem sales tracking modern yang dirancang untuk mengelola aktivitas sales lapangan secara end-to-end. Sistem ini mendukung:

- **Multi-tenant architecture** - Setiap company memiliki data terisolasi
- **GPS & Geofence validation** - Validasi lokasi check-in/out
- **Face recognition** - Verifikasi identitas sales (opsional)
- **Offline-first PWA** - Bisa bekerja tanpa koneksi internet
- **Real-time sync** - Data otomatis sinkron saat online

---

## ✨ Features

### 🏢 Company Management
- Multi-company tenant isolation
- Company profile & settings
- Custom integrations (Cloudflare R2, face recognition, payment)

### 👥 User & Access Control
- Role-based access control (RBAC)
- Custom permissions per role
- Roles: Administrator, Owner, Operational Manager, Supervisor, Admin, Sales Agent

### 📍 Outlet Management
- Outlet registration & verification
- GPS coordinates & geofence radius
- Outlet photos & documentation
- Sales-outlet assignment

### 📅 Visit Scheduling
- Daily visit planning
- Target setting (outlet count, duration, closing, revenue)
- Schedule approval workflow
- Performance tracking

### ✅ Attendance System
- GPS-based check-in/check-out
- Face capture & verification
- Attendance review & reports
- Validation: location accuracy + face detection

### 💰 Sales & Transactions
- Point of Sales (POS)
- Multiple payment methods (Cash, QRIS, Credit, Consignment)
- Invoice generation
- Stock management

### 📦 Inventory Management
- Multi-warehouse support
- Stock movement tracking
- Transfer between warehouses
- Stock adjustment & reset

### 💳 Finance
- Receivables management
- Consignment tracking
- Cash deposits
- Payment recording

### 🔄 Offline Sync
- Queue-based offline operations
- Automatic sync when online
- Conflict resolution
- Media upload queue

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Library |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **React Query** | Data Fetching |
| **React Router** | Routing |
| **Leaflet** | Maps |
| **PWA** | Progressive Web App |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Fastify** | HTTP Framework |
| **TypeScript** | Type Safety |
| **Drizzle ORM** | Database ORM |
| **PostgreSQL** | Database |
| **JWT** | Authentication |
| **Zod** | Validation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **pnpm** | Package Manager (Monorepo) |
| **Docker** | PostgreSQL Container |
| **Cloudflare R2** | Object Storage |
| **GitHub** | Version Control |

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │     React PWA  (Vite + Tailwind CSS + TypeScript)            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│  │  │ Admin   │  │ Sales   │  │ Auth    │  │ Offline Sync    │  │   │
│  │  │ Dashboard│  │ Mobile  │  │ Pages   │  │ (IndexedDB)     │  │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘  │   │
│  └───────┼────────────┼────────────┼────────────────┼───────────┘   │
│          │            │            │                │                │
└──────────┼────────────┼────────────┼────────────────┼────────────────┘
           │            │            │                │
           │     HTTPS Requests      │     Signed URL │
           │            │            │                │
┌──────────┼────────────┼────────────┼────────────────┼────────────────┐
│          │            │            │                │                │
│          ▼            ▼            ▼                │                │
│  ┌──────────────────────────────────────────────────┘                │
│  │                                                                  │
│  │                    BACKEND                                       │
│  │     Fastify API  (Node.js + TypeScript)                          │
│  │  ┌────────────────────────────────────────────────────────────┐  │
│  │  │ Modules:                                                   │  │
│  │  │  • Auth      • Users      • Outlets    • Visits            │  │
│  │  │  • Attendance • Inventory  • Sales     • Finance           │  │
│  │  │  • Media     • Sync       • Reports    • Settings          │  │
│  │  └────────────────────────────────────────────────────────────┘  │
│  │                                                                  │
│  └──────────────────┬──────────────────────────┬────────────────────┘
│                     │                          │
│                     │ SQL Queries              │ Upload Files
│                     │                          │
└─────────────────────┼──────────────────────────┼──────────────────────┘
                      │                          │
    ┌─────────────────┴─────────────────┐  ┌────┴───────────────────┐
    │                                   │  │                        │
    │         DATABASE                  │  │      STORAGE           │
    │      PostgreSQL                   │  │  Cloudflare R2         │
    │     (Drizzle ORM)                 │  │  • Photos              │
    │                                   │  │  • Face Captures       │
    │  ┌─────────────────────────────┐  │  │  • Receipt Photos      │
    │  │ Tables:                     │  │  │  • Media Files         │
    │  │  • companies    • users     │  │  └────────────────────────┘
    │  │  • outlets      • visits    │  │
    │  │  • attendance   • products  │  │
    │  │  • inventory    • sales     │  │
    │  │  • receivables  • audit_log │  │
    │  └─────────────────────────────┘  │
    │                                   │
    └───────────────────────────────────┘
```

### Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         JWT TOKEN                               │
│                    { companyId: "xxx" }                          │
│                            │                                    │
│          ┌─────────────────┼─────────────────┐                  │
│          │                 │                 │                  │
│          ▼                 ▼                 ▼                  │
│    ┌───────────┐     ┌───────────┐     ┌───────────┐           │
│    │ Company A │     │ Company B │     │ Company C │           │
│    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘           │
│          │                 │                 │                  │
│    ┌─────┴─────┐     ┌─────┴─────┐     ┌─────┴─────┐           │
│    │           │     │           │     │           │           │
│    ▼           ▼     ▼           ▼     ▼           ▼           │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Users │ │Outlet│ │Users │ │Outlet│ │Users │ │Outlet│        │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Produk│ │Gudang│ │Produk│ │Gudang│ │Produk│ │Gudang│        │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                                │
│    Data ISOLATED - No Cross-Company Access                     │
└─────────────────────────────────────────────────────────────────┘
```

### ERD Relationship Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                            │
└───────────────────────────────────────────────────────────────────────┘

    ┌───────────┐         ┌───────────┐         ┌───────────┐
    │ Company   │────────│   User    │────────│   Role    │
    │           │  1:N   │           │  N:1   │           │
    └─────┬─────┘         └─────┬─────┘         └───────────┘
          │                     │
          │                     │ creates
          │                     ▼
          │              ┌───────────┐
          │              │ Attendance│
          │              │ Session   │
          │              └─────┬─────┘
          │                    │
          │                    │ uses
          │                    ▼
          │              ┌───────────┐
          │              │   Face    │
          │              │ Capture   │
          │              └───────────┘
          │
          │ has         has
          ▼             ▼
    ┌───────────┐  ┌───────────┐
    │  Outlet   │  │  Product  │
    │           │  │           │
    └─────┬─────┘  └─────┬─────┘
          │              │
          │ visited      │ stocked
          │              ▼
          │        ┌───────────┐
          │        │Warehouse  │
          │        │& Inventory│
          │        └───────────┘
          │
          │ sells_to
          ▼
    ┌───────────┐
    │   Visit   │
    │  Session  │──────────────────┐
    └─────┬─────┘                  │
          │                        │
          │ generates              │ validates
          ▼                        ▼
    ┌───────────┐            ┌───────────┐
    │  Sales    │            │   GPS     │
    │Transaction│            │  Track    │
    └─────┬─────┘            └───────────┘
          │
          ├──► ┌───────────┐
          │    │Receivable │ (if credit)
          │    └───────────┘
          │
          └──► ┌───────────┐
               │Consignment│ (if titipan)
               └───────────┘

    ┌─────────────────────────────────────┐
    │           SYSTEM TABLES             │
    ├─────────────────────────────────────┤
    │  • media_files  (storage metadata)  │
    │  • audit_logs   (change tracking)   │
    │  • sync_events  (offline queue)     │
    │  • app_settings (configuration)     │
    └─────────────────────────────────────┘
```

---

## 📊 Business Flow

### 1. Admin Setup Flow

```
    ┌─────────────┐
    │ Admin Login │
    └──────┬──────┘
           │
           ▼
    ┌──────────────────────────┐
    │ Create Company Profile   │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Setup Roles & Permissions│
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Create Products          │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Create Warehouses        │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Set Inventory Labels     │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Initial Stock Setup      │
    └──────────────────────────┘
```

### 2. Daily Sales Operation

```
    ┌─────────────────┐
    │   Sales Login   │
    └────────┬────────┘
             │
             ▼
    ┌────────────────────────────┐
    │ Attendance Check-in        │
    │ • GPS Capture              │
    │ • Face Photo               │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ View Visit Schedule        │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Check-in Outlet            │
    │ • Geofence Validation      │
    │ • Face Capture             │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Create Order               │
    │ • Add Products             │
    │ • Take Photo               │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Check-out Outlet           │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Attendance Check-out       │
    └────────────────────────────┘
```

### 3. Order Approval Flow

```
    ┌─────────────────────────┐
    │ Sales Creates Order     │
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │ Status: Pending Approval│
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │ Admin Review            │
    └────────────┬────────────┘
                 │
                 ▼
           ┌───────────┐
           │ Stock     │
           │ Available?│
           └─────┬─────┘
           │           │
          Yes          No
           │           │
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │ Approve  │  │ Reject/  │
    │ Order    │  │ Error    │
    └────┬─────┘  └──────────┘
         │
         ▼
    ┌─────────────────┐
    │ Release Stock   │
    └────────┬────────┘
             │
             ▼
        ┌────────────┐
        │  Payment   │
        │  Method?   │
        └──────┬─────┘
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
 ┌──────┐  ┌──────┐  ┌──────┐
 │Cash/ │  │Credit│  │Consig│
 │QRIS  │  │      │  │nment │
 └──┬───┘  └──┬───┘  └──┬───┘
    │         │         │
    ▼         ▼         ▼
 ┌──────┐  ┌──────┐  ┌──────┐
 │Closed│  │Create│  │Create│
 │- Paid│  │Receiv│  │Consig│
 └──────┘  │able  │  │nment │
           └──────┘  └──────┘
```

### 4. Inventory Control Flow

```
    ┌─────────────────┐
    │    WH-MAIN      │
    │  (Main Store)   │
    └────────┬────────┘
             │
             │ Transfer Stock
             ▼
    ┌─────────────────┐
    │   Sales Van     │
    │  (Mobile Store) │
    └────────┬────────┘
             │
             │ Sale Transaction
             ▼
    ┌─────────────────┐
    │ Stock Movement  │
    │    Recorded     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Audit Ledger   │
    └────────┬────────┘
             │
             ▼
        ┌────────┐
        │ Error? │
        └───┬────┘
        │       │
       Yes      No
        │       │
        ▼       ▼
    ┌──────┐ ┌──────┐
    │Revers│ │Report│
    │e/    │ │s     │
    │Reset │ │      │
    └──────┘ └──────┘
```

### 5. GPS & Face Validation Flow

```
    ┌─────────────────────────┐
    │    Sales Check-in       │
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │     Capture GPS         │
    └────────────┬────────────┘
                 │
                 ▼
           ┌───────────┐
           │    GPS    │
           │ Accuracy  │
           │    OK?    │
           └─────┬─────┘
           │           │
          Yes          No
           │           │
           ▼           ▼
    ┌──────────┐  ┌─────────────┐
    │ Continue │  │ Reject -    │
    │          │  │ Low Accuracy│
    └────┬─────┘  └─────────────┘
         │
         ▼
    ┌───────────┐
    │  Within   │
    │ Geofence? │
    └─────┬─────┘
      │       │
     Yes      No
      │       │
      ▼       ▼
 ┌──────┐  ┌──────┐
 │Conti-│  │Manual│
 │nue   │  │Review│
 └──┬───┘  └──────┘
    │
    ▼
┌─────────────────┐
│ Capture Face    │
│ Photo           │
└────────┬────────┘
         │
         ▼
    ┌───────────┐
    │   Face    │
    │ Detected? │
    └─────┬─────┘
      │       │
     Yes      No
      │       │
      ▼       ▼
 ┌──────┐  ┌──────┐
 │Conti-│  │Flag  │
 │nue   │  │Review│
 └──┬───┘  └──────┘
    │
    ▼
┌─────────────────┐
│ Face Recogni-   │
│ tion Enabled?   │
└────────┬────────┘
     │       │
   Yes       No
     │       │
     ▼       ▼
┌─────────┐ ┌─────────────┐
│  Match  │ │    Valid    │
│Template?│ │ Check-in ✓  │
└────┬────┘ └─────────────┘
  │       │
 Yes      No
  │       │
  ▼       ▼
┌──────┐ ┌──────┐
│Valid │ │Reject│
│✓     │ │/Review│
└──────┘ └──────┘
```

### 6. Offline Sync Flow

```
┌─────────────────────────┐
│    Sales Offline        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Store in IndexedDB      │
│ (Local Storage)         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Queue Sync Events       │
└────────────┬────────────┘
             │
             ▼
   ┌─────────────────┐
   │ Online Detected │
   └────────┬────────┘
            │
            ▼
┌─────────────────────────┐
│ Upload Media First      │
│ (Photos, Face Capture)  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Push Events to Server   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Server Process Events   │
│ • Validate Data         │
│ • Update Database       │
│ • Write Audit Log       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Update Sync Status      │
│ • Mark as Synced        │
│ • Handle Conflicts      │
└─────────────────────────┘
```

### 7. Visit Scheduling Flow

```
┌─────────────────────────┐
│  Supervisor/Admin       │
│  Creates Schedule       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Set Targets             │
│ • Outlet Count          │
│ • Duration              │
│ • Closing Target        │
│ • Revenue Target        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Assign to Sales         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Schedule Status: Draft  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Admin Approve Schedule  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Status: Approved        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Sales Views Today's     │
│ Schedule on Mobile      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Execute Visits          │
│ • Check-in/Check-out    │
│ • GPS + Face Validation │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Performance Tracking    │
│ • Visit Achievement %   │
│ • Closing Achievement % │
│ • Revenue Achievement % │
└─────────────────────────┘
```

---

## 🗄 Database Schema

### Core Tables

#### Company & Tenant
| Table | Description |
|-------|-------------|
| `companies` | Company profile & settings |
| `company_subscriptions` | Subscription plan info |
| `company_integrations` | External service configs |

#### Auth & Access
| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `roles` | User roles |
| `permissions` | Feature permissions |
| `role_permissions` | Role-permission mapping |
| `sessions` | Login sessions |

#### Outlet & Assignment
| Table | Description |
|-------|-------------|
| `outlets` | Customer/outlet master |
| `outlet_photos` | Outlet documentation |
| `sales_outlet_assignments` | Sales-outlet mapping |

#### Attendance & Visit
| Table | Description |
|-------|-------------|
| `attendance_sessions` | Daily attendance |
| `face_captures` | Face verification data |
| `gps_track_logs` | Location tracking |
| `visit_sessions` | Outlet visit records |
| `visit_schedules` | Visit planning |

#### Products & Inventory
| Table | Description |
|-------|-------------|
| `products` | Product master |
| `warehouses` | Warehouse locations |
| `inventory_balances` | Stock balances |
| `inventory_movements` | Stock movement ledger |

#### Sales & Finance
| Table | Description |
|-------|-------------|
| `sales_transactions` | Sales orders |
| `sales_transaction_items` | Order line items |
| `transaction_note_photos` | Invoice photos |
| `receivables` | Credit receivables |
| `receivable_payments` | Payment records |
| `consignments` | Consignment tracking |
| `cash_deposits` | Daily deposits |

#### System
| Table | Description |
|-------|-------------|
| `media_files` | File metadata |
| `audit_logs` | System audit trail |
| `sync_events` | Offline sync queue |
| `app_settings` | App configuration |

### Entity Relationship Overview

```mermaid
erDiagram
    Company ||--o{ User : has
    Company ||--o{ Outlet : has
    Company ||--o{ Product : has
    Company ||--o{ Warehouse : has
    
    User ||--o{ AttendanceSession : records
    User ||--o{ VisitSession : performs
    User ||--o{ SalesTransaction : creates
    
    Outlet ||--o{ VisitSession : location
    Outlet ||--o{ SalesTransaction : sells_to
    
    VisitSession ||--o{ FaceCapture : validates
    AttendanceSession ||--o{ FaceCapture : verifies
    
    SalesTransaction ||--o{ SalesTransactionItem : contains
    SalesTransaction ||--|| Receivable : generates
    SalesTransaction ||--|| Consignment : creates
    
    Product ||--o{ SalesTransactionItem : ordered_as
    Product ||--o{ InventoryBalance : stocked_as
    Product ||--o{ InventoryMovement : moves_as
    
    Warehouse ||--o{ InventoryBalance : stores
    Warehouse ||--o{ InventoryMovement : source_or_dest
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/refresh` | Refresh token |
| `POST` | `/auth/logout` | User logout |
| `GET` | `/auth/me` | Get current user |

### Users & Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List users |
| `POST` | `/users` | Create user |
| `GET` | `/users/:id` | Get user detail |
| `PATCH` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Delete user |
| `GET` | `/roles` | List roles |
| `GET` | `/permissions` | List permissions |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/attendance/today` | Today's attendance |
| `POST` | `/attendance/check-in` | Check-in |
| `POST` | `/attendance/check-out` | Check-out |
| `GET` | `/attendance/review` | Review attendance |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/visits/today` | Today's visits |
| `GET` | `/visits/schedules` | Visit schedules |
| `POST` | `/visits/schedules` | Create schedule |
| `POST` | `/visits/check-in` | Check-in outlet |
| `POST` | `/visits/check-out` | Check-out outlet |

### Outlets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/outlets` | List outlets |
| `POST` | `/outlets` | Create outlet |
| `PATCH` | `/outlets/:id` | Update outlet |
| `POST` | `/outlets/:id/verify` | Verify outlet |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products` | List products |
| `POST` | `/products` | Create product |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/warehouses` | List warehouses |
| `POST` | `/inventory/warehouses` | Create warehouse |
| `GET` | `/inventory/balances` | Stock balances |
| `GET` | `/inventory/movements` | Stock movements |
| `POST` | `/inventory/adjustments` | Adjust stock |
| `POST` | `/inventory/transfers` | Transfer stock |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sales/orders` | List orders |
| `POST` | `/sales/orders` | Create order |
| `POST` | `/sales/orders/:id/approve` | Approve order |

### Finance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/receivables` | List receivables |
| `POST` | `/receivables/:id/payments` | Record payment |
| `GET` | `/consignments` | List consignments |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/media/upload-url` | Get upload URL |
| `POST` | `/media/complete` | Complete upload |

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sync/manifest` | Get sync manifest |
| `GET` | `/sync/pull` | Pull data |
| `POST` | `/sync/push` | Push offline events |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reports/summary` | Summary report |

---

## 🚀 Installation

### Prerequisites

- **Node.js** v18+ 
- **pnpm** v10+
- **Docker** (for PostgreSQL)
- **Git**

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/yuksales.git
cd yuksales

# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Setup environment
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development servers
pnpm dev
```

### Environment Variables

Create `.env` file in root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yuksales

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Storage (optional - for production)
STORAGE_DRIVER=r2
STORAGE_BUCKET=yuksales-assets
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://your-r2-endpoint.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
```

---

## 💻 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start both API and Web
pnpm dev:api          # Start API only
pnpm dev:web          # Start Web only

# Build
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check
pnpm lint             # Lint code

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Drizzle Studio
```

### Development URLs

- **Web App**: https://localhost:5173
- **API Server**: https://localhost:4000
- **Drizzle Studio**: http://localhost:4983

### Default Credentials

After seeding:
```
Email: admin@yuksales.local
Password: ChangeMe123!
```

---

## 📁 Project Structure

```
yuksales/
├── apps/
│   ├── web/                    # React PWA Frontend
│   │   ├── src/
│   │   │   ├── features/       # Feature modules
│   │   │   │   ├── admin/      # Admin pages
│   │   │   │   ├── sales/      # Sales mobile pages
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   └── standalone/ # Standalone pages
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── lib/            # Utilities & API client
│   │   │   ├── router/         # Route configuration
│   │   │   └── assets/         # Styles & images
│   │   └── public/             # Static assets
│   │
│   └── api/                    # Fastify API Backend
│       └── src/
│           ├── modules/        # Domain modules
│           │   ├── auth/       # Authentication
│           │   ├── users/      # User management
│           │   ├── outlets/    # Outlet management
│           │   ├── visits/     # Visit scheduling
│           │   ├── attendance/ # Attendance system
│           │   ├── inventory/  # Stock management
│           │   ├── sales/      # Sales transactions
│           │   └── ...
│           ├── plugins/        # Fastify plugins
│           └── utils/          # Utilities
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── src/schema/         # Drizzle schemas
│   │   └── drizzle/            # Migrations
│   │
│   └── shared/                 # Shared utilities
│       ├── src/constants/      # Constants
│       └── src/geo/            # Geofence utilities
│
├── docs/                       # Documentation
├── docker-compose.yml          # Docker config
└── pnpm-workspace.yaml         # Workspace config
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Business Flow](docs/api_business_flow.md) | API routes & business logic |
| [Database Schema](docs/database-schema.md) | Database structure |
| [ERD Business Flow](docs/erd-business-flow.md) | Entity relationships |
| [Folder Mapping](docs/folder-mapping.md) | Project structure |
| [Implementation Plan](implementation_plan_phase1.md) | Development roadmap |

---

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-Based Access Control** - Granular permissions
- **Multi-tenant Isolation** - Company data separation
- **Audit Logging** - Track all changes
- **Face Verification** - Identity validation
- **GPS Validation** - Location verification
- **Soft Deletes** - Data recovery possible

---

## 🌟 Key Features

### For Sales Team
- 📱 Mobile-first PWA interface
- 📍 GPS-based check-in/out
- 📸 Photo documentation
- 🔄 Offline capability
- 📊 Daily schedule view

### For Management
- 📈 Real-time dashboards
- 👥 Team performance tracking
- 📋 Visit review & approval
- 💰 Sales analytics
- 🔍 Audit trail

### For Operations
- 📦 Inventory management
- 🏪 Outlet management
- 💳 Payment tracking
- 📊 Reporting tools
- ⚙️ System configuration

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For support and inquiries, please contact the development team.

---

<div align="center">

**Built with ❤️ by YukSales Team**

</div>