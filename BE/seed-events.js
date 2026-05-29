require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected. Seeding CTSV demo data...\n');

    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
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
          totalTickets: 200,
          registeredCount: 185,
          status: 'pending_ctsv',
          image: IMG.music,
          source: 'club',
          expectedRevenue: 12000000
        },
        {
          title: 'Làm chủ Prompt Engineering với AI',
          category: 'Workshop',
          startDate: d(7),
          location: 'Hội trường A, FPT Tower',
          totalTickets: 50,
          registeredCount: 10,
          status: 'approved',
          image: IMG.workshop,
          source: 'club'
        },
        {
          title: 'Hackathon 2026: Innovate for Green',
          category: 'Công nghệ',
          startDate: d(3),
          location: 'FPT Software Đà Nẵng',
          totalTickets: 150,
          registeredCount: 120,
          status: 'live',
          image: IMG.tech,
          source: 'school'
        },
        {
          title: 'Career Fair: Kết nối doanh nghiệp',
          category: 'Kết nối',
          startDate: d(10),
          location: 'Sân bóng FPTU',
          totalTickets: 500,
          registeredCount: 200,
          status: 'pending_ctsv',
          image: IMG.career,
          source: 'partner'
        }
      ]);
      console.log('  Events seeded.');
    } else {
      console.log(`  Events already exist (${eventCount}), skip.`);
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
        },
        {
          title: 'Tech Talk: Cloud Native',
          category: 'Công nghệ',
          startDate: d(21),
          location: 'Hội trường B',
          clubName: 'Dev Club FPT',
          submittedByEmail: 'devclub@fpt.edu.vn',
          status: 'pending_icpdp',
          totalTickets: 80,
          image: IMG.tech
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

    console.log('\nSeed complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
