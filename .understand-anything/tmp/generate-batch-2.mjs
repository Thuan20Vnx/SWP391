import fs from 'fs';
import path from 'path';

const ROOT = 'c:/Users/Thuan/OneDrive/Documents/SWP391_Project/SWP391-1';
const extract = JSON.parse(fs.readFileSync(path.join(ROOT, '.understand-anything/tmp/ua-file-extract-results-2.json'), 'utf8'));
const batchImport = JSON.parse(fs.readFileSync(path.join(ROOT, '.understand-anything/tmp/ua-file-analyzer-input-2.json'), 'utf8')).batchImportData;

const fileMeta = {
  'FE/src/assets/brand.js': {
    summary: 'Xuất logo và văn bản thay thế thương hiệu F-Events dùng chung cho header/footer portal.',
    tags: ['tài-nguyên', 'thương-hiệu', 'frontend'],
    complexity: 'simple',
  },
  'FE/src/components/ClubDiscoveryCard.jsx': {
    summary: 'Thẻ React hiển thị câu lạc bộ trên trang khám phá với màu danh mục, số thành viên và nút khám phá.',
    tags: ['component', 'react', 'câu-lạc-bộ', 'ui'],
    complexity: 'moderate',
  },
  'FE/src/components/ClubUpcomingEventCard.jsx': {
    summary: 'Thẻ sự kiện sắp tới của câu lạc bộ với ngày, địa điểm và hành động đăng ký.',
    tags: ['component', 'react', 'sự-kiện', 'ui'],
    complexity: 'simple',
  },
  'FE/src/components/DashboardSidebarNav.jsx': {
    summary: 'Thanh điều hướng sidebar cho dashboard sinh viên, render menu theo cấu hình và xử lý điều hướng.',
    tags: ['component', 'react', 'navigation', 'dashboard'],
    complexity: 'moderate',
  },
  'FE/src/components/EventDiscoveryCard.jsx': {
    summary: 'Thẻ sự kiện trên trang khám phá với tiến độ đăng ký, nhãn danh mục và nút hành động chính.',
    tags: ['component', 'react', 'sự-kiện', 'ui'],
    complexity: 'moderate',
  },
  'FE/src/components/ProfileSidebarMenu.jsx': {
    summary: 'Menu popup sidebar hồ sơ người dùng trên site công khai với các mục điều hướng và đăng xuất.',
    tags: ['component', 'react', 'hồ-sơ', 'navigation'],
    complexity: 'moderate',
  },
  'FE/src/components/SiteFooter.jsx': {
    summary: 'Footer site công khai với liên kết điều hướng, thông tin liên hệ và bản quyền F-Events.',
    tags: ['component', 'react', 'layout', 'footer'],
    complexity: 'simple',
  },
  'FE/src/components/SiteHeader.jsx': {
    summary: 'Header site công khai với điều hướng, tìm kiếm, menu mobile và popup hồ sơ người dùng.',
    tags: ['component', 'react', 'layout', 'navigation', 'auth'],
    complexity: 'complex',
  },
  'FE/src/components/StudentDashboardLayout.jsx': {
    summary: 'Layout bọc các trang dashboard sinh viên với sidebar, header, tải hồ sơ API và đăng xuất.',
    tags: ['component', 'react', 'layout', 'dashboard'],
    complexity: 'complex',
  },
  'FE/src/components/ctsv/CtsvHamburgerButton.jsx': {
    summary: 'Nút hamburger mở/đóng menu điều hướng mobile cho portal CTSV.',
    tags: ['component', 'react', 'ctsv', 'ui'],
    complexity: 'simple',
  },
  'FE/src/components/ctsv/CtsvPortalFooter.jsx': {
    summary: 'Footer portal CTSV với liên kết điều hướng nội bộ và logo thương hiệu.',
    tags: ['component', 'react', 'ctsv', 'footer'],
    complexity: 'simple',
  },
  'FE/src/components/ctsv/CtsvPortalHeader.jsx': {
    summary: 'Header portal CTSV với thanh tìm kiếm, menu desktop/mobile, popup hồ sơ và đăng xuất.',
    tags: ['component', 'react', 'ctsv', 'navigation', 'auth'],
    complexity: 'complex',
  },
  'FE/src/components/ctsv/CtsvProfileMenu.jsx': {
    summary: 'Menu popup hồ sơ cán bộ CTSV với các mục cài đặt và đăng xuất.',
    tags: ['component', 'react', 'ctsv', 'hồ-sơ'],
    complexity: 'moderate',
  },
  'FE/src/components/ctsv/CtsvSidebarAside.jsx': {
    summary: 'Sidebar điều hướng portal CTSV render danh sách nav từ cấu hình và hiển thị vai trò người dùng.',
    tags: ['component', 'react', 'ctsv', 'navigation'],
    complexity: 'moderate',
  },
  'FE/src/components/ctsv/ctsvNavConfig.js': {
    summary: 'Cấu hình menu sidebar CTSV, tiện ích lưu trạng thái sidebar và kiểm tra route đang active.',
    tags: ['config', 'navigation', 'ctsv', 'utility'],
    complexity: 'simple',
    languageNotes: 'Lưu preference sidebar trong sessionStorage và dùng matchMedia cho breakpoint desktop.',
  },
  'FE/src/constants/defaultAvatar.js': {
    summary: 'Hằng số URL avatar mặc định khi người dùng chưa có ảnh đại diện tùy chỉnh.',
    tags: ['hằng-số', 'hồ-sơ', 'frontend'],
    complexity: 'simple',
  },
  'FE/src/data/clubDetailData.js': {
    summary: 'Dữ liệu mẫu và mapper chuyển phản hồi API câu lạc bộ sang model chi tiết cho trang ClubDetail.',
    tags: ['data-model', 'mapper', 'câu-lạc-bộ', 'mock-data'],
    complexity: 'moderate',
  },
  'FE/src/data/clubDiscoveryData.js': {
    summary: 'Dữ liệu khám phá câu lạc bộ, màu danh mục và hàm lọc/tìm kiếm danh sách club.',
    tags: ['data-model', 'mapper', 'câu-lạc-bộ', 'filter'],
    complexity: 'moderate',
  },
  'FE/src/data/eventDetailData.js': {
    summary: 'Mapper và fallback chi tiết sự kiện, bao gồm agenda, deadline đăng ký và nhãn hành động.',
    tags: ['data-model', 'mapper', 'sự-kiện', 'pricing'],
    complexity: 'complex',
  },
  'FE/src/data/eventDiscoveryData.js': {
    summary: 'Bộ lọc, sắp xếp và mapper thẻ sự kiện cho trang khám phá và trang chủ.',
    tags: ['data-model', 'mapper', 'sự-kiện', 'filter'],
    complexity: 'complex',
  },
  'FE/src/data/speakerSeedData.js': {
    summary: 'Dữ liệu seed diễn giả mẫu và avatar dùng khi render chi tiết sự kiện.',
    tags: ['mock-data', 'seed', 'sự-kiện'],
    complexity: 'simple',
  },
  'FE/src/data/studentMockData.js': {
    summary: 'Dữ liệu mock cho dashboard sinh viên: thống kê, lịch, sự kiện, thông báo và đánh giá.',
    tags: ['mock-data', 'dashboard', 'sinh-viên'],
    complexity: 'moderate',
  },
  'FE/src/data/studentSidebarMenu.js': {
    summary: 'Cấu hình các mục menu sidebar dashboard sinh viên theo nhóm chức năng.',
    tags: ['config', 'navigation', 'dashboard'],
    complexity: 'simple',
  },
  'FE/src/hooks/useUserProfile.js': {
    summary: 'Hook React quản lý hồ sơ người dùng với cache sessionStorage, fetch API và lắng nghe sự kiện auth.',
    tags: ['hook', 'react', 'hồ-sơ', 'auth', 'cache'],
    complexity: 'moderate',
  },
  'FE/src/layouts/CtsvLayout.jsx': {
    summary: 'Layout chính portal CTSV: xác thực vai trò, sidebar, header/footer và vùng nội dung con.',
    tags: ['layout', 'react', 'ctsv', 'auth'],
    complexity: 'complex',
  },
};

const fnMeta = {
  'ClubDiscoveryCard': { summary: 'Component thẻ hiển thị thông tin câu lạc bộ với callback khám phá.', tags: ['component', 'react', 'câu-lạc-bộ'] },
  'ClubUpcomingEventCard': { summary: 'Component thẻ sự kiện sắp diễn ra của một câu lạc bộ.', tags: ['component', 'react', 'sự-kiện'] },
  'MenuIcon': { summary: 'Component SVG icon menu dùng trong sidebar dashboard.', tags: ['component', 'icon', 'ui'] },
  'DashboardSidebarNav': { summary: 'Render menu sidebar sinh viên và xử lý click điều hướng.', tags: ['component', 'navigation', 'dashboard'] },
  'EventDiscoveryCard': { summary: 'Component thẻ sự kiện với thanh tiến độ đăng ký và nút chi tiết/đăng ký.', tags: ['component', 'react', 'sự-kiện'] },
  'ProfileSidebarMenu': { summary: 'Menu popup hồ sơ với các NavItem và handler hành động.', tags: ['component', 'hồ-sơ', 'navigation'] },
  'SiteFooter': { summary: 'Footer tĩnh với các nhóm liên kết và thông tin bản quyền.', tags: ['component', 'layout', 'footer'] },
  'SiteHeader': { summary: 'Header điều hướng site công khai tích hợp useUserProfile và popup menu.', tags: ['component', 'layout', 'auth'] },
  'StudentDashboardLayout': { summary: 'Layout dashboard bọc children, quản lý sidebar và tải hồ sơ từ API.', tags: ['component', 'layout', 'dashboard'] },
  'CtsvHamburgerButton': { summary: 'Nút toggle menu mobile cho header portal CTSV.', tags: ['component', 'ctsv', 'ui'] },
  'CtsvPortalFooter': { summary: 'Footer portal với liên kết điều hướng nội bộ CTSV.', tags: ['component', 'ctsv', 'footer'] },
  'CtsvPortalHeader': { summary: 'Header portal CTSV với nav, tìm kiếm và menu hồ sơ.', tags: ['component', 'ctsv', 'navigation'] },
  'CtsvProfileMenu': { summary: 'Menu popup hồ sơ cán bộ CTSV.', tags: ['component', 'ctsv', 'hồ-sơ'] },
  'CtsvSidebarAside': { summary: 'Sidebar CTSV render nav items và nhãn vai trò người dùng.', tags: ['component', 'ctsv', 'navigation'] },
  'readSidebarPref': { summary: 'Đọc trạng thái mở/đóng sidebar từ sessionStorage.', tags: ['utility', 'ctsv', 'storage'] },
  'persistSidebarOpen': { summary: 'Lưu trạng thái sidebar vào sessionStorage.', tags: ['utility', 'ctsv', 'storage'] },
  'isCtsvDesktop': { summary: 'Kiểm tra viewport có phải desktop theo breakpoint CTSV.', tags: ['utility', 'ctsv', 'responsive'] },
  'isCtsvNavActive': { summary: 'Xác định mục nav sidebar có đang active theo pathname.', tags: ['utility', 'ctsv', 'routing'] },
  'mapApiClubToDetail': { summary: 'Chuyển object club từ API sang model chi tiết đầy đủ.', tags: ['mapper', 'câu-lạc-bộ', 'api'] },
  'buildClubDetailFromList': { summary: 'Xây dựng model chi tiết club từ dữ liệu danh sách kèm sự kiện nổi bật.', tags: ['mapper', 'câu-lạc-bộ'] },
  'getClubDetailById': { summary: 'Tra cứu và build chi tiết club theo ID từ danh sách mẫu.', tags: ['utility', 'câu-lạc-bộ'] },
  'getCategoryColor': { summary: 'Trả về màu CSS theo danh mục club hoặc sự kiện.', tags: ['utility', 'styling'] },
  'formatMemberCount': { summary: 'Định dạng số lượng thành viên câu lạc bộ.', tags: ['utility', 'formatting'] },
  'mapApiClubToListItem': { summary: 'Map phản hồi API club sang item hiển thị trên thẻ khám phá.', tags: ['mapper', 'câu-lạc-bộ', 'api'] },
  'filterClubsBySearch': { summary: 'Lọc danh sách club theo từ khóa tìm kiếm.', tags: ['filter', 'câu-lạc-bộ'] },
  'filterClubsByTag': { summary: 'Lọc danh sách club theo tag hoặc danh mục.', tags: ['filter', 'câu-lạc-bộ'] },
  'buildAgenda': { summary: 'Sinh lịch trình agenda sự kiện từ thời gian bắt đầu/kết thúc.', tags: ['utility', 'sự-kiện'] },
  'getRegistrationStatus': { summary: 'Xác định trạng thái đăng ký sự kiện (mở/đóng/đầy).', tags: ['utility', 'sự-kiện', 'validation'] },
  'getPrimaryActionLabel': { summary: 'Sinh nhãn nút hành động chính trên trang chi tiết sự kiện.', tags: ['utility', 'sự-kiện', 'pricing'] },
  'mapApiEventToDetail': { summary: 'Map phản hồi API sự kiện sang model chi tiết đầy đủ cho UI.', tags: ['mapper', 'sự-kiện', 'api'] },
  'isEventActiveForDiscovery': { summary: 'Kiểm tra sự kiện còn hiển thị trên trang khám phá.', tags: ['filter', 'sự-kiện'] },
  'filterActiveDiscoveryEvents': { summary: 'Lọc chỉ các sự kiện đang active cho discovery.', tags: ['filter', 'sự-kiện'] },
  'getEventCardStateGroup': { summary: 'Phân nhóm trạng thái thẻ sự kiện (sắp diễn ra, đang diễn ra, v.v.).', tags: ['utility', 'sự-kiện'] },
  'filterEventsByState': { summary: 'Lọc sự kiện theo bộ lọc trạng thái.', tags: ['filter', 'sự-kiện'] },
  'sortEventsByStatePriority': { summary: 'Sắp xếp sự kiện theo ưu tiên trạng thái hiển thị.', tags: ['utility', 'sự-kiện'] },
  'mapApiEventToCard': { summary: 'Map API event sang model thẻ khám phá sự kiện.', tags: ['mapper', 'sự-kiện', 'api'] },
  'mapApiEventToHomeCard': { summary: 'Map API event sang model thẻ trang chủ.', tags: ['mapper', 'sự-kiện', 'api'] },
  'getFillPercent': { summary: 'Tính phần trăm lấp đầy suất đăng ký sự kiện.', tags: ['utility', 'sự-kiện'] },
  'filterEventsByCategory': { summary: 'Lọc sự kiện theo bộ lọc danh mục.', tags: ['filter', 'sự-kiện'] },
  'filterEventsBySearch': { summary: 'Lọc sự kiện theo từ khóa tìm kiếm.', tags: ['filter', 'sự-kiện'] },
  'getAnnouncementById': { summary: 'Tra cứu thông báo mock theo ID.', tags: ['utility', 'mock-data'] },
  'getGreeting': { summary: 'Sinh lời chào theo giờ trong ngày và tên người dùng.', tags: ['utility', 'mock-data'] },
  'getSidebarMenuSections': { summary: 'Trả về cấu hình menu sidebar dashboard sinh viên.', tags: ['utility', 'navigation'] },
  'readCachedProfile': { summary: 'Đọc hồ sơ người dùng đã cache trong sessionStorage.', tags: ['cache', 'hồ-sơ'] },
  'writeCachedProfile': { summary: 'Ghi hồ sơ người dùng vào sessionStorage.', tags: ['cache', 'hồ-sơ'] },
  'clearUserProfileCache': { summary: 'Xóa cache hồ sơ người dùng khỏi sessionStorage.', tags: ['cache', 'auth'] },
  'cacheUserProfile': { summary: 'API công khai để cache hồ sơ sau khi cập nhật.', tags: ['cache', 'hồ-sơ'] },
  'useUserProfile': { summary: 'Hook quản lý trạng thái đăng nhập và hồ sơ, fetch từ API user/profile.', tags: ['hook', 'react', 'auth'] },
  'CtsvLayout': { summary: 'Layout portal CTSV kiểm tra vai trò, quản lý sidebar và render outlet.', tags: ['layout', 'ctsv', 'auth'] },
};

function isSignificant(fn, exports) {
  const lines = fn.endLine - fn.startLine + 1;
  const exported = exports.some((e) => e.name === fn.name);
  return lines >= 10 || exported;
}

function fnComplexity(fn) {
  const lines = fn.endLine - fn.startLine + 1;
  if (lines >= 50) return 'complex';
  if (lines >= 15) return 'moderate';
  return 'simple';
}

const nodes = [];
const edges = [];

for (const file of extract.results) {
  const fp = file.path;
  const meta = fileMeta[fp];
  const name = path.basename(fp);
  nodes.push({
    id: `file:${fp}`,
    type: 'file',
    name,
    filePath: fp,
    summary: meta.summary,
    tags: meta.tags,
    complexity: meta.complexity,
    ...(meta.languageNotes ? { languageNotes: meta.languageNotes } : {}),
  });

  const exports = file.exports || [];
  for (const fn of file.functions || []) {
    if (!isSignificant(fn, exports)) continue;
    const fm = fnMeta[fn.name] || { summary: `Hàm ${fn.name} trong ${name}.`, tags: ['utility'] };
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
    edges.push({ source: `file:${fp}`, target: `function:${fp}:${fn.name}`, type: 'contains', direction: 'forward', weight: 1.0 });
    if (exports.some((e) => e.name === fn.name)) {
      edges.push({ source: `file:${fp}`, target: `function:${fp}:${fn.name}`, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }

  for (const imp of batchImport[fp] || []) {
    edges.push({ source: `file:${fp}`, target: `file:${imp}`, type: 'imports', direction: 'forward', weight: 0.7 });
  }
}

// Cross-batch calls
const calls = [
  ['function:FE/src/components/ClubDiscoveryCard.jsx:ClubDiscoveryCard', 'function:FE/src/data/clubDiscoveryData.js:getCategoryColor'],
  ['function:FE/src/components/ClubDiscoveryCard.jsx:ClubDiscoveryCard', 'function:FE/src/data/clubDiscoveryData.js:formatMemberCount'],
  ['function:FE/src/components/DashboardSidebarNav.jsx:DashboardSidebarNav', 'function:FE/src/data/studentSidebarMenu.js:getSidebarMenuSections'],
  ['function:FE/src/components/EventDiscoveryCard.jsx:EventDiscoveryCard', 'function:FE/src/data/eventDiscoveryData.js:getFillPercent'],
  ['function:FE/src/components/EventDiscoveryCard.jsx:EventDiscoveryCard', 'function:FE/src/data/eventDiscoveryData.js:getCategoryColor'],
  ['function:FE/src/components/SiteHeader.jsx:SiteHeader', 'function:FE/src/hooks/useUserProfile.js:useUserProfile'],
  ['function:FE/src/components/SiteHeader.jsx:SiteHeader', 'function:FE/src/hooks/useUserProfile.js:clearUserProfileCache'],
  ['function:FE/src/components/SiteHeader.jsx:SiteHeader', 'function:FE/src/utils/role.js:getRoleLabel'],
  ['function:FE/src/components/SiteHeader.jsx:SiteHeader', 'function:FE/src/utils/authEvents.js:dispatchAuthChanged'],
  ['function:FE/src/components/StudentDashboardLayout.jsx:StudentDashboardLayout', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/components/StudentDashboardLayout.jsx:StudentDashboardLayout', 'function:FE/src/utils/image.js:resolveUserAvatar'],
  ['function:FE/src/components/StudentDashboardLayout.jsx:StudentDashboardLayout', 'function:FE/src/hooks/useUserProfile.js:clearUserProfileCache'],
  ['function:FE/src/components/StudentDashboardLayout.jsx:StudentDashboardLayout', 'function:FE/src/utils/role.js:getRoleLabel'],
  ['function:FE/src/components/ctsv/CtsvPortalHeader.jsx:CtsvPortalHeader', 'function:FE/src/utils/logout.js:logoutWithConfirm'],
  ['function:FE/src/components/ctsv/CtsvPortalHeader.jsx:CtsvPortalHeader', 'function:FE/src/utils/auth.js:getRoleDisplayLabel'],
  ['function:FE/src/components/ctsv/CtsvPortalHeader.jsx:CtsvPortalHeader', 'function:FE/src/utils/auth.js:getUserRole'],
  ['function:FE/src/components/ctsv/CtsvSidebarAside.jsx:CtsvSidebarAside', 'function:FE/src/components/ctsv/ctsvNavConfig.js:isCtsvNavActive'],
  ['function:FE/src/components/ctsv/CtsvSidebarAside.jsx:CtsvSidebarAside', 'function:FE/src/components/ctsv/ctsvNavConfig.js:isCtsvDesktop'],
  ['function:FE/src/components/ctsv/CtsvSidebarAside.jsx:CtsvSidebarAside', 'function:FE/src/utils/auth.js:getRoleDisplayLabel'],
  ['function:FE/src/data/eventDetailData.js:mapApiEventToDetail', 'function:FE/src/data/eventDiscoveryData.js:getFillPercent'],
  ['function:FE/src/data/eventDetailData.js:mapApiEventToDetail', 'function:FE/src/data/eventDiscoveryData.js:getCategoryColor'],
  ['function:FE/src/data/eventDetailData.js:mapApiEventToDetail', 'function:FE/src/utils/ticketPricing.js:formatVnd'],
  ['function:FE/src/data/eventDiscoveryData.js:mapApiEventToCard', 'function:FE/src/utils/ticketPricing.js:formatVnd'],
  ['function:FE/src/hooks/useUserProfile.js:useUserProfile', 'function:FE/src/utils/api.js:getAuthHeaders'],
  ['function:FE/src/hooks/useUserProfile.js:useUserProfile', 'function:FE/src/utils/image.js:resolveUserAvatar'],
  ['function:FE/src/hooks/useUserProfile.js:cacheUserProfile', 'function:FE/src/hooks/useUserProfile.js:writeCachedProfile'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/components/ctsv/ctsvNavConfig.js:persistSidebarOpen'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/components/ctsv/ctsvNavConfig.js:isCtsvDesktop'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/utils/auth.js:isCtsvRole'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/utils/auth.js:normalizeRole'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/utils/logout.js:logoutWithConfirm'],
  ['function:FE/src/layouts/CtsvLayout.jsx:CtsvLayout', 'function:FE/src/utils/image.js:resolveUserAvatar'],
  ['function:FE/src/data/clubDetailData.js:mapApiClubToDetail', 'function:FE/src/data/clubDetailData.js:buildClubDetailFromList'],
  ['function:FE/src/data/clubDetailData.js:getClubDetailById', 'function:FE/src/data/clubDetailData.js:buildClubDetailFromList'],
  ['function:FE/src/data/eventDetailData.js:mapApiEventToDetail', 'function:FE/src/data/eventDetailData.js:getRegistrationStatus'],
  ['function:FE/src/data/eventDetailData.js:mapApiEventToDetail', 'function:FE/src/data/eventDetailData.js:getPrimaryActionLabel'],
];
for (const [s, t] of calls) {
  edges.push({ source: s, target: t, type: 'calls', direction: 'forward', weight: 0.8 });
}

// depends_on for layout composition
const depends = [
  ['file:FE/src/components/StudentDashboardLayout.jsx', 'file:FE/src/components/DashboardSidebarNav.jsx'],
  ['file:FE/src/components/SiteHeader.jsx', 'file:FE/src/components/ProfileSidebarMenu.jsx'],
  ['file:FE/src/components/ctsv/CtsvPortalHeader.jsx', 'file:FE/src/components/ctsv/CtsvHamburgerButton.jsx'],
  ['file:FE/src/components/ctsv/CtsvPortalHeader.jsx', 'file:FE/src/components/ctsv/CtsvProfileMenu.jsx'],
  ['file:FE/src/layouts/CtsvLayout.jsx', 'file:FE/src/components/ctsv/CtsvPortalHeader.jsx'],
  ['file:FE/src/layouts/CtsvLayout.jsx', 'file:FE/src/components/ctsv/CtsvSidebarAside.jsx'],
  ['file:FE/src/layouts/CtsvLayout.jsx', 'file:FE/src/components/ctsv/CtsvPortalFooter.jsx'],
  ['file:FE/src/data/eventDetailData.js', 'file:FE/src/data/eventDiscoveryData.js'],
  ['file:FE/src/data/eventDetailData.js', 'file:FE/src/data/speakerSeedData.js'],
];
for (const [s, t] of depends) {
  edges.push({ source: s, target: t, type: 'depends_on', direction: 'forward', weight: 0.6 });
}

const outDir = path.join(ROOT, '.understand-anything/intermediate');
const nodeCount = nodes.length;
const edgeCount = edges.length;
console.log('nodes:', nodeCount, 'edges:', edgeCount);

const importEdges = edges.filter((e) => e.type === 'imports').length;
console.log('import edges:', importEdges, 'expected:', 45);

const files = extract.results.map((r) => r.path).sort();
const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
if (parts <= 1) {
  fs.writeFileSync(path.join(outDir, 'batch-2.json'), JSON.stringify({ nodes, edges }, null, 2));
  console.log('Wrote batch-2.json');
} else {
  const chunkSize = Math.ceil(files.length / parts);
  for (let p = 0; p < parts; p++) {
    const partFiles = new Set(files.slice(p * chunkSize, (p + 1) * chunkSize));
    const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
    const partNodeIds = new Set(partNodes.map((n) => n.id));
    const partEdges = edges.filter((e) => partNodeIds.has(e.source));
    fs.writeFileSync(
      path.join(outDir, `batch-2-part-${p + 1}.json`),
      JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)
    );
    console.log(`Wrote batch-2-part-${p + 1}.json nodes=${partNodes.length} edges=${partEdges.length}`);
  }
}
