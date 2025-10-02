/// <reference lib="webworker" />

import { makeNoise2D } from 'fast-simplex-noise';
import { greedyMeshing } from './src/game/world/meshing';

// Worker Types
interface ChunkGenerationMessage {
  type: 'generate';
  chunkX: number;
  chunkZ: number;
  chunkSize: number;
}

interface InitMessage {
  type: 'init';
  seed: number;
}

type WorkerMessage = ChunkGenerationMessage | InitMessage;

// Worker State
let noise2D: ReturnType<typeof makeNoise2D>;
let isInitialized = false;

// Block Types
const BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
} as const;

function generateTerrain(chunkX: number, chunkZ: number, chunkSize: number): Uint8Array {
  const voxels = new Uint8Array(chunkSize * chunkSize * chunkSize);

  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // Multi-octave noise für besseres Terrain
      let height = 0;
      height += noise2D(worldX * 0.01, worldZ * 0.01) * 32;
      height += noise2D(worldX * 0.02, worldZ * 0.02) * 16;
      height += noise2D(worldX * 0.04, worldZ * 0.04) * 8;

      const terrainHeight = Math.floor(height + 32);

      for (let y = 0; y < chunkSize; y++) {
        const worldY = y;

        if (worldY < terrainHeight - 5) {
          voxels[x + y * chunkSize + z * chunkSize * chunkSize] = BLOCK_TYPES.STONE;
        } else if (worldY < terrainHeight - 1) {
          voxels[x + y * chunkSize + z * chunkSize * chunkSize] = BLOCK_TYPES.DIRT;
        } else if (worldY < terrainHeight) {
          voxels[x + y * chunkSize + z * chunkSize * chunkSize] = BLOCK_TYPES.GRASS;
        } else if (worldY < 16) {
          voxels[x + y * chunkSize + z * chunkSize * chunkSize] = BLOCK_TYPES.WATER;
        }
      }
    }
  }

  return voxels;
}

// Worker Message Handler mit Error Handling
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  try {
    const { data } = event;

    if (data.type === 'init') {
      noise2D = makeNoise2D(data.seed);
      isInitialized = true;
      self.postMessage({ type: 'initialized' });
      return;
    }

    if (!isInitialized) {
      throw new Error('Worker nicht initialisiert');
    }

    if (data.type === 'generate') {
      const { chunkX, chunkZ, chunkSize } = data;

      // Terrain generieren
      const voxelData = generateTerrain(chunkX, chunkZ, chunkSize);

      // Mesh generieren
      const meshData = greedyMeshing(voxelData, chunkSize);

      // Mit Transferable Objects für Performance
      self.postMessage(
        {
          type: 'chunkGenerated',
          chunkX,
          chunkZ,
          meshData,
        },
        [
          meshData.positions.buffer,
          meshData.normals.buffer,
          meshData.uvs.buffer,
          meshData.indices.buffer,
        ]
      );
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unbekannter Worker-Fehler',
    });
  }
});

// Worker-Initialisierung signalisieren
self.postMessage({ type: 'ready' });

export {};