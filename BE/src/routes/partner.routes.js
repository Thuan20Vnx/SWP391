const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const Partner = require('../models/Partner');
const Contract = require('../models/Contract');
const AppError = require('../utils/AppError');
const {
  getPartnerRecordsByEmail,
  getPrimaryPartner,
  getPartnerMePayload,
  buildPartnerStatsBundle,
  getPartnerEvents,
  getPartnerEventById,
  getPartnerContracts,
  getPartnerReports,
  getPartnerReportDetail
} = require('../services/partner.service');
const {
  saveDraft,
  submitRequest,
  cancelRequest,
  updatePendingRequest,
  updateApprovedRequest,
  hideRequest,
  deleteRequest,
  supplementRequest,
  getActiveEventRequestBundle
} = require('../services/partnerEventRequest.service');
const partnerQueryCache = require('../utils/partnerQueryCache');

router.use(authMiddleware);
router.use(requireRole(['partner']));

const MAX_LOGO_DATA_LEN = 4_500_000;

const handleError = (res, error, label) => {
  if (error instanceof AppError || error.statusCode) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
  console.error(`${label}:`, error);
  return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
};

router.get('/me', async (req, res) => {
  try {
    const payload = await getPartnerMePayload(req.authEmail);
    if (!payload.hasProfile) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có hồ sơ đối tác. Vui lòng gửi đề xuất đầu tiên.',
        partner: null
      });
    }
    return res.json({ success: true, ...payload });
  } catch (error) {
    return handleError(res, error, 'partner me');
  }
});

router.patch('/me', async (req, res) => {
  try {
    const partner = await getPrimaryPartner(req.authEmail);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Chưa có hồ sơ đối tác!' });
    }
    if (!['approved', 'info_requested'].includes(partner.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ cập nhật hồ sơ khi đã duyệt hoặc đang được yêu cầu bổ sung.'
      });
    }

    const updates = {};

    if (req.body.logo !== undefined) {
      const logo = typeof req.body.logo === 'string' ? req.body.logo.trim() : '';
      if (logo.length > MAX_LOGO_DATA_LEN) {
        return res.status(413).json({
          success: false,
          message: 'Ảnh logo quá lớn. Vui lòng chọn ảnh nhỏ hơn.'
        });
      }
      if (logo && !logo.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Logo phải là ảnh hợp lệ (PNG, JPG).'
        });
      }
      updates.logo = logo;
    }

    const allowed = [
      'name',
      'phone',
      'representative',
      'address',
      'description',
      'representativeTitle',
      'category',
      'partnerCode'
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    });

    const updated = await Partner.findByIdAndUpdate(
      partner._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-attachments');

    partnerQueryCache.invalidateEmail(req.authEmail);

    return res.json({ success: true, partner: updated });
  } catch (error) {
    return handleError(res, error, 'partner patch me');
  }
});

router.get('/stats', async (req, res) => {
  try {
    const data = await buildPartnerStatsBundle(req.authEmail);
    return res.json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error, 'partner stats');
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await getPartnerEvents(req.authEmail, req.query);
    return res.json({ success: true, events });
  } catch (error) {
    return handleError(res, error, 'partner events');
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const event = await getPartnerEventById(req.authEmail, req.params.id);
    return res.json({ success: true, event });
  } catch (error) {
    return handleError(res, error, 'partner event detail');
  }
});

router.get('/contracts', async (req, res) => {
  try {
    const contracts = await getPartnerContracts(req.authEmail);
    return res.json({ success: true, contracts });
  } catch (error) {
    return handleError(res, error, 'partner contracts');
  }
});

router.get('/reports', async (req, res) => {
  try {
    const reports = await getPartnerReports(req.authEmail);
    return res.json({ success: true, reports });
  } catch (error) {
    return handleError(res, error, 'partner reports');
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const report = await getPartnerReportDetail(req.authEmail, req.params.id);
    return res.json({ success: true, report });
  } catch (error) {
    return handleError(res, error, 'partner report detail');
  }
});

router.get('/proposals', async (req, res) => {
  try {
    const proposals = await getPartnerRecordsByEmail(req.authEmail, { includeHeavy: false });
    return res.json({ success: true, proposals });
  } catch (error) {
    return handleError(res, error, 'partner proposals');
  }
});

router.post('/proposals', async (req, res) => {
  try {
    const {
      name,
      phone,
      representative,
      address,
      description,
      partnerCode,
      category,
      proposedEventTitle,
      expectedSponsorAmount,
      representativeTitle,
      benefits
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Tên doanh nghiệp là bắt buộc!' });
    }
    if (!proposedEventTitle?.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề sự kiện đề xuất là bắt buộc!' });
    }

    const email = req.authEmail.trim().toLowerCase();
    const partner = await Partner.create({
      name: name.trim(),
      email,
      phone: phone?.trim() || '',
      representative: representative?.trim() || '',
      address: address?.trim() || '',
      description: description?.trim() || '',
      partnerCode: partnerCode?.trim() || '',
      category: category?.trim() || '',
      proposedEventTitle: proposedEventTitle.trim(),
      expectedSponsorAmount: Number(expectedSponsorAmount) || 0,
      representativeTitle: representativeTitle?.trim() || '',
      benefits: Array.isArray(benefits) ? benefits.filter(Boolean) : [],
      status: 'pending'
    });

    await Contract.create({
      partnerId: partner._id,
      title: proposedEventTitle.trim(),
      amount: Number(expectedSponsorAmount) || 0,
      status: 'pending'
    });

    const { ensurePrimaryPartnerMember } = require('../services/partnerMember.service');
    await ensurePrimaryPartnerMember(partner);

    partnerQueryCache.invalidateEmail(email);

    return res.status(201).json({
      success: true,
      partner,
      message: 'Đã gửi đề xuất. CTSV sẽ xem xét trong 3–5 ngày làm việc.'
    });
  } catch (error) {
    return handleError(res, error, 'partner create proposal');
  }
});

router.patch('/proposals/:id/supplement', async (req, res) => {
  try {
    const result = await supplementRequest(req.authEmail, req.params.id, req.body);
    return res.json({
      success: true,
      partner: result.partner,
      request: result.request,
      message: 'Đã gửi bổ sung hồ sơ. CTSV sẽ xem xét lại.'
    });
  } catch (error) {
    return handleError(res, error, 'partner supplement');
  }
});

router.get('/event-requests/active', async (req, res) => {
  try {
    const bundle = await getActiveEventRequestBundle(req.authEmail);
    return res.json({ success: true, ...bundle });
  } catch (error) {
    return handleError(res, error, 'partner event active');
  }
});

router.put('/event-requests/draft', async (req, res) => {
  try {
    const request = await saveDraft(req.authEmail, req.body);
    return res.json({ success: true, request, message: 'Đã lưu bản nháp.' });
  } catch (error) {
    return handleError(res, error, 'partner event draft');
  }
});

router.post('/event-requests/submit', async (req, res) => {
  try {
    const result = await submitRequest(req.authEmail, req.body);
    return res.status(201).json({
      success: true,
      request: result.request,
      partner: result.partner,
      message: 'Đã gửi yêu cầu tạo sự kiện. CTSV sẽ xem xét trong 3–5 ngày làm việc.'
    });
  } catch (error) {
    return handleError(res, error, 'partner event submit');
  }
});

router.post('/event-requests/:id/cancel', async (req, res) => {
  try {
    const request = await cancelRequest(req.authEmail, req.params.id);
    return res.json({ success: true, request, message: 'Đã hủy yêu cầu sự kiện.' });
  } catch (error) {
    return handleError(res, error, 'partner event cancel');
  }
});

router.patch('/event-requests/:id', async (req, res) => {
  try {
    const PartnerEventRequest = require('../models/PartnerEventRequest');
    const existing = await PartnerEventRequest.findById(req.params.id);
    if (!existing) {
      throw new AppError('Không tìm thấy yêu cầu!', 404);
    }
    const request =
      existing.status === 'pending'
        ? await updatePendingRequest(req.authEmail, req.params.id, req.body)
        : await updateApprovedRequest(req.authEmail, req.params.id, req.body);
    const message =
      existing.status === 'pending'
        ? 'Đã cập nhật đơn đang chờ duyệt.'
        : 'Đã cập nhật thông tin sự kiện.';
    return res.json({ success: true, request, message });
  } catch (error) {
    return handleError(res, error, 'partner event update');
  }
});

router.patch('/event-requests/:id/hide', async (req, res) => {
  try {
    const request = await hideRequest(req.authEmail, req.params.id);
    return res.json({ success: true, request, message: 'Đã ẩn sự kiện khỏi danh sách công khai.' });
  } catch (error) {
    return handleError(res, error, 'partner event hide');
  }
});

router.delete('/event-requests/:id', async (req, res) => {
  try {
    const request = await deleteRequest(req.authEmail, req.params.id);
    return res.json({ success: true, request, message: 'Đã xóa yêu cầu sự kiện.' });
  } catch (error) {
    return handleError(res, error, 'partner event delete');
  }
});

module.exports = router;
