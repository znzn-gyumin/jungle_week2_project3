/**
 * 씬 데이터와 게임 상태의 타입.
 *
 * 정본: docs/TECH_DESIGN.md 3절(DSL) · 5절(GameState)
 */

export type RouteId = 'minah' | 'seunghee' | 'yunjung' | 'mingyu' | 'seungmin' | 'yunho';

export type MapId =
  | 'm1_basecamp_4f'
  | 'm2_basecamp_2f'
  | 'm3_basecamp_1f'
  | 'm4_basecamp_b1'
  | 'm5_connect_garden'
  | 'm6_nestcamp'
  | 'm7_gate';

/** 히로인 성별 — 자유 이동 배치와 루트 선택지를 이걸로 거릅니다 */
export const HEROINE_GENDER: Record<RouteId, 'female' | 'male'> = {
  minah: 'female',
  seunghee: 'female',
  yunjung: 'female',
  mingyu: 'male',
  seungmin: 'male',
  yunho: 'male',
};

/** `.vns` 의 한글 이름 → RouteId */
export const HEROINE_BY_NAME: Record<string, RouteId> = {
  민아: 'minah',
  승희: 'seunghee',
  윤정: 'yunjung',
  민규: 'mingyu',
  승민: 'seungmin',
  윤호: 'yunho',
};

/** RouteId → `.vns` 의 한글 이름. `@char *` 를 풀 때 씁니다 */
export const NAME_BY_HEROINE: Record<RouteId, string> = {
  minah: '민아',
  seunghee: '승희',
  yunjung: '윤정',
  mingyu: '민규',
  seungmin: '승민',
  yunho: '윤호',
};

/** `.vns` 의 한글 표정 → 파일명 (assets/README#id) */
export const FACE_FILE: Record<string, string> = {
  기본: 'normal',
  기쁨: 'happy',
  부끄러움: 'shy',
  슬픔: 'sad',
  놀람: 'surprise',
  화남: 'angry',
};

export type Effects = { affection?: number; skill?: number };

export type ChoiceOption = {
  text: string;
  effects: Effects;
  /** `flag:이름` 또는 `affection>=40` */
  cond?: string;
  target: string;
  /** 히로인으로 갈리는 선택지 — playerGender 의 반대 성별만 남깁니다 */
  heroine?: RouteId;
};

export type FreeroamNpc = { who: string; map: MapId; target: string; heroine?: RouteId };

export type Line =
  | { t: 'say'; who: string; face?: string; text: string; cond?: string }
  | { t: 'narr'; text: string; cond?: string }
  | { t: 'bg' | 'bgm' | 'se' | 'cg'; id: string }
  | { t: 'char'; who: string; pos: 'left' | 'center' | 'right' }
  | { t: 'charOut' }
  | { t: 'choice'; options: ChoiceOption[] }
  | { t: 'flag'; op: 'set' | 'clear'; id: string }
  | { t: 'jump'; target: string }
  | {
      t: 'freeroam';
      id: string;
      limit: number;
      spawn: { map: MapId; x: number; y: number };
      npcs: FreeroamNpc[];
      triggers: { map: MapId; target: string }[];
      after: string;
    };

export type Scene = {
  id: string;
  lines: Line[];
  /** 라벨 → lines 인덱스. 점프가 O(1) 이고 세이브 복원도 두 값이면 끝납니다 */
  labels: Record<string, number>;
};

export type ScriptData = Record<string, Scene>;

export type GameState = {
  playerGender: 'male' | 'female';
  playerFamilyName: string;
  playerGivenName: string;

  route: RouteId | null;
  affection: number;
  skill: number;

  chapter: number;
  chapterDay: number;
  dateSpot?: 'folkvillage' | 'everland' | 'collegetown';

  map: MapId;
  pos: { x: number; y: number };
  talksLeft: number;
  metThisRoam: string[];

  flags: Set<string>;

  cursor: { sceneId: string; lineIndex: number };
};
