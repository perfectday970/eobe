// server/models/Game.js
const mongoose = require('mongoose');

const DinoSlotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    properties: {
        gepanzert: { type: Number, default: 0 },
        stachelig: { type: Number, default: 0 },
        farbig: { type: Number, default: 0 },
        tarnung: { type: Number, default: 0 },
        kopf_beisskraft: { type: Number, default: 0 },
        kopf_größe: { type: Number, default: 0 },
        kopf_hörner_anzahl: { type: Number, default: 0 },
        kopf_hörner_größe: { type: Number, default: 0 },
        kragen_größe: { type: Number, default: 0 },
        maul_zahntyp: { type: Number, default: 0 },
        hals_länge: { type: Number, default: 0 },
        hals_breite: { type: Number, default: 0 },
        körper_länge: { type: Number, default: 0 },
        körper_höhe: { type: Number, default: 0 },
        vorderbeine_länge: { type: Number, default: 0 },
        vorderbeine_stärke: { type: Number, default: 0 },
        vorderklauen_länge: { type: Number, default: 0 },
        hinterbeine_länge: { type: Number, default: 0 },
        hinterbeine_stärke: { type: Number, default: 0 },
        hinterklauen_länge: { type: Number, default: 0 },
        schwanz_länge: { type: Number, default: 0 },
        schwanz_breite: { type: Number, default: 0 },
        schwanz_keule: { type: Number, default: 0 },
        schwanz_stacheln: { type: Number, default: 0 },
        flügel: { type: Number, default: 0 },
        flossen: { type: Number, default: 0 },
        fleisch: { type: Number, default: 0 },
        pflanzen: { type: Number, default: 0 },
        aas: { type: Number, default: 0 }
    }
});

const PopulationSchema = new mongoose.Schema({
    total: { type: Number, required: true },
    adults: { type: Number, required: true },
    juveniles: { type: Number, required: true },
    isExtinct: { type: Boolean, default: false }
});

const GameSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    
    // Evolution Phase
    selectedSlots: [DinoSlotSchema],
    remainingPoints: { type: Number, default: 5000 },
    
    // Level Phase
    currentLevel: { type: Number, default: 1 },
    populationData: [{
        name: String,
        slotIndex: Number,
        type: String,
        properties: DinoSlotSchema.properties,
        population: PopulationSchema
    }],
    enemyData: [{
        name: String,
        type: String,
        properties: DinoSlotSchema.properties,
        population: PopulationSchema
    }],
    
    // Meta
    phase: { 
        type: String, 
        enum: ['evolution', 'population', 'level'], 
        default: 'evolution' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware für updatedAt
GameSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Game', GameSchema);
