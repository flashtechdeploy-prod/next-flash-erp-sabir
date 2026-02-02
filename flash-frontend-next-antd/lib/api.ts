const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      // Handle 204 No Content responses (common for DELETE operations)
      if (response.status === 204) {
        return { data: undefined as T };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || "An error occurred",
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: "DELETE" };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return this.request<T>(endpoint, options);
  }

  async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    method: string = "POST",
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {};
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || "Upload failed",
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Upload error",
      };
    }
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post("/api/auth/register", data),
  logout: () => api.post("/api/auth/logout", {}),
  getMe: () => api.get("/api/auth/me"),
  setPassword: (data: { fss_no: string; password: string }) =>
    api.post("/api/auth/set-password", data),
  setupPassword: (data: { fss_no: string; password: string }) =>
    api.post("/api/auth/setup-password", data),
};

// Employee API
export const employeeApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return api.get(`/api/employees${query}`);
  },
  getOne: (id: string) => api.get(`/api/employees/${id}`),
  getByDbId: (dbId: number) => api.get(`/api/employees/by-db-id/${dbId}`),
  create: (data: Record<string, unknown>) => api.post("/api/employees", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/employees/${id}`, data),
  delete: (id: string) => api.delete(`/api/employees/${id}`),
  bulkDelete: (ids: string[]) =>
    api.put("/api/employees/bulk-delete", { employee_ids: ids }),
  markLeft: (id: string, reason?: string) => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return api.post(`/api/employees/${id}/mark-left${query}`, {});
  },
  deactivate: (id: string) => api.post(`/api/employees/${id}/deactivate`, {}),
  getKpis: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return api.get(`/api/employees/kpis${query}`);
  },
  getDepartments: () => api.get("/api/employees/departments/list"),
  getDesignations: () => api.get("/api/employees/designations/list"),
  getCategories: () => api.get("/api/employees/categories/list"),

  // Documents
  getDocuments: (dbId: number) =>
    api.get(`/api/employees/by-db-id/${dbId}/documents`),
  uploadDocument: (dbId: number, formData: FormData) =>
    api.uploadFile(`/api/employees/by-db-id/${dbId}/documents`, formData),
  deleteDocument: (dbId: number, docId: number) =>
    api.delete(`/api/employees/by-db-id/${dbId}/documents/${docId}`),

  // Warnings
  getWarnings: (dbId: number) =>
    api.get(`/api/employees/by-db-id/${dbId}/warnings`),
  createWarning: (dbId: number, data: Record<string, unknown>) =>
    api.post(`/api/employees/by-db-id/${dbId}/warnings`, data),
  deleteWarning: (dbId: number, warningId: number) =>
    api.delete(`/api/employees/by-db-id/${dbId}/warnings/${warningId}`),

  // Warning Documents
  getWarningDocuments: (warningId: number) =>
    api.get(`/api/employees/warnings/${warningId}/documents`),
  uploadWarningDocument: (warningId: number, formData: FormData) =>
    api.uploadFile(`/api/employees/warnings/${warningId}/documents`, formData),
  deleteWarningDocument: (warningId: number, docId: number) =>
    api.delete(`/api/employees/warnings/${warningId}/documents/${docId}`),
};

// Vehicles API
export const vehicleApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return api.get(`/api/vehicles${query}`);
  },
  getOne: (id: string) => api.get(`/api/vehicles/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/vehicles", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/api/vehicles/${id}`),
  getCategories: () => api.get('/api/vehicles/categories'),
  createCategory: (name: string) => api.post('/api/vehicles/categories', { name }),
  updateCategory: (oldCategory: string, newCategory: string) =>
    api.put('/api/vehicles/categories', { oldCategory, newCategory }),
  deleteCategory: (category: string) =>
    api.delete('/api/vehicles/categories', { category }),
  getTypes: () => api.get('/api/vehicles/types'),
  createType: (name: string) => api.post('/api/vehicles/types', { name }),
  updateType: (oldType: string, newType: string) =>
    api.put('/api/vehicles/types', { oldType, newType }),
  deleteType: (type: string) =>
    api.delete('/api/vehicles/types', { type }),

  // Documents
  getDocuments: (id: string) => api.get(`/api/vehicles/${id}/documents`),
  uploadDocument: (id: string, formData: FormData) =>
    api.uploadFile(`/api/vehicles/${id}/documents`, formData),
  deleteDocument: (id: string, docId: number) =>
    api.delete(`/api/vehicles/${id}/documents/${docId}`),

  // Images
  getImages: (id: string) => api.get(`/api/vehicles/${id}/images`),
  uploadImage: (id: string, formData: FormData) =>
    api.uploadFile(`/api/vehicles/${id}/images`, formData),
  deleteImage: (id: string, imageId: number) =>
    api.delete(`/api/vehicles/${id}/images/${imageId}`),
};

// Attendance API
export const attendanceApi = {
  getByDate: (date: string) => api.get(`/api/attendance?date=${date}`),
  getByRange: (fromDate: string, toDate: string) =>
    api.get(`/api/attendance/range?from_date=${fromDate}&to_date=${toDate}`),
  getByEmployee: (employeeId: string, fromDate: string, toDate: string) =>
    api.get(
      `/api/attendance/employee/${employeeId}?from_date=${fromDate}&to_date=${toDate}`,
    ),
  getSummary: (
    fromDate: string,
    toDate: string,
    filters?: { department?: string; designation?: string },
  ) => {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });
    if (filters?.department) params.append("department", filters.department);
    if (filters?.designation) params.append("designation", filters.designation);
    return api.get(`/api/attendance/summary?${params.toString()}`);
  },
  bulkUpsert: (date: string, records: Array<Record<string, unknown>>) =>
    api.put("/api/attendance", { date, records }),
  getFullDaySheet: (date: string) => api.get(`/api/attendance/full-day-sheet?date=${date}`),
};

// Client Management API
export const clientApi = {
  // Clients
  getAll: () => api.get("/api/client-management/clients"),
  getOne: (id: number) => api.get(`/api/client-management/clients/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/api/client-management/clients", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/client-management/clients/${id}`, data),
  delete: (id: number) => api.delete(`/api/client-management/clients/${id}`),

  // Contacts
  getContacts: (clientId: number) =>
    api.get(`/api/client-management/clients/${clientId}/contacts`),
  createContact: (clientId: number, data: Record<string, unknown>) =>
    api.post(`/api/client-management/clients/${clientId}/contacts`, data),
  updateContact: (
    clientId: number,
    contactId: number,
    data: Record<string, unknown>,
  ) =>
    api.put(
      `/api/client-management/clients/${clientId}/contacts/${contactId}`,
      data,
    ),
  deleteContact: (clientId: number, contactId: number) =>
    api.delete(
      `/api/client-management/clients/${clientId}/contacts/${contactId}`,
    ),

  // Addresses
  getAddresses: (clientId: number) =>
    api.get(`/api/client-management/clients/${clientId}/addresses`),
  createAddress: (clientId: number, data: Record<string, unknown>) =>
    api.post(`/api/client-management/clients/${clientId}/addresses`, data),
  updateAddress: (
    clientId: number,
    addressId: number,
    data: Record<string, unknown>,
  ) =>
    api.put(
      `/api/client-management/clients/${clientId}/addresses/${addressId}`,
      data,
    ),
  deleteAddress: (clientId: number, addressId: number) =>
    api.delete(
      `/api/client-management/clients/${clientId}/addresses/${addressId}`,
    ),

  // Sites
  getSites: (clientId: number) =>
    api.get(`/api/client-management/clients/${clientId}/sites`),
  createSite: (clientId: number, data: Record<string, unknown>) =>
    api.post(`/api/client-management/clients/${clientId}/sites`, data),
  updateSite: (
    clientId: number,
    siteId: number,
    data: Record<string, unknown>,
  ) =>
    api.put(`/api/client-management/clients/${clientId}/sites/${siteId}`, data),
  deleteSite: (clientId: number, siteId: number) =>
    api.delete(`/api/client-management/clients/${clientId}/sites/${siteId}`),

  // Contracts
  getContracts: (clientId: number) =>
    api.get(`/api/client-management/clients/${clientId}/contracts`),
  createContract: (clientId: number, data: Record<string, unknown>) =>
    api.post(`/api/client-management/clients/${clientId}/contracts`, data),
  updateContract: (
    clientId: number,
    contractId: number,
    data: Record<string, unknown>,
  ) =>
    api.put(
      `/api/client-management/clients/${clientId}/contracts/${contractId}`,
      data,
    ),
  deleteContract: (clientId: number, contractId: number) =>
    api.delete(
      `/api/client-management/clients/${clientId}/contracts/${contractId}`,
    ),

  // Contract Documents
  uploadContractDocument: (contractId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.uploadFile(
      `/api/client-management/contracts/${contractId}/documents`,
      formData,
    );
  },
  getContractDocuments: (contractId: number) =>
    api.get(`/api/client-management/contracts/${contractId}/documents`),
  deleteContractDocument: (contractId: number, documentId: number) =>
    api.delete(
      `/api/client-management/contracts/${contractId}/documents/${documentId}`,
    ),

  // Guard Assignments
  assignGuard: (siteId: number, data: Record<string, unknown>) =>
    api.post(`/api/client-management/sites/${siteId}/guards`, data),
  getSiteGuards: (siteId: number) =>
    api.get(`/api/client-management/sites/${siteId}/guards`),
  ejectGuard: (
    siteId: number,
    assignmentId: number,
    data: Record<string, unknown>,
  ) =>
    api.put(
      `/api/client-management/sites/${siteId}/guards/${assignmentId}/eject`,
      data,
    ),
  getAvailableGuards: () => api.get("/api/client-management/guards/available"),
  getActiveAssignments: () => api.get("/api/client-management/assignments/active"),

  // Industries
  getIndustries: () => api.get("/api/client-management/industries"),
  createIndustry: (data: Record<string, unknown>) =>
    api.post("/api/client-management/industries", data),
  updateIndustry: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/client-management/industries/${id}`, data),
  deleteIndustry: (id: number) =>
    api.delete(`/api/client-management/industries/${id}`),
};

// Payroll API
export const payrollApi = {
  // Monthly reports
  getReport: (month: string) => api.get(`/api/payroll/report?month=${month}`),
  getRangeReport: (fromDate: string, toDate: string, month?: string) => {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });
    if (month) params.append("month", month);
    return api.get(`/api/payroll/range-report?${params.toString()}`);
  },

  // Sheet entries
  getSheetEntries: (fromDate: string, toDate: string) =>
    api.get(
      `/api/payroll/sheet-entries?from_date=${fromDate}&to_date=${toDate}`,
    ),
  bulkUpsertSheetEntries: (
    fromDate: string,
    toDate: string,
    entries: Array<Record<string, unknown>>,
  ) =>
    api.put("/api/payroll/sheet-entries", {
      from_date: fromDate,
      to_date: toDate,
      entries,
    }),

  // Payment status
  getPaymentStatus: (month: string, employeeId: string) =>
    api.get(
      `/api/payroll/payment-status?month=${month}&employee_id=${employeeId}`,
    ),
  upsertPaymentStatus: (data: {
    month: string;
    employee_id: string;
    status: string;
  }) => api.put("/api/payroll/payment-status", data),

  // Export
  exportPdf: (body: Record<string, unknown>) =>
    api.post("/api/payroll/export-pdf", body),
};

// Leave Management API
export const leaveApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/leave-periods${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  create: (data: Record<string, unknown>) =>
    api.post("/api/leave-periods", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/leave-periods/${id}`, data),
  delete: (id: number) => api.delete(`/api/leave-periods/${id}`),
  getAlerts: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/leave-periods/alerts${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
};

// Vehicle Assignments API
export const vehicleAssignmentApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/vehicle-assignments${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  getOne: (id: number) => api.get(`/api/vehicle-assignments/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/api/vehicle-assignments", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/vehicle-assignments/${id}`, data),
  delete: (id: number) => api.delete(`/api/vehicle-assignments/${id}`),
  getAnalytics: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/vehicle-assignments/analytics${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
};

// Fuel Entries API
export const fuelEntryApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/fuel-entries${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  getOne: (id: number) => api.get(`/api/fuel-entries/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/api/fuel-entries", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/fuel-entries/${id}`, data),
  delete: (id: number) => api.delete(`/api/fuel-entries/${id}`),
  getSummary: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/fuel-entries/summary${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
};

// Vehicle Maintenance API
export const vehicleMaintenanceApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/vehicle-maintenance${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  getOne: (id: number) => api.get(`/api/vehicle-maintenance/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/api/vehicle-maintenance", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/vehicle-maintenance/${id}`, data),
  delete: (id: number) => api.delete(`/api/vehicle-maintenance/${id}`),
};

// General Inventory API
export const generalInventoryApi = {
  // Items
  getItems: () => api.get("/api/general-inventory/items"),
  getItem: (itemCode: string) =>
    api.get(`/api/general-inventory/items/${itemCode}`),
  createItem: (data: Record<string, unknown>) =>
    api.post("/api/general-inventory/items", data),
  updateItem: (itemCode: string, data: Record<string, unknown>) =>
    api.put(`/api/general-inventory/items/${itemCode}`, data),
  deleteItem: (itemCode: string) =>
    api.delete(`/api/general-inventory/items/${itemCode}`),

  // Categories
  getCategories: () => api.get("/api/general-inventory/categories"),
  createCategory: (category: string) => api.post("/api/general-inventory/categories", { category }),
  updateCategory: (category: string, newCategory: string) => api.put(`/api/general-inventory/categories/${category}`, { newCategory }),
  deleteCategory: (category: string) => api.delete(`/api/general-inventory/categories/${category}`),

  // Transactions
  getTransactions: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/general-inventory/transactions${params.toString() ? "?" + params.toString() : ""}`,
    );
  },

  // Item operations
  issueItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/general-inventory/items/${itemCode}/issue`, data),
  returnItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/general-inventory/items/${itemCode}/return`, data),
  lostItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/general-inventory/items/${itemCode}/lost`, data),
  damagedItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/general-inventory/items/${itemCode}/damaged`, data),
  adjustItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/general-inventory/items/${itemCode}/adjust`, data),
};

// Restricted Inventory API
export const restrictedInventoryApi = {
  // Items
  getItems: () => api.get("/api/restricted-inventory/items"),
  getItem: (itemCode: string) =>
    api.get(`/api/restricted-inventory/items/${itemCode}`),
  createItem: (data: Record<string, unknown>) =>
    api.post("/api/restricted-inventory/items", data),
  updateItem: (itemCode: string, data: Record<string, unknown>) =>
    api.put(`/api/restricted-inventory/items/${itemCode}`, data),
  deleteItem: (itemCode: string) =>
    api.delete(`/api/restricted-inventory/items/${itemCode}`),

  // Categories
  getCategories: () => api.get("/api/restricted-inventory/categories"),
  createCategory: (category: string) => api.post("/api/restricted-inventory/categories", { category }),
  updateCategory: (category: string, newCategory: string) => api.put(`/api/restricted-inventory/categories/${category}`, { newCategory }),
  deleteCategory: (category: string) => api.delete(`/api/restricted-inventory/categories/${category}`),

  // Weapon Regions
  getWeaponRegions: () => api.get("/api/restricted-inventory/weapon-regions"),
  createWeaponRegion: (region: string) => api.post("/api/restricted-inventory/weapon-regions", { region }),
  updateWeaponRegion: (region: string, newRegion: string) => api.put(`/api/restricted-inventory/weapon-regions/${region}`, { newRegion }),
  deleteWeaponRegion: (region: string) => api.delete(`/api/restricted-inventory/weapon-regions/${region}`),

  // Serial Units
  getSerialUnits: (itemCode: string) =>
    api.get(`/api/restricted-inventory/items/${itemCode}/serial-units`),
  createSerialUnit: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/restricted-inventory/items/${itemCode}/serial-units`, data),

  // Transactions
  getTransactions: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/restricted-inventory/transactions${params.toString() ? "?" + params.toString() : ""}`,
    );
  },

  // Serial operations
  issueSerial: (serialUnitId: number, employeeId: string) =>
    api.post(`/api/restricted-inventory/serial-units/${serialUnitId}/issue`, {
      employee_id: employeeId,
    }),
  returnSerial: (serialUnitId: number) =>
    api.post(
      `/api/restricted-inventory/serial-units/${serialUnitId}/return`,
      {},
    ),

  // Quantity operations (for ammunition/consumables)
  issueItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/restricted-inventory/items/${itemCode}/issue`, data),
  returnItem: (itemCode: string, data: Record<string, unknown>) =>
    api.post(`/api/restricted-inventory/items/${itemCode}/return`, data),
};

// Finance API
export const financeApi = {
  // Accounts
  getAccounts: () => api.get("/api/finance/accounts"),
  getAccount: (id: number) => api.get(`/api/finance/accounts/${id}`),
  createAccount: (data: Record<string, unknown>) =>
    api.post("/api/finance/accounts", data),
  updateAccount: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/finance/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete(`/api/finance/accounts/${id}`),

  // Journal Entries
  getJournalEntries: () => api.get("/api/finance/journal-entries"),
  getJournalEntry: (id: number) =>
    api.get(`/api/finance/journal-entries/${id}`),
  createJournalEntry: (data: Record<string, unknown>) =>
    api.post("/api/finance/journal-entries", data),
  updateJournalEntry: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/finance/journal-entries/${id}`, data),
  deleteJournalEntry: (id: number) =>
    api.delete(`/api/finance/journal-entries/${id}`),
  postJournalEntry: (id: number) =>
    api.post(`/api/finance/journal-entries/${id}/post`, {}),
};

// Expenses API
export const expensesApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/expenses${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  getOne: (id: number) => api.get(`/api/expenses/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/expenses", data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/api/expenses/${id}`),
  approve: (id: number) => api.post(`/api/expenses/${id}/approve`, {}),
  pay: (id: number) => api.post(`/api/expenses/${id}/pay`, {}),
  undoPayment: (id: number) => api.post(`/api/expenses/${id}/undo-payment`, {}),
  getMonthlySummary: (month: string) =>
    api.get(`/api/expenses/summary/monthly?month=${month}`),
};

// Advances API
export const advancesApi = {
  // Advances
  getAdvances: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/accounts-advances/advances${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  createAdvance: (data: Record<string, unknown>) =>
    api.post("/api/accounts-advances/advances", data),
  deleteAdvance: (id: number) =>
    api.delete(`/api/accounts-advances/advances/${id}`),

  // Deductions
  getDeductions: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/accounts-advances/deductions${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  upsertDeduction: (data: Record<string, unknown>) =>
    api.put("/api/accounts-advances/deductions", data),

  // Summary
  getSummary: (employeeDbId: number) =>
    api.get(`/api/accounts-advances/summary/${employeeDbId}`),
};

// Users API (SuperUser only)
export const usersApi = {
  getAll: (query?: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get(
      `/api/users${params.toString() ? "?" + params.toString() : ""}`,
    );
  },
  getOne: (id: number) => api.get(`/api/users/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/api/users/${id}`, data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
};

export const companySettingsApi = {
  get: () => api.get('/api/company-settings'),
  update: (data: any) => api.uploadFile('/api/company-settings', data, 'PUT'),
};

export const commonApi = {
  upload: (formData: FormData) => api.uploadFile('/api/uploads', formData),
};

