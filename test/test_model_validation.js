// 测试模型验证和降级机制
const AIRenameService = require('./services/AIRenameService');

async function testModelValidation() {
    try {
        console.log('🚀 测试模型验证和降级机制...\n');
        
        const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
        
        // 测试用例
        const testCases = [
            {
                name: '不存在的模型 - inclusionAI/Ling-flash-2.0',
                selectedModel: 'chat:inclusionAI/Ling-flash-2.0',
                expected: 'Pro/deepseek-ai/DeepSeek-V3'
            },
            {
                name: '存在的模型 - DeepSeek-V3',
                selectedModel: 'chat:Pro/deepseek-ai/DeepSeek-V3',
                expected: 'Pro/deepseek-ai/DeepSeek-V3'
            },
            {
                name: '视觉模型自动切换',
                selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct',
                expected: 'Pro/deepseek-ai/DeepSeek-V3'
            },
            {
                name: '空模型',
                selectedModel: null,
                expected: 'Pro/deepseek-ai/DeepSeek-V3'
            },
            {
                name: '无效模型字符串',
                selectedModel: 'invalid-model-name',
                expected: 'Pro/deepseek-ai/DeepSeek-V3'
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`📋 测试: ${testCase.name}`);
            console.log(`输入模型: ${testCase.selectedModel}`);
            
            const aiService = new AIRenameService({ apiKey });
            const actualModel = aiService.getChatModel(testCase.selectedModel);
            
            console.log(`期望模型: ${testCase.expected}`);
            console.log(`实际模型: ${actualModel}`);
            console.log(`结果: ${actualModel === testCase.expected ? '✅ 通过' : '❌ 失败'}`);
            console.log('');
        }
        
        // 测试实际的文档处理
        console.log('📄 测试实际文档处理（使用不存在的模型）...');
        
        const aiService = new AIRenameService({ apiKey });
        
        const documentInfo = {
            fileName: 'test.txt',
            content: '这是一个测试文档',
            fileType: 'document'
        };
        
        const config = {
            selectedModel: 'chat:inclusionAI/Ling-flash-2.0', // 不存在的模型
            template: 'semantic'
        };
        
        try {
            const result = await aiService.generateSmartFileName(documentInfo, config);
            console.log('✅ 文档处理成功:', result);
            console.log('🎉 模型降级机制工作正常！');
        } catch (error) {
            console.error('❌ 文档处理失败:', error.message);
        }
        
        console.log('\n✅ 所有测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行测试
testModelValidation().catch(console.error);
