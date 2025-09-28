import * as THREE from 'three';
import type { ChunkData, RaycastResult } from '../../types/game';
import { BlockType } from '../../types/game';

export class ChunkManager {
  private chunks = new Map<string, ChunkData>();
  private chunkPool: THREE.Mesh[] = [];
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly CHUNK_SIZE = 16;
  private readonly RENDER_DISTANCE = 6;
  private readonly MAX_WORKERS = Math.min(3, navigator.hardwareConcurrency || 2); // ✅ Reduced for stability
  
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();
  
  // Performance & Safety
  private loadingChunks = new Set<string>();
  private workerInitialized = 0;
  private isDisposed = false; // ✅ Crash prevention
  
  // Materials für verschiedene Block-Typen
  private materials: Map<BlockType, THREE.Material> = new Map();
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.initializeMaterials();
    this.initializeWorkers();
    console.log('🏗️ Enhanced ChunkManager initialized');
  }
  
  private initializeMaterials(): void {
    // Enhanced materials with better performance
    const materialConfig = { side: THREE.DoubleSide };
    
    this.materials.set(BlockType.GRASS, new THREE.MeshLambertMaterial({ 
      color: 0x4a8b3b, ...materialConfig 
    }));
    this.materials.set(BlockType.DIRT, new THREE.MeshLambertMaterial({ 
      color: 0x8b4513, ...materialConfig 
    }));
    this.materials.set(BlockType.STONE, new THREE.MeshLambertMaterial({ 
      color: 0x666666, ...materialConfig 
    }));
    this.materials.set(BlockType.WOOD, new THREE.MeshLambertMaterial({ 
      color: 0x8B4513, ...materialConfig 
    }));
    this.materials.set(BlockType.LEAVES, new THREE.MeshLambertMaterial({ 
      color: 0x228B22, transparent: true, opacity: 0.8, ...materialConfig
    }));
    this.materials.set(BlockType.SAND, new THREE.MeshLambertMaterial({ 
      color: 0xF4A460, ...materialConfig 
    }));
    this.materials.set(BlockType.WATER, new THREE.MeshLambertMaterial({ 
      color: 0x1E90FF, transparent: true, opacity: 0.7, ...materialConfig
    }));
    this.materials.set(BlockType.COAL, new THREE.MeshLambertMaterial({ 
      color: 0x36454F, ...materialConfig 
    }));
    this.materials.set(BlockType.IRON, new THREE.MeshLambertMaterial({ 
      color: 0xC0C0C0, ...materialConfig 
    }));
  }
  
  private async initializeWorkers(): Promise<void> {
    if (this.isDisposed) return;
    
    console.log(`🔧 Initializing ${this.MAX_WORKERS} enhanced workers...`);
    
    // ✅ STABILIZED WORKER CREATION
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      try {
        const worker = this.createEnhancedWorker(i);
        if (worker) {
          this.workers.push(worker);
          // Small delay between worker creations for stability
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Worker ${i} creation failed:`, error);
      }
    }
    
    console.log(`✅ ${this.workers.length}/${this.MAX_WORKERS} workers ready`);
    
    // Start chunk generation after workers are ready
    setTimeout(() => {
      if (!this.isDisposed && this.workers.length > 0) {
        this.triggerInitialChunkLoad();
      }
    }, 500);
  }
  
private createEnhancedWorker(index: number): Worker | null {
  if (this.isDisposed) return null;
  try {
    // ✅ CORRECTED WORKER WITH COMPLETE 6-FACE CUBES
    const workerCode = `
      console.log('🤖 Enhanced Worker ${index} with complete block faces starting...');
      
      const BLOCK_TYPES = {
        AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WATER: 4,
        WOOD: 5, LEAVES: 6, SAND: 7, COAL: 8, IRON: 9
      };
      
      // Enhanced noise function
      function enhancedNoise(x, z, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 0.01;
        
        for (let i = 0; i < octaves; i++) {
          value += Math.sin(x * frequency) * Math.cos(z * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        return (value + 1) * 0.5;
      }
      
      // Biome generation
      function getBiome(x, z) {
        const temp = enhancedNoise(x * 0.005, z * 0.005, 2);
        const humidity = enhancedNoise(x * 0.007, z * 0.007, 2);
        
        if (temp < 0.3) return 'mountains';
        if (humidity < 0.3) return 'desert';
        if (humidity > 0.7) return 'forest';
        return 'plains';
      }
      
      // ✅ COMPLETE 6-FACE CUBE GENERATION
      function addCompleteCube(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
        const size = 1;
        
        // ✅ ALL 8 VERTICES OF CUBE
        const vertices = [
          // Bottom face (y)
          x, y, z,                    // 0: bottom-front-left
          x + size, y, z,             // 1: bottom-front-right  
          x + size, y, z + size,      // 2: bottom-back-right
          x, y, z + size,             // 3: bottom-back-left
          // Top face (y + size)
          x, y + size, z,             // 4: top-front-left
          x + size, y + size, z,      // 5: top-front-right
          x + size, y + size, z + size, // 6: top-back-right
          x, y + size, z + size       // 7: top-back-left
        ];
        
        positions.push(...vertices);
        
        // ✅ COLORS AND UVS FOR ALL 8 VERTICES
        for (let i = 0; i < 8; i++) {
          colors.push(...color);
          uvs.push((i % 2), Math.floor(i / 4));
        }
        
        // ✅ NORMALS FOR ALL 6 FACES (4 vertices each)
        // We'll set them per face when creating indices
        
        // ✅ ALL 6 FACES WITH PROPER NORMALS
        const faceIndices = [
          // Top face (y+)
          [4, 5, 6, 4, 6, 7, 0, 1, 0], // normal: (0, 1, 0)
          // Bottom face (y-)  
          [0, 3, 2, 0, 2, 1, 0, -1, 0], // normal: (0, -1, 0)
          // Front face (z-)
          [0, 1, 5, 0, 5, 4, 0, 0, -1], // normal: (0, 0, -1)
          // Back face (z+)
          [2, 3, 7, 2, 7, 6, 0, 0, 1], // normal: (0, 0, 1)
          // Right face (x+)
          [1, 2, 6, 1, 6, 5, 1, 0, 0], // normal: (1, 0, 0)
          // Left face (x-)
          [3, 0, 4, 3, 4, 7, -1, 0, 0] // normal: (-1, 0, 0)
        ];
        
        faceIndices.forEach(([i1, i2, i3, i4, i5, i6, nx, ny, nz]) => {
          // Add face indices
          indices.push(
            vertexIndex + i1, vertexIndex + i2, vertexIndex + i3,
            vertexIndex + i4, vertexIndex + i5, vertexIndex + i6
          );
          
          // Add normals for this face (6 vertices = 2 triangles)
          for (let j = 0; j < 6; j++) {
            normals.push(nx, ny, nz);
          }
        });
      }
      
      // ✅ SEAMLESS TERRAIN GENERATION
      function generateEnhancedTerrain(chunkX, chunkZ, chunkSize) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const colors = [];
        let vertexIndex = 0;
        
        console.log(\`🌍 Generating seamless chunk \${chunkX},\${chunkZ}\`);
        
        // ✅ SEAMLESS LOOP - NO GAPS!
        for (let x = 0; x < chunkSize; x++) {
          for (let z = 0; z < chunkSize; z++) {
            const worldX = chunkX * chunkSize + x;
            const worldZ = chunkZ * chunkSize + z;
            
            const biome = getBiome(worldX, worldZ);
            const heightNoise = enhancedNoise(worldX, worldZ, 4);
            
            let baseHeight, blockColor;
            
            switch (biome) {
              case 'mountains':
                baseHeight = Math.floor(heightNoise * 20) + 8;
                blockColor = [0.4, 0.4, 0.4]; // Stone
                break;
              case 'desert':
                baseHeight = Math.floor(heightNoise * 6) + 4;
                blockColor = [0.96, 0.64, 0.38]; // Sand
                break;
              case 'forest':
                baseHeight = Math.floor(heightNoise * 12) + 6;
                blockColor = [0.2, 0.7, 0.2]; // Grass
                
                // ✅ TREES IN FOREST
                if (Math.random() < 0.06) {
                  // Tree trunk (3 blocks high)
                  for (let treeY = 0; treeY < 3; treeY++) {
                    addCompleteCube(positions, normals, uvs, colors, indices, 
                      x, baseHeight + 1 + treeY, z, [0.55, 0.27, 0.07], vertexIndex);
                    vertexIndex += 8;
                  }
                  // Tree leaves (2 blocks high)
                  for (let leafY = 0; leafY < 2; leafY++) {
                    addCompleteCube(positions, normals, uvs, colors, indices, 
                      x, baseHeight + 4 + leafY, z, [0.13, 0.55, 0.13], vertexIndex);
                    vertexIndex += 8;
                  }
                }
                break;
              default: // plains
                baseHeight = Math.floor(heightNoise * 10) + 5;
                blockColor = [0.3, 0.6, 0.2]; // Grass
            }
            
            // ✅ SEAMLESS TERRAIN COLUMN - NO GAPS
            for (let y = 0; y <= baseHeight; y++) {
              let currentColor = blockColor;
              
              // Layer-based coloring
              if (y < baseHeight - 2) {
                currentColor = [0.5, 0.5, 0.5]; // Stone deep
              } else if (y < baseHeight) {
                currentColor = [0.4, 0.2, 0.1]; // Dirt
              }
              // Top layer keeps biome color
              
              addCompleteCube(positions, normals, uvs, colors, indices, 
                x, y, z, currentColor, vertexIndex);
              vertexIndex += 8;
            }
            
            // ✅ WATER LEVEL (seamless)
            const waterLevel = 6;
            if (baseHeight < waterLevel) {
              for (let y = baseHeight + 1; y <= waterLevel; y++) {
                addCompleteCube(positions, normals, uvs, colors, indices, 
                  x, y, z, [0.2, 0.6, 1.0], vertexIndex);
                vertexIndex += 8;
              }
            }
          }
        }
        
        console.log(\`✅ Chunk \${chunkX},\${chunkZ} complete: \${positions.length/3} vertices, \${indices.length/3} triangles\`);
        
        return {
          positions: new Float32Array(positions),
          normals: new Float32Array(normals),
          uvs: new Float32Array(uvs),
          colors: new Float32Array(colors),
          indices: new Uint32Array(indices)
        };
      }
      
      // ✅ MESSAGE HANDLING
      self.addEventListener('message', function(e) {
        try {
          const { data } = e;
          
          if (data.type === 'init') {
            console.log('🤖 Enhanced Worker ${index} initialized');
            self.postMessage({ type: 'initialized' });
          } else if (data.type === 'generate') {
            const { chunkX, chunkZ, chunkSize } = data;
            console.log(\`🌍 Worker ${index} generating COMPLETE chunk \${chunkX},\${chunkZ}\`);
            
            const meshData = generateEnhancedTerrain(chunkX, chunkZ, chunkSize);
            
            self.postMessage({
              type: 'chunkGenerated',
              chunkX,
              chunkZ,
              meshData
            });
          } else if (data.type === 'dispose') {
            console.log('🧹 Enhanced Worker ${index} disposing...');
            self.close();
          }
        } catch (error) {
          console.error('❌ Enhanced Worker ${index} error:', error);
          self.postMessage({
            type: 'error',
            workerId: ${index},
            message: error.message || 'Unknown worker error'
          });
        }
      });
      
      // Worker ready
      setTimeout(() => {
        self.postMessage({ type: 'ready' });
      }, 50);
    `;
    
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(workerBlob));
    
    // Event handling (same as before)
    worker.addEventListener('message', (event: MessageEvent<any>) => {
      if (!this.isDisposed) {
        this.handleWorkerMessage(event.data, index);
      }
    });
    
    worker.addEventListener('error', (error: ErrorEvent) => {
      console.error(`🚨 Enhanced Worker ${index} error:`, error);
      this.handleWorkerError(index);
    });
    
    worker.postMessage({ type: 'init', seed: Date.now() + index });
    
    console.log(`✅ Enhanced Worker ${index} with complete blocks created`);
    return worker;
  } catch (error) {
    console.error(`❌ Enhanced Worker ${index} failed:`, error);
    return null;
  }
  }

  
  private handleWorkerMessage(data: any, workerIndex?: number): void {
    if (this.isDisposed) return;
    
    switch (data.type) {
      case 'ready':
        console.log(`🟢 Enhanced Worker ${workerIndex} ready`);
        break;
        
      case 'initialized':
        this.workerInitialized++;
        console.log(`🚀 Enhanced Worker ${workerIndex} initialized (${this.workerInitialized}/${this.MAX_WORKERS})`);
        
        if (this.workerInitialized === this.MAX_WORKERS) {
          console.log('🎊 All enhanced workers ready! Starting chunk generation...');
        }
        break;
        
      case 'chunkGenerated':
        this.handleEnhancedChunkGenerated(data);
        break;
        
      case 'error':
        console.error(`❌ Enhanced Worker ${workerIndex} error:`, data.message);
        this.handleWorkerError(data.workerId || workerIndex);
        break;
        
      default:
        console.warn('❓ Unknown worker message:', data);
    }
  }
  
  private handleWorkerError(workerIndex?: number): void {
    if (this.isDisposed || workerIndex === undefined) return;
    
    console.warn(`⚠️ Handling enhanced worker ${workerIndex} error...`);
    
    // Remove failed chunks from loading state
    this.loadingChunks.forEach((chunkKey) => {
      const [x, z] = chunkKey.split(',').map(Number);
      const workerForChunk = ((x + z) % this.workers.length);
      if (workerForChunk === workerIndex) {
        this.loadingChunks.delete(chunkKey);
      }
    });
    
    // Attempt to restart worker after delay
    setTimeout(() => {
      if (!this.isDisposed && this.workers[workerIndex]) {
        try {
          this.workers[workerIndex].terminate();
          const newWorker = this.createEnhancedWorker(workerIndex);
          if (newWorker) {
            this.workers[workerIndex] = newWorker;
            console.log(`✅ Enhanced Worker ${workerIndex} restarted`);
          }
        } catch (error) {
          console.error(`❌ Failed to restart enhanced worker ${workerIndex}:`, error);
        }
      }
    }, 2000);
  }
  
  private triggerInitialChunkLoad(): void {
    if (this.isDisposed) return;
    
    console.log('🌍 Loading initial enhanced chunks...');
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        this.requestChunkGeneration(x, z);
      }
    }
  }
  
  private handleEnhancedChunkGenerated(data: any): void {
    if (this.isDisposed) return;
    
    const { chunkX, chunkZ, meshData } = data;
    const chunkKey = `${chunkX},${chunkZ}`;
    
    console.log(`🎨 Enhanced chunk ${chunkKey} generated with ${meshData.positions.length / 3} vertices`);
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
        // ✅ SAFE ATTRIBUTE SETTING
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
      
      if (!chunk.mesh.parent && !this.isDisposed) {
        this.scene.add(chunk.mesh);
        console.log(`✅ Enhanced chunk ${chunkKey} added to scene`);
      }
      
      chunk.isGenerated = true;
      chunk.isVisible = true;
      
    } catch (error) {
      console.error(`❌ Error creating enhanced chunk mesh ${chunkKey}:`, error);
    }
  }
  
  private createEnhancedMesh(): THREE.Mesh {
    // Try to reuse from pool
    if (this.chunkPool.length > 0) {
      const mesh = this.chunkPool.pop()!;
      mesh.geometry = new THREE.BufferGeometry();
      return mesh;
    }
    
    // Enhanced material with vertex colors
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // Disable for stability
    mesh.castShadow = false; // Performance
    mesh.receiveShadow = false; // Performance
    
    return mesh;
  }
  
  // ✅ ENHANCED PUBLIC INTERFACE
  public updateChunks(playerPosition: THREE.Vector3): void {
    if (this.isDisposed) return;
    
    const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);
    
    // Generate new chunks in range
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
    if (this.isDisposed) return { hit: false };
    
    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersects: THREE.Intersection[] = [];
    
    this.chunks.forEach(chunk => {
      if (chunk.mesh && chunk.isGenerated && !this.isDisposed) {
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
    if (this.isDisposed) return false;
    
    const material = this.materials.get(blockType);
    if (!material) return false;
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 0.5;
    
    if (!this.isDisposed) {
      this.scene.add(mesh);
      console.log(`🧱 Enhanced block ${BlockType[blockType]} placed at:`, position);
      return true;
    }
    
    return false;
  }
  
  public removeBlock(position: THREE.Vector3): boolean {
    if (this.isDisposed) return false;
    
    const objectsToRemove: THREE.Object3D[] = [];
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.parent === this.scene) {
        const distance = object.position.distanceTo(position);
        if (distance < 1.5) {
          objectsToRemove.push(object);
        }
      }
    });
    
    objectsToRemove.forEach(obj => {
      if (!this.isDisposed) {
        this.scene.remove(obj);
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      }
    });
    
    console.log(`🔥 ${objectsToRemove.length} enhanced blocks removed at:`, position);
    return objectsToRemove.length > 0;
  }
  
  private requestChunkGeneration(chunkX: number, chunkZ: number): void {
    if (this.isDisposed || this.workers.length === 0) return;
    
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.loadingChunks.has(chunkKey)) return;
    
    this.loadingChunks.add(chunkKey);
    
    const workerIndex = ((chunkX + chunkZ) % this.workers.length);
    const worker = this.workers[workerIndex];
    
    try {
      worker.postMessage({
        type: 'generate',
        chunkX,
        chunkZ,
        chunkSize: this.CHUNK_SIZE,
      });
    } catch (error) {
      console.error(`❌ Error sending to enhanced worker:`, error);
      this.loadingChunks.delete(chunkKey);
    }
  }
  
  private cleanupDistantChunks(playerChunkX: number, playerChunkZ: number): void {
    if (this.isDisposed) return;
    
    const chunksToRemove: string[] = [];
    const maxDistance = this.RENDER_DISTANCE + 2;
    
    for (const [chunkKey, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.x - playerChunkX),
        Math.abs(chunk.z - playerChunkZ)
      );
      
      if (distance > maxDistance) {
        chunksToRemove.push(chunkKey);
        
        if (chunk.mesh && !this.isDisposed) {
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
      console.log(`🧹 ${chunksToRemove.length} enhanced chunks cleaned up`);
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
  
  // ✅ ENHANCED DISPOSAL WITH COMPLETE CLEANUP
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    console.log('🧹 Enhanced ChunkManager disposing...');
    
    // Terminate all workers safely
    this.workers.forEach((worker, i) => {
      try {
        worker.postMessage({ type: 'dispose' });
        setTimeout(() => {
          worker.terminate();
        }, 100);
        console.log(`✅ Enhanced Worker ${i} disposed`);
      } catch (error) {
        console.error(`❌ Error disposing enhanced worker ${i}:`, error);
      }
    });
    this.workers.length = 0;
    
    // Cleanup all meshes
    this.chunks.forEach(chunk => {
      if (chunk.mesh) {
        if (chunk.mesh.parent) {
          chunk.mesh.parent.remove(chunk.mesh);
        }
        chunk.mesh.geometry.dispose();
      }
    });
    
    // Cleanup pool
    this.chunkPool.forEach(mesh => {
      mesh.geometry.dispose();
    });
    
    // Clear all data structures
    this.chunks.clear();
    this.chunkPool.length = 0;
    this.loadingChunks.clear();
    this.materials.clear();
    
    console.log('✅ Enhanced ChunkManager disposal complete');
  }
}
