(() => {
  const registry = window.GY_I18N || {};

  function dictionary(lang) {
    const source = registry[lang] || registry.ja || {};
    const page = document.body.dataset.page || "home";
    return Object.assign({}, source.common || {}, source[page] || {});
  }

  function applyLang(lang) {
    if (!registry[lang]) lang = "ja";
    const dict = dictionary(lang);
    document.body.dataset.lang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = dict[element.dataset.i18n];
      if (value === undefined) return;
      if (element.dataset.i18nHtml === "true") {
        const lines = value.split("\n");
        if (element.classList.contains("page-hero-title") && lines.length > 1) {
          element.innerHTML = `${lines[0]}<span class="page-hero-subtitle">${lines.slice(1).join("<br>")}</span>`;
        } else {
          element.innerHTML = value.replace(/\n/g, "<br>");
        }
      }
      else element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = dict[element.dataset.i18nPlaceholder];
      if (value !== undefined) element.placeholder = value;
    });
    if (dict.pageTitle) document.title = dict.pageTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && dict.pageDescription) meta.content = dict.pageDescription;
    document.querySelectorAll(".lang-switch button").forEach((button) => {
      button.classList.toggle("active", button.dataset.lang === lang);
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
    try { localStorage.setItem("gy-lang", lang); } catch (_) {}
    document.dispatchEvent(new CustomEvent("gy:langchange", { detail: { lang } }));
  }

  function applyContactTopicFromUrl() {
    const select = document.querySelector(".contact-form select[name='topic']");
    if (!select) return;
    const topicValues = {
      business: "Japan-China Business",
      culture: "Cultural Exchange",
      education: "Japanese Education / Teaching Application",
      other: "Other"
    };
    const topic = new URLSearchParams(window.location.search).get("topic");
    const value = topicValues[topic];
    if (value) select.value = value;
  }

  function configureFormSuccessPage() {
    document.querySelectorAll(".contact-form input[name='_next']").forEach((input) => {
      input.value = new URL("thanks.html", window.location.href).href;
    });
  }

  function boot() {
    let stored = null;
    try { stored = localStorage.getItem("gy-lang"); } catch (_) {}
    applyLang(stored || document.body.dataset.lang || "ja");
    applyContactTopicFromUrl();
    configureFormSuccessPage();
    document.querySelectorAll(".lang-switch button, [data-set-lang]").forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        applyLang(control.dataset.lang || control.dataset.setLang);
      });
    });
    const toggle = document.querySelector(".mobile-toggle");
    const menu = document.querySelector(".nav-menu");
    if (toggle && menu) toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".reveal").forEach((element) => {
      const observer = new IntersectionObserver((entries, self) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("visible"); self.unobserve(entry.target); }
        });
      }, { threshold: .08 });
      observer.observe(element);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
