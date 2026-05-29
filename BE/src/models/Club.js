const mongoose = require('mongoose');

const CLUB_CATEGORIES = [
  'Công nghệ',
  'Nghệ thuật',
  'Kinh doanh',
  'Văn hóa',
  'Thể thao',
  'Tình nguyện',
  'Âm nhạc',
];

const featuredEventSchema = new mongoose.Schema(
  {
    monthShort: { type: String, default: '' },
    day: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      enum: CLUB_CATEGORIES,
      required: true,
    },
    logoText: {
      type: String,
      default: '',
      trim: true,
    },
    logoColor: {
      type: String,
      default: '#f26f21',
    },
    coverImage: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      default: 'FPT University',
    },
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    eventsHeld: {
      type: Number,
      default: 0,
      min: 0,
    },
    founded: {
      type: String,
      default: 'Tháng 09, 2018',
    },
    featuredEvent: {
      type: featuredEventSchema,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    joinMode: {
      type: String,
      enum: ['approval', 'open'],
      default: 'approval',
    },
  },
  { timestamps: true }
);

clubSchema.index({ status: 1, category: 1 });
clubSchema.index({ name: 'text', description: 'text', tags: 'text' });

clubSchema.statics.CATEGORIES = CLUB_CATEGORIES;

const Club = mongoose.model('Club', clubSchema);

module.exports = Club;
