// Enhanced Web Worker with Hidden Face Culling Optimization
console.log('🤖 Enhanced Worker with Hidden Face Culling starting...');

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

// Get block color based on type
function getBlockColor(blockType) {
  switch (blockType) {
    case BLOCK_TYPES.GRASS: return [0.3, 0.6, 0.2];
    case BLOCK_TYPES.DIRT: return [0.4, 0.2, 0.1];
    case BLOCK_TYPES.STONE: return [0.5, 0.5, 0.5];
    case BLOCK_TYPES.WATER: return [0.2, 0.6, 1.0];
    case BLOCK_TYPES.WOOD: return [0.55, 0.27, 0.07];
    case BLOCK_TYPES.LEAVES: return [0.13, 0.55, 0.13];
    case BLOCK_TYPES.SAND: return [0.96, 0.64, 0.38];
    default: return [0.8, 0.8, 0.8];
  }
}

// ✅ OPTIMIZED: Individual face generation functions
function addTopFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Top face vertices (y + size)
  const vertices = [
    x, y + size, z,             // 0: top-front-left
    x + size, y + size, z,      // 1: top-front-right
    x + size, y + size, z + size, // 2: top-back-right
    x, y + size, z + size       // 3: top-back-left
  ];

  positions.push(...vertices);

  // Colors and UVs for 4 vertices
  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  // Top face indices (2 triangles)
  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  // Normals for 6 vertices (2 triangles)
  for (let j = 0; j < 4; j++) {
    normals.push(0, 1, 0);
  }
}

function addBottomFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Bottom face vertices (y)
  const vertices = [
    x, y, z,                    // 0: bottom-front-left
    x, y, z + size,             // 1: bottom-back-left
    x + size, y, z + size,      // 2: bottom-back-right
    x + size, y, z              // 3: bottom-front-right
  ];

  positions.push(...vertices);

  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  for (let j = 0; j < 4; j++) {
    normals.push(0, -1, 0);
  }
}

function addFrontFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Front face vertices (z-)
  const vertices = [
    x, y, z,                    // 0: bottom-front-left
    x + size, y, z,             // 1: bottom-front-right
    x + size, y + size, z,      // 2: top-front-right
    x, y + size, z              // 3: top-front-left
  ];

  positions.push(...vertices);

  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  for (let j = 0; j < 4; j++) {
    normals.push(0, 0, -1);
  }
}

function addBackFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Back face vertices (z+)
  const vertices = [
    x + size, y, z + size,      // 0: bottom-back-right
    x, y, z + size,             // 1: bottom-back-left
    x, y + size, z + size,      // 2: top-back-left
    x + size, y + size, z + size // 3: top-back-right
  ];

  positions.push(...vertices);

  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  for (let j = 0; j < 4; j++) {
    normals.push(0, 0, 1);
  }
}

function addRightFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Right face vertices (x+)
  const vertices = [
    x + size, y, z,             // 0: bottom-front-right
    x + size, y, z + size,      // 1: bottom-back-right
    x + size, y + size, z + size, // 2: top-back-right
    x + size, y + size, z       // 3: top-front-right
  ];

  positions.push(...vertices);

  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  for (let j = 0; j < 4; j++) {
    normals.push(1, 0, 0);
  }
}

function addLeftFace(positions, normals, uvs, colors, indices, x, y, z, color, vertexIndex) {
  const size = 1;

  // Left face vertices (x-)
  const vertices = [
    x, y, z + size,             // 0: bottom-back-left
    x, y, z,                    // 1: bottom-front-left
    x, y + size, z,             // 2: top-front-left
    x, y + size, z + size       // 3: top-back-left
  ];

  positions.push(...vertices);

  for (let i = 0; i < 4; i++) {
    colors.push(...color);
    uvs.push((i % 2), Math.floor(i / 2));
  }

  indices.push(
    vertexIndex, vertexIndex + 1, vertexIndex + 2,
    vertexIndex, vertexIndex + 2, vertexIndex + 3
  );

  for (let j = 0; j < 4; j++) {
    normals.push(-1, 0, 0);
  }
}

// ✅ OPTIMIZED: Hidden Face Culling Implementation
function generateOptimizedTerrain(chunkX, chunkZ, chunkSize) {
  const WORLD_HEIGHT = 32;
  const paddedSize = chunkSize + 2; // Add padding for neighbor checks

  console.log(`🌍 Generating optimized chunk ${chunkX},${chunkZ} with hidden face culling`);

  // Step 1: Create 3D voxel data array with padding
  const voxelData = new Array(paddedSize);
  for (let x = 0; x < paddedSize; x++) {
    voxelData[x] = new Array(WORLD_HEIGHT);
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      voxelData[x][y] = new Array(paddedSize).fill(BLOCK_TYPES.AIR);
    }
  }

  // Step 2: Fill voxel data (including padding for neighbor checks)
  for (let x = -1; x <= chunkSize; x++) {
    for (let z = -1; z <= chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      const biome = getBiome(worldX, worldZ);
      const heightNoise = enhancedNoise(worldX, worldZ, 4);

      let baseHeight, surfaceBlockType;

      switch (biome) {
        case 'mountains':
          baseHeight = Math.floor(heightNoise * 20) + 8;
          surfaceBlockType = BLOCK_TYPES.STONE;
          break;
        case 'desert':
          baseHeight = Math.floor(heightNoise * 6) + 4;
          surfaceBlockType = BLOCK_TYPES.SAND;
          break;
        case 'forest':
          baseHeight = Math.floor(heightNoise * 12) + 6;
          surfaceBlockType = BLOCK_TYPES.GRASS;
          break;
        default: // plains
          baseHeight = Math.floor(heightNoise * 10) + 5;
          surfaceBlockType = BLOCK_TYPES.GRASS;
      }

      // Fill terrain column
      for (let y = 0; y <= Math.min(baseHeight, WORLD_HEIGHT - 1); y++) {
        let blockType = surfaceBlockType;

        // Layer-based block types
        if (y < baseHeight - 2) {
          blockType = BLOCK_TYPES.STONE; // Deep stone
        } else if (y < baseHeight) {
          blockType = BLOCK_TYPES.DIRT; // Dirt layer
        }
        // Top layer keeps surface block type

        voxelData[x + 1][y][z + 1] = blockType;
      }

      // Water level
      const waterLevel = 6;
      if (baseHeight < waterLevel) {
        for (let y = baseHeight + 1; y <= Math.min(waterLevel, WORLD_HEIGHT - 1); y++) {
          voxelData[x + 1][y][z + 1] = BLOCK_TYPES.WATER;
        }
      }

      // Trees in forest biome
      if (biome === 'forest' && x >= 0 && x < chunkSize && z >= 0 && z < chunkSize && Math.random() < 0.06) {
        // Tree trunk (3 blocks high)
        for (let treeY = 1; treeY <= 3 && baseHeight + treeY < WORLD_HEIGHT; treeY++) {
          voxelData[x + 1][baseHeight + treeY][z + 1] = BLOCK_TYPES.WOOD;
        }
        // Tree leaves (2 blocks high)
        for (let leafY = 4; leafY <= 5 && baseHeight + leafY < WORLD_HEIGHT; leafY++) {
          voxelData[x + 1][baseHeight + leafY][z + 1] = BLOCK_TYPES.LEAVES;
        }
      }
    }
  }

  // Step 3: Generate mesh with hidden face culling
  const positions = [];
  const normals = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  let vertexIndex = 0;

  // Only iterate through the actual chunk (not the padding)
  for (let x = 1; x <= chunkSize; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 1; z <= chunkSize; z++) {
        const blockType = voxelData[x][y][z];

        if (blockType === BLOCK_TYPES.AIR) continue;

        const blockColor = getBlockColor(blockType);
        const worldX = x - 1; // Convert back to chunk coordinates
        const worldZ = z - 1;

        // ✅ HIDDEN FACE CULLING: Check each neighbor and only render exposed faces

        // Top face (y+1)
        if (y + 1 >= WORLD_HEIGHT || voxelData[x][y + 1][z] === BLOCK_TYPES.AIR) {
          addTopFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        // Bottom face (y-1)
        if (y - 1 < 0 || voxelData[x][y - 1][z] === BLOCK_TYPES.AIR) {
          addBottomFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        // Front face (z-1)
        if (voxelData[x][y][z - 1] === BLOCK_TYPES.AIR) {
          addFrontFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        // Back face (z+1)
        if (voxelData[x][y][z + 1] === BLOCK_TYPES.AIR) {
          addBackFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        // Right face (x+1)
        if (voxelData[x + 1][y][z] === BLOCK_TYPES.AIR) {
          addRightFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        // Left face (x-1)
        if (voxelData[x - 1][y][z] === BLOCK_TYPES.AIR) {
          addLeftFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }
      }
    }
  }

  console.log(`✅ Optimized chunk ${chunkX},${chunkZ} complete: ${positions.length/3} vertices, ${indices.length/3} triangles`);
  console.log(`🚀 Face culling saved ~${Math.round((1 - (positions.length/3) / (chunkSize * chunkSize * WORLD_HEIGHT * 8)) * 100)}% vertices!`);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    voxelData: serializeVoxelData(voxelData, chunkSize) // Return voxel data for block placement/removal
  };
}

// ✅ NEW: Generate mesh from existing voxel data (for re-meshing)
function generateMeshFromVoxelData(voxelData, chunkSize) {
  const WORLD_HEIGHT = 32;

  console.log('🔄 Re-meshing chunk from voxel data with hidden face culling');

  const positions = [];
  const normals = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  let vertexIndex = 0;

  // Convert serialized data back to 3D array
  const voxel3D = deserializeVoxelData(voxelData, chunkSize);

  // Generate mesh with hidden face culling (same logic as above)
  for (let x = 1; x <= chunkSize; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 1; z <= chunkSize; z++) {
        const blockType = voxel3D[x][y][z];

        if (blockType === BLOCK_TYPES.AIR) continue;

        const blockColor = getBlockColor(blockType);
        const worldX = x - 1;
        const worldZ = z - 1;

        // Hidden face culling checks
        if (y + 1 >= WORLD_HEIGHT || voxel3D[x][y + 1][z] === BLOCK_TYPES.AIR) {
          addTopFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        if (y - 1 < 0 || voxel3D[x][y - 1][z] === BLOCK_TYPES.AIR) {
          addBottomFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        if (voxel3D[x][y][z - 1] === BLOCK_TYPES.AIR) {
          addFrontFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        if (voxel3D[x][y][z + 1] === BLOCK_TYPES.AIR) {
          addBackFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        if (voxel3D[x + 1][y][z] === BLOCK_TYPES.AIR) {
          addRightFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }

        if (voxel3D[x - 1][y][z] === BLOCK_TYPES.AIR) {
          addLeftFace(positions, normals, uvs, colors, indices, worldX, y, worldZ, blockColor, vertexIndex);
          vertexIndex += 4;
        }
      }
    }
  }

  console.log(`🔄 Re-meshing complete: ${positions.length/3} vertices, ${indices.length/3} triangles`);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices)
  };
}

// Helper functions for voxel data serialization
function serializeVoxelData(voxel3D, chunkSize) {
  const WORLD_HEIGHT = 32;
  const paddedSize = chunkSize + 2;
  const data = new Uint8Array(paddedSize * WORLD_HEIGHT * paddedSize);

  let index = 0;
  for (let x = 0; x < paddedSize; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < paddedSize; z++) {
        data[index++] = voxel3D[x][y][z];
      }
    }
  }

  return data;
}

function deserializeVoxelData(data, chunkSize) {
  const WORLD_HEIGHT = 32;
  const paddedSize = chunkSize + 2;
  const voxel3D = new Array(paddedSize);

  for (let x = 0; x < paddedSize; x++) {
    voxel3D[x] = new Array(WORLD_HEIGHT);
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      voxel3D[x][y] = new Array(paddedSize);
    }
  }

  let index = 0;
  for (let x = 0; x < paddedSize; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < paddedSize; z++) {
        voxel3D[x][y][z] = data[index++];
      }
    }
  }

  return voxel3D;
}

// ✅ MESSAGE HANDLING
self.addEventListener('message', function(e) {
  try {
    const { data } = e;

    if (data.type === 'init') {
      console.log('🤖 Optimized Worker initialized with hidden face culling');
      self.postMessage({ type: 'initialized' });
    } else if (data.type === 'generate') {
      const { chunkX, chunkZ, chunkSize } = data;
      console.log(`🌍 Worker generating OPTIMIZED chunk ${chunkX},${chunkZ}`);

      const meshData = generateOptimizedTerrain(chunkX, chunkZ, chunkSize);

      // Use Transferable Objects for performance
      self.postMessage({
        type: 'chunkGenerated',
        chunkX,
        chunkZ,
        meshData
      }, [
        meshData.positions.buffer,
        meshData.normals.buffer,
        meshData.uvs.buffer,
        meshData.colors.buffer,
        meshData.indices.buffer,
        meshData.voxelData.buffer
      ]);
    } else if (data.type === 'regenerate') {
      const { chunkX, chunkZ, voxelData, chunkSize } = data;
      console.log(`🔄 Worker re-meshing chunk ${chunkX},${chunkZ}`);

      const meshData = generateMeshFromVoxelData(voxelData, chunkSize);

      self.postMessage({
        type: 'chunkRegenerated',
        chunkX,
        chunkZ,
        meshData
      }, [
        meshData.positions.buffer,
        meshData.normals.buffer,
        meshData.uvs.buffer,
        meshData.colors.buffer,
        meshData.indices.buffer
      ]);
    } else if (data.type === 'dispose') {
      console.log('🧹 Optimized Worker disposing...');
      self.close();
    }
  } catch (error) {
    console.error('❌ Optimized Worker error:', error);
    self.postMessage({
      type: 'error',
      message: error.message || 'Unknown worker error'
    });
  }
});

// Worker ready
setTimeout(() => {
  self.postMessage({ type: 'ready' });
}, 50);
