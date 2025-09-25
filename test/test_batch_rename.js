// 测试批量重命名功能
const RenameService = require('./services/renameService');
const path = require('path');
const fs = require('fs').promises;

async function testBatchRename() {
    try {
        console.log('🚀 开始测试批量重命名功能...\n');
        
        const testDirectory = '/Users/chenshengguang/Downloads/测试重命名';
        
        // 配置API密钥
        const apiKey = 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug';
        const renameService = new RenameService({ apiKey });
        
        // 扫描目录
        console.log(`🔍 扫描目录: ${testDirectory}`);
        const files = await scanDirectory(testDirectory);
        console.log(`📊 找到 ${files.length} 个文件\n`);
        
        // 处理配置
        const options = {
            apiKey,
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct',
            template: 'semantic',
            useOCR: true,
            enableConcurrency: true,
            concurrency: 2
        };
        
        console.log('⚙️ 处理配置:');
        console.log(`  模型选择: ${options.selectedModel}`);
        console.log(`  命名模板: ${options.template}`);
        console.log(`  启用OCR: ${options.useOCR}`);
        console.log(`  并发处理: ${options.enableConcurrency}`);
        console.log(`  并发级别: ${options.concurrency}\n`);
        
        // 选择前3个文件进行批量测试
        const testFiles = files.slice(0, 3);
        console.log(`📋 选择 ${testFiles.length} 个文件进行批量测试:`);
        testFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.type})`);
        });
        console.log();
        
        // 1. 批量获取重命名建议
        console.log('🔍 第一步：批量获取重命名建议...');
        const startTime = Date.now();
        
        const results = await renameService.processFilesConcurrently(testFiles, options);
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log(`⏱️  批量处理完成，耗时: ${totalTime}ms\n`);
        
        // 2. 显示重命名建议
        console.log('📋 重命名建议列表:');
        const successResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        successResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.originalName}`);
            console.log(`   → ${result.suggestedName}`);
            console.log(`   方法: ${result.method}, 置信度: ${result.confidence}`);
            console.log(`   推理: ${result.reasoning}`);
        });
        
        if (failedResults.length > 0) {
            console.log('\n❌ 失败的文件:');
            failedResults.forEach((result, index) => {
                console.log(`${index + 1}. ${result.originalName}: ${result.error}`);
            });
        }
        
        // 3. 模拟用户确认并应用重命名
        console.log(`\n🤔 是否批量应用重命名？(${successResults.length} 个文件)`);
        const userConfirmed = true; // 模拟用户确认
        
        if (userConfirmed && successResults.length > 0) {
            console.log('\n✅ 用户确认批量应用重命名');
            console.log('🔄 第二步：批量应用重命名...\n');
            
            const renameResults = [];
            
            for (let i = 0; i < successResults.length; i++) {
                const result = successResults[i];
                const originalFile = testFiles.find(f => f.name === result.originalName);
                
                if (originalFile) {
                    console.log(`${i + 1}. 重命名: ${result.originalName} → ${result.suggestedName}`);
                    
                    const renameResult = await applyRename(originalFile.path, result.suggestedName);
                    renameResults.push({
                        ...renameResult,
                        originalName: result.originalName,
                        suggestedName: result.suggestedName
                    });
                    
                    if (renameResult.success) {
                        console.log(`   ✅ 成功`);
                    } else {
                        console.log(`   ❌ 失败: ${renameResult.error}`);
                    }
                }
            }
            
            // 4. 统计结果
            console.log('\n📊 批量重命名结果统计:');
            const successCount = renameResults.filter(r => r.success).length;
            const failureCount = renameResults.filter(r => !r.success).length;
            
            console.log(`✅ 成功: ${successCount} 个文件`);
            console.log(`❌ 失败: ${failureCount} 个文件`);
            console.log(`⏱️  总耗时: ${totalTime}ms`);
            console.log(`📈 平均每文件: ${Math.round(totalTime / testFiles.length)}ms`);
            
            if (successCount > 0) {
                console.log('\n✅ 成功重命名的文件:');
                renameResults.filter(r => r.success).forEach((result, index) => {
                    console.log(`  ${index + 1}. ${result.originalName} → ${result.newName}`);
                });
            }
            
            if (failureCount > 0) {
                console.log('\n❌ 重命名失败的文件:');
                renameResults.filter(r => !r.success).forEach((result, index) => {
                    console.log(`  ${index + 1}. ${result.originalName}: ${result.error}`);
                });
            }
            
        } else {
            console.log('\n❌ 用户取消批量重命名或无可重命名文件');
        }
        
    } catch (error) {
        console.error('❌ 批量测试过程中发生错误:', error);
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

// 应用重命名函数
async function applyRename(oldPath, suggestedName) {
    try {
        const dir = path.dirname(oldPath);
        const extension = path.extname(oldPath);
        const newName = suggestedName.endsWith(extension) ? suggestedName : suggestedName + extension;
        const newPath = path.join(dir, newName);
        
        // 检查新文件名是否已存在
        try {
            await fs.access(newPath);
            return {
                success: false,
                error: `目标文件已存在: ${newName}`
            };
        } catch {
            // 文件不存在，可以重命名
        }
        
        // 执行重命名
        await fs.rename(oldPath, newPath);
        
        return {
            success: true,
            oldPath,
            newPath,
            oldName: path.basename(oldPath),
            newName
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// 运行测试
testBatchRename().catch(console.error);
