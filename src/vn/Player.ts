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
import { FACE_FILE, FRIEND_NAME, HEROINE_BY_NAME, HEROINE_GENDER, NAME_BY_HEROINE, THEME, label } from '../core/types';
import type { ChoiceOption, GameState, Line, Scene, ScriptData } from '../core/types';
import type { TimeOfDay } from '../config/lighting';
import { Backdrop } from '../map/Backdrop';
import { Roam } from '../map/Roam';
import { Stage } from './Stage';
import { play as playBgm } from '../audio/bgm';
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
  private veilEl!: HTMLElement;
  private pick = 0;
  /** 화살표나 마우스를 한 번은 써야 결정할 수 있습니다 */
  private armed = false;
  /**
   * 이 씬이 사진 배경 위에서 도는가.
   *
   * **명장면은 반신 CG 만, 맵 위 대화는 도트 얼굴만** 씁니다 — 둘을 같이
   * 띄우면 같은 사람이 화면에 둘로 보입니다. `@bg`·`@cg` 가 걸린 씬이
   * 명장면이고, `@map` 이나 자유 이동은 일반 씬입니다.
   */
  private cinematic = false;

  /** 얼굴을 내립니다 — 씬이 바뀌거나 명장면으로 갈 때 */
  private clearAvatar(): void {
    this.faceEl.hidden = true;
    this.boxEl.classList.remove('vn__box--face');
  }

  /** 명장면과 맵 대화는 배치가 다릅니다 — CSS 가 클래스로 갈라 봅니다 */
  private setMode(on: boolean): void {
    this.cinematic = on;
    this.boxEl.classList.toggle('vn__box--cine', on);
    if (on) this.clearAvatar();
    // **맵 대화로 돌아가면 반신을 내립니다.** 안 내리면 앞 씬에서 섰던
    // 인물이 화면 바닥에 그대로 남아 도트 얼굴과 같이 뜹니다.
    if (!on) this.stage.clearChar();
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
        <div class="vn__veil" id="vn-veil"></div>
      </div>`;
    this.root = root;
    this.boxEl = root.querySelector('#vn-box')!;
    this.faceEl = root.querySelector('#vn-face')!;
    this.stageEl = root.querySelector('#vn-stage')!;
    this.nameEl = root.querySelector('#vn-name')!;
    this.textEl = root.querySelector('#vn-text')!;
    this.choiceEl = root.querySelector('#vn-choices')!;
    this.veilEl = root.querySelector('#vn-veil')!;
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
        const dir =
          e.key === 'ArrowDown' || e.key === 'ArrowRight'
            ? 1
            : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
              ? -1
              : 0;
        if (dir) {
          e.preventDefault();
          // 처음 누른 화살표는 **첫 칸을 잡는 데** 씁니다. 바로 옮기면
          // 대사를 넘기던 손이 두 번째를 고르고 끝납니다.
          if (this.armed) this.movePick(dir, bs);
          else this.arm(bs);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          // 대사를 넘기던 스페이스가 그대로 결정이 되면 안 됩니다.
          // 화살표나 마우스를 한 번은 써야 결정할 수 있습니다.
          if (!this.armed) this.nudgeChoices();
          else bs[this.pick]?.click();
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
          this.nameEl.textContent = who === ME ? ME : label(who);
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
          const said = substitute(line.text, this.state);
          // 이름과 바는 그대로 두고 **대사만** 올라옵니다. 통째로
          // 움직이면 기준선이 같이 흔들려 자리를 찾는 느낌이 안 납니다.
          this.textEl.classList.remove('is-in');
          void this.textEl.offsetWidth;
          this.textEl.classList.add('is-in');
          this.typer.run(said);
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
          // 맵 위 대화 — 반신은 내리고 도트 얼굴로 갑니다.
          // **배경은 그 장소의 캠퍼스 사진입니다.** 타일맵을 정지 화면으로
          // 띄우면 검게 뜨는 일이 잦았습니다. 자유 이동에서는 진짜 맵을
          // 걸으므로 사진은 대사 씬에만 씁니다.
          this.setMode(false);
          this.stage.clearChar();
          this.atMap = line.id;
          this.backdrop.hide();
          this.mapEl.hidden = true;
          this.stage.setMapPhoto(line.id);
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
          if (line.t === 'bgm') {
            this.bgm = line.id;
            playBgm(line.id);
          }
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
      // **말하던 사람의 얼굴은 그대로 둡니다.** 내레이션마다 껐다 켜면
      // 대사와 내레이션이 오갈 때 얼굴이 매 줄 깜빡입니다. 씬이 바뀌거나
      // 명장면으로 넘어갈 때 clearAvatar 가 내립니다.
      if (!this.faceEl.hidden) return;
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

  /**
   * 표정에 맞는 짧은 이펙트. **매 줄 흔들면 읽기가 힘들어지므로**
   * 놀람·화남에만 진동을 걸고 나머지는 작게 둡니다.
   */
  private fx(face: string | undefined): void {
    const el = this.cinematic
      ? this.stageEl.querySelector<HTMLElement>('.stage__char:not([hidden])')
      : this.faceEl;
    const cls =
      face === '놀람' || face === '화남'
        ? 'fx-shake'
        : face === '기쁨'
          ? 'fx-bob'
          : face === '부끄러움'
            ? 'fx-sway'
            : '';
    for (const c of ['fx-shake', 'fx-bob', 'fx-sway']) el?.classList.remove(c);
    if (cls && el) {
      void el.offsetWidth; // 같은 표정이 이어져도 다시 재생되게 리플로를 한 번
      el.classList.add(cls);
    }
    // 놀람·화남은 대사창도 아주 살짝 밉니다
    this.boxEl.classList.remove('fx-nudge');
    if (cls === 'fx-shake') {
      void this.boxEl.offsetWidth;
      this.boxEl.classList.add('fx-nudge');
    }
  }

  /** `*` 는 현재 루트, `동갑`·`연상`·`연하` 는 이 회차의 그 역할입니다 */
  private whoName(raw: string): string {
    if (raw === '*') return this.state.route ? NAME_BY_HEROINE[this.state.route] : '';
    // 절친은 주인공과 같은 성별이라 회차마다 이름이 갈립니다
    if (raw === '절친') return FRIEND_NAME[this.state.playerGender];
    return roleName(raw, this.state) || raw;
  }

  private movePick(d: number, bs: HTMLButtonElement[]): void {
    this.pick = (this.pick + d + bs.length) % bs.length;
    bs.forEach((b, i) => b.classList.toggle('vn__choice--on', i === this.pick));
  }

  /** 첫 입력 — 첫 칸을 예비 선택으로 잡습니다 */
  private arm(bs: HTMLButtonElement[], at = 0): void {
    this.armed = true;
    this.pick = at;
    bs.forEach((b, i) => b.classList.toggle('vn__choice--on', i === this.pick));
    this.choiceEl.classList.add('is-armed');
  }

  /** 아직 못 고른다는 걸 알립니다 */
  private nudgeChoices(): void {
    this.choiceEl.classList.remove('vn__choices--nudge');
    void this.choiceEl.offsetWidth;
    this.choiceEl.classList.add('vn__choices--nudge');
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
    // 아직 아무것도 안 골라 둡니다 — 화살표나 마우스를 써야 잡힙니다
    this.pick = 0;
    this.armed = false;
    this.choiceEl.classList.remove('is-armed');
    for (const o of usable) {
      const b = document.createElement('button');
      b.className = 'vn__choice';
      b.textContent = substitute(o.text, this.state);
      const at = usable.indexOf(o);
      b.addEventListener('mouseenter', () => {
        const bs = [...this.choiceEl.querySelectorAll<HTMLButtonElement>('.vn__choice')];
        this.arm(bs, at);
      });
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
  /** 장면이 바뀔 때 한 번 스치는 암전 — 툭 끊기는 느낌을 지웁니다 */
  private wipe(): void {
    this.veilEl.classList.remove('is-on');
    void this.veilEl.offsetWidth;
    this.veilEl.classList.add('is-on');
  }

  private goto(target: string): void {
    if (target === 'back') {
      if (!this.roam) return this.finish('돌아갈 자유 이동이 없습니다');
      this.idx = this.lines().length; // 씬 끝으로 — backToRoam 이 받습니다
      return;
    }
    this.wipe();
    this.clearAvatar();
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
