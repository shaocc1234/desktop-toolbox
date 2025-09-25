// routes/process.js - 图片处理路由
const express = require('express');
const multer = require('multer');
const path = require('path');
const ImageProcessService = require('../services/imageProcessService');
const router = express.Router();

// 初始化图片处理服务
const imageProcessService = new ImageProcessService();

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 50 // 最多50个文件
  },
  fileFilter: (req, file, cb) => {
    if (imageProcessService.isValidImageFile(file.originalname, file.mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  }
});

// 图片处理页面
router.get('/', (req, res) => {
  res.render('process');
});

// 批量图片处理接口
router.post('/batch', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要处理的图片文件'
      });
    }

    // 验证和清理处理选项
    const options = imageProcessService.validateOptions(req.body);
    
    // 使用服务进行批量处理
    const result = await imageProcessService.processBatch(files, options);
    
    // 转换buffer为base64用于前端显示
    result.results.forEach(item => {
      if (item.success && item.buffer) {
        item.processedBuffer = item.buffer.toString('base64');
        delete item.buffer; // 删除原始buffer节省内存
      }
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('批量处理错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误: ' + error.message
    });
  }
});

// 单个图片处理接口
router.post('/single', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要处理的图片文件'
      });
    }

    // 验证和清理处理选项
    const options = imageProcessService.validateOptions(req.body);
    
    // 使用服务进行处理
    const result = await imageProcessService.processImage(file.buffer, options);
    
    res.json({
      success: true,
      result: {
        originalName: file.originalname,
        originalSize: result.originalSize,
        processedSize: result.processedSize,
        compressionRatio: result.compressionRatio,
        format: result.format,
        width: result.width,
        height: result.height,
        processedBuffer: result.buffer.toString('base64')
      }
    });
    
  } catch (error) {
    console.error('单个处理错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误: ' + error.message
    });
  }
});

// 获取图片信息接口
router.post('/info', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要分析的图片文件'
      });
    }

    const info = await imageProcessService.getImageInfo(file.buffer);
    
    res.json({
      success: true,
      info: {
        filename: file.originalname,
        ...info
      }
    });
    
  } catch (error) {
    console.error('获取图片信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误: ' + error.message
    });
  }
});

// 获取推荐设置接口
router.get('/presets/:scenario', (req, res) => {
  try {
    const { scenario } = req.params;
    const settings = imageProcessService.getRecommendedSettings(scenario);
    
    res.json({
      success: true,
      settings
    });
    
  } catch (error) {
    console.error('获取预设错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误: ' + error.message
    });
  }
});

module.exports = router;
