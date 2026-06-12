const mongoose = require('mongoose');

const CONTRACT_STATUSES = ['draft', 'pending', 'approved', 'rejected'];

const contractSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: CONTRACT_STATUSES,
      default: 'pending'
    },
    fileUrl: { type: String, default: '' },
    signedAt: { type: Date },
    approvedByEmail: { type: String, default: '' },
    rejectionReason: { type: String, default: '' }
  },
  { timestamps: true }
);

contractSchema.index({ partnerId: 1, createdAt: -1 });
contractSchema.index({ status: 1, createdAt: -1 });

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
module.exports.CONTRACT_STATUSES = CONTRACT_STATUSES;
