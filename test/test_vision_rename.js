const fs = require('fs').promises;
const path = require('path');
const AIRenameService = require('./services/AIRenameService');
const OCRService = require('./services/ocrService');

/**
 * 视觉模型重命名测试脚本
 * 测试对指定图片使用视觉大模型进行智能重命名
 */
class VisionRenameTest {
    constructor() {
        // 配置API密钥
        const config = {
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug'
        };

        this.aiRenameService = new AIRenameService(config);
        this.ocrService = new OCRService();
    }

    /**
     * 测试视觉模型重命名
     * @param {string} imagePath 图片路径
     * @param {string} modelName 视觉模型名称
     */
    async testVisionRename(imagePath, modelName = 'vision:Qwen/Qwen2.5-VL-32B-Instruct') {
        try {
            console.log('🎯 ===== 视觉模型重命名测试 =====');
            console.log(`📁 测试图片: ${imagePath}`);
            console.log(`🤖 使用模型: ${modelName}`);
            console.log('');

            // 检查文件是否存在
            const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error(`图片文件不存在: ${imagePath}`);
            }

            const fileName = path.basename(imagePath);
            const startTime = Date.now();

            // 设置AI服务使用视觉模型
            this.aiRenameService.setModel(modelName);

            console.log('🔍 步骤1: OCR文字识别...');
            let ocrText = '';
            try {
                const ocrResult = await this.ocrService.recognizeText(imagePath);
                if (ocrResult.success && ocrResult.text) {
                    ocrText = ocrResult.text.trim();
                    console.log(`✅ OCR识别成功: ${ocrText.length} 字符`);
                    console.log(`📝 OCR内容预览: ${ocrText.substring(0, 100)}${ocrText.length > 100 ? '...' : ''}`);
                } else {
                    console.log('⚠️ OCR识别失败或无文字内容');
                }
            } catch (ocrError) {
                console.log(`⚠️ OCR处理失败，跳过OCR步骤: ${ocrError.message}`);
                ocrText = ''; // 设置为空，继续进行纯视觉分析
            }

            console.log('');
            console.log('🎨 步骤2: 视觉模型分析...');

            // 构建文档信息对象
            const documentInfo = {
                fileName: fileName,
                filePath: imagePath,
                content: ocrText,
                fileType: 'image'
            };

            // 调用视觉模型进行重命名
            const renameResult = await this.aiRenameService.generateNameWithVision(
                documentInfo,
                { template: 'semantic' }
            );

            const processingTime = Date.now() - startTime;

            console.log('');
            console.log('📊 ===== 测试结果 =====');
            
            if (renameResult.success) {
                console.log(`✅ 重命名成功!`);
                console.log(`📄 原文件名: ${fileName}`);
                console.log(`🎯 AI建议名称: ${renameResult.suggestedName}`);
                console.log(`🤖 使用模型: ${renameResult.model || modelName}`);
                console.log(`⏱️ 处理时间: ${processingTime}ms`);
                console.log(`🔍 置信度: ${renameResult.confidence || 'N/A'}`);
                
                if (renameResult.reasoning) {
                    console.log(`💭 AI推理过程: ${renameResult.reasoning}`);
                }
                
                if (ocrText) {
                    console.log(`📝 OCR文字: ${ocrText.substring(0, 200)}${ocrText.length > 200 ? '...' : ''}`);
                }
            } else {
                console.log(`❌ 重命名失败: ${renameResult.error}`);
            }

            console.log('');
            console.log('🔧 ===== 技术详情 =====');
            console.log(`📊 处理策略: ${ocrText ? 'OCR + 视觉分析' : '纯视觉分析'}`);
            console.log(`🖼️ 图片格式: ${path.extname(imagePath).toUpperCase()}`);
            
            // 获取文件大小
            try {
                const stats = await fs.stat(imagePath);
                console.log(`📏 文件大小: ${this.formatFileSize(stats.size)}`);
            } catch (error) {
                console.log(`📏 文件大小: 无法获取`);
            }

            return renameResult;

        } catch (error) {
            console.error('❌ 测试失败:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量测试多个视觉模型
     * @param {string} imagePath 图片路径
     */
    async testMultipleModels(imagePath) {
        const visionModels = [
            'vision:Qwen/Qwen2.5-VL-32B-Instruct',
            'vision:THUDM/GLM-4.1V-9B-Thinking',
            'vision:Pro/Qwen/Qwen2.5-VL-7B-Instruct'
        ];

        console.log('🚀 ===== 多模型对比测试 =====');
        console.log(`📁 测试图片: ${imagePath}`);
        console.log(`🤖 测试模型数量: ${visionModels.length}`);
        console.log('');

        const results = [];

        for (let i = 0; i < visionModels.length; i++) {
            const model = visionModels[i];
            console.log(`\n🔄 测试模型 ${i + 1}/${visionModels.length}: ${model}`);
            console.log('─'.repeat(60));
            
            const result = await this.testVisionRename(imagePath, model);
            results.push({
                model,
                result
            });

            // 模型间间隔，避免API限制
            if (i < visionModels.length - 1) {
                console.log('⏳ 等待2秒后测试下一个模型...');
                await this.sleep(2000);
            }
        }

        // 输出对比结果
        console.log('\n📊 ===== 模型对比结果 =====');
        results.forEach((item, index) => {
            console.log(`\n${index + 1}. ${item.model}`);
            if (item.result.success) {
                console.log(`   ✅ 建议名称: ${item.result.suggestedName}`);
            } else {
                console.log(`   ❌ 失败: ${item.result.error}`);
            }
        });

        return results;
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
    const tester = new VisionRenameTest();
    
    try {
        // 测试图片路径
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png';
        
        console.log('🎯 开始视觉模型重命名测试...\n');
        
        // 检查命令行参数
        const args = process.argv.slice(2);
        const testMode = args[0] || 'single'; // single 或 multiple
        
        if (testMode === 'multiple') {
            // 多模型对比测试
            await tester.testMultipleModels(imagePath);
        } else {
            // 单模型测试
            const modelName = args[1] || 'vision:Qwen/Qwen2.5-VL-32B-Instruct';
            await tester.testVisionRename(imagePath, modelName);
        }
        
    } catch (error) {
        console.error('💥 测试过程中发生错误:', error);
    } finally {
        // 清理资源
        await tester.cleanup();
        console.log('\n🏁 测试完成!');
    }
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = VisionRenameTest;
