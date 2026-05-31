import fs from 'fs';
import path from 'path';

const projectRoot = 'c:/Users/Thuan/OneDrive/Documents/SWP391_Project/SWP391-1';
const extract = JSON.parse(
  fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-file-extract-results-7.json'), 'utf8')
);
const batches = JSON.parse(
  fs.readFileSync(path.join(projectRoot, '.understand-anything/intermediate/batches.json'), 'utf8')
);
const batch = batches.batches.find((b) => b.batchIndex === 7);
const { batchImportData } = batch;

const exportedFns = {
  'BE/src/services/auth.service.js': [
    'login', 'signup', 'verifyOtp', 'resendOtp', 'forgotPassword', 'resetPassword',
    'googleLogin', 'googleCallback', 'getGoogleCalendarAuthUrl', 'googleCalendarCallback',
  ],
  'BE/src/services/calendar.service.js': ['syncEventToGoogleCalendar', 'removeEventFromGoogleCalendar'],
  'BE/src/services/club.service.js': [
    'getClubs', 'getClubBySlug', 'followClub', 'unfollowClub', 'joinClub', 'cancelJoinClub',
    'approveMembership', 'getMyClubs',
  ],
  'BE/src/services/email.service.js': ['sendOtpEmail', 'sendResetEmail'],
  'BE/src/services/event.service.js': [
    'createEvent', 'getPendingEvents', 'updateEventStatus', 'getApprovedEvents', 'getEventById',
  ],
  'BE/src/services/registration.service.js': [
    'registerForEvent', 'cancelRegistration', 'getRegisteredEventIds', 'getMyEvents',
  ],
  'BE/src/services/review.service.js': ['getEventReviews', 'submitReview', 'isEligibleForReview'],
  'BE/src/utils/asyncHandler.js': ['asyncHandler'],
  'BE/src/utils/jwt.js': ['signToken', 'verifyToken'],
  'BE/src/utils/otpStore.js': ['generateOtp', 'isExpired'],
};

const exportedClasses = {
  'BE/src/utils/AppError.js': ['AppError'],
};

const fileMeta = {
  'BE/src/models/ClubMembership.js': {
    summary: 'Schema Mongoose mô tả quan hệ thành viên câu lạc bộ với trạng thái pending/member và mốc thời gian tham gia hoặc rời.',
    tags: ['data-model', 'mongoose', 'club', 'membership'],
    complexity: 'simple',
  },
  'BE/src/models/EventRegistration.js': {
    summary: 'Schema đăng ký sự kiện lưu user, event, trạng thái vé, giá và liên kết Google Calendar.',
    tags: ['data-model', 'mongoose', 'event', 'registration'],
    complexity: 'simple',
  },
  'BE/src/models/EventReview.js': {
    summary: 'Schema đánh giá sự kiện sau khi tham dự, gồm rating, comment và tham chiếu user/event.',
    tags: ['data-model', 'mongoose', 'event', 'review'],
    complexity: 'simple',
  },
  'BE/src/routes/auth.routes.js': {
    summary: 'Router Express cho đăng nhập, đăng ký OTP, quên mật khẩu, Google OAuth và ủy quyền Google Calendar.',
    tags: ['api-handler', 'routing', 'auth', 'express'],
    complexity: 'simple',
  },
  'BE/src/routes/club.routes.js': {
    summary: 'Router API câu lạc bộ: liệt kê, follow/unfollow, join/cancel và duyệt thành viên với middleware phân quyền.',
    tags: ['api-handler', 'routing', 'club', 'express'],
    complexity: 'moderate',
  },
  'BE/src/routes/event.routes.js': {
    summary: 'Router sự kiện cho tạo/duyệt sự kiện, đăng ký vé, hủy đăng ký và gửi đánh giá với auth linh hoạt.',
    tags: ['api-handler', 'routing', 'event', 'express'],
    complexity: 'moderate',
  },
  'BE/src/routes/index.js': {
    summary: 'Router gốc gắn các route con admin, auth, club, ctsv, event và user dưới prefix API.',
    tags: ['entry-point', 'routing', 'barrel', 'express'],
    complexity: 'simple',
  },
  'BE/src/routes/user.routes.js': {
    summary: 'Router profile người dùng và các endpoint câu lạc bộ/sự kiện cá nhân yêu cầu xác thực.',
    tags: ['api-handler', 'routing', 'user', 'express'],
    complexity: 'simple',
  },
  'BE/src/services/auth.service.js': {
    summary: 'Service xác thực backend: login/signup OTP, reset mật khẩu, Google login và liên kết Google Calendar.',
    tags: ['service', 'auth', 'otp', 'google-oauth'],
    complexity: 'complex',
    languageNotes: 'CommonJS service lớn kết hợp bcrypt, JWT, Google OAuth và store OTP in-memory.',
  },
  'BE/src/services/calendar.service.js': {
    summary: 'Đồng bộ và xóa sự kiện trên Google Calendar của user qua refresh token và REST API.',
    tags: ['service', 'google-calendar', 'integration', 'event'],
    complexity: 'moderate',
  },
  'BE/src/services/club.service.js': {
    summary: 'Logic nghiệp vụ câu lạc bộ: follow, join, duyệt thành viên, đếm follower và danh sách CLB của tôi.',
    tags: ['service', 'club', 'membership', 'follow'],
    complexity: 'complex',
  },
  'BE/src/services/email.service.js': {
    summary: 'Gửi email OTP đăng ký và reset mật khẩu bằng Nodemailer, có chế độ dev ghi OTP ra file.',
    tags: ['service', 'email', 'nodemailer', 'otp'],
    complexity: 'moderate',
  },
  'BE/src/services/event.service.js': {
    summary: 'Service sự kiện: tạo đề xuất, duyệt/từ chối, liệt kê sự kiện approved và chi tiết kèm trạng thái đăng ký.',
    tags: ['service', 'event', 'approval', 'pricing'],
    complexity: 'moderate',
  },
  'BE/src/services/registration.service.js': {
    summary: 'Đăng ký và hủy vé sự kiện, tính giá vé sinh viên, đồng bộ Google Calendar và trả danh sách sự kiện của tôi.',
    tags: ['service', 'registration', 'ticket', 'calendar'],
    complexity: 'moderate',
  },
  'BE/src/services/review.service.js': {
    summary: 'Quản lý đánh giá sự kiện: liệt kê pending/completed, gửi review và cập nhật thống kê rating event.',
    tags: ['service', 'review', 'rating', 'event'],
    complexity: 'moderate',
  },
  'BE/src/utils/AppError.js': {
    summary: 'Class lỗi HTTP tùy chỉnh mang statusCode dùng chung cho middleware error handler.',
    tags: ['utility', 'error-handling', 'http'],
    complexity: 'simple',
  },
  'BE/src/utils/asyncHandler.js': {
    summary: 'Wrapper Express chuyển lỗi từ handler async sang middleware next().',
    tags: ['utility', 'middleware', 'express', 'async'],
    complexity: 'simple',
  },
  'BE/src/utils/jwt.js': {
    summary: 'Tiện ích ký và xác minh JWT cho phiên đăng nhập người dùng.',
    tags: ['utility', 'jwt', 'auth', 'security'],
    complexity: 'simple',
  },
  'BE/src/utils/otpStore.js': {
    summary: 'Store in-memory cho OTP đăng ký/reset và helper kiểm tra thời hạn hết hạn.',
    tags: ['utility', 'otp', 'in-memory', 'auth'],
    complexity: 'simple',
  },
};

const fnMeta = {
  login: { summary: 'Xác thực email/mật khẩu, đồng bộ profile và trả JWT cùng user đã sanitize.', tags: ['auth', 'login', 'jwt'] },
  signup: { summary: 'Validate input, hash mật khẩu, lưu pending user và gửi OTP qua email.', tags: ['auth', 'signup', 'otp'] },
  verifyOtp: { summary: 'Xác minh OTP đăng ký, tạo user MongoDB và phát hành JWT.', tags: ['auth', 'otp', 'verification'] },
  resendOtp: { summary: 'Tạo OTP mới cho pending signup và gửi lại email xác nhận.', tags: ['auth', 'otp', 'email'] },
  forgotPassword: { summary: 'Tìm user theo email/SĐT, lưu OTP reset và gửi email khôi phục.', tags: ['auth', 'password-reset', 'otp'] },
  resetPassword: { summary: 'Xác minh OTP reset, hash mật khẩu mới và cập nhật user.', tags: ['auth', 'password-reset'] },
  googleLogin: { summary: 'Xác minh Google ID token, tạo hoặc cập nhật user và trả JWT.', tags: ['auth', 'google-oauth', 'jwt'] },
  googleCallback: { summary: 'OAuth callback server-side: đổi code lấy token Google và redirect frontend kèm JWT.', tags: ['auth', 'google-oauth', 'callback'] },
  getGoogleCalendarAuthUrl: { summary: 'Tạo URL ủy quyền Google Calendar từ JWT state.', tags: ['google-calendar', 'oauth', 'auth'] },
  googleCalendarCallback: { summary: 'Callback OAuth Calendar: lưu refresh token vào profile user.', tags: ['google-calendar', 'oauth', 'callback'] },
  syncEventToGoogleCalendar: { summary: 'Tạo sự kiện trên Google Calendar của user đã liên kết tài khoản.', tags: ['google-calendar', 'sync', 'event'] },
  removeEventFromGoogleCalendar: { summary: 'Xóa sự kiện khỏi Google Calendar khi user hủy đăng ký.', tags: ['google-calendar', 'delete', 'event'] },
  buildCalendarEventPayload: { summary: 'Chuyển document event sang payload JSON cho Google Calendar API.', tags: ['google-calendar', 'mapping', 'utility'] },
  getClubs: { summary: 'Liệt kê CLB có filter, gắn cờ follow/membership của user hiện tại.', tags: ['club', 'query', 'list'] },
  getClubBySlug: { summary: 'Lấy chi tiết CLB theo id/slug kèm trạng thái follow và membership.', tags: ['club', 'detail'] },
  followClub: { summary: 'Theo dõi CLB, tạo/cập nhật ClubFollow và tăng follower count.', tags: ['club', 'follow', 'mutation'] },
  unfollowClub: { summary: 'Bỏ theo dõi CLB và giảm follower count.', tags: ['club', 'unfollow', 'mutation'] },
  joinClub: { summary: 'Gửi yêu cầu tham gia CLB, tạo membership pending và cập nhật counter.', tags: ['club', 'membership', 'join'] },
  cancelJoinClub: { summary: 'Hủy yêu cầu join pending và rollback counter CLB.', tags: ['club', 'membership', 'cancel'] },
  approveMembership: { summary: 'Staff duyệt membership pending thành member và cập nhật số thành viên.', tags: ['club', 'membership', 'approval'] },
  getMyClubs: { summary: 'Trả danh sách CLB theo tab joined/pending/following kèm counts.', tags: ['club', 'user', 'list'] },
  buildClubQuery: { summary: 'Xây MongoDB query filter theo category và search text.', tags: ['club', 'query', 'utility'] },
  attachUserClubFlags: { summary: 'Gắn isFollowing và membershipStatus vào object CLB cho response API.', tags: ['club', 'mapping', 'utility'] },
  sendOtpEmail: { summary: 'Render template HTML OTP đăng ký và gửi qua Nodemailer.', tags: ['email', 'otp', 'template'] },
  sendResetEmail: { summary: 'Gửi email reset mật khẩu kèm OTP và link frontend.', tags: ['email', 'password-reset'] },
  getTransporter: { summary: 'Khởi tạo Nodemailer transporter từ env hoặc Ethereal test account.', tags: ['email', 'nodemailer', 'config'] },
  buildEmailShell: { summary: 'Tạo khung HTML email thống nhất cho các loại thông báo OTP.', tags: ['email', 'template', 'html'] },
  sendMail: { summary: 'Gửi email thực tế và log preview URL ở môi trường dev.', tags: ['email', 'delivery'] },
  createEvent: { summary: 'Validate venue/pricing, tạo event pending và gán createdBy.', tags: ['event', 'create', 'validation'] },
  getPendingEvents: { summary: 'Liệt kê sự kiện chờ duyệt kèm thông tin người tạo.', tags: ['event', 'approval', 'list'] },
  updateEventStatus: { summary: 'Staff duyệt hoặc từ chối sự kiện pending.', tags: ['event', 'approval', 'mutation'] },
  getApprovedEvents: { summary: 'Liệt kê sự kiện approved có filter, enrich pricing và cờ đã đăng ký.', tags: ['event', 'list', 'pricing'] },
  getEventById: { summary: 'Chi tiết sự kiện approved kèm pricing và trạng thái đăng ký của user.', tags: ['event', 'detail'] },
  registerForEvent: { summary: 'Đăng ký vé, tính giá, tạo EventRegistration và đồng bộ Google Calendar.', tags: ['registration', 'ticket', 'calendar'] },
  cancelRegistration: { summary: 'Hủy đăng ký, xóa event khỏi Calendar và giảm registeredCount.', tags: ['registration', 'cancel', 'calendar'] },
  getRegisteredEventIds: { summary: 'Trả mảng id sự kiện user đã đăng ký thành công.', tags: ['registration', 'query', 'utility'] },
  getMyEvents: { summary: 'Nhóm sự kiện của user theo upcoming/past/cancelled từ registrations.', tags: ['registration', 'user', 'list'] },
  formatEventForMyEvents: { summary: 'Map registration sang DTO sự kiện cho dashboard sinh viên.', tags: ['registration', 'mapping', 'formatting'] },
  assertEventRegisterable: { summary: 'Kiểm tra sự kiện approved, chưa hết hạn và còn chỗ trước khi đăng ký.', tags: ['registration', 'validation'] },
  getEventReviews: { summary: 'Trả pending và completed reviews của user từ registrations và EventReview.', tags: ['review', 'list', 'user'] },
  submitReview: { summary: 'Gửi rating/comment, cập nhật registration và thống kê rating event.', tags: ['review', 'submit', 'rating'] },
  isEligibleForReview: { summary: 'Kiểm tra registration đã tham dự và sự kiện đã kết thúc.', tags: ['review', 'validation', 'eligibility'] },
  updateEventRatingStats: { summary: 'Aggregate rating từ EventReview và cập nhật event.averageRating.', tags: ['review', 'aggregation', 'stats'] },
  formatPendingItem: { summary: 'Format registration chưa review thành item pending cho UI.', tags: ['review', 'mapping'] },
  formatCompletedItem: { summary: 'Format review đã hoàn thành kèm rating và comment.', tags: ['review', 'mapping'] },
  asyncHandler: { summary: 'Bọc handler async Express để catch rejection và gọi next(err).', tags: ['middleware', 'express', 'error-handling'] },
  signToken: { summary: 'Ký JWT chứa user id, email và role với secret từ env.', tags: ['jwt', 'auth', 'security'] },
  verifyToken: { summary: 'Xác minh JWT và trả payload decoded.', tags: ['jwt', 'auth', 'verification'] },
  generateOtp: { summary: 'Sinh mã OTP 6 chữ số ngẫu nhiên.', tags: ['otp', 'random', 'utility'] },
  isExpired: { summary: 'So sánh timestamp entry với TTL cấu hình để biết OTP hết hạn.', tags: ['otp', 'ttl', 'utility'] },
};

const classMeta = {
  AppError: { summary: 'Error subclass mang statusCode HTTP cho phản hồi API nhất quán.', tags: ['error-handling', 'http', 'class'] },
};

function lineCount(fn) {
  return fn.endLine - fn.startLine + 1;
}

function isSignificant(filePath, name, kind, extractResult) {
  if (kind === 'class') {
    const cls = extractResult.classes?.find((c) => c.name === name);
    if (!cls) return false;
    if (exportedClasses[filePath]?.includes(name)) return true;
    return (cls.methods?.length || 0) >= 2 || lineCount(cls) >= 20;
  }
  const fn = extractResult.functions?.find((f) => f.name === name);
  if (!fn) return false;
  if (exportedFns[filePath]?.includes(name)) return true;
  return lineCount(fn) >= 10;
}

function fnComplexity(fn) {
  const lines = lineCount(fn);
  if (lines >= 40) return 'complex';
  if (lines >= 15) return 'moderate';
  return 'simple';
}

const nodes = [];
const edges = [];

for (const r of extract.results) {
  const fp = r.path;
  const meta = fileMeta[fp];
  nodes.push({
    id: `file:${fp}`,
    type: 'file',
    name: path.basename(fp),
    filePath: fp,
    summary: meta.summary,
    tags: meta.tags,
    complexity: meta.complexity,
    ...(meta.languageNotes ? { languageNotes: meta.languageNotes } : {}),
  });

  for (const fn of r.functions || []) {
    if (!isSignificant(fp, fn.name, 'function', r)) continue;
    const fm = fnMeta[fn.name] || {
      summary: `Hàm ${fn.name} trong ${path.basename(fp)}.`,
      tags: ['utility'],
    };
    nodes.push({
      id: `function:${fp}:${fn.name}`,
      type: 'function',
      name: fn.name,
      filePath: fp,
      lineRange: [fn.startLine, fn.endLine],
      summary: fm.summary,
      tags: fm.tags,
      complexity: fnComplexity(fn),
    });
    edges.push({
      source: `file:${fp}`,
      target: `function:${fp}:${fn.name}`,
      type: 'contains',
      direction: 'forward',
      weight: 1.0,
    });
    if (exportedFns[fp]?.includes(fn.name)) {
      edges.push({
        source: `file:${fp}`,
        target: `function:${fp}:${fn.name}`,
        type: 'exports',
        direction: 'forward',
        weight: 0.8,
      });
    }
  }

  for (const cls of r.classes || []) {
    if (!isSignificant(fp, cls.name, 'class', r)) continue;
    const cm = classMeta[cls.name] || {
      summary: `Class ${cls.name} trong ${path.basename(fp)}.`,
      tags: ['class'],
    };
    nodes.push({
      id: `class:${fp}:${cls.name}`,
      type: 'class',
      name: cls.name,
      filePath: fp,
      lineRange: [cls.startLine, cls.endLine],
      summary: cm.summary,
      tags: cm.tags,
      complexity: 'simple',
    });
    edges.push({
      source: `file:${fp}`,
      target: `class:${fp}:${cls.name}`,
      type: 'contains',
      direction: 'forward',
      weight: 1.0,
    });
    if (exportedClasses[fp]?.includes(cls.name)) {
      edges.push({
        source: `file:${fp}`,
        target: `class:${fp}:${cls.name}`,
        type: 'exports',
        direction: 'forward',
        weight: 0.8,
      });
    }
  }
}

for (const [filePath, imports] of Object.entries(batchImportData)) {
  for (const target of imports) {
    edges.push({
      source: `file:${filePath}`,
      target: `file:${target}`,
      type: 'imports',
      direction: 'forward',
      weight: 0.7,
    });
  }
}

const callEdges = [
  ['function:BE/src/services/auth.service.js:login', 'function:BE/src/utils/jwt.js:signToken'],
  ['function:BE/src/services/auth.service.js:signup', 'function:BE/src/utils/otpStore.js:generateOtp'],
  ['function:BE/src/services/auth.service.js:signup', 'function:BE/src/services/email.service.js:sendOtpEmail'],
  ['function:BE/src/services/auth.service.js:verifyOtp', 'function:BE/src/utils/otpStore.js:isExpired'],
  ['function:BE/src/services/auth.service.js:verifyOtp', 'function:BE/src/utils/jwt.js:signToken'],
  ['function:BE/src/services/auth.service.js:resendOtp', 'function:BE/src/utils/otpStore.js:generateOtp'],
  ['function:BE/src/services/auth.service.js:resendOtp', 'function:BE/src/services/email.service.js:sendOtpEmail'],
  ['function:BE/src/services/auth.service.js:forgotPassword', 'function:BE/src/utils/otpStore.js:generateOtp'],
  ['function:BE/src/services/auth.service.js:forgotPassword', 'function:BE/src/services/email.service.js:sendResetEmail'],
  ['function:BE/src/services/auth.service.js:resetPassword', 'function:BE/src/utils/otpStore.js:isExpired'],
  ['function:BE/src/services/auth.service.js:googleLogin', 'function:BE/src/utils/jwt.js:signToken'],
  ['function:BE/src/services/auth.service.js:googleCallback', 'function:BE/src/utils/jwt.js:signToken'],
  ['function:BE/src/services/auth.service.js:getGoogleCalendarAuthUrl', 'function:BE/src/utils/jwt.js:verifyToken'],
  ['function:BE/src/services/email.service.js:sendOtpEmail', 'function:BE/src/services/email.service.js:sendMail'],
  ['function:BE/src/services/email.service.js:sendResetEmail', 'function:BE/src/services/email.service.js:sendMail'],
  ['function:BE/src/services/email.service.js:sendMail', 'function:BE/src/services/email.service.js:getTransporter'],
  ['function:BE/src/services/event.service.js:getApprovedEvents', 'function:BE/src/services/registration.service.js:getRegisteredEventIds'],
  ['function:BE/src/services/event.service.js:getEventById', 'function:BE/src/services/registration.service.js:getRegisteredEventIds'],
  ['function:BE/src/services/registration.service.js:registerForEvent', 'function:BE/src/services/calendar.service.js:syncEventToGoogleCalendar'],
  ['function:BE/src/services/registration.service.js:cancelRegistration', 'function:BE/src/services/calendar.service.js:removeEventFromGoogleCalendar'],
  ['function:BE/src/services/calendar.service.js:syncEventToGoogleCalendar', 'function:BE/src/services/calendar.service.js:buildCalendarEventPayload'],
  ['function:BE/src/services/club.service.js:getClubs', 'function:BE/src/services/club.service.js:buildClubQuery'],
  ['function:BE/src/services/club.service.js:getClubs', 'function:BE/src/services/club.service.js:attachUserClubFlags'],
  ['function:BE/src/services/review.service.js:getEventReviews', 'function:BE/src/services/review.service.js:isEligibleForReview'],
  ['function:BE/src/services/review.service.js:submitReview', 'function:BE/src/services/review.service.js:isEligibleForReview'],
  ['function:BE/src/services/review.service.js:submitReview', 'function:BE/src/services/review.service.js:updateEventRatingStats'],
];

for (const [source, target] of callEdges) {
  edges.push({ source, target, type: 'calls', direction: 'forward', weight: 0.8 });
}

const nodeIds = new Set(nodes.map((n) => n.id));
const importCount = Object.values(batchImportData).reduce((s, a) => s + a.length, 0);
const actualImports = edges.filter((e) => e.type === 'imports').length;
if (actualImports !== importCount) {
  console.error(`Import mismatch: expected ${importCount}, got ${actualImports}`);
  process.exit(1);
}

const outDir = path.join(projectRoot, '.understand-anything/intermediate');
const nodeCount = nodes.length;
const edgeCount = edges.length;
console.log(`Total nodes: ${nodeCount}, edges: ${edgeCount}`);

if (nodeCount <= 60 && edgeCount <= 120) {
  fs.writeFileSync(path.join(outDir, 'batch-7.json'), JSON.stringify({ nodes, edges }, null, 2));
  console.log('Wrote batch-7.json');
} else {
  const files = batch.files.map((f) => f.path).sort();
  const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
  const chunkSize = Math.ceil(files.length / parts);
  for (let p = 0; p < parts; p++) {
    const chunkFiles = new Set(files.slice(p * chunkSize, (p + 1) * chunkSize));
    const partNodes = nodes.filter((n) => chunkFiles.has(n.filePath));
    const partNodeIds = new Set(partNodes.map((n) => n.id));
    const partEdges = edges.filter((e) => partNodeIds.has(e.source));
    const out = { nodes: partNodes, edges: partEdges };
    fs.writeFileSync(path.join(outDir, `batch-7-part-${p + 1}.json`), JSON.stringify(out, null, 2));
    console.log(`Wrote batch-7-part-${p + 1}.json nodes=${partNodes.length} edges=${partEdges.length}`);
  }
}
