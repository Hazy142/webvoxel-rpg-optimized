/// <reference lib="webworker" />

import { makeNoise2D } from 'fast-simplex-noise';

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

// Greedy Meshing Algorithm (optimiert)
function greedyMeshing(voxelData: Uint8Array, chunkSize: number) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let indexOffset = 0;

  // Optimierte Meshing-Logik mit weniger Allokationen
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;

    const mask = new Int32Array(chunkSize * chunkSize);

    for (x[d] = -1; x[d] < chunkSize;) {
      let n = 0;

      for (x[v] = 0; x[v] < chunkSize; x[v]++) {
        for (x[u] = 0; x[u] < chunkSize; x[u]++) {
          const blockA = x[d] >= 0 ? getVoxel(voxelData, x[0], x[1], x[2], chunkSize) : 0;
          const blockB = x[d] < chunkSize - 1 ? getVoxel(voxelData, x[0] + q[0], x[1] + q[1], x[2] + q[2], chunkSize) : 0;

          mask[n++] = blockA !== blockB ? (blockA !== 0 ? blockA : -blockB) : 0;
        }
      }

      x[d]++;
      n = 0;

      for (let j = 0; j < chunkSize; j++) {
        for (let i = 0; i < chunkSize; ) {
          const currentBlock = mask[n];
          if (currentBlock !== 0) {
            // Greedy expansion
            let w, h;
            for (w = 1; i + w < chunkSize && mask[n + w] === currentBlock; w++) {}

            let done = false;
            for (h = 1; j + h < chunkSize; h++) {
              for (let k = 0; k < w; k++) {
                if (mask[n + k + h * chunkSize] !== currentBlock) {
                  done = true;
                  break;
                }
              }
              if (done) break;
            }

            x[u] = i;
            x[v] = j;

            const du = [0, 0, 0]; du[u] = w;
            const dv = [0, 0, 0]; dv[v] = h;

            addQuad(positions, normals, uvs, indices, x, du, dv, currentBlock > 0, indexOffset);
            indexOffset += 4;

            // Clear mask
            for (let l = 0; l < h; l++) {
              for (let k = 0; k < w; k++) {
                mask[n + k + l * chunkSize] = 0;
              }
            }

            i += w;
            n += w;
          } else {
            i++;
            n++;
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

function getVoxel(data: Uint8Array, x: number, y: number, z: number, size: number): number {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
    return 0;
  }
  return data[x + y * size + z * size * size];
}

function addQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  x: number[],
  du: number[],
  dv: number[],
  isPositive: boolean,
  indexOffset: number
) {
  const startIndex = positions.length / 3;

  // Vertices
  positions.push(
    x[0], x[1], x[2],
    x[0] + du[0], x[1] + du[1], x[2] + du[2],
    x[0] + dv[0], x[1] + dv[1], x[2] + dv[2],
    x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]
  );

  // Normals (simplified)
  const normal = isPositive ? [0, 1, 0] : [0, -1, 0];
  for (let i = 0; i < 4; i++) {
    normals.push(...normal);
  }

  // UVs
  uvs.push(0, 0, 1, 0, 0, 1, 1, 1);

  // Indices
  if (isPositive) {
    indices.push(startIndex, startIndex + 2, startIndex + 1, startIndex + 1, startIndex + 2, startIndex + 3);
  } else {
    indices.push(startIndex, startIndex + 1, startIndex + 2, startIndex + 1, startIndex + 3, startIndex + 2);
  }
}

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