import * as THREE from 'three';
import type { ChunkData } from '../../types/game';

// Or, if using worker-loader or similar, use:
// Use dynamic Worker loading if import fails
let ChunkWorker: typeof Worker;
try {
  // @ts-ignore
  ChunkWorker = (await import('../../workers/chunk.worker.ts?worker&url')).default;
} catch {
  ChunkWorker = function (this: Worker) {
    return new Worker(new URL('../../workers/chunk.worker.ts', import.meta.url), { type: 'module' });
  } as any;
}

export class ChunkManager {
  private chunks = new Map<string, ChunkData>();
  private chunkPool: THREE.Mesh[] = [];
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly CHUNK_SIZE = 16;
  private readonly RENDER_DISTANCE = 4;
  private readonly MAX_WORKERS = Math.min(4, navigator.hardwareConcurrency || 2);
  
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();
  
  // Performance Optimierungen
  private loadingChunks = new Set<string>();
  private visibilityChecks = 0;
  private readonly MAX_VISIBILITY_CHECKS = 20;
  private workerInitialized = 0;
  
  // Material Cache
  private chunkMaterial: THREE.Material;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Optimiertes Material erstellen
    this.chunkMaterial = new THREE.MeshLambertMaterial({
      vertexColors: false,
      side: THREE.FrontSide,
    });
    
    this.initializeWorkers();
  }
  
  private async initializeWorkers(): Promise<void> {
    console.log(`Initialisiere ${this.MAX_WORKERS} Workers...`);
    
    const workerPromises = Array.from({ length: this.MAX_WORKERS }, async (_, i) => {
      try {
        // ✅ KORRIGIERTE WORKER-ERSTELLUNG:
        const worker = new ChunkWorker(new URL('../../workers/chunk.worker.ts', import.meta.url), { type: 'module' });
        
        // Worker Error Handling
        worker.onerror = (error: ErrorEvent) => {
          console.error(`Worker ${i} Fehler:`, error);
          this.handleWorkerError(i);
        };
        
        worker.onerror = (error: ErrorEvent) => {
          console.error(`Worker ${i} Message Fehler:`, error);
        };
        
        // Worker Message Handling
        worker.addEventListener('message', (event: MessageEvent<any>) => {
          this.handleWorkerMessage(event.data, i);
        });
        
        // Worker initialisieren mit eindeutigem Seed
        const seed = Math.random() * 10000 + i * 1000;
        worker.postMessage({ type: 'init', seed });
        
        this.workers.push(worker);
        console.log(`Worker ${i} erstellt`);
        return worker;
      } catch (error) {
        console.error(`Worker ${i} konnte nicht erstellt werden:`, error);
        // Fallback: Worker ohne Module-Support
        return this.createFallbackWorker(i);
      }
    });
    
    await Promise.allSettled(workerPromises);
    console.log(`${this.workers.length}/${this.MAX_WORKERS} Workers bereit`);
  }
  
  private createFallbackWorker(index: number): Worker | null {
  try {
    // ✅ VERBESSERTE FALLBACK-WORKER mit komplexerer Terrain-Generation
    const workerCode = `
      console.log('Fallback Worker ${index} gestartet');
      
      // Einfache Noise-Funktion
      function simpleNoise(x, z) {
        let n = 0;
        // Multi-octave noise
        n += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
        n += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.25;
        n += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.125;
        return (n + 1) * 0.5; // 0-1 range
      }
      
      function generateChunkTerrain(chunkX, chunkZ, chunkSize) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexIndex = 0;
        
        // Terrain-Generation für jeden Block im Chunk
        for (let x = 0; x < chunkSize; x += 2) {
          for (let z = 0; z < chunkSize; z += 2) {
            const worldX = chunkX * chunkSize + x;
            const worldZ = chunkZ * chunkSize + z;
            
            const heightNoise = simpleNoise(worldX * 0.1, worldZ * 0.1);
            const height = Math.floor(heightNoise * 12) + 4;
            
            // Würfel für diesen Block erstellen
            const blockSize = 2;
            
            // 8 Vertices für einen Würfel
            const vertices = [
              // Bottom face
              x, 0, z,
              x + blockSize, 0, z,
              x + blockSize, 0, z + blockSize,
              x, 0, z + blockSize,
              // Top face  
              x, height, z,
              x + blockSize, height, z,
              x + blockSize, height, z + blockSize,
              x, height, z + blockSize
            ];
            
            positions.push(...vertices);
            
            // Normals für alle 8 Vertices
            for (let i = 0; i < 8; i++) {
              normals.push(0, 1, 0);
            }
            
            // UVs
            for (let i = 0; i < 8; i++) {
              uvs.push(0, 0);
            }
            
            // Top face indices (2 triangles)
            const base = vertexIndex + 4; // Top vertices start at +4
            indices.push(
              base, base + 1, base + 2,
              base, base + 2, base + 3
            );
            
            // Side faces (vereinfacht - nur vorne)
            indices.push(
              vertexIndex, vertexIndex + 4, vertexIndex + 1,
              vertexIndex + 1, vertexIndex + 4, vertexIndex + 5
            );
            
            vertexIndex += 8;
          }
        }
        
        return {
          positions: new Float32Array(positions),
          normals: new Float32Array(normals),
          uvs: new Float32Array(uvs),
          indices: new Uint32Array(indices)
        };
      }
      
      self.addEventListener('message', function(e) {
        try {
          console.log('Fallback Worker ${index} Message:', e.data.type);
          
          if (e.data.type === 'init') {
            console.log('Fallback Worker ${index} initialisiert');
            self.postMessage({ type: 'initialized' });
          } else if (e.data.type === 'generate') {
            const { chunkX, chunkZ, chunkSize } = e.data;
            console.log(\`Fallback Worker ${index} generiert Chunk \${chunkX},\${chunkZ}\`);
            
            const meshData = generateChunkTerrain(chunkX, chunkZ, chunkSize);
            
            self.postMessage({
              type: 'chunkGenerated',
              chunkX,
              chunkZ,
              meshData
            });
          }
        } catch (error) {
          console.error('Fallback Worker ${index} Fehler:', error);
          self.postMessage({
            type: 'error',
            message: error.message || 'Fallback Worker Fehler'
          });
        }
      });
      
      // Sofort bereit signalisieren
      setTimeout(() => {
        self.postMessage({ type: 'ready' });
      }, 10);
    `;
    
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(workerBlob));
    
    // Worker Message Handling
    worker.addEventListener('message', (event: MessageEvent<any>) => {
      this.handleWorkerMessage(event.data, index);
    });
    
    // Worker Error Handling
    worker.onerror = (error: ErrorEvent) => {
      console.error(`Fallback Worker ${index} Fehler:`, error);
    };
    
    console.log(`Fallback Worker ${index} erstellt`);
    return worker;
  } catch (error) {
    console.error(`Fallback Worker ${index} fehlgeschlagen:`, error);
    return null;
  }
}

  
  private handleWorkerError(workerIndex: number): void {
    console.warn(`Worker ${workerIndex} neu starten...`);
    // Worker neu starten (vereinfacht)
    setTimeout(() => {
      if (this.workers[workerIndex]) {
        this.workers[workerIndex].terminate();
      }
    }, 1000);
  }
  
  private handleWorkerMessage(data: any, workerIndex?: number): void {
    switch (data.type) {
      case 'ready':
        console.log(`Worker ${workerIndex} bereit`);
        break;
        
      case 'initialized':
        this.workerInitialized++;
        console.log(`Worker ${workerIndex} initialisiert (${this.workerInitialized}/${this.MAX_WORKERS})`);
        
        // Alle Workers bereit - erste Chunks laden
        if (this.workerInitialized === this.MAX_WORKERS) {
          console.log('Alle Workers bereit! Chunk-Generation kann starten.');
          this.triggerInitialChunkLoad();
        }
        break;
        
      case 'chunkGenerated':
        this.handleChunkGenerated(data);
        break;
        
      case 'error':
        console.error(`Worker ${workerIndex} Fehler:`, data.message);
        break;
        
      default:
        console.warn('Unbekannte Worker-Message:', data);
    }
  }
  
  private triggerInitialChunkLoad(): void {
    // Initiale Chunks um (0,0) laden
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        this.requestChunkGeneration(x, z);
      }
    }
  }
  
  private handleChunkGenerated(data: any): void {
    const { chunkX, chunkZ, meshData } = data;
    const chunkKey = `${chunkX},${chunkZ}`;
    
    console.log(`Chunk ${chunkKey} generiert`);
    this.loadingChunks.delete(chunkKey);
    
    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      // Chunk erstellen falls nicht vorhanden
      chunk = {
        x: chunkX,
        z: chunkZ,
        voxels: new Uint8Array(0),
        isGenerated: false,
        isVisible: true, // Initial sichtbar
      };
      this.chunks.set(chunkKey, chunk);
    }
    
    try {
      // Mesh erstellen oder aktualisieren
      if (!chunk.mesh) {
        chunk.mesh = this.createMesh();
      }
      
      // Geometry mit Worker-Daten füllen
      const geometry = chunk.mesh.geometry as THREE.BufferGeometry;
      
      // Attribute setzen
      if (meshData.positions.length > 0) {
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
      }
      
      // Position setzen
      chunk.mesh.position.set(
        chunkX * this.CHUNK_SIZE,
        0,
        chunkZ * this.CHUNK_SIZE
      );
      
      // Zur Szene hinzufügen
      if (!chunk.mesh.parent) {
        this.scene.add(chunk.mesh);
        console.log(`Chunk ${chunkKey} zur Szene hinzugefügt`);
      }
      
      chunk.isGenerated = true;
      chunk.isVisible = true;
      
    } catch (error) {
      console.error(`Fehler beim Erstellen der Chunk-Mesh ${chunkKey}:`, error);
    }
  }
  
  private createMesh(): THREE.Mesh {
    // Aus Pool holen oder neu erstellen
    if (this.chunkPool.length > 0) {
      const mesh = this.chunkPool.pop()!;
      mesh.geometry = new THREE.BufferGeometry();
      return mesh;
    }
    
    // Neues Mesh erstellen
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, this.chunkMaterial);
    mesh.frustumCulled = true;
    mesh.castShadow = false; // Performance
    mesh.receiveShadow = false; // Performance
    
    return mesh;
  }
  
  public updateChunks(playerPosition: THREE.Vector3): void {
    const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);
    
    // Frustum aktualisieren
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix, 
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    
    // Neue Chunks in Render-Distanz erstellen
    for (let x = -this.RENDER_DISTANCE; x <= this.RENDER_DISTANCE; x++) {
      for (let z = -this.RENDER_DISTANCE; z <= this.RENDER_DISTANCE; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (!this.chunks.has(chunkKey) && !this.loadingChunks.has(chunkKey)) {
          // Neuen Chunk anfordern
          const chunk: ChunkData = {
            x: chunkX,
            z: chunkZ,
            voxels: new Uint8Array(0),
            isGenerated: false,
            isVisible: false,
          };
          
          this.chunks.set(chunkKey, chunk);
          this.requestChunkGeneration(chunkX, chunkZ);
        }
      }
    }
    
    // Sichtbarkeits-Updates
    this.updateChunkVisibility();
    
    // Cleanup entfernter Chunks
    this.cleanupDistantChunks(playerChunkX, playerChunkZ);
  }
  
  private requestChunkGeneration(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.loadingChunks.has(chunkKey) || this.workers.length === 0) {
      return;
    }
    
    if (this.workerInitialized < this.MAX_WORKERS) {
      // Workers noch nicht bereit
      setTimeout(() => this.requestChunkGeneration(chunkX, chunkZ), 100);
      return;
    }
    
    this.loadingChunks.add(chunkKey);
    console.log(`Chunk ${chunkKey} angefordert`);
    
    // Round-robin Worker-Verteilung
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    
    try {
      worker.postMessage({
        type: 'generate',
        chunkX,
        chunkZ,
        chunkSize: this.CHUNK_SIZE,
      });
    } catch (error) {
      console.error(`Fehler beim Senden an Worker:`, error);
      this.loadingChunks.delete(chunkKey);
    }
  }
  
  private updateChunkVisibility(): void {
    // Vereinfachte Visibility für bessere Performance
    for (const chunk of this.chunks.values()) {
      if (!chunk.mesh || !chunk.isGenerated) continue;
      
      // Einfache Distanz-basierte Sichtbarkeit
      const distance = Math.sqrt(
        chunk.x * chunk.x + chunk.z * chunk.z
      );
      
      const shouldBeVisible = distance <= this.RENDER_DISTANCE + 1;
      
      if (chunk.isVisible !== shouldBeVisible) {
        chunk.isVisible = shouldBeVisible;
        
        if (shouldBeVisible && !chunk.mesh.parent) {
          this.scene.add(chunk.mesh);
        } else if (!shouldBeVisible && chunk.mesh.parent) {
          this.scene.remove(chunk.mesh);
        }
      }
    }
  }
  
  private cleanupDistantChunks(playerChunkX: number, playerChunkZ: number): void {
    const chunksToRemove: string[] = [];
    const maxDistance = this.RENDER_DISTANCE + 3;
    
    for (const [chunkKey, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.x - playerChunkX),
        Math.abs(chunk.z - playerChunkZ)
      );
      
      if (distance > maxDistance) {
        chunksToRemove.push(chunkKey);
        
        if (chunk.mesh) {
          if (chunk.mesh.parent) {
            this.scene.remove(chunk.mesh);
          }
          
          // Zurück in Pool
          chunk.mesh.geometry.dispose();
          this.chunkPool.push(chunk.mesh);
        }
      }
    }
    
    chunksToRemove.forEach(key => {
      this.chunks.delete(key);
      this.loadingChunks.delete(key);
    });
    
    if (chunksToRemove.length > 0) {
      console.log(`${chunksToRemove.length} entfernte Chunks aufgeräumt`);
    }
  }
  
  public getChunkCount(): number {
    return this.chunks.size;
  }
  
  public getVisibleChunkCount(): number {
    return Array.from(this.chunks.values()).filter(chunk => 
      chunk.isVisible && chunk.isGenerated
    ).length;
  }
  
  public dispose(): void {
    console.log('ChunkManager wird aufgeräumt...');
    
    // Workers beenden
    this.workers.forEach((worker, i) => {
      try {
        worker.terminate();
        console.log(`Worker ${i} beendet`);
      } catch (error) {
        console.error(`Fehler beim Beenden von Worker ${i}:`, error);
      }
    });
    this.workers.length = 0;
    
    // Meshes aufräumen
    this.chunks.forEach(chunk => {
      if (chunk.mesh) {
        if (chunk.mesh.parent) {
          chunk.mesh.parent.remove(chunk.mesh);
        }
        chunk.mesh.geometry.dispose();
      }
    });
    
    this.chunkPool.forEach(mesh => {
      mesh.geometry.dispose();
    });
    
    this.chunks.clear();
    this.chunkPool.length = 0;
    this.loadingChunks.clear();
    
    console.log('ChunkManager Cleanup abgeschlossen');
  }
}
