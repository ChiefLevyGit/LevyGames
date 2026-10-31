import { reducedMotion } from '../ui/dom.ts';
import { PALETTE } from '../config/theme.ts';

/**
 * שכבת אפקטים אחת על כל המסך (canvas, pointer-events: none). הלולאה רצה רק
 * כשיש חלקיקים חיים - בלי requestAnimationFrame מיותר שמרוקן סוללה בטאבלט.
 */
type Kind = 'spark' | 'smoke' | 'ember' | 'coin' | 'star' | 'confetti';

interface P {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  g: number;
  drag: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickOne = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

class ParticleLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ps: P[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-layer';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d')!;
    window.addEventListener('resize', () => this.resize());
  }

  mount(parent: HTMLElement): void {
    parent.append(this.canvas);
    this.resize();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
  }

  /** x,y בקואורדינטות מסך (clientX/Y) */
  burst(kind: Kind, x: number, y: number, count = 18, colors?: readonly string[]): void {
    const n = reducedMotion() ? Math.ceil(count / 4) : count;
    for (let i = 0; i < n; i++) this.ps.push(this.make(kind, x, y, colors));
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }

  /** גשם קונפטי מראש המסך - לסיום המסע */
  rain(count = 120): void {
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const p = this.make('confetti', rand(0, w), rand(-200, -10));
      this.ps.push(p);
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }

  private make(kind: Kind, x: number, y: number, colors?: readonly string[]): P {
    const a = rand(0, Math.PI * 2);
    const base: P = {
      kind, x, y, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#fff', rot: rand(0, 6.28), vr: 0, g: 0, drag: 0.9,
    };
    switch (kind) {
      case 'spark': {
        const s = rand(90, 320);
        return { ...base, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(0.45, 0.9), size: rand(1.6, 3.6),
          color: pickOne(colors ?? [PALETTE.emerald, PALETTE.mint, PALETTE.gold]), drag: 0.86 };
      }
      case 'ember': {
        return { ...base, vx: rand(-60, 60), vy: rand(-180, -60), max: rand(0.6, 1.1), size: rand(1.5, 3),
          color: pickOne(colors ?? [PALETTE.warning, PALETTE.amber, '#FDBA74']), g: -30, drag: 0.97 };
      }
      case 'smoke': {
        return { ...base, vx: rand(-40, 40), vy: rand(-70, -25), max: rand(0.9, 1.5), size: rand(10, 20),
          color: 'rgba(148,163,184,', drag: 0.98 };
      }
      case 'coin': {
        const s = rand(220, 460);
        const ang = rand(-Math.PI * 0.85, -Math.PI * 0.15);
        return { ...base, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, max: rand(1.3, 2), size: rand(6, 10),
          color: pickOne([PALETTE.gold, PALETTE.goldLight, '#FBBF24']), g: 620, vr: rand(6, 14), drag: 0.995 };
      }
      case 'star': {
        const s = rand(160, 380);
        return { ...base, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, max: rand(0.9, 1.5), size: rand(5, 9),
          color: pickOne(colors ?? [PALETTE.goldLight, '#FFFFFF', PALETTE.gold]), g: 260, vr: rand(-5, 5), drag: 0.97 };
      }
      case 'confetti': {
        return { ...base, vx: rand(-40, 40), vy: rand(80, 200), max: rand(3, 5), size: rand(5, 9),
          color: pickOne([PALETTE.gold, PALETTE.emerald, PALETTE.cyan, PALETTE.purpleLight, PALETTE.warningLight]),
          g: 40, vr: rand(-8, 8), drag: 0.995 };
      }
    }
  }

  private tick(t: number): void {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ps = this.ps.filter((p) => (p.life += dt) < p.max);
    for (const p of this.ps) {
      const k = Math.pow(p.drag, dt * 60);
      p.vx *= k;
      p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const fade = 1 - p.life / p.max;
      this.draw(p, fade);
    }

    if (this.ps.length) this.raf = requestAnimationFrame((n) => this.tick(n));
    else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private draw(p: P, fade: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    switch (p.kind) {
      case 'spark':
      case 'ember': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'smoke': {
        const grow = 1 + (1 - fade) * 1.6;
        ctx.fillStyle = `${p.color}${(0.35 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * grow, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'coin': {
        ctx.globalAlpha = Math.min(1, fade * 2);
        ctx.scale(Math.abs(Math.cos(p.rot)) * 0.85 + 0.15, 1);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = PALETTE.copperDark;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'star': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 12;
        starPath(ctx, p.size);
        ctx.fill();
        break;
      }
      case 'confetti': {
        ctx.globalAlpha = Math.min(1, fade * 3);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      }
    }
    ctx.restore();
  }
}

function starPath(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export const FX = new ParticleLayer();

/** מרכז של אלמנט בקואורדינטות מסך */
export function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
