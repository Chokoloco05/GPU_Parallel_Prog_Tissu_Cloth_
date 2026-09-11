export function createSphere(res, radius) {
  const vertices = [];
  const lines = [];
  const triangles = [];

  for (let i = 0; i <= res; i++) {
    const lat = Math.PI * i / res;
    for (let j = 0; j <= res; j++) {
      const lon = 2 * Math.PI * j / res;
      vertices.push(
        radius * Math.sin(lat) * Math.cos(lon),
        radius * Math.cos(lat),
        radius * Math.sin(lat) * Math.sin(lon),
        1
      );
    }
  }

  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const a = i * (res + 1) + j;
      const b = a + res + 1;
      const c = a + 1;
      const d = b + 1;
      lines.push(a, a + 1, a, b);
      triangles.push(a, b, c, c, b, d);
    }
  }

  return {
    vertexData: new Float32Array(vertices),
    triData: new Uint32Array(triangles),
    lineData: new Uint32Array(lines),
    triCount: triangles.length,
    lineCount: lines.length
  };
}
