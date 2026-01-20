import { Controller, Get, Put, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/company-settings.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { getFileInterceptorOptions, UPLOAD_PATHS } from 'src/common/utils/upload.config';
import { CloudStorageService } from 'src/common/storage/cloud-storage.service';

@ApiTags('Company Settings')
@Controller('company-settings')
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get company settings' })
  getSettings() {
    return this.companySettingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update company settings' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', getFileInterceptorOptions(UPLOAD_PATHS.GENERAL.IMAGES))
  )
  async updateSettings(
    @Body() updateDto: UpdateCompanySettingsDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    if (logo) {
      const folder = 'company-settings';
      const filename = `${Date.now()}-${logo.originalname}`;
      const logoUrl = await this.cloudStorageService.uploadFile(
        logo.buffer,
        filename,
        logo.mimetype,
        folder,
      );
      updateDto.logo_url = logoUrl.url;
    }
    
    return this.companySettingsService.updateSettings(updateDto);
  }
}
