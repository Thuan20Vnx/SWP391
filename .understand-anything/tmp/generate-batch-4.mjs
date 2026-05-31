import fs from 'fs';
import path from 'path';

const projectRoot = 'c:/Users/Thuan/OneDrive/Documents/SWP391_Project/SWP391-1';
const extract = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-file-extract-results-4.json'), 'utf8'));
const batches = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/intermediate/batches.json'), 'utf8'));
const batch = batches.batches.find(b => b.batchIndex === 4);
const batchImportData = batch.batchImportData;

const fileMeta = {
  'FE/src/App.jsx': { summary: 'Thành phần gốc React Router định nghĩa toàn bộ tuyến đường, bảo vệ phiên đăng nhập theo vai trò và hiển thị hệ thống toast toàn cục.', tags: ['entry-point', 'routing', 'middleware', 'component'], complexity: 'complex' },
  'FE/src/components/Toast.jsx': { summary: 'Hệ thống thông báo toast với biểu tượng theo loại, hiệu ứng fade và container cố định góc màn hình.', tags: ['component', 'ui', 'notification', 'event-handler'], complexity: 'moderate' },
  'FE/src/components/ctsv/BannerCropModal.jsx': { summary: 'Modal cắt và căn chỉnh ảnh banner sự kiện CTSV với zoom, kéo thả và xuất preview trước khi tải lên.', tags: ['component', 'ctsv', 'image-crop', 'modal'], complexity: 'complex' },
  'FE/src/components/ctsv/CtsvActionIcon.jsx': { summary: 'Component icon hành động tái sử dụng cho các thao tác trong giao diện cổng CTSV.', tags: ['component', 'ctsv', 'ui', 'icon'], complexity: 'simple' },
  'FE/src/components/ctsv/CtsvNavIcon.jsx': { summary: 'Icon điều hướng sidebar CTSV với trạng thái active và nhãn cho từng mục menu.', tags: ['component', 'ctsv', 'navigation', 'icon'], complexity: 'moderate' },
  'FE/src/components/ctsv/PartnerActionDialog.jsx': { summary: 'Hộp thoại xác nhận hành động đối tác (duyệt, từ chối, yêu cầu bổ sung) trong luồng quản lý CTSV.', tags: ['component', 'ctsv', 'dialog', 'validation'], complexity: 'moderate' },
  'FE/src/components/profile/AvatarCropModal.jsx': { summary: 'Modal cắt ảnh đại diện người dùng hoặc diễn giả với tỷ lệ vuông, zoom và xuất blob để upload.', tags: ['component', 'profile', 'image-crop', 'modal'], complexity: 'complex' },
  'FE/src/components/ui/AppSelect.jsx': { summary: 'Dropdown select tùy chỉnh hỗ trợ tìm kiếm, placeholder và styling thống nhất cho toàn ứng dụng.', tags: ['component', 'ui', 'form', 'utility'], complexity: 'moderate' },
  'FE/src/components/ui/ConfirmDialog.jsx': { summary: 'Hộp thoại xác nhận generic với tiêu đề, mô tả và nút hủy/xác nhận cho các thao tác nguy hiểm.', tags: ['component', 'ui', 'dialog', 'validation'], complexity: 'simple' },
  'FE/src/constants/eventCategories.js': { summary: 'Hằng số danh mục sự kiện trường và hàm chuẩn hóa giá trị category cho form CTSV.', tags: ['type-definition', 'constants', 'event', 'validation'], complexity: 'simple' },
  'FE/src/constants/eventSpeaker.js': { summary: 'Cấu hình diễn giả sự kiện: giới hạn ảnh, tạo hàng trống và chuẩn hóa payload speakers khi gửi API.', tags: ['type-definition', 'constants', 'event', 'serialization'], complexity: 'simple' },
  'FE/src/constants/eventVenues.js': { summary: 'Danh sách địa điểm tổ chức sự kiện cố định dùng trong form tạo sự kiện sinh viên.', tags: ['type-definition', 'constants', 'event'], complexity: 'simple' },
  'FE/src/constants/eventWorkflow.js': { summary: 'Trạng thái workflow sự kiện trường và helper kiểm tra quyền publish, chỉnh sửa và chờ duyệt admin.', tags: ['type-definition', 'constants', 'workflow', 'validation'], complexity: 'simple' },
  'FE/src/hooks/useSettingsPreferences.js': { summary: 'Hook quản lý cài đặt người dùng (dark mode, ngôn ngữ) lưu localStorage và áp dụng theme khi khởi động.', tags: ['hook', 'settings', 'persistence', 'utility'], complexity: 'moderate', languageNotes: 'React hook kết hợp localStorage và DOM classList cho dark mode.' },
  'FE/src/main.jsx': { summary: 'Điểm mount React DOM, import stylesheet toàn cục và render ứng dụng vào #root.', tags: ['entry-point', 'bootstrap', 'react'], complexity: 'simple' },
  'FE/src/pages/AdminDashboard.jsx': { summary: 'Trang tổng quan admin ICPDP với thống kê và liên kết nhanh tới các luồng phê duyệt.', tags: ['component', 'admin', 'dashboard', 'api-handler'], complexity: 'moderate' },
  'FE/src/pages/CreateEvent.jsx': { summary: 'Form tạo sự kiện phía sinh viên với chọn địa điểm, thời gian và thông tin cơ bản.', tags: ['component', 'event', 'form', 'api-handler'], complexity: 'moderate' },
  'FE/src/pages/CtsvHome.jsx': { summary: 'Trang chủ cổng CTSV hiển thị thống kê, sự kiện nổi bật và bộ lọc trạng thái sự kiện trường.', tags: ['component', 'ctsv', 'dashboard', 'api-handler'], complexity: 'complex' },
  'FE/src/pages/ForgotPassword.jsx': { summary: 'Trang yêu cầu đặt lại mật khẩu qua email với validation và gọi API auth.', tags: ['component', 'auth', 'form', 'api-handler'], complexity: 'moderate' },
  'FE/src/pages/ResetPassword.jsx': { summary: 'Trang đặt mật khẩu mới từ token reset, kiểm tra độ mạnh và xác nhận khớp mật khẩu.', tags: ['component', 'auth', 'form', 'validation'], complexity: 'complex' },
  'FE/src/pages/StaticPage.jsx': { summary: 'Trang nội dung tĩnh (điều khoản, hướng dẫn) render markdown theo slug route.', tags: ['component', 'content', 'routing'], complexity: 'moderate' },
  'FE/src/pages/admin/AdminPartnerApprovals.jsx': { summary: 'Trang admin duyệt hồ sơ đối tác với danh sách, lọc trạng thái và hành động approve/reject.', tags: ['component', 'admin', 'api-handler', 'validation'], complexity: 'moderate' },
  'FE/src/pages/admin/AdminSchoolEventApprovals.jsx': { summary: 'Trang admin phê duyệt sự kiện trường, hiển thị chi tiết và workflow trạng thái từ constants.', tags: ['component', 'admin', 'event', 'api-handler'], complexity: 'moderate' },
};

const funcMeta = {
  'FE/src/App.jsx:App': { summary: 'Cấu hình BrowserRouter, state toast toàn cục và đăng ký toàn bộ route public, sinh viên, CTSV và admin.', tags: ['entry-point', 'routing', 'component'] },
  'FE/src/App.jsx:ProtectedRoute': { summary: 'Route guard kiểm tra token localStorage, chuyển hướng login nếu chưa đăng nhập.', tags: ['middleware', 'auth', 'routing'] },
  'FE/src/App.jsx:CtsvProtectedRoute': { summary: 'Route guard giới hạn cổng CTSV, yêu cầu đăng nhập và vai trò CTSV hợp lệ.', tags: ['middleware', 'auth', 'ctsv'] },
  'FE/src/App.jsx:PublicHomeRoute': { summary: 'Route trang chủ công khai, tự chuyển CTSV về dashboard nếu đã đăng nhập vai trò CTSV.', tags: ['middleware', 'routing', 'ctsv'] },
  'FE/src/components/Toast.jsx:ToastIcon': { summary: 'Render SVG icon theo loại toast (success, error, warning, info).', tags: ['component', 'ui', 'icon'] },
  'FE/src/components/Toast.jsx:ToastItem': { summary: 'Một toast đơn lẻ với timer tự ẩn, fade-out và callback onRemove.', tags: ['component', 'event-handler', 'notification'] },
  'FE/src/components/Toast.jsx:ToastContainer': { summary: 'Container cố định góc phải dưới chứa danh sách ToastItem.', tags: ['component', 'ui', 'notification'] },
  'FE/src/components/ctsv/BannerCropModal.jsx:BannerCropModal': { summary: 'UI modal cắt banner với canvas preview, điều khiển zoom/pan và gọi cropBannerImage trước khi confirm.', tags: ['component', 'image-crop', 'modal'] },
  'FE/src/components/ctsv/CtsvActionIcon.jsx:CtsvActionIcon': { summary: 'Render nút icon hành động với tooltip và variant màu theo loại thao tác.', tags: ['component', 'ctsv', 'ui'] },
  'FE/src/components/ctsv/CtsvNavIcon.jsx:CtsvNavIcon': { summary: 'Link sidebar CTSV kèm icon SVG và highlight khi route khớp.', tags: ['component', 'navigation', 'ctsv'] },
  'FE/src/components/ctsv/PartnerActionDialog.jsx:PartnerActionDialog': { summary: 'Dialog modal thu thập lý do và xác nhận hành động duyệt/từ chối đối tác.', tags: ['component', 'dialog', 'validation'] },
  'FE/src/components/profile/AvatarCropModal.jsx:AvatarCropModal': { summary: 'Modal cắt avatar vuông với cropAvatarImage/cropAvatarPreview và trả blob cho upload.', tags: ['component', 'image-crop', 'profile'] },
  'FE/src/components/ui/AppSelect.jsx:AppSelect': { summary: 'Select dropdown có thể tìm kiếm, keyboard-friendly và custom render option.', tags: ['component', 'form', 'ui'] },
  'FE/src/components/ui/ConfirmDialog.jsx:ConfirmDialog': { summary: 'Overlay dialog xác nhận với props title, message và onConfirm/onCancel.', tags: ['component', 'dialog', 'ui'] },
  'FE/src/constants/eventCategories.js:normalizeEventCategory': { summary: 'Chuẩn hóa chuỗi category về giá trị hợp lệ trong EVENT_CATEGORIES hoặc fallback mặc định.', tags: ['utility', 'validation', 'event'] },
  'FE/src/constants/eventSpeaker.js:createEmptySpeakerRow': { summary: 'Tạo object speaker rỗng với các trường mặc định cho form thêm diễn giả.', tags: ['factory', 'event', 'form'] },
  'FE/src/constants/eventSpeaker.js:normalizeSpeakerPayload': { summary: 'Chuẩn hóa một speaker trước khi gửi API, loại bỏ trường rỗng.', tags: ['serialization', 'validation', 'event'] },
  'FE/src/constants/eventSpeaker.js:buildSpeakersPayload': { summary: 'Map mảng speakers form thành payload API đã chuẩn hóa.', tags: ['serialization', 'event', 'utility'] },
  'FE/src/constants/eventSpeaker.js:resolveEventSpeakers': { summary: 'Giải quyết danh sách speakers từ dữ liệu sự kiện API về format hiển thị form.', tags: ['utility', 'event', 'serialization'] },
  'FE/src/constants/eventWorkflow.js:canCtsvPublishSchoolEvent': { summary: 'Kiểm tra sự kiện trường có đủ điều kiện để CTSV publish hay không.', tags: ['validation', 'workflow', 'ctsv'] },
  'FE/src/constants/eventWorkflow.js:canCtsvEditSchoolEvent': { summary: 'Kiểm tra trạng thái sự kiện có nằm trong danh sách cho phép chỉnh sửa.', tags: ['validation', 'workflow', 'ctsv'] },
  'FE/src/constants/eventWorkflow.js:isSchoolEventPendingAdmin': { summary: 'Xác định sự kiện đang chờ phê duyệt từ admin ICPDP.', tags: ['validation', 'workflow', 'admin'] },
  'FE/src/hooks/useSettingsPreferences.js:loadSettings': { summary: 'Đọc cài đặt từ localStorage, merge với DEFAULT_SETTINGS nếu thiếu khóa.', tags: ['utility', 'persistence', 'settings'] },
  'FE/src/hooks/useSettingsPreferences.js:saveSettings': { summary: 'Ghi object cài đặt vào localStorage dưới khóa cố định.', tags: ['utility', 'persistence', 'settings'] },
  'FE/src/hooks/useSettingsPreferences.js:applyDarkMode': { summary: 'Bật/tắt class dark trên document.documentElement theo preference.', tags: ['utility', 'settings', 'theme'] },
  'FE/src/hooks/useSettingsPreferences.js:initThemeFromStorage': { summary: 'Khởi tạo theme khi app load bằng cách gọi loadSettings và applyDarkMode.', tags: ['utility', 'bootstrap', 'theme'] },
  'FE/src/hooks/useSettingsPreferences.js:useSettingsPreferences': { summary: 'Hook React expose settings state, setter và hàm toggle dark mode có persist.', tags: ['hook', 'settings', 'react'] },
  'FE/src/pages/AdminDashboard.jsx:AdminDashboard': { summary: 'Dashboard admin với card thống kê và navigation tới phê duyệt đối tác/sự kiện.', tags: ['component', 'admin', 'dashboard'] },
  'FE/src/pages/CreateEvent.jsx:CreateEvent': { summary: 'Form wizard tạo sự kiện sinh viên với AppSelect địa điểm và submit API.', tags: ['component', 'form', 'event'] },
  'FE/src/pages/CtsvHome.jsx:CtsvEventCard': { summary: 'Card hiển thị một sự kiện CTSV với badge trạng thái và link chi tiết.', tags: ['component', 'ctsv', 'event'] },
  'FE/src/pages/CtsvHome.jsx:CtsvHome': { summary: 'Trang chủ CTSV fetch stats/events, lọc theo trạng thái và render lưới CtsvEventCard.', tags: ['component', 'ctsv', 'api-handler'] },
  'FE/src/pages/ForgotPassword.jsx:ForgotPassword': { summary: 'Form nhập email gửi yêu cầu reset password với feedback lỗi/thành công.', tags: ['component', 'auth', 'form'] },
  'FE/src/pages/ResetPassword.jsx:ResetPassword': { summary: 'Form đặt mật khẩu mới từ query token, validate và gọi API reset.', tags: ['component', 'auth', 'validation'] },
  'FE/src/pages/StaticPage.jsx:StaticPage': { summary: 'Đọc slug từ URL, tra cứu nội dung tĩnh và render HTML/markdown an toàn.', tags: ['component', 'content', 'routing'] },
  'FE/src/pages/admin/AdminPartnerApprovals.jsx:AdminPartnerApprovals': { summary: 'Bảng duyệt đối tác với fetch admin API, format hiển thị và nút approve/reject.', tags: ['component', 'admin', 'api-handler'] },
  'FE/src/pages/admin/AdminSchoolEventApprovals.jsx:AdminSchoolEventApprovals': { summary: 'Danh sách sự kiện trường chờ duyệt với chi tiết, label workflow và hành động admin.', tags: ['component', 'admin', 'event'] },
};

function isSignificant(f, exports) {
  const lines = f.endLine - f.startLine + 1;
  const exported = (exports || []).some(e => e.name === f.name);
  return lines >= 10 || exported;
}

function funcComplexity(f) {
  const lines = f.endLine - f.startLine + 1;
  if (lines >= 80) return 'complex';
  if (lines >= 30) return 'moderate';
  return 'simple';
}

const nodes = [];
const edges = [];

for (const r of extract.results) {
  const fp = r.path;
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

  for (const f of (r.functions || [])) {
    if (!isSignificant(f, r.exports)) continue;
    const key = `${fp}:${f.name}`;
    const fm = funcMeta[key] || { summary: `Hàm ${f.name} trong ${name}.`, tags: ['utility'] };
    nodes.push({
      id: `function:${fp}:${f.name}`,
      type: 'function',
      name: f.name,
      filePath: fp,
      lineRange: [f.startLine, f.endLine],
      summary: fm.summary,
      tags: fm.tags,
      complexity: funcComplexity(f),
    });
    edges.push({ source: `file:${fp}`, target: `function:${fp}:${f.name}`, type: 'contains', direction: 'forward', weight: 1.0 });
    if ((r.exports || []).some(e => e.name === f.name)) {
      edges.push({ source: `file:${fp}`, target: `function:${fp}:${f.name}`, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }
}

for (const [fp, imports] of Object.entries(batchImportData)) {
  for (const imp of imports) {
    edges.push({ source: `file:${fp}`, target: `file:${imp}`, type: 'imports', direction: 'forward', weight: 0.7 });
  }
}

const callEdges = [
  ['function:FE/src/App.jsx:CtsvProtectedRoute', 'function:FE/src/utils/auth.js:isCtsvRole', 'calls'],
  ['function:FE/src/App.jsx:PublicHomeRoute', 'function:FE/src/utils/auth.js:isCtsvRole', 'calls'],
  ['function:FE/src/App.jsx:App', 'function:FE/src/utils/auth.js:isCtsvRole', 'calls'],
  ['function:FE/src/App.jsx:App', 'function:FE/src/utils/auth.js:getUserRole', 'calls'],
  ['function:FE/src/App.jsx:App', 'function:FE/src/utils/auth.js:getHomePathForRole', 'calls'],
  ['function:FE/src/components/ctsv/BannerCropModal.jsx:BannerCropModal', 'function:FE/src/utils/cropImage.js:cropBannerImage', 'calls'],
  ['function:FE/src/components/ctsv/BannerCropModal.jsx:BannerCropModal', 'function:FE/src/utils/cropImage.js:cropBannerPreview', 'calls'],
  ['function:FE/src/components/profile/AvatarCropModal.jsx:AvatarCropModal', 'function:FE/src/utils/cropImage.js:cropAvatarImage', 'calls'],
  ['function:FE/src/components/profile/AvatarCropModal.jsx:AvatarCropModal', 'function:FE/src/utils/cropImage.js:cropAvatarPreview', 'calls'],
  ['function:FE/src/pages/CtsvHome.jsx:CtsvHome', 'function:FE/src/services/ctsvApi.js:fetchCtsvStats', 'calls'],
  ['function:FE/src/pages/CtsvHome.jsx:CtsvHome', 'function:FE/src/services/ctsvApi.js:fetchCtsvEvents', 'calls'],
  ['function:FE/src/pages/CtsvHome.jsx:CtsvHome', 'function:FE/src/utils/ctsvEventAccess.js:getCtsvEventAccess', 'calls'],
  ['function:FE/src/pages/CtsvHome.jsx:CtsvHome', 'function:FE/src/utils/eventStatus.js:statusClass', 'calls'],
  ['function:FE/src/pages/admin/AdminPartnerApprovals.jsx:AdminPartnerApprovals', 'function:FE/src/services/adminApi.js:fetchAdminPartners', 'calls'],
  ['function:FE/src/pages/admin/AdminPartnerApprovals.jsx:AdminPartnerApprovals', 'function:FE/src/utils/partnerDisplay.js:partnerInitials', 'calls'],
  ['function:FE/src/pages/admin/AdminSchoolEventApprovals.jsx:AdminSchoolEventApprovals', 'function:FE/src/services/adminApi.js:fetchAdminSchoolEvents', 'calls'],
  ['function:FE/src/pages/admin/AdminSchoolEventApprovals.jsx:AdminSchoolEventApprovals', 'function:FE/src/constants/eventWorkflow.js:isSchoolEventPendingAdmin', 'calls'],
  ['function:FE/src/pages/CreateEvent.jsx:CreateEvent', 'function:FE/src/components/ui/AppSelect.jsx:AppSelect', 'depends_on'],
  ['file:FE/src/main.jsx', 'file:FE/src/App.jsx', 'depends_on'],
  ['function:FE/src/App.jsx:App', 'function:FE/src/components/Toast.jsx:ToastContainer', 'depends_on'],
  ['function:FE/src/App.jsx:App', 'function:FE/src/hooks/useSettingsPreferences.js:initThemeFromStorage', 'depends_on'],
];
for (const [src, tgt, type] of callEdges) {
  edges.push({ source: src, target: tgt, type, direction: 'forward', weight: type === 'depends_on' ? 0.6 : 0.8 });
}

const files = extract.results.map(r => r.path).sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;
const parts = (nodeCount > 60 || edgeCount > 120) ? 2 : 1;
const chunkSize = Math.ceil(files.length / parts);
const outDir = path.join(projectRoot, '.understand-anything/intermediate');

for (let p = 0; p < parts; p++) {
  const partFiles = new Set(files.slice(p * chunkSize, (p + 1) * chunkSize));
  const partNodes = nodes.filter(n => partFiles.has(n.filePath));
  const partNodeIds = new Set(partNodes.map(n => n.id));
  const partEdges = edges.filter(e => partNodeIds.has(e.source));
  const suffix = parts > 1 ? `-part-${p + 1}` : '';
  const outPath = path.join(outDir, `batch-4${suffix}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2));
  console.log(`Wrote ${outPath}: ${partNodes.length} nodes, ${partEdges.length} edges`);
}

const importEdges = edges.filter(e => e.type === 'imports');
const expected = Object.values(batchImportData).reduce((s, a) => s + a.length, 0);
console.log(`Import edges: ${importEdges.length} (expected ${expected})`);
console.log(`Total nodes: ${nodeCount}, total edges: ${edgeCount}, parts: ${parts}`);
