const EventReminder = require('../models/EventReminder');
const Event = require('../models/Event');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { APP_URL } = require('../config/env');
const {
  sendReminderSignupEmail,
  sendRegistrationOpeningSoonEmail,
  sendEventStartingSoonEmail,
} = require('./email.service');
const { fetchCurrentWeather } = require('./weather.service');
const { SCHOOL_EVENT_PUBLIC_STATUSES } = require('../constants/eventWorkflow');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REG_OPEN_LEAD_MS = 5 * 60 * 1000; // 5 phút trước khi mở đăng ký
const EVENT_SOON_LEAD_MS = 6 * 60 * 60 * 1000; // 6 tiếng trước khi diễn ra

const eventUrlFor = (id) => `${APP_URL}/events/${id}`;

/** Sinh checklist "nên mang theo" theo thời tiết hiện tại. */
const buildWeatherPrep = (weather) => {
  if (!weather) {
    return {
      advice: 'Theo dõi dự báo thời tiết và chuẩn bị trang phục phù hợp trước khi đi.',
      checklist: ['Thẻ sinh viên / giấy tờ tùy thân', 'Điện thoại đã sạc đầy', 'Chai nước cá nhân', 'Áo khoác nhẹ phòng thời tiết thay đổi'],
    };
  }
  const main = String(weather.main || '').toLowerCase();
  const temp = Number(weather.temp) || 0;
  const checklist = [];
  let advice = '';

  if (main.includes('thunder')) {
    advice = 'Có giông sét — ưu tiên di chuyển trong nhà và tránh khu vực trống khi ngoài trời.';
    checklist.push('Áo mưa hoặc ô dù chắc chắn', 'Giày chống nước', 'Túi chống nước cho điện thoại, giấy tờ');
  } else if (main.includes('rain') || main.includes('drizzle')) {
    advice = 'Trời có mưa — mang theo đồ che mưa và đến sớm để tránh ướt.';
    checklist.push('Áo mưa hoặc ô dù', 'Giày/dép chống trơn trượt', 'Túi chống nước cho đồ điện tử');
  } else if (main.includes('clear')) {
    advice = temp >= 32
      ? 'Trời nắng gắt — che chắn kỹ và uống đủ nước để tránh mất sức.'
      : 'Trời nắng đẹp — vẫn nên che nắng nhẹ khi ở ngoài trời lâu.';
    checklist.push('Nón/mũ rộng vành', 'Kem chống nắng', 'Chai nước cá nhân');
    if (temp >= 32) checklist.push('Kính râm', 'Khăn thấm mồ hôi');
  } else if (main.includes('cloud')) {
    advice = 'Trời nhiều mây, dịu mát — thời tiết thuận lợi cho các hoạt động.';
    checklist.push('Áo khoác mỏng phòng khi trở gió', 'Chai nước cá nhân');
  } else {
    advice = 'Kiểm tra dự báo và chuẩn bị trang phục phù hợp trước khi đi.';
    checklist.push('Áo khoác nhẹ', 'Chai nước cá nhân');
  }

  if (temp && temp <= 20) checklist.push('Áo ấm (trời khá lạnh)');
  return { advice, checklist };
};

/** Sinh viên/khách bấm "Nhắc tôi khi mở đăng ký". */
const subscribeReminder = async ({ eventId, email, user }) => {
  const cleanEmail = String(email || user?.email || '').trim().toLowerCase();
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    throw new AppError('Vui lòng nhập email hợp lệ để nhận nhắc.', 400);
  }

  const event = await Event.findById(eventId).lean();
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);

  const isPublic = SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) && event.isHidden !== true;
  if (!isPublic) throw new AppError('Sự kiện chưa được công khai.', 400);

  const regStart = event.registrationStartDate ? new Date(event.registrationStartDate) : null;
  if (!regStart || Number.isNaN(regStart.getTime()) || Date.now() >= regStart.getTime()) {
    throw new AppError('Sự kiện đã mở đăng ký — bạn có thể đăng ký trực tiếp.', 400);
  }

  const existing = await EventReminder.findOne({ event: eventId, email: cleanEmail });
  if (existing) {
    return { alreadySubscribed: true, message: 'Bạn đã đặt nhắc cho sự kiện này rồi.' };
  }

  const reminder = await EventReminder.create({
    event: eventId,
    email: cleanEmail,
    userId: user?._id || null,
    fullname: user?.fullname || '',
    registrationStartDate: regStart,
    eventStartDate: event.startDate || null,
    sentSignup: true,
  });

  // Gửi mail xác nhận (nền — không chặn response).
  sendReminderSignupEmail({
    to: cleanEmail,
    fullname: reminder.fullname,
    eventTitle: event.title,
    eventStart: event.startDate,
    eventEnd: event.endDate,
    location: event.location || event.campus || '',
    registrationStart: regStart,
    eventUrl: eventUrlFor(eventId),
  }).catch((err) => console.error('[Reminder] sendReminderSignupEmail:', err.message));

  return { alreadySubscribed: false, message: 'Đã đặt nhắc — kiểm tra email của bạn nhé.' };
};

const getReminderStatus = async ({ eventId, email, user }) => {
  const cleanEmail = String(email || user?.email || '').trim().toLowerCase();
  if (!cleanEmail) return { subscribed: false };
  const existing = await EventReminder.findOne({ event: eventId, email: cleanEmail }).lean();
  return { subscribed: Boolean(existing) };
};

/** Gửi các mail nhắc trước khi mở đăng ký 5 phút. */
const runRegOpenReminders = async (now) => {
  const due = await EventReminder.find({
    sentRegOpen: false,
    registrationStartDate: { $ne: null, $lte: new Date(now.getTime() + REG_OPEN_LEAD_MS) },
  })
    .limit(200)
    .lean();

  for (const r of due) {
    const regStart = new Date(r.registrationStartDate);
    // Bỏ qua nếu đã mở quá lâu (>15 phút) — coi như lỡ, tránh spam mail trễ.
    if (now.getTime() - regStart.getTime() > 15 * 60 * 1000) {
      await EventReminder.updateOne({ _id: r._id }, { sentRegOpen: true });
      continue;
    }
    const minutesLeft = Math.max(0, Math.round((regStart.getTime() - now.getTime()) / 60000));
    try {
      await sendRegistrationOpeningSoonEmail({
        to: r.email,
        fullname: r.fullname,
        eventTitle: (await Event.findById(r.event).select('title').lean())?.title || 'Sự kiện',
        registrationStart: regStart,
        minutesLeft,
        eventUrl: eventUrlFor(r.event),
      });
      await EventReminder.updateOne({ _id: r._id }, { sentRegOpen: true });
    } catch (err) {
      console.error('[Reminder] regOpen mail:', r.email, err.message);
    }
  }
};

/** Gửi các mail "sắp diễn ra" trước 6 tiếng, kèm gợi ý theo thời tiết. */
const runEventSoonReminders = async (now) => {
  const due = await EventReminder.find({
    sentEventSoon: false,
    eventStartDate: { $ne: null, $gt: now, $lte: new Date(now.getTime() + EVENT_SOON_LEAD_MS) },
  })
    .limit(200)
    .lean();

  if (!due.length) return;

  let weather = null;
  try {
    weather = await fetchCurrentWeather();
  } catch (err) {
    console.error('[Reminder] fetchCurrentWeather:', err.message);
  }
  const { advice, checklist } = buildWeatherPrep(weather);

  for (const r of due) {
    try {
      const event = await Event.findById(r.event).select('title startDate endDate location campus').lean();
      if (!event) {
        await EventReminder.updateOne({ _id: r._id }, { sentEventSoon: true });
        continue;
      }
      await sendEventStartingSoonEmail({
        to: r.email,
        fullname: r.fullname,
        eventTitle: event.title,
        eventStart: event.startDate,
        eventEnd: event.endDate,
        location: event.location || event.campus || '',
        weather,
        weatherAdvice: advice,
        checklist,
        eventUrl: eventUrlFor(r.event),
      });
      await EventReminder.updateOne({ _id: r._id }, { sentEventSoon: true });
    } catch (err) {
      console.error('[Reminder] eventSoon mail:', r.email, err.message);
    }
  }
};

let running = false;
const runReminderJobs = async () => {
  if (running) return; // tránh chồng lấn nếu lần trước chưa xong
  running = true;
  const now = new Date();
  try {
    await runRegOpenReminders(now);
    await runEventSoonReminders(now);
  } catch (err) {
    console.error('[Reminder] runReminderJobs:', err.message);
  } finally {
    running = false;
  }
};

module.exports = {
  subscribeReminder,
  getReminderStatus,
  runReminderJobs,
  buildWeatherPrep,
};
