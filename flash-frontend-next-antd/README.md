# Flash Security - Next.js Frontend with Ant Design

Modern management system for Flash Security Company built with Next.js 16, Ant Design 6, and TypeScript.

## 🚀 Features

- **Authentication**: Secure login with JWT tokens
- **Employee Management**: Complete CRUD with 58-field schema
- **Dashboard**: Overview with statistics
- **Responsive Design**: Works on all devices
- **Modern UI**: Ant Design components
- **TypeScript**: Full type safety

## 📋 Employee Schema (58 Fields)

### 10 Categories:
1. **Basic Identification** (10 fields) - Photo, Name, CNIC, DOB, Blood Group, etc.
2. **Enrollment & Service** (11 fields) - FSS Number, Rank, Unit, Status, etc.
3. **Deployment & Job** (5 fields) - Location, Pay, BDM, etc.
4. **Documents & Agreements** (3 fields) - Original docs, Agreement date, etc.
5. **Contact Information** (1 field) - Mobile number
6. **Address Information** (10 fields) - Permanent and Present address
7. **Family Information** (4 fields) - Sons, Daughters, Brothers, Sisters
8. **Next of Kin (NOK)** (3 fields) - Name, CNIC, Mobile
9. **Verification Details** (2 fields) - SHO and SSP verification
10. **Signatures & Biometrics** (9 fields) - Digital signatures and fingerprints

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Ant Design 6
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Date Handling**: Day.js
- **API Client**: Custom fetch wrapper

## 📦 Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Update .env.local with your backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚀 Running the Application

```bash
# Development mode (port 3000)
npm run dev

# Production build
npm run build
npm start
```

## 🔐 Default Login Credentials

```
Email: admin@flash.com
Password: password123
```

## 📁 Project Structure

```
flash-frontend-next-antd/
├── app/
│   ├── layout.tsx              # Root layout with Ant Design setup
│   ├── page.tsx                # Redirects to login
│   ├── login/
│   │   └── page.tsx            # Login page
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with sidebar
│       ├── page.tsx            # Dashboard home
│       └── employees/
│           ├── page.tsx        # Employee list with CRUD
│           └── EmployeeForm.tsx # Employee form (58 fields)
├── lib/
│   ├── api.ts                  # API client and endpoints
│   └── auth.tsx                # Auth context and hooks
└── .env.local                  # Environment variables
```

## 🎨 Features Implemented

### Authentication
- Login page with form validation
- JWT token storage in localStorage
- Protected routes with auth context
- Auto-redirect to login if not authenticated

### Dashboard
- Sidebar navigation with collapsible menu
- Header with user info and logout
- Statistics cards (placeholder for now)
- Responsive layout

### Employee Management
- **List View**: Table with pagination, search, and filters
- **Create**: Modal form with 6 tabs for organized data entry
- **Update**: Edit existing employee data
- **Delete**: Confirm before deletion
- **Search**: By name, CNIC, FSS number, or employee ID
- **Filter**: By status (Active/Inactive/Suspended)
- **Sort**: By any column
- **Pagination**: 20 records per page (configurable)

### Employee Form Tabs
1. **Basic Info**: Name, Father Name, CNIC, DOB, Blood Group, Height, Education, Bio
2. **Service Details**: FSS Number, Rank, Unit, Enrollment dates, Status, Experience
3. **Deployment**: Location, Pay, BDM, Interviewed By, Introduced By
4. **Contact & Address**: Mobile, Permanent Address (5 fields), Present Address (5 fields)
5. **Family & NOK**: Family counts, Next of Kin details
6. **Documents**: Original docs, Agreement date, Verification dates

## 🔌 API Integration

All API calls go through the centralized API client in `lib/api.ts`:

```typescript
// Employee operations
employeeApi.getAll(params)      // List with filters
employeeApi.getOne(id)          // Get single employee
employeeApi.create(data)        // Create new
employeeApi.update(id, data)    // Update existing
employeeApi.delete(id)          // Delete
employeeApi.bulkDelete(ids)     // Delete multiple
employeeApi.uploadFile(id, formData)  // Upload files
employeeApi.getFiles(id, category)    // Get files
employeeApi.deleteFile(id, fileId)    // Delete file
```

## 🎯 Next Steps

### To be implemented:
- [ ] File upload functionality for employee documents
- [ ] Attendance module
- [ ] Vehicle management
- [ ] Payroll module
- [ ] Client management
- [ ] Inventory module
- [ ] Reports and analytics
- [ ] User management
- [ ] Role-based access control

## 🐛 Known Issues

None at the moment. All TypeScript errors resolved.

## 📝 Notes

- Backend must be running on port 8000
- Frontend runs on port 3000
- All dates are in YYYY-MM-DD format
- Employee ID format: SEC-ABC123 (auto-generated by backend)
- Status values: Active, Inactive, Suspended

## 🤝 Backend Integration

This frontend connects to the NestJS backend at `http://localhost:8000`.

### Required Backend Endpoints:
- `POST /api/auth/login` - Authentication
- `GET /api/employees` - List employees (with query params)
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `PUT /api/employees/bulk-delete` - Delete multiple
- `POST /api/employees/:id/files` - Upload files
- `GET /api/employees/:id/files` - Get files
- `DELETE /api/employees/:id/files/:fileId` - Delete file

## 📄 License

Private - Flash Security Company

---

**Last Updated**: January 14, 2026
**Version**: 1.0.0
