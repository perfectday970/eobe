// server/routes/game.js
const express = require('express');
const router = express.Router();
const { Game } = require('../models');
const { v4: uuidv4 } = require('uuid'); // npm install uuid

// ===================================
// EVOLUTION PHASE
// ===================================

// Neue Session erstellen oder bestehende laden
router.post('/session', async (req, res) => {
    try {
        let { sessionId } = req.body;
        
        if (!sessionId) {
            // Neue Session erstellen
            sessionId = uuidv4();
            
            const newGame = new Game({
                sessionId: sessionId,
                selectedSlots: [],
                remainingPoints: 5000,
                currentLevel: 1,
                phase: 'evolution'
            });
            
            await newGame.save();
            console.log(`🎮 Neue Session erstellt: ${sessionId}`);
            
            return res.json({
                success: true,
                sessionId: sessionId,
                gameData: {
                    selectedSlots: [],
                    remainingPoints: 5000,
                    currentLevel: 1,
                    phase: 'evolution'
                }
            });
        } else {
            // Bestehende Session laden
            const game = await Game.findOne({ sessionId });
            
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Session nicht gefunden'
                });
            }
            
            console.log(`🔄 Session geladen: ${sessionId}, Phase: ${game.phase}`);
            
            return res.json({
                success: true,
                sessionId: sessionId,
                gameData: {
                    selectedSlots: game.selectedSlots,
                    remainingPoints: game.remainingPoints,
                    currentLevel: game.currentLevel,
                    phase: game.phase,
                    populationData: game.populationData,
                    enemyData: game.enemyData
                }
            });
        }
    } catch (error) {
        console.error('❌ Fehler bei Session-Management:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server-Fehler bei Session-Verwaltung',
            details: error.message 
        });
    }
});

// Evolution-Daten speichern (von index.html)
router.post('/save-evolution', async (req, res) => {
    try {
        const { sessionId, selectedSlots, remainingPoints } = req.body;
        
        if (!sessionId || !selectedSlots) {
            return res.status(400).json({
                success: false,
                error: 'SessionId und selectedSlots sind erforderlich'
            });
        }
        
        console.log(`💾 Speichere Evolution für Session: ${sessionId}`);
        console.log(`📊 Slots: ${selectedSlots.length}, Punkte: ${remainingPoints}`);
        
        const game = await Game.findOneAndUpdate(
            { sessionId },
            {
                selectedSlots: selectedSlots,
                remainingPoints: remainingPoints || 0,
                phase: 'population',
                updatedAt: Date.now()
            },
            { 
                new: true, 
                upsert: true // Erstelle falls nicht vorhanden
            }
        );
        
        res.json({
            success: true,
            message: 'Evolution-Daten gespeichert',
            gameData: {
                sessionId: game.sessionId,
                selectedSlots: game.selectedSlots,
                remainingPoints: game.remainingPoints,
                currentLevel: game.currentLevel
            }
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Evolution:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Speichern der Evolution-Daten',
            details: error.message 
        });
    }
});

// Evolution-Daten laden (für population.html)
router.get('/load-evolution/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const game = await Game.findOne({ sessionId });
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Spiel-Session nicht gefunden'
            });
        }
        
        console.log(`📂 Lade Evolution für Session: ${sessionId}`);
        
        res.json({
            success: true,
            gameData: {
                selectedSlots: game.selectedSlots,
                remainingPoints: game.remainingPoints,
                currentLevel: game.currentLevel,
                phase: game.phase
            }
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Evolution:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Laden der Evolution-Daten',
            details: error.message 
        });
    }
});

// ===================================
// POPULATION PHASE  
// ===================================

// Population-Daten speichern (von population.html)
router.post('/save-population', async (req, res) => {
    try {
        const { sessionId, populationData, enemyData, currentLevel } = req.body;
        
        if (!sessionId || !populationData || !enemyData) {
            return res.status(400).json({
                success: false,
                error: 'SessionId, populationData und enemyData sind erforderlich'
            });
        }
        
        console.log(`🦕 Speichere Population für Session: ${sessionId}`);
        console.log(`📊 ${populationData.length} eigene Arten, ${enemyData.length} Gegner`);
        
        const game = await Game.findOneAndUpdate(
            { sessionId },
            {
                populationData: populationData,
                enemyData: enemyData,
                currentLevel: currentLevel || 1,
                phase: 'level',
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Spiel-Session nicht gefunden'
            });
        }
        
        res.json({
            success: true,
            message: 'Population-Daten gespeichert',
            gameData: {
                populationData: game.populationData,
                enemyData: game.enemyData,
                currentLevel: game.currentLevel
            }
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Population:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Speichern der Population-Daten',
            details: error.message 
        });
    }
});

// ===================================
// LEVEL PHASE
// ===================================

// Level-Daten laden (für level.html)
router.get('/load-level/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const game = await Game.findOne({ sessionId });
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Spiel-Session nicht gefunden'
            });
        }
        
        console.log(`🎮 Lade Level für Session: ${sessionId}, Level: ${game.currentLevel}`);
        
        // Fallback-Daten falls noch keine Population berechnet
        let levelData = {
            populationData: game.populationData || [],
            enemyData: game.enemyData || [],
            level: game.currentLevel || 1
        };
        
        // Wenn keine Population-Daten vorhanden, Standard-Daten verwenden
        if (levelData.populationData.length === 0 && game.selectedSlots.length > 0) {
            console.log('⚠️ Keine Population-Daten gefunden, verwende Fallback');
            levelData = generateFallbackLevelData(game.selectedSlots, game.currentLevel);
        }
        
        res.json({
            success: true,
            levelData: levelData
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden des Levels:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Laden der Level-Daten',
            details: error.message 
        });
    }
});

// Level-Fortschritt speichern
router.post('/save-progress', async (req, res) => {
    try {
        const { sessionId, currentLevel, populationData } = req.body;
        
        const game = await Game.findOneAndUpdate(
            { sessionId },
            {
                currentLevel: currentLevel,
                populationData: populationData,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Spiel-Session nicht gefunden'
            });
        }
        
        console.log(`📈 Level-Fortschritt gespeichert: ${sessionId}, Level: ${currentLevel}`);
        
        res.json({
            success: true,
            message: 'Fortschritt gespeichert'
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern des Fortschritts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Speichern des Fortschritts',
            details: error.message 
        });
    }
});

// ===================================
// HILFSFUNKTIONEN
// ===================================

function generateFallbackLevelData(selectedSlots, level) {
    // Einfache Fallback-Population falls keine Berechnung stattfand
    const populationData = selectedSlots.map((slot, index) => ({
        name: slot.name,
        slotIndex: index,
        type: getDinoType(slot.properties),
        properties: slot.properties,
        population: {
            total: 8,
            adults: 5,
            juveniles: 3,
            isExtinct: false
        }
    }));
    
    return {
        populationData: populationData,
        enemyData: [], // Wird im Frontend generiert
        level: level
    };
}

function getDinoType(properties) {
    const ratio = properties.vorderbeine_länge / properties.hinterbeine_länge;
    if (ratio < 0.4) return 'zweifüßig';
    if (ratio < 0.8) return 'semi-zweifüßig';
    return 'vierfüßig';
}

// ===================================
// BESTEHENDE ENDPOINTS (erweitert)
// ===================================

router.get('/saves/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        
        // Finde alle Spiele für einen Spieler (falls Player-System später hinzugefügt wird)
        const games = await Game.find({}).sort({ updatedAt: -1 }).limit(10);
        
        console.log(`📂 Save-Games abgerufen für Player: ${playerId}`);
        
        res.json({
            success: true,
            saves: games.map(game => ({
                sessionId: game.sessionId,
                level: game.currentLevel,
                phase: game.phase,
                lastPlayed: game.updatedAt,
                slotsCount: game.selectedSlots.length
            })),
            count: games.length
        });
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Saves:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/save', async (req, res) => {
    try {
        const { sessionId, gameData } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId ist erforderlich'
            });
        }
        
        const game = await Game.findOneAndUpdate(
            { sessionId },
            { 
                ...gameData,
                updatedAt: Date.now()
            },
            { new: true, upsert: true }
        );
        
        console.log(`💾 Spiel gespeichert: ${sessionId}`);
        
        res.json({
            success: true,
            message: 'Spiel erfolgreich gespeichert',
            sessionId: game.sessionId,
            timestamp: game.updatedAt
        });
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;