const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * 重命名历史记录服务
 * 管理已处理文件的记录，避免重复处理
 */
class RenameHistoryService {
    constructor() {
        this.dbPath = path.join(__dirname, '../database.db');
        this.db = null;
        this.initialized = false;
    }

    /**
     * 初始化数据库
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // 确保数据库目录存在
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });

            // 创建数据库连接
            this.db = new sqlite3.Database(this.dbPath);

            // 创建表结构
            await this.createTables();

            this.initialized = true;
            console.log('✅ 重命名历史数据库初始化成功');
        } catch (error) {
            console.error('❌ 重命名历史数据库初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建数据库表
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS rename_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    new_name TEXT NOT NULL,
                    file_size INTEGER,
                    file_extension TEXT,
                    processing_method TEXT,
                    ai_model TEXT,
                    template_type TEXT,
                    success BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(file_path, file_hash)
                );

                CREATE INDEX IF NOT EXISTS idx_file_path ON rename_history(file_path);
                CREATE INDEX IF NOT EXISTS idx_file_hash ON rename_history(file_hash);
                CREATE INDEX IF NOT EXISTS idx_created_at ON rename_history(created_at);
            `;

            this.db.exec(createTableSQL, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 计算文件哈希值
     * @param {string} filePath 文件路径
     * @returns {Promise<string>} 文件哈希值
     */
    async calculateFileHash(filePath) {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash('md5').update(fileBuffer).digest('hex');
        } catch (error) {
            try {
                // 如果无法读取文件，使用文件路径和修改时间作为哈希
                const stats = await fs.stat(filePath);
                const hashInput = `${filePath}_${stats.mtime.getTime()}_${stats.size}`;
                return crypto.createHash('md5').update(hashInput).digest('hex');
            } catch (statError) {
                // 如果文件不存在，使用文件路径和当前时间作为哈希
                const hashInput = `${filePath}_${Date.now()}`;
                return crypto.createHash('md5').update(hashInput).digest('hex');
            }
        }
    }

    /**
     * 检查文件是否已被处理过（通过新文件名匹配）
     * @param {string} filePath 文件路径
     * @returns {Promise<Object|null>} 处理记录或null
     */
    async checkFileProcessed(filePath) {
        if (!this.initialized) await this.initialize();

        try {
            const fileName = path.basename(filePath);

            return new Promise((resolve, reject) => {
                const sql = `
                    SELECT * FROM rename_history
                    WHERE new_name = ? OR file_path = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                `;

                this.db.get(sql, [fileName, filePath], (error, row) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(row || null);
                    }
                });
            });
        } catch (error) {
            console.error('检查文件处理记录失败:', error);
            return null;
        }
    }

    /**
     * 记录文件处理结果
     * @param {Object} processInfo 处理信息
     * @returns {Promise<boolean>} 是否记录成功
     */
    async recordFileProcessing(processInfo) {
        if (!this.initialized) await this.initialize();

        try {
            const {
                filePath,
                originalName,
                newName,
                fileSize,
                fileExtension,
                processingMethod,
                aiModel,
                templateType,
                success = true
            } = processInfo;

            const fileHash = await this.calculateFileHash(filePath);

            return new Promise((resolve, reject) => {
                const sql = `
                    INSERT OR REPLACE INTO rename_history 
                    (file_path, file_hash, original_name, new_name, file_size, 
                     file_extension, processing_method, ai_model, template_type, success, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;

                const params = [
                    filePath,
                    fileHash,
                    originalName,
                    newName,
                    fileSize,
                    fileExtension,
                    processingMethod,
                    aiModel,
                    templateType,
                    success ? 1 : 0
                ];

                this.db.run(sql, params, function(error) {
                    if (error) {
                        console.error('记录文件处理失败:', error);
                        reject(error);
                    } else {
                        console.log(`📝 记录文件处理: ${originalName} -> ${newName}`);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('记录文件处理失败:', error);
            return false;
        }
    }

    /**
     * 获取处理历史统计
     * @returns {Promise<Object>} 统计信息
     */
    async getProcessingStats() {
        if (!this.initialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(CASE WHEN success = 1 THEN 1 END) as successful,
                    COUNT(CASE WHEN success = 0 THEN 1 END) as failed,
                    COUNT(DISTINCT file_extension) as file_types,
                    MIN(created_at) as first_processed,
                    MAX(created_at) as last_processed
                FROM rename_history
            `;

            this.db.get(sql, [], (error, row) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(row || {});
                }
            });
        });
    }

    /**
     * 获取最近处理的文件列表
     * @param {number} limit 限制数量
     * @returns {Promise<Array>} 文件列表
     */
    async getRecentProcessedFiles(limit = 50) {
        if (!this.initialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM rename_history 
                ORDER BY created_at DESC 
                LIMIT ?
            `;

            this.db.all(sql, [limit], (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * 清理旧的处理记录
     * @param {number} daysToKeep 保留天数
     * @returns {Promise<number>} 清理的记录数
     */
    async cleanupOldRecords(daysToKeep = 30) {
        if (!this.initialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const sql = `
                DELETE FROM rename_history 
                WHERE created_at < datetime('now', '-${daysToKeep} days')
            `;

            this.db.run(sql, [], function(error) {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🧹 清理了 ${this.changes} 条旧的处理记录`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((error) => {
                    if (error) {
                        console.error('关闭重命名历史数据库失败:', error);
                    } else {
                        console.log('✅ 重命名历史数据库已关闭');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = RenameHistoryService;
