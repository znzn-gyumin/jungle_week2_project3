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
 * 주인공의 테마색.
 *
 * 도트 옷은 짙은 무채색(이도윤 #2B2B2B · 이도아 #3A3839)인데 그 색을
 * 그대로 쓰면 미니맵에서 안 보입니다 — 계단이 검은 네모고, 이제 맵에
 * 선 사람이 다 점으로 찍히기 때문입니다. **눈에 띄는 쪽을 고릅니다.**
 *
 * 히로인 여섯(청록 · 로지브라운 · 앰버 · 네이비 · 그린 · 탠)과 서브
 * 일곱 중 어느 것과도 안 겹치는 밝은 하늘색입니다. 성별로 나누지
 * 않습니다 — 주인공은 늘 한 명이라 점 하나가 같은 뜻이어야 합니다.
 */
export const PLAYER_THEME = '#5AA9E6';

/**
 * **이 사람의 색.** 대사창 틀·이름·세로 바, 미니맵의 느낌표·점·이름
 * 카드, 도트맵 머리 위 표시가 전부 이 함수 하나를 봅니다 — 세 군데서
 * 각자 고르면 같은 사람이 화면마다 다른 색으로 뜹니다.
 *
 * 이름을 못 찾으면 무명 색(내레이션과 같은 값)으로 떨어집니다.
 */
export function themeOf(who: string | null | undefined): string {
  if (!who) return SUB_THEME.무명;
  if (who === '나') return PLAYER_THEME;
  const id = HEROINE_BY_NAME[who];
  if (id) return THEME[id];
  return SUB_THEME[who] ?? SUB_THEME.무명;
}

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

/** 룸메이트는 주인공과 같은 성별입니다 (WORLD_BIBLE 5-2) */
export const FRIEND_NAME = { male: '한지오', female: '한지아' } as const;

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
  /** 배정받은 교육장. 4층에 403 · 405 두 개가 있습니다 (WORLD_BIBLE 3절) */
  playerRoom: '403' | '405';

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
