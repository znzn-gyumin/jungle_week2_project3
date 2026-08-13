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
import { BACKGROUNDS, MAP_PHOTO, type Background, type Outfit, type Tone } from '../core/backgrounds';
import { FACE_FILE, HEROINE_BY_NAME, type Line } from '../core/types';

/** 표정을 바꿀 때 크로스페이드 120~150ms (assets/README#cg) */
const FADE_MS = 140;

/** 해가 없는 시간대 — 배경도 반신도 같이 어두워집니다 */
const dark = (t: Tone): boolean => t !== 'day' && t !== 'none';

const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

/**
 * **그 씬이 쓸 그림을 미리 읽어 둡니다.**
 *
 * 씬에 들어가는 순간 부릅니다 — 장면 전환 암전이 도는 동안(560ms)
 * 그림이 먼저 도착하면, 첫 줄에서 기다릴 일이 없습니다. 이벤트 스틸이
 * 한 박자 늦게 뜨던 것도 여기서 미리 읽어 두면 사라집니다.
 *
 * 브라우저 캐시에만 얹는 일이라 결과를 안 들고 있습니다. 실패해도
 * 조용히 넘어갑니다 — 진짜로 필요할 때 다시 읽습니다.
 */
export function warm(paths: string[]): void {
  for (const p of paths) {
    const img = new Image();
    img.src = asset(p);
  }
}

/**
 * 그 씬이 깔 **배경과 스틸**의 경로.
 *
 * 반신은 여기서 안 봅니다 — 누가 서는지가 회차의 루트와 성별로 갈려서,
 * 그건 대본을 읽을 수 있는 쪽(`Player`)이 붙입니다.
 */
export function shotsOf(lines: Line[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (l.t === 'bg') {
      const b = BACKGROUNDS[l.id];
      if (b) out.push(b.path);
    } else if (l.t === 'map') {
      const b = MAP_PHOTO[l.id];
      if (b) out.push(b.path);
    } else if (l.t === 'cg' && l.id !== 'none') {
      out.push(`cg/event/${l.id}.webp`);
    }
  }
  return out;
}

/** 그 씬의 배경이 정하는 벌 — 반신을 미리 읽을 때 씁니다 */
export function outfitOf(lines: Line[]): Outfit {
  let outfit: Outfit = 'campus';
  for (const l of lines) {
    if (l.t === 'bg') outfit = BACKGROUNDS[l.id]?.outfit ?? outfit;
    else if (l.t === 'map') outfit = MAP_PHOTO[l.id]?.outfit ?? outfit;
  }
  return outfit;
}

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
  /** 이 배경에서는 반신을 아예 안 세웁니다 (backgrounds `noStanding`) */
  private noStanding = false;
  /** 지금 반신이 화면에 있어야 하는가 — 말하는 사람이 있을 때만 참 */
  private charOn = false;
  /**
   * 그림은 비동기로 읽힙니다. **늦게 끝난 로드가 지난 결정을 되살리는
   * 것**이 이 둘로 막는 문제입니다 — 예를 들어 `@char` 가 시작한 로드가
   * 나레이션 줄보다 늦게 끝나면, 아무도 안 말했는데 반신이 떠올랐습니다.
   * 결정이 바뀔 때마다 번호를 올려서, 번호가 어긋난 콜백은 버립니다.
   */
  private charSeq = 0;
  private cgSeq = 0;
  private bgSeq = 0;

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

  /** 지금 깔린 것이 캠퍼스 사진인가 — 색조를 나중에 바꿔도 되는 배경입니다 */
  private photo = false;

  /**
   * 맵 자리의 실사 사진 — 반신이 서는 장면에서 타일맵 대신 깝니다.
   *
   * **시간대를 같이 받습니다.** 캠퍼스 사진 열여섯 장은 전부 한낮에
   * 찍혔습니다. 타일맵을 심야로 칠하는 것과 같은 이유로 사진도 칠해야
   * 하는데, 예전에는 장소마다 시각이 못 박혀 있어 **심야 교육장이 대낮**
   * 으로 떴습니다.
   */
  setMapPhoto(mapId: string, time?: Tone): void {
    const bg = MAP_PHOTO[mapId];
    if (bg) this.paint(time ? { ...bg, tone: time } : bg, true);
  }

  /**
   * 배경은 그대로 두고 **색조만** 갈아 끼웁니다.
   *
   * 대본이 `@map` 다음 줄에서 `@bgm` 을 켜는 일이 흔합니다. 그 순서면
   * 사진이 깔릴 때는 아직 이전 씬의 곡이 물려 있어 시각이 한 박자
   * 늦습니다 — 곡이 바뀔 때 여기서 따라잡습니다.
   *
   * **사진일 때만 듣습니다.** `@bg` 로 세운 배경(외출 · 에필로그)은 그
   * 시각에 찍은 사진이라 곡이 바뀐다고 낮밤이 바뀌면 안 됩니다.
   */
  setTone(time: Tone): void {
    if (!this.photo) return;
    this.root.dataset.tone = time;
    this.tintSprite = dark(time);
    this.refreshChar();
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
    this.photo = photo;
    // 캠퍼스 사진은 한낮 바탕이라 **어두운 시간대면 반신도 같이 어두워야**
    // 합니다 — 인물만 대낮이면 붙여넣은 것처럼 보입니다 (assets/README 3겹)
    this.tintSprite = bg.tintSprite === true || (photo && dark(bg.tone));
    this.noStanding = bg.noStanding === true;
    this.paintBg(asset(bg.path), photo);
    this.root.dataset.tone = bg.tone;
    this.root.dataset.dim = bg.dim ?? '';
    this.root.dataset.note = '';
    this.hideCg();
    this.refreshChar();
  }

  /**
   * **다 읽은 뒤에 갈아 끼웁니다.**
   *
   * 예전에는 `src` 만 바꾸고 그 자리에서 켰습니다. 브라우저는 그림이
   * 도착할 때까지 **아무것도 안 그리므로**, 커넥트가든(2.7MB)처럼 큰
   * 사진이 걸린 씬은 첫 몇 줄이 검은 화면 위에서 지나갔습니다 —
   * 「bg 가 초반에 안 나온다」가 이것입니다. 스틸(`setCg`)과 반신
   * (`refreshChar`)은 이미 이렇게 하고 있었고 배경만 빠져 있었습니다.
   *
   * 도착할 때까지는 **앞 배경이 그대로 있습니다.** 검은 화면보다
   * 낫습니다 — 장면 전환 암전이 그 위를 한 번 쓸고 지나갑니다.
   */
  private paintBg(src: string, photo: boolean): void {
    // 캠퍼스 사진은 원래 타일맵 레퍼런스라 배경으로 쓰면 화질이 드러납니다.
    // 더 세게 흐리고 밝게 날려 뒤로 물러나게 합니다 (assets/README 배경).
    const cls = photo ? 'stage__bg stage__bg--photo' : 'stage__bg stage__bg--paint';
    if (this.bgEl.getAttribute('src') === src && !this.bgEl.hidden) {
      // 같은 그림이라도 보정이 바뀔 수 있습니다 (사진 ↔ 그림)
      this.bgEl.className = cls;
      return;
    }
    const seq = ++this.bgSeq;
    const img = new Image();
    img.src = src;
    const show = (): void => {
      // 그 사이에 다음 씬이 왔으면 버립니다
      if (seq !== this.bgSeq) return;
      this.bgEl.src = src;
      this.bgEl.className = cls;
      this.bgEl.hidden = false;
    };
    if (img.complete) show();
    else img.addEventListener('load', show, { once: true });
  }

  /** 캠퍼스 안 — 타일맵 자리입니다 (구현 8번) */
  clearBackground(): void {
    this.bgSeq++; // 읽는 중이던 배경이 뒤늦게 켜지지 않도록
    this.bgEl.hidden = true;
    this.root.dataset.tone = 'none';
    this.photo = false;
    this.outfit = 'campus';
    this.tintSprite = false;
  }

  /** `@char 이름 위치` — 히로인 6인만 반신이 있습니다 */
  setChar(who: string, pos: 'left' | 'center' | 'right'): void {
    if (!HEROINE_BY_NAME[who]) return;
    this.who = who;
    this.root.dataset.pos = pos;
    this.refreshChar();
  }

  /**
   * 대사에 표정이 붙어 있으면 갈아 끼웁니다. 생략하면 직전 표정 유지.
   *
   * **지금 서 있는 사람만 바뀝니다.** 누가 서는지는 `speaker` 가 정하므로,
   * 반신이 없는 사람이나 `noStanding` 배경에서는 여기서 조용히 빠집니다.
   */
  setFace(who: string, face?: string): void {
    if (this.who !== who) return;
    if (face) this.face = face;
    this.refreshChar();
  }

  clearChar(): void {
    this.who = null;
    this.charOn = false;
    this.charSeq++;
    for (const el of this.chars) el.style.opacity = '0';
  }

  /**
   * **말하는 사람이 섭니다. 그리고 한 번 선 사람은 씬이 끝날 때까지 있습니다.**
   *
   * 반신은 히로인 여섯만 있습니다. 그 여섯이 말하면 가운데로 갈아 세웁니다.
   *
   * **나레이션과 주인공 대사에서는 내리지 않습니다.** 예전에는 내렸는데,
   * 명장면은 원래 나레이션이 절반이 넘습니다 — 커넥트가든 씬은 서른다섯
   * 줄 중 스물이 나레이션이라 **인물이 두 줄 보이고 세 줄 사라지기를
   * 반복**했습니다. 화면이 자꾸 비는 게 그것이었습니다. 옆에 앉아 있는
   * 사람은 내가 혼잣말을 하는 동안에도 거기 있습니다.
   *
   * **다만 아무도 말하기 전에는 세우지 않습니다.** `charOn` 이 처음부터
   * 거짓이라, 나레이션으로 시작하는 CG 컷의 첫 몇 줄은 배경만 남습니다 —
   * 그 자리에 사람이 먼저 떠오르면 「누가 있었지?」 가 됩니다.
   */
  speaker(who: string | null): void {
    // 그 벌이 맞지 않는 배경에서는 아무도 안 섭니다 (`noStanding`)
    if (this.noStanding) {
      this.charOn = false;
      this.charSeq++;
      for (const el of this.chars) el.style.opacity = '0';
      return;
    }
    // 반신이 없는 사람이 말하거나 나레이션 — **서 있던 사람을 그대로 둡니다**
    if (!who || !HEROINE_BY_NAME[who]) return;
    this.charOn = true;
    // **말하는 사람은 늘 가운데.** 한 번에 한 명만 서므로 좌우로 나눌
    // 이유가 없고, 자리가 바뀌면 시선이 따라다녀야 해서 산만합니다.
    this.root.dataset.pos = 'center';
    if (this.who !== who) {
      this.who = who;
      this.face = '기본';
    }
    this.refreshChar();
  }

  /**
   * `@cg` — 스틸이 인물을 이미 품고 있어 반신을 가립니다.
   *
   * **다 읽은 뒤에 켭니다.** 예전에는 `src` 만 갈아 끼우고 그 자리에서
   * 켰는데, 브라우저는 새 그림이 준비될 때까지 **앞 그림을 계속 그립니다** —
   * 스틸이 이어지는 구간에서 한 박자 동안 직전 컷이 남고, 아무것도 없던
   * 자리에서는 빈 칸이 스쳤습니다. 「제때 안 뜨는」 것으로 보이던 게
   * 이것입니다. 반신(`refreshChar`)이 쓰는 방식과 같게 맞췄습니다.
   */
  setCg(id: string): void {
    if (id === 'none') return this.hideCg();
    const src = asset(`cg/event/${id}.webp`);
    if (this.cgEl.getAttribute('src') === src && !this.cgEl.hidden) return;

    const seq = ++this.cgSeq;
    const img = new Image();
    img.src = src;
    const show = (): void => {
      // 그 사이에 `@cg none` 이나 다음 씬이 왔으면 버립니다
      if (seq !== this.cgSeq) return;
      this.cgEl.src = src;
      this.cgEl.hidden = false;
      for (const el of this.chars) el.classList.add('stage__char--behind');
    };
    if (img.complete) show();
    else img.addEventListener('load', show, { once: true });
  }

  private hideCg(): void {
    this.cgSeq++;
    this.cgEl.hidden = true;
    for (const el of this.chars) el.classList.remove('stage__char--behind');
  }

  /**
   * 표정 한 장을 통째로 갈아 끼우고 크로스페이드합니다 (합성이 아닙니다).
   *
   * **켤지 말지는 `charOn` 이 정합니다.** 여기서는 그림만 갈아 끼웁니다 —
   * `@char` 는 자리를 정해 두고 미리 읽어 놓는 것이지 세우는 것이 아닙니다.
   * 세우는 것은 그 사람이 말할 때 `speaker` 가 합니다.
   */
  private refreshChar(): void {
    if (!this.who || this.noStanding) return this.clearChar();
    const id = HEROINE_BY_NAME[this.who];
    const file = FACE_FILE[this.face] ?? 'normal';
    const src = asset(`cg/standing/${id}_${this.outfit}_${file}.webp`);
    // 3겹 보정은 그림이 그대로여도 씬마다 다시 정해집니다 (밤 배경 위에서만 겁니다)
    for (const el of this.chars) el.classList.toggle('stage__char--tint', this.tintSprite);

    const cur = this.chars[this.front];
    if (cur.getAttribute('src') === src && !cur.hidden) {
      // 같은 그림이라도 퇴장 뒤 재입장이면 다시 켜야 합니다 —
      // clearChar 는 불투명도만 내리고 src 는 남겨 둡니다
      cur.style.opacity = this.charOn ? '1' : '0';
      return;
    }

    const next = this.chars[1 - this.front];
    next.src = src;
    next.hidden = false;
    // 로드 전에 켜면 빈 칸이 한 박자 보입니다.
    // **늦게 끝난 로드가 지난 결정을 되살리면 안 됩니다.** 그래서 이
    // 요청의 번호를 들고 있다가, 그 사이에 다른 결정이 내려졌으면
    // (`charSeq` 가 올라갔으면) 조용히 버립니다.
    const seq = ++this.charSeq;
    const show = () => {
      if (seq !== this.charSeq) return;
      next.style.opacity = this.charOn ? '1' : '0';
      cur.style.opacity = '0';
      this.front = 1 - this.front;
    };
    if (next.complete) show();
    else next.addEventListener('load', show, { once: true });
  }
}
