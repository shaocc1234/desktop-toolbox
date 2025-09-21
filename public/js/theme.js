// 主题管理器
class ThemeManager {
  constructor() {
    this.currentTheme = this.loadTheme();
    this.applyTheme();
    this.initToggleButton();
  }
  
  loadTheme() {
    return localStorage.getItem('theme') || 'light';
  }
  
  saveTheme(theme) {
    localStorage.setItem('theme', theme);
  }
  
  applyTheme() {
    document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
    
    // 更新页面元素
    this.updatePageElements();
  }
  
  updatePageElements() {
    // 更新侧边栏样式
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (this.currentTheme === 'dark') {
        sidebar.classList.remove('bg-light');
        sidebar.classList.add('bg-dark');
      } else {
        sidebar.classList.remove('bg-dark');
        sidebar.classList.add('bg-light');
      }
    }
  }
  
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveTheme(this.currentTheme);
    this.updateToggleButton();
    
    // 触发主题变化事件
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: this.currentTheme }
    }));
  }
  
  initToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTheme());
      this.updateToggleButton();
    }
  }
  
  updateToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    const icon = toggleBtn?.querySelector('i');
    const text = toggleBtn?.querySelector('span');
    
    if (icon) {
      icon.className = this.currentTheme === 'light' 
        ? 'bi bi-moon-fill me-2' 
        : 'bi bi-sun-fill me-2';
    }
    
    if (text) {
      text.textContent = this.currentTheme === 'light' ? '深色模式' : '浅色模式';
    }
    
    if (toggleBtn) {
      toggleBtn.title = this.currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式';
    }
  }
  
  getTheme() {
    return this.currentTheme;
  }
  
  setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      this.currentTheme = theme;
      this.applyTheme();
      this.saveTheme(theme);
      this.updateToggleButton();
    }
  }
}

// 初始化主题管理器
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
  
  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // 如果用户没有手动设置过主题，则跟随系统
      if (!localStorage.getItem('theme')) {
        window.themeManager.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
});
