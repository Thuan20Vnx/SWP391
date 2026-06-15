require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const connectDB = require('../src/config/db');
const authService = require('../src/services/auth.service');
const User = require('../src/models/User');
const { pendingResets } = require('../src/utils/otpStore');

const TEST_EMAIL = `forgot-test-${Date.now()}@example.com`;
const OLD_PASSWORD = 'OldPass1!';
const NEW_PASSWORD = 'NewPass2!';

const run = async () => {
  await connectDB();

  await User.deleteOne({ email: TEST_EMAIL });
  await User.create({
    fullname: 'Forgot Test User',
    email: TEST_EMAIL,
    phone: `09${String(Date.now()).slice(-8)}`,
    passwordHash: await bcrypt.hash(OLD_PASSWORD, 10),
    authProvider: 'local',
    role: 'guest',
    course: 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: [],
  });

  console.log('1) forgotPassword...');
  const forgotResult = await authService.forgotPassword({ contact: TEST_EMAIL });
  console.log('   OK:', forgotResult.message);

  const pending = pendingResets.get(TEST_EMAIL);
  if (!pending?.otp) {
    throw new Error('Không tìm thấy OTP trong pendingResets');
  }
  console.log('   OTP generated:', pending.otp);

  console.log('2) resetPassword with wrong OTP...');
  try {
    await authService.resetPassword({
      email: TEST_EMAIL,
      otp: '000000',
      newPassword: NEW_PASSWORD,
    });
    throw new Error('Expected wrong OTP to fail');
  } catch (err) {
    console.log('   Expected fail:', err.statusCode, err.message, err.extra || '');
  }

  console.log('3) resetPassword with correct OTP...');
  const resetResult = await authService.resetPassword({
    email: TEST_EMAIL,
    otp: pending.otp,
    newPassword: NEW_PASSWORD,
  });
  console.log('   OK:', resetResult.message);

  console.log('4) login with new password...');
  const loginResult = await authService.login({ email: TEST_EMAIL, password: NEW_PASSWORD });
  console.log('   OK:', loginResult.message);

  console.log('5) forgotPassword for Google-only account...');
  const googleEmail = `google-only-${Date.now()}@example.com`;
  await User.deleteOne({ email: googleEmail });
  await User.create({
    fullname: 'Google Only',
    email: googleEmail,
    passwordHash: null,
    authProvider: 'google',
    googleId: `mock-${googleEmail}`,
    role: 'guest',
    course: 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: [],
  });

  try {
    await authService.forgotPassword({ contact: googleEmail });
    throw new Error('Expected Google account to be rejected');
  } catch (err) {
    console.log('   Expected fail:', err.statusCode, err.message, err.extra || '');
  }

  await User.deleteOne({ email: TEST_EMAIL });
  await User.deleteOne({ email: googleEmail });
  console.log('\nAll forgot-password tests passed.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
