import { Controls } from '../../types/game';

export class InputManager {
  private controls: Controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    place: false,
    destroy: false,
  };

  private keyMap = {
    'KeyW': 'forward',
    'KeyS': 'backward',
    'KeyA': 'left', 
    'KeyD': 'right',
    'Space': 'jump',
    'ShiftLeft': 'sprint',
  } as const;

  private mouseControls = {
    sensitivity: 0.002,
    pitch: 0,
    yaw: 0,
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('click', this.requestPointerLock.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    const control = this.keyMap[event.code as keyof typeof this.keyMap];
    if (control) {
      this.controls[control] = true;
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const control = this.keyMap[event.code as keyof typeof this.keyMap];
    if (control) {
      this.controls[control] = false;
      event.preventDefault();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) this.controls.destroy = true;
    if (event.button === 2) this.controls.place = true;
    event.preventDefault();
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.controls.destroy = false;
    if (event.button === 2) this.controls.place = false;
    event.preventDefault();
  }

  private onMouseMove(event: MouseEvent): void {
    if (document.pointerLockElement) {
      this.mouseControls.yaw -= event.movementX * this.mouseControls.sensitivity;
      this.mouseControls.pitch -= event.movementY * this.mouseControls.sensitivity;
      this.mouseControls.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseControls.pitch));
    }
  }

  private requestPointerLock(): void {
    document.body.requestPointerLock();
  }

  public getControls(): Controls {
    return { ...this.controls };
  }

  public getMouseControls() {
    return { ...this.mouseControls };
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('click', this.requestPointerLock.bind(this));
  }
}
