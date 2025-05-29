const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('🎯 MongoDB connected successfully');
        
        mongoose.connection.on('connected', () => {
            console.log(`📊 Connected to database: ${mongoose.connection.name}`);
        });
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('📡 MongoDB disconnected');
        });
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;