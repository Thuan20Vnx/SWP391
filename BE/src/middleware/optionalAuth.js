const { verifyToken } = require('../utils/jwt');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      if (payload.email) {
        req.authEmail = payload.email;
      }
    } catch {
      /* ignore invalid token for public routes */
    }
  }

  next();
};

module.exports = optionalAuth;
