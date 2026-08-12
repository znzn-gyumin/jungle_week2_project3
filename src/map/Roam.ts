/**
 * 자유 이동 — VN 재생기와 Phaser 맵 사이의 다리.
 *
 * 정본: docs/TECH_DESIGN.md 3-1 `@freeroam`
 *
 * `limit` 만큼 대화하면 `after` 로 빠집니다. **이동 자체는 제한하지 않고
 * 대화 횟수만 셉니다.** 히로인과 대화하면 호감도 +6 이 자동으로 붙습니다.
 */
import Phaser from "phaser";

import type { TimeOfDay } from "../config/lighting";
import {
  HEROINE_GENDER,
  type FreeroamNpc,
  type GameState,
  type Line,
} from "../core/types";
import { CampusScene, type MiniData } from "./CampusScene";
import { HEROINE_BY_NAME, MAP_NAME, PLAYER_THEME, label, themeOf } from "../core/types";
import { MAP_DESIGN, scoutName } from "./sprites";

type Block = Extract<Line, { t: "freeroam" }>;

/** 자유 이동은 셋뿐입니다 — D1 16:30 낮 · D5 23:00 밤 · D8 저녁 (lighting.ts) */
const TIME: Record<string, TimeOfDay> = {
  prologue: "day",
  midproject: "night",
  finalprep: "evening",
};

export class Roam {
  private game: Phaser.Game | null = null;

  /**
   * **매번 새로 찾습니다.** `scene.start()` 직후에는 아직 부팅이 안 끝나
   * `getScene` 이 null 을 돌려줍니다. 그걸 붙들고 있으면 대화가 끝난 뒤
   * `resume()` 이 조용히 아무것도 안 해서 맵이 멈춘 채로 남습니다.
   */
  private get scene(): CampusScene | null {
    return (this.game?.scene.getScene("campus") as CampusScene | null) ?? null;
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
  /** 몇 번 말을 걸었는지 — 튜토리얼이 「한 번 더」 까지 봅니다 */
  private talks = 0;
  /** 그중 다시 건 횟수 — 마지막 단계가 이것만 봅니다 */
  private retalks = 0;
  /** 튜토리얼 — 엔터로 화면이 넘어갈 때 같이 걷습니다 */
  private tutorialEl: HTMLElement | null = null;
  /** 넘어갈 수 있을 때 화면 위에 뜨는 한 줄 */
  private goEl!: HTMLElement;
  /** 튜토리얼과 진행 안내를 담는 화면 위 세로줄 */
  private topEl!: HTMLElement;
  /** 오른쪽 위 장소 이름 */
  private whereEl!: HTMLElement;
  /** 방금 배운 것 한 줄 */
  private learned = "";
  private me = { x: 0, y: 0 };

  start(): void {
    const npcs = this.usable();
    this.host.hidden = false;
    // 미니맵과 안내를 한 카드에 담습니다 — 겹치지 않게 세로로 쌓습니다
    const hud = document.createElement("div");
    hud.className = "roam-hud";
    this.miniEl = document.createElement("canvas");
    this.miniEl.className = "roam-mini";
    this.guideEl = document.createElement("div");
    this.guideEl.className = "roam-guide";
    // 장소 이름은 미니맵 **바로 위**, 같은 상자 안입니다 — 따로 떼어
    // 놓으면 지금 보고 있는 지도가 어디인지 눈으로 안 이어집니다.
    this.whereEl = document.createElement("p");
    this.whereEl.className = "roam-where";
    hud.append(this.whereEl, this.miniEl, this.guideEl);
    // 화면 위 가운데 한 세로줄. **맵 위에 뜨는 겹입니다** — 흐름에 두면
    // 캔버스를 아래로 밀어 맵이 잘립니다. 튜토리얼이 있으면 그 아래에
    // 안내가 붙고, 튜토리얼이 걷히면 안내가 그 자리로 올라옵니다.
    this.topEl = document.createElement("div");
    this.topEl.className = "roam-top";
    this.goEl = document.createElement("p");
    this.goEl.className = "roam-go";
    // 맵의 머리 위 표시와 같은 느낌표를 양옆에 답니다
    this.goEl.innerHTML =
      '<i>!</i>&nbsp; ENTER를 눌러 스토리를 진행하세요 &nbsp;<i>!</i>';
    this.goEl.hidden = true;
    this.topEl.append(this.goEl);
    this.host.append(hud, this.topEl);

    // 처음 걷는 자리에서 조작을 한 번 알려줍니다. 아무 키나 누르면 닫힙니다.
    if (this.block.id === "prologue") this.showTutorial();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      backgroundColor: "#0b0c17",
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
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      scene: CampusScene,
    });
    this.game.scene.start("campus", {
      map: this.block.spawn.map,
      x: this.block.spawn.x,
      y: this.block.spawn.y,
      npcs,
      triggers: this.block.triggers,
      gender: this.state.playerGender,
      time: TIME[this.block.id] ?? "day",
      onTalk: (n: FreeroamNpc) => this.talk(n),
      onTrigger: (t: string) => this.trigger(t),
    });
    window.addEventListener("keydown", this.onKey);
    setTimeout(() => {
      this.updateGuide();
      this.scene?.bindMini(
        (d) => {
          this.mini = d;
          this.drawMini();
          // 계단을 타면 여기로 새 자료가 옵니다 — 장소 이름도 같이 바꿉니다
          this.updateGuide();
        },
        (x, y) => {
          this.me = { x, y };
          this.drawMini();
          // **여기서도 봅니다.** 미니맵 자료만 보고 갱신했더니 계단을
          // 타도 이름이 그대로였습니다 — 그 콜백이 항상 오지는 않습니다.
          const here = this.scene?.mapId;
          if (here) this.whereEl.textContent = MAP_NAME[here] ?? "";
        },
      );
    }, 300);
  }

  /**
   * 배치되는 3인은 `playerGender` 의 **반대 성별**입니다.
   * 4조 대표는 반대로 주인공과 동성이라 이름이 갈립니다 (CHARACTERS 4절).
   */
  private usable(): FreeroamNpc[] {
    return this.cast().filter((n) => !this.met.includes(n.who));
  }

  /**
   * 이 회차에 **실제로 배치되는 사람들**. 히로인 셋은 `playerGender` 의
   * 반대 성별이고, 4조 대표는 반대로 주인공과 동성이라 이름이 갈립니다
   * (CHARACTERS 4절). 안 나오는 인물은 여기서 빠집니다.
   */
  private cast(): FreeroamNpc[] {
    const scout = scoutName(this.state.playerGender);
    return this.block.npcs
      .filter(
        (n) =>
          !n.heroine || HEROINE_GENDER[n.heroine] !== this.state.playerGender,
      )
      .map((n) => (n.who === "태윤" ? { ...n, who: scout } : n));
  }

  private talk(n: FreeroamNpc): void {
    this.talks++;
    // 이미 만났거나 **할 이야기를 다 했으면** 한 마디만 하고 횟수를 안 씁니다.
    // 다음 장면으로 넘어가기 전까지는 누구에게든 몇 번이든 걸 수 있습니다.
    const met = this.met.includes(n.who === "태연" ? "태윤" : n.who);
    if (met || this.left <= 0) {
      this.retalks++;
      this.scene?.setPaused(true);
      this.onTalk(met && n.target ? n.target : this.idleScene(n));
      return;
    }
    this.left--;
    this.met.push(n.who === "태연" ? "태윤" : n.who);
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
    if (e.key !== "Enter") return;
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
    if (id) {
      // **같은 사람에게 다시 걸면 다른 말이 나옵니다.** 히로인 여섯은
      // 상황마다 세 마디를 준비해 뒀고, 건 횟수로 돌려 씁니다.
      const turn = ['', '_b', '_c'][this.retalks % 3];
      return `idle_${id}_${this.block.id}${turn}`;
    }
    // 서브 인물은 다섯씩 돌립니다 — 셋으로는 금방 같은 말이 돌아옵니다
    const turn = ["", "_b", "_c", "_d", "_e"][this.retalks % 5];
    if (n.who === "명진혁") return `idle_coach_${this.block.id}${turn}`;
    if (n.who === "조민") return `idle_jomin_${this.block.id}${turn}`;
    // 4조 대표는 이름이 갈리지만 대사는 한 벌만 씁니다
    if (n.who === "태윤" || n.who === "태연") {
      return `idle_scout_${this.block.id}${turn}`;
    }
    // 이름이 없는 사람 — 아무에게나 걸어도 어색하지 않은 공용 대사
    return `idle_team_${this.block.id}`;
  }

  /**
   * 프롤로그 첫 자유 이동에서 한 번만.
   *
   * **읽고 닫는 창이 아닙니다.** 하나 시키고 → 해내면 그게 무슨 뜻이었는지
   * 알려주는 식으로 조작과 규칙을 같이 익힙니다. 게임을 막지 않으므로 그냥
   * 돌아다녀도 진행되고, **엔터로 화면이 넘어갈 때까지** 남아 있습니다.
   */
  private showTutorial(): void {
    const STEPS = [
      {
        key: "← → ↑ ↓",
        ask: "복도를 걸어 보세요",
        tip: "네 방향으로 움직입니다. 벽과 책상은 못 지나갑니다.",
        got: "앞으로 12일. 여기서 마주치는 사람이 그대로 이야기가 됩니다.",
      },
      {
        key: "Shift + 방향키",
        ask: "누른 채로 뛰어 보세요",
        tip: "누르고 있는 동안만 1.4배로 빨라집니다.",
        got: "정글은 넓습니다. 4층에서 지하 편의점까지는 뛰는 편이 낫습니다.",
      },
      {
        key: "머리 위 !",
        ask: "! 가 뜬 사람 곁으로 가 보세요",
        tip: "가까워지면 머리 위 표시가 「스페이스」 로 바뀝니다.",
        got: "! 는 아직 말 안 걸어 본 사람. 오른쪽 위 미니맵에도 같은 색으로 뜹니다.",
      },
      {
        key: "Space",
        ask: "말을 걸어 보세요",
        tip: "대사를 넘길 때도 같은 키입니다. 마우스 클릭도 됩니다.",
        got: "선택지가 나오면 고른 대로 호감이 움직입니다. 무를 수 없습니다.",
      },
      {
        key: "한 번 더",
        ask: "이미 만난 사람에게 다시 말을 걸어 보세요",
        tip: "만난 사람은 !가 동그라미로 바뀝니다. 몇 번이든 걸립니다.",
        got: "다시 거는 말은 그냥 한마디입니다. 이야기를 안 바꾸니 편하게 걸어도 됩니다.",
      },
      {
        key: "Enter",
        ask: "할 일을 마쳤으면 엔터로 다음 장면",
        tip: "왼쪽 위 안내가 「이제 진행할 수 있어요」 로 바뀌면 눌러도 됩니다.",
        got: "",
      },
    ];
    const el = document.createElement("div");
    el.className = "roam-tutorial";
    this.tutorialEl = el;
    this.topEl.prepend(el);

    // **순서를 안 따집니다.** 해낸 것부터 하나씩 체크되고, 지금 볼
    // 설명은 아직 안 한 것 중 첫 번째를 보여줍니다.
    const done = STEPS.map(() => false);
    let from: { x: number; y: number } | null = null;
    let ranWhile = false;
    const onShift = (e: KeyboardEvent): void => {
      if (e.shiftKey) ranWhile = true;
    };
    window.addEventListener("keydown", onShift);

    const paint = (): void => {
      const cnt = done.filter(Boolean).length;
      const next = done.indexOf(false);
      const now = STEPS[next < 0 ? STEPS.length - 1 : next];
      el.innerHTML = `
        <p class="roam-tutorial__title">조작 익히기 ${cnt} / ${STEPS.length}</p>
        <ol class="roam-tutorial__steps">${STEPS.map(
          (
            s2,
            i,
          ) => `<li class="${done[i] ? "is-done" : i === next ? "is-now" : ""}">
              <b>${s2.key}</b><span>${s2.ask}</span></li>`,
        ).join("")}</ol>
        <p class="roam-tutorial__tip">${now.tip}</p>
        ${this.learned ? `<p class="roam-tutorial__got">${this.learned}</p>` : ""}`;
    };
    paint();

    const tick = window.setInterval(() => {
      const sc = this.scene;
      if (!sc) return;
      const at = sc.tile;
      from ??= at;
      const moved = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
      // 마지막 칸(엔터)은 화면이 넘어가면서 끝나므로 여기서 안 봅니다
      const met = [
        moved >= 2,
        ranWhile && moved >= 3,
        sc.nearWho !== null,
        this.talks >= 1,
        this.retalks >= 1,
        false,
      ];
      let changed = false;
      for (let i = 0; i < done.length; i++) {
        if (done[i] || !met[i]) continue;
        done[i] = true;
        this.learned = STEPS[i].got;
        changed = true;
      }
      if (!changed) return;
      paint();
      if (done.slice(0, -1).every(Boolean)) {
        window.clearInterval(tick);
        window.removeEventListener("keydown", onShift);
      }
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
    const g = el.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#fff6f9";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e3cdd6";
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        if (d.blocked[y * d.w + x])
          g.fillRect(x * s, y * s, Math.ceil(s), Math.ceil(s));
      }
    }
    g.fillStyle = "#2a2632";
    for (const p of d.stairs)
      g.fillRect(p.x * s - 1, p.y * s - 1, s + 2, s + 2);
    g.font = `bold ${Math.max(11, s * 2.4)}px sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // 사람마다 **자기** 테마 컬러입니다 — 말하는 사람 색이 아닙니다.
    // 아직 안 만난 사람은 `!`, 이미 만난 사람은 속 빈 동그라미입니다.
    for (const n of d.npcs) {
      if (n.met) {
        // 느낌표와 같은 방식 — 흰 테두리를 먼저 두르고 테마색으로 채웁니다
        g.beginPath();
        g.arc(n.x * s, n.y * s, 4.2, 0, Math.PI * 2);
        g.lineWidth = 3;
        g.strokeStyle = "#ffffff";
        g.stroke();
        g.fillStyle = n.theme;
        g.fill();
        continue;
      }
      g.lineWidth = 3;
      g.strokeStyle = "#ffffff";
      g.strokeText("!", n.x * s, n.y * s);
      g.fillStyle = n.theme;
      g.fillText("!", n.x * s, n.y * s);
    }
    // 나는 흰 테두리를 두른 검은 동그라미 — 계단은 네모라 모양으로 갈립니다
    g.beginPath();
    g.arc(this.me.x * s, this.me.y * s, 4.4, 0, Math.PI * 2);
    g.fillStyle = "#ffffff";
    g.fill();
    g.beginPath();
    g.arc(this.me.x * s, this.me.y * s, 3.2, 0, Math.PI * 2);
    g.fillStyle = PLAYER_THEME;
    g.fill();
  }

  /** 남은 목표를 맵 위에 적어 둡니다 */
  updateGuide(): void {
    if (!this.guideEl) return;
    const rest = this.usable();
    // **만난 사람도 목록에 남깁니다.** 사라지면 이 맵에 누가 있었는지
    // 알 수 없게 되고, 다시 말을 걸 수 있다는 것도 안 보입니다.
    // **지금 층에 있는 사람만.** 다른 층 사람까지 적으면 이 목록을 보고
    // 찾아다닐 수가 없습니다.
    const here = this.scene?.mapId;
    const left = this.cast()
      .filter((n) => !here || n.map === here)
      .map((n) => {
        return {
          who: label(n.who),
          color: themeOf(n.who),
          met: !rest.some((r) => r.who === n.who),
        };
      });
    const done = this.left <= 0 || !rest.length;
    // 넘어갈 수 있게 되면 화면 위에 한 줄 띄웁니다 — 안내를 안 보고
    // 걷는 사람이 여기서 멈춰 있는 일이 잦습니다.
    //
    // **튜토리얼이 떠 있는 동안은 안 띄웁니다.** 마지막 칸이 이미
    // 「Enter — 다음 장면」 이라 같은 말이 두 줄로 겹칩니다.
    this.goEl.hidden = !done || Boolean(this.tutorialEl);
    if (here) this.whereEl.textContent = MAP_NAME[here] ?? "";
    this.guideEl.innerHTML = `
      <p class="roam-guide__goal">${
        done
          ? "이제 진행할 수 있어요"
          : `<b>${this.left}명</b>에게 더 말을 걸어요`
      }</p>
      <p class="roam-guide__who">${left
        .map(
          (w) =>
            `<span class="${w.met ? "is-met" : ""}" style="color:${w.color};border-color:${w.color}">${w.who}</span>`,
        )
        .join("")}</p>
      <p class="roam-guide__keys">${
        done
          ? "<b>엔터</b> 로 다음으로 · 더 둘러봐도 됩니다"
          : "방향키 이동 · <b>시프트</b> 뛰기 · <b>스페이스</b> 말 걸기"
      }</p>`;
  }

  private finish(): void {
    window.removeEventListener("keydown", this.onKey);
    this.tutorialEl?.remove();
    this.tutorialEl = null;
    this.topEl.remove();
    const after = this.block.after;
    this.destroy();
    this.onDone(after);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKey);
    this.game?.destroy(true);
    this.game = null;
    this.guideEl = null;
    this.miniEl = null;
    this.mini = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }
}
