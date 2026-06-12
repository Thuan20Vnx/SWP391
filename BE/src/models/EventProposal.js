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
