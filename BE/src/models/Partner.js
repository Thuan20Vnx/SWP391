const mongoose = require('mongoose');

const PARTNER_STATUSES = ['pending', 'approved', 'rejected'];

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    representative: { type: String, default: '' },
    address: { type: String, default: '' },
    description: { type: String, default: '' },
    partnerCode: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    proposedEventTitle: { type: String, default: '', trim: true },
    expectedSponsorAmount: { type: Number, default: 0 },
    benefits: { type: [String], default: [] },
    attachments: [
      {
        name: { type: String, default: '' },
        url: { type: String, default: '' },
        sizeLabel: { type: String, default: '' }
      }
    ],
    representativeTitle: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: PARTNER_STATUSES,
      default: 'pending'
    },
    rejectionReason: { type: String, default: '' },
    approvedByEmail: { type: String, default: '' }
  },
  { timestamps: true }
);

const Partner = mongoose.model('Partner', partnerSchema);

module.exports = Partner;
module.exports.PARTNER_STATUSES = PARTNER_STATUSES;
