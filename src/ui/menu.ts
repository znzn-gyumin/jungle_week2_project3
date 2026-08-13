/**
 * 게임 중 설정 — **톱니바퀴 하나로 접혀 있습니다.**
 *
 * 정본: docs/TECH_DESIGN.md 4-2(세이브)
 *
 * **무대 안에 답니다.** 예전에는 화면 구석(`position: fixed`)에 뒀는데,
 * 무대는 1920×1080 을 창에 맞춰 줄인 것이라 그 바깥은 검은 레터박스입니다 —
 * 버튼이 게임 화면을 벗어나 검은 자리에 떠 있었습니다. `.vn` 안에 넣으면
 * `overflow: hidden` 이 알아서 무대 안으로 가둡니다.
 *
 * 눌리면 **톱니바퀴는 사라지고 그 자리에서 패널이 펼쳐집니다.** 둘이 같이
 * 있으면 무엇을 눌러야 닫히는지가 헷갈립니다.
 */
import { currentSession, signOut } from '../core/auth';
import { setVolume as setBgm, volume as bgmVolume } from '../audio/bgm';
import { play as sfx, setVolume as setSfx, volume as sfxVolume } from '../audio/sfx';
import { activeSlot, canSave, saveTo, type SlotId } from '../core/saves';
import type { GameState } from '../core/types';
import { confirmBox } from './confirm';

const LABEL: Record<SlotId, string> = {
  '1': '1번 칸',
  '2': '2번 칸',
  '3': '3번 칸',
  auto: '자동 저장 칸',
};

const GEAR = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
  <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3.6h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.8 1.7 1l.4 2.5h4l.4-2.5c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.4-2-1.5Z" />
</svg>`;

export function mountMenu(host: HTMLElement, getState: () => GameState): () => void {
  const bar = document.createElement('div');
  bar.className = 'cog';
  bar.innerHTML = `
    <button class="cog__btn" id="cog-open" type="button" aria-label="설정">${GEAR}</button>
    <div class="cog__panel" id="cog-panel" hidden>
      <div class="cog__head">
        <p>설정</p>
        <button class="cog__x" id="cog-close" type="button" aria-label="닫기">✕</button>
      </div>

      <label class="cog__row">
        <span>배경음악</span>
        <input type="range" id="cog-bgm" min="0" max="100" step="1" />
        <b id="cog-bgm-n"></b>
      </label>
      <label class="cog__row">
        <span>효과음</span>
        <input type="range" id="cog-sfx" min="0" max="100" step="1" />
        <b id="cog-sfx-n"></b>
      </label>

      <div class="cog__acts">
        <button class="cog__act cog__act--go" id="cog-save" type="button">저장</button>
        <button class="cog__act" id="cog-home" type="button">메인으로</button>
        <button class="cog__act" id="cog-out" type="button">로그아웃</button>
      </div>
      <p class="cog__msg" id="cog-msg"></p>
    </div>`;
  host.append(bar);

  const openBtn = bar.querySelector<HTMLButtonElement>('#cog-open')!;
  const panel = bar.querySelector<HTMLElement>('#cog-panel')!;
  const msg = bar.querySelector<HTMLElement>('#cog-msg')!;

  const say = (text: string): void => {
    msg.textContent = text;
  };

  /** 톱니바퀴와 패널은 **한 자리를 나눠 씁니다** — 같이 뜨지 않습니다 */
  const open = (on: boolean): void => {
    openBtn.hidden = on;
    panel.hidden = !on;
    if (on) say('');
  };
  openBtn.addEventListener('click', () => open(true));
  bar.querySelector('#cog-close')!.addEventListener('click', () => {
    sfx('ui_close');
    open(false);
  });

  // 바깥을 누르거나 ESC 로 닫힙니다 — 열어 두고 게임을 못 하면 안 됩니다
  const onDocDown = (e: PointerEvent): void => {
    if (!panel.hidden && !bar.contains(e.target as Node)) open(false);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (panel.hidden || e.key !== 'Escape') return;
    e.stopPropagation();
    open(false);
  };
  document.addEventListener('pointerdown', onDocDown);
  window.addEventListener('keydown', onKey, true);

  // ---- 소리 두 줄
  const wire = (
    id: string,
    read: () => number,
    write: (v: number) => void,
    preview?: () => void,
  ): void => {
    const el = bar.querySelector<HTMLInputElement>(`#cog-${id}`)!;
    const num = bar.querySelector<HTMLElement>(`#cog-${id}-n`)!;
    const show = (): void => {
      num.textContent = String(Math.round(Number(el.value)));
      // 채워진 만큼 막대에 색이 찹니다 (CSS 가 이 값을 봅니다)
      el.style.setProperty('--fill', `${el.value}%`);
    };
    el.value = String(Math.round(read() * 100));
    show();
    el.addEventListener('input', () => {
      write(Number(el.value) / 100);
      show();
    });
    // **놓을 때 한 번 들려줍니다.** 숫자만 보고는 얼마나 큰지 모릅니다.
    if (preview) el.addEventListener('change', preview);
  };
  wire('bgm', bgmVolume, setBgm);
  wire('sfx', sfxVolume, setSfx, () => sfx('ui_select'));

  // ---- 세 버튼
  const saveBtn = bar.querySelector<HTMLButtonElement>('#cog-save')!;
  const outBtn = bar.querySelector<HTMLButtonElement>('#cog-out')!;
  if (!canSave()) {
    for (const b of [saveBtn, outBtn]) {
      b.disabled = true;
      b.title = '로그인해야 씁니다 — 진행 상황은 계정에 저장됩니다';
    }
  }

  saveBtn.addEventListener('click', async () => {
    const slot = activeSlot();
    saveBtn.disabled = true;
    say('저장 중…');
    try {
      await saveTo(slot, getState());
      sfx('save_chime');
      say(`${LABEL[slot]}에 저장했습니다`);
    } catch (err) {
      sfx('ui_error');
      say(`실패했습니다 — ${(err as Error).message}`);
    } finally {
      saveBtn.disabled = false;
    }
  });

  // **저장은 자동으로 안 합니다.** 물어보지 않고 덮으면 방금 한 선택을
  // 되돌리려던 사람의 칸이 사라집니다. 되물음은 무대 안에 직접 그립니다 —
  // 브라우저 기본 경고창은 모양이 튀고, 스크립트를 멈춰 음악까지 끊깁니다.
  bar.querySelector('#cog-home')!.addEventListener('click', async () => {
    open(false);
    const yes = await confirmBox(host, {
      title: '메인 화면으로 나갈까요?',
      body: '저장하지 않은 진행은 사라집니다.',
      ok: '나가기',
      danger: true,
    });
    if (yes) window.location.reload();
  });

  outBtn.addEventListener('click', async () => {
    open(false);
    const who = currentSession()?.displayName ?? '';
    const yes = await confirmBox(host, {
      title: `${who} 님, 로그아웃할까요?`,
      body: '저장하지 않은 진행은 사라집니다.',
      ok: '로그아웃',
      danger: true,
    });
    if (!yes) return;
    await signOut();
    window.location.reload();
  });

  return () => {
    document.removeEventListener('pointerdown', onDocDown);
    window.removeEventListener('keydown', onKey, true);
    bar.remove();
  };
}
