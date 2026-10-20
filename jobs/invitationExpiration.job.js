const {
  expireOrganizationInvitations,
} = require("../services/organizationInvitation.service");

const INVITATION_EXPIRATION_INTERVAL_MS = 5 * 60 * 1000;

let intervalId = null;
let expirationInProgress = false;
let expirationPromise = null;

async function runInvitationExpiration() {
  if (expirationInProgress) {
    return expirationPromise;
  }

  expirationInProgress = true;

  expirationPromise = (async () => {
    try {
      const result = await expireOrganizationInvitations();

      if (result.modifiedCount > 0) {
        console.log(
          `[InvitationExpirationJob] Marked ${result.modifiedCount} invitation(s) as expired.`,
        );
      }
    } catch (error) {
      console.error(
        "[InvitationExpirationJob] Failed to expire organization invitations:",
        error.message,
      );
    } finally {
      expirationInProgress = false;
      expirationPromise = null;
    }
  })();

  return expirationPromise;
}

function startInvitationExpirationJob() {
  if (intervalId) {
    return;
  }

  runInvitationExpiration();
  intervalId = setInterval(
    runInvitationExpiration,
    INVITATION_EXPIRATION_INTERVAL_MS,
  );
}

function stopInvitationExpirationJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  return expirationPromise || Promise.resolve();
}

module.exports = {
  startInvitationExpirationJob,
  stopInvitationExpirationJob,
};
