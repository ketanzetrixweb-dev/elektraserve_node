const express = require('express');
const router = express.Router();

const deviceRoutes = require('./deviceRoutes');
const dashboardRoutes = require('./dashboardRoutes');

router.use('/devices', deviceRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
