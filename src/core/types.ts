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

/**
 * 역할 예약 이름 — 공용 씬에서 씁니다.
 *
 * 히로인 3인은 `playerGender` 의 **반대 성별**입니다. 공용 씬에 인물
 * 이름을 박으면 한쪽 성별 회차에 반대편 사람이 나옵니다 — `c2_ranking`
 * 이 그랬습니다. `동갑` `연상` `연하` 로 적고 여기서 바꿉니다.
 */
export const ROLE_CAST: Record<string, { male: RouteId; female: RouteId }> = {
  //          남주가 만나는 사람   여주가 만나는 사람
  동갑: { male: 'minah', female: 'mingyu' },
  연상: { male: 'seunghee', female: 'seungmin' },
  연하: { male: 'yunjung', female: 'yunho' },
};

/**
 * 인물별 테마 컬러 (CHARACTERS 2절 · 동물상에서 온 색).
 *
 * 여섯의 **명도를 비슷한 대역**에 둔 이유가 있습니다 — 심야 배경에서
 * 어두운 색은 묻히기 때문입니다. 그대로 씁니다.
 */
/**
 * 주인공의 테마색. 히로인 여섯 중 검정을 쓰는 인물이 없어 겹치지 않습니다.
 * 미니맵의 계단도 같은 계열(#2a2632)이지만 계단은 네모, 주인공은 흰 테두리
 * 동그라미라 모양으로 갈라집니다.
 */
export const PLAYER_THEME = '#1E1B26';

export const THEME: Record<RouteId, string> = {
  minah: '#3A9B96',    // 고양이 · 청록
  seunghee: '#B5806F', // 사슴 · 적갈
  yunjung: '#E0A230',  // 강아지 · 금빛
  mingyu: '#4E6288',   // 늑대 · 회청
  seungmin: '#5F8F42', // 공룡 · 초록
  yunho: '#C9A170',    // 강아지 · 크림
};

/** 히로인 풀네임 */
/**
 * 화면에 띄울 이름. 대본에서는 짧은 이름으로 부르고 여기서만 붙입니다 —
 * 대사 줄의 화자 자리는 공백을 못 받습니다.
 */
const LABEL: Record<string, string> = { 명진혁: '명진혁 코치' };

/** 이 사람을 화면에 뭐라고 적을지 */
export function label(who: string): string {
  return LABEL[who] ?? who;
}

export const FULL_NAME: Record<RouteId, string> = {
  minah: '김민아',
  seunghee: '이승희',
  yunjung: '장윤정',
  mingyu: '김민규',
  seungmin: '이승민',
  yunho: '장윤호',
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
  /** 캠퍼스 안 씬의 무대 — 그 맵을 대사창 뒤에 깝니다 (TECH_DESIGN 1절 모드 표) */
  | { t: 'map'; id: MapId; x: number; y: number }
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
