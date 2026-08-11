# T12 · 장윤호 스틸 ② D9 클라이맥스 — 교육장 403 심야

| | |
|---|---|
| **파일명** | `cg_yunho_still_climax.png` |
| **캔버스** | 1920 × 1080 가로 · 불투명 |
| **색조** | 심야(먹빛 남색 · 점광원만) |
| **배경 레퍼런스** | `classroom_1.jpg` · `classroom_2.jpg` — **구조만** 가져옵니다. 조명·색조·시간대는 새로 깝니다 |
| **인물 참조** | **장윤호 평상복 몸통 확정본** |
| **선행 조건** | 해당 인물 평상복 몸통 확정 |

> **히로인의 서브플롯이 해결되는 지점**입니다. 각자 자기 방식으로 무너지고 주인공이 그걸 목격합니다.

> 배치만 지키면 됩니다 — **화이트보드가 앞, 맞은편이 통창.** 새벽 2시엔 키보드 소리만 남습니다.

> **기본값은 "얼굴이 거의 안 보이는 어둠"**입니다. 낮 사진의 밝기를 그대로 두면 이 게임의 정서가 통째로 사라집니다.

> **10절 스타일 접미사를 그대로 붙이지 않았습니다.** `bust crop` · `plain flat background` · `calm neutral expression`은 배경을 그려야 하는 스틸과 충돌합니다. 화풍 부분만 남겼습니다.

> 배경이 잘 안 나오면 [`WORLD_PROMPTS.md` 6~9절](../../../WORLD_PROMPTS.md)로 먼저 **심야·여명 배경 이미지를 뽑아 참조로 함께 넣으세요**(13절 지시).

## 프롬프트

```text
long seminar room at 2am, almost all ceiling lights off, only two or three computer
monitors glowing, glass whiteboards faintly catching light on the left wall,
floor-to-ceiling windows completely black on the right, deep ink-blue darkness,
very low key lighting, high contrast, most of the frame barely readable shadow,
asked what he wants and unable to answer, looking away,
korean webtoon illustration style, semi-realistic anime, soft cel shading,
clean lineart, warm muted palette,
hair rendered in exactly the stated color, the palette does not tint it
```

## 부정 프롬프트

```text
photorealistic, 3d render, extra fingers, deformed hands,
watermark, signature, text, oversaturated, lens flare,
city lights, street lamps, neon signs, distant town lights,
bright daylight, overexposed, evenly lit, orange sunrise
```

## 받고 나서 확인할 것

- [ ] **심야가 충분히 어두운가** — 한눈에 다 읽히면 아직 밝습니다
- [ ] 창밖이 완전히 검은가
- [ ] 광원이 모니터 두세 대뿐인가
- [ ] 평상복 + 명찰인가
- [ ] 인물이 몸통 확정본과 같은 사람인가
- [ ] 1920 × 1080 가로, 불투명인가
