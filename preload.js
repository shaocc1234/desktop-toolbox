// preload.js - Electron预加载脚本
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// 安全地暴露Electron API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 检查是否为Electron环境
  isElectron: () => ipcRenderer.invoke('is-electron'),

  // 获取拖拽文件的真实路径 (Electron v32+ 解决方案)
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (error) {
      console.warn('webUtils.getPathForFile 失败:', error);
      // 回退到旧的 file.path 属性
      return file.path || file.name;
    }
  },

  // 保存文件到指定路径
  saveFileToPath: (filePath, buffer, newExtension) => 
    ipcRenderer.invoke('save-file-to-path', { filePath, buffer, newExtension }),
  
  // 检查文件是否存在
  checkFileExists: (filePath) => 
    ipcRenderer.invoke('check-file-exists', filePath),
  
  // 获取文件信息
  getFileInfo: (filePath) => 
    ipcRenderer.invoke('get-file-info', filePath),

  // 选择文件对话框
  selectFiles: () => 
    ipcRenderer.invoke('select-files'),

  // 选择文件夹对话框
  selectFolder: () => 
    ipcRenderer.invoke('select-folder'),

  // 扫描文件夹
  scanFolder: (folderPath, includeSubfolders) => 
    ipcRenderer.invoke('scan-folder', { folderPath, includeSubfolders }),

  // 读取文件内容
  readFileContent: (filePath) => 
    ipcRenderer.invoke('read-file-content', filePath),

  // 选择保存文件夹
  selectSaveFolder: () => 
    ipcRenderer.invoke('select-save-folder'),

  // 批量保存文件到文件夹
  saveFilesToFolder: (folderPath, files, options) =>
    ipcRenderer.invoke('save-files-to-folder', { folderPath, files, options }),

  // 文件夹管理相关API

  // 扫描文件夹（通用版本，支持所有文件类型）
  scanFolderGeneral: (folderPath, options) => {
    // 提取进度回调，不传递到主进程
    const progressCallback = options.progressCallback;
    const optionsForMain = { ...options };
    delete optionsForMain.progressCallback; // 删除回调函数，避免序列化错误

    // 如果有进度回调，设置IPC监听器
    if (progressCallback) {
      const progressHandler = (event, progress) => {
        progressCallback(progress);
      };

      // 监听进度事件
      ipcRenderer.on('scan-progress', progressHandler);

      // 告诉主进程我们需要进度更新
      optionsForMain.needProgress = true;

      // 返回Promise，在完成后清理监听器
      return ipcRenderer.invoke('scan-folder-general', { folderPath, options: optionsForMain })
        .finally(() => {
          ipcRenderer.removeListener('scan-progress', progressHandler);
        });
    }

    return ipcRenderer.invoke('scan-folder-general', { folderPath, options: optionsForMain });
  },

  // 创建目录
  createDirectory: (dirPath, options) =>
    ipcRenderer.invoke('create-directory', { dirPath, options }),

  // 删除文件
  deleteFile: (filePath) =>
    ipcRenderer.invoke('delete-file', filePath),

  // 删除目录
  deleteDirectory: (dirPath, options) =>
    ipcRenderer.invoke('delete-directory', { dirPath, options }),

  // 移动/重命名文件
  moveFile: (sourcePath, targetPath) =>
    ipcRenderer.invoke('move-file', { sourcePath, targetPath }),

  // 复制文件
  copyFile: (sourcePath, targetPath) =>
    ipcRenderer.invoke('copy-file', { sourcePath, targetPath }),

  // 打开文件夹
  openFolder: (folderPath) =>
    ipcRenderer.invoke('open-folder', folderPath),

  // 显示文件在文件夹中的位置
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke('show-item-in-folder', filePath)
});

// 在窗口加载完成后设置标识
window.addEventListener('DOMContentLoaded', () => {
  // 设置Electron环境标识
  window.isElectronApp = true;
});
