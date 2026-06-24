const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://fevents_team:auin79TZfIO3dF2g@khoahiep.ytlkhpm.mongodb.net/FEventsDB?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB (khoahiep)');

  const Event = require('../src/models/Event');

  const total = await Event.countDocuments({});
  console.log(`Total events in DB: ${total}`);

  const list = await Event.find({}, 'title status source').lean();
  list.forEach(e => console.log(`  - [${e.status}][${e.source}] ${e.title}`));

  const result = await Event.deleteMany({});
  console.log(`\n✅ Deleted ${result.deletedCount} events.`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
