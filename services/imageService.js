// services/imageService.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageCompressionService {
  static async smartCompress(filePath, maxSize = 10 * 1024 * 1024) {
    try {
      const originalSize = fs.statSync(filePath).size;
      
      // 如果文件已经小于限制，直接返回
      if (originalSize <= maxSize) {
        return {
          success: true,
          compressedPath: filePath,
          originalSize: originalSize,
          compressedSize: originalSize,
          wasCompressed: false
        };
      }
      
      console.log(`📸 开始压缩图片: ${path.basename(filePath)} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
      
      // 根据文件大小计算压缩参数
      let quality = 80;
      let maxWidth, maxHeight;
      
      if (originalSize > 50 * 1024 * 1024) { // 50MB+
        quality = 60;
        maxWidth = maxHeight = 2048;
      } else if (originalSize > 20 * 1024 * 1024) { // 20MB+
        quality = 70;
        maxWidth = maxHeight = 3000;
      } else { // 10MB+
        quality = 80;
        maxWidth = maxHeight = 4000;
      }
      
      console.log(`🔧 压缩参数: 质量=${quality}%, 最大尺寸=${maxWidth}x${maxHeight}`);
      
      // 生成压缩后的文件路径
      const ext = path.extname(filePath);
      const compressedPath = filePath.replace(ext, `_compressed${ext}`);
      
      // 执行压缩
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: quality, 
          progressive: true,
          mozjpeg: true
        })
        .toFile(compressedPath);
      
      const compressedSize = fs.statSync(compressedPath).size;
      console.log(`📉 首次压缩完成: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
      
      // 如果压缩后仍然超过限制，进行二次压缩
      if (compressedSize > maxSize) {
        console.log(`⚠️ 仍然超过限制，进行二次压缩...`);
        const secondCompressedPath = filePath.replace(ext, `_compressed2${ext}`);
        
        await sharp(compressedPath)
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 60, 
            progressive: true,
            mozjpeg: true
          })
          .toFile(secondCompressedPath);
        
        // 删除第一次压缩的文件
        fs.unlinkSync(compressedPath);
        
        const finalSize = fs.statSync(secondCompressedPath).size;
        console.log(`📉 二次压缩完成: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
        
        return {
          success: true,
          compressedPath: secondCompressedPath,
          originalSize: originalSize,
          compressedSize: finalSize,
          wasCompressed: true,
          compressionRatio: ((originalSize - finalSize) / originalSize * 100).toFixed(1)
        };
      }
      
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      console.log(`✅ 压缩完成: 节省 ${compressionRatio}% 空间`);
      
      return {
        success: true,
        compressedPath: compressedPath,
        originalSize: originalSize,
        compressedSize: compressedSize,
        wasCompressed: true,
        compressionRatio: compressionRatio
      };
      
    } catch (error) {
      console.error(`❌ 图片压缩失败:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static async getImageInfo(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      const stats = fs.statSync(filePath);
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: stats.size,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density
      };
    } catch (error) {
      console.error(`获取图片信息失败:`, error.message);
      return null;
    }
  }
  
  static isImageFile(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }
  
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ImageCompressionService;
