// services/fileOperationService.js - 文件操作服务
const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');

class FileOperationService {
    constructor(mainWindow = null) {
        this.mainWindow = mainWindow;
        
        // 支持的图片扩展名
        this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.heif', '.svg'];
        
        // 支持的文件类型过滤器
        this.fileFilters = {
            images: [
                { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'heif', 'svg'] },
                { name: '所有文件', extensions: ['*'] }
            ],
            all: [
                { name: '所有文件', extensions: ['*'] }
            ]
        };
    }

    // 设置主窗口引用
    setMainWindow(mainWindow) {
        this.mainWindow = mainWindow;
    }

    // 选择文件对话框
    async selectFiles(options = {}) {
        try {
            const defaultOptions = {
                properties: ['openFile', 'multiSelections'],
                filters: this.fileFilters.images
            };
            
            const dialogOptions = { ...defaultOptions, ...options };
            const result = await dialog.showOpenDialog(this.mainWindow, dialogOptions);

            if (!result.canceled && result.filePaths.length > 0) {
                const fileInfos = [];
                for (const filePath of result.filePaths) {
                    try {
                        const fileInfo = await this.getFileInfo(filePath);
                        if (fileInfo.success) {
                            fileInfos.push({
                                path: filePath,
                                name: fileInfo.info.name + fileInfo.info.extension,
                                size: fileInfo.info.size,
                                extension: fileInfo.info.extension,
                                directory: fileInfo.info.directory
                            });
                        }
                    } catch (error) {
                        console.error(`获取文件信息失败: ${filePath}`, error);
                    }
                }
                return { success: true, files: fileInfos };
            } else {
                return { success: false, canceled: true };
            }
        } catch (error) {
            console.error('选择文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 选择文件夹对话框
    async selectFolder(options = {}) {
        try {
            const defaultOptions = {
                properties: ['openDirectory'],
                title: '选择文件夹'
            };
            
            const dialogOptions = { ...defaultOptions, ...options };
            const result = await dialog.showOpenDialog(this.mainWindow, dialogOptions);

            if (!result.canceled && result.filePaths.length > 0) {
                const folderPath = result.filePaths[0];
                return { success: true, folderPath };
            } else {
                return { success: false, canceled: true };
            }
        } catch (error) {
            console.error('选择文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 选择保存文件夹对话框
    async selectSaveFolder(options = {}) {
        try {
            const defaultOptions = {
                properties: ['openDirectory', 'createDirectory'],
                title: '选择保存文件夹'
            };
            
            const dialogOptions = { ...defaultOptions, ...options };
            const result = await dialog.showOpenDialog(this.mainWindow, dialogOptions);

            if (!result.canceled && result.filePaths.length > 0) {
                const folderPath = result.filePaths[0];
                return { success: true, folderPath };
            } else {
                return { success: false, canceled: true };
            }
        } catch (error) {
            console.error('选择保存文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 扫描文件夹中的文件
    async scanFolder(folderPath, options = {}) {
        try {
            const {
                includeSubfolders = true,
                fileTypes = 'images', // 'images', 'all', 或自定义扩展名数组
                maxDepth = null
            } = options;

            let allowedExtensions;
            if (fileTypes === 'images') {
                allowedExtensions = this.imageExtensions;
            } else if (fileTypes === 'all') {
                allowedExtensions = null; // 允许所有文件
            } else if (Array.isArray(fileTypes)) {
                allowedExtensions = fileTypes.map(ext => ext.startsWith('.') ? ext : '.' + ext);
            } else {
                allowedExtensions = this.imageExtensions;
            }

            const files = [];

            const scanDirectory = async (dirPath, currentDepth = 0) => {
                if (maxDepth !== null && currentDepth > maxDepth) {
                    return;
                }

                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    // 跳过隐藏文件和文件夹
                    if (entry.name.startsWith('.')) continue;

                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        
                        // 检查文件扩展名
                        if (allowedExtensions === null || allowedExtensions.includes(ext)) {
                            const stats = await fs.stat(fullPath);
                            files.push({
                                path: fullPath,
                                name: entry.name,
                                size: stats.size,
                                extension: ext,
                                relativePath: path.relative(folderPath, fullPath),
                                directory: path.dirname(fullPath),
                                modified: stats.mtime,
                                created: stats.birthtime || stats.ctime
                            });
                        }
                    } else if (entry.isDirectory() && includeSubfolders) {
                        await scanDirectory(fullPath, currentDepth + 1);
                    }
                }
            };

            await scanDirectory(folderPath);
            return { success: true, files, totalCount: files.length };
        } catch (error) {
            console.error('扫描文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取文件信息
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const parsedPath = path.parse(filePath);
            return {
                success: true,
                info: {
                    size: stats.size,
                    directory: parsedPath.dir,
                    name: parsedPath.name,
                    extension: parsedPath.ext,
                    fullPath: filePath,
                    modified: stats.mtime,
                    created: stats.birthtime || stats.ctime,
                    isDirectory: stats.isDirectory(),
                    isFile: stats.isFile()
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 检查文件是否存在
    async checkFileExists(filePath) {
        try {
            await fs.access(filePath);
            return { success: true, exists: true };
        } catch {
            return { success: true, exists: false };
        }
    }

    // 读取文件内容
    async readFileContent(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            return { success: true, buffer: Array.from(buffer) };
        } catch (error) {
            console.error('读取文件内容失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 保存文件到指定路径
    async saveFileToPath(filePath, buffer, newExtension = null) {
        try {
            const originalPath = filePath;
            const parsedPath = path.parse(originalPath);
            
            // 如果扩展名不同，需要删除原文件并保存新文件
            if (newExtension && parsedPath.ext.toLowerCase() !== `.${newExtension}`.toLowerCase()) {
                const newPath = path.join(parsedPath.dir, parsedPath.name + `.${newExtension}`);
                
                // 保存新文件
                await fs.writeFile(newPath, Buffer.from(buffer));
                
                // 删除原文件
                try {
                    await fs.unlink(originalPath);
                    console.log(`✅ 已删除原文件: ${originalPath}`);
                } catch (error) {
                    console.warn(`⚠️ 删除原文件失败: ${error.message}`);
                }
                
                return { success: true, savedPath: newPath, deletedOriginal: true };
            } else {
                // 直接覆盖原文件
                await fs.writeFile(originalPath, Buffer.from(buffer));
                return { success: true, savedPath: originalPath, deletedOriginal: false };
            }
        } catch (error) {
            console.error('保存文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 批量保存文件到文件夹
    async saveFilesToFolder(folderPath, files, options = {}) {
        try {
            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const fileData of files) {
                try {
                    const { filename, buffer, originalPath } = fileData;
                    const targetPath = path.join(folderPath, filename);
                    
                    // 检查文件是否已存在，生成唯一文件名
                    let finalPath = targetPath;
                    let counter = 1;
                    while (await fs.access(finalPath).then(() => true).catch(() => false)) {
                        const parsedPath = path.parse(targetPath);
                        finalPath = path.join(parsedPath.dir, `${parsedPath.name}(${counter})${parsedPath.ext}`);
                        counter++;
                    }

                    // 保存文件
                    await fs.writeFile(finalPath, Buffer.from(buffer));
                    
                    results.push({
                        originalPath,
                        filename,
                        savedPath: finalPath,
                        success: true
                    });
                    
                    successCount++;
                    console.log(`✅ 已保存: ${finalPath}`);
                } catch (error) {
                    console.error(`❌ 保存失败: ${fileData.filename}`, error);
                    results.push({
                        originalPath: fileData.originalPath,
                        filename: fileData.filename,
                        error: error.message,
                        success: false
                    });
                    errorCount++;
                }
            }

            return {
                success: true,
                results,
                summary: {
                    total: files.length,
                    successful: successCount,
                    failed: errorCount,
                    savedToFolder: folderPath
                }
            };
        } catch (error) {
            console.error('批量保存文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 创建目录
    async createDirectory(dirPath, options = { recursive: true }) {
        try {
            await fs.mkdir(dirPath, options);
            return { success: true, path: dirPath };
        } catch (error) {
            if (error.code === 'EEXIST') {
                return { success: true, path: dirPath, existed: true };
            }
            console.error('创建目录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 删除文件
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            return { success: true, deletedPath: filePath };
        } catch (error) {
            console.error('删除文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 删除目录
    async deleteDirectory(dirPath, options = { recursive: true }) {
        try {
            if (options.recursive) {
                await fs.rm(dirPath, { recursive: true, force: true });
            } else {
                await fs.rmdir(dirPath);
            }
            return { success: true, deletedPath: dirPath };
        } catch (error) {
            console.error('删除目录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 移动/重命名文件
    async moveFile(sourcePath, targetPath) {
        try {
            await fs.rename(sourcePath, targetPath);
            return { success: true, sourcePath, targetPath };
        } catch (error) {
            console.error('移动文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 复制文件
    async copyFile(sourcePath, targetPath) {
        try {
            await fs.copyFile(sourcePath, targetPath);
            return { success: true, sourcePath, targetPath };
        } catch (error) {
            console.error('复制文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 扫描文件夹（通用版本，支持所有文件类型）
    async scanFolderGeneral(folderPath, options = {}) {
        try {
            const {
                includeSubfolders = true,
                maxDepth = null,
                includeHidden = false,
                useOptimized = true // 新增优化选项
            } = options;

            if (useOptimized) {
                return await this.scanFolderGeneralOptimized(folderPath, options);
            }

            // 原始版本保持不变（作为备用）
            const files = [];
            const folders = [];

            const scanDirectory = async (dirPath, currentDepth = 0) => {
                if (maxDepth !== null && currentDepth > maxDepth) {
                    return;
                }

                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    // 跳过隐藏文件和文件夹（除非明确包含）
                    if (!includeHidden && entry.name.startsWith('.')) continue;

                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isFile()) {
                        const stats = await fs.stat(fullPath);
                        const ext = path.extname(entry.name).toLowerCase();

                        files.push({
                            path: fullPath,
                            name: entry.name,
                            size: stats.size,
                            extension: ext,
                            relativePath: path.relative(folderPath, fullPath),
                            directory: path.dirname(fullPath),
                            modified: stats.mtime,
                            created: stats.birthtime || stats.ctime
                        });
                    } else if (entry.isDirectory()) {
                        const stats = await fs.stat(fullPath);

                        folders.push({
                            path: fullPath,
                            name: entry.name,
                            relativePath: path.relative(folderPath, fullPath),
                            modified: stats.mtime,
                            created: stats.birthtime || stats.ctime
                        });

                        if (includeSubfolders) {
                            await scanDirectory(fullPath, currentDepth + 1);
                        }
                    }
                }
            };

            await scanDirectory(folderPath);
            return {
                success: true,
                files,
                folders,
                totalFiles: files.length,
                totalFolders: folders.length
            };
        } catch (error) {
            console.error('扫描文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 优化版扫描文件夹
    async scanFolderGeneralOptimized(folderPath, options = {}) {
        try {
            const startTime = Date.now();
            const {
                includeSubfolders = true,
                maxDepth = null,
                includeHidden = false,
                progressCallback = null
            } = options;

            const files = [];
            const folders = [];

            // 进度状态
            const progressState = {
                processedItems: 0,
                totalItems: 0,
                callback: progressCallback
            };

            if (progressCallback) {
                progressCallback({
                    phase: 'start',
                    progress: 0,
                    message: '开始扫描目录...'
                });
            }

            const scanDirectory = async (dirPath, currentDepth = 0) => {
                if (maxDepth !== null && currentDepth > maxDepth) {
                    return;
                }

                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                // 分离文件和目录
                const fileEntries = [];
                const dirEntries = [];

                for (const entry of entries) {
                    // 跳过隐藏文件和文件夹（除非明确包含）
                    if (!includeHidden && entry.name.startsWith('.')) continue;

                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isFile()) {
                        fileEntries.push({ entry, fullPath });
                    } else if (entry.isDirectory()) {
                        dirEntries.push({ entry, fullPath });
                    }
                }

                // 批量处理文件
                if (fileEntries.length > 0) {
                    const fileStats = await Promise.all(
                        fileEntries.map(async ({ entry, fullPath }) => {
                            try {
                                const stats = await fs.stat(fullPath);
                                return {
                                    entry,
                                    fullPath,
                                    stats,
                                    success: true
                                };
                            } catch (error) {
                                console.error(`获取文件统计失败 ${fullPath}:`, error);
                                return { success: false };
                            }
                        })
                    );

                    // 处理文件结果
                    for (const result of fileStats) {
                        if (!result.success) continue;

                        const { entry, fullPath, stats } = result;
                        const ext = path.extname(entry.name).toLowerCase();

                        files.push({
                            path: fullPath,
                            name: entry.name,
                            size: stats.size,
                            extension: ext,
                            relativePath: path.relative(folderPath, fullPath),
                            directory: path.dirname(fullPath),
                            modified: stats.mtime,
                            created: stats.birthtime || stats.ctime
                        });
                    }

                    // 更新进度
                    if (progressState.callback) {
                        progressState.processedItems += fileEntries.length;
                        const progress = Math.min(95, Math.floor((progressState.processedItems / Math.max(progressState.processedItems + 100, 1000)) * 100));
                        progressState.callback({
                            phase: 'scanning',
                            progress,
                            message: `正在扫描: ${path.basename(dirPath)} (${fileEntries.length} 文件)`,
                            currentPath: dirPath,
                            filesFound: files.length,
                            foldersFound: folders.length
                        });
                    }
                }

                // 批量处理目录
                if (dirEntries.length > 0) {
                    const dirStats = await Promise.all(
                        dirEntries.map(async ({ entry, fullPath }) => {
                            try {
                                const stats = await fs.stat(fullPath);
                                return {
                                    entry,
                                    fullPath,
                                    stats,
                                    success: true
                                };
                            } catch (error) {
                                console.error(`获取目录统计失败 ${fullPath}:`, error);
                                return { success: false };
                            }
                        })
                    );

                    // 处理目录结果
                    for (const result of dirStats) {
                        if (!result.success) continue;

                        const { entry, fullPath, stats } = result;

                        folders.push({
                            path: fullPath,
                            name: entry.name,
                            relativePath: path.relative(folderPath, fullPath),
                            modified: stats.mtime,
                            created: stats.birthtime || stats.ctime
                        });

                        // 递归扫描子目录
                        if (includeSubfolders) {
                            await scanDirectory(fullPath, currentDepth + 1);
                        }
                    }
                }
            };

            await scanDirectory(folderPath);

            const endTime = Date.now();
            const scanTime = endTime - startTime;

            if (progressCallback) {
                progressCallback({
                    phase: 'complete',
                    progress: 100,
                    message: `扫描完成: ${files.length} 个文件, ${folders.length} 个文件夹`
                });
            }

            return {
                success: true,
                files,
                folders,
                totalFiles: files.length,
                totalFolders: folders.length,
                scanTime,
                optimized: true
            };
        } catch (error) {
            console.error('优化扫描文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = FileOperationService;
