// 测试应用重命名功能
const RenameService = require('./services/renameService');
const path = require('path');
const fs = require('fs').promises;

async function testRenameApplication() {
    try {
        console.log('🚀 开始测试应用重命名功能...\n');
        
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
            enableConcurrency: false, // 禁用并发以便观察
            concurrency: 1
        };
        
        console.log('⚙️ 处理配置:');
        console.log(`  模型选择: ${options.selectedModel}`);
        console.log(`  命名模板: ${options.template}`);
        console.log(`  启用OCR: ${options.useOCR}`);
        console.log(`  并发处理: ${options.enableConcurrency}\n`);
        
        // 选择一个图片文件进行测试
        const testFile = files.find(f => f.name.includes('logo-mushroom.png'));
        if (!testFile) {
            console.log('❌ 未找到测试文件');
            return;
        }
        
        console.log(`📄 测试文件: ${testFile.name}`);
        console.log(`📁 文件路径: ${testFile.path}\n`);
        
        // 1. 先获取重命名建议
        console.log('🔍 第一步：获取重命名建议...');
        const result = await renameService.processFile(testFile, options);
        
        if (!result.success) {
            console.log(`❌ 获取重命名建议失败: ${result.error}`);
            return;
        }
        
        console.log('✅ 重命名建议获取成功:');
        console.log(`   原名称: ${result.originalName}`);
        console.log(`   建议名称: ${result.suggestedName}`);
        console.log(`   处理方法: ${result.method}`);
        console.log(`   置信度: ${result.confidence}`);
        console.log(`   推理过程: ${result.reasoning}\n`);
        
        // 2. 询问用户是否应用重命名
        console.log('🤔 是否应用重命名？');
        console.log(`   ${result.originalName} → ${result.suggestedName}`);
        
        // 模拟用户确认（在实际应用中这里会有用户交互）
        const userConfirmed = true;
        
        if (userConfirmed) {
            console.log('\n✅ 用户确认应用重命名');
            
            // 3. 应用重命名
            console.log('🔄 第二步：应用重命名...');
            const renameResult = await applyRename(testFile.path, result.suggestedName);
            
            if (renameResult.success) {
                console.log('🎉 重命名成功！');
                console.log(`   原路径: ${renameResult.oldPath}`);
                console.log(`   新路径: ${renameResult.newPath}`);
                
                // 4. 验证重命名结果
                console.log('\n🔍 第三步：验证重命名结果...');
                const verification = await verifyRename(renameResult.oldPath, renameResult.newPath);
                
                if (verification.success) {
                    console.log('✅ 重命名验证成功');
                    console.log(`   新文件存在: ${verification.newFileExists}`);
                    console.log(`   原文件已删除: ${verification.oldFileDeleted}`);
                } else {
                    console.log('❌ 重命名验证失败');
                    console.log(`   错误: ${verification.error}`);
                }
            } else {
                console.log('❌ 重命名失败');
                console.log(`   错误: ${renameResult.error}`);
            }
        } else {
            console.log('\n❌ 用户取消重命名');
        }
        
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

// 验证重命名结果函数
async function verifyRename(oldPath, newPath) {
    try {
        // 检查新文件是否存在
        let newFileExists = false;
        try {
            await fs.access(newPath);
            newFileExists = true;
        } catch {
            newFileExists = false;
        }
        
        // 检查原文件是否已删除
        let oldFileDeleted = false;
        try {
            await fs.access(oldPath);
            oldFileDeleted = false;
        } catch {
            oldFileDeleted = true;
        }
        
        const success = newFileExists && oldFileDeleted;
        
        return {
            success,
            newFileExists,
            oldFileDeleted,
            error: success ? null : '重命名验证失败'
        };
        
    } catch (error) {
        return {
            success: false,
            newFileExists: false,
            oldFileDeleted: false,
            error: error.message
        };
    }
}

// 运行测试
testRenameApplication().catch(console.error);
