const { Device } = require('../models');

/**
 * Controller for dashboard summary metrics
 */
const dashboardController = {
    /**
     * GET /api/dashboard/summary
     * Return total, pending, registered, online, offline, error counts
     * calculated dynamically from persisted records.
     */
    async getSummary(req, res) {
        try {
            const summary = await Device.getDashboardSummary();
            return res.status(200).json({
                status: 'success',
                data: summary
            });
        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve dashboard summary',
                error: error.message
            });
        }
    }
};

module.exports = dashboardController;
