# B09 · 이승민 평상복 몸통

| | |
|---|---|
| **파일명** | `cg_seungmin_body_casual.png` |
| **캔버스** | 1024 × 1280 세로(4:5) · 배경 제거 후 투명 PNG |
| **비율** | **출력이 참조 이미지의 가로세로 비율을 그대로 따라갑니다.** 넣기 전에 참조가 4:5인지 확인하세요 |
| **배경** | **초록 단색으로 뽑고** `cut_sheet.py --dekey 00b140 --tol 40` 로 뺍니다 — 흰 배경은 흰 티셔츠·아이보리 스커트와 겹칩니다 |
| **참조 이미지** | `../../refs/ref_seungmin.png` |
| **선행 조건** | 없음 |
| **테마 컬러** | `#5F8F42` — UI 강조색입니다. **의상·머리색에 쓰지 마세요** |

> **이게 이 인물의 기준점입니다.** 외출복·표정 시트·스틸이 전부 이 결과물을 참조로 물립니다.
> 여러 번 뽑아 하나를 확정한 다음 넘어가세요.

> 참조 이미지의 **포즈와 표정은 가져오지 마세요.** 원본이 중립이 아닙니다. 가져올 것은 얼굴·머리·의상뿐입니다.

## 프롬프트

```text
24 year old korean man, tall with broad shoulders and a large frame,
short cropped hair, big bright eyes,
green varsity jacket over a white tee,
black lanyard around the neck, the cord visible on the chest and the small white ID card resting at the sternum just above the bottom edge,
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
strong emotion, laughing, crying, angry face
```

## 받고 나서 확인할 것

- [ ] 참조 인물과 얼굴이 같은 사람인가
- [ ] **가슴 위 반신**인가 — 허리가 보이면 다시. 얼굴이 작아집니다
- [ ] **머리 위에 여백이 5~8% 있는가** (머리카락이 위 모서리에 닿으면 다시)
- [ ] **인물이 가로 중앙인가** (한쪽 여백만 넓으면 다시)
- [ ] 자세가 중립인가 (팔짱·손을 든 포즈가 따라오지 않았는가)
- [ ] 표정이 중립인가 (표정 6종을 얹어야 합니다)
- [ ] 손가락이 깨지지 않았는가
- [ ] **명찰(검은 랜야드 + 흰 ID 카드)이 있는가**
- [ ] **머리색이 설명대로인가** — 검은 머리가 갈색으로 도는 일이 있습니다
- [ ] 배경이 단색 초록인가 · 머리 가장자리에 초록이 번지지 않았는가
- [ ] 캔버스 1024 × 1280, 배경 제거, 투명 PNG
