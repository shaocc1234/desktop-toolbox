// 通用工具函数

// 显示Toast通知
function showToast(message, type = 'info') {
  const toastElement = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  if (!toastElement || !toastMessage) {
    console.log('Toast元素未找到，使用console输出:', message);
    return;
  }

  const toastHeader = toastElement.querySelector('.toast-header');
  
  // 设置消息内容
  toastMessage.textContent = message;
  
  // 设置图标和样式
  const icon = toastHeader.querySelector('i');
  if (icon) {
    icon.className = getToastIcon(type);
  }
  
  // 设置背景色
  toastElement.className = `toast ${getToastClass(type)}`;
  
  // 显示Toast
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: type === 'error' ? 5000 : 3000
  });
  toast.show();
}

// 获取Toast图标
function getToastIcon(type) {
  const icons = {
    success: 'bi bi-check-circle-fill text-success me-2',
    error: 'bi bi-exclamation-triangle-fill text-danger me-2',
    warning: 'bi bi-exclamation-triangle-fill text-warning me-2',
    info: 'bi bi-info-circle-fill text-primary me-2'
  };
  return icons[type] || icons.info;
}

// 获取Toast样式类
function getToastClass(type) {
  const classes = {
    success: 'border-success',
    error: 'border-danger',
    warning: 'border-warning',
    info: 'border-primary'
  };
  return classes[type] || classes.info;
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期时间
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 格式化相对时间
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDateTime(dateString);
}

// 复制文本到剪贴板
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板', 'success');
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      textArea.remove();
      
      if (result) {
        showToast('已复制到剪贴板', 'success');
        return true;
      } else {
        throw new Error('复制失败');
      }
    }
  } catch (error) {
    console.error('复制失败:', error);
    showToast('复制失败，请手动复制', 'error');
    return false;
  }
}

// 防抖函数
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 验证图片文件
function isImageFile(file) {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
  return imageTypes.includes(file.type);
}

// 获取文件扩展名
function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 确认对话框
function showConfirm(message, title = '确认操作') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-danger" id="confirmBtn">确认</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    modal.querySelector('#confirmBtn').addEventListener('click', () => {
      bootstrapModal.hide();
      resolve(true);
    });
    
    modal.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
  });
}

// 加载状态管理
function setLoading(element, loading = true) {
  if (loading) {
    element.disabled = true;
    element.classList.add('loading');
    const originalText = element.textContent;
    element.dataset.originalText = originalText;
    element.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
      加载中...
    `;
  } else {
    element.disabled = false;
    element.classList.remove('loading');
    element.textContent = element.dataset.originalText || '确定';
  }
}

// 图片预览函数
function previewImage(url, title, imageId = null) {
  const modal = document.getElementById('imagePreviewModal');
  const modalTitle = document.getElementById('previewModalTitle');
  const previewImage = document.getElementById('previewImage');
  const previewInfo = document.getElementById('previewInfo');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const openInNewTab = document.getElementById('openInNewTab');
  
  if (!modal) return;
  
  // 设置标题和图片
  modalTitle.textContent = title || '图片预览';
  previewImage.src = url;
  previewImage.alt = title || '图片';
  
  // 设置按钮事件
  copyUrlBtn.onclick = () => copyToClipboard(url);
  openInNewTab.onclick = () => window.open(url, '_blank');
  
  // 如果有图片ID，加载详细信息
  if (imageId) {
    loadImageDetails(imageId, previewInfo);
  } else {
    previewInfo.innerHTML = `
      <div class="row">
        <div class="col-sm-3"><strong>图片链接:</strong></div>
        <div class="col-sm-9"><a href="${url}" target="_blank" class="text-break">${url}</a></div>
      </div>
    `;
  }
  
  // 显示模态框
  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

// 加载图片详细信息
async function loadImageDetails(imageId, container) {
  try {
    const response = await fetch(`/gallery/image/${imageId}`);
    const data = await response.json();
    
    if (data.success) {
      const image = data.image;
      container.innerHTML = `
        <div class="row g-2">
          <div class="col-sm-3"><strong>文件名:</strong></div>
          <div class="col-sm-9">${image.original_name}</div>
          
          <div class="col-sm-3"><strong>文件大小:</strong></div>
          <div class="col-sm-9">${formatFileSize(image.size)}</div>
          
          <div class="col-sm-3"><strong>分类:</strong></div>
          <div class="col-sm-9"><span class="badge bg-primary">${image.category}</span></div>
          
          <div class="col-sm-3"><strong>上传服务:</strong></div>
          <div class="col-sm-9"><span class="badge bg-success">${image.service}</span></div>
          
          <div class="col-sm-3"><strong>上传时间:</strong></div>
          <div class="col-sm-9">${formatDateTime(image.upload_time)}</div>
          
          ${image.description ? `
            <div class="col-sm-3"><strong>描述:</strong></div>
            <div class="col-sm-9">${image.description}</div>
          ` : ''}
          
          ${image.was_compressed ? `
            <div class="col-sm-3"><strong>压缩信息:</strong></div>
            <div class="col-sm-9">
              <span class="badge bg-warning">已压缩 ${image.compression_ratio}%</span>
              <small class="text-muted ms-2">原始大小: ${formatFileSize(image.original_size)}</small>
            </div>
          ` : ''}
          
          <div class="col-sm-3"><strong>图片链接:</strong></div>
          <div class="col-sm-9"><a href="${image.url}" target="_blank" class="text-break">${image.url}</a></div>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="text-danger">加载图片信息失败</div>';
    }
  } catch (error) {
    console.error('加载图片详情失败:', error);
    container.innerHTML = '<div class="text-danger">加载图片信息失败</div>';
  }
}

// 复制图片链接
function copyImageUrl(url) {
  copyToClipboard(url);
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  showToast('发生了一个错误，请刷新页面重试', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  showToast('网络请求失败，请检查网络连接', 'error');
});

// 导出函数供其他脚本使用
window.utils = {
  showToast,
  formatFileSize,
  formatDateTime,
  formatRelativeTime,
  copyToClipboard,
  debounce,
  throttle,
  isImageFile,
  getFileExtension,
  generateId,
  showConfirm,
  setLoading,
  previewImage,
  copyImageUrl
};
