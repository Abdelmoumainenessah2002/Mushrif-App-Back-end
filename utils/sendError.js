const t = require('./t');

module.exports = (req, res, status, code) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message: t(code, req.lang)
    }
  });
};
