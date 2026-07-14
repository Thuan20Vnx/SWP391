const mongoose = require('mongoose');

const CLUB_REGISTRATION_STATUSES = ['pending_icpdp', 'pending_admin', 'approved', 'rejected', 'revision', 'cancelled'];

const clubRegistrationSchema = new mongoose.Schema(
  {
    clubName: { type: String, required: true, trim: true, maxlength: 120 },
    proposedSlug: { type: String, trim: true, maxlength: 80 },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    president: { type: String, required: true, trim: true, maxlength: 120 },
    presidentEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    facebook: { type: String, default: '', trim: true, maxlength: 200 },
    website: { type: String, default: '', trim: true, maxlength: 200 },
    activityField: { type: String, default: '', trim: true, maxlength: 80 },
    scale: { type: String, default: '', trim: true, maxlength: 60 },
    logoText: { type: String, default: '', trim: true },
    logoColor: { type: String, default: '#7c3aed' },
    coverImage: { type: String, default: '' },
    status: {
      type: String,
      enum: CLUB_REGISTRATION_STATUSES,
      default: 'pending_icpdp',
    },
    submittedByEmail: { type: String, trim: true, lowercase: true },
    submittedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    icpdpNote: { type: String, default: '' },
    adminNote: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    reviewedByEmail: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', default: null },
    clubSlug: { type: String, default: '' },
  },
  { timestamps: true }
);

clubRegistrationSchema.index({ status: 1, createdAt: -1 });
clubRegistrationSchema.index({ clubName: 'text', president: 'text', presidentEmail: 'text' });

clubRegistrationSchema.statics.STATUSES = CLUB_REGISTRATION_STATUSES;

const ClubRegistration = mongoose.model('ClubRegistration', clubRegistrationSchema);

module.exports = ClubRegistration;
