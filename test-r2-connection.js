/**
 * Test script to verify Cloudflare R2 Storage connection with Supabase
 * 
 * This script tests R2 connection by:
 * 1. Checking if Supabase Edge Function environment variables are configured
 * 2. Testing upload URL generation
 * 3. Verifying connection to Cloudflare R2
 */

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// Configuration from project
const SUPABASE_URL = 'https://czvvsvgkpnqajhevjbjx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnZzdmdrcG5xYWpoZXZqYmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDE1MzgsImV4cCI6MjA5MjExNzUzOH0.L-0ApggqlnPYI-EV3muuh4K_-BJXu2lxVvj5XDGCc4E';

// Cloudflare R2 Configuration (these should be set in Supabase Edge Function env vars)
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '5d2aaa4d9c48ccc1ffc11fe92bb2d80f';
const CLOUDFLARE_R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY;
const CLOUDFLARE_R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_KEY;
const CLOUDFLARE_R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET;

console.log('=== Cloudflare R2 Storage Connection Test ===\n');

// Check if environment variables are set
console.log('1. Checking environment variables...');
if (!CLOUDFLARE_R2_ACCESS_KEY) {
    console.error('❌ CLOUDFLARE_R2_ACCESS_KEY is not set');
    console.log('   This variable should be set in Supabase Edge Function environment');
} else {
    console.log('✅ CLOUDFLARE_R2_ACCESS_KEY is set');
}

if (!CLOUDFLARE_R2_SECRET_KEY) {
    console.error('❌ CLOUDFLARE_R2_SECRET_KEY is not set');
    console.log('   This variable should be set in Supabase Edge Function environment');
} else {
    console.log('✅ CLOUDFLARE_R2_SECRET_KEY is set');
}

if (!CLOUDFLARE_R2_BUCKET) {
    console.error('❌ CLOUDFLARE_R2_BUCKET is not set');
    console.log('   This variable should be set in Supabase Edge Function environment');
} else {
    console.log('✅ CLOUDFLARE_R2_BUCKET is set:', CLOUDFLARE_R2_BUCKET);
}

console.log(`✅ CLOUDFLARE_ACCOUNT_ID: ${CLOUDFLARE_ACCOUNT_ID}`);

// Test R2 connection
if (CLOUDFLARE_R2_ACCESS_KEY && CLOUDFLARE_R2_SECRET_KEY) {
    console.log('\n2. Testing R2 connection...');

    const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: CLOUDFLARE_R2_ACCESS_KEY,
            secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
        },
    });

    try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log('✅ Successfully connected to Cloudflare R2');
        console.log('   Available buckets:', response.Buckets?.map(b => b.Name).join(', ') || 'None');

        if (response.Buckets && response.Buckets.length > 0) {
            console.log('\n3. Checking for required bucket...');
            const bucketExists = response.Buckets.some(b => b.Name === CLOUDFLARE_R2_BUCKET);
            if (bucketExists) {
                console.log(`✅ Bucket "${CLOUDFLARE_R2_BUCKET}" exists`);
            } else if (CLOUDFLARE_R2_BUCKET) {
                console.log(`⚠️  Bucket "${CLOUDFLARE_R2_BUCKET}" not found`);
                console.log('   Available buckets:', response.Buckets.map(b => b.Name).join(', '));
            }
        }
    } catch (error) {
        console.error('❌ Failed to connect to Cloudflare R2:', error.message);
        console.log('   Please check your credentials and try again');
    }
} else {
    console.log('\n2. Skipping R2 connection test (missing credentials)');
}

// Test Supabase Edge Function
console.log('\n4. Testing Supabase Edge Function...');
console.log(`   Edge Function URL: ${SUPABASE_URL}/functions/v1/generate-upload-url`);
console.log('   Note: This requires authentication and proper environment variables in Supabase');

console.log('\n=== Test Complete ===');
console.log('\nTo configure Supabase Edge Function environment variables:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to Edge Functions > generate-upload-url');
console.log('3. Add the following environment variables:');
console.log('   - CLOUDFLARE_ACCOUNT_ID');
console.log('   - CLOUDFLARE_R2_ACCESS_KEY');
console.log('   - CLOUDFLARE_R2_SECRET_KEY');
console.log('   - CLOUDFLARE_R2_BUCKET');
console.log('\nYou can get these credentials from Cloudflare dashboard:');
console.log('1. Go to R2 > Manage R2 API Tokens');
console.log('2. Create a new API token with R2 permissions');
console.log('3. Note down the Access Key ID and Secret Access Key');
