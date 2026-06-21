// One-off backfill: notifications with refType 'partner_event_request' created before
// the refId fix stored PartnerEventRequest._id instead of Partner._id, breaking the
// CTSV/admin "click to view partner" navigation. This rewrites refId to the correct
// Partner._id wherever it can be resolved.
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://fevents_team:auin79TZfIO3dF2g@khoahiep.ytlkhpm.mongodb.net/FEventsDB?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);

  const Notification = require('../src/models/Notification');
  const Partner = require('../src/models/Partner');
  const PartnerEventRequest = require('../src/models/PartnerEventRequest');

  const notifs = await Notification.find({ refType: 'partner_event_request' });
  console.log(`Found ${notifs.length} partner_event_request notifications.`);

  let fixed = 0;
  let alreadyOk = 0;
  let unresolved = 0;

  for (const notif of notifs) {
    const refId = notif.refId;
    if (refId && (await Partner.exists({ _id: refId }))) {
      alreadyOk += 1;
      continue;
    }

    let request = null;
    if (refId) {
      request = await PartnerEventRequest.findById(refId).catch(() => null);
    }

    if (request?.partnerId) {
      notif.refId = String(request.partnerId);
      await notif.save();
      fixed += 1;
      console.log(`Fixed notif ${notif._id}: ${refId} -> ${notif.refId}`);
      continue;
    }

    unresolved += 1;
    console.log(`Unresolved notif ${notif._id} (refId=${refId || '<empty>'}) — no matching request/partner found.`);
  }

  console.log(`Done. fixed=${fixed} alreadyOk=${alreadyOk} unresolved=${unresolved}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
