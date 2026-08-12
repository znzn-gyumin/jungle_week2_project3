"""야외 타일셋 — M5 커넥트가든 / M7 정문

근거 사진: connect_garden.webp (우드데크·야외 테이블·석축 화단·필로티 기둥)
          basketball_court.webp
구성: 우드데크 · 낮은 석축 · 지지대 댄 어린 나무 · 야외 테이블/의자 ·
               포장 보도 · 잔디 · 볼라드 조명 · 흰 필로티 기둥 · 버스정류장 · 주차선
"""
from .core import Canvas, TS, rnd, mix, shade, hexc
from . import palettes as P

C = lambda s: hexc(s)
OL, OLS, WHT = C(P.OUTLINE), C(P.OUTLINE_SOFT), C("#FFFFFF")
DK1, DK2, DK3, DK4 = C("#C9A87C"), C("#B4926A"), C("#9C7B56"), C("#806244")
ST1, ST2, ST3, ST4 = C("#BCB2A4"), C("#A69C8D"), C("#8C8375"), C("#6F6759")
CON1, CON2, ASP1, ASP2 = C("#CFCFCB"), C("#A8A8A6"), C("#6E6E70"), C("#4B4B4F")
GR1, GR2, GR3, GR4 = C("#87B05C"), C("#5E8F4C"), C("#457039"), C("#2F4E2A")
SKY1, SKY2, SKY3 = C("#BFD9E8"), C("#96BBD4"), C("#6E97B5")
BLD1, BLD2, BLD3 = C("#F2F1ED"), C("#DEDCD5"), C("#C2BFB6")
ORG, ORG2 = C("#E8763C"), C("#B8562A")
LAMP, LAMP2, NAV = C("#F2D9A0"), C("#FFF3C9"), C("#2A3A63")


# ---------------------------------------------------------------- 바닥
def f_deck(vertical=True, seed=1):
    """우드데크. 널 폭 12px(48의 약수)이라 반복해도 널이 어긋나지 않는다."""
    def fn(c: Canvas):
        c.fill(DK1)
        for i in range(TS):
            k = i % 12
            col = None
            if k == 0: col = DK4
            elif k == 1: col = DK3
            elif k == 11: col = DK2
            if col:
                if vertical: c.vline(i, 0, TS - 1, col)
                else: c.hline(i, 0, TS - 1, col)
        # 널 결
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.07: c.set(x, y, DK2)
                elif r < 0.10: c.set(x, y, mix(DK1, WHT, .10))
    return fn


def f_pave(seed=1):
    """포장 보도 — 24px 판석."""
    def fn(c: Canvas):
        c.fill(CON1)
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.09: c.set(x, y, CON2)
                elif r < 0.12: c.set(x, y, ST1)
        for k in (0, 24):
            c.hline(k, 0, TS - 1, ST2); c.vline(k, 0, TS - 1, ST2)
            c.hline(k + 1, 0, TS - 1, mix(CON1, WHT, .2))
            c.vline(k + 1, 0, TS - 1, mix(CON1, WHT, .2))
    return fn


def f_grass(seed=1):
    def fn(c: Canvas):
        c.fill(GR2)
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.16: c.set(x, y, GR1)
                elif r < 0.26: c.set(x, y, GR3)
                elif r < 0.29: c.set(x, y, GR4)
        for i in range(14):     # 풀포기
            x = int(rnd(seed, i, 1) * TS); y = int(rnd(seed, i, 2) * TS)
            c.set(x, y, GR1); c.set(x, y - 1, GR1)
    return fn


def f_asphalt(seed=1):
    def fn(c: Canvas):
        c.fill(ASP1)
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.14: c.set(x, y, ASP2)
                elif r < 0.20: c.set(x, y, shade(ASP1, .07))
    return fn


def f_park_line(vertical=True):
    """주차선 — 흰 선 하나. 세로로 이어 붙이면 주차구획이 된다."""
    def fn(c: Canvas):
        f_asphalt(2)(c)
        if vertical:
            c.rect(22, 0, 25, TS - 1, C("#DEDCD5"))
            c.vline(22, 0, TS - 1, mix(ASP1, WHT, .55))
        else:
            c.rect(0, 22, TS - 1, 25, C("#DEDCD5"))
    return fn


def f_deck_edge():
    """데크 ↔ 화단 경계 — 데크 널 끝 마구리."""
    def fn(c: Canvas):
        f_deck(True, 3)(c)
        c.rect(0, TS - 6, TS - 1, TS - 4, DK4)
        c.rect(0, TS - 3, TS - 1, TS - 1, shade(DK4, -.25))
    return fn


# ---------------------------------------------------------------- 석축 화단
def planter_wall():
    """낮은 석축 1x2 — connect_garden의 화단 옹벽. 위는 식재, 앞은 석재."""
    def fn(c: Canvas):
        H = TS * 2
        # 윗면 = 흙과 관목
        c.rect(0, 0, TS - 1, 26, C("#6F6759"))
        for y in range(0, 27):
            for x in range(TS):
                r = rnd(x, y, 41)
                if r < 0.30: c.set(x, y, GR3)
                elif r < 0.48: c.set(x, y, GR2)
                elif r < 0.54: c.set(x, y, GR1)
        # 갓돌 (화단 테두리)
        c.rect(0, 26, TS - 1, 28, ST1)
        c.hline(26, 0, TS - 1, mix(ST1, WHT, .35))
        c.rect(0, 29, TS - 1, 30, ST4)
        # 석재 앞면 — 20x10 블록을 어긋나게 쌓는다 (사진의 석축 옹벽)
        for row in range(6):
            y0 = 31 + row * 10
            if y0 > H - 8:
                break
            off = 10 if row % 2 else 0
            for bx in range(-1, 4):
                x0 = bx * 20 + off
                col = mix(ST1, ST3, rnd(bx, row, 5) * 0.85)
                c.rect(x0, y0, x0 + 18, min(y0 + 8, H - 8), col)
                c.hline(y0, x0, x0 + 18, mix(col, WHT, .30))
                for k in range(3):
                    c.set(x0 + 3 + k * 6, y0 + 3 + (k % 2) * 3, shade(col, -.14))
                c.hline(min(y0 + 8, H - 8), x0, x0 + 18, ST4)
                c.vline(x0 + 19, y0, min(y0 + 8, H - 8), ST4)
        c.rect(0, H - 7, TS - 1, H - 4, ST3)               # 밑동
        c.rect(0, H - 3, TS - 1, H - 1, shade(ST4, -.35))  # 접지 그림자
    return fn


def planter_cap():
    """석축 상단만 보이는 1타일 (화단 안쪽 채움)."""
    def fn(c: Canvas):
        c.rect(0, 0, TS - 1, TS - 1, C("#6F6759"))
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, 43)
                if r < 0.34: c.set(x, y, GR3)
                elif r < 0.52: c.set(x, y, GR2)
                elif r < 0.57: c.set(x, y, GR1)
                elif r < 0.60: c.set(x, y, GR4)
    return fn


# ---------------------------------------------------------------- 오브젝트
def tree_young():
    """지지대 댄 어린 나무 2x3 — connect_garden의 대각 목재 스테이크가 특징."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        cx = W // 2
        c.shadow(cx - 16, H - 12, cx + 15, H - 5, (0, 0, 0, 70))
        # 줄기
        c.rect(cx - 3, 40, cx + 2, H - 8, DK4)
        c.rect(cx - 3, 40, cx - 1, H - 8, mix(DK3, WHT, .12))
        for y in range(46, H - 10, 7):
            c.hline(y, cx - 3, cx + 2, shade(DK4, -.2))
        # 가지
        c.line(cx - 2, 52, cx - 14, 36, DK4)
        c.line(cx + 2, 58, cx + 15, 42, DK4)
        # 수관 — 가늘고 성긴 어린 나무
        for i in range(16):
            ax = cx + int((rnd(i, 1) - .5) * 60)
            ay = 12 + int(rnd(i, 2) * 40)
            r = 7 + int(rnd(i, 3) * 6)
            c.ellipse(ax, ay, r, r - 2, [GR1, GR2, GR3][i % 3])
        for i in range(10):
            ax = cx + int((rnd(i, 4) - .5) * 44)
            ay = 10 + int(rnd(i, 5) * 26)
            c.ellipse(ax, ay, 4, 3, mix(GR1, WHT, .16))
        # 대각 목재 지지대 2개
        c.line(cx - 20, H - 8, cx - 3, H - 34, DK3)
        c.line(cx - 19, H - 8, cx - 2, H - 34, DK4)
        c.line(cx + 20, H - 8, cx + 3, H - 34, DK3)
        c.line(cx + 19, H - 8, cx + 2, H - 34, DK4)
        c.rect(cx - 8, H - 36, cx + 7, H - 34, C("#8C8375"))   # 결속끈
        c.outline(OL)
    return fn


def tree_big():
    """다 자란 가로수 3x3 — 정문/주차장."""
    def fn(c: Canvas):
        W, H = TS * 3, TS * 3
        cx = W // 2
        c.shadow(cx - 22, H - 14, cx + 21, H - 5, (0, 0, 0, 75))
        c.rect(cx - 5, 60, cx + 4, H - 8, DK4)
        c.rect(cx - 5, 60, cx - 2, H - 8, mix(DK3, WHT, .12))
        for i in range(30):
            ax = cx + int((rnd(i, 11) - .5) * 108)
            ay = 14 + int(rnd(i, 12) * 62)
            r = 10 + int(rnd(i, 13) * 9)
            c.ellipse(ax, ay, r, r - 3, [GR2, GR3, GR4][i % 3])
        for i in range(18):
            ax = cx + int((rnd(i, 14) - .5) * 84)
            ay = 12 + int(rnd(i, 15) * 40)
            c.ellipse(ax, ay, 6, 4, [GR1, mix(GR1, WHT, .2)][i % 2])
        c.outline(OL)
    return fn


def shrub():
    def fn(c: Canvas):
        c.shadow(9, 40, 38, 45, (0, 0, 0, 60))
        for i in range(9):
            ax = 24 + int((rnd(i, 21) - .5) * 30)
            ay = 20 + int(rnd(i, 22) * 18)
            r = 7 + int(rnd(i, 23) * 4)
            c.ellipse(ax, ay, r, r - 2, [GR2, GR3][i % 2])
        for i in range(5):
            c.ellipse(24 + int((rnd(i, 24) - .5) * 22), 18 + int(rnd(i, 25) * 10), 4, 3, GR1)
        c.outline(OL)
    return fn


def table_out(green=False):
    """야외 테이블 2x2 — 사진의 녹색/회색 카페 테이블."""
    def fn(c: Canvas):
        W = TS * 2
        cx = W // 2
        top = C("#5E8F4C") if green else C("#DEDCD5")
        c.shadow(cx - 26, 62, cx + 25, 70, (0, 0, 0, 60))
        c.rect(cx - 3, 44, cx + 2, 66, C("#6E6E70"))
        c.ellipse(cx, 68, 13, 4, C("#4B4B4F"))
        c.rect(cx - 28, 30, cx + 27, 44, shade(top, -.22))
        c.rect(cx - 28, 26, cx + 27, 40, top)
        c.hline(26, cx - 28, cx + 27, mix(top, WHT, .40))
        c.outline(OL)
    return fn


def chair_out(dir_="up", green=False):
    """야외 의자 1타일. connect_garden 의 흰 와이어프레임 / 올리브그린 두 종.
    등받이가 가로 스트립인 게 사진의 특징이라 그걸 살린다."""
    def fn(c: Canvas):
        col = C("#5E8F4C") if green else C("#DEDCD5")
        cx = 24
        c.shadow(13, 41, 34, 45, (0, 0, 0, 55))
        if dir_ in ("up", "down"):
            c.rect(cx - 11, 24, cx + 10, 32, col)            # 좌판
            c.hline(24, cx - 11, cx + 10, mix(col, WHT, .40))
            if dir_ == "up":                                  # 등받이가 아래(뒤)
                c.rect(cx - 10, 30, cx + 9, 44, shade(col, -.18))
                for y in range(32, 44, 3):
                    c.hline(y, cx - 9, cx + 8, shade(col, -.32))
            else:                                             # 등받이가 위
                c.rect(cx - 10, 8, cx + 9, 26, col)
                c.rect(cx - 8, 10, cx + 7, 24, shade(col, -.12))
                for y in range(11, 24, 3):
                    c.hline(y, cx - 7, cx + 6, shade(col, -.28))
            for lx in (cx - 10, cx + 7):
                c.rect(lx, 32, lx + 1, 42, shade(col, -.30))
        else:
            sgn = 1 if dir_ == "right" else -1
            c.rect(cx - 10, 24, cx + 9, 33, col)
            c.hline(24, cx - 10, cx + 9, mix(col, WHT, .40))
            bx = cx + sgn * 9
            c.rect(min(bx, bx - sgn * 5), 10, max(bx, bx - sgn * 5), 30, shade(col, -.15))
            for y in range(12, 29, 3):
                c.hline(y, min(bx, bx - sgn * 4), max(bx, bx - sgn * 4), shade(col, -.30))
            for lx in (cx - 9, cx + 7):
                c.rect(lx, 33, lx + 1, 42, shade(col, -.30))
        c.outline(OL)
    return fn


def high_table():
    """초록 원형 받침 하이테이블 2x2 — 사진 한가운데 있는 그것.
    일반 테이블보다 상판이 높아 앞면(기둥)이 길다."""
    def fn(c: Canvas):
        W = TS * 2
        cx = W // 2
        top = C("#457039")
        c.shadow(cx - 16, 74, cx + 15, 84, (0, 0, 0, 70))
        c.ellipse(cx, 80, 15, 5, C("#2F4E2A"))               # 베이스
        c.ellipse(cx, 78, 15, 5, C("#457039"))
        c.rect(cx - 4, 40, cx + 3, 79, C("#2F4E2A"))         # 기둥 (길다 = 높다)
        c.rect(cx - 4, 40, cx - 2, 79, C("#457039"))
        c.ellipse(cx, 40, 24, 10, shade(top, -.30))          # 상판 옆면
        c.ellipse(cx, 34, 24, 10, top)                       # 상판 윗면
        c.ellipse(cx, 32, 18, 7, mix(top, WHT, .20))
        c.ellipse(cx - 7, 30, 7, 3, mix(top, WHT, .38))
        c.outline(OL)
    return fn


def stool(green=True):
    """하이테이블용 스툴 1타일 — 등받이 없음, 좌판이 높다."""
    def fn(c: Canvas):
        col = C("#457039") if green else C("#DEDCD5")
        cx = 24
        c.shadow(15, 41, 32, 45, (0, 0, 0, 55))
        c.ellipse(cx, 42, 10, 4, shade(col, -.35))           # 발 링
        c.rect(cx - 3, 24, cx + 2, 42, shade(col, -.22))     # 기둥
        c.ellipse(cx, 24, 12, 5, shade(col, -.18))
        c.ellipse(cx, 21, 12, 5, col)                        # 좌판
        c.ellipse(cx - 3, 19, 6, 2, mix(col, WHT, .35))
        c.outline(OL)
    return fn


def piloti_round():
    """흰 원기둥 2x3 — 건물이 이 위에 떠 있고 아래로 건너편이 뚫려 보인다."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        cx = W // 2
        c.shadow(cx - 22, H - 16, cx + 21, H - 4, (0, 0, 0, 85))
        # 기둥 몸통 — 원기둥이라 좌우가 곡면 셰이딩
        for x in range(cx - 17, cx + 17):
            t = (x - (cx - 17)) / 33.0
            if t < 0.18:   col = BLD3
            elif t < 0.32: col = BLD2
            elif t < 0.62: col = WHT
            elif t < 0.80: col = BLD2
            else:          col = BLD3
            c.vline(x, 6, H - 14, col)
        c.ellipse(cx, 6, 17, 6, BLD1)                        # 기둥 머리(주두)
        c.ellipse(cx, 4, 17, 6, WHT)
        c.ellipse(cx, H - 14, 17, 6, BLD3)                   # 주각
        c.ellipse(cx, H - 12, 20, 7, BLD2)
        c.ellipse(cx, H - 10, 20, 7, BLD3)
        c.outline(OL)
    return fn


def f_pave_shade(seed=1):
    """필로티 아래 그늘진 포장 — 건물 밑면이 덮고 있어 어둡다."""
    def fn(c: Canvas):
        c.fill(mix(CON1, C("#4B4B4F"), .42))
        base = mix(CON1, C("#4B4B4F"), .42)
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.09: c.set(x, y, shade(base, -.10))
                elif r < 0.13: c.set(x, y, shade(base, .07))
        for k in (0, 24):
            c.hline(k, 0, TS - 1, shade(base, -.16))
            c.vline(k, 0, TS - 1, shade(base, -.16))
    return fn


def f_soffit_edge(top=True):
    """건물 밑면(soffit)이 시작/끝나는 경계 — 그늘 경계선."""
    def fn(c: Canvas):
        base = mix(CON1, C("#4B4B4F"), .42)
        lite = C("#CFCFCB")
        if top:
            c.rect(0, 0, TS - 1, 13, lite)
            for y in range(14, 26):
                t = (y - 14) / 12
                c.hline(y, 0, TS - 1, mix(lite, base, t))
            c.rect(0, 26, TS - 1, TS - 1, base)
            c.hline(13, 0, TS - 1, C("#A8A8A6"))
        else:
            c.rect(0, 0, TS - 1, 21, base)
            for y in range(22, 34):
                t = (y - 22) / 12
                c.hline(y, 0, TS - 1, mix(base, lite, t))
            c.rect(0, 34, TS - 1, TS - 1, lite)
        for y in range(TS):
            for x in range(TS):
                if rnd(x, y, 91) < 0.05:
                    p = c.get(x, y)[:3]
                    c.set(x, y, shade(p, -.06))
    return fn


def bench_metal():
    """흰 금속 벤치 3x2 — 사진의 스트립 벤치."""
    def fn(c: Canvas):
        W = TS * 3
        col = C("#DEDCD5")
        c.shadow(8, TS + 22, W - 9, TS + 30, (0, 0, 0, 60))
        for i in range(6):                       # 등받이 스트립
            c.rect(8, 12 + i * 3, W - 9, 13 + i * 3, col if i % 2 == 0 else shade(col, -.15))
        for i in range(6):                       # 좌판 스트립
            c.rect(6, TS - 4 + i * 3, W - 7, TS - 3 + i * 3, col if i % 2 == 0 else shade(col, -.12))
        for lx in (10, W - 14):
            c.rect(lx, TS + 14, lx + 2, TS + 26, C("#A8A8A6"))
        c.outline(OL)
    return fn


def bollard():
    """볼라드 조명 1x2 — 심야에 남는 발밑 광원."""
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(17, H - 8, 30, H - 4, (0, 0, 0, 65))
        c.rect(19, 22, 28, H - 6, C("#4B4B4F"))
        c.rect(19, 22, 22, H - 6, C("#6E6E70"))
        c.rect(17, 14, 30, 24, C("#6E6E70"))
        c.rect(19, 17, 28, 22, LAMP)
        c.rect(20, 18, 27, 20, LAMP2)
        c.rect(16, 12, 31, 15, C("#4B4B4F"))
        c.rect(17, H - 6, 30, H - 4, C("#4B4B4F"))
        c.outline(OL)
    return fn


def piloti():
    """흰 필로티 기둥 2x3 — connect_garden 배경 건물의 특징."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        c.shadow(10, H - 12, W - 11, H - 5, (0, 0, 0, 80))
        c.rect(14, 0, W - 15, H - 10, BLD1)
        c.rect(14, 0, 22, H - 10, WHT)               # 수광면
        c.rect(W - 24, 0, W - 15, H - 10, BLD3)      # 음영면
        c.rect(W - 19, 0, W - 15, H - 10, mix(BLD3, OL, .18))
        for gx in (26, 34, 42, 50, 58):              # 세로 줄눈
            if gx < W - 24:
                c.vline(gx, 4, H - 14, BLD2)
        c.rect(12, 8, W - 13, 11, BLD2)              # 상부 띠
        c.rect(10, H - 16, W - 11, H - 8, BLD2)      # 주각
        c.hline(H - 16, 10, W - 11, WHT)
        c.rect(10, H - 12, W - 11, H - 8, BLD3)
        c.rect(10, H - 7, W - 11, H - 5, mix(BLD3, OL, .45))
        c.outline(OL)
    return fn


def bld_wall():
    """건물 외벽 1x3 — 흰 패널 + 커튼월 유리."""
    def fn(c: Canvas):
        H = TS * 3
        c.rect(0, 0, TS - 1, H - 1, BLD1)
        for y in range(H):
            for x in range(TS):
                if rnd(x, y, 61) < 0.03: c.set(x, y, BLD2)
        for band in range(3):                          # 층별 띠창
            y0 = 6 + band * 44
            c.rect(2, y0, TS - 3, y0 + 22, SKY2)
            c.rect(2, y0, TS - 3, y0 + 8, SKY1)
            c.line(6, y0 + 20, 22, y0 + 2, mix(SKY1, WHT, .5))
            c.line(28, y0 + 20, 42, y0 + 4, mix(SKY1, WHT, .3))
            c.frame(1, y0 - 1, TS - 2, y0 + 23, BLD3)
            c.vline(TS // 2, y0, y0 + 22, BLD2)
            c.rect(0, y0 + 24, TS - 1, y0 + 27, BLD2)
        c.rect(0, H - 5, TS - 1, H - 3, BLD3)
        c.rect(0, H - 2, TS - 1, H - 1, mix(BLD3, OL, .45))
        c.hline(H - 1, 0, TS - 1, OL)
    return fn


def bld_cantilever():
    """교육동 시그니처 — 주황 캔틸레버 난간 3x1. 커넥트가든에서 올려다보이는 요소."""
    def fn(c: Canvas):
        W = TS * 3
        c.rect(0, 6, W - 1, 30, ORG)
        c.rect(0, 6, W - 1, 10, mix(ORG, WHT, .30))
        for x in range(2, W - 2, 5):
            c.vline(x, 12, 28, ORG2)
        c.rect(0, 30, W - 1, 34, ORG2)
        c.rect(0, 0, W - 1, 5, BLD2)
        c.rect(0, 35, W - 1, 40, BLD3)
        c.outline(OL)
    return fn


def bus_stop():
    """버스정류장 셸터 3x3 — M7."""
    def fn(c: Canvas):
        W, H = TS * 3, TS * 3
        c.shadow(10, H - 12, W - 11, H - 5, (0, 0, 0, 70))
        c.rect(8, 6, W - 9, 22, BLD2)                 # 지붕
        c.rect(8, 6, W - 9, 11, BLD1)
        c.rect(8, 22, W - 9, 26, BLD3)
        c.rect(12, 26, W - 13, H - 24, SKY2)          # 뒷면 유리
        c.line(18, H - 28, 44, 30, mix(SKY1, WHT, .5))
        c.line(60, H - 28, 86, 30, mix(SKY1, WHT, .35))
        c.frame(12, 26, W - 13, H - 24, C("#A8A8A6"))
        c.rect(14, H - 24, W - 15, H - 14, C("#DEDCD5"))   # 벤치
        c.rect(14, H - 24, W - 15, H - 21, WHT)
        for lx in (12, W - 15):                        # 기둥
            c.rect(lx, 22, lx + 3, H - 8, C("#A8A8A6"))
        c.rect(W - 30, 28, W - 16, 52, WHT)            # 노선 안내판
        c.frame(W - 30, 28, W - 16, 52, ORG)
        for i in range(5): c.hline(32 + i * 4, W - 28, W - 18, C("#6E6E70"))
        c.outline(OL)
    return fn


def gate_pillar():
    """정문 문주 2x3."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        c.shadow(8, H - 12, W - 9, H - 5, (0, 0, 0, 75))
        c.rect(12, 4, W - 13, H - 10, BLD2)
        c.rect(12, 4, 20, H - 10, BLD1)
        c.rect(W - 22, 4, W - 13, H - 10, BLD3)
        c.rect(8, 0, W - 9, 8, BLD3)
        c.rect(16, 30, W - 17, 74, C("#F2F1ED"))      # 사인 패널
        c.frame(16, 30, W - 17, 74, ORG)
        for i in range(4): c.hline(38 + i * 9, 20, W - 21, C("#6E6E70"))
        c.rect(8, H - 14, W - 9, H - 8, BLD2)
        c.rect(8, H - 7, W - 9, H - 5, mix(BLD3, OL, .4))
        c.outline(OL)
    return fn


def car():
    """주차된 차 2x3 — 탑다운."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        body = [C("#DEDCD5"), C("#4B4B4F"), C("#2A3A63"), C("#B8562A")][0]
        c.shadow(10, H - 10, W - 11, H - 4, (0, 0, 0, 70))
        c.rrect(12, 8, W - 13, H - 10, 6, body)
        c.rrect(16, 20, W - 17, H - 30, 4, shade(body, -.35))    # 캐빈
        c.rrect(18, 22, W - 19, H - 44, 3, C("#6E97B5"))         # 앞유리
        c.rrect(18, H - 42, W - 19, H - 32, 3, C("#6E97B5"))     # 뒷유리
        c.rect(14, 12, W - 15, 15, mix(body, WHT, .35))
        c.rect(15, 10, 22, 13, LAMP2); c.rect(W - 23, 10, W - 16, 13, LAMP2)
        c.rect(15, H - 14, 22, H - 11, C("#B8562A"))
        c.rect(W - 23, H - 14, W - 16, H - 11, C("#B8562A"))
        for sy in (26, H - 34):
            c.rect(10, sy, 13, sy + 10, C("#2F2F36"))
            c.rect(W - 14, sy, W - 11, sy + 10, C("#2F2F36"))
        c.outline(OL)
    return fn


def signpost():
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(19, H - 7, 28, H - 4, (0, 0, 0, 60))
        c.rect(22, 20, 25, H - 6, C("#A8A8A6"))
        c.rect(8, 8, 39, 22, BLD1)
        c.frame(8, 8, 39, 22, C("#6E6E70"))
        c.rect(8, 8, 39, 11, ORG)
        for i in range(3): c.hline(14 + i * 3, 12, 35, C("#6E6E70"))
        c.outline(OL)
    return fn


def hoop():
    """농구 골대 2x3 — basketball_court."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 3
        c.shadow(24, H - 10, W - 25, H - 5, (0, 0, 0, 65))
        c.rect(20, 12, W - 21, 44, BLD1)
        c.frame(20, 12, W - 21, 44, C("#6E6E70"))
        c.frame(34, 26, W - 35, 42, ORG)
        c.rect(30, 44, W - 31, 47, ORG2)
        for i in range(5): c.line(32 + i * 6, 47, 34 + i * 5, 58, C("#DEDCD5"))
        c.rect(42, 44, 45, H - 6, C("#6E6E70"))
        c.rect(34, H - 10, W - 35, H - 5, C("#4B4B4F"))
        c.outline(OL)
    return fn


def trash_out():
    def fn(c: Canvas):
        c.shadow(14, 42, 33, 45, (0, 0, 0, 55))
        c.rect(15, 20, 32, 43, C("#6E6E70"))
        c.rect(15, 20, 19, 43, C("#A8A8A6"))
        c.rect(13, 16, 34, 21, C("#4B4B4F"))
        c.rect(19, 17, 28, 19, OL)
        c.outline(OL)
    return fn


def build():
    from .core import TilesetBuilder
    b = TilesetBuilder("tileset_outdoor", P.OUT, cols=12)
    G = "ground"
    b.add("f_deck_v", 1, 1, f_deck(True, 1), solid=[], layer=G)
    b.add("f_deck_v2", 1, 1, f_deck(True, 2), solid=[], layer=G)
    b.add("f_deck_h", 1, 1, f_deck(False, 3), solid=[], layer=G)
    b.add("f_deck_edge", 1, 1, f_deck_edge(), solid=[], layer=G)
    b.add("f_pave", 1, 1, f_pave(1), solid=[], layer=G)
    b.add("f_pave_b", 1, 1, f_pave(2), solid=[], layer=G)
    b.add("f_grass", 1, 1, f_grass(1), solid=[], layer=G)
    b.add("f_grass_b", 1, 1, f_grass(2), solid=[], layer=G)
    b.add("f_asphalt", 1, 1, f_asphalt(1), solid=[], layer=G)
    b.add("f_park_line_v", 1, 1, f_park_line(True), solid=[], layer=G)
    b.add("f_park_line_h", 1, 1, f_park_line(False), solid=[], layer=G)
    b.add("f_pave_shade", 1, 1, f_pave_shade(1), solid=[], layer=G)
    b.add("f_pave_shade_b", 1, 1, f_pave_shade(2), solid=[], layer=G)
    b.add("f_soffit_top", 1, 1, f_soffit_edge(True), solid=[], layer=G)
    b.add("f_soffit_bot", 1, 1, f_soffit_edge(False), solid=[], layer=G)
    b.add("planter_wall", 1, 2, planter_wall())
    b.add("planter_cap", 1, 1, planter_cap())
    b.add("tree_young", 2, 3, tree_young(), solid=[4, 5])
    b.add("tree_big", 3, 3, tree_big(), solid=[7])
    b.add("shrub", 1, 1, shrub())
    b.add("table_out", 2, 2, table_out(False))
    b.add("table_out_g", 2, 2, table_out(True))
    b.add("chair_out_up", 1, 1, chair_out("up", False))
    b.add("chair_out_down", 1, 1, chair_out("down", False))
    b.add("chair_out_left", 1, 1, chair_out("left", False))
    b.add("chair_out_right", 1, 1, chair_out("right", False))
    b.add("chair_out_g_up", 1, 1, chair_out("up", True))
    b.add("chair_out_g_down", 1, 1, chair_out("down", True))
    b.add("chair_out_g_left", 1, 1, chair_out("left", True))
    b.add("chair_out_g_right", 1, 1, chair_out("right", True))
    b.add("high_table", 2, 2, high_table())
    b.add("stool_g", 1, 1, stool(True))
    b.add("stool_w", 1, 1, stool(False))
    b.add("piloti_round", 2, 3, piloti_round(), solid=[2, 3, 4, 5])
    b.add("bench_metal", 3, 2, bench_metal())
    b.add("bollard", 1, 2, bollard(), light="bollard", light_sub=[0])
    b.add("piloti", 2, 3, piloti(), solid=[4, 5])
    b.add("bld_wall", 1, 3, bld_wall(), light="window")
    b.add("bld_cantilever", 3, 1, bld_cantilever())
    b.add("bus_stop", 3, 3, bus_stop(), solid=[6, 7, 8])
    b.add("gate_pillar", 2, 3, gate_pillar(), solid=[4, 5])
    b.add("car", 2, 3, car())
    b.add("signpost", 1, 2, signpost())
    b.add("hoop", 2, 3, hoop(), solid=[4, 5])
    b.add("trash_out", 1, 1, trash_out())
    return b.build()
