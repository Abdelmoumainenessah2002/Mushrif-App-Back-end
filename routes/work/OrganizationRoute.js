const express = require('express');
const router = express.Router();

const {
  createOrganizationCtrl,
  modifyOrganizationSettingsCtrl,
  getMyOrganizationsCtrl,
} = require("../../controllers/work/organizationController.js");

const {
  getOrganizationMembersCtrl,
  inviteUsersToOrganizationCtrl,
  acceptOrganizationInvitationCtrl,
  rejectOrganizationInvitationCtrl,
  cancelOrganizationInvitationCtrl,
  removeOrganizationMemberCtrl,
} = require("../../controllers/work/organizationMemberController.js");

const { uploadSingleImage } = require('../../middlewares/upload.middleware');

const { verifyToken } = require('../../middlewares/verifyJWTToken.middleware');



// create organization route for user
router.post(
  "/",
  verifyToken,
  uploadSingleImage("logo"),
  createOrganizationCtrl,
);

// get my organizations route for user
router.get("/", verifyToken, getMyOrganizationsCtrl);

// get organization members route for user
router.get("/:organizationId/members", verifyToken, getOrganizationMembersCtrl);

// modify organization settings route for user
router.patch(
  "/:organizationId/settings",
  verifyToken,
  modifyOrganizationSettingsCtrl,
);

// invite users to organization route for user
router.post(
  "/:organizationId/invite",
  verifyToken,
  inviteUsersToOrganizationCtrl,
);

// accept organization invitation route for user
router.post(
  "/invitations/:invitationId/accept",
  verifyToken,
  acceptOrganizationInvitationCtrl,
);

// reject organization invitation route for user
router.post(
  "/invitations/:invitationId/reject",
  verifyToken,
  rejectOrganizationInvitationCtrl,
);

// cancel organization invitation route for user
router.patch(
  "/:organizationId/invitations/:invitationId/cancel",
  verifyToken,
  cancelOrganizationInvitationCtrl,
);


// remove organization member route for user
router.delete(
  "/:organizationId/members/:memberId",
  verifyToken,
  removeOrganizationMemberCtrl,
);

module.exports = router;
