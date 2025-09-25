// 测试前端后端数据格式修复
const axios = require('axios');

async function testFrontendBackendFix() {
    try {
        console.log('🚀 测试前端后端数据格式修复...\n');
        
        // 模拟前端发送的请求
        const testData = {
            files: [
                {
                    name: 'test.jpg',
                    path: '/Users/chenshengguang/Downloads/测试重命名/创意花卉艺术画-BRSAR主题.jpg',
                    type: 'image',
                    extension: '.jpg',
                    size: 34476
                }
            ],
            options: {
                template: 'semantic',
                customPrompt: '根据内容进行重命名，命名格式：类别-标题\n必须要有"-"符号',
                preserveExtension: true,
                removeSpecialChars: true,
                useOCR: false, // 测试纯视觉模型
                enableConcurrency: false,
                selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
            },
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
            model: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
        };
        
        console.log('📤 发送请求到后端API...');
        console.log('请求数据:', JSON.stringify(testData, null, 2));
        
        // 发送请求到后端
        const response = await axios.post('http://localhost:3000/rename/api/process', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2分钟超时
        });
        
        console.log('\n📥 后端响应:');
        console.log('状态码:', response.status);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        // 验证响应格式
        const result = response.data;
        
        console.log('\n🔍 响应格式验证:');
        console.log(`✅ 包含success字段: ${result.hasOwnProperty('success')}`);
        console.log(`✅ success值: ${result.success}`);
        console.log(`✅ 包含data字段: ${result.hasOwnProperty('data')}`);
        console.log(`✅ 包含message字段: ${result.hasOwnProperty('message')}`);
        
        if (result.data) {
            console.log(`✅ data.results是数组: ${Array.isArray(result.data.results)}`);
            console.log(`✅ 结果数量: ${result.data.results?.length || 0}`);
            console.log(`✅ 成功数量: ${result.data.successCount || 0}`);
            console.log(`✅ 总数量: ${result.data.totalCount || 0}`);
        }
        
        // 模拟前端处理逻辑
        console.log('\n🎯 模拟前端处理:');
        if (result.success) {
            console.log('✅ 前端会正常处理结果');
            
            const renameResults = result.data.results.map(item => ({
                originalName: item.originalName,
                newName: item.suggestedName || item.fallbackName || item.originalName,
                status: item.success ? 'success' : 'error',
                reasoning: item.reasoning,
                confidence: item.confidence,
                stage: item.stage,
                error: item.error,
                path: item.path
            }));
            
            console.log('处理后的结果:', renameResults);
        } else {
            console.log('❌ 前端会抛出错误:', result.message || '处理失败');
        }
        
        console.log('\n✅ 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

// 等待服务器启动后运行测试
setTimeout(() => {
    testFrontendBackendFix().catch(console.error);
}, 5000); // 等待5秒让服务器完全启动
