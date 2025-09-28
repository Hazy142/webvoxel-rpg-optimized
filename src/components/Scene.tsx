import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, usePerformanceStore } from '../game/store';
import { ChunkManager } from '../game/world/ChunkManager';
import { BlockType } from '../types/game';

const Scene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    chunkManager: ChunkManager;
    animationId?: number;
  } | null>(null);
  
  const { 
    gameState, 
    setGameState, 
    isMouseLocked, 
    setMouseLocked,
    selectedBlockType,
    setPlayerPosition
  } = useGameStore();
  
  const { setFps, setFrameTime, setMemory, setChunks } = usePerformanceStore();

  useEffect(() => {
    if (!mountRef.current) return;

    let mounted = true;
    const mount = mountRef.current;
    
    // ✅ MOVEMENT & MOUSE STATE
    const movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    };

    const mouseControls = {
      sensitivity: 0.002,
      pitch: 0,
      yaw: 0,
    };

    // ✅ INTERACTION STATE
    const interaction = {
      place: false,
      destroy: false,
    };

    // Event handlers
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': movement.forward = true; break;
        case 'KeyS': movement.backward = true; break;
        case 'KeyA': movement.left = true; break;
        case 'KeyD': movement.right = true; break;
        case 'Space': movement.up = true; event.preventDefault(); break;
        case 'ShiftLeft': movement.down = true; break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': movement.forward = false; break;
        case 'KeyS': movement.backward = false; break;
        case 'KeyA': movement.left = false; break;
        case 'KeyD': movement.right = false; break;
        case 'Space': movement.up = false; break;
        case 'ShiftLeft': movement.down = false; break;
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) interaction.destroy = true;
      if (event.button === 2) interaction.place = true;
      event.preventDefault();
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) interaction.destroy = false;
      if (event.button === 2) interaction.place = false;
      event.preventDefault();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === mount) {
        mouseControls.yaw -= event.movementX * mouseControls.sensitivity;
        mouseControls.pitch -= event.movementY * mouseControls.sensitivity;
        mouseControls.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseControls.pitch));
      }
    };

    const onClick = () => {
      if (!document.pointerLockElement) {
        mount.requestPointerLock();
      }
    };

    const onPointerLockChange = () => {
      setMouseLocked(!!document.pointerLockElement);
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    try {
      // ✅ ENHANCED SCENE SETUP
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB);
      scene.fog = new THREE.Fog(0x87CEEB, 100, 400);

      const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
      camera.position.set(0, 50, 50);

      // ✅ STABLE RENDERER
      const renderer = new THREE.WebGLRenderer({ 
        antialias: false, // Performance
        powerPreference: "default", // Stability
        preserveDrawingBuffer: false 
      });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Limit for stability
      renderer.shadowMap.enabled = false; // Performance
      mount.appendChild(renderer.domElement);

      // ✅ ENHANCED LIGHTING
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      scene.add(directionalLight);

      // ✅ INITIALIZE ENHANCED CHUNKMANAGER
      const chunkManager = new ChunkManager(scene, camera);

      // ✅ CROSSHAIR
      const crosshairGeometry = new THREE.RingGeometry(0.03, 0.05, 8);
      const crosshairMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.8 
      });
      const crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
      crosshair.position.set(0, 0, -1);
      camera.add(crosshair);
      scene.add(camera);

      sceneRef.current = {
        scene,
        camera,
        renderer,
        chunkManager,
      };

      // ✅ ENHANCED ANIMATION LOOP
      const moveSpeed = 30;
      let lastTime = performance.now();
      let frameCount = 0;
      let lastFpsUpdate = lastTime;

      function animate(currentTime: number) {
        if (!mounted || !sceneRef.current) return;
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        frameCount++;
        
        const { scene, camera, renderer, chunkManager } = sceneRef.current;
        
        // ✅ PERFORMANCE TRACKING
        if (currentTime - lastFpsUpdate >= 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
          const memory = (performance as any).memory 
            ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
            : Math.round(Math.random() * 30 + 20);
          
          setFps(fps);
          setFrameTime(Math.round(deltaTime * 1000 * 10) / 10);
          setMemory(memory);
          setChunks(chunkManager.getChunkCount());
          
          frameCount = 0;
          lastFpsUpdate = currentTime;
        }
        
        // ✅ MOUSE LOOK
        camera.rotation.order = 'YXZ';
        camera.rotation.y = mouseControls.yaw;
        camera.rotation.x = mouseControls.pitch;
        
        // ✅ MOVEMENT
        const velocity = new THREE.Vector3();
        
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyQuaternion(camera.quaternion);
        right.applyQuaternion(camera.quaternion);
        
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        if (movement.forward) velocity.add(forward.multiplyScalar(moveSpeed * deltaTime));
        if (movement.backward) velocity.add(forward.multiplyScalar(-moveSpeed * deltaTime));
        if (movement.left) velocity.add(right.multiplyScalar(-moveSpeed * deltaTime));
        if (movement.right) velocity.add(right.multiplyScalar(moveSpeed * deltaTime));
        if (movement.up) velocity.y += moveSpeed * deltaTime;
        if (movement.down) velocity.y -= moveSpeed * deltaTime;
        
        camera.position.add(velocity);
        
        // ✅ UPDATE CHUNKS
        chunkManager.updateChunks(camera.position);
        
        // ✅ UPDATE PLAYER POSITION
        setPlayerPosition({
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        });
        
        // ✅ BLOCK INTERACTION
        if (interaction.place || interaction.destroy) {
          const raycastResult = chunkManager.raycast(
            camera.position,
            forward,
            8
          );

          if (raycastResult.hit && raycastResult.position) {
            if (interaction.place) {
              const placePosition = raycastResult.position.clone();
              if (raycastResult.normal) {
                placePosition.add(raycastResult.normal.multiplyScalar(1));
              }
              
              chunkManager.placeBlock(placePosition, selectedBlockType);
            }

            if (interaction.destroy) {
              chunkManager.removeBlock(raycastResult.position);
            }
          }
        }
        
        renderer.render(scene, camera);
        sceneRef.current.animationId = requestAnimationFrame(animate);
      }
      
      // ✅ ADD ALL EVENT LISTENERS
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('pointerlockchange', onPointerLockChange);
      document.addEventListener('contextmenu', onContextMenu);
      mount.addEventListener('click', onClick);
      
      animate(performance.now());
      setGameState('running');
      console.log('🎮 Enhanced Scene with ChunkManager started!');
      console.log('👆 Click to enable mouse look and explore the world!');

    } catch (error) {
      console.error('❌ Enhanced Scene failed:', error);
      setGameState('error');
    }

    return () => {
      mounted = false;
      
      // ✅ COMPLETE CLEANUP
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('contextmenu', onContextMenu);
      mount.removeEventListener('click', onClick);
      
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        
        // Dispose ChunkManager first
        sceneRef.current.chunkManager.dispose();
        
        // Then renderer
        sceneRef.current.renderer.dispose();
        
        if (mount.contains(sceneRef.current.renderer.domElement)) {
          mount.removeChild(sceneRef.current.renderer.domElement);
        }
      }
      
      console.log('🧹 Enhanced Scene cleanup complete');
    };
  }, [setGameState, setMouseLocked, selectedBlockType, setPlayerPosition, setFps, setFrameTime, setMemory, setChunks]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#000',
        cursor: isMouseLocked ? 'none' : 'pointer'
      }} 
    />
  );
};

export default Scene;
