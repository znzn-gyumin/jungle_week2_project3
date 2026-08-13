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
import { FACE_FILE, FRIEND_NAME, HEROINE_BY_NAME, HEROINE_GENDER, NAME_BY_HEROINE, themeOf, label } from '../core/types';
import type { ChoiceOption, GameState, Line, Scene, ScriptData } from '../core/types';
import type { TimeOfDay } from '../config/lighting';
import { BAD_ENDING, claimEnding } from '../core/gallery';
import { mountMenu } from '../ui/menu';
import { Backdrop } from '../map/Backdrop';
import { Roam } from '../map/Roam';
import { Stage, outfitOf, shotsOf, warm } from './Stage';
import { play as playBgm } from '../audio/bgm';
import { play as sfx, preload as preloadSfx } from '../audio/sfx';
import { Typewriter } from './Typewriter';

/**
 * CG 컷인가 — **도트맵을 걷어내고 화면을 통째로 갈아 끼우는 씬**입니다.
 * 배경 · 스틸 · 반신뿐 아니라 `@map`(장소 사진)도 여기 듭니다.
 *
 * 대화창 규격(`setMode`)과 장면 전환 암전(`wipe`)이 같은 기준을 봅니다.
 * 지시어가 하나도 없는 씬(`idle_*` · 잡담)만 도트맵 위에 그대로 얹힙니다.
 */
function isCine(sc?: Scene): boolean {
  return !!sc?.lines.some(
    (l) => l.t === 'bg' || l.t === 'cg' || l.t === 'char' || l.t === 'map',
  );
}

/**
 * 마지막 줄을 읽고 **화면이 스스로 덮이기까지** 두는 한 박자.
 *
 * 엔딩 스틸은 씬 첫 줄부터 떠 있으므로 여기서 오래 붙들 이유가 없습니다.
 * 다만 대사창이 사라지는 것과 화면이 검어지는 것이 같은 순간이면 둘이
 * 한 동작으로 뭉쳐 보입니다 — 대사가 끝났다는 것을 먼저 알아채고 나서
 * 화면이 닫혀야 순서가 읽힙니다.
 */
const FIN_HOLD = 1400;

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
  /**
   * `@time` 이 못 박은 시각. **없으면 곡이 대신 말합니다.**
   * 씬이 바뀌면 지웁니다 — 안 지우면 앞 씬의 새벽이 다음 낮 씬까지 번집니다.
   */
  private clock: TimeOfDay | null = null;
  private atMap = '';
  private lastFace = '기본';
  /** 키보드로 고르는 중인 선택지 */
  private veilEl!: HTMLElement;
  /** 마지막 장 — 검게 덮고 한 줄만 남깁니다 */
  private finEl!: HTMLElement;
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
        <div class="vn__fin" id="vn-fin" hidden><p id="vn-fin-say"></p></div>
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
    this.finEl = root.querySelector('#vn-fin')!;
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

    // 설정(톱니바퀴). **무대 안에 답니다** — 무대 밖은 검은 레터박스라,
    // 바깥에 두면 게임 화면을 벗어난 자리에 버튼이 떠 있게 됩니다.
    // `.vn` 의 `overflow: hidden` 이 알아서 안쪽으로 가둡니다.
    mountMenu(root.querySelector('.vn')!, () => this.state);
    // **먼저 읽어 둡니다.** 첫 대사에서 소리가 한 박자 늦게 나면 안 눌린
    // 줄 알고 한 번 더 누르게 됩니다.
    preloadSfx('ui_tick', 'ui_move', 'ui_select', 'choice_show', 'transition');

    this.boxEl.addEventListener('click', () => this.advance());
    // 마지막 장에는 대사창이 없습니다 — 검은 화면 아무 데나 눌러도 됩니다
    this.finEl.addEventListener('click', () => this.advance());
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
    this.warmScene(this.scene);
    // 이어하기면 커서 앞의 무대 지시어를 먼저 다시 겁니다 (새 판이면 할 일 없음)
    this.replay();
    this.step();
  }

  /** 클릭·스페이스 — 타자 중이면 완성, 아니면 다음 줄 */
  private advance(): void {
    // 회차의 끝 — 스틸 → 검은 화면 → 처음으로
    if (this.end === 3) return this.toTitle();
    if (this.end === 2) return; // 덮는 중에는 안 받습니다
    if (this.end === 1) return this.curtain();
    if (!this.choiceEl.hidden) return;
    // 매 줄 나는 소리라 가장 작고 짧습니다 (audio/sfx.ts)
    sfx('ui_tick');
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
      // **지금 읽는 줄의 번호**입니다 — `idx` 는 곧 다음으로 넘어갑니다
      const at = this.idx;
      const line = lines[this.idx++];
      /**
       * **커서는 「지금 보고 있는 줄」을 가리킵니다.**
       *
       * 예전에는 이미 한 칸 넘어간 `idx` 를 적었습니다. 그래서 불러오면
       * 늘 **한 줄 뒤부터** 시작했고, 선택지에서 저장하면 그 선택지가
       * 통째로 건너뛰어져 「무언가 고른 상태」로 이어졌습니다.
       *
       * **자유 이동 중에는 아예 안 건드립니다.** 맵에서 말을 건 대화 씬
       * 안쪽을 가리키면, 불러왔을 때 자유 이동이 없는 채로 그 대화만
       * 떠 있고 끝의 `-> back` 이 돌아갈 데를 못 찾아 멈춥니다. 그때의
       * 이어할 자리는 언제나 자유 이동 그 자체입니다.
       */
      if (!this.roam) this.state.cursor = { sceneId: this.scene, lineIndex: at };

      switch (line.t) {
        case 'say':
        case 'narr': {
          if (!testCond(line.cond, this.state)) continue;
          const who = line.t === 'say' ? this.whoName(line.who) : '';
          this.nameEl.textContent = who === ME ? ME : label(who);
          this.nameEl.hidden = !who;
          this.boxEl.hidden = false;
          this.textEl.classList.toggle('vn__text--narr', line.t === 'narr');
          // **색은 지금 말하는 사람의 것입니다 — 맵 대화든 CG 대화든.**
          // 사람이 말하면 그 사람 테마색, 내레이션이면 내레이션 색으로
          // 되돌립니다. 예전에는 내레이션에서 색을 안 건드려서 앞사람
          // 색이 그대로 남았고, 그러면 누가 말하는지가 색으로 안 읽힙니다.
          // `themeOf(null)` 이 곧 내레이션 색입니다 (types.ts SUB_THEME.무명).
          this.setTheme(line.t === 'say' ? who : null);
          // 명장면에서는 **말하는 사람만** 반신이 선다
          if (this.cinematic) {
            this.stage.speaker(line.t === 'say' ? who : null);
            if (line.t === 'say') this.stage.setFace(who, line.face);
          }
          this.setAvatar(
            line.t === 'say' && !this.cinematic ? who : null,
            line.t === 'say' ? line.face : undefined,
          );
          if (line.t === 'say') this.fx(line.face);
          const said = substitute(line.text, this.state);
          // **대사는 제자리에서 그냥 바뀝니다.** 예전에는 줄마다 아래에서
          // 10px 올라오는 연출을 걸었는데, 넘길 때마다 글이 튀어서 읽는
          // 흐름이 끊겼습니다. 글자는 타자 효과로 이미 차오릅니다.
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
        // 무대를 세우는 지시어는 한 군데서 봅니다 — 이어하기가 같은
        // 코드로 다시 세워야 하기 때문입니다 (`replay`)
        case 'bg':
        case 'map':
        case 'cg':
        case 'char':
        case 'charOut':
        case 'time':
          this.applyStage(line);
          continue;
        default:
          this.applyStage(line);
          this.stageEl.dataset.note = describe(line);
          continue;
      }
    }
  }

  /**
   * **무대를 세우는 지시어.** 배경 · 장소 사진 · 스틸 · 반신 · 곡.
   *
   * 재생(`step`)과 **이어하기 되감기(`replay`)가 같은 코드를 씁니다.**
   * 두 벌로 두면 한쪽만 고쳐져서, 이어하기 했을 때만 배경이 빠지는 식으로
   * 어긋납니다 — 실제로 그렇게 어긋나 있었습니다.
   */
  private applyStage(line: Line): void {
    switch (line.t) {
      case 'bgm':
        this.bgm = line.id;
        playBgm(line.id);
        // **곡이 시간대를 대신합니다.** 사진 배경이 이미 깔려 있으면
        // 색조를 따라잡습니다 — 대본이 `@map` 다음 줄에서 곡을 켭니다.
        this.stage.setTone(this.timeNow());
        return;
      case 'time':
        this.clock = line.id;
        this.stage.setTone(line.id);
        // 타일맵 배경도 같이 갑니다 — 도트와 사진이 다른 시각이면 안 됩니다
        if (!this.roam && this.atMap && this.mapEl.hidden === false) {
          this.backdrop.show(this.atMap as never, 0, 0, line.id);
        }
        return;
      case 'bg':
        this.setMode(true);
        // **여기서 캠퍼스를 떠납니다.** `atMap` 을 안 지우면 바로 다음
        // `@char` 가 `setMapPhoto(atMap)` 으로 이 배경을 덮어씁니다 —
        // 외출 세 곳과 귀소 버스가 통째로 커넥트가든 사진에 가려져
        // 있었고, 그 사진이 캠퍼스 벌이라 반신까지 명찰 찬 후드로
        // 서 있었습니다.
        this.atMap = '';
        this.backdrop.hide();
        this.mapEl.hidden = true;
        this.stage.setBackground(line.id);
        return;
      case 'map':
        // **배경은 그 장소의 캠퍼스 사진입니다.** 타일맵을 정지 화면으로
        // 띄우면 검게 뜨는 일이 잦았습니다. 자유 이동에서는 진짜 맵을
        // 걸으므로 사진은 대사 씬에만 씁니다.
        //
        // **그래서 CG 컷 규격입니다.** 대화창 규격은 「도트맵이 보이느냐」로
        // 가릅니다 — 여기서는 도트맵을 끄고 사진을 깔므로 화면에 도트가
        // 하나도 없고, 도트 얼굴 아이콘 자리를 잡아 둘 이유도 없습니다.
        this.setMode(true);
        this.stage.clearChar();
        this.atMap = line.id;
        this.backdrop.hide();
        this.mapEl.hidden = true;
        this.stage.setMapPhoto(line.id, this.timeNow());
        return;
      case 'cg':
        this.setMode(true);
        // **맵을 내려야 스틸이 보입니다.** 맵 캔버스가 무대 뒤가 아니라
        // 위에 깔려 있어, 안 내리면 이벤트 CG 가 통째로 가려집니다.
        this.backdrop.hide();
        this.mapEl.hidden = true;
        this.stage.setCg(line.id);
        return;
      case 'char': {
        // **@char 가 있으면 그 씬은 반신으로 갑니다.**
        const who = this.whoName(line.who);
        if (!who) return;
        this.setMode(true);
        this.backdrop.hide();
        this.mapEl.hidden = true;
        if (this.atMap) this.stage.setMapPhoto(this.atMap, this.timeNow());
        this.stage.setChar(who, line.pos);
        return;
      }
      case 'charOut':
        // 인물이 나가면 다시 맵 위 대화로 돌아옵니다
        this.setMode(false);
        this.stage.clearChar();
        this.stage.clearBackground();
        if (this.roam) this.mapEl.hidden = false;
        if (!this.roam && this.atMap) {
          this.backdrop.show(this.atMap as never, 0, 0, this.timeNow());
        }
        return;
      default:
    }
  }

  /**
   * 지금 몇 시인가. `@time` 이 있으면 그것, 없으면 그 씬이 켠 곡.
   *
   * 곡을 기본값으로 두는 이유는 대부분의 씬에서 그것이 맞기 때문입니다 —
   * 밤 씬에 `night` 를 걸고 낮 씬에 `day` 를 겁니다. 어긋나는 자리는
   * 감정을 따라가는 곡뿐이라(`swell` · `tension`), 거기서만 못을 박습니다.
   */
  private timeNow(): TimeOfDay {
    return this.clock ?? TIME_BY_BGM[this.bgm] ?? 'day';
  }

  /**
   * **이어하기 — 무대를 다시 세웁니다.**
   *
   * 세이브에는 「어느 씬 몇 번째 줄」만 들어 있습니다. 그 줄부터 그냥
   * 재생하면 앞쪽에 있던 `@bg` · `@cg` · `@char` · `@bgm` 을 통째로
   * 건너뛰어서 **배경도 스틸도 곡도 없는 화면**이 뜹니다 — 이어하기가
   * 깨져 보이던 이유입니다.
   *
   * 그래서 커서 앞의 줄을 훑어 **무대 지시어만 다시 겁니다.** 대사는
   * 안 띄우고 선택지도 안 묻습니다 — 이미 지나간 줄이니까요. 깃발과
   * 호감도는 세이브에 값으로 들어 있어 다시 계산하지 않습니다.
   */
  private replay(): void {
    const lines = this.script[this.scene]?.lines ?? [];
    const upto = Math.min(this.idx, lines.length);
    for (let i = 0; i < upto; i++) this.applyStage(lines[i]);
  }

  /**
   * 대사창 왼쪽 얼굴 — **지금 말하는 사람**의 도트 얼굴입니다.
   *
   * `dot/face/` 에는 히로인 여섯만 있습니다. 그 여섯이 아닌 사람이
   * 말하거나 내레이션이면 **아이콘 자리를 통째로 없앱니다** (ui.css
   * `.vn__face[hidden]` 이 `display: none`).
   */
  private setAvatar(who: string | null, face?: string): void {
    const id = who ? HEROINE_BY_NAME[who] : undefined;
    if (!id) {
      // **말하지 않는 사람의 얼굴은 안 남깁니다.** 예전에는 깜빡임을
      // 피하려고 직전 얼굴을 그대로 뒀는데, 그러면 내레이션이나 절친이
      // 말하는 동안에도 엉뚱한 히로인 얼굴이 붙어 있었습니다.
      this.clearAvatar();
      return;
    }
    if (face) this.lastFace = face;
    const file = FACE_FILE[this.lastFace] ?? 'normal';
    const src = `${import.meta.env.BASE_URL}assets/dot/face/${id}_${file}.webp`;
    this.boxEl.classList.add('vn__box--face');

    // **얼굴은 튀지 않습니다.** 예전에는 여기서 「톡」(`fx-pop`) 을 걸었는데,
    // 대사를 넘길 때마다 아이콘이 커졌다 작아져 글보다 먼저 눈에 들어왔습니다.
    // 그림이 그대로면 손도 안 댑니다 — 같은 src 를 다시 넣으면 이미지가
    // 한 박자 깜빡일 수 있습니다.
    if (this.faceEl.getAttribute('src') === src && !this.faceEl.hidden) return;

    this.faceEl.src = src;
    this.faceEl.hidden = false;
  }

  /**
   * 화면 전체의 강조색을 그 인물의 테마 컬러로 바꿉니다.
   * 대사창 테두리·이름·얼굴 링·선택지·미니맵이 한 색을 봅니다.
   */
  private setTheme(who: string | null): void {
    this.root.style.setProperty('--theme', themeOf(who));
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
    sfx('ui_move');
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
    sfx('choice_show');
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
    // 커서는 `step` 이 이미 이 줄에 맞춰 뒀습니다 — 여기서 저장하면
    // 불러왔을 때 이 줄부터 다시 읽혀 맵이 그대로 열립니다.
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
    // **돌아올 때도 암전합니다.** 들어갈 때만 걸려 있어서 CG 컷이 끝나면
    // 도트맵이 툭 튀어나왔습니다 — 들고 나는 문이 한쪽만 있던 셈입니다.
    // 걷다가 말을 건 것뿐인 맵 대화는 들어갈 때와 마찬가지로 그냥
    // 돌아옵니다 (goto 의 같은 판정).
    if (isCine(this.script[this.scene])) this.wipe();
    this.boxEl.hidden = true;
    this.textEl.textContent = '';
    this.nameEl.hidden = true;
    this.setMode(false);
    this.stage.clearChar();
    this.stage.clearBackground();
    this.mapEl.hidden = false;
    this.roam!.resume();
  }

  /**
   * **이 씬이 쓸 그림을 미리 읽습니다.** 씬에 들어가는 순간 부릅니다.
   *
   * 배경 사진은 한 장에 1~3MB 입니다(커넥트가든이 2.7MB). 첫 줄에서
   * 그때부터 읽기 시작하면 몇 줄이 검은 화면 위에서 지나가고, 이벤트
   * 스틸도 한 박자 늦게 뜹니다. 장면 전환 암전이 도는 동안 미리 받아
   * 두면 그 자리에서 바로 뜹니다.
   *
   * 벌을 먼저 정하고 반신을 담습니다 — 그 씬의 배경이 벌을 정하기
   * 때문입니다(`backgrounds.ts`). 표정은 `기본` 만 미리 읽습니다.
   */
  private warmScene(id: string): void {
    const sc = this.script[id];
    if (!sc) return;
    const paths = shotsOf(sc.lines);
    const outfit = outfitOf(sc.lines);
    for (const l of sc.lines) {
      if (l.t !== 'char') continue;
      const who = this.whoName(l.who);
      const key = who ? HEROINE_BY_NAME[who] : undefined;
      if (key) paths.push(`cg/standing/${key}_${outfit}_normal.webp`);
    }
    warm(paths);
  }

  /** 라벨 · 씬 id · `r_*_이름` · `r_*_end_{tier}` · `back` */
  /** 장면이 바뀔 때 한 번 스치는 암전 — 툭 끊기는 느낌을 지웁니다 */
  private wipe(): void {
    sfx('transition');
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
    this.clearAvatar();
    this.setTheme(null);
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
    // **암전은 장면이 바뀔 때만.** 걷다가 말을 건 것뿐이면 화면이
    // 검어질 이유가 없습니다. 다만 맵에서 CG 컷으로 넘어가는 것은
    // 진짜 장면 전환이라 그때는 겁니다.
    if (!this.roam || isCine(this.script[t])) this.wipe();
    if (this.script[t]) {
      this.scene = t;
      this.idx = 0;
      this.clock = null;
      this.warmScene(t);
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

  /**
   * **엔딩 씬은 점프가 없습니다 — 여기가 회차의 끝입니다.**
   *
   * 두 박자로 끊습니다.
   *
   *   ① 마지막 줄을 읽으면 **대사창만 내립니다.** 엔딩 스틸이 화면을
   *      가득 채운 채로 한 박자 멈춥니다.
   *   ② 그다음은 **저절로** 검게 덮이고 한 줄이 남습니다 — 회차가 끝난
   *      자리라 더 넘길 것이 없는데 누르라고 하면 아직 뭔가 있는 줄
   *      압니다. 기다리기 싫으면 눌러서 앞당길 수는 있습니다.
   *   ③ 글이 다 뜬 뒤에 누르면 처음으로 돌아갑니다.
   */
  private theEnd(): void {
    if (this.end) return;
    this.end = 1;
    sfx('ending');
    // **여기서 창이 사라집니다.** 예전에는 「— 끝. r_minah_end_good ·
    // good 엔딩 · 호감도 57 · 실력 0」 을 띄웠습니다. 만들면서 보려고
    // 둔 줄인데 플레이어에게는 엔딩 다음에 오는 마지막 글이 내부
    // 이름과 숫자였습니다.
    this.boxEl.hidden = true;
    this.choiceEl.hidden = true;
    this.textEl.textContent = '';
    window.setTimeout(() => this.curtain(), FIN_HOLD);
  }

  /** ② 검게 덮고 한 줄만 남깁니다 — 타이머가 부르거나, 눌러서 앞당기거나 */
  private curtain(): void {
    // 눌러서 앞당긴 뒤에 타이머가 또 오면 여기서 되돌아갑니다
    if (this.end !== 1) return;
    this.end = 2;
    this.finEl.hidden = false;
    // **레이아웃을 한 번 확정시킨 뒤에 켭니다.** `hidden` 을 떼자마자
    // 같은 프레임에 클래스를 붙이면 브라우저가 처음부터 켜져 있던
    // 것으로 보고 트랜지션을 건너뜁니다 — 암전(`wipe`)과 같은 수법입니다.
    void this.finEl.offsetWidth;
    this.finEl.classList.add('is-on');

    /**
     * 회차 기록에 올리는 이름. **도감에 실리는 것은 루트 엔딩 여섯뿐**
     * 입니다 — Normal 과 솔로는 스틸이 없어서, 넣으면 플레이어가 본 적
     * 없는 그림이 열립니다. 그 둘은 씬 이름으로 횟수만 셉니다.
     */
    const key =
      this.scene === 'e_solo'
        ? BAD_ENDING
        : /_end_(true|good)$/.test(this.scene) && this.state.route
          ? `${this.state.route}_ending`
          : this.scene;

    const say = this.finEl.querySelector<HTMLElement>('#vn-fin-say')!;
    /**
     * **스틸이 없는 엔딩은 따로 말합니다.**
     *
     * Normal 6종과 솔로 — 도감에 자리가 없고 배경도 `night_window` 한 장을
     * 같이 씁니다. 끝내 말을 못 걸고 돌아 나온 결말이라, 수집이나 횟수를
     * 알리는 자리가 아닙니다.
     */
    const lonely = /_end_normal$/.test(this.scene) || this.scene === 'e_solo';
    const LONELY = '오늘도 외로운 하루입니다';
    void claimEnding(key)
      .then((c) => {
        say.textContent = !c.inBook
          ? LONELY
          : c.unlocked
            ? '도감이 해금되었습니다'
            : '클리어 카운트가 올라갑니다';
      })
      .catch(() => {
        // 오프라인이어도 회차는 끝났습니다 — 셈만 못 한 것입니다
        say.textContent = lonely ? LONELY : '클리어 카운트가 올라갑니다';
      })
      .finally(() => {
        /**
         * **글이 다 뜬 뒤에야 받습니다.**
         *
         * 예전에는 여기서 곧바로 열었습니다. 그런데 이 글은 페이드로
         * 들어오므로, 검은 화면을 보고 습관처럼 한 번 더 누르면 **글을
         * 읽기도 전에 처음 화면으로 넘어갔습니다** — 회차의 결과를
         * 알려주는 유일한 자리인데 그걸 못 보고 지나칩니다.
         *
         * 기다리는 시간은 **CSS 에서 읽어 옵니다.** 여기 숫자를 적으면
         * 둘 중 한쪽만 고쳐졌을 때 조용히 어긋납니다.
         */
        const cs = getComputedStyle(say);
        const ms = (v: string): number => (parseFloat(v) || 0) * 1000;
        const wait = ms(cs.transitionDelay) + ms(cs.transitionDuration);
        say.classList.add('is-on');
        window.setTimeout(() => {
          this.end = 3;
        }, wait);
      });
  }

  /**
   * 회차가 닫히는 세 박자. 0 이면 아직 진행 중입니다.
   *
   *   1  마지막 줄까지 읽음 — 스틸만 남아 있습니다
   *   2  검게 덮는 중 — 글이 아직 안 왔습니다
   *   3  글이 떴습니다. 다음 입력이면 처음으로
   */
  private end: 0 | 1 | 2 | 3 = 0;

  /**
   * 처음 화면으로. **판을 새로 엽니다** — 엔딩까지 온 상태에는 반신 ·
   * 스틸 · 곡 · 자유 이동이 겹겹이 쌓여 있어서, 화면만 갈아 끼우면
   * 그중 하나가 다음 회차로 새어 나갑니다.
   */
  private toTitle(): void {
    window.location.reload();
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

/**
 * 그 씬이 스스로 배경을 거는가 — 아니면 도트맵 위 대화입니다.
 *
 * **`@map` 도 셉니다.** 그 자리의 캠퍼스 사진이 곧 배경이라서요. 예전에는
 * `@bg` 만 세는 바람에 `@map` 씬으로 넘어갈 때마다 앞 배경을 먼저 지웠고,
 * 새 사진이 도착할 때까지 **검은 화면이 남았습니다.**
 */
function hasBg(scene: Scene): boolean {
  return scene.lines.some((l) => l.t === 'bg' || l.t === 'map');
}

/** 그 씬이 사람을 세우는가 — 세운다면 지금 지울 이유가 없습니다 */
function hasChar(scene: Scene): boolean {
  return scene.lines.some((l) => l.t === 'char');
}
