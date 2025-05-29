const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        name: 'Dino Evolution API',
        version: '1.0.0',
        status: 'active',
        endpoints: {
            health: '/health',
            game: '/api/game/*',
            documentation: 'Coming soon...'
        }
    });
});

router.get('/status', (req, res) => {
    res.json({
        server: 'online',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        nodeVersion: process.version
    });
});

router.post('/test', (req, res) => {
    console.log('🧪 Test endpoint called with data:', req.body);
    res.json({
        success: true,
        message: 'Test successful!',
        receivedData: req.body,
        serverTime: Date.now()
    });
});

module.exports = router;