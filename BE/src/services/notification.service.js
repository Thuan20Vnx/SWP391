const Notification = require('../models/Notification');
const { APP_URL } = require('../config/env');

// Map<clientId, { res, role, email }>
const clients = new Map();

// Nhóm nav (chấm đỏ) theo refType của thông báo.
const CATEGORY_BY_REFTYPE = {
  event_proposal: 'events',
  event_change_request: 'events',
  Event: 'events',
  semester_timeline: 'timeline',
};

const categoryOfRefType = (refType) => CATEGORY_BY_REFTYPE[refType] || null;
const refTypesForCategory = (category) =>
  Object.keys(CATEGORY_BY_REFTYPE).filter((rt) => CATEGORY_BY_REFTYPE[rt] === category);

// Chỉ gửi email cho các thay đổi trạng thái đơn / timeline quan trọng.
const KEY_EMAIL_REFTYPES = new Set([
  'event_proposal',
  'semester_timeline',
  'event_change_request',
  'club_registration',
]);
const MAX_EMAIL_RECIPIENTS = 60;

const dispatchStatusEmails = async ({ recipientRoles, recipientEmails, title, body }) => {
  try {
    const User = require('../models/User');
    const { sendStatusUpdateEmail } = require('./email.service');
    const set = new Set(normalizeEmails(recipientEmails));
    const roles = (recipientRoles || []).filter(Boolean);
    if (roles.length) {
      const users = await User.find({ role: { $in: roles }, isActive: { $ne: false } })
        .select('email')
        .lean();
      users.forEach((u) => {
        const e = String(u.email || '').trim().toLowerCase();
        if (e) set.add(e);
      });
    }
    const recipients = [...set].slice(0, MAX_EMAIL_RECIPIENTS);
    await Promise.all(
      recipients.map((to) =>
        sendStatusUpdateEmail({ to, title, body, ctaUrl: APP_URL, ctaLabel: 'Mở F-Events' }).catch(
          (err) => console.error(`[Notification email] ${to}:`, err.message),
        ),
      ),
    );
  } catch (err) {
    console.error('[Notification] dispatchStatusEmails error:', err.message);
  }
};

const normalizeEmails = (emails = []) =>
  [...new Set((Array.isArray(emails) ? emails : [emails])
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean))];

const addClient = (id, res, role, email) => {
  clients.set(id, { res, role, email: String(email || '').trim().toLowerCase() });
};

const removeClient = (id) => {
  clients.delete(id);
};

const broadcastToRecipients = (roles = [], emails = [], notification) => {
  const normalizedEmails = normalizeEmails(emails);
  for (const [, client] of clients) {
    if (roles.includes(client.role) || normalizedEmails.includes(client.email)) {
      try {
        client.res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
      } catch (err) {
        console.error('[SSE] broadcast error:', err.message);
      }
    }
  }
};

const createNotification = async ({ recipientRoles = [], recipientEmails = [], title, body, type, refId, refType }) => {
  const notification = await Notification.create({
    recipientRoles,
    recipientEmails: normalizeEmails(recipientEmails),
    title,
    body: body || '',
    type: type || 'info',
    refId: refId || '',
    refType: refType || '',
    isRead: false
  });
  return notification;
};

const createAndBroadcast = async ({ recipientRoles = [], recipientEmails = [], title, body, type, refId, refType }) => {
  try {
    const notification = await createNotification({ recipientRoles, recipientEmails, title, body, type, refId, refType });
    if (KEY_EMAIL_REFTYPES.has(refType)) {
      dispatchStatusEmails({ recipientRoles, recipientEmails, title, body });
    }
    broadcastToRecipients(recipientRoles, recipientEmails, {
      _id: notification._id,
      id: notification._id,
      recipientRoles: notification.recipientRoles,
      recipientEmails: notification.recipientEmails,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      refId: notification.refId,
      refType: notification.refType,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });
    return notification;
  } catch (err) {
    console.error('[Notification] createAndBroadcast error:', err.message);
  }
};

module.exports = {
  addClient,
  removeClient,
  broadcastToRoles: (roles, notification) => broadcastToRecipients(roles, [], notification),
  broadcastToRecipients,
  createNotification,
  createAndBroadcast,
  categoryOfRefType,
  refTypesForCategory,
  CATEGORY_BY_REFTYPE
};
