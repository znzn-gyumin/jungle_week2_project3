# B10 · 이승민 D7 외출복 몸통

| | |
|---|---|
| **파일명** | `cg_seungmin_body_outing.png` |
| **캔버스** | 1024 × 1280 세로(4:5) · 배경 제거 후 투명 PNG |
| **배경** | **초록 단색으로 뽑고** `cut_sheet.py --dekey 00b140 --tol 40` 로 뺍니다 — 흰 배경은 흰 티셔츠·아이보리 스커트와 겹칩니다 |
| **참조 이미지** | **B09에서 확정한 평상복 결과물** (`ref_seungmin.png` 아님) |
| **선행 조건** | B09 확정 |
| **명찰** | **없음** — 캠퍼스를 벗어나는 날입니다 |

> **재킷을 벗은 것**이 핵심입니다. 바시티 재킷이 만들던 어깨 실루엣이 없어져야 합니다.

> **얼굴 위치·크기가 평상복과 픽셀 단위로 같아야 합니다.** 표정 파츠 6장을 두 몸통에 공용으로 얹기 때문입니다. 어긋나면 표정을 12세트 그려야 합니다.

## 프롬프트

```text
same man, no varsity jacket, linen shirt with the top button undone,
wristwatch, a cap, no lanyard, no id card,
korean webtoon illustration style, semi-realistic anime, soft cel shading,
clean lineart, warm muted palette,
hair rendered in exactly the stated color, the palette does not tint it,
tight bust portrait, head and shoulders shot, cropped at the sternum,
the bottom edge of the frame sits just below the collarbone,
face large and clearly readable, head and shoulders fill the frame,
subject centered horizontally with equal empty margin on the left and right,
a small empty gap above the head, hair not touching the top edge,
facing viewer straight on, shoulders level and symmetrical,
relaxed neutral posture, arms lowered naturally, calm neutral expression,
flat solid chroma key green background, one uniform color, no gradient
```

## 부정 프롬프트

```text
photorealistic, 3d render, extra fingers, deformed hands,
watermark, signature, text, oversaturated, lens flare,
cropped head, hair cropped at the top edge, head touching the top edge,
upper body, cowboy shot, full body, waist, hips, midriff, legs, feet,
off center subject, subject pushed to one side, uneven side margins,
multiple characters, busy background,
gradient background, textured background, shadow cast on the background, vignette,
color spill on hair edges, rim light, tinted skin,
dramatic pose, arms crossed, raised hands, hands near the face,
strong emotion, laughing, crying, angry face,
lanyard, id card, name tag, badge on chest
```

## 받고 나서 확인할 것

- [ ] 평상복과 **같은 사람**인가
- [ ] 평상복과 **얼굴 위치·크기가 같은가** (겹쳐서 확인)
- [ ] **명찰이 없는가**
- [ ] 가슴 위 반신 · 중립 자세 · 중립 표정인가
- [ ] 머리 위 여백 5~8% · 인물이 가로 중앙인가
- [ ] 손가락이 깨지지 않았는가
- [ ] 배경이 단색 초록인가
- [ ] 캔버스 1024 × 1280, 배경 제거, 투명 PNG
