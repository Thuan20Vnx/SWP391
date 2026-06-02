const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  hideAnnouncement,
  deleteAnnouncement
} = require('../services/announcementManage.service');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const announcements = await listAnnouncements(req.authEmail);
    return res.json({ success: true, announcements });
  } catch (error) {
    console.error('announcement manage list:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const announcement = await createAnnouncement(req.authEmail, req.body);
    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('announcement manage create:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const announcement = await updateAnnouncement(req.authEmail, req.params.id, req.body);
    return res.json({ success: true, announcement });
  } catch (error) {
    console.error('announcement manage update:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
});

router.patch('/:id/hide', async (req, res) => {
  try {
    const announcement = await hideAnnouncement(req.authEmail, req.params.id);
    return res.json({ success: true, announcement });
  } catch (error) {
    console.error('announcement manage hide:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
});

const deleteHandler = async (req, res) => {
  try {
    await deleteAnnouncement(req.authEmail, req.params.id);
    return res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error) {
    console.error('announcement manage delete:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
};

router.delete('/:id', deleteHandler);
router.post('/:id/delete', deleteHandler);

module.exports = router;
