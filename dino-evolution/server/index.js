const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import routes (werden wir erstellen)
const apiRoutes = require('./routes/api');
const gameRoutes = require('./routes/game');

// Import database config
const connectDB = require('./config/database');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Connect to Database
connectDB();

// Routes
app.use('/api', apiRoutes);
app.use('/api/game', gameRoutes);

app.use((req, res, next) => {
    console.log('=== REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    
    // Redirect Detection
    const originalRedirect = res.redirect;
    res.redirect = function(statusOrUrl, url) {
        console.log('🔄 REDIRECT DETECTED!');
        console.log('   From:', req.originalUrl);
        console.log('   To:', arguments[0]);
        console.trace('Redirect source');
        return originalRedirect.apply(this, arguments);
    };
    
    next();
});

app.use(express.static(path.join(__dirname, '../client'), {
    redirect: false
}));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🎮 Player connected: ${socket.id}`);
    
    socket.on('joinGame', (playerId) => {
        socket.join(`game-${playerId}`);
        console.log(`Player ${playerId} joined game room`);
        
        socket.emit('gameConnected', {
            message: 'Successfully connected to Dino Evolution Server! 🦕',
            playerId: playerId,
            serverTime: Date.now()
        });
    });
    
    socket.on('playerInput', (inputData) => {
        console.log('Player input received:', inputData);
    });
    
    socket.on('disconnect', () => {
        console.log(`🚪 Player disconnected: ${socket.id}`);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Dino Evolution Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📡 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('💤 Server closed');
        mongoose.connection.close();
        process.exit(0);
    });
});