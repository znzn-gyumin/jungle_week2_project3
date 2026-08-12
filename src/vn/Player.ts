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
import { substitute } from '../core/tokens';
import { HEROINE_GENDER, NAME_BY_HEROINE } from '../core/types';
import type { ChoiceOption, GameState, Line, Scene, ScriptData } from '../core/types';
import { Roam } from '../map/Roam';
import { Stage } from './Stage';
import { Typewriter } from './Typewriter';

/** 주인공 이름표는 언제나 `나` 입니다 (WORLD_BIBLE 11) */
const ME = '나';

export class Player {
  private state: GameState;
  private script: ScriptData;
  private scene: string;
  private idx = 0;
  private typer: Typewriter;

  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private choiceEl: HTMLElement;
  private stageEl: HTMLElement;
  private stage: Stage;
  private mapEl: HTMLElement;
  private roam: Roam | null = null;

  constructor(root: HTMLElement, script: ScriptData, state: GameState) {
    this.script = script;
    this.state = state;
    this.scene = state.cursor.sceneId;
    this.idx = state.cursor.lineIndex;

    root.innerHTML = `
      <div class="vn">
        <div class="vn__stage" id="vn-stage"></div>
        <div class="vn__map" id="vn-map" hidden></div>
        <div class="vn__box" id="vn-box">
          <p class="vn__name" id="vn-name"></p>
          <p class="vn__text" id="vn-text"></p>
        </div>
        <div class="vn__choices" id="vn-choices" hidden></div>
      </div>`;
    this.stageEl = root.querySelector('#vn-stage')!;
    this.nameEl = root.querySelector('#vn-name')!;
    this.textEl = root.querySelector('#vn-text')!;
    this.choiceEl = root.querySelector('#vn-choices')!;
    this.mapEl = root.querySelector('#vn-map')!;
    this.stage = new Stage(this.stageEl);
    this.typer = new Typewriter(this.textEl);

    root.querySelector<HTMLElement>('#vn-box')!.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', (e) => {
      // 자유 이동 중에는 맵이 키를 갖습니다 — 스페이스가 「말 걸기」와 겹칩니다
      if (this.roam) return;
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
          const who = line.t === 'say' ? line.who : '';
          this.nameEl.textContent = who === ME ? ME : who;
          this.nameEl.hidden = !who;
          this.textEl.classList.toggle('vn__text--narr', line.t === 'narr');
          if (line.t === 'say') this.stage.setFace(line.who, line.face);
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
          this.stage.setBackground(line.id);
          continue;
        case 'cg':
          this.stage.setCg(line.id);
          continue;
        case 'char': {
          // `*` 는 현재 루트의 히로인 — 공용 씬은 이름을 적을 수 없습니다
          const who = line.who === '*' ? (this.state.route ? NAME_BY_HEROINE[this.state.route] : '') : line.who;
          if (who) this.stage.setChar(who, line.pos);
          continue;
        }
        case 'charOut':
          this.stage.clearChar();
          continue;
        default:
          // bgm · se — 오디오는 아직 없습니다 (BGM 8곡 미확보)
          this.stageEl.dataset.note = describe(line);
          continue;
      }
    }
  }

  private showChoices(options: ChoiceOption[]): void {
    const usable = options.filter(
      (o) =>
        testCond(o.cond, this.state) &&
        (!o.heroine || HEROINE_GENDER[o.heroine] !== this.state.playerGender),
    );
    this.choiceEl.hidden = false;
    this.choiceEl.innerHTML = '';
    for (const o of usable) {
      const b = document.createElement('button');
      b.className = 'vn__choice';
      b.textContent = substitute(o.text, this.state);
      b.addEventListener('click', () => {
        this.choiceEl.hidden = true;
        applyEffects(this.state, o.effects);
        this.goto(o.target);
        this.step();
      });
      this.choiceEl.append(b);
    }
  }

  /** `@freeroam` — Phaser 맵으로 제어를 넘깁니다 */
  private enterRoam(line: Extract<Line, { t: 'freeroam' }>): void {
    this.textEl.textContent = '';
    this.nameEl.hidden = true;
    this.stage.clearChar();
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
    this.textEl.textContent = '';
    this.nameEl.hidden = true;
    this.stage.clearChar();
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
      // 씬이 바뀌면 스틸이 내려가고 배경도 그 씬이 다시 정합니다
      this.stage.setCg('none');
      if (!hasBg(this.script[t])) this.stage.clearBackground();
      return;
    }
    this.finish(`점프 대상이 없습니다: ${target} → ${t}`);
  }

  /** 엔딩 씬은 점프가 없습니다 — 여기가 회차의 끝입니다 */
  private theEnd(): void {
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
