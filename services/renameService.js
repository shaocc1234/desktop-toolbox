// services/renameService.js - Ai 重命名服务 (第二阶段：基础文档处理)
const path = require('path');
const fs = require('fs').promises;
const DocumentProcessor = require('./DocumentProcessor');
const AIRenameService = require('./AIRenameService');
const SmartQueueManager = require('./SmartQueueManager');
const PSDService = require('./psdService');
const RenameHistoryService = require('./renameHistoryService');

class RenameService {
    constructor(config = {}) {
        this.name = 'Ai 重命名';
        this.documentProcessor = new DocumentProcessor();
        this.aiRenameService = new AIRenameService({
            ...config,
            // 传递多AI配置
            multiAI: config.multiAI
        });
        this.psdService = new PSDService(this.documentProcessor.ocrService);
        this.renameHistoryService = new RenameHistoryService();

        // 初始化历史记录服务
        this.initializeHistoryService();

        this.supportedTypes = {
            // 第二阶段支持的文档类型
            documents: ['.txt', '.md', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt', '.csv'],
            // 第三阶段支持的图片类型（OCR + 视觉模型）
            images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif'],
            // 第四阶段支持的PDF类型
            pdfs: ['.pdf'],
            // 第五阶段支持的其他文件类型
            audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.amr'],
            video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.f4v'],
            archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.cab', '.iso'],
            code: ['.js', '.html', '.css', '.jsx', '.vue', '.scss', '.sass', '.less', '.ts', '.ejs', '.htm', '.mhtml',
                   '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.hxx', '.php', '.rb', '.go', '.pyc',
                   '.sh', '.bash', '.zsh', '.fish', '.bat', '.ps1',
                   '.json', '.xml', '.yaml', '.yml', '.sql',
                   '.conf', '.config', '.ini', '.cfg', '.properties', '.env', '.toml', '.lock', '.sxcu'],
            design: ['.psd', '.psb', '.ai', '.sketch', '.dxf', '.dwg'],
            database: ['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb'],
            log: ['.log', '.logs'],
            font: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
            plugin: ['.vsix', '.rbz'],
            debug: ['.pdb'],
            executable: ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app', '.run', '.dll', '.so', '.dylib', '.apk']
        };
    }

    /**
     * 初始化历史记录服务
     */
    async initializeHistoryService() {
        try {
            await this.renameHistoryService.initialize();
        } catch (error) {
            console.warn('历史记录服务初始化失败:', error.message);
        }
    }

    /**
     * 检查文件是否支持处理
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否支持
     */
    isSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return Object.values(this.supportedTypes).flat().includes(ext);
    }

    /**
     * 获取文件处理阶段
     * @param {string} filePath 文件路径
     * @returns {string} 处理阶段
     */
    getProcessingStage(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        if (this.supportedTypes.documents.includes(ext)) {
            return 'stage2'; // 第二阶段：基础文档处理
        } else if (this.supportedTypes.images.includes(ext)) {
            return 'stage3'; // 第三阶段：图片OCR
        } else if (this.supportedTypes.pdfs.includes(ext)) {
            return 'stage4'; // 第四阶段：PDF处理
        } else if (this.supportedTypes.audio.includes(ext) ||
                   this.supportedTypes.video.includes(ext) ||
                   this.supportedTypes.archive.includes(ext) ||
                   this.supportedTypes.code.includes(ext) ||
                   this.supportedTypes.design.includes(ext) ||
                   this.supportedTypes.database.includes(ext) ||
                   this.supportedTypes.log.includes(ext) ||
                   this.supportedTypes.font.includes(ext) ||
                   this.supportedTypes.plugin.includes(ext) ||
                   this.supportedTypes.debug.includes(ext) ||
                   this.supportedTypes.executable.includes(ext)) {
            return 'stage5'; // 第五阶段：其他文件类型
        } else {
            return 'unsupported';
        }
    }

    /**
     * 处理Ai 重命名请求 (兼容原有接口)
     * @param {Object} data - 请求数据
     * @returns {Object} 处理结果
     */
    async process(data) {
        try {
            console.log('Ai 重命名处理数据:', data);

            if (data.files && Array.isArray(data.files)) {
                // 批量处理文件
                const results = await this.processFiles(data.files, data.options || {});
                return {
                    success: true,
                    message: 'Ai 重命名处理成功',
                    data: {
                        results,
                        processed: true,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: false,
                    message: '无效的请求数据',
                    error: '缺少files参数'
                };
            }
        } catch (error) {
            console.error('Ai 重命名服务错误:', error);
            throw error;
        }
    }

    /**
     * 批量处理文件重命名
     * @param {Array} files 文件信息数组
     * @param {Object} options 处理选项
     * @param {Function} progressCallback 进度回调
     * @returns {Promise<Array>} 处理结果数组
     */
    async processFiles(files, options = {}, progressCallback = null) {
        const total = files.length;

        // 检测图片文件数量，动态调整并发数
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
        const imageCount = files.filter(file => {
            const ext = path.extname(file.name || file.path).toLowerCase();
            return imageExtensions.includes(ext);
        }).length;

        // 如果图片文件较多，降低并发数以避免API速率限制
        let defaultConcurrency = 3;
        if (imageCount > 10) {
            defaultConcurrency = 1; // 图片多时使用串行处理
            console.log(`🖼️ 检测到 ${imageCount} 个图片文件，使用串行处理避免API速率限制`);
        } else if (imageCount > 5) {
            defaultConcurrency = 2; // 适中数量时降低并发
            console.log(`🖼️ 检测到 ${imageCount} 个图片文件，降低并发数至 2`);
        }

        const concurrency = options.concurrency || defaultConcurrency;
        const enableConcurrency = options.enableConcurrency !== false; // 默认启用并发

        console.log(`开始批量处理 ${total} 个文件 (图片: ${imageCount}, 并发: ${enableConcurrency ? concurrency : 1})`);

        // 检查是否启用智能队列处理
        const useSmartQueue = options.useSmartQueue !== false && (imageCount > 5 || total > 20);

        if (useSmartQueue) {
            console.log(`🧠 启用智能队列处理模式`);
            return await this.processFilesWithSmartQueue(files, options, progressCallback);
        } else if (!enableConcurrency || concurrency === 1) {
            // 串行处理（原有逻辑）
            return await this.processFilesSequentially(files, options, progressCallback);
        } else {
            // 并发处理（性能优化）
            return await this.processFilesConcurrently(files, options, progressCallback, concurrency);
        }
    }

    /**
     * 串行处理文件
     */
    async processFilesSequentially(files, options = {}, progressCallback = null) {
        const results = [];
        const total = files.length;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];

        for (let i = 0; i < total; i++) {
            const file = files[i];

            try {
                // 检查是否为图片文件，如果是则添加延迟
                const ext = path.extname(file.name || file.path).toLowerCase();
                const isImage = imageExtensions.includes(ext);

                if (isImage && i > 0) {
                    // 图片文件之间添加1秒延迟，避免API速率限制
                    console.log(`🖼️ 图片文件处理延迟 1000ms...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                const result = await this.processFile(file, options);
                results.push(result);

                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        currentFile: file.name || file.path,
                        result
                    });
                }

            } catch (error) {
                console.error(`处理文件失败: ${file.name || file.path}`, error);
                results.push({
                    success: false,
                    originalName: file.name || path.basename(file.path),
                    error: error.message,
                    stage: 'error'
                });
            }
        }

        return results;
    }

    /**
     * 并发处理文件（增强版错误处理）
     */
    async processFilesConcurrently(files, options = {}, progressCallback = null, concurrency = 3) {
        const total = files.length;
        const results = new Array(total);
        let completed = 0;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 5; // 连续错误阈值

        // 创建智能文件处理队列
        const processFile = async (file, index) => {
            try {
                // 如果连续错误过多，增加延迟
                if (consecutiveErrors > 2) {
                    const delay = Math.min(consecutiveErrors * 2000, 10000);
                    console.log(`⏳ 连续错误过多，延迟 ${delay}ms 后处理: ${file.name || file.path}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const result = await this.processFile(file, options);
                results[index] = result;

                // 成功处理，重置错误计数
                if (result.success) {
                    consecutiveErrors = 0;
                } else {
                    consecutiveErrors++;
                }

                completed++;
                if (progressCallback) {
                    progressCallback({
                        current: completed,
                        total,
                        percentage: Math.round((completed / total) * 100),
                        currentFile: file.name || file.path,
                        result
                    });
                }

                return result;
            } catch (error) {
                consecutiveErrors++;
                console.error(`处理文件失败: ${file.name || file.path}`, error);

                // 分析错误类型
                const errorType = this.analyzeError(error);
                const shouldSkip = this.shouldSkipFile(error, consecutiveErrors, maxConsecutiveErrors);

                const errorResult = {
                    success: false,
                    originalName: file.name || path.basename(file.path),
                    error: error.message,
                    errorType,
                    skipped: shouldSkip,
                    stage: 'error'
                };
                results[index] = errorResult;

                completed++;
                if (progressCallback) {
                    progressCallback({
                        current: completed,
                        total,
                        percentage: Math.round((completed / total) * 100),
                        currentFile: file.name || file.path,
                        result: errorResult
                    });
                }

                // 如果连续错误过多，暂停处理
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.warn(`⚠️ 连续错误达到阈值 ${maxConsecutiveErrors}，暂停 30 秒...`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    consecutiveErrors = 0; // 重置计数器
                }

                return errorResult;
            }
        };

        // 使用Promise.all限制并发数
        const chunks = [];
        for (let i = 0; i < files.length; i += concurrency) {
            const chunk = files.slice(i, i + concurrency);
            const chunkPromises = chunk.map((file, chunkIndex) =>
                processFile(file, i + chunkIndex)
            );
            chunks.push(Promise.all(chunkPromises));
        }

        // 等待所有批次完成
        await Promise.all(chunks);

        return results;
    }

    /**
     * 智能并发处理文件（使用队列管理器）
     */
    async processFilesWithSmartQueue(files, options = {}, progressCallback = null) {
        const queueManager = new SmartQueueManager();
        queueManager.addFiles(files);

        const total = files.length;
        const results = [];
        let completed = 0;

        console.log(`🧠 启用智能队列处理 ${total} 个文件`);

        while (queueManager.queue.length > 0 || queueManager.processing.size > 0) {
            const status = queueManager.getStatus();
            const strategy = queueManager.getProcessingStrategy();

            // 如果需要暂停，等待一段时间
            if (status.shouldPause) {
                console.log(`⏸️ 智能暂停处理，等待 ${strategy.delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, strategy.delay));
                continue;
            }

            // 获取下一个要处理的文件
            const file = queueManager.getNextFile();
            if (!file) {
                // 没有可处理的文件，等待正在处理的文件完成
                if (queueManager.processing.size > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                } else {
                    break; // 所有文件处理完成
                }
            }

            // 处理文件
            try {
                console.log(`🔄 智能队列处理: ${file.name || file.path} (策略: 并发=${strategy.concurrency}, 延迟=${strategy.delay}ms)`);

                // 应用处理策略
                const processOptions = {
                    ...options,
                    useOCRFallback: strategy.useOCRFallback,
                    skipImages: strategy.skipImages && queueManager.isImageFile(file.name || file.path)
                };

                const result = await this.processFile(file, processOptions);

                // 标记成功
                queueManager.markSuccess(file.name || file.path);
                results.push(result);
                completed++;

                if (progressCallback) {
                    progressCallback({
                        current: completed,
                        total,
                        percentage: Math.round((completed / total) * 100),
                        currentFile: file.name || file.path,
                        result,
                        queueStatus: status
                    });
                }

                // 根据策略添加延迟
                if (strategy.delay > 1000) {
                    await new Promise(resolve => setTimeout(resolve, strategy.delay - 1000));
                }

            } catch (error) {
                const fileName = file.name || file.path;
                console.error(`❌ 智能队列处理失败: ${fileName}`, error);

                // 判断是否应该重试
                const shouldRetry = !this.shouldSkipFile(error, 0, 5);
                queueManager.markFailure(fileName, error, shouldRetry);

                const errorResult = {
                    success: false,
                    originalName: path.basename(fileName),
                    error: error.message,
                    errorType: this.analyzeError(error),
                    stage: 'error'
                };
                results.push(errorResult);
                completed++;

                if (progressCallback) {
                    progressCallback({
                        current: completed,
                        total,
                        percentage: Math.round((completed / total) * 100),
                        currentFile: fileName,
                        result: errorResult,
                        queueStatus: status
                    });
                }
            }
        }

        const finalStatus = queueManager.getStatus();
        console.log(`🏁 智能队列处理完成，最终状态:`, finalStatus);

        return results;
    }

    /**
     * 分析错误类型
     * @param {Error} error 错误对象
     * @returns {string} 错误类型
     */
    analyzeError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('timeout') || message.includes('超时')) {
            return 'timeout';
        } else if (message.includes('rate limit') || message.includes('429') || message.includes('tpm limit')) {
            return 'rate_limit';
        } else if (message.includes('quota') || message.includes('配额')) {
            return 'quota_exceeded';
        } else if (message.includes('server error') || message.includes('500')) {
            return 'server_error';
        } else if (message.includes('unauthorized') || message.includes('401')) {
            return 'auth_error';
        } else {
            return 'unknown';
        }
    }

    /**
     * 判断是否应该跳过文件
     * @param {Error} error 错误对象
     * @param {number} consecutiveErrors 连续错误次数
     * @param {number} maxConsecutiveErrors 最大连续错误次数
     * @returns {boolean} 是否跳过
     */
    shouldSkipFile(error, consecutiveErrors, maxConsecutiveErrors) {
        const errorType = this.analyzeError(error);

        // 对于某些错误类型，立即跳过
        if (errorType === 'auth_error') {
            return true;
        }

        // 如果连续错误过多，跳过
        if (consecutiveErrors >= maxConsecutiveErrors) {
            return true;
        }

        return false;
    }

    /**
     * 处理单个文件
     * @param {Object} file 文件信息
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processFile(file, options = {}) {
        console.log('收到文件对象:', file);

        const filePath = file.path || file.fullPath;
        const fileName = file.name || path.basename(filePath);
        const stage = this.getProcessingStage(filePath);

        console.log(`处理文件: ${fileName} (阶段: ${stage}, 路径: ${filePath})`);

        // 检查是否跳过已处理的文件
        if (options.skipProcessed) {
            const historyRecord = await this.renameHistoryService.checkFileProcessed(filePath);
            if (historyRecord) {
                console.log(`⏭️ 跳过已处理文件: ${fileName} (上次处理: ${historyRecord.created_at})`);
                return {
                    success: true,
                    originalName: fileName,
                    newName: historyRecord.new_name,
                    skipped: true,
                    reason: '文件已处理过',
                    lastProcessed: historyRecord.created_at,
                    stage: 'skipped'
                };
            }
        }

        switch (stage) {
            case 'stage2':
                return await this.processDocumentFile(filePath, options);
            case 'stage3':
                return await this.processImageFile(filePath, options);
            case 'stage4':
                return await this.processPdfFile(filePath, options);
            case 'stage5':
                return await this.processGenericFile(filePath, options);
            default:
                return {
                    success: false,
                    originalName: fileName,
                    error: '不支持的文件类型',
                    stage: 'unsupported'
                };
        }
    }

    /**
     * 处理文档文件 (第二阶段)
     * @param {string} filePath 文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processDocumentFile(filePath, options = {}) {
        try {
            console.log(`开始处理文档文件: ${filePath}`);
            console.log('处理选项:', options);

            // 1. 提取文档内容
            const documentInfo = await this.documentProcessor.processDocument(filePath);
            console.log('文档处理结果:', documentInfo.success ? '成功' : '失败', documentInfo.error || '');

            if (!documentInfo.success) {
                return {
                    success: false,
                    originalName: path.basename(filePath),
                    error: documentInfo.error,
                    stage: 'stage2',
                    path: filePath // 添加文件路径
                };
            }

            // 2. 动态更新API密钥（如果提供）
            if (options.apiKey && options.apiKey !== this.aiRenameService.config.apiKey) {
                this.aiRenameService.config.apiKey = options.apiKey;
                console.log('🔑 更新API密钥');
            }

            // 3. 生成智能文件名
            console.log('开始生成智能文件名...');
            const renameResult = await this.aiRenameService.generateSmartFileName(
                documentInfo,
                options
            );
            console.log('AI重命名结果:', renameResult.success ? '成功' : '失败', renameResult.error || '');

            return {
                success: renameResult.success,
                originalName: documentInfo.fileName,
                suggestedName: renameResult.suggestedName,
                reasoning: renameResult.reasoning,
                confidence: renameResult.confidence,
                method: renameResult.method, // 添加方法信息
                stage: 'stage2',
                path: filePath, // 添加文件路径
                documentInfo: {
                    fileType: documentInfo.fileType,
                    contentLength: documentInfo.contentLength,
                    summary: documentInfo.summary
                },
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error(`处理文档文件失败: ${filePath}`, error);
            console.error('错误堆栈:', error.stack);
            return {
                success: false,
                originalName: path.basename(filePath),
                error: error.message,
                stage: 'stage2',
                path: filePath // 添加文件路径
            };
        }
    }

    /**
     * 处理图片文件 (第三阶段：OCR + 视觉模型)
     * @param {string} filePath 文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processImageFile(filePath, options = {}) {
        try {
            console.log(`开始处理图片文件: ${filePath}`);
            console.log('处理选项:', options);

            const fileName = path.basename(filePath);
            const useOCR = options.useOCR !== false; // 默认使用OCR

            let documentInfo = { success: false, content: '', metadata: {} };

            // 1. 根据配置决定是否进行OCR识别
            if (useOCR) {
                console.log('🔍 开始OCR识别图片文字...');
                documentInfo = await this.documentProcessor.processDocument(filePath);

                if (!documentInfo.success) {
                    console.warn('⚠️ OCR处理失败，将仅使用视觉模型分析图片');
                }
            } else {
                console.log('⚠️ 跳过OCR识别，直接使用视觉模型');
            }

            // 2. 准备文档信息（包含OCR结果和文件路径）
            const enrichedDocumentInfo = {
                fileName,
                filePath, // 添加文件路径供视觉模型使用
                fileType: 'image',
                content: documentInfo.content || '', // OCR识别的文字内容
                metadata: {
                    ...documentInfo.metadata,
                    hasOCRText: !!(documentInfo.content && documentInfo.content.trim().length > 0),
                    ocrProcessed: documentInfo.success,
                    useOCR
                }
            };

            console.log(`OCR结果: ${enrichedDocumentInfo.metadata.hasOCRText ? '识别到文字' : '未识别到文字'}`);
            console.log(`处理策略: ${useOCR ? 'OCR + 视觉模型' : '纯视觉模型'}`);

            // 3. 动态更新API密钥（如果提供）
            if (options.apiKey && options.apiKey !== this.aiRenameService.config.apiKey) {
                this.aiRenameService.config.apiKey = options.apiKey;
                console.log('🔑 更新API密钥');
            }

            // 4. 使用AI生成智能文件名
            console.log('开始生成智能文件名...');
            const renameResult = await this.aiRenameService.generateSmartFileName(
                enrichedDocumentInfo,
                options
            );

            if (renameResult.success) {
                console.log(`✅ 图片处理成功: ${fileName} -> ${renameResult.suggestedName}`);
                return {
                    success: true,
                    originalName: fileName,
                    suggestedName: renameResult.suggestedName,
                    confidence: renameResult.confidence,
                    reasoning: renameResult.reasoning,
                    method: renameResult.method,
                    stage: 'stage3',
                    path: filePath, // 添加文件路径
                    metadata: {
                        ...enrichedDocumentInfo.metadata,
                        processingMethod: 'OCR + AI分析',
                        aiModel: this.aiRenameService.config.model
                    }
                };
            } else {
                console.error(`❌ 图片AI处理失败: ${fileName}`, renameResult.error);
                return {
                    success: false,
                    originalName: fileName,
                    error: renameResult.error || '图片AI处理失败',
                    stage: 'stage3',
                    path: filePath, // 添加文件路径
                    fallbackName: renameResult.fallbackName
                };
            }

        } catch (error) {
            console.error(`❌ 图片处理过程出错: ${path.basename(filePath)}`, error);
            return {
                success: false,
                originalName: path.basename(filePath),
                error: error.message,
                stage: 'stage3',
                path: filePath // 添加文件路径
            };
        }
    }

    /**
     * 处理PDF文件 (第四阶段：PDF文本提取 + OCR识别)
     * @param {string} filePath 文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processPdfFile(filePath, options = {}) {
        try {
            console.log(`开始处理PDF文件: ${filePath}`);
            console.log('处理选项:', options);

            const fileName = path.basename(filePath);

            // 1. 使用DocumentProcessor处理PDF文档
            console.log('开始PDF文档处理...');
            const documentInfo = await this.documentProcessor.processDocument(filePath);

            if (!documentInfo.success) {
                console.warn('PDF文档处理失败，尝试继续处理');
            }

            // 2. 准备文档信息
            const enrichedDocumentInfo = {
                fileName,
                filePath,
                fileType: 'pdf',
                content: documentInfo.content || '',
                metadata: {
                    ...documentInfo.metadata,
                    hasContent: !!(documentInfo.content && documentInfo.content.trim().length > 0),
                    pdfProcessed: documentInfo.success
                }
            };

            console.log(`PDF处理结果: ${enrichedDocumentInfo.metadata.hasContent ? '提取到内容' : '未提取到内容'}`);
            if (enrichedDocumentInfo.metadata.pageCount) {
                console.log(`PDF页数: ${enrichedDocumentInfo.metadata.pageCount}`);
            }

            // 3. 使用AI生成智能文件名
            console.log('开始生成智能文件名...');
            const renameResult = await this.aiRenameService.generateSmartFileName(
                enrichedDocumentInfo,
                options
            );

            if (renameResult.success) {
                console.log(`✅ PDF处理成功: ${fileName} -> ${renameResult.suggestedName}`);
                return {
                    success: true,
                    originalName: fileName,
                    suggestedName: renameResult.suggestedName,
                    confidence: renameResult.confidence,
                    reasoning: renameResult.reasoning,
                    method: renameResult.method,
                    stage: 'stage4',
                    metadata: {
                        ...enrichedDocumentInfo.metadata,
                        processingMethod: 'PDF文本提取 + AI分析',
                        aiModel: this.aiRenameService.config.model
                    }
                };
            } else {
                console.error(`❌ PDF AI处理失败: ${fileName}`, renameResult.error);
                return {
                    success: false,
                    originalName: fileName,
                    error: renameResult.error || 'PDF AI处理失败',
                    stage: 'stage4',
                    fallbackName: renameResult.fallbackName
                };
            }

        } catch (error) {
            console.error(`❌ PDF处理过程出错: ${path.basename(filePath)}`, error);
            return {
                success: false,
                originalName: path.basename(filePath),
                error: error.message,
                stage: 'stage4'
            };
        }
    }

    /**
     * 获取支持的文件类型统计
     * @param {Array} files 文件数组
     * @returns {Object} 文件类型统计
     */
    getFileTypeStats(files) {
        const stats = {
            stage2: 0, // 文档类型
            stage3: 0, // 图片类型
            stage4: 0, // PDF类型
            unsupported: 0
        };

        files.forEach(file => {
            const filePath = file.path || file.fullPath;
            const stage = this.getProcessingStage(filePath);
            stats[stage] = (stats[stage] || 0) + 1;
        });

        return stats;
    }

    /**
     * 处理通用文件（第五阶段：音频、视频、压缩包等）
     * @param {string} filePath 文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processGenericFile(filePath, options = {}) {
        try {
            const fileName = path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase();
            console.log(`🔧 开始处理通用文件: ${fileName}`);

            // 检查是否为不支持文本提取的文件类型
            const binaryTypes = [
                ...this.supportedTypes.archive,     // 压缩文件
                ...this.supportedTypes.executable,  // 可执行文件
                ...this.supportedTypes.audio,       // 音频文件
                ...this.supportedTypes.video,       // 视频文件
                ...this.supportedTypes.database,    // 数据库文件
                ...this.supportedTypes.font,        // 字体文件
                ...this.supportedTypes.plugin,      // 插件文件
                ...this.supportedTypes.debug        // 调试文件
            ];

            // 不支持处理的设计文件类型（除了PSD/PSB）
            const unsupportedDesignTypes = ['.ai', '.sketch', '.dxf', '.dwg'];

            // 检查是否为不支持的设计文件类型
            if (unsupportedDesignTypes.includes(ext)) {
                console.log(`⚠️ 跳过不支持的设计文件: ${fileName} (${ext})`);
                // 对于不支持的设计文件，直接使用基于文件名的智能重命名
                const aiResult = await this.aiRenameService.generateSmartName(
                    fileName,
                    '', // 空内容
                    options.template || 'semantic',
                    {
                        ...options,
                        fileType: 'design',
                        hasContent: false,
                        isUnsupportedDesignFile: true
                    }
                );

                const result = {
                    success: true,
                    originalName: fileName,
                    suggestedName: aiResult.suggestedName,
                    content: '',
                    metadata: {
                        fileType: 'design',
                        isUnsupportedDesignFile: true,
                        processingStage: 'stage5',
                        aiModel: aiResult.model,
                        confidence: aiResult.confidence || 0.3
                    },
                    stage: 'stage5'
                };

                return result;
            }

            // 特殊处理 PSD 文件
            if (this.psdService.isPSDFile(filePath)) {
                console.log(`🎨 处理PSD文件: ${fileName}`);
                const psdResult = await this.psdService.processPSD(filePath, options);

                if (psdResult.success && psdResult.content) {
                    // PSD 转换成功，使用提取的内容进行 AI 重命名
                    const aiResult = await this.aiRenameService.generateSmartName(
                        fileName,
                        psdResult.content,
                        options.template || 'semantic',
                        {
                            ...options,
                            fileType: 'design',
                            hasContent: true,
                            isPSDFile: true,
                            ocrConfidence: psdResult.metadata.ocrConfidence
                        }
                    );

                    const result = {
                        success: true,
                        originalName: fileName,
                        suggestedName: aiResult.suggestedName,
                        content: psdResult.content,
                        metadata: {
                            ...psdResult.metadata,
                            fileType: 'design',
                            processingStage: 'stage5',
                            aiModel: aiResult.model,
                            confidence: aiResult.confidence || 0.7
                        },
                        stage: 'stage5'
                    };

                    return result;
                } else {
                    // PSD 处理失败，使用文件名进行重命名
                    console.log(`⚠️ PSD处理失败，使用文件名重命名: ${fileName}`);
                }
            }

            if (binaryTypes.includes(ext)) {
                console.log(`⚠️ 跳过二进制文件: ${fileName} (${ext})`);
                // 对于二进制文件，直接使用基于文件名的智能重命名
                const aiResult = await this.aiRenameService.generateSmartName(
                    fileName,
                    '', // 空内容
                    options.template || 'semantic',
                    {
                        ...options,
                        fileType: this.getFileTypeFromExtension(ext),
                        hasContent: false,
                        isBinaryFile: true
                    }
                );

                return {
                    success: true,
                    originalName: fileName,
                    suggestedName: aiResult.suggestedName,
                    content: '',
                    metadata: {
                        fileType: this.getFileTypeFromExtension(ext),
                        isBinaryFile: true,
                        processingStage: 'stage5',
                        aiModel: aiResult.model,
                        confidence: aiResult.confidence || 0.5
                    },
                    aiResult
                };
            }

            // 对于可以文本处理的文件（如 json, txt, code 等），使用文档处理器
            const extractResult = await this.documentProcessor.processFile(filePath);

            if (!extractResult.success) {
                console.log(`⚠️ 通用文件内容提取失败: ${fileName}`);
                return {
                    success: false,
                    originalName: fileName,
                    suggestedName: fileName,
                    content: '',
                    metadata: extractResult.metadata || {},
                    error: extractResult.error || '通用文件处理失败'
                };
            }

            console.log(`✅ 通用文件内容提取成功: ${extractResult.contentLength} 字符`);

            // 使用AI生成新文件名
            const aiResult = await this.aiRenameService.generateSmartName(
                fileName,
                extractResult.content,
                options.template || 'semantic',
                {
                    ...options,
                    fileType: extractResult.fileType || 'generic'
                }
            );

            if (aiResult.success) {
                console.log(`🎯 通用文件AI重命名成功: ${fileName} -> ${aiResult.suggestedName}`);
                return {
                    success: true,
                    originalName: fileName,
                    suggestedName: aiResult.suggestedName,
                    content: extractResult.content,
                    metadata: {
                        ...extractResult.metadata,
                        aiModel: aiResult.model,
                        processingStage: 'stage5',
                        fileType: extractResult.fileType
                    },
                    confidence: aiResult.confidence || 0.8
                };
            } else {
                console.log(`⚠️ 通用文件AI重命名失败: ${fileName}`);
                return {
                    success: false,
                    originalName: fileName,
                    suggestedName: fileName,
                    content: extractResult.content,
                    metadata: extractResult.metadata,
                    error: aiResult.error || 'AI重命名失败'
                };
            }

        } catch (error) {
            console.error(`❌ 通用文件处理失败: ${path.basename(filePath)}`, error);
            return {
                success: false,
                originalName: path.basename(filePath),
                suggestedName: path.basename(filePath),
                content: '',
                metadata: { error: error.message },
                error: error.message
            };
        }
    }

    /**
     * 记录处理历史
     * @param {string} filePath 文件路径
     * @param {string} originalName 原始文件名
     * @param {string} newName 新文件名
     * @param {Object} result 处理结果
     */
    async recordProcessingHistory(filePath, originalName, newName, result) {
        try {
            const stats = await fs.stat(filePath);
            await this.renameHistoryService.recordFileProcessing({
                filePath,
                originalName,
                newName,
                fileSize: stats.size,
                fileExtension: path.extname(filePath).toLowerCase(),
                processingMethod: result.metadata?.extractionMethod || 'AI_RENAME',
                aiModel: result.metadata?.aiModel || 'unknown',
                templateType: result.metadata?.template || 'semantic',
                success: result.success
            });
        } catch (error) {
            console.warn('记录处理历史失败:', error.message);
        }
    }

    /**
     * 批量应用重命名
     * @param {Array} renameResults - 重命名结果数组
     * @returns {Object} 应用结果
     */
    async applyBatchRename(renameResults) {
        console.log(`🚀 开始批量应用重命名，共 ${renameResults.length} 个文件`);

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (const result of renameResults) {
            try {
                // 兼容前端传递的字段名：newName 或 suggestedName
                const newFileName = result.newName || result.suggestedName;

                // 跳过无效的结果
                if (!result.path || !newFileName || result.status === 'info') {
                    console.log(`⏭️ 跳过无效结果: ${result.originalName}`, {
                        hasPath: !!result.path,
                        hasNewName: !!newFileName,
                        status: result.status
                    });
                    continue;
                }

                console.log(`🔄 正在重命名: ${result.originalName} → ${newFileName}`);
                const applyResult = await this.applySingleRename(result.path, newFileName);

                if (applyResult.success) {
                    successCount++;

                    if (applyResult.unchanged) {
                        console.log(`🔄 文件名未变: ${result.originalName} (已记录到数据库)`);
                    } else {
                        console.log(`✅ 重命名成功: ${result.originalName} → ${applyResult.newName}`);
                    }

                    // 记录成功的处理到历史数据库（包括文件名未变的情况）
                    try {
                        // 使用新的文件路径（重命名后的路径）
                        const newFilePath = applyResult.newPath || path.join(path.dirname(result.path), applyResult.newName);
                        await this.recordProcessingHistory(
                            newFilePath,
                            result.originalName,
                            applyResult.newName,
                            {
                                success: true,
                                unchanged: applyResult.unchanged || false,
                                metadata: result.metadata || {}
                            }
                        );
                    } catch (historyError) {
                        console.warn('记录重命名历史失败:', historyError.message);
                    }
                } else {
                    failureCount++;
                    console.error(`❌ 重命名失败: ${result.originalName} - ${applyResult.error}`);
                }

                results.push({
                    originalName: result.originalName,
                    suggestedName: newFileName,
                    ...applyResult
                });

            } catch (error) {
                failureCount++;
                console.error(`❌ 重命名异常: ${result.originalName}`, error);

                results.push({
                    originalName: result.originalName,
                    suggestedName: newFileName,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log(`📊 批量重命名完成: 成功 ${successCount}, 失败 ${failureCount}`);

        return {
            success: successCount > 0,
            totalFiles: renameResults.length,
            successCount,
            failureCount,
            results,
            message: `批量重命名完成: 成功 ${successCount}, 失败 ${failureCount}`
        };
    }

    /**
     * 应用单个文件重命名
     * @param {string} oldPath - 原文件路径
     * @param {string} suggestedName - 建议的新文件名
     * @returns {Object} 重命名结果
     */
    async applySingleRename(oldPath, suggestedName) {
        try {
            const dir = path.dirname(oldPath);
            const extension = path.extname(oldPath);
            const newName = suggestedName.endsWith(extension) ? suggestedName : suggestedName + extension;
            const newPath = path.join(dir, newName);
            const oldName = path.basename(oldPath);

            // 检查原文件是否存在
            try {
                await fs.access(oldPath);
            } catch (error) {
                return {
                    success: false,
                    error: '原文件不存在'
                };
            }

            // 检查新文件名是否与原文件名相同
            if (oldName === newName) {
                console.log(`🔄 文件名未变: ${oldName} (无需重命名)`);
                return {
                    success: true,
                    oldPath,
                    newPath: oldPath, // 路径保持不变
                    oldName,
                    newName,
                    unchanged: true // 标记为未变更
                };
            }

            // 检查新文件名是否已存在（排除原文件本身）
            try {
                await fs.access(newPath);
                // 如果新路径存在且不是原文件，则报错
                if (path.resolve(oldPath) !== path.resolve(newPath)) {
                    return {
                        success: false,
                        error: `目标文件已存在: ${newName}`
                    };
                }
            } catch {
                // 文件不存在，可以重命名
            }

            // 执行重命名
            await fs.rename(oldPath, newPath);

            return {
                success: true,
                oldPath,
                newPath,
                oldName,
                newName
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 根据文件扩展名获取文件类型
     * @param {string} ext 文件扩展名
     * @returns {string} 文件类型
     */
    getFileTypeFromExtension(ext) {
        if (this.supportedTypes.documents.includes(ext)) return 'document';
        if (this.supportedTypes.images.includes(ext)) return 'image';
        if (this.supportedTypes.pdfs.includes(ext)) return 'pdf';
        if (this.supportedTypes.audio.includes(ext)) return 'audio';
        if (this.supportedTypes.video.includes(ext)) return 'video';
        if (this.supportedTypes.archive.includes(ext)) return 'archive';
        if (this.supportedTypes.code.includes(ext)) return 'code';
        if (this.supportedTypes.design.includes(ext)) return 'design';
        if (this.supportedTypes.database.includes(ext)) return 'database';
        if (this.supportedTypes.log.includes(ext)) return 'log';
        if (this.supportedTypes.font.includes(ext)) return 'font';
        if (this.supportedTypes.plugin.includes(ext)) return 'plugin';
        if (this.supportedTypes.debug.includes(ext)) return 'debug';
        if (this.supportedTypes.executable.includes(ext)) return 'executable';
        return 'unknown';
    }

    /**
     * 获取Ai 重命名统计信息
     * @returns {Object} 统计信息
     */
    async getStats() {
        return {
            totalProcessed: 0,
            lastProcessed: null,
            supportedTypes: this.supportedTypes,
            currentStage: 'stage6'
        };
    }
}

module.exports = RenameService;
