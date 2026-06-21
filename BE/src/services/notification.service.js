const Notification = require('../models/Notification');

// Map<clientId, { res, role, email }>
const clients = new Map();

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
  createAndBroadcast
};
