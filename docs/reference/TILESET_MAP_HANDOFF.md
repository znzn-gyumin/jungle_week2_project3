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
| 팔레트 24~32색 | 사후 감축 | 마지막에 팔레트로 스냅해 강제 (실측 27·28·32색) |
| 1px 외곽선 | 손으로 | 실루엣 알파를 1px 팽창시켜 기계적으로 |
| 수정 비용 | 다시 뽑아야 함 | 함수 한 줄 고치고 재빌드 |

**대신 포기한 것이 있습니다.** `pixel_demo.png` 수준의 회화적 디테일(머리카락 하이라이트,
옷 주름 같은 밀도)은 코드로 그린 타일이 따라가지 못합니다. 형태·시점·팔레트·외곽선·가구 높이는
맞췄지만, **7절의 "디테일 밀도가 같은가" 항목은 사람 눈으로 한 번 봐주셔야 합니다.**
`preview/sheet_*.png` 를 `pixel_demo.png` 와 나란히 놓고 판단하시고, 밀도를 올려야 하면
해당 타일 함수만 고치면 됩니다.

`tools/cut_sheet.py` 는 그대로 둡니다 — 나중에 특정 타일만 생성으로 뽑아 끼워 넣을 때 여전히 씁니다.

---

## 1. 산출물

```
assets/
  tilesets/
    tileset_edu_indoor.png / .tsj / .index.json     103타일 · 32색
    tileset_dorm_indoor.png / .tsj / .index.json     52타일 · 27색
    tileset_outdoor.png / .tsj / .index.json         92타일 · 28색
    tileset_meta.png / .tsj                           2타일 (collision·trigger 마커)
  map/
    m1_basecamp_4f.json    44×30   NPC 26 · portal 2 · trigger 6
    m2_basecamp_2f.json    44×30
    m3_basecamp_1f.json    44×30
    m4_basecamp_b1.json    44×30
    m5_connect_garden.json 32×46
    m6_nestcamp.json       40×47
    m7_gate.json           40×30
src/config/lighting.ts     조명 오버레이 5종 + Phaser 컨트롤러
tools/tilegen/             생성기 전체 (재빌드 가능)
preview/                   맵 7장 · 조명 5종 · 이음매 4×4 검사 · 타일셋 시트
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

```
              [문1]        ┌─── 화이트보드 5칸 ───┐        [문2]
   x:           5              12  13  14  15  16          23
   ──────────────────────────────────────────────────────────────
   앞줄   y12    5    8   11  │  아일  │   18   21   24 ← 연하(문2 옆)
   2줄    y16    5    8   11* │        │   18 20 22 24    *주인공
   가운데 y20    5    8       │        │   18 20 22 24 ← 4조 4명 나란히
   뒷줄   y24    5*   8   11  │        │   18   21   24 ← 동갑(창가)
                 ↑기둥(3,21)                              *연상(5,24)
   ══════════════════ 남쪽 통창 (y27) ══════════════════
```

| 항목 | 구현 | 근거 |
|---|---|---|
| 화이트보드 | (12,6)~(16,7) **5타일** · 앞줄 y8이 접근 가능 | 4절 "다가가면 읽을 수 있어야" |
| 문 2개 | 문1 (5,6) · 문2 (23,6) · **둘 다 통행 가능** | "문1로 나가면 지나치지 않습니다" |
| 연하 | (24,12) — 문2와 x 차이 1 | "앞줄 · 문2 옆" |
| 동갑 | (24,24) — 뒷줄 · 남쪽 통창 인접 | "뒷줄 창가" |
| 연상 | (5,24) — 기둥(3,21) 뒤 | "뒷줄 · 기둥 뒤" |
| 4조 | (18,20)(20,20)(22,20)(24,20) — **간격 2칸**, 다른 줄은 3칸 | "뭉쳐 있다는 게 이 조의 표현" |
| 주인공 | (11,16) | 도면상 가운데 왼쪽 |
| 무명 | 17명, 남는 자리 전부 | "스물네 자리가 다 찬 것처럼" |

**총 25석 = 지정석 24 + 주인공석 1.** 브리프가 "무명 17명"과 "스물네 자리"를 동시에 적어서
(동갑1 + 연상1 + 연하1 + 4조4 + 무명17 = 24, 여기에 주인공 별도) 이렇게 해석했습니다.
**주인공을 24 안에 넣는 해석이 맞다면 무명이 16명이 되므로 알려주세요** — 한 줄 고치면 됩니다.

화이트보드에는 낙서가 이미 몇 줄 그려져 있습니다. **인게임 낙서를 챕터마다 덧그릴 자리**와
**플레이어 방명록**은 이 타일 위에 별도 스프라이트로 얹으시면 됩니다
(`trigger` 레이어의 `whiteboard`, 5×1칸).

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
| 야외 | 28 | 우드데크 · 석축 · 신록 · 회색 포장 (connect_garden) |

공통: 외곽선 `#2A2632` · 하이라이트 `#FFFFFF` · 정글 오렌지 `#E8763C`

### 이음매

바닥 노이즈는 **타일 로컬 좌표만으로** 생성하므로 이웃 타일과 어긋날 수 없습니다.
널·줄눈·단코처럼 **보여야 하는 선**은 주기를 48의 약수(12·16·24)로 잡아 이어 붙여도
간격이 일정합니다. `preview/seam_check_4x4.png` 에서 주요 바닥 12종을 4×4로 붙인 결과를 볼 수 있습니다.

---

## 5. 조명 오버레이 (5절)

`src/config/lighting.ts`. 타일맵은 **맵당 낮 기준 한 벌**이고 시간대는 오버레이로 만듭니다.

| 시간대 | 색 | 블렌드 | 불투명도 |
|---|---|---|---|
| `day` | `#FFE6B8` | soft-light | 12% (채도 −10%) |
| `evening` | `#E8763C` → `#2A3A63` | overlay | 35% |
| `night` | `#153A4A` | multiply | 45% |
| `deepnight` | `#0B1220` | multiply | **72%** |
| `dawn` | `#5B3E8C` → `#3E6BB0` | screen | 40% (M5 전용) |

**점광원**: 발광 타일에는 `light` 프로퍼티가 박혀 있습니다
(`monitor` `vending` `bollard` `lamp` `window` `ceiling`).
`night`·`deepnight` 에서 `LightingOverlay` 가 어둠을 이 지점에서 `ERASE` 로 파냅니다.
`ceiling`(매입 LED)은 밤·심야에 꺼집니다. **심야에 남는 건 발밑 조명·건물 창·모니터·자판기뿐**입니다.

`preview/lighting_m1_basecamp_4f.png` · `preview/lighting_m5_connect_garden.png` 에서
5종을 실제로 얹은 결과를 확인하세요. 특히 M5 심야 컷이 브리프가 말한 "얼굴이 거의 안 보이는 어둠"입니다.

각 맵 JSON의 `lighting` 프로퍼티에 그 맵에서 쓸 시간대가 콤마로 들어 있습니다.

> **채도 −10%만 근사치입니다.** Phaser 기본 파이프라인에 채도 조절이 없어 옅은 회백 tint로
> 대체했습니다. 정확히 맞추려면 커스텀 파이프라인이 필요합니다 (`applySaturation` 주석 참고).

---

## 6. 맵 연결

```
        M7 정문 ──정문── M3 1F ──후문── M5 커넥트가든 ──── M6 숙소동
                          │
                       계단 ↕
                       M2 2F ──계단── M1 4F   ← 허브
                          │
                       계단 ↕
                       M4 B1
```

- 교육동 3F는 만들지 않았고 계단을 **4F ↔ 2F 직결**로 처리했습니다.
- **M4(B1)는 브리프 다이어그램대로 M2(2F)에 붙였습니다.** 물리적으로는 B1이 1F 아래라
  M3에 붙는 게 자연스럽습니다. 다이어그램이 의도한 것인지 확인이 필요합니다 —
  `maps.py` 의 `m2` / `m4` 포탈 두 줄만 고치면 됩니다.
- M6는 **한 맵 안에 1F·3F·4F를 세로로 담고** x17~20을 전 층 관통 계단 스파인으로 썼습니다.
  3F↔4F 구간이 브리프가 지목한 **계단참**입니다.

---

## 7. 검수 결과 (7절)

```
$ python -m tilegen.qa
== 타일셋 ==
  tileset_edu_indoor   576×432  격자OK  103타일  32색  외곽선 5.1%  최대이음매 2.80 (f_rug)
  tileset_dorm_indoor  576×240  격자OK   52타일  27색  외곽선 6.1%  최대이음매 1.19 (f_gym)
  tileset_outdoor      576×384  격자OK   92타일  28색  외곽선 8.8%  최대이음매 1.20 (f_grass_b)
== 맵 ==
  m1  44×30  통행 746 / 도달 746   npc 26  portal 2  trigger 6
  m2  44×30  통행 770 / 도달 770   portal 6
  m3  44×30  통행 901 / 도달 901   portal 10
  m4  44×30  통행 865 / 도달 865   portal 2
  m5  32×46  통행 1101 / 도달 1101 portal 16
  m6  40×47  통행 959 / 도달 959   portal 8  trigger 24
  m7  40×30  통행 1136 / 도달 1136 portal 4
== 문제 없음 ==
```

"최대이음매"는 **타일 경계의 색 불연속 ÷ 타일 내부 평균 불연속**입니다.
1.0이면 경계가 내부 변화와 구분되지 않는다는 뜻이고, 2~3 이하면 눈에 안 띕니다.

QA가 검사하는 것:

- 아틀라스가 48px 격자에 맞는가 · 팔레트 색 수 · 외곽선 픽셀 비율
- 바닥 타일 경계 불연속도 (의도된 줄눈·널 이음은 제외)
- **스폰에서 통행 가능한 칸 전부에 도달하는가** (고립 구역 0칸)
- 모든 NPC·portal·trigger 가 도달 가능한가
- 포탈 왕복 정합 · 도착 좌표가 막힌 칸이 아닌가
- M1: 화이트보드 접근성 · 문 2개 · 연하가 문2 옆 · 4조 4명이 나란히 · 기둥 존재

---

## 8. 재빌드

```bash
pip install pillow numpy
python -m tilegen.build      # 타일셋 3종 + 맵 7개 재생성
python -m tilegen.qa         # 검수
python -m tilegen.previews   # 프리뷰 재생성
```

- 타일 하나 고치기 → `tilegen/tiles_edu.py` (또는 `tiles_dorm` / `tiles_out`) 의 해당 함수
- 팔레트 → `tilegen/palettes.py`
- 맵 배치 → `tilegen/maps.py`
- 조명 수치 → `tilegen/render.py` 의 `LIGHTING` 과 `src/config/lighting.ts` **양쪽**
  (프리뷰와 게임이 같은 값을 쓰도록 두 곳에 있습니다)

Tiled에서 직접 손보셔도 됩니다. 단, **재빌드하면 덮어쓰므로** 손본 맵은 파일명을 바꾸거나
`maps.py` 쪽에 반영해 주세요.

---

## 9. 남은 것 / 확인이 필요한 것

1. **화풍 밀도** — `pixel_demo.png` 와 나란히 놓고 판단 필요. 코드 드로잉의 한계 지점입니다.
2. **좌석 25석 해석** (3절 참고) — 주인공을 24 안에 넣을지.
3. **M4의 계단 연결** (6절 참고) — B1을 M2에 붙일지 M3에 붙일지.
4. **캐릭터 스프라이트와 가구 높이 대조** — 실제 걷는 스프라이트를 얹어 봐야 최종 확인됩니다.
   현재 책상 앞면 14px, 소파 앞면 8px, 자판기 높이 84px 기준입니다.
5. M2·M3·M4·M6·M7은 통행과 공간 구성 위주로 채웠습니다. M1·M5보다 레이아웃 밀도가 낮습니다.
