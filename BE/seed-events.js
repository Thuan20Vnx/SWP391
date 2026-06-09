/**
 * Seed sự kiện (main) — chạy: node seed-events.js
 * Seed CTSV demo — chạy: node seed-ctsv-demo.js
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const Event = require('./src/models/Event');
const Club = require('./src/models/Club');
const User = require('./src/models/User');
const eventSeedData = require('./src/data/eventSeedData');
const { syncPrimarySpeakerFields } = require('./src/constants/eventSpeaker');

const DEPRECATED_EVENT_TITLES = [
  'F-Fest 2026: Giai điệu mùa hè',
  'Hackathon 2026: Innovate for Green'
];

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
      console.error('Không tìm thấy user. Chạy `node seed.js` trước.');
      process.exit(1);
    }

    const seedTitles = eventSeedData.map((e) => e.title);
    const removedSeed = await Event.deleteMany({ title: { $in: seedTitles } });
    const removedLegacy = await Event.deleteMany({
      $or: [
        { status: { $nin: ['pending', 'approved', 'rejected', 'pending_ctsv', 'live'] } },
        { category: { $nin: Event.CATEGORIES } }
      ]
    });
    console.log(`Đã xóa ${removedSeed.deletedCount} sự kiện seed cũ (nếu có).`);
    console.log(`Đã xóa ${removedLegacy.deletedCount} sự kiện legacy (nếu có).`);
    await Event.deleteMany({ title: { $in: DEPRECATED_EVENT_TITLES } });

    const clubSlugIds = new Map(
      (await Club.find({ slug: { $in: eventSeedData.map((e) => e.clubSlug).filter(Boolean) } }).select('slug'))
        .map((club) => [club.slug, club._id])
    );

    const eventsWithCreator = await Promise.all(
      eventSeedData.map(async (event) => {
        const { clubSlug, ...rest } = event;
        const doc = { ...rest, createdBy: creator._id };
        if (clubSlug && clubSlugIds.has(clubSlug)) {
          doc.clubId = clubSlugIds.get(clubSlug);
          doc.source = doc.source || 'club';
        }
        syncPrimarySpeakerFields(doc);
        return doc;
      })
    );

    const inserted = await Event.insertMany(eventsWithCreator);

    console.log(`Đã seed ${inserted.length} sự kiện vào MongoDB`);
    console.log(`Người tạo: ${creator.fullname} (${creator.email})`);
    process.exit(0);
  } catch (error) {
    console.error('Seed events error:', error);
    process.exit(1);
  }
};

seedEvents();
