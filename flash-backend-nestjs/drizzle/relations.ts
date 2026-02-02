import { relations } from "drizzle-orm/relations";
import { vehicles, vehicleAssignments, vehicleDocuments, vehicleImages, vehicleMaintenance, invoices, clientPayments, employees, advances, clients, clientContacts, clientContracts, clientSites, clientAddresses, fuelEntries, financeJournalEntries, financeJournalLines, financeAccounts, leavePeriods, payrollPaymentStatus, payrollSheetEntries, employeeAdvanceDeductions, employeeAdvances, users, usersToRoles, roles, rolesToPermissions, permissions } from "./schema";

export const vehicleAssignmentsRelations = relations(vehicleAssignments, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleAssignments.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const vehiclesRelations = relations(vehicles, ({many}) => ({
	vehicleAssignments: many(vehicleAssignments),
	vehicleDocuments: many(vehicleDocuments),
	vehicleImages: many(vehicleImages),
	vehicleMaintenances: many(vehicleMaintenance),
	fuelEntries: many(fuelEntries),
}));

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleDocuments.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleImages.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleMaintenance.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const clientPaymentsRelations = relations(clientPayments, ({one}) => ({
	invoice: one(invoices, {
		fields: [clientPayments.invoiceId],
		references: [invoices.invoiceId]
	}),
}));

export const invoicesRelations = relations(invoices, ({many}) => ({
	clientPayments: many(clientPayments),
}));

export const advancesRelations = relations(advances, ({one}) => ({
	employee: one(employees, {
		fields: [advances.employeeId],
		references: [employees.employeeId]
	}),
}));

export const employeesRelations = relations(employees, ({many}) => ({
	advances: many(advances),
	leavePeriods: many(leavePeriods),
	payrollPaymentStatuses: many(payrollPaymentStatus),
	payrollSheetEntries: many(payrollSheetEntries),
	employeeAdvanceDeductions: many(employeeAdvanceDeductions),
	employeeAdvances: many(employeeAdvances),
}));

export const clientContactsRelations = relations(clientContacts, ({one}) => ({
	client: one(clients, {
		fields: [clientContacts.clientId],
		references: [clients.id]
	}),
}));

export const clientsRelations = relations(clients, ({many}) => ({
	clientContacts: many(clientContacts),
	clientContracts: many(clientContracts),
	clientSites: many(clientSites),
	clientAddresses: many(clientAddresses),
}));

export const clientContractsRelations = relations(clientContracts, ({one}) => ({
	client: one(clients, {
		fields: [clientContracts.clientId],
		references: [clients.id]
	}),
}));

export const clientSitesRelations = relations(clientSites, ({one}) => ({
	client: one(clients, {
		fields: [clientSites.clientId],
		references: [clients.id]
	}),
}));

export const clientAddressesRelations = relations(clientAddresses, ({one}) => ({
	client: one(clients, {
		fields: [clientAddresses.clientId],
		references: [clients.id]
	}),
}));

export const fuelEntriesRelations = relations(fuelEntries, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [fuelEntries.vehicleId],
		references: [vehicles.vehicleId]
	}),
}));

export const financeJournalLinesRelations = relations(financeJournalLines, ({one}) => ({
	financeJournalEntry: one(financeJournalEntries, {
		fields: [financeJournalLines.entryId],
		references: [financeJournalEntries.id]
	}),
	financeAccount: one(financeAccounts, {
		fields: [financeJournalLines.accountId],
		references: [financeAccounts.id]
	}),
}));

export const financeJournalEntriesRelations = relations(financeJournalEntries, ({many}) => ({
	financeJournalLines: many(financeJournalLines),
}));

export const financeAccountsRelations = relations(financeAccounts, ({many}) => ({
	financeJournalLines: many(financeJournalLines),
}));

export const leavePeriodsRelations = relations(leavePeriods, ({one}) => ({
	employee: one(employees, {
		fields: [leavePeriods.employeeId],
		references: [employees.employeeId]
	}),
}));

export const payrollPaymentStatusRelations = relations(payrollPaymentStatus, ({one}) => ({
	employee: one(employees, {
		fields: [payrollPaymentStatus.employeeId],
		references: [employees.employeeId]
	}),
}));

export const payrollSheetEntriesRelations = relations(payrollSheetEntries, ({one}) => ({
	employee: one(employees, {
		fields: [payrollSheetEntries.employeeDbId],
		references: [employees.id]
	}),
}));

export const employeeAdvanceDeductionsRelations = relations(employeeAdvanceDeductions, ({one}) => ({
	employee: one(employees, {
		fields: [employeeAdvanceDeductions.employeeDbId],
		references: [employees.id]
	}),
}));

export const employeeAdvancesRelations = relations(employeeAdvances, ({one}) => ({
	employee: one(employees, {
		fields: [employeeAdvances.employeeDbId],
		references: [employees.id]
	}),
}));

export const usersToRolesRelations = relations(usersToRoles, ({one}) => ({
	user: one(users, {
		fields: [usersToRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [usersToRoles.roleId],
		references: [roles.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	usersToRoles: many(usersToRoles),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	usersToRoles: many(usersToRoles),
	rolesToPermissions: many(rolesToPermissions),
}));

export const rolesToPermissionsRelations = relations(rolesToPermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolesToPermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolesToPermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolesToPermissions: many(rolesToPermissions),
}));