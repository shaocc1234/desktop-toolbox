// 测试第六阶段批量应用重命名功能
const RenameService = require('./services/renameService');
const path = require('path');
const fs = require('fs').promises;

async function testBatchApplyStage6() {
    try {
        console.log('🚀 开始测试第六阶段批量应用重命名功能...\n');
        
        const testDirectory = '/Users/chenshengguang/Downloads/测试重命名';
        
        // 配置API密钥
        const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
        
        // 创建重命名服务实例
        const renameService = new RenameService({
            apiKey,
            useOCR: true,
            enableConcurrency: true,
            concurrency: 3
        });
        
        console.log('📁 扫描测试目录...');
        const files = await scanDirectory(testDirectory);
        console.log(`找到 ${files.length} 个文件\n`);
        
        if (files.length === 0) {
            console.log('❌ 测试目录中没有文件');
            return;
        }
        
        // 1. 先生成重命名建议
        console.log('🤖 生成AI重命名建议...');
        const renameResults = await renameService.processFiles(files, {
            template: 'semantic',
            preserveExtension: true,
            removeSpecialChars: true,
            useOCR: true,
            enableConcurrency: true,
            concurrency: 3,
            selectedModel: 'chat:Pro/deepseek-ai/DeepSeek-V3'
        });
        
        if (!renameResults.success) {
            console.log('❌ 生成重命名建议失败:', renameResults.message);
            return;
        }
        
        console.log('\n📋 重命名建议预览:');
        renameResults.data.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.originalName} → ${result.suggestedName || result.fallbackName}`);
        });
        
        // 2. 模拟用户确认
        const validResults = renameResults.data.results.filter(result => 
            result.success && result.suggestedName && result.path
        );
        
        if (validResults.length === 0) {
            console.log('\n❌ 没有有效的重命名建议可应用');
            return;
        }
        
        console.log(`\n✅ 找到 ${validResults.length} 个有效的重命名建议`);
        console.log('🔄 开始批量应用重命名...\n');
        
        // 3. 批量应用重命名
        const applyResult = await renameService.applyBatchRename(validResults);
        
        // 4. 显示结果
        console.log('\n📊 批量应用重命名结果:');
        console.log(`✅ 成功: ${applyResult.successCount} 个文件`);
        console.log(`❌ 失败: ${applyResult.failureCount} 个文件`);
        console.log(`📁 总计: ${applyResult.totalFiles} 个文件`);
        
        if (applyResult.results && applyResult.results.length > 0) {
            console.log('\n📝 详细结果:');
            applyResult.results.forEach((result, index) => {
                const status = result.success ? '✅' : '❌';
                console.log(`  ${index + 1}. ${status} ${result.originalName} → ${result.newName || '失败'}`);
                if (!result.success && result.error) {
                    console.log(`     错误: ${result.error}`);
                }
            });
        }
        
        // 5. 验证文件是否真的被重命名了
        console.log('\n🔍 验证重命名结果...');
        const successfulRenames = applyResult.results.filter(r => r.success);
        
        for (const rename of successfulRenames) {
            try {
                // 检查新文件是否存在
                await fs.access(rename.newPath);
                console.log(`✅ 验证成功: ${rename.newName} 文件存在`);
                
                // 检查原文件是否不存在
                try {
                    await fs.access(rename.oldPath);
                    console.log(`⚠️  警告: 原文件 ${rename.originalName} 仍然存在`);
                } catch {
                    console.log(`✅ 验证成功: 原文件 ${rename.originalName} 已被移除`);
                }
            } catch (error) {
                console.log(`❌ 验证失败: ${rename.newName} 文件不存在`);
            }
        }
        
        console.log('\n🎉 第六阶段批量应用重命名测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 扫描目录函数
async function scanDirectory(dirPath) {
    const files = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        if (entry.isFile()) {
            const filePath = path.join(dirPath, entry.name);
            const stats = await fs.stat(filePath);
            const extension = path.extname(entry.name).toLowerCase();
            
            // 确定文件类型
            let type = 'unknown';
            if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension)) {
                type = 'image';
            } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(extension)) {
                type = 'document';
            }
            
            files.push({
                name: entry.name,
                path: filePath,
                type,
                extension,
                size: stats.size
            });
        }
    }
    
    return files;
}

// 运行测试
testBatchApplyStage6().catch(console.error);
