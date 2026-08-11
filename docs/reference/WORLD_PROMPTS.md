# 배경 · 맵 · UI — 생성 프롬프트 세트

> **배경 8장과 UI**입니다. 캐릭터는 [character/ART_BRIEF.md](./character/ART_BRIEF.md), 타일셋·타일맵은 [TILE_BRIEF.md](./TILE_BRIEF.md)에 따로 있습니다.
>
> **파생 문서입니다.** 설정이 바뀌면 [GAME_DESIGN 6](../GAME_DESIGN.md#6-에셋-목록) · [WORLD_BIBLE](../WORLD_BIBLE.md)을 고치고 여기를 다시 뽑습니다.

---

## 0. 범위와 한계

| 항목 | 수량 | 생성 도구로 되는가 |
|---|---|---|
| **① 배경** | **8장** | **사진 5** (조달 + 보정) · **일러스트 3** (✅ 생성) |
| **② UI 화면** | 1종(+3 참고) | ✅ **HTML/CSS 도구에 잘 맞습니다** |

**한 요청에 하나씩** 뽑으세요. 이 문서를 통째로 넘기면 안 됩니다.

**여기 없는 것** — 타일셋 3종 · 도트 타일맵 7개 · 조명 오버레이 5종은 [TILE_BRIEF.md](./TILE_BRIEF.md), 캐릭터 CG·도트는 [character/ART_BRIEF.md](./character/ART_BRIEF.md).

---

## 1. 공통 조각

### 스타일 접미사 — 일러스트 배경 ⑤⑥⑦에만 붙입니다

```
korean webtoon background art, semi-realistic anime background painting,
soft painterly rendering, clean composition, no characters, no people in foreground,
visual novel background, 16:9
```

캐릭터가 웹툰풍이라 배경도 같은 결이어야 합니다. **인물은 넣지 않습니다** — 배경 위에 캐릭터를 얹는 구조입니다.

### 부정 프롬프트 — 공통

```
characters, people in foreground, close-up faces, text, watermark, signature,
ui elements, hud, frame borders, photorealistic, 3d render, fisheye, tilted horizon
```

### 시간대 팔레트

| 시간 | 색 |
|---|---|
| 낮 | 따뜻한 노랑 · 베이지 · 낮은 채도. 살짝 바랜 느낌 |
| 저녁 | 주황 → 남색 그라데이션 |
| 밤 (23~01) | 청록 · 네이비 · 모니터 발광 |
| **심야 (02~03)** | **먹빛 남색 · 점광원만** |
| 여명 (04:30~) | 보라 → 파랑 그라데이션 |

**규격**: 배경은 **1920 × 1080 가로, 불투명**입니다. 사진도 같은 규격으로 크롭합니다.

---

## 2. 배경 — 8장 (사진 5 · 일러스트 3)

**화풍이 시간 층으로 갈립니다.**

| | 배경 | 화풍 |
|---|---|---|
| ①②③④ | 민속촌 · 에버랜드 · 대학가 · 귀소 버스 | **사진** — D7, 캠프 기간 |
| ⑧ | D12 수료식 | **사진** — 캠프 기간 |
| ⑤⑥⑦ | 오피스 · 전시장 · 밤 창가 | **일러스트** — 5년 후 |

**캠프 열이틀은 사진, 5년 후는 일러스트**입니다. 캠퍼스 안이 도트라서 D7에 **도트 → 실사**로 낙차가 크고, 5년 후만 일러스트라 에필로그가 다른 층에 있다는 게 그림으로 전달됩니다.

### 사진 조달 — ①②③④ 넷만

**⑧은 이미 있습니다** — `jungle_stage.jpg`. 새로 구할 건 넷뿐입니다.

| 출처 | 라이선스 | 쓸 곳 |
|---|---|---|
| **포토코리아** (한국관광공사) | **공공누리 1유형** — 상업 이용·2차 가공 가능, **출처 표기 필수** | ① 민속촌 |
| **공유마당** (한국저작권위원회) | CC · 공공누리 혼재 — **상업 이용 가능한 것만** 골라야 함 | ①③ |
| Unsplash · Pexels | 대체로 자유, 상표·인물 주의 | ③ 대학가 · ④ 시내버스 |

> **② 에버랜드가 가장 까다롭습니다.** 사기업 테마파크라 **시설 사진에 상표가 찍히고** 무료 라이선스로 풀린 게 드뭅니다. 셋 중 하나를 고르세요 — 상표가 안 보이는 일반 놀이공원 사진으로 대체 · 실사풍 생성 · 직접 촬영.

**받은 사진마다 `출처 · 라이선스 · 촬영자`를 기록**합니다. 배포되는 물건이라 나중에 추적할 수 있어야 합니다.

### 회화풍 보정 — 사진 5장 전부

웹툰풍 캐릭터가 실사 위에 서면 이질감이 큽니다. 사진의 사실감을 눌러 톤을 맞춥니다.

| 항목 | 값 |
|---|---|
| **채도** | **−20%** |
| **대비** | −10% (하이라이트·섀도를 압축) |
| **블러** | 전체 가우시안 **1~2px** · 원경 **3~4px** (얕은 심도) |
| **색 그레이딩** | 해당 시간대 팔레트를 **오버레이 15~25%** |
| **디테일** | 노이즈 제거 후 **약한 유화/포스터라이즈** — 텍스처를 면으로 정리 |
| **하단 30%** | 대사창이 덮습니다. **중요한 정보를 두지 마세요** |

**시간대 그레이딩 값**

| 배경 | 시각 | 얹을 색 |
|---|---|---|
| ① 민속촌 · ② 에버랜드 · ③ 대학가 | 낮~오후 | `#FFE6B8` soft-light 12% · 채도 −10% 추가 |
| ④ 귀소 버스 | 밤 21시 | `#153A4A` multiply 45% · 실내는 따뜻한 노랑 유지 |
| ⑧ 수료식 | 낮 | `#FFE6B8` soft-light 12% |

> **다섯 장의 보정값을 같게 유지하세요.** 장마다 톤이 다르면 사진이라는 것만 도드라지고 한 세계로 안 보입니다.

---

### ① 한국민속촌 — D7 외출 (승희 · 윤호 선호) · **사진**

아래 영문은 **생성 프롬프트이자 사진 선정 기준**입니다. 사진을 고를 때 이 조건에 맞는 컷을 찾으세요.

**이 장소가 만드는 것**: 넓고 조용해서 **침묵이 허용됩니다.** 나란히 걷게 되고 마주 보지 않아도 되니까 오히려 말이 나옵니다. 시간이 남아돕니다.

```
korean folk village on a summer afternoon, thatched-roof hanok houses,
packed dirt paths, large old trees casting deep shade, wide open grounds,
low stone walls, distant hills, very few visitors, spacious and quiet,
warm muted daylight, cicadas-in-the-air stillness
```

### ② 에버랜드 — D7 외출 (승민 · 윤정 선호) · **사진**

**이 장소가 만드는 것**: 텐션과 **우연한 접촉.** 대화는 짧고 파편적입니다.

```
korean theme park on a bright summer day, wooden roller coaster track curving
in the middle distance, colorful pavilions and food stalls, queue barriers,
flower beds in full bloom, balloons, distant crowds as small silhouettes only,
high saturation, energetic, strong midday sun
```

### ③ 명지대 대학가 — D7 외출 (민아 · 민규 선호) · **사진**

**이 장소가 만드는 것**: **서로의 학교 얘기.** 원래 어떤 학생이었는지를 알게 됩니다.

```
korean university town street in late afternoon, low-rise buildings,
small cheap restaurants with hand-written signs, a secondhand bookshop,
a printing shop, narrow street with parked scooters,
almost empty because it is summer vacation, long warm shadows, slightly nostalgic
```

### ④ 귀소 시내버스 (야간) — **3장소 공통** · **사진**

**배경 1장으로 세 갈래를 다 받아냅니다.** 고백 직전까지 가는 대사가 여기 놓이고, **호칭이 한 단계 바뀌는 지점**입니다. 밤 9시.

```
interior of an empty korean city bus at 9pm, view down the aisle toward the back,
warm yellow interior lighting, rows of empty seats, vertical handrails and straps,
windows completely dark reflecting the interior like mirrors,
no passengers, quiet, gentle motion blur outside the glass
```

> **창이 거울이 되는 게 이 배경의 전부입니다.** 서로의 얼굴이 창에 비치는 연출을 쓰므로 반사가 뚜렷해야 합니다.

### ⑤ 5년 후 · 오피스 — True/Good (민아 · 민규 · 승민 · 윤호) · **일러스트**

```
modern open-plan software office in late afternoon, rows of desks with monitors,
glass meeting room in the background, potted plants, warm low sun through
floor-to-ceiling windows, calm and settled atmosphere, no people
```

### ⑥ 5년 후 · 전시장 — True/Good (승희 · 윤정) · **일러스트**

```
white-walled gallery exhibition space, track spot lighting from the ceiling,
framed works evenly spaced on the walls, polished concrete floor,
a low bench in the center, quiet and bright, no people
```

### ⑦ 5년 후 · 밤 창가와 모니터 불빛 — **Normal 6종 + 솔로 공통** · **일러스트**

**전부 화면으로만 소식을 아는 엔딩**입니다. 방 안에서 유일한 광원이 모니터입니다.

```
a dark room at night, a desk by a large window, a single monitor glowing
as the only light source, city lights faint and far below outside the glass,
the rest of the room in deep shadow, a mug left on the desk,
solitary and quiet, no people
```

> **5년 후는 캠퍼스가 아니라 도시입니다.** 창밖에 도시 불빛이 있어도 됩니다 — 캠프의 "도시광 없음" 제약은 여기 적용되지 않습니다.

### ⑧ D12 수료식 · 정글스테이지 — **6루트 공통** · **사진**(`jungle_stage.jpg`)

**명찰을 벗는 컷**이자 캠프의 끝을 알리는 시각적 신호입니다. B1의 소규모 계단식 강당이고, 24명뿐이라 **앞쪽만 찹니다.**

```
small tiered lecture auditorium in a basement, stepped rows of seats descending
toward a stage, a large presentation screen and podium at the front,
only the front two or three rows would be occupied, warm stage lighting,
the back rows dark and empty, a sense of something ending, no people
```

> **뒷줄이 비어 있는 게 연출입니다.** 24명짜리 기수라는 규모가 이 그림에서 보여야 합니다.

---

## 3. UI 화면

**신규 에셋은 로그인 화면 1종뿐**입니다. 나머지 셋은 레이아웃이라 그림이 아니지만, HTML/CSS 도구로 만들기 좋아서 함께 적습니다.

**공통 톤**

| | |
|---|---|
| 폰트 | 본문 **Pretendard** / UI·숫자는 **픽셀 폰트(둥근모꼴)** |
| 대사창 | 하단 30%, 반투명 다크 `#12141Acc`, 테두리에 히로인 테마 컬러 1px |
| 금지 | **호감도 게이지 · 하트 아이콘 · 수치 표시 일체** |

여섯 테마 컬러 — 민아 `#3A9B96` · 승희 `#B5806F` · 윤정 `#E0A230` · 민규 `#4E6288` · 승민 `#5F8F42` · 윤호 `#C9A170`

### ① 로그인 화면 — **신규 에셋**

타이틀 **앞**에 옵니다. 게스트 플레이가 없어서 여기를 지나야 게임이 시작됩니다.

> 배경은 **낮의 커넥트가든** — 아직 아무 일도 없었던 시간대. 버튼 하나(`Google로 계속하기`)와 한 줄 설명뿐. 요소를 더 넣지 않습니다.

```
minimal login screen for a visual novel game, full-bleed background photo of a
sunlit outdoor wooden deck garden, heavy dark overlay for text legibility,
centered single button labeled "Google로 계속하기", one short line of caption text
below it, generous whitespace, no other ui elements, 16:9
```

### ② 타이틀 — 참고

로고 [`jungLover_logo.png`](./jungLover_logo.png)를 씁니다. **먹빛 배경 + 보라 발광 + 금빛 장식**이라 심야와 여명을 한 화면에 겹쳐놓은 색이고, 게임의 시그니처 그라데이션이 첫 화면에서 예고됩니다.

메뉴 세 개: `이어하기` · `방명록` · `새 게임`

### ③ 방명록 — 참고 (**새 에셋 없음**)

M1 타일맵의 화이트보드를 그대로 쓰고 글을 그 위에 얹습니다.

> **화이트보드를 화면 가득 채우고 여러 사람의 글을 손글씨처럼 흩뿌립니다.** 목록·카드 나열은 쓰지 않습니다 — **게시판처럼 보이는 순간 모티프가 죽습니다.**

한 줄에 `이름 · 김민아 미래 남친 · D5 · 2026.08.11`이 작게 붙고 그 아래 본문(140자). **인게임 날짜를 현실 날짜보다 크게** 씁니다. **내 글은 살짝 다른 색.**

### ④ 대사창 — 참고

- 이름표는 좌상단. 말하는 사람을 **주인공이 부르는 이름**으로 띄웁니다
- 선택지는 화면 중앙, 3개 이하. **증감은 표시하지 않습니다**
- 남은 대화 횟수는 자유 이동 중에만 우상단에 점으로 (`● ●` → `● ○`). 숫자는 안 씁니다
- 맵 전환 시 좌상단에 현재 위치를 2초간 (`교육동 4F · 교육장 403`)

---

## 4. 후처리 체크리스트

**일러스트 배경 8장**

- [ ] **1920 × 1080**, 인물 없음
- [ ] 하단 30%에 중요한 것이 없는가 — **대사창이 덮습니다**
- [ ] 캐릭터 화풍과 결이 맞는가 (웹툰풍 배경 · 과한 사실감 금지)
- [ ] ④귀소 버스: **창이 거울처럼 반사되는가**
- [ ] ⑧수료식: **뒷줄이 비어 있는가**

**UI**

- [ ] 호감도 게이지 · 하트 · 수치가 **하나도 없는가**
- [ ] 방명록이 **게시판처럼 보이지 않는가**

---

## 5. 권장 순서

1. **일러스트 배경 8장** — 생성에 가장 잘 맞고 다른 작업에 안 막힙니다. 지금 바로 시작 가능
2. **로그인 화면** — 신규 UI 하나뿐이라 금방 끝납니다
3. **사진 시간대 변환**(6~9절) — 타일맵과 스틸 작업에 넘길 레퍼런스를 미리 뽑아둡니다

타일셋·타일맵은 [TILE_BRIEF.md](./TILE_BRIEF.md), 캐릭터는 [character/ART_BRIEF.md](./character/ART_BRIEF.md)가 따로 다룹니다.

---

## 6. 캠퍼스 사진 시간대 변환 — 규칙

**낮 사진에서 바로 심야 타일맵을 그리는 건 어렵습니다.** 중간 단계로 "이 공간이 새벽에 어떻게 보이는가"를 눈으로 확인하는 작업입니다. **여기서 나온 이미지는 게임에 직접 들어가지 않습니다** — 그림 레퍼런스입니다.

**반드시 이미지-투-이미지(img2img · relight · 참조 이미지)로 돌리세요.** 텍스트만으로 새로 생성하면 공간 구조가 딴 데가 됩니다. 원하는 건 **같은 공간의 다른 시각**이지 비슷한 분위기의 다른 장소가 아닙니다.

| 유지해야 하는 것 | 바꾸는 것 |
|---|---|
| 카메라 위치·화각·구도 | **광원의 위치와 색** |
| 건물 구조, 창·문·기둥 위치 | 전체 색조와 채도 |
| 가구 배치, 개수, 형태, 색 | 그림자의 방향과 세기 |
| 나무·화단 위치 | 창밖 하늘과 밝기 |
| **사람 없음** (원본 그대로 비어 있음) | 켜진 조명의 개수 |

권장 강도(denoise / 변화량)는 **0.35~0.5**입니다. 그 이상은 가구가 바뀌기 시작합니다.

### 세계관 제약 — 이게 이 게임의 밤을 결정합니다

**주변에 도시 불빛이 없습니다.** 캠퍼스 주위는 야산과 전원주택뿐이라 하늘이 도시처럼 뜨지 않습니다. 그래서 **광원은 건물이 스스로 내는 것뿐**입니다 — 실내 형광등, 창으로 새는 빛, 모니터, 발밑 조명, 자판기. 원경은 진짜로 검습니다.

밤 프롬프트에 `city lights`, `urban glow`, `light pollution`, `street traffic` 같은 말이 들어가면 안 됩니다.

**계절은 8월 한여름**, 장소는 용인입니다.

---

## 7. 시간대별 조명 프롬프트

아래 다섯 개를 **그대로 복사해 프롬프트 뒤에 붙입니다.** 사진마다 다시 쓰지 않습니다.

### 낮 (원본 그대로 — 생성 불필요)

원본 사진이 전부 한낮입니다. 그대로 쓰면 됩니다.

### 저녁 — `evening` · 19~22시

> warm orange sunset light entering from the windows, deep navy blue gathering in the interior depths, ceiling fluorescent lights just switched on and competing with the fading daylight, long soft shadows, sky outside a gradient from burnt orange near the horizon to dark blue above, no sun disc visible, calm and slightly pressured atmosphere

**핵심**: 창 쪽은 주황, 안쪽은 남색. 형광등이 **막 켜진** 상태라 실내광과 자연광이 싸웁니다. 하루가 아직 안 끝났다는 압박이 이 시간대의 정서입니다.

### 밤 — `night` · 23~01시

> deep night, pitch black outside the windows with no city lights whatsoever, only interior fluorescent ceiling lights illuminating the space, cool teal and navy color grading, computer monitor glow casting light upward, windows acting as dark mirrors reflecting the interior, no ambient sky light, quiet

**핵심**: 창밖이 **완전히 검습니다.** 창이 거울이 되어 실내를 반사합니다. 모니터 발광이 아래에서 위로 얼굴을 비추는 각도.

### 심야 — `midnight` · 02~03시 · **가장 중요**

> dead of night, almost all ceiling lights switched off, only two or three point light sources remain — a few computer monitors, one floor lamp, a vending machine glow, an exit sign, everything else falls into deep ink-blue darkness, very low key lighting, high contrast between the small pools of light and the surrounding black, windows completely black, oppressive silence, most of the frame is barely readable shadow

**핵심**: **점광원만 남깁니다.** 화면 대부분이 형태만 겨우 읽히는 어둠이어야 합니다. 이 게임의 감정 정점이 전부 이 시간대라, **밝게 나오면 실패**입니다. 결과물이 "어두운 밤"으로 보이면 더 어둡게 다시 돌리세요 — "거의 안 보이는 어둠"이 목표입니다.

### 여명 — `dawn` · 04:30~ · **커넥트가든 전용**

> first light of dawn, sky a soft gradient from deep violet at the top to pale blue near the horizon, the sky is now brighter than any artificial light, ground and structures still in silhouette, ambient light beginning to fill the scene from above, interior lights still on but losing to the sky, dew and humidity in the air, hopeful and quiet

**핵심**: **하늘이 인공광을 이기기 시작하는 순간.** 지면과 구조물은 아직 실루엣입니다. **게임 전체에서 딱 한 번** 나오는 색이라 여기에 제일 공을 들이세요.

---

## 8. 변환 생성 목록

**23장**입니다. 1순위 5장만 있어도 작업을 시작할 수 있습니다.

### 1순위 — 스틸 CG 배경 (5장)

히로인 스틸 18장이 이 배경 위에 그려집니다.

| 사진 | 시간대 | 쓰이는 곳 |
|---|---|---|
| `connect_garden.jpg` | **심야** | **D7 새벽 2시** — 루트 최대 명장면 |
| `connect_garden.jpg` | **여명** | **D7 해 뜨는 순간** — 게임 전체에서 한 번 |
| `connect_garden.jpg` | 밤 | D1 23시 지나가는 길 · D11 마지막 밤 |
| `classroom_1.jpg` | **심야** | **D9 클라이맥스** |
| `classroom_2.jpg` | **심야** | 〃 (다른 각도) |

### 2순위 — 자유 이동 구간 (8장)

플레이어가 직접 걸어 다니는 세 시각입니다 — D1 16:30(낮·원본) · D5 23:00(밤) · D8 저녁.

| 사진 | 시간대 |
|---|---|
| `classroom_1.jpg` | 저녁 · 밤 |
| `classroom_2.jpg` | 저녁 · 밤 |
| `opendesk.jpg` | 저녁 · 밤 |
| `lobby.jpg` | 저녁 · 밤 |

### 3순위 — 나머지 씬 공간 (6장)

| 사진 | 시간대 | 쓰이는 곳 |
|---|---|---|
| `community_lounge_1.jpg` | 심야 | 이승희 / 이승민 루트 핵심 씬 (4F) |
| `coaching_room.jpg` | 밤 | 코치 1:1 상담 |
| `jungle_stage.jpg` | 심야 | 밤에 텅 빈 강당 |
| `canteen.jpg` | 심야 | 새벽 야식 |
| `cafe.jpg` | 심야 | 〃 |
| `dormitory_room.jpg` | 밤 | 메신저 씬의 무대 |

### 옵션 (4장)

`basketball_court.jpg` 밤 · `edu_terrace.jpg` 밤 · `jungle_step.jpg` 밤 · `connect_garden.jpg` 저녁

---

## 9. 사진별 변환 프롬프트

**공통 접두사** — 모든 프롬프트 앞에 붙입니다.

> same location, same camera position and framing, same furniture and architecture, photorealistic architectural photograph, empty of people,

여기에 **아래의 장면 설명** + **1절의 시간대 블록**을 이어 붙입니다.

**공통 부정 프롬프트**

> people, humans, figures, different furniture, changed layout, moved camera, city skyline, urban lights, light pollution, street lamps in the distance, traffic, neon signs, cartoon, illustration, oversaturated

### `connect_garden.jpg` — 커넥트가든 (최우선)

**공간**: 넓은 우드데크 야외 테라스. 앞쪽에 흰 와이어 프레임 의자·테이블과 올리브그린 의자·테이블이 섞여 놓여 있고, 가운데 초록 원형 받침 하이테이블과 스툴. 낮은 석축 화단이 데크를 감싸고 어린 나무들이 목재 지지대에 묶여 서 있음. 좌측과 배경은 흰 커튼월 건물, 상층부에 **주황색 타공 패널**. 배경 건물은 **필로티 기둥** 위에 떠 있어 그 아래로 건너편이 뚫려 보임. 우측에 유리 파사드와 계단.

> a wide outdoor wooden deck terrace enclosed by low stone planter walls, empty white wire-frame chairs and tables mixed with olive green chairs and round pedestal tables, young slender trees supported by wooden stakes, white curtain-wall buildings on the left and in the background with orange perforated metal panels on the upper floors, the background building elevated on white piloti columns with an open passage visible underneath, glass facade and steps on the right,

**시간대별 추가 지시**

| | 덧붙일 것 |
|---|---|
| **밤** | 데크에 **발밑 조명(bollard)** 몇 개만. 건물 창에서 새는 빛. 나무는 실루엣 |
| **심야** | 발밑 조명 2~3개 외 전부 소등. 데크 판자 결이 겨우 보이는 정도. **빈 의자가 어둠 속에 형태로만** |
| **여명** | 하늘이 보라→파랑. 필로티 아래 통로 너머로 **하늘이 트여 보이게**. 데크와 기둥은 실루엣, 젖은 표면에 하늘색 반사 |

> **의자는 비워두세요.** D7 스틸에서 히로인이 앉는 자리라, 빈 상태가 기본 배경입니다.

### `classroom_1.jpg` · `classroom_2.jpg` — 교육장 403

**공간**: 긴 직사각형 강의실을 뒤에서 앞으로 본 구도. **좌측 벽에 대형 유리 화이트보드 두 판과 벽걸이 디스플레이**, 그 아래 강연대. **우측은 바닥부터 천장까지 통유리**에 회색 커튼, 창밖에 나무들. 천장은 흰 텍스처 타일 격자에 **매입형 사각 LED 패널**이 줄지어 있음. 바닥은 회베이지 카펫타일. 흰 상판 폴딩 테이블이 군집으로 붙어 있고 회색 메시 사무의자가 캐스터로 놓여 있음.

> a long rectangular seminar room seen from the back, large glass whiteboards and a wall-mounted display on the left wall, floor-to-ceiling window wall with grey curtains on the right, recessed rectangular LED ceiling panels in a white tile grid, white-topped folding tables clustered together, grey mesh office chairs on casters, grey-beige carpet floor,

**시간대별 추가 지시**

| | 덧붙일 것 |
|---|---|
| **저녁** | 창밖 노을이 우측에서 들어옴. 천장등은 켜져 있지만 아직 이김당함 |
| **밤** | 천장등 전부 켜짐. **창이 완전히 검어 실내를 반사** |
| **심야** | 천장등 **거의 다 꺼짐.** 책상 위 모니터 두세 개만 발광. 비상구 표시등 초록. 화이트보드가 어둠 속에 희미하게 뜸 |

> **심야가 이 방의 핵심입니다.** "새벽 2시에 403에 남은 건 나랑 저 사람뿐" — 그 그림입니다. 켜진 모니터 수가 곧 남아 있는 사람 수입니다.

### 나머지 사진

**구도 유지 + 1절 시간대 블록**만으로 충분합니다. 장면 설명은 원본 이미지가 대신합니다(img2img이므로).

| 사진 | 덧붙일 것 |
|---|---|
| `opendesk.jpg` | 지정석 없는 공용 테이블. 24시간 개방이라 **밤에도 사람이 있었던 흔적** |
| `lobby.jpg` | 1층 로비. 밤엔 안내데스크 조명만 |
| `community_lounge_1.jpg` | 4층 소파존. **심야엔 아무도 없음** — 이 비어 있음이 씬의 전제 |
| `coaching_room.jpg` | 문이 항상 열려 있음. 안에 커피머신 |
| `jungle_stage.jpg` | 계단식 강당. 심야엔 **비상등만** |
| `canteen.jpg` · `cafe.jpg` | 배식 끝난 새벽. 냉장고와 자판기 발광 |
| `dormitory_room.jpg` | 2인실. **한 사람은 자고 한 사람은 폰을 보는** 밤. 폰 화면빛 |
| `basketball_court.jpg` | 외부 코트. 야간 조명탑이 들어옴 |
| `edu_terrace.jpg` | 중정 회랑, 주황 난간. 밤엔 난간 조명만 |
| `jungle_step.jpg` | 책장 벽 계단식 라운지 |

---

## 10. 변환 검수 기준

생성 결과를 아래로 걸러냅니다.

- **가구가 그대로인가.** 의자 개수와 위치가 바뀌었으면 강도를 낮춰 다시 돌립니다
- **창밖에 도시 불빛이 없는가.** 지평선이 밝게 떴으면 실패입니다
- **심야가 충분히 어두운가.** 한눈에 공간이 다 읽히면 아직 밝습니다
- **사람이 안 들어갔는가.** 실루엣이라도 들어갔으면 다시 돌립니다
- **여명이 보라→파랑인가.** 주황 일출이 나오면 다시 돌립니다 — 우리 여명은 해가 뜨기 **직전**입니다

---

## 11. 이 결과물로 하는 일

1. **타일맵 작업 세션에 넘깁니다** ([TILE_BRIEF.md](./TILE_BRIEF.md)) — 어디에 빛이 남는지 눈으로 확인하며 찍습니다
2. **스틸 CG 2종**(커넥트가든 여명 · 403 심야)의 배경 구도 잡기 ([character/ART_BRIEF.md](./character/ART_BRIEF.md) 4절)
3. **조명 오버레이 수치 검증** — 생성 결과의 색을 스포이드로 찍어 [TILE_BRIEF 5절](./TILE_BRIEF.md#5-조명-오버레이--5종-그림이-아닙니다)의 값과 대조

게임에 들어가는 건 **도트 타일맵과 손으로 그린 스틸**이지 이 이미지들이 아닙니다.
