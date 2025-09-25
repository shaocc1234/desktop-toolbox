// 侧边栏管理器
class SidebarManager {
  constructor() {
    this.sidebar = null;
    this.toggleBtn = null;
    this.isCollapsed = false;
    this.autoCollapseWidth = 1000; // 小于1000px自动收起

    // 使用已经在HTML中设置的初始状态，避免重复操作
    this.initialState = window.__INITIAL_SIDEBAR_STATE__ || null;

    this.init();
  }
  
  init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    console.log('🔧 初始化侧边栏管理器...');

    // 获取侧边栏元素
    this.sidebar = document.querySelector('.sidebar');
    if (!this.sidebar) {
      console.warn('❌ 找不到侧边栏元素');
      return;
    }

    // 标记为桌面应用
    document.body.classList.add('desktop-app');

    // 获取或创建切换按钮
    this.setupToggleButton();

    // 恢复保存的状态（使用初始化脚本设置的状态）
    this.restoreState();

    // 绑定事件
    this.bindEvents();

    // 初始检查窗口大小（但不自动改变已设置的状态）
    this.checkWindowSize();

    console.log('✅ 侧边栏管理器初始化完成');
  }
  
  setupToggleButton() {
    // 尝试获取已存在的切换按钮
    this.toggleBtn = document.querySelector('#sidebarToggle');

    // 如果没有找到，则创建一个
    if (!this.toggleBtn) {
      console.log('📝 创建侧边栏切换按钮...');
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.className = 'sidebar-toggle';
      this.toggleBtn.id = 'sidebarToggle';
      this.toggleBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
      this.toggleBtn.title = '收起/展开侧边栏';

      // 添加到侧边栏头部
      const sidebarHeader = this.sidebar.querySelector('.sidebar-header');
      if (sidebarHeader) {
        sidebarHeader.appendChild(this.toggleBtn);
      } else {
        this.sidebar.appendChild(this.toggleBtn);
      }
    } else {
      console.log('✅ 找到现有的侧边栏切换按钮');
    }

    // 绑定点击事件
    this.toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🖱️ 切换按钮被点击');
      this.toggleSidebar();
    });

    console.log('✅ 侧边栏切换按钮已设置');
  }

  restoreState() {
    // 如果已经有初始状态，使用它，避免重复操作
    if (this.initialState) {
      console.log('🔄 使用初始化脚本设置的侧边栏状态:', this.initialState);
      this.isCollapsed = this.initialState.collapsed;

      // 同步DOM状态到JavaScript对象
      if (this.initialState.collapsed) {
        this.sidebar.classList.add('collapsed');
        if (this.initialState.autoCollapsed) {
          this.sidebar.classList.add('auto-collapsed');
        }
      }

      // 更新切换按钮状态
      this.updateToggleButton();

      // 清理HTML元素上的临时类
      document.documentElement.classList.remove('sidebar-collapsed', 'sidebar-auto-collapsed');

      return;
    }

    // 如果没有初始状态，从localStorage恢复状态（兜底逻辑）
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState === 'true') {
      console.log('🔄 从localStorage恢复侧边栏折叠状态');
      this.collapseSidebar(false, true); // 不是自动折叠，但是是初始化时的恢复
    }
  }
  
  bindEvents() {
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.debounce(() => {
        this.checkWindowSize();
      }, 250)();
    });
    
    // 监听键盘快捷键 (Ctrl/Cmd + B)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
    });

    // 绑定设置按钮点击事件
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        window.location.href = '/settings';
      });
    }
  }
  
  checkWindowSize() {
    const windowWidth = window.innerWidth;
    console.log(`📏 窗口宽度: ${windowWidth}px`);
    
    // 根据窗口大小自动调整侧边栏
    if (windowWidth < this.autoCollapseWidth) {
      if (!this.isCollapsed) {
        console.log('📱 窗口较小，自动收起侧边栏');
        this.collapseSidebar(true);
      }
    } else {
      if (this.isCollapsed && this.sidebar.classList.contains('auto-collapsed')) {
        console.log('🖥️ 窗口足够大，自动展开侧边栏');
        this.expandSidebar(true);
      }
    }
  }
  
  toggleSidebar() {
    console.log(`🔄 切换侧边栏状态，当前状态: ${this.isCollapsed ? '折叠' : '展开'}`);
    if (this.isCollapsed) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
  }
  
  collapseSidebar(isAuto = false, isRestore = false) {
    if (this.isCollapsed) return;

    console.log(`📥 收起侧边栏 (${isAuto ? '自动' : isRestore ? '恢复' : '手动'})`);

    this.sidebar.classList.add('collapsed');
    if (isAuto) {
      this.sidebar.classList.add('auto-collapsed');
    }

    this.isCollapsed = true;
    this.updateToggleButton();

    // 保存状态到localStorage (手动操作或恢复时)
    if (!isAuto) {
      localStorage.setItem('sidebar-collapsed', 'true');
      if (!isRestore) {
        localStorage.removeItem('sidebar-auto-collapsed');
      }
    }

    // 触发自定义事件
    this.dispatchEvent('sidebarCollapsed', { isAuto, isRestore });
  }
  
  expandSidebar(isAuto = false) {
    if (!this.isCollapsed) return;
    
    console.log(`📤 展开侧边栏 (${isAuto ? '自动' : '手动'})`);
    
    this.sidebar.classList.remove('collapsed', 'auto-collapsed');
    this.isCollapsed = false;
    this.updateToggleButton();
    
    // 保存状态到localStorage (仅手动操作)
    if (!isAuto) {
      localStorage.setItem('sidebar-collapsed', 'false');
    }
    
    // 触发自定义事件
    this.dispatchEvent('sidebarExpanded', { isAuto });
  }
  
  updateToggleButton() {
    if (!this.toggleBtn) return;
    
    const icon = this.toggleBtn.querySelector('i');
    if (this.isCollapsed) {
      icon.className = 'bi bi-chevron-right';
      this.toggleBtn.title = '展开侧边栏';
    } else {
      icon.className = 'bi bi-chevron-left';
      this.toggleBtn.title = '收起侧边栏';
    }
  }
  
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    this.sidebar.dispatchEvent(event);
  }
  
  // 防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // 获取当前状态
  getState() {
    return {
      isCollapsed: this.isCollapsed,
      isAutoCollapsed: this.sidebar?.classList.contains('auto-collapsed') || false,
      windowWidth: window.innerWidth
    };
  }
  
  // 强制设置状态
  setState(collapsed, isAuto = false) {
    if (collapsed) {
      this.collapseSidebar(isAuto);
    } else {
      this.expandSidebar(isAuto);
    }
  }
}

// 创建全局实例
let sidebarManager;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  sidebarManager = new SidebarManager();
  
  // 暴露到全局作用域供其他脚本使用
  window.sidebarManager = sidebarManager;
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarManager;
}
