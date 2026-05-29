const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint không tồn tại!' });
};

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Lỗi máy chủ nội bộ!';

  const payload = { success: false, message };
  if (err.extra) Object.assign(payload, err.extra);

  res.status(statusCode).json(payload);
};

module.exports = { notFoundHandler, errorHandler };
