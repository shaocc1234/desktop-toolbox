// routes/api.js - API接口路由
const express = require('express');
const router = express.Router();

// API 根路径
router.get('/', (req, res) => {
  res.json({
    name: '图库上传工具 API',
    version: '1.0.0',
    endpoints: {
      images: '/api/images',
      upload: '/api/upload',
      services: '/api/services'
    }
  });
});

// 获取所有图片 (JSON API)
router.get('/images', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const { category, search, limit = 50, offset = 0 } = req.query;
    
    let images;
    
    if (search) {
      images = await dbService.searchImages(search);
    } else if (category && category !== '') {
      images = await dbService.getImagesByCategory(category);
    } else {
      images = await dbService.getAllImages();
    }
    
    // 分页处理
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedImages = images.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedImages,
      pagination: {
        total: images.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < images.length
      }
    });
    
  } catch (error) {
    console.error('API获取图片列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个图片信息
router.get('/images/:id', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const imageId = parseInt(req.params.id);
    
    const image = await dbService.getImageById(imageId);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        error: '图片不存在'
      });
    }
    
    res.json({
      success: true,
      data: image
    });
    
  } catch (error) {
    console.error('API获取图片详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取分类列表
router.get('/categories', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const allImages = await dbService.getAllImages();
    
    // 统计每个分类的图片数量
    const categoryStats = {};
    allImages.forEach(image => {
      const category = image.category || '默认';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    const categories = Object.keys(categoryStats).map(name => ({
      name,
      count: categoryStats[name]
    }));
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('API获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 搜索图片
router.get('/search', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const { q: query, limit = 20 } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }
    
    const images = await dbService.searchImages(query.trim());
    const limitedImages = images.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedImages,
      query: query.trim(),
      total: images.length
    });
    
  } catch (error) {
    console.error('API搜索图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取统计信息
router.get('/stats', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const allImages = await dbService.getAllImages();
    
    // 计算基本统计
    const totalImages = allImages.length;
    const totalSize = allImages.reduce((sum, img) => sum + (img.size || 0), 0);
    const compressedCount = allImages.filter(img => img.was_compressed).length;
    
    // 按服务统计
    const serviceStats = {};
    allImages.forEach(image => {
      const service = image.service || '未知';
      serviceStats[service] = (serviceStats[service] || 0) + 1;
    });
    
    // 按分类统计
    const categoryStats = {};
    allImages.forEach(image => {
      const category = image.category || '默认';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // 最近上传统计 (最近7天)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentImages = allImages.filter(img => 
      new Date(img.upload_time) > sevenDaysAgo
    );
    
    res.json({
      success: true,
      data: {
        overview: {
          totalImages,
          totalSize,
          averageSize: totalImages > 0 ? Math.round(totalSize / totalImages) : 0,
          compressedCount,
          compressionRate: totalImages > 0 ? (compressedCount / totalImages * 100).toFixed(1) : 0
        },
        services: serviceStats,
        categories: categoryStats,
        recent: {
          count: recentImages.length,
          period: '7天'
        }
      }
    });
    
  } catch (error) {
    console.error('API获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
