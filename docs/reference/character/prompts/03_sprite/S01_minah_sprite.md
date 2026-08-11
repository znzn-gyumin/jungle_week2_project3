# S01 · 김민아 도트 시트 (16컷)

| | |
|---|---|
| **파일명** | `sprite_minah.png` |
| **시트** | 1024 × 1024 정사각 · 4열 × 4행 = 16셀 |
| **컷** | 48 × 48px · 행 아래→왼쪽→오른쪽→위 · 열 정지·걷기1·2·3 |
| **참조 이미지** | `../../refs/ref_minah.png` + `../../pixel_demo.png` |
| **선행 조건** | 없음 |
| **자르기** | `python tools/cut_sheet.py sheet_minah_sprite.png out/minah --cols 4 --rows 4 --resize 48x48 --dekey 00b140 --tol 40 --names down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3` |

> **이 한 장이 프로젝트 전체의 화풍을 정합니다.** 나머지 17종과 타일셋이 여기서 파생됩니다. 48px로 줄여 `pixel_demo.png`와 나란히 놓고 비교한 뒤 확정하세요.

> **하의와 신발이 보입니다.** CG 반신에서는 안 나오던 부분이라 여기서 처음 드러납니다.

> `pixel_demo.png`는 **화풍만** 가져옵니다 — 그 안의 인물을 쓰는 게 아닙니다.

## 프롬프트

```text
pixel art character sprite sheet, 4 by 4 grid, same character in every cell,
chibi proportions with a large head, about 2.5 heads tall, crisp 1px dark outline,
limited palette of 10 colors, flat shading, no anti-aliasing,
row 1 facing toward the viewer, row 2 facing left, row 3 facing right, row 4 facing away,
column 1 standing still, columns 2 to 4 walk cycle frames,
flat solid chroma key green background, one uniform color,
no text, no labels, no grid lines,
long straight black hair tied high in a ponytail, black zip-up hoodie over a white tee,
black track pants, black running shoes worn with the heels crushed down,
a black lanyard with a small bright ID card on the chest
```

## 부정 프롬프트

```text
anti-aliasing, blurry, gradient shading, realistic proportions, tall body,
different characters, inconsistent colors, text, labels, grid lines, drop shadow,
photorealistic, 3d render, watermark, signature,
gradient background, color spill on outlines
```

## 받고 나서 확인할 것

- [ ] **2~2.5등신**인가 (`pixel_demo.png`와 나란히 놓고 비교)
- [ ] 16컷이 **같은 인물·같은 팔레트**인가
- [ ] 행이 아래→왼쪽→오른쪽→위, 열이 정지·걷기1·2·3 순인가
- [ ] 48px로 줄인 뒤 **외곽선이 뭉개지지 않았는가**
- [ ] 걷기 3컷을 순환시켜 **다리가 자연스럽게 움직이는가**
- [ ] **명찰이 전 컷에 있는가** (가슴에 밝은 2×3px + 목에서 내려오는 1px 검은 줄)
- [ ] 하의·신발이 설정대로인가
