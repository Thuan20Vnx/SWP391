require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Club = require('../src/models/Club');
  const Event = require('../src/models/Event');
  const Timeline = require('../src/models/ClubSemesterTimeline');
  const User = require('../src/models/User');

  const validClubIds = (await Club.find({}).select('_id')).map((c) => c._id);
  const orphanFilter = {
    clubId: { $exists: true, $ne: null, $nin: validClubIds },
  };

  const orphanEvents = await Event.find(orphanFilter);
  const orphanTimelines = await Timeline.find(orphanFilter);
  console.log(`Found ${orphanEvents.length} orphan events, ${orphanTimelines.length} orphan timelines`);

  let fixedEvents = 0;
  for (const ev of orphanEvents) {
    const club = await Club.findOne({ managedBy: ev.createdBy });
    if (!club) continue;
    ev.clubId = club._id;
    await ev.save();
    fixedEvents += 1;
    console.log(`Event "${ev.title}" -> ${club.name}`);
  }

  let fixedTimelines = 0;
  for (const tl of orphanTimelines) {
    let club = null;
    if (tl.submittedByEmail) {
      const user = await User.findOne({ email: tl.submittedByEmail });
      if (user) club = await Club.findOne({ managedBy: user._id });
    }
    if (!club) continue;
    tl.clubId = club._id;
    tl.clubName = club.name;
    tl.clubSlug = club.slug;
    await tl.save();
    fixedTimelines += 1;
    console.log(`Timeline "${tl.semesterLabel}" -> ${club.name}`);
  }

  console.log(`Done. Fixed ${fixedEvents} events, ${fixedTimelines} timelines.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
