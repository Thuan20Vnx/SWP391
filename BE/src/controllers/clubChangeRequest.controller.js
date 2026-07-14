const clubChangeRequestService = require('../services/clubChangeRequest.service');
const { createAndBroadcast } = require('../services/notification.service');

const list = async (req, res) => {
  const result = await clubChangeRequestService.listChangeRequests({
    status: req.query.status,
    type: req.query.type,
    clubId: req.query.clubId,
  });
  res.status(200).json({ success: true, ...result });
};

const listForClub = async (req, res) => {
  const result = await clubChangeRequestService.listChangeRequests({
    status: req.query.status || 'all',
    clubId: req.params.id,
  });
  res.status(200).json({ success: true, ...result });
};

const getById = async (req, res) => {
  const result = await clubChangeRequestService.getChangeRequestById(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const approve = async (req, res) => {
  const result = await clubChangeRequestService.approveChangeRequest(req.params.id, {
    adminNote: req.body.adminNote || req.body.note || '',
    processorEmail: req.authEmail || req.user?.email,
  });
  createAndBroadcast({
    recipientEmails: [result.request?.requestedByEmail],
    title: 'Yêu cầu thay đổi CLB đã được duyệt',
    body: `Yêu cầu cho CLB "${result.request?.club?.name || ''}" đã được chấp nhận.`,
    type: 'club_change_approve',
    refId: String(result.request?.clubId || ''),
    refType: 'Club',
  }).catch(() => {});
  res.status(200).json({ success: true, message: 'Đã chấp nhận yêu cầu.', ...result });
};

const reject = async (req, res) => {
  const result = await clubChangeRequestService.rejectChangeRequest(req.params.id, {
    adminNote: req.body.adminNote || req.body.reason || req.body.note || '',
    processorEmail: req.authEmail || req.user?.email,
  });
  createAndBroadcast({
    recipientEmails: [result.request?.requestedByEmail],
    title: 'Yêu cầu thay đổi CLB bị từ chối',
    body: result.request?.adminNote || 'Yêu cầu thay đổi CLB chưa được chấp nhận.',
    type: 'club_change_reject',
    refId: String(result.request?.clubId || ''),
    refType: 'Club',
  }).catch(() => {});
  res.status(200).json({ success: true, message: 'Đã từ chối yêu cầu.', ...result });
};

const create = async (req, res) => {
  const result = await clubChangeRequestService.createChangeRequest(req.user, req.params.id, req.body);
  createAndBroadcast({
    recipientRoles: ['admin'],
    title: 'Yêu cầu thay đổi CLB mới',
    body: `IC-PDP vừa gửi yêu cầu ${req.body.requestType === 'delete' ? 'xóa' : 'sửa'} CLB "${result.request?.club?.name || ''}".`,
    type: 'club_change_submit',
    refId: String(result.request?.id || ''),
    refType: 'club_change_request',
  }).catch(() => {});
  res.status(201).json({ success: true, ...result });
};

module.exports = { list, listForClub, getById, approve, reject, create };
