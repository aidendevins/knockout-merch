const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

/**
 * Printify API Service
 * Handles product creation, mockup generation, and order submission
 */

// Blueprint IDs for different products (Printify catalog)
// These are example IDs - you'll need to find the actual IDs from Printify's catalog
const BLUEPRINTS = {
  tshirt: {
    id: 145, // Gildan 64000 Unisex Softstyle T-Shirt
    printProviderId: 99, // Example print provider
    variants: {
      'S': 17390,
      'M': 17391,
      'L': 17392,
      'XL': 17393,
      '2XL': 17394,
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
    printProviderId: 99,
    variants: {
      'S': 12376,
      'M': 12377,
      'L': 12378,
      'XL': 12379,
      '2XL': 12380,
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
 * @param {string} imageUrl - URL of the image to upload
 * @param {string} fileName - Name for the file
 * @returns {Promise<{id: string, file_name: string, ...}>}
 */
async function uploadImage(imageUrl, fileName = 'design.png') {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  return printifyRequest(`/uploads/images.json`, {
    method: 'POST',
    body: JSON.stringify({
      file_name: fileName,
      url: imageUrl,
    }),
  });
}

/**
 * Create a product on Printify
 * @param {Object} options
 * @param {string} options.title - Product title
 * @param {string} options.description - Product description
 * @param {string} options.imageUrl - URL of the design image
 * @param {string} options.productType - 'tshirt' or 'hoodie'
 * @param {Object} options.canvasData - Position data from the canvas editor
 * @returns {Promise<{id: string, mockup_urls: string[], ...}>}
 */
async function createProduct({ title, description, imageUrl, productType = 'tshirt', canvasData = {} }) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  const blueprint = BLUEPRINTS[productType];
  
  if (!blueprint) {
    throw new Error(`Unknown product type: ${productType}`);
  }

  // First, upload the image to Printify
  const uploadedImage = await uploadImage(imageUrl, `${title.replace(/\s+/g, '-')}.png`);
  
  // Calculate print position from canvas data
  // Canvas data has x, y (0-100%), scale, rotation
  const printArea = blueprint.placeholders[0];
  const x = Math.round((canvasData.x || 50) / 100 * printArea.width - (printArea.width * (canvasData.scale || 1)) / 2);
  const y = Math.round((canvasData.y || 45) / 100 * printArea.height - (printArea.height * (canvasData.scale || 1)) / 2);
  const scale = canvasData.scale || 1;
  
  // Create product with all variants
  const variants = Object.entries(blueprint.variants).map(([size, variantId]) => ({
    id: variantId,
    price: productType === 'hoodie' ? 4999 : 2999, // Price in cents
    is_enabled: true,
  }));

  const product = await printifyRequest(`/shops/${shopId}/products.json`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: description || `Knockout merch design: ${title}`,
      blueprint_id: blueprint.id,
      print_provider_id: blueprint.printProviderId,
      variants,
      print_areas: [
        {
          variant_ids: Object.values(blueprint.variants),
          placeholders: [
            {
              position: 'front',
              images: [
                {
                  id: uploadedImage.id,
                  x: x,
                  y: y,
                  scale: scale,
                  angle: canvasData.rotation || 0,
                }
              ]
            }
          ]
        }
      ]
    }),
  });

  return {
    id: product.id,
    printify_product_id: product.id,
    title: product.title,
    blueprint_id: blueprint.id,
    images: product.images || [],
  };
}

/**
 * Get mockup images for a product
 * @param {string} productId - Printify product ID
 * @returns {Promise<string[]>} - Array of mockup URLs
 */
async function getProductMockups(productId) {
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  // Get product details which include mockup images
  const product = await printifyRequest(`/shops/${shopId}/products/${productId}.json`);
  
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
 * Get variant ID for a size
 */
function getVariantId(productType, size) {
  const blueprint = BLUEPRINTS[productType];
  if (!blueprint) return null;
  return blueprint.variants[size] || null;
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
  getProductMockups,
  publishProduct,
  createOrder,
  getOrder,
  calculateShipping,
  getVariantId,
  isConfigured,
  BLUEPRINTS,
};

