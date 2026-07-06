const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientRoles: [{ type: String }],
  recipientEmails: [{ type: String, trim: true, lowercase: true }],
  title: { type: String, required: true },
  body: { type: String, default: '' },
  type: { type: String, default: 'info' },
  refId: { type: String, default: '' },
  refType: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  readByEmails: [{ type: String, trim: true, lowercase: true }],
  deletedByEmails: [{ type: String, trim: true, lowercase: true }],
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ recipientRoles: 1, createdAt: -1 });
notificationSchema.index({ recipientEmails: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
