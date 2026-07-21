/**
 * Chốt chặn nhánh Google giả lập.
 *
 * Nhánh giả lập bỏ qua xác thực với Google và tin thẳng email do phía gọi gửi lên.
 * Trước đây `isMock` lấy từ body request đủ để mở nhánh này, nên
 * POST /api/auth/google { isMock: true, email: <bất kỳ> } cấp token hợp lệ cho tài
 * khoản đó — kể cả admin — dù Google đã cấu hình thật.
 *
 * Test này giữ cho lỗ hổng đó không quay lại. Chạy: node scripts/test-google-mock-guard.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../src/models/User');
const authService = require('../src/services/auth.service');
const { GOOGLE_CLIENT_ID, NODE_ENV } = require('../src/config/env');

const BAIT = 'zz-google-mock-guard@example.invalid';

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const mockConfigured = GOOGLE_CLIENT_ID === 'mock';
  console.log(`NODE_ENV=${NODE_ENV} | GOOGLE_CLIENT_ID=${mockConfigured ? 'mock' : 'thật'}`);

  if (mockConfigured && NODE_ENV !== 'production') {
    console.log('\nMôi trường này CHƯA cấu hình Google nên nhánh giả lập được phép mở.');
    console.log('Test chỉ có nghĩa khi đã cấu hình Google thật — bỏ qua.');
    await mongoose.disconnect();
    process.exit(0);
  }

  try {
    await User.deleteOne({ email: BAIT });
    await User.create({
      email: BAIT,
      fullname: 'Google Mock Guard Bait',
      role: 'admin',
      isVerified: true,
      loginMethod: 'local',
      authProvider: 'local',
      passwordHash: await bcrypt.hash('a-very-strong-password', 10),
    });

    console.log('\n[1] isMock từ body không được mở nhánh giả lập');
    try {
      const res = await authService.googleLogin({ isMock: true, email: BAIT, name: 'Attacker' });
      check('không cấp token cho isMock', !res?.token, '-> ĐÃ CẤP TOKEN, lỗ hổng quay lại!');
    } catch (err) {
      check('bị từ chối', true);
      console.log(`        -> "${err.message}"`);
    }

    console.log('\n[2] Không có token Google thì luôn bị từ chối');
    try {
      await authService.googleLogin({ email: BAIT, name: 'Attacker' });
      check('phải ném lỗi khi thiếu token', false, '-> không ném lỗi');
    } catch (err) {
      check('bị từ chối', err.message.includes('token'), `-> "${err.message}"`);
    }

    console.log('\n[3] Tài khoản mồi không bị đụng tới');
    const after = await User.findOne({ email: BAIT });
    check('vẫn là authProvider local', after.authProvider === 'local');
    check('không bị gắn googleId', !after.googleId);
  } finally {
    await User.deleteOne({ email: BAIT });
    await mongoose.disconnect();
  }

  console.log(`\n===== ${pass} pass, ${fail} fail =====`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((err) => { console.error(err); process.exit(1); });
