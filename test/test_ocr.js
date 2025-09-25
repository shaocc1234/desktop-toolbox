const fs = require('fs').promises;
const path = require('path');
const OCRService = require('./services/ocrService');

/**
 * OCR测试脚本
 * 专门测试指定图片文件的OCR文字识别功能
 */
class OCRTest {
    constructor() {
        this.ocrService = new OCRService();
    }

    /**
     * 测试OCR识别
     * @param {string} imagePath 图片路径
     */
    async testOCR(imagePath) {
        try {
            console.log('🔍 ===== OCR文字识别测试 =====');
            console.log(`📁 测试图片: ${imagePath}`);
            console.log('');

            // 检查文件是否存在
            const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error(`图片文件不存在: ${imagePath}`);
            }

            const fileName = path.basename(imagePath);
            const fileExt = path.extname(imagePath).toLowerCase();
            const startTime = Date.now();

            console.log('📋 文件信息:');
            console.log(`   - 文件名: ${fileName}`);
            console.log(`   - 格式: ${fileExt.toUpperCase()}`);
            
            // 获取文件大小
            try {
                const stats = await fs.stat(imagePath);
                console.log(`   - 大小: ${this.formatFileSize(stats.size)}`);
            } catch (error) {
                console.log(`   - 大小: 无法获取`);
            }

            console.log('');
            console.log('🔍 开始OCR识别...');

            // 执行OCR识别
            const ocrResult = await this.ocrService.recognizeText(imagePath);

            const processingTime = Date.now() - startTime;

            console.log('');
            console.log('📊 ===== OCR识别结果 =====');
            
            if (ocrResult.success) {
                console.log(`✅ OCR识别成功!`);
                console.log(`📝 识别文字: ${ocrResult.text || '(无文字内容)'}`);
                console.log(`📏 文字长度: ${ocrResult.text ? ocrResult.text.length : 0} 字符`);
                console.log(`⏱️ 处理时间: ${processingTime}ms`);
                console.log(`🔧 识别方法: ${ocrResult.method || 'OCR引擎'}`);
                
                if (ocrResult.confidence) {
                    console.log(`🎯 置信度: ${ocrResult.confidence}`);
                }

                // 显示详细的文字内容
                if (ocrResult.text && ocrResult.text.trim().length > 0) {
                    console.log('');
                    console.log('📄 ===== 识别文字详情 =====');
                    const lines = ocrResult.text.split('\n').filter(line => line.trim().length > 0);
                    lines.forEach((line, index) => {
                        console.log(`${index + 1}. ${line.trim()}`);
                    });

                    // 文字统计
                    console.log('');
                    console.log('📈 ===== 文字统计 =====');
                    console.log(`   - 总行数: ${lines.length}`);
                    console.log(`   - 总字符数: ${ocrResult.text.length}`);
                    console.log(`   - 有效字符数: ${ocrResult.text.replace(/\s/g, '').length}`);
                    
                    // 检测语言
                    const hasChineseChars = /[\u4e00-\u9fa5]/.test(ocrResult.text);
                    const hasEnglishChars = /[a-zA-Z]/.test(ocrResult.text);
                    const hasNumbers = /\d/.test(ocrResult.text);
                    
                    const languages = [];
                    if (hasChineseChars) languages.push('中文');
                    if (hasEnglishChars) languages.push('英文');
                    if (hasNumbers) languages.push('数字');
                    
                    console.log(`   - 检测语言: ${languages.join(', ') || '未知'}`);
                }
            } else {
                console.log(`❌ OCR识别失败: ${ocrResult.error || '未知错误'}`);
                console.log(`⏱️ 处理时间: ${processingTime}ms`);
            }

            console.log('');
            console.log('🔧 ===== 技术详情 =====');
            console.log(`📊 支持格式: ${this.getSupportedFormats().join(', ')}`);
            console.log(`🖼️ 当前格式: ${fileExt.toUpperCase()} ${this.isFormatSupported(fileExt) ? '✅ 支持' : '❌ 不支持'}`);
            console.log(`🔍 OCR引擎: Scribe.js`);
            console.log(`🌐 识别语言: 中文简体 + 英文`);

            return ocrResult;

        } catch (error) {
            console.error('❌ OCR测试失败:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量测试多个图片
     * @param {Array<string>} imagePaths 图片路径数组
     */
    async testBatchOCR(imagePaths) {
        console.log('🚀 ===== 批量OCR测试 =====');
        console.log(`📁 测试图片数量: ${imagePaths.length}`);
        console.log('');

        const results = [];

        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            console.log(`\n🔄 测试图片 ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);
            console.log('─'.repeat(60));
            
            const result = await this.testOCR(imagePath);
            results.push({
                imagePath,
                result
            });

            // 图片间间隔，避免资源冲突
            if (i < imagePaths.length - 1) {
                console.log('⏳ 等待1秒后处理下一张图片...');
                await this.sleep(1000);
            }
        }

        // 输出批量结果总结
        console.log('\n📊 ===== 批量测试总结 =====');
        let successCount = 0;
        let totalChars = 0;

        results.forEach((item, index) => {
            const fileName = path.basename(item.imagePath);
            console.log(`\n${index + 1}. ${fileName}`);
            if (item.result.success) {
                successCount++;
                const charCount = item.result.text ? item.result.text.length : 0;
                totalChars += charCount;
                console.log(`   ✅ 成功 - ${charCount} 字符`);
                if (item.result.text && item.result.text.length > 0) {
                    const preview = item.result.text.substring(0, 50);
                    console.log(`   📝 预览: ${preview}${item.result.text.length > 50 ? '...' : ''}`);
                }
            } else {
                console.log(`   ❌ 失败: ${item.result.error}`);
            }
        });

        console.log(`\n📈 总体统计:`);
        console.log(`   - 成功率: ${successCount}/${imagePaths.length} (${Math.round(successCount/imagePaths.length*100)}%)`);
        console.log(`   - 总字符数: ${totalChars}`);
        console.log(`   - 平均字符数: ${Math.round(totalChars/successCount) || 0}`);

        return results;
    }

    /**
     * 获取支持的图片格式
     * @returns {Array<string>} 支持的格式列表
     */
    getSupportedFormats() {
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.heic', '.heif'];
    }

    /**
     * 检查格式是否支持
     * @param {string} ext 文件扩展名
     * @returns {boolean} 是否支持
     */
    isFormatSupported(ext) {
        return this.getSupportedFormats().includes(ext.toLowerCase());
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string} 格式化后的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 延迟函数
     * @param {number} ms 毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            if (this.ocrService) {
                await this.ocrService.cleanup();
            }
            console.log('🧹 资源清理完成');
        } catch (error) {
            console.warn('⚠️ 资源清理失败:', error.message);
        }
    }
}

/**
 * 主函数
 */
async function main() {
    const tester = new OCRTest();
    
    try {
        // 测试图片路径
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/图片_002_03.gif';
        
        console.log('🎯 开始OCR文字识别测试...\n');
        
        // 检查命令行参数
        const args = process.argv.slice(2);
        const testMode = args[0] || 'single'; // single 或 batch
        
        if (testMode === 'batch') {
            // 批量测试（可以添加更多图片路径）
            const imagePaths = [
                imagePath,
                // 可以添加更多测试图片
            ];
            await tester.testBatchOCR(imagePaths);
        } else {
            // 单图片测试
            const customPath = args[1] || imagePath;
            await tester.testOCR(customPath);
        }
        
    } catch (error) {
        console.error('💥 测试过程中发生错误:', error);
    } finally {
        // 清理资源
        await tester.cleanup();
        console.log('\n🏁 OCR测试完成!');
    }
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = OCRTest;
