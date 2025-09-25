// services/classificationService.js - 统一文件分类服务
const fs = require('fs').promises;
const path = require('path');

class ClassificationService {
    constructor() {
        // 分类策略注册表
        this.strategies = new Map();
        
        // 注册默认分类策略
        this.registerStrategy('extension', new ExtensionClassificationStrategy());
        this.registerStrategy('date', new DateClassificationStrategy());
        this.registerStrategy('size', new SizeClassificationStrategy());
        this.registerStrategy('hybrid', new HybridClassificationStrategy());
        this.registerStrategy('folder', new FolderClassificationStrategy());
        
        // 文件扩展名分类配置
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

    // 注册分类策略
    registerStrategy(name, strategy) {
        this.strategies.set(name, strategy);
    }

    // 获取分类策略
    getStrategy(name) {
        return this.strategies.get(name);
    }

    // 获取所有可用的分类策略
    getAvailableStrategies() {
        return Array.from(this.strategies.keys()).map(key => ({
            id: key,
            name: this.getStrategyDisplayName(key),
            description: this.getStrategyDescription(key),
            options: this.getStrategyOptions(key)
        }));
    }

    // 获取策略显示名称
    getStrategyDisplayName(strategyId) {
        const names = {
            'extension': '按文件类型分类',
            'date': '按时间分类',
            'size': '按文件大小分类',
            'hybrid': '混合分类',
            'folder': '文件夹分类'
        };
        return names[strategyId] || strategyId;
    }

    // 获取策略描述
    getStrategyDescription(strategyId) {
        const descriptions = {
            'extension': '根据文件扩展名将文件分类到不同的类型文件夹中',
            'date': '根据文件的修改时间或创建时间按年份、年月等时间维度分类，可选择包含根目录下的直接子文件夹',
            'size': '根据文件大小将文件分类到不同的大小范围文件夹中',
            'hybrid': '组合多种分类方式，支持多层级分类结构',
            'folder': '专门对根目录下的直接子文件夹按时间、大小或名称进行分类整理'
        };
        return descriptions[strategyId] || '自定义分类策略';
    }

    // 获取策略选项
    getStrategyOptions(strategyId) {
        const strategy = this.getStrategy(strategyId);
        return strategy ? strategy.getOptions() : [];
    }

    // 统一分类接口
    async classifyFiles(directory, options = {}) {
        const {
            strategy = 'extension',
            preview = false,
            createSubfolders = true,
            includeSubfolders = true,
            strategyOptions = {}
        } = options;

        try {
            // 验证目录是否存在
            const stats = await fs.stat(directory);
            if (!stats.isDirectory()) {
                throw new Error('指定路径不是一个目录');
            }

            // 获取分类策略
            const classificationStrategy = this.getStrategy(strategy);
            if (!classificationStrategy) {
                throw new Error(`未知的分类策略: ${strategy}`);
            }

            // 获取所有文件
            console.log(`开始扫描目录: ${directory}`);
            const files = await this._getAllFiles(directory, includeSubfolders);
            console.log(`找到 ${files.length} 个文件`);

            // 对于时间分类策略，如果启用了文件夹分类，则不需要预先获取文件
            let itemsToProcess = files;
            if (strategy === 'date' && strategyOptions.includeFolders) {
                // 时间分类策略会自己获取文件和文件夹
                itemsToProcess = [];
            }

            if (files.length === 0 && (!strategyOptions.includeFolders || strategy !== 'date')) {
                return {
                    success: true,
                    strategy,
                    preview: true,
                    classification: {},
                    totalFiles: 0,
                    message: '目录中没有找到文件'
                };
            }

            // 执行分类
            const result = await classificationStrategy.classify(itemsToProcess, {
                directory,
                preview,
                createSubfolders,
                strategyOptions,
                fileCategories: this.fileCategories
            });

            return {
                success: true,
                strategy,
                ...result
            };

        } catch (error) {
            console.error('文件分类错误:', error);
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
                        if (includeSubfolders) {
                            await scanDir(itemPath, currentDepth + 1);
                        }
                    } else {
                        files.push({
                            path: itemPath,
                            name: item,
                            size: stats.size,
                            mtime: stats.mtime,
                            ctime: stats.ctime,
                            extension: path.extname(item).toLowerCase(),
                            type: 'file'
                        });
                    }
                }
            } catch (error) {
                console.error(`扫描目录 ${dir} 时出错:`, error);
            }
        }

        await scanDir(directory, 0);
        return files;
    }

    // 获取所有文件和文件夹
    async _getAllFilesAndFolders(directory, includeSubfolders = true, includeFolders = true) {
        const items = [];

        async function scanDir(dir, currentDepth = 0) {
            try {
                const dirItems = await fs.readdir(dir);

                for (const item of dirItems) {
                    if (item.startsWith('.')) continue;

                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        // 添加文件夹信息
                        if (includeFolders && currentDepth === 0) { // 只包含顶级文件夹
                            items.push({
                                path: itemPath,
                                name: item,
                                size: await this._getFolderSize(itemPath),
                                mtime: stats.mtime,
                                ctime: stats.ctime,
                                type: 'folder'
                            });
                        }

                        // 递归扫描子目录中的文件
                        if (includeSubfolders) {
                            await scanDir(itemPath, currentDepth + 1);
                        }
                    } else {
                        // 添加文件信息
                        items.push({
                            path: itemPath,
                            name: item,
                            size: stats.size,
                            mtime: stats.mtime,
                            ctime: stats.ctime,
                            extension: path.extname(item).toLowerCase(),
                            type: 'file'
                        });
                    }
                }
            } catch (error) {
                console.error(`扫描目录 ${dir} 时出错:`, error);
            }
        }

        await scanDir(directory, 0);
        return items;
    }

    // 获取文件夹大小
    async _getFolderSize(folderPath) {
        let totalSize = 0;

        try {
            const items = await fs.readdir(folderPath);

            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    totalSize += await this._getFolderSize(itemPath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            console.error(`计算文件夹大小时出错 ${folderPath}:`, error);
        }

        return totalSize;
    }

    // 根据扩展名获取文件类型
    getCategoryByExtension(ext) {
        for (const [category, extensions] of Object.entries(this.fileCategories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return '未分类';
    }

    // 格式化文件大小
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 分类策略基类
class ClassificationStrategy {
    async classify(files, options) {
        throw new Error('子类必须实现 classify 方法');
    }

    getOptions() {
        return [];
    }
}

// 扩展名分类策略
class ExtensionClassificationStrategy extends ClassificationStrategy {
    async classify(files, options) {
        const { directory, preview, createSubfolders, fileCategories } = options;
        const classification = {};
        const operations = [];

        for (const file of files) {
            const category = this._getCategoryByExtension(file.extension, fileCategories);
            
            if (!classification[category]) {
                classification[category] = [];
            }
            classification[category].push(file.path);

            if (!preview && createSubfolders) {
                const targetDir = path.join(directory, category);
                const targetPath = path.join(targetDir, file.name);
                
                operations.push({
                    source: file.path,
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
                totalFiles: files.length
            };
        }

        // 执行分类操作
        const results = await this._executeOperations(operations, createSubfolders);
        
        return {
            preview: false,
            classification,
            results,
            totalFiles: files.length
        };
    }

    _getCategoryByExtension(ext, fileCategories) {
        for (const [category, extensions] of Object.entries(fileCategories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return '未分类';
    }

    async _executeOperations(operations, createSubfolders) {
        const results = {
            created: [],
            moved: [],
            errors: []
        };

        // 按目录分组操作
        const operationsByDir = {};
        for (const op of operations) {
            const targetDir = path.dirname(op.target);
            if (!operationsByDir[targetDir]) {
                operationsByDir[targetDir] = [];
            }
            operationsByDir[targetDir].push(op);
        }

        // 创建目录并移动文件
        for (const [targetDir, dirOperations] of Object.entries(operationsByDir)) {
            try {
                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                    results.created.push(targetDir);
                }

                for (const op of dirOperations) {
                    try {
                        await fs.rename(op.source, op.target);
                        results.moved.push({ from: op.source, to: op.target });
                    } catch (error) {
                        results.errors.push(`移动文件 ${op.source} 失败: ${error.message}`);
                    }
                }
            } catch (error) {
                results.errors.push(`创建目录 ${targetDir} 失败: ${error.message}`);
            }
        }

        return results;
    }

    getOptions() {
        return [
            {
                id: 'customCategories',
                name: '自定义分类',
                type: 'boolean',
                default: false,
                description: '是否允许自定义文件类型分类'
            }
        ];
    }
}

// 时间分类策略
class DateClassificationStrategy extends ClassificationStrategy {
    // 静态方法：获取所有文件和文件夹
    static async _getAllFilesAndFolders(directory, includeSubfolders = true, includeFolders = true) {
        const items = [];
        console.log(`开始扫描目录: ${directory}, includeSubfolders: ${includeSubfolders}, includeFolders: ${includeFolders}`);

        async function scanDir(dir, currentDepth = 0) {
            try {
                const dirItems = await fs.readdir(dir);
                console.log(`扫描目录 ${dir}，深度 ${currentDepth}，找到 ${dirItems.length} 个项目`);

                for (const item of dirItems) {
                    if (item.startsWith('.')) continue;

                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        // 添加文件夹信息 - 只包含根目录下的直接子文件夹（二级文件夹）
                        if (includeFolders && currentDepth === 0) {
                            console.log(`添加二级文件夹: ${item}`);
                            items.push({
                                path: itemPath,
                                name: item,
                                size: await DateClassificationStrategy._getFolderSize(itemPath),
                                mtime: stats.mtime,
                                ctime: stats.ctime,
                                type: 'folder'
                            });
                        }

                        // 递归扫描逻辑：
                        // 1. 如果包含文件夹分类，则不递归扫描子目录（避免扫描过深）
                        // 2. 如果不包含文件夹分类，则正常递归扫描所有子目录中的文件
                        if (includeSubfolders && !includeFolders) {
                            // 普通的文件扫描，递归所有子目录
                            await scanDir(itemPath, currentDepth + 1);
                        } else if (includeFolders) {
                            // 文件夹分类模式：不递归扫描，只处理根目录的直接子文件夹
                            console.log(`文件夹分类模式：跳过递归扫描 ${item}`);
                        }
                    } else {
                        // 添加文件信息
                        items.push({
                            path: itemPath,
                            name: item,
                            size: stats.size,
                            mtime: stats.mtime,
                            ctime: stats.ctime,
                            extension: path.extname(item).toLowerCase(),
                            type: 'file'
                        });
                    }
                }
            } catch (error) {
                console.error(`扫描目录 ${dir} 时出错:`, error);
            }
        }

        await scanDir(directory, 0);
        console.log(`扫描完成，共找到 ${items.length} 个项目，其中文件夹 ${items.filter(item => item.type === 'folder').length} 个`);
        return items;
    }

    // 静态方法：获取文件夹大小
    static async _getFolderSize(folderPath) {
        let totalSize = 0;

        try {
            const items = await fs.readdir(folderPath);

            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    totalSize += await DateClassificationStrategy._getFolderSize(itemPath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            console.error(`计算文件夹大小时出错 ${folderPath}:`, error);
        }

        return totalSize;
    }

    // 静态方法：只获取根目录下的直接子文件夹（专用于文件夹分类）
    static async _getDirectSubfolders(directory) {
        const folders = [];
        console.log(`获取根目录下的直接子文件夹: ${directory}`);

        try {
            const items = await fs.readdir(directory);
            console.log(`根目录中找到 ${items.length} 个项目`);

            for (const item of items) {
                if (item.startsWith('.')) continue;

                const itemPath = path.join(directory, item);
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    // 检查是否为年份文件夹，如果是则跳过
                    if (DateClassificationStrategy._isYearFolder(item)) {
                        console.log(`跳过年份文件夹: ${item}`);
                        continue;
                    }

                    console.log(`添加二级文件夹: ${item}`);

                    // 获取更精确的创建时间（参考Python脚本）
                    const creationTime = await DateClassificationStrategy._getAccurateCreationTime(itemPath);

                    folders.push({
                        path: itemPath,
                        name: item,
                        size: await DateClassificationStrategy._getFolderSize(itemPath),
                        mtime: stats.mtime,
                        ctime: creationTime || stats.ctime, // 使用精确的创建时间
                        type: 'folder'
                    });
                }
            }
        } catch (error) {
            console.error(`扫描根目录 ${directory} 时出错:`, error);
        }

        console.log(`找到 ${folders.length} 个二级文件夹`);
        return folders;
    }

    // 静态方法：检查文件夹名是否为年份格式（20xx年）
    static _isYearFolder(folderName) {
        // 匹配 20xx年 格式的文件夹名
        const yearPattern = /^20\d{2}年$/;
        return yearPattern.test(folderName);
    }

    // 静态方法：只获取根目录下的直接文件（专用于文件夹分类时包含根目录文件）
    static async _getDirectFiles(directory) {
        const files = [];
        console.log(`获取根目录下的直接文件: ${directory}`);

        try {
            const items = await fs.readdir(directory);
            console.log(`根目录中找到 ${items.length} 个项目`);

            for (const item of items) {
                if (item.startsWith('.')) continue;

                const itemPath = path.join(directory, item);
                const stats = await fs.stat(itemPath);

                if (!stats.isDirectory()) {
                    console.log(`添加根目录文件: ${item}`);

                    // 获取更精确的创建时间
                    const creationTime = await DateClassificationStrategy._getAccurateCreationTime(itemPath);

                    files.push({
                        path: itemPath,
                        name: item,
                        size: stats.size,
                        mtime: stats.mtime,
                        ctime: creationTime || stats.ctime,
                        extension: path.extname(item).toLowerCase(),
                        type: 'file'
                    });
                }
            }
        } catch (error) {
            console.error(`扫描根目录文件 ${directory} 时出错:`, error);
        }

        console.log(`找到 ${files.length} 个根目录直接文件`);
        return files;
    }

    // 静态方法：获取精确的文件/文件夹创建时间（参考Python脚本）
    static async _getAccurateCreationTime(itemPath) {
        try {
            // 在macOS上使用stat命令获取更精确的创建时间
            if (process.platform === 'darwin') {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);

                try {
                    const { stdout } = await execAsync(`stat -f %B "${itemPath}"`);
                    const timestamp = parseFloat(stdout.trim());
                    if (!isNaN(timestamp)) {
                        return new Date(timestamp * 1000); // 转换为Date对象
                    }
                } catch (error) {
                    console.log(`获取精确创建时间失败，使用默认方法: ${itemPath}`);
                }
            }

            // 其他系统或获取失败时使用默认方法
            const stats = await fs.stat(itemPath);
            return stats.birthtime || stats.ctime;
        } catch (error) {
            console.error(`获取创建时间出错: ${itemPath}`, error);
            return new Date(); // 返回当前时间作为fallback
        }
    }
    async classify(items, options) {
        const { directory, preview, createSubfolders, strategyOptions = {} } = options;
        const {
            dateFormat = 'year', // year, yearMonth, yearMonthDay
            useModifyTime = true, // true: 修改时间, false: 创建时间
            includeFolders = false // 是否包含文件夹分类
        } = strategyOptions;

        // 根据选项获取文件和/或文件夹
        let itemsToClassify;
        if (includeFolders) {
            // 获取文件和根目录下的直接子文件夹（二级文件夹）
            console.log(`时间分类策略：获取文件和二级文件夹，目录: ${directory}`);

            // 获取根目录下的直接文件（不递归）
            const directFiles = await DateClassificationStrategy._getDirectFiles(directory);
            // 获取根目录下的直接子文件夹
            const folders = await DateClassificationStrategy._getDirectSubfolders(directory);

            // 合并文件和文件夹
            itemsToClassify = [...directFiles, ...folders];

            console.log(`时间分类策略：找到 ${itemsToClassify.length} 个项目`);
            console.log(`其中根目录直接文件: ${directFiles.length} 个`);
            console.log(`其中二级文件夹: ${folders.length} 个`);
        } else {
            itemsToClassify = items; // 使用传入的文件列表
            console.log(`时间分类策略：使用传入的文件列表，共 ${itemsToClassify.length} 个文件`);
        }

        const classification = {};
        const operations = [];

        // 对每个项目进行分类（参考Python脚本的逻辑）
        for (const item of itemsToClassify) {
            try {
                // 如果是文件夹且为年份格式，跳过处理
                if (item.type === 'folder' && DateClassificationStrategy._isYearFolder(item.name)) {
                    console.log(`跳过年份文件夹: ${item.name}`);
                    continue;
                }

                // 获取时间（参考Python脚本的时间处理）
                const date = useModifyTime ? item.mtime : item.ctime;
                const category = this._formatDate(date, dateFormat);

                // 检查是否试图将文件夹移动到自己内部（避免循环移动）
                if (item.type === 'folder' && item.name === category) {
                    console.log(`跳过循环移动: ${item.name} -> ${category}/ (目标和源相同)`);
                    continue;
                }

                console.log(`处理项目: ${item.name}, 类型: ${item.type}, 时间: ${date}, 分类: ${category}`);

                if (!classification[category]) {
                    classification[category] = [];
                }
                classification[category].push(item.path);

                if (!preview && createSubfolders) {
                    const targetDir = path.join(directory, category);
                    const targetPath = path.join(targetDir, item.name);

                    operations.push({
                        source: item.path,
                        target: targetPath,
                        category,
                        action: item.type === 'folder' ? 'moveFolder' : 'move',
                        type: item.type,
                        name: item.name
                    });

                    console.log(`准备${item.type === 'folder' ? '移动文件夹' : '移动文件'}: ${item.name} -> ${category}/`);
                }
            } catch (error) {
                console.error(`处理项目时出错: ${item.path}`, error);
            }
        }

        if (preview) {
            return {
                preview: true,
                classification,
                totalFiles: itemsToClassify.filter(item => item.type === 'file').length,
                totalFolders: itemsToClassify.filter(item => item.type === 'folder').length,
                totalItems: itemsToClassify.length
            };
        }

        // 执行分类操作
        const results = await this._executeOperations(operations, createSubfolders);

        return {
            preview: false,
            classification,
            results,
            totalFiles: itemsToClassify.filter(item => item.type === 'file').length,
            totalFolders: itemsToClassify.filter(item => item.type === 'folder').length,
            totalItems: itemsToClassify.length
        };
    }

    _formatDate(date, format) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (format) {
            case 'year':
                return `${year}年`;
            case 'yearMonth':
                return `${year}年${month}月`;
            case 'yearMonthDay':
                return `${year}年${month}月${day}日`;
            default:
                return `${year}年`;
        }
    }

    async _executeOperations(operations, createSubfolders) {
        const results = {
            created: [],
            moved: [],
            errors: []
        };

        // 按目录分组操作
        const operationsByDir = {};
        for (const op of operations) {
            const targetDir = path.dirname(op.target);
            if (!operationsByDir[targetDir]) {
                operationsByDir[targetDir] = [];
            }
            operationsByDir[targetDir].push(op);
        }

        // 创建目录并移动文件/文件夹
        for (const [targetDir, dirOperations] of Object.entries(operationsByDir)) {
            try {
                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                    results.created.push(targetDir);
                }

                for (const op of dirOperations) {
                    try {
                        if (op.action === 'moveFolder') {
                            // 移动文件夹
                            await this._moveFolder(op.source, op.target);
                            results.moved.push({ from: op.source, to: op.target, type: 'folder' });
                        } else {
                            // 移动文件
                            await fs.rename(op.source, op.target);
                            results.moved.push({ from: op.source, to: op.target, type: 'file' });
                        }
                    } catch (error) {
                        const itemType = op.type === 'folder' ? '文件夹' : '文件';
                        results.errors.push(`移动${itemType} ${op.source} 失败: ${error.message}`);
                    }
                }
            } catch (error) {
                results.errors.push(`创建目录 ${targetDir} 失败: ${error.message}`);
            }
        }

        return results;
    }

    // 移动文件夹的辅助方法（参考Python脚本的逻辑）
    async _moveFolder(sourcePath, targetPath) {
        try {
            console.log(`准备移动文件夹: ${sourcePath} -> ${targetPath}`);

            // 检查是否试图将文件夹移动到自己内部（防止循环移动）
            if (targetPath.startsWith(sourcePath + path.sep)) {
                throw new Error(`无法将文件夹移动到自己内部: ${sourcePath} -> ${targetPath}`);
            }

            // 检查源路径是否存在
            try {
                await fs.access(sourcePath);
            } catch (error) {
                throw new Error(`源文件夹不存在: ${sourcePath}`);
            }

            // 检查目标路径是否已存在
            try {
                await fs.access(targetPath);
                // 如果目标已存在，生成新的名称（参考Python脚本的处理方式）
                const baseName = path.basename(targetPath);
                const targetDir = path.dirname(targetPath);
                let counter = 1;
                let newTargetPath = targetPath;

                while (true) {
                    try {
                        await fs.access(newTargetPath);
                        newTargetPath = path.join(targetDir, `${baseName}_${counter}`);
                        counter++;
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            targetPath = newTargetPath;
                            break;
                        }
                        throw error;
                    }
                }
                console.log(`目标已存在，使用新名称: ${targetPath}`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // 确保目标目录存在
            const targetDir = path.dirname(targetPath);
            await fs.mkdir(targetDir, { recursive: true });

            // 使用 rename 移动文件夹（类似Python的shutil.move）
            await fs.rename(sourcePath, targetPath);
            console.log(`成功移动文件夹: ${path.basename(sourcePath)} -> ${targetPath}`);

        } catch (error) {
            console.error(`移动文件夹失败: ${sourcePath}`, error);
            throw new Error(`移动文件夹失败: ${error.message}`);
        }
    }

    getOptions() {
        return [
            {
                id: 'dateFormat',
                name: '时间格式',
                type: 'select',
                options: [
                    { value: 'year', label: '按年份 (2024年)' },
                    { value: 'yearMonth', label: '按年月 (2024年01月)' },
                    { value: 'yearMonthDay', label: '按年月日 (2024年01月15日)' }
                ],
                default: 'year',
                description: '选择时间分类的格式'
            },
            {
                id: 'useModifyTime',
                name: '使用修改时间',
                type: 'boolean',
                default: true,
                description: '使用文件修改时间，否则使用创建时间'
            },
            {
                id: 'includeFolders',
                name: '包含文件夹分类',
                type: 'boolean',
                default: false,
                description: '同时对根目录下的直接子文件夹（二级文件夹）按时间进行分类'
            }
        ];
    }
}

// 文件大小分类策略
class SizeClassificationStrategy extends ClassificationStrategy {
    async classify(files, options) {
        const { directory, preview, createSubfolders, strategyOptions = {} } = options;
        const {
            sizeRanges = [
                { name: '小文件', min: 0, max: 1024 * 1024 }, // < 1MB
                { name: '中等文件', min: 1024 * 1024, max: 100 * 1024 * 1024 }, // 1MB - 100MB
                { name: '大文件', min: 100 * 1024 * 1024, max: Infinity } // > 100MB
            ]
        } = strategyOptions;

        const classification = {};
        const operations = [];

        for (const file of files) {
            const category = this._getSizeCategory(file.size, sizeRanges);

            if (!classification[category]) {
                classification[category] = [];
            }
            classification[category].push(file.path);

            if (!preview && createSubfolders) {
                const targetDir = path.join(directory, category);
                const targetPath = path.join(targetDir, file.name);

                operations.push({
                    source: file.path,
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
                totalFiles: files.length
            };
        }

        // 执行分类操作
        const results = await this._executeOperations(operations, createSubfolders);

        return {
            preview: false,
            classification,
            results,
            totalFiles: files.length
        };
    }

    _getSizeCategory(fileSize, sizeRanges) {
        for (const range of sizeRanges) {
            if (fileSize >= range.min && fileSize < range.max) {
                return range.name;
            }
        }
        return '未分类大小';
    }

    async _executeOperations(operations, createSubfolders) {
        const results = {
            created: [],
            moved: [],
            errors: []
        };

        // 按目录分组操作
        const operationsByDir = {};
        for (const op of operations) {
            const targetDir = path.dirname(op.target);
            if (!operationsByDir[targetDir]) {
                operationsByDir[targetDir] = [];
            }
            operationsByDir[targetDir].push(op);
        }

        // 创建目录并移动文件
        for (const [targetDir, dirOperations] of Object.entries(operationsByDir)) {
            try {
                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                    results.created.push(targetDir);
                }

                for (const op of dirOperations) {
                    try {
                        await fs.rename(op.source, op.target);
                        results.moved.push({ from: op.source, to: op.target });
                    } catch (error) {
                        results.errors.push(`移动文件 ${op.source} 失败: ${error.message}`);
                    }
                }
            } catch (error) {
                results.errors.push(`创建目录 ${targetDir} 失败: ${error.message}`);
            }
        }

        return results;
    }

    getOptions() {
        return [
            {
                id: 'sizeRanges',
                name: '大小范围',
                type: 'custom',
                default: [
                    { name: '小文件', min: 0, max: 1024 * 1024 },
                    { name: '中等文件', min: 1024 * 1024, max: 100 * 1024 * 1024 },
                    { name: '大文件', min: 100 * 1024 * 1024, max: Infinity }
                ],
                description: '自定义文件大小分类范围'
            }
        ];
    }
}

// 混合分类策略
class HybridClassificationStrategy extends ClassificationStrategy {
    async classify(files, options) {
        const { directory, preview, createSubfolders, strategyOptions = {}, fileCategories } = options;
        const {
            primaryStrategy = 'extension', // 主分类策略
            secondaryStrategy = 'date', // 次分类策略
            primaryOptions = {},
            secondaryOptions = {}
        } = strategyOptions;

        const classification = {};
        const operations = [];

        for (const file of files) {
            // 获取主分类
            const primaryCategory = this._getCategory(file, primaryStrategy, {
                ...primaryOptions,
                fileCategories
            });

            // 获取次分类
            const secondaryCategory = this._getCategory(file, secondaryStrategy, {
                ...secondaryOptions,
                fileCategories
            });

            // 组合分类路径
            const combinedCategory = path.join(primaryCategory, secondaryCategory);

            if (!classification[combinedCategory]) {
                classification[combinedCategory] = [];
            }
            classification[combinedCategory].push(file.path);

            if (!preview && createSubfolders) {
                const targetDir = path.join(directory, combinedCategory);
                const targetPath = path.join(targetDir, file.name);

                operations.push({
                    source: file.path,
                    target: targetPath,
                    category: combinedCategory,
                    action: 'move'
                });
            }
        }

        if (preview) {
            return {
                preview: true,
                classification,
                totalFiles: files.length
            };
        }

        // 执行分类操作
        const results = await this._executeOperations(operations, createSubfolders);

        return {
            preview: false,
            classification,
            results,
            totalFiles: files.length
        };
    }

    _getCategory(file, strategy, options) {
        switch (strategy) {
            case 'extension':
                return this._getCategoryByExtension(file.extension, options.fileCategories);
            case 'date':
                const date = options.useModifyTime !== false ? file.mtime : file.ctime;
                return this._formatDate(date, options.dateFormat || 'year');
            case 'size':
                return this._getSizeCategory(file.size, options.sizeRanges);
            default:
                return '未分类';
        }
    }

    _getCategoryByExtension(ext, fileCategories) {
        for (const [category, extensions] of Object.entries(fileCategories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return '未分类';
    }

    _formatDate(date, format) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (format) {
            case 'year':
                return `${year}年`;
            case 'yearMonth':
                return `${year}年${month}月`;
            case 'yearMonthDay':
                return `${year}年${month}月${day}日`;
            default:
                return `${year}年`;
        }
    }

    _getSizeCategory(fileSize, sizeRanges) {
        const defaultRanges = [
            { name: '小文件', min: 0, max: 1024 * 1024 },
            { name: '中等文件', min: 1024 * 1024, max: 100 * 1024 * 1024 },
            { name: '大文件', min: 100 * 1024 * 1024, max: Infinity }
        ];

        const ranges = sizeRanges || defaultRanges;

        for (const range of ranges) {
            if (fileSize >= range.min && fileSize < range.max) {
                return range.name;
            }
        }
        return '未分类大小';
    }

    async _executeOperations(operations, createSubfolders) {
        const results = {
            created: [],
            moved: [],
            errors: []
        };

        // 按目录分组操作
        const operationsByDir = {};
        for (const op of operations) {
            const targetDir = path.dirname(op.target);
            if (!operationsByDir[targetDir]) {
                operationsByDir[targetDir] = [];
            }
            operationsByDir[targetDir].push(op);
        }

        // 创建目录并移动文件
        for (const [targetDir, dirOperations] of Object.entries(operationsByDir)) {
            try {
                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                    results.created.push(targetDir);
                }

                for (const op of dirOperations) {
                    try {
                        await fs.rename(op.source, op.target);
                        results.moved.push({ from: op.source, to: op.target });
                    } catch (error) {
                        results.errors.push(`移动文件 ${op.source} 失败: ${error.message}`);
                    }
                }
            } catch (error) {
                results.errors.push(`创建目录 ${targetDir} 失败: ${error.message}`);
            }
        }

        return results;
    }

    getOptions() {
        return [
            {
                id: 'primaryStrategy',
                name: '主分类策略',
                type: 'select',
                options: [
                    { value: 'extension', label: '文件类型' },
                    { value: 'date', label: '时间' },
                    { value: 'size', label: '文件大小' }
                ],
                default: 'extension',
                description: '选择主要的分类维度'
            },
            {
                id: 'secondaryStrategy',
                name: '次分类策略',
                type: 'select',
                options: [
                    { value: 'extension', label: '文件类型' },
                    { value: 'date', label: '时间' },
                    { value: 'size', label: '文件大小' }
                ],
                default: 'date',
                description: '选择次要的分类维度'
            }
        ];
    }
}

// 文件夹分类策略
class FolderClassificationStrategy extends ClassificationStrategy {
    async classify(items, options) {
        const { directory, preview, createSubfolders, strategyOptions = {} } = options;
        const {
            classifyBy = 'time', // time, size, name
            dateFormat = 'year',
            useModifyTime = true,
            sizeThreshold = 100 * 1024 * 1024 // 100MB
        } = strategyOptions;

        // 只获取根目录下的直接子文件夹（二级文件夹）
        console.log(`文件夹分类策略：扫描目录 ${directory} 的直接子文件夹`);
        const folders = await DateClassificationStrategy._getDirectSubfolders(directory);
        console.log(`文件夹分类策略：找到 ${folders.length} 个二级文件夹`);

        if (folders.length === 0) {
            return {
                preview: true,
                classification: {},
                totalFolders: 0,
                message: '目录中没有找到文件夹'
            };
        }

        const classification = {};
        const operations = [];

        for (const folder of folders) {
            let category;

            switch (classifyBy) {
                case 'time':
                    const date = useModifyTime ? folder.mtime : folder.ctime;
                    category = this._formatDate(date, dateFormat);
                    break;
                case 'size':
                    category = this._getSizeCategory(folder.size, sizeThreshold);
                    break;
                case 'name':
                    category = this._getNameCategory(folder.name);
                    break;
                default:
                    category = '未分类';
            }

            if (!classification[category]) {
                classification[category] = [];
            }
            classification[category].push(folder.path);

            if (!preview && createSubfolders) {
                const targetDir = path.join(directory, `分类结果_${classifyBy}`, category);
                const targetPath = path.join(targetDir, folder.name);

                operations.push({
                    source: folder.path,
                    target: targetPath,
                    category,
                    action: 'moveFolder',
                    type: 'folder'
                });
            }
        }

        if (preview) {
            return {
                preview: true,
                classification,
                totalFolders: folders.length
            };
        }

        // 执行分类操作
        const results = await this._executeOperations(operations, createSubfolders);

        return {
            preview: false,
            classification,
            results,
            totalFolders: folders.length
        };
    }

    _formatDate(date, format) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (format) {
            case 'year':
                return `${year}年`;
            case 'yearMonth':
                return `${year}年${month}月`;
            case 'yearMonthDay':
                return `${year}年${month}月${day}日`;
            default:
                return `${year}年`;
        }
    }

    _getSizeCategory(size, threshold) {
        if (size < 1024 * 1024) { // < 1MB
            return '小文件夹 (< 1MB)';
        } else if (size < threshold) { // < 阈值
            return `中等文件夹 (< ${this._formatSize(threshold)})`;
        } else {
            return `大文件夹 (≥ ${this._formatSize(threshold)})`;
        }
    }

    _getNameCategory(name) {
        // 按首字母分类
        const firstChar = name.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstChar)) {
            return `字母 ${firstChar}`;
        } else if (/[0-9]/.test(firstChar)) {
            return '数字开头';
        } else if (/[\u4e00-\u9fa5]/.test(firstChar)) {
            return '中文开头';
        } else {
            return '特殊字符开头';
        }
    }

    _formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    async _executeOperations(operations, createSubfolders) {
        const results = {
            created: [],
            moved: [],
            errors: []
        };

        // 按目录分组操作
        const operationsByDir = {};
        for (const op of operations) {
            const targetDir = path.dirname(op.target);
            if (!operationsByDir[targetDir]) {
                operationsByDir[targetDir] = [];
            }
            operationsByDir[targetDir].push(op);
        }

        // 创建目录并移动文件夹
        for (const [targetDir, dirOperations] of Object.entries(operationsByDir)) {
            try {
                if (createSubfolders) {
                    await fs.mkdir(targetDir, { recursive: true });
                    results.created.push(targetDir);
                }

                for (const op of dirOperations) {
                    try {
                        await this._moveFolder(op.source, op.target);
                        results.moved.push({ from: op.source, to: op.target, type: 'folder' });
                    } catch (error) {
                        results.errors.push(`移动文件夹 ${op.source} 失败: ${error.message}`);
                    }
                }
            } catch (error) {
                results.errors.push(`创建目录 ${targetDir} 失败: ${error.message}`);
            }
        }

        return results;
    }

    async _moveFolder(sourcePath, targetPath) {
        try {
            // 检查目标路径是否已存在
            try {
                await fs.access(targetPath);
                throw new Error('目标文件夹已存在');
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // 使用 rename 移动文件夹
            await fs.rename(sourcePath, targetPath);
        } catch (error) {
            throw new Error(`移动文件夹失败: ${error.message}`);
        }
    }

    getOptions() {
        return [
            {
                id: 'classifyBy',
                name: '分类方式',
                type: 'select',
                options: [
                    { value: 'time', label: '按时间分类' },
                    { value: 'size', label: '按大小分类' },
                    { value: 'name', label: '按名称分类' }
                ],
                default: 'time',
                description: '选择根目录下直接子文件夹（二级文件夹）的分类方式'
            },
            {
                id: 'dateFormat',
                name: '时间格式',
                type: 'select',
                options: [
                    { value: 'year', label: '按年份 (2024年)' },
                    { value: 'yearMonth', label: '按年月 (2024年01月)' },
                    { value: 'yearMonthDay', label: '按年月日 (2024年01月15日)' }
                ],
                default: 'year',
                description: '时间分类的格式（仅在按时间分类时有效）'
            },
            {
                id: 'useModifyTime',
                name: '使用修改时间',
                type: 'boolean',
                default: true,
                description: '使用文件夹修改时间，否则使用创建时间'
            },
            {
                id: 'sizeThreshold',
                name: '大小阈值 (MB)',
                type: 'number',
                default: 100,
                description: '区分大小文件夹的阈值（仅在按大小分类时有效）'
            }
        ];
    }
}

module.exports = ClassificationService;
