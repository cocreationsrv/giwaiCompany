(() => {
  const page = document.body.dataset.page || "";
  const activePage = page === "education" ? "education" : page;
  const contactHref = page === "home" || page === "about" ? "#contact" : "about.html#contact";
  const navItems = [
    ["home", "homepage.html", "navHome", "トップページ"],
    ["business", "business.html", "navBusiness", "中日ビジネス"],
    ["culture", "culture.html", "navCulture", "中日文化交流"],
    ["education", "japanese.html", "navEducation", "日本語教育・講師募集"],
    ["cases", "cases.html", "navCases", "事例紹介"],
    ["about", "about.html", "navAbout", "会社概要・お問い合わせ"]
  ];

  const headerTarget = document.querySelector("[data-site-header]");
  if (headerTarget) {
    const links = navItems.map(([id, href, key, label]) =>
      `<a${id === activePage ? ' class="active"' : ""} href="${href}" data-i18n="${key}">${label}</a>`
    ).join("");
    headerTarget.innerHTML = `
      <div class="topbar"><div class="container topbar-inner">
        <span data-i18n="topAddress">東京都港区三田3-9-11 ランドル高輪ゲートウェイ5F</span><span>TEL 03-6823-3858</span>
      </div></div>
      <header class="nav"><div class="container nav-inner">
        <a class="nav-logo" href="homepage.html" aria-label="GY COMPANY"><img src="assets/gy_company_logo.png" alt="GY COMPANY"></a>
        <nav class="nav-menu" aria-label="Primary">${links}</nav>
        <div class="nav-actions">
          <div class="lang-switch" aria-label="Language"><button data-lang="ja">JA</button><button data-lang="zh">中文</button><button data-lang="en">EN</button></div>
          <a class="btn btn-primary nav-cta" href="${contactHref}" data-i18n="navCta">ご相談はこちら</a>
          <button class="mobile-toggle" aria-label="Menu" aria-expanded="false">☰</button>
        </div>
      </div></header>`;
  }

  const footerTarget = document.querySelector("[data-site-footer]");
  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="footer"><div class="container">
        <div class="footer-grid">
          <div><h3>GY COMPANY</h3><p data-i18n="footerTag">日本に根ざし、中国を理解する。中日間のビジネス・文化・教育をつなぐ実行型パートナー。</p></div>
          <div><h4 data-i18n="footerBusiness">事業</h4><ul>
            <li><a href="business.html" data-i18n="navBusiness">中日ビジネス</a></li><li><a href="culture.html" data-i18n="navCulture">中日文化交流</a></li><li><a href="japanese.html" data-i18n="navEducation">日本語教育・講師募集</a></li>
          </ul></div>
          <div><h4 data-i18n="footerCompany">会社情報</h4><ul>
            <li><a href="cases.html" data-i18n="navCases">事例紹介</a></li><li><a href="about.html" data-i18n="navAbout">会社概要・お問い合わせ</a></li><li><a href="mailto:info@gycompany.co.jp">info@gycompany.co.jp</a></li>
          </ul></div>
        </div>
        <div class="footer-bottom"><span data-i18n="copyright">© 2026 株式会社ジーワイカンパニー All rights reserved.</span><span></span></div>
      </div></footer>`;
  }
})();
