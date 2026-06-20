const AuditLog = require('../models/AuditLog');

/**
 * Ghi một bản ghi nhật ký thay đổi hệ thống.
 * Không bao giờ throw — lỗi ghi log không được làm hỏng hành động chính.
 */
const writeAuditLog = async ({
  actorEmail = '',
  actorRole = '',
  action,
  category = 'system',
  tone = 'default',
  detail = '',
}) => {
  try {
    if (!action) return null;
    return await AuditLog.create({
      actorEmail,
      actorRole,
      action,
      category,
      tone,
      detail,
    });
  } catch (err) {
    console.warn('[AuditLog] Ghi nhật ký thất bại:', err.message);
    return null;
  }
};

const listAuditLogs = async (limit = 30) => {
  const docs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    actor: d.actorEmail || d.actorRole || 'SYSTEM',
    action: d.action,
    category: d.category,
    tone: d.tone || 'default',
    detail: d.detail || '',
    createdAt: d.createdAt,
  }));
};

module.exports = { writeAuditLog, listAuditLogs };
