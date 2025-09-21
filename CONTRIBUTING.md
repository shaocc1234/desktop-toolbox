# 🤝 贡献指南

感谢您对本项目的关注！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 本地开发
```bash
# 克隆项目
git clone https://github.com/shaocc1234/desktop-toolbox.git
cd desktop-toolbox

# 安装依赖
npm install

# 启动开发服务器
npm start

# 启动桌面应用
npm run electron
```

## 📝 贡献方式

### 🐛 报告问题
- 使用 [Issues](https://github.com/shaocc1234/desktop-toolbox/issues) 报告 bug
- 提供详细的复现步骤和环境信息
- 如果可能，请提供错误截图

### 💡 功能建议
- 在 Issues 中提出新功能建议
- 详细描述功能需求和使用场景
- 讨论实现方案

### 🔧 代码贡献
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📋 开发规范

### 代码风格
- 使用 2 空格缩进
- 使用中文注释
- 遵循现有的代码结构

### 提交信息
- 使用中文描述
- 格式：`类型: 简短描述`
- 类型：feat(新功能)、fix(修复)、docs(文档)、style(样式)、refactor(重构)

### 测试
- 确保新功能有相应的测试
- 运行 `npm test` 确保所有测试通过

## 🎯 项目架构

### 目录结构
```
├── routes/          # 路由控制器
├── services/        # 业务逻辑服务
├── views/           # EJS 模板
├── public/          # 静态资源
├── scripts/         # 工具脚本
└── docs/            # 文档
```

### 核心工具模块
- **📤 Upload**: 图片上传和图床服务
- **🖼️ Gallery**: 图库管理和展示
- **🔧 Process**: 图片处理和转换
- **📁 Folder**: 文件夹管理和清理

## 📞 联系方式

如有问题，请通过以下方式联系：
- 创建 Issue
- 发送邮件到 [1203304560@qq.com]

再次感谢您的贡献！🎉
