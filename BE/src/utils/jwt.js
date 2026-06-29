const jwt = require('jsonwebtoken');
const { normalizeRole, resolveUserRole } = require('./role');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (user) => {
  const email = user.email || user;
  const role = normalizeRole(resolveUserRole(user));
  return jwt.sign(
    {
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken };
