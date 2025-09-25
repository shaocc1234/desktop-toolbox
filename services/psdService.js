const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * PSD文件处理服务
 * 将PSD文件转换为图片后进行OCR识别
 */
class PSDService {
    constructor(ocrService) {
        this.ocrService = ocrService;
        this.supportedFormats = ['.psd', '.psb'];
        this.tempDir = path.join(__dirname, '../temp');
    }

    /**
     * 检查是否为PSD文件
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否为PSD文件
     */
    isPSDFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * 创建临时目录
     * @returns {Promise<string>} 临时目录路径
     */
    async createTempDirectory() {
        const tempDirPath = path.join(this.tempDir, `psd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        await fs.mkdir(tempDirPath, { recursive: true });
        return tempDirPath;
    }

    /**
     * 将PSD文件转换为PNG图片
     * @param {string} psdPath PSD文件路径
     * @param {string} outputDir 输出目录
     * @returns {Promise<string>} 转换后的PNG文件路径
     */
    async convertPSDToPNG(psdPath, outputDir) {
        const fileName = path.basename(psdPath, path.extname(psdPath));
        const outputPath = path.join(outputDir, `${fileName}.png`);

        try {
            console.log(`🎨 开始转换PSD文件: ${path.basename(psdPath)}`);

            // 使用sips命令转换PSD为PNG (macOS)
            const { spawn } = require('child_process');
            
            await new Promise((resolve, reject) => {
                const sips = spawn('sips', [
                    '-s', 'format', 'png',
                    '--resampleWidth', '1200', // 限制宽度以提高处理速度
                    psdPath,
                    '--out', outputPath
                ]);

                let stderr = '';
                sips.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                sips.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ PSD转PNG成功: ${path.basename(outputPath)}`);
                        resolve();
                    } else {
                        reject(new Error(`PSD转换失败，退出码: ${code}, 错误: ${stderr}`));
                    }
                });

                sips.on('error', (error) => {
                    reject(new Error(`PSD转换进程错误: ${error.message}`));
                });
            });

            // 验证输出文件是否存在
            const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error('PSD转换完成但输出文件不存在');
            }

            return outputPath;

        } catch (error) {
            console.error(`❌ PSD转换失败: ${path.basename(psdPath)}`, error);
            throw error;
        }
    }

    /**
     * 处理PSD文件
     * @param {string} psdPath PSD文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processPSD(psdPath, options = {}) {
        let tempDir = null;
        let pngPath = null;

        try {
            console.log(`🎨 开始处理PSD文件: ${path.basename(psdPath)}`);

            // 1. 创建临时目录
            tempDir = await this.createTempDirectory();

            // 2. 将PSD转换为PNG
            pngPath = await this.convertPSDToPNG(psdPath, tempDir);

            // 3. 对转换后的PNG进行OCR识别
            console.log(`🔍 开始OCR识别转换后的图片...`);
            const ocrResult = await this.ocrService.recognizeText(pngPath, options.ocrOptions || {});

            // 4. 构建处理结果
            const result = {
                success: true,
                filePath: psdPath,
                fileName: path.basename(psdPath),
                convertedImagePath: pngPath,
                ocrResult,
                content: ocrResult.text || '',
                metadata: {
                    originalFormat: path.extname(psdPath).toLowerCase(),
                    convertedFormat: '.png',
                    hasText: ocrResult.hasText || false,
                    ocrConfidence: ocrResult.confidence || 0,
                    wordCount: ocrResult.wordCount || 0,
                    processingTime: ocrResult.processingTime || 0,
                    processedAt: new Date().toISOString(),
                    extractionMethod: 'PSD_TO_PNG_OCR'
                }
            };

            console.log(`✅ PSD处理完成: ${path.basename(psdPath)}`);
            console.log(`   - 转换成功: ${result.metadata.convertedFormat}`);
            console.log(`   - OCR识别: ${result.metadata.hasText ? '成功' : '无文字'}`);
            console.log(`   - 识别文字: ${result.metadata.wordCount} 个词`);

            return result;

        } catch (error) {
            console.error(`❌ PSD处理失败: ${path.basename(psdPath)}`, error);
            return {
                success: false,
                filePath: psdPath,
                fileName: path.basename(psdPath),
                content: '',
                error: error.message,
                metadata: {
                    originalFormat: path.extname(psdPath).toLowerCase(),
                    processedAt: new Date().toISOString(),
                    extractionMethod: 'PSD_TO_PNG_OCR',
                    errorType: error.name || 'PSDProcessingError'
                }
            };
        } finally {
            // 清理临时文件
            if (tempDir) {
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                    console.log(`🧹 清理PSD临时目录: ${tempDir}`);
                } catch (cleanupError) {
                    console.warn(`⚠️ PSD临时目录清理失败: ${cleanupError.message}`);
                }
            }
        }
    }

    /**
     * 批量处理PSD文件
     * @param {Array<string>} psdPaths PSD文件路径数组
     * @param {Object} options 处理选项
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array<Object>>} 处理结果数组
     */
    async processPSDBatch(psdPaths, options = {}, progressCallback = null) {
        const results = [];
        const total = psdPaths.length;

        console.log(`🎨 开始批量处理PSD文件: ${total} 个文件`);

        for (let i = 0; i < psdPaths.length; i++) {
            const psdPath = psdPaths[i];
            const progress = ((i + 1) / total) * 100;

            if (progressCallback) {
                progressCallback(progress, `正在处理: ${path.basename(psdPath)}`);
            }

            const result = await this.processPSD(psdPath, options);
            results.push(result);

            // 短暂延迟，避免过度占用资源
            if (i < psdPaths.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量PSD处理完成: ${successCount}/${total} 成功`);

        return results;
    }

    /**
     * 获取支持的PSD格式
     * @returns {Array<string>} 支持的文件扩展名数组
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * 检查系统是否支持PSD转换
     * @returns {Promise<boolean>} 是否支持PSD转换
     */
    async checkSystemSupport() {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve) => {
                const sips = spawn('sips', ['--help']);
                sips.on('close', (code) => {
                    resolve(code === 0);
                });
                sips.on('error', () => {
                    resolve(false);
                });
            });
        } catch (error) {
            return false;
        }
    }
}

module.exports = PSDService;
