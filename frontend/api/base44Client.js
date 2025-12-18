// Compatibility wrapper for base44 API
// This maintains the same interface but uses our backend API
import apiClient from './apiClient';

// Export as base44 to maintain compatibility with existing code
export const base44 = {
  entities: {
    Design: {
      async list(sort = '-created_date') {
        return apiClient.entities.Design.list(sort);
      },
      
      async get(id) {
        return apiClient.entities.Design.get(id);
      },
      
      async create(data) {
        return apiClient.entities.Design.create(data);
      },
      
      async update(id, data) {
        return apiClient.entities.Design.update(id, data);
      },
      
      async delete(id) {
        return apiClient.entities.Design.delete(id);
      },
      
      async filter(filters = {}, sort = '-created_date', limit = null) {
        return apiClient.entities.Design.filter(filters, sort, limit);
      }
    },
    
    FightStill: {
      async list(sort = '-created_date', usePresigned = true) {
        return apiClient.entities.FightStill.list(sort, usePresigned);
      },
      
      async get(id) {
        return apiClient.entities.FightStill.get(id);
      },
      
      async create(data) {
        return apiClient.entities.FightStill.create(data);
      },
      
      async update(id, data) {
        return apiClient.entities.FightStill.update(id, data);
      },
      
      async delete(id) {
        return apiClient.entities.FightStill.delete(id);
      },
      
      async filter(filters = {}, sort = '-created_date', limit = null) {
        return apiClient.entities.FightStill.filter(filters, sort, limit);
      },

      // Sync stills from S3 bucket
      async syncFromS3(prefix = '') {
        return apiClient.entities.FightStill.syncFromS3(prefix);
      },

      // List images directly from S3
      async listS3Images(prefix = '') {
        return apiClient.entities.FightStill.listS3Images(prefix);
      },

      // Fix existing s3:// URIs in database
      async fixS3Uris() {
        return apiClient.entities.FightStill.fixS3Uris();
      }
    },
    
    Order: {
      async list(sort = '-created_date') {
        return apiClient.entities.Order.list(sort);
      },
      
      async get(id) {
        return apiClient.entities.Order.get(id);
      },
      
      async create(data) {
        return apiClient.entities.Order.create(data);
      },
      
      async update(id, data) {
        return apiClient.entities.Order.update(id, data);
      },
      
      async delete(id) {
        return apiClient.entities.Order.delete(id);
      },
      
      async filter(filters = {}, sort = '-created_date', limit = null) {
        return apiClient.entities.Order.filter(filters, sort, limit);
      }
    }
  },
  
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const result = await apiClient.uploadFile(file);
        return { file_url: result.file_url };
      },
      
      async GenerateImage({ prompt, existing_image_urls = [] }) {
        return apiClient.integrations.Core.GenerateImage({ prompt, existing_image_urls });
      }
    }
  },
  
  // Printify integration
  printify: apiClient.printify,
  
  // File upload methods
  async uploadFile(file, folder) {
    return apiClient.uploadFile(file, folder);
  },
  
  async uploadBase64(base64Image, folder) {
    return apiClient.uploadBase64(base64Image, folder);
  },
  
  // AI status check
  async getAIStatus() {
    return apiClient.getAIStatus();
  },
  
  auth: {
    async me() {
      return apiClient.auth.me();
    }
  }
};

export default base44;
