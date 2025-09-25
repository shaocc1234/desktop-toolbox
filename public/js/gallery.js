// 图库页面功能
class GalleryManager {
  constructor() {
    this.selectedImages = new Set();
    this.currentViewMode = 'grid';
    this.images = [];
    this.categories = [];
    
    this.initElements();
    this.initEventListeners();
    this.loadInitialData();
    this.updateSelectionUI();
  }
  
  initElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.categoryFilter = document.getElementById('categoryFilter');
    this.selectAllBtn = document.getElementById('selectAllBtn');
    this.copySelectedBtn = document.getElementById('copySelectedBtn');
    this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.viewModeBtn = document.getElementById('viewModeBtn');
    this.selectionInfo = document.getElementById('selectionInfo');
    this.selectedCount = document.getElementById('selectedCount');
    this.clearSelectionBtn = document.getElementById('clearSelectionBtn');
    this.imageGrid = document.getElementById('imageGrid');
    this.editImageModal = document.getElementById('editImageModal');
    this.editImageForm = document.getElementById('editImageForm');
    this.editImageId = document.getElementById('editImageId');
    this.editCategory = document.getElementById('editCategory');
    this.editDescription = document.getElementById('editDescription');
    this.editTags = document.getElementById('editTags');
    this.saveImageBtn = document.getElementById('saveImageBtn');
  }
  
  initEventListeners() {
    // 搜索功能
    this.searchBtn.addEventListener('click', () => {
      this.performSearch();
    });
    
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // 分类筛选
    this.categoryFilter.addEventListener('change', () => {
      this.performFilter();
    });
    
    // 批量操作
    this.selectAllBtn.addEventListener('click', () => {
      this.toggleSelectAll();
    });
    
    this.copySelectedBtn.addEventListener('click', () => {
      this.copySelectedUrls();
    });
    
    this.deleteSelectedBtn.addEventListener('click', () => {
      this.deleteSelectedImages();
    });
    
    // 其他操作
    this.refreshBtn.addEventListener('click', () => {
      this.refreshGallery();
    });
    
    this.viewModeBtn.addEventListener('click', () => {
      this.toggleViewMode();
    });
    
    this.clearSelectionBtn.addEventListener('click', () => {
      this.clearSelection();
    });
    
    // 图片选择
    this.imageGrid.addEventListener('change', (e) => {
      if (e.target.classList.contains('image-checkbox')) {
        this.handleImageSelection(e.target);
      }
    });

    // 图片点击事件委托
    this.imageGrid.addEventListener('click', (e) => {
      // 预览图片 - 点击图片或预览按钮
      if (e.target.classList.contains('image-thumbnail') ||
          e.target.closest('.preview-btn')) {
        e.preventDefault();
        const card = e.target.closest('[data-id]');
        if (card) {
          const imageId = card.dataset.id;
          const img = card.querySelector('.image-thumbnail');
          const title = img.alt || '图片预览';
          console.log('🖼️ 触发预览:', { imageId, title, src: img.src });
          window.previewImage(img.src, title, parseInt(imageId));
        }
      }

      // 复制链接
      else if (e.target.closest('.copy-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.copy-btn');
        const url = btn.dataset.url;
        if (url) {
          window.copyImageUrl(url);
        }
      }

      // 编辑图片
      else if (e.target.closest('.edit-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.edit-btn');
        const imageId = btn.dataset.id;
        if (imageId) {
          window.editImage(parseInt(imageId));
        }
      }

      // 删除图片
      else if (e.target.closest('.delete-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.delete-btn');
        const imageId = btn.dataset.id;
        const imageName = btn.dataset.name;
        if (imageId) {
          window.deleteImage(parseInt(imageId), imageName);
        }
      }
    });
    
    // 编辑模态框
    this.saveImageBtn.addEventListener('click', () => {
      this.saveImageChanges();
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }
  
  performSearch() {
    const query = this.searchInput.value.trim();
    const category = this.categoryFilter.value;
    
    this.loadImages(query, category);
  }
  
  performFilter() {
    const category = this.categoryFilter.value;
    const search = this.searchInput.value.trim();
    
    this.loadImages(search, category);
  }
  
  handleImageSelection(checkbox) {
    const imageId = checkbox.value;
    
    if (checkbox.checked) {
      this.selectedImages.add(imageId);
    } else {
      this.selectedImages.delete(imageId);
    }
    
    this.updateSelectionUI();
  }
  
  toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.image-checkbox');
    const allSelected = this.selectedImages.size === checkboxes.length;
    
    if (allSelected) {
      // 取消全选
      checkboxes.forEach(cb => {
        cb.checked = false;
        this.selectedImages.delete(cb.value);
      });
      this.selectAllBtn.innerHTML = '<i class="bi bi-check-all me-1"></i>全选';
    } else {
      // 全选
      checkboxes.forEach(cb => {
        cb.checked = true;
        this.selectedImages.add(cb.value);
      });
      this.selectAllBtn.innerHTML = '<i class="bi bi-check-square me-1"></i>取消全选';
    }
    
    this.updateSelectionUI();
  }
  
  updateSelectionUI() {
    const count = this.selectedImages.size;
    const hasSelection = count > 0;
    
    // 更新选择信息
    this.selectedCount.textContent = count;
    this.selectionInfo.style.display = hasSelection ? 'block' : 'none';
    
    // 更新按钮状态
    this.copySelectedBtn.disabled = !hasSelection;
    this.deleteSelectedBtn.disabled = !hasSelection;
    
    // 更新全选按钮文本
    const checkboxes = document.querySelectorAll('.image-checkbox');
    const allSelected = count === checkboxes.length && count > 0;
    this.selectAllBtn.innerHTML = allSelected ? 
      '<i class="bi bi-check-square me-1"></i>取消全选' : 
      '<i class="bi bi-check-all me-1"></i>全选';
  }
  
  clearSelection() {
    this.selectedImages.clear();
    document.querySelectorAll('.image-checkbox').forEach(cb => {
      cb.checked = false;
    });
    this.updateSelectionUI();
  }
  
  async copySelectedUrls() {
    if (this.selectedImages.size === 0) return;
    
    const urls = [];
    this.selectedImages.forEach(imageId => {
      const card = document.querySelector(`[data-id="${imageId}"]`);
      if (card) {
        const img = card.querySelector('.image-thumbnail');
        if (img) {
          urls.push(img.src);
        }
      }
    });
    
    if (urls.length > 0) {
      const urlText = urls.join('\n');
      await utils.copyToClipboard(urlText);
      utils.showToast(`已复制 ${urls.length} 个图片链接`, 'success');
    }
  }
  
  async deleteSelectedImages() {
    if (this.selectedImages.size === 0) return;
    
    const confirmed = await utils.showConfirm(
      `确定要删除选中的 ${this.selectedImages.size} 张图片吗？此操作不可撤销。`,
      '确认删除'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch('/gallery/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: Array.from(this.selectedImages).map(id => parseInt(id))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        utils.showToast(data.message, 'success');
        this.refreshGallery();
      } else {
        utils.showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      utils.showToast('网络错误', 'error');
    }
  }
  
  refreshGallery() {
    const search = this.searchInput.value.trim();
    const category = this.categoryFilter.value;
    this.loadImages(search, category);
    this.loadCategories();
  }
  
  toggleViewMode() {
    this.currentViewMode = this.currentViewMode === 'grid' ? 'list' : 'grid';
    
    if (this.currentViewMode === 'list') {
      this.imageGrid.classList.add('list-view');
      this.viewModeBtn.innerHTML = '<i class="bi bi-list me-1"></i>列表';
      this.viewModeBtn.dataset.mode = 'list';
    } else {
      this.imageGrid.classList.remove('list-view');
      this.viewModeBtn.innerHTML = '<i class="bi bi-grid-3x3-gap me-1"></i>网格';
      this.viewModeBtn.dataset.mode = 'grid';
    }
  }
  
  handleKeyboardShortcuts(e) {
    // Ctrl+A 全选
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      this.toggleSelectAll();
    }
    
    // Delete 删除选中
    if (e.key === 'Delete' && this.selectedImages.size > 0) {
      e.preventDefault();
      this.deleteSelectedImages();
    }
    
    // Ctrl+C 复制链接
    if (e.ctrlKey && e.key === 'c' && this.selectedImages.size > 0) {
      e.preventDefault();
      this.copySelectedUrls();
    }
    
    // F5 刷新
    if (e.key === 'F5') {
      e.preventDefault();
      this.refreshGallery();
    }
    
    // Escape 清除选择
    if (e.key === 'Escape') {
      this.clearSelection();
    }
  }
  
  // 加载初始数据
  async loadInitialData() {
    try {
      console.log('🔄 开始加载图库数据...');
      await this.loadImages();
      await this.loadCategories();
      console.log('✅ 图库数据加载完成');
    } catch (error) {
      console.error('❌ 加载初始数据失败:', error);
      if (window.utils) {
        utils.showToast('加载数据失败', 'error');
      }
    }
  }
  
  // 加载图片数据
  async loadImages(search = '', category = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      
      const url = `/api/images?${params.toString()}`;
      console.log('📡 请求图片数据:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 API响应:', data);
      
      if (data.success) {
        this.images = data.data;
        console.log(`🖼️ 加载了 ${this.images.length} 张图片`);
        this.renderImages();
        this.updateImageCount();
      } else {
        console.error('❌ 获取图片失败:', data.error);
        if (window.utils) {
          utils.showToast('获取图片失败', 'error');
        }
      }
    } catch (error) {
      console.error('❌ 加载图片失败:', error);
      if (window.utils) {
        utils.showToast('网络错误', 'error');
      }
    }
  }
  
  // 加载分类数据
  async loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        this.categories = data.data;
        this.renderCategories();
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }
  
  // 渲染图片网格
  renderImages() {
    if (!this.imageGrid) return;
    
    if (this.images.length === 0) {
      this.imageGrid.innerHTML = `
        <div class="col-12">
          <div class="text-center py-5">
            <i class="bi bi-images display-1 text-muted mb-3"></i>
            <h4 class="text-muted">暂无图片</h4>
            <p class="text-muted">还没有上传任何图片</p>
            <a href="/upload" class="btn btn-primary">
              <i class="bi bi-cloud-upload me-2"></i>上传图片
            </a>
          </div>
        </div>
      `;
      return;
    }
    
    const imageCards = this.images.map(image => this.createImageCard(image)).join('');
    this.imageGrid.innerHTML = imageCards;
  }
  
  // 创建图片卡片HTML - 紧凑版本
  createImageCard(image) {
    const uploadDate = new Date(image.upload_time).toLocaleDateString();
    const fileSize = this.formatFileSize(image.size);
    const compressionBadge = image.was_compressed ? 
      `<div class="position-absolute top-0 start-0 p-1">
        <span class="badge bg-warning" style="font-size: 0.6rem;" title="已压缩 ${image.compression_ratio}%">
          <i class="bi bi-arrow-down-circle"></i>
        </span>
      </div>` : '';
    
    return `
      <div class="col-lg-2 col-md-3 col-sm-4 col-6 mb-3 image-item" 
           data-category="${image.category || '默认'}" 
           data-id="${image.id}">
        <div class="card image-card h-100">
          <div class="position-relative">
            <img src="${image.url}"
                 alt="${image.original_name || image.filename}"
                 class="card-img-top image-thumbnail"
                 style="height: 160px; object-fit: cover; cursor: pointer;">
            ${compressionBadge}
            <div class="position-absolute top-0 end-0 p-1">
              <input type="checkbox" class="form-check-input image-checkbox" 
                     value="${image.id}" style="transform: scale(1.1);">
            </div>
          </div>
          <div class="card-body p-2">
            <h6 class="card-title text-truncate mb-1" style="font-size: 0.8rem;" title="${image.original_name || image.filename}">
              ${image.original_name || image.filename}
            </h6>
            <div class="d-flex justify-content-between align-items-center mb-1">
              <small class="image-size">${fileSize}</small>
              <span class="badge bg-${image.service === 'PicGo' ? 'primary' : 'success'}" style="font-size: 0.6rem;">${image.service}</span>
            </div>
            <div class="image-info mb-2">
              <div class="text-muted" style="font-size: 0.7rem;">分类: ${image.category || '默认'}</div>
              <div class="image-date">${uploadDate}</div>
              ${image.description ? `<div class="text-muted" style="font-size: 0.65rem;" title="${image.description}">${image.description.length > 25 ? image.description.substring(0, 25) + '...' : image.description}</div>` : ''}
            </div>
            <div class="image-actions">
              <button class="btn btn-xs btn-outline-primary preview-btn"
                      title="预览">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-xs btn-outline-success copy-btn"
                      data-url="${image.url}"
                      title="复制链接">
                <i class="bi bi-clipboard"></i>
              </button>
              <button class="btn btn-xs btn-outline-info edit-btn"
                      data-id="${image.id}"
                      title="编辑">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-xs btn-outline-danger delete-btn"
                      data-id="${image.id}"
                      data-name="${image.original_name || image.filename}"
                      title="删除">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 渲染分类选项
  renderCategories() {
    if (!this.categoryFilter) return;
    
    const currentValue = this.categoryFilter.value;
    const options = ['<option value="">全部分类</option>'];
    
    this.categories.forEach(category => {
      const selected = category.name === currentValue ? 'selected' : '';
      options.push(`<option value="${category.name}" ${selected}>${category.name} (${category.count})</option>`);
    });
    
    this.categoryFilter.innerHTML = options.join('');
  }
  
  // 更新图片数量显示
  updateImageCount() {
    const countElement = document.querySelector('.text-muted');
    if (countElement && countElement.textContent.includes('张图片')) {
      countElement.textContent = `共 ${this.images.length} 张图片`;
    }
  }
  
  // 格式化文件大小
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 全局函数供模板调用
window.previewImage = function(url, title, imageId) {
  console.log('🖼️ 预览图片:', { url, title, imageId });

  const modal = document.getElementById('imagePreviewModal');
  const modalTitle = document.getElementById('previewModalTitle');
  const previewImage = document.getElementById('previewImage');
  const previewInfo = document.getElementById('previewInfo');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const openInNewTab = document.getElementById('openInNewTab');

  if (!modal) {
    console.error('❌ 找不到预览模态框');
    return;
  }

  // 设置标题和图片
  modalTitle.textContent = title || '图片预览';
  previewImage.src = url;
  previewImage.alt = title || '图片';

  // 设置按钮事件
  copyUrlBtn.onclick = () => {
    navigator.clipboard.writeText(url).then(() => {
      utils.showToast('图片链接已复制', 'success');
    }).catch(() => {
      utils.showToast('复制失败', 'error');
    });
  };

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
  try {
    // 检查Bootstrap是否已加载
    if (typeof bootstrap === 'undefined') {
      console.error('❌ Bootstrap未加载');
      return;
    }

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    console.log('✅ 模态框已显示');
  } catch (error) {
    console.error('❌ 显示模态框失败:', error);
    // 备用方案：直接显示模态框
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');

    // 添加背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-backdrop-fallback';
    document.body.appendChild(backdrop);

    // 添加关闭事件
    const closeBtn = modal.querySelector('.btn-close');
    const closeHandler = () => {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      const fallbackBackdrop = document.getElementById('modal-backdrop-fallback');
      if (fallbackBackdrop) {
        fallbackBackdrop.remove();
      }
    };

    closeBtn.onclick = closeHandler;
    backdrop.onclick = closeHandler;
  }
};

window.copyImageUrl = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    utils.showToast('图片链接已复制', 'success');
  }).catch(() => {
    utils.showToast('复制失败', 'error');
  });
};

// 加载图片详细信息
async function loadImageDetails(imageId, container) {
  try {
    console.log('📡 加载图片详情:', imageId);
    const response = await fetch(`/gallery/image/${imageId}`);
    const data = await response.json();

    if (data.success) {
      const image = data.image;
      console.log('📊 图片详情:', image);

      container.innerHTML = `
        <div class="row g-2">
          <div class="col-sm-3"><strong>文件名:</strong></div>
          <div class="col-sm-9">${image.original_name || image.filename}</div>

          <div class="col-sm-3"><strong>文件大小:</strong></div>
          <div class="col-sm-9">${formatFileSize(image.size)}</div>

          <div class="col-sm-3"><strong>分类:</strong></div>
          <div class="col-sm-9"><span class="badge bg-primary">${image.category || '默认'}</span></div>

          <div class="col-sm-3"><strong>上传服务:</strong></div>
          <div class="col-sm-9"><span class="badge bg-${image.service === 'PicGo' ? 'primary' : 'success'}">${image.service}</span></div>

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
            </div>
          ` : ''}

          <div class="col-sm-3"><strong>图片链接:</strong></div>
          <div class="col-sm-9">
            <a href="${image.url}" target="_blank" class="text-break">${image.url}</a>
          </div>
        </div>
      `;
    } else {
      console.error('❌ 获取图片详情失败:', data.error);
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          无法加载图片详细信息
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ 加载图片详情失败:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-x-circle me-2"></i>
        加载失败，请稍后重试
      </div>
    `;
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
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

window.editImage = async function(imageId) {
  try {
    const response = await fetch(`/gallery/image/${imageId}`);
    const data = await response.json();
    
    if (data.success) {
      const image = data.image;
      
      // 填充表单
      document.getElementById('editImageId').value = imageId;
      document.getElementById('editCategory').value = image.category || '默认';
      document.getElementById('editDescription').value = image.description || '';
      document.getElementById('editTags').value = image.tags || '';
      
      // 显示模态框
      try {
        const modalElement = document.getElementById('editImageModal');
        if (typeof bootstrap !== 'undefined') {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        } else {
          // 备用方案
          modalElement.style.display = 'block';
          modalElement.classList.add('show');
          document.body.classList.add('modal-open');
        }
      } catch (error) {
        console.error('❌ 显示编辑模态框失败:', error);
      }
    } else {
      utils.showToast('获取图片信息失败', 'error');
    }
  } catch (error) {
    console.error('编辑图片失败:', error);
    utils.showToast('网络错误', 'error');
  }
};

window.deleteImage = async function(imageId, imageName) {
  const confirmed = await utils.showConfirm(
    `确定要删除图片 "${imageName}" 吗？此操作不可撤销。`,
    '确认删除'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch(`/gallery/image/${imageId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      utils.showToast('图片删除成功', 'success');
      
      // 移除DOM元素
      const imageCard = document.querySelector(`[data-id="${imageId}"]`).closest('.image-item');
      if (imageCard) {
        imageCard.remove();
      }
      
      // 更新选择状态
      if (window.galleryManager) {
        window.galleryManager.selectedImages.delete(imageId.toString());
        window.galleryManager.updateSelectionUI();
      }
    } else {
      utils.showToast(data.error || '删除失败', 'error');
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    utils.showToast('网络错误', 'error');
  }
};

// 保存图片编辑
window.saveImageChanges = async function() {
  const imageId = document.getElementById('editImageId').value;
  const category = document.getElementById('editCategory').value;
  const description = document.getElementById('editDescription').value;
  const tags = document.getElementById('editTags').value;
  
  try {
    utils.setLoading(document.getElementById('saveImageBtn'), true);
    
    const response = await fetch(`/gallery/image/${imageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category,
        description,
        tags
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      utils.showToast('图片信息更新成功', 'success');
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('editImageModal'));
      modal.hide();
      
      // 刷新页面以显示更新
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      utils.showToast(data.error || '更新失败', 'error');
    }
  } catch (error) {
    console.error('更新图片信息失败:', error);
    utils.showToast('网络错误', 'error');
  } finally {
    utils.setLoading(document.getElementById('saveImageBtn'), false);
  }
};

// 初始化图库管理器
document.addEventListener('DOMContentLoaded', () => {
  window.galleryManager = new GalleryManager();
  
  // 绑定保存按钮事件
  const saveBtn = document.getElementById('saveImageBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveImageChanges);
  }
});
