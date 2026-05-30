const adminService = require('../services/admin.service');
const adminDataService = require('../services/admin.data.service');

const listAccounts = async (req, res) => {
  const result = await adminService.listAccounts({
    page: req.query.page,
    limit: req.query.limit,
    role: req.query.role,
    search: req.query.search,
  });
  res.status(200).json({ success: true, ...result });
};

const createAccount = async (req, res) => {
  const result = await adminService.createAccount(req.body);
  res.status(201).json({ success: true, ...result });
};

const getAccount = async (req, res) => {
  const result = await adminService.getAccount(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const updateAccount = async (req, res) => {
  const result = await adminService.updateAccount(req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const updateAccountStatus = async (req, res) => {
  const result = await adminService.updateAccountStatus(req.params.id, req.body.isActive);
  res.status(200).json({ success: true, ...result });
};

const deleteAccount = async (req, res) => {
  const result = await adminService.deleteAccount(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const getDataOverview = async (req, res) => {
  const result = await adminDataService.getDataOverview();
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateAccountStatus,
  deleteAccount,
  getDataOverview,
};
