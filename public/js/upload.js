// 上传页面功能
class UploadManager {
  constructor() {
    this.pendingFiles = [];
    this.isUploading = false;
    this.currentUploadIndex = 0;

    this.initElements();
    this.initEventListeners();
    this.loadServiceStatus();
    this.initApiKeyManagement();
  }
  
  initElements() {
    console.log('🔧 初始化上传页面元素...');
    
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.selectFilesBtn = document.getElementById('selectFiles');
    this.serviceSelect = document.getElementById('serviceSelect');
    this.categorySelect = document.getElementById('categorySelect');
    this.descriptionInput = document.getElementById('descriptionInput');
    this.fileListContainer = document.getElementById('fileListContainer');
    this.fileList = document.getElementById('fileList');
    this.fileCount = document.getElementById('fileCount');
    this.clearFilesBtn = document.getElementById('clearFiles');
    this.startUploadBtn = document.getElementById('startUpload');
    this.uploadProgressContainer = document.getElementById('uploadProgressContainer');
    this.uploadProgress = document.getElementById('uploadProgress');
    this.uploadStatus = document.getElementById('uploadStatus');
    this.uploadResults = document.getElementById('uploadResults');
    this.serviceStatus = document.getElementById('serviceStatus');
    
    // 调试信息
    console.log('📋 元素检查:');
    console.log('- selectFilesBtn:', this.selectFilesBtn ? '✅' : '❌');
    console.log('- fileInput:', this.fileInput ? '✅' : '❌');
    console.log('- uploadArea:', this.uploadArea ? '✅' : '❌');
  }
  
  initEventListeners() {
    console.log('🔧 绑定事件监听器...');
    
    // 文件选择
    if (this.selectFilesBtn && this.fileInput) {
      console.log('✅ 找到选择文件按钮和文件输入框');
      
      // 添加多种事件监听器进行调试
      this.selectFilesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🖱️ 点击选择文件按钮');
        console.log('📁 文件输入框:', this.fileInput);
        console.log('🎯 触发文件选择器...');
        
        try {
          this.fileInput.click();
          console.log('✅ 文件选择器已触发');
        } catch (error) {
          console.error('❌ 触发文件选择器失败:', error);
        }
      });
      
      // 添加鼠标事件调试
      this.selectFilesBtn.addEventListener('mousedown', () => {
        console.log('🖱️ 鼠标按下');
      });
      
      this.selectFilesBtn.addEventListener('mouseup', () => {
        console.log('🖱️ 鼠标释放');
      });
      
    } else {
      console.error('❌ 找不到文件选择按钮或文件输入框');
      console.log('- selectFilesBtn:', this.selectFilesBtn);
      console.log('- fileInput:', this.fileInput);
    }
    
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        console.log('📁 文件输入框变化，选择了文件:', e.target.files.length);
        this.handleFiles(Array.from(e.target.files));
      });
    }
    
    // 拖拽上传
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    
    this.uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
    });
    
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    });
    
    // 按钮事件
    this.clearFilesBtn.addEventListener('click', () => {
      this.clearFiles();
    });
    
    this.startUploadBtn.addEventListener('click', () => {
      this.startUpload();
    });
    
    // 服务切换
    this.serviceSelect.addEventListener('change', () => {
      this.switchService();
    });
  }
  
  handleFiles(files) {
    console.log(`📁 处理 ${files.length} 个文件`);
    
    // 打印文件名调试信息
    files.forEach((file, index) => {
      console.log(`📄 文件 ${index + 1}: ${file.name} (${file.type}, ${utils.formatFileSize(file.size)})`);
    });
    
    // 过滤图片文件
    const imageFiles = files.filter(file => {
      if (!window.utils || !utils.isImageFile(file)) {
        if (window.utils) {
          utils.showToast(`跳过非图片文件: ${file.name}`, 'warning');
        } else {
          console.warn('utils对象不存在，跳过文件验证');
        }
        return false;
      }
      return true;
    });
    
    if (imageFiles.length === 0) {
      utils.showToast('没有找到有效的图片文件', 'warning');
      return;
    }
    
    // 检查文件数量限制
    if (this.pendingFiles.length + imageFiles.length > 50) {
      utils.showToast('一次最多只能上传50个文件', 'error');
      return;
    }
    
    // 添加到待上传列表
    imageFiles.forEach(file => {
      const fileObj = {
        id: utils.generateId(),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: null,
        status: 'pending'
      };
      
      this.pendingFiles.push(fileObj);
      this.generatePreview(fileObj);
    });
    
    this.updateFileList();
    this.updateUI();
    
    utils.showToast(`已添加 ${imageFiles.length} 个文件到上传队列`, 'success');
  }
  
  async generatePreview(fileObj) {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileObj.preview = e.target.result;
        this.updateFileItem(fileObj);
      };
      reader.readAsDataURL(fileObj.file);
    } catch (error) {
      console.error('生成预览失败:', error);
    }
  }
  
  updateFileList() {
    this.fileList.innerHTML = '';
    
    this.pendingFiles.forEach(fileObj => {
      const fileItem = this.createFileItem(fileObj);
      this.fileList.appendChild(fileItem);
    });
    
    this.fileCount.textContent = this.pendingFiles.length;
  }
  
  createFileItem(fileObj) {
    const div = document.createElement('div');
    div.className = 'col-md-6 col-lg-4';
    div.dataset.fileId = fileObj.id;
    
    div.innerHTML = `
      <div class="file-item">
        <div class="row align-items-center">
          <div class="col-3">
            <div class="preview-container" style="width: 80px; height: 80px; background: var(--bg-secondary); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
              ${fileObj.preview ? 
                `<img src="${fileObj.preview}" alt="${fileObj.name}" class="file-preview" style="max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 4px;">` :
                `<i class="bi bi-image text-muted"></i>`
              }
            </div>
          </div>
          <div class="col-9">
            <div class="file-info">
              <h6 class="mb-1 text-truncate" title="${fileObj.name}">${fileObj.name}</h6>
              <p class="mb-1 text-muted small">${utils.formatFileSize(fileObj.size)}</p>
              <div class="file-status">
                ${this.getStatusBadge(fileObj.status)}
              </div>
            </div>
          </div>
        </div>
        <div class="file-actions mt-2">
          <button class="btn btn-sm btn-outline-danger" onclick="uploadManager.removeFile('${fileObj.id}')">
            <i class="bi bi-trash"></i> 移除
          </button>
        </div>
      </div>
    `;
    
    return div;
  }
  
  updateFileItem(fileObj) {
    const fileItem = document.querySelector(`[data-file-id="${fileObj.id}"]`);
    if (!fileItem) return;
    
    const previewContainer = fileItem.querySelector('.preview-container');
    const statusElement = fileItem.querySelector('.file-status');
    
    if (fileObj.preview && previewContainer) {
      previewContainer.innerHTML = `
        <img src="${fileObj.preview}" alt="${fileObj.name}" class="file-preview" 
             style="max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 4px;">
      `;
    }
    
    if (statusElement) {
      statusElement.innerHTML = this.getStatusBadge(fileObj.status);
    }
  }
  
  getStatusBadge(status) {
    const badges = {
      pending: '<span class="badge bg-secondary">等待上传</span>',
      uploading: '<span class="badge bg-primary">上传中...</span>',
      success: '<span class="badge bg-success">上传成功</span>',
      error: '<span class="badge bg-danger">上传失败</span>'
    };
    return badges[status] || badges.pending;
  }
  
  removeFile(fileId) {
    this.pendingFiles = this.pendingFiles.filter(f => f.id !== fileId);
    this.updateFileList();
    this.updateUI();
    utils.showToast('文件已移除', 'info');
  }
  
  clearFiles() {
    this.pendingFiles = [];
    this.updateFileList();
    this.updateUI();
    utils.showToast('已清空文件列表', 'info');
  }
  
  updateUI() {
    const hasFiles = this.pendingFiles.length > 0;
    
    // 显示/隐藏文件列表
    this.fileListContainer.style.display = hasFiles ? 'block' : 'none';
    
    // 启用/禁用上传按钮
    this.startUploadBtn.disabled = !hasFiles || this.isUploading;
    
    // 更新文件计数
    this.fileCount.textContent = this.pendingFiles.length;
  }
  
  async startUpload() {
    if (this.pendingFiles.length === 0 || this.isUploading) return;

    // 确保PicGo API Key已设置
    const apiKeyReady = await this.ensurePicGoApiKey();
    if (!apiKeyReady) {
      return;
    }

    this.isUploading = true;
    this.currentUploadIndex = 0;
    
    // 显示进度容器
    this.uploadProgressContainer.style.display = 'block';
    this.uploadResults.innerHTML = '';
    
    // 获取设置
    const service = this.serviceSelect.value;
    const category = this.categorySelect.value;
    const description = this.descriptionInput.value;
    
    console.log(`🚀 开始批量上传 ${this.pendingFiles.length} 个文件`);
    console.log(`📋 设置: 服务=${service}, 分类=${category}, 描述=${description}`);
    
    const results = [];
    
    for (let i = 0; i < this.pendingFiles.length; i++) {
      const fileObj = this.pendingFiles[i];
      this.currentUploadIndex = i;
      
      // 更新进度
      const progress = Math.round(((i + 1) / this.pendingFiles.length) * 100);
      this.updateProgress(progress, `上传中: ${fileObj.name} (${i + 1}/${this.pendingFiles.length})`);
      
      // 更新文件状态
      fileObj.status = 'uploading';
      this.updateFileItem(fileObj);
      
      try {
        const result = await this.uploadSingleFile(fileObj, service, category, description);
        results.push(result);
        
        fileObj.status = result.success ? 'success' : 'error';
        this.updateFileItem(fileObj);
        
      } catch (error) {
        console.error(`上传文件 ${fileObj.name} 失败:`, error);
        results.push({
          filename: fileObj.name,
          success: false,
          error: error.message
        });
        fileObj.status = 'error';
        this.updateFileItem(fileObj);
      }
    }
    
    // 上传完成
    this.isUploading = false;
    this.updateUI();
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    this.updateProgress(100, `上传完成: 成功 ${successCount} 个，失败 ${failCount} 个`);
    this.showUploadResults(results);
    
    if (successCount > 0) {
      utils.showToast(`上传完成: 成功 ${successCount} 个，失败 ${failCount} 个`, 'success');
      
      // 清空成功上传的文件
      this.pendingFiles = this.pendingFiles.filter(f => f.status !== 'success');
      this.updateFileList();
      this.updateUI();
    }
  }
  
  async uploadSingleFile(fileObj, service, category, description) {
    const formData = new FormData();
    formData.append('images', fileObj.file);
    formData.append('service', service);
    formData.append('category', category);
    formData.append('description', description);
    
    const response = await fetch('/upload/files', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success && data.results && data.results.length > 0) {
      return data.results[0];
    } else {
      throw new Error(data.error || '上传失败');
    }
  }
  
  updateProgress(percent, status) {
    this.uploadProgress.style.width = `${percent}%`;
    this.uploadProgress.textContent = `${percent}%`;
    this.uploadStatus.textContent = status;
  }
  
  showUploadResults(results) {
    const successResults = results.filter(r => r.success);
    const failResults = results.filter(r => !r.success);
    
    let html = '';
    
    if (successResults.length > 0) {
      html += `
        <div class="alert alert-success">
          <h6><i class="bi bi-check-circle me-2"></i>上传成功 (${successResults.length})</h6>
          <ul class="mb-0">
            ${successResults.map(r => `
              <li>
                ${r.filename} 
                ${r.wasCompressed ? `<span class="badge bg-warning ms-2">已压缩 ${r.compressionRatio}%</span>` : ''}
                <a href="${r.url}" target="_blank" class="ms-2"><i class="bi bi-box-arrow-up-right"></i></a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    if (failResults.length > 0) {
      html += `
        <div class="alert alert-danger">
          <h6><i class="bi bi-exclamation-triangle me-2"></i>上传失败 (${failResults.length})</h6>
          <ul class="mb-0">
            ${failResults.map(r => `<li>${r.filename}: ${r.error}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    this.uploadResults.innerHTML = html;
  }
  
  async loadServiceStatus() {
    try {
      const response = await fetch('/upload/services/status');
      const data = await response.json();
      
      if (data.success) {
        this.showServiceStatus(data.services);
      } else {
        this.serviceStatus.innerHTML = '<div class="text-danger">获取服务状态失败</div>';
      }
    } catch (error) {
      console.error('加载服务状态失败:', error);
      this.serviceStatus.innerHTML = '<div class="text-danger">网络错误</div>';
    }
  }
  
  showServiceStatus(services) {
    let html = '';
    
    Object.entries(services).forEach(([name, status]) => {
      const statusClass = status.success ? 'text-success' : 'text-danger';
      const icon = status.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
      
      html += `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span>${name}</span>
          <span class="${statusClass}">
            <i class="bi ${icon} me-1"></i>
            ${status.success ? '正常' : '异常'}
            ${status.responseTime ? `(${status.responseTime}ms)` : ''}
          </span>
        </div>
      `;
    });
    
    this.serviceStatus.innerHTML = html;
  }
  
  async switchService() {
    const service = this.serviceSelect.value;
    
    try {
      const response = await fetch('/upload/services/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service })
      });
      
      const data = await response.json();
      
      if (data.success) {
        utils.showToast(`已切换到 ${service} 服务`, 'success');
      } else {
        utils.showToast(data.error || '切换服务失败', 'error');
      }
    } catch (error) {
      console.error('切换服务失败:', error);
      utils.showToast('网络错误', 'error');
    }
  }

  // API Key 管理功能
  initApiKeyManagement() {
    console.log('🔧 初始化API Key管理...');

    // 从localStorage加载保存的API Key
    const savedApiKey = localStorage.getItem('picgo_api_key') || '';
    const apiKeyInput = document.getElementById('picgoApiKey');
    if (apiKeyInput && savedApiKey) {
      apiKeyInput.value = savedApiKey;
    }

    // 监听服务选择变化
    if (this.serviceSelect) {
      this.serviceSelect.addEventListener('change', () => {
        this.handleServiceChange();
      });
    }

    // 绑定API Key相关事件
    this.bindApiKeyEvents();

    // 初始检查
    this.handleServiceChange();
  }

  handleServiceChange() {
    const selectedService = this.serviceSelect?.value;
    const apiKeyContainer = document.getElementById('picgoApiKeyContainer');

    if (apiKeyContainer) {
      if (selectedService === 'PicGo') {
        apiKeyContainer.style.display = 'block';
      } else {
        apiKeyContainer.style.display = 'none';
      }
    }
  }

  bindApiKeyEvents() {
    const apiKeyInput = document.getElementById('picgoApiKey');
    const toggleBtn = document.getElementById('toggleApiKeyVisibility');
    const testBtn = document.getElementById('testApiKey');

    // 切换密码可见性
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleBtn.innerHTML = type === 'password' ?
          '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
      });
    }

    // 测试API Key
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testPicGoApiKey();
      });
    }

    // 自动保存API Key
    if (apiKeyInput) {
      apiKeyInput.addEventListener('blur', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          localStorage.setItem('picgo_api_key', apiKey);
          console.log('✅ PicGo API Key 已保存到本地');
        }
      });
    }
  }

  async testPicGoApiKey() {
    const apiKeyInput = document.getElementById('picgoApiKey');
    const testBtn = document.getElementById('testApiKey');

    if (!apiKeyInput || !testBtn) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      utils.showToast('请先输入API Key', 'warning');
      return;
    }

    // 更新按钮状态
    const originalHtml = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>测试中...';

    try {
      // 发送测试请求
      const response = await fetch('/upload/set-picgo-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();

      if (data.success) {
        utils.showToast('API Key 验证成功！', 'success');
        // 保存到本地存储
        localStorage.setItem('picgo_api_key', apiKey);
      } else {
        utils.showToast(data.error || 'API Key 验证失败', 'error');
      }
    } catch (error) {
      console.error('测试API Key失败:', error);
      utils.showToast('网络错误，无法验证API Key', 'error');
    } finally {
      // 恢复按钮状态
      testBtn.disabled = false;
      testBtn.innerHTML = originalHtml;
    }
  }

  // 在上传前确保API Key已设置
  async ensurePicGoApiKey() {
    const selectedService = this.serviceSelect?.value;

    if (selectedService === 'PicGo') {
      const apiKeyInput = document.getElementById('picgoApiKey');
      const apiKey = apiKeyInput?.value.trim() || localStorage.getItem('picgo_api_key');

      if (!apiKey) {
        utils.showToast('请先设置PicGo API Key', 'warning');
        apiKeyInput?.focus();
        return false;
      }

      // 设置API Key到服务器
      try {
        const response = await fetch('/upload/set-picgo-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ apiKey })
        });

        const data = await response.json();
        if (!data.success) {
          utils.showToast(data.error || 'API Key 设置失败', 'error');
          return false;
        }
      } catch (error) {
        console.error('设置API Key失败:', error);
        utils.showToast('网络错误，无法设置API Key', 'error');
        return false;
      }
    }

    return true;
  }
}

// 初始化上传管理器
document.addEventListener('DOMContentLoaded', () => {
  window.uploadManager = new UploadManager();
});
