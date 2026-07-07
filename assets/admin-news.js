(() => {
  const state = { items: [], currentId: null };
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const newsForm = document.getElementById("newsForm");
  const newsList = document.getElementById("newsList");
  const editorMessage = document.getElementById("editorMessage");
  const editorTitle = document.getElementById("editorTitle");

  async function json(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
    return data;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function slugify(value) {
    const ascii = String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return ascii || `news-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
  }

  function formPayload() {
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

  function resetForm() {
    state.currentId = null;
    newsForm.reset();
    setField("id", "");
    setField("published_at", today());
    setField("status", "draft");
    editorTitle.textContent = "新規お知らせ";
    editorMessage.textContent = "";
    renderList();
  }

  function editItem(item) {
    state.currentId = item.id;
    setField("id", item.id);
    setField("slug", item.slug);
    setField("status", item.status);
    setField("published_at", item.published_at);
    ["ja", "zh", "en"].forEach((lang) => {
      const data = item.translations[lang] || {};
      setField(`${lang}_title`, data.title);
      setField(`${lang}_excerpt`, data.excerpt);
      setField(`${lang}_body`, data.body);
    });
    editorTitle.textContent = item.translations.ja?.title || item.slug;
    editorMessage.textContent = "";
    renderList();
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
        <span class="admin-list-title">${title}</span>
        <span class="admin-list-meta">${item.published_at}<span class="admin-badge ${statusClass}">${item.status}</span></span>
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
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "";
    try {
      await json("api/admin.php?action=login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries()))
      });
      await showApp();
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });

  newsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    editorMessage.textContent = "";
    try {
      const data = await json("api/admin.php?action=saveNews", {
        method: "POST",
        body: JSON.stringify(formPayload())
      });
      editorMessage.textContent = "保存しました。";
      state.currentId = data.id;
      await loadNews();
      const item = state.items.find((entry) => entry.id === data.id);
      if (item) editItem(item);
    } catch (error) {
      editorMessage.textContent = error.message;
    }
  });

  document.getElementById("newBtn").addEventListener("click", resetForm);
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const id = Number(newsForm.elements.id.value || 0);
    if (!id) {
      editorMessage.textContent = "削除するお知らせを選択してください。";
      return;
    }
    if (!window.confirm("このお知らせを削除しますか？")) return;
    try {
      await json("api/admin.php?action=deleteNews", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      editorMessage.textContent = "削除しました。";
      state.currentId = null;
      await loadNews();
    } catch (error) {
      editorMessage.textContent = error.message;
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
    loginMessage.textContent = error.message;
  });
})();
