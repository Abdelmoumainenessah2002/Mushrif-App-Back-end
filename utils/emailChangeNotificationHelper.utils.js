
const { addEmailJob } = require("../queues/email.queue");
const createVerificationToken = require("../services/verificationToken.service");
const {
  getClientIP,
  parseUserAgent,
  getLocationFromIP,
} = require("./loginHistoryHelper.utils");
const emailChangedSecurityAlertTemplate = require("../emails/emailChangedSecurityAlert.template");
const newEmailVerificationTemplate = require("../emails/newEmailVerification.template");
const t = require("./t.utils");
const messages = require("../constants/messages");

/**
 * ============================================================================
 * Email Change Notification & Security Alert Helper (Mushrif Backend)
 * ============================================================================
 * 1. Creates verification token & queues verification email to new email address.
 * 2. Resolves device info & geolocation (utilizing Redis 7-day Geo Cache).
 * 3. Queues detailed security alert notification to old email address.
 * 4. Executes safely with error isolation to prevent crashing or blocking requests.
 */
async function sendEmailChangeNotifications({
  user,
  oldEmail,
  newEmail,
  req,
}) {
  const lang = req?.lang || "en";
  const logoUrl = `${
    process.env.SERVER_URL || "http://localhost:8000"
  }/public/images/logo.png`;
  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:3000";

  // ==========================================================================
  // 1. Queue Verification Email to NEW email address
  // ==========================================================================
  try {
    const token = await createVerificationToken(
      user._id,
      "VERIFY_EMAIL",
      1440, // 24 hours
    );

    const verificationLink = `${clientUrl}/verify-email/${token}`;

    const newEmailHtml = newEmailVerificationTemplate({
      firstName: user.firstName,
      verificationLink,
      logoUrl,
      lang,
    });

    const newEmailSubject =
      t(messages.NEW_EMAIL_VERIFY_SUBJECT, lang) ||
      "Verify your new email address";

    await addEmailJob(
      {
        to: newEmail,
        subject: newEmailSubject,
        html: newEmailHtml,
      },
      "email-change-verification",
    );

    console.log(
      `[EmailChange] Verification email queued for new email: ${newEmail}`,
    );
  } catch (err) {
    console.error(
      `[EmailChange] Failed to queue verification email to new address (${newEmail}):`,
      err.message,
    );
  }

  // ==========================================================================
  // 2. Queue Security Alert Email to OLD email address
  //    with Redis-cached Geolocation & Device Info
  // ==========================================================================
  try {
    const ipAddress = getClientIP(req);
    const userAgent = req?.headers
      ? req.headers["user-agent"] || ""
      : "";

    const { browser, device, os } = parseUserAgent(userAgent);

    const location = await getLocationFromIP(ipAddress);

    const alertHtml = emailChangedSecurityAlertTemplate({
      firstName: user.firstName,
      oldEmail,
      newEmail,
      changeTime: new Date(),
      ipAddress,
      location,
      browser,
      device,
      os,
      logoUrl,
      lang,
    });

    const alertSubject =
      t(messages.EMAIL_CHANGED_ALERT_SUBJECT, lang) ||
      "Security Alert: Email address changed";

    await addEmailJob(
      {
        to: oldEmail,
        subject: alertSubject,
        html: alertHtml,
      },
      "email-change-security-alert",
    );

    console.log(
      `[EmailChange] Security alert email queued for old email: ${oldEmail}`,
    );
  } catch (err) {
    console.error(
      `[EmailChange] Failed to queue security alert to old address (${oldEmail}):`,
      err.message,
    );
  }
}

module.exports = {
  sendEmailChangeNotifications,
};
