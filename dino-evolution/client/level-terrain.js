


// ===================================
// UMGEBUNGSOBJEKTE
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
        } else if (type === 'rock') {
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
        }
    }

    render() {
        const pixelX = this.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = this.tileY * tileSize + tileSize / 2 + terrainOffsetY;
        
        ctx.save();
        ctx.translate(pixelX, pixelY);
        
        switch(this.type) {
            case 'tree':
                this.renderDetailedTree();
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
                    obj.overallState !== 'dead' &&
                    obj.foodState === 'consuming' &&
                    obj.foodTarget && 
                    obj.foodTarget.object === this
                );
                
                if (isBeingHunted) {
                    ctx.fillStyle = '#654321'; // Dunkleres Braun = Angst
                    
//kann weg
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

    setLoadingText('Generiere Terrain...');
    generateTileMap();
    
    gameObjects = [];
    let objectCounts = { trees: 0, rocks: 0, rodents: 0, ownDinos: 0, enemyDinos: 0 };
    
    setLoadingText('Platziere Umgebung...');
    generateEnvironment(objectCounts);
    
    setLoadingText('Erwecke Dinosaurier...');
    generateOwnDinosFromData(objectCounts);
    generateEnemyDinosFromData(objectCounts);    
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
                    const finalTileY = Math.max(5, Math.min(mapHeight - 2, position.tileY));                               
                    const newDino = new Dino(finalTileX, finalTileY, species, true, false);
                    
                    if (isPositionValidForMovement(newDino, finalTileX, finalTileY)) {                                
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
                    const finalTileY = Math.max(5, Math.min(mapHeight - 2, position.tileY));                              
                    const newDino = new Dino(finalTileX, finalTileY, species, true, false);
                    
                    if (isPositionValidForMovement(newDino, finalTileX, finalTileY)) {                                
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
                    const finalTileY = Math.max(5, Math.min(mapHeight - 2, position.tileY)); // ← GEÄNDERT                             
                    const newDino = new Dino(finalTileX, finalTileY, species, true, true);
                    
                    if (isPositionValidForMovement(newDino, finalTileX, finalTileY)) {                                
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
                    const finalTileY = Math.max(5, Math.min(mapHeight - 2, position.tileY));                             
                    const newDino = new Dino(finalTileX, finalTileY, species, true, true);
                    
                    if (isPositionValidForMovement(newDino, finalTileX, finalTileY)) {                                
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
            const position = findValidLandPosition(groupCenterTileX, groupCenterTileY, 4);
            
            if (position.valid) {
                gameObjects.push(new EnvironmentObject(position.tileX, position.tileY, 'tree'));
                objectCounts.trees++;
            }
        }
    }
    
    // Einzelne Bäume
    for (let i = 0; i < singleTrees; i++) {
        const position = findValidLandPosition(
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
        
        const boundedTileX = Math.max(1, Math.min(mapWidth - 2, testTileX));
        const boundedTileY = Math.max(6, Math.min(mapHeight - 2, testTileY));
        
        const tileType = getTileTypeAtPosition(Math.floor(boundedTileX), Math.floor(boundedTileY));
        
        if (tileType !== TILE_TYPES.WATER) {
            // console.log(`  ✓ Gültige Position gefunden: (${boundedTileX.toFixed(1)}, ${boundedTileY.toFixed(1)})`);
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
    tileMap = newMap;
}

function getDistanceToWater(x, y) {
    let minDistance = Infinity;
    
    for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
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
// TERRAIN-RENDERING
// ===================================

function calculateTerrainOffsets() {
    const terrainPixelWidth = mapWidth * tileSize;
    const terrainPixelHeight = mapHeight * tileSize;
    
    // NEU: Zentrieren nur wenn Terrain kleiner als Canvas
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
    }
    
    if (tileType === TILE_TYPES.DIRT) {
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