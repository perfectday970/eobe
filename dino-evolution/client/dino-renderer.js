/**
 * 🦕 Dino Evolution - Centralized Dinosaur Renderer
 * 
 * Zentrale Rendering-Engine für Dinosaurier im Dino Evolution Spiel.
 * Kann sowohl für den Generator (index.html) als auch für das Level-System (level.html) verwendet werden.
 */

class DinoRenderer {
    constructor() {
        // Farbpaletten
        this.colorPalettes = {
            braun: ['#8B4513', '#A0522D', '#CD853F'],
            grün: ['#228B22', '#32CD32', '#90EE90'], 
            grau: ['#696969', '#A9A9A9', '#D3D3D3'],
            rot: ['#8B0000', '#DC143C', '#FF6347']
        };
    }

    /**
     * Hauptfunktion zum Rendern eines Dinosauriers
     * @param {CanvasRenderingContext2D} ctx - Canvas-Kontext
     * @param {number} centerX - X-Position des Dino-Zentrums
     * @param {number} centerY - Y-Position des Dino-Zentrums
     * @param {Object} properties - Dino-Eigenschaften
     * @param {string} dinoType - Dino-Typ ('zweifüßig', 'semi-zweifüßig', 'vierfüßig')
     * @param {number} scale - Skalierungsfaktor
     * @param {boolean} isEnemy - Ob es sich um einen Feind handelt
     * @param {Object} animationData - Animation-Daten (optional)
     * @param {boolean} facingRight - Blickrichtung (optional, default: true)
     */
    renderDino(ctx, centerX, centerY, properties, dinoType, scale = 1, isEnemy = false, animationData = null, facingRight = true) {
        const color = this.getDinoColor(properties, isEnemy);
        
        // Spiegelung basierend auf Blickrichtung
        if (!facingRight) {
            ctx.save();
            ctx.scale(-1, 1);
            centerX = -centerX;
        }
        
        // Animation-Offsets extrahieren oder Default-Werte setzen
        const animation = this.processAnimationData(animationData);
        
        // Ebenen-Farben
        const backColor = this.darkenColor(color, 0.6);
        const frontColor = this.lightenColor(color, 1.4);
        
        // Hintere Ebene
        ctx.fillStyle = backColor;
        this.renderDinoLayer(ctx, centerX - 5 * scale, centerY, properties, dinoType, 'back', scale, animation);
        
        // Mittlere Ebene
        ctx.fillStyle = color;
        this.renderDinoLayer(ctx, centerX, centerY, properties, dinoType, 'middle', scale, animation);
        
        // Vordere Ebene
        ctx.fillStyle = frontColor;
        this.renderDinoLayer(ctx, centerX + 5 * scale, centerY, properties, dinoType, 'front', scale, animation);
        
        if (!facingRight) {
            ctx.restore();
        }
    }

    /**
     * Einzelne Ebene des Dinosauriers rendern
     */
    renderDinoLayer(ctx, baseX, baseY, props, dinoType, layer, scale, animation) {
        const bodyScale = dinoType === 'vierfüßig' ? [1.2, 0.8] : [0.8, 1.2];
        const color = ctx.fillStyle; // Aktuelle Farbe vom aufrufenden Kontext
        const backColor = this.darkenColor(this.getCurrentColor(ctx), 0.8);
        const frontColor = this.lightenColor(this.getCurrentColor(ctx), 1.1);
        
        // Körper-Dimensionen für alle Layer definieren
        const bodyWidth = props.körper_länge * scale * 0.8;
        const bodyHeight = props.körper_höhe * scale * 0.6;
        
        // Körper (drei Rechtecke) - angepasst nach Dino-Typ
        if (layer === 'middle') {
            // Körperhöhen-Anpassung basierend auf Dino-Typ
            let frontBodyOffset = 0;
            let backBodyOffset = 0;
            
            if (dinoType === 'zweifüßig') {
                frontBodyOffset = -bodyHeight * 0.15; // Vorne 15% höher
                backBodyOffset = bodyHeight * 0.1;     // Hinten 10% niedriger
            } else if (dinoType === 'semi-zweifüßig') {
                frontBodyOffset = -bodyHeight * 0.08; // Vorne etwas höher
                backBodyOffset = bodyHeight * 0.05;   // Hinten etwas niedriger
            }
            
            // Hauptkörper (mit Atem-Animation)
            ctx.fillRect(
                baseX - bodyWidth/2, 
                baseY - bodyHeight/2 + animation.bodyAnimationY * scale, 
                bodyWidth * bodyScale[0], 
                bodyHeight * bodyScale[1]
            );
            
            // Vorderer Körperteil - mit Höhenanpassung
            ctx.fillRect(
                baseX - bodyWidth/2 - 15 * scale, 
                baseY - bodyHeight/2 + 5 * scale + frontBodyOffset + animation.bodyAnimationY * scale, 
                bodyWidth * 0.4, 
                bodyHeight * 0.8
            );
            
            // Hinterer Körperteil - mit Höhenanpassung
            ctx.fillRect(
                baseX + bodyWidth/2 - 10 * scale, 
                baseY - bodyHeight/2 + 8 * scale + backBodyOffset + animation.bodyAnimationY * scale, 
                bodyWidth * 0.3, 
                bodyHeight * 0.7
            );
        }
        
        // Kopf (nur mittlere Ebene)
        if (layer === 'middle') {
            this.renderHead(ctx, baseX, baseY, props, scale, animation, bodyWidth);
        }
        
        // Hörner (in allen Ebenen)
        if (props.kopf_hörner_anzahl > 0) {
            this.renderHorns(ctx, baseX, baseY, props, scale, animation, bodyWidth, layer, backColor, frontColor);
        }
        
        // Hals (gestapelte Rechtecke)
        if (layer === 'middle') {
            this.renderNeck(ctx, baseX, baseY, props, scale, bodyWidth);
        }
        
        // Beine
        if (layer === 'back' || layer === 'front') {
            this.renderLegs(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight, bodyScale, layer, backColor, frontColor);
        }
        
        // Schwanz (nur mittlere Ebene)
        if (layer === 'middle') {
            this.renderTail(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight);
        }
        
        // Flügel (nur mittlere Ebene)
        if (layer === 'middle' && props.flügel > 0) {
            this.renderWings(ctx, baseX, baseY, props, scale, animation, bodyWidth, bodyHeight);
        }
        
        // Flossen (nur sichtbar wenn vorhanden)
        if (props.flossen > 0) {
            this.renderFins(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight, bodyScale, layer, backColor, frontColor);
        }
    }

    /**
     * Kopf rendern
     */
    renderHead(ctx, baseX, baseY, props, scale, animation, bodyWidth) {
        const headSize = props.kopf_größe * scale * 0.4;
        const color = this.getCurrentColor(ctx);
        
        // Kopf am Ende des Halses positionieren - mit exponentieller Berechnung
        const neckLength = props.hals_länge;
        const baseSegments = Math.floor(neckLength / 25) + 1;
        const exponentialFactor = Math.pow(neckLength / 100, 1.5);
        const neckSegments = Math.max(baseSegments, Math.floor(baseSegments + exponentialFactor * 15));
        
        const segmentSpacing = (12 + (exponentialFactor * 8)) * scale;
        const curvatureStrength = Math.pow(neckLength / 100, 5) * 1000 * scale;
        const progress = Math.max(0, (neckSegments - 1)) / Math.max(1, neckSegments - 1);
        
        const headX = baseX - bodyWidth/2 - 25 * scale - ((neckSegments - 1) * segmentSpacing) - headSize/2 + animation.headAnimationX * scale;
        const baseHeadY = baseY - 10 * scale;
        const curveY = progress * progress * curvatureStrength;
        const headY = baseHeadY - curveY + animation.headAnimationY * scale;
        
        // Schädel (hinten)
        ctx.fillRect(headX - headSize/2, headY - headSize/2, headSize, headSize);
        
        // Schnauze (vorne)
        const snoutWidth = (headSize * 0.7 + props.kopf_beisskraft * 0.1 * scale);
        ctx.fillRect(headX - headSize/2 - 15 * scale, headY - snoutWidth/4, 15 * scale, snoutWidth/2);
        
        // Maul/Zähne
        ctx.fillStyle = '#333';
        ctx.fillRect(headX - headSize/2 - 15 * scale, headY + 5 * scale, 12 * scale, 6 * scale);
        
        // Zähne
        ctx.fillStyle = '#ffffff';
        const teethSize = (props.maul_zahntyp > 70 ? 6 : props.maul_zahntyp > 30 ? 4 : 2) * scale;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(headX - headSize/2 - 12 * scale + i * 3 * scale, headY + 5 * scale, 2 * scale, teethSize);
        }
        ctx.fillStyle = color;
        
        // Kragen
        if (props.kragen_größe > 10) {
            ctx.fillRect(
                headX + headSize/2, 
                headY - props.kragen_größe * 0.2 * scale, 
                props.kragen_größe * 0.3 * scale, 
                props.kragen_größe * 0.4 * scale
            );
        }
    }

    /**
     * Hörner rendern
     */
    renderHorns(ctx, baseX, baseY, props, scale, animation, bodyWidth, layer, backColor, frontColor) {
        // Kopfposition für Hörner berechnen (gleiche Logik wie Kopf)
        const headSize = props.kopf_größe * scale * 0.4;
        const neckLength = props.hals_länge;
        const baseSegments = Math.floor(neckLength / 25) + 1;
        const exponentialFactor = Math.pow(neckLength / 100, 1.5);
        const neckSegments = Math.max(baseSegments, Math.floor(baseSegments + exponentialFactor * 15));
        
        const segmentSpacing = (12 + (exponentialFactor * 8)) * scale;
        const curvatureStrength = Math.pow(neckLength / 100, 5) * 1000 * scale;
        const progress = Math.max(0, (neckSegments - 1)) / Math.max(1, neckSegments - 1);
        
        const headX = baseX - bodyWidth/2 - 25 * scale - ((neckSegments - 1) * segmentSpacing) - headSize/2 + animation.headAnimationX * scale;
        const baseHeadY = baseY - 10 * scale;
        const curveY = progress * progress * curvatureStrength;
        const headY = baseHeadY - curveY + animation.headAnimationY * scale;
        
        const hornSize = props.kopf_hörner_größe * 0.3 * scale;
        const totalHorns = Math.floor(props.kopf_hörner_anzahl);
        
        // Hörner auf Ebenen verteilen
        if (layer === 'back') {
            // Hintere Hörner (abgedunkelte Klauen-Farbe)
            ctx.fillStyle = '#9c915c';
            const backHorns = Math.floor(totalHorns / 2);
            for (let i = 0; i < backHorns; i++) {
                const hornX = headX + 12 * scale - (i * 8 * scale);
                ctx.fillRect(hornX, headY - headSize/2 - hornSize, 4 * scale, hornSize);
            }
        } else if (layer === 'front') {
            // Vordere Hörner (Klauen-Farbe)
            ctx.fillStyle = '#f0e68c';
            const frontHorns = Math.floor(totalHorns / 2);
            for (let i = 0; i < frontHorns; i++) {
                const hornX = headX + 7 * scale - (i * 8 * scale);
                ctx.fillRect(hornX, headY - headSize/2 - hornSize, 4 * scale, hornSize);
            }
        } else if (layer === 'middle' && totalHorns % 2 === 1) {
            // Mittleres Horn bei ungerader Anzahl (mittlere Klauen-Farbe)
            ctx.fillStyle = '#ddd077';
            const hornX = headX - 8 * scale;
            const pairCount = Math.floor(totalHorns / 2);
            const middleHornX = hornX - (pairCount * 4 * scale);
            ctx.fillRect(middleHornX, headY - headSize/2 - hornSize, 4 * scale, hornSize);
        }
        
        // Farbe zurücksetzen
        ctx.fillStyle = layer === 'back' ? backColor : layer === 'front' ? frontColor : this.getCurrentColor(ctx);
    }

    /**
     * Hals rendern
     */
    renderNeck(ctx, baseX, baseY, props, scale, bodyWidth) {
        // Exponentiell mehr Segmente bei längeren Hälsen
        const neckLength = props.hals_länge;
        const baseSegments = Math.floor(neckLength / 25) + 1;
        const exponentialFactor = Math.pow(neckLength / 100, 1.5);
        const neckSegments = Math.max(baseSegments, Math.floor(baseSegments + exponentialFactor * 15));
        
        const segmentWidth = props.hals_breite * 0.3 * scale;
        const segmentHeight = 15 * scale;
        
        // Exponentiell stärkere Krümmung nach oben bei längeren Hälsen
        const curvatureStrength = Math.pow(neckLength / 100, 5) * 1000 * scale;
        
        for (let i = 0; i < neckSegments; i++) {
            const progress = i / Math.max(1, neckSegments - 1);
            
            // Exponentiell längere Abstände zwischen Segmenten
            const segmentSpacing = (12 + (exponentialFactor * 8)) * scale;
            const neckX = baseX - bodyWidth/2 - 25 * scale - (i * segmentSpacing);
            
            // Exponentiell stärkere Aufwärtskrümmung
            const baseNeckY = baseY - 10 * scale;
            const curveY = progress * progress * curvatureStrength;
            const neckY = baseNeckY - curveY;
            
            ctx.fillRect(neckX - segmentWidth/2, neckY - segmentHeight/2, segmentWidth, segmentHeight);
        }
    }

    /**
     * Beine rendern
     */
    renderLegs(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight, bodyScale, layer, backColor, frontColor) {
        // Unterschiedliche Offsets für Arme (näher) und Beine
        const armOffset = (layer === 'back' ? -1.5 : 1.5) * scale;
        const legOffset = (layer === 'back' ? -2 : 2) * scale;
        
        // Körperposition-Anpassung basierend auf Dino-Typ
        let frontAdjustment = 0;
        let backAdjustment = 0;
        
        if (dinoType === 'zweifüßig') {
            frontAdjustment = bodyWidth * 0.15;
            backAdjustment = -bodyWidth * 0.15;
        } else if (dinoType === 'semi-zweifüßig') {
            frontAdjustment = bodyWidth * 0.08;
            backAdjustment = -bodyWidth * 0.08;
        }
        
        // Walking-Animation-Offsets
        const frontLegWalkOffset = animation.frontLegAnimationX * scale;
        const backLegWalkOffset = animation.backLegAnimationX * scale;
        
        // Vorderbeine (Arme)
        const frontLegX = baseX - bodyWidth/2 - 8 * scale + frontAdjustment + frontLegWalkOffset;
        const frontLegY = baseY + bodyHeight/2 * bodyScale[1] - 5 * scale + animation.bodyAnimationY * scale;
        const frontLegWidth = props.vorderbeine_stärke * 0.2 * scale;
        const frontLegHeight = props.vorderbeine_länge * 0.4 * scale;
        
        ctx.fillRect(
            frontLegX - frontLegWidth/2 + armOffset, 
            frontLegY, 
            frontLegWidth, 
            frontLegHeight
        );
        
        // Vorderklauen (Hände)
        if (props.vorderklauen_länge > 10) {
            ctx.fillStyle = '#f0e68c';
            const clawLength = props.vorderklauen_länge * 0.15 * scale;
            ctx.fillRect(
                frontLegX - 2 * scale + armOffset, 
                frontLegY + frontLegHeight, 
                4 * scale, 
                clawLength
            );
            ctx.fillStyle = layer === 'back' ? backColor : frontColor;
        }
        
        // Hinterbeine
        const backLegX = baseX + bodyWidth/2 - 5 * scale + backAdjustment + backLegWalkOffset;
        const backLegY = baseY + bodyHeight/2 * bodyScale[1] - 8 * scale + animation.bodyAnimationY * scale;
        const backLegWidth = props.hinterbeine_stärke * 0.25 * scale;
        const backLegHeight = props.hinterbeine_länge * 0.5 * scale;
        
        ctx.fillRect(
            backLegX - backLegWidth/2 + legOffset, 
            backLegY, 
            backLegWidth, 
            backLegHeight
        );
        
        // Hinterklauen
        if (props.hinterklauen_länge > 10) {
            ctx.fillStyle = '#f0e68c';
            const clawLength = props.hinterklauen_länge * 0.2 * scale;
            const isSickle = props.hinterklauen_länge > 80;
            
            if (isSickle) {
                // Sichelklauen (gebogen)
                ctx.beginPath();
                ctx.arc(backLegX + legOffset, backLegY + backLegHeight, clawLength/2, 0, Math.PI);
                ctx.fill();
            } else {
                ctx.fillRect(
                    backLegX - 2 * scale + legOffset, 
                    backLegY + backLegHeight, 
                    4 * scale, 
                    clawLength
                );
            }
            ctx.fillStyle = layer === 'back' ? backColor : frontColor;
        }
    }

    /**
     * Schwanz rendern
     */
    renderTail(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight) {
        const color = this.getCurrentColor(ctx);
        
        // Körperhöhen-Anpassung basierend auf Dino-Typ
        let backBodyOffset = 0;
        
        if (dinoType === 'zweifüßig') {
            backBodyOffset = bodyHeight * 0.1;
        } else if (dinoType === 'semi-zweifüßig') {
            backBodyOffset = bodyHeight * 0.05;
        }
        
        const tailSegments = Math.floor(props.schwanz_länge / 15) + 1;
        const tailWidth = props.schwanz_breite * 0.3 * scale;
        
        for (let i = 0; i < tailSegments; i++) {
            const segmentSize = tailWidth * (1 - i * 0.1);
            const tailX = baseX + bodyWidth/2 + 10 * scale + (i * 12 * scale);
            
            // Schwanzwedeln: stärkere Bewegung am Ende des Schwanzes
            const segmentProgress = i / Math.max(1, tailSegments - 1);
            const segmentTailAnimation = animation.tailAnimationY * segmentProgress * scale;
            
            const tailY = baseY + (i * 3 * scale) + backBodyOffset + animation.bodyAnimationY * scale + segmentTailAnimation;
            
            ctx.fillRect(
                tailX - segmentSize/2, 
                tailY - segmentSize/2, 
                segmentSize, 
                segmentSize
            );
        }
        
        // Schwanzkeule
        if (props.schwanz_keule > 10 && props.schwanz_stacheln <= 10) {
            ctx.fillStyle = this.darkenColor(color, 0.7);
            const clubSize = props.schwanz_keule * 0.4 * scale;
            const clubX = baseX + bodyWidth/2 + 10 * scale + (tailSegments * 12 * scale);
            const clubY = baseY + (tailSegments * 3 * scale) + backBodyOffset + animation.bodyAnimationY * scale + animation.tailAnimationY * scale;
            
            ctx.beginPath();
            ctx.arc(clubX, clubY, clubSize/2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = color;
        }
        
        // Schwanzstacheln
        if (props.schwanz_stacheln > 10 && props.schwanz_keule <= 10) {
            ctx.fillStyle = this.darkenColor(color, 0.6);
            const spikeCount = Math.floor(props.schwanz_stacheln / 10);
            const spikeSize = props.schwanz_stacheln * 0.1 * scale;
            
            for (let i = 0; i < spikeCount && i < tailSegments; i++) {
                const spikeX = baseX + bodyWidth/2 + 15 * scale + (i * 12 * scale);
                const segmentProgress = i / Math.max(1, tailSegments - 1);
                const segmentTailAnimation = animation.tailAnimationY * segmentProgress * scale;
                const spikeY = baseY + (i * 3 * scale) - 8 * scale + backBodyOffset + animation.bodyAnimationY * scale + segmentTailAnimation;
                
                // Dreieck für Stachel
                ctx.beginPath();
                ctx.moveTo(spikeX, spikeY - spikeSize);
                ctx.lineTo(spikeX - 3 * scale, spikeY);
                ctx.lineTo(spikeX + 3 * scale, spikeY);
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = color;
        }
    }

    /**
     * Flügel rendern
     */
    renderWings(ctx, baseX, baseY, props, scale, animation, bodyWidth, bodyHeight) {
        const color = this.getCurrentColor(ctx);
        ctx.fillStyle = this.lightenColor(color, 1.2);
        const wingSize = props.flügel * 0.5 * scale;
        const wingX = baseX - bodyWidth/4;
        const wingY = baseY - bodyHeight/4 + animation.bodyAnimationY * scale;
        
        if (props.flügel > 50) {
            // Große Flügel
            ctx.beginPath();
            ctx.moveTo(wingX, wingY);
            ctx.lineTo(wingX - wingSize, wingY - wingSize/2);
            ctx.lineTo(wingX - wingSize/2, wingY + wingSize/4);
            ctx.closePath();
            ctx.fill();
        } else {
            // Stummelflügel
            ctx.fillRect(wingX - wingSize/2, wingY - wingSize/4, wingSize, wingSize/2);
        }
        ctx.fillStyle = color;
    }

    /**
     * Flossen rendern
     */
    renderFins(ctx, baseX, baseY, props, dinoType, scale, animation, bodyWidth, bodyHeight, bodyScale, layer, backColor, frontColor) {
        const color = this.getCurrentColor(ctx);
        ctx.fillStyle = this.lightenColor(color, 1.3);
        const finSize = props.flossen * 0.15 * scale;
        
        if (layer === 'middle') {
            // Schwanzflosse - mit Animation
            const tailSegments = Math.floor(props.schwanz_länge / 15) + 1;
            let backBodyOffset = 0;
            
            if (dinoType === 'zweifüßig') {
                backBodyOffset = bodyHeight * 0.1;
            } else if (dinoType === 'semi-zweifüßig') {
                backBodyOffset = bodyHeight * 0.05;
            }
            
            const tailEndX = baseX + bodyWidth/2 + 10 * scale + (tailSegments * 12 * scale);
            const tailEndY = baseY + (tailSegments * 3 * scale) + backBodyOffset + animation.bodyAnimationY * scale + animation.tailAnimationY * scale;
            
            ctx.beginPath();
            ctx.ellipse(tailEndX + 10 * scale, tailEndY, finSize, finSize/2, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Beinflossen
        if (layer === 'back' || layer === 'front') {
            const armOffset = (layer === 'back' ? -1.5 : 1.5) * scale;
            const legOffset = (layer === 'back' ? -2 : 2) * scale;
            
            // Körperposition-Anpassung basierend auf Dino-Typ
            let frontAdjustment = 0;
            let backAdjustment = 0;
            
            if (dinoType === 'zweifüßig') {
                frontAdjustment = bodyWidth * 0.15;
                backAdjustment = -bodyWidth * 0.15;
            } else if (dinoType === 'semi-zweifüßig') {
                frontAdjustment = bodyWidth * 0.08;
                backAdjustment = -bodyWidth * 0.08;
            }
            
            // Walking-Animation auch für Flossen
            const frontLegWalkOffset = animation.frontLegAnimationX * scale;
            const backLegWalkOffset = animation.backLegAnimationX * scale;
            
            // Vorderbeinflossen (Armflossen)
            const frontLegX = baseX - bodyWidth/2 - 8 * scale + frontAdjustment + frontLegWalkOffset;
            const frontLegY = baseY + bodyHeight/2 * bodyScale[1] - 5 * scale + props.vorderbeine_länge * 0.4 * scale + animation.bodyAnimationY * scale;
            
            ctx.beginPath();
            ctx.ellipse(frontLegX + armOffset, frontLegY + 5 * scale, finSize/2, finSize/3, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // Hinterbeinflossen
            const backLegX = baseX + bodyWidth/2 - 5 * scale + backAdjustment + backLegWalkOffset;
            const backLegY = baseY + bodyHeight/2 * bodyScale[1] - 8 * scale + props.hinterbeine_länge * 0.5 * scale + animation.bodyAnimationY * scale;
            
            ctx.beginPath();
            ctx.ellipse(backLegX + legOffset, backLegY + 5 * scale, finSize/2, finSize/3, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.fillStyle = layer === 'back' ? backColor : layer === 'front' ? frontColor : color;
    }

    /**
     * Dino-Typ bestimmen basierend auf Eigenschaften
     */
    getDinoType(properties) {
        const ratio = properties.vorderbeine_länge / properties.hinterbeine_länge;
        
        if (ratio < 0.4) return 'zweifüßig';
        if (ratio < 0.8) return 'semi-zweifüßig';
        return 'vierfüßig';
    }

    /**
     * Dino-Farbe bestimmen basierend auf Eigenschaften
     */
    getDinoColor(properties, isEnemy = false) {
        const baseColors = this.colorPalettes.braun;
        
        // ENTFERNT: Spezielle Farben für Feinde
        // Alle Dinos verwenden die gleiche Farblogik
        
        if (properties.farbig > 75) {
            return this.colorPalettes.rot[1]; // Warnfarben
        } else if (properties.tarnung > 60) {
            return this.colorPalettes.grün[0]; // Tarnfarben
        } else if (properties.farbig > 40) {
            return baseColors[2]; // Heller
        }
        return baseColors[1]; // Standard braun
    }

    /**
     * Animation-Daten verarbeiten und Default-Werte setzen
     */
    processAnimationData(animationData) {
        const defaults = {
            bodyAnimationY: 0,
            headAnimationX: 0,
            headAnimationY: 0,
            tailAnimationY: 0,
            frontLegAnimationX: 0,
            backLegAnimationX: 0
        };
        
        return animationData ? { ...defaults, ...animationData } : defaults;
    }

    /**
     * Aktuelle Farbe aus dem Canvas-Kontext extrahieren
     */
    getCurrentColor(ctx) {
        const fillStyle = ctx.fillStyle;
        
        // Wenn es ein rgb() Wert ist, direkt zurückgeben
        if (typeof fillStyle === 'string' && fillStyle.startsWith('rgb')) {
            return fillStyle;
        }
        
        // Wenn es ein Hex-Wert ist, direkt zurückgeben
        if (typeof fillStyle === 'string' && fillStyle.startsWith('#')) {
            return fillStyle;
        }
        
        // Default fallback
        return '#A0522D';
    }

    /**
     * Farbe abdunkeln
     */
    darkenColor(color, factor) {
        if (color.startsWith('rgb')) {
            const matches = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
            if (matches) {
                const r = Math.floor(parseInt(matches[1]) * factor);
                const g = Math.floor(parseInt(matches[2]) * factor);
                const b = Math.floor(parseInt(matches[3]) * factor);
                return `rgb(${r}, ${g}, ${b})`;
            }
        } else if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
            const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
            const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }

    /**
     * Farbe aufhellen
     */
    lightenColor(color, factor) {
        if (color.startsWith('rgb')) {
            const matches = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
            if (matches) {
                const r = Math.min(255, Math.floor(parseInt(matches[1]) * factor));
                const g = Math.min(255, Math.floor(parseInt(matches[2]) * factor));
                const b = Math.min(255, Math.floor(parseInt(matches[3]) * factor));
                return `rgb(${r}, ${g}, ${b})`;
            }
        } else if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * factor));
            const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * factor));
            const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * factor));
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }
}

// Globale Instanz für einfache Verwendung
const dinoRenderer = new DinoRenderer();

// Für CommonJS/Node.js Kompatibilität
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DinoRenderer;
}