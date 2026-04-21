# Cloudflare R2 Storage Connection Report for CvSira Project

## Executive Summary

The CvSira project is designed to use Cloudflare R2 Storage for file uploads through Supabase Edge Functions. However, the connection is not yet fully configured.

## Current Status

### ✅ What's Working
1. **Supabase Project**: Connected and active (Project ID: `czvvsvgkpnqajhevjbjx`)
2. **Database Tables**: Properly configured with `files` table for tracking uploads
3. **Edge Function**: [`generate-upload-url`](supabase/functions/generate-upload-url/index.ts) is deployed and ready
4. **Frontend Integration**: Upload functionality is implemented in [`frontend/lib/upload.ts`](frontend/lib/upload.ts)
5. **Cloudflare Account**: Connected (Account ID: `5d2aaa4d9c48ccc1ffc11fe92bb2d80f`)

### ❌ What's Missing
1. **R2 Bucket**: No R2 bucket has been created yet
2. **API Credentials**: R2 API tokens have not been generated
3. **Environment Variables**: Supabase Edge Function environment variables are not configured

## Architecture Overview

```
┌─────────────┐
│   Frontend  │ (Next.js)
│  (Browser)   │
└──────┬──────┘
       │
       │ Upload Request
       ▼
┌──────────────────────────────────────┐
│   Supabase Edge Function          │
│   generate-upload-url             │
│   (Needs Environment Variables)    │
└──────┬───────────────────────────┘
       │
       │ Presigned URL
       ▼
┌──────────────────────────────────────┐
│   Cloudflare R2 Storage          │
│   (S3-Compatible API)          │
└──────────────────────────────────────┘
```

## Required Environment Variables

The Supabase Edge Function ([`generate-upload-url`](supabase/functions/generate-upload-url/index.ts)) requires these environment variables:

| Variable | Description | Status |
|-----------|-------------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | ✅ Available: `5d2aaa4d9c48ccc1ffc11fe92bb2d80f` |
| `CLOUDFLARE_R2_ACCESS_KEY` | R2 API Access Key ID | ❌ Not configured |
| `CLOUDFLARE_R2_SECRET_KEY` | R2 API Secret Access Key | ❌ Not configured |
| `CLOUDFLARE_R2_BUCKET` | Name of the R2 bucket | ❌ Not configured |

## Configuration Steps

### Step 1: Create R2 Bucket in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Choose a bucket name (e.g., `cvsira-uploads`)
5. Select location (optional)
6. Click **Create bucket**

### Step 2: Generate R2 API Token

1. In Cloudflare Dashboard, go to **R2 Object Storage**
2. Click **Manage R2 API Tokens**
3. Click **Create API Token**
4. Give it a name (e.g., `cvsira-edge-function`)
5. Set permissions to **Object Read & Write**
6. Click **Create API Token**
7. **Important**: Copy the Access Key ID and Secret Access Key

### Step 3: Configure Supabase Edge Function

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select the **Qalva** project
3. Navigate to **Edge Functions**
4. Click on the **generate-upload-url** function
5. Go to **Environment Variables** tab
6. Add the following variables:
   ```
   CLOUDFLARE_ACCOUNT_ID = 5d2aaa4d9c48ccc1ffc11fe92bb2d80f
   CLOUDFLARE_R2_ACCESS_KEY = <your-access-key-id>
   CLOUDFLARE_R2_SECRET_KEY = <your-secret-access-key>
   CLOUDFLARE_R2_BUCKET = cvsira-uploads
   ```
7. Click **Save**

### Step 4: Test the Connection

Run the test script:
```bash
npm test
```

Or manually:
```bash
node test-r2-connection.js
```

### Step 5: Verify Upload Functionality

1. Start the frontend development server:
   ```bash
   cd frontend && npm run dev
   ```
2. Open `http://localhost:3000`
3. Navigate to the upload page
4. Try uploading a file
5. Check if the upload succeeds

## Database Schema

The [`files`](supabase/migrations/20260420_create_files_table.sql) table stores metadata about uploaded files:

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id TEXT,
  r2_key TEXT,           -- R2 object key
  service_type TEXT,        -- Optional: service that generated the file
  file_name TEXT,          -- Original filename
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## File Upload Flow

1. **Frontend** calls [`uploadFile()`](frontend/lib/upload.ts:125) with file data
2. **Edge Function** generates a presigned URL for R2 upload
3. **Frontend** uploads file directly to R2 using presigned URL
4. **Frontend** saves file metadata to Supabase database
5. **File** is now stored in R2 and tracked in database

## Troubleshooting

### Error: "Server configuration error: missing R2 credentials"
- **Cause**: Environment variables not set in Supabase Edge Function
- **Solution**: Follow Step 3 above

### Error: "Failed to connect to Cloudflare R2"
- **Cause**: Invalid API credentials or network issues
- **Solution**: Verify Access Key ID and Secret Access Key

### Error: "Bucket not found"
- **Cause**: R2 bucket doesn't exist
- **Solution**: Create the bucket following Step 1

### Error: "CORS policy violation"
- **Cause**: R2 bucket CORS policy not configured
- **Solution**: Add CORS policy to allow uploads from your domain

## Next Steps

1. ✅ Create R2 bucket in Cloudflare
2. ✅ Generate R2 API token
3. ✅ Configure Supabase Edge Function environment variables
4. ✅ Test connection using test script
5. ✅ Verify upload functionality in the application

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

**Generated**: 2026-04-21  
**Project**: CvSira v3.1  
**Status**: Configuration Required
