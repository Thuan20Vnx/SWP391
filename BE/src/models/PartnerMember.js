const mongoose = require('mongoose');

const partnerMemberSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    fullname: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    isPrimary: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    addedByEmail: { type: String, default: '' },
  },
  { timestamps: true },
);

partnerMemberSchema.index({ partnerId: 1, email: 1 }, { unique: true });
partnerMemberSchema.index({ email: 1, isActive: 1 });

const PartnerMember = mongoose.model('PartnerMember', partnerMemberSchema);

module.exports = PartnerMember;
