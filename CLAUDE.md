# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概览

静态个人博客。无构建系统、无框架——纯 HTML/CSS/JS，直接从文件系统打开。文章使用 Markdown 编写，由 marked.js 在客户端渲染。

## 查看站点

直接在浏览器中打开任意 `.html` 文件即可。无需开发服务器或构建步骤。

## 架构

### 数据流

```
data/posts.json ──→ localStorage（管理后台编辑）──→ blog.js ──→ marked.js ──→ DOM
```

- `data/posts.json` 是种子数据和发布目标
- **管理后台**（`admin.html`）从 `localStorage`（key: `blog_posts`）读取文章，首次访问时回退到 `data/posts.json`。所有编辑仅持久化到 `localStorage`——点击「导出 JSON」按钮下载文件后替换 `data/posts.json` 即可正式发布。
- **公开博客**（`blog.js`）优先从 `localStorage` 加载，回退到 `fetch('data/posts.json')`。这意味着管理后台的修改无需替换 JSON 文件即可立即在公开页面生效。

### 主题系统

`:root` 上的 CSS 自定义属性定义了整个视觉语言。日间模式通过 `<html>` 上的 `[data-theme="light"]` 作为覆盖层实现。`js/theme.js` 同步加载（放在 `<head>` 中，在页面绘制前执行）以防止闪烁。偏好设置存储在 `localStorage` 的 `blog_theme` 键中。

### 页面清单

| 页面 | JS 入口 | 关键 DOM 钩子 |
|------|---------|---------------|
| `index.html` | `blog.js` → `initHomePage()` | `#post-list`（无 `#tag-filter`） |
| `blog.html` | `blog.js` → `initBlogPage()` | `#post-list` + `#tag-filter` |
| `post.html` | `blog.js` → `initPostPage()` | `#post-content`，从 URL 读取 `?id=` |
| `links.html` | 内联脚本 | `#links-grid`，请求 `data/links.json` |
| `about.html` | 静态页面 | 无 |
| `admin.html` | `admin.js` | `#admin-app` |

`blog.js` 通过检查哪些 DOM 钩子存在来自动检测当前页面（见文件末尾的 `DOMContentLoaded` 处理器）。

### CSS Token 体系

所有颜色、间距和动画值均为 `:root` 上定义的 CSS 自定义属性。禁止在组件规则中硬编码十六进制色值或像素时长——必须使用 token。强调色系统只有两种颜色：蓝色（`--accent-blue-*`）用于交互元素，琥珀色（`--accent-amber-*`）用于日期和特殊标记。蓝色为主；琥珀色始终为辅助。

### 管理后台安全

`admin.html` 在公开页面上无任何链接，只能通过直接输入地址访问。密码在 `admin.js` 中做客户端校验（`DEFAULT_PASSWORD` 常量），存储在 `sessionStorage` 中。这不是加密级安全——仅是一道便利性门槛，而非真正的认证。

### 关键约定

- **共享工具函数**：`js/utils.js` 提供 `Utils.escapeHtml`、`Utils.formatDate`、`Utils.getReadingTime`。所有页面均加载此文件（同步，在 `<head>` 中），`blog.js` 和 `admin.js` 不再重复定义这些函数。
- **移动端导航**：`≤768px` 时导航折叠为汉堡菜单。`js/theme.js` 的 `initMobileNav()` 处理开关逻辑，按钮 ID 为 `#nav-toggle`，菜单列表为 `.nav-links`。
- **Markdown 渲染**：调用 `marked.parse()` 前务必用 `typeof marked !== 'undefined'` 做守卫——CDN 可能加载失败。
- **marked.js CDN**：主源为 jsdelivr。`<script>` 标签上的 `onerror` 处理器会创建一个回退 `<script>` 指向 `lib.baomitu.com`（国内可访问的镜像）。
- **主题切换**：`js/theme.js` 必须在 `<head>` 中同步加载，位于所有其他脚本之前，以防止页面闪烁（FOUC）。其他脚本均使用 `defer`。
- **动画时长上限**：所有动画/过渡不超过 400ms（`--duration-slow: 380ms`），微交互 150–300ms。
- **安全区**：导航栏使用 `env(safe-area-inset-top)`，确保刘海屏/岛屏适配。
- **中文文本**：所有 UI 文案和示例文章均为中文。`<html>` 上设置了 `lang="zh-CN"`。
