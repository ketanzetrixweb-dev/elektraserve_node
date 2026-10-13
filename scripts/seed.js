require('dotenv').config();
const { seedDevices } = require('../seeders/deviceSeeder');

async function main() {
    const isClean = process.argv.includes('--clean') || process.argv.includes('--fresh');

    try {
        await seedDevices({ clean: isClean });
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

main();
