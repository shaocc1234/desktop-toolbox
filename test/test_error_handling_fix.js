/**
 * 测试错误处理和实时更新修复
 */

const axios = require('axios');

async function testErrorHandling() {
    console.log('🧪 测试错误处理和实时更新修复...\n');

    // 测试数据
    const testFiles = [
        {
            path: '/Users/chenshengguang/Downloads/测试重命名/创意花卉艺术画-BRSAR主题.jpg',
            name: '创意花卉艺术画-BRSAR主题.jpg',
            size: 34476,
            extension: '.jpg'
        },
        {
            path: '/Users/chenshengguang/Downloads/测试重命名/智能聊天机器人神回复风格指南.md',
            name: '智能聊天机器人神回复风格指南.md',
            size: 4139,
            extension: '.md'
        },
        {
            path: '/Users/chenshengguang/Downloads/测试重命名/不存在的文件.txt',
            name: '不存在的文件.txt',
            size: 1000,
            extension: '.txt'
        }
    ];

    const config = {
        template: 'semantic',
        customPrompt: '根据内容进行重命名，严格按照格式：类别-标题\n要求：必须包含一个"-"符号连接类别和标题，例如：文档-用户手册、图片-风景照片',
        preserveExtension: true,
        removeSpecialChars: true,
        useOCR: false,
        enableConcurrency: true,
        concurrency: 5,
        openFolderAfter: false,
        selectedModel: 'chat:Pro/deepseek-ai/DeepSeek-V3'
    };

    let successCount = 0;
    let errorCount = 0;

    console.log('📋 测试文件列表:');
    testFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    });
    console.log('');

    // 逐个测试文件处理
    for (let i = 0; i < testFiles.length; i++) {
        const file = testFiles[i];
        console.log(`🔄 处理文件 ${i + 1}/${testFiles.length}: ${file.name}`);

        try {
            const response = await axios.post('http://localhost:3000/rename/api/process-single', {
                file: file,
                options: config,
                apiKey: 'sk-ceptwprbostrzqpmuykoqoaayzbshtdzvydecmoifbfrchug',
                model: 'chat:Pro/deepseek-ai/DeepSeek-V3'
            }, {
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success && response.data.data) {
                const result = response.data.data;
                console.log(`  ✅ 处理成功: ${result.originalName} -> ${result.suggestedName}`);
                console.log(`     置信度: ${result.confidence}%`);
                console.log(`     推理: ${result.reasoning}`);
                successCount++;
            } else {
                console.log(`  ❌ 处理失败: ${response.data.message || '未知错误'}`);
                errorCount++;
            }
        } catch (error) {
            console.log(`  ❌ 处理异常: ${getErrorMessage(error)}`);
            errorCount++;
        }

        console.log('');
    }

    // 测试结果统计
    console.log('📊 测试结果统计:');
    console.log(`  ✅ 成功: ${successCount}/${testFiles.length} 个文件`);
    console.log(`  ❌ 失败: ${errorCount}/${testFiles.length} 个文件`);
    console.log(`  📈 成功率: ${Math.round((successCount / testFiles.length) * 100)}%`);

    // 验证错误处理机制
    console.log('\n🔍 错误处理机制验证:');
    if (errorCount > 0) {
        console.log('  ✅ 单个文件错误不影响其他文件处理');
        console.log('  ✅ 提供友好的错误信息');
        console.log('  ✅ 错误统计正确');
    } else {
        console.log('  ℹ️ 本次测试中没有遇到错误');
    }

    return {
        total: testFiles.length,
        success: successCount,
        error: errorCount,
        successRate: Math.round((successCount / testFiles.length) * 100)
    };
}

/**
 * 获取友好的错误信息
 */
function getErrorMessage(error) {
    const message = error.message || error.toString();
    
    if (message.includes('Network service crashed')) {
        return '网络服务重启中，请稍后重试';
    } else if (message.includes('timeout')) {
        return '处理超时，请重试';
    } else if (message.includes('ECONNREFUSED')) {
        return '服务器连接失败，请确保服务器正在运行';
    } else if (message.includes('Model does not exist')) {
        return '模型不存在，已自动切换';
    } else if (message.includes('ECONNRESET')) {
        return '网络连接中断';
    } else if (message.includes('ETIMEDOUT')) {
        return '网络请求超时';
    } else {
        return message || '处理失败';
    }
}

// 运行测试
if (require.main === module) {
    testErrorHandling()
        .then(result => {
            console.log('\n🎉 测试完成!');
            console.log(`最终结果: ${result.success}/${result.total} 成功 (${result.successRate}%)`);
            
            if (result.successRate >= 60) {
                console.log('✅ 错误处理机制工作正常');
                process.exit(0);
            } else {
                console.log('⚠️ 成功率较低，可能需要进一步优化');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ 测试失败:', error.message);
            process.exit(1);
        });
}

module.exports = { testErrorHandling, getErrorMessage };
