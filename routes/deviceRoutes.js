const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const {
    validateDeviceId,
    validateCreateDevice,
    validateUpdateDevice
} = require('../middleware');

// CRUD endpoints
router.get('/', deviceController.getAllDevices);
router.get('/:id', validateDeviceId, deviceController.getDeviceById);
router.post('/', validateCreateDevice, deviceController.createDevice);
router.put('/:id', validateDeviceId, validateUpdateDevice, deviceController.updateDevice);
router.delete('/:id', validateDeviceId, deviceController.deleteDevice);

// Business action endpoints
router.post('/:id/register', validateDeviceId, deviceController.registerDevice);
router.post('/:id/simulate-online', validateDeviceId, deviceController.simulateOnline);
router.post('/:id/simulate-offline', validateDeviceId, deviceController.simulateOffline);
router.post('/:id/retry-registration', validateDeviceId, deviceController.retryRegistration);

module.exports = router;
