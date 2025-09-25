// services/databaseService.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const ImageRecord = require('../models/ImageRecord');

class DatabaseService {
  constructor(dbPath = 'database.db') {
    this.dbPath = path.resolve(dbPath);
    this.db = new sqlite3.Database(this.dbPath);
    this.initDatabase();
  }
  
  initDatabase() {
    // 创建图片记录表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS image_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        url TEXT NOT NULL,
        size INTEGER NOT NULL,
        category TEXT DEFAULT '默认',
        description TEXT DEFAULT '',
        service TEXT NOT NULL,
        upload_time TEXT NOT NULL,
        tags TEXT DEFAULT '',
        was_compressed INTEGER DEFAULT 0,
        original_size INTEGER,
        compression_ratio REAL
      )
    `;

    // 创建AI模型配置表
    const createAIConfigTableSQL = `
      CREATE TABLE IF NOT EXISTS ai_model_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL, -- 'chat' 或 'vision'
        provider TEXT NOT NULL,    -- 'siliconflow', 'doubao', 'deepseek'
        model_id TEXT NOT NULL,    -- 模型ID
        model_name TEXT NOT NULL,  -- 模型显示名称
        priority INTEGER NOT NULL, -- 优先级 (1最高)
        enabled INTEGER DEFAULT 1, -- 是否启用 (0/1)
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(config_type, provider, model_id)
      )
    `;

    // 创建全局设置表
    const createGlobalSettingsSQL = `
      CREATE TABLE IF NOT EXISTS global_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        setting_type TEXT DEFAULT 'string', -- 'string', 'json', 'boolean', 'number'
        description TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    this.db.serialize(() => {
      this.db.run(createTableSQL);
      this.db.run(createAIConfigTableSQL);
      this.db.run(createGlobalSettingsSQL);

      // 创建索引以提高查询性能
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_upload_time ON image_records(upload_time)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_category ON image_records(category)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_service ON image_records(service)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_ai_config_type ON ai_model_config(config_type)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_ai_priority ON ai_model_config(priority)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_setting_key ON global_settings(setting_key)`);
    });

    console.log('📊 数据库初始化完成');
  }
  
  addImageRecord(record) {
    return new Promise((resolve, reject) => {
      const insertSQL = `
        INSERT INTO image_records 
        (filename, original_name, url, size, category, description, 
         service, upload_time, tags, was_compressed, original_size, compression_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const data = record.toDbFormat();
      
      this.db.run(insertSQL, [
        data.filename, data.original_name, data.url, data.size,
        data.category, data.description, data.service, data.upload_time,
        data.tags, data.was_compressed, data.original_size, data.compression_ratio
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
  
  getAllImages() {
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM image_records ORDER BY upload_time DESC';
      
      this.db.all(selectSQL, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const images = rows.map(row => new ImageRecord({
            ...row,
            was_compressed: Boolean(row.was_compressed)
          }));
          resolve(images);
        }
      });
    });
  }
  
  getImagesByCategory(category) {
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM image_records WHERE category = ? ORDER BY upload_time DESC';
      
      this.db.all(selectSQL, [category], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const images = rows.map(row => new ImageRecord({
            ...row,
            was_compressed: Boolean(row.was_compressed)
          }));
          resolve(images);
        }
      });
    });
  }
  
  searchImages(query) {
    return new Promise((resolve, reject) => {
      const searchSQL = `
        SELECT * FROM image_records 
        WHERE original_name LIKE ? OR description LIKE ? OR tags LIKE ?
        ORDER BY upload_time DESC
      `;
      const searchTerm = `%${query}%`;
      
      this.db.all(searchSQL, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const images = rows.map(row => new ImageRecord({
            ...row,
            was_compressed: Boolean(row.was_compressed)
          }));
          resolve(images);
        }
      });
    });
  }
  
  deleteImage(id) {
    return new Promise((resolve, reject) => {
      const deleteSQL = 'DELETE FROM image_records WHERE id = ?';
      
      this.db.run(deleteSQL, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }
  
  deleteImages(ids) {
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      const deleteSQL = `DELETE FROM image_records WHERE id IN (${placeholders})`;
      
      this.db.run(deleteSQL, ids, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
  
  getImageById(id) {
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM image_records WHERE id = ?';
      
      this.db.get(selectSQL, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new ImageRecord({
            ...row,
            was_compressed: Boolean(row.was_compressed)
          }));
        } else {
          resolve(null);
        }
      });
    });
  }
  
  updateImage(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const updateSQL = `UPDATE image_records SET ${setClause} WHERE id = ?`;
      
      const values = [...Object.values(updates), id];
      
      this.db.run(updateSQL, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }
  
  getStatistics() {
    return new Promise((resolve, reject) => {
      const statsSQL = `
        SELECT 
          COUNT(*) as total_images,
          SUM(size) as total_size,
          AVG(size) as avg_size,
          COUNT(CASE WHEN was_compressed = 1 THEN 1 END) as compressed_count,
          service,
          category,
          COUNT(*) as count
        FROM image_records 
        GROUP BY service, category
      `;
      
      this.db.all(statsSQL, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // ==================== AI模型配置相关方法 ====================

  /**
   * 保存AI模型优先级配置
   * @param {string} configType - 'chat' 或 'vision'
   * @param {Array} priorities - 优先级配置数组
   */
  async saveAIModelPriorities(configType, priorities) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 开始事务
        this.db.run('BEGIN TRANSACTION');

        try {
          // 先删除该类型的所有配置
          this.db.run('DELETE FROM ai_model_config WHERE config_type = ?', [configType]);

          // 插入新的配置
          const insertSQL = `
            INSERT INTO ai_model_config
            (config_type, provider, model_id, model_name, priority, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const now = new Date().toISOString();
          let completed = 0;
          const total = priorities.length;

          if (total === 0) {
            this.db.run('COMMIT');
            resolve();
            return;
          }

          priorities.forEach((item, index) => {
            this.db.run(insertSQL, [
              configType,
              item.provider,
              item.model,
              item.modelName || item.model,
              item.priority || (index + 1),
              item.enabled ? 1 : 0,
              now,
              now
            ], (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }

              completed++;
              if (completed === total) {
                this.db.run('COMMIT');
                resolve();
              }
            });
          });

        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * 获取AI模型优先级配置
   * @param {string} configType - 'chat' 或 'vision'
   */
  async getAIModelPriorities(configType) {
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT * FROM ai_model_config
        WHERE config_type = ?
        ORDER BY priority ASC
      `;

      this.db.all(selectSQL, [configType], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const priorities = rows.map(row => ({
            provider: row.provider,
            model: row.model_id,
            modelName: row.model_name,
            priority: row.priority,
            enabled: Boolean(row.enabled)
          }));
          resolve(priorities);
        }
      });
    });
  }

  /**
   * 获取所有AI模型配置
   */
  async getAllAIModelPriorities() {
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT * FROM ai_model_config
        ORDER BY config_type, priority ASC
      `;

      this.db.all(selectSQL, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const config = {
            chat: [],
            vision: []
          };

          rows.forEach(row => {
            const item = {
              provider: row.provider,
              model: row.model_id,
              modelName: row.model_name,
              priority: row.priority,
              enabled: Boolean(row.enabled)
            };

            if (config[row.config_type]) {
              config[row.config_type].push(item);
            }
          });

          resolve(config);
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseService;
