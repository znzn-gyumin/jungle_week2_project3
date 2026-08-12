# -*- coding: utf-8 -*-
"""`.vns` 를 사양과 대조한다 — 표정 6종 · BGM 8곡 · @cg 실존 · 점프 대상 · 줄 수."""
import glob, os, re, io, sys, collections
sys.stdout.reconfigure(encoding='utf-8')

EXPR = {'기본', '기쁨', '부끄러움', '슬픔', '놀람', '화남'}
BGM = {'title', 'day', 'session', 'night', 'midnight', 'tension', 'swell', 'epilogue'}
CG = {os.path.splitext(os.path.basename(f))[0] for f in glob.glob('assets/cg/event/*.png')}
BG = {os.path.splitext(os.path.basename(f))[0]
      for f in glob.glob('assets/bg/*/*.png') + glob.glob('assets/bg/campus/*/*.png')}

files = sorted(glob.glob('src/script/**/*.vns', recursive=True))
scenes, labels, jumps, bad = {}, collections.defaultdict(set), [], []
counts = {}

for f in files:
    cur = None
    dlg = 0
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
            continue
        m = re.match(r'^---\s*(\S+)\s*---$', s)
        if m:
            labels[cur].add(m.group(1)); continue
        m = re.match(r'^->\s*(\S+)', s)
        if m:
            jumps.append((loc, cur, m.group(1))); continue
        m = re.match(r'^@bgm\s+(\S+)', s)
        if m and m.group(1) not in BGM:
            bad.append('%s  BGM 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@cg\s+(\S+)', s)
        if m and m.group(1) not in CG:
            bad.append('%s  스틸 CG 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^@bg\s+(\S+)', s)
        if m and m.group(1) not in BG:
            bad.append('%s  배경 없음 %s' % (loc, m.group(1)))
        m = re.match(r'^(\S+)\s*\[([^\]]+)\]', s)
        if m and m.group(2) not in EXPR:
            bad.append('%s  표정 없음 [%s]' % (loc, m.group(2)))
        # 대사/내레이션 줄 세기
        if s.startswith('*') or re.match(r'^\S+\s*(\[[^\]]+\])?\s*"', s):
            dlg += 1
    counts[f] = dlg

# 점프 대상 해석
for loc, cur, tgt in jumps:
    if tgt in ('back', 'next_chapter') or tgt.startswith('r_*_'):
        continue
    if tgt in scenes or tgt in labels.get(cur, ()):
        continue
    bad.append('%s  점프 대상 없음 -> %s  (씬 %s)' % (loc, tgt, cur))

print('씬 %d개 · 파일 %d개' % (len(scenes), len(files)))
for f in files:
    print('  %-42s %3d줄' % (f.replace(os.sep, '/'), counts[f]))
print('  %-42s %3d줄  ← MVP 목표 477' % ('합계', sum(counts.values())))
print()
if bad:
    print('문제 %d건' % len(bad))
    for b in bad:
        print('  X', b)
else:
    print('표정 · BGM · CG · 배경 · 점프 대상 — 전부 통과')
