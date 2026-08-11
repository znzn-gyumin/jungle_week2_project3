# S17 · 공용 B 도트 시트 (16컷)

| | |
|---|---|
| **파일명** | `sprite_mob_b.png` |
| **인물** | 무명 동기 17명용 공용 스프라이트 |
| **시트** | 1024 × 1024 정사각 · 4열 × 4행 = 16셀 |
| **컷** | 48 × 48px · 행 아래→왼쪽→오른쪽→위 · 열 정지·걷기1·2·3 |
| **참조 이미지** | **S01(김민아) 도트 시트 확정본** — 화풍 기준 |
| **선행 조건** | S01 확정 |
| **명찰** | 검은 랜야드 + 밝은 ID 카드 — **전 컷 착용** |
| **자르기** | `python tools/cut_sheet.py sheet_mob_b_sprite.png out/mob_b --cols 4 --rows 4 --resize 48x48 --dekey ffffff --names down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3` |

> **후드 색만 갈아 끼웁니다.** 교체용 색은 **회갈 · 연보라 · 올리브 · 남색 · 벽돌** 중에서. 얼굴 디테일 없음.

> **S01(김민아)을 참조로 물리세요.** 화풍·등신·색 수가 거기에 맞아야 합니다. 참조 CG가 없는 인물이라 화풍 판단의 근거가 S01뿐입니다.

> 문서에 아직 없는 것 — 신발, 하의 색, 머리 색, 성별. 48px에서 거의 안 보이는 항목들이라 S01의 처리 방식을 그대로 따라가면 됩니다.

> **한 종을 색만 바꿔 대여섯 번 재활용**합니다. 색 교체가 쉽도록 면을 단순하게, 색 경계를 뚜렷하게 유지하세요.


## 프롬프트

```text
pixel art character sprite sheet, 4 by 4 grid, same character in every cell,
chibi proportions with a large head, about 2.5 heads tall, crisp 1px dark outline,
limited palette of 10 colors, flat shading, no anti-aliasing,
row 1 facing toward the viewer, row 2 facing left, row 3 facing right, row 4 facing away,
column 1 standing still, columns 2 to 4 walk cycle frames,
plain flat white background, no text, no labels, no grid lines,
generic background student, zip-up hoodie and long pants, hair as a simple flat mass, no facial detail at all,
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
