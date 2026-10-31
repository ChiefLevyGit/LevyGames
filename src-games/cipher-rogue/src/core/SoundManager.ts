import { BGM, SFX, type SfxName } from '../media.ts';

/**
 * נשען על הטיוטה של אלעד (Design.info/SoundManager script.ts), עם שלושה שינויים:
 *  - כל הקבצים שנוצרו ב-ElevenLabs נטענים מראש, אחרי המגע הראשון (דרישת דפדפן).
 *  - מוזיקת הרקע מתנגנת דרך WebAudio עם loop - הקליפ נוצר עם loop:true, ו-<audio>
 *    משאיר שקט קטן בתפר.
 *  - ההשתקה היא master gain אחד, כך שהיא תופסת גם צליל שכבר מתנגן.
 */

/** עוצמה יחסית לכל צליל - הקבצים לא נוצרו באותה עוצמה */
const GAIN: Partial<Record<SfxName, number>> = {
  ui_click: 1.0,
  star_pop: 0.9,
  step_valid: 0.7,
  step_invalid: 0.8,
  correct_answer: 0.75,
  door_unlock: 0.8,
  level_win: 0.9,
  alarm_warning: 0.75,
  guard_wake: 0.85,
  hint_reveal: 0.75,
  valve_hiss: 0.6,
};
const BGM_VOLUME = 0.22;

class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private wantBgm = false;
  muted = false;

  /** נקרא מתוך מגע/מקש של המשתמשת - רק אז דפדפן מסכים לפתוח אודיו */
  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      void this.loadAll();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private async loadAll(): Promise<void> {
    const entries: [string, string][] = [...Object.entries(SFX), ['bgm', BGM]];
    await Promise.all(
      entries.map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buf);
        } catch (err) {
          console.warn(`[sound] לא נטען: ${name}`, err);
        }
      }),
    );
    if (this.wantBgm) this.startBgm();
  }

  play(name: SfxName, opts: { rate?: number; delay?: number; gain?: number } = {}): void {
    if (!this.ctx || !this.master) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    const g = this.ctx.createGain();
    g.gain.value = (GAIN[name] ?? 0.8) * (opts.gain ?? 1);
    src.connect(g).connect(this.master);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  playBgm(): void {
    // אם הקבצים עוד נטענים, loadAll יפעיל את המוזיקה כשיסיים
    this.wantBgm = true;
    if (this.buffers.has('bgm')) this.startBgm();
  }

  private startBgm(): void {
    if (!this.ctx || !this.master || this.bgmSource) return;
    const buf = this.buffers.get('bgm');
    if (!buf) return;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(BGM_VOLUME, this.ctx.currentTime + 2.5);
    this.bgmGain.connect(this.master);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.bgmGain);
    src.start();
    this.bgmSource = src;
  }

  /** מנמיך את המוזיקה לרגע - בזמן פתיחת כספת וחגיגה */
  duck(seconds: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const t = this.ctx.currentTime;
    const g = this.bgmGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(BGM_VOLUME * 0.25, t + 0.3);
    g.setValueAtTime(BGM_VOLUME * 0.25, t + seconds);
    g.linearRampToValueAtTime(BGM_VOLUME, t + seconds + 1.5);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }
}

export const Sound = new SoundManagerImpl();
