const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const pdf2pic = require('pdf2pic');
const OCRService = require('./ocrService');

/**
 * PDF处理服务 - 第四阶段：PDF文档处理
 * 支持PDF文本提取、页面转图片、OCR识别等功能
 */
class PDFService {
    constructor() {
        this.ocrService = new OCRService();
        this.supportedFormats = ['.pdf'];
        
        // PDF转图片配置
        this.pdf2picOptions = {
            density: 200,           // 输出图片DPI
            saveFilename: "page",   // 输出文件名前缀
            savePath: "./temp/pdf_pages", // 临时保存路径
            format: "png",          // 输出格式
            width: 1200,           // 图片宽度
            height: 1600           // 图片高度
        };
    }

    /**
     * 检查文件是否为PDF
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否为PDF文件
     */
    isPdfFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * 处理PDF文档
     * @param {string} pdfPath PDF文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processPdf(pdfPath, options = {}) {
        try {
            console.log(`🔍 开始处理PDF: ${path.basename(pdfPath)}`);

            // 检查文件是否存在
            const fileExists = await fs.access(pdfPath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error(`PDF文件不存在: ${pdfPath}`);
            }

            // 检查文件格式
            if (!this.isPdfFile(pdfPath)) {
                throw new Error(`不支持的文件格式: ${path.extname(pdfPath)}`);
            }

            const startTime = Date.now();
            const results = {
                success: true,
                filePath: pdfPath,
                fileName: path.basename(pdfPath),
                textContent: '',
                ocrContent: '',
                combinedContent: '',
                pageCount: 0,
                processingTime: 0,
                metadata: {
                    hasText: false,
                    hasImages: false,
                    extractionMethods: [],
                    processedAt: new Date().toISOString()
                }
            };

            // 1. 尝试直接提取PDF文本
            console.log('📄 提取PDF文本内容...');
            const textResult = await this.extractTextFromPdf(pdfPath);
            
            if (textResult.success && textResult.text.trim().length > 0) {
                results.textContent = textResult.text;
                results.pageCount = textResult.pageCount || 1;
                results.metadata.hasText = true;
                results.metadata.extractionMethods.push('direct_text');
                console.log(`✅ 直接文本提取成功: ${textResult.text.length} 字符`);
            } else {
                console.log('⚠️ 直接文本提取失败或无文本内容');
            }

            // 2. 如果文本内容不足，尝试OCR识别
            const shouldUseOCR = options.forceOCR || 
                                !results.metadata.hasText || 
                                results.textContent.length < 100;

            if (shouldUseOCR) {
                console.log('🔍 开始PDF页面OCR识别...');
                const ocrResult = await this.extractTextWithOCR(pdfPath, options);
                
                if (ocrResult.success && ocrResult.text.trim().length > 0) {
                    results.ocrContent = ocrResult.text;
                    results.metadata.hasImages = true;
                    results.metadata.extractionMethods.push('ocr');
                    console.log(`✅ OCR识别成功: ${ocrResult.text.length} 字符`);
                } else {
                    console.log('⚠️ OCR识别失败或无内容');
                }
            }

            // 3. 合并文本内容
            const textParts = [results.textContent, results.ocrContent].filter(text => text.trim().length > 0);
            results.combinedContent = textParts.join('\n\n').trim();

            // 4. 生成处理摘要
            results.processingTime = Date.now() - startTime;
            results.metadata.totalCharacters = results.combinedContent.length;
            results.metadata.wordCount = results.combinedContent.split(/\s+/).filter(word => word.length > 0).length;

            console.log(`✅ PDF处理完成: ${results.fileName}`);
            console.log(`   - 页数: ${results.pageCount}`);
            console.log(`   - 文字: ${results.metadata.totalCharacters} 字符`);
            console.log(`   - 方法: ${results.metadata.extractionMethods.join(', ')}`);
            console.log(`   - 耗时: ${results.processingTime}ms`);

            return results;

        } catch (error) {
            console.error(`❌ PDF处理失败: ${path.basename(pdfPath)}`, error);
            return {
                success: false,
                filePath: pdfPath,
                fileName: path.basename(pdfPath),
                textContent: '',
                ocrContent: '',
                combinedContent: '',
                pageCount: 0,
                processingTime: 0,
                error: error.message,
                metadata: {
                    hasText: false,
                    hasImages: false,
                    extractionMethods: [],
                    processedAt: new Date().toISOString(),
                    errorType: error.name || 'PDFProcessingError'
                }
            };
        }
    }

    /**
     * 直接从PDF提取文本
     * @param {string} pdfPath PDF文件路径
     * @returns {Promise<Object>} 提取结果
     */
    async extractTextFromPdf(pdfPath) {
        try {
            const dataBuffer = await fs.readFile(pdfPath);
            const pdfData = await pdfParse(dataBuffer);

            return {
                success: true,
                text: pdfData.text || '',
                pageCount: pdfData.numpages || 0,
                metadata: {
                    info: pdfData.info || {},
                    version: pdfData.version || 'unknown'
                }
            };
        } catch (error) {
            console.error('PDF文本提取失败:', error);
            return {
                success: false,
                text: '',
                pageCount: 0,
                error: error.message
            };
        }
    }

    /**
     * 使用OCR从PDF提取文本
     * @param {string} pdfPath PDF文件路径
     * @param {Object} options OCR选项
     * @returns {Promise<Object>} OCR结果
     */
    async extractTextWithOCR(pdfPath, options = {}) {
        let tempDir = null;
        
        try {
            // 1. 创建临时目录
            tempDir = await this.createTempDirectory();
            
            // 2. 将PDF页面转换为图片
            console.log('📸 转换PDF页面为图片...');
            const imageFiles = await this.convertPdfToImages(pdfPath, tempDir, options);
            
            if (imageFiles.length === 0) {
                throw new Error('PDF页面转换失败，无法生成图片');
            }

            console.log(`📸 成功转换 ${imageFiles.length} 页为图片`);

            // 3. 对每页图片进行OCR识别
            console.log('🔍 开始OCR识别各页面...');
            const ocrResults = await this.ocrService.recognizeTextBatch(
                imageFiles, 
                options.ocrOptions || {},
                (progress, message) => {
                    console.log(`OCR进度: ${progress.toFixed(1)}% - ${message}`);
                }
            );

            // 4. 合并所有页面的OCR结果
            const successfulResults = ocrResults.filter(result => result.success && result.hasText);
            const combinedText = successfulResults
                .map(result => result.text.trim())
                .filter(text => text.length > 0)
                .join('\n\n');

            console.log(`✅ OCR识别完成: ${successfulResults.length}/${ocrResults.length} 页成功`);

            return {
                success: true,
                text: combinedText,
                pageCount: imageFiles.length,
                successfulPages: successfulResults.length,
                ocrResults: ocrResults,
                metadata: {
                    averageConfidence: this.calculateAverageConfidence(successfulResults),
                    totalProcessingTime: ocrResults.reduce((sum, r) => sum + (r.processingTime || 0), 0)
                }
            };

        } catch (error) {
            console.error('PDF OCR处理失败:', error);
            return {
                success: false,
                text: '',
                pageCount: 0,
                successfulPages: 0,
                error: error.message
            };
        } finally {
            // 5. 清理临时文件
            if (tempDir) {
                await this.cleanupTempDirectory(tempDir);
            }
        }
    }

    /**
     * 将PDF转换为图片
     * @param {string} pdfPath PDF文件路径
     * @param {string} outputDir 输出目录
     * @param {Object} options 转换选项
     * @returns {Promise<Array<string>>} 图片文件路径数组
     */
    async convertPdfToImages(pdfPath, outputDir, options = {}) {
        try {
            const convertOptions = {
                ...this.pdf2picOptions,
                savePath: outputDir,
                density: options.density || this.pdf2picOptions.density,
                format: options.format || this.pdf2picOptions.format
            };

            const convert = pdf2pic.fromPath(pdfPath, convertOptions);
            
            // 转换所有页面
            const maxPages = options.maxPages || 50; // 限制最大页数，避免处理过大的PDF
            const results = [];
            
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                try {
                    const result = await convert(pageNum, { responseType: "image" });
                    if (result && result.path) {
                        results.push(result.path);
                        console.log(`📄 转换第 ${pageNum} 页: ${path.basename(result.path)}`);
                    } else {
                        // 如果某页转换失败，可能已经到达最后一页
                        break;
                    }
                } catch (pageError) {
                    console.warn(`⚠️ 第 ${pageNum} 页转换失败:`, pageError.message);
                    // 如果是页面不存在的错误，停止转换
                    if (pageError.message.includes('page') || pageError.message.includes('range')) {
                        break;
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('PDF转图片失败:', error);
            throw new Error(`PDF转换失败: ${error.message}`);
        }
    }

    /**
     * 创建临时目录
     * @returns {Promise<string>} 临时目录路径
     */
    async createTempDirectory() {
        const tempDir = path.join(__dirname, '../temp', `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        await fs.mkdir(tempDir, { recursive: true });
        return tempDir;
    }

    /**
     * 清理临时目录
     * @param {string} tempDir 临时目录路径
     */
    async cleanupTempDirectory(tempDir) {
        try {
            await fs.rmdir(tempDir, { recursive: true });
            console.log(`🧹 清理临时目录: ${tempDir}`);
        } catch (error) {
            console.warn('清理临时目录失败:', error.message);
        }
    }

    /**
     * 计算平均置信度
     * @param {Array<Object>} ocrResults OCR结果数组
     * @returns {number} 平均置信度
     */
    calculateAverageConfidence(ocrResults) {
        if (ocrResults.length === 0) return 0;
        const totalConfidence = ocrResults.reduce((sum, result) => sum + (result.confidence || 0), 0);
        return totalConfidence / ocrResults.length;
    }

    /**
     * 批量处理PDF文件
     * @param {Array<string>} pdfPaths PDF文件路径数组
     * @param {Object} options 处理选项
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array<Object>>} 处理结果数组
     */
    async processPdfBatch(pdfPaths, options = {}, progressCallback = null) {
        console.log(`📚 开始批量处理PDF: ${pdfPaths.length} 个文件`);
        
        const results = [];
        for (let i = 0; i < pdfPaths.length; i++) {
            const pdfPath = pdfPaths[i];
            const progress = ((i + 1) / pdfPaths.length) * 100;

            if (progressCallback) {
                progressCallback(progress, `正在处理: ${path.basename(pdfPath)}`);
            }

            const result = await this.processPdf(pdfPath, options);
            results.push(result);

            // 短暂延迟，避免过度占用资源
            if (i < pdfPaths.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量PDF处理完成: ${successCount}/${pdfPaths.length} 成功`);

        return results;
    }

    /**
     * 获取支持的文件格式
     * @returns {Array<string>} 支持的文件扩展名数组
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * 获取服务状态
     * @returns {Object} 服务状态信息
     */
    getStatus() {
        return {
            supportedFormats: this.supportedFormats,
            ocrStatus: this.ocrService.getStatus(),
            pdf2picOptions: this.pdf2picOptions
        };
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            await this.ocrService.cleanup();
            console.log('📄 PDFService 资源已清理');
        } catch (error) {
            console.error('清理PDFService资源失败:', error);
        }
    }
}

module.exports = PDFService;
