"""숙소동 실내 타일셋 — M6

근거 사진: dormitory_room.jpg
구성(브리프 2절): 복도 · 번호판 달린 방문 · 2인실 침대 · 작은 책상 ·
                세탁기 · 러닝머신과 웨이트 · 계단참
"""
from .core import Canvas, TS, rnd, mix, shade, hexc
from . import palettes as P

C = lambda s: hexc(s)
OL, OLS, WHT = C(P.OUTLINE), C(P.OUTLINE_SOFT), C("#FFFFFF")
COR1, COR2, COR3, COR4 = C("#C8A579"), C("#B08F63"), C("#96784F"), C("#7A6040")
RM1, RM2 = C("#DCC8A6"), C("#C6AF8B")
WAL1, WAL2, WAL3, WAL4 = C("#F2EDE4"), C("#E1DACD"), C("#CBC3B4"), C("#ADA495")
LIN1, LIN2 = C("#F6F4EF"), C("#DCD8CF")
NAV1, NAV2 = C("#3F5678"), C("#2A3A5B")
WD1, WD2 = C("#B99A6E"), C("#8E7147")
MET1, MET2, MET3, MET4 = C("#C6C9CE"), C("#9AA0A8"), C("#6E747E"), C("#4A4F58")
DR1, DR2, ORG = C("#D8CFC0"), C("#A9977E"), C("#E8763C")
RUB1, RUB2 = C("#4A4A52"), C("#2F2F36")
CYA, LAMP = C("#7FE3D6"), C("#F2D9A0")


# ---------------------------------------------------------------- 바닥
def f_corridor(seed=1):
    """복도 우드 비닐 — 세로 널. 널 폭 12px이 48의 약수라 이음매가 어긋나지 않는다."""
    def fn(c: Canvas):
        c.fill(COR1)
        for x in range(TS):
            k = x % 12
            if k == 0: c.vline(x, 0, TS - 1, COR3)
            elif k == 1: c.vline(x, 0, TS - 1, mix(COR1, COR2, .5))
            elif k == 11: c.vline(x, 0, TS - 1, COR2)
        for y in range(TS):
            for x in range(TS):
                if rnd(x, y, seed) < 0.05: c.set(x, y, COR2)
    return fn


def f_room(c: Canvas):
    c.fill(RM1)
    for x in range(TS):
        if x % 16 == 0: c.vline(x, 0, TS - 1, RM2)
    for y in range(TS):
        for x in range(TS):
            if rnd(x, y, 9) < 0.05: c.set(x, y, RM2)


def f_gym(c: Canvas):
    """체력단련실 고무 매트."""
    c.fill(RUB1)
    for y in range(TS):
        for x in range(TS):
            r = rnd(x, y, 17)
            if r < 0.10: c.set(x, y, RUB2)
            elif r < 0.16: c.set(x, y, shade(RUB1, .08))
    # 타일 경계에 선을 그리지 않는다 — 이어 붙였을 때 격자무늬가 드러난다


def f_tile(c: Canvas):
    """세탁실 타일 바닥 — 24px 정사각, 48의 약수."""
    c.fill(WAL2)
    for y in range(TS):
        for x in range(TS):
            if rnd(x, y, 23) < 0.05: c.set(x, y, WAL3)
    for k in (0, 24):
        c.hline(k, 0, TS - 1, WAL4); c.vline(k, 0, TS - 1, WAL4)
        c.hline(k + 1, 0, TS - 1, mix(WAL2, WAL1, .5))


# ---------------------------------------------------------------- 벽
def _wn(c, x0, y0, x1, y1, base, seed):
    c.rect(x0, y0, x1, y1, base)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if rnd(x, y, seed) < 0.04: c.set(x, y, shade(base, -0.03))


def w_face(c: Canvas):
    _wn(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 11)
    c.rect(0, 0, TS - 1, 3, WAL3); c.hline(0, 0, TS - 1, OLS)
    for y in range(4, 13):
        c.hline(y, 0, TS - 1, mix(WAL1, WAL2, (13 - y) / 12))
    c.rect(0, TS * 2 - 7, TS - 1, TS * 2 - 4, WD1)      # 나무 걸레받이
    c.hline(TS * 2 - 8, 0, TS - 1, WD2)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))
    c.hline(TS * 2 - 1, 0, TS - 1, OL)


def w_cap(c: Canvas):
    _wn(c, 0, 0, TS - 1, TS - 1, WAL2, 13)
    c.hline(0, 0, TS - 1, OL); c.rect(0, 1, TS - 1, 3, WAL1)
    c.rect(0, TS - 5, TS - 1, TS - 2, WAL3); c.hline(TS - 1, 0, TS - 1, OL)


def w_side(left=True):
    def fn(c: Canvas):
        _wn(c, 0, 0, TS - 1, TS - 1, WAL2, 17)
        if left:
            c.vline(0, 0, TS - 1, OL); c.rect(1, 0, 4, TS - 1, WAL1)
            c.rect(TS - 5, 0, TS - 2, TS - 1, WAL3)
            c.vline(TS - 1, 0, TS - 1, mix(WAL4, OL, .3))
        else:
            c.vline(TS - 1, 0, TS - 1, OL); c.rect(TS - 5, 0, TS - 2, TS - 1, WAL1)
            c.rect(1, 0, 4, TS - 1, WAL3)
            c.vline(0, 0, TS - 1, mix(WAL4, OL, .3))
    return fn


def w_corner(kind):
    def fn(c: Canvas):
        _wn(c, 0, 0, TS - 1, TS - 1, WAL2, 19)
        c.rect(0, 1, TS - 1, 3, WAL1)
        if "n" in kind: c.hline(0, 0, TS - 1, OL)
        if "s" in kind: c.hline(TS - 1, 0, TS - 1, OL)
        if "w" in kind: c.vline(0, 0, TS - 1, OL)
        if "e" in kind: c.vline(TS - 1, 0, TS - 1, OL)
        c.rect(TS - 5, 0, TS - 2, TS - 1, WAL3)
    return fn


def w_room_door(c: Canvas):
    """번호판 달린 객실 문 1x2 — 복도 벽에 반복 배치."""
    _wn(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 37)
    c.rect(0, 0, TS - 1, 3, WAL3)
    fx0, fy0, fx1, fy1 = 5, 10, TS - 6, TS * 2 - 5
    c.rect(fx0, fy0, fx1, fy1, WAL3); c.frame(fx0, fy0, fx1, fy1, OL)
    c.rect(fx0 + 2, fy0 + 2, fx1 - 2, fy1, DR1)
    c.vline(fx0 + 2, fy0 + 2, fy1, mix(DR1, WHT, .35))
    c.rect(fx1 - 8, TS + 8, fx1 - 5, TS + 10, MET3)      # 손잡이
    c.rect(fx0 + 6, fy0 + 5, fx1 - 6, fy0 + 13, MET1)    # 번호판
    c.frame(fx0 + 6, fy0 + 5, fx1 - 6, fy0 + 13, MET3)
    c.rect(fx0 + 10, fy0 + 8, fx0 + 11, fy0 + 11, OL)
    c.rect(fx0 + 14, fy0 + 8, fx0 + 15, fy0 + 11, OL)
    c.rect(fx0 + 18, fy0 + 8, fx0 + 19, fy0 + 11, OL)
    c.rect(fx0 + 8, TS + 22, fx1 - 8, TS + 24, ORG)      # 하단 킥플레이트
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))


def w_door_open(c: Canvas):
    """열린 출입구 1x2 — 체력단련실/세탁실처럼 늘 열려 있는 방."""
    _wn(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 39)
    c.rect(0, 0, TS - 1, 3, WAL3)
    fx0, fy0, fx1, fy1 = 4, 8, TS - 5, TS * 2 - 4
    c.rect(fx0, fy0, fx1, fy1, WAL3); c.frame(fx0, fy0, fx1, fy1, OL)
    c.rect(fx0 + 2, fy0 + 2, fx1 - 2, fy1, mix(WAL4, OL, .5))   # 문틀 안 어둠
    c.rect(fx0 + 2, fy0 + 2, fx0 + 9, fy1, DR1)                 # 접힌 문짝
    c.vline(fx0 + 9, fy0 + 2, fy1, OL)
    for y in range(fy0 + 5, fy1, 4):
        c.hline(y, fx0 + 3, fx0 + 8, shade(DR1, -.06))
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))


def w_window(c: Canvas):
    _wn(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 23)
    c.rect(0, 0, TS - 1, 3, WAL3)
    gy0, gy1 = 14, TS * 2 - 22
    c.rect(4, gy0, TS - 5, gy1, C("#96BBD4"))
    c.rect(4, gy0, TS - 5, gy0 + 12, C("#BFD9E8"))
    for x in range(4, TS - 4):
        h = 6 + int(rnd(x, 5) * 6)
        c.vline(x, gy1 - h, gy1 - 1, C("#457039"))
    c.line(8, gy1 - 2, 22, gy0 + 2, mix(C("#BFD9E8"), WHT, .55))
    c.frame(3, gy0 - 1, TS - 4, gy1 + 1, MET2)
    c.rect(3, gy1 + 2, TS - 4, gy1 + 5, WAL3)            # 창틀 선반
    c.rect(0, TS * 2 - 7, TS - 1, TS * 2 - 4, WD1)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))


# ---------------------------------------------------------------- 가구
def bed(right=False):
    """싱글 침대 2x2 — 2인실에 두 개. dormitory_room 근거."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.shadow(6, H - 10, W - 7, H - 5, (0, 0, 0, 70))
        c.rect(5, 8, W - 6, H - 8, WD1)                  # 프레임
        c.rect(7, 4, W - 8, 14, WD2)                     # 헤드보드
        c.rect(9, 6, W - 10, 12, mix(WD1, WHT, .18))
        c.rect(7, 14, W - 8, H - 12, LIN2)               # 매트리스
        c.rect(7, 14, W - 8, H - 16, LIN1)
        c.rect(9, 16, W - 10, 34, LIN1)                  # 베개
        c.frame(9, 16, W - 10, 34, LIN2)
        c.rect(7, 38, W - 8, H - 12, NAV1)               # 이불
        c.rect(7, 38, W - 8, 41, NAV2)
        for y in range(44, H - 14, 6):
            c.hline(y, 9, W - 10, mix(NAV1, WHT, .08))
        c.rect(7, H - 12, W - 8, H - 9, WD2)
        for lx in (7, W - 11):
            c.rect(lx, H - 9, lx + 3, H - 5, WD2)
        c.outline(OL)
    return fn


def desk_small():
    """작은 책상 2x2 — 의자 포함하지 않음(의자는 별 타일)."""
    def fn(c: Canvas):
        W = TS * 2
        c.shadow(6, 62, W - 7, 68, (0, 0, 0, 65))
        c.rect(5, 28, W - 6, 44, WD1)                    # 상판
        c.hline(28, 5, W - 6, mix(WD1, WHT, .35))
        c.rect(5, 44, W - 6, 50, WD2)                    # 앞면
        c.rect(7, 12, W - 20, 28, WAL2)                  # 책 선반
        c.rect(9, 14, W - 22, 26, WAL3)
        x = 10
        while x < W - 24:
            bw = 3 + int(rnd(x, 3) * 3)
            c.rect(x, 26 - 8 - int(rnd(x, 4) * 3), x + bw, 25,
                   [ORG, NAV1, C("#457039"), WAL1][int(rnd(x, 5) * 4) % 4])
            x += bw + 2
        c.rect(W - 18, 14, W - 8, 27, MET3)              # 모니터
        c.rect(W - 16, 16, W - 10, 25, NAV2)
        c.line(W - 15, 24, W - 11, 17, mix(NAV2, CYA, .35))
        for lx in (7, W - 11):
            c.rect(lx, 50, lx + 3, 64, MET2)
        c.outline(OL)
    return fn


def wardrobe():
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.shadow(6, H - 8, W - 7, H - 4, (0, 0, 0, 70))
        c.rect(5, 6, W - 6, H - 6, WD1)
        c.rect(7, 8, W - 8, H - 8, WD2)
        for i in range(2):
            x0 = 9 + i * (W - 20) // 2 + i * 2
            c.rect(x0, 10, x0 + (W - 22) // 2, H - 10, mix(WD1, WHT, .10))
            c.rect(x0 + (W - 22) // 2 - 4, H // 2 - 6, x0 + (W - 22) // 2 - 3, H // 2 + 6, MET2)
        c.outline(OL)
    return fn


def chair_small(dir_="up"):
    def fn(c: Canvas):
        cx = 24
        c.shadow(13, 41, 34, 45, (0, 0, 0, 55))
        c.rect(cx - 11, 24, cx + 10, 33, WD1)
        c.hline(24, cx - 11, cx + 10, mix(WD1, WHT, .3))
        if dir_ == "up":
            c.rect(cx - 10, 30, cx + 9, 44, WD2)
        else:
            c.rect(cx - 10, 8, cx + 9, 26, WD2)
            c.rect(cx - 8, 10, cx + 7, 24, mix(WD1, WHT, .12))
        for lx in (cx - 10, cx + 7):
            c.rect(lx, 33, lx + 2, 42, WD2)
        c.outline(OL)
    return fn


def washer(dryer=False):
    """세탁기 / 건조기 1x2."""
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(6, H - 8, TS - 7, H - 4, (0, 0, 0, 70))
        c.rect(5, 10, TS - 6, H - 6, MET1)
        c.rect(5, 10, TS - 6, 13, WHT)
        c.rect(7, 14, TS - 8, 24, MET2)                  # 조작 패널
        for i in range(3):
            c.rect(10 + i * 8, 17, 13 + i * 8, 20, ORG if i == 1 else MET3)
        c.ellipse(24, H // 2 + 8, 15, 15, MET3)          # 도어
        c.ellipse(24, H // 2 + 8, 12, 12, C("#9AA0A8") if dryer else NAV2)
        c.ellipse(24, H // 2 + 8, 9, 9, mix(NAV2, CYA, .18) if not dryer else MET1)
        c.ellipse(20, H // 2 + 3, 4, 3, mix(WHT, MET1, .3))
        c.outline(OL)
    return fn


def treadmill():
    """러닝머신 2x2."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.shadow(8, H - 10, W - 9, H - 5, (0, 0, 0, 70))
        c.rect(10, 28, W - 11, H - 8, RUB1)              # 벨트
        for y in range(30, H - 10, 4): c.hline(y, 12, W - 13, RUB2)
        c.rect(8, 26, W - 9, 30, MET2)
        c.rect(8, H - 10, W - 9, H - 6, MET2)
        c.rect(12, 6, W - 13, 26, MET1)                  # 콘솔 기둥
        c.rect(14, 4, W - 15, 18, MET3)
        c.rect(17, 7, W - 18, 15, NAV2)                  # 화면
        c.line(19, 14, W - 22, 9, mix(NAV2, CYA, .35))
        c.rect(10, 18, 14, 22, MET2); c.rect(W - 15, 18, W - 11, 22, MET2)
        c.outline(OL)
    return fn


def weights():
    """덤벨 랙 2x1."""
    def fn(c: Canvas):
        W = TS * 2
        c.shadow(6, 40, W - 7, 45, (0, 0, 0, 65))
        c.rect(5, 24, W - 6, 42, MET3)
        c.rect(5, 24, W - 6, 27, MET2)
        for i in range(5):
            x = 11 + i * 14
            c.rect(x - 4, 16, x + 3, 19, MET4)
            c.ellipse(x - 4, 17, 4, 5, RUB1)
            c.ellipse(x + 3, 17, 4, 5, RUB1)
            c.set(x - 5, 16, mix(RUB1, WHT, .3))
        c.outline(OL)
    return fn


def stair_landing():
    """계단참 2x2 — 3F↔4F 사이. 브리프상 감정적으로 중요한 지점."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.rect(2, 2, W - 3, H - 3, WAL3)
        c.rect(6, 4, W - 7, H // 2 - 2, WAL2)            # 참(踊り場) 평면
        for y in range(4, H // 2 - 2, 6):
            c.hline(y, 6, W - 7, mix(WAL2, WAL3, .5))
        n = 5
        for i in range(n):                                # 계단 단
            y0 = H // 2 + i * (H // 2 - 6) // n
            y1 = H // 2 + (i + 1) * (H // 2 - 6) // n - 1
            base = mix(WAL1, MET2, i / (n - 1))
            c.rect(8, y0, W - 9, y1, base)
            c.hline(y1, 8, W - 9, OLS)
            c.hline(y0, 8, W - 9, mix(base, WHT, .4))
        c.rect(2, 2, 5, H - 3, MET1)
        c.rect(W - 6, 2, W - 3, H - 3, MET1)
        c.outline(OL)
    return fn


def shoe_rack():
    def fn(c: Canvas):
        c.shadow(6, 42, TS - 7, 45, (0, 0, 0, 60))
        c.rect(5, 22, TS - 6, 43, WD2)
        for r in range(2):
            sy = 25 + r * 9
            c.rect(7, sy, TS - 8, sy + 6, WD1)
            for k in range(2):
                c.rect(9 + k * 15, sy + 1, 20 + k * 15, sy + 5,
                       [WHT, NAV1, ORG, MET2][(r * 2 + k) % 4])
        c.outline(OL)
    return fn


def vending_dorm():
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(6, H - 8, TS - 7, H - 4, (0, 0, 0, 70))
        c.rect(5, 6, TS - 6, H - 6, MET3)
        c.rect(7, 8, TS - 8, H - 22, MET4)
        c.rect(9, 10, 29, H - 26, mix(NAV2, CYA, .22))
        for r in range(4):
            for k in range(3):
                c.rect(11 + k * 7, 13 + r * 15, 15 + k * 7, 22 + r * 15,
                       [ORG, C("#457039"), C("#96BBD4"), WAL1][(r + k) % 4])
        c.rect(32, 10, TS - 10, 38, MET2)
        for r in range(4): c.rect(34, 13 + r * 6, TS - 12, 15 + r * 6, ORG if r == 0 else MET1)
        c.rect(7, H - 20, TS - 8, H - 9, MET2)
        c.rect(10, H - 18, TS - 11, H - 12, OL)
        c.outline(OL)
    return fn


def lamp_floor():
    """복도 발밑 조명 — 심야에 남는 점광원(브리프 5절)."""
    def fn(c: Canvas):
        c.rect(20, 30, 27, 44, MET2)
        c.rect(18, 26, 29, 31, MET1)
        c.rect(20, 27, 27, 29, LAMP)
        c.outline(OL)
    return fn


def build():
    from .core import TilesetBuilder
    b = TilesetBuilder("tileset_dorm_indoor", P.DORM, cols=12)
    G = "ground"
    b.add("f_corridor", 1, 1, f_corridor(1), solid=[], layer=G)
    b.add("f_corridor_b", 1, 1, f_corridor(2), solid=[], layer=G)
    b.add("f_room", 1, 1, f_room, solid=[], layer=G)
    b.add("f_gym", 1, 1, f_gym, solid=[], layer=G)
    b.add("f_tile", 1, 1, f_tile, solid=[], layer=G)
    b.add("w_face", 1, 2, w_face)
    b.add("w_cap", 1, 1, w_cap)
    b.add("w_side_l", 1, 1, w_side(True))
    b.add("w_side_r", 1, 1, w_side(False))
    b.add("w_c_nw", 1, 1, w_corner("nw"))
    b.add("w_c_ne", 1, 1, w_corner("ne"))
    b.add("w_c_sw", 1, 1, w_corner("sw"))
    b.add("w_c_se", 1, 1, w_corner("se"))
    b.add("w_room_door", 1, 2, w_room_door)
    b.add("door_open", 1, 2, w_door_open, solid=[])   # 출입구 — 두 칸 모두 통행
    b.add("w_window", 1, 2, w_window, light="window", light_sub=[1])
    b.add("bed", 2, 2, bed())
    b.add("desk_small", 2, 2, desk_small())
    b.add("wardrobe", 2, 2, wardrobe())
    b.add("chair_up", 1, 1, chair_small("up"))
    b.add("chair_down", 1, 1, chair_small("down"))
    b.add("washer", 1, 2, washer(False))
    b.add("dryer", 1, 2, washer(True))
    b.add("treadmill", 2, 2, treadmill())
    b.add("weights", 2, 1, weights())
    b.add("stair_landing", 2, 2, stair_landing(), solid=[])
    b.add("shoe_rack", 1, 1, shoe_rack())
    b.add("vending", 1, 2, vending_dorm(), light="vending", light_sub=[0])
    b.add("lamp_floor", 1, 1, lamp_floor(), light="lamp")
    return b.build()
