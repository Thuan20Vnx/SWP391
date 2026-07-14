const mongoose = require('mongoose');

const PARTNER_STATUSES = ['pending', 'pending_admin', 'approved', 'rejected', 'info_requested'];

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    representative: { type: String, default: '' },
    address: { type: String, default: '' },
    description: { type: String, default: '' },
    partnerCode: { type: String, default: '', trim: true },
    logo: { type: String, default: '' },
    logoFileExt: { type: String, default: '' },
    category: { type: String, default: '', trim: true },
    proposedEventTitle: { type: String, default: '', trim: true },
    expectedSponsorAmount: { type: Number, default: 0 },
    benefits: { type: [String], default: [] },
    attachments: [
      {
        name: { type: String, default: '' },
        url: { type: String, default: '' },
        sizeLabel: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        storedExt: { type: String, default: '' },
      }
    ],
    representativeTitle: { type: String, default: '', trim: true },
    bankAccountNumber: { type: String, default: '', trim: true },
    bankCode: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    bankAccountHolder: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: PARTNER_STATUSES,
      default: 'pending'
    },
    rejectionReason: { type: String, default: '' },
    supplementReason: { type: String, default: '' },
    ctsvApprovedByEmail: { type: String, default: '' },
    ctsvApprovedAt: { type: Date, default: null },
    approvedByEmail: { type: String, default: '' },
    adminApprovedAt: { type: Date, default: null },
    terminationStatus: {
      type: String,
      enum: ['none', 'pending'],
      default: 'none'
    },
    terminationReason: { type: String, default: '' },
    terminationRequestedAt: { type: Date, default: null },
    terminationRequestedByEmail: { type: String, default: '' }
  },
  { timestamps: true }
);

partnerSchema.index({ status: 1, createdAt: -1 });
partnerSchema.index({ email: 1, createdAt: -1 });

partnerSchema.pre('save', async function () {
  const { persistPartnerLogoOnDocument } = require('../utils/partnerMediaStorage');
  await persistPartnerLogoOnDocument(this);
});

const Partner = mongoose.model('Partner', partnerSchema);

module.exports = Partner;
module.exports.PARTNER_STATUSES = PARTNER_STATUSES;
