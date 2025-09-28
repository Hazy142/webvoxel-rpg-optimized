export class AudioManager {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private volume = 0.5;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio(): Promise<void> {
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 Audio-System initialisiert');
      await this.loadSounds();
    } catch (error) {
      console.warn('Audio-Kontext konnte nicht erstellt werden:', error);
    }
  }

  private async loadSounds(): Promise<void> {
    // Erstelle einfache synthetische Sounds
    await this.createSyntheticSound('step', 0.1, [200, 150], 'sine');
    await this.createSyntheticSound('place', 0.15, [400, 300], 'square');
    await this.createSyntheticSound('break', 0.2, [300, 100], 'sawtooth');
    await this.createSyntheticSound('jump', 0.3, [250, 350, 400], 'sine');
  }

  private async createSyntheticSound(
    name: string, 
    duration: number, 
    frequencies: number[], 
    type: OscillatorType
  ): Promise<void> {
    if (!this.context) return;

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      let sample = 0;
      const time = i / sampleRate;
      
      frequencies.forEach((freq, index) => {
        const envelope = Math.exp(-time * (index + 1) * 3);
        sample += Math.sin(2 * Math.PI * freq * time) * envelope * 0.3;
      });
      
      data[i] = sample;
    }

    this.sounds.set(name, buffer);
    console.log(`🎵 Sound '${name}' erstellt`);
  }

  public playSound(name: string, volume = this.volume): void {
    if (!this.context || !this.sounds.has(name)) return;

    try {
      const buffer = this.sounds.get(name)!;
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.context.destination);
      source.start();
    } catch (error) {
      console.warn(`Fehler beim Abspielen von '${name}':`, error);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.sounds.clear();
  }
}
