/**
 * 배경 9장 — 경로 · 색조 · 반신 CG 의 벌.
 *
 * 정본: assets/README.md 배경 · 배경 보정
 *
 * **여기가 벌(campus / outing)도 결정합니다.** `@char` 에 벌을 적지 않고
 * 씬이 정하는데([TECH_DESIGN 3-1]), 그 씬을 가리키는 값이 `@bg` 입니다 —
 * 캠퍼스 밖 배경이 걸린 씬이 곧 명찰을 벗는 씬입니다.
 */
export type Tone = 'day' | 'night' | 'none';
export type Outfit = 'campus' | 'outing';

export type Background = {
  /** `assets/` 아래 경로 */
  path: string;
  /** 2겹 색조 */
  tone: Tone;
  /** 이 배경이 걸린 씬에서 반신 CG 가 입는 벌 */
  outfit: Outfit;
  /** 반신 CG 에도 배경과 같은 색을 절반 세기로 겁니다 (3겹) */
  tintSprite?: boolean;
};

export const BACKGROUNDS: Record<string, Background> = {
  // D7 외출 — 캠퍼스 밖이라 명찰이 없습니다
  folkvillage: { path: 'bg/outing/folkvillage.webp', tone: 'day', outfit: 'outing' },
  everland: { path: 'bg/outing/everland.webp', tone: 'day', outfit: 'outing' },
  collegetown: { path: 'bg/outing/collegetown.webp', tone: 'day', outfit: 'outing' },
  bus_night: {
    path: 'bg/outing/bus_night.webp',
    tone: 'night',
    outfit: 'outing',
    tintSprite: true,
  },

  // 5년 후 — 시간대 시스템 밖이라 색조를 안 겁니다.
  // 반신 CG 도 서지 않습니다(엔딩 스틸이 인물을 품습니다) — 스크립트에 `@char` 가 없습니다.
  winebar: { path: 'bg/epilogue/winebar.webp', tone: 'none', outfit: 'campus' },
  gallery: { path: 'bg/epilogue/gallery.webp', tone: 'none', outfit: 'campus' },
  office: { path: 'bg/epilogue/office.webp', tone: 'none', outfit: 'campus' },
  night_window: { path: 'bg/epilogue/night_window.webp', tone: 'none', outfit: 'campus' },

  // D12 수료식 — 캠퍼스 안이지만 끝났으므로 명찰을 벗습니다
  jungle_stage: {
    path: 'bg/campus/indoor/jungle_stage.webp',
    tone: 'day',
    outfit: 'outing',
  },
};
