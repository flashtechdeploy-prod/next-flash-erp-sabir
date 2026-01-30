import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
const B2_CONFIG_DEFAULTS = {
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  bucketName: 'flash-erp',
  region: 'us-east-005',
};

@Injectable()
export class CloudStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string;
  private readonly logger = new Logger(CloudStorageService.name);

  constructor(private configService: ConfigService) {

    // Accept both legacy and current B2 key env names so deployments don't break
    const accessKeyId =
      this.configService.get<string>('B2_APPLICATION_KEY_ID') ??
      this.configService.get<string>('B2_KEY_ID');

    const secretAccessKey = this.configService.get<string>('B2_APPLICATION_KEY');
    this.bucketName =
      this.configService.get<string>('B2_BUCKET_NAME') ??
      B2_CONFIG_DEFAULTS.bucketName;
    this.endpoint =
      this.configService.get<string>('B2_ENDPOINT') ??
      B2_CONFIG_DEFAULTS.endpoint;
    const region =
      this.configService.get<string>('B2_REGION') ?? B2_CONFIG_DEFAULTS.region;

    this.logger.log(
      `Checking B2 credentials: KeyID=${accessKeyId?.substring(0, 10)}..., Bucket=${this.bucketName}, Endpoint=${this.endpoint}`,
    );

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucketName ||
      !this.endpoint
    ) {
      this.logger.warn(
        'Missing required Cloud Storage configuration (B2). Cloud uploads will be disabled.',
      );
      return;
    }

    try {
      this.s3Client = new S3Client({
        endpoint: this.endpoint,
        region: region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // Essential for Backblaze B2 S3 compatibility
        forcePathStyle: true,
      });

      this.logger.log(
        `Cloud Storage (B2 S3) initialized. Bucket: ${this.bucketName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize S3 client: ${error.message}`);
    }
  }

  private uuidModulePromise: Promise<typeof import('uuid')> | null = null;

  private async loadUuidModule() {
    // Use runtime dynamic import to avoid require() on ESM uuid after compilation to CJS
    if (!this.uuidModulePromise) {
      const dynamicImport = new Function('specifier', 'return import(specifier);');
      this.uuidModulePromise = dynamicImport('uuid') as Promise<typeof import('uuid')>;
    }
    return this.uuidModulePromise;
  }

  private async generateUuid(): Promise<string> {
    const { v4 } = await this.loadUuidModule();
    return v4();
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    subDir?: string,
  ): Promise<{ filename: string; url: string }> {
    const ext = filename.split('.').pop() || '';
    const uniqueFilename = `${await this.generateUuid()}.${ext}`;
    const key = subDir ? `${subDir}/${uniqueFilename}` : uniqueFilename;

    if (!this.s3Client) {
        // Fallback to local storage
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            const uploadDir = path.join(process.cwd(), 'uploads', subDir || '');
            
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, uniqueFilename);
            fs.writeFileSync(filePath, fileBuffer);
            
            const url = `/uploads/${key}`;
            this.logger.log(`File saved locally: ${filePath}`);
            return { filename: uniqueFilename, url };
        } catch (error) {
             this.logger.error(`Failed to save file locally: ${error.message}`);
             throw error;
        }
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
        }),
      );

      // Construct URL. B2 S3 typically follows: https://{bucket}.{endpoint_host}/{key}
      // But many use the friendly URL: https://f002.backblazeb2.com/file/{bucket}/{key}
      // We'll use the S3 endpoint style if provided, or fallback to friendly
      const url = `${this.endpoint}/${this.bucketName}/${key}`;

      this.logger.log(`File uploaded successfully: ${url}`);
      return { filename: uniqueFilename, url };
    } catch (error) {
      this.logger.error(`Failed to upload to cloud storage: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
       // Local delete
       try {
           const fs = await import('fs');
           const path = await import('path');
           const filePath = path.join(process.cwd(), 'uploads', key);
           if (fs.existsSync(filePath)) {
               fs.unlinkSync(filePath);
               this.logger.log(`Local file deleted: ${key}`);
           }
       } catch(e) {
           this.logger.warn(`Failed to delete local file: ${e.message}`);
       }
       return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Helper to extract key from URL if needed
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const parts = url.split(`${this.bucketName}/`);
      return parts.length > 1 ? parts[1] : null;
    } catch {
      return null;
    }
  }
}
