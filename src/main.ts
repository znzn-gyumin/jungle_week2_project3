/**
 * jungLover — 진입점
 *
 * 구현 순서: docs/TECH_DESIGN.md 7절
 * 지금은 4번(VN 재생기)까지입니다. 배경·CG(6번)와 Phaser 맵(8번)이 없어서
 * 화면은 대사창뿐이고, 자유 이동은 NPC 목록으로 대신합니다.
 */
import "./boot.css";
import "./vn/ui.css";

import script from "virtual:script";
import { newGame } from "./core/state";
import { mountCursor } from "./ui/cursor";
import { Player } from "./vn/Player";

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
            <button class="boot__back" id="boot-back" type="button">← 이름 다시 정하기</button>
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

  // 1장 — 엔터 또는 클릭. **아무 키나 받으면 안 됩니다** — 안내대로
  // F11 을 누르는 순간 전체화면이 되면서 이 장이 같이 넘어갑니다.
  const enterLogo = (e: KeyboardEvent): void => {
    if (act === 0 && e.key === "Enter") goTo(1);
  };
  const clickLogo = (): void => {
    if (act === 0) goTo(1);
  };
  window.addEventListener("keydown", enterLogo);
  window.addEventListener("mousedown", clickLogo);

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
  const backBtn = app.querySelector<HTMLButtonElement>("#boot-back")!;
  backBtn.addEventListener("click", () => goTo(1));

  /**
   * 이 장은 네 줄입니다 — 성별 · 반 · 정글 들어가기 · 이름 다시 정하기.
   * 위아래로 네 줄을 자유롭게 오가고, 좌우로 그 줄의 값을 고릅니다.
   *
   * 브라우저 기본값은 네 방향이 모두 **같은 무리 안에서만** 움직여서
   * 아래로 내려가려면 탭을 눌러야 했습니다. 못 누르는 시작 버튼은
   * 건너뜁니다.
   */
  const rowsOf = (): HTMLElement[][] => {
    const r: HTMLElement[][] = [
      [...whoForm.querySelectorAll<HTMLInputElement>('[name="gender"]')],
      [...whoForm.querySelectorAll<HTMLInputElement>('[name="room"]')],
    ];
    if (!startBtn.disabled) r.push([startBtn]);
    r.push([backBtn]);
    return r;
  };
  whoForm.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    const rows = rowsOf();
    const now = document.activeElement as HTMLElement;
    let at = rows.findIndex((r) => r.includes(now));
    // 못 누르는 시작 버튼이 빠져 줄 수가 달라져도 자리를 잃지 않습니다
    if (at < 0) at = step > 0 ? -1 : 0;
    e.preventDefault();
    const next = rows[(at + step + rows.length) % rows.length];
    const box = next.find((b) => (b as HTMLInputElement).checked) ?? next[0];
    box.focus();
  });

  whoForm.addEventListener("change", sync);
  sync();

  whoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (startBtn.disabled) return;
    const state = newGame(
      field(whoForm, "gender") as "male" | "female",
      field(nameForm, "family").trim(),
      field(nameForm, "given").trim(),
      field(whoForm, "room") as "403" | "405",
    );
    const veil = document.createElement("div");
    veil.className = "boot-veil";
    document.body.append(veil);
    // 막이 다 덮인 뒤에 갈아 끼웁니다 — 무대가 바뀌는 순간이 안 보입니다
    setTimeout(() => {
      new Player(app, script, state).start();
      veil.classList.add("is-out");
      setTimeout(() => veil.remove(), 700);
    }, 480);
  });
}

function boot(): void {
  setFavicon();
  mountCursor();
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app 이 없습니다");
  titleScreen(app);
}

boot();
