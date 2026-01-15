const Replicate = require('replicate');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Remove background from an image using Bria's background removal model
 * @param {string} imageUrl - URL or base64 data URL of the image
 * @returns {Promise<string>} - Base64 data URL of the image with transparent background
 */
async function removeBackground(imageUrl) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }

  try {
    console.log('🎨 Starting background removal...');

    // Run the background removal model (Bria RMBG 2.0)
    const output = await replicate.run(
      "bria/rmbg-2.0",
      {
        input: {
          image: imageUrl,
        },
      }
    );

    console.log('✅ Background removal completed');

    // The output is a URL to the processed image
    // Fetch it and convert to base64 for consistency
    if (typeof output === 'string') {
      const response = await fetch(output);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/png';
      
      return `data:${mimeType};base64,${base64}`;
    }

    throw new Error('Unexpected output format from Replicate');
  } catch (error) {
    console.error('Background removal error:', error);
    
    const enhancedError = new Error(error.message || 'Failed to remove background');
    enhancedError.status = error.status || 500;
    enhancedError.code = error.code || 'REPLICATE_ERROR';

    // Handle specific error cases
    if (error.status === 401 || error.message?.includes('authentication')) {
      enhancedError.message = 'Invalid Replicate API token. Please check your REPLICATE_API_TOKEN environment variable.';
      enhancedError.code = 'INVALID_API_KEY';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      enhancedError.message = 'Replicate API rate limit exceeded. Please try again later.';
      enhancedError.code = 'RATE_LIMIT';
    } else if (error.status === 400) {
      enhancedError.message = 'Invalid image format or request. Please check your image.';
      enhancedError.code = 'INVALID_REQUEST';
    }

    throw enhancedError;
  }
}

/**
 * Check if Replicate is configured
 */
function isConfigured() {
  return !!process.env.REPLICATE_API_TOKEN;
}

module.exports = {
  removeBackground,
  isConfigured,
};
