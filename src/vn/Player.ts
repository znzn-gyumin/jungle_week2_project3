/**
 * 씬 재생기 — 한 줄씩 소비합니다.
 *
 * 정본: docs/TECH_DESIGN.md 3절
 *
 * 구현 6번까지입니다. 배경·반신·스틸은 `Stage` 가 겁니다.
 * 아직 없는 것은 **Phaser 맵(8번)** 과 **BGM** 이라, 자유 이동은 NPC 목록
 * 선택지로 대신하고 캠퍼스 안 씬은 배경이 빈 채로 갑니다(타일맵 자리).
 */
import { applyEffects, endingTier, testCond } from '../core/state';
import { roleName, substitute } from '../core/tokens';
import { FACE_FILE, HEROINE_BY_NAME, HEROINE_GENDER, NAME_BY_HEROINE, THEME } from '../core/types';
import type { ChoiceOption, GameState, Line, Scene, ScriptData } from '../core/types';
import type { TimeOfDay } from '../config/lighting';
import { Backdrop } from '../map/Backdrop';
import { Roam } from '../map/Roam';
import { Stage } from './Stage';
import { Typewriter } from './Typewriter';

/** 주인공 이름표는 언제나 `나` 입니다 (WORLD_BIBLE 11) */
const ME = '나';

/** 씬의 시간대는 그 씬이 켠 BGM 이 말해줍니다 (WORLD_BIBLE 10-1 · lighting.ts) */
const TIME_BY_BGM: Record<string, TimeOfDay> = {
  day: 'day', session: 'day', tension: 'day',
  swell: 'evening', night: 'night', midnight: 'deepnight', epilogue: 'night',
};

export class Player {
  private state: GameState;
  private script: ScriptData;
  private scene: string;
  private idx = 0;
  private typer: Typewriter;

  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private choiceEl: HTMLElement;
  private boxEl: HTMLElement;
  private faceEl: HTMLImageElement;
  private root: HTMLElement;
  private stageEl: HTMLElement;
  private stage: Stage;
  private mapEl: HTMLElement;
  private roam: Roam | null = null;
  private backdrop: Backdrop;
  private bgm = 'day';
  private atMap = '';
  private lastFace = '기본';
  /** 키보드로 고르는 중인 선택지 */
  private pick = 0;
  /**
   * 이 씬이 사진 배경 위에서 도는가.
   *
   * **명장면은 반신 CG 만, 맵 위 대화는 도트 얼굴만** 씁니다 — 둘을 같이
   * 띄우면 같은 사람이 화면에 둘로 보입니다. `@bg`·`@cg` 가 걸린 씬이
   * 명장면이고, `@map` 이나 자유 이동은 일반 씬입니다.
   */
  private cinematic = false;

  /** 명장면과 맵 대화는 배치가 다릅니다 — CSS 가 클래스로 갈라 봅니다 */
  private setMode(on: boolean): void {
    this.cinematic = on;
    this.boxEl.classList.toggle('vn__box--cine', on);
  }

  constructor(root: HTMLElement, script: ScriptData, state: GameState) {
    this.script = script;
    this.state = state;
    this.scene = state.cursor.sceneId;
    this.idx = state.cursor.lineIndex;

    root.innerHTML = `
      <div class="vn">
        <div class="vn__stage" id="vn-stage"></div>
        <div class="vn__map" id="vn-back" hidden></div>
        <div class="vn__map" id="vn-map" hidden></div>
        <div class="vn__box" id="vn-box">
          <img class="vn__face" id="vn-face" alt="" hidden />
          <div class="vn__said">
            <p class="vn__name" id="vn-name"></p>
            <p class="vn__text" id="vn-text"></p>
          </div>
          <p class="vn__hint">스페이스바 · 클릭 — 대화 진행</p>
        </div>
        <div class="vn__choices" id="vn-choices" hidden></div>
      </div>`;
    this.root = root;
    this.boxEl = root.querySelector('#vn-box')!;
    this.faceEl = root.querySelector('#vn-face')!;
    this.stageEl = root.querySelector('#vn-stage')!;
    this.nameEl = root.querySelector('#vn-name')!;
    this.textEl = root.querySelector('#vn-text')!;
    this.choiceEl = root.querySelector('#vn-choices')!;
    this.mapEl = root.querySelector('#vn-map')!;
    this.backdrop = new Backdrop(root.querySelector('#vn-back')!);
    this.stage = new Stage(this.stageEl);
    this.typer = new Typewriter(this.textEl);

    // 1920 × 1080 무대를 창에 맞춰 축소합니다
    const fit = () => {
      const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      root.style.setProperty('--vn-scale', String(k));
    };
    fit();
    window.addEventListener('resize', fit);

    this.boxEl.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', (e) => {
      // 선택지가 떠 있으면 방향키로 고르고 스페이스·엔터로 결정합니다
      if (!this.choiceEl.hidden) {
        const bs = [...this.choiceEl.querySelectorAll<HTMLButtonElement>('.vn__choice')];
        if (!bs.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          this.movePick(1, bs);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          this.movePick(-1, bs);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          bs[this.pick]?.click();
        }
        return;
      }
      // 맵을 걷는 동안에만 맵이 키를 갖습니다. **대사창이 떠 있으면
      // 스페이스는 대사를 넘깁니다** — 맵은 멈춰 있어 말 걸기와 안 겹칩니다.
      if (this.roam && this.boxEl.hidden) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      }
    });
  }

  start(): void {
    this.step();
  }

  /** 클릭·스페이스 — 타자 중이면 완성, 아니면 다음 줄 */
  private advance(): void {
    if (!this.choiceEl.hidden) return;
    if (!this.typer.finished) {
      this.typer.complete();
      return;
    }
    this.step();
  }

  private lines(): Line[] {
    const sc = this.script[this.scene];
    if (!sc) throw new Error(`씬이 없습니다: ${this.scene}`);
    return sc.lines;
  }

  /** 다음으로 보여줄 줄이 나올 때까지 소비합니다 */
  private step(): void {
    for (;;) {
      const lines = this.lines();
      if (this.idx >= lines.length) {
        if (this.roam) return this.backToRoam();
        if (/_end_(true|good|normal)$/.test(this.scene) || this.scene === 'e_solo') {
          return this.theEnd();
        }
        return this.finish(`씬이 끝났는데 다음이 없습니다: ${this.scene}`);
      }
      const line = lines[this.idx++];
      this.state.cursor = { sceneId: this.scene, lineIndex: this.idx };

      switch (line.t) {
        case 'say':
        case 'narr': {
          if (!testCond(line.cond, this.state)) continue;
          const who = line.t === 'say' ? this.whoName(line.who) : '';
          this.nameEl.textContent = who === ME ? ME : who;
          this.nameEl.hidden = !who;
          this.boxEl.hidden = false;
          this.textEl.classList.toggle('vn__text--narr', line.t === 'narr');
          this.setTheme(line.t === 'say' ? who : null);
          if (line.t === 'say' && this.cinematic) this.stage.setFace(who, line.face);
          this.setAvatar(
            line.t === 'say' && !this.cinematic ? who : null,
            line.t === 'say' ? line.face : undefined,
          );
          if (line.t === 'say') this.fx(line.face);
          this.typer.run(substitute(line.text, this.state));
          return;
        }
        case 'flag':
          if (line.op === 'set') this.state.flags.add(line.id);
          else this.state.flags.delete(line.id);
          if (line.id.startsWith('route:')) {
            this.state.route = line.id.slice(6) as GameState['route'];
          }
          if (line.id.startsWith('spot:')) {
            this.state.dateSpot = line.id.slice(5) as GameState['dateSpot'];
          }
          continue;
        case 'choice':
          return this.showChoices(line.options);
        case 'jump':
          this.goto(line.target);
          return this.step();
        case 'freeroam':
          return this.enterRoam(line);
        case 'bg':
          this.setMode(true);
          this.backdrop.hide();
          this.stage.setBackground(line.id);
          continue;
        case 'map':
          // 맵 위 대화 — 반신은 내리고 도트 얼굴로 갑니다
          this.setMode(false);
          this.stage.clearChar();
          this.stage.clearBackground();
          this.atMap = line.id;
          this.backdrop.show(line.id, line.x, line.y, TIME_BY_BGM[this.bgm] ?? 'day');
          continue;
        case 'cg':
          this.setMode(true);
          this.stage.setCg(line.id);
          continue;
        case 'char': {
          // **@char 가 있으면 그 씬은 반신으로 갑니다.** 맵을 배경으로 두고
          // 인물만 크게 세우는 편이 도트만 보는 것보다 덜 심심합니다.
          const who = this.whoName(line.who);
          if (who) {
            this.setMode(true);
            // 타일맵을 **둘 다** 내려야 사진이 보입니다 — 맵 캔버스가
            // 무대(.vn__stage) 뒤가 아니라 위에 깔려 있습니다.
            this.backdrop.hide();
            this.mapEl.hidden = true;
            if (this.atMap) this.stage.setMapPhoto(this.atMap);
            this.stage.setChar(who, line.pos);
          }
          continue;
        }
        case 'charOut':
          // 인물이 나가면 다시 맵 위 대화로 돌아옵니다
          this.setMode(false);
          this.stage.clearChar();
          this.stage.clearBackground();
          // 자유 이동 중이면 맵 캔버스를 다시 켭니다
          if (this.roam) this.mapEl.hidden = false;
          if (!this.roam && this.atMap) {
            this.backdrop.show(
              this.atMap as never, 0, 0, TIME_BY_BGM[this.bgm] ?? 'day',
            );
          }
          continue;
        default:
          if (line.t === 'bgm') this.bgm = line.id;
          // 오디오는 아직 없습니다 (BGM 8곡 미확보)
          this.stageEl.dataset.note = describe(line);
          continue;
      }
    }
  }

  /**
   * 대사창 왼쪽 얼굴 — `dot/face/` 는 **히로인 6인만** 있습니다.
   * 없는 사람이 말하면 아이콘 자리를 통째로 없앱니다.
   */
  private setAvatar(who: string | null, face?: string): void {
    const id = who ? HEROINE_BY_NAME[who] : undefined;
    if (!id) {
      // 자리는 남깁니다 — CSS 가 visibility 로 숨깁니다
      this.faceEl.hidden = true;
      this.boxEl.classList.remove('vn__box--face');
      return;
    }
    if (face) this.lastFace = face;
    const file = FACE_FILE[this.lastFace] ?? 'normal';
    this.faceEl.src = `${import.meta.env.BASE_URL}assets/dot/face/${id}_${file}.webp`;
    this.faceEl.hidden = false;
    this.boxEl.classList.add('vn__box--face');
    this.faceEl.classList.remove('fx-pop');
    void this.faceEl.offsetWidth;
    this.faceEl.classList.add('fx-pop');
  }

  /**
   * 화면 전체의 강조색을 그 인물의 테마 컬러로 바꿉니다.
   * 대사창 테두리·이름·얼굴 링·선택지·미니맵이 한 색을 봅니다.
   */
  private setTheme(who: string | null): void {
    const id = who ? HEROINE_BY_NAME[who] : undefined;
    const c = id ? THEME[id] : '#e0567b';
    this.root.style.setProperty('--theme', c);
  }

  /** `*` 는 현재 루트, `동갑`·`연상`·`연하` 는 이 회차의 그 역할입니다 */
  private whoName(raw: string): string {
    if (raw === '*') return this.state.route ? NAME_BY_HEROINE[this.state.route] : '';
    return roleName(raw, this.state) || raw;
  }

  private movePick(d: number, bs: HTMLButtonElement[]): void {
    this.pick = (this.pick + d + bs.length) % bs.length;
    bs.forEach((b, i) => b.classList.toggle('vn__choice--on', i === this.pick));
  }

  private showChoices(options: ChoiceOption[]): void {
    const usable = options.filter(
      (o) =>
        testCond(o.cond, this.state) &&
        (!o.heroine || HEROINE_GENDER[o.heroine] !== this.state.playerGender),
    );
    // 선택지 동안에는 대사창을 없앱니다 — 화면 가운데를 선택지가 씁니다
    this.boxEl.hidden = true;
    this.choiceEl.hidden = false;
    this.choiceEl.innerHTML = '';
    this.pick = 0;
    for (const o of usable) {
      const b = document.createElement('button');
      b.className = 'vn__choice';
      b.textContent = substitute(o.text, this.state);
      b.addEventListener('click', () => {
        this.choiceEl.hidden = true;
        this.boxEl.hidden = false;
        applyEffects(this.state, o.effects);
        this.goto(o.target);
        this.step();
      });
      this.choiceEl.append(b);
    }
  }

  /** `@freeroam` — Phaser 맵으로 제어를 넘깁니다 */
  private enterRoam(line: Extract<Line, { t: 'freeroam' }>): void {
    this.boxEl.hidden = true;
    this.textEl.textContent = '';
    this.nameEl.hidden = true;
    this.stage.clearChar();
    this.setMode(false);
    this.backdrop.hide();
    this.roam = new Roam(
      this.mapEl,
      line,
      this.state,
      (target) => {
        this.goto(target);
        this.step();
      },
      (after) => {
        this.roam = null;
        this.goto(after);
        this.step();
      },
    );
    this.roam.start();
  }

  /** 씬이 `-> back` 으로 끝났습니다 */
  private backToRoam(): void {
    this.boxEl.hidden = true;
    this.textEl.textContent = '';
    this.nameEl.hidden = true;
    this.setMode(false);
    this.stage.clearChar();
    this.stage.clearBackground();
    this.mapEl.hidden = false;
    this.roam!.resume();
  }

  /** 라벨 · 씬 id · `r_*_이름` · `r_*_end_{tier}` · `back` */
  private goto(target: string): void {
    if (target === 'back') {
      if (!this.roam) return this.finish('돌아갈 자유 이동이 없습니다');
      this.idx = this.lines().length; // 씬 끝으로 — backToRoam 이 받습니다
      return;
    }
    let t = target;
    if (t.startsWith('r_*_')) {
      if (!this.state.route) {
        t = 'e_solo';
      } else {
        t = t.replace('r_*_', `r_${this.state.route}_`);
        t = t.replace('{tier}', endingTier(this.state));
      }
    }
    const labels = this.script[this.scene]?.labels ?? {};
    if (t in labels) {
      this.idx = labels[t];
      return;
    }
    if (this.script[t]) {
      this.scene = t;
      this.idx = 0;
      // 앞 씬이 `@char none` 없이 끝나면 그 인물이 다음 화면에 남습니다.
      // 다만 **다음 씬이 곧바로 사람을 세우면 지우지 않습니다** — 지웠다
      // 다시 켜면 선택 직후에 한 번 투명해졌다 돌아오는 게 보입니다.
      this.stage.setCg('none');
      if (!hasChar(this.script[t])) {
        this.setMode(false);
        this.stage.clearChar();
      }
      if (!hasBg(this.script[t])) this.stage.clearBackground();
      return;
    }
    this.finish(`점프 대상이 없습니다: ${target} → ${t}`);
  }

  /** 엔딩 씬은 점프가 없습니다 — 여기가 회차의 끝입니다 */
  private theEnd(): void {
    this.boxEl.hidden = false;
    const s = this.state;
    const tier = this.scene === 'e_solo' ? '솔로' : endingTier(s);
    this.choiceEl.hidden = true;
    this.nameEl.hidden = true;
    this.textEl.classList.add('vn__text--narr');
    this.typer.run(
      `— 끝. ${this.scene} · ${tier} 엔딩 · 호감도 ${s.affection} · 실력 ${s.skill}`,
    );
  }

  private finish(msg: string): void {
    this.boxEl.hidden = false;
    this.choiceEl.hidden = true;
    this.nameEl.hidden = true;
    this.typer.run(`— ${msg}`);
  }
}

function describe(line: Line): string {
  return `${line.t} ${'id' in line ? line.id : ''}`;
}

/** 그 씬이 스스로 배경을 거는가 — 아니면 캠퍼스 안(타일맵 자리)입니다 */
function hasBg(scene: Scene): boolean {
  return scene.lines.some((l) => l.t === 'bg');
}

/** 그 씬이 사람을 세우는가 — 세운다면 지금 지울 이유가 없습니다 */
function hasChar(scene: Scene): boolean {
  return scene.lines.some((l) => l.t === 'char');
}
