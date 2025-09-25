/**
 * 简化的全局设置测试 - 不依赖puppeteer
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class SimpleSettingsTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async testSettingsPageResponse() {
        console.log('🌐 测试1: 设置页面HTTP响应');
        
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}/settings`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`✅ HTTP状态码: ${res.statusCode}`);
                    console.log(`✅ 内容类型: ${res.headers['content-type']}`);
                    
                    // 检查关键内容
                    const hasTitle = data.includes('全局设置');
                    const hasForm = data.includes('aiConfigForm');
                    const hasInputs = data.includes('siliconflowKey') && 
                                     data.includes('doubaoKey') && 
                                     data.includes('deepseekKey');
                    const hasCSS = data.includes('/css/settings.css');
                    const hasJS = data.includes('/js/settings.js');
                    
                    console.log('✅ 页面内容检查:');
                    console.log(`  - 标题: ${hasTitle ? '✅' : '❌'}`);
                    console.log(`  - 表单: ${hasForm ? '✅' : '❌'}`);
                    console.log(`  - 输入框: ${hasInputs ? '✅' : '❌'}`);
                    console.log(`  - CSS文件: ${hasCSS ? '✅' : '❌'}`);
                    console.log(`  - JS文件: ${hasJS ? '✅' : '❌'}`);
                    
                    const success = res.statusCode === 200 && hasTitle && hasForm && hasInputs;
                    resolve(success);
                });
            });
            
            req.on('error', (err) => {
                console.error('❌ 请求失败:', err.message);
                resolve(false);
            });
            
            req.setTimeout(5000, () => {
                console.error('❌ 请求超时');
                req.destroy();
                resolve(false);
            });
        });
    }

    async testStaticFiles() {
        console.log('\n📁 测试2: 静态文件访问');
        
        const files = [
            '/css/settings.css',
            '/js/settings.js',
            '/css/custom.css'
        ];
        
        const results = [];
        
        for (const file of files) {
            const result = await this.testStaticFile(file);
            results.push(result);
        }
        
        const allSuccess = results.every(r => r);
        console.log(`✅ 静态文件测试: ${results.filter(r => r).length}/${results.length} 成功`);
        
        return allSuccess;
    }

    async testStaticFile(filePath) {
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}${filePath}`, (res) => {
                console.log(`  ${filePath}: ${res.statusCode} ${res.statusMessage}`);
                resolve(res.statusCode === 200);
            });
            
            req.on('error', (err) => {
                console.log(`  ${filePath}: ❌ ${err.message}`);
                resolve(false);
            });
            
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async testFileStructure() {
        console.log('\n📂 测试3: 文件结构检查');
        
        const requiredFiles = [
            'views/settings.ejs',
            'public/css/settings.css',
            'public/js/settings.js',
            'public/css/custom.css'
        ];
        
        let allExist = true;
        
        for (const file of requiredFiles) {
            const exists = fs.existsSync(path.join(__dirname, file));
            console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
            if (!exists) allExist = false;
        }
        
        return allExist;
    }

    async testJavaScriptSyntax() {
        console.log('\n🔍 测试4: JavaScript语法检查');
        
        const jsFiles = [
            'public/js/settings.js',
            'public/js/rename.js'
        ];
        
        let allValid = true;
        
        for (const file of jsFiles) {
            try {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                
                // 基本语法检查
                const hasClassDeclaration = content.includes('class ');
                const hasConstructor = content.includes('constructor(');
                const hasEventListener = content.includes('addEventListener');
                const hasLocalStorage = content.includes('localStorage');
                
                console.log(`  ${file}:`);
                console.log(`    - 类声明: ${hasClassDeclaration ? '✅' : '❌'}`);
                console.log(`    - 构造函数: ${hasConstructor ? '✅' : '❌'}`);
                console.log(`    - 事件监听: ${hasEventListener ? '✅' : '❌'}`);
                console.log(`    - 本地存储: ${hasLocalStorage ? '✅' : '❌'}`);
                
                if (!hasClassDeclaration || !hasConstructor) {
                    allValid = false;
                }
            } catch (error) {
                console.log(`  ${file}: ❌ 读取失败 - ${error.message}`);
                allValid = false;
            }
        }
        
        return allValid;
    }

    async testGlobalConfigIntegration() {
        console.log('\n🔗 测试5: 全局配置集成检查');
        
        try {
            const renameJsContent = fs.readFileSync(path.join(__dirname, 'public/js/rename.js'), 'utf8');
            
            // 检查关键集成代码
            const hasGlobalConfig = renameJsContent.includes('globalConfig');
            const hasConfigListener = renameJsContent.includes('globalAIConfigUpdated');
            const hasLoadGlobalConfig = renameJsContent.includes('loadGlobalConfig');
            const hasUpdateAPIKeys = renameJsContent.includes('updateAPIKeysFromGlobalConfig');
            
            console.log('  集成功能检查:');
            console.log(`    - 全局配置属性: ${hasGlobalConfig ? '✅' : '❌'}`);
            console.log(`    - 配置监听器: ${hasConfigListener ? '✅' : '❌'}`);
            console.log(`    - 配置加载方法: ${hasLoadGlobalConfig ? '✅' : '❌'}`);
            console.log(`    - API Key更新方法: ${hasUpdateAPIKeys ? '✅' : '❌'}`);
            
            return hasGlobalConfig && hasConfigListener && hasLoadGlobalConfig && hasUpdateAPIKeys;
        } catch (error) {
            console.error('❌ 集成检查失败:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 开始全局设置功能测试...\n');
        
        const results = [];
        
        try {
            results.push(await this.testFileStructure());
            results.push(await this.testJavaScriptSyntax());
            results.push(await this.testGlobalConfigIntegration());
            results.push(await this.testStaticFiles());
            results.push(await this.testSettingsPageResponse());
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
        }
        
        // 输出测试结果
        console.log('\n📊 测试结果汇总:');
        console.log('==================');
        const testNames = [
            '文件结构检查',
            'JavaScript语法检查',
            '全局配置集成检查',
            '静态文件访问',
            '设置页面HTTP响应'
        ];
        
        results.forEach((result, index) => {
            const status = result ? '✅ 通过' : '❌ 失败';
            console.log(`${testNames[index]}: ${status}`);
        });
        
        const passedCount = results.filter(r => r).length;
        console.log(`\n总计: ${passedCount}/${results.length} 项测试通过`);
        
        if (passedCount === results.length) {
            console.log('🎉 所有测试通过！全局设置功能基础架构正常。');
            console.log('\n📝 下一步建议:');
            console.log('1. 在浏览器中访问 http://localhost:3000/settings 测试界面');
            console.log('2. 测试配置保存和加载功能');
            console.log('3. 测试AI重命名功能是否正确使用全局配置');
        } else {
            console.log('⚠️  部分测试失败，需要检查相关功能。');
        }
        
        return passedCount === results.length;
    }
}

// 运行测试
if (require.main === module) {
    const test = new SimpleSettingsTest();
    test.runAllTests().catch(console.error);
}

module.exports = SimpleSettingsTest;
