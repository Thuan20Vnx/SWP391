const adminService = require('../services/admin.service');
const adminDataService = require('../services/admin.data.service');
const adminDashboardService = require('../services/admin.dashboard.service');
const systemHealthService = require('../services/systemHealth.service');
const adminAnalyticsService = require('../services/admin.analytics.service');

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

const lockAccount = async (req, res) => {
  const { days } = req.body;
  const result =
    days === null || days === 0 || days === '0'
      ? await adminService.unlockAccount(req.params.id)
      : await adminService.lockAccountTemporarily(req.params.id, days);
  res.status(200).json({ success: true, ...result });
};

const deleteAccount = async (req, res) => {
  const result = await adminService.deleteAccount(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const resetAccountPassword = async (req, res) => {
  const result = await adminService.resetAccountPassword(req.params.id);
  res.status(200).json({ success: true, ...result });
};

const listAssignableClubs = async (req, res) => {
  const result = await adminService.listAssignableClubs();
  res.status(200).json({ success: true, ...result });
};

const getPendingAdminSummary = async (req, res) => {
  const result = await adminService.getPendingAdminSummary();
  res.status(200).json({ success: true, ...result });
};

const getDataOverview = async (req, res) => {
  const result = await adminDataService.getDataOverview();
  res.status(200).json({ success: true, ...result });
};

const getDashboardStats = async (req, res) => {
  const stats = await adminDashboardService.getDashboardStats({
    months: req.query.months,
    endYear: req.query.endYear,
    endMonth: req.query.endMonth,
  });
  res.status(200).json({ success: true, stats });
};

const getSystemHealth = async (req, res) => {
  const health = await systemHealthService.getSystemHealth();
  res.status(200).json({ success: true, health });
};

const getAnalytics = async (req, res) => {
  const period = req.query.period || 'month';
  const analytics = await adminAnalyticsService.getAdminAnalytics(period);
  res.status(200).json({ success: true, analytics });
};

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateAccountStatus,
  lockAccount,
  deleteAccount,
  resetAccountPassword,
  listAssignableClubs,
  getPendingAdminSummary,
  getDataOverview,
  getDashboardStats,
  getSystemHealth,
  getAnalytics,
};
