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
        
        console.log('🔍 DEBUG Server: Session Request mit ID:', sessionId?.substring(0, 8) || 'KEINE');
        
        if (sessionId) {
            // BESTEHENDE SESSION LADEN
            console.log('📂 DEBUG Server: Versuche bestehende Session zu laden...');
            
            const game = await Game.findOne({ sessionId });
            
            if (game) {
                console.log('✅ DEBUG Server: Session gefunden, Level:', game.currentLevel);
                
                return res.json({
                    success: true,
                    sessionId: sessionId,
                    gameData: {
                        selectedSlots: game.selectedSlots || [],
                        remainingPoints: game.remainingPoints || 5000,
                        currentLevel: game.currentLevel || 1,
                        phase: game.phase || 'evolution',
                        populationData: game.populationData || [],
                        enemyData: game.enemyData || [],
                        totalEarnedPoints: game.totalEarnedPoints || 0,
                        completedLevels: game.completedLevels || 0
                    }
                });
            } else {
                console.log('❌ DEBUG Server: Session nicht gefunden, erstelle neue...');
                // Falls Session nicht existiert, erstelle neue (siehe unten)
            }
        }
        
        // NEUE SESSION ERSTELLEN
        sessionId = uuidv4();
        console.log('🆕 DEBUG Server: Erstelle neue Session:', sessionId.substring(0, 8));
        
        const newGame = new Game({
            sessionId: sessionId,
            selectedSlots: [],
            remainingPoints: 5000,
            currentLevel: 1,
            phase: 'evolution',
            totalEarnedPoints: 0,
            completedLevels: 0,
            levelHistory: []
        });
        
        await newGame.save();
        console.log('💾 DEBUG Server: Neue Session gespeichert');
        
        return res.json({
            success: true,
            sessionId: sessionId,
            gameData: {
                selectedSlots: [],
                remainingPoints: 5000,
                currentLevel: 1,
                phase: 'evolution',
                totalEarnedPoints: 0,
                completedLevels: 0
            }
        });
        
    } catch (error) {
        console.error('❌ DEBUG Server: Fehler bei Session-Management:', error);
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
        const { sessionId, selectedSlots, remainingPoints, currentLevel } = req.body;
       
        if (!sessionId || !selectedSlots) {
            return res.status(400).json({
                success: false,
                error: 'SessionId und selectedSlots sind erforderlich'
            });
        }
        
        console.log(`💾 Speichere Evolution für Session: ${sessionId}`);
        console.log(`📊 Slots: ${selectedSlots.length}, Punkte: ${remainingPoints}`);

        const updateData = {
            selectedSlots: selectedSlots,
            remainingPoints: remainingPoints || 0,
            phase: 'population',
            updatedAt: Date.now()
        };
        
        // NEU: Level auch speichern
        if (currentLevel) {
            updateData.currentLevel = currentLevel;
        }

        const game = await Game.findOneAndUpdate(
            { sessionId },
            updateData,
            { 
                new: true, 
                upsert: true
            }
        );
        
        res.json({
            success: true,
            message: 'Evolution-Daten gespeichert',
            currentLevel: game.currentLevel,
            totalPoints: game.remainingPoints
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
        const { sessionId } = req.params; // ← ERST sessionId definieren
        console.log('🔍 DEBUG - Load Request für:', sessionId);
        
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
            },
            // NEU: Level-Info hinzufügen
            levelInfo: {
                current: game.currentLevel || 1,
                completed: game.completedLevels || 0,
                totalEarned: game.totalEarnedPoints || 0
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

// Level-Abschluss verarbeiten (ERSETZT die defekte Funktion)
router.post('/complete-level', async (req, res) => {
    try {
        const { sessionId, completedLevel, earnedPoints, victory } = req.body;
        
        const game = await Game.findOne({ sessionId });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session nicht gefunden' 
            });
        }
        
        if (victory) {
            const updateData = {
                currentLevel: (completedLevel || 1) + 1,
                remainingPoints: (game.remainingPoints || 0) + (earnedPoints || 0),
                totalEarnedPoints: (game.totalEarnedPoints || 0) + (earnedPoints || 0),
                completedLevels: (game.completedLevels || 0) + 1,
                updatedAt: Date.now()
            };
            
            // Level-Geschichte erweitern
            const levelHistory = game.levelHistory || [];
            levelHistory.push({
                level: completedLevel,
                completedAt: new Date().toISOString(),
                earnedPoints: earnedPoints,
                victory: true
            });
            updateData.levelHistory = levelHistory;
            
            await Game.findOneAndUpdate({ sessionId }, updateData);
            
            console.log(`🏆 Level ${completedLevel} abgeschlossen für Session ${sessionId.substring(0, 8)}`);
            console.log(`📈 Neues Level: ${updateData.currentLevel}, Punkte: ${updateData.remainingPoints}`);
            
            res.json({ 
                success: true, 
                newLevel: updateData.currentLevel,
                totalPoints: updateData.remainingPoints
            });
        } else {
            console.log(`💀 Level ${completedLevel} fehlgeschlagen für Session ${sessionId.substring(0, 8)}`);
            
            res.json({ 
                success: true, 
                newLevel: game.currentLevel,
                totalPoints: game.remainingPoints,
                defeat: true
            });
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Level-Abschluss:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server-Fehler beim Level-Abschluss',
            details: error.message 
        });
    }
});

router.get('/level-stats/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const game = await Game.findOne({ sessionId });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session nicht gefunden' 
            });
        }
        
        const stats = {
            currentLevel: game.currentLevel || 1,
            completedLevels: game.completedLevels || 0,
            totalEarnedPoints: game.totalEarnedPoints || 0,
            remainingPoints: game.remainingPoints || 0,
            levelHistory: game.levelHistory || [],
            playTime: calculatePlayTime(game.createdAt),
            averagePointsPerLevel: game.completedLevels > 0 ? 
                Math.round(game.totalEarnedPoints / game.completedLevels) : 0
        };
        
        res.json({ success: true, stats: stats });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Level-Statistiken:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Level-Statistiken konnten nicht geladen werden',
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

function calculatePlayTime(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
    } else {
        return `${diffMinutes}m`;
    }
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