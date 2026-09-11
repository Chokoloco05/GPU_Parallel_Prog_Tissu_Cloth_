export function createTissu(N, size, thickness) {
  const vertices = [];
  const triIndices = [];
  const lineIndices = [];

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = (j / N - 0.5) * size;
      const y = thickness;
      const z = (i / N - 0.5) * size;
      vertices.push(x, y, z, 1.0);
    }
  }

  const width = N + 1;
  const h = N + 1;

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const p0 = i * width + j;
      const p1 = p0 + 1;
      const p2 = p0 + width;
      const p3 = p2 + 1;

      // triangles
      triIndices.push(p0, p2, p1);
      triIndices.push(p1, p2, p3);

      // lignes (structure + une diagonale)
      lineIndices.push(p0, p1, p0, p2);
      lineIndices.push(p1, p3, p2, p3);
      lineIndices.push(p0, p3); // single diagonal
    }
  }

  return {
    vertexData: new Float32Array(vertices),
    triData: new Uint32Array(triIndices),
    lineData: new Uint32Array(lineIndices),

    width,           // 🔒 CRITIQUE
    height: h,       // 🔒 CRITIQUE
    size,
    thickness,
    vertexCount: vertices.length / 4
  };
}
