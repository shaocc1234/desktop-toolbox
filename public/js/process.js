// 图片处理页面JavaScript
class ImageProcessor {
    constructor() {
        this.files = [];
        this.processedResults = [];
        this.isProcessing = false;
        this.isElectronApp = false;
        
        this.initializeElements();
        this.bindEvents();
        this.updateUI();
        this.checkElectronEnvironment();
    }

    initializeElements() {
        // 文件选择相关
        this.fileInput = document.getElementById('fileInput');
        this.folderInput = document.getElementById('folderInput');
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.selectFolderBtn = document.getElementById('selectFolderBtn');
        this.dropZone = document.getElementById('dropZone');
        this.folderOptions = document.getElementById('folderOptions');
        this.includeSubfolders = document.getElementById('includeSubfolders');
        
        // 处理选项
        this.qualityRange = document.getElementById('qualityRange');
        this.qualityValue = document.getElementById('qualityValue');
        this.formatSelect = document.getElementById('formatSelect');
        this.maxWidth = document.getElementById('maxWidth');
        this.maxHeight = document.getElementById('maxHeight');
        this.removeMetadata = document.getElementById('removeMetadata');
        this.progressive = document.getElementById('progressive');
        
        // 控制按钮
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.processAllBtn = document.getElementById('processAllBtn');
        this.saveAllBtn = document.getElementById('saveAllBtn');
        
        // 显示区域
        this.emptyState = document.getElementById('emptyState');
        this.fileList = document.getElementById('fileList');
        this.statsCard = document.getElementById('statsCard');
        
        // 统计元素
        this.totalFiles = document.getElementById('totalFiles');
        this.completedFiles = document.getElementById('completedFiles');
        this.originalSize = document.getElementById('originalSize');
        this.estimatedSize = document.getElementById('estimatedSize');
        this.savedSize = document.getElementById('savedSize');
        this.compressionRatio = document.getElementById('compressionRatio');
        
        // 模态框
        this.saveOptionsModal = new bootstrap.Modal(document.getElementById('saveOptionsModal'));
        this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
    }

    bindEvents() {
        // 文件选择
        this.selectFilesBtn.addEventListener('click', () => this.selectFiles());
        this.selectFolderBtn.addEventListener('click', () => this.selectFolder());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        this.folderInput.addEventListener('change', (e) => this.handleFolderSelect(e.target.files));
        
        // 拖拽上传
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 质量滑块
        this.qualityRange.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value + '%';
            this.updateStats(); // 实时更新预估
        });
        
        // 格式选择变化时更新预估
        this.formatSelect.addEventListener('change', () => {
            this.updateStats();
        });
        
        // 尺寸输入变化时更新预估
        this.maxWidth.addEventListener('input', () => {
            this.updateStats();
        });
        
        this.maxHeight.addEventListener('input', () => {
            this.updateStats();
        });
        
        // 高级选项变化时更新预估
        this.removeMetadata.addEventListener('change', () => {
            this.updateStats();
        });
        
        this.progressive.addEventListener('change', () => {
            this.updateStats();
        });
        
        // 控制按钮
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.processAllBtn.addEventListener('click', () => this.processAll());
        this.saveAllBtn.addEventListener('click', () => this.showSaveOptions());
        
        // 保存确认
        this.confirmSaveBtn.addEventListener('click', () => this.saveAll());
        
        // 保存方式切换事件已在updateUIForWeb中处理
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('Electron环境检测:', this.isElectronApp);
                
                if (this.isElectronApp) {
                    this.updateUIForElectron();
                }
            } catch (error) {
                console.log('Electron API不可用:', error);
                this.isElectronApp = false;
            }
        } else {
            this.isElectronApp = false;
            this.updateUIForWeb();
        }
    }

    updateUIForElectron() {
        // 在Electron环境下，显示替换原文件选项
        const electronReplaceOption = document.getElementById('electronReplaceOption');
        if (electronReplaceOption) {
            electronReplaceOption.style.display = 'block';
        }

        // 更新保存按钮文本
        if (this.saveAllBtn) {
            this.saveAllBtn.innerHTML = '<i class="bi bi-folder-plus me-1"></i>批量保存';
        }
    }

    updateUIForWeb() {
        // 更新保存按钮文本
        if (this.saveAllBtn) {
            this.saveAllBtn.innerHTML = '<i class="bi bi-download me-1"></i>批量保存';
        }

        // 绑定保存方式切换事件
        this.bindSaveModeEvents();
    }

    bindSaveModeEvents() {
        // 延迟绑定，确保DOM元素存在
        setTimeout(() => {
            const radioButtons = document.querySelectorAll('input[name="saveMode"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => this.toggleSaveOptions());
            });
            
            // 初始化显示
            this.toggleSaveOptions();
        }, 100);
    }

    toggleSaveOptions() {
        const saveMode = document.querySelector('input[name="saveMode"]:checked')?.value;
        const saveAsOptions = document.getElementById('saveAsOptions');
        const zipOptions = document.getElementById('zipOptions');
        
        if (!saveAsOptions || !zipOptions) return;

        // 根据选择的保存方式显示相应选项
        if (saveMode === 'folder' || saveMode === 'zip' || saveMode === 'individual') {
            saveAsOptions.style.display = 'block';
            
            // 只有选择ZIP时才显示ZIP选项
            if (saveMode === 'zip') {
                zipOptions.style.display = 'block';
            } else {
                zipOptions.style.display = 'none';
            }
        } else {
            saveAsOptions.style.display = 'none';
            zipOptions.style.display = 'none';
        }
    }

    async selectFiles() {
        if (this.isElectronApp && window.electronAPI) {
            // Electron环境：使用原生文件选择对话框
            try {
                const result = await window.electronAPI.selectFiles();
                if (result.success && result.files.length > 0) {
                    console.log(`选择了 ${result.files.length} 个文件`);
                    await this.addElectronFiles(result.files);
                } else if (result.canceled) {
                    console.log('用户取消了文件选择');
                } else {
                    console.error('文件选择失败:', result.error);
                    this.showToast('文件选择失败', 'error');
                }
            } catch (error) {
                console.error('Electron文件选择失败:', error);
                this.showToast('文件选择失败', 'error');
            }
        } else {
            // 浏览器环境：使用HTML文件输入
            this.fileInput.click();
        }
    }

    handleFileSelect(files) {
        this.addFiles(Array.from(files));
    }

    async selectFolder() {
        if (this.isElectronApp && window.electronAPI) {
            // Electron环境：使用原生文件夹选择对话框
            try {
                const result = await window.electronAPI.selectFolder();
                if (result.success && result.folderPath) {
                    this.folderOptions.style.display = 'block';
                    await this.scanElectronFolder(result.folderPath);
                }
            } catch (error) {
                console.error('Electron文件夹选择失败:', error);
                this.showToast('文件夹选择失败', 'error');
            }
        } else {
            // 浏览器环境：显示文件夹选项并触发文件夹选择
            this.folderOptions.style.display = 'block';
            this.folderInput.click();
        }
    }

    async scanElectronFolder(folderPath) {
        try {
            this.showToast('正在扫描文件夹...', 'info');
            
            const includeSubfolders = this.includeSubfolders.checked;
            console.log(`扫描文件夹: ${folderPath}, 包含子文件夹: ${includeSubfolders}`);
            
            const result = await window.electronAPI.scanFolder(folderPath, includeSubfolders);
            console.log('扫描结果:', result);
            
            if (result.success && result.files.length > 0) {
                console.log(`找到 ${result.files.length} 个图片文件，开始添加到处理队列...`);
                await this.addElectronFiles(result.files);
                this.showToast(`扫描完成：找到 ${result.files.length} 个图片文件`, 'success');
            } else if (result.success && result.files.length === 0) {
                console.log('扫描成功但未找到图片文件');
                this.showToast('未找到图片文件', 'warning');
            } else {
                console.error('扫描失败:', result.error);
                this.showToast(`扫描失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('扫描文件夹失败:', error);
            this.showToast('扫描文件夹失败', 'error');
        }
    }

    async addElectronFiles(electronFiles) {
        // 为Electron文件创建File对象
        const files = [];
        let successCount = 0;
        let errorCount = 0;
        
        console.log(`开始处理 ${electronFiles.length} 个文件...`);
        
        for (const electronFile of electronFiles) {
            try {
                console.log(`正在读取文件: ${electronFile.path}`);
                
                // 使用Electron API读取文件内容
                const result = await window.electronAPI.readFileContent(electronFile.path);
                
                if (result.success) {
                    // 创建Uint8Array并转换为Blob
                    const uint8Array = new Uint8Array(result.buffer);
                    const blob = new Blob([uint8Array], {
                        type: this.getMimeType(electronFile.extension)
                    });
                    
                    // 创建File对象，保留原始路径信息
                    const file = new File([blob], electronFile.name, {
                        type: this.getMimeType(electronFile.extension),
                        lastModified: Date.now()
                    });
                    
                    // 添加原始路径信息
                    file.originalPath = electronFile.path;
                    files.push(file);
                    successCount++;
                    
                    console.log(`✅ 成功读取: ${electronFile.name} (${this.formatFileSize(electronFile.size)})`);
                } else {
                    console.error(`❌ 读取文件失败: ${electronFile.path} - ${result.error}`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ 处理文件失败: ${electronFile.path}`, error);
                errorCount++;
            }
        }
        
        console.log(`文件处理完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
        
        if (files.length > 0) {
            this.addFiles(files);
            console.log(`已添加 ${files.length} 个文件到处理队列`);
        } else {
            this.showToast('没有成功读取到文件', 'error');
        }
    }

    getMimeType(extension) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.svg': 'image/svg+xml',
            '.heic': 'image/heic',
            '.heif': 'image/heif'
        };
        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }

    handleFolderSelect(files) {
        const fileArray = Array.from(files);
        const includeSubfolders = this.includeSubfolders.checked;
        
        // 过滤图片文件
        const imageFiles = fileArray.filter(file => this.isImageFile(file));
        
        if (!includeSubfolders) {
            // 只包含根目录的文件
            const rootFiles = imageFiles.filter(file => {
                const pathParts = file.webkitRelativePath.split('/');
                return pathParts.length === 2; // 只有文件夹名和文件名
            });
            this.addFiles(rootFiles);
        } else {
            // 包含所有子文件夹的文件
            this.addFiles(imageFiles);
        }
        
        // 显示扫描结果
        const totalScanned = fileArray.length;
        const imageCount = imageFiles.length;
        const skippedCount = totalScanned - imageCount;
        
        let message = `扫描完成：找到 ${imageCount} 个图片文件`;
        if (skippedCount > 0) {
            message += `，跳过 ${skippedCount} 个非图片文件`;
        }
        
        this.showToast(message, 'success');
        
        // 重置文件夹输入
        this.folderInput.value = '';
    }

    isImageFile(file) {
        const imageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff',
            'image/heic', 'image/heif'
        ];
        return imageTypes.includes(file.type.toLowerCase());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const items = Array.from(e.dataTransfer.items);
        const files = Array.from(e.dataTransfer.files);
        
        // 检查是否有文件夹
        const hasDirectories = items.some(item => 
            item.webkitGetAsEntry && item.webkitGetAsEntry().isDirectory
        );
        
        if (hasDirectories) {
            // 处理文件夹拖拽
            this.handleDirectoryDrop(items);
        } else {
            // 处理文件拖拽
            const imageFiles = files.filter(file => this.isImageFile(file));
            
            if (imageFiles.length > 0) {
                this.addFiles(imageFiles);
            } else {
                this.showToast('请选择图片文件', 'warning');
            }
        }
    }

    async handleDirectoryDrop(items) {
        // 显示扫描进度
        this.showToast('正在扫描文件夹...', 'info');
        
        const allFiles = [];
        
        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                const files = await this.scanDirectory(entry);
                allFiles.push(...files);
            }
        }
        
        const imageFiles = allFiles.filter(file => this.isImageFile(file));
        
        if (imageFiles.length > 0) {
            this.addFiles(imageFiles);
            const skippedCount = allFiles.length - imageFiles.length;
            let message = `扫描完成：找到 ${imageFiles.length} 个图片文件`;
            if (skippedCount > 0) {
                message += `，跳过 ${skippedCount} 个非图片文件`;
            }
            this.showToast(message, 'success');
        } else {
            this.showToast('未找到图片文件', 'warning');
        }
    }

    async scanDirectory(entry, includeSubfolders = true) {
        const files = [];
        
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file(resolve);
            }).then(file => [file]);
        }
        
        if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await new Promise((resolve) => {
                reader.readEntries(resolve);
            });
            
            for (const childEntry of entries) {
                if (childEntry.isFile) {
                    const file = await new Promise((resolve) => {
                        childEntry.file(resolve);
                    });
                    files.push(file);
                } else if (childEntry.isDirectory && includeSubfolders) {
                    const subFiles = await this.scanDirectory(childEntry, includeSubfolders);
                    files.push(...subFiles);
                }
            }
        }
        
        return files;
    }

    addFiles(newFiles) {
        console.log(`addFiles 被调用，接收到 ${newFiles.length} 个文件`);
        
        // 过滤重复文件
        const existingNames = this.files.map(f => f.name);
        const uniqueFiles = newFiles.filter(f => !existingNames.includes(f.name));
        
        console.log(`过滤后剩余 ${uniqueFiles.length} 个唯一文件`);
        
        if (uniqueFiles.length === 0) {
            console.log('没有新的唯一文件可添加');
            this.showToast('所选文件已存在于队列中', 'warning');
            return;
        }
        
        // 添加文件到队列
        uniqueFiles.forEach(file => {
            const fileObj = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: file.size,
                status: 'pending', // pending, processing, completed, error
                result: null,
                error: null,
                // 存储原始路径信息（用于Electron环境）
                originalPath: file.originalPath || file.path || null
            };
            this.files.push(fileObj);
        });
        
        console.log(`成功添加 ${uniqueFiles.length} 个文件到队列，当前队列总数: ${this.files.length}`);
        
        this.updateUI();
        this.renderFileList();
        this.showToast(`已添加 ${uniqueFiles.length} 个文件`, 'success');
    }

    reconstructFilePath(file) {
        // 尝试从webkitRelativePath重构完整路径
        if (file.webkitRelativePath) {
            // 这只是相对路径，在Electron中我们需要完整路径
            // 但浏览器安全限制不允许获取完整路径
            return null;
        }
        return null;
    }

    clearAll() {
        if (this.isProcessing) {
            this.showToast('正在处理中，无法清空队列', 'warning');
            return;
        }
        
        this.files = [];
        this.processedResults = [];
        this.updateUI();
        this.renderFileList();
    }

    async processAll() {
        if (this.files.length === 0) {
            this.showToast('请先选择要处理的文件', 'warning');
            return;
        }
        
        if (this.isProcessing) {
            this.showToast('正在处理中，请稍候', 'warning');
            return;
        }
        
        this.isProcessing = true;
        this.updateUI();
        
        try {
            // 准备FormData
            const formData = new FormData();
            
            // 添加文件
            this.files.forEach(fileObj => {
                formData.append('images', fileObj.file);
                fileObj.status = 'processing';
            });
            
            // 添加处理选项
            formData.append('quality', this.qualityRange.value);
            formData.append('format', this.formatSelect.value);
            if (this.maxWidth.value) formData.append('maxWidth', this.maxWidth.value);
            if (this.maxHeight.value) formData.append('maxHeight', this.maxHeight.value);
            formData.append('removeMetadata', this.removeMetadata.checked);
            formData.append('progressive', this.progressive.checked);
            
            this.renderFileList();
            
            // 发送请求
            const response = await fetch('/process/batch', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 更新文件状态和结果
                data.results.forEach((result, index) => {
                    if (index < this.files.length) {
                        this.files[index].status = result.success ? 'completed' : 'error';
                        this.files[index].result = result.success ? result : null;
                        this.files[index].error = result.success ? null : result.error;
                    }
                });
                
                this.processedResults = data.results.filter(r => r.success);
                this.showToast(`处理完成！成功 ${data.summary.successful} 个，失败 ${data.summary.failed} 个`, 'success');
            } else {
                this.showToast('处理失败：' + data.message, 'error');
            }
            
        } catch (error) {
            console.error('处理错误:', error);
            this.showToast('处理失败：' + error.message, 'error');
            
            // 重置文件状态
            this.files.forEach(fileObj => {
                if (fileObj.status === 'processing') {
                    fileObj.status = 'error';
                    fileObj.error = '网络错误';
                }
            });
        } finally {
            this.isProcessing = false;
            this.updateUI();
            this.renderFileList();
            this.updateStats();
        }
    }

    showSaveOptions() {
        if (this.processedResults.length === 0) {
            this.showToast('没有可保存的处理结果', 'warning');
            return;
        }
        
        this.saveOptionsModal.show();
    }

    toggleSaveOptions() {
        const saveAsNew = document.getElementById('saveAsNew').checked;
        const saveAsOptions = document.getElementById('saveAsOptions');
        saveAsOptions.style.display = saveAsNew ? 'block' : 'none';
    }

    async saveAll() {
        const saveMode = document.querySelector('input[name="saveMode"]:checked').value;
        const suffix = document.getElementById('filenameSuffix').value || '_processed';
        
        try {
            if (this.isElectronApp && saveMode === 'replace') {
                // Electron环境下的原路径保存
                await this.saveToOriginalPaths();
            } else if (this.isElectronApp && saveMode === 'folder') {
                // Electron环境下的文件夹保存
                await this.saveToFolder(suffix);
            } else if (saveMode === 'folder') {
                // Web环境下的文件夹保存
                await this.saveToFolderWeb(suffix);
            } else if (saveMode === 'zip') {
                // ZIP压缩包保存
                await this.saveAsZip(suffix);
            } else if (saveMode === 'individual') {
                // 逐个下载
                await this.downloadIndividualFiles(suffix);
            }
            
            this.saveOptionsModal.hide();
            this.showToast('所有文件保存完成', 'success');
            
        } catch (error) {
            console.error('保存错误:', error);
            this.showToast('保存失败：' + error.message, 'error');
        }
    }

    async downloadIndividualFiles(suffix) {
        for (const fileObj of this.files) {
            if (fileObj.status === 'completed' && fileObj.result) {
                await this.downloadFile(fileObj.result, fileObj.name, 'new', suffix);
                // 添加延迟避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    async saveToFolder(suffix) {
        try {
            // 选择保存文件夹
            const folderResult = await window.electronAPI.selectSaveFolder();
            
            if (!folderResult.success) {
                if (folderResult.canceled) {
                    this.showToast('用户取消了文件夹选择', 'info');
                } else {
                    this.showToast('选择文件夹失败', 'error');
                }
                return;
            }

            const folderPath = folderResult.folderPath;
            console.log(`选择的保存文件夹: ${folderPath}`);

            // 准备要保存的文件数据
            const filesToSave = [];
            
            for (const fileObj of this.files) {
                if (fileObj.status === 'completed' && fileObj.result) {
                    // 生成文件名
                    const ext = fileObj.result.format === 'jpeg' ? 'jpg' : fileObj.result.format;
                    const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
                    const filename = nameWithoutExt + suffix + '.' + ext;
                    
                    // 转换base64为ArrayBuffer
                    const buffer = Uint8Array.from(atob(fileObj.result.processedBuffer), c => c.charCodeAt(0));
                    
                    filesToSave.push({
                        filename: filename,
                        buffer: Array.from(buffer),
                        originalPath: fileObj.originalPath || fileObj.name
                    });
                }
            }

            if (filesToSave.length === 0) {
                this.showToast('没有可保存的文件', 'warning');
                return;
            }

            console.log(`准备保存 ${filesToSave.length} 个文件到文件夹`);

            // 批量保存文件
            const saveResult = await window.electronAPI.saveFilesToFolder(folderPath, filesToSave);
            
            if (saveResult.success) {
                const { successful, failed, savedToFolder } = saveResult.summary;
                
                if (failed > 0) {
                    this.showToast(`保存完成：成功 ${successful} 个，失败 ${failed} 个`, 'warning');
                } else {
                    this.showToast(`成功保存 ${successful} 个文件到：${savedToFolder}`, 'success');
                }
                
                console.log('保存结果:', saveResult);
            } else {
                this.showToast(`批量保存失败: ${saveResult.error}`, 'error');
            }
            
        } catch (error) {
            console.error('文件夹保存失败:', error);
            this.showToast('文件夹保存失败：' + error.message, 'error');
        }
    }

    async saveToFolderWeb(suffix) {
        try {
            // 检查是否支持File System Access API
            if ('showDirectoryPicker' in window) {
                await this.saveToFolderWithFSA(suffix);
            } else {
                // 降级到ZIP文件下载
                await this.saveAsZip(suffix);
            }
        } catch (error) {
            console.error('Web文件夹保存失败:', error);
            this.showToast('保存失败：' + error.message, 'error');
        }
    }

    async saveToFolderWithFSA(suffix) {
        try {
            // 使用File System Access API选择文件夹
            const directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });

            let savedCount = 0;
            let errorCount = 0;

            for (const fileObj of this.files) {
                if (fileObj.status === 'completed' && fileObj.result) {
                    try {
                        // 生成文件名
                        const ext = fileObj.result.format === 'jpeg' ? 'jpg' : fileObj.result.format;
                        const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
                        let filename = nameWithoutExt + suffix + '.' + ext;

                        // 处理文件名冲突
                        let counter = 1;
                        let finalFilename = filename;
                        while (true) {
                            try {
                                await directoryHandle.getFileHandle(finalFilename);
                                // 文件已存在，生成新名称
                                const parsedName = finalFilename.replace(/\.[^/.]+$/, '');
                                const extension = finalFilename.split('.').pop();
                                finalFilename = `${nameWithoutExt}${suffix}(${counter}).${extension}`;
                                counter++;
                            } catch {
                                // 文件不存在，可以使用这个名称
                                break;
                            }
                        }

                        // 创建文件
                        const fileHandle = await directoryHandle.getFileHandle(finalFilename, {
                            create: true
                        });

                        // 写入文件内容
                        const writable = await fileHandle.createWritable();
                        const buffer = Uint8Array.from(atob(fileObj.result.processedBuffer), c => c.charCodeAt(0));
                        await writable.write(buffer);
                        await writable.close();

                        savedCount++;
                        console.log(`✅ 已保存: ${finalFilename}`);

                    } catch (error) {
                        console.error(`❌ 保存文件失败: ${fileObj.name}`, error);
                        errorCount++;
                    }
                }
            }

            if (errorCount > 0) {
                this.showToast(`保存完成：成功 ${savedCount} 个，失败 ${errorCount} 个`, 'warning');
            } else {
                this.showToast(`成功保存 ${savedCount} 个文件到选择的文件夹`, 'success');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('用户取消了文件夹选择', 'info');
            } else {
                console.error('FSA保存失败:', error);
                this.showToast('保存失败：' + error.message, 'error');
            }
        }
    }

    async saveAsZip(suffix) {
        try {
            console.log('开始创建ZIP文件...');
            
            // 动态加载JSZip库
            this.showToast('正在加载ZIP库...', 'info');
            await this.loadJSZip();
            
            if (!window.JSZip) {
                throw new Error('JSZip库加载失败');
            }

            // 获取ZIP打包方式
            const zipStructure = document.querySelector('input[name="zipStructure"]:checked')?.value || 'flat';
            console.log('ZIP打包方式:', zipStructure);
            
            const zip = new JSZip();
            let fileCount = 0;
            const folderMap = new Map(); // 用于跟踪文件夹结构

            // 添加文件到ZIP
            for (const fileObj of this.files) {
                if (fileObj.status === 'completed' && fileObj.result) {
                    try {
                        // 生成文件名
                        const ext = fileObj.result.format === 'jpeg' ? 'jpg' : fileObj.result.format;
                        const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
                        const processedFilename = nameWithoutExt + suffix + '.' + ext;

                        // 转换base64为二进制数据
                        const buffer = Uint8Array.from(atob(fileObj.result.processedBuffer), c => c.charCodeAt(0));
                        
                        let zipPath;
                        
                        if (zipStructure === 'original' && fileObj.originalPath) {
                            // 保持原文件结构
                            zipPath = this.generateZipPathWithStructure(fileObj.originalPath, processedFilename, folderMap);
                        } else {
                            // 平铺打包
                            zipPath = this.generateUniqueZipPath(zip, processedFilename);
                        }
                        
                        zip.file(zipPath, buffer);
                        fileCount++;
                        
                        console.log(`添加到ZIP: ${zipPath}`);
                    } catch (error) {
                        console.error(`处理文件 ${fileObj.name} 失败:`, error);
                    }
                }
            }

            if (fileCount === 0) {
                this.showToast('没有可保存的文件', 'warning');
                return;
            }

            // 生成ZIP文件名
            const structureType = zipStructure === 'original' ? 'structured' : 'flat';
            const timestamp = new Date().toISOString().slice(0, 10);
            const zipFilename = `processed_images_${structureType}_${timestamp}.zip`;

            // 生成ZIP文件
            this.showToast('正在生成ZIP文件...', 'info');
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            console.log('ZIP文件生成完成，大小:', zipBlob.size);

            // 下载ZIP文件
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipFilename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            const structureDesc = zipStructure === 'original' ? '(保持原结构)' : '(平铺结构)';
            this.showToast(`成功创建包含 ${fileCount} 个文件的ZIP压缩包 ${structureDesc}`, 'success');

        } catch (error) {
            console.error('ZIP保存失败:', error);
            this.showToast('创建ZIP文件失败：' + error.message, 'error');
        }
    }

    generateZipPathWithStructure(originalPath, processedFilename, folderMap) {
        try {
            // 提取原文件的目录结构
            const pathParts = originalPath.split(/[/\\]/);
            const originalFilename = pathParts.pop(); // 移除文件名
            const dirPath = pathParts.join('/');
            
            // 如果有目录结构，保持它
            if (dirPath && pathParts.length > 0) {
                // 获取相对路径（去掉绝对路径的前缀）
                let relativePath = dirPath;
                
                // 尝试提取有意义的目录结构
                if (pathParts.length > 2) {
                    // 保留最后2-3级目录
                    relativePath = pathParts.slice(-2).join('/');
                }
                
                const zipPath = `${relativePath}/${processedFilename}`;
                
                // 处理重复文件名
                return this.generateUniqueZipPathInFolder(folderMap, zipPath, relativePath, processedFilename);
            } else {
                // 没有目录结构，放在根目录
                return this.generateUniqueFileName(processedFilename, folderMap, '');
            }
        } catch (error) {
            console.warn('解析文件路径失败，使用平铺结构:', error);
            return this.generateUniqueFileName(processedFilename, folderMap, '');
        }
    }

    generateUniqueZipPathInFolder(folderMap, fullPath, folderPath, filename) {
        const folderKey = folderPath || 'root';
        
        if (!folderMap.has(folderKey)) {
            folderMap.set(folderKey, new Set());
        }
        
        const folderFiles = folderMap.get(folderKey);
        let uniquePath = fullPath;
        let counter = 1;
        
        while (folderFiles.has(uniquePath)) {
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            const ext = filename.split('.').pop();
            const uniqueFilename = `${nameWithoutExt}(${counter}).${ext}`;
            uniquePath = folderPath ? `${folderPath}/${uniqueFilename}` : uniqueFilename;
            counter++;
        }
        
        folderFiles.add(uniquePath);
        return uniquePath;
    }

    generateUniqueZipPath(zip, filename) {
        let uniqueFilename = filename;
        let counter = 1;
        
        while (zip.file(uniqueFilename)) {
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            const ext = filename.split('.').pop();
            uniqueFilename = `${nameWithoutExt}(${counter}).${ext}`;
            counter++;
        }
        
        return uniqueFilename;
    }

    generateUniqueFileName(filename, folderMap, folderPath) {
        const folderKey = folderPath || 'root';
        
        if (!folderMap.has(folderKey)) {
            folderMap.set(folderKey, new Set());
        }
        
        const folderFiles = folderMap.get(folderKey);
        let uniqueFilename = filename;
        let counter = 1;
        
        while (folderFiles.has(uniqueFilename)) {
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            const ext = filename.split('.').pop();
            uniqueFilename = `${nameWithoutExt}(${counter}).${ext}`;
            counter++;
        }
        
        folderFiles.add(uniqueFilename);
        return uniqueFilename;
    }

    async loadJSZip() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.JSZip) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
            script.onload = () => {
                console.log('JSZip库加载成功');
                resolve();
            };
            script.onerror = (error) => {
                console.error('JSZip库加载失败:', error);
                reject(new Error('无法加载JSZip库，请检查网络连接'));
            };
            document.head.appendChild(script);
        });
    }

    async saveToOriginalPaths() {
        let savedCount = 0;
        let errorCount = 0;
        
        for (const fileObj of this.files) {
            if (fileObj.status === 'completed' && fileObj.result && fileObj.originalPath) {
                try {
                    // 确定新的扩展名
                    const newExtension = fileObj.result.format === 'jpeg' ? 'jpg' : fileObj.result.format;
                    
                    // 转换base64为ArrayBuffer
                    const buffer = Uint8Array.from(atob(fileObj.result.processedBuffer), c => c.charCodeAt(0));
                    
                    // 调用Electron API保存文件
                    const result = await window.electronAPI.saveFileToPath(
                        fileObj.originalPath,
                        Array.from(buffer),
                        newExtension
                    );
                    
                    if (result.success) {
                        savedCount++;
                        console.log(`✅ 已保存: ${result.savedPath}`);
                        if (result.deletedOriginal) {
                            console.log(`🗑️ 已删除原文件，保存为新格式`);
                        }
                    } else {
                        errorCount++;
                        console.error(`❌ 保存失败: ${result.error}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ 保存文件 ${fileObj.name} 失败:`, error);
                }
            } else if (fileObj.status === 'completed' && fileObj.result && !fileObj.originalPath) {
                // 没有原路径信息，回退到下载模式
                await this.downloadFile(fileObj.result, fileObj.name, 'new', '_processed');
                savedCount++;
            }
        }
        
        if (errorCount > 0) {
            this.showToast(`保存完成：成功 ${savedCount} 个，失败 ${errorCount} 个`, 'warning');
        } else {
            this.showToast(`成功保存 ${savedCount} 个文件到原路径`, 'success');
        }
    }

    async downloadFile(result, originalName, saveMode, suffix) {
        try {
            // 创建下载链接
            const buffer = Uint8Array.from(atob(result.processedBuffer), c => c.charCodeAt(0));
            const blob = new Blob([buffer], { type: `image/${result.format}` });
            
            // 生成文件名
            let filename;
            if (saveMode === 'replace') {
                // 替换模式：保持原文件名但更新扩展名
                const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
                const ext = result.format === 'jpeg' ? 'jpg' : result.format;
                filename = nameWithoutExt + '.' + ext;
            } else {
                // 另存为模式：添加后缀
                const ext = result.format === 'jpeg' ? 'jpg' : result.format;
                const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
                filename = nameWithoutExt + suffix + '.' + ext;
            }
            
            // 创建下载
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log(`已下载文件: ${filename}`);
            
        } catch (error) {
            console.error('下载文件失败:', error);
            throw error;
        }
    }

    updateUI() {
        const hasFiles = this.files.length > 0;
        const hasCompleted = this.files.some(f => f.status === 'completed');
        
        // 显示/隐藏区域
        this.emptyState.style.display = hasFiles ? 'none' : 'block';
        this.fileList.style.display = hasFiles ? 'block' : 'none';
        this.statsCard.style.display = hasFiles ? 'block' : 'none';
        
        // 按钮状态
        this.processAllBtn.disabled = !hasFiles || this.isProcessing;
        this.clearAllBtn.disabled = this.isProcessing;
        this.saveAllBtn.disabled = !hasCompleted;
        
        // 按钮文本
        if (this.isProcessing) {
            this.processAllBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>处理中...';
        } else {
            this.processAllBtn.innerHTML = '<i class="bi bi-play-circle me-1"></i>开始处理';
        }
    }

    renderFileList() {
        this.fileList.innerHTML = '';
        
        this.files.forEach(fileObj => {
            const fileItem = this.createFileItem(fileObj);
            this.fileList.appendChild(fileItem);
        });
    }

    createFileItem(fileObj) {
        const div = document.createElement('div');
        div.className = `file-item ${fileObj.status}`;
        
        const statusIcon = this.getStatusIcon(fileObj.status);
        const sizeText = this.formatFileSize(fileObj.size);
        
        let resultInfo = '';
        if (fileObj.status === 'completed' && fileObj.result) {
            const newSize = fileObj.result.processedSize;
            const compression = fileObj.result.compressionRatio;
            resultInfo = `
                <div class="mt-2">
                    <small class="text-success">
                        <i class="bi bi-check-circle me-1"></i>
                        处理完成：${this.formatFileSize(newSize)} 
                        (节省 ${compression}%)
                    </small>
                </div>
            `;
        } else if (fileObj.status === 'error' && fileObj.error) {
            resultInfo = `
                <div class="mt-2">
                    <small class="text-danger">
                        <i class="bi bi-exclamation-circle me-1"></i>
                        ${fileObj.error}
                    </small>
                </div>
            `;
        } else if (fileObj.status === 'pending' || fileObj.status === 'processing') {
            // 显示预估处理后大小
            const estimatedSize = this.estimateProcessedSize(fileObj.size, fileObj.file);
            const estimatedSavings = ((fileObj.size - estimatedSize) / fileObj.size * 100).toFixed(1);
            resultInfo = `
                <div class="mt-2">
                    <small class="text-info">
                        <i class="bi bi-clock me-1"></i>
                        预估处理后：${this.formatFileSize(estimatedSize)} 
                        (预计节省 ${estimatedSavings}%)
                    </small>
                </div>
            `;
        }
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        ${statusIcon}
                        <div class="ms-2">
                            <div class="fw-medium">${fileObj.name}</div>
                            <small class="text-muted">${sizeText}</small>
                        </div>
                    </div>
                    ${resultInfo}
                </div>
                <div class="ms-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="imageProcessor.removeFile('${fileObj.id}')" ${this.isProcessing ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pending':
                return '<i class="bi bi-clock text-warning"></i>';
            case 'processing':
                return '<div class="spinner-border spinner-border-sm text-primary" role="status"></div>';
            case 'completed':
                return '<i class="bi bi-check-circle text-success"></i>';
            case 'error':
                return '<i class="bi bi-exclamation-circle text-danger"></i>';
            default:
                return '<i class="bi bi-file-image text-muted"></i>';
        }
    }

    removeFile(fileId) {
        if (this.isProcessing) {
            this.showToast('正在处理中，无法删除文件', 'warning');
            return;
        }
        
        this.files = this.files.filter(f => f.id !== fileId);
        this.updateUI();
        this.renderFileList();
        this.updateStats();
    }

    updateStats() {
        const total = this.files.length;
        const completed = this.files.filter(f => f.status === 'completed').length;
        
        let totalOriginalSize = 0;
        let totalProcessedSize = 0;
        let estimatedProcessedSize = 0;
        
        this.files.forEach(fileObj => {
            totalOriginalSize += fileObj.size;
            if (fileObj.status === 'completed' && fileObj.result) {
                totalProcessedSize += fileObj.result.processedSize;
            } else {
                // 为未处理的文件估算处理后大小
                estimatedProcessedSize += this.estimateProcessedSize(fileObj.size, fileObj.file);
            }
        });
        
        const actualSavedSize = totalOriginalSize - totalProcessedSize;
        const estimatedTotalProcessedSize = totalProcessedSize + estimatedProcessedSize;
        const estimatedTotalSavedSize = totalOriginalSize - estimatedTotalProcessedSize;
        
        this.totalFiles.textContent = total;
        this.completedFiles.textContent = completed;
        this.originalSize.textContent = this.formatFileSize(totalOriginalSize);
        
        // 显示实际节省的空间和预估总节省空间
        if (completed > 0 && completed < total) {
            this.savedSize.innerHTML = `
                <div>${this.formatFileSize(actualSavedSize)} <small class="text-muted">(已完成)</small></div>
                <div class="text-info"><small>预估总计: ${this.formatFileSize(estimatedTotalSavedSize)}</small></div>
            `;
        } else if (completed === total && total > 0) {
            this.savedSize.textContent = this.formatFileSize(actualSavedSize);
        } else {
            this.savedSize.innerHTML = `
                <div class="text-info">预估: ${this.formatFileSize(estimatedTotalSavedSize)}</div>
            `;
        }
        
        // 更新预估处理后大小和压缩比例
        if (this.estimatedSize) {
            this.estimatedSize.textContent = this.formatFileSize(estimatedTotalProcessedSize);
        }
        
        // 更新压缩比例
        if (this.compressionRatio && totalOriginalSize > 0) {
            const overallCompressionRatio = ((totalOriginalSize - estimatedTotalProcessedSize) / totalOriginalSize * 100).toFixed(1);
            this.compressionRatio.textContent = overallCompressionRatio + '%';
        }
    }

    /**
     * 估算处理后的文件大小
     * @param {number} originalSize - 原始文件大小
     * @param {File} file - 文件对象
     * @returns {number} 估算的处理后大小
     */
    estimateProcessedSize(originalSize, file) {
        const quality = parseInt(this.qualityRange.value) || 80;
        const format = this.formatSelect.value;
        const maxWidth = parseInt(this.maxWidth.value) || null;
        const maxHeight = parseInt(this.maxHeight.value) || null;
        
        let estimatedSize = originalSize;
        
        // 根据文件类型和质量设置估算压缩比
        const fileType = file.type.toLowerCase();
        let compressionFactor = 1;
        
        // 质量压缩估算
        if (quality < 100) {
            if (fileType.includes('jpeg') || fileType.includes('jpg')) {
                // JPEG文件的压缩估算
                compressionFactor = Math.max(0.1, quality / 100);
            } else if (fileType.includes('png')) {
                // PNG文件的压缩估算（PNG压缩效果较小）
                compressionFactor = Math.max(0.3, 0.3 + (quality / 100) * 0.7);
            } else if (fileType.includes('webp')) {
                // WebP文件的压缩估算
                compressionFactor = Math.max(0.1, quality / 120); // WebP压缩效果更好
            } else {
                // 其他格式
                compressionFactor = Math.max(0.2, quality / 100);
            }
        }
        
        // 格式转换估算
        if (format !== 'original') {
            switch (format) {
                case 'webp':
                    compressionFactor *= 0.7; // WebP通常比JPEG小30%
                    break;
                case 'jpeg':
                    if (fileType.includes('png')) {
                        compressionFactor *= 0.6; // PNG转JPEG通常压缩明显
                    }
                    break;
                case 'png':
                    if (fileType.includes('jpeg')) {
                        compressionFactor *= 1.5; // JPEG转PNG通常会增大
                    }
                    break;
            }
        }
        
        // 尺寸调整估算
        if (maxWidth || maxHeight) {
            // 简单估算：假设图片尺寸按比例缩小
            const estimatedResizeFactor = 0.7; // 假设平均缩小到70%
            compressionFactor *= estimatedResizeFactor;
        }
        
        // 元数据移除估算（通常节省很少空间）
        if (this.removeMetadata.checked) {
            compressionFactor *= 0.98; // 大约节省2%
        }
        
        estimatedSize = Math.round(originalSize * compressionFactor);
        
        // 确保估算大小不小于1KB
        return Math.max(1024, estimatedSize);
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(message, type = 'info') {
        // 使用现有的toast系统
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.utils && window.utils.showToast) {
            window.utils.showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
            // 简单的alert作为后备
            if (type === 'error') {
                alert('错误: ' + message);
            }
        }
    }
}

// 全局函数
function setPresetSize(width, height) {
    document.getElementById('maxWidth').value = width;
    document.getElementById('maxHeight').value = height;
}

function clearSize() {
    document.getElementById('maxWidth').value = '';
    document.getElementById('maxHeight').value = '';
}

async function applyPreset(scenario) {
    try {
        const response = await fetch(`/process/presets/${scenario}`);
        const data = await response.json();
        
        if (data.success) {
            const settings = data.settings;
            
            // 应用设置
            document.getElementById('qualityRange').value = settings.quality;
            document.getElementById('qualityValue').textContent = settings.quality + '%';
            document.getElementById('formatSelect').value = settings.format;
            document.getElementById('maxWidth').value = settings.maxWidth || '';
            document.getElementById('maxHeight').value = settings.maxHeight || '';
            document.getElementById('removeMetadata').checked = settings.removeMetadata;
            document.getElementById('progressive').checked = settings.progressive;
            
            // 显示提示
            if (window.showToast) {
                window.showToast(`已应用${getPresetName(scenario)}预设`, 'success');
            } else if (window.utils && window.utils.showToast) {
                window.utils.showToast(`已应用${getPresetName(scenario)}预设`, 'success');
            }
        }
    } catch (error) {
        console.error('应用预设失败:', error);
        if (window.showToast) {
            window.showToast('应用预设失败', 'error');
        } else if (window.utils && window.utils.showToast) {
            window.utils.showToast('应用预设失败', 'error');
        }
    }
}

function getPresetName(scenario) {
    const names = {
        web: '网页优化',
        social: '社交媒体',
        print: '打印用途',
        archive: '存储归档',
        thumbnail: '缩略图'
    };
    return names[scenario] || scenario;
}

// 初始化
let imageProcessor;
document.addEventListener('DOMContentLoaded', function() {
    console.log('图片处理页面正在初始化...');
    try {
        imageProcessor = new ImageProcessor();
        console.log('图片处理器初始化成功');
    } catch (error) {
        console.error('图片处理器初始化失败:', error);
    }
});
