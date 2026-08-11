#!/usr/bin/env python3
"""ART_BRIEF.md -> 54개 생성 요청 프롬프트 팩.

ART_BRIEF 8절이 계산한 54요청(몸통 12 + 표정 시트 6 + 도트 시트 18 + 스틸 18)을
각각 '복사해서 바로 붙여넣는' 파일 한 개로 펼칩니다.

    python tools/gen_prompts.py

출력: docs/reference/character/prompts/
"""

from __future__ import annotations

import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "reference" / "character" / "prompts"


def block(s: str) -> str:
    """들여쓰기를 없애고 앞뒤 공백을 정리합니다."""
    return textwrap.dedent(s).strip()


# ─────────────────────────────────────────────────────────────
# 공통 조각 — ART_BRIEF 10절을 카테고리별로 분해한 것
#
# 10절은 스타일 접미사를 "모든 인물 프롬프트 뒤에 붙입니다"라고 했지만,
# 그 접미사에는 화풍(korean webtoon...)과 구도(bust crop, plain flat background,
# calm neutral expression)가 섞여 있습니다. 구도 쪽은 표정 시트/도트/스틸에
# 붙이면 각 항목의 요구와 정면으로 충돌합니다. 그래서 둘로 쪼갭니다.
# ─────────────────────────────────────────────────────────────

CORE_STYLE = block("""
    korean webtoon illustration style, semi-realistic anime, soft cel shading,
    clean lineart, warm muted palette
""")

BUST_FRAMING = block("""
    upper body bust crop from the chest up,
    facing viewer, head and shoulders fill the frame,
    relaxed neutral posture, arms lowered naturally, calm neutral expression,
    plain flat background
""")

NEG_BASE = block("""
    photorealistic, 3d render, extra fingers, deformed hands,
    watermark, signature, text, oversaturated, lens flare
""")

NEG_BODY = NEG_BASE + ",\n" + block("""
    cropped head, full body, legs, feet,
    multiple characters, busy background,
    dramatic pose, arms crossed, raised hands, hands near the face,
    strong emotion, laughing, crying, angry face
""")

NEG_NO_BADGE = "lanyard, id card, name tag, badge on chest"

# 표정 시트: 10절 부정에서 감정 차단 토큰을 뺐습니다.
# 이 시트가 만들어야 하는 게 바로 laughing / crying / angry face입니다.
NEG_FACE = NEG_BASE + ",\n" + block("""
    different people, inconsistent face, varying head size,
    body, shoulders, hands, arms,
    labels, borders between cells, grid lines, busy background
""")

# 도트: 화풍 토큰을 일절 넣지 않습니다. 웹툰 화풍을 붙이면 픽셀이 깨집니다.
NEG_SPRITE = block("""
    anti-aliasing, blurry, gradient shading, realistic proportions, tall body,
    different characters, inconsistent colors, text, labels, grid lines, drop shadow,
    photorealistic, 3d render, watermark, signature
""")

# 스틸 ①②(심야·여명): full body / legs / feet / busy background / strong emotion 을 뺐습니다.
# 스틸은 전신과 배경이 나오고, 감정이 이 컷의 목적입니다.
# 대신 4절 후처리 체크리스트("도시 불빛 없는가", "충분히 어두운가", "여명이 보라→파랑인가")를
# 부정 프롬프트로 옮겼습니다.
NEG_STILL = NEG_BASE + ",\n" + block("""
    city lights, street lamps, neon signs, distant town lights,
    bright daylight, overexposed, evenly lit, orange sunrise,
    multiple characters, crowd
""")

# 클라이맥스는 조원들이 함께 있는 장면이 있습니다(승희 "조가 자기를 빼놓고 결정",
# 민규 "아무도 눈치 못 챔"). multiple characters / crowd 를 빼야 합니다.
NEG_CLIMAX = NEG_BASE + ",\n" + block("""
    city lights, street lamps, neon signs, distant town lights,
    bright daylight, overexposed, evenly lit, orange sunrise
""")

# 스틸 ③(엔딩)은 낮·실내이고 5년 뒤입니다.
# NEG_STILL 의 어둠 관련 토큰(bright daylight, evenly lit, city lights ...)을
# 그대로 쓰면 "late afternoon light / spot lighting" 과 정면으로 충돌합니다.
NEG_ENDING = NEG_BASE + ",\n" + block("""
    lanyard, id card, name tag, badge on chest,
    student clothes, school hoodie, campus, classroom, dormitory,
    teenage look, night scene, darkness
""")


# ─────────────────────────────────────────────────────────────
# 히로인 6인
# casual/outing 프롬프트는 ART_BRIEF 11절 원문입니다.
# sprite_bottom 은 0절 '복장의 근거' 표에서 옮겼습니다.
# ─────────────────────────────────────────────────────────────

HEROINES = [
    dict(
        id="minah", kr="김민아", theme="#3A9B96",
        casual=block("""
            22 year old korean woman, long straight black hair tied high in a ponytail,
            sharp upturned cat-like eyes with clear pupils, slim face, thin lips,
            slender build, black zip-up hoodie over a white tee,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same woman, hair completely down for the first time, long straight black hair
            loose over the shoulders, black slip dress with a thin white shirt worn open over it,
            no lanyard, no id card
        """),
        outing_note="**핵심은 머리를 푼 것**입니다. 옷보다 그게 먼저 보여야 합니다.",
        face_extra="expression barely changes but the eyes carry everything",
        face_note="표정 근육은 거의 안 움직이고 **눈만** 움직입니다. 여섯 셀의 입 모양 차이를 최소로.",
        sprite_top="long straight black hair tied high in a ponytail, black zip-up hoodie over a white tee",
        sprite_bottom="black track pants, black running shoes worn with the heels crushed down",
        garden="sitting on the deck holding a convenience store rice triangle, "
               "eating slowly and silently, exhausted, hair coming loose",
        climax="about to collapse but refusing to admit it, insisting she is fine, "
               "monitor light on her face",
        ending_bg="office", ending_age=27,
        ending="same company different team, still arguing over code reviews, leaving work together",
    ),
    dict(
        id="seunghee", kr="이승희", theme="#B5806F",
        casual=block("""
            23 year old korean woman, long wavy brown hair, large round doe-like eyes,
            long eyelashes, slim neck and narrow shoulders, beige knit sweater with the
            sleeves pulled down over her hands,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same woman, light sky blue shirt dress, sleeves rolled up
            revealing her wrists and forearms, small crossbody bag strap across the shoulder,
            no lanyard, no id card
        """),
        outing_note="**소매를 걷어 손목이 보이는 것**이 이 장의 전부입니다. "
                    "평상복에서 손이 소매에 감춰져 있어야 대비가 삽니다.",
        face_extra="very subtle, smallest range of all",
        face_note="여섯 중 진폭이 **가장 작습니다.** 놀람 셀조차 크게 벌어지지 않습니다.",
        sprite_top="long wavy brown hair, beige knit sweater with sleeves over the hands",
        sprite_bottom="ivory long skirt down to the ankles, white canvas shoes with neatly tied laces",
        garden="holding out a sketchbook as if it was taken from her, embarrassed, "
               "pages showing only the backs of people",
        climax="left out of the group decision, still unable to speak, standing slightly apart",
        ending_bg="gallery", ending_age=28,
        ending="now the one who reaches out first, standing by her own exhibited work",
    ),
    dict(
        id="yunjung", kr="장윤정", theme="#E0A230",
        casual=block("""
            21 year old korean woman, brown hair tied high, big round downturned puppy-like eyes,
            round cheeks, oversized bright yellow hoodie much too large for her,
            headphones resting around her neck,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same woman, cream sleeveless top, shoulders and arms now bare after the oversized
            hoodie is gone, hair clip, several bracelets on one wrist,
            headphones still resting around her neck, no lanyard, no id card
        """),
        outing_note="**헤드폰은 양쪽 다 유지**합니다. 이 인물의 모티프라 사라지면 안 됩니다.",
        face_extra="neutral cell should be unsmiling",
        face_note="기본 셀이 밝으면 **작업 모드와의 낙차가 죽습니다.** 기본은 웃지 않습니다.",
        sprite_top="brown hair tied high, oversized bright yellow hoodie, headphones around the neck",
        sprite_bottom="black short pants almost hidden under the hoodie, "
                      "white high-top sneakers with yellow laces, ankle socks",
        garden="holding out one side of her headphones toward the viewer, suddenly quiet, "
               "no trace of her usual cheerfulness",
        climax="just told that a second-year would not understand, frozen mid-sentence",
        ending_bg="gallery", ending_age=26,
        ending="her graduation project became a released game, showing it",
    ),
    dict(
        id="mingyu", kr="김민규", theme="#4E6288",
        casual=block("""
            22 year old korean man, long front bangs covering half of his face,
            narrow sharp eyes, angular jaw, very thin build, faint dark circles,
            black hoodie with the hood down,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same man, bangs swept back so both eyes are fully visible for the first time,
            black overshirt open over a white tee, a silver ring on one hand,
            no lanyard, no id card
        """),
        outing_note="**눈이 드러나는 것**이 핵심입니다. 평상복에서 앞머리가 확실히 얼굴을 가려야 합니다.",
        face_extra="avoids eye contact even when smiling",
        face_note="**시선을 안 주는 게 기본 표정**입니다. 웃는 셀에서도 눈이 화면 밖을 봅니다.",
        sprite_top="long front bangs covering half of his face, black hoodie with the hood down",
        sprite_bottom="black wide-leg pants with the hems dragging on the floor, "
                      "black high-top sneakers with the laces undone",
        garden="sitting still, staring at nothing, empty expression, "
               "iced americano melted to water beside him",
        climax="perfect work on the screen, completely hollow expression, nobody noticing",
        ending_bg="office", ending_age=27,
        ending="sleeping and eating properly now, healthier, calm",
    ),
    dict(
        id="seungmin", kr="이승민", theme="#5F8F42",
        casual=block("""
            24 year old korean man, tall with broad shoulders and a large frame,
            short cropped hair, big bright eyes,
            green varsity jacket over a white tee,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same man, no varsity jacket, linen shirt with the top button undone,
            wristwatch, a cap, no lanyard, no id card
        """),
        outing_note="**재킷을 벗은 것**이 핵심입니다. 바시티 재킷이 만들던 어깨 실루엣이 없어져야 합니다.",
        face_extra="big open smile showing gums in the happy cell",
        face_note="**웃을 때 잇몸이 보이는 게 이 캐릭터의 전부**입니다. 기쁨 셀에서 크고 시원하게.",
        sprite_top="short cropped hair, broad shoulders, green varsity jacket over a white tee",
        sprite_bottom="light blue straight denim jeans, white high-top basketball shoes in good condition",
        garden="just finished crying, trying to smile and failing, shoulders down",
        climax="collapsed at the desk, the cheerfulness finally dropped",
        ending_bg="office", ending_age=29,
        ending="first day at a new job, someone else looking after him this time",
    ),
    dict(
        id="yunho", kr="장윤호", theme="#C9A170",
        casual=block("""
            20 year old korean man, round gentle eyes, soft facial lines, mild youthful face,
            cream cardigan over a white tee with a small dog-shaped pin on the chest,
            black lanyard around neck with a small white ID card
        """),
        outing=block("""
            same man, navy striped short-sleeve shirt, canvas tote bag strap over the shoulder
            with the small dog pin moved onto it,
            carefully coordinated outfit that looks a little too planned,
            no lanyard, no id card
        """),
        outing_note="**전날 밤에 고른 티가 나야** 합니다. 너무 신경 쓴 게 보여서 오히려 귀여운 쪽.",
        face_extra="gentle, narrower range than yunjung",
        face_note="같은 강아지상인데 **윤정보다 덜 움직입니다.** 진폭을 좁게.",
        sprite_top="cream cardigan over a white tee with a small dog pin on the chest",
        sprite_bottom="beige chino pants with the hems folded once, "
                      "white canvas sneakers with neatly tied laces",
        garden="alone on the deck after seeing everyone off, looking down, unable to answer",
        climax="asked what he wants and unable to answer, looking away",
        ending_bg="office", ending_age=25,
        ending="presenting his own work under his own name, finally",
    ),
]


# ─────────────────────────────────────────────────────────────
# 참조 이미지가 없는 도트 12종
#
# given  = CHARACTERS.md / GAME_DESIGN.md / ART_BRIEF.md 가 실제로 못박은 것
# blank  = 문서 어디에도 없는 것 (= 새로 정하면 신규 설정)
# draft  = 이 스크립트가 제안하는 값. 확정 아님. 반드시 검토하세요.
# ─────────────────────────────────────────────────────────────

DOT_ONLY = [
    dict(
        id="doyun", kr="이도윤", who="남 22 · 컴퓨터공학 3학년 · 주인공",
        given="1인칭이라 얼굴이 화면에 안 나옴. 무난하게. 이름은 플레이어가 바꿉니다",
        blank="머리 길이·색, 눈, 체형, 키, 복장 전부, 테마 컬러",
        draft="short dark brown hair, plain grey zip-up hoodie over a white tee, "
              "dark navy pants, white sneakers",
    ),
    dict(
        id="doa", kr="이도아", who="여 22 · 컴퓨터공학 3학년 · 주인공 여자판",
        given="도윤과 동일 설정. 성별만 다름",
        blank="외형 전부 — 도윤과 별개로 정해진 것이 없습니다",
        draft="shoulder-length dark brown hair, plain grey zip-up hoodie over a white tee, "
              "dark navy pants, white sneakers",
    ),
    dict(
        id="jio", kr="한지오", who="남 22 · 컴퓨터공학 3학년 · 절친 겸 룸메이트 · 4조",
        given="말이 빠르고 많음. 밝고 가벼운 인상. 정보통. 플레이어와 같은 성별",
        blank="머리, 눈, 체형, 키, 복장, 색",
        draft="messy light brown hair, bright orange graphic tee under an open blue check shirt, "
              "beige shorts, colorful sneakers",
    ),
    dict(
        id="jia", kr="한지아", who="여 22 · 한지오 여자판",
        given="성별만 다르고 말투는 동일",
        blank="외형 전부 — 지오와 구분되는 지시가 없습니다",
        draft="light brown hair in a short ponytail, bright orange graphic tee under "
              "an open blue check shirt, beige shorts, colorful sneakers",
    ),
    dict(
        id="myeongjinhyeok", kr="명진혁", who="남 32 · 담당 코치 · 컴공 석사 후 스타트업 3년",
        given="무표정. 유일한 어른. 참가자들과 열 살 안팎 차이라 확실히 어른 쪽",
        blank="머리, 눈, 체형, 키, 복장, 안경 유무. 코치가 명찰을 거는지도 미지정",
        draft="short neat black hair, plain dark grey long-sleeve shirt, black slacks, "
              "dark leather shoes, no lanyard",
    ),
    dict(
        id="jomin", kr="조민", who="21 · 중성적 · 게임소프트웨어 2학년 · 경쟁 조(4조)",
        given="과묵하고 표현이 없음. 조용한 실력자. 3~5자 단답. 성별이 중성적으로 확정",
        blank="머리, 눈, 체형, 키, 복장, 색",
        draft="short straight black bob, androgynous silhouette, oversized plain black tee, "
              "dark grey wide pants, black sneakers",
    ),
    dict(
        id="taeyun", kr="강태윤", who="남 23 · 컴퓨터공학 4학년 · 경쟁 조(4조) 대표",
        given="사교성 좋고 실력도 준수. 악역이 아니라 한 발 빠른 사람. "
              "히로인에게 접근하지 않음 — 연적 구도 없음",
        blank="머리, 눈, 체형, 키, 복장, 색",
        draft="short tidy dark hair, clean white shirt with the sleeves rolled up, "
              "navy chino pants, brown loafers",
    ),
    dict(
        id="taeyeon", kr="강태연", who="여 23 · 강태윤 여자판",
        given="위와 동일 조건",
        blank="외형 전부",
        draft="dark hair in a low ponytail, clean white shirt with the sleeves rolled up, "
              "navy chino pants, brown loafers",
    ),
    dict(
        id="yeosanim", kr="여사님", who="여 50대 · B1 지하 카페테리아",
        given="**앞치마.** 학생들 이름을 다 외우고 있음. 사투리 약간, 반말. 코믹 릴리프",
        blank="머리 색·스타일, 체형, 앞치마 색, 안쪽 옷. **참가자가 아닌데 명찰을 거는지도 미지정** — 아래 초안은 안 거는 쪽으로 잡았습니다",
        draft="short permed greying hair, warm apron over a simple long-sleeve top, "
              "comfortable dark pants, flat shoes, no lanyard",
    ),
    dict(
        id="mob_a", kr="공용 A", who="무명 동기 17명용 공용 스프라이트",
        given="3종을 **색만 바꿔** 재활용해 스물네 자리를 채웁니다",
        blank="성별, 나이, 머리, 복장, 기본 색, 3종의 구분 기준 전부",
        draft="generic male student, short dark hair, plain solid-color tee, plain pants, "
              "sneakers, very simple flat shapes so the palette can be swapped",
    ),
    dict(
        id="mob_b", kr="공용 B", who="무명 동기 17명용 공용 스프라이트",
        given="〃",
        blank="〃",
        draft="generic female student, medium-length dark hair, plain solid-color tee, "
              "plain pants, sneakers, very simple flat shapes so the palette can be swapped",
    ),
    dict(
        id="mob_c", kr="공용 C", who="무명 동기 17명용 공용 스프라이트",
        given="〃",
        blank="〃",
        draft="generic student with a plain solid-color hoodie, short dark hair, plain pants, "
              "sneakers, very simple flat shapes so the palette can be swapped",
    ),
]


SPRITE_BASE = block("""
    pixel art character sprite sheet, 4 by 4 grid, same character in every cell,
    chibi proportions with a large head, about 2.5 heads tall, crisp 1px dark outline,
    limited palette of 10 colors, flat shading, no anti-aliasing,
    row 1 facing toward the viewer, row 2 facing left, row 3 facing right, row 4 facing away,
    column 1 standing still, columns 2 to 4 walk cycle frames,
    plain flat white background, no text, no labels, no grid lines
""")

FACE_BASE = block("""
    character expression sheet, same character repeated in a 3 by 2 grid,
    six head-and-neck portraits of the same person, identical face and hair in every cell,
    same head angle and same scale in every cell, only the expression differs,
    row 1 left to right: neutral calm / bright genuine smile / blushing with eyes averted,
    row 2 left to right: downcast sad / wide-eyed surprise / furrowed angry,
    korean webtoon illustration style, semi-realistic anime, soft cel shading,
    clean lineart, plain flat white background, no body, no hands, no text labels
""")

BG_GARDEN = block("""
    outdoor wooden deck terrace at dawn, low stone planter walls, white wire chairs
    and olive green chairs and tables, young slender trees, white curtain-wall buildings
    with orange perforated panels above, piloti columns with an open passage underneath,
    sky a soft gradient from deep violet at the top to pale blue at the horizon,
    ground and structures still in silhouette, no city lights anywhere, humid summer dawn air
""")

BG_CLIMAX = block("""
    long seminar room at 2am, almost all ceiling lights off, only two or three computer
    monitors glowing, glass whiteboards faintly catching light on the left wall,
    floor-to-ceiling windows completely black on the right, deep ink-blue darkness,
    very low key lighting, high contrast, most of the frame barely readable shadow
""")

BG_ENDING = {
    "office": "modern open-plan office interior, late afternoon light, calm",
    "gallery": "gallery exhibition space, white walls, spot lighting, quiet",
}
BG_ENDING_KR = {"office": "오피스", "gallery": "전시장"}


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def card(rows: list[tuple[str, str]]) -> str:
    out = ["| | |", "|---|---|"]
    out += [f"| **{k}** | {v} |" for k, v in rows]
    return "\n".join(out)


def prompt_file(title: str, meta: list[tuple[str, str]], positive: str,
                negative: str, notes: str, checks: list[str]) -> str:
    parts = [f"# {title}", "", card(meta), ""]
    if notes:
        parts += [notes, ""]
    parts += ["## 프롬프트", "", "```text", positive, "```", "",
              "## 부정 프롬프트", "", "```text", negative, "```", "",
              "## 받고 나서 확인할 것", ""]
    parts += [f"- [ ] {c}" for c in checks]
    return "\n".join(parts)


def main() -> int:
    made: list[str] = []

    # ── 01 몸통 12장 ────────────────────────────────────────
    for i, h in enumerate(HEROINES):
        n = i * 2 + 1
        write(OUT / "01_body" / f"B{n:02d}_{h['id']}_casual.md", prompt_file(
            f"B{n:02d} · {h['kr']} 평상복 몸통",
            [("파일명", f"`cg_{h['id']}_body_casual.png`"),
             ("캔버스", "1024 × 1280 세로(4:5) · 배경 제거 후 투명 PNG"),
             ("참조 이미지", f"`../../refs/ref_{h['id']}.png`"),
             ("선행 조건", "없음"),
             ("테마 컬러", f"`{h['theme']}` — UI 강조색입니다. **의상·머리색에 쓰지 마세요**")],
            h["casual"] + ",\n" + CORE_STYLE + ",\n" + BUST_FRAMING,
            NEG_BODY,
            "> **이게 이 인물의 기준점입니다.** 외출복·표정 시트·스틸이 전부 이 결과물을 참조로 물립니다.\n"
            "> 여러 번 뽑아 하나를 확정한 다음 넘어가세요.\n\n"
            "> 참조 이미지의 **포즈와 표정은 가져오지 마세요.** 원본이 중립이 아닙니다. "
            "가져올 것은 얼굴·머리·의상뿐입니다.",
            ["참조 인물과 얼굴이 같은 사람인가",
             "**가슴 위 반신**인가 (전신이 나오면 다시 — 얼굴이 작아집니다)",
             "자세가 중립인가 (팔짱·손을 든 포즈가 따라오지 않았는가)",
             "표정이 중립인가 (표정 6종을 얹어야 합니다)",
             "손가락이 깨지지 않았는가",
             "**명찰(검은 랜야드 + 흰 ID 카드)이 있는가**",
             "캔버스 1024 × 1280, 배경 제거, 투명 PNG"]))
        made.append(f"01_body/B{n:02d}_{h['id']}_casual.md")

        m = n + 1
        write(OUT / "01_body" / f"B{m:02d}_{h['id']}_outing.md", prompt_file(
            f"B{m:02d} · {h['kr']} D7 외출복 몸통",
            [("파일명", f"`cg_{h['id']}_body_outing.png`"),
             ("캔버스", "1024 × 1280 세로(4:5) · 배경 제거 후 투명 PNG"),
             ("참조 이미지", f"**B{n:02d}에서 확정한 평상복 결과물** (`ref_{h['id']}.png` 아님)"),
             ("선행 조건", f"B{n:02d} 확정"),
             ("명찰", "**없음** — 캠퍼스를 벗어나는 날입니다")],
            h["outing"] + ",\n" + CORE_STYLE + ",\n" + BUST_FRAMING,
            NEG_BODY + ",\n" + NEG_NO_BADGE,
            f"> {h['outing_note']}\n\n"
            "> **얼굴 위치·크기가 평상복과 픽셀 단위로 같아야 합니다.** "
            "표정 파츠 6장을 두 몸통에 공용으로 얹기 때문입니다. 어긋나면 표정을 12세트 그려야 합니다.",
            ["평상복과 **같은 사람**인가",
             "평상복과 **얼굴 위치·크기가 같은가** (겹쳐서 확인)",
             "**명찰이 없는가**",
             "가슴 위 반신 · 중립 자세 · 중립 표정인가",
             "손가락이 깨지지 않았는가",
             "캔버스 1024 × 1280, 배경 제거, 투명 PNG"]))
        made.append(f"01_body/B{m:02d}_{h['id']}_outing.md")

    # ── 02 표정 시트 6장 ────────────────────────────────────
    for i, h in enumerate(HEROINES, start=1):
        write(OUT / "02_face" / f"F{i:02d}_{h['id']}_face_sheet.md", prompt_file(
            f"F{i:02d} · {h['kr']} 표정 시트 (6컷)",
            [("시트", "1024 × 1024 정사각 · 3열 × 2행 = 6셀"),
             ("셀", "약 341 × 512 — 얼굴과 목까지만"),
             ("순서", "좌→우, 위→아래 — `normal` `happy` `shy` / `sad` `surprise` `angry`"),
             ("참조 이미지", f"**{h['kr']} 평상복 몸통 확정본**"),
             ("선행 조건", f"B{i*2-1:02d} 확정"),
             ("자르기", f"`python tools/cut_sheet.py sheet_{h['id']}_face.png "
                        f"out/{h['id']} --cols 3 --rows 2 --dekey ffffff --trim "
                        f"--names normal,happy,shy,sad,surprise,angry`")],
            FACE_BASE + ",\n" + h["face_extra"],
            NEG_FACE,
            f"> {h['face_note']}\n\n"
            "> **10절 부정 프롬프트에서 `strong emotion, laughing, crying, angry face`를 뺐습니다.** "
            "이 시트가 만들어야 하는 게 바로 그 표정이라 넣으면 시트가 망가집니다.\n\n"
            + ("> **김민아가 시금석입니다.** 잘라서 몸통에 얹어보고 눈이 떨리면 "
               "시트 방식을 버리고 몸통에서 얼굴만 인페인팅하는 쪽으로 돌아가세요 — "
               "그 경우 요청이 6번에서 36번으로 늘어납니다.\n"
               if h["id"] == "minah" else ""),
            ["6컷이 **같은 사람**인가",
             "6컷의 **머리 크기·각도가 같은가** — 다르면 정렬로 못 메웁니다",
             "몸통과 화풍·각도가 이어지는가",
             "셀 사이에 테두리·라벨·글자가 없는가",
             "배경이 단색 흰색인가",
             "잘라낸 6장이 같은 1024 × 1280 캔버스의 같은 위치에 있는가",
             "몸통에 얹었을 때 **눈이 안 떨리는가** (한 번은 실제로 얹어 확인)"]))
        made.append(f"02_face/F{i:02d}_{h['id']}_face_sheet.md")

    # ── 03 도트 시트 18장 ───────────────────────────────────
    cut_cmd = ("--cols 4 --rows 4 --resize 48x48 --dekey ffffff --names "
               "down_idle,down_w1,down_w2,down_w3,left_idle,left_w1,left_w2,left_w3,"
               "right_idle,right_w1,right_w2,right_w3,up_idle,up_w1,up_w2,up_w3")

    for i, h in enumerate(HEROINES, start=1):
        first = h["id"] == "minah"
        write(OUT / "03_sprite" / f"S{i:02d}_{h['id']}_sprite.md", prompt_file(
            f"S{i:02d} · {h['kr']} 도트 시트 (16컷)",
            [("파일명", f"`sprite_{h['id']}.png`"),
             ("시트", "1024 × 1024 정사각 · 4열 × 4행 = 16셀"),
             ("컷", "48 × 48px · 행 아래→왼쪽→오른쪽→위 · 열 정지·걷기1·2·3"),
             ("참조 이미지", f"`../../refs/ref_{h['id']}.png` + `../../pixel_demo.png`"),
             ("선행 조건", "없음" if first else "S01 확정 (화풍 기준)"),
             ("자르기", f"`python tools/cut_sheet.py sheet_{h['id']}_sprite.png "
                        f"out/{h['id']} {cut_cmd}`")],
            SPRITE_BASE + ",\n" + h["sprite_top"] + ",\n" + h["sprite_bottom"] + ",\n"
            + "a black lanyard with a small bright ID card on the chest",
            NEG_SPRITE,
            ("> **이 한 장이 프로젝트 전체의 화풍을 정합니다.** 나머지 17종과 타일셋이 여기서 파생됩니다. "
             "48px로 줄여 `pixel_demo.png`와 나란히 놓고 비교한 뒤 확정하세요.\n\n"
             if first else
             "> **S01(김민아)을 참조로 물리세요.** 화풍·등신·색 수가 거기에 맞아야 합니다.\n\n")
            + "> **하의와 신발이 보입니다.** CG 반신에서는 안 나오던 부분이라 여기서 처음 드러납니다.\n\n"
            + "> `pixel_demo.png`는 **화풍만** 가져옵니다 — 그 안의 인물을 쓰는 게 아닙니다.",
            ["**2~2.5등신**인가 (`pixel_demo.png`와 나란히 놓고 비교)",
             "16컷이 **같은 인물·같은 팔레트**인가",
             "행이 아래→왼쪽→오른쪽→위, 열이 정지·걷기1·2·3 순인가",
             "48px로 줄인 뒤 **외곽선이 뭉개지지 않았는가**",
             "걷기 3컷을 순환시켜 **다리가 자연스럽게 움직이는가**",
             "**명찰이 전 컷에 있는가** (가슴에 밝은 2×3px + 목에서 내려오는 1px 검은 줄)",
             "하의·신발이 설정대로인가"]))
        made.append(f"03_sprite/S{i:02d}_{h['id']}_sprite.md")

    for j, d in enumerate(DOT_ONLY, start=7):
        write(OUT / "03_sprite" / f"S{j:02d}_{d['id']}_sprite.md", prompt_file(
            f"S{j:02d} · {d['kr']} 도트 시트 (16컷)",
            [("파일명", f"`sprite_{d['id']}.png`"),
             ("인물", d["who"]),
             ("시트", "1024 × 1024 정사각 · 4열 × 4행 = 16셀"),
             ("참조 이미지", "**S01(김민아) 도트 시트 확정본** — 화풍 기준"),
             ("선행 조건", "S01 확정"),
             ("자르기", f"`python tools/cut_sheet.py sheet_{d['id']}_sprite.png "
                        f"out/{d['id']} {cut_cmd}`")],
            SPRITE_BASE + ",\n" + d["draft"]
            + ("" if "no lanyard" in d["draft"]
               else ",\na black lanyard with a small bright ID card on the chest"),
            NEG_SPRITE,
            "> ## ⚠️ 이 인물의 외형은 **문서에 없습니다**\n"
            ">\n"
            "> **정본이 못박은 것** "
            "(`CHARACTERS.md` · `GAME_DESIGN.md` · `ART_BRIEF.md` 5절 종합) — "
            f"{d['given']}\n"
            ">\n"
            f"> **비어 있는 것** — {d['blank']}\n"
            ">\n"
            "> 위 프롬프트의 의상·머리는 **이 팩이 지어낸 초안이고 확정이 아닙니다.** "
            "그대로 뽑으면 `CHARACTERS.md`에 없는 신규 설정이 생깁니다. "
            "**뽑기 전에 값을 정하고 `CHARACTERS.md`에 먼저 반영하세요.**\n\n"
            + ("> 조연 5종(명진혁·조민·강태윤·강태연·여사님)은 절감 옵션이 있습니다 — "
               "걷기를 빼고 **정지 1프레임 × 4방향 = 4컷**으로 낮추면 288컷이 228컷이 됩니다.\n"
               if d["id"] in {"myeongjinhyeok", "jomin", "taeyun", "taeyeon", "yeosanim"} else "")
            + ("> 공용 3종은 **색만 바꿔** 무명 17명을 채웁니다. "
               "색 교체가 쉽도록 면을 단순하게, 색 경계를 뚜렷하게 유지하세요.\n"
               if d["id"].startswith("mob") else ""),
            ["**의상·머리를 문서에 반영한 뒤에 뽑았는가**",
             "S01과 **같은 화풍·같은 등신·같은 색 수**인가",
             "16컷이 같은 인물·같은 팔레트인가",
             "행·열 순서가 맞는가",
             "48px로 줄인 뒤 외곽선이 뭉개지지 않았는가",
             "명찰 유무가 설정과 맞는가 (코치·여사님은 참가자가 아닙니다)"]))
        made.append(f"03_sprite/S{j:02d}_{d['id']}_sprite.md")

    # ── 04 스틸 18장 ────────────────────────────────────────
    scenes = [
        ("garden", "① D7 새벽 커넥트가든 → 여명", BG_GARDEN,
         "심야(먹빛 남색) → **여명(보라→파랑)**",
         "`connect_garden.jpg`",
         "> **루트 최대 명장면**이고 게임에서 **유일하게 해가 뜨는 씬**입니다. "
         "빈 의자가 처음으로 채워지는 그림입니다.\n\n"
         "> 광원은 **발밑 조명과 건물 창 불빛뿐**입니다. 그 외에는 두지 마세요.\n\n"
         "> **복장은 평상복 + 명찰이 맞습니다.** D7 외출복은 낮에 캠퍼스를 벗어날 때의 차림이고, "
         "이 컷은 그 전날 밤에서 이어지는 **D7 새벽 2시, 캠퍼스 안**입니다.\n\n"
         "> 13절 배경 프롬프트에서 `empty`를 뺐습니다 — 인물이 앉아 있는 컷이라 "
         "\"빈 의자\"와 모순됩니다.",
         ["**여명이 보라→파랑인가** (주황 일출이면 다시)",
          "원경에 **도시 불빛이 없는가**",
          "지면과 구조물이 아직 실루엣인가",
          "데크 라인·기둥·나무 실루엣이 살아 있는가",
          "평상복 + 명찰인가"], NEG_STILL),
        ("climax", "② D9 클라이맥스 — 교육장 403 심야", BG_CLIMAX,
         "심야(먹빛 남색 · 점광원만)",
         "`classroom_1.jpg` · `classroom_2.jpg`",
         "> **히로인의 서브플롯이 해결되는 지점**입니다. 각자 자기 방식으로 무너지고 "
         "주인공이 그걸 목격합니다.\n\n"
         "> 배치만 지키면 됩니다 — **화이트보드가 앞, 맞은편이 통창.** "
         "새벽 2시엔 키보드 소리만 남습니다.\n\n"
         "> **기본값은 \"얼굴이 거의 안 보이는 어둠\"**입니다. "
         "낮 사진의 밝기를 그대로 두면 이 게임의 정서가 통째로 사라집니다.",
         ["**심야가 충분히 어두운가** — 한눈에 다 읽히면 아직 밝습니다",
          "창밖이 완전히 검은가",
          "광원이 모니터 두세 대뿐인가",
          "평상복 + 명찰인가"], NEG_CLIMAX),
    ]

    idx = 1
    for key, scene_title, bg, tone, ref, note, checks, neg in scenes:
        for h in HEROINES:
            write(OUT / "04_still" / f"T{idx:02d}_{h['id']}_{key}.md", prompt_file(
                f"T{idx:02d} · {h['kr']} 스틸 {scene_title}",
                [("파일명", f"`cg_{h['id']}_still_{key}.png`"),
                 ("캔버스", "1920 × 1080 가로 · 불투명"),
                 ("색조", tone),
                 ("배경 레퍼런스", f"{ref} — **구조만** 가져옵니다. 조명·색조·시간대는 새로 깝니다"
                  + ("<br>보조: `community_lounge_1.jpg` — 4F 라운지에서 시작해 가든으로 내려오는 씬입니다"
                     if key == "garden" and h["id"] in ("seunghee", "seungmin") else "")),
                 ("인물 참조", f"**{h['kr']} 평상복 몸통 확정본**"),
                 ("선행 조건", "해당 인물 평상복 몸통 확정")],
                bg + ",\n" + h[key] + ",\n" + CORE_STYLE,
                neg,
                note + "\n\n"
                "> **10절 스타일 접미사를 그대로 붙이지 않았습니다.** "
                "`bust crop` · `plain flat background` · `calm neutral expression`은 "
                "배경을 그려야 하는 스틸과 충돌합니다. 화풍 부분만 남겼습니다.\n\n"
                "> 배경이 잘 안 나오면 [`WORLD_PROMPTS.md` 6~9절](../../WORLD_PROMPTS.md)로 "
                "먼저 **심야·여명 배경 이미지를 뽑아 참조로 함께 넣으세요**(13절 지시).",
                checks + ["인물이 몸통 확정본과 같은 사람인가",
                          "1920 × 1080 가로, 불투명인가"]))
            made.append(f"04_still/T{idx:02d}_{h['id']}_{key}.md")
            idx += 1

    for h in HEROINES:
        bgk = h["ending_bg"]
        write(OUT / "04_still" / f"T{idx:02d}_{h['id']}_ending.md", prompt_file(
            f"T{idx:02d} · {h['kr']} 스틸 ③ 엔딩 — 5년 후 ({h['ending_age']}세)",
            [("파일명", f"`cg_{h['id']}_still_ending.png`"),
             ("캔버스", "1920 × 1080 가로 · 불투명"),
             ("배경", BG_ENDING_KR[bgk] + " — 캠퍼스가 아닙니다. 배경 레퍼런스 없음"),
             ("인물 참조", f"**{h['kr']} 평상복 몸통 확정본 — 얼굴만**"),
             ("선행 조건", "해당 인물 평상복 몸통 확정")],
            BG_ENDING[bgk] + ",\n" + f"{h['ending_age']} year old, " + h["ending"] + ",\n"
            + (("office-appropriate adult work clothing" if bgk == "office"
                else "smart casual adult clothing suited to a gallery opening")
               + ", clearly different from student clothes, "
                 "hair styled differently from five years ago, no lanyard,\n") + CORE_STYLE,
            NEG_ENDING,
            "> \"커리어의 완성\"이 아니라 **학생이던 우리가 사회인이 된 첫 구간**의 온도로 갑니다.\n\n"
            "> **옷과 머리가 캠프 때와 달라야 합니다.** 얼굴만 참조로 물리고 복장은 새로 지정하세요.\n\n"
            "> ## ⚠️ 5년 후 복장은 **문서에 없습니다**\n"
            ">\n"
            "> `CHARACTERS.md`가 정하는 것은 5년 후의 **상황**뿐이고 복장은 비어 있습니다. "
            "위 프롬프트의 복장 한 줄은 자리를 채운 것이지 확정이 아닙니다. "
            "여섯 명의 5년 후 복장을 먼저 정하세요 — **엔딩 6장이 서로 통일감이 있어야 합니다.**",
            ["**학생 때와 옷·머리가 다른가**",
             "명찰이 없는가",
             "나이대가 20대 중후반으로 읽히는가",
             "인물이 몸통 확정본과 같은 사람인가",
             "여섯 장의 엔딩이 서로 톤이 맞는가 (전부 뽑은 뒤 나란히 확인)",
             "1920 × 1080 가로, 불투명인가"]))
        made.append(f"04_still/T{idx:02d}_{h['id']}_ending.md")
        idx += 1

    print(f"{len(made)}개 요청 파일 생성")
    for m in made:
        print("  ", m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
