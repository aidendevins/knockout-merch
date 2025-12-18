const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Generate a unique key for S3
 */
function generateKey(filename, folder = '') {
  const ext = path.extname(filename);
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const key = folder 
    ? `${folder}/${timestamp}-${uniqueId}${ext}`
    : `${timestamp}-${uniqueId}${ext}`;
  return key;
}

/**
 * Upload a file buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} folder - S3 folder/prefix
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, key: string}>}
 */
async function uploadBuffer(buffer, filename, folder = 'uploads', contentType = 'image/png') {
  if (!isConfigured()) {
    throw new Error('AWS S3 is not configured');
  }

  const key = generateKey(filename, folder);
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Make publicly readable
    ACL: 'public-read',
  }));

  // Return the public URL
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  
  return { url, key };
}

/**
 * Upload a file from a local path
 */
async function uploadFile(filePath, folder = 'uploads', contentType) {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  return uploadBuffer(buffer, filename, folder, contentType);
}

/**
 * Upload from a URL (download then upload to S3)
 * @param {string} sourceUrl - URL to download from
 * @param {string} folder - S3 folder
 * @returns {Promise<{url: string, key: string}>}
 */
async function uploadFromUrl(sourceUrl, folder = 'uploads') {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/png';
  const ext = contentType.split('/')[1] || 'png';
  
  return uploadBuffer(buffer, `image.${ext}`, folder, contentType);
}

/**
 * Delete a file from S3
 */
async function deleteFile(key) {
  if (!isConfigured()) {
    throw new Error('AWS S3 is not configured');
  }

  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));
  
  return { success: true, key };
}

/**
 * Get a signed URL for temporary access
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Check if S3 is configured
 */
function isConfigured() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * Get public URL for a key
 */
function getPublicUrl(key) {
  // If key already starts with http/https, return as-is
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  
  // Decode URL-encoded characters in the key
  const decodedKey = decodeURIComponent(key);
  
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${decodedKey}`;
}

/**
 * Convert S3 URI (s3://bucket/key) to public HTTP URL
 * @param {string} s3Uri - S3 URI like s3://bucket/key
 * @returns {string} - Public HTTP URL
 */
function convertS3UriToHttpUrl(s3Uri) {
  if (!s3Uri) return s3Uri;
  
  // If it's already an HTTP URL, return as-is
  if (s3Uri.startsWith('http://') || s3Uri.startsWith('https://')) {
    return s3Uri;
  }
  
  // Convert s3://bucket/key format to HTTP URL
  if (s3Uri.startsWith('s3://')) {
    const withoutPrefix = s3Uri.replace(/^s3:\/\//, '');
    const firstSlash = withoutPrefix.indexOf('/');
    
    if (firstSlash === -1) {
      // No key part, just bucket
      return `https://${withoutPrefix}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/`;
    }
    
    const bucket = withoutPrefix.substring(0, firstSlash);
    let key = withoutPrefix.substring(firstSlash + 1);
    
    // Decode any existing URL encoding first (in case it was double-encoded)
    try {
      key = decodeURIComponent(key);
    } catch (e) {
      // If decoding fails, use key as-is
    }
    
    // Encode each path segment separately to preserve slashes
    // This handles spaces and special characters while keeping path structure
    const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
    
    return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${encodedKey}`;
  }
  
  // If it's just a key without prefix, assume it's in our bucket
  let decodedKey = s3Uri;
  try {
    decodedKey = decodeURIComponent(s3Uri);
  } catch (e) {
    // If decoding fails, use as-is
  }
  const encodedKey = decodedKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${encodedKey}`;
}

/**
 * List all objects in the S3 bucket
 * @param {string} prefix - Optional prefix/folder to filter by
 * @param {number} maxKeys - Maximum number of objects to return
 * @returns {Promise<Array<{key: string, url: string, size: number, lastModified: Date}>>}
 */
async function listObjects(prefix = '', maxKeys = 1000) {
  if (!isConfigured()) {
    throw new Error('AWS S3 is not configured');
  }

  const results = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: Math.min(maxKeys - results.length, 1000),
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        // Skip folders (objects ending with /)
        if (obj.Key.endsWith('/')) continue;
        
        // Only include image files
        const ext = path.extname(obj.Key).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          results.push({
            key: obj.Key,
            url: getPublicUrl(obj.Key),
            size: obj.Size,
            lastModified: obj.LastModified,
            filename: path.basename(obj.Key),
          });
        }
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
  } while (continuationToken && results.length < maxKeys);

  return results;
}

/**
 * Extract S3 key from a full S3 URL or S3 URI
 * @param {string} url - The S3 URL or S3 URI
 * @returns {string|null} - The S3 key or null if not an S3 URL/URI
 */
function getKeyFromUrl(url) {
  if (!url) return null;
  
  // Handle s3:// URI format
  if (url.startsWith('s3://')) {
    const withoutPrefix = url.replace(/^s3:\/\//, '');
    const firstSlash = withoutPrefix.indexOf('/');
    if (firstSlash === -1) return null;
    return withoutPrefix.substring(firstSlash + 1);
  }
  
  // Match S3 HTTP URLs: https://bucket.s3.region.amazonaws.com/key
  // or: https://s3.region.amazonaws.com/bucket/key
  const regex1 = new RegExp(`https?://${BUCKET_NAME}\\.s3\\..*\\.amazonaws\\.com/(.+)`);
  const regex2 = new RegExp(`https?://s3\\..*\\.amazonaws\\.com/${BUCKET_NAME}/(.+)`);
  
  let match = url.match(regex1);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch (e) {
      return match[1]; // Return as-is if decoding fails
    }
  }
  
  match = url.match(regex2);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch (e) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get presigned URL from S3 URI or HTTP URL
 * Useful when bucket doesn't have public read access
 * @param {string} urlOrUri - S3 URI or HTTP URL
 * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
async function getPresignedUrlFromUrl(urlOrUri, expiresIn = 3600) {
  if (!isConfigured()) {
    throw new Error('AWS S3 is not configured');
  }
  
  const key = getKeyFromUrl(urlOrUri);
  if (!key) {
    throw new Error(`Could not extract S3 key from URL: ${urlOrUri}`);
  }
  
  return getPresignedUrl(key, expiresIn);
}

module.exports = {
  uploadBuffer,
  uploadFile,
  uploadFromUrl,
  deleteFile,
  getPresignedUrl,
  getPresignedUrlFromUrl,
  getPublicUrl,
  isConfigured,
  generateKey,
  listObjects,
  getKeyFromUrl,
  convertS3UriToHttpUrl,
};
