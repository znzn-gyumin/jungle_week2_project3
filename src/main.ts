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
 * 시작 전 설정. 성·이름·성별·반을 정합니다.
 *
 * 성별은 그냥 취향이 아닙니다 — 만나는 히로인 셋이 여기서 갈리고(반대
 * 성별) 절친도 같이 갈립니다 (TECH_DESIGN 3-1). 반은 4층의 403 · 405
 * 중 하나입니다.
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
      <div class="boot__panel">
        <p class="boot__line">11박 12일, 연애는 커리큘럼에 없었다</p>

        <form class="boot__form" id="boot-form" autocomplete="off">
          <div class="boot__row">
            <label class="boot__field">
              <span>성</span>
              <input name="family" maxlength="2" placeholder="이" />
            </label>
            <label class="boot__field boot__field--wide">
              <span>이름</span>
              <input name="given" maxlength="4" placeholder="도윤" />
            </label>
          </div>

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

          <p class="boot__hint" id="boot-hint"></p>
          <button class="vn__choice boot__go" type="submit">정글 들어가기</button>
        </form>

        <p class="boot__note">씬 ${Object.keys(script).length}개 컴파일됨</p>
      </div>
    </main>`;

  const form = app.querySelector<HTMLFormElement>('#boot-form')!;
  const hint = app.querySelector<HTMLElement>('#boot-hint')!;
  const val = (n: string): string =>
    (form.elements.namedItem(n) as RadioNodeList | HTMLInputElement).value;

  /** 성별을 바꾸면 기본 이름과 만날 사람이 같이 바뀝니다 */
  const sync = (): void => {
    const male = val('gender') === 'male';
    const given = form.querySelector<HTMLInputElement>('[name="given"]')!;
    given.placeholder = male ? '도윤' : '도아';
    hint.textContent = male
      ? '조원은 민아 · 승희 · 윤정, 룸메는 한지오입니다.'
      : '조원은 민규 · 승민 · 윤호, 룸메는 한지아입니다.';
  };
  form.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const state = newGame(
      val('gender') as 'male' | 'female',
      val('family').trim(),
      val('given').trim(),
      val('room') as '403' | '405',
    );
    new Player(app, script, state).start();
  });
}

function boot(): void {
  setFavicon();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app 이 없습니다');
  titleScreen(app);
}

boot();
