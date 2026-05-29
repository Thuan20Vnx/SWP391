const mongoose = require('mongoose');

const eventReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000,
  },
}, {
  timestamps: true,
});

eventReviewSchema.index({ user: 1, event: 1 }, { unique: true });
eventReviewSchema.index({ event: 1, createdAt: -1 });
eventReviewSchema.index({ user: 1, createdAt: -1 });

const EventReview = mongoose.model('EventReview', eventReviewSchema);

module.exports = EventReview;
