const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Thiếu hoặc không hợp lệ token xác thực. Vui lòng đăng nhập lại!'
    });
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    if (!payload.email) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
    }
    req.authEmail = payload.email;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!'
    });
  }
};

module.exports = authMiddleware;
