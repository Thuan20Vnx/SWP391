/**
 * Code First — seed sự kiện vào MongoDB từ Event model + eventSeedData
 * Chạy: node seed-events.js  hoặc  npm run seed:events
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const Event = require('./src/models/Event');
const User = require('./src/models/User');
const eventSeedData = require('./src/data/eventSeedData');

const seedEvents = async () => {
  try {
    await connectDB();

    let creator = await User.findOne({ role: { $in: ['staff', 'ctsv'] } });
    if (!creator) {
      creator = await User.findOne({ email: 'giangvienfpt@gmail.com' });
    }
    if (!creator) {
      creator = await User.findOne();
    }
    if (!creator) {
      console.error('❌ Không tìm thấy user nào. Chạy `node seed.js` trước để tạo tài khoản mẫu.');
      process.exit(1);
    }

    const seedTitles = eventSeedData.map((e) => e.title);
    const deleted = await Event.deleteMany({ title: { $in: seedTitles } });
    console.log(`🗑️  Đã xóa ${deleted.deletedCount} sự kiện seed cũ (nếu có).`);

    const eventsWithCreator = eventSeedData.map((event) => ({
      ...event,
      createdBy: creator._id,
    }));

    const inserted = await Event.insertMany(eventsWithCreator);

    console.log('====================================');
    console.log(`✅ Code First: đã seed ${inserted.length} sự kiện vào MongoDB`);
    console.log(`   Người tạo: ${creator.fullname} (${creator.email})`);
    console.log(`   Danh mục model: ${Event.CATEGORIES.join(', ')}`);
    inserted.forEach((ev) => {
      console.log(`   • [${ev.category}] ${ev.title} — ${ev.eventState} (${ev.registeredCount}/${ev.capacity})`);
    });
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed events error:', error);
    process.exit(1);
  }
};

seedEvents();
