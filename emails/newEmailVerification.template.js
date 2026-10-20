module.exports = function newEmailVerificationTemplate({
  firstName,
  verificationLink,
  logoUrl,
  lang = 'en'
}) {
  // Email text based on language
  const emailTexts = {
    en: {
      title: 'Verify Your New Email Address',
      greeting: `Hello ${firstName || 'there'},`,
      mainMessage: 'You recently changed the email address for your Mushrif account to this address. Please click the button below to verify this new email and ensure full account access.',
      buttonText: 'Verify New Email',
      fallbackText: "If the button above doesn't work, copy and paste this link into your browser:",
      warningText: '⚠️ This verification link will expire in 24 hours. If you did not request this email change, please ignore this message.',
      needHelp: 'Need help? Contact our support team.',
      contactSupport: 'Contact Support',
      copyright: '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: 'تأكيد عنوان بريدك الإلكتروني الجديد',
      greeting: `مرحباً ${firstName || ''}،`,
      mainMessage: 'لقد قمت مؤخراً بتغيير عنوان البريد الإلكتروني لحسابك في مشرف إلى هذا العنوان. يرجى النقر على الزر أدناه لتأكيد هذا البريد الإلكتروني الجديد وضمان الوصول الكامل إلى حسابك.',
      buttonText: 'تأكيد البريد الإلكتروني الجديد',
      fallbackText: 'إذا لم يعمل الزر أعلاه، انسخ والصق هذا الرابط في متصفحك:',
      warningText: '⚠️ سينتهي صلاحية رابط التأكيد هذا خلال 24 ساعة. إذا لم تطلب تغيير هذا البريد الإلكتروني، يمكنك تجاهل هذه الرسالة بأمان.',
      needHelp: 'هل تحتاج إلى مساعدة؟ تواصل مع فريق الدعم لدينا.',
      contactSupport: 'الاتصال بالدعم',
      copyright: '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: 'Vérifiez votre nouvelle adresse e-mail',
      greeting: `Bonjour ${firstName || ''},`,
      mainMessage: 'Vous avez récemment modifié l\'adresse e-mail de votre compte Mushrif pour cette adresse. Veuillez cliquer sur le bouton ci-dessous pour vérifier cette nouvelle adresse e-mail et garantir l\'accès complet à votre compte.',
      buttonText: 'Vérifier la nouvelle adresse e-mail',
      fallbackText: 'Si le bouton ci-dessus ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
      warningText: '⚠️ Ce lien de vérification expirera dans 24 heures. Si vous n\'avez pas demandé ce changement, vous pouvez ignorer ce message.',
      needHelp: 'Besoin d\'aide ? Contactez notre équipe d\'assistance.',
      contactSupport: 'Contacter le support',
      copyright: '© {{year}} Mushrif. Tous droits réservés.'
    }
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === 'ar';
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
                ${texts.title}
              </h1>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.mainMessage}
              </p>

              <!-- Verification Action Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${verificationLink}"
                   style="
                     background:#ef4444;
                     color:#ffffff;
                     text-decoration:none;
                     padding:14px 28px;
                     border-radius:6px;
                     font-weight:bold;
                     display:inline-block;
                   ">
                  ${texts.buttonText}
                </a>
              </div>

              <!-- Fallback Link -->
              <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 8px;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.fallbackText}
              </p>

              <p style="font-size:13px;word-break:break-all;color:#f97316;margin:0 0 24px;direction:ltr;text-align:${isRTL ? 'right' : 'left'};">
                ${verificationLink}
              </p>

              <!-- Warning Box -->
              <div style="margin-top:32px;padding:16px;background:#fef3c7;border-${isRTL ? 'right' : 'left'}:4px solid #eab308;border-radius:6px;">
                <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.warningText}
                </p>
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
