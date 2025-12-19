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
    // Use Gemini 3 Pro Image Preview model for image generation
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-pro-image-preview"
    });

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

    // Generate image with image generation configuration
    const result = await model.generateContent({
      contents: [{ parts: [{ text: designPrompt }] }],
      generationConfig: {
        responseModalities: ['Image'],
        imageConfig: {
          aspectRatio: '1:1', // Square aspect ratio for t-shirt designs
          imageSize: '2K', // 2K resolution
        },
      },
    });

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
          
          return {
            url: uploaded.url,
            key: uploaded.key,
            prompt: prompt,
            model: 'gemini-3-pro-image-preview'
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
          
          return {
            url: uploaded.url,
            key: uploaded.key,
            prompt: prompt,
            model: 'gemini-3-pro-image-preview'
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
    
    // Provide more detailed error message
    let errorMessage = 'Failed to generate image. ';
    if (error.message?.includes('not supported') || error.message?.includes('PERMISSION_DENIED')) {
      errorMessage += 'Image generation is not available. Please check your Gemini API configuration and ensure you have access to image generation features.';
    } else if (error.message) {
      errorMessage += error.message;
    } else {
      errorMessage += 'Please try again.';
    }
    
    throw new Error(errorMessage);
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

