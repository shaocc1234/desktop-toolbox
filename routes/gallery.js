// routes/gallery.js - 图库管理路由
const express = require('express');
const router = express.Router();

// 图库页面
router.get('/', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const { category, search } = req.query;
    
    let images;
    
    if (search) {
      images = await dbService.searchImages(search);
    } else if (category && category !== '') {
      images = await dbService.getImagesByCategory(category);
    } else {
      images = await dbService.getAllImages();
    }
    
    // 获取所有分类用于筛选
    const allImages = await dbService.getAllImages();
    const categories = [...new Set(allImages.map(img => img.category))];
    
    res.render('gallery');
    
  } catch (error) {
    console.error('获取图库数据失败:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '获取图库数据失败',
      error: error
    });
  }
});

// 获取图片详情
router.get('/image/:id', async (req, res) => {
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
      image: image
    });
    
  } catch (error) {
    console.error('获取图片详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除单个图片
router.delete('/image/:id', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const imageId = parseInt(req.params.id);
    
    const success = await dbService.deleteImage(imageId);
    
    if (success) {
      res.json({
        success: true,
        message: '图片删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '图片不存在'
      });
    }
    
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量删除图片
router.delete('/images', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的图片ID列表'
      });
    }
    
    const deletedCount = await dbService.deleteImages(ids);
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 张图片`,
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('批量删除图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新图片信息
router.put('/image/:id', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const imageId = parseInt(req.params.id);
    const { category, description, tags } = req.body;
    
    const updates = {};
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段'
      });
    }
    
    const success = await dbService.updateImage(imageId, updates);
    
    if (success) {
      res.json({
        success: true,
        message: '图片信息更新成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '图片不存在'
      });
    }
    
  } catch (error) {
    console.error('更新图片信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取图库统计信息
router.get('/stats', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService;
    const stats = await dbService.getStatistics();
    
    res.json({
      success: true,
      statistics: stats
    });
    
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
