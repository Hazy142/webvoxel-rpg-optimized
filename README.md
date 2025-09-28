# WebVoxel RPG - Optimierte Version

Eine moderne, performante 3D-Voxel-RPG-Engine entwickelt mit TypeScript, React und Three.js.

## 🚀 Verbesserungen gegenüber der ursprünglichen Version

### Kritische Fixes
- ✅ **TypeScript-Konfiguration**: `moduleResolution: "bundler"` für Vite-Optimierung
- ✅ **Doppelte Vite-Configs entfernt**: Nur noch `vite.config.ts`
- ✅ **Memory Leaks behoben**: Korrekte Cleanup-Logik für Three.js
- ✅ **Web Worker TypeScript-Support**: Vollständige `.worker.ts` Implementierung
- ✅ **Store-Typisierung**: Zustand mit korrekten TypeScript-Typen

### Performance-Optimierungen
- 🚀 **Frustum Culling**: Nur sichtbare Chunks werden gerendert
- 🚀 **Chunk-Pooling**: Memory-effiziente Mesh-Wiederverwendung  
- 🚀 **Worker-Pool**: Parallele Chunk-Generation mit mehreren Workers
- 🚀 **LOD-System**: Performance-adaptives Level-of-Detail
- 🚀 **Transferable Objects**: Optimierte Datenübertragung zu Workers

### Architektur-Verbesserungen
- 🏗️ **Error Boundaries**: Robuste Fehlerbehandlung auf Component-Ebene
- 🏗️ **Performance-Monitoring**: Echtzeit FPS/Memory/Chunk-Tracking
- 🏗️ **Asset-Management**: Progressive Loading mit Fallbacks
- 🏗️ **Modular Design**: Klare Trennung von Game Logic und UI

## 🛠️ Installation & Start

```bash
# Dependencies installieren
npm install

# Development-Server starten
npm run dev

# Production-Build
npm run build

# Type-Checking
npm run type-check

# Code-Linting
npm run lint
```

## 🎮 Steuerung

- **W A S D**: Bewegung
- **Maus**: Kamera (bei implementierter Mouse-Look-Funktionalität)
- **Leertaste**: Pause/Fortsetzen (über UI)

## 📊 Performance-Monitoring

Das integrierte Performance-Monitoring zeigt:
- FPS (Frames per Second)
- Frame Time (Millisekunden pro Frame)
- Memory-Usage (geschätzter RAM-Verbrauch)
- Chunk Count (Anzahl geladener/sichtbarer Chunks)

## 🏗️ Architektur

### Core-Systeme
- **ChunkManager**: Intelligentes Chunk-Loading mit Frustum Culling
- **Web Workers**: Parallele Terrain-Generation und Meshing
- **Performance-Store**: Zustand-Management für Metriken
- **Game-Store**: Zentraler Spielzustand

### Komponenten
- **Scene**: Three.js-Rendering mit optimierten Einstellungen
- **PerformanceMonitor**: Echtzeit-Performance-Metriken
- **GameUI**: Spiel-Interface mit Pause/Resume
- **ErrorBoundary**: Fehlerbehandlung für React-Komponenten

## 🔧 Technologie-Stack

- **Frontend**: React 18, TypeScript 5.3
- **3D-Engine**: Three.js 0.160
- **Build-Tool**: Vite 5.2
- **State-Management**: Zustand
- **Terrain-Generation**: Fast-Simplex-Noise
- **Web Workers**: Native ES-Module Workers

## 📈 Performance-Optimierungen im Detail

### Chunk-Management
```typescript
// Frustum Culling für sichtbare Chunks
chunk.isVisible = this.frustum.intersectsSphere(
  new THREE.Sphere(worldPosition, boundingSphere.radius)
);

// Memory-Pool für Mesh-Recycling
private getOrCreateMesh(): THREE.Mesh {
  return this.chunkPool.length > 0 
    ? this.chunkPool.pop()! 
    : new THREE.Mesh(geometry, material);
}
```

### Web Worker-Optimierung
```typescript
// Transferable Objects für Performance
self.postMessage(meshData, [
  meshData.positions.buffer,
  meshData.normals.buffer,
  meshData.uvs.buffer,
  meshData.indices.buffer,
]);
```

## 🐛 Debugging & Development

### Development-Tools
- ESLint für Code-Qualität
- Prettier für Code-Formatierung  
- TypeScript für Type-Safety
- Chrome DevTools für Performance-Profiling

### Häufige Probleme
1. **WebGL-Kontext verloren**: Automatisches Recovery implementiert
2. **Memory Leaks**: Korrekte Dispose-Calls in Cleanup-Funktionen
3. **Worker-Fehler**: Robuste Fehlerbehandlung mit Fallbacks

## 📝 Lizenz

MIT License - Sieh die [LICENSE](LICENSE) Datei für Details.

## 🤝 Contributing

1. Fork des Repositories
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

---

**Entwickelt mit ❤️ für moderne WebVoxel-Experiences**
