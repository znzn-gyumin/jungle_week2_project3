"""교육동 실내 타일셋 — M1 4F / M2 2F / M3 1F / M4 B1

근거 사진: classroom_1·2 / opendesk / lobby / community_lounge_1·2 /
          coaching_room / jungle_stage / canteen / cafe

시점 규약(탑다운 오블리크)
  * 바닥은 완전 평면
  * 오브젝트는 윗면 + 앞면이 보인다. 앞면 높이 12~18px
    = 2~2.5등신 캐릭터(스프라이트 약 32px) 기준으로 책상이 허리쯤
  * 북쪽 벽만 정면(2타일), 동/서는 측면(1타일), 남쪽은 윗면 캡(1타일)
"""
from .core import Canvas, TS, rnd, mix, shade, hexc
from . import palettes as P

C = lambda s: hexc(s)
OL   = C(P.OUTLINE)
OLS  = C(P.OUTLINE_SOFT)
WHT  = C("#FFFFFF")

CAR1, CAR2, CAR3, CAR4 = C("#948A80"), C("#8A8076"), C("#7C7268"), C("#6B6259")
VIN1, VIN2, VIN3 = C("#CFC6B8"), C("#BEB3A3"), C("#A99D8D")
WAL1, WAL2, WAL3, WAL4 = C("#F4F2EE"), C("#E6E3DC"), C("#D3CFC6"), C("#B9B4A9")
GLS1, GLS2, GLS3, GLS4 = C("#EAF3F6"), C("#CFE2EA"), C("#AECBDA"), C("#8FB2C6")
MET1, MET2, MET3 = C("#C3C3C9"), C("#9B9BA4"), C("#75757F")
MSH1, MSH2, MSH3 = C("#6B6E78"), C("#565964"), C("#3E404A")
WD1, WD2, WD3 = C("#B4834F"), C("#8A6038"), C("#5E4127")
GRN1, GRN2, GRN3 = C("#6D9A5C"), C("#4E7745"), C("#35552F")
ORG, NAV, CYA = C("#E8763C"), C("#2A3A63"), C("#7FE3D6")


# ============================================================ 바닥 (seamless)
def f_carpet(seed):
    def fn(c: Canvas):
        c.fill(CAR2)
        # 루프파일 카펫 결 — 2px 간격 미세 점, 타일 로컬 좌표라 이음매가 생기지 않음
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.10:   c.set(x, y, CAR1)
                elif r < 0.18: c.set(x, y, CAR3)
                elif r < 0.205: c.set(x, y, CAR4)
    return fn


def f_carpet_worn(c: Canvas):
    f_carpet(7)(c)
    for y in range(TS):
        for x in range(TS):
            if rnd(x, y, 71) < 0.06:
                c.set(x, y, shade(CAR3, -0.06))


def f_vinyl(seed, base=VIN1):
    def fn(c: Canvas):
        c.fill(base)
        for y in range(TS):
            for x in range(TS):
                r = rnd(x, y, seed)
                if r < 0.05: c.set(x, y, VIN2)
                elif r < 0.07: c.set(x, y, VIN3)
    return fn


def f_vinyl_seam(c: Canvas):
    f_vinyl(21)(c)
    c.hline(0, 0, TS - 1, VIN3)   # 장판 이음선 — 세로로 반복 배치하면 줄무늬가 이어짐
    c.hline(1, 0, TS - 1, mix(VIN1, VIN2, .4))


def f_rug(c: Canvas):
    """라운지 러그 — community_lounge의 차분한 회베이지. 카펫보다 살짝 밝고 결이 굵다."""
    base = mix(CAR1, WAL3, .45)
    c.fill(base)
    for y in range(TS):
        for x in range(TS):
            r = rnd(x, y, 33)
            if r < 0.14: c.set(x, y, shade(base, .06))
            elif r < 0.24: c.set(x, y, shade(base, -.05))
    for y in range(0, TS, 8):
        c.hline(y, 0, TS - 1, shade(base, -0.09))
        c.hline(y + 1, 0, TS - 1, shade(base, .04))


def f_lightpool(c: Canvas):
    """매입 LED 패널 아래 바닥 광원 자국. classroom 천장 매입등 근거."""
    f_carpet(1)(c)
    for y in range(TS):
        for x in range(TS):
            d = (((x - 23.5) / 26.0) ** 2 + ((y - 23.5) / 26.0) ** 2) ** 0.5
            if d < 1.0:
                t = (1.0 - d) ** 1.6 * 0.34
                c.set(x, y, mix(c.get(x, y)[:3], (255, 249, 226), t))


def f_stage_step(c: Canvas):
    """정글스테이지 계단식 강당 단. 세로로 반복하면 계단이 이어진다."""
    c.fill(WD1)
    for y in range(TS):
        for x in range(TS):
            if rnd(x, y, 55) < 0.10: c.set(x, y, shade(WD1, .06))
    c.rect(0, 40, TS - 1, 44, WD2)
    c.hline(45, 0, TS - 1, WD3)
    c.rect(0, 46, TS - 1, 47, shade(WD2, -.12))


# ============================================================ 벽
def _wall_noise(c, x0, y0, x1, y1, base, seed):
    c.rect(x0, y0, x1, y1, base)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if rnd(x, y, seed) < 0.04:
                c.set(x, y, shade(base, -0.03))


def w_face(c: Canvas):
    """북쪽 벽 정면 1x2. 위 = 천장 몰딩 + 상부 벽, 아래 = 하부 벽 + 걸레받이."""
    _wall_noise(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 11)
    # 천장 몰딩
    c.rect(0, 0, TS - 1, 3, WAL3)
    c.hline(4, 0, TS - 1, WAL2)
    c.hline(0, 0, TS - 1, OLS)
    # 벽 상부 은은한 그림자
    for y in range(5, 14):
        c.hline(y, 0, TS - 1, mix(WAL1, WAL2, (14 - y) / 12))
    # 걸레받이 + 바닥 접지
    c.rect(0, TS * 2 - 7, TS - 1, TS * 2 - 4, WAL3)
    c.hline(TS * 2 - 8, 0, TS - 1, WAL4)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))
    c.hline(TS * 2 - 1, 0, TS - 1, OL)


def w_cap(c: Canvas):
    """남쪽 벽 = 위에서 본 벽 윗면 1타일."""
    c.rect(0, 0, TS - 1, TS - 1, WAL2)
    _wall_noise(c, 0, 0, TS - 1, TS - 1, WAL2, 13)
    c.hline(0, 0, TS - 1, OL)
    c.rect(0, 1, TS - 1, 3, WAL1)
    c.rect(0, TS - 5, TS - 1, TS - 2, WAL3)
    c.hline(TS - 1, 0, TS - 1, OL)


def w_side(left=True):
    """동/서 벽 측면 1타일. 방 안쪽으로 얇은 그림자."""
    def fn(c: Canvas):
        _wall_noise(c, 0, 0, TS - 1, TS - 1, WAL2, 17)
        if left:
            c.vline(0, 0, TS - 1, OL)
            c.rect(1, 0, 4, TS - 1, WAL1)
            c.rect(TS - 5, 0, TS - 2, TS - 1, WAL3)
            c.vline(TS - 1, 0, TS - 1, mix(WAL4, OL, .3))
        else:
            c.vline(TS - 1, 0, TS - 1, OL)
            c.rect(TS - 5, 0, TS - 2, TS - 1, WAL1)
            c.rect(1, 0, 4, TS - 1, WAL3)
            c.vline(0, 0, TS - 1, mix(WAL4, OL, .3))
    return fn


def w_corner(kind):
    def fn(c: Canvas):
        _wall_noise(c, 0, 0, TS - 1, TS - 1, WAL2, 19)
        c.rect(0, 1, TS - 1, 3, WAL1)
        if "n" in kind: c.hline(0, 0, TS - 1, OL)
        if "s" in kind: c.hline(TS - 1, 0, TS - 1, OL)
        if "w" in kind: c.vline(0, 0, TS - 1, OL)
        if "e" in kind: c.vline(TS - 1, 0, TS - 1, OL)
        c.rect(TS - 5, 0, TS - 2, TS - 1, WAL3)
    return fn


def w_window(c: Canvas):
    """통유리(floor-to-ceiling) 1x2. classroom_1 오른쪽 통창 근거."""
    _wall_noise(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 23)
    c.rect(0, 0, TS - 1, 3, WAL3); c.hline(0, 0, TS - 1, OLS)
    # 유리면
    gy0, gy1 = 6, TS * 2 - 10
    c.rect(2, gy0, TS - 3, gy1, GLS2)
    # 바깥 풍경 — 하늘/수목 (사진: 창밖 소나무)
    c.rect(2, gy0, TS - 3, gy0 + 26, GLS1)
    for x in range(2, TS - 2):
        h = 10 + int(rnd(x, 5) * 8)
        c.vline(x, gy1 - h, gy1 - 2, GRN2 if rnd(x, 6) < .6 else GRN1)
        c.set(x, gy1 - h, GRN3)
    c.rect(2, gy1 - 3, TS - 3, gy1, mix(GRN3, GLS3, .4))
    # 유리 반사 하이라이트
    for i in range(3):
        c.line(6 + i * 13, gy1 - 4, 18 + i * 13, gy0 + 2, mix(GLS1, WHT, .5))
    # 프레임
    c.frame(1, gy0 - 1, TS - 2, gy1 + 1, MET2)
    c.vline(TS // 2, gy0, gy1, MET1)
    c.rect(0, TS * 2 - 8, TS - 1, TS * 2 - 4, WAL3)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))
    c.hline(TS * 2 - 1, 0, TS - 1, OL)


def w_curtain(c: Canvas):
    """회색 커튼 1x2 — 창 옆에 접혀 있는 상태."""
    w_window(c)
    for x in range(2, TS - 2):
        t = (x - 2) % 7
        col = C("#9B9BA4") if t < 4 else C("#75757F")
        c.rect(x, 5, x, TS * 2 - 9, col)
        if t == 3: c.vline(x, 5, TS * 2 - 9, mix(MET1, WHT, .35))
    c.hline(5, 2, TS - 3, MET3)
    c.rect(0, TS * 2 - 8, TS - 1, TS * 2 - 4, WAL3)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))


def w_window_s(c: Canvas):
    """남쪽(플레이어 아래쪽) 통창 1타일.
    방 아래 가장자리 벽은 위에서 내려다본 '벽 윗면'이 보이므로 정면 유리가 아니라
    창틀 + 밝은 유리 띠 + 창밖 초록으로 표현한다. classroom_1의 통창 위치 근거."""
    c.rect(0, 0, TS - 1, TS - 1, WAL2)
    c.hline(0, 0, TS - 1, OL)
    c.rect(0, 1, TS - 1, 5, WAL1)                     # 창턱(실내측)
    c.rect(0, 6, TS - 1, 8, WAL3)
    c.rect(0, 9, TS - 1, 30, GLS2)                    # 유리
    c.rect(0, 9, TS - 1, 18, GLS1)
    for x in range(0, TS):
        h = 5 + int(rnd(x, 71) * 6)
        c.vline(x, 30 - h, 30, GRN2 if rnd(x, 72) < .6 else GRN1)
    for i in range(2):
        c.line(6 + i * 22, 29, 20 + i * 22, 10, mix(GLS1, WHT, .45))
    c.rect(0, 31, TS - 1, 33, MET2)                   # 하단 프레임
    c.vline(0, 9, 30, MET1); c.vline(TS - 1, 9, 30, MET1)
    c.rect(0, 34, TS - 1, TS - 2, WAL3)
    c.hline(TS - 1, 0, TS - 1, OL)


def w_curtain_s(c: Canvas):
    """남쪽 통창 + 회색 커튼(닫힘). classroom_1의 회색 커튼 근거."""
    w_window_s(c)
    for x in range(0, TS):
        t = x % 7
        col = MET2 if t < 4 else MET3
        c.rect(x, 9, x, 33, col)
        if t == 3: c.vline(x, 9, 33, mix(MET1, WHT, .30))
    c.rect(0, 6, TS - 1, 9, WAL4)


def w_glass(c: Canvas):
    """글라스 화이트보드 파티션 1x2 — coaching_room / 회의실."""
    _wall_noise(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 29)
    c.rect(0, 0, TS - 1, 3, WAL3)
    c.rect(2, 8, TS - 3, TS * 2 - 10, GLS1)
    for i in range(4):
        c.line(4 + i * 12, TS * 2 - 12, 14 + i * 12, 10, mix(GLS1, WHT, .6))
    c.frame(1, 7, TS - 2, TS * 2 - 9, MET1)
    c.rect(0, TS * 2 - 8, TS - 1, TS * 2 - 4, WAL3)
    c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))


def w_whiteboard(c: Canvas):
    """화이트보드 5x2 — M1 필수. 다가가 읽는 상호작용 지점(브리프 4절).
    classroom_1 사진 그대로 왼쪽 대형 유리 화이트보드 + 오른쪽 벽걸이 디스플레이."""
    W = TS * 5
    _wall_noise(c, 0, 0, W - 1, TS * 2 - 1, WAL1, 31)
    c.rect(0, 0, W - 1, 3, WAL3); c.hline(0, 0, W - 1, OLS)
    # 유리 화이트보드 (좌 3.5타일)
    bx0, by0, bx1, by1 = 6, 11, TS * 3 + 12, TS * 2 - 17
    c.rect(bx0, by0, bx1, by1, GLS1)
    c.rect(bx0, by0, bx1, by0 + 8, mix(GLS1, WHT, .55))
    c.frame(bx0 - 1, by0 - 1, bx1 + 1, by1 + 1, MET1)
    c.frame(bx0 - 2, by0 - 2, bx1 + 2, by1 + 2, MET3)
    c.frame(bx0 - 3, by0 - 3, bx1 + 3, by1 + 3, OL)
    for i in range(7):
        c.line(bx0 + 8 + i * 22, by1 - 3, bx0 + 24 + i * 22, by0 + 3, mix(GLS1, WHT, .5))
    # 챕터마다 쌓이는 낙서 — 플레이어 방명록이 이 위에 얹힌다
    c.line(14, 22, 46, 22, mix(NAV, GLS1, .30))
    c.line(14, 28, 62, 28, mix(NAV, GLS1, .45))
    c.line(14, 34, 38, 34, mix(ORG, GLS1, .32))
    c.line(14, 40, 54, 40, mix(NAV, GLS1, .22))
    c.line(14, 46, 30, 46, mix(NAV, GLS1, .35))
    c.ellipse(96, 32, 12, 10, mix(NAV, GLS1, .55))
    c.ellipse(96, 32, 8, 6, GLS1)
    c.line(120, 24, 150, 24, mix(NAV, GLS1, .38))
    c.line(120, 32, 142, 32, mix(ORG, GLS1, .28))
    c.line(120, 40, 154, 40, mix(NAV, GLS1, .30))
    # 마커 트레이
    c.rect(bx0 - 3, by1 + 4, bx1 + 3, by1 + 8, MET1)
    c.hline(by1 + 9, bx0 - 3, bx1 + 3, MET3)
    c.rect(28, by1 + 3, 36, by1 + 4, ORG)
    c.rect(42, by1 + 3, 50, by1 + 4, NAV)
    c.rect(56, by1 + 3, 64, by1 + 4, MSH2)
    # 벽걸이 디스플레이 (우 1.5타일)
    dx0, dy0, dx1, dy1 = TS * 3 + 24, 13, W - 8, TS * 2 - 26
    c.rect(dx0, dy0, dx1, dy1, MSH3)
    c.rect(dx0 + 3, dy0 + 3, dx1 - 3, dy1 - 3, NAV)
    c.line(dx0 + 6, dy1 - 6, dx1 - 12, dy0 + 6, mix(NAV, CYA, .32))
    c.line(dx0 + 6, dy1 - 16, dx1 - 24, dy0 + 6, mix(NAV, CYA, .18))
    c.frame(dx0 - 1, dy0 - 1, dx1 + 1, dy1 + 1, OL)
    c.rect((dx0 + dx1) // 2 - 4, dy1 + 1, (dx0 + dx1) // 2 + 3, dy1 + 8, MSH2)
    # 걸레받이
    c.rect(0, TS * 2 - 8, W - 1, TS * 2 - 4, WAL3)
    c.rect(0, TS * 2 - 3, W - 1, TS * 2 - 1, mix(WAL4, OL, .35))
    c.hline(TS * 2 - 1, 0, W - 1, OL)


def w_door(open_=False):
    """문 1x2. M1은 문이 둘이어야 한다(브리프 4절)."""
    def fn(c: Canvas):
        _wall_noise(c, 0, 0, TS - 1, TS * 2 - 1, WAL1, 37)
        c.rect(0, 0, TS - 1, 3, WAL3)
        fx0, fy0, fx1, fy1 = 4, 8, TS - 5, TS * 2 - 5
        c.rect(fx0, fy0, fx1, fy1, WAL3)
        c.frame(fx0, fy0, fx1, fy1, OL)
        if open_:
            # 열린 문 — 문틀 안이 어두운 복도, 문짝은 왼쪽으로 접힘
            c.rect(fx0 + 2, fy0 + 2, fx1 - 2, fy1, mix(WAL4, OL, .55))
            c.rect(fx0 + 2, fy0 + 2, fx0 + 9, fy1, WAL2)
            c.vline(fx0 + 9, fy0 + 2, fy1, OL)
            for y in range(fy0 + 4, fy1, 3):
                c.hline(y, fx0 + 3, fx0 + 8, shade(WAL2, -.05))
        else:
            c.rect(fx0 + 2, fy0 + 2, fx1 - 2, fy1, WAL1)
            c.frame(fx0 + 6, fy0 + 8, fx1 - 6, fy1 - 22, WAL3)
            c.frame(fx0 + 6, fy1 - 18, fx1 - 6, fy1 - 4, WAL3)
            c.rect(fx1 - 8, TS + 4, fx1 - 5, TS + 6, MET3)   # 레버 손잡이
            c.set(fx1 - 9, TS + 5, OL)
        # 유리 사이드라이트
        c.rect(1, fy0 + 4, 2, fy1 - 4, GLS2)
        c.rect(0, TS * 2 - 3, TS - 1, TS * 2 - 1, mix(WAL4, OL, .35))
        c.hline(TS * 2 - 1, 0, TS - 1, OL)
    return fn


# ============================================================ 가구
def _tabletop(c, x0, y0, x1, y1, top=WAL1, front_h=13, edge=WAL3, leg=MET2, legs=True):
    """오블리크 테이블 — 윗면 + 앞면 + 다리. 앞면 높이가 캐릭터 허리 기준."""
    c.rect(x0, y0, x1, y1, top)                       # 윗면
    c.hline(y0, x0, x1, mix(top, WHT, .5))            # 윗면 하이라이트
    c.rect(x0, y1 + 1, x1, y1 + front_h, edge)        # 앞면
    for y in range(y1 + 1, y1 + front_h + 1):
        t = (y - y1) / front_h
        c.hline(y, x0, x1, mix(edge, shade(edge, -.30), t))
    if legs:
        for lx in (x0 + 3, x1 - 5):
            c.rect(lx, y1 + front_h + 1, lx + 2, y1 + front_h + 9, leg)
            c.vline(lx, y1 + front_h + 1, y1 + front_h + 9, shade(leg, .2))


def desk_long(monitor=False):
    """긴 흰 폴딩 데스크 3x2. opendesk / classroom 근거.
    monitor=True면 가운데에 모니터 — 심야 오버레이의 청록 발광 위치가 여기."""
    def fn(c: Canvas):
        W = TS * 3
        c.shadow(6, TS + 26, W - 7, TS + 34, (0, 0, 0, 70))
        _tabletop(c, 4, TS - 12, W - 5, TS + 12, WAL1, 14, WAL3, MET2)
        # 상판 이음선 (긴 책상 = 여러 장 이어붙임)
        c.vline(TS, TS - 12, TS + 12, WAL2)
        c.vline(TS * 2, TS - 12, TS + 12, WAL2)
        c.hline(TS + 12, 4, W - 5, WAL4)                     # 상판 두께 아랫선
        c.rect(4, TS + 13, W - 5, TS + 14, MET1)             # 알루미늄 엣지 몰딩
        if monitor:
            mx = W // 2
            c.rect(mx - 3, TS - 30, mx + 2, TS - 14, MET2)       # 스탠드
            c.rect(mx - 9, TS - 15, mx + 8, TS - 12, MET3)       # 받침
            c.rect(mx - 20, TS - 52, mx + 19, TS - 28, MSH3)     # 베젤
            c.rect(mx - 18, TS - 50, mx + 17, TS - 31, NAV)      # 화면
            c.line(mx - 15, TS - 33, mx + 8, TS - 47, mix(NAV, CYA, .30))
            c.line(mx - 15, TS - 38, mx + 2, TS - 47, mix(NAV, CYA, .18))
            c.frame(mx - 20, TS - 52, mx + 19, TS - 28, OL)
            # 키보드
            c.rect(mx - 14, TS - 8, mx + 13, TS - 2, WAL2)
            c.hline(TS - 8, mx - 14, mx + 13, WAL1)
        c.outline(OL)
    return fn


def chair(dir_="down"):
    """회색 메시 오피스 체어 1타일. 캐스터 5발."""
    def fn(c: Canvas):
        cx = 24
        c.shadow(11, 40, 37, 45, (0, 0, 0, 60))
        # 베이스
        for a in (-1.0, -0.35, 0.35, 1.0, 0.0):
            ex = int(cx + a * 12); ey = 41 if abs(a) > .5 else 43
            c.rect(ex - 2, ey - 1, ex + 1, ey + 1, MET3)
        c.rect(cx - 2, 30, cx + 1, 41, MET2)          # 가스실린더
        if dir_ in ("down", "up"):
            c.rrect(cx - 13, 22, cx + 12, 33, 3, MSH1)     # 좌판
            c.rect(cx - 13, 31, cx + 12, 34, MSH2)
            if dir_ == "down":
                c.rrect(cx - 11, 4, cx + 10, 24, 4, MSH2)  # 등받이(뒤쪽)
                c.rrect(cx - 9, 6, cx + 8, 21, 3, MSH1)
                for y in range(7, 21, 3): c.hline(y, cx - 8, cx + 7, MSH2)
            else:
                c.rrect(cx - 11, 26, cx + 10, 45, 4, MSH2)
                c.rrect(cx - 9, 28, cx + 8, 43, 3, MSH1)
                for y in range(29, 43, 3): c.hline(y, cx - 8, cx + 7, MSH2)
                c.rrect(cx - 13, 14, cx + 12, 27, 3, MSH1)
        else:
            s = 1 if dir_ == "right" else -1
            c.rrect(cx - 12, 22, cx + 11, 33, 3, MSH1)
            bx = cx + s * 9
            c.rrect(bx - 4, 5, bx + 3, 26, 3, MSH2)
            c.rrect(bx - 2, 7, bx + 1, 24, 1, MSH1)
        c.outline(OL)
    return fn


def sofa():
    """라운지 소파 3x2. community_lounge 근거."""
    def fn(c: Canvas):
        W = TS * 3
        c.shadow(8, TS + 30, W - 9, TS + 38, (0, 0, 0, 70))
        c.rrect(6, 10, W - 7, TS + 8, 4, MSH2)                # 등받이
        c.rect(8, 13, W - 9, 20, mix(MSH1, WHT, .12))
        c.hline(11, 8, W - 9, mix(MSH1, WHT, .30))
        c.rrect(4, TS - 12, W - 5, TS + 20, 4, MSH3)          # 좌판 프레임
        for i in range(3):
            x0 = 8 + i * (W - 16) // 3
            x1 = x0 + (W - 16) // 3 - 4
            c.rrect(x0, TS - 10, x1, TS + 12, 3, MSH1)
            c.hline(TS - 10, x0 + 1, x1 - 1, mix(MSH1, WHT, .32))
            c.hline(TS - 9, x0 + 1, x1 - 1, mix(MSH1, WHT, .14))
            c.rect(x0, TS + 8, x1, TS + 12, MSH2)
            c.vline(x0, TS - 9, TS + 12, OLS); c.vline(x1, TS - 9, TS + 12, OLS)
        c.rect(4, TS + 18, W - 5, TS + 26, MSH3)              # 앞면
        c.hline(TS + 18, 4, W - 5, mix(MSH2, WHT, .10))
        for lx in (10, W - 14):                               # 다리
            c.rect(lx, TS + 26, lx + 3, TS + 32, WD2)
        c.outline(OL)
    return fn


def lounge_table():
    """라운드 로우 테이블 2x2."""
    def fn(c: Canvas):
        W = TS * 2
        c.shadow(14, 62, W - 15, 70, (0, 0, 0, 60))
        cx = W // 2
        c.rect(cx - 3, 46, cx + 2, 64, MET3)                  # 기둥
        c.ellipse(cx, 66, 13, 4, MET2)                        # 받침
        c.ellipse(cx, 44, 33, 15, WD3)                        # 상판 옆면
        c.ellipse(cx, 40, 33, 15, WD2)
        c.ellipse(cx, 38, 33, 15, WD1)                        # 상판 윗면
        c.ellipse(cx, 36, 27, 11, mix(WD1, WHT, .16))         # 하이라이트
        c.ellipse(cx - 9, 33, 9, 4, mix(WD1, WHT, .30))
        c.outline(OL)
    return fn


def vending():
    """자판기 1x2 — 심야에 남는 몇 안 되는 광원(브리프 5절)."""
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(6, H - 8, TS - 7, H - 3, (0, 0, 0, 70))
        c.rect(5, 6, TS - 6, H - 6, MSH2)
        c.rect(7, 8, TS - 8, H - 20, MSH3)
        c.rect(9, 10, 30, H - 24, mix(NAV, CYA, .25))     # 발광 쇼케이스
        for r in range(4):
            for k in range(3):
                c.rect(11 + k * 7, 13 + r * 15, 15 + k * 7, 22 + r * 15,
                       [ORG, GRN1, GLS3, WAL1][(r + k) % 4])
        c.rect(33, 10, TS - 10, 40, MSH1)                 # 버튼 패널
        for r in range(5):
            c.rect(35, 13 + r * 5, TS - 12, 15 + r * 5, ORG if r == 1 else MET1)
        c.rect(7, H - 18, TS - 8, H - 8, MSH1)            # 취출구
        c.rect(10, H - 16, TS - 11, H - 11, C("#2A2632"))
        c.outline(OL)
    return fn


def water_cooler():
    def fn(c: Canvas):
        c.shadow(13, 43, 34, 46, (0, 0, 0, 60))
        c.rect(14, 20, 33, 44, WAL2)
        c.rect(16, 26, 31, 34, MET1)
        c.rect(17, 4, 30, 21, GLS2)                       # 생수통
        c.rect(19, 6, 28, 19, mix(GLS3, WHT, .35))
        c.rect(21, 2, 26, 5, GLS4)
        c.rect(20, 35, 27, 40, MSH2)
        c.outline(OL)
    return fn


def plant(big=False):
    def fn(c: Canvas):
        H = TS * (2 if big else 1)
        base = H - 6
        c.shadow(13, base + 2, 34, base + 5, (0, 0, 0, 60))
        c.rect(15, base - 12, 32, base + 3, WD1)          # 화분
        c.rect(15, base - 12, 32, base - 9, WD2)
        c.rect(16, base - 8, 31, base - 6, WD3)
        top = 6 if big else 4
        for i in range(9 if big else 6):
            ax = 24 + int((rnd(i, 1) - .5) * 26)
            ay = top + int(rnd(i, 2) * (base - 18 - top))
            r = 6 + int(rnd(i, 3) * 5)
            c.ellipse(ax, ay, r, r - 2, [GRN1, GRN2, GRN3][i % 3])
        c.rect(23, top + 6, 25, base - 12, GRN3)
        c.outline(OL)
    return fn


def bookshelf():
    """책장 2x2 — lobby / jungle_step 책장 벽."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.shadow(6, H - 7, W - 7, H - 3, (0, 0, 0, 70))
        c.rect(5, 4, W - 6, H - 6, WD2)
        c.rect(7, 6, W - 8, H - 8, WD3)
        for r in range(4):
            sy = 8 + r * 20
            c.rect(8, sy, W - 9, sy + 15, mix(WD3, (0, 0, 0), .25))
            x = 9
            while x < W - 12:
                bw = 3 + int(rnd(r, x) * 4)
                bh = 10 + int(rnd(r, x, 2) * 5)
                col = [ORG, NAV, GRN2, WAL2, C("#B4834F"), MSH1][int(rnd(r, x, 3) * 6) % 6]
                c.rect(x, sy + 15 - bh, x + bw, sy + 14, col)
                c.hline(sy + 15 - bh, x, x + bw, mix(col, WHT, .3))
                x += bw + 2
            c.rect(8, sy + 15, W - 9, sy + 17, WD1)
        c.outline(OL)
    return fn


def pillar():
    """기둥 1x2 — M1 뒷줄 한쪽에 필수(브리프 4절). 시선이 안 닿는 자리를 만든다."""
    def fn(c: Canvas):
        H = TS * 2
        c.shadow(2, H - 9, TS - 3, H - 2, (0, 0, 0, 90))
        c.rect(5, 0, TS - 6, H - 6, WAL2)
        c.rect(5, 0, 14, H - 6, WAL1)                     # 좌측 수광면
        c.rect(TS - 15, 0, TS - 6, H - 6, WAL3)           # 우측 음영
        c.rect(TS - 9, 0, TS - 6, H - 6, WAL4)
        c.rect(3, 6, TS - 4, 10, WAL3)                    # 상단 띠
        c.rect(3, H - 14, TS - 4, H - 6, WAL3)            # 기둥 밑동
        c.hline(H - 14, 3, TS - 4, WAL4)
        c.rect(3, H - 5, TS - 4, H - 3, mix(WAL4, OL, .45))
        c.outline(OL)
    return fn


def stairs(down=False):
    """계단 2x2. 교육동은 4F↔2F 직결(3F 없음)."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.rect(2, 2, W - 3, H - 3, VIN2)
        n = 7
        for i in range(n):
            y0 = 4 + i * (H - 10) // n
            y1 = 4 + (i + 1) * (H - 10) // n - 1
            t = i / (n - 1)
            base = mix(VIN1, MET2, t if down else 1 - t)
            c.rect(6, y0, W - 7, y1, base)
            c.hline(y1 - 1, 6, W - 7, shade(base, -.22))     # 챌판 그늘
            c.hline(y1, 6, W - 7, OLS)                        # 단 코
            c.hline(y0, 6, W - 7, mix(base, WHT, .45))        # 디딤판 하이라이트
            c.set(6, y1, OL); c.set(W - 7, y1, OL)
        c.rect(2, 2, 5, H - 3, MET1)                       # 난간
        c.rect(W - 6, 2, W - 3, H - 3, MET1)
        c.rect(3, 2, 4, H - 3, MET2)
        c.rect(W - 5, 2, W - 4, H - 3, MET2)
        c.outline(OL)
    return fn


def cabinet():
    def fn(c: Canvas):
        W = TS * 2
        c.shadow(6, 40, W - 7, 45, (0, 0, 0, 65))
        c.rect(5, 12, W - 6, 42, WAL2)
        c.rect(5, 12, W - 6, 15, WAL1)
        for i in range(2):
            x0 = 8 + i * (W - 16) // 2
            c.rect(x0, 18, x0 + (W - 16) // 2 - 4, 38, WAL3)
            c.rect(x0 + 4, 26, x0 + 12, 28, MET2)
        c.outline(OL)
    return fn


def trash():
    def fn(c: Canvas):
        c.shadow(16, 42, 31, 45, (0, 0, 0, 55))
        c.rect(17, 24, 30, 43, MSH1)
        c.rect(17, 24, 30, 27, MSH2)
        c.rect(20, 22, 27, 25, MSH3)
        c.outline(OL)
    return fn


def podium():
    def fn(c: Canvas):
        c.shadow(11, 42, 36, 45, (0, 0, 0, 60))
        c.rect(12, 14, 35, 20, WAL1)
        c.rect(14, 20, 33, 43, WAL2)
        c.rect(14, 20, 33, 22, WAL3)
        c.outline(OL)
    return fn


def counter():
    """카페테리아 / 편의점 카운터 2x1."""
    def fn(c: Canvas):
        W = TS * 2
        c.shadow(4, 40, W - 5, 45, (0, 0, 0, 65))
        c.rect(3, 14, W - 4, 20, WD1)
        c.hline(14, 3, W - 4, mix(WD1, WHT, .4))
        c.rect(3, 20, W - 4, 42, WAL2)
        c.rect(3, 20, W - 4, 23, WAL3)
        for x in range(8, W - 8, 12):
            c.vline(x, 24, 40, WAL3)
        c.outline(OL)
    return fn


def shelf_store():
    """편의점 진열대 2x2."""
    def fn(c: Canvas):
        W, H = TS * 2, TS * 2
        c.shadow(6, H - 7, W - 7, H - 3, (0, 0, 0, 65))
        c.rect(5, 10, W - 6, H - 6, MET2)
        for r in range(3):
            sy = 14 + r * 24
            c.rect(7, sy, W - 8, sy + 18, MET1)
            x = 9
            while x < W - 11:
                bw = 4 + int(rnd(r, x, 9) * 3)
                col = [ORG, GRN1, GLS3, WAL1, NAV][int(rnd(r, x, 8) * 5) % 5]
                c.rect(x, sy + 3, x + bw, sy + 15, col)
                c.hline(sy + 3, x, x + bw, mix(col, WHT, .35))
                x += bw + 2
            c.rect(7, sy + 16, W - 8, sy + 18, MET3)
        c.outline(OL)
    return fn


def projector_screen():
    """정글스테이지 대형 스크린 3x2."""
    def fn(c: Canvas):
        W = TS * 3
        c.rect(6, 4, W - 7, TS + 20, MSH3)
        c.rect(9, 7, W - 10, TS + 17, NAV)
        c.line(14, TS + 12, W - 40, 12, mix(NAV, CYA, .30))
        c.line(14, TS, W - 60, 12, mix(NAV, CYA, .16))
        c.rect(6, TS + 20, W - 7, TS + 26, MSH2)
        c.outline(OL)
    return fn


def rug_edge():
    """라운지 러그 가장자리 — 바닥 위에 얹는 오브젝트(통행 가능)."""
    def fn(c: Canvas):
        c.rect(0, 0, TS - 1, TS - 1, WD1)
        for y in range(TS):
            for x in range(TS):
                if rnd(x, y, 44) < 0.12: c.set(x, y, shade(WD1, .07))
        c.hline(0, 0, TS - 1, WD2)
        c.hline(1, 0, TS - 1, mix(WD1, WD2, .4))
    return fn


# ============================================================ 조립
def build():
    from .core import TilesetBuilder
    b = TilesetBuilder("tileset_edu_indoor", P.EDU, cols=12)
    G = "ground"
    # 바닥 (통행 가능)
    b.add("f_carpet_a", 1, 1, f_carpet(1), solid=[], layer=G)
    b.add("f_carpet_b", 1, 1, f_carpet(2), solid=[], layer=G)
    b.add("f_carpet_c", 1, 1, f_carpet_worn, solid=[], layer=G)
    b.add("f_vinyl_a", 1, 1, f_vinyl(11), solid=[], layer=G)
    b.add("f_vinyl_seam", 1, 1, f_vinyl_seam, solid=[], layer=G)
    b.add("f_rug", 1, 1, f_rug, solid=[], layer=G)
    b.add("f_lightpool", 1, 1, f_lightpool, solid=[], layer=G, light="ceiling")
    b.add("f_stage_step", 1, 1, f_stage_step, solid=[], layer=G)
    b.add("f_vinyl_b", 1, 1, f_vinyl(12, mix(VIN1, VIN2, .45)), solid=[], layer=G)
    # 벽
    b.add("w_face", 1, 2, w_face)
    b.add("w_cap", 1, 1, w_cap)
    b.add("w_side_l", 1, 1, w_side(True))
    b.add("w_side_r", 1, 1, w_side(False))
    b.add("w_c_nw", 1, 1, w_corner("nw"))
    b.add("w_c_ne", 1, 1, w_corner("ne"))
    b.add("w_c_sw", 1, 1, w_corner("sw"))
    b.add("w_c_se", 1, 1, w_corner("se"))
    b.add("w_window", 1, 2, w_window, light="window", light_sub=[1])
    b.add("w_curtain", 1, 2, w_curtain)
    b.add("w_window_s", 1, 1, w_window_s, light="window")
    b.add("w_curtain_s", 1, 1, w_curtain_s)
    b.add("w_glass", 1, 2, w_glass)
    b.add("w_whiteboard", 5, 2, w_whiteboard)
    b.add("door_closed", 1, 2, w_door(False))
    b.add("door_open", 1, 2, w_door(True), solid=[])    # 출입구 — 두 칸 모두 통행
    # 가구
    b.add("desk_long", 3, 2, desk_long(False))
    b.add("desk_monitor", 3, 2, desk_long(True), light="monitor", light_sub=[1])
    b.add("chair_down", 1, 1, chair("down"))
    b.add("chair_up", 1, 1, chair("up"))
    b.add("chair_left", 1, 1, chair("left"))
    b.add("chair_right", 1, 1, chair("right"))
    b.add("sofa", 3, 2, sofa())
    b.add("lounge_table", 2, 2, lounge_table())
    b.add("vending", 1, 2, vending(), light="vending", light_sub=[0])
    b.add("water_cooler", 1, 1, water_cooler())
    b.add("plant", 1, 1, plant(False))
    b.add("plant_big", 1, 2, plant(True))
    b.add("bookshelf", 2, 2, bookshelf())
    b.add("pillar", 1, 2, pillar())
    b.add("stairs_up", 2, 2, stairs(False), solid=[])     # 계단은 통행
    b.add("stairs_down", 2, 2, stairs(True), solid=[])
    b.add("cabinet", 2, 1, cabinet())
    b.add("trash", 1, 1, trash())
    b.add("podium", 1, 1, podium())
    b.add("counter", 2, 1, counter())
    b.add("shelf_store", 2, 2, shelf_store())
    b.add("screen", 3, 2, projector_screen())
    b.add("rug_edge", 1, 1, rug_edge(), solid=[])
    return b.build()
