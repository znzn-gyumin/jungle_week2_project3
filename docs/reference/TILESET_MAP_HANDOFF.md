# jungLover — 타일셋 3종 · 타일맵 7개 인수인계

`docs/reference/TILE_BRIEF.md` 를 구현한 결과물입니다. **검수(7절) 자동 점검 전 항목 통과.**

---

## 0. 먼저 알아야 할 것 — 브리프와 달라진 제작 경로

브리프 0절은 이렇게 적혀 있습니다.

> 1. 생성으로 **타일 시트**를 뽑습니다 — 1024×1024 정사각에 4열 × 4행
> 2. `tools/cut_sheet.py`로 잘라 48px로 줄입니다
> 3. **이음매를 손으로 잡습니다**

**이 경로를 쓰지 않았습니다.** 브리프 스스로 "이어붙는 타일셋은 생성 모델로 안 나옵니다"라고 적어둔
그 이유가 3단계를 사람 손 작업으로 남기는데, 그러면 검수 기준(48px 격자 정합·이음매)이
매번 사람의 눈에 달리게 됩니다. 대신 **타일을 코드로 직접 그렸습니다**(Python/Pillow).

| | 생성 → 컷 → 손보정 | 코드로 직접 그리기 (채택) |
|---|---|---|
| 48px 격자 정합 | 매번 확인 필요 | 정의상 보장 |
| 이음매 | 손으로 잡아야 함 | 바닥 노이즈를 타일 로컬 좌표로만 생성 → 이음매가 생길 수 없음 |
| 팔레트 24~32색 | 사후 감축 | 마지막에 팔레트로 스냅해 강제 (실측 27·30·32색) |
| 1px 외곽선 | 손으로 | 실루엣 알파를 1px 팽창시켜 기계적으로 |
| 수정 비용 | 다시 뽑아야 함 | 함수 한 줄 고치고 재빌드 |

**대신 포기한 것이 있습니다.** 머리카락 하이라이트나 옷 주름 같은 회화적 디테일은 코드로 그린
타일이 따라가지 못합니다. 형태·시점·팔레트·외곽선·가구 높이는 맞췄지만, **7절의 "디테일 밀도가
맞는가" 항목은 사람 눈으로 한 번 봐주셔야 합니다.** `preview/sheet_*.jpg` 를 캐릭터 도트와
나란히 놓고 판단하시고, 밀도를 올려야 하면 해당 타일 함수만 고치면 됩니다.

`tools/cut_sheet.py` 는 그대로 둡니다 — 나중에 특정 타일만 생성으로 뽑아 끼워 넣을 때 여전히 씁니다.

---

## 1. 산출물

```
assets/
  tilesets/
    tileset_edu_indoor.png / .tsj / .index.json     103타일 · 32색
    tileset_dorm_indoor.png / .tsj / .index.json     52타일 · 27색
    tileset_outdoor.png / .tsj / .index.json        112타일 · 30색
    tileset_meta.png / .tsj                           2타일 (collision·trigger 마커)
  map/
    m1_basecamp_4f.json    44×30   NPC 25 · portal 2 · trigger 6
    m2_basecamp_2f.json    44×30
    m3_basecamp_1f.json    44×30
    m4_basecamp_b1.json    44×30
    m5_connect_garden.json 32×46
    m6_nestcamp.json       40×47
    m7_gate.json           40×30
src/config/lighting.ts     조명 오버레이 5종 + Phaser 컨트롤러
tools/tilegen/             생성기 전체 (재빌드 가능)
preview/                   맵 7장 · 조명 5종 · 이음매 4×4 검사 · 타일셋 시트 (jpg)
```

`.index.json` 은 **조각 이름 → 타일 id** 표입니다. 맵 빌더와 게임 코드가 참조합니다.
Tiled에서 새 맵을 만들 때는 `.tsj` 를 불러오면 됩니다.

---

## 2. Phaser 3 연결

맵 JSON에는 타일셋이 **임베드**돼 있습니다. Phaser는 외부 타일셋 참조(`source: *.tsj`)를
해석하지 못하기 때문입니다. Tiled 에디터는 임베드된 타일셋도 그대로 열고 편집합니다.

```ts
preload() {
  this.load.image('tileset_edu_indoor', 'assets/tilesets/tileset_edu_indoor.png');
  this.load.image('tileset_dorm_indoor', 'assets/tilesets/tileset_dorm_indoor.png');
  this.load.image('tileset_outdoor',    'assets/tilesets/tileset_outdoor.png');
  this.load.image('tileset_meta',       'assets/tilesets/tileset_meta.png');
  this.load.tilemapTiledJSON('m1_basecamp_4f', 'assets/map/m1_basecamp_4f.json');
}

loadMap(key: string) {
  const map = this.make.tilemap({ key });
  const sets = map.tilesets.map(ts => map.addTilesetImage(ts.name, ts.name)!);
  const ground    = map.createLayer('ground',    sets, 0, 0)!;
  const objects   = map.createLayer('objects',   sets, 0, 0)!;
  const collision = map.createLayer('collision', sets, 0, 0)!.setVisible(false);
  collision.setCollisionByExclusion([-1, 0]);       // 0이 아닌 gid = 막힘
  this.physics.add.collider(this.player, collision);

  this.lighting.attach(map, 100);
  this.lighting.setTime('day');
}
```

### 레이어

| 레이어 | 타입 | 용도 |
|---|---|---|
| `ground` | tilelayer | 바닥. 항상 통행 가능 |
| `objects` | tilelayer | 벽·가구·집기 |
| `collision` | tilelayer | **0이 아니면 막힘.** 게임에서는 `visible=false` (opacity 0으로 저장돼 있음) |
| `npc` | objectgroup | NPC 배치. `role`·`label`·`seat` 프로퍼티 |
| `portal` | objectgroup | 맵 이동. `to`·`spawnX`·`spawnY` |
| `trigger` | objectgroup | 씬 진입점·상호작용·스폰. `kind` 로 구분 |

`trigger.kind` 값: `spawn` `door` `room` `interact` `scene` `floor` `area` `whiteboard`

### 포탈

```json
{ "name": "stairs_to_2f", "type": "portal",
  "x": 1488, "y": 1152, "width": 48, "height": 48,
  "properties": [
    { "name": "to",     "value": "m2_basecamp_2f" },
    { "name": "spawnX", "value": 984 },
    { "name": "spawnY", "value": 264 } ] }
```

`spawnX/Y` 는 도착 맵의 **월드 픽셀 좌표(타일 중심)** 입니다.
`tools/tilegen/qa.py` 가 모든 포탈에 대해 ① 대상 맵 존재 ② 도착 좌표가 맵 안 ③ 도착 좌표가
통행 가능 ④ 왕복 포탈 존재를 검사합니다.

---

## 3. M1 교육장 403 — 좌석 배치 (브리프 4절)

**균일 그리드를 폐기했습니다.** 줄마다 책상 섬(pod)의 크기와 위치가 다르고, 6조 넷이 서로 다른
방향에 앉습니다. 누구에게 말을 걸지 = 어느 방향으로 걷는지 = 루트 선택.

```
              [문1 x5]        ┌── 화이트보드 x12~16 ──┐        [문2 x23]
   앞줄  y12    4   7  10     │        아일           │  19  (22)  25
   2줄   y16    4   7  10     │       (15)            │      23   26
   가운데y20    4              │  12 14 16 18 ←4조 밀착│           26
   뒷줄  y24   (5)  8  11     │                       │  21  24  (27)
              ↑기둥(3,21)
   ═════════════════════ 남쪽 통창 y27 ═════════════════════
```

| 자리 | 좌표 | 누구 | 왜 거기인가 |
|---|---|---|---|
| **뒷줄 창가 끝** | (27,24) | **동갑** 김민아 / 김민규 | 화이트보드에서 가장 먼 자리. 아무도 뒤에서 화면을 못 봅니다 |
| **뒷줄 기둥 옆** | (5,24) | **연상** 이승희 / 이승민 | 기둥(3,21)이 시선을 끊습니다 |
| **앞줄 문2 옆** | (22,12) | **연하** 장윤정 / 장윤호 | 문2(x23) 바로 옆. 오가는 사람이 다 보입니다 |
| **가운데 줄 한가운데 4석** | (12,20)(14,20)(16,20)(18,20) | **4조** 강태윤·강태연 / 한지오·한지아 / 조민 / 무명 1 | **간격 2칸** — 다른 줄은 3칸입니다. 뭉쳐 있다는 것 자체가 표현 |
| **가운데** | (15,16) | **주인공** | 2번째 줄 한가운데에 책상 하나만 따로 |

**세 방향 분산 검증** — 주인공(15,16) 기준
연하는 **오른쪽 위**(+x, −y), 연상은 **왼쪽 아래**(−x, +y), 동갑은 **오른쪽 아래**(+x, +y).
서로 다른 세 방향이고, `qa.py` 가 이 방향 벡터 개수를 세서 3종 미만이면 실패시킵니다.

**총 24석** = 무명 17 + 주인공 1 + 동갑·연상·연하 3 + 4조 중 이름 있는 3
(4조 넷 중 하나가 무명이라 무명 총계가 17이 됩니다.) 코치는 코칭실 403의 별도 NPC입니다.

화이트보드에는 낙서가 몇 줄 그려져 있습니다. **인게임 낙서를 챕터마다 덧그릴 자리**와
**플레이어 방명록**은 이 타일 위에 별도 스프라이트로 얹으시면 됩니다
(`trigger` 레이어의 `whiteboard`, 5×1칸).

---

## 3-2. M5 커넥트가든 — 빼면 안 되는 둘 (브리프 3절)

**① 야외 테이블과 의자**

`connect_garden.png` 그대로 **흰 와이어프레임**과 **올리브그린**을 섞었고, 가운데에
**초록 원형 받침 하이테이블 + 스툴**을 놓았습니다. 신규 타일 4종을 추가했습니다.

| 신규 타일 | 크기 | 설명 |
|---|---|---|
| `high_table` | 2×2 | 초록 원형 하이테이블. 기둥이 길어 상판이 높습니다 |
| `stool_g` / `stool_w` | 1×1 | 등받이 없는 스툴. 좌판이 높습니다 |
| `chair_out_left/right` (+ `_g_`) | 1×1 | 야외 의자 측면 방향 — 테이블 4면 배치용 |

테이블 8세트 + 하이테이블 2조, 앉을 수 있는 의자·스툴 **27개**입니다.

**빈 의자가 채워졌다가 다시 비는 모티프**는 `trigger` 레이어의 `two_chairs`(11,14 · 4×3칸)로
잡아뒀습니다. D1 비어 있음 → D7 처음 채워짐 → D11 다시 앉지만 곧 빌 걸 안다.

**② 필로티 아래 통로**

맵 남쪽(숙소동 방향) 끝, y36~42에 만들었습니다.

```
   y32   데크 끝
   y36   f_soffit_top    ← 건물 밑면이 시작되는 그늘 경계
   y37~41 f_pave_shade   ← 그늘진 통로 바닥 + 흰 원기둥 5본 (x1,7,13,19,25)
   y42   f_soffit_bot    ← 그늘이 끝나는 경계
   y43~45 f_pave         ← 건너편(숙소동 앞마당). 통로 너머로 보이는 밝은 포장
```

- 신규 타일: `piloti_round`(2×3 흰 원기둥) · `f_pave_shade` · `f_soffit_top/bot`
- 기둥 사이가 전부 뚫려 있어 가로로 완전히 통과됩니다 (`qa.py` 가 통로 한 줄이 끝에서 끝까지
  통행 가능한지 검사합니다)
- 그늘 색이 갈색으로 스냅되는 문제가 있어 야외 팔레트에 중간 무채색 2색(`#8E8E90` `#5A5A60`)을
  추가했습니다 (28색 → 30색)

> `trigger` 레이어의 `piloti_passage` 가 이 구간입니다. "건너간다 = 오늘은 잔다."

---

## 4. 타일셋

### 시점 규약 (탑다운 오블리크)

- 바닥은 완전 평면
- 오브젝트는 **윗면 + 앞면**이 보이고, 앞면 높이 12~18px
- 이 높이는 **2~2.5등신 캐릭터(스프라이트 약 32px) 기준으로 책상이 허리쯤** 오도록 잡은 값
- 방의 **북쪽 벽만 정면 2타일**, 동/서는 측면 1타일, 남쪽은 윗면 캡 1타일
  → 남쪽 통창은 정면 유리가 아니라 `w_window_s`(창턱 + 유리 띠 + 창밖 초록)로 표현

### 팔레트

| 타일셋 | 색 수 | 근거 |
|---|---|---|
| 교육동 실내 | 32 | 회백 카펫 · 흰 벽 · 회색 메시 의자 · 통유리 (classroom_1·2, opendesk) |
| 숙소동 실내 | 27 | 우드 비닐 · 리넨/네이비 침구 · 회청 기기 (dormitory_room) |
| 야외 | 30 | 우드데크 · 석축 · 신록 · 회색 포장 + 필로티 그늘용 중간 무채색 2색 (connect_garden) |

공통: 외곽선 `#2A2632` · 하이라이트 `#FFFFFF` · 정글 오렌지 `#E8763C`

### 이음매

바닥 노이즈는 **타일 로컬 좌표만으로** 생성하므로 이웃 타일과 어긋날 수 없습니다.
널·줄눈·단코처럼 **보여야 하는 선**은 주기를 48의 약수(12·16·24)로 잡아 이어 붙여도
간격이 일정합니다. `preview/seam_check_4x4.jpg` 에서 주요 바닥 12종을 4×4로 붙인 결과를 볼 수 있습니다.

---

## 5. 조명 오버레이 (5절)

`src/config/lighting.ts`. 타일맵은 **맵당 낮 기준 한 벌**이고 시간대는 오버레이로 만듭니다.

| 시간대 | 색 | 블렌드 | 불투명도 |
|---|---|---|---|
| `day` | `#FFE6B8` | soft-light | 12% (채도 −10%) |
| `evening` | `#E8763C` → `#2A3A63` | overlay | 35% |
| `night` | `#153A4A` | multiply | 45% |
| `deepnight` | `#0B1220` | multiply | **72%** |
| `dawn` | `#5B3E8C` → `#3E6BB0` | screen | 42% (M5 전용) · **선행 어둠 + 탈채도 있음** |

> **여명은 3단 처리입니다.** 밝은 낮 화면에 `screen`만 얹으면 원래 색조가 살아남아
> **따뜻한 분홍**이 됩니다(1차 산출물이 그랬습니다). "해 뜨기 직전이지 일출이 아니다"라는
> 브리프 문장대로 심야의 어둠이 남아 있어야 하므로,
> ① 채도 −60% → ② `#171326` multiply 74% (선행 어둠) → ③ 스펙의 `#5B3E8C`→`#3E6BB0` screen 42%
> 순으로 얹습니다. 스펙의 색·블렌드는 그대로 두고 **앞에 어둠을 깐 것**입니다.
> `qa.py`가 실제 렌더 결과의 색상(Hue)을 재서 위쪽이 보라(240~310°), 아래쪽이 파랑(195~265°),
> 그리고 위→아래 방향이 맞는지 검사합니다. 현재 **위 259° → 아래 225°**.

**점광원**: 발광 타일에는 `light` 프로퍼티가 박혀 있습니다
(`monitor` `vending` `bollard` `lamp` `window` `ceiling`).
`night`·`deepnight` 에서 `LightingOverlay` 가 어둠을 이 지점에서 `ERASE` 로 파냅니다.
`ceiling`(매입 LED)은 밤·심야에 꺼집니다. **심야에 남는 건 발밑 조명·건물 창·모니터·자판기뿐**입니다.

`preview/lighting_m1_basecamp_4f.jpg` · `preview/lighting_m5_connect_garden.png` 에서
5종을 실제로 얹은 결과를 확인하세요. 특히 M5 심야 컷이 브리프가 말한 "얼굴이 거의 안 보이는 어둠"입니다.

각 맵 JSON의 `lighting` 프로퍼티에 그 맵에서 쓸 시간대가 콤마로 들어 있습니다.

> **채도 −10%만 근사치입니다.** Phaser 기본 파이프라인에 채도 조절이 없어 옅은 회백 tint로
> 대체했습니다. 정확히 맞추려면 커스텀 파이프라인이 필요합니다 (`applySaturation` 주석 참고).

---

## 6. 맵 연결

**[`GAME_DESIGN 6-3`](../GAME_DESIGN.md#6-3-맵과-배경) 정본을 따릅니다.**

```
        M7 정문 ──정문── M3 1F ──후문── M5 커넥트가든 ──── M6 숙소동
                          │  ↕ 계단
                       M2 2F ──계단── M1 4F   ← 허브
                          │
        M3 1F ────────────┴─ ↕ 계단 ── M4 B1
```

**M3(1F)이 수직 동선의 허브입니다** — 위로 M2(2F), 아래로 M4(B1), 밖으로 M7(정문)과 M5(커넥트가든).

| 계단 | 좌표 |
|---|---|
| M3 1F ↕ M2 2F | M3 (27,3) ↔ M2 (27,25) |
| M2 2F ↕ M1 4F | M2 (20,3) ↔ M1 (31,24) · **3F는 만들지 않아 4F↔2F 직결** |
| M3 1F ↕ M4 B1 | M3 (31,3) ↔ M4 (25,3) |

> **1차 구현은 `TILE_BRIEF` 3절 다이어그램을 따라 M4를 M2 아래에 붙였습니다.**
> 그 다이어그램이 정본과 어긋나 있었고, 지금은 정본대로 **M4 ↔ M3** 로 고쳤습니다.

- 교육동 3F는 만들지 않습니다. 이번 기수가 안 쓰는 빈 층이라 계단을 4F ↔ 2F 직결로 처리합니다.
- M6는 **한 맵 안에 1F·3F·4F를 세로로 담고** x17~20을 전 층 관통 계단 스파인으로 썼습니다.
  3F↔4F 구간이 브리프가 지목한 **계단참**입니다.

---

## 7. 검수 결과 (7절)

```
$ python -m tilegen.qa
== 타일셋 ==
  tileset_edu_indoor   576×432  격자OK  103타일  32색  외곽선 5.1%  최대이음매 2.80 (f_rug)
  tileset_dorm_indoor  576×240  격자OK   52타일  27색  외곽선 6.1%  최대이음매 1.19 (f_gym)
  tileset_outdoor      576×480  격자OK  112타일  30색  외곽선 9.0%  최대이음매 1.20 (f_grass_b)
== 맵 ==
  m1  44×30  통행 753 / 도달 753   npc 25(교육장 24 + 코치)  portal 2  trigger 6
  m2  44×30  통행 770 / 도달 770   portal 6
  m3  44×30  통행 901 / 도달 901   portal 10
  m4  44×30  통행 865 / 도달 865   portal 2
  m5  32×46  통행 1138 / 도달 1138 portal 16  trigger 4
  m6  40×47  통행 944 / 도달 944   portal 8   trigger 24
  m7  40×30  통행 1136 / 도달 1136 portal 4
== M1/M5/여명 ==
  m1 지정석 24 · 무명 17
  m5 의자·스툴 27 · 필로티 원기둥 5본 · 통로 160칸
  여명 위 hue 259°(보라) → 아래 225°(파랑)
== 문제 없음 ==
```

"최대이음매"는 **타일 경계의 색 불연속 ÷ 타일 내부 평균 불연속**입니다.
1.0이면 경계가 내부 변화와 구분되지 않는다는 뜻이고, 2~3 이하면 눈에 안 띕니다.

QA가 검사하는 것 (★ = 이번에 추가된 브리프 7절 항목):

- 아틀라스가 48px 격자에 맞는가 · 팔레트 색 수 · 외곽선 픽셀 비율
- 바닥 타일 경계 불연속도 (의도된 줄눈·널 이음은 제외)
- **스폰에서 통행 가능한 칸 전부에 도달하는가** (고립 구역 0칸)
- 모든 NPC·portal·trigger 가 도달 가능한가
- 포탈 왕복 정합 · 도착 좌표가 막힌 칸이 아닌가
- M1: 화이트보드 접근성 · 문 2개 · 연하가 문2 옆 · 기둥 존재
- ★ M1 동갑·연상·연하가 주인공 기준 **세 방향**으로 흩어져 있는가 (방향 벡터 3종)
- ★ M1 4조 넷이 **같은 줄에 간격 2칸 이하로** 붙어 있고, 그 간격이 **다른 줄보다 촘촘한가**
- ★ M1 교육장 지정석이 정확히 24석인가
- ★ M5 데크에 앉을 수 있는 의자가 12개 이상 · 하이테이블 존재
- ★ M5 필로티 원기둥 존재 · 통로가 **가로로 완전히 뚫려** 있는가
- ★ 여명 렌더 결과의 위/아래 Hue가 보라 → 파랑인가

## 8. 재빌드

```bash
pip install pillow numpy

# 저장소 루트에서
python -m tools.tilegen.build      # 타일셋 3종 + 맵 7개 재생성
python -m tools.tilegen.qa         # 검수
python -m tools.tilegen.previews   # 프리뷰 재생성
```

> **Windows에서 `python` 이 MSYS2 쪽으로 잡히면** Pillow가 없어 `ModuleNotFoundError: No module
> named 'PIL'` 로 죽습니다. 인터프리터를 직접 지정하세요.
>
> ```bash
> PY="C:/Users/wfami/AppData/Local/Python/pythoncore-3.14-64/python.exe"
> "$PY" -m tools.tilegen.build
> ```

### 출력 경로 규칙

`tools/tilegen/paths.py` 가 두 레이아웃을 구분합니다.

| 레이아웃 | 조건 | 출력 위치 |
|---|---|---|
| **배포** (이 저장소) | `tilegen` 의 부모 폴더 이름이 `tools` | 저장소 루트 — `assets/` `preview/` |
| 개발 (생성기만 따로) | 그 외 | `<부모>/out/assets` `<부모>/out/preview` |

환경변수 `JL_OUT` 으로 강제 지정할 수도 있습니다.

> 1차 배포판은 이 구분이 없어서, 저장소에서 돌리면 `tools/out/assets/…` 에 엉뚱하게 썼습니다.
> 지금은 저장소 루트의 `assets/` `preview/` 를 바로 덮어씁니다.

### 어디를 고치나

- 타일 하나 고치기 → `tools/tilegen/tiles_edu.py` (또는 `tiles_dorm` / `tiles_out`) 의 해당 함수
- 팔레트 → `tools/tilegen/palettes.py`
- 맵 배치·좌석·포탈 → `tools/tilegen/maps.py`
- 조명 수치 → `tools/tilegen/render.py` 의 `LIGHTING` 과 `src/config/lighting.ts` **양쪽**
  (프리뷰와 게임이 같은 값을 쓰도록 두 곳에 있습니다)

Tiled에서 직접 손보셔도 됩니다. 단, **재빌드하면 덮어쓰므로** 손본 맵은 파일명을 바꾸거나
`maps.py` 쪽에 반영해 주세요.

---

## 9. 남은 것 / 확인이 필요한 것

1. **화풍 밀도** — 판단 보류 중입니다. 타일은 외곽선이 옅은 저채도 미니멀에 27~32색이고,
   캐릭터는 1px 외곽선에 8~12색입니다 ([DOT_SPEC 1절](./character/DOT_SPEC.md#1-규격)).
   **캐릭터 도트가 나오면 M1 위에 합성해 보고 결정합니다.** 그때까지 타일은 건드리지 않습니다.
2. ~~M4의 계단 연결~~ — **해결.** `GAME_DESIGN 6-3` 정본대로 M4 ↔ M3 으로 고쳤습니다.
3. **낮 채도 −10% / 여명 채도 −60%** — Phaser 기본 파이프라인에 채도 셰이더가 없어 회백색
   tint 로 근사했습니다. 프리뷰(Pillow)는 정확한 채도 연산을 쓰므로 **게임 화면이 프리뷰보다
   약간 더 쨍할 수 있습니다.** 정확히 맞추려면 커스텀 파이프라인이 필요합니다.
4. **캐릭터 스프라이트와 가구 높이 대조** — 실제 걷는 스프라이트를 얹어 봐야 최종 확인됩니다.
   현재 책상 앞면 14px, 소파 앞면 8px, 자판기 높이 84px 기준입니다.
5. M2·M3·M4·M6·M7은 통행과 공간 구성 위주로 채웠습니다. M1·M5보다 레이아웃 밀도가 낮습니다.
