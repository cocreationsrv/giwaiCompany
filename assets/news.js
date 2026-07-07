(() => {
  const LANGS = new Set(["ja", "zh", "en"]);

  function currentLang() {
    const lang = document.body.dataset.lang || document.documentElement.lang || "ja";
    return LANGS.has(lang) ? lang : "ja";
  }

  function t(key) {
    const lang = currentLang();
    const registry = window.GY_I18N || {};
    const dict = Object.assign({}, registry[lang]?.common || {}, registry[lang]?.news || {});
    return dict[key] || registry.ja?.news?.[key] || registry.ja?.common?.[key] || key;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(currentLang() === "zh" ? "zh-CN" : currentLang(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function bodyToHtml(value) {
    if (/<[a-z][\s\S]*>/i.test(String(value || ""))) return String(value || "");
    const blocks = String(value || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    if (!blocks.length) return "";
    return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`).join("");
  }

  function formatFileSize(value) {
    const size = Number(value || 0);
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  }

  function attachmentsToHtml(items) {
    const files = (items || []).filter((item) => item.kind !== "image");
    if (!files.length) return "";
    return `<div class="news-attachments"><h3>${escapeHtml(t("attachmentsTitle"))}</h3><div class="news-attachment-list">${files.map((item) => `
      <a class="news-attachment" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        <span class="news-attachment-kind">FILE</span>
        <span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.mime_type || item.kind)} / ${formatFileSize(item.file_size)}</small></span>
      </a>
    `).join("")}</div></div>`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
    return data;
  }

  async function renderLists() {
    const lists = document.querySelectorAll("[data-news-list]");
    if (!lists.length) return;
    const lang = currentLang();
    const limit = Math.max(...Array.from(lists).map((list) => Number(list.dataset.newsLimit || 0)));
    const data = await fetchJson(`api/news.php?action=list&lang=${encodeURIComponent(lang)}${limit ? `&limit=${limit}` : ""}`);
    const items = data.items || [];
    lists.forEach((list) => {
      const localLimit = Number(list.dataset.newsLimit || 0);
      const localItems = localLimit ? items.slice(0, localLimit) : items;
      if (!localItems.length) {
        list.innerHTML = `<p class="news-empty">${escapeHtml(t("newsEmpty"))}</p>`;
        return;
      }
      list.innerHTML = localItems.map((item) => `
        <article class="card news-card">
          <a href="news-detail.html?slug=${encodeURIComponent(item.slug)}">
            <span class="tag">${escapeHtml(formatDate(item.published_at))}</span>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.excerpt ? `<p>${escapeHtml(item.excerpt)}</p>` : ""}
          </a>
        </article>
      `).join("");
    });
  }

  async function renderDetail() {
    const target = document.querySelector("[data-news-detail]");
    if (!target) return;
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      target.innerHTML = `<p class="news-empty">${escapeHtml(t("newsNotFound"))}</p>`;
      return;
    }
    const lang = currentLang();
    const data = await fetchJson(`api/news.php?action=detail&lang=${encodeURIComponent(lang)}&slug=${encodeURIComponent(slug)}`);
    const item = data.item;
    if (!item) {
      target.innerHTML = `<p class="news-empty">${escapeHtml(t("newsNotFound"))}</p>`;
      return;
    }
    const title = document.querySelector("[data-news-detail-title]");
    const excerpt = document.querySelector("[data-news-detail-excerpt]");
    if (title) title.textContent = item.title;
    if (excerpt) excerpt.textContent = item.excerpt || "";
    document.title = `${item.title} | GY COMPANY`;
    target.innerHTML = `
      <div class="tag">${escapeHtml(formatDate(item.published_at))}</div>
      <h2 class="section-title">${escapeHtml(item.title)}</h2>
      ${item.excerpt ? `<p class="section-lead">${escapeHtml(item.excerpt)}</p>` : ""}
      <div class="news-body">${bodyToHtml(item.body)}</div>
      ${attachmentsToHtml(item.attachments)}
    `;
  }

  async function renderNews() {
    try {
      await Promise.all([renderLists(), renderDetail()]);
    } catch (error) {
      document.querySelectorAll("[data-news-list], [data-news-detail]").forEach((target) => {
        target.innerHTML = `<p class="news-empty">${escapeHtml(t("newsError"))}</p>`;
      });
    }
  }

  document.addEventListener("gy:langchange", renderNews);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderNews);
  else renderNews();
})();
