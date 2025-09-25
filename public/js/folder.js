// public/js/folder.js - 文件夹管理前端脚本

class FolderManager {
    constructor() {
        this.currentDirectory = '';
        this.currentStats = null;
        this.isElectronApp = false;
        this.includeSubfolders = true; // 保存当前扫描设置
        this.historyStorageKey = 'folderManager_directoryHistory'; // 本地存储键名
        this.maxHistoryItems = 10; // 最大历史记录数量
        this.init();
    }

    async init() {
        this.bindEvents();
        this.loadDirectoryHistory();
        this.initThemeListener();
        await this.checkElectronEnvironment();
        await this.loadClassificationStrategies();
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

        // 目录输入框事件
        const directoryInput = document.getElementById('directoryPath');
        const historyDropdown = document.getElementById('historyDropdown');

        // 输入框获得焦点时显示历史记录
        directoryInput.addEventListener('focus', () => {
            this.showHistoryDropdown();
        });

        // 输入框失去焦点时隐藏下拉框（延迟执行以允许点击选项）
        directoryInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideHistoryDropdown();
            }, 200);
        });

        // 输入框内容变化时过滤历史记录
        directoryInput.addEventListener('input', (e) => {
            this.filterHistoryDropdown(e.target.value);
        });

        // 清空历史记录
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearDirectoryHistory();
        });

        // 分类策略选择变化
        document.getElementById('classificationStrategy').addEventListener('change', (e) => {
            this.onStrategyChange(e.target.value);
        });
    }



    // 初始化主题监听器
    initThemeListener() {
        // 监听主题变化事件
        window.addEventListener('themeChanged', (event) => {
            this.onThemeChanged(event.detail.theme);
        });

        // 初始化时应用当前主题
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
        this.onThemeChanged(currentTheme);
    }

    // 主题变化处理
    onThemeChanged(theme) {
        console.log('文件夹管理 - 主题变化:', theme);

        // 更新历史下拉框的主题样式
        this.updateHistoryDropdownTheme(theme);

        // 更新进度条的主题样式
        this.updateProgressTheme(theme);

        // 如果下拉框正在显示，重新渲染以应用新主题
        const dropdown = document.getElementById('historyDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            const history = this.getDirectoryHistory();
            this.updateHistoryDropdown(history);
        }
    }

    // 更新历史下拉框主题样式
    updateHistoryDropdownTheme(theme) {
        const dropdown = document.getElementById('historyDropdown');
        if (!dropdown) return;

        // 移除旧的主题类
        dropdown.classList.remove('theme-light', 'theme-dark');

        // 添加新的主题类
        dropdown.classList.add(`theme-${theme}`);

        // 更新清空按钮的样式
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn) {
            clearBtn.classList.remove('theme-light', 'theme-dark');
            clearBtn.classList.add(`theme-${theme}`);
        }
    }

    // 更新进度条主题样式
    updateProgressTheme(theme) {
        const progressContainer = document.getElementById('progressContainer');
        if (!progressContainer) return;

        // 获取进度条相关元素
        const progressBg = progressContainer.querySelector('.progress-container-bg');
        const progressTitle = progressContainer.querySelector('.progress-title');
        const progressMessage = progressContainer.querySelector('.progress-message');
        const progressBar = progressContainer.querySelector('.progress');

        // 移除旧的主题类
        [progressBg, progressTitle, progressMessage, progressBar].forEach(element => {
            if (element) {
                element.classList.remove('theme-light', 'theme-dark');
                element.classList.add(`theme-${theme}`);
            }
        });

        console.log(`进度条主题已更新为: ${theme}`);
    }

    // 加载历史目录记录
    loadDirectoryHistory() {
        try {
            const history = this.getDirectoryHistory();

            // 如果没有历史记录，添加一些示例数据（仅用于演示）
            if (history.length === 0 && window.location.hostname === 'localhost') {
                this.addSampleHistoryData();
            }

            this.updateHistoryDropdown(history);
        } catch (error) {
            console.error('加载历史目录失败:', error);
        }
    }

    // 添加示例历史数据（仅用于演示）
    addSampleHistoryData() {
        const sampleData = [
            {
                path: '/Users/username/Documents',
                lastUsed: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
                displayName: 'Documents'
            },
            {
                path: '/Users/username/Downloads',
                lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
                displayName: 'Downloads'
            },
            {
                path: '/Users/username/Desktop',
                lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
                displayName: 'Desktop'
            }
        ];

        try {
            localStorage.setItem(this.historyStorageKey, JSON.stringify(sampleData));
            console.log('已添加示例历史数据');
        } catch (error) {
            console.error('添加示例数据失败:', error);
        }
    }

    // 获取历史目录记录
    getDirectoryHistory() {
        try {
            const historyStr = localStorage.getItem(this.historyStorageKey);
            return historyStr ? JSON.parse(historyStr) : [];
        } catch (error) {
            console.error('解析历史目录数据失败:', error);
            return [];
        }
    }

    // 保存目录到历史记录
    saveDirectoryToHistory(directory) {
        if (!directory || typeof directory !== 'string') {
            return;
        }

        try {
            let history = this.getDirectoryHistory();

            // 移除重复项（如果存在）
            history = history.filter(item => item.path !== directory);

            // 添加到开头
            history.unshift({
                path: directory,
                lastUsed: new Date().toISOString(),
                displayName: this.getDirectoryDisplayName(directory)
            });

            // 限制历史记录数量
            if (history.length > this.maxHistoryItems) {
                history = history.slice(0, this.maxHistoryItems);
            }

            // 保存到本地存储
            localStorage.setItem(this.historyStorageKey, JSON.stringify(history));

            // 更新下拉框
            this.updateHistoryDropdown(history);

            console.log('目录已保存到历史记录:', directory);
        } catch (error) {
            console.error('保存历史目录失败:', error);
        }
    }

    // 获取目录显示名称
    getDirectoryDisplayName(directory) {
        const parts = directory.split(/[/\\]/);
        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];

        if (lastPart) {
            return secondLastPart ? `${secondLastPart}/${lastPart}` : lastPart;
        } else if (secondLastPart) {
            return secondLastPart;
        }

        return directory.length > 50 ? '...' + directory.slice(-47) : directory;
    }

    // 显示历史目录下拉框
    showHistoryDropdown() {
        const dropdown = document.getElementById('historyDropdown');
        const history = this.getDirectoryHistory();

        if (!dropdown) return;

        // 更新下拉框内容
        this.updateHistoryDropdown(history);

        // 显示下拉框
        if (history.length > 0) {
            dropdown.classList.add('show');
        }

        // 显示清空按钮
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn) {
            clearBtn.style.display = history.length > 0 ? 'inline-block' : 'none';
        }
    }

    // 隐藏历史目录下拉框
    hideHistoryDropdown() {
        const dropdown = document.getElementById('historyDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    // 更新历史目录下拉框
    updateHistoryDropdown(history, filterText = '') {
        const dropdown = document.getElementById('historyDropdown');
        if (!dropdown) return;

        // 清空现有内容
        dropdown.innerHTML = '';

        // 过滤历史记录
        const filteredHistory = history.filter(item =>
            !filterText || item.path.toLowerCase().includes(filterText.toLowerCase()) ||
            item.displayName.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filteredHistory.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item-text text-muted">暂无历史记录</div>';
            return;
        }

        // 添加历史记录选项
        filteredHistory.forEach((item, index) => {
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';
            dropdownItem.style.cursor = 'pointer';

            // 获取当前主题
            const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
            const iconColor = currentTheme === 'dark' ? '#6c757d' : '#495057';
            const timeColor = currentTheme === 'dark' ? '#a6a6a6' : '#6c757d';

            dropdownItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1 d-flex align-items-center">
                        <i class="bi bi-folder-fill me-2" style="color: ${iconColor}; font-size: 0.9rem;"></i>
                        <div>
                            <div class="fw-medium" style="font-size: 0.95rem;">${this.escapeHtml(item.displayName)}</div>
                            <div class="small text-muted" style="font-size: 0.8rem; opacity: 0.8;">${this.escapeHtml(this.truncatePath(item.path, 60))}</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="badge bg-secondary me-2" style="font-size: 0.7rem;">${this.formatDate(item.lastUsed)}</span>
                        <i class="bi bi-arrow-right" style="color: ${timeColor}; font-size: 0.8rem; opacity: 0.6;"></i>
                    </div>
                </div>
            `;
            dropdownItem.title = `点击选择: ${item.path}`;

            // 添加悬停效果
            dropdownItem.addEventListener('mouseenter', () => {
                dropdownItem.style.backgroundColor = currentTheme === 'dark' ? '#404040' : '#f8f9fa';
            });

            dropdownItem.addEventListener('mouseleave', () => {
                dropdownItem.style.backgroundColor = '';
            });

            // 点击选择历史目录
            dropdownItem.addEventListener('click', () => {
                this.selectHistoryDirectory(item.path);
            });

            dropdown.appendChild(dropdownItem);
        });
    }

    // 过滤历史目录下拉框
    filterHistoryDropdown(filterText) {
        const history = this.getDirectoryHistory();
        this.updateHistoryDropdown(history, filterText);

        // 如果有过滤文本且有匹配结果，显示下拉框
        const dropdown = document.getElementById('historyDropdown');
        if (dropdown && filterText && dropdown.children.length > 0) {
            dropdown.classList.add('show');
        }
    }

    // 选择历史目录
    selectHistoryDirectory(directory) {
        if (directory) {
            document.getElementById('directoryPath').value = directory;
            this.hideHistoryDropdown();
        }
    }

    // 清空历史记录
    clearDirectoryHistory() {
        if (confirm('确定要清空所有历史目录记录吗？')) {
            try {
                localStorage.removeItem(this.historyStorageKey);
                this.updateHistoryDropdown([]);
                this.showToast('历史记录已清空', 'success');
            } catch (error) {
                console.error('清空历史记录失败:', error);
                this.showToast('清空历史记录失败', 'error');
            }
        }
    }

    // 加载分类策略
    async loadClassificationStrategies() {
        try {
            const response = await fetch('/folder/classification/strategies');
            const result = await response.json();

            if (result.success) {
                this.classificationStrategies = result.data;
                this.updateStrategySelect();
                // 初始化默认策略选项
                this.onStrategyChange('extension');
                console.log('分类策略加载成功:', this.classificationStrategies.length, '个策略');
            } else {
                console.error('加载分类策略失败:', result.message);
                // 使用默认策略
                this.classificationStrategies = [
                    { id: 'extension', name: '按文件类型分类', description: '根据文件扩展名分类', options: [] }
                ];
                this.updateStrategySelect();
            }
        } catch (error) {
            console.error('加载分类策略错误:', error);
            // 使用默认策略
            this.classificationStrategies = [
                { id: 'extension', name: '按文件类型分类', description: '根据文件扩展名分类', options: [] }
            ];
            this.updateStrategySelect();
        }
    }

    // 更新策略选择器
    updateStrategySelect() {
        const select = document.getElementById('classificationStrategy');
        if (!select || !this.classificationStrategies) return;

        // 清空现有选项
        select.innerHTML = '';

        // 添加策略选项
        this.classificationStrategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.id;
            option.textContent = strategy.name;
            option.title = strategy.description;
            select.appendChild(option);
        });
    }

    // 处理策略变化
    onStrategyChange(strategyId) {
        const strategy = this.classificationStrategies?.find(s => s.id === strategyId);
        if (!strategy) return;

        this.updateStrategyOptions(strategy);
    }

    // 更新策略选项界面
    updateStrategyOptions(strategy) {
        const container = document.getElementById('strategyOptionsContainer');
        if (!container) return;

        // 清空现有选项
        container.innerHTML = '';

        if (!strategy.options || strategy.options.length === 0) {
            return;
        }

        // 创建选项界面
        strategy.options.forEach(option => {
            const optionElement = this.createOptionElement(option);
            if (optionElement) {
                container.appendChild(optionElement);
            }
        });
    }

    // 创建选项元素
    createOptionElement(option) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-2';

        switch (option.type) {
            case 'select':
                wrapper.innerHTML = `
                    <label for="${option.id}" class="form-label small">${option.name}</label>
                    <select class="form-select form-select-sm" id="${option.id}" data-option="${option.id}">
                        ${option.options.map(opt =>
                            `<option value="${opt.value}" ${opt.value === option.default ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                    ${option.description ? `<div class="form-text small">${option.description}</div>` : ''}
                `;
                break;

            case 'boolean':
                wrapper.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="${option.id}" data-option="${option.id}" ${option.default ? 'checked' : ''}>
                        <label class="form-check-label small" for="${option.id}">
                            ${option.name}
                        </label>
                        ${option.description ? `<div class="form-text small">${option.description}</div>` : ''}
                    </div>
                `;
                break;

            case 'number':
                wrapper.innerHTML = `
                    <label for="${option.id}" class="form-label small">${option.name}</label>
                    <input type="number" class="form-control form-control-sm" id="${option.id}" data-option="${option.id}"
                           value="${option.default || 0}" min="${option.min || 0}" max="${option.max || 9999}">
                    ${option.description ? `<div class="form-text small">${option.description}</div>` : ''}
                `;
                break;

            case 'custom':
                // 对于自定义类型，显示简化的界面
                wrapper.innerHTML = `
                    <label class="form-label small">${option.name}</label>
                    <div class="small text-muted">${option.description}</div>
                `;
                break;

            default:
                return null;
        }

        return wrapper;
    }

    // 获取当前策略选项
    getCurrentStrategyOptions() {
        const container = document.getElementById('strategyOptionsContainer');
        if (!container) return {};

        const options = {};
        const inputs = container.querySelectorAll('[data-option]');

        inputs.forEach(input => {
            const optionId = input.getAttribute('data-option');
            if (input.type === 'checkbox') {
                options[optionId] = input.checked;
            } else if (input.type === 'number') {
                // 对于数字输入，转换为数字类型
                const value = parseFloat(input.value);
                options[optionId] = isNaN(value) ? 0 : value;
                // 如果是大小阈值，转换为字节
                if (optionId === 'sizeThreshold') {
                    options[optionId] = options[optionId] * 1024 * 1024; // MB to bytes
                }
            } else {
                options[optionId] = input.value;
            }
        });

        return options;
    }

    // 格式化日期显示
    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffMinutes < 5) {
                return '刚刚';
            } else if (diffMinutes < 60) {
                return `${diffMinutes}分钟前`;
            } else if (diffHours < 24) {
                return `${diffHours}小时前`;
            } else if (diffDays === 1) {
                return '昨天';
            } else if (diffDays < 7) {
                return `${diffDays}天前`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks}周前`;
            } else {
                return date.toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            return '未知';
        }
    }

    // HTML转义函数
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 截断路径显示
    truncatePath(path, maxLength) {
        if (path.length <= maxLength) {
            return path;
        }

        const parts = path.split(/[/\\]/);
        if (parts.length <= 2) {
            return '...' + path.slice(-(maxLength - 3));
        }

        const fileName = parts[parts.length - 1];
        const parentDir = parts[parts.length - 2];
        const truncated = `.../${parentDir}/${fileName}`;

        if (truncated.length <= maxLength) {
            return truncated;
        }

        return '...' + path.slice(-(maxLength - 3));
    }

    // 获取父目录路径
    getParentPath(filePath) {
        const parts = filePath.split(/[/\\]/);
        return parts.slice(0, -1).join('/') || '/';
    }

    // 显示选中分类的文件列表
    async showCategoryFiles(category) {
        if (!this.currentStats || !this.currentStats.filesByCategory[category]) {
            console.warn(`分类 ${category} 不存在于当前统计数据中`);
            return;
        }

        const container = document.getElementById('categoryFilesContainer');
        if (!container) return;

        // 显示加载状态
        container.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>正在加载 ${category} 文件列表...</span>
            </div>
        `;

        try {
            // 首先检查是否有缓存的文件列表
            if (this.currentStats.categoryFilesCache && this.currentStats.categoryFilesCache[category]) {
                console.log(`使用缓存的 ${category} 文件列表`);
                this.displayCategoryFiles(category, this.currentStats.categoryFilesCache[category]);
                return;
            }

            // 获取当前扫描的目录路径
            const directoryPath = document.getElementById('directoryPath').value;
            if (!directoryPath) {
                container.innerHTML = `
                    <div class="alert alert-warning py-2">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        无法获取目录路径
                    </div>
                `;
                return;
            }

            console.log(`正在获取 ${category} 分类的文件列表...`);

            // 调用后端API获取指定分类的文件列表
            const response = await fetch('/folder/category-files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directoryPath: directoryPath,
                    category: category,
                    includeSubfolders: document.getElementById('includeSubfoldersCheck').checked
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                // 缓存结果
                if (!this.currentStats.categoryFilesCache) {
                    this.currentStats.categoryFilesCache = {};
                }
                this.currentStats.categoryFilesCache[category] = result.data;

                console.log(`成功获取 ${category} 分类的 ${result.data.length} 个文件`);
                this.displayCategoryFiles(category, result.data);
            } else {
                console.error(`获取 ${category} 文件列表失败:`, result.message);
                container.innerHTML = `
                    <div class="alert alert-danger py-2">
                        <i class="bi bi-exclamation-circle me-2"></i>
                        获取文件列表失败: ${result.message || '未知错误'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('获取分类文件列表错误:', error);
            container.innerHTML = `
                <div class="alert alert-danger py-2">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    获取文件列表失败: ${error.message}
                </div>
            `;
        }
    }

    // 显示分类文件列表
    displayCategoryFiles(category, files) {
        const container = document.getElementById('categoryFilesContainer');
        if (!container) return;

        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-file-earmark me-2"></i>
                    <span>${category} 分类下暂无文件</span>
                </div>
            `;
            return;
        }

        const filesHtml = files.map(file => `
            <div class="list-group-item d-flex justify-content-between align-items-center py-2">
                <div class="d-flex align-items-center flex-grow-1 me-2 min-width-0">
                    <i class="bi bi-file-earmark me-2 flex-shrink-0"></i>
                    <div class="flex-grow-1 min-width-0">
                        <div class="fw-medium text-truncate small">${this.escapeHtml(file.name)}</div>
                        <div class="text-muted small file-path-text text-truncate">${this.escapeHtml(this.getParentPath(file.path))}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center flex-shrink-0">
                    <span class="badge bg-secondary me-2 small">${this.formatFileSize(file.size)}</span>
                    <button class="btn btn-sm btn-outline-secondary category-file-locate-btn"
                            data-file-path="${this.escapeHtml(file.path)}"
                            title="定位文件">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">
                    <i class="bi bi-files me-2"></i>
                    ${category} (${files.length.toLocaleString()} 个文件)
                </h6>
                <small class="text-muted">
                    总大小: ${this.formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
                </small>
            </div>
            <div class="list-group category-files-list" style="max-height: 250px; overflow-y: auto;">
                ${filesHtml}
            </div>
        `;

        // 添加文件定位按钮的点击事件
        container.querySelectorAll('.category-file-locate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const filePath = btn.getAttribute('data-file-path');
                if (filePath) {
                    await this.openFileLocation(filePath);
                }
            });
        });

        // 添加文件项悬停效果
        container.querySelectorAll('.category-file-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--bg-secondary)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
        });
    }

    // 添加文件和文件夹点击事件监听器
    addFileAndFolderClickListeners() {
        // 文件定位按钮点击事件
        document.querySelectorAll('.file-locate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // 防止事件冒泡
                const filePath = btn.getAttribute('data-file-path');
                if (filePath) {
                    await this.openFileLocation(filePath);
                }
            });
        });

        // 文件夹定位按钮点击事件
        document.querySelectorAll('.folder-locate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // 防止事件冒泡
                const folderPath = btn.getAttribute('data-folder-path');
                if (folderPath) {
                    await this.openFolder(folderPath);
                }
            });
        });

        // 文件项悬停效果
        document.querySelectorAll('.file-item-compact').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--bg-secondary)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
        });

        // 文件夹项悬停效果
        document.querySelectorAll('.folder-item-compact').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--bg-secondary)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
        });

        // 分类项点击事件
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.getAttribute('data-category');
                this.showCategoryFiles(category);

                // 更新选中状态
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    // 打开文件所在位置
    async openFileLocation(filePath) {
        if (this.isElectronApp && window.electronAPI) {
            try {
                const result = await window.electronAPI.showItemInFolder(filePath);
                if (result.success) {
                    this.showToast('已打开文件所在文件夹', 'success');
                } else {
                    this.showToast('打开文件夹失败: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('打开文件位置失败:', error);
                this.showToast('打开文件夹失败', 'error');
            }
        } else {
            // 浏览器环境，显示路径信息
            const parentPath = this.getParentPath(filePath);
            this.showToast(`文件位置: ${parentPath}`, 'info');
        }
    }

    // 打开文件夹
    async openFolder(folderPath) {
        if (this.isElectronApp && window.electronAPI) {
            try {
                const result = await window.electronAPI.openFolder(folderPath);
                if (result.success) {
                    this.showToast('已打开文件夹', 'success');
                } else {
                    this.showToast('打开文件夹失败: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('打开文件夹失败:', error);
                this.showToast('打开文件夹失败', 'error');
            }
        } else {
            // 浏览器环境，显示路径信息
            this.showToast(`文件夹路径: ${folderPath}`, 'info');
        }
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
                // 扫描成功，保存目录到历史记录
                this.saveDirectoryToHistory(directory);

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
        document.getElementById('operationsArea').style.display = 'flex';
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

        const strategy = document.getElementById('classificationStrategy').value;
        const strategyInfo = this.classificationStrategies?.find(s => s.id === strategy);
        const strategyName = strategyInfo ? strategyInfo.name : '文件分类';

        this.showLoading(true);
        this.showToast(`正在使用 ${strategyName} 预览分类...`, 'info');

        try {
            const strategyOptions = this.getCurrentStrategyOptions();
            console.log('预览分类参数:', { strategy, strategyOptions, directory: this.currentDirectory });

            const response = await fetch('/folder/classify/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    strategy,
                    includeSubfolders: this.includeSubfolders,
                    strategyOptions
                })
            });

            const result = await response.json();
            console.log('预览分类结果:', result);

            if (result.success) {
                this.displayClassificationPreview(result.data, strategy);
                this.showToast('分类预览完成', 'success');
            } else {
                this.showToast(result.message || '预览失败', 'error');
            }
        } catch (error) {
            console.error('预览分类错误:', error);
            this.showToast('预览时发生错误: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayClassificationPreview(data, strategy = 'extension') {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        // 获取策略显示名称
        const strategyInfo = this.classificationStrategies?.find(s => s.id === strategy);
        const strategyName = strategyInfo ? strategyInfo.name : '文件分类';

        const categoriesList = Object.entries(data.classification)
            .map(([category, files]) => `
                <div class="mb-3 border rounded p-3">
                    <h6 class="text-primary mb-2">
                        <i class="bi bi-folder me-1"></i>
                        ${this.escapeHtml(category)}
                        <span class="badge bg-primary ms-2">${files.length} 个文件</span>
                    </h6>
                    <div class="ms-3">
                        ${files.slice(0, 5).map(file => {
                            const fileName = file.split(/[/\\]/).pop();
                            return `<div class="small text-muted d-flex align-items-center">
                                <i class="bi bi-file-earmark me-1"></i>
                                ${this.escapeHtml(fileName)}
                            </div>`;
                        }).join('')}
                        ${files.length > 5 ? `
                            <div class="small text-muted mt-1">
                                <i class="bi bi-three-dots me-1"></i>
                                还有 ${files.length - 5} 个文件
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');

        // 构建统计信息
        let statsInfo = '';
        if (data.totalFiles !== undefined) {
            statsInfo += `${data.totalFiles} 个文件`;
        }
        if (data.totalFolders !== undefined && data.totalFolders > 0) {
            if (statsInfo) statsInfo += '、';
            statsInfo += `${data.totalFolders} 个文件夹`;
        }
        if (data.totalItems !== undefined) {
            statsInfo = `${data.totalItems} 个项目`;
        }
        if (!statsInfo) {
            statsInfo = '0 个项目';
        }

        resultContent.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                <strong>${strategyName}</strong> - 将对 ${statsInfo} 进行分类
            </div>
            <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">
                        <i class="bi bi-eye me-1"></i>分类预览
                    </h6>
                    <small class="text-muted">
                        共 ${Object.keys(data.classification).length} 个分类
                    </small>
                </div>
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
            const strategy = document.getElementById('classificationStrategy').value;
            const createSubfolders = document.getElementById('createSubfoldersCheck').checked;
            const strategyOptions = this.getCurrentStrategyOptions();

            const response = await fetch('/folder/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    strategy,
                    preview: false,
                    createSubfolders,
                    includeSubfolders: this.includeSubfolders,
                    strategyOptions
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayClassificationResult(result.data, strategy);
                const movedCount = result.data.results?.moved?.length || 0;
                const movedFiles = result.data.results?.moved?.filter(item => item.type === 'file').length || 0;
                const movedFolders = result.data.results?.moved?.filter(item => item.type === 'folder').length || 0;

                let successMessage = '';
                if (movedFiles > 0 && movedFolders > 0) {
                    successMessage = `成功分类 ${movedFiles} 个文件和 ${movedFolders} 个文件夹`;
                } else if (movedFiles > 0) {
                    successMessage = `成功分类 ${movedFiles} 个文件`;
                } else if (movedFolders > 0) {
                    successMessage = `成功分类 ${movedFolders} 个文件夹`;
                } else {
                    successMessage = `分类完成，移动了 ${movedCount} 个项目`;
                }

                this.showToast(successMessage, 'success');
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

    displayClassificationResult(data, strategy = 'extension') {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        // 获取策略显示名称
        const strategyInfo = this.classificationStrategies?.find(s => s.id === strategy);
        const strategyName = strategyInfo ? strategyInfo.name : '文件分类';

        const { results } = data;
        const createdCount = results?.created?.length || 0;
        const movedCount = results?.moved?.length || 0;
        const errorCount = results?.errors?.length || 0;

        resultContent.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                <strong>${strategyName}</strong> 完成！
            </div>
            <div class="row text-center mb-4">
                <div class="col-md-4">
                    <div class="card border-success">
                        <div class="card-body">
                            <div class="h4 text-success">
                                <i class="bi bi-folder-plus me-1"></i>
                                ${createdCount}
                            </div>
                            <div class="text-muted">创建文件夹</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-primary">
                        <div class="card-body">
                            <div class="h4 text-primary">
                                <i class="bi bi-arrow-right-circle me-1"></i>
                                ${movedCount}
                            </div>
                            <div class="text-muted">移动文件</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card ${errorCount > 0 ? 'border-danger' : 'border-secondary'}">
                        <div class="card-body">
                            <div class="h4 ${errorCount > 0 ? 'text-danger' : 'text-secondary'}">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                ${errorCount}
                            </div>
                            <div class="text-muted">错误</div>
                        </div>
                    </div>
                </div>
            </div>
            ${errorCount > 0 ? `
                <div class="mt-3">
                    <div class="card border-danger">
                        <div class="card-header bg-danger text-white">
                            <h6 class="mb-0">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                错误详情
                            </h6>
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled mb-0">
                                ${results.errors.map(error => `
                                    <li class="text-danger mb-1">
                                        <i class="bi bi-x-circle me-1"></i>
                                        ${this.escapeHtml(error)}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
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

        // 生成文件分类列表（左侧）
        const categoriesListHtml = Object.entries(stats.filesByCategory)
            .map(([category, data]) => `
                <div class="list-group-item list-group-item-action category-item py-2"
                     data-category="${this.escapeHtml(category)}"
                     style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1 small fw-medium">${this.escapeHtml(category)}</h6>
                            <small class="text-muted">${data.count.toLocaleString()} 个文件</small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-secondary small">${this.formatFileSize(data.size)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        // 最大文件列表（支持点击打开文件夹）
        const largestFilesHtml = stats.largestFiles
            .map((file) => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                    <div class="d-flex align-items-center flex-grow-1 me-2 min-width-0">
                        <i class="bi bi-file-earmark me-2 flex-shrink-0"></i>
                        <div class="flex-grow-1 min-width-0">
                            <div class="fw-medium text-truncate small">${this.escapeHtml(file.name)}</div>
                            <div class="text-muted small file-path-text text-truncate">${this.escapeHtml(this.getParentPath(file.path))}</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center flex-shrink-0">
                        <span class="badge bg-secondary me-2 small">${this.formatFileSize(file.size)}</span>
                        <button class="btn btn-sm btn-outline-secondary file-locate-btn"
                                data-file-path="${this.escapeHtml(file.path)}"
                                title="定位文件">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </li>
            `).join('');

        // 最大文件夹列表（支持点击打开文件夹）
        const largestFoldersHtml = stats.largestFolders && stats.largestFolders.length > 0
            ? stats.largestFolders.map((folder) => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                    <div class="d-flex align-items-center flex-grow-1 me-2 min-width-0">
                        <i class="bi bi-folder me-2 flex-shrink-0"></i>
                        <div class="flex-grow-1 min-width-0">
                            <div class="fw-medium text-truncate small">${this.escapeHtml(folder.name)}</div>
                            <div class="text-muted small file-path-text text-truncate">${this.escapeHtml(folder.parentPath)}</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center flex-shrink-0">
                        <span class="badge bg-secondary me-2 small">${this.formatFileSize(folder.size)}</span>
                        <button class="btn btn-sm btn-outline-secondary folder-locate-btn"
                                data-folder-path="${this.escapeHtml(folder.path)}"
                                title="打开文件夹">
                            <i class="bi bi-folder-open"></i>
                        </button>
                    </div>
                </li>
            `).join('')
            : '<li class="list-group-item text-muted text-center py-2 small">暂无数据</li>';

        resultContent.innerHTML = `
            <div class="alert alert-info py-2 mb-3">
                <i class="bi bi-info-circle me-2"></i>
                <strong>详细统计信息</strong>
            </div>

            <!-- 基础统计 - 紧凑布局 -->
            <div class="row mb-3 compact-stats">
                <div class="col-3">
                    <div class="text-center">
                        <div class="h5 text-primary mb-1">${stats.totalFiles.toLocaleString()}</div>
                        <div class="text-muted small">总文件数</div>
                    </div>
                </div>
                <div class="col-3">
                    <div class="text-center">
                        <div class="h5 text-info mb-1">${stats.totalFolders.toLocaleString()}</div>
                        <div class="text-muted small">总文件夹数</div>
                    </div>
                </div>
                <div class="col-3">
                    <div class="text-center">
                        <div class="h5 text-success mb-1">${this.formatFileSize(stats.totalSize)}</div>
                        <div class="text-muted small">总大小</div>
                    </div>
                </div>
                <div class="col-3">
                    <div class="text-center">
                        <div class="h5 text-warning mb-1">${stats.emptyFolders.toLocaleString()}</div>
                        <div class="text-muted small">空文件夹</div>
                    </div>
                </div>
            </div>

            <!-- 文件分类统计 - 左右布局 -->
            <div class="mb-3">
                <h6 class="mb-2"><i class="bi bi-pie-chart me-2"></i>文件分类统计：</h6>
                <div class="row">
                    <!-- 左侧：分类列表 -->
                    <div class="col-md-4">
                        <div class="list-group category-list" style="max-height: 300px; overflow-y: auto;">
                            ${categoriesListHtml}
                        </div>
                    </div>
                    <!-- 右侧：文件列表 -->
                    <div class="col-md-8">
                        <div id="categoryFilesContainer" class="file-list-container">
                            <div class="text-center text-muted py-4">
                                <i class="bi bi-arrow-left me-2"></i>
                                <span>请选择左侧的文件分类查看详细列表</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 最大文件和文件夹 -->
            <div class="row">
                <div class="col-md-6">
                    <h6 class="mb-2"><i class="bi bi-file-earmark-text me-2"></i>最大文件 (前10)：</h6>
                    <ul class="list-group list-group-flush compact-list" style="max-height: 350px; overflow-y: auto;">
                        ${largestFilesHtml}
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6 class="mb-2"><i class="bi bi-folder-fill me-2"></i>最大文件夹 (前10)：</h6>
                    <ul class="list-group list-group-flush compact-list" style="max-height: 350px; overflow-y: auto;">
                        ${largestFoldersHtml}
                    </ul>
                </div>
            </div>
        `;

        // 添加点击事件监听器
        this.addFileAndFolderClickListeners();

        // 保存统计数据供分类点击使用
        this.currentStats = stats;

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
