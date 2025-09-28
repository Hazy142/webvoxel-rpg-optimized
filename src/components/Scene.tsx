import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useGameStore, usePerformanceStore } from '../game/store';
import { ChunkManager } from '../game/world/ChunkManager';
import { ErrorBoundary } from './ErrorBoundary';

interface SceneProps {
  width?: number;
  height?: number;
}

const Scene: React.FC<SceneProps> = ({ width = 800, height = 600 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    chunkManager: ChunkManager;
    animationId?: number;
    controls: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
    };
    cleanup: () => void;
  } | null>(null);

  const { gameState, playerPosition, setPlayerPosition } = useGameStore();
  const { setFPS, setMemoryUsage, setChunkCount } = usePerformanceStore();

  // Performance-Monitoring
  const performanceRef = useRef({
    lastTime: 0,
    frameCount: 0,
    fpsUpdateInterval: 1000, // 1 Sekunde
  });

  const updatePerformanceMetrics = useCallback(() => {
    const now = performance.now();
    const perf = performanceRef.current;
    perf.frameCount++;

    if (now - perf.lastTime >= perf.fpsUpdateInterval) {
      const fps = Math.round((perf.frameCount * 1000) / (now - perf.lastTime));
      setFPS(fps);

      // Memory-Usage (approximiert)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryMB = Math.round(memInfo.usedJSHeapSize / (1024 * 1024));
        setMemoryUsage(memoryMB);
      }

      // Chunk-Count
      if (sceneRef.current?.chunkManager) {
        setChunkCount(sceneRef.current.chunkManager.getVisibleChunkCount());
      }

      perf.frameCount = 0;
      perf.lastTime = now;
    }
  }, [setFPS, setMemoryUsage, setChunkCount]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!sceneRef.current) return;

    const controls = sceneRef.current.controls;
    switch (event.code) {
      case 'KeyW': controls.forward = true; break;
      case 'KeyS': controls.backward = true; break;
      case 'KeyA': controls.left = true; break;
      case 'KeyD': controls.right = true; break;
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!sceneRef.current) return;

    const controls = sceneRef.current.controls;
    switch (event.code) {
      case 'KeyW': controls.forward = false; break;
      case 'KeyS': controls.backward = false; break;
      case 'KeyA': controls.left = false; break;
      case 'KeyD': controls.right = false; break;
    }
  }, []);

  const animate = useCallback(() => {
    if (!sceneRef.current || gameState === 'paused') {
      if (sceneRef.current) {
        sceneRef.current.animationId = requestAnimationFrame(animate);
      }
      return;
    }

    const { scene, camera, renderer, chunkManager, controls } = sceneRef.current;

    // Bewegung berechnen
    const moveSpeed = 0.5;
    const direction = new THREE.Vector3();

    if (controls.forward) direction.z -= 1;
    if (controls.backward) direction.z += 1;
    if (controls.left) direction.x -= 1;
    if (controls.right) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.multiplyScalar(moveSpeed);

      // Kamera-relative Bewegung
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(camera.up, cameraDirection);

      const movement = new THREE.Vector3();
      movement.addScaledVector(cameraDirection, -direction.z);
      movement.addScaledVector(cameraRight, direction.x);

      camera.position.add(movement);

      // Position aktualisieren
      setPlayerPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });
    }

    // Chunks aktualisieren
    chunkManager.updateChunks(camera.position);

    // Performance-Metriken
    updatePerformanceMetrics();

    // Rendern
    renderer.render(scene, camera);

    sceneRef.current.animationId = requestAnimationFrame(animate);
  }, [gameState, setPlayerPosition, updatePerformanceMetrics]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    try {
      // Scene Setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB); // Sky Blue

      // Kamera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 50, 0);

      // Renderer mit optimierten Einstellungen
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false; // Für bessere Performance deaktiviert
      mount.appendChild(renderer.domElement);

      // Beleuchtung
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      directionalLight.castShadow = false; // Performance
      scene.add(directionalLight);

      // Chunk Manager
      const chunkManager = new ChunkManager(scene, camera);

      // Controls
      const controls = {
        forward: false,
        backward: false,
        left: false,
        right: false,
      };

      // Cleanup-Funktion
      const cleanup = () => {
        // Animation stoppen
        if (sceneRef.current?.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }

        // Event-Listener entfernen
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);

        // Resources aufräumen
        chunkManager.dispose();
        renderer.dispose();

        // DOM-Element entfernen
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }

        console.log('Scene cleanup abgeschlossen');
      };

      sceneRef.current = {
        scene,
        camera,
        renderer,
        chunkManager,
        controls,
        cleanup,
      };

      // Event-Listener
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Animation starten
      sceneRef.current.animationId = requestAnimationFrame(animate);

      console.log('Scene erfolgreich initialisiert');
    } catch (error) {
      console.error('Fehler beim Initialisieren der Scene:', error);
    }

    // Cleanup bei Unmount
    return () => {
      if (sceneRef.current?.cleanup) {
        sceneRef.current.cleanup();
      }
    };
  }, [width, height, handleKeyDown, handleKeyUp, animate]);

  // Resize-Handling
  useEffect(() => {
    if (!sceneRef.current) return;

    const { camera, renderer } = sceneRef.current;

    const handleResize = () => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  return <div ref={mountRef} className="scene-container" />;
};

// Scene mit Error Boundary wrappen
const SceneWithErrorBoundary: React.FC<SceneProps> = (props) => (
  <ErrorBoundary>
    <Scene {...props} />
  </ErrorBoundary>
);

export default SceneWithErrorBoundary;