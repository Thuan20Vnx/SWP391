const mongoose = require('mongoose');

const clubFollowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    status: {
      type: String,
      enum: ['following', 'unfollowed'],
      default: 'following',
    },
    followedAt: {
      type: Date,
      default: Date.now,
    },
    unfollowedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

clubFollowSchema.index({ user: 1, club: 1 }, { unique: true });
clubFollowSchema.index({ user: 1, status: 1 });

const ClubFollow = mongoose.model('ClubFollow', clubFollowSchema);

module.exports = ClubFollow;
