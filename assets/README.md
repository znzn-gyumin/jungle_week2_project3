# assets — 게임이 읽는 것

**여기 있는 것만 배포됩니다.** 원본과 제작 자료는 [`docs/reference/`](../docs/reference/)에 있고 배포되지 않습니다.

| 폴더 | 개수 | 이름 규칙 |
|---|---|---|
| [`cg/`](./cg/) | **90** | `cg_{id}_{casual\|outing}_{expr}.png` 72<br>`cg_{id}_still_{garden\|climax\|ending}.png` 18 |
| [`sprite/`](./sprite/) | **54** | `sprite_{id}.png` 18 — 192×256 시트<br>`face_{id}_{expr}.png` 36 — 48×64 감정 아바타 |
| [`bg/`](./bg/) | **9** | `bg_{name}.png` |
| [`map/`](./map/) | 7 | `m{n}_{name}.json` — Tiled |
| [`tilesets/`](./tilesets/) | 11 | `tileset_{name}.png` + `.tsj` + `.index.json` |
| [`ui/`](./ui/) | 2 | `logo.png` · `intro.png` |

---

## id

**히로인 6** — `minah` `seunghee` `yunjung` `mingyu` `seungmin` `yunho`

**도트 전용 12** — `doyun` `doa` `jio` `jia` `myeongjinhyeok` `jomin` `taeyun` `taeyeon` `yeosanim` `mob_a` `mob_b` `mob_c`

**표정 6** — `normal` `happy` `shy` `sad` `surprise` `angry`

## 배경 9

| 파일 | 쓰이는 곳 |
|---|---|
| `bg_folkvillage` `bg_everland` `bg_collegetown` | D7 외출 3곳 |
| `bg_bus_night` | 귀소 버스 — 3장소 공통 |
| `bg_5y_winebar` | 5년 후 — 민아 · 민규 (True/Good) |
| `bg_5y_gallery` | 5년 후 — 승희 · 윤정 (True/Good) |
| `bg_5y_office` | 5년 후 — 승민 · 윤호 (True/Good) |
| `bg_5y_night_window` | 5년 후 — **Normal 6종 + 솔로 공통** |
| `bg_ceremony.jpg` | D12 수료식 — 6루트 공통 |

## 스프라이트 시트

**4열 × 4행, 셀 48 × 64px.**

| | 1열 | 2열 | 3열 | 4열 |
|---|---|---|---|---|
| **1행** | 아래 정지 | 걷기1 | 걷기2 | 걷기3 |
| **2행** | 왼쪽 | | | |
| **3행** | 오른쪽 | | | |
| **4행** | 위 | | | |

걷기는 **`2 → 3 → 4` 순환**입니다. 멈추면 1열. 타일 `(x, y)`에 그릴 때 좌표는 **`(x*48, y*48 − 16)`** — 폭은 타일 한 칸이고 세로만 1.33칸이라 머리가 위 칸을 침범합니다.

사양은 [`SPRITE_SPEC.md`](../docs/reference/character/SPRITE_SPEC.md).

---

## 용량

현재 **PNG 그대로**라 CG 90장이 117MB입니다. **웹 배포 전에 WebP 변환이 필요합니다** — q90이면 ~11MB로 내려갑니다. 도트는 무손실이어야 하므로 PNG를 유지합니다.

원본은 [`docs/reference/character/cuts/`](../docs/reference/character/cuts/)와 [`sheets/`](../docs/reference/character/sheets/)에 남아 있어, 변환 후에도 되돌릴 수 있습니다.
