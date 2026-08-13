/**
 * 되물음 창 — **`window.confirm` 대신 씁니다.**
 *
 * 브라우저 기본 경고창은 세 가지가 문제입니다. 게임과 아무 상관 없는
 * 운영체제 모양이 튀어나오고, 주소가 함께 적혀 웹페이지라는 걸 상기시키며,
 * **모든 스크립트를 멈춰서** 음악까지 뚝 끊깁니다.
 *
 * 그래서 무대 안에 직접 그립니다. `.vn` 안에 붙이므로 검은 레터박스로는
 * 안 넘어가고, 화면 정중앙에 섭니다.
 */
import { play as sfx } from '../audio/sfx';

export type ConfirmOpts = {
  title: string;
  /** 줄바꿈은 그대로 살립니다 */
  body: string;
  /** 진행 버튼 글자 — 무엇을 하는지 적습니다 (「확인」 보다 낫습니다) */
  ok: string;
  /** 되돌릴 수 없는 일이면 진행 버튼을 붉게 */
  danger?: boolean;
};

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function confirmBox(host: HTMLElement, o: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'ask';
    el.tabIndex = -1;
    el.innerHTML = `
      <div class="ask__card" role="alertdialog" aria-label="${esc(o.title)}">
        <h2 class="ask__title">${esc(o.title)}</h2>
        <p class="ask__body">${esc(o.body)}</p>
        <div class="ask__acts">
          <button class="ask__btn" id="ask-no" type="button">취소</button>
          <button class="ask__btn ask__btn--go${o.danger ? ' is-danger' : ''}"
                  id="ask-yes" type="button">${esc(o.ok)}</button>
        </div>
      </div>`;
    host.append(el);
    el.focus();

    const done = (yes: boolean): void => {
      window.removeEventListener('keydown', onKey, true);
      el.remove();
      resolve(yes);
    };
    // **게임 키를 먹습니다.** 안 막으면 뒤에서 대사가 같이 넘어갑니다.
    const onKey = (e: KeyboardEvent): void => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        sfx('ui_back');
        done(false);
      } else if (e.key === 'Enter') {
        done(true);
      }
    };
    window.addEventListener('keydown', onKey, true);

    el.querySelector('#ask-no')!.addEventListener('click', () => done(false));
    el.querySelector('#ask-yes')!.addEventListener('click', () => done(true));
    // 판 바깥을 눌러도 그대로 둡니다 — 되돌릴 수 없는 쪽이 기본이면 안 됩니다
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) done(false);
    });
  });
}
