// public/js/aiorganizer.js - AI文件整理前端脚本

class AiorganizerManager {
    constructor() {
        this.isElectronApp = false;
        this.currentDirectory = '';
        this.scannedData = null;
        this.classificationResult = null;
        this.apiKey = '';
        this.selectedModel = 'BAAI/bge-m3';
        this.currentPromptTemplate = 'default';
        this.promptTemplates = this.initPromptTemplates();
        this.classificationHistory = [];
        this.currentRound = 1;
        this.init();
    }

    // 初始化提示词模板
    initPromptTemplates() {
        return {
            default: {
                name: '通用分类',
                description: '适用于各种类型文件的通用分类',
                prompt: `请对以下文件和文件夹进行智能分类整理。请根据文件名、扩展名、路径特征等信息，将它们分类到合适的类别中。

请按照以下JSON格式返回分类结果：
{
  "categories": {
    "文档资料": {
      "description": "办公文档、PDF、文本文件等",
      "items": ["相对路径1", "相对路径2"]
    },
    "图片媒体": {
      "description": "图片、视频、音频文件",
      "items": ["相对路径3"]
    },
    "开发代码": {
      "description": "代码文件、项目文件夹",
      "items": ["相对路径4"]
    }
  },
  "suggestions": [
    "建议1：可以将所有PDF文件移动到文档资料文件夹",
    "建议2：图片文件可以按日期进一步分类"
  ]
}

注意：
1. 类别名称要简洁明了，适合作为文件夹名称
2. 每个类别要有简短的描述说明
3. items数组中使用相对路径
4. 提供1-3条整理建议
5. 确保返回有效的JSON格式`
            },
            work: {
                name: '办公文档',
                description: '专门用于办公文档的详细分类',
                prompt: `请对以下文件和文件夹进行办公文档分类整理。重点关注文档类型、内容特征和用途。

请按照以下JSON格式返回分类结果：
{
  "categories": {
    "合同协议": {
      "description": "合同、协议、法律文件",
      "items": []
    },
    "财务报表": {
      "description": "财务数据、报表、发票",
      "items": []
    },
    "会议资料": {
      "description": "会议纪要、演示文稿、议程",
      "items": []
    },
    "项目文档": {
      "description": "项目计划、需求文档、设计方案",
      "items": []
    },
    "人事档案": {
      "description": "简历、人事文件、培训资料",
      "items": []
    },
    "其他文档": {
      "description": "其他类型的办公文档",
      "items": []
    }
  },
  "suggestions": [
    "建议按文档类型和重要程度进行分类",
    "重要合同文件建议单独存放",
    "定期清理临时文档和草稿"
  ]
}`
            },
            media: {
                name: '媒体文件',
                description: '专门用于图片、视频、音频文件的分类',
                prompt: `请对以下文件和文件夹进行媒体文件分类整理。重点关注文件格式、内容类型和用途。

请按照以下JSON格式返回分类结果：
{
  "categories": {
    "照片图片": {
      "description": "个人照片、截图、图片素材",
      "items": []
    },
    "设计素材": {
      "description": "设计文件、图标、矢量图",
      "items": []
    },
    "视频文件": {
      "description": "视频录像、电影、教程视频",
      "items": []
    },
    "音频文件": {
      "description": "音乐、录音、音效文件",
      "items": []
    },
    "文档图片": {
      "description": "扫描件、文档截图、证件照",
      "items": []
    }
  },
  "suggestions": [
    "建议按拍摄日期或事件对照片进行分类",
    "设计素材可以按项目或类型进一步分类",
    "大文件视频建议压缩或移至外部存储"
  ]
}`
            },
            dev: {
                name: '开发项目',
                description: '专门用于开发项目和代码文件的分类',
                prompt: `请对以下文件和文件夹进行开发项目分类整理。重点关注编程语言、项目类型和开发阶段。

请按照以下JSON格式返回分类结果：
{
  "categories": {
    "前端项目": {
      "description": "HTML、CSS、JavaScript、React、Vue等前端项目",
      "items": []
    },
    "后端项目": {
      "description": "Node.js、Python、Java、PHP等后端项目",
      "items": []
    },
    "移动开发": {
      "description": "iOS、Android、React Native、Flutter项目",
      "items": []
    },
    "数据库文件": {
      "description": "SQL文件、数据库备份、数据文件",
      "items": []
    },
    "配置文件": {
      "description": "配置文件、环境变量、部署脚本",
      "items": []
    },
    "文档代码": {
      "description": "API文档、技术文档、代码注释",
      "items": []
    },
    "测试文件": {
      "description": "单元测试、集成测试、测试数据",
      "items": []
    }
  },
  "suggestions": [
    "建议按编程语言或技术栈分类项目",
    "重要项目建议使用版本控制",
    "定期清理临时文件和构建产物"
  ]
}`
            },
            custom: {
                name: '自定义',
                description: '用户自定义的分类提示词',
                prompt: ''
            }
        };
    }

    async init() {
        console.log('AI文件整理管理器初始化...');

        // 检查Electron环境
        await this.checkElectronEnvironment();

        // 绑定事件
        this.bindEvents();

        // 加载保存的API密钥
        this.loadApiKey();

        // 初始化提示词
        this.initPromptUI();

        // 加载AI模型列表
        await this.loadAiModels();

        console.log('AI文件整理管理器初始化完成');
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('AI文件整理 - Electron环境检测:', this.isElectronApp);
            } catch (error) {
                console.log('Electron API不可用:', error);
                this.isElectronApp = false;
            }
        } else {
            this.isElectronApp = false;
        }
    }

    // 加载保存的API密钥
    loadApiKey() {
        try {
            const savedKey = localStorage.getItem('aiorganizer_api_key');
            if (savedKey) {
                this.apiKey = savedKey;
                const apiKeyInput = document.getElementById('apiKey');
                if (apiKeyInput) {
                    apiKeyInput.value = savedKey;
                }
            }
        } catch (error) {
            console.error('加载API密钥失败:', error);
        }
    }

    // 保存API密钥
    saveApiKey(apiKey) {
        try {
            localStorage.setItem('aiorganizer_api_key', apiKey);
            this.apiKey = apiKey;
        } catch (error) {
            console.error('保存API密钥失败:', error);
        }
    }

    // 加载AI模型列表
    async loadAiModels() {
        try {
            const response = await fetch('/aiorganizer/models');
            const result = await response.json();

            if (result.success) {
                this.updateModelSelect(result.data);
            }
        } catch (error) {
            console.error('加载AI模型列表失败:', error);
        }
    }

    // 更新模型选择器
    updateModelSelect(models) {
        const modelSelect = document.getElementById('aiModel');
        if (!modelSelect) return;

        modelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.category})`;
            option.title = model.description;
            modelSelect.appendChild(option);
        });
    }

    // 初始化提示词UI
    initPromptUI() {
        // 设置默认提示词
        this.updatePromptText();
    }

    // 更新提示词文本
    updatePromptText() {
        const promptText = document.getElementById('promptText');
        if (promptText && this.promptTemplates[this.currentPromptTemplate]) {
            promptText.value = this.promptTemplates[this.currentPromptTemplate].prompt;

            // 如果是自定义模板且内容为空，则提供默认提示
            if (this.currentPromptTemplate === 'custom' && !promptText.value.trim()) {
                promptText.value = '请在此输入您的自定义分类提示词...\n\n建议包含以下内容：\n1. 分类规则说明\n2. 期望的JSON格式\n3. 具体的分类类别\n4. 特殊处理要求';
            }
        }
    }

    // 重置提示词为模板默认值
    resetPromptToTemplate() {
        if (this.currentPromptTemplate !== 'custom') {
            this.updatePromptText();
            this.showToast('提示词已重置为模板默认值', 'success');
        } else {
            const promptText = document.getElementById('promptText');
            if (promptText) {
                promptText.value = '';
                this.showToast('自定义提示词已清空', 'info');
            }
        }
    }

    // 获取当前提示词内容
    getCurrentPrompt() {
        const promptText = document.getElementById('promptText');
        return promptText ? promptText.value.trim() : '';
    }

    bindEvents() {
        // 浏览文件夹按钮
        const browseBtn = document.getElementById('browseBtn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.browseFolder());
        }

        // 扫描按钮
        const scanBtn = document.getElementById('scanBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.scanDirectory());
        }

        // 移动记录按钮
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showMoveHistory());
        }

        // 关闭移动记录按钮
        const closeMoveHistory = document.getElementById('closeMoveHistory');
        if (closeMoveHistory) {
            closeMoveHistory.addEventListener('click', () => this.hideMoveHistory());
        }

        // 提示词历史按钮
        const promptHistoryBtn = document.getElementById('promptHistoryBtn');
        if (promptHistoryBtn) {
            promptHistoryBtn.addEventListener('click', () => this.showPromptHistory());
        }

        // 显示提示词历史按钮
        const showPromptHistoryBtn = document.getElementById('showPromptHistoryBtn');
        if (showPromptHistoryBtn) {
            showPromptHistoryBtn.addEventListener('click', () => this.loadPromptHistory());
        }

        // 显示对话历史按钮
        const showDialogueHistoryBtn = document.getElementById('showDialogueHistoryBtn');
        if (showDialogueHistoryBtn) {
            showDialogueHistoryBtn.addEventListener('click', () => this.loadDialogueHistory());
        }

        // 清空历史记录按钮
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        // 关闭提示词历史按钮
        const closePromptHistory = document.getElementById('closePromptHistory');
        if (closePromptHistory) {
            closePromptHistory.addEventListener('click', () => this.hidePromptHistory());
        }

        // 目录路径输入框回车事件
        const directoryPath = document.getElementById('directoryPath');
        if (directoryPath) {
            directoryPath.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.scanDirectory();
                }
            });
        }

        // API密钥输入事件
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.saveApiKey(e.target.value);
                this.updateClassifyButtonState();
            });
        }

        // 显示/隐藏API密钥
        const toggleApiKey = document.getElementById('toggleApiKey');
        if (toggleApiKey) {
            toggleApiKey.addEventListener('click', () => this.toggleApiKeyVisibility());
        }

        // AI模型选择
        const aiModel = document.getElementById('aiModel');
        if (aiModel) {
            aiModel.addEventListener('change', (e) => {
                this.selectedModel = e.target.value;
            });
        }

        // 提示词模板选择
        const templateRadios = document.querySelectorAll('input[name="promptTemplate"]');
        templateRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentPromptTemplate = e.target.value;
                this.updatePromptText();
            });
        });

        // 重置提示词按钮
        const resetPromptBtn = document.getElementById('resetPromptBtn');
        if (resetPromptBtn) {
            resetPromptBtn.addEventListener('click', () => {
                this.resetPromptToTemplate();
            });
        }

        // AI分类按钮
        const classifyBtn = document.getElementById('classifyBtn');
        if (classifyBtn) {
            classifyBtn.addEventListener('click', () => this.classifyWithAI());
        }

        // 预览按钮
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewMove());
        }

        // 执行按钮
        const executeBtn = document.getElementById('executeBtn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeMove());
        }

        // 优化分类按钮
        const optimizeBtn = document.getElementById('optimizeBtn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.optimizeClassification());
        }

        // 重新分类按钮
        const resetClassificationBtn = document.getElementById('resetClassificationBtn');
        if (resetClassificationBtn) {
            resetClassificationBtn.addEventListener('click', () => this.resetClassification());
        }

        // 发送反馈按钮
        const sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
        if (sendFeedbackBtn) {
            sendFeedbackBtn.addEventListener('click', () => this.sendUserFeedback());
        }

        // 用户反馈输入框回车事件
        const userFeedback = document.getElementById('userFeedback');
        if (userFeedback) {
            userFeedback.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    this.sendUserFeedback();
                }
            });
        }

        // 快速建议按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-suggestion') || e.target.closest('.quick-suggestion')) {
                const btn = e.target.classList.contains('quick-suggestion') ? e.target : e.target.closest('.quick-suggestion');
                const suggestion = btn.getAttribute('data-suggestion');
                if (suggestion) {
                    document.getElementById('userFeedback').value = suggestion;
                }
            }
        });

        // 查看历史按钮
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        if (toggleHistoryBtn) {
            toggleHistoryBtn.addEventListener('click', () => this.toggleClassificationHistory());
        }
    }

    // 浏览文件夹
    async browseFolder() {
        if (this.isElectronApp && window.electronAPI) {
            try {
                const result = await window.electronAPI.selectFolder();
                if (result.success && result.folderPath) {
                    document.getElementById('directoryPath').value = result.folderPath;
                    this.showToast('文件夹选择成功', 'success');
                } else if (result.canceled) {
                    this.showToast('用户取消了文件夹选择', 'info');
                }
            } catch (error) {
                console.error('选择文件夹失败:', error);
                this.showToast('选择文件夹失败', 'error');
            }
        } else {
            this.showToast('浏览器环境不支持文件夹选择，请手动输入路径', 'warning');
        }
    }

    // 显示移动记录
    async showMoveHistory() {
        const directoryPath = document.getElementById('directoryPath').value.trim();
        if (!directoryPath) {
            this.showToast('请先输入文件夹路径', 'warning');
            return;
        }

        try {
            console.log('🔍 获取移动记录:', directoryPath);

            const response = await fetch('/aiorganizer/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    basePath: directoryPath
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayMoveHistory(result.data);
                this.showSection('moveHistorySection');
                console.log('✅ 移动记录获取成功');
            } else {
                throw new Error(result.message || '获取移动记录失败');
            }
        } catch (error) {
            console.error('❌ 获取移动记录错误:', error);
            this.showToast(`获取移动记录失败: ${error.message}`, 'error');
        }
    }

    // 隐藏移动记录
    hideMoveHistory() {
        this.hideSection('moveHistorySection');
    }

    // 显示移动记录内容
    displayMoveHistory(data) {
        const content = document.getElementById('moveHistoryContent');
        if (!content) return;

        const { existingFolders, movedFiles, remainingFiles, summary } = data;

        let html = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-primary">${summary.totalExistingFolders}</h5>
                            <p class="card-text">分类文件夹</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-success">${summary.totalMovedFiles}</h5>
                            <p class="card-text">已移动文件</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-warning">${summary.totalRemainingFiles}</h5>
                            <p class="card-text">未分类文件</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 显示现有分类文件夹
        if (existingFolders.length > 0) {
            html += `
                <h6><i class="bi bi-folder-fill text-primary me-2"></i>现有分类文件夹</h6>
                <div class="row mb-4">
            `;

            existingFolders.forEach(folder => {
                html += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">
                                    <i class="bi bi-folder me-1"></i>
                                    ${folder.name}
                                </h6>
                                <p class="card-text text-muted">
                                    ${folder.fileCount} 个文件
                                </p>
                                <div class="small text-muted" style="max-height: 100px; overflow-y: auto;">
                                    ${folder.files.slice(0, 5).map(file => `<div>• ${file}</div>`).join('')}
                                    ${folder.files.length > 5 ? `<div class="text-info">... 还有 ${folder.files.length - 5} 个文件</div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // 显示未分类文件
        if (remainingFiles.length > 0) {
            html += `
                <h6><i class="bi bi-file-earmark text-warning me-2"></i>未分类文件 (${remainingFiles.length}个)</h6>
                <div class="table-responsive mb-4" style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-sm table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>文件名</th>
                                <th>路径</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            remainingFiles.forEach(file => {
                html += `
                    <tr>
                        <td>${file.fileName}</td>
                        <td class="text-muted small">${file.path}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // 操作建议
        html += `
            <div class="alert alert-info">
                <h6><i class="bi bi-lightbulb me-2"></i>操作建议</h6>
                <ul class="mb-0">
                    ${summary.totalRemainingFiles > 0 ?
                        `<li>还有 ${summary.totalRemainingFiles} 个文件未分类，可以重新扫描并进行AI分类</li>` :
                        '<li>所有文件都已分类完成！</li>'
                    }
                    ${summary.totalExistingFolders > 0 ?
                        `<li>已有 ${summary.totalExistingFolders} 个分类文件夹，AI会识别并避免重复移动</li>` :
                        ''
                    }
                    <li>如需重新整理，可以将文件移回根目录后重新分类</li>
                </ul>
            </div>
        `;

        content.innerHTML = html;
    }

    // 显示提示词历史
    showPromptHistory() {
        this.showSection('promptHistorySection');
        this.loadPromptHistory();
    }

    // 隐藏提示词历史
    hidePromptHistory() {
        this.hideSection('promptHistorySection');
    }

    // 加载提示词历史
    async loadPromptHistory() {
        try {
            console.log('📝 获取提示词历史记录');

            const response = await fetch('/aiorganizer/prompt-history?limit=20');
            const result = await response.json();

            if (result.success) {
                this.displayPromptHistory(result.data.history);
                console.log('✅ 提示词历史记录获取成功:', result.data.total, '条');
            } else {
                throw new Error(result.message || '获取提示词历史记录失败');
            }
        } catch (error) {
            console.error('❌ 获取提示词历史记录错误:', error);
            this.showToast(`获取提示词历史记录失败: ${error.message}`, 'error');
        }
    }

    // 加载对话历史
    async loadDialogueHistory() {
        try {
            console.log('💬 获取对话历史记录');

            const response = await fetch('/aiorganizer/dialogue-history?limit=50');
            const result = await response.json();

            if (result.success) {
                this.displayDialogueHistory(result.data.history);
                console.log('✅ 对话历史记录获取成功:', result.data.total, '条');
            } else {
                throw new Error(result.message || '获取对话历史记录失败');
            }
        } catch (error) {
            console.error('❌ 获取对话历史记录错误:', error);
            this.showToast(`获取对话历史记录失败: ${error.message}`, 'error');
        }
    }

    // 显示提示词历史
    displayPromptHistory(history) {
        const content = document.getElementById('promptHistoryContent');
        if (!content) return;

        if (history.length === 0) {
            content.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-file-text fs-1"></i>
                    <p class="mt-2">暂无提示词历史记录</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">📝 提示词历史记录 (${history.length}条)</h6>
                <small class="text-muted">按时间倒序排列</small>
            </div>
        `;

        history.forEach((record, index) => {
            const date = new Date(record.timestamp);
            const timeStr = date.toLocaleString('zh-CN');

            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary me-2">第${record.round}轮</span>
                            <span class="badge ${record.isCustom ? 'bg-warning' : 'bg-secondary'} me-2">
                                ${record.isCustom ? '自定义' : record.template}
                            </span>
                            <small class="text-muted">${timeStr}</small>
                        </div>
                        <div>
                            <small class="text-muted">${record.contentLength} 字符</small>
                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body" style="display: none;">
                        <pre class="small text-muted" style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${record.content}</pre>
                    </div>
                </div>
            `;
        });

        content.innerHTML = html;
    }

    // 显示对话历史
    displayDialogueHistory(history) {
        const content = document.getElementById('promptHistoryContent');
        if (!content) return;

        if (history.length === 0) {
            content.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-chat-dots fs-1"></i>
                    <p class="mt-2">暂无对话历史记录</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">💬 对话历史记录 (${history.length}条)</h6>
                <small class="text-muted">按时间正序排列</small>
            </div>
        `;

        // 按轮次分组
        const groupedHistory = {};
        history.forEach(record => {
            if (!groupedHistory[record.round]) {
                groupedHistory[record.round] = [];
            }
            groupedHistory[record.round].push(record);
        });

        Object.keys(groupedHistory).sort((a, b) => parseInt(b) - parseInt(a)).forEach(round => {
            const roundHistory = groupedHistory[round];

            html += `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <span class="badge bg-primary me-2">第${round}轮对话</span>
                            <small class="text-muted">${roundHistory.length} 条消息</small>
                        </h6>
                    </div>
                    <div class="card-body">
            `;

            roundHistory.forEach(record => {
                const date = new Date(record.timestamp);
                const timeStr = date.toLocaleString('zh-CN');
                const typeIcon = record.type === 'user' ? 'person-fill' : 'robot';
                const typeColor = record.type === 'user' ? 'primary' : 'success';
                const typeName = record.type === 'user' ? '用户' : 'AI助手';

                html += `
                    <div class="d-flex mb-3">
                        <div class="flex-shrink-0 me-3">
                            <div class="rounded-circle bg-${typeColor} text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                <i class="bi bi-${typeIcon} small"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <strong class="text-${typeColor}">${typeName}</strong>
                                <small class="text-muted">${timeStr}</small>
                            </div>
                            <div class="bg-light p-2 rounded">
                                <div class="small" style="max-height: 200px; overflow-y: auto; white-space: pre-wrap;">${record.content}</div>
                                ${record.metadata && Object.keys(record.metadata).length > 0 ?
                                    `<div class="mt-2 small text-muted">
                                        ${Object.entries(record.metadata).map(([key, value]) => `${key}: ${value}`).join(' | ')}
                                    </div>` : ''
                                }
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        content.innerHTML = html;
    }

    // 清空历史记录
    async clearHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
            return;
        }

        try {
            console.log('🗑️ 清空历史记录');

            const response = await fetch('/aiorganizer/clear-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'all'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('历史记录已清空', 'success');
                // 重新加载当前显示的历史记录
                const content = document.getElementById('promptHistoryContent');
                if (content) {
                    content.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="bi bi-check-circle fs-1 text-success"></i>
                            <p class="mt-2">历史记录已清空</p>
                        </div>
                    `;
                }
                console.log('✅ 历史记录清空成功');
            } else {
                throw new Error(result.message || '清空历史记录失败');
            }
        } catch (error) {
            console.error('❌ 清空历史记录错误:', error);
            this.showToast(`清空历史记录失败: ${error.message}`, 'error');
        }
    }

    // 扫描目录
    async scanDirectory() {
        const directoryPath = document.getElementById('directoryPath').value.trim();
        if (!directoryPath) {
            this.showToast('请输入文件夹路径', 'warning');
            return;
        }

        this.currentDirectory = directoryPath;
        this.showLoading(true);

        try {
            const response = await fetch('/aiorganizer/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directoryPath: directoryPath,
                    maxDepth: 2
                })
            });

            const result = await response.json();

            if (result.success) {
                this.scannedData = result.data;
                this.displayScanResult(result.data);
                this.showSection('aiConfigSection');
                this.updateClassifyButtonState();
                this.showToast('目录扫描完成', 'success');
            } else {
                this.showToast(result.message || '扫描失败', 'error');
            }
        } catch (error) {
            console.error('扫描目录错误:', error);
            this.showToast('扫描目录时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示扫描结果
    displayScanResult(data) {
        // 显示统计信息
        const scanStats = document.getElementById('scanStats');
        if (scanStats) {
            scanStats.innerHTML = `
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-primary">${data.totalItems}</div>
                        <div class="text-muted">总项目</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-info">${data.files.length}</div>
                        <div class="text-muted">文件</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-success">${data.folders.length}</div>
                        <div class="text-muted">文件夹</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="h4 text-warning">${this.formatFileSize(data.files.reduce((sum, f) => sum + f.size, 0))}</div>
                        <div class="text-muted">总大小</div>
                    </div>
                </div>
            `;
        }

        // 显示文件列表
        const fileListBody = document.getElementById('fileListBody');
        if (fileListBody) {
            const allItems = [...data.files, ...data.folders].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

            fileListBody.innerHTML = allItems.map(item => `
                <tr>
                    <td>
                        <i class="bi ${item.type === 'file' ? 'bi-file-earmark' : 'bi-folder'} me-1"></i>
                        ${item.type === 'file' ? '文件' : '文件夹'}
                    </td>
                    <td>${this.escapeHtml(item.name)}</td>
                    <td class="text-muted small">${this.escapeHtml(item.relativePath)}</td>
                    <td>${item.type === 'file' ? this.formatFileSize(item.size) : '-'}</td>
                </tr>
            `).join('');
        }

        this.showSection('scanResultSection');
    }

    // 使用AI进行分类
    async classifyWithAI() {
        console.log('🚀 开始AI分类...');

        if (!this.scannedData) {
            console.error('❌ 未找到扫描数据');
            this.showToast('请先扫描文件夹', 'warning');
            return;
        }

        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            console.error('❌ API密钥为空');
            this.showToast('请输入API密钥', 'warning');
            return;
        }

        // 获取当前提示词
        const customPrompt = this.getCurrentPrompt();
        if (!customPrompt) {
            console.error('❌ 提示词为空');
            this.showToast('请输入分类提示词', 'warning');
            return;
        }

        console.log('📊 分类参数:', {
            filesCount: this.scannedData.files?.length || 0,
            foldersCount: this.scannedData.folders?.length || 0,
            selectedModel: this.selectedModel,
            promptTemplate: this.currentPromptTemplate,
            promptLength: customPrompt.length,
            apiKeyPrefix: apiKey.substring(0, 10) + '...'
        });

        this.showLoading(true);

        try {
            // 准备优化的路径列表 - 只传输必要的信息
            const pathList = [...this.scannedData.files, ...this.scannedData.folders].map(item => ({
                relativePath: item.relativePath,
                name: item.name,
                type: item.type
            }));

            console.log('📁 优化后路径列表:', {
                length: pathList.length,
                sample: pathList.slice(0, 3).map(item => `${item.type}:${item.relativePath}`)
            });

            const requestData = {
                pathList: pathList,
                apiKey: apiKey,
                model: this.selectedModel,
                customPrompt: customPrompt,
                promptTemplate: this.currentPromptTemplate
            };

            console.log('🔗 发送分类请求...');
            const response = await fetch('/aiorganizer/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('📡 响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP错误:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }

            const result = await response.json();
            console.log('📄 分类结果:', {
                success: result.success,
                hasData: !!result.data,
                categoriesCount: Object.keys(result.data?.categories || {}).length,
                suggestionsCount: result.data?.suggestions?.length || 0,
                batchInfo: result.batchInfo,
                debug: result.debug
            });

            if (result.success) {
                this.classificationResult = result.data;
                this.displayClassificationResult(result.data, result.batchInfo);
                this.showSection('classificationSection');
                this.showSection('executeSection');

                // 显示成功消息，包含批次信息
                let successMessage = 'AI分类完成';
                if (result.batchInfo) {
                    successMessage += ` (分${result.batchInfo.batchCount}批处理${result.batchInfo.totalFiles}个文件)`;
                }
                this.showToast(successMessage, 'success');
                console.log('✅ AI分类成功完成');
            } else {
                console.error('❌ 分类失败:', result.message, result.debug);
                this.showToast(result.message || 'AI分类失败', 'error');
            }
        } catch (error) {
            console.error('❌ AI分类错误:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            this.showToast(`AI分类时发生错误: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示分类结果
    displayClassificationResult(data, batchInfo = null) {
        const classificationResult = document.getElementById('classificationResult');
        if (classificationResult && data.categories) {
            const categoriesHtml = Object.entries(data.categories).map(([categoryName, categoryData]) => `
                <div class="mb-3 border rounded p-3">
                    <h6 class="text-primary mb-2">
                        <i class="bi bi-folder me-1"></i>
                        ${this.escapeHtml(categoryName)}
                        <span class="badge bg-primary ms-2">${categoryData.items.length} 项</span>
                    </h6>
                    <p class="text-muted small mb-2">${this.escapeHtml(categoryData.description)}</p>
                    <div class="ms-3">
                        ${categoryData.items.slice(0, 5).map(item => `
                            <div class="small text-muted d-flex align-items-center mb-1">
                                <i class="bi bi-arrow-right me-1"></i>
                                ${this.escapeHtml(item)}
                            </div>
                        `).join('')}
                        ${categoryData.items.length > 5 ? `
                            <div class="small text-muted">
                                <i class="bi bi-three-dots me-1"></i>
                                还有 ${categoryData.items.length - 5} 项
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            classificationResult.innerHTML = categoriesHtml;
        }

        // 显示AI建议
        const aiSuggestions = document.getElementById('aiSuggestions');
        if (aiSuggestions && data.suggestions) {
            aiSuggestions.innerHTML = `
                <ul class="mb-0">
                    ${data.suggestions.map(suggestion => `
                        <li>${this.escapeHtml(suggestion)}</li>
                    `).join('')}
                </ul>
            `;
        }

        // 更新轮次计数器
        this.updateRoundCounter();

        // 保存到历史记录
        this.saveToHistory(data);
    }

    // 更新轮次计数器
    updateRoundCounter() {
        const roundCounter = document.getElementById('roundCounter');
        if (roundCounter) {
            roundCounter.textContent = `第${this.currentRound}轮`;
        }
    }

    // 保存分类结果到历史记录
    saveToHistory(data) {
        const historyItem = {
            round: this.currentRound,
            timestamp: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(data)),
            userFeedback: this.currentRound > 1 ? this.lastUserFeedback : null
        };

        this.classificationHistory.push(historyItem);
        this.updateHistoryDisplay();
    }

    // 更新历史记录显示
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.classificationHistory.length <= 1) {
            document.getElementById('classificationHistory').style.display = 'none';
            return;
        }

        const historyHtml = this.classificationHistory.slice(0, -1).map(item => `
            <div class="card card-body mb-2 bg-light">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">
                        <i class="bi bi-clock me-1"></i>
                        第${item.round}轮 - ${new Date(item.timestamp).toLocaleString()}
                    </small>
                    <button class="btn btn-sm btn-outline-primary restore-history" data-round="${item.round}">
                        <i class="bi bi-arrow-clockwise me-1"></i>恢复
                    </button>
                </div>
                ${item.userFeedback ? `
                    <div class="mb-2">
                        <small class="text-muted">用户反馈：</small>
                        <div class="small">${this.escapeHtml(item.userFeedback)}</div>
                    </div>
                ` : ''}
                <div class="small">
                    分类数量：${Object.keys(item.data.categories || {}).length} 个类别
                </div>
            </div>
        `).join('');

        historyList.innerHTML = historyHtml;

        // 绑定恢复历史记录事件
        historyList.querySelectorAll('.restore-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const round = parseInt(e.target.getAttribute('data-round'));
                this.restoreFromHistory(round);
            });
        });
    }

    // 切换历史记录显示
    toggleClassificationHistory() {
        const historySection = document.getElementById('classificationHistory');
        const toggleBtn = document.getElementById('toggleHistoryBtn');

        if (historySection.style.display === 'none') {
            historySection.style.display = 'block';
            toggleBtn.innerHTML = '<i class="bi bi-eye-slash me-1"></i>隐藏历史';
        } else {
            historySection.style.display = 'none';
            toggleBtn.innerHTML = '<i class="bi bi-eye me-1"></i>查看历史';
        }
    }

    // 从历史记录恢复
    restoreFromHistory(round) {
        const historyItem = this.classificationHistory.find(item => item.round === round);
        if (historyItem) {
            this.classificationResult = historyItem.data;
            this.displayClassificationResult(historyItem.data);
            this.showToast(`已恢复到第${round}轮的分类结果`, 'success');
        }
    }

    // 发送用户反馈
    async sendUserFeedback() {
        const userFeedback = document.getElementById('userFeedback').value.trim();
        if (!userFeedback) {
            this.showToast('请输入您的反馈或调整要求', 'warning');
            return;
        }

        if (!this.scannedData) {
            this.showToast('请先扫描文件夹', 'warning');
            return;
        }

        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            this.showToast('请输入API密钥', 'warning');
            return;
        }

        this.showLoading(true);
        this.lastUserFeedback = userFeedback;

        try {
            // 准备路径列表
            const pathList = [...this.scannedData.files, ...this.scannedData.folders];

            // 构建包含用户反馈的提示词
            const feedbackPrompt = this.buildFeedbackPrompt(userFeedback);

            const response = await fetch('/aiorganizer/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pathList: pathList,
                    apiKey: apiKey,
                    model: this.selectedModel,
                    customPrompt: feedbackPrompt,
                    promptTemplate: 'feedback',
                    previousResult: this.classificationResult,
                    userFeedback: userFeedback,
                    round: this.currentRound + 1
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentRound++;
                this.classificationResult = result.data;
                this.displayClassificationResult(result.data);

                // 清空反馈输入框
                document.getElementById('userFeedback').value = '';

                this.showToast(`第${this.currentRound}轮分类完成`, 'success');
            } else {
                this.showToast(result.message || '反馈处理失败', 'error');
            }
        } catch (error) {
            console.error('处理用户反馈错误:', error);
            this.showToast('处理反馈时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 构建包含用户反馈的提示词
    buildFeedbackPrompt(userFeedback) {
        const currentCategories = this.classificationResult?.categories || {};
        const categoriesText = Object.entries(currentCategories).map(([name, data]) =>
            `${name}: ${data.items.length}个文件/文件夹`
        ).join(', ');

        return `请根据用户的反馈调整文件分类方案。

当前分类结果：
${categoriesText}

用户反馈：
${userFeedback}

请按照以下JSON格式返回调整后的分类结果：
{
  "categories": {
    "类别名称": {
      "description": "类别描述",
      "items": ["相对路径1", "相对路径2"]
    }
  },
  "suggestions": [
    "根据用户反馈的调整说明",
    "进一步的优化建议"
  ]
}

注意：
1. 根据用户反馈调整分类结构
2. 保持类别名称简洁明了
3. 确保所有文件都被正确分类
4. 提供调整说明和建议`;
    }

    // 优化分类（基于AI建议）
    async optimizeClassification() {
        if (!this.classificationResult || !this.classificationResult.suggestions) {
            this.showToast('没有可用的AI建议进行优化', 'warning');
            return;
        }

        const suggestions = this.classificationResult.suggestions.join('\n');
        const optimizePrompt = `请根据以下AI建议优化当前的文件分类方案：

${suggestions}

请实施这些建议并返回优化后的分类结果。`;

        // 将建议作为反馈发送
        document.getElementById('userFeedback').value = optimizePrompt;
        await this.sendUserFeedback();
    }

    // 重新开始分类
    resetClassification() {
        if (confirm('确定要重新开始分类吗？这将清除所有历史记录。')) {
            this.classificationHistory = [];
            this.currentRound = 1;
            this.classificationResult = null;
            this.lastUserFeedback = null;

            // 清空UI
            document.getElementById('classificationResult').innerHTML = '';
            document.getElementById('aiSuggestions').innerHTML = '';
            document.getElementById('userFeedback').value = '';
            document.getElementById('classificationHistory').style.display = 'none';

            // 隐藏相关区域
            this.hideSection('classificationSection');
            this.hideSection('executeSection');

            this.showToast('已重置分类状态', 'info');
        }
    }

    // 预览移动操作
    async previewMove() {
        if (!this.classificationResult) {
            this.showToast('请先进行AI分类', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/aiorganizer/move/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    basePath: this.currentDirectory,
                    classificationResult: this.classificationResult
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayMovePreview(result.data);
                this.showSection('resultSection');
                this.showToast('预览生成完成', 'success');
            } else {
                this.showToast(result.message || '预览失败', 'error');
            }
        } catch (error) {
            console.error('预览移动错误:', error);
            this.showToast('预览时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 执行移动操作
    async executeMove() {
        if (!this.classificationResult) {
            this.showToast('请先进行AI分类', 'warning');
            return;
        }

        // 确认对话框
        if (!confirm('确定要执行文件移动操作吗？此操作将实际移动文件，请确保已经预览确认无误。')) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/aiorganizer/move/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    basePath: this.currentDirectory,
                    classificationResult: this.classificationResult
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayMoveResult(result.data);
                this.showSection('resultSection');
                this.showToast(`文件移动完成！成功移动 ${result.data.summary.movedFiles} 个文件`, 'success');
            } else {
                this.showToast(result.message || '文件移动失败', 'error');
            }
        } catch (error) {
            console.error('执行移动错误:', error);
            this.showToast('执行移动时发生错误', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示移动预览
    displayMovePreview(data) {
        const operationResult = document.getElementById('operationResult');
        if (!operationResult) return;

        const operationsHtml = data.operations.map(op => `
            <div class="border rounded p-2 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>移动到：</strong> ${this.escapeHtml(op.category)}
                    </div>
                    <span class="badge bg-info">${op.type}</span>
                </div>
                <div class="small text-muted mt-1">
                    <i class="bi bi-arrow-right me-1"></i>
                    ${this.escapeHtml(op.relativePath)} → ${this.escapeHtml(op.category)}/${this.escapeHtml(this.getFileName(op.relativePath))}
                </div>
            </div>
        `).join('');

        operationResult.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="bi bi-eye me-2"></i>移动预览</h6>
                <p class="mb-0">以下是将要执行的移动操作，共 ${data.summary.totalFiles} 个文件</p>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${operationsHtml}
            </div>
            <div class="mt-3">
                <div class="row text-center">
                    <div class="col-md-3">
                        <div class="h6 text-primary">${data.summary.totalFiles}</div>
                        <div class="small text-muted">总文件数</div>
                    </div>
                    <div class="col-md-3">
                        <div class="h6 text-success">${data.summary.createdFolders}</div>
                        <div class="small text-muted">将创建文件夹</div>
                    </div>
                    <div class="col-md-3">
                        <div class="h6 text-warning">${Object.keys(this.classificationResult.categories).length}</div>
                        <div class="small text-muted">分类数量</div>
                    </div>
                    <div class="col-md-3">
                        <div class="h6 text-info">预览</div>
                        <div class="small text-muted">当前状态</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示移动结果
    displayMoveResult(data) {
        const operationResult = document.getElementById('operationResult');
        if (!operationResult) return;

        const successClass = data.summary.errors === 0 ? 'alert-success' : 'alert-warning';
        const iconClass = data.summary.errors === 0 ? 'bi-check-circle' : 'bi-exclamation-triangle';

        let errorsHtml = '';
        if (data.errors && data.errors.length > 0) {
            errorsHtml = `
                <div class="mt-3">
                    <h6 class="text-danger">错误信息：</h6>
                    <div class="alert alert-danger">
                        <ul class="mb-0">
                            ${data.errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        operationResult.innerHTML = `
            <div class="alert ${successClass}">
                <h6><i class="bi ${iconClass} me-2"></i>移动操作完成</h6>
                <p class="mb-0">文件移动操作已完成</p>
            </div>
            <div class="row text-center mb-3">
                <div class="col-md-3">
                    <div class="h4 text-primary">${data.summary.totalFiles}</div>
                    <div class="small text-muted">总文件数</div>
                </div>
                <div class="col-md-3">
                    <div class="h4 text-success">${data.summary.movedFiles}</div>
                    <div class="small text-muted">成功移动</div>
                </div>
                <div class="col-md-3">
                    <div class="h4 text-info">${data.summary.createdFolders}</div>
                    <div class="small text-muted">创建文件夹</div>
                </div>
                <div class="col-md-3">
                    <div class="h4 text-danger">${data.summary.errors}</div>
                    <div class="small text-muted">错误数量</div>
                </div>
            </div>
            ${errorsHtml}
        `;
    }

    // 显示/隐藏API密钥
    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('toggleApiKey');

        if (apiKeyInput && toggleBtn) {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
            } else {
                apiKeyInput.type = 'password';
                toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
            }
        }
    }

    // 更新分类按钮状态
    updateClassifyButtonState() {
        const classifyBtn = document.getElementById('classifyBtn');
        const apiKey = document.getElementById('apiKey').value.trim();

        if (classifyBtn) {
            classifyBtn.disabled = !this.scannedData || !apiKey;
        }
    }

    // 显示指定区域
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    }

    // 隐藏指定区域
    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    }

    // 显示加载状态
    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取文件名（类似 path.basename）
    getFileName(filePath) {
        return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const toast = document.createElement('div');
        toast.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // 3秒后自动消失
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.aiorganizerManager = new AiorganizerManager();
});
