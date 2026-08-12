# -*- coding: utf-8 -*-
"""화풍 스위치 — 환경변수 `JL_STYLE` 하나로 갈린다.

    (없음) · hard   현행. 1px 하드 아웃라인 #2A2632 · 평면 채움 · 27~32색 스냅
    soft            외곽선을 물체 색에서 파생해 부분 알파로 두름
                    + 면에 2~3단 세로 계조 + 팔레트 확장
    none            바깥 외곽선을 아예 없앰. 실루엣 안쪽 그늘과
                    발밑 접지 그림자로만 형태를 잡음 (도트 인물에 가장 가까움)

근거는 docs/reference/TILESET_RESTYLE.md 2절 「맞출 것」 세 항목.

**기본값이 hard 라서 환경변수를 안 주면 현행과 한 픽셀도 다르지 않다.**
이 성질이 A/B 비교의 전제이므로 깨지 말 것 — hard 경로에 조건을 추가하지 말고,
새 화풍은 반드시 soft/none 쪽 분기로만 넣는다.

    JL_OUT=assets/temp/restyle/soft JL_STYLE=soft python -m tools.tilegen.build
"""
import os

STYLE = (os.environ.get("JL_STYLE") or "hard").strip().lower()
if STYLE not in ("hard", "soft", "none"):
    raise SystemExit("JL_STYLE 은 hard|soft|none 중 하나여야 합니다 (받은 값: %r)" % STYLE)

HARD = STYLE == "hard"

# ------------------------------------------------------------------ 외곽선
# soft: 이웃한 불투명 픽셀의 평균색을 어둡게 해서 두른다.
#       고정 잉크색 대신 물체 자기 색을 쓰므로 '선' 이 아니라 '접촉 그늘' 로 읽힌다.
OUTLINE_DERIVE = STYLE == "soft"
OUTLINE_DARKEN = 0.45     # 이웃 평균색을 검정 쪽으로 이만큼
OUTLINE_ALPHA  = 185      # 부분 알파 — 바닥이 비쳐야 선으로 안 보인다

# none: 바깥 팽창 자체를 생략하고 안쪽 그늘 + 접지 그림자로 대체
OUTLINE_DROP = STYLE == "none"
INNER_RIM    = 0.22 if STYLE == "none" else 0.0   # 실루엣 안쪽 1px 을 이만큼 어둡게
CONTACT      = STYLE == "none"                    # 발밑 2px 접지 그림자

# ------------------------------------------------------------------ 면 계조
# 단색 덩어리 하나를 위→아래 밝기 램프로 바꾼다. 팔레트 스냅을 거치면
# 연속 계조가 2~3단 밴딩으로 떨어지는데, 그게 노린 결과다.
SHADE     = not HARD
SHADE_TOP = {"soft": 0.11, "none": 0.15}.get(STYLE, 0.0)    # 덩어리 윗변
SHADE_BOT = {"soft": -0.13, "none": -0.18}.get(STYLE, 0.0)  # 덩어리 아랫변
SHADE_MIN_AREA = 16   # 이보다 작은 덩어리는 건드리지 않는다 (아이콘·글자 뭉개짐)
SHADE_MIN_H    = 5    # 높이가 이보다 낮으면 램프가 계단 한 칸이라 의미가 없다

# ------------------------------------------------------------------ 팔레트
# 원본 팔레트 각 색에 명암 단계를 파생해 붙인다. 색조는 사진에서 뽑은 그대로 두고
# 밝기 폭만 넓히는 것이라, 색이 늘어도 '다른 색' 이 생기지는 않는다.
# 30색 × (원본 + 4단) = 약 150색 → 문서 3절이 말한 96~160 구간.
PALETTE_STEPS = {"soft": (-0.18, -0.09, 0.09, 0.18),
                 "none": (-0.22, -0.11, 0.11, 0.22)}.get(STYLE, ())

# 알파 양자화 단계. 비어 있으면 현행대로 0/255 이진화.
# 반투명 외곽선과 접지 그림자를 살리려면 중간 단계가 있어야 한다.
ALPHA_LEVELS = () if HARD else (0, 60, 120, 185, 255)


def tag() -> str:
    """빌드 로그·NOTES 에 찍을 짧은 표식."""
    return STYLE
