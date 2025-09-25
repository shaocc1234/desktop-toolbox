/**
 * 测试设置页面布局修复
 */

const http = require('http');

class LayoutFixTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async testSettingsPageLayout() {
        console.log('🎨 测试设置页面布局修复');
        
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}/settings`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`✅ HTTP状态码: ${res.statusCode}`);
                    
                    // 检查布局结构
                    const hasAppContainer = data.includes('class="app-container"');
                    const hasSidebar = data.includes('class="sidebar bg-light border-end"');
                    const hasMainContent = data.includes('class="main-content"');
                    const hasResponsiveButton = data.includes('d-md-none');
                    const hasLayoutCSS = data.includes('/css/settings.css');
                    const hasMobileScript = data.includes('mobileSidebarToggle');
                    
                    console.log('✅ 布局结构检查:');
                    console.log(`  - App容器: ${hasAppContainer ? '✅' : '❌'}`);
                    console.log(`  - 侧边栏: ${hasSidebar ? '✅' : '❌'}`);
                    console.log(`  - 主内容区: ${hasMainContent ? '✅' : '❌'}`);
                    console.log(`  - 响应式按钮: ${hasResponsiveButton ? '✅' : '❌'}`);
                    console.log(`  - 布局CSS: ${hasLayoutCSS ? '✅' : '❌'}`);
                    console.log(`  - 移动端脚本: ${hasMobileScript ? '✅' : '❌'}`);
                    
                    // 检查是否移除了错误的布局元素
                    const noAsideTag = !data.includes('<aside class="sidebar"');
                    const noMainTag = !data.includes('<main class="main-content">');
                    
                    console.log('✅ 错误元素清理:');
                    console.log(`  - 移除错误aside标签: ${noAsideTag ? '✅' : '❌'}`);
                    console.log(`  - 移除错误main标签: ${noMainTag ? '✅' : '❌'}`);
                    
                    const success = res.statusCode === 200 && 
                                  hasAppContainer && 
                                  hasSidebar && 
                                  hasMainContent && 
                                  hasResponsiveButton &&
                                  noAsideTag &&
                                  noMainTag;
                    
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

    async testCSSLayoutRules() {
        console.log('\n📐 测试CSS布局规则');
        
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}/css/settings.css`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`✅ CSS文件状态码: ${res.statusCode}`);
                    
                    // 检查关键CSS规则
                    const hasMainContentMargin = data.includes('margin-left: 240px');
                    const hasMainContentWidth = data.includes('width: calc(100% - 240px)');
                    const hasCollapsedLayout = data.includes('margin-left: 48px');
                    const hasResponsiveRules = data.includes('@media (max-width: 1199px)');
                    const hasMobileRules = data.includes('@media (max-width: 767px)');
                    
                    console.log('✅ CSS布局规则检查:');
                    console.log(`  - 主内容区左边距: ${hasMainContentMargin ? '✅' : '❌'}`);
                    console.log(`  - 主内容区宽度: ${hasMainContentWidth ? '✅' : '❌'}`);
                    console.log(`  - 收起状态布局: ${hasCollapsedLayout ? '✅' : '❌'}`);
                    console.log(`  - 响应式规则: ${hasResponsiveRules ? '✅' : '❌'}`);
                    console.log(`  - 移动端规则: ${hasMobileRules ? '✅' : '❌'}`);
                    
                    const success = res.statusCode === 200 && 
                                  hasMainContentMargin && 
                                  hasMainContentWidth && 
                                  hasCollapsedLayout &&
                                  hasResponsiveRules &&
                                  hasMobileRules;
                    
                    resolve(success);
                });
            });
            
            req.on('error', (err) => {
                console.error('❌ CSS请求失败:', err.message);
                resolve(false);
            });
        });
    }

    async testOtherPagesLayout() {
        console.log('\n🔍 测试其他页面布局一致性');
        
        const pages = ['/rename', '/gallery', '/upload'];
        const results = [];
        
        for (const page of pages) {
            const result = await this.testPageLayoutStructure(page);
            results.push(result);
        }
        
        const allConsistent = results.every(r => r);
        console.log(`✅ 页面布局一致性: ${results.filter(r => r).length}/${results.length} 页面一致`);
        
        return allConsistent;
    }

    async testPageLayoutStructure(pagePath) {
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}${pagePath}`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const hasCorrectStructure = data.includes('class="app-container"') &&
                                              data.includes('class="sidebar bg-light border-end"') &&
                                              data.includes('class="main-content"');
                    
                    console.log(`  ${pagePath}: ${hasCorrectStructure ? '✅' : '❌'}`);
                    resolve(hasCorrectStructure);
                });
            });
            
            req.on('error', () => {
                console.log(`  ${pagePath}: ❌ 请求失败`);
                resolve(false);
            });
            
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async runAllTests() {
        console.log('🚀 开始设置页面布局修复测试...\n');
        
        const results = [];
        
        try {
            results.push(await this.testSettingsPageLayout());
            results.push(await this.testCSSLayoutRules());
            results.push(await this.testOtherPagesLayout());
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
        }
        
        // 输出测试结果
        console.log('\n📊 布局修复测试结果:');
        console.log('========================');
        const testNames = [
            '设置页面布局结构',
            'CSS布局规则',
            '页面布局一致性'
        ];
        
        results.forEach((result, index) => {
            const status = result ? '✅ 通过' : '❌ 失败';
            console.log(`${testNames[index]}: ${status}`);
        });
        
        const passedCount = results.filter(r => r).length;
        console.log(`\n总计: ${passedCount}/${results.length} 项测试通过`);
        
        if (passedCount === results.length) {
            console.log('🎉 布局修复成功！设置页面现在应该正确显示。');
            console.log('\n📝 修复内容:');
            console.log('1. ✅ 修正了HTML布局结构');
            console.log('2. ✅ 添加了响应式CSS规则');
            console.log('3. ✅ 实现了侧边栏自适应');
            console.log('4. ✅ 添加了移动端支持');
            console.log('\n🌐 请在浏览器中访问 http://localhost:3000/settings 查看效果');
        } else {
            console.log('⚠️  部分测试失败，布局可能仍有问题。');
        }
        
        return passedCount === results.length;
    }
}

// 运行测试
if (require.main === module) {
    const test = new LayoutFixTest();
    test.runAllTests().catch(console.error);
}

module.exports = LayoutFixTest;
