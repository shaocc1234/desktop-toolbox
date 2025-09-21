// services/optimizedFolderService.js - 优化版文件夹管理服务
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
// const { Worker } = require('worker_threads'); // 暂时注释，后续实现

class OptimizedFolderService {
    constructor() {
        this.cache = new Map(); // 目录缓存
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存过期
    }

    // 优化版扫描目录 - 使用 withFileTypes 减少 stat 调用
    async scanDirectoryOptimized(directory, includeSubfolders = true, progressCallback = null) {
        try {
            const cacheKey = `${directory}:${includeSubfolders}`;
            const cached = this.cache.get(cacheKey);

            // 检查缓存
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                // 验证目录是否有变化
                const dirStat = await fs.stat(directory);
                if (dirStat.mtime.getTime() <= cached.mtime) {
                    console.log('使用缓存结果');
                    if (progressCallback) {
                        progressCallback({
                            phase: 'complete',
                            progress: 100,
                            message: '使用缓存结果',
                            fromCache: true
                        });
                    }
                    return cached.data;
                }
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

            // 初始化进度
            const progressState = {
                processedItems: 0,
                totalItems: 0,
                currentPhase: 'scanning',
                callback: progressCallback
            };

            if (progressCallback) {
                progressCallback({
                    phase: 'start',
                    progress: 0,
                    message: '开始扫描目录...'
                });
            }

            await this._scanRecursiveOptimized(directory, result, includeSubfolders, progressState);

            if (progressCallback) {
                progressCallback({
                    phase: 'complete',
                    progress: 100,
                    message: `扫描完成: ${result.totalFiles} 个文件, ${result.totalFolders} 个文件夹`
                });
            }

            // 缓存结果
            const dirStat = await fs.stat(directory);
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
                mtime: dirStat.mtime.getTime()
            });

            return result;
        } catch (error) {
            throw new Error(`扫描目录失败: ${error.message}`);
        }
    }

    // 优化版递归扫描 - 使用 withFileTypes
    async _scanRecursiveOptimized(dir, result, includeSubfolders = true, progressState = null) {
        try {
            // 使用 withFileTypes 避免额外的 stat 调用
            const entries = await fs.readdir(dir, { withFileTypes: true });

            if (entries.length === 0) {
                result.emptyFolders.push(dir);
                return;
            }

            // 批量处理文件和目录
            const files = [];
            const directories = [];

            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue;

                const itemPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    directories.push(itemPath);
                } else if (entry.isFile()) {
                    files.push({ path: itemPath, name: entry.name });
                }
            }

            // 更新进度
            if (progressState && progressState.callback) {
                progressState.processedItems += entries.length;
                const progress = Math.min(95, Math.floor((progressState.processedItems / Math.max(progressState.processedItems + 100, 1000)) * 100));
                progressState.callback({
                    phase: 'scanning',
                    progress,
                    message: `正在扫描: ${path.basename(dir)} (${files.length} 文件, ${directories.length} 文件夹)`,
                    currentPath: dir,
                    filesFound: result.totalFiles + files.length,
                    foldersFound: result.totalFolders + directories.length
                });
            }

            // 处理文件
            await this._processFiles(files, result);

            // 处理目录
            result.totalFolders += directories.length;
            if (includeSubfolders) {
                // 可以在这里实现并行处理
                for (const dirPath of directories) {
                    await this._scanRecursiveOptimized(dirPath, result, includeSubfolders, progressState);
                }
            }

        } catch (error) {
            console.error(`扫描目录 ${dir} 时出错:`, error);
        }
    }

    // 批量处理文件信息
    async _processFiles(files, result) {
        if (files.length === 0) return;

        // 批量获取文件统计信息
        const fileStats = await Promise.all(
            files.map(async (file) => {
                try {
                    const stats = await fs.stat(file.path);
                    return { ...file, stats };
                } catch (error) {
                    console.error(`获取文件统计失败 ${file.path}:`, error);
                    return null;
                }
            })
        );

        // 处理统计结果
        for (const fileInfo of fileStats) {
            if (!fileInfo) continue;

            result.totalFiles++;
            result.totalSize += fileInfo.stats.size;

            const ext = path.extname(fileInfo.name).toLowerCase();
            if (!result.filesByExtension[ext]) {
                result.filesByExtension[ext] = [];
            }
            result.filesByExtension[ext].push(fileInfo.path);
        }
    }

    // 并行扫描版本（适用于大目录）
    async scanDirectoryParallel(directory, includeSubfolders = true, maxWorkers = 4) {
        try {
            const result = {
                path: directory,
                totalFiles: 0,
                totalFolders: 0,
                emptyFolders: [],
                filesByExtension: {},
                duplicateFiles: [],
                totalSize: 0
            };

            // 获取顶级目录列表
            const entries = await fs.readdir(directory, { withFileTypes: true });
            const topLevelDirs = entries
                .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
                .map(entry => path.join(directory, entry.name));

            if (topLevelDirs.length === 0 || !includeSubfolders) {
                // 如果没有子目录或不包含子文件夹，使用普通扫描
                return await this.scanDirectoryOptimized(directory, includeSubfolders);
            }

            // 处理根目录的文件
            const rootFiles = entries
                .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
                .map(entry => ({ path: path.join(directory, entry.name), name: entry.name }));
            
            await this._processFiles(rootFiles, result);

            // 并行处理子目录
            const chunkSize = Math.ceil(topLevelDirs.length / maxWorkers);
            const chunks = [];
            for (let i = 0; i < topLevelDirs.length; i += chunkSize) {
                chunks.push(topLevelDirs.slice(i, i + chunkSize));
            }

            const promises = chunks.map(chunk => 
                this._scanDirectoriesChunk(chunk, includeSubfolders)
            );

            const chunkResults = await Promise.all(promises);

            // 合并结果
            for (const chunkResult of chunkResults) {
                result.totalFiles += chunkResult.totalFiles;
                result.totalFolders += chunkResult.totalFolders;
                result.totalSize += chunkResult.totalSize;
                result.emptyFolders.push(...chunkResult.emptyFolders);

                // 合并文件扩展名统计
                for (const [ext, files] of Object.entries(chunkResult.filesByExtension)) {
                    if (!result.filesByExtension[ext]) {
                        result.filesByExtension[ext] = [];
                    }
                    result.filesByExtension[ext].push(...files);
                }
            }

            return result;
        } catch (error) {
            throw new Error(`并行扫描目录失败: ${error.message}`);
        }
    }

    // 扫描目录块
    async _scanDirectoriesChunk(directories, includeSubfolders) {
        const result = {
            totalFiles: 0,
            totalFolders: 0,
            emptyFolders: [],
            filesByExtension: {},
            totalSize: 0
        };

        for (const dir of directories) {
            await this._scanRecursiveOptimized(dir, result, includeSubfolders);
        }

        return result;
    }

    // 清理缓存
    clearCache() {
        this.cache.clear();
    }

    // 获取缓存统计
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    // 继承原有的其他方法，保持接口兼容性

    // 删除空文件夹（优化版）
    async deleteEmptyFolders(directory, preview = false, includeSubfolders = true) {
        try {
            const emptyFolders = await this._findEmptyFoldersOptimized(directory, includeSubfolders);

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
                const currentEmptyFolders = await this._findEmptyFoldersOptimized(directory, includeSubfolders);

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

    // 优化版查找空文件夹
    async _findEmptyFoldersOptimized(directory, includeSubfolders = true) {
        const emptyFolders = [];

        async function checkDirectory(dir, currentDepth = 0) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                const nonHiddenEntries = entries.filter(entry => !entry.name.startsWith('.'));

                if (nonHiddenEntries.length === 0) {
                    // 不要将根目录本身标记为空文件夹
                    if (currentDepth > 0) {
                        emptyFolders.push(dir);
                    }
                    return;
                }

                // 检查子目录
                const directories = nonHiddenEntries.filter(entry => entry.isDirectory());
                for (const dirEntry of directories) {
                    const itemPath = path.join(dir, dirEntry.name);
                    // 如果 includeSubfolders 为 false，只检查直接子目录（深度1）
                    // 如果 includeSubfolders 为 true，递归检查所有子目录
                    const shouldRecurse = includeSubfolders || currentDepth === 0;
                    if (shouldRecurse) {
                        await checkDirectory(itemPath, currentDepth + 1);
                    }
                }
            } catch (error) {
                console.error(`检查目录 ${dir} 时出错:`, error);
            }
        }

        await checkDirectory(directory, 0);
        return emptyFolders;
    }

    // 优化版文件分类
    async classifyByExtension(directory, preview = false, createSubfolders = true, includeSubfolders = true) {
        try {
            const files = await this._getAllFilesOptimized(directory, includeSubfolders);
            const classification = {};
            const operations = [];

            // 按扩展名分类
            for (const filePath of files) {
                const ext = path.extname(filePath).toLowerCase();
                const category = this._getCategoryByExtension(ext);

                if (!classification[category]) {
                    classification[category] = [];
                }
                classification[category].push(filePath);

                if (!preview) {
                    const targetDir = path.join(directory, category);
                    const targetPath = path.join(targetDir, path.basename(filePath));

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
                    operations: Object.entries(classification).flatMap(([category, files]) =>
                        files.map(file => ({
                            source: file,
                            target: path.join(directory, category, path.basename(file)),
                            category,
                            action: 'move'
                        }))
                    ),
                    totalFiles: files.length
                };
            }

            // 执行分类操作
            const results = [];
            for (const [category, categoryFiles] of Object.entries(classification)) {
                if (categoryFiles.length === 0) continue;

                const targetDir = path.join(directory, category);

                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                }

                for (const filePath of categoryFiles) {
                    try {
                        const targetPath = path.join(targetDir, path.basename(filePath));
                        await fs.rename(filePath, targetPath);
                        results.push({
                            source: filePath,
                            target: targetPath,
                            category,
                            status: 'success'
                        });
                    } catch (error) {
                        results.push({
                            source: filePath,
                            category,
                            status: 'error',
                            error: error.message
                        });
                    }
                }
            }

            return {
                preview: false,
                results,
                totalFiles: files.length,
                successCount: results.filter(r => r.status === 'success').length
            };
        } catch (error) {
            throw new Error(`文件分类失败: ${error.message}`);
        }
    }

    // 优化版获取所有文件
    async _getAllFilesOptimized(directory, includeSubfolders = true) {
        const files = [];

        async function scanDir(dir, currentDepth = 0) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue;

                    const itemPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        // 只有在 includeSubfolders 为 true 时才递归扫描子目录
                        if (includeSubfolders) {
                            await scanDir(itemPath, currentDepth + 1);
                        }
                    } else if (entry.isFile()) {
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

    // 扩展名分类方法
    _getCategoryByExtension(ext) {
        const categories = {
            '图片': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff'],
            '视频': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp'],
            '音频': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus'],
            '文档': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'],
            '压缩包': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
            '代码': ['.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go'],
            '可执行文件': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app']
        };

        for (const [category, extensions] of Object.entries(categories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }

        return ext ? `${ext.substring(1).toUpperCase()}文件` : '无扩展名文件';
    }

    // 优化版重复文件检测
    async removeDuplicateFiles(directory, preview = false, includeSubfolders = true) {
        try {
            const files = await this._getAllFilesOptimized(directory, includeSubfolders);
            const fileHashes = new Map();
            const duplicates = [];

            // 批量计算文件哈希
            console.log(`开始计算 ${files.length} 个文件的哈希值...`);
            const hashPromises = files.map(async (filePath) => {
                try {
                    const stats = await fs.stat(filePath);
                    // 只对小于100MB的文件计算哈希
                    if (stats.size > 100 * 1024 * 1024) {
                        return null;
                    }

                    const content = await fs.readFile(filePath);
                    const hash = crypto.createHash('md5').update(content).digest('hex');

                    return { filePath, hash, size: stats.size };
                } catch (error) {
                    console.error(`计算文件哈希失败 ${filePath}:`, error);
                    return null;
                }
            });

            const hashResults = await Promise.all(hashPromises);

            // 查找重复文件
            for (const result of hashResults) {
                if (!result) continue;

                const { filePath, hash, size } = result;

                if (fileHashes.has(hash)) {
                    duplicates.push({
                        original: fileHashes.get(hash),
                        duplicate: filePath,
                        hash,
                        size
                    });
                } else {
                    fileHashes.set(hash, filePath);
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
            const deletedFiles = [];
            for (const dup of duplicates) {
                try {
                    await fs.unlink(dup.duplicate);
                    deletedFiles.push(dup.duplicate);
                } catch (error) {
                    console.error(`删除重复文件失败 ${dup.duplicate}:`, error);
                }
            }

            return {
                preview: false,
                deletedFiles,
                count: deletedFiles.length,
                savedSpace: duplicates.reduce((total, dup) => total + dup.size, 0)
            };
        } catch (error) {
            throw new Error(`重复文件处理失败: ${error.message}`);
        }
    }

    // 优化版目录统计
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
            await this._getStatsRecursiveOptimized(directory, stats, allFiles, includeSubfolders, 0);

            // 查找空文件夹
            const emptyFolders = await this._findEmptyFoldersOptimized(directory, includeSubfolders);
            stats.emptyFolders = emptyFolders.length;

            // 排序最大文件
            stats.largestFiles = allFiles
                .sort((a, b) => b.size - a.size)
                .slice(0, 10);

            return stats;
        } catch (error) {
            throw new Error(`获取目录统计失败: ${error.message}`);
        }
    }

    // 优化版递归统计
    async _getStatsRecursiveOptimized(dir, stats, allFiles, includeSubfolders = true, currentDepth = 0) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            // 分离文件和目录
            const files = entries.filter(entry => entry.isFile() && !entry.name.startsWith('.'));
            const directories = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));

            // 批量处理文件
            if (files.length > 0) {
                const fileStats = await Promise.all(
                    files.map(async (fileEntry) => {
                        try {
                            const filePath = path.join(dir, fileEntry.name);
                            const fileStat = await fs.stat(filePath);
                            return {
                                path: filePath,
                                name: fileEntry.name,
                                size: fileStat.size,
                                ext: path.extname(fileEntry.name).toLowerCase()
                            };
                        } catch (error) {
                            console.error(`获取文件统计失败 ${fileEntry.name}:`, error);
                            return null;
                        }
                    })
                );

                // 处理文件统计
                for (const fileInfo of fileStats) {
                    if (!fileInfo) continue;

                    stats.totalFiles++;
                    stats.totalSize += fileInfo.size;

                    const category = this._getCategoryByExtension(fileInfo.ext);
                    if (!stats.filesByCategory[category]) {
                        stats.filesByCategory[category] = { count: 0, size: 0 };
                    }
                    stats.filesByCategory[category].count++;
                    stats.filesByCategory[category].size += fileInfo.size;

                    allFiles.push(fileInfo);
                }
            }

            // 处理目录
            stats.totalFolders += directories.length;
            if (includeSubfolders) {
                for (const dirEntry of directories) {
                    const dirPath = path.join(dir, dirEntry.name);
                    await this._getStatsRecursiveOptimized(dirPath, stats, allFiles, includeSubfolders, currentDepth + 1);
                }
            }

        } catch (error) {
            console.error(`获取统计信息时出错 ${dir}:`, error);
        }
    }
}

module.exports = OptimizedFolderService;
