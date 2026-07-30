/**
 * Seed dữ liệu demo thuyết trình ngày 31/07/2026.
 *
 * Chạy:
 *   node seed-presentation-demo.js
 * hoặc:
 *   npm run seed:presentation
 */
require('dotenv').config();

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Club = require('./src/models/Club');
const Event = require('./src/models/Event');
const EventProposal = require('./src/models/EventProposal');
const ClubSemesterTimeline = require('./src/models/ClubSemesterTimeline');
const Partner = require('./src/models/Partner');
const PartnerEventRequest = require('./src/models/PartnerEventRequest');
const PartnerMember = require('./src/models/PartnerMember');

const RUN_TAG = 'PRESENTATION-20260731';
const DEFAULT_PASSWORD = 'Test@2026';

const ACCOUNTS = {
  admin: { email: 'admin.test@fpt.edu.vn', fullname: 'Admin Test', role: 'admin' },
  ctsv: { email: 'ctsv.test@fpt.edu.vn', fullname: 'CTSV Test', role: 'ctsv' },
  icpdp: { email: 'icpdp.test@fpt.edu.vn', fullname: 'ICPDP Test', role: 'icpdp' },
  fever: { email: 'fever.club@fpt.edu.vn', fullname: 'Fever Club Manager', role: 'club_manager' },
  partner: { email: 'contact@endfields.vn', fullname: 'Endfields Partner', role: 'partner' },
};

const img = {
  tech: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  workshop: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  music: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  career: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
  sport: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
};

const dateAt = (isoDate, hour = 8, minute = 0) => new Date(`${isoDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`);

const RUN_TAG_REGEX = new RegExp(RUN_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const partnerCodes = ['END-PRES-001', 'END-PRES-002', 'END-PRES-003'];
const partnerTitles = [
  'Endfields Demo - Career Talk: Global Business Analyst',
  'Endfields Demo - Workshop CV & Interview Clinic',
  'Endfields Demo - Tech Partnership Day',
];

const upsertUser = async ({ email, fullname, role }, passwordHash, index) => {
  const normalized = email.trim().toLowerCase();
  const payload = {
    fullname,
    email: normalized,
    passwordHash,
    authProvider: 'local',
    role,
    campus: 'FPT University Da Nang',
    isActive: true,
    phone: `098${String(20260700 + index).slice(-7)}`,
  };

  return User.findOneAndUpdate(
    { email: normalized },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const ensureAccounts = async () => {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const entries = Object.values(ACCOUNTS);
  const users = {};
  for (let i = 0; i < entries.length; i += 1) {
    const account = entries[i];
    users[account.role === 'club_manager' ? 'fever' : account.role] = await upsertUser(account, passwordHash, i);
  }
  return users;
};

const ensureFeverClub = async (manager) => Club.findOneAndUpdate(
  { slug: 'fever' },
  {
    $set: {
      slug: 'fever',
      name: 'CLB Fever',
      shortName: 'Fever',
      category: 'Âm nhạc',
      logoText: 'FV',
      logoColor: '#ef4444',
      description: 'Câu lạc bộ nghệ thuật và sự kiện biểu diễn của sinh viên FPT.',
      organization: 'FPT University Da Nang',
      memberCount: 68,
      followerCount: 1240,
      eventsHeld: 18,
      tags: ['music', 'performance', 'event'],
      managedBy: manager._id,
      status: 'active',
      email: ACCOUNTS.fever.email,
      president: 'Fever Demo Lead',
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const baseTickets = (qty = 120, price = 0) => [
  {
    name: price > 0 ? 'Vé tiêu chuẩn' : 'Vé sinh viên',
    priceType: price > 0 ? 'paid' : 'free',
    priceAmount: price,
    qty,
    audience: 'SV FPT',
  },
];

const buildEventPayload = ({
  title,
  status,
  source,
  organizerRole,
  createdBy,
  club,
  start,
  category,
  location,
  image,
  ticketPrice = 0,
}) => {
  const startDate = dateAt(start, 8, 30);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const regStart = new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000);
  const regEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

  return {
    title,
    description: `${title} - dữ liệu demo cho buổi thuyết trình FEvents (${RUN_TAG}).`,
    category,
    startDate,
    endDate,
    registrationStartDate: regStart,
    registrationEndDate: regEnd,
    location,
    capacity: 120,
    totalTickets: 120,
    expectedAttendees: 100,
    ticketPrice,
    ticketTypes: baseTickets(120, ticketPrice),
    thumbnail: image,
    image,
    status,
    source,
    schoolOrganizerRole: organizerRole,
    createdBy: createdBy?._id,
    createdByEmail: createdBy?.email || '',
    ctsvSubmittedByEmail: source === 'school' ? createdBy?.email || '' : '',
    ctsvSubmittedAt: source === 'school' ? new Date() : null,
    clubId: club?._id || null,
    expectedRevenue: ticketPrice * 80,
    agenda: 'Đón khách, nội dung chính, hỏi đáp và tổng kết.',
    learningOutcomes: ['Hiểu mục tiêu chương trình', 'Tham gia hoạt động thực tế', 'Ghi nhận phản hồi sau sự kiện'],
  };
};

const createSchoolEvents = async (users) => Event.insertMany([
  buildEventPayload({
    title: 'ICPDP Demo - Ngày hội học thuật AI',
    status: 'pending_admin',
    source: 'school',
    organizerRole: 'icpdp',
    createdBy: users.icpdp,
    start: '2026-08-20',
    category: 'Học thuật',
    location: 'Hội trường Gamma',
    image: img.tech,
  }),
  buildEventPayload({
    title: 'ICPDP Demo - Seminar định hướng nghiên cứu',
    status: 'pending_admin',
    source: 'school',
    organizerRole: 'icpdp',
    createdBy: users.icpdp,
    start: '2026-08-27',
    category: 'Học thuật',
    location: 'Phòng Seminar 401',
    image: img.workshop,
  }),
  buildEventPayload({
    title: 'CTSV Demo - Ngày hội sinh viên toàn trường',
    status: 'pending_admin',
    source: 'school',
    organizerRole: 'ctsv',
    createdBy: users.ctsv,
    start: '2026-09-03',
    category: 'Kết nối',
    location: 'Sân FPT Plaza',
    image: img.career,
  }),
  buildEventPayload({
    title: 'CTSV Demo - Workshop kỹ năng học đường',
    status: 'pending_admin',
    source: 'school',
    organizerRole: 'ctsv',
    createdBy: users.ctsv,
    start: '2026-09-10',
    category: 'Workshop',
    location: 'Hội trường Alpha',
    image: img.workshop,
  }),
]);

const createClubEventsAndProposals = async (users, club) => {
  const events = await Event.insertMany([
    buildEventPayload({
      title: 'Fever Demo - Music Night Kết nối',
      status: 'pending_icpdp',
      source: 'club',
      createdBy: users.fever,
      club,
      start: '2026-09-17',
      category: 'Âm nhạc',
      location: 'Sân khấu ngoài trời',
      image: img.music,
      ticketPrice: 30000,
    }),
    buildEventPayload({
      title: 'Fever Demo - Workshop sân khấu và ánh sáng',
      status: 'pending_icpdp',
      source: 'club',
      createdBy: users.fever,
      club,
      start: '2026-09-24',
      category: 'Workshop',
      location: 'Studio Media',
      image: img.workshop,
    }),
    buildEventPayload({
      title: 'Fever Demo - Showcase tài năng học kỳ',
      status: 'pending_admin',
      source: 'club',
      createdBy: users.fever,
      club,
      start: '2026-10-01',
      category: 'Nghệ thuật',
      location: 'Hội trường Beta',
      image: img.music,
      ticketPrice: 50000,
    }),
  ]);

  const proposals = await EventProposal.insertMany(events.map((event) => ({
    title: event.title,
    description: event.description,
    category: event.category,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    totalTickets: event.totalTickets,
    ticketPrice: event.ticketPrice,
    ticketTypes: event.ticketTypes,
    expectedAttendees: event.expectedAttendees,
    image: event.image,
    clubId: String(club._id),
    clubName: club.name,
    submittedByEmail: users.fever.email,
    status: event.status,
    linkedEventId: event._id,
    icpdpNote: event.status === 'pending_admin' ? 'IC-PDP đã duyệt sơ bộ, chuyển Admin duyệt cuối.' : '',
  })));

  for (const proposal of proposals) {
    await Event.updateOne(
      { _id: proposal.linkedEventId },
      { $set: { proposalId: proposal._id } },
    );
  }
};

const timelineItems = (prefix, startIso) => [
  {
    title: `${prefix} - Kickoff`,
    description: 'Khởi động kế hoạch, truyền thông và phân công nhân sự.',
    plannedDate: dateAt(startIso, 8, 30),
    plannedEndDate: dateAt(startIso, 10, 30),
    category: 'Workshop',
    location: 'Phòng 305',
    expectedAttendees: 80,
  },
  {
    title: `${prefix} - Main Event`,
    description: 'Hoạt động chính trong kế hoạch kỳ học.',
    plannedDate: dateAt(startIso, 14, 0),
    plannedEndDate: dateAt(startIso, 16, 30),
    category: 'Kết nối',
    location: 'Hội trường Alpha',
    expectedAttendees: 120,
  },
];

const createTimelines = async (users, club) => ClubSemesterTimeline.insertMany([
  {
    ownerType: 'icpdp',
    ownerLabel: 'ICPDP',
    semesterTerm: 'fall',
    semesterYear: 2027,
    semesterLabel: 'ICPDP Demo Fall 2027',
    summary: `Timeline demo ICPDP chờ Admin duyệt (${RUN_TAG}).`,
    objectives: 'Điều phối hoạt động học thuật cấp đơn vị.',
    items: timelineItems('ICPDP Fall 2027', '2027-08-18'),
    status: 'pending_admin',
    submittedByEmail: users.icpdp.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'icpdp',
    ownerLabel: 'ICPDP',
    semesterTerm: 'spring',
    semesterYear: 2027,
    semesterLabel: 'ICPDP Demo Spring 2027',
    summary: `Timeline demo ICPDP chờ Admin duyệt (${RUN_TAG}).`,
    objectives: 'Chuẩn bị chuỗi hoạt động học thuật đầu năm.',
    items: timelineItems('ICPDP Spring 2027', '2027-01-15'),
    status: 'pending_admin',
    submittedByEmail: users.icpdp.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'ctsv',
    ownerLabel: 'CTSV',
    semesterTerm: 'fall',
    semesterYear: 2026,
    semesterLabel: 'CTSV Demo Fall 2026',
    summary: `Timeline demo CTSV chờ Admin duyệt (${RUN_TAG}).`,
    objectives: 'Điều phối hoạt động công tác sinh viên cấp trường.',
    items: timelineItems('CTSV Fall 2026', '2026-08-19'),
    status: 'pending_admin',
    submittedByEmail: users.ctsv.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'ctsv',
    ownerLabel: 'CTSV',
    semesterTerm: 'spring',
    semesterYear: 2027,
    semesterLabel: 'CTSV Demo Spring 2027',
    summary: `Timeline demo CTSV chờ Admin duyệt (${RUN_TAG}).`,
    objectives: 'Chuẩn bị chuỗi hoạt động công tác sinh viên đầu năm.',
    items: timelineItems('CTSV Spring 2027', '2027-01-16'),
    status: 'pending_admin',
    submittedByEmail: users.ctsv.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'club',
    ownerLabel: club.name,
    clubId: club._id,
    clubName: club.name,
    clubSlug: club.slug,
    semesterTerm: 'fall',
    semesterYear: 2027,
    semesterLabel: 'Fever Demo Fall 2027',
    summary: `Timeline demo CLB Fever chờ ICPDP duyệt (${RUN_TAG}).`,
    objectives: 'Tổ chức chuỗi hoạt động âm nhạc và biểu diễn.',
    items: timelineItems('Fever Fall 2027', '2027-09-11'),
    status: 'pending_icpdp',
    submittedByEmail: users.fever.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'club',
    ownerLabel: club.name,
    clubId: club._id,
    clubName: club.name,
    clubSlug: club.slug,
    semesterTerm: 'spring',
    semesterYear: 2027,
    semesterLabel: 'Fever Demo Spring 2027',
    summary: `Timeline demo CLB Fever chờ ICPDP duyệt (${RUN_TAG}).`,
    objectives: 'Chuẩn bị sân chơi nghệ thuật đầu năm.',
    items: timelineItems('Fever Spring 2027', '2027-02-20'),
    status: 'pending_icpdp',
    submittedByEmail: users.fever.email,
    submittedAt: new Date(),
  },
  {
    ownerType: 'club',
    ownerLabel: club.name,
    clubId: club._id,
    clubName: club.name,
    clubSlug: club.slug,
    semesterTerm: 'summer',
    semesterYear: 2027,
    semesterLabel: 'Fever Demo Summer 2027',
    summary: `Timeline demo CLB Fever đã qua ICPDP, chờ Admin duyệt (${RUN_TAG}).`,
    objectives: 'Tổng hợp hoạt động hè và showcase cuối kỳ.',
    items: timelineItems('Fever Summer 2027', '2027-06-18'),
    status: 'pending_admin',
    submittedByEmail: users.fever.email,
    submittedAt: new Date(),
    icpdpNote: 'IC-PDP đã duyệt sơ bộ, chuyển Admin duyệt cuối.',
  },
]);

const createPartnerRows = async () => {
  const rows = [
    { index: 0, status: 'pending', title: partnerTitles[0], date: '2026-10-08' },
    { index: 1, status: 'pending', title: partnerTitles[1], date: '2026-10-15' },
    { index: 2, status: 'pending_admin', title: partnerTitles[2], date: '2026-10-22' },
  ];

  for (const row of rows) {
    const partner = await Partner.create({
      name: 'Công ty TNHH Endfields',
      email: ACCOUNTS.partner.email,
      phone: `09090010${row.index}`,
      representative: 'Nguyễn Minh Anh',
      representativeTitle: 'Partnership Manager',
      address: 'Tòa nhà Endfields, Đà Nẵng',
      description: `Hồ sơ demo Endfields (${RUN_TAG}).`,
      partnerCode: partnerCodes[row.index],
      category: 'Công nghệ & Tuyển dụng',
      proposedEventTitle: row.title,
      expectedSponsorAmount: row.index === 2 ? 90000000 : 60000000,
      benefits: ['Logo trên backdrop', 'Gian hàng tư vấn', 'Bài truyền thông sau sự kiện'],
      status: row.status,
      ctsvApprovedByEmail: row.status === 'pending_admin' ? ACCOUNTS.ctsv.email : '',
      ctsvApprovedAt: row.status === 'pending_admin' ? new Date() : null,
    });

    await PartnerMember.findOneAndUpdate(
      { partnerId: partner._id, email: ACCOUNTS.partner.email },
      {
        $set: {
          partnerId: partner._id,
          email: ACCOUNTS.partner.email,
          fullname: ACCOUNTS.partner.fullname,
          role: 'owner',
          isPrimary: true,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const startDate = dateAt(row.date, 9, 0);
    await PartnerEventRequest.create({
      partnerEmail: ACCOUNTS.partner.email,
      partnerId: partner._id,
      status: 'pending',
      companyName: partner.name,
      partnerCode: partner.partnerCode,
      representative: partner.representative,
      representativeTitle: partner.representativeTitle,
      phone: partner.phone,
      address: partner.address,
      category: partner.category,
      expectedSponsorAmount: partner.expectedSponsorAmount,
      benefits: partner.benefits,
      title: row.title,
      eventType: 'Hội thảo & Workshop',
      description: `${row.title} - đơn sự kiện demo Partner Endfields (${RUN_TAG}).`,
      registrationStartDate: new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      location: row.index === 2 ? 'Hội trường Gamma' : 'Không gian doanh nghiệp',
      campus: 'FPT University Da Nang',
      expectedAttendees: 150,
      totalTickets: 150,
      ticketTypes: baseTickets(150, 0),
      image: img.career,
      submittedAt: new Date(),
    });
  }
};

const cleanup = async () => {
  await Event.deleteMany({ description: RUN_TAG_REGEX });
  await EventProposal.deleteMany({ description: RUN_TAG_REGEX });
  await ClubSemesterTimeline.deleteMany({ summary: RUN_TAG_REGEX });
  await PartnerEventRequest.deleteMany({ description: RUN_TAG_REGEX });
  const oldPartners = await Partner.find({ description: RUN_TAG_REGEX }).select('_id').lean();
  await PartnerMember.deleteMany({ partnerId: { $in: oldPartners.map((p) => p._id) } });
  await Partner.deleteMany({ description: RUN_TAG_REGEX });
};

const printSummary = async () => {
  const [
    schoolIcpdpEvents,
    schoolCtsvEvents,
    feverEventIcpdp,
    feverEventAdmin,
    endfieldsCtsv,
    endfieldsAdmin,
    icpdpTimelineAdmin,
    ctsvTimelineAdmin,
    feverTimelineIcpdp,
    feverTimelineAdmin,
  ] = await Promise.all([
    Event.countDocuments({ title: /^ICPDP Demo -/, source: 'school', schoolOrganizerRole: 'icpdp', status: 'pending_admin' }),
    Event.countDocuments({ title: /^CTSV Demo -/, source: 'school', schoolOrganizerRole: 'ctsv', status: 'pending_admin' }),
    EventProposal.countDocuments({ title: /^Fever Demo -/, status: 'pending_icpdp' }),
    EventProposal.countDocuments({ title: /^Fever Demo -/, status: 'pending_admin' }),
    Partner.countDocuments({ partnerCode: { $in: partnerCodes }, status: 'pending' }),
    Partner.countDocuments({ partnerCode: { $in: partnerCodes }, status: 'pending_admin' }),
    ClubSemesterTimeline.countDocuments({ semesterLabel: /^ICPDP Demo /, status: 'pending_admin' }),
    ClubSemesterTimeline.countDocuments({ semesterLabel: /^CTSV Demo /, status: 'pending_admin' }),
    ClubSemesterTimeline.countDocuments({ semesterLabel: /^Fever Demo /, status: 'pending_icpdp' }),
    ClubSemesterTimeline.countDocuments({ semesterLabel: /^Fever Demo /, status: 'pending_admin' }),
  ]);

  console.log('\nSeed presentation demo complete.');
  console.log(`Password chung cho tài khoản demo: ${DEFAULT_PASSWORD}`);
  console.log('\nĐơn sự kiện:');
  console.log(`- ICPDP chờ Admin duyệt: ${schoolIcpdpEvents}/2`);
  console.log(`- CTSV chờ Admin duyệt: ${schoolCtsvEvents}/2`);
  console.log(`- CLB Fever chờ ICPDP duyệt: ${feverEventIcpdp}/2`);
  console.log(`- CLB Fever chờ Admin duyệt: ${feverEventAdmin}/1`);
  console.log(`- Partner Endfields chờ CTSV duyệt: ${endfieldsCtsv}/2`);
  console.log(`- Partner Endfields chờ Admin duyệt: ${endfieldsAdmin}/1`);
  console.log('\nĐơn timeline:');
  console.log(`- ICPDP chờ Admin duyệt: ${icpdpTimelineAdmin}/2`);
  console.log(`- CTSV chờ Admin duyệt: ${ctsvTimelineAdmin}/2`);
  console.log(`- CLB Fever chờ ICPDP duyệt: ${feverTimelineIcpdp}/2`);
  console.log(`- CLB Fever chờ Admin duyệt: ${feverTimelineAdmin}/1`);
};

const main = async () => {
  await connectDB();
  await cleanup();
  const users = await ensureAccounts();
  const feverClub = await ensureFeverClub(users.fever);
  await createSchoolEvents(users);
  await createClubEventsAndProposals(users, feverClub);
  await createTimelines(users, feverClub);
  await createPartnerRows();
  await printSummary();
};

main()
  .catch((error) => {
    console.error('seed-presentation-demo error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close(false).catch(() => {});
  });
