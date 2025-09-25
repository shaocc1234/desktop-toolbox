// public/js/rename.js - 智能文件重命名前端脚本

class SmartRenameManager {
    constructor() {
        this.isElectronApp = false;
        this.selectedFolder = null;
        this.scannedFiles = [];
        this.filteredFiles = [];
        this.currentFilter = 'all';
        this.renameResults = [];
        this.apiKey = '';
        this.selectedModel = 'chat:Pro/deepseek-ai/DeepSeek-V3';
        this.isProcessing = false;

        // 多AI配置
        this.multiAIConfig = {
            enabled: false,
            apiKeys: {},
            priorities: {
                chat: [],
                vision: []
            }
        };

        // 全局配置
        this.globalConfig = {
            siliconflow: '',
            doubao: '',
            deepseek: ''
        };

        // 可用模型配置
        this.availableModels = {
            siliconflow: {
                name: '硅基流动',
                chat: [
                    { id: 'Pro/deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (高性能)', performance: 'high', speed: 'medium' },
                    { id: 'Pro/deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (推理)', performance: 'very_high', speed: 'slow' },
                    { id: 'Qwen/Qwen2.5-72B-Instruct-128K', name: 'Qwen 2.5 72B (推荐)', performance: 'high', speed: 'medium', recommended: true },
                    { id: 'Qwen/Qwen3-30B-A3B', name: 'Qwen 3 30B A3B (快速)', performance: 'medium', speed: 'fast' },
                    { id: 'Qwen/Qwen3-Next-80B-A3B-Instruct', name: 'Qwen 3 Next 80B A3B (指令)', performance: 'high', speed: 'very_fast', recommended: true }
                ],
                vision: [
                    { id: 'Qwen/Qwen2.5-VL-32B-Instruct', name: 'Qwen 2.5 VL 32B (视觉)', performance: 'high', speed: 'medium' }
                ]
            },
            doubao: {
                name: '豆包',
                chat: [
                    { id: 'doubao-seed-1-6-thinking-250615', name: '豆包1.6 Thinking', performance: 'high', speed: 'slow' }
                ],
                vision: [
                    { id: 'doubao-seed-1-6-flash-250615', name: '豆包1.6 Flash', performance: 'medium', speed: 'very_fast', recommended: true }
                ]
            },
            deepseek: {
                name: 'DeepSeek',
                chat: [
                    { id: 'deepseek-chat', name: 'DeepSeek Chat (官方)', performance: 'high', speed: 'medium' },
                    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (官方推理)', performance: 'very_high', speed: 'medium' }
                ],
                vision: []
            }
        };

        this.init();
    }

    async init() {
        console.log('智能文件重命名管理器初始化...');

        // 检查Electron环境
        await this.checkElectronEnvironment();

        // 绑定事件
        this.bindEvents();

        // 加载保存的API配置
        this.loadApiConfig();

        // 初始化多AI配置
        this.initMultiAIConfig();

        // 监听全局配置更新
        this.setupGlobalConfigListener();

        // 加载全局配置
        this.loadGlobalConfig();

        // 初始化界面状态
        this.initializeUI();

        // 添加Electron桌面应用特性
        this.setupElectronFeatures();

        console.log('智能文件重命名管理器初始化完成');
    }

    // 设置全局配置监听器
    setupGlobalConfigListener() {
        // 监听全局AI配置更新事件
        window.addEventListener('globalAIConfigUpdated', (event) => {
            console.log('🔄 收到全局AI配置更新:', event.detail);
            this.globalConfig = { ...this.globalConfig, ...event.detail };
            this.updateAPIKeysFromGlobalConfig();
        });
    }

    // 加载全局配置
    loadGlobalConfig() {
        try {
            const saved = localStorage.getItem('globalAIConfig');
            if (saved) {
                this.globalConfig = { ...this.globalConfig, ...JSON.parse(saved) };
                this.updateAPIKeysFromGlobalConfig();
                console.log('✅ 全局配置加载成功:', this.globalConfig);
            }
        } catch (error) {
            console.error('❌ 全局配置加载失败:', error);
        }
    }

    // 根据全局配置更新API Keys
    updateAPIKeysFromGlobalConfig() {
        // 更新多AI配置中的API Keys
        if (this.globalConfig.siliconflow) {
            this.multiAIConfig.apiKeys.siliconflow = this.globalConfig.siliconflow;
        }
        if (this.globalConfig.doubao) {
            this.multiAIConfig.apiKeys.doubao = this.globalConfig.doubao;
        }
        if (this.globalConfig.deepseek) {
            this.multiAIConfig.apiKeys.deepseek = this.globalConfig.deepseek;
        }

        // 如果当前是单一服务商模式，也更新对应的API Key
        if (!this.multiAIConfig.enabled) {
            const currentModel = this.selectedModel;
            if (currentModel.includes('siliconflow') || currentModel.includes('Qwen') || currentModel.includes('Pro/deepseek')) {
                this.apiKey = this.globalConfig.siliconflow || '';
            } else if (currentModel.includes('doubao')) {
                this.apiKey = this.globalConfig.doubao || '';
            } else if (currentModel.includes('deepseek-chat')) {
                this.apiKey = this.globalConfig.deepseek || '';
            }
        }

        // 更新界面显示
        this.updateAPIKeyDisplay();

        console.log('🔑 API Keys已从全局配置更新');
    }

    // 更新API Key显示
    updateAPIKeyDisplay() {
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput && this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }
    }

    // 初始化多AI配置
    async initMultiAIConfig() {
        // 先尝试从数据库加载配置
        const loadedFromDB = await this.loadModelPrioritiesFromDatabase();

        // 如果数据库中没有配置，则从localStorage加载
        if (!loadedFromDB) {
            this.loadMultiAIConfig();
        }

        // 绑定配置模式切换事件
        const singleAIRadio = document.getElementById('singleAI');
        const multiAIRadio = document.getElementById('multiAI');

        if (singleAIRadio && multiAIRadio) {
            singleAIRadio.addEventListener('change', () => {
                if (singleAIRadio.checked) {
                    this.switchToSingleAI();
                }
            });

            multiAIRadio.addEventListener('change', () => {
                if (multiAIRadio.checked) {
                    this.switchToMultiAI();
                }
            });
        }

        // 绑定API密钥显示/隐藏事件
        document.querySelectorAll('.toggle-key').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group').querySelector('input');
                const icon = e.target.querySelector('i') || e.target;

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'bi bi-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'bi bi-eye';
                }
            });
        });

        // 初始化模型优先级列表
        if (loadedFromDB) {
            // 如果从数据库加载了配置，更新UI显示
            this.updateModelPriorityUI();
        } else {
            // 如果没有从数据库加载配置，初始化默认列表
            this.initModelPriorityLists();
        }

        // 为API密钥输入框添加自动保存事件监听器
        this.setupAPIKeyAutoSave();
    }

    // 为API密钥输入框设置自动保存
    setupAPIKeyAutoSave() {
        const apiKeyInputs = ['siliconflowKey', 'doubaoKey', 'deepseekKey'];

        apiKeyInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // 监听输入变化事件
                input.addEventListener('input', () => {
                    // 延迟保存，避免频繁保存
                    clearTimeout(this.saveTimeout);
                    this.saveTimeout = setTimeout(() => {
                        this.saveMultiAIConfig();
                        console.log(`🔑 自动保存API密钥: ${inputId}`);
                    }, 1000); // 1秒延迟
                });

                // 监听失去焦点事件，立即保存
                input.addEventListener('blur', () => {
                    clearTimeout(this.saveTimeout);
                    this.saveMultiAIConfig();
                    console.log(`🔑 保存API密钥: ${inputId}`);
                });
            }
        });
    }

    // 加载保存的多AI配置
    loadMultiAIConfig() {
        try {
            const savedConfig = localStorage.getItem('multi_ai_config');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);

                // 保留从数据库加载的优先级配置，只更新其他配置
                const currentPriorities = this.multiAIConfig.priorities;
                this.multiAIConfig = { ...parsedConfig };

                // 如果数据库中有优先级配置，则保留数据库的配置
                if (currentPriorities && (currentPriorities.chat.length > 0 || currentPriorities.vision.length > 0)) {
                    this.multiAIConfig.priorities = currentPriorities;
                    console.log('🔄 保留数据库中的模型优先级配置');
                }

                // 恢复API密钥
                if (this.multiAIConfig.apiKeys) {
                    Object.entries(this.multiAIConfig.apiKeys).forEach(([provider, key]) => {
                        const input = document.getElementById(`${provider}Key`);
                        if (input && key) {
                            input.value = key;
                        }
                    });
                }

                // 恢复配置模式
                if (this.multiAIConfig.enabled) {
                    const multiAIRadio = document.getElementById('multiAI');
                    if (multiAIRadio) {
                        multiAIRadio.checked = true;
                        this.switchToMultiAI();
                    }
                }
            }
        } catch (error) {
            console.error('加载多AI配置失败:', error);
        }
    }

    // 保存多AI配置
    saveMultiAIConfig() {
        try {
            // 从全局配置中获取API密钥，而不是从当前页面的输入框
            // 因为API密钥配置在全局设置页面，不在重命名页面
            this.multiAIConfig.apiKeys = {
                siliconflow: this.globalConfig.siliconflow || '',
                doubao: this.globalConfig.doubao || '',
                deepseek: this.globalConfig.deepseek || ''
            };

            // 调试日志：显示全局配置和收集到的API密钥
            console.log('🌍 全局配置内容:', {
                hasGlobalConfig: !!this.globalConfig,
                globalConfigKeys: this.globalConfig ? Object.keys(this.globalConfig) : [],
                siliconflowInGlobal: this.globalConfig?.siliconflow ? 'exists' : 'missing',
                doubaoInGlobal: this.globalConfig?.doubao ? 'exists' : 'missing',
                deepseekInGlobal: this.globalConfig?.deepseek ? 'exists' : 'missing'
            });

            console.log('🔑 收集API密钥 (从全局配置):', {
                siliconflow: this.multiAIConfig.apiKeys.siliconflow ?
                    this.multiAIConfig.apiKeys.siliconflow.substring(0, 12) + '...' : 'empty',
                doubao: this.multiAIConfig.apiKeys.doubao ?
                    this.multiAIConfig.apiKeys.doubao.substring(0, 12) + '...' : 'empty',
                deepseek: this.multiAIConfig.apiKeys.deepseek ?
                    this.multiAIConfig.apiKeys.deepseek.substring(0, 12) + '...' : 'empty',
                doubaoLength: this.multiAIConfig.apiKeys.doubao ? this.multiAIConfig.apiKeys.doubao.length : 0,
                doubaoFull: this.multiAIConfig.apiKeys.doubao || 'EMPTY'
            });

            // 保存到localStorage（向后兼容）
            localStorage.setItem('multi_ai_config', JSON.stringify(this.multiAIConfig));

            // 保存到数据库
            this.saveModelPrioritiesToDatabase();
        } catch (error) {
            console.error('保存多AI配置失败:', error);
        }
    }

    // 切换到单一AI模式
    switchToSingleAI() {
        this.multiAIConfig.enabled = false;
        document.getElementById('singleAIConfig').style.display = 'block';
        document.getElementById('multiAIConfig').style.display = 'none';
        this.saveMultiAIConfig();
    }

    // 切换到多AI模式
    switchToMultiAI() {
        this.multiAIConfig.enabled = true;
        document.getElementById('singleAIConfig').style.display = 'none';
        document.getElementById('multiAIConfig').style.display = 'block';
        this.saveMultiAIConfig();
    }

    // 初始化模型优先级列表
    initModelPriorityLists() {
        this.initModelPriorityList('chat');
        this.initModelPriorityList('vision');
    }

    // 初始化单个模型优先级列表
    initModelPriorityList(type) {
        const container = document.getElementById(`${type}ModelPriorities`);
        if (!container) return;

        container.innerHTML = '';

        // 为每个服务商创建模型选项
        Object.entries(this.availableModels).forEach(([provider, config]) => {
            if (config[type] && config[type].length > 0) {
                config[type].forEach(model => {
                    const item = this.createModelPriorityItem(provider, model, type);
                    container.appendChild(item);
                });
            }
        });

        // 使列表可排序
        this.makeSortable(container, type);
    }

    // 创建模型优先级项
    createModelPriorityItem(provider, model, type) {
        const item = document.createElement('div');
        item.className = 'model-priority-compact-item';
        item.draggable = true;
        item.dataset.provider = provider;
        item.dataset.model = model.id;
        item.dataset.type = type;

        const providerConfig = this.availableModels[provider];

        // 获取性能和速度标识
        const performanceBadge = this.getPerformanceBadge(model.performance);
        const speedBadge = this.getSpeedBadge(model.speed);
        const recommendedBadge = model.recommended ? '<span class="badge bg-warning text-dark ms-1">⭐</span>' : '';

        item.innerHTML = `
            <div class="d-flex align-items-center w-100">
                <i class="bi bi-grip-vertical text-muted me-2" style="cursor: grab;"></i>
                <div class="form-check me-2">
                    <input class="form-check-input" type="checkbox"
                           id="${provider}_${model.id.replace(/[^a-zA-Z0-9]/g, '_')}_${type}">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <span class="fw-medium">${model.name}</span>
                        ${recommendedBadge}
                        ${performanceBadge}
                        ${speedBadge}
                    </div>
                    <small class="text-muted">${providerConfig.name}</small>
                </div>
            </div>
        `;

        return item;
    }

    // 获取性能标识
    getPerformanceBadge(performance) {
        const badges = {
            'very_high': '<span class="badge bg-success ms-1">极高</span>',
            'high': '<span class="badge bg-info ms-1">高</span>',
            'medium': '<span class="badge bg-secondary ms-1">中</span>',
            'low': '<span class="badge bg-light text-dark ms-1">低</span>'
        };
        return badges[performance] || '';
    }

    // 获取速度标识
    getSpeedBadge(speed) {
        const badges = {
            'very_fast': '<span class="badge bg-success ms-1">极快</span>',
            'fast': '<span class="badge bg-info ms-1">快</span>',
            'medium': '<span class="badge bg-secondary ms-1">中速</span>',
            'slow': '<span class="badge bg-warning ms-1">慢</span>'
        };
        return badges[speed] || '';
    }

    // 获取当前使用的模型信息
    getCurrentModelInfo() {
        if (this.multiAIConfig.enabled) {
            return '多AI智能重试模式';
        } else {
            // 单一模型模式
            const modelSelect = document.getElementById('aiModel');
            if (modelSelect && modelSelect.value) {
                const selectedValue = modelSelect.value;

                // 解析模型类型和名称
                if (selectedValue.startsWith('chat:')) {
                    const modelName = selectedValue.replace('chat:', '');
                    return this.getModelDisplayName(modelName, 'chat');
                } else if (selectedValue.startsWith('vision:')) {
                    const modelName = selectedValue.replace('vision:', '');
                    return this.getModelDisplayName(modelName, 'vision');
                } else if (selectedValue.startsWith('embedding:')) {
                    const modelName = selectedValue.replace('embedding:', '');
                    return this.getModelDisplayName(modelName, 'embedding');
                } else {
                    return this.getModelDisplayName(selectedValue, 'chat');
                }
            }
            return '默认模型';
        }
    }

    // 获取模型显示名称
    getModelDisplayName(modelId, type) {
        // 查找模型配置
        for (const [provider, config] of Object.entries(this.availableModels)) {
            const models = config[type] || config.chat || [];
            const model = models.find(m => m.id === modelId);
            if (model) {
                return `${model.name} (${config.name})`;
            }
        }

        // 如果找不到，返回简化的显示名称
        if (modelId.includes('DeepSeek')) {
            return 'DeepSeek (深度求索)';
        } else if (modelId.includes('Qwen')) {
            return 'Qwen (通义千问)';
        } else if (modelId.includes('doubao')) {
            return 'Doubao (豆包)';
        }

        return modelId;
    }

    // 使列表可排序
    makeSortable(container, type) {
        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            draggedElement = e.target.closest('.model-priority-compact-item');
            if (draggedElement) {
                draggedElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetElement = e.target.closest('.model-priority-compact-item');

            if (targetElement && draggedElement && targetElement !== draggedElement) {
                const rect = targetElement.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;

                if (e.clientY < midpoint) {
                    container.insertBefore(draggedElement, targetElement);
                } else {
                    container.insertBefore(draggedElement, targetElement.nextSibling);
                }

                this.updateModelPriorities(type);
            }
        });
    }

    // 更新模型优先级
    updateModelPriorities(type) {
        const container = document.getElementById(`${type}ModelPriorities`);
        const items = container.querySelectorAll('.model-priority-compact-item');

        this.multiAIConfig.priorities[type] = [];

        items.forEach((item, index) => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                // 获取模型显示名称
                const modelName = this.getModelNameById(item.dataset.provider, item.dataset.model, type);

                this.multiAIConfig.priorities[type].push({
                    provider: item.dataset.provider,
                    model: item.dataset.model,
                    modelName: modelName,
                    priority: index + 1,
                    enabled: true
                });
            }
        });

        this.saveMultiAIConfig();
    }

    // 根据provider和model ID获取模型名称
    getModelNameById(provider, modelId, type) {
        const providerConfig = this.availableModels[provider];
        if (!providerConfig) return modelId;

        const models = providerConfig[type] || providerConfig.chat || [];
        const model = models.find(m => m.id === modelId);
        return model ? model.name : modelId;
    }

    // 保存模型优先级到数据库
    async saveModelPrioritiesToDatabase() {
        // 防止重复保存
        if (this._savingToDatabase) {
            console.log('⏳ 正在保存中，跳过重复保存');
            return;
        }

        this._savingToDatabase = true;

        try {
            // 保存对话模型优先级
            if (this.multiAIConfig.priorities.chat && this.multiAIConfig.priorities.chat.length > 0) {
                await this.saveModelPriorityToDatabase('chat', this.multiAIConfig.priorities.chat);
            }

            // 保存视觉模型优先级
            if (this.multiAIConfig.priorities.vision && this.multiAIConfig.priorities.vision.length > 0) {
                await this.saveModelPriorityToDatabase('vision', this.multiAIConfig.priorities.vision);
            }

            console.log('✅ 模型优先级配置已保存到数据库');
        } catch (error) {
            console.error('❌ 保存模型优先级到数据库失败:', error);
        } finally {
            this._savingToDatabase = false;
        }
    }

    // 保存单个类型的模型优先级到数据库
    async saveModelPriorityToDatabase(configType, priorities) {
        try {
            const response = await fetch('/rename/api/model-priorities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    configType,
                    priorities
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }

            console.log(`✅ ${configType}模型优先级已保存到数据库`);
        } catch (error) {
            console.error(`❌ 保存${configType}模型优先级到数据库失败:`, error);
            throw error;
        }
    }

    // 从数据库加载模型优先级配置
    async loadModelPrioritiesFromDatabase() {
        try {
            const response = await fetch('/rename/api/model-priorities');
            const result = await response.json();

            if (result.success && result.data) {
                // 更新内存中的配置
                this.multiAIConfig.priorities = {
                    chat: result.data.chat || [],
                    vision: result.data.vision || []
                };

                // 更新UI显示
                this.updateModelPriorityUI();

                console.log('✅ 从数据库加载模型优先级配置成功', this.multiAIConfig.priorities);
                return true;
            } else {
                console.log('📝 数据库中没有找到模型优先级配置，使用默认配置');
                return false;
            }
        } catch (error) {
            console.error('❌ 从数据库加载模型优先级配置失败:', error);
            return false;
        }
    }

    // 更新模型优先级UI显示
    updateModelPriorityUI() {
        ['chat', 'vision'].forEach(type => {
            const container = document.getElementById(`${type}ModelPriorities`);
            if (!container) return;

            const priorities = this.multiAIConfig.priorities[type] || [];

            // 清空现有内容
            container.innerHTML = '';

            // 1. 先显示已配置的模型（按优先级排序）
            priorities.forEach(priority => {
                const providerConfig = this.availableModels[priority.provider];
                if (!providerConfig) return;

                const models = providerConfig[type] || providerConfig.chat || [];
                const model = models.find(m => m.id === priority.model);
                if (!model) return;

                const item = this.createModelPriorityItem(priority.provider, model, type);

                // 设置选中状态
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = priority.enabled !== false;
                }

                container.appendChild(item);
            });

            // 2. 再显示未配置的模型（显示在底部，默认未选中）
            this.addUnconfiguredModels(container, type, priorities);

            // 重新绑定拖拽事件
            this.makeSortable(container, type);
        });
    }

    // 添加未配置的模型到列表底部
    addUnconfiguredModels(container, type, configuredPriorities) {
        // 获取已配置的模型ID列表
        const configuredModelIds = configuredPriorities.map(p => p.model);

        // 收集所有未配置的模型
        const unconfiguredModels = [];

        Object.entries(this.availableModels).forEach(([provider, config]) => {
            const models = config[type] || (type === 'chat' ? config.chat : []);

            models.forEach(model => {
                // 如果模型未配置，则添加到未配置列表
                if (!configuredModelIds.includes(model.id)) {
                    unconfiguredModels.push({ provider, model });
                }
            });
        });

        // 如果有未配置的模型且已配置的模型不为空，添加分隔线
        if (unconfiguredModels.length > 0 && configuredPriorities.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'model-priority-separator';
            container.appendChild(separator);
        }

        // 添加未配置的模型
        unconfiguredModels.forEach(({ provider, model }) => {
            const item = this.createModelPriorityItem(provider, model, type);

            // 设置为未选中状态
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = false;

                // 监听复选框变化，选中时自动添加到配置中
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.addModelToConfiguration(provider, model, type);
                    } else {
                        this.removeModelFromConfiguration(provider, model.id, type);
                    }
                });
            }

            // 添加未配置样式
            item.classList.add('unconfigured-model');

            container.appendChild(item);
        });
    }

    // 添加模型到配置中
    addModelToConfiguration(provider, model, type) {
        if (!this.multiAIConfig.priorities[type]) {
            this.multiAIConfig.priorities[type] = [];
        }

        // 检查是否已存在
        const exists = this.multiAIConfig.priorities[type].some(p => p.model === model.id);
        if (exists) return;

        // 添加到配置末尾
        const priority = this.multiAIConfig.priorities[type].length + 1;
        this.multiAIConfig.priorities[type].push({
            provider: provider,
            model: model.id,
            modelName: model.name,
            priority: priority,
            enabled: true
        });

        // 保存配置并更新UI
        this.saveMultiAIConfig();
        this.updateModelPriorityUI();

        console.log(`✅ 已添加模型到${type}配置:`, model.name);
    }

    // 从配置中移除模型
    removeModelFromConfiguration(provider, modelId, type) {
        if (!this.multiAIConfig.priorities[type]) return;

        // 移除模型
        this.multiAIConfig.priorities[type] = this.multiAIConfig.priorities[type].filter(p => p.model !== modelId);

        // 重新排序优先级
        this.multiAIConfig.priorities[type].forEach((priority, index) => {
            priority.priority = index + 1;
        });

        // 保存配置并更新UI
        this.saveMultiAIConfig();
        this.updateModelPriorityUI();

        console.log(`❌ 已从${type}配置中移除模型:`, modelId);
    }

    // 加载保存的API配置
    loadApiConfig() {
        try {
            const savedKey = localStorage.getItem('rename_api_key');
            const savedModel = localStorage.getItem('rename_ai_model');

            if (savedKey) {
                this.apiKey = savedKey;
                const apiKeyInput = document.getElementById('apiKey');
                if (apiKeyInput) {
                    apiKeyInput.value = savedKey;
                }
            }

            if (savedModel) {
                this.selectedModel = savedModel;
                const aiModelSelect = document.getElementById('aiModel');
                if (aiModelSelect) {
                    aiModelSelect.value = savedModel;
                }
            }
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }

    // 保存API密钥
    saveApiKey(apiKey) {
        try {
            localStorage.setItem('rename_api_key', apiKey);
            this.apiKey = apiKey;
            this.updateButtonStates();
        } catch (error) {
            console.error('保存API密钥失败:', error);
        }
    }

    // 保存AI模型选择
    saveAiModel(model) {
        try {
            localStorage.setItem('rename_ai_model', model);
            this.selectedModel = model;
        } catch (error) {
            console.error('保存AI模型失败:', error);
        }
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

    initializeUI() {
        // 初始化界面状态
        this.updateFolderInfo();
        this.updateButtonStates();
        this.updateFileTypeFilters(); // 初始化筛选按钮（显示空状态）
        this.bindFilterEvents();
    }

    setupElectronFeatures() {
        if (!this.isElectronApp) return;

        // 添加快捷键支持
        this.setupKeyboardShortcuts();

        // 设置窗口标题
        this.updateWindowTitle();

        // 显示快捷键提示
        this.showKeyboardShortcutsInfo();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + O: 选择文件夹
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.selectFolder();
            }

            // Ctrl/Cmd + R: 开始重命名
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                if (!document.getElementById('startRenameBtn')?.disabled) {
                    this.startRename();
                }
            }

            // Ctrl/Cmd + P: 预览重命名
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                if (!document.getElementById('previewBtn')?.disabled) {
                    this.previewRename();
                }
            }

            // Ctrl/Cmd + Shift + C: 清空所有
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.clearAll();
            }

            // F5: 刷新文件列表
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshFileList();
            }
        });
    }

    updateWindowTitle(status = '') {
        if (this.isElectronApp) {
            let title = '智能文件重命名';
            if (this.selectedFolder) {
                const folderName = this.selectedFolder.split('/').pop() || this.selectedFolder.split('\\').pop();
                title += ` - ${folderName}`;
            }
            if (status) {
                title += ` - ${status}`;
            }
            document.title = title;
        }
    }

    showKeyboardShortcutsInfo() {
        // 在页面底部显示快捷键提示
        const shortcutsInfo = document.createElement('div');
        shortcutsInfo.className = 'position-fixed bottom-0 end-0 p-2 text-muted small';
        shortcutsInfo.style.zIndex = '1000';
        shortcutsInfo.innerHTML = `
            <div class="bg-light p-2 rounded shadow-sm">
                <strong>快捷键:</strong>
                Ctrl+O(选择) | Ctrl+R(重命名) | Ctrl+P(预览) | F5(刷新) | Ctrl+Shift+M(模拟数据)
            </div>
        `;
        document.body.appendChild(shortcutsInfo);

        // 5秒后自动隐藏
        setTimeout(() => {
            if (shortcutsInfo.parentNode) {
                shortcutsInfo.parentNode.removeChild(shortcutsInfo);
            }
        }, 5000);
    }

    async checkElectronEnvironment() {
        // 检查是否在Electron环境中运行
        if (window.electronAPI) {
            try {
                this.isElectronApp = await window.electronAPI.isElectron();
                console.log('Ai 重命名 - Electron环境检测:', this.isElectronApp);
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

        // 按钮事件
        this.bindButtonEvents();

        // 筛选事件
        this.bindFilterEvents();

        // API配置事件
        this.bindApiConfigEvents();

        // 性能配置事件
        this.bindPerformanceConfigEvents();

        // 模型对比事件
        this.bindModelCompareEvents();
    }

    bindButtonEvents() {
        // 开始重命名按钮
        const startRenameBtn = document.getElementById('startRenameBtn');
        if (startRenameBtn) {
            startRenameBtn.addEventListener('click', () => this.startRename());
        }

        // 预览按钮
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewRename());
        }

        // 清空按钮
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        // 处理按钮事件 (旧版本兼容)
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processFiles());
        }

        // 命名模板变化事件
        const namingTemplate = document.getElementById('namingTemplate');
        if (namingTemplate) {
            namingTemplate.addEventListener('change', () => this.onTemplateChange());
        }

        // 应用全部按钮
        const applyAllBtn = document.getElementById('applyAllBtn');
        if (applyAllBtn) {
            applyAllBtn.addEventListener('click', () => this.applyAllRenames());
        }

        // 重新生成按钮
        const regenerateBtn = document.getElementById('regenerateBtn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => this.regenerateAllPreviews());
        }

        // 文件操作按钮事件委托
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.file-action-btn');
                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    const index = parseInt(actionBtn.dataset.index);

                    if (action === 'regenerate' || action === 'force-regenerate') {
                        this.regenerateSingleFile(index, action === 'force-regenerate');
                    } else if (action === 'apply') {
                        this.applySingleFile(index);
                    } else if (action === 'locate') {
                        this.locateFile(index);
                    }
                }
            });
        }
    }

    bindFilterEvents() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('刷新按钮被点击');
                this.refreshFileList();
            });
        }

        // 直接绑定筛选按钮事件
        this.bindFileTypeFilterButtons();
    }

    bindApiConfigEvents() {
        // API密钥输入事件
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.saveApiKey(e.target.value);
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
                this.saveAiModel(e.target.value);
            });
        }
    }

    bindPerformanceConfigEvents() {
        // 并发处理开关
        const enableConcurrencyCheckbox = document.getElementById('enableConcurrency');
        const performanceConfig = document.getElementById('performanceConfig');

        if (enableConcurrencyCheckbox && performanceConfig) {
            const togglePerformanceConfig = () => {
                if (enableConcurrencyCheckbox.checked) {
                    performanceConfig.style.display = 'block';
                } else {
                    performanceConfig.style.display = 'none';
                }
            };

            // 初始状态
            togglePerformanceConfig();

            // 监听变化
            enableConcurrencyCheckbox.addEventListener('change', togglePerformanceConfig);
        }

        // 并发级别选择提示
        const concurrencyLevel = document.getElementById('concurrencyLevel');
        if (concurrencyLevel) {
            concurrencyLevel.addEventListener('change', (e) => {
                const level = parseInt(e.target.value);
                let message = '';

                if (level <= 2) {
                    message = '保守模式：适合网络较慢或API配额有限的情况';
                } else if (level <= 3) {
                    message = '平衡模式：推荐设置，兼顾速度和稳定性';
                } else if (level <= 5) {
                    message = '激进模式：更快的处理速度，需要良好的网络环境';
                } else {
                    message = '极速模式：最快处理速度，消耗更多API配额';
                }

                console.log(`并发级别设置为 ${level}：${message}`);
            });
        }
    }

    onTemplateChange() {
        const template = document.getElementById('namingTemplate')?.value;
        const customPrompt = document.getElementById('customPrompt');

        if (!customPrompt) return;

        // 根据模板类型显示不同的提示
        if (template === 'custom') {
            customPrompt.placeholder = '请输入自定义命名规则，例如：{date}_{content}_{original}';
            customPrompt.required = true;
        } else {
            customPrompt.required = false;
            switch (template) {
                case 'semantic':
                    customPrompt.placeholder = '可选：补充语义分析的特殊要求';
                    break;
                case 'date_content':
                    customPrompt.placeholder = '可选：指定日期格式或内容提取重点';
                    break;
                case 'category_name':
                    customPrompt.placeholder = '可选：指定分类规则或命名偏好';
                    break;
                default:
                    customPrompt.placeholder = '可选：输入自定义提示词';
            }
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
                console.log(`"包含子文件夹"选项变更为: ${isChecked}`);

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
            e.dataTransfer.dropEffect = 'copy';
        });

        // 拖拽离开
        dropZone.addEventListener('dragleave', (e) => {
            // 只有当离开整个拖拽区域时才移除样式
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
                this.updateDropZoneUI('dragleave');
            }
        });

        // 文件放置 - 使用新的处理方法
        dropZone.addEventListener('drop', async (e) => {
            dropZone.classList.remove('drag-over');
            await this.handleFileDrop(e);
        });

        console.log('拖拽监听器设置完成');
    }

    // 处理文件拖拽 - 使用 webUtils.getPathForFile 解决 Electron v32+ 路径问题
    async handleFileDrop(e) {
        console.log('处理文件拖拽事件');

        const files = Array.from(e.dataTransfer.files);
        const items = Array.from(e.dataTransfer.items);

        if (files.length === 0) {
            this.showToast('没有检测到任何拖拽内容', 'warning');
            return;
        }

        this.updateDropZoneUI('processing');
        this.showDropProgress(0, '正在分析拖拽内容...');

        try {
            const allFiles = [];
            const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;

            console.log(`开始处理 ${files.length} 个拖拽项目，包含子文件夹: ${includeSubfolders}`);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const item = items[i];

                console.log(`处理项目 ${i + 1}/${files.length}: ${file.name} (大小: ${file.size})`);

                this.showDropProgress(
                    Math.round(((i + 1) / files.length) * 50),
                    `正在处理: ${file.name}`
                );

                // 获取文件的真实路径
                let filePath = await this.getFileRealPath(file);
                console.log(`文件 ${file.name} 的路径: ${filePath}`);

                // 多重方法判断是否为文件夹
                let isDirectory = false;
                let entry = null;

                // 方法1: 使用 webkitGetAsEntry API
                if (item && item.webkitGetAsEntry) {
                    entry = item.webkitGetAsEntry();
                    if (entry && entry.isDirectory) {
                        isDirectory = true;
                        console.log(`webkitGetAsEntry 检测: ${file.name} -> isDirectory: true`);
                    } else {
                        console.log(`webkitGetAsEntry 检测: ${file.name} -> entry: ${entry}, isDirectory: ${entry?.isDirectory}`);
                    }
                }

                // 方法2: 如果 webkitGetAsEntry 失败，使用传统判断方法
                if (!isDirectory) {
                    const traditionalCheck = !file.type && file.size <= 4096;
                    console.log(`传统方法检测: ${file.name} -> isDirectory: ${traditionalCheck} (type: "${file.type}", size: ${file.size})`);

                    // 方法3: 检查文件路径是否指向目录（通过路径特征判断）
                    const pathCheck = filePath && filePath !== file.name && !filePath.includes('.');
                    console.log(`路径特征检测: ${file.name} -> 路径: ${filePath}, 可能是目录: ${pathCheck}`);

                    // 综合判断：传统方法 + 路径特征
                    isDirectory = traditionalCheck || pathCheck;
                    console.log(`综合判断结果: ${file.name} -> isDirectory: ${isDirectory}`);
                }

                if (isDirectory) {
                    // 处理文件夹
                    console.log(`开始扫描文件夹: ${file.name} (包含子文件夹: ${includeSubfolders})`);
                    console.log(`文件夹完整路径: ${filePath}`);

                    if (entry && entry.isDirectory) {
                        // 使用 webkitGetAsEntry API 扫描
                        const folderFiles = await this.scanDirectoryWebkit(entry, includeSubfolders, entry.name, filePath);
                        allFiles.push(...folderFiles);
                        console.log(`文件夹 "${entry.name}" 扫描完成，找到 ${folderFiles.length} 个文件 (递归: ${includeSubfolders})`);
                    } else {
                        // webkitGetAsEntry 失败，尝试使用 Electron API 扫描
                        console.warn(`webkitGetAsEntry 失败，尝试使用 Electron API 扫描文件夹: ${file.name}`);
                        try {
                            const folderFiles = await this.scanFolderUsingElectronAPI(filePath, includeSubfolders);
                            allFiles.push(...folderFiles);
                            console.log(`文件夹 "${file.name}" (Electron API) 扫描完成，找到 ${folderFiles.length} 个文件 (递归: ${includeSubfolders})`);
                        } catch (error) {
                            console.error(`扫描文件夹 ${file.name} 失败:`, error);
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
                        // 标记这是通过拖拽获取的文件
                        isDragDropped: true,
                        hasRealPath: filePath !== file.name // 标记是否获取到了真实路径
                    };
                    allFiles.push(fileInfo);
                    console.log(`文件: ${fileInfo.name} (${fileInfo.path})`);
                }
            }

            console.log(`所有项目处理完成，总共找到 ${allFiles.length} 个文件`);

            if (allFiles.length > 0) {
                // 设置扫描到的文件
                this.scannedFiles = allFiles;
                this.filteredFiles = [...allFiles];

                // 更新界面
                this.updateFileList();
                this.updateStats();
                this.updateButtonStates();
                this.updateFolderInfo(`拖拽导入 - ${allFiles.length} 个文件`);

                this.showToast(`成功导入 ${allFiles.length} 个文件`, 'success');
                this.showDropProgress(100, '导入完成');

                // 2秒后隐藏进度
                setTimeout(() => {
                    this.hideDropProgress();
                    this.updateDropZoneUI('success');
                }, 2000);
            } else {
                this.showToast('没有找到可处理的文件', 'warning');
                this.hideDropProgress();
                this.updateDropZoneUI('error');
            }

        } catch (error) {
            console.error('处理拖拽失败:', error);
            this.showToast(`处理拖拽失败: ${error.message}`, 'error');
            this.hideDropProgress();
            this.updateDropZoneUI('error');
        }
    }

    // 获取文件的真实路径 - 兼容 Electron v32+ 和旧版本
    async getFileRealPath(file) {
        // 优先使用新的 webUtils API (Electron v32+)
        if (this.isElectronApp && window.electronAPI && window.electronAPI.getPathForFile) {
            try {
                const realPath = await window.electronAPI.getPathForFile(file);
                console.log(`webUtils.getPathForFile 成功: ${file.name} -> ${realPath}`);
                return realPath;
            } catch (error) {
                console.warn(`webUtils.getPathForFile 失败 (${file.name}):`, error);
            }
        }

        // 回退到旧的 file.path (Electron v31 及以下)
        if (file.path && file.path !== file.name) {
            console.log(`使用 file.path: ${file.name} -> ${file.path}`);
            return file.path;
        }

        // 最后回退到文件名
        console.log(`只能获取文件名: ${file.name}`);
        return file.name;
    }

    // WebKit 模式的文件夹扫描
    async scanDirectoryWebkit(entry, includeSubfolders = true, relativePath = '', absoluteBasePath = '') {
        const files = [];

        try {
            if (entry.isFile) {
                // 处理单个文件
                const file = await this.getFileFromEntry(entry);
                if (file) {
                    const relativeFilePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                    const absoluteFilePath = absoluteBasePath ? `${absoluteBasePath}/${entry.name}` : relativeFilePath;

                    const fileInfo = {
                        name: file.name,
                        path: absoluteFilePath, // 使用完整的绝对路径
                        size: file.size,
                        extension: this.getFileExtension(file.name),
                        relativePath: relativeFilePath, // 保留相对路径用于显示
                        directory: absoluteBasePath || relativePath || '',
                        modified: new Date(file.lastModified || Date.now()),
                        created: new Date(file.lastModified || Date.now()),
                        type: file.type || 'application/octet-stream',
                        file: file,
                        isDragDropped: true,
                        hasRealPath: Boolean(absoluteBasePath) // 如果有绝对基础路径，则标记为有真实路径
                    };
                    console.log(`文件: ${fileInfo.path} (相对路径: ${fileInfo.relativePath})`);
                    return [fileInfo];
                }
                return [];
            }

            if (entry.isDirectory) {
                // 处理文件夹
                const reader = entry.createReader();
                const entries = await this.readDirectoryEntries(reader);

                // 如果 absoluteBasePath 已经是完整路径，直接使用；否则构建路径
                const currentRelativePath = relativePath;
                const currentAbsolutePath = absoluteBasePath || currentRelativePath;
                console.log(`扫描目录: ${currentRelativePath} (${entries.length} 个子项目)`);
                console.log(`绝对路径: ${currentAbsolutePath}`);

                // 处理所有子项目
                for (const childEntry of entries) {
                    try {
                        if (childEntry.isFile) {
                            // 处理文件
                            const file = await this.getFileFromEntry(childEntry);
                            if (file) {
                                const relativeFilePath = `${currentRelativePath}/${childEntry.name}`;
                                const absoluteFilePath = `${currentAbsolutePath}/${childEntry.name}`;

                                const fileInfo = {
                                    name: file.name,
                                    path: absoluteFilePath, // 使用完整的绝对路径
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
                                console.log(`文件: ${fileInfo.path} (相对路径: ${fileInfo.relativePath})`);
                            }
                        } else if (childEntry.isDirectory && includeSubfolders) {
                            // 递归处理子文件夹
                            console.log(`递归扫描: ${childEntry.name}`);
                            const subRelativePath = `${currentRelativePath}/${childEntry.name}`;
                            const subAbsolutePath = `${currentAbsolutePath}/${childEntry.name}`;
                            const subFiles = await this.scanDirectoryWebkit(
                                childEntry,
                                includeSubfolders,
                                subRelativePath,
                                subAbsolutePath
                            );
                            files.push(...subFiles);
                        } else if (childEntry.isDirectory && !includeSubfolders) {
                            console.log(`跳过子文件夹: ${childEntry.name} (不包含子文件夹)`);
                        }
                    } catch (error) {
                        console.error(`处理 ${childEntry.name} 时出错:`, error);
                        // 继续处理其他项目
                    }
                }
            }
        } catch (error) {
            console.error(`扫描 ${entry.name} 时出错:`, error);
        }

        return files;
    }

    // 从 FileSystemEntry 获取 File 对象
    async getFileFromEntry(entry) {
        return new Promise((resolve, reject) => {
            if (entry.isFile) {
                entry.file((file) => {
                    resolve(file);
                }, (error) => {
                    console.error(`读取文件 ${entry.name} 失败:`, error);
                    reject(error);
                });
            } else {
                reject(new Error('Entry is not a file'));
            }
        });
    }

    // 读取目录条目的辅助方法
    async readDirectoryEntries(reader) {
        return new Promise((resolve, reject) => {
            reader.readEntries((entries) => {
                resolve(entries);
            }, (error) => {
                console.error('读取目录条目失败:', error);
                reject(error);
            });
        });
    }

    // 从路径获取目录部分
    getDirectoryFromPath(fullPath) {
        const lastSlash = fullPath.lastIndexOf('/');
        return lastSlash > 0 ? fullPath.substring(0, lastSlash) : '';
    }

    // 使用 Electron API 扫描文件夹（当 webkitGetAsEntry 失败时的备选方案）
    async scanFolderUsingElectronAPI(folderPath, includeSubfolders) {
        if (!this.isElectronApp || !window.electronAPI) {
            throw new Error('Electron API 不可用');
        }

        try {
            console.log(`使用 Electron API 扫描文件夹: ${folderPath}`);
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

                console.log(`Electron API 扫描结果: ${files.length} 个文件`);
                return files;
            } else {
                throw new Error(result.error || '扫描失败');
            }
        } catch (error) {
            console.error('Electron API 扫描失败:', error);
            throw error;
        }
    }

    // 获取文件扩展名
    getFileExtension(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return '';
        }
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
    }

    // 更新拖拽区域UI状态
    updateDropZoneUI(state) {
        const dropIcon = document.getElementById('dropIcon');
        const dropTitle = document.getElementById('dropTitle');
        const dropDescription = document.getElementById('dropDescription');

        if (!dropIcon || !dropTitle || !dropDescription) return;

        switch (state) {
            case 'dragenter':
                dropIcon.className = 'bi bi-cloud-arrow-down display-6 text-success mb-2';
                dropTitle.textContent = '释放以导入文件';
                dropDescription.innerHTML = '支持文件夹递归扫描，自动获取完整路径';
                break;

            case 'dragleave':
                dropIcon.className = 'bi bi-folder-plus display-6 text-primary mb-2';
                dropTitle.textContent = '拖拽文件或文件夹到此区域';
                dropDescription.innerHTML = '支持单个文件、多个文件或整个文件夹<br>自动扫描文件夹内容，获取完整路径用于重命名';
                break;

            case 'processing':
                dropIcon.className = 'bi bi-arrow-clockwise display-6 text-info mb-2';
                dropTitle.textContent = '正在处理文件...';
                dropDescription.innerHTML = '正在扫描文件夹内容，请稍等';
                break;

            case 'success':
                dropIcon.className = 'bi bi-check-circle display-6 text-success mb-2';
                dropTitle.textContent = '文件导入成功';
                dropDescription.innerHTML = '文件已成功导入，可以开始重命名操作';
                // 3秒后恢复默认状态
                setTimeout(() => {
                    this.updateDropZoneUI('default');
                }, 3000);
                break;

            case 'error':
                dropIcon.className = 'bi bi-exclamation-triangle display-6 text-danger mb-2';
                dropTitle.textContent = '处理失败';
                dropDescription.innerHTML = '文件处理失败，请重试或手动选择文件夹';
                // 5秒后恢复默认状态
                setTimeout(() => {
                    this.updateDropZoneUI('default');
                }, 5000);
                break;

            case 'default':
            default:
                dropIcon.className = 'bi bi-folder-plus display-6 text-primary mb-2';
                dropTitle.textContent = '拖拽文件或文件夹到此区域';
                dropDescription.innerHTML = '支持单个文件、多个文件或整个文件夹<br>自动扫描文件夹内容，获取完整路径用于重命名';
                break;
        }
    }

    // 显示拖拽进度
    showDropProgress(percent, text) {
        const dropProgress = document.getElementById('dropProgress');
        const dropProgressBar = document.getElementById('dropProgressBar');
        const dropProgressText = document.getElementById('dropProgressText');

        if (dropProgress && dropProgressBar && dropProgressText) {
            dropProgress.style.display = 'block';
            dropProgressBar.style.width = `${percent}%`;
            dropProgressText.textContent = text;
        }
    }

    // 隐藏拖拽进度
    hideDropProgress() {
        const dropProgress = document.getElementById('dropProgress');
        if (dropProgress) {
            dropProgress.style.display = 'none';
        }
    }

    async selectFolder() {
        if (this.isElectronApp && window.electronAPI) {
            try {
                const result = await window.electronAPI.selectFolder();
                if (result.success && result.folderPath) {
                    this.selectedFolder = result.folderPath;
                    this.updateFolderInfo();
                    this.updateButtonStates();

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

    async scanFolderFiles() {
        if (!this.selectedFolder) return;

        try {
            // 读取用户的"包含子文件夹"选项
            const includeSubfolders = document.getElementById('includeSubfolders')?.checked ?? true;

            this.showProgress(0, '正在扫描文件夹...');
            console.log(`扫描选择的文件夹: ${this.selectedFolder} (包含子文件夹: ${includeSubfolders})`);

            // 使用现有的扫描API，支持所有文件类型
            const result = await window.electronAPI.scanFolderGeneral(this.selectedFolder, {
                includeSubfolders: includeSubfolders, // 使用用户选择的选项
                fileTypes: 'all', // 扫描所有文件类型
                needProgress: false
            });

            if (result.success && result.files) {
                this.scannedFiles = result.files;
                this.filteredFiles = [...this.scannedFiles];
                this.updateFileTypeFilters(); // 根据实际文件生成筛选按钮
                this.updateFileList();
                this.showToast(`扫描完成，找到 ${result.files.length} 个文件`, 'success');
            } else {
                this.showToast('文件夹扫描失败', 'error');
            }
        } catch (error) {
            console.error('扫描文件夹错误:', error);
            this.showToast('扫描文件夹失败', 'error');
        } finally {
            this.hideProgress();
        }
    }

    updateFolderInfo() {
        const folderInfo = document.getElementById('folderInfo');
        if (folderInfo) {
            if (this.selectedFolder) {
                folderInfo.innerHTML = `
                    <i class="bi bi-check-circle-fill text-success me-1"></i>
                    已选择：${this.selectedFolder}
                `;
            } else {
                folderInfo.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    请选择包含需要重命名文件的文件夹
                `;
            }
        }
    }

    updateButtonStates() {
        const startRenameBtn = document.getElementById('startRenameBtn');
        const previewBtn = document.getElementById('previewBtn');
        const applyAllBtn = document.getElementById('applyAllBtn');
        const regenerateBtn = document.getElementById('regenerateBtn');

        const hasFiles = this.filteredFiles && this.filteredFiles.length > 0;
        const hasApiKey = this.apiKey && this.apiKey.trim().length > 0;
        const hasResults = this.renameResults && this.renameResults.length > 0;
        const hasValidResults = hasResults && this.renameResults.some(r => r.status === 'success' && r.newName);



        // 需要同时满足：有文件 + 有API密钥
        const canProcess = hasFiles && hasApiKey;

        if (startRenameBtn) startRenameBtn.disabled = !canProcess;
        if (previewBtn) previewBtn.disabled = !canProcess;

        // 应用全部按钮：需要有有效的重命名结果
        if (applyAllBtn) applyAllBtn.disabled = !hasValidResults;

        // 重新生成按钮：需要有结果（无论成功失败）
        if (regenerateBtn) regenerateBtn.disabled = !hasResults;

        // 更新提示信息
        if (!hasApiKey && hasFiles) {
            this.showToast('请先配置硅基流动API密钥', 'warning');
        }
    }

    updateFileList() {
        const fileProcessCard = document.getElementById('fileProcessCard');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        const emptyState = document.getElementById('emptyState');

        if (!this.filteredFiles || this.filteredFiles.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (fileList) fileList.innerHTML = '';
            if (fileCount) fileCount.textContent = '0';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (fileCount) fileCount.textContent = this.filteredFiles.length;

        // 渲染新的统一文件列表
        fileList.innerHTML = this.filteredFiles.map((file, index) => {

            // 检查是否有处理结果
            const result = this.renameResults?.[index]; // 使用索引匹配更准确
            const hasResult = result && (result.status === 'success' || result.status === 'error');

            return `
                <div class="file-process-item py-2 px-3" data-index="${index}" data-file-name="${file.name}">
                    <div class="d-flex align-items-start">
                        <div class="me-2 mt-1">
                            <i class="bi bi-check-circle-fill text-success"></i>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <!-- 原文件名 -->
                            <div class="mb-1">
                                <span class="text-muted">${file.name}</span>
                            </div>

                            <!-- 处理状态和结果 -->
                            <div class="processing-status" id="status-${index}">
                                ${hasResult ? this.renderSuccessResult(result) : this.renderPendingStatus()}
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div class="ms-2 flex-shrink-0">
                            ${hasResult ? this.renderFileActions(index, result) : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.updateButtonStates();
        this.updateStats();
    }

    // 更新单个文件的处理状态
    updateFileProcessingStatus(index, status, message, result = null) {
        const statusElement = document.getElementById(`status-${index}`);
        if (!statusElement) return;

        let statusHTML = '';

        switch (status) {
            case 'processing':
                statusHTML = `
                    <div class="text-muted small d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm text-success me-2" role="status" style="width: 16px; height: 16px;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        ${message}
                    </div>
                `;
                break;

            case 'success':
                // 检查是否为跳过的文件
                const isSkipped = result && result.skipped === true;
                // 检查新文件名是否与旧文件名相同
                const isSameName = result && result.originalName === result.newName;

                let statusClass = '';
                let statusIcon = '';
                let statusText = '';

                if (isSkipped) {
                    statusClass = 'bg-secondary bg-opacity-10 border border-secondary border-opacity-20';
                    statusIcon = '⏭️';
                    statusText = '已跳过';
                } else if (isSameName) {
                    statusClass = 'bg-info bg-opacity-20 border border-info border-opacity-50';
                    statusIcon = '🔄';
                    statusText = '名称未变';
                } else {
                    statusClass = '';
                    statusIcon = '✅';
                    statusText = '';
                }

                statusHTML = `
                    <!-- 新文件名单独显示，不在背景容器内 -->
                    <div class="mb-2 d-flex align-items-center">
                        ${statusIcon ? `<span class="me-2">${statusIcon}</span>` : ''}
                        <span class="fw-medium" style="color: #ffffff !important;">${message}</span>
                        ${statusText ? `<span class="badge bg-secondary ms-2 small">${statusText}</span>` : ''}
                    </div>

                    <!-- 特殊状态提示 -->
                    ${(isSkipped || isSameName) ? `
                    <div class="p-1 rounded mb-1 ${statusClass}">
                        ${isSkipped ? `
                            <div class="text-muted small opacity-75">
                                ${result.lastProcessed ? `上次处理: ${result.lastProcessed}` : '文件已处理过'}
                            </div>
                        ` : ''}
                        ${isSameName && !isSkipped ? `
                            <div class="text-muted small">
                                <strong>说明:</strong> AI分析后认为当前文件名已经合适，无需修改
                            </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- 置信度和分析信息在单独的背景容器内 -->
                    ${(result && (result.confidence || result.reasoning) && !isSkipped) ? `
                    <div class="suggested-name p-2 rounded bg-primary bg-opacity-10">
                        ${result.confidence ? `<div class="text-muted small mb-1">置信度: ${Math.round(result.confidence * 100)}%</div>` : ''}
                        ${result.reasoning ? `<div class="text-muted small opacity-75">${result.reasoning}</div>` : ''}
                    </div>
                    ` : ''}
                `;
                break;

            case 'error':
                statusHTML = `
                    <div class="text-danger small d-flex align-items-center">
                        <i class="bi bi-exclamation-circle-fill me-1"></i>
                        处理失败: ${message}
                    </div>
                `;
                break;
        }

        statusElement.innerHTML = statusHTML;

        // 更新文件项的样式
        const fileItem = statusElement.closest('.file-process-item');
        if (fileItem) {
            fileItem.classList.remove('processing', 'success', 'error');
            fileItem.classList.add(status);

            // 成功时将原文件名变灰
            if (status === 'success') {
                const originalNameElement = fileItem.querySelector('.fw-medium');
                if (originalNameElement) {
                    originalNameElement.classList.add('text-muted');
                }
            }

            // 动态更新操作按钮 - 关键修复！
            this.updateFileActionButtons(fileItem, index, status, result);
        }
    }

    // 渲染成功结果
    renderSuccessResult(result) {
        return `
            <!-- 新文件名单独显示，不在背景容器内 -->
            <div class="mb-2">
                <span class="fw-medium" style="color: #ffffff !important;">${result.newName}</span>
            </div>
            <!-- 置信度和分析信息在单独的背景容器内 -->
            ${(result.confidence || result.reasoning) ? `
            <div class="suggested-name p-2 rounded bg-primary bg-opacity-10">
                ${result.confidence ? `<div class="text-muted small mb-1">置信度: ${Math.round(result.confidence * 100)}%</div>` : ''}
                ${result.reasoning ? `<div class="text-muted small opacity-75">${result.reasoning}</div>` : ''}
            </div>
            ` : ''}
        `;
    }

    // 渲染待处理状态
    renderPendingStatus() {
        return `
            <div class="text-muted small">
                <i class="bi bi-clock me-1"></i>
                等待处理...
            </div>
        `;
    }

    // 动态更新文件操作按钮
    updateFileActionButtons(fileItem, index, status, result) {
        // 查找按钮容器（在文件项右侧）
        let actionContainer = fileItem.querySelector('.ms-2.flex-shrink-0');
        if (!actionContainer) {
            // 如果没有按钮容器，创建一个
            actionContainer = document.createElement('div');
            actionContainer.className = 'ms-2 flex-shrink-0';
            fileItem.querySelector('.d-flex.align-items-center').appendChild(actionContainer);
        }

        // 根据状态决定是否显示按钮
        if (status === 'success' || status === 'error') {
            // 有处理结果时显示按钮
            const actualResult = result || this.renameResults?.[index];
            actionContainer.innerHTML = this.renderFileActions(index, actualResult);
        } else {
            // 处理中或其他状态时隐藏按钮
            actionContainer.innerHTML = '';
        }
    }

    // 渲染文件操作按钮
    renderFileActions(index, result) {
        const isSuccess = result && result.status === 'success';
        const hasValidName = result && result.newName && result.newName.trim();

        return `
            <div class="btn-group btn-group-sm ms-2">
                <button class="btn btn-link text-info p-1 border-0 file-action-btn"
                        data-action="locate"
                        data-index="${index}"
                        title="查看文件位置"
                        style="background: none !important;">
                    <i class="bi bi-folder2-open"></i>
                </button>
                <button class="btn btn-link text-warning p-1 border-0 file-action-btn"
                        data-action="force-regenerate"
                        data-index="${index}"
                        title="强制重新生成（不跳过）"
                        style="background: none !important;">
                    <i class="bi bi-arrow-clockwise"></i>
                </button>
                ${isSuccess && hasValidName ? `
                <button class="btn btn-link text-success p-1 border-0 file-action-btn"
                        data-action="apply"
                        data-index="${index}"
                        title="应用重命名"
                        style="background: none !important;">
                    <i class="bi bi-check"></i>
                </button>
                ` : ''}
            </div>
        `;
    }

    // 更新统计信息
    updateStats() {
        const successCount = document.getElementById('successCount');
        const failureCount = document.getElementById('failureCount');
        const pendingCount = document.getElementById('pendingCount');
        const totalCount = document.getElementById('totalCount');
        const statsFooter = document.getElementById('statsFooter');

        if (!this.renameResults || this.renameResults.length === 0) {
            if (statsFooter) statsFooter.style.display = 'none';
            return;
        }

        // 计算统计数据
        const stats = this.renameResults.reduce((acc, result) => {
            if (result.status === 'success') acc.success++;
            else if (result.status === 'error') acc.failed++;
            return acc;
        }, { success: 0, failed: 0 });

        const pending = this.filteredFiles ? this.filteredFiles.length - this.renameResults.length : 0;
        const total = this.filteredFiles ? this.filteredFiles.length : 0;

        // 更新显示
        if (successCount) successCount.textContent = stats.success;
        if (failureCount) failureCount.textContent = stats.failed;
        if (pendingCount) pendingCount.textContent = pending;
        if (totalCount) totalCount.textContent = total;

        // 显示统计区域
        if (statsFooter && this.renameResults.length > 0) {
            statsFooter.style.display = 'block';
        }
    }

    // 根据实际载入的文件动态生成文件类型筛选按钮
    updateFileTypeFilters() {
        const container = document.getElementById('fileTypeFilters');
        if (!container) return;

        // 统计各种文件类型的数量
        const typeStats = {};
        let totalCount = 0;

        this.scannedFiles.forEach(file => {
            const ext = file.extension.toLowerCase();
            const type = this.getFileTypeCategory(ext);

            if (!typeStats[type]) {
                typeStats[type] = {
                    count: 0,
                    extensions: new Set()
                };
            }
            typeStats[type].count++;
            typeStats[type].extensions.add(ext);
            totalCount++;
        });

        // 清空现有按钮
        container.innerHTML = '';

        // 添加"全部"按钮
        const allButton = this.createFilterButton('all', '全部', 'bi-files', totalCount, true);
        container.appendChild(allButton);

        // 按文件数量排序并添加其他类型按钮
        const sortedTypes = Object.entries(typeStats)
            .sort(([,a], [,b]) => b.count - a.count);

        sortedTypes.forEach(([type, stats]) => {
            const button = this.createFilterButton(type, this.getTypeDisplayName(type), this.getTypeIcon(type), stats.count, false);
            container.appendChild(button);
        });

        // 重新绑定事件
        this.bindFileTypeFilterButtons();
    }

    // 创建筛选按钮
    createFilterButton(type, displayName, icon, count, isActive) {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${isActive ? 'btn-outline-primary active' : 'btn-outline-secondary'}`;
        button.setAttribute('data-type', type);
        button.innerHTML = `<i class="bi ${icon}"></i> ${displayName} (${count})`;
        return button;
    }

    // 获取文件类型分类（参考folderService.js的分类规则）
    getFileTypeCategory(extension) {
        const ext = extension.toLowerCase();

        // 图片
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.heic', '.heif'].includes(ext)) {
            return '图片';
        }

        // 视频
        if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.f4v', '.m3u8'].includes(ext)) {
            return '视频';
        }

        // 音频
        if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.amr'].includes(ext)) {
            return '音频';
        }

        // 文档
        if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.md', '.odt', '.ods', '.odp', '.csv'].includes(ext)) {
            return '文档';
        }

        // 压缩包
        if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.cab', '.iso'].includes(ext)) {
            return '压缩包';
        }

        // 代码文件
        const codeExts = [
            '.js', '.html', '.css', '.jsx', '.vue', '.scss', '.sass', '.less', '.ts', '.ejs', '.htm', '.mhtml',
            '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.hxx', '.php', '.rb', '.go', '.pyc',
            '.sh', '.bash', '.zsh', '.fish', '.bat', '.ps1',
            '.json', '.xml', '.yaml', '.yml', '.sql',
            '.conf', '.config', '.ini', '.cfg', '.properties', '.env', '.toml', '.lock', '.sxcu'
        ];
        if (codeExts.includes(ext)) {
            return '代码文件';
        }

        // 设计文件
        if (['.psd', '.psb', '.ai', '.sketch', '.dxf', '.dwg'].includes(ext)) {
            return '设计文件';
        }

        // 数据库文件
        if (['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb'].includes(ext)) {
            return '数据库文件';
        }

        // 日志文件
        if (['.log', '.logs'].includes(ext)) {
            return '日志文件';
        }

        // 字体文件
        if (['.ttf', '.otf', '.woff', '.woff2', '.eot'].includes(ext)) {
            return '字体文件';
        }

        // 插件扩展
        if (['.vsix', '.rbz'].includes(ext)) {
            return '插件扩展';
        }

        // 调试文件
        if (['.pdb'].includes(ext)) {
            return '调试文件';
        }

        // 可执行文件
        if (['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app', '.run', '.dll', '.so', '.dylib', '.apk'].includes(ext)) {
            return '可执行文件';
        }

        return '其他';
    }

    // 获取类型显示名称
    getTypeDisplayName(type) {
        return type; // 直接返回中文分类名称
    }

    // 获取类型图标
    getTypeIcon(type) {
        const iconMap = {
            '图片': 'bi-file-image',
            '视频': 'bi-camera-video',
            '音频': 'bi-file-music',
            '文档': 'bi-file-text',
            '压缩包': 'bi-file-zip',
            '代码文件': 'bi-file-code',
            '设计文件': 'bi-palette',
            '数据库文件': 'bi-database',
            '日志文件': 'bi-file-text',
            '字体文件': 'bi-fonts',
            '插件扩展': 'bi-plugin',
            '调试文件': 'bi-bug',
            '可执行文件': 'bi-gear',
            '其他': 'bi-file'
        };
        return iconMap[type] || 'bi-file';
    }

    bindFileTypeFilterButtons() {
        // 绑定文件类型筛选按钮
        const filterButtons = document.querySelectorAll('[data-type]');
        console.log('找到筛选按钮数量:', filterButtons.length);

        filterButtons.forEach((btn) => {
            // 移除可能存在的旧事件监听器
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // 绑定新的事件监听器
            newBtn.addEventListener('click', (e) => {
                // 确保获取到按钮元素，而不是内部的图标或文本
                const button = e.currentTarget; // 使用 currentTarget 而不是 target
                const type = button.dataset.type;

                console.log('筛选按钮被点击:', type);
                this.filterFilesByType(type);

                // 更新按钮状态
                const allButtons = document.querySelectorAll('[data-type]');
                allButtons.forEach(b => {
                    b.classList.remove('active');
                    b.classList.remove('btn-outline-primary');
                    b.classList.add('btn-outline-secondary');
                });

                // 激活当前按钮
                button.classList.add('active');
                button.classList.remove('btn-outline-secondary');
                button.classList.add('btn-outline-primary');
            });
        });
    }

    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selectionInfo');
        let info = '';

        if (this.selectedFiles.length > 0) {
            info += `已选择 ${this.selectedFiles.length} 个文件`;
        }

        if (this.selectedFolder) {
            if (info) info += '，';
            info += `文件夹: ${this.selectedFolder}`;
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
            const response = await fetch('/rename/api/process', {
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
            console.error('Ai 重命名处理错误:', error);
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
        const options = {
            processingMode: document.getElementById('processingMode')?.value || 'default',
            outputFormat: document.getElementById('outputFormat')?.value || 'json',
            includeMetadata: document.getElementById('includeMetadata')?.checked || false
        };

        // 如果启用了多AI模式，添加多AI配置
        if (this.multiAIConfig.enabled) {
            options.useMultiAI = true;
            options.multiAIConfig = {
                enabled: this.multiAIConfig.enabled,
                apiKeys: this.multiAIConfig.apiKeys,
                priorities: this.multiAIConfig.priorities
            };
        }

        return options;
    }



    showResult(result) {
        const resultCard = document.getElementById('resultCard');
        const resultContent = document.getElementById('resultContent');

        if (resultCard && resultContent) {
            // TODO: 根据实际结果格式化显示内容
            resultContent.innerHTML = `
                <div class="alert alert-success">
                    <h6>处理成功</h6>
                    <p class="mb-0">处理时间: ${new Date(result.data.timestamp).toLocaleString()}</p>
                    <p class="mb-0">处理文件数: ${result.data.processedCount || 0}</p>
                </div>
                <div class="mt-3">
                    <h6>处理结果:</h6>
                    <pre class="border rounded p-3" style="background-color: var(--bs-secondary-bg); color: var(--bs-body-color);"><code>${JSON.stringify(result.data, null, 2)}</code></pre>
                </div>
            `;

            resultCard.style.display = 'block';
        }
    }

    hideResults() {
        const resultCard = document.getElementById('resultCard');
        if (resultCard) {
            resultCard.style.display = 'none';
        }
    }

    getFileIcon(extension) {
        const iconMap = {
            // 文档类型
            '.txt': 'bi-file-text',
            '.md': 'bi-file-text',
            '.doc': 'bi-file-word',
            '.docx': 'bi-file-word',
            '.xls': 'bi-file-excel',
            '.xlsx': 'bi-file-excel',
            '.ppt': 'bi-file-ppt',
            '.pptx': 'bi-file-ppt',
            '.pdf': 'bi-file-pdf',

            // 图片类型
            '.jpg': 'bi-file-image',
            '.jpeg': 'bi-file-image',
            '.png': 'bi-file-image',
            '.gif': 'bi-file-image',
            '.bmp': 'bi-file-image',
            '.webp': 'bi-file-image',
            '.svg': 'bi-file-image',

            // 音频类型
            '.mp3': 'bi-file-music',
            '.wav': 'bi-file-music',
            '.flac': 'bi-file-music',

            // 视频类型
            '.mp4': 'bi-camera-video',
            '.avi': 'bi-camera-video',
            '.mov': 'bi-camera-video',

            // 压缩文件
            '.zip': 'bi-file-zip',
            '.rar': 'bi-file-zip',
            '.7z': 'bi-file-zip'
        };

        return iconMap[extension.toLowerCase()] || 'bi-file-earmark';
    }

    getFileType(extension) {
        const typeMap = {
            '.txt': '文本文档',
            '.md': 'Markdown',
            '.doc': 'Word文档',
            '.docx': 'Word文档',
            '.xls': 'Excel表格',
            '.xlsx': 'Excel表格',
            '.ppt': 'PowerPoint',
            '.pptx': 'PowerPoint',
            '.pdf': 'PDF文档',
            '.jpg': '图片',
            '.jpeg': '图片',
            '.png': '图片',
            '.gif': '图片',
            '.bmp': '图片',
            '.webp': '图片',
            '.svg': '矢量图',
            '.mp3': '音频',
            '.wav': '音频',
            '.flac': '音频',
            '.mp4': '视频',
            '.avi': '视频',
            '.mov': '视频',
            '.zip': '压缩文件',
            '.rar': '压缩文件',
            '.7z': '压缩文件'
        };

        return typeMap[extension.toLowerCase()] || '未知类型';
    }

    filterFilesByType(type) {
        this.currentFilter = type;
        console.log('筛选类型:', type, '总文件数:', this.scannedFiles.length);

        if (type === 'all') {
            this.filteredFiles = [...this.scannedFiles];
        } else {
            this.filteredFiles = this.scannedFiles.filter(file => {
                const ext = file.extension.toLowerCase();
                const fileCategory = this.getFileTypeCategory(ext);
                const match = fileCategory === type;

                if (match) {
                    console.log('匹配文件:', file.name, '扩展名:', ext, '分类:', fileCategory);
                }
                return match;
            });
        }

        console.log('筛选后文件数:', this.filteredFiles.length);
        this.updateFileList();
    }

    // 移除了toggleFileTypeFilter方法，现在筛选选项直接显示

    refreshFileList() {
        if (this.selectedFolder) {
            this.scanFolderFiles();
        }
    }

    toggleFileSelection(index) {
        // 这里可以实现单个文件的选择/取消选择逻辑
        // 暂时保留接口，后续可以扩展
    }

    // 开始重命名功能 (实时流式处理)
    async startRename() {
        if (!this.filteredFiles || this.filteredFiles.length === 0) {
            this.showToast('没有可重命名的文件', 'warning');
            return;
        }

        const config = this.getRenameConfig();
        if (!config) return;

        // 初始化处理状态
        this.renameResults = [];
        this.initializeProcessingUI();

        try {
            // 使用流式处理API
            await this.processFilesWithRealTimeUpdates(config);

            const successCount = this.renameResults.filter(r => r.status === 'success').length;
            const totalFiles = this.renameResults.length;

            this.showToast(`重命名完成！成功处理 ${successCount}/${totalFiles} 个文件`, 'success');
            this.showDesktopNotification('重命名完成', `成功处理了 ${successCount}/${totalFiles} 个文件`);
            this.updateWindowTitle('重命名完成');

            // 更新按钮状态，启用应用全部和重新生成按钮
            this.updateButtonStates();

        } catch (error) {
            console.error('重命名过程出错:', error);
            this.showToast(`重命名过程出错: ${error.message}`, 'error');
            this.showDesktopNotification('重命名失败', '处理过程中出现错误');
            this.updateWindowTitle('重命名失败');
        } finally {
            this.hideProgress();
        }
    }

    // 初始化处理界面
    initializeProcessingUI() {
        // 显示进度条
        this.showProgress(0, `正在处理 ${this.filteredFiles.length} 个文件，请稍等...`);

        // 初始化每个文件的处理状态
        this.filteredFiles.forEach((file, index) => {
            this.updateFileProcessingStatus(index, 'processing', '文件加载中...');
        });

        // 更新统计信息
        this.updateStats();
    }

    // 实时流式处理文件 - 使用Server-Sent Events实现真正的实时反馈
    async processFilesWithRealTimeUpdates(config) {
        const totalFiles = this.filteredFiles.length;

        // 初始化所有文件状态
        for (let i = 0; i < totalFiles; i++) {
            this.updateFileProcessingStatus(i, 'processing', '等待处理...');
        }

        try {
            // 准备文件数据
            const fileData = this.filteredFiles.map(file => ({
                name: file.name,
                path: file.path,
                size: file.size,
                extension: file.extension,
                relativePath: file.relativePath,
                directory: file.directory,
                modified: file.modified,
                created: file.created
            }));

            // 使用流式处理API
            await this.processFilesWithSSE(fileData, config);

        } catch (error) {
            console.error('流式处理失败:', error);

            // 将所有文件标记为错误
            for (let i = 0; i < totalFiles; i++) {
                if (!this.renameResults[i]) {
                    const errorResult = {
                        originalName: this.filteredFiles[i].name,
                        newName: this.filteredFiles[i].name,
                        status: 'error',
                        error: this.getErrorMessage(error),
                        path: this.filteredFiles[i].path
                    };
                    this.renameResults[i] = errorResult;
                    this.updateFileProcessingStatus(i, 'error', this.getErrorMessage(error));
                }
            }
        }

        // 更新统计信息和按钮状态
        this.updateStats();
        this.updateButtonStates();
    }

    // 使用Server-Sent Events进行流式处理
    async processFilesWithSSE(fileData, config) {
        return new Promise((resolve, reject) => {
            console.log('🚀 开始流式处理，文件数量:', fileData.length);

            // 在发送前先更新API密钥配置
            this.saveMultiAIConfig();

            const requestData = {
                files: fileData,
                options: {
                    ...config,
                    // 如果启用了多AI模式，传递多AI配置
                    useMultiAI: this.multiAIConfig.enabled,
                    multiAI: this.multiAIConfig.enabled ? {
                        apiKeys: this.multiAIConfig.apiKeys,
                        priorities: this.multiAIConfig.priorities
                    } : undefined
                },
                apiKey: this.apiKey,
                model: config.selectedModel
            };

            // 调试日志：显示发送的数据
            console.log('📤 发送到后端的数据:', {
                useMultiAI: requestData.options.useMultiAI,
                hasMultiAI: !!requestData.options.multiAI,
                apiKeys: requestData.options.multiAI?.apiKeys ? Object.keys(requestData.options.multiAI.apiKeys) : [],
                doubaoKey: requestData.options.multiAI?.apiKeys?.doubao ?
                    requestData.options.multiAI.apiKeys.doubao.substring(0, 12) + '...' : 'undefined',
                doubaoKeyFull: requestData.options.multiAI?.apiKeys?.doubao || 'EMPTY',
                allApiKeys: requestData.options.multiAI?.apiKeys || {}
            });

            // 创建POST请求发送数据到流式处理接口
            fetch('/rename/api/process-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // 创建流读取器
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                const processStream = () => {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            console.log('✅ 流式处理完成');
                            resolve();
                            return;
                        }

                        // 解码数据
                        buffer += decoder.decode(value, { stream: true });

                        // 处理完整的事件
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // 保留不完整的行

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const eventData = JSON.parse(line.substring(6));
                                    this.handleSSEEvent(eventData);
                                } catch (error) {
                                    console.error('解析SSE事件失败:', error, line);
                                }
                            }
                        }

                        // 继续读取
                        processStream();
                    }).catch(error => {
                        console.error('读取流数据失败:', error);
                        reject(error);
                    });
                };

                // 开始处理流
                processStream();

            }).catch(error => {
                console.error('启动流式处理失败:', error);
                reject(error);
            });
        });
    }

    // 处理Server-Sent Events事件
    handleSSEEvent(eventData) {
        console.log('📨 收到SSE事件:', eventData.type, eventData);

        switch (eventData.type) {
            case 'init':
                console.log('🎬 初始化:', eventData.message);
                this.showProgress(0, eventData.message);
                break;

            case 'progress':
                // 实时更新单个文件的处理状态
                this.handleProgressEvent(eventData);
                break;

            case 'complete':
                console.log('🎉 处理完成:', eventData.message);
                this.showProgress(100, eventData.message);
                break;

            case 'error':
                console.error('❌ 处理错误:', eventData.message);
                this.showToast(eventData.message, 'error');
                break;

            default:
                console.warn('未知的SSE事件类型:', eventData.type);
        }
    }

    // 处理进度事件
    handleProgressEvent(eventData) {
        const { current, total, percentage, currentFile, result } = eventData;

        console.log(`📊 处理进度: ${current}/${total} (${percentage}%) - ${currentFile}`);

        // 获取当前使用的模型信息
        const modelInfo = this.getCurrentModelInfo();

        // 更新总体进度
        this.showProgress(percentage, `正在处理: ${currentFile} (${current}/${total}) - 使用 ${modelInfo}`);

        // 查找对应的文件索引
        const fileIndex = this.filteredFiles.findIndex(file =>
            file.name === currentFile || file.path === currentFile
        );

        if (fileIndex !== -1 && result) {
            // 处理结果并更新界面
            const processResult = {
                originalName: result.originalName,
                newName: result.suggestedName || result.fallbackName || result.originalName,
                status: result.success ? 'success' : 'error',
                reasoning: result.reasoning,
                confidence: result.confidence,
                stage: result.stage,
                error: result.error,
                path: this.filteredFiles[fileIndex]?.path,
                // 添加跳过相关信息
                skipped: result.skipped || false,
                reason: result.reason,
                lastProcessed: result.lastProcessed
            };

            // 保存结果
            this.renameResults[fileIndex] = processResult;

            // 实时更新界面
            if (processResult.status === 'success') {
                this.updateFileProcessingStatus(fileIndex, 'success', processResult.newName, processResult);

                // 根据不同情况显示不同的日志信息
                if (processResult.skipped) {
                    console.log(`⏭️ 文件已跳过: ${currentFile} (${processResult.reason})`);
                } else if (processResult.originalName === processResult.newName) {
                    console.log(`🔄 文件名称未变: ${currentFile} (AI认为当前名称合适)`);
                } else {
                    console.log(`✅ 文件处理成功: ${currentFile} -> ${processResult.newName}`);
                }

                // 显示成功通知（可选）
                if (this.filteredFiles.length <= 10) { // 只在文件较少时显示详细通知
                    if (processResult.skipped) {
                        // 跳过文件的通知更加低调，不显示Toast
                        console.log(`⏭️ 跳过已处理文件: ${result.originalName}`);
                    } else if (processResult.originalName === processResult.newName) {
                        this.showToast(`🔄 文件名称保持不变: ${result.originalName}`, 'info', 2000);
                    } else {
                        this.showToast(`🎯 AI重命名成功: ${result.originalName} -> ${processResult.newName}`, 'success', 3000);
                    }
                }
            } else {
                this.updateFileProcessingStatus(fileIndex, 'error', processResult.error || '处理失败');
                console.error(`❌ 文件处理失败: ${currentFile} - ${processResult.error}`);

                // 显示错误通知
                this.showToast(`❌ 处理失败: ${currentFile} - ${processResult.error}`, 'error', 5000);
            }

            // 实时更新统计信息
            this.updateStats();
        } else {
            console.warn('未找到对应的文件索引:', currentFile, fileIndex);
        }
    }

    /**
     * 获取友好的错误信息
     */
    getErrorMessage(error) {
        const message = error.message || error.toString();

        if (message.includes('Network service crashed')) {
            return '网络服务重启中，请稍后重试';
        } else if (message.includes('timeout')) {
            return '处理超时，请重试';
        } else if (message.includes('Failed to fetch')) {
            return '网络连接失败';
        } else if (message.includes('Model does not exist')) {
            return '模型不存在，已自动切换';
        } else if (message.includes('ECONNRESET')) {
            return '网络连接中断';
        } else if (message.includes('ETIMEDOUT')) {
            return '网络请求超时';
        } else {
            return message || '处理失败';
        }
    }

    // 预览重命名结果 (第二阶段：真实文档处理)
    async previewRename() {
        if (!this.filteredFiles || this.filteredFiles.length === 0) {
            this.showToast('没有可预览的文件', 'warning');
            return;
        }

        const config = this.getRenameConfig();
        if (!config) return;

        this.showProgress(0, '正在生成预览...');

        try {
            // 预览最多5个文件
            const previewFiles = this.filteredFiles.slice(0, 5);

            // 调用后端API进行预览
            const response = await fetch('/rename/api/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: previewFiles,
                    options: config,
                    apiKey: this.apiKey,
                    model: this.selectedModel
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.renameResults = result.data.results.map(item => ({
                    originalName: item.originalName,
                    newName: item.suggestedName || item.fallbackName || item.originalName,
                    status: item.success ? 'preview' : 'error',
                    reasoning: item.reasoning,
                    confidence: item.confidence,
                    stage: item.stage,
                    error: item.error,
                    path: item.path
                }));

                // 如果有更多文件，添加提示
                if (this.filteredFiles.length > 5) {
                    this.renameResults.push({
                        originalName: `... 还有 ${this.filteredFiles.length - 5} 个文件`,
                        newName: '(点击开始重命名查看全部)',
                        status: 'info',
                        path: ''
                    });
                }

                this.showPreviewResults();
                this.showToast('预览生成完成', 'success');
            } else {
                throw new Error(result.message || '预览生成失败');
            }

        } catch (error) {
            console.error('预览生成出错:', error);
            this.showToast(`预览生成出错: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    // 显示预览结果（在右侧AI命名预览区）
    showPreviewResults() {
        const previewCard = document.getElementById('previewCard');
        const previewContent = document.getElementById('previewContent');
        const resultCard = document.getElementById('resultCard');

        if (!previewCard || !previewContent) return;

        // 隐藏结果卡片，显示预览卡片
        if (resultCard) resultCard.style.display = 'none';
        previewCard.style.display = 'block';

        // 生成预览内容
        previewContent.innerHTML = this.renameResults.map((result, index) => {
            const statusIcon = result.status === 'info' ? 'bi-info-circle' : 'bi-eye';
            const statusClass = result.status === 'info' ? 'text-secondary' : 'text-info';

            return `
                <div class="preview-item border-bottom p-3 ${result.status === 'info' ? 'bg-light' : ''}">
                    <div class="d-flex align-items-start">
                        <div class="flex-shrink-0 me-3">
                            <i class="bi ${statusIcon} ${statusClass}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="mb-2">
                                <small class="text-muted">原文件名:</small>
                                <div class="text-muted">${result.originalName}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">AI建议名称:</small>
                                <div class="fw-medium text-primary">${result.newName}</div>
                            </div>
                            ${result.status !== 'info' ? `
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-outline-success" onclick="window.smartRenameManager.acceptPreview(${index})">
                                        <i class="bi bi-check"></i> 采用
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="window.smartRenameManager.editPreview(${index})">
                                        <i class="bi bi-pencil"></i> 编辑
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning" onclick="window.smartRenameManager.regeneratePreview(${index})">
                                        <i class="bi bi-arrow-clockwise"></i> 重新生成
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        previewCard.scrollIntoView({ behavior: 'smooth' });
    }

    // 接受预览建议
    acceptPreview(index) {
        if (this.renameResults[index]) {
            this.showToast(`已接受建议: ${this.renameResults[index].newName}`, 'success');
        }
    }

    // 编辑预览建议
    editPreview(index) {
        if (this.renameResults[index]) {
            const newName = prompt('请输入新的文件名:', this.renameResults[index].newName);
            if (newName && newName.trim()) {
                this.renameResults[index].newName = newName.trim();
                this.showPreviewResults(); // 刷新显示
                this.showToast('文件名已更新', 'success');
            }
        }
    }

    // 重新生成单个预览
    async regeneratePreview(index) {
        if (this.renameResults[index] && this.filteredFiles[index]) {
            const config = this.getRenameConfig();
            if (!config) return;

            try {
                const file = this.filteredFiles[index];
                const newName = await this.generateNewFileName(file, config);
                this.renameResults[index].newName = newName;
                this.showPreviewResults(); // 刷新显示
                this.showToast('已重新生成文件名', 'success');
            } catch (error) {
                console.error('重新生成失败:', error);
                this.showToast('重新生成失败', 'error');
            }
        }
    }

    // 重新生成单个文件的名称
    async regenerateSingleFile(index, forceRegenerate = false) {
        console.log('regenerateSingleFile 被调用，index:', index, 'forceRegenerate:', forceRegenerate);

        if (!this.filteredFiles[index]) {
            console.error('文件不存在，index:', index, 'filteredFiles长度:', this.filteredFiles?.length);
            this.showToast('文件不存在', 'error');
            return;
        }

        const config = this.getRenameConfig();
        if (!config) {
            console.error('获取配置失败');
            return;
        }

        // 如果是强制重新生成，禁用跳过功能
        if (forceRegenerate) {
            config.skipProcessed = false;
            console.log('强制重新生成模式：已禁用跳过功能');
        }

        console.log('开始重新生成文件:', this.filteredFiles[index].name);

        try {
            // 显示处理状态
            const statusMessage = forceRegenerate ? '强制重新生成中...' : '重新生成中...';
            this.updateFileProcessingStatus(index, 'processing', statusMessage);

            const file = this.filteredFiles[index];

            // 调用后端API重新生成
            const response = await fetch('/rename/api/process-single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file: file,
                    options: config,
                    apiKey: this.apiKey,
                    model: config.selectedModel,
                    timestamp: new Date().toISOString(),
                    forceRegenerate: forceRegenerate
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                const item = result.data;
                const processResult = {
                    originalName: item.originalName,
                    newName: item.suggestedName || item.fallbackName || item.originalName,
                    status: item.success ? 'success' : 'error',
                    reasoning: item.reasoning,
                    confidence: item.confidence,
                    stage: item.stage,
                    error: item.error,
                    path: file.path
                };

                // 更新结果
                this.renameResults[index] = processResult;

                // 更新界面
                if (processResult.status === 'success') {
                    this.updateFileProcessingStatus(index, 'success', processResult.newName, processResult);
                } else {
                    this.updateFileProcessingStatus(index, 'error', processResult.error || '重新生成失败');
                }

                this.showToast('重新生成完成', 'success');

                // 更新按钮状态
                this.updateButtonStates();
            } else {
                throw new Error(result.message || '重新生成失败');
            }

        } catch (error) {
            console.error('重新生成单个文件失败:', error);
            this.updateFileProcessingStatus(index, 'error', '重新生成失败');
            this.showToast(`重新生成失败: ${error.message}`, 'error');
        }
    }

    // 定位文件在文件夹中的位置
    async locateFile(index) {
        console.log('locateFile 被调用，index:', index);

        if (!this.filteredFiles[index]) {
            console.error('文件不存在，index:', index);
            this.showToast('文件不存在', 'error');
            return;
        }

        const file = this.filteredFiles[index];
        const filePath = file.path;

        try {
            if (this.isElectronApp && window.electronAPI) {
                // 在 Electron 环境中使用系统 API 打开文件夹并定位文件
                console.log('使用 Electron API 定位文件:', filePath);
                const result = await window.electronAPI.showItemInFolder(filePath);

                if (result.success) {
                    console.log('文件定位成功:', filePath);
                    this.showToast(`已在文件夹中定位: ${file.name}`, 'success', 2000);
                } else {
                    throw new Error(result.error || '定位文件失败');
                }
            } else {
                // 在浏览器环境中，尝试复制文件路径到剪贴板
                console.log('浏览器环境，复制文件路径到剪贴板:', filePath);

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(filePath);
                    this.showToast(`文件路径已复制到剪贴板: ${file.name}`, 'info', 3000);
                } else {
                    // 降级方案：显示文件路径
                    const pathInfo = `文件路径: ${filePath}`;
                    console.log(pathInfo);
                    this.showToast(pathInfo, 'info', 5000);
                }
            }
        } catch (error) {
            console.error('定位文件失败:', error);
            this.showToast(`定位文件失败: ${error.message}`, 'error');
        }
    }

    // 应用单个文件的重命名
    async applySingleFile(index) {
        console.log('applySingleFile 被调用，index:', index);

        if (!this.renameResults[index] || !this.filteredFiles[index]) {
            console.error('没有可应用的重命名结果:', {
                hasResult: !!this.renameResults[index],
                hasFile: !!this.filteredFiles[index],
                index
            });
            this.showToast('没有可应用的重命名结果', 'warning');
            return;
        }

        const result = this.renameResults[index];
        const file = this.filteredFiles[index];

        if (result.status !== 'success' || !result.newName) {
            this.showToast('重命名结果无效，请先重新生成', 'warning');
            return;
        }

        // 确认对话框
        const confirmed = confirm(`确定要将文件重命名吗？\n\n原名称: ${result.originalName}\n新名称: ${result.newName}\n\n此操作不可撤销。`);
        if (!confirmed) {
            return;
        }

        try {
            // 应用重命名
            const applyResult = await this.applyRename(file.path, result.newName);

            if (applyResult.success) {
                // 更新文件信息
                this.filteredFiles[index].name = result.newName;
                this.filteredFiles[index].path = applyResult.newPath || file.path;

                // 更新结果状态
                this.renameResults[index].applied = true;

                // 更新界面显示
                this.updateFileList();
                this.updateStats();

                this.showToast(`文件重命名成功: ${result.newName}`, 'success');
            } else {
                throw new Error(applyResult.error || '重命名失败');
            }

        } catch (error) {
            console.error('应用单个文件重命名失败:', error);
            this.showToast(`重命名失败: ${error.message}`, 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取重命名配置
    getRenameConfig() {
        const template = document.getElementById('namingTemplate')?.value || 'semantic';
        const customPrompt = document.getElementById('customPrompt')?.value || '';
        const preserveExtension = document.getElementById('preserveExtension')?.checked ?? true;
        const removeSpecialChars = document.getElementById('removeSpecialChars')?.checked ?? true;
        const useOCR = document.getElementById('useOCR')?.checked ?? true;
        const skipProcessed = document.getElementById('skipProcessed')?.checked ?? true;
        const smartKeepOriginal = document.getElementById('smartKeepOriginal')?.checked ?? false;
        const openFolderAfter = document.getElementById('openFolderAfter')?.checked ?? false;

        if (template === 'custom' && !customPrompt.trim()) {
            this.showToast('自定义模板需要输入提示词', 'warning');
            return null;
        }

        const enableConcurrency = document.getElementById('enableConcurrency')?.checked ?? true;
        const concurrencyLevel = parseInt(document.getElementById('concurrencyLevel')?.value || '3');

        return {
            template,
            customPrompt,
            preserveExtension,
            removeSpecialChars,
            useOCR,
            skipProcessed,
            smartKeepOriginal,
            enableConcurrency,
            concurrency: concurrencyLevel,
            openFolderAfter,
            selectedModel: this.selectedModel
        };
    }

    // 生成新文件名 (模拟实现)
    async generateNewFileName(file, config) {
        const baseName = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
        const extension = config.preserveExtension ? file.extension : '';

        let newName = '';

        switch (config.template) {
            case 'semantic':
                // 模拟基于语义的命名
                newName = this.generateSemanticName(baseName, file);
                break;
            case 'date_content':
                // 模拟日期+内容命名
                newName = this.generateDateContentName(baseName, file);
                break;
            case 'category_name':
                // 模拟分类+名称命名
                newName = this.generateCategoryName(baseName, file);
                break;
            case 'custom':
                // 模拟自定义命名
                newName = this.generateCustomName(baseName, file, config.customPrompt);
                break;
            default:
                newName = baseName;
        }

        // 移除特殊字符
        if (config.removeSpecialChars) {
            newName = newName.replace(/[<>:"/\\|?*]/g, '_');
        }

        return newName + extension;
    }

    generateSemanticName(baseName, file) {
        // 模拟语义分析结果
        const semanticNames = [
            '财务报表_2024年度',
            '项目文档_需求分析',
            '会议纪要_产品评审',
            '技术文档_API接口',
            '用户手册_操作指南'
        ];
        return semanticNames[Math.floor(Math.random() * semanticNames.length)];
    }

    generateDateContentName(baseName, file) {
        const today = new Date().toISOString().split('T')[0];
        const contentKeywords = ['报告', '文档', '数据', '图片', '记录'];
        const keyword = contentKeywords[Math.floor(Math.random() * contentKeywords.length)];
        return `${today}_${keyword}_${baseName.substring(0, 10)}`;
    }

    generateCategoryName(baseName, file) {
        const categories = ['办公文档', '财务资料', '项目文件', '技术资料', '个人文件'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        return `${category}_${baseName}`;
    }

    generateCustomName(baseName, file, prompt) {
        // 模拟自定义提示词处理
        return `自定义_${baseName}_${Date.now().toString().slice(-4)}`;
    }

    // 显示结果（新的统一界面）
    showResults() {
        // 更新文件列表以显示处理结果
        this.updateFileList();

        // 更新统计信息
        this.updateStats();

        // 更新按钮状态（包括应用全部按钮）
        this.updateButtonStates();
    }

    getStatusIcon(status) {
        switch (status) {
            case 'success': return 'bi-check-circle-fill';
            case 'failed': return 'bi-x-circle-fill';
            case 'skipped': return 'bi-dash-circle-fill';
            case 'preview': return 'bi-eye-fill';
            case 'info': return 'bi-info-circle-fill';
            default: return 'bi-circle';
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'success': return 'text-success';
            case 'failed': return 'text-danger';
            case 'skipped': return 'text-warning';
            case 'preview': return 'text-info';
            case 'info': return 'text-secondary';
            default: return 'text-muted';
        }
    }

    hideResults() {
        const resultCard = document.getElementById('resultCard');
        if (resultCard) {
            resultCard.style.display = 'none';
        }
    }

    // 显示进度
    showProgress(percent, text) {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');

        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = text;
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
    }

    hideProgress() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    // 桌面通知
    showDesktopNotification(title, body, options = {}) {
        if (!this.isElectronApp) return;

        // 检查通知权限
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                // 移除不存在的图标引用
                ...options
            });

            // 点击通知时聚焦窗口
            notification.onclick = () => {
                if (window.electronAPI && window.electronAPI.focusWindow) {
                    window.electronAPI.focusWindow();
                }
                notification.close();
            };

            // 3秒后自动关闭
            setTimeout(() => notification.close(), 3000);
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            // 请求通知权限
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showDesktopNotification(title, body, options);
                }
            });
        }
    }

    // 工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showToast(message, type = 'info', duration = 3000) {
        // 简单的提示实现
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

        // 根据指定时间自动消失
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    clearAll() {
        this.selectedFolder = null;
        this.scannedFiles = [];
        this.filteredFiles = [];
        this.renameResults = [];

        this.updateFolderInfo();
        this.updateFileList();
        this.updateButtonStates();
        this.hideResults();
        this.hideProgress();

        // 重置筛选器
        const filterButtons = document.querySelectorAll('[data-type]');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-type="all"]')?.classList.add('active');

        this.showToast('已重新开始', 'info');
    }



    // 打开文件夹功能 (Electron特性)
    async openFolderInExplorer() {
        if (this.isElectronApp && this.selectedFolder && window.electronAPI) {
            try {
                await window.electronAPI.openFolder(this.selectedFolder);
            } catch (error) {
                console.error('打开文件夹失败:', error);
                this.showToast('打开文件夹失败', 'error');
            }
        }
    }

    // 应用全部重命名
    async applyAllRenames() {
        if (!this.renameResults || this.renameResults.length === 0) {
            this.showToast('没有可应用的重命名建议', 'warning');
            return;
        }

        // 过滤出有效的重命名结果（只要是成功状态且有新名称）
        const validResults = this.renameResults.filter(result => {
            const hasValidStatus = result.status === 'success';
            const hasNewName = result.newName && result.newName.trim().length > 0;
            const hasPath = result.path && result.path.trim().length > 0;
            return hasValidStatus && hasNewName && hasPath;
        });

        if (validResults.length === 0) {
            this.showToast('没有有效的重命名建议可应用', 'warning');
            return;
        }

        // 确认对话框
        const confirmed = confirm(`确定要应用 ${validResults.length} 个文件的重命名吗？\n\n这将实际修改文件名，操作不可撤销。`);
        if (!confirmed) {
            return;
        }

        this.showProgress(0, '正在应用重命名...');

        try {
            // 使用批量应用API
            const response = await fetch('/rename/api/apply-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    renameResults: validResults,
                    apiKey: this.apiKey
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                const { successCount, failureCount, results } = result.data;

                this.showProgress(100, '重命名完成');

                if (successCount > 0) {
                    this.showToast(`批量重命名完成！成功: ${successCount}, 失败: ${failureCount}`,
                        failureCount === 0 ? 'success' : 'warning');

                    // 刷新文件列表
                    if (this.selectedFolder) {
                        await this.scanFolderFiles();
                    }
                } else {
                    this.showToast('所有重命名操作都失败了', 'error');
                }

                // 显示错误详情
                if (results && Array.isArray(results)) {
                    const errors = results.filter(r => !r.success);
                    if (errors.length > 0) {
                        console.error('重命名错误详情:', errors);
                        const errorMessage = errors.slice(0, 3).map(e => `${e.originalName}: ${e.error}`).join('\n') +
                            (errors.length > 3 ? `\n... 还有 ${errors.length - 3} 个错误` : '');
                        alert(`重命名过程中遇到以下错误:\n\n${errorMessage}`);
                    }
                }
            } else {
                // 不要抛出错误，只显示消息
                this.showToast(result.message || '批量重命名失败', 'error');
                console.error('批量重命名失败:', result);
            }

        } catch (error) {
            console.error('批量重命名过程出错:', error);
            this.showToast(`批量重命名失败: ${error.message}`, 'error');
        } finally {
            setTimeout(() => this.hideProgress(), 2000);
        }
    }

    // 应用单个重命名
    async applyRename(oldPath, newName) {
        try {
            // 如果是Electron环境，使用Electron API
            if (this.isElectronApp && window.electronAPI) {
                return await window.electronAPI.renameFile(oldPath, newName);
            } else {
                // Web环境下通过后端API重命名
                const response = await fetch('/rename/api/apply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        oldPath,
                        newName
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 重新生成所有预览
    async regenerateAllPreviews() {
        if (!this.filteredFiles || this.filteredFiles.length === 0) {
            this.showToast('没有文件可重新生成', 'warning');
            return;
        }

        const confirmed = confirm('确定要重新生成所有文件的命名吗？这将覆盖当前的重命名结果。');
        if (!confirmed) {
            return;
        }

        // 清空当前结果
        this.renameResults = [];

        // 重新调用重命名功能
        await this.startRename();
    }

    // 绑定模型对比事件
    bindModelCompareEvents() {
        // 模型对比按钮
        const modelCompareBtn = document.getElementById('modelCompareBtn');
        if (modelCompareBtn) {
            modelCompareBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('modelCompareModal'));
                modal.show();
            });
        }

        // 应用推荐配置按钮
        const applyRecommendedBtn = document.getElementById('applyRecommendedModel');
        if (applyRecommendedBtn) {
            applyRecommendedBtn.addEventListener('click', () => {
                this.applyRecommendedModelConfig();
            });
        }
    }

    // 应用推荐模型配置
    applyRecommendedModelConfig() {
        // 设置推荐的对话模型
        const aiModelSelect = document.getElementById('aiModel');
        if (aiModelSelect) {
            aiModelSelect.value = 'chat:Qwen/Qwen3-Next-80B-A3B-Instruct';
        }

        // 如果是多AI模式，设置推荐配置
        const multiAIMode = document.getElementById('multiAI');
        if (multiAIMode && multiAIMode.checked) {
            // 设置推荐的模型优先级
            this.multiAIConfig.priorities = {
                chat: [
                    { provider: 'siliconflow', model: 'Qwen/Qwen3-Next-80B-A3B-Instruct', priority: 1 },
                    { provider: 'siliconflow', model: 'Qwen/Qwen2.5-72B-Instruct-128K', priority: 2 },
                    { provider: 'deepseek', model: 'deepseek-chat', priority: 3 }
                ],
                vision: [
                    { provider: 'doubao', model: 'doubao-seed-1-6-flash-250615', priority: 1 },
                    { provider: 'siliconflow', model: 'Qwen/Qwen2.5-VL-32B-Instruct', priority: 2 }
                ]
            };

            // 更新界面显示
            this.updateModelPriorities();
        }

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('modelCompareModal'));
        if (modal) {
            modal.hide();
        }

        // 显示成功提示
        this.showToast('已应用推荐模型配置', 'success');
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建toast元素
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'info'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        // 添加到页面
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        const toastElement = document.createElement('div');
        toastElement.innerHTML = toastHtml;
        toastContainer.appendChild(toastElement.firstElementChild);

        // 显示toast
        const toast = new bootstrap.Toast(toastElement.firstElementChild, {
            autohide: true,
            delay: 3000
        });
        toast.show();

        // 自动清理
        setTimeout(() => {
            if (toastElement.firstElementChild) {
                toastElement.firstElementChild.remove();
            }
        }, 4000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.smartRenameManager = new SmartRenameManager();
});
