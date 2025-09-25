/**
 * 全局设置页面管理器
 */
class GlobalSettingsManager {
    constructor() {
        this.apiKeys = {
            siliconflow: '',
            doubao: '',
            deepseek: ''
        };
        
        this.init();
    }

    async init() {
        console.log('初始化全局设置管理器');
        
        // 加载保存的配置
        this.loadConfig();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新状态显示
        this.updateAllStatus();
        
        console.log('全局设置管理器初始化完成');
    }

    // 绑定事件监听器
    bindEvents() {
        // 表单提交
        const form = document.getElementById('aiConfigForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfig();
            });
        }

        // 输入框变化监听
        ['siliconflowKey', 'doubaoKey', 'deepseekKey'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.validateInput(id);
                });

                input.addEventListener('blur', () => {
                    this.updateStatus(id.replace('Key', ''));
                });
            }
        });

        // 事件委托 - 测试API按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.test-api-key')) {
                const button = e.target.closest('.test-api-key');
                const provider = button.getAttribute('data-provider');
                if (provider) {
                    this.testApiKey(provider);
                }
            }
        });

        // 事件委托 - 密码可见性切换
        document.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-password')) {
                const button = e.target.closest('.toggle-password');
                const targetId = button.getAttribute('data-target');
                if (targetId) {
                    this.togglePasswordVisibility(targetId);
                }
            }
        });

        // 清空配置按钮
        const clearBtn = document.getElementById('clearAllConfigBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllConfig();
            });
        }

        // 恢复默认配置按钮
        const defaultBtn = document.getElementById('loadDefaultConfigBtn');
        if (defaultBtn) {
            defaultBtn.addEventListener('click', () => {
                this.loadDefaultConfig();
            });
        }
    }

    // 从本地存储加载配置
    loadConfig() {
        try {
            const saved = localStorage.getItem('globalAIConfig');
            if (saved) {
                this.apiKeys = { ...this.apiKeys, ...JSON.parse(saved) };
                
                // 更新界面
                Object.keys(this.apiKeys).forEach(provider => {
                    const input = document.getElementById(`${provider}Key`);
                    if (input && this.apiKeys[provider]) {
                        input.value = this.apiKeys[provider];
                    }
                });
                
                console.log('配置加载成功');
            }
        } catch (error) {
            console.error('配置加载失败:', error);
        }
    }

    // 保存配置到本地存储
    saveConfig() {
        try {
            // 获取表单数据
            const formData = {
                siliconflow: document.getElementById('siliconflowKey')?.value || '',
                doubao: document.getElementById('doubaoKey')?.value || '',
                deepseek: document.getElementById('deepseekKey')?.value || ''
            };

            // 更新内存中的配置
            this.apiKeys = { ...this.apiKeys, ...formData };

            // 保存到本地存储
            localStorage.setItem('globalAIConfig', JSON.stringify(this.apiKeys));

            // 广播配置更新事件
            this.broadcastConfigUpdate();

            // 更新状态显示
            this.updateAllStatus();

            // 显示成功提示
            this.showToast('配置保存成功！', 'success');

            console.log('配置保存成功');
        } catch (error) {
            console.error('配置保存失败:', error);
            this.showToast('配置保存失败！', 'error');
        }
    }

    // 广播配置更新事件
    broadcastConfigUpdate() {
        // 发送自定义事件，通知其他模块配置已更新
        window.dispatchEvent(new CustomEvent('globalAIConfigUpdated', {
            detail: this.apiKeys
        }));
        
        console.log('配置更新事件已广播');
    }

    // 验证输入
    validateInput(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const value = input.value.trim();
        const provider = inputId.replace('Key', '');

        // 移除之前的验证样式
        input.classList.remove('is-valid', 'is-invalid');

        if (value) {
            // 基本格式验证
            let isValid = false;
            
            switch (provider) {
                case 'siliconflow':
                case 'deepseek':
                    isValid = value.startsWith('sk-') && value.length > 20;
                    break;
                case 'doubao':
                    isValid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
                    break;
            }

            input.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }
    }

    // 更新状态显示
    updateStatus(provider) {
        const statusElement = document.getElementById(`${provider}Status`);
        const input = document.getElementById(`${provider}Key`);
        
        if (!statusElement || !input) return;

        const value = input.value.trim();
        
        if (!value) {
            statusElement.className = 'badge bg-secondary';
            statusElement.textContent = '未配置';
        } else if (input.classList.contains('is-valid')) {
            statusElement.className = 'badge bg-success';
            statusElement.textContent = '已配置';
        } else if (input.classList.contains('is-invalid')) {
            statusElement.className = 'badge bg-warning';
            statusElement.textContent = '格式错误';
        } else {
            statusElement.className = 'badge bg-info';
            statusElement.textContent = '待验证';
        }
    }

    // 更新所有状态
    updateAllStatus() {
        ['siliconflow', 'doubao', 'deepseek'].forEach(provider => {
            this.updateStatus(provider);
        });
    }

    // 测试API Key
    async testApiKey(provider) {
        const input = document.getElementById(`${provider}Key`);
        const button = document.querySelector(`[data-provider="${provider}"]`);
        const statusElement = document.getElementById(`${provider}Status`);

        if (!input || !button || !statusElement) {
            return;
        }

        const apiKey = input.value.trim();
        if (!apiKey) {
            this.showToast('请先输入API Key', 'warning');
            return;
        }

        // 设置测试状态
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split"></i> 测试中...';
        statusElement.className = 'badge bg-info';
        statusElement.textContent = '测试中...';

        try {
            // 调用真实的API测试接口
            const testResult = await this.callApiTest(provider, apiKey);

            if (testResult.success) {
                // 测试成功
                statusElement.className = 'badge bg-success';
                statusElement.textContent = '连接正常';
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');

                let message = `${this.getProviderName(provider)} API测试成功！`;
                if (testResult.details) {
                    message += ` (模型: ${testResult.details.model})`;
                }
                this.showToast(message, 'success');
            } else {
                // 测试失败
                statusElement.className = 'badge bg-danger';
                statusElement.textContent = '连接失败';
                input.classList.remove('is-valid');
                input.classList.add('is-invalid');

                this.showToast(`${this.getProviderName(provider)} API测试失败：${testResult.message}`, 'error');
            }

        } catch (error) {
            // 网络错误或其他异常
            statusElement.className = 'badge bg-danger';
            statusElement.textContent = '测试异常';
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');

            this.showToast(`${this.getProviderName(provider)} API测试异常：${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-check-circle"></i> 测试';
        }
    }

    // 调用真实的API测试接口
    async callApiTest(provider, apiKey) {
        try {
            const response = await fetch('/settings/test-api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider: provider,
                    apiKey: apiKey
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('API测试请求失败:', error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络连接');
            } else {
                throw error;
            }
        }
    }

    // 模拟API测试（备用方法）
    async simulateApiTest(provider, apiKey) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // 基本格式验证
        let isValid = false;
        switch (provider) {
            case 'siliconflow':
            case 'deepseek':
                isValid = apiKey.startsWith('sk-') && apiKey.length > 20;
                break;
            case 'doubao':
                isValid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(apiKey);
                break;
        }

        if (!isValid) {
            throw new Error('API Key格式不正确');
        }

        // 模拟随机失败（10%概率）
        if (Math.random() < 0.1) {
            throw new Error('网络连接超时');
        }
    }

    // 获取服务商显示名称
    getProviderName(provider) {
        const names = {
            siliconflow: '硅基流动',
            doubao: '豆包',
            deepseek: 'DeepSeek'
        };
        return names[provider] || provider;
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建toast容器（如果不存在）
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        // 创建toast元素
        const toastId = 'toast_' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' : 
                       type === 'error' ? 'bg-danger' : 
                       type === 'warning' ? 'bg-warning' : 'bg-info';
        
        const iconClass = type === 'success' ? 'bi-check-circle' : 
                         type === 'error' ? 'bi-x-circle' : 
                         type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';

        const toastHtml = `
            <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" id="${toastId}">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${iconClass} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                            data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);

        // 显示toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        toast.show();

        // 自动清理
        setTimeout(() => {
            if (toastElement) {
                toastElement.remove();
            }
        }, 4000);
    }

    // 切换密码可见性
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = document.querySelector(`[data-target="${inputId}"]`);
        const icon = button ? button.querySelector('i') : null;

        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'bi bi-eye';
        }
    }

    // 清空所有配置
    clearAllConfig() {
        if (confirm('确定要清空所有API配置吗？此操作不可撤销。')) {
            this.apiKeys = {
                siliconflow: '',
                doubao: '',
                deepseek: ''
            };

            // 清空输入框
            ['siliconflowKey', 'doubaoKey', 'deepseekKey'].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.value = '';
                    input.classList.remove('is-valid', 'is-invalid');
                }
            });

            // 保存到本地存储
            localStorage.removeItem('globalAIConfig');

            // 更新状态
            this.updateAllStatus();

            // 广播配置更新
            this.broadcastConfigUpdate();

            this.showToast('所有配置已清空', 'success');
        }
    }

    // 加载默认配置
    loadDefaultConfig() {
        if (confirm('确定要恢复默认配置吗？当前配置将被覆盖。')) {
            // 这里可以设置一些默认的API Key（如果有的话）
            this.apiKeys = {
                siliconflow: '',
                doubao: '',
                deepseek: ''
            };

            // 更新输入框
            Object.keys(this.apiKeys).forEach(provider => {
                const input = document.getElementById(`${provider}Key`);
                if (input) {
                    input.value = this.apiKeys[provider];
                    input.classList.remove('is-valid', 'is-invalid');
                }
            });

            // 更新状态
            this.updateAllStatus();

            this.showToast('已恢复默认配置', 'info');
        }
    }
}

// 全局变量
let globalSettings;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    globalSettings = new GlobalSettingsManager();
});
