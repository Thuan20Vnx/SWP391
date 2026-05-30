const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireRole');
const Partner = require('../models/Partner');
const Contract = require('../models/Contract');

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/partners', async (req, res) => {
  try {
    const status = req.query.status || 'pending_admin';
    const partners = await Partner.find({ status })
      .sort({ ctsvApprovedAt: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, partners });
  } catch (error) {
    console.error('admin partners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/approve', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký!' });
    }
    if (partner.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ phê duyệt được đơn đã qua CTSV và đang chờ Admin.'
      });
    }
    partner.status = 'approved';
    partner.approvedByEmail = req.authEmail;
    partner.adminApprovedAt = new Date();
    await partner.save();
    await Contract.updateMany(
      { partnerId: partner._id, status: 'pending' },
      { status: 'approved', approvedByEmail: req.authEmail }
    );
    return res.json({ success: true, partner, message: 'Đã phê duyệt đối tác thành công.' });
  } catch (error) {
    console.error('admin approve partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký!' });
    }
    if (partner.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ từ chối được đơn đang chờ Admin phê duyệt.'
      });
    }
    partner.status = 'rejected';
    partner.rejectionReason = reason;
    await partner.save();
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('admin reject partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
