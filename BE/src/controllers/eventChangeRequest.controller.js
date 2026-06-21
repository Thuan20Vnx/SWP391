const eventChangeRequestService = require('../services/eventChangeRequest.service');
const { createAndBroadcast } = require('../services/notification.service');

const list = async (req, res) => {
  const result = await eventChangeRequestService.listChangeRequests({
    status: req.query.status,
    type: req.query.type
  });
  res.status(200).json({ success: true, ...result });
};

const getById = async (req, res) => {
  const result = await eventChangeRequestService.getChangeRequestById(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const approve = async (req, res) => {
  const result = await eventChangeRequestService.approveChangeRequest(req.params.id, {
    adminNote: req.body.adminNote || req.body.note || '',
    processorEmail: req.authEmail || req.user?.email
  });
  createAndBroadcast({
    recipientEmails: [result.request?.requestedByEmail],
    title: 'Yêu cầu thay đổi sự kiện đã được duyệt',
    body: `Yêu cầu cho sự kiện "${result.request?.event?.title || ''}" đã được chấp nhận.`,
    type: 'event_change_approve',
    refId: String(result.request?.eventId || ''),
    refType: 'Event'
  }).catch(() => {});
  res.status(200).json({ success: true, message: 'Đã chấp nhận yêu cầu.', ...result });
};

const reject = async (req, res) => {
  const result = await eventChangeRequestService.rejectChangeRequest(req.params.id, {
    adminNote: req.body.adminNote || req.body.reason || req.body.note || '',
    processorEmail: req.authEmail || req.user?.email
  });
  createAndBroadcast({
    recipientEmails: [result.request?.requestedByEmail],
    title: 'Yêu cầu thay đổi sự kiện bị từ chối',
    body: result.request?.adminNote || 'Yêu cầu thay đổi sự kiện chưa được chấp nhận.',
    type: 'event_change_reject',
    refId: String(result.request?.eventId || ''),
    refType: 'Event'
  }).catch(() => {});
  res.status(200).json({ success: true, message: 'Đã từ chối yêu cầu.', ...result });
};

const create = async (req, res) => {
  const result = await eventChangeRequestService.createChangeRequest(req.user, req.body);
  createAndBroadcast({
    recipientRoles: ['admin', 'ctsv'],
    title: 'Yêu cầu thay đổi sự kiện mới',
    body: `${result.request?.requestedByName || 'CLB'} vừa gửi yêu cầu thay đổi sự kiện.`,
    type: 'event_change_submit',
    refId: String(result.request?.id || result.request?._id || ''),
    refType: 'event_change_request'
  }).catch(() => {});
  res.status(201).json({ success: true, ...result });
};

module.exports = { list, getById, approve, reject, create };
