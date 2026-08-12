"""타일맵 7개 — 공간 정본은 docs/WORLD_BIBLE.md 4절, 좌석은 4-2-2.

연결 (GAME_DESIGN 6-3 정본)
    M7 정문 ──정문── M3 1F ──후문── M5 커넥트가든 ──── M6 숙소동
                      │  ↕ 계단
                   M2 2F ──계단── M1 4F   ← 허브   (3F는 없음: 4F↔2F 직결)
    M3 1F ↕ 계단 ── M4 B1

M3이 수직 동선의 허브다 — 위로 M2, 아래로 M4, 밖으로 M7과 M5.
"""
from .map_core import TileMap, PIECE_SIZE

# ------------------------------------------------------------------ 공통 헬퍼
def room(m: TileMap, ts, x, y, w, h, floor="f_carpet_a", floor_var=None,
         south_cap=True, walls=True):
    """방을 놓는다. (x,y,w,h)는 **바닥 영역**.
    벽은 바깥에 붙는다 — 북 y-2..y-1(정면 2타일), 남 y+h(윗면 캡),
    서 x-1 / 동 x+w (측면 1타일), 네 모서리.
    """
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            p = floor
            if floor_var:
                r = ((xx * 73856093) ^ (yy * 19349663)) & 0xFFFF
                p = floor_var[0] if r % 100 < 74 else floor_var[1 + (r >> 3) % (len(floor_var) - 1)]
            m.set_ground(xx, yy, ts, p)
    if not walls:
        return
    for xx in range(x, x + w):
        m.set_obj(xx, y - 2, ts, "w_face", 0)
        m.set_obj(xx, y - 1, ts, "w_face", 1)
        if south_cap:
            m.set_obj(xx, y + h, ts, "w_cap", 0)
    for yy in range(y - 1, y + h):
        m.set_obj(x - 1, yy, ts, "w_side_l", 0)
        m.set_obj(x + w, yy, ts, "w_side_r", 0)
    m.set_obj(x - 1, y - 2, ts, "w_c_nw", 0)
    m.set_obj(x + w, y - 2, ts, "w_c_ne", 0)
    if south_cap:
        m.set_obj(x - 1, y + h, ts, "w_c_sw", 0)
        m.set_obj(x + w, y + h, ts, "w_c_se", 0)


def hwall(m, ts, x0, x1, y, piece="w_face"):
    for x in range(x0, x1 + 1):
        m.set_obj(x, y, ts, piece, 0)
        m.set_obj(x, y + 1, ts, piece, 1)


def vwall(m, ts, x, y0, y1, right=False):
    for y in range(y0, y1 + 1):
        m.set_obj(x, y, ts, "w_side_r" if right else "w_side_l", 0)


def band(m, ts, piece, x0, x1, y):
    for x in range(x0, x1 + 1):
        m.set_obj(x, y, ts, piece, 0)


def doorway_v(m, ts, x, y0, y1, floor):
    """측벽에 세로 출입구를 뚫는다 — 오브젝트 제거 + 바닥 깔기 + 충돌 해제."""
    for y in range(y0, y1 + 1):
        m.objects[m.i(x, y)] = 0
        m.set_ground(x, y, ts, floor)
        m.open(x, y)


def doorway_h(m, ts, x0, x1, y, floor):
    for x in range(x0, x1 + 1):
        m.objects[m.i(x, y)] = 0
        m.set_ground(x, y, ts, floor)
        m.open(x, y)


def seat_row(m, ts, desks, chair_xs, dy, chair="chair_up"):
    """긴 책상 여러 장 + 그 아래 의자. dy = 책상 좌상단 y, 의자는 dy+2."""
    for dx in desks:
        m.place(ts, "desk_monitor" if (dx // 3) % 2 == 0 else "desk_long", dx, dy)
    for cx in chair_xs:
        m.set_obj(cx, dy + 2, ts, chair, 0)


# ================================================================== M1
def m1(TS_):
    """교육동 4F — 허브. 교육장 403(지정석) · 코칭실 403 · 커뮤니티 라운지 · 복도.

    WORLD_BIBLE 4-2-2 — 자리마다 누가 앉는지가 정해져 있다. 균일 그리드로 깔면 안 된다.
      동갑  뒷줄 창가 끝   화이트보드에서 가장 먼 자리. 아무도 뒤에서 화면을 못 본다
      연상  뒷줄 기둥 옆   시선이 안 닿는 자리
      연하  앞줄 문2 옆    오가는 사람이 다 보이는 자리
      4조   가운데 줄 한가운데 4석 밀착 — 뭉쳐 있다는 것 자체가 이 조의 표현
      주인공 가운데
    6조 넷이 세 방향으로 흩어져 있어서, 어느 방향으로 걷느냐가 곧 루트 선택이 된다.
    """
    W, H = 44, 30
    m = TileMap("m1_basecamp_4f", W, H, TS_, lighting="day,evening,night,deepnight")
    E = "edu"
    # 복도 (교육동 전층 공통 바닥)
    m.fill(E, "f_vinyl_a", 0, 0, W, H, variants=["f_vinyl_a", "f_vinyl_b", "f_vinyl_seam"])
    # 외곽
    hwall(m, E, 0, W - 1, 0)
    vwall(m, E, 0, 2, H - 2); vwall(m, E, W - 1, 2, H - 2, right=True)
    band(m, E, "w_cap", 0, W - 1, H - 1)

    # ---- 교육장 403 : 바닥 x2..29 / y8..26
    RX, RY, RW, RH = 2, 8, 28, 19
    room(m, E, RX, RY, RW, RH, floor="f_carpet_a",
         floor_var=["f_carpet_a", "f_carpet_b", "f_carpet_a", "f_carpet_c"])
    # 매입 LED 아래 광원 자국 (classroom_1 천장 매입등)
    for gy in range(RY + 1, RY + RH, 5):
        for gx in range(RX + 2, RX + RW, 6):
            m.set_ground(gx, gy, E, "f_lightpool")
    # 남쪽 = 통창 (뒷줄이 창가)
    for x in range(RX, RX + RW):
        m.set_obj(x, RY + RH, E, "w_curtain_s" if x in (RX, RX + 1, RX + RW - 2, RX + RW - 1)
                  else "w_window_s", 0)
    # 북쪽 벽 = 화이트보드 + 문 2개
    m.place(E, "w_whiteboard", 12, RY - 2)               # x12..16 : 가운데 통로 정면
    m.place(E, "door_open", 5, RY - 2)                   # 문1 (좌) — 연하를 지나치지 않는 출구
    m.place(E, "door_open", 23, RY - 2)                  # 문2 (우) — 연하 자리 옆
    m.place(E, "podium", 9, RY)                          # 코치 자리
    m.trigger("whiteboard", 12, RY, w=5, h=1,
              kind="whiteboard", note="인게임 낙서 + 플레이어 방명록이 얹히는 지점")
    m.trigger("door1_exit", 5, RY - 1, kind="door", door="1")
    m.trigger("door2_exit", 23, RY - 1, kind="door", door="2")

    # ---- 지정석 24석 (WORLD_BIBLE 4-2-2)
    #
    # 균일 그리드로 깔지 않는다. 줄마다 책상 섬(pod)의 크기와 위치가 다르고,
    # 6조 넷(주인공·연하·연상·동갑)이 서로 다른 방향에 앉는다.
    # 누구에게 말을 걸지 = 어느 방향으로 걷는지 = 루트 선택.
    #
    #        [문1 x5]      ┌── 화이트보드 x12~16 ──┐        [문2 x23]
    #  앞줄  y12   4  7 10 │        아일           │ 19 (22)25      (22)=연하
    #  2줄   y16   4  7 10 │       (15)            │    23  26      (15)=주인공
    #  가운데y20   4       │  12 14 16 18 ←4조밀착 │        26
    #  뒷줄  y24  (5) 8 11 │                       │ 21 24 (27)     (5)=연상 (27)=동갑
    #  ══════════════════ 남쪽 통창 y27 ══════════════════
    #  기둥 (7,20)-(7,21) — 화이트보드 중심 (14,8) 에서 연상 자리 (5,24) 로 가는
    #  시선이 y20~21 에서 x7 을 지난다. qa.py 가 이 교차를 검사한다.

    seat_row(m, E, [3, 6, 9] + [18, 21, 24], [4, 7, 10] + [19, 22, 25], 10)  # 앞줄
    # 2번째 줄 — 가운데에 주인공 책상 하나만 따로 놓는다
    seat_row(m, E, [3, 6, 9] + [14] + [22, 25], [4, 7, 10] + [15] + [23, 26], 14)
    # 가운데 줄 — 4조는 간격 2칸으로 밀착(다른 줄은 3칸). 뭉쳐 있다는 것 자체가 표현
    seat_row(m, E, [3] + [11, 14, 17] + [25], [4] + [12, 14, 16, 18] + [26], 18)
    seat_row(m, E, [4, 7, 10] + [20, 23, 26], [5, 8, 11] + [21, 24, 27], 22)  # 뒷줄

    # ---- 기둥 (뒷줄 한쪽 · 시선이 안 닿는 자리를 만드는 장치)
    m.place(E, "pillar", 7, 20)

    # ---- NPC (지정석 = 캐릭터 묘사)
    SEATS = {
        "player":  (15, 16),                                   # 정중앙
        "younger": (22, 12),                                   # 앞줄 · 문2(x23) 옆
        "older":   (5, 24),                                    # 뒷줄 · 기둥(7,20) 뒤
        "sameage": (27, 24),                                   # 뒷줄 창가 끝
        "team4":   [(12, 20), (14, 20), (16, 20), (18, 20)],   # 가운데 줄 한가운데 밀착
    }
    m.npc("player_seat", *SEATS["player"], role="player", label="주인공 지정석",
          seat="가운데 — 학번도 실력도 가운데인 사람의 자리")
    m.npc("younger", *SEATS["younger"], role="heroine_younger", label="장윤정 / 장윤호",
          seat="앞줄 · 문2 옆",
          note="오가는 사람이 다 보이는 자리. 문1로 나가면 지나치지 않는다")
    m.npc("older", *SEATS["older"], role="heroine_older", label="이승희 / 이승민",
          seat="뒷줄 · 기둥 옆", note="시선이 안 닿는 자리")
    m.npc("sameage", *SEATS["sameage"], role="heroine_sameage", label="김민아 / 김민규",
          seat="뒷줄 창가 끝",
          note="화이트보드에서 가장 먼 자리. 아무도 뒤에서 화면을 못 본다")
    # 4조 = 강태윤·강태연 · 한지오·한지아 · 조민 + 무명 1 (넷이 나란히)
    TEAM4 = ["강태윤 / 강태연", "한지오 / 한지아", "조민", "무명"]
    for i, (cx, cy) in enumerate(SEATS["team4"]):
        m.npc(f"team4_{i+1}", cx, cy, role="team4", label=TEAM4[i],
              named=(TEAM4[i] != "무명"),
              seat="가운데 줄 · 네 명이 나란히 — 뭉쳐 있다는 것 자체가 이 조의 표현")

    # 무명 — 남는 자리를 공용 스프라이트로 채워 스물네 자리가 다 찬 것처럼 보이게 한다
    ROWS = {12: [4, 7, 10, 19, 22, 25],
            16: [4, 7, 10, 15, 23, 26],
            20: [4, 12, 14, 16, 18, 26],
            24: [5, 8, 11, 21, 24, 27]}
    taken = {SEATS["player"], SEATS["younger"], SEATS["older"], SEATS["sameage"]}
    taken |= set(SEATS["team4"])
    k = 0
    for cy, xs in ROWS.items():
        for cx in xs:
            if (cx, cy) in taken:
                continue
            k += 1
            m.npc(f"extra_{k:02d}", cx, cy, role="extra", label="무명")
    # 총 24석 = 무명 17 + 주인공 1 + 동갑·연상·연하 3 + 4조 중 이름 있는 3

    # ---- 코칭실 403 (문이 늘 열려 있음)
    room(m, E, 36, 8, 7, 8, floor="f_carpet_b")
    m.place(E, "door_open", 38, 6)
    doorway_v(m, E, 35, 10, 11, "f_vinyl_a")     # 복도 → 코칭실
    m.place(E, "desk_long", 37, 10)
    m.set_obj(38, 12, E, "chair_down", 0)
    m.set_obj(37, 9, E, "plant", 0)
    m.place(E, "cabinet", 41, 14)
    m.place(E, "w_glass", 40, 6)
    m.npc("coach", 38, 12, role="coach", label="코치", note="코칭실 403 · 문은 늘 열려 있음")
    m.trigger("coaching_room", 38, 9, w=2, h=2, kind="room", room="coaching_403")

    # ---- 커뮤니티 라운지 (층마다 하나 · 소파, 정수기)
    room(m, E, 36, 19, 7, 8, floor="f_carpet_b")
    for x in range(37, 42):
        for y in range(21, 25):
            m.set_ground(x, y, E, "f_rug")
    doorway_v(m, E, 35, 21, 22, "f_vinyl_a")     # 복도 → 라운지 (측벽 출입구)
    m.place(E, "sofa", 37, 19)
    m.place(E, "lounge_table", 38, 22)
    m.set_obj(41, 20, E, "water_cooler", 0)
    m.set_obj(41, 26, E, "trash", 0)
    m.set_obj(36, 26, E, "plant", 0)
    m.trigger("lounge_4f", 37, 22, w=4, h=3, kind="room", room="lounge_4f")

    # ---- 복도 집기
    for x in (2, 8, 14, 20, 26):
        m.set_ground(x, 4, E, "f_lightpool")
    m.place(E, "vending", 32, 3)
    m.set_obj(33, 4, E, "water_cooler", 0)
    m.set_obj(41, 4, E, "trash", 0)
    m.set_obj(2, 4, E, "plant", 0)
    m.place(E, "plant_big", 34, 20)
    m.place(E, "bookshelf", 31, 8)

    # ---- 계단 — **네 층이 같은 자리를 씁니다** (WORLD_BIBLE 3절)
    #   올라가는 계단  (20,3)  · 위쪽 벽을 등진다 · 아래에서만 · 앞칸 (20,5)
    #   내려가는 계단  (15,25) · 아래쪽 벽을 등진다 · 위에서만 · 앞칸 (15,24)
    # 네 층에서 y 23~25 가 다 비어 있는 x 구간이 14~18 뿐이라 그 안에서 잡았다.
    # 올라가면 위층의 「내려가는 계단 앞」 에, 내려가면 아래층의
    # 「올라가는 계단 앞」 에 나온다 — 되돌아가려면 뒤로 한 발이면 된다.
    # 4F 는 꼭대기라 내려가는 계단만 있다 (3F 는 만들지 않는다)
    m.place(E, "stairs_down", 15, 25)
    m.portal("m2_basecamp_2f", 15, 25, 20, 5, name="stairs_to_2f")
    m.portal("m2_basecamp_2f", 16, 25, 20, 5, name="stairs_to_2f")
    m.trigger("spawn_default", 14, 9, kind="spawn")
    return m


# ================================================================== M2
def m2(TS_):
    """교육동 2F — 오픈데스크 존 · 회의실 5~7 · 라운지."""
    W, H = 44, 30
    m = TileMap("m2_basecamp_2f", W, H, TS_, lighting="day,deepnight")
    E = "edu"
    m.fill(E, "f_vinyl_a", variants=["f_vinyl_a", "f_vinyl_b", "f_vinyl_seam"])
    hwall(m, E, 0, W - 1, 0)
    vwall(m, E, 0, 2, H - 2); vwall(m, E, W - 1, 2, H - 2, right=True)
    band(m, E, "w_cap", 0, W - 1, H - 1)

    # 오픈데스크 존 (지정석 없는 공용 테이블 — opendesk.webp)
    room(m, E, 2, 8, 24, 19, floor="f_carpet_a",
         floor_var=["f_carpet_a", "f_carpet_b", "f_carpet_c"])
    for x in range(2, 26):
        m.set_obj(x, 27, E, "w_window_s" if x % 6 else "w_curtain_s", 0)
    m.place(E, "door_open", 5, 6)
    m.place(E, "door_open", 20, 6)
    for dy in (10, 15, 20):
        for dx in (4, 9, 15, 20):
            m.place(E, "desk_monitor" if (dx + dy) % 3 else "desk_long", dx, dy)
        for cx in (5, 10, 16, 21):
            m.set_obj(cx, dy + 2, E, "chair_up", 0)
            m.set_obj(cx + 1, dy - 1, E, "chair_down", 0)
    m.place(E, "pillar", 13, 12)
    m.place(E, "pillar", 13, 22)
    for gx in (6, 12, 18, 24):
        m.set_ground(gx, 9, E, "f_lightpool"); m.set_ground(gx, 19, E, "f_lightpool")

    # 회의실 5·6·7 (유리 파티션)
    for i, ry in enumerate((8, 15, 22)):
        room(m, E, 31, ry, 11, 5, floor="f_carpet_b")
        m.place(E, "door_open", 33, ry - 2)
        m.place(E, "w_glass", 36, ry - 2)
        m.place(E, "w_glass", 38, ry - 2)
        m.place(E, "lounge_table", 35, ry + 1)
        m.set_obj(34, ry + 2, E, "chair_right", 0)
        m.set_obj(38, ry + 2, E, "chair_left", 0)
        m.set_obj(36, ry, E, "chair_down", 0)
        m.set_obj(37, ry + 4, E, "chair_up", 0)
        m.trigger(f"meeting_{5+i}", 34, ry + 1, w=4, h=3, kind="room", room=f"meeting_{5+i}")

    # 라운지 + 복도 집기
    m.place(E, "sofa", 27, 3)
    m.place(E, "vending", 41, 3)
    m.set_obj(40, 4, E, "water_cooler", 0)
    m.set_obj(2, 4, E, "plant", 0)
    m.place(E, "plant_big", 30, 3)
    m.set_obj(26, 5, E, "trash", 0)

    # ---- 방 (WORLD_BIBLE 4-2)
    m.trigger("opendesk", 3, 9, w=20, h=14, kind="room", room="opendesk")
    m.trigger("lounge_2f", 26, 2, w=6, h=4, kind="room", room="lounge_2f")

    # ---- NPC — 자유 이동에서 2층에 있는 사람들 (WORLD_BIBLE 4-2-1)
    #   누가 내려오는지가 그 사람을 말한다. 민아·민규는 안 내려오므로
    #   여기 heroine_sameage 자리는 없다.
    # **성별 쌍으로 적습니다.** 이 자리만 여자 이름이 박혀 있어서, 남자로
    # 플레이할 때 2층에 승민이 아니라 승희가 앉아 있었다.
    m.npc("older", 10, 22, role="heroine_older", label="이승희 / 이승민",
          seat="뒷줄 · 기둥(13,22) 옆",
          note="사람을 피해 내려온다. 두 문에서 가장 먼 자리 — M1 지정석과 같은 성격")
    m.npc("younger", 6, 9, role="heroine_younger", label="장윤정 / 장윤호",
          seat="앞줄 · 문1 옆",
          note="윤정은 작업 모드일 때만, 윤호는 자주 짧게. 둘 다 오가는 자리")
    # 4조 = M1 과 같은 넷. D8 밤에 가운데 줄을 통째로 잡는다 (c4_scout)
    TEAM4_2F = ["강태윤 / 강태연", "한지오 / 한지아", "조민", "무명"]
    for i, cx in enumerate((5, 10, 16, 21)):
        m.npc(f"team4_{i+1}", cx, 17, role="team4_lead" if i == 0 else "team4",
              label=TEAM4_2F[i], named=(TEAM4_2F[i] != "무명"),
              seat="가운데 줄 · 넷이 나란히", note="화면 넷이 다 켜져 있다")

    # ---- 계단 — **네 층이 같은 자리를 씁니다** (WORLD_BIBLE 3절)
    #   올라가는 계단  (20,3)  · 위쪽 벽을 등진다 · 아래에서만 · 앞칸 (20,5)
    #   내려가는 계단  (15,25) · 아래쪽 벽을 등진다 · 위에서만 · 앞칸 (15,24)
    # 네 층에서 y 23~25 가 다 비어 있는 x 구간이 14~18 뿐이라 그 안에서 잡았다.
    # 올라가면 위층의 「내려가는 계단 앞」 에, 내려가면 아래층의
    # 「올라가는 계단 앞」 에 나온다 — 되돌아가려면 뒤로 한 발이면 된다.
    m.place(E, "stairs_up", 20, 3)
    m.portal("m1_basecamp_4f", 20, 4, 15, 24, name="stairs_to_4f")
    m.portal("m1_basecamp_4f", 21, 4, 15, 24, name="stairs_to_4f")
    m.place(E, "stairs_down", 15, 25)
    m.portal("m3_basecamp_1f", 15, 25, 20, 5, name="stairs_to_1f")
    m.portal("m3_basecamp_1f", 16, 25, 20, 5, name="stairs_to_1f")
    m.trigger("spawn_default", 20, 5, kind="spawn")
    return m


# ================================================================== M3
def m3(TS_):
    """교육동 1F — 로비 · 정글라운지(소파존) · 정글 스텝(책장 벽 계단식) · 운영사무실 · 택배보관소."""
    W, H = 44, 30
    m = TileMap("m3_basecamp_1f", W, H, TS_, lighting="day,night")
    E = "edu"
    m.fill(E, "f_vinyl_a", variants=["f_vinyl_a", "f_vinyl_b"])
    hwall(m, E, 0, W - 1, 0)
    vwall(m, E, 0, 2, H - 2); vwall(m, E, W - 1, 2, H - 2, right=True)
    band(m, E, "w_cap", 0, W - 1, H - 1)

    # 로비 (lobby.webp)
    room(m, E, 2, 8, 20, 19, floor="f_vinyl_a", floor_var=["f_vinyl_a", "f_vinyl_b"])
    for x in range(2, 22):
        m.set_obj(x, 27, E, "w_window_s", 0)
    m.place(E, "door_open", 11, 6)                   # 복도 → 로비
    m.place(E, "door_open", 18, 6)
    m.place(E, "counter", 4, 9)                      # 안내 데스크
    m.set_obj(5, 11, E, "chair_down", 0)
    m.place(E, "plant_big", 2, 10)
    m.place(E, "plant_big", 20, 10)
    for gx in (5, 11, 17):
        m.set_ground(gx, 12, E, "f_lightpool"); m.set_ground(gx, 20, E, "f_lightpool")
    # 정글라운지 — 로비 옆 개방형 소파존 (WORLD_BIBLE 4-2)
    m.place(E, "sofa", 8, 14)
    m.place(E, "lounge_table", 9, 17)
    m.trigger("jungle_lounge", 7, 13, w=6, h=6, kind="room", room="jungle_lounge")
    m.set_obj(3, 26, E, "trash", 0)

    # 정글 스텝 — 책장 벽 계단식 (jungle_step.webp · 안내도에 이름이 없는 공간)
    for x in range(3, 20):
        for y in range(21, 26):
            m.set_ground(x, y, E, "f_stage_step")
    for bx in (3, 6, 12, 15, 18):                 # x9..11 은 계단식 라운지 진입로
        m.place(E, "bookshelf", bx, 19)
    doorway_h(m, E, 9, 11, 19, "f_stage_step")
    doorway_h(m, E, 9, 11, 20, "f_stage_step")
    m.trigger("jungle_step", 4, 22, w=15, h=4, kind="room", room="jungle_step")

    # 운영사무실
    room(m, E, 27, 8, 8, 7, floor="f_carpet_b")
    m.place(E, "door_open", 29, 6)
    m.place(E, "desk_long", 28, 10)
    m.set_obj(29, 12, E, "chair_down", 0)
    m.place(E, "cabinet", 32, 9)
    m.npc("staff", 29, 12, role="staff", label="운영 매니저")
    m.trigger("office", 28, 10, w=3, h=2, kind="room", room="office")

    # 택배보관소
    room(m, E, 37, 8, 5, 7, floor="f_vinyl_b")
    m.place(E, "door_open", 39, 6)
    m.place(E, "shelf_store", 37, 9)
    m.place(E, "shelf_store", 40, 9)
    m.trigger("parcel", 38, 13, w=3, h=1, kind="interact", label="택배보관소")

    # ---- 계단 — **네 층이 같은 자리를 씁니다** (WORLD_BIBLE 3절)
    #   올라가는 계단  (20,3)  · 위쪽 벽을 등진다 · 아래에서만 · 앞칸 (20,5)
    #   내려가는 계단  (15,25) · 아래쪽 벽을 등진다 · 위에서만 · 앞칸 (15,24)
    # 네 층에서 y 23~25 가 다 비어 있는 x 구간이 14~18 뿐이라 그 안에서 잡았다.
    # 올라가면 위층의 「내려가는 계단 앞」 에, 내려가면 아래층의
    # 「올라가는 계단 앞」 에 나온다 — 되돌아가려면 뒤로 한 발이면 된다.
    m.place(E, "stairs_up", 20, 3)
    m.portal("m2_basecamp_2f", 20, 4, 15, 24, name="stairs_to_2f")
    m.portal("m2_basecamp_2f", 21, 4, 15, 24, name="stairs_to_2f")
    m.place(E, "stairs_down", 15, 25)                # B1 (정글스테이지 · 카페테리아 · 편의점)
    m.portal("m4_basecamp_b1", 15, 25, 20, 5, name="stairs_to_b1")
    m.portal("m4_basecamp_b1", 16, 25, 20, 5, name="stairs_to_b1")
    m.place(E, "vending", 24, 3)
    m.set_obj(25, 4, E, "water_cooler", 0)

    # 나가는 문 두 개 — **방향이 곧 목적지입니다.**
    #   위    커넥트가든 (건물 뒤 정원)
    #   오른쪽 정문
    m.trigger("back_gate", 18, 2, w=4, h=1, kind="door", label="후문 · 커넥트가든")
    for x in range(18, 22):
        m.portal("m5_connect_garden", x, 2, 12 + (x - 18), 42, name="to_garden")
    m.trigger("front_gate", 41, 20, w=1, h=4, kind="door", label="정문")
    for y in range(20, 24):
        m.portal("m7_gate", 41, y, 3, 12 + (y - 20), name="to_gate")
    m.set_ground(41, 21, E, "f_lightpool"); m.set_ground(41, 22, E, "f_lightpool")
    m.trigger("spawn_default", 12, 4, kind="spawn")

    # ---- 배경 인물 — 로비 · 게시판 · 택배보관소
    # 스물넷이 하루 종일 교육장에만 앉아 있을 리가 없다. 말은 못 걸어도
    # 사람이 있어야 캠퍼스가 산 것처럼 보인다. dir 로 보는 쪽을 흩는다.
    m.npc("extra1", 23, 3, role="extra", label="무명", dir="down", note="자판기 앞")
    m.npc("extra2", 3, 8, role="extra", label="무명", dir="right", note="게시판을 본다")
    m.npc("extra3", 15, 8, role="extra", label="무명", dir="down", note="로비 소파")
    m.npc("extra4", 31, 8, role="extra", label="무명", dir="left", note="계단 쪽에서 통화 중")
    m.npc("extra5", 4, 11, role="extra", label="무명", dir="up", note="택배 상자를 뒤진다")
    m.npc("extra6", 23, 13, role="extra", label="무명", dir="right", note="로비 소파")
    m.npc("extra7", 23, 16, role="extra", label="무명", dir="up", note="소파 등받이에 기대")
    m.npc("extra8", 34, 16, role="extra", label="무명", dir="left", note="창밖을 본다")
    m.npc("extra9", 11, 19, role="extra", label="무명", dir="down", note="나가는 길")

    return m


# ================================================================== M4
def m4(TS_):
    """교육동 B1 — 정글스테이지(계단식 강당) · 카페테리아 · 편의점 · 그랩앤고.
    가운데 세로 복도(x25~28)가 강당과 식당동을 가른다."""
    W, H = 44, 30
    m = TileMap("m4_basecamp_b1", W, H, TS_, lighting="day,deepnight")
    E = "edu"
    m.fill(E, "f_vinyl_a", variants=["f_vinyl_a", "f_vinyl_b"])
    hwall(m, E, 0, W - 1, 0)
    vwall(m, E, 0, 2, H - 2); vwall(m, E, W - 1, 2, H - 2, right=True)
    band(m, E, "w_cap", 0, W - 1, H - 1)

    # ---- 정글스테이지 (계단식 강당 · 24명이라 앞쪽만 참)
    room(m, E, 2, 8, 22, 19, floor="f_carpet_a", floor_var=["f_carpet_a", "f_carpet_b"])
    m.place(E, "screen", 10, 6)
    m.place(E, "door_open", 4, 6)
    m.place(E, "door_open", 21, 6)
    m.place(E, "podium", 8, 9)
    for r in range(5):
        ry = 13 + r * 3
        for x in range(3, 23):
            m.set_ground(x, ry, E, "f_stage_step")
            m.set_ground(x, ry + 1, E, "f_stage_step")
        if r < 2:                                  # 앞 두 단만 채운다 = 24명
            for cx in range(4, 22, 3):
                m.set_obj(cx, ry + 1, E, "chair_up", 0)
    m.trigger("jungle_stage", 7, 9, w=10, h=3, kind="room", room="jungle_stage")

    # ---- 카페테리아 (canteen.webp)
    room(m, E, 30, 8, 12, 8, floor="f_vinyl_b")
    doorway_v(m, E, 29, 10, 12, "f_vinyl_a")       # 복도 → 카페테리아
    for cx in (30, 32, 34):
        m.place(E, "counter", cx, 8)
    for tx in (31, 35, 39):
        m.place(E, "lounge_table", tx, 11)
        m.set_obj(tx, 13, E, "chair_up", 0)
        m.set_obj(tx + 1, 10, E, "chair_down", 0)
    m.npc("canteen_staff", 36, 9, role="staff", label="카페테리아 직원")
    m.trigger("canteen", 31, 11, w=10, h=3, kind="room", room="canteen")

    # ---- 편의점 + 그랩앤고
    room(m, E, 30, 20, 12, 7, floor="f_vinyl_a")
    doorway_v(m, E, 29, 22, 24, "f_vinyl_a")
    for sx in (30, 33, 36):
        m.place(E, "shelf_store", sx, 20)
    m.place(E, "counter", 39, 24)
    m.place(E, "vending", 41, 20)                  # 그랩앤고 — 심야 광원
    m.place(E, "vending", 27, 3)
    m.trigger("convenience", 31, 24, w=8, h=2, kind="room", room="convenience")
    m.trigger("grab_and_go", 41, 22, w=1, h=1, kind="interact", label="그랩앤고")

    # ---- 계단 — **네 층이 같은 자리를 씁니다** (WORLD_BIBLE 3절)
    #   올라가는 계단  (20,3)  · 위쪽 벽을 등진다 · 아래에서만 · 앞칸 (20,5)
    #   내려가는 계단  (15,25) · 아래쪽 벽을 등진다 · 위에서만 · 앞칸 (15,24)
    # 네 층에서 y 23~25 가 다 비어 있는 x 구간이 14~18 뿐이라 그 안에서 잡았다.
    # 올라가면 위층의 「내려가는 계단 앞」 에, 내려가면 아래층의
    # 「올라가는 계단 앞」 에 나온다 — 되돌아가려면 뒤로 한 발이면 된다.
    # GAME_DESIGN 6-3 정본: M4 → M3. B1 은 1F 아래라 올라가는 계단만 있다.
    m.place(E, "stairs_up", 20, 3)
    m.portal("m3_basecamp_1f", 20, 4, 15, 24, name="stairs_to_1f")
    m.portal("m3_basecamp_1f", 21, 4, 15, 24, name="stairs_to_1f")
    m.trigger("spawn_default", 20, 5, kind="spawn")

    # ---- 배경 인물 — B1 · 카페테리아 · 편의점 · 정글스테이지
    # 스물넷이 하루 종일 교육장에만 앉아 있을 리가 없다. 말은 못 걸어도
    # 사람이 있어야 캠퍼스가 산 것처럼 보인다. dir 로 보는 쪽을 흩는다.
    m.npc("extra1", 26, 3, role="extra", label="무명", dir="down", note="편의점 앞")
    m.npc("extra2", 6, 8, role="extra", label="무명", dir="right", note="배식 줄")
    m.npc("extra3", 18, 8, role="extra", label="무명", dir="down", note="배식 줄")
    m.npc("extra4", 9, 9, role="extra", label="무명", dir="up", note="배식대 앞")
    m.npc("extra5", 29, 10, role="extra", label="무명", dir="left", note="정글스테이지 좌석")
    m.npc("extra6", 25, 12, role="extra", label="무명", dir="down", note="정글스테이지 좌석")
    m.npc("extra7", 20, 14, role="extra", label="무명", dir="up", note="무대 쪽을 본다")
    m.npc("extra8", 6, 17, role="extra", label="무명", dir="right", note="컵라면 물을 받는다")
    m.npc("extra9", 25, 19, role="extra", label="무명", dir="left", note="혼자 먹는다")
    m.npc("extra10", 23, 22, role="extra", label="무명", dir="down", note="계단 앞")

    return m


# ================================================================== M5
def table_set(m, ts, x, y, green=False, sides="ud"):
    """야외 테이블 한 세트. (x,y)는 테이블 2x2의 좌상단.
    sides: u=위 의자 d=아래 의자 l=왼쪽 r=오른쪽"""
    g = "_g" if green else ""
    m.place(ts, "table_out_g" if green else "table_out", x, y)
    if "u" in sides:
        m.set_obj(x, y - 1, ts, f"chair_out{g}_down", 0)
    if "d" in sides:
        m.set_obj(x + 1, y + 2, ts, f"chair_out{g}_up", 0)
    if "l" in sides:
        m.set_obj(x - 1, y + 1, ts, f"chair_out{g}_right", 0)
    if "r" in sides:
        m.set_obj(x + 2, y + 1, ts, f"chair_out{g}_left", 0)


def m5(TS_):
    """커넥트가든 — 감정 정점. 카페 앞 우드데크 · 두 동 사이 통로.
    안내도상 교육동(ㅁ자)과 숙소동(ㄷ자) 사이를 세로로 꿰뚫는 공간이라 세로로 길다.
    여명(04:30~) 오버레이는 이 맵 전용.

    M5 커넥트가든 — 빼면 안 되는 둘
      ① 야외 테이블과 의자 — 흰 와이어프레임 + 올리브그린 + 가운데 초록 하이테이블/스툴.
         빈 의자가 채워졌다가 다시 비는 게 이 공간의 모티프다(D1 → D7 → D11).
      ② 필로티 아래 통로 — 남쪽(숙소동 방향) 끝의 원기둥 열과 그 아래 뚫린 통로.
         "건너간다"가 이 게임의 작별 인사다.
    """
    W, H = 32, 46
    m = TileMap("m5_connect_garden", W, H, TS_, lighting="night,deepnight,dawn")
    O = "out"
    m.fill(O, "f_pave", variants=["f_pave", "f_pave_b"])

    PILOTI_Y = 36          # 필로티 통로 시작 (건물 밑면 그늘 경계)
    DECK_Y0, DECK_Y1 = 5, 32

    # ---- 좌우 건물 (교육동 / 숙소동) — 필로티 구간 위쪽까지만 벽이 내려온다
    for y in range(0, PILOTI_Y - 2, 3):
        m.place(O, "bld_wall", 0, y); m.place(O, "bld_wall", 1, y)
        m.place(O, "bld_wall", W - 2, y); m.place(O, "bld_wall", W - 1, y)
    m.place(O, "bld_cantilever", 2, 6)      # 교육동 시그니처 주황 캔틸레버
    m.place(O, "bld_cantilever", 2, 26)
    m.place(O, "bld_cantilever", W - 5, 15)
    for py in (9, 21):                      # 데크 옆 각기둥 필로티
        m.place(O, "piloti", 2, py)
        m.place(O, "piloti", W - 4, py)

    # ---- 중앙 우드데크 (카페 앞)
    for y in range(DECK_Y0, DECK_Y1 + 1):
        for x in range(6, W - 6):
            m.set_ground(x, y, O, "f_deck_v" if (x + y) % 5 else "f_deck_v2")
    for x in range(6, W - 6):
        m.set_ground(x, DECK_Y0, O, "f_deck_edge")
        m.set_ground(x, DECK_Y1, O, "f_deck_edge")

    # ---- 석축 화단 (사진의 낮은 석축 옹벽) + 지지대 댄 어린 나무
    for y in (11, 24):
        for x in list(range(5, 10)) + list(range(W - 10, W - 5)):
            m.place(O, "planter_wall", x, y)
        for x in list(range(5, 10)) + list(range(W - 10, W - 5)):
            m.set_obj(x, y - 1, O, "planter_cap", 0)
    for ty in (8, 21):
        for x in (5, 8, W - 10, W - 7):
            m.place(O, "tree_young", x, ty)

    # ---- ① 야외 테이블과 의자 ------------------------------------------------
    # 사진처럼 흰 와이어프레임과 올리브그린을 섞고, 가운데에 초록 하이테이블 + 스툴.
    table_set(m, O, 11, 6, green=False, sides="udr")
    table_set(m, O, 18, 6, green=True,  sides="udl")
    table_set(m, O, 11, 14, green=True, sides="udl")
    table_set(m, O, 18, 14, green=False, sides="udr")
    table_set(m, O, 12, 27, green=False, sides="ud")
    table_set(m, O, 18, 27, green=True,  sides="ud")
    table_set(m, O, 7, 17, green=False, sides="dr")
    table_set(m, O, 23, 17, green=True,  sides="dl")

    # 가운데 초록 원형 하이테이블 2조 + 스툴 — 사진 한가운데 있는 그것
    m.place(O, "high_table", 14, 18)
    for sx, sy in ((13, 19), (16, 19), (14, 21), (15, 17)):
        m.set_obj(sx, sy, O, "stool_g", 0)
    m.place(O, "high_table", 14, 10)
    for sx, sy in ((13, 11), (16, 11), (15, 9)):
        m.set_obj(sx, sy, O, "stool_w", 0)

    m.place(O, "bench_metal", 8, 30)
    m.place(O, "bench_metal", 20, 30)
    m.set_obj(24, 31, O, "trash_out", 0)

    # D7 새벽 → 여명, D11 새벽에 둘이 앉는 자리.
    # 빈 의자가 채워졌다가 다시 비는 게 이 공간의 모티프다.
    m.trigger("two_chairs", 11, 14, w=4, h=3, kind="scene", label="그 자리",
              note="D1 비어 있음 → D7 처음 채워짐 → D11 다시 앉지만 곧 빌 걸 안다",
              seats="2")

    # ---- 볼라드 조명 — 심야에 얼굴이 겨우 보이는 유일한 광원
    for by in (7, 13, 19, 25, 31):
        m.place(O, "bollard", 10, by)
        m.place(O, "bollard", W - 11, by)

    # ---- ② 필로티 아래 통로 (숙소동 방향 끝) ---------------------------------
    #   y36  건물 밑면이 시작되는 그늘 경계
    #   y37~41  그늘진 통로 바닥 + 흰 원기둥 열
    #   y42  그늘이 끝나는 경계
    #   y43~45  건너편(숙소동 앞마당) — 통로 너머로 보이는 밝은 포장
    for x in range(W):
        m.set_ground(x, PILOTI_Y, O, "f_soffit_top")
        m.objects[m.i(x, PILOTI_Y)] = 0
        m.open(x, PILOTI_Y)
    for y in range(PILOTI_Y + 1, PILOTI_Y + 6):
        for x in range(W):
            m.set_ground(x, y, O, "f_pave_shade" if (x + y) % 3 else "f_pave_shade_b")
            m.objects[m.i(x, y)] = 0
            m.open(x, y)
    for x in range(W):
        m.set_ground(x, PILOTI_Y + 6, O, "f_soffit_bot")
        m.objects[m.i(x, PILOTI_Y + 6)] = 0
        m.open(x, PILOTI_Y + 6)
    for y in range(PILOTI_Y + 7, H):
        for x in range(W):
            m.set_ground(x, y, O, "f_pave" if (x + y) % 4 else "f_pave_b")
            m.objects[m.i(x, y)] = 0
            m.open(x, y)
    # 원기둥 열 — 사이가 다 뚫려 있어 건너편이 보인다
    for px in (1, 7, 13, 19, 25):
        m.place(O, "piloti_round", px, PILOTI_Y + 1)
    for bx in (4, 16, 28):
        m.place(O, "bollard", bx, PILOTI_Y + 8)
    m.trigger("piloti_passage", 4, PILOTI_Y + 2, w=24, h=4, kind="scene",
              label="필로티 아래 통로",
              note="교육동 → 숙소동. 건너간다 = 오늘은 잔다. 이 게임의 작별 인사")

    # ---- 연결 : 서쪽 교육동 후문(M3) / 남쪽 숙소동(M6)
    for y in range(20, 24):
        for x in range(0, 6):
            m.objects[m.i(x, y)] = 0
            m.set_ground(x, y, O, "f_pave")
            m.open(x, y)
    # **위는 숙소동, 아래는 교육동.** 가든이 둘 사이에 있습니다.
    for x in range(12, 16):
        m.portal("m6_nestcamp", x, 2, 17 + (x - 12), 4, name="to_nestcamp")
    for x in range(12, 16):
        m.portal("m3_basecamp_1f", x, H - 3, 18 + (x - 12), 4, name="to_basecamp_1f")
    m.trigger("garden_center", 13, 17, w=6, h=6, kind="scene",
              label="커넥트가든 중앙", note="감정 정점 씬 지점 · 여명 오버레이 전용 맵")
    m.trigger("spawn_default", 15, 24, kind="spawn")

    # ---- 배경 인물 — 커넥트가든
    # 스물넷이 하루 종일 교육장에만 앉아 있을 리가 없다. 말은 못 걸어도
    # 사람이 있어야 캠퍼스가 산 것처럼 보인다. dir 로 보는 쪽을 흩는다.
    m.npc("extra1", 10, 5, role="extra", label="무명", dir="down", note="데크 벤치")
    m.npc("extra2", 22, 8, role="extra", label="무명", dir="left", note="난간에 기대")
    m.npc("extra3", 17, 11, role="extra", label="무명", dir="up", note="하늘을 본다")
    m.npc("extra4", 7, 13, role="extra", label="무명", dir="right", note="통화 중")
    m.npc("extra5", 25, 17, role="extra", label="무명", dir="down", note="야외 테이블")
    m.npc("extra6", 15, 20, role="extra", label="무명", dir="left", note="야외 테이블")
    m.npc("extra7", 4, 24, role="extra", label="무명", dir="up", note="바람 쐬러 나왔다")
    m.npc("extra8", 24, 26, role="extra", label="무명", dir="down", note="혼자 앉아 있다")

    return m


# ================================================================== M6
def m6(TS_):
    """숙소동 — 1F 체력단련실·세탁실 / 3F 남 · 4F 여 복도 / 2인실 내부 / 3F↔4F 계단참.

    한 맵 안에 세 개 층을 세로로 이어 담는다. x17~20 이 전 층을 관통하는 계단 스파인이고,
    3F와 4F 사이 구간이 WORLD_BIBLE 4-2 의 **계단참**이다.
        y  2~ 5   1F 진입 복도            y 17~20  3F 남자 복도
        y  8~14   체력단련실 · 세탁실      y 23~30  3F 2인실 / 계단참(스파인)
        y 10~15   1F↔3F 계단(스파인)       y 33~36  4F 여자 복도
                                          y 39~44  4F 2인실
    """
    W, H = 40, 47
    m = TileMap("m6_nestcamp", W, H, TS_, lighting="night")
    D = "dorm"
    m.fill(D, "f_corridor", variants=["f_corridor", "f_corridor_b"])
    hwall(m, D, 0, W - 1, 0)
    vwall(m, D, 0, 2, H - 2); vwall(m, D, W - 1, 2, H - 2, right=True)
    band(m, D, "w_cap", 0, W - 1, H - 1)

    SPX0, SPX1 = 17, 20                              # 계단 스파인

    # ---- 커넥트가든 진입구 (북쪽)
    doorway_h(m, D, SPX0, SPX1, 0, "f_corridor")
    doorway_h(m, D, SPX0, SPX1, 1, "f_corridor")
    # 아래로 내려가면 커넥트가든입니다
    for x in range(17, 21):
        m.portal("m5_connect_garden", x, H - 3, 12 + (x - 17), 4, name="to_garden")

    # ---- 1F 체력단련실
    room(m, D, 2, 8, 14, 7, floor="f_gym")
    m.place(D, "door_open", 5, 6)
    m.place(D, "treadmill", 3, 8)
    m.place(D, "treadmill", 6, 8)
    m.place(D, "treadmill", 9, 8)
    m.place(D, "weights", 3, 13)
    m.place(D, "weights", 7, 13)
    m.place(D, "w_window", 13, 6)
    m.place(D, "w_window", 15, 6)
    m.trigger("gym", 4, 11, w=8, h=2, kind="room", room="gym_1f")

    # ---- 1F 세탁실
    room(m, D, 22, 8, 15, 7, floor="f_tile")
    m.place(D, "door_open", 30, 6)
    for wx in (22, 24, 26, 28):
        m.place(D, "washer", wx, 8)
    for wx in (31, 33, 35):
        m.place(D, "dryer", wx, 8)
    m.set_obj(23, 14, D, "shoe_rack", 0)
    m.place(D, "vending", 36, 12)
    m.trigger("laundry", 24, 12, w=10, h=2, kind="room", room="laundry_1f")

    # ---- 1F ↔ 3F 계단 (스파인)
    m.place(D, "stair_landing", SPX0, 9)
    m.place(D, "stair_landing", SPX0 + 2, 9)
    m.place(D, "stair_landing", SPX0, 11)
    m.place(D, "stair_landing", SPX0 + 2, 11)
    m.open(SPX0, 2, SPX1, 16)

    # ---- 3F 남자 복도
    for x in range(1, W - 1):
        for y in range(17, 21):
            m.set_ground(x, y, D, "f_corridor")
            m.open(x, y)
    hwall(m, D, 1, W - 2, 15)                       # 복도 북벽
    m.open(SPX0, 15, SPX1, 16)
    hwall(m, D, 1, W - 2, 21)                       # 복도 남벽 = 객실 문 열
    m.open(SPX0, 21, SPX1, 22)                      # 계단 스파인은 층 벽을 관통한다
    for dx in (3, 7, 11, 14, 24, 28, 32, 35):
        m.place(D, "w_room_door", dx, 21)
        m.trigger(f"room_3f_{dx}", dx, 20, kind="door", label=f"3{dx:02d}호")
    for lx in (2, 9, 26, 34):
        m.set_obj(lx, 20, D, "lamp_floor", 0)       # 발밑 조명 = 심야 점광원
    m.trigger("corridor_3f", 4, 18, w=12, h=2, kind="floor", floor="3F",
              label="3F 남자 복도")

    # ---- 3F 2인실 내부 (오른쪽 단면)
    for y in range(23, 30):
        for x in range(23, 37):
            m.set_ground(x, y, D, "f_room")
    band(m, D, "w_cap", 22, 37, 30)
    vwall(m, D, 22, 23, 30); vwall(m, D, 37, 23, 30, right=True)
    m.place(D, "bed", 23, 23)
    m.place(D, "bed", 23, 27)
    m.place(D, "desk_small", 29, 23)
    m.set_obj(30, 25, D, "chair_up", 0)
    m.place(D, "desk_small", 29, 27)
    m.set_obj(30, 29, D, "chair_up", 0)
    m.place(D, "wardrobe", 34, 23)
    m.place(D, "w_window", 33, 21)
    m.open(28, 21, 28, 22)                          # 328호(2인실) 문 통로
    m.trigger("dorm_room_3f", 26, 25, w=4, h=2, kind="room", room="twin_room_3f")
    # 왼쪽 객실군 — 문만 보이고 내부는 들어가지 않는 덩어리
    for y in range(23, 31):
        for x in list(range(1, 17)) + [21, 38]:   # x16·x21 을 막아 계단참을 스파인 폭에 맞춘다
            m.set_obj(x, y, D, "w_cap", 0)

    # ---- 3F ↔ 4F 계단참 (WORLD_BIBLE 4-2)
    for y in range(22, 33):
        for x in range(SPX0, SPX1 + 1):
            m.set_ground(x, y, D, "f_corridor_b")
            m.objects[m.i(x, y)] = 0
            m.open(x, y)
    m.place(D, "stair_landing", SPX0, 23)
    m.place(D, "stair_landing", SPX0 + 2, 23)
    m.place(D, "stair_landing", SPX0, 27)
    m.place(D, "stair_landing", SPX0 + 2, 27)
    m.set_obj(SPX0, 31, D, "lamp_floor", 0)
    m.trigger("stair_landing", SPX0, 25, w=4, h=4, kind="scene",
              label="3F↔4F 계단참", note="남자층과 여자층이 갈리는 지점")

    # ---- 4F 여자 복도
    for x in range(1, W - 1):
        for y in range(33, 37):
            m.set_ground(x, y, D, "f_corridor_b")
            m.open(x, y)
    hwall(m, D, 1, W - 2, 31)
    m.open(SPX0, 31, SPX1, 32)
    hwall(m, D, 1, W - 2, 37)
    m.open(SPX0, 37, SPX1, 38)
    for dx in (3, 7, 11, 14, 24, 28, 32, 35):
        m.place(D, "w_room_door", dx, 37)
        m.trigger(f"room_4f_{dx}", dx, 36, kind="door", label=f"4{dx:02d}호")
    for lx in (2, 9, 26, 34):
        m.set_obj(lx, 36, D, "lamp_floor", 0)
    m.trigger("corridor_4f", 4, 34, w=12, h=2, kind="floor", floor="4F",
              label="4F 여자 복도")

    # ---- 4F 2인실 내부
    for y in range(39, 45):
        for x in range(23, 37):
            m.set_ground(x, y, D, "f_room")
    band(m, D, "w_cap", 22, 37, 45)
    vwall(m, D, 22, 39, 45); vwall(m, D, 37, 39, 45, right=True)
    m.place(D, "bed", 23, 39)
    m.place(D, "bed", 23, 43)
    m.place(D, "desk_small", 29, 39)
    m.set_obj(30, 41, D, "chair_up", 0)
    m.place(D, "wardrobe", 34, 39)
    m.place(D, "w_window", 33, 37)
    m.open(28, 37, 28, 38)                          # 428호(2인실) 문 통로
    m.trigger("dorm_room_4f", 26, 41, w=4, h=2, kind="room", room="twin_room_4f")
    for y in range(39, 46):
        for x in list(range(1, 17)) + [21, 38]:   # x16·x21 을 막아 계단참을 스파인 폭에 맞춘다
            m.set_obj(x, y, D, "w_cap", 0)
    for y in range(38, 46):
        for x in range(SPX0, SPX1 + 1):
            m.set_ground(x, y, D, "f_corridor_b")
            m.objects[m.i(x, y)] = 0
            m.open(x, y)

    m.trigger("spawn_default", 18, 3, kind="spawn")

    # ---- 배경 인물 — 숙소동 · 세탁실 · 계단실 · 라운지
    # 스물넷이 하루 종일 교육장에만 앉아 있을 리가 없다. 말은 못 걸어도
    # 사람이 있어야 캠퍼스가 산 것처럼 보인다. dir 로 보는 쪽을 흩는다.
    m.npc("extra1", 17, 6, role="extra", label="무명", dir="down", note="세탁실 앞")
    m.npc("extra2", 3, 10, role="extra", label="무명", dir="right", note="세탁기를 돌리고 나온다")
    m.npc("extra3", 15, 11, role="extra", label="무명", dir="up", note="건조기를 기다린다")
    m.npc("extra4", 35, 13, role="extra", label="무명", dir="left", note="복도 끝 창가")
    m.npc("extra5", 12, 17, role="extra", label="무명", dir="down", note="방으로 돌아가는 길")
    m.npc("extra6", 20, 24, role="extra", label="무명", dir="right", note="계단실 앞")
    m.npc("extra7", 20, 27, role="extra", label="무명", dir="up", note="층계참에서 통화")
    m.npc("extra8", 16, 33, role="extra", label="무명", dir="down", note="라운지")
    m.npc("extra9", 33, 40, role="extra", label="무명", dir="left", note="자판기 앞")

    return m


# ================================================================== M7
def m7(TS_):
    """정문 · 버스정류장 · 주차장 · 로터리."""
    W, H = 40, 30
    m = TileMap("m7_gate", W, H, TS_, lighting="day,night")
    O = "out"
    m.fill(O, "f_asphalt", variants=["f_asphalt"])

    # 캠퍼스 쪽(위) 보도 + 잔디
    for y in range(0, 8):
        for x in range(W):
            m.set_ground(x, y, O, "f_pave" if (x + y) % 4 else "f_pave_b")
    for y in range(0, 4):
        for x in range(0, 16):
            m.set_ground(x, y, O, "f_grass" if (x + y) % 3 else "f_grass_b")
    for y in range(0, 4):
        for x in range(26, W):
            m.set_ground(x, y, O, "f_grass_b" if (x + y) % 3 else "f_grass")

    # 로터리 (가운데 원형 잔디섬)
    for y in range(12, 20):
        for x in range(15, 26):
            d = ((x - 20.5) / 5.5) ** 2 + ((y - 15.5) / 3.5) ** 2
            if d <= 1.0:
                m.set_ground(x, y, O, "f_grass")
    m.place(O, "tree_big", 19, 12)
    for x in range(15, 26):
        for y in (11, 20):
            pass

    # 정문 문주 + 사인
    m.place(O, "gate_pillar", 17, 5)
    m.place(O, "gate_pillar", 22, 5)
    m.place(O, "signpost", 26, 6)
    for x in range(19, 22):
        m.set_ground(x, 7, O, "f_pave")

    # 버스정류장
    m.place(O, "bus_stop", 4, 20)
    m.place(O, "bench_metal", 8, 24)
    m.set_obj(3, 25, O, "trash_out", 0)
    for x in range(2, 14):
        m.set_ground(x, 24, O, "f_pave"); m.set_ground(x, 25, O, "f_pave")
    m.trigger("bus_stop", 5, 24, w=3, h=1, kind="scene", label="버스정류장",
              note="D7 외출 · 귀소 버스 씬 진입점")

    # 주차장
    for y in range(22, 29):
        for x in range(24, W - 1):
            m.set_ground(x, y, O, "f_asphalt")
    for x in range(24, W - 1, 3):
        for y in range(22, 29):
            m.set_ground(x, y, O, "f_park_line_v")
    for x in (25, 28, 31, 34):
        m.place(O, "car", x, 23)
    m.trigger("parking", 26, 26, w=10, h=2, kind="area", label="주차장")

    # 가로수 · 볼라드
    for x in (2, 8, 30, 36):
        m.place(O, "tree_big", x, 8)
    for x in range(3, W, 6):
        m.place(O, "bollard", x, 18)
    for x in range(6, W, 8):
        m.set_obj(x, 9, O, "shrub", 0)

    # 캠퍼스(M3 로비)로 — 로비의 정문이 오른쪽 벽이라 이쪽은 왼쪽입니다
    for y in range(12, 16):
        m.portal("m3_basecamp_1f", 2, y, 40, 20 + (y - 12), name="to_basecamp_1f")
    m.trigger("front_gate", 2, 12, w=1, h=4, kind="door", label="정문")
    m.trigger("spawn_default", 20, 6, kind="spawn")

    # ---- 배경 인물 — 정문
    # 스물넷이 하루 종일 교육장에만 앉아 있을 리가 없다. 말은 못 걸어도
    # 사람이 있어야 캠퍼스가 산 것처럼 보인다. dir 로 보는 쪽을 흩는다.
    m.npc("extra1", 25, 6, role="extra", label="무명", dir="down", note="경비실 앞")
    m.npc("extra2", 10, 10, role="extra", label="무명", dir="right", note="버스를 기다린다")
    m.npc("extra3", 4, 19, role="extra", label="무명", dir="up", note="바람 쐬러 나왔다")
    m.npc("extra4", 24, 23, role="extra", label="무명", dir="left", note="택시를 부른다")

    return m


ALL = [m1, m2, m3, m4, m5, m6, m7]
