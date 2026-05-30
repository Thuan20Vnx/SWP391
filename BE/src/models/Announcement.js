const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    image: { type: String, default: '' },
    imageFileName: { type: String, default: '' },
    publishedByEmail: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
