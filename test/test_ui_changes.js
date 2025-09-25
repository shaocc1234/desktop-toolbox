const fs = require('fs').promises;
const path = require('path');

async function createTestFiles() {
    console.log('🧪 创建测试文件用于验证UI弱化效果...\n');
    
    const testDir = './test_ui_files';
    
    try {
        // 确保测试目录存在
        await fs.mkdir(testDir, { recursive: true });
        
        // 创建测试文件
        const testFiles = [
            { name: 'document1.txt', content: '这是第一个测试文档' },
            { name: 'document2.txt', content: '这是第二个测试文档' },
            { name: 'image1.jpg', content: '模拟图片文件' },
            { name: 'data.csv', content: 'name,value\ntest,123' }
        ];
        
        // 创建测试文件
        for (const file of testFiles) {
            const filePath = path.join(testDir, file.name);
            await fs.writeFile(filePath, file.content);
            console.log(`✅ 创建测试文件: ${file.name}`);
        }
        
        console.log(`\n🎯 测试文件创建完成！`);
        console.log(`📁 测试目录: ${path.resolve(testDir)}`);
        console.log(`\n📋 测试步骤:`);
        console.log(`1. 启动应用: npm start`);
        console.log(`2. 拖拽测试目录到应用中`);
        console.log(`3. 点击"开始智能重命名"处理文件`);
        console.log(`4. 观察跳过文件的UI效果:`);
        console.log(`   - 跳过文件应该使用灰色低调背景`);
        console.log(`   - 跳过提示信息应该更加简洁`);
        console.log(`   - 不应该显示Toast通知`);
        console.log(`5. 再次处理同一目录，验证弱化效果`);
        
    } catch (error) {
        console.error('❌ 创建测试文件失败:', error);
    }
}

// 清理测试文件的函数
async function cleanupTestFiles() {
    const testDir = './test_ui_files';
    
    try {
        const files = await fs.readdir(testDir);
        for (const file of files) {
            await fs.unlink(path.join(testDir, file));
        }
        await fs.rmdir(testDir);
        console.log('🧹 测试文件清理完成');
    } catch (error) {
        console.warn('清理测试文件时出错:', error.message);
    }
}

// 根据命令行参数决定执行什么操作
const action = process.argv[2];

if (action === 'cleanup') {
    cleanupTestFiles().then(() => {
        console.log('清理完成');
        process.exit(0);
    });
} else {
    createTestFiles().then(() => {
        console.log('\n💡 提示: 测试完成后运行 "node test_ui_changes.js cleanup" 清理测试文件');
        process.exit(0);
    });
}
