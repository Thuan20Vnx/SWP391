const mongoose = require('mongoose');
const { EVENT_CAMPUS, EVENT_VENUES } = require('../constants/eventVenues');

const EVENT_CATEGORIES = [
  'Công nghệ',
  'Văn hóa',
  'Kinh tế',
  'Học thuật',
  'Nghệ thuật',
  'Âm nhạc',
  'Workshop',
  'Thể thao',
];

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
  },
  category: {
    type: String,
    enum: EVENT_CATEGORIES,
    default: 'Công nghệ',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  campus: {
    type: String,
    enum: [EVENT_CAMPUS],
    default: EVENT_CAMPUS,
  },
  location: {
    type: String,
    required: true,
    trim: true,
    enum: EVENT_VENUES,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  registeredCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  /** Trạng thái duyệt: pending | approved | rejected */
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  /** Trạng thái hiển thị trên UI: active | expired | postponed */
  eventState: {
    type: String,
    enum: ['active', 'expired', 'postponed'],
    default: 'active',
  },
  postponeReason: {
    type: String,
    default: '',
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  /** Giá vé gốc (VND). 0 = miễn phí cho mọi người. Sinh viên/giảng viên luôn miễn phí. */
  ticketPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ category: 1, status: 1 });

eventSchema.virtual('fillPercent').get(function () {
  if (!this.capacity) return 0;
  return Math.min(100, Math.round((this.registeredCount / this.capacity) * 100));
});

eventSchema.pre('save', function () {
  if (this.registeredCount > this.capacity) {
    this.registeredCount = this.capacity;
  }
  if (this.eventState !== 'postponed' && this.endDate && this.endDate < new Date()) {
    this.eventState = 'expired';
  }
});

eventSchema.statics.CATEGORIES = EVENT_CATEGORIES;
eventSchema.statics.CAMPUS = EVENT_CAMPUS;
eventSchema.statics.VENUES = EVENT_VENUES;

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
