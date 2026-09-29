"""
「残酷な勾配のテーゼ」 — original anison-style instrumental for the opening homage.
128 BPM, D minor. Structure (bars): intro 0-4 · riff 4-8 · verse 8-16 · pre-chorus 16-24 ·
chorus 24-40 (王道進行 B♭–C–Am–Dm) · outro 40-44 · final hit 44.
Melody, chords and arrangement are original; every sound is synthesized.
"""
import json
import numpy as np
from synthlib import *
import synthlib as S

ROOT = __file__.rsplit('/', 2)[0]
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
TOTAL = 46 * BAR
S.setup(TOTAL, seed=128)
try:
    CUES = json.load(open(f'{ROOT}/out/opening/cues.json'))['cues']
except FileNotFoundError:
    CUES = []


def tb(bar, beat=0.0):
    return bar * BAR + beat * BEAT


CH = {
    'Dm': ('D2', ['D3', 'F3', 'A3']), 'Bb': ('A#1', ['A#2', 'D3', 'F3']), 'C': ('C2', ['C3', 'E3', 'G3']),
    'A': ('A1', ['A2', 'C#3', 'E3']), 'Gm': ('G1', ['G2', 'A#2', 'D3']), 'Am': ('A1', ['A2', 'C3', 'E3']),
}
PROG = (['Dm', 'Bb', 'Gm', 'A'] +                                   # intro 0-3
        ['Dm', 'Bb', 'C', 'A'] +                                    # riff 4-7
        ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'] +            # verse 8-15
        ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Gm', 'A'] +             # pre 16-23
        ['Bb', 'C', 'Am', 'Dm'] * 3 + ['Bb', 'C', 'A', 'Dm'] +      # chorus 24-39
        ['Dm', 'Bb', 'C', 'A'] + ['Dm', 'Dm'])                      # outro 40-43, final 44-45


# ── instruments specific to the band ─────────────────────────────────────────
def lead(t, note, beats, g=1.0, supersaw=False, bright=4200, pan=0.0, send=0.3):
    f = hz(note)
    dur = beats * BEAT
    d = dur + 0.12
    tv = tt(d)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * tv) * np.clip((tv - 0.18) / 0.2, 0, 1)
    dets = (-0.011, -0.005, 0.0, 0.005, 0.011) if supersaw else (-0.004, 0.004)
    x = sum(saw(f * (1 + dd) * vib, d) for dd in dets) / len(dets)
    x += 0.35 * square(f * 0.5 * vib, d)
    x = lp_sweep(x, lambda u: bright * (0.55 + 0.45 * np.exp(-u * d / 0.15)))
    x *= adsr(d, 0.008, 0.1, 0.85, 0.1)
    add('music', x, t, 0.16 * g, pan=pan, send=send)


def voice(t, note, beats, g=1.0):
    """wordless 'ah' lead for the intro (stands in for the a cappella)"""
    f = hz(note)
    d = beats * BEAT + 0.35
    tv = tt(d)
    vib = 1 + 0.009 * np.sin(2 * np.pi * 5.2 * tv) * np.clip((tv - 0.25) / 0.3, 0, 1)
    src = saw(f * vib, d) + 0.5 * saw(f * 1.003 * vib, d)
    x = bp(src, 700, 1100) + 0.6 * bp(src, 1100, 1400) + 0.3 * bp(src, 2600, 3200) + 0.15 * lp(src, 400)
    x *= adsr(d, 0.09, 0.2, 0.9, 0.3)
    add('music', x, t, 0.26 * g, send=0.8)


def guitar(t, root, beats, g=1.0, mute=False, pan=-0.35):
    f = hz(root)
    d = (0.16 if mute else beats * BEAT) + 0.05
    x = sum(saw(f * r * (1 + dd), d) for r in (1, 1.4983, 2) for dd in (-0.003, 0.003))
    x = drive(x * 0.8, 6.0)
    x = hp(lp(x, 1300 if mute else 3600), 110) + 0.4 * bp(x, 700, 1600)
    x *= adsr(d, 0.004, 0.08, 0.75, 0.04)
    add('music', x, t, 0.075 * g, pan=pan)
    add('music', x, t + 0.012, 0.075 * g, pan=-pan)       # double-tracked


def crash(t, g=1.0):
    d = 2.2
    x = hp(noise(d), 4500) * expdec(d, 0.7) + 0.3 * hp(noise(d), 9000) * expdec(d, 0.15)
    add('music', x, t, 0.22 * g, pan=0.3, send=0.3)


def tom(t, f, g=1.0):
    d = 0.5
    x = sine(f * (1 + 0.6 * np.exp(-tt(d) / 0.03)), d) * expdec(d, 0.18) + lp(noise(d), 800) * expdec(d, 0.02) * 0.4
    add('music', x, t, 0.5 * g, send=0.2)


def strings(t, notes, beats, g=1.0):
    d = beats * BEAT + 0.6
    for n in notes:
        for dd in (-0.006, 0.0, 0.006):
            vib = 1 + 0.003 * np.sin(2 * np.pi * 5.0 * tt(d) + dd * 300)
            x = lp(saw(hz(n) * (1 + dd) * vib, d), 3000) * adsr(d, 0.12, 0.2, 0.85, 0.5)
            add('music', x, t, 0.035 * g, pan=dd * 80, send=0.5)


# ── melody (note, beats); 'r' = rest ────────────────────────────────────────
INTRO = [[('A4', 1), ('D5', 1), ('E5', 1), ('F5', 1)], [('E5', 1.5), ('D5', 0.5), ('C5', 1), ('A4', 1)],
         [('A#4', 1), ('C5', 1), ('D5', 1.5), ('E5', 0.5)], [('F5', 1), ('E5', 1), ('D5', 2)]]
RIFF = [[(n, 0.5) for n in ('D5', 'D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5')],
        [(n, 0.5) for n in ('A#4', 'D5', 'F5', 'A#5', 'A5', 'F5', 'D5', 'F5')],
        [(n, 0.5) for n in ('C5', 'E5', 'G5', 'C6', 'A#5', 'G5', 'E5', 'G5')],
        [('A5', 0.5), ('G5', 0.5), ('F5', 0.5), ('E5', 0.5), ('C#5', 1), ('E5', 1)]]
VERSE = [[('r', 1), ('A4', 0.5), ('D5', 0.5), ('D5', 1), ('E5', 1)], [('F5', 1.5), ('E5', 0.5), ('D5', 1), ('C5', 1)],
         [('D5', 1), ('A#4', 1), ('r', 0.5), ('A#4', 0.5), ('C5', 0.5), ('D5', 0.5)], [('E5', 1.5), ('D5', 0.5), ('C5', 2)],
         [('r', 1), ('A4', 0.5), ('D5', 0.5), ('D5', 1), ('E5', 1)], [('F5', 1), ('G5', 1), ('A5', 1), ('F5', 1)],
         [('G5', 1.5), ('F5', 0.5), ('E5', 1), ('D5', 1)], [('E5', 3), ('r', 1)]]
PRE = [[('D5', 0.5), ('E5', 0.5), ('F5', 1), ('F5', 0.5), ('E5', 0.5), ('D5', 1)],
       [('E5', 0.5), ('F5', 0.5), ('G5', 1), ('G5', 0.5), ('F5', 0.5), ('E5', 1)],
       [('C5', 0.5), ('D5', 0.5), ('E5', 1), ('E5', 0.5), ('D5', 0.5), ('C5', 1)], [('D5', 3), ('r', 1)],
       [('F5', 0.5), ('G5', 0.5), ('A5', 1), ('A5', 0.5), ('G5', 0.5), ('F5', 1)],
       [('G5', 0.5), ('A5', 0.5), ('A#5', 1), ('A#5', 0.5), ('A5', 0.5), ('G5', 1)],
       [('A5', 1), ('G5', 1), ('F5', 1), ('E5', 1)], [('E5', 2), ('C#5', 1), ('E5', 1)]]
CHO_A = [[('A5', 1.5), ('G5', 0.5), ('F5', 1), ('G5', 1)], [('A5', 1), ('C6', 1), ('A#5', 1), ('A5', 1)],
         [('G5', 1.5), ('F5', 0.5), ('E5', 1), ('C5', 1)], [('D5', 1), ('E5', 1), ('F5', 1), ('A5', 1)],
         [('A#5', 1.5), ('A5', 0.5), ('G5', 1), ('F5', 1)], [('G5', 1), ('A5', 1), ('C6', 1), ('A#5', 0.5), ('A5', 0.5)],
         [('A5', 2), ('G5', 1), ('E5', 1)], [('F5', 2), ('E5', 1), ('D5', 1)]]
CHO_B = CHO_A[:6] + [[('A5', 1), ('G5', 1), ('E5', 1), ('C#5', 1)], [('D5', 4)]]


def play(bars, start_bar, fn, **kw):
    for i, bar in enumerate(bars):
        beat = 0.0
        for note, b in bar:
            if note != 'r':
                fn(tb(start_bar + i, beat), note, b, **kw)
            beat += b


# ── arrangement ─────────────────────────────────────────────────────────────
# intro: wordless voice + pad
play(INTRO, 0, voice)
for b in range(4):
    root, tri = CH[PROG[b]]
    pad(tb(b), tri, BAR, g=0.5, cut=1500, a=0.5, r=0.6, send=0.7)
    bell(tb(b), hz(tri[2]) * 2, g=0.12, dur=2.5)
tom(tb(3, 2.0), 180); tom(tb(3, 2.5), 150); tom(tb(3, 3.0), 120); tom(tb(3, 3.5), 95)
riser(tb(2.5), 1.5 * BAR, g=0.55)
rev_swell(tb(4), 1.4, g=1.2)

# band
for b in range(4, 46):
    root, tri = CH[PROG[b]]
    t0 = tb(b)
    sec = 'riff' if b < 8 or 40 <= b < 44 else 'verse' if b < 16 else 'pre' if b < 24 else 'chorus' if b < 40 else 'final'
    if sec == 'final':
        if b == 44:
            impact(t0, g=1.2); crash(t0, 1.3); kick(t0, 1.2)
            guitar(t0, root, 7, g=1.3)
            strings(t0, [n.replace('3', '4') for n in tri], 7, g=1.4)
            brass(t0, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], 3.0, g=1.4, send=0.6)
            bass(t0, hz(root), 3.2, g=1.2)
        continue
    # drums
    for s in range(8):
        ts = t0 + s * BEAT / 2
        if sec in ('riff', 'chorus'):
            if s in (0, 3, 4): kick(ts, 1.0)
            if s in (2, 6): snare(ts, 1.1)
            hat(ts, 0.9 if s % 2 else 0.6, open_=(sec == 'chorus' and s % 2 == 1))
        elif sec == 'verse':
            if s in (0, 4): kick(ts, 0.9)
            if s in (2, 6): snare(ts, 0.85)
            hat(ts, 0.55)
        elif sec == 'pre':
            if b >= 22 or s in (0, 4): kick(ts, 0.95)
            if s in (2, 6): snare(ts, 0.95)
            hat(ts, 0.7)
    if sec == 'pre' and b == 23:
        for k in range(16): snare(t0 + k * BEAT / 4, 0.35 + 0.5 * k / 16)
    if b in (4, 8, 24, 28, 32, 36, 40):
        crash(t0, 1.0)
    if b in (15, 39):
        for k, f in enumerate((200, 170, 140, 110)): tom(t0 + (2 + k * 0.5) * BEAT, f, 0.9)
    # bass
    for s in range(8):
        ts = t0 + s * BEAT / 2
        f = hz(root) * (2 if (sec == 'chorus' and s in (3, 7)) or (sec == 'riff' and s % 2) else 1)
        if sec == 'pre' and b < 20 and s % 2: continue
        bass(ts, f, BEAT / 2 * 0.85, g=0.9, cut=900, dist=2.0)
    # guitar
    if sec == 'riff':
        for s in range(8): guitar(t0 + s * BEAT / 2, root, 0.5, mute=(s % 2 == 1))
    elif sec == 'verse':
        for s in range(8): guitar(t0 + s * BEAT / 2, root, 0.5, g=0.7, mute=True)
    elif sec == 'pre':
        guitar(t0, root, 4, g=0.8)
        for k in range(16):                      # rising string arpeggio
            n = tri[k % 3]
            pluck(t0 + k * BEAT / 4, hz(n) * (2 if k >= 8 else 1) * (2 if b >= 20 else 1), g=0.45, bright=1.2, pan=0.4 * np.sin(k))
    elif sec == 'chorus':
        guitar(t0, root, 2, g=1.0); guitar(t0 + 2 * BEAT, root, 1.5, g=0.9)
        for s in (7,): guitar(t0 + s * BEAT / 2, root, 0.5, mute=True)
        strings(t0, [n.replace('3', '4').replace('2', '3') for n in tri], 4, g=1.0)
    if sec in ('verse', 'pre'):
        pad(t0, tri, BAR, g=0.55, cut=1800, a=0.2, r=0.4)

play(RIFF, 4, lead, g=0.9, bright=5200)
play(VERSE, 8, lead, g=0.85, bright=3600)
play(PRE, 16, lead, g=0.9, bright=4200)
play(CHO_A, 24, lead, g=1.0, supersaw=True, bright=5600)
play(CHO_A, 24, lambda t, n, b, **k: lead(t, n[:-1] + str(int(n[-1]) - 1), b, g=0.45, bright=2600, pan=0.3))
play(CHO_B, 32, lead, g=1.0, supersaw=True, bright=5600)
play(CHO_B, 32, lambda t, n, b, **k: lead(t, n[:-1] + str(int(n[-1]) - 1), b, g=0.45, bright=2600, pan=0.3))
play(RIFF, 40, lead, g=0.9, bright=5200)

# transitions
impact(tb(4), g=1.0)
riser(tb(22), 2 * BAR, g=1.0)
rev_swell(tb(24), 1.2, g=1.0)
impact(tb(24), g=0.8)

# visual accents exported by the opening timeline
for c in CUES:
    if c['type'] == 'flash':
        add('sfx', hp(noise(0.06), 3000) * expdec(0.06, 0.012), c['t'], 0.28, pan=S.rng.uniform(-0.5, 0.5))
    elif c['type'] == 'cross':
        impact(c['t'], g=0.7, bright=1.6)
    elif c['type'] == 'beam':
        chirp(c['t'], 2400, 200, 0.6, g=1.0)
    elif c['type'] == 'launch':
        riser(c['t'] - 0.9, 0.9, g=0.8)
    elif c['type'] == 'blip':
        blip(c['t'], 1600 + 400 * S.rng.random(), g=0.5)

S.mixdown(f'{ROOT}/out/opening/score.wav', TOTAL, [tb(4), tb(24), tb(44)], fade=2.5)
