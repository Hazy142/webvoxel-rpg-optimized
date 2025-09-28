import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OptimizedChunkManager, BlockType, } from '../game/world/OptimizedChunkManager';
import { ChunkUtils } from '../types/game-types-optimized';
import type { PerformanceStats  } from '../types/game-types-optimized';

// ✅ ULTIMATE FINAL Scene Component - REFS break ALL dependency chains!
interface SceneRef {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  chunkManager: OptimizedChunkManager;
  raycaster: THREE.Raycaster;
  animationId: number;
  isAnimating: boolean;
}

interface GameControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  place: boolean;
  destroy: boolean;
  sprint: boolean;
}

interface CameraState {
  position: THREE.Vector3;
  rotation: { x: number; y: number };
  velocity: THREE.Vector3;
}

interface LocalPerformanceStats {
  chunksLoaded: number;
  chunksVisible: number;
  totalVertices: number;
  fps: number;
  frameTime: number;
}

const Scene: React.FC = () => {
  // ✅ SCENE REFS & STATE
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRef | null>(null);

  // ✅ GAME STATE
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>(BlockType.GRASS);
  const [controls, setControls] = useState<GameControls>({
    forward: false, backward: false, left: false, right: false,
    up: false, down: false, place: false, destroy: false, sprint: false
  });

  // ✅ LOCAL PERFORMANCE TRACKING
  const [performanceStats, setPerformanceStats] = useState<LocalPerformanceStats>({
    chunksLoaded: 0,
    chunksVisible: 0,
    totalVertices: 0,
    fps: 60,
    frameTime: 16.67
  });

  // ✅ CAMERA STATE
  const [cameraState, setCameraState] = useState<CameraState>({
    position: new THREE.Vector3(8, 10, 8),
    rotation: { x: 0, y: 0 },
    velocity: new THREE.Vector3(0, 0, 0)
  });

  // ✅ CRITICAL: REFS FOR CURRENT STATE (BREAKS DEPENDENCY CHAINS!)
  const controlsRef = useRef(controls);
  const selectedBlockTypeRef = useRef(selectedBlockType);
  const isLoadedRef = useRef(isLoaded);

  // ✅ SYNC REFS WITH STATE (NO DEPENDENCY ARRAY - RUNS EVERY RENDER!)
  useEffect(() => {
    controlsRef.current = controls;
    selectedBlockTypeRef.current = selectedBlockType;
    isLoadedRef.current = isLoaded;
  }); // No dependency array = runs every render, keeps refs current

  // ✅ FPS TRACKING
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // ✅ MOVEMENT SETTINGS
  const MOVEMENT_SPEED = 0.5;
  const SPRINT_MULTIPLIER = 2.0;
  const MOUSE_SENSITIVITY = 0.002;
  const GRAVITY = -0.02;

  // ✅ STABLE EVENT HANDLERS (EMPTY DEPENDENCIES!)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        setControls(prev => ({ ...prev, forward: true }));
        break;
      case 'KeyS':
      case 'ArrowDown':
        setControls(prev => ({ ...prev, backward: true }));
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setControls(prev => ({ ...prev, left: true }));
        break;
      case 'KeyD':
      case 'ArrowRight':
        setControls(prev => ({ ...prev, right: true }));
        break;
      case 'Space':
        event.preventDefault();
        setControls(prev => ({ ...prev, up: true }));
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setControls(prev => ({ ...prev, down: true }));
        break;
      case 'ControlLeft':
      case 'ControlRight':
        setControls(prev => ({ ...prev, sprint: true }));
        break;
      case 'Digit1':
        setSelectedBlockType(BlockType.GRASS);
        break;
      case 'Digit2':
        setSelectedBlockType(BlockType.STONE);
        break;
      case 'Digit3':
        setSelectedBlockType(BlockType.DIRT);
        break;
      case 'Digit4':
        setSelectedBlockType(BlockType.WOOD);
        break;
      case 'Digit5':
        setSelectedBlockType(BlockType.SAND);
        break;
    }
  }, []); // ✅ STABLE - NO DEPENDENCIES

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        setControls(prev => ({ ...prev, forward: false }));
        break;
      case 'KeyS':
      case 'ArrowDown':
        setControls(prev => ({ ...prev, backward: false }));
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setControls(prev => ({ ...prev, left: false }));
        break;
      case 'KeyD':
      case 'ArrowRight':
        setControls(prev => ({ ...prev, right: false }));
        break;
      case 'Space':
        setControls(prev => ({ ...prev, up: false }));
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setControls(prev => ({ ...prev, down: false }));
        break;
      case 'ControlLeft':
      case 'ControlRight':
        setControls(prev => ({ ...prev, sprint: false }));
        break;
    }
  }, []); // ✅ STABLE - NO DEPENDENCIES

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!document.pointerLockElement) return;

    switch (event.button) {
      case 0:
        setControls(prev => ({ ...prev, destroy: true }));
        break;
      case 2:
        event.preventDefault();
        setControls(prev => ({ ...prev, place: true }));
        break;
    }
  }, []); // ✅ STABLE - NO DEPENDENCIES

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!document.pointerLockElement || !sceneRef.current) return;

    const { camera } = sceneRef.current;

    setCameraState(prev => {
      const newRotation = {
        x: prev.rotation.x - event.movementY * MOUSE_SENSITIVITY,
        y: prev.rotation.y - event.movementX * MOUSE_SENSITIVITY
      };

      newRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newRotation.x));

      camera.rotation.order = 'YXZ';
      camera.rotation.x = newRotation.x;
      camera.rotation.y = newRotation.y;

      return { ...prev, rotation: newRotation };
    });
  }, []); // ✅ STABLE - NO DEPENDENCIES

  const handlePointerLockChange = useCallback(() => {
    if (document.pointerLockElement === mountRef.current) {
      console.log('🔒 Pointer locked - controls enabled');
      if (sceneRef.current) {
        sceneRef.current.isAnimating = true;
        animate();
      }
    } else {
      console.log('🔓 Pointer unlocked - controls disabled');
      if (sceneRef.current) {
        sceneRef.current.isAnimating = false;
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
      }
    }
  }, []); // ✅ STABLE - NO DEPENDENCIES (will be declared later)

  const handleResize = useCallback(() => {
    if (!sceneRef.current) return;

    const { camera, renderer } = sceneRef.current;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, []); // ✅ STABLE - NO DEPENDENCIES

  const requestPointerLock = useCallback(() => {
    if (mountRef.current) {
      try {
        mountRef.current.requestPointerLock();
      } catch (error) {
        console.warn('⚠️ Pointer lock request failed:', error);
      }
    }
  }, []); // ✅ STABLE - NO DEPENDENCIES

  // ✅ BLOCK INTERACTION - USES REFS INSTEAD OF STATE
  const handleBlockInteraction = useCallback(async () => {
    if (!sceneRef.current || !isLoadedRef.current) return; // ✅ REF USAGE

    const { camera, chunkManager, raycaster } = sceneRef.current;

    try {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hitPosition = chunkManager.raycast(raycaster);

      if (hitPosition) {
        console.log('🎯 Block hit at:', hitPosition);

        if (controlsRef.current.place) { // ✅ REF USAGE
          const placePosition = hitPosition.clone();
          placePosition.y += 1;

          console.log('🧱 Placing block at:', placePosition);
          const success = await chunkManager.placeBlock(placePosition, selectedBlockTypeRef.current); // ✅ REF USAGE

          if (success) {
            console.log(`✅ Block ${BlockType[selectedBlockTypeRef.current]} placed successfully`); // ✅ REF USAGE
          }
        }

        if (controlsRef.current.destroy) { // ✅ REF USAGE
          console.log('💥 Destroying block at:', hitPosition);
          const success = await chunkManager.removeBlock(hitPosition);

          if (success) {
            console.log('✅ Block removed successfully');
          }
        }
      }

    } catch (error) {
      console.error('❌ Block interaction error:', error);
    }
  }, []); // ✅ NO DEPENDENCIES - USES REFS!

  // ✅ CAMERA MOVEMENT - USES REFS INSTEAD OF STATE
  const updateCamera = useCallback(() => {
    if (!sceneRef.current) return;

    const { camera } = sceneRef.current;
    const speed = MOVEMENT_SPEED * (controlsRef.current.sprint ? SPRINT_MULTIPLIER : 1.0); // ✅ REF USAGE

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up);

    const movement = new THREE.Vector3();

    if (controlsRef.current.forward) movement.add(forward); // ✅ REF USAGE
    if (controlsRef.current.backward) movement.sub(forward); // ✅ REF USAGE
    if (controlsRef.current.right) movement.add(right); // ✅ REF USAGE
    if (controlsRef.current.left) movement.sub(right); // ✅ REF USAGE

    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(speed);
    }

    if (controlsRef.current.up) movement.y += speed; // ✅ REF USAGE
    if (controlsRef.current.down) movement.y -= speed; // ✅ REF USAGE

    if (!controlsRef.current.up && !controlsRef.current.down) { // ✅ REF USAGE
      movement.y += GRAVITY;
    }

    camera.position.add(movement);
    camera.position.y = Math.max(camera.position.y, 1);

    setCameraState(prev => ({
      ...prev,
      position: camera.position.clone(),
      velocity: movement
    }));

  }, []); // ✅ NO DEPENDENCIES - USES REFS!

  // ✅ FPS CALCULATION - NO DEPENDENCIES
  const updateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - fpsRef.current.lastTime;
    fpsRef.current.frames++;

    if (delta >= 1000) {
      const fps = Math.round((fpsRef.current.frames * 1000) / delta);
      const frameTime = delta / fpsRef.current.frames;

      setPerformanceStats(prev => ({
        ...prev,
        fps,
        frameTime: Math.round(frameTime * 100) / 100
      }));

      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = now;
    }
  }, []); // ✅ NO DEPENDENCIES

  // ✅ MAIN ANIMATION LOOP - STABLE DEPENDENCIES
  const animate = useCallback(function animateLoop() {
    if (!sceneRef.current || !sceneRef.current.isAnimating) return;

    const { scene, camera, renderer, chunkManager } = sceneRef.current;

    try {
      updateCamera();
      chunkManager.update(camera.position);

      const stats = chunkManager.getPerformanceStats();
      setPerformanceStats(prev => ({
        ...prev,
        chunksLoaded: stats.chunksLoaded,
        chunksVisible: stats.chunksVisible,
        totalVertices: stats.totalVertices
      }));

      updateFPS();

      if (controlsRef.current.place || controlsRef.current.destroy) { // ✅ REF USAGE
        handleBlockInteraction();
        setControls(prev => ({ ...prev, place: false, destroy: false }));
      }

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animateLoop);

    } catch (error) {
      console.error('❌ Animation loop error:', error);
    }
  }, [updateCamera, updateFPS, handleBlockInteraction]); // ✅ STABLE FUNCTIONS AS DEPENDENCIES

  // ✅ SCENE INITIALIZATION - ONLY RUNS ONCE!
  useEffect(() => {
    console.log('🎬 Initializing optimized scene...');

    if (!mountRef.current || sceneRef.current) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB);
      scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.copy(cameraState.position);

      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 25);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 200;
      directionalLight.shadow.camera.left = -50;
      directionalLight.shadow.camera.right = 50;
      directionalLight.shadow.camera.top = 50;
      directionalLight.shadow.camera.bottom = -50;
      scene.add(directionalLight);

      const chunkManager = new OptimizedChunkManager(scene, camera);
      const raycaster = new THREE.Raycaster();
      raycaster.far = 10;

      mountRef.current.appendChild(renderer.domElement);

      sceneRef.current = {
        scene,
        camera,
        renderer,
        chunkManager,
        raycaster,
        animationId: 0,
        isAnimating: false
      };

      console.log('✅ Optimized scene initialized successfully');
      setIsLoaded(true);

    } catch (error) {
      console.error('❌ Failed to initialize scene:', error);
    }

    return () => {
      console.log('🧹 Cleaning up scene...');

      if (sceneRef.current) {
        sceneRef.current.isAnimating = false;

        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }

        const { renderer, chunkManager } = sceneRef.current;

        chunkManager.dispose();

        if (mountRef.current && renderer.domElement) {
          try {
            mountRef.current.removeChild(renderer.domElement);
          } catch (error) {
            console.warn('⚠️ DOM cleanup warning:', error);
          }
        }
        renderer.dispose();

        sceneRef.current = null;
      }

      setIsLoaded(false);
    };
  }, []); // ✅ EMPTY ARRAY - RUNS ONLY ONCE!

  // ✅ EVENT LISTENERS - STABLE HANDLERS, ONLY DEPENDS ON isLoaded
  useEffect(() => {
    if (!isLoaded) return;

    console.log('🎮 Setting up event listeners...');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('resize', handleResize);

    const handleContextMenu = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      console.log('🧹 Removing event listeners...');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isLoaded, handleKeyDown, handleKeyUp, handleMouseDown, handleMouseMove, handlePointerLockChange, handleResize]);
  // ✅ All handlers are now STABLE (empty deps), so this effect is stable too!

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-pointer"
        onClick={requestPointerLock}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">🚀 Loading Optimized Voxel Engine...</h2>
            <p className="text-gray-300">Initializing workers and generating terrain...</p>
          </div>
        </div>
      )}

      {isLoaded && (
        <>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border border-white opacity-75">
              <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg font-mono text-sm">
            <h3 className="text-lg font-bold mb-2">🚀 Ultimate Performance</h3>
            <div className="space-y-1">
              <div>FPS: <span className="text-green-400">{performanceStats.fps}</span></div>
              <div>Frame Time: <span className="text-blue-400">{performanceStats.frameTime}ms</span></div>
              <div>Chunks Loaded: <span className="text-yellow-400">{performanceStats.chunksLoaded}</span></div>
              <div>Chunks Visible: <span className="text-purple-400">{performanceStats.chunksVisible}</span></div>
              <div>Vertices: <span className="text-orange-400">{performanceStats.totalVertices.toLocaleString()}</span></div>
              <div>Position: <span className="text-gray-300">
                ({Math.round(cameraState.position.x)}, {Math.round(cameraState.position.y)}, {Math.round(cameraState.position.z)})
              </span></div>
              <div className="text-xs text-green-300 mt-1">🔗 Refs: STABLE</div>
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2">🧱 Block Selector</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(BlockType).filter(([key, value]) => 
                  typeof value === 'number' && value !== BlockType.AIR
                ).map(([name, type]) => (
                  <button
                    key={name}
                    className={`p-2 rounded text-xs font-bold transition-colors ${
                      selectedBlockType === type 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                    }`}
                    onClick={() => setSelectedBlockType(type as BlockType)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-300 mt-2">
                Selected: <span className="text-yellow-400">{BlockType[selectedBlockType]}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg text-sm">
            <h3 className="text-lg font-bold mb-2">🎮 Controls</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>WASD: Move</div>
              <div>Mouse: Look</div>
              <div>Space: Up</div>
              <div>Shift: Down</div>
              <div>Ctrl: Sprint</div>
              <div>Click: Pointer Lock</div>
              <div>Left Click: Break</div>
              <div>Right Click: Place</div>
              <div>1-5: Block Type</div>
            </div>
          </div>

          {!document.pointerLockElement && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">🎮 Click to Play</h2>
                <p className="text-gray-300">Click anywhere to enable mouse look and start playing!</p>
                <p className="text-sm text-gray-400 mt-2">Scene Status: {isLoaded ? '✅ Loaded' : '⏳ Loading...'}</p>
                <p className="text-xs text-green-400 mt-1">🔗 Dependency Chains: BROKEN</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Scene;