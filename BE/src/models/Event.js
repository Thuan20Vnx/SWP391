const mongoose = require('mongoose');

const EVENT_STATUSES = [
  'draft',
  'pending_icpdp',
  'pending_ctsv',
  'approved',
  'rejected',
  'revision',
  'live',
  'ended'
];

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

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Khác' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: '' },
    totalTickets: { type: Number, default: 100 },
    registeredCount: { type: Number, default: 0 },
    image: { type: String, default: '' },
    bannerFileName: { type: String, default: '' },
    eventType: { type: String, default: '' },
    duration: { type: String, default: '' },
    format: {
      type: String,
      enum: ['campus', 'online', 'hybrid'],
      default: 'campus'
    },
    speaker: { type: String, default: '' },
    agenda: { type: String, default: '' },
    expectedAttendees: { type: Number, default: 50 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'pending_ctsv'
    },
    source: {
      type: String,
      enum: ['club', 'school', 'partner'],
      default: 'club'
    },
    createdByEmail: { type: String, default: '' },
    approvedByEmail: { type: String, default: '' },
    ctsvNote: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventProposal', default: null },
    expectedRevenue: { type: Number, default: 0 }
  },
  { timestamps: true }
);

eventSchema.virtual('remainingTickets').get(function () {
  return Math.max(0, this.totalTickets - this.registeredCount);
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
module.exports.EVENT_STATUSES = EVENT_STATUSES;
