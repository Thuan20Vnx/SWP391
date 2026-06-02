const eventChangeRequestService = require('../services/eventChangeRequest.service');

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
  res.status(200).json({ success: true, message: 'Đã chấp nhận yêu cầu.', ...result });
};

const reject = async (req, res) => {
  const result = await eventChangeRequestService.rejectChangeRequest(req.params.id, {
    adminNote: req.body.adminNote || req.body.reason || req.body.note || '',
    processorEmail: req.authEmail || req.user?.email
  });
  res.status(200).json({ success: true, message: 'Đã từ chối yêu cầu.', ...result });
};

const create = async (req, res) => {
  const result = await eventChangeRequestService.createChangeRequest(req.user, req.body);
  res.status(201).json({ success: true, ...result });
};

module.exports = { list, getById, approve, reject, create };
