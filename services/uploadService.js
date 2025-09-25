// services/uploadService.js
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

class UploadProvider {
  constructor(name) {
    this.name = name;
  }
  
  async upload(filePath) {
    throw new Error('upload method must be implemented');
  }
  
  isConfigured() {
    throw new Error('isConfigured method must be implemented');
  }
  
  async healthCheck() {
    throw new Error('healthCheck method must be implemented');
  }
}

class PicGoProvider extends UploadProvider {
  constructor(apiKey = null) {
    super("PicGo");
    this.apiKey = apiKey;
    this.apiUrl = "https://www.picgo.net/api/1/upload";
    this.maxFileSize = 25 * 1024 * 1024; // 25MB
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  isConfigured() {
    return !!this.apiKey;
  }
  
  async healthCheck() {
    try {
      const startTime = Date.now();
      // 使用简单的网站检查，因为API可能需要特定的参数
      const response = await axios.get("https://www.picgo.net", {
        timeout: 5000
      });
      const responseTime = Date.now() - startTime;
      
      return {
        success: response.status === 200,
        responseTime,
        message: `PicGo 服务正常 (${responseTime}ms)`
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        message: `PicGo 服务异常: ${error.message}`
      };
    }
  }
  
  async upload(filePath) {
    try {
      console.log(`🔄 PicGo上传开始: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('文件不存在');
      }
      
      const fileStats = fs.statSync(filePath);
      console.log(`📊 文件大小: ${fileStats.size} bytes (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      if (fileStats.size > this.maxFileSize) {
        throw new Error(`文件大小超过限制 (${this.maxFileSize / 1024 / 1024}MB)`);
      }
      
      // 根据API文档创建FormData
      const form = new FormData();
      form.append('source', fs.createReadStream(filePath));
      
      console.log(`📡 发送请求到: ${this.apiUrl}`);
      
      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          'X-API-Key': this.apiKey,
          'User-Agent': 'ImageUploader/1.0'
        },
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
      });
      
      console.log(`📥 PicGo响应状态: ${response.status}`);
      console.log(`📥 PicGo响应数据:`, JSON.stringify(response.data, null, 2));
      
      // 根据PicGo API文档解析响应
      if (response.data && response.data.status_code === 200 && response.data.image) {
        // 使用display_url作为图片链接，这是最终的显示URL
        const imageUrl = response.data.image.display_url || response.data.image.url;
        console.log(`✅ PicGo上传成功: ${imageUrl}`);
        
        return {
          success: true,
          url: imageUrl,
          service: this.name,
          message: '上传成功'
        };
      } else if (response.data && response.data.error) {
        throw new Error(`PicGo API错误: ${response.data.error.message || response.data.error}`);
      } else {
        console.error('❌ PicGo响应格式异常:', response.data);
        throw new Error('上传响应格式错误');
      }
      
    } catch (error) {
      console.error(`❌ PicGo 上传失败:`, error.message);
      
      // 如果是axios错误，提供更详细的信息
      if (error.response) {
        console.error(`📥 错误响应状态: ${error.response.status}`);
        console.error(`📥 错误响应数据:`, error.response.data);
      }
      
      return {
        success: false,
        error: error.message,
        service: this.name
      };
    }
  }
}

class CatboxProvider extends UploadProvider {
  constructor() {
    super("Catbox");
    this.apiUrl = "https://catbox.moe/user/api.php";
    this.maxFileSize = 200 * 1024 * 1024; // 200MB
  }
  
  isConfigured() {
    return true; // Catbox 不需要 API Key
  }
  
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await axios.get("https://catbox.moe", {
        timeout: 5000
      });
      const responseTime = Date.now() - startTime;
      
      return {
        success: response.status === 200,
        responseTime,
        message: `Catbox 服务正常 (${responseTime}ms)`
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        message: `Catbox 服务异常: ${error.message}`
      };
    }
  }
  
  async upload(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('文件不存在');
      }
      
      const fileStats = fs.statSync(filePath);
      if (fileStats.size > this.maxFileSize) {
        throw new Error(`文件大小超过限制 (${this.maxFileSize / 1024 / 1024}MB)`);
      }
      
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fs.createReadStream(filePath));
      
      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          'User-Agent': 'ImageUploader/1.0'
        },
        timeout: 60000, // Catbox 可能较慢
        maxContentLength: 250 * 1024 * 1024,
        maxBodyLength: 250 * 1024 * 1024
      });
      
      if (response.data && typeof response.data === 'string' && response.data.startsWith('https://')) {
        return {
          success: true,
          url: response.data.trim(),
          service: this.name,
          message: '上传成功'
        };
      } else {
        throw new Error('上传响应格式错误');
      }
      
    } catch (error) {
      console.error(`Catbox 上传失败:`, error.message);
      return {
        success: false,
        error: error.message,
        service: this.name
      };
    }
  }
}

class UploadServiceManager {
  constructor() {
    this.providers = new Map();
    this.currentProvider = 'PicGo'; // 默认使用 PicGo

    // 注册服务提供商
    this.registerProvider(new PicGoProvider());
    this.registerProvider(new CatboxProvider());
  }

  setPicGoApiKey(apiKey) {
    const picgoProvider = this.getProvider('PicGo');
    if (picgoProvider) {
      picgoProvider.setApiKey(apiKey);
    }
  }
  
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
  }
  
  getProvider(name) {
    return this.providers.get(name);
  }
  
  getCurrentProvider() {
    return this.providers.get(this.currentProvider);
  }
  
  setCurrentProvider(name) {
    if (this.providers.has(name)) {
      this.currentProvider = name;
      return true;
    }
    return false;
  }
  
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
  
  async uploadFile(filePath, providerName = null) {
    const provider = providerName ? 
      this.getProvider(providerName) : 
      this.getCurrentProvider();
    
    if (!provider) {
      throw new Error('未找到上传服务提供商');
    }
    
    if (!provider.isConfigured()) {
      throw new Error(`${provider.name} 服务未配置`);
    }
    
    return await provider.upload(filePath);
  }
  
  async uploadWithFallback(filePath) {
    const providers = ['PicGo', 'Catbox'];
    
    for (const providerName of providers) {
      try {
        console.log(`尝试使用 ${providerName} 上传...`);
        const result = await this.uploadFile(filePath, providerName);
        
        if (result.success) {
          console.log(`✅ ${providerName} 上传成功`);
          return result;
        } else {
          console.log(`❌ ${providerName} 上传失败: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${providerName} 上传异常: ${error.message}`);
      }
    }
    
    return {
      success: false,
      error: '所有上传服务都失败了',
      service: 'fallback'
    };
  }
  
  async checkAllServices() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      results[name] = await provider.healthCheck();
    }
    
    return results;
  }
}

module.exports = { 
  UploadProvider, 
  PicGoProvider, 
  CatboxProvider, 
  UploadServiceManager 
};
