// routes/upload.js - 上传功能路由
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UploadServiceManager } = require('../services/uploadService');
const ImageCompressionService = require('../services/imageService');
const ImageRecord = require('../models/ImageRecord');

const router = express.Router();

// 配置 Multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 修复中文文件名编码问题
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB 限制
    files: 50 // 最多50个文件
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// 初始化上传服务管理器
const uploadManager = new UploadServiceManager();

// 上传页面
router.get('/', (req, res) => {
  res.render('upload');
});

// 设置PicGo API Key
router.post('/set-picgo-key', (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API Key 不能为空'
      });
    }

    // 设置API Key到上传管理器
    uploadManager.setPicGoApiKey(apiKey);

    res.json({
      success: true,
      message: 'PicGo API Key 设置成功'
    });
  } catch (error) {
    console.error('设置PicGo API Key失败:', error);
    res.status(500).json({
      success: false,
      error: '设置失败: ' + error.message
    });
  }
});

// 处理文件上传
router.post('/files', upload.array('images', 50), async (req, res) => {
  try {
    const files = req.files;
    const { category = '默认', description = '', service = 'PicGo', picgoApiKey } = req.body;

    // 如果提供了PicGo API Key，先设置它
    if (service === 'PicGo' && picgoApiKey) {
      uploadManager.setPicGoApiKey(picgoApiKey);
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    console.log(`📤 开始批量上传 ${files.length} 个文件`);
    console.log(`🏷️ 分类: ${category}, 服务: ${service}`);
    
    const results = [];
    const dbService = req.app.locals.dbService;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 修复中文文件名编码问题
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      file.originalname = originalName;
      
      console.log(`\n📁 处理文件 ${i + 1}/${files.length}: ${originalName}`);
      
      try {
        // 检查文件是否为图片
        if (!ImageCompressionService.isImageFile(file.path)) {
          results.push({
            filename: file.originalname,
            success: false,
            error: '不是有效的图片文件'
          });
          continue;
        }
        
        // 获取图片信息
        const imageInfo = await ImageCompressionService.getImageInfo(file.path);
        console.log(`📊 图片信息: ${imageInfo.width}x${imageInfo.height}, ${imageInfo.format}, ${ImageCompressionService.formatFileSize(imageInfo.size)}`);
        
        // 智能压缩（如果需要）
        const provider = uploadManager.getProvider(service);
        const compressionResult = await ImageCompressionService.smartCompress(
          file.path, 
          provider ? provider.maxFileSize : 10 * 1024 * 1024
        );
        
        if (!compressionResult.success) {
          results.push({
            filename: file.originalname,
            success: false,
            error: compressionResult.error
          });
          continue;
        }
        
        // 上传到图床
        console.log(`☁️ 开始上传到 ${service}...`);
        const uploadResult = await uploadManager.uploadWithFallback(compressionResult.compressedPath);
        
        if (uploadResult.success) {
          // 保存到数据库
          const record = new ImageRecord({
            filename: file.filename,
            original_name: file.originalname,
            url: uploadResult.url,
            size: compressionResult.compressedSize,
            category: category,
            description: description,
            service: uploadResult.service,
            upload_time: new Date().toISOString(),
            was_compressed: compressionResult.wasCompressed,
            original_size: compressionResult.originalSize,
            compression_ratio: compressionResult.compressionRatio
          });
          
          const recordId = await dbService.addImageRecord(record);
          console.log(`💾 保存到数据库: ID=${recordId}`);
          
          results.push({
            id: recordId,
            filename: file.originalname,
            url: uploadResult.url,
            success: true,
            service: uploadResult.service,
            wasCompressed: compressionResult.wasCompressed,
            compressionRatio: compressionResult.compressionRatio,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize
          });
          
          console.log(`✅ 上传成功: ${uploadResult.url}`);
        } else {
          results.push({
            filename: file.originalname,
            success: false,
            error: uploadResult.error
          });
          console.log(`❌ 上传失败: ${uploadResult.error}`);
        }
        
        // 清理临时文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        if (compressionResult.compressedPath !== file.path && 
            fs.existsSync(compressionResult.compressedPath)) {
          fs.unlinkSync(compressionResult.compressedPath);
        }
        
      } catch (error) {
        console.error(`处理文件 ${file.originalname} 时出错:`, error);
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`\n📊 批量上传完成: 成功 ${successCount} 个，失败 ${failCount} 个`);
    
    res.json({
      success: true,
      message: `上传完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      results: results,
      statistics: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    });
    
  } catch (error) {
    console.error('批量上传错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取上传服务状态
router.get('/services/status', async (req, res) => {
  try {
    const status = await uploadManager.checkAllServices();
    res.json({
      success: true,
      services: status,
      current: uploadManager.currentProvider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 切换上传服务
router.post('/services/switch', (req, res) => {
  try {
    const { service } = req.body;
    const success = uploadManager.setCurrentProvider(service);
    
    if (success) {
      res.json({
        success: true,
        message: `已切换到 ${service} 服务`,
        current: uploadManager.currentProvider
      });
    } else {
      res.status(400).json({
        success: false,
        error: '无效的服务名称'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
