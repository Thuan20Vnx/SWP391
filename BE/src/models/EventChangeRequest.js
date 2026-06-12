const mongoose = require('mongoose');

const REQUEST_TYPES = ['edit', 'delete', 'hide'];
const REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

const eventSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    capacity: { type: Number },
    category: { type: String, default: '' },
    status: { type: String, default: '' },
    isHidden: { type: Boolean, default: false }
  },
  { _id: false }
);

const eventChangePayloadSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    capacity: { type: Number },
    category: { type: String, default: '' }
  },
  { _id: false }
);

const eventChangeRequestSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    requestType: {
      type: String,
      enum: REQUEST_TYPES,
      required: true
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
      index: true
    },
    reason: { type: String, default: '', trim: true },
    adminNote: { type: String, default: '', trim: true },
    requestedByEmail: { type: String, default: '' },
    requestedByName: { type: String, default: '' },
    clubName: { type: String, default: '' },
    snapshot: { type: eventSnapshotSchema, default: () => ({}) },
    payload: { type: eventChangePayloadSchema, default: () => ({}) },
    processedByEmail: { type: String, default: '' }
  },
  { timestamps: true }
);

eventChangeRequestSchema.index({ status: 1, createdAt: -1 });

const EventChangeRequest = mongoose.model('EventChangeRequest', eventChangeRequestSchema);

module.exports = EventChangeRequest;
module.exports.REQUEST_TYPES = REQUEST_TYPES;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
