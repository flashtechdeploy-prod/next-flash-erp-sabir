import { memoryStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Upload configuration for different modules
 * All uploads go to uploads/{module}/{submodule} structure
 */
export const UPLOAD_PATHS = {
  EMPLOYEES: {
    DOCUMENTS: 'uploads/employees/documents',
    PHOTOS: 'uploads/employees/photos',
    WARNINGS: 'uploads/employees/warnings',
  },
  VEHICLES: {
    DOCUMENTS: 'uploads/vehicles/documents',
    IMAGES: 'uploads/vehicles/images',
  },
  CLIENTS: {
    CONTRACTS: 'uploads/clients/contracts',
    DOCUMENTS: 'uploads/clients/documents',
  },
  GENERAL: {
    DOCUMENTS: 'uploads/general/documents',
    IMAGES: 'uploads/general/images',
  },
} as const;



/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalname: string): string {
  const timestamp = Date.now();
  const randomString = Math.round(Math.random() * 1e9);
  const ext = extname(originalname);
  const nameWithoutExt = originalname
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9]/g, '-');
  return `${nameWithoutExt}-${timestamp}-${randomString}${ext}`;
}

/**
 * Create multer storage configuration for a specific upload path
 */
export function createMulterStorage(uploadPath: string) {
  return memoryStorage();
}

/**
 * Get file interceptor options for a specific module
 */
export function getFileInterceptorOptions(uploadPath: string) {
  return {
    storage: createMulterStorage(uploadPath),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (
      _req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      // Allow common file types
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'application/octet-stream',
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            'Invalid file type. Only images, PDFs, Word, Excel, and text files are allowed.',
          ),
          false,
        );
      }
    },
  };
}

/**
 * Initialize (placeholder for potential future init logic)
 */
export function initializeUploadDirectories(): void {
  // No longer needed as we use Backblaze B2
  console.log('✅ Cloud storage ready (Backblaze B2)');
}
