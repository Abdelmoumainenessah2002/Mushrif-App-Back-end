const jwt = require('jsonwebtoken');
const t = require('../utils/t');
const messages = require('../constants/messages');
const { hasMinRole } = require("../utils/roleHierarchy");


// This function is used to verify the token which is send by the client
function verifyToken(req, res, next) {
    const authToken = req.headers.authorization;
    if (authToken) {
        const token = authToken.split(" ")[1];
        try {
            const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decodedPayload;
            next();
        } catch (error) {
            res.status(401).json({ 
                success: false,
                message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
             });
        }
    }
    else {
        res.status(401).json({ 
            success: false,
            message: t(messages.NO_TOKEN_PROVIDED, req.lang)
         });
    }  
}

function verifyTokenAndAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!hasMinRole(req.user.role, "admin")) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang)
      });
    }
    next();
  });
}



// verify token & users himself
function verifyTokenAndOnlyUser(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ 
                success: false,
                message: t(messages.NOT_AUTHORIZED, req.lang)
             });
        }
        next();
    }
    );
}


// verify token & admin or user himself
function verifyTokenAndAuthorization(req, res, next) {
  verifyToken(req, res, () => {
    if (
      req.user.id === req.params.id ||
      hasMinRole(req.user.role, "admin")
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: t(messages.NOT_AUTHORIZED, req.lang)
    });
  });
}





module.exports = {
  verifyToken,
  verifyTokenAndAdmin,
  verifyTokenAndOnlyUser,
  verifyTokenAndAuthorization,
};