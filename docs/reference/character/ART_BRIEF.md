# jungLover — 캐릭터 이미지 제작 브리프

> **이 문서만 보고 작업할 수 있게 쓴 것입니다.** 다른 기획 문서를 안 읽어도 됩니다.
>
> **1~7절은 사람이 보는 사양서, 8~16절은 이미지 생성 도구용 프롬프트**입니다. 도구를 쓰신다면 [8절](#8-생성-도구로-만들-때--먼저-읽을-것)부터 보세요.
>
> **정본이 아니라 파생 문서입니다.** 값이 바뀌면 [CHARACTERS](../../CHARACTERS.md) · [GAME_DESIGN 6](../../GAME_DESIGN.md#6-에셋-목록) · [WORLD_BIBLE](../../WORLD_BIBLE.md) · [SCENARIO_OUTLINE](../../SCENARIO_OUTLINE.md)을 고치고 **여기를 다시 뽑습니다.**

**총 제작량 — CG 60장 + 도트 216컷** (도트는 절감 시 176컷)

| # | 항목 | 수량 |
|---|---|---|
| ① | 히로인 몸통 | 12장 |
| ② | 히로인 표정 파츠 | 30장 |
| ③ | 히로인 스틸 CG | 18장 |
| ④ | 도트 스프라이트 | 18종 · 216컷 |

**안 그려도 되는 것** — 주인공 CG(1인칭이라 얼굴이 화면에 안 나옴), 조연 CG(전원 도트만).

> **③ 스틸 CG를 뺀 나머지는 이 문서와 [프로필 2장](./heroine_girl_profile.png)만으로 전부 그릴 수 있습니다.** 스틸만 배경 레퍼런스가 따로 필요합니다(4절).
>
> **이 문서에 없는 것** — 타일셋 3종 · 도트 타일맵 7개 · 일러스트 배경 8장 · 로그인 화면. 캐릭터가 아니라서 여기 없고, 사양은 [GAME_DESIGN 6-3](../../GAME_DESIGN.md#6-3-맵과-배경)에 있습니다.

---

## 0. 전체 공통

**세계관** — 대학생 대상 여름방학 **11박 12일 합숙 코딩 캠프**. 24명 1개 반, 4인 1조 × 6조. 주인공은 6조이고 히로인 셋이 같은 조입니다. 실제 캠퍼스(2개 건물 + 야외)에서 벌어지고, 주변에 아무것도 없어 밤이 진짜 어둡습니다.

### 명찰

여섯 다 **검은 랜야드에 `J` 로고 카드**를 목에 겁니다. 입소 때 받아 열이틀 내내 착용합니다.

| | 명찰 |
|---|---|
| **평상복 몸통** | **착용** |
| **D7 외출복 몸통** | **미착용** — 캠퍼스를 벗어나므로 |
| **도트 스프라이트** | **전 컷 착용** |

벗는 건 D7 외출과 D12 수료식 두 번뿐이라, **없어질 때만 눈에 띄는 물건**입니다.

### 시간대 색조

| 시간 | 팔레트 |
|---|---|
| 낮 | 따뜻한 노랑 · 베이지 · 낮은 채도. 형광등과 창밖 햇빛이 섞여 살짝 바랜 느낌 |
| 저녁 | 주황 → 남색 그라데이션 |
| 밤 (23~01) | 청록 · 네이비 · 모니터 발광. 얼굴이 아래에서 위로 조명됨 |
| **심야 (02~03)** | **먹빛 남색 · 점광원만.** 감정 정점 구간. 얼굴이 거의 안 보이는 어둠이 기본값 |
| **여명 (04:30~)** | **보라 → 파랑 그라데이션.** 게임 전체에서 딱 한 번 |

### 복장의 근거

**교육장 냉방이 세서 여섯 다 겉옷을 하나씩 걸치고 있습니다.** 밖은 한여름인데 안은 서늘하다는 대비이고, 그게 확정 프로필의 옷차림입니다.

**하의와 신발은 여섯이 다 다릅니다.** 확정 프로필이 가슴 위 카드라 아래가 안 보이는데, **획일적인 반바지·슬리퍼로 통일하지 않습니다** — 성격이 발끝에서 한 번 더 드러나는 자리입니다.

| | 하의 | 신발 | 왜 |
|---|---|---|---|
| **김민아** | 검은 트랙팬츠 | 검은 러닝화 — **뒤축을 꺾어 신음** | 꾸밀 여유가 없는 게 아니라 **꾸밀 생각 자체를 안 함**(허당) |
| **이승희** | **아이보리 롱스커트** (발목까지) | 흰 캔버스화, 끈을 단정히 | **가릴 수 있는 데까지 가림** — 소매로 손을 감싸는 것과 같은 동작 |
| **장윤정** | 검은 숏팬츠 (**후드에 거의 가려 안 보임**) | 흰 하이탑 스니커즈 + **노란 끈**, 발목 양말 | 후드 하나만 걸친 것처럼 보이는 실루엣 |
| **김민규** | 검은 와이드 팬츠 (**밑단이 바닥에 끌림**) | 검은 하이탑 스니커즈, **끈이 풀린 채** | 자기 몸에 쓰는 품이 최소한(퇴폐) |
| **이승민** | **연청 스트레이트 데님** | 흰 하이탑 농구화, 관리 상태 좋음 | 여섯 중 제일 갖춰 입음 — 남 앞에 서는 게 습관(과대표) |
| **장윤호** | 베이지 치노팬츠 (밑단을 한 번 접음) | 흰 캔버스 스니커즈, **끈이 늘 단정** | 단정함이 성실이 아니라 **습관** |

> **신발 끈 세 개가 셋을 갈라놓습니다** — 민규는 풀려 있고, 윤호는 늘 묶여 있고, 민아는 아예 뒤축을 꺾습니다. 48px 도트에서도 밑단 실루엣과 신발 색은 남습니다.

### 파일 규격

**CG — 몸통 · 표정 파츠**

| | |
|---|---|
| 캔버스 | **1000 × 2000px 세로 · 투명 배경 PNG** |
| 크롭 | **전신(발끝까지).** 게임 화면에서는 하단이 대사창에 가리지만 스틸과 확대에 쓰이므로 전신으로 그립니다 |
| 인물 배치 | 캔버스 가로 중앙, 세로로 꽉 차게 |
| **표정 파츠** | **몸통과 같은 1000 × 2000 캔버스**에 얼굴 부분만 그리고 나머지는 투명. 그대로 겹치면 맞으므로 좌표 계산이 필요 없습니다 |
| 필수 | 같은 인물의 **평상복·외출복·표정 5장이 전부 같은 얼굴 위치** |

**스틸 CG** — 1920 × 1080 가로, 불투명. 배경까지 한 장에 그립니다

**도트 스프라이트**

| | |
|---|---|
| 컷 | **48 × 48px** |
| 시트 | 3열 × 4행 = **144 × 192px 한 장** (RPG Maker MZ 캐릭터칩 규격) |
| 행 순서 | **아래 → 왼쪽 → 오른쪽 → 위** |
| 열 순서 | 걷기 3프레임, **가운데가 정지 포즈** |
| 등신 | **2.5~3등신** (머리를 크게) |
| 외곽선 | 어두운 색 1px |
| 색 수 | 캐릭터당 **8~12색** |
| 명찰 | 가슴에 밝은 **2×3px 사각형** + 목에서 내려오는 1px 검은 줄 |
| 배경 | 투명 |

**파일명**

```
cg_{id}_body_casual.png          cg_{id}_body_outing.png
cg_{id}_face_{normal|smile|shy|sad|surprise}.png
cg_{id}_still_{garden|climax|ending}.png
sprite_{id}.png
```

히로인 `id` — `minah` `seunghee` `yunjung` `mingyu` `seungmin` `yunho`
도트 전용 `id` — `doyun` `doa` `jio` `jia` `myeongjinhyeok` `jomin` `taeyun` `taeyeon` `yeosanim` `mob_a` `mob_b` `mob_c`

---

## 1. 히로인 6인

레퍼런스: [`heroine_girl_profile.png`](./heroine_girl_profile.png) · [`heroine_boy_profile.png`](./heroine_boy_profile.png)

| | 나이 / 학년 / 전공 | 동물상 | 테마 컬러 | 평상복 · 외형 | 모티프 |
|---|---|---|---|---|---|
| **김민아** 여 | 22 / 3 / 컴퓨터공학 | 고양이 | `#3A9B96` 청록 | **검은 후드집업** · 검은 긴 머리를 높게 묶음 · 올라간 눈꼬리 · 팔짱 | 아이스 아메리카노 |
| **이승희** 여 | 23 / 4 / 그래픽디자인 | 사슴 | `#B5806F` 적갈 | **베이지 니트**(소매로 손을 감쌈) · 갈색 긴 웨이브 · 크고 둥근 눈 · 가는 목선 | 스케치북 |
| **장윤정** 여 | 21 / 2 / 그래픽디자인 | 강아지 | `#E0A230` 금빛 | **노란 오버사이즈 후드**(여섯 중 제일 헐렁) · 갈색 머리를 높게 묶음 | 헤드폰 |
| **김민규** 남 | 22 / 3 / 게임소프트웨어 | 늑대 | `#4E6288` 회청 | **검은 후드** · 긴 앞머리 · 날카로운 눈매 · 마른 체형 | 아이스 아메리카노 |
| **이승민** 남 | 24 / 4 / 컴퓨터공학 | 공룡 | `#5F8F42` 초록 | **초록 바시티 재킷** · 큰 키 · 짧은 머리 · 넓은 어깨 | 에코백 속 간식 |
| **장윤호** 남 | 20 / 1 / 컴퓨터공학 | 강아지 | `#C9A170` 크림 | **크림 가디건** + 강아지 뱃지 · 둥근 눈 · 부드러운 선 · 순한 인상 | 헤드폰 |

- **테마 컬러는 UI 강조색**입니다. 머리색·눈색과 무관합니다 — 민아는 청록인데 검은 머리, 윤정은 금빛인데 갈색 머리
- **여자 3인과 남자 3인은 한 회차에 같이 나오지 않습니다.** 주인공 성별에 따라 조가 통째로 바뀝니다
- **윤정과 윤호만 같은 동물상**입니다. 닮은 건 인상까지고 안쪽은 반대라, 윤호 쪽 채도를 낮춰 눌렀습니다
- **하의·신발은 0절 표**를 보세요. 프로필에 안 나오는 부분이라 따로 정해뒀습니다

---

## 2. 몸통 — 12장 (6인 × 2종)

**평상복 6장**은 1절 표 그대로(겉옷 + 하의·신발), **명찰 착용**입니다.

### D7 외출복 6장 — 명찰 없음

**열이틀 중 유일한 휴일이자 유일하게 캠퍼스를 벗어나는 날**입니다. 엿새 내내 같은 차림으로 마주치던 사람이 처음 옷을 갖춰 입고 나타납니다. **평상복보다 확실히 꾸민 티가 나야 합니다.**

여섯 다 **"하루만 달라지는 지점"을 하나씩** 갖습니다. 꾸민 티가 옷이 아니라 **사람에서** 나게 하는 장치입니다.

| | 외출복 | **달라지는 한 가지** |
|---|---|---|
| **김민아** | 검은 슬립 원피스에 얇은 흰 셔츠를 걸침 · 검은 스트랩 샌들 | **묶고 있던 머리를 처음 풀어 내림.** 본인은 그 얘기를 한마디도 안 함 |
| **이승희** | 연하늘 셔츠 원피스 + 얇은 벨트 · 작은 크로스백 · 굽 낮은 흰 샌들 | **소매를 걷음.** 손을 감추던 사람이 처음 손목을 드러냄 |
| **장윤정** | 크림 민소매 탑 + 데님 스커트 · 헤어핀 · 팔찌 여러 개 | **오버사이즈를 벗음.** 후드에 파묻혀 있던 실루엣이 처음 드러남. 헤드폰은 목에 그대로 |
| **김민규** | 검은 오버셔츠 + 흰 티 + 슬랙스 · 은반지 · **끈을 묶은** 검은 부츠 | **앞머리를 넘겨 눈이 보임.** 반쯤 가려져 있던 얼굴이 하루만 드러남 |
| **이승민** | 린넨 셔츠(단추 하나 풀고) + 베이지 치노 · 시계 · 캡 | **처음으로 바시티 재킷을 안 입음.** 과대표의 유니폼을 벗은 날이라 어깨가 편해 보임 |
| **장윤호** | 네이비 스트라이프 셔츠 + 흰 반바지 · 캔버스 토트백(강아지 뱃지를 옮겨 닮) | **전날 밤에 고른 티가 남.** 너무 신경 쓴 게 보여서 오히려 귀여움 |

> **민규와 민아가 정반대로 움직입니다** — 민규는 가리던 얼굴을 드러내고, 민아는 묶고 있던 걸 풉니다. 둘 다 "평소에 잠가둔 걸 하루만 여는" 동작인데 한쪽은 얼굴이고 한쪽은 머리입니다.

> **필수 조건: 평상복과 외출복의 얼굴 위치·크기가 픽셀 단위로 같아야 합니다.** 표정 파츠 5장을 두 몸통에 공용으로 얹기 때문입니다. 어긋나면 표정을 12세트 그려야 합니다.

---

## 3. 표정 파츠 — 30장 (6인 × 5종)

`평상` · `미소` · `부끄러움` · `슬픔` · `놀람`

**`화남`은 그리지 않습니다.** 히로인이 화내는 씬은 김민아 초반뿐이고 `평상` + 대사로 충분합니다.

| | 표정 설계 |
|---|---|
| **김민아** | 표정이 거의 없는 대신 **눈이 다 말합니다.** 흔들리는 게 눈에 다 보이는데 아니라고 우기는 얼굴 |
| **이승희** | 말 걸면 **놀라는 인상.** 그 굳음이 도도함으로 오해받습니다. 진폭이 가장 작습니다 |
| **장윤정** | 밝음이 기본. **헤드폰을 쓰면 눈이 안 웃는 게 반전**이라 `평상`에 두 결이 있으면 좋습니다 |
| **김민규** | **시선을 안 주는 게 기본 표정.** 눈꼬리 처짐 없음, 무표정 |
| **이승민** | **웃을 때 잇몸이 보이는 게 이 캐릭터의 전부.** 크고 시원하게 웃습니다 |
| **장윤호** | 순함. **윤정보다 진폭을 좁게** — 같은 강아지상인데 덜 움직입니다 |

**레이어 분리 필수** — 몸통과 표정이 분리돼야 2 × 5 = 10 조합이 나옵니다. 통짜로 렌더링하면 물량이 6배가 됩니다.

---

## 4. 스틸 CG — 18장 (6인 × 3)

> ### 사진은 그대로 쓰지 않습니다
>
> **받은 캠퍼스 사진은 전부 한낮입니다.** 그런데 스틸이 쓰이는 시각은 **심야 02시 · 여명**입니다. 사진에서 가져오는 건 **구조뿐**입니다 — 창문 위치, 가구 배열, 기둥과 데크 라인, 공간의 깊이. **조명·색조·분위기는 전부 새로 깝니다.**
>
> | 사진에서 가져오는 것 | 새로 만드는 것 |
> |---|---|
> | 창문·문·기둥 위치, 책상 배열, 데크 라인, 나무 실루엣 | **광원, 색조, 그림자, 시간대** |
>
> 커넥트가든은 **데크 라인·기둥·나무 실루엣처럼 구조가 뚜렷해서 어둡게 깔아도 형태가 살아남습니다.** 교육장 403은 **화이트보드가 앞, 맞은편이 통창**이라는 배치만 지키면 됩니다.
>
> **심야의 기본값은 "얼굴이 거의 안 보이는 어둠"**입니다. 주변에 도시 불빛이 없어서, 광원은 **발밑 조명 · 건물 창 · 모니터 · 자판기**뿐입니다. 낮 사진의 밝기를 그대로 두면 이 게임의 정서가 통째로 사라집니다.

### ① D7 새벽 커넥트가든 → 여명

**배경 레퍼런스:** [`connect_garden.jpg`](../campus/connect_garden.jpg) — 카페 앞 우드데크. 야외 테이블과 의자, 뒤로 필로티 아래가 뚫려 보임
**색조:** 심야(먹빛 남색) → **여명(보라→파랑)**

**루트 최대 명장면**이고 **게임에서 유일하게 해가 뜨는 씬**입니다. 저녁에 소나기가 그친 뒤 새벽 2시에 앉아, 하늘이 밝아질 때까지 있습니다. 낮에는 아무도 눈여겨보지 않고 통과하는 공간이 새벽 두 시에 완전히 다른 장소가 됩니다.

> **빈 의자가 처음으로 채워지는 그림**입니다. 발밑 조명과 건물 창 불빛 외에는 광원을 두지 않습니다.

| | 이 컷의 순간 |
|---|---|
| **김민아** | 멀쩡한 걸 다 갈아엎다 터짐. 이틀을 안 먹었다는 게 드러남. **편의점 삼각김밥을 받아들고 말없이 오래 먹는다** |
| **김민규** | 결과물은 완벽하게 냈는데 표정이 없음. **"…끝나면 나는 뭐가 되지."** |
| **이승희** | 스케치북을 **뺏기듯 보여준다.** 조원들 뒷모습만 그려져 있음 |
| **이승민** | 혼자 울던 걸 들킨 직후. 번아웃 전조. **"나 왜 남 것만 하고 있지."** |
| **장윤정** | 마감 끝나고도 애교를 부리다 갑자기 뚝 그침. **헤드폰 한쪽을 내민다** |
| **장윤호** | 조원들 다 챙겨 보내고 마지막에 혼자 남음. **"저는… 잘 모르겠어요, 뭐가 하고 싶은지."** |

> 승희와 승민은 4F 라운지에서 시작해 가든으로 내려오는 씬입니다. 보조 참고: [`community_lounge_1.jpg`](../campus/community_lounge_1.jpg)

### ② D9 클라이맥스 — 교육장 403 심야

**배경 레퍼런스:** [`classroom_1.jpg`](../campus/classroom_1.jpg) · [`classroom_2.jpg`](../campus/classroom_2.jpg)
**색조:** 심야(먹빛 남색 · 점광원만). 새벽 2시엔 키보드 소리만 남습니다

**히로인의 서브플롯이 해결되는 지점**입니다. 각자 자기 방식으로 무너지고 주인공이 그걸 목격합니다.

| | 이 컷의 순간 |
|---|---|
| **김민아** | 쓰러질 지경인데 인정 안 함. **"내가 알아서 해"** |
| **김민규** | 결과물은 완벽한데 본인이 비어 있음. 아무도 눈치 못 챔 |
| **이승희** | 조가 자기를 빼놓고 결정함. 그때도 말을 못 함 |
| **이승민** | 쓰러짐. 쾌활함이 연기였다고 인정 |
| **장윤정** | 자기 안을 밀어붙였다가 **"2학년이 뭘 아냐"**는 말을 들음 |
| **장윤호** | 하고 싶은 걸 물었는데 대답을 못 함 |

### ③ 엔딩 — 5년 후

**배경 레퍼런스 없음** — 캠퍼스가 아닙니다. 주인공은 27세, 2~3년차 개발자입니다.

"커리어의 완성"이 아니라 **학생이던 우리가 사회인이 된 첫 구간**의 온도로 갑니다.

| | 5년 후 | 배경 |
|---|---|---|
| **김민아** 27 | 같은 회사 다른 팀. 여전히 코드 리뷰로 싸우고 퇴근은 같이 함 | 오피스 |
| **김민규** 27 | 이제 제때 자고 제때 먹음 | 오피스 |
| **이승민** 29 | 늦게 시작한 사람의 첫 출근날 아침 | 오피스 |
| **장윤호** 25 | **자기가 만든 걸 자기 이름으로 냄** | 오피스 |
| **이승희** 28 | 먼저 연락하는 사람이 됨 | 전시장 |
| **장윤정** 26 | 졸업작품이 둘이 만든 게임이 되고 그게 출시됨 | 전시장 |

---

## 5. 도트 스프라이트 — 18종 · 216컷

**스펙:** 48 × 48px, **4방향 × 3프레임 = 12컷 / 종** (RPG Maker MZ 캐릭터칩 규격)

| 대상 | 종 | 컷 |
|---|---|---|
| 주인공 (남 · 여) | 2 | 24 |
| 히로인 6인 | 6 | 72 |
| 절친 한지오 · 한지아 | 2 | 24 |
| 조연 명진혁 · 조민 · 강태윤 · 강태연 · 여사님 | 5 | 60 |
| 무명 동기용 공용 스프라이트 | 3 | 36 |
| **합계** | **18** | **216** |

- **복장은 종당 1벌**입니다. D7 사복은 CG로만 나오고 도트로는 등장하지 않습니다
- **명찰은 전 컷 착용.** 48px에서는 점 몇 개지만 계속 보입니다
- **절감:** 조연 5종을 3프레임 대신 **1프레임(정지) × 4방향 = 4컷**으로 낮추면 → **176컷**

### 히로인 6인

위 프로필을 그대로 도트화합니다. **가장 먼저 히로인 하나의 정면 1장을 확정**하세요 — 그게 나머지 17종과 타일셋 전체의 화풍 기준이 됩니다.

### 참조 이미지가 없는 12종

| 인물 | 설정 | 인상 |
|---|---|---|
| **이도윤** 남 22 | 컴퓨터공학 3학년. 주인공 | 1인칭이라 얼굴이 화면에 안 나옴. 무난하게 |
| **이도아** 여 22 | 컴퓨터공학 3학년. 주인공 여자판 | 〃 |
| **한지오** 남 22 | 컴퓨터공학 3학년. 절친 겸 룸메이트 | 말이 빠르고 많음. 밝고 가벼운 인상. 정보통 |
| **한지아** 여 22 | 한지오의 여자판. 성별만 다르고 말투는 동일 | 〃 |
| **명진혁** 남 32 | 담당 코치. 컴공 석사 후 스타트업 3년 | 무표정. **유일한 어른** — 참가자들과 열 살 안팎 차 |
| **조민** 21 (중성적) | 게임소프트웨어 2학년. 경쟁 조 | 과묵하고 표현이 없음. 조용한 실력자 |
| **강태윤** 남 23 | 컴퓨터공학 4학년. 경쟁 조 대표 | 사교적이고 실력도 준수. **악역이 아니라 한 발 빠른 사람** |
| **강태연** 여 23 | 강태윤의 여자판 | 〃 |
| **여사님** 여 50대 | 지하 카페테리아 | 앞치마. 학생들 이름을 다 외우고 있음 |
| **공용 스프라이트** | 무명 동기 17명용 | 3종. **색만 바꿔** 재활용해 스물네 자리를 채웁니다 |

> **절친(한지오/한지아)과 경쟁 조 대표(강태윤/강태연)는 주인공 성별을 따라갑니다.** 한 회차엔 한 쪽만 나오지만 양쪽 다 필요합니다.

---

## 6. 캠퍼스 레퍼런스 사진 17장

출처: <https://jungle.krafton.com/campus> · 1920px JPEG

**전부 한낮에 찍힌 사진입니다.** 배경으로 직접 쓰는 게 아니라 **구조를 옮기는 근거**로만 씁니다(위 4절 참고).

**스틸에 관계되는 건 셋뿐**입니다 — `connect_garden` · `classroom_1` · `classroom_2`. 나머지는 도트 타일맵 제작용 레퍼런스입니다.

| 파일 | 공간 |
|---|---|
| **`connect_garden.jpg`** | **커넥트가든** (카페 앞 데크) — 스틸 ① |
| **`classroom_1.jpg` `classroom_2.jpg`** | **교육장 403** — 스틸 ② · 게임의 허브 |
| `coaching_room.jpg` | 코칭실 403 |
| `community_lounge_1.jpg` `community_lounge_2.jpg` | 커뮤니티 라운지 (4F) |
| `opendesk.jpg` | 오픈데스크 존 (2F) |
| `lobby.jpg` | 로비 (1F) |
| `jungle_stage.jpg` | 정글스테이지 (B1) — 입소 OT · 수료식 |
| `canteen.jpg` `cafe.jpg` | 카페테리아 · 카페 (B1) |
| `dormitory_room.jpg` | 숙소 2인실 |
| `basketball_court.jpg` | 외부 농구코트 |
| `jungle_step.jpg` | 교육동 실내 계단식 라운지 |
| `edu_terrace.jpg` | 교육동 중정 외부 회랑 (3·4F) |
| `cand_campus_view.jpg` `cand_airplane_view.jpg` | 항공샷 — 설정 검증용, 배경 부적합 |

---

## 7. 손으로 그릴 때의 순서

1. **히로인 1인의 도트 정면 1장** — 화풍 확정. **참조 CG가 없는 도트 12종이 전부 여기서 파생**되므로 이게 먼저입니다
2. **같은 인물의 몸통(평상복) 1장 + 표정 5장** — 얼굴 위치 정렬 방식을 여기서 확정
3. 나머지 몸통 11장 → 표정 25장
4. 도트 18종 216컷
5. 스틸 18장 — **①커넥트가든부터.** 가장 중요한 컷입니다

**스틸을 뺀 나머지(몸통 12 · 표정 30 · 도트 216컷)는 이 문서와 프로필 2장만으로 전부 그릴 수 있습니다.**

---

## 8. 생성 도구로 만들 때 — 먼저 읽을 것

**"이 문서대로 만들어줘"는 통하지 않습니다.** 아래 8~16절은 **프롬프트 모음집**이지 하나의 프롬프트가 아닙니다. 안에 든 프롬프트를 **하나씩 꺼내 쓰는** 용도입니다.

| 항목 | 장수 | 프롬프트로 나오는가 |
|---|---|---|
| **몸통** | 12 | ✅ **나옵니다.** 단 12번 나눠 요청 + 매번 참조 이미지 첨부 |
| **표정 파츠** | 30 | ❌ 생성이 아니라 **인페인팅**입니다 ([12절](#12-표정-파츠--인페인팅-절차)) |
| **도트** | 216컷 | ❌ 생성이 아니라 **CG 변환 + 수작업**입니다 ([14절](#14-도트--생성이-아니라-변환입니다)) |
| **스틸 CG** | 18 | ✅ 나옵니다. 생성에 가장 잘 맞는 항목입니다 (13절) |

**스틸을 뺀 258장 중 프롬프트로 나오는 건 12장입니다.** 나머지 246장은 경로가 다릅니다 — 프롬프트를 아무리 잘 써도 안 바뀝니다.

### 도구에 따라 갈립니다

| 도구 | 결과 |
|---|---|
| **이미지 전용** (Midjourney · Stable Diffusion 등) | `.md` 파일을 아예 못 읽습니다. **프롬프트를 직접 복사**해 넣어야 합니다 |
| **에이전트형** (대화형 도구에 이미지 생성이 붙은 것) | 파일은 읽지만 **한 번에 12장을 일관되게 못 뽑습니다.** 인물이 매 장 달라집니다 |

**어느 쪽이든 장당 한 요청 + 참조 이미지 첨부**가 최소 조건입니다.

---

## 9. 프롬프트 쓰는 법

아래 네 가지를 지켜야 합니다.

| | |
|---|---|
| **① 장당 한 요청** | 이 문서에서 그 한 장의 프롬프트만 복사해 씁니다 |
| **② 참조 이미지 필수** | [프로필](./heroine_girl_profile.png)에서 **해당 인물만 잘라** character reference로 넣습니다. 안 넣으면 같은 인물이 매번 달라집니다 |
| **③ 규격은 후처리** | 캔버스 1000×2000 · 투명 배경 · 시트 배열은 **프롬프트로 지정해도 안 지켜집니다.** 생성 후 편집 툴에서 맞춥니다 |
| **④ 표정은 파생** | 5종을 따로 생성하면 얼굴 위치가 어긋납니다. **몸통 확정 후 얼굴만 인페인팅** |

### 생성 적합도

| | 적합도 | 경로 |
|---|---|---|
| **스틸 CG 18장** | ✅ 좋음 | 그대로 생성 |
| **몸통 12장** | ⚠️ 보통 | 참조 이미지 필수. 손·발이 자주 깨지므로 재생성 여유를 두세요 |
| **표정 30장** | ❌ 직접 생성 불가 | 몸통에서 **인페인팅으로 파생** ([12절](#12-표정-파츠--인페인팅-절차)) |
| **도트 216컷** | ❌ 생성 불가 | **CG 축소 → 정리 절차** ([14절](#14-도트--생성이-아니라-변환입니다)) |

---

## 10. 공통 프롬프트 조각

### 스타일 접미사 — 모든 인물 프롬프트 뒤에 붙입니다

```
korean webtoon illustration style, semi-realistic anime, soft cel shading,
clean lineart, warm muted palette, full body standing pose, facing viewer,
neutral relaxed stance, arms visible, plain flat background
```

> **`transparent background`는 대부분의 모델이 못 만듭니다.** `plain flat background`로 뽑고 후처리에서 배경을 지우는 편이 빠릅니다.

### 부정 프롬프트 — 공통

```
photorealistic, 3d render, extra fingers, extra limbs, deformed hands,
malformed feet, cropped legs, cropped head, watermark, signature, text,
multiple characters, busy background, oversaturated, lens flare
```

**외출복 6장에는 아래를 추가합니다** — 명찰을 벗는 날이기 때문입니다.

```
lanyard, id card, name tag, badge on chest
```

### 인물 공통 요소

여섯 다 **검은 랜야드에 흰 ID 카드**를 목에 겁니다 (평상복만).

```
black lanyard around neck with a small white ID card
```

---

## 11. 몸통 프롬프트 — 12장

각 인물마다 **평상복 → 외출복 순서로** 뽑으세요. 평상복이 얼굴의 기준이 되고, 외출복은 그 결과를 참조 이미지로 다시 물립니다.

### 김민아 `minah`

**평상복** — 참조: 여자 프로필 좌측

```
22 year old korean woman, long straight black hair tied high in a ponytail,
sharp upturned cat-like eyes with clear pupils, slim face, thin lips,
slender build, black zip-up hoodie over a white tee, black track pants,
black running shoes worn with the heels crushed down, arms crossed,
flat expression but sharp alert eyes, black lanyard around neck with a small white ID card
```

**외출복** — 참조: 위에서 뽑은 평상복

```
same woman, hair completely down for the first time, long straight black hair
loose over the shoulders, black slip dress with a thin white shirt worn open over it,
black strap sandals, arms not crossed, slightly self-conscious expression,
no lanyard, no id card
```

> **핵심은 머리를 푼 것**입니다. 옷보다 그게 먼저 보여야 합니다.

### 이승희 `seunghee`

**평상복** — 참조: 여자 프로필 중앙

```
23 year old korean woman, long wavy brown hair, large round doe-like eyes,
long eyelashes, slim neck and narrow shoulders, beige knit sweater with the
sleeves pulled down over her hands, ivory ankle-length long skirt,
white canvas shoes neatly laced, timid posture with hands held close to the body,
startled gentle expression, black lanyard around neck with a small white ID card
```

**외출복**

```
same woman, light sky blue shirt dress with a thin belt, sleeves rolled up
revealing her wrists and forearms, small crossbody bag, low white sandals,
hands relaxed at her sides, slightly more open posture, no lanyard, no id card
```

> **소매를 걷어 손목이 보이는 것**이 이 장의 전부입니다. 평상복에서 손이 소매에 감춰져 있어야 대비가 삽니다.

### 장윤정 `yunjung`

**평상복** — 참조: 여자 프로필 우측

```
21 year old korean woman, brown hair tied high, big round downturned puppy-like eyes,
round cheeks, bright open smile, oversized bright yellow hoodie much too large for her,
black short pants almost entirely hidden under the hoodie, white high-top sneakers
with yellow laces, ankle socks, headphones resting around her neck,
energetic bouncy posture, black lanyard around neck with a small white ID card
```

**외출복**

```
same woman, cream sleeveless top and denim skirt, slim figure now clearly visible
after the oversized hoodie is gone, hair clip, several bracelets on one wrist,
headphones still resting around her neck, bright excited expression,
no lanyard, no id card
```

> **헤드폰은 양쪽 다 유지**합니다. 이 인물의 모티프라 사라지면 안 됩니다.

### 김민규 `mingyu`

**평상복** — 참조: 남자 프로필 좌측

```
22 year old korean man, long front bangs covering half of his face,
narrow sharp eyes, angular jaw, very thin build, faint dark circles,
black hoodie, black wide-leg pants dragging on the floor,
black high-top sneakers with the laces untied, hands in pockets,
not making eye contact, expressionless, black lanyard around neck with a small white ID card
```

**외출복**

```
same man, bangs swept back so both eyes are fully visible for the first time,
black overshirt open over a white tee, dark slacks, a silver ring,
black boots with the laces tied, standing straight,
still expressionless but now looking forward, no lanyard, no id card
```

> **눈이 드러나는 것**이 핵심입니다. 평상복에서 앞머리가 확실히 얼굴을 가려야 합니다.

### 이승민 `seungmin`

**평상복** — 참조: 남자 프로필 중앙

```
24 year old korean man, tall with broad shoulders and a large frame,
short cropped hair, big bright eyes that crease when he smiles,
green varsity jacket over a white tee, light blue straight denim jeans,
clean white high-top basketball shoes, wide open smile showing his gums,
confident welcoming posture, black lanyard around neck with a small white ID card
```

**외출복**

```
same man, no varsity jacket, linen shirt with the top button undone,
beige chinos, wristwatch, a cap, relaxed shoulders,
easier and less performed smile than usual, no lanyard, no id card
```

> **재킷을 벗은 것**이 핵심입니다. 어깨선이 눈에 띄게 편해 보여야 합니다.

### 장윤호 `yunho`

**평상복** — 참조: 남자 프로필 우측

```
20 year old korean man, round gentle eyes, soft facial lines, mild youthful face,
cream cardigan over a white tee with a small dog-shaped pin on the chest,
beige chinos with the cuffs rolled once, white canvas sneakers neatly laced,
attentive polite posture, warm mild expression,
black lanyard around neck with a small white ID card
```

**외출복**

```
same man, navy striped short-sleeve shirt, white shorts, canvas tote bag
with the small dog pin moved onto the bag strap, white sneakers,
carefully coordinated outfit that looks a little too planned,
slightly nervous cheerful expression, no lanyard, no id card
```

---

## 12. 표정 파츠 — 인페인팅 절차

**직접 생성하지 마세요.** 5종을 따로 뽑으면 얼굴 위치·크기가 매번 어긋나서 레이어로 못 씁니다.

### 절차

1. 인물의 **평상복 몸통을 먼저 확정**합니다
2. 그 이미지를 그대로 두고 **얼굴 영역만 마스킹**해 인페인팅합니다
3. 결과에서 **얼굴 부분만 잘라** 투명 캔버스(1000×2000)의 같은 위치에 올립니다
4. 5장이 전부 같은 캔버스·같은 위치가 됩니다

인페인팅 프롬프트는 **표정만** 씁니다. 머리·옷·구도는 마스크 밖이라 안 건드립니다.

| 표정 | 프롬프트 | 인물별 방향 |
|---|---|---|
| `normal` 평상 | `neutral calm expression` | 기준 얼굴 |
| `smile` 미소 | `soft genuine smile, eyes slightly narrowed` | |
| `shy` 부끄러움 | `blushing, eyes averted, slightly parted lips` | |
| `sad` 슬픔 | `downcast eyes, lowered brows, subdued` | |
| `surprise` 놀람 | `wide eyes, raised brows, slightly open mouth` | |

**인물별로 진폭을 다르게 줍니다.**

| | 지시 추가 |
|---|---|
| **김민아** | `expression barely changes but the eyes carry everything` — 표정 근육은 거의 안 움직이고 눈만 |
| **이승희** | `very subtle, smallest range of all` — 여섯 중 진폭이 가장 작음 |
| **장윤정** | `bright and large range` · `normal`은 **두 결로** — 웃는 평상 / 헤드폰 쓴 무표정 |
| **김민규** | `avoids eye contact even when smiling` — 시선을 안 주는 게 기본 |
| **이승민** | `big open smile showing gums` — 웃음이 크게 |
| **장윤호** | `gentle, narrower range than yunjung` — 같은 강아지상인데 덜 움직임 |

**`화남`은 만들지 않습니다.**

---

## 13. 스틸 프롬프트 — 18장

**생성에 가장 잘 맞는 항목입니다.** 배경까지 한 장에 들어가므로 그대로 뽑으면 됩니다.

- 규격: **1920 × 1080 가로, 불투명**
- 배경 레퍼런스가 필요하면 [WORLD_PROMPTS 9~12절](../WORLD_PROMPTS.md#9-캠퍼스-사진-시간대-변환--규칙)로 뽑은 심야·여명 이미지를 참조로 넣으세요
- 인물 참조 이미지는 **평상복 몸통**을 씁니다 (①②는 평상복 차림)

### 공통 배경 프롬프트

**① D7 새벽 커넥트가든 → 여명**

```
outdoor wooden deck terrace at dawn, low stone planter walls, empty white wire chairs
and olive green chairs and tables, young slender trees, white curtain-wall buildings
with orange perforated panels above, piloti columns with an open passage underneath,
sky a soft gradient from deep violet at the top to pale blue at the horizon,
ground and structures still in silhouette, no city lights anywhere, humid summer dawn air
```

**② D9 클라이맥스 — 교육장 403 심야**

```
long seminar room at 2am, almost all ceiling lights off, only two or three computer
monitors glowing, glass whiteboards faintly catching light on the left wall,
floor-to-ceiling windows completely black on the right, deep ink-blue darkness,
very low key lighting, high contrast, most of the frame barely readable shadow
```

**③ 엔딩 — 5년 후**

```
[오피스] modern open-plan office interior, late afternoon light, calm
[전시장] gallery exhibition space, white walls, spot lighting, quiet
```

### 인물별 순간 — ①커넥트가든

각 프롬프트 = **① 배경 프롬프트 + 아래 한 줄 + 스타일 접미사**

| | 추가할 문장 |
|---|---|
| **김민아** | `sitting on the deck holding a convenience store rice triangle, eating slowly and silently, exhausted, hair coming loose` |
| **김민규** | `sitting still, staring at nothing, empty expression, iced americano melted to water beside him` |
| **이승희** | `holding out a sketchbook as if it was taken from her, embarrassed, pages showing only the backs of people` |
| **이승민** | `just finished crying, trying to smile and failing, shoulders down` |
| **장윤정** | `holding out one side of her headphones toward the viewer, suddenly quiet, no trace of her usual cheerfulness` |
| **장윤호** | `alone on the deck after seeing everyone off, looking down, unable to answer` |

### 인물별 순간 — ②클라이맥스

| | 추가할 문장 |
|---|---|
| **김민아** | `about to collapse but refusing to admit it, insisting she is fine, monitor light on her face` |
| **김민규** | `perfect work on the screen, completely hollow expression, nobody noticing` |
| **이승희** | `left out of the group decision, still unable to speak, standing slightly apart` |
| **이승민** | `collapsed at the desk, the cheerfulness finally dropped` |
| **장윤정** | `just told that a second-year would not understand, frozen mid-sentence` |
| **장윤호** | `asked what he wants and unable to answer, looking away` |

### 인물별 순간 — ③엔딩

| | 배경 | 추가할 문장 |
|---|---|---|
| **김민아** 27 | 오피스 | `same company different team, still arguing over code reviews, leaving work together` |
| **김민규** 27 | 오피스 | `sleeping and eating properly now, healthier, calm` |
| **이승민** 29 | 오피스 | `first day at a new job, someone else looking after him this time` |
| **장윤호** 25 | 오피스 | `presenting his own work under his own name, finally` |
| **이승희** 28 | 전시장 | `now the one who reaches out first, standing by her own exhibited work` |
| **장윤정** 26 | 전시장 | `her graduation project became a released game, showing it` |

**엔딩 스틸은 5년 뒤라 옷과 머리가 캠프 때와 달라야 합니다.** 얼굴만 참조로 물리고 복장은 새로 지정하세요.

---

## 14. 도트 — 생성이 아니라 변환입니다

**48px 스프라이트 시트는 이미지 생성 모델로 안 나옵니다.** 4방향이 같은 인물로 유지되지 않고, 3열×4행 배열도 지켜지지 않습니다. `pixel art sprite sheet` 프롬프트로 나오는 결과는 규격 밖입니다.

### 실제 경로 — CG 축소 후 정리

1. **몸통 CG(평상복 정면)를 정사각으로 크롭**합니다 — 머리부터 발끝까지
2. **48 × 48로 축소**합니다. 반드시 **nearest neighbor**(뭉개짐 방지)
3. **색을 8~12색으로 감축**합니다 (indexed color / posterize)
4. **외곽선 1px**을 어두운 색으로 정리합니다
5. 머리를 크게 조정해 **2.5~3등신**으로 만듭니다 — 축소만 하면 8등신이라 쯔꾸르 화풍이 안 납니다
6. **정면 1장을 확정한 뒤** 좌·우·뒤 3방향과 걷기 3프레임을 손으로 파생합니다

> **1번 인물의 정면 1장이 전체 화풍을 결정합니다.** 이게 확정되기 전에 나머지 17종을 건드리지 마세요.

### 명찰

가슴에 **밝은 2×3px 사각형** + 목에서 내려오는 **1px 검은 줄**. 캠퍼스 안 전 컷 공통입니다.

### 참조 CG가 없는 12종

주인공 2 · 절친 2 · 조연 5 · 공용 3은 프로필이 없습니다. **히로인 도트에서 뽑아낸 규칙**(머리 비율, 눈 표현, 외곽선, 색 수)만으로 그립니다. 인물 설명은 [5절](#참조-이미지가-없는-12종).

---

## 15. 생성 결과 후처리 체크리스트

생성 결과를 아래로 거른 뒤 다음 장으로 넘어갑니다.

**몸통**

- [ ] 참조 인물과 **얼굴이 같은 사람인가**
- [ ] **발끝까지** 들어갔는가 (잘리면 하의·신발 설정이 죽습니다)
- [ ] 손가락·발이 깨지지 않았는가
- [ ] 평상복에 **명찰이 있고** 외출복에 **없는가**
- [ ] 캔버스 **1000 × 2000**, 배경 제거, 투명 PNG
- [ ] 같은 인물의 평상복·외출복 **얼굴 위치가 같은가**

**표정**

- [ ] 몸통과 **같은 캔버스·같은 위치**에 얹혀 있는가
- [ ] 5장이 서로 **머리·옷이 동일**한가 (마스크 밖이 바뀌면 실패)

**스틸**

- [ ] **심야가 충분히 어두운가** — 한눈에 다 읽히면 아직 밝습니다
- [ ] 창밖·원경에 **도시 불빛이 없는가**
- [ ] 여명이 **보라→파랑**인가 (주황 일출이면 다시)

**도트**

- [ ] **2.5~3등신**인가
- [ ] 색이 8~12색인가
- [ ] 시트가 **144 × 192px**, 행 순서가 아래→왼쪽→오른쪽→위인가

---

## 16. 생성 도구로 만들 때의 순서

1. **김민아 평상복 몸통** — 참조 이미지 물려서 여러 번 뽑아 하나 확정
2. 그걸로 **표정 5종 인페인팅** — 파츠 방식이 도는지 검증
3. 같은 인물 **도트 정면 1장**(5절 절차) — **전체 화풍 확정**
4. 여기까지 되면 나머지는 반복입니다. 인물별로 평상복 → 외출복 → 표정 순
5. 스틸 18장 — **①커넥트가든부터**
