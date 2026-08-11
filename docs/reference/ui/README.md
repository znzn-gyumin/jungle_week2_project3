# UI — 화면 넷

**새로 그려야 할 그림은 로그인 화면 하나뿐**입니다. 나머지 셋은 레이아웃이라 그림이 아니고, HTML/CSS로 만듭니다.

톤은 [`WORLD_BIBLE 11절`](../../WORLD_BIBLE.md#11-ui-톤)이 정본입니다.

| | |
|---|---|
| 폰트 | 본문 **Pretendard** / UI·숫자는 **픽셀 폰트(둥근모꼴)** |
| 대사창 | 하단 30%, 반투명 다크 `#12141Acc`, 테두리에 히로인 테마 컬러 1px |
| 금지 | **호감도 게이지 · 하트 아이콘 · 수치 표시 일체** |

---

## ① 로그인 화면 — **아직 없음**

타이틀 **앞**에 옵니다. 게스트 플레이가 없어서 **여기를 지나야 게임이 시작됩니다** ([GAME_DESIGN 2-5](../../GAME_DESIGN.md#2-5-계정과-방명록)).

구현 시안이 [`login.html`](./login.html)에 있습니다.

> 배경은 **낮의 커넥트가든** — 아직 아무 일도 없었던 시간대. 버튼 하나(`Google로 계속하기`)와 한 줄 설명뿐. **요소를 더 넣지 않습니다.**

```
minimal login screen for a visual novel game, full-bleed background photo of a
sunlit outdoor wooden deck garden, heavy dark overlay for text legibility,
centered single button labeled "Google로 계속하기", one short line of caption text
below it, generous whitespace, no other ui elements, 16:9
```

## ② 타이틀 — 그림 있음

| | |
|---|---|
| [`intro_blank.png`](../../../assets/ui/intro_blank.png) | 프레임만 — 금빛 장식 네 귀 |
| [`intro_small.png`](../../../assets/ui/intro_small.png) | 로고 작게 |
| [`intro_large.png`](../../../assets/ui/intro_large.png) | 로고 크게 |
| [`logo.png`](../../../assets/ui/logo.png) | 로고 단독 1254×1254 |

**먹빛 배경 + 보라 발광 + 금빛 장식**이라 심야와 여명을 한 화면에 겹쳐놓은 색입니다. 게임의 시그니처 그라데이션이 첫 화면에서 예고됩니다.

> **`logo.png`는 배경이 구워져 있습니다** (완전 불투명, 모서리 `#0B0B17`). `intro_blank`는 `#0A0A15`라 **1~2 어긋나** 위에 얹으면 사각형 경계가 보입니다. 다른 화면에 재활용하려면 투명 버전이 따로 필요합니다.

## ③ 방명록 — **새 에셋 없음**

**M1 교육장 403 타일맵의 화이트보드를 그대로 씁니다** ([GAME_DESIGN 2-5](../../GAME_DESIGN.md#2-5-계정과-방명록)). 인게임 낙서 위에 플레이어 글이 얹히는 구조라, 별도 화면을 그리지 않습니다.

## ④ 대사창 — 레이아웃

하단 30%. 테두리 1px에 **말하는 히로인의 테마 컬러**가 들어갑니다.

민아 `#3A9B96` · 승희 `#B5806F` · 윤정 `#E0A230` · 민규 `#4E6288` · 승민 `#5F8F42` · 윤호 `#C9A170`
