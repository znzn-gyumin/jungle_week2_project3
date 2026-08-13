/**
 * 배경 9장 — 경로 · 색조 · 반신 CG 의 벌.
 *
 * 정본: assets/README.md 배경 · 배경 보정
 *
 * **여기가 벌(campus / outing)도 결정합니다.** `@char` 에 벌을 적지 않고
 * 씬이 정하는데([TECH_DESIGN 3-1]), 그 씬을 가리키는 값이 `@bg` 입니다 —
 * 캠퍼스 밖 배경이 걸린 씬이 곧 명찰을 벗는 씬입니다.
 */
import type { TimeOfDay } from '../config/lighting';
/**
 * 색조 — **[lighting.ts](../config/lighting.ts) 의 다섯 시간대와 같은 말**입니다.
 *
 * 예전에는 `day | night` 둘뿐이었습니다. 타일맵은 저녁 · 심야 · 여명까지
 * 다섯 벌로 칠하는데 사진 배경만 둘로 뭉개고 있었으니, **같은 씬을 도트로
 * 보면 심야인데 사진으로 보면 낮**이었습니다.
 */
export type Tone = TimeOfDay | 'none';
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
  /**
   * **이미 어둡게 찍힌 사진**이라 색조를 절반만 겁니다.
   *
   * 타일맵과 캠퍼스 사진은 한낮 밝기가 바탕이라 밤 45% 를 그대로 걸지만,
   * `bus_night` 은 밤에 찍은 사진이라 어둠이 이미 들어 있습니다. 45% 를
   * 얹으면 하차벨과 창밖 가로등이 죽습니다 (assets/README 배경 보정).
   */
  dim?: 'soft';
  /**
   * **이 배경에서는 반신 CG 를 안 세웁니다.**
   *
   * 말하는 사람의 반신은 `@char` 없이도 자동으로 섭니다. 그런데 벌은
   * 배경이 정하는데(위 `outfit`), 5년 후 장면에는 그 벌이 없어 캠퍼스
   * 옷이 그대로 서 버립니다 — 내레이션이 「검정인데 후드가 아니다」 라고
   * 적어 둔 장면에 후드가 서는 셈입니다. 그런 배경만 여기서 막습니다.
   */
  noStanding?: boolean;
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
    dim: 'soft',
  },

  // 5년 후 — 시간대 시스템 밖이라 색조를 안 겁니다.
  //
  // **반신 CG 가 서지 않습니다.** 결말 씬은 엔딩 스틸 한 장으로 갑니다 —
  // 스틸이 인물을 이미 품고 있고, 여기 옷은 캠퍼스 벌과 외출 벌뿐인데
  // 5년 뒤에 둘 중 무엇을 입혀도 어긋납니다(내레이션이 새 옷을 따로
  // 묘사합니다 — 「검정인데 후드가 아니다」). `noStanding` 으로 못을
  // 박아 둡니다 — 스크립트에 `@char` 를 안 쓰는 것에만 기대지 않습니다.
  winebar: { path: 'bg/epilogue/winebar.webp', tone: 'none', outfit: 'campus', noStanding: true },
  gallery: { path: 'bg/epilogue/gallery.webp', tone: 'none', outfit: 'campus', noStanding: true },
  office: { path: 'bg/epilogue/office.webp', tone: 'none', outfit: 'campus', noStanding: true },
  night_window: {
    path: 'bg/epilogue/night_window.webp', tone: 'none', outfit: 'campus', noStanding: true,
  },

  // D12 수료식 — 캠퍼스 안이지만 끝났으므로 명찰을 벗습니다
  jungle_stage: {
    path: 'bg/campus/indoor/jungle_stage.webp',
    tone: 'day',
    outfit: 'outing',
  },
};

/**
 * 맵 → 그 자리의 실사 사진.
 *
 * 반신 CG 가 서는 장면은 타일맵 대신 사진을 깝니다 — 인물이 웹툰풍이라
 * 도트 위에 세우면 화풍이 튑니다. 사진은 회화풍 보정을 거칩니다.
 *
 * **여기 적힌 `tone` 은 기본값일 뿐입니다.** 실제 색조는 그 씬이 켠 곡이
 * 정합니다([Player 의 `TIME_BY_BGM`](../vn/Player.ts)) — 타일맵이 시간대를
 * 정하는 방식과 같습니다. 장소마다 시각을 못 박아 두면 **같은 교육장인데
 * 심야 씬도 한낮으로 뜹니다** — 실제로 그러고 있었습니다.
 */
export const MAP_PHOTO: Record<string, Background> = {
  m1_basecamp_4f: { path: 'bg/campus/indoor/classroom_1.webp', tone: 'day', outfit: 'campus' },
  m2_basecamp_2f: { path: 'bg/campus/indoor/opendesk.webp', tone: 'day', outfit: 'campus' },
  m3_basecamp_1f: { path: 'bg/campus/indoor/lobby.webp', tone: 'day', outfit: 'campus' },
  m4_basecamp_b1: { path: 'bg/campus/indoor/jungle_stage.webp', tone: 'day', outfit: 'campus' },
  m5_connect_garden: {
    path: 'bg/campus/outdoor/connect_garden.webp', tone: 'night', outfit: 'campus',
  },
  m6_nestcamp: { path: 'bg/campus/indoor/dormitory_room.webp', tone: 'night', outfit: 'campus' },
  m7_gate: { path: 'bg/campus/outdoor/aerial_view_1.webp', tone: 'day', outfit: 'campus' },
};
