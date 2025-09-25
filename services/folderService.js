// services/folderService.js - 文件夹管理服务
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FolderService {
    constructor() {
            // 常见文件扩展名分类（合并后的分类）
            this.fileCategories = {
                '图片': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.heic', '.heif'],
                '视频': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.f4v', '.m3u8'],
                '音频': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.amr'],
                '文档': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.md', '.odt', '.ods', '.odp', '.csv'],
                '压缩包': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.cab', '.iso'],
                '代码文件': [
                    // 网页开发
                    '.js', '.html', '.css', '.jsx', '.vue', '.scss', '.sass', '.less', '.ts', '.ejs', '.htm', '.mhtml',
                    // 编程语言
                    '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.hxx', '.php', '.rb', '.go', '.pyc',
                    // 脚本文件
                    '.sh', '.bash', '.zsh', '.fish', '.bat', '.ps1',
                    // 数据格式
                    '.json', '.xml', '.yaml', '.yml', '.sql',
                    // 配置文件
                    '.conf', '.config', '.ini', '.cfg', '.properties', '.env', '.toml', '.lock', '.sxcu'
                ],
                '设计文件': ['.psd', '.psb', '.ai', '.sketch', '.dxf', '.dwg'],
                '数据库文件': ['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb'],
                '日志文件': ['.log', '.logs'],
                '字体文件': ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
                '插件扩展': ['.vsix', '.rbz'],
                '调试文件': ['.pdb'],
                '可执行文件': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app', '.run', '.dll', '.so', '.dylib', '.apk']
            };
        }

        // 扫描目录，获取基本信息
    async scanDirectory(directory, includeSubfolders = true) {
        try {
            const stats = await fs.stat(directory);
            if (!stats.isDirectory()) {
                throw new Error('指定路径不是一个目录');
            }

            const result = {
                path: directory,
                totalFiles: 0,
                totalFolders: 0,
                emptyFolders: [],
                filesByExtension: {},
                duplicateFiles: [],
                totalSize: 0
            };

            await this._scanRecursive(directory, result, includeSubfolders);
            return result;
        } catch (error) {
            throw new Error(`扫描目录失败: ${error.message}`);
        }
    }

    // 递归扫描目录
    async _scanRecursive(dir, result, includeSubfolders = true) {
        try {
            const items = await fs.readdir(dir);

            if (items.length === 0) {
                result.emptyFolders.push(dir);
                return;
            }

            for (const item of items) {
                // 跳过隐藏文件和文件夹
                if (item.startsWith('.')) continue;

                const itemPath = path.join(dir, item);
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    result.totalFolders++;
                    // 只有在 includeSubfolders 为 true 时才递归扫描子目录
                    if (includeSubfolders) {
                        await this._scanRecursive(itemPath, result, includeSubfolders);
                    }
                } else {
                    result.totalFiles++;
                    result.totalSize += stats.size;

                    const ext = path.extname(item).toLowerCase();
                    if (!result.filesByExtension[ext]) {
                        result.filesByExtension[ext] = [];
                    }
                    result.filesByExtension[ext].push(itemPath);
                }
            }
        } catch (error) {
            console.error(`扫描目录 ${dir} 时出错:`, error);
        }
    }

    // 删除空文件夹
    async deleteEmptyFolders(directory, preview = false, includeSubfolders = true) {
        try {
            const emptyFolders = await this._findEmptyFolders(directory, includeSubfolders);

            if (preview) {
                return {
                    preview: true,
                    emptyFolders,
                    count: emptyFolders.length
                };
            }

            const deletedFolders = [];

            // 多次循环删除，因为删除一个空文件夹可能会让父文件夹变空
            let hasDeleted = true;
            while (hasDeleted) {
                hasDeleted = false;
                const currentEmptyFolders = await this._findEmptyFolders(directory, includeSubfolders);

                for (const folder of currentEmptyFolders) {
                    try {
                        await fs.rmdir(folder);
                        deletedFolders.push(folder);
                        hasDeleted = true;
                    } catch (error) {
                        console.error(`删除文件夹 ${folder} 失败:`, error);
                    }
                }
            }

            return {
                preview: false,
                deletedFolders,
                count: deletedFolders.length
            };
        } catch (error) {
            throw new Error(`删除空文件夹失败: ${error.message}`);
        }
    }

    // 查找空文件夹
    async _findEmptyFolders(directory, includeSubfolders = true) {
        const emptyFolders = [];

        async function checkDirectory(dir, currentDepth = 0, maxDepth = null) {
            try {
                const items = await fs.readdir(dir);
                const nonHiddenItems = items.filter(item => !item.startsWith('.'));

                if (nonHiddenItems.length === 0) {
                    // 不要将根目录本身标记为空文件夹
                    if (currentDepth > 0) {
                        emptyFolders.push(dir);
                    }
                    return;
                }

                // 检查子目录
                for (const item of nonHiddenItems) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        // 如果 includeSubfolders 为 false，只检查直接子目录（深度1）
                        // 如果 includeSubfolders 为 true，递归检查所有子目录
                        const shouldRecurse = includeSubfolders || currentDepth === 0;
                        if (shouldRecurse) {
                            await checkDirectory(itemPath, currentDepth + 1, maxDepth);
                        }
                    }
                }
            } catch (error) {
                console.error(`检查目录 ${dir} 时出错:`, error);
            }
        }

        await checkDirectory(directory, 0);
        return emptyFolders;
    }

    // 按扩展名分类文件
    async classifyByExtension(directory, preview = false, createSubfolders = true, includeSubfolders = true) {
        try {
            const files = await this._getAllFiles(directory, includeSubfolders);
            const classification = {};
            const operations = [];

            for (const filePath of files) {
                const ext = path.extname(filePath).toLowerCase();
                const category = this._getCategoryByExtension(ext);
                
                if (!classification[category]) {
                    classification[category] = [];
                }
                classification[category].push(filePath);

                if (createSubfolders) {
                    const targetDir = path.join(directory, category);
                    const fileName = path.basename(filePath);
                    const targetPath = path.join(targetDir, fileName);
                    
                    operations.push({
                        source: filePath,
                        target: targetPath,
                        category,
                        action: 'move'
                    });
                }
            }

            if (preview) {
                return {
                    preview: true,
                    classification,
                    operations,
                    totalFiles: files.length
                };
            }

            // 执行分类操作
            const results = {
                created: [],
                moved: [],
                errors: []
            };

            for (const [category, categoryFiles] of Object.entries(classification)) {
                if (createSubfolders && categoryFiles.length > 0) {
                    const categoryDir = path.join(directory, category);
                    
                    try {
                        await fs.mkdir(categoryDir, { recursive: true });
                        results.created.push(categoryDir);
                    } catch (error) {
                        if (error.code !== 'EEXIST') {
                            results.errors.push(`创建目录 ${categoryDir} 失败: ${error.message}`);
                            continue;
                        }
                    }

                    for (const filePath of categoryFiles) {
                        try {
                            const fileName = path.basename(filePath);
                            const targetPath = path.join(categoryDir, fileName);
                            await fs.rename(filePath, targetPath);
                            results.moved.push({ from: filePath, to: targetPath });
                        } catch (error) {
                            results.errors.push(`移动文件 ${filePath} 失败: ${error.message}`);
                        }
                    }
                }
            }

            return {
                preview: false,
                classification,
                results,
                totalFiles: files.length
            };
        } catch (error) {
            throw new Error(`文件分类失败: ${error.message}`);
        }
    }

    // 获取所有文件
    async _getAllFiles(directory, includeSubfolders = true) {
        const files = [];

        async function scanDir(dir, currentDepth = 0) {
            try {
                const items = await fs.readdir(dir);

                for (const item of items) {
                    if (item.startsWith('.')) continue;

                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        // 只有在 includeSubfolders 为 true 时才递归扫描子目录
                        if (includeSubfolders) {
                            await scanDir(itemPath, currentDepth + 1);
                        }
                    } else {
                        files.push(itemPath);
                    }
                }
            } catch (error) {
                console.error(`扫描目录 ${dir} 时出错:`, error);
            }
        }

        await scanDir(directory, 0);
        return files;
    }

    // 根据扩展名获取分类
    _getCategoryByExtension(ext) {
        for (const [category, extensions] of Object.entries(this.fileCategories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return '未分类';
    }

    // 获取目录统计信息
    async getDirectoryStats(directory, includeSubfolders = true) {
        try {
            const stats = {
                totalFiles: 0,
                totalFolders: 0,
                totalSize: 0,
                emptyFolders: 0,
                filesByCategory: {},
                largestFiles: []
            };

            const allFiles = [];
            await this._getStatsRecursive(directory, stats, allFiles, includeSubfolders, 0);

            // 获取最大的10个文件
            allFiles.sort((a, b) => b.size - a.size);
            stats.largestFiles = allFiles.slice(0, 10);

            // 统计空文件夹数量
            const emptyFolders = await this._findEmptyFolders(directory, includeSubfolders);
            stats.emptyFolders = emptyFolders.length;

            return stats;
        } catch (error) {
            throw new Error(`获取目录统计失败: ${error.message}`);
        }
    }

    // 递归获取统计信息
    async _getStatsRecursive(dir, stats, allFiles, includeSubfolders = true, currentDepth = 0) {
        try {
            const items = await fs.readdir(dir);

            for (const item of items) {
                if (item.startsWith('.')) continue;

                const itemPath = path.join(dir, item);
                const itemStats = await fs.stat(itemPath);

                if (itemStats.isDirectory()) {
                    stats.totalFolders++;
                    // 只有在 includeSubfolders 为 true 时才递归扫描子目录
                    if (includeSubfolders) {
                        await this._getStatsRecursive(itemPath, stats, allFiles, includeSubfolders, currentDepth + 1);
                    }
                } else {
                    stats.totalFiles++;
                    stats.totalSize += itemStats.size;

                    const ext = path.extname(item).toLowerCase();
                    const category = this._getCategoryByExtension(ext);

                    if (!stats.filesByCategory[category]) {
                        stats.filesByCategory[category] = { count: 0, size: 0 };
                    }
                    stats.filesByCategory[category].count++;
                    stats.filesByCategory[category].size += itemStats.size;

                    allFiles.push({
                        path: itemPath,
                        size: itemStats.size,
                        name: item
                    });
                }
            }
        } catch (error) {
            console.error(`获取统计信息时出错 ${dir}:`, error);
        }
    }

    // 移除重复文件（基于文件内容的MD5哈希）
    async removeDuplicateFiles(directory, preview = false, includeSubfolders = true) {
        try {
            const files = await this._getAllFiles(directory, includeSubfolders);
            const fileHashes = new Map();
            const duplicates = [];

            // 计算所有文件的哈希值
            for (const filePath of files) {
                try {
                    const hash = await this._getFileHash(filePath);
                    
                    if (fileHashes.has(hash)) {
                        duplicates.push({
                            original: fileHashes.get(hash),
                            duplicate: filePath
                        });
                    } else {
                        fileHashes.set(hash, filePath);
                    }
                } catch (error) {
                    console.error(`计算文件哈希失败 ${filePath}:`, error);
                }
            }

            if (preview) {
                return {
                    preview: true,
                    duplicates,
                    count: duplicates.length
                };
            }

            // 删除重复文件
            const deleted = [];
            const errors = [];

            for (const { duplicate } of duplicates) {
                try {
                    await fs.unlink(duplicate);
                    deleted.push(duplicate);
                } catch (error) {
                    errors.push(`删除文件 ${duplicate} 失败: ${error.message}`);
                }
            }

            return {
                preview: false,
                duplicates,
                deleted,
                errors,
                count: deleted.length
            };
        } catch (error) {
            throw new Error(`移除重复文件失败: ${error.message}`);
        }
    }

    // 计算文件的MD5哈希值
    async _getFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    // 格式化文件大小
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取指定分类的文件列表
    async getCategoryFiles(directoryPath, category, includeSubfolders = true) {
        try {
            // 首先扫描目录获取所有文件
            const scanResult = await this.scanDirectory(directoryPath, includeSubfolders);

            // scanDirectory 直接返回结果对象，不是包装格式
            const files = [];

            // 从 filesByExtension 中提取所有文件
            for (const [ext, filePaths] of Object.entries(scanResult.filesByExtension)) {
                // 使用扩展名获取文件分类
                const fileCategory = this._getCategoryByExtension(ext);

                // 如果这个扩展名的分类匹配目标分类，则处理这些文件
                if (fileCategory === category) {
                    for (const filePath of filePaths) {
                        try {
                            const stats = await fs.stat(filePath);
                            const fileName = path.basename(filePath);

                            files.push({
                                name: fileName,
                                path: filePath,
                                size: stats.size,
                                extension: ext
                            });
                        } catch (error) {
                            // 如果文件不存在或无法访问，跳过
                            console.warn(`无法访问文件 ${filePath}:`, error.message);
                        }
                    }
                }
            }

            // 按文件大小降序排序
            files.sort((a, b) => b.size - a.size);

            return files;
        } catch (error) {
            console.error('获取分类文件列表错误:', error);
            throw error;
        }
    }
}

module.exports = FolderService;
