module.exports = function resetPasswordEmail({
  resetLink,
  logoUrl
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">

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
            <td style="padding:40px;color:#111827;">

              <h1 style="margin:0 0 16px;font-size:24px;">
                Reset your password
              </h1>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                We received a request to reset your password. Click the button
                below to choose a new one.
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
                  Reset Password
                </a>
              </div>

              <!-- Fallback -->
              <p style="font-size:13px;color:#6b7280;line-height:1.6;">
                If the button doesn’t work, copy and paste this link into your browser:
              </p>

              <p style="font-size:13px;word-break:break-all;color:#f97316;">
                ${resetLink}
              </p>

              <!-- Warning -->
              <div style="margin-top:32px;padding:16px;background:#fef3c7;border-left:4px solid #eab308;">
                <p style="margin:0;font-size:13px;color:#92400e;">
                  ⚠️ This link will expire in 15 minutes.
                  If you didn’t request a password reset, you can safely ignore this email.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;background:#f9fafb;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Mushrif. All rights reserved.
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
