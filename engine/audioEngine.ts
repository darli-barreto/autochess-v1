// src/engine/audioEngine.ts

type SoundKey = 'soundtrack' | 'sell' | 'refresh' | 'purchase' | 'level' | 'combine';

const SOUND_PATHS: Record<SoundKey, string[]> = {
  soundtrack: ['/sounds/Soundtrack.mp3', '/sounds/Soundtrack.wav', '/sounds/Soundtrack.ogg', '/sounds/soundtrack.mp3'],
  sell: ['/sounds/Sell.mp3', '/sounds/Sell.wav', '/sounds/Sell.ogg', '/sounds/sell.mp3'],
  refresh: ['/sounds/Refresh.mp3', '/sounds/Refresh.wav', '/sounds/Refresh.ogg', '/sounds/refresh.mp3'],
  purchase: ['/sounds/Purchase.mp3', '/sounds/Purchase.wav', '/sounds/Purchase.ogg', '/sounds/purchase.mp3', '/sounds/Buy.mp3'],
  level: ['/sounds/Level.mp3', '/sounds/Level.wav', '/sounds/Level.ogg', '/sounds/level.mp3'],
  combine: ['/sounds/Combine.mp3', '/sounds/Combine.wav', '/sounds/Combine.ogg', '/sounds/combine.mp3'],
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private soundBuffers: Map<SoundKey, AudioBuffer> = new Map();
  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying: boolean = false;
  private sfxVolume: number = 0.85;
  private bgmVolume: number = 0.35;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBgm();
      // Pre-cargar buffers al primer click del usuario
      const handleFirstInteraction = () => {
        this.initCtx();
        this.preloadAllSounds();
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('keydown', handleFirstInteraction);
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private initBgm() {
    if (typeof window === 'undefined') return;
    const candidates = SOUND_PATHS.soundtrack;
    this.bgmAudio = new Audio(candidates[0]);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.bgmVolume;
  }

  public async preloadAllSounds() {
    const keys: SoundKey[] = ['sell', 'refresh', 'purchase', 'level', 'combine'];
    for (const key of keys) {
      this.loadSoundBuffer(key);
    }
  }

  private async loadSoundBuffer(key: SoundKey): Promise<AudioBuffer | null> {
    if (this.soundBuffers.has(key)) {
      return this.soundBuffers.get(key)!;
    }

    this.initCtx();
    if (!this.ctx) return null;

    const candidates = SOUND_PATHS[key];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(arrayBuf);
          this.soundBuffers.set(key, decoded);
          return decoded;
        }
      } catch {
        // Intentar siguiente extensión candidata
      }
    }
    return null;
  }

  // Reproductor polifónico de alta velocidad con Web Audio Buffer
  private playBuffer(key: SoundKey, fallbackSynthetic: () => void, customVolumeMultiplier = 1) {
    if (this.isMuted) return;
    this.initCtx();

    const buffer = this.soundBuffers.get(key);
    if (buffer && this.ctx) {
      try {
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        source.buffer = buffer;

        gainNode.gain.setValueAtTime(this.sfxVolume * customVolumeMultiplier, this.ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(0);
        return;
      } catch {
        // Fallback en caso de error
      }
    }

    // Si aún no ha cargado el archivo o no existe, intentar cargarlo y usar sintético
    this.loadSoundBuffer(key);
    fallbackSynthetic();
  }

  // ========================================================
  // 🔊 SONIDOS PRINCIPALES DE ROLEO (Rolldown / Shop / Units)
  // ========================================================

  /** 🔄 Refresh / Reroll (D) */
  public playReroll() {
    this.playBuffer('refresh', () => this.fallbackReroll());
  }

  /** 🛒 Purchase / Buy Champion (Comprar ficha) */
  public playBuy() {
    this.playBuffer('purchase', () => this.fallbackBuy());
  }

  /** 💰 Sell Champion (E / Vender ficha) */
  public playSell() {
    this.playBuffer('sell', () => this.fallbackSell());
  }

  /** ⭐ Combine / 2-Star / 3-Star Fusion (Fusión de campeones) */
  public playFusion(stars: 2 | 3 = 2) {
    this.playBuffer('combine', () => this.fallbackFusion(stars), stars === 3 ? 1.25 : 1.0);
  }

  /** 🆙 Level / Buy XP (F / Subir de nivel) */
  public playLevelUp() {
    this.playBuffer('level', () => this.fallbackLevelUp());
  }

  /** 🎵 Control de Música de Fondo (Soundtrack) */
  public startSoundtrack() {
    if (this.isMuted || !this.bgmAudio) return;
    this.bgmAudio.play().then(() => {
      this.isBgmPlaying = true;
    }).catch(() => {
      // Bloqueo de autoplay por el navegador hasta primera interacción
    });
  }

  public pauseSoundtrack() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
      if (!muted && !this.isBgmPlaying) {
        this.startSoundtrack();
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // ========================================================
  // ⚔️ OTROS SFX (Ítems, Colocación, Combate)
  // ========================================================

  public playPlaceUnit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);

    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playEquipItem() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  public playDefeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chord = [349.23, 311.13, 277.18, 220.0];
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.65);
    });
  }

  // ========================================================
  // 🎛️ FALLBACKS SINTETIZADOS (Por si falta algún archivo .mp3/.wav)
  // ========================================================
  private fallbackReroll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private fallbackBuy() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  private fallbackSell() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.15);
    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private fallbackLevelUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.35);
    });
  }

  private fallbackFusion(stars: 2 | 3) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const frequencies = stars === 3 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [440, 554.37, 659.25, 880];
    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = stars === 3 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }
}

export const soundEngine = new SoundEngine();