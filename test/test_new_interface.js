// 测试新的统一界面
const axios = require('axios');

async function testNewInterface() {
    try {
        console.log('🚀 测试新的统一界面...\n');
        
        // 测试数据
        const testFiles = [
            {
                name: '创意花卉艺术画-BRSAR主题.jpg',
                path: '/Users/chenshengguang/Downloads/测试重命名/创意花卉艺术画-BRSAR主题.jpg',
                type: 'image',
                extension: '.jpg',
                size: 34476
            },
            {
                name: 'logo-mushroom.png',
                path: '/Users/chenshengguang/Downloads/测试重命名/logo-mushroom.png',
                type: 'image',
                extension: '.png',
                size: 12345
            },
            {
                name: '长运福利小程序商城合作协议.docx',
                path: '/Users/chenshengguang/Downloads/测试重命名/长运福利小程序商城合作协议.docx',
                type: 'document',
                extension: '.docx',
                size: 67890
            }
        ];
        
        const testConfig = {
            template: 'semantic',
            customPrompt: '根据内容进行重命名，命名格式：类别-标题\n必须要有"-"符号',
            preserveExtension: true,
            removeSpecialChars: true,
            useOCR: false, // 测试纯视觉模型
            enableConcurrency: false,
            selectedModel: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
        };
        
        console.log('📤 发送处理请求...');
        
        // 发送处理请求
        const response = await axios.post('http://localhost:3000/rename/api/process', {
            files: testFiles,
            options: testConfig,
            apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
            model: 'vision:Qwen/Qwen2.5-VL-32B-Instruct'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });
        
        console.log('📥 处理响应:');
        console.log('状态码:', response.status);
        console.log('响应格式验证:');
        console.log(`✅ success字段: ${response.data.hasOwnProperty('success')}`);
        console.log(`✅ success值: ${response.data.success}`);
        console.log(`✅ data字段: ${response.data.hasOwnProperty('data')}`);
        
        if (response.data.success && response.data.data) {
            const results = response.data.data.results;
            console.log(`✅ 结果数量: ${results.length}`);
            console.log(`✅ 成功数量: ${response.data.data.successCount}`);
            console.log(`✅ 总数量: ${response.data.data.totalCount}`);
            
            console.log('\n📋 处理结果详情:');
            results.forEach((result, index) => {
                console.log(`\n${index + 1}. ${result.originalName}`);
                console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
                console.log(`   建议名称: ${result.suggestedName || '无'}`);
                console.log(`   置信度: ${result.confidence || 0}`);
                console.log(`   方法: ${result.method || '未知'}`);
                console.log(`   路径: ${result.path || '无路径'}`);
                
                // 验证自定义提示词效果
                if (result.suggestedName && result.suggestedName.includes('-')) {
                    console.log(`   ✅ 包含"-"符号，自定义提示词生效`);
                } else {
                    console.log(`   ⚠️ 不包含"-"符号`);
                }
            });
            
            // 测试应用重命名功能
            console.log('\n🔄 测试应用重命名功能...');
            
            // 过滤有效结果
            const validResults = results.filter(r => 
                r.success && r.suggestedName && r.path
            ).map(r => ({
                originalName: r.originalName,
                newName: r.suggestedName,
                status: 'success',
                path: r.path,
                reasoning: r.reasoning,
                confidence: r.confidence
            }));
            
            console.log(`有效结果数量: ${validResults.length}`);
            
            if (validResults.length > 0) {
                console.log('✅ 数据流验证通过！可以正常应用重命名');
                
                // 显示模拟的应用请求数据
                console.log('\n📤 模拟应用请求数据:');
                console.log(JSON.stringify({
                    renameResults: validResults,
                    apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug'
                }, null, 2));
            } else {
                console.log('❌ 数据流验证失败！没有有效的重命名结果');
            }
        }
        
        console.log('\n✅ 新界面测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

// 等待服务器启动后运行测试
setTimeout(() => {
    testNewInterface().catch(console.error);
}, 3000);
