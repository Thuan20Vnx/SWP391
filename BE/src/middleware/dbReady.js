const { isDbReady } = require('../config/db');

const EXEMPT_PREFIXES = ['/api/system'];

const dbReady = (req, res, next) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  if (isDbReady()) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: 'Máy chủ đang kết nối lại cơ sở dữ liệu. Vui lòng thử lại sau giây lát.',
    code: 'DB_UNAVAILABLE',
  });
};

module.exports = dbReady;
