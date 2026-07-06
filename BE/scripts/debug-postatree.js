require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../src/models/Event');

const STATUSES = [
  'pending_admin', 'revision', 'approved', 'live', 'ended', 'hidden',
  'pending_edit', 'pending_cancel', 'pending_hide', 'pending_postpone', 'pending_delete', 'rejected',
];
const SCHOOL = {
  source: 'school',
  $or: [{ schoolOrganizerRole: 'ctsv' }, { schoolOrganizerRole: { $exists: false } }],
};
const managedBase = {
  $and: [
    { isDeleted: { $ne: true } },
    { status: { $in: STATUSES } },
    { $or: [{ source: 'partner' }, SCHOOL] },
  ],
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const patterns = [/POST-A-TREE/i, /Gieo mầm/i, /F69E4A/i];
  for (const p of patterns) {
    const found = await Event.find({
      $or: [{ title: p }, { _id: p.source === /F69E4A/ ? '6a446b0a4d7c107b5df69e4a' : null }].filter(Boolean),
    }).lean();
    if (found.length) {
      console.log(`\n=== Match ${p} ===`);
      for (const ev of found) {
        console.log(JSON.stringify({
          id: String(ev._id),
          title: ev.title,
          status: ev.status,
          source: ev.source,
          schoolOrganizerRole: ev.schoolOrganizerRole,
          isDeleted: ev.isDeleted,
          startDate: ev.startDate,
          updatedAt: ev.updatedAt,
        }, null, 2));
        const n = await Event.countDocuments({ $and: [...managedBase.$and, { _id: ev._id }] });
        console.log('in managed filter:', n > 0);
        if (!n) {
          if (ev.isDeleted) console.log('  -> isDeleted');
          if (!STATUSES.includes(ev.status)) console.log('  -> status excluded:', ev.status);
          if (ev.source === 'club') console.log('  -> club source');
          if (ev.source === 'school' && ev.schoolOrganizerRole === 'icpdp') console.log('  -> icpdp school');
          if (!['school', 'partner'].includes(ev.source)) console.log('  -> source:', ev.source);
        }
      }
    }
  }

  const byId = await Event.findById('6a446b0a4d7c107b5df69e4a').lean();
  console.log('\n=== By id 6a446b0a4d7c107b5df69e4a ===');
  console.log(byId ? {
    title: byId.title, status: byId.status, source: byId.source,
    schoolOrganizerRole: byId.schoolOrganizerRole, isDeleted: byId.isDeleted,
  } : 'NOT FOUND');

  const allSchool = await Event.find({ title: /POST|TREE|Gieo/i })
    .select('title status source schoolOrganizerRole isDeleted')
    .lean();
  console.log('\n=== Fuzzy title search ===');
  allSchool.forEach((e) => console.log(`[${e.status}] ${e.source}/${e.schoolOrganizerRole || '?'} | ${e.title}`));

  const total = await Event.countDocuments(managedBase);
  console.log('\nManaged total:', total);

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
