const mongoose = require('mongoose');

const REQUEST_TYPES = ['edit', 'delete'];
const REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

const clubSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    president: { type: String, default: '' },
    email: { type: String, default: '' },
    hotline: { type: String, default: '' },
    status: { type: String, default: '' },
  },
  { _id: false }
);

const clubChangePayloadSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    president: { type: String, default: '' },
    email: { type: String, default: '' },
    hotline: { type: String, default: '' },
  },
  { _id: false }
);

const clubChangeRequestSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: REQUEST_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    reason: { type: String, default: '', trim: true },
    adminNote: { type: String, default: '', trim: true },
    requestedByEmail: { type: String, default: '' },
    requestedByName: { type: String, default: '' },
    snapshot: { type: clubSnapshotSchema, default: () => ({}) },
    payload: { type: clubChangePayloadSchema, default: () => ({}) },
    processedByEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

clubChangeRequestSchema.index({ status: 1, createdAt: -1 });

const ClubChangeRequest = mongoose.model('ClubChangeRequest', clubChangeRequestSchema);

module.exports = ClubChangeRequest;
module.exports.REQUEST_TYPES = REQUEST_TYPES;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
