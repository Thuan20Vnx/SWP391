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
