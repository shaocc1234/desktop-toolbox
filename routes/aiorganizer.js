// routes/aiorganizer.js - AI文件整理路由
const express = require('express');
const router = express.Router();
const AiorganizerService = require('../services/aiorganizerService');

// 创建服务实例
const service = new AiorganizerService();

// 显示AI文件整理页面
router.get('/', (req, res) => {
    res.render('aiorganizer', {
        title: 'AI文件整理',
        currentPath: req.path
    });
});

// 扫描目录接口
router.post('/scan', async (req, res) => {
    try {
        const { directoryPath, maxDepth = 2 } = req.body;

        if (!directoryPath) {
            return res.status(400).json({
                success: false,
                message: '请提供目录路径'
            });
        }

        const result = await service.scanDirectory(directoryPath, maxDepth);
        res.json(result);
    } catch (error) {
        console.error('扫描目录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '扫描目录失败'
        });
    }
});

// AI分类接口
router.post('/classify', async (req, res) => {
    try {
        console.log('🔍 收到AI分类请求:', {
            hasPathList: !!req.body.pathList,
            pathListLength: req.body.pathList?.length,
            hasApiKey: !!req.body.apiKey,
            model: req.body.model,
            promptTemplate: req.body.promptTemplate,
            round: req.body.round,
            hasCustomPrompt: !!req.body.customPrompt,
            hasUserFeedback: !!req.body.userFeedback
        });

        const {
            pathList,
            apiKey,
            model = 'BAAI/bge-m3',
            customPrompt = null,
            promptTemplate = 'default',
            previousResult = null,
            userFeedback = null,
            round = 1
        } = req.body;

        if (!pathList || !Array.isArray(pathList)) {
            console.error('❌ 路径列表无效:', pathList);
            return res.status(400).json({
                success: false,
                message: '请提供有效的路径列表',
                debug: { pathList: pathList }
            });
        }

        if (!apiKey) {
            console.error('❌ API密钥缺失');
            return res.status(400).json({
                success: false,
                message: '请提供API密钥'
            });
        }

        // 验证API密钥格式
        if (!service.validateApiKey(apiKey)) {
            console.error('❌ API密钥格式不正确:', apiKey.substring(0, 10) + '...');
            return res.status(400).json({
                success: false,
                message: 'API密钥格式不正确'
            });
        }

        // 如果提供了自定义提示词，验证其不为空
        if (customPrompt !== null && !customPrompt.trim()) {
            console.error('❌ 自定义提示词为空');
            return res.status(400).json({
                success: false,
                message: '自定义提示词不能为空'
            });
        }

        console.log('✅ 开始调用AI分类服务...');
        const result = await service.classifyWithAI(
            pathList,
            apiKey,
            model,
            customPrompt,
            promptTemplate,
            previousResult,
            userFeedback,
            round
        );

        console.log('✅ AI分类完成:', {
            success: result.success,
            categoriesCount: Object.keys(result.categories || {}).length,
            suggestionsCount: result.suggestions?.length || 0,
            round: result.round
        });

        // 确保返回的数据结构符合前端期望
        const response = {
            success: result.success,
            data: {
                categories: result.categories || {},
                suggestions: result.suggestions || []
            },
            round: result.round,
            batchInfo: result.batchInfo || result.layeredClassification,
            debug: result.debug
        };

        res.json(response);
    } catch (error) {
        console.error('❌ AI分类错误:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({
            success: false,
            message: error.message || 'AI分类失败',
            debug: {
                errorName: error.name,
                errorMessage: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// 文件移动预览接口
router.post('/move/preview', async (req, res) => {
    try {
        const { basePath, classificationResult } = req.body;

        if (!basePath || !classificationResult) {
            return res.status(400).json({
                success: false,
                message: '请提供基础路径和分类结果'
            });
        }

        const result = await service.executeFileMove(basePath, classificationResult, true);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('预览文件移动错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '预览失败'
        });
    }
});

// 执行文件移动接口
router.post('/move/execute', async (req, res) => {
    try {
        const { basePath, classificationResult } = req.body;

        if (!basePath || !classificationResult) {
            return res.status(400).json({
                success: false,
                message: '请提供基础路径和分类结果'
            });
        }

        const result = await service.executeFileMove(basePath, classificationResult, false);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('执行文件移动错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '文件移动失败'
        });
    }
});

// 获取支持的AI模型列表
router.get('/models', (req, res) => {
    try {
        const models = service.getSupportedModels();
        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        console.error('获取模型列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取模型列表失败'
        });
    }
});

// 验证API密钥
router.post('/validate-key', (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: '请提供API密钥'
            });
        }

        const isValid = service.validateApiKey(apiKey);
        res.json({
            success: true,
            data: {
                valid: isValid,
                message: isValid ? 'API密钥格式正确' : 'API密钥格式不正确'
            }
        });
    } catch (error) {
        console.error('验证API密钥错误:', error);
        res.status(500).json({
            success: false,
            message: '验证失败'
        });
    }
});

// 获取移动历史记录
router.post('/history', async (req, res) => {
    try {
        const { basePath } = req.body;

        if (!basePath) {
            return res.status(400).json({
                success: false,
                message: '请提供基础路径'
            });
        }

        const result = await service.getMoveHistory(basePath);
        console.log('📋 返回移动历史记录:', {
            existingFolders: result.data.summary.totalExistingFolders,
            movedFiles: result.data.summary.totalMovedFiles,
            remainingFiles: result.data.summary.totalRemainingFiles
        });

        res.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('❌ 获取移动历史记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取移动历史记录失败'
        });
    }
});

// 获取提示词历史记录
router.get('/prompt-history', (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const history = service.getPromptHistory(parseInt(limit));

        console.log('📋 返回提示词历史记录:', history.length, '条');

        res.json({
            success: true,
            data: {
                history: history,
                total: history.length
            }
        });
    } catch (error) {
        console.error('❌ 获取提示词历史记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取提示词历史记录失败'
        });
    }
});

// 获取对话历史记录
router.get('/dialogue-history', (req, res) => {
    try {
        const { limit = 100, round } = req.query;
        const history = service.getDialogueHistory(
            parseInt(limit),
            round ? parseInt(round) : null
        );

        console.log('💬 返回对话历史记录:', history.length, '条');

        res.json({
            success: true,
            data: {
                history: history,
                total: history.length
            }
        });
    } catch (error) {
        console.error('❌ 获取对话历史记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取对话历史记录失败'
        });
    }
});

// 清空历史记录
router.post('/clear-history', (req, res) => {
    try {
        const { type = 'all' } = req.body;
        service.clearHistory(type);

        console.log('🗑️ 清空历史记录:', type);

        res.json({
            success: true,
            message: `已清空${type === 'all' ? '所有' : type === 'prompt' ? '提示词' : '对话'}历史记录`
        });
    } catch (error) {
        console.error('❌ 清空历史记录错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '清空历史记录失败'
        });
    }
});

// 获取可用AI模型列表
router.get('/models', (req, res) => {
    try {
        const models = service.getSupportedModels();
        console.log('📋 返回模型列表:', models.length, '个模型');
        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        console.error('❌ 获取模型列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取模型列表失败'
        });
    }
});

// 获取服务状态
router.get('/status', async (req, res) => {
    try {
        const stats = await service.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取服务状态错误:', error);
        res.status(500).json({
            success: false,
            message: '获取状态失败'
        });
    }
});

module.exports = router;
