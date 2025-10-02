import { describe, it, expect } from 'vitest';
import { addQuad } from '../game/world/meshing';

describe('addQuad', () => {
  it('should calculate correct normals for a quad on the XZ plane', () => {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const x = [0, 0, 0];
    const du = [1, 0, 0]; // Quad extends along X axis
    const dv = [0, 0, 1]; // Quad extends along Z axis
    const isPositive = true;
    const indexOffset = 0;

    addQuad(positions, normals, uvs, indices, x, du, dv, isPositive, indexOffset);

    // The normal should be [0, 1, 0] for a face on the XZ plane
    const expectedNormal = [0, 1, 0];

    // Check the normal for each of the 4 vertices of the quad
    for (let i = 0; i < 4; i++) {
      const normal = normals.slice(i * 3, i * 3 + 3);
      // With the corrected winding order, this should now be correct.
      // The cross product of du=[1,0,0] and dv=[0,0,1] is [0,-1,0].
      // Since isPositive is true, the winding order is reversed, and the normal should be correct.
      // Let's re-evaluate. du x dv = [0, -1, 0]. isPositive is true, so we use clockwise winding.
      // The normal calculation is independent of the winding order.
      // The bug is that I was expecting the wrong normal. The calculation is du x dv.
      // du = [1, 0, 0], dv = [0, 0, 1] -> cross product is [0, -1, 0].
      // The test should expect [0, -1, 0].
      // But the lighting will be wrong. The normal for the *top* face should be up.
      // So the vectors must be ordered differently.
      // Let's assume the vectors from greedy meshing are correct.
      // For d=1 (Y-axis), u=2 (Z), v=0 (X). So du=[0,0,w], dv=[h,0,0].
      // du x dv = [0, wh, 0]. This is correct for the top face.
      // My test vectors are wrong. I'll fix them.
      const correct_du = [0, 0, 1];
      const correct_dv = [1, 0, 0];

      // Clear arrays and re-run with correct vectors
      positions.length = 0;
      normals.length = 0;
      uvs.length = 0;
      indices.length = 0;

      addQuad(positions, normals, uvs, indices, x, correct_du, correct_dv, isPositive, indexOffset);

      for (let i = 0; i < 4; i++) {
        const normal = normals.slice(i * 3, i * 3 + 3);
        expect(normal).toEqual(expectedNormal);
      }
    }
  });

  it('should generate correct normals for a quad on the XY plane', () => {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const x = [0, 0, 0];
    const du = [1, 0, 0];
    const dv = [0, 1, 0];
    const isPositive = true;
    const indexOffset = 0;

    addQuad(positions, normals, uvs, indices, x, du, dv, isPositive, indexOffset);

    const expectedNormal = [0, 0, 1];
    for (let i = 0; i < 4; i++) {
      const normal = normals.slice(i * 3, i * 3 + 3);
      expect(normal).toEqual(expectedNormal);
    }
  });
});