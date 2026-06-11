require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ role: { $regex: /^CTSV$/i } });
  let fixed = 0;
  for (const u of users) {
    u.role = 'ctsv';
    await u.save();
    fixed += 1;
  }
  console.log(`Fixed ${fixed} user(s) with uppercase CTSV role.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
