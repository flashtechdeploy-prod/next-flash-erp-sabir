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
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import {
  UPLOAD_PATHS,
  getFileInterceptorOptions,
} from '../../common/utils/upload.config';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAll(
    @Query('skip') skip?: number, 
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    return this.vehiclesService.findAll(skip, limit, category);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle' })
  async create(@Body() createDto: CreateVehicleDto) {
    return this.vehiclesService.create(createDto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import vehicles from JSON' })
  async importVehicles(@Body() vehicles: any[]) {
    return this.vehiclesService.importBulk(vehicles);
  }

  @Post('import-bulk')
  @ApiOperation({ summary: 'Bulk import vehicles' })
  async importBulk(@Body() vehicles: any[]) {
    return this.vehiclesService.importBulk(vehicles);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get distinct vehicle categories' })
  async getCategories() {
    return this.vehiclesService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new vehicle category' })
  async createCategory(@Body() body: { name: string }) {
    return this.vehiclesService.addCategory(body.name);
  }

  @Put('categories')
  @ApiOperation({ summary: 'Update vehicle category (bulk update)' })
  async updateCategory(@Body() body: { oldCategory: string; newCategory: string }) {
    return this.vehiclesService.updateCategory(body.oldCategory, body.newCategory);
  }

  @Delete('categories')
  @ApiOperation({ summary: 'Delete vehicle category (mark as Uncategorized)' })
  async deleteCategory(@Body() body: { category: string }) {
    return this.vehiclesService.deleteCategory(body.category);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get distinct vehicle types' })
  async getTypes() {
    return this.vehiclesService.getTypes();
  }

  @Post('types')
  @ApiOperation({ summary: 'Create a new vehicle type' })
  async createType(@Body() body: { name: string }) {
    return this.vehiclesService.addType(body.name);
  }

  @Put('types')
  @ApiOperation({ summary: 'Update vehicle type (bulk update)' })
  async updateType(@Body() body: { oldType: string; newType: string }) {
    return this.vehiclesService.updateType(body.oldType, body.newType);
  }

  @Delete('types')
  @ApiOperation({ summary: 'Delete vehicle type (mark as Other)' })
  async deleteType(@Body() body: { type: string }) {
    return this.vehiclesService.deleteType(body.type);
  }

  @Get(':vehicle_id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  async findOne(@Param('vehicle_id') vehicle_id: string) {
    return this.vehiclesService.findOne(vehicle_id);
  }

  @Put(':vehicle_id')
  @ApiOperation({ summary: 'Update vehicle' })
  async update(
    @Param('vehicle_id') vehicle_id: string,
    @Body() updateDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(vehicle_id, updateDto);
  }

  @Delete(':vehicle_id')
  @ApiOperation({ summary: 'Delete vehicle' })
  async remove(@Param('vehicle_id') vehicle_id: string) {
    return this.vehiclesService.remove(vehicle_id);
  }

  // Documents
  @Get(':vehicle_id/documents')
  @ApiOperation({ summary: 'List vehicle documents' })
  async listDocuments(@Param('vehicle_id') vehicle_id: string) {
    return this.vehiclesService.listDocuments(vehicle_id);
  }

  @Post(':vehicle_id/documents')
  @ApiOperation({ summary: 'Upload vehicle document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', getFileInterceptorOptions(UPLOAD_PATHS.VEHICLES.DOCUMENTS)))
  async uploadDocument(
    @Param('vehicle_id') vehicle_id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.vehiclesService.uploadDocument(
      vehicle_id,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete(':vehicle_id/documents/:doc_id')
  @ApiOperation({ summary: 'Delete vehicle document' })
  async deleteDocument(
    @Param('vehicle_id') vehicle_id: string,
    @Param('doc_id', ParseIntPipe) doc_id: number,
  ) {
    return this.vehiclesService.deleteDocument(vehicle_id, doc_id);
  }

  // Images
  @Get(':vehicle_id/images')
  @ApiOperation({ summary: 'List vehicle images' })
  async listImages(@Param('vehicle_id') vehicle_id: string) {
    return this.vehiclesService.listImages(vehicle_id);
  }

  @Post(':vehicle_id/images')
  @ApiOperation({ summary: 'Upload vehicle image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', getFileInterceptorOptions(UPLOAD_PATHS.VEHICLES.IMAGES)))
  async uploadImage(
    @Param('vehicle_id') vehicle_id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.vehiclesService.uploadImage(
      vehicle_id,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete(':vehicle_id/images/:image_id')
  @ApiOperation({ summary: 'Delete vehicle image' })
  async deleteImage(
    @Param('vehicle_id') vehicle_id: string,
    @Param('image_id', ParseIntPipe) image_id: number,
  ) {
    return this.vehiclesService.deleteImage(vehicle_id, image_id);
  }
}
