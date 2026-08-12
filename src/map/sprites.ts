/**
 * `.vns` 의 한글 이름 → 도트 스프라이트와 맵 좌석.
 *
 * 좌표는 맵이 갖고 있습니다 — `npc` 레이어의 오브젝트를 `role` 로 찾습니다
 * ([TILESET_MAP_HANDOFF 3절](../../docs/reference/TILESET_MAP_HANDOFF.md)).
 * 히로인은 성별로 갈리지만 자리는 같으므로 `role` 하나로 둘을 다 가리킵니다.
 */
export type Cast = {
  /** `assets/dot/walk/{dot}.webp` */
  dot: string;
  /** 맵 `npc` 오브젝트의 `role` */
  role: string;
};

export const CAST: Record<string, Cast> = {
  민아: { dot: 'minah', role: 'heroine_sameage' },
  민규: { dot: 'mingyu', role: 'heroine_sameage' },
  승희: { dot: 'seunghee', role: 'heroine_older' },
  승민: { dot: 'seungmin', role: 'heroine_older' },
  윤정: { dot: 'yunjung', role: 'heroine_younger' },
  윤호: { dot: 'yunho', role: 'heroine_younger' },
  명진혁: { dot: 'myeongjinhyeok', role: 'coach' },
  태윤: { dot: 'taeyun', role: 'team4_lead' },
  태연: { dot: 'taeyeon', role: 'team4_lead' },
};

/** 주인공 — 얼굴은 안 나오지만 도트는 있습니다 (CHARACTERS 1절) */
export const PLAYER_DOT = { male: 'doyun', female: 'doa' } as const;

/** 룸메이트는 주인공과 같은 성별입니다 (WORLD_BIBLE 5-2) */
export const FRIEND_DOT = { male: 'jio', female: 'jia' } as const;

/** 4조 대표는 주인공과 동성입니다 (CHARACTERS 4절) */
export function scoutName(gender: 'male' | 'female'): string {
  return gender === 'male' ? '태윤' : '태연';
}

/**
 * 시트 배치 (assets/README#시트-배치)
 *   1행 아래 · 2행 왼쪽 · 3행 오른쪽 · 4행 위
 *   1열이 정지, 2~4열이 걷기 순환
 */
export const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 } as const;
export type Dir = keyof typeof DIR_ROW;

export const CELL = { w: 48, h: 64 };
/** 타일 (x,y) 에 설 때 (x*48, y*48 − 16) 에 그립니다 — 머리가 위 칸을 침범합니다 */
export const HEAD_OVERHANG = 16;
