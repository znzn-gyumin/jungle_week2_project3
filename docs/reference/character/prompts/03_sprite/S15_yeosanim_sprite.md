# S15 · 여사님 도트 시트 (16컷)

| | |
|---|---|
| **파일명** | `sprite_yeosanim.png` |
| **인물** | 여 50대 · B1 지하 카페테리아 |
| **시트** | 1024 × 1024 정사각 · 4열 × 4행 = 16셀 |
| **참조 이미지** | **S01(김민아) 도트 시트 확정본** — 화풍 기준 |
| **선행 조건** | S01 확정 |
| **자르기** | `python tools/cut_sheet.py sheet_yeosanim_sprite.png out/yeosanim --cols 4 --rows 4 --resize 48x48 --dekey ffffff --names down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3` |

> ## ⚠️ 이 인물의 외형은 **문서에 없습니다**
>
> **정본이 못박은 것** (`CHARACTERS.md` · `GAME_DESIGN.md` · `ART_BRIEF.md` 5절 종합) — **앞치마.** 학생들 이름을 다 외우고 있음. 사투리 약간, 반말. 코믹 릴리프
>
> **비어 있는 것** — 머리 색·스타일, 체형, 앞치마 색, 안쪽 옷. **참가자가 아닌데 명찰을 거는지도 미지정** — 아래 초안은 안 거는 쪽으로 잡았습니다
>
> 위 프롬프트의 의상·머리는 **이 팩이 지어낸 초안이고 확정이 아닙니다.** 그대로 뽑으면 `CHARACTERS.md`에 없는 신규 설정이 생깁니다. **뽑기 전에 값을 정하고 `CHARACTERS.md`에 먼저 반영하세요.**

> 조연 5종(명진혁·조민·강태윤·강태연·여사님)은 절감 옵션이 있습니다 — 걷기를 빼고 **정지 1프레임 × 4방향 = 4컷**으로 낮추면 288컷이 228컷이 됩니다.


## 프롬프트

```text
pixel art character sprite sheet, 4 by 4 grid, same character in every cell,
chibi proportions with a large head, about 2.5 heads tall, crisp 1px dark outline,
limited palette of 10 colors, flat shading, no anti-aliasing,
row 1 facing toward the viewer, row 2 facing left, row 3 facing right, row 4 facing away,
column 1 standing still, columns 2 to 4 walk cycle frames,
plain flat white background, no text, no labels, no grid lines,
short permed greying hair, warm apron over a simple long-sleeve top, comfortable dark pants, flat shoes, no lanyard
```

## 부정 프롬프트

```text
anti-aliasing, blurry, gradient shading, realistic proportions, tall body,
different characters, inconsistent colors, text, labels, grid lines, drop shadow,
photorealistic, 3d render, watermark, signature
```

## 받고 나서 확인할 것

- [ ] **의상·머리를 문서에 반영한 뒤에 뽑았는가**
- [ ] S01과 **같은 화풍·같은 등신·같은 색 수**인가
- [ ] 16컷이 같은 인물·같은 팔레트인가
- [ ] 행·열 순서가 맞는가
- [ ] 48px로 줄인 뒤 외곽선이 뭉개지지 않았는가
- [ ] 명찰 유무가 설정과 맞는가 (코치·여사님은 참가자가 아닙니다)
