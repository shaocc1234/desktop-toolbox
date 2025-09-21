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
    
    this.db.serialize(() => {
      this.db.run(createTableSQL);
      
      // 创建索引以提高查询性能
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_upload_time ON image_records(upload_time)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_category ON image_records(category)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_service ON image_records(service)`);
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
  
  close() {
    this.db.close();
  }
}

module.exports = DatabaseService;
