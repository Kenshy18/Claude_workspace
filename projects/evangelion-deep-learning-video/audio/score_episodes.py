"""
Score for the episode film (新世紀 勾配降下). Reads out/episodes/cues.json exported from the visual
timeline so every hit lands on its frame.
"""
import json
import sys
import numpy as np
from synthlib import *
import synthlib as S

ROOT = __file__.rsplit('/', 2)[0]
CUES = json.load(open(f'{ROOT}/out/episodes/cues.json'))
TOTAL = CUES['total']
SC = {s['name']: s['start'] for s in CUES['scenes']}
S.setup(TOTAL)


def cues(kind):
    return [c for c in CUES['cues'] if c['type'] == kind]


def cue(kind):
    return cues(kind)[0]


# ════════════════════════════════════════════════════════════════════════════
#  SCORE
# ════════════════════════════════════════════════════════════════════════════
# ── cold open ───────────────────────────────────────────────────────────────
drone(0.0, 5.4, g=1.0)
for c in cues('blip'):
    blip(c['t'], 1400 + S.rng.random() * 800, g=0.8, pan=-0.3)
    blip(c['t'] + 0.06, 2400, g=0.4, pan=-0.3)
for c in cues('blip_warn'):
    for k in range(3):
        blip(c['t'] + k * 0.09, 700, g=0.9, dur=0.07)
for c in cues('flash_hit'):
    timpani(c['t'], hz('D2') * [1, 1.189, 1.335, 1.498, 1.782, 2][c['i']], g=0.8, send=0.3)
    add('sfx', hp(noise(0.12), 2500) * expdec(0.12, 0.02), c['t'], 0.4)
tb = cue('title_boom')['t']
impact(tb, g=1.1)
brass(tb, ['D2', 'A2', 'D3', 'F3', 'A3'], 1.6, g=1.4, send=0.6)
pad(tb, ['D2', 'A2', 'D3', 'F3'], 3.6, g=1.2, cut=900, a=0.05, r=1.5)
timpani(tb, hz('D2'), g=1.2)

# ── title cards ─────────────────────────────────────────────────────────────
for c in cues('card_hit'):
    piano(c['t'], hz('D2'), g=0.9, dur=3.5)
    piano(c['t'], hz('A2'), g=0.6, dur=3.5)
    piano(c['t'], hz('D3'), g=0.5, dur=3.5)
    timpani(c['t'], hz('D2'), g=0.7)
for c in cues('card_tick'):
    blip(c['t'], 2600, g=0.35)

# ── EP1 · OOD ───────────────────────────────────────────────────────────────
s = SC['ood']
groove(s + 0.0, s + 2.0, kick_pat='none', snare_on=False, hats='16', bass_pat='8', g=0.55)
groove(s + 2.0, s + 9.5, g=0.75)
riser(s + 7.0, 2.5, g=1.0)
a = cue('alarm')['t']
impact(a, g=1.0)
siren(a, 4.5, g=1.0)
groove(a, a + 4.5, kick_pat='16', hats='16', bass_pat='16', brass_on=True, g=0.95, bass_cut=1100, dist=2.2)
groove(a + 4.5, s + 19.5, g=0.7)
impact(cue('stamp')['t'], g=0.8)
brass(cue('stamp')['t'], ['D3', 'F3', 'A3'], 0.8, g=1.0)
blip(cue('lock')['t'], 1200, g=0.9)
blip(cue('lock')['t'] + 0.1, 1800, g=0.9)
chirp(cue('angel_in')['t'], 3000, 300, 0.8, g=1.2)
for k in range(6):
    blip(cue('bars')['t'] + k * 0.07, 900 + k * 180, g=0.5, pan=0.5)
for k in range(20):
    blip(cue('scatter')['t'] + k * 0.08, 2000 + S.rng.random() * 1500, g=0.25, pan=-0.5)

# ── EP2 · sync ratio ────────────────────────────────────────────────────────
s = SC['sync']
groove(s, s + 2.0, kick_pat='none', snare_on=False, hats='8', bass_pat='8', pads=False, g=0.6)
groove(s + 2.0, s + 4.0, kick_pat='none', snare_on=False, hats='16', bass_pat='8', arp=True, arp_cut=0.6, g=0.7)
groove(s + 4.0, s + 10.5, kick_pat='4', hats='16', bass_pat='16', arp=True, arp_cut=1.6, g=0.8)
riser(s + 8.0, 2.5, g=0.9)
t400 = cue('sync400')['t']
impact(t400, g=1.0)
brass(t400, ['D2', 'G#2', 'D3'], 1.0, g=1.2)          # tritone stab
bubbles(t400 + 0.1, t400 + 5.4, rate=9, g=1.0)
choir(t400 + 0.1, ['D3', 'A3', 'D#4'], 4.4, g=0.8)
add('music', lp(saw(hz('D1'), 5.5) + saw(hz('D2'), 5.5), 220) * adsr(5.5, 0.5, 0.2, 0.9, 1.0), t400 + 0.1, 0.25, send=0.5)
rewind_sfx(cue('rewind')['t'], cue('rewind')['dur'])
bell(cue('confirm')['t'], hz('A5'), g=0.4)
bell(cue('confirm')['t'] + 0.12, hz('D6'), g=0.3)
pad(cue('confirm')['t'], ['D3', 'F3', 'A3', 'E4'], 1.4, g=0.8, cut=1200)

# ── EP3 · MAGI ──────────────────────────────────────────────────────────────
s = SC['magi']
drone(s, 3.2, g=0.6)
for k in range(24):
    blip(s + 0.9 + k * 0.08, 800 * 2 ** ((k % 8) / 8 * 2), g=0.4, pan=np.sin(k))
groove(s + 3.0, s + 13.0, kick_pat='4', hats='16', bass_pat='8', arp=True, arp_cut=1.2, g=0.75)
groove(s + 13.0, s + 16.9, kick_pat='none', snare_on=False, hats='8', bass_pat='8', arp=True, arp_cut=0.8, g=0.6)
for c in cues('tok_send'):
    chirp(c['t'], 500, 1400, 0.12, g=0.6, pan=-0.4)
for c in cues('magi_vote'):
    for k, f in enumerate((1318.5, 1760.0)):
        blip(c['t'] + k * 0.045, f, g=0.55, dur=0.08, pan=0.3)
    blip(c['t'] + 0.12, 330, g=0.5, dur=0.09, pan=-0.3)
sb = cue('stamp_big')['t']
impact(sb, g=1.0)
brass(sb, ['F2', 'C3', 'F3', 'A3'], 1.5, g=1.3)
timpani(sb, hz('F2'), g=1.0)

# ── EP4 · restraints / berserk ──────────────────────────────────────────────
s = SC['restraint']
rel = cue('release')['t']
bz = cue('berserk')['t']
gh = cue('goodhart')['t']
groove(s, rel, kick_pat='2', hats='8', bass_pat='half', g=0.85, pad_cut=900, bass_cut=500, dist=2.5)
for k in range(7):
    clank(cue('bolts_in')['t'] + k * 0.1, g=0.35, f=500 + k * 40, pan=-0.6 + k * 0.2)
riser(rel, bz - rel, g=1.2)
siren(rel + 0.3, bz - rel - 0.3, g=0.6)
for c in cues('bolt_snap'):
    clank(c['t'], g=1.0, f=700 + c['k'] * 60, pan=-0.6 + c['k'] * 0.2)
    add('sfx', hp(noise(0.08), 1500) * expdec(0.08, 0.015), c['t'], 0.5)
impact(bz, g=1.3, bright=1.5)
roar(bz, gh - bz + 1.0, g=1.1)
groove(bz, gh, kick_pat='16', hats='16', bass_pat='16', brass_on=True, g=1.0, bass_cut=1400, dist=3.5)
add('music', lp(saw(hz('D1'), 3.5) + 0.5 * saw(hz('D1') * 1.01, 3.5), 300) * adsr(3.5, 0.01, 0.3, 0.7, 2.0), gh, 0.35, send=0.8)
bell(gh, hz('D3'), g=0.5, dur=3.5)

# ── FINAL · instrumentality ─────────────────────────────────────────────────
s = SC['collapse']
cr = cue('cross')['t']
choir(s + 0.3, ['D3', 'F3', 'A3'], 3.3, g=0.9)
choir(s + 3.6, ['A#2', 'D3', 'F3', 'A3'], 3.0, g=1.0)
choir(s + 6.6, ['G2', 'A#2', 'D3', 'G3'], 3.0, g=1.1)
choir(s + 9.6, ['A2', 'C#3', 'E3', 'A3'], 2.8, g=1.3)
for k in range(int((cr - s) / 1.0)):
    heartbeat(s + 0.5 + k * 1.0, g=0.35 + 0.05 * k)
for c in [c for c in cues('layer') if c['pure'] == 1]:
    timpani(c['t'], hz('D2') * 2 ** (-c['k'] / 12 * 2), g=0.9 + 0.08 * c['k'], send=0.7)
    add('sfx', hp(noise(0.05), 3000) * expdec(0.05, 0.01), c['t'], 0.3)
ct = cue('collapse_tone')
dur = ct['dur']
sw = sine(np.geomspace(220, 1760, int(dur * SR)), dur) * np.linspace(0, 1, int(dur * SR)) ** 2
cl = sum(sine(hz(n) * np.geomspace(1, 1.06, int(dur * SR)), dur) for n in ('D4', 'D#4', 'E4', 'F4')) * np.linspace(0, 1, int(dur * SR)) ** 3
add('music', sw * 0.12 + cl * 0.05, ct['t'], 1.0, send=0.5)
rev_swell(cr, 1.8, g=1.2)
impact(cr, g=1.5, bright=2.0)
for f in ('D2', 'A2', 'D3', 'F#3', 'A3', 'D4'):
    bell(cr, hz(f), g=0.35, dur=6.0, send=0.8)
# LCL ambience (runs into the residual scene)
lcl = cue('lcl')
add('music', lp(saw(hz('D2'), lcl['dur']) + saw(hz('A2') * 1.002, lcl['dur']) * 0.7 + saw(hz('D3') * 0.998, lcl['dur']) * 0.5, 380)
    * adsr(lcl['dur'], 1.5, 0.5, 0.9, 1.0), lcl['t'], 0.12, send=0.7)
bubbles(lcl['t'] + 0.5, lcl['t'] + lcl['dur'], rate=4, g=0.9)
for k in range(8):
    heartbeat(lcl['t'] + 1.5 + k * 1.4, g=0.2)
bell(cue('complete')['t'], hz('A4'), g=0.35, dur=5.0)

# ── residual: rebirth ───────────────────────────────────────────────────────
rb = cue('rebirth')['t']
rev_swell(rb, 1.5, g=1.2)
impact(rb, g=0.9, bright=1.5)
brass(rb, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], 1.6, g=1.3, send=0.6)
bell(rb, hz('D5'), g=0.4)
groove(rb + 0.5, SC['card6'] - 0.2, prog=PROG_MAJ, kick_pat='4', hats='16', bass_pat='8', arp=True, arp_cut=1.4, g=0.72, pad_cut=2200)
for c in [c for c in cues('layer') if c['pure'] == 0]:
    blip(c['t'], hz('A5') * 2 ** (c['k'] / 12 * 2), g=0.35, dur=0.1)

# card 6: major resolution
c6 = SC['card6']
pad(c6 + 0.05, ['D3', 'F#3', 'A3', 'D4'], 4.2, g=1.1, cut=1400, a=0.4, r=1.0)

# ── ending ──────────────────────────────────────────────────────────────────
s = SC['end']
arp_notes = [('D3', 'F#3', 'A3', 'D4'), ('G2', 'B2', 'D3', 'G3'), ('A2', 'C#3', 'E3', 'A3'), ('D3', 'F#3', 'A3', 'D4')]
for b in range(4):
    for k in range(8):
        n = arp_notes[b][k % 4]
        piano(s + 0.3 + b * 1.4 + k * 0.175, hz(n) * (2 if k >= 4 else 1), g=0.55, dur=2.0, pan=-0.3 + 0.6 * (k / 8))
pad(s + 0.3, ['D3', 'F#3', 'A3'], 5.5, g=0.7, cut=1200, a=1.0)
for c in cues('clap'):
    for j in range(3 + c['k'] // 3):
        clap(c['t'] + j * 0.11 + S.rng.random() * 0.02, g=0.7, pan=S.rng.uniform(-0.8, 0.8))
# a growing crowd of claps under the ring
t = s + 1.0
while t < s + 7.0:
    clap(t, g=0.13 * min(1, (t - s) / 4), pan=S.rng.uniform(-1, 1))
    t += S.rng.exponential(0.07)
ar = cue('arigatou')['t']
for f in ('D3', 'A3', 'D4', 'F#4', 'A4'):
    piano(ar, hz(f), g=0.7, dur=4.0)
melody = ['F#5', 'E5', 'D5', 'A4']
for c, m in zip(cues('line'), melody):
    piano(c['t'], hz(m), g=0.95, dur=4.0, send=0.6)
    piano(c['t'], hz(m) / 2, g=0.45, dur=4.0, send=0.6)
pad(cues('line')[0]['t'], ['D3', 'A3'], 6.5, g=0.5, cut=800, a=1.5)
fn = cue('fin')['t']
timpani(fn, hz('D2'), g=0.6, send=0.8)
bell(fn, hz('D3'), g=0.45, dur=6.0, send=0.9)
for f in ('D2', 'A2', 'D3', 'F#3', 'A3'):
    piano(fn, hz(f), g=0.6, dur=5.5, send=0.7)

# ── generic sfx ─────────────────────────────────────────────────────────────
for c in cues('hud_in'):
    for k in range(5):
        blip(c['t'] + k * 0.05, 1200 + k * 300, g=0.35, pan=-0.6 + k * 0.3)
for c in cues('voice_tick'):
    blip(c['t'], 3200, g=0.2, dur=0.03)
for c in cues('riser'):
    pass  # handled per scene
chirp(cue('formula_in')['t'], 400, 2400, 0.3, g=0.5)

# ════════════════════════════════════════════════════════════════════════════
#  MIX
# ════════════════════════════════════════════════════════════════════════════

S.mixdown(f'{ROOT}/out/episodes/score.wav', TOTAL, [c['t'] for k in ('title_boom', 'alarm', 'sync400', 'berserk', 'cross', 'rebirth') for c in cues(k)])
