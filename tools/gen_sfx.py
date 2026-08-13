#!/usr/bin/env python3
"""UI 효과음을 합성한다 — `public/audio/sfx/*.wav`

    python tools/gen_sfx.py

**받아오지 않고 만듭니다.** UI 음은 짧고 단순해서 합성이 잘 맞습니다 —
사인파 몇 개에 감쇠 포락선을 씌우면 되고, 종이·바람 같은 것은 잡음을
깎아 만듭니다. 반대로 발소리·문 여닫힘처럼 물체가 부딪히는 소리는
녹음을 구하는 편이 낫습니다 (tools/README 아래 「효과음」 참고).

세 가지를 지킵니다.
  · 길이는 1초 미만                — UI 는 길면 조작을 방해합니다
  · 앞뒤 무음 없음                  — 0.05초만 붙어도 클릭이 늦게 들립니다
  · 최대 진폭을 −18 dBFS 로 통일    — 소스마다 크기가 달라 그냥 쓰면 어떤 건 튑니다
"""
from __future__ import annotations
import os
import wave

import numpy as np

SR = 44100
PEAK = 10 ** (-18 / 20)          # −18 dBFS
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'sfx')


def env(n: int, attack: float = 0.004, decay: float = 1.0, curve: float = 4.0) -> np.ndarray:
    """때리고 잦아드는 포락선. attack 이 0이면 「틱」 하고 튑니다."""
    t = np.linspace(0, 1, n, endpoint=False)
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    d = np.exp(-curve * t / max(decay, 1e-6))
    return a * d


def tone(freq: float, dur: float, curve: float = 5.0, attack: float = 0.004) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    # 3배음을 아주 조금 섞습니다 — 순수 사인파는 전자음처럼 들립니다
    w = np.sin(2 * np.pi * freq * t) + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
    return w * env(n, attack, 1.0, curve)


def noise(dur: float, curve: float = 8.0, lo: float = 0.0, hi: float = 1.0) -> np.ndarray:
    """잡음을 주파수 영역에서 깎습니다 — 종이·바람은 전부 이걸로 만듭니다."""
    n = int(SR * dur)
    rng = np.random.default_rng(7)
    spec = np.fft.rfft(rng.normal(0, 1, n))
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f >= lo * SR / 2) & (f <= hi * SR / 2)
    spec[~band] = 0
    return np.fft.irfft(spec, n) * env(n, 0.002, 1.0, curve)


def mix(*parts: np.ndarray) -> np.ndarray:
    """길이가 다른 조각을 겹칩니다 — 짧은 쪽 뒤를 0으로 채웁니다."""
    n = max(len(p) for p in parts)
    return sum(np.pad(p, (0, n - len(p))) for p in parts)


def save(name: str, x: np.ndarray) -> None:
    x = np.asarray(x, dtype=np.float64)
    peak = float(np.max(np.abs(x))) or 1.0
    x = x / peak * PEAK
    # 끝을 3ms 로 접어 「툭」 끊기는 소리를 없앱니다
    tail = min(len(x), int(SR * 0.003))
    x[-tail:] *= np.linspace(1, 0, tail)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.wav')
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x * 32767).astype('<i2').tobytes())
    print('  %-14s %5.0f ms  %5.1f KB' % (name, len(x) / SR * 1000, os.path.getsize(path) / 1024))


def main() -> None:
    print('효과음 합성 →', os.path.normpath(OUT))

    # 대사 넘기기 — 아주 작은 「톡」. 매 줄 울리므로 가장 짧고 순해야 합니다
    save('ui_tick', mix(tone(1180, 0.055, curve=22) * 0.9, noise(0.02, 30, 0.05, 0.3) * 0.25))

    # 확정 — 두 음이 위로. 이동음보다 한 톤 밝습니다
    save('ui_select', mix(
        tone(660, 0.10, curve=12) * 0.7,
        np.pad(tone(990, 0.16, curve=9), (int(SR * 0.045), 0)) * 0.8,
    ))

    # 종이 한 장 — 잡음을 중고역만 남기고 두 번 스칩니다
    save('page_turn', mix(
        noise(0.16, 9, 0.06, 0.55) * 0.8,
        np.pad(noise(0.22, 6, 0.04, 0.4), (int(SR * 0.08), 0)) * 0.6,
    ))

    # 저장 완료 — 맑은 두 음. 실패와 안 헷갈리게 올라갑니다
    save('save_chime', mix(
        tone(784, 0.22, curve=7) * 0.7,
        np.pad(tone(1046, 0.34, curve=5), (int(SR * 0.10), 0)) * 0.75,
    ))

    # 선택지 이동 — 확정보다 **낮고 짧게**. 같은 높이면 골랐는지 지나쳤는지 모릅니다
    save('ui_move', mix(tone(520, 0.07, curve=18) * 0.8, noise(0.015, 34, 0.05, 0.25) * 0.2))

    # 말 걸기 — 톡 하고 살짝 밝은 꼬리. 확정음보다 부드럽습니다
    save('ui_talk', mix(
        tone(740, 0.09, curve=14) * 0.75,
        np.pad(tone(1110, 0.13, curve=11), (int(SR * 0.03), 0)) * 0.45,
    ))

    # 오류·잠김 — 낮은 한 음. **불쾌하지 않아야 합니다** — 잠긴 버튼은
    # 자주 눌리므로 거슬리면 그 소리 때문에 안 누르게 됩니다
    save('ui_error', mix(
        tone(300, 0.16, curve=9) * 0.8,
        np.pad(tone(238, 0.20, curve=7), (int(SR * 0.055), 0)) * 0.7,
    ))

    # 로그인 성공 — 세 음. 저장음보다 한 마디 길고 밝습니다
    save('login_ok', mix(
        tone(659, 0.20, curve=8) * 0.6,
        np.pad(tone(880, 0.24, curve=7), (int(SR * 0.09), 0)) * 0.7,
        np.pad(tone(1319, 0.40, curve=4.5), (int(SR * 0.19), 0)) * 0.7,
    ))

    # 장면 전환 — 낮은 바람. 저역만 남기고 천천히 부풀렸다 꺼집니다
    n = int(SR * 0.7)
    swell = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    save('transition', noise(0.7, 1.2, 0.0, 0.16)[:n] * swell)

    # 도감 펼치기 — 가죽이 눌리는 낮은 소리 + 걸쇠 달칵.
    # 걸쇠는 **아주 짧은 고역 잡음**이면 금속으로 들립니다
    save('book_open', mix(
        noise(0.55, 3.0, 0.0, 0.22) * 0.9,
        np.pad(noise(0.03, 45, 0.35, 0.9), (int(SR * 0.02), 0)) * 0.55,
        np.pad(noise(0.20, 7, 0.05, 0.45), (int(SR * 0.16), 0)) * 0.35,
    ))

    # 메모 붙이기 — 종이가 닿고 테이프가 눌립니다
    save('note_stick', mix(
        noise(0.10, 16, 0.08, 0.6) * 0.8,
        np.pad(noise(0.14, 11, 0.03, 0.3), (int(SR * 0.05), 0)) * 0.5,
    ))

    # 발소리 셋 — **같은 소리를 반복하면 기계처럼 들립니다.** 높이를
    # 조금씩 달리해 두고 코드에서 돌려 씁니다.
    #
    # 합성이 가장 약한 자리입니다. 실내 마루 위 가벼운 걸음 정도로만
    # 들리고, 진짜 발소리의 물성은 안 납니다 — 거슬리면 CC0 녹음으로
    # 갈아 끼우는 편이 낫습니다 (tools/README 「효과음」).
    for i, (lo, hi, cur) in enumerate(((0.0, 0.18, 26), (0.02, 0.22, 22), (0.0, 0.15, 30))):
        save(f'step_{"abc"[i]}', mix(
            noise(0.07, cur, lo, hi) * 0.9,
            tone(120 + i * 14, 0.05, curve=30) * 0.35,
        ))

    # 계단 — 발소리보다 낮고 한 박자 뒤에 한 번 더 (두 칸을 딛습니다)
    save('stairs', mix(
        noise(0.09, 20, 0.0, 0.14) * 0.9,
        tone(96, 0.07, curve=26) * 0.4,
        np.pad(noise(0.08, 22, 0.0, 0.16), (int(SR * 0.13), 0)) * 0.65,
    ))

    # 뒤로 — 확정의 반대. 두 음이 **내려갑니다**
    save('ui_back', mix(
        tone(660, 0.09, curve=14) * 0.7,
        np.pad(tone(440, 0.15, curve=10), (int(SR * 0.04), 0)) * 0.7,
    ))

    # 마우스 올림 — 거의 안 들릴 만큼. 목록을 훑을 때 계속 나므로 가장 작습니다
    save('ui_hover', mix(tone(1560, 0.03, curve=40) * 0.55, noise(0.01, 50, 0.2, 0.6) * 0.15))

    # 창 열림 / 닫힘 — 부풀었다 꺼지는 저역 한 겹씩
    n = int(SR * 0.26)
    save('ui_open', mix(
        noise(0.26, 4.5, 0.0, 0.28)[:n] * (np.linspace(0, 1, n) ** 0.6) * 0.8,
        np.pad(tone(520, 0.16, curve=9), (int(SR * 0.06), 0)) * 0.35,
    ))
    save('ui_close', mix(
        noise(0.22, 9, 0.0, 0.24) * 0.8,
        np.pad(tone(392, 0.14, curve=11), (int(SR * 0.03), 0)) * 0.35,
    ))

    # 문 — 나무문이 밀리고 걸립니다. 합성으로는 여기까지가 한계입니다
    save('door', mix(
        noise(0.30, 5, 0.0, 0.2) * 0.85,
        np.pad(noise(0.05, 26, 0.06, 0.42), (int(SR * 0.22), 0)) * 0.5,
        tone(150, 0.10, curve=16) * 0.3,
    ))

    # 게시판 열기 — 화이트보드라 도감(가죽)보다 가볍고 마른 소리
    save('board_open', mix(
        noise(0.26, 8, 0.05, 0.5) * 0.8,
        np.pad(tone(880, 0.12, curve=13), (int(SR * 0.05), 0)) * 0.3,
    ))

    # 엔딩 해금 — **새로 모았을 때만** 울립니다. 도감에서 가장 밝은 소리
    save('unlock', mix(
        tone(1046, 0.16, curve=10) * 0.55,
        np.pad(tone(1319, 0.20, curve=8), (int(SR * 0.07), 0)) * 0.6,
        np.pad(tone(1568, 0.26, curve=6), (int(SR * 0.14), 0)) * 0.6,
        np.pad(tone(2093, 0.44, curve=4), (int(SR * 0.21), 0)) * 0.45,
    ))

    # 선택지 등장 — 골라야 한다는 신호. 아주 짧게 두 음
    save('choice_show', mix(
        tone(880, 0.10, curve=13) * 0.5,
        np.pad(tone(1174, 0.18, curve=9), (int(SR * 0.05), 0)) * 0.5,
    ))

    # 엔딩 — 네 음. 이 게임에서 가장 긴 효과음입니다
    save('ending', mix(
        tone(523, 0.5, curve=3.2) * 0.55,
        np.pad(tone(659, 0.5, curve=3.0), (int(SR * 0.12), 0)) * 0.55,
        np.pad(tone(784, 0.6, curve=2.6), (int(SR * 0.24), 0)) * 0.6,
        np.pad(tone(1046, 0.9, curve=1.8), (int(SR * 0.38), 0)) * 0.5,
    ))


if __name__ == '__main__':
    main()
