require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = require('./src/config/db');
const Event = require('./src/models/Event');
const EventChangeRequest = require('./src/models/EventChangeRequest');

(async () => {
  try {
    await connectDB();
    const count = await EventChangeRequest.countDocuments();
    if (count > 0) {
      console.log(`EventChangeRequest already has ${count} rows. Skip seed.`);
      process.exit(0);
    }

    const events = await Event.find({
      status: { $in: ['approved', 'live', 'pending_ctsv'] },
      isDeleted: { $ne: true }
    })
      .limit(3)
      .sort({ createdAt: -1 });

    if (events.length === 0) {
      console.log('No events found. Run seed-ctsv-demo.js first.');
      process.exit(0);
    }

    const [e0, e1, e2] = events;
    const snap = (ev) => ({
      title: ev.title,
      description: ev.description || '',
      location: ev.location || '',
      startDate: ev.startDate,
      endDate: ev.endDate,
      capacity: ev.capacity || ev.totalTickets,
      category: ev.category,
      status: ev.status,
      isHidden: false
    });

    const rows = [];
    if (e0) {
      rows.push({
        eventId: e0._id,
        requestType: 'edit',
        reason: 'Đổi địa điểm sang Hội trường A do sảnh Gamma đã kín lịch.',
        clubName: 'FPT Designer Club',
        requestedByEmail: 'club@fpt.edu.vn',
        requestedByName: 'Nguyễn CLB',
        snapshot: snap(e0),
        payload: {
          title: e0.title,
          location: 'Hội trường A, FPT Tower',
          description: e0.description
        }
      });
    }
    if (e1) {
      rows.push({
        eventId: e1._id,
        requestType: 'hide',
        reason: 'Tạm ẩn sự kiện để chỉnh nội dung banner và thời gian.',
        clubName: 'CLB FPT Music',
        requestedByEmail: 'music@fpt.edu.vn',
        requestedByName: 'Trần CLB',
        snapshot: snap(e1)
      });
    }
    if (e2) {
      rows.push({
        eventId: e2._id,
        requestType: 'delete',
        reason: 'Sự kiện bị trùng lịch với kỳ thi — xin hủy và hoàn vé.',
        clubName: 'CLB Dev',
        requestedByEmail: 'dev@fpt.edu.vn',
        requestedByName: 'Lê CLB',
        snapshot: snap(e2)
      });
    }

    await EventChangeRequest.insertMany(rows);
    console.log(`Seeded ${rows.length} event change requests.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
