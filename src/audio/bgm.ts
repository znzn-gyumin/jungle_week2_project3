/**
 * 배경음악.
 *
 * 곡 여덟은 `public/audio/bgm/` 에 있고 그 파일 이름이 그대로 `@bgm` 의
 * 값입니다 (WORLD_BIBLE 10-1). 같은 곡을 다시 걸면 아무 일도 안 합니다 —
 * 씬이 바뀔 때마다 처음부터 다시 틀면 장면이 이어지는 느낌이 끊깁니다.
 *
 * **브라우저는 사람이 한 번 건드리기 전에는 소리를 안 냅니다.** 그래서
 * 재생이 막히면 조용히 접어 두었다가, 첫 클릭·키 입력에 다시 겁니다.
 */
const VOLUME = 0.42;
const FADE_MS = 700;

let el: HTMLAudioElement | null = null;
let now = '';
/** 소리가 막혀 못 튼 곡 — 첫 입력 때 이걸 겁니다 */
let pending = '';
let unlocked = false;

function url(id: string): string {
  return `${import.meta.env.BASE_URL}audio/bgm/${id}.mp3`;
}

/** 사람이 처음 화면을 건드리면 막혔던 곡을 겁니다 */
function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  if (pending) {
    const id = pending;
    pending = '';
    now = '';
    play(id);
  }
}
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

/** 이 곡으로 갈아탑니다. 이미 같은 곡이면 그대로 둡니다. */
export function play(id: string): void {
  if (!id || id === now) return;
  now = id;
  const next = new Audio(url(id));
  next.loop = true;
  next.volume = 0;
  const old = el;
  el = next;
  next
    .play()
    .then(() => {
      fade(next, VOLUME);
      if (old) fade(old, 0, () => old.pause());
    })
    .catch(() => {
      // 아직 소리를 낼 수 없습니다 — 첫 입력 때 다시 겁니다
      pending = id;
      now = '';
    });
}

/** 소리를 끕니다 (엔딩 정적 등) */
export function stop(): void {
  now = '';
  if (el) fade(el, 0, () => el?.pause());
}

function fade(a: HTMLAudioElement, to: number, done?: () => void): void {
  const from = a.volume;
  const t0 = performance.now();
  const tick = (t: number): void => {
    const k = Math.min(1, (t - t0) / FADE_MS);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(tick);
    else done?.();
  };
  requestAnimationFrame(tick);
}
