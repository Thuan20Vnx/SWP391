const AppError = require('../utils/AppError');

const normalizeError = (err) => {
  if (err instanceof AppError || err.isOperational) {
    return err;
  }

  if (err.name === 'ValidationError') {
    const details = err.errors
      ? Object.values(err.errors)
          .map((e) => e.message)
          .join('; ')
      : err.message;
    return new AppError(details || 'Dữ liệu hồ sơ không hợp lệ.', 400);
  }

  if (err.name === 'CastError') {
    return new AppError('Dữ liệu cấu hình hệ thống không hợp lệ trên máy chủ.', 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'dữ liệu';
    const duplicateMessages = {
      phone: 'Số điện thoại đã được sử dụng bởi tài khoản khác!',
      code: 'Mã thanh toán bị trùng, vui lòng thử lại.',
      sepayTxId: 'Giao dịch thanh toán đã được xử lý.',
    };
    return new AppError(
      duplicateMessages[field] || 'Thông tin đã tồn tại trong hệ thống.',
      400
    );
  }

  if (err.code === 10334 || /maximum allowed size/i.test(err.message || '')) {
    return new AppError(
      'Ảnh đại diện hoặc hồ sơ quá lớn. Vui lòng chọn ảnh nhỏ hơn.',
      400
    );
  }

  return err;
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint không tồn tại!' });
};

const errorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);
  console.error('API error:', req.method, req.originalUrl, '-', normalized.message || err.message, err.stack);

  const statusCode = normalized.statusCode || 500;
  const message = normalized.isOperational
    ? normalized.message
    : 'Lỗi máy chủ nội bộ!';

  const payload = { success: false, message };
  if (normalized.extra) Object.assign(payload, normalized.extra);

  res.status(statusCode).json(payload);
};

module.exports = { notFoundHandler, errorHandler };
