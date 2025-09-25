# 开发规范与最佳实践

## 📋 目录

- [架构变更管理](#架构变更管理)
- [数据流一致性](#数据流一致性)
- [代码质量检查](#代码质量检查)
- [测试规范](#测试规范)
- [常见问题预防](#常见问题预防)

## 🏗️ 架构变更管理

### 变更前检查清单

在进行任何架构调整前，必须完成以下检查：

#### 1. 影响范围分析
- [ ] 识别所有受影响的文件和模块
- [ ] 列出所有相关的数据流路径
- [ ] 确认所有依赖关系
- [ ] 评估对现有功能的影响

#### 2. 代码搜索验证
```bash
# 搜索所有相关的标识符引用
grep -r "旧标识符" . --include="*.js" --include="*.ejs" --include="*.html"
grep -r "相关函数名" . --include="*.js"
grep -r "DOM元素ID" . --include="*.ejs" --include="*.html"
```

#### 3. 数据流追踪
- [ ] 从数据输入点开始追踪
- [ ] 确认中间处理环节
- [ ] 验证最终使用位置
- [ ] 检查错误处理路径

### 变更执行规范

#### 1. 分步骤执行
1. **第一步**：更新数据模型和接口
2. **第二步**：更新后端处理逻辑
3. **第三步**：更新前端获取和使用逻辑
4. **第四步**：更新UI界面和交互
5. **第五步**：进行完整测试

#### 2. 向后兼容性
- 保持旧接口在过渡期内可用
- 添加适当的弃用警告
- 提供迁移指南和工具

## 🔄 数据流一致性

### 核心原则

#### 1. 单一数据源 (Single Source of Truth)
```javascript
// ❌ 错误：多个数据源
const apiKey1 = document.getElementById('apiKey')?.value;
const apiKey2 = localStorage.getItem('apiKey');
const apiKey3 = this.globalConfig.apiKey;

// ✅ 正确：统一数据源
const apiKey = this.getAPIKey(); // 统一获取方法
```

#### 2. 统一命名规范
```javascript
// ❌ 错误：命名不一致
doubaoKey, doubao_key, doubaoApiKey, doubao

// ✅ 正确：统一命名
doubaoApiKey (在所有地方使用相同名称)
```

#### 3. 集中配置管理
```javascript
// ✅ 配置管理类
class ConfigManager {
    getAPIKey(provider) {
        // 统一的API密钥获取逻辑
    }
    
    setAPIKey(provider, key) {
        // 统一的API密钥设置逻辑
    }
}
```

### 数据流检查清单

#### 输入阶段
- [ ] 确认数据输入点（表单、API等）
- [ ] 验证数据验证逻辑
- [ ] 检查数据格式转换

#### 传输阶段
- [ ] 确认数据传递方式（参数、全局变量等）
- [ ] 验证数据序列化/反序列化
- [ ] 检查跨页面/模块传递

#### 存储阶段
- [ ] 确认存储位置（localStorage、数据库等）
- [ ] 验证存储格式一致性
- [ ] 检查存储更新逻辑

#### 使用阶段
- [ ] 确认数据获取方式
- [ ] 验证数据使用逻辑
- [ ] 检查错误处理机制

## 🔍 代码质量检查

### 日常检查清单

#### 1. 命名一致性
- [ ] 变量名在所有文件中保持一致
- [ ] 函数名遵循统一的命名规范
- [ ] DOM元素ID在HTML和JS中匹配

#### 2. 依赖关系
- [ ] 确认所有依赖的模块存在
- [ ] 验证函数调用的参数匹配
- [ ] 检查事件监听器的目标元素存在

#### 3. 错误处理
- [ ] 添加适当的try-catch块
- [ ] 提供有意义的错误信息
- [ ] 实现优雅的降级机制

### 代码审查要点

#### 1. 跨模块交互
```javascript
// 检查点：确保接口契约一致
// 前端调用
const result = await api.processFile(data);

// 后端实现
app.post('/api/process', (req, res) => {
    // 确保参数名称和结构匹配
    const { data } = req.body;
});
```

#### 2. 配置传递
```javascript
// 检查点：配置对象结构一致
// 发送端
const config = {
    apiKeys: { doubao: 'xxx' },
    priorities: { vision: [...] }
};

// 接收端
const { apiKeys, priorities } = config;
const doubaoKey = apiKeys.doubao; // 确保字段名匹配
```

## 🧪 测试规范

### 端到端测试清单

#### 1. 用户场景测试
- [ ] 完整的用户操作流程
- [ ] 跨页面功能验证
- [ ] 配置保存和加载测试

#### 2. 数据流测试
```javascript
// 测试示例：API密钥传递
describe('API Key Flow', () => {
    it('should pass API key from settings to processing', async () => {
        // 1. 在设置页面输入API密钥
        await setAPIKey('doubao', 'test-key');
        
        // 2. 切换到处理页面
        await navigateToProcessing();
        
        // 3. 验证API密钥正确传递
        const usedKey = await getUsedAPIKey();
        expect(usedKey).toBe('test-key');
    });
});
```

#### 3. 边界条件测试
- [ ] 空值处理
- [ ] 无效输入处理
- [ ] 网络错误处理
- [ ] 权限不足处理

### 自动化测试建议

#### 1. 单元测试
- 配置管理函数
- 数据转换函数
- 验证逻辑函数

#### 2. 集成测试
- API接口测试
- 数据库操作测试
- 第三方服务集成测试

#### 3. UI测试
- 表单提交流程
- 页面跳转逻辑
- 用户交互响应

## ⚠️ 常见问题预防

### 高风险操作识别

#### 1. DOM操作相关
```javascript
// ❌ 高风险：直接DOM查询
const value = document.getElementById('someId')?.value;

// ✅ 低风险：封装查询逻辑
const value = this.getFormValue('someId');
```

#### 2. 跨页面数据传递
```javascript
// ❌ 高风险：假设DOM元素存在
const apiKey = document.getElementById('apiKey').value;

// ✅ 低风险：检查元素存在性
const apiKeyElement = document.getElementById('apiKey');
const apiKey = apiKeyElement ? apiKeyElement.value : this.getStoredAPIKey();
```

#### 3. 配置对象访问
```javascript
// ❌ 高风险：直接属性访问
const key = config.apiKeys.doubao;

// ✅ 低风险：安全访问
const key = config?.apiKeys?.doubao || '';
```

### 调试技巧

#### 1. 数据流追踪
```javascript
// 添加调试日志追踪数据流
console.log('🔍 [DEBUG] API Key at input:', inputValue);
console.log('🔍 [DEBUG] API Key in config:', this.config.apiKey);
console.log('🔍 [DEBUG] API Key sent to backend:', requestData.apiKey);
```

#### 2. 状态验证
```javascript
// 在关键节点验证状态
const validateState = () => {
    console.log('🔍 [STATE] Current config:', this.config);
    console.log('🔍 [STATE] DOM elements:', {
        apiKeyInput: !!document.getElementById('apiKey'),
        submitButton: !!document.getElementById('submit')
    });
};
```

## 📝 文档维护

### 变更记录
每次架构变更都应该记录：
- 变更原因和目标
- 影响的文件和功能
- 测试验证结果
- 已知问题和解决方案

### 代码注释
```javascript
/**
 * 获取API密钥
 * 注意：API密钥配置在全局设置页面，不在当前页面
 * 数据流：设置页面输入 -> localStorage -> globalConfig -> 这里获取
 */
getAPIKey(provider) {
    return this.globalConfig[provider] || '';
}
```

---

**记住：预防胜于治疗。花费在规范和检查上的时间，远少于调试和修复的时间。**
