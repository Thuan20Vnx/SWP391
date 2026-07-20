/**
 * Kiểm chứng chống race condition khi giành chỗ sự kiện.
 *
 * Kịch bản: tạo sự kiện chỉ còn ĐÚNG 1 chỗ, rồi bắn N request đăng ký/mua vé
 * đồng thời. Hệ thống đúng phải cho chính xác 1 request thành công.
 *
 * Trước khi sửa, luồng đăng ký đọc registeredCount rồi mới ghi ở lệnh khác nên
 * nhiều request cùng lọt qua kiểm tra "còn chỗ" và cùng ghi -> bán vượt.
 *
 * Cách chạy:  node scripts/test-registration-race.js [--concurrency=50]
 * Script tự dọn toàn bộ dữ liệu tạm sau khi chạy.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Event = require('../src/models/Event');
const EventRegistration = require('../src/models/EventRegistration');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');

const { registerForEvent } = require('../src/services/registration.service');
const { createEventTicketPayment } = require('../src/services/payment.service');
const { getPaymentSettings } = require('../src/services/systemSettings.service');

const TAG = 'racetest';
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(2, Number(concurrencyArg?.split('=')[1]) || 50);

const createUsers = async (count) =>
  User.insertMany(
    Array.from({ length: count }, (_, i) => ({
      fullname: `Race Test User ${i}`,
      email: `${TAG}.user${i}.${Date.now()}@example.test`,
      role: 'guest',
    })),
  );

const createEvent = async (ticketPrice) =>
  Event.create({
    title: `[${TAG}] Sự kiện kiểm thử tranh chấp chỗ`,
    description: 'Dữ liệu tạm do scripts/test-registration-race.js sinh ra.',
    status: 'approved',
    capacity: 1,
    registeredCount: 0,
    reservedCount: 0,
    ticketPrice,
    startDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 3600 * 1000),
    location: 'Test',
  });

const summarize = (results) => {
  const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
  const reasons = {};
  for (const r of results) {
    if (r.status !== 'rejected') continue;
    const key = r.reason?.extra?.code || r.reason?.message || 'unknown';
    reasons[key] = (reasons[key] || 0) + 1;
  }
  return { fulfilled, reasons };
};

const printReasons = (reasons) => {
  for (const [reason, count] of Object.entries(reasons)) {
    console.log(`      ${count.toString().padStart(3)} × ${reason}`);
  }
};

/** Kịch bản 1: vé miễn phí — N người bấm đăng ký cùng lúc vào 1 chỗ cuối. */
const testFreeRegistrationRace = async () => {
  console.log(`\n[1] Vé miễn phí — ${CONCURRENCY} request đăng ký đồng thời, sức chứa = 1`);

  const event = await createEvent(0);
  const users = await createUsers(CONCURRENCY);

  // Bắn tất cả cùng lúc: không await tuần tự, để chúng thật sự chồng nhau.
  const results = await Promise.allSettled(
    users.map((user) => registerForEvent(user, String(event._id))),
  );

  const { fulfilled, reasons } = summarize(results);
  const fresh = await Event.findById(event._id).lean();
  const actualRegs = await EventRegistration.countDocuments({
    event: event._id,
    status: 'registered',
  });

  console.log(`    Thành công        : ${fulfilled}  (kỳ vọng 1)`);
  console.log(`    Bị từ chối        : ${CONCURRENCY - fulfilled}`);
  printReasons(reasons);
  console.log(`    registeredCount   : ${fresh.registeredCount}  (kỳ vọng 1)`);
  console.log(`    Bản ghi đăng ký   : ${actualRegs}  (kỳ vọng 1)`);

  // Counter phải khớp số bản ghi thật — lỗi cũ dùng Math.min làm counter dừng ở
  // capacity trong khi số bản ghi thực tế đã vượt, khiến oversell bị che giấu.
  const ok = fulfilled === 1 && fresh.registeredCount === 1 && actualRegs === 1;
  console.log(`    => ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  return ok;
};

/** Kịch bản 2: vé có phí — N người bấm mua cùng lúc, chỉ 1 người được giữ chỗ. */
const testPaidCheckoutRace = async () => {
  console.log(`\n[2] Vé có phí — ${CONCURRENCY} request checkout đồng thời, sức chứa = 1`);

  const settings = await getPaymentSettings();
  if (!settings.enabled || !settings.accountNumber || !settings.bankCode) {
    console.log('    BỎ QUA: thanh toán đang tắt hoặc chưa cấu hình tài khoản nhận tiền.');
    return null;
  }

  const event = await createEvent(50_000);
  const users = await createUsers(CONCURRENCY);

  const results = await Promise.allSettled(
    users.map((user) => createEventTicketPayment(user, String(event._id))),
  );

  const { fulfilled, reasons } = summarize(results);
  const fresh = await Event.findById(event._id).lean();
  const pendings = await Payment.countDocuments({ event: event._id, status: 'pending' });

  console.log(`    Tạo được đơn      : ${fulfilled}  (kỳ vọng 1)`);
  console.log(`    Bị từ chối        : ${CONCURRENCY - fulfilled}`);
  printReasons(reasons);
  console.log(`    reservedCount     : ${fresh.reservedCount}  (kỳ vọng 1)`);
  console.log(`    Đơn pending       : ${pendings}  (kỳ vọng 1)`);

  const ok = fulfilled === 1 && fresh.reservedCount === 1 && pendings === 1;
  console.log(`    => ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  return ok;
};

const cleanup = async () => {
  const events = await Event.find({ title: new RegExp(`^\\[${TAG}\\]`) }).select('_id');
  const eventIds = events.map((e) => e._id);

  await Promise.all([
    EventRegistration.deleteMany({ event: { $in: eventIds } }),
    Payment.deleteMany({ event: { $in: eventIds } }),
    Event.deleteMany({ _id: { $in: eventIds } }),
    User.deleteMany({ email: new RegExp(`^${TAG}\\.user`) }),
  ]);
};

const main = async () => {
  await connectDB();
  console.log('Kiểm chứng chống tranh chấp chỗ sự kiện');

  let results = [];
  try {
    results.push(await testFreeRegistrationRace());
    results.push(await testPaidCheckoutRace());
  } finally {
    await cleanup();
    console.log('\nĐã dọn dữ liệu tạm.');
  }

  const checked = results.filter((r) => r !== null);
  const passed = checked.every(Boolean);
  console.log(passed ? '\nTẤT CẢ ĐẠT' : '\nCÓ KỊCH BẢN KHÔNG ĐẠT');

  await mongoose.connection.close();
  process.exit(passed ? 0 : 1);
};

main().catch(async (err) => {
  console.error('\nScript lỗi:', err);
  try {
    await cleanup();
    await mongoose.connection.close();
  } catch {
    // bỏ qua lỗi khi dọn dẹp
  }
  process.exit(1);
});
