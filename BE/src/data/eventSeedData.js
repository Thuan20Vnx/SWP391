/**

 * Dữ liệu mẫu sự kiện — đồng bộ với Figma SWP391_2 node 189:2

 * Tất cả sự kiện tổ chức trong khuôn viên trường

 * Dùng bởi seed-events.js (Code First → MongoDB)

 */



const { EVENT_CAMPUS } = require('../constants/eventVenues');



const eventSeedData = [

  {

    title: 'FPT Techday 2024: Kiến tạo tương lai số',

    description: 'Sự kiện công nghệ lớn nhất trong năm với các phiên thảo luận về AI, chuyển đổi số và giải pháp bền vững.',

    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',

    category: 'Công nghệ',

    startDate: new Date('2024-10-25T08:00:00+07:00'),

    endDate: new Date('2024-10-25T18:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Sảnh tòa Gamma',

    capacity: 200,

    registeredCount: 180,

    status: 'approved',

    eventState: 'expired',

  },

  {

    title: 'Lễ hội Văn hóa FPT: Bản sắc Việt Nam',

    description: 'Khám phá và trải nghiệm văn hóa truyền thống Việt Nam qua các hoạt động ngoại khóa sôi nổi.',

    thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6bd7d6b3?auto=format&fit=crop&w=800&q=80',

    category: 'Văn hóa',

    startDate: new Date('2026-11-15T09:00:00+07:00'),

    endDate: new Date('2026-11-15T21:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Sảnh tòa Beta',

    capacity: 500,

    registeredCount: 450,

    status: 'approved',

    eventState: 'active',

  },

  {

    title: 'Diễn đàn Kinh tế Trẻ 4.0',

    description: 'Kết nối sinh viên với chuyên gia kinh tế, khởi nghiệp và chuyển đổi số trong doanh nghiệp.',

    thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',

    category: 'Kinh tế',

    startDate: new Date('2026-12-02T13:00:00+07:00'),

    endDate: new Date('2026-12-02T17:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Tầng 5 tòa Alpha',

    capacity: 100,

    registeredCount: 85,

    status: 'approved',

    eventState: 'active',

  },

  {

    title: 'Workshop: Kỹ năng tranh biện (Debate)',

    description: 'Rèn luyện tư duy phản biện và kỹ năng thuyết trình qua các phiên debate thực hành.',

    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',

    category: 'Học thuật',

    startDate: new Date('2024-05-10T14:00:00+07:00'),

    endDate: new Date('2024-05-10T17:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Tầng 5 tòa Alpha',

    capacity: 50,

    registeredCount: 50,

    status: 'approved',

    eventState: 'expired',

  },

  {

    title: 'Workshop Lập trình Nhúng',

    description: 'Thực hành lập trình vi điều khiển ARM và IoT cơ bản dành cho sinh viên CNTT.',

    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=800&q=80',

    category: 'Công nghệ',

    startDate: new Date('2026-06-20T08:00:00+07:00'),

    endDate: new Date('2026-06-20T12:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Tầng 4 tòa Beta',

    capacity: 40,

    registeredCount: 0,

    status: 'approved',

    eventState: 'postponed',

    postponeReason: 'Lý do: Do điều kiện thời tiết',

  },

  {

    title: 'Triển lãm Nghệ thuật Đương đại F-Art',

    description: 'Trưng bày tác phẩm nghệ thuật đương đại của sinh viên và nghệ sĩ trẻ tại FPT.',

    thumbnail: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a2b?auto=format&fit=crop&w=800&q=80',

    category: 'Nghệ thuật',

    startDate: new Date('2026-12-20T10:00:00+07:00'),

    endDate: new Date('2026-12-22T18:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Sảnh tòa Gamma',

    capacity: 150,

    registeredCount: 120,

    status: 'approved',

    eventState: 'active',

  },

  {

    title: 'F-Fest 2026: Giai điệu mùa hè',

    description: 'Đêm nhạc dành cho sinh viên FPT với nhiều tiết mục biểu diễn và mini game.',

    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',

    category: 'Âm nhạc',

    startDate: new Date('2026-05-20T19:00:00+07:00'),

    endDate: new Date('2026-05-20T23:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Sảnh tòa Beta',

    capacity: 200,

    registeredCount: 185,

    status: 'approved',

    eventState: 'active',

  },

  {

    title: 'Hackathon 2026: Innovate for Green',

    description: 'Cuộc thi lập trình 24h hướng tới giải pháp công nghệ xanh và bền vững.',

    thumbnail: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',

    category: 'Công nghệ',

    startDate: new Date('2026-05-25T08:00:00+07:00'),

    endDate: new Date('2026-05-26T08:00:00+07:00'),

    campus: EVENT_CAMPUS,

    location: 'Tầng 4 tòa Beta',

    capacity: 150,

    registeredCount: 30,

    status: 'approved',

    eventState: 'active',

  },

];



module.exports = eventSeedData;

