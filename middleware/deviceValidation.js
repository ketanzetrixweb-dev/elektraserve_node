const { Device } = require('../models');

/**
 * Validate that :id is a positive integer
 */
const validateDeviceId = (req, res, next) => {
    const { id } = req.params;
    const parsedId = Number(id);

    if (!id || isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid device ID. ID must be a positive integer.'
        });
    }

    req.params.id = parsedId;
    next();
};

/**
 * Validate payload for creating a new device (POST /api/devices)
 */
const validateCreateDevice = (req, res, next) => {
    const data = req.body || {};
    const errors = [];

    const identifier = data.DeviceIdentifier ?? data.deviceIdentifier;
    const name = data.DeviceName ?? data.deviceName;
    const solution = data.SolutionType ?? data.solutionType;
    const regStatus = data.RegistrationStatus ?? data.registrationStatus;
    const devStatus = data.DeviceStatus ?? data.deviceStatus;
    const regError = data.RegistrationError ?? data.registrationError;

    // DeviceIdentifier
    if (identifier === undefined || identifier === null || typeof identifier !== 'string' || identifier.trim() === '') {
        errors.push('DeviceIdentifier is required and cannot be blank.');
    } else if (identifier.trim().length > 50) {
        errors.push('DeviceIdentifier cannot exceed 50 characters.');
    }

    // DeviceName
    if (name === undefined || name === null || typeof name !== 'string' || name.trim() === '') {
        errors.push('DeviceName is required and cannot be blank.');
    } else if (name.trim().length > 100) {
        errors.push('DeviceName cannot exceed 100 characters.');
    }

    // SolutionType
    if (solution === undefined || solution === null || typeof solution !== 'string' || solution.trim() === '') {
        errors.push('SolutionType is required and cannot be blank.');
    } else if (solution.trim().length > 30) {
        errors.push('SolutionType cannot exceed 30 characters.');
    } else {
        req.body.SolutionType = solution.trim();
    }

    // RegistrationStatus (optional for create, defaults to 'Pending')
    if (regStatus !== undefined && regStatus !== null) {
        if (!Device.RegistrationStatuses.includes(regStatus)) {
            errors.push(`Invalid RegistrationStatus "${regStatus}". Allowed values: ${Device.RegistrationStatuses.join(', ')}.`);
        }
    }

    // DeviceStatus (optional for create, defaults to 'Offline')
    if (devStatus !== undefined && devStatus !== null) {
        if (!Device.DeviceStatuses.includes(devStatus)) {
            errors.push(`Invalid DeviceStatus "${devStatus}". Allowed values: ${Device.DeviceStatuses.join(', ')}.`);
        }
    }

    // RegistrationError (optional)
    if (regError !== undefined && regError !== null) {
        if (typeof regError !== 'string') {
            errors.push('RegistrationError must be a string.');
        } else if (regError.length > 250) {
            errors.push('RegistrationError cannot exceed 250 characters.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: `Validation Error: ${errors.join('; ')}`,
            errors
        });
    }

    // Sanitize and normalize trimmed fields on req.body
    req.body.DeviceIdentifier = identifier.trim();
    req.body.DeviceName = name.trim();
    req.body.SolutionType = solution.trim();
    if (regStatus) req.body.RegistrationStatus = regStatus.trim();
    if (devStatus) req.body.DeviceStatus = devStatus.trim();
    if (regError) req.body.RegistrationError = regError.trim();

    next();
};

/**
 * Validate payload for updating an existing device (PUT /api/devices/:id)
 */
const validateUpdateDevice = (req, res, next) => {
    const data = req.body || {};
    const errors = [];

    const identifier = data.DeviceIdentifier ?? data.deviceIdentifier;
    const name = data.DeviceName ?? data.deviceName;
    const solution = data.SolutionType ?? data.solutionType;
    const regStatus = data.RegistrationStatus ?? data.registrationStatus;
    const devStatus = data.DeviceStatus ?? data.deviceStatus;
    const regError = data.RegistrationError ?? data.registrationError;

    let hasField = false;

    // DeviceIdentifier
    if (identifier !== undefined) {
        hasField = true;
        if (typeof identifier !== 'string' || identifier.trim() === '') {
            errors.push('DeviceIdentifier cannot be blank.');
        } else if (identifier.trim().length > 50) {
            errors.push('DeviceIdentifier cannot exceed 50 characters.');
        } else {
            req.body.DeviceIdentifier = identifier.trim();
        }
    }

    // DeviceName
    if (name !== undefined) {
        hasField = true;
        if (typeof name !== 'string' || name.trim() === '') {
            errors.push('DeviceName cannot be blank.');
        } else if (name.trim().length > 100) {
            errors.push('DeviceName cannot exceed 100 characters.');
        } else {
            req.body.DeviceName = name.trim();
        }
    }

    // SolutionType
    if (solution !== undefined) {
        hasField = true;
        if (typeof solution !== 'string' || solution.trim() === '') {
            errors.push('SolutionType cannot be blank.');
        } else if (solution.trim().length > 30) {
            errors.push('SolutionType cannot exceed 30 characters.');
        } else {
            req.body.SolutionType = solution.trim();
        }
    }

    // RegistrationStatus
    if (regStatus !== undefined && regStatus !== null) {
        hasField = true;
        if (!Device.RegistrationStatuses.includes(regStatus)) {
            errors.push(`Invalid RegistrationStatus "${regStatus}". Allowed values: ${Device.RegistrationStatuses.join(', ')}.`);
        } else {
            req.body.RegistrationStatus = regStatus.trim();
        }
    }

    // DeviceStatus
    if (devStatus !== undefined && devStatus !== null) {
        hasField = true;
        if (!Device.DeviceStatuses.includes(devStatus)) {
            errors.push(`Invalid DeviceStatus "${devStatus}". Allowed values: ${Device.DeviceStatuses.join(', ')}.`);
        } else {
            req.body.DeviceStatus = devStatus.trim();
        }
    }

    // RegistrationError
    if (regError !== undefined && regError !== null) {
        hasField = true;
        if (typeof regError !== 'string') {
            errors.push('RegistrationError must be a string.');
        } else if (regError.length > 250) {
            errors.push('RegistrationError cannot exceed 250 characters.');
        } else {
            req.body.RegistrationError = regError.trim();
        }
    }

    if (!hasField) {
        return res.status(400).json({
            status: 'error',
            message: 'At least one field is required to update device.'
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: `Validation Error: ${errors.join('; ')}`,
            errors
        });
    }

    next();
};

module.exports = {
    validateDeviceId,
    validateCreateDevice,
    validateUpdateDevice
};
