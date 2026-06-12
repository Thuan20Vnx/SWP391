const mongoose = require('mongoose');

const timelineItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    plannedDate: { type: Date, default: null },
    category: { type: String, default: 'Workshop', trim: true, maxlength: 80 },
    location: { type: String, default: '', trim: true, maxlength: 200 },
    expectedAttendees: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const TIMELINE_STATUSES = [
  'draft',
  'pending_icpdp',
  'pending_ctsv',
  'approved',
  'rejected',
  'revision',
];

const clubSemesterTimelineSchema = new mongoose.Schema(
  {
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubName: { type: String, default: '', trim: true },
    clubSlug: { type: String, default: '', trim: true },
    semesterTerm: { type: String, enum: ['spring', 'summer', 'fall'], required: true },
    semesterYear: { type: Number, required: true, min: 2020, max: 2100 },
    semesterLabel: { type: String, required: true, trim: true, maxlength: 80 },
    summary: { type: String, default: '', maxlength: 3000 },
    objectives: { type: String, default: '', maxlength: 2000 },
    items: { type: [timelineItemSchema], default: [] },
    status: {
      type: String,
      enum: TIMELINE_STATUSES,
      default: 'draft',
    },
    submittedByEmail: { type: String, default: '', trim: true, lowercase: true },
    icpdpNote: { type: String, default: '' },
    ctsvNote: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    reviewedByEmail: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clubSemesterTimelineSchema.index({ clubId: 1, semesterYear: 1, semesterTerm: 1 });
clubSemesterTimelineSchema.index({ status: 1, createdAt: -1 });
clubSemesterTimelineSchema.index({ clubName: 'text', semesterLabel: 'text' });

clubSemesterTimelineSchema.statics.STATUSES = TIMELINE_STATUSES;

const ClubSemesterTimeline = mongoose.model('ClubSemesterTimeline', clubSemesterTimelineSchema);

module.exports = ClubSemesterTimeline;
module.exports.TIMELINE_STATUSES = TIMELINE_STATUSES;
