
// ===================================
// GLOBALE VARIABLEN
// ===================================

let canvas, ctx;
let sessionId = null;
let levelData = null;
let gameObjects = [];
let gameSpeed = 1;
let isPaused = false;
let animationTime = 0;
let selectedDino = null;
let isLoading = true;
let saveInProgress = false;
let debugMode = false;

let levelTimer = 480; // 3 Minuten in Sekunden
let levelStartTime = null;
let levelEndTime = null;
let gameEnded = false;

let currentLevel = 1;

// API Base URL
const API_BASE = 'http://localhost:3001/api/game';

// Kachel-System Variablen - ERWEITERT FÜR SCROLLING
let tileMap = [];
let tileSize = 32;
let baseTileSize = 32;

let baseMapWidth = 60;        // Basis-Breite
let baseMapHeight = 40;       // Höhe bleibt konstant
let mapWidth = 60;           // Wird dynamisch gesetzt
let mapHeight = 40;          // Bleibt konstant

// 1. NEUE VARIABLEN für Ressourcen-Variation (nach mapWidth/mapHeight Deklarationen hinzufügen)
let levelBiome = {
    type: 'balanced',           // 'desert', 'oasis', 'swamp', 'prairie', 'balanced'
    waterAbundance: 1.0,        // 0.3 bis 2.5 (30% bis 250%)
    plantAbundance: 1.0,        // 0.2 bis 3.0 (20% bis 300%)
    rodentAbundance: 1.0,       // 0.1 bis 2.0 (10% bis 200%)
    description: 'Ausgewogenes Gebiet'
};

// 2. BIOM-TYPEN DEFINIEREN
const BIOME_TYPES = {
    desert: {
        name: 'Wüste',
        description: 'Karges, trockenes Gebiet',
        waterRange: [0.3, 0.7],      // 30-70% Wasser
        plantRange: [0.2, 0.6],      // 20-60% Pflanzen  
        rodentRange: [0.4, 0.8],     // 40-80% Nagetiere (überleben in Wüste)
        probability: 0.15
    },
    oasis: {
        name: 'Oase',
        description: 'Üppiges, wasserreiches Paradies',
        waterRange: [1.5, 2.5],      // 150-250% Wasser
        plantRange: [2.0, 3.0],      // 200-300% Pflanzen
        rodentRange: [1.2, 2.0],     // 120-200% Nagetiere
        probability: 0.12
    },
    swamp: {
        name: 'Sumpf',
        description: 'Wasserreiches, düsteres Sumpfland',
        waterRange: [2.0, 3.0],      // 200-300% Wasser
        plantRange: [0.8, 1.5],      // 80-150% Pflanzen
        rodentRange: [0.3, 0.7],     // 30-70% Nagetiere (ertrinken)
        probability: 0.15
    },
    prairie: {
        name: 'Prärie',
        description: 'Weite Graslandschaft',
        waterRange: [0.4, 0.8],      // 40-80% Wasser
        plantRange: [1.8, 2.8],      // 180-280% Pflanzen
        rodentRange: [1.5, 2.2],     // 150-220% Nagetiere
        probability: 0.18
    },
    rocky: {
        name: 'Steiniges Hochland',
        description: 'Felsige, karge Landschaft',
        waterRange: [0.5, 1.0],      // 50-100% Wasser
        plantRange: [0.3, 0.8],      // 30-80% Pflanzen
        rodentRange: [0.2, 0.6],     // 20-60% Nagetiere
        probability: 0.15
    },
    balanced: {
        name: 'Ausgewogenes Gebiet',
        description: 'Gemischte Landschaft',
        waterRange: [0.8, 1.4],      // 80-140% Wasser
        plantRange: [0.7, 1.6],      // 70-160% Pflanzen
        rodentRange: [0.6, 1.5],     // 60-150% Nagetiere
        probability: 0.25
    }
};

// NEU: Scrolling-Variablen
let scrollX = 0;
let scrollY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// NEU: Zoom-System
let baseZoomLevel = 1;
let currentZoom = 1;
let minTileSize = 8;   // Minimum für Performance
let maxTileSize = 128; // Maximum für Details

// GEÄNDERT: Terrain-Offsets für Scrolling
let terrainOffsetX = 0;
let terrainOffsetY = 0;

// Kampf Variablen
let combats = []; // Aktive Kämpfe
let bloodParticles = []; // Bluteffekte
let attackIcons = []; // Angriffs-Icons
let corpses = []; // Leichen
let leafParticles = []; 

let teamFood = {
    plants: 0,
    meat: 0
};

let foodIcons = []; // Aufsteigende Food-Icons
let consumedFoodSources = new Set(); // Verbrauchte Nahrungsquellen (für Regeneration)
let occupiedFoodSources = new Map();

// ===================================
// 2. NEUE KONSTANTEN (nach bestehenden COMBAT_CONFIG einfügen)
// ===================================

const FOOD_CONSUMPTION_DISTANCES = {
    'tree': 1.2,     // Bäume: Etwas weiter weg (große Objekte)
    'rodent': 0.6,   // Nagetiere: Sehr nah (kleine Objekte)
    'corpse': 0.8    // Leichen: Mittel nah
};

const FOOD_CONFIG = {
    // Nahrungswerte
    FOOD_VALUES: {
        LARGE_TREE: 7,    // baseSize >= 25
        SMALL_TREE: 5,    // baseSize < 25
        RODENT: 5,
        ENEMY_CORPSE: 4,
        OWN_CORPSE: 4     // nur bei Aas >= 70
    },
    
    // Mindestvoraussetzungen
    MIN_REQUIREMENTS: {
        PLANTS: 20,
        MEAT: 20,
        CARRION: 70
    },
    
    // Zeiten
    CONSUMPTION_TIME: 5.0,      // 3 Sekunden Nahrungsaufnahme
    POST_COMBAT_COOLDOWN: 7.0,  // 7 Sekunden nach Kampf
    POST_FOOD_COOLDOWN: 5.0,    // 5 Sekunden nach Nahrungsaufnahme
    TREE_REGENERATION: 60.0,    // 30 Sekunden Baum-Regeneration
    
    // Icons für Nahrungstypen
    FOOD_ICONS: {
        'plants': '🌿',
        'meat': '🥩'
    }
};



// Kachel-Typen und Farben
const TILE_TYPES = {
    GRASS: 0,
    DIRT: 1,
    WATER: 2
};

const TILE_COLORS = {
    [TILE_TYPES.GRASS]: {
        base: '#228B22',
        highlight: '#32CD32',
        shadow: '#006400'
    },
    [TILE_TYPES.DIRT]: {
        base: '#8B7355',
        highlight: '#A0957A',
        shadow: '#5D4E37'
    },
    [TILE_TYPES.WATER]: {
        base: '#4682B4',
        highlight: '#87CEEB',
        shadow: '#2F4F4F'
    }
};

// ===================================
// API-FUNKTIONEN
// ===================================

async function loadLevelData() {
    try {
        setLoadingText('Verbinde mit Server...');
        
        // Session-ID aus URL-Parameter laden
        const urlParams = new URLSearchParams(window.location.search);
        sessionId = urlParams.get('session');
        
        if (!sessionId) {
            throw new Error('Keine Session-ID gefunden. Bitte starten Sie vom Generator.');
        }
        
        updateSessionInfo();
        setLoadingText('Lade Level-Daten...');
        
        // console.log(`🎮 Lade Level für Session: ${sessionId}`);
        
        const response = await fetch(`${API_BASE}/load-level/${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.levelData) {
            levelData = data.levelData;
            
            // WICHTIG: currentLevel aus levelData extrahieren
            if (levelData.currentLevel) {
                currentLevel = levelData.currentLevel;
                // console.log('📊 Level aus levelData geladen:', currentLevel);
            } else if (levelData.level) {
                currentLevel = levelData.level;
                // console.log('📊 Level aus levelData.level geladen:', currentLevel);
            }
            // Validierung
            if (!levelData.populationData || levelData.populationData.length === 0) {
                throw new Error('Keine Dinosaurier-Population gefunden. Bitte starten Sie erneut.');
            }
            
            return true;
        } else {
            throw new Error(data.error || 'Keine Level-Daten verfügbar');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Level-Daten:', error);
        showError(error.message);
        return false;
    }
}

// ===================================
// INITIALISIERUNG
// ===================================

async function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Canvas nimmt immer volle Fenstergröße ein
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Basis-Zoom setzen
    const canvasTileSizeByWidth = canvas.width / mapWidth;
    const canvasTileSizeByHeight = canvas.height / mapHeight;
    baseZoomLevel = Math.min(canvasTileSizeByWidth, canvasTileSizeByHeight) / 32; // 32 = gewünschte Standard-Kachelgröße
    currentZoom = baseZoomLevel;
    
    calculateTerrainOffsets();
    
    window.addEventListener('resize', resizeCanvas);

    initScrollingAndZoom();
    
    const loadSuccess = await loadLevelData();
    
    if (loadSuccess) {
        setLoadingText('Generiere Level...');
        
        setTimeout(() => {
            generateLevel();
            initializeCombatForAllDinos()
            hideLoadingShowGame();
            startGameLoop();
        }, 1000);
    }
}


async function proceedToNextLevel(earnedPoints) {
  
    if (!sessionId || sessionId.startsWith('offline')) {
        // Offline-Modus
        const nextLevel = (levelData.currentLevel || 1) + 1;
        const urlParams = new URLSearchParams();
        urlParams.set('level', nextLevel);
        urlParams.set('earnedPoints', earnedPoints);
        window.location.href = `index.html?${urlParams.toString()}`;
        return;
    }
    
    try {
        // Server-Request
        const response = await fetch(`${API_BASE}/complete-level`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                completedLevel: currentLevel || levelData.currentLevel || 1,
                earnedPoints: earnedPoints,
                victory: true
            })
        });
        
        const data = await response.json();
        // console.log('📥 DEBUG: Server Response:', data);
        
        if (data.success) {
            // KRITISCH: Session-ID UND neues Level in URL
            const urlParams = new URLSearchParams();
            urlParams.set('session', sessionId);           // Session beibehalten!
            urlParams.set('earnedPoints', earnedPoints);
            urlParams.set('level', data.newLevel);         // Neues Level explizit
            
            const targetUrl = `index.html?${urlParams.toString()}`;
           
            window.location.href = targetUrl;
        } else {
            throw new Error(data.error || 'Level-Abschluss fehlgeschlagen');
        }
        
    } catch (error) {
        console.error('❌ DEBUG: Fehler beim Level-Abschluss:', error);
        
        // Fallback mit Session-Erhaltung
        const nextLevel = (currentLevel || levelData.currentLevel || 1) + 1;
        const urlParams = new URLSearchParams();
        urlParams.set('session', sessionId);  // WICHTIG: Session beibehalten
        urlParams.set('level', nextLevel);
        urlParams.set('earnedPoints', earnedPoints);
        window.location.href = `index.html?${urlParams.toString()}`;
    }
}


function addCombatPropertiesToDino(dino) {
    if (!window.DinoAbilities || !window.DinoAbilities.calculateDinoAbilities) {
        console.error('❌ DinoAbilities nicht verfügbar! Script nicht geladen?');
        return;
    }
    
    // Fähigkeiten berechnen
    dino.abilities = window.DinoAbilities.calculateDinoAbilities(dino.species.properties);
    dino.baseSpeed = 0.00 + dino.abilities['Geschwindigkeit'] / 2000;

    // Kampfwerte
    dino.maxHP = dino.abilities['Lebenspunkte'];
    dino.currentHP = dino.maxHP;
    dino.maxStamina = dino.abilities['Kondition'];
    dino.currentStamina = dino.maxStamina;
    
    // Kampfzustand
    dino.overallState = 'neutral';
    dino.combatTarget = null;
    dino.lastAttackTime = 0; // NEU: Cooldown-Timer
    dino.combatTurn = false;
    dino.isAttacking = false;
    dino.attackAnimationStart = 0;
    dino.wasMovingLastFrame = false;

    dino.killCount = 0;
    dino.hasMuscleBoost = false;
    dino.hasMuscleBoostMax = false; // Stufe 2

    dino.totalFoodConsumed = 0;
    dino.hasSatiatedBoost = false;
    dino.hasSatiatedBoostMax = false;
                
    // Erkennungsradius berechnen
    dino.detectionRadius = window.DinoAbilities.COMBAT_CONFIG.DETECTION_BASE + (dino.abilities['Feinderkennung'] / 100) * 5;
    
    // Verfügbare Angriffe ermitteln
    dino.availableAttacks = getAvailableAttacks(dino);
}

function calculateRandomMapWidth() {
    // Basis: 60 Kacheln
    // Variation: 0% bis +70% = 60 bis 102 Kacheln
    const variationFactor = Math.random() * 0.7; // 0.0 bis 0.7 (0% bis 70%)
    const additionalWidth = Math.round(baseMapWidth * variationFactor);
    
    mapWidth = baseMapWidth + additionalWidth;
    
    // Debug-Info
    const percentage = Math.round(variationFactor * 100);
    console.log(`🗺️ Karten-Breite berechnet: ${mapWidth} Kacheln (Basis: ${baseMapWidth}, +${percentage}%)`);
    
    return mapWidth;
}

function calculateRandomLevelResources() {
    // Biom-Typ auswählen
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedBiome = 'balanced';
    
    for (const [biomeKey, biomeData] of Object.entries(BIOME_TYPES)) {
        cumulativeProbability += biomeData.probability;
        if (random <= cumulativeProbability) {
            selectedBiome = biomeKey;
            break;
        }
    }
    
    const biomeData = BIOME_TYPES[selectedBiome];
    
    // Zufällige Werte innerhalb der Biom-Bereiche
    levelBiome = {
        type: selectedBiome,
        waterAbundance: biomeData.waterRange[0] + Math.random() * (biomeData.waterRange[1] - biomeData.waterRange[0]),
        plantAbundance: biomeData.plantRange[0] + Math.random() * (biomeData.plantRange[1] - biomeData.plantRange[0]),
        rodentAbundance: biomeData.rodentRange[0] + Math.random() * (biomeData.rodentRange[1] - biomeData.rodentRange[0]),
        description: biomeData.description
    };
    return levelBiome;
}


function startLevelTimer() {
    levelStartTime = Date.now();
    // console.log('⏰ Level-Timer gestartet: 3 Minuten');
}

function updateTimer() {
    if (isPaused || isLoading || gameEnded || !levelStartTime) return;
    
    // NEU: Speed-berücksichtigte Zeit-Berechnung
    const realElapsed = (Date.now() - levelStartTime) / 1000;
    const gameElapsed = realElapsed * gameSpeed; // Multipliziert mit Spiel-Geschwindigkeit
    const remaining = Math.max(0, levelTimer - gameElapsed);
    
    updateTimerDisplay(remaining);
    
    if (remaining <= 0) {
        endLevelByTime();
    }
}


function updateTimerDisplay(remaining) {
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('levelTimer');
    if (timerElement) {
        // NEU: Speed-Indikator hinzufügen
        const speedIndicator = gameSpeed > 1 ? ` (${gameSpeed}x)` : '';
        timerElement.textContent = timeString + speedIndicator;
        
        if (remaining <= 30) {
            timerElement.style.color = '#ff4444';
            timerElement.style.animation = 'pulse 1s infinite';
        } else if (remaining <= 60) {
            timerElement.style.color = '#ffa500';
        } else {
            // NEU: Verschiedene Farben für verschiedene Speeds
            if (gameSpeed === 4) {
                timerElement.style.color = '#ff6b35'; // Orange für 4x
            } else if (gameSpeed === 2) {
                timerElement.style.color = '#ffd700'; // Gold für 2x
            } else {
                timerElement.style.color = '#32cd32'; // Grün für 1x
            }
        }
    }
}


function checkVictoryConditions() {
    if (gameEnded || isLoading) return;
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.overallState !== 'dead');
    const enemyDinos = gameObjects.filter(obj => obj instanceof Dino && obj.isEnemy && obj.overallState !== 'dead');
    
    if (ownDinos.length === 0) {
        endLevelByDefeat();
        return;
    }
    
    if (enemyDinos.length === 0) {
        endLevelByEnemiesEliminated();
        return;
    }
}

function endLevelByTime() {
    if (gameEnded) return;
    gameEnded = true;
    levelEndTime = Date.now();
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.overallState !== 'dead');
    const enemyDinos = gameObjects.filter(obj => obj instanceof Dino && obj.isEnemy && obj.overallState !== 'dead');
    
    const ownWeight = calculateTotalWeight(ownDinos);
    const enemyWeight = calculateTotalWeight(enemyDinos);
    
    const victory = ownWeight > enemyWeight;
    
    showLevelEndScreen({
        victory: victory,
        reason: 'Zeit abgelaufen',
        ownWeight: ownWeight,
        enemyWeight: enemyWeight,
        ownDinos: ownDinos.length,
        enemyDinos: enemyDinos.length
    });
}

function endLevelByEnemiesEliminated() {
    if (gameEnded) return;
    gameEnded = true;
    levelEndTime = Date.now();
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.overallState !== 'dead');
    
    showLevelEndScreen({
        victory: true,
        reason: 'Alle Gegner eliminiert',
        ownDinos: ownDinos.length,
        enemyDinos: 0,
        perfectVictory: true
    });
}

function endLevelByDefeat() {
    if (gameEnded) return;
    gameEnded = true;
    levelEndTime = Date.now();
    
    showLevelEndScreen({
        victory: false,
        reason: 'Alle eigenen Dinosaurier eliminiert',
        ownDinos: 0,
        defeat: true
    });
}

function calculateTotalWeight(dinos) {
    return dinos.reduce((total, dino) => {
        let weight = dino.abilities['Gewicht'] || 50;
        
        if (!dino.isAdult) {
            weight *= 0.7;
        }
        
        return total + weight;
    }, 0);
}

// ===================================
// LEVEL-ENDE UI
// ===================================

function showLevelEndScreen(result) {
    isPaused = true;
    
    const meatPoints = teamFood.meat;
    const plantPoints = Math.floor(teamFood.plants * 0.5);
    const totalEvoPoints = meatPoints + plantPoints;
    
    // Biom-Info
    const biomeInfo = BIOME_TYPES[levelBiome.type];
    const biomeText = `${biomeInfo.name}: ${biomeInfo.description}`;
    
    const modal = document.createElement('div');
    modal.className = 'level-end-modal';
    modal.innerHTML = `
        <div class="level-end-content">
            <div class="level-end-header">
                <h2>${result.victory ? '🏆 SIEG!' : '💀 NIEDERLAGE'}</h2>
                <p class="end-reason">${result.reason}</p>
                <p style="color: #cd853f; font-size: 0.9em; margin-top: 5px;">
                    🌍 ${biomeText}
                </p>
            </div>
            
            ${result.victory ? `
                <div class="victory-stats">
                    ${result.perfectVictory ? '<p class="perfect-victory">🌟 PERFEKTER SIEG! 🌟</p>' : ''}
                    ${result.ownWeight ? `
                        <div class="weight-comparison">
                            <h4>Gewichts-Vergleich:</h4>
                            <p>🦕 Eigene Dinos: <span class="own-weight">${Math.round(result.ownWeight)}</span></p>
                            <p>⚔️ Gegner: <span class="enemy-weight">${Math.round(result.enemyWeight)}</span></p>
                        </div>
                    ` : ''}
                    <div class="survivor-count">
                        <p>Überlebende: ${result.ownDinos} eigene Dinos</p>
                    </div>
                </div>
                
                <div class="food-conversion">
                    <h3>🍽️ Nahrung → Evolutionspunkte</h3>
                    <div class="conversion-details">
                        <p>🥩 Fleisch: ${teamFood.meat} × 1 = <span class="meat-points">${meatPoints}</span> EP</p>
                        <p>🌿 Pflanzen: ${teamFood.plants} × 0.5 = <span class="plant-points">${plantPoints}</span> EP</p>
                        <div class="conversion-total">
                            <strong>Gesamt: <span class="total-points">${totalEvoPoints}</span> EP</strong>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="defeat-stats">
                    <p>💀 Alle Dinosaurier wurden eliminiert</p>
                </div>
            `}
            
            <div class="level-end-actions">
                ${result.victory ? `
                    <button class="continue-btn" onclick="proceedToNextLevel(${totalEvoPoints})">
                        🚀 Weiter zu Level ${(currentLevel || levelData.currentLevel || 1) + 1}
                    </button>
                ` : `
                    <button class="retry-btn" onclick="retryLevel()">
                        🔄 Level wiederholen
                    </button>
                `}
                <button class="menu-btn" onclick="returnToMenu()">
                    🏠 Zurück zum Menü
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        if (result.victory) {
            animatePointsConversion();
        }
    }, 1000);
}

function animatePointsConversion() {
    const meatElement = document.querySelector('.meat-points');
    const plantElement = document.querySelector('.plant-points');
    const totalElement = document.querySelector('.total-points');
    
    animateCounter(meatElement, 0, teamFood.meat, 1000);
    animateCounter(plantElement, 0, Math.floor(teamFood.plants * 0.5), 1200);
    
    setTimeout(() => {
        const total = teamFood.meat + Math.floor(teamFood.plants * 0.5);
        animateCounter(totalElement, 0, total, 1500);
    }, 1500);
}

function animateCounter(element, start, end, duration) {
    if (!element) return;
    
    const startTime = Date.now();
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    update();
}

// ===================================
// NAVIGATION
// ===================================

function retryLevel() {
    const urlParams = new URLSearchParams();
    urlParams.set('session', sessionId);
    window.location.href = `level.html?${urlParams.toString()}`;
}

function returnToMenu() {
    if (sessionId) {
        window.location.href = `index.html?session=${sessionId}`;
    } else {
        window.location.href = 'index.html';
    }
}


// ===================================
// UI FUNKTIONEN
// ===================================

function setLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

function showError(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    const errorScreen = document.getElementById('errorScreen');
    const errorText = document.getElementById('errorText');
    
    loadingScreen.style.display = 'none';
    errorText.textContent = message;
    errorScreen.style.display = 'block';
    
    isLoading = false;
}

function hideLoadingShowGame() {
    const loadingScreen = document.getElementById('loadingScreen');
    const errorScreen = document.getElementById('errorScreen');
    const gameHud = document.getElementById('gameHud');
    const infoPanel = document.getElementById('infoPanel');
    const gameControls = document.getElementById('gameControls');
    const sessionInfo = document.getElementById('sessionInfo');
    
    loadingScreen.style.display = 'none';
    errorScreen.style.display = 'none';
    gameHud.style.display = 'block';
    infoPanel.style.display = 'block';
    gameControls.style.display = 'flex';
    sessionInfo.style.display = 'block';
    
    const levelTitle = document.getElementById('levelTitle');
    const currentLevel = levelData.currentLevel || levelData.level || 1;
    const displayLevel = currentLevel || levelData.currentLevel || levelData.level || 1;
    levelTitle.textContent = `🎮 Level ${displayLevel} - Überleben`;

    startLevelTimer();
    
    isLoading = false;
}

function updateSessionInfo() {
    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionId && sessionInfo) {
        if (sessionId.startsWith('offline')) {
            sessionInfo.textContent = '🔒 Offline-Modus';
        } else {
            sessionInfo.textContent = `🔗 Session: ${sessionId.substring(0, 8)}...`;
        }
    }
}

function retryLoad() {
    window.location.reload();
}

function goBackToGenerator() {
    if (sessionId) {
        window.location.href = `index.html?session=${sessionId}`;
    } else {
        window.location.href = 'index.html';
    }
}

// ===================================
// SCROLLING & ZOOM EVENTS
// ===================================

function initScrollingAndZoom() {
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleWheel(event) {
    event.preventDefault();
    
    const zoomFactor = 1.1;
    const oldZoom = currentZoom;
    
    if (event.deltaY < 0) {
        currentZoom *= zoomFactor;
    } else {
        currentZoom /= zoomFactor;
    }
    
    const maxZoom = maxTileSize / (Math.min(canvas.width, canvas.height) / Math.max(mapWidth, mapHeight));
    const minZoom = minTileSize / (Math.min(canvas.width, canvas.height) / Math.max(mapWidth, mapHeight));
    
    currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));
    
    if (currentZoom !== oldZoom) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const zoomRatio = currentZoom / oldZoom;
        
        scrollX = (scrollX + mouseX) * zoomRatio - mouseX;
        scrollY = (scrollY + mouseY) * zoomRatio - mouseY;
        
        resizeCanvas();
    }
}

function handleMouseDown(event) {
    const clickHandled = handleClick(event, true);
    
    if (!clickHandled) {
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        scrollX -= deltaX;
        scrollY -= deltaY;
        
        limitScroll();
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        calculateTerrainOffsets();
    }
}

function handleMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    } else {
        handleClick(event, false);
    }
}

function limitScroll() {
    const terrainWidth = mapWidth * tileSize;
    const terrainHeight = mapHeight * tileSize;
    
    const margin = 100;
    
    scrollX = Math.max(-(terrainWidth - margin), Math.min(canvas.width - margin, scrollX));
    scrollY = Math.max(-(terrainHeight - margin), Math.min(canvas.height - margin, scrollY));
}

function handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        isDragging = true;
        lastMouseX = event.touches[0].clientX;
        lastMouseY = event.touches[0].clientY;
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    if (isDragging && event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - lastMouseX;
        const deltaY = event.touches[0].clientY - lastMouseY;
        
        scrollX -= deltaX;
        scrollY -= deltaY;
        
        limitScroll();
        
        lastMouseX = event.touches[0].clientX;
        lastMouseY = event.touches[0].clientY;
        
        calculateTerrainOffsets();
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    isDragging = false;
}

// ===================================
// BEWGUNGs-FUNKTIONEN
// ===================================

function isPositionValidForMovement(checkDino, newTileX, newTileY) {

    if (checkDino.canSwim()) {
        return true;
    }
    newTileX = newTileX + 0.5;
    newTileY = newTileY+ 0.5;  

    const boxWidth = (checkDino.species.properties.körper_länge || 50) * checkDino.scale * 0.8;
    const boxHeight = (checkDino.species.properties.körper_höhe || 50) * checkDino.scale * 0.6;
    const verticalOffset = boxHeight * 0.5 / tileSize;
    
    const testBox = {
        left: newTileX - boxWidth / (2 * tileSize),
        right: newTileX + boxWidth / (2 * tileSize),
        top: newTileY - boxHeight / (2 * tileSize) + verticalOffset,
        bottom: newTileY + boxHeight / (2 * tileSize) + verticalOffset
    };
    
    const checkPoints = [
        { x: testBox.left, y: testBox.top },      // Oben links
        { x: testBox.right, y: testBox.top },     // Oben rechts
        { x: testBox.left, y: testBox.bottom },   // Unten links
        { x: testBox.right, y: testBox.bottom },  // Unten rechts
        { x: newTileX, y: newTileY + verticalOffset }  // Mitte (auch mit Offset)
    ];

    for (const point of checkPoints) {
        const tileType = getTileTypeAtPosition(Math.floor(point.x), Math.floor(point.y));
        if (tileType === TILE_TYPES.WATER) {
            return false;
        }
    }
    
    return true;
}

// ===================================
// CALCULATIONS UND HELPER-FUNKTIONEN
// ===================================

function tileToPixel(tileX, tileY) {
    return {
        x: tileX * tileSize + tileSize / 2 + terrainOffsetX,
        y: tileY * tileSize + tileSize / 2 + terrainOffsetY
    };
}

function pixelToTile(pixelX, pixelY) {
    return {
        tileX: (pixelX - terrainOffsetX) / tileSize,
        tileY: (pixelY - terrainOffsetY) / tileSize
    };
}



// ===================================
// RESIZE & SKALIERUNG (ÜBERARBEITET)
// ===================================

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (levelData) {
        // Neue Kachelgröße basierend auf Zoom berechnen
        const canvasTileSizeByWidth = canvas.width / mapWidth;
        const canvasTileSizeByHeight = canvas.height / mapHeight;
        const canvasTileSize = Math.min(canvasTileSizeByWidth, canvasTileSizeByHeight);
        
        const oldTileSize = tileSize;
        tileSize = Math.max(minTileSize, Math.min(maxTileSize, canvasTileSize * currentZoom));
 
        calculateTerrainOffsets();
        
        if (gameObjects && gameObjects.length > 0) {
            updateAllObjectScales();
        }
    }
}

function updateAllObjectScales() {
    gameObjects.forEach(obj => {
        if (obj.updateScale) {
            obj.updateScale();
        }
    });
}

// ===================================
// GAME LOOP & RENDERING (unverändert)
// ===================================

function startGameLoop() {
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}

function update() {
    if (!isPaused && !isLoading) {
        animationTime += 0.016 * gameSpeed;
        
        gameObjects.forEach(obj => {
            if (obj.update) obj.update();
        });
    }
    updateCombatSystem();
    updateTimer();
    checkVictoryConditions();
}

function render() {
    if (isLoading) return;
    
    renderTerrain();

    gameObjects.sort((a, b) => {
        const aY = a.tileY || a.y;
        const bY = b.tileY || b.y;
        return aY - bY;
    });
    
    gameObjects.forEach(obj => obj.render());

    renderCombatEffects();
}

function updateHUD() {
    if (!levelData) return;
    
    const statusContainer = document.getElementById('speciesStatus');
    let html = '';
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy);
    const enemyDinos = gameObjects.filter(obj => obj instanceof Dino && obj.isEnemy);
    
    levelData.populationData.forEach(species => {
        const ownCount = ownDinos.filter(d => d.species.name === species.name).length;
        const enemyCount = enemyDinos.filter(d => d.species && d.species.name === species.name).length || 0;
        
        html += `
            <div class="species-status">
                <span class="species-name">${species.name}:</span>
                <span class="population-count">Eigene: ${ownCount}</span> | 
                <span style="color: #ff6b35;">Feinde: ${enemyCount}</span>
            </div>
        `;
    });
    html += `
        <div class="species-status" style="border-top: 1px solid #8b4513; margin-top: 10px; padding-top: 10px;">
            <span style="color: #32cd32; font-weight: bold;">
                🌿 Pflanzen: ${teamFood.plants} | 🥩 Fleisch: ${teamFood.meat}
            </span>
        </div>
    `;
    statusContainer.innerHTML = html;
}

// ===================================
// CLICK-BEHANDLUNG (ÜBERARBEITET)
// ===================================

function handleClick(event, checkOnly = false) {
    if (isLoading) return false;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Prüfe Klick auf Dinos
    const dinos = gameObjects.filter(obj => obj instanceof Dino);// && !obj.isEnemy);
    for (let dino of dinos) {
        if (dino.isClickedBy(mouseX, mouseY)) {
            if (!checkOnly) {
                if (selectedDino) selectedDino.selected = false;
                selectedDino = dino;
                dino.selected = true;
            }
            return true;
        }
    }
    
    if (!checkOnly) {
        // Kein Dino geklickt - deselektiere alle
        if (selectedDino) selectedDino.selected = false;
        selectedDino = null;
    }
    
    return false; // Kein Dino geklickt
}

// ===================================
// STEUERUNG (unverändert)
// ===================================

function pauseGame() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '▶️ Weiter' : '⏸️ Pause';
    
    if (isPaused && levelStartTime) {
        const realElapsed = (Date.now() - levelStartTime) / 1000;
        const gameElapsed = realElapsed * gameSpeed;
        levelTimer = Math.max(0, levelTimer - gameElapsed);
        levelStartTime = null;      
     } else if (!isPaused && !levelStartTime && !gameEnded) {
        levelStartTime = Date.now();
    }
}

function speedUp() {
    let wasRunning = false;
    if (levelStartTime && !isPaused && !gameEnded) {
        wasRunning = true;
        
        const realElapsed = (Date.now() - levelStartTime) / 1000;
        const gameElapsed = realElapsed * gameSpeed;
        levelTimer = Math.max(0, levelTimer - gameElapsed);
    }
    
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 4 : 1;
    const speedBtn = document.getElementById('speedBtn');
    speedBtn.textContent = 
        gameSpeed === 1 ? '⏩ Schneller' : 
        gameSpeed === 2 ? '⏩⏩ Sehr schnell' : '⏩ Normal';

    if (wasRunning) {
        levelStartTime = Date.now();
    }
}


function trackKill(killer, victim) {
    killer.killCount++;
   
    if (killer.killCount >= 2 && !killer.hasMuscleBoost) {
        killer.hasMuscleBoost = true;
    }else if (killer.killCount >= 4 && !killer.hasMuscleBoostMax) {
        killer.hasMuscleBoostMax = true;
        console.log(`⚡ ${killer.species.name} erreicht MAXIMUM Muskel-Boost! (+30% Angriffskraft)`);
    }
}

// Verfügbare Angriffe basierend auf Fähigkeiten
function getAvailableAttacks(dino) {
    const attacks = [];
    const abilities = dino.abilities;
    
    // Basis-Angriffe (immer verfügbar)
    attacks.push({
        type: 'Sprung',
        damage: Math.round((dino.species.properties.hinterbeine_stärke + dino.species.properties.hinterbeine_länge) / 4),
        probability: abilities['Sprung']
    });
    
    attacks.push({
        type: 'Biss', 
        damage: Math.round((dino.species.properties.kopf_beisskraft + dino.species.properties.maul_zahntyp) / 3),
        probability: abilities['Biss']
    });
    
    attacks.push({
        type: 'Kopfstoß',
        damage: Math.round((dino.species.properties.kopf_größe + dino.species.properties.kopf_hörner_größe * 2 + dino.species.properties.kopf_hörner_anzahl * 10) / 4),
        probability: abilities['Kopfstoß']
    });
    
    // Spezial-Angriffe (nur wenn Schwellwerte erreicht)
    if (abilities['Tödlicher Biss']) {
        attacks.push({
            type: 'Tödlicher Biss',
            damage: Math.round((dino.species.properties.kopf_beisskraft + dino.species.properties.maul_zahntyp) / 2),
            probability: abilities['Tödlicher Biss']
        });
    }
    
    if (abilities['Gift Speien']) {
        attacks.push({
            type: 'Gift Speien',
            damage: Math.round((dino.species.properties.maul_zahntyp + dino.species.properties.farbig) / 3),
            probability: abilities['Gift Speien'],
            range: Math.floor(abilities['Gift Speien'] / 20) || 1
        });
    }
    
    if (abilities['Schwanzschlag']) {
        attacks.push({
            type: 'Schwanzschlag',
            damage: Math.round((dino.species.properties.schwanz_länge + dino.species.properties.schwanz_breite + 
                            dino.species.properties.schwanz_keule + dino.species.properties.schwanz_stacheln) / 3),
            probability: abilities['Schwanzschlag']
        });
    }
    
    // Nach Wahrscheinlichkeit sortieren (höchste zuerst)
    return attacks.sort((a, b) => b.probability - a.probability);
}

// ===================================
// KAMPFLOGIK
// ===================================

function findEnemiesInRange(dino) {
    if (dino.overallState === 'dead') return [];
    
    const enemies = gameObjects.filter(obj => 
        obj instanceof Dino && 
        obj.overallState !== 'dead' &&
        obj.isEnemy !== dino.isEnemy && // Unterschiedliche Fraktionen
        calculateDistance(dino, obj) <= dino.detectionRadius
    );
    
    return enemies;
}

// Entfernung zwischen zwei Dinos berechnen
function calculateDistance(dino1, dino2) {
    const dx = dino1.tileX - dino2.tileX;
    const dy = dino1.tileY - dino2.tileY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Kampf-Update für jeden Dino
function updateCombat(dino) {
    if (dino.overallState === 'dead') return;
    
    if (dino.overallState === 'fighting' && dino.avoidanceMode.active) {
        dino.exitAvoidanceMode('interrupted by combat');
    }

     dino.currentStamina = Math.min(dino.maxStamina, dino.currentStamina + COMBAT_CONFIG.STAMINA_RECOVERY * gameSpeed / 60);
 
    // Stamina-Verbrauch bei Bewegung (nur wenn NICHT kämpfend)
    if (dino.behaviorState === 'moving' && dino.overallState !== 'fighting') {
        dino.currentStamina = Math.max(0, dino.currentStamina - COMBAT_CONFIG.MOVEMENT_STAMINA_COST * gameSpeed / 60);
        dino.wasMovingLastFrame = true;
    } else {
        dino.wasMovingLastFrame = false;
    }
    
    // Zustandsmaschine
    switch (dino.overallState) {
        case 'neutral':
            updateNeutralState(dino);
            break;
        case 'seeking':
            updateSeekingState(dino);
            break;
        case 'fighting':
            updateFightingState(dino);
            // WICHTIG: Keine weitere Bewegung im fighting-State!
            break;
    }
    
    // Angriffs-Animation
    if (dino.isAttacking) {
        const attackDuration = 0.3;
        if (Date.now() - dino.attackAnimationStart > attackDuration * 1000) {
            dino.isAttacking = false;
        }
    }

    updateFood(dino);
}

function updateNeutralState(dino) {
    const enemies = findEnemiesInRange(dino);
    if (enemies.length > 0) {
        // VERBESSERUNG: Wähle Feind der NICHT bereits kämpft
        const availableEnemies = enemies.filter(enemy => {
            const isAlreadyFighting = combats.some(c => c.participants.includes(enemy));
            return !isAlreadyFighting;
        });
        
        if (availableEnemies.length > 0) {
            // Nächsten verfügbaren Feind als Ziel wählen
            dino.combatTarget = availableEnemies.reduce((nearest, enemy) => 
                calculateDistance(dino, enemy) < calculateDistance(dino, nearest) ? enemy : nearest
            );
            dino.overallState = 'seeking';
        }
    }
}

function updateSeekingState(dino) {
    if (!dino.combatTarget || dino.combatTarget.overallState === 'dead') {
        dino.combatTarget = null;
        dino.overallState = 'neutral';
        return;
    }
    
    // Prüfen ob Ziel bereits von jemand anderem bekämpft wird
    const targetAlreadyFighting = combats.some(c => c.participants.includes(dino.combatTarget));
    if (targetAlreadyFighting) {
        dino.combatTarget = null;
        dino.overallState = 'neutral';
        return;
    }
    
    const distance = calculateDistance(dino, dino.combatTarget);
    
    // Zu weit weg? Aufgeben
    if (distance > dino.detectionRadius * 1.5) {
        dino.combatTarget = null;
        dino.overallState = 'neutral';
        return;
    }   
    // Nah genug für Angriff?
    if (distance <= COMBAT_CONFIG.ATTACK_DISTANCE) {
        startCombat(dino, dino.combatTarget);
        return;
    }    
    // WICHTIG: seekEnemy() nur wenn NICHT bereits im Kampf
    if (dino.overallState !== 'fighting') {
        seekEnemy(dino);
    }
}

function findBestTarget(dino) {
    const enemies = findEnemiesInRange(dino);
    if (enemies.length === 0) return null;
    
    // 1. Priorität: Freie Feinde (kämpfen nicht)
    const freeEnemies = enemies.filter(enemy => {
        return !combats.some(c => c.participants.includes(enemy));
    });
    
    if (freeEnemies.length > 0) {
        // Nächsten freien Feind wählen
        return freeEnemies.reduce((nearest, enemy) => 
            calculateDistance(dino, enemy) < calculateDistance(dino, nearest) ? enemy : nearest
        );
    }
    
    // 2. Priorität: Feinde in Unterzahl (2+ vs 1)
    const outnumberedEnemies = enemies.filter(enemy => {
        const combat = combats.find(c => c.participants.includes(enemy));
        if (!combat) return false;
        
        const ownDinosInCombat = combat.participants.filter(p => !p.isEnemy).length;
        const enemyDinosInCombat = combat.participants.filter(p => p.isEnemy).length;
        
        return enemyDinosInCombat > ownDinosInCombat; // Feind ist in Überzahl
    });
    
    if (outnumberedEnemies.length > 0) {
        return outnumberedEnemies[0]; // Unterstütze Verbündete
    }
    
    return null; // Kein geeignetes Ziel
}

function updateFightingState(dino) {
    if (!dino.combatTarget || dino.combatTarget.overallState === 'dead') {
        dino.overallState = 'neutral';
        dino.combatTarget = null;
        return;
    }   
   
    // Kampf-Turn-System mit Cooldown
    const combat = combats.find(c => c.participants.includes(dino));
    if (combat && combat.currentAttacker === dino && !dino.isAttacking) {
        
        // NEU: Cooldown-Check
        const timeSinceLastAttack = (Date.now() - dino.lastAttackTime) / 1000;
        const canAttack = timeSinceLastAttack >= COMBAT_CONFIG.ATTACK_COOLDOWN;
        
        if (canAttack && dino.currentStamina > 0) {
            performAttack(dino, dino.combatTarget);
        } else {
            combat.currentAttacker = combat.participants.find(p => p !== dino);
        }
    }
}
// Auf Feind zubewegen
function seekEnemy(dino) {
    if (dino.avoidanceMode.active) {
        dino.updateAvoidanceMode();
        return;
    }

    if (!dino.combatTarget) return;
    
    const dx = dino.combatTarget.tileX - dino.tileX;
    const dy = dino.combatTarget.tileY - dino.tileY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0.1) {
        const pathCheck = dino.checkPathBlocked(
            dino,
            dino.tileX,
            dino.tileY,
            dino.combatTarget.tileX,
            dino.combatTarget.tileY
        );
        
        if (pathCheck.blocked) {
            dino.activateAvoidanceMode(
                dino.combatTarget.tileX, 
                dino.combatTarget.tileY, 
                pathCheck.position
            );
            return;
        }

        const moveSpeed = dino.getMovementSpeed();
        const moveTileX = (dx / distance) * moveSpeed;
        const moveTileY = (dy / distance) * moveSpeed;
        
        // Neue Position berechnen
        const newTileX = dino.tileX + moveTileX;
        const newTileY = dino.tileY + moveTileY;
        
        // Wasser-Kollision auch beim Verfolgen prüfen
        if (isPositionValidForMovement(dino, newTileX, newTileY)) {
            
            dino.tileX = newTileX;
            dino.tileY = newTileY;
            
            // Blickrichtung anpassen
            if (dx > 0.01) {
                dino.facingRight = false;
            } else if (dx < -0.01) {
                dino.facingRight = true;
            }
        } else {
            // Kann Feind nicht verfolgen wegen Wasser
            dino.combatTarget = null;
            dino.overallState = 'neutral';
            
            if (debugMode) {
                console.log(`🚫 ${dino.species.name} bricht Verfolgung ab: Wasser blockiert Weg`);
            }
        }
    }
}
// Kampf starten
function startCombat(attacker, defender) {
    if (attacker.foodState === 'consuming') {
        interruptFoodConsumption(attacker, 'combat started');
    }
    if (defender.foodState === 'consuming') {
        interruptFoodConsumption(defender, 'under attack');
    }
                
    const attackerInCombat = combats.find(c => c.participants.includes(attacker));
    if (attackerInCombat) return;
    
    const defenderInCombat = combats.find(c => c.participants.includes(defender));
    if (defenderInCombat) {
        return;
    }
        
    // Beide Dinos in Kampfmodus
    attacker.overallState = 'fighting';
    defender.overallState = 'fighting';
    attacker.combatTarget = defender;
    defender.combatTarget = attacker;
    
    attacker.targetTileX = attacker.tileX;
    attacker.targetTileY = attacker.tileY;
    defender.targetTileX = defender.tileX;
    defender.targetTileY = defender.tileY;
    
    attacker.behaviorState = 'resting';
    defender.behaviorState = 'resting';
    
    // Optimal ausrichten für den Kampf
    const dx = defender.tileX - attacker.tileX;
    if (dx > 0) {
        attacker.facingRight = false;
        defender.facingRight = true;
    } else {
        attacker.facingRight = true;
        defender.facingRight = false;
    }
    
    // Kampf-Objekt erstellen
    const combat = {
        participants: [attacker, defender],
        currentAttacker: attacker,
        startTime: Date.now()
    };
    
    combats.push(combat);
}

// Angriff durchführen
function performAttack(attacker, defender) {
    if (attacker.availableAttacks.length === 0) return;
    
    // Angriff auswählen (gewichtet nach Wahrscheinlichkeit)
    const attack = selectWeightedAttack(attacker.availableAttacks);
    
    // Stamina-Kosten
    const staminaCost = COMBAT_CONFIG.STAMINA_COSTS[attack.type];
    if (attacker.currentStamina < staminaCost) {
        // Nicht genug Stamina - Turn wechseln
        const combat = combats.find(c => c.participants.includes(attacker));
        if (combat) {
            combat.currentAttacker = combat.participants.find(p => p !== attacker);
        }
        return;
    }
    
    attacker.currentStamina -= staminaCost;
    attacker.lastAttackTime = Date.now(); 
    // Angriffs-Animation
    attacker.isAttacking = true;
    attacker.attackAnimationStart = Date.now();
    
    // Icon anzeigen
    showAttackIcon(attacker, attack.type);
    
    // Schaden berechnen
    let damage = calculateDamage(attack, attacker, defender);

    // NEU: Muskel-Boost anwenden
    if (attacker.hasMuscleBoostMax) {
        damage = Math.round(damage * 1.40); // 30% bei Stufe 2
    } else if (attacker.hasMuscleBoost) {
        damage = Math.round(damage * 1.15); // 15% bei Stufe 1
    }
    
    // Schaden anwenden
    defender.currentHP = Math.max(0, defender.currentHP - damage);
    
    // Bluteffekt
    createBloodEffect(defender);
    
    // Tod prüfen
    if (defender.currentHP <= 0) {
        // NEU: Kill tracken
        trackKill(attacker, defender);
        
        handleDeath(defender);
        endCombat(attacker, defender);
    } else {
        setTimeout(() => {
            const combat = combats.find(c => c.participants.includes(attacker));
            if (combat && combat.currentAttacker === attacker) {
                combat.currentAttacker = defender;
                // console.log(`🔄 Turn wechselt zu: ${defender.species.name}`);
            }
        }, 800); // 800ms statt 500ms für bessere Übersicht
    }
}

// Gewichtete Angriffs-Auswahl
function selectWeightedAttack(attacks) {
    // Top 3 Angriffe nach Wahrscheinlichkeit
    const topAttacks = attacks.slice(0, 3);
    
    const weights = topAttacks.map((attack, index) => {
        if (index === 0) return 0.6; // Höchster: 60%
        if (index === 1) return 0.3; // Zweiter: 30%
        return 0.1; // Dritter: 10%
    });
    
    const random = Math.random();
    let weightSum = 0;
    
    for (let i = 0; i < topAttacks.length; i++) {
        weightSum += weights[i];
        if (random <= weightSum) {
            return topAttacks[i];
        }
    }
    
    return topAttacks[0]; // Fallback
}

// Schaden berechnen mit Verteidigung
function calculateDamage(attack, attacker, defender) {
    let damage = attack.damage;
    const defenseAbilities = defender.abilities;
    
    // Verteidigungsmodifikatoren anwenden
    let damageReduction = 0;
    
    // Gewicht (Sprung-Schutz)
    if (attack.type === 'Sprung' && defenseAbilities['Gewicht'] >= 50) {
        damageReduction += 0.2; // -20%
    }
    
    // Tarnung (Gift Speien & Tödlicher Biss)
    if ((attack.type === 'Gift Speien' || attack.type === 'Tödlicher Biss') && defenseAbilities['Tarnung'] >= 50) {
        damageReduction += 0.2; // -20%
    }
    
    // Ausweichen (alles)
    if (defenseAbilities['Ausweichen'] >= 50) {
        damageReduction += 0.3; // -30%
    }
    
    // Panzerung (alles außer Gift Speien)
    if (attack.type !== 'Gift Speien' && defenseAbilities['Panzerung'] >= 50) {
        damageReduction += 0.35; // -35%
    }
    
    // Panzerung vor tödlichem Biss
    if (attack.type === 'Tödlicher Biss' && defenseAbilities['Panzerung vor tödlichem Biss'] >= 50) {
        damageReduction += 0.45; // -45%
    }
    
    // Schaden reduzieren (mindestens 1)
    damage = Math.max(1, Math.round(damage * (1 - Math.min(0.9, damageReduction))));

    // NEU: Gesättigt-Boost anwenden (30% weniger Schaden)
    if (defender.hasSatiatedBoostMax) {
        damage = Math.max(1, Math.round(damage * 0.3)); // 70% Schadensreduktion bei Stufe 2
        // console.log(`🏰 ${defender.species.name} MAX Gesättigt-Boost: -70% Schaden (${damage})`);
    } else if (defender.hasSatiatedBoost) {
        damage = Math.max(1, Math.round(damage * 0.7)); // 30% Schadensreduktion bei Stufe 1
        // console.log(`🛡️ ${defender.species.name} Gesättigt-Boost: -30% Schaden (${damage})`);
    }

    return damage;
}

// ===================================
// VISUELLE EFFEKTE
// ===================================

// Angriffs-Icon anzeigen
function showAttackIcon(attacker, attackType) {
    const icon = {
        dino: attacker,
        type: attackType,
        symbol: COMBAT_CONFIG.ATTACK_ICONS[attackType],
        startTime: Date.now(),
        duration: 1000, // 1 Sekunde
        offsetY: 0
    };
    
    attackIcons.push(icon);
    
    // Icon nach 1 Sekunde entfernen
    setTimeout(() => {
        const index = attackIcons.indexOf(icon);
        if (index > -1) {
            attackIcons.splice(index, 1);
        }
    }, icon.duration);
}

function createLeafEffect(tree, dino) {
    // console.log(`🍃 Blattpartikel für Baum bei (${tree.tileX}, ${tree.tileY}) erstellt`);
    const particleCount = 3 + Math.random() * 2; // 3-7 Blätter
    
    for (let i = 0; i < particleCount; i++) {
        const particle = {
            x: tree.tileX * tileSize + tileSize / 2 + terrainOffsetX + (Math.random() - 0.5) * 30,
            y: tree.tileY * tileSize + tileSize / 4 + terrainOffsetY + (Math.random() - 0.5) * 20, // Etwas höher (Krone)
            vx: (Math.random() - 0.5) * 60 + (dino.facingRight ? -20 : 20), // Leicht in Richtung des Dinos
            vy: -30 + Math.random() * 20, // Leicht nach oben, dann fallen
            life: 1.0,
            maxLife: 1.0 + Math.random() * 0.8, // 1-1.8 Sekunden
            size: 6 + Math.random() * 4,
            rotation: Math.random() * Math.PI * 2, // Zufällige Rotation
            rotationSpeed: (Math.random() - 0.5) * 6 // Drehgeschwindigkeit
        };
        leafParticles.push(particle);
    }
}

// Bluteffekt erstellen
function createBloodEffect(defender) {
    const particleCount = 5 + Math.random() * 5;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = {
            x: defender.tileX * tileSize + tileSize / 2 + terrainOffsetX + (Math.random() - 0.5) * 20,
            y: defender.tileY * tileSize + tileSize / 2 + terrainOffsetY + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100 - 50, // Nach oben
            life: 1.0,
            maxLife: 0.5 + Math.random() * 0.5,
            size: 2 + Math.random() * 3
        };
        
        bloodParticles.push(particle);
    }
}

// Tod handhaben
function handleDeath(dino) {    
    dino.overallState = 'dead';
    dino.combatTarget = null;
    
    // Leiche erstellen
    corpses.push({
        dino: dino,
        deathTime: Date.now(),
        tileX: dino.tileX,
        tileY: dino.tileY
    });
    
    // Dino aus gameObjects entfernen
    const index = gameObjects.indexOf(dino);
    if (index > -1) {
        gameObjects.splice(index, 1);
    }
    
    updateHUD();
}

// Kampf beenden
function endCombat(winner, loser) {
    // console.log(`🏆 ${winner.species.name} gewinnt gegen ${loser.species.name}`);
    
    // Kampf aus Liste entfernen
    const combatIndex = combats.findIndex(c => 
        c.participants.includes(winner) && c.participants.includes(loser)
    );
    
    if (combatIndex !== -1) {
        const combat = combats[combatIndex];
        
        // Alle Teilnehmer zurück zu neutral setzen
        combat.participants.forEach(participant => {
            if (participant !== loser && participant.overallState !== 'dead') {
                participant.overallState = 'neutral';
                participant.combatTarget = null;
                
                // NEU: Bewegung wieder aktivieren
                participant.behaviorState = 'resting';
                participant.behaviorTimer = 0;
                participant.currentBehaviorDuration = participant.getRandomRestDuration();
                // console.log(`🔓 ${participant.species.name} kann sich wieder bewegen`);
            }
        });
        
        combats.splice(combatIndex, 1);
    }
    
    // Gewinner spezifisch zurück zu neutral
    if (winner.overallState !== 'dead') {
        winner.overallState = 'neutral'
        winner.postCombatCooldownUntil = Date.now() + (FOOD_CONFIG.POST_COMBAT_COOLDOWN * 1000);
        winner.combatTarget = null;
        
        // Bewegung für Gewinner auch aktivieren
        winner.behaviorState = 'resting';
        winner.behaviorTimer = 0;
        winner.currentBehaviorDuration = winner.getRandomRestDuration();
    }
}

// ===================================
// UPDATE & RENDERING
// ===================================

// Kampf-Updates (zur bestehenden update()-Funktion hinzufügen)
function updateCombatSystem() {
    if (isPaused || isLoading) return;
    
    // Alle Dinos updaten
    gameObjects.forEach(obj => {
        if (obj instanceof Dino) {
            updateCombat(obj);
        }
    });
    
    // Blutpartikel updaten
    bloodParticles = bloodParticles.filter(particle => {
        particle.x += particle.vx * gameSpeed / 60;
        particle.y += particle.vy * gameSpeed / 60;
        particle.vy += 200 * gameSpeed / 60; // Schwerkraft
        particle.life -= gameSpeed / 60 / particle.maxLife;
        
        return particle.life > 0;
    });

    leafParticles = leafParticles.filter(particle => {
        particle.x += particle.vx * gameSpeed / 60;
        particle.y += particle.vy * gameSpeed / 60;
        particle.vy += 120 * gameSpeed / 60; // Schwerkraft (schwächer als Blut)
        particle.rotation += particle.rotationSpeed * gameSpeed / 60;
        particle.life -= gameSpeed / 60 / particle.maxLife;
        
        return particle.life > 0;
    });
    
    // Attack-Icons updaten
    attackIcons.forEach(icon => {
        const elapsed = Date.now() - icon.startTime;
        icon.offsetY = -(elapsed / icon.duration) * 50; // 50px nach oben
    });
    gameObjects.forEach(obj => {
        if (obj instanceof Dino) {
            updateFood(obj);
        }
    });

    // Food-Icons updaten
    foodIcons.forEach(icon => {
        const elapsed = Date.now() - icon.startTime;
        icon.offsetY = -(elapsed / icon.duration) * 60; // 60px nach oben
    });

    if (Math.floor(Date.now() / 5000) % 1 === 0) {
        cleanupOrphanedFoodReservations();
    }
}

// Kampf-Rendering (zur bestehenden render()-Funktion hinzufügen)
function renderCombatEffects() {
    // Blutpartikel rendern
    bloodParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    });

    leafParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Blattform (einfaches Rechteck in grün)
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-particle.size/2, -particle.size/4, particle.size, particle.size/2);
        
        // Hellerer Fleck in der Mitte
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(-particle.size/4, -particle.size/8, particle.size/2, particle.size/4);
        
        ctx.restore();
    });

    foodIcons.forEach(icon => {
        const pixelX = icon.dino.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = icon.dino.tileY * tileSize + tileSize / 2 + terrainOffsetY;
        
        ctx.save();
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#32CD32';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const elapsed = Date.now() - icon.startTime;
        icon.offsetY = -(elapsed / icon.duration) * 60; // 60px nach oben
        
        const iconY = pixelY - 30 + icon.offsetY;
        const text = `${icon.symbol}+${icon.value}`;
        
        ctx.strokeText(text, pixelX, iconY);
        ctx.fillText(text, pixelX, iconY);
        ctx.restore();
    });
    
    // Attack-Icons rendern
    attackIcons.forEach(icon => {
        const pixelX = icon.dino.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = icon.dino.tileY * tileSize + tileSize / 2 + terrainOffsetY;
        
        ctx.save();
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const iconY = pixelY - 40 + icon.offsetY;
        ctx.strokeText(icon.symbol, pixelX, iconY);
        ctx.fillText(icon.symbol, pixelX, iconY);
        ctx.restore();
    });
    
    // Leichen rendern
    corpses.forEach(corpse => {
        const pixelX = corpse.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = corpse.tileY * tileSize + tileSize / 2 + terrainOffsetY;
        
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.translate(pixelX, pixelY);
        ctx.rotate(Math.PI / 2); // 90° gedreht (tot)
        
        // Vereinfachte Leichen-Darstellung
        const scale = corpse.dino.scale;
        dinoRenderer.renderDino(ctx, 0, 0, corpse.dino.species.properties, 
                            corpse.dino.dinoType, scale, corpse.dino.isEnemy, 
                            null, corpse.dino.facingRight);
        
        ctx.restore();
    });
}

// HP/Stamina Balken zur bestehenden Dino.render() hinzufügen
function renderCombatUI(dino) {
    if (dino.overallState === 'dead') return;
    
    const pixelX = dino.tileX * tileSize + tileSize / 2 + terrainOffsetX;
    const pixelY = dino.tileY * tileSize + tileSize / 2 + terrainOffsetY;
    
    // SEHR KOMPAKTE WERTE
    const barWidth = 70 * dino.scale;  // Noch länger
    const barHeight = 3;               // Dünner (3 statt 4)
    const barSpacing = 2;              // Sehr eng (2 statt 3)
    
    // Startposition noch höher
    const startY = pixelY - 80 * dino.scale;
    
    // HP-Balken
    ctx.fillStyle = '#333333';
    ctx.fillRect(pixelX - barWidth/2, startY, barWidth, barHeight);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(pixelX - barWidth/2, startY, barWidth * (dino.currentHP/dino.maxHP), barHeight);
    
    // Stamina-Balken
    const staminaY = startY + barHeight + barSpacing;
    ctx.fillStyle = '#333333';
    ctx.fillRect(pixelX - barWidth/2, staminaY, barWidth, barHeight);
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(pixelX - barWidth/2, staminaY, barWidth * (dino.currentStamina/dino.maxStamina), barHeight);
    
    // Cooldown-Balken
    if (dino.overallState === 'fighting') {
        const timeSinceLastAttack = (Date.now() - dino.lastAttackTime) / 1000;
        const cooldownProgress = Math.min(1, timeSinceLastAttack / COMBAT_CONFIG.ATTACK_COOLDOWN);
        
        if (cooldownProgress < 1) {
            const cooldownY = staminaY + barHeight + barSpacing;
            
            ctx.fillStyle = '#333333';
            ctx.fillRect(pixelX - barWidth/2, cooldownY, barWidth, barHeight);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(pixelX - barWidth/2, cooldownY, barWidth * cooldownProgress, barHeight);
        }
    }
    let symbolX = 0;
    const symbolY = startY - 12; 
    // Kampf-Symbol
    if (dino.overallState === 'fighting') {
        ctx.fillStyle = '#FF6B35';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
            // 12px über den Balken
        ctx.strokeText('⚔️', pixelX, symbolY);
        ctx.fillText('⚔️', pixelX, symbolY);
        symbolX += 15; // Platz für nächstes Icon
    }
    
    // NEU: Muskel-Icon für Dinos mit Boost
    if (dino.hasMuscleBoostMax) {
        ctx.fillStyle = '#FF4500'; // Orange-Rot für Stufe 2
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '14px Arial'; // Größer
        ctx.textAlign = 'center';
        ctx.strokeText('⚡', pixelX +symbolX, symbolY);
        ctx.fillText('⚡', pixelX +symbolX, symbolY);                            
        symbolX += 18; // Mehr Platz für größeres Icon
    }else if (dino.hasMuscleBoost) {
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        ctx.strokeText('💪', pixelX +symbolX, symbolY);
        ctx.fillText('💪', pixelX +symbolX, symbolY);
        symbolX += 15; // Platz für nächstes Icon
    }

    // NEU: Schild-Icon für gesättigte Dinos
    if (dino.hasSatiatedBoostMax) {
        ctx.fillStyle = '#8B0000'; // Dunkelrot für Stufe 2
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '14px Arial'; // Größer
        ctx.textAlign = 'center';
        ctx.strokeText('🏰', pixelX +symbolX, symbolY);
        ctx.fillText('🏰', pixelX +symbolX, symbolY);
    }else if (dino.hasSatiatedBoost) {
        ctx.fillStyle = '#4169E1'; // Blau
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';              
        ctx.strokeText('🛡️', pixelX +symbolX, symbolY);
        ctx.fillText('🛡️', pixelX +symbolX, symbolY);
    }
} 

// Nahrungsquellen in der Nähe finden
function findFoodSourcesInRange(dino) {
    if (dino.overallState === 'dead' || dino.foodState === 'consuming') return [];
    
    const sources = [];
    const detectionRadius = dino.detectionRadius;
    
    gameObjects.forEach(obj => {
        const distance = calculateDistance(dino, obj);
        if (distance > detectionRadius) return;
        
        // Bäume (Pflanzen)
        if (obj.type === 'tree' && dino.canConsumePlants) {
            const sourceId = `tree_${obj.tileX}_${obj.tileY}`;
            
            if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
                // NEU: Prüfe wie viele andere Dinos schon darauf abzielen
                const competitorCount = countCompetitorsForFood(obj, dino);
                
                if (competitorCount >= 2) {
                    return; // Überspringen wenn zu viele Konkurrenten
                }
                
                const isLarge = obj.baseSize >= 25;
                sources.push({
                    object: obj,
                    type: 'plants',
                    value: isLarge ? FOOD_CONFIG.FOOD_VALUES.LARGE_TREE : FOOD_CONFIG.FOOD_VALUES.SMALL_TREE,
                    preference: dino.foodPreferences.plants,
                    sourceId: sourceId,
                    competitorCount: competitorCount
                });
            }
        }
        
        // Nagetiere (Fleisch)
        if (obj.type === 'rodent' && dino.canConsumeMeat) {
            const sourceId = `rodent_${obj.tileX}_${obj.tileY}`;
            
            if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
                const competitorCount = countCompetitorsForFood(obj, dino);
                
                if (competitorCount >= 1) { // Nagetiere: nur 1 Dino
                    return;
                }
                
                sources.push({
                    object: obj,
                    type: 'meat',
                    value: FOOD_CONFIG.FOOD_VALUES.RODENT,
                    preference: dino.foodPreferences.meat,
                    sourceId: sourceId,
                    competitorCount: competitorCount
                });
            }
        }
    });
    
    // Leichen (vereinfacht - behält bestehende Logik)
    if (dino.canConsumeCarrion || dino.canConsumeMeat) {
        corpses.forEach(corpse => {
            const distance = Math.sqrt(
                (dino.tileX - corpse.tileX) ** 2 + 
                (dino.tileY - corpse.tileY) ** 2
            );
            
            if (distance <= detectionRadius) {
                const sourceId = `corpse_${corpse.tileX}_${corpse.tileY}_${corpse.deathTime}`;
                
                if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
                    const competitorCount = countCompetitorsForFood(corpse, dino);
                    
                    if (competitorCount >= 1) {
                        return;
                    }
                    
                    const isOwnSpecies = corpse.dino.isEnemy === dino.isEnemy;
                    if (isOwnSpecies && !dino.canConsumeCarrion) return;
                    
                    const preference = isOwnSpecies ? 
                        dino.foodPreferences.carrion : 
                        Math.max(dino.foodPreferences.meat, dino.foodPreferences.carrion);
                    
                    sources.push({
                        object: corpse,
                        type: 'meat',
                        value: isOwnSpecies ? FOOD_CONFIG.FOOD_VALUES.OWN_CORPSE : FOOD_CONFIG.FOOD_VALUES.ENEMY_CORPSE,
                        preference: preference,
                        sourceId: sourceId,
                        competitorCount: competitorCount
                    });
                }
            }
        });
    }
    
    // NEU: Sortierung nach Konkurrenz, dann Vorliebe
    return sources.sort((a, b) => {
        if (a.competitorCount !== b.competitorCount) {
            return a.competitorCount - b.competitorCount;
        }
        return b.preference - a.preference;
    });
}

function countCompetitorsForFood(foodObject, excludeDino) {
    let count = 0;
    
    gameObjects.forEach(obj => {
        if (obj instanceof Dino && 
            obj !== excludeDino && 
            obj.overallState !== 'dead' && 
            obj.foodState === 'seeking' && 
            obj.foodTarget && 
            obj.foodTarget.object === foodObject) {
            count++;
        }
    });
    
    return count;
}


// Beste Nahrungsquelle auswählen
function selectBestFoodSource(dino) {
    const sources = findFoodSourcesInRange(dino);
    
    // Probiere Nahrungsquellen in Reihenfolge der Präferenz
    for (const source of sources) {
        // Atomare Reservierung: Prüfen und Setzen in einem Schritt
        if (!occupiedFoodSources.has(source.sourceId)) {
            // SOFORT reservieren ohne weitere Delays
            occupiedFoodSources.set(source.sourceId, dino);
            return source;
        }
    }
    
    return null; // Keine verfügbare Nahrung
}

function startFoodConsumption(dino, foodSource) {
    // Prüfe nochmals ob Nahrungsquelle frei ist (Race Condition vermeiden)
    if (occupiedFoodSources.has(foodSource.sourceId)) {
        // console.log(`🚫 ${dino.species.name}: Nahrungsquelle bereits belegt, suche neue`);
        dino.foodState = 'neutral';
        dino.foodTarget = null;
        return;
    }

    // Nahrungsquelle als belegt markieren
    occupiedFoodSources.set(foodSource.sourceId, dino);
   
    dino.foodState = 'consuming';
    dino.foodTarget = foodSource;
    dino.consumptionStartTime = Date.now();

    dino.behaviorState = 'resting';
    dino.targetTileX = dino.tileX;  // Aktuelle Position beibehalten
    dino.targetTileY = dino.tileY;  // Aktuelle Position beibehalten
    dino.animationPhase = 'idle';

    const targetObj = dino.foodTarget.object;
    const targetX = targetObj.tileX !== undefined ? targetObj.tileX : targetObj.tileX;

    const dx = targetX - dino.tileX;
    // IMMER ausrichten, auch bei kleinen Unterschieden
    if (dx > 0) {
        dino.facingRight = false; // Nahrung ist rechts
    } else if (dx < 0) {
        dino.facingRight = true;  // Nahrung ist links
    }
    dino.feedingRotationLocked = true;
    // Erste Konsumtions-Animation starten
    startConsumptionDash(dino);
}

function startConsumptionDash(dino) {
    // Sofort ersten Dash starten
    dino.isConsuming = true;
    dino.consumptionDashStart = Date.now();
    
    const targetObj = dino.foodTarget.object;
 }


// Nahrungsaufnahme abschließen
function completeFoodConsumption(dino) {
    const foodSource = dino.foodTarget;
    if (!foodSource) return;
    
    // Konsumptions-Animation beenden
    dino.isConsuming = false;
    
    // Nahrungsquelle freigeben
    occupiedFoodSources.delete(foodSource.sourceId);

    // Effizienz basierend auf Vorliebe berechnen
    const preference = foodSource.preference;
    let efficiency = preference / 100; // 0-1 basierend auf 0-100 Vorliebe
    if (preference >= 100) efficiency = 2.0; // Doppelte Ausbeute bei 100
    if (preference <= 0) efficiency = 0.0;   // Keine Ausbeute bei 0
    
    const finalValue = Math.round(foodSource.value * efficiency);
    
    // Nahrungspunkte hinzufügen
    if (foodSource.type === 'plants') {
        teamFood.plants += finalValue;
    } else {
        teamFood.meat += finalValue;
    }

    // NEU: Individuelle Nahrungspunkte für Gesättigt-Boost tracken
    dino.totalFoodConsumed += finalValue;
 
    // Gesättigt-Boost bei 20 Nahrungspunkten aktivieren
    if (dino.totalFoodConsumed >= 12 && !dino.hasSatiatedBoost) {
        dino.hasSatiatedBoost = true;
     }

    // Gesättigt-Boost MAX bei 40 Nahrungspunkten aktivieren
    if (dino.totalFoodConsumed >= 24 && !dino.hasSatiatedBoostMax) {
        dino.hasSatiatedBoostMax = true;
        // console.log(`🏰 ${dino.species.name} ist MAXIMAL gesättigt! (+70% Verteidigung)`);
    }

    if (dino.currentHP < dino.maxHP) {
        const healingAmount = Math.round(finalValue * 2); // 2 HP pro Nahrungspunkt
        const oldHP = dino.currentHP;
        dino.currentHP = Math.min(dino.maxHP, dino.currentHP + healingAmount);
        const actualHealing = dino.currentHP - oldHP;
        
        if (actualHealing > 0) {
            // console.log(`💚 ${dino.species.name} regeneriert ${actualHealing} HP durch Nahrung (${oldHP}→${dino.currentHP})`);
            //  showHealingIcon(dino, actualHealing);
        }
    }

    // Icon anzeigen
    showFoodIcon(dino, foodSource.type, finalValue);
    
    // Nahrungsquelle als verbraucht markieren
    consumedFoodSources.add(foodSource.sourceId);
    
    // Baum-Krone entfernen
    if (foodSource.object.type === 'tree') {
        foodSource.object.hasBeenEaten = true;
        
        // Regeneration planen
        setTimeout(() => {
            consumedFoodSources.delete(foodSource.sourceId);
            foodSource.object.hasBeenEaten = false;
            // console.log(`🌳 Baum regeneriert: ${foodSource.sourceId}`);
        }, FOOD_CONFIG.TREE_REGENERATION * 1000);
    }
    
    // Nagetier entfernen
    if (foodSource.object.type === 'rodent') {
        const index = gameObjects.indexOf(foodSource.object);
        if (index > -1) {
            gameObjects.splice(index, 1);
        }
    }
    
    // Leiche entfernen
    if (foodSource.object.deathTime) {
        const index = corpses.indexOf(foodSource.object);
        if (index > -1) {
            corpses.splice(index, 1);
        }
    }
    
    // Post-Food Cooldown setzen
    dino.foodCooldownUntil = Date.now() + (FOOD_CONFIG.POST_FOOD_COOLDOWN * 1000);
    
    // Zustand zurücksetzen
    dino.feedingRotationLocked = false;
    dino.foodState = 'neutral';
    dino.foodTarget = null;
    
    updateHUD(); // HUD mit neuen Nahrungspunkten aktualisieren
}

// Nahrungsaufnahme unterbrechen
function interruptFoodConsumption(dino, reason = 'unknown') {
    // console.log(`❌ ${dino.species.name} Nahrungsaufnahme unterbrochen: ${reason}`);
    
    // Konsumptions-Animation beenden
    dino.isConsuming = false;
    
    // Reservierung freigeben (falls vorhanden)
    if (dino.foodTarget && dino.foodTarget.sourceId) {
        if (occupiedFoodSources.get(dino.foodTarget.sourceId) === dino) {
            occupiedFoodSources.delete(dino.foodTarget.sourceId);
        }
    }
    
    dino.feedingRotationLocked = false;
    dino.foodState = 'neutral';
    dino.foodTarget = null;
    dino.consumptionStartTime = 0;
}

// Food Icon anzeigen (ähnlich wie Attack Icons)
function showFoodIcon(dino, foodType, value) {
    const icon = {
        dino: dino,
        type: foodType,
        symbol: FOOD_CONFIG.FOOD_ICONS[foodType],
        value: value,
        startTime: Date.now(),
        duration: 1500, // 1.5 Sekunden
        offsetY: 0
    };
    
    foodIcons.push(icon);
    
    // Icon nach 1.5 Sekunden entfernen
    setTimeout(() => {
        const index = foodIcons.indexOf(icon);
        if (index > -1) {
            foodIcons.splice(index, 1);
        }
    }, icon.duration);
}

function updateFood(dino) {
    if (dino.overallState === 'dead') return;
    
    const currentTime = Date.now();
    
    // Cooldown-Checks
    const inPostCombatCooldown = currentTime < dino.postCombatCooldownUntil;
    const inFoodCooldown = currentTime < dino.foodCooldownUntil;
    
    // Nahrungsverhalten nur wenn nicht im Cooldown und nicht kämpfend
    if (!inPostCombatCooldown && !inFoodCooldown && dino.overallState !== 'fighting') {
        
        switch (dino.foodState) {
            case 'neutral':
                updateFoodNeutralState(dino);
                break;
            case 'seeking':
                updateFoodSeekingState(dino);
                break;
            case 'consuming':
                updateFoodConsumingState(dino);
                break;
        }
    }
}

function updateFoodNeutralState(dino) {
    if (dino.overallState === 'neutral') {
    
        const bestFood = selectBestFoodSource(dino);
        
        if (bestFood) {
            // Double-Check ob noch verfügbar
            const occupiedBy = occupiedFoodSources.get(bestFood.sourceId);
            if (occupiedBy && occupiedBy !== dino) {
                // console.log(`🚫 ${dino.species.name}: Nahrung zwischenzeitlich belegt`);
                return;
            }

            const feedingPosition = calculateOptimalFeedingPositions(bestFood, {
                x: dino.tileX,
                y: dino.tileY
            });
            
            // SOFORT reservieren
            occupiedFoodSources.set(bestFood.sourceId, dino);
            
            dino.foodState = 'seeking';
            dino.foodTarget = bestFood;
            dino.feedingPosition = feedingPosition; // NEU: Zielposition speichern
            dino.seekingStartTime = Date.now();
            dino.lastPosition = null;
        } else {
            // Keine Nahrung gefunden - kurze Pause
            dino.foodCooldownUntil = Date.now() + 2000;
        }
    }
}

function updateFoodSeekingState(dino) {
    if (dino.avoidanceMode.active) {
        dino.updateAvoidanceMode();
        return;
    }

    if (!dino.foodTarget) {
        dino.foodState = 'neutral';
        return;
    }
    
    // Timeout
    const seekingTime = (Date.now() - dino.seekingStartTime) / 1000;
    if (seekingTime > 8) { // Etwas mehr Zeit für komplexere Wege
        releaseFoodReservation(dino);
        return;
    }
    
    // Feinde in der Nähe? Abbrechen!
    const enemies = findEnemiesInRange(dino);
    if (enemies.length > 0) {
        releaseFoodReservation(dino);
        return;
    }
 
    const targetObj = dino.foodTarget.object;
    const targetX = dino.feedingPosition.x;
    const targetY = dino.feedingPosition.y;

    const pathCheck = dino.checkPathBlocked(
        dino,
        dino.tileX,
        dino.tileY,
        targetX,
        targetY
    );
    
    if (pathCheck.blocked) {
        dino.activateAvoidanceMode(targetX, targetY, pathCheck.position);
        return;
    }
   
    const distance = Math.sqrt((dino.tileX - targetX) ** 2 + (dino.tileY - targetY) ** 2);
    let requiredDistance = 0.1;

    // Nah genug zum Fressen?
    if (distance <= requiredDistance) {
        startFoodConsumption(dino, dino.foodTarget);
        return;
    }
    
    // Zu weit entfernt? Aufgeben
    if (distance > dino.detectionRadius * 1.2) {
        releaseFoodReservation(dino);
        return;
    }
    
    // VEREINFACHTE STRATEGIE: Eine klare Prioritätenreihenfolge
    let moveTargetX = targetX;
    let moveTargetY = targetY;
    let movementReason = "direct";

    const finalDx = moveTargetX - dino.tileX;
    const finalDy = moveTargetY - dino.tileY;
    const moveDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
    
    if (moveDistance > 0.1) {
        let moveSpeed = dino.getMovementSpeed();
        
        const newX = dino.tileX + (finalDx / moveDistance) * moveSpeed;
        const newY = dino.tileY + (finalDy / moveDistance) * moveSpeed;
        
        if (isPositionValidForMovement(dino, newX, newY)) {
            // Grenzen-Check
            dino.tileX = Math.max(1, Math.min(mapWidth - 1, newX));
            dino.tileY = Math.max(5, Math.min(mapHeight - 1, newY));
            
            // Blickrichtung (nur bei deutlicher Bewegung)
            if (Math.abs(finalDx) > 0.1) {
                if (finalDx > 0) dino.facingRight = false;
                else dino.facingRight = true;
            }
        } else {
            // Nahrungssuche abbrechen wenn Wasser im Weg
            releaseFoodReservation(dino);
            dino.foodCooldownUntil = Date.now() + 2000;

            return;
        }
    }
}

function isPathClear(fromX, fromY, toX, toY) {
    // Einfacher Terrain-Check: Prüfe einige Punkte auf dem Weg
    const steps = 5;
    
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const checkX = fromX + (toX - fromX) * progress;
        const checkY = fromY + (toY - fromY) * progress;
        
        // Prüfe ob Position im gültigen Bereich
        if (checkX < 1 || checkX >= mapWidth - 1 || 
            checkY < 5 || checkY >= mapHeight - 1) {
            return false;
        }
        
        // Prüfe Terrain-Typ (Wasser vermeiden)
        const tileX = Math.floor(checkX);
        const tileY = Math.floor(checkY);
        
        if (tileY >= 0 && tileY < mapHeight && 
            tileX >= 0 && tileX < mapWidth && 
            tileMap[tileY] && 
            tileMap[tileY][tileX] === TILE_TYPES.WATER) {
            return false; // Wasser blockiert
        }
    }
    
    return true; // Weg ist frei
}

function releaseFoodReservation(dino) {
    if (dino.foodTarget && dino.foodTarget.sourceId) {
        if (occupiedFoodSources.get(dino.foodTarget.sourceId) === dino) {
            occupiedFoodSources.delete(dino.foodTarget.sourceId);
        }
    }
    
    dino.foodState = 'neutral';
    dino.foodTarget = null;
    dino.lastPosition = null;
}

function calculateOptimalFeedingPositions(foodSource, dinoPosition) {
    const targetObj = foodSource.object;
    let baseX, baseY;
        // console.log(`📍${baseX}`);
    
    // Basis-Position der Nahrungsquelle
    if (targetObj.tileX !== undefined) {
        baseX = targetObj.tileX;
        baseY = targetObj.tileY;
    } else {
        baseX = targetObj.tileX || foodSource.object.tileX;
        baseY = targetObj.tileY || foodSource.object.tileY;
    }
    
    // Horizontaler Abstand je nach Nahrungstyp
    let horizontalOffset;
    if (targetObj.type === 'tree') {
        horizontalOffset = 1.2;
    } else if (targetObj.type === 'rodent') {
        horizontalOffset = 0.8;
    } else if (targetObj.deathTime) { // Leiche
        horizontalOffset = 1.0;
    } else {
        horizontalOffset = 1.0; // Default
    }
    
    // Zwei mögliche Positionen berechnen
    const leftPosition = {
        x: baseX - horizontalOffset,
        y: baseY
    };
    
    const rightPosition = {
        x: baseX + horizontalOffset,
        y: baseY
    };
    
    // Entfernungen zum Dino berechnen
    const leftDistance = Math.sqrt(
        (dinoPosition.x - leftPosition.x) ** 2 + 
        (dinoPosition.y - leftPosition.y) ** 2
    );
    
    const rightDistance = Math.sqrt(
        (dinoPosition.x - rightPosition.x) ** 2 + 
        (dinoPosition.y - rightPosition.y) ** 2
    );
    
    // Nähere Position wählen
    const chosenPosition = leftDistance <= rightDistance ? leftPosition : rightPosition;
    const chosenSide = leftDistance <= rightDistance ? 'left' : 'right';
    
        // console.log(`📍 ${foodSource.type} Position gewählt: ${chosenSide} (${chosenPosition.x.toFixed(1)}, ${chosenPosition.y.toFixed(1)})`);
    
    return chosenPosition;
}

function updateFoodConsumingState(dino) {
    const currentTime = Date.now();
    const elapsed = (currentTime - dino.consumptionStartTime) / 1000;
    
    // Alle Bewegung komplett stoppen
    dino.behaviorState = 'resting';
    dino.targetTileX = dino.tileX;  // Position fixieren
    dino.targetTileY = dino.tileY;  // Position fixieren
    dino.animationPhase = 'idle';   // Nur Idle-Animation
    
    // KEINE Position-Updates! Dino bleibt genau wo er ist
    
    // Dash-Animation verwalten (alle 0,7 Sekunden)
    const dashInterval = 0.7; // 700ms zwischen Dashes
    const dashDuration = 0.3;  // 300ms pro Dash (wie bei Angriffen)
    
    // Berechne welcher Dash-Zyklus gerade läuft
    const cycleTime = elapsed % dashInterval;
    
    if (cycleTime < dashDuration) {
        // Wir sind in einem aktiven Dash
        if (!dino.isConsuming) {
            // Neuen Dash starten
            dino.isConsuming = true;
            dino.consumptionDashStart = Date.now() - (cycleTime * 1000);
            // console.log(`🦷 ${dino.species.name} macht Konsum-Dash (Zyklus ${Math.floor(elapsed / dashInterval) + 1})`);
            
            // NEU: Blatteffekt bei Bäumen
            if (dino.foodTarget && dino.foodTarget.object.type === 'tree') {
                createLeafEffect(dino.foodTarget.object, dino);
            }
        }
    } else {
        // Wir sind in der Pause zwischen Dashes
        dino.isConsuming = false;
    }

    if (cycleTime < dashDuration) {
        // Wir sind in einem aktiven Dash
        if (!dino.isConsuming) {
            // Neuen Dash starten
            dino.isConsuming = true;
            dino.consumptionDashStart = Date.now() - (cycleTime * 1000);
            // console.log(`🦷 ${dino.species.name} macht Konsum-Dash (Zyklus ${Math.floor(elapsed / dashInterval) + 1})`);
            
            // NEU: Blatteffekt bei Bäumen
            if (dino.foodTarget && dino.foodTarget.object.type === 'tree') {
                createLeafEffect(dino.foodTarget.object, dino);
            }
        }
    }
    
    // Nahrungsaufnahme abgeschlossen?
    if (elapsed >= FOOD_CONFIG.CONSUMPTION_TIME) {
        completeFoodConsumption(dino);
        return;
    }
 }


function cleanupOrphanedFoodReservations() {
    const currentTime = Date.now();
    const toDelete = [];
    
    for (const [sourceId, dino] of occupiedFoodSources.entries()) {
        // Prüfe ob der Dino noch existiert und die Nahrungsquelle noch konsumiert
        const dinoExists = gameObjects.includes(dino);
        const stillConsuming = dino.foodState === 'consuming';
        
        if (!dinoExists || !stillConsuming) {
            //// console.log(`🧹 Verwaiste Nahrungsreservierung entfernt: ${sourceId}`);
            toDelete.push(sourceId);
        }
    }
    
    toDelete.forEach(sourceId => {
        occupiedFoodSources.delete(sourceId);
    });
}

// ===================================
// INITIALISIERUNG
// ===================================

// Kampfsystem für alle Dinos initialisieren (nach Level-Generation)
function initializeCombatForAllDinos() {
    // Prüfen ob DinoAbilities verfügbar ist
    if (!window.DinoAbilities || !window.DinoAbilities.calculateDinoAbilities) {
        console.warn('⚠️ DinoAbilities noch nicht verfügbar, warte 100ms...');
        setTimeout(initializeCombatForAllDinos, 100);
        return;
    }
    
    gameObjects.forEach(obj => {
        if (obj instanceof Dino) {
            addCombatPropertiesToDino(obj);
            obj.initializeFoodBehavior();
        }
    });
 }

document.addEventListener('DOMContentLoaded', initGame);

document.addEventListener('keydown', (event) => {
    if (event.key === 'd' || event.key === 'D') {
        debugMode = !debugMode;
        console.log('🐛 Debug-Modus:', debugMode ? 'AN' : 'AUS');
    }
});
