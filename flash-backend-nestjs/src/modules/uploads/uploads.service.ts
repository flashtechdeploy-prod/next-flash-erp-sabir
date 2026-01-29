import { Injectable, Logger } from '@nestjs/common';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private cloudStorageService: CloudStorageService) {}

  async saveFile(
    file: Express.Multer.File,
    subDir?: string,
  ): Promise<{ filename: string; url: string }> {
    this.logger.log(`Forwarding upload to CloudStorageService: ${file.originalname}`);
    
    return this.cloudStorageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      subDir || 'general',
    );
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.cloudStorageService.deleteFile(filePath);
  }
}