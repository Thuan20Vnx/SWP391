const qrScannerService = require('../services/qrScanner.service');

const getStationQr = async (req, res) => {
  const result = await qrScannerService.getStationQrCodes(req.user, req.params.id);
  res.status(200).json({ success: true, ...result });
};

const generateStationQr = async (req, res) => {
  const result = await qrScannerService.generateStationQr(req.user, req.params.id, req.body);
  res.status(201).json({ success: true, ...result });
};

const selfScan = async (req, res) => {
  const result = await qrScannerService.performSelfScan(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const selfScanByCode = async (req, res) => {
  const result = await qrScannerService.performSelfScanByCode(req.user, req.body);
  res.status(200).json({ success: true, ...result });
};

module.exports = { getStationQr, generateStationQr, selfScan, selfScanByCode };
