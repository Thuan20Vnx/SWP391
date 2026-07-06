const mongoose = require('mongoose');

const submittedCtsvReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['club', 'school', 'partner'],
      default: 'school',
    },
    reportPhase: {
      type: String,
      default: 'ended',
      trim: true,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    submittedByEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    submittedByRole: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      default: null,
    },
    partnerEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    sentToPartnerAt: {
      type: Date,
      default: null,
    },
    partnerAnnouncementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      default: null,
    },
  },
  { timestamps: true }
);

submittedCtsvReportSchema.index({ partnerId: 1, sentToPartnerAt: -1 });
submittedCtsvReportSchema.index({ partnerEmail: 1, sentToPartnerAt: -1 });

module.exports = mongoose.model('SubmittedCtsvReport', submittedCtsvReportSchema);
