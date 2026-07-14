const { verifyToken } = require('../utils/jwt');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      if (payload.email) {
        req.authEmail = payload.email;
        // Nhiều route (vd tải tệp đính kèm) kiểm tra quyền qua req.user → cần set ở đây.
        req.user = { email: payload.email, role: payload.role };
        req.userRole = payload.role;
      }
    } catch {
      /* ignore invalid token for public routes */
    }
  }

  next();
};

module.exports = optionalAuth;
