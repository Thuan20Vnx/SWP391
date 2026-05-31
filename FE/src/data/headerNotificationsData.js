/** Thông báo header — demo; có thể thay bằng API sau */

export const HEADER_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Tài khoản mới được tạo',
    body: 'Admin vừa thêm tài khoản Partner vào hệ thống.',
    time: 'Vừa xong',
    unread: true,
    tone: 'info',
  },
  {
    id: 'n2',
    title: 'Yêu cầu phê duyệt sự kiện',
    body: '3 đề xuất sự kiện CLB đang chờ CTSV xử lý.',
    time: '12 phút trước',
    unread: true,
    tone: 'warning',
  },
  {
    id: 'n3',
    title: 'Hệ thống email',
    body: 'SMTP hoạt động bình thường — tỷ lệ gửi thành công 99.2%.',
    time: '1 giờ trước',
    unread: false,
    tone: 'success',
  },
  {
    id: 'n4',
    title: 'Cảnh báo đăng nhập',
    body: 'Phát hiện 2 lần đăng nhập thất bại từ IP lạ.',
    time: 'Hôm qua',
    unread: false,
    tone: 'alert',
  },
];

export const CLUB_HEADER_NOTIFICATIONS = [
  {
    id: 'c1',
    title: 'Sự kiện đã được duyệt',
    body: 'Đề xuất sự kiện "Xuân Nhân đánh PickleBall" đã được phòng CTSV phê duyệt.',
    time: 'Vừa xong',
    unread: true,
    tone: 'success',
  },
  {
    id: 'c2',
    title: 'Sự kiện bị từ chối',
    body: 'Đề xuất sự kiện "Liinh yêu Thuận" bị từ chối. Lý do: Nội dung không phù hợp.',
    time: '12 phút trước',
    unread: true,
    tone: 'alert',
  },
  {
    id: 'c3',
    title: 'Sự kiện đang chờ duyệt',
    body: 'Đề xuất "Hiệp Cầu Hôn Lệ" đã được gửi thành công và đang chờ CTSV xét duyệt.',
    time: '1 giờ trước',
    unread: false,
    tone: 'warning',
  },
  {
    id: 'c4',
    title: 'Cập nhật trạng thái',
    body: 'Sự kiện "Thuận và Linh múa cột" đã được cập nhật thông tin.',
    time: 'Hôm qua',
    unread: false,
    tone: 'info',
  },
];

export const ADMIN_HEADER_NOTIFICATIONS = [
  {
    id: 'a1',
    title: 'Kiểm soát tài khoản',
    body: 'Có tài khoản Khách tham gia chờ kích hoạt.',
    time: 'Vừa xong',
    unread: true,
    tone: 'info',
  },
  {
    id: 'a2',
    title: 'Log hệ thống',
    body: 'Backup cơ sở dữ liệu FEventsDB hoàn tất lúc 02:00.',
    time: '30 phút trước',
    unread: true,
    tone: 'success',
  },
  {
    id: 'a3',
    title: 'Thanh toán',
    body: 'Cổng VNPay báo độ trễ nhẹ — theo dõi thêm.',
    time: '2 giờ trước',
    unread: false,
    tone: 'warning',
  },
];
