// routes/folder.js - 文件夹管理路由
const express = require('express');
const router = express.Router();
const FolderService = require('../services/folderService');
const OptimizedFolderService = require('../services/optimizedFolderService');
const ClassificationService = require('../services/classificationService');

// 创建服务实例
const folderService = new FolderService();
const optimizedService = new OptimizedFolderService();
const classificationService = new ClassificationService();

// 文件夹管理主页
router.get('/', (req, res) => {
    res.render('folder', {
        title: '文件夹管理',
        currentPath: req.path
    });
});

// 扫描指定目录 - 使用优化版本
router.post('/scan', async (req, res) => {
    try {
        const { directory, includeSubfolders = true, useOptimized = true } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        // 根据参数选择使用优化版本或原版本
        const service = useOptimized ? optimizedService : folderService;
        const startTime = Date.now();

        // 进度回调函数
        const progressCallback = (progress) => {
            // 通过WebSocket发送进度更新（如果有WebSocket连接）
            if (req.app.get('io')) {
                req.app.get('io').emit('scan-progress', {
                    sessionId: req.body.sessionId || 'default',
                    ...progress
                });
            }
        };

        let result;
        if (useOptimized) {
            result = await service.scanDirectoryOptimized(directory, includeSubfolders, progressCallback);
        } else {
            result = await service.scanDirectory(directory, includeSubfolders);
        }

        const endTime = Date.now();
        result.scanTime = endTime - startTime; // 添加扫描时间统计
        result.optimized = useOptimized; // 标记是否使用了优化版本

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('扫描目录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '扫描目录时发生错误'
        });
    }
});

// 删除空文件夹
router.post('/delete-empty', async (req, res) => {
    try {
        const { directory, preview = false, includeSubfolders = true } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await optimizedService.deleteEmptyFolders(directory, preview, includeSubfolders);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('删除空文件夹错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除空文件夹时发生错误'
        });
    }
});

// 按扩展名分类文件
router.post('/classify-by-extension', async (req, res) => {
    try {
        const { directory, preview = false, createSubfolders = true, includeSubfolders = true } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await optimizedService.classifyByExtension(directory, preview, createSubfolders, includeSubfolders);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('文件分类错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '文件分类时发生错误'
        });
    }
});

// 获取目录统计信息
router.post('/stats', async (req, res) => {
    try {
        const { directory, includeSubfolders = true } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const stats = await optimizedService.getDirectoryStats(directory, includeSubfolders);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取目录统计错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取目录统计时发生错误'
        });
    }
});

// 清理重复文件
router.post('/remove-duplicates', async (req, res) => {
    try {
        const { directory, preview = false, includeSubfolders = true } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await optimizedService.removeDuplicateFiles(directory, preview, includeSubfolders);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('清理重复文件错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '清理重复文件时发生错误'
        });
    }
});

// 缓存管理
router.get('/cache/stats', (req, res) => {
    try {
        const stats = optimizedService.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/cache/clear', (req, res) => {
    try {
        optimizedService.clearCache();
        res.json({
            success: true,
            message: '缓存已清理'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取指定分类的文件列表
router.post('/category-files', async (req, res) => {
    try {
        const { directoryPath, category, includeSubfolders = true } = req.body;

        if (!directoryPath || !category) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径和文件分类'
            });
        }

        const result = await folderService.getCategoryFiles(directoryPath, category, includeSubfolders);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取分类文件列表错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取可用的分类策略
router.get('/classification/strategies', (req, res) => {
    try {
        const strategies = classificationService.getAvailableStrategies();
        res.json({
            success: true,
            data: strategies
        });
    } catch (error) {
        console.error('获取分类策略错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 统一文件分类接口
router.post('/classify', async (req, res) => {
    try {
        const {
            directory,
            strategy = 'extension',
            preview = false,
            createSubfolders = true,
            includeSubfolders = true,
            strategyOptions = {}
        } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await classificationService.classifyFiles(directory, {
            strategy,
            preview,
            createSubfolders,
            includeSubfolders,
            strategyOptions
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('文件分类错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '文件分类时发生错误'
        });
    }
});

// 预览分类结果
router.post('/classify/preview', async (req, res) => {
    try {
        const {
            directory,
            strategy = 'extension',
            includeSubfolders = true,
            strategyOptions = {}
        } = req.body;

        if (!directory) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await classificationService.classifyFiles(directory, {
            strategy,
            preview: true,
            createSubfolders: false,
            includeSubfolders,
            strategyOptions
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('预览分类错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '预览分类时发生错误'
        });
    }
});

module.exports = router;
