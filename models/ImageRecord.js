// models/ImageRecord.js
class ImageRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.filename = data.filename || "";
    this.original_name = data.original_name || "";
    this.url = data.url || "";
    this.size = data.size || 0;
    this.category = data.category || "默认";
    this.description = data.description || "";
    this.service = data.service || "";
    this.upload_time = data.upload_time || new Date().toISOString();
    this.tags = data.tags || "";
    this.was_compressed = data.was_compressed || false;
    this.original_size = data.original_size || null;
    this.compression_ratio = data.compression_ratio || null;
  }
  
  // 转换为数据库存储格式
  toDbFormat() {
    return {
      filename: this.filename,
      original_name: this.original_name,
      url: this.url,
      size: this.size,
      category: this.category,
      description: this.description,
      service: this.service,
      upload_time: this.upload_time,
      tags: this.tags,
      was_compressed: this.was_compressed ? 1 : 0,
      original_size: this.original_size,
      compression_ratio: this.compression_ratio
    };
  }
  
  // 格式化文件大小显示
  getFormattedSize() {
    const bytes = this.size;
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // 格式化上传时间显示
  getFormattedTime() {
    const date = new Date(this.upload_time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 获取压缩信息
  getCompressionInfo() {
    if (!this.was_compressed) {
      return null;
    }
    
    return {
      originalSize: this.original_size,
      compressedSize: this.size,
      ratio: this.compression_ratio,
      savedBytes: this.original_size - this.size
    };
  }
}

module.exports = ImageRecord;
