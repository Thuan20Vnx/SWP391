const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientRoles: [{ type: String }],
  title: { type: String, required: true },
  body: { type: String, default: '' },
  type: { type: String, default: 'info' },
  refId: { type: String, default: '' },
  refType: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
