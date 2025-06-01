// server/models/Game.js - TEMPORÄR FÜR TEST
const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    
    // Evolution Phase
    selectedSlots: [mongoose.Schema.Types.Mixed],
    remainingPoints: { type: Number, default: 5000 },
    
    // Level Phase - TEMPORÄR ALLES ALS MIXED
    currentLevel: { type: Number, default: 1 },
    populationData: [mongoose.Schema.Types.Mixed],  // TEMPORÄR
    enemyData: [mongoose.Schema.Types.Mixed],       // TEMPORÄR
    
    // Meta
    phase: { 
        type: String, 
        enum: ['evolution', 'population', 'level'], 
        default: 'evolution' 
    },

    totalEarnedPoints: { type: Number, default: 0 },
    completedLevels: { type: Number, default: 0 },
    levelHistory: [{
        level: Number,
        completedAt: Date,
        earnedPoints: Number,
        victory: Boolean
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true // Automatische createdAt/updatedAt
});

// Index für bessere Performance
GameSchema.index({ sessionId: 1 });
GameSchema.index({ updatedAt: -1 });

// Middleware für updatedAt
GameSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Game', GameSchema);