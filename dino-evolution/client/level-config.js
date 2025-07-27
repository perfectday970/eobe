

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


// ===================================
// UMGEBUNGSOBJEKTE (gekürzt, alle Funktionen unverändert)
// ===================================

class EnvironmentObject {
    constructor(tileX, tileY, type, options = {}) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.type = type;
        this.options = options;
        
        if (type === 'tree') {
            this.baseSize = (Math.random() * 30 + 15) * 0.448;
            this.size = this.baseSize;
            
            this.baseTrunkHeight = this.baseSize * (0.8 + Math.random() * 0.6);
            this.baseTrunkWidth = Math.max(2, this.baseSize * 0.2);
            this.baseCrownWidth = this.baseSize * (1.2 + Math.random() * 0.6);
            this.baseCrownHeight = this.baseSize * (0.8 + Math.random() * 0.4);
            
            this.trunkHeight = this.baseTrunkHeight;
            this.trunkWidth = this.baseTrunkWidth;
            this.crownWidth = this.baseCrownWidth;
            this.crownHeight = this.baseCrownHeight;
            
            this.treeSeed = Math.floor(tileX * 123 + tileY * 456);
        }else if (type === 'cactus') {
            // Basis-Größen (wie bei Bäumen!)
            this.baseSize = (Math.random() * 15 + 10) * 0.448;
            this.size = this.baseSize;
            
            // WICHTIG: Basis-Dimensionen definieren
            this.baseTrunkWidth = this.baseSize * 0.4;
            this.baseTrunkHeight = this.baseSize * 1.5;
            
            // Aktuelle Dimensionen (werden bei updateScale gesetzt)
            this.trunkWidth = this.baseTrunkWidth;
            this.trunkHeight = this.baseTrunkHeight;
            
            // Blüten-Eigenschaften
            this.hasFlower = Math.random() < 0.3;
            this.flowerColor = options.flowerColor || '#FF69B4';
            
            // Zufalls-Seed für konsistente Details
            this.cactusSeed = Math.floor(Math.random() * 1000);

            this.flowerRegrowTime = 120.0; // 2 Minuten bis neue Blüte wächst
            this.timeSinceFlowerEaten = 0;
        }else if (type === 'rock') {
            this.rockType = options.rockType || 'medium';
            this.isGroupLeader = options.isGroupLeader || false;
            this.groupIndex = options.groupIndex || 0;
            
            switch (this.rockType) {
                case 'small':
                    this.baseSize = (Math.random() * 8 + 6) * 0.512;
                    break;
                case 'medium':
                    this.baseSize = (Math.random() * 15 + 12) * 0.512;
                    break;
                case 'large':
                    this.baseSize = (Math.random() * 25 + 20) * 0.512;
                    break;
                default:
                    this.baseSize = (Math.random() * 15 + 10) * 0.512;
            }
            this.size = this.baseSize;
            
            this.rockSeed = Math.floor(tileX * 177 + tileY * 239);
            this.baseWidth = this.baseSize * (0.8 + ((this.rockSeed % 100) / 100) * 0.4);
            this.baseHeight = this.baseSize * (0.8 + (((this.rockSeed + 50) % 100) / 100) * 0.4);
            
            this.width = this.baseWidth;
            this.height = this.baseHeight;
            
            this.colorVariation = (this.rockSeed % 40) - 20;
        } else if (type === 'rodent') {
            this.baseSize = (Math.random() * 20 + 10) * 0.32;
            this.size = this.baseSize;
            this.moveSpeed = 0.08; // Erhöht von 0.02 auf 0.08
            this.moveTimer = Math.random() * 3; // NEU: Timer für regelmäßige Bewegung
            this.moveDirection = Math.random() * Math.PI * 2; // NEU: Bewegungsrichtung
            this.moveDelay = 0.5 + Math.random(); // NEU: Bewegungsintervall
        } else {
            this.baseSize = (Math.random() * 20 + 10) * 0.32;
            this.size = this.baseSize;
        }
    }

    updateScale() {
        const scaleFactor = tileSize / baseTileSize;
        
        this.size = this.baseSize * scaleFactor;
        
        if (this.type === 'tree') {
            this.trunkHeight = this.baseTrunkHeight * scaleFactor;
            this.trunkWidth = this.baseTrunkWidth * scaleFactor;
            this.crownWidth = this.baseCrownWidth * scaleFactor;
            this.crownHeight = this.baseCrownHeight * scaleFactor;
        } else if (this.type === 'rock') {
            this.width = this.baseWidth * scaleFactor;
            this.height = this.baseHeight * scaleFactor;
        } else if (this.type === 'cactus') {
            this.trunkWidth = this.baseTrunkWidth * scaleFactor;
            this.trunkHeight = this.baseTrunkHeight * scaleFactor;
        }
    }

    render() {
        /*
        const pixelX = this.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = this.tileY * tileSize + tileSize / 2 + terrainOffsetY;
        */
        const pixel = PositionUtils.tileToPixel(this.tileX, this.tileY, tileSize, terrainOffsetX, terrainOffsetY);
        const pixelX = pixel.x;
        const pixelY = pixel.y;

        ctx.save();
        ctx.translate(pixelX, pixelY);
        
        switch(this.type) {
            case 'tree':
                this.renderDetailedTree();
                break;
            case 'cactus':
                this.renderCactus(ctx);
                break;              
            case 'rock':
                this.renderDetailedRock();
                break;
            case 'rodent':
                const rodentScale = this.size * 0.8;
                
                const bodyWidth = rodentScale * 1.2;
                const bodyHeight = rodentScale * 0.8;
                const headSize = rodentScale * 0.6;
                const tailWidth = rodentScale * 0.3;
                const tailLength = rodentScale * 1.0;
                
                const isBeingHunted = gameObjects.some(obj => 
                    obj instanceof Dino && 
                    obj.state !== DINO_STATES.DEAD &&
                    obj.state === DINO_STATES.CONSUMING &&
                    obj.foodTarget && 
                    obj.foodTarget.object === this
                );
                
                if (isBeingHunted) {
                    ctx.fillStyle = '#654321'; // Dunkleres Braun = Angst
                    const fearShake = Math.sin(Date.now() * 0.01) * 0.5;
                    ctx.translate(fearShake, 0);                  
                } else {
                    ctx.fillStyle = '#8B4513'; // Normal braun
                    this.moveTimer += gameSpeed / 60;
                    
                    if (this.moveTimer >= this.moveDelay) {
                        this.moveDirection += (Math.random() - 0.5) * 0.8;
                        
                        this.tileX += Math.cos(this.moveDirection) * this.moveSpeed;
                        this.tileY += Math.sin(this.moveDirection) * this.moveSpeed;
                        
                        this.tileX = Math.max(1, Math.min(mapWidth - 1, this.tileX));
                        this.tileY = Math.max(mapHeight * 0.6, Math.min(mapHeight - 1, this.tileY));
                        
                        this.moveTimer = 0;
                        this.moveDelay = 0.3 + Math.random() * 0.7;
                    }
                }
                
                ctx.fillRect(-bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight);
                ctx.fillRect(-bodyWidth/2 - headSize * 0.8, -headSize/2, headSize, headSize);
                ctx.fillRect(bodyWidth/2, -tailWidth/2, tailLength, tailWidth);
                
                break;

        }
        
        ctx.restore();
    }

       renderCactus() {
        const scale = tileSize / baseTileSize;
        
        // Schatten auf dem Boden
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.trunkWidth * 0.7, this.trunkWidth * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Position ist jetzt relativ zu (0,0) wegen translate in render()
        const trunkX = -this.trunkWidth / 2;
        const trunkY = -this.trunkHeight;
        
        // Basis-Farbe
        ctx.fillStyle = '#2B5F2B';
        ctx.fillRect(trunkX, trunkY, this.trunkWidth, this.trunkHeight);
        
        // Schatten (skaliert mit scale)
        const shadowSize = Math.max(1, Math.floor(2 * scale));
        ctx.fillStyle = '#1A3F1A';
        ctx.fillRect(trunkX + this.trunkWidth - shadowSize, trunkY, shadowSize, this.trunkHeight);
        ctx.fillRect(trunkX, trunkY + this.trunkHeight - shadowSize, this.trunkWidth, shadowSize);
        
        // Highlight
        ctx.fillStyle = '#3B7F3B';
        ctx.fillRect(trunkX, trunkY, shadowSize, this.trunkHeight);
        ctx.fillRect(trunkX, trunkY, this.trunkWidth, shadowSize);
        
        // Vertikale Rillen
        ctx.fillStyle = '#1A3F1A';
        const grooveCount = Math.max(2, Math.floor(this.trunkWidth / (4 * scale)));
        for (let i = 1; i < grooveCount; i++) {
            const grooveX = trunkX + i * (this.trunkWidth / grooveCount);
            ctx.fillRect(grooveX, trunkY + 2 * scale, 1 * scale, this.trunkHeight - 4 * scale);
        }
        
        // Stacheln
        ctx.fillStyle = '#F5F5DC';
        const spineRows = Math.max(3, Math.floor(this.trunkHeight / (6 * scale)));
        for (let row = 0; row < spineRows; row++) {
            const y = trunkY + 3 * scale + row * (this.trunkHeight - 6 * scale) / spineRows;
            
            ctx.fillRect(trunkX - 1 * scale, y, 1 * scale, 1 * scale);
            ctx.fillRect(trunkX + this.trunkWidth, y, 1 * scale, 1 * scale);
        }
        
        // Seitenarme (skalieren auch mit)
        if (this.baseSize > 12) {
            const armWidth = this.trunkWidth * 0.7;
            const armHeight = this.trunkHeight * 0.3;
            
            // Linker Arm
            const leftArmX = -this.trunkWidth * 1.2;
            const leftArmY = -this.trunkHeight * 0.6;
            
            ctx.fillStyle = '#2B5F2B';
            ctx.fillRect(leftArmX, leftArmY, armWidth, armHeight);
            
            ctx.fillStyle = '#1A3F1A';
            ctx.fillRect(leftArmX + armWidth - shadowSize, leftArmY, shadowSize, armHeight);
            ctx.fillRect(leftArmX, leftArmY + armHeight - shadowSize, armWidth, shadowSize);
            
            ctx.fillStyle = '#3B7F3B';
            ctx.fillRect(leftArmX, leftArmY, shadowSize, armHeight);
            
            // Rechter Arm
            const rightArmX = this.trunkWidth * 0.5;
            const rightArmY = -this.trunkHeight * 0.7;
            
            ctx.fillStyle = '#2B5F2B';
            ctx.fillRect(rightArmX, rightArmY, armWidth, armHeight);
            
            ctx.fillStyle = '#1A3F1A';
            ctx.fillRect(rightArmX + armWidth - shadowSize, rightArmY, shadowSize, armHeight);
            
            ctx.fillStyle = '#3B7F3B';
            ctx.fillRect(rightArmX, rightArmY, shadowSize, armHeight);
        }
        
        // Blüte
        if (this.hasFlower) {
            const flowerY = trunkY - 4 * scale;
            const flowerSize = 6 * scale;
            
            // Blüten-Basis
            ctx.fillStyle = this.flowerColor;
            ctx.fillRect(-flowerSize/2, flowerY - flowerSize, flowerSize, flowerSize);
            
            // Blütenblätter
            ctx.fillRect(-flowerSize * 1.5, flowerY - flowerSize/2, flowerSize * 3, flowerSize/2);
            ctx.fillRect(-flowerSize/2, flowerY - flowerSize * 1.5, flowerSize/2, flowerSize * 2);
            
            // Blütenmitte
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-2 * scale, flowerY - flowerSize/2 - 2 * scale, 4 * scale, 4 * scale);
        }
    }

    renderDetailedTree() {
        this.renderTrunk();
        this.renderCrown();
        this.renderBranches();
    }

    renderTrunk() {
        const scale = tileSize / baseTileSize;
        const trunkX = -this.trunkWidth / 2;
        const trunkY = 0;
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(trunkX, trunkY, this.trunkWidth, this.trunkHeight);
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(trunkX + this.trunkWidth - 2 * scale, trunkY, 2 * scale, this.trunkHeight);
        ctx.fillRect(trunkX, trunkY + this.trunkHeight - 2 * scale, this.trunkWidth, 2 * scale);
        
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(trunkX, trunkY, 2 * scale, this.trunkHeight);
        ctx.fillRect(trunkX, trunkY, this.trunkWidth, 2 * scale);
        
        ctx.fillStyle = '#654321';
        const barkLines = Math.floor(this.trunkHeight / (8 * scale));
        for (let i = 0; i < barkLines; i++) {
            const lineY = trunkY + 4 * scale + i * 8 * scale;
            const lineVariation = ((this.treeSeed + i * 67) % 100) / 100;
            const lineLength = this.trunkWidth * (0.6 + lineVariation * 0.3);
            const lineX = trunkX + (this.trunkWidth - lineLength) / 2;
            
            ctx.fillRect(lineX, lineY, lineLength, 1 * scale);
            
            if (i % 3 === 0) {
                ctx.fillRect(trunkX + this.trunkWidth * 0.3, lineY - 2 * scale, 1 * scale, 4 * scale);
            }
        }
    }

    renderCrown() {
        if (this.hasBeenEaten) {
            return;
        }
        const scale = tileSize / baseTileSize;
        const crownX = -this.crownWidth / 2;
        const crownY = -this.crownHeight;
        
        ctx.fillStyle = '#31AB31';
        ctx.fillRect(crownX, crownY, this.crownWidth, this.crownHeight);
        
        const shadowSize = Math.max(1, Math.floor(this.size / 32));
        
        ctx.fillStyle = '#006400';
        ctx.fillRect(crownX + this.crownWidth - shadowSize, crownY, shadowSize, this.crownHeight);
        ctx.fillRect(crownX, crownY + this.crownHeight - shadowSize, this.crownWidth, shadowSize);
        
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(crownX, crownY, shadowSize, this.crownHeight);
        ctx.fillRect(crownX, crownY, this.crownWidth, shadowSize);
        
        ctx.fillStyle = '#228B22';
        const leafClusters = Math.floor(this.crownWidth / (6 * scale));
        for (let i = 0; i < leafClusters; i++) {
            const leafX = crownX + 3 * scale + ((this.treeSeed + i * 37) % 100) / 100 * (this.crownWidth - 6 * scale);
            const leafY = crownY + 3 * scale + ((this.treeSeed + i * 71) % 100) / 100 * (this.crownHeight - 6 * scale);
            
            ctx.fillRect(leafX, leafY, 2 * scale, 2 * scale);
            ctx.fillRect(leafX + 1 * scale, leafY - 1 * scale, 1 * scale, 1 * scale);
            ctx.fillRect(leafX - 1 * scale, leafY + 1 * scale, 1 * scale, 1 * scale);
        }
    }

    renderBranches() {
        const scale = tileSize / baseTileSize;
        ctx.fillStyle = '#8B4513';
        const branches = Math.floor(this.trunkHeight / (15 * scale));
        
        for (let i = 0; i < branches; i++) {
            const branchY = this.trunkHeight * 0.3 + i * (this.trunkHeight * 0.5 / branches);
            const branchSide = ((this.treeSeed + i * 43) % 2) === 0 ? -1 : 1;
            const branchLength = (4 + ((this.treeSeed + i * 53) % 100) / 100 * 6) * scale;
            
            const branchStartX = branchSide * this.trunkWidth / 2;
            const branchEndX = branchStartX + branchSide * branchLength;
            
            ctx.fillRect(
                Math.min(branchStartX, branchEndX), 
                branchY - 1 * scale, 
                Math.abs(branchEndX - branchStartX), 
                2 * scale
            );
            
            ctx.fillStyle = '#228B22';
            ctx.fillRect(branchEndX - 1 * scale, branchY - 2 * scale, 3 * scale, 3 * scale);
            ctx.fillStyle = '#8B4513';
        }
    }

    renderDetailedRock() {
        const baseColor = this.getRockColor();
        const shadowColor = this.darkenRockColor(baseColor, 0.6);
        const highlightColor = this.lightenRockColor(baseColor, 1.4);
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        const shadowSize = Math.max(1, Math.floor(this.size / 8));
        
        ctx.fillStyle = shadowColor;
        ctx.fillRect(-this.width/2 + this.width - shadowSize, -this.height/2, shadowSize, this.height);
        ctx.fillRect(-this.width/2, -this.height/2 + this.height - shadowSize, this.width, shadowSize);
        
        ctx.fillStyle = highlightColor;
        ctx.fillRect(-this.width/2, -this.height/2, shadowSize, this.height);
        ctx.fillRect(-this.width/2, -this.height/2, this.width, shadowSize);
        
        this.addRockTexture(baseColor, shadowColor);
    }

    getRockColor() {
        const baseGray = 128;
        const variation = this.colorVariation;
        const finalGray = Math.max(80, Math.min(180, baseGray + variation));
        
        if (this.rockType === 'large') {
            const r = Math.floor(finalGray * 0.9);
            const g = Math.floor(finalGray * 0.85);
            const b = Math.floor(finalGray * 0.8);
            return `rgb(${r}, ${g}, ${b})`;
        } else if (this.rockType === 'small') {
            const factor = 1.1;
            const r = Math.min(255, Math.floor(finalGray * factor));
            const g = Math.min(255, Math.floor(finalGray * factor));
            const b = Math.min(255, Math.floor(finalGray * factor));
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            return `rgb(${finalGray}, ${finalGray}, ${finalGray})`;
        }
    }

    darkenRockColor(color, factor) {
        const matches = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (matches) {
            const r = Math.floor(parseInt(matches[1]) * factor);
            const g = Math.floor(parseInt(matches[2]) * factor);
            const b = Math.floor(parseInt(matches[3]) * factor);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return '#444444';
    }

    lightenRockColor(color, factor) {
        const matches = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (matches) {
            const r = Math.min(255, Math.floor(parseInt(matches[1]) * factor));
            const g = Math.min(255, Math.floor(parseInt(matches[2]) * factor));
            const b = Math.min(255, Math.floor(parseInt(matches[3]) * factor));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return '#CCCCCC';
    }

    addRockTexture(baseColor, shadowColor) {
    }

    update(deltaTime) {
        if (this.type === 'cactus' && !this.hasFlower && this.flowerRegrowTime) {
            this.timeSinceFlowerEaten += deltaTime;
            
            if (this.timeSinceFlowerEaten >= this.flowerRegrowTime) {
                // Neue Blüte wächst nach
                this.hasFlower = true;
                this.timeSinceFlowerEaten = 0;
                console.log('🌺 Kakteen-Blüte ist nachgewachsen!');
            }
        }
    }
}


// ===================================
// PLACEMENT SYSTEM FUNKTIONEN
// ===================================

function startPlacementPhase() {
    console.log('🎯 Platzierungsphase gestartet');
    
    placementPhase = true;
    placementTimeRemaining = 15;
    placementStartTime = Date.now();
    currentPlacementGroup = 0;
    groupPlacements = [];
    
    // UI anzeigen
    const placementUI = document.getElementById('placementPhase');
    placementUI.style.display = 'block';

    document.getElementById('gameHud').style.display = 'none';
    document.getElementById('infoPanel').style.display = 'none';
    document.getElementById('timerDisplay').style.display = 'none';
    document.getElementById('gameControls').style.display = 'none';
    document.getElementById('sessionInfo').style.display = 'none';
    
    
    // Canvas für Placement-Mode vorbereiten
    canvas.classList.add('placement-mode');
    
    // Placement-Zone visualisieren
    createPlacementZoneOverlay();
    
    // Gruppen-Info aktualisieren
    updatePlacementUI();
    
    // Click-Handler registrieren
    canvas.addEventListener('mousedown', handlePlacementMouseDown);
    canvas.addEventListener('mousemove', handlePlacementMouseMove);
    canvas.addEventListener('mouseup', handlePlacementMouseUp);
    
    // Timer starten
    requestAnimationFrame(updatePlacementTimer);
}

function createPlacementZoneOverlay() {
    // Overlay-Element erstellen
    placementZoneOverlay = document.createElement('div');
    placementZoneOverlay.className = 'placement-zone-overlay';
    
    // Position und Größe berechnen
    const leftBound = mapWidth * 0.05 * tileSize + terrainOffsetX;
    const rightBound = mapWidth * 0.45 * tileSize + terrainOffsetX;
    const topBound = 1 * tileSize + terrainOffsetY;
    const bottomBound = (mapHeight - 2) * tileSize + terrainOffsetY;
    
    placementZoneOverlay.style.left = leftBound + 'px';
    placementZoneOverlay.style.top = topBound + 'px';
    placementZoneOverlay.style.width = (rightBound - leftBound) + 'px';
    placementZoneOverlay.style.height = (bottomBound - topBound) + 'px';
    
    document.querySelector('.game-container').appendChild(placementZoneOverlay);
}

function updatePlacementZoneOverlay() {
    if (!placementZoneOverlay) return;
    
    // Position und Größe neu berechnen (für Zoom/Scroll)
    const leftBound = mapWidth * 0.05 * tileSize + terrainOffsetX;
    const rightBound = mapWidth * 0.45 * tileSize + terrainOffsetX;
    const topBound = 1 * tileSize + terrainOffsetY;
    const bottomBound = (mapHeight - 2) * tileSize + terrainOffsetY;
    
    placementZoneOverlay.style.left = leftBound + 'px';
    placementZoneOverlay.style.top = topBound + 'px';
    placementZoneOverlay.style.width = (rightBound - leftBound) + 'px';
    placementZoneOverlay.style.height = (bottomBound - topBound) + 'px';
}

function updatePlacementUI() {
    const totalGroups = levelData.populationData.filter(species => !species.population.isExtinct).length;
    
    // Gruppen-Zähler aktualisieren
    document.getElementById('placedCount').textContent = groupPlacements.length;
    document.getElementById('totalGroups').textContent = totalGroups;
    
    // Aktuelle Gruppe anzeigen
    if (currentPlacementGroup < totalGroups) {
        const activeGroups = levelData.populationData.filter(species => !species.population.isExtinct);
        const currentSpecies = activeGroups[currentPlacementGroup];
        document.getElementById('currentGroupName').textContent = `🦕 ${currentSpecies.name}`;
    } else {
        document.getElementById('currentGroupName').textContent = '✅ Alle Gruppen platziert!';
    }
}

function updatePlacementTimer() {
    if (!placementPhase) return;
    
    const elapsed = (Date.now() - placementStartTime) / 1000;
    placementTimeRemaining = Math.max(0, 15 - elapsed);
    
    // Timer-Text aktualisieren
    const timerText = document.getElementById('placementTimer');
    timerText.textContent = Math.ceil(placementTimeRemaining);
    
    // Timer-Kreis Animation
    const timerProgress = document.getElementById('timerProgress');
    const circumference = 2 * Math.PI * 25; // Radius = 50
    const offset = circumference * (1 - placementTimeRemaining / 15);
    timerProgress.style.strokeDashoffset = offset;
    
    // Farbe ändern wenn Zeit knapp wird
    if (placementTimeRemaining <= 5) {
        timerProgress.style.stroke = '#ff4444';
        timerText.style.color = '#ff4444';
    } else if (placementTimeRemaining <= 10) {
        timerProgress.style.stroke = '#ffa500';
        timerText.style.color = '#ffa500';
    }
    
    // Zeit abgelaufen?
    if (placementTimeRemaining <= 0) {
        endPlacementPhase();
    } else {
        requestAnimationFrame(updatePlacementTimer);
    }
}

function handlePlacementClick(event) {
    if (!placementPhase) return;
    
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
                setTimeout(() => endPlacementPhase(), 500); // Kurze Verzögerung für besseres Feedback
            }
        }
    } else {
        // Visuelles Feedback für ungültigen Klick
        showInvalidClickFeedback(mouseX, mouseY);
        console.log('❌ Klick außerhalb des erlaubten Bereichs');
    }
}

function showPlacementMarker(x, y) {
    const marker = document.createElement('div');
    marker.className = 'placement-marker';
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    document.querySelector('.game-container').appendChild(marker);
    
    // Nach 2 Sekunden entfernen
    setTimeout(() => {
        marker.remove();
    }, 2000);
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

function endPlacementPhase() {
    console.log('🏁 Platzierungsphase beendet');
    
    placementPhase = false;
    
    // Placement UI ausblenden
    document.getElementById('placementPhase').style.display = 'none';
    
    // ANDERE UI-ELEMENTE WIEDER EINBLENDEN
    document.getElementById('gameHud').style.display = 'block';
    document.getElementById('infoPanel').style.display = 'block';
    document.getElementById('timerDisplay').style.display = 'block';
    document.getElementById('gameControls').style.display = 'block';
    document.getElementById('sessionInfo').style.display = 'block';
    
    canvas.classList.remove('placement-mode');
    
    // Click-Handler entfernen
    canvas.removeEventListener('mousedown', handlePlacementMouseDown);
    canvas.removeEventListener('mousemove', handlePlacementMouseMove);
    canvas.removeEventListener('mouseup', handlePlacementMouseUp);
    
    // Overlay entfernen
    if (placementZoneOverlay) {
        placementZoneOverlay.remove();
        placementZoneOverlay = null;
    }
    
    // Dinos spawnen
    spawnDinosWithPlacements();

    const allDinos = gameObjects.filter(obj => obj instanceof Dino);
    allDinos.forEach(dino => {
        pregnancyManager.initializeDino(dino);
    });
    
    // Level-Timer starten
    startLevelTimer();;
}

function spawnDinosWithPlacements() {
    const objectCounts = { ownDinos: 0, enemyDinos: 0 };
    let groupIndex = 0;
    
    // Eigene Dinos spawnen
    levelData.populationData.forEach((species, speciesIndex) => {
        if (!species.population.isExtinct) {
            // Prüfen ob für diese Gruppe eine Position gewählt wurde
            const placement = groupPlacements.find(p => p.groupIndex === groupIndex);
            
            let centerTileX, centerTileY;
            
            if (placement) {
                // Spieler hat Position gewählt
                centerTileX = placement.x;
                centerTileY = placement.y;
                console.log(`✅ Spawne ${species.name} an gewählter Position: (${centerTileX.toFixed(1)}, ${centerTileY.toFixed(1)})`);
            } else {
                // Zufällige Position (wie vorher)
                const spawnWidth = mapWidth * 0.25;
                centerTileX = mapWidth * 0.05 + Math.random() * spawnWidth;
                centerTileY = 2 + Math.random() * (mapHeight * 0.8);
                console.log(`🎲 Spawne ${species.name} an zufälliger Position: (${centerTileX.toFixed(1)}, ${centerTileY.toFixed(1)})`);
            }
            
            // Erwachsene spawnen
            for (let i = 0; i < species.population.adults; i++) {
                let dinoPlaced = false;
                let attempts = 0;
                while (!dinoPlaced && attempts < 50) {
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const finalTileX = Math.max(2, Math.min(mapWidth * 0.45, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));
                    const newDino = new Dino(finalTileX, finalTileY, species, true, false);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {
                        gameObjects.push(newDino);
                        newDino.updateScale();
                        objectCounts.ownDinos++;
                        dinoPlaced = true;
                    }
                    attempts++;
                }
            }
            
            // Jungtiere spawnen
            for (let i = 0; i < species.population.juveniles; i++) {
                let dinoPlaced = false;
                let attempts = 0;
                while (!dinoPlaced && attempts < 50) {
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const finalTileX = Math.max(2, Math.min(mapWidth * 0.45, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));
                    const newDino = new Dino(finalTileX, finalTileY, species, false, false);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {
                        gameObjects.push(newDino);
                        objectCounts.ownDinos++;
                        dinoPlaced = true;
                    }
                    attempts++;
                }
            }
            
            groupIndex++;
        }
    });
    
    // Feinde spawnen (unverändert)
    generateEnemyDinosFromData(objectCounts);
    
    // Combat-System initialisieren
    initializeCombatForAllDinos();
    
    // HUD aktualisieren
    updateHUD();
    
    console.log(`✅ Spawning abgeschlossen: ${objectCounts.ownDinos} eigene Dinos, ${objectCounts.enemyDinos} Feinde`);
}

// ===================================
// LEVEL GENERATION
// ===================================

function generateLevel() {
    if (!levelData) {
        console.error('❌ Keine Level-Daten verfügbar');
        return;
    } 
    calculateRandomLevelResources();
    calculateRandomMapWidth();

    //setLoadingText('Generiere Terrain...');
    generateTileMap();
    
    gameObjects = [];
    let objectCounts = { trees: 0, rocks: 0, rodents: 0, ownDinos: 0, enemyDinos: 0 };
    
    setLoadingText('Platziere Umgebung...');
    generateEnvironment(objectCounts);
    
    setLoadingText('Erwecke Dinosaurier...');
    //generateOwnDinosFromData(objectCounts);
    //generateEnemyDinosFromData(objectCounts);    
    updateAllObjectScales();
    updateHUD();
    
    setLoadingText('Level wird geladen...');
}

function generateOwnDinosFromData(objectCounts) {
    levelData.populationData.forEach((species, speciesIndex) => {
        if (!species.population.isExtinct) {
            const spawnWidth = mapWidth * 0.25;
            const centerTileX = 5 + Math.random() * spawnWidth;
            const centerTileY = 2 + Math.random() * (mapHeight * 0.8); // Von Zeile 2 bis 80% der Karte

            
            for (let i = 0; i < species.population.adults; i++) {
                let dinoPlaced = false;
                while (!dinoPlaced) {                               
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const finalTileX = Math.max(2, Math.min(mapWidth * 0.45, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));                              
                    const newDino = new Dino(finalTileX, finalTileY, species, true, false);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {                                
                        gameObjects.push(newDino);
                        objectCounts.ownDinos++;
                        dinoPlaced = true;
                    }                            
                }
            }
            
            for (let i = 0; i < species.population.juveniles; i++) {
                let dinoPlaced = false;
                while (!dinoPlaced) {     
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const finalTileX = Math.max(2, Math.min(mapWidth * 0.45, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));                              
                    const newDino = new Dino(finalTileX, finalTileY, species, true, false);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {                                
                        gameObjects.push(newDino);
                        objectCounts.ownDinos++;
                        dinoPlaced = true;                                
                    }
                }
            }
        }
    });
}

function generateEnemyDinosFromData(objectCounts) {   
    if (!levelData.enemyData || levelData.enemyData.length === 0) {
        return;
    }
    
    levelData.enemyData.forEach((species, speciesIndex) => {
        if (!species.population.isExtinct) {           
            const centerTileX = 5 + mapWidth * 0.65 + Math.random() * (mapWidth * 0.25);
            const centerTileY = mapHeight * 0.4 + Math.random() * (mapHeight * 0.4);
            for (let i = 0; i < species.population.adults; i++) {
                let dinoPlaced = false;
                while (!dinoPlaced) {                               
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const minEnemyX = mapWidth * 0.55;
                    const finalTileX = Math.max(minEnemyX, Math.min(mapWidth - 2, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));
                    const newDino = new Dino(finalTileX, finalTileY, species, true, true);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {                                
                        gameObjects.push(newDino);
                        objectCounts.enemyDinos++;
                        dinoPlaced = true;
                    }                            
                }
            }          
            for (let i = 0; i < species.population.juveniles; i++) {
                let dinoPlaced = false;
                while (!dinoPlaced) {     
                    const position = findValidLandPosition(centerTileX, centerTileY, 8);
                    const finalTileX = Math.max(mapWidth * 0.55, Math.min(mapWidth - 2, position.tileX));
                    const finalTileY = Math.max(1, Math.min(mapHeight - 2, position.tileY));                             
                    const newDino = new Dino(finalTileX, finalTileY, species, true, true);
                    
                    if (isPositionValidFor(newDino, finalTileX, finalTileY, "movement")) {                                
                        gameObjects.push(newDino);
                        objectCounts.enemyDinos++;
                        dinoPlaced = true;                                
                    }
                }
            }
        }
    });
}

function generateEnvironment(objectCounts) {
    generateTreeGroups(objectCounts);
    generateRockGroups(objectCounts);
    generateRodentGroups(objectCounts);
    generateCactiGroups(objectCounts);
}

function generateCactiGroups(objectCounts) {
    // Nur auf Wüstenkacheln spawnen
    let cactiCount = 0;
    
    for (let y = 1; y < mapHeight -1; y++) {
        for (let x = 1; x < mapWidth-1; x++) {
            if (tileMap[y][x] === TILE_TYPES.DESERT) {
                // 10% Chance für Kakteen-Gruppe pro Wüstenkachel
                if (Math.random() < 0.05) {
                    // 1-3 Kakteen pro Gruppe
                    const groupSize = Math.floor(Math.random() * 3) + 1;
                    
                    for (let i = 0; i < groupSize; i++) {
                        // Zufällige Position innerhalb der Kachel mit etwas Abstand
                        const offsetX = 0.2 + Math.random() * 0.6;
                        const offsetY = 0.2 + Math.random() * 0.6;
                        
                        const cactus = new EnvironmentObject(
                            x + offsetX,
                            y + offsetY,
                            'cactus',
                            {
                                flowerColor: Math.random() < 0.5 ? '#FF69B4' : '#FFD700' // Pink oder Gold
                            }
                        );
                        
                        gameObjects.push(cactus);
                        cactiCount++;
                    }
                }
            }
        }
    }
    
    objectCounts.cacti = cactiCount;
}

function generateTreeGroups(objectCounts) {
    const abundanceFactor = levelBiome.plantAbundance;
    
    // Basis-Werte
    const baseGroups = 4;
    const baseSingleTrees = 3;
    
    let groupCount, singleTrees, treesPerGroup;
    
    if (abundanceFactor < 0.5) {
        // Wenig Pflanzen: Spärliche Vegetation
        groupCount = Math.max(1, Math.floor(baseGroups * abundanceFactor));
        singleTrees = Math.max(1, Math.floor(baseSingleTrees * abundanceFactor));
        treesPerGroup = 2 + Math.floor(Math.random() * 3); // 2-4 Bäume pro Gruppe
    } else if (abundanceFactor > 2.0) {
        // Viele Pflanzen: Dichte Wälder
        const extraGroups = Math.floor((abundanceFactor - 1.0) * 4);
        const extraSingles = Math.floor((abundanceFactor - 1.0) * 6);
        
        groupCount = baseGroups + extraGroups + Math.floor(Math.random() * 6);
        singleTrees = baseSingleTrees + extraSingles + Math.floor(Math.random() * 10);
        treesPerGroup = 4 + Math.floor(Math.random() * 8); // 4-11 Bäume pro Gruppe
    } else {
        // Normal: Standard mit Variation
        const extraGroups = Math.floor((mapWidth - baseMapWidth) / 10);
        const extraSingles = Math.floor((mapWidth - baseMapWidth) / 15);
        
        groupCount = Math.floor((baseGroups + extraGroups) * abundanceFactor) + Math.floor(Math.random() * 4);
        singleTrees = Math.floor((baseSingleTrees + extraSingles) * abundanceFactor) + Math.floor(Math.random() * 5);
        treesPerGroup = 3 + Math.floor(Math.random() * 5); // 3-7 Bäume pro Gruppe
    }
    
    for (let group = 0; group < groupCount; group++) {
        let groupCenterTileX = 5 + Math.random() * (mapWidth - 10);
        let groupCenterTileY = mapHeight * 0.4 + Math.random() * (mapHeight * 0.4);
        
        // Variable Bäume pro Gruppe
        const actualTreesInGroup = Math.floor(treesPerGroup * (0.7 + Math.random() * 0.6)); // ±30% Variation
        
        for (let i = 0; i < actualTreesInGroup; i++) {
            const position = findValidTreePosition(groupCenterTileX, groupCenterTileY, 4);
            
            if (position.valid) {
                gameObjects.push(new EnvironmentObject(position.tileX, position.tileY, 'tree'));
                objectCounts.trees++;
            }
        }
    }
    
    // Einzelne Bäume
    for (let i = 0; i < singleTrees; i++) {
        const position = findValidTreePosition(
            Math.random() * mapWidth, 
            mapHeight * 0.3 + Math.random() * (mapHeight * 0.5), 
            0
        );
        
        if (position.valid) {
            gameObjects.push(new EnvironmentObject(position.tileX, position.tileY, 'tree'));
            objectCounts.trees++;
        }
    }
}

function generateRockGroups(objectCounts) {
    const rockGroups = 8;
    
    for (let group = 0; group < rockGroups; group++) {
        const groupCenterTileX = 5 + Math.random() * (mapWidth - 10);
        const groupCenterTileY = mapHeight * 0.5 + Math.random() * (mapHeight * 0.4);
        
        const rocksInGroup = 3 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < rocksInGroup; i++) {
            const rockType = i === 0 ? 'large' : (Math.random() < 0.5 ? 'medium' : 'small');
            const maxDistance = i === 0 ? 0.5 : 2.0;
            
            const position = findValidLandPosition(groupCenterTileX, groupCenterTileY, maxDistance);
            
            if (position.valid) {
                gameObjects.push(new EnvironmentObject(position.tileX, position.tileY, 'rock', {
                    rockType: rockType,
                    isGroupLeader: i === 0,
                    groupIndex: group
                }));
                objectCounts.rocks++;
            }
        }
    }
}

function generateRodentGroups(objectCounts) {
    const abundanceFactor = levelBiome.rodentAbundance;
    
    const baseRodentGroups = 8;
    const extraRodentGroups = Math.floor((mapWidth - baseMapWidth) / 12);
    
    let rodentGroups, rodentsPerGroup;
    
    if (abundanceFactor < 0.4) {
        // Wenig Nagetiere: Seltene Beute
        rodentGroups = Math.max(2, Math.floor((baseRodentGroups + extraRodentGroups) * abundanceFactor));
        rodentsPerGroup = 1 + Math.floor(Math.random() * 2); // 1-2 pro Gruppe
    } else if (abundanceFactor > 1.5) {
        // Viele Nagetiere: Reichhaltige Jagdgründe
        const extraGroups = Math.floor((abundanceFactor - 1.0) * 8);
        rodentGroups = baseRodentGroups + extraRodentGroups + extraGroups;
        rodentsPerGroup = 2 + Math.floor(Math.random() * 5); // 2-6 pro Gruppe
    } else {
        // Normal: Standard-Verteilung
        rodentGroups = Math.floor((baseRodentGroups + extraRodentGroups) * abundanceFactor);
        rodentsPerGroup = 1 + Math.floor(Math.random() * 3); // 1-3 pro Gruppe
    }
  
    for (let i = 0; i < rodentGroups; i++) {
        const centerTileX = 5 + Math.random() * (mapWidth - 10);
        const centerTileY = mapHeight * 0.6 + Math.random() * (mapHeight * 0.3);
        
        // Variable Nagetiere pro Gruppe
        const actualRodentsInGroup = Math.floor(rodentsPerGroup * (0.6 + Math.random() * 0.8)); // ±40% Variation
        
        for (let j = 0; j < actualRodentsInGroup; j++) {
            const position = findValidLandPosition(centerTileX, centerTileY, 2.0);
            
            if (position.valid) {
                gameObjects.push(new EnvironmentObject(position.tileX, position.tileY, 'rodent'));
                objectCounts.rodents++;
            }
        }
    }
}



// ===================================
// TERRAIN-GENERATION
// ===================================

function simpleNoise(x, y, seed = 1000) {
    let n = Math.sin((x * 127.1 + y * 311.7) * 43758.5453 + seed);
    return (n - Math.floor(n));
}

function getTileTypeAtPosition(tileX, tileY) {
    if (tileY < 0 || tileY >= mapHeight || tileX < 0 || tileX >= mapWidth) {
        return TILE_TYPES.GRASS;
    }
    
    if (tileMap[tileY] && tileMap[tileY][tileX] !== undefined) {
        return tileMap[tileY][tileX];
    }
    
    return TILE_TYPES.GRASS;
}

function findValidLandPosition(centerTileX, centerTileY, maxDistanceInTiles, attempts = 50) { 
    for (let attempt = 0; attempt < attempts; attempt++) {
        let testTileX, testTileY;
        
        if (maxDistanceInTiles === 0) {
            testTileX = centerTileX;
            testTileY = centerTileY;
        } else {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * maxDistanceInTiles;
            testTileX = centerTileX + Math.cos(angle) * distance;
            testTileY = centerTileY + Math.sin(angle) * distance;
        }
        
        const bounded = PositionUtils.clampPosition(
            testTileX, testTileY,
            1, mapWidth - 2,
            1, mapHeight - 2  // ← GEÄNDERT: von 6 auf 1
        );
        const boundedTileX = bounded.x;
        const boundedTileY = bounded.y;
        
        const tileType = getTileTypeAtPosition(Math.floor(boundedTileX), Math.floor(boundedTileY));
        
        if (tileType !== TILE_TYPES.WATER) {
            return { tileX: boundedTileX, tileY: boundedTileY, valid: true };
        }
    }

    for (let y = Math.floor(mapHeight * 0.3); y < mapHeight - 2; y++) {
        for (let x = 1; x < mapWidth - 2; x++) {
            const tileType = getTileTypeAtPosition(x, y);
            if (tileType !== TILE_TYPES.WATER) {
                // console.log(`  ✓ Fallback Position: (${x}, ${y})`);
                return { tileX: x, tileY: y, valid: true };
            }
        }
    }
    
    // console.log(`  ❌ Auch Fallback fehlgeschlagen!`);
    return { tileX: centerTileX, tileY: centerTileY, valid: false };
}


function findValidTreePosition(centerTileX, centerTileY, maxDistanceInTiles, attempts = 50) {
    for (let attempt = 0; attempt < attempts; attempt++) {
        let testTileX, testTileY;
        
        if (maxDistanceInTiles === 0) {
            testTileX = centerTileX;
            testTileY = centerTileY;
        } else {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * maxDistanceInTiles;
            testTileX = centerTileX + Math.cos(angle) * distance;
            testTileY = centerTileY + Math.sin(angle) * distance;
        }
        
        const bounded = PositionUtils.clampPosition(
            testTileX, testTileY,
            1, mapWidth - 2,
            1, mapHeight - 2
        );
        const boundedTileX = bounded.x;
        const boundedTileY = bounded.y;
        
        const tileType = getTileTypeAtPosition(Math.floor(boundedTileX), Math.floor(boundedTileY));
        
        if (tileType !== TILE_TYPES.WATER) {
            // NEU: Prüfe Wasser-Distanz für Bäume
            const waterDistance = getDistanceToWater(Math.floor(boundedTileX), Math.floor(boundedTileY));
            
            // Bäume nur bis 20 Kacheln vom Wasser entfernt
            if (waterDistance <= 20) {
                return { tileX: boundedTileX, tileY: boundedTileY, valid: true };
            }
        }
    }
    
    return { tileX: centerTileX, tileY: centerTileY, valid: false };
}

function generateTileMap() {
    const canvasTileSizeByWidth = canvas.width / mapWidth;
    const canvasTileSizeByHeight = canvas.height / mapHeight;
    const canvasTileSize = Math.min(canvasTileSizeByWidth, canvasTileSizeByHeight);
    
    tileSize = Math.max(minTileSize, Math.min(maxTileSize, canvasTileSize * currentZoom));  
    tileMap = [];

    for (let y = 0; y < mapHeight; y++) {
        tileMap[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            // Alle Zeilen bekommen normales Terrain
            tileMap[y][x] = TILE_TYPES.DIRT;
        }
    }

    generateLakesWithAbundance();
    generateGrassAroundWater();
    smoothTerrain();
}


function generateLakesWithAbundance() {
    // Basis-Seen-Anzahl basierend auf Biom
    const baseLakeCount = 2;
    const abundanceFactor = levelBiome.waterAbundance;
    
    let lakeCount, avgLakeSize;
    
    if (abundanceFactor < 0.5) {
        // Wenig Wasser: Wenige, kleine Seen
        lakeCount = Math.max(1, Math.floor(baseLakeCount * abundanceFactor));
        avgLakeSize = 30 + Math.random() * 40; // 30-70
    } else if (abundanceFactor > 1.5) {
        // Viel Wasser: Viele oder große Seen
        const extraLakes = Math.floor((abundanceFactor - 1.0) * 3);
        lakeCount = baseLakeCount + extraLakes + Math.floor(Math.random() * 3);
        avgLakeSize = 50 + Math.random() * 80; // 50-130
    } else {
        // Normal: Standard mit leichter Variation
        lakeCount = baseLakeCount + Math.floor(Math.random() * 2);
        avgLakeSize = 40 + Math.random() * 60; // 40-100
    }

    for (let i = 0; i < lakeCount; i++) {
        const seedX = 10 + Math.floor(Math.random() * (mapWidth - 20));
        const seedY = 10 + Math.floor(Math.random() * (mapHeight - 20));
        
        // Größenvariation ±30%
        const sizeVariation = 0.7 + Math.random() * 0.6; // 0.7 bis 1.3
        const targetSize = Math.floor(avgLakeSize * sizeVariation);
        
        growLake(seedX, seedY, targetSize);
    }
}

function growLake(startX, startY, targetSize) {
    const waterTiles = [{x: startX, y: startY}];
    
    if (isValidPosition(startX, startY)) {
        tileMap[startY][startX] = TILE_TYPES.WATER;
    }
    
    while (waterTiles.length < targetSize) {
        const expansion = [];
        
        for (const waterTile of waterTiles) {
            const directions = [[-1,0], [1,0], [0,-1], [0,1]];
            
            for (const [dx, dy] of directions) {
                const newX = waterTile.x + dx;
                const newY = waterTile.y + dy;
                
                if (isValidPosition(newX, newY) && 
                    tileMap[newY][newX] !== TILE_TYPES.WATER) {
                    
                    if (!expansion.some(e => e.x === newX && e.y === newY)) {
                        expansion.push({x: newX, y: newY});
                    }
                }
            }
        }
        
        if (expansion.length === 0) {
            break;
        }
        
        const expansionsThisRound = Math.min(
            expansion.length, 
            targetSize - waterTiles.length,
            1 + Math.floor(Math.random() * 4)
        );
        
        for (let i = 0; i < expansionsThisRound; i++) {
            const randomIndex = Math.floor(Math.random() * expansion.length);
            const candidate = expansion.splice(randomIndex, 1)[0];
            
            tileMap[candidate.y][candidate.x] = TILE_TYPES.WATER;
            waterTiles.push(candidate);
            
            if (waterTiles.length >= targetSize) {
                break;
            }
        }
    }
}

function generateGrassAroundWater() {
    const newMap = JSON.parse(JSON.stringify(tileMap));
    
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (tileMap[y][x] !== TILE_TYPES.WATER) {
                const waterDistance = getDistanceToWater(x, y);
                
                // Wüsten-System ab Distanz 25
                if (waterDistance >= 55) {
                    // Ab 40: Fast nur Wüste (90% Wahrscheinlichkeit)
                    if (Math.random() < 0.95) {
                        newMap[y][x] = TILE_TYPES.DESERT;
                    } else {
                        newMap[y][x] = TILE_TYPES.DIRT;
                    }
                } else if (waterDistance >= 18) {
                    // 25-39: Mischgebiet (Wahrscheinlichkeit steigt linear)
                    const desertProbability = (waterDistance - 18) / 25; // 0% bei 25, 100% bei 40
                    
                    if (Math.random() < desertProbability) {
                        newMap[y][x] = TILE_TYPES.DESERT;
                    } else {
                        newMap[y][x] = TILE_TYPES.DIRT;
                    }
                } else if (waterDistance > 15) {
                    // 16-24: Nur normales Terrain (kein Gras, keine Wüste)
                    newMap[y][x] = TILE_TYPES.DIRT;
                } else {
                    // 1-15: Gras-System (wie vorher)
                    let grassProbability = 0;
                    if (waterDistance === 1) {
                        grassProbability = 0.9;
                    } else if (waterDistance === 2) {
                        grassProbability = 0.7;
                    } else if (waterDistance === 3) {
                        grassProbability = 0.4;
                    } else if (waterDistance <= 5) {
                        grassProbability = 0.2;
                    } else {
                        grassProbability = 0.1;
                    }
                    
                    if (Math.random() < grassProbability) {
                        newMap[y][x] = TILE_TYPES.GRASS;
                    }
                }
            }
        }
    }  

    tileMap = newMap;
    
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (tileMap[y][x] === TILE_TYPES.DIRT || tileMap[y][x] === TILE_TYPES.DESERT) {
                const waterDistance = getDistanceToWater(x, y);
                
                let dryGrassProbability = 0;
                
                if (waterDistance >= 14 && waterDistance <= 35) {
                    if (tileMap[y][x] === TILE_TYPES.DIRT) {
                        dryGrassProbability = 0.08; // 8% Chance
                    }
                    else if (tileMap[y][x] === TILE_TYPES.DESERT) {
                        dryGrassProbability = 0.05; // 5% Chance
                    }
                    
                    if (Math.random() < dryGrassProbability) {
                        tileMap[y][x] = TILE_TYPES.DRY_GRASS;
                    }
                }
            }
        }
    }   
}

function getDistanceToWater(x, y) {
    let minDistance = Infinity;
    
    for (let dy = -40; dy <= 40; dy++) {
        for (let dx = -40; dx <= 40; dx++) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (isValidPosition(checkX, checkY) && 
                tileMap[checkY][checkX] === TILE_TYPES.WATER) {
                const distance = Math.abs(dx) + Math.abs(dy);
                minDistance = Math.min(minDistance, distance);
            }
        }
    }
    
    return minDistance === Infinity ? 999 : minDistance;
}

function smoothTerrain() {
    const iterations = 1;
    
    for (let iter = 0; iter < iterations; iter++) {
        const newMap = JSON.parse(JSON.stringify(tileMap));
        
        for (let y = 1; y < mapHeight - 1; y++) {
            for (let x = 1; x < mapWidth - 1; x++) {
                if (tileMap[y][x] === TILE_TYPES.DIRT) {
                    const nearbyGrass = countNearbyType(x, y, TILE_TYPES.GRASS);
                    if (nearbyGrass >= 6) {
                        newMap[y][x] = TILE_TYPES.GRASS;
                    }
                }
            }
        }
        
        tileMap = newMap;
    }
}

function countNearbyType(x, y, tileType) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (isValidPosition(checkX, checkY) && 
                tileMap[checkY][checkX] === tileType) {
                count++;
            }
        }
    }
    return count;
}

function isValidPosition(x, y) {
    return x >= 0 && x < mapWidth && y >= 0 && y < mapHeight;
}

// ===================================
// TERRAIN-RENDERING (ANGEPASST FÜR SCROLLING)
// ===================================

function calculateTerrainOffsets() {
    const terrainPixelWidth = mapWidth * tileSize;
    const terrainPixelHeight = mapHeight * tileSize;

    if (terrainPixelWidth < canvas.width) {
        terrainOffsetX = (canvas.width - terrainPixelWidth) / 2 - scrollX;
    } else {
        terrainOffsetX = -scrollX; // Scrolling wenn größer
    }

    if (terrainPixelWidth < canvas.width) {
        terrainOffsetX = (canvas.width - terrainPixelWidth) / 2 - scrollX;
    } else {
        terrainOffsetX = -scrollX; // Scrolling wenn größer
    }
    
    if (terrainPixelHeight < canvas.height) {
        terrainOffsetY = (canvas.height - terrainPixelHeight) / 2 - scrollY;
    } else {
        terrainOffsetY = -scrollY; // Scrolling wenn größer
    }

    if (placementPhase && placementZoneOverlay) {
        updatePlacementZoneOverlay();
    }
}

function renderTerrain() {
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (tileMap[y] && tileMap[y][x] !== undefined) {
                renderTile(x, y, tileMap[y][x], animationTime);
            }
        }
    }
}

function renderTile(x, y, tileType, time = 0) {
    const tileX = x * tileSize + terrainOffsetX;
    const tileY = y * tileSize + terrainOffsetY;
    const colors = TILE_COLORS[tileType];
    
    ctx.fillStyle = colors.base;
    ctx.fillRect(tileX, tileY, tileSize, tileSize);
    
    const shadowSize = Math.max(1, Math.floor(tileSize / 32));
    
    ctx.fillStyle = colors.highlight;
    ctx.fillRect(tileX, tileY, tileSize, shadowSize);
    ctx.fillRect(tileX, tileY, shadowSize, tileSize);
    
    ctx.fillStyle = colors.shadow;
    ctx.fillRect(tileX, tileY + tileSize - shadowSize, tileSize, shadowSize);
    ctx.fillRect(tileX + tileSize - shadowSize, tileY, shadowSize, tileSize);
    
    const noiseSeed = x * 73 + y * 149;
    const scale = tileSize / baseTileSize;
    
    if (tileType === TILE_TYPES.GRASS) {
        const grassColor = `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 1.15)}, 
                                    ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 1.15)}, 
                                    ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 1.15)})`;
        ctx.fillStyle = grassColor;
        
        const grassBlades = 2;
        for (let i = 0; i < grassBlades; i++) {
            const randomX = ((noiseSeed + i * 37) % 100) / 100;
            const randomY = ((noiseSeed + i * 67) % 100) / 100;
            const randomHeight = ((noiseSeed + i * 23) % 100) / 100;
            
            const bladeX = tileX + (2 * scale) + (randomX * (tileSize - 6 * scale));
            const bladeY = tileY + (2 * scale) + (randomY * (tileSize - 12 * scale));
            const bladeWidth = 2 * scale;
            const bladeHeight = 4 * scale + randomHeight * 8 * scale;
            
            if (bladeX >= tileX && bladeX + bladeWidth <= tileX + tileSize &&
                bladeY >= tileY && bladeY + bladeHeight <= tileY + tileSize) {
                ctx.fillRect(bladeX, bladeY, bladeWidth, bladeHeight);
            }
        }
        
        const flowerColor = `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 0.85)}, 
                                    ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 0.85)}, 
                                    ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 0.85)})`;
        ctx.fillStyle = flowerColor;
        
        const flowers = 1;
        for (let i = 0; i < flowers; i++) {
            const randomX = ((noiseSeed + i * 91) % 100) / 100;
            const randomY = ((noiseSeed + i * 113) % 100) / 100;
            
            const flowerSize = 3 * scale;
            const flowerX = tileX + (2 * scale) + (randomX * (tileSize - 4 * scale - flowerSize));
            const flowerY = tileY + (2 * scale) + (randomY * (tileSize - 4 * scale - flowerSize));
            
            if (flowerX >= tileX && flowerX + flowerSize <= tileX + tileSize &&
                flowerY >= tileY && flowerY + flowerSize <= tileY + tileSize) {
                ctx.fillRect(flowerX, flowerY, flowerSize, flowerSize);
            }
        }
    }else if (tileType === TILE_TYPES.DESERT) {
        // Sand-Dünen-Streifen
        ctx.fillStyle = colors.shadow;
        const stripeCount = 2 + Math.floor(scale);
        
        for (let i = 0; i < stripeCount; i++) {
            const randomX = ((noiseSeed + i * 41) % 100) / 100;
            const randomY = ((noiseSeed + i * 83) % 100) / 100;
            const randomWidth = ((noiseSeed + i * 127) % 100) / 100;
            
            const stripeX = tileX + (randomX * tileSize * 0.8);
            const stripeY = tileY + (randomY * tileSize * 0.8);
            const stripeWidth = (2 + randomWidth * 4) * scale;
            const stripeHeight = 1 * scale;
            
            if (stripeX >= tileX && stripeX + stripeWidth <= tileX + tileSize &&
                stripeY >= tileY && stripeY + stripeHeight <= tileY + tileSize) {
                ctx.fillRect(stripeX, stripeY, stripeWidth, stripeHeight);
            }
        }
        
        // Sand-Körner (kleine Punkte)
        ctx.fillStyle = colors.highlight;
        const grainCount = 1 + Math.floor(scale * 0.5);
        
        for (let i = 0; i < grainCount; i++) {
            const randomX = ((noiseSeed + i * 97) % 100) / 100;
            const randomY = ((noiseSeed + i * 151) % 100) / 100;
            
            const grainX = tileX + (randomX * tileSize);
            const grainY = tileY + (randomY * tileSize);
            const grainSize = 1 * scale;
            
            if (grainX >= tileX && grainX + grainSize <= tileX + tileSize &&
                grainY >= tileY && grainY + grainSize <= tileY + tileSize) {
                ctx.fillRect(grainX, grainY, grainSize, grainSize);
            }
        }
    }else if (tileType === TILE_TYPES.DRY_GRASS) {
    // Basis-Rendering ist schon durch TILE_COLORS erledigt
    
    // Seed basiert auf den WELT-Koordinaten, nicht auf Render-Position
    const tileSeed = x * 1000 + y; // Fest an die Tile-Position gebunden
    
    // Weniger Halme für weniger Überlappung
    const grassBlades = 10 + Math.floor(scale);
    
    for (let i = 0; i < grassBlades; i++) {
        // Verwende tileSeed statt noiseSeed für stabile Positionen
        const randomX = ((tileSeed + i * 47) % 100) / 100;
        const randomY = ((tileSeed + i * 71) % 100) / 100;
        const randomHeight = 0.4 + ((tileSeed + i * 31) % 100) / 200; // 0.4-0.9
        const randomWidth = ((tileSeed + i * 59) % 100) / 100;
        const randomColor = ((tileSeed + i * 83) % 100) / 100;
        
        // Position über die gesamte Kachel verteilt
        const margin = 2 * scale;
        const startX = tileX + margin + (randomX * (tileSize - 2 * margin));
        const startY = tileY + margin + (randomY * (tileSize - 2 * margin)); // Über gesamte Höhe
        
        // Länge 70% mehr (war 10, jetzt 17)
        let length = randomHeight * 17 * scale;
        
        // Begrenze die Länge, damit sie nicht über den oberen Rand ragt
        const maxLength = startY - tileY - margin;
        length = Math.min(length, maxLength);
        
        // Breite variiert zwischen dünn und etwas dicker
        if (randomWidth < 0.4) {
            ctx.lineWidth = Math.max(1, 0.5 * scale); // Sehr dünn
        } else if (randomWidth < 0.7) {
            ctx.lineWidth = Math.max(1, 1.0 * scale); // Normal
        } else if (randomWidth < 0.9) {
            ctx.lineWidth = Math.max(1, 1.5 * scale); // Dick
        } else {
            ctx.lineWidth = Math.max(1, 2.0 * scale); // Sehr dick
        }
        
        // Farbe variiert zwischen hellem und dunklem Stroh
        if (randomColor < 0.25) {
            ctx.strokeStyle = '#D4B590'; // Sehr hell
        } else if (randomColor < 0.5) {
            ctx.strokeStyle = '#C4A57B'; // Hell
        } else if (randomColor < 0.75) {
            ctx.strokeStyle = '#B09060'; // Mittel
        } else {
            ctx.strokeStyle = '#9B7B55'; // Dunkel
        }
        
        // Gerader vertikaler Strich
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, startY - length); // Gerade nach oben
        ctx.stroke();
    }
    
    // Weniger kurze Halme, auch über die gesamte Kachel
    const shortBlades = 3 + Math.floor(scale * 0.5);
    
    for (let i = 0; i < shortBlades; i++) {
        // Auch hier tileSeed verwenden
        const randomX = ((tileSeed + i * 197) % 100) / 100;
        const randomY = ((tileSeed + i * 223) % 100) / 100;
        const randomColor = ((tileSeed + i * 251) % 100) / 100;
        
        const margin = 3 * scale;
        const bladeX = tileX + margin + (randomX * (tileSize - 2 * margin));
        const bladeY = tileY + margin + (randomY * (tileSize - 2 * margin)); // Auch über gesamte Höhe
        const bladeHeight = 4 * scale + ((tileSeed + i * 281) % 30) / 10 * scale;
        
        // Begrenze auch hier die Höhe
        const maxHeight = bladeY - tileY - margin;
        const finalHeight = Math.min(bladeHeight, maxHeight);
        
        // Normale Breite für kurze Halme
        ctx.lineWidth = Math.max(1, 1.2 * scale);
        
        // Gleiche Farbpalette wie oben
        if (randomColor < 0.33) {
            ctx.strokeStyle = '#C4A57B'; // Hell
        } else if (randomColor < 0.66) {
            ctx.strokeStyle = '#B09060'; // Mittel  
        } else {
            ctx.strokeStyle = '#9B7B55'; // Dunkel
        }
        
        // Durchgehende Linie
        ctx.beginPath();
        ctx.moveTo(bladeX, bladeY);
        ctx.lineTo(bladeX, bladeY - finalHeight);
        ctx.stroke();
    }
}else if (tileType === TILE_TYPES.DIRT) {
        const rockColor = `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 0.9)}, 
                                ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 0.9)}, 
                                ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 0.9)})`;
        ctx.fillStyle = rockColor;
        
        const rocks = 2;
        for (let i = 0; i < rocks; i++) {
            const randomX = ((noiseSeed + i * 41) % 100) / 100;
            const randomY = ((noiseSeed + i * 83) % 100) / 100;
            const randomSize = ((noiseSeed + i * 29) % 100) / 100;
            
            const rockSize = (4 + randomSize * 6) * scale;
            const rockX = tileX + (2 * scale) + (randomX * (tileSize - 4 * scale - rockSize));
            const rockY = tileY + (2 * scale) + (randomY * (tileSize - 4 * scale - rockSize));
            
            if (rockX >= tileX && rockX + rockSize <= tileX + tileSize &&
                rockY >= tileY && rockY + rockSize <= tileY + tileSize) {
                ctx.fillRect(rockX, rockY, rockSize, rockSize);
            }
        }
        
        const crumbColor = `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 1.1)}, 
                                    ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 1.1)}, 
                                    ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 1.1)})`;
        ctx.fillStyle = crumbColor;
        
        const crumbs = 3;
        for (let i = 0; i < crumbs; i++) {
            const randomX = ((noiseSeed + i * 127) % 100) / 100;
            const randomY = ((noiseSeed + i * 179) % 100) / 100;
            
            const crumbSize = 2 * scale;
            const crumbX = tileX + (2 * scale) + (randomX * (tileSize - 4 * scale - crumbSize));
            const crumbY = tileY + (2 * scale) + (randomY * (tileSize - 4 * scale - crumbSize));
            
            if (crumbX >= tileX && crumbX + crumbSize <= tileX + tileSize &&
                crumbY >= tileY && crumbY + crumbSize <= tileY + tileSize) {
                ctx.fillRect(crumbX, crumbY, crumbSize, crumbSize);
            }
        }
    }
    
    if (tileType === TILE_TYPES.WATER) {
        for (let layer = 0; layer < 2; layer++) {
            const waveSpeed = 1.0 + layer * 0.5;
            const waveFreq = 0.15 + layer * 0.08;
            const waveAmplitude = (4 - layer * 1) * scale;
            
            const waveColors = [
                `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 1.1)}, 
                        ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 1.1)}, 
                        ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 1.1)})`,
                `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 0.9)}, 
                        ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 0.9)}, 
                        ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 0.9)})`
            ];
            ctx.fillStyle = waveColors[layer];
            
            for (let i = 0; i < 2; i++) {
                const baseY = tileY + (8 + i * 12) * scale;
                const waveY = baseY + Math.sin((x * waveFreq + time * waveSpeed + layer * 0.8)) * waveAmplitude;
                
                if (waveY >= tileY + 2 * scale && waveY <= tileY + tileSize - 4 * scale) {
                    const segments = 3;
                    for (let seg = 0; seg < segments; seg++) {
                        const segWidth = tileSize / segments;
                        const segX = tileX + seg * segWidth;
                        const segWaveY = waveY + Math.sin((segX * 0.08 + time * waveSpeed)) * (waveAmplitude * 0.6);
                        
                        if (segX >= tileX && segX + segWidth <= tileX + tileSize &&
                            segWaveY >= tileY && segWaveY + 3 * scale <= tileY + tileSize) {
                            
                            if (((noiseSeed + seg + layer * 10) % 2) === 0) {
                                ctx.fillRect(segX, segWaveY, segWidth * 0.8, 3 * scale);
                            }
                        }
                    }
                }
            }
        }
        
        const bubbleColor = `rgb(${Math.floor(parseInt(colors.base.substr(1,2), 16) * 0.85)}, 
                                    ${Math.floor(parseInt(colors.base.substr(3,2), 16) * 0.85)}, 
                                    ${Math.floor(parseInt(colors.base.substr(5,2), 16) * 0.85)})`;
        ctx.fillStyle = bubbleColor;
        
        const bubbles = 1;
        for (let i = 0; i < bubbles; i++) {
            const randomX = ((noiseSeed + i * 157) % 100) / 100;
            const randomY = ((noiseSeed + i * 193) % 100) / 100;
            
            const bubbleSize = 4 * scale;
            const bubbleX = tileX + (2 * scale) + (randomX * (tileSize - 4 * scale - bubbleSize));
            const bubbleY = tileY + (2 * scale) + (randomY * (tileSize - 4 * scale - bubbleSize));
            
            if (bubbleX >= tileX && bubbleX + bubbleSize <= tileX + tileSize &&
                bubbleY >= tileY && bubbleY + bubbleSize <= tileY + tileSize) {
                ctx.fillRect(bubbleX, bubbleY, bubbleSize, bubbleSize);
            }
        }
    }
}
