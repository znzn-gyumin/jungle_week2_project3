/**
 * jungLover — 진입점
 *
 * 구현 순서: docs/TECH_DESIGN.md 7절
 * 지금은 4번(VN 재생기)까지입니다. 배경·CG(6번)와 Phaser 맵(8번)이 없어서
 * 화면은 대사창뿐이고, 자유 이동은 NPC 목록으로 대신합니다.
 */
import './boot.css';
import './vn/ui.css';

import script from 'virtual:script';
import { newGame } from './core/state';
import { mountCursor } from './ui/cursor';
import { Player } from './vn/Player';

/** `assets/` 아래 파일의 URL. Pages 는 하위 경로에 올라가므로 base 를 붙입니다. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}

/** 파비콘은 여기서 겁니다 — HTML 에 두면 1.3MB 로고가 번들로 끌려 들어갑니다. */
function setFavicon(): void {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = asset('ui/logo.webp');
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
  app.style.setProperty('--vn-scale', String(k));
  window.addEventListener('resize', () => {
    const n = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    app.style.setProperty('--vn-scale', String(n));
  });

  app.innerHTML = `
    <main class="boot">
      <img class="boot__bg" src="${asset('ui/intro_large.webp')}" alt="" />
      <div class="boot__flash" id="boot-flash"></div>

      <section class="boot__act is-on" data-act="0">
        <img class="boot__logo" src="${asset('ui/logo.webp')}" alt="jungLover" />
        <p class="boot__line">11박 12일, 연애는 커리큘럼에 없었다</p>
        <p class="boot__any">아무 키나 눌러 시작</p>
      </section>

      <section class="boot__act" data-act="1">
        <div class="boot__panel">
          <p class="boot__step">1 / 2</p>
          <h2 class="boot__head">이름을 정해 주세요</h2>
          <p class="boot__hint">비워 두면 이도윤 · 이도아 로 시작합니다.</p>
          <form class="boot__form" id="boot-name" autocomplete="off">
            <div class="boot__row">
              <label class="boot__field">
                <span>성</span>
                <input name="family" maxlength="2" placeholder="이" />
              </label>
              <label class="boot__field">
                <span>이름</span>
                <input name="given" maxlength="4" placeholder="도윤" />
              </label>
            </div>
            <button class="vn__choice boot__go" type="submit">다음</button>
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
              <label><input type="radio" name="gender" value="male" checked /><span>남자</span></label>
              <label><input type="radio" name="gender" value="female" /><span>여자</span></label>
            </fieldset>
            <fieldset class="boot__seg">
              <legend>반</legend>
              <label><input type="radio" name="room" value="403" checked /><span>403호</span></label>
              <label><input type="radio" name="room" value="405" /><span>405호</span></label>
            </fieldset>
            <p class="boot__hint" id="boot-cast"></p>
            <button class="vn__choice boot__go" type="submit">정글 들어가기</button>
          </form>
        </div>
      </section>

      <p class="boot__note">씬 ${Object.keys(script).length}개 컴파일됨</p>
    </main>`;

  const acts = [...app.querySelectorAll<HTMLElement>('.boot__act')];
  const flash = app.querySelector<HTMLElement>('#boot-flash')!;
  let act = 0;

  /** 흰 섬광 한 번 치고 장이 바뀝니다 */
  const goTo = (n: number): void => {
    if (n === act) return;
    flash.classList.remove('is-on');
    void flash.offsetWidth;
    flash.classList.add('is-on');
    acts[act].classList.remove('is-on');
    acts[act].classList.add('is-out');
    act = n;
    setTimeout(() => {
      for (const el of acts) el.classList.remove('is-out');
      acts[act].classList.add('is-on');
      acts[act].querySelector<HTMLInputElement>('input')?.focus();
    }, 260);
  };

  // 1장 — 아무 키나 클릭
  const leaveLogo = (): void => {
    if (act === 0) goTo(1);
  };
  window.addEventListener('keydown', leaveLogo);
  window.addEventListener('mousedown', leaveLogo);

  const nameForm = app.querySelector<HTMLFormElement>('#boot-name')!;
  const whoForm = app.querySelector<HTMLFormElement>('#boot-who')!;
  const cast = app.querySelector<HTMLElement>('#boot-cast')!;
  const field = (f: HTMLFormElement, n: string): string =>
    (f.elements.namedItem(n) as RadioNodeList | HTMLInputElement).value;

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    goTo(2);
  });

  /** 고른 성별이 무엇을 바꾸는지 그 자리에서 보여줍니다 */
  const sync = (): void => {
    cast.textContent =
      field(whoForm, 'gender') === 'male'
        ? '조원은 민아 · 승희 · 윤정, 룸메는 한지오입니다.'
        : '조원은 민규 · 승민 · 윤호, 룸메는 한지아입니다.';
  };
  whoForm.addEventListener('change', sync);
  sync();

  whoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const state = newGame(
      field(whoForm, 'gender') as 'male' | 'female',
      field(nameForm, 'family').trim(),
      field(nameForm, 'given').trim(),
      field(whoForm, 'room') as '403' | '405',
    );
    flash.classList.remove('is-on');
    void flash.offsetWidth;
    flash.classList.add('is-on');
    setTimeout(() => new Player(app, script, state).start(), 260);
  });
}


function boot(): void {
  setFavicon();
  mountCursor();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app 이 없습니다');
  titleScreen(app);
}

boot();
