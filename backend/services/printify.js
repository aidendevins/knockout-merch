const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

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
    throw new Error(error.message || `Printify API error: ${response.status}`);
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
  
  if (typeof imageData === 'string') {
    // Check if it's a base64 data URL or a regular URL
    if (imageData.startsWith('data:') || imageData.startsWith('/9j/') || imageData.match(/^[A-Za-z0-9+/=]+$/)) {
      // It's base64 data
      let base64String = imageData;
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      if (base64String.includes(',')) {
        base64String = base64String.split(',')[1];
      }
      
      requestBody = {
        file_name: fileName,
        contents: base64String,
      };
    } else {
      // It's a URL - try to fetch and convert to base64
      try {
        const response = await fetch(imageData);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64String = buffer.toString('base64');
        
        requestBody = {
          file_name: fileName,
          contents: base64String,
        };
      } catch (fetchError) {
        // If fetching fails, fall back to URL (though this might fail)
        console.warn('Failed to fetch image, using URL directly:', fetchError.message);
        requestBody = {
          file_name: fileName,
          url: imageData,
        };
      }
    }
  } else if (Buffer.isBuffer(imageData)) {
    // It's a Buffer, convert to base64
    requestBody = {
      file_name: fileName,
      contents: imageData.toString('base64'),
    };
  } else {
    throw new Error('Invalid image data type. Expected URL string, base64 string, or Buffer');
  }
  
  return printifyRequest(`/uploads/images.json`, {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}

/**
 * Create a product on Printify
 * @param {Object} options
 * @param {string} options.title - Product title
 * @param {string} options.description - Product description
 * @param {string} options.imageUrl - URL of the design image
 * @param {string} options.productType - 'tshirt' or 'hoodie'
 * @param {string} options.color - 'black' or 'white'
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
  const validColors = ['black', 'white'];
  if (!validColors.includes(color)) {
    throw new Error(`Invalid color: ${color}. Must be 'black' or 'white'.`);
  }

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
    const colorVariants = blueprint.variants[color];
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
      color: color,
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
      color: color,
      images: product.images || [],
    };
  }
  
  // Filter variants by color and size
  const availableSizes = ['S', 'M', 'L', 'XL', '2XL'];
  const colorName = color.charAt(0).toUpperCase() + color.slice(1); // Capitalize first letter
  
  const filteredVariants = printifyVariants.variants?.filter(variant => {
    // Check if variant matches our color and size requirements
    const variantColor = variant.options?.color?.toLowerCase();
    const variantSize = variant.options?.size;
    
    return variantColor === color.toLowerCase() && 
           availableSizes.includes(variantSize);
  }) || [];
  
  if (filteredVariants.length === 0) {
    throw new Error(`No variants found for ${color} color in blueprint ${blueprint.id}`);
  }
  
  console.log(`✅ Found ${filteredVariants.length} matching variants for ${color} color`);
  
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
    color: color,
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
    color: color,
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
 */
function getVariantId(productType, size, color = 'black') {
  console.log(`\n🔍 getVariantId called:`);
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
  getColorVariants,
  isConfigured,
  BLUEPRINTS,
};

