/**
 * 방명록 게시판 — 교육장 화이트보드.
 *
 * 정본: docs/GAME_DESIGN.md 2-5 · docs/TECH_DESIGN.md 4-3
 *
 * **새 공간을 만들지 않습니다.** 화이트보드는 [WORLD_BIBLE 7-2] 의 기존
 * 모티프고, 인게임 낙서가 챕터마다 차오르듯 방명록도 같은 곡선을 탑니다.
 * 그림도 새로 안 씁니다 — 알루미늄 테두리 · 모서리 캡 · 지우개 받침 ·
 * 노란 메모지의 테이프와 접힌 귀퉁이를 전부 CSS 로 그립니다.
 */
import { currentSession } from '../core/auth';
import {
  BODY_MAX,
  listEntries,
  myEntries,
  myEntry,
  removeEntry,
  writableDay,
  writeEntry,
  type Entry,
} from '../core/guestbook';
import { NAME_BY_HEROINE, themeOf, type GameState, type RouteId } from '../core/types';
import { play as sfx } from '../audio/sfx';
import { confirmBox } from './confirm';

export type BoardOpts = {
  /** 화이트보드에 적힐 이름 — 게임에서 정한 성+이름 */
  who: string;
  /** 회차·진행 일자·루트를 여기서 봅니다 */
  state: GameState;
  onClose: () => void;
};

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** 루트가 아직 없으면 「6조 신입」 입니다 (GAME_DESIGN 2-5) */
function routeLabel(r: RouteId | null): string {
  return r ? `${NAME_BY_HEROINE[r]} 루트` : '6조 신입';
}

/**
 * 조회가 실패했을 때 무엇을 해야 하는지까지 적습니다.
 *
 * **색인이 없을 때가 제일 흔합니다.** 이 목록은 `inGameDay` 에 범위 조건을
 * 걸고 다른 필드로 정렬하므로 복합 색인이 하나 필요한데, 프로젝트를 새로
 * 만들면 그게 없습니다. Firestore 는 그럴 때 **만들기 화면으로 바로 가는
 * 링크를 에러 메시지에 넣어 줍니다** — 그걸 눌러야 하므로 글자로 흘리지
 * 않고 진짜 링크로 띄웁니다.
 */
function failure(err: Error): string {
  const url = /https?:\/\/\S+/.exec(err.message)?.[0]?.replace(/[.,)]+$/, '');
  const needsIndex = /index/i.test(err.message);

  // **규칙이 막은 경우.** 코드로는 더 할 게 없고 콘솔에서 할 일이 남은
  // 상태라, 무엇을 봐야 하는지까지 적어 줍니다. 「권한 없음」 한 줄만
  // 띄우면 무엇이 잘못됐는지 알 길이 없습니다.
  if (/permission|insufficient/i.test(err.message)) {
    return `<b>보안 규칙이 막고 있습니다.</b><br />
      Firebase 콘솔 → Firestore Database → <b>규칙</b> 탭에서 확인해 주세요.
      <ul class="board__todo">
        <li>화면 위 <b>데이터베이스 선택</b>이
            <code>jungle-week2-project3</code> 인지 — 규칙은 데이터베이스마다 따로입니다</li>
        <li>저장소의 <code>firestore.rules</code> 내용이 그대로 들어가 있는지</li>
        <li><b>게시</b> 를 눌렀는지 — 편집만 하고 안 누르면 예전 규칙이 그대로입니다</li>
      </ul>`;
  }

  if (url && needsIndex) {
    return `<b>색인이 아직 없습니다.</b><br />
      아래 링크를 열어 「색인 만들기」 를 누르고, 상태가 「사용 설정됨」 이
      될 때까지 몇 분 기다린 뒤 다시 열어 주세요.<br />
      <a class="board__link" href="${esc(url)}" target="_blank" rel="noreferrer">
        Firebase 콘솔에서 색인 만들기
      </a>`;
  }
  return `불러오지 못했습니다 — ${esc(err.message)}`;
}

function noteHtml(e: Entry, mine: boolean, i: number): string {
  // 손으로 붙인 것처럼 조금씩 기울입니다 — 규칙적으로 두면 표가 됩니다
  const tilt = [-2.1, 1.4, -0.8, 2.3, -1.6, 0.9][i % 6];
  const when = e.updatedAt
    ? `${e.updatedAt.getFullYear()}.${String(e.updatedAt.getMonth() + 1).padStart(2, '0')}.${String(e.updatedAt.getDate()).padStart(2, '0')}`
    : '';
  return `
    <article class="note${mine ? ' note--mine' : ''}" style="--tilt:${tilt}deg">
      <span class="note__tape" aria-hidden="true"></span>
      ${
        mine
          ? `<button class="note__del" data-del="${esc(e.id)}" type="button"
                     aria-label="이 글 지우기" title="지우기">✕</button>`
          : ''
      }
      <p class="note__body">${esc(e.body)}</p>
      <footer class="note__by">
        <b style="color:${themeOf(e.route ? NAME_BY_HEROINE[e.route] : '')}">${esc(e.who)}</b>
        <span>Day ${e.inGameDay} · ${routeLabel(e.route)}</span>
        ${when ? `<time>${when}</time>` : ''}
      </footer>
    </article>`;
}

export function openGuestbook(opts: BoardOpts): void {
  const host = document.createElement('div');
  host.className = 'board';
  host.innerHTML = `
    <div class="board__frame" role="dialog" aria-label="교육장 화이트보드 방명록">
      <div class="board__cap board__cap--tl" aria-hidden="true"></div>
      <div class="board__cap board__cap--tr" aria-hidden="true"></div>
      <div class="board__cap board__cap--bl" aria-hidden="true"></div>
      <div class="board__cap board__cap--br" aria-hidden="true"></div>
      <div class="board__surface">
        <div class="board__sheen" aria-hidden="true"></div>
        <header class="board__head">
          <div>
            <h2>교육장 · 화이트보드</h2>
            <p id="board-sub"></p>
          </div>
          <div class="board__tabs" id="board-tabs">
            <button class="board__tab is-on" data-view="all" type="button" data-nosfx>전체</button>
            <button class="board__tab" data-view="mine" type="button" data-nosfx>내 메모</button>
          </div>
        </header>
        <div class="board__notes" id="board-notes"></div>
        <div class="board__write" id="board-write"></div>
      </div>
      <div class="board__tray" aria-hidden="true"><span class="board__eraser"></span></div>
    </div>
    <button class="board__close" id="board-close" type="button" data-nosfx>닫기 (ESC)</button>`;
  document.body.append(host);
  sfx('board_open');

  const notes = host.querySelector<HTMLElement>('#board-notes')!;
  const write = host.querySelector<HTMLElement>('#board-write')!;
  const sub = host.querySelector<HTMLElement>('#board-sub')!;

  const close = (): void => {
    sfx('ui_close');
    window.removeEventListener('keydown', outsideKey, true);
    host.remove();
    opts.onClose();
  };

  // **게임 키를 먹습니다.** 안 막으면 뒤에서 주인공이 같이 걷고 대사도
  // 넘어갑니다. 다만 **보드 안에서 친 키는 그대로 둬야** 합니다 —
  // 여기서 무턱대고 가로채면 메모를 한 글자도 못 씁니다.
  const outsideKey = (e: KeyboardEvent): void => {
    if (host.contains(e.target as Node)) return;
    e.stopPropagation();
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', outsideKey, true);
  host.addEventListener('keydown', (e) => {
    e.stopPropagation(); // 보드 안의 키는 창 밖으로 안 새 나갑니다
    if (e.key === 'Escape') close();
  });
  host.tabIndex = -1;
  host.focus();
  host.querySelector('#board-close')!.addEventListener('click', close);

  const session = currentSession();
  if (!session) {
    // **로그인해야 씁니다.** 읽기도 마찬가지입니다 — 글에 실제 계정이
    // 붙는 게 이 방명록의 전부라, 익명으로 볼 이유가 없습니다.
    sub.textContent = '';
    // 로그인 전에는 「내 메모」가 가리킬 것이 없습니다 — 꼬리표째 치웁니다
    host.querySelector<HTMLElement>('#board-tabs')!.hidden = true;
    notes.innerHTML = `
      <p class="board__locked">
        <b>로그인해야 방명록을 볼 수 있습니다.</b><br />
        타이틀로 나가 Google 로 로그인해 주세요.
      </p>`;
    return;
  }

  /**
   * 무엇을 보고 있는가.
   *
   *   `all`   화이트보드 — **내 진행 일자까지**만 보입니다
   *   `mine`  내 메모   — 날짜와 상관없이 내가 쓴 것 전부
   *
   * 둘을 가른 이유가 있습니다. D5 에 쓴 글을 D2 로 되돌아온 판에서는
   * 화이트보드에서 볼 수도 지울 수도 없습니다 — 날짜 해금이 남의 글을
   * 미리 안 보여주려는 장치인데, **내 글까지 나한테서 가려 버립니다.**
   */
  let view: 'all' | 'mine' = 'all';

  const day = writableDay(opts.state.chapterDay);
  const says = (): void => {
    sub.textContent =
      view === 'mine'
        ? '내가 남긴 글 전부입니다 — 날짜와 상관없이 보이고 지울 수 있습니다'
        : `지금까지 도달한 Day ${opts.state.chapterDay} 까지의 글이 보입니다 · ` +
          `내 글은 Day ${day} 로 붙습니다`;
  };
  says();

  /**
   * **쓰는 자리를 먼저 그립니다.**
   *
   * 예전에는 목록을 읽어 온 뒤에야 폼을 그렸습니다. 그래서 조회가
   * 실패하면(색인이 아직 없거나 규칙이 거부하면) **붙이기 버튼이 통째로
   * 안 나왔습니다** — 읽기와 쓰기는 서로 다른 일인데 하나가 넘어지면
   * 둘 다 못 하게 되던 것입니다.
   */
  /** 지금까지 화면에 붙인 글 — 스크롤로 계속 이어 붙습니다 */
  let shown: Entry[] = [];
  let cursor: unknown = null;
  let more = true;
  let loading = false;

  /**
   * 한 쪽씩 이어 붙입니다. **총량 제한이 없습니다** — 바닥에 닿으면
   * 다음 스무 장을 부릅니다. 한 번에 다 부르면 글이 쌓일수록 여는 데
   * 오래 걸리고, 아래는 아무도 안 보는데 값만 씁니다.
   */
  const more20 = async (): Promise<void> => {
    if (loading || !more) return;
    loading = true;
    try {
      const page =
        view === 'mine'
          ? await myEntries(cursor)
          : await listEntries(opts.state.chapterDay, cursor);
      cursor = page.cursor;
      more = page.more;
      const from = shown.length;
      shown = shown.concat(page.entries);
      if (!shown.length) {
        notes.innerHTML = `<p class="board__empty">${
          view === 'mine'
            ? '아직 남긴 글이 없습니다.'
            : '아직 아무도 안 썼습니다. 첫 줄을 남겨 보세요.'
        }</p>`;
        return;
      }
      if (!from) notes.innerHTML = '';
      notes.insertAdjacentHTML(
        'beforeend',
        page.entries.map((e, i) => noteHtml(e, e.uid === session.uid, from + i)).join(''),
      );
      wireDelete();
    } catch (err) {
      if (!shown.length) notes.innerHTML = `<p class="board__locked">${failure(err as Error)}</p>`;
      more = false;
    } finally {
      loading = false;
    }
  };

  // 바닥 가까이 오면 다음 쪽 — 끝까지 내리기 전에 미리 채웁니다
  notes.addEventListener('scroll', () => {
    if (notes.scrollTop + notes.clientHeight > notes.scrollHeight - 240) void more20();
  });

  for (const t of host.querySelectorAll<HTMLButtonElement>('.board__tab')) {
    t.addEventListener('click', () => {
      const next = t.dataset.view as 'all' | 'mine';
      if (next === view) return;
      view = next;
      sfx('ui_move');
      for (const x of host.querySelectorAll('.board__tab')) x.classList.toggle('is-on', x === t);
      void paint();
    });
  }

  const paint = async (): Promise<void> => {
    notes.innerHTML = `<p class="board__loading">불러오는 중…</p>`;
    shown = [];
    cursor = null;
    more = true;
    says();

    // 내 글은 못 읽어도 새로 쓰는 데는 지장이 없습니다
    const mine = await myEntry(opts.state).catch(() => null);
    paintForm(mine);
    await more20();
  };

  /**
   * **내 글에는 지우기 단추가 붙습니다.** 어느 판 어느 날에 쓴 것이든
   * 계정만 같으면 지울 수 있습니다 — 쓰는 쪽은 「지금 판 지금 날」로
   * 묶여 있어서, 지우는 쪽까지 묶으면 예전 글을 손댈 방법이 없습니다.
   */
  const wireDelete = (): void => {
    for (const b of notes.querySelectorAll<HTMLButtonElement>('.note__del:not([data-on])')) {
      b.dataset.on = '1'; // 이어 붙일 때마다 새로 생긴 것만 잇습니다
      b.addEventListener('click', async () => {
        const id = b.dataset.del!;
        const e = shown.find((x) => x.id === id);
        const yes = await confirmBox(host, {
          title: '이 글을 지울까요?',
          body: `${e ? `Day ${e.inGameDay} 에 남긴 글입니다.
` : ''}지운 글은 되돌릴 수 없습니다.`,
          ok: '지우기',
          danger: true,
        });
        if (!yes) return;
        b.disabled = true;
        try {
          await removeEntry(id);
          await paint();
        } catch {
          b.disabled = false;
        }
      });
    }
  };

  const paintForm = (mine: Entry | null): void => {
    write.innerHTML = `
      <p class="board__who">
        <b>${esc(opts.who)}</b> 님으로 남깁니다 — 게임에서 정한 이름입니다
      </p>
      <textarea id="board-body" maxlength="${BODY_MAX}"
        placeholder="${mine ? '' : '12일 중 오늘까지, 한 줄.'}">${esc(mine?.body ?? '')}</textarea>
      <div class="board__row">
        <span class="board__count"><b id="board-n">${(mine?.body ?? '').length}</b> / ${BODY_MAX}</span>
        <button type="button" id="board-save" class="board__save">${mine ? '고쳐 붙이기' : '붙이기'}</button>
      </div>
      <p class="board__msg" id="board-msg"></p>`;

    const body = write.querySelector<HTMLTextAreaElement>('#board-body')!;
    const n = write.querySelector<HTMLElement>('#board-n')!;
    const msg = write.querySelector<HTMLElement>('#board-msg')!;
    body.addEventListener('input', () => {
      n.textContent = String(body.value.length);
    });

    write.querySelector('#board-save')!.addEventListener('click', async () => {
      msg.textContent = '붙이는 중…';
      try {
        await writeEntry(opts.state, body.value, opts.who);
        sfx('note_stick');
        await paint();
      } catch (err) {
        msg.innerHTML = failure(err as Error);
      }
    });
  };

  void paint();
}
