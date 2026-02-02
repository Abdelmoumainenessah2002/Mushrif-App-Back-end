const t = require('./t');

module.exports = (req, res, status, code, data = null) => {
  return res.status(status).json({
    success: true,
    message: t(code, req.lang),
    data
  });
};
