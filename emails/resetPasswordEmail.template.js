const t = require('../utils/t');
const messages = require('../constants/messages');

module.exports = function resetPasswordEmail({
  resetLink,
  logoUrl,
  lang = 'en'
}) {
  // Email text based on language
  const emailTexts = {
    en: {
      title: 'Reset your password',
      description: 'We received a request to reset your password. Click the button below to choose a new one.',
      buttonText: 'Reset Password',
      fallbackText: "If the button doesn't work, copy and paste this link into your browser:",
      warningText: '⚠️ This link will expire in 15 minutes. If you didn\'t request a password reset, you can safely ignore this email.',
      copyright: '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: 'إعادة تعيين كلمة المرور',
      description: 'تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لاختيار واحدة جديدة.',
      buttonText: 'إعادة تعيين كلمة المرور',
      fallbackText: 'إذا لم يعمل الزر، انسخ والصق هذا الرابط في متصفحك:',
      warningText: '⚠️ سينتهي صلاحية هذا الرابط خلال 15 دقيقة. إذا لم تطلب إعادة تعيين كلمة المرور، فيمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      copyright: '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: 'Réinitialiser votre mot de passe',
      description: 'Nous avons reçu une demande pour réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
      buttonText: 'Réinitialiser le mot de passe',
      fallbackText: 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:',
      warningText: '⚠️ Ce lien expirera dans 15 minutes. Si vous n\'avez pas demandé la réinitialisation du mot de passe, vous pouvez ignorer cet e-mail en toute sécurité.',
      copyright: '© {{year}} Mushrif. Tous les droits réservés.'
    }
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === 'ar';
  
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
                ${texts.title}
              </h1>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.description}
              </p>

              <!-- Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}"
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

              <!-- Fallback -->
              <p style="font-size:13px;color:#6b7280;line-height:1.6;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.fallbackText}
              </p>

              <p style="font-size:13px;word-break:break-all;color:#f97316;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${resetLink}
              </p>

              <!-- Warning -->
              <div style="margin-top:32px;padding:16px;background:#fef3c7;border-${isRTL ? 'right' : 'left'}:4px solid #eab308;">
                <p style="margin:0;font-size:13px;color:#92400e;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.warningText}
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
