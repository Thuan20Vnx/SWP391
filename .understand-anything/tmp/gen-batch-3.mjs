import fs from 'fs';

const extract = JSON.parse(fs.readFileSync('.understand-anything/tmp/ua-file-extract-results-3.json', 'utf8'));
const batchImportData = JSON.parse(fs.readFileSync('.understand-anything/tmp/ua-file-analyzer-input-3.json', 'utf8')).batchImportData;

const summaries = {
  'FE/src/pages/AnnouncementDetail.jsx': 'Trang chi tiết thông báo trong dashboard sinh viên, hiển thị nội dung và điều hướng quay lại danh sách.',
  'FE/src/pages/Announcements.jsx': 'Trang danh sách thông báo với bộ lọc và tìm kiếm trong khu vực dashboard sinh viên.',
  'FE/src/pages/ClubDetail.jsx': 'Trang chi tiết câu lạc bộ: tải dữ liệu từ API, theo dõi/tham gia CLB và hiển thị sự kiện sắp tới.',
  'FE/src/pages/Clubs.jsx': 'Trang khám phá CLB công khai với tìm kiếm, lọc theo tag và phân trang lazy-load.',
  'FE/src/pages/EventDetail.jsx': 'Trang chi tiết sự kiện: đăng ký, chia sẻ, tính giá vé theo vai trò người dùng.',
  'FE/src/pages/EventReviews.jsx': 'Trang đánh giá sự kiện trong dashboard sinh viên, gửi rating và bình luận qua API.',
  'FE/src/pages/Events.jsx': 'Trang khám phá sự kiện với lọc trạng thái, danh mục và tìm kiếm trên dữ liệu API.',
  'FE/src/pages/Home.jsx': 'Trang chủ công khai giới thiệu sự kiện nổi bật, hero search và CTA đăng nhập/đăng ký.',
  'FE/src/pages/Login.jsx': 'Trang đăng nhập xác thực JWT, lưu session và đồng bộ hồ sơ người dùng vào cache.',
  'FE/src/pages/MyClubs.jsx': 'Trang CLB của tôi trong dashboard: tab đã tham gia, chờ duyệt và đang theo dõi.',
  'FE/src/pages/MyEvents.jsx': 'Trang sự kiện đã đăng ký của sinh viên với tab sắp diễn ra và đã tham dự.',
  'FE/src/pages/Profile.jsx': 'Trang hồ sơ cá nhân phức tạp: chỉnh sửa thông tin, avatar, sở thích và đổi mật khẩu.',
  'FE/src/pages/Schedule.jsx': 'Trang lịch sự kiện trong dashboard với lịch tháng và danh sách sự kiện sắp tới/đã tham dự.',
  'FE/src/pages/Signup.jsx': 'Trang đăng ký tài khoản hai bước với xác thực OTP qua email.',
  'FE/src/pages/StudentDashboard.jsx': 'Dashboard sinh viên tổng quan: thống kê, timeline hôm nay và gợi ý sự kiện.',
  'FE/src/utils/api.js': 'Tiện ích HTTP cơ bản: base URL API, header xác thực và parse phản hồi JSON/text.',
  'FE/src/utils/auth.js': 'Quản lý session JWT trong localStorage và helper phân quyền vai trò người dùng.',
  'FE/src/utils/authEvents.js': 'Sự kiện tùy chỉnh window để đồng bộ trạng thái đăng nhập giữa các component.',
  'FE/src/utils/image.js': 'Xử lý avatar: nhận diện ảnh upload, resolve URL và nén ảnh trước khi gửi lên server.',
  'FE/src/utils/logout.js': 'Luồng đăng xuất có xác nhận, xóa session và cache hồ sơ người dùng.',
  'FE/src/utils/profileApi.js': 'API cập nhật avatar người dùng và xây dựng payload ảnh đại diện.',
  'FE/src/utils/role.js': 'Ánh xạ mã vai trò backend sang nhãn hiển thị tiếng Việt.',
  'FE/src/utils/studentId.js': 'Định dạng MSSV và suy luận khóa học từ mã sinh viên.',
  'FE/src/utils/ticketPricing.js': 'Logic giá vé sự kiện: miễn phí sinh viên, format VND và nhãn hành động chính.',
};

const fileTags = {
  'FE/src/pages/AnnouncementDetail.jsx': ['component', 'student-dashboard', 'announcements', 'react'],
  'FE/src/pages/Announcements.jsx': ['component', 'student-dashboard', 'announcements', 'react'],
  'FE/src/pages/ClubDetail.jsx': ['component', 'club', 'api-handler', 'react'],
  'FE/src/pages/Clubs.jsx': ['component', 'club', 'discovery', 'react'],
  'FE/src/pages/EventDetail.jsx': ['component', 'event', 'registration', 'react'],
  'FE/src/pages/EventReviews.jsx': ['component', 'student-dashboard', 'reviews', 'react'],
  'FE/src/pages/Events.jsx': ['component', 'event', 'discovery', 'react'],
  'FE/src/pages/Home.jsx': ['component', 'entry-point', 'landing-page', 'react'],
  'FE/src/pages/Login.jsx': ['component', 'authentication', 'entry-point', 'react'],
  'FE/src/pages/MyClubs.jsx': ['component', 'student-dashboard', 'club', 'react'],
  'FE/src/pages/MyEvents.jsx': ['component', 'student-dashboard', 'event', 'react'],
  'FE/src/pages/Profile.jsx': ['component', 'profile', 'api-handler', 'react'],
  'FE/src/pages/Schedule.jsx': ['component', 'student-dashboard', 'calendar', 'react'],
  'FE/src/pages/Signup.jsx': ['component', 'authentication', 'registration', 'react'],
  'FE/src/pages/StudentDashboard.jsx': ['component', 'student-dashboard', 'entry-point', 'react'],
  'FE/src/utils/api.js': ['utility', 'api-handler', 'http', 'frontend'],
  'FE/src/utils/auth.js': ['utility', 'authentication', 'session', 'frontend'],
  'FE/src/utils/authEvents.js': ['utility', 'event-handler', 'authentication', 'frontend'],
  'FE/src/utils/image.js': ['utility', 'image', 'avatar', 'frontend'],
  'FE/src/utils/logout.js': ['utility', 'authentication', 'session', 'frontend'],
  'FE/src/utils/profileApi.js': ['utility', 'api-handler', 'profile', 'frontend'],
  'FE/src/utils/role.js': ['utility', 'authorization', 'type-definition', 'frontend'],
  'FE/src/utils/studentId.js': ['utility', 'validation', 'profile', 'frontend'],
  'FE/src/utils/ticketPricing.js': ['utility', 'pricing', 'event', 'frontend'],
};

const fnSummaries = {
  AnnouncementDetail: 'Component React hiển thị chi tiết một thông báo theo ID từ mock data.',
  Announcements: 'Component liệt kê thông báo với bộ lọc danh mục và điều hướng tới chi tiết.',
  ClubDetail: 'Component trang chi tiết CLB: fetch API, follow/join và render nội dung CLB.',
  Clubs: 'Component trang khám phá CLB với hero search, tag filter và infinite scroll.',
  EventDetail: 'Component trang chi tiết sự kiện với đăng ký, pricing và chia sẻ.',
  EventReviews: 'Component quản lý tab đánh giá sự kiện pending/completed qua API.',
  Events: 'Component trang khám phá sự kiện với bộ lọc đa chiều và fallback Figma.',
  Home: 'Component landing page với hero, featured events và quick search.',
  persistProfileFromUser: 'Helper cache hồ sơ người dùng sau đăng nhập thành công.',
  Login: 'Component form đăng nhập email/mật khẩu với xử lý lỗi và redirect theo role.',
  MyClubsSkeleton: 'Skeleton loading UI cho trang CLB của tôi.',
  MyClubs: 'Component tab CLB đã tham gia/chờ duyệt/theo dõi với tìm kiếm cục bộ.',
  MyEvents: 'Component liệt kê sự kiện đã đăng ký và hủy đăng ký qua API.',
  Profile: 'Component form hồ sơ đa tab: thông tin cá nhân, avatar crop và bảo mật.',
  Schedule: 'Component lịch tháng kết hợp sự kiện API và mock fallback.',
  Signup: 'Component đăng ký hai bước: form thông tin và xác thực OTP.',
  StudentDashboard: 'Component dashboard tổng quan với stats, timeline và recommendations.',
  getAuthHeaders: 'Tạo header Authorization Bearer từ token localStorage.',
  parseApiResponse: 'Parse response fetch: JSON hoặc text tùy Content-Type.',
  normalizeRole: 'Chuẩn hóa chuỗi role về lowercase để so sánh.',
  persistSession: 'Lưu user và JWT token vào localStorage.',
  clearSession: 'Xóa token và dữ liệu user khỏi localStorage.',
  getUserRole: 'Đọc role hiện tại từ session đã lưu.',
  isCtsvRole: 'Kiểm tra user có vai trò CTSV hay không.',
  isIcpdpRole: 'Kiểm tra user có vai trò ICPDP hay không.',
  canCtsvFinalApprove: 'Kiểm tra quyền phê duyệt cuối của CTSV.',
  getHomePathForRole: 'Trả về đường dẫn home mặc định theo role.',
  getRoleDisplayLabel: 'Trả về nhãn hiển thị tiếng Việt cho role.',
  dispatchAuthChanged: 'Phát sự kiện AUTH_CHANGED trên window.',
  isCustomUploadedAvatar: 'Kiểm tra avatar là data URL hoặc blob upload.',
  resolveUserAvatar: 'Resolve URL avatar từ user object và fallback.',
  compressImageFile: 'Nén file ảnh qua canvas trước upload.',
  confirmLogout: 'Hiển thị dialog xác nhận trước khi đăng xuất.',
  logoutWithConfirm: 'Thực hiện logout: clear session, cache và redirect.',
  updateUserAvatar: 'Gọi API PUT cập nhật avatar người dùng.',
  buildProfilePicturePayload: 'Xây payload avatar cho API profile.',
  getRoleLabel: 'Map role code sang nhãn hiển thị ngắn.',
  formatMssv: 'Chuẩn hóa và format mã số sinh viên.',
  deriveCourseFromMssv: 'Suy luận khóa học từ prefix MSSV.',
  hasStudentTicketPrivilege: 'Kiểm tra role được miễn phí vé sinh viên.',
  formatVnd: 'Format số tiền theo locale VND.',
  calculateTicketAmount: 'Tính số tiền vé theo role người dùng.',
  buildPriceLabel: 'Tạo nhãn giá hiển thị (miễn phí/giảm giá/giá gốc).',
  getPrimaryActionLabel: 'Trả về nhãn nút hành động chính theo trạng thái sự kiện.',
  resolveEventPricing: 'Tổng hợp thông tin pricing đầy đủ cho một sự kiện.',
};

const crossCalls = [
  ['function:FE/src/pages/AnnouncementDetail.jsx:AnnouncementDetail', 'function:FE/src/data/studentMockData.js:getAnnouncementById'],
  ['function:FE/src/pages/ClubDetail.jsx:ClubDetail', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/ClubDetail.jsx:ClubDetail', 'function:FE/src/data/clubDetailData.js:mapApiClubToDetail'],
  ['function:FE/src/pages/ClubDetail.jsx:ClubDetail', 'function:FE/src/data/clubDetailData.js:getClubDetailById'],
  ['function:FE/src/pages/Clubs.jsx:Clubs', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Clubs.jsx:Clubs', 'function:FE/src/data/clubDiscoveryData.js:mapApiClubToListItem'],
  ['function:FE/src/pages/Clubs.jsx:Clubs', 'function:FE/src/data/clubDiscoveryData.js:filterClubsByTag'],
  ['function:FE/src/pages/Clubs.jsx:Clubs', 'function:FE/src/data/clubDiscoveryData.js:filterClubsBySearch'],
  ['function:FE/src/pages/EventDetail.jsx:EventDetail', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/EventDetail.jsx:EventDetail', 'function:FE/src/data/eventDetailData.js:mapApiEventToDetail'],
  ['function:FE/src/pages/EventDetail.jsx:EventDetail', 'function:FE/src/utils/ticketPricing.js:resolveEventPricing'],
  ['function:FE/src/pages/EventReviews.jsx:EventReviews', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Events.jsx:Events', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Events.jsx:Events', 'function:FE/src/data/eventDiscoveryData.js:mapApiEventToCard'],
  ['function:FE/src/pages/Home.jsx:Home', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Home.jsx:Home', 'function:FE/src/data/eventDiscoveryData.js:mapApiEventToHomeCard'],
  ['function:FE/src/pages/Home.jsx:Home', 'function:FE/src/data/eventDiscoveryData.js:filterActiveDiscoveryEvents'],
  ['function:FE/src/pages/Login.jsx:Login', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Login.jsx:Login', 'function:FE/src/utils/api.js:parseApiResponse'],
  ['function:FE/src/pages/Login.jsx:persistProfileFromUser', 'function:FE/src/hooks/useUserProfile.js:cacheUserProfile'],
  ['function:FE/src/pages/Login.jsx:Login', 'function:FE/src/utils/authEvents.js:dispatchAuthChanged'],
  ['function:FE/src/pages/Login.jsx:Login', 'function:FE/src/utils/image.js:resolveUserAvatar'],
  ['function:FE/src/pages/MyClubs.jsx:MyClubs', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/MyEvents.jsx:MyEvents', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/image.js:resolveUserAvatar'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/studentId.js:formatMssv'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/logout.js:logoutWithConfirm'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/profileApi.js:updateUserAvatar'],
  ['function:FE/src/pages/Profile.jsx:Profile', 'function:FE/src/utils/role.js:getRoleLabel'],
  ['function:FE/src/pages/Schedule.jsx:Schedule', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/StudentDashboard.jsx:StudentDashboard', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/pages/StudentDashboard.jsx:StudentDashboard', 'function:FE/src/data/studentMockData.js:getGreeting'],
  ['function:FE/src/utils/logout.js:logoutWithConfirm', 'function:FE/src/utils/auth.js:clearSession'],
  ['function:FE/src/utils/logout.js:logoutWithConfirm', 'function:FE/src/hooks/useUserProfile.js:clearUserProfileCache'],
  ['function:FE/src/utils/logout.js:logoutWithConfirm', 'function:FE/src/utils/authEvents.js:dispatchAuthChanged'],
  ['function:FE/src/utils/profileApi.js:updateUserAvatar', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/utils/profileApi.js:updateUserAvatar', 'function:FE/src/utils/api.js:parseApiResponse'],
  ['function:FE/src/utils/profileApi.js:buildProfilePicturePayload', 'function:FE/src/utils/image.js:isCustomUploadedAvatar'],
];

const nodes = [];
const edges = [];

function complexity(nonEmpty) {
  if (nonEmpty < 50) return 'simple';
  if (nonEmpty <= 200) return 'moderate';
  return 'complex';
}

function fnComplexity(start, end) {
  const lines = end - start + 1;
  if (lines < 20) return 'simple';
  if (lines <= 80) return 'moderate';
  return 'complex';
}

for (const r of extract.results) {
  const fp = r.path;
  const name = fp.split('/').pop();
  const baseNode = {
    id: `file:${fp}`,
    type: 'file',
    name,
    filePath: fp,
    summary: summaries[fp],
    tags: fileTags[fp] || ['utility', 'frontend'],
    complexity: complexity(r.nonEmptyLines),
  };
  if (fp.includes('utils/')) {
    baseNode.languageNotes = 'Module ES6 export named cho tái sử dụng across pages.';
  } else {
    baseNode.languageNotes = 'React functional component với hooks và React Router.';
  }
  nodes.push(baseNode);

  const exportedNames = new Set((r.exports || []).filter((e) => !e.isDefault).map((e) => e.name));

  for (const fn of r.functions) {
    const lines = fn.endLine - fn.startLine + 1;
    const isExported = exportedNames.has(fn.name);
    if (lines < 10 && !isExported) continue;

    nodes.push({
      id: `function:${fp}:${fn.name}`,
      type: 'function',
      name: fn.name,
      filePath: fp,
      lineRange: [fn.startLine, fn.endLine],
      summary: fnSummaries[fn.name] || `Hàm ${fn.name} trong ${name}.`,
      tags: fp.includes('utils/')
        ? ['utility', 'exported', fp.includes('auth') ? 'authentication' : fp.includes('ticket') ? 'pricing' : 'frontend']
        : ['component', 'react', fp.includes('Login') || fp.includes('Signup') ? 'authentication' : fp.includes('Profile') ? 'profile' : 'page'],
      complexity: fnComplexity(fn.startLine, fn.endLine),
    });

    edges.push({ source: `file:${fp}`, target: `function:${fp}:${fn.name}`, type: 'contains', direction: 'forward', weight: 1.0 });
    if (isExported) {
      edges.push({ source: `file:${fp}`, target: `function:${fp}:${fn.name}`, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }

  for (const imp of batchImportData[fp] || []) {
    edges.push({ source: `file:${fp}`, target: `file:${imp}`, type: 'imports', direction: 'forward', weight: 0.7 });
  }
}

for (const [src, tgt] of crossCalls) {
  edges.push({ source: src, target: tgt, type: 'calls', direction: 'forward', weight: 0.8 });
}

const files = extract.results.map((r) => r.path).sort();
const part1Files = new Set(files.slice(0, 12));

function partition(allNodes, allEdges) {
  const parts = [{ nodes: [], edges: [] }, { nodes: [], edges: [] }];
  for (const n of allNodes) {
    const fp = n.filePath;
    const idx = part1Files.has(fp) ? 0 : 1;
    parts[idx].nodes.push(n);
  }
  const partNodeIds = [new Set(parts[0].nodes.map((n) => n.id)), new Set(parts[1].nodes.map((n) => n.id))];
  for (const e of allEdges) {
    if (partNodeIds[0].has(e.source)) parts[0].edges.push(e);
    else if (partNodeIds[1].has(e.source)) parts[1].edges.push(e);
  }
  return parts;
}

const importCount = edges.filter((e) => e.type === 'imports').length;
const expectedImports = Object.values(batchImportData).flat().length;
console.log('Total nodes:', nodes.length, 'edges:', edges.length);
console.log('Import edges:', importCount, 'expected:', expectedImports);

const outDir = '.understand-anything/intermediate';
if (nodes.length <= 60 && edges.length <= 120) {
  fs.writeFileSync(`${outDir}/batch-3.json`, JSON.stringify({ nodes, edges }, null, 2));
  console.log('Wrote batch-3.json');
} else {
  const parts = partition(nodes, edges);
  parts.forEach((p, i) => {
    fs.writeFileSync(`${outDir}/batch-3-part-${i + 1}.json`, JSON.stringify(p, null, 2));
    console.log(`Part ${i + 1}: nodes=${p.nodes.length} edges=${p.edges.length}`);
  });
}
