const { GoogleGenerativeAI } = require('@google/generative-ai');
const s3 = require('./s3');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate an image using Gemini's image generation capabilities
 * @param {string} prompt - The design prompt (full prompt from template)
 * @param {string[]} referenceImageUrls - URLs/base64 of reference images
 * @returns {Promise<{url: string, key: string, prompt: string}>}
 */
async function generateImage(prompt, referenceImageUrls = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    // Use Gemini 2.0 Flash with image generation
    const modelName = "gemini-3-pro-image-preview";
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseModalities: ["Text", "Image"],
      },
    });
    console.log(`Using model: ${modelName} for image generation`);

    // Fetch reference images if provided
    const imageParts = [];
    if (referenceImageUrls.length > 0) {
      console.log(`Processing ${referenceImageUrls.length} reference image(s)...`);
      
      for (let i = 0; i < referenceImageUrls.length; i++) {
        const imageUrl = referenceImageUrls[i];
        try {
          let base64Data;
          let mimeType;

          // Check if it's already a base64 data URL
          if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              base64Data = matches[2];
            } else {
              console.warn(`Invalid base64 data URL format for image ${i}`);
              continue;
            }
          } else {
            // Fetch the image from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
              console.warn(`Failed to fetch reference image ${i}: ${imageUrl}`);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            mimeType = response.headers.get('content-type') || 'image/jpeg';
            base64Data = buffer.toString('base64');
          }

          // Add as inline data part with image label
          imageParts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
          console.log(`Successfully loaded reference image ${i} (image_${i}.png)`);
        } catch (error) {
          console.warn(`Error loading reference image ${i}:`, error.message);
        }
      }
    }

    console.log(`Sending request with ${imageParts.length} reference image(s)`);
    console.log('Prompt length:', prompt.length, 'characters');

    // Build parts array: images first (if any), then text prompt
    const parts = [...imageParts, { text: prompt }];

    let result;
    try {
      result = await model.generateContent({
        contents: [{ parts: parts }],
      });
      console.log('Image generation request completed');
    } catch (apiError) {
      console.error('Gemini API error:', apiError.message);

      // Check for model not supporting image generation
      if (apiError.message?.includes('does not support') ||
        apiError.message?.includes('response modalities') ||
        apiError.message?.includes('IMAGE')) {
        const unsupportedError = new Error('Image generation is not supported by this model. Please ensure your Gemini API has image generation enabled.');
        unsupportedError.status = 400;
        unsupportedError.code = 'MODEL_NOT_SUPPORTED';
        throw unsupportedError;
      }

      // Re-throw other errors with status preserved
      const err = new Error(apiError.message);
      err.status = apiError.status || 500;
      throw err;
    }

    const response = result.response;

    // Check if we got an image in the response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        // Check for inline image data (base64 encoded)
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const filename = `generated-design-${Date.now()}.png`;
          const uploaded = await s3.uploadBuffer(
            imageBuffer,
            filename,
            'designs',
            part.inlineData.mimeType
          );

          console.log('Successfully generated and uploaded image');
          return {
            url: uploaded.url,
            key: uploaded.key,
            prompt: prompt.substring(0, 500) + '...', // Truncate for logging
            model: modelName,
            useProxy: true
          };
        }
      }
    }

    // Also check response.parts directly
    if (response.parts && response.parts.length > 0) {
      for (const part of response.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const filename = `generated-design-${Date.now()}.png`;
          const uploaded = await s3.uploadBuffer(
            imageBuffer,
            filename,
            'designs',
            part.inlineData.mimeType
          );

          console.log('Successfully generated and uploaded image');
          return {
            url: uploaded.url,
            key: uploaded.key,
            prompt: prompt.substring(0, 500) + '...',
            model: modelName,
            useProxy: true
          };
        }
      }
    }

    // If no image was generated, throw error with details for debugging
    console.error('No image found in response:', JSON.stringify(response, null, 2));
    throw new Error('No image was generated. The model may not support image generation or the prompt was rejected.');

  } catch (error) {
    console.error('Gemini image generation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    // Preserve the original error status and details
    const enhancedError = new Error(error.message || 'Failed to generate image');
    enhancedError.status = error.status;
    enhancedError.code = error.code;

    // Provide more detailed error messages
    if (error.code === 'AccessControlListNotSupported' || error.message?.includes('does not allow ACLs')) {
      enhancedError.message = 'S3 bucket configuration error. Please check S3 bucket settings.';
      enhancedError.status = 500;
      enhancedError.code = 'S3_CONFIG_ERROR';
    } else if (error.code === 'MODEL_NOT_SUPPORTED') {
      enhancedError.message = error.message || 'Image generation is not supported by this model.';
      enhancedError.status = 400;
      enhancedError.code = 'MODEL_NOT_SUPPORTED';
    } else if (error.status === 400) {
      if (error.message?.includes('does not support') || error.message?.includes('response modalities')) {
        enhancedError.message = 'Image generation is not supported by this model.';
        enhancedError.code = 'MODEL_NOT_SUPPORTED';
      } else if (error.message?.includes('invalid argument') || error.message?.includes('Bad Request')) {
        enhancedError.message = 'Invalid request to AI model. Please check your prompt and try again.';
        enhancedError.code = 'INVALID_REQUEST';
      } else {
        enhancedError.message = 'Bad request to AI service. Please check your prompt and try again.';
        enhancedError.code = 'BAD_REQUEST';
      }
    } else if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('permission denied')) {
      enhancedError.message = 'Permission denied: Your API key may have restrictions, or the Gemini API/image generation may not be enabled for your project. Check: 1) API key restrictions in Google Cloud Console, 2) Gemini API is enabled, 3) Billing is enabled, 4) Model access permissions.';
      enhancedError.code = 'PERMISSION_DENIED';
    } else if (error.status === 503 || error.message?.includes('overloaded')) {
      enhancedError.message = 'AI model is currently overloaded. Please try again later.';
      enhancedError.code = 'MODEL_OVERLOADED';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      enhancedError.message = 'Too many requests. Please wait a moment and try again.';
      enhancedError.code = 'RATE_LIMITED';
    } else if (error.message) {
      enhancedError.message = error.message;
    } else {
      enhancedError.message = 'Failed to generate image. Please try again.';
    }

    throw enhancedError;
  }
}

/**
 * Check if Gemini AI service is configured
 */
function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

module.exports = {
  generateImage,
  isConfigured,
};
