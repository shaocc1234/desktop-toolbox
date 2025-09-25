#!/usr/bin/env node

/**
 * 简化的第六阶段功能测试
 */

const AIRenameService = require('./services/AIRenameService');

async function testSimple() {
    console.log('🎯 开始简化测试...\n');

    const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
    const aiService = new AIRenameService({ apiKey });

    try {
        // 测试模型自动选择功能
        console.log('🤖 测试模型自动选择功能:');
        
        const visionModel = aiService.getVisionModel('Qwen/Qwen2.5-VL-32B-Instruct');
        console.log('  视觉模型选择:', visionModel);
        
        const chatModel = aiService.getChatModel('vision:Qwen/Qwen2.5-VL-32B-Instruct');
        console.log('  对话模型选择:', chatModel);
        
        const isImage = aiService.isImageFile('test.jpg');
        console.log('  文件类型检测:', isImage);

        // 测试文档处理（使用对话模型）
        console.log('\n📄 测试文档处理:');
        const documentInfo = {
            fileName: '测试文档.txt',
            fileType: 'document',
            content: '这是一个关于虚拟手机号码的说明文档。',
            metadata: {}
        };

        const config = {
            selectedModel: 'Pro/deepseek-ai/DeepSeek-V3',
            template: 'semantic'
        };

        const result = await aiService.generateSmartFileName(documentInfo, config);
        console.log('  文档处理结果:', result);

        console.log('\n✅ 简化测试完成!');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testSimple();
