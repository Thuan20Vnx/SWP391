const Notification = require('../models/Notification');

// Map<clientId, { res, role }>
const clients = new Map();

const addClient = (id, res, role) => {
  clients.set(id, { res, role });
};

const removeClient = (id) => {
  clients.delete(id);
};

const broadcastToRoles = (roles, notification) => {
  for (const [, client] of clients) {
    if (roles.includes(client.role)) {
      try {
        client.res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
      } catch (err) {
        console.error('[SSE] broadcast error:', err.message);
      }
    }
  }
};

const createNotification = async ({ recipientRoles, title, body, type, refId, refType }) => {
  const notification = await Notification.create({
    recipientRoles,
    title,
    body: body || '',
    type: type || 'info',
    refId: refId || '',
    refType: refType || '',
    isRead: false
  });
  return notification;
};

const createAndBroadcast = async ({ recipientRoles, title, body, type, refId, refType }) => {
  try {
    const notification = await createNotification({ recipientRoles, title, body, type, refId, refType });
    broadcastToRoles(recipientRoles, {
      _id: notification._id,
      id: notification._id,
      recipientRoles: notification.recipientRoles,
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

module.exports = { addClient, removeClient, broadcastToRoles, createNotification, createAndBroadcast };
