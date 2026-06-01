const mongoose = require('mongoose');

const PROPOSAL_STATUSES = [
  'draft',
  'pending_icpdp',
  'pending_ctsv',
  'approved',
  'rejected',
  'revision'
];

const eventProposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Khác' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: '' },
    totalTickets: { type: Number, default: 100 },
    image: { type: String, default: '' },
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
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }
  },
  { timestamps: true }
);

eventProposalSchema.index({ status: 1, createdAt: -1 });
eventProposalSchema.index({ submittedByEmail: 1, createdAt: -1 });

const EventProposal = mongoose.model('EventProposal', eventProposalSchema);

module.exports = EventProposal;
module.exports.PROPOSAL_STATUSES = PROPOSAL_STATUSES;
