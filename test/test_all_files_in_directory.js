#!/usr/bin/env node

/**
 * 测试目录下所有文件的第六阶段功能
 */

const RenameService = require('./services/renameService');
const fs = require('fs');
const path = require('path');

async function testAllFilesInDirectory() {
    console.log('📁 开始测试目录下所有文件...\n');

    const testDirectory = '/Users/chenshengguang/Downloads/测试重命名';

    // 配置API密钥
    const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
    const renameService = new RenameService({ apiKey });

    try {
        // 读取目录下的所有文件
        console.log('🔍 扫描目录:', testDirectory);
        const allItems = fs.readdirSync(testDirectory);
        
        // 过滤出文件（排除目录和隐藏文件）
        const files = [];
        for (const item of allItems) {
            const fullPath = path.join(testDirectory, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile() && !item.startsWith('.')) {
                const ext = path.extname(item).toLowerCase();
                let fileType = 'document'; // 默认为文档类型
                
                // 根据扩展名判断文件类型
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif'];
                const documentExtensions = ['.txt', '.md', '.doc', '.docx', '.pdf'];
                
                if (imageExtensions.includes(ext)) {
                    fileType = 'image';
                } else if (documentExtensions.includes(ext)) {
                    fileType = 'document';
                }
                
                files.push({
                    name: item,
                    path: fullPath,
                    type: fileType,
                    extension: ext,
                    size: stat.size
                });
            }
        }

        console.log(`📊 找到 ${files.length} 个文件:`);
        files.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
        });

        if (files.length === 0) {
            console.log('❌ 目录中没有找到可处理的文件');
            return;
        }

        // 配置选项
        const options = {
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct', // 会根据文件类型自动切换
            template: 'semantic',
            useOCR: true, // 图片文件启用OCR
            enableConcurrency: true,
            concurrency: 3 // 并发处理3个文件
        };

        console.log('\n⚙️ 处理配置:');
        console.log('  模型选择:', options.selectedModel);
        console.log('  命名模板:', options.template);
        console.log('  启用OCR:', options.useOCR);
        console.log('  并发处理:', options.enableConcurrency);
        console.log('  并发级别:', options.concurrency);

        // 记录开始时间
        const startTime = Date.now();

        // 进度回调函数
        let processedCount = 0;
        const progressCallback = (current, total, fileName, result) => {
            processedCount++;
            const progress = Math.round((processedCount / files.length) * 100);
            console.log(`\n📈 进度: ${progress}% (${processedCount}/${files.length})`);
            console.log(`📄 文件: ${fileName}`);
            
            if (result) {
                if (result.success) {
                    console.log(`✅ 成功: ${result.suggestedName}`);
                    console.log(`   方法: ${result.method || '未知'}`);
                    console.log(`   置信度: ${result.confidence || '未知'}`);
                } else {
                    console.log(`❌ 失败: ${result.error}`);
                }
            }
        };

        // 执行并发处理
        console.log('\n🚀 开始批量处理...');
        const results = await renameService.processFilesConcurrently(
            files, 
            options, 
            progressCallback, 
            options.concurrency
        );

        // 记录结束时间
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        const imageCount = results.filter((r, i) => files[i].type === 'image').length;
        const documentCount = results.filter((r, i) => files[i].type === 'document').length;

        console.log('\n📊 ===== 处理结果统计 =====');
        console.log(`⏱️  总处理时间: ${totalTime}ms (${Math.round(totalTime/1000)}秒)`);
        console.log(`📈 平均每文件: ${Math.round(totalTime / files.length)}ms`);
        console.log(`✅ 成功数量: ${successCount}`);
        console.log(`❌ 失败数量: ${failureCount}`);
        console.log(`🖼️  图片文件: ${imageCount}`);
        console.log(`📄 文档文件: ${documentCount}`);

        console.log('\n📋 ===== 详细结果 =====');
        results.forEach((result, index) => {
            const file = files[index];
            console.log(`\n${index + 1}. ${file.name} (${file.type})`);
            console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
            console.log(`   原名称: ${file.name}`);
            console.log(`   建议名称: ${result.suggestedName || '无'}`);
            console.log(`   处理方法: ${result.method || '未知'}`);
            console.log(`   置信度: ${result.confidence || '未知'}`);
            
            if (result.error) {
                console.log(`   错误信息: ${result.error}`);
            }
            
            if (result.reasoning) {
                console.log(`   推理过程: ${result.reasoning}`);
            }
        });

        // 按文件类型分组统计
        console.log('\n📊 ===== 按类型统计 =====');
        const imageResults = results.filter((r, i) => files[i].type === 'image');
        const documentResults = results.filter((r, i) => files[i].type === 'document');

        if (imageResults.length > 0) {
            const imageSuccess = imageResults.filter(r => r.success).length;
            console.log(`🖼️  图片文件: ${imageSuccess}/${imageResults.length} 成功`);
        }

        if (documentResults.length > 0) {
            const documentSuccess = documentResults.filter(r => r.success).length;
            console.log(`📄 文档文件: ${documentSuccess}/${documentResults.length} 成功`);
        }

        console.log('\n✅ 目录文件批量处理测试完成!');

    } catch (error) {
        console.error('❌ 目录文件批量处理测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testAllFilesInDirectory();
