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
        
        // NEU: Cross-Movement System
        this.initializeCrossMovement();
        
        this.initializeMovementBehavior();
        this.isMovingForward = true;
        this.animationPhase = 'idle';
        this.phaseStartTime = Date.now();

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
    }

    getMovementSpeed() {
        let multiplier = 1.0;
        
        // Geschwindigkeits-Multiplikator basierend auf aktuellem Zustand
        if (this.overallState === 'seeking') {
            multiplier = 1.3; // 30% schneller bei Verfolgung/Nahrungssuche
        }
        
        return this.baseSpeed * multiplier * gameSpeed;
    }

    // Neue Methode in der Dino-Klasse
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
        if(debugMode && this.selected) console.log(`🔄 Umgehung Schritt ${this.avoidanceMode.currentStep}`);
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
            if (!isPositionValidForMovement(checkDino, checkX, checkY)) {
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
            if (debugMode && this.selected) {
                console.log(`🚫 ${this.species.name}: Hindernis nicht im Weg, ignoriere Umgehung`);
            }
            
            // Einfach Ziel anpassen und weitermachen
            this.chooseNewMovementTarget();
            return;
        }
        
        // Speichere aktuellen Zustand
        this.avoidanceMode.originalBehaviorState = this.behaviorState;
        this.avoidanceMode.originalTarget = { x: targetX, y: targetY };
        
        // Berechne Richtung
        const dx = targetX - this.tileX;
        const dy = targetY - this.tileY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        this.avoidanceMode.active = true;
        this.overallState === 'avoiding'
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
        this.behaviorState = 'avoiding';
        
        if (debugMode && this.selected) {
            console.log(`🚧 ${this.species.name} aktiviert Umgehungs-Modus bei (${blockedAt.x.toFixed(1)}, ${blockedAt.y.toFixed(1)})`);
        }
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
        
        if (debugMode && this.selected) {
            console.log(`🎯 ${this.species.name} Ziel: ${this.currentGoal} | Dino X: ${dinoX.toFixed(1)} | Hindernis X: ${obstacleX.toFixed(1)} -> ${isInPath ? 'IM WEG' : 'NICHT IM WEG'}`);
        }
        
        return isInPath;
    }


    // Beendet den Umgehungs-Modus
    exitAvoidanceMode(reason = 'success') {
        this.avoidanceMode.active = false;
        this.overallState === 'neutral';
        
        // Stelle ursprünglichen Zustand wieder her
        if (this.avoidanceMode.originalBehaviorState) {
            this.behaviorState = this.avoidanceMode.originalBehaviorState;
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

        let pixel = tileToPixel(checkTileX, checkTileY)
        
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
        if(this.selected){
            console.log('Kollisionsbox-Check 1:', box);
        }
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

                const blockPixel = tileToPixel(this.avoidanceMode.blockedPosition.x, this.avoidanceMode.blockedPosition.y);
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
                                                        
            ctx.fillText(`Geschwindgkeit: ${this.getMovementSpeed()}) | overallState: ${this.overallState}`, pixelX, pixelY + 90);                       
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
            left: { min: 0, max: 4 },           // Linke Seite: erste 4 Kacheln
            right: { min: mapWidth - 4, max: mapWidth }  // Rechte Seite: letzte 4 Kacheln
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
        
        // console.log(`🎯 Dino ${this.species.name} (${this.spawnSide}): Ziel -> ${this.currentGoal}`);
    }

    checkGoalReached() {
        const currentZone = this.targetZones[this.currentGoal];
        
        if (this.tileX >= currentZone.min && this.tileX <= currentZone.max) {
            // Ziel erreicht! Wechsle zum anderen Ziel
            this.currentGoal = this.currentGoal === 'left' ? 'right' : 'left';
            
            // console.log(`🎯 Dino ${this.species.name}: Ziel erreicht! Neues Ziel -> ${this.currentGoal}`);
            
            // Kurze Pause nach Ziel-Erreichung
            this.behaviorState = 'resting';
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
        
        let baseMinTileX = mapWidth * 0.05;
        let baseMaxTileX = mapWidth * 0.95;
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
            
            // console.log(`🎯 Cross-Movement: ${this.species.name} -> Ziel ${this.currentGoal}, Winkel: ${(angle * 180 / Math.PI).toFixed(1)}°`);
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
        this.targetTileX = Math.max(baseMinTileX, Math.min(baseMaxTileX, this.targetTileX));
        this.targetTileY = Math.max(5, Math.min(mapHeight - 2, this.targetTileY));
        
        // Debug-Info
        if (useCrossMovement) {
            const distanceToTarget = Math.abs(this.tileX - targetCenterX);
            // console.log(`📍 ${this.species.name}: Pos ${this.tileX.toFixed(1)} -> Target ${this.targetTileX.toFixed(1)}, Entfernung zum Ziel: ${distanceToTarget.toFixed(1)}`);
        }
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
        
        this.behaviorState = startMoving ? 'moving' : 'resting';
        this.behaviorTimer = Math.random() * 2;
        
        if (this.behaviorState === 'resting') {
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

    update() {
        if (isPaused) return;
       
        const frameTime = 1/60;
        this.behaviorTimer += frameTime * gameSpeed;
        
        if (this.avoidanceMode.active) {
            this.updateAvoidanceMode();
            this.syncAnimation();
            return;
        }
        
        if (this.overallState === 'fighting') {
            this.syncAnimation();
            return;
        }
        
        if (this.behaviorTimer >= this.currentBehaviorDuration) {
            this.switchBehaviorState();
        }
        
        if (this.behaviorState === 'moving') {
            this.handleMovement();
        }
        
        // GEÄNDERTE GRENZEN: Dinos können jetzt ab Reihe 5 (statt 14)
        this.tileX = Math.max(1, Math.min(mapWidth - 1, this.tileX));
        this.tileY = Math.max(1, Math.min(mapHeight - 1, this.tileY));                
        
        this.syncAnimation();
    }

    switchBehaviorState() {
        if (this.behaviorState === 'resting') {
            this.behaviorState = 'moving';
            this.animationPhase = 'walking';
            this.currentBehaviorDuration = this.getRandomMoveDuration();
            this.chooseNewMovementTarget();
        } else {
            this.behaviorState = 'resting';
            this.animationPhase = 'idle';
            this.currentBehaviorDuration = this.getRandomRestDuration();
            this.targetTileX = this.tileX;
            this.targetTileY = this.tileY;
        }
        
        this.behaviorTimer = 0;
        this.phaseStartTime = Date.now();
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
            
            if (isPositionValidForMovement(this, newTileX, newTileY)) {
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
        const expectedAnimation = this.behaviorState === 'moving' ? 'walking' : 'idle';
        if (this.animationPhase !== expectedAnimation) {
            this.animationPhase = expectedAnimation;
            this.phaseStartTime = Date.now();
        }
    }

    render() {
        let pixel = tileToPixel(this.tileX , this.tileY);

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
        
        this.renderShadow(pixel.x, pixel.y);
        
        const currentTime = Date.now();
        const phaseDuration = (currentTime - this.phaseStartTime) / 1000;
        
        if (phaseDuration >= 4) {
            this.animationPhase = this.animationPhase === 'idle' ? 'walking' : 'idle';
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
        
        if (this.overallState === 'fighting') {
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

    renderShadow(pixelX, pixelY) {
        const shadowWidth = (this.species.properties.körper_länge || 50) * this.scale * 0.768;
        const shadowHeight = (this.species.properties.körper_höhe || 50) * this.scale * 0.384;
        
        const shadowOffsetX = 2.88 * this.scale;
        const shadowOffsetY = 7.68 * this.scale;
        const shadowX = pixelX + shadowOffsetX - shadowWidth / 2;
        const shadowY = pixelY + shadowOffsetY - shadowHeight / 2;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000000';       
        ctx.beginPath();
        ctx.ellipse(shadowX + shadowWidth/2, shadowY + shadowHeight/2, 
                shadowWidth/2, shadowHeight/2, 0, 0, 2 * Math.PI);
        ctx.fill();     
        ctx.restore();
    }

    isClickedBy(mouseX, mouseY) {
        const pixelX = this.tileX * tileSize + tileSize / 2 + terrainOffsetX;
        const pixelY = this.tileY * tileSize + tileSize / 2 + terrainOffsetY;       
        const distance = Math.sqrt((mouseX - pixelX)**2 + (mouseY - pixelY)**2);
        return distance < Math.max(14.4, 19.2 * this.scale);
    }

    initializeFoodBehavior() {
        this.foodState = 'neutral';        // 'neutral', 'seeking', 'consuming'
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
}

// ===================================
// EXPORT (Browser & Node.js kompatibel)
// ===================================

// Browser-Umgebung
if (typeof window !== 'undefined') {
    window.DinoClass = {
        Dino
    };
}

// Node.js-Umgebung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Dino
    };
}
