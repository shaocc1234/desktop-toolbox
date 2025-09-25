// services/aiorganizerService.js - AI文件整理服务
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

class AiorganizerService {
    constructor() {
        this.name = 'AI文件整理';
        this.version = '1.0.0';
        this.apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
        this.defaultModel = 'BAAI/bge-m3';
        this.promptHistory = [];  // 提示词历史记录
        this.dialogueHistory = []; // 对话历史记录
        this.conversationHistory = []; // 多轮对话历史
        this.currentRound = 1; // 当前对话轮次
    }

    /**
     * 扫描指定文件夹，获取最深2级的路径列表
     * @param {string} directoryPath - 目录路径
     * @param {number} maxDepth - 最大扫描深度，默认2级
     * @returns {Object} 扫描结果
     */
    async scanDirectory(directoryPath, maxDepth = 2) {
        try {
            const result = {
                files: [],
                folders: [],
                totalItems: 0,
                scannedPath: directoryPath
            };

            await this._scanRecursive(directoryPath, result, 0, maxDepth);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('扫描目录错误:', error);
            throw new Error(`扫描目录失败: ${error.message}`);
        }
    }

    /**
     * 递归扫描目录
     * @private
     */
    async _scanRecursive(currentPath, result, currentDepth, maxDepth) {
        if (currentDepth >= maxDepth) {
            return;
        }

        try {
            const items = await fs.readdir(currentPath, { withFileTypes: true });

            for (const item of items) {
                // 跳过隐藏文件和系统文件
                if (item.name.startsWith('.') || item.name.startsWith('$') ||
                    item.name === 'node_modules' || item.name === 'Thumbs.db') {
                    continue;
                }

                const fullPath = path.join(currentPath, item.name);
                const relativePath = path.relative(result.scannedPath, fullPath);

                if (item.isDirectory()) {
                    result.folders.push({
                        name: item.name,
                        path: fullPath,
                        relativePath: relativePath,
                        depth: currentDepth + 1,
                        type: 'folder'
                    });
                    result.totalItems++;

                    // 继续递归扫描子目录
                    await this._scanRecursive(fullPath, result, currentDepth + 1, maxDepth);
                } else if (item.isFile()) {
                    const stats = await fs.stat(fullPath);
                    result.files.push({
                        name: item.name,
                        path: fullPath,
                        relativePath: relativePath,
                        size: stats.size,
                        extension: path.extname(item.name).toLowerCase(),
                        depth: currentDepth + 1,
                        mtime: stats.mtime,
                        type: 'file'
                    });
                    result.totalItems++;
                }
            }
        } catch (error) {
            console.error(`扫描路径 ${currentPath} 时出错:`, error);
        }
    }

    /**
     * 使用硅基流动 AI 对文件路径进行智能分类
     * @param {Array} pathList - 文件路径列表
     * @param {string} apiKey - API密钥
     * @param {string} model - 使用的模型，默认为 BAAI/bge-m3
     * @param {string} customPrompt - 自定义提示词
     * @param {string} promptTemplate - 提示词模板类型
     * @param {Object} previousResult - 上一轮分类结果
     * @param {string} userFeedback - 用户反馈
     * @param {number} round - 当前轮次
     * @returns {Object} AI分类结果
     */
    async classifyWithAI(pathList, apiKey, model = 'BAAI/bge-m3', customPrompt = null, promptTemplate = 'default', previousResult = null, userFeedback = null, round = 1) {
        try {
            console.log('🤖 AI分类服务开始:', {
                pathListLength: pathList?.length,
                model: model,
                promptTemplate: promptTemplate,
                hasCustomPrompt: !!customPrompt,
                hasUserFeedback: !!userFeedback,
                hasPreviousResult: !!previousResult,
                round: round
            });

            if (!apiKey) {
                throw new Error('API密钥不能为空');
            }

            if (!pathList || pathList.length === 0) {
                throw new Error('文件路径列表不能为空');
            }

            // 使用智能分层分类系统
            return await this._intelligentLayeredClassification(pathList, apiKey, model, customPrompt, promptTemplate, previousResult, userFeedback, round);

            // 构建AI提示词
            let prompt;
            let isCustomPrompt = false;
            if (customPrompt) {
                prompt = customPrompt;
                isCustomPrompt = true;
                console.log('📝 使用自定义提示词');
            } else {
                prompt = this._buildClassificationPrompt(pathList, promptTemplate);
                console.log('📝 使用模板提示词:', promptTemplate);
            }

            // 记录用户反馈（如果有）
            if (userFeedback && userFeedback.trim()) {
                this.recordDialogue('user', userFeedback, round, {
                    type: 'feedback',
                    fileCount: pathList.length,
                    promptTemplate: promptTemplate
                });
            }

            // 创建文件名到相对路径的映射
            const fileNameMap = new Map();
            pathList.forEach(item => {
                const fileName = item.name || path.basename(item.relativePath || '');
                fileNameMap.set(fileName, item.relativePath);
            });

            const finalPrompt = this._buildPromptWithFileList(prompt, pathList);
            console.log('📊 最终提示词长度:', finalPrompt.length);
            console.log('📊 文件名映射数量:', fileNameMap.size);

            // 记录完整的提示词历史
            const systemMessage = "你是文件整理助手。根据文件名将文件分类，返回简洁的JSON格式结果。只返回JSON，不要其他解释。";
            const fullPrompt = systemMessage + '\n\n' + finalPrompt;
            this.recordPrompt(fullPrompt, promptTemplate || 'default', round, !!customPrompt);

            console.log('🔗 调用硅基流动API...');
            console.log('📊 请求参数:', {
                model: model,
                apiUrl: this.apiUrl,
                apiKeyPrefix: apiKey.substring(0, 10) + '...'
            });

            // 调用硅基流动API
            const response = await axios.post(this.apiUrl, {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "你是文件整理助手。根据文件名将文件分类，返回简洁的JSON格式结果。只返回JSON，不要其他解释。"
                    },
                    {
                        role: "user",
                        content: finalPrompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 4000,  // 增加token限制
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000, // 增加到2分钟
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            console.log('✅ API响应成功:', {
                status: response.status,
                hasData: !!response.data,
                hasChoices: !!response.data?.choices,
                choicesLength: response.data?.choices?.length || 0
            });

            // 解析AI返回的分类结果
            const aiResult = this._parseAIResponse(response.data, fileNameMap);
            console.log('✅ AI响应解析成功:', {
                categoriesCount: Object.keys(aiResult.categories || {}).length,
                suggestionsCount: aiResult.suggestions?.length || 0
            });

            return {
                success: true,
                data: aiResult,
                model: model,
                promptTemplate: promptTemplate,
                round: round,
                hasUserFeedback: !!userFeedback,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ AI分类服务错误:', {
                message: error.message,
                name: error.name,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                apiError: error.response?.data?.error,
                stack: error.stack
            });

            // 如果是API错误，提供更详细的错误信息
            if (error.response) {
                const errorMsg = error.response.data?.error?.message || error.response.statusText;
                throw new Error(`AI分类失败: ${errorMsg} (状态码: ${error.response.status})`);
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('AI服务请求超时，请稍后重试');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('无法连接到AI服务，请检查网络连接');
            }

            throw new Error(`AI分类失败: ${error.message}`);
        }
    }

    /**
     * 智能分层分类系统
     * @private
     */
    async _intelligentLayeredClassification(pathList, apiKey, model, customPrompt, promptTemplate, previousResult, userFeedback, round) {
        console.log('🧠 启动智能分层分类系统...');

        // 第一层：扩展名自动分类
        const extensionResult = this._classifyByExtension(pathList);
        console.log('📁 扩展名分类结果:', {
            已分类: extensionResult.classified.length,
            需进一步处理: extensionResult.needFurtherProcessing.length,
            分类类别: Object.keys(extensionResult.categories).length
        });

        // 第二层：智能规则分类（针对同扩展名但需要细分的文件）
        const ruleResult = this._classifyByIntelligentRules(extensionResult.needFurtherProcessing);
        console.log('🔍 智能规则分类结果:', {
            已分类: ruleResult.classified.length,
            需AI处理: ruleResult.needAI.length,
            新增类别: Object.keys(ruleResult.categories).length
        });

        // 合并前两层的分类结果
        const mergedCategories = this._mergeCategories(extensionResult.categories, ruleResult.categories);

        // 第三层：AI分类（只处理复杂/模糊的文件）
        if (ruleResult.needAI.length > 0) {
            console.log('🤖 启动AI分类处理剩余', ruleResult.needAI.length, '个文件...');

            // 如果需要AI处理的文件很少，直接处理
            if (ruleResult.needAI.length <= 20) {
                const aiResult = await this._processSmallBatchWithAI(ruleResult.needAI, apiKey, model, customPrompt, promptTemplate, round);
                const finalCategories = this._mergeCategories(mergedCategories, aiResult.categories);

                return {
                    success: true,
                    categories: finalCategories,
                    suggestions: [
                        `扩展名分类: ${extensionResult.classified.length} 个文件`,
                        `智能规则分类: ${ruleResult.classified.length} 个文件`,
                        `AI分类: ${ruleResult.needAI.length} 个文件`,
                        '采用分层分类，大幅提升处理效率'
                    ],
                    round: round,
                    layeredClassification: {
                        extensionClassified: extensionResult.classified.length,
                        ruleClassified: ruleResult.classified.length,
                        aiProcessed: ruleResult.needAI.length,
                        totalFiles: pathList.length
                    }
                };
            } else {
                // 文件较多时使用分批处理
                console.log('📦 AI处理文件较多，启用分批处理');
                const aiResult = await this._processBatchesWithAI(ruleResult.needAI, apiKey, model, customPrompt, promptTemplate, round);
                const finalCategories = this._mergeCategories(mergedCategories, aiResult.categories);

                return {
                    success: true,
                    categories: finalCategories,
                    suggestions: [
                        `扩展名分类: ${extensionResult.classified.length} 个文件`,
                        `智能规则分类: ${ruleResult.classified.length} 个文件`,
                        `AI分批处理: ${ruleResult.needAI.length} 个文件`,
                        '采用分层分类，大幅提升处理效率'
                    ],
                    round: round,
                    layeredClassification: {
                        extensionClassified: extensionResult.classified.length,
                        ruleClassified: ruleResult.classified.length,
                        aiProcessed: ruleResult.needAI.length,
                        totalFiles: pathList.length
                    }
                };
            }
        } else {
            // 所有文件都通过前两层分类完成
            console.log('✅ 所有文件都通过扩展名和智能规则分类完成，无需AI处理');
            return {
                success: true,
                categories: mergedCategories,
                suggestions: [
                    `扩展名分类: ${extensionResult.classified.length} 个文件`,
                    `智能规则分类: ${ruleResult.classified.length} 个文件`,
                    '无需AI处理，本地分类完成'
                ],
                round: round,
                layeredClassification: {
                    extensionClassified: extensionResult.classified.length,
                    ruleClassified: ruleResult.classified.length,
                    aiProcessed: 0,
                    totalFiles: pathList.length
                }
            };
        }
    }

    /**
     * 第一层：按扩展名分类
     * @private
     */
    _classifyByExtension(pathList) {
        const result = {
            categories: {},
            classified: [],
            needFurtherProcessing: []
        };

        // 扩展名分类规则
        const extensionRules = {
            '图片文件': {
                extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'],
                description: '图片和图像文件'
            },
            '文档文件': {
                extensions: ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'],
                description: '文档和文本文件'
            },
            '表格文件': {
                extensions: ['.xls', '.xlsx', '.csv', '.ods'],
                description: '电子表格文件'
            },
            '演示文件': {
                extensions: ['.ppt', '.pptx', '.odp'],
                description: '演示文稿文件'
            },
            '音频文件': {
                extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
                description: '音频和音乐文件'
            },
            '视频文件': {
                extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
                description: '视频文件'
            },
            '压缩文件': {
                extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
                description: '压缩包文件'
            },
            '代码文件': {
                extensions: ['.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go'],
                description: '程序代码文件'
            },
            '系统文件': {
                extensions: ['.exe', '.msi', '.dmg', '.deb', '.rpm', '.app'],
                description: '可执行和安装文件'
            }
        };

        pathList.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            const ext = path.extname(fileName).toLowerCase();
            let classified = false;

            // 检查扩展名分类
            for (const [category, rule] of Object.entries(extensionRules)) {
                if (rule.extensions.includes(ext)) {
                    if (!result.categories[category]) {
                        result.categories[category] = {
                            description: rule.description,
                            items: []
                        };
                    }
                    result.categories[category].items.push(item.relativePath);
                    result.classified.push(item);
                    classified = true;
                    break;
                }
            }

            // 如果没有匹配的扩展名，或者是图片文件（需要进一步细分），加入待处理列表
            if (!classified || ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
                result.needFurtherProcessing.push(item);
            }
        });

        return result;
    }

    /**
     * 第二层：智能规则分类
     * @private
     */
    _classifyByIntelligentRules(pathList) {
        const result = {
            categories: {},
            classified: [],
            needAI: []
        };

        // 智能规则（针对图片文件的细分）
        const intelligentRules = [
            {
                name: '数字截图',
                pattern: /^\d{7,10}\.(png|jpg|jpeg)$/i,
                category: '数字截图',
                description: '数字命名的截图文件'
            },
            {
                name: '微信图片',
                pattern: /^mmexport_\d+\.(jpg|jpeg|png)$/i,
                category: '微信图片',
                description: '微信导出的图片'
            },
            {
                name: '屏幕截图',
                pattern: /^(screenshot|屏幕截图|截图).*\.(png|jpg|jpeg)$/i,
                category: '屏幕截图',
                description: '屏幕截图文件'
            },
            {
                name: '相机照片',
                pattern: /^(IMG_|DSC_|PHOTO_)\d+\.(jpg|jpeg)$/i,
                category: '相机照片',
                description: '相机拍摄的照片'
            }
        ];

        pathList.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            let classified = false;

            // 检查智能规则
            for (const rule of intelligentRules) {
                if (rule.pattern.test(fileName)) {
                    if (!result.categories[rule.category]) {
                        result.categories[rule.category] = {
                            description: rule.description,
                            items: []
                        };
                    }
                    result.categories[rule.category].items.push(item.relativePath);
                    result.classified.push(item);
                    classified = true;
                    console.log(`🎯 智能规则匹配: ${fileName} -> ${rule.category}`);
                    break;
                }
            }

            // 如果没有匹配智能规则，需要AI处理
            if (!classified) {
                result.needAI.push(item);
            }
        });

        return result;
    }

    /**
     * 合并分类结果
     * @private
     */
    _mergeCategories(categories1, categories2) {
        const merged = { ...categories1 };

        for (const [category, data] of Object.entries(categories2)) {
            if (merged[category]) {
                merged[category].items.push(...data.items);
            } else {
                merged[category] = { ...data };
            }
        }

        return merged;
    }

    /**
     * 处理小批量文件的AI分类
     * @private
     */
    async _processSmallBatchWithAI(pathList, apiKey, model, customPrompt, promptTemplate, round) {
        console.log('🤖 处理小批量AI分类:', pathList.length, '个文件');

        // 使用简化的提示词
        const simplePrompt = `将以下文件分类，只返回JSON格式：
{
  "categories": {
    "类别名": {"description": "描述", "items": ["文件名1", "文件名2"]}
  }
}`;

        const fileNameMap = new Map();
        pathList.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            fileNameMap.set(fileName, item.relativePath);
        });

        const finalPrompt = this._buildPromptWithFileList(simplePrompt, pathList);

        // 记录提示词
        this.recordPrompt(finalPrompt, promptTemplate || 'default', round, !!customPrompt);

        try {
            const response = await axios.post(this.apiUrl, {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "你是文件分类助手。快速分类文件，只返回JSON。"
                    },
                    {
                        role: "user",
                        content: finalPrompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 800,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            const content = response.data.choices[0]?.message?.content;
            if (!content) {
                throw new Error('AI返回内容为空');
            }

            // 记录AI响应
            this.recordDialogue('assistant', content, round, {
                type: 'small_batch_response',
                model: model,
                fileCount: pathList.length
            });

            // 解析响应
            const result = this._parseAIResponse(response.data, fileNameMap);
            return result;
        } catch (error) {
            console.error('❌ 小批量AI处理失败:', error.message);
            // 返回默认分类
            return {
                categories: {
                    '其他文件': {
                        description: '未能分类的文件',
                        items: pathList.map(item => item.relativePath)
                    }
                }
            };
        }
    }

    /**
     * 处理批量文件的AI分类
     * @private
     */
    async _processBatchesWithAI(pathList, apiKey, model, customPrompt, promptTemplate, round) {
        console.log('🤖 处理批量AI分类:', pathList.length, '个文件');

        const batchSize = 20; // 小批次，提高成功率
        const batches = [];

        for (let i = 0; i < pathList.length; i += batchSize) {
            batches.push(pathList.slice(i, i + batchSize));
        }

        console.log(`📦 分成 ${batches.length} 批处理`);

        const allCategories = {};
        const errors = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 处理第 ${i + 1}/${batches.length} 批，包含 ${batch.length} 个文件`);

            try {
                const batchResult = await this._processSmallBatchWithAI(batch, apiKey, model, customPrompt, promptTemplate, round);

                // 合并结果
                for (const [category, data] of Object.entries(batchResult.categories)) {
                    if (!allCategories[category]) {
                        allCategories[category] = {
                            description: data.description,
                            items: []
                        };
                    }
                    allCategories[category].items.push(...data.items);
                }

                console.log(`✅ 第 ${i + 1} 批处理成功`);

                // 批次间延迟
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ 第 ${i + 1} 批处理失败:`, error.message);
                errors.push(`第 ${i + 1} 批处理失败: ${error.message}`);

                // 失败的文件归入"其他文件"
                if (!allCategories['其他文件']) {
                    allCategories['其他文件'] = {
                        description: '未能分类的文件',
                        items: []
                    };
                }
                allCategories['其他文件'].items.push(...batch.map(item => item.relativePath));
            }
        }

        return {
            categories: allCategories,
            errors: errors
        };
    }

    /**
     * 预过滤文件，使用正则和规则进行本地分类
     * @private
     */
    _preFilterFiles(pathList) {
        const result = {
            categories: {},
            preClassified: [],
            needAI: []
        };

        // 定义预过滤规则
        const rules = [
            // 数字命名的PNG图片 (如: 9003xxx.png, 0000xxx.png)
            {
                name: '数字图片',
                pattern: /^\d{7,10}\.png$/i,
                category: '数字截图',
                description: '数字命名的PNG截图文件'
            },
            // 微信图片 (如: mmexport_xxx.jpg)
            {
                name: '微信图片',
                pattern: /^mmexport_\d+\.(jpg|jpeg|png)$/i,
                category: '微信图片',
                description: '微信导出的图片文件'
            },
            // 截图文件 (如: Screenshot_xxx.png, 屏幕截图_xxx.png)
            {
                name: '截图文件',
                pattern: /^(screenshot|屏幕截图|截图).*\.(png|jpg|jpeg)$/i,
                category: '屏幕截图',
                description: '屏幕截图文件'
            },
            // IMG开头的相机照片 (如: IMG_20231201_xxx.jpg)
            {
                name: '相机照片',
                pattern: /^IMG_\d{8}_\d+\.(jpg|jpeg)$/i,
                category: '相机照片',
                description: '相机拍摄的照片'
            },
            // 临时文件
            {
                name: '临时文件',
                pattern: /\.(tmp|temp|bak|cache)$/i,
                category: '临时文件',
                description: '临时和缓存文件'
            },
            // 系统文件
            {
                name: '系统文件',
                pattern: /^(thumbs\.db|desktop\.ini|\.ds_store)$/i,
                category: '系统文件',
                description: '系统生成的文件'
            }
        ];

        console.log('🔍 开始预过滤文件...');

        pathList.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            let matched = false;

            // 检查每个规则
            for (const rule of rules) {
                if (rule.pattern.test(fileName)) {
                    // 匹配到规则，进行预分类
                    if (!result.categories[rule.category]) {
                        result.categories[rule.category] = {
                            description: rule.description,
                            items: []
                        };
                    }

                    result.categories[rule.category].items.push(item.relativePath);
                    result.preClassified.push(item);
                    matched = true;

                    console.log(`✅ 预分类: ${fileName} -> ${rule.category} (${rule.name})`);
                    break;
                }
            }

            // 如果没有匹配任何规则，需要AI处理
            if (!matched) {
                result.needAI.push(item);
            }
        });

        // 统计预过滤结果
        const preClassifiedCount = result.preClassified.length;
        const totalCount = pathList.length;
        const percentage = Math.round((preClassifiedCount / totalCount) * 100);

        console.log(`📊 预过滤统计: ${preClassifiedCount}/${totalCount} (${percentage}%) 文件已预分类`);

        // 显示各类别统计
        Object.entries(result.categories).forEach(([category, data]) => {
            console.log(`  📁 ${category}: ${data.items.length} 个文件`);
        });

        return result;
    }

    /**
     * 带预过滤的分批处理
     * @private
     */
    async _classifyInBatchesWithPreFilter(preFilterResult, apiKey, model, customPrompt, promptTemplate, previousResult, userFeedback, round) {
        console.log('🚀 开始带预过滤的分批处理...');

        // 对需要AI处理的文件进行分批
        const needAIFiles = preFilterResult.needAI;
        const batchSize = 30;
        const batches = [];

        for (let i = 0; i < needAIFiles.length; i += batchSize) {
            batches.push(needAIFiles.slice(i, i + batchSize));
        }

        console.log(`📦 将 ${needAIFiles.length} 个文件分成 ${batches.length} 批处理`);

        // 从预过滤结果开始
        const allCategories = { ...preFilterResult.categories };
        const errors = [];

        // 处理每个批次
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 处理第 ${i + 1}/${batches.length} 批，包含 ${batch.length} 个文件`);

            try {
                const batchPrompt = this._buildBatchPrompt(customPrompt, promptTemplate, i + 1, batches.length);
                const batchResult = await this._processSingleBatch(batch, apiKey, model, batchPrompt, promptTemplate, round);

                // 合并AI分类结果
                if (batchResult.categories) {
                    for (const [categoryName, categoryData] of Object.entries(batchResult.categories)) {
                        if (!allCategories[categoryName]) {
                            allCategories[categoryName] = {
                                description: categoryData.description,
                                items: []
                            };
                        }
                        if (Array.isArray(categoryData.items)) {
                            allCategories[categoryName].items.push(...categoryData.items);
                        }
                    }
                }

                console.log(`✅ 第 ${i + 1} 批处理成功`);

                // 批次间延迟
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ 第 ${i + 1} 批处理失败:`, error.message);
                errors.push(`第 ${i + 1} 批处理失败: ${error.message}`);
            }
        }

        return {
            success: true,
            categories: allCategories,
            suggestions: [
                `预过滤处理了 ${preFilterResult.preClassified.length} 个文件`,
                `AI处理了 ${needAIFiles.length} 个文件`,
                errors.length > 0 ? `${errors.length} 个批次处理失败` : '所有批次处理成功'
            ],
            errors: errors,
            round: round,
            batchInfo: {
                totalFiles: preFilterResult.preClassified.length + needAIFiles.length,
                preFilteredFiles: preFilterResult.preClassified.length,
                aiBatchCount: batches.length,
                aiProcessedFiles: needAIFiles.length
            }
        };
    }

    /**
     * 分批处理大量文件的AI分类
     * @private
     */
    async _classifyInBatches(pathList, apiKey, model, customPrompt, promptTemplate, previousResult, userFeedback, round) {
        const batchSize = 30; // 减少到每批30个文件，提高成功率
        const batches = [];

        // 将文件列表分成批次
        for (let i = 0; i < pathList.length; i += batchSize) {
            batches.push(pathList.slice(i, i + batchSize));
        }

        console.log(`📦 分成 ${batches.length} 批处理，每批最多 ${batchSize} 个文件`);

        const allCategories = {};
        const allSuggestions = [];
        let processedCount = 0;

        // 逐批处理
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 处理第 ${i + 1}/${batches.length} 批，包含 ${batch.length} 个文件`);

            try {
                // 为每批创建专门的提示词
                const batchPrompt = this._buildBatchPrompt(customPrompt, promptTemplate, i + 1, batches.length);

                // 调用单批处理
                const batchResult = await this._processSingleBatch(batch, apiKey, model, batchPrompt, promptTemplate, round);

                // 合并结果
                if (batchResult.categories) {
                    for (const [categoryName, categoryData] of Object.entries(batchResult.categories)) {
                        if (!allCategories[categoryName]) {
                            allCategories[categoryName] = {
                                description: categoryData.description,
                                items: []
                            };
                        }
                        // 确保 categoryData.items 是数组
                        if (Array.isArray(categoryData.items)) {
                            allCategories[categoryName].items.push(...categoryData.items);
                        } else {
                            console.warn(`⚠️ 分类 ${categoryName} 的items不是数组:`, categoryData.items);
                        }
                    }
                }

                if (batchResult.suggestions) {
                    allSuggestions.push(...batchResult.suggestions);
                }

                processedCount += batch.length;
                console.log(`✅ 第 ${i + 1} 批处理完成，已处理 ${processedCount}/${pathList.length} 个文件`);

                // 批次间稍作延迟，避免API限流
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error(`❌ 第 ${i + 1} 批处理失败:`, error.message);
                // 继续处理下一批，不中断整个流程
                allSuggestions.push(`第 ${i + 1} 批处理失败: ${error.message}`);
            }
        }

        // 去重建议
        const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 5);

        console.log(`🎉 分批处理完成，共处理 ${processedCount} 个文件，生成 ${Object.keys(allCategories).length} 个分类`);

        return {
            success: true,
            data: {
                categories: allCategories,
                suggestions: uniqueSuggestions.length > 0 ? uniqueSuggestions : [
                    "已完成大量文件的智能分类",
                    "建议检查分类结果是否符合预期",
                    "可以使用多轮对话功能进一步优化分类"
                ]
            },
            model: model,
            promptTemplate: promptTemplate,
            round: round,
            hasUserFeedback: !!userFeedback,
            batchInfo: {
                totalFiles: pathList.length,
                batchCount: batches.length,
                batchSize: batchSize,
                processedFiles: processedCount
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 构建批次专用提示词
     * @private
     */
    _buildBatchPrompt(customPrompt, promptTemplate, batchNumber, totalBatches) {
        // 简化批次提示词，减少处理时间
        if (customPrompt) {
            return customPrompt;
        }

        // 使用最简化的提示词
        return `将文件按类型分类。只返回JSON格式：
{
  "categories": {
    "图片": {"description": "图片文件", "items": ["文件名1", "文件名2"]},
    "文档": {"description": "文档文件", "items": ["文件名3"]},
    "其他": {"description": "其他文件", "items": ["文件名4"]}
  }
}`;
    }

    /**
     * 处理单个批次
     * @private
     */
    async _processSingleBatch(batch, apiKey, model, prompt, promptTemplate = 'default', round = 1) {
        // 创建文件名映射
        const fileNameMap = new Map();
        batch.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            fileNameMap.set(fileName, item.relativePath);
        });

        const finalPrompt = this._buildPromptWithFileList(prompt, batch);

        // 检测是否为大量相似文件（如PNG图片），使用快速模式
        const isLargeSimilarFiles = this._detectLargeSimilarFiles(batch);

        // 调用AI API
        const response = await axios.post(this.apiUrl, {
            model: model,
            messages: [
                {
                    role: "system",
                    content: isLargeSimilarFiles ?
                        "快速分类文件。只返回JSON：{\"categories\":{\"图片\":{\"description\":\"图片文件\",\"items\":[所有文件名]}}}" :
                        "你是文件整理助手。根据文件名将文件分类，返回简洁的JSON格式结果。只返回JSON，不要其他解释。保持分类标准一致。"
                },
                {
                    role: "user",
                    content: isLargeSimilarFiles ?
                        `将这些文件归类到"图片"分类：\n${finalPrompt}` :
                        finalPrompt
                }
            ],
            temperature: 0.1,
            max_tokens: isLargeSimilarFiles ? 500 : 1000, // 相似文件使用更少token
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 增加到120秒超时
        });

        // 解析响应
        return this._parseAIResponse(response.data, fileNameMap);
    }

    /**
     * 检测是否为大量相似文件
     * @private
     */
    _detectLargeSimilarFiles(batch) {
        if (batch.length < 20) return false;

        // 统计文件扩展名
        const extensions = {};
        batch.forEach(item => {
            const fileName = item.name || path.basename(item.relativePath || '');
            const ext = path.extname(fileName).toLowerCase();
            extensions[ext] = (extensions[ext] || 0) + 1;
        });

        // 如果80%以上是同一种扩展名，认为是相似文件
        const totalFiles = batch.length;
        for (const [ext, count] of Object.entries(extensions)) {
            if (count / totalFiles > 0.8) {
                console.log(`🚀 检测到大量相似文件 (${ext}): ${count}/${totalFiles} = ${Math.round(count/totalFiles*100)}%`);
                return true;
            }
        }

        return false;
    }

    /**
     * 构建AI分类的提示词
     * @private
     */
    _buildClassificationPrompt(pathList, promptTemplate = 'default') {
        // 如果是默认模板，使用原有逻辑
        if (promptTemplate === 'default') {
            return `根据文件扩展名分类文件。只返回JSON格式，不要其他文字：
{
  "categories": {
    "文档": {"description": "文档文件", "items": ["文件名1", "文件名2"]},
    "图片": {"description": "图片文件", "items": ["文件名3"]},
    "其他": {"description": "其他文件", "items": ["文件名4"]}
  },
  "suggestions": ["分类建议1", "分类建议2"]
}

注意：
1. 只返回JSON，不要markdown代码块
2. 根据文件扩展名分类（.jpg/.png为图片，.doc/.pdf为文档等）
3. items数组中只放文件名，不要路径
4. 保持简洁，避免过长响应`;
        }

        // 对于其他模板，返回空字符串，由前端提供完整提示词
        return '';
    }

    /**
     * 将提示词与文件列表组合
     * @private
     */
    _buildPromptWithFileList(basePrompt, pathList) {
        // 优化：只传输文件名，大大减少数据量
        const pathStrings = pathList.map(item => {
            // 只使用文件名，不使用完整路径
            const fileName = item.name || path.basename(item.relativePath || '');
            return `${item.type === 'folder' ? '[文件夹]' : '[文件]'} ${fileName}`;
        }).join('\n');

        console.log('📝 优化后的文件列表长度:', pathStrings.length);
        console.log('📝 文件列表示例:', pathStrings.split('\n').slice(0, 5).join('\n'));

        // 如果提示词中已包含文件列表占位符，则替换
        if (basePrompt.includes('${pathStrings}') || basePrompt.includes('{pathStrings}')) {
            return basePrompt.replace(/\$\{pathStrings\}|\{pathStrings\}/g, pathStrings);
        }

        // 否则在提示词后添加文件列表
        return `${basePrompt}

文件列表：
${pathStrings}`;
    }

    /**
     * 解析AI返回的分类结果
     * @private
     */
    _parseAIResponse(response, fileNameMap = null) {
        try {
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('AI返回内容为空');
            }

            console.log('🔍 AI原始响应内容:', content);
            console.log('📏 响应内容长度:', content.length);

            // 注意：这里不记录对话，因为在调用方法中已经记录了

            // 尝试多种方式提取JSON内容
            let jsonStr = content.trim();

            // 方法1: 查找完整的JSON对象
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
                console.log('✅ 使用正则提取JSON');
            }

            // 方法2: 如果包含代码块标记，提取其中的内容
            const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1];
                console.log('✅ 从代码块中提取JSON');
            }

            // 方法3: 查找第一个{到最后一个}
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = content.substring(firstBrace, lastBrace + 1);
                console.log('✅ 使用大括号边界提取JSON');
            }

            // 方法4: 如果响应被截断，尝试修复不完整的JSON
            if (!jsonStr.endsWith('}')) {
                console.log('⚠️ 检测到JSON可能被截断，尝试修复...');
                jsonStr = this._fixTruncatedJson(jsonStr);
            }

            console.log('📝 提取的JSON字符串长度:', jsonStr.length);
            console.log('📝 JSON字符串前100字符:', jsonStr.substring(0, 100));

            // 尝试修复常见的JSON格式问题
            jsonStr = this._fixCommonJsonIssues(jsonStr);

            let result;
            try {
                result = JSON.parse(jsonStr);
                console.log('✅ JSON解析成功');
            } catch (parseError) {
                console.error('❌ JSON解析失败，尝试修复...');
                console.error('错误位置:', parseError.message);

                // 尝试更激进的修复
                const fixedJson = this._aggressiveJsonFix(jsonStr);
                result = JSON.parse(fixedJson);
                console.log('✅ 修复后JSON解析成功');
            }

            // 验证返回结果的格式
            if (!result.categories || typeof result.categories !== 'object') {
                throw new Error('AI返回结果格式不正确：缺少categories字段');
            }

            // 如果有文件名映射，将文件名映射回相对路径
            if (fileNameMap && fileNameMap.size > 0) {
                console.log('🔄 开始文件名映射...');
                for (const categoryName in result.categories) {
                    const category = result.categories[categoryName];
                    if (category.items && Array.isArray(category.items)) {
                        category.items = category.items.map(fileName => {
                            // 尝试从映射中找到对应的相对路径
                            const relativePath = fileNameMap.get(fileName);
                            if (relativePath) {
                                console.log(`📍 映射: ${fileName} -> ${relativePath}`);
                                return relativePath;
                            }
                            // 如果找不到映射，保持原文件名
                            console.log(`⚠️ 未找到映射: ${fileName}`);
                            return fileName;
                        });
                    }
                }
                console.log('✅ 文件名映射完成');
            }

            console.log('✅ AI响应验证通过:', {
                categoriesCount: Object.keys(result.categories).length,
                suggestionsCount: result.suggestions?.length || 0
            });

            return result;
        } catch (error) {
            console.error('❌ 解析AI响应失败:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error(`解析AI响应失败: ${error.message}`);
        }
    }

    /**
     * 修复常见的JSON格式问题
     * @private
     */
    _fixCommonJsonIssues(jsonStr) {
        let fixed = jsonStr;

        // 移除可能的前后缀文本
        fixed = fixed.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

        // 修复单引号为双引号
        fixed = fixed.replace(/'/g, '"');

        // 修复属性名没有引号的问题
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // 移除注释
        fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
        fixed = fixed.replace(/\/\/.*$/gm, '');

        // 修复尾随逗号
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

        return fixed;
    }

    /**
     * 更激进的JSON修复
     * @private
     */
    _aggressiveJsonFix(jsonStr) {
        try {
            // 尝试构建一个基本的分类结果
            const lines = jsonStr.split('\n');
            let inCategories = false;
            let inSuggestions = false;
            const categories = {};
            const suggestions = [];

            for (const line of lines) {
                const trimmed = line.trim();

                if (trimmed.includes('"categories"') || trimmed.includes('categories')) {
                    inCategories = true;
                    continue;
                }

                if (trimmed.includes('"suggestions"') || trimmed.includes('suggestions')) {
                    inCategories = false;
                    inSuggestions = true;
                    continue;
                }

                if (inCategories && trimmed.includes(':')) {
                    // 尝试提取类别信息
                    const match = trimmed.match(/"([^"]+)"\s*:\s*\{/);
                    if (match) {
                        categories[match[1]] = {
                            description: "AI分类结果",
                            items: []
                        };
                    }
                }

                if (inSuggestions && trimmed.includes('"')) {
                    // 提取建议
                    const match = trimmed.match(/"([^"]+)"/);
                    if (match && !match[1].includes(':')) {
                        suggestions.push(match[1]);
                    }
                }
            }

            return JSON.stringify({
                categories: Object.keys(categories).length > 0 ? categories : {
                    "文档资料": { description: "文档和资料文件", items: [] },
                    "图片媒体": { description: "图片和媒体文件", items: [] },
                    "其他文件": { description: "其他类型文件", items: [] }
                },
                suggestions: suggestions.length > 0 ? suggestions : [
                    "AI响应解析出现问题，已使用默认分类",
                    "建议检查网络连接和API配置"
                ]
            });
        } catch (error) {
            // 最后的备用方案
            return JSON.stringify({
                categories: {
                    "未分类文件": {
                        description: "由于解析错误，所有文件归为未分类",
                        items: []
                    }
                },
                suggestions: [
                    "AI响应解析失败，请检查API配置",
                    "建议重新尝试分类操作"
                ]
            });
        }
    }

    /**
     * 修复被截断的JSON
     * @private
     */
    _fixTruncatedJson(jsonStr) {
        try {
            // 尝试找到最后一个完整的项目
            let fixed = jsonStr;

            // 如果在items数组中被截断
            if (fixed.includes('"items": [') && !fixed.includes(']}')) {
                // 找到最后一个完整的文件名
                const lastCompleteItem = fixed.lastIndexOf('",');
                if (lastCompleteItem > -1) {
                    fixed = fixed.substring(0, lastCompleteItem + 1) + '\n      ]\n    }\n  },\n  "suggestions": ["响应被截断，建议重试"]\n}';
                } else {
                    // 如果连一个完整项目都没有，创建空数组
                    const itemsStart = fixed.indexOf('"items": [');
                    if (itemsStart > -1) {
                        fixed = fixed.substring(0, itemsStart) + '"items": []\n    }\n  },\n  "suggestions": ["响应被截断，建议重试"]\n}';
                    }
                }
            }

            // 确保JSON结构完整
            if (!fixed.includes('"suggestions"')) {
                fixed = fixed.replace(/,?\s*$/, '') + ',\n  "suggestions": ["响应被截断，建议重试"]\n}';
            }

            // 确保以}结尾
            if (!fixed.endsWith('}')) {
                fixed += '\n}';
            }

            console.log('🔧 修复后的JSON长度:', fixed.length);
            return fixed;
        } catch (error) {
            console.error('❌ 修复截断JSON失败:', error);
            // 返回基本的JSON结构
            return JSON.stringify({
                categories: {
                    "未分类": {
                        description: "响应被截断，无法完成分类",
                        items: []
                    }
                },
                suggestions: ["响应被截断，请重试或减少文件数量"]
            });
        }
    }

    /**
     * 执行文件移动操作
     * @param {string} basePath - 基础路径
     * @param {Object} classificationResult - AI分类结果
     * @param {boolean} preview - 是否为预览模式
     * @returns {Object} 移动操作结果
     */
    async executeFileMove(basePath, classificationResult, preview = false) {
        try {
            const operations = [];
            const results = {
                success: true,
                preview: preview,
                operations: [],
                errors: [],
                summary: {
                    totalFiles: 0,
                    movedFiles: 0,
                    createdFolders: 0,
                    errors: 0
                }
            };

            // 遍历每个分类
            for (const [categoryName, categoryData] of Object.entries(classificationResult.categories)) {
                const targetDir = path.join(basePath, categoryName);

                // 预览模式或实际执行时都记录操作
                if (!preview) {
                    // 创建目标文件夹（如果不存在）
                    try {
                        await fs.mkdir(targetDir, { recursive: true });
                        results.summary.createdFolders++;
                    } catch (error) {
                        if (error.code !== 'EEXIST') {
                            console.error(`创建文件夹 ${targetDir} 失败:`, error);
                            results.errors.push(`创建文件夹失败: ${categoryName}`);
                            results.summary.errors++;
                            continue;
                        }
                    }
                }

                // 处理该分类下的每个文件/文件夹
                for (const relativePath of categoryData.items) {
                    const sourcePath = path.join(basePath, relativePath);
                    const fileName = path.basename(relativePath);
                    const targetPath = path.join(targetDir, fileName);

                    const operation = {
                        source: sourcePath,
                        target: targetPath,
                        relativePath: relativePath,
                        category: categoryName,
                        type: 'move'
                    };

                    operations.push(operation);
                    results.operations.push(operation);
                    results.summary.totalFiles++;

                    if (!preview) {
                        try {
                            // 智能检查源文件路径
                            let actualSourcePath = sourcePath;
                            let sourceExists = false;

                            // 首先检查原始路径
                            try {
                                await fs.access(sourcePath);
                                sourceExists = true;
                            } catch (error) {
                                // 如果原始路径不存在，尝试在根目录查找
                                const fileName = path.basename(relativePath);
                                const rootPath = path.join(basePath, fileName);
                                try {
                                    await fs.access(rootPath);
                                    actualSourcePath = rootPath;
                                    sourceExists = true;
                                    console.log(`📍 在根目录找到文件: ${fileName}`);
                                } catch (rootError) {
                                    // 检查是否文件已经在目标分类文件夹中
                                    if (sourcePath.includes('/')) {
                                        console.log(`⚠️ 文件可能已在子文件夹中: ${relativePath}`);
                                        results.errors.push(`文件已在子文件夹中，跳过移动: ${relativePath}`);
                                        results.summary.errors++;
                                        continue;
                                    }
                                }
                            }

                            if (!sourceExists) {
                                console.log(`⚠️ 源文件不存在，跳过: ${sourcePath}`);
                                results.errors.push(`源文件不存在: ${relativePath}`);
                                results.summary.errors++;
                                continue;
                            }

                            // 检查目标文件是否已存在
                            try {
                                await fs.access(targetPath);
                                // 如果目标文件已存在，生成新名称
                                const newTargetPath = await this._generateUniqueFileName(targetPath);
                                operation.target = newTargetPath;
                                await fs.rename(actualSourcePath, newTargetPath);
                                console.log(`✅ 文件移动成功 (重命名): ${actualSourcePath} -> ${newTargetPath}`);
                            } catch (error) {
                                if (error.code === 'ENOENT') {
                                    // 目标文件不存在，直接移动
                                    await fs.rename(actualSourcePath, targetPath);
                                    console.log(`✅ 文件移动成功: ${actualSourcePath} -> ${targetPath}`);
                                } else {
                                    throw error;
                                }
                            }

                            results.summary.movedFiles++;
                        } catch (error) {
                            console.error(`移动文件 ${sourcePath} 到 ${targetPath} 失败:`, error);
                            results.errors.push(`移动文件失败: ${relativePath} - ${error.message}`);
                            results.summary.errors++;
                        }
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('执行文件移动错误:', error);
            throw new Error(`文件移动失败: ${error.message}`);
        }
    }

    /**
     * 生成唯一的文件名（处理重名冲突）
     * @private
     */
    async _generateUniqueFileName(filePath) {
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);

        let counter = 1;
        let newPath = filePath;

        while (true) {
            try {
                await fs.access(newPath);
                // 文件存在，生成新名称
                newPath = path.join(dir, `${baseName}_${counter}${ext}`);
                counter++;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // 文件不存在，可以使用这个名称
                    break;
                }
                throw error;
            }
        }

        return newPath;
    }

    /**
     * 验证API密钥格式
     * @param {string} apiKey - API密钥
     * @returns {boolean} 是否有效
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        // 硅基流动的API密钥格式验证
        return apiKey.startsWith('sk-') && apiKey.length > 10;
    }

    /**
     * 记录提示词历史
     * @param {string} prompt - 提示词内容
     * @param {string} template - 提示词模板类型
     * @param {number} round - 对话轮次
     * @param {boolean} isCustom - 是否为自定义提示词
     */
    recordPrompt(prompt, template, round, isCustom = false) {
        const promptRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            round: round,
            template: template,
            isCustom: isCustom,
            content: prompt,
            contentLength: prompt.length
        };

        this.promptHistory.push(promptRecord);
        console.log(`📝 记录提示词 (第${round}轮, ${template}${isCustom ? ', 自定义' : ''}):`, {
            length: prompt.length,
            preview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
        });

        return promptRecord;
    }

    /**
     * 记录对话历史
     * @param {string} type - 对话类型: 'user' | 'assistant' | 'system'
     * @param {string} content - 对话内容
     * @param {number} round - 对话轮次
     * @param {Object} metadata - 额外元数据
     */
    recordDialogue(type, content, round, metadata = {}) {
        const dialogueRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            round: round,
            type: type,
            content: content,
            contentLength: content.length,
            metadata: metadata
        };

        this.dialogueHistory.push(dialogueRecord);
        console.log(`💬 记录对话 (第${round}轮, ${type}):`, {
            length: content.length,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        });

        return dialogueRecord;
    }

    /**
     * 获取提示词历史记录
     * @param {number} limit - 限制返回数量
     * @returns {Array} 提示词历史记录
     */
    getPromptHistory(limit = 50) {
        return this.promptHistory
            .slice(-limit)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * 获取对话历史记录
     * @param {number} limit - 限制返回数量
     * @param {number} round - 指定轮次，不指定则返回所有轮次
     * @returns {Array} 对话历史记录
     */
    getDialogueHistory(limit = 100, round = null) {
        let history = this.dialogueHistory;

        if (round !== null) {
            history = history.filter(record => record.round === round);
        }

        return history
            .slice(-limit)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * 清空历史记录
     * @param {string} type - 清空类型: 'prompt' | 'dialogue' | 'all'
     */
    clearHistory(type = 'all') {
        switch (type) {
            case 'prompt':
                this.promptHistory = [];
                console.log('🗑️ 已清空提示词历史记录');
                break;
            case 'dialogue':
                this.dialogueHistory = [];
                console.log('🗑️ 已清空对话历史记录');
                break;
            case 'all':
                this.promptHistory = [];
                this.dialogueHistory = [];
                this.conversationHistory = [];
                this.currentRound = 1;
                console.log('🗑️ 已清空所有历史记录');
                break;
        }
    }

    /**
     * 获取文件夹的移动历史记录
     * @param {string} basePath - 基础路径
     * @returns {Object} 移动历史记录
     */
    async getMoveHistory(basePath) {
        try {
            const result = {
                basePath: basePath,
                existingFolders: [],
                movedFiles: [],
                remainingFiles: [],
                summary: {
                    totalExistingFolders: 0,
                    totalMovedFiles: 0,
                    totalRemainingFiles: 0
                }
            };

            // 扫描现有的分类文件夹
            const entries = await fs.readdir(basePath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const folderPath = path.join(basePath, entry.name);
                    const folderInfo = {
                        name: entry.name,
                        path: folderPath,
                        fileCount: 0,
                        files: []
                    };

                    try {
                        const folderEntries = await fs.readdir(folderPath, { withFileTypes: true });
                        for (const folderEntry of folderEntries) {
                            if (folderEntry.isFile()) {
                                folderInfo.fileCount++;
                                folderInfo.files.push(folderEntry.name);
                                result.movedFiles.push({
                                    fileName: folderEntry.name,
                                    category: entry.name,
                                    currentPath: path.join(folderPath, folderEntry.name)
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(`读取文件夹 ${folderPath} 失败:`, error.message);
                    }

                    result.existingFolders.push(folderInfo);
                    result.summary.totalExistingFolders++;
                }
            }

            // 扫描根目录下剩余的文件
            for (const entry of entries) {
                if (entry.isFile()) {
                    result.remainingFiles.push({
                        fileName: entry.name,
                        path: path.join(basePath, entry.name)
                    });
                    result.summary.totalRemainingFiles++;
                }
            }

            result.summary.totalMovedFiles = result.movedFiles.length;

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('获取移动历史记录错误:', error);
            throw new Error(`获取移动历史记录失败: ${error.message}`);
        }
    }

    /**
     * 获取支持的AI模型列表
     * @returns {Array} 模型列表
     */
    getSupportedModels() {
        return [
            {
                id: 'BAAI/bge-m3',
                name: 'BAAI/bge-m3',
                description: '通用文本理解模型，适合文件分类',
                category: 'BAAI'
            },
            {
                id: 'Pro/deepseek-ai/DeepSeek-R1',
                name: 'DeepSeek-R1',
                description: '高性能推理模型',
                category: 'Pro'
            },
            {
                id: 'Pro/deepseek-ai/DeepSeek-V3',
                name: 'DeepSeek-V3',
                description: '最新版本推理模型',
                category: 'Pro'
            },
            {
                id: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
                name: 'Qwen3-Next-80B',
                description: '通义千问3代大模型，80B参数',
                category: 'Qwen'
            },
            {
                id: 'Pro/Qwen/Qwen2.5-72B-Instruct',
                name: 'Qwen2.5-72B',
                description: '通义千问2.5代大模型，72B参数',
                category: 'Pro'
            },
            {
                id: 'ByteDance-Seed/Seed-OSS-36B-Instruct',
                name: 'Seed-OSS-36B',
                description: '字节跳动开源指令模型，36B参数',
                category: 'ByteDance'
            },
            {
                id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
                name: 'Qwen3-Coder-30B',
                description: '通义千问代码专用模型，30B参数',
                category: 'Qwen'
            }
        ];
    }

    /**
     * 获取服务统计信息
     * @returns {Object} 统计信息
     */
    async getStats() {
        return {
            name: this.name,
            version: this.version,
            apiUrl: this.apiUrl,
            defaultModel: this.defaultModel,
            supportedModels: this.getSupportedModels().length,
            status: 'ready',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = AiorganizerService;
