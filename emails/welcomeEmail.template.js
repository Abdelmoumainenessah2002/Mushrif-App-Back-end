module.exports = function welcomeEmailTemplate({
  firstName,
  logoUrl,
  lang = 'en'
}) {
  // Email text based on language
  const emailTexts = {
    en: {
      title: `Welcome to Mushrif, ${firstName}!`,
      greeting: `Hello ${firstName},`,
      welcomeMessage: 'Welcome to Mushrif! We\'re excited to have you join our community.',
      description: 'Your account has been successfully created. You can now explore all the features and start your journey with us.',
      getStarted: 'Here are some things you can do:',
      features: [
        'Complete your profile to personalize your experience',
        'Explore our features and discover what Mushrif can do',
        'Connect with other users in the community',
        'Reach out to our support team if you need any help'
      ],
      buttonText: 'Get Started',
      needHelp: 'Need help? Our support team is here for you.',
      contactSupport: 'Contact Support',
      copyright: '© {{year}} Mushrif. All rights reserved.'
    },
    ar: {
      title: `أهلاً وسهلاً بك في مشرف، ${firstName}!`,
      greeting: `مرحباً ${firstName}،`,
      welcomeMessage: 'مرحباً بك في مشرف! يسعدنا انضمامك إلى مجتمعنا.',
      description: 'تم إنشاء حسابك بنجاح. يمكنك الآن استكشاف جميع الميزات وبدء رحلتك معنا.',
      getStarted: 'إليك بعض الأشياء التي يمكنك القيام بها:',
      features: [
        'أكمل ملفك الشخصي لتخصيص تجربتك',
        'استكشف ميزاتنا واكتشف ما يمكن أن يفعله مشرف',
        'تواصل مع المستخدمين الآخرين في المجتمع',
        'تواصل مع فريق الدعم إذا كنت بحاجة إلى أي مساعدة'
      ],
      buttonText: 'ابدأ الآن',
      needHelp: 'هل تحتاج إلى مساعدة؟ فريق الدعم لدينا هنا من أجلك.',
      contactSupport: 'اتصل بالدعم',
      copyright: '© {{year}} مشرف. جميع الحقوق محفوظة.'
    },
    fr: {
      title: `Bienvenue sur Mushrif, ${firstName}!`,
      greeting: `Bonjour ${firstName},`,
      welcomeMessage: 'Bienvenue sur Mushrif! Nous sommes ravis de vous accueillir dans notre communauté.',
      description: 'Votre compte a été créé avec succès. Vous pouvez maintenant explorer toutes les fonctionnalités et commencer votre aventure avec nous.',
      getStarted: 'Voici quelques choses que vous pouvez faire:',
      features: [
        'Complétez votre profil pour personnaliser votre expérience',
        'Explorez nos fonctionnalités et découvrez ce que Mushrif peut faire',
        'Connectez-vous avec d\'autres utilisateurs de la communauté',
        'Contactez notre équipe d\'assistance si vous avez besoin d\'aide'
      ],
      buttonText: 'Commencer',
      needHelp: 'Besoin d\'aide? Notre équipe d\'assistance est là pour vous.',
      contactSupport: 'Contacter le support',
      copyright: '© {{year}} Mushrif. Tous droits réservés.'
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
                ${texts.greeting}
              </h1>

              <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#f97316;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.welcomeMessage}
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                ${texts.description}
              </p>

              <!-- Features List -->
              <div style="background:#f9fafb;padding:24px;border-radius:8px;margin:24px 0;">
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.getStarted}
                </p>
                <ul style="margin:0;padding-${isRTL ? 'right' : 'left'}:20px;color:#374151;direction:${isRTL ? 'rtl' : 'ltr'};">
                  ${texts.features.map(feature => `<li style="margin-bottom:8px;font-size:14px;line-height:1.6;">${feature}</li>`).join('')}
                </ul>
              </div>

              <!-- Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}"
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
