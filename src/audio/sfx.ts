/**
 * 효과음 — **짧고 겹쳐 나는 소리.**
 *
 * 곡(`bgm.ts`)과 달리 `<audio>` 를 안 씁니다. 같은 소리가 연달아 날 때
 * `<audio>` 는 앞 재생을 끊고 처음으로 돌아가서, 발소리처럼 겹쳐야 하는
 * 소리가 뚝뚝 끊깁니다. Web Audio 로 한 번 읽어 두고 **재생할 때마다
 * 새 노드를 띄웁니다** — 몇 개가 겹치든 서로 안 건드립니다.
 *
 * 파일은 `public/audio/sfx/` 에 있고 `tools/gen_sfx.py` 가 만듭니다.
 * 전부 −18 dBFS 로 맞춰 뽑아서 **여기서 소리마다 크기를 재보정하지
 * 않습니다** — 파일이 이미 같은 크기입니다.
 */

/**
 * 전체 크기 — **곡보다 위에 둡니다** (BGM 0.42).
 *
 * 효과음은 조작에 대한 대답이라 곡에 묻히면 눌렸는지가 안 읽힙니다.
 * 곡은 계속 깔리는 배경이고 효과음은 순간이라, 같은 값이면 효과음 쪽이
 * 훨씬 작게 들립니다.
 *
 * 파일이 −18 dBFS 라 여기서 0.9 까지 올려도 뭉개지지 않습니다 — 최고점이
 * 0.11 이라 아직 한참 남습니다.
 */
let VOLUME = 0.9;
const VOL_KEY = 'junglover.sfxVolume';
try {
  // **`Number(null)` 은 0 입니다.** 저장된 값이 없을 때 그대로 넣으면
  // 볼륨이 0 으로 떨어져 게임이 통째로 무음이 됩니다 — 먼저 있는지 봅니다.
  const raw = localStorage.getItem(VOL_KEY);
  const v = raw === null ? NaN : Number(raw);
  if (Number.isFinite(v) && v >= 0 && v <= 1) VOLUME = v;
} catch {
  /* 저장이 막혀도 기본값으로 돕니다 */
}

export function volume(): number {
  return VOLUME;
}

export function setVolume(v: number): void {
  VOLUME = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(VOL_KEY, String(VOLUME));
  } catch {
    /* 이번 판에는 적용됩니다 */
  }
  if (master && !muted) master.gain.value = VOLUME;
}
const MUTE_KEY = 'junglover.sfxMuted';

export type SfxId =
  | 'ui_tick' | 'ui_move' | 'ui_select' | 'ui_back' | 'ui_hover' | 'ui_talk'
  | 'ui_error' | 'ui_open' | 'ui_close' | 'choice_show'
  | 'transition' | 'door' | 'stairs' | 'step_a' | 'step_b' | 'step_c'
  | 'board_open' | 'note_stick' | 'book_open' | 'page_turn'
  | 'save_chime' | 'login_ok' | 'unlock' | 'ending';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* 사생활 보호 모드 — 그냥 켜 둡니다 */
}

function url(id: string): string {
  return `${import.meta.env.BASE_URL}audio/sfx/${id}.wav`;
}

/**
 * **사람이 한 번 건드리기 전에는 소리를 못 냅니다.** 브라우저가 막아
 * 둔 오디오를 첫 입력 때 깨웁니다 — 곡 쪽과 같은 규칙입니다.
 */
function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctx =
    window.AudioContext ??
    (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  return ctx;
}

window.addEventListener('pointerdown', () => void audio()?.resume(), { once: true });
window.addEventListener('keydown', () => void audio()?.resume(), { once: true });

async function load(id: string): Promise<AudioBuffer | null> {
  const have = buffers.get(id);
  if (have) return have;
  const busy = loading.get(id);
  if (busy) return busy;
  const c = audio();
  if (!c) return null;
  const job = fetch(url(id))
    .then((r) => r.arrayBuffer())
    .then((b) => c.decodeAudioData(b))
    .then((buf) => {
      buffers.set(id, buf);
      return buf;
    })
    .catch(() => null);
  loading.set(id, job);
  return job;
}

/** 자주 쓰는 것을 미리 읽어 둡니다 — 첫 소리가 늦게 나면 안 눌린 줄 압니다 */
export function preload(...ids: SfxId[]): void {
  for (const id of ids) void load(id);
}

/**
 * 한 번 냅니다.
 *
 * `rate` 로 높이를 조금 흔들 수 있습니다 — **같은 소리를 반복하면
 * 기계처럼 들립니다.** 발소리처럼 연달아 나는 것에 씁니다.
 */
export function play(id: SfxId, opts: { volume?: number; rate?: number } = {}): void {
  if (muted) return;
  const c = audio();
  if (!c || !master) return;
  void load(id).then((buf) => {
    if (!buf || muted || !ctx || !master) return;
    // 막혀 있으면 깨웁니다 — 첫 입력 뒤에도 탭을 옮기면 다시 멈춥니다
    if (ctx.state === 'suspended') void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    if (opts.volume !== undefined) {
      const g = ctx.createGain();
      g.gain.value = opts.volume;
      src.connect(g).connect(master);
    } else {
      src.connect(master);
    }
    src.start();
  });
}

/** 발소리처럼 **돌려 쓰는** 소리 — 높이까지 조금씩 흔듭니다 */
let stepTurn = 0;
export function step(): void {
  const ids: SfxId[] = ['step_a', 'step_b', 'step_c'];
  play(ids[stepTurn++ % ids.length], { rate: 0.94 + ((stepTurn * 37) % 13) / 100 });
}

/**
 * **버튼은 전부 소리가 납니다.** 누를 때마다 코드에서 하나씩 걸면 새로
 * 만든 버튼에서 빠지기 마련이라, 문서 한 곳에서 받아 처리합니다.
 *
 *   · `pointerdown` 입니다 — `click` 보다 한 박자 빨라 손맛이 붙습니다
 *   · 꺼진 버튼은 조용합니다 — 안 눌리는 것에 소리가 나면 눌린 줄 압니다
 *   · `data-nosfx` 가 붙은 버튼은 **자기 소리를 따로 갖고 있습니다**
 *     (도감 펼치기 · 장 넘기기 · 창 닫기 …). 여기서 또 내면 두 소리가
 *     겹쳐 뭉갭니다.
 */
export function mountClickSfx(): void {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        'button, [role="button"], a[href]',
      ) as HTMLButtonElement | null;
      if (!el || el.disabled || el.hasAttribute('data-nosfx')) return;
      play('ui_select');
    },
    true,
  );
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(on: boolean): void {
  muted = on;
  if (master) master.gain.value = on ? 0 : VOLUME;
  try {
    localStorage.setItem(MUTE_KEY, on ? '1' : '0');
  } catch {
    /* 저장이 막혀도 이번 판에는 적용됩니다 */
  }
}
