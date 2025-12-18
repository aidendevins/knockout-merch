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
    // Use Gemini 2.0 Flash for image generation
    // Note: As of 2024, Gemini's image generation is through Imagen 3
    // We'll use the generative model with image output
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: ["image", "text"],
      },
    });

    // Build the prompt with design-specific instructions
    const designPrompt = `Create a bold, high-contrast t-shirt design image based on this description:

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

    // If we have reference images, we could include them
    // Note: Gemini 2.0 can take images as input for context
    let parts = [{ text: designPrompt }];
    
    // For reference images, we'd need to fetch and encode them
    // This is a simplified version - in production, you'd want to:
    // 1. Fetch the reference images
    // 2. Convert to base64
    // 3. Include as image parts
    if (referenceImageUrls.length > 0) {
      // Add context about reference images
      parts[0].text += `\n\nUse these reference images as inspiration for the boxing/knockout theme: ${referenceImageUrls.join(', ')}`;
    }

    const response = await model.generateContent(parts);
    const result = await response.response;
    
    // Check if we got an image in the response
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // We got an image! Upload to S3
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const uploaded = await s3.uploadBuffer(
            imageBuffer, 
            'generated-design.png', 
            'designs', 
            part.inlineData.mimeType
          );
          
          return {
            url: uploaded.url,
            key: uploaded.key,
            prompt: prompt,
            model: 'gemini-2.0-flash-exp'
          };
        }
      }
    }
    
    // If no image was generated, throw error
    throw new Error('No image was generated. The model may not support image generation or the prompt was rejected.');
    
  } catch (error) {
    console.error('Gemini image generation error:', error);
    
    // If Gemini fails, provide a fallback message
    if (error.message?.includes('not supported') || error.message?.includes('PERMISSION_DENIED')) {
      throw new Error('Image generation is not available. Please check your Gemini API configuration and ensure you have access to image generation features.');
    }
    
    throw error;
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

