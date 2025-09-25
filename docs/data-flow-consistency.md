# 数据流一致性规范

## 🎯 目标

确保数据在整个应用中的流动保持一致性，避免因数据流断裂导致的功能异常。

---

## 📊 数据流分析方法

### 1. 数据流映射

#### 完整数据流图示例
```
用户输入 → 前端验证 → 数据存储 → 数据传递 → 后端处理 → 结果返回
    ↓           ↓           ↓           ↓           ↓           ↓
[输入框]   [JS验证]   [localStorage] [API调用]   [服务处理]   [UI更新]
```

#### API密钥数据流示例
```
设置页面输入 → 前端保存 → 全局配置 → 重命名页面 → 后端传递 → AI服务调用
      ↓            ↓          ↓          ↓          ↓          ↓
[doubaoKey输入框] [保存到localStorage] [globalConfig对象] [multiAI配置] [API请求] [模型调用]
```

### 2. 数据流追踪工具

#### 调试日志模板
```javascript
// 数据流追踪日志
const traceDataFlow = (stage, data, context = {}) => {
    console.log(`🔍 [DATA-FLOW] ${stage}:`, {
        data: data,
        context: context,
        timestamp: new Date().toISOString(),
        location: new Error().stack.split('\n')[2]
    });
};

// 使用示例
traceDataFlow('INPUT', apiKey, { source: 'settings-page' });
traceDataFlow('STORAGE', apiKey, { method: 'localStorage' });
traceDataFlow('RETRIEVAL', apiKey, { source: 'globalConfig' });
traceDataFlow('TRANSMISSION', apiKey, { target: 'backend-api' });
```

#### 数据流验证函数
```javascript
const validateDataFlow = (expectedData, actualData, stage) => {
    if (expectedData !== actualData) {
        console.error(`❌ [DATA-FLOW-ERROR] ${stage}:`, {
            expected: expectedData,
            actual: actualData,
            stage: stage
        });
        throw new Error(`Data flow broken at ${stage}`);
    }
    console.log(`✅ [DATA-FLOW-OK] ${stage}: Data consistent`);
};
```

---

## 🔧 数据一致性原则

### 1. 单一数据源原则 (Single Source of Truth)

#### ❌ 错误示例：多个数据源
```javascript
// 问题：同一数据有多个获取方式，容易不一致
class BadExample {
    getAPIKey() {
        // 方式1：从DOM获取
        const fromDOM = document.getElementById('apiKey')?.value;
        
        // 方式2：从localStorage获取
        const fromStorage = localStorage.getItem('apiKey');
        
        // 方式3：从全局配置获取
        const fromConfig = this.globalConfig.apiKey;
        
        // 不知道该用哪个，容易出错
        return fromDOM || fromStorage || fromConfig;
    }
}
```

#### ✅ 正确示例：单一数据源
```javascript
// 解决方案：统一的数据获取方式
class GoodExample {
    constructor() {
        this.configManager = new ConfigManager();
    }
    
    getAPIKey(provider) {
        // 唯一的数据获取入口
        return this.configManager.getAPIKey(provider);
    }
}

class ConfigManager {
    getAPIKey(provider) {
        // 统一的获取逻辑，优先级明确
        return this.globalConfig[provider] || 
               localStorage.getItem(`${provider}Key`) || 
               '';
    }
    
    setAPIKey(provider, key) {
        // 统一的设置逻辑
        this.globalConfig[provider] = key;
        localStorage.setItem(`${provider}Key`, key);
        this.notifyConfigChange(provider, key);
    }
}
```

### 2. 命名一致性原则

#### ❌ 错误示例：命名不一致
```javascript
// 问题：同一概念使用不同名称
const doubaoKey = document.getElementById('doubaoKey')?.value;
const doubao_api_key = localStorage.getItem('doubao_api_key');
const doubaoApiKey = this.config.doubaoApiKey;
const doubao = this.globalConfig.doubao;
```

#### ✅ 正确示例：统一命名
```javascript
// 解决方案：在所有地方使用相同的命名规范
const PROVIDER_KEYS = {
    DOUBAO: 'doubaoApiKey',
    SILICONFLOW: 'siliconflowApiKey',
    DEEPSEEK: 'deepseekApiKey'
};

// HTML中
<input id="doubaoApiKey" />

// JavaScript中
const doubaoApiKey = document.getElementById('doubaoApiKey')?.value;
const doubaoApiKey = localStorage.getItem('doubaoApiKey');
const doubaoApiKey = this.globalConfig.doubaoApiKey;
```

### 3. 数据格式一致性原则

#### ❌ 错误示例：格式不一致
```javascript
// 问题：同一数据在不同地方使用不同格式
// 前端发送
const requestData = {
    apiKeys: { doubao: 'key1', siliconflow: 'key2' }
};

// 后端期望
const expectedData = {
    api_keys: { doubao_key: 'key1', siliconflow_key: 'key2' }
};
```

#### ✅ 正确示例：格式统一
```javascript
// 解决方案：定义统一的数据格式
const API_KEY_FORMAT = {
    apiKeys: {
        doubao: String,
        siliconflow: String,
        deepseek: String
    }
};

// 前端发送
const requestData = {
    apiKeys: {
        doubao: 'key1',
        siliconflow: 'key2',
        deepseek: 'key3'
    }
};

// 后端接收
const { apiKeys } = req.body;
const doubaoKey = apiKeys.doubao;
```

---

## 🔍 数据流检查清单

### 输入阶段检查
- [ ] **输入源确认**
  - [ ] 确认所有数据输入点（表单、API、文件等）
  - [ ] 验证输入数据格式规范
  - [ ] 检查输入验证逻辑完整性
  
- [ ] **输入处理一致性**
  ```javascript
  // 检查点：输入处理逻辑
  const processInput = (input) => {
      // 1. 数据清理
      const cleaned = input.trim();
      // 2. 格式验证
      if (!isValidFormat(cleaned)) throw new Error('Invalid format');
      // 3. 数据转换
      return normalizeData(cleaned);
  };
  ```

### 传输阶段检查
- [ ] **传输方式一致性**
  - [ ] 确认数据传递方式（参数、全局变量、事件等）
  - [ ] 验证传输格式不变
  - [ ] 检查传输过程中的数据转换
  
- [ ] **跨模块传输**
  ```javascript
  // 检查点：跨模块数据传递
  // 发送方
  const sendData = (data) => {
      const formattedData = formatForTransmission(data);
      return moduleB.receiveData(formattedData);
  };
  
  // 接收方
  const receiveData = (data) => {
      const parsedData = parseReceivedData(data);
      return processData(parsedData);
  };
  ```

### 存储阶段检查
- [ ] **存储位置一致性**
  - [ ] 确认数据存储位置（localStorage、sessionStorage、数据库等）
  - [ ] 验证存储键名规范
  - [ ] 检查存储格式标准化
  
- [ ] **存储同步性**
  ```javascript
  // 检查点：多存储位置同步
  const syncStorage = (key, value) => {
      // 同时更新所有存储位置
      localStorage.setItem(key, value);
      this.globalConfig[key] = value;
      this.notifyStorageChange(key, value);
  };
  ```

### 使用阶段检查
- [ ] **获取方式一致性**
  - [ ] 确认数据获取的统一入口
  - [ ] 验证获取逻辑的优先级
  - [ ] 检查默认值处理
  
- [ ] **使用格式一致性**
  ```javascript
  // 检查点：数据使用格式
  const useData = (key) => {
      const data = this.getData(key); // 统一获取方式
      if (!data) return this.getDefaultValue(key); // 统一默认值
      return this.formatForUse(data); // 统一格式化
  };
  ```

---

## 🛠️ 实用工具和模板

### 1. 数据流监控工具

```javascript
class DataFlowMonitor {
    constructor() {
        this.flows = new Map();
        this.enabled = process.env.NODE_ENV === 'development';
    }
    
    track(flowId, stage, data) {
        if (!this.enabled) return;
        
        if (!this.flows.has(flowId)) {
            this.flows.set(flowId, []);
        }
        
        this.flows.get(flowId).push({
            stage,
            data: JSON.parse(JSON.stringify(data)), // 深拷贝
            timestamp: Date.now()
        });
        
        console.log(`🔍 [FLOW-${flowId}] ${stage}:`, data);
    }
    
    validate(flowId, expectedStages) {
        const flow = this.flows.get(flowId);
        if (!flow) {
            console.error(`❌ Flow ${flowId} not found`);
            return false;
        }
        
        const actualStages = flow.map(f => f.stage);
        const missing = expectedStages.filter(s => !actualStages.includes(s));
        
        if (missing.length > 0) {
            console.error(`❌ Flow ${flowId} missing stages:`, missing);
            return false;
        }
        
        console.log(`✅ Flow ${flowId} validation passed`);
        return true;
    }
    
    getFlowReport(flowId) {
        const flow = this.flows.get(flowId);
        if (!flow) return null;
        
        return {
            flowId,
            stages: flow.length,
            duration: flow[flow.length - 1].timestamp - flow[0].timestamp,
            details: flow
        };
    }
}

// 使用示例
const monitor = new DataFlowMonitor();

// 在关键点追踪数据流
monitor.track('api-key-flow', 'input', { source: 'settings', key: 'xxx...' });
monitor.track('api-key-flow', 'storage', { method: 'localStorage' });
monitor.track('api-key-flow', 'retrieval', { source: 'globalConfig' });
monitor.track('api-key-flow', 'transmission', { target: 'backend' });

// 验证数据流完整性
monitor.validate('api-key-flow', ['input', 'storage', 'retrieval', 'transmission']);
```

### 2. 配置管理模板

```javascript
class ConfigManager {
    constructor() {
        this.config = {};
        this.listeners = new Map();
        this.storageKey = 'app-config';
        this.load();
    }
    
    // 统一的配置获取
    get(key, defaultValue = null) {
        const value = this.config[key];
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return value;
    }
    
    // 统一的配置设置
    set(key, value) {
        const oldValue = this.config[key];
        this.config[key] = value;
        
        // 持久化存储
        this.save();
        
        // 通知变更
        this.notifyChange(key, value, oldValue);
    }
    
    // 批量设置
    setMultiple(updates) {
        const changes = [];
        
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.config[key];
            this.config[key] = value;
            changes.push({ key, value, oldValue });
        });
        
        this.save();
        
        changes.forEach(({ key, value, oldValue }) => {
            this.notifyChange(key, value, oldValue);
        });
    }
    
    // 监听配置变更
    onChange(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    // 通知变更
    notifyChange(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => {
            try {
                callback(newValue, oldValue, key);
            } catch (error) {
                console.error(`Error in config change callback for ${key}:`, error);
            }
        });
    }
    
    // 加载配置
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.config = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = {};
        }
    }
    
    // 保存配置
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }
    
    // 获取所有配置
    getAll() {
        return { ...this.config };
    }
    
    // 重置配置
    reset() {
        this.config = {};
        this.save();
    }
}

// 使用示例
const config = new ConfigManager();

// 设置API密钥
config.set('doubaoApiKey', 'your-api-key');

// 获取API密钥
const apiKey = config.get('doubaoApiKey', '');

// 监听变更
config.onChange('doubaoApiKey', (newKey, oldKey) => {
    console.log('API key changed:', { newKey, oldKey });
    // 更新相关组件
});
```

### 3. 数据验证模板

```javascript
class DataValidator {
    static validateAPIKeyFlow(data) {
        const required = ['apiKeys', 'priorities'];
        const missing = required.filter(key => !(key in data));
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        // 验证API密钥格式
        const { apiKeys } = data;
        const providers = ['doubao', 'siliconflow', 'deepseek'];
        
        providers.forEach(provider => {
            if (apiKeys[provider] && typeof apiKeys[provider] !== 'string') {
                throw new Error(`Invalid API key format for ${provider}`);
            }
        });
        
        return true;
    }
    
    static validateConfigConsistency(frontendConfig, backendConfig) {
        const inconsistencies = [];
        
        // 检查API密钥一致性
        Object.keys(frontendConfig.apiKeys || {}).forEach(provider => {
            const frontendKey = frontendConfig.apiKeys[provider];
            const backendKey = backendConfig.apiKeys?.[provider];
            
            if (frontendKey !== backendKey) {
                inconsistencies.push({
                    field: `apiKeys.${provider}`,
                    frontend: frontendKey,
                    backend: backendKey
                });
            }
        });
        
        if (inconsistencies.length > 0) {
            console.error('Config inconsistencies found:', inconsistencies);
            return false;
        }
        
        return true;
    }
}
```

---

## 📋 日常检查清单

### 开发阶段
- [ ] 新增数据字段时，确保在所有相关位置使用相同名称
- [ ] 修改数据格式时，同步更新所有使用位置
- [ ] 添加数据流追踪日志，便于调试
- [ ] 编写数据流测试用例

### 代码审查阶段
- [ ] 检查数据获取方式是否一致
- [ ] 验证数据传递格式是否统一
- [ ] 确认错误处理逻辑完整
- [ ] 评估数据流性能影响

### 测试阶段
- [ ] 端到端数据流测试
- [ ] 边界条件数据测试
- [ ] 数据一致性验证测试
- [ ] 并发数据访问测试

### 部署阶段
- [ ] 生产环境数据流验证
- [ ] 监控数据流异常
- [ ] 准备数据流回滚方案
- [ ] 建立数据流监控告警

---

**记住**：数据流的一致性是系统稳定性的基础。投入时间建立完善的数据流管理机制，能够避免大量的调试和维护工作。

---

## 🚨 常见数据流问题案例

### 案例1：API密钥传递问题
**问题描述**：豆包API密钥在设置页面配置成功，但在处理页面无法使用

**根本原因**：
- API密钥输入框从处理页面迁移到设置页面
- 前端代码仍然试图从处理页面获取密钥
- 数据流断裂：设置页面 ❌ 处理页面

**解决方案**：
```javascript
// 错误的获取方式
const apiKey = document.getElementById('doubaoKey')?.value; // 在处理页面找不到

// 正确的获取方式
const apiKey = this.globalConfig.doubaoApiKey; // 从全局配置获取
```

**预防措施**：
- 建立统一的配置管理系统
- 使用数据流追踪工具
- 进行端到端测试验证

### 案例2：配置对象结构不一致
**问题描述**：前端发送的配置格式与后端期望的格式不匹配

**根本原因**：
- 前端使用 `multiAI` 字段名
- 后端期望 `multiAIConfig` 字段名
- 接口契约不一致

**解决方案**：
```javascript
// 兼容性处理
const config = options.multiAIConfig || options.multiAI;
```

**预防措施**：
- 定义明确的接口规范
- 使用类型检查工具
- 建立接口测试用例
