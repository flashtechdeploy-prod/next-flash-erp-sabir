import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientManagementService } from './client-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UPLOAD_PATHS,
  getFileInterceptorOptions,
} from '../../common/utils/upload.config';

@ApiTags('Client Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-management')
export class ClientManagementController {
  constructor(private readonly service: ClientManagementService) {}

  // Clients
  @Get('clients')
  @ApiOperation({ summary: 'List clients' })
  async listClients() {
    return this.service.listClients();
  }

  @Post('clients')
  @ApiOperation({ summary: 'Create client' })
  async createClient(@Body() dto: any) {
    return this.service.createClient(dto);
  }

  @Get('clients/:client_id')
  @ApiOperation({ summary: 'Get client' })
  async getClient(@Param('client_id', ParseIntPipe) id: number) {
    return this.service.getClient(id);
  }

  @Put('clients/:client_id')
  @ApiOperation({ summary: 'Update client' })
  async updateClient(
    @Param('client_id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.updateClient(id, dto);
  }

  @Delete('clients/:client_id')
  @ApiOperation({ summary: 'Delete client' })
  async deleteClient(@Param('client_id', ParseIntPipe) id: number) {
    return this.service.deleteClient(id);
  }

  // Contacts
  @Get('clients/:client_id/contacts')
  async listContacts(@Param('client_id', ParseIntPipe) clientId: number) {
    return this.service.listContacts(clientId);
  }

  @Post('clients/:client_id/contacts')
  async createContact(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Body() dto: any,
  ) {
    return this.service.createContact(clientId, dto);
  }

  @Put('clients/:client_id/contacts/:contact_id')
  async updateContact(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('contact_id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.updateContact(clientId, id, dto);
  }

  @Delete('clients/:client_id/contacts/:contact_id')
  async deleteContact(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('contact_id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteContact(clientId, id);
  }

  // Addresses
  @Get('clients/:client_id/addresses')
  async listAddresses(@Param('client_id', ParseIntPipe) clientId: number) {
    return this.service.listAddresses(clientId);
  }

  @Post('clients/:client_id/addresses')
  async createAddress(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Body() dto: any,
  ) {
    return this.service.createAddress(clientId, dto);
  }

  @Put('clients/:client_id/addresses/:address_id')
  async updateAddress(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('address_id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.updateAddress(clientId, id, dto);
  }

  @Delete('clients/:client_id/addresses/:address_id')
  async deleteAddress(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('address_id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteAddress(clientId, id);
  }

  // Sites
  @Get('clients/:client_id/sites')
  async listSites(@Param('client_id', ParseIntPipe) clientId: number) {
    return this.service.listSites(clientId);
  }

  @Post('clients/:client_id/sites')
  async createSite(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Body() dto: any,
  ) {
    return this.service.createSite(clientId, dto);
  }

  @Put('clients/:client_id/sites/:site_id')
  async updateSite(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('site_id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.updateSite(clientId, id, dto);
  }

  @Delete('clients/:client_id/sites/:site_id')
  async deleteSite(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('site_id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteSite(clientId, id);
  }

  // Contracts
  @Get('clients/:client_id/contracts')
  async listContracts(@Param('client_id', ParseIntPipe) clientId: number) {
    return this.service.listContracts(clientId);
  }

  @Post('clients/:client_id/contracts')
  async createContract(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Body() dto: any,
  ) {
    return this.service.createContract(clientId, dto);
  }

  @Put('clients/:client_id/contracts/:contract_id')
  async updateContract(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('contract_id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.updateContract(clientId, id, dto);
  }

  @Delete('clients/:client_id/contracts/:contract_id')
  async deleteContract(
    @Param('client_id', ParseIntPipe) clientId: number,
    @Param('contract_id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteContract(clientId, id);
  }

  // Contract Documents
  @Post('contracts/:contract_id/documents')
  @ApiOperation({ summary: 'Upload contract document' })
  @UseInterceptors(
    FileInterceptor(
      'file',
      getFileInterceptorOptions(UPLOAD_PATHS.CLIENTS.CONTRACTS),
    ),
  )
  async uploadContractDocument(
    @Param('contract_id', ParseIntPipe) contractId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadContractDocument(contractId, file);
  }

  @Get('contracts/:contract_id/documents')
  @ApiOperation({ summary: 'List contract documents' })
  async listContractDocuments(
    @Param('contract_id', ParseIntPipe) contractId: number,
  ) {
    return this.service.listContractDocuments(contractId);
  }

  @Delete('contracts/:contract_id/documents/:document_id')
  @ApiOperation({ summary: 'Delete contract document' })
  async deleteContractDocument(
    @Param('contract_id', ParseIntPipe) contractId: number,
    @Param('document_id', ParseIntPipe) documentId: number,
  ) {
    return this.service.deleteContractDocument(contractId, documentId);
  }

  // Guard Assignments
  @Post('sites/:site_id/guards')
  @ApiOperation({ summary: 'Assign guard to site' })
  async assignGuard(
    @Param('site_id', ParseIntPipe) siteId: number,
    @Body() dto: any,
  ) {
    return this.service.assignGuard(siteId, dto);
  }

  @Get('sites/:site_id/guards')
  @ApiOperation({ summary: 'List site guards' })
  async listSiteGuards(@Param('site_id', ParseIntPipe) siteId: number) {
    return this.service.listSiteGuards(siteId);
  }

  @Put('sites/:site_id/guards/:assignment_id/eject')
  @ApiOperation({ summary: 'Eject guard from site' })
  async ejectGuard(
    @Param('site_id', ParseIntPipe) siteId: number,
    @Param('assignment_id', ParseIntPipe) assignmentId: number,
    @Body() dto: any,
  ) {
    return this.service.ejectGuard(siteId, assignmentId, dto);
  }

  @Get('assignments/active')
  @ApiOperation({ summary: 'List all active guard assignments with client info' })
  async getActiveAssignments() {
    return this.service.listAllActiveAssignments();
  }

  @Get('guards/available')
  @ApiOperation({ summary: 'Get available guards' })
  async getAvailableGuards() {
    return this.service.getAvailableGuards();
  }

  // Industries
  @Get('industries')
  @ApiOperation({ summary: 'List industries' })
  async listIndustries() {
    return this.service.listIndustries();
  }

  @Post('industries')
  @ApiOperation({ summary: 'Create industry' })
  async createIndustry(@Body() dto: any) {
    return this.service.createIndustry(dto);
  }

  @Put('industries/:id')
  @ApiOperation({ summary: 'Update industry' })
  async updateIndustry(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateIndustry(id, dto);
  }

  @Delete('industries/:id')
  @ApiOperation({ summary: 'Delete industry' })
  async deleteIndustry(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteIndustry(id);
  }
}
