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
    coverFileExt: { type: String, default: '' },
    coverPositionY: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
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
    shortName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 40,
    },
    activityField: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    scale: {
      type: String,
      default: '',
      trim: true,
      maxlength: 60,
    },
    president: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    hotline: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    facebook: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    website: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    slogan: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
    },
    logoImage: {
      type: String,
      default: '',
    },
    logoFileExt: { type: String, default: '' },
    foundedDate: {
      type: String,
      default: '',
      trim: true,
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

clubSchema.index({ status: 1, category: 1 });
clubSchema.index({ name: 'text', description: 'text', tags: 'text' });

clubSchema.statics.CATEGORIES = CLUB_CATEGORIES;

clubSchema.pre('save', async function () {
  const { persistClubMediaOnDocument } = require('../utils/clubMediaStorage');
  await persistClubMediaOnDocument(this);
});

const Club = mongoose.model('Club', clubSchema);

module.exports = Club;
