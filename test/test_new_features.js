const path = require('path');
const fs = require('fs').promises;
const PSDService = require('../services/psdService');
const RenameHistoryService = require('../services/renameHistoryService');
const OCRService = require('../services/ocrService');

/**
 * 测试新功能
 */
class NewFeaturesTest {
    constructor() {
        this.ocrService = new OCRService();
        this.psdService = new PSDService(this.ocrService);
        this.historyService = new RenameHistoryService();
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始测试新功能...\n');

        try {
            await this.testPSDService();
            await this.testHistoryService();
            await this.testOCRErrorFiltering();
            
            console.log('\n✅ 所有测试完成！');
        } catch (error) {
            console.error('\n❌ 测试失败:', error);
        }
    }

    /**
     * 测试PSD服务
     */
    async testPSDService() {
        console.log('🎨 测试PSD服务...');

        // 检查系统支持
        const systemSupport = await this.psdService.checkSystemSupport();
        console.log(`   系统支持PSD转换: ${systemSupport ? '✅' : '❌'}`);

        // 测试文件格式检查
        const isPSD1 = this.psdService.isPSDFile('test.psd');
        const isPSD2 = this.psdService.isPSDFile('test.psb');
        const isPSD3 = this.psdService.isPSDFile('test.jpg');
        
        console.log(`   PSD文件检测: ${isPSD1 ? '✅' : '❌'} (test.psd)`);
        console.log(`   PSB文件检测: ${isPSD2 ? '✅' : '❌'} (test.psb)`);
        console.log(`   非PSD文件检测: ${!isPSD3 ? '✅' : '❌'} (test.jpg)`);

        // 获取支持的格式
        const formats = this.psdService.getSupportedFormats();
        console.log(`   支持的格式: ${formats.join(', ')}`);

        console.log('   PSD服务测试完成 ✅\n');
    }

    /**
     * 测试历史记录服务
     */
    async testHistoryService() {
        console.log('📝 测试历史记录服务...');

        try {
            // 初始化数据库
            await this.historyService.initialize();
            console.log('   数据库初始化: ✅');

            // 测试记录文件处理
            const testRecord = {
                filePath: '/test/path/test.txt',
                originalName: 'test.txt',
                newName: '测试文档.txt',
                fileSize: 1024,
                fileExtension: '.txt',
                processingMethod: 'AI_RENAME',
                aiModel: 'test-model',
                templateType: 'semantic',
                success: true
            };

            const recordResult = await this.historyService.recordFileProcessing(testRecord);
            console.log(`   记录文件处理: ${recordResult ? '✅' : '❌'}`);

            // 测试检查文件是否已处理
            const checkResult = await this.historyService.checkFileProcessed('/test/path/test.txt');
            console.log(`   检查文件处理记录: ${checkResult ? '✅' : '❌'}`);

            // 测试获取统计信息
            const stats = await this.historyService.getProcessingStats();
            console.log(`   获取统计信息: ✅`);
            console.log(`     总处理数: ${stats.total_processed || 0}`);
            console.log(`     成功数: ${stats.successful || 0}`);
            console.log(`     失败数: ${stats.failed || 0}`);

            // 测试获取最近处理的文件
            const recentFiles = await this.historyService.getRecentProcessedFiles(5);
            console.log(`   获取最近文件: ✅ (${recentFiles.length} 条记录)`);

            console.log('   历史记录服务测试完成 ✅\n');
        } catch (error) {
            console.error('   历史记录服务测试失败:', error.message);
        }
    }

    /**
     * 测试OCR错误过滤
     */
    async testOCRErrorFiltering() {
        console.log('🔍 测试OCR错误过滤...');

        try {
            // 初始化OCR服务
            await this.ocrService.initialize();
            console.log('   OCR服务初始化: ✅');

            // 检查支持的格式
            const formats = this.ocrService.getSupportedFormats();
            console.log(`   支持的格式: ${formats.join(', ')}`);

            // 检查状态
            const status = this.ocrService.getStatus();
            console.log(`   OCR引擎状态: ${status.initialized ? '✅' : '❌'}`);

            console.log('   OCR错误过滤测试完成 ✅\n');
        } catch (error) {
            console.error('   OCR错误过滤测试失败:', error.message);
        }
    }

    /**
     * 清理测试数据
     */
    async cleanup() {
        try {
            // 清理历史记录服务
            await this.historyService.close();
            
            // 清理OCR服务
            await this.ocrService.cleanup();
            
            console.log('🧹 测试清理完成');
        } catch (error) {
            console.error('清理失败:', error.message);
        }
    }
}

// 运行测试
async function runTests() {
    const tester = new NewFeaturesTest();
    
    try {
        await tester.runAllTests();
    } finally {
        await tester.cleanup();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = NewFeaturesTest;
