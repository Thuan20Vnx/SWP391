const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const eventRoutes = require('./event.routes');
const clubRoutes = require('./club.routes');
const ctsvRoutes = require('./ctsv.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/events', eventRoutes);
router.use('/clubs', clubRoutes);
router.use('/ctsv', ctsvRoutes);

module.exports = router;
