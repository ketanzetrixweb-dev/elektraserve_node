const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');

// Allowed enum constants
const SOLUTION_TYPES = Object.freeze([
    'Solar',
    'Pump',
    'AC',
    'Compressor',
    'LTDB',
    'Other'
]);

const REGISTRATION_STATUSES = Object.freeze([
    'Pending',
    'Registered',
    'Error'
]);

const DEVICE_STATUSES = Object.freeze([
    'Online',
    'Offline'
]);

// Helper to get second-precision UTC Date (matching MySQL DATETIME storage)
function getSecondPrecisionDate() {
    return new Date(Math.floor(Date.now() / 1000) * 1000);
}

// Define Sequelize Device Model
const Device = sequelize.define('Device', {
    Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    DeviceIdentifier: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    DeviceName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    SolutionType: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    RegistrationStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Pending'
    },
    DeviceStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Offline'
    },
    LastSeenUtc: {
        type: DataTypes.DATE,
        allowNull: true
    },
    RegistrationError: {
        type: DataTypes.STRING(250),
        allowNull: true
    },
    CreatedAtUtc: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    UpdatedAtUtc: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'devices',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['DeviceIdentifier'] },
        { fields: ['SolutionType'] },
        { fields: ['RegistrationStatus'] },
        { fields: ['DeviceStatus'] }
    ]
});

// Attach constants
Device.SolutionTypes = SOLUTION_TYPES;
Device.RegistrationStatuses = REGISTRATION_STATUSES;
Device.DeviceStatuses = DEVICE_STATUSES;

/**
 * Find device by unique identifier (case-insensitive)
 */
Device.findByIdentifier = async function (deviceIdentifier, excludeId = null) {
    const where = {
        [Op.and]: [
            sequelize.where(
                sequelize.fn('LOWER', sequelize.col('DeviceIdentifier')),
                deviceIdentifier.trim().toLowerCase()
            )
        ]
    };

    if (excludeId !== null) {
        where[Op.and].push({ Id: { [Op.ne]: Number(excludeId) } });
    }

    return Device.findOne({ where });
};

/**
 * Register device
 * Business rule: Only Pending or Error can be registered.
 * Already Registered returns conflict (409) without mutating data.
 */
Device.registerDevice = async function (id) {
    const device = await Device.findByPk(Number(id));
    if (!device) {
        const error = new Error(`Device with ID ${id} not found.`);
        error.statusCode = 404;
        throw error;
    }

    if (device.RegistrationStatus === 'Registered') {
        const error = new Error(`Device "${device.DeviceName}" (${device.DeviceIdentifier}) is already registered.`);
        error.statusCode = 409;
        throw error;
    }

    device.RegistrationStatus = 'Registered';
    device.RegistrationError = null;
    device.UpdatedAtUtc = getSecondPrecisionDate();
    await device.save();
    return device;
};

/**
 * Simulate Online
 * Business rule: Sets Online + LastSeenUtc now. Refreshes UpdatedAtUtc.
 */
Device.simulateOnline = async function (id) {
    const device = await Device.findByPk(Number(id));
    if (!device) {
        const error = new Error(`Device with ID ${id} not found.`);
        error.statusCode = 404;
        throw error;
    }

    const now = getSecondPrecisionDate();
    device.DeviceStatus = 'Online';
    device.LastSeenUtc = now;
    device.UpdatedAtUtc = now;
    await device.save();
    return device;
};

/**
 * Simulate Offline
 * Business rule: Sets Offline, preserves existing LastSeenUtc, updates UpdatedAtUtc.
 */
Device.simulateOffline = async function (id) {
    const device = await Device.findByPk(Number(id));
    if (!device) {
        const error = new Error(`Device with ID ${id} not found.`);
        error.statusCode = 404;
        throw error;
    }

    device.DeviceStatus = 'Offline';
    device.UpdatedAtUtc = getSecondPrecisionDate();
    await device.save();
    return device;
};

/**
 * Retry Registration
 * Business rule: Error -> Pending only. Clears RegistrationError.
 */
Device.retryRegistration = async function (id) {
    const device = await Device.findByPk(Number(id));
    if (!device) {
        const error = new Error(`Device with ID ${id} not found.`);
        error.statusCode = 404;
        throw error;
    }

    if (device.RegistrationStatus !== 'Error') {
        const error = new Error(`Cannot retry registration. Only devices in 'Error' status can retry registration. Current status is '${device.RegistrationStatus}'.`);
        error.statusCode = 400;
        throw error;
    }

    device.RegistrationStatus = 'Pending';
    device.RegistrationError = null;
    device.UpdatedAtUtc = getSecondPrecisionDate();
    await device.save();
    return device;
};

/**
 * Dashboard Summary counts computed from persisted records
 */
Device.getDashboardSummary = async function () {
    const [total, pending, registered, error, online, offline] = await Promise.all([
        Device.count(),
        Device.count({ where: { RegistrationStatus: 'Pending' } }),
        Device.count({ where: { RegistrationStatus: 'Registered' } }),
        Device.count({ where: { RegistrationStatus: 'Error' } }),
        Device.count({ where: { DeviceStatus: 'Online' } }),
        Device.count({ where: { DeviceStatus: 'Offline' } })
    ]);

    return {
        total,
        pending,
        registered,
        error,
        online,
        offline
    };
};

module.exports = Device;
