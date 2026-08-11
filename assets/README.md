# assets — 게임 에셋

**폴더가 맥락을 줍니다.** 그래서 파일명에 `cg_` `sprite_` 같은 접두어를 붙이지 않습니다.

```
assets/
├─ cg/
│    portrait/   {id}_{casual|outing}_{expr}.png   72   반신, 대화 중 계속
│    still/      {id}_{garden|climax|ending}.png   18   명장면, 화면 전체
├─ sprite/
│    walk/       {id}.png                          18   192×256 시트
│    face/       {id}_{expr}.png                   36   48×64 감정 아바타
├─ bg/
│    outing/     4    D7 캠퍼스 밖
│    epilogue/   4    5년 후
│    campus/indoor/   11 · outdoor/ 6    캠퍼스 사진
├─ map/          7    Tiled json
├─ tilesets/     11   png + tsj + index
└─ ui/           2    logo · intro
```

---

## id

**히로인 6** — `minah` `seunghee` `yunjung` `mingyu` `seungmin` `yunho`

**도트 전용 12** — `doyun` `doa` `jio` `jia` `myeongjinhyeok` `jomin` `taeyun` `taeyeon` `yeosanim` `mob_a` `mob_b` `mob_c`

**표정 6** — `normal` `happy` `shy` `sad` `surprise` `angry`

## 배경

| | 파일 | 쓰이는 곳 |
|---|---|---|
| `outing/` | `folkvillage` `everland` `collegetown` | D7 외출 3곳 |
| | `bus_night` | 귀소 버스 — 3장소 공통 |
| `epilogue/` | `winebar` | 5년 후 — 민아 · 민규 |
| | `gallery` | 5년 후 — 승희 · 윤정 |
| | `office` | 5년 후 — 승민 · 윤호 |
| | `night_window` | 5년 후 — **Normal 6종 + 솔로 공통** |

### campus/ — 사진 17장

**지금 씬에 걸려 있는 건 `indoor/jungle_stage.jpg`(D12 수료식) 하나뿐입니다.** 나머지 열여섯은 **타일과 스틸을 그릴 때 구조를 참고한 자료**이고, 캠퍼스 안은 게임에서 타일맵으로 나옵니다.

**필요해질 때 바로 쓸 수 있게 여기 둡니다.** 배포 용량을 줄여야 하면 `jungle_stage` 외에는 빼도 게임이 돌아갑니다.

## 스프라이트 시트

**4열 × 4행, 셀 48 × 64px.**

| | 1열 | 2열 | 3열 | 4열 |
|---|---|---|---|---|
| **1행** | 아래 정지 | 걷기1 | 걷기2 | 걷기3 |
| **2행** | 왼쪽 | | | |
| **3행** | 오른쪽 | | | |
| **4행** | 위 | | | |

걷기는 **`2 → 3 → 4` 순환**, 멈추면 1열. 타일 `(x, y)`에 그릴 때 좌표는 **`(x*48, y*48 − 16)`** — 폭은 타일 한 칸이고 세로만 1.33칸이라 머리가 위 칸을 침범합니다.

사양은 [`SPRITE_SPEC.md`](../docs/reference/character/SPRITE_SPEC.md).

---

## 눈으로 대조하기

[`preview_cg.html`](../docs/reference/character/preview_cg.html) · [`preview_sprite.html`](../docs/reference/character/preview_sprite.html) — 파일명이 라벨로 붙어 있습니다. 에셋 이름을 바꾸면 `python tools/gen_preview.py`로 다시 만듭니다.

## 용량

**PNG 그대로**라 CG 90장이 117MB입니다. 웹 배포 전에 **WebP 변환이 필요합니다** — q90이면 ~11MB로 내려갑니다. 도트는 무손실이어야 하므로 PNG를 유지합니다.

원본은 [`docs/reference/character/`](../docs/reference/character/)의 `sheets/`(시트 15장)와 `cuts/`(낱장)에 남아 있어 되돌릴 수 있습니다.

- `sheets/*_source.png` — 라벨·배경이 있는 원본. 정보 확인용
- `sheets/*_alpha.png` — 배경을 제거한 것. 낱장을 자른 출처
