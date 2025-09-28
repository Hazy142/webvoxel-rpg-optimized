import * as THREE from 'three';
import type { ChunkData } from '../../types/game';

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
      color: 0x4a8b3b,
      vertexColors: false,
      side: THREE.FrontSide,
    });
    
    this.initializeWorkers();
  }
  
  private async initializeWorkers(): Promise<void> {
    console.log(`Initialisiere ${this.MAX_WORKERS} Workers...`);
    
    const workerPromises = Array.from({ length: this.MAX_WORKERS }, async (_, i) => {
      return this.createFallbackWorker(i);
    });
    
    const workers = await Promise.allSettled(workerPromises);
    
    // Nur erfolgreiche Workers hinzufügen
    workers.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        // Worker ist bereits in this.workers durch createFallbackWorker
      }
    });
    
    console.log(`${this.workers.length}/${this.MAX_WORKERS} Workers bereit`);
    
    // ✅ SOFORT CHUNKS LADEN
    this.workerInitialized = this.workers.length;
    
    // Direkte Chunk-Generierung
    setTimeout(() => {
      console.log('Starte manuelle Chunk-Generierung...');
      
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          if (this.workers.length > 0) {
            const workerIndex = (x + 2) * 5 + (z + 2);
            const worker = this.workers[workerIndex % this.workers.length];
            console.log(`Fordere Chunk ${x},${z} an`);
            
            worker.postMessage({
              type: 'generate',
              chunkX: x,
              chunkZ: z,
              chunkSize: this.CHUNK_SIZE,
            });
            
            const chunkKey = `${x},${z}`;
            this.loadingChunks.add(chunkKey);
            
            const chunk: ChunkData = {
              x,
              z,
              voxels: new Uint8Array(0),
              isGenerated: false,
              isVisible: false,
            };
            this.chunks.set(chunkKey, chunk);
          }
        }
      }
    }, 1000);
  }
  
  private createFallbackWorker(index: number): Worker | null {
    try {
      const workerCode = `
        console.log('Fallback Worker ${index} gestartet');
        
        // Einfache Noise-Funktion
        function simpleNoise(x, z) {
          let n = 0;
          n += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
          n += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.25;
          n += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.125;
          return (n + 1) * 0.5;
        }
        
        function generateChunkTerrain(chunkX, chunkZ, chunkSize) {
          const positions = [];
          const normals = [];
          const uvs = [];
          const indices = [];
          let vertexIndex = 0;
          
          for (let x = 0; x < chunkSize; x += 2) {
            for (let z = 0; z < chunkSize; z += 2) {
              const worldX = chunkX * chunkSize + x;
              const worldZ = chunkZ * chunkSize + z;
              
              const heightNoise = simpleNoise(worldX * 0.1, worldZ * 0.1);
              const height = Math.floor(heightNoise * 12) + 4;
              
              const blockSize = 2;
              
              // 8 Vertices für Würfel
              const vertices = [
                x, 0, z,
                x + blockSize, 0, z,
                x + blockSize, 0, z + blockSize,
                x, 0, z + blockSize,
                x, height, z,
                x + blockSize, height, z,
                x + blockSize, height, z + blockSize,
                x, height, z + blockSize
              ];
              
              positions.push(...vertices);
              
              for (let i = 0; i < 8; i++) {
                normals.push(0, 1, 0);
                uvs.push(0, 0);
              }
              
              const base = vertexIndex + 4;
              indices.push(
                base, base + 1, base + 2,
                base, base + 2, base + 3,
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
        
        setTimeout(() => {
          self.postMessage({ type: 'ready' });
        }, 10);
      `;
      
      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(workerBlob));
      
      worker.addEventListener('message', (event: MessageEvent<any>) => {
        this.handleWorkerMessage(event.data, index);
      });
      
      worker.onerror = (error: ErrorEvent) => {
        console.error(`Fallback Worker ${index} Fehler:`, error);
      };
      
      this.workers.push(worker);
      console.log(`Fallback Worker ${index} erstellt`);
      return worker;
    } catch (error) {
      console.error(`Fallback Worker ${index} fehlgeschlagen:`, error);
      return null;
    }
  }
  
  private handleWorkerMessage(data: any, workerIndex?: number): void {
    switch (data.type) {
      case 'ready':
        console.log(`Worker ${workerIndex} bereit`);
        break;
        
      case 'initialized':
        this.workerInitialized++;
        console.log(`Worker ${workerIndex} initialisiert (${this.workerInitialized}/${this.MAX_WORKERS})`);
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
  
  private handleChunkGenerated(data: any): void {
    const { chunkX, chunkZ, meshData } = data;
    const chunkKey = `${chunkX},${chunkZ}`;
    
    console.log(`Chunk ${chunkKey} generiert mit ${meshData.positions.length / 3} Vertices`);
    this.loadingChunks.delete(chunkKey);
    
    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      chunk = {
        x: chunkX,
        z: chunkZ,
        voxels: new Uint8Array(0),
        isGenerated: false,
        isVisible: true,
      };
      this.chunks.set(chunkKey, chunk);
    }
    
    try {
      if (!chunk.mesh) {
        chunk.mesh = this.createMesh();
      }
      
      const geometry = chunk.mesh.geometry as THREE.BufferGeometry;
      
      if (meshData.positions.length > 0) {
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
        
        if (meshData.indices.length > 0) {
          geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        }
        
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
      }
      
      chunk.mesh.position.set(
        chunkX * this.CHUNK_SIZE,
        0,
        chunkZ * this.CHUNK_SIZE
      );
      
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
    if (this.chunkPool.length > 0) {
      const mesh = this.chunkPool.pop()!;
      mesh.geometry = new THREE.BufferGeometry();
      return mesh;
    }
    
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, this.chunkMaterial);
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    
    return mesh;
    mesh.frustumCulled = false; // DEBUG – Sicherheitsmaßnahme
  }
  
  public updateChunks(playerPosition: THREE.Vector3): void {
    const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);
    
    for (let x = -this.RENDER_DISTANCE; x <= this.RENDER_DISTANCE; x++) {
      for (let z = -this.RENDER_DISTANCE; z <= this.RENDER_DISTANCE; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (!this.chunks.has(chunkKey) && !this.loadingChunks.has(chunkKey)) {
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
    
    this.cleanupDistantChunks(playerChunkX, playerChunkZ);
  }
  
  private requestChunkGeneration(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.loadingChunks.has(chunkKey) || this.workers.length === 0) {
      return;
    }
    
    this.loadingChunks.add(chunkKey);
    console.log(`Chunk ${chunkKey} angefordert`);
    
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
    
    this.workers.forEach((worker, i) => {
      try {
        worker.terminate();
        console.log(`Worker ${i} beendet`);
      } catch (error) {
        console.error(`Fehler beim Beenden von Worker ${i}:`, error);
      }
    });
    this.workers.length = 0;
    
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
