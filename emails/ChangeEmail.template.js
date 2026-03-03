module.exports = function changeEmailOtpEmail({
  otp,
  logoUrl,
  lang = 'en',
  expiresInMinutes = 15
}) {
  const emailTexts = {
    en: {
      title: 'Confirm your email change',
      description:
        'We received a request to change the email address associated with your account. Use the verification code below to confirm this change.',
      otpLabel: 'Your verification code',
      warningText:
        "⚠️ This code will expire in {{minutes}} minutes. If you didn't request an email change, please secure your account immediately.",
      ignoreText:
        'For your security, do not share this code with anyone.',
      copyright:
        '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: 'تأكيد تغيير البريد الإلكتروني',
      description:
        'تلقينا طلبًا لتغيير البريد الإلكتروني المرتبط بحسابك. استخدم رمز التحقق أدناه لتأكيد هذا التغيير.',
      otpLabel: 'رمز التحقق الخاص بك',
      warningText:
        '⚠️ سينتهي صلاحية هذا الرمز خلال {{minutes}} دقيقة. إذا لم تطلب تغيير البريد الإلكتروني، يرجى تأمين حسابك فورًا.',
      ignoreText:
        'من أجل أمانك، لا تشارك هذا الرمز مع أي شخص.',
      copyright:
        '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: 'Confirmer le changement d’e-mail',
      description:
        'Nous avons reçu une demande de modification de l’adresse e-mail associée à votre compte. Utilisez le code de vérification ci-dessous pour confirmer ce changement.',
      otpLabel: 'Votre code de vérification',
      warningText:
        "⚠️ Ce code expirera dans {{minutes}} minutes. Si vous n'avez pas demandé ce changement, veuillez sécuriser votre compte immédiatement.",
      ignoreText:
        'Pour votre sécurité, ne partagez ce code avec personne.',
      copyright:
        '© {{year}} Mushrif. Tous les droits réservés.'
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
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Arial','Helvetica',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:40px 0;">

      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);">

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

            <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
              ${texts.description}
            </p>

            <!-- OTP Block -->
            <div style="
              text-align:center;
              margin:32px 0;
              padding:24px;
              background:#fef2f2;
              border-radius:8px;
              border:1px dashed #ef4444;
            ">
              <p style="margin:0 0 12px;font-size:14px;color:#991b1b;">
                ${texts.otpLabel}
              </p>

              <div style="
                font-size:36px;
                letter-spacing:8px;
                font-weight:bold;
                color:#ef4444;
                direction:ltr;
              ">
                ${otp}
              </div>
            </div>

            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;direction:${isRTL ? 'rtl' : 'ltr'};">
              ${texts.ignoreText}
            </p>

            <!-- Warning -->
            <div style="
              margin-top:32px;
              padding:16px;
              background:#fef3c7;
              border-${isRTL ? 'right' : 'left'}:4px solid #eab308;
            ">
              <p style="margin:0;font-size:13px;color:#92400e;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.warningText.replace('{{minutes}}', expiresInMinutes)}
              </p>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center"
            style="padding:20px;background:#f9fafb;font-size:12px;color:#9ca3af;direction:${isRTL ? 'rtl' : 'ltr'};">
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