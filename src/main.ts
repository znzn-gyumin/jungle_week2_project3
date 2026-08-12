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
 * 성별을 먼저 고릅니다. 만나는 히로인 셋이 여기서 갈리고(반대 성별),
 * 절친도 같이 갈립니다 (TECH_DESIGN 3-1).
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
        <div class="boot__pick">
          <button class="vn__choice" data-g="male">남자로 시작 — 이도윤</button>
          <button class="vn__choice" data-g="female">여자로 시작 — 이도아</button>
        </div>
        <p class="boot__note">씬 ${Object.keys(script).length}개 컴파일됨</p>
      </div>
    </main>`;
  for (const b of app.querySelectorAll<HTMLButtonElement>('[data-g]')) {
    b.addEventListener('click', () => {
      const state = newGame(b.dataset.g as 'male' | 'female');
      new Player(app, script, state).start();
    });
  }
}

function boot(): void {
  setFavicon();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app 이 없습니다');
  titleScreen(app);
}

boot();
