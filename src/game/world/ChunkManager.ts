import * as THREE from 'three';
import type { ChunkData, RaycastResult } from '../../types/game';
import { BlockType } from '../../types/game'; // ✅ Normaler Import!


export class ChunkManager {
  private chunks = new Map<string, ChunkData>();
  private chunkPool: THREE.Mesh[] = [];
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly CHUNK_SIZE = 16;
  private readonly RENDER_DISTANCE = 6;
  private readonly MAX_WORKERS = Math.min(4, navigator.hardwareConcurrency || 2);
  
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();
  
  // Performance Optimierungen
  private loadingChunks = new Set<string>();
  private workerInitialized = 0;
  
  // Materials für verschiedene Block-Typen
  private materials: Map<BlockType, THREE.Material> = new Map();
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.initializeMaterials();
    this.initializeWorkers();
  }
  
  private initializeMaterials(): void {
    // Verschiedene Materialien für Block-Typen
    this.materials.set(BlockType.GRASS, new THREE.MeshLambertMaterial({ 
      color: 0x4a8b3b, side: THREE.DoubleSide 
    }));
    this.materials.set(BlockType.DIRT, new THREE.MeshLambertMaterial({ 
      color: 0x8b4513, side: THREE.DoubleSide 
    }));
    this.materials.set(BlockType.STONE, new THREE.MeshLambertMaterial({ 
      color: 0x666666, side: THREE.DoubleSide 
    }));
    this.materials.set(BlockType.WOOD, new THREE.MeshLambertMaterial({ 
      color: 0x8B4513, side: THREE.DoubleSide 
    }));
    this.materials.set(BlockType.LEAVES, new THREE.MeshLambertMaterial({ 
      color: 0x228B22, side: THREE.DoubleSide, transparent: true, opacity: 0.8
    }));
    this.materials.set(BlockType.SAND, new THREE.MeshLambertMaterial({ 
      color: 0xF4A460, side: THREE.DoubleSide 
    }));
    this.materials.set(BlockType.WATER, new THREE.MeshLambertMaterial({ 
      color: 0x1E90FF, side: THREE.DoubleSide, transparent: true, opacity: 0.7
    }));
  }
  
  private async initializeWorkers(): Promise<void> {
    console.log(`Initialisiere ${this.MAX_WORKERS} Workers...`);
    
    const workerPromises = Array.from({ length: this.MAX_WORKERS }, async (_, i) => {
      return this.createFallbackWorker(i);
    });
    
    const workers = await Promise.allSettled(workerPromises);
    
    workers.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        // Worker wurde bereits zu this.workers hinzugefügt
      }
    });
    
    console.log(`${this.workers.length}/${this.MAX_WORKERS} Workers bereit`);
    this.workerInitialized = this.workers.length;
    
    // Initiale Chunks laden
    setTimeout(() => {
      this.triggerInitialChunkLoad();
    }, 500);
  }
  
  private createFallbackWorker(index: number): Worker | null {
    try {
      const workerCode = `
        console.log('Enhanced Worker ${index} gestartet');
        
        const BLOCK_TYPES = {
          AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WATER: 4,
          WOOD: 5, LEAVES: 6, SAND: 7, COAL: 8, IRON: 9
        };
        
        function simpleNoise(x, z) {
          let n = 0;
          n += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
          n += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.25;
          n += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.125;
          return (n + 1) * 0.5;
        }
        
        function generateEnhancedTerrain(chunkX, chunkZ, chunkSize) {
          const positions = [];
          const normals = [];
          const uvs = [];
          const indices = [];
          const colors = [];
          let vertexIndex = 0;
          
          for (let x = 0; x < chunkSize; x += 2) {
            for (let z = 0; z < chunkSize; z += 2) {
              const worldX = chunkX * chunkSize + x;
              const worldZ = chunkZ * chunkSize + z;
              
              const heightNoise = simpleNoise(worldX * 0.1, worldZ * 0.1);
              const height = Math.floor(heightNoise * 16) + 4;
              
              // Biom-bestimmung
              const temperatureNoise = simpleNoise(worldX * 0.02, worldZ * 0.02);
              const moistureNoise = simpleNoise(worldX * 0.03, worldZ * 0.03);
              
              let blockType = BLOCK_TYPES.GRASS;
              let blockColor = [0.3, 0.6, 0.2]; // Grün
              
              if (temperatureNoise < 0.3) {
                blockType = BLOCK_TYPES.STONE;
                blockColor = [0.4, 0.4, 0.4]; // Grau
              } else if (moistureNoise < 0.2) {
                blockType = BLOCK_TYPES.SAND;
                blockColor = [0.96, 0.64, 0.38]; // Sand
              } else if (heightNoise > 0.7) {
                blockType = BLOCK_TYPES.STONE;
                blockColor = [0.5, 0.5, 0.5]; // Gestein
              }
              
              // Bäume spawnen
              if (blockType === BLOCK_TYPES.GRASS && Math.random() < 0.05) {
                // Baum-Stamm
                for (let treeY = 0; treeY < 3; treeY++) {
                  this.addBlock(positions, normals, uvs, colors, indices, 
                    x, height + treeY, z, 2, [0.55, 0.27, 0.07], vertexIndex);
                  vertexIndex += 8;
                }
                // Baum-Krone (vereinfacht)
                this.addBlock(positions, normals, uvs, colors, indices, 
                  x, height + 3, z, 3, [0.13, 0.55, 0.13], vertexIndex);
                vertexIndex += 8;
              } else {
                // Normaler Block
                this.addBlock(positions, normals, uvs, colors, indices, 
                  x, height, z, 2, blockColor, vertexIndex);
                vertexIndex += 8;
              }
            }
          }
          
          return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            colors: new Float32Array(colors),
            indices: new Uint32Array(indices)
          };
        }
        
        function addBlock(positions, normals, uvs, colors, indices, x, y, z, size, color, vertexIndex) {
          // 8 Vertices für Würfel
          const vertices = [
            x, y, z,
            x + size, y, z,
            x + size, y, z + size,
            x, y, z + size,
            x, y + size, z,
            x + size, y + size, z,
            x + size, y + size, z + size,
            x, y + size, z + size
          ];
          
          positions.push(...vertices);
          
          // Normalen für alle Faces
          for (let i = 0; i < 8; i++) {
            normals.push(0, 1, 0);
            uvs.push(0, 0);
            colors.push(...color);
          }
          
          // Top face indices
          const base = vertexIndex + 4;
          indices.push(
            base, base + 1, base + 2,
            base, base + 2, base + 3,
            // Side faces
            vertexIndex, vertexIndex + 4, vertexIndex + 1,
            vertexIndex + 1, vertexIndex + 4, vertexIndex + 5
          );
        }
        
        self.addEventListener('message', function(e) {
          try {
            if (e.data.type === 'init') {
              self.postMessage({ type: 'initialized' });
            } else if (e.data.type === 'generate') {
              const { chunkX, chunkZ, chunkSize } = e.data;
              const meshData = generateEnhancedTerrain(chunkX, chunkZ, chunkSize);
              
              self.postMessage({
                type: 'chunkGenerated',
                chunkX,
                chunkZ,
                meshData
              });
            }
          } catch (error) {
            self.postMessage({
              type: 'error',
              message: error.message || 'Worker Fehler'
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
        console.error(`Enhanced Worker ${index} Fehler:`, error);
      };
      
      this.workers.push(worker);
      console.log(`Enhanced Worker ${index} erstellt`);
      return worker;
    } catch (error) {
      console.error(`Enhanced Worker ${index} fehlgeschlagen:`, error);
      return null;
    }
  }
  
  private handleWorkerMessage(data: any, workerIndex?: number): void {
    switch (data.type) {
      case 'ready':
        console.log(`Worker ${workerIndex} bereit`);
        break;
        
      case 'initialized':
        console.log(`Worker ${workerIndex} initialisiert`);
        break;
        
      case 'chunkGenerated':
        this.handleChunkGenerated(data);
        break;
        
      case 'error':
        console.error(`Worker ${workerIndex} Fehler:`, data.message);
        break;
    }
  }
  
  private triggerInitialChunkLoad(): void {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        this.requestChunkGeneration(x, z);
      }
    }
  }
  
  private handleChunkGenerated(data: any): void {
    const { chunkX, chunkZ, meshData } = data;
    const chunkKey = `${chunkX},${chunkZ}`;
    
    console.log(`Enhanced Chunk ${chunkKey} generiert mit ${meshData.positions.length / 3} Vertices`);
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
        chunk.mesh = this.createEnhancedMesh();
      }
      
      const geometry = chunk.mesh.geometry as THREE.BufferGeometry;
      
      if (meshData.positions.length > 0) {
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
        
        if (meshData.colors) {
          geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
        }
        
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
        console.log(`Enhanced Chunk ${chunkKey} zur Szene hinzugefügt`);
      }
      
      chunk.isGenerated = true;
      chunk.isVisible = true;
      
    } catch (error) {
      console.error(`Fehler beim Erstellen der Enhanced Chunk-Mesh ${chunkKey}:`, error);
    }
  }
  
  private createEnhancedMesh(): THREE.Mesh {
    if (this.chunkPool.length > 0) {
      const mesh = this.chunkPool.pop()!;
      mesh.geometry = new THREE.BufferGeometry();
      return mesh;
    }
    
    // Material mit Vertex-Colors
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
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
  
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 10): RaycastResult {
    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersects: THREE.Intersection[] = [];
    
    this.chunks.forEach(chunk => {
      if (chunk.mesh && chunk.isGenerated) {
        const chunkIntersects = raycaster.intersectObject(chunk.mesh);
        intersects.push(...chunkIntersects);
      }
    });
    
    if (intersects.length > 0) {
      const closest = intersects[0];
      return {
        hit: true,
        position: closest.point,
        normal: closest.face?.normal,
        chunkCoord: {
          x: Math.floor(closest.point.x / this.CHUNK_SIZE),
          z: Math.floor(closest.point.z / this.CHUNK_SIZE)
        },
        blockCoord: {
          x: Math.floor(closest.point.x),
          y: Math.floor(closest.point.y),
          z: Math.floor(closest.point.z)
        }
      };
    }
    
    return { hit: false };
  }
  
  public placeBlock(position: THREE.Vector3, blockType: BlockType): boolean {
    // Vereinfachte Block-Platzierung (würde normalerweise die Chunk-Daten modifizieren)
    const material = this.materials.get(blockType);
    if (!material) return false;
    
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 1; // Etwas höher platzieren
    this.scene.add(mesh);
    
    console.log(`Block ${BlockType[blockType]} platziert bei:`, position);
    return true;
  }
  
  public removeBlock(position: THREE.Vector3): boolean {
  const objectsToRemove: THREE.Object3D[] = [];
  
  this.scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.parent === this.scene) { // ✅ Fix comparison
      const distance = object.position.distanceTo(position);
      if (distance < 1.5) {
        objectsToRemove.push(object);
      }
    }
  });
  
  objectsToRemove.forEach(obj => {
    this.scene.remove(obj);
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
    }
  });
  
  console.log(`${objectsToRemove.length} Blöcke entfernt bei:`, position);
  return objectsToRemove.length > 0;
}

    
  
  private requestChunkGeneration(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.loadingChunks.has(chunkKey) || this.workers.length === 0) {
      return;
    }
    
    this.loadingChunks.add(chunkKey);
    
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
    const maxDistance = this.RENDER_DISTANCE + 2;
    
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
    console.log('Enhanced ChunkManager wird aufgeräumt...');
    
    this.workers.forEach((worker, i) => {
      try {
        worker.terminate();
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
    
    console.log('Enhanced ChunkManager Cleanup abgeschlossen');
  }
}
