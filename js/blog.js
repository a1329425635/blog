/**
 * Blog Engine - Arknights-Inspired Personal Blog
 * Handles post loading, rendering, and display logic
 */

const Blog = (() => {
  // Dynamic base URL: works from / and from subdirectories like /blog/, /post/
  const BASE_URL = (() => {
    const depth = (window.location.pathname.match(/\//g) || []).length;
    return depth > 1 ? '../'.repeat(depth - 1) : '';
  })();
  const POSTS_DATA_PATH = BASE_URL + 'data/posts.json';
  const STORAGE_KEY = 'blog_posts';

  async function loadPosts() {
    let basePosts = [];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          basePosts = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse localStorage posts, falling back to JSON');
      }
    }

    if (basePosts.length === 0) {
      try {
        const resp = await fetch(POSTS_DATA_PATH);
        if (resp.ok) {
          const data = await resp.json();
          basePosts = data.posts || [];
        }
      } catch (e) {
        console.error('Failed to load posts:', e);
      }
    }

    return basePosts
      .filter(p => p.published !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function getPostById(id) {
    const posts = await loadPosts();
    return posts.find(p => p.id === id) || null;
  }

  function renderPostCard(post) {
    const tags = (post.tags || [])
      .map(t => `<span class="post-card-tag">${Utils.escapeHtml(t)}</span>`)
      .join('');

    return `
      <a href="${BASE_URL}post/?id=${encodeURIComponent(post.id)}" class="post-card animate-in">
        <div class="post-card-meta">
          <span class="post-card-date">${Utils.formatDate(post.date)}</span>
          ${tags ? '<span class="post-card-tags">' + tags + '</span>' : ''}
        </div>
        <h2 class="post-card-title">${Utils.escapeHtml(post.title)}</h2>
        ${post.excerpt ? `<p class="post-card-excerpt">${Utils.escapeHtml(post.excerpt)}</p>` : ''}
        <span class="post-card-readmore">
          阅读更多 <span class="post-card-readmore-arrow">→</span>
        </span>
      </a>
    `;
  }

  function showLoadingSkeleton(container, count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton post-card-skeleton" aria-hidden="true">
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line"></div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  async function renderPostList(container, options = {}) {
    const { limit, tag, search, skipSkeleton } = options;

    if (!skipSkeleton) {
      showLoadingSkeleton(container);
    }

    let posts = await loadPosts();

    if (tag) {
      posts = posts.filter(p => (p.tags || []).some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">◇</div>
          <p class="empty-state-text">${search ? '没有找到匹配的文章' : '还没有文章，敬请期待'}</p>
        </div>
      `;
      return;
    }

    const sliced = limit ? posts.slice(0, limit) : posts;
    container.innerHTML = sliced.map(renderPostCard).join('');
  }

  function renderPost(post, container) {
    if (!post) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">◇</div>
          <p class="empty-state-text">文章未找到</p>
        </div>
      `;
      return;
    }

    const tagsHtml = (post.tags || [])
      .map(t => `<span class="post-tag">${Utils.escapeHtml(t)}</span>`)
      .join('');

    document.title = post.title + ' - 博客';
    setMeta('og:title', post.title);
    setMeta('og:description', (post.excerpt || post.content || '').replace(/[#*>`\[\]()!\-_|~\n]/g, '').trim().substring(0, 200));
    setMeta('description', (post.excerpt || post.content || '').replace(/[#*>`\[\]()!\-_|~\n]/g, '').trim().substring(0, 200));

    container.innerHTML = `
      <article>
        <header class="post-header">
          <a href="${BASE_URL}" class="post-header-back">
            <span>←</span> 返回首页
          </a>
          <h1 class="post-title">${Utils.escapeHtml(post.title)}</h1>
          <div class="post-meta">
            <span class="post-meta-date">${Utils.formatDate(post.date)}</span>
            <span class="post-meta-sep">·</span>
            <span class="post-meta-reading">阅读时间约 ${Utils.getReadingTime(post.content)}</span>
          </div>
          ${tagsHtml ? '<div class="post-tags">' + tagsHtml + '</div>' : ''}
        </header>
        <div class="post-content">
          <div class="post-body" id="post-body-content">
            ${typeof marked !== 'undefined' ? marked.parse(post.content || '') : '<p style="color:#d05040;">Markdown 解析器加载失败，请刷新页面重试。</p>'}
          </div>
        </div>
      </article>
    `;
  }

  async function initHomePage() {
    const container = document.getElementById('post-list');
    if (!container) return;

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          renderPostList(container, { search: searchInput.value.trim() });
        }, 250);
      });
    }

    await renderPostList(container);
  }

  async function initPostPage() {
    const container = document.getElementById('post-content');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (!postId) {
      window.location.href = BASE_URL || './';
      return;
    }

    container.innerHTML = `
      <div aria-hidden="true">
        <header class="post-header">
          <div class="sk-line" style="width:80px;height:12px;margin:0 auto 24px;background:var(--border-active);border-radius:2px;"></div>
          <div class="sk-line" style="width:60%;height:36px;margin:0 auto 20px;background:var(--border-active);border-radius:2px;max-width:500px;"></div>
          <div class="sk-line" style="width:200px;height:14px;margin:0 auto;background:var(--border-active);border-radius:2px;"></div>
        </header>
        <div class="post-content">
          <div class="post-body" style="max-width:var(--max-width-narrow);margin:0 auto;">
            <div class="sk-line" style="width:100%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:85%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:92%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:60%;height:16px;margin-bottom:32px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:75%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:90%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
            <div class="sk-line" style="width:40%;height:16px;margin-bottom:12px;background:var(--border-active);border-radius:2px;"></div>
          </div>
        </div>
      </div>
    `;

    const post = await getPostById(postId);
    renderPost(post, container);
  }

  async function initBlogPage() {
    const container = document.getElementById('post-list');
    if (!container) return;

    const tagFilter = document.getElementById('tag-filter');
    const searchInput = document.getElementById('search-input');

    let activeTag = null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tag')) {
      activeTag = params.get('tag');
    }

    showLoadingSkeleton(container);

    // Load posts once, use for both tags and display
    const allPosts = await loadPosts();

    // Build tag counts
    const tagCounts = {};
    allPosts.forEach(p => {
      (p.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    // Render tag filter
    if (tagFilter && Object.keys(tagCounts).length > 0) {
      const tagKeys = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
      tagFilter.innerHTML = `
        <button class="tag-filter-btn ${!activeTag ? 'active' : ''}" data-tag="">
          全部<span class="tag-filter-count">${allPosts.length}</span>
        </button>
        ${tagKeys.map(t => `
          <button class="tag-filter-btn ${activeTag === t ? 'active' : ''}" data-tag="${Utils.escapeHtml(t)}">
            ${Utils.escapeHtml(t)}<span class="tag-filter-count">${tagCounts[t]}</span>
          </button>
        `).join('')}
      `;

      tagFilter.querySelectorAll('.tag-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTag = btn.dataset.tag || null;
          tagFilter.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const search = searchInput ? searchInput.value.trim() : '';
          renderPostList(container, { tag: activeTag, search });
        });
      });
    }

    // Search handler
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const search = searchInput.value.trim();
          renderPostList(container, { tag: activeTag, search });
        }, 250);
      });
    }

    // Render with cached posts (skip second fetch via skipSkeleton flag)
    await filterAndRender(allPosts, container, { tag: activeTag });
  }

  function setMeta(property, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  // In-memory filter without re-fetching
  function filterAndRender(posts, container, options = {}) {
    const { tag, search } = options;
    let result = [...posts];

    if (tag) {
      result = result.filter(p => (p.tags || []).some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (result.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">◇</div>
          <p class="empty-state-text">${search ? '没有找到匹配的文章' : '还没有文章，敬请期待'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = result.map(renderPostCard).join('');
  }

  // Public API
  return {
    loadPosts,
    getPostById,
    renderPostList,
    renderPost,
    initHomePage,
    initBlogPage,
    initPostPage
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  const hasTagFilter = document.getElementById('tag-filter');
  const hasPostList = document.getElementById('post-list');
  const hasPostContent = document.getElementById('post-content');

  if (hasPostList && hasTagFilter) {
    Blog.initBlogPage();
  } else if (hasPostList) {
    Blog.initHomePage();
  }

  if (hasPostContent) {
    Blog.initPostPage();
  }
});
