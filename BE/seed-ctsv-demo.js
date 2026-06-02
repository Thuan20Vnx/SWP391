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
          ticketPrice: 50000,
          ticketTypes: [
            {
              name: 'Vé sinh viên',
              priceType: 'paid',
              priceAmount: 50000,
              qty: 35,
              audience: 'SV FPT'
            },
            {
              name: 'Vé khách mời',
              priceType: 'free',
              priceAmount: 0,
              qty: 5,
              audience: 'Khách ngoài trường'
            }
          ],
          image: IMG.workshop
        }
      ]);
      console.log('  Proposals seeded.');
    }

    const removed = await Partner.deleteMany({ status: { $nin: ['pending', 'pending_admin', 'approved', 'rejected', 'info_requested'] } });
    if (removed.deletedCount) {
      console.log(`  Removed ${removed.deletedCount} partner(s) with invalid status (e.g. active).`);
    }

    const removedTest = await Partner.deleteMany({
      $or: [
        { name: /cursoragent/i },
        { email: /cursoragent/i },
        { partnerCode: /cursoragent/i }
      ]
    });
    if (removedTest.deletedCount) {
      console.log(`  Removed ${removedTest.deletedCount} test partner(s) (cursoragent).`);
    }

    const sampleCode = 'DEMO-PENDING';
    const hasSample = await Partner.findOne({ partnerCode: sampleCode });
    if (!hasSample) {
      const p = await Partner.create({
        name: 'Công ty TNHH Thực phẩm Xanh Việt',
        partnerCode: sampleCode,
        category: 'F&B — Thực phẩm & Đồ uống',
        email: 'hop_tac@greenfood.vn',
        phone: '0903123456',
        representative: 'Phạm Minh Đức',
        representativeTitle: 'Trưởng phòng Marketing',
        proposedEventTitle: 'FPT Green Campus Day 2026',
        expectedSponsorAmount: 120000000,
        status: 'pending',
        benefits: [
          'Gian hàng sampling sản phẩm organic',
          'Logo trên banner chính sân khấu',
          'Quà tặng cho 200 SV tham dự'
        ],
        attachments: [
          { name: 'Profile GreenFood 2026.pdf', url: '#', sizeLabel: '1.8 MB' },
          { name: 'Đề xuất tài trợ v1.docx', url: '#', sizeLabel: '640 KB' }
        ]
      });
      await Contract.create({
        partnerId: p._id,
        title: p.proposedEventTitle,
        amount: p.expectedSponsorAmount,
        status: 'pending'
      });
      console.log('  Added sample pending partner application.');
    }

    const partnerCount = await Partner.countDocuments();
    if (partnerCount === 0) {
      const demos = [
        {
          name: 'Suntory PepsiCo Vietnam',
          partnerCode: 'SP',
          category: 'FMCG - Nước giải khát',
          email: 'csr@suntorypepsico.vn',
          phone: '02838229999',
          representative: 'Nguyễn Văn Hải',
          representativeTitle: 'Trưởng phòng CSR',
          proposedEventTitle: 'FPT Edu ColorDash 2024',
          expectedSponsorAmount: 150000000,
          status: 'pending',
          benefits: [
            'Logo trên backdrop sân khấu',
            'Gian hàng trải nghiệm sản phẩm',
            'MC nhắc tên 3 lần trong chương trình'
          ],
          attachments: [
            { name: 'Hồ sơ năng lực Suntory PepsiCo', url: '#', sizeLabel: '2.4 MB' },
            { name: 'Bản thảo hợp đồng tài trợ v1', url: '#', sizeLabel: '856 KB' }
          ]
        },
        {
          name: 'FPT Software',
          partnerCode: 'FS',
          category: 'Công nghệ thông tin',
          email: 'partner@fptsoftware.com',
          phone: '02363888888',
          representative: 'Trần Minh Khoa',
          representativeTitle: 'Quản lý đối tác học đường',
          proposedEventTitle: 'Career Fair: Kết nối doanh nghiệp',
          expectedSponsorAmount: 80000000,
          status: 'approved',
          approvedByEmail: 'ctsv@fpt.edu.vn'
        },
        {
          name: 'VNG Corporation',
          partnerCode: 'VNG',
          category: 'Công nghệ & Giải trí',
          email: 'sponsor@vng.com.vn',
          phone: '02838229900',
          representative: 'Lê Thị Mai',
          representativeTitle: 'Chuyên viên Marketing',
          proposedEventTitle: 'Workshop Khởi Nghiệp Kỷ Nguyên Số',
          expectedSponsorAmount: 45000000,
          status: 'rejected',
          rejectionReason: 'Ngân sách chưa phù hợp khung tài trợ quý này.'
        }
      ];
      for (const data of demos) {
        const { proposedEventTitle, expectedSponsorAmount, benefits, attachments, ...partnerFields } =
          data;
        const p = await Partner.create({
          ...partnerFields,
          benefits: benefits || [],
          attachments: attachments || []
        });
        await Contract.create({
          partnerId: p._id,
          title: proposedEventTitle,
          amount: expectedSponsorAmount,
          status: partnerFields.status === 'approved' ? 'approved' : 'pending'
        });
      }
      console.log('  Partners seeded (3 demo).');
    }

    console.log('\nCTSV seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
