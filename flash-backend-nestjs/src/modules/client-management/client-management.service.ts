import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';

@Injectable()
export class ClientManagementService {
  private logger = new Logger(ClientManagementService.name);

  private async generateClientId(): Promise<string> {
    const prefix = 'FCID-';

    const [lastClient] = await this.db
      .select({ id: schema.clients.id, client_id: schema.clients.client_id })
      .from(schema.clients)
      .orderBy(desc(schema.clients.id))
      .limit(1);

    const nextNumber = (lastClient?.id || 0) + 1;
    const padded = String(nextNumber).padStart(3, '0');
    return `${prefix}${padded}`;
  }

  private async generateContractNumber(): Promise<string> {
    const prefix = 'CTN-';

    const [lastContract] = await this.db
      .select({ id: schema.client_contracts.id })
      .from(schema.client_contracts)
      .orderBy(desc(schema.client_contracts.id))
      .limit(1);

    const nextNumber = (lastContract?.id || 0) + 1;
    const padded = String(nextNumber).padStart(4, '0');
    return `${prefix}${padded}`;
  }

  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private cloudStorageService: CloudStorageService,
  ) {}

  // Clients
  async listClients() {
    return this.db
      .select({
        id: schema.clients.id,
        client_id: schema.clients.client_id,
        name: schema.clients.name,
        company_name: schema.clients.company_name,
        email: schema.clients.email,
        phone: schema.clients.phone,
        address: schema.clients.address,
        industry: sql<string>`COALESCE(${schema.industries.name}, ${schema.clients.industry})`,
        industry_id: schema.clients.industry_id,
        status: schema.clients.status,
        notes: schema.clients.notes,
        created_at: schema.clients.created_at,
      })
      .from(schema.clients)
      .leftJoin(schema.industries, eq(schema.clients.industry_id, schema.industries.id))
      .orderBy(desc(schema.clients.id));
  }

  async getClient(id: number) {
    const [client] = await this.db
      .select({
        id: schema.clients.id,
        client_id: schema.clients.client_id,
        name: schema.clients.name,
        company_name: schema.clients.company_name,
        email: schema.clients.email,
        phone: schema.clients.phone,
        address: schema.clients.address,
        industry: sql<string>`COALESCE(${schema.industries.name}, ${schema.clients.industry})`,
        industry_id: schema.clients.industry_id,
        status: schema.clients.status,
        notes: schema.clients.notes,
        created_at: schema.clients.created_at,
      })
      .from(schema.clients)
      .leftJoin(schema.industries, eq(schema.clients.industry_id, schema.industries.id))
      .where(eq(schema.clients.id, id));
    if (!client) throw new NotFoundException('Client not found');

    const contacts = await this.db
      .select()
      .from(schema.client_contacts)
      .where(eq(schema.client_contacts.client_id, id));
    const addresses = await this.db
      .select()
      .from(schema.client_addresses)
      .where(eq(schema.client_addresses.client_id, id));
    const sites = await this.db
      .select()
      .from(schema.client_sites)
      .where(eq(schema.client_sites.client_id, id));
    const contracts = await this.db
      .select()
      .from(schema.client_contracts)
      .where(eq(schema.client_contracts.client_id, id));

    return { ...client, contacts, addresses, sites, contracts };
  }

  async createClient(dto: any) {
    const data: any = { ...dto };

    if (!data.client_id) {
      data.client_id = await this.generateClientId();
    }

    const [result] = await this.db
      .insert(schema.clients)
      .values(data)
      .returning();
    return result;
  }

  async updateClient(id: number, dto: any) {
    await this.getClient(id);
    const data: any = { ...dto };

    await this.db
      .update(schema.clients)
      .set(data)
      .where(eq(schema.clients.id, id));
    return this.getClient(id);
  }

  async deleteClient(id: number) {
    await this.getClient(id);
    await this.db.delete(schema.clients).where(eq(schema.clients.id, id));
    return { message: 'Deleted' };
  }

  // Contacts
  async listContacts(clientId: number) {
    return this.db
      .select()
      .from(schema.client_contacts)
      .where(eq(schema.client_contacts.client_id, clientId));
  }

  async createContact(clientId: number, dto: any) {
    const data: any = { ...dto, client_id: clientId };
    const [result] = await this.db
      .insert(schema.client_contacts)
      .values(data)
      .returning();
    return result;
  }

  async updateContact(clientId: number, id: number, dto: any) {
    const [contact] = await this.db
      .select()
      .from(schema.client_contacts)
      .where(
        and(
          eq(schema.client_contacts.id, id),
          eq(schema.client_contacts.client_id, clientId),
        ),
      );
    if (!contact) throw new NotFoundException('Contact not found');

    const data: any = { ...dto };

    await this.db
      .update(schema.client_contacts)
      .set(data)
      .where(eq(schema.client_contacts.id, id));
    const [updatedContact] = await this.db
      .select()
      .from(schema.client_contacts)
      .where(eq(schema.client_contacts.id, id));
    return updatedContact;
  }

  async deleteContact(clientId: number, id: number) {
    await this.db
      .delete(schema.client_contacts)
      .where(
        and(
          eq(schema.client_contacts.id, id),
          eq(schema.client_contacts.client_id, clientId),
        ),
      );
    return { message: 'Deleted' };
  }

  // Addresses
  async listAddresses(clientId: number) {
    return this.db
      .select()
      .from(schema.client_addresses)
      .where(eq(schema.client_addresses.client_id, clientId));
  }

  async createAddress(clientId: number, dto: any) {
    const data: any = { ...dto, client_id: clientId };
    const [result] = await this.db
      .insert(schema.client_addresses)
      .values(data)
      .returning();
    return result;
  }

  async updateAddress(clientId: number, id: number, dto: any) {
    const data: any = { ...dto };
    await this.db
      .update(schema.client_addresses)
      .set(data)
      .where(
        and(
          eq(schema.client_addresses.id, id),
          eq(schema.client_addresses.client_id, clientId),
        ),
      );
    const [updatedAddress] = await this.db
      .select()
      .from(schema.client_addresses)
      .where(eq(schema.client_addresses.id, id));
    return updatedAddress;
  }

  async deleteAddress(clientId: number, id: number) {
    await this.db
      .delete(schema.client_addresses)
      .where(
        and(
          eq(schema.client_addresses.id, id),
          eq(schema.client_addresses.client_id, clientId),
        ),
      );
    return { message: 'Deleted' };
  }

  // Sites
  async listSites(clientId: number) {
    return this.db
      .select()
      .from(schema.client_sites)
      .where(eq(schema.client_sites.client_id, clientId));
  }

  async createSite(clientId: number, dto: any) {
    const data: any = { ...dto, client_id: clientId };
    const [result] = await this.db
      .insert(schema.client_sites)
      .values(data)
      .returning();
    return result;
  }

  async updateSite(clientId: number, id: number, dto: any) {
    const data: any = { ...dto };
    await this.db
      .update(schema.client_sites)
      .set(data)
      .where(
        and(
          eq(schema.client_sites.id, id),
          eq(schema.client_sites.client_id, clientId),
        ),
      );
    const [updatedSite] = await this.db
      .select()
      .from(schema.client_sites)
      .where(eq(schema.client_sites.id, id));
    return updatedSite;
  }

  async deleteSite(clientId: number, id: number) {
    await this.db
      .delete(schema.client_sites)
      .where(
        and(
          eq(schema.client_sites.id, id),
          eq(schema.client_sites.client_id, clientId),
        ),
      );
    return { message: 'Deleted' };
  }

  // Contracts
  async listContracts(clientId: number) {
    return this.db
      .select()
      .from(schema.client_contracts)
      .where(eq(schema.client_contracts.client_id, clientId));
  }

  async createContract(clientId: number, dto: any) {
    const data: any = { ...dto, client_id: clientId };

    if (!data.contract_number) {
      data.contract_number = await this.generateContractNumber();
    }

    const [result] = await this.db
      .insert(schema.client_contracts)
      .values(data)
      .returning();
    return result;
  }

  async updateContract(clientId: number, id: number, dto: any) {
    const data: any = { ...dto };
    await this.db
      .update(schema.client_contracts)
      .set(data)
      .where(
        and(
          eq(schema.client_contracts.id, id),
          eq(schema.client_contracts.client_id, clientId),
        ),
      );
    const [updatedContract] = await this.db
      .select()
      .from(schema.client_contracts)
      .where(eq(schema.client_contracts.id, id));
    return updatedContract;
  }

  async deleteContract(clientId: number, id: number) {
    await this.db
      .delete(schema.client_contracts)
      .where(
        and(
          eq(schema.client_contracts.id, id),
          eq(schema.client_contracts.client_id, clientId),
        ),
      );
    return { message: 'Deleted' };
  }

  // Contract Documents
  async uploadContractDocument(contractId: number, file: Express.Multer.File) {
    try {
      // Upload to Cloud Storage
      this.logger.log(`Uploading contract document to cloud: contracts/${contractId}/${file.originalname}`);
      const { url } = await this.cloudStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype || 'application/octet-stream',
        `contracts/${contractId}`,
      );

      // Store reference in database
      const data: any = {
        contract_id: contractId,
        filename: file.originalname,
        file_path: url, 
        file_type: file.mimetype,
        file_size: file.size,
      };
      const [result] = await this.db
        .insert(schema.client_contract_documents)
        .values(data)
        .returning();
      
      this.logger.log(`Contract document uploaded successfully: ${file.originalname}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload contract document for contract ${contractId}:`, error);
      throw error;
    }
  }

  async listContractDocuments(contractId: number) {
    return this.db
      .select()
      .from(schema.client_contract_documents)
      .where(eq(schema.client_contract_documents.contract_id, contractId));
  }

  async deleteContractDocument(contractId: number, documentId: number) {
    await this.db
      .delete(schema.client_contract_documents)
      .where(
        and(
          eq(schema.client_contract_documents.id, documentId),
          eq(schema.client_contract_documents.contract_id, contractId),
        ),
      );
    return { message: 'Deleted' };
  }

  // Guard Assignments
  async assignGuard(siteId: number, dto: any) {
    const data: any = {
      site_id: siteId,
      employee_id: dto.employee_id,
      assignment_date: dto.assignment_date,
      shift: dto.shift,
      notes: dto.notes,
      status: 'active',
    };
    const [result] = await this.db
      .insert(schema.site_guard_assignments)
      .values(data)
      .returning();
    return result;
  }

  async listSiteGuards(siteId: number) {
    const assignments = await this.db
      .select()
      .from(schema.site_guard_assignments)
      .where(eq(schema.site_guard_assignments.site_id, siteId))
      .orderBy(desc(schema.site_guard_assignments.id));

    // Fetch employee details for each assignment
    const enriched = await Promise.all(
      assignments.map(async (assignment) => {
        const [employee] = await this.db
          .select()
          .from(schema.employees)
          .where(eq(schema.employees.employee_id, assignment.employee_id));
        return {
          ...assignment,
          employee_name:
            employee?.full_name || employee?.first_name || 'Unknown',
          employee_photo: employee?.profile_photo,
        };
      }),
    );

    return enriched;
  }

  async ejectGuard(siteId: number, assignmentId: number, dto: any) {
    await this.db
      .update(schema.site_guard_assignments)
      .set({
        status: 'ejected',
        end_date: dto.end_date,
        notes: dto.notes || null,
      })
      .where(
        and(
          eq(schema.site_guard_assignments.id, assignmentId),
          eq(schema.site_guard_assignments.site_id, siteId),
        ),
      );

    const [updated] = await this.db
      .select()
      .from(schema.site_guard_assignments)
      .where(eq(schema.site_guard_assignments.id, assignmentId));
    return updated;
  }

  async getAvailableGuards() {
    try {
      const allEmployees = await this.db
        .select()
        .from(schema.employees);
      
      const activeEmployees = allEmployees.filter(emp => 
        emp.status?.toLowerCase() === 'active'
      );

      const assignedGuards = await this.db
        .select()
        .from(schema.site_guard_assignments)
        .where(eq(schema.site_guard_assignments.status, 'active'));

      const assignedEmployeeIds = new Set(
        assignedGuards.map((a) => a.employee_id),
      );

      // Filter out assigned guards
      const available = activeEmployees.filter(
        (emp) => !assignedEmployeeIds.has(emp.employee_id),
      );

      return { guards: available };
    } catch (error) {
      this.logger.error('Failed to get available guards:', error);
      throw error;
    }
  }

  async listAllActiveAssignments() {
    return this.db
      .select({
        assignment_id: schema.site_guard_assignments.id,
        employee_id: schema.site_guard_assignments.employee_id,
        site_id: schema.client_sites.id,
        site_name: schema.client_sites.name,
        client_id: schema.clients.id,
        client_name: schema.clients.name,
        shift: schema.site_guard_assignments.shift,
      })
      .from(schema.site_guard_assignments)
      .innerJoin(
        schema.client_sites,
        eq(schema.site_guard_assignments.site_id, schema.client_sites.id),
      )
      .innerJoin(
        schema.clients,
        eq(schema.client_sites.client_id, schema.clients.id),
      )
      .where(eq(schema.site_guard_assignments.status, 'active'));
  }

  // Industries
  async listIndustries() {
    return this.db
      .select()
      .from(schema.industries)
      .orderBy(desc(schema.industries.id));
  }

  async createIndustry(dto: any) {
    const [result] = await this.db
      .insert(schema.industries)
      .values(dto)
      .returning();
    return result;
  }

  async updateIndustry(id: number, dto: any) {
    await this.db
      .update(schema.industries)
      .set(dto)
      .where(eq(schema.industries.id, id));
    
    const [updated] = await this.db
      .select()
      .from(schema.industries)
      .where(eq(schema.industries.id, id));
    return updated;
  }

  async deleteIndustry(id: number) {
    await this.db.delete(schema.industries).where(eq(schema.industries.id, id));
    return { message: 'Deleted' };
  }


}
