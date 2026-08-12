/**
 * jungLover — 진입점
 *
 * 구현 순서: docs/TECH_DESIGN.md 7절
 * 지금은 1번(스캐폴딩·배포)까지입니다. 화면은 타이틀 배경을 띄워
 * **에셋 경로가 개발 서버와 Pages 양쪽에서 뚫렸는지**를 눈으로 확인하는 용도입니다.
 */
import './boot.css';

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

function boot(): void {
  setFavicon();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app 이 없습니다');

  app.innerHTML = `
    <main class="boot">
      <img class="boot__bg" src="${asset('ui/intro_large.webp')}" alt="" />
      <div class="boot__panel">
        <p class="boot__line">11박 12일, 연애는 커리큘럼에 없었다</p>
        <p class="boot__note" id="boot-status">에셋 확인 중…</p>
      </div>
    </main>
  `;

  const status = app.querySelector<HTMLParagraphElement>('#boot-status')!;
  const bg = app.querySelector<HTMLImageElement>('.boot__bg')!;
  bg.addEventListener('load', () => {
    status.textContent = `에셋 경로 정상 · ${bg.naturalWidth}×${bg.naturalHeight}`;
  });
  bg.addEventListener('error', () => {
    status.textContent = '에셋을 못 읽었습니다 — vite.config.ts 의 assets 플러그인을 확인하세요';
    status.classList.add('boot__note--bad');
  });
}

boot();
