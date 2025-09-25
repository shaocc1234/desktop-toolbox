#!/usr/bin/env node

/**
 * 第六阶段功能测试脚本
 * 测试新的AI重命名策略和性能优化功能
 */

const AIRenameService = require('./services/AIRenameService');
const OCRService = require('./services/ocrService');
const path = require('path');

class Stage6Tester {
    constructor() {
        this.apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
        this.aiService = new AIRenameService({ apiKey: this.apiKey });
        this.ocrService = new OCRService();
    }

    /**
     * 测试图片文件的智能模型选择
     */
    async testImageFileProcessing() {
        console.log('\n🖼️ ===== 测试图片文件处理 =====');
        
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png';
        
        try {
            // 测试1：OCR + 视觉模型组合方案
            console.log('\n📋 测试1：OCR + 视觉模型组合方案');
            const documentInfo1 = {
                fileName: path.basename(imagePath),
                filePath: imagePath,
                fileType: 'image',
                content: '', // 将通过OCR获取
                metadata: {}
            };

            const config1 = {
                useOCR: true,
                selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
            };

            const result1 = await this.aiService.generateSmartFileName(documentInfo1, config1);
            console.log('✅ OCR + 视觉模型结果:', result1);

            // 测试2：纯视觉模型方案
            console.log('\n🎨 测试2：纯视觉模型方案');
            const config2 = {
                useOCR: false,
                selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
            };

            const result2 = await this.aiService.generateSmartFileName(documentInfo1, config2);
            console.log('✅ 纯视觉模型结果:', result2);

            return { result1, result2 };

        } catch (error) {
            console.error('❌ 图片文件处理测试失败:', error);
            return null;
        }
    }

    /**
     * 测试文档文件的智能模型选择
     */
    async testDocumentFileProcessing() {
        console.log('\n📄 ===== 测试文档文件处理 =====');
        
        try {
            const documentInfo = {
                fileName: '测试文档.txt',
                filePath: '/Users/chenshengguang/Downloads/测试重命名/虚拟号为赠送虚拟手机接码哈，邮箱请下载临时邮箱.txt',
                fileType: 'document',
                content: '这是一个关于虚拟手机号码和临时邮箱的说明文档，主要介绍如何获取和使用虚拟服务。',
                metadata: {}
            };

            const config = {
                selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct' // 传入视觉模型，应自动切换到对话模型
            };

            const result = await this.aiService.generateSmartFileName(documentInfo, config);
            console.log('✅ 文档处理结果（自动切换到对话模型）:', result);

            return result;

        } catch (error) {
            console.error('❌ 文档文件处理测试失败:', error);
            return null;
        }
    }

    /**
     * 测试模型自动选择功能
     */
    async testModelAutoSelection() {
        console.log('\n🤖 ===== 测试模型自动选择 =====');
        
        try {
            // 测试视觉模型获取
            const visionModel1 = this.aiService.getVisionModel('Qwen/Qwen2.5-VL-32B-Instruct');
            const visionModel2 = this.aiService.getVisionModel('vision:THUDM/GLM-4.1V-9B-Thinking');
            const visionModel3 = this.aiService.getVisionModel('Pro/deepseek-ai/DeepSeek-V3');

            console.log('视觉模型选择测试:');
            console.log('  输入: Qwen/Qwen2.5-VL-32B-Instruct → 输出:', visionModel1);
            console.log('  输入: vision:THUDM/GLM-4.1V-9B-Thinking → 输出:', visionModel2);
            console.log('  输入: Pro/deepseek-ai/DeepSeek-V3 → 输出:', visionModel3);

            // 测试对话模型获取
            const chatModel1 = this.aiService.getChatModel('vision:Qwen/Qwen2.5-VL-32B-Instruct');
            const chatModel2 = this.aiService.getChatModel('Pro/deepseek-ai/DeepSeek-V3');

            console.log('\n对话模型选择测试:');
            console.log('  输入: vision:Qwen/Qwen2.5-VL-32B-Instruct → 输出:', chatModel1);
            console.log('  输入: Pro/deepseek-ai/DeepSeek-V3 → 输出:', chatModel2);

            // 测试文件类型检测
            const isImage1 = this.aiService.isImageFile('test.jpg');
            const isImage2 = this.aiService.isImageFile('test.txt');
            const isImage3 = this.aiService.isImageFile('logo.png');

            console.log('\n文件类型检测测试:');
            console.log('  test.jpg → 是图片:', isImage1);
            console.log('  test.txt → 是图片:', isImage2);
            console.log('  logo.png → 是图片:', isImage3);

            return {
                visionModels: { visionModel1, visionModel2, visionModel3 },
                chatModels: { chatModel1, chatModel2 },
                fileTypeDetection: { isImage1, isImage2, isImage3 }
            };

        } catch (error) {
            console.error('❌ 模型自动选择测试失败:', error);
            return null;
        }
    }

    /**
     * 测试OCR功能
     */
    async testOCRFunctionality() {
        console.log('\n🔍 ===== 测试OCR功能 =====');
        
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png';
        
        try {
            const ocrResult = await this.ocrService.recognizeText(imagePath);
            console.log('✅ OCR识别结果:', {
                success: ocrResult.success,
                hasText: ocrResult.hasText,
                textLength: ocrResult.text ? ocrResult.text.length : 0,
                textPreview: ocrResult.text ? ocrResult.text.substring(0, 100) + '...' : '',
                processingTime: ocrResult.processingTime
            });

            return ocrResult;

        } catch (error) {
            console.error('❌ OCR功能测试失败:', error);
            return null;
        }
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🎯 开始第六阶段功能测试...\n');

        const results = {
            imageProcessing: await this.testImageFileProcessing(),
            documentProcessing: await this.testDocumentFileProcessing(),
            modelAutoSelection: await this.testModelAutoSelection(),
            ocrFunctionality: await this.testOCRFunctionality()
        };

        console.log('\n📊 ===== 测试总结 =====');
        console.log('图片处理测试:', results.imageProcessing ? '✅ 通过' : '❌ 失败');
        console.log('文档处理测试:', results.documentProcessing ? '✅ 通过' : '❌ 失败');
        console.log('模型自动选择测试:', results.modelAutoSelection ? '✅ 通过' : '❌ 失败');
        console.log('OCR功能测试:', results.ocrFunctionality ? '✅ 通过' : '❌ 失败');

        return results;
    }
}

// 运行测试
async function main() {
    const tester = new Stage6Tester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = Stage6Tester;
