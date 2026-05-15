/**
 * Shared utilities used by both blog.js and admin.js
 */
const Utils = {
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  getReadingTime(content) {
    if (!content) return '1 分钟';
    const text = content.replace(/[#*>`\[\]()!\-_|~]/g, '');
    const chars = text.length;
    const minutes = Math.max(1, Math.ceil(chars / 400));
    return minutes + ' 分钟';
  }
};
