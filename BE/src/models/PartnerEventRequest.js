const mongoose = require('mongoose');

const REQUEST_STATUSES = [
  'draft',
  'pending',
  'cancelled',
  'info_requested',
  'approved',
  'hidden',
  'deleted'
];

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    sizeLabel: { type: String, default: '' },
    mimeType: { type: String, default: '' }
  },
  { _id: false }
);

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    priceType: { type: String, default: 'free' },
    priceAmount: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    audience: { type: String, default: 'SV FPT' }
  },
  { _id: false }
);

const speakerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    avatar: { type: String, default: '' }
  },
  { _id: false }
);

const partnerEventRequestSchema = new mongoose.Schema(
  {
    partnerEmail: { type: String, required: true, trim: true, lowercase: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'draft'
    },
    companyName: { type: String, default: '', trim: true },
    partnerCode: { type: String, default: '', trim: true },
    representative: { type: String, default: '' },
    representativeTitle: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    category: { type: String, default: '' },
    expectedSponsorAmount: { type: Number, default: 0 },
    benefits: { type: [String], default: [] },
    partnerMessage: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    title: { type: String, default: '', trim: true },
    eventType: { type: String, default: 'Hội thảo & Workshop' },
    description: { type: String, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    duration: { type: String, default: '' },
    format: { type: String, default: 'campus' },
    location: { type: String, default: '' },
    campus: { type: String, default: '' },
    agenda: { type: String, default: '' },
    learningOutcomes: { type: [String], default: [] },
    expectedAttendees: { type: Number, default: 0 },
    image: { type: String, default: '' },
    bannerFileName: { type: String, default: '' },
    totalTickets: { type: Number, default: 0 },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    speakers: { type: [speakerSchema], default: [] },
    submittedAt: { type: Date, default: null },
    hiddenAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    supplementReason: { type: String, default: '' }
  },
  { timestamps: true }
);

partnerEventRequestSchema.index({ partnerEmail: 1, status: 1, updatedAt: -1 });
partnerEventRequestSchema.index({ partnerId: 1, status: 1, updatedAt: -1 });

const PartnerEventRequest = mongoose.model('PartnerEventRequest', partnerEventRequestSchema);

module.exports = PartnerEventRequest;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
