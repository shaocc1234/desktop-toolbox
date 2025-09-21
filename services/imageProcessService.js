// services/imageProcessService.js - 图片处理服务
const sharp = require('sharp');
const path = require('path');

class ImageProcessService {
    constructor() {
        // 支持的图片格式
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg', 'heic', 'heif'];
        
        // 默认处理选项
        this.defaultOptions = {
            quality: 80,
            format: 'original',
            maxWidth: null,
            maxHeight: null,
            removeMetadata: false,
            progressive: false
        };
    }

    /**
     * 验证文件是否为支持的图片格式
     * @param {string} filename - 文件名
     * @param {string} mimetype - MIME类型
     * @returns {boolean} 是否支持
     */
    isValidImageFile(filename, mimetype) {
        const ext = path.extname(filename).toLowerCase().substring(1);
        const mimeValid = mimetype && mimetype.startsWith('image/');
        const extValid = this.supportedFormats.includes(ext);
        
        return mimeValid && extValid;
    }

    /**
     * 获取图片元数据信息
     * @param {Buffer} buffer - 图片缓冲区
     * @returns {Promise<Object>} 图片信息
     */
    async getImageInfo(buffer) {
        try {
            const metadata = await sharp(buffer).metadata();
            
            return {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels,
                depth: metadata.depth,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                hasProfile: metadata.hasProfile,
                size: buffer.length,
                colorspace: metadata.space,
                orientation: metadata.orientation
            };
        } catch (error) {
            throw new Error(`获取图片信息失败: ${error.message}`);
        }
    }

    /**
     * 处理单张图片
     * @param {Buffer} buffer - 图片缓冲区
     * @param {Object} options - 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processImage(buffer, options = {}) {
        try {
            // 合并选项
            const opts = { ...this.defaultOptions, ...options };
            
            // 创建Sharp实例
            let sharpInstance = sharp(buffer);
            
            // 获取原始元数据
            const originalMetadata = await sharpInstance.metadata();
            
            // 尺寸调整
            if (opts.maxWidth || opts.maxHeight) {
                const resizeOptions = {
                    fit: 'inside',
                    withoutEnlargement: true
                };
                
                if (opts.maxWidth) resizeOptions.width = parseInt(opts.maxWidth);
                if (opts.maxHeight) resizeOptions.height = parseInt(opts.maxHeight);
                
                sharpInstance = sharpInstance.resize(resizeOptions);
            }

            // 确定输出格式
            let outputFormat = opts.format === 'original' ? originalMetadata.format : opts.format;
            
            // 应用格式特定的选项
            sharpInstance = this.applyFormatOptions(sharpInstance, outputFormat, opts);
            
            // 处理元数据
            if (opts.removeMetadata) {
                sharpInstance = sharpInstance.withMetadata({});
            }
            
            // 执行处理
            const processedBuffer = await sharpInstance.toBuffer();
            const processedMetadata = await sharp(processedBuffer).metadata();
            
            // 计算压缩统计
            const originalSize = buffer.length;
            const processedSize = processedBuffer.length;
            const compressionRatio = ((originalSize - processedSize) / originalSize * 100);
            
            return {
                success: true,
                originalSize,
                processedSize,
                compressionRatio: Math.max(0, compressionRatio).toFixed(2),
                format: outputFormat,
                width: processedMetadata.width,
                height: processedMetadata.height,
                buffer: processedBuffer,
                metadata: processedMetadata
            };
            
        } catch (error) {
            throw new Error(`图片处理失败: ${error.message}`);
        }
    }

    /**
     * 批量处理图片
     * @param {Array} files - 文件数组 [{buffer, originalname}]
     * @param {Object} options - 处理选项
     * @returns {Promise<Object>} 批量处理结果
     */
    async processBatch(files, options = {}) {
        const results = [];
        let totalOriginalSize = 0;
        let totalProcessedSize = 0;
        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
            try {
                const result = await this.processImage(file.buffer, options);
                
                results.push({
                    originalName: file.originalname,
                    success: true,
                    ...result
                });
                
                totalOriginalSize += result.originalSize;
                totalProcessedSize += result.processedSize;
                successCount++;
                
            } catch (error) {
                console.error(`处理文件 ${file.originalname} 失败:`, error);
                
                results.push({
                    originalName: file.originalname,
                    success: false,
                    error: error.message
                });
                
                failCount++;
            }
        }

        const totalCompressionRatio = totalOriginalSize > 0 
            ? ((totalOriginalSize - totalProcessedSize) / totalOriginalSize * 100).toFixed(2)
            : 0;

        return {
            success: true,
            results,
            summary: {
                total: files.length,
                successful: successCount,
                failed: failCount,
                totalOriginalSize,
                totalProcessedSize,
                totalSaved: totalOriginalSize - totalProcessedSize,
                averageCompressionRatio: totalCompressionRatio
            }
        };
    }

    /**
     * 应用格式特定的处理选项
     * @param {Sharp} sharpInstance - Sharp实例
     * @param {string} format - 输出格式
     * @param {Object} options - 选项
     * @returns {Sharp} 配置后的Sharp实例
     */
    applyFormatOptions(sharpInstance, format, options) {
        const quality = parseInt(options.quality) || 80;
        const progressive = options.progressive === true || options.progressive === 'true';

        switch (format.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                return sharpInstance.jpeg({
                    quality: Math.max(1, Math.min(100, quality)),
                    progressive: progressive,
                    mozjpeg: true // 使用mozjpeg编码器获得更好的压缩
                });

            case 'png':
                return sharpInstance.png({
                    quality: Math.max(1, Math.min(100, quality)),
                    progressive: progressive,
                    compressionLevel: this.qualityToCompressionLevel(quality),
                    adaptiveFiltering: true
                });

            case 'webp':
                return sharpInstance.webp({
                    quality: Math.max(1, Math.min(100, quality)),
                    effort: 6, // 最高压缩努力度
                    lossless: quality >= 95
                });

            case 'gif':
                // GIF不支持质量设置，但可以优化
                return sharpInstance.gif({
                    effort: 7
                });

            case 'bmp':
                return sharpInstance.bmp();

            case 'tiff':
                return sharpInstance.tiff({
                    quality: Math.max(1, Math.min(100, quality)),
                    compression: 'lzw'
                });

            default:
                return sharpInstance;
        }
    }

    /**
     * 将质量值转换为PNG压缩级别
     * @param {number} quality - 质量值 (1-100)
     * @returns {number} 压缩级别 (0-9)
     */
    qualityToCompressionLevel(quality) {
        // 质量越高，压缩级别越低
        return Math.max(0, Math.min(9, Math.round((100 - quality) / 11)));
    }

    /**
     * 获取推荐的处理设置
     * @param {string} scenario - 使用场景
     * @returns {Object} 推荐设置
     */
    getRecommendedSettings(scenario) {
        const presets = {
            web: {
                quality: 75,
                format: 'webp',
                maxWidth: 1920,
                removeMetadata: true,
                progressive: true
            },
            social: {
                quality: 80,
                format: 'jpeg',
                maxWidth: 1080,
                removeMetadata: true,
                progressive: false
            },
            print: {
                quality: 95,
                format: 'original',
                maxWidth: null,
                removeMetadata: false,
                progressive: false
            },
            archive: {
                quality: 85,
                format: 'jpeg',
                maxWidth: 2048,
                removeMetadata: true,
                progressive: true
            },
            thumbnail: {
                quality: 60,
                format: 'jpeg',
                maxWidth: 400,
                maxHeight: 400,
                removeMetadata: true,
                progressive: false
            }
        };

        return presets[scenario] || presets.web;
    }

    /**
     * 验证处理选项
     * @param {Object} options - 处理选项
     * @returns {Object} 验证后的选项
     */
    validateOptions(options) {
        const validated = { ...this.defaultOptions };

        // 验证质量
        if (options.quality !== undefined) {
            const quality = parseInt(options.quality);
            validated.quality = Math.max(1, Math.min(100, isNaN(quality) ? 80 : quality));
        }

        // 验证格式
        if (options.format && (options.format === 'original' || this.supportedFormats.includes(options.format))) {
            validated.format = options.format;
        }

        // 验证尺寸
        if (options.maxWidth) {
            const width = parseInt(options.maxWidth);
            validated.maxWidth = width > 0 && width <= 10000 ? width : null;
        }

        if (options.maxHeight) {
            const height = parseInt(options.maxHeight);
            validated.maxHeight = height > 0 && height <= 10000 ? height : null;
        }

        // 验证布尔选项
        validated.removeMetadata = options.removeMetadata === true || options.removeMetadata === 'true';
        validated.progressive = options.progressive === true || options.progressive === 'true';

        return validated;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = ImageProcessService;
