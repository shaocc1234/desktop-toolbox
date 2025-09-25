// 测试AI模型优先级数据库持久化功能
const DatabaseService = require('../services/databaseService');

async function testModelPrioritiesDB() {
    console.log('🧪 开始测试AI模型优先级数据库持久化功能...\n');

    const dbService = new DatabaseService();

    try {
        // 测试数据
        const chatPriorities = [
            {
                provider: 'siliconflow',
                model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
                modelName: 'Qwen 3 Next 80B (指令)',
                priority: 1,
                enabled: true
            },
            {
                provider: 'doubao',
                model: 'doubao-seed-1-6-thinking',
                modelName: '豆包1.6 Thinking',
                priority: 2,
                enabled: true
            },
            {
                provider: 'deepseek',
                model: 'deepseek-chat',
                modelName: 'DeepSeek Chat (官方)',
                priority: 3,
                enabled: false
            }
        ];

        const visionPriorities = [
            {
                provider: 'siliconflow',
                model: 'Qwen/Qwen2.5-VL-32B-Instruct',
                modelName: 'Qwen 2.5 VL 32B (视觉)',
                priority: 1,
                enabled: true
            },
            {
                provider: 'doubao',
                model: 'doubao-seed-1-6-flash-250615',
                modelName: '豆包1.6 Flash',
                priority: 2,
                enabled: true
            }
        ];

        // 1. 测试保存对话模型优先级
        console.log('1️⃣ 测试保存对话模型优先级...');
        await dbService.saveAIModelPriorities('chat', chatPriorities);
        console.log('✅ 对话模型优先级保存成功\n');

        // 2. 测试保存视觉模型优先级
        console.log('2️⃣ 测试保存视觉模型优先级...');
        await dbService.saveAIModelPriorities('vision', visionPriorities);
        console.log('✅ 视觉模型优先级保存成功\n');

        // 3. 测试获取对话模型优先级
        console.log('3️⃣ 测试获取对话模型优先级...');
        const loadedChatPriorities = await dbService.getAIModelPriorities('chat');
        console.log('📋 加载的对话模型优先级:', JSON.stringify(loadedChatPriorities, null, 2));
        console.log('✅ 对话模型优先级加载成功\n');

        // 4. 测试获取视觉模型优先级
        console.log('4️⃣ 测试获取视觉模型优先级...');
        const loadedVisionPriorities = await dbService.getAIModelPriorities('vision');
        console.log('📋 加载的视觉模型优先级:', JSON.stringify(loadedVisionPriorities, null, 2));
        console.log('✅ 视觉模型优先级加载成功\n');

        // 5. 测试获取所有模型优先级
        console.log('5️⃣ 测试获取所有模型优先级...');
        const allPriorities = await dbService.getAllAIModelPriorities();
        console.log('📋 所有模型优先级:', JSON.stringify(allPriorities, null, 2));
        console.log('✅ 所有模型优先级加载成功\n');

        // 6. 验证数据完整性
        console.log('6️⃣ 验证数据完整性...');
        
        // 验证对话模型数量
        if (loadedChatPriorities.length !== chatPriorities.length) {
            throw new Error(`对话模型数量不匹配: 期望 ${chatPriorities.length}, 实际 ${loadedChatPriorities.length}`);
        }

        // 验证视觉模型数量
        if (loadedVisionPriorities.length !== visionPriorities.length) {
            throw new Error(`视觉模型数量不匹配: 期望 ${visionPriorities.length}, 实际 ${loadedVisionPriorities.length}`);
        }

        // 验证优先级排序
        for (let i = 0; i < loadedChatPriorities.length; i++) {
            if (loadedChatPriorities[i].priority !== i + 1) {
                throw new Error(`对话模型优先级排序错误: 索引 ${i}, 期望优先级 ${i + 1}, 实际 ${loadedChatPriorities[i].priority}`);
            }
        }

        console.log('✅ 数据完整性验证通过\n');

        // 7. 测试更新配置
        console.log('7️⃣ 测试更新配置...');
        const updatedChatPriorities = [
            {
                provider: 'deepseek',
                model: 'deepseek-chat',
                modelName: 'DeepSeek Chat (官方)',
                priority: 1,
                enabled: true
            }
        ];

        await dbService.saveAIModelPriorities('chat', updatedChatPriorities);
        const reloadedChatPriorities = await dbService.getAIModelPriorities('chat');
        
        if (reloadedChatPriorities.length !== 1) {
            throw new Error(`更新后对话模型数量错误: 期望 1, 实际 ${reloadedChatPriorities.length}`);
        }

        if (reloadedChatPriorities[0].provider !== 'deepseek') {
            throw new Error(`更新后对话模型提供商错误: 期望 deepseek, 实际 ${reloadedChatPriorities[0].provider}`);
        }

        console.log('✅ 配置更新测试通过\n');

        console.log('🎉 所有测试通过！AI模型优先级数据库持久化功能正常工作。');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('详细错误:', error);
    } finally {
        dbService.close();
    }
}

// 运行测试
if (require.main === module) {
    testModelPrioritiesDB();
}

module.exports = testModelPrioritiesDB;
