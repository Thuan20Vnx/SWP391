const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorEmail: { type: String, default: '', trim: true },
    actorRole: { type: String, default: '', trim: true },
    action: { type: String, required: true, trim: true },
    category: { type: String, default: 'system', trim: true }, // system | email | security | maintenance
    tone: { type: String, default: 'default', trim: true }, // default | primary | danger
    detail: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
