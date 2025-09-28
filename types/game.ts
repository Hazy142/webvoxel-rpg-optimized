export type GameState = 'loading' | 'running' | 'paused' | 'error';

export interface GameStore {
  gameState: GameState;
  playerPosition: { x: number; y: number; z: number };
  setGameState: (newState: GameState) => void;
  setPlayerPosition: (position: { x: number; y: number; z: number }) => void;
}

export interface ChunkData {
  x: number;
  z: number;
  voxels: Uint8Array;
  mesh?: THREE.Mesh;
  isGenerated: boolean;
  isVisible: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  chunkCount: number;
  drawCalls: number;
}

export interface VoxelType {
  id: number;
  name: string;
  textures: {
    top: string;
    side: string;
    bottom: string;
  };
  isTransparent: boolean;
  isLightSource: boolean;
}