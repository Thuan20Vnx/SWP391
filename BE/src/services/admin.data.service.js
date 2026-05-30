const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const ClubFollow = require('../models/ClubFollow');
const Partner = require('../models/Partner');
const Contract = require('../models/Contract');
const EventRegistration = require('../models/EventRegistration');
const EventReview = require('../models/EventReview');
const Announcement = require('../models/Announcement');
const SchoolMember = require('../models/SchoolMember');

const CORE_COLLECTIONS = [
  {
    id: 'users',
    label: 'Người dùng',
    model: User,
    description: 'Tài khoản, phân quyền, mật khẩu',
    critical: true,
  },
  {
    id: 'events',
    label: 'Sự kiện',
    model: Event,
    description: 'Sự kiện đã duyệt và trạng thái publish',
    critical: true,
  },
  {
    id: 'eventproposals',
    label: 'Đề xuất sự kiện',
    model: EventProposal,
    description: 'Đề xuất từ CLB chờ duyệt',
    critical: true,
  },
  {
    id: 'clubs',
    label: 'Câu lạc bộ',
    model: Club,
    description: 'Thông tin CLB và trạng thái hoạt động',
    critical: true,
  },
  {
    id: 'clubmemberships',
    label: 'Thành viên CLB',
    model: ClubMembership,
    description: 'Yêu cầu tham gia và membership',
    critical: false,
  },
  {
    id: 'clubfollows',
    label: 'Theo dõi CLB',
    model: ClubFollow,
    description: 'Sinh viên theo dõi CLB',
    critical: false,
  },
  {
    id: 'partners',
    label: 'Đối tác',
    model: Partner,
    description: 'Đối tác tài trợ / hợp tác',
    critical: false,
  },
  {
    id: 'contracts',
    label: 'Hợp đồng',
    model: Contract,
    description: 'Hợp đồng đối tác sự kiện',
    critical: false,
  },
  {
    id: 'eventregistrations',
    label: 'Đăng ký sự kiện',
    model: EventRegistration,
    description: 'Vé và đăng ký tham dự',
    critical: false,
  },
  {
    id: 'eventreviews',
    label: 'Đánh giá sự kiện',
    model: EventReview,
    description: 'Feedback sau sự kiện',
    critical: false,
  },
  {
    id: 'announcements',
    label: 'Thông báo',
    model: Announcement,
    description: 'Tin tức và thông báo hệ thống',
    critical: false,
  },
  {
    id: 'schoolmembers',
    label: 'Whitelist MSSV',
    model: SchoolMember,
    description: 'Danh sách sinh viên FPT hợp lệ',
    critical: true,
  },
];

const getDataOverview = async () => {
  const conn = mongoose.connection;
  const collections = await Promise.all(
    CORE_COLLECTIONS.map(async (item) => {
      const count = await item.model.countDocuments();
      return {
        id: item.id,
        label: item.label,
        description: item.description,
        critical: item.critical,
        count,
        collectionName: item.model.collection.name,
      };
    }),
  );

  const totalRecords = collections.reduce((sum, c) => sum + c.count, 0);
  const criticalRecords = collections
    .filter((c) => c.critical)
    .reduce((sum, c) => sum + c.count, 0);

  return {
    database: conn.name || 'FEventsDB',
    host: conn.host || '—',
    readyState: conn.readyState,
    totalRecords,
    criticalRecords,
    collections,
    checkedAt: new Date().toISOString(),
  };
};

module.exports = {
  getDataOverview,
  CORE_COLLECTIONS,
};
