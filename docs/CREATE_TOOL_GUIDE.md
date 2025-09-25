# 🛠️ 快速创建新工具指南

## 📖 概述

本指南介绍如何使用自动化脚本快速创建新工具，只需要几分钟就能生成完整的工具框架。

## 🚀 快速开始

### 方法一：使用交互式脚本（推荐）

```bash
./create-tool.sh
```

脚本会引导您输入：
- 工具中文名称（如：开发工具）
- 工具英文名称（如：devtools）
- 图标选择（提供常用选项）

### 方法二：直接使用Node.js脚本

```bash
node scripts/create-tool.js "开发工具" devtools bi-code-slash
```

参数说明：
- 第1个参数：中文名称（用于显示）
- 第2个参数：英文名称（用于文件名和路由）
- 第3个参数：图标类名（可选，默认为bi-tools）
- `--overwrite`：强制覆盖现有文件（可选）

### 覆盖现有工具

如果工具已存在，可以使用覆盖选项：

```bash
# 交互式脚本会自动检测并询问是否覆盖
./create-tool.sh

# 或直接使用覆盖参数
node scripts/create-tool.js "字符工具" ascii bi-code-slash --overwrite
```

## 📁 自动生成的文件

脚本会自动创建以下文件：

### 1. 路由文件 (`routes/xxx.js`)
- 基础路由结构
- GET路由显示页面
- POST API接口
- 错误处理

### 2. 服务文件 (`services/xxxService.js`)
- 服务类结构
- 处理方法模板
- 统计方法模板
- 错误处理

### 3. 页面模板 (`views/xxx.ejs`)
- 完整的HTML结构
- Bootstrap 5样式
- 响应式布局
- 基础表单组件

### 4. 前端脚本 (`public/js/xxx.js`)
- ES6类结构
- Electron环境检测
- 事件绑定
- AJAX请求处理
- 提示消息系统

### 5. 自动修改现有文件
- `app.js`：添加路由导入和注册
- `views/partials/sidebar.ejs`：添加导航项和高亮逻辑

## 🎨 图标选择

### 常用图标
- `bi-tools` - 通用工具
- `bi-code-slash` - 开发工具
- `bi-file-text` - 文本处理
- `bi-calculator` - 计算工具
- `bi-gear` - 设置配置
- `bi-palette` - 设计工具
- `bi-database` - 数据处理
- `bi-cloud` - 云服务

### 更多图标
访问 [Bootstrap Icons](https://icons.getbootstrap.com/) 查看完整图标库

## 📝 开发流程

### 1. 创建工具
```bash
./create-tool.sh
```

### 2. 重启应用
```bash
yarn electron
# 或
./start.sh
```

### 3. 访问新工具
打开 `http://localhost:3000/你的英文名`

### 4. 开发业务逻辑

#### 服务层开发 (`services/xxxService.js`)
```javascript
async process(data) {
    // TODO: 实现您的核心业务逻辑
    // 例如：文件处理、数据转换、API调用等
    
    return {
        success: true,
        message: '处理成功',
        data: processedData
    };
}
```

#### 前端交互 (`public/js/xxx.js`)
```javascript
async processData() {
    // TODO: 获取用户输入
    // TODO: 调用后端API
    // TODO: 显示处理结果
}
```

#### 页面界面 (`views/xxx.ejs`)
```html
<!-- TODO: 添加您的表单组件 -->
<!-- TODO: 添加结果显示区域 -->
<!-- TODO: 添加使用说明 -->
```

## 🔧 高级定制

### 添加Electron功能

如果需要访问文件系统，在 `electron-main.js` 中添加IPC处理器：

```javascript
// 添加新的IPC处理器
ipcMain.handle('your-tool-action', async (event, data) => {
    // 处理逻辑
    return result;
});
```

在 `preload.js` 中暴露API：

```javascript
// 暴露给渲染进程
yourToolAction: (data) => ipcRenderer.invoke('your-tool-action', data)
```

### 添加数据库操作

在服务类中使用数据库：

```javascript
constructor() {
    this.dbService = require('./databaseService');
}

async saveData(data) {
    // 使用数据库服务
    return await this.dbService.save(data);
}
```

## 📋 最佳实践

### 1. 命名规范
- 英文名使用小写字母和数字
- 中文名简洁明了
- 文件名保持一致性

### 2. 代码结构
- 业务逻辑放在服务层
- 前端只负责交互和显示
- 错误处理要完善

### 3. 用户体验
- 提供清晰的使用说明
- 添加加载状态提示
- 处理各种异常情况

### 4. 测试验证
- 测试基本功能
- 验证错误处理
- 检查响应式布局

## 🐛 常见问题

### Q: 创建后访问404？
A: 请确保重启了应用，新路由需要重新加载

### Q: 样式显示异常？
A: 检查CSS文件路径，确保Bootstrap正确加载

### Q: Electron功能不工作？
A: 确保在Electron环境中运行，检查preload.js配置

### Q: 如何删除创建的工具？
A: 手动删除生成的文件，并从app.js和sidebar.ejs中移除相关代码

## 💡 示例

创建一个文本处理工具：

```bash
./create-tool.sh
# 输入：文本处理器
# 输入：textprocessor  
# 选择：bi-file-text
```

生成的工具将包含：
- 文本输入框
- 处理按钮
- 结果显示区域
- 基础的前后端交互

您只需要在 `services/textprocessorService.js` 中实现具体的文本处理逻辑即可！

## 🎯 总结

使用这个自动化脚本，您可以：
- ⚡ **30秒创建**：完整的工具框架
- 🎨 **开箱即用**：包含所有必要组件
- 🔧 **易于扩展**：清晰的代码结构
- 📱 **响应式**：自动适配各种屏幕
- 🖥️ **Electron支持**：桌面应用功能

现在添加新功能就像写单个程序一样简单！
