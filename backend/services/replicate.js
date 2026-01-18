const Replicate = require('replicate');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Remove background from an image using the recraft-ai/recraft-remove-background model
 * @param {string} imageUrl - URL or base64 data URL of the image
 * @returns {Promise<string>} - Base64 data URL of the image with transparent background
 */
async function removeBackground(imageUrl) {
  const startTime = Date.now();
  
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('❌ Background removal failed: REPLICATE_API_TOKEN is not configured');
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎨 BACKGROUND REMOVAL - Starting process');
    console.log('='.repeat(80));
    console.log('📋 Input type:', imageUrl?.startsWith('data:') ? 'Base64 data URL' : 'Image URL');
    console.log('📋 Input length:', imageUrl?.length || 0, 'characters');
    if (!imageUrl?.startsWith('data:')) {
      console.log('📋 Input URL:', imageUrl?.substring(0, 100) + (imageUrl?.length > 100 ? '...' : ''));
    }
    console.log('⏱️  Start time:', new Date().toISOString());
    console.log('-'.repeat(80));

    // Run the background removal model (recraft-ai/recraft-remove-background)
    console.log('🔄 Calling recraft-ai/recraft-remove-background model via Replicate API...');
    const apiStartTime = Date.now();
    
    const output = await replicate.run(
      "recraft-ai/recraft-remove-background",
      {
        input: {
          image: imageUrl,
        },
      }
    );

    const apiDuration = Date.now() - apiStartTime;
    console.log(`✅ recraft-ai/recraft-remove-background model completed in ${apiDuration}ms`);
    console.log('📦 Output type:', typeof output);
    
    if (typeof output === 'string') {
      console.log('📦 Output URL:', output);
    } else {
      console.log('📦 Output structure:', JSON.stringify(output, null, 2).substring(0, 200));
    }

    // The output is a URL to the processed image
    // Fetch it and convert to base64 for consistency
    if (typeof output === 'string') {
      console.log('🔄 Fetching processed image from recraft-ai/recraft-remove-background output URL...');
      const fetchStartTime = Date.now();
      
      const response = await fetch(output);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch processed image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/png';
      
      const fetchDuration = Date.now() - fetchStartTime;
      const totalDuration = Date.now() - startTime;
      
      console.log(`✅ Image fetched and converted in ${fetchDuration}ms`);
      console.log('📊 Processed image stats:');
      console.log('   - MIME type:', mimeType);
      console.log('   - Base64 length:', base64.length, 'characters');
      console.log('   - Approx. size:', Math.round(buffer.length / 1024), 'KB');
      console.log('-'.repeat(80));
      console.log(`✅ BACKGROUND REMOVAL - SUCCESS`);
      console.log(`⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      console.log('='.repeat(80) + '\n');
      
      return `data:${mimeType};base64,${base64}`;
    }

    const error = new Error('Unexpected output format from recraft-ai/recraft-remove-background model');
    console.error('❌ BACKGROUND REMOVAL - FAILED: Unexpected output format from recraft-ai/recraft-remove-background');
    console.error('   Output type:', typeof output);
    console.error('   Output value:', JSON.stringify(output, null, 2).substring(0, 500));
    throw error;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    console.error('\n' + '='.repeat(80));
    console.error('❌ BACKGROUND REMOVAL - FAILED');
    console.error('='.repeat(80));
    console.error('⏱️  Duration before failure:', totalDuration, 'ms');
    console.error('📋 Error type:', error.constructor.name);
    console.error('📋 Error message:', error.message);
    console.error('📋 Error code:', error.code || 'N/A');
    console.error('📋 Error status:', error.status || 'N/A');
    
    if (error.stack) {
      console.error('📋 Stack trace:');
      console.error(error.stack);
    }
    console.error('='.repeat(80) + '\n');
    
    const enhancedError = new Error(error.message || 'Failed to remove background');
    enhancedError.status = error.status || 500;
    enhancedError.code = error.code || 'REPLICATE_ERROR';

    // Handle specific error cases
    if (error.status === 401 || error.message?.includes('authentication')) {
      enhancedError.message = 'Invalid Replicate API token for recraft-ai/recraft-remove-background. Please check your REPLICATE_API_TOKEN environment variable.';
      enhancedError.code = 'INVALID_API_KEY';
      console.error('🔑 Error type: Invalid API Key');
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      enhancedError.message = 'recraft-ai/recraft-remove-background model rate limit exceeded. Please try again later.';
      enhancedError.code = 'RATE_LIMIT';
      console.error('⏳ Error type: Rate Limit Exceeded');
    } else if (error.status === 400) {
      enhancedError.message = 'Invalid image format or request. Please check your image.';
      enhancedError.code = 'INVALID_REQUEST';
      console.error('📝 Error type: Invalid Request');
    } else {
      console.error('⚠️  Error type: Unknown/General Error');
    }

    throw enhancedError;
  }
}

/**
 * Check if Replicate is configured for recraft-ai/recraft-remove-background
 */
function isConfigured() {
  return !!process.env.REPLICATE_API_TOKEN;
}

module.exports = {
  removeBackground,
  isConfigured,
};
