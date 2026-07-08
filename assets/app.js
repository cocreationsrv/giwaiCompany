(() => {
  const registry = window.GY_I18N || {};
  const thanksStatusText = {
    ja: {
      savedTitle: "お問い合わせ内容を保存しました",
      savedLead: "ローカル環境ではメール送信が利用できないため、内容をサーバー内に保存しました。本番サーバーのメール設定後に送信できます。",
      errorTitle: "送信できませんでした",
      errorLead: "入力内容をご確認のうえ、時間をおいてもう一度お試しください。解決しない場合はメールでお問い合わせください。"
    },
    zh: {
      savedTitle: "咨询内容已保存",
      savedLead: "本地环境无法直接发送邮件，因此已将内容保存到服务器内。配置正式服务器邮件后即可发送。",
      errorTitle: "发送失败",
      errorLead: "请确认填写内容后稍后再试。如仍无法解决，请通过电子邮件联系我们。"
    },
    en: {
      savedTitle: "Inquiry saved",
      savedLead: "Email sending is not available in the local environment, so the inquiry was saved on the server. It can be sent after mail is configured on production.",
      errorTitle: "Submission failed",
      errorLead: "Please check the form and try again later. If the issue continues, please contact us by email."
    }
  };

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
    document.querySelectorAll(".contact-form input[name='lang']").forEach((input) => {
      input.value = lang;
    });
    try { localStorage.setItem("gy-lang", lang); } catch (_) {}
    applyThanksStatus(lang);
    document.dispatchEvent(new CustomEvent("gy:langchange", { detail: { lang } }));
  }

  function applyThanksStatus(lang) {
    if (document.body.dataset.page !== "thanks") return;
    const status = new URLSearchParams(window.location.search).get("status");
    if (status !== "saved" && status !== "error") return;
    const messages = thanksStatusText[lang] || thanksStatusText.ja;
    const title = document.querySelector("[data-i18n='heroTitle']");
    const lead = document.querySelector("[data-i18n='heroLead']");
    if (title) title.textContent = status === "saved" ? messages.savedTitle : messages.errorTitle;
    if (lead) lead.textContent = status === "saved" ? messages.savedLead : messages.errorLead;
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

  function boot() {
    let stored = null;
    try { stored = localStorage.getItem("gy-lang"); } catch (_) {}
    applyLang(stored || document.body.dataset.lang || "ja");
    applyContactTopicFromUrl();
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
