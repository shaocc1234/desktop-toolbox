const axios = require('axios');
const path = require('path');
const MultiAIService = require('./MultiAIService');

/**
 * AI重命名服务 - 重构版：基于对话模型和视觉模型的智能重命名
 * 支持文本内容分析和图片内容识别
 */
class AIRenameService {
    constructor(config = {}) {
        console.log('AIRenameService 初始化配置:', config);

        this.config = {
            // 硅基流动 API配置
            apiKey: config.apiKey || process.env.SILICONFLOW_API_KEY,
            baseUrl: config.baseUrl || 'https://api.siliconflow.cn/v1',

            // 模型配置
            model: config.model || 'Pro/deepseek-ai/DeepSeek-V3',
            modelType: this.getModelType(config.model || 'Pro/deepseek-ai/DeepSeek-V3'),

            // 重命名配置
            maxNameLength: config.maxNameLength || 50,
            includeExtension: config.includeExtension !== false,

            ...config
        };

        // 初始化多AI服务
        this.multiAI = new MultiAIService();

        // 如果提供了多服务商配置，设置API密钥和优先级
        if (config.multiAI) {
            this.setupMultiAI(config.multiAI);
        }

        console.log('AIRenameService 最终配置:', {
            hasApiKey: !!this.config.apiKey,
            apiKeyLength: this.config.apiKey ? this.config.apiKey.length : 0,
            model: this.config.model,
            modelType: this.config.modelType,
            hasMultiAI: !!config.multiAI
        });

        this.templates = {
            semantic: '基于文档内容的语义分析进行重命名',
            date_content: '结合日期和内容关键词进行重命名',
            category_name: '按内容分类和主题进行重命名',
            custom: '使用自定义规则进行重命名'
        };
    }

    /**
     * 识别模型类型
     * @param {string} model 模型名称
     * @returns {string} 模型类型：'chat' 或 'vision'
     */
    getModelType(model) {
        if (!model) return 'chat';

        // 视觉模型识别
        const visionModels = [
            'Qwen/Qwen2.5-VL-32B-Instruct',
            'THUDM/GLM-4.1V-9B-Thinking',
            'Pro/Qwen/Qwen2.5-VL-7B-Instruct'
        ];

        if (visionModels.some(vm => model.includes(vm))) {
            return 'vision';
        }

        return 'chat';
    }

    /**
     * 设置模型
     * @param {string} modelName 模型名称
     */
    setModel(modelName) {
        this.selectedModel = modelName;
        this.config.model = modelName;
        this.config.modelType = this.getModelType(modelName);
        console.log(`🔄 切换模型: ${modelName} (类型: ${this.config.modelType})`);
    }

    /**
     * 设置多AI服务配置
     * @param {Object} multiAIConfig 多AI配置
     */
    setupMultiAI(multiAIConfig) {
        const { apiKeys = {}, priorities = {} } = multiAIConfig;

        // 设置API密钥
        for (const [provider, apiKey] of Object.entries(apiKeys)) {
            if (apiKey) {
                this.multiAI.setApiKey(provider, apiKey);
            }
        }

        // 设置模型优先级
        if (priorities.chat) {
            this.multiAI.setModelPriorities('chat', priorities.chat);
        }
        if (priorities.vision) {
            this.multiAI.setModelPriorities('vision', priorities.vision);
        }

        console.log('🔧 多AI服务配置完成');
    }

    /**
     * 检查是否为图片文件
     * @param {string} fileName 文件名
     * @returns {boolean} 是否为图片文件
     */
    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif'];
        const ext = path.extname(fileName).toLowerCase();
        return imageExtensions.includes(ext);
    }

    /**
     * 获取视觉模型
     * @param {string} selectedModel 用户选择的模型
     * @returns {string} 视觉模型名称
     */
    getVisionModel(selectedModel) {
        // 如果已经是视觉模型，直接返回
        if (selectedModel && selectedModel.startsWith('vision:')) {
            return selectedModel;
        }

        // 如果是视觉模型但没有前缀，添加前缀
        const visionModels = [
            'Qwen/Qwen2.5-VL-32B-Instruct',
            'THUDM/GLM-4.1V-9B-Thinking',
            'Pro/Qwen/Qwen2.5-VL-7B-Instruct'
        ];

        if (visionModels.includes(selectedModel)) {
            return `vision:${selectedModel}`;
        }

        // 默认视觉模型
        return 'vision:Qwen/Qwen2.5-VL-32B-Instruct';
    }

    /**
     * 获取对话模型
     * @param {string} selectedModel 用户选择的模型
     * @returns {string} 对话模型名称
     */
    getChatModel(selectedModel) {
        // 如果是视觉模型，需要找到合适的对话模型替代
        if (selectedModel && selectedModel.startsWith('vision:')) {
            // 优先使用用户配置的默认对话模型，而不是硬编码DeepSeek-V3
            const fallbackModel = this.getPreferredChatModel();
            console.log(`🔄 视觉模型切换到对话模型: ${selectedModel} → ${fallbackModel}`);
            return fallbackModel;
        }

        // 验证对话模型是否存在
        const validChatModels = [
            'Pro/deepseek-ai/DeepSeek-V3',
            'Pro/deepseek-ai/DeepSeek-R1',
            'Qwen/Qwen3-Next-80B-A3B-Instruct',
            'Pro/Qwen/Qwen2.5-72B-Instruct',
            'ByteDance-Seed/Seed-OSS-36B-Instruct',
            'Qwen/Qwen3-Coder-30B-A3B-Instruct'
        ];

        // 移除chat:前缀（如果有）
        const modelName = selectedModel?.replace('chat:', '') || '';

        // 检查模型是否在有效列表中
        if (validChatModels.includes(modelName)) {
            return modelName;
        }

        // 如果模型不存在，使用首选的对话模型
        const fallbackModel = this.getPreferredChatModel();
        console.warn(`⚠️ 选择的对话模型不存在: ${selectedModel}，使用首选模型: ${fallbackModel}`);
        return fallbackModel;
    }

    /**
     * 获取首选的对话模型
     * @returns {string} 首选对话模型
     */
    getPreferredChatModel() {
        // 优先级顺序：用户配置 > 多AI服务配置 > 默认模型

        // 1. 检查多AI服务是否有配置的对话模型
        if (this.multiAI && this.multiAI.modelPriorities && this.multiAI.modelPriorities.chat) {
            const chatPriorities = this.multiAI.modelPriorities.chat;
            if (chatPriorities.length > 0) {
                const firstPriority = chatPriorities[0];
                if (firstPriority && firstPriority.model) {
                    console.log(`🎯 使用多AI服务首选对话模型: ${firstPriority.model}`);
                    return firstPriority.model;
                }
            }
        }

        // 2. 使用系统默认的非DeepSeek模型
        const preferredModels = [
            'Pro/Qwen/Qwen2.5-72B-Instruct',
            'Qwen/Qwen3-Next-80B-A3B-Instruct',
            'ByteDance-Seed/Seed-OSS-36B-Instruct',
            'Pro/deepseek-ai/DeepSeek-V3' // 最后选择
        ];

        return preferredModels[0]; // 默认使用Qwen2.5-72B
    }

    /**
     * 获取模型显示名称
     * @param {string} modelId 模型ID
     * @returns {string} 显示名称
     */
    getModelDisplayName(modelId) {
        if (!modelId) return '未知模型';

        // 移除前缀
        const cleanModelId = modelId.replace(/^(chat:|vision:)/, '');

        // 根据模型ID返回友好的显示名称
        if (cleanModelId.includes('DeepSeek-V3')) {
            return 'DeepSeek V3 (高性能)';
        } else if (cleanModelId.includes('DeepSeek-R1')) {
            return 'DeepSeek R1 (推理)';
        } else if (cleanModelId.includes('Qwen2.5-VL-32B-Instruct')) {
            return 'Qwen 2.5 VL 32B (视觉)';
        } else if (cleanModelId.includes('Qwen2.5-72B-Instruct')) {
            return 'Qwen 2.5 72B (推荐)';
        } else if (cleanModelId.includes('Qwen3-Next-80B-A3B-Instruct')) {
            return 'Qwen 3 Next 80B A3B (指令)';
        } else if (cleanModelId.includes('doubao-seed-1-6-flash-250615')) {
            return '豆包1.6 Flash';
        } else if (cleanModelId.includes('doubao-seed-1-6-thinking-250615')) {
            return '豆包1.6 Thinking';
        } else if (cleanModelId.includes('deepseek-chat')) {
            return 'DeepSeek Chat (官方)';
        } else if (cleanModelId.includes('deepseek-reasoner')) {
            return 'DeepSeek R1 (官方推理)';
        }

        // 如果找不到匹配，返回简化的显示名称
        if (cleanModelId.includes('DeepSeek')) {
            return 'DeepSeek (深度求索)';
        } else if (cleanModelId.includes('Qwen')) {
            return 'Qwen (通义千问)';
        } else if (cleanModelId.includes('doubao')) {
            return 'Doubao (豆包)';
        }

        return cleanModelId;
    }

    /**
     * 基于文档内容生成智能文件名
     * 优先使用嵌入模型进行语义匹配，必要时使用对话模型
     * @param {Object} documentInfo 文档信息
     * @param {Object} config 重命名配置
     * @returns {Promise<Object>} 重命名结果
     */
    async generateSmartFileName(documentInfo, config = {}) {
        try {
            const { fileName, content, metadata, fileType, filePath } = documentInfo;
            const template = config.template || 'semantic';
            const customPrompt = config.customPrompt || '';
            const useOCR = config.useOCR !== false; // 默认使用OCR

            console.log(`为文件 ${fileName} 生成智能文件名 (模板: ${template})`);

            let aiResponse;
            let method = 'unknown';

            console.log('当前配置:', {
                selectedModel: config.selectedModel,
                useOCR,
                template,
                hasApiKey: !!this.config.apiKey,
                fileType
            });

            // 第六阶段策略：根据文件类型自动选择模型
            if (this.isImageFile(fileName)) {
                // 图片文件：使用视觉模型
                console.log('🖼️ 检测到图片文件，使用视觉模型...');

                // 确保使用视觉模型
                const visionModel = this.getVisionModel(config.selectedModel);
                this.setModel(visionModel);

                try {
                    if (useOCR && filePath) {
                        // OCR + 视觉模型组合方案
                        console.log('🔍 使用OCR + 视觉模型组合方案');
                        aiResponse = await this.generateNameWithVisionAndOCR(filePath, content, visionModel, config);
                        method = 'vision_ocr_hybrid';
                    } else {
                        // 纯视觉模型方案
                        console.log('🎨 使用纯视觉模型方案');
                        const visionDocumentInfo = { ...documentInfo, filePath };
                        aiResponse = await this.generateNameWithVision(visionDocumentInfo, config);
                        method = 'vision_only';
                    }
                } catch (error) {
                    // 检查是否需要触发OCR降级
                    if (error.message.startsWith('TRIGGER_OCR_FALLBACK:')) {
                        console.log('🔄 视觉模型失败，启动OCR降级方案');
                        method = 'ocr_fallback';

                        // 强制启用OCR降级
                        const fallbackConfig = { ...config, useOCR: true, forceOCRFallback: true };
                        aiResponse = await this.generateNameWithVisionAndOCR(filePath, content, visionModel, fallbackConfig);
                    } else {
                        throw error; // 重新抛出其他错误
                    }
                }
            } else {
                // 文档文件：使用对话模型
                console.log('📄 检测到文档文件，使用对话模型...');

                // 确保使用对话模型
                const chatModel = this.getChatModel(config.selectedModel);
                this.setModel(chatModel);

                const prompt = this.buildPrompt(documentInfo, template, customPrompt, config);
                aiResponse = await this.callChatModel(prompt);
                method = 'chat';
            }

            // 处理AI响应
            const suggestedName = this.processAIResponse(aiResponse, fileName);

            // 验证和清理文件名
            const finalName = this.validateAndCleanFileName(suggestedName, fileName);

            return {
                success: true,
                originalName: fileName,
                suggestedName: finalName,
                template,
                method, // 记录使用的方法
                reasoning: aiResponse.reasoning || `基于${method === 'embedding' ? '语义嵌入' : '对话模型'}的智能分析`,
                confidence: aiResponse.confidence || 0.8,
                metadata: {
                    contentLength: content?.length || 0,
                    fileType,
                    template,
                    method,
                    processedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('生成智能文件名失败:', error);
            return {
                success: false,
                originalName: documentInfo.fileName,
                error: error.message,
                fallbackName: this.generateFallbackName(documentInfo)
            };
        }
    }

    /**
     * 构建AI提示词
     * @param {Object} documentInfo 文档信息
     * @param {string} template 命名模板
     * @param {string} customPrompt 自定义提示词
     * @param {Object} config 配置选项
     * @returns {string} AI提示词
     */
    buildPrompt(documentInfo, template, customPrompt, config = {}) {
        const { fileName, content, metadata, fileType } = documentInfo;
        // 使用改进的内容提取方法
        const contentPreview = this.extractKeyContent(content || '', 300);

        let basePrompt = `请为以下文档生成一个简洁、描述性的中文文件名：

文档信息：
- 原文件名: ${fileName}
- 文件类型: ${fileType}
- 内容预览: ${contentPreview}

**重要说明：请务必使用中文命名，避免使用英文单词。**`;

        // 简化元数据处理，避免提示词过长
        if (metadata && Object.keys(metadata).length > 0) {
            const simpleMetadata = {
                size: metadata.size || metadata.contentLength,
                type: metadata.type || fileType
            };
            basePrompt += `\n- 文档大小: ${simpleMetadata.size || '未知'}`;
        }

        // 根据模板添加特定要求
        switch (template) {
            case 'semantic':
                basePrompt += `\n\n命名要求：
- 基于文档的主要内容和主题
- **必须使用中文命名**，简洁、描述性
- 体现文档的核心价值和用途
- 优先使用专业术语和功能描述
- 长度控制在${this.config.maxNameLength}字符以内`;
                break;

            case 'date_content':
                basePrompt += `\n\n命名要求：
- **必须使用中文命名**
- 包含日期信息（如果文档中有日期）
- 结合内容关键词
- 格式建议：YYYY-MM-DD_关键词_描述（中文）
- 长度控制在${this.config.maxNameLength}字符以内`;
                break;

            case 'category_name':
                basePrompt += `\n\n命名要求：
- **必须使用中文命名**
- 先确定文档类别（如：报告、合同、说明书、工具脚本等）
- 再添加具体描述
- 格式建议：类别_具体描述（全中文）
- 长度控制在${this.config.maxNameLength}字符以内`;
                break;

            case 'custom':
                basePrompt += `\n\n自定义要求：
${customPrompt}
- **优先使用中文命名**（除非自定义要求明确指定其他语言）
- 长度控制在${this.config.maxNameLength}字符以内`;
                break;
        }

        // 如果不是custom模板但有自定义提示词，也要应用
        if (template !== 'custom' && customPrompt && customPrompt.trim().length > 0) {
            console.log(`📝 应用额外自定义提示词: ${customPrompt.substring(0, 100)}...`);
            basePrompt += `\n\n额外要求：
${customPrompt}`;
        }

        // 检查是否应该保持原文件名（两种方式）
        if (this.shouldKeepOriginalName(fileName, customPrompt, config)) {
            basePrompt += `\n\n**特别注意：如果原文件名已经具有明确含义且符合要求，请保持原文件名不变。**`;
        }

        basePrompt += `\n\n请返回JSON格式：
{
  "suggestedName": "建议的文件名（不包含扩展名）",
  "reasoning": "命名理由",
  "confidence": 0.9
}`;

        return basePrompt;
    }

    /**
     * 检查自定义提示词中是否有保留原名的请求
     * @param {string} customPrompt 自定义提示词
     * @returns {boolean} 是否有保留原名请求
     */
    hasKeepOriginalNameRequest(customPrompt) {
        if (!customPrompt) return false;

        const prompt = customPrompt.toLowerCase();
        const keepOriginalKeywords = [
            '保持原名',
            '保留原名',
            '不进行处理',
            '不要重命名',
            '保持不变',
            '维持原名',
            'keep original',
            'keep name',
            'do not rename'
        ];

        return keepOriginalKeywords.some(keyword => prompt.includes(keyword));
    }

    /**
     * 判断是否应该保持原文件名（兼容旧接口）
     * @param {string} fileName 原文件名
     * @param {string} customPrompt 自定义提示词
     * @param {Object} config 配置选项
     * @returns {boolean} 是否保持原名
     */
    shouldKeepOriginalName(fileName, customPrompt, config = {}) {
        // 方式1：检查自定义提示词中是否包含保持原名的指令
        if (this.hasKeepOriginalNameRequest(customPrompt)) {
            return this.hasmeaningfulName(fileName);
        }

        // 方式2：检查配置选项中的智能保留原名设置
        if (config.smartKeepOriginal) {
            return this.hasmeaningfulName(fileName);
        }

        return false;
    }

    /**
     * 检查文件名是否有意义
     * @param {string} fileName 文件名
     * @returns {boolean} 是否有意义
     */
    hasmeaningfulName(fileName) {
        const baseFileName = fileName.replace(/\.[^/.]+$/, ''); // 移除扩展名

        // 排除无意义的文件名模式
        const meaninglessPatterns = [
            /^IMG_\d+$/i,           // IMG_001
            /^DSC\d+$/i,            // DSC001
            /^P\d+$/i,              // P001
            /^photo\d*$/i,          // photo, photo1
            /^image\d*$/i,          // image, image1
            /^未命名/,               // 未命名
            /^新建/,                 // 新建文档
            /^副本/,                 // 副本
            /^copy/i,               // copy
            /^新文档/,               // 新文档
            /^文档\d*$/             // 文档1, 文档2
        ];

        // 如果匹配无意义模式，返回false
        if (meaninglessPatterns.some(pattern => pattern.test(baseFileName))) {
            console.log(`📋 检测到无意义的文件名: ${baseFileName}`);
            return false;
        }

        // 检查文件名是否已经具有明确的含义
        const meaningfulPatterns = [
            /\d{4}年\d{1,2}月\d{1,2}日/,  // 日期格式：2025年8月26日
            /\d{4}-\d{1,2}-\d{1,2}/,      // 日期格式：2025-08-26
            /待发货|已发货|订单|明细|清单|报告|合同|协议|发票|收据/,  // 业务含义词汇
            /[\u4e00-\u9fa5]{2,}.*[\u4e00-\u9fa5]{2,}/  // 包含多个中文词汇（至少2个字）
        ];

        // 如果文件名匹配任何一个有意义的模式，建议保持原名
        const hasPattern = meaningfulPatterns.some(pattern => pattern.test(baseFileName));

        if (hasPattern) {
            console.log(`📋 检测到有意义的文件名模式: ${baseFileName}`);
            return true;
        }

        return false;
    }

    /**
     * 使用嵌入模型生成文件名
     * @param {Object} documentInfo 文档信息
     * @returns {Promise<Object>} 生成结果
     */
    async generateNameWithEmbedding(documentInfo) {
        const { content, fileName, fileType } = documentInfo;

        // 1. 提取文档关键内容用于嵌入（Qwen3-Embedding-8B支持32768 tokens，我们可以用更多内容）
        const textForEmbedding = this.extractKeyContent(content, 1000); // 增加到1000字符

        console.log(`🔍 嵌入模型调试信息:`);
        console.log(`  - 原文件名: ${fileName}`);
        console.log(`  - 文件类型: ${fileType}`);
        console.log(`  - 原始内容长度: ${content ? content.length : 0} 字符`);
        console.log(`  - 提取内容长度: ${textForEmbedding.length} 字符`);
        console.log(`  - 提取内容预览: "${textForEmbedding.substring(0, 200)}..."`);
        console.log(`  - 原始内容预览: "${content ? content.substring(0, 200) : '无内容'}..."`);

        if (!textForEmbedding || textForEmbedding.length < 10) {
            console.log(`⚠️  警告：提取的内容太短或为空，可能导致嵌入模型效果不佳`);
        }

        // 2. 获取文档内容的嵌入向量
        const documentEmbedding = await this.getEmbedding(textForEmbedding);

        // 3. 使用混合策略：语义匹配 + 内容分析
        const bestMatch = await this.findBestPattern(documentEmbedding, textForEmbedding);

        // 4. 智能生成文件名（改进的策略）
        const suggestedName = await this.generateSmartNameFromEmbedding(bestMatch, documentInfo, textForEmbedding);

        return {
            suggestedName,
            reasoning: `语义嵌入分析：匹配"${bestMatch.pattern}"模式 (相似度: ${(bestMatch.similarity * 100).toFixed(1)}%)，结合内容关键词生成`,
            confidence: Math.max(bestMatch.similarity, 0.6), // 确保最低置信度
            method: 'embedding',
            matchedPattern: bestMatch.pattern,
            category: bestMatch.category,
            contentLength: textForEmbedding.length
        };
    }

    /**
     * 获取文本的嵌入向量
     * @param {string} text 文本内容
     * @returns {Promise<Array>} 嵌入向量
     */
    async getEmbedding(text) {
        if (!this.config.apiKey) {
            throw new Error('硅基流动 API密钥未配置');
        }

        try {
            const response = await axios.post(`${this.config.baseUrl}/embeddings`, {
                model: this.config.embeddingModel,
                input: text,
                encoding_format: 'float'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            const data = response.data;

            if (!data.data || !data.data[0] || !data.data[0].embedding) {
                throw new Error('嵌入模型响应格式错误');
            }

            return data.data[0].embedding;
        } catch (error) {
            if (error.response) {
                throw new Error(`嵌入模型API调用失败: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`);
            } else {
                throw new Error(`嵌入模型API调用失败: ${error.message}`);
            }
        }
    }

    /**
     * 调用对话模型API
     * @param {string} prompt 提示词
     * @returns {Promise<Object>} AI响应
     */
    async callChatModel(prompt) {
        if (!this.config.apiKey) {
            throw new Error('硅基流动 API密钥未配置');
        }

        try {
            const response = await axios.post(`${this.config.baseUrl}/chat/completions`, {
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的文件管理助手，擅长根据文档内容生成简洁、描述性的文件名。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            const data = response.data;
            const aiContent = data.choices[0]?.message?.content;

            if (!aiContent) {
                throw new Error('对话模型响应为空');
            }

            try {
                // 尝试解析JSON响应
                return JSON.parse(aiContent);
            } catch (error) {
                // 如果不是JSON格式，直接使用文本作为建议名称
                return {
                    suggestedName: aiContent.trim(),
                    reasoning: '基于对话模型分析的文件名建议',
                    confidence: 0.7
                };
            }
        } catch (error) {
            console.error('对话模型API调用失败:', error.response?.data || error.message);

            // 增强错误处理 - 提供更友好的错误信息
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 400 && data?.code === 20012) {
                    // 模型不存在错误 - 尝试使用默认模型
                    console.warn(`⚠️ 选择的对话模型不存在: ${this.config.model}，使用默认模型: Pro/deepseek-ai/DeepSeek-V3`);
                    this.config.model = 'Pro/deepseek-ai/DeepSeek-V3';

                    // 递归调用，但只重试一次
                    if (!this._retryAttempted) {
                        this._retryAttempted = true;
                        try {
                            const result = await this.callChatModel(prompt);
                            this._retryAttempted = false;
                            return result;
                        } catch (retryError) {
                            this._retryAttempted = false;
                            throw retryError;
                        }
                    }
                }

                throw new Error(`对话模型API调用失败: ${status} ${error.response.statusText} - ${JSON.stringify(data)}`);
            } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                throw new Error(`网络连接失败: ${error.message}，请检查网络连接`);
            } else {
                throw new Error(`对话模型API调用失败: ${error.message}`);
            }
        }
    }

    /**
     * 使用视觉模型生成文件名
     * @param {Object} documentInfo 文档信息
     * @param {Object} config 配置选项
     * @returns {Promise<string>} 生成的文件名
     */
    async generateNameWithVision(documentInfo, config = {}) {
        const { fileName, content } = documentInfo;

        // 检查是否为图片文件
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif'];
        const ext = require('path').extname(fileName).toLowerCase();

        if (!imageExtensions.includes(ext)) {
            // 非图片文件，回退到对话模型
            console.log('非图片文件，回退到对话模型处理');
            const prompt = this.buildPrompt(documentInfo, config.template || 'semantic', config.customPrompt || '', config);
            return await this.callChatModel(prompt);
        }

        // 构建视觉模型提示词
        const prompt = this.buildVisionPrompt(documentInfo, config);

        // 调用视觉模型API
        const aiResponse = await this.callVisionModel(documentInfo.filePath, prompt);

        // 返回AI响应（已经是处理过的格式）
        return aiResponse;
    }

    /**
     * 构建视觉模型提示词
     * @param {Object} documentInfo 文档信息
     * @param {Object} config 配置选项
     * @returns {string} 视觉模型提示词
     */
    buildVisionPrompt(documentInfo, config = {}) {
        const { fileName, content } = documentInfo;
        const template = config.template || 'semantic';
        const customPrompt = config.customPrompt || '';

        let prompt = `请分析这张图片并为其生成一个简洁、描述性的中文文件名。

原文件名: ${fileName}

**重要说明：请务必使用中文命名，避免使用英文单词。**`;

        // 如果有OCR识别的文字内容，也包含进来
        if (content && content.trim().length > 0) {
            prompt += `\n图片中识别到的文字: ${content.substring(0, 200)}`;
        }

        // 根据模板类型添加不同的命名要求
        switch (template) {
            case 'semantic':
                prompt += `\n\n命名要求：
- **必须使用中文命名**
- 基于图片的主要内容和视觉元素
- 如果图片包含文字，结合文字内容
- 使用简洁、描述性的中文词汇
- 体现图片的主题和特征
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'date_content':
                prompt += `\n\n命名要求：
- 格式：日期_内容描述
- 基于图片内容生成描述性名称
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'category_name':
                prompt += `\n\n命名要求：
- 格式：类别_具体名称
- 先确定图片所属类别，再描述具体内容
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'custom':
                prompt += `\n\n自定义命名要求：
${customPrompt}
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;
        }

        // 如果不是custom模板但有自定义提示词，也要应用
        if (template !== 'custom' && customPrompt && customPrompt.trim().length > 0) {
            prompt += `\n\n额外要求：
${customPrompt}`;
        }

        prompt += `\n\n请直接返回建议的文件名，不需要其他解释：`;

        return prompt;
    }

    /**
     * 构建图片视觉分析提示词
     * @param {string} fileName 文件名
     * @param {string} ocrText OCR识别的文字
     * @returns {string} 提示词
     */
    buildVisionPromptForImage(fileName, ocrText = '') {
        let prompt = `请分析这张图片并为其生成一个简洁、描述性的中文文件名。

原文件名：${fileName}

**重要说明：请务必使用中文命名，避免使用英文单词。**`;

        if (ocrText && ocrText.trim()) {
            prompt += `\nOCR识别的文字内容：${ocrText}`;
        }

        prompt += `\n\n命名要求：
- **必须使用中文命名**
- 基于图片的主要内容和视觉元素
- 如果图片包含文字，结合文字内容
- 使用简洁、描述性的中文词汇
- 体现图片的主题和特征
- 长度控制在20字符以内
- 不要包含文件扩展名

请直接返回建议的中文文件名，不需要其他解释：`;

        return prompt;
    }

    /**
     * 构建OCR + 视觉模型组合提示词
     * @param {string} fileName 文件名
     * @param {string} ocrText OCR识别的文字
     * @param {Object} config 配置选项
     * @returns {string} 提示词
     */
    buildVisionPromptWithOCR(fileName, ocrText, config = {}) {
        const template = config.template || 'semantic';
        const customPrompt = config.customPrompt || '';

        let prompt = `请基于图片的视觉内容和OCR识别的文字，为这张图片生成一个准确、描述性的中文文件名。

原文件名：${fileName}
OCR识别的文字：${ocrText}

**重要说明：请务必使用中文命名，避免使用英文单词。**

请综合考虑：
1. 图片的视觉内容（主题、颜色、风格等）
2. OCR识别的文字信息
3. 图片的整体含义和用途`;

        // 根据模板类型添加不同的命名要求
        switch (template) {
            case 'semantic':
                prompt += `\n\n命名要求：
- **必须使用中文命名**
- 结合视觉内容和文字信息
- 使用简洁、准确的中文词汇
- 体现图片的核心主题
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'date_content':
                prompt += `\n\n命名要求：
- 格式：日期_内容描述
- 结合OCR文字和视觉内容
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'category_name':
                prompt += `\n\n命名要求：
- 格式：类别_具体名称
- 先确定图片所属类别，再描述具体内容
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;

            case 'custom':
                prompt += `\n\n自定义命名要求：
${customPrompt}
- 长度控制在${this.config.maxNameLength}字符以内
- 不要包含文件扩展名`;
                break;
        }

        // 如果不是custom模板但有自定义提示词，也要应用
        if (template !== 'custom' && customPrompt && customPrompt.trim().length > 0) {
            prompt += `\n\n额外要求：
${customPrompt}`;
        }

        prompt += `\n\n请直接返回建议的文件名：`;

        return prompt;
    }

    /**
     * 使用OCR + 视觉模型组合方案生成文件名（带优雅降级）
     * @param {string} imagePath 图片路径
     * @param {string} ocrText OCR识别的文字
     * @param {string} modelName 模型名称
     * @param {Object} config 配置选项
     * @returns {Promise<Object>} 生成结果
     */
    async generateNameWithVisionAndOCR(imagePath, ocrText, modelName, config = {}) {
        const fileName = path.basename(imagePath);

        // 如果配置了多AI服务，优先使用多AI服务
        if (config.useMultiAI && this.multiAI) {
            try {
                console.log('🔄 使用多AI服务处理视觉+OCR任务');

                const prompt = this.buildVisionPromptWithOCR(fileName, ocrText, config);
                const response = await this.multiAI.callAI({
                    type: 'vision',
                    prompt,
                    imagePath,
                    temperature: 0.7,
                    maxTokens: 100
                });

                return {
                    suggestedName: response.content.trim(),
                    confidence: 0.9,
                    reasoning: `基于${response.provider}视觉模型和OCR的综合分析`,
                    method: 'multi_ai_vision_ocr',
                    provider: response.provider,
                    model: response.model,
                    processingTime: Date.now()
                };
            } catch (error) {
                console.error('❌ 多AI服务处理失败，回退到单一服务:', error.message);
                // 继续使用原有的单一服务逻辑
            }
        }

        // 检查是否强制使用OCR降级
        if (config.forceOCRFallback) {
            console.log('🔄 强制使用OCR降级方案');
            return await this.fallbackToOCRAndChat(fileName, ocrText, config);
        }

        try {
            // 构建包含OCR信息的提示词
            const prompt = this.buildVisionPromptWithOCR(fileName, ocrText, config);

            // 调用视觉模型（带重试机制）
            const response = await this.callVisionModel(imagePath, prompt, modelName);

            return {
                suggestedName: response.suggestedName || response,
                confidence: 0.9, // OCR + 视觉模型组合，置信度更高
                reasoning: `基于OCR文字识别和 ${this.getModelDisplayName(modelName)} 视觉模型的综合分析`,
                method: 'vision_ocr_hybrid',
                processingTime: Date.now()
            };
        } catch (error) {
            console.error('❌ 视觉模型处理失败，尝试优雅降级:', error.message);

            // 优雅降级：使用OCR + 对话模型
            return await this.fallbackToOCRAndChat(fileName, ocrText, config);
        }
    }

    /**
     * 优雅降级：OCR + 对话模型处理
     * @param {string} fileName 文件名
     * @param {string} ocrText OCR文字
     * @param {Object} config 配置选项
     * @returns {Promise<Object>} 生成结果
     */
    async fallbackToOCRAndChat(fileName, ocrText, config = {}) {
        console.log('🔄 启用优雅降级：OCR + 对话模型');

        // 如果配置了多AI服务，优先使用多AI服务
        if (config.useMultiAI && this.multiAI) {
            try {
                console.log('🔄 使用多AI服务处理OCR+对话任务');

                const prompt = this.buildOCROnlyPrompt(fileName, ocrText, config);
                const response = await this.multiAI.callAI({
                    type: 'chat',
                    prompt,
                    temperature: 0.7,
                    maxTokens: 100
                });

                return {
                    suggestedName: response.content.trim(),
                    confidence: 0.7,
                    reasoning: `基于${response.provider}对话模型和OCR的分析（多AI降级）`,
                    method: 'multi_ai_ocr_chat_fallback',
                    provider: response.provider,
                    model: response.model,
                    processingTime: Date.now()
                };
            } catch (error) {
                console.error('❌ 多AI服务降级失败，使用单一服务:', error.message);
                // 继续使用原有的单一服务逻辑
            }
        }

        try {
            // 切换到对话模型
            const chatModel = this.getChatModel(config.selectedModel);
            const originalModel = this.config.model;
            this.setModel(chatModel);

            // 构建基于OCR的提示词
            const prompt = this.buildOCROnlyPrompt(fileName, ocrText, config);

            // 调用对话模型
            const response = await this.callChatModel(prompt);

            // 恢复原模型配置
            this.setModel(originalModel);

            return {
                suggestedName: this.processAIResponse(response, fileName),
                confidence: 0.7, // 降级方案，置信度稍低
                reasoning: '基于OCR文字识别和对话模型的分析（视觉模型降级）',
                method: 'ocr_chat_fallback',
                processingTime: Date.now()
            };
        } catch (fallbackError) {
            console.error('❌ 降级方案也失败，使用基础命名:', fallbackError.message);

            // 最终降级：基于OCR文字的简单处理
            return this.generateBasicNameFromOCR(fileName, ocrText);
        }
    }

    /**
     * 基于OCR文字生成基础文件名
     * @param {string} fileName 原文件名
     * @param {string} ocrText OCR文字
     * @returns {Object} 生成结果
     */
    generateBasicNameFromOCR(fileName, ocrText) {
        let suggestedName = fileName;

        if (ocrText && ocrText.trim().length > 0) {
            // 提取OCR文字中的有意义内容
            const cleanText = ocrText
                .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中文、英文、数字
                .trim()
                .substring(0, 20); // 限制长度

            if (cleanText.length > 2) {
                suggestedName = cleanText + '_图片';
            }
        }

        // 如果没有有效的OCR文字，使用时间戳
        if (suggestedName === fileName) {
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            suggestedName = `图片_${timestamp}`;
        }

        return {
            suggestedName,
            confidence: 0.5,
            reasoning: '基于OCR文字的基础命名（最终降级方案）',
            method: 'ocr_basic_fallback',
            processingTime: Date.now()
        };
    }

    /**
     * 构建仅基于OCR的提示词
     * @param {string} fileName 文件名
     * @param {string} ocrText OCR文字
     * @param {Object} config 配置选项
     * @returns {string} 提示词
     */
    buildOCROnlyPrompt(fileName, ocrText, config = {}) {
        const template = config.template || 'semantic';

        return `请根据以下OCR识别的文字内容，为图片文件生成一个准确、描述性的中文文件名。

原文件名：${fileName}
OCR识别的文字：${ocrText}

**重要说明：请务必使用中文命名，避免使用英文单词。**

请综合考虑：
1. OCR识别的文字信息
2. 文字的含义和用途
3. 图片可能的内容类型

命名要求：
- **必须使用中文命名**
- 基于OCR文字信息进行命名
- 使用简洁、准确的中文词汇
- 体现图片的核心主题
- 长度控制在50字符以内
- 不要包含文件扩展名

请直接返回建议的文件名：`;
    }

    /**
     * 延迟函数
     * @param {number} ms 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 调用视觉模型API（增强版错误处理）
     * @param {string} imagePath 图片路径
     * @param {string} prompt 提示词
     * @param {string} modelName 模型名称（可选）
     * @returns {Promise<string>} AI响应
     */
    async callVisionModel(imagePath, prompt, modelName = null) {
        // 优先使用多AI服务（智能重试和服务切换）
        if (this.multiAI) {
            try {
                console.log('🔄 使用多AI服务处理视觉模型调用');

                const response = await this.multiAI.callAI({
                    type: 'vision',
                    prompt,
                    imagePath,
                    temperature: 0.7,
                    maxTokens: 100
                });

                return {
                    success: true,
                    suggestedName: response.content.trim(),
                    model: `${response.provider}:${response.model}`,
                    reasoning: `基于 ${this.getModelDisplayName(response.model)} 视觉模型的图片内容分析`,
                    confidence: 0.85
                };
            } catch (error) {
                console.error('❌ 多AI服务视觉模型调用失败，回退到单一服务:', error.message);

                // 如果多AI服务失败，立即触发OCR降级
                if (this.shouldTriggerOCRFallback(error)) {
                    console.log('🔄 多AI服务失败，直接触发OCR降级方案');
                    throw new Error('TRIGGER_OCR_FALLBACK: ' + error.message);
                }
                // 继续使用原有的单一服务逻辑
            }
        }

        // 回退到原有的硅基流动API调用（增强错误处理）
        return await this.callSiliconFlowVision(imagePath, prompt, modelName);
    }

    /**
     * 调用硅基流动视觉API（增强版）
     * @param {string} imagePath 图片路径
     * @param {string} prompt 提示词
     * @param {string} modelName 模型名称
     * @returns {Promise<Object>} API响应
     */
    async callSiliconFlowVision(imagePath, prompt, modelName = null) {
        if (!this.config.apiKey) {
            throw new Error('硅基流动 API密钥未配置');
        }

        const maxRetries = 3;
        const baseDelay = 4000; // 增加基础延迟到4秒
        let consecutiveRateLimits = 0;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 智能延迟策略
                if (attempt > 1) {
                    const delay = this.calculateSmartDelay(attempt, consecutiveRateLimits, baseDelay);
                    console.log(`🔄 视觉模型重试 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
                    await this.sleep(delay);
                }

                // 使用传入的模型名称或当前配置的模型
                const currentModel = modelName || this.config.model;
                console.log(`调用视觉模型: ${currentModel} (尝试 ${attempt}/${maxRetries})`);

                const messages = [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ];

                // 如果提供了图片路径，添加图片内容
                if (imagePath) {
                    try {
                        const fs = require('fs');
                        const imageBuffer = fs.readFileSync(imagePath);
                        const base64Image = imageBuffer.toString('base64');
                        const mimeType = this.getImageMimeType(imagePath);

                        messages[0].content.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        });
                    } catch (error) {
                        console.warn('读取图片文件失败，仅使用文本提示:', error.message);
                    }
                }

                // 处理模型名称，去掉前缀
                let apiModelName = currentModel;
                if (apiModelName.startsWith('vision:')) {
                    apiModelName = apiModelName.replace('vision:', '');
                }

                const response = await axios.post(`${this.config.baseUrl}/chat/completions`, {
                    model: apiModelName,
                    messages: messages,
                    max_tokens: 100,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 增加到60秒，处理大图片时需要更多时间
                });

                if (response.data && response.data.choices && response.data.choices[0]) {
                    const content = response.data.choices[0].message.content;
                    console.log('✅ 视觉模型响应成功:', content);

                    return {
                        success: true,
                        suggestedName: content.trim(),
                        model: this.config.model,
                        reasoning: `基于 ${this.getModelDisplayName(this.config.model)} 视觉模型的图片内容分析`,
                        confidence: 0.85
                    };
                } else {
                    throw new Error('视觉模型返回格式异常');
                }

            } catch (error) {
                const isRateLimit = error.response?.status === 429;
                const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

                console.error(`❌ 视觉模型API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

                // 记录连续速率限制次数
                if (isRateLimit) {
                    consecutiveRateLimits++;
                    console.log(`⏳ 遇到速率限制，将在 ${this.calculateSmartDelay(attempt + 1, consecutiveRateLimits, baseDelay)}ms 后重试...`);
                } else if (isTimeout) {
                    console.log(`⏳ 请求超时，将在 ${this.calculateSmartDelay(attempt + 1, consecutiveRateLimits, baseDelay)}ms 后重试...`);
                } else {
                    consecutiveRateLimits = 0; // 重置计数器
                }

                // 智能错误处理：决定是否应该立即触发降级
                if (this.shouldTriggerOCRFallback(error, attempt, maxRetries)) {
                    console.log('🔄 触发智能降级：切换到OCR+对话模型');
                    throw new Error('TRIGGER_OCR_FALLBACK: ' + error.message);
                }

                // 如果是最后一次尝试，或者不是可重试的错误，则抛出异常
                if (attempt === maxRetries || (!isRateLimit && !isTimeout)) {
                    if (isTimeout) {
                        throw new Error(`视觉模型API调用超时，请稍后重试。大图片处理需要更多时间。`);
                    }

                    if (error.response) {
                        console.error('API错误响应:', error.response.data);
                        throw new Error(`视觉模型API调用失败: ${error.response.data.message || error.message}`);
                    } else {
                        throw new Error(`视觉模型API调用失败: ${error.message}`);
                    }
                }
            }
        }
    }

    /**
     * 计算智能延迟时间
     * @param {number} attempt 当前尝试次数
     * @param {number} consecutiveRateLimits 连续速率限制次数
     * @param {number} baseDelay 基础延迟
     * @returns {number} 延迟时间(ms)
     */
    calculateSmartDelay(attempt, consecutiveRateLimits, baseDelay) {
        // 基础指数退避
        let delay = baseDelay * Math.pow(2, attempt - 1);

        // 如果连续遇到速率限制，增加额外延迟
        if (consecutiveRateLimits > 2) {
            delay += consecutiveRateLimits * 5000; // 每次额外增加5秒
        }

        // 最大延迟限制为30秒
        return Math.min(delay, 30000);
    }

    /**
     * 判断是否应该触发OCR降级方案
     * @param {Error} error 错误对象
     * @param {number} attempt 当前尝试次数
     * @param {number} maxRetries 最大重试次数
     * @returns {boolean} 是否触发降级
     */
    shouldTriggerOCRFallback(error, attempt = 1, maxRetries = 3) {
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const isServerError = error.response?.status >= 500;

        // 如果是第二次尝试就遇到速率限制，立即降级
        if (isRateLimit && attempt >= 2) {
            return true;
        }

        // 如果连续超时，在第二次尝试后降级
        if (isTimeout && attempt >= 2) {
            return true;
        }

        // 如果是服务器错误，立即降级
        if (isServerError) {
            return true;
        }

        // 如果错误消息包含特定关键词，立即降级
        const errorMessage = error.message.toLowerCase();
        const fallbackKeywords = ['tpm limit', 'quota exceeded', 'service unavailable'];
        if (fallbackKeywords.some(keyword => errorMessage.includes(keyword))) {
            return true;
        }

        return false;
    }

    /**
     * 获取图片MIME类型
     * @param {string} imagePath 图片路径
     * @returns {string} MIME类型
     */
    getImageMimeType(imagePath) {
        const ext = require('path').extname(imagePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.tiff': 'image/tiff',
            '.heic': 'image/heic',
            '.heif': 'image/heif'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * 调用AI API (保持向后兼容)
     * @param {string} prompt 提示词
     * @returns {Promise<Object>} AI响应
     */
    async callAI(prompt) {
        return await this.callChatModel(prompt);
    }

    /**
     * 提取文档关键内容
     * @param {string} content 文档内容
     * @param {number} maxLength 最大长度
     * @returns {string} 关键内容
     */
    extractKeyContent(content, maxLength = 500) {
        if (!content) return '';

        // 移除多余的空白字符和特殊字符
        let cleanContent = content
            .replace(/\s+/g, ' ')  // 合并空白字符
            .replace(/[^\u4e00-\u9fa5\w\s.,!?;:()[\]{}""''—-]/g, '') // 保留中文、英文、数字和基本标点
            .trim();

        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }

        // 智能截取：优先保留开头的内容，因为通常开头包含主要信息
        const truncated = cleanContent.substring(0, maxLength - 3) + '...';

        console.log(`内容截取: ${content.length} → ${truncated.length} 字符`);
        return truncated;
    }

    /**
     * 计算余弦相似度
     * @param {Array} vecA 向量A
     * @param {Array} vecB 向量B
     * @returns {number} 相似度 (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('向量维度不匹配');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * 找到最佳匹配的文件名模式
     * @param {Array} documentEmbedding 文档嵌入向量
     * @param {string} textContent 文本内容
     * @returns {Promise<Object>} 最佳匹配结果
     */
    async findBestPattern(documentEmbedding, textContent) {
        let bestMatch = {
            pattern: '通用文档',
            category: 'general',
            similarity: 0,
            keywords: []
        };

        // 计算与每个预定义模式的相似度
        for (const patternInfo of this.fileNamePatterns) {
            try {
                // 获取模式的嵌入向量
                const patternEmbedding = await this.getEmbedding(patternInfo.pattern);

                // 计算相似度
                const similarity = this.cosineSimilarity(documentEmbedding, patternEmbedding);

                // 额外检查关键词匹配度
                const keywordBonus = this.calculateKeywordMatch(textContent, patternInfo.keywords);
                const finalSimilarity = similarity + keywordBonus * 0.1; // 关键词匹配给予10%的加成

                if (finalSimilarity > bestMatch.similarity) {
                    bestMatch = {
                        ...patternInfo,
                        similarity: finalSimilarity,
                        embeddingSimilarity: similarity,
                        keywordMatch: keywordBonus
                    };
                }
            } catch (error) {
                console.warn(`计算模式"${patternInfo.pattern}"相似度失败:`, error.message);
            }
        }

        return bestMatch;
    }

    /**
     * 计算关键词匹配度
     * @param {string} text 文本内容
     * @param {Array} keywords 关键词列表
     * @returns {number} 匹配度 (0-1)
     */
    calculateKeywordMatch(text, keywords) {
        if (!text || !keywords || keywords.length === 0) return 0;

        const lowerText = text.toLowerCase();
        let matchCount = 0;

        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                matchCount++;
            }
        }

        return matchCount / keywords.length;
    }

    /**
     * 基于匹配模式生成文件名
     * @param {Object} matchResult 匹配结果
     * @param {Object} documentInfo 文档信息
     * @returns {string} 生成的文件名
     */
    generateNameFromPattern(matchResult, documentInfo) {
        const { pattern, category, similarity } = matchResult;
        const { fileName, fileType } = documentInfo;

        // 获取当前日期
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // 基于相似度和类别生成文件名
        if (similarity > 0.7) {
            // 高相似度：直接使用模式名称
            return `${pattern}_${dateStr}`;
        } else if (similarity > 0.5) {
            // 中等相似度：模式名称 + 原文件名的一部分
            const originalBase = fileName.replace(/\.[^/.]+$/, ''); // 移除扩展名
            const shortOriginal = originalBase.substring(0, 10);
            return `${pattern}_${shortOriginal}`;
        } else {
            // 低相似度：使用通用命名
            const originalBase = fileName.replace(/\.[^/.]+$/, '');
            return `${fileType}文档_${originalBase.substring(0, 15)}_${dateStr}`;
        }
    }

    /**
     * 基于嵌入分析智能生成文件名
     * @param {Object} matchResult 匹配结果
     * @param {Object} documentInfo 文档信息
     * @param {string} content 文档内容
     * @returns {Promise<string>} 生成的文件名
     */
    async generateSmartNameFromEmbedding(matchResult, documentInfo, content) {
        const { pattern, similarity } = matchResult;
        const { fileName, fileType } = documentInfo;

        // 提取内容关键词
        const keywords = this.extractKeywords(content);

        console.log(`🔍 智能命名调试信息:`);
        console.log(`  - 模式匹配: ${pattern}`);
        console.log(`  - 相似度: ${(similarity * 100).toFixed(1)}%`);
        console.log(`  - 提取的关键词: [${keywords.join(', ')}]`);
        console.log(`  - 关键词数量: ${keywords.length}`);

        // 获取当前日期
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        let finalName;
        let strategy;

        // 智能命名策略（降低阈值，更多使用语义信息）
        if (similarity > 0.4) {
            // 中高相似度：使用模式 + 关键词
            const keywordPart = keywords.slice(0, 2).join('_') || '内容';
            finalName = `${pattern}_${keywordPart}`;
            strategy = '中高相似度策略';
        } else if (keywords.length > 0) {
            // 低相似度但有关键词：使用关键词组合
            const mainKeywords = keywords.slice(0, 3).join('_');
            finalName = `${mainKeywords}_${fileType}文档`;
            strategy = '关键词组合策略';
        } else {
            // 兜底策略：使用内容摘要
            const summary = this.generateContentSummary(content);
            finalName = `${summary}_${dateStr}`;
            strategy = '内容摘要策略';
        }

        console.log(`  - 使用策略: ${strategy}`);
        console.log(`  - 最终文件名: ${finalName}`);

        return finalName;
    }

    /**
     * 提取文档关键词
     * @param {string} content 文档内容
     * @returns {Array<string>} 关键词数组
     */
    extractKeywords(content) {
        if (!content) return [];

        // 常见的关键词模式
        const keywordPatterns = [
            // 业务相关
            /([^，。！？\s]{2,6})(计划|方案|策略|规划)/g,
            /([^，。！？\s]{2,6})(报告|总结|分析|统计)/g,
            /([^，。！？\s]{2,6})(会议|讨论|决议|纪要)/g,
            /([^，。！？\s]{2,6})(合同|协议|条款|签署)/g,
            /([^，。！？\s]{2,6})(财务|预算|成本|收支)/g,
            /([^，。！？\s]{2,6})(技术|开发|系统|平台)/g,
            /([^，。！？\s]{2,6})(用户|客户|服务|产品)/g,
            /([^，。！？\s]{2,6})(数据|信息|资料|档案)/g,
            // 动作相关
            /(实施|执行|推进|开展)([^，。！？\s]{2,6})/g,
            /(制定|建立|完善|优化)([^，。！？\s]{2,6})/g,
            /(管理|运营|维护|监控)([^，。！？\s]{2,6})/g,
            // 教育育儿相关
            /(育儿|教育|培养|成长)([^，。！？\s]{2,6})/g,
            /([^，。！？\s]{2,6})(经验|心得|建议|指导)/g,
            // 虚拟服务相关
            /(虚拟|临时|在线|网络)([^，。！？\s]{2,6})/g,
            /([^，。！？\s]{2,6})(服务|工具|平台|系统)/g
        ];

        const keywords = new Set();

        keywordPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    // 清理和标准化关键词
                    const cleaned = match.replace(/[，。！？\s]/g, '');
                    if (cleaned.length >= 2 && cleaned.length <= 8) {
                        keywords.add(cleaned);
                    }
                });
            }
        });

        // 如果没有匹配到模式，尝试提取高频词汇
        if (keywords.size === 0) {
            const words = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
            const wordCount = {};
            words.forEach(word => {
                if (word.length >= 2 && word.length <= 6) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });

            // 取出现频率最高的词汇
            const sortedWords = Object.entries(wordCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([word]) => word);

            sortedWords.forEach(word => keywords.add(word));
        }

        return Array.from(keywords).slice(0, 5); // 最多返回5个关键词
    }

    /**
     * 生成内容摘要
     * @param {string} content 文档内容
     * @returns {string} 内容摘要
     */
    generateContentSummary(content) {
        if (!content) return '未知内容';

        // 提取前几个有意义的词汇作为摘要
        const meaningfulWords = content.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
        if (meaningfulWords.length > 0) {
            return meaningfulWords.slice(0, 2).join('_');
        }

        return '文档内容';
    }

    /**
     * 处理AI响应
     * @param {Object} aiResponse AI响应
     * @param {string} originalName 原文件名
     * @returns {string} 处理后的文件名
     */
    processAIResponse(aiResponse, originalName) {
        let suggestedName;

        // 处理不同类型的AI响应
        if (typeof aiResponse === 'string') {
            suggestedName = aiResponse;
        } else if (typeof aiResponse === 'object' && aiResponse !== null) {
            suggestedName = aiResponse.suggestedName || aiResponse.name || aiResponse.content || originalName;
        } else {
            suggestedName = originalName;
        }

        // 确保suggestedName是字符串
        if (typeof suggestedName !== 'string') {
            suggestedName = String(suggestedName || originalName);
        }

        // 清理文件名
        suggestedName = suggestedName
            .replace(/[<>:"/\\|?*]/g, '') // 移除非法字符
            .replace(/\s+/g, '_') // 空格替换为下划线
            .trim();

        return suggestedName;
    }

    /**
     * 验证和清理文件名
     * @param {string} fileName 文件名
     * @param {string} originalName 原文件名
     * @returns {string} 清理后的文件名
     */
    validateAndCleanFileName(fileName, originalName) {
        if (!fileName || fileName.length === 0) {
            return this.generateFallbackName({ fileName: originalName });
        }

        // 限制长度
        if (fileName.length > this.config.maxNameLength) {
            fileName = fileName.substring(0, this.config.maxNameLength);
        }

        // 确保不以点开头
        if (fileName.startsWith('.')) {
            fileName = fileName.substring(1);
        }

        // 移除末尾的点和空格
        fileName = fileName.replace(/[.\s]+$/, '');

        // 如果清理后为空，使用备用名称
        if (fileName.length === 0) {
            return this.generateFallbackName({ fileName: originalName });
        }

        return fileName;
    }

    /**
     * 生成备用文件名
     * @param {Object} documentInfo 文档信息
     * @returns {string} 备用文件名
     */
    generateFallbackName(documentInfo) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const baseName = path.parse(documentInfo.fileName).name;
        return `${baseName}_${timestamp}`;
    }

    /**
     * 批量生成智能文件名
     * @param {Array} documentsInfo 文档信息数组
     * @param {Object} config 重命名配置
     * @param {Function} progressCallback 进度回调
     * @returns {Promise<Array>} 重命名结果数组
     */
    async batchGenerateNames(documentsInfo, config = {}, progressCallback = null) {
        const results = [];
        const total = documentsInfo.length;
        
        for (let i = 0; i < total; i++) {
            const docInfo = documentsInfo[i];
            
            try {
                const result = await this.generateSmartFileName(docInfo, config);
                results.push(result);
                
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        currentFile: docInfo.fileName,
                        result
                    });
                }
                
                // 添加延迟避免API限制
                if (i < total - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`处理文件 ${docInfo.fileName} 失败:`, error);
                results.push({
                    success: false,
                    originalName: docInfo.fileName,
                    error: error.message,
                    fallbackName: this.generateFallbackName(docInfo)
                });
            }
        }
        
        return results;
    }

    /**
     * 生成智能文件名 - 兼容性方法
     * @param {string} fileName 原始文件名
     * @param {string} content 文件内容
     * @param {string} template 模板类型
     * @param {Object} options 选项
     * @returns {Promise<Object>} 重命名结果
     */
    async generateSmartName(fileName, content, template = 'semantic', options = {}) {
        try {
            const documentInfo = {
                fileName,
                content,
                fileType: options.fileType || 'unknown',
                hasContent: options.hasContent !== false,
                isBinaryFile: options.isBinaryFile || false
            };

            const config = {
                template,
                ...options
            };

            const result = await this.generateSmartFileName(documentInfo, config);
            
            return {
                success: result.success,
                suggestedName: result.suggestedName || result.fallbackName || fileName,
                originalName: fileName,
                model: this.config.model,
                confidence: result.confidence || 0.5,
                ...result
            };

        } catch (error) {
            console.error('generateSmartName 失败:', error);
            return {
                success: false,
                suggestedName: fileName,
                originalName: fileName,
                model: this.config.model,
                confidence: 0,
                error: error.message
            };
        }
    }
}

module.exports = AIRenameService;
