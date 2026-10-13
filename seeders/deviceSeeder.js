const { Device } = require('../models');
const sequelize = require('../config/db');

// Demo dataset matching specification
function getDemoDevices() {
    const now = Date.now();

    return [
        {
            DeviceIdentifier: 'DEMO-1001',
            DeviceName: 'Rooftop Solar 01',
            SolutionType: 'Solar',
            RegistrationStatus: 'Registered',
            DeviceStatus: 'Online',
            LastSeenUtc: new Date(now - 5 * 60 * 1000), // 5 mins ago (Recent)
            RegistrationError: null,
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        },
        {
            DeviceIdentifier: 'DEMO-1002',
            DeviceName: 'Pump Starter 02',
            SolutionType: 'Pump',
            RegistrationStatus: 'Pending',
            DeviceStatus: 'Offline',
            LastSeenUtc: null, // Never
            RegistrationError: null,
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        },
        {
            DeviceIdentifier: 'DEMO-1003',
            DeviceName: 'AC Panel 03',
            SolutionType: 'AC',
            RegistrationStatus: 'Error',
            DeviceStatus: 'Offline',
            LastSeenUtc: null, // Never
            RegistrationError: 'Device authentication failed during handshake',
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        },
        {
            DeviceIdentifier: 'DEMO-1004',
            DeviceName: 'Solar Meter 04',
            SolutionType: 'Solar',
            RegistrationStatus: 'Registered',
            DeviceStatus: 'Offline',
            LastSeenUtc: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago (Older)
            RegistrationError: null,
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        },
        {
            DeviceIdentifier: 'DEMO-1005',
            DeviceName: 'Compressor 05',
            SolutionType: 'Compressor',
            RegistrationStatus: 'Pending',
            DeviceStatus: 'Online',
            LastSeenUtc: new Date(now - 12 * 60 * 1000), // 12 mins ago (Recent)
            RegistrationError: null,
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        },
        {
            DeviceIdentifier: 'DEMO-1006',
            DeviceName: 'LTDB Panel 06',
            SolutionType: 'LTDB',
            RegistrationStatus: 'Registered',
            DeviceStatus: 'Online',
            LastSeenUtc: new Date(now - 2 * 60 * 1000), // 2 mins ago (Recent)
            RegistrationError: null,
            CreatedAtUtc: new Date(),
            UpdatedAtUtc: new Date()
        }
    ];
}

/**
 * Seed devices table using Sequelize
 * @param {Object} options - { clean: boolean }
 */
async function seedDevices({ clean = false } = {}) {
    if (clean) {
        console.log('🧹 Clearing existing devices table...');
        await Device.destroy({ where: {}, truncate: true, cascade: true });
    }

    const devices = getDemoDevices();
    console.log(`🌱 Seeding ${devices.length} demo devices using Sequelize ORM...`);

    for (const dev of devices) {
        await Device.upsert(dev);
        console.log(`   ✔ Seeded device: ${dev.DeviceIdentifier} (${dev.DeviceName})`);
    }

    console.log('✅ Demo devices seeded successfully with Sequelize.');
}

module.exports = {
    getDemoDevices,
    seedDevices
};
