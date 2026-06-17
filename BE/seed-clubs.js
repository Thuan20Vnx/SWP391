/**
 * Code First — seed câu lạc bộ vào MongoDB
 * Chạy: node seed-clubs.js  hoặc  npm run seed:clubs
 *
 * Lưu ý: cập nhật theo slug, KHÔNG xóa-tạo lại — giữ _id để sự kiện/timeline không bị mất liên kết.
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const Club = require('./src/models/Club');
const clubSeedData = require('./src/data/clubSeedData');

/** Không ghi đè ảnh/logo do quản lý CLB đã tải lên khi chạy lại seed */
const PRESERVE_IF_SET_FIELDS = ['coverImage', 'logoImage', 'managedBy'];

const seedClubs = async () => {
  try {
    await connectDB();

    let created = 0;
    let updated = 0;

    for (const club of clubSeedData) {
      const payload = {
        ...club,
        followerCount: club.followerCount ?? 0,
        status: club.status || 'active',
      };
      const existing = await Club.findOne({ slug: club.slug });
      if (existing) {
        const updates = { ...payload };
        for (const field of PRESERVE_IF_SET_FIELDS) {
          const current = existing[field];
          if (current !== undefined && current !== null && String(current).trim() !== '') {
            delete updates[field];
          }
        }
        await Club.updateOne({ slug: club.slug }, { $set: updates });
        updated += 1;
      } else {
        await Club.create(payload);
        created += 1;
      }
    }

    console.log('====================================');
    console.log(`✅ Seed CLB: ${created} mới, ${updated} cập nhật (giữ nguyên _id CLB cũ)`);
    clubSeedData.forEach((c) => {
      console.log(`   • [${c.category}] ${c.name} (${c.slug})`);
    });
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed clubs error:', error);
    process.exit(1);
  }
};

seedClubs();
