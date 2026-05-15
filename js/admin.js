/**
 * Blog Admin Panel
 * Post CRUD, localStorage persistence, import/export, password protection
 */

const Admin = (() => {
  const STORAGE_KEY = 'blog_posts';
  const AUTH_KEY = 'blog_admin_auth';
  const DEFAULT_PASSWORD = 'admin123'; // Change this!

  let posts = [];
  let currentEditId = null;
  let isAuthenticated = false;

  // ==================== Authentication ====================

  function checkAuth() {
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (auth === 'true') {
      isAuthenticated = true;
      showPanel();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    const app = document.getElementById('admin-app');
    app.innerHTML = `
      <div class="admin-login">
        <div class="admin-login-card">
          <h1 class="admin-login-title">博客管理</h1>
          <div class="admin-form-group">
            <input type="password" id="login-password" class="admin-input"
                   placeholder="请输入管理密码" autofocus>
          </div>
          <div class="admin-form-group">
            <button onclick="Admin.login()" class="admin-btn admin-btn-primary" style="width:100%">
              登 录
            </button>
          </div>
          <p id="login-error" style="color:#d05040;font-size:0.8rem;margin-top:12px;display:none;"></p>
        </div>
      </div>
    `;

    document.getElementById('login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Admin.login();
    });
  }

  function login() {
    const input = document.getElementById('login-password');
    const error = document.getElementById('login-error');

    if (input.value === DEFAULT_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      isAuthenticated = true;
      showPanel();
      loadPosts();
    } else {
      error.textContent = '密码错误';
      error.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    isAuthenticated = false;
    showLogin();
  }

  // ==================== Data Management ====================

  function loadPosts() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        posts = JSON.parse(stored);
      } catch (e) {
        posts = [];
      }
    }

    // If no localStorage data, try to load from JSON file
    if (!stored || posts.length === 0) {
      fetch('data/posts.json')
        .then(r => r.json())
        .then(data => {
          if (data.posts && data.posts.length > 0 && !stored) {
            posts = data.posts;
            savePosts();
          }
          renderPostList();
        })
        .catch(() => {
          posts = posts || [];
          renderPostList();
        });
    } else {
      renderPostList();
    }
  }

  function savePosts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  function generateId(title) {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, '-')
      .replace(/^-|-$/g, '')
      || 'post';
    const timestamp = Date.now().toString(36);
    return base + '-' + timestamp;
  }

  // ==================== UI Rendering ====================

  function showPanel() {
    const app = document.getElementById('admin-app');

    const published = posts.filter(p => p.published !== false).length;
    const drafts = posts.filter(p => p.published === false).length;

    app.innerHTML = `
      <div class="admin-toolbar">
        <div>
          <h1 class="admin-toolbar-title">文章管理</h1>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
            ${published} 篇已发布 · ${drafts} 篇草稿 · 共 ${posts.length} 篇
          </p>
        </div>
        <div class="admin-toolbar-actions">
          <button onclick="Admin.newPost()" class="admin-btn admin-btn-primary">+ 新建文章</button>
          <button onclick="Admin.exportData()" class="admin-btn admin-btn-secondary">导出 JSON</button>
          <button onclick="document.getElementById('import-file').click()" class="admin-btn admin-btn-secondary">导入 JSON</button>
          <input type="file" id="import-file" accept=".json" style="display:none"
                 onchange="Admin.importData(event)">
          <button onclick="Admin.logout()" class="admin-btn admin-btn-secondary" style="font-size:0.75rem;">退出</button>
        </div>
      </div>

      <div id="admin-post-list" class="admin-post-list"></div>
      <div id="admin-editor"></div>
    `;

    renderPostList();
  }

  function renderPostList() {
    const container = document.getElementById('admin-post-list');
    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px;">
          <p class="empty-state-text">还没有文章，点击「新建文章」开始写作</p>
        </div>
      `;
      return;
    }

    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.map(post => `
      <div class="admin-post-item">
        <div class="admin-post-info">
          <div class="admin-post-item-title">${Utils.escapeHtml(post.title)}</div>
          <div class="admin-post-item-meta">
            ${Utils.formatDate(post.date)} · ${Utils.getReadingTime(post.content)}
            ${post.tags && post.tags.length ? ' · ' + post.tags.map(t => Utils.escapeHtml(t)).join(', ') : ''}
          </div>
        </div>
        <span class="admin-post-item-status ${post.published !== false ? 'published' : 'draft'}">
          ${post.published !== false ? '已发布' : '草稿'}
        </span>
        <div class="admin-post-actions">
          <button onclick="Admin.editPost('${post.id}')" class="admin-btn admin-btn-secondary admin-btn-small">编辑</button>
          <button onclick="Admin.deletePost('${post.id}')" class="admin-btn admin-btn-danger admin-btn-small">删除</button>
        </div>
      </div>
    `).join('');
  }

  function newPost() {
    currentEditId = null;
    renderEditor({
      id: '',
      title: '',
      date: new Date().toISOString().split('T')[0],
      tags: [],
      excerpt: '',
      content: '',
      featured_image: '',
      published: true
    });
  }

  function editPost(id) {
    currentEditId = id;
    const post = posts.find(p => p.id === id);
    if (post) {
      renderEditor({ ...post });
    }
  }

  function deletePost(id) {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;

    posts = posts.filter(p => p.id !== id);
    savePosts();

    // Clear editor if editing the deleted post
    if (currentEditId === id) {
      currentEditId = null;
      document.getElementById('admin-editor').innerHTML = '';
    }

    renderPostList();
    showToast('文章已删除', 'success');
  }

  function renderEditor(post) {
    const container = document.getElementById('admin-editor');
    const isNew = !post.id;

    container.innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor-header">
          <h2 class="admin-editor-title">${isNew ? '新建文章' : '编辑文章'}</h2>
        </div>

        <div class="admin-form-group">
          <label class="admin-label">标题</label>
          <input type="text" id="edit-title" class="admin-input"
                 value="${Utils.escapeHtml(post.title)}" placeholder="文章标题">
        </div>

        <div class="admin-input-row">
          <div class="admin-form-group">
            <label class="admin-label">日期</label>
            <input type="date" id="edit-date" class="admin-input" value="${post.date}">
          </div>
          <div class="admin-form-group">
            <label class="admin-label">标签（逗号分隔）</label>
            <input type="text" id="edit-tags" class="admin-input"
                   value="${(post.tags || []).join(', ')}" placeholder="技术, 前端, 设计">
          </div>
        </div>

        <div class="admin-form-group">
          <label class="admin-label">摘要</label>
          <input type="text" id="edit-excerpt" class="admin-input"
                 value="${Utils.escapeHtml(post.excerpt || '')}" placeholder="文章摘要（可选，留空则自动截取）">
        </div>

        <div class="admin-form-group">
          <label class="admin-label">
            内容（Markdown）
          </label>
          <textarea id="edit-content" class="admin-input"
                    placeholder="使用 Markdown 语法书写...">${Utils.escapeHtml(post.content || '')}</textarea>
        </div>

        <div class="admin-form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;color:var(--text-secondary);">
            <input type="checkbox" id="edit-published" ${post.published !== false ? 'checked' : ''}>
            发布（取消勾选则保存为草稿）
          </label>
        </div>

        <div class="admin-editor-actions">
          <button onclick="Admin.savePost()" class="admin-btn admin-btn-primary">保存</button>
          <button onclick="Admin.togglePreview()" class="admin-btn admin-btn-secondary">预览</button>
          <button onclick="Admin.cancelEdit()" class="admin-btn admin-btn-secondary">取消</button>
        </div>

        <div id="edit-preview" class="admin-editor-preview" style="display:none;">
          <div class="admin-editor-preview-title">预览</div>
          <div id="edit-preview-content" class="post-body"></div>
        </div>
      </div>
    `;
  }

  function savePost() {
    const title = document.getElementById('edit-title').value.trim();
    const date = document.getElementById('edit-date').value;
    const tagsStr = document.getElementById('edit-tags').value;
    const excerpt = document.getElementById('edit-excerpt').value.trim();
    const content = document.getElementById('edit-content').value;
    const published = document.getElementById('edit-published').checked;

    if (!title) {
      showToast('请输入文章标题', 'error');
      return;
    }

    const tags = tagsStr
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Auto-generate excerpt from content if not provided
    const autoExcerpt = excerpt || content
      .replace(/[#*>`\[\]()!\-_|~]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 200) + (content.replace(/[#*>`\[\]()!\-_|~]/g, '').length > 200 ? '...' : '');

    const postData = {
      id: currentEditId || generateId(title),
      title,
      date,
      tags,
      excerpt: autoExcerpt,
      content,
      featured_image: '',
      published
    };

    if (currentEditId) {
      // Update existing
      const idx = posts.findIndex(p => p.id === currentEditId);
      if (idx >= 0) {
        posts[idx] = { ...posts[idx], ...postData };
      }
    } else {
      // New post
      posts.unshift(postData);
    }

    savePosts();
    currentEditId = null;
    document.getElementById('admin-editor').innerHTML = '';
    renderPostList();

    // Update count
    const publishedCount = posts.filter(p => p.published !== false).length;
    const draftCount = posts.filter(p => p.published === false).length;

    showToast('文章已保存' + (published ? '并发布' : '为草稿'), 'success');
  }

  function cancelEdit() {
    if (document.getElementById('edit-content').value.trim() && !confirm('确定放弃编辑？未保存的更改将丢失。')) {
      return;
    }
    currentEditId = null;
    document.getElementById('admin-editor').innerHTML = '';
  }

  function togglePreview() {
    const preview = document.getElementById('edit-preview');
    const content = document.getElementById('edit-preview-content');
    const textarea = document.getElementById('edit-content');

    if (preview.style.display === 'none') {
      if (typeof marked === 'undefined') {
        showToast('Markdown 解析器未加载，请刷新页面', 'error');
        return;
      }
      content.innerHTML = marked.parse(textarea.value || '');
      preview.style.display = 'block';
      preview.scrollIntoView({ behavior: 'smooth' });
    } else {
      preview.style.display = 'none';
    }
  }

  // ==================== Import / Export ====================

  function exportData() {
    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blog-posts-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出', 'success');
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const imported = Array.isArray(data) ? data : (data.posts || []);

        if (imported.length === 0) {
          showToast('导入的文件中没有文章数据', 'error');
          return;
        }

        if (confirm(`发现 ${imported.length} 篇文章。\\n\\n选择"确定"将替换当前所有文章\\n选择"取消"将合并到现有文章中`)) {
          posts = imported;
        } else {
          // Merge: add imported posts that don't exist (by id)
          const existingIds = new Set(posts.map(p => p.id));
          const newPosts = imported.filter(p => !existingIds.has(p.id));
          posts = [...posts, ...newPosts];
        }

        savePosts();
        renderPostList();
        showToast(`成功导入 ${imported.length} 篇文章`, 'success');
      } catch (err) {
        showToast('JSON 解析失败，请检查文件格式', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // ==================== Utilities ====================

  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-app')) {
      checkAuth();
    }
  });

  return {
    login,
    logout,
    checkAuth,
    loadPosts,
    newPost,
    editPost,
    deletePost,
    savePost,
    cancelEdit,
    togglePreview,
    exportData,
    importData
  };
})();
