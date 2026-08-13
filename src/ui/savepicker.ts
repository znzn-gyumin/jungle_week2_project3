/**
 * 세이브 파일 관리 — **로그인 바로 뒤에 섭니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-2 (수동 3슬롯)
 *
 * 빈 칸을 누르면 이름 정하는 화면으로 넘어가고, 채워진 칸을 누르면 그
 * 자리에서 이어집니다. 아래에 **엔딩 도감**과 **로그아웃**을 답니다.
 *
 * 오토세이브 슬롯은 여기 안 보입니다 — 사람이 고르는 칸이 아니라 안전망
 * 이라, 목록에 섞으면 「내가 저장한 것」과 구분이 안 됩니다.
 */
import { currentSession, signOut } from '../core/auth';
import { ENDINGS, seenCG } from '../core/gallery';
import {
  deleteSlot,
  listSlots,
  loadFrom,
  setActiveSlot,
  type SlotId,
  type SlotInfo,
} from '../core/saves';
import { confirmBox } from './confirm';
import { NAME_BY_HEROINE, type GameState, type RouteId } from '../core/types';
import { openGallery } from './gallery';
import { play as sfx } from '../audio/sfx';

const PICK: SlotId[] = ['1', '2', '3'];

/** 휴지통 — 톱니바퀴와 같은 결(선만 그린 아이콘, 바탕 없음) */
const TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 6.5h16" />
  <path d="M9.5 6.5V4.8c0-.5.4-.9.9-.9h3.2c.5 0 .9.4.9.9v1.7" />
  <path d="M6.6 6.5 7.4 19c0 .6.5 1.1 1.1 1.1h7c.6 0 1.1-.5 1.1-1.1l.8-12.5" />
  <path d="M10.4 10v6M13.6 10v6" />
</svg>`;

export type PickerOpts = {
  /** 빈 칸 — 이름 정하는 화면으로 */
  onNewGame: (slot: SlotId) => void;
  /** 채워진 칸 — 그 자리에서 이어서 */
  onLoad: (state: GameState, slot: SlotId) => void;
  /**
   * ESC — **로고 화면으로 돌아갑니다.**
   *
   * 한 칸 앞은 로그인이지만 그리로 보내면 아무 일도 안 일어납니다. 이미
   * 로그인된 상태라 그 화면은 곧바로 통과해 다시 여기로 돌아오거든요.
   * 실제로 물러날 수 있는 자리는 로고뿐입니다.
   */
  onBack?: () => void;
};

/** 루트가 아직 안 정해졌으면 「루트 미정」 — D1 밤에 갈립니다 */
function routeLabel(r: RouteId | null): string {
  return r ? `${NAME_BY_HEROINE[r]} 루트` : '루트 미정';
}

function stamp(d: Date | null): string {
  if (!d) return '';
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export function openSavePicker(opts: PickerOpts): void {
  // 이름 정하는 장과 같은 옷 — `boot__panel` 한 벌을 그대로 씁니다
  const host = document.createElement('div');
  host.className = 'gate';
  host.tabIndex = -1;
  host.innerHTML = `
    <div class="boot__panel">
      <p class="boot__step">세이브 파일</p>
      <h2 class="boot__head">이어할 파일을 고르세요</h2>
      <p class="boot__hint" id="picker-who"></p>
      <div class="gate__slots" id="picker-slots">
        <p class="boot__hint">불러오는 중…</p>
      </div>
      <div class="gate__foot">
        <button class="boot__back" id="picker-gallery" type="button" data-nosfx>엔딩 도감</button>
        <button class="boot__back" id="picker-out" type="button">로그아웃</button>
      </div>
    </div>`;
  document.body.append(host);
  host.focus();

  const slotsEl = host.querySelector<HTMLElement>('#picker-slots')!;
  const s = currentSession();
  host.querySelector<HTMLElement>('#picker-who')!.textContent = s
    ? `${s.displayName} 님으로 로그인했습니다`
    : '로그인 없이 둘러보는 중입니다 — 저장은 안 됩니다';

  const close = (): void => {
    window.removeEventListener('keydown', onKey, true);
    host.remove();
  };

  const onKey = (e: KeyboardEvent): void => {
    // **도감이 떠 있으면 비켜 줍니다.** 그때 이 화면은 숨어 있고, 도감이
    // 자기 ESC 를 갖고 있습니다 — 여기서 먼저 받으면 도감만 남습니다.
    if (host.hidden || e.key !== 'Escape') return;
    e.stopPropagation();
    sfx('ui_back');
    close();
    opts.onBack?.();
  };
  window.addEventListener('keydown', onKey, true);

  const paint = async (): Promise<void> => {
    let slots: SlotInfo[] = [];
    try {
      slots = await listSlots();
    } catch {
      /* 설정 전이거나 오프라인 — 전부 빈 칸으로 보여줍니다 */
    }
    const done = (await seenCG()).size;

    slotsEl.innerHTML = PICK.map((id) => {
      const info = slots.find((x) => x.slot === id);
      const filled = Boolean(info?.savedAt || info?.chapterDay);
      // **성별·반 고르는 알약과 같은 모양입니다.** 이 화면도 「고르는」
      // 화면이라 손맛이 같아야 합니다 — 채워진 칸만 떠오릅니다.
      // **휴지통은 칸 밖에 둡니다.** 버튼 안에 버튼을 넣을 수 없고,
      // 넣더라도 「고르기」와 「지우기」가 한 판을 나눠 써서 잘못 눌립니다.
      return `<div class="gate__file">
          <button class="gate__slot${filled ? ' is-filled' : ''}"
                  data-slot="${id}" type="button">
            <span class="gate__no">${id}</span>
            ${
              filled
                ? `<span class="gate__main"><b>${info!.who || '이름 없음'}</b>
                     <i>Day ${info!.chapterDay} · ${routeLabel(info!.route)}</i></span>
                   <span class="gate__when">${stamp(info!.savedAt)}</span>`
                : `<span class="gate__main"><b>빈 칸</b><i>새로 시작하기</i></span>
                   <span class="gate__when">—</span>`
            }
          </button>
          ${
            filled
              ? `<button class="gate__trash" data-del="${id}" type="button"
                         aria-label="${id}번 칸 지우기" title="지우기">${TRASH}</button>`
              : ''
          }
        </div>`;
    }).join('');

    host.querySelector<HTMLElement>('#picker-gallery')!.textContent =
      `엔딩 도감 (${done} / ${ENDINGS.length})`;

    for (const b of slotsEl.querySelectorAll<HTMLButtonElement>('.gate__slot')) {
      b.addEventListener('click', async () => {
        const slot = b.dataset.slot as SlotId;
        setActiveSlot(slot);
        if (!b.classList.contains('is-filled')) {
          close();
          opts.onNewGame(slot);
          return;
        }
        b.disabled = true;
        const state = await loadFrom(slot);
        if (!state) {
          b.disabled = false;
          return;
        }
        close();
        opts.onLoad(state, slot);
      });
    }

    for (const b of slotsEl.querySelectorAll<HTMLButtonElement>('.gate__trash')) {
      b.addEventListener('click', async () => {
        const slot = b.dataset.del as SlotId;
        const info = slots.find((x) => x.slot === slot);
        // 되물음은 메인으로 · 로그아웃과 같은 창입니다 — 지우는 일은
        // 되돌릴 수 없으므로 진행 쪽만 붉게 둡니다
        const yes = await confirmBox(host, {
          title: `${slot}번 칸을 지울까요?`,
          body: `${
            info?.who
              ? `${info.who} · Day ${info.chapterDay} 의 진행이 사라집니다.`
              : '이 칸의 진행이 사라집니다.'
          }\n엔딩 도감은 그대로 남습니다.`,
          ok: '지우기',
          danger: true,
        });
        if (!yes) return;
        b.disabled = true;
        try {
          await deleteSlot(slot);
        } catch {
          b.disabled = false;
          return;
        }
        await paint();
      });
    }
  };

  host.querySelector('#picker-gallery')!.addEventListener('click', () => {
    sfx('ui_open');
    host.hidden = true;
    openGallery(() => {
      host.hidden = false;
      void paint(); // 도감을 보고 나오면 수집률이 바뀌었을 수 있습니다
      host.focus();
    });
  });

  host.querySelector('#picker-out')!.addEventListener('click', async () => {
    await signOut();
    window.location.reload();
  });

  void paint();
}
