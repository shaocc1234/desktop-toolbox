// app.js - Express 应用主文件
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 导入路由
const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');
const galleryRouter = require('./routes/gallery');
const processRouter = require('./routes/process');
const folderRouter = require('./routes/folder');
const apiRouter = require('./routes/api');

// 导入服务
const DatabaseService = require('./services/databaseService');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库服务
const dbService = new DatabaseService();
app.locals.dbService = dbService;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"]
    }
  }
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP 15分钟内最多1000个请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// 上传限制（更严格）
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 上传接口限制更严格
  message: '上传请求过于频繁，请稍后再试'
});

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// 解析请求体
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 模板引擎配置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 全局变量
app.use((req, res, next) => {
  res.locals.appName = '工具集';
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// 路由配置
app.use('/', indexRouter);
app.use('/upload', uploadLimiter, uploadRouter);
app.use('/gallery', galleryRouter);
app.use('/process', processRouter);
app.use('/folder', folderRouter);
app.use('/api', apiRouter);

// 404 错误处理
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '页面未找到',
    message: '抱歉，您访问的页面不存在',
    error: { status: 404 }
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('应用错误:', err);
  
  res.status(err.status || 500);
  res.render('error', {
    title: '服务器错误',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误，请稍后重试' 
      : err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 工具集启动成功`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`🗃️ 数据库: ${dbService.dbPath}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('HTTP 服务器已关闭');
    dbService.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    console.log('HTTP 服务器已关闭');
    dbService.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  });
});

module.exports = app;
