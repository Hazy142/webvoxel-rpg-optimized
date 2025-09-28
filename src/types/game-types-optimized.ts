// ✅ OPTIMIZED Game Types with Voxel Data Support
import * as THREE from 'three';

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WATER = 4,
  WOOD = 5,
  LEAVES = 6,
  SAND = 7,
  COAL = 8,
  IRON = 9
}

export interface ChunkData {
  x: number;
  z: number;
  voxels: Uint8Array; // ✅ CRITICAL: Stores voxel data for efficient remeshing
  isGenerated: boolean;
  isVisible: boolean;
  mesh?: THREE.Mesh;
  needsRemesh?: boolean; // ✅ NEW: Tracks if chunk needs remeshing
}

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  voxelData?: Uint8Array; // ✅ NEW: Voxel data for remeshing
}

// ✅ Worker Message Types
export interface WorkerMessage {
  type: 'init' | 'generate' | 'regenerate' | 'dispose';
  chunkX?: number;
  chunkZ?: number;
  chunkSize?: number;
  voxelData?: Uint8Array;
}

export interface WorkerResponse {
  type: 'initialized' | 'ready' | 'chunkGenerated' | 'chunkRegenerated' | 'error';
  chunkX?: number;
  chunkZ?: number;
  meshData?: MeshData;
  message?: string;
}

// ✅ Performance Monitoring
export interface PerformanceStats {
  chunksLoaded: number;
  chunksVisible: number;
  totalVertices: number;
  renderCalls: number;
  memoryUsage?: number;
}

// ✅ Chunk Generation Configuration
export interface ChunkConfig {
  size: number;
  worldHeight: number;
  renderDistance: number;
  maxWorkers: number;
  enableFrustumCulling: boolean;
  enableHiddenFaceCulling: boolean;
}

// ✅ Block Interaction Events
export interface BlockInteractionEvent {
  type: 'place' | 'remove';
  position: THREE.Vector3;
  blockType?: BlockType;
  success: boolean;
  timestamp: number;
}

// ✅ Biome Configuration
export interface BiomeConfig {
  name: string;
  surfaceBlock: BlockType;
  subSurfaceBlock: BlockType;
  baseHeight: number;
  heightVariation: number;
  treeChance?: number;
  structureChance?: number;
}

export const DEFAULT_BIOMES: Record<string, BiomeConfig> = {
  plains: {
    name: 'Plains',
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    baseHeight: 5,
    heightVariation: 10
  },
  mountains: {
    name: 'Mountains',
    surfaceBlock: BlockType.STONE,
    subSurfaceBlock: BlockType.STONE,
    baseHeight: 8,
    heightVariation: 20
  },
  desert: {
    name: 'Desert',
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    baseHeight: 4,
    heightVariation: 6
  },
  forest: {
    name: 'Forest',
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    baseHeight: 6,
    heightVariation: 12,
    treeChance: 0.06
  }
};

// ✅ Default Configuration
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  size: 16,
  worldHeight: 32,
  renderDistance: 8,
  maxWorkers: 4,
  enableFrustumCulling: true,
  enableHiddenFaceCulling: true
};

// ✅ Utility Functions
export class ChunkUtils {
  /**
   * Convert world position to chunk coordinates
   */
  static worldToChunk(worldX: number, worldZ: number, chunkSize: number): { x: number; z: number } {
    return {
      x: Math.floor(worldX / chunkSize),
      z: Math.floor(worldZ / chunkSize)
    };
  }

  /**
   * Convert chunk coordinates to world position
   */
  static chunkToWorld(chunkX: number, chunkZ: number, chunkSize: number): { x: number; z: number } {
    return {
      x: chunkX * chunkSize,
      z: chunkZ * chunkSize
    };
  }

  /**
   * Convert world position to local chunk coordinates
   */
  static worldToLocal(worldX: number, worldZ: number, chunkSize: number): { x: number; z: number } {
    const chunk = ChunkUtils.worldToChunk(worldX, worldZ, chunkSize);
    const world = ChunkUtils.chunkToWorld(chunk.x, chunk.z, chunkSize);
    return {
      x: worldX - world.x,
      z: worldZ - world.z
    };
  }

  /**
   * Calculate 3D array index from coordinates
   */
  static coordsToIndex(x: number, y: number, z: number, width: number, height: number): number {
    return (x * height * width) + (y * width) + z;
  }

  /**
   * Calculate coordinates from 3D array index
   */
  static indexToCoords(index: number, width: number, height: number): { x: number; y: number; z: number } {
    const x = Math.floor(index / (height * width));
    const remaining = index % (height * width);
    const y = Math.floor(remaining / width);
    const z = remaining % width;
    return { x, y, z };
  }

  /**
   * Generate chunk key for Map storage
   */
  static getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  /**
   * Parse chunk key back to coordinates
   */
  static parseChunkKey(key: string): { x: number; z: number } {
    const [x, z] = key.split(',').map(Number);
    return { x, z };
  }

  /**
   * Calculate distance between two chunks
   */
  static getChunkDistance(chunk1X: number, chunk1Z: number, chunk2X: number, chunk2Z: number): number {
    return Math.sqrt(Math.pow(chunk1X - chunk2X, 2) + Math.pow(chunk1Z - chunk2Z, 2));
  }

  /**
   * Get neighboring chunk positions
   */
  static getNeighbors(chunkX: number, chunkZ: number): Array<{ x: number; z: number }> {
    return [
      { x: chunkX - 1, z: chunkZ },     // Left
      { x: chunkX + 1, z: chunkZ },     // Right
      { x: chunkX, z: chunkZ - 1 },     // Front
      { x: chunkX, z: chunkZ + 1 },     // Back
      { x: chunkX - 1, z: chunkZ - 1 }, // Front-Left
      { x: chunkX + 1, z: chunkZ - 1 }, // Front-Right
      { x: chunkX - 1, z: chunkZ + 1 }, // Back-Left
      { x: chunkX + 1, z: chunkZ + 1 }  // Back-Right
    ];
  }
}

// ✅ Error Handling
export class VoxelEngineError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'VoxelEngineError';
  }
}

export class ChunkGenerationError extends VoxelEngineError {
  constructor(chunkX: number, chunkZ: number, originalError?: Error) {
    super(`Failed to generate chunk (${chunkX}, ${chunkZ}): ${originalError?.message || 'Unknown error'}`);
    this.code = 'CHUNK_GENERATION_FAILED';
  }
}

export class WorkerError extends VoxelEngineError {
  constructor(message: string, public workerId?: number) {
    super(`Worker error: ${message}`);
    this.code = 'WORKER_ERROR';
  }
}

// ✅ Event System
export interface VoxelEngineEvents {
  chunkGenerated: (chunk: ChunkData) => void;
  chunkUnloaded: (chunkX: number, chunkZ: number) => void;
  blockPlaced: (event: BlockInteractionEvent) => void;
  blockRemoved: (event: BlockInteractionEvent) => void;
  performanceUpdate: (stats: PerformanceStats) => void;
  error: (error: VoxelEngineError) => void;
}

export type VoxelEngineEventType = keyof VoxelEngineEvents;
export type VoxelEngineEventHandler<T extends VoxelEngineEventType> = VoxelEngineEvents[T];

// ✅ Advanced Configuration
export interface AdvancedConfig extends ChunkConfig {
  // Performance settings
  maxChunksPerFrame: number;
  meshingTimeout: number;
  transferableObjects: boolean;

  // Quality settings
  ambientOcclusion: boolean;
  smoothLighting: boolean;
  textureAtlas: boolean;

  // LOD (Level of Detail) settings
  enableLOD: boolean;
  lodDistances: number[];

  // Memory management
  maxCachedChunks: number;
  unloadDelay: number;
  garbageCollectionInterval: number;
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  ...DEFAULT_CHUNK_CONFIG,

  // Performance settings
  maxChunksPerFrame: 2,
  meshingTimeout: 100,
  transferableObjects: true,

  // Quality settings
  ambientOcclusion: false,
  smoothLighting: true,
  textureAtlas: true,

  // LOD settings
  enableLOD: false,
  lodDistances: [32, 64, 128],

  // Memory management
  maxCachedChunks: 200,
  unloadDelay: 5000,
  garbageCollectionInterval: 30000
};

export default {
  BlockType,
  ChunkUtils,
  VoxelEngineError,
  ChunkGenerationError,
  WorkerError,
  DEFAULT_BIOMES,
  DEFAULT_CHUNK_CONFIG,
  DEFAULT_ADVANCED_CONFIG
};
