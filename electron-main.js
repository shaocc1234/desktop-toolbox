// Electron主进程
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const FileOperationService = require('./services/fileOperationService');
const { spawn } = require('child_process');
const axios = require('axios');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.serverPort = 3000;
    this.serverUrl = `http://localhost:${this.serverPort}`;
    this.fileOperationService = new FileOperationService();
  }

  async init() {
    // 等待Electron准备就绪
    await app.whenReady();
    
    // 启动Express服务器
    await this.startExpressServer();
    
    // 创建主窗口
    this.createMainWindow();
    
    // 设置应用菜单
    this.setupMenu();
    
    // 设置IPC处理
    this.setupIPC();
    
    // 处理应用事件
    this.setupAppEvents();
  }

  async startExpressServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 启动Express服务器...');

      // 确定Node.js可执行文件路径和工作目录
      let nodePath = 'node';
      let workingDir = __dirname;
      let appPath = 'app.js';

      // 在打包环境中使用解包的app.js
      if (process.resourcesPath) {
        // 打包环境：使用系统Node.js，但指向解包的app.js
        workingDir = path.join(process.resourcesPath, 'app.asar.unpacked');
        appPath = 'app.js'; // 相对于workingDir

        console.log('📍 打包环境路径:');
        console.log('  Node路径:', nodePath);
        console.log('  工作目录:', workingDir);
        console.log('  App路径:', path.join(workingDir, appPath));

        // 检查文件是否存在
        if (!fs.existsSync(path.join(workingDir, appPath))) {
          console.error('❌ 解包的app.js文件不存在:', path.join(workingDir, appPath));
          reject(new Error('解包的app.js文件不存在'));
          return;
        }
      }

      // 启动Express服务器进程
      this.serverProcess = spawn(nodePath, [appPath], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Express输出:', output);
        
        // 检测服务器启动成功
        if (output.includes('图库上传工具启动成功') || output.includes('localhost:3000')) {
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Express错误:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        console.error('启动Express服务器失败:', error);
        reject(error);
      });

      // 设置超时
      setTimeout(() => {
        this.checkServerHealth().then(resolve).catch(reject);
      }, 3000);
    });
  }

  async checkServerHealth() {
    try {
      const response = await axios.get(this.serverUrl, { timeout: 2000 });
      if (response.status === 200) {
        console.log('✅ Express服务器健康检查通过');
        return true;
      }
    } catch (error) {
      console.error('❌ Express服务器健康检查失败:', error.message);
      throw new Error('Express服务器启动失败');
    }
  }

  createMainWindow() {
    console.log('🖥️ 创建主窗口...');
    
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset', // macOS样式
      icon: path.join(__dirname, 'assets/icon.png'), // 应用图标
      show: false // 先隐藏，加载完成后显示
    });

    // 加载应用URL
    this.mainWindow.loadURL(this.serverUrl + '/folder');

    // 窗口准备显示时
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      console.log('✅ 应用窗口已显示');

      // 设置文件操作服务的主窗口引用
      this.fileOperationService.setMainWindow(this.mainWindow);
    });

    // 处理窗口关闭
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 开发环境下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  setupIPC() {
    // 处理文件保存请求
    ipcMain.handle('save-file-to-path', async (_event, { filePath, buffer, newExtension }) => {
      return await this.fileOperationService.saveFileToPath(filePath, buffer, newExtension);
    });

    // 检查文件是否存在
    ipcMain.handle('check-file-exists', async (_event, filePath) => {
      const result = await this.fileOperationService.checkFileExists(filePath);
      return result.exists;
    });

    // 获取文件信息
    ipcMain.handle('get-file-info', async (_event, filePath) => {
      return await this.fileOperationService.getFileInfo(filePath);
    });

    // 检查是否为Electron环境
    ipcMain.handle('is-electron', () => {
      return true;
    });

    // 选择文件对话框
    ipcMain.handle('select-files', async () => {
      return await this.fileOperationService.selectFiles();
    });

    // 选择文件夹对话框
    ipcMain.handle('select-folder', async () => {
      return await this.fileOperationService.selectFolder();
    });

    // 扫描文件夹中的图片文件
    ipcMain.handle('scan-folder', async (_event, { folderPath, includeSubfolders = true }) => {
      return await this.fileOperationService.scanFolder(folderPath, {
        includeSubfolders,
        fileTypes: 'images'
      });
    });

    // 读取文件内容
    ipcMain.handle('read-file-content', async (_event, filePath) => {
      return await this.fileOperationService.readFileContent(filePath);
    });

    // 选择保存文件夹
    ipcMain.handle('select-save-folder', async () => {
      return await this.fileOperationService.selectSaveFolder();
    });

    // 批量保存文件到文件夹
    ipcMain.handle('save-files-to-folder', async (_event, { folderPath, files, options = {} }) => {
      return await this.fileOperationService.saveFilesToFolder(folderPath, files, options);
    });

    // 文件夹管理相关的IPC处理器

    // 扫描文件夹（通用版本，支持所有文件类型）
    ipcMain.handle('scan-folder-general', async (event, { folderPath, options = {} }) => {
      // 如果需要进度更新，设置IPC进度发送
      if (options.needProgress) {
        options.progressCallback = (progress) => {
          event.sender.send('scan-progress', progress);
        };
        delete options.needProgress; // 删除标记，避免传递到服务层
      }
      return await this.fileOperationService.scanFolderGeneral(folderPath, options);
    });

    // 创建目录
    ipcMain.handle('create-directory', async (_event, { dirPath, options = {} }) => {
      return await this.fileOperationService.createDirectory(dirPath, options);
    });

    // 删除文件
    ipcMain.handle('delete-file', async (_event, filePath) => {
      return await this.fileOperationService.deleteFile(filePath);
    });

    // 删除目录
    ipcMain.handle('delete-directory', async (_event, { dirPath, options = {} }) => {
      return await this.fileOperationService.deleteDirectory(dirPath, options);
    });

    // 移动/重命名文件
    ipcMain.handle('move-file', async (_event, { sourcePath, targetPath }) => {
      return await this.fileOperationService.moveFile(sourcePath, targetPath);
    });

    // 复制文件
    ipcMain.handle('copy-file', async (_event, { sourcePath, targetPath }) => {
      return await this.fileOperationService.copyFile(sourcePath, targetPath);
    });
  }

  setupMenu() {
    const template = [
      {
        label: '图库上传工具',
        submenu: [
          {
            label: '关于图库上传工具',
            role: 'about'
          },
          { type: 'separator' },
          {
            label: '服务',
            role: 'services'
          },
          { type: 'separator' },
          {
            label: '隐藏图库上传工具',
            accelerator: 'Command+H',
            role: 'hide'
          },
          {
            label: '隐藏其他',
            accelerator: 'Command+Shift+H',
            role: 'hideothers'
          },
          {
            label: '显示全部',
            role: 'unhide'
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: '全屏', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' }
        ]
      },
      {
        label: '窗口',
        submenu: [
          { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: '关于图库上传工具',
                message: '图库上传工具 v1.0.0',
                detail: '一个功能强大的图片上传和管理工具\n支持多种图床服务和批量处理'
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupAppEvents() {
    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      // 在macOS上，除非用户明确退出，否则应用保持活跃状态
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    // 当应用被激活时
    app.on('activate', () => {
      // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // 应用退出前清理
    app.on('before-quit', () => {
      this.cleanup();
    });

    // 处理证书错误（开发环境）
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      if (url.startsWith('http://localhost')) {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  cleanup() {
    console.log('🧹 清理资源...');
    
    // 关闭Express服务器
    if (this.serverProcess) {
      console.log('🛑 关闭Express服务器...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }
}

// 创建并启动应用
const electronApp = new ElectronApp();
electronApp.init().catch((error) => {
  console.error('❌ 应用启动失败:', error);
  app.quit();
});

// 导出应用实例（用于测试）
module.exports = electronApp;
