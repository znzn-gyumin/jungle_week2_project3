"""야외 타일셋 — M5 커넥트가든 / M7 정문

근거 사진: connect_garden.jpg (우드데크·야외 테이블·석축 화단·필로티 기둥)
          basketball_court.jpg
브리프 2절 목록: 우드데크 · 낮은 석축 · 지지대 댄 어린 나무 · 야외 테이블/의자 ·
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
    def fn(c: Canvas):
        col = C("#5E8F4C") if green else C("#DEDCD5")
        cx = 24
        c.shadow(13, 41, 34, 45, (0, 0, 0, 55))
        c.rect(cx - 11, 24, cx + 10, 32, col)
        c.hline(24, cx - 11, cx + 10, mix(col, WHT, .35))
        if dir_ == "up":
            c.rect(cx - 10, 30, cx + 9, 44, shade(col, -.18))
        else:
            c.rect(cx - 10, 8, cx + 9, 26, col)
            c.rect(cx - 8, 10, cx + 7, 24, shade(col, -.12))
        for lx in (cx - 10, cx + 7):
            c.rect(lx, 32, lx + 1, 42, shade(col, -.30))
        c.outline(OL)
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
    """볼라드 조명 1x2 — 심야에 남는 발밑 광원(브리프 5절)."""
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
    b.add("planter_wall", 1, 2, planter_wall())
    b.add("planter_cap", 1, 1, planter_cap())
    b.add("tree_young", 2, 3, tree_young(), solid=[4, 5])
    b.add("tree_big", 3, 3, tree_big(), solid=[7])
    b.add("shrub", 1, 1, shrub())
    b.add("table_out", 2, 2, table_out(False))
    b.add("table_out_g", 2, 2, table_out(True))
    b.add("chair_out_up", 1, 1, chair_out("up", False))
    b.add("chair_out_down", 1, 1, chair_out("down", False))
    b.add("chair_out_g_up", 1, 1, chair_out("up", True))
    b.add("chair_out_g_down", 1, 1, chair_out("down", True))
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
