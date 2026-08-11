# T05 · 이승민 스틸 ① D7 새벽 커넥트가든 → 여명

| | |
|---|---|
| **파일명** | `cg_seungmin_still_garden.png` |
| **캔버스** | 1920 × 1080 가로 · 불투명 |
| **색조** | 심야(먹빛 남색) → **여명(보라→파랑)** |
| **배경 레퍼런스** | `connect_garden.jpg` — **구조만** 가져옵니다. 조명·색조·시간대는 새로 깝니다<br>보조: `community_lounge_1.jpg` — 4F 라운지에서 시작해 가든으로 내려오는 씬입니다 |
| **인물 참조** | **이승민 평상복 몸통 확정본** |
| **선행 조건** | 해당 인물 평상복 몸통 확정 |

> **루트 최대 명장면**이고 게임에서 **유일하게 해가 뜨는 씬**입니다. 빈 의자가 처음으로 채워지는 그림입니다.

> 광원은 **발밑 조명과 건물 창 불빛뿐**입니다. 그 외에는 두지 마세요.

> **복장은 평상복 + 명찰이 맞습니다.** D7 외출복은 낮에 캠퍼스를 벗어날 때의 차림이고, 이 컷은 그 전날 밤에서 이어지는 **D7 새벽 2시, 캠퍼스 안**입니다.

> 13절 배경 프롬프트에서 `empty`를 뺐습니다 — 인물이 앉아 있는 컷이라 "빈 의자"와 모순됩니다.

> **10절 스타일 접미사를 그대로 붙이지 않았습니다.** `bust crop` · `plain flat background` · `calm neutral expression`은 배경을 그려야 하는 스틸과 충돌합니다. 화풍 부분만 남겼습니다.

> 배경이 잘 안 나오면 [`WORLD_PROMPTS.md` 6~9절](../../WORLD_PROMPTS.md)로 먼저 **심야·여명 배경 이미지를 뽑아 참조로 함께 넣으세요**(13절 지시).

## 프롬프트

```text
outdoor wooden deck terrace at dawn, low stone planter walls, white wire chairs
and olive green chairs and tables, young slender trees, white curtain-wall buildings
with orange perforated panels above, piloti columns with an open passage underneath,
sky a soft gradient from deep violet at the top to pale blue at the horizon,
ground and structures still in silhouette, no city lights anywhere, humid summer dawn air,
just finished crying, trying to smile and failing, shoulders down,
korean webtoon illustration style, semi-realistic anime, soft cel shading,
clean lineart, warm muted palette,
hair rendered in exactly the stated color, the palette does not tint it
```

## 부정 프롬프트

```text
photorealistic, 3d render, extra fingers, deformed hands,
watermark, signature, text, oversaturated, lens flare,
city lights, street lamps, neon signs, distant town lights,
bright daylight, overexposed, evenly lit, orange sunrise,
multiple characters, crowd
```

## 받고 나서 확인할 것

- [ ] **여명이 보라→파랑인가** (주황 일출이면 다시)
- [ ] 원경에 **도시 불빛이 없는가**
- [ ] 지면과 구조물이 아직 실루엣인가
- [ ] 데크 라인·기둥·나무 실루엣이 살아 있는가
- [ ] 평상복 + 명찰인가
- [ ] 인물이 몸통 확정본과 같은 사람인가
- [ ] 1920 × 1080 가로, 불투명인가
