// 设置环境变量
process.env.SILICONFLOW_API_KEY = 'sk-your-actual-api-key-here';

// 导入并运行测试
const VisionRenameTest = require('./test_vision_rename');

async function runTest() {
    console.log('🔑 API密钥已配置');
    console.log('🚀 开始视觉模型测试...\n');
    
    const tester = new VisionRenameTest();
    
    try {
        const imagePath = '/Users/chenshengguang/Downloads/测试重命名/2_processed.jpg';
        await tester.testVisionRename(imagePath, 'vision:Qwen/Qwen2.5-VL-32B-Instruct');
    } catch (error) {
        console.error('测试失败:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    runTest();
}
