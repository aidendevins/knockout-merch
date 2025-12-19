const { GoogleGenerativeAI } = require('@google/generative-ai');
const s3 = require('./s3');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate an image using Gemini's image generation capabilities
 * Using Gemini 2.0 Flash with image generation
 * @param {string} prompt - The design prompt
 * @param {string[]} referenceImageUrls - URLs of reference images (fight stills)
 * @returns {Promise<{url: string, prompt: string}>}
 */
async function generateImage(prompt, referenceImageUrls = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    // Try models that support image generation
    // Note: Image generation is available in specific models only
    const imageGenerationModels = [
      "gemini-2.5-flash-image",  // Experimental with image support
      "gemini-1.5-pro",        // Pro model (may support images)
      "gemini-1.5-flash",      // Flash model
    ];
    
    let model;
    let modelName;
    
    // Try to use a model that supports image generation
    // Start with the experimental model
    modelName = imageGenerationModels[0];
    model = genAI.getGenerativeModel({ 
      model: modelName
    });
    console.log(`Using model: ${modelName} for image generation`);

    // Build the prompt with design-specific instructions
    let designPrompt = `Create a bold, high-contrast t-shirt design image based on this description:

${prompt}

Style requirements:
- Suitable for t-shirt/hoodie printing
- Bold, dramatic, eye-catching
- High contrast colors
- Clean edges suitable for print
- No background or transparent background if possible
- Celebrating a knockout victory in boxing
- Professional merchandise quality

Generate only the design image, no mockups.`;

    // Add reference image context if provided
    if (referenceImageUrls.length > 0) {
      designPrompt += `\n\nUse these reference images as inspiration for the boxing/knockout theme: ${referenceImageUrls.join(', ')}`;
    }

    // Generate image - try different API formats based on model capabilities
    let result;
    let lastError;
    
    // First, try with the full image generation config (correct aspect ratio format)
    try {
      result = await model.generateContent({
        contents: [{ parts: [{ text: designPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '1:1', // Use string format '1:1' not 'SQUARE'
            imageSize: 'MEDIUM',
          },
        },
      });
      console.log('Image generation successful with full config');
    } catch (configError) {
      lastError = configError;
      // If that fails with 400, the config format might be wrong
      if (configError.status === 400) {
        console.warn('Image config format error, trying without imageConfig:', configError.message);
        try {
          // Try with just responseModalities (no imageConfig)
          result = await model.generateContent({
            contents: [{ parts: [{ text: designPrompt }] }],
            generationConfig: {
              responseModalities: ['IMAGE'],
            },
          });
          console.log('Image generation successful with responseModalities only');
        } catch (altError) {
          lastError = altError;
          // If that also fails, the model might not support image generation
          if (altError.message?.includes('does not support') || altError.message?.includes('response modalities')) {
            console.error('Model does not support image generation:', altError.message);
            const unsupportedError = new Error('Image generation is not supported by this model. Please use a model that supports image generation (e.g., gemini-2.0-flash-exp with image generation enabled).');
            unsupportedError.status = 400;
            unsupportedError.code = 'MODEL_NOT_SUPPORTED';
            throw unsupportedError;
          }
          // Re-throw other errors
          throw altError;
        }
      } else {
        // Re-throw non-400 errors
        throw configError;
      }
    }

    const response = result.response;
    
    // Check if we got an image in the response
    // The response structure may vary, so check multiple possible locations
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
          
          // Generate presigned URL (valid for 7 days) to avoid CORS issues
          const presignedUrl = await s3.getPresignedUrl(uploaded.key, 7 * 24 * 3600);
          
          return {
            url: presignedUrl, // Use presigned URL instead of public URL
            key: uploaded.key,
            prompt: prompt,
            model: modelName || 'gemini-2.0-flash-exp'
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
          
          // Generate presigned URL (valid for 7 days) to avoid CORS issues
          const presignedUrl = await s3.getPresignedUrl(uploaded.key, 7 * 24 * 3600);
          
          return {
            url: presignedUrl, // Use presigned URL instead of public URL
            key: uploaded.key,
            prompt: prompt,
            model: modelName || 'gemini-2.0-flash-exp'
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
      stack: error.stack
    });
    
    // Preserve the original error status and details for better handling upstream
    const enhancedError = new Error(error.message || 'Failed to generate image');
    enhancedError.status = error.status;
    enhancedError.code = error.code;
    
    // Provide more detailed error message based on status code
    if (error.code === 'AccessControlListNotSupported' || error.message?.includes('does not allow ACLs')) {
      // S3 bucket doesn't allow ACLs - this should be fixed by removing ACL from upload
      enhancedError.message = 'S3 bucket configuration error. The bucket does not allow ACLs. Please check your S3 bucket settings or use bucket policies for public access.';
      enhancedError.status = 500;
      enhancedError.code = 'S3_CONFIG_ERROR';
    } else if (error.code === 'MODEL_NOT_SUPPORTED') {
      // Model doesn't support image generation
      enhancedError.message = error.message || 'Image generation is not supported by this model. Please use a model that supports image generation.';
      enhancedError.status = 400;
      enhancedError.code = 'MODEL_NOT_SUPPORTED';
    } else if (error.status === 400) {
      if (error.message?.includes('does not support') || error.message?.includes('response modalities')) {
        enhancedError.message = 'Image generation is not supported by this model. Please use a model that supports image generation (e.g., gemini-2.0-flash-exp with image generation enabled).';
        enhancedError.code = 'MODEL_NOT_SUPPORTED';
      } else if (error.message?.includes('invalid argument') || error.message?.includes('Bad Request')) {
        enhancedError.message = 'Invalid request to AI model. The model may not support image generation or the request format is incorrect.';
        enhancedError.code = 'INVALID_REQUEST';
      } else {
        enhancedError.message = 'Bad request to AI service. Please check your prompt and try again.';
        enhancedError.code = 'BAD_REQUEST';
      }
    } else if (error.status === 403 || error.message?.includes('PERMISSION_DENIED')) {
      enhancedError.message = 'Image generation is not available. Please check your Gemini API configuration and ensure you have access to image generation features.';
      enhancedError.code = 'PERMISSION_DENIED';
    } else if (error.status === 503 || error.message?.includes('overloaded')) {
      enhancedError.message = 'AI model is currently overloaded. Please try again later.';
      enhancedError.code = 'MODEL_OVERLOADED';
    } else if (error.message) {
      enhancedError.message = error.message;
    } else {
      enhancedError.message = 'Failed to generate image. Please try again.';
    }
    
    throw enhancedError;
  }
}

/**
 * Alternative: Use Imagen 3 through Vertex AI if available
 * This requires Google Cloud setup with Vertex AI enabled
 */
async function generateImageWithImagen(prompt, referenceImageUrls = []) {
  // This would use @google-cloud/aiplatform
  // For now, we'll use the Gemini approach above
  throw new Error('Imagen integration not yet implemented. Use generateImage() instead.');
}

/**
 * Check if Gemini is configured
 */
function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

module.exports = {
  generateImage,
  generateImageWithImagen,
  isConfigured,
};

