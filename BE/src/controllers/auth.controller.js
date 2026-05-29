const authService = require('../services/auth.service');
const { CLIENT_ORIGIN } = require('../config/env');

const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, ...result });
};

const signup = async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(200).json({ success: true, ...result });
};

const verifyOtp = async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  res.status(201).json({ success: true, ...result });
};

const resendOtp = async (req, res) => {
  const result = await authService.resendOtp(req.body);
  res.status(200).json({ success: true, ...result });
};

const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json({ success: true, ...result });
};

const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json({ success: true, ...result });
};

const googleLogin = async (req, res) => {
  const result = await authService.googleLogin(req.body);
  const statusCode = result.isNewUser ? 201 : 200;
  delete result.isNewUser;
  res.status(statusCode).json({ success: true, ...result });
};

const googleCallback = async (req, res) => {
  try {
    const { redirectUrl } = await authService.googleCallback(req.query.code);
    res.redirect(redirectUrl);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Xác thực tài khoản Google thất bại. Vui lòng thử lại!');
    res.redirect(`${CLIENT_ORIGIN}/login?auth_status=error&message=${message}`);
  }
};

const googleCalendarConnect = (req, res) => {
  try {
    const token = req.query.token;
    const { url } = authService.getGoogleCalendarAuthUrl(token);
    res.redirect(url);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Không thể liên kết Google Calendar.');
    res.redirect(`${CLIENT_ORIGIN}/login?auth_status=error&message=${message}`);
  }
};

const googleCalendarCallback = async (req, res) => {
  try {
    const { redirectUrl } = await authService.googleCalendarCallback(
      req.query.code,
      req.query.state
    );
    res.redirect(redirectUrl);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Liên kết Google Calendar thất bại.');
    res.redirect(`${CLIENT_ORIGIN}/?calendar_status=error&message=${message}`);
  }
};

module.exports = {
  login,
  signup,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  googleLogin,
  googleCallback,
  googleCalendarConnect,
  googleCalendarCallback,
};
