/**
 * jungLover — 진입점
 *
 * 구현 순서: docs/TECH_DESIGN.md 7절
 * 지금은 4번(VN 재생기)까지입니다. 배경·CG(6번)와 Phaser 맵(8번)이 없어서
 * 화면은 대사창뿐이고, 자유 이동은 NPC 목록으로 대신합니다.
 */
import "./boot.css";
import "./vn/ui.css";
import "./ui/shell.css";
import "./ui/gate.css";
import "./ui/book.css";

import script from "virtual:script";
import { newGame } from "./core/state";
import { play as playBgm } from "./audio/bgm";
import { canSignIn } from "./core/auth";
import { mountClickSfx, play as sfx } from "./audio/sfx";
import { mountCursor } from "./ui/cursor";
import { configNotice, requireLogin } from "./ui/login";
import { openSavePicker } from "./ui/savepicker";
import { Player } from "./vn/Player";
import { shotsOf, warm } from "./vn/Stage";

/** `assets/` 아래 파일의 URL. Pages 는 하위 경로에 올라가므로 base 를 붙입니다. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}

/** 파비콘은 여기서 겁니다 — HTML 에 두면 1.3MB 로고가 번들로 끌려 들어갑니다. */
function setFavicon(): void {
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = asset("ui/logo.webp");
  document.head.append(link);
}

/**
 * 시작 화면 세 장.
 *
 *   1. 로고만 — 아무 키나 클릭으로 넘어갑니다
 *   2. 성 · 이름
 *   3. 성별 · 반
 *
 * 한 장에 다 넣으면 서류가 되고, 나눠 놓으면 의식이 됩니다. 성별은 그냥
 * 취향이 아니라 만나는 히로인 셋과 절친이 갈리는 선택이라(TECH_DESIGN
 * 3-1) 마지막 장에서 결과를 보여주고 고르게 합니다.
 */
function titleScreen(app: HTMLElement): void {
  const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  app.style.setProperty("--vn-scale", String(k));
  window.addEventListener("resize", () => {
    const n = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    app.style.setProperty("--vn-scale", String(n));
  });

  app.innerHTML = `
    <main class="boot">
      <div class="boot__hero">
          <img class="boot__hero-img" src="${asset("ui/intro_small.webp")}" alt="jungLover" />
          <img class="boot__hero-img boot__hero-img--glow" src="${asset("ui/intro_small.webp")}" alt="" aria-hidden="true" />
          <img class="boot__hero-img boot__hero-img--sheen" src="${asset("ui/intro_small.webp")}" alt="" aria-hidden="true" />
          <i class="boot__spark" style="--d:0s;   --tx:-30%; --ty:-14%"></i>
          <i class="boot__spark" style="--d:0.7s; --tx: 26%; --ty:-18%"></i>
          <i class="boot__spark" style="--d:1.4s; --tx: 34%; --ty: 12%"></i>
          <i class="boot__spark" style="--d:2.1s; --tx:-24%; --ty: 16%"></i>
          <i class="boot__spark" style="--d:2.8s; --tx:  4%; --ty:-22%"></i>
        </div>
      <div class="boot__flash" id="boot-flash"></div>
      <div class="boot__sky" aria-hidden="true">
        <i class="boot__dust" style="--l:4%; --t:6%; --s:1.0; --d:0.0s"></i>
        <i class="boot__dust" style="--l:12%; --t:9%; --s:0.7; --d:0.37s"></i>
        <i class="boot__dust" style="--l:20%; --t:6%; --s:1.3; --d:0.74s"></i>
        <i class="boot__dust" style="--l:28%; --t:9%; --s:0.85; --d:1.11s"></i>
        <i class="boot__dust" style="--l:36%; --t:6%; --s:1.15; --d:1.48s"></i>
        <i class="boot__dust" style="--l:44%; --t:9%; --s:0.6; --d:1.85s"></i>
        <i class="boot__dust" style="--l:52%; --t:6%; --s:1.45; --d:2.22s"></i>
        <i class="boot__dust" style="--l:60%; --t:9%; --s:0.95; --d:2.59s"></i>
        <i class="boot__dust" style="--l:68%; --t:6%; --s:1.0; --d:2.96s"></i>
        <i class="boot__dust" style="--l:76%; --t:9%; --s:0.7; --d:3.33s"></i>
        <i class="boot__dust" style="--l:84%; --t:6%; --s:1.3; --d:3.7s"></i>
        <i class="boot__dust" style="--l:92%; --t:9%; --s:0.85; --d:4.07s"></i>
        <i class="boot__dust" style="--l:9%; --t:17%; --s:1.15; --d:4.44s"></i>
        <i class="boot__dust" style="--l:17%; --t:20%; --s:0.6; --d:4.81s"></i>
        <i class="boot__dust" style="--l:25%; --t:17%; --s:1.45; --d:5.18s"></i>
        <i class="boot__dust" style="--l:73%; --t:17%; --s:0.95; --d:0.05s"></i>
        <i class="boot__dust" style="--l:81%; --t:20%; --s:1.0; --d:0.42s"></i>
        <i class="boot__dust" style="--l:89%; --t:17%; --s:0.7; --d:0.79s"></i>
        <i class="boot__dust" style="--l:97%; --t:20%; --s:1.3; --d:1.16s"></i>
        <i class="boot__dust" style="--l:4%; --t:28%; --s:0.85; --d:1.53s"></i>
        <i class="boot__dust" style="--l:12%; --t:31%; --s:1.15; --d:1.9s"></i>
        <i class="boot__dust" style="--l:84%; --t:28%; --s:0.6; --d:2.27s"></i>
        <i class="boot__dust" style="--l:92%; --t:31%; --s:1.45; --d:2.64s"></i>
        <i class="boot__dust" style="--l:9%; --t:39%; --s:0.95; --d:3.01s"></i>
        <i class="boot__dust" style="--l:89%; --t:39%; --s:1.0; --d:3.38s"></i>
        <i class="boot__dust" style="--l:97%; --t:42%; --s:0.7; --d:3.75s"></i>
        <i class="boot__dust" style="--l:4%; --t:50%; --s:1.3; --d:4.12s"></i>
        <i class="boot__dust" style="--l:12%; --t:53%; --s:0.85; --d:4.49s"></i>
        <i class="boot__dust" style="--l:92%; --t:53%; --s:1.15; --d:4.86s"></i>
        <i class="boot__dust" style="--l:9%; --t:61%; --s:0.6; --d:5.23s"></i>
        <i class="boot__dust" style="--l:17%; --t:64%; --s:1.45; --d:0.1s"></i>
        <i class="boot__dust" style="--l:89%; --t:61%; --s:0.95; --d:0.47s"></i>
        <i class="boot__dust" style="--l:97%; --t:64%; --s:1.0; --d:0.84s"></i>
        <i class="boot__dust" style="--l:4%; --t:72%; --s:0.7; --d:1.21s"></i>
        <i class="boot__dust" style="--l:12%; --t:75%; --s:1.3; --d:1.58s"></i>
        <i class="boot__dust" style="--l:20%; --t:72%; --s:0.85; --d:1.95s"></i>
        <i class="boot__dust" style="--l:28%; --t:75%; --s:1.15; --d:2.32s"></i>
        <i class="boot__dust" style="--l:76%; --t:75%; --s:0.6; --d:2.69s"></i>
        <i class="boot__dust" style="--l:84%; --t:72%; --s:1.45; --d:3.06s"></i>
        <i class="boot__dust" style="--l:92%; --t:75%; --s:0.95; --d:3.43s"></i>
        <i class="boot__dust" style="--l:9%; --t:83%; --s:1.0; --d:3.8s"></i>
        <i class="boot__dust" style="--l:17%; --t:86%; --s:0.7; --d:4.17s"></i>
        <i class="boot__dust" style="--l:25%; --t:83%; --s:1.3; --d:4.54s"></i>
        <i class="boot__dust" style="--l:33%; --t:86%; --s:0.85; --d:4.91s"></i>
        <i class="boot__dust" style="--l:41%; --t:83%; --s:1.15; --d:5.28s"></i>
        <i class="boot__dust" style="--l:49%; --t:86%; --s:0.6; --d:0.15s"></i>
        <i class="boot__dust" style="--l:57%; --t:83%; --s:1.45; --d:0.52s"></i>
        <i class="boot__dust" style="--l:65%; --t:86%; --s:0.95; --d:0.89s"></i>
        <i class="boot__dust" style="--l:73%; --t:83%; --s:1.0; --d:1.26s"></i>
        <i class="boot__dust" style="--l:81%; --t:86%; --s:0.7; --d:1.63s"></i>
        <i class="boot__dust" style="--l:89%; --t:83%; --s:1.3; --d:2.0s"></i>
        <i class="boot__dust" style="--l:97%; --t:86%; --s:0.85; --d:2.37s"></i>
        <i class="boot__dust" style="--l:4%; --t:94%; --s:1.15; --d:2.74s"></i>
        <i class="boot__dust" style="--l:12%; --t:97%; --s:0.6; --d:3.11s"></i>
        <i class="boot__dust" style="--l:20%; --t:94%; --s:1.45; --d:3.48s"></i>
        <i class="boot__dust" style="--l:28%; --t:97%; --s:0.95; --d:3.85s"></i>
        <i class="boot__dust" style="--l:36%; --t:94%; --s:1.0; --d:4.22s"></i>
        <i class="boot__dust" style="--l:44%; --t:97%; --s:0.7; --d:4.59s"></i>
        <i class="boot__dust" style="--l:52%; --t:94%; --s:1.3; --d:4.96s"></i>
        <i class="boot__dust" style="--l:60%; --t:97%; --s:0.85; --d:5.33s"></i>
        <i class="boot__dust" style="--l:68%; --t:94%; --s:1.15; --d:0.2s"></i>
        <i class="boot__dust" style="--l:76%; --t:97%; --s:0.6; --d:0.57s"></i>
        <i class="boot__dust" style="--l:84%; --t:94%; --s:1.45; --d:0.94s"></i>
        <i class="boot__dust" style="--l:92%; --t:97%; --s:0.95; --d:1.31s"></i>
      </div>

      <section class="boot__act is-on" data-act="0">
        <p class="boot__any">Enter 를 눌러 시작</p>
        <p class="boot__tip">전체화면(F11)으로 플레이하시는 것을 권장합니다.</p>
        <button class="boot__demo" id="boot-demo" type="button">데모로 바로 시작 — 이도윤 · 남자 · 403호</button>
      </section>

      <section class="boot__act" data-act="1">
        <div class="boot__panel">
          <p class="boot__step">1 / 2</p>
          <h2 class="boot__head">이름을 정해 주세요</h2>
          <p class="boot__hint">12일 동안 이 이름으로 불립니다.</p>
          <form class="boot__form" id="boot-name" autocomplete="off">
            <div class="boot__row">
              <label class="boot__field">
                <span>성</span>
                <input name="family" maxlength="2" placeholder="이" required />
              </label>
              <label class="boot__field">
                <span>이름</span>
                <input name="given" maxlength="4" placeholder="도윤" required />
              </label>
            </div>
            <button class="vn__choice boot__go" id="boot-next" type="submit" disabled>다음</button>
            <button class="boot__back" id="boot-back1" type="button">← 뒤로 가기</button>
          </form>
        </div>
      </section>

      <section class="boot__act" data-act="2">
        <div class="boot__panel">
          <p class="boot__step">2 / 2</p>
          <h2 class="boot__head">어느 쪽으로 들어갈까요</h2>
          <form class="boot__form" id="boot-who" autocomplete="off">
            <fieldset class="boot__seg">
              <legend>성별</legend>
              <label><input type="radio" name="gender" value="male" /><span>남자</span></label>
              <label><input type="radio" name="gender" value="female" /><span>여자</span></label>
            </fieldset>
            <fieldset class="boot__seg">
              <legend>반</legend>
              <label><input type="radio" name="room" value="403" /><span>403호</span></label>
              <label><input type="radio" name="room" value="405" /><span>405호</span></label>
            </fieldset>
            <p class="boot__hint" id="boot-cast"></p>
            <button class="vn__choice boot__go" id="boot-start" type="submit" disabled>정글 들어가기</button>
            <button class="boot__back" id="boot-back2" type="button">← 뒤로 가기</button>
          </form>
        </div>
      </section>

    </main>`;

  const acts = [...app.querySelectorAll<HTMLElement>(".boot__act")];
  const flash = app.querySelector<HTMLElement>("#boot-flash")!;
  let act = 0;

  /** 흰 섬광 한 번 치고 장이 바뀝니다 */
  const goTo = (n: number): void => {
    if (n === act) return;
    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.classList.add("is-on");
    acts[act].classList.remove("is-on");
    acts[act].classList.add("is-out");
    act = n;
    setTimeout(() => {
      for (const el of acts) el.classList.remove("is-out");
      acts[act].classList.add("is-on");
      // 라디오는 초점을 주면 값이 잡히므로 글자 칸일 때만 짚어 줍니다
      acts[act].querySelector<HTMLInputElement>('input[type="text"], input:not([type])')?.focus();
    }, 260);
  };

  /**
   * 로고 다음은 **로그인 → 세이브 파일**입니다.
   *
   * 로그인을 맨 앞에 두었더니 게임이 뭔지도 모르는 채로 계정부터 내놓으라는
   * 화면이 떴습니다. 로고를 한 번 보고 엔터를 누른 사람에게 묻는 편이 낫습니다.
   * 이름 정하는 장(1장)은 **빈 칸을 골랐을 때만** 나옵니다.
   */
  let gating = false;
  const gate = async (): Promise<void> => {
    if (gating) return;
    gating = true;
    // 로고에서 로그인으로 — 화면이 통째로 바뀌므로 장면 전환음을 씁니다
    sfx('transition');
    const who = await requireLogin();
    // **ESC 로 물러났으면 로고로 돌아갑니다.** 설정이 아직 없어서 null 인
    // 것과는 다릅니다 — 그때는 로그인을 건너뛰고 그대로 들어갑니다.
    if (!who && canSignIn()) {
      gating = false;
      return;
    }
    openSavePicker({
      onNewGame: () => {
        gating = false;
        goTo(1);
      },
      onLoad: (state) => {
        gating = false;
        enter(state);
      },
      // ESC — 로고 화면으로. 다시 엔터를 누르면 이 흐름이 처음부터 돕니다.
      onBack: () => {
        gating = false;
      },
    });
  };

  /**
   * 뒤로 — **한 칸씩만 물러납니다.** 이름 장에서 물러나면 세이브 파일로,
   * 성별 장에서 물러나면 이름으로 돌아갑니다. ESC 도 같은 자리를 누릅니다.
   */
  const back = (): void => {
    if (act === 2) goTo(1);
    else if (act === 1) {
      goTo(0);
      void gate();
    }
  };
  app.querySelector<HTMLButtonElement>("#boot-back1")!.addEventListener("click", back);
  app.querySelector<HTMLButtonElement>("#boot-back2")!.addEventListener("click", back);

  // 1장 — 엔터 또는 클릭. **아무 키나 받으면 안 됩니다** — 안내대로
  // F11 을 누르는 순간 전체화면이 되면서 이 장이 같이 넘어갑니다.
  const enterLogo = (e: KeyboardEvent): void => {
    // 설정 두 장에서는 ESC 가 뒤로 가기 버튼과 같은 일을 합니다
    if (e.key === "Escape" && act > 0) {
      e.preventDefault();
      back();
      return;
    }
    if (act === 0 && e.key === "Enter") void gate();
  };
  const clickLogo = (e: MouseEvent): void => {
    // 데모 버튼을 누른 클릭까지 받으면 장이 넘어간 뒤에 게임이 시작돼
    // 섬광이 두 번 친다
    if ((e.target as HTMLElement).closest('#boot-demo')) return;
    if (act === 0) void gate();
  };
  window.addEventListener("keydown", enterLogo);
  window.addEventListener("mousedown", clickLogo);

  /**
   * 시작 화면의 감시를 끊습니다 — 게임에 들어가는 순간 `enter` 가 부릅니다.
   * `gating` 도 잠가 둡니다: 이미 열려 있던 세이브 파일 화면의 콜백이
   * 뒤늦게 돌아와도 다시 열리지 않게 하려는 것입니다.
   */
  const stopGate = (): void => {
    window.removeEventListener("keydown", enterLogo);
    window.removeEventListener("mousedown", clickLogo);
    gating = true;
  };

  const nameForm = app.querySelector<HTMLFormElement>("#boot-name")!;
  const whoForm = app.querySelector<HTMLFormElement>("#boot-who")!;
  const cast = app.querySelector<HTMLElement>("#boot-cast")!;
  const field = (f: HTMLFormElement, n: string): string =>
    (f.elements.namedItem(n) as RadioNodeList | HTMLInputElement).value;

  const nextBtn = app.querySelector<HTMLButtonElement>("#boot-next")!;
  const startBtn = app.querySelector<HTMLButtonElement>("#boot-start")!;

  /** 성과 이름을 다 넣어야 넘어갑니다 */
  const checkName = (): void => {
    nextBtn.disabled =
      !field(nameForm, "family").trim() || !field(nameForm, "given").trim();
  };
  nameForm.addEventListener("input", checkName);
  checkName();

  // 성을 치고 스페이스를 누르면 이름칸으로 넘어갑니다. 이름에 공백이
  // 들어갈 일이 없으므로 스페이스를 탭처럼 씁니다.
  const family = nameForm.querySelector<HTMLInputElement>('[name="family"]')!;
  const given = nameForm.querySelector<HTMLInputElement>('[name="given"]')!;
  for (const box of [family, given]) {
    box.addEventListener("keydown", (e) => {
      if (e.key !== " ") return;
      e.preventDefault();
      if (box === family && box.value.trim()) given.focus();
    });
  }

  nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (nextBtn.disabled) return;
    goTo(2);
  });

  /**
   * 고른 성별이 무엇을 바꾸는지 그 자리에서 보여줍니다. 둘 다 골라야
   * 시작 버튼이 열립니다 — 기본값을 박아 두면 안 보고 지나칩니다.
   */
  const sync = (): void => {
    const g = field(whoForm, "gender");
    const room = field(whoForm, "room");
    cast.textContent = !g
      ? "성별을 고르면 만날 사람이 정해집니다."
      : g === "male"
        ? "조원은 민아 · 승희 · 윤정, 룸메는 한지오입니다."
        : "조원은 민규 · 승민 · 윤호, 룸메는 한지아입니다.";
    startBtn.disabled = !g || !room;
  };

  /**
   * 위아래로 성별 ↔ 반을 오갑니다. 브라우저 기본값은 네 방향이 모두
   * **같은 무리 안에서만** 움직여서, 반으로 내려가려면 탭을 눌러야
   * 했습니다. 좌우는 기본대로 두어 그 무리의 값을 고릅니다.
   *
   * 옮길 때는 focus 만 줍니다 — 화살표로 고르면 값이 잡히지만 focus
   * 는 안 잡히므로, 지나가기만 한 무리가 저절로 정해지지 않습니다.
   */
  const rows = ["gender", "room"].map((n) => [
    ...whoForm.querySelectorAll<HTMLInputElement>(`[name="${n}"]`),
  ]);
  whoForm.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    const at = rows.findIndex((r) => r.includes(document.activeElement as HTMLInputElement));
    if (at < 0) return;
    e.preventDefault();
    const next = rows[(at + step + rows.length) % rows.length];
    (next.find((b) => b.checked) ?? next[0]).focus();
  });

  whoForm.addEventListener("change", sync);
  sync();

  /** 막이 다 덮인 뒤에 무대를 갈아 끼웁니다 */
  const enter = (state: ReturnType<typeof newGame>): void => {
    /**
     * **시작 화면의 키·클릭 감시를 걷습니다.**
     *
     * 안 걷으면 게임이 시작된 뒤에도 로고 화면의 규칙이 그대로 살아 있어,
     * 남아 있는 `act` 값에 따라 엉뚱한 일이 벌어집니다.
     *
     *   이어하기로 들어가면 `act` 가 0 인 채로 남습니다. 그러면 화면 아무
     *   데나 누를 때마다 「로고에서 엔터를 눌렀다」로 읽혀 **세이브 파일
     *   화면이 튀어나옵니다** — 톱니바퀴를 눌러도 설정 대신 그게 떴습니다.
     *
     *   새 파일로 들어가면 `act` 가 2 라 클릭은 조용하지만, ESC 가 여전히
     *   「한 장 뒤로」로 읽혀 두 번 누르면 `act` 가 0 이 되고 그때부터
     *   위와 같아집니다.
     *
     * 게임에 들어온 순간 시작 화면은 끝났으므로 여기서 끊어 냅니다.
     */
    stopGate();

    // **첫 배경을 미리 받습니다.** 막이 내려가는 480ms 동안 읽어 두면
    // 첫 줄에서 기다릴 일이 없습니다 — 시작 자리의 항공 사진은 2.7MB 라
    // 그때부터 읽으면 몇 줄이 검은 화면 위에서 지나갑니다.
    warm(shotsOf(script[state.cursor.sceneId]?.lines ?? []));

    const veil = document.createElement("div");
    veil.className = "boot-veil";
    document.body.append(veil);
    setTimeout(() => {
      new Player(app, script, state).start();
      veil.classList.add("is-out");
      setTimeout(() => veil.remove(), 700);
    }, 480);
  };

  // 손볼 때 쓰는 지름길 — 기본값으로 바로 들어갑니다
  app.querySelector<HTMLButtonElement>("#boot-demo")!.addEventListener("click", (e) => {
    e.stopPropagation();
    enter(newGame("male", "이", "도윤", "403"));
  });

  whoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (startBtn.disabled) return;
    const state = newGame(
      field(whoForm, "gender") as "male" | "female",
      field(nameForm, "family").trim(),
      field(nameForm, "given").trim(),
      field(whoForm, "room") as "403" | "405",
    );
    enter(state);
  });
}

/**
 * **로그인이 타이틀보다 앞입니다** (GAME_DESIGN 2-5 · TECH_DESIGN 4-1).
 * 게스트 플레이는 없습니다 — 진행 상황이 계정에 붙어야 기기 간 이어하기가
 * 되고, 방명록 글에 실제 계정이 실립니다.
 *
 * 다만 **Firebase 설정이 아직 없으면 그냥 통과**시키고 타이틀 위에 무엇을
 * 해야 하는지 적어 둡니다. 프로젝트를 만들기 전에도 시나리오와 맵은 손볼
 * 수 있어야 하기 때문입니다. 값이 채워지는 순간 이 뒷문은 닫힙니다.
 */
function boot(): void {
  setFavicon();
  mountCursor();
  // 버튼 소리는 문서 한 곳에서 받습니다 (audio/sfx.ts)
  mountClickSfx();
  // 첫 화면 곡. 브라우저가 막으면 첫 입력 때 알아서 다시 겁니다.
  playBgm('title');
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app 이 없습니다");

  titleScreen(app);
  if (!canSignIn()) app.querySelector('.boot')?.append(configNotice());
}

boot();
