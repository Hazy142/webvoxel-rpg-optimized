import * as THREE from 'three';

export interface ChunkData {
  x: number;
  z: number;
  voxels: Uint8Array;
  mesh?: THREE.Mesh;
  isGenerated: boolean;
  isVisible: boolean;
}

export interface GameStore {
  gameState: 'loading' | 'running' | 'paused' | 'error';
  playerPosition: { x: number; y: number; z: number };
  inventory: InventoryItem[];
  selectedBlockType: BlockType;
  dayTime: number; // 0-1 (0 = midnight, 0.5 = noon)
  isMouseLocked: boolean;
  setGameState: (state: 'loading' | 'running' | 'paused' | 'error') => void;
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void;
  addToInventory: (item: InventoryItem) => void;
  removeFromInventory: (itemId: string) => void;
  setSelectedBlockType: (type: BlockType) => void;
  setDayTime: (time: number) => void;
  setMouseLocked: (locked: boolean) => void;
}

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
  IRON = 9,
}

export interface InventoryItem {
  id: string;
  type: BlockType;
  count: number;
  name: string;
}

export interface RaycastResult {
  hit: boolean;
  position?: THREE.Vector3;
  normal?: THREE.Vector3;
  chunkCoord?: { x: number; z: number };
  blockCoord?: { x: number; y: number; z: number };
}

export interface Controls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  place: boolean;
  destroy: boolean;
}
