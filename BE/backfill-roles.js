/**
 * Gán role cho user cũ chưa có field role trong MongoDB.
 * Chạy: node backfill-roles.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./src/models/User');
const { resolveUserRole, normalizeRole } = require('./src/utils/role');

dns.setServers(['8.8.8.8', '8.8.4.4']);

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('=== Backfill user roles ===\n');

    const users = await User.find({});
    let updated = 0;

    for (const user of users) {
      const resolved = normalizeRole(resolveUserRole(user));
      if (normalizeRole(user.role) !== resolved) {
        user.role = resolved;
        await user.save();
        console.log(`✅ ${user.email} → role: ${resolved}`);
        updated++;
      } else if (!user.role) {
        user.role = resolved;
        await user.save();
        console.log(`✅ ${user.email} → role: ${resolved} (was missing)`);
        updated++;
      } else {
        console.log(`   ${user.email} → ${user.role} (ok)`);
      }
    }

    console.log(`\nDone. Updated ${updated}/${users.length} users.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
