# -*- coding: utf-8 -*-
"""`.vns` 를 사양과 대조하고 집필 진행률을 센다.

    python tools/check_vns.py

검사  표정 6종 · BGM 8곡 · @cg/@bg 실존 · 점프 대상 · 씬 ID 중복 · 줄 조건
진행  배치 12개 × 6인 + 자유 이동 대화 2종 × 6인 + 공통 21씬

아직 안 쓴 씬으로 가는 점프는 오류가 아니라 `미작성`으로 셉니다.
가로 작업에서는 다음 배치를 쓰기 전까지 항상 그 상태입니다.
"""
import glob, os, re, io, sys, collections
sys.stdout.reconfigure(encoding='utf-8')

EXPR = {'기본', '기쁨', '부끄러움', '슬픔', '놀람', '화남'}
BGM = {'title', 'day', 'session', 'night', 'midnight', 'tension', 'swell', 'epilogue'}
ROUTES = ['minah', 'seunghee', 'yunjung', 'mingyu', 'seungmin', 'yunho']
BATCH = ['c1_pair', 'c1_review', 'c2_talk', 'c2_allnighter', 'c2_garden',
         'c3_folkvillage', 'c3_everland', 'c3_collegetown',
         'c4_talk', 'c4_classroom', 'c4_lastnight',
         'end_true', 'end_good', 'end_normal']
COMMON = ['p_arrival', 'p_orientation', 'p_friend', 'p_freeroam', 'p_night',
          'p_meet_minah', 'p_meet_seunghee', 'p_meet_yunjung',
          'p_meet_mingyu', 'p_meet_seungmin', 'p_meet_yunho',
          'c2_ranking', 'c2_freeroam', 'c2_coach', 'c3_outing', 'c3_bus',
          'c4_freeroam', 'c4_scout', 'e_ceremony', 'e_epilogue_branch', 'e_solo']
PLANNED = {'r_%s_%s' % (r, b) for r in ROUTES for b in BATCH} | set(COMMON)

CG = {os.path.splitext(os.path.basename(f))[0] for f in glob.glob('assets/cg/event/*.webp')}
BG = {os.path.splitext(os.path.basename(f))[0]
      for f in glob.glob('assets/bg/*/*.webp') + glob.glob('assets/bg/campus/*/*.webp')}

files = sorted(glob.glob('src/script/**/*.vns', recursive=True))
scenes, labels, jumps, bad = {}, collections.defaultdict(set), [], []
counts, pending = {}, set()

for f in files:
    cur, dlg, curlab = None, 0, None
    # 선택지가 호감도로 걸어 잠근 라벨 — 그 안은 구간이 보장된다
    gated = {}
    for line in io.open(f, encoding='utf-8'):
        mg = re.search(r'->\s*(\S+)\s*\|\s*if\s+affection>=(\d+)', line)
        if mg:
            gated[mg.group(1)] = int(mg.group(2))
    for n, line in enumerate(io.open(f, encoding='utf-8'), 1):
        s = line.strip()
        if not s or s.startswith('//'):
            continue
        loc = '%s:%d' % (f.replace(os.sep, '/'), n)
        m = re.match(r'^===\s*(\S+)\s*===$', s)
        if m:
            cur = m.group(1)
            if cur in scenes:
                bad.append('%s  씬 ID 중복 %s' % (loc, cur))
            scenes[cur] = f
            curlab = None
            continue
        m = re.match(r'^---\s*(\S+)\s*---$', s)
        if m:
            curlab = m.group(1)
            labels[cur].add(curlab); continue
        m = re.search(r'->\s*(\S+)\s*$', s)
        if m:
            jumps.append((loc, cur, m.group(1)))
        m = re.match(r'^@bgm\s+(\S+)', s)
        if m and m.group(1) not in BGM:
            bad.append('%s  BGM 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@cg\s+(\S+)', s)
        if m and m.group(1) != 'none' and m.group(1) not in CG:
            bad.append('%s  스틸 CG 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@bg\s+(\S+)', s)
        if m and m.group(1) not in BG:
            bad.append('%s  배경 없음 %s' % (loc, m.group(1)))
        # 대사·내레이션 한 줄 조건 — 「| if 조건」 을 떼고 본문만 본다
        cond = None
        mc = re.match(r'^(.*?)\s*\|\s*if\s+(\S+)\s*$', s)
        if mc and not s.startswith('@') and not s.startswith('"'):
            s, cond = mc.group(1).strip(), mc.group(2)
            if not re.match(r'^(flag:\S+|(affection|skill)(>=|<=|<|>)\d+)$', cond):
                bad.append('%s  조건 형식 아님  if %s' % (loc, cond))
        m = re.match(r'^(\S+)\s*\[([^\]]+)\]', s)
        if m and m.group(2) not in EXPR:
            bad.append('%s  표정 없음 [%s]' % (loc, m.group(2)))
        if s.startswith('*') or re.match(r'^\S+\s*(\[[^\]]+\])?\s*"', s):
            dlg += 1
        # ★ 빈 문자열이 되는 호칭 — 김민규는 0~24 구간에 이름을 안 부른다
        #   (CHARACTERS 2-4). 「{P:호칭}」 만으로 된 대사는 그 구간에서 통째로
        #   사라지므로 반드시 조건으로 갈라야 한다.
        if '{P:호칭}' in s and 'mingyu' in (cur or ''):
            body = re.sub(r'^\S+\s*(\[[^\]]+\])?\s*', '', s).strip('"')
            if not re.sub(r'[^가-힣A-Za-z0-9]', '', body.replace('{P:호칭}', '')):
                safe = bool(cond and cond.startswith('affection>='))
                safe = safe or (cur or '').endswith(('_end_true', '_end_good'))
                safe = safe or gated.get(curlab, 0) >= 25
                if not safe:
                    bad.append('%s  민규 대사가 {P:호칭} 뿐인데 조건이 없음 '
                               '— 0~24 구간에서 빈 줄이 된다' % loc)
    counts[f] = dlg

for loc, cur, tgt in jumps:
    if tgt in ('back', 'next_chapter') or tgt.startswith('r_*_'):
        continue
    if tgt in scenes or tgt in labels.get(cur, ()):
        continue
    if tgt in PLANNED:
        pending.add(tgt); continue
    bad.append('%s  점프 대상 없음 -> %s  (씬 %s)' % (loc, tgt, cur))

print('씬 %d개 · 파일 %d개 · %d줄' % (len(scenes), len(files), sum(counts.values())))
for f in files:
    print('  %-42s %4d줄' % (f.replace(os.sep, '/'), counts[f]))

print()
print('진행 — 루트 씬 14종 × 6인 (배치 12 + 자유 이동 대화 2)')
print('  %-16s %s' % ('배치', '  '.join('%-8s' % r for r in ROUTES)))
done_r = 0
for b in BATCH:
    cells = ['r_%s_%s' % (r, b) in scenes for r in ROUTES]
    done_r += sum(cells)
    print('  %-16s %s' % (b, '  '.join('%-8s' % ('O' if c else '.') for c in cells)))
done_c = sum(1 for c in COMMON if c in scenes)
print()
print('  루트 %d/%d · 공통 %d/%d · 합계 %d씬' % (done_r, len(BATCH)*6, done_c, len(COMMON), done_r + done_c))

print()
if bad:
    print('문제 %d건' % len(bad))
    for b in bad:
        print('  X', b)
else:
    print('표정 · BGM · CG · 배경 · 점프 대상 — 전부 통과')
if pending:
    print('미작성 씬으로 가는 점프 %d건 — 다음 배치에서 채워집니다' % len(pending))
