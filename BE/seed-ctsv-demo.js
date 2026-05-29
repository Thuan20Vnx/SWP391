require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = require('./src/config/db');
const Event = require('./src/models/Event');
const EventProposal = require('./src/models/EventProposal');
const Partner = require('./src/models/Partner');
const Contract = require('./src/models/Contract');

const IMG = {
  music: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
  workshop: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
  tech: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
  career: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'
};

(async () => {
  try {
    await connectDB();
    console.log('Connected. Seeding CTSV demo data...\n');

    const eventCount = await Event.countDocuments({ source: { $in: ['club', 'school', 'partner'] } });
    if (eventCount < 2) {
      const now = new Date();
      const d = (days) => {
        const x = new Date(now);
        x.setDate(x.getDate() + days);
        return x;
      };

      await Event.insertMany([
        {
          title: 'Đêm nhạc F-Fest: Giai điệu mùa hè',
          category: 'Âm nhạc',
          startDate: d(5),
          location: 'FPT Plaza 2, Đà Nẵng',
          capacity: 200,
          totalTickets: 200,
          registeredCount: 185,
          status: 'pending_ctsv',
          thumbnail: IMG.music,
          image: IMG.music,
          source: 'club',
          expectedRevenue: 12000000
        },
        {
          title: 'Làm chủ Prompt Engineering với AI',
          category: 'Workshop',
          startDate: d(7),
          location: 'Hội trường A, FPT Tower',
          capacity: 50,
          totalTickets: 50,
          registeredCount: 10,
          status: 'approved',
          thumbnail: IMG.workshop,
          image: IMG.workshop,
          source: 'club'
        }
      ]);
      console.log('  Events seeded.');
    }

    const proposalCount = await EventProposal.countDocuments();
    if (proposalCount === 0) {
      const now = new Date();
      const d = (days) => {
        const x = new Date(now);
        x.setDate(x.getDate() + days);
        return x;
      };
      await EventProposal.insertMany([
        {
          title: 'Workshop UI/UX 2026',
          category: 'Workshop',
          startDate: d(14),
          location: 'Lab 301',
          clubName: 'FPT Designer Club',
          submittedByEmail: 'club@fpt.edu.vn',
          status: 'pending_ctsv',
          totalTickets: 40,
          image: IMG.workshop
        }
      ]);
      console.log('  Proposals seeded.');
    }

    const partnerCount = await Partner.countDocuments();
    if (partnerCount === 0) {
      const p = await Partner.create({
        name: 'FPT Software Đà Nẵng',
        email: 'partner@fptsoftware.com',
        phone: '02363888888',
        representative: 'Nguyễn Văn A',
        status: 'pending'
      });
      await Contract.create({
        partnerId: p._id,
        title: 'Hợp đồng tài trợ Career Fair 2026',
        amount: 50000000,
        status: 'pending'
      });
      console.log('  Partners seeded.');
    }

    console.log('\nCTSV seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
