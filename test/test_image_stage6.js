#!/usr/bin/env node

/**
 * 图片处理第六阶段功能测试
 */

const AIRenameService = require('./services/AIRenameService');

async function testImageProcessing() {
    console.log('🖼️ 开始图片处理测试...\n');

    const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
    const aiService = new AIRenameService({ apiKey });

    try {
        // 测试纯视觉模型方案
        console.log('🎨 测试纯视觉模型方案:');
        
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png';
        const documentInfo = {
            fileName: 'logo-mushroom.png',
            filePath: imagePath,
            fileType: 'image',
            content: '',
            metadata: {}
        };

        const config = {
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct',
            useOCR: false,
            template: 'semantic'
        };

        const result = await aiService.generateSmartFileName(documentInfo, config);
        console.log('  纯视觉模型结果:', result);

        console.log('\n✅ 图片处理测试完成!');

    } catch (error) {
        console.error('❌ 图片处理测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testImageProcessing();
