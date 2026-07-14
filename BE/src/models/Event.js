const mongoose = require('mongoose');
const { EVENT_CATEGORIES, normalizeEventCategory } = require('../constants/eventCategories');
const { EVENT_CAMPUS, EVENT_VENUES } = require('../constants/eventVenues');
const { syncPrimarySpeakerFields } = require('../constants/eventSpeaker');
const { EVENT_STATUSES } = require('../constants/eventWorkflow');
const { clearEventCache } = require('../utils/eventCache');

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    priceType: { type: String, enum: ['free', 'paid'], default: 'free' },
    priceAmount: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    audience: { type: String, default: 'SV FPT' }
  },
  { _id: false }
);

const speakerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    avatar: { type: String, default: '' }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: ''
    },
    thumbnail: {
      type: String,
      default:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80'
    },
    image: { type: String, default: '' },
    /** jpg|png|webp — ảnh bìa lưu tại uploads/event-covers/{id}.{ext} */
    coverFileExt: { type: String, default: '' },
    bannerFileName: { type: String, default: '' },
    eventPlanFile: { type: String, default: '' },
    eventPlanFileName: { type: String, default: '' },
    eventPlanFileMime: { type: String, default: '' },
    /** pdf|docx|xlsx… — file tại uploads/event-plans/events/{id}.{ext} */
    eventPlanFileExt: { type: String, default: '' },
    eventPlanLink: { type: String, default: '' },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: 'Công nghệ'
    },
    registrationStartDate: {
      type: Date,
      default: null
    },
    registrationEndDate: {
      type: Date,
      default: null
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    campus: {
      type: String,
      enum: [EVENT_CAMPUS],
      default: EVENT_CAMPUS
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    capacity: {
      type: Number,
      default: 100,
      min: 0
    },
    totalTickets: {
      type: Number,
      min: 0
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'pending'
    },
    eventState: {
      type: String,
      enum: ['active', 'expired', 'postponed'],
      default: 'active'
    },
    postponeReason: {
      type: String,
      default: '',
      trim: true
    },
    postponeIsWeather: {
      type: Boolean,
      default: false
    },
    statusBeforeModeration: {
      type: String,
      default: ''
    },
    moderationReason: {
      type: String,
      default: '',
      trim: true
    },
    moderationReasonCategory: {
      type: String,
      default: '',
      trim: true
    },
    icpdpNote: { type: String, default: '', trim: true },
    moderationRequestedByEmail: { type: String, default: '' },
    moderationRequestedAt: { type: Date, default: null },
    /** Admin đã duyệt yêu cầu chỉnh sửa — CTSV mới được mở form (một lần / đến khi lưu) */
    ctsvEditUnlocked: {
      type: Boolean,
      default: false
    },
    /** Admin đã duyệt yêu cầu chỉnh sửa — CLB mới được mở form (một lần / đến khi lưu) */
    clubEditUnlocked: {
      type: Boolean,
      default: false
    },
    /**
     * CLB gửi form chỉnh sửa trước — nội dung sửa giữ chờ ở đây, chỉ áp dụng khi Admin duyệt.
     * { payload, requestedByEmail, requestedAt }
     */
    pendingEdit: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    /** Hành động của yêu cầu điều phối gần nhất bị từ chối (cancel/hide/postpone/edit/delete) — để hiển thị rõ trên UI. */
    lastModerationAction: {
      type: String,
      default: ''
    },
    /** Cấp đã từ chối yêu cầu điều phối gần nhất: 'icpdp' | 'admin' */
    lastModerationRejectedBy: {
      type: String,
      default: ''
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
    },
    createdByEmail: { type: String, default: '' },
    approvedByEmail: { type: String, default: '' },
    ctsvSubmittedByEmail: { type: String, default: '' },
    ctsvSubmittedAt: { type: Date, default: null },
    adminApprovedByEmail: { type: String, default: '' },
    adminApprovedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    ctsvNote: { type: String, default: '' },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    ticketPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    eventType: { type: String, default: '' },
    duration: { type: String, default: '' },
    format: {
      type: String,
      enum: ['campus', 'online', 'hybrid'],
      default: 'campus'
    },
    speaker: { type: String, default: '' },
    speakerRole: { type: String, default: '' },
    speakerAvatar: { type: String, default: '' },
    /** ext theo index speakers[] — file tại uploads/speaker-avatars/{eventId}/{index}.ext */
    speakerAvatarExts: { type: [String], default: [] },
    speakers: { type: [speakerSchema], default: [] },
    agenda: { type: String, default: '' },
    learningOutcomes: { type: [String], default: [] },
    expectedAttendees: { type: Number, default: 50 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    source: {
      type: String,
      enum: ['club', 'school', 'partner'],
      default: 'club'
    },
    /** Đơn vị gửi đơn sự kiện cấp trường (CTSV hoặc IC-PDP) */
    schoolOrganizerRole: {
      type: String,
      enum: ['ctsv', 'icpdp'],
      default: 'ctsv'
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      default: null
    },
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventProposal',
      default: null
    },
    timelineSource: {
      timelineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubSemesterTimeline', default: null },
      itemTitle: { type: String, default: '', trim: true, maxlength: 200 },
      semesterLabel: { type: String, default: '', trim: true, maxlength: 80 },
    },
    expectedRevenue: { type: Number, default: 0 },
    // Tất toán doanh thu cho đối tác (chỉ dùng khi source === 'partner').
    settlement: {
      status: { type: String, enum: ['none', 'requested', 'paid'], default: 'none' },
      requestedAt: { type: Date, default: null },
      // Mốc thời gian mỗi lần đối tác bấm "Yêu cầu thanh toán" — dùng để giới hạn tần suất.
      requestLog: { type: [Date], default: [] },
      paidAt: { type: Date, default: null },
      paidByEmail: { type: String, default: '' },
      paidAmount: { type: Number, default: 0 },
      note: { type: String, default: '' },
      // Ảnh biên lai chuyển khoản (bill) admin đính kèm khi tất toán — lưu Cloudinary.
      proofUrl: { type: String, default: '' },
      proofPublicId: { type: String, default: '' },
      // Kết quả AI kiểm tra biên lai (tư vấn, admin có thể ghi đè).
      proofAiChecked: { type: Boolean, default: false },
      proofAiValid: { type: Boolean, default: false },
      proofAiReason: { type: String, default: '' },
      proofAdminOverride: { type: Boolean, default: false },
    },
    isHidden: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    checkinQrToken: { type: String, default: '' },
    checkinQrExpiresAt: { type: Date, default: null },
    checkinAttendanceCode: { type: String, default: '' },
    checkoutQrToken: { type: String, default: '' },
    checkoutQrExpiresAt: { type: Date, default: null },
    checkoutAttendanceCode: { type: String, default: '' },
    // Các ngày (YYYY-MM-DD giờ địa phương) mà BTC thực sự mở check-in/out — dùng cho bảng điểm danh theo ngày.
    attendanceOpenDays: { type: [String], default: [] },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ source: 1, status: 1, startDate: -1 });
eventSchema.index({ partnerId: 1, startDate: -1 });
eventSchema.index({ createdBy: 1, createdAt: -1 });
eventSchema.index({ clubId: 1, createdAt: -1 });
eventSchema.index({ isHidden: 1, status: 1, startDate: 1 });
eventSchema.index({ source: 1, status: 1, ctsvSubmittedAt: -1 });
eventSchema.index({ source: 1, status: 1, moderationRequestedAt: -1 });
eventSchema.index({ isDeleted: 1, isHidden: 1, status: 1, startDate: 1 });
eventSchema.index({ isDeleted: 1, isHidden: 1, status: 1, category: 1, startDate: 1 });
eventSchema.index({ isDeleted: 1, isHidden: 1, status: 1, clubId: 1, startDate: 1 });

eventSchema.virtual('fillPercent').get(function () {
  const cap = this.capacity || this.totalTickets || 0;
  if (!cap) return 0;
  return Math.min(100, Math.round((this.registeredCount / cap) * 100));
});

eventSchema.virtual('remainingTickets').get(function () {
  const cap = this.capacity || this.totalTickets || 0;
  return Math.max(0, cap - (this.registeredCount || 0));
});

eventSchema.pre('validate', function () {
  this.category = normalizeEventCategory(this.category);
});

eventSchema.pre('save', async function () {
  if (!this.capacity && this.totalTickets) {
    this.capacity = this.totalTickets;
  }
  if (!this.totalTickets && this.capacity) {
    this.totalTickets = this.capacity;
  }
  if (!this.thumbnail && this.image) {
    this.thumbnail = this.image;
  }
  if (!this.image && this.thumbnail) {
    this.image = this.thumbnail;
  }
  const cap = this.capacity || 100;
  if (this.registeredCount > cap) {
    this.registeredCount = cap;
  }
  if (this.eventState !== 'postponed' && this.endDate && this.endDate < new Date()) {
    this.eventState = 'expired';
  }
  syncPrimarySpeakerFields(this);

  const { persistEventCoverOnDocument } = require('../utils/eventCoverStorage');
  const { persistEventPlanOnDocument, PLAN_SCOPES } = require('../utils/eventPlanStorage');
  const { persistSpeakersOnDocument } = require('../utils/speakerAvatarStorage');
  await persistEventCoverOnDocument(this);
  await persistEventPlanOnDocument(this, PLAN_SCOPES.events);
  await persistSpeakersOnDocument(this);
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

eventSchema.statics.CATEGORIES = EVENT_CATEGORIES;
eventSchema.statics.CAMPUS = EVENT_CAMPUS;
eventSchema.statics.VENUES = EVENT_VENUES;
eventSchema.statics.EVENT_STATUSES = EVENT_STATUSES;

// Register post hooks to clear the cache on any mutations
eventSchema.post('save', function () {
  clearEventCache();
});
eventSchema.post('remove', function () {
  clearEventCache();
});
eventSchema.post('updateOne', function () {
  clearEventCache();
});
eventSchema.post('updateMany', function () {
  clearEventCache();
});
eventSchema.post('findOneAndUpdate', function () {
  clearEventCache();
});
eventSchema.post('findOneAndDelete', function () {
  clearEventCache();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
