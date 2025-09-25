/**
 * 多AI服务商统一管理服务
 * 支持硅基流动、豆包、DeepSeek等多个AI服务提供商
 * 实现智能重试和优雅降级机制
 */

const axios = require('axios');
const path = require('path');

class MultiAIService {
    constructor() {
        // AI服务提供商配置
        this.providers = {
            siliconflow: {
                name: '硅基流动',
                baseUrl: 'https://api.siliconflow.cn/v1',
                models: {
                    chat: [
                        {
                            id: 'deepseek-v3',
                            name: 'Pro/deepseek-ai/DeepSeek-V3',
                            label: 'DeepSeek V3 (高性能)',
                            performance: { speed: 'medium', quality: 'high', cost: 'medium' },
                            description: '高性能通用模型，适合复杂推理任务'
                        },
                        {
                            id: 'deepseek-r1',
                            name: 'Pro/deepseek-ai/DeepSeek-R1',
                            label: 'DeepSeek R1 (推理)',
                            performance: { speed: 'slow', quality: 'very_high', cost: 'high' },
                            description: '专业推理模型，适合需要深度思考的任务'
                        },
                        {
                            id: 'qwen2.5-72b',
                            name: 'Qwen/Qwen2.5-72B-Instruct-128K',
                            label: 'Qwen 2.5 72B (推荐)',
                            performance: { speed: 'medium', quality: 'high', cost: 'medium' },
                            description: '平衡性能的推荐模型，适合大多数场景'
                        },
                        {
                            id: 'qwen3-30b-a3b',
                            name: 'Qwen/Qwen3-30B-A3B',
                            label: 'Qwen 3 30B A3B (快速)',
                            performance: { speed: 'fast', quality: 'medium', cost: 'low' },
                            description: '快速响应模型，适合简单任务'
                        },
                        {
                            id: 'qwen3-next-80b-a3b-instruct',
                            name: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
                            label: 'Qwen 3 Next 80B A3B (指令)',
                            performance: { speed: 'very_fast', quality: 'high', cost: 'medium' },
                            description: '最新指令优化模型，速度快质量高',
                            recommended: true
                        }
                    ],
                    vision: [
                        {
                            id: 'qwen2.5-vl-32b',
                            name: 'Qwen/Qwen2.5-VL-32B-Instruct',
                            label: 'Qwen 2.5 VL 32B (视觉)',
                            performance: { speed: 'medium', quality: 'high', cost: 'medium' },
                            description: '强大的多模态视觉理解模型，支持图片分析和OCR'
                        }
                    ]
                }
            },
            doubao: {
                name: '豆包',
                baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
                models: {
                    chat: [
                        {
                            id: 'doubao-thinking',
                            name: 'doubao-seed-1-6-thinking-250615',
                            label: '豆包1.6 Thinking',
                            performance: { speed: 'slow', quality: 'high', cost: 'medium' },
                            description: '豆包思维模型，适合需要深度分析的任务'
                        }
                    ],
                    vision: [
                        {
                            id: 'doubao-vision',
                            name: 'doubao-seed-1-6-flash-250615',
                            label: '豆包1.6 Flash',
                            performance: { speed: 'very_fast', quality: 'medium', cost: 'low' },
                            description: '豆包快速视觉模型，响应速度极快'
                        }
                    ]
                }
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: 'https://api.deepseek.com/v1',
                models: {
                    chat: [
                        {
                            id: 'deepseek-chat',
                            name: 'deepseek-chat',
                            label: 'DeepSeek Chat (官方)',
                            performance: { speed: 'medium', quality: 'high', cost: 'low' },
                            description: 'DeepSeek官方对话模型，性价比高'
                        },
                        {
                            id: 'deepseek-reasoner',
                            name: 'deepseek-reasoner',
                            label: 'DeepSeek R1 (官方推理)',
                            performance: { speed: 'medium', quality: 'very_high', cost: 'medium' },
                            description: 'DeepSeek官方推理模型，逻辑推理能力强'
                        }
                    ],
                    vision: []
                }
            }
        };

        // API密钥存储
        this.apiKeys = {};
        
        // 模型优先级配置
        this.modelPriorities = {
            chat: [],
            vision: []
        };

        // 重试配置
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 2000,
            maxDelay: 10000
        };
    }

    /**
     * 设置API密钥
     * @param {string} provider 服务提供商
     * @param {string} apiKey API密钥
     */
    setApiKey(provider, apiKey) {
        this.apiKeys[provider] = apiKey;
        console.log(`🔑 设置 ${this.providers[provider]?.name || provider} API密钥`);
    }

    /**
     * 设置模型优先级
     * @param {string} type 模型类型 (chat/vision)
     * @param {Array} priorities 优先级数组 [{provider, model, priority}]
     */
    setModelPriorities(type, priorities) {
        this.modelPriorities[type] = priorities.sort((a, b) => a.priority - b.priority);
        console.log(`📋 设置${type}模型优先级:`, this.modelPriorities[type]);
    }

    /**
     * 获取可用的模型列表
     * @returns {Object} 按服务商分组的模型列表
     */
    getAvailableModels() {
        const result = {};

        for (const [providerId, provider] of Object.entries(this.providers)) {
            result[providerId] = {
                name: provider.name,
                hasApiKey: !!this.apiKeys[providerId],
                models: {
                    chat: provider.models.chat.map(model => ({
                        id: `${providerId}:chat:${model.name}`,
                        name: model.name,
                        label: model.label,
                        type: 'chat',
                        provider: providerId,
                        performance: model.performance,
                        description: model.description,
                        recommended: model.recommended || false
                    })),
                    vision: provider.models.vision.map(model => ({
                        id: `${providerId}:vision:${model.name}`,
                        name: model.name,
                        label: model.label,
                        type: 'vision',
                        provider: providerId,
                        performance: model.performance,
                        description: model.description,
                        recommended: model.recommended || false
                    }))
                }
            };
        }

        return result;
    }

    /**
     * 智能调用AI模型（带重试和降级）
     * @param {Object} request 请求参数
     * @returns {Promise<Object>} AI响应
     */
    async callAI(request) {
        const { type = 'chat', prompt, messages, imagePath, ...options } = request;
        
        // 获取优先级模型列表
        const priorityModels = this.modelPriorities[type] || [];
        
        if (priorityModels.length === 0) {
            throw new Error(`未配置${type}模型优先级`);
        }

        let lastError = null;
        
        // 按优先级尝试每个模型（增强错误处理）
        for (let i = 0; i < priorityModels.length; i++) {
            const modelConfig = priorityModels[i];
            const { provider, model } = modelConfig;

            if (!this.apiKeys[provider]) {
                console.warn(`⚠️ ${this.providers[provider].name} 未配置API密钥，跳过`);
                continue;
            }

            try {
                console.log(`🤖 尝试调用 ${this.providers[provider].name} - ${model} (${i + 1}/${priorityModels.length})`);

                const response = await this.callProviderAPI(provider, model, {
                    type,
                    prompt,
                    messages,
                    imagePath,
                    ...options
                });

                console.log(`✅ ${this.providers[provider].name} 调用成功`);
                return {
                    ...response,
                    provider,
                    model,
                    success: true
                };

            } catch (error) {
                console.error(`❌ ${this.providers[provider].name} 调用失败:`, error.message);
                lastError = error;

                // 智能错误处理：根据错误类型决定是否继续
                const errorType = this.analyzeProviderError(error);

                if (errorType === 'rate_limit') {
                    console.log(`🔄 遇到速率限制，尝试下一个服务商...`);
                    // 如果不是最后一个服务商，添加短暂延迟
                    if (i < priorityModels.length - 1) {
                        await this.sleep(1000);
                    }
                    continue;
                } else if (errorType === 'timeout') {
                    console.log(`⏰ 请求超时，尝试下一个服务商...`);
                    continue;
                } else if (errorType === 'server_error') {
                    console.log(`🔧 服务器错误，尝试下一个服务商...`);
                    continue;
                } else {
                    // 其他错误也继续尝试
                    console.log(`🔄 遇到错误，尝试下一个服务商...`);
                    continue;
                }
            }
        }
        
        // 所有模型都失败了
        throw new Error(`所有${type}模型都调用失败。最后错误: ${lastError?.message || '未知错误'}`);
    }

    /**
     * 分析服务商错误类型
     * @param {Error} error 错误对象
     * @returns {string} 错误类型
     */
    analyzeProviderError(error) {
        const message = error.message.toLowerCase();
        const status = error.response?.status;

        if (status === 429 || message.includes('rate limit') || message.includes('tpm limit')) {
            return 'rate_limit';
        } else if (message.includes('timeout') || error.code === 'ECONNABORTED') {
            return 'timeout';
        } else if (status >= 500 || message.includes('server error')) {
            return 'server_error';
        } else if (status === 401 || message.includes('unauthorized')) {
            return 'auth_error';
        } else if (status === 400 || message.includes('bad request')) {
            return 'bad_request';
        } else {
            return 'unknown';
        }
    }

    /**
     * 调用特定服务商的API
     * @param {string} provider 服务商
     * @param {string} model 模型名称
     * @param {Object} request 请求参数
     * @returns {Promise<Object>} API响应
     */
    async callProviderAPI(provider, model, request) {
        const providerConfig = this.providers[provider];
        const apiKey = this.apiKeys[provider];
        
        if (!apiKey) {
            throw new Error(`${providerConfig.name} API密钥未配置`);
        }

        // 构建请求体
        const requestBody = this.buildRequestBody(provider, model, request);
        
        // 执行带重试的API调用
        return await this.executeWithRetry(async () => {
            const response = await axios.post(
                `${providerConfig.baseUrl}/chat/completions`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'application/json'
                    },
                    timeout: 60000
                }
            );

            return this.parseResponse(response.data, provider, model);
        });
    }

    /**
     * 构建API请求体
     * @param {string} provider 服务商
     * @param {string} model 模型名称
     * @param {Object} request 请求参数
     * @returns {Object} 请求体
     */
    buildRequestBody(provider, model, request) {
        const { type, prompt, messages, imagePath, temperature = 0.7, maxTokens = 2000 } = request;
        
        let requestMessages = messages;
        
        // 如果没有提供messages，根据类型构建
        if (!requestMessages) {
            if (type === 'vision' && imagePath) {
                requestMessages = this.buildVisionMessages(prompt, imagePath);
            } else {
                requestMessages = [{ role: 'user', content: prompt }];
            }
        }

        const requestBody = {
            model,
            messages: requestMessages,
            temperature,
            max_tokens: maxTokens,
            stream: false
        };

        // 根据服务商调整参数
        if (provider === 'siliconflow') {
            requestBody.top_p = 0.7;
            requestBody.frequency_penalty = 0.5;
            requestBody.presence_penalty = 0;
        } else if (provider === 'doubao') {
            requestBody.top_p = 0.7;
        } else if (provider === 'deepseek') {
            requestBody.top_p = 0.7;
            requestBody.frequency_penalty = 0.5;
            requestBody.presence_penalty = 0;
        }

        return requestBody;
    }

    /**
     * 构建视觉模型消息
     * @param {string} prompt 提示词
     * @param {string} imagePath 图片路径
     * @returns {Array} 消息数组
     */
    buildVisionMessages(prompt, imagePath) {
        const fs = require('fs');
        
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getImageMimeType(imagePath);

            return [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${mimeType};base64,${base64Image}`
                        }
                    }
                ]
            }];
        } catch (error) {
            console.warn('读取图片失败，使用纯文本模式:', error.message);
            return [{ role: 'user', content: prompt }];
        }
    }

    /**
     * 获取图片MIME类型
     * @param {string} imagePath 图片路径
     * @returns {string} MIME类型
     */
    getImageMimeType(imagePath) {
        const ext = path.extname(imagePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * 解析API响应
     * @param {Object} data 响应数据
     * @param {string} provider 服务商
     * @param {string} model 模型名称
     * @returns {Object} 解析后的响应
     */
    parseResponse(data, provider, model) {
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('AI返回结果格式错误');
        }

        const content = data.choices[0].message.content;
        const reasoningContent = data.choices[0].message.reasoning_content;

        return {
            content: content.trim(),
            reasoning: reasoningContent,
            usage: data.usage,
            model: `${provider}:${model}`,
            finishReason: data.choices[0].finish_reason
        };
    }

    /**
     * 带重试的执行函数
     * @param {Function} fn 要执行的函数
     * @returns {Promise<any>} 执行结果
     */
    async executeWithRetry(fn) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    const delay = Math.min(
                        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                        this.retryConfig.maxDelay
                    );
                    console.log(`🔄 重试 ${attempt}/${this.retryConfig.maxRetries}，等待 ${delay}ms...`);
                    await this.sleep(delay);
                }
                
                return await fn();
                
            } catch (error) {
                lastError = error;
                
                const isRetryable = error.response?.status === 429 || 
                                  error.code === 'ECONNABORTED' || 
                                  error.message.includes('timeout') ||
                                  error.message.includes('rate limit');
                
                if (attempt === this.retryConfig.maxRetries || !isRetryable) {
                    throw error;
                }
                
                console.log(`⏳ 第${attempt}次尝试失败，准备重试...`);
            }
        }
        
        throw lastError;
    }

    /**
     * 延迟函数
     * @param {number} ms 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MultiAIService;
