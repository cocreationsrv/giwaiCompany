(() => {
  const LANGS = ["ja", "zh", "en"];
  const state = { items: [], currentId: null, quills: {} };
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const newsForm = document.getElementById("newsForm");
  const newsList = document.getElementById("newsList");
  const editorMessage = document.getElementById("editorMessage");
  const editorTitle = document.getElementById("editorTitle");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const fileUploadInput = document.getElementById("fileUploadInput");
  const attachmentList = document.getElementById("attachmentList");

  async function json(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(url, {
      headers: isFormData ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
    return data;
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

  function showMessage(message, type = "error") {
    editorMessage.textContent = message || "";
    editorMessage.classList.toggle("success", type === "success");
    editorMessage.classList.toggle("error", type !== "success");
  }

  function showLoginMessage(message) {
    loginMessage.textContent = message || "";
  }

  function formatSize(value) {
    const size = Number(value || 0);
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function slugify(value) {
    const ascii = String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return ascii || `news-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
  }

  function editorHtml(lang) {
    const html = state.quills[lang]?.root.innerHTML.trim() || "";
    return html === "<p><br></p>" ? "" : html;
  }

  function syncRichEditors() {
    LANGS.forEach((lang) => {
      newsForm.elements[`${lang}_body`].value = editorHtml(lang);
    });
  }

  function formPayload() {
    syncRichEditors();
    const fd = new FormData(newsForm);
    let slug = String(fd.get("slug") || "").trim();
    if (!slug) {
      slug = slugify(fd.get("ja_title"));
      newsForm.elements.slug.value = slug;
    }
    return {
      id: fd.get("id") || null,
      slug,
      status: fd.get("status"),
      published_at: fd.get("published_at"),
      translations: {
        ja: { title: fd.get("ja_title"), excerpt: fd.get("ja_excerpt"), body: fd.get("ja_body") },
        zh: { title: fd.get("zh_title"), excerpt: fd.get("zh_excerpt"), body: fd.get("zh_body") },
        en: { title: fd.get("en_title"), excerpt: fd.get("en_excerpt"), body: fd.get("en_body") }
      }
    };
  }

  function setField(name, value) {
    newsForm.elements[name].value = value || "";
  }

  function setRichContent(lang, value) {
    if (state.quills[lang]) {
      state.quills[lang].root.innerHTML = value || "";
    }
    setField(`${lang}_body`, value || "");
  }

  function currentLang() {
    const active = document.querySelector("[data-lang-tab].active");
    return active?.dataset.langTab || "ja";
  }

  function insertImageIntoEditor(lang, url) {
    const quill = state.quills[lang];
    if (!quill) return;
    const range = quill.getSelection(true) || { index: quill.getLength() };
    quill.insertEmbed(range.index, "image", url, "user");
    quill.insertText(range.index + 1, "\n", "user");
    quill.setSelection(range.index + 2, 0, "silent");
    syncRichEditors();
  }

  function resetForm() {
    state.currentId = null;
    newsForm.reset();
    setField("id", "");
    setField("published_at", today());
    setField("status", "draft");
    LANGS.forEach((lang) => setRichContent(lang, ""));
    editorTitle.textContent = "新規お知らせ";
    showMessage("");
    renderAttachments([]);
    renderList();
  }

  function editItem(item, options = {}) {
    state.currentId = item.id;
    setField("id", item.id);
    setField("slug", item.slug);
    setField("status", item.status);
    setField("published_at", item.published_at);
    LANGS.forEach((lang) => {
      const data = item.translations[lang] || {};
      setField(`${lang}_title`, data.title);
      setField(`${lang}_excerpt`, data.excerpt);
      setRichContent(lang, data.body);
    });
    editorTitle.textContent = item.translations.ja?.title || item.slug;
    if (!options.keepMessage) showMessage("");
    renderAttachments(item.attachments || []);
    renderList();
  }

  function renderAttachments(items) {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      attachmentList.innerHTML = '<p class="admin-small">保存後にアップロードできます。</p>';
      return;
    }
    if (!items.length) {
      attachmentList.innerHTML = '<p class="admin-small">アップロード済みファイルはまだありません。</p>';
      return;
    }
    attachmentList.innerHTML = items.map((item) => {
      const isImage = item.kind === "image";
      return `<div class="attachment-item" data-attachment-id="${item.id}">
        <div class="attachment-thumb">${isImage ? `<img src="${escapeHtml(item.url)}" alt="">` : "FILE"}</div>
        <div><div class="attachment-name">${escapeHtml(item.name)}</div><div class="attachment-meta">${escapeHtml(item.mime_type || item.kind)} / ${formatSize(item.file_size)}</div></div>
        <div class="attachment-actions">
          ${isImage ? `<button class="admin-btn ghost" type="button" data-insert-image="${item.id}">本文に挿入</button>` : ""}
          <a class="admin-btn ghost" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">開く</a>
          <button class="admin-btn danger" type="button" data-delete-attachment="${item.id}">削除</button>
        </div>
      </div>`;
    }).join("");
    attachmentList.querySelectorAll("[data-insert-image]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = items.find((entry) => entry.id === Number(button.dataset.insertImage));
        if (item) insertImageIntoEditor(currentLang(), item.url);
      });
    });
    attachmentList.querySelectorAll("[data-delete-attachment]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!window.confirm("このファイルを削除しますか？")) return;
        try {
          await json("api/admin.php?action=deleteAttachment", {
            method: "POST",
            body: JSON.stringify({ id: Number(button.dataset.deleteAttachment) })
          });
          showMessage("削除しました。", "success");
          await loadAttachments();
        } catch (error) {
          showMessage(error.message);
        }
      });
    });
  }

  async function loadAttachments() {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      renderAttachments([]);
      return;
    }
    const data = await json(`api/admin.php?action=listAttachments&news_id=${encodeURIComponent(id)}`);
    renderAttachments(data.items || []);
    const item = state.items.find((entry) => entry.id === id);
    if (item) item.attachments = data.items || [];
  }

  function renderList() {
    if (!state.items.length) {
      newsList.innerHTML = '<p class="admin-small">まだお知らせがありません。</p>';
      return;
    }
    newsList.innerHTML = state.items.map((item) => {
      const title = item.translations.ja?.title || item.slug;
      const statusClass = item.status === "published" ? "published" : "";
      return `<button class="admin-list-item ${item.id === state.currentId ? "active" : ""}" type="button" data-id="${item.id}">
        <span class="admin-list-title">${escapeHtml(title)}</span>
        <span class="admin-list-meta">${escapeHtml(item.published_at)}<span class="admin-badge ${statusClass}">${escapeHtml(item.status)}</span></span>
      </button>`;
    }).join("");
    newsList.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = state.items.find((entry) => entry.id === Number(button.dataset.id));
        if (item) editItem(item);
      });
    });
  }

  async function loadNews() {
    const data = await json("api/admin.php?action=listNews");
    state.items = data.items || [];
    renderList();
    if (!state.currentId) resetForm();
  }

  async function showApp() {
    loginView.hidden = true;
    appView.hidden = false;
    await loadNews();
  }

  async function boot() {
    initEditors();
    const status = await json("api/admin.php?action=status");
    if (status.setupRequired) {
      window.location.href = "admin-setup.html";
      return;
    }
    if (status.authenticated) {
      await showApp();
      return;
    }
    loginView.hidden = false;
    appView.hidden = true;
    // 初期設定リンクが無効になるように表示制御
    const setupLink = document.querySelector(".admin-small a[href='admin-setup.html']");
    if (setupLink) {
      setupLink.parentElement.textContent = "初期設定は完了しています。";
    }
  }

  function normalizeUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
    return `https://${url}`;
  }

  function startUpload(kind) {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      showMessage("先にお知らせを保存してからアップロードしてください。");
      return;
    }
    const input = kind === "image" ? imageUploadInput : fileUploadInput;
    input.value = "";
    input.click();
  }

  function initEditors() {
    if (!window.Quill) {
      showMessage("エディターを読み込めませんでした。ネットワーク接続を確認してください。");
      return;
    }
    const toolbar = [
      [{ header: [2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "link", "image", "attachment"],
      ["clean"]
    ];
    LANGS.forEach((lang) => {
      const target = document.querySelector(`[data-rich-content="${lang}"]`);
      if (!target) return;
      const quill = new window.Quill(target, {
        theme: "snow",
        placeholder: "本文を入力してください",
        modules: {
          toolbar: {
            container: toolbar,
            handlers: {
              image: () => startUpload("image"),
              attachment: () => startUpload("file"),
              link(value) {
                if (!value) {
                  this.quill.format("link", false);
                  return;
                }
                const current = this.quill.getFormat().link || "";
                const url = normalizeUrl(window.prompt("URLを入力してください", current || "https://"));
                if (url) this.quill.format("link", url);
              }
            }
          }
        }
      });
      quill.on("text-change", syncRichEditors);
      state.quills[lang] = quill;
    });
  }

  async function uploadSelectedFile(file, kind) {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      showMessage("先にお知らせを保存してからアップロードしてください。");
      return;
    }
    if (!file) return;
    const body = new FormData();
    body.append("news_id", String(id));
    body.append("file", file);
    try {
      const data = await json("api/admin.php?action=uploadAttachment", { method: "POST", body });
      await loadAttachments();
      if (kind === "image" && data.item?.kind === "image") {
        insertImageIntoEditor(currentLang(), data.item.url);
      }
      showMessage("アップロードしました。", "success");
    } catch (error) {
      showMessage(error.message);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoginMessage("");
    try {
      await json("api/admin.php?action=login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries()))
      });
      await showApp();
    } catch (error) {
      showLoginMessage(error.message);
    }
  });

  newsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");
    try {
      const data = await json("api/admin.php?action=saveNews", {
        method: "POST",
        body: JSON.stringify(formPayload())
      });
      state.currentId = data.id;
      await loadNews();
      const item = state.items.find((entry) => entry.id === data.id);
      if (item) editItem(item, { keepMessage: true });
      await loadAttachments();
      showMessage("保存しました。", "success");
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.getElementById("newBtn").addEventListener("click", resetForm);
  imageUploadInput.addEventListener("change", () => uploadSelectedFile(imageUploadInput.files?.[0], "image"));
  fileUploadInput.addEventListener("change", () => uploadSelectedFile(fileUploadInput.files?.[0], "file"));

  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      showMessage("削除するお知らせを選択してください。");
      return;
    }
    if (!window.confirm("このお知らせを削除しますか？")) return;
    try {
      await json("api/admin.php?action=deleteNews", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      state.currentId = null;
      await loadNews();
      showMessage("削除しました。", "success");
    } catch (error) {
      showMessage(error.message);
    }
  });
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await json("api/admin.php?action=logout", { method: "POST", body: "{}" });
    window.location.reload();
  });

  document.querySelectorAll("[data-lang-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-lang-tab]").forEach((item) => item.classList.toggle("active", item === tab));
      document.querySelectorAll("[data-lang-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.langPanel === tab.dataset.langTab));
    });
  });

  boot().catch((error) => {
    loginView.hidden = false;
    showLoginMessage(error.message);
  });
})();
