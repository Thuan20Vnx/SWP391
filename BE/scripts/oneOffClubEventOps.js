// One-off ops requested by the team:
//  1) Soft-delete the test event "Overseas".
//  2) Create a "Fever" club and assign clb@gmail.com as its manager (for testing).
// Run once, then it's safe to delete this file.
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI');
  process.exit(1);
}

const slugify = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'club';

async function run() {
  await mongoose.connect(MONGO_URI);

  const Event = require('../src/models/Event');
  const Club = require('../src/models/Club');
  const User = require('../src/models/User');

  // 1) Soft-delete "Overseas"
  const overseas = await Event.findOne({ title: 'Overseas', isDeleted: { $ne: true } });
  if (overseas) {
    overseas.isDeleted = true;
    await overseas.save();
    console.log(`Soft-deleted event "Overseas" (${overseas._id}).`);
  } else {
    console.log('No active "Overseas" event found.');
  }

  // 2) Create "Fever" club + assign clb@gmail.com
  const manager = await User.findOne({ email: 'clb@gmail.com' });
  if (!manager) {
    console.log('User clb@gmail.com not found — skipping Fever club.');
  } else {
    let club = await Club.findOne({ name: 'Fever' });
    if (!club) {
      let slug = slugify('Fever');
      let n = 0;
      while (await Club.findOne({ slug })) {
        n += 1;
        slug = `fever-${n}`;
      }
      club = await Club.create({
        slug,
        name: 'Fever',
        category: 'Công nghệ',
        description: 'CLB Fever — câu lạc bộ thử nghiệm dành cho tài khoản quản lý CLB.',
        president: manager.fullname || 'Club Manager Test',
        email: manager.email,
        status: 'active',
        managedBy: manager._id,
      });
      console.log(`Created club "Fever" (${club._id}, slug=${club.slug}).`);
    } else {
      club.managedBy = manager._id;
      club.status = 'active';
      await club.save();
      console.log(`Club "Fever" already existed (${club._id}); re-assigned manager.`);
    }
    console.log(`Assigned clb@gmail.com (${manager._id}) as manager of Fever.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
