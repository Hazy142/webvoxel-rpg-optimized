export function getVoxel(data: Uint8Array, x: number, y: number, z: number, size: number): number {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
    return 0;
  }
  return data[x + y * size + z * size * size];
}

export function addQuad(
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

  positions.push(
    x[0], x[1], x[2],
    x[0] + du[0], x[1] + du[1], x[2] + du[2],
    x[0] + dv[0], x[1] + dv[1], x[2] + dv[2],
    x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]
  );

  const normal = [
    du[1] * dv[2] - du[2] * dv[1],
    du[2] * dv[0] - du[0] * dv[2],
    du[0] * dv[1] - du[1] * dv[0],
  ];

  if (isPositive) {
    for (let i = 0; i < 4; i++) {
      normals.push(...normal);
    }
  } else {
    const oppositeNormal = normal.map(n => -n);
    for (let i = 0; i < 4; i++) {
      normals.push(...oppositeNormal);
    }
  }

  uvs.push(0, 0, 1, 0, 0, 1, 1, 1);

  if (isPositive) {
    indices.push(startIndex, startIndex + 1, startIndex + 2, startIndex + 1, startIndex + 3, startIndex + 2);
  } else {
    indices.push(startIndex, startIndex + 2, startIndex + 1, startIndex + 1, startIndex + 2, startIndex + 3);
  }
}

export function greedyMeshing(voxelData: Uint8Array, chunkSize: number) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let indexOffset = 0;

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