require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const apiRoutes = require('./routes');
const { swaggerUi, swaggerDocument } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages', 'X-Current-Page', 'X-Page-Size']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs', (req, res) => res.redirect('/api-docs'));

// Health check route
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'ElektraServe API is running',
        documentation: `http://localhost:${PORT}/api-docs`
    });
});

// DB health check route
app.get('/api/db-check', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({
            status: 'success',
            message: 'Database connection is active',
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database query failed',
            error: error.message
        });
    }
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    await db.testConnection();
});
