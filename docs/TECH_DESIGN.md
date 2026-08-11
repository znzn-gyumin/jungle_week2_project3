# jungLover — 기술 설계서 v0.1

> 기획서: [GAME_DESIGN.md](./GAME_DESIGN.md)
> 배포 목표: GitHub Pages (프런트) · Firebase (인증 · 데이터)

---

## 1. 스택

| 레이어 | 선택 | 근거 |
|---|---|---|
| 빌드 | **Vite + TypeScript** | 정적 빌드 결과물이 그대로 GitHub Pages에 올라감. TS는 씬 데이터·상태 타입 안정성에 실익이 큼 |
| 도트 맵 | **Phaser 3** (캠퍼스 7개 맵) | 타일맵 로딩·스프라이트 애니메이션·충돌·맵 전환을 직접 짜지 않아도 됨. Tiled 에디터로 맵 제작 |
| VN 레이어 | **순수 DOM + CSS** | 대사창·선택지·백로그·설정은 DOM이 압도적으로 쉽고 접근성·폰트 품질도 좋음. Phaser Text로 짜면 고생만 함 |
| 상태 관리 | 자체 스토어 (단일 객체 + 구독) | 규모상 라이브러리 불필요 |
| **인증 · 저장** | **Firebase** (Auth + Firestore) | Google 로그인이 제공자 설정 한 줄. **권한 로직을 보안 규칙으로 서버에 올릴 수 있어** 별도 서버 앱을 만들지 않아도 됨 |

### 하이브리드 구조가 핵심

**캠퍼스 안에서는 늘 도트 맵 위에 있고, 대사는 그 위에 대사창으로 얹힙니다.** 캠퍼스 밖(D7 외출)에서만 맵을 숨기고 일러스트 배경으로 전환합니다. 그래서 두 레이어를 분리합니다.

```
┌─────────────────────────────────┐
│  DOM 오버레이 (z-index 위)       │  ← 대사창, 선택지, 백로그, 메뉴, CG
├─────────────────────────────────┤
│  Phaser Canvas (z-index 아래)    │  ← 캠퍼스 7개 맵 (밖에서는 숨김)
└─────────────────────────────────┘
```

맵에서 NPC에게 말을 걸거나 **이벤트 트리거 좌표에 진입하면** Phaser가 이벤트를 emit → DOM VN 레이어가 씬을 재생 → 종료 후 Phaser에 제어 반환. **캠퍼스 밖 씬(D7 외출·귀소 버스·5년 후)에서만** 캔버스를 숨기고 일러스트 배경을 DOM으로 깝니다.

| 모드 | 캔버스 | 배경 | 이동 |
|---|---|---|---|
| **캠퍼스 안** | 표시 | 타일맵 | 가능 |
| 캠퍼스 안 · 명장면 | 숨김 | 일러스트 컷 | 불가 |
| **캠퍼스 밖** | 숨김 | 일러스트 배경 | 불가 |

> **Phaser를 권합니다.** 맵이 7개가 되면서 타일맵 로딩·충돌·맵 간 전환·플레이어 위치 복원을 직접 짜는 비용이 커졌습니다. Tiled 연동도 사실상 필수입니다.

### 서버 애플리케이션은 만들지 않습니다

**백엔드는 있습니다 — 직접 짜고 띄우지 않을 뿐입니다.** Firebase가 관리형으로 제공하고, 그 위의 **보안 규칙이 이 프로젝트가 쓰는 서버 측 로직**입니다 ([4-3](#4-3-방명록--구현)).

| | 어디서 도는가 | 누가 만드는가 |
|---|---|---|
| 게임 로직 · 씬 재생 · 맵 | **브라우저** | 직접 |
| 로그인 · 토큰 발급 | Firebase Auth **서버** | Google |
| 세이브 · 방명록 저장 | Firestore **서버** | Google |
| **권한 · 입력 검증** | Firestore **서버** | **직접** (`firestore.rules`) |
| 정적 파일 배포 | GitHub Pages | — |

**직접 운영하는 런타임이 없다**는 게 핵심입니다. Node 서버도, 컨테이너도, 스케일링도 없습니다. 대신 **접근 제어를 규칙 언어로 서술**해 서버에 올립니다 — 그게 이 설계에서 백엔드에 해당하는 부분이고, 저장소에 `firestore.rules`로 남습니다.

빌드 결과물은 정적 파일이라 **GitHub Pages 배포가 그대로 유지**됩니다 ([6절](#6-배포)).

**Spark(무료) 티어로 충분합니다.** 포트폴리오 규모에서 문서 읽기·쓰기가 무료 한도를 넘지 않고, 카드 등록도 필요 없습니다.

---

## 2. 프로젝트 구조

```
src/
├─ main.ts                  # 진입점, 부트 시퀀스
├─ core/
│  ├─ state.ts              # GameState 정의 + 스토어
│  ├─ auth.ts               # Firebase Auth — Google 로그인/로그아웃
│  ├─ save.ts               # Firestore 세이브/로드 (+ 오프라인 큐)
│  ├─ flow.ts               # 챕터 진행·루트 판정·엔딩 판정
│  └─ assets.ts             # 프리로드 매니페스트
├─ ui/
│  ├─ LoginGate.ts          # 타이틀 앞 로그인 화면
│  └─ Guestbook.ts          # 화이트보드 방명록 (열람 + 작성)
├─ vn/
│  ├─ Player.ts             # 씬 재생기 (한 줄씩 소비)
│  ├─ Typewriter.ts         # 타자 효과, 클릭 시 즉시 완성
│  ├─ ChoiceBox.ts
│  ├─ Messenger.ts         # 메신저 UI 씬 (yunjung 루트 필수)
│  ├─ Backlog.ts
│  └─ ui.css
├─ map/
│  ├─ CampusScene.ts        # Phaser Scene 1개가 7개 맵을 전환하며 씀
│  ├─ maps.ts               # 맵 정의·연결(계단/문)·조명 변형
│  ├─ npc.ts                # NPC 배치·상호작용 정의 (맵별·챕터별)
│  └─ triggers.ts           # 좌표 진입 시 씬 발동
├─ script/
│  ├─ 00_prologue.vns       # 프롤로그 5씬(◆ 자유 이동 포함) + 첫인상 6씬 (첫인상은 인물별 내용)
│  ├─ common/               # 공용 씬 7개
│  │  ├─ c2_ranking.vns  c2_freeroam.vns  c3_outing.vns
│  │  ├─ c3_bus.vns      c4_freeroam.vns  e_ceremony.vns
│  │  └─ e_solo.vns
│  ├─ routes/               # 인물별 12씬 — 6파일이 같은 접미사 목록을 가짐
│  │  ├─ minah.vns      seunghee.vns   yunjung.vns   # 여
│  │  └─ mingyu.vns     seungmin.vns   yunho.vns     # 남
│  └─ compiled.json         # 빌드 시 생성
└─ tools/
   └─ compile-script.ts     # .vns → JSON 컴파일러 (Vite 플러그인)

firestore.rules               # 보안 규칙 (4-3)

assets/                       # 규격은 assets/README.md
├─ cg/{standing,event}/
├─ dot/{walk,face}/
├─ bg/{outing,epilogue,campus}/
├─ map/                     # Tiled 익스포트 7개
├─ tilesets/
└─ ui/

public/
└─ audio/{bgm,se}/
```

> **`assets/`는 `public/` 밖에 있습니다.** Vite는 `public/`만 그대로 복사하므로, `vite.config.ts`에 **`publicDir` 추가 또는 복사 플러그인**이 필요합니다. 런타임에 URL로 읽는 파일들이라 번들에 들어가면 안 됩니다.

---

## 3. 씬 스크립트 DSL

총 분량은 **90씬 / 약 1,980줄**입니다 ([GAME_DESIGN 7절](./GAME_DESIGN.md#7-분량-예산)). JSON으로 직접 쓰지 못할 규모는 아니지만, **읽고 쓰기 쉬운 텍스트 포맷을 만들고 빌드 시 JSON으로 컴파일**하는 쪽을 택합니다. 이유는 세 가지입니다.

- **토큰 치환**이 필수입니다. 주인공 이름(`{P}`)과 호칭 단계(`{P:호칭}`)가 거의 모든 줄에 들어가는데, JSON 문자열 안에서 이걸 관리하면 가독성이 무너집니다
- **조건부 선택지**가 있습니다. `if flag:` / `if affection>=` 를 JSON으로 쓰면 중첩이 깊어집니다
- 대사 수정이 잦은데, **git diff가 읽히는 포맷**이어야 퇴고가 가능합니다

파서 자체가 포트폴리오에서 보여줄 만한 물건이기도 합니다.

### 3-1. 문법

```
=== r_yunjung_c2_garden ===
@bg   garden_dawn
@bgm  midnight
@char 윤정 center

윤정 [평상] "…{P:호칭}도 안 자요?"
나 "잠이 안 와서."
* 새벽 두 시. 커넥트가든에는 우리 둘뿐이었다.
윤정 [평상] "…저도요."

@choice
  "옆에 앉아 있는다"            | affection+7           | -> sit
  "발표 자료를 대신 고쳐준다"     | skill+25 affection-2  | -> fix
  "그 도트, 네가 만든 거야?"      | affection+7 | if flag:saw_pixelart | -> pixelart

--- sit ---
@cg cg_c2_garden
윤정 [미소] "…앉아요."
@flag set garden_together
-> next_chapter
```

| 기호 | 의미 |
|---|---|
| `=== id ===` | 씬 시작 |
| `@bg` `@bgm` `@se` `@cg` | 연출 명령. `@bgm` 값은 [WORLD_BIBLE 10-1](./WORLD_BIBLE.md#10-1-bgm-8곡)의 여덟 `id` 중 하나 |
| `@char 이름 위치` | 캐릭터 입장 (left/center/right) |
| `이름 [표정] "대사"` | 대사 한 줄. 표정 생략 시 직전 표정 유지 |
| `* 텍스트` | 내레이션 |
| `@choice` | 선택지 블록. 효과는 공백으로 나열(`skill+25 affection-2`), `if` 절은 선택 |
| `--- label ---` | 분기 라벨 |
| `-> target` | 점프 |
| `-> back` | **자유 이동 구간으로 복귀** |
| `@flag set/clear` | 플래그 조작 |
| `@char none` | 캐릭터 전원 퇴장 |
| `@freeroam` 블록 | **맵으로 제어 반환** (아래) |

#### `@freeroam` 블록

Phaser 맵으로 제어를 넘기는 명령입니다. `limit`만큼 대화하면 자동으로 `after`로 빠져나옵니다. **이동 자체는 제한하지 않고, 대화 횟수만 셉니다.**

```
@freeroam prologue
  limit 2
  spawn m1_basecamp_4f 12,8
  npc 민아  at m1_basecamp_4f -> p_meet_minah      # 남주 플레이
  npc 승희  at m1_basecamp_4f -> p_meet_seunghee
  npc 윤정  at m1_basecamp_4f -> p_meet_yunjung
  trigger m5_connect_garden -> p_night
  after -> p_night
```

| 지시 | 뜻 |
|---|---|
| `spawn 맵 x,y` | 진입 시 플레이어 시작 위치 |
| `npc 이름 at 맵 -> 씬` | 해당 맵에 NPC 배치. 말을 걸면 씬 재생 |
| `trigger 맵 -> 씬` | 그 맵에 **진입하는 것만으로** 씬 발동 |
| `limit n` | 대화 가능 횟수 |
| `after -> 씬` | 횟수 소진 시 이동할 씬 |

- 각 씬은 끝에서 `-> back`으로 맵에 돌아오고, 재생기가 남은 횟수를 차감합니다
- 히로인과 대화하면 `호감도 +6`이 자동 적용됩니다
- 이미 만난 NPC는 상호작용 아이콘이 사라집니다
- **배치되는 3인은 `playerGender`의 반대 성별**입니다. 컴파일러가 `RouteId`의 성별로 걸러 냅니다
- **D1은 셋 다 교육장 403에 있습니다.** 배정 직후라 아직 흩어지기 전이고, 자유 이동도 여기서 시작합니다 ([WORLD_BIBLE 4-2](./WORLD_BIBLE.md#4-2-장소별-상세))
- **D5·D8에서는 맵이 갈립니다.** 그날 상태에 따라 다른 층에 있으므로(승희는 사람을 피해 2층, 윤정은 작업 모드일 때만 2층) 누구를 만날지 정하려면 그 층까지 걸어가야 합니다 ([GAME_DESIGN 1-2](./GAME_DESIGN.md#1-2-캠퍼스-안--도트-이동--캠퍼스-밖--이벤트-씬))

### 3-2. 치환 토큰

**히로인 이름은 파일이 결정하므로 리터럴로 씁니다.** 런타임에 바뀌는 건 **주인공 쪽 값과 호칭 단계** 둘뿐이고, 그것만 토큰으로 둡니다.

```
{P}          → 주인공 이름     (도윤 / 도아)
{P:성명}      → 성 + 이름       (이도윤 / 이도아)
{P:호격}      → 이름 + 호격조사  (도윤아 / 도아야)   — 부를 때
{P:접미}      → 이름 + 접미사 -이  (도윤이 / 도아)    — 뒤에 관계어가 올 때
{P:그|그녀}   → 주인공 성별에 따라 좌/우 선택
{P:호칭}      → 히로인이 주인공을 부르는 말 — 호감도 구간 × 루트로 결정
{H:호칭}      → 주인공이 히로인을 부르는 말 — 선배 / 누나·오빠 / 이름
```

#### 이름은 성과 이름을 나눠 받습니다

**`playerName` 하나로는 부족합니다.** 호칭 표에 `"이도윤"`(풀네임)과 `"도윤"`(이름)이 둘 다 나오기 때문입니다.

```ts
playerFamilyName: string;   // 1~2자. 기본 "이"
playerGivenName: string;    // 1~3자. 기본 "도윤" / "도아"
```

| | 길이 | 비고 |
|---|---|---|
| **성** | **1~2자** | 복성 허용 — 남궁 · 황보 · 선우 · 제갈 |
| **이름** | **1~3자** | **1~2자 권장.** 외자(별 · 하늘 · 결)가 흔하므로 2자만 상정하지 않습니다 |

**입력 검증**

- **완성형 한글 음절(`가`~`힣`)만** 받습니다. 자모 단독(`ㄱ` `ㅏ`) · 영문 · 숫자 · 공백 · 기호는 거부합니다 — 호격조사 판정이 받침 계산에 기대고 있어 완성형이 아니면 성립하지 않습니다
- 상한은 **입력창 `maxlength`로 물리적으로 막습니다.** 다 치고 나서 에러를 띄우는 것보다 애초에 안 들어가는 편이 낫습니다
- **빈 칸이면 기본값**(`이` / `도윤` · `도아`)을 씁니다. 필수 입력으로 막지 않습니다

**왜 이 상한인가**

- **주인공 이름이 뜨는 곳은 이름표가 아니라 히로인의 대사줄입니다.** 주인공이 말할 때 이름표는 `나`이므로([WORLD_BIBLE 11](./WORLD_BIBLE.md#11-ui-톤)), 상한을 정하는 건 **대사 한 줄의 길이**입니다
- `{P:호칭}` 조합의 최장은 **`{P:접미} 오빠`**(장윤정 50 이후)입니다 — 이름 **1~2자면 4~5자**, 3자면 6자가 됩니다. 그 이상은 대사창에서 줄이 밀립니다
- 성이 2자를 넘는 한국 성씨는 없습니다

> **호칭 조합은 이름 1~2자에서 가장 자연스럽습니다.** 아래는 `성 · 이름`을 나눠 적은 것입니다.
>
> | 성 | 이름 | `{P:접미} 오빠` | |
> |---|---|---|---|
> | 이 | **별** | `별이 오빠` (4자) | 자연스러움 |
> | 이 | **도윤** | `도윤이 오빠` (5자) | 자연스러움 |
> | 이 | **늘푸름** | `늘푸름이 오빠` (6자) | 길어짐 — 받되 권장은 아님 |
>
> **예시를 성과 이름으로 나눠 적는 이유**는 한국어 음절 대부분이 성씨로도 쓰이기 때문입니다. `서윤아`처럼 붙여 쓰면 `서 + 윤아`로 읽혀 3자 이름의 예시가 되지 않습니다.

#### 받침을 보는 규칙이 둘입니다

**호격조사와 접미사는 국어에서 서로 다른 품사**이고, 이 게임에서도 다른 토큰입니다. 둘 다 마지막 글자의 받침을 보지만 결과가 다릅니다.

| | 문법 분류 | 토큰 | 하는 일 |
|---|---|---|---|
| `-아 / -야` | **호격조사** | `{P:호격}` | 그 자체로 부르는 말이 됨 |
| `-이` | **접미사** | `{P:접미}` | 뒤에 말이 이어질 때 어조를 고름 |

**받침이 없으면 접미사는 아무것도 안 붙습니다.** 절반의 경우 붙는 글자가 없으므로 **토큰은 결과 문자가 아니라 역할로 부릅니다** — 다른 토큰(`{P:성명}` `{P:호격}` `{P:호칭}`)과 같은 규칙입니다.

| 이름 | `{P:호격}` | `{P:접미}` |
|---|---|---|
| 도윤 (받침 ㄴ) | 도윤**아** | 도윤**이** |
| 도아 (받침 없음) | 도아**야** | 도아 |
| 별 (받침 ㄹ) | 별**아** | 별**이** |

```ts
const 받침 = (name: string) => {
  const code = name.charCodeAt(name.length - 1) - 0xAC00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
};

const 호격 = (n: string) => n + (받침(n) ? '아' : '야');   // 부를 때
const 접미  = (n: string) => n + (받침(n) ? '이' : '');    // 뒤에 말이 더 올 때
```

- **`{P:호격}`은 그 자체로 부르는 말**이라 뒤에 아무것도 안 붙습니다. `"도윤아 오빠"`는 성립하지 않습니다
- **`{P:접미}`는 뒤에 관계어가 올 때** 씁니다 — `도윤이 오빠` · `별이 누나`

#### 접미사는 사적 호칭에만 붙습니다

| | 붙는가 | 예 |
|---|---|---|
| **오빠 · 누나** (사적) | **붙음** | `도윤이 오빠` |
| **선배 · 님** (공적) | 안 붙음 | `도윤 선배` · `도윤 님` |

**그래서 `선배` → `오빠/누나` 전환이 두 겹으로 바뀝니다** — 관계어가 바뀌고 이름 형태도 바뀝니다(`도윤 선배` → `도윤이 오빠`). 받침 없는 이름은 이름 쪽이 안 바뀌지만(`도아 선배` → `도아 누나`), 그건 언어가 그런 것이라 설계로 보정하지 않습니다.

> **집필 규칙**: 주인공 이름 뒤에 **주격·목적격 조사를 직접 붙이지 않습니다.** `"{P}이 왔네"`는 이름에 따라 `"도아이"`가 되어 깨집니다. 이름은 **부를 때(`{P:호격}`)나 관계어 앞(`{P:접미}`)에만** 쓰고, 문장 안에서는 `{P:호칭}`으로 대신합니다.

`{P:호칭}`과 `{H:호칭}`이 이 게임의 관계 게이지입니다. 호감도를 UI에 안 띄우는 대신 **부르는 말이 바뀌는 것으로 진전을 보여주므로**, 거의 모든 씬에 들어갑니다. 대응표는 [GAME_DESIGN 2-4](./GAME_DESIGN.md#2-4-호칭-시스템)에 있습니다.

- `{P:호칭}`은 **루트마다 표가 다릅니다.** 김민규는 0~24 구간이 "(안 부름)"이라 **토큰이 빈 문자열로 치환되고 문장 자체가 다른 형태여야 합니다** — 이 루트만 `@if` 분기 없이 대사를 따로 씁니다
- `{H:호칭}`은 이승희·이승민 루트에서만 3단계로 움직입니다. 나머지 넷은 이름 고정이고, 단계 값은 [CHARACTERS](./CHARACTERS.md#2-히로인-6인)의 두 인물 절에 있습니다
- **[CHARACTERS](./CHARACTERS.md#2-히로인-6인)의 호칭 표는 기본 이름(도윤/도아) 기준 예시**입니다. 실제로는 위 토큰이 조합됩니다 — `"이도윤"`은 `{P:성명}`, `"도윤아"`는 `{P:호격}`, `"도윤이 오빠"`는 `{P:접미} 오빠`

런타임 치환이라 컴파일된 JSON은 **호감도 구간 무관 1벌**만 존재합니다. 호칭 단계 때문에 텍스트가 4배가 되지 않는 지점이 여기입니다.

### 3-3. 컴파일 결과

```ts
type Line =
  | { t: 'say';  who: string; face?: string; text: string }
  | { t: 'narr'; text: string }
  | { t: 'bg' | 'bgm' | 'se' | 'cg'; id: string }
  | { t: 'char'; who: string; pos: 'left'|'center'|'right' }
  | { t: 'charOut' }                                   // @char none — 전원 퇴장
  | { t: 'msg'; on: boolean }                          // 메신저 오버레이 (3-4)
  | { t: 'bubble'; side: 'them'|'me'; text: string }   // < / >  — 치환은 say와 동일
  | { t: 'wait'; sec: number }                         // … Ns — 입력 중 인디케이터
  | { t: 'choice'; options: ChoiceOption[] }
  | { t: 'flag'; op: 'set'|'clear'; id: string }
  | { t: 'jump'; target: string }          // target 'back' = 자유 이동 복귀
  | { t: 'freeroam'; id: string; limit: number; spawn: { map: MapId; x: number; y: number };
      npcs: { who: string; map: MapId; target: string }[];
      triggers: { map: MapId; target: string }[]; after: string };

type MapId =
  | 'm1_basecamp_4f' | 'm2_basecamp_2f' | 'm3_basecamp_1f' | 'm4_basecamp_b1'
  | 'm5_connect_garden' | 'm6_nestcamp' | 'm7_gate';

type ChoiceOption = {
  text: string;
  effects: { affection?: number; skill?: number };
  cond?: string;      // "flag:saw_pixelart", "affection>=40"
  target: string;
};

type Scene = { id: string; lines: Line[]; labels: Record<string, number> };
```

`labels`가 인덱스 맵이라 점프가 O(1)이고, 세이브 시점 복원도 `{sceneId, lineIndex}` 두 값이면 끝납니다.

**메신저 세 줄(`msg` · `bubble` · `wait`)은 재생기에서만 갈립니다.** 나머지와 같은 `Line[]`에 섞여 있고 `msg:on`부터 `msg:off`까지를 DOM 오버레이가 받습니다 — 별도 씬 타입을 두지 않으므로 세이브 복원도 `lineIndex` 하나로 그대로 됩니다.

#### 6인 병행을 지탱하는 규칙

`routes/` 아래 **6개 파일이 인물 하나씩**을 담습니다. 씬 ID는 `r_<루트ID>_<접미사>` 형태이고, **접미사 목록이 여섯 파일에서 동일**합니다.

```
minah.vns     →  r_minah_c1_pair,     r_minah_c1_review,     r_minah_c2_allnighter,     …
seunghee.vns  →  r_seunghee_c1_pair,  r_seunghee_c1_review,  r_seunghee_c2_allnighter,  …
yunho.vns     →  r_yunho_c1_pair,     r_yunho_c1_review,     r_yunho_c2_allnighter,     …
```

```ts
type RouteId =
  | 'minah' | 'seunghee' | 'yunjung'      // 여 — 주인공이 남자일 때
  | 'mingyu' | 'seungmin' | 'yunho';      // 남 — 주인공이 여자일 때

scenes: Record<string, Scene>;            // 키가 곧 씬 ID
```

**루트 ID가 인물을 직접 가리키므로 성별 키가 필요 없습니다.** 히로인 성별은 `RouteId`에서 결정되고, 선택 가능한 루트는 `playerGender`의 반대쪽 3개입니다.

컴파일 시 **여섯 파일의 접미사 집합이 일치하는지 검증**합니다. 한 인물만 씬이 빠지면 빌드가 실패하므로, 병행 작업 중 누락이 즉시 잡힙니다.

```
[compile] yunho.vns: 씬 누락 — c4_lastnight (minah 기준)
```

**이 검증이 6인 병행의 안전장치입니다.** 12배치를 가로로 채워나가는 동안 어디까지 됐는지를 빌드가 알려줍니다.

### 3-4. 메신저 씬

**장윤정 루트의 핵심 장치입니다.** 대면에서는 활발하고 애교가 많은데 **채팅에서는 짧고 사무적입니다.** 이 낙차가 "작업 모드의 윤정"을 미리 보여주는 장치라, 별도 UI 없이는 성립하지 않습니다 ([CHARACTERS 2-3](./CHARACTERS.md#2-3-장윤정--여-21--그래픽디자인-2학년)).

```
@msg on
< "내일 발표 순서 3번이요"
< "자료는 22시까지 주세요"
> "너 채팅으로는 말투가 딴사람이네"
… 3s
< "일할 때는요."
< "…{P:호칭}도 자요 이제ㅠ"
@msg off
```

| 기호 | 의미 |
|---|---|
| `@msg on/off` | 메신저 오버레이 진입/이탈 |
| `<` | 상대 말풍선 (좌측) |
| `>` | 주인공 말풍선 (우측) |
| `… Ns` | N초 대기 + **입력 중** 인디케이터 |

- 말풍선이 **아래에서 위로 쌓이는 애니메이션**이 있어야 채팅 특유의 리듬이 삽니다. 특히 `… 3s`로 뜸을 들인 뒤의 한마디(`"일할 때는요."`)는 **타이밍이 전부**입니다
- 구현은 DOM 오버레이 하나 추가로 끝납니다. 대사창을 숨기고 그 위에 채팅 리스트를 올리면 됩니다
- **나머지 다섯 루트에서도 1회씩 재사용**할 것을 권합니다. 윤정 전용으로 두면 구현 비용 대비 등장 횟수가 아깝고, 인물별로 채팅 문체를 다르게 쓰면 그 자체가 캐릭터 묘사가 됩니다

---

## 4. 게임 상태

```ts
type GameState = {
  playerGender: 'male' | 'female';
  playerFamilyName: string;      // 1~2자. 기본 "이"
  playerGivenName: string;       // 1~3자. 기본 "도윤" / "도아"

  route: RouteId | null;          // 프롤로그 D1 밤에 확정 (3-3의 RouteId)
  affection: number;   // 0~100
  skill: number;       // 0~100

  chapter: number;     // 0=프롤로그 … 5=결말
  chapterDay: number;  // 1~12 — 방명록 날짜 해금 비교용
  dateSpot?: 'folkvillage' | 'everland' | 'univtown';

  // 맵 상태
  map: MapId;                     // 현재 맵
  pos: { x: number; y: number };  // 맵 안 좌표
  talksLeft: number;              // 이번 자유 이동에서 남은 대화 횟수
  metThisRoam: string[];          // 이번에 이미 만난 NPC

  flags: Set<string>;

  cursor: { sceneId: string; lineIndex: number };
};
```

- **호감도는 UI에 노출하지 않습니다.** 챕터 종료 시 구간별 한 줄 반응과 `{P:호칭}` 치환으로만 간접 표시 (기획서 2-1·2-4)
- **`route`가 히로인 성별을 결정합니다.** 선택 가능한 루트는 `playerGender`의 반대쪽 3개뿐이라 별도 필드가 없습니다
- **`seenCG` · `clearedRoutes` · `maxDay`는 `GameState`에 없습니다.** 회차를 넘어 누적되는 값이라 세이브가 아니라 `users/{uid}/profile`에 둡니다 ([4-2](#4-2-세이브--firestore))
- **맵 좌표를 저장**하므로 자유 이동 도중에도 세이브·복원이 됩니다. 이벤트 씬 재생 중이면 `cursor`로, 맵 위면 `map`+`pos`로 복원합니다

### 4-1. 인증 — Google 로그인 필수

**타이틀 앞에 로그인 화면이 있고, 로그인해야 게임이 시작됩니다.** 게스트 플레이는 없습니다.

```ts
type Session = {
  uid: string;           // Firebase Auth UID
  displayName: string;   // 방명록에 표시되는 이름
};
```

- 제공자는 **Google 하나**입니다. 이메일/비밀번호를 두지 않으므로 비밀번호 재설정·이메일 인증 흐름이 전부 사라집니다
- `signInWithPopup`을 씁니다. 리다이렉트 방식은 GitHub Pages 서브패스(`/jungle_week2_project3/`)에서 복귀 경로가 꼬입니다
- 로그아웃하면 타이틀로 돌아가고, 진행 중이던 상태는 이미 Firestore에 있으므로 잃지 않습니다
- **`displayName`은 방명록에 그대로 노출됩니다.** 작성 화면에서 그 사실을 먼저 보여줍니다

> **비용을 문서에 남겨둡니다.** 로그인을 강제하면 포트폴리오 방문자 일부가 첫 화면에서 이탈합니다. 그 대신 **세이브 경로가 하나로 유지되고**(localStorage 병합 로직 불필요), **방명록 글에 실제 계정이 붙습니다.**

### 4-2. 세이브 — Firestore

**세이브는 계정에 붙습니다.** 브라우저가 아니라 Firestore가 정본입니다.

```
users/{uid}
  ├─ profile          { displayName, firstSeenAt, clearedRoutes: RouteId[], seenCG: string[], maxDay: number }
  └─ saves/{slot}     { state: GameState, savedAt, chapterDay, route }  // slot: "1"|"2"|"3"|"auto"
```

- **수동 3슬롯 + 오토세이브 1슬롯**
- **`chapterDay`와 `route`는 `state` 안에도 있지만 밖에 한 번 더** 둡니다. 슬롯 목록(`D5까지 · 장윤정 루트`)을 그리려고 세이브 본문 전체를 읽지 않기 위해서입니다
- **`savedAt`은 `state`에 없는 값**입니다. 저장 시점에 `serverTimestamp()`로 찍습니다 — 클라이언트 시계를 믿지 않습니다
- `seenCG` · `clearedRoutes` · `maxDay`는 세이브가 아니라 **`profile`에 둡니다.** 회차를 넘어 누적되어야 갤러리 수집률이 유지되고, 타이틀에서 방명록을 열 때 범위 기준이 됩니다
- **기기 간 이어하기가 공짜로 따라옵니다.** 계정에 붙어 있으므로 다른 브라우저에서 로그인하면 그대로 이어집니다
- `localStorage`는 **쓰기 실패 시의 임시 큐**로만 씁니다. 오프라인이거나 요청이 실패하면 로컬에 쌓아두고 다음 성공 시 밀어 넣습니다. **정본은 언제나 Firestore입니다**

**보안 규칙은 [4-3](#4-3-방명록--구현)에 방명록 규칙과 함께 한 벌로 둡니다.** 세이브 쪽 요점은 **남의 문서는 읽지도 쓰지도 못한다**는 것뿐입니다.

### 4-3. 방명록 — 구현

**정책(누가 읽고 쓰는가 · 표시 항목 · 날짜 해금)은 [GAME_DESIGN 2-5](./GAME_DESIGN.md#2-5-계정과-방명록)에 있습니다.** 여기서는 구현만 다룹니다.

```
guestbook/{uid}          // 문서 ID = 작성자 uid → 1인 1글이 구조로 강제됨
  { uid, displayName,
    route: RouteId | null,   // null = 루트 미확정 → "6조 신입"
    inGameDay: number,       // 1 · 5 · 8 · 12 — 쓸 수 있는 시점이 넷뿐
    body: string,            // 140자
    createdAt, updatedAt }   // 현실 날짜는 updatedAt에서 뽑음
```

- `tier`는 두지 않습니다. 게임 중에 쓰는 글이라 엔딩이 아직 없습니다
- `photoURL`도 두지 않습니다. 손글씨 낙서에 프로필 사진은 안 어울립니다
- **글을 고치면 `inGameDay`도 그 시점 값으로 덮입니다.** 날짜는 "처음 쓴 때"가 아니라 "마지막으로 쓴 때"이고, 그래서 `updatedAt`이 현실 날짜의 정본입니다

#### 날짜 해금은 클라이언트 쿼리입니다

```ts
query(collection(db, 'guestbook'),
      where('inGameDay', '<=', state.chapterDay),   // 내 진행 일자
      orderBy('inGameDay', 'desc'),
      orderBy('updatedAt', 'desc'),
      limit(20))
```

- `GameState`에 **`chapterDay: number`(1~12)**를 둡니다. 챕터가 아니라 **일자**여야 `inGameDay` 비교가 성립합니다
- 타이틀에서 열 때는 **그 계정의 최고 도달 일자**를 씁니다 (`profile.maxDay`). 클리어했으면 12라 전부 보입니다
- 복합 인덱스 하나가 필요합니다 — `inGameDay desc, updatedAt desc`

> **해금은 서버에서 막지 않습니다.** 규칙으로 강제하려면 "저 사람이 지금 며칠째인가"를 서버가 알아야 하는데, 그 값 자체를 클라이언트가 보냅니다. **우회해도 남의 방명록을 조금 일찍 보는 것뿐이라 무해**하므로 클라이언트 필터로 둡니다.

#### 보안 규칙

**서버 코드가 없으므로 검증은 전부 여기서 합니다.** 규칙에 안 적은 건 그냥 통과한다고 봐야 합니다.

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth.uid == uid;
}

match /guestbook/{uid} {
  allow read: if request.auth != null;

  allow create, update: if request.auth.uid == uid
    // 필드 화이트리스트 — 아무거나 못 넣음
    && request.resource.data.keys().hasOnly(
         ['uid','displayName','route','inGameDay','body','createdAt','updatedAt'])
    // 신원 위조 차단 — 토큰의 값과 일치해야 함
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.displayName == request.auth.token.name
    // 값 범위
    && request.resource.data.body is string
    && request.resource.data.body.size() <= 140
    && request.resource.data.inGameDay in [1, 5, 8, 12]
    && (request.resource.data.route == null ||
        request.resource.data.route in
          ['minah','seunghee','yunjung','mingyu','seungmin','yunho'])
    // 시각은 클라이언트가 못 정함
    && request.resource.data.updatedAt == request.time;

  allow delete: if request.auth.uid == uid;
}
```

| 막는 것 | 규칙 |
|---|---|
| 남의 글 쓰기 | `request.auth.uid == uid` |
| **남의 이름 사칭** | `displayName == request.auth.token.name` |
| **날짜 조작으로 목록 상단 점유** | `updatedAt == request.time` |
| 존재하지 않는 루트·날짜 | `in [...]` |
| 임의 필드 추가 | `keys().hasOnly([...])` |

**`request.auth.token`과 `request.time`은 클라이언트가 못 건드립니다.** 토큰은 Firebase가 서명했고 시각은 서버가 찍습니다 — 전통적 백엔드에서 `req.user`와 `NOW()`를 쓰는 것과 같은 자리입니다.

> **그래도 못 막는 게 하나 남습니다.** `inGameDay`와 `route`는 **값 자체가 정당한지**를 서버가 알 수 없습니다. 실제로 D5에 도달하지 않고도 `inGameDay: 5`를 보낼 수 있습니다. 판정하려면 그 계정의 세이브를 읽어 대조해야 하고, 그건 규칙에서 `get()`을 한 번 더 쓰거나 Cloud Functions가 필요합니다.
>
> **포트폴리오 규모에서는 감수합니다** — 우회해도 남는 건 "남보다 조금 일찍 쓴 글 하나"뿐입니다.

#### 서버가 있어야 가능한 것

방명록에는 해당이 없지만, 경계를 적어둡니다.

| 필요한 기능 | 규칙으로 되나 |
|---|---|
| 인증 · 소유권 · 값 검증 | **됨** |
| 남의 문서를 읽어 판단 | 됨 (`get()`) — 다만 읽기 비용이 붙음 |
| 금칙어 필터 · 스팸 차단 | **안 됨** — Cloud Functions |
| 집계(전체 글 수 등) · 랭킹 | **안 됨** — 별도 카운터 문서나 Functions |
| 이메일 · 푸시 알림 | **안 됨** |

#### 화이트보드에 다가갔을 때

**클리어 여부로 갈리지 않습니다.** 다만 화이트보드는 도트 맵 위에 있으므로 **자유 이동 구간에서만 다가갈 수 있습니다** ([GAME_DESIGN 1-2](./GAME_DESIGN.md#1-2-캠퍼스-안--도트-이동--캠퍼스-밖--이벤트-씬)).

| 시점 | 열리는 것 |
|---|---|
| **자유 이동 (D1 · D5 · D8)** | 인게임 낙서 + 방명록 — **읽기·쓰기 모두** |
| **D12 수료식 직후** | 낙서가 지워지는 컷 → 방명록 전체 + **작성 안내** |
| **타이틀** | 방명록만. 범위는 `profile.maxDay` 기준 |

- 인게임 낙서는 **현재 챕터까지의 스크립트 데이터**, 방명록은 **`inGameDay <= 내 진행 일자`인 글**입니다
- D12에서는 `inGameDay <= 12`라 **전부 열립니다**
- **인게임 낙서는 Firestore를 타지 않습니다.** `.vns`에 챕터별로 박힌 고정 데이터라, 두 데이터가 만나는 곳은 화면뿐입니다

- 글은 화이트보드 위에 **손글씨 느낌으로 배치**합니다. 목록이 아니라 낙서로 보여야 모티프가 삽니다 ([WORLD_BIBLE 11](./WORLD_BIBLE.md#11-ui-톤))
- 신고 기능은 두지 않습니다. 부적절한 글은 Firebase 콘솔에서 직접 지웁니다

---

## 5. 캠퍼스 맵 (7개)

맵 목록과 연결은 [GAME_DESIGN 6-3](./GAME_DESIGN.md#6-3-맵과-배경).

### 5-1. 타일맵

- Tiled로 48×48 타일맵 7개 제작
- 레이어: 타일 `ground` / `objects` / `collision` · 오브젝트 `npc` / `portal` / `trigger`
- 타일셋 3종 — **교육동 실내 / 숙소동 실내 / 야외**
- 주인공: 4방향 × 4프레임(정지 1 + 걷기 3), 방향키/WASD

### 5-2. 맵 전환

`portal` 오브젝트에 목적지 맵과 좌표를 넣습니다. 계단·문에 닿으면 페이드 후 전환합니다.

```json
{ "name": "stairs_to_2f", "type": "portal",
  "x": 1296, "y": 192, "width": 48, "height": 48,
  "properties": [
    { "name": "to",     "type": "string", "value": "m2_basecamp_2f" },
    { "name": "spawnX", "type": "int",    "value": 1320 },
    { "name": "spawnY", "type": "int",    "value": 1320 }
  ] }
```

**Tiled 형식 그대로**라 커스텀 파서가 필요 없습니다. 포탈 48개가 전부 양방향으로 물려 있습니다.

**Phaser Scene은 하나**(`CampusScene`)이고 맵 데이터만 교체합니다. 씬을 7개 만들면 상태 공유가 번거로워집니다.

### 5-3. 챕터별 상태

같은 맵이 챕터마다 다르게 보여야 합니다.

| 바뀌는 것 | 근거 |
|---|---|
| **조명** | 낮 / 저녁 / 밤 / 심야 / 여명 — 타일맵 위에 **컬러 오버레이 5종 공통** ([WORLD_BIBLE 8-1](./WORLD_BIBLE.md#8-1-시간대별-팔레트)). 맵별 에셋이 아니라 어느 맵에나 얹힙니다 |
| **NPC 배치** | 챕터별로 누가 어디 있는지가 다름 |
| **통행 가능 맵** | 챕터에 따라 잠긴 맵이 있음 (예: D1 입소 동선에서는 아직 지나가지 않은 맵이 잠겨 있음) |
| **화이트보드 낙서** | 챕터 진행에 따라 늘어남 ([WORLD_BIBLE 7-2](./WORLD_BIBLE.md#7-2-공통--교육장-403-화이트보드)) |

`maps.ts`가 `{chapter, mapId}` → `{조명, NPC 목록, 개방 여부}`를 반환합니다.

### 5-4. 이벤트 발동

두 가지입니다.

- **대화형** — NPC 근접 시 머리 위 `!` → 상호작용 키(Space/E) → `scene:interact` emit
- **진입형** — `trigger`로 지정된 맵에 들어가면 즉시 발동. 챕터 마무리 씬(커넥트가든 등)에 씀

남은 대화 횟수를 소진하면 다음 이벤트 지점만 활성화되어 **길이 하나로 좁혀집니다.**

---

## 6. 배포

```bash
npm run build
```

- `vite.config.ts`에 `base: '/jungle_week2_project3/'` 설정 (GitHub Pages 서브패스)
- GitHub Actions로 `main` 푸시 시 `gh-pages` 자동 배포
- **Firebase 프로젝트는 별도로 하나 만듭니다.** 호스팅은 안 쓰고 **Auth와 Firestore만** 켭니다
- Auth 승인 도메인에 `<계정>.github.io`를 등록해야 팝업 로그인이 동작합니다
- Firestore 보안 규칙은 `firestore.rules`를 저장소에 두고 CI에서 함께 배포합니다 ([4-3](#4-3-방명록--구현))
- itch.io 미러는 **보류**입니다. 도메인이 하나 더 늘면 Auth 승인 도메인과 CORS를 이중으로 관리해야 합니다

> **Firebase 설정값(apiKey 등)은 공개돼도 됩니다.** 클라이언트에 노출되는 게 정상이고, 실제 방어선은 **보안 규칙과 Auth 승인 도메인**입니다. 다만 저장소에 그대로 커밋하지 말고 `.env`로 빼서 CI에서 주입하는 편이 나중에 프로젝트를 갈아탈 때 편합니다.

에셋 용량이 관건입니다. CG(사용자 제공) + 일러스트 배경 9장 + 타일셋 3종 + 타일맵 7개를 원본 PNG로 올리면 수십 MB가 되니, **WebP 변환 + 프리로드 분할**(챕터 진입 시 해당 루트 에셋만 로드)을 처음부터 넣는 게 좋습니다. 나중에 끼워 넣기 어려운 부분입니다.

---

## 7. 구현 순서

[기획서 8절](./GAME_DESIGN.md#8-제작-순서)의 마일스톤을 기술 착수 순서로 편 것입니다. **1~9가 MVP**(장윤정 루트 1개 완주)이고, 10·11은 바로 뒤에 오는 v1.0·v1.1 항목입니다.

1. Vite + TS 스캐폴딩, 배포 파이프라인 먼저 뚫기 (빈 화면이라도 Pages에 올라가는 것 확인)
2. **Firebase 프로젝트 생성 + Google 로그인 1개** — 로그인하면 이름이 뜨는 화면까지. **여기서 승인 도메인 문제를 미리 밟아둡니다**
3. `.vns` 파서 + 컴파일러 — 테스트 씬 1개로 검증
4. VN 재생기: 대사 표시, 타자 효과, 클릭 진행, 선택지
5. GameState + **Firestore 세이브/로드** (보안 규칙 포함)
6. 배경·CG 표시 — 반신 CG는 표정마다 한 장이라 **파일을 교체**하고 **크로스페이드 120~150ms**를 겁니다 (합성이 아닙니다)
7. 장윤정 루트 프롤로그~과정 1 스크립트 작성 → **여기서 처음으로 "게임"이 됨**
8. Phaser 맵 2개(M1 교육장 403 · M5 커넥트가든) + NPC 상호작용 → 이후 나머지 5개 확장
9. 과정 2~결말 스크립트, 엔딩 3종 판정
10. **방명록** — 화이트보드 상호작용 + `inGameDay` 날짜 해금. 복합 인덱스 하나 필요
11. 타이틀·설정·백로그·갤러리

**2번을 앞으로 당긴 게 핵심입니다.** 로그인·배포·도메인은 나중에 붙이면 반드시 막히는 구간이라, 게임을 만들기 전에 빈 화면으로 먼저 뚫어둡니다. 4번까지 끝나면 이후는 콘텐츠 채우기라 진행 속도가 급격히 빨라집니다.
