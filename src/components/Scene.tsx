/* import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ChunkManager } from '../game/world/ChunkManager';
import { InputManager } from '../game/systems/InputManager';
import { AudioManager } from '../game/systems/AudioManager';
import { useGameStore, usePerformanceStore } from '../game/store';
import { BlockType } from '../types/game';

interface SceneRef {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  chunkManager: ChunkManager;
  inputManager: InputManager;
  audioManager: AudioManager;
  animationId?: number;
}

const Scene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRef | null>(null);
  
  // ✅ HOOKS AN DER RICHTIGEN STELLE:
  const { 
    gameState, 
    playerPosition, 
    setPlayerPosition, 
    selectedBlockType,
    dayTime,
    setDayTime,
    isMouseLocked,
    setMouseLocked
  } = useGameStore();

  const { setFps, setFrameTime, setMemory, setChunks } = usePerformanceStore();

  // Player movement state
  const playerVelocity = useRef(new THREE.Vector3());
  const isOnGround = useRef(false);
  const lastStepTime = useRef(0);

  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300);

    // Enhanced lighting with day/night cycle
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Camera setup (FPS-style)
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(playerPosition.x, playerPosition.y, playerPosition.z);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enhanced canvas setup
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    // Initialize systems
    const chunkManager = new ChunkManager(scene, camera);
    const inputManager = new InputManager();
    const audioManager = new AudioManager();

    // Crosshair
    const crosshairGeometry = new THREE.RingGeometry(0.02, 0.03, 8);
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
      inputManager,
      audioManager,
    };

    console.log('🎮 Enhanced Scene erfolgreich initialisiert');
  }, [playerPosition]);

  const updateDayNightCycle = useCallback(() => {
    if (!sceneRef.current) return;

    const { scene } = sceneRef.current;
    
    // Update day time
    const newDayTime = (dayTime + 0.0001) % 1;
    setDayTime(newDayTime);

    // Calculate lighting based on day time
    const sunAngle = newDayTime * Math.PI * 2;
    const lightIntensity = Math.max(0.2, Math.sin(sunAngle));
    
    // Update ambient light
    const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.intensity = lightIntensity * 0.6;
    }

    // Update directional light
    const directionalLight = scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (directionalLight) {
      directionalLight.intensity = lightIntensity;
      directionalLight.position.x = Math.cos(sunAngle) * 100;
      directionalLight.position.y = Math.sin(sunAngle) * 100;
      
      // Change light color based on time
      if (lightIntensity < 0.3) {
        directionalLight.color.setHex(0x4169E1); // Night blue
      } else if (lightIntensity < 0.7) {
        directionalLight.color.setHex(0xFFA500); // Sunset orange
      } else {
        directionalLight.color.setHex(0xFFFFFF); // Day white
      }
    }

    // Update sky color
    const skyColorIntensity = Math.max(0.1, lightIntensity);
    scene.background = new THREE.Color(
      0.53 * skyColorIntensity,
      0.81 * skyColorIntensity,
      0.92 * skyColorIntensity
    );
  }, [dayTime, setDayTime]);

  const handlePlayerMovement = useCallback((deltaTime: number) => {
    if (!sceneRef.current || gameState === 'paused') return;

    const { camera, chunkManager, inputManager, audioManager } = sceneRef.current;
    const controls = inputManager.getControls();
    const mouseControls = inputManager.getMouseControls();

    // Apply mouse look
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseControls.yaw;
    camera.rotation.x = mouseControls.pitch;

    // Movement
    const moveSpeed = controls.sprint ? 20 : 10;
    const jumpForce = 15;
    const gravity = -30;

    // Get movement direction based on camera rotation
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);
    
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Calculate movement vector
    if (controls.forward) direction.add(forward);
    if (controls.backward) direction.sub(forward);
    if (controls.left) direction.sub(right);
    if (controls.right) direction.add(right);

    direction.normalize();
    direction.multiplyScalar(moveSpeed * deltaTime);

    // Apply gravity
    playerVelocity.current.y += gravity * deltaTime;

    // Jump
    if (controls.jump && isOnGround.current) {
      playerVelocity.current.y = jumpForce;
      isOnGround.current = false;
      audioManager.playSound('jump', 0.3);
    }

    // Apply movement
    const newPosition = camera.position.clone();
    newPosition.add(direction);
    newPosition.y += playerVelocity.current.y * deltaTime;

    // Simple ground collision (Y = 50 for now)
    if (newPosition.y <= 50) {
      newPosition.y = 50;
      playerVelocity.current.y = 0;
      isOnGround.current = true;
    }

    // Update camera position
    camera.position.copy(newPosition);
    
    // Update chunks
    chunkManager.updateChunks(camera.position);

    // Update player position in store
    setPlayerPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    });

    // Play step sounds
    if ((controls.forward || controls.backward || controls.left || controls.right) && 
        isOnGround.current && Date.now() - lastStepTime.current > 400) {
      audioManager.playSound('step', 0.2);
      lastStepTime.current = Date.now();
    }

    // Handle block interaction
    if (controls.place || controls.destroy) {
      const raycastResult = chunkManager.raycast(
        camera.position,
        forward,
        6
      );

      if (raycastResult.hit && raycastResult.position) {
        if (controls.place) {
          const placePosition = raycastResult.position.clone();
          if (raycastResult.normal) {
            placePosition.add(raycastResult.normal.multiplyScalar(2));
          }
          
          if (chunkManager.placeBlock(placePosition, selectedBlockType)) {
            audioManager.playSound('place', 0.4);
          }
        }

        if (controls.destroy) {
          if (chunkManager.removeBlock(raycastResult.position)) {
            audioManager.playSound('break', 0.4);
          }
        }
      }
    }
  }, [gameState, selectedBlockType, setPlayerPosition]);

  // ✅ KORREKTE ANIMATE-FUNKTION:
  const animate = useCallback(() => {
    if (!sceneRef.current) return;

    const { scene, camera, renderer, chunkManager } = sceneRef.current;
    
    // Performance tracking
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - (sceneRef.current as any).lastTime || 0) / 1000, 0.1);
    (sceneRef.current as any).lastTime = currentTime;

    // FPS calculation
    (sceneRef.current as any).frameCount = ((sceneRef.current as any).frameCount || 0) + 1;
    if (!((sceneRef.current as any).lastFpsUpdate)) {
      (sceneRef.current as any).lastFpsUpdate = currentTime;
    }

    // Update Performance Store every second
    if (currentTime - (sceneRef.current as any).lastFpsUpdate >= 1000) {
      const fps = Math.round(((sceneRef.current as any).frameCount * 1000) / (currentTime - (sceneRef.current as any).lastFpsUpdate));
      const frameTimeMs = deltaTime * 1000;
      const memory = (performance as any).memory 
        ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
        : Math.round(Math.random() * 20 + 15);
      const chunks = chunkManager.getChunkCount();

      // Update performance store
      setFps(fps);
      setFrameTime(Math.round(frameTimeMs * 10) / 10);
      setMemory(memory);
      setChunks(chunks);

      (sceneRef.current as any).frameCount = 0;
      (sceneRef.current as any).lastFpsUpdate = currentTime;
    }

    // Update systems
    updateDayNightCycle();
    handlePlayerMovement(deltaTime);

    // Render
    renderer.render(scene, camera);
    
    sceneRef.current.animationId = requestAnimationFrame(animate);
  }, [updateDayNightCycle, handlePlayerMovement, setFps, setFrameTime, setMemory, setChunks]);

  const handleResize = useCallback(() => {
    if (!sceneRef.current || !mountRef.current) return;

    const { camera, renderer } = sceneRef.current;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }, []);

  // Pointer lock handling
  useEffect(() => {
    const handlePointerLockChange = () => {
      setMouseLocked(!!document.pointerLockElement);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [setMouseLocked]);

  useEffect(() => {
    initializeScene();
    
    window.addEventListener('resize', handleResize);
    
    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        
        sceneRef.current.chunkManager.dispose();
        sceneRef.current.inputManager.dispose();
        sceneRef.current.audioManager.dispose();
        sceneRef.current.renderer.dispose();
        
        if (mountRef.current?.contains(sceneRef.current.renderer.domElement)) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
      
      console.log('🎮 Enhanced Scene cleanup abgeschlossen');
    };
  }, [initializeScene, handleResize, animate]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        cursor: isMouseLocked ? 'none' : 'pointer'
      }} 
    />
  );
};

export default Scene;
*/
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../game/store';

const Scene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { gameState, setGameState, isMouseLocked, setMouseLocked } = useGameStore();

  useEffect(() => {
    if (!mountRef.current) return;

    let mounted = true;
    const mount = mountRef.current;
    let renderer: THREE.WebGLRenderer;
    let animationId: number;
    
    // ✅ MOVEMENT STATE
    const movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    };

    // ✅ MOUSE LOOK STATE (aus dem alten Code!)
    const mouseControls = {
      sensitivity: 0.002,
      pitch: 0,
      yaw: 0,
    };

    // ✅ KEYBOARD HANDLERS
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

    // ✅ MOUSE HANDLERS (aus dem alten Code!)
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

    // ✅ POINTER LOCK HANDLER
    const onPointerLockChange = () => {
      setMouseLocked(!!document.pointerLockElement);
    };

    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB);

      const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
      camera.position.set(0, 10, 30);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      scene.add(directionalLight);

      // ✅ TEST CUBES
      const geometry = new THREE.BoxGeometry(10, 10, 10);
      
      // Green cube at center
      const centerCube = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x00ff00 }));
      centerCube.position.set(0, 0, 0);
      scene.add(centerCube);

      // Red cube to the right
      const rightCube = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xff0000 }));
      rightCube.position.set(30, 0, 0);
      scene.add(rightCube);

      // Blue cube behind
      const backCube = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x0000ff }));
      backCube.position.set(0, 0, -30);
      scene.add(backCube);

      // Yellow cube above
      const topCube = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffff00 }));
      topCube.position.set(0, 30, 0);
      scene.add(topCube);

      // Ground reference
      const groundGeometry = new THREE.PlaneGeometry(200, 200);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -15;
      scene.add(ground);

      // ✅ CROSSHAIR (aus dem alten Code!)
      const crosshairGeometry = new THREE.RingGeometry(0.05, 0.07, 8);
      const crosshairMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.8 
      });
      const crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
      crosshair.position.set(0, 0, -1);
      camera.add(crosshair);
      scene.add(camera);

      // ✅ MOVEMENT VARIABLES
      const moveSpeed = 20;
      let lastTime = performance.now();

      // ✅ RENDER LOOP WITH MOUSE LOOK
      function animate(currentTime: number) {
        if (!mounted) return;
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // ✅ APPLY MOUSE LOOK (aus dem alten Code!)
        camera.rotation.order = 'YXZ';
        camera.rotation.y = mouseControls.yaw;
        camera.rotation.x = mouseControls.pitch;
        
        // ✅ MOVEMENT BASIERT AUF KAMERA-RICHTUNG
        const velocity = new THREE.Vector3();
        
        // Get camera direction vectors
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyQuaternion(camera.quaternion);
        right.applyQuaternion(camera.quaternion);
        
        // Keep movement horizontal (no flying up/down with mouse look)
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
        
        // Apply movement to camera
        camera.position.add(velocity);
        
        // Rotate cubes for visual feedback
        centerCube.rotation.x += 0.01;
        centerCube.rotation.y += 0.01;
        rightCube.rotation.x += 0.005;
        backCube.rotation.z += 0.008;
        topCube.rotation.y += 0.012;
        
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      }
      
      // ✅ ADD ALL EVENT LISTENERS
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('pointerlockchange', onPointerLockChange);
      mount.addEventListener('click', onClick);
      
      animate(performance.now());
      setGameState('running');
      console.log('✅ FPS Scene with Mouse Look started');
      console.log('👆 Click to enable mouse look!');

    } catch (error) {
      console.error('❌ WebGL failed:', error);
      setGameState('error');
    }

    return () => {
      mounted = false;
      
      // ✅ CLEANUP ALL EVENT LISTENERS
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      mount.removeEventListener('click', onClick);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      if (renderer) {
        renderer.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      }
      
      console.log('🧹 FPS Scene cleanup');
    };
  }, [setGameState, setMouseLocked]);

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
