module.exports = function organizationCreatedEmailTemplate({
  firstName,
  organizationName,
  logoUrl,
  organizationUrl,
  lang = "en",
}) {
  const emailTexts = {
    en: {
      title: `Your organization is ready, ${firstName}!`,
      greeting: `Hello ${firstName},`,
      successMessage: `Your organization "${organizationName}" has been created successfully.`,
      description:
        "Your organization is now ready. You can start managing your workspace, projects, and members.",
      getStarted: "What you can do next:",
      features: [
        "Set up your organization settings",
        "Create your first project",
        "Invite members to your organization",
        "Start managing your work with Mushrif",
      ],
      buttonText: "Open Organization",
      needHelp: "Need help? Our support team is here for you.",
      contactSupport: "Contact Support",
      copyright: "© {{year}} Mushrif. All rights reserved.",
    },

    ar: {
      title: `مؤسستك جاهزة، ${firstName}!`,
      greeting: `مرحباً ${firstName}،`,
      successMessage: `تم إنشاء مؤسستك "${organizationName}" بنجاح.`,
      description:
        "مؤسستك جاهزة الآن. يمكنك البدء في إدارة مساحة العمل والمشاريع والأعضاء.",
      getStarted: "إليك ما يمكنك القيام به الآن:",
      features: [
        "إعداد إعدادات المؤسسة",
        "إنشاء مشروعك الأول",
        "دعوة أعضاء إلى مؤسستك",
        "ابدأ في إدارة عملك باستخدام مشرف",
      ],
      buttonText: "فتح المؤسسة",
      needHelp: "هل تحتاج إلى مساعدة؟ فريق الدعم لدينا هنا من أجلك.",
      contactSupport: "اتصل بالدعم",
      copyright: "© {{year}} مشرف. جميع الحقوق محفوظة.",
    },

    fr: {
      title: `Votre organisation est prête, ${firstName} !`,
      greeting: `Bonjour ${firstName},`,
      successMessage: `Votre organisation "${organizationName}" a été créée avec succès.`,
      description:
        "Votre organisation est maintenant prête. Vous pouvez commencer à gérer votre espace de travail, vos projets et vos membres.",
      getStarted: "Voici ce que vous pouvez faire maintenant :",
      features: [
        "Configurer les paramètres de votre organisation",
        "Créer votre premier projet",
        "Inviter des membres dans votre organisation",
        "Commencer à gérer votre travail avec Mushrif",
      ],
      buttonText: "Ouvrir l'organisation",
      needHelp: "Besoin d'aide ? Notre équipe d'assistance est là pour vous.",
      contactSupport: "Contacter le support",
      copyright: "© {{year}} Mushrif. Tous droits réservés.",
    },
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === "ar";

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRTL ? "rtl" : "ltr"}">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${texts.title}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:#f9fafb;
    font-family:'Arial', 'Helvetica', sans-serif;
  "
>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 0;">

        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="
            background:#ffffff;
            border-radius:8px;
            overflow:hidden;
            box-shadow:0 10px 25px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                padding:30px;
                background:#f97316;
              "
            >
              <img
                src="${logoUrl}"
                alt="Mushrif"
                width="120"
                style="display:block;"
              />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td
              style="
                padding:40px;
                color:#111827;
                text-align:${isRTL ? "right" : "left"};
              "
            >

              <!-- Greeting -->
              <h1
                style="
                  margin:0 0 16px;
                  font-size:24px;
                  direction:${isRTL ? "rtl" : "ltr"};
                "
              >
                ${texts.greeting}
              </h1>

              <!-- Success Message -->
              <p
                style="
                  margin:0 0 16px;
                  font-size:16px;
                  font-weight:600;
                  color:#f97316;
                  direction:${isRTL ? "rtl" : "ltr"};
                "
              >
                ${texts.successMessage}
              </p>

              <!-- Description -->
              <p
                style="
                  margin:0 0 24px;
                  font-size:15px;
                  line-height:1.6;
                  color:#374151;
                  direction:${isRTL ? "rtl" : "ltr"};
                "
              >
                ${texts.description}
              </p>

              <!-- Organization Card -->
              <div
                style="
                  background:#fff7ed;
                  padding:20px;
                  border-radius:8px;
                  margin:24px 0;
                  border:1px solid #fed7aa;
                  text-align:${isRTL ? "right" : "left"};
                "
              >

                <p
                  style="
                    margin:0 0 8px;
                    font-size:13px;
                    color:#9a3412;
                    font-weight:600;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >
                  ${isRTL ? "المؤسسة" : lang === "fr" ? "Organisation" : "Organization"}
                </p>

                <p
                  style="
                    margin:0;
                    font-size:20px;
                    font-weight:700;
                    color:#111827;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >
                  ${organizationName}
                </p>

              </div>

              <!-- Features List -->
              <div
                style="
                  background:#f9fafb;
                  padding:24px;
                  border-radius:8px;
                  margin:24px 0;
                "
              >

                <p
                  style="
                    margin:0 0 16px;
                    font-size:15px;
                    font-weight:600;
                    color:#111827;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >
                  ${texts.getStarted}
                </p>

                <ul
                  style="
                    margin:0;
                    padding-${isRTL ? "right" : "left"}:20px;
                    color:#374151;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >

                  ${texts.features
                    .map(
                      (feature) => `
                        <li
                          style="
                            margin-bottom:8px;
                            font-size:14px;
                            line-height:1.6;
                          "
                        >
                          ${feature}
                        </li>
                      `,
                    )
                    .join("")}

                </ul>

              </div>

              <!-- Button -->
              <div
                style="
                  text-align:center;
                  margin:32px 0;
                "
              >

                <a
                  href="${organizationUrl}"
                  style="
                    background:#ef4444;
                    color:#ffffff;
                    text-decoration:none;
                    padding:14px 28px;
                    border-radius:6px;
                    font-weight:bold;
                    display:inline-block;
                  "
                >
                  ${texts.buttonText}
                </a>

              </div>

              <!-- Support Section -->
              <div
                style="
                  margin-top:32px;
                  padding:16px;
                  background:#ecfdf5;
                  border-${isRTL ? "right" : "left"}:4px solid #10b981;
                  border-radius:6px;
                "
              >

                <p
                  style="
                    margin:0 0 8px;
                    font-size:14px;
                    color:#065f46;
                    font-weight:600;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >
                  ${texts.needHelp}
                </p>

                <p
                  style="
                    margin:0;
                    font-size:13px;
                    direction:${isRTL ? "rtl" : "ltr"};
                  "
                >
                  <a
                    href="mailto:${process.env.SUPPORT_EMAIL || "support@mushrif.com"}"
                    style="
                      color:#10b981;
                      text-decoration:none;
                      font-weight:600;
                    "
                  >
                    ${texts.contactSupport}
                  </a>
                </p>

              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                padding:20px;
                background:#f9fafb;
                font-size:12px;
                color:#9ca3af;
                direction:${isRTL ? "rtl" : "ltr"};
              "
            >
              ${texts.copyright.replace("{{year}}", new Date().getFullYear())}
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
