// services/directoryIndexService.js - 目录索引服务
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class DirectoryIndexService {
    constructor(dbPath = './directory_index.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.initialized = false;
    }

    // 初始化数据库
    async initialize() {
        if (this.initialized) return;

        this.db = new sqlite3.Database(this.dbPath);
        const run = promisify(this.db.run.bind(this.db));
        const get = promisify(this.db.get.bind(this.db));
        const all = promisify(this.db.all.bind(this.db));

        this.db.run = run;
        this.db.get = get;
        this.db.all = all;

        // 创建索引表
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS directory_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                parent_path TEXT,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'file' or 'directory'
                size INTEGER DEFAULT 0,
                extension TEXT,
                mtime INTEGER NOT NULL,
                ctime INTEGER NOT NULL,
                indexed_at INTEGER NOT NULL,
                hash TEXT -- 文件内容哈希（用于重复文件检测）
            )
        `);

        // 创建索引
        await this.db.run(`CREATE INDEX IF NOT EXISTS idx_path ON directory_index(path)`);
        await this.db.run(`CREATE INDEX IF NOT EXISTS idx_parent ON directory_index(parent_path)`);
        await this.db.run(`CREATE INDEX IF NOT EXISTS idx_type ON directory_index(type)`);
        await this.db.run(`CREATE INDEX IF NOT EXISTS idx_extension ON directory_index(extension)`);
        await this.db.run(`CREATE INDEX IF NOT EXISTS idx_hash ON directory_index(hash)`);

        this.initialized = true;
    }

    // 建立目录索引
    async buildIndex(directory, includeSubfolders = true, forceRebuild = false) {
        await this.initialize();

        try {
            // 检查是否需要重建索引
            if (!forceRebuild) {
                const needsUpdate = await this._checkIndexNeedsUpdate(directory);
                if (!needsUpdate) {
                    console.log('索引是最新的，无需重建');
                    return await this._getIndexedResult(directory, includeSubfolders);
                }
            }

            console.log('开始建立目录索引...');
            const startTime = Date.now();

            // 清理旧索引
            await this.db.run('DELETE FROM directory_index WHERE path LIKE ?', [`${directory}%`]);

            // 扫描并建立索引
            await this._indexDirectory(directory, includeSubfolders);

            const endTime = Date.now();
            console.log(`索引建立完成，耗时: ${endTime - startTime}ms`);

            return await this._getIndexedResult(directory, includeSubfolders);
        } catch (error) {
            throw new Error(`建立索引失败: ${error.message}`);
        }
    }

    // 检查索引是否需要更新
    async _checkIndexNeedsUpdate(directory) {
        try {
            const dirStat = await fs.stat(directory);
            const indexed = await this.db.get(
                'SELECT mtime FROM directory_index WHERE path = ? AND type = "directory"',
                [directory]
            );

            if (!indexed) return true;
            return dirStat.mtime.getTime() > indexed.mtime;
        } catch (error) {
            return true; // 出错时重建索引
        }
    }

    // 递归索引目录
    async _indexDirectory(dir, includeSubfolders, parentPath = null) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const dirStat = await fs.stat(dir);

            // 索引当前目录
            await this.db.run(`
                INSERT OR REPLACE INTO directory_index 
                (path, parent_path, name, type, mtime, ctime, indexed_at)
                VALUES (?, ?, ?, 'directory', ?, ?, ?)
            `, [
                dir,
                parentPath,
                path.basename(dir),
                dirStat.mtime.getTime(),
                dirStat.ctime.getTime(),
                Date.now()
            ]);

            // 批量处理条目
            const batch = [];
            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue;

                const itemPath = path.join(dir, entry.name);
                
                if (entry.isFile()) {
                    batch.push(this._indexFile(itemPath, dir));
                } else if (entry.isDirectory() && includeSubfolders) {
                    batch.push(this._indexDirectory(itemPath, includeSubfolders, dir));
                }
            }

            await Promise.all(batch);
        } catch (error) {
            console.error(`索引目录 ${dir} 时出错:`, error);
        }
    }

    // 索引文件
    async _indexFile(filePath, parentPath) {
        try {
            const stats = await fs.stat(filePath);
            const extension = path.extname(filePath).toLowerCase();
            
            // 对小文件计算哈希（用于重复文件检测）
            let hash = null;
            if (stats.size < 100 * 1024 * 1024) { // 小于100MB的文件
                const content = await fs.readFile(filePath);
                hash = crypto.createHash('md5').update(content).digest('hex');
            }

            await this.db.run(`
                INSERT OR REPLACE INTO directory_index 
                (path, parent_path, name, type, size, extension, mtime, ctime, indexed_at, hash)
                VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?, ?)
            `, [
                filePath,
                parentPath,
                path.basename(filePath),
                'file',
                stats.size,
                extension,
                stats.mtime.getTime(),
                stats.ctime.getTime(),
                Date.now(),
                hash
            ]);
        } catch (error) {
            console.error(`索引文件 ${filePath} 时出错:`, error);
        }
    }

    // 从索引获取结果
    async _getIndexedResult(directory, includeSubfolders) {
        const whereClause = includeSubfolders 
            ? 'WHERE path LIKE ?' 
            : 'WHERE parent_path = ? OR path = ?';
        
        const params = includeSubfolders 
            ? [`${directory}%`] 
            : [directory, directory];

        const files = await this.db.all(`
            SELECT * FROM directory_index 
            ${whereClause} AND type = 'file'
            ORDER BY path
        `, params);

        const folders = await this.db.all(`
            SELECT * FROM directory_index 
            ${whereClause} AND type = 'directory' AND path != ?
            ORDER BY path
        `, [...params, directory]);

        // 构建结果
        const result = {
            path: directory,
            totalFiles: files.length,
            totalFolders: folders.length,
            emptyFolders: [],
            filesByExtension: {},
            duplicateFiles: [],
            totalSize: 0
        };

        // 处理文件统计
        for (const file of files) {
            result.totalSize += file.size;
            
            const ext = file.extension || '无扩展名';
            if (!result.filesByExtension[ext]) {
                result.filesByExtension[ext] = [];
            }
            result.filesByExtension[ext].push(file.path);
        }

        // 查找空文件夹
        for (const folder of folders) {
            const hasChildren = await this.db.get(`
                SELECT COUNT(*) as count FROM directory_index 
                WHERE parent_path = ?
            `, [folder.path]);
            
            if (hasChildren.count === 0) {
                result.emptyFolders.push(folder.path);
            }
        }

        return result;
    }

    // 快速查找重复文件
    async findDuplicateFiles(directory, includeSubfolders = true) {
        await this.initialize();

        const whereClause = includeSubfolders 
            ? 'WHERE path LIKE ? AND hash IS NOT NULL' 
            : 'WHERE (parent_path = ? OR path = ?) AND hash IS NOT NULL';
        
        const params = includeSubfolders 
            ? [`${directory}%`] 
            : [directory, directory];

        const duplicates = await this.db.all(`
            SELECT hash, GROUP_CONCAT(path) as paths, COUNT(*) as count
            FROM directory_index 
            ${whereClause}
            GROUP BY hash 
            HAVING count > 1
        `, params);

        return duplicates.map(dup => ({
            hash: dup.hash,
            files: dup.paths.split(','),
            count: dup.count
        }));
    }

    // 获取目录统计（基于索引）
    async getDirectoryStats(directory, includeSubfolders = true) {
        const result = await this._getIndexedResult(directory, includeSubfolders);
        
        // 添加详细统计
        const whereClause = includeSubfolders 
            ? 'WHERE path LIKE ?' 
            : 'WHERE parent_path = ? OR path = ?';
        
        const params = includeSubfolders 
            ? [`${directory}%`] 
            : [directory, directory];

        // 按扩展名分类统计
        const extensionStats = await this.db.all(`
            SELECT extension, COUNT(*) as count, SUM(size) as total_size
            FROM directory_index 
            ${whereClause} AND type = 'file'
            GROUP BY extension
            ORDER BY count DESC
        `, params);

        // 最大文件
        const largestFiles = await this.db.all(`
            SELECT path, name, size
            FROM directory_index 
            ${whereClause} AND type = 'file'
            ORDER BY size DESC
            LIMIT 10
        `, params);

        return {
            ...result,
            filesByCategory: this._categorizeExtensions(extensionStats),
            largestFiles: largestFiles
        };
    }

    // 扩展名分类
    _categorizeExtensions(extensionStats) {
        const categories = {};
        for (const stat of extensionStats) {
            const category = this._getCategoryByExtension(stat.extension);
            if (!categories[category]) {
                categories[category] = { count: 0, size: 0 };
            }
            categories[category].count += stat.count;
            categories[category].size += stat.total_size;
        }
        return categories;
    }

    _getCategoryByExtension(ext) {
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
        const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
        const docExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
        
        if (imageExts.includes(ext)) return '图片';
        if (videoExts.includes(ext)) return '视频';
        if (audioExts.includes(ext)) return '音频';
        if (docExts.includes(ext)) return '文档';
        return '其他';
    }

    // 关闭数据库连接
    async close() {
        if (this.db) {
            await new Promise((resolve) => this.db.close(resolve));
        }
    }
}

module.exports = DirectoryIndexService;
