
// ===================================
// GLOBALE VARIABLEN
// ===================================
let frame = 0;
let firstselector = false;

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

// Placement System Variablen
let placementPhase = true;
let placementTimeRemaining = 15; // Sekunden
let placementStartTime = null;
let currentPlacementGroup = 0;
let groupPlacements = []; // Array für die platzierten Positionen
let placementZoneOverlay = null;
let placementClickHandler = null;

let placementClickStartX = 0;
let placementClickStartY = 0;
let placementIsDragging = false;

let currentLevel = 1;

// API Base URL
const API_BASE = 'http://localhost:3001/api/game';

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

// Eierschalen-Partikel Array (füge dies zu den anderen Partikel-Arrays hinzu)
let eggshellParticles = [];

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
    WATER: 2,
    DESERT: 3
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
    },
    [TILE_TYPES.DESERT]: {
        base: '#C4B088',
        highlight: '#D4C098',
        shadow: '#8B7355' 
    }
};


// ===================================
// VEREINHEITLICHTES STATE-SYSTEM
// ===================================

// Alle möglichen Zustände
const DINO_STATES = {
    // Basis-Zustände
    IDLE: 'idle',                    // Stillstehend, nichts tuend
    WANDERING: 'wandering',          // Zufällig umherwandernd
    
    // Kampf-Zustände
    SEEKING_ENEMY: 'seeking_enemy',  // Feind verfolgen
    FIGHTING: 'fighting',            // Im aktiven Kampf
    
    // Nahrungs-Zustände
    SEEKING_FOOD: 'seeking_food',    // Nahrung suchen/ansteuern
    CONSUMING: 'consuming',          // Nahrung konsumieren

    SEEKING_HOTBED: 'seeking_hotbed',  // Brutstätte suchen
    LAYING_EGG: 'laying_egg',          // Ei legen
    
    // Spezial-Zustände
    AVOIDING: 'avoiding',            // Hindernis umgehen
    FLEEING: 'fleeing',             // Vor Gefahr fliehen
    DEAD: 'dead'                    // Tot
};

// State-Prioritäten (höhere Zahl = höhere Priorität)
const STATE_PRIORITIES = {
    [DINO_STATES.DEAD]: 100,
    [DINO_STATES.FIGHTING]: 90,
    [DINO_STATES.FLEEING]: 80,
    [DINO_STATES.SEEKING_ENEMY]: 70,
    [DINO_STATES.AVOIDING]: 60,
    [DINO_STATES.CONSUMING]: 50,
    [DINO_STATES.SEEKING_FOOD]: 40,
    [DINO_STATES.WANDERING]: 20,
    [DINO_STATES.IDLE]: 10
};

// ===================================
// API-FUNKTIONEN (unverändert)
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

async function saveProgress() {
    if (saveInProgress || !sessionId || sessionId.startsWith('offline')) {
        return;
    }
    
    saveInProgress = true;
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '💾 Speichere...';
    saveBtn.disabled = true;
    
    try {
        // Aktuelle Population aus gameObjects extrahieren
        const currentPopulation = levelData.populationData.map(species => {
            const ownDinos = gameObjects.filter(obj => 
                obj instanceof Dino && 
                !obj.isEnemy && 
                obj.species.name === species.name
            );
            
            return {
                ...species,
                population: {
                    total: ownDinos.length,
                    adults: ownDinos.filter(d => d.isAdult).length,
                    juveniles: ownDinos.filter(d => !d.isAdult).length,
                    isExtinct: ownDinos.length === 0
                }
            };
        });
        
        const response = await fetch(`${API_BASE}/save-progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                currentLevel: currentLevel || levelData.currentLevel || levelData.level || 1,
                populationData: currentPopulation
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            saveBtn.textContent = '✅ Gespeichert';
            setTimeout(() => {
                saveBtn.textContent = originalText;
            }, 2000);
            
            // console.log('💾 Fortschritt gespeichert');
        } else {
            throw new Error(data.error || 'Speichern fehlgeschlagen');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
        saveBtn.textContent = '❌ Fehler';
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 2000);
    } finally {
        saveBtn.disabled = false;
        saveInProgress = false;
    }
}

function calculateRandomMapWidth() {
    // Basis: 60 Kacheln
    // Variation: 0% bis +70% = 60 bis 102 Kacheln
    const variationFactor = Math.random() * 0.7; // 0.0 bis 0.7 (0% bis 70%)
    const additionalWidth = Math.round(baseMapWidth * variationFactor);
    
    mapWidth = baseMapWidth + additionalWidth;
    
    // Debug-Info
    const percentage = Math.round(variationFactor * 100);

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
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.state !== DINO_STATES.DEAD);
    const enemyDinos = gameObjects.filter(obj => obj instanceof Dino && obj.isEnemy && obj.state !== DINO_STATES.DEAD);
    
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
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.state !== DINO_STATES.DEAD);
    const enemyDinos = gameObjects.filter(obj => obj instanceof Dino && obj.isEnemy && obj.state !== DINO_STATES.DEAD);
    
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
    
    const ownDinos = gameObjects.filter(obj => obj instanceof Dino && !obj.isEnemy && obj.state !== DINO_STATES.DEAD);
    
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
        
        // Fallback mit Session-Erhaltung
        const nextLevel = (currentLevel || levelData.currentLevel || 1) + 1;
        const urlParams = new URLSearchParams();
        urlParams.set('session', sessionId);  // WICHTIG: Session beibehalten
        urlParams.set('level', nextLevel);
        urlParams.set('earnedPoints', earnedPoints);
        window.location.href = `index.html?${urlParams.toString()}`;
    }
}

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

    //startLevelTimer();
    startPlacementPhase();
    
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
// SCROLLING & ZOOM EVENTS (NEU)
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
// EGG-KLASSE
// ===================================

class Egg {
    constructor(tileX, tileY, parentSpecies, isEnemy = false) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.parentSpecies = parentSpecies;
        this.isEnemy = isEnemy;
        this.type = 'egg';
        
        // Zeitpunkt der Eiablage
        this.layTime = Date.now();
        this.incubationTime = 5000; // 5 Sekunden in Millisekunden
        
        // Visuelle Eigenschaften
        this.baseSize = 1; // Relative Größe zum Tilesize
        this.scale = this.baseSize;
        this.wobbleAmount = 0;
        this.crackLevel = 0; // 0 = intakt, 1-3 = verschiedene Riss-Stadien
        
        // Animation
        this.animationOffset = Math.random() * Math.PI * 2; // Zufälliger Start für Wobble
    }
    
    updateScale() {
        const scaleFactor = tileSize / baseTileSize;
        this.scale = this.baseSize * scaleFactor;
    }
    
    update() {
        if (isPaused) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.layTime;
        const progress = elapsed / this.incubationTime;
        
        // Wobble-Animation wird stärker, je näher das Schlüpfen
        if (progress > 0.5) {
            this.wobbleAmount = Math.sin((currentTime * 0.01) + this.animationOffset) * (progress - 0.5) * 10;
        }
        
        // Risse erscheinen
        if (progress > 0.6 && this.crackLevel === 0) {
            this.crackLevel = 1;
        }
        if (progress > 0.8 && this.crackLevel === 1) {
            this.crackLevel = 2;
        }
        if (progress > 0.95 && this.crackLevel === 2) {
            this.crackLevel = 3;
        }
        
        // Zeit zum Schlüpfen!
        if (elapsed >= this.incubationTime) {
            this.hatch();
        }
    }
    
    hatch() {
        console.log(`🐣 Ei schlüpft! ${this.parentSpecies.name} Jungtier spawnt`);
        
        // Schlüpf-Effekt (optional)
        this.createHatchEffect();
        
        // Jungtier erstellen
        const juvenile = new Dino(
            this.tileX, 
            this.tileY, 
            this.parentSpecies, 
            false, // isAdult = false
            this.isEnemy
        );
        
        // Combat-Eigenschaften hinzufügen
        addCombatPropertiesToDino(juvenile);
        juvenile.initializeFoodBehavior();
        
        // Jungtier zur Spielwelt hinzufügen
        gameObjects.push(juvenile);
        juvenile.updateScale(); // Skalierung anpassen
        
        // Ei aus gameObjects entfernen
        const index = gameObjects.indexOf(this);
        if (index > -1) {
            gameObjects.splice(index, 1);
        }
        
        // HUD aktualisieren
        updateHUD();
    }
    
    createHatchEffect() {
        // Eierschalen-Partikel erstellen
        const particleCount = 5 + Math.random() * 3;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = {
                x: this.tileX * tileSize + tileSize / 2 + terrainOffsetX + (Math.random() - 0.5) * 20,
                y: this.tileY * tileSize + tileSize / 2 + terrainOffsetY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 80,
                vy: -50 - Math.random() * 50, // Nach oben
                life: 1.0,
                maxLife: 0.8 + Math.random() * 0.4,
                size: 3 + Math.random() * 3,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 8,
                type: 'eggshell'
            };
            
            eggshellParticles.push(particle);
        }
    }
    
    render() {
        const pixel = PositionUtils.tileToPixel(this.tileX, this.tileY, tileSize, terrainOffsetX, terrainOffsetY);
        const pixelX = pixel.x;
        const pixelY = pixel.y;
        
        ctx.save();
        ctx.translate(pixelX, pixelY);
        
        // Wobble-Rotation
        if (this.wobbleAmount !== 0) {
            ctx.rotate(this.wobbleAmount * Math.PI / 180);
        }
        
        const eggWidth = 16 * this.scale;
        const eggHeight = 20 * this.scale;
        
        // Ei-Form (Oval)
        ctx.beginPath();
        ctx.ellipse(0, 0, eggWidth/2, eggHeight/2, 0, 0, 2 * Math.PI);
        
        // Grundfarbe (cremeweiß)
        ctx.fillStyle = '#F5E6D3';
        ctx.fill();
        
        // Schatten/3D-Effekt
        ctx.beginPath();
        ctx.ellipse(2 * this.scale, 2 * this.scale, eggWidth/2, eggHeight/2, 0, 0, Math.PI);
        ctx.fillStyle = 'rgba(139, 90, 43, 0.2)';
        ctx.fill();
        
        // Glanzlicht
        ctx.beginPath();
        ctx.ellipse(-3 * this.scale, -5 * this.scale, eggWidth/4, eggHeight/4, -Math.PI/4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        
        // Sprenkel/Muster basierend auf Dino-Art
        ctx.fillStyle = this.isEnemy ? 'rgba(139, 0, 0, 0.3)' : 'rgba(139, 69, 19, 0.3)';
        for (let i = 0; i < 8; i++) {
            const speckleX = (Math.sin(i * 1.7) * eggWidth * 0.3);
            const speckleY = (Math.cos(i * 2.3) * eggHeight * 0.3);
            const speckleSize = 1.5 * this.scale + Math.sin(i * 3.1) * 0.5 * this.scale;
            
            ctx.beginPath();
            ctx.arc(speckleX, speckleY, speckleSize, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Risse zeichnen (wenn vorhanden)
        if (this.crackLevel > 0) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1 * this.scale;
            
            // Riss 1
            if (this.crackLevel >= 1) {
                ctx.beginPath();
                ctx.moveTo(-eggWidth/4, -eggHeight/4);
                ctx.lineTo(-eggWidth/6, 0);
                ctx.lineTo(-eggWidth/4, eggHeight/6);
                ctx.stroke();
            }
            
            // Riss 2
            if (this.crackLevel >= 2) {
                ctx.beginPath();
                ctx.moveTo(eggWidth/6, -eggHeight/3);
                ctx.lineTo(eggWidth/4, -eggHeight/6);
                ctx.lineTo(eggWidth/5, eggHeight/8);
                ctx.stroke();
            }
            
            // Riss 3 (kurz vor dem Schlüpfen)
            if (this.crackLevel >= 3) {
                ctx.beginPath();
                ctx.moveTo(0, -eggHeight/3);
                ctx.lineTo(-eggWidth/8, -eggHeight/5);
                ctx.lineTo(0, 0);
                ctx.lineTo(eggWidth/8, eggHeight/6);
                ctx.stroke();
                
                // Kleines Loch oben
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(0, -eggHeight/3, 2 * this.scale, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        ctx.restore();
        
        // Debug-Info (wenn aktiviert)
        if (debugMode) {
            ctx.save();
            ctx.fillStyle = '#FFFF00';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            
            const timeRemaining = Math.max(0, (this.incubationTime - (Date.now() - this.layTime)) / 1000);
            ctx.fillText(`${timeRemaining.toFixed(1)}s`, pixelX, pixelY + eggHeight/2 + 15);
            
            ctx.restore();
        }
    }
}


function createEgg(dino) {
    const egg = new Egg(
        dino.tileX,
        dino.tileY,
        dino.species,
        dino.isEnemy
    );
    
    gameObjects.push(egg);
    console.log(`🥚 Ei gelegt bei (${egg.tileX.toFixed(2)}, ${egg.tileY.toFixed(2)}) von ${dino.species.name}`);
}


// Update für Eierschalen-Partikel (füge dies zur updateCombatSystem() Funktion hinzu)
function updateEggshellParticles() {
    eggshellParticles = eggshellParticles.filter(particle => {
        particle.x += particle.vx * gameSpeed / 60;
        particle.y += particle.vy * gameSpeed / 60;
        particle.vy += 150 * gameSpeed / 60; // Schwerkraft
        particle.rotation += particle.rotationSpeed * gameSpeed / 60;
        particle.life -= gameSpeed / 60 / particle.maxLife;
        
        return particle.life > 0;
    });
}

// Render für Eierschalen-Partikel (füge dies zur renderCombatEffects() Funktion hinzu)
function renderEggshellParticles() {
    eggshellParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Eierschalen-Fragment (weißlich)
        ctx.fillStyle = '#F5E6D3';
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size/2);
        
        // Innenseite (etwas dunkler)
        ctx.fillStyle = '#E5D6C3';
        ctx.fillRect(-particle.size/2, 0, particle.size, particle.size/2);
        
        ctx.restore();
    });
}

// ===================================
// DINO-KLASSE (unverändert)
// ===================================

class Dino {
    constructor(tileX, tileY, species, isAdult, isEnemy = false) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.species = species;
        this.isAdult = isAdult;
        this.isEnemy = isEnemy;
        this.health = isAdult ? 100 : 60;
        this.energy = 100;
        
        this.baseScale = isAdult ? 0.2496 : 0.14976;
        this.scale = this.baseScale;
        this.speed = (species.properties.hinterbeine_länge || 50) / 2667;
        this.targetTileX = tileX;
        this.targetTileY = tileY;
        this.selected = false;
        this.dinoType = dinoRenderer.getDinoType(species.properties);
        this.color = dinoRenderer.getDinoColor(species.properties, isEnemy);
        this.facingRight = !isEnemy;
        this.hasMovedSideways = false;  // Für Umweg-Pfadfindung
        this.preferredSide = null;      // Welche Seite für Umweg
        this.spiralDirection = null;
        this.lastTileX = tileX;

        this.baseSpeed = this.speed; // Normalisiert auf 0-1
        this.currentSpeedMultiplier = 1.0

        this.avoidanceMode = {
            active: false,
            blockedPosition: null,       // {x, y} wo blockiert wurde
            originalDirection: null,     // {x, y} normalisierter Richtungsvektor
            currentStep: 1,              // Aktueller Schritt (1-4)
            attemptCount: 0,             // Wie oft wurde bei Schritt 1 neu gestartet
            useRightSide: Math.random() < 0.5,          // true = rechts umgehen, false = links
            stepStartTime: 0,            // Für Timing der Schritte
            stepDuration: 0,             // Aktuelle Schrittdauer
            currentStepTarget: null,     // Zielposition für aktuellen Schritt
            originalBehaviorState: null, // Ursprünglicher Zustand speichern
            originalTarget: null         // Ursprüngliches Ziel {x, y}
        };

                // VEREINFACHTES STATE-SYSTEM
        this.state = DINO_STATES.IDLE; // Aktueller Zustand
        this.stateData = {
            target: null,           // Ziel (Dino, Nahrung, Position)
            startTime: Date.now(),  // Wann State begonnen hat
            previousState: null,    // Vorheriger State
            customData: {}          // State-spezifische Daten
        };
        
        // Timer für State-Dauer
        this.stateTimer = 0;
        this.stateDuration = 0;
        
        // Cooldowns
        this.cooldowns = {
            combat: 0,
            food: 0,
            general: 0
        };
        
        // Animation wird vom State abgeleitet
        this.animationPhase = this.getAnimationForState();

                // Cross-Movement System
        this.initializeCrossMovement();
        
        this.initializeMovementBehavior();
        this.isMovingForward = true;
        this.animationPhase = 'idle';
        this.phaseStartTime = Date.now();

        this.health = isAdult ? 100 : 60;
        this.energy = 100;

        // PROPERTIES FÜR FORTPFLANZUNG
        this.isPregnant = false;
        this.pregnancyStartTime = null;
        this.nextPregnancyCheck = 0; // Individueller Timer
        this.pregnancyCheckInterval = 0; // Individuelles Intervall
        this.reproductionValue = 0;
        this.nestingTarget = null;      // Ziel-Brutstätte
        this.eggLayingStartTime = null;
    }

    getMovementSpeed() {
        let multiplier = 1.0;
        
        // Geschwindigkeits-Multiplikator basierend auf aktuellem Zustand
        if (this.state === DINO_STATES.SEEKING_ENEMY) {
            multiplier = 1.3; // 30% schneller bei Verfolgung/Nahrungssuche
        }
        
        return this.baseSpeed * multiplier * gameSpeed;
    }

    updateAvoidanceMode() {
        if (!this.avoidanceMode.active) return;
        
        // Prüfe Erfolg
        if (this.checkAvoidanceSuccess()) {
            this.exitAvoidanceMode('success');
            return;
        }
        
        const currentTime = Date.now();
        const elapsed = (currentTime - this.avoidanceMode.stepStartTime) / 1000;
        
        // Bewegungs-/Pausen-Timing wie normale Bewegung
        const isMoving = this.avoidanceMode.currentStep % 2 === 1; // Ungerade = Bewegung
        const duration = isMoving ? 
            this.getRandomMoveDuration() : 
            this.getRandomRestDuration() * 0.5; // Kürzere Pausen
        
        if (elapsed >= duration) {
            // Nächster Schritt
            this.nextAvoidanceStep();
        } else if (isMoving) {
            // Bewegung ausführen
            this.executeAvoidanceMovement();
        }
    }

    // Berechnet nächsten Schritt
    nextAvoidanceStep() {
        this.avoidanceMode.currentStep++;
      //  if(debugMode && this.selected) console.log(`🔄 Umgehung Schritt ${this.avoidanceMode.currentStep}`);
        if (this.avoidanceMode.currentStep > 8) { // 4 Bewegungen + 4 Pausen
            if(debugMode && this.selected) console.log(`✅ Umgehung erfolgreich abgeschlossen`);
            // Zyklus abgeschlossen, von vorne beginnen
            this.avoidanceMode.currentStep = 1;
            this.avoidanceMode.attemptCount++;
            
            // Nach 5 Versuchen Seite wechseln
            if (this.avoidanceMode.attemptCount >= 12) {
                this.avoidanceMode.useRightSide = !this.avoidanceMode.useRightSide;
                this.avoidanceMode.attemptCount = 0;
                // console.log(`🔄 ${this.species.name} wechselt Umgehungsseite`);
            }
        }
        
        this.avoidanceMode.stepStartTime = Date.now();
        
        // Berechne Ziel für Bewegungsschritte
        if (this.avoidanceMode.currentStep % 2 === 1) {
            this.calculateAvoidanceTarget();
        }
    }

    // Berechnet Zielposition für aktuellen Schritt
    calculateAvoidanceTarget() {
        const stepNumber = Math.ceil(this.avoidanceMode.currentStep / 2); // 1, 2, 3, oder 4
        const moveDistance = this.minMoveDistance + Math.random() * (this.maxMoveDistance - this.minMoveDistance);
        
        let targetAngle;
        const randomVariation = (Math.random() - 0.5) * 0.3; // ±15° in Radiant
        
        switch(stepNumber) {
            case 1: // Zurück (~180° von Original-Richtung)
                targetAngle = Math.atan2(
                    -this.avoidanceMode.originalDirection.y,
                    -this.avoidanceMode.originalDirection.x
                ) + randomVariation;
                break;
                
            case 2: // Seitlich (90° vom Rückwärts)
                const backAngle = Math.atan2(
                    -this.avoidanceMode.originalDirection.y,
                    -this.avoidanceMode.originalDirection.x
                );
                const sideOffset = this.avoidanceMode.useRightSide ? -Math.PI/2 : Math.PI/2;
                targetAngle = backAngle + sideOffset + randomVariation;
                break;
                
            case 3: // Vorwärts (Original-Richtung)
            case 4: // Nochmal vorwärts
                targetAngle = Math.atan2(
                    this.avoidanceMode.originalDirection.y,
                    this.avoidanceMode.originalDirection.x
                ) + randomVariation;
                break;
        }
        
        this.avoidanceMode.currentStepTarget = {
            x: this.tileX + Math.cos(targetAngle) * moveDistance,
            y: this.tileY + Math.sin(targetAngle) * moveDistance
        };
    }

    // Führt Bewegung aus
    executeAvoidanceMovement() {
        if (!this.avoidanceMode.currentStepTarget) return;
        
        const dx = this.avoidanceMode.currentStepTarget.x - this.tileX;
        const dy = this.avoidanceMode.currentStepTarget.y - this.tileY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            const moveSpeed = this.getMovementSpeed();
            const moveX = (dx / distance) * moveSpeed;
            const moveY = (dy / distance) * moveSpeed;
            
            const newX = this.tileX + moveX;
            const newY = this.tileY + moveY;
            
            // Prüfe ob neue Position blockiert ist
            const pathCheck = this.checkPathBlocked(this, this.tileX, this.tileY, newX, newY);
            
            if (pathCheck.blocked) {
                // Neues Hindernis! Von hier neu starten
                //console.log(`🚫 ${this.species.name} trifft auf neues Hindernis während Umgehung`);
                this.avoidanceMode.blockedPosition = pathCheck.position;
                this.avoidanceMode.currentStep = 1;
                this.avoidanceMode.attemptCount++;
                if (this.avoidanceMode.attemptCount >= 12) {
                    this.avoidanceMode.useRightSide = !this.avoidanceMode.useRightSide;
                    this.avoidanceMode.attemptCount = 0;
                    // console.log(`🔄 ${this.species.name} wechselt Umgehungsseite`);
                }
                this.calculateAvoidanceTarget();
            } else {
                // Bewegung ausführen
                this.tileX = Math.max(1, Math.min(mapWidth - 1, newX));
                this.tileY = Math.max(5, Math.min(mapHeight - 1, newY));
                
                // Blickrichtung anpassen
                if (Math.abs(dx) > 0.1) {
                    this.facingRight = dx < 0;
                }
            }
        }
    }

    // Prüft ob ein Pfad blockiert ist
    checkPathBlocked(checkDino, fromX, fromY, toX, toY, stepSize = 0.1) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / stepSize);
        
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const checkX = fromX + dx * progress;
            const checkY = fromY + dy * progress;
            // console.log("dieser dino? checkPathBlocked ", checkDino);
            if (!isPositionValidFor(checkDino, checkX, checkY, 'movement')) {
                // Blockierung gefunden, gebe Position zurück
                return {
                    blocked: true,
                    position: { x: checkX, y: checkY }
                };
            }
        }
        
        return { blocked: false };
    }

    // Berechnet Fortschritt hinter der Blockierungslinie
    getProgressBeyondLine(currentPos, lineOrigin, lineDirection) {
        const toPoint = {
            x: currentPos.x - lineOrigin.x,
            y: currentPos.y - lineOrigin.y
        };
        
        // Skalarprodukt für Projektion auf Richtungsvektor
        return toPoint.x * lineDirection.x + toPoint.y * lineDirection.y;
    }

    // Prüft ob Umgehung erfolgreich war
    checkAvoidanceSuccess() {
        if (!this.avoidanceMode.active) return false;
        
        const progress = this.getProgressBeyondLine(
            { x: this.tileX, y: this.tileY },
            this.avoidanceMode.blockedPosition,
            this.avoidanceMode.originalDirection
        );
                    
        return progress >= 2;
    }

    // Aktiviert den Umgehungs-Modus
    activateAvoidanceMode(targetX, targetY, blockedAt) {
        // NEU: Prüfe ob Hindernis wirklich im Weg liegt
        if (!this.isObstacleInMovementPath(targetX, targetY, blockedAt)) {
            // Hindernis liegt nicht in Bewegungsrichtung - ignorieren
            
            // Einfach Ziel anpassen und weitermachen
            this.chooseNewMovementTarget();
            return;
        }
        
        // Speichere aktuellen Zustand
        this.avoidanceMode.originalBehaviorState = this.state;
        this.avoidanceMode.originalTarget = { x: targetX, y: targetY };
        
        // Berechne Richtung
        const dx = targetX - this.tileX;
        const dy = targetY - this.tileY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        this.avoidanceMode.active = true;
        this.changeState(DINO_STATES.AVOIDING);
        this.avoidanceMode.blockedPosition = blockedAt;
        this.avoidanceMode.originalDirection = {
            x: dx / length,
            y: dy / length
        };
        this.avoidanceMode.currentStep = 1;
        this.avoidanceMode.attemptCount = 0;
        this.avoidanceMode.useRightSide = Math.random() < 0.5;
        this.avoidanceMode.stepStartTime = Date.now();
        
        // Setze Verhalten auf speziellen Modus
        this.changeState(DINO_STATES.AVOIDING);
        
    }
    
    isObstacleInMovementPath(targetX, targetY, obstaclePos) {
        // EINFACHE LOGIK: Prüfe nur X-Koordinate basierend auf Cross-Movement Ziel
        
        if (!this.currentGoal) {
            // Kein Cross-Movement Ziel definiert - immer umgehen
            return true;
        }
        
        const dinoX = this.tileX;
        const obstacleX = obstaclePos.x;
        
        let isInPath = false;
        
        if (this.currentGoal === 'right') {
            // Dino wandert nach rechts → nur Hindernisse rechts vom Dino sind "im Weg"
            isInPath = obstacleX > dinoX;
        } else if (this.currentGoal === 'left') {
            // Dino wandert nach links → nur Hindernisse links vom Dino sind "im Weg"  
            isInPath = obstacleX < dinoX;
        }
        
        return isInPath;
    }


    // Beendet den Umgehungs-Modus
    exitAvoidanceMode(reason = 'success') {
        this.avoidanceMode.active = false;
        this.state === DINO_STATES.IDLE;
        
        // Stelle ursprünglichen Zustand wieder her
        if (this.avoidanceMode.originalBehaviorState) {
            this.state = this.avoidanceMode.originalBehaviorState;
        }
        
        // console.log(`✅ ${this.species.name} beendet Umgehungs-Modus: ${reason}`);
    }

    getCollisionBox(checkTileX, checkTileY) {
        // Kollisionsbox basierend auf Dino-Größe
        const boxWidth = (this.species.properties.körper_länge || 50) * this.scale * 0.8;
        const boxHeight = (this.species.properties.körper_höhe || 50) * this.scale * 0.6;
        
        // Box sollte beim Körper/Beinen sein, nicht beim Kopf
        // Verschiebung nach unten um etwa 25% der Körperhöhe
        const verticalOffset = boxHeight * 0.5 ;

        let pixel = PositionUtils.tileToPixel(checkTileX, checkTileY, tileSize, terrainOffsetX, terrainOffsetY)
        
        return {
            left: pixel.x - boxWidth / 2,
            right: pixel.x + boxWidth / 2,
            top: pixel.y + boxHeight / 2 + verticalOffset,
            bottom: pixel.y - boxHeight / 2 + verticalOffset
        };
    }

    renderDebugInfo(pixelX, pixelY) {
        ctx.save();
        
        // Kollisionsbox visualisieren
        const box = this.getCollisionBox(this.tileX, this.tileY);
       // if(this.selected){
            //console.log('Kollisionsbox-Check 1:', box);
      //  }
        ctx.strokeStyle = this.canSwim() ? '#00FFFF' : '#FF00FF'; // Cyan für Schwimmer, Magenta für Nicht-Schwimmer
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            box.left,
            box.top,
            box.right - box.left,
            box.bottom - box.top
        );
        
        // Mittelpunkt markieren
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Schwimm-Status anzeigen
        if (this.canSwim()) {
            ctx.fillStyle = '#00FFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🏊', pixelX, pixelY - 40 * this.scale);
        }
        
        ctx.restore();
        if(debugMode && this.selected) {
            ctx.save(); 
            ctx.fillStyle = '#FFFF00';
            ctx.font = '12px Arial';

            if (this.avoidanceMode.active) {
                                        
                // Blockierungslinie visualisieren

                const blockPixel = PositionUtils.tileToPixel(this.avoidanceMode.blockedPosition.x, this.avoidanceMode.blockedPosition.y, tileSize, terrainOffsetX, terrainOffsetY);
                const blockX = blockPixel.x;
                const blockY = blockPixel.y;                       
                // Linie perpendikular zur Original-Richtung
                const perpX = -this.avoidanceMode.originalDirection.y * 50;
                const perpY = this.avoidanceMode.originalDirection.x * 50;
                
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(blockX - perpX, blockY - perpY);
                ctx.lineTo(blockX + perpX, blockY + perpY);
                ctx.stroke();
                
                // Fortschritts-Info
                const progress = this.getProgressBeyondLine(
                    {x: this.tileX, y: this.tileY},
                    this.avoidanceMode.blockedPosition,
                    this.avoidanceMode.originalDirection
                );
                

                ctx.fillText(`Step: ${this.avoidanceMode.currentStep} | Round: ${this.avoidanceMode.attemptCount} | Progress: ${progress.toFixed(1)}`, pixelX, pixelY + 60);

                // NEU: Kachel-Typ anzeigen
                const currentTileType = getTileTypeAtPosition(Math.floor(this.tileX), Math.floor(this.tileY));
                const tileTypeName = currentTileType === TILE_TYPES.GRASS ? 'GRASS' : 
                                currentTileType === TILE_TYPES.DIRT ? 'DIRT' : 
                                currentTileType === TILE_TYPES.WATER ? 'WATER' : 'UNKNOWN';        
                ctx.fillText(`Tile: ${tileTypeName} (${Math.floor(this.tileX)}, ${Math.floor(this.tileY)})`, pixelX, pixelY + 75);         
                                        
            }
                                                        
            ctx.fillText(`Geschwindgkeit: ${this.getMovementSpeed()}) | state: ${this.state}`, pixelX, pixelY + 90);                       
            ctx.restore();
        }
    }

    canSwim() {
        // Prüft ob der Dino schwimmen kann
        return this.abilities && this.abilities['Schwimmen'] && this.abilities['Schwimmen'] > 0;
    }

    initializeCrossMovement() {
        // Spawn-Bereiche definieren
        this.spawnSide = this.isEnemy ? 'right' : 'left';
        
        // Ziel-Bereiche definieren (die "letzten vier Kacheln" jeder Seite)
        this.targetZones = {
            left: { min: 0, max: 4 },                      // Linke Seite: Kacheln 0-4
            right: { min: mapWidth - 5, max: mapWidth - 1 }  // Rechte Seite: letzte 5 Kacheln
        };       
        
        // Home-Bereiche (ursprüngliche Spawn-Bereiche)
        this.homeZones = {
            left: { min: mapWidth * 0.05, max: mapWidth * 0.45 },
            right: { min: mapWidth * 0.55, max: mapWidth * 0.95 }
        };
        
        // Initial alle Dinos wollen zur anderen Seite
        this.currentGoal = this.spawnSide === 'left' ? 'right' : 'left';
        
        // Wahrscheinlichkeits-Modifikatoren
        this.crossMovementTendency = 0.7; // 70% Wahrscheinlichkeit in Richtung Ziel
        this.randomMovementChance = 0.3;   // 30% für zufällige Bewegung
    }

    checkGoalReached() {
        const currentZone = this.targetZones[this.currentGoal];
        
        if (this.tileX >= currentZone.min && this.tileX <= currentZone.max) {
            // Ziel erreicht! Wechsle zum anderen Ziel
            this.currentGoal = this.currentGoal === 'left' ? 'right' : 'left';
            
            // console.log(`🎯 Dino ${this.species.name}: Ziel erreicht! Neues Ziel -> ${this.currentGoal}`);
            
            // Kurze Pause nach Ziel-Erreichung
            this.changeState(DINO_STATES.IDLE);
            this.currentBehaviorDuration = this.getRandomRestDuration() * 1.5; // Etwas länger ausruhen
            this.behaviorTimer = 0;
            this.animationPhase = 'idle';
            this.phaseStartTime = Date.now();
            
            return true;
        }
        
        return false;
    }

    chooseNewMovementTarget() {
        this.checkGoalReached();
        
        // FIX: Dynamische Bewegungsgrenzen basierend auf aktuellem Ziel
        let baseMinTileX, baseMaxTileX;
        
        if (this.currentGoal === 'left') {
            // Wenn Ziel links ist, erweitere linke Grenze um die Ziel-Zone zu erreichen
            baseMinTileX = 0.5; // Bis fast zur linken Kante (Kachel 0)
            baseMaxTileX = mapWidth * 0.95; // Normale rechte Grenze
        } else if (this.currentGoal === 'right') {
            // Wenn Ziel rechts ist, erweitere rechte Grenze um die Ziel-Zone zu erreichen
            baseMinTileX = mapWidth * 0.05; // Normale linke Grenze
            baseMaxTileX = mapWidth - 0.5; // Bis fast zur rechten Kante
        } else {
            // Fallback: normale Grenzen
            baseMinTileX = mapWidth * 0.05;
            baseMaxTileX = mapWidth * 0.95;
        }
        
        // Ziel-Zone bestimmen
        const targetZone = this.targetZones[this.currentGoal];
        const targetCenterX = (targetZone.min + targetZone.max) / 2;
        
        // Richtung zum Ziel berechnen
        const directionToTarget = targetCenterX > this.tileX ? 1 : -1;
        
        // Entscheidung: Cross-Movement oder Random Movement
        const useCrossMovement = Math.random() < this.crossMovementTendency;
        
        let moveDistance, angle;
        
        if (useCrossMovement) {
            // Cross-Movement: Tendenz zum Ziel
            moveDistance = this.minMoveDistance + Math.random() * (this.maxMoveDistance - this.minMoveDistance);
            
            // Hauptrichtung zum Ziel mit etwas Streuung
            const baseAngle = directionToTarget > 0 ? 0 : Math.PI; // 0° = rechts, 180° = links
            const angleVariation = (Math.random() - 0.5) * Math.PI * 0.6; // ±54° Streuung
            angle = baseAngle + angleVariation;
            
        } else {
            // Random Movement: Normale zufällige Bewegung
            const shouldChangeDirection = Math.random() < 0.3;
            if (shouldChangeDirection) {
                this.isMovingForward = !this.isMovingForward;
            }
            
            let preferredDirectionX = this.isMovingForward ? (this.facingRight ? 1 : -1) : (this.facingRight ? -1 : 1);
            preferredDirectionX += this.personality.direction_preference * 0.5;
            
            const styleInfluence = (this.personality.movement_style + 1) / 2;
            moveDistance = this.minMoveDistance + styleInfluence * (this.maxMoveDistance - this.minMoveDistance);
            const distanceVariance = moveDistance * (0.7 + Math.random() * 0.6);
            
            angle = Math.random() < 0.7 ? 
                (Math.random() - 0.5) * Math.PI * 0.8 + (preferredDirectionX < 0 ? Math.PI : 0) :
                Math.random() * 2 * Math.PI;
            
            moveDistance = distanceVariance;
        }
        
        // Neue Position berechnen
        this.targetTileX = this.tileX + Math.cos(angle) * moveDistance;
        this.targetTileY = this.tileY + Math.sin(angle) * moveDistance;
        
        // Grenzen einhalten
        const bounded = PositionUtils.clampPosition(
            this.targetTileX, this.targetTileY,
            baseMinTileX, baseMaxTileX,
            1, mapHeight - 2  // ← GEÄNDERT: von 5 auf 1
        );
        this.targetTileX = bounded.x;
        this.targetTileY = bounded.y;
    }

    // REST DER KLASSE BLEIBT UNVERÄNDERT...
    updateScale() {
        const scaleFactor = tileSize / baseTileSize;
        this.scale = this.baseScale * scaleFactor;
    }

    initializeMovementBehavior() {
        const personalitySeed = this.tileX * 127 + this.tileY * 313 + (this.isEnemy ? 1000 : 0);
        
        this.personality = {
            restfulness: 0.3 + (Math.sin(personalitySeed * 0.01) + 1) * 0.35,
            exploration: 0.2 + (Math.sin(personalitySeed * 0.013) + 1) * 0.4,
            direction_preference: Math.sin(personalitySeed * 0.017),
            movement_style: Math.sin(personalitySeed * 0.019)
        };
        
        this.restDurationMin = 0.8 + this.personality.restfulness * 1.2;
        this.restDurationMax = 1.5 + this.personality.restfulness * 2.5;
        this.moveDurationMin = 0.6 + (1 - this.personality.restfulness) * 1.0;
        this.moveDurationMax = 1.2 + (1 - this.personality.restfulness) * 2.0;
        this.minMoveDistance = 1.5 + this.personality.exploration * 1.5;
        this.maxMoveDistance = 3.0 + this.personality.exploration * 5.0;
        
        const startMoving = Math.random() < (1 - this.personality.restfulness * 0.7);
        
        this.changeState(startMoving ? DINO_STATES.WANDERING : DINO_STATES.IDLE);
        this.behaviorTimer = Math.random() * 2;
        
        if (this.state === DINO_STATES.IDLE) {
            this.currentBehaviorDuration = this.getRandomRestDuration();
            this.animationPhase = 'idle';
            this.targetTileX = this.tileX;
            this.targetTileY = this.tileY;
        } else {
            this.currentBehaviorDuration = this.getRandomMoveDuration();
            this.animationPhase = 'walking';
            this.chooseNewMovementTarget();
        }
    }

    getRandomRestDuration() {
        const baseVariation = 0.8 + Math.random() * 0.4;
        return (this.restDurationMin + Math.random() * (this.restDurationMax - this.restDurationMin)) * baseVariation;
    }
    
    getRandomMoveDuration() {
        const baseVariation = 0.8 + Math.random() * 0.4;
        return (this.moveDurationMin + Math.random() * (this.moveDurationMax - this.moveDurationMin)) * baseVariation;
    }
   
    updateFacingDirection(moveTileX, moveTileY) {
        if (this.feedingRotationLocked) {
            return;
        }
        
        if (moveTileX > 0.001) {
            this.facingRight = false;
        } else if (moveTileX < -0.001) {
            this.facingRight = true;
        }
    }

    syncAnimation() {
        const expectedAnimation = this.getAnimationForState();
        if (this.animationPhase !== expectedAnimation) {
            this.animationPhase = expectedAnimation;
            this.phaseStartTime = Date.now();
        }
    }

    isClickedBy(mouseX, mouseY) {
        /*
        const pixelX = this.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = this.tileY * tileSize + tileSize / 2 + terrainOffsetY;       
        */
        const pixel = PositionUtils.tileToPixel(this.tileX, this.tileY, tileSize, terrainOffsetX, terrainOffsetY);
        const pixelX = pixel.x;
        const pixelY = pixel.y;
        const distance = Math.sqrt((mouseX - pixelX)**2 + (mouseY - pixelY)**2);
        return distance < Math.max(14.4, 19.2 * this.scale);
    }

    render() {
        let pixel = PositionUtils.tileToPixel(this.tileX , this.tileY, tileSize, terrainOffsetX, terrainOffsetY);

        if (this.isAttacking || this.isConsuming) {
            const elapsed = this.isAttacking ? 
                (Date.now() - this.attackAnimationStart) : 
                (Date.now() - this.consumptionDashStart);
            const progress = elapsed / 300;
            
            if (progress < 0.5) {
                const dashDistance = 15 * this.scale * (progress * 2);
                pixel.x += this.facingRight ? -dashDistance : dashDistance;
            } else if (progress < 1.0) {
                const returnProgress = (progress - 0.5) * 2;
                const dashDistance = 15 * this.scale * (1 - returnProgress);
                pixel.x += this.facingRight ? -dashDistance : dashDistance;
            }
        }
        
        const currentTime = Date.now();
        const phaseDuration = (currentTime - this.phaseStartTime) / 1000;
        
        if (phaseDuration >= 4) {
            this.animationPhase = this.getAnimationForState();
            this.phaseStartTime = currentTime;
        }
        
        const animationTime = currentTime / 1000;
        const walkSpeed = 4;
        
        let animationData = {
            bodyAnimationY: 0,
            headAnimationX: 0,
            headAnimationY: 0,
            tailAnimationY: 0,
            frontLegAnimationX: 0,
            backLegAnimationX: 0
        };
        
        if (this.state === DINO_STATES.FIGHTING) {
            // Kampf-Idle: Nur leichte Atmung
            animationData.bodyAnimationY = Math.sin(animationTime * 2) * 1; // Weniger Bewegung
            animationData.headAnimationX = Math.sin(animationTime * 0.5) * 2; // Langsamere Kopfbewegung
            animationData.tailAnimationY = Math.sin(animationTime * 1) * 2; // Weniger Schwanzwedeln
        } else if (this.animationPhase === 'idle') {
            animationData.bodyAnimationY = Math.sin(animationTime * 2) * 2;
            animationData.headAnimationX = Math.sin(animationTime * 0.8) * 3;
            animationData.headAnimationY = Math.sin(animationTime * 1.2) * 1.5;
            animationData.tailAnimationY = Math.sin(animationTime * 1.5) * 4;
        } else {
            animationData.frontLegAnimationX = Math.sin(animationTime * walkSpeed) * 6;
            animationData.backLegAnimationX = Math.sin(animationTime * walkSpeed + Math.PI) * 6;
            animationData.bodyAnimationY = Math.sin(animationTime * walkSpeed * 2) * 1;
            animationData.tailAnimationY = Math.sin(animationTime * walkSpeed * 0.75) * 4;
        }
        
        dinoRenderer.renderDino(ctx, pixel.x, pixel.y, this.species.properties, this.dinoType, this.scale, this.isEnemy, animationData, this.facingRight);
        
        if (this.selected) {
            ctx.strokeStyle = '#32cd32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, 14.4 * this.scale, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        if (this.health < 100) {
            const barWidth = 19.2 * this.scale;
            const barHeight = 3;
            const barX = pixel.x - barWidth/2;
            const barY = pixel.y - 19.2 * this.scale;
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, barWidth * (this.health/100), barHeight);
        }
        renderCombatUI(this);

        if (debugMode) {
            this.renderDebugInfo(pixel.x, pixel.y);
        }

    }

    changeState(newState, targetData = null) {       
        // State-Exit-Logik
        this.onStateExit(this.state);
        
        // State wechseln
        this.stateData.previousState = this.state;
        this.state = newState;
        this.stateData.startTime = Date.now();
        this.stateTimer = 0;
        
        // Target setzen
        if (targetData) {
            this.stateData.target = targetData;
        } else {
            this.stateData.target = null;
        }
        
        // State-Enter-Logik
        this.onStateEnter(newState);
        
        // Animation anpassen
        this.animationPhase = this.getAnimationForState();
                
        return true;
    }

    // State-Exit Logik
    onStateExit(state) {
        switch (state) {
            case DINO_STATES.CONSUMING:
                // Nahrungsquelle freigeben
                if (this.stateData.target && this.stateData.target.sourceId) {
                    occupiedFoodSources.delete(this.stateData.target.sourceId);
                }
                this.feedingRotationLocked = false;
                break;
                
            case DINO_STATES.FIGHTING:
                // Kampf beenden
                this.isAttacking = false;
                break;
                
            case DINO_STATES.AVOIDING:
                // Avoidance-Daten zurücksetzen
                this.avoidanceMode.active = false;
                break;
        }
    }
    
    // State-Enter Logik
    onStateEnter(state) {
        switch (state) {
            case DINO_STATES.IDLE:
                this.stateDuration = this.getRandomRestDuration();
                this.targetTileX = this.tileX;
                this.targetTileY = this.tileY;
                break;
                
            case DINO_STATES.WANDERING:
                this.stateDuration = this.getRandomMoveDuration();
                this.chooseNewMovementTarget();
                break;
                
            case DINO_STATES.SEEKING_ENEMY:
                // Target sollte bereits gesetzt sein
                break;
                
            case DINO_STATES.FIGHTING:
                // Beide Dinos fixieren
                this.targetTileX = this.tileX;
                this.targetTileY = this.tileY;
                break;
                
            case DINO_STATES.SEEKING_FOOD:
                // Target sollte bereits gesetzt sein
                break;
                
            case DINO_STATES.CONSUMING:
                this.consumptionStartTime = Date.now();
                this.targetTileX = this.tileX;
                this.targetTileY = this.tileY;
                this.feedingRotationLocked = true;
                break;
                
            case DINO_STATES.AVOIDING:
                this.avoidanceMode.active = true;
                this.state = DINO_STATES.AVOIDING;
                this.avoidanceMode.stepStartTime = Date.now();
                break;
                
            case DINO_STATES.DEAD:
                this.health = 0;
                this.currentHP = 0;
                break;
        }
    }
    
    // Animation basierend auf State
    getAnimationForState() {
        switch (this.state) {
            case DINO_STATES.IDLE:
            case DINO_STATES.FIGHTING:
            case DINO_STATES.CONSUMING:
            case DINO_STATES.LAYING_EGG: 
                return 'idle';
                
            case DINO_STATES.WANDERING:
            case DINO_STATES.SEEKING_ENEMY:
            case DINO_STATES.SEEKING_FOOD:
            case DINO_STATES.AVOIDING:
            case DINO_STATES.FLEEING:
            case DINO_STATES.SEEKING_HOTBED:
                return 'walking';
                
            case DINO_STATES.DEAD:
                return 'dead';
                
            default:
                return 'idle';
        }
    }
    
    // State-spezifische Update-Logik
    handleState() {

        switch (this.state) {
            case DINO_STATES.IDLE:
                if (this.stateTimer >= this.stateDuration) {
                    this.changeState(DINO_STATES.WANDERING);
                }
                break;
                
            case DINO_STATES.WANDERING:
                this.handleMovement();
                if (this.stateTimer >= this.stateDuration) {
                    this.changeState(DINO_STATES.IDLE);
                }
                break;
                               
            case DINO_STATES.AVOIDING:
                this.updateAvoidanceMode();
                this.syncAnimation();
                break;
        }

        if (this.state === DINO_STATES.FIGHTING && this.avoidanceMode.active) {
            this.exitAvoidanceMode('interrupted by combat');
        }

        this.currentStamina = Math.min(this.maxStamina, this.currentStamina + COMBAT_CONFIG.STAMINA_RECOVERY * gameSpeed / 60);
    
        // Stamina-Verbrauch bei Bewegung (nur wenn NICHT kämpfend)
        if (this.state === DINO_STATES.WANDERING && this.state !== DINO_STATES.FIGHTING) {
            this.currentStamina = Math.max(0, this.currentStamina - COMBAT_CONFIG.MOVEMENT_STAMINA_COST * gameSpeed / 60);
            this.wasMovingLastFrame = true;
        } else {
            this.wasMovingLastFrame = false;
        }
        
        switch (this.state) {
            case DINO_STATES.IDLE:
                this.updateNeutralState();
                break;
            case DINO_STATES.SEEKING_ENEMY:
                updateSeekingState(this);
                break;
            case DINO_STATES.FIGHTING:
                updateFightingState(this);
                // WICHTIG: Keine weitere Bewegung im fighting-State!
                break;
        }
        
        // Angriffs-Animation
        if (this.isAttacking) {
            const attackDuration = 0.3;
            if (Date.now() - this.attackAnimationStart > attackDuration * 1000) {
                this.isAttacking = false;
            }
        }
        
        const currentTime = Date.now();
        
        // Cooldown-Checks
        const inPostCombatCooldown = currentTime < this.postCombatCooldownUntil;
        const inFoodCooldown = currentTime < this.foodCooldownUntil;
        
        // Nahrungsverhalten nur wenn nicht im Cooldown und nicht kämpfend
        if (!inPostCombatCooldown && !inFoodCooldown && this.state !== DINO_STATES.FIGHTING) {            
            switch (this.state) {
                case DINO_STATES.SEEKING_FOOD:
                    updateFoodSeekingState(this);
                    break;
                case DINO_STATES.CONSUMING:
                    updateFoodConsumingState(this);
                    break;
                case DINO_STATES.SEEKING_HOTBED:
                    this.updateSeekingHotbedState();
                    break;
                case DINO_STATES.LAYING_EGG:
                    this.updateLayingEggState();
                    break;
            }
        }
    }

    updateNeutralState() {
        // Aus neutralem State heraus nach Feinden suchen oder Nahrung
        const enemies = findEnemiesInRange(this);
        if (enemies.length > 0) {
            const availableEnemies = enemies.filter(enemy => {
                const isAlreadyFighting = combats.some(c => c.participants.includes(enemy));
                return !isAlreadyFighting;
            });
            
            if (availableEnemies.length > 0) {
                this.combatTarget = availableEnemies.reduce((nearest, enemy) => 
                    PositionUtils.calculateDistance(this, enemy) < PositionUtils.calculateDistance(this, nearest) ? enemy : nearest
                );
                this.state = DINO_STATES.SEEKING_ENEMY;
            }
        } else {
            // Einfache Nahrungssuche - OHNE Konkurrenz-Checks
            const bestFood = selectBestFoodSource(this);
            
            if (bestFood) {
                const feedingPosition = calculateOptimalFeedingPositions(bestFood, {
                    x: this.tileX,
                    y: this.tileY
                });
                
                this.state = DINO_STATES.SEEKING_FOOD;
                this.foodTarget = bestFood;
                this.feedingPosition = feedingPosition;
                this.seekingStartTime = Date.now();
                this.lastPosition = null;
                
             } else {
                // Keine freie Nahrung gefunden - kurze Pause
                this.foodCooldownUntil = Date.now() + 2000;
            }
        }
    }

    handleMovement() {
        if (this.avoidanceMode.active) {
            this.updateAvoidanceMode();
            return;
        }

        const dx = this.targetTileX - this.tileX;
        const dy = this.targetTileY - this.tileY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.3) {
            const pathCheck = this.checkPathBlocked(
                this,
                this.tileX, 
                this.tileY, 
                this.targetTileX, 
                this.targetTileY
            );
            
            if (pathCheck.blocked) {
                this.activateAvoidanceMode(this.targetTileX, this.targetTileY, pathCheck.position);
                return;
            }

            const moveSpeed = this.getMovementSpeed();
            const moveTileX = (dx / distance) * moveSpeed;
            const moveTileY = (dy / distance) * moveSpeed;
        
            const newTileX = this.tileX + moveTileX;
            const newTileY = this.tileY + moveTileY;
            
            if (isPositionValidFor(this, newTileX, newTileY, 'movement')) {
                this.tileX = newTileX;
                this.tileY = newTileY;
                this.updateFacingDirection(moveTileX, moveTileY);
            } else {
                this.activateAvoidanceMode(this.targetTileX, this.targetTileY, {x: newTileX, y: newTileY});
            }
        } else {
            if (this.behaviorTimer < this.currentBehaviorDuration * 0.8) {
                this.chooseNewMovementTarget();
            } else {
                this.targetTileX = this.tileX;
                this.targetTileY = this.tileY;
            }
        }
    }

    initializeFoodBehavior() {
        this.changeState(DINO_STATES.IDLE);       
        this.foodTarget = null;
        this.consumptionStartTime = 0;
        this.foodCooldownUntil = 0;        // Timestamp bis wann Cooldown aktiv
        this.postCombatCooldownUntil = 0;  // Timestamp für Post-Combat Cooldown
        this.feedingRotationLocked = false; 

        // Nahrungsvorlieben berechnen
        const props = this.species.properties;
        this.foodPreferences = {
            plants: props.pflanzen || 0,
            meat: props.fleisch || 0,
            carrion: props.aas || 0
        };
        
        // Kann verschiedene Nahrungstypen konsumieren?
        this.canConsumePlants = this.foodPreferences.plants >= FOOD_CONFIG.MIN_REQUIREMENTS.PLANTS;
        this.canConsumeMeat = this.foodPreferences.meat >= FOOD_CONFIG.MIN_REQUIREMENTS.MEAT;
        this.canConsumeCarrion = this.foodPreferences.carrion >= FOOD_CONFIG.MIN_REQUIREMENTS.CARRION;
    }

    // Haupt-Update-Funktion
    update() {
        if (isPaused) return;
        if (this.state === DINO_STATES.DEAD) return;
        
        // State-Timer
        const deltaTime = gameSpeed / 60;      
        this.stateTimer += deltaTime;

        if (this.isPregnant && this.state === DINO_STATES.IDLE) {
            const nestingSites = this.findNestingSitesInRange();
            if (nestingSites.length > 0) {
                // Nächste geeignete Stelle auswählen
                this.nestingTarget = nestingSites[0];
                this.changeState(DINO_STATES.SEEKING_HOTBED);
                this.seekingStartTime = Date.now();
                console.log(`🥚 ${this.species.name} sucht Brutstätte`);
                return;
            }
        }
        
        this.handleState();

        // Position-Grenzen
        let minX = 1;
        let maxX = mapWidth - 1;

        // Erweiterte Grenzen wenn Dino sich einem Ziel nähert
        if (this.currentGoal === 'left' && this.tileX < mapWidth * 0.3) {
            minX = 0.5; // Näher zur linken Kante (ermöglicht Kachel 0)
        } else if (this.currentGoal === 'right' && this.tileX > mapWidth * 0.7) {
            maxX = mapWidth - 0.5; // Näher zur rechten Kante
        }

        const clampedPos = PositionUtils.clampPosition(
            this.tileX, this.tileY,
            minX, maxX,
            0.5, mapHeight - 1
        );
        this.tileX = clampedPos.x;
        this.tileY = clampedPos.y;
    
        // Animation synchronisieren
        this.animationPhase = this.getAnimationForState();
    }

    findNestingSitesInRange() {
        const sites = [];
        const checkRadius = Math.ceil(this.detectionRadius);
        
        for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                const checkX = Math.floor(this.tileX + dx);
                const checkY = Math.floor(this.tileY + dy);
                
                // Prüfe ob in Reichweite
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > this.detectionRadius) continue;
                
                // Prüfe ob gültige Position
                if (checkX < 0 || checkX >= mapWidth || checkY < 0 || checkY >= mapHeight) continue;
                
                // Prüfe ob Wiese
                if (tileMap[checkY] && tileMap[checkY][checkX] === TILE_TYPES.GRASS) {
                    sites.push({
                        tileX: checkX,
                        tileY: checkY,
                        distance: distance
                    });
                }
            }
        }
        
        // Nach Entfernung sortieren
        sites.sort((a, b) => a.distance - b.distance);
        return sites;
    }

    updateSeekingHotbedState() {
        if (!this.nestingTarget) {
            this.changeState(DINO_STATES.IDLE);
            return;
        }
        
        const seekingTime = (Date.now() - this.seekingStartTime) / 1000;
        if (seekingTime > 10) {
            console.log(`⏰ ${this.species.name} Brutstätten-Suche timeout`);
            this.changeState(DINO_STATES.IDLE);
            this.nestingTarget = null;
            return;
        }
        
        const enemies = findEnemiesInRange(this);
        if (enemies.length > 0) {
            this.nestingTarget = null;
            return;
        }
        
        // GEÄNDERT: Berechne Zielposition basierend auf Dino-Position und Grass-Tile
        // Nicht immer Mitte, sondern näher zum Dino hin
        let targetX, targetY;
        
        const tileCenterX = this.nestingTarget.tileX;
        const tileCenterY = this.nestingTarget.tileY;
        
        // Berechne Kollisionsbox-Größe in Tiles
        const boxWidth = (this.species.properties.körper_länge || 50) * this.scale * 0.8 / tileSize;
        const boxHeight = (this.species.properties.körper_höhe || 50) * this.scale * 0.6 / tileSize;
        
        // Sichere Marge vom Rand (halbe Box-Größe + kleiner Puffer)
        const marginX = boxWidth / 2 + 0.1;
        const marginY = boxHeight / 2 + 0.1;
        
        // Begrenze Zielposition innerhalb der Grass-Kachel mit Sicherheitsmarge
        targetX = tileCenterX;
        targetY = tileCenterY;
        
        const distance = Math.sqrt((this.tileX - targetX) ** 2 + (this.tileY - targetY) ** 2);
        
        // Prüfe ob auf Gras und nah genug
        if (distance < 0.2 && isPositionValidFor(this, this.tileX, this.tileY, "egglaying")) {
            this.changeState(DINO_STATES.LAYING_EGG);
            this.eggLayingStartTime = Date.now();
            console.log(`🥚 ${this.species.name} beginnt Ei zu legen bei (${this.tileX.toFixed(2)}, ${this.tileY.toFixed(2)})`);
            return;
        }
        
        // Bewegung
        const moveSpeed = this.getMovementSpeed();
        const dirX = targetX - this.tileX;
        const dirY = targetY - this.tileY;
        const moveDistance = Math.sqrt(dirX * dirX + dirY * dirY);
        
        if (moveDistance > 0.1) {
            const normalizedDirX = dirX / moveDistance;
            const normalizedDirY = dirY / moveDistance;
            
            const newX = this.tileX + normalizedDirX * moveSpeed;
            const newY = this.tileY + normalizedDirY * moveSpeed;
            
            if (isPositionValidFor(this, newX, newY, 'movement')) {
                this.tileX = newX;
                this.tileY = newY;
                
                if (Math.abs(dirX) > 0.01) {
                    this.facingRight = dirX < 0;
                }
            } else {
                console.log(`❌ ${this.species.name} Weg blockiert`);
                this.changeState(DINO_STATES.IDLE);
                this.nestingTarget = null;
            }
        }
    }

    updateLayingEggState() {
        // Nutze die gleiche Validierungs-Logik
        if (!isPositionValidFor(this, this.tileX, this.tileY, "egglaying")) {
            console.log(`❌ ${this.species.name} Eiablage unterbrochen - nicht mehr auf Wiese`);
            this.changeState(DINO_STATES.IDLE);
            return;
        }
        
        const enemies = findEnemiesInRange(this);
        if (enemies.length > 0) {
            console.log(`⚔️ ${this.species.name} Eiablage unterbrochen - Feind nähert sich`);
            return;
        }
        
        const layingTime = (Date.now() - this.eggLayingStartTime) / 1000;
        if (layingTime >= 5) {
            console.log(`✅ ${this.species.name} hat Ei gelegt!`);
            
            // EI ERSTELLEN
            const egg = new Egg(
                this.tileX,
                this.tileY,
                this.species,
                this.isEnemy
            );
            
            gameObjects.push(egg);
            console.log(`🥚 Ei gelegt bei (${egg.tileX.toFixed(2)}, ${egg.tileY.toFixed(2)}) von ${this.species.name}`);
            
            // Schwangerschaft beenden
            this.isPregnant = false;
            this.pregnancyStartTime = null;
            this.changeState(DINO_STATES.IDLE);
        }
    }

    getCollisionBoxInTiles(tileX, tileY) {
        // Nutze die Berechnung aus getCollisionBox, aber in Tile-Koordinaten
        const boxWidth = (this.species.properties.körper_länge || 50) * this.scale * 0.8;
        const boxHeight = (this.species.properties.körper_höhe || 50) * this.scale * 0.6;
        const verticalOffset = boxHeight * 0.5 / tileSize;
        
        // In Tile-Koordinaten umrechnen
        const boxWidthInTiles = boxWidth / tileSize;
        const boxHeightInTiles = boxHeight / tileSize;
        
        return {
            left: tileX - boxWidthInTiles / 2,
            right: tileX + boxWidthInTiles / 2,
            top: tileY - boxHeightInTiles / 2 + verticalOffset,
            bottom: tileY + boxHeightInTiles / 2 + verticalOffset
        };
    }
}


// ===================================
// BEWGUNGs-FUNKTIONEN
// ===================================
/*
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
}*/

function isPositionValidFor(checkDino, newTileX, newTileY, purpose = 'movement') {
    // Schwimmer können sich überall bewegen
    if (purpose === 'movement' && checkDino.canSwim()) {
        return true;
    }
    
    newTileX = newTileX + 0.5;
    newTileY = newTileY + 0.5;  

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
        
        if (purpose === 'movement') {
            // Für Bewegung: Wasser vermeiden
            if (tileType === TILE_TYPES.WATER) {
                return false;
            }
        } else if (purpose === 'egglaying') {
            // Für Eiablage: MUSS Gras sein
            if (tileType !== TILE_TYPES.GRASS) {
                return false;
            }
        }
    }
    
    return true;
}

// ===================================
// CALCULATIONS UND HELPER-FUNKTIONEN
// ===================================

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

function isFullyOnGrass(dino, tileX, tileY) {
    const box = dino.getCollisionBoxInTiles(tileX, tileY);
    
    // Prüfe alle Eckpunkte und die Mitte
    const checkPoints = [
        { x: box.left, y: box.top },      // Oben links
        { x: box.right, y: box.top },     // Oben rechts
        { x: box.left, y: box.bottom },   // Unten links
        { x: box.right, y: box.bottom },  // Unten rechts
        { x: tileX, y: tileY }            // Mitte
    ];

    // Alle Punkte müssen auf Gras sein
    for (const point of checkPoints) {
        const checkTileX = Math.floor(point.x);
        const checkTileY = Math.floor(point.y);
        
        // Bounds check
        if (checkTileX < 0 || checkTileX >= mapWidth || 
            checkTileY < 0 || checkTileY >= mapHeight) {
            return false;
        }
        
        // Grass check
        if (!tileMap[checkTileY] || tileMap[checkTileY][checkTileX] !== TILE_TYPES.GRASS) {
            return false;
        }
    }
    
    return true;
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
        
       // const oldTileSize = tileSize;
        tileSize = Math.max(minTileSize, Math.min(maxTileSize, canvasTileSize * currentZoom));
 
        calculateTerrainOffsets();
        
        if (gameObjects && gameObjects.length > 0) {
            updateAllObjectScales();
        }

        if (placementPhase && placementZoneOverlay) {
            updatePlacementZoneOverlay();
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
    if (placementPhase) {
        console.log('⚠️ Pause während Platzierung nicht möglich');
        return;
    }

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

function showInvalidClickFeedback(x, y) {
    const feedback = document.createElement('div');
    feedback.style.position = 'absolute';
    feedback.style.left = x + 'px';
    feedback.style.top = y + 'px';
    feedback.style.transform = 'translate(-50%, -50%)';
    feedback.style.color = '#ff4444';
    feedback.style.fontSize = '20px';
    feedback.style.fontWeight = 'bold';
    feedback.style.pointerEvents = 'none';
    feedback.style.zIndex = '100';
    feedback.textContent = '❌';
    feedback.style.animation = 'fadeOut 1s ease-out';
    
    document.querySelector('.game-container').appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

function handlePlacementClick(event) {
    if (!placementPhase) return;
    
    // Ignoriere Klick wenn es ein Drag war
    if (placementIsDragging) {
        placementIsDragging = false;
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // In Tile-Koordinaten umrechnen
    const tilePos = PositionUtils.pixelToTile(mouseX, mouseY, tileSize, terrainOffsetX, terrainOffsetY);
    
    // Prüfen ob Klick im erlaubten Bereich
    const minX = mapWidth * 0.05;
    const maxX = mapWidth * 0.45;
    const minY = 1;
    const maxY = mapHeight - 2;
    
    if (tilePos.tileX >= minX && tilePos.tileX <= maxX && 
        tilePos.tileY >= minY && tilePos.tileY <= maxY) {
        
        // Prüfen ob noch Gruppen zu platzieren sind
        const totalGroups = levelData.populationData.filter(species => !species.population.isExtinct).length;
        
        if (currentPlacementGroup < totalGroups) {
            // Position speichern
            groupPlacements.push({
                x: tilePos.tileX,
                y: tilePos.tileY,
                groupIndex: currentPlacementGroup
            });
            
            // Visueller Marker
            showPlacementMarker(mouseX, mouseY);
            
            // Nächste Gruppe
            currentPlacementGroup++;
            updatePlacementUI();
            
            // Alle platziert?
            if (currentPlacementGroup >= totalGroups) {
                setTimeout(() => endPlacementPhase(), 500);
            }
        }
    } else {
        // Visuelles Feedback für ungültigen Klick
        showInvalidClickFeedback(mouseX, mouseY);
        console.log('❌ Klick außerhalb des erlaubten Bereichs');
    }
}

function handlePlacementMouseDown(event) {
    if (!placementPhase) return;
    
    const rect = canvas.getBoundingClientRect();
    placementClickStartX = event.clientX - rect.left;
    placementClickStartY = event.clientY - rect.top;
    placementIsDragging = false;
}

function handlePlacementMouseMove(event) {
    if (!placementPhase) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Prüfe ob Maus bewegt wurde (mehr als 5 Pixel)
    const distance = Math.sqrt(
        Math.pow(mouseX - placementClickStartX, 2) + 
        Math.pow(mouseY - placementClickStartY, 2)
    );
    
    if (distance > 5) {
        placementIsDragging = true;
    }
}

function handlePlacementMouseUp(event) {
    if (!placementPhase) return;
    
    // Nur als Klick werten wenn nicht gedraggt wurde
    if (!placementIsDragging) {
        handlePlacementClick(event);
    }
    
    placementIsDragging = false;
}

// ===================================
// KAMPFLOGIK
// ===================================

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


function findEnemiesInRange(dino) {
    if (dino.state === DINO_STATES.DEAD) return [];
    
    const enemies = gameObjects.filter(obj => 
        obj instanceof Dino && 
        obj.state !== DINO_STATES.DEAD &&
        obj.isEnemy !== dino.isEnemy && // Unterschiedliche Fraktionen
        PositionUtils.calculateDistance(dino, obj) <= dino.detectionRadius
    );
    
    return enemies;
}


function updateSeekingState(dino) {
    if (!dino.combatTarget || dino.combatTarget.state === DINO_STATES.DEAD) {
        dino.combatTarget = null;
        dino.changeState(DINO_STATES.IDLE);
        return;
    }
    
    // Prüfen ob Ziel bereits von jemand anderem bekämpft wird
    const targetAlreadyFighting = combats.some(c => c.participants.includes(dino.combatTarget));
    if (targetAlreadyFighting) {
        dino.combatTarget = null;
        dino.changeState(DINO_STATES.IDLE);
        return;
    }
    
    const distance = PositionUtils.calculateDistance(dino, dino.combatTarget);
    
    // Zu weit weg? Aufgeben
    if (distance > dino.detectionRadius * 1.5) {
        dino.combatTarget = null;
        dino.changeState(DINO_STATES.IDLE);
        return;
    }   
    // Nah genug für Angriff?
    if (distance <= COMBAT_CONFIG.ATTACK_DISTANCE) {
        startCombat(dino, dino.combatTarget);
        return;
    }    
    // WICHTIG: seekEnemy() nur wenn NICHT bereits im Kampf
    if (dino.state !== DINO_STATES.FIGHTING) {
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
            PositionUtils.calculateDistance(dino, enemy) < PositionUtils.calculateDistance(dino, nearest) ? enemy : nearest
        );
    }
    
    return null; // Kein geeignetes Ziel
}

function updateFightingState(dino) {
    if (!dino.combatTarget || dino.combatTarget.state === DINO_STATES.DEAD) {
        dino.changeState(DINO_STATES.IDLE);
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
    
    const distance = PositionUtils.calculateDistance(dino, dino.combatTarget);

    if (distance > 0.1) {
        const moveSpeed = dino.getMovementSpeed();
        const newPos = PositionUtils.moveTowards(
            dino, 
            dino.combatTarget.tileX, 
            dino.combatTarget.tileY, 
            moveSpeed
        );
        
        if (isPositionValidFor(dino, newPos.x, newPos.y, 'movement')) {
            dino.tileX = newPos.x;
            dino.tileY = newPos.y;
            
            // Blickrichtung vereinfacht
            const direction = PositionUtils.normalizeDirection(
                dino.combatTarget.tileX - dino.tileX,
                dino.combatTarget.tileY - dino.tileY
            );
            
            if (Math.abs(direction.x) > 0.01) {
                dino.facingRight = direction.x < 0;
            }
        }
    }
}
// Kampf starten
function startCombat(attacker, defender) {
    if(!firstselector){firstselector = true; attacker.selected = true;}
    if (attacker.state === DINO_STATES.SEEKING_FOOD || attacker.state === DINO_STATES.CONSUMING) {
        releaseFoodReservation(attacker);
    }
    if (defender.state === DINO_STATES.SEEKING_FOOD || defender.state === DINO_STATES.CONSUMING) {
        releaseFoodReservation(defender);
    }
    
                
    const attackerInCombat = combats.find(c => c.participants.includes(attacker));
    if (attackerInCombat) return;
    
    const defenderInCombat = combats.find(c => c.participants.includes(defender));
    if (defenderInCombat) {
        return;
    }
        
    // Beide Dinos in Kampfmodus
    attacker.changeState(DINO_STATES.FIGHTING, { enemy: defender });;
    defender.changeState(DINO_STATES.FIGHTING, { enemy: attacker });;
    attacker.combatTarget = defender;
    defender.combatTarget = attacker;
    
    attacker.targetTileX = attacker.tileX;
    attacker.targetTileY = attacker.tileY;
    defender.targetTileX = defender.tileX;
    defender.targetTileY = defender.tileY;
    
    attacker.changeState(DINO_STATES.FIGHTING);
    defender.changeState(DINO_STATES.FIGHTING);
    
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
            }
        }, 800); // 800ms statt 500ms für bessere Übersicht
    }
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
    dino.changeState(DINO_STATES.DEAD);
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
    // Kampf aus Liste entfernen
    const combatIndex = combats.findIndex(c => 
        c.participants.includes(winner) && c.participants.includes(loser)
    );
    
    if (combatIndex !== -1) {
        const combat = combats[combatIndex];
        
        // Alle Teilnehmer zurück zu neutral setzen
        combat.participants.forEach(participant => {
            if (participant !== loser && participant.state !== DINO_STATES.DEAD) {
                participant.changeState(DINO_STATES.IDLE);
                participant.combatTarget = null;
                
                // NEU: Bewegung wieder aktivieren
                participant.changeState(DINO_STATES.IDLE);
                participant.behaviorTimer = 0;
                participant.currentBehaviorDuration = participant.getRandomRestDuration();
            }
        });
        
        combats.splice(combatIndex, 1);
    }
    
    // Gewinner spezifisch zurück zu neutral
    if (winner.state !== DINO_STATES.DEAD) {
        winner.changeState(DINO_STATES.IDLE);
        winner.postCombatCooldownUntil = Date.now() + (FOOD_CONFIG.POST_COMBAT_COOLDOWN * 1000);
        winner.combatTarget = null;
        
        // Bewegung für Gewinner auch aktivieren
        winner.changeState(DINO_STATES.IDLE);
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
            obj.update();
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

    eggshellParticles = eggshellParticles.filter(particle => {
        particle.x += particle.vx * gameSpeed / 60;
        particle.y += particle.vy * gameSpeed / 60;
        particle.vy += 150 * gameSpeed / 60; // Schwerkraft
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
            obj.update();
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

    eggshellParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Eierschalen-Fragment (weißlich)
        ctx.fillStyle = '#F5E6D3';
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size/2);
        
        // Innenseite (etwas dunkler)
        ctx.fillStyle = '#E5D6C3';
        ctx.fillRect(-particle.size/2, 0, particle.size, particle.size/2);
        
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
    if (dino.state === DINO_STATES.DEAD) return;
    
    const pixel = PositionUtils.tileToPixel(dino.tileX, dino.tileY, tileSize, terrainOffsetX, terrainOffsetY);
    const pixelX = pixel.x;
    const pixelY = pixel.y;

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
    if (dino.state === DINO_STATES.FIGHTING) {
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
    if (dino.state === DINO_STATES.FIGHTING) {
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
  
    // Schwangerschafts-Icon
    if (dino.isPregnant) {
        ctx.fillStyle = '#FFB6C1'; // Zartes Rosa
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        ctx.strokeText(PREGNANCY_CONFIG.PREGNANCY_ICON, pixelX + symbolX, symbolY);
        ctx.fillText(PREGNANCY_CONFIG.PREGNANCY_ICON, pixelX + symbolX, symbolY);
        symbolX += 15; // Platz für nächstes Icon
    }
    
    // Muskel-Icon für Dinos mit Boost
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

    // Schild-Icon für gesättigte Dinos
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

function trackKill(killer, victim) {
    killer.killCount++;
   
    if (killer.killCount >= 2 && !killer.hasMuscleBoost) {
        killer.hasMuscleBoost = true;
    }else if (killer.killCount >= 4 && !killer.hasMuscleBoostMax) {
        killer.hasMuscleBoostMax = true;
    }
}

// ===================================
// FOOD HANDLING
// ===================================

// Nahrungsquellen in der Nähe finden
function findFoodSourcesInRange(dino) {
    if (dino.state === DINO_STATES.DEAD || dino.state === DINO_STATES.CONSUMING) return [];
    
    const sources = [];
    const detectionRadius = dino.detectionRadius;
    
    gameObjects.forEach(obj => {
        const distance = PositionUtils.calculateDistance(dino, obj);
        if (distance > detectionRadius) return;
        
        // Bäume (Pflanzen) - NUR WENN NICHT RESERVIERT
        if (obj.type === 'tree' && dino.canConsumePlants) {
            const sourceId = `tree_${obj.tileX}_${obj.tileY}`;
            
            // STRENGE PRÜFUNG: Nur wenn komplett frei
            if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
                const isLarge = obj.baseSize >= 25;
                sources.push({
                    object: obj,
                    type: 'plants',
                    value: isLarge ? FOOD_CONFIG.FOOD_VALUES.LARGE_TREE : FOOD_CONFIG.FOOD_VALUES.SMALL_TREE,
                    preference: dino.foodPreferences.plants,
                    sourceId: sourceId
                });
            }
        }
        
        // Nagetiere (Fleisch) - NUR WENN NICHT RESERVIERT
        if (obj.type === 'rodent' && dino.canConsumeMeat) {
            const sourceId = `rodent_${obj.tileX}_${obj.tileY}`;
            
            if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
                sources.push({
                    object: obj,
                    type: 'meat',
                    value: FOOD_CONFIG.FOOD_VALUES.RODENT,
                    preference: dino.foodPreferences.meat,
                    sourceId: sourceId
                });
            }
        }
    });
    
    // Leichen (vereinfacht) - NUR WENN NICHT RESERVIERT
    if (dino.canConsumeCarrion || dino.canConsumeMeat) {
        corpses.forEach(corpse => {
            const distance = Math.sqrt(
                (dino.tileX - corpse.tileX) ** 2 + 
                (dino.tileY - corpse.tileY) ** 2
            );
            
            if (distance <= detectionRadius) {
                const sourceId = `corpse_${corpse.tileX}_${corpse.tileY}_${corpse.deathTime}`;
                
                if (!consumedFoodSources.has(sourceId) && !occupiedFoodSources.has(sourceId)) {
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
                        sourceId: sourceId
                    });
                }
            }
        });
    }
    
    // Nach Präferenz sortieren (höchste zuerst)
    return sources.sort((a, b) => b.preference - a.preference);
}

// Beste Nahrungsquelle auswählen
function selectBestFoodSource(dino) {
    const sources = findFoodSourcesInRange(dino);
    
    // Erste verfügbare Nahrungsquelle SOFORT reservieren
    for (const source of sources) {
        // Atomare Reservierung: Prüfen und sofort belegen
        if (!occupiedFoodSources.has(source.sourceId)) {
            occupiedFoodSources.set(source.sourceId, dino);
            return source;
        }
    }
    
    return null; // Keine freie Nahrung gefunden
}

function startFoodConsumption(dino, foodSource) {
    // Prüfe nochmals ob Nahrungsquelle frei ist (Race Condition vermeiden)
    if (occupiedFoodSources.has(foodSource.sourceId)) {
        dino.changeState(DINO_STATES.IDLE);
        dino.foodTarget = null;
        return;
    }

    // Nahrungsquelle als belegt markieren
    occupiedFoodSources.set(foodSource.sourceId, dino);
   
    dino.changeState(DINO_STATES.CONSUMING);
    dino.foodTarget = foodSource;
    dino.consumptionStartTime = Date.now();

    //dino.changeState(DINO_STATES.IDLE);
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
   }

    if (dino.currentHP < dino.maxHP) {
        const healingAmount = Math.round(finalValue * 2); // 2 HP pro Nahrungspunkt
        const oldHP = dino.currentHP;
        dino.currentHP = Math.min(dino.maxHP, dino.currentHP + healingAmount);
        const actualHealing = dino.currentHP - oldHP;
        
        if (actualHealing > 0) {
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
    dino.changeState(DINO_STATES.IDLE);
    dino.foodTarget = null;
    
    updateHUD(); // HUD mit neuen Nahrungspunkten aktualisieren
}

// Nahrungsaufnahme unterbrechen
function interruptFoodConsumption(dino, reason = 'unknown') {
   
    // Konsumptions-Animation beenden
    dino.isConsuming = false;
    
    // Reservierung freigeben (falls vorhanden)
    if (dino.foodTarget && dino.foodTarget.sourceId) {
        if (occupiedFoodSources.get(dino.foodTarget.sourceId) === dino) {
            occupiedFoodSources.delete(dino.foodTarget.sourceId);
        }
    }
    
    dino.feedingRotationLocked = false;
    dino.changeState(DINO_STATES.IDLE);
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

function updateFoodSeekingState(dino) {
    if (dino.avoidanceMode.active) {
        dino.updateAvoidanceMode();
        return;
    }

    if (!dino.foodTarget) {
        dino.changeState(DINO_STATES.IDLE);
        return;
    }
    
    // Prüfe ob Nahrungsquelle noch reserviert ist
    //const reservedBy = occupiedFoodSources.get(dino.foodTarget.sources);
    /*
    if (reservedBy !== dino) {
        console.log(`Dino ${dino} --- reservedby ${reservedBy}`);
        dino.changeState(DINO_STATES.IDLE);
        dino.foodTarget = null;
        return;
    }*/
    
    // Timeout
    const seekingTime = (Date.now() - dino.seekingStartTime) / 1000;
    if (seekingTime > 6) {
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
    
    // Erforderliche Distanz
    let requiredDistance;
    if (targetObj.type === 'tree') requiredDistance = 0.1;
    else if (targetObj.type === 'rodent') requiredDistance = 0.1;   
    else if (targetObj.deathTime) requiredDistance = 0.1;
    else requiredDistance = 0.1;

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
    
    // Zu weit entfernt? Aufgeben
    if (distance > dino.detectionRadius * 1.5) {
        releaseFoodReservation(dino);
        return;
    }
    
    // DIREKTE BEWEGUNG zur Nahrung (ohne Kollisionsvermeidung mit anderen Dinos)
    const dx = targetX - dino.tileX;
    const dy = targetY - dino.tileY;
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    
    if (moveDistance > 0.1) {
        const moveSpeed = dino.getMovementSpeed();
        const newX = dino.tileX + (dx / moveDistance) * moveSpeed;
        const newY = dino.tileY + (dy / moveDistance) * moveSpeed;
        
        if (isPositionValidFor(dino, newX, newY, 'movement')) {
            const boundedPos = PositionUtils.clampToMapBounds(newX, newY, mapWidth, mapHeight, 1);
            dino.tileX = boundedPos.x;
            dino.tileY = Math.max(1, Math.min(mapHeight - 1, boundedPos.y));

            // Blickrichtung
            if (Math.abs(dx) > 0.1) {
                if (dx > 0) dino.facingRight = false;
                else dino.facingRight = true;
            }
        } else {
            // Weg blockiert (Wasser) - aufgeben
            releaseFoodReservation(dino);
            return;
        }
    }
    
    // Einfache Stuck-Erkennung
    if (!dino.lastPosition) {
        dino.lastPosition = { x: dino.tileX, y: dino.tileY, time: Date.now() };
    }
    
    const positionDiff = Math.sqrt(
        (dino.tileX - dino.lastPosition.x) ** 2 + 
        (dino.tileY - dino.lastPosition.y) ** 2
    );
    
    const timeDiff = (Date.now() - dino.lastPosition.time) / 1000;
    
    if (timeDiff > 3.0 && positionDiff < 0.2) {
        releaseFoodReservation(dino);
        return;
    }
    
    if (timeDiff > 1.5) {
        dino.lastPosition = { x: dino.tileX, y: dino.tileY, time: Date.now() };
    }
}

function releaseFoodReservation(dino) {
    if (dino.foodTarget && dino.foodTarget.sourceId) {
        const reservedBy = occupiedFoodSources.get(dino.foodTarget.sourceId);
        if (reservedBy === dino) {
            occupiedFoodSources.delete(dino.foodTarget.sourceId);
        }
    }
    
    dino.changeState(DINO_STATES.IDLE);
    dino.foodTarget = null;
    dino.lastPosition = null;
}

function calculateOptimalFeedingPositions(foodSource, dinoPosition) {
    const targetObj = foodSource.object;
    let baseX, baseY;

    if (targetObj.tileX !== undefined) {
        baseX = targetObj.tileX;
        baseY = targetObj.tileY;
    } else {
        baseX = targetObj.tileX || foodSource.object.tileX;
        baseY = targetObj.tileY || foodSource.object.tileY;
    }
    
    // Einfache Annäherung: Näher zur Nahrungsquelle
    let offset;
    if (targetObj.type === 'tree') {
        offset = 1.0;
    } else if (targetObj.type === 'rodent') {
        offset = 0.6;
    } else if (targetObj.deathTime) { // Leiche
        offset = 0.8;
    } else {
        offset = 0.8;
    }
    
    // Bestimme ob links oder rechts näher ist
    const leftDistance = Math.abs(dinoPosition.x - (baseX - offset));
    const rightDistance = Math.abs(dinoPosition.x - (baseX + offset));
    
    if (leftDistance <= rightDistance) {
        return { x: baseX - offset, y: baseY };
    } else {
        return { x: baseX + offset, y: baseY };
    }
}

function updateFoodConsumingState(dino) {
    //if(dino.selected){ console.log(`updateFoodConsumingState(dino) ${frame} -- ${dino.state}`);}  
    const currentTime = Date.now();
    const elapsed = (currentTime - dino.consumptionStartTime) / 1000;

    dino.targetTileX = dino.tileX;  // Position fixieren
    dino.targetTileY = dino.tileY;  // Position fixieren
    dino.animationPhase = 'idle';   // Nur Idle-Animation
       
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
        const stillConsuming = dino.state === DINO_STATES.CONSUMING;
        
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
    if (placementPhase) return;
    if (!isPaused && !isLoading) {
        animationTime += 0.016 * gameSpeed;
        
        gameObjects.forEach(obj => {
            if (obj.update) obj.update();
        });

        const allDinos = gameObjects.filter(obj => obj instanceof Dino);
        pregnancyManager.update(allDinos, gameSpeed);
    }
    updateCombatSystem();
    updateTimer();
    checkVictoryConditions();
}

function render() {
    if (isLoading) return;
    
    renderTerrain();

    if (placementPhase && placementZoneOverlay) {
        updatePlacementZoneOverlay();
    }

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
        const pregnantCount = ownDinos.filter(d => d.species.name === species.name && d.isPregnant).length;
        html += `
            <div class="species-status">
                <span class="species-name">${species.name}:</span>
                <span class="population-count">Eigene: ${ownCount}</span>
                ${pregnantCount > 0 ? `<span style="color: #FFB6C1;"> (${pregnantCount}🥚)</span>` : ''}
                | <span style="color: #ff6b35;">Feinde: ${enemyCount}</span>
            </div>
        `;


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

function addCombatPropertiesToDino(dino) {
    if (!window.DinoAbilities || !window.DinoAbilities.calculateDinoAbilities) {
        console.error('❌ DinoAbilities nicht verfügbar! Script nicht geladen?');
        return;
    }
    
    // Fähigkeiten berechnen
    dino.abilities = window.DinoAbilities.calculateDinoAbilities(dino.species.properties);
    dino.baseSpeed = 0.00 + dino.abilities['Geschwindigkeit'] / 2000;

    dino.reproductionValue = dino.abilities['Fortpflanzungsgeschwindigkeit'] || 0;

    // Kampfwerte
    dino.maxHP = dino.abilities['Lebenspunkte'];
    dino.currentHP = dino.maxHP;
    dino.maxStamina = dino.abilities['Kondition'];
    dino.currentStamina = dino.maxStamina;
    
    // Kampfzustand
    dino.changeState(DINO_STATES.IDLE);
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

// ===================================
// FORTPFLANZUNGS-SYSTEM
// ===================================

// ===================================
// FORTPFLANZUNGS-SYSTEM
// ===================================

const PREGNANCY_CONFIG = {
    CHECK_INTERVAL: 3 * 60, // 3 Minuten in Sekunden
    MIN_REPRODUCTION_VALUE: 50,
    PREGNANCY_ICON: '🥚'
};

class PregnancyManager {
    constructor() {
        this.lastUpdateTime = Date.now();
    }

    initializeDino(dino) {
        // Jeder Dino bekommt einen zufälligen Start-Offset für seinen ersten Check
        // So werden die Checks über die Zeit verteilt
        const randomOffset = Math.random() * PREGNANCY_CONFIG.CHECK_INTERVAL;
        dino.nextPregnancyCheck = randomOffset;
        dino.pregnancyCheckInterval = PREGNANCY_CONFIG.CHECK_INTERVAL;
    }

    update(dinos, gameSpeed) {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // in Sekunden
        this.lastUpdateTime = currentTime;
        
        // Zeit mit Spielgeschwindigkeit skalieren
        const gameTimeDelta = deltaTime * gameSpeed;
        
        dinos.forEach(dino => {
            if (dino.state === DINO_STATES.DEAD || !dino.isAdult) return;
            
            // Zeit bis zum nächsten Check reduzieren
            dino.nextPregnancyCheck -= gameTimeDelta;
            
            // Zeit für einen Check?
            if (dino.nextPregnancyCheck <= 0 && !dino.isPregnant) {
                this.performPregnancyCheck(dino);
                
                // Nächsten Check planen (mit kleiner Zufälligkeit für Variation)
                const variation = (Math.random() - 0.5) * 30; // ±15 Sekunden
                dino.nextPregnancyCheck = PREGNANCY_CONFIG.CHECK_INTERVAL + variation;
            }
            
            // Schwangerschafts-Update (für später wenn Eier gelegt werden sollen)
            if (dino.isPregnant) {
                const pregnancyDuration = (dino.abilities['Zeit zum Erwachsenwerden'] || 180) / 2;
                const pregnancyElapsed = (currentTime - dino.pregnancyStartTime) / 1000;
                
                if (pregnancyElapsed >= pregnancyDuration) {
                    // Hier später: Ei legen Logik
                    dino.isPregnant = false;
                    console.log(`🥚 ${dino.species.name} Schwangerschaft beendet (würde Ei legen)`);
                }
            }
        });
    }

    performPregnancyCheck(dino) {
        if (dino.reproductionValue < PREGNANCY_CONFIG.MIN_REPRODUCTION_VALUE) return;
        
        // Berechne Schwangerschafts-Chance
        const chance = this.calculatePregnancyChance(dino.reproductionValue);
        
        if (Math.random() < chance) {
            this.makePregnant(dino);
        }
    }

    calculatePregnancyChance(reproductionValue) {
        if (reproductionValue < PREGNANCY_CONFIG.MIN_REPRODUCTION_VALUE) return 0;
        
        // Lineare Skalierung von 10% bei Wert 50 bis 100% bei Wert 100
        const normalizedValue = (reproductionValue - PREGNANCY_CONFIG.MIN_REPRODUCTION_VALUE) / 
                               (100 - PREGNANCY_CONFIG.MIN_REPRODUCTION_VALUE);
        return 0.8 + (normalizedValue * 0.9);
    }

    makePregnant(dino) {
        dino.isPregnant = true;
        dino.pregnancyStartTime = Date.now();
        console.log(`🥚 ${dino.species.name} ist jetzt schwanger! (${dino.isEnemy ? 'Feind' : 'Eigener'})`);
    }
}

// Globale Instanz
let pregnancyManager = new PregnancyManager();

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
