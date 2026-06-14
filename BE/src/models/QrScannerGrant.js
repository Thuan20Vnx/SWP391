const mongoose = require('mongoose');

const qrScannerGrantSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    scannerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedByRole: {
      type: String,
      enum: ['club_manager', 'icpdp', 'ctsv', 'admin'],
      required: true,
    },
    validityType: {
      type: String,
      enum: ['permanent', 'until', 'duration'],
      default: 'permanent',
    },
    validUntil: { type: Date, default: null },
    durationMinutes: { type: Number, default: null, min: 1 },
    grantedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    note: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

qrScannerGrantSchema.index({ event: 1, scannerUser: 1, revokedAt: 1 });
qrScannerGrantSchema.index({ scannerUser: 1, revokedAt: 1 });

module.exports = mongoose.model('QrScannerGrant', qrScannerGrantSchema);
