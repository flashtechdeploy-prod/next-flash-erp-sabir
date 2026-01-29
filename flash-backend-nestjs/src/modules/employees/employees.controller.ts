import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  CreateWarningDto,
} from './dto/employee.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UPLOAD_PATHS,
  getFileInterceptorOptions,
} from '../../common/utils/upload.config';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List employees with pagination and filters' })
  async findAll(@Query() query: EmployeeQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  async create(@Body() createDto: CreateEmployeeDto) {
    return this.employeesService.create(createDto);
  }

  @Delete('all')
  @ApiOperation({ summary: 'Delete all employees (Dangerous)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  async removeAll() {
    return this.employeesService.removeAll();
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get employee KPIs' })
  async getKpis(@Query() query: EmployeeQueryDto) {
    return this.employeesService.getKpis(query);
  }

  @Get('allocated/active')
  @ApiOperation({ summary: 'List active allocated employee IDs' })
  @ApiQuery({ name: 'day', required: false })
  async getActiveAllocated(@Query('day') day?: string) {
    return this.employeesService.getActiveAllocatedIds();
  }

  @Get('departments/list')
  @ApiOperation({ summary: 'Get all unique departments' })
  async getDepartments() {
    return this.employeesService.getDepartments();
  }

  @Get('designations/list')
  @ApiOperation({ summary: 'Get all unique designations' })
  async getDesignations() {
    return this.employeesService.getDesignations();
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Get all unique categories' })
  async getCategories() {
    return this.employeesService.getCategories();
  }

  @Get('bulk-delete-test')
  @ApiOperation({ summary: 'Test endpoint for bulk delete' })
  async bulkDeleteTest() {
    return { status: 'ok' };
  }

  @Put('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete employees' })
  async bulkDelete(@Body() body: { employee_ids: string[] }) {
    return this.employeesService.bulkDelete(body.employee_ids);
  }

  @Get('by-db-id/:employee_db_id')
  @ApiOperation({ summary: 'Get employee by database ID' })
  async findByDbId(@Param('employee_db_id', ParseIntPipe) id: number) {
    return this.employeesService.findByDbId(id);
  }

  @Get(':employee_id')
  @ApiOperation({ summary: 'Get a single employee' })
  async findOne(@Param('employee_id') employee_id: string) {
    return this.employeesService.findOne(employee_id);
  }

  @Put(':employee_id')
  @ApiOperation({ summary: 'Update an employee' })
  async update(
    @Param('employee_id') employee_id: string,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(employee_id, updateDto);
  }

  @Delete(':employee_id')
  @ApiOperation({ summary: 'Delete an employee' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('employee_id') employee_id: string) {
    return this.employeesService.remove(employee_id);
  }

  // Bulk import from CSV
  @Post('import')
  @ApiOperation({ summary: 'Bulk import employees from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportCsvDto })
  @Public()
  @UseInterceptors(
    FileInterceptor(
      'file',
      getFileInterceptorOptions(UPLOAD_PATHS.EMPLOYEES.DOCUMENTS),
    ),
  )
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employeesService.importCsvBuffer(file.buffer);
  }

  @Post(':employee_id/mark-left')
  @ApiOperation({ summary: 'Mark employee as left' })
  @ApiQuery({ name: 'reason', required: false })
  async markLeft(
    @Param('employee_id') employee_id: string,
    @Query('reason') reason?: string,
  ) {
    return this.employeesService.markLeft(employee_id, reason);
  }

  @Post(':employee_id/deactivate')
  @ApiOperation({ summary: 'Deactivate an employee' })
  async deactivate(@Param('employee_id') employee_id: string) {
    return this.employeesService.deactivate(employee_id);
  }

  // Documents endpoints
  @Get('by-db-id/:employee_db_id/documents')
  @ApiOperation({ summary: 'List employee documents' })
  async listDocuments(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
  ) {
    return this.employeesService.listDocuments(employeeDbId);
  }

  @Post('by-db-id/:employee_db_id/documents')
  @ApiOperation({ summary: 'Upload employee document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', getFileInterceptorOptions(UPLOAD_PATHS.EMPLOYEES.DOCUMENTS)))
  async uploadDocument(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('category') category: string,
  ) {
    // Upload to B2 and get URL
    return this.employeesService.uploadDocument(
      employeeDbId,
      name || file.originalname,
      file.originalname,
      file.buffer,
      file.mimetype,
      category,
    );
  }

  @Delete('by-db-id/:employee_db_id/documents/:doc_id')
  @ApiOperation({ summary: 'Delete employee document' })
  async deleteDocument(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
    @Param('doc_id', ParseIntPipe) docId: number,
  ) {
    return this.employeesService.deleteDocument(employeeDbId, docId);
  }

  // Warnings endpoints
  @Get('by-db-id/:employee_db_id/warnings')
  @ApiOperation({ summary: 'List employee warnings' })
  async listWarnings(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
  ) {
    return this.employeesService.listWarnings(employeeDbId);
  }

  @Post('by-db-id/:employee_db_id/warnings')
  @ApiOperation({ summary: 'Create employee warning' })
  async createWarning(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
    @Body() createDto: CreateWarningDto,
  ) {
    return this.employeesService.createWarning(employeeDbId, createDto);
  }

  @Delete('by-db-id/:employee_db_id/warnings/:warning_id')
  @ApiOperation({ summary: 'Delete employee warning' })
  async deleteWarning(
    @Param('employee_db_id', ParseIntPipe) employeeDbId: number,
    @Param('warning_id', ParseIntPipe) warningId: number,
  ) {
    return this.employeesService.deleteWarning(employeeDbId, warningId);
  }

  @Post('fix-legacy-ids')
  @ApiOperation({ summary: 'Migrate SEC- IDs to FSE- format' })
  async fixLegacyIds() {
    return this.employeesService.fixLegacyEmployeeIds();
  }

  @Post('fix-id-by-db-id/:dbId')
  @ApiOperation({ summary: 'Migrate specific employee ID by DB ID' })
  async fixIdByDbId(@Param('dbId', ParseIntPipe) dbId: number) {
    return this.employeesService.fixEmployeeIdByDbId(dbId);
  }

  // Warning documents
  @Get('warnings/:warning_id/documents')
  @ApiOperation({ summary: 'List warning documents' })
  async listWarningDocuments(
    @Param('warning_id', ParseIntPipe) warningId: number,
  ) {
    return this.employeesService.listWarningDocuments(warningId);
  }

  @Post('warnings/:warning_id/documents')
  @ApiOperation({ summary: 'Upload warning document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', getFileInterceptorOptions(UPLOAD_PATHS.EMPLOYEES.WARNINGS)))
  async uploadWarningDocument(
    @Param('warning_id', ParseIntPipe) warningId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Use B2 storage service to upload the file
    return this.employeesService.uploadWarningDocument(
      warningId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete('warnings/:warning_id/documents/:doc_id')
  @ApiOperation({ summary: 'Delete warning document' })
  async deleteWarningDocument(
    @Param('warning_id', ParseIntPipe) warningId: number,
    @Param('doc_id', ParseIntPipe) docId: number,
  ) {
    return this.employeesService.deleteWarningDocument(warningId, docId);
  }
}
