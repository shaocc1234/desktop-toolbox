// routes/rename.js - Ai 重命名路由 (第二阶段：基础文档处理)
const express = require('express');
const router = express.Router();
const RenameService = require('../services/renameService');
const DatabaseService = require('../services/databaseService');

// 创建服务实例工厂函数
async function createRenameService(config = {}) {
    // 解析模型配置
    const modelConfig = parseModelConfig(config.model || 'embedding:Qwen/Qwen3-Embedding-8B');

    // 从数据库加载多AI配置
    let multiAIConfig = null;
    try {
        const dbService = new DatabaseService();
        const allPriorities = await dbService.getAllAIModelPriorities();
        dbService.close();

        // 构建多AI配置 - 优先使用前端传递的API密钥
        const frontendApiKeys = config.multiAIConfig?.apiKeys || {};
        multiAIConfig = {
            enabled: config.useMultiAI || true,
            apiKeys: {
                siliconflow: frontendApiKeys.siliconflow || config.apiKey || process.env.SILICONFLOW_API_KEY,
                doubao: frontendApiKeys.doubao || process.env.DOUBAO_API_KEY,
                deepseek: frontendApiKeys.deepseek || process.env.DEEPSEEK_API_KEY
            },
            priorities: config.multiAIConfig?.priorities || allPriorities
        };

        console.log('🔧 加载多AI配置:', {
            chatModels: multiAIConfig.priorities.chat?.length || 0,
            visionModels: multiAIConfig.priorities.vision?.length || 0,
            hasDoubaoKey: !!multiAIConfig.apiKeys.doubao,
            hasSiliconflowKey: !!multiAIConfig.apiKeys.siliconflow,
            hasDeepseekKey: !!multiAIConfig.apiKeys.deepseek
        });
    } catch (error) {
        console.warn('⚠️ 加载多AI配置失败，使用单一服务模式:', error.message);
    }

    return new RenameService({
        // 硅基流动 API配置 (优先使用前端传递的配置)
        apiKey: config.apiKey || process.env.SILICONFLOW_API_KEY,
        baseUrl: config.baseUrl || 'https://api.siliconflow.cn/v1',

        // AI模型配置
        useEmbedding: modelConfig.useEmbedding,
        embeddingModel: modelConfig.embeddingModel,
        chatModel: modelConfig.chatModel,

        // 保持向后兼容
        model: modelConfig.chatModel,

        // 多AI配置
        multiAI: multiAIConfig,

        // 重命名配置
        maxNameLength: 50,
        includeExtension: true,
        ...config
    });
}

// 解析模型配置字符串
function parseModelConfig(modelString) {
    if (modelString.startsWith('embedding:')) {
        return {
            useEmbedding: true,
            embeddingModel: modelString.replace('embedding:', ''),
            chatModel: 'Pro/deepseek-ai/DeepSeek-V3' // 默认对话模型作为备选
        };
    } else if (modelString.startsWith('chat:')) {
        return {
            useEmbedding: false,
            embeddingModel: 'Qwen/Qwen3-Embedding-8B',
            chatModel: modelString.replace('chat:', '')
        };
    } else {
        // 向后兼容：直接的模型名称默认为对话模型
        return {
            useEmbedding: false,
            embeddingModel: 'Qwen/Qwen3-Embedding-8B',
            chatModel: modelString
        };
    }
}

// 显示Ai 重命名页面
router.get('/', (req, res) => {
    res.render('rename', {
        title: 'Ai 重命名',
        currentPath: req.path
    });
});

// Ai 重命名API接口
router.post('/api/process', async (req, res) => {
    try {
        // 使用前端传递的API配置创建服务实例
        const { apiKey, model, files, options } = req.body;

        const modelConfig = parseModelConfig(model || 'embedding:Qwen/Qwen3-Embedding-8B');

        console.log('收到重命名请求:', {
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0,
            model,
            modelConfig,
            filesCount: files ? files.length : 0,
            options
        });

        if (!apiKey || apiKey.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'API密钥不能为空'
            });
        }

        const service = await createRenameService({ apiKey, model });
        const processOptions = {
            ...options,
            selectedModel: model  // 确保模型配置正确传递
        };
        const results = await service.processFiles(files, processOptions);

        // 统计处理结果
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        res.json({
            success: true,
            message: `处理完成：成功 ${successCount}/${totalCount} 个文件`,
            data: {
                results,
                successCount,
                totalCount,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Ai 重命名处理错误:', error);
        res.status(500).json({
            success: false,
            message: '处理失败: ' + error.message
        });
    }
});

// 流式处理文件重命名API (Server-Sent Events)
router.post('/api/process-stream', async (req, res) => {
    try {
        const { apiKey, model, files, options = {} } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：files'
            });
        }

        // 如果启用了多AI模式，不强制要求apiKey
        if (!options.useMultiAI && (!apiKey || apiKey.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'API密钥不能为空'
            });
        }

        console.log('🚀 收到流式处理请求:', {
            filesCount: files.length,
            hasApiKey: !!apiKey,
            model: model || 'default',
            options
        });

        // 设置 SSE 响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // 发送初始化事件
        res.write(`data: ${JSON.stringify({
            type: 'init',
            message: '开始处理文件...',
            total: files.length,
            timestamp: new Date().toISOString()
        })}\n\n`);

        const service = await createRenameService({
            apiKey,
            model,
            useMultiAI: options.useMultiAI,
            multiAIConfig: options.multiAIConfig || options.multiAI
        });

        // 定义进度回调函数
        const progressCallback = (progress) => {
            const eventData = {
                type: 'progress',
                current: progress.current,
                total: progress.total,
                percentage: progress.percentage,
                currentFile: progress.currentFile,
                result: progress.result,
                timestamp: new Date().toISOString()
            };

            console.log(`📊 处理进度: ${progress.current}/${progress.total} (${progress.percentage}%) - ${progress.currentFile}`);

            // 发送进度事件
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        };

        // 开始处理文件
        const processOptions = {
            ...options,
            selectedModel: model  // 确保模型配置正确传递
        };
        const results = await service.processFiles(files, processOptions, progressCallback);

        // 统计处理结果
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        // 发送完成事件
        const completeData = {
            type: 'complete',
            message: `处理完成：成功 ${successCount}/${totalCount} 个文件`,
            results,
            successCount,
            totalCount,
            timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(completeData)}\n\n`);

        console.log(`✅ 流式处理完成: 成功 ${successCount}/${totalCount} 个文件`);

        // 结束连接
        res.end();

    } catch (error) {
        console.error('❌ 流式处理错误:', error);

        // 发送错误事件
        const errorData = {
            type: 'error',
            message: '处理失败: ' + error.message,
            error: error.message,
            timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.end();
    }
});

// 单文件处理API（用于实时更新）
router.post('/api/process-single', async (req, res) => {
    try {
        const { file, options, apiKey, model } = req.body;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: '文件信息不能为空'
            });
        }

        // 如果启用了多AI模式，不强制要求apiKey
        if (!options?.useMultiAI && (!apiKey || apiKey.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'API密钥不能为空'
            });
        }

        const service = await createRenameService({
            apiKey,
            model,
            useMultiAI: options?.useMultiAI,
            multiAIConfig: options?.multiAIConfig || options?.multiAI
        });
        const result = await service.processFile(file, options);

        res.json({
            success: true,
            message: result.success ? '处理成功' : '处理失败',
            data: result
        });
    } catch (error) {
        console.error('单文件处理错误:', error);
        res.status(500).json({
            success: false,
            message: '处理失败: ' + error.message
        });
    }
});

// 预览重命名结果API
router.post('/api/preview', async (req, res) => {
    try {
        const { apiKey, model, files, options } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件数据'
            });
        }

        // 使用前端传递的API配置创建服务实例
        const service = await createRenameService({ apiKey, model });

        // 处理文件并生成预览
        const results = await service.processFiles(files, options);

        res.json({
            success: true,
            message: '预览生成成功',
            data: {
                results,
                stats: service.getFileTypeStats(files),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('预览重命名错误:', error);
        res.status(500).json({
            success: false,
            message: '预览生成失败',
            error: error.message
        });
    }
});

// 获取统计信息API
router.get('/api/stats', async (req, res) => {
    try {
        const stats = await service.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取统计信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取统计信息失败',
            error: error.message
        });
    }
});

// 应用重命名API (单个文件)
router.post('/api/apply', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;

        if (!oldPath || !newName) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：oldPath 和 newName'
            });
        }

        console.log('收到单个重命名请求:', {
            oldPath,
            newName
        });

        // 使用RenameService进行重命名
        const service = await createRenameService({});
        const result = await service.applySingleRename(oldPath, newName);

        if (result.success) {
            console.log(`✅ 文件重命名成功: ${oldPath} → ${result.newPath}`);
            res.json({
                success: true,
                message: '文件重命名成功',
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || '文件重命名失败'
            });
        }

    } catch (error) {
        console.error('文件重命名错误:', error);
        res.status(500).json({
            success: false,
            message: '文件重命名失败',
            error: error.message
        });
    }
});

// 批量应用重命名API
router.post('/api/apply-batch', async (req, res) => {
    try {
        const { renameResults, apiKey } = req.body;

        if (!renameResults || !Array.isArray(renameResults)) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：renameResults'
            });
        }

        console.log('收到批量重命名请求:', {
            filesCount: renameResults.length,
            hasApiKey: !!apiKey
        });

        // 使用RenameService进行批量重命名
        const service = await createRenameService({ apiKey });
        const result = await service.applyBatchRename(renameResults);

        res.json({
            success: result.success,
            message: result.message,
            data: result
        });

    } catch (error) {
        console.error('批量重命名错误:', error);
        res.status(500).json({
            success: false,
            message: '批量重命名失败',
            error: error.message
        });
    }
});

// 单文件处理API - 用于实时更新
router.post('/api/process-single', async (req, res) => {
    try {
        const { file, options, apiKey, model, forceRegenerate } = req.body;

        console.log('收到单文件处理请求:', {
            fileName: file.name,
            hasApiKey: !!apiKey,
            model: model,
            options: options,
            forceRegenerate: forceRegenerate
        });

        // 创建重命名服务实例
        const service = await createRenameService({
            apiKey,
            model,
            useMultiAI: options?.useMultiAI,
            multiAIConfig: options?.multiAIConfig || options?.multiAI
        });

        // 如果是强制重新生成，临时禁用跳过功能
        const processOptions = {
            ...options,
            selectedModel: model  // 确保模型配置正确传递
        };
        if (forceRegenerate) {
            processOptions.skipProcessed = false;
            console.log('强制重新生成模式：已禁用跳过功能');
        }

        // 处理单个文件
        const result = await service.processFile(file, processOptions);

        console.log('单文件处理结果:', {
            fileName: file.name,
            success: result.success,
            newName: result.suggestedName || result.fallbackName
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('单文件处理失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== AI模型配置API ====================

// 保存AI模型优先级配置
router.post('/api/model-priorities', async (req, res) => {
    try {
        const { configType, priorities } = req.body;

        if (!configType || !Array.isArray(priorities)) {
            return res.status(400).json({
                success: false,
                message: '参数错误：需要configType和priorities数组'
            });
        }

        if (!['chat', 'vision'].includes(configType)) {
            return res.status(400).json({
                success: false,
                message: 'configType必须是chat或vision'
            });
        }

        const dbService = new DatabaseService();
        await dbService.saveAIModelPriorities(configType, priorities);
        dbService.close();

        console.log(`✅ AI模型优先级配置已保存: ${configType}`, priorities);

        res.json({
            success: true,
            message: `${configType}模型优先级配置保存成功`,
            data: { configType, count: priorities.length }
        });

    } catch (error) {
        console.error('保存AI模型优先级配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取AI模型优先级配置
router.get('/api/model-priorities/:configType', async (req, res) => {
    try {
        const { configType } = req.params;

        if (!['chat', 'vision'].includes(configType)) {
            return res.status(400).json({
                success: false,
                message: 'configType必须是chat或vision'
            });
        }

        const dbService = new DatabaseService();
        const priorities = await dbService.getAIModelPriorities(configType);
        dbService.close();

        res.json({
            success: true,
            data: {
                configType,
                priorities
            }
        });

    } catch (error) {
        console.error('获取AI模型优先级配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取所有AI模型优先级配置
router.get('/api/model-priorities', async (req, res) => {
    try {
        const dbService = new DatabaseService();
        const allPriorities = await dbService.getAllAIModelPriorities();
        dbService.close();

        res.json({
            success: true,
            data: allPriorities
        });

    } catch (error) {
        console.error('获取所有AI模型优先级配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
