/**
 * 로그인 화면 — **타이틀 앞에 섭니다.**
 *
 * 정본: docs/GAME_DESIGN.md 2-5 · docs/TECH_DESIGN.md 4-1
 *
 * 게스트 플레이는 없습니다. 진행 상황이 계정에 붙어야 기기 간 이어하기가
 * 되고, 방명록 글에 실제 계정이 실립니다.
 *
 * **다만 Firebase 설정이 아직 없으면 통과시킵니다.** 프로젝트를 만들기
 * 전에도 시나리오와 맵은 손볼 수 있어야 하기 때문입니다. 설정이 채워지는
 * 순간 이 뒷문은 저절로 닫히고 로그인이 필수가 됩니다.
 */
import { canSignIn, currentSession, restore, signIn, type Session } from '../core/auth';
import { mergeLocal } from '../core/gallery';
import { play as sfx } from '../audio/sfx';

const HOW = `
  <ol class="login__how">
    <li>Firebase 콘솔에서 프로젝트를 만듭니다</li>
    <li>Authentication → 로그인 방법 → <b>Google</b> 사용 설정</li>
    <li>프로젝트 설정 → 내 앱 → 웹 앱 추가 → SDK 구성 값 복사</li>
    <li>저장소 루트의 <code>.env.example</code> 을 <code>.env</code> 로
        복사해 값을 채우고 개발 서버를 다시 켭니다</li>
  </ol>`;

/**
 * 로그인이 끝나면 풀립니다. 이미 로그인돼 있으면 화면을 안 그리고 바로
 * 넘어갑니다 — 새로고침할 때마다 로그인 화면이 번쩍이면 안 됩니다.
 */
export async function requireLogin(): Promise<Session | null> {
  if (!canSignIn()) return null; // 설정 없음 — 뒷문으로 통과
  const already = (await restore()) ?? currentSession();
  if (already) return already;

  return new Promise<Session | null>((resolve) => {
    // **타이틀 위에 겹칩니다.** 화면을 통째로 갈아 끼우면 로고와 배경이
    // 사라졌다 돌아와서, 엔터를 누른 흐름이 끊깁니다.
    // **이름 정하는 장과 같은 옷을 입힙니다.** 시작 화면 세 장이 하나의
    // 의식처럼 이어져야 하는데, 여기만 다른 카드가 뜨면 그 흐름이 끊깁니다.
    // 그래서 새 모양을 만들지 않고 `boot__panel` 한 벌을 그대로 씁니다.
    const app = document.createElement('div');
    app.className = 'gate';
    app.tabIndex = -1;
    document.body.append(app);
    // **이름 정하는 장과 같은 옷을 입힙니다.** 시작 화면 여러 장이 하나의
    // 의식처럼 이어져야 하는데, 여기만 다른 카드가 뜨면 그 흐름이 끊깁니다.
    // 그래서 새 모양을 만들지 않고 `boot__panel` 한 벌을 그대로 씁니다.
    //
    // 버튼 모양만 예외입니다 — 구글이 정한 그대로 씁니다
    // (`assets/ui/login_google.png`). 어느 서비스에서나 같은 모양이라
    // 설명 없이 읽히는 게 이 버튼의 값입니다.
    app.innerHTML = `
      <div class="boot__panel">
        <p class="boot__step">시작하기</p>
        <h2 class="boot__head">Google 로 로그인해 주세요</h2>
        <p class="boot__hint">
          진행 상황은 브라우저가 아니라 계정에 저장됩니다 — 다른 기기에서도 이어집니다.
        </p>
        <div class="boot__form">
          <button class="gate__signin" id="login-go" type="button"
                  aria-label="Google 계정으로 로그인">
            <img src="${import.meta.env.BASE_URL}assets/ui/login_google.png"
                 alt="Sign in with Google" />
          </button>
        </div>
        <!--
          **비워 둡니다.** 여기는 원래 방명록 이름 안내가 있던 자리인데,
          로그인하는 사람에게는 아직 없는 화면 이야기라 치웠습니다.
          다만 칸 자체는 남깁니다 — 「창을 여는 중…」과 실패 사유가
          들어올 자리입니다. 비어 있는 동안은 CSS 가 접습니다.
        -->
        <p class="boot__hint" id="login-note"></p>
      </div>`;
    app.focus();

    // ESC 로 물러납니다 — 로고 화면으로 돌아갑니다
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      app.remove();
      resolve(null);
    };
    window.addEventListener('keydown', onKey, true);

    const btn = app.querySelector<HTMLButtonElement>('#login-go')!;
    const note = app.querySelector<HTMLElement>('#login-note')!;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      note.textContent = '창을 여는 중…';
      try {
        const s = await signIn();
        sfx('login_ok');
        window.removeEventListener('keydown', onKey, true);
        // 로그인 전에 본 엔딩을 계정으로 옮깁니다 — 안 하면 통째로 사라집니다
        await mergeLocal().catch(() => undefined);
        app.remove();
        resolve(s);
      } catch (err) {
        btn.disabled = false;
        // 팝업을 스스로 닫은 것은 실패가 아니라 취소입니다
        const code = (err as { code?: string }).code ?? '';
        note.innerHTML = code.includes('popup-closed')
          ? '창을 닫으셨습니다. 다시 눌러 주세요.'
          : `로그인에 실패했습니다 — ${(err as Error).message}`;
      }
    });
  });
}

/** 설정이 없을 때 타이틀 위에 띄우는 한 줄 — 무엇을 해야 하는지 적습니다 */
export function configNotice(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'login__missing';
  el.innerHTML = `
    <p><b>Firebase 설정이 없어 로그인·저장·방명록이 잠겨 있습니다.</b></p>
    ${HOW}`;
  return el;
}
