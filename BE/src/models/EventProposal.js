const mongoose = require('mongoose');

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

const PROPOSAL_STATUSES = [
  'draft',
  'pending_icpdp',
  'pending_ctsv',
  'pending_admin',
  'approved',
  'rejected',
  'revision'
];

const eventProposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    learningOutcomes: { type: [String], default: [] },
    category: { type: String, default: 'Khác' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: '' },
    totalTickets: { type: Number, default: 100 },
    ticketPrice: { type: Number, default: 0, min: 0 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    expectedAttendees: { type: Number, default: 0 },
    image: { type: String, default: '' },
    coverFileExt: { type: String, default: '' },
    eventPlanFile: { type: String, default: '' },
    eventPlanFileName: { type: String, default: '' },
    eventPlanFileMime: { type: String, default: '' },
    eventPlanFileExt: { type: String, default: '' },
    eventPlanLink: { type: String, default: '' },
    clubId: { type: String, default: '' },
    clubName: { type: String, default: '' },
    submittedByEmail: { type: String, default: '' },
    status: {
      type: String,
      enum: PROPOSAL_STATUSES,
      default: 'pending_icpdp'
    },
    icpdpNote: { type: String, default: '' },
    ctsvNote: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    /** Sự kiện CLB đã tạo trước — IC-PDP duyệt đề xuất rồi chuyển Admin */
    linkedEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    timelineSource: {
      timelineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubSemesterTimeline', default: null },
      itemTitle: { type: String, default: '', trim: true, maxlength: 200 },
      semesterLabel: { type: String, default: '', trim: true, maxlength: 80 },
    },
  },
  { timestamps: true }
);

eventProposalSchema.index({ status: 1, createdAt: -1 });
eventProposalSchema.index({ submittedByEmail: 1, createdAt: -1 });

eventProposalSchema.pre('save', async function () {
  const { persistEventPlanOnDocument, PLAN_SCOPES } = require('../utils/eventPlanStorage');
  const { isImageDataUri, parseDataUri, extensionFromMime, writeBufferToFile } = require('../utils/dataUriStorage');
  const path = require('path');
  await persistEventPlanOnDocument(this, PLAN_SCOPES.proposals);
  if (this._id && isImageDataUri(this.image)) {
    const PROPOSAL_COVERS = path.join(__dirname, '../../uploads/proposal-covers');
    const { mime, buffer } = parseDataUri(this.image);
    const ext = extensionFromMime(mime, '', 'jpg');
    await writeBufferToFile(path.join(PROPOSAL_COVERS, `${String(this._id)}.${ext}`), buffer);
    this.coverFileExt = ext;
    this.image = '';
  }
});

const EventProposal = mongoose.model('EventProposal', eventProposalSchema);

module.exports = EventProposal;
module.exports.PROPOSAL_STATUSES = PROPOSAL_STATUSES;
