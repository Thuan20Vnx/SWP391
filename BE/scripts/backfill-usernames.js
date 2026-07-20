/**
 * Sinh tên đăng nhập cho các tài khoản đã có trước khi hệ thống có trường
 * `username`. Không có bước này, tài khoản cũ chỉ đăng nhập được bằng email.
 *
 * Chạy:  node scripts/backfill-usernames.js
 *        node scripts/backfill-usernames.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateUsernameForEmail } = require('../src/utils/username');

const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGO_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Đã kết nối MongoDB${DRY_RUN ? ' (chạy thử, không ghi)' : ''}.`);

  const users = await User.find({
    $or: [{ username: null }, { username: '' }, { username: { $exists: false } }],
  }).select('_id email fullname');

  console.log(`Tìm thấy ${users.length} tài khoản chưa có tên đăng nhập.`);

  let updated = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Tuần tự chứ không Promise.all: hàm sinh tên phải thấy được các tên vừa
      // cấp ở vòng lặp trước, nếu chạy song song sẽ cấp trùng.
      const username = await generateUsernameForEmail(user.email);
      if (DRY_RUN) {
        console.log(`  [thử] ${user.email} -> ${username}`);
      } else {
        await User.updateOne({ _id: user._id }, { $set: { username } });
        console.log(`  ${user.email} -> ${username}`);
      }
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  LỖI ${user.email}: ${err.message}`);
    }
  }

  console.log(`\nHoàn tất: ${updated} thành công, ${failed} lỗi.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Backfill thất bại:', err);
  process.exit(1);
});
