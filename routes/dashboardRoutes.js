const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Summary endpoint
router.get('/summary', dashboardController.getSummary);

module.exports = router;
