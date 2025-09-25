#!/usr/bin/env node

/**
 * 自动创建新工具的脚本
 * 用法: node scripts/create-tool.js <中文名> <英文名> [图标]
 * 示例: node scripts/create-tool.js "开发工具" devtools bi-code-slash
 */

const fs = require('fs').promises;
const path = require('path');

// 模板内容
const templates = {
    // 路由模板
    route: (englishName, chineseName) => `// routes/${englishName}.js - ${chineseName}路由
const express = require('express');
const router = express.Router();
const ${englishName}Service = require('../services/${englishName}Service');

// 创建服务实例
const service = new ${englishName}Service();

// 显示${chineseName}页面
router.get('/', (req, res) => {
    res.render('${englishName}', {
        title: '${chineseName}',
        currentPath: req.path
    });
});

// ${chineseName}API接口
router.post('/api/process', async (req, res) => {
    try {
        const result = await service.process(req.body);
        res.json(result);
    } catch (error) {
        console.error('${chineseName}处理错误:', error);
        res.status(500).json({
            success: false,
            message: '处理失败: ' + error.message
        });
    }
});

module.exports = router;
`,

    // 服务模板
    service: (englishName, chineseName) => `// services/${englishName}Service.js - ${chineseName}服务
const path = require('path');
const fs = require('fs').promises;

class ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Service {
    constructor() {
        this.name = '${chineseName}';
    }

    /**
     * 处理${chineseName}请求
     * @param {Object} data - 请求数据
     * @returns {Object} 处理结果
     */
    async process(data) {
        try {
            // TODO: 在这里实现您的${chineseName}逻辑
            console.log('${chineseName}处理数据:', data);
            
            return {
                success: true,
                message: '${chineseName}处理成功',
                data: {
                    // TODO: 返回处理结果
                    processed: true,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('${chineseName}服务错误:', error);
            throw error;
        }
    }

    /**
     * 获取${chineseName}统计信息
     * @returns {Object} 统计信息
     */
    async getStats() {
        return {
            totalProcessed: 0,
            lastProcessed: null
        };
    }
}

module.exports = ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Service;
`,

    // 基础页面模板 - 简洁版本
    viewBasic: (englishName, chineseName) => `<!DOCTYPE html>
<html lang="zh-CN" data-bs-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chineseName} - 工具集</title>

    <!-- Bootstrap CSS -->
    <link href="/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <!-- 自定义样式 -->
    <link href="/css/custom.css" rel="stylesheet">
</head>
<body>
<div class="app-container">
    <!-- 左侧侧边栏 -->
    <div class="sidebar bg-light border-end" id="sidebar">
        <%- include('partials/sidebar') %>
    </div>

    <!-- 右侧主内容区 -->
    <div class="main-content" id="main-content">
        <main class="p-4">
            <div class="container-fluid">
                <!-- 页面标题 -->
                <div class="row mb-4">
                    <div class="col-12">
                        <h2>
                            <i class="bi bi-star text-primary me-2"></i>
                            ${chineseName}
                        </h2>
                        <p class="text-muted">${chineseName}功能描述</p>
                    </div>
                </div>

                <!-- 主要内容区域 - 左右分栏布局 -->
                <div class="row">
                    <!-- 左侧操作配置栏 -->
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-sliders me-2"></i>
                                    操作配置
                                </h5>
                            </div>
                            <div class="card-body">
                                <!-- 输入数据区域 -->
                                <div class="mb-3">
                                    <label for="inputData" class="form-label">输入数据</label>
                                    <textarea class="form-control" id="inputData" rows="6"
                                              placeholder="请输入要处理的数据..."></textarea>
                                </div>

                                <!-- 配置选项区域 -->
                                <div class="mb-3">
                                    <label class="form-label">处理选项</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="option1">
                                        <label class="form-check-label" for="option1">
                                            选项一
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="option2">
                                        <label class="form-check-label" for="option2">
                                            选项二
                                        </label>
                                    </div>
                                </div>

                                <!-- 操作按钮区域 -->
                                <div class="d-grid gap-2">
                                    <button type="button" class="btn btn-primary" id="processBtn">
                                        <i class="bi bi-play-circle me-2"></i>
                                        开始处理
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="clearBtn">
                                        <i class="bi bi-arrow-clockwise me-2"></i>
                                        清空数据
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 使用说明卡片 -->
                        <div class="card mt-3">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-info-circle me-2"></i>
                                    使用说明
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted small">
                                    <!-- TODO: 添加工具使用说明 -->
                                    这是${chineseName}工具的使用说明。请在左侧输入要处理的数据，选择相应的处理选项，然后点击"开始处理"按钮。
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧主要内容区域 -->
                    <div class="col-lg-8">
                        <!-- 消息提示区域 -->
                        <div id="messageArea" class="mb-3" style="display: none;">
                            <div class="alert alert-info alert-dismissible fade show" role="alert" id="messageContent">
                                <strong>提示：</strong> <span id="messageText"></span>
                                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                            </div>
                        </div>

                        <!-- 业务处理区域 -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-cpu me-2"></i>
                                    处理结果
                                </h5>
                            </div>
                            <div class="card-body">
                                <!-- 处理状态显示 -->
                                <div id="processingStatus" class="text-center py-4" style="display: none;">
                                    <div class="spinner-border text-primary mb-3" role="status">
                                        <span class="visually-hidden">处理中...</span>
                                    </div>
                                    <p class="text-muted">正在处理数据，请稍候...</p>
                                </div>

                                <!-- 默认提示 -->
                                <div id="defaultTip" class="text-center py-5 text-muted">
                                    <i class="bi bi-arrow-left-circle display-6 mb-3"></i>
                                    <p>请在左侧输入数据并点击"开始处理"</p>
                                </div>

                                <!-- 结果展示区域 -->
                                <div id="resultContent" style="display: none;">
                                    <!-- 处理结果将在这里显示 -->
                                </div>
                            </div>
                        </div>

                        <!-- 预览区域（可选） -->
                        <div class="card mt-3" id="previewArea" style="display: none;">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-eye me-2"></i>
                                    预览
                                </h5>
                            </div>
                            <div class="card-body" id="previewContent">
                                <!-- 预览内容将在这里显示 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<!-- 加载提示 -->
<div class="position-fixed top-50 start-50 translate-middle" id="loadingSpinner" style="display: none; z-index: 9999;">
    <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">加载中...</span>
    </div>
</div>

<!-- Bootstrap JS -->
<script src="/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<!-- 侧边栏管理 -->
<script src="/js/sidebar.js"></script>
<!-- 主题管理 -->
<script src="/js/theme.js"></script>
<!-- 通用工具 -->
<script src="/js/utils.js"></script>
<!-- ${chineseName}页面脚本 -->
<script src="/js/${englishName}.js"></script>
</body>
</html>
`,

    // 增强版页面模板 - 包含完整的文件处理功能
    viewEnhanced: (englishName, chineseName) => `<!DOCTYPE html>
<html lang="zh-CN" data-bs-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chineseName} - 工具集</title>

    <!-- Bootstrap CSS -->
    <link href="/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <!-- 自定义样式 -->
    <link href="/css/custom.css" rel="stylesheet">
    <style>
        /* 拖拽上传区域样式 */
        .upload-area {
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .upload-area:hover, .upload-area.drag-over {
            border-color: #0d6efd;
            background-color: rgba(13, 110, 253, 0.05);
        }
        .file-item {
            transition: all 0.2s ease;
        }
        .file-item:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        [data-bs-theme="dark"] .file-item:hover {
            background-color: rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body>
<div class="app-container">
    <!-- 左侧侧边栏 -->
    <div class="sidebar bg-light border-end" id="sidebar">
        <%- include('partials/sidebar') %>
    </div>

    <!-- 右侧主内容区 -->
    <div class="main-content" id="main-content">
        <main class="p-4">
            <div class="container-fluid">
                <!-- 页面标题 -->
                <div class="row mb-4">
                    <div class="col-12">
                        <h2>
                            <i class="bi bi-star text-primary me-2"></i>
                            ${chineseName}
                        </h2>
                        <p class="text-muted">${chineseName}功能 - 支持文件选择、拖拽上传和文件夹操作</p>
                    </div>
                </div>

                <!-- 主要内容区域 - 左右分栏布局 -->
                <div class="row">
                    <!-- 左侧：配置栏 -->
                    <div class="col-lg-4 mb-4">
                        <!-- 文件选择区域 -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h6 class="mb-0">
                                    <i class="bi bi-files me-2"></i>
                                    选择文件
                                </h6>
                            </div>
                            <div class="card-body">
                                <!-- 拖拽上传区域 -->
                                <div class="upload-area text-center p-3 mb-3" id="dropZone">
                                    <i class="bi bi-cloud-upload display-6 text-primary mb-2"></i>
                                    <h6>拖拽文件到此区域</h6>
                                    <p class="text-muted small mb-0">支持拖拽文件或文件夹</p>
                                </div>

                                <!-- 文件选择按钮 -->
                                <div class="mb-3">
                                    <button class="btn btn-outline-primary w-100" id="selectFiles">
                                        <i class="bi bi-files me-2"></i>选择文件
                                    </button>
                                    <input type="file" id="fileInput" multiple style="display: none;">
                                </div>

                                <!-- 文件夹选择 -->
                                <div class="mb-3">
                                    <button class="btn btn-outline-secondary w-100" id="selectFolder">
                                        <i class="bi bi-folder2-open me-2"></i>选择文件夹
                                    </button>
                                </div>

                                <!-- 包含子文件夹选项 -->
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="includeSubfolders" checked>
                                        <label class="form-check-label" for="includeSubfolders">
                                            <i class="bi bi-folder-plus me-1"></i>包含子文件夹
                                        </label>
                                    </div>
                                    <small class="text-muted">勾选后将递归扫描所有子文件夹中的文件</small>
                                </div>

                                <!-- 当前选择显示 -->
                                <div class="small text-muted" id="selectionInfo">
                                    未选择任何文件
                                </div>
                            </div>
                        </div>

                        <!-- 参数设置区域 -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h6 class="mb-0">
                                    <i class="bi bi-gear me-2"></i>
                                    参数设置
                                </h6>
                            </div>
                            <div class="card-body">
                                <!-- TODO: 在这里添加您的参数设置 -->
                                <div class="mb-3">
                                    <label for="processingMode" class="form-label">处理模式</label>
                                    <select class="form-select" id="processingMode">
                                        <option value="default">默认模式</option>
                                        <option value="advanced">高级模式</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="outputFormat" class="form-label">输出格式</label>
                                    <select class="form-select" id="outputFormat">
                                        <option value="json">JSON</option>
                                        <option value="text">文本</option>
                                        <option value="csv">CSV</option>
                                    </select>
                                </div>

                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="includeMetadata">
                                    <label class="form-check-label" for="includeMetadata">
                                        包含元数据
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 操作按钮区域 -->
                        <div class="card">
                            <div class="card-body">
                                <button class="btn btn-primary w-100 mb-2" id="processBtn" disabled>
                                    <i class="bi bi-play me-2"></i>开始处理
                                </button>
                                <button class="btn btn-outline-secondary w-100" id="clearBtn">
                                    <i class="bi bi-trash me-2"></i>清空选择
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧：结果展示区 -->
                    <div class="col-lg-8">
                        <!-- 文件列表显示 -->
                        <div class="card mb-3" id="fileListCard" style="display: none;">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">
                                    <i class="bi bi-list-ul me-2"></i>
                                    已选择文件 (<span id="fileCount">0</span>)
                                </h6>
                                <button class="btn btn-sm btn-outline-danger" id="clearFileList">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                            <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                                <div id="fileList">
                                    <!-- 文件列表将在这里显示 -->
                                </div>
                            </div>
                        </div>

                        <!-- 处理进度 -->
                        <div class="card mb-3" id="progressCard" style="display: none;">
                            <div class="card-header">
                                <h6 class="mb-0">
                                    <i class="bi bi-hourglass-split me-2"></i>
                                    处理进度
                                </h6>
                            </div>
                            <div class="card-body">
                                <div class="progress mb-2">
                                    <div class="progress-bar" id="progressBar" role="progressbar" style="width: 0%"></div>
                                </div>
                                <div class="small text-muted" id="progressText">准备开始...</div>
                            </div>
                        </div>

                        <!-- 结果显示区域 -->
                        <div class="card" id="resultCard" style="display: none;">
                            <div class="card-header">
                                <h6 class="mb-0">
                                    <i class="bi bi-check-circle me-2"></i>
                                    处理结果
                                </h6>
                            </div>
                            <div class="card-body">
                                <div id="resultContent">
                                    <!-- 结果内容将在这里显示 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<!-- 加载提示 -->
<div class="position-fixed top-50 start-50 translate-middle" id="loadingSpinner" style="display: none; z-index: 9999;">
    <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">加载中...</span>
    </div>
</div>

<!-- Bootstrap JS -->
<script src="/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<!-- 侧边栏管理 -->
<script src="/js/sidebar.js"></script>
<!-- 主题管理 -->
<script src="/js/theme.js"></script>
<!-- 通用工具 -->
<script src="/js/utils.js"></script>
<!-- ${chineseName}页面脚本 -->
<script src="/js/${englishName}.js"></script>
</body>
</html>
`,

    // 基础前端JS模板 - 简洁版本
    clientScriptBasic: (englishName, chineseName) => `// public/js/${englishName}.js - ${chineseName}前端脚本

class ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Manager {
    constructor() {
        this.isElectronApp = false;
        this.init();
    }

    async init() {
        console.log('${chineseName}管理器初始化...');

        // 检查Electron环境
        await this.checkElectronEnvironment();

        // 绑定事件
        this.bindEvents();

        console.log('${chineseName}管理器初始化完成');
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('${chineseName} - Electron环境检测:', this.isElectronApp);
            } catch (error) {
                console.log('Electron API不可用:', error);
                this.isElectronApp = false;
            }
        } else {
            this.isElectronApp = false;
        }
    }

    bindEvents() {
        // 处理按钮事件
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processData());
        }

        // 清空按钮事件
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearData());
        }

        // 输入框变化事件
        const inputData = document.getElementById('inputData');
        if (inputData) {
            inputData.addEventListener('input', () => this.onInputChange());
        }
    }

    onInputChange() {
        const inputData = document.getElementById('inputData').value.trim();
        const defaultTip = document.getElementById('defaultTip');

        if (inputData && defaultTip) {
            defaultTip.style.display = 'none';
        } else if (!inputData && defaultTip) {
            defaultTip.style.display = 'block';
        }
    }

    async processData() {
        const inputData = document.getElementById('inputData').value.trim();

        if (!inputData) {
            this.showMessage('请输入要处理的数据', 'warning');
            return;
        }

        // 获取配置选项
        const options = this.getProcessingOptions();

        const processBtn = document.getElementById('processBtn');
        const originalText = processBtn.innerHTML;

        try {
            // 显示处理状态
            this.showProcessingStatus(true);
            processBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>处理中...';
            processBtn.disabled = true;

            // 发送处理请求
            const response = await fetch('/${englishName}/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: inputData,
                    options: options,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showResult(result);
                this.showMessage('处理完成', 'success');
            } else {
                this.showMessage(result.message || '处理失败', 'error');
            }
        } catch (error) {
            console.error('${chineseName}处理错误:', error);
            this.showMessage('处理失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            this.showProcessingStatus(false);
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
        }
    }

    getProcessingOptions() {
        // 获取用户选择的处理选项
        return {
            option1: document.getElementById('option1')?.checked || false,
            option2: document.getElementById('option2')?.checked || false
        };
    }

    showProcessingStatus(show) {
        const processingStatus = document.getElementById('processingStatus');
        const defaultTip = document.getElementById('defaultTip');
        const resultContent = document.getElementById('resultContent');

        if (show) {
            processingStatus.style.display = 'block';
            defaultTip.style.display = 'none';
            resultContent.style.display = 'none';
        } else {
            processingStatus.style.display = 'none';
        }
    }

    clearData() {
        document.getElementById('inputData').value = '';
        document.getElementById('option1').checked = false;
        document.getElementById('option2').checked = false;

        // 重置显示状态
        document.getElementById('defaultTip').style.display = 'block';
        document.getElementById('resultContent').style.display = 'none';
        document.getElementById('previewArea').style.display = 'none';

        this.showMessage('已清空数据', 'info');
    }

    showResult(result) {
        const defaultTip = document.getElementById('defaultTip');
        const resultContent = document.getElementById('resultContent');
        const previewArea = document.getElementById('previewArea');

        // 隐藏默认提示
        defaultTip.style.display = 'none';

        // TODO: 根据实际结果格式化显示内容
        resultContent.innerHTML = \`
            <div class="alert alert-success mb-3">
                <h6 class="mb-2"><i class="bi bi-check-circle me-2"></i>处理成功</h6>
                <small class="text-muted">处理时间: \${new Date(result.data.timestamp).toLocaleString()}</small>
            </div>
            <div class="border rounded p-3" style="background-color: var(--bs-body-bg);">
                <h6 class="mb-2">处理结果：</h6>
                <pre class="mb-0" style="background-color: var(--bs-secondary-bg); color: var(--bs-body-color);"><code>\${JSON.stringify(result.data, null, 2)}</code></pre>
            </div>
        \`;

        // 显示结果
        resultContent.style.display = 'block';

        // 可选：显示预览区域
        if (result.preview) {
            const previewContent = document.getElementById('previewContent');
            previewContent.innerHTML = result.preview;
            previewArea.style.display = 'block';
        }
    }

    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        const messageContent = document.getElementById('messageContent');
        const messageText = document.getElementById('messageText');

        if (!messageArea || !messageContent || !messageText) {
            // 降级到toast提示
            this.showToast(message, type);
            return;
        }

        // 设置消息类型样式
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        messageContent.className = \`alert \${alertClass} alert-dismissible fade show\`;
        messageText.textContent = message;
        messageArea.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 3000);
    }

    showToast(message, type = 'info') {
        // 右上角Toast提示实现
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const toast = document.createElement('div');
        toast.className = \`alert \${alertClass} alert-dismissible fade show position-fixed\`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = \`
            <strong>\${type === 'success' ? '成功' : type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示'}：</strong> \${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        \`;

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
    window.${englishName}Manager = new ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Manager();
});
`,

    // 增强版前端JS模板 - 包含完整的文件处理功能
    clientScriptEnhanced: (englishName, chineseName) => `// public/js/${englishName}.js - ${chineseName}前端脚本

class ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Manager {
    constructor() {
        this.isElectronApp = false;
        this.selectedFiles = [];
        this.selectedFolder = null;
        this.init();
    }

    async init() {
        console.log('${chineseName}管理器初始化...');

        // 检查Electron环境
        await this.checkElectronEnvironment();

        // 绑定事件
        this.bindEvents();

        console.log('${chineseName}管理器初始化完成');
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('${chineseName} - Electron环境检测:', this.isElectronApp);
            } catch (error) {
                console.log('Electron API不可用:', error);
                this.isElectronApp = false;
            }
        } else {
            this.isElectronApp = false;
        }
    }

    bindEvents() {
        // 文件选择事件
        this.bindFileSelectionEvents();

        // 拖拽事件
        this.bindDragDropEvents();

        // 处理按钮事件
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processFiles());
        }

        // 清空按钮事件
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }
    }

    bindFileSelectionEvents() {
        // 文件选择
        const selectFiles = document.getElementById('selectFiles');
        const fileInput = document.getElementById('fileInput');
        if (selectFiles && fileInput) {
            selectFiles.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files, true));
        }

        // 文件夹选择
        const selectFolder = document.getElementById('selectFolder');
        if (selectFolder) {
            selectFolder.addEventListener('click', () => this.selectFolder());
        }

        // 清空文件列表
        const clearFileList = document.getElementById('clearFileList');
        if (clearFileList) {
            clearFileList.addEventListener('click', () => this.clearFileList());
        }

        // "包含子文件夹"选项变化时重新扫描
        const includeSubfolders = document.getElementById('includeSubfolders');
        if (includeSubfolders) {
            includeSubfolders.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                console.log(\`"包含子文件夹"选项变更为: \${isChecked}\`);

                // 如果已经选择了文件夹，重新扫描
                if (this.selectedFolder) {
                    console.log('重新扫描已选择的文件夹...');
                    this.scanFolderFiles();
                }

                // 显示提示信息
                this.showToast(
                    isChecked ? '已开启子文件夹扫描' : '已关闭子文件夹扫描',
                    'info'
                );
            });
        }
    }

    bindDragDropEvents() {
        const dropZone = document.getElementById('dropZone');
        if (!dropZone) return;

        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽进入
        dropZone.addEventListener('dragenter', (e) => {
            dropZone.classList.add('drag-over');
            this.updateDropZoneUI('dragenter');
        });

        // 拖拽悬停
        dropZone.addEventListener('dragover', (e) => {
            dropZone.classList.add('drag-over');
            this.updateDropZoneUI('dragover');
        });

        // 拖拽离开
        dropZone.addEventListener('dragleave', (e) => {
            // 检查是否真的离开了拖拽区域
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
                this.updateDropZoneUI('dragleave');
            }
        });

        // 文件放置
        dropZone.addEventListener('drop', async (e) => {
            dropZone.classList.remove('drag-over');
            this.updateDropZoneUI('drop');

            const files = Array.from(e.dataTransfer.files);
            const items = Array.from(e.dataTransfer.items);

            // 使用增强的文件处理逻辑
            await this.handleFileDrop(files, items);
        });
    }

    // 拖拽区域UI更新
    updateDropZoneUI(eventType) {
        const dropZone = document.getElementById('dropZone');
        const dropProgress = document.getElementById('dropProgress');

        switch(eventType) {
            case 'dragenter':
            case 'dragover':
                if (dropZone) {
                    dropZone.innerHTML = \`
                        <i class="bi bi-cloud-upload-fill display-6 text-success mb-2"></i>
                        <h6 class="text-success">释放文件到此处</h6>
                        <p class="text-muted small mb-0">支持文件和文件夹</p>
                    \`;
                }
                break;
            case 'dragleave':
            case 'drop':
                if (dropZone) {
                    dropZone.innerHTML = \`
                        <i class="bi bi-cloud-upload display-6 text-primary mb-2"></i>
                        <h6>拖拽文件到此区域</h6>
                        <p class="text-muted small mb-0">支持拖拽文件或文件夹</p>
                    \`;
                }
                break;
        }
    }

    // 增强的文件拖拽处理
    async handleFileDrop(files, items) {
        if (!files || files.length === 0) return;

        try {
            const allFiles = [];
            const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;

            console.log(\`开始处理 \${files.length} 个拖拽项目，包含子文件夹: \${includeSubfolders}\`);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const item = items[i];

                console.log(\`处理项目 \${i + 1}/\${files.length}: \${file.name} (大小: \${file.size})\`);

                // 获取文件的真实路径
                const filePath = await this.getFileRealPath(file);
                console.log(\`文件 \${file.name} 的路径: \${filePath}\`);

                // 多重方法判断是否为文件夹
                let isDirectory = false;
                let entry = null;

                // 方法1: 使用 webkitGetAsEntry API
                if (item && item.webkitGetAsEntry) {
                    entry = item.webkitGetAsEntry();
                    if (entry && entry.isDirectory) {
                        isDirectory = true;
                        console.log(\`webkitGetAsEntry 检测: \${file.name} -> isDirectory: true\`);
                    } else {
                        console.log(\`webkitGetAsEntry 检测: \${file.name} -> entry: \${entry}, isDirectory: \${entry?.isDirectory}\`);
                    }
                }

                // 方法2: 如果 webkitGetAsEntry 失败，使用传统判断方法
                if (!isDirectory) {
                    const traditionalCheck = !file.type && file.size <= 4096;
                    console.log(\`传统方法检测: \${file.name} -> isDirectory: \${traditionalCheck} (type: "\${file.type}", size: \${file.size})\`);

                    // 方法3: 检查文件路径是否指向目录（通过路径特征判断）
                    const pathCheck = filePath && filePath !== file.name && !filePath.includes('.');
                    console.log(\`路径特征检测: \${file.name} -> 路径: \${filePath}, 可能是目录: \${pathCheck}\`);

                    // 综合判断：传统方法 + 路径特征
                    isDirectory = traditionalCheck || pathCheck;
                    console.log(\`综合判断结果: \${file.name} -> isDirectory: \${isDirectory}\`);
                }

                if (isDirectory) {
                    // 处理文件夹
                    console.log(\`开始扫描文件夹: \${file.name} (包含子文件夹: \${includeSubfolders})\`);
                    console.log(\`文件夹完整路径: \${filePath}\`);

                    if (entry && entry.isDirectory) {
                        // 使用 webkitGetAsEntry API 扫描
                        const folderFiles = await this.scanDirectoryWebkit(entry, includeSubfolders, entry.name, filePath);
                        allFiles.push(...folderFiles);
                        console.log(\`文件夹 "\${entry.name}" 扫描完成，找到 \${folderFiles.length} 个文件 (递归: \${includeSubfolders})\`);
                    } else {
                        // webkitGetAsEntry 失败，尝试使用 Electron API 扫描
                        console.warn(\`webkitGetAsEntry 失败，尝试使用 Electron API 扫描文件夹: \${file.name}\`);
                        try {
                            const folderFiles = await this.scanFolderUsingElectronAPI(filePath, includeSubfolders);
                            allFiles.push(...folderFiles);
                            console.log(\`文件夹 "\${file.name}" (Electron API) 扫描完成，找到 \${folderFiles.length} 个文件 (递归: \${includeSubfolders})\`);
                        } catch (error) {
                            console.error(\`扫描文件夹 \${file.name} 失败:\`, error);
                        }
                    }
                } else {
                    // 处理单个文件
                    const fileInfo = {
                        name: file.name,
                        path: filePath,
                        size: file.size,
                        extension: this.getFileExtension(file.name),
                        relativePath: filePath,
                        directory: this.getDirectoryFromPath(filePath),
                        modified: new Date(file.lastModified || Date.now()),
                        created: new Date(file.lastModified || Date.now()),
                        type: file.type || 'application/octet-stream',
                        file: file,
                        isDragDropped: true,
                        hasRealPath: Boolean(filePath)
                    };
                    allFiles.push(fileInfo);
                    console.log(\`文件: \${file.name} (\${filePath})\`);
                }
            }

            console.log(\`所有项目处理完成，总共找到 \${allFiles.length} 个文件\`);

            // 更新文件列表
            if (allFiles.length > 0) {
                this.selectedFiles = [...this.selectedFiles, ...allFiles];
                this.updateFileList();
                this.updateSelectionInfo();
                this.updateProcessButton();
                this.showToast(\`成功导入 \${allFiles.length} 个文件\`, 'success');
            } else {
                this.showToast('未找到可处理的文件', 'warning');
            }

        } catch (error) {
            console.error('拖拽处理错误:', error);
            this.showToast('文件拖拽处理失败: ' + error.message, 'error');
        }
    }

    async selectFolder() {
        if (this.isElectronApp && window.electronAPI) {
            try {
                const result = await window.electronAPI.selectFolder();
                if (result.success && result.folderPath) {
                    this.selectedFolder = result.folderPath;
                    this.updateSelectionInfo();

                    // 扫描文件夹中的文件
                    await this.scanFolderFiles();

                    this.showToast('文件夹选择成功', 'success');
                } else if (result.canceled) {
                    this.showToast('用户取消了文件夹选择', 'info');
                }
            } catch (error) {
                console.error('文件夹选择错误:', error);
                this.showToast('文件夹选择失败', 'error');
            }
        } else {
            this.showToast('文件夹选择需要在Electron环境中运行', 'warning');
        }
    }

    // 获取文件的真实路径 - 兼容 Electron v32+ 和旧版本
    async getFileRealPath(file) {
        // 优先使用新的 webUtils API (Electron v32+)
        if (this.isElectronApp && window.electronAPI && window.electronAPI.getPathForFile) {
            try {
                const realPath = await window.electronAPI.getPathForFile(file);
                console.log(\`webUtils.getPathForFile 成功: \${file.name} -> \${realPath}\`);
                return realPath;
            } catch (error) {
                console.warn(\`webUtils.getPathForFile 失败: \${file.name}\`, error);
            }
        }

        // 回退到传统方法
        if (file.path) {
            console.log(\`使用传统 file.path: \${file.name} -> \${file.path}\`);
            return file.path;
        }

        // 最后回退：返回文件名
        console.warn(\`无法获取文件路径，使用文件名: \${file.name}\`);
        return file.name;
    }

    // 获取文件扩展名
    getFileExtension(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return '';
        }
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
    }

    // 从完整路径中提取目录路径
    getDirectoryFromPath(fullPath) {
        if (!fullPath || typeof fullPath !== 'string') {
            return '';
        }
        const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\\\'));
        return lastSlash > 0 ? fullPath.substring(0, lastSlash) : '';
    }

    // 使用 webkitGetAsEntry API 扫描目录
    async scanDirectoryWebkit(directoryEntry, includeSubfolders, currentRelativePath, absoluteBasePath) {
        const files = [];

        try {
            console.log(\`扫描目录: \${currentRelativePath} (\${directoryEntry ? '有效' : '无效'} 个子项目)\`);

            const currentAbsolutePath = absoluteBasePath || currentRelativePath;
            console.log(\`绝对路径: \${currentAbsolutePath}\`);

            const entries = await this.readDirectoryEntries(directoryEntry);
            console.log(\`扫描目录: \${currentRelativePath} (\${entries.length} 个子项目)\`);

            for (const childEntry of entries) {
                try {
                    if (childEntry.isFile) {
                        // 处理文件
                        const file = await this.getFileFromEntry(childEntry);
                        if (file) {
                            const relativeFilePath = \`\${currentRelativePath}/\${childEntry.name}\`;
                            const absoluteFilePath = \`\${currentAbsolutePath}/\${childEntry.name}\`;

                            const fileInfo = {
                                name: file.name,
                                path: absoluteFilePath, // 使用绝对路径
                                size: file.size,
                                extension: this.getFileExtension(file.name),
                                relativePath: relativeFilePath, // 保留相对路径用于显示
                                directory: currentAbsolutePath,
                                modified: new Date(file.lastModified || Date.now()),
                                created: new Date(file.lastModified || Date.now()),
                                type: file.type || 'application/octet-stream',
                                file: file,
                                isDragDropped: true,
                                hasRealPath: Boolean(absoluteBasePath) // 如果有绝对基础路径，则标记为有真实路径
                            };
                            files.push(fileInfo);
                            console.log(\`文件: \${fileInfo.path} (相对路径: \${fileInfo.relativePath})\`);
                        }
                    } else if (childEntry.isDirectory && includeSubfolders) {
                        // 递归处理子文件夹
                        console.log(\`递归扫描: \${childEntry.name}\`);
                        const subRelativePath = \`\${currentRelativePath}/\${childEntry.name}\`;
                        const subAbsolutePath = \`\${currentAbsolutePath}/\${childEntry.name}\`;
                        const subFiles = await this.scanDirectoryWebkit(
                            childEntry,
                            includeSubfolders,
                            subRelativePath,
                            subAbsolutePath
                        );
                        files.push(...subFiles);
                    } else if (childEntry.isDirectory && !includeSubfolders) {
                        console.log(\`跳过子文件夹: \${childEntry.name} (不包含子文件夹)\`);
                    }
                } catch (error) {
                    console.error(\`处理 \${childEntry.name} 时出错:\`, error);
                    // 继续处理其他项目
                }
            }
        } catch (error) {
            console.error('扫描目录时出错:', error);
        }

        return files;
    }

    // 读取目录条目
    async readDirectoryEntries(directoryEntry) {
        return new Promise((resolve, reject) => {
            const reader = directoryEntry.createReader();
            const entries = [];

            const readEntries = () => {
                reader.readEntries((results) => {
                    if (results.length === 0) {
                        resolve(entries);
                    } else {
                        entries.push(...results);
                        readEntries(); // 继续读取更多条目
                    }
                }, reject);
            };

            readEntries();
        });
    }

    // 从 FileSystemEntry 获取 File 对象
    async getFileFromEntry(fileEntry) {
        return new Promise((resolve, reject) => {
            fileEntry.file(resolve, reject);
        });
    }

    // 使用 Electron API 扫描文件夹（当 webkitGetAsEntry 失败时的备选方案）
    async scanFolderUsingElectronAPI(folderPath, includeSubfolders) {
        if (!this.isElectronApp || !window.electronAPI) {
            throw new Error('Electron API 不可用');
        }

        try {
            console.log(\`使用 Electron API 扫描文件夹: \${folderPath}\`);
            const result = await window.electronAPI.scanFolderGeneral(folderPath, {
                includeSubfolders: includeSubfolders,
                fileTypes: 'all',
                needProgress: false
            });

            if (result.success && result.files) {
                const files = result.files.map(file => ({
                    name: file.name,
                    path: file.path,
                    size: file.size || 0,
                    extension: this.getFileExtension(file.name),
                    relativePath: file.relativePath || file.name,
                    directory: file.directory || this.getDirectoryFromPath(file.path),
                    modified: new Date(file.modified || Date.now()),
                    created: new Date(file.created || Date.now()),
                    type: file.type || 'application/octet-stream',
                    isDragDropped: true,
                    hasRealPath: true // Electron API 提供真实路径
                }));

                console.log(\`Electron API 扫描结果: \${files.length} 个文件\`);
                return files;
            } else {
                throw new Error(result.error || '扫描失败');
            }
        } catch (error) {
            console.error('Electron API 扫描失败:', error);
            throw error;
        }
    }

    // 扫描选择的文件夹
    async scanFolderFiles() {
        if (!this.selectedFolder) return;

        try {
            // 读取用户的"包含子文件夹"选项
            const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;

            console.log(\`扫描选择的文件夹: \${this.selectedFolder} (包含子文件夹: \${includeSubfolders})\`);

            // 使用现有的扫描API，支持所有文件类型
            const result = await window.electronAPI.scanFolderGeneral(this.selectedFolder, {
                includeSubfolders: includeSubfolders, // 使用用户选择的选项
                fileTypes: 'all', // 扫描所有文件类型
                needProgress: false
            });

            if (result.success && result.files) {
                const files = result.files.map(file => ({
                    name: file.name,
                    path: file.path,
                    size: file.size || 0,
                    extension: this.getFileExtension(file.name),
                    relativePath: file.relativePath || file.name,
                    directory: file.directory || this.getDirectoryFromPath(file.path),
                    modified: new Date(file.modified || Date.now()),
                    created: new Date(file.created || Date.now()),
                    type: file.type || 'application/octet-stream',
                    isFromFolderSelection: true,
                    hasRealPath: true
                }));

                this.selectedFiles = files;
                this.updateFileList();
                this.updateSelectionInfo();
                this.updateProcessButton();

                console.log(\`文件夹扫描完成，找到 \${files.length} 个文件\`);
                this.showToast(\`成功扫描到 \${files.length} 个文件\`, 'success');
            } else {
                throw new Error(result.error || '扫描失败');
            }
        } catch (error) {
            console.error('文件夹扫描错误:', error);
            this.showToast('文件夹扫描失败: ' + error.message, 'error');
        }
    }

    handleFileSelection(files, multiple = false) {
        if (!files || files.length === 0) return;

        if (!multiple) {
            this.selectedFiles = [files[0]];
        } else {
            this.selectedFiles = [...this.selectedFiles, ...Array.from(files)];
        }

        this.updateFileList();
        this.updateSelectionInfo();
        this.updateProcessButton();
    }

    updateFileList() {
        const fileListCard = document.getElementById('fileListCard');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');

        if (this.selectedFiles.length === 0) {
            fileListCard.style.display = 'none';
            return;
        }

        fileListCard.style.display = 'block';
        fileCount.textContent = this.selectedFiles.length;

        fileList.innerHTML = this.selectedFiles.map((file, index) => \`
            <div class="file-item d-flex justify-content-between align-items-center p-2 border-bottom">
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-earmark me-2"></i>
                    <div>
                        <div class="fw-medium">\${file.name}</div>
                        <small class="text-muted">\${this.formatFileSize(file.size)}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="window.${englishName}Manager.removeFile(\${index})">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        \`).join('');
    }

    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selectionInfo');
        let info = '';

        if (this.selectedFiles.length > 0) {
            info += \`已选择 \${this.selectedFiles.length} 个文件\`;
        }

        if (this.selectedFolder) {
            if (info) info += '，';
            info += \`文件夹: \${this.selectedFolder}\`;
        }

        if (!info) {
            info = '未选择任何文件';
        }

        selectionInfo.textContent = info;
    }

    updateProcessButton() {
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.disabled = this.selectedFiles.length === 0 && !this.selectedFolder;
        }
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();
        this.updateSelectionInfo();
        this.updateProcessButton();
    }

    clearFileList() {
        this.selectedFiles = [];
        this.updateFileList();
        this.updateSelectionInfo();
        this.updateProcessButton();
    }

    clearSelection() {
        this.selectedFiles = [];
        this.selectedFolder = null;
        this.updateFileList();
        this.updateSelectionInfo();
        this.updateProcessButton();
        this.hideResults();
        this.showToast('已清空选择', 'info');
    }

    async processFiles() {
        if (this.selectedFiles.length === 0 && !this.selectedFolder) {
            this.showToast('请先选择文件或文件夹', 'warning');
            return;
        }

        const processBtn = document.getElementById('processBtn');
        const originalText = processBtn.innerHTML;

        try {
            // 显示处理状态
            processBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>处理中...';
            processBtn.disabled = true;
            this.showProgress(0, '准备处理...');

            // 准备文件数据
            const fileData = await this.prepareFileData();

            // 发送处理请求
            const response = await fetch('/${englishName}/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: fileData,
                    folder: this.selectedFolder,
                    options: this.getProcessingOptions(),
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showProgress(100, '处理完成');
                this.showResult(result);
                this.showToast('处理完成', 'success');
            } else {
                this.showToast(result.message || '处理失败', 'error');
            }
        } catch (error) {
            console.error('${chineseName}处理错误:', error);
            this.showToast('处理失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
            setTimeout(() => this.hideProgress(), 2000);
        }
    }
    async prepareFileData() {
        // 准备文件数据，这里只返回文件基本信息
        // 实际的文件内容处理应该在服务端进行
        return this.selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        }));
    }

    getProcessingOptions() {
        // 获取用户设置的处理选项
        return {
            processingMode: document.getElementById('processingMode')?.value || 'default',
            outputFormat: document.getElementById('outputFormat')?.value || 'json',
            includeMetadata: document.getElementById('includeMetadata')?.checked || false
        };
    }

    showProgress(percent, text) {
        const progressCard = document.getElementById('progressCard');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (progressCard && progressBar && progressText) {
            progressCard.style.display = 'block';
            progressBar.style.width = percent + '%';
            progressText.textContent = text;
        }
    }

    hideProgress() {
        const progressCard = document.getElementById('progressCard');
        if (progressCard) {
            progressCard.style.display = 'none';
        }
    }

    showResult(result) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        if (resultCard && resultContent) {
            // TODO: 根据实际结果格式化显示内容
            resultContent.innerHTML = \`
                <div class="alert alert-success">
                    <h6>处理成功</h6>
                    <p class="mb-0">处理时间: \${new Date(result.data.timestamp).toLocaleString()}</p>
                    <p class="mb-0">处理文件数: \${result.data.processedCount || 0}</p>
                </div>
                <div class="mt-3">
                    <h6>处理结果:</h6>
                    <pre class="border rounded p-3" style="background-color: var(--bs-secondary-bg); color: var(--bs-body-color);"><code>\${JSON.stringify(result.data, null, 2)}</code></pre>
                </div>
            \`;

            resultCard.style.display = 'block';
        }
    }

    hideResults() {
        const resultCard = document.getElementById('resultCard');
        if (resultCard) {
            resultCard.style.display = 'none';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(message, type = 'info') {
        // 简单的提示实现
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const toast = document.createElement('div');
        toast.className = \`alert \${alertClass} alert-dismissible fade show position-fixed\`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = \`
            \${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        \`;

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
    window.${englishName}Manager = new ${englishName.charAt(0).toUpperCase() + englishName.slice(1)}Manager();
});
`
};

// 主要功能函数
async function createTool(chineseName, englishName, icon = 'bi-tools', overwrite = false, templateType = 'enhanced') {
    console.log(`🚀 开始创建工具: ${chineseName} (${englishName})`);

    // 根据模板类型选择对应的模板
    const viewTemplate = templateType === 'basic' ? templates.viewBasic : templates.viewEnhanced;
    const clientScriptTemplate = templateType === 'basic' ? templates.clientScriptBasic : templates.clientScriptEnhanced;

    console.log(`📄 使用模板类型: ${templateType === 'basic' ? '基础模板' : '增强版模板'}`);

    try {
        // 1. 创建路由文件
        await createFile(`routes/${englishName}.js`, templates.route(englishName, chineseName), overwrite);
        console.log(`✅ 创建路由文件: routes/${englishName}.js`);

        // 2. 创建服务文件
        await createFile(`services/${englishName}Service.js`, templates.service(englishName, chineseName), overwrite);
        console.log(`✅ 创建服务文件: services/${englishName}Service.js`);

        // 3. 创建页面模板
        await createFile(`views/${englishName}.ejs`, viewTemplate(englishName, chineseName), overwrite);
        console.log(`✅ 创建页面模板: views/${englishName}.ejs`);

        // 4. 创建前端JS
        await createFile(`public/js/${englishName}.js`, clientScriptTemplate(englishName, chineseName), overwrite);
        console.log(`✅ 创建前端脚本: public/js/${englishName}.js`);

        // 5. 修改主应用
        await updateAppJs(englishName, chineseName);
        console.log(`✅ 更新主应用: app.js`);

        // 6. 修改侧边栏
        await updateSidebar(englishName, chineseName, icon);
        console.log(`✅ 更新侧边栏: views/partials/sidebar.ejs`);

        console.log(`🎉 工具创建完成！`);
        console.log(`📍 访问地址: http://localhost:3000/${englishName}`);
        console.log(`📝 请重启应用以加载新工具`);

    } catch (error) {
        console.error('❌ 创建工具失败:', error);
        process.exit(1);
    }
}

async function createFile(filePath, content, overwrite = false) {
    const fullPath = path.resolve(filePath);
    const dir = path.dirname(fullPath);

    // 确保目录存在
    await fs.mkdir(dir, { recursive: true });

    // 检查文件是否已存在
    try {
        await fs.access(fullPath);
        if (!overwrite) {
            throw new Error(`文件已存在: ${filePath}，使用 --overwrite 参数强制覆盖`);
        } else {
            console.log(`⚠️  覆盖现有文件: ${filePath}`);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }

    // 创建文件
    await fs.writeFile(fullPath, content, 'utf8');
}

async function updateAppJs(englishName, chineseName) {
    const appJsPath = path.resolve('app.js');
    let content = await fs.readFile(appJsPath, 'utf8');

    // 添加路由导入
    const importLine = `const ${englishName}Router = require('./routes/${englishName}');`;
    const importRegex = /const apiRouter = require\('\.\/routes\/api'\);/;

    if (!content.includes(importLine)) {
        content = content.replace(importRegex, `const apiRouter = require('./routes/api');\n${importLine}`);
    }

    // 添加路由使用
    const useLine = `app.use('/${englishName}', ${englishName}Router);`;
    const useRegex = /app\.use\('\/api', apiRouter\);/;

    if (!content.includes(useLine)) {
        content = content.replace(useRegex, `app.use('/api', apiRouter);\n${useLine}`);
    }

    await fs.writeFile(appJsPath, content, 'utf8');
}

async function updateSidebar(englishName, chineseName, icon) {
    const sidebarPath = path.resolve('views/partials/sidebar.ejs');
    let content = await fs.readFile(sidebarPath, 'utf8');

    // 创建新的导航项
    const navItem = `        <li class="nav-item">
            <a class="nav-link d-flex align-items-center" href="/${englishName}" id="nav-${englishName}">
                <i class="bi ${icon} me-2"></i>
                <span class="nav-link-text">${chineseName}</span>
            </a>
        </li>`;

    // 在API文档之前插入新导航项 - 修正正则表达式
    const insertRegex = /(\s+<li class="nav-item">\s+<a class="nav-link d-flex align-items-center" href="\/api")/;

    if (!content.includes(`href="/${englishName}"`)) {
        content = content.replace(insertRegex, `${navItem}\n        $1`);

        // 更新导航高亮脚本 - 修正正则表达式
        const scriptRegex = /(currentPath\.startsWith\('\/rename'\) && href === '\/rename'\) \|\|)/;
        const newCondition = `(currentPath.startsWith('/${englishName}') && href === '/${englishName}') ||`;

        if (!content.includes(`currentPath.startsWith('/${englishName}')`)) {
            content = content.replace(scriptRegex, `$1\n            ${newCondition}`);
        }
    }

    await fs.writeFile(sidebarPath, content, 'utf8');
}

// 命令行参数处理
if (require.main === module) {
    const args = process.argv.slice(2);

    // 检查是否有覆盖参数
    const overwriteIndex = args.indexOf('--overwrite');
    const overwrite = overwriteIndex !== -1;
    if (overwrite) {
        args.splice(overwriteIndex, 1); // 移除--overwrite参数
    }

    // 检查模板类型参数
    let templateType = 'enhanced'; // 默认使用增强版模板
    const templateIndex = args.findIndex(arg => arg.startsWith('--template='));
    if (templateIndex !== -1) {
        templateType = args[templateIndex].split('=')[1];
        args.splice(templateIndex, 1); // 移除--template参数
    }

    if (args.length < 2) {
        console.log('用法: node scripts/create-tool.js <中文名> <英文名> [图标] [--template=类型] [--overwrite]');
        console.log('示例: node scripts/create-tool.js "开发工具" devtools bi-code-slash --template=enhanced');
        console.log('选项:');
        console.log('  --template=basic     使用基础模板（简洁版）');
        console.log('  --template=enhanced  使用增强版模板（默认，包含文件处理功能）');
        console.log('  --overwrite          强制覆盖现有文件');
        process.exit(1);
    }

    const [chineseName, englishName, icon] = args;

    // 验证英文名格式
    if (!/^[a-z][a-z0-9]*$/.test(englishName)) {
        console.error('❌ 英文名只能包含小写字母和数字，且必须以字母开头');
        process.exit(1);
    }

    createTool(chineseName, englishName, icon, overwrite, templateType);
}

module.exports = { createTool, templates };
