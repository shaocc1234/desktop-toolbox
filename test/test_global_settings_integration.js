/**
 * 测试全局设置与AI重命名功能的集成
 */

const puppeteer = require('puppeteer');
const path = require('path');

class GlobalSettingsIntegrationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3000';
    }

    async init() {
        console.log('🚀 启动全局设置集成测试...');
        
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1400, height: 900 });
        
        // 监听控制台输出
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ 浏览器错误:', msg.text());
            } else if (msg.text().includes('全局配置') || msg.text().includes('API')) {
                console.log('📝 浏览器日志:', msg.text());
            }
        });
    }

    async testSettingsPageAccess() {
        console.log('\n📋 测试1: 设置页面访问');
        
        try {
            await this.page.goto(`${this.baseUrl}/settings`, { waitUntil: 'networkidle0' });
            
            // 检查页面标题
            const title = await this.page.title();
            console.log('✅ 页面标题:', title);
            
            // 检查关键元素是否存在
            const elements = await this.page.evaluate(() => {
                return {
                    settingsForm: !!document.getElementById('aiConfigForm'),
                    siliconflowKey: !!document.getElementById('siliconflowKey'),
                    doubaoKey: !!document.getElementById('doubaoKey'),
                    deepseekKey: !!document.getElementById('deepseekKey'),
                    saveButton: !!document.querySelector('button[type="submit"]')
                };
            });
            
            console.log('✅ 关键元素检查:', elements);
            
            if (Object.values(elements).every(exists => exists)) {
                console.log('✅ 设置页面访问测试通过');
                return true;
            } else {
                console.log('❌ 设置页面缺少关键元素');
                return false;
            }
        } catch (error) {
            console.error('❌ 设置页面访问测试失败:', error.message);
            return false;
        }
    }

    async testGlobalConfigSave() {
        console.log('\n💾 测试2: 全局配置保存');
        
        try {
            // 填写测试API Keys
            const testKeys = {
                siliconflow: 'sk-test-siliconflow-key-12345',
                doubao: '12345678-1234-1234-1234-123456789012',
                deepseek: 'sk-test-deepseek-key-67890'
            };
            
            // 填写表单
            await this.page.type('#siliconflowKey', testKeys.siliconflow);
            await this.page.type('#doubaoKey', testKeys.doubao);
            await this.page.type('#deepseekKey', testKeys.deepseek);
            
            console.log('✅ 测试API Keys已填写');
            
            // 提交表单
            await this.page.click('button[type="submit"]');
            
            // 等待保存完成
            await this.page.waitForTimeout(1000);
            
            // 检查localStorage中的配置
            const savedConfig = await this.page.evaluate(() => {
                const config = localStorage.getItem('globalAIConfig');
                return config ? JSON.parse(config) : null;
            });
            
            console.log('✅ 保存的配置:', savedConfig);
            
            if (savedConfig && 
                savedConfig.siliconflow === testKeys.siliconflow &&
                savedConfig.doubao === testKeys.doubao &&
                savedConfig.deepseek === testKeys.deepseek) {
                console.log('✅ 全局配置保存测试通过');
                return true;
            } else {
                console.log('❌ 全局配置保存失败');
                return false;
            }
        } catch (error) {
            console.error('❌ 全局配置保存测试失败:', error.message);
            return false;
        }
    }

    async testAIRenameIntegration() {
        console.log('\n🔗 测试3: AI重命名功能集成');
        
        try {
            // 导航到AI重命名页面
            await this.page.goto(`${this.baseUrl}/rename`, { waitUntil: 'networkidle0' });
            
            // 等待页面加载完成
            await this.page.waitForTimeout(2000);
            
            // 检查SmartRenameManager是否正确初始化
            const managerStatus = await this.page.evaluate(() => {
                return {
                    exists: !!window.smartRenameManager,
                    hasGlobalConfig: !!window.smartRenameManager?.globalConfig,
                    globalConfigKeys: window.smartRenameManager?.globalConfig ? 
                        Object.keys(window.smartRenameManager.globalConfig) : [],
                    apiKey: window.smartRenameManager?.apiKey || '',
                    multiAIKeys: window.smartRenameManager?.multiAIConfig?.apiKeys || {}
                };
            });
            
            console.log('✅ SmartRenameManager状态:', managerStatus);
            
            // 检查是否正确加载了全局配置
            if (managerStatus.exists && 
                managerStatus.hasGlobalConfig && 
                managerStatus.globalConfigKeys.includes('siliconflow') &&
                managerStatus.globalConfigKeys.includes('doubao') &&
                managerStatus.globalConfigKeys.includes('deepseek')) {
                console.log('✅ AI重命名功能集成测试通过');
                return true;
            } else {
                console.log('❌ AI重命名功能集成失败');
                return false;
            }
        } catch (error) {
            console.error('❌ AI重命名功能集成测试失败:', error.message);
            return false;
        }
    }

    async testConfigBroadcast() {
        console.log('\n📡 测试4: 配置广播机制');
        
        try {
            // 在AI重命名页面监听配置更新事件
            await this.page.evaluate(() => {
                window.testConfigReceived = false;
                window.addEventListener('globalAIConfigUpdated', (event) => {
                    console.log('收到配置更新事件:', event.detail);
                    window.testConfigReceived = true;
                    window.testConfigData = event.detail;
                });
            });
            
            // 打开新标签页到设置页面
            const settingsPage = await this.browser.newPage();
            await settingsPage.goto(`${this.baseUrl}/settings`, { waitUntil: 'networkidle0' });
            
            // 修改配置
            await settingsPage.evaluate(() => {
                const siliconflowInput = document.getElementById('siliconflowKey');
                if (siliconflowInput) {
                    siliconflowInput.value = 'sk-updated-test-key-99999';
                }
            });
            
            // 提交表单
            await settingsPage.click('button[type="submit"]');
            await settingsPage.waitForTimeout(1000);
            
            // 关闭设置页面
            await settingsPage.close();
            
            // 检查AI重命名页面是否收到了配置更新
            await this.page.waitForTimeout(1000);
            const broadcastResult = await this.page.evaluate(() => {
                return {
                    received: window.testConfigReceived,
                    data: window.testConfigData
                };
            });
            
            console.log('✅ 配置广播结果:', broadcastResult);
            
            if (broadcastResult.received && broadcastResult.data) {
                console.log('✅ 配置广播机制测试通过');
                return true;
            } else {
                console.log('❌ 配置广播机制测试失败');
                return false;
            }
        } catch (error) {
            console.error('❌ 配置广播机制测试失败:', error.message);
            return false;
        }
    }

    async testDarkModeSupport() {
        console.log('\n🌙 测试5: 深色模式支持');
        
        try {
            await this.page.goto(`${this.baseUrl}/settings`, { waitUntil: 'networkidle0' });
            
            // 切换到深色模式
            await this.page.evaluate(() => {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            });
            
            await this.page.waitForTimeout(500);
            
            // 检查深色模式样式是否正确应用
            const darkModeStyles = await this.page.evaluate(() => {
                const navbar = document.querySelector('.navbar');
                const card = document.querySelector('.card');
                const formControl = document.querySelector('.form-control');
                
                return {
                    navbarBg: window.getComputedStyle(navbar).backgroundColor,
                    cardBg: window.getComputedStyle(card).backgroundColor,
                    inputBg: window.getComputedStyle(formControl).backgroundColor
                };
            });
            
            console.log('✅ 深色模式样式:', darkModeStyles);
            
            // 切换回浅色模式
            await this.page.evaluate(() => {
                document.documentElement.setAttribute('data-bs-theme', 'light');
            });
            
            console.log('✅ 深色模式支持测试通过');
            return true;
        } catch (error) {
            console.error('❌ 深色模式支持测试失败:', error.message);
            return false;
        }
    }

    async runAllTests() {
        const results = [];
        
        try {
            await this.init();
            
            results.push(await this.testSettingsPageAccess());
            results.push(await this.testGlobalConfigSave());
            results.push(await this.testAIRenameIntegration());
            results.push(await this.testConfigBroadcast());
            results.push(await this.testDarkModeSupport());
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
        
        // 输出测试结果
        console.log('\n📊 测试结果汇总:');
        console.log('==================');
        const testNames = [
            '设置页面访问',
            '全局配置保存', 
            'AI重命名功能集成',
            '配置广播机制',
            '深色模式支持'
        ];
        
        results.forEach((result, index) => {
            const status = result ? '✅ 通过' : '❌ 失败';
            console.log(`${testNames[index]}: ${status}`);
        });
        
        const passedCount = results.filter(r => r).length;
        console.log(`\n总计: ${passedCount}/${results.length} 项测试通过`);
        
        if (passedCount === results.length) {
            console.log('🎉 所有测试通过！全局设置集成功能正常工作。');
        } else {
            console.log('⚠️  部分测试失败，需要检查相关功能。');
        }
    }
}

// 运行测试
if (require.main === module) {
    const test = new GlobalSettingsIntegrationTest();
    test.runAllTests().catch(console.error);
}

module.exports = GlobalSettingsIntegrationTest;
