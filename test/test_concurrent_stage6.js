#!/usr/bin/env node

/**
 * 并发处理功能测试
 */

const RenameService = require('./services/renameService');

async function testConcurrentProcessing() {
    console.log('⚡ 开始并发处理功能测试...\n');

    const renameService = new RenameService();

    try {
        // 模拟多个文件
        const testFiles = [
            {
                name: '测试文档1.txt',
                path: '/Users/chenshengguang/Downloads/测试重命名/测试文档1.txt',
                type: 'document',
                content: '这是第一个测试文档，包含一些示例内容。'
            },
            {
                name: '测试文档2.txt', 
                path: '/Users/chenshengguang/Downloads/测试重命名/测试文档2.txt',
                type: 'document',
                content: '这是第二个测试文档，用于测试并发处理。'
            },
            {
                name: '测试文档3.txt',
                path: '/Users/chenshengguang/Downloads/测试重命名/测试文档3.txt', 
                type: 'document',
                content: '这是第三个测试文档，验证批量重命名功能。'
            }
        ];

        const options = {
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
            selectedModel: 'Pro/deepseek-ai/DeepSeek-V3',
            template: 'semantic',
            useOCR: false,
            enableConcurrency: true,
            concurrency: 3
        };

        console.log('📊 测试配置:');
        console.log('  文件数量:', testFiles.length);
        console.log('  并发级别:', options.concurrency);
        console.log('  启用并发:', options.enableConcurrency);

        // 记录开始时间
        const startTime = Date.now();

        // 进度回调函数
        const progressCallback = (current, total, fileName, result) => {
            const progress = Math.round((current / total) * 100);
            console.log(`📈 进度: ${progress}% (${current}/${total}) - ${fileName}`);
            if (result) {
                console.log(`   结果: ${result.success ? '✅' : '❌'} ${result.suggestedName || result.error}`);
            }
        };

        // 执行并发处理
        console.log('\n🚀 开始并发处理...');
        const results = await renameService.processFilesConcurrently(
            testFiles, 
            options, 
            progressCallback, 
            options.concurrency
        );

        // 记录结束时间
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log('\n📊 处理结果统计:');
        console.log('  总处理时间:', totalTime + 'ms');
        console.log('  平均每文件:', Math.round(totalTime / testFiles.length) + 'ms');
        console.log('  成功数量:', results.filter(r => r.success).length);
        console.log('  失败数量:', results.filter(r => !r.success).length);

        console.log('\n📋 详细结果:');
        results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${testFiles[index].name}:`);
            console.log(`     状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
            console.log(`     建议名称: ${result.suggestedName || '无'}`);
            if (result.error) {
                console.log(`     错误: ${result.error}`);
            }
        });

        console.log('\n✅ 并发处理测试完成!');

    } catch (error) {
        console.error('❌ 并发处理测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testConcurrentProcessing();
