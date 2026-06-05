const qrScannerService = require('../services/qrScanner.service');

const listGrants = async (req, res) => {
  const result = await qrScannerService.listGrantsForEvent(req.user, req.params.id);
  res.status(200).json({ success: true, ...result });
};

const createGrant = async (req, res) => {
  const result = await qrScannerService.createGrant(req.user, req.params.id, req.body);
  res.status(201).json({ success: true, ...result });
};

const revokeGrant = async (req, res) => {
  const result = await qrScannerService.revokeGrant(req.user, req.params.id, req.params.grantId);
  res.status(200).json({ success: true, ...result });
};

const scanRegistration = async (req, res) => {
  const result = await qrScannerService.performScan(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const myScannerEvents = async (req, res) => {
  const result = await qrScannerService.listMyScannerEvents(req.user._id);
  res.status(200).json({ success: true, ...result });
};

module.exports = { listGrants, createGrant, revokeGrant, scanRegistration, myScannerEvents };
