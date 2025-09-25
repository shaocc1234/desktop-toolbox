#!/usr/bin/env node

/**
 * OCR + 视觉模型组合方案测试
 */

const AIRenameService = require('./services/AIRenameService');

async function testOCRVisionCombo() {
    console.log('🔍🎨 开始OCR + 视觉模型组合测试...\n');

    const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
    const aiService = new AIRenameService({ apiKey });

    try {
        // 测试OCR + 视觉模型组合方案
        console.log('🔍 测试OCR + 视觉模型组合方案:');
        
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png';
        const documentInfo = {
            fileName: 'logo-mushroom.png',
            filePath: imagePath,
            fileType: 'image',
            content: 'MOGU ART', // 模拟OCR识别的文字
            metadata: {}
        };

        const config = {
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct',
            useOCR: true,
            template: 'semantic'
        };

        const result = await aiService.generateSmartFileName(documentInfo, config);
        console.log('  OCR + 视觉模型结果:', result);

        console.log('\n✅ OCR + 视觉模型组合测试完成!');

    } catch (error) {
        console.error('❌ OCR + 视觉模型组合测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testOCRVisionCombo();
