import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UPLOAD_PATHS,
  getFileInterceptorOptions,
} from '../../common/utils/upload.config';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor(
      'file',
      getFileInterceptorOptions(UPLOAD_PATHS.GENERAL.DOCUMENTS),
    ),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('subDir') subDir?: string,
  ) {
    return this.uploadsService.saveFile(file, subDir);
  }
}
