// 测试自定义提示词是否正确传递给视觉模型
const RenameService = require('./services/renameService');
const path = require('path');

async function testCustomPromptStage6() {
    try {
        console.log('🚀 开始测试自定义提示词传递功能...\n');
        
        // 配置API密钥
        const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
        
        // 创建重命名服务实例
        const renameService = new RenameService({
            apiKey,
            useOCR: true,
            enableConcurrency: false // 关闭并发，便于观察日志
        });
        
        // 测试文件
        const testFile = {
            name: '创意花卉艺术画-BRSAR主题.jpg',
            path: '/Users/chenshengguang/Downloads/测试重命名/创意花卉艺术画-BRSAR主题.jpg',
            type: 'image',
            extension: '.jpg',
            size: 34476
        };
        
        console.log('📁 测试文件:', testFile.name);
        
        // 测试配置：包含自定义提示词
        const testConfig = {
            template: 'semantic',
            customPrompt: '根据内容进行重命名，命名格式：类别-标题\n必须要有"-"符号',
            preserveExtension: true,
            removeSpecialChars: true,
            useOCR: true,
            enableConcurrency: false,
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
        };
        
        console.log('⚙️ 测试配置:');
        console.log('  模型:', testConfig.selectedModel);
        console.log('  模板:', testConfig.template);
        console.log('  自定义提示词:', testConfig.customPrompt);
        console.log('  启用OCR:', testConfig.useOCR);
        console.log('');
        
        // 处理文件
        console.log('🔄 开始处理文件...');
        const result = await renameService.processImageFile(testFile.path, testConfig);
        
        // 显示结果
        console.log('\n📊 处理结果:');
        console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
        console.log(`原文件名: ${result.originalName}`);
        console.log(`建议名称: ${result.suggestedName || result.fallbackName || '无'}`);
        console.log(`处理方法: ${result.method || '未知'}`);
        console.log(`置信度: ${result.confidence || 0}`);
        
        if (result.reasoning) {
            console.log(`推理过程: ${result.reasoning}`);
        }
        
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
        
        // 验证是否包含"-"符号
        const suggestedName = result.suggestedName || result.fallbackName || '';
        const hasHyphen = suggestedName.includes('-');
        
        console.log('\n🔍 自定义提示词验证:');
        console.log(`建议名称: "${suggestedName}"`);
        console.log(`包含"-"符号: ${hasHyphen ? '✅ 是' : '❌ 否'}`);
        
        if (hasHyphen) {
            console.log('🎉 自定义提示词生效！AI按要求生成了包含"-"符号的文件名');
        } else {
            console.log('⚠️ 自定义提示词可能未生效，建议名称不包含"-"符号');
        }
        
        console.log('\n✅ 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行测试
testCustomPromptStage6().catch(console.error);
