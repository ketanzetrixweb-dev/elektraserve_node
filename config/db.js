const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'elektraserve_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        timezone: '+00:00',
        define: {
            timestamps: false
        }
    }
);

// Helper function to test DB connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Sequelize: MySQL Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Sequelize: MySQL Database connection failed:', error.message);
        return false;
    }
};

sequelize.testConnection = testConnection;

module.exports = sequelize;
