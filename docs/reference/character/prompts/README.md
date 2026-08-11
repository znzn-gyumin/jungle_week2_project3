# 생성 요청 프롬프트 팩 — 18건

**스틸 CG 18장**을 위한 것입니다. 파일 하나가 요청 하나이고, 열고 프롬프트 블록 두 개를 복사해 쓰면 됩니다.

| 폴더 | 내용 | 개수 |
|---|---|---|
| `04_still/` | 스틸 — 인물당 가든·클라이맥스·엔딩 | **18** |

각 파일에 들어 있는 것: **참조 이미지 지정 · 선행 조건 · 프롬프트 · 부정 프롬프트 · 받고 나서 확인할 것.**

**여기 없는 나머지 둘은 방식이 달라서 없습니다.**

| | 어디에 | 왜 |
|---|---|---|
| **도트 스프라이트** 18종 | [`SPRITE_SPEC.md`](../SPRITE_SPEC.md) | 손으로 그리므로 프롬프트가 아니라 **설계도**가 필요합니다 |
| **반신 CG** | [`ART_BRIEF.md`](../ART_BRIEF.md) | 몸통과 표정을 합쳐 한 장으로 그립니다. **표정마다 몸이 따라갑니다** — 화남엔 팔짱, 부끄럼엔 손이 올라옵니다 |

---

## 선행 조건 — 전부 해소됐습니다

| 무엇 | 정본 | 브리프 |
|---|---|---|
| **5년 후 복장 6인분** | [CHARACTERS 2절](../../../CHARACTERS.md#2-히로인-6인)의 `5년 후` 행 | [ART_BRIEF 13절 ③](../ART_BRIEF.md#13-스틸-프롬프트--18장) |

**18건 전부 지금 돌릴 수 있습니다.** 다만 순서가 있습니다.

---

## 순서

**스틸은 반신 CG가 확정된 뒤에 뽑습니다.** 얼굴이 먼저 고정돼야 열여덟 장이 같은 사람이 됩니다.

```
반신 CG 확정  →  T01~T06  가든      ← 여기부터
                 T07~T12  클라이맥스
                 T13~T18  엔딩
```

```
refs/ref_{id}.png ──→ 반신 CG ──→ 스틸 ①②③
```

`refs/` 크롭이 스틸에 직접 들어가는 일은 없습니다. 전부 *확정된 반신 CG*를 물립니다 — 그래야 얼굴이 한 번만 정해지고 끝까지 유지됩니다.

---

## 스타일 접미사에서 구도를 뺀 이유

[10절](../ART_BRIEF.md#10-공통-프롬프트-조각)의 스타일 접미사는 **화풍과 구도가 섞여 있습니다.** 스틸에 그대로 붙이면 망가집니다.

```text
korean webtoon illustration style, semi-realistic anime, soft cel shading,   ← 화풍 ✅
clean lineart, warm muted palette,                                           ← 화풍 ✅
hair rendered in exactly the stated color, ...                               ← 화풍 ✅
tight bust portrait, head and shoulders shot, cropped at the sternum,        ← 구도 ❌
subject centered horizontally ... a small empty gap above the head, ...      ← 구도 ❌
flat solid chroma key green background, one uniform color, no gradient       ← 구도 ❌
```

**배경을 그려야 하는데 `chroma key green background`가 막고, 감정이 목적인데 `calm neutral expression`이 막습니다.** 화풍만 남기고 구도는 뺐습니다.

부정 프롬프트도 컷마다 다릅니다.

- **①가든 · ②클라이맥스** — `cropped head, full body, legs, feet, busy background`와 포즈·감정 차단 토큰을 **전부 뺐습니다.** 배경과 전신이 나오고, 감정이 이 컷의 목적입니다 — 승민 ①은 아예 "울던 걸 들킨 직후"입니다. 대신 [16절 후처리 체크리스트](../ART_BRIEF.md#16-생성-결과-후처리-체크리스트)를 부정 프롬프트로 옮겼습니다 — `city lights, bright daylight, orange sunrise`
- **②클라이맥스만** — `multiple characters, crowd`도 뺐습니다. 승희는 "조가 자기를 빼놓고 결정", 민규는 "아무도 눈치 못 챔" — **조원이 화면에 있어야** 성립하는 컷입니다. ①가든은 1:1이라 그대로 둡니다
- **③엔딩** — ①②의 어둠 토큰을 **쓰지 않습니다.** 엔딩은 낮·실내라 `bright daylight`를 부정하면 `late afternoon light`와 정면 충돌합니다. 차단 대상은 **캠프 명찰**이지 사원증이 아닙니다 — 민아는 5년 후 사원증 랜야드를 걸고, 윤호는 강아지 뱃지가 사원증 스트랩에 달립니다

---

## 비율은 참조 이미지가 정합니다

**출력이 첨부한 참조 이미지의 가로세로비를 그대로 따라갑니다.** `ref_minah.png`가 0.729였고 결과가 0.728로 나왔습니다. 넣기 전에 참조가 목표 비율인지 확인하세요 — 프롬프트로 캔버스를 지정하는 것보다 이쪽이 확실합니다.

스틸은 **1920 × 1080 가로(1.778)**입니다.

---

## 놓치기 쉬운 것

- **승희·승민의 가든 씬은 4F 라운지에서 시작합니다.** 보조 참고 `community_lounge_1.jpg` — `T02`·`T05`에만 넣었습니다
- **배경이 잘 안 나오면 [`WORLD_PROMPTS.md` 6~9절](../../WORLD_PROMPTS.md)로 심야·여명 배경을 먼저 뽑아 참조로 함께 넣으세요.** 13절 지시인데 놓치기 쉽습니다
- **①가든은 게임에서 유일하게 해가 뜨는 씬**입니다. 여명은 **보라→파랑**이고 주황 일출이 아닙니다

---

## 다시 만들기

`ART_BRIEF.md`를 고쳤으면 [`tools/gen_prompts.py`](../../../../tools/gen_prompts.py)의 값을 맞춰 고치고 다시 돌리세요. 인물 데이터와 스틸 한 줄이 전부 그 스크립트 상단의 `HEROINES` 표에 모여 있습니다.

```bash
python tools/gen_prompts.py
```

> `prompts/` 아래 18개 파일은 **전부 이 스크립트가 덮어씁니다.** 손으로 고치지 말고 스크립트를 고치세요.
