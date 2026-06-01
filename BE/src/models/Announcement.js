const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    image: { type: String, default: '' },
    imageFileName: { type: String, default: '' },
    /** Đối tượng nhận: all | guest | student | club_manager | partner | icpdp | ctsv | admin */
    targetRoles: { type: [String], default: ['all'] },
    /** Doanh mục: info | action | urgent */
    noticeCategory: { type: String, default: 'info' },
    publishedByEmail: { type: String, default: '' },
    publishedByRole: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

announcementSchema.index({ isHidden: 1, publishedAt: -1 });
announcementSchema.index({ eventId: 1, publishedAt: -1 });
announcementSchema.index({ publishedByRole: 1, publishedAt: -1 });
announcementSchema.index({ targetRoles: 1, publishedAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
