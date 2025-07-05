class PositionUtils {
    static tileToPixel(tileX, tileY, tileSize = 32, offsetX = 0, offsetY = 0) {
        return {
            x: tileX * tileSize + tileSize / 2 + offsetX,
            y: tileY * tileSize + tileSize / 2 + offsetY
        };
    }

    static pixelToTile(pixelX, pixelY, tileSize = 32, offsetX = 0, offsetY = 0) {
        return {
            tileX: (pixelX - offsetX) / tileSize,
            tileY: (pixelY - offsetY) / tileSize
        };
    }

    static calculateDistance(obj1, obj2) {
        const dx = obj1.tileX - obj2.tileX;
        const dy = obj1.tileY - obj2.tileY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static calculateDistanceToPoint(obj, x, y) {
        const dx = obj.tileX - x;
        const dy = obj.tileY - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static clampToMapBounds(x, y, mapWidth, mapHeight, margin = 1) {
        return {
            x: Math.max(margin, Math.min(mapWidth - margin, x)),
            y: Math.max(margin, Math.min(mapHeight - margin, y))
        };
    }

    static clampPosition(x, y, minX, maxX, minY, maxY) {
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
        };
    }

    static normalizeDirection(dx, dy) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return { x: 0, y: 0 };
        return { x: dx / length, y: dy / length };
    }

    static moveTowards(obj, targetX, targetY, speed) {
        const dx = targetX - obj.tileX;
        const dy = targetY - obj.tileY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= speed) {
            return { x: targetX, y: targetY, reached: true };
        }
        
        const direction = this.normalizeDirection(dx, dy);
        return {
            x: obj.tileX + direction.x * speed,
            y: obj.tileY + direction.y * speed,
            reached: false
        };
    }
}

// Browser-Kompatibilität
if (typeof window !== 'undefined') {
    window.PositionUtils = PositionUtils;
}