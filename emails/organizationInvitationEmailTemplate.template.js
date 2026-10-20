module.exports = function organizationInvitationEmailTemplate({
  firstName,
  organizationName,
  invitationUrl,
  logoUrl,
  role = "MEMBER",
  expiresAt,
  lang = "en",
}) {
  const emailTexts = {
    en: {
      title: `You're invited to join ${organizationName}`,
      greeting: `Hello ${firstName},`,
      welcomeMessage: `You've been invited to join ${organizationName} on Mushrif.`,
      description:
        "Someone from this organization has invited you to collaborate with its members. Review the invitation and choose whether to accept or reject it.",
      invitationDetails: "Invitation details",
      organization: "Organization",
      role: "Role",
      expires: "Expires",
      roles: {
        ADMIN: "Admin",
        MEMBER: "Member",
      },
      buttonText: "View Invitation",
      expirationNote:
        "This invitation will expire automatically. Please respond before the expiration date.",
      needHelp: "Need help?",
      contactSupport: "Contact Support",
      copyright: "© {{year}} Mushrif. All rights reserved.",
    },

    ar: {
      title: `تمت دعوتك للانضمام إلى ${organizationName}`,
      greeting: `مرحباً ${firstName}،`,
      welcomeMessage: `تمت دعوتك للانضمام إلى ${organizationName} على منصة مشرف.`,
      description:
        "قام أحد أعضاء المؤسسة بدعوتك للتعاون مع أعضائها. يمكنك مراجعة الدعوة واختيار قبولها أو رفضها.",
      invitationDetails: "تفاصيل الدعوة",
      organization: "المؤسسة",
      role: "الدور",
      expires: "تنتهي في",
      roles: {
        ADMIN: "مسؤول",
        MEMBER: "عضو",
      },
      buttonText: "عرض الدعوة",
      expirationNote:
        "ستنتهي صلاحية هذه الدعوة تلقائياً. يرجى الرد قبل تاريخ انتهاء الصلاحية.",
      needHelp: "هل تحتاج إلى مساعدة؟",
      contactSupport: "اتصل بالدعم",
      copyright: "© {{year}} مشرف. جميع الحقوق محفوظة.",
    },

    fr: {
      title: `Vous êtes invité à rejoindre ${organizationName}`,
      greeting: `Bonjour ${firstName},`,
      welcomeMessage: `Vous avez été invité à rejoindre ${organizationName} sur Mushrif.`,
      description:
        "Un membre de cette organisation vous a invité à collaborer avec ses membres. Consultez l'invitation et choisissez de l'accepter ou de la refuser.",
      invitationDetails: "Détails de l'invitation",
      organization: "Organisation",
      role: "Rôle",
      expires: "Expire le",
      roles: {
        ADMIN: "Administrateur",
        MEMBER: "Membre",
      },
      buttonText: "Voir l'invitation",
      expirationNote:
        "Cette invitation expirera automatiquement. Veuillez répondre avant sa date d'expiration.",
      needHelp: "Besoin d'aide ?",
      contactSupport: "Contacter le support",
      copyright: "© {{year}} Mushrif. Tous droits réservés.",
    },
  };

  const texts = emailTexts[lang] || emailTexts.en;
  const isRTL = lang === "ar";

  const formattedExpiresAt = expiresAt
    ? new Date(expiresAt).toLocaleDateString(
        lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : "";

  const roleLabel = texts.roles[role] || role;

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
    font-family:Arial, Helvetica, sans-serif;
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
            ${
              logoUrl
                ? `
                  <img
                    src="${logoUrl}"
                    alt="Mushrif"
                    width="120"
                    style="display:block;"
                  />
                `
                : `
                  <div
                    style="
                      color:#ffffff;
                      font-size:28px;
                      font-weight:bold;
                    "
                  >
                    Mushrif
                  </div>
                `
            }
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

            <h1
              style="
                margin:0 0 16px;
                font-size:24px;
              "
            >
              ${texts.greeting}
            </h1>

            <p
              style="
                margin:0 0 16px;
                font-size:16px;
                font-weight:600;
                color:#f97316;
              "
            >
              ${texts.welcomeMessage}
            </p>

            <p
              style="
                margin:0 0 24px;
                font-size:15px;
                line-height:1.6;
                color:#374151;
              "
            >
              ${texts.description}
            </p>

            <!-- Invitation Details -->
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
                  margin:0 0 18px;
                  font-size:15px;
                  font-weight:600;
                  color:#111827;
                "
              >
                ${texts.invitationDetails}
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
              >

                <tr>
                  <td
                    style="
                      padding:8px 0;
                      font-size:14px;
                      color:#6b7280;
                    "
                  >
                    ${texts.organization}
                  </td>

                  <td
                    align="${isRTL ? "left" : "right"}"
                    style="
                      padding:8px 0;
                      font-size:14px;
                      font-weight:600;
                      color:#111827;
                    "
                  >
                    ${organizationName}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:8px 0;
                      font-size:14px;
                      color:#6b7280;
                    "
                  >
                    ${texts.role}
                  </td>

                  <td
                    align="${isRTL ? "left" : "right"}"
                    style="
                      padding:8px 0;
                      font-size:14px;
                      font-weight:600;
                      color:#111827;
                    "
                  >
                    ${roleLabel}
                  </td>
                </tr>

                ${
                  formattedExpiresAt
                    ? `
                    <tr>
                      <td
                        style="
                          padding:8px 0;
                          font-size:14px;
                          color:#6b7280;
                        "
                      >
                        ${texts.expires}
                      </td>

                      <td
                        align="${isRTL ? "left" : "right"}"
                        style="
                          padding:8px 0;
                          font-size:14px;
                          font-weight:600;
                          color:#dc2626;
                        "
                      >
                        ${formattedExpiresAt}
                      </td>
                    </tr>
                  `
                    : ""
                }

              </table>
            </div>

            <!-- Button -->
            <div
              style="
                text-align:center;
                margin:32px 0;
              "
            >
              <a
                href="${invitationUrl}"
                style="
                  background:#f97316;
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

            <!-- Expiration -->
            <div
              style="
                margin-top:24px;
                padding:16px;
                background:#fff7ed;
                border-${isRTL ? "right" : "left"}:4px solid #f97316;
                border-radius:6px;
              "
            >
              <p
                style="
                  margin:0;
                  font-size:13px;
                  line-height:1.6;
                  color:#9a3412;
                "
              >
                ${texts.expirationNote}
              </p>
            </div>

            <!-- Support -->
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
                "
              >
                ${texts.needHelp}
              </p>

              <p
                style="
                  margin:0;
                  font-size:13px;
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
