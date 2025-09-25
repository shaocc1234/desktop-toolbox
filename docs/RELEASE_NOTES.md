# 🎉 Desktop Toolbox v1.0.0 首次发布

欢迎使用 **Desktop Toolbox（桌面工具集）**！这是一个开箱即用的多功能桌面工具集，集成了图片处理、文件管理等实用功能。

## ✨ 核心功能模块

### 📤 Upload 上传功能
- **图床服务支持**：PicGo、Catbox 等主流图床
- **图片压缩处理**：自动优化图片大小
- **数据库记录管理**：完整的上传历史记录
- **安全API密钥管理**：前端管理，避免泄露

### 🖼️ Gallery 图库管理
- **图片展示和预览**：高质量图片浏览体验
- **搜索和分类筛选**：快速找到目标图片
- **批量操作**：支持批量删除、编辑等操作
- **模态框预览**：大图预览功能

### 🔧 Process 图片处理
- **图片格式转换**：支持多种格式互转
- **批量处理**：一次处理多张图片
- **文件保存**：灵活的保存选项

### 📁 Folder 文件夹管理
- **目录扫描**：快速扫描文件夹结构
- **空文件夹清理**：自动清理无用文件夹
- **文件分类**：智能文件分类管理

## 🚀 项目特色

- ✅ **开箱即用** - 零配置启动，下载即可使用
- ✅ **插件化架构** - 支持快速扩展新功能模块
- ✅ **create-tool.sh脚本** - 一键创建新工具模块
- ✅ **现代化界面** - Bootstrap 5 响应式设计
- ✅ **安全设计** - API密钥前端管理，保护隐私
- ✅ **跨平台支持** - macOS 和 Windows 全平台覆盖

## 📦 下载安装

### macOS 用户
- **Intel Mac**: 下载 `桌面工具集-1.0.1-mac.zip` (108MB)
- **Apple Silicon Mac**: 下载 `桌面工具集-1.0.1-arm64-mac.zip` (108MB)
- **DMG安装包 (Intel)**: 下载 `桌面工具集-1.0.1.dmg` (112MB)
- **DMG安装包 (Apple Silicon)**: 下载 `桌面工具集-1.0.1-arm64.dmg` (112MB)

### Windows 用户
- **Windows (ARM64)**: 下载 `桌面工具集 Setup 1.0.1.exe` (91MB)

## 🛠️ 技术栈

- **前端框架**: Bootstrap 5 + EJS模板引擎
- **后端服务**: Node.js + Express.js
- **桌面应用**: Electron 38.1.2
- **数据库**: SQLite
- **图片处理**: Sharp
- **文件上传**: Multer

## 🚀 快速开始

1. 下载对应平台的安装包
2. 安装并启动应用
3. 根据需要配置API密钥（如PicGo图床）
4. 开始使用各种工具功能

## 🔧 开发扩展

项目支持快速扩展新功能：

```bash
# 使用脚本创建新工具
./create-tool.sh

# 选择模板类型
# 1. 基础模板 - 简单的工具页面
# 2. 增强模板 - 包含更多功能的完整模板
```

## 📝 更新日志

### v1.0.1 (2025-09-21)
- 🔧 **重要修复**: 解决打包后应用无法启动的问题
- ✅ 修复combined-stream依赖缺失
- ✅ 修复Sharp模块在打包环境中的加载问题
- ✅ 修复spawn ENOTDIR错误
- 🛠️ 优化Electron主进程启动逻辑
- 📦 完善asarUnpack配置，正确解包所有必要文件
- 🚀 现在应用可以完美运行！

### v1.0.0 (2025-09-21)
- 🎉 首次发布
- ✨ 实现四大核心功能模块
- 🚀 支持 macOS 和 Windows 平台
- 🔧 提供插件化扩展能力
- 🛡️ 实现安全的API密钥管理
- ⚠️ 已知问题：打包后应用启动失败（已在v1.0.1修复）

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

- 📋 [提交问题](https://github.com/shaocc1234/desktop-toolbox/issues)
- 🔧 [贡献代码](https://github.com/shaocc1234/desktop-toolbox/pulls)
- 📖 [查看文档](https://github.com/shaocc1234/desktop-toolbox/blob/main/README.md)

## 📄 开源协议

本项目采用 [MIT License](https://github.com/shaocc1234/desktop-toolbox/blob/main/LICENSE) 开源协议。

---

**感谢使用 Desktop Toolbox！** 🎊

如有问题或建议，欢迎通过 [GitHub Issues](https://github.com/shaocc1234/desktop-toolbox/issues) 联系我们。
