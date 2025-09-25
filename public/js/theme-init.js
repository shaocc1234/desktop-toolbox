/**
 * 主题初始化脚本
 * 这个脚本必须在页面加载的最早阶段执行，避免主题切换时的闪动
 * 应该内联在HTML的head部分，在任何CSS加载之前
 */
(function() {
    'use strict';
    
    // 立即从localStorage获取主题设置
    const savedTheme = localStorage.getItem('theme');
    let theme = 'light'; // 默认主题
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        theme = savedTheme;
    } else {
        // 如果没有保存的主题，检查系统偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        }
    }
    
    // 立即应用主题到html元素
    document.documentElement.setAttribute('data-bs-theme', theme);
    
    // 将主题信息存储到全局变量，供后续脚本使用
    window.__INITIAL_THEME__ = theme;
    
    // 标记主题已初始化
    window.__THEME_INITIALIZED__ = true;
    
    // 如果需要，可以在这里添加一些调试信息
    if (window.console && window.console.debug) {
        console.debug('Theme initialized:', theme);
    }
})();
