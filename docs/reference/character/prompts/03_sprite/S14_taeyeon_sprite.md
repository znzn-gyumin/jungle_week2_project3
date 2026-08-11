# S14 · 강태연 도트 시트 (16컷)

| | |
|---|---|
| **파일명** | `sprite_taeyeon.png` |
| **인물** | 여 23 · 강태윤 여자판 |
| **시트** | 1024 × 1024 정사각 · 4열 × 4행 = 16셀 |
| **컷** | 48 × 48px · 행 아래→왼쪽→오른쪽→위 · 열 정지·걷기1·2·3 |
| **참조 이미지** | **S01(김민아) 도트 시트 확정본** — 화풍 기준 |
| **선행 조건** | S01 확정 |
| **명찰** | 검은 랜야드 + 밝은 ID 카드 — **전 컷 착용** |
| **자르기** | `python tools/cut_sheet.py sheet_taeyeon_sprite.png out/taeyeon --cols 4 --rows 4 --resize 48x48 --dekey ffffff --names down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3` |

> 태윤과 같은 조합이고 **셔츠가 블라우스, 치노가 슬랙스**로만 바뀝니다.

> **S01(김민아)을 참조로 물리세요.** 화풍·등신·색 수가 거기에 맞아야 합니다. 참조 CG가 없는 인물이라 화풍 판단의 근거가 S01뿐입니다.

> 문서에 아직 없는 것 — 머리(길이·색 전부). 48px에서 거의 안 보이는 항목들이라 S01의 처리 방식을 그대로 따라가면 됩니다.

> 조연 5종(명진혁·조민·강태윤·강태연·여사님)은 절감 옵션이 있습니다 — 걷기를 빼고 **정지 1프레임 × 4방향 = 4컷**으로 낮추면 288컷이 228컷이 됩니다.


## 프롬프트

```text
pixel art character sprite sheet, 4 by 4 grid, same character in every cell,
chibi proportions with a large head, about 2.5 heads tall, crisp 1px dark outline,
limited palette of 10 colors, flat shading, no anti-aliasing,
row 1 facing toward the viewer, row 2 facing left, row 3 facing right, row 4 facing away,
column 1 standing still, columns 2 to 4 walk cycle frames,
plain flat white background, no text, no labels, no grid lines,
white blouse under a navy knit vest, beige slacks, white sneakers, the neatest outfit in the room,
a black lanyard with a small bright ID card on the chest
```

## 부정 프롬프트

```text
anti-aliasing, blurry, gradient shading, realistic proportions, tall body,
different characters, inconsistent colors, text, labels, grid lines, drop shadow,
photorealistic, 3d render, watermark, signature
```

## 받고 나서 확인할 것

- [ ] S01과 **같은 화풍·같은 등신·같은 색 수**인가
- [ ] 16컷이 같은 인물·같은 팔레트인가
- [ ] 행이 아래→왼쪽→오른쪽→위, 열이 정지·걷기1·2·3 순인가
- [ ] 48px로 줄인 뒤 **외곽선이 뭉개지지 않았는가**
- [ ] 걷기 3컷을 순환시켜 다리가 자연스럽게 움직이는가
- [ ] **명찰이 전 컷에 있는가**
- [ ] 의상·색이 확정값 그대로인가
