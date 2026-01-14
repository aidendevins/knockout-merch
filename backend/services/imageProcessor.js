const sharp = require('sharp');
const s3 = require('./s3');

/**
 * Convert black background to white background
 * Uses a threshold approach: replaces pixels that are very close to black with white
 * @param {Buffer|string} imageInput - Image buffer or URL
 * @param {number} threshold - RGB threshold (0-255), pixels below this will be replaced. Default: 15
 * @returns {Promise<Buffer>} - Processed image buffer
 */
async function convertBlackBackgroundToWhite(imageInput, threshold = 15) {
  console.log('[ImageProcessor] convertBlackBackgroundToWhite called with threshold:', threshold);
  let imageBuffer;
  
  // If input is a URL, fetch it first
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    console.log('[ImageProcessor] Fetching image from URL...');
    const response = await fetch(imageInput);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log('[ImageProcessor] Fetched image, size:', imageBuffer.length, 'bytes');
  } else if (Buffer.isBuffer(imageInput)) {
    imageBuffer = imageInput;
    console.log('[ImageProcessor] Using provided buffer, size:', imageBuffer.length, 'bytes');
  } else {
    throw new Error('Invalid image input. Expected Buffer or URL string.');
  }

  // Get image metadata
  console.log('[ImageProcessor] Getting image metadata...');
  const metadata = await sharp(imageBuffer).metadata();
  const { width, height, channels } = metadata;
  console.log('[ImageProcessor] Image dimensions:', width, 'x', height, 'channels:', channels);

  // Extract raw pixel data
  console.log('[ImageProcessor] Extracting raw pixel data...');
  const { data } = await sharp(imageBuffer)
    .ensureAlpha() // Ensure alpha channel exists
    .raw()
    .toBuffer({ resolveWithObject: true });
  console.log('[ImageProcessor] Pixel data extracted, length:', data.length);

  // Process pixels: replace very dark pixels (likely background) with white
  // We check if all RGB channels are below threshold
  console.log('[ImageProcessor] Processing pixels (threshold:', threshold, ')...');
  let pixelsReplaced = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = channels === 4 ? data[i + 3] : 255;

    // If pixel is very dark (all channels below threshold), replace with white
    // Keep alpha channel as-is
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      pixelsReplaced++;
      // Alpha stays the same
    }
  }
  console.log('[ImageProcessor] Replaced', pixelsReplaced, 'pixels (', (pixelsReplaced / (width * height) * 100).toFixed(2), '% of image)');

  // Convert back to image buffer
  console.log('[ImageProcessor] Converting processed pixels back to image buffer...');
  const processedImage = await sharp(data, {
    raw: {
      width,
      height,
      channels: channels || 4,
    },
  })
    .png() // Output as PNG to preserve quality
    .toBuffer();
  
  console.log('[ImageProcessor] White background conversion complete, output size:', processedImage.length, 'bytes');
  return processedImage;
}

/**
 * Process image and upload both versions (black and white) to S3
 * @param {Buffer|string} imageInput - Original image (with black background)
 * @param {string} originalKey - S3 key of the original image (for naming the white version)
 * @returns {Promise<{blackUrl: string, whiteUrl: string, blackKey: string, whiteKey: string}>}
 */
async function processAndCacheBothVersions(imageInput, originalKey) {
  console.log('[ImageProcessor] Starting processAndCacheBothVersions');
  console.log('[ImageProcessor] Input type:', typeof imageInput, 'isBuffer:', Buffer.isBuffer(imageInput));
  console.log('[ImageProcessor] Original key:', originalKey);
  
  // If we already have the original uploaded, use it
  // Otherwise, we need to upload the original first
  let blackKey = originalKey;
  let blackUrl;
  let imageBuffer;

  try {
    if (typeof imageInput === 'string') {
      console.log('[ImageProcessor] Input is URL, fetching...');
      // It's a URL, fetch it
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.status}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
      console.log('[ImageProcessor] Fetched image buffer, size:', imageBuffer.length, 'bytes');
      
      // If no key provided, upload the original
      if (!blackKey) {
        console.log('[ImageProcessor] Uploading black version to S3...');
        const uploaded = await s3.uploadBuffer(
          imageBuffer,
          'design-black.png',
          'designs',
          'image/png'
        );
        blackKey = uploaded.key;
        blackUrl = uploaded.url;
        console.log('[ImageProcessor] Black version uploaded:', blackUrl);
      } else {
        blackUrl = s3.getPublicUrl(blackKey);
        console.log('[ImageProcessor] Using existing black key:', blackKey);
      }
    } else if (Buffer.isBuffer(imageInput)) {
      console.log('[ImageProcessor] Input is Buffer, size:', imageInput.length, 'bytes');
      imageBuffer = imageInput;
      if (!blackKey) {
        console.log('[ImageProcessor] Uploading black version to S3...');
        const uploaded = await s3.uploadBuffer(
          imageBuffer,
          'design-black.png',
          'designs',
          'image/png'
        );
        blackKey = uploaded.key;
        blackUrl = uploaded.url;
        console.log('[ImageProcessor] Black version uploaded:', blackUrl);
      } else {
        blackUrl = s3.getPublicUrl(blackKey);
        console.log('[ImageProcessor] Using existing black key:', blackKey);
      }
    } else {
      throw new Error('Invalid image input. Expected Buffer or URL string.');
    }

    // Generate white background version
    console.log('[ImageProcessor] Converting black background to white...');
    const whiteBuffer = await convertBlackBackgroundToWhite(imageBuffer);
    console.log('[ImageProcessor] White version generated, size:', whiteBuffer.length, 'bytes');

    // Upload white version with similar naming
    const whiteFilename = originalKey 
      ? originalKey.replace(/\.(png|jpg|jpeg)$/i, '-white.png')
      : `design-white-${Date.now()}.png`;
    
    console.log('[ImageProcessor] Uploading white version to S3, filename:', whiteFilename);
    const whiteUploaded = await s3.uploadBuffer(
      whiteBuffer,
      whiteFilename,
      'designs',
      'image/png'
    );
    console.log('[ImageProcessor] White version uploaded:', whiteUploaded.url);

    const result = {
      blackUrl,
      whiteUrl: whiteUploaded.url,
      blackKey,
      whiteKey: whiteUploaded.key,
    };
    
    console.log('[ImageProcessor] Successfully processed both versions:', {
      blackKey: result.blackKey,
      whiteKey: result.whiteKey,
      blackUrl: result.blackUrl,
      whiteUrl: result.whiteUrl
    });
    
    return result;
  } catch (error) {
    console.error('[ImageProcessor] Error processing images:', error);
    console.error('[ImageProcessor] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Get the appropriate image version based on t-shirt color
 * @param {string} blackImageUrl - URL of the black background version
 * @param {string} whiteImageUrl - URL of the white background version
 * @param {string} tshirtColor - 'black' or 'white'
 * @returns {string} - URL of the appropriate version
 */
function getImageForTshirtColor(blackImageUrl, whiteImageUrl, tshirtColor) {
  // For black t-shirt, use black background design
  // For white t-shirt, use white background design
  return tshirtColor === 'white' ? whiteImageUrl : blackImageUrl;
}

module.exports = {
  convertBlackBackgroundToWhite,
  processAndCacheBothVersions,
  getImageForTshirtColor,
};

