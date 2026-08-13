/**
 * 배경음악.
 *
 * 곡 여덟은 `public/audio/bgm/` 에 있고 그 파일 이름이 그대로 `@bgm` 의
 * 값입니다 (WORLD_BIBLE 10-1). 같은 곡을 다시 걸면 아무 일도 안 합니다 —
 * 씬이 바뀔 때마다 처음부터 다시 틀면 장면이 이어지는 느낌이 끊깁니다.
 *
 * **음량은 곡마다 다릅니다.** 받아온 곡을 그대로 틀면 어떤 장면은 작고
 * 어떤 장면은 귀가 아픕니다. 처음 걸 때 그 곡의 실효값(RMS)을 재고
 * `day` 와 같아지도록 게인을 잡습니다 — 파일은 안 건드립니다.
 *
 * **브라우저는 사람이 한 번 건드리기 전에는 소리를 안 냅니다.** 그래서
 * 재생이 막히면 조용히 접어 두었다가, 첫 클릭·키 입력에 다시 겁니다.
 */
const VOL_KEY = 'junglover.bgmVolume';

/**
 * 기준 크기. **곡마다 다시 재서 여기에 맞춥니다** (아래 `gainOf`).
 * 설정에서 바꾸면 지금 흐르는 곡에도 곧바로 걸립니다.
 */
let VOLUME = 0.42;
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

/**
 * 크기를 바꿉니다 — **지금 흐르는 곡에 바로 걸립니다.** 다음 곡부터
 * 적용되면 슬라이더를 움직여도 아무 일이 없어 고장으로 보입니다.
 */
export function setVolume(v: number): void {
  VOLUME = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(VOL_KEY, String(VOLUME));
  } catch {
    /* 이번 판에는 적용됩니다 */
  }
  if (el && now) void gainOf(now).then((g) => { if (el) el.volume = Math.min(1, VOLUME * g); });
}
const FADE_MS = 700;
/** 음량을 맞출 기준 곡 */
const REFERENCE = 'day';

let el: HTMLAudioElement | null = null;
let now = '';
/** 소리가 막혀 못 튼 곡 — 첫 입력 때 이걸 겁니다 */
let pending = '';
let unlocked = false;

/** 곡별 실효값. 기준 곡을 나눠 게인을 냅니다. */
const rms = new Map<string, number>();
let refRms = 0;

function url(id: string): string {
  return `${import.meta.env.BASE_URL}audio/bgm/${id}.mp3`;
}

/**
 * 그 곡의 실효값을 잽니다. 한 번 재면 기억해 둡니다.
 *
 * 전체를 다 훑으면 오래 걸리므로 앞 60초만 봅니다 — 루프곡이라 그 안에
 * 곡의 성격이 다 들어 있습니다.
 */
async function measure(id: string): Promise<number> {
  const known = rms.get(id);
  if (known) return known;
  try {
    const buf = await fetch(url(id)).then((r) => r.arrayBuffer());
    const Ctx = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = await new Ctx().decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const upto = Math.min(data.length, audio.sampleRate * 60);
    let sum = 0;
    // 200 샘플에 하나씩만 봐도 실효값은 충분히 정확합니다
    let n = 0;
    for (let i = 0; i < upto; i += 200) {
      sum += data[i] * data[i];
      n++;
    }
    const v = Math.sqrt(sum / Math.max(1, n));
    rms.set(id, v);
    return v;
  } catch {
    rms.set(id, 0);
    return 0;
  }
}

/** 기준 곡과 같은 크기로 들리게 하는 배수 */
async function gainOf(id: string): Promise<number> {
  if (id === REFERENCE) return 1;
  if (!refRms) refRms = await measure(REFERENCE);
  const mine = await measure(id);
  if (!refRms || !mine) return 1;
  // 지나치게 밀어 올리거나 죽이지 않게 묶습니다
  return Math.max(0.35, Math.min(2.6, refRms / mine));
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
    .then(async () => {
      // **먼저 들리게 하고 나서 크기를 맞춥니다.** 예전에는 실효값을
      // 다 잰 뒤에 소리를 올렸는데, 재려면 파일을 통째로 받아 디코드해야
      // 해서 10MB 짜리 곡(`tension`·`midnight`)은 앞부분이 몇 초씩
      // 무음이었습니다. 기본 크기로 먼저 올리고, 잰 값이 오면 그때 손봅니다.
      fade(next, VOLUME);
      if (old) fade(old, 0, () => old.pause());
      const top = Math.min(1, VOLUME * (await gainOf(id)));
      // 재는 사이에 다음 곡으로 넘어갔으면 이 곡은 버립니다
      if (el !== next) return;
      if (Math.abs(top - next.volume) > 0.02) fade(next, top);
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
