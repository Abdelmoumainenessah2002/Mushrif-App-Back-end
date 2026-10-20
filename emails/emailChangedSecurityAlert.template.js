module.exports = function emailChangedSecurityAlertTemplate({
  firstName,
  oldEmail,
  newEmail,
  changeTime = new Date(),
  ipAddress,
  location,
  browser,
  device,
  os,
  logoUrl,
  lang = 'en'
}) {
  // Format date/time based on language
  const formattedDate = new Date(changeTime).toLocaleString(
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
      title: 'Security Alert: Email Address Changed',
      greeting: `Hello ${firstName || 'User'},`,
      mainMessage: `The email address for your Mushrif account was recently changed from <strong style="color:#111827;">${oldEmail}</strong> to <strong style="color:#111827;">${newEmail}</strong>.`,
      securityWarning: 'If you did NOT authorize this change, someone else may have gained access to your account. Please secure your account immediately or contact support.',
      changeDetails: 'Change Event Details:',
      time: 'Time',
      location: 'Location',
      ipAddress: 'IP Address',
      device: 'Device',
      browser: 'Browser',
      operatingSystem: 'Operating System',
      secureAccount: 'Secure My Account',
      needHelp: 'Need urgent help? Contact our security support team immediately.',
      contactSupport: 'Contact Support',
      footerNote: 'This is an automated security alert. If you made this change, no further action is required.',
      copyright: '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: 'تنبيه أمني: تم تغيير عنوان البريد الإلكتروني',
      greeting: `مرحباً ${firstName || 'مستخدم'}،`,
      mainMessage: `تم مؤخراً تغيير عنوان البريد الإلكتروني لحسابك في مشرف من <strong style="color:#111827;">${oldEmail}</strong> إلى <strong style="color:#111827;">${newEmail}</strong>.`,
      securityWarning: 'إذا لم تقم بإجراء هذا التغيير بنفسك، فقد يكون شخص آخر قد وصل إلى حسابك. يرجى تأمين حسابك فوراً أو الاتصال بفريق الدعم.',
      changeDetails: 'تفاصيل عملية التغيير:',
      time: 'الوقت',
      location: 'الموقع',
      ipAddress: 'عنوان IP',
      device: 'الجهاز',
      browser: 'المتصفح',
      operatingSystem: 'نظام التشغيل',
      secureAccount: 'تأمين حسابي فوراً',
      needHelp: 'هل تحتاج إلى مساعدة عاجلة؟ تواصل مع فريق أمان الدعم فوراً.',
      contactSupport: 'الاتصال بالدعم',
      footerNote: 'هذا إشعار أمني تلقائي. إذا كنت أنت من أجرى هذا التغيير، فلا داعي لاتخاذ أي إجراء إضافي.',
      copyright: '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: 'Alerte de sécurité : Adresse e-mail modifiée',
      greeting: `Bonjour ${firstName || 'Utilisateur'},`,
      mainMessage: `L'adresse e-mail associée à votre compte Mushrif a récemment été modifiée de <strong style="color:#111827;">${oldEmail}</strong> à <strong style="color:#111827;">${newEmail}</strong>.`,
      securityWarning: 'Si vous n\'êtes PAS à l\'origine de ce changement, une personne non autorisée a peut-être accédé à votre compte. Veuillez sécuriser votre compte immédiatement ou contacter le support.',
      changeDetails: 'Détails de l\'événement :',
      time: 'Heure',
      location: 'Emplacement',
      ipAddress: 'Adresse IP',
      device: 'Appareil',
      browser: 'Navigateur',
      operatingSystem: 'Système d\'exploitation',
      secureAccount: 'Sécuriser mon compte',
      needHelp: 'Besoin d\'aide urgente ? Contactez immédiatement notre équipe d\'assistance sécurité.',
      contactSupport: 'Contacter le support',
      footerNote: 'Ceci est une notification de sécurité automatisée. Si vous avez effectué ce changement, aucune action n\'est requise.',
      copyright: '© {{year}} Mushrif. Tous droits réservés.'
    }
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === 'ar';

  // Format device info safely
  const deviceInfo = device?.type || 'Unknown';
  const browserInfo = browser?.name && browser?.version
    ? `${browser.name} ${browser.version}`
    : browser?.name || 'Unknown';
  const osInfo = os?.name && os?.version
    ? `${os.name} ${os.version}`
    : os?.name || 'Unknown';
  const locationInfo = location?.city && location?.country && location.country !== 'Unknown'
    ? `${location.city}, ${location.country}`
    : location?.country && location.country !== 'Unknown'
      ? location.country
      : 'Unknown';

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const securityLink = `${clientUrl}/forgot-password`;
  const resolvedLogoUrl =
    logoUrl ||
    `${process.env.SERVER_URL || "http://localhost:8000"}/public/images/logo.png`;

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
              <img src="${resolvedLogoUrl}" alt="Mushrif" width="120" style="display:block;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;color:#111827;text-align:${isRTL ? 'right' : 'left'};">

              <h1 style="margin:0 0 16px;font-size:24px;direction:${isRTL ? 'rtl' : 'ltr'};color:#111827;">
                ${texts.greeting}
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.mainMessage}
              </p>

              <!-- Critical Security Warning Box -->
              <div style="margin:24px 0;padding:16px;background:#fef2f2;border-${isRTL ? 'right' : 'left'}:4px solid #ef4444;border-radius:6px;">
                <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;line-height:1.5;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ⚠️ ${texts.securityWarning}
                </p>
              </div>

              <!-- Change Details -->
              <div style="background:#f9fafb;padding:24px;border-radius:8px;margin:24px 0;">
                <h3 style="margin:0 0 16px;font-size:16px;color:#111827;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.changeDetails}
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
                    <td style="font-size:14px;color:#111827;padding:8px 0;text-align:${isRTL ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${ipAddress || 'Unknown'}</td>
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

              <!-- Security Action Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${securityLink}"
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
