const PRINTIFY_API_BASE = 'https://api.printify.com/v1';
const s3 = require('./s3');
const sharp = require('sharp');

/**
 * Printify API Service
 * Handles product creation, mockup generation, and order submission
 */

// Blueprint IDs for different products (Printify catalog)
// Using Bella Canvas 3001 for t-shirts and Gildan 18500 for hoodies
// Variant IDs are specific to color and size combinations
const BLUEPRINTS = {
  tshirt: {
    id: 12, // Bella Canvas 3001 Unisex Short Sleeve Jersey T-Shirt
    printProviderId: 99, // Printify Choice
    // Variants organized by color -> size
    variants: {
      black: {
        'S': 11699,
        'M': 11700,
        'L': 11701,
        'XL': 11702,
        '2XL': 11703,
      },
      white: {
        'S': 11542,
        'M': 11543,
        'L': 11544,
        'XL': 11545,
        '2XL': 11546,
      }
    },
    // Print area placeholder - front print
    placeholders: [{
      position: 'front',
      height: 4000,
      width: 4000,
    }]
  },
  hoodie: {
    id: 77, // Gildan 18500 Heavy Blend Hooded Sweatshirt
    printProviderId: 99, // Printify Choice
    variants: {
      black: {
        'S': 12370,
        'M': 12371,
        'L': 12372,
        'XL': 12373,
        '2XL': 12374,
      },
      white: {
        'S': 12535,
        'M': 12536,
        'L': 12537,
        'XL': 12538,
        '2XL': 12539,
      }
    },
    placeholders: [{
      position: 'front',
      height: 4000,
      width: 4000,
    }]
  }
};

/**
 * Make authenticated request to Printify API
 */
async function printifyRequest(endpoint, options = {}) {
  const url = `${PRINTIFY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('Printify API error:', error);
    
    // Provide more detailed error information
    let errorMessage = error.message || `Printify API error: ${response.status}`;
    
    if (error.code === 10300 && error.errors?.reason) {
      errorMessage = `Printify upload failed: ${error.errors.reason}`;
      if (error.errors.reason.includes('Failed to upload image')) {
        errorMessage += '\nPossible causes:';
        errorMessage += '\n- Image may be too large (max 100MB)';
        errorMessage += '\n- Image format may be unsupported or corrupted';
        errorMessage += '\n- PNG may be interlaced (must be non-interlaced)';
        errorMessage += '\n- Image may have invalid color profile';
        errorMessage += '\n- Base64 encoding may be malformed';
      }
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.status = response.status;
    enhancedError.code = error.code;
    enhancedError.originalError = error;
    throw enhancedError;
  }

  return response.json();
}

/**
 * Get shop information
 */
async function getShops() {
  return printifyRequest('/shops.json');
}

/**
 * Get available blueprints (product catalog)
 */
async function getBlueprints() {
  return printifyRequest('/catalog/blueprints.json');
}

/**
 * Get print providers for a blueprint
 */
async function getPrintProviders(blueprintId) {
  return printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`);
}

/**
 * Get variants for a blueprint and print provider
 */
async function getVariants(blueprintId, printProviderId) {
  return printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`);
}

/**
 * Upload an image to Printify
 * @param {string|Buffer} imageData - Either a URL, base64 string, or Buffer of the image
 * @param {string} fileName - Name for the file
 * @returns {Promise<{id: string, file_name: string, ...}>}
 */
async function uploadImage(imageData, fileName = 'design.png') {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  // Determine if we have a URL or base64 data
  let requestBody;
  let base64String;
  
  if (typeof imageData === 'string') {
    // Check if it's a base64 data URL (more specific check)
    if (imageData.startsWith('data:image/')) {
      // It's a base64 data URL
      base64String = imageData;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      if (base64String.includes(',')) {
        base64String = base64String.split(',')[1];
      }
      
      requestBody = {
        file_name: fileName,
        contents: base64String,
      };
    } else if (imageData.startsWith('/9j/') || (imageData.length > 100 && /^[A-Za-z0-9+/=]+$/.test(imageData) && !imageData.includes('http'))) {
      // It's raw base64 (JPEG marker /9j/ or long base64 string without http)
      base64String = imageData;
      
      requestBody = {
        file_name: fileName,
        contents: base64String,
      };
    } else {
      // It's a URL - fetch and convert to base64
      // NEVER pass URLs directly to Printify - always convert to base64
      let imageUrl = imageData;
      
      // Handle proxy URLs - extract S3 key and fetch directly
      if (imageUrl.includes('/proxy-image') && imageUrl.includes('key=')) {
        try {
          // Extract key from query string
          const keyMatch = imageUrl.match(/[?&]key=([^&]+)/);
          const key = keyMatch ? decodeURIComponent(keyMatch[1]) : null;
          
          if (key && s3.isConfigured()) {
            console.log(`🔑 Extracting S3 key from proxy URL: ${key.substring(0, 50)}...`);
            
            // Fetch directly from S3 using presigned URL
            const presignedUrl = await s3.getPresignedUrl(key, 3600);
            const response = await fetch(presignedUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch from S3: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            base64String = buffer.toString('base64');
            
            console.log(`✅ Fetched image from S3 (${(buffer.length / 1024).toFixed(2)}KB)`);
          } else {
            throw new Error('Could not extract S3 key from proxy URL');
          }
        } catch (s3Error) {
          console.warn('⚠️ Failed to fetch from S3, trying URL fetch:', s3Error.message);
          // Fall through to regular URL fetch
        }
      }
      
      // If we don't have base64 yet, fetch from URL
      if (!base64String) {
        // Handle relative URLs and proxy URLs
        if (imageUrl.startsWith('/api/') || imageUrl.startsWith('/upload/')) {
          // It's a relative/proxy URL - construct full URL
          const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';
          imageUrl = `${baseUrl}${imageUrl}`;
          console.log(`🔄 Converted relative URL to absolute: ${imageUrl}`);
        } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          // Relative URL without leading slash
          const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';
          imageUrl = `${baseUrl}/${imageUrl}`;
          console.log(`🔄 Converted relative URL to absolute: ${imageUrl}`);
        }

        console.log(`📥 Fetching image from URL: ${imageUrl.substring(0, 100)}...`);
        
        try {
          const response = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Printify-Image-Uploader/1.0',
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Validate image size (Printify limit is 100MB)
          const maxSize = 100 * 1024 * 1024; // 100MB
          if (buffer.length > maxSize) {
            throw new Error(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB.`);
          }
          
          base64String = buffer.toString('base64');
          console.log(`✅ Successfully fetched and converted image to base64 (${(buffer.length / 1024).toFixed(2)}KB)`);
        } catch (fetchError) {
          console.error('❌ Failed to fetch image:', fetchError.message);
          console.error('   URL:', imageUrl);
          throw new Error(`Failed to fetch image for Printify upload: ${fetchError.message}. The image URL must be accessible from the server.`);
        }
      }
      
      requestBody = {
        file_name: fileName,
        contents: base64String,
      };
    }
  } else if (Buffer.isBuffer(imageData)) {
    // It's a Buffer, convert to base64
    base64String = imageData.toString('base64');
    requestBody = {
      file_name: fileName,
      contents: base64String,
    };
  } else {
    throw new Error('Invalid image data type. Expected URL string, base64 string, or Buffer');
  }
  
  // Validate base64 string
  if (!base64String || base64String.length === 0) {
    throw new Error('Empty image data provided');
  }
  
  // Clean base64 string - remove any whitespace, newlines, or invalid characters
  // This is important because base64 strings can sometimes have whitespace that breaks the API
  base64String = base64String.trim().replace(/\s/g, '');
  
  // Validate base64 format (should only contain valid base64 characters)
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64String)) {
    throw new Error(`Invalid base64 string format. First 100 chars: ${base64String.substring(0, 100)}`);
  }
  
  // Decode base64 to buffer for format detection and conversion
  let imageBuffer = Buffer.from(base64String, 'base64');
  if (imageBuffer.length === 0) {
    throw new Error('Base64 decodes to empty buffer');
  }
  
  // Detect image format by file signature (magic bytes)
  const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
  const isJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
  const isWebP = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46; // "RIFF"
  const isGIF = imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x38;
  
  console.log(`🔍 Detected image format: ${isPNG ? 'PNG' : isJPEG ? 'JPEG' : isWebP ? 'WebP' : isGIF ? 'GIF' : 'Unknown'}`);
  console.log(`   First bytes: ${Array.from(imageBuffer.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Convert WebP to PNG (Printify doesn't support WebP)
  if (isWebP) {
    console.log('🔄 Converting WebP to PNG for Printify compatibility...');
    try {
      const originalSize = imageBuffer.length;
      
      // Use Sharp to convert WebP to PNG, preserving transparency
      imageBuffer = await sharp(imageBuffer)
        .png({
          compressionLevel: 6, // Balance between file size and speed
          adaptiveFiltering: false, // Non-interlaced (Printify requirement)
        })
        .toBuffer();
      
      // Update base64 with converted PNG
      base64String = imageBuffer.toString('base64');
      
      // Update filename to .png
      fileName = fileName.replace(/\.(webp|jpg|jpeg|gif)$/i, '.png');
      if (!fileName.toLowerCase().endsWith('.png')) {
        fileName = fileName.replace(/\.[^.]+$/, '.png');
      }
      
      console.log(`✅ Converted WebP to PNG: ${(originalSize / 1024).toFixed(2)}KB → ${(imageBuffer.length / 1024).toFixed(2)}KB`);
    } catch (conversionError) {
      console.error('❌ Failed to convert WebP to PNG:', conversionError.message);
      throw new Error(`Failed to convert WebP image to PNG: ${conversionError.message}`);
    }
  } else if (!isPNG && !isJPEG) {
    // For other unsupported formats, try to convert to PNG
    console.log('🔄 Converting unsupported format to PNG...');
    try {
      const originalSize = imageBuffer.length;
      
      imageBuffer = await sharp(imageBuffer)
        .png({
          compressionLevel: 6,
          adaptiveFiltering: false,
        })
        .toBuffer();
      
      base64String = imageBuffer.toString('base64');
      fileName = fileName.replace(/\.[^.]+$/, '.png');
      
      console.log(`✅ Converted to PNG: ${(originalSize / 1024).toFixed(2)}KB → ${(imageBuffer.length / 1024).toFixed(2)}KB`);
    } catch (conversionError) {
      console.error('❌ Failed to convert image to PNG:', conversionError.message);
      throw new Error(`Failed to convert image to PNG: ${conversionError.message}`);
    }
  }
  
  // Validate file size from base64 (approximate: base64 is ~33% larger than binary)
  const estimatedSize = (base64String.length * 3) / 4;
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (estimatedSize > maxSize) {
    throw new Error(`Image too large: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB.`);
  }

  // Ensure requestBody has the cleaned base64
  requestBody = {
    file_name: fileName,
    contents: base64String,
  };

  console.log(`📤 Uploading image to Printify (${fileName}, ${(estimatedSize / 1024).toFixed(2)}KB estimated)`);
  console.log(`📋 Request preview: file_name="${requestBody.file_name}", first 50 base64 chars: ${base64String.substring(0, 50)}...`);
  
  try {
    const result = await printifyRequest(`/uploads/images.json`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log(`✅ Successfully uploaded image to Printify: ${result.id}`);
    return result;
  } catch (uploadError) {
    console.error('❌ Printify upload failed:', uploadError.message);
    console.error('   File name:', requestBody.file_name);
    console.error('   Base64 length:', base64String.length);
    console.error('   Base64 preview (first 100 chars):', base64String.substring(0, 100));
    console.error('   Estimated size:', `${(estimatedSize / 1024).toFixed(2)}KB`);
    throw uploadError;
  }
}

/**
 * Map color names to Printify color names
 * @param {string} color - Internal color name
 * @returns {string} - Printify color name
 */
function mapColorToPrintify(color) {
  const colorMap = {
    'light-pink': 'Pink',
    'lightPink': 'Pink',
    'light_pink': 'Pink',
    'black': 'Black',
    'white': 'White',
  };
  
  // Normalize color input (lowercase, replace underscores/dashes)
  const normalized = color.toLowerCase().replace(/[_-]/g, '-');
  
  // Return mapped color or capitalize the original
  return colorMap[normalized] || color.charAt(0).toUpperCase() + color.slice(1);
}

/**
 * Create a product on Printify
 * @param {Object} options
 * @param {string} options.title - Product title
 * @param {string} options.description - Product description
 * @param {string} options.imageUrl - URL of the design image
 * @param {string} options.productType - 'tshirt' or 'hoodie'
 * @param {string} options.color - 'black', 'white', or 'light-pink'
 * @param {Object} options.canvasData - Position data from the canvas editor
 * @returns {Promise<{id: string, mockup_urls: string[], ...}>}
 */
async function createProduct({ title, description, imageUrl, productType = 'tshirt', color = 'black', canvasData = {} }) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  const blueprint = BLUEPRINTS[productType];
  
  if (!blueprint) {
    throw new Error(`Unknown product type: ${productType}`);
  }

  // Validate color
  const validColors = ['black', 'white', 'light-pink', 'lightPink', 'light_pink'];
  if (!validColors.includes(color.toLowerCase())) {
    throw new Error(`Invalid color: ${color}. Must be 'black', 'white', or 'light-pink'.`);
  }

  // Map color to Printify color name (e.g., "light-pink" -> "Soft Pink")
  const printifyColor = mapColorToPrintify(color);
  console.log(`🎨 Color mapping: "${color}" -> "${printifyColor}"`);

  // First, upload the image to Printify
  const uploadedImage = await uploadImage(imageUrl, `${title.replace(/\s+/g, '-')}.png`);
  
  // Calculate print position from canvas data
  // Canvas data has x, y (0-100%), scale, rotation
  // Printify expects normalized coordinates (0-1 range), with 0.5 being center
  // Convert from percentage (0-100) to normalized (0-1)
  const x = (canvasData.x || 50) / 100; // Normalize to 0-1 range
  const y = (canvasData.y || 45) / 100; // Normalize to 0-1 range
  const scale = canvasData.scale || 1;
  const angle = canvasData.rotation || 0;
  
  // Fetch actual variants from Printify API to ensure we have the correct IDs
  console.log(`🔍 Fetching variants for blueprint ${blueprint.id}, print provider ${blueprint.printProviderId}`);
  let printifyVariants;
  try {
    printifyVariants = await getVariants(blueprint.id, blueprint.printProviderId);
    console.log(`✅ Fetched ${printifyVariants.variants?.length || 0} variants from Printify`);
  } catch (error) {
    console.warn('⚠️ Failed to fetch variants from Printify, using hardcoded values:', error.message);
    // Fall back to hardcoded variants
    // Note: Hardcoded variants only support 'black' and 'white'
    const colorKey = color.toLowerCase() === 'light-pink' ? 'white' : color.toLowerCase();
    const colorVariants = blueprint.variants[colorKey];
    if (!colorVariants) {
      throw new Error(`No variants found for color: ${color}`);
    }
    
    const variants = Object.entries(colorVariants).map(([size, variantId]) => ({
      id: variantId,
      price: productType === 'hoodie' ? 4999 : 2999,
      is_enabled: true,
    }));
    
    const variantIds = variants.map(v => v.id);
    
    // Continue with hardcoded variants...
    const productPayload = {
      title,
      description: description || `Knockout merch design: ${title}`,
      blueprint_id: blueprint.id,
      print_provider_id: blueprint.printProviderId,
      variants,
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: 'front',
              images: [
                {
                  id: uploadedImage.id,
                  x: x,
                  y: y,
                  scale: scale,
                  angle: angle,
                }
              ]
            }
          ]
        }
      ]
    };

    console.log('📤 Creating Printify product with payload:', {
      blueprint_id: blueprint.id,
      print_provider_id: blueprint.printProviderId,
      variants_count: variants.length,
      variant_ids: variantIds,
      color: printifyColor,
      original_color: color,
      product_type: productType
    });

    const product = await printifyRequest(`/shops/${shopId}/products.json`, {
      method: 'POST',
      body: JSON.stringify(productPayload),
    });

    return {
      id: product.id,
      printify_product_id: product.id,
      title: product.title,
      blueprint_id: blueprint.id,
      color: printifyColor,
      original_color: color,
      images: product.images || [],
    };
  }
  
  // Filter variants by BOTH colors and size (to allow user to choose either color later)
  const availableSizes = ['S', 'M', 'L', 'XL', '2XL'];
  const availableColors = ['black', 'white']; // Always create both color variants
  
  // Use Printify color name for filtering (e.g., "Soft Pink" instead of "light-pink")
  const filteredVariants = printifyVariants.variants?.filter(variant => {
    // Check if variant matches our size requirements and is black or white
    const variantColor = variant.options?.color?.toLowerCase();
    const variantSize = variant.options?.size;
    
    return availableColors.includes(variantColor) && 
           availableSizes.includes(variantSize);
  }) || [];
  
  if (filteredVariants.length === 0) {
    throw new Error(`No variants found for black/white colors in blueprint ${blueprint.id}`);
  }
  
  console.log(`✅ Found ${filteredVariants.length} matching variants for both black and white colors`);
  console.log(`   Originally selected color: ${color}`);
  
  // Create variants array with pricing
  const variants = filteredVariants.map(variant => ({
    id: variant.id,
    price: productType === 'hoodie' ? 4999 : 2999, // Price in cents
    is_enabled: true,
  }));

  // Extract variant IDs from the variants array (must match exactly)
  const variantIds = variants.map(v => v.id);

  const productPayload = {
    title,
    description: description || `Knockout merch design: ${title}`,
    blueprint_id: blueprint.id,
    print_provider_id: blueprint.printProviderId,
    variants,
    print_areas: [
      {
        variant_ids: variantIds, // All variants (both colors) use the same design
        placeholders: [
          {
            position: 'front',
            images: [
              {
                id: uploadedImage.id,
                x: x,
                y: y,
                scale: scale,
                angle: angle,
              }
            ]
          }
        ]
      }
    ]
  };

  console.log('📤 Creating Printify product with payload:', {
    blueprint_id: blueprint.id,
    print_provider_id: blueprint.printProviderId,
    variants_count: variants.length,
    variant_ids: variantIds.length,
    colors: 'black and white',
    originally_selected_color: color,
    product_type: productType
  });

  const product = await printifyRequest(`/shops/${shopId}/products.json`, {
    method: 'POST',
    body: JSON.stringify(productPayload),
  });

  return {
    id: product.id,
    printify_product_id: product.id,
    title: product.title,
    blueprint_id: blueprint.id,
    color: printifyColor,
    original_color: color,
    images: product.images || [],
    };
  }

/**
 * Get all products from the shop
 * @returns {Promise<Array>} - Array of products
 */
async function getAllShopProducts() {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  const response = await printifyRequest(`/shops/${shopId}/products.json`);
  
  // Printify returns data in a 'data' field with pagination
  return response.data || [];
}

/**
 * Get product details including mockup images
 * @param {string} productId - Printify product ID
 * @returns {Promise<Object>} - Product details
 */
async function getProductDetails(productId) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  // Get product details which include mockup images
  const product = await printifyRequest(`/shops/${shopId}/products/${productId}.json`);
  
  return product;
}

/**
 * Get mockup images for a product
 * @param {string} productId - Printify product ID
 * @returns {Promise<string[]>} - Array of mockup URLs
 */
async function getProductMockups(productId) {
  const product = await getProductDetails(productId);
  
  // Extract mockup URLs from product images
  const mockupUrls = (product.images || []).map(img => img.src);
  
  return mockupUrls;
}

/**
 * Publish product to the shop (makes it available for orders)
 */
async function publishProduct(productId) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  return printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, {
    method: 'POST',
    body: JSON.stringify({
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
      keyFeatures: true,
      shipping_template: true,
    }),
  });
}

/**
 * Create an order on Printify
 * @param {Object} options
 * @param {string} options.productId - Printify product ID
 * @param {number} options.variantId - Variant ID (size)
 * @param {number} options.quantity - Number of items
 * @param {Object} options.shippingAddress - Shipping address
 * @returns {Promise<{id: string, ...}>}
 */
async function createOrder({ productId, variantId, quantity, shippingAddress, externalId }) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  const order = await printifyRequest(`/shops/${shopId}/orders.json`, {
    method: 'POST',
    body: JSON.stringify({
      external_id: externalId,
      label: `Knockout Club Order`,
      line_items: [
        {
          product_id: productId,
          variant_id: variantId,
          quantity,
        }
      ],
      shipping_method: 1, // Standard shipping
      is_printify_express: false,
      send_shipping_notification: true,
      address_to: {
        first_name: shippingAddress.name?.split(' ')[0] || '',
        last_name: shippingAddress.name?.split(' ').slice(1).join(' ') || '',
        email: shippingAddress.email,
        phone: shippingAddress.phone || '',
        country: shippingAddress.country || 'US',
        region: shippingAddress.state || '',
        address1: shippingAddress.line1,
        address2: shippingAddress.line2 || '',
        city: shippingAddress.city,
        zip: shippingAddress.postal_code,
      },
    }),
  });

  return order;
}

/**
 * Get order status
 */
async function getOrder(orderId) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  return printifyRequest(`/shops/${shopId}/orders/${orderId}.json`);
}

/**
 * Calculate shipping cost
 */
async function calculateShipping(productId, variantId, address) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  return printifyRequest(`/shops/${shopId}/orders/shipping.json`, {
    method: 'POST',
    body: JSON.stringify({
      line_items: [{ product_id: productId, variant_id: variantId, quantity: 1 }],
      address_to: {
        country: address.country || 'US',
        region: address.state,
        zip: address.postal_code,
      },
    }),
  });
}

/**
 * Get variant ID for a size and color
 * @deprecated Use getProductVariantId instead for actual products
 */
function getVariantId(productType, size, color = 'black') {
  console.log(`\n🔍 getVariantId called (HARDCODED - may not match actual product):`);
  console.log(`   Product Type: "${productType}"`);
  console.log(`   Size: "${size}"`);
  console.log(`   Color: "${color}"`);
  
  const blueprint = BLUEPRINTS[productType];
  if (!blueprint) {
    console.error(`❌ No blueprint found for product type: "${productType}"`);
    console.error(`   Available product types:`, Object.keys(BLUEPRINTS));
    return null;
  }
  
  console.log(`✅ Blueprint found for "${productType}"`);
  console.log(`   Available colors:`, Object.keys(blueprint.variants));
  
  const colorVariants = blueprint.variants[color];
  if (!colorVariants) {
    console.error(`❌ No variants found for color: "${color}"`);
    console.error(`   Available colors for ${productType}:`, Object.keys(blueprint.variants));
    return null;
  }
  
  console.log(`✅ Color variants found for "${color}"`);
  console.log(`   Available sizes:`, Object.keys(colorVariants));
  
  const variantId = colorVariants[size];
  if (!variantId) {
    console.error(`❌ No variant ID found for size: "${size}"`);
    console.error(`   Available sizes for ${productType}/${color}:`, Object.keys(colorVariants));
    return null;
  }
  
  console.log(`✅ Variant ID found: ${variantId}\n`);
  return variantId;
}

/**
 * Get product details from Printify
 */
async function getProduct(productId) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  return printifyRequest(`/shops/${shopId}/products/${productId}.json`);
}

/**
 * Get the correct variant ID from an existing Printify product
 * This queries the actual product to get real variant IDs instead of using hardcoded values
 * @param {string} productId - Printify product ID
 * @param {string} size - Size (S, M, L, XL, 2XL)
 * @param {string} color - Color (black, white)
 * @returns {Promise<number>} - The variant ID
 */
async function getProductVariantId(productId, size, color) {
  console.log(`\n🔍 Getting variant ID from Printify product (DYNAMIC):`);
  console.log(`   Product ID: ${productId}`);
  console.log(`   Requested Size: ${size}`);
  console.log(`   Requested Color: ${color}`);
  
  try {
    const product = await getProduct(productId);
    console.log(`✅ Fetched product from Printify: "${product.title}"`);
    console.log(`   Product has ${product.variants?.length || 0} variants`);
    
    if (!product.variants || product.variants.length === 0) {
      throw new Error('Product has no variants');
    }
    
    // Log all available variants for debugging
    console.log(`   Available variants:`);
    product.variants.forEach(v => {
      console.log(`     - ID: ${v.id}, Title: "${v.title}", Price: $${v.price/100}`);
    });
    
    // Find the matching variant by looking at the title
    // Printify variant titles are like "Bella+Canvas 3001 Unisex / Black / S"
    const matchingVariant = product.variants.find(variant => {
      const title = variant.title || '';
      const titleLower = title.toLowerCase();
      
      // Check if title contains the color and size
      const hasColor = titleLower.includes(color.toLowerCase());
      const hasSize = title.includes(` / ${size}`) || title.endsWith(` ${size}`);
      
      return hasColor && hasSize;
    });
    
    if (!matchingVariant) {
      console.error(`❌ No matching variant found for size "${size}" and color "${color}"`);
      console.error(`   Please check the variant titles above`);
      throw new Error(`No matching variant found for size ${size} and color ${color}`);
    }
    
    console.log(`✅ Found matching variant:`);
    console.log(`   ID: ${matchingVariant.id}`);
    console.log(`   Title: "${matchingVariant.title}"`);
    console.log(`   Price: $${matchingVariant.price/100}\n`);
    
    return matchingVariant.id;
    
  } catch (error) {
    console.error(`❌ Error fetching product variant:`, error.message);
    throw error;
  }
}

/**
 * Get all variant IDs for a product type and color
 */
function getColorVariants(productType, color) {
  const blueprint = BLUEPRINTS[productType];
  if (!blueprint) return null;
  return blueprint.variants[color] || null;
}

/**
 * Check if Printify is configured
 */
function isConfigured() {
  return !!(process.env.PRINTIFY_API_KEY && process.env.PRINTIFY_SHOP_ID);
}

module.exports = {
  getShops,
  getBlueprints,
  getPrintProviders,
  getVariants,
  uploadImage,
  createProduct,
  getAllShopProducts,
  getProductDetails,
  getProductMockups,
  publishProduct,
  createOrder,
  getOrder,
  calculateShipping,
  getVariantId,
  getProductVariantId, // NEW: Dynamic variant ID lookup from actual products
  getColorVariants,
  isConfigured,
  BLUEPRINTS,
};

