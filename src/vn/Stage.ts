/**
 * 무대 — 배경 · 반신 CG · 이벤트 스틸.
 *
 * 정본: docs/TECH_DESIGN.md 1절(모드 표) · assets/README.md 배경 보정 · CG
 *
 * 세 겹입니다.
 *   배경   `@bg` 가 걸린 씬에만. 없으면 타일맵 자리(구현 8번)라 비워 둡니다
 *   반신   `@char` — **표정마다 파일이 따로**라 갈아 끼우고 크로스페이드합니다
 *   스틸   `@cg` — 뜨면 반신을 가리고, `@cg none`·다음 `@bg`·씬 전환에서 돌아옵니다
 */
import { BACKGROUNDS, MAP_PHOTO, type Background, type Outfit } from '../core/backgrounds';
import { FACE_FILE, HEROINE_BY_NAME } from '../core/types';

/** 표정을 바꿀 때 크로스페이드 120~150ms (assets/README#cg) */
const FADE_MS = 140;

const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export class Stage {
  private bgEl: HTMLImageElement;
  private cgEl: HTMLImageElement;
  /** 반신은 두 장을 겹쳐 두고 번갈아 켭니다 — 하드 컷이면 인물이 튑니다 */
  private chars: [HTMLImageElement, HTMLImageElement];
  private front = 0;

  private outfit: Outfit = 'campus';
  private tintSprite = false;
  private who: string | null = null;
  private face = '기본';
  /** `@char` 로 세워 둔 사람들과 그 자리 — 말하는 사람만 켜고 끕니다 */
  private cast = new Map<string, 'left' | 'center' | 'right'>();

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <img class="stage__bg" alt="" hidden />
      <img class="stage__char" alt="" hidden />
      <img class="stage__char" alt="" hidden />
      <img class="stage__cg" alt="" hidden />`;
    const [a, b] = root.querySelectorAll<HTMLImageElement>('.stage__char');
    this.bgEl = root.querySelector('.stage__bg')!;
    this.cgEl = root.querySelector('.stage__cg')!;
    this.chars = [a, b];
    for (const el of this.chars) el.style.transition = `opacity ${FADE_MS}ms ease`;
  }

  /** 맵 자리의 실사 사진 — 반신이 서는 장면에서 타일맵 대신 깝니다 */
  setMapPhoto(mapId: string): void {
    const bg = MAP_PHOTO[mapId];
    if (bg) this.paint(bg, true);
  }

  /** `@bg` — 배경이 바뀌면 스틸이 내려가고 반신이 돌아옵니다 */
  setBackground(id: string): void {
    const bg = BACKGROUNDS[id];
    if (!bg) {
      this.root.dataset.note = `배경 없음: ${id}`;
      return;
    }
    this.paint(bg);
  }

  private paint(bg: Background, photo = false): void {
    this.outfit = bg.outfit;
    this.tintSprite = bg.tintSprite === true;
    this.bgEl.src = asset(bg.path);
    this.bgEl.hidden = false;
    // 캠퍼스 사진은 원래 타일맵 레퍼런스라 배경으로 쓰면 화질이 드러납니다.
    // 더 세게 흐리고 밝게 날려 뒤로 물러나게 합니다 (assets/README 배경).
    this.bgEl.className = photo ? 'stage__bg stage__bg--photo' : 'stage__bg stage__bg--paint';
    this.root.dataset.tone = bg.tone;
    this.root.dataset.note = '';
    this.hideCg();
    this.refreshChar();
  }

  /** 캠퍼스 안 — 타일맵 자리입니다 (구현 8번) */
  clearBackground(): void {
    this.bgEl.hidden = true;
    this.root.dataset.tone = 'none';
    this.outfit = 'campus';
    this.tintSprite = false;
  }

  /** `@char 이름 위치` — 히로인 6인만 반신이 있습니다 */
  setChar(who: string, pos: 'left' | 'center' | 'right'): void {
    if (!HEROINE_BY_NAME[who]) return;
    this.cast.set(who, pos);
    this.who = who;
    this.root.dataset.pos = pos;
    this.refreshChar();
  }

  /**
   * 대사에 표정이 붙어 있으면 갈아 끼웁니다. 생략하면 직전 표정 유지.
   *
   * **`@char` 로 세운 인물만 바뀝니다.** 대사가 인물을 불러세우면 에필로그에서
   * 5년 전 옷을 입은 반신이 서게 됩니다 — 결말 씬은 `@char` 없이 히로인이
   * 말하는 것이 정본입니다 ([TECH_DESIGN 3-1]).
   */
  setFace(who: string, face?: string): void {
    if (this.who !== who) return;
    if (face) this.face = face;
    this.refreshChar();
  }

  clearChar(): void {
    this.who = null;
    this.cast.clear();
    for (const el of this.chars) el.style.opacity = '0';
  }

  /**
   * **말하는 사람만 세웁니다.** 한 씬에 둘을 세워 놓고 계속 띄워 두면
   * 누가 말하는지가 안 보입니다. 지금 말하는 사람이 이 씬에 선 사람
   * 이면 그쪽으로 갈아 세우고, 내레이션이거나 다른 사람이면 내립니다.
   */
  speaker(who: string | null): void {
    const pos = who ? this.cast.get(who) : undefined;
    if (!pos) {
      for (const el of this.chars) el.style.opacity = '0';
      return;
    }
    this.root.dataset.pos = pos;
    if (this.who !== who) {
      this.who = who;
      this.face = '기본';
    }
    this.refreshChar();
  }

  /** `@cg` — 스틸이 인물을 이미 품고 있어 반신을 가립니다 */
  setCg(id: string): void {
    if (id === 'none') return this.hideCg();
    this.cgEl.src = asset(`cg/event/${id}.webp`);
    this.cgEl.hidden = false;
    for (const el of this.chars) el.classList.add('stage__char--behind');
  }

  private hideCg(): void {
    this.cgEl.hidden = true;
    for (const el of this.chars) el.classList.remove('stage__char--behind');
  }

  /** 표정 한 장을 통째로 갈아 끼우고 크로스페이드합니다 (합성이 아닙니다) */
  private refreshChar(): void {
    if (!this.who) return this.clearChar();
    const id = HEROINE_BY_NAME[this.who];
    const file = FACE_FILE[this.face] ?? 'normal';
    const src = asset(`cg/standing/${id}_${this.outfit}_${file}.webp`);
    // 3겹 보정은 그림이 그대로여도 씬마다 다시 정해집니다 (밤 배경 위에서만 겁니다)
    for (const el of this.chars) el.classList.toggle('stage__char--tint', this.tintSprite);

    const cur = this.chars[this.front];
    if (cur.getAttribute('src') === src && !cur.hidden) {
      // 같은 그림이라도 퇴장 뒤 재입장이면 다시 켜야 합니다 —
      // clearChar 는 불투명도만 내리고 src 는 남겨 둡니다
      cur.style.opacity = '1';
      return;
    }

    const next = this.chars[1 - this.front];
    next.src = src;
    next.hidden = false;
    // 로드 전에 켜면 빈 칸이 한 박자 보입니다
    const show = () => {
      next.style.opacity = '1';
      cur.style.opacity = '0';
      this.front = 1 - this.front;
    };
    if (next.complete) show();
    else next.addEventListener('load', show, { once: true });
  }
}
