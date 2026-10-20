const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const { hasMinRole } = require("../utils/roleHierarchy.utils");
const { verifyAccessToken } = require("../utils/token.utils");
const sessionService = require("../services/session.service");

// This function is used to verify the Access Token sent by the client
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: t(messages.NO_TOKEN_PROVIDED, req.lang),
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: t(messages.NO_TOKEN_PROVIDED, req.lang),
    });
  }

  let decodedPayload;

  try {
    // Enforce ONLY valid Access Tokens signed with ACCESS_TOKEN_SECRET
    // and type: "access"
    decodedPayload = verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // Access Token must contain the required identity/session claims
  if (!decodedPayload || !decodedPayload.id || !decodedPayload.sessionId) {
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // Validate the server-side session in Redis.
  // This provides immediate Access Token revocation when
  // the user's sessions are deleted (e.g. account suspension).
  const sessionValidation = await sessionService.validateSession(
    decodedPayload.sessionId,
    decodedPayload.id,
  );

  // Security: fail closed if Redis is unavailable.
  // We cannot safely authenticate the request without validating
  // the server-side session.
  if (sessionValidation?.error) {
    return res.status(503).json({
      success: false,
      message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang),
    });
  }

  // Session does not exist or does not belong to this user.
  // This can happen after logout, logout-all, password change,
  // account suspension, or explicit session revocation.
  if (!sessionValidation?.valid) {
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // Everything is valid:
  // JWT + token type + required claims + active Redis session
  req.user = decodedPayload;

  next();
}

function verifyTokenAndAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!hasMinRole(req.user.role, "admin")) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang),
      });
    }

    next();
  });
}

// verify token & users himself
function verifyTokenAndOnlyUser(req, res, next) {
  verifyToken(req, res, () => {
    if (!req.user || req.user.id.toString() !== req.params.id?.toString()) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang),
      });
    }

    next();
  });
}

// verify token & admin or user himself
function verifyTokenAndAuthorization(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.id === req.params.id || hasMinRole(req.user.role, "admin")) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: t(messages.NOT_AUTHORIZED, req.lang),
    });
  });
}

module.exports = {
  verifyToken,
  verifyTokenAndAdmin,
  verifyTokenAndOnlyUser,
  verifyTokenAndAuthorization,
};
