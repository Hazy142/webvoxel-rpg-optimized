import { create } from 'zustand';
import type { GameStore, InventoryItem } from '../types/game';
import { BlockType } from '../types/game-types-optimized'; // ✅ Normaler Import, nicht "import type"!

// Performance Store Interface
interface PerformanceStore {
  fps: number;
  frameTime: number;
  memory: number;
  chunks: number;
  setFps: (fps: number) => void;
  setFrameTime: (time: number) => void;
  setMemory: (memory: number) => void;
  setChunks: (chunks: number) => void;
}

// Performance Store
export const usePerformanceStore = create<PerformanceStore>((set) => ({
  fps: 0,
  frameTime: 0,
  memory: 0,
  chunks: 0,
  setFps: (fps) => set({ fps }),
  setFrameTime: (time) => set({ frameTime: time }),
  setMemory: (memory) => set({ memory }),
  setChunks: (chunks) => set({ chunks }),
}));

// Main Game Store
export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'loading',
  playerPosition: { x: 0, y: 50, z: 0 },
  inventory: [
    { id: '1', type: BlockType.GRASS, count: 64, name: 'Grass Block' },
    { id: '2', type: BlockType.STONE, count: 64, name: 'Stone Block' },
    { id: '3', type: BlockType.DIRT, count: 64, name: 'Dirt Block' },
    { id: '4', type: BlockType.WOOD, count: 32, name: 'Wood Block' },
  ],
  selectedBlockType: BlockType.GRASS,
  dayTime: 0.5,
  isMouseLocked: false,

  setGameState: (newState) => set({ gameState: newState }),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  addToInventory: (item) => set((state) => {
    const existingItem = state.inventory.find(i => i.type === item.type);
    if (existingItem) {
      return {
        inventory: state.inventory.map(i => 
          i.type === item.type 
            ? { ...i, count: i.count + item.count }
            : i
        )
      };
    }
    return { inventory: [...state.inventory, item] };
  }),
  removeFromInventory: (itemId) => set((state) => ({
    inventory: state.inventory.filter(item => item.id !== itemId)
  })),
  setSelectedBlockType: (type) => set({ selectedBlockType: type }),
  setDayTime: (time) => set({ dayTime: Math.max(0, Math.min(1, time)) }),
  setMouseLocked: (locked) => set({ isMouseLocked: locked }),
}));
