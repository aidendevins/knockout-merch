const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Handle file uploads
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    // Handle network errors (like connection refused)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend connection failed:', error.message);
      throw new Error('Cannot connect to backend server. Please make sure it is running.');
    }
    throw error;
  }
}

// Stills-specific API with S3 sync
class StillsAPI {
  constructor() {
    this.basePath = '/stills';
  }

  async list(sort = '-created_date', usePresigned = true) {
    const params = new URLSearchParams();
    if (sort) params.append('sort', sort);
    if (usePresigned) params.append('usePresigned', 'true');
    const queryString = params.toString();
    return apiCall(`${this.basePath}${queryString ? `?${queryString}` : ''}`);
  }

  async get(id) {
    return apiCall(`${this.basePath}/${id}`);
  }

  async create(data) {
    return apiCall(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id, data) {
    return apiCall(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(id) {
    return apiCall(`${this.basePath}/${id}`, {
      method: 'DELETE',
    });
  }

  async filter(filters = {}, sort = '-created_date', limit = null) {
    const queryParams = new URLSearchParams();
    if (filters.id) queryParams.append('id', filters.id);
    if (filters.is_featured !== undefined) queryParams.append('is_featured', filters.is_featured);
    if (sort) queryParams.append('sort', sort);
    if (limit) queryParams.append('limit', limit);
    const queryString = queryParams.toString();
    return apiCall(`${this.basePath}${queryString ? `?${queryString}` : ''}`);
  }

  // Sync stills from S3 bucket
  async syncFromS3(prefix = '') {
    return apiCall(`${this.basePath}/sync-s3`, {
      method: 'POST',
      body: JSON.stringify({ prefix }),
    });
  }

  // List images directly from S3 (without database)
  async listS3Images(prefix = '') {
    return apiCall(`${this.basePath}/s3-images?prefix=${encodeURIComponent(prefix)}`);
  }

  // Fix existing s3:// URIs in database to HTTP URLs
  async fixS3Uris() {
    return apiCall(`${this.basePath}/fix-s3-uris`, {
      method: 'POST',
    });
  }
}

// Entity API class
class EntityAPI {
  constructor(entityName, pathOverride = null) {
    this.entityName = entityName;
    // Handle special cases for path mapping
    const pathMap = {
      'design': 'designs',
      'still': 'stills',
      'order': 'orders',
    };
    this.basePath = pathOverride || `/${pathMap[entityName.toLowerCase()] || entityName.toLowerCase() + 's'}`;
  }

  async list(sort = '-created_date') {
    return apiCall(`${this.basePath}?sort=${sort}`);
  }

  async get(id) {
    return apiCall(`${this.basePath}/${id}`);
  }

  async create(data) {
    return apiCall(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id, data) {
    return apiCall(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(id) {
    return apiCall(`${this.basePath}/${id}`, {
      method: 'DELETE',
    });
  }

  async filter(filters = {}, sort = '-created_date', limit = null) {
    const queryParams = new URLSearchParams();
    if (filters.id) queryParams.append('id', filters.id);
    if (filters.is_featured !== undefined) queryParams.append('is_featured', filters.is_featured);
    if (filters.is_published !== undefined) queryParams.append('is_published', filters.is_published);
    if (sort) queryParams.append('sort', sort);
    if (limit) queryParams.append('limit', limit);

    const queryString = queryParams.toString();
    return apiCall(`${this.basePath}${queryString ? `?${queryString}` : ''}`);
  }
}

// API Client
const apiClient = {
  entities: {
    Design: new EntityAPI('design', '/designs'),
    FightStill: new StillsAPI(),
    Order: new EntityAPI('order', '/orders'),
  },
  
  // Upload file
  async uploadFile(file, folder = 'uploads') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },

  // Upload base64 image (for canvas exports)
  async uploadBase64(base64Image, folder = 'exports') {
    return apiCall('/upload/base64', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image, folder }),
    });
  },

  // Check AI service status
  async getAIStatus() {
    return apiCall('/upload/ai-status');
  },
  
  // Integrations object for compatibility with base44Client
  integrations: {
    Core: {
      // Upload a file
      async UploadFile(file, folder = 'uploads') {
        return apiClient.uploadFile(file, folder);
      },

      // Generate image using Gemini AI
      async GenerateImage({ prompt, existing_image_urls = [] }) {
        return apiCall('/upload/generate-image', {
          method: 'POST',
          body: JSON.stringify({ prompt, reference_image_urls: existing_image_urls }),
        });
      },
    },
  },

  // Printify API
  printify: {
    // Check Printify status
    async getStatus() {
      return apiCall('/printify/status');
    },

    // Get available product types/blueprints
    async getBlueprints() {
      return apiCall('/printify/blueprints');
    },

    // Get available sizes for a product type
    async getSizes(productType) {
      return apiCall(`/printify/sizes/${productType}`);
    },

    // Create a product on Printify
    async createProduct({ title, description, designImageUrl, productType, canvasData, designId }) {
      return apiCall('/printify/products', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          design_image_url: designImageUrl,
          product_type: productType,
          canvas_data: canvasData,
          design_id: designId,
        }),
      });
    },

    // Get mockups for a product
    async getMockups(productId) {
      return apiCall(`/printify/products/${productId}/mockups`);
    },

    // Publish a product
    async publishProduct(productId) {
      return apiCall(`/printify/products/${productId}/publish`, {
        method: 'POST',
      });
    },

    // Calculate shipping
    async calculateShipping({ productId, variantId, address }) {
      return apiCall('/printify/shipping', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, variant_id: variantId, address }),
      });
    },

    // Create an order
    async createOrder({ productId, size, quantity, shippingAddress, orderId, productType }) {
      return apiCall('/printify/orders', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          size,
          quantity,
          shipping_address: shippingAddress,
          order_id: orderId,
          product_type: productType,
        }),
      });
    },

    // Get order status
    async getOrder(orderId) {
      return apiCall(`/printify/orders/${orderId}`);
    },
  },
  
  // Auth placeholder (if needed later)
  auth: {
    async me() {
      // For now, return null - implement auth later if needed
      return null;
    },
  },
};

export default apiClient;
