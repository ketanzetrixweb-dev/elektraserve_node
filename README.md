# ElektraServe Backend API

A lightweight, reliable Node.js and Express REST API backend with MySQL database integration for managing and monitoring industrial and IoT devices (Solar, Pump, AC, Compressor, LTDB, and others).

---

## 1. Prerequisites

Before setting up the project, ensure you have the following installed on your system:

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MySQL / MariaDB**: MySQL 8.0+ or MariaDB 10.5+

To verify your local versions:
```bash
node -v
npm -v
mysql --version
```

---

## 2. Setup & Installation

### Step 1: Install Dependencies
Navigate to the project root directory and install the required npm packages:
```bash
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the root directory by copying the provided `.env.example`:
```bash
cp .env.example .env
```

Configure your environment variables inside `.env`:
```env
# Application Server Port
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=elektraserve_db
```

---

## 3. Database Initialization

### Step 1: Create Database
Ensure MySQL is running on your machine, then create the database if it doesn't already exist:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS elektraserve_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 2: Run Database Migrations
Create the `devices` table with all indexes and constraints:
```bash
npm run migrate
```

*(Optional) To roll back the migration if needed:*
```bash
npm run migrate:rollback
```

### Step 3: Seed Demo Data
Populate the database with the initial synthetic demo devices:
```bash
npm run seed
```

*(Optional) To wipe existing records and re-seed from scratch:*
```bash
npm run seed:fresh
```

---

## 4. Run Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in development mode with **Nodemon** (auto-restart on changes) |
| `npm start` | Starts server in production mode using `node index.js` |
| `npm run migrate` | Executes pending SQL migrations in `/migrations` |
| `npm run migrate:rollback` | Rolls back the latest applied migration |
| `npm run seed` | Seeds or updates demo device records |
| `npm run seed:fresh` | Clears `devices` table and re-seeds demo data |
| `npm test` | Runs automated test suite verifying all endpoints & business rules |

---

## 5. Test Credentials & Demo Identifiers

> **Note on Authentication:** Authentication is not required for this demo application. All endpoints are publicly accessible for testing.

### Seeded Synthetic Device Identifiers

| Device ID / IMEI | Device Name | Solution Type | Registration Status | Device Status | Last Seen | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEMO-1001` | Rooftop Solar 01 | Solar | Registered | Online | Recent UTC (~5m ago) | Online solar unit |
| `DEMO-1002` | Pump Starter 02 | Pump | Pending | Offline | *Never* (`null`) | Awaiting registration |
| `DEMO-1003` | AC Panel 03 | AC | Error | Offline | *Never* (`null`) | Registration error simulated |
| `DEMO-1004` | Solar Meter 04 | Solar | Registered | Offline | Older UTC (~2d ago) | Registered but offline |
| `DEMO-1005` | Compressor 05 | Compressor | Pending | Online | Recent UTC (~12m ago) | Simulated online connectivity |
| `DEMO-1006` | LTDB Panel 06 | LTDB | Registered | Online | Recent UTC (~2m ago) | Online distribution board |

### Quick Verification Endpoints

- **Interactive Swagger UI**:
  ```text
  http://localhost:5000/api-docs
  ```
  *(or redirect via `http://localhost:5000/docs`)*

- **Server Health Check**:
  ```bash
  curl http://localhost:5000/
  ```
  *Response:* `{"status":"success","message":"ElektraServe API is running","documentation":"http://localhost:5000/api-docs"}`

- **Database Connectivity Check**:
  ```bash
  curl http://localhost:5000/api/db-check
  ```
  *Response:* `{"status":"success","message":"Database connection is active","data":[{"result":2}]}`

---

## 6. API Reference & Contract

| Method | Endpoint | Description / Business Rule | Response Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/devices` | List devices with optional query filters (`q`, `registrationStatus`, `deviceStatus`, `solutionType`) and pagination (`page`, `limit`, `offset`) | `200 OK` |
| `GET` | `/api/devices/:id` | Get single device by ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/devices` | Create new device (trims strings, validates enums, checks unique identifier) | `201 Created` / `400 Bad Request` / `409 Conflict` |
| `PUT` | `/api/devices/:id` | Update device fields, refreshes `UpdatedAtUtc` | `200 OK` / `400 Bad Request` / `404 Not Found` / `409 Conflict` |
| `DELETE` | `/api/devices/:id` | Delete device | `204 No Content` / `404 Not Found` |
| `POST` | `/api/devices/:id/register` | Register device. Only `Pending` or `Error` can be registered. Already `Registered` returns 409 conflict | `200 OK` / `404 Not Found` / `409 Conflict` |
| `POST` | `/api/devices/:id/simulate-online` | Set `DeviceStatus = 'Online'` and update `LastSeenUtc` + `UpdatedAtUtc` to now | `200 OK` / `404 Not Found` |
| `POST` | `/api/devices/:id/simulate-offline` | Set `DeviceStatus = 'Offline'` and update `UpdatedAtUtc` | `200 OK` / `404 Not Found` |
| `POST` | `/api/devices/:id/retry-registration` | Reset registration (`Error -> Pending`). Only devices in `Error` status can retry | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `GET` | `/api/dashboard/summary` | Return database-calculated counts: `total`, `pending`, `registered`, `online`, `offline`, `error` | `200 OK` |

### Business Rules & Validation Details

1. **Trimming & Mandatory Fields**: Inputs are trimmed; blank `DeviceIdentifier`, `DeviceName`, or `SolutionType` are rejected (`400 Bad Request`).
2. **Case-Insensitive Uniqueness**: `DeviceIdentifier` is checked case-insensitively. Duplicate inserts or updates return `409 Conflict`.
3. **Registration Transition**: Only devices in `Pending` or `Error` status can be transitioned to `Registered`. Attempting to register an already `Registered` device returns `409 Conflict` without modifying data.
4. **Retry Registration**: Only devices in `Error` status can transition back to `Pending`. Other statuses receive `400 Bad Request`.
5. **UTC Timestamps**: All mutation endpoints update `UpdatedAtUtc` with current UTC time; `simulate-online` also updates `LastSeenUtc`.
6. **Parameterized Queries**: All database queries use parameterized inputs to prevent SQL injection.

## 7. Project Structure

```text
ElektraServe/
├── config/
│   ├── db.js                      # Sequelize ORM connection & tester
│   └── swagger.js                 # Swagger OpenAPI 3.0 specification & UI setup
├── controllers/                   # Controller functions for business logic
├── middleware/                    # Request validation & parameter middleware
│   ├── deviceValidation.js        # Device input & ID validation middleware
│   └── index.js                   # Middleware aggregator
├── migrations/
│   └── 001_create_devices_table.sql # Devices table schema migration (UP & DOWN)
├── models/
│   ├── Device.js                  # Device model with validation & CRUD queries
│   └── index.js                   # Models aggregator
├── routes/                        # API route definitions
├── scripts/
│   ├── migrate.js                 # Database migration runner CLI
│   ├── seed.js                    # Database seeder runner CLI
│   └── testApi.js                 # Automated API test suite
├── seeders/
│   └── deviceSeeder.js            # Initial demo dataset and upsert logic
├── .env                           # Local environment variables (git-ignored)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore file
├── index.js                       # Express app entry point
├── package.json                   # Dependencies & npm scripts
├── README.md                      # Documentation
└── schema.sql                     # Standalone SQL schema reference
```