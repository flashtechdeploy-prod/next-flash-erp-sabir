# Backblaze B2 Cloud Storage Integration

## Overview
The application has been configured to use Backblaze B2 Cloud Storage for file uploads instead of local file storage. This provides:
- Scalable cloud storage
- CDN-like file delivery
- Automatic file versioning
- Better security and reliability

## Configuration

### Environment Variables
Add the following to your `.env` file:

```bash
# Backblaze B2 Configuration
B2_KEY_ID=005840bd883f2c00000000007
B2_APPLICATION_KEY=K005HB49tp8rjlemhuLEIsqJSHvihqo
B2_BUCKET_NAME=flash-erp-nest
B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com
B2_REGION=us-west-002
```

> **Important:** The `B2_ENDPOINT` and `B2_REGION` must match your actual Backblaze B2 bucket region. To find your bucket's region:
> 1. Log into your Backblaze B2 account
> 2. Navigate to your bucket settings
> 3. Check the "Endpoint" shown for your bucket (e.g., `s3.us-west-002.backblazeb2.com`)
> 4. Update the values accordingly

### Storage Service Implementations

This application has two B2 storage implementations:

1. **S3-Compatible API** (`src/modules/uploads/uploads.service.ts`)
   - Uses AWS S3 SDK with Backblaze B2's S3-compatible endpoint
   - Used by the general uploads module
   - Requires: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION`

2. **Native B2 SDK** (`src/common/storage/b2-storage.service.ts`)
   - Uses the official Backblaze B2 SDK
   - Used by employee, vehicle, and contract modules
   - Requires: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`
   - Automatically discovers the endpoint during authorization

## Updated Modules

### 1. Employee Documents
**Location:** `src/modules/employees/`
- Files are uploaded to: `employees/{employee_id}/{filename}`
- Accessible via the employees API endpoint
- Documents are stored as full B2 download URLs in the database

### 2. Vehicle Documents  
**Location:** `src/modules/vehicles/`
- Files are uploaded to: `vehicles/{vehicle_id}/{filename}`
- Accessible via the vehicles API endpoint
- Documents are stored as full B2 download URLs in the database

### 3. Contract Documents
**Location:** `src/modules/client-management/`
- Files are uploaded to: `contracts/{contract_id}/{filename}`
- Accessible via the client management API endpoint
- Documents are stored as full B2 download URLs in the database

## Storage Service

**Location:** `src/common/storage/b2-storage.service.ts`

The B2StorageService provides:
- `uploadFile(filePath, fileBuffer, mimeType)` - Upload a file buffer to B2
- `uploadFileFromPath(localPath, remotePath, mimeType)` - Upload from local file system
- `deleteFile(fileId)` - Delete a file from B2
- `getDownloadUrl(filePath)` - Get the full download URL for a file

## File Upload Flow

1. **Frontend** → Uploads file via FormData
2. **Controller** → Receives file and passes buffer to service
3. **Service** → Uses B2StorageService to upload file
4. **B2** → Stores file and returns download URL
5. **Database** → Stores the B2 download URL as `file_path`
6. **Frontend** → Displays images using the B2 download URLs

## Benefits

✅ No local file storage needed
✅ Automatic CDN delivery  
✅ Scalable to any file size
✅ Built-in file versioning
✅ Reliable backup and disaster recovery
✅ Easy file access from frontend

## Testing

To test the B2 integration:

1. Upload a document through the employee/vehicle/contract upload endpoints
2. Check the database to verify the B2 download URL is stored
3. Access the file directly via the B2 URL in a browser
4. Verify images display correctly in the frontend

## Troubleshooting

If uploads fail:
- Verify B2 credentials in environment variables
- Check bucket name matches the B2 account
- Ensure B2 API credentials have write permissions
- Check server logs for detailed error messages

## Future Improvements

- Add file size limits
- Implement file type validation
- Add automatic cleanup of old files
- Implement file encryption
- Add progress tracking for large uploads
