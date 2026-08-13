/**
 * 엔딩 도감 — 잠금 장치가 달린 낡은 책.
 *
 * 정본: docs/GAME_DESIGN.md 2-5 · 수집 기록은 `core/gallery.ts`
 *
 * **책은 그림입니다** (`assets/ui/book_cover.webp` · `book_spread.webp`,
 * `tools/cutout_book.py` 가 배경을 뚫어 둔 것). 예전에는 가죽과 종이를
 * CSS 로 흉내 냈는데, 그림 한 장을 못 따라갑니다. 우리가 하는 일은 그
 * 그림 **위의 두 쪽에 내용을 얹는 것**뿐입니다.
 *
 * **한 페이지에 엔딩 하나.** 왼쪽은 늘 그림, 오른쪽은 그 그림의 기록입니다.
 * 아직 못 본 엔딩은 **책 색으로 덮고 종이색 물음표**만 남깁니다 — 무엇이
 * 비었는지는 보이되 무엇인지는 안 보여야 모으고 싶어집니다.
 */
import { ENDINGS, seenCG } from '../core/gallery';
import { play as sfx } from '../audio/sfx';
import { NAME_BY_HEROINE, themeOf } from '../core/types';

const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export function openGallery(onClose: () => void): void {
  const host = document.createElement('div');
  host.className = 'tome';
  host.tabIndex = -1;
  host.innerHTML = `
    <div class="tome__stage">
      <!-- 닫힌 책 — 누르면 펼쳐집니다 -->
      <button class="tome__cover" id="tome-cover" type="button" data-nosfx aria-label="엔딩 도감 펼치기">
        <img src="${asset('ui/book_cover.webp')}" alt="" />
        <span class="tome__open-hint">눌러서 펼치기</span>
      </button>

      <!-- 펼친 책 — 그림 위에 두 쪽을 얹습니다 -->
      <div class="tome__spread" id="tome-spread" aria-hidden="true">
        <img class="tome__paper" src="${asset('ui/book_spread.webp')}" alt="" />
        <div class="tome__page tome__page--l" id="tome-left"></div>
        <div class="tome__page tome__page--r" id="tome-right"></div>
        <div class="tome__leaf" id="tome-leaf" aria-hidden="true"></div>
      </div>
    </div>

    <div class="tome__bar" id="tome-bar" hidden>
      <button class="tome__nav" id="tome-prev" type="button" data-nosfx disabled>← 뒤로 넘기기</button>
      <span class="tome__count" id="tome-count"></span>
      <button class="tome__nav" id="tome-next" type="button" data-nosfx disabled>앞으로 넘기기 →</button>
    </div>
    <button class="boot__back tome__back" id="tome-close" type="button" data-nosfx>← 뒤로 가기</button>`;
  document.body.append(host);

  const cover = host.querySelector<HTMLButtonElement>('#tome-cover')!;
  const left = host.querySelector<HTMLElement>('#tome-left')!;
  const right = host.querySelector<HTMLElement>('#tome-right')!;
  const leaf = host.querySelector<HTMLElement>('#tome-leaf')!;
  const bar = host.querySelector<HTMLElement>('#tome-bar')!;
  const count = host.querySelector<HTMLElement>('#tome-count')!;

  let seen = new Set<string>();
  let at = 0;
  let turning = false;

  const close = (): void => {
    sfx('ui_close');
    window.removeEventListener('keydown', onKey, true);
    host.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (host.contains(e.target as Node) && e.key !== 'Escape') return;
    e.stopPropagation();
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') turn(1);
    else if (e.key === 'ArrowLeft') turn(-1);
  };
  window.addEventListener('keydown', onKey, true);
  host.querySelector('#tome-close')!.addEventListener('click', close);

  /** 왼쪽 — 그림 한 장. 못 본 것은 책 색으로 덮고 물음표만 남깁니다 */
  const paintLeft = (i: number): string => {
    const e = ENDINGS[i];
    return seen.has(e.id)
      ? `<figure class="tome__shot">
           <img src="${asset(e.img)}" alt="${e.who} 엔딩"
                onerror="this.closest('figure').classList.add('is-missing')" />
           <figcaption>${e.who}</figcaption>
         </figure>`
      : `<div class="tome__locked"><span>?</span></div>`;
  };

  /** 오른쪽 — 그 그림의 기록 */
  const paintRight = (i: number): string => {
    const e = ENDINGS[i];
    const got = seen.has(e.id);
    // **여섯 장이 같은 틀입니다.** 루트마다 한 자리씩이고 색만 그 인물의
    // 테마색을 씁니다 (`themeOf`).
    return `<div class="tome__rec">
        <p class="tome__no">No. ${String(i + 1).padStart(2, '0')}</p>
        <h3 style="color:${themeOf(NAME_BY_HEROINE[e.route])}">
          ${got ? `${e.who} 엔딩` : '아직 못 본 엔딩'}
        </h3>
        <dl>
          <dt>인물</dt><dd>${got ? e.who : '— — —'}</dd>
          <dt>수집</dt><dd>${got ? '수집함' : '미수집'}</dd>
        </dl>
        <p class="tome__memo">${
          got
            ? '12일이 끝나고 남은 한 장. 이 사람과의 마지막 화면입니다.'
            : '이 루트를 끝까지 걸으면 이 자리가 채워집니다.'
        }</p>
      </div>`;
  };

  const render = (): void => {
    left.innerHTML = paintLeft(at);
    right.innerHTML = paintRight(at);
    count.textContent = `${at + 1} / ${ENDINGS.length}`;
    host.querySelector<HTMLButtonElement>('#tome-prev')!.disabled = at === 0;
    host.querySelector<HTMLButtonElement>('#tome-next')!.disabled = at === ENDINGS.length - 1;
  };

  /**
   * 한 장 넘깁니다. **넘어가는 장을 실제로 돌립니다** — 내용만 바뀌면
   * 슬라이드쇼지 책이 아닙니다. 돌아가는 동안 내용을 갈아 끼우고, 다
   * 돌면 장을 제자리로 되돌립니다.
   */
  const turn = (d: number): void => {
    // **펼치기 전에는 넘길 게 없습니다.** 버튼은 숨어 있지만 방향키는
    // 그대로 들어오므로 여기서도 막습니다 — 안 막으면 닫힌 책에서
    // 종이 넘기는 소리만 납니다.
    if (!host.dataset.open) return;
    const to = at + d;
    if (turning || to < 0 || to >= ENDINGS.length) return;
    turning = true;
    sfx('page_turn');
    leaf.dataset.dir = d > 0 ? 'next' : 'prev';
    leaf.innerHTML = d > 0 ? paintRight(at) : paintLeft(at);
    leaf.classList.add('is-turning');
    setTimeout(() => {
      at = to;
      render();
    }, 260);
    setTimeout(() => {
      leaf.classList.remove('is-turning');
      leaf.removeAttribute('data-dir');
      leaf.innerHTML = '';
      turning = false;
    }, 560);
  };

  host.querySelector('#tome-prev')!.addEventListener('click', () => turn(-1));
  host.querySelector('#tome-next')!.addEventListener('click', () => turn(1));

  /** 펼치기 — 표지가 왼쪽 등을 축으로 열립니다 */
  cover.addEventListener('click', async () => {
    if (host.dataset.open) return;
    host.dataset.open = '1';
    sfx('book_open');
    seen = await seenCG();
    render();
    host.querySelector('#tome-spread')!.setAttribute('aria-hidden', 'false');
    bar.hidden = false;
    host.focus();
  });
}
