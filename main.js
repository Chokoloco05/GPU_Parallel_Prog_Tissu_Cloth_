import { initGPU } from './core/gpu.js';
import { createScene } from './config/scene.js';
import { frame } from './core/frame.js';
import { createSimulation } from './simulation/simulationPipeline.js';

async function main() {
  const info = document.getElementById('info');
  showBootInfo(info);

  const gpu = await initGPU();
  const scene = await createScene(gpu);
  scene.viewMode = 'split';
  scene.camera = { yaw: -0.65, pitch: -0.75, zoom: 0.7 };

  let simulation = { step: () => {}, reset: () => {} };
  const stats = {
    fps: 0,
    frames: 0,
    lastSample: performance.now()
  };

  window.addEventListener('keydown', event => {
    if (event.key === 'v') scene.viewMode = nextViewMode(scene.viewMode);
    if (event.key === '1') scene.visibility.clothSurface = !scene.visibility.clothSurface;
    if (event.key === '2') scene.visibility.clothWire = !scene.visibility.clothWire;
    if (event.key === '3') scene.visibility.sphereSurface = !scene.visibility.sphereSurface;
    if (event.key === '4') scene.visibility.sphereWire = !scene.visibility.sphereWire;
    if (event.key.toLowerCase() === 'p') simulation.togglePause?.();
    if (event.key.toLowerCase() === 'r' || event.key === '0') simulation.reset();
    if (event.key === '[') simulation.setFriction?.(-0.05);
    if (event.key === ']') simulation.setFriction?.(0.05);
    if (event.key === '-') simulation.setGravityScale?.(0.5);
    if (event.key === '=') simulation.setGravityScale?.(-0.5);
    if (event.key.toLowerCase() === 'i') scene.visibility.info = !scene.visibility.info;
    updateInfo(info, scene, simulation, stats);
  });

  setupPointerControls(gpu.context.canvas, scene);

  try {
    simulation = await createSimulation(gpu, scene);
  } catch (err) {
    console.error('Simulation init failed; continuing without physics', err);
  }

  function loop() {
    simulation.step();
    frame(gpu, scene);
    updateStats(stats);
    updateInfo(info, scene, simulation, stats);
    requestAnimationFrame(loop);
  }

  loop();
}

function showBootInfo(info) {
  if (!info) return;
  info.textContent = 'Simulation tissu\n\nEtat: chargement\n\nCommandes:\nSouris: tourner / zoomer\nV: changer la vue\nP: pause / reprise\nR ou 0: reinitialiser\n[ / ]: friction - / +\n- / =: gravite + / -\n1 2 3 4: affichage objets\nI: masquer ce panneau';
  info.style.display = 'block';
}

function setupPointerControls(canvas, scene) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointerup', event => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    scene.camera.yaw += dx * 0.008;
    scene.camera.pitch = Math.max(-1.45, Math.min(1.45, scene.camera.pitch + dy * 0.008));
    scene.viewMode = 'iso';
  });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const scale = Math.exp(-event.deltaY * 0.001);
    scene.camera.zoom = Math.max(0.25, Math.min(1.8, scene.camera.zoom * scale));
  }, { passive: false });
}

function nextViewMode(mode) {
  if (mode === 'split') return 'front';
  if (mode === 'front') return 'top';
  if (mode === 'top') return 'iso';
  return 'split';
}

function updateStats(stats) {
  stats.frames += 1;
  const now = performance.now();
  const elapsed = now - stats.lastSample;
  if (elapsed >= 500) {
    stats.fps = stats.frames * 1000 / elapsed;
    stats.frames = 0;
    stats.lastSample = now;
  }
}

function updateInfo(info, scene, simulation, stats) {
  if (!info) return;
  if (!scene.visibility?.info) {
    info.style.display = 'none';
    return;
  }

  const p = simulation.getParams?.() ?? {};
  info.style.display = 'block';
  info.textContent = [
    'Simulation tissu',
    '',
    `Vue: ${scene.viewMode}`,
    `Etat: ${p.paused ? 'pause' : 'lecture'}`,
    `FPS: ${format(stats?.fps, 0)}`,
    `Temps sim.: ${format(p.time)} s`,
    `Sommets: ${scene.cloth?.vertexCount ?? '-'}`,
    '',
    'Parametres:',
    `Gravite: ${format(p.gravity)}`,
    `Masse: ${format(p.mass)}`,
    `Raideur: ${format(p.kStruct)} / ${format(p.kShear)} / ${format(p.kBend)}`,
    `Friction: ${format(p.muStatic)} / ${format(p.muDynamic)}`,
    `Damping: ${format(p.damping, 3)}`,
    `Substeps: ${p.substeps ?? '-'}`,
    '',
    'Commandes:',
    'Souris: tourner / zoomer',
    'V: changer la vue',
    'P: pause / reprise',
    'R ou 0: reinitialiser',
    '[ / ]: friction - / +',
    '- / =: gravite + / -',
    '1 2 3 4: affichage objets',
    'I: masquer ce panneau'
  ].join('\n');
}

function format(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

main().catch(err => {
  console.error('Application startup failed', err);

  const errorBox = document.getElementById('error');
  if (!errorBox) return;

  const fileHint = window.location.protocol === 'file:'
    ? ' Tu as ouvert index.html directement : lance plutot launch_app.bat puis va sur http://127.0.0.1:8000/.'
    : '';

  errorBox.innerHTML = `<p>${err.message}${fileHint}</p>`;
  errorBox.classList.add('visible');
});
