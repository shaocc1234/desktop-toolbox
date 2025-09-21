// routes/folder.js - 文件夹管理路由
const express = require('express');
const router = express.Router();
const FolderService = require('../services/folderService');
const OptimizedFolderService = require('../services/optimizedFolderService');

// 创建服务实例
const folderService = new FolderService();
const optimizedService = new OptimizedFolderService();

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

module.exports = router;
