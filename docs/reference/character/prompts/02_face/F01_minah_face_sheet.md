# F01 · 김민아 표정 시트 (6컷)

| | |
|---|---|
| **시트** | 1024 × 1024 정사각 · 3열 × 2행 = 6셀 |
| **셀** | 약 341 × 512 — 얼굴과 목까지만 |
| **순서** | 좌→우, 위→아래 — `normal` `happy` `shy` / `sad` `surprise` `angry` |
| **참조 이미지** | **김민아 평상복 몸통 확정본** |
| **선행 조건** | B01 확정 |
| **자르기** | `python tools/cut_sheet.py sheet_minah_face.png out/minah --cols 3 --rows 2 --dekey ffffff --trim --names normal,happy,shy,sad,surprise,angry` |

> 표정 근육은 거의 안 움직이고 **눈만** 움직입니다. 여섯 셀의 입 모양 차이를 최소로.

> **10절 부정 프롬프트에서 `strong emotion, laughing, crying, angry face`를 뺐습니다.** 이 시트가 만들어야 하는 게 바로 그 표정이라 넣으면 시트가 망가집니다.

> **김민아가 시금석입니다.** 잘라서 몸통에 얹어보고 눈이 떨리면 시트 방식을 버리고 몸통에서 얼굴만 인페인팅하는 쪽으로 돌아가세요 — 그 경우 요청이 6번에서 36번으로 늘어납니다.


## 프롬프트

```text
character expression sheet, same character repeated in a 3 by 2 grid,
six head-and-neck portraits of the same person, identical face and hair in every cell,
same head angle and same scale in every cell, only the expression differs,
row 1 left to right: neutral calm / bright genuine smile / blushing with eyes averted,
row 2 left to right: downcast sad / wide-eyed surprise / furrowed angry,
korean webtoon illustration style, semi-realistic anime, soft cel shading,
clean lineart, plain flat white background, no body, no hands, no text labels,
expression barely changes but the eyes carry everything
```

## 부정 프롬프트

```text
photorealistic, 3d render, extra fingers, deformed hands,
watermark, signature, text, oversaturated, lens flare,
different people, inconsistent face, varying head size,
body, shoulders, hands, arms,
labels, borders between cells, grid lines, busy background
```

## 받고 나서 확인할 것

- [ ] 6컷이 **같은 사람**인가
- [ ] 6컷의 **머리 크기·각도가 같은가** — 다르면 정렬로 못 메웁니다
- [ ] 몸통과 화풍·각도가 이어지는가
- [ ] 셀 사이에 테두리·라벨·글자가 없는가
- [ ] 배경이 단색 흰색인가
- [ ] 잘라낸 6장이 같은 1024 × 1280 캔버스의 같은 위치에 있는가
- [ ] 몸통에 얹었을 때 **눈이 안 떨리는가** (한 번은 실제로 얹어 확인)
