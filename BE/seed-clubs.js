/**
 * Code First — seed câu lạc bộ vào MongoDB
 * Chạy: node seed-clubs.js  hoặc  npm run seed:clubs
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const Club = require('./src/models/Club');
const clubSeedData = require('./src/data/clubSeedData');

const seedClubs = async () => {
  try {
    await connectDB();

    const slugs = clubSeedData.map((c) => c.slug);
    const removed = await Club.deleteMany({ slug: { $in: slugs } });
    console.log(`🗑️  Đã xóa ${removed.deletedCount} CLB seed cũ (nếu có).`);

    const inserted = await Club.insertMany(
      clubSeedData.map((club) => ({
        ...club,
        followerCount: 0,
        status: 'active',
      }))
    );

    console.log('====================================');
    console.log(`✅ Code First: đã seed ${inserted.length} câu lạc bộ vào MongoDB`);
    inserted.forEach((c) => {
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
