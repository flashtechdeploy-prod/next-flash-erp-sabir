# Flash ERP Backend (NestJS)

Backend API for Flash Security Services Management System built with NestJS, PostgreSQL, and Drizzle ORM.

## Features

- 🔐 JWT Authentication
- 📊 15 Complete Modules (HR, Attendance, Payroll, Fleet, Inventory, Finance, Clients)
- 🗄️ PostgreSQL with Drizzle ORM
- 📁 Scalable File Upload System
- 📝 Swagger API Documentation
- ✅ TypeScript Strict Mode
- 🔒 Role-Based Access Control

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Language:** TypeScript
- **Authentication:** JWT
- **File Upload:** Multer
- **API Docs:** Swagger/OpenAPI
- **Validation:** class-validator

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your database credentials:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/flash_erp
JWT_SECRET=your-secret-key
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

## Database Setup

```bash
# Generate migration files
npx drizzle-kit generate:pg

# Apply migrations to database
npx drizzle-kit push:pg

# Open Drizzle Studio (optional - database GUI)
npx drizzle-kit studio
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
# Build
npm run build

# Start
npm run start:prod
```

### Watch Mode
```bash
npm run start:watch
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:8000/docs
```

## Project Structure

```
src/
├── common/
│   └── utils/
│       └── upload.config.ts      # Centralized upload configuration
├── db/
│   └── schema/                   # Database schemas
│       ├── employees.ts
│       ├── hr.ts
│       ├── vehicles.ts
│       ├── clients.ts
│       ├── inventory.ts
│       └── finance.ts
├── modules/                      # Feature modules
│   ├── auth/
│   ├── employees/
│   ├── attendance/
│   ├── leave-management/
│   ├── payroll/
│   ├── vehicles/
│   ├── client-management/
│   ├── finance/
│   ├── inventory/
│   └── uploads/
├── app.module.ts
└── main.ts
```

## Modules

### Core Modules
1. **Authentication** - JWT-based auth
2. **Employees** - Employee management
3. **Attendance** - Daily attendance tracking
4. **Leave Management** - Leave requests and approvals
5. **Payroll** - Salary processing
6. **Vehicles** - Fleet management
7. **Vehicle Assignments** - Route assignments
8. **Fuel Entries** - Fuel consumption tracking
9. **Vehicle Maintenance** - Service records
10. **Client Management** - Client, sites, contracts
11. **Finance** - Financial transactions
12. **Advances** - Employee advances
13. **General Inventory** - Non-restricted items
14. **Restricted Inventory** - Serial-tracked items
15. **Roles & Permissions** - Access control

### Recent Features
- ✅ Automatic leave management from attendance
- ✅ Contract document upload/management
- ✅ Guard assignment to client sites
- ✅ Scalable upload system with auto-initialization

## Upload System

The backend uses a centralized upload system that automatically creates directories on startup:

```
uploads/
├── employees/
│   ├── documents/
│   ├── photos/
│   └── warnings/
├── vehicles/
│   ├── documents/
│   └── images/
├── clients/
│   ├── contracts/
│   └── documents/
└── general/
    ├── documents/
    └── images/
```

All upload paths are configured in `src/common/utils/upload.config.ts`.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - List attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/employee/:id` - Employee history

### Client Management
- `GET /api/client-management/clients` - List clients
- `POST /api/client-management/clients` - Create client
- `POST /api/client-management/contracts/:id/documents` - Upload contract document
- `POST /api/client-management/sites/:id/guards` - Assign guard to site
- `PUT /api/client-management/sites/:id/guards/:aid/eject` - Eject guard

*See `/docs` for complete API documentation*

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Build

```bash
npm run build
```

## Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT tokens | - |
| `PORT` | Server port | 8000 |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | http://localhost:3000 |

## Security

- ✅ JWT authentication on all protected routes
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Input validation with class-validator
- ✅ File upload validation (type, size)
- ✅ SQL injection prevention (ORM)
- ✅ CORS configuration

## Performance

- ✅ Database query optimization
- ✅ Connection pooling
- ✅ Efficient file handling
- ✅ Proper indexing on foreign keys

## Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/main.js --name flash-backend

# Monitor
pm2 monit

# Logs
pm2 logs flash-backend
```

### Using Docker
```bash
# Build image
docker build -t flash-backend .

# Run container
docker run -p 8000:8000 flash-backend
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - Flash Security Services

## Support

For issues and questions, contact the development team.

---

**Status:** Production Ready ✅  
**Version:** 1.0.0  
**Last Updated:** January 2026
