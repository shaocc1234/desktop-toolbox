#!/usr/bin/env node

/**
 * 使用真实文件的并发处理测试
 */

const RenameService = require('./services/renameService');
const fs = require('fs');

async function testConcurrentWithRealFiles() {
    console.log('⚡ 开始真实文件并发处理测试...\n');

    const renameService = new RenameService();

    try {
        // 使用现有的真实文件
        const testFiles = [
            {
                name: 'logo-mushroom.png',
                path: '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png',
                type: 'image'
            },
            {
                name: '图片_002_03.gif',
                path: '/Users/chenshengguang/Downloads/测试重命名/图片_002_03.gif',
                type: 'image'
            }
        ];

        // 检查文件是否存在
        console.log('📁 检查文件存在性:');
        const existingFiles = [];
        for (const file of testFiles) {
            if (fs.existsSync(file.path)) {
                console.log(`  ✅ ${file.name} - 存在`);
                existingFiles.push(file);
            } else {
                console.log(`  ❌ ${file.name} - 不存在`);
            }
        }

        if (existingFiles.length === 0) {
            console.log('❌ 没有找到可用的测试文件');
            return;
        }

        const options = {
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct',
            template: 'semantic',
            useOCR: true,
            enableConcurrency: true,
            concurrency: 2
        };

        console.log('\n📊 测试配置:');
        console.log('  文件数量:', existingFiles.length);
        console.log('  并发级别:', options.concurrency);
        console.log('  启用并发:', options.enableConcurrency);
        console.log('  使用OCR:', options.useOCR);

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
            existingFiles, 
            options, 
            progressCallback, 
            options.concurrency
        );

        // 记录结束时间
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log('\n📊 处理结果统计:');
        console.log('  总处理时间:', totalTime + 'ms');
        console.log('  平均每文件:', Math.round(totalTime / existingFiles.length) + 'ms');
        console.log('  成功数量:', results.filter(r => r.success).length);
        console.log('  失败数量:', results.filter(r => !r.success).length);

        console.log('\n📋 详细结果:');
        results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${existingFiles[index].name}:`);
            console.log(`     状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
            console.log(`     建议名称: ${result.suggestedName || '无'}`);
            console.log(`     方法: ${result.method || '未知'}`);
            console.log(`     置信度: ${result.confidence || '未知'}`);
            if (result.error) {
                console.log(`     错误: ${result.error}`);
            }
        });

        console.log('\n✅ 真实文件并发处理测试完成!');

    } catch (error) {
        console.error('❌ 真实文件并发处理测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testConcurrentWithRealFiles();
