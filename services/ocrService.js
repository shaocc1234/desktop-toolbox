const fs = require('fs').promises;
const path = require('path');

/**
 * OCR服务 - 使用Scribe.js进行图片文字识别
 */
class OCRService {
    constructor() {
        this.initialized = false;
        this.supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        this.scribe = null; // 延迟加载
    }

    /**
     * 初始化OCR引擎
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('🔍 初始化OCR引擎...');

            // 动态导入 scribe.js-ocr
            if (!this.scribe) {
                this.scribe = await import('scribe.js-ocr');
                // 获取默认导出
                this.scribe = this.scribe.default || this.scribe;
            }

            // Scribe.js 不需要显式初始化，直接使用即可
            this.initialized = true;
            console.log('✅ OCR引擎初始化成功');
        } catch (error) {
            console.error('❌ OCR引擎初始化失败:', error);
            throw error;
        }
    }

    /**
     * 检查文件是否支持OCR
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否支持OCR
     */
    isImageFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * 对图片进行OCR识别
     * @param {string} imagePath 图片文件路径
     * @param {Object} options OCR选项
     * @returns {Promise<Object>} OCR结果
     */
    async recognizeText(imagePath, options = {}) {
        let tempFilePath = null;

        try {
            // 确保OCR引擎已初始化
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`🔍 开始OCR识别: ${path.basename(imagePath)}`);

            // 检查文件是否存在
            const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error(`文件不存在: ${imagePath}`);
            }

            // 检查文件格式
            if (!this.isImageFile(imagePath)) {
                throw new Error(`不支持的图片格式: ${path.extname(imagePath)}`);
            }

            // 处理文件路径，如果是GIF格式则转换为PNG
            let processedImagePath = imagePath;
            const fileExt = path.extname(imagePath).toLowerCase();

            if (fileExt === '.gif') {
                console.log('🔄 检测到GIF格式，转换为PNG...');
                tempFilePath = path.join('/tmp', `ocr_temp_${Date.now()}.png`);

                // 使用sips转换GIF为PNG
                const { spawn } = require('child_process');
                await new Promise((resolve, reject) => {
                    const sips = spawn('sips', ['-s', 'format', 'png', imagePath, '--out', tempFilePath]);
                    sips.on('close', (code) => {
                        if (code === 0) {
                            console.log('✅ GIF转PNG成功');
                            resolve();
                        } else {
                            reject(new Error(`GIF转换失败，退出码: ${code}`));
                        }
                    });
                    sips.on('error', reject);
                });

                processedImagePath = tempFilePath;
            }

            // 执行OCR识别
            const { result, processingTime } = await this.executeOCR(processedImagePath);

            // 处理识别结果
            // Scribe.js extractText 返回文本数组，取第一个结果
            const extractedText = Array.isArray(result) ? result[0] : (result.text || result || '');

            const ocrResult = {
                success: true,
                filePath: imagePath,
                fileName: path.basename(imagePath),
                text: extractedText || '',
                confidence: extractedText ? 0.8 : 0, // Scribe.js 不提供置信度，估算
                processingTime,
                wordCount: extractedText ? extractedText.trim().split(/\s+/).length : 0,
                hasText: !!(extractedText && extractedText.trim().length > 0),
                metadata: {
                    imageSize: await this.getImageSize(imagePath),
                    recognizedAt: new Date().toISOString(),
                    languages: ['chi_sim', 'eng'],
                    psm: options.psm || '3'
                }
            };

            console.log(`✅ OCR识别完成: ${ocrResult.fileName}`);
            console.log(`   - 识别文字: ${ocrResult.wordCount} 个词`);
            console.log(`   - 置信度: ${(ocrResult.confidence * 100).toFixed(1)}%`);
            console.log(`   - 处理时间: ${processingTime}ms`);

            return ocrResult;

        } catch (error) {
            console.error(`❌ OCR识别失败: ${path.basename(imagePath)}`, error);
            return {
                success: false,
                filePath: imagePath,
                fileName: path.basename(imagePath),
                text: '',
                confidence: 0,
                processingTime: 0,
                wordCount: 0,
                hasText: false,
                error: error.message,
                metadata: {
                    recognizedAt: new Date().toISOString(),
                    errorType: error.name || 'OCRError'
                }
            };
        } finally {
            // 清理临时文件
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath);
                    console.log('🧹 临时文件已清理');
                } catch (cleanupError) {
                    console.warn('⚠️ 临时文件清理失败:', cleanupError.message);
                }
            }
        }
    }

    /**
     * 执行OCR识别（过滤Tesseract警告信息）
     * @param {string} imagePath 图片路径
     * @returns {Promise<Object>} OCR结果和处理时间
     */
    async executeOCR(imagePath) {
        const startTime = Date.now();

        // 捕获并过滤 Tesseract 的警告信息
        const originalStderr = process.stderr.write;
        const originalStdout = process.stdout.write;

        // 临时重定向 stderr 和 stdout 来过滤 Tesseract 警告
        process.stderr.write = function(chunk, encoding, callback) {
            const message = chunk.toString();
            // 过滤掉 Tesseract 的警告信息
            if (!message.includes('Detected') &&
                !message.includes('Estimating resolution') &&
                !message.includes('diacritics')) {
                return originalStderr.call(this, chunk, encoding, callback);
            }
            if (callback) callback();
            return true;
        };

        process.stdout.write = function(chunk, encoding, callback) {
            const message = chunk.toString();
            // 过滤掉 Tesseract 的信息输出
            if (!message.includes('Detected') &&
                !message.includes('Estimating resolution') &&
                !message.includes('diacritics')) {
                return originalStdout.call(this, chunk, encoding, callback);
            }
            if (callback) callback();
            return true;
        };

        try {
            // Scribe.js extractText 只接受文件路径数组，不接受选项参数
            const result = await this.scribe.extractText([imagePath]);

            // 恢复原始的 stderr 和 stdout
            process.stderr.write = originalStderr;
            process.stdout.write = originalStdout;

            const processingTime = Date.now() - startTime;
            return { result, processingTime };
        } catch (error) {
            // 恢复原始的 stderr 和 stdout
            process.stderr.write = originalStderr;
            process.stdout.write = originalStdout;
            const processingTime = Date.now() - startTime;
            throw { error, processingTime };
        }
    }

    /**
     * 批量OCR识别
     * @param {Array<string>} imagePaths 图片文件路径数组
     * @param {Object} options OCR选项
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array<Object>>} OCR结果数组
     */
    async recognizeTextBatch(imagePaths, options = {}, progressCallback = null) {
        const results = [];
        const total = imagePaths.length;

        console.log(`🔍 开始批量OCR识别: ${total} 个文件`);

        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            const progress = ((i + 1) / total) * 100;

            if (progressCallback) {
                progressCallback(progress, `正在识别: ${path.basename(imagePath)}`);
            }

            const result = await this.recognizeText(imagePath, options);
            results.push(result);

            // 短暂延迟，避免过度占用资源
            if (i < imagePaths.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量OCR识别完成: ${successCount}/${total} 成功`);

        return results;
    }

    /**
     * 获取图片尺寸信息
     * @param {string} imagePath 图片路径
     * @returns {Promise<Object>} 图片尺寸信息
     */
    async getImageSize(imagePath) {
        try {
            const stats = await fs.stat(imagePath);
            return {
                fileSize: stats.size,
                fileSizeFormatted: this.formatFileSize(stats.size)
            };
        } catch (error) {
            return {
                fileSize: 0,
                fileSizeFormatted: '未知'
            };
        }
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string} 格式化后的文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 清理OCR引擎资源
     */
    async cleanup() {
        try {
            if (this.initialized && this.scribe) {
                await this.scribe.terminate();
                this.initialized = false;
                console.log('🧹 OCR引擎资源已清理');
            }
        } catch (error) {
            console.error('清理OCR引擎资源失败:', error);
        }
    }

    /**
     * 获取支持的图片格式
     * @returns {Array<string>} 支持的文件扩展名数组
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * 检查OCR引擎状态
     * @returns {Object} 引擎状态信息
     */
    getStatus() {
        return {
            initialized: this.initialized,
            supportedFormats: this.supportedFormats,
            version: this.scribe ? 'loaded' : 'not loaded'
        };
    }
}

module.exports = OCRService;
