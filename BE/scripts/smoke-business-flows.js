/**
 * Smoke test các luồng nghiệp vụ đã chỉnh (API).
 * Chạy: node scripts/smoke-business-flows.js
 * Yêu cầu: BE đang chạy tại http://localhost:5000, MongoDB kết nối được.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Club = require('../src/models/Club');
const ClubRegistration = require('../src/models/ClubRegistration');
const ClubSemesterTimeline = require('../src/models/ClubSemesterTimeline');
const Event = require('../src/models/Event');
const EventProposal = require('../src/models/EventProposal');
const Partner = require('../src/models/Partner');
const SubmittedCtsvReport = require('../src/models/SubmittedCtsvReport');

const BASE = process.env.SMOKE_API_BASE || 'http://localhost:5000/api';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Test@2026';
const RUN_ID = Date.now();

const ACCOUNTS = {
  admin: 'admin.test@fpt.edu.vn',
  ctsv: 'ctsv.test@fpt.edu.vn',
  icpdp: 'icpdp.test@fpt.edu.vn',
  partner: 'partner.test@fpt.edu.vn',
  club: 'club.test@fpt.edu.vn',
  student: 'student.test@fpt.edu.vn',
};

const results = [];

const log = (icon, name, detail = '') => {
  const line = detail ? `${icon} ${name} — ${detail}` : `${icon} ${name}`;
  console.log(line);
  results.push({ icon, name, detail });
};

const fail = (name, detail) => {
  log('❌', name, detail);
  throw new Error(detail || name);
};

const pass = (name, detail = '') => log('✅', name, detail);

async function api(method, path, { token, body, headers = {}, expectStatus } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (expectStatus !== undefined && res.status !== expectStatus) {
    const msg = data?.message || data?.raw || res.statusText;
    throw new Error(`expected HTTP ${expectStatus}, got ${res.status}: ${msg}`);
  }

  return { status: res.status, data };
}

async function login(email) {
  const { data } = await api('POST', '/auth/login', {
    body: { email, password: PASSWORD },
    expectStatus: 200,
  });
  if (!data?.token) throw new Error(`login ${email}: missing token`);
  return data.token;
}

async function setupData() {
  await connectDB();

  const clubUser = await User.findOne({ email: ACCOUNTS.club });
  const student = await User.findOne({ email: ACCOUNTS.student });
  if (!clubUser || !student) {
    throw new Error('Thiếu tài khoản test. Chạy: node seed-all-roles.js');
  }

  const club = await Club.findOne({ slug: 'f-soft-club' });
  if (!club) {
    throw new Error('Thiếu CLB f-soft-club. Chạy: node seed-clubs.js');
  }

  club.managedBy = clubUser._id;
  await club.save();

  await ClubSemesterTimeline.deleteMany({
    clubId: club._id,
    semesterYear: 2099,
  });

  return { club, clubUser, student };
}

async function ensurePartnerEndedEvent() {
  const partner = await Partner.findOne({ email: ACCOUNTS.partner });
  if (!partner) throw new Error('Thiếu partner.test profile');

  const title = `Smoke Partner Event ${RUN_ID}`;
  let event = await Event.findOne({ title, source: 'partner' });
  if (!event) {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const pastEnd = new Date();
    pastEnd.setDate(pastEnd.getDate() - 1);

    event = await Event.create({
      title,
      description: 'Smoke test partner report',
      category: 'Khác',
      registrationStartDate: past,
      registrationEndDate: pastEnd,
      startDate: past,
      endDate: pastEnd,
      location: 'Sảnh tòa Gamma',
      capacity: 50,
      totalTickets: 50,
      ticketPrice: 0,
      registeredCount: 10,
      eventState: 'active',
      source: 'partner',
      partnerId: partner._id,
      status: 'approved',
      createdByEmail: ACCOUNTS.ctsv,
    });
  }

  await SubmittedCtsvReport.deleteOne({ reportId: String(event._id) });
  return event;
}

async function run() {
  console.log('==================================================');
  console.log('Smoke test — luồng nghiệp vụ F-Events');
  console.log(`API: ${BASE}`);
  console.log('==================================================\n');

  const health = await fetch(`${BASE.replace('/api', '')}/`);
  if (!health.ok) fail('Server health', `HTTP ${health.status}`);
  pass('Server health', await health.text());

  const tokens = {};
  for (const [role, email] of Object.entries(ACCOUNTS)) {
    tokens[role] = await login(email);
    pass(`Login ${role}`, email);
  }

  const { club } = await setupData();
  pass('Setup CLB quản lý', `club.test → ${club.name}`);

  // 1. Join CLB bị chặn, follow vẫn hoạt động
  await api('POST', `/clubs/${club._id}/join`, {
    token: tokens.student,
    body: { note: 'smoke' },
    expectStatus: 403,
  });
  pass('Student join CLB bị chặn (403)');

  try {
    await api('POST', `/clubs/${club._id}/follow`, {
      token: tokens.student,
      expectStatus: 201,
    });
    pass('Student follow CLB thành công');
  } catch (err) {
    if (String(err.message).includes('409')) {
      pass('Student follow CLB (đã follow từ trước)');
    } else {
      throw err;
    }
  }

  // 2. Thành lập CLB: Student → IC-PDP → Admin
  const regName = `Smoke Club ${RUN_ID}`;
  const createReg = await api('POST', '/clubs/registrations', {
    token: tokens.student,
    body: {
      clubName: regName,
      category: 'Công nghệ',
      description: 'Smoke test club registration flow',
      president: 'Smoke President',
      presidentEmail: ACCOUNTS.student,
      activityField: 'Tech',
      scale: '10-20',
      logoText: 'SC',
      logoColor: '#7c3aed',
    },
    expectStatus: 201,
  });
  const regId = createReg.data?.registration?.id;
  if (!regId) fail('Tạo đơn thành lập CLB', 'missing registration id');
  pass('Student gửi đơn thành lập CLB', regName);

  await api('PATCH', `/admin/club-registrations/${regId}/approve`, {
    token: tokens.icpdp,
    expectStatus: 403,
  });
  pass('IC-PDP không duyệt cuối đơn CLB (403)');

  const forward = await api('PATCH', `/admin/club-registrations/${regId}/forward-admin`, {
    token: tokens.icpdp,
    body: { note: 'smoke forward' },
    expectStatus: 200,
  });
  if (forward.data?.registration?.statusKey !== 'pending_admin') {
    fail('IC-PDP chuyển Admin', `status=${forward.data?.registration?.statusKey}`);
  }
  pass('IC-PDP chuyển Admin → pending_admin');

  const approveReg = await api('PATCH', `/admin/club-registrations/${regId}/approve`, {
    token: tokens.admin,
    body: { note: 'smoke approve' },
    expectStatus: 200,
  });
  if (approveReg.data?.registration?.statusKey !== 'approved') {
    fail('Admin duyệt đơn CLB', `status=${approveReg.data?.registration?.statusKey}`);
  }
  pass('Admin duyệt cuối đơn CLB → approved');

  // 3. Timeline kỳ: CLB → IC-PDP → Admin
  const managed = await api('GET', '/clubs/manage/clubs', {
    token: tokens.club,
    expectStatus: 200,
  });
  const managedClubId = managed.data?.activeClub?.id || managed.data?.clubs?.[0]?.id || String(club._id);

  const timelineCreate = await api('POST', '/clubs/manage/semester-timelines', {
    token: tokens.club,
    headers: { 'x-managed-club-id': managedClubId },
    body: {
      semesterTerm: 'spring',
      semesterYear: 2099,
      items: [{ title: 'Workshop smoke', category: 'Workshop', expectedAttendees: 30 }],
    },
    expectStatus: 201,
  });
  const timelineId = timelineCreate.data?.timeline?.id;
  if (!timelineId) fail('Tạo timeline', 'missing id');
  pass('Club manager tạo timeline draft', 'Spring 2099');

  await api('POST', '/events', {
    token: tokens.club,
    headers: { 'x-managed-club-id': managedClubId },
    body: {
      title: `Smoke Event No Timeline ${RUN_ID}`,
      registrationStartDate: new Date().toISOString(),
      startDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 14 + 7200000).toISOString(),
      location: 'Phòng học CLB',
      capacity: 50,
      category: 'Workshop',
    },
    expectStatus: 400,
  });
  pass('Tạo SK CLB bị chặn khi chưa có timeline approved');

  await api('POST', `/clubs/manage/semester-timelines/${timelineId}/submit`, {
    token: tokens.club,
    headers: { 'x-managed-club-id': managedClubId },
    expectStatus: 200,
  });
  pass('Club manager gửi timeline → pending_icpdp');

  const icpdpTimeline = await api('PATCH', `/ctsv/semester-timelines/${timelineId}/icpdp-approve`, {
    token: tokens.icpdp,
    body: { note: 'smoke' },
    expectStatus: 200,
  });
  if (icpdpTimeline.data?.timeline?.statusKey !== 'pending_admin') {
    fail('IC-PDP duyệt timeline', `status=${icpdpTimeline.data?.timeline?.statusKey}`);
  }
  pass('IC-PDP chuyển timeline → pending_admin');

  const adminTimeline = await api('PATCH', `/ctsv/semester-timelines/${timelineId}/admin-approve`, {
    token: tokens.admin,
    body: { note: 'smoke admin' },
    expectStatus: 200,
  });
  if (adminTimeline.data?.timeline?.statusKey !== 'approved') {
    fail('Admin duyệt timeline', `status=${adminTimeline.data?.timeline?.statusKey}`);
  }
  pass('Admin duyệt timeline → approved');

  const eventCreate = await api('POST', '/events', {
    token: tokens.club,
    headers: { 'x-managed-club-id': managedClubId },
    body: {
      title: `Smoke Club Event ${RUN_ID}`,
      registrationStartDate: new Date().toISOString(),
      startDate: new Date(Date.now() + 86400000 * 21).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 21 + 7200000).toISOString(),
      location: 'Phòng học CLB',
      capacity: 50,
      category: 'Workshop',
    },
    expectStatus: 201,
  });
  const clubEventId = eventCreate.data?.event?._id || eventCreate.data?.event?.id;
  if (!clubEventId) fail('Tạo SK CLB sau timeline approved', 'missing event id');
  pass('Tạo SK CLB sau timeline approved', String(clubEventId));

  // 4. SK CLB: CTSV không duyệt, chỉ Admin
  await api('PATCH', `/ctsv/events/${clubEventId}/approve`, {
    token: tokens.ctsv,
    expectStatus: 403,
  });
  pass('CTSV không duyệt SK CLB (403)');

  const icpdpEvent = await api('PATCH', `/ctsv/proposals/${eventCreate.data?.event?.proposalId || ''}/icpdp-approve`, {
    token: tokens.icpdp,
    body: { note: 'smoke' },
    expectStatus: 200,
  }).catch(async () => {
    const proposal = await EventProposal.findOne({ linkedEventId: clubEventId });
    if (!proposal) throw new Error('Không tìm thấy proposal liên kết SK CLB');
    return api('PATCH', `/ctsv/proposals/${proposal._id}/icpdp-approve`, {
      token: tokens.icpdp,
      body: { note: 'smoke' },
      expectStatus: 200,
    });
  });

  const proposalId = icpdpEvent.data?.proposal?.id;
  if (icpdpEvent.data?.proposal?.statusKey !== 'pending_admin') {
    fail('IC-PDP duyệt đề xuất SK CLB', `status=${icpdpEvent.data?.proposal?.statusKey}`);
  }
  pass('IC-PDP chuyển đề xuất SK CLB → pending_admin');

  await api('PATCH', `/ctsv/proposals/${proposalId}/approve`, {
    token: tokens.ctsv,
    expectStatus: 403,
  });
  pass('CTSV không duyệt cuối đề xuất CLB (403)');

  const adminEventApprove = await api('PATCH', `/ctsv/events/${clubEventId}/approve`, {
    token: tokens.admin,
    body: { note: 'smoke admin' },
    expectStatus: 200,
  });
  if (adminEventApprove.data?.event?.statusKey !== 'approved') {
    fail('Admin duyệt SK CLB', `statusKey=${adminEventApprove.data?.event?.statusKey}`);
  }
  pass('Admin duyệt cuối SK CLB → approved');

  // 5. Moderation SK trường: CTSV gửi → Admin xử lý
  let schoolEvent = await Event.findOne({ source: 'school', status: 'approved', eventState: 'active' });
  if (!schoolEvent) {
    const future = new Date(Date.now() + 86400000 * 30);
    schoolEvent = await Event.create({
      title: `Smoke School Event ${RUN_ID}`,
      description: 'Moderation smoke',
      category: 'Khác',
      registrationStartDate: new Date(),
      registrationEndDate: future,
      startDate: future,
      endDate: new Date(future.getTime() + 7200000),
      location: 'Sảnh tòa Gamma',
      capacity: 100,
      totalTickets: 100,
      ticketPrice: 0,
      registeredCount: 0,
      eventState: 'active',
      source: 'school',
      status: 'approved',
      createdByEmail: ACCOUNTS.ctsv,
    });
  }

  const modReq = await api('PATCH', `/ctsv/events/${schoolEvent._id}/moderation`, {
    token: tokens.ctsv,
    body: { action: 'cancel', reason: 'Smoke test moderation flow' },
    expectStatus: 200,
  });
  if (!String(modReq.data?.event?.statusKey || modReq.data?.event?.status || '').includes('pending')) {
    fail('CTSV gửi moderation', `statusKey=${modReq.data?.event?.statusKey}`);
  }
  pass('CTSV gửi yêu cầu hủy SK trường → chờ Admin');

  const modList = await api('GET', '/admin/school-events/moderation', {
    token: tokens.admin,
    expectStatus: 200,
  });
  const foundMod = (modList.data?.events || []).some((e) => String(e.id || e._id) === String(schoolEvent._id));
  if (!foundMod) fail('Admin thấy yêu cầu moderation', 'event not in list');
  pass('Admin nhận danh sách moderation SK trường');

  // 6. Báo cáo SK đối tác: CTSV → Partner + Admin
  const partnerEvent = await ensurePartnerEndedEvent();
  const submitReport = await api('POST', `/ctsv/reports/${partnerEvent._id}/submit-admin`, {
    token: tokens.ctsv,
    expectStatus: 200,
  });
  if (!submitReport.data?.sentToPartner || !submitReport.data?.sentToAdmin) {
    fail('Gửi báo cáo đối tác', JSON.stringify(submitReport.data));
  }
  pass('CTSV gửi báo cáo SK đối tác → Partner + Admin');

  const partnerReports = await api('GET', '/partner/reports', {
    token: tokens.partner,
    expectStatus: 200,
  });
  const partnerHas = (partnerReports.data?.reports || []).some(
    (r) => String(r.id || r.reportId) === String(partnerEvent._id),
  );
  if (!partnerHas) fail('Partner xem báo cáo', 'report not visible');
  pass('Partner nhận báo cáo đã gửi');

  const passed = results.filter((r) => r.icon === '✅').length;
  const failed = results.filter((r) => r.icon === '❌').length;

  console.log('\n==================================================');
  console.log(`Kết quả: ${passed} passed, ${failed} failed`);
  console.log('==================================================');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n💥 Smoke test dừng:', err.message);
  process.exit(1);
});
