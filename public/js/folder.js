// public/js/folder.js - 文件夹管理前端脚本

class FolderManager {
    constructor() {
        this.currentDirectory = '';
        this.currentStats = null;
        this.isElectronApp = false;
        this.includeSubfolders = true; // 保存当前扫描设置
        this.init();
    }

    async init() {
        this.bindEvents();
        this.loadDefaultDirectory();
        await this.checkElectronEnvironment();
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('文件夹管理 - Electron环境检测:', this.isElectronApp);
            } catch (error) {
                console.log('Electron API不可用:', error);
                this.isElectronApp = false;
            }
        } else {
            this.isElectronApp = false;
        }
    }

    bindEvents() {
        // 浏览文件夹
        document.getElementById('browseBtn').addEventListener('click', () => {
            this.browseFolder();
        });

        // 扫描目录
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.scanDirectory();
        });

        // 预览空文件夹
        document.getElementById('previewEmptyBtn').addEventListener('click', () => {
            this.previewEmptyFolders();
        });

        // 删除空文件夹
        document.getElementById('deleteEmptyBtn').addEventListener('click', () => {
            this.deleteEmptyFolders();
        });

        // 预览文件分类
        document.getElementById('previewClassifyBtn').addEventListener('click', () => {
            this.previewClassification();
        });

        // 开始分类
        document.getElementById('classifyBtn').addEventListener('click', () => {
            this.classifyFiles();
        });

        // 预览重复文件
        document.getElementById('previewDuplicatesBtn').addEventListener('click', () => {
            this.previewDuplicates();
        });

        // 删除重复文件
        document.getElementById('removeDuplicatesBtn').addEventListener('click', () => {
            this.removeDuplicates();
        });

        // 详细统计
        document.getElementById('detailStatsBtn').addEventListener('click', () => {
            this.getDetailedStats();
        });

        // 确认操作按钮
        document.getElementById('confirmActionBtn').addEventListener('click', () => {
            this.executeConfirmedAction();
        });

        // 回车键扫描
        document.getElementById('directoryPath').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.scanDirectory();
            }
        });
    }

    loadDefaultDirectory() {
        // 设置默认目录路径
        const isWindows = navigator.platform.indexOf('Win') > -1;
        const defaultPath = isWindows ? 'C:\\Users\\' : '/Users/';
        document.getElementById('directoryPath').placeholder = `请输入目录路径，如：${defaultPath}username/Documents`;
    }

    async browseFolder() {
        if (this.isElectronApp && window.electronAPI) {
            // Electron环境：使用原生文件夹选择对话框
            try {
                const result = await window.electronAPI.selectFolder();

                if (result.success && result.folderPath) {
                    document.getElementById('directoryPath').value = result.folderPath;
                    this.showToast('文件夹选择成功', 'success');
                } else if (result.canceled) {
                    this.showToast('用户取消了文件夹选择', 'info');
                } else {
                    this.showToast('文件夹选择失败', 'error');
                }
            } catch (error) {
                console.error('Electron文件夹选择失败:', error);
                this.showToast('文件夹选择失败', 'error');
            }
        } else {
            // 浏览器环境：显示提示信息
            this.showToast('浏览器环境不支持文件夹选择，请手动输入路径', 'warning');
        }
    }

    async scanDirectory() {
        const directory = document.getElementById('directoryPath').value.trim();
        if (!directory) {
            this.showToast('请输入目录路径', 'warning');
            return;
        }

        // 获取扫描选项
        const includeSubfolders = document.getElementById('includeSubfoldersCheck').checked;
        const useOptimized = document.getElementById('useOptimizedCheck').checked;

        this.currentDirectory = directory;
        this.includeSubfolders = includeSubfolders; // 保存扫描设置
        this.showLoading(true);
        this.showProgress(true); // 显示进度条

        try {
            let result;

            if (this.isElectronApp && window.electronAPI) {
                // Electron环境：使用原生文件系统API
                const progressCallback = (progress) => {
                    this.updateProgress(progress);
                };

                result = await window.electronAPI.scanFolderGeneral(directory, {
                    includeSubfolders: includeSubfolders,
                    includeHidden: false,
                    useOptimized: useOptimized, // 传递优化选项
                    progressCallback: progressCallback
                });

                if (result.success) {
                    // 转换为与服务器端兼容的格式
                    this.currentStats = this.convertElectronStatsToServerFormat(result);
                }
            } else {
                // 浏览器环境：使用服务器端API
                const response = await fetch('/folder/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        directory,
                        includeSubfolders,
                        useOptimized
                    })
                });

                result = await response.json();

                if (result.success) {
                    this.currentStats = result.data;
                }
            }

            if (result.success) {
                // 检查是否为大目录
                const isLargeDirectory = this.currentStats && this.currentStats.totalFiles > 10000;

                if (isLargeDirectory) {
                    console.log('大目录检测：优化显示流程');
                    // 立即清除加载状态
                    this.showLoading(false);
                    this.showProgress(false);

                    // 显示处理中状态
                    this.showToast('正在处理扫描数据...', 'info');

                    // 异步显示结果，避免阻塞UI
                    setTimeout(() => {
                        this.displayStats(this.currentStats);
                        this.showOperationsArea();

                        // 显示扫描时间和优化信息
                        let message = '目录扫描完成';
                        if (this.currentStats.scanTime) {
                            message += ` (耗时: ${this.currentStats.scanTime}ms)`;
                        }
                        if (this.currentStats.optimized) {
                            message += ' ⚡';
                        }
                        this.showToast(message, 'success');
                    }, 100); // 给更多时间处理大目录数据
                } else {
                    // 小目录：正常处理
                    this.showLoading(false);
                    this.showProgress(false);

                    setTimeout(() => {
                        this.displayStats(this.currentStats);
                        this.showOperationsArea();

                        // 显示扫描时间和优化信息
                        let message = '目录扫描完成';
                        if (this.currentStats.scanTime) {
                            message += ` (耗时: ${this.currentStats.scanTime}ms)`;
                        }
                        if (this.currentStats.optimized) {
                            message += ' ⚡';
                        }
                        this.showToast(message, 'success');
                    }, 50);
                }
            } else {
                this.showToast(result.error || result.message || '扫描失败', 'error');
            }
        } catch (error) {
            console.error('扫描目录错误:', error);
            this.showToast('扫描目录时发生错误', 'error');
        } finally {
            this.showLoading(false);
            this.showProgress(false); // 隐藏进度条
        }
    }

    convertElectronStatsToServerFormat(electronResult) {
        // 将Electron扫描结果转换为与服务器端兼容的格式
        const { files, folders } = electronResult;
        console.log(`开始转换数据：${files.length} 个文件，${folders.length} 个文件夹`);

        // 计算统计信息
        let totalSize = 0;
        const filesByExtension = {};
        let emptyFolders = []; // 改为let以允许重新赋值

        // 优化的文件统计处理
        const isLargeDirectory = files.length > 10000;

        files.forEach(file => {
            totalSize += file.size;

            const ext = file.extension || '无扩展名';
            if (!filesByExtension[ext]) {
                filesByExtension[ext] = {
                    count: 0,
                    totalSize: 0,
                    files: isLargeDirectory ? [] : [] // 大目录不保存文件列表以节省内存
                };
            }
            filesByExtension[ext].count++;
            filesByExtension[ext].totalSize += file.size;

            // 只有小目录才保存完整文件列表
            if (!isLargeDirectory) {
                filesByExtension[ext].files.push(file);
            }
        });

        // 对于大目录，延迟计算空文件夹以提高性能
        if (files.length > 10000) {
            // 大目录：暂时设置为空数组，后续按需计算
            emptyFolders = [];
            console.log('大目录检测：延迟空文件夹计算以提高性能');
        } else {
            // 小目录：使用优化的空文件夹检查
            const folderFileCount = new Map();

            // 初始化所有文件夹的文件计数为0
            folders.forEach(folder => {
                folderFileCount.set(folder.path, 0);
            });

            // 统计每个文件夹中的文件数量
            files.forEach(file => {
                const filePath = file.path;
                const separator = filePath.includes('/') ? '/' : '\\';
                const pathParts = filePath.split(separator);

                // 为文件所在的每个父目录增加计数
                for (let i = 1; i < pathParts.length; i++) {
                    const folderPath = pathParts.slice(0, i).join(separator);
                    if (folderFileCount.has(folderPath)) {
                        folderFileCount.set(folderPath, folderFileCount.get(folderPath) + 1);
                    }
                }
            });

            // 找出文件计数为0的文件夹
            folders.forEach(folder => {
                if (folderFileCount.get(folder.path) === 0) {
                    emptyFolders.push(folder);
                }
            });
        }

        const result = {
            totalFiles: files.length,
            totalFolders: folders.length,
            totalSize,
            filesByExtension,
            emptyFolders,
            files,
            folders,
            // 传递优化信息
            scanTime: electronResult.scanTime,
            optimized: electronResult.optimized
        };

        console.log(`数据转换完成：${result.totalFiles} 个文件，${result.totalFolders} 个文件夹，${Object.keys(result.filesByExtension).length} 种扩展名`);
        return result;
    }

    displayStats(stats) {
        console.log('开始显示统计信息:', stats);
        const statsCard = document.getElementById('statsCard');
        const statsContent = document.getElementById('statsContent');

        if (!statsCard || !statsContent) {
            console.error('统计卡片元素未找到');
            return;
        }

        const totalSize = this.formatFileSize(stats.totalSize);
        const extensionCount = Object.keys(stats.filesByExtension).length;

        // 对于大目录，显示不同的空文件夹信息
        const emptyFoldersDisplay = stats.totalFiles > 10000
            ? '<span class="text-muted">按需计算</span>'
            : stats.emptyFolders.length;

        statsContent.innerHTML = `
            <div class="col-md-3">
                <div class="text-center">
                    <div class="h4 text-primary">${stats.totalFiles.toLocaleString()}</div>
                    <div class="text-muted">文件总数</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <div class="h4 text-info">${stats.totalFolders.toLocaleString()}</div>
                    <div class="text-muted">文件夹总数</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <div class="h4 text-success">${totalSize}</div>
                    <div class="text-muted">总大小</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <div class="h4 text-warning">${emptyFoldersDisplay}</div>
                    <div class="text-muted">空文件夹</div>
                </div>
            </div>
        `;

        statsCard.style.display = 'block';
        console.log('统计信息显示完成');
    }

    showOperationsArea() {
        document.getElementById('operationsArea').style.display = 'block';
    }

    async previewEmptyFolders() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/folder/delete-empty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: true,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayEmptyFoldersPreview(result.data);
            } else {
                this.showToast(result.message || '预览失败', 'error');
            }
        } catch (error) {
            console.error('预览空文件夹错误:', error);
            this.showToast('预览时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayEmptyFoldersPreview(data) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');
        
        if (data.emptyFolders.length === 0) {
            resultContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    没有找到空文件夹
                </div>
            `;
        } else {
            const foldersList = data.emptyFolders.map(folder => 
                `<li class="list-group-item">${folder}</li>`
            ).join('');
            
            resultContent.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    找到 ${data.count} 个空文件夹
                </div>
                <div class="mt-3">
                    <h6>空文件夹列表：</h6>
                    <ul class="list-group list-group-flush" style="max-height: 300px; overflow-y: auto;">
                        ${foldersList}
                    </ul>
                </div>
            `;
        }
        
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    deleteEmptyFolders() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showConfirmDialog(
            '确认删除空文件夹',
            '此操作将删除所有空文件夹，且无法撤销。确定要继续吗？',
            () => this.executeDeleteEmptyFolders()
        );
    }

    async executeDeleteEmptyFolders() {
        this.showLoading(true);

        try {
            const response = await fetch('/folder/delete-empty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: false,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayDeleteResult(result.data, '空文件夹删除');
                this.showToast(`成功删除 ${result.data.count} 个空文件夹`, 'success');
            } else {
                this.showToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除空文件夹错误:', error);
            this.showToast('删除时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async previewClassification() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const createSubfolders = document.getElementById('createSubfoldersCheck').checked;
            
            const response = await fetch('/folder/classify-by-extension', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: true,
                    createSubfolders,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayClassificationPreview(result.data);
            } else {
                this.showToast(result.message || '预览失败', 'error');
            }
        } catch (error) {
            console.error('预览分类错误:', error);
            this.showToast('预览时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayClassificationPreview(data) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');
        
        const categoriesList = Object.entries(data.classification)
            .map(([category, files]) => `
                <div class="mb-3">
                    <h6 class="text-primary">${category} (${files.length} 个文件)</h6>
                    <div class="ms-3">
                        ${files.slice(0, 5).map(file => `<div class="small text-muted">${file}</div>`).join('')}
                        ${files.length > 5 ? `<div class="small text-muted">... 还有 ${files.length - 5} 个文件</div>` : ''}
                    </div>
                </div>
            `).join('');
        
        resultContent.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                将对 ${data.totalFiles} 个文件进行分类
            </div>
            <div class="mt-3">
                <h6>分类预览：</h6>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${categoriesList}
                </div>
            </div>
        `;
        
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    classifyFiles() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showConfirmDialog(
            '确认文件分类',
            '此操作将移动文件到对应的分类文件夹中。确定要继续吗？',
            () => this.executeClassifyFiles()
        );
    }

    async executeClassifyFiles() {
        this.showLoading(true);

        try {
            const createSubfolders = document.getElementById('createSubfoldersCheck').checked;
            
            const response = await fetch('/folder/classify-by-extension', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: false,
                    createSubfolders,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayClassificationResult(result.data);
                this.showToast(`成功分类 ${result.data.results.moved.length} 个文件`, 'success');
            } else {
                this.showToast(result.message || '分类失败', 'error');
            }
        } catch (error) {
            console.error('文件分类错误:', error);
            this.showToast('分类时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayClassificationResult(data) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');
        
        const { results } = data;
        
        resultContent.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                文件分类完成
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="text-center">
                        <div class="h5 text-success">${results.created.length}</div>
                        <div class="text-muted">创建文件夹</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center">
                        <div class="h5 text-primary">${results.moved.length}</div>
                        <div class="text-muted">移动文件</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center">
                        <div class="h5 text-danger">${results.errors.length}</div>
                        <div class="text-muted">错误</div>
                    </div>
                </div>
            </div>
            ${results.errors.length > 0 ? `
                <div class="mt-3">
                    <h6 class="text-danger">错误信息：</h6>
                    <ul class="list-group list-group-flush">
                        ${results.errors.map(error => `<li class="list-group-item text-danger">${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    showConfirmDialog(title, message, callback) {
        document.querySelector('#confirmModal .modal-title').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;
        
        this.confirmCallback = callback;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
    }

    executeConfirmedAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
        modal.hide();
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
            // 强制重绘以确保状态更新
            if (!show) {
                spinner.offsetHeight; // 触发重绘
            }
        }
    }

    // 显示/隐藏进度条
    showProgress(show) {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }
        if (!show) {
            this.updateProgress({ progress: 0, message: '' });
        }
    }

    // 更新进度
    updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressMessage = document.getElementById('progressMessage');

        if (progressBar) {
            progressBar.style.width = `${progress.progress || 0}%`;
            progressBar.setAttribute('aria-valuenow', progress.progress || 0);
        }

        if (progressText) {
            progressText.textContent = `${progress.progress || 0}%`;
        }

        if (progressMessage) {
            progressMessage.textContent = progress.message || '';
        }

        // 如果有详细信息，显示在控制台
        if (progress.currentPath || progress.filesFound !== undefined) {
            console.log(`扫描进度: ${progress.progress}% - ${progress.message}`, {
                currentPath: progress.currentPath,
                filesFound: progress.filesFound,
                foldersFound: progress.foldersFound
            });
        }
    }

    showToast(message, type = 'info') {
        // 使用现有的toast系统或创建简单的提示
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // 简单的alert作为后备
            alert(message);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async previewDuplicates() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/folder/remove-duplicates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: true,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayDuplicatesPreview(result.data);
            } else {
                this.showToast(result.message || '查找失败', 'error');
            }
        } catch (error) {
            console.error('查找重复文件错误:', error);
            this.showToast('查找时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayDuplicatesPreview(data) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        if (data.duplicates.length === 0) {
            resultContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    没有找到重复文件
                </div>
            `;
        } else {
            const duplicatesList = data.duplicates.map(dup => `
                <div class="mb-3 p-3 border rounded">
                    <div class="text-success"><strong>原文件:</strong> ${dup.original}</div>
                    <div class="text-danger"><strong>重复文件:</strong> ${dup.duplicate}</div>
                </div>
            `).join('');

            resultContent.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    找到 ${data.count} 个重复文件
                </div>
                <div class="mt-3">
                    <h6>重复文件列表：</h6>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${duplicatesList}
                    </div>
                </div>
            `;
        }

        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    removeDuplicates() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showConfirmDialog(
            '确认删除重复文件',
            '此操作将删除重复文件，保留最早的文件，且无法撤销。确定要继续吗？',
            () => this.executeRemoveDuplicates()
        );
    }

    async executeRemoveDuplicates() {
        this.showLoading(true);

        try {
            const response = await fetch('/folder/remove-duplicates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    preview: false,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayDuplicatesResult(result.data);
                this.showToast(`成功删除 ${result.data.count} 个重复文件`, 'success');
            } else {
                this.showToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除重复文件错误:', error);
            this.showToast('删除时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayDuplicatesResult(data) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        resultContent.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                重复文件清理完成
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="text-center">
                        <div class="h5 text-success">${data.deleted.length}</div>
                        <div class="text-muted">删除文件</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="text-center">
                        <div class="h5 text-danger">${data.errors.length}</div>
                        <div class="text-muted">错误</div>
                    </div>
                </div>
            </div>
            ${data.errors.length > 0 ? `
                <div class="mt-3">
                    <h6 class="text-danger">错误信息：</h6>
                    <ul class="list-group list-group-flush">
                        ${data.errors.map(error => `<li class="list-group-item text-danger">${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    async getDetailedStats() {
        if (!this.currentDirectory) {
            this.showToast('请先扫描目录', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/folder/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    includeSubfolders: this.includeSubfolders
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayDetailedStats(result.data);
            } else {
                this.showToast(result.message || '获取统计失败', 'error');
            }
        } catch (error) {
            console.error('获取详细统计错误:', error);
            this.showToast('获取统计时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayDetailedStats(stats) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        const categoriesHtml = Object.entries(stats.filesByCategory)
            .map(([category, data]) => `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">${category}</h6>
                            <p class="card-text">
                                文件数: ${data.count}<br>
                                大小: ${this.formatFileSize(data.size)}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');

        const largestFilesHtml = stats.largestFiles
            .map(file => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span class="text-truncate me-2">${file.name}</span>
                    <span class="badge bg-primary">${this.formatFileSize(file.size)}</span>
                </li>
            `).join('');

        resultContent.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                详细统计信息
            </div>
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-primary">${stats.totalFiles}</div>
                        <div class="text-muted">总文件数</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-info">${stats.totalFolders}</div>
                        <div class="text-muted">总文件夹数</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-success">${this.formatFileSize(stats.totalSize)}</div>
                        <div class="text-muted">总大小</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-warning">${stats.emptyFolders}</div>
                        <div class="text-muted">空文件夹</div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-8">
                    <h6>文件分类统计：</h6>
                    <div class="row">
                        ${categoriesHtml}
                    </div>
                </div>
                <div class="col-md-4">
                    <h6>最大文件 (前10)：</h6>
                    <ul class="list-group list-group-flush">
                        ${largestFilesHtml}
                    </ul>
                </div>
            </div>
        `;

        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    displayDeleteResult(data, operation) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        resultContent.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                ${operation}完成
            </div>
            <div class="text-center">
                <div class="h5 text-success">${data.count}</div>
                <div class="text-muted">处理项目数</div>
            </div>
        `;

        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }
}

// 初始化文件夹管理器
document.addEventListener('DOMContentLoaded', function() {
    new FolderManager();
});
