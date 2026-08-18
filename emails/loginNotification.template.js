module.exports = function loginNotificationTemplate({
  firstName,
  loginTime,
  ipAddress,
  location,
  browser,
  device,
  os,
  logoUrl,
  lang = 'en'
}) {
  // Format date/time based on language
  const formattedDate = new Date(loginTime).toLocaleString(
    lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }
  );

  // Email text based on language
  const emailTexts = {
    en: {
      title: 'New Login to Your Account',
      greeting: `Hello ${firstName},`,
      mainMessage: 'We detected a new login to your Mushrif account. If this was you, you can safely ignore this email.',
      securityWarning: 'If you did not log in, please secure your account immediately.',
      loginDetails: 'Login Details:',
      time: 'Time',
      location: 'Location',
      ipAddress: 'IP Address',
      device: 'Device',
      browser: 'Browser',
      operatingSystem: 'Operating System',
      secureAccount: 'Secure My Account',
      needHelp: 'Need help? Contact our support team.',
      contactSupport: 'Contact Support',
      footerNote: 'This is an automated security notification. If you recognize this activity, no action is needed.',
      copyright: '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: 'تسجيل دخول جديد إلى حسابك',
      greeting: `مرحباً ${firstName}،`,
      mainMessage: 'اكتشفنا تسجيل دخول جديد إلى حساب مشرف الخاص بك. إذا كان هذا أنت، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      securityWarning: 'إذا لم تقم بتسجيل الدخول، يرجى تأمين حسابك فوراً.',
      loginDetails: 'تفاصيل تسجيل الدخول:',
      time: 'الوقت',
      location: 'الموقع',
      ipAddress: 'عنوان IP',
      device: 'الجهاز',
      browser: 'المتصفح',
      operatingSystem: 'نظام التشغيل',
      secureAccount: 'تأمين حسابي',
      needHelp: 'هل تحتاج إلى مساعدة؟ اتصل بفريق الدعم لدينا.',
      contactSupport: 'اتصل بالدعم',
      footerNote: 'هذا إشعار أمني تلقائي. إذا كنت تعرف هذا النشاط، فلا داعي لاتخاذ أي إجراء.',
      copyright: '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: 'Nouvelle connexion à votre compte',
      greeting: `Bonjour ${firstName},`,
      mainMessage: 'Nous avons détecté une nouvelle connexion à votre compte Mushrif. Si c\'était vous, vous pouvez ignorer cet e-mail en toute sécurité.',
      securityWarning: 'Si vous ne vous êtes pas connecté, veuillez sécuriser votre compte immédiatement.',
      loginDetails: 'Détails de connexion:',
      time: 'Heure',
      location: 'Emplacement',
      ipAddress: 'Adresse IP',
      device: 'Appareil',
      browser: 'Navigateur',
      operatingSystem: 'Système d\'exploitation',
      secureAccount: 'Sécuriser mon compte',
      needHelp: 'Besoin d\'aide? Contactez notre équipe d\'assistance.',
      contactSupport: 'Contacter le support',
      footerNote: 'Ceci est une notification de sécurité automatisée. Si vous reconnaissez cette activité, aucune action n\'est nécessaire.',
      copyright: '© {{year}} Mushrif. Tous droits réservés.'
    }
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === 'ar';

  // Format device info safely
  const deviceInfo = device?.type || 'Unknown';
  const browserInfo = browser?.name && browser?.version
    ? `${browser.name} ${browser.version}`
    : 'Unknown';
  const osInfo = os?.name && os?.version
    ? `${os.name} ${os.version}`
    : 'Unknown';
  const locationInfo = location?.city && location?.country
    ? `${location.city}, ${location.country}`
    : 'Unknown';

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${texts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Arial', 'Helvetica', sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 0;">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px;background:#f97316;">
              <img src="${logoUrl}" alt="Mushrif" width="120" style="display:block;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;color:#111827;text-align:${isRTL ? 'right' : 'left'};">

              <h1 style="margin:0 0 16px;font-size:24px;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.greeting}
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.mainMessage}
              </p>

              <!-- Security Warning -->
              <div style="margin:24px 0;padding:16px;background:#fef2f2;border-${isRTL ? 'right' : 'left'}:4px solid #ef4444;border-radius:6px;">
                <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ⚠️ ${texts.securityWarning}
                </p>
              </div>

              <!-- Login Details -->
              <div style="background:#f9fafb;padding:24px;border-radius:8px;margin:24px 0;">
                <h3 style="margin:0 0 16px;font-size:16px;color:#111827;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.loginDetails}
                </h3>

                <table width="100%" cellpadding="8" cellspacing="0" style="direction:${isRTL ? 'rtl' : 'ltr'};">
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;border-bottom:1px solid #e5e7eb;">${texts.time}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;border-bottom:1px solid #e5e7eb;">${texts.location}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${locationInfo}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;border-bottom:1px solid #e5e7eb;">${texts.ipAddress}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${ipAddress}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;border-bottom:1px solid #e5e7eb;">${texts.device}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${deviceInfo}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;border-bottom:1px solid #e5e7eb;">${texts.browser}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${browserInfo}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#6b7280;font-weight:600;padding:8px 0;">${texts.operatingSystem}:</td>
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};">${osInfo}</td>
                  </tr>
                </table>
              </div>

              <!-- Security Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/settings/security"
                   style="
                     background:#ef4444;
                     color:#ffffff;
                     text-decoration:none;
                     padding:14px 28px;
                     border-radius:6px;
                     font-weight:bold;
                     display:inline-block;
                   ">
                  ${texts.secureAccount}
                </a>
              </div>

              <!-- Support Section -->
              <div style="margin-top:32px;padding:16px;background:#ecfdf5;border-${isRTL ? 'right' : 'left'}:4px solid #10b981;border-radius:6px;">
                <p style="margin:0 0 8px;font-size:14px;color:#065f46;font-weight:600;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.needHelp}
                </p>
                <p style="margin:0;font-size:13px;direction:${isRTL ? 'rtl' : 'ltr'};">
                  <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@mushrif.com'}" style="color:#10b981;text-decoration:none;font-weight:600;">
                    ${texts.contactSupport}
                  </a>
                </p>
              </div>

              <!-- Footer Note -->
              <p style="margin-top:24px;font-size:12px;color:#9ca3af;line-height:1.5;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.footerNote}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;background:#f9fafb;font-size:12px;color:#9ca3af;direction:${isRTL ? 'rtl' : 'ltr'};">
              ${texts.copyright.replace('{{year}}', new Date().getFullYear())}
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};
