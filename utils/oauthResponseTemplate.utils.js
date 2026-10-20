/**
 * ============================================================================
 * OAuth HTML Response Template (Mushrif Backend)
 * ============================================================================
 * Renders a rich, developer-friendly and user-friendly HTML success page
 * when OAuth authentication (Google, Facebook, GitHub) completes.
 *
 * Features:
 * - One-click copy for Access Token with visual feedback
 * - Comprehensive user profile and session metadata
 * - Device & Geolocation security details
 * - HttpOnly Refresh Token confirmation badge
 * - Collapsible JSON response preview for API testing (Postman / curl)
 * - Multi-language support (English, Arabic RTL, French)
 */

const PROVIDER_CONFIG = {
  google: {
    name: 'Google',
    color: '#4285F4',
    bgColor: 'rgba(66, 133, 244, 0.1)',
    borderColor: '#4285F4',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>`
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    bgColor: 'rgba(24, 119, 242, 0.1)',
    borderColor: '#1877F2',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
  },
  github: {
    name: 'GitHub',
    color: '#24292e',
    bgColor: 'rgba(36, 41, 46, 0.1)',
    borderColor: '#24292e',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#24292e"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`
  }
};

const I18N_TEXTS = {
  en: {
    title: 'Authentication Successful',
    subtitle: 'You have logged in successfully via',
    userInfo: 'User Profile',
    name: 'Full Name',
    email: 'Email Address',
    username: 'Username',
    role: 'Account Role',
    userId: 'User ID',
    sessionInfo: 'Session & Security',
    sessionId: 'Session ID',
    cookieStatus: 'Refresh Token: Secured in HttpOnly Cookie',
    accessTokenTitle: 'JWT Access Token (Bearer)',
    accessTokenDesc: 'Valid for 15 minutes. Use this token in the Authorization: Bearer <token> header for API requests.',
    copyToken: 'Copy Access Token',
    copied: 'Copied to Clipboard!',
    deviceInfo: 'Device & Location Details',
    ip: 'IP Address',
    location: 'Location',
    browser: 'Browser',
    os: 'Operating System',
    time: 'Login Timestamp',
    jsonPreview: 'API JSON Response (Raw)',
    copyJson: 'Copy JSON Response',
    footer: 'Mushrif Platform API • Server-Side Redis Session Active'
  },
  ar: {
    title: 'تم تسجيل الدخول بنجاح',
    subtitle: 'تم تسجيل الدخول بنجاح عبر',
    userInfo: 'الملف الشخصي',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    username: 'اسم المستخدم',
    role: 'نوع الحساب',
    userId: 'معرف المستخدم',
    sessionInfo: 'الجلسة والأمان',
    sessionId: 'معرف الجلسة',
    cookieStatus: 'رمز التحديث: محفوظ بأمان في ملف تعريف ارتباط HttpOnly',
    accessTokenTitle: 'رمز الوصول JWT (Bearer)',
    accessTokenDesc: 'صالح لمدة 15 دقيقة. استخدم هذا الرمز في ترويسة Authorization: Bearer <token> لطلبات واجهة البرمجة.',
    copyToken: 'نسخ رمز الوصول',
    copied: 'تم النسخ بنجاح!',
    deviceInfo: 'تفاصيل الجهاز والموقع',
    ip: 'عنوان IP',
    location: 'الموقع الجغرافي',
    browser: 'المتصفح',
    os: 'نظام التشغيل',
    time: 'وقت تسجيل الدخول',
    jsonPreview: 'استجابة JSON المباشرة (للمطورين)',
    copyJson: 'نسخ استجابة JSON',
    footer: 'منصة مشرف • جلسة خادم Redis نشطة'
  },
  fr: {
    title: 'Authentification Réussie',
    subtitle: 'Vous vous êtes connecté avec succès via',
    userInfo: 'Profil Utilisateur',
    name: 'Nom Complet',
    email: 'Adresse E-mail',
    username: "Nom d'utilisateur",
    role: 'Rôle du Compte',
    userId: 'Identifiant',
    sessionInfo: 'Session & Sécurité',
    sessionId: 'ID de Session',
    cookieStatus: 'Token de rafraîchissement : Sécurisé dans un cookie HttpOnly',
    accessTokenTitle: "Jeton d'Accès JWT (Bearer)",
    accessTokenDesc: "Valide pendant 15 minutes. Utilisez ce jeton dans l'en-tête Authorization: Bearer <token>.",
    copyToken: "Copier le Jeton d'Accès",
    copied: 'Copié dans le presse-papier !',
    deviceInfo: "Détails de l'Appareil et Emplacement",
    ip: 'Adresse IP',
    location: 'Emplacement',
    browser: 'Navigateur',
    os: "Système d'Exploitation",
    time: 'Heure de Connexion',
    jsonPreview: 'Réponse JSON Brute (Développeur)',
    copyJson: 'Copier la Réponse JSON',
    footer: 'Plateforme Mushrif • Session Redis Serveur Active'
  }
};

/**
 * Generates an HTML response page for successful OAuth login
 * @param {Object} options
 * @param {Object} options.user - User document from MongoDB
 * @param {string} options.accessToken - Generated 15m Access Token
 * @param {string} options.sessionId - Redis session identifier
 * @param {string} [options.provider='google'] - 'google' | 'facebook' | 'github'
 * @param {Object} [options.loginEntry] - Login history entry (ip, location, browser, os)
 * @param {string} [options.lang='en'] - 'en' | 'ar' | 'fr'
 * @returns {string} Fully rendered HTML document
 */
function renderOAuthSuccessPage(options) {
  const {
    user,
    accessToken,
    sessionId,
    provider = 'google',
    loginEntry = {},
    lang = 'en'
  } = options;

  const texts = I18N_TEXTS[lang] || I18N_TEXTS.en;
  const prov = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.google;
  const isRtl = lang === 'ar';

  const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
  const userPhoto = user.profilePhoto?.url || '';
  const initial = (user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase();

  const ipAddress = loginEntry.ipAddress || '127.0.0.1';
  const locationStr = loginEntry.location
    ? `${loginEntry.location.city || ''}, ${loginEntry.location.region || ''}, ${loginEntry.location.country || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Local / Unknown'
    : 'Local / Unknown';
  const browserStr = loginEntry.browser ? `${loginEntry.browser.name || ''} ${loginEntry.browser.version || ''}`.trim() : 'Web Browser';
  const osStr = loginEntry.os ? `${loginEntry.os.name || ''} ${loginEntry.os.version || ''}`.trim() : 'Operating System';
  const timeStr = loginEntry.loginTime ? new Date(loginEntry.loginTime).toLocaleString(lang === 'ar' ? 'ar-DZ' : (lang === 'fr' ? 'fr-FR' : 'en-US')) : new Date().toLocaleString();

  const jsonPayload = JSON.stringify({
    success: true,
    message: `${prov.name} authentication successful`,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePhoto: user.profilePhoto.url,
        isActive: user.isActive,
        primaryProvider: user.primaryProvider,
        authMethods: user.authMethods
      },
      accessToken,
      token: accessToken,
      sessionId
    }
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${texts.title} — Mushrif</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4F46E5;
      --primary-hover: #4338CA;
      --primary-light: #EEF2FF;
      --success: #10B981;
      --success-light: #ECFDF5;
      --bg: #0F172A;
      --card-bg: rgba(30, 41, 59, 0.85);
      --card-border: rgba(255, 255, 255, 0.1);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      --code-bg: #0B1120;
      --accent-glow: rgba(79, 70, 229, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: ${isRtl ? "'Tajawal', 'Plus Jakarta Sans'" : "'Plus Jakarta Sans'"}, -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top right, #1e1b4b, #0f172a 60%, #020617);
      color: var(--text);
      min-height: 100vh;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 1.5;
    }

    .container {
      width: 100%;
      max-width: 820px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 36px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px var(--accent-glow);
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 32px;
      position: relative;
    }

    .provider-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 6px 18px 6px 12px;
      font-size: 14px;
      font-weight: 600;
      color: #FFF;
      margin-bottom: 16px;
    }

    .provider-badge svg {
      width: 20px;
      height: 20px;
    }

    .title {
      font-size: 28px;
      font-weight: 800;
      color: #FFF;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 15px;
      color: var(--text-muted);
    }

    /* Sections */
    .section-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #E2E8F0;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* User Profile Bar */
    .user-profile-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .avatar {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4F46E5, #06B6D4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: #FFF;
      flex-shrink: 0;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-meta h3 {
      font-size: 18px;
      font-weight: 700;
      color: #FFF;
    }

    .user-meta p {
      font-size: 14px;
      color: var(--text-muted);
    }

    .role-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(79, 70, 229, 0.3);
      color: #A5B4FC;
      border: 1px solid rgba(79, 70, 229, 0.5);
      margin-top: 4px;
    }

    /* Grid Details */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .detail-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 10px 14px;
      border-radius: 10px;
    }

    .detail-label {
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 2px;
    }

    .detail-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #CBD5E1;
      word-break: break-all;
    }

    /* Token Block */
    .token-box {
      background: var(--code-bg);
      border: 1px solid rgba(79, 70, 229, 0.3);
      border-radius: 12px;
      padding: 14px;
      margin: 12px 0;
      position: relative;
    }

    .token-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      color: #38BDF8;
      word-break: break-all;
      max-height: 100px;
      overflow-y: auto;
      line-height: 1.6;
      padding-right: 8px;
    }

    .btn-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--primary);
      color: #FFF;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #E2E8F0;
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: none;
    }

    .cookie-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--success-light);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 10px 14px;
      border-radius: 10px;
      color: #065F46;
      font-size: 13px;
      font-weight: 600;
      margin-top: 12px;
    }

    /* JSON Accordion */
    details {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px 18px;
      margin-top: 18px;
      cursor: pointer;
    }

    summary {
      font-size: 14px;
      font-weight: 600;
      color: #94A3B8;
      user-select: none;
      outline: none;
    }

    summary:hover {
      color: #E2E8F0;
    }

    .json-code {
      margin-top: 14px;
      background: var(--code-bg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #A5B4FC;
      overflow-x: auto;
      max-height: 220px;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10B981;
      color: #FFF;
      padding: 12px 22px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      pointer-events: none;
      z-index: 9999;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .footer-text {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: var(--text-dim);
    }

    @media (max-width: 640px) {
      .container { padding: 22px 18px; border-radius: 18px; }
      .title { font-size: 22px; }
      .details-grid { grid-template-columns: 1fr; }
      .btn-row { flex-direction: column; }
      .btn { width: 100%; }
    }
  </style>
</head>
<body>

  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="provider-badge">
        ${prov.icon}
        <span>${prov.name}</span>
      </div>
      <h1 class="title">${texts.title}</h1>
      <p class="subtitle">${texts.subtitle} <strong>${prov.name}</strong></p>
    </div>

    <!-- User Profile Section -->
    <div class="section-card">
      <div class="section-title">
        <span>👤</span>
        <span>${texts.userInfo}</span>
      </div>
      <div class="user-profile-bar">
        <div class="avatar">
          ${userPhoto ? `<img src="${userPhoto}" alt="${userFullName}">` : `<span>${initial}</span>`}
        </div>
        <div class="user-meta">
          <h3>${userFullName}</h3>
          <p>${user.email}</p>
          <span class="role-badge">${user.role || 'user'}</span>
        </div>
      </div>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${texts.username}</div>
          <div class="detail-value">${user.username || '—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${texts.userId}</div>
          <div class="detail-value">${user._id}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${texts.sessionId}</div>
          <div class="detail-value" style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${sessionId}</div>
        </div>
      </div>
    </div>

    <!-- JWT Access Token Section -->
    <div class="section-card">
      <div class="section-title">
        <span>🔑</span>
        <span>${texts.accessTokenTitle}</span>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">${texts.accessTokenDesc}</p>
      
      <div class="token-box">
        <div class="token-text" id="accessTokenText">${accessToken}</div>
      </div>

      <div class="btn-row">
        <button class="btn" onclick="copyToken()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span id="copyTokenBtnText">${texts.copyToken}</span>
        </button>
      </div>

      <div class="cookie-badge">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span>${texts.cookieStatus}</span>
      </div>
    </div>

    <!-- Device & Geolocation Details -->
    <div class="section-card">
      <div class="section-title">
        <span>📍</span>
        <span>${texts.deviceInfo}</span>
      </div>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${texts.ip}</div>
          <div class="detail-value">${ipAddress}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${texts.location}</div>
          <div class="detail-value">${locationStr}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${texts.browser}</div>
          <div class="detail-value">${browserStr}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${texts.os}</div>
          <div class="detail-value">${osStr}</div>
        </div>
      </div>
    </div>

    <!-- Collapsible Developer JSON View -->
    <details>
      <summary>⚙️ ${texts.jsonPreview}</summary>
      <pre class="json-code" id="rawJsonText">${jsonPayload}</pre>
      <div class="btn-row" style="margin-top: 10px;">
        <button class="btn btn-outline" onclick="copyJson()">
          <span>${texts.copyJson}</span>
        </button>
      </div>
    </details>

    <div class="footer-text">
      ${texts.footer}
    </div>
  </div>

  <div class="toast" id="toastNotification">${texts.copied}</div>

  <script>
    function showToast(msg) {
      const toast = document.getElementById('toastNotification');
      if (msg) toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => { toast.classList.remove('show'); }, 2500);
    }

    function copyToken() {
      const token = document.getElementById('accessTokenText').innerText.trim();
      navigator.clipboard.writeText(token).then(() => {
        showToast('${texts.copied}');
        const btnText = document.getElementById('copyTokenBtnText');
        if (btnText) {
          const original = btnText.innerText;
          btnText.innerText = '✓ ${texts.copied}';
          setTimeout(() => { btnText.innerText = original; }, 2000);
        }
      });
    }

    function copyJson() {
      const json = document.getElementById('rawJsonText').innerText.trim();
      navigator.clipboard.writeText(json).then(() => {
        showToast('${texts.copied}');
      });
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderOAuthSuccessPage
};
