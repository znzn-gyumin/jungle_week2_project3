/**
 * 자유 이동 — VN 재생기와 Phaser 맵 사이의 다리.
 *
 * 정본: docs/TECH_DESIGN.md 3-1 `@freeroam`
 *
 * `limit` 만큼 대화하면 `after` 로 빠집니다. **이동 자체는 제한하지 않고
 * 대화 횟수만 셉니다.** 히로인과 대화하면 호감도 +6 이 자동으로 붙습니다.
 */
import Phaser from 'phaser';

import type { TimeOfDay } from '../config/lighting';
import { HEROINE_GENDER, type FreeroamNpc, type GameState, type Line } from '../core/types';
import { CampusScene, type MiniData } from './CampusScene';
import { HEROINE_BY_NAME, THEME } from '../core/types';
import { MAP_DESIGN, scoutName } from './sprites';

type Block = Extract<Line, { t: 'freeroam' }>;

/** 자유 이동은 셋뿐입니다 — D1 16:30 낮 · D5 23:00 밤 · D8 저녁 (lighting.ts) */
const TIME: Record<string, TimeOfDay> = {
  prologue: 'day',
  midproject: 'night',
  finalprep: 'evening',
};

export class Roam {
  private game: Phaser.Game | null = null;

  /**
   * **매번 새로 찾습니다.** `scene.start()` 직후에는 아직 부팅이 안 끝나
   * `getScene` 이 null 을 돌려줍니다. 그걸 붙들고 있으면 대화가 끝난 뒤
   * `resume()` 이 조용히 아무것도 안 해서 맵이 멈춘 채로 남습니다.
   */
  private get scene(): CampusScene | null {
    return (this.game?.scene.getScene('campus') as CampusScene | null) ?? null;
  }
  private left: number;
  private met: string[] = [];

  constructor(
    private host: HTMLElement,
    private block: Block,
    private state: GameState,
    /** NPC 씬을 재생합니다. 끝나면 `resume()` 이 불립니다 */
    private onTalk: (target: string) => void,
    /** 대화 횟수를 다 쓰면 */
    private onDone: (target: string) => void,
  ) {
    this.left = block.limit;
  }

  /** 안내는 DOM 으로 그립니다 — CSS 를 쓸 수 있어야 요즘 UI 가 나옵니다 */
  private guideEl: HTMLElement | null = null;
  private miniEl: HTMLCanvasElement | null = null;
  private mini: MiniData | null = null;
  /** 한 번이라도 말을 걸었는지 — 튜토리얼 마지막 단계가 봅니다 */
  private talked = false;
  private me = { x: 0, y: 0 };

  start(): void {
    const npcs = this.usable();
    this.host.hidden = false;
    // 미니맵과 안내를 한 카드에 담습니다 — 겹치지 않게 세로로 쌓습니다
    const hud = document.createElement('div');
    hud.className = 'roam-hud';
    this.miniEl = document.createElement('canvas');
    this.miniEl.className = 'roam-mini';
    this.guideEl = document.createElement('div');
    this.guideEl.className = 'roam-guide';
    hud.append(this.miniEl, this.guideEl);
    this.host.append(hud);

    // 처음 걷는 자리에서 조작을 한 번 알려줍니다. 아무 키나 누르면 닫힙니다.
    if (this.block.id === 'prologue') this.showTutorial();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      backgroundColor: '#0b0c17',
      pixelArt: true, // 타일은 NEAREST — 도트만 따로 LINEAR 로 겁니다
      roundPixels: true, // 정수 좌표로 그립니다 — 안 그러면 타일 이음매가 벌어집니다
      // **고정 해상도에 FIT.** 창 크기에 맞춰 캔버스를 늘리면 타일 한 칸이
      // 소수 픽셀이 되어 걸어다닐 때 격자 이음매가 보입니다. 작게 그린 뒤
      // 화면 전체를 한 장으로 확대하면 그 문제가 사라집니다.
      // **NONE + CSS 늘리기.** FIT 은 부모의 화면상 크기를 재는데, 무대가
      // CSS transform 으로 이미 축소돼 있어 두 번 줄어듭니다. 캔버스를
      // 2560×1440 으로 고정하고 늘리는 일은 CSS 에 맡깁니다 — 무대와 같은
      // 16:9 라 늘려도 안 찌그러집니다.
      scale: { mode: Phaser.Scale.NONE, ...MAP_DESIGN },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: CampusScene,
    });
    this.game.scene.start('campus', {
      map: this.block.spawn.map,
      x: this.block.spawn.x,
      y: this.block.spawn.y,
      npcs,
      triggers: this.block.triggers,
      gender: this.state.playerGender,
      time: TIME[this.block.id] ?? 'day',
      onTalk: (n: FreeroamNpc) => this.talk(n),
      onTrigger: (t: string) => this.trigger(t),
    });
    window.addEventListener('keydown', this.onKey);
    setTimeout(() => {
      this.updateGuide();
      this.scene?.bindMini(
        (d) => {
          this.mini = d;
          this.drawMini();
        },
        (x, y) => {
          this.me = { x, y };
          this.drawMini();
        },
      );
    }, 300);
  }

  /**
   * 배치되는 3인은 `playerGender` 의 **반대 성별**입니다.
   * 4조 대표는 반대로 주인공과 동성이라 이름이 갈립니다 (CHARACTERS 4절).
   */
  private usable(): FreeroamNpc[] {
    const scout = scoutName(this.state.playerGender);
    return this.block.npcs
      .filter((n) => !this.met.includes(n.who))
      .filter((n) => !n.heroine || HEROINE_GENDER[n.heroine] !== this.state.playerGender)
      .map((n) => (n.who === '태윤' ? { ...n, who: scout } : n));
  }

  private talk(n: FreeroamNpc): void {
    this.talked = true;
    // 이미 만났거나 **할 이야기를 다 했으면** 한 마디만 하고 횟수를 안 씁니다.
    // 다음 장면으로 넘어가기 전까지는 누구에게든 몇 번이든 걸 수 있습니다.
    const met = this.met.includes(n.who === '태연' ? '태윤' : n.who);
    if (met || this.left <= 0) {
      this.scene?.setPaused(true);
      this.onTalk(met ? n.target : this.idleScene(n));
      return;
    }
    this.left--;
    this.met.push(n.who === '태연' ? '태윤' : n.who);
    this.scene?.removeNpc(n.who, this.idleScene(n));
    // 마지막 한 명을 만났으면 남은 사람들의 느낌표도 내립니다 —
    // 이제 그들도 스토리가 아니라 한 마디만 합니다.
    if (this.left <= 0) this.scene?.exhaust();
    // 맵을 숨기지 않습니다 — 걷다가 말을 건 자리에서 그대로 대화합니다
    this.scene?.setPaused(true);
    this.onTalk(n.target);
  }

  private trigger(target: string): void {
    this.scene?.setPaused(true);
    this.onTalk(target);
  }

  /** 씬이 `-> back` 으로 끝나면 맵으로 돌아옵니다 */
  resume(): void {
    this.scene?.setPaused(false);
    this.updateGuide();
  }

  /** 진행 키 — 할 일을 다 했을 때만 받습니다 */
  private onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter') return;
    if (this.left > 0 && this.usable().length) return;
    e.preventDefault();
    this.finish();
  };

  /**
   * 다시 말을 걸었을 때 쓸 씬. 상황에 맞아야 하므로 **자유 이동 구간별로**
   * 다릅니다 (src/script/common/idle.vns).
   */
  private idleScene(n: FreeroamNpc): string {
    const id = HEROINE_BY_NAME[n.who];
    if (id) return `idle_${id}_${this.block.id}`;
    if (n.who === '명진혁') return `idle_coach_${this.block.id}`;
    // 4조 정찰은 마지막 날의 그 장면 전용입니다
    if (n.who === '태윤' || n.who === '태연') {
      return this.block.id === 'finalprep' ? 'idle_scout_finalprep' : `idle_team_${this.block.id}`;
    }
    // 히로인도 코치도 아닌 사람 — 이름을 안 부르는 공용 대사
    return `idle_team_${this.block.id}`;
  }

  /**
   * 첫 자유 이동에서 한 번만. **읽고 닫는 창이 아니라 직접 해보는 4단계**
   * 입니다 — 시켜본 뒤에야 다음으로 넘어가므로 조작이 손에 남습니다.
   * 게임을 막지 않으므로 그냥 걸어다녀도 알아서 진행됩니다.
   */
  private showTutorial(): void {
    const STEPS = [
      { key: '방향키', ask: '한 번 걸어 보세요' },
      { key: '시프트 + 방향키', ask: '누른 채로 뛰어 보세요' },
      { key: '느낌표', ask: '아직 말 안 걸어 본 사람에게 다가가 보세요' },
      { key: '스페이스', ask: '말을 걸어 보세요' },
    ];
    const el = document.createElement('div');
    el.className = 'roam-tutorial';
    this.host.append(el);

    let step = 0;
    let from: { x: number; y: number } | null = null;
    let ranWhile = false;
    const onShift = (e: KeyboardEvent): void => {
      if (e.shiftKey) ranWhile = true;
    };
    window.addEventListener('keydown', onShift);

    const paint = (): void => {
      el.innerHTML = `
        <p class="roam-tutorial__title">${step >= STEPS.length ? '준비 끝!' : '해보면서 익혀요'}</p>
        <ol class="roam-tutorial__steps">${STEPS.map(
          (s2, i) => `<li class="${i < step ? 'is-done' : i === step ? 'is-now' : ''}">
              <b>${s2.key}</b><span>${s2.ask}</span></li>`,
        ).join('')}</ol>`;
    };
    paint();

    const tick = window.setInterval(() => {
      const sc = this.scene;
      if (!sc) return;
      const at = sc.tile;
      from ??= at;
      const moved = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
      const ok =
        step === 0 ? moved >= 2
        : step === 1 ? ranWhile && moved >= 5
        : step === 2 ? sc.nearWho !== null
        : this.talked;
      if (!ok) return;
      step++;
      if (step === 1) from = at; // 뛰기는 걸은 자리에서 다시 잽니다
      paint();
      if (step < STEPS.length) return;
      window.clearInterval(tick);
      window.removeEventListener('keydown', onShift);
      el.classList.add('is-over');
      setTimeout(() => el.remove(), 1600);
    }, 120);
  }

  /** 미니맵을 DOM 캔버스에 그립니다 — 장치 픽셀 그대로라 또렷합니다 */
  private drawMini(): void {
    const el = this.miniEl;
    const d = this.mini;
    if (!el || !d) return;
    const CSS = 266;
    const dpr = window.devicePixelRatio || 1;
    const s = Math.min(CSS / d.w, (CSS * 0.78) / d.h);
    const w = Math.round(d.w * s);
    const h = Math.round(d.h * s);
    if (el.width !== w * dpr) {
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    }
    const g = el.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff6f9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e3cdd6';
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        if (d.blocked[y * d.w + x]) g.fillRect(x * s, y * s, Math.ceil(s), Math.ceil(s));
      }
    }
    g.fillStyle = '#2a2632';
    for (const p of d.stairs) g.fillRect(p.x * s - 1, p.y * s - 1, s + 2, s + 2);
    g.font = `bold ${Math.max(11, s * 2.4)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // 사람마다 **자기** 테마 컬러입니다 — 말하는 사람 색이 아닙니다.
    // 아직 안 만난 사람은 `!`, 이미 만난 사람은 속 빈 동그라미입니다.
    for (const n of d.npcs) {
      if (n.met) {
        // 느낌표와 같은 방식 — 흰 테두리를 먼저 두르고 테마색으로 채웁니다
        g.beginPath();
        g.arc(n.x * s, n.y * s, 4.2, 0, Math.PI * 2);
        g.lineWidth = 3;
        g.strokeStyle = '#ffffff';
        g.stroke();
        g.fillStyle = n.theme;
        g.fill();
        continue;
      }
      g.lineWidth = 3;
      g.strokeStyle = '#ffffff';
      g.strokeText('!', n.x * s, n.y * s);
      g.fillStyle = n.theme;
      g.fillText('!', n.x * s, n.y * s);
    }
    // 나는 파란 점 — 계단(청록)·사람(분홍)과 안 겹치는 색입니다
    g.beginPath();
    g.arc(this.me.x * s, this.me.y * s, 4.4, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.beginPath();
    g.arc(this.me.x * s, this.me.y * s, 3.2, 0, Math.PI * 2);
    g.fillStyle = '#3d7bff';
    g.fill();
  }

  /** 남은 목표를 맵 위에 적어 둡니다 */
  updateGuide(): void {
    if (!this.guideEl) return;
    const rest = this.usable();
    const left = rest.map((n) => {
      const id = HEROINE_BY_NAME[n.who];
      return { who: n.who, color: id ? THEME[id] : '#b4485a' };
    });
    const done = this.left <= 0 || !rest.length;
    this.guideEl.innerHTML = `
      <p class="roam-guide__goal">${
        done ? '이제 진행할 수 있어요' : `<b>${this.left}명</b>에게 더 말을 걸어요`
      }</p>
      <p class="roam-guide__who">${left
        .map((w) => `<span style="color:${w.color};border-color:${w.color}">${w.who}</span>`)
        .join('')}</p>
      <p class="roam-guide__keys">${
        done
          ? '<b>엔터</b> 로 다음으로 · 더 둘러봐도 됩니다'
          : '방향키 이동 · <b>스페이스</b> 말 걸기 · 청록은 계단'
      }</p>`;
  }

  private finish(): void {
    window.removeEventListener('keydown', this.onKey);
    const after = this.block.after;
    this.destroy();
    this.onDone(after);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    this.game?.destroy(true);
    this.game = null;
    this.guideEl = null;
    this.miniEl = null;
    this.mini = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }
}
