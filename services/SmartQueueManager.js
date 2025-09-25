/**
 * 智能队列管理器
 * 实现智能文件处理队列，优化处理顺序，避免单个错误影响整体进度
 */

class SmartQueueManager {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.failed = new Map(); // 失败文件及其重试次数
        this.errorStats = {
            timeout: 0,
            rateLimit: 0,
            serverError: 0,
            other: 0
        };
        this.lastErrorTime = null;
        this.consecutiveErrors = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5秒基础重试延迟
    }

    /**
     * 添加文件到队列
     * @param {Array} files 文件列表
     */
    addFiles(files) {
        const prioritizedFiles = this.prioritizeFiles(files);
        this.queue.push(...prioritizedFiles);
        console.log(`📋 队列中添加 ${files.length} 个文件，当前队列长度: ${this.queue.length}`);
    }

    /**
     * 文件优先级排序
     * @param {Array} files 文件列表
     * @returns {Array} 排序后的文件列表
     */
    prioritizeFiles(files) {
        return files.sort((a, b) => {
            // 优先处理小文件
            const sizeA = a.size || 0;
            const sizeB = b.size || 0;
            
            // 图片文件优先级较低（因为容易出错）
            const isImageA = this.isImageFile(a.name || a.path);
            const isImageB = this.isImageFile(b.name || b.path);
            
            if (isImageA && !isImageB) return 1;
            if (!isImageA && isImageB) return -1;
            
            // 按文件大小排序
            return sizeA - sizeB;
        });
    }

    /**
     * 判断是否为图片文件
     * @param {string} fileName 文件名
     * @returns {boolean} 是否为图片
     */
    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif'];
        const ext = require('path').extname(fileName).toLowerCase();
        return imageExtensions.includes(ext);
    }

    /**
     * 获取下一个要处理的文件
     * @returns {Object|null} 文件对象或null
     */
    getNextFile() {
        // 如果连续错误过多，暂停一段时间
        if (this.shouldPause()) {
            return null;
        }

        // 从队列中获取下一个文件
        while (this.queue.length > 0) {
            const file = this.queue.shift();
            const fileName = file.name || file.path;
            
            // 检查是否已经在处理中
            if (this.processing.has(fileName)) {
                continue;
            }
            
            // 检查是否需要重试
            const failCount = this.failed.get(fileName) || 0;
            if (failCount >= this.maxRetries) {
                console.log(`⏭️ 跳过文件 ${fileName}，已达到最大重试次数`);
                continue;
            }
            
            // 标记为处理中
            this.processing.add(fileName);
            return file;
        }
        
        return null;
    }

    /**
     * 标记文件处理成功
     * @param {string} fileName 文件名
     */
    markSuccess(fileName) {
        this.processing.delete(fileName);
        this.failed.delete(fileName);
        this.consecutiveErrors = 0;
        console.log(`✅ 文件处理成功: ${fileName}`);
    }

    /**
     * 标记文件处理失败
     * @param {string} fileName 文件名
     * @param {Error} error 错误对象
     * @param {boolean} shouldRetry 是否应该重试
     */
    markFailure(fileName, error, shouldRetry = true) {
        this.processing.delete(fileName);
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        
        // 更新错误统计
        this.updateErrorStats(error);
        
        if (shouldRetry) {
            const failCount = (this.failed.get(fileName) || 0) + 1;
            this.failed.set(fileName, failCount);
            
            if (failCount < this.maxRetries) {
                // 重新加入队列，但降低优先级
                const file = { name: fileName, path: fileName, retryCount: failCount };
                this.queue.push(file);
                console.log(`🔄 文件重新加入队列: ${fileName} (重试 ${failCount}/${this.maxRetries})`);
            } else {
                console.log(`❌ 文件达到最大重试次数: ${fileName}`);
            }
        }
    }

    /**
     * 更新错误统计
     * @param {Error} error 错误对象
     */
    updateErrorStats(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) {
            this.errorStats.timeout++;
        } else if (message.includes('rate limit') || message.includes('429')) {
            this.errorStats.rateLimit++;
        } else if (message.includes('server error') || message.includes('500')) {
            this.errorStats.serverError++;
        } else {
            this.errorStats.other++;
        }
    }

    /**
     * 判断是否应该暂停处理
     * @returns {boolean} 是否暂停
     */
    shouldPause() {
        // 如果连续错误过多，暂停处理
        if (this.consecutiveErrors >= 5) {
            const timeSinceLastError = Date.now() - (this.lastErrorTime || 0);
            const pauseDuration = Math.min(this.consecutiveErrors * 2000, 30000); // 最多暂停30秒
            
            if (timeSinceLastError < pauseDuration) {
                return true;
            } else {
                // 重置连续错误计数
                this.consecutiveErrors = 0;
            }
        }
        
        // 如果速率限制错误过多，暂停处理
        if (this.errorStats.rateLimit > 10) {
            const timeSinceLastError = Date.now() - (this.lastErrorTime || 0);
            if (timeSinceLastError < 60000) { // 暂停1分钟
                return true;
            }
        }
        
        return false;
    }

    /**
     * 获取队列状态
     * @returns {Object} 队列状态
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: this.processing.size,
            failed: this.failed.size,
            consecutiveErrors: this.consecutiveErrors,
            errorStats: { ...this.errorStats },
            shouldPause: this.shouldPause()
        };
    }

    /**
     * 清空队列
     */
    clear() {
        this.queue = [];
        this.processing.clear();
        this.failed.clear();
        this.errorStats = {
            timeout: 0,
            rateLimit: 0,
            serverError: 0,
            other: 0
        };
        this.consecutiveErrors = 0;
        this.lastErrorTime = null;
    }

    /**
     * 获取建议的处理策略
     * @returns {Object} 处理策略建议
     */
    getProcessingStrategy() {
        const status = this.getStatus();
        
        let strategy = {
            concurrency: 3,
            delay: 1000,
            useOCRFallback: false,
            skipImages: false
        };
        
        // 根据错误统计调整策略
        if (status.errorStats.rateLimit > 5) {
            strategy.concurrency = 1;
            strategy.delay = 5000;
            strategy.useOCRFallback = true;
        }
        
        if (status.errorStats.timeout > 3) {
            strategy.concurrency = Math.max(1, strategy.concurrency - 1);
            strategy.delay = Math.max(strategy.delay, 3000);
        }
        
        if (status.consecutiveErrors > 3) {
            strategy.skipImages = true;
            strategy.useOCRFallback = true;
        }
        
        return strategy;
    }
}

module.exports = SmartQueueManager;
