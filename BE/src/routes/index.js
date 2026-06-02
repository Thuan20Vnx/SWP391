const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const eventRoutes = require('./event.routes');
const clubRoutes = require('./club.routes');
const ctsvRoutes = require('./ctsv.routes');
const adminRoutes = require('./admin.routes');
const partnerRoutes = require('./partner.routes');
const announcementRoutes = require('./announcement.routes');
const announcementManageRoutes = require('./announcementManage.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/events', eventRoutes);
router.use('/clubs', clubRoutes);
router.use('/announcements/manage', announcementManageRoutes);
router.use('/announcements', announcementRoutes);
router.use('/ctsv', ctsvRoutes);
router.use('/admin', adminRoutes);
router.use('/partner', partnerRoutes);

module.exports = router;
