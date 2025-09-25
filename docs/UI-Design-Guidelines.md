# 桌面工具集 UI 设计规范

## 概述

本文档定义了桌面工具集应用程序的用户界面设计规范，基于 VS Code 设计语言，确保整个应用程序的视觉一致性和用户体验。

## 设计原则

### 1. 简洁性 (Simplicity)
- 优先使用简洁、清晰的设计元素
- 避免过度装饰和不必要的视觉噪音
- 信息层次清晰，重点突出

### 2. 一致性 (Consistency)
- 统一的色彩方案和间距规范
- 一致的组件行为和交互模式
- 跨页面的设计语言统一

### 3. 可访问性 (Accessibility)
- 确保足够的颜色对比度
- 支持键盘导航和屏幕阅读器
- 清晰的视觉反馈和状态指示

## 色彩系统

### 主题色彩

#### 浅色主题 (Light Theme)
```css
--bg-primary: #ffffff;      /* 主背景色 */
--bg-secondary: #f3f3f3;    /* 次要背景色 */
--bg-tertiary: #e8e8e8;     /* 第三级背景色 */
--bg-hover: #f0f0f0;        /* 悬停背景色 */
--text-primary: #333333;    /* 主文本色 */
--text-secondary: #616161;  /* 次要文本色 */
--text-muted: #8c8c8c;      /* 弱化文本色 */
--border-color: #e5e5e5;    /* 边框色 */
--accent-color: #007acc;    /* 强调色 */
```

#### 深色主题 (Dark Theme)
```css
--bg-primary: #1e1e1e;      /* 主背景色 */
--bg-secondary: #252526;    /* 次要背景色 */
--bg-tertiary: #2d2d30;     /* 第三级背景色 */
--bg-hover: #2a2d2e;        /* 悬停背景色 */
--text-primary: #cccccc;    /* 主文本色 */
--text-secondary: #9d9d9d;  /* 次要文本色 */
--text-muted: #6a6a6a;      /* 弱化文本色 */
--border-color: #3e3e42;    /* 边框色 */
--accent-color: #0e639c;    /* 强调色 */
```

### 状态色彩
- **成功色**: `#4ec9b0` (深色) / `#28a745` (浅色)
- **警告色**: `#ffcc02` (深色) / `#ffc107` (浅色)
- **危险色**: `#f48771` (深色) / `#dc3545` (浅色)
- **信息色**: `#9cdcfe` (深色) / `#17a2b8` (浅色)

## 间距系统

### 标准间距
- **xs**: `2px` - 最小间距
- **sm**: `4px` - 小间距
- **md**: `8px` - 中等间距
- **lg**: `12px` - 大间距
- **xl**: `16px` - 超大间距
- **xxl**: `24px` - 最大间距

### 组件间距
- **卡片间距**: `mb-2` (8px)
- **表单元素间距**: `mb-2` (8px)
- **按钮组间距**: `g-2` (8px)
- **页面内边距**: `p-3` (16px)

## 组件规范

### 1. 卡片 (Cards)

#### 基础卡片
```html
<div class="card mb-2">
    <div class="card-header py-2">
        <h6 class="mb-0">
            <i class="bi bi-icon me-2"></i>
            卡片标题
        </h6>
    </div>
    <div class="card-body py-2">
        <!-- 卡片内容 -->
    </div>
</div>
```

#### 强调卡片 (带左边框)
```html
<div class="card mb-2" style="border-left: 3px solid var(--accent-color);">
    <div class="card-body py-2">
        <!-- 卡片内容 -->
    </div>
</div>
```

#### 功能卡片 (带状态色边框)
```html
<div class="card mb-2">
    <div class="card-header py-2" style="background-color: var(--bg-secondary); border-left: 3px solid var(--bs-success);">
        <h6 class="mb-0">
            <i class="bi bi-icon me-2 text-success"></i>功能标题
        </h6>
    </div>
    <div class="card-body py-2">
        <!-- 功能内容 -->
    </div>
</div>
```

### 2. 按钮 (Buttons)

#### 主要按钮
```html
<button class="btn btn-primary btn-sm">
    <i class="bi bi-icon me-1"></i>主要操作
</button>
```

#### 次要按钮 (带边框)
```html
<button class="btn btn-outline-secondary btn-sm">
    <i class="bi bi-icon me-1"></i>次要操作
</button>
```

#### 按钮组
```html
<div class="btn-group w-100" role="group">
    <button class="btn btn-outline-primary btn-sm">
        <i class="bi bi-eye me-1"></i>预览
    </button>
    <button class="btn btn-primary btn-sm">
        <i class="bi bi-play me-1"></i>执行
    </button>
</div>
```

### 3. 表单控件 (Form Controls)

#### 输入组
```html
<div class="input-group input-group-sm">
    <span class="input-group-text">
        <i class="bi bi-icon"></i>
    </span>
    <input type="text" class="form-control" placeholder="输入内容">
    <button class="btn btn-outline-secondary" type="button">
        <i class="bi bi-search me-1"></i>操作
    </button>
</div>
```

#### 选择框
```html
<select class="form-select form-select-sm">
    <option value="option1">选项1</option>
    <option value="option2">选项2</option>
</select>
```

#### 复选框 (紧凑版)
```html
<div class="form-check form-check-sm">
    <input class="form-check-input" type="checkbox" id="checkId">
    <label class="form-check-label small" for="checkId">
        <i class="bi bi-icon me-1"></i>选项文本
    </label>
</div>
```

### 4. 提示信息 (Alerts)

#### 信息提示 (紧凑版)
```html
<div class="alert alert-info py-1 mb-2" style="font-size: 12px;">
    <i class="bi bi-info-circle me-1"></i>这是一条信息提示
</div>
```

#### 使用说明卡片
```html
<div class="card mb-2" style="border-left: 3px solid var(--accent-color);">
    <div class="card-body py-2">
        <div class="row align-items-center">
            <div class="col-auto">
                <i class="bi bi-info-circle text-primary"></i>
            </div>
            <div class="col">
                <div class="row g-2">
                    <div class="col-md-3">
                        <small><strong>1.</strong> 步骤一</small>
                    </div>
                    <div class="col-md-3">
                        <small><strong>2.</strong> 步骤二</small>
                    </div>
                    <!-- 更多步骤... -->
                </div>
                <div class="mt-1">
                    <small class="text-muted">
                        <i class="bi bi-shield-check text-success me-1"></i>
                        安全提示或补充说明
                    </small>
                </div>
            </div>
        </div>
    </div>
</div>
```

## 图标使用规范

### 图标库
使用 Bootstrap Icons 作为主要图标库

### 图标尺寸
- **小图标**: 默认尺寸 (16px)
- **中图标**: `fs-5` (20px)
- **大图标**: `fs-3` (28px)

### 图标颜色
- **主要图标**: 使用主题色 `text-primary`
- **状态图标**: 使用对应状态色 `text-success`, `text-warning`, `text-danger`
- **装饰图标**: 使用次要色 `text-secondary` 或 `text-muted`

### 常用图标映射
- **文件夹**: `bi-folder`, `bi-folder-fill`, `bi-folder2-open`
- **文件**: `bi-file-text`, `bi-file-image`, `bi-files`
- **操作**: `bi-search`, `bi-eye`, `bi-trash`, `bi-magic`
- **状态**: `bi-check-circle`, `bi-exclamation-triangle`, `bi-info-circle`
- **导航**: `bi-chevron-left`, `bi-chevron-right`, `bi-arrow-left`

## 响应式设计

### 断点
- **xs**: `< 576px` - 超小屏幕
- **sm**: `≥ 576px` - 小屏幕
- **md**: `≥ 768px` - 中等屏幕
- **lg**: `≥ 992px` - 大屏幕
- **xl**: `≥ 1200px` - 超大屏幕

### 响应式规则
- 在小屏幕上减少间距和字体大小
- 按钮组在移动端可能需要垂直堆叠
- 卡片在小屏幕上使用全宽布局

## 动画和过渡

### 标准过渡
```css
transition: all 0.2s ease;
```

### 悬停效果
- **背景色变化**: `background-color: var(--bg-hover)`
- **边框高亮**: `border-color: var(--accent-color)`
- **阴影增强**: `box-shadow: 0 2px 8px var(--shadow-hover)`

## 可访问性要求

### 颜色对比度
- 正常文本: 至少 4.5:1
- 大文本: 至少 3:1
- 非文本元素: 至少 3:1

### 焦点指示
```css
.btn:focus {
    box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb), 0.25);
}
```

### 键盘导航
- 所有交互元素必须支持键盘访问
- Tab 顺序应该符合逻辑流程
- 提供跳过链接用于快速导航

## 实施指南

### 1. 开发流程
1. 设计阶段参考本规范
2. 开发时使用预定义的CSS类
3. 测试时验证响应式和可访问性
4. 代码审查时检查规范遵循情况

### 2. 质量检查
- [ ] 色彩使用符合主题规范
- [ ] 间距使用标准间距系统
- [ ] 组件结构遵循规范模板
- [ ] 响应式行为正确
- [ ] 可访问性要求满足

### 3. 维护更新
- 定期审查和更新设计规范
- 收集用户反馈并优化设计
- 保持与 VS Code 设计语言的同步

## 页面布局规范

### 标准页面结构
```html
<main class="p-3">
    <div class="container-fluid">
        <!-- 页面标题 -->
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
                <h5 class="mb-1">
                    <i class="bi bi-icon me-2"></i>页面标题
                </h5>
                <small class="text-muted">页面描述</small>
            </div>
        </div>

        <!-- 使用说明 (可选) -->
        <div class="card mb-2" style="border-left: 3px solid var(--accent-color);">
            <!-- 说明内容 -->
        </div>

        <!-- 主要内容区域 -->
        <div class="row g-2">
            <!-- 内容卡片 -->
        </div>
    </div>
</main>
```

### 侧边栏布局
- **宽度**: 展开状态 240px，收起状态 48px
- **背景**: 使用 `--bg-secondary`
- **导航项**: 高度 36px，图标 16px，文字 14px

## 模态框规范

### 标准模态框
```html
<div class="modal fade" id="modalId" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header py-2">
                <h6 class="modal-title">模态框标题</h6>
                <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body py-2">
                <!-- 模态框内容 -->
            </div>
            <div class="modal-footer py-2">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary btn-sm">确认</button>
            </div>
        </div>
    </div>
</div>
```

## 进度指示器

### 进度条
```html
<div class="progress mb-1" style="height: 4px;">
    <div class="progress-bar"
         style="width: 75%; background-color: var(--accent-color);"
         role="progressbar"
         aria-valuenow="75"
         aria-valuemin="0"
         aria-valuemax="100">
    </div>
</div>
```

### 加载动画
```html
<div class="d-flex justify-content-center">
    <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">加载中...</span>
    </div>
</div>
```

## 数据展示

### 统计卡片
```html
<div class="col-md-3">
    <div class="card text-center">
        <div class="card-body py-2">
            <div class="display-6 text-primary">123</div>
            <small class="text-muted">统计项目</small>
        </div>
    </div>
</div>
```

### 列表项
```html
<div class="list-group">
    <div class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <i class="bi bi-icon me-2 text-muted"></i>
            <div>
                <div class="fw-bold">项目标题</div>
                <small class="text-muted">项目描述</small>
            </div>
        </div>
        <div class="btn-group" role="group">
            <button class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    </div>
</div>
```

## 错误处理

### 错误页面
```html
<div class="text-center py-5">
    <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
    <h3 class="mt-3">出现错误</h3>
    <p class="text-muted">错误描述信息</p>
    <button class="btn btn-primary" onclick="history.back()">
        <i class="bi bi-arrow-left me-1"></i>返回
    </button>
</div>
```

### 空状态
```html
<div class="text-center py-4">
    <i class="bi bi-inbox display-4 text-muted"></i>
    <h5 class="mt-3 text-muted">暂无数据</h5>
    <p class="text-muted">请先添加一些内容</p>
    <button class="btn btn-primary btn-sm">
        <i class="bi bi-plus me-1"></i>添加内容
    </button>
</div>
```

## CSS 工具类

### 自定义工具类
```css
/* 文本截断 */
.text-truncate-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 圆角 */
.rounded-sm { border-radius: 2px; }
.rounded-md { border-radius: 4px; }
.rounded-lg { border-radius: 8px; }

/* 阴影 */
.shadow-sm { box-shadow: 0 1px 3px var(--shadow); }
.shadow-md { box-shadow: 0 2px 6px var(--shadow); }
.shadow-lg { box-shadow: 0 4px 12px var(--shadow); }

/* 边框 */
.border-accent { border-color: var(--accent-color) !important; }
.border-start-accent { border-left: 3px solid var(--accent-color); }
```

## 最佳实践

### 1. 性能优化
- 使用 CSS 变量减少重复代码
- 避免过度嵌套的选择器
- 合理使用过渡动画，避免影响性能

### 2. 代码组织
- 按功能模块组织 CSS 文件
- 使用有意义的类名和注释
- 保持代码的可维护性

### 3. 测试建议
- 在不同屏幕尺寸下测试响应式效果
- 验证深色和浅色主题的显示效果
- 使用键盘导航测试可访问性

### 4. 常见问题解决

#### 按钮在深色主题下不清晰
```css
[data-bs-theme="dark"] .btn-outline-secondary {
    border-color: var(--border-color);
    color: var(--text-secondary);
}
```

#### 卡片间距不统一
```html
<!-- 统一使用 mb-2 -->
<div class="card mb-2">
```

#### 图标和文字不对齐
```html
<!-- 使用 me-1 或 me-2 保持间距 -->
<i class="bi bi-icon me-2"></i>文字内容
```

---

**版本**: 1.0
**最后更新**: 2024年12月
**适用范围**: 桌面工具集所有页面和组件
**维护者**: 开发团队
