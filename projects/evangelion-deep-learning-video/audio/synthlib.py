"""
Shared synthesis kit for both films: oscillators, filters, instruments, groove engine and mixdown.
No samples — everything is generated from oscillators and noise.
Usage:  import synthlib as S; S.setup(total_seconds); ...instruments...; S.mixdown(path, duck_times)
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(2015)
N = 0
music = sfx = verb_send = None


def setup(total, seed=2015):
    global N, music, sfx, verb_send, rng
    N = int((total + 0.5) * SR)
    music = np.zeros((2, N))
    sfx = np.zeros((2, N))
    verb_send = np.zeros((2, N))
    rng = np.random.default_rng(seed)


# ── placement ────────────────────────────────────────────────────────────────
def add(buf, x, t, gain=1.0, pan=0.0, send=0.0):
    buf = {'music': music, 'sfx': sfx}.get(buf, buf) if isinstance(buf, str) else buf
    i0 = int(round(t * SR))
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        x = np.vstack([x * l * 1.414, x * r * 1.414])
    if i0 < 0:
        x = x[:, -i0:]
        i0 = 0
    n = min(x.shape[1], N - i0)
    if n <= 0:
        return
    buf[:, i0:i0 + n] += x[:, :n] * gain
    if send > 0:
        verb_send[:, i0:i0 + n] += x[:, :n] * gain * send


# ── primitives ───────────────────────────────────────────────────────────────
def tt(dur):
    return np.arange(int(dur * SR)) / SR


def sine(f, dur, ph=0.0):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)


def saw(f, dur, ph=None):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,)).astype(float)
    dt = f / SR
    p = ((rng.random() if ph is None else ph) + np.cumsum(dt)) % 1.0
    y = 2 * p - 1
    m = p < dt
    x = p[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


def square(f, dur):
    s = saw(f, dur, 0.0)
    s2 = saw(f, dur, 0.5)
    return (s - s2) * 0.5


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def expdec(dur, tau):
    return np.exp(-tt(dur) / tau)


def adsr(dur, a=0.01, d=0.1, s=0.7, r=0.2):
    n = int(dur * SR)
    e = np.full(n, s)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False)
    nd2 = min(nd, max(0, n - na))
    e[na:na + nd2] = np.linspace(1, s, nd2, endpoint=False)
    if nr > 0 and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def sos(kind, fc, order=2):
    if kind == 'band':
        lo, hi = fc
        return signal.butter(order, [max(lo, 10) / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos')
    return signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), kind, output='sos')


def lp(x, fc, order=2):
    return signal.sosfilt(sos('low', fc, order), x)


def hp(x, fc, order=2):
    return signal.sosfilt(sos('high', fc, order), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos('band', (lo, hi), order), x)


def lp_sweep(x, fcs, block=256):
    """time-varying lowpass; fcs is a callable u∈[0,1] -> cutoff"""
    out = np.zeros_like(x)
    zi = np.zeros((1, 2))
    n = len(x)
    for i in range(0, n, block):
        fc = fcs(min(1.0, i / max(1, n - 1)))
        s_ = sos('low', max(40, fc), 2)
        out[i:i + block], zi = signal.sosfilt(s_, x[i:i + block], zi=zi)
    return out


def drive(x, k=2.0):
    return np.tanh(x * k) / np.tanh(k)


def hz(note):
    """'D3' → Hz"""
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    n, o = (note[:-1], int(note[-1]))
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


# ── instruments ──────────────────────────────────────────────────────────────
def kick(t, g=1.0):
    d = 0.45
    f = 42 + 110 * np.exp(-tt(d) / 0.035)
    x = sine(f, d) * expdec(d, 0.16)
    x += hp(noise(d), 3000) * expdec(d, 0.004) * 0.3
    add('music', drive(x, 1.6), t, 0.62 * g)


def snare(t, g=1.0):
    d = 0.3
    x = bp(noise(d), 1200, 7000) * expdec(d, 0.07) * 0.8 + sine(190, d) * expdec(d, 0.05) * 0.6
    add('music', x, t, 0.6 * g, pan=0.05, send=0.25)


def hat(t, g=1.0, open_=False):
    d = 0.3 if open_ else 0.06
    x = hp(noise(d), 7500) * expdec(d, 0.09 if open_ else 0.015)
    add('music', x, t, 0.22 * g, pan=0.25)


def timpani(t, f, g=1.0, send=0.5):
    d = 2.2
    fr = f * (1 + 0.25 * np.exp(-tt(d) / 0.05))
    x = sine(fr, d) * expdec(d, 0.7) + 0.5 * sine(fr * 1.5, d) * expdec(d, 0.3) + lp(noise(d), 300) * expdec(d, 0.05) * 0.8
    add('music', x, t, 0.7 * g, send=send)


def bass(t, f, dur, g=1.0, cut=700, dist=1.5):
    x = saw(f, dur) * 0.8 + sine(f / 2, dur) * 0.3
    x = lp_sweep(x, lambda u: cut * (0.4 + 1.6 * np.exp(-u * dur / 0.12)))
    x = drive(x, dist) * adsr(dur, 0.005, 0.08, 0.8, 0.05)
    add('music', x, t, 0.35 * g)


def pad(t, notes, dur, g=1.0, cut=2400, a=0.6, r=1.2, send=0.5, pan_spread=0.5):
    for k, n in enumerate(notes):
        f = hz(n) if isinstance(n, str) else n
        for det, pn in ((-0.006, -pan_spread), (0.0, 0.0), (0.0061, pan_spread)):
            x = saw(f * (1 + det), dur + r)
            x = lp(x, cut, 2) * adsr(dur + r, a, 0.3, 0.8, r)
            add('music', x, t, 0.075 * g, pan=pn, send=send)


def brass(t, notes, dur, g=1.0, send=0.35):
    for n in notes:
        f = hz(n) if isinstance(n, str) else n
        for det in (-0.004, 0.004):
            x = saw(f * (1 + det), dur + 0.3)
            x = lp_sweep(x, lambda u: 400 + 3200 * np.exp(-u * (dur + 0.3) / 0.15) + 600 * (1 - u))
            x = drive(x * adsr(dur + 0.3, 0.015, 0.2, 0.6, 0.3), 1.4)
            add('music', x, t, 0.12 * g, pan=det * 60, send=send)


def pluck(t, f, g=1.0, dur=0.6, bright=1.0, pan=0.0, send=0.3):
    tv = tt(dur)
    x = np.zeros_like(tv)
    for k in range(1, 14):
        x += np.sin(2 * np.pi * f * k * tv) * np.exp(-tv * (3 + k * 2.2 / bright)) / k
    add('music', x * 0.5, t, 0.32 * g, pan=pan, send=send)


def piano(t, f, g=1.0, dur=3.0, pan=0.0, send=0.45):
    tv = tt(dur)
    x = np.zeros_like(tv)
    for k in range(1, 10):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        x += np.sin(2 * np.pi * fk * tv) * np.exp(-tv * (0.8 + k * 0.9)) / (k ** 1.1)
    x += lp(noise(dur), 2000) * np.exp(-tv / 0.01) * 0.05
    x *= np.minimum(1, tv / 0.003)
    add('music', x * 0.6, t, 0.3 * g, pan=pan, send=send)


def bell(t, f, g=1.0, dur=4.0, send=0.6, buf=None):
    tv = tt(dur)
    x = np.zeros_like(tv)
    for r_, a_, d_ in ((1, 1, 2.2), (2.76, 0.5, 1.2), (5.4, 0.3, 0.6), (8.93, 0.2, 0.35), (0.5, 0.4, 3.0)):
        x += a_ * np.sin(2 * np.pi * f * r_ * tv) * np.exp(-tv / d_)
    add('music' if buf is None else buf, x * 0.3, t, g, send=send)


def choir(t, notes, dur, g=1.0, send=0.7):
    for n in notes:
        f = hz(n) if isinstance(n, str) else n
        for det in (-0.005, 0.0, 0.005):
            vib = 1 + 0.006 * np.sin(2 * np.pi * (5.1 + det * 100) * tt(dur + 2))
            src = saw(f * (1 + det) * vib, dur + 2)
            x = bp(src, 650, 1000) * 1.0 + bp(src, 1000, 1300) * 0.6 + bp(src, 2500, 3100) * 0.25
            x *= adsr(dur + 2, 1.2, 0.5, 0.85, 2.0)
            add('music', x, t, 0.11 * g, pan=det * 90, send=send)


def impact(t, g=1.0, bright=1.0):
    d = 3.5
    sub = sine(60 * np.exp(-tt(d) / 0.8) + 25, d) * expdec(d, 1.1)
    nz = lp(noise(d), 1800 * bright) * expdec(d, 0.25)
    x = drive(sub * 0.85 + nz * 1.0, 1.8)
    add('sfx', x, t, 0.85 * g, send=0.4)


def blip(t, f=1800, g=1.0, dur=0.05, pan=0.0):
    x = sine(f * (1 + 0.3 * np.exp(-tt(dur) / 0.01)), dur) * adsr(dur, 0.002, 0.02, 0.5, 0.02)
    add('sfx', x, t, 0.18 * g, pan=pan, send=0.15)


def chirp(t, f0, f1, dur, g=1.0, pan=0.0):
    f = np.geomspace(f0, f1, int(dur * SR))
    x = sine(f, dur) * adsr(dur, 0.005, 0.05, 0.7, 0.05)
    add('sfx', x, t, 0.12 * g, pan=pan, send=0.2)


def riser(t, dur, g=1.0):
    n = noise(dur)
    x = np.zeros_like(n)
    blk = 1024
    zi = np.zeros((2, 2))
    for i in range(0, len(n), blk):
        u = i / len(n)
        fc = 300 * (1 - u) + 6000 * u
        s_ = sos('band', (fc * 0.7, fc * 1.3), 2)
        x[i:i + blk], zi = signal.sosfilt(s_, n[i:i + blk], zi=zi)
    x *= np.linspace(0, 1, len(x)) ** 2
    x += saw(np.geomspace(80, 640, int(dur * SR)), dur) * np.linspace(0, 1, int(dur * SR)) ** 3 * 0.3
    add('sfx', x, t, 0.35 * g, send=0.3)


def rev_swell(t_end, dur, g=1.0):
    x = hp(noise(dur), 4000) * np.linspace(0, 1, int(dur * SR)) ** 3
    add('sfx', x, t_end - dur, 0.35 * g, send=0.4)


def siren(t, dur, g=1.0):
    n = int(dur * SR)
    tv = np.arange(n) / SR
    f = np.where((tv * 2.4) % 1 < 0.5, 960, 720)
    f = lp(f.astype(float), 60)
    x = square(f, dur)
    x = bp(x, 400, 3500) * adsr(dur, 0.02, 0.1, 1.0, 0.3)
    add('sfx', drive(x, 1.5), t, 0.12 * g, send=0.3)


def clank(t, g=1.0, f=620, pan=0.0):
    d = 1.2
    tv = tt(d)
    mod = np.sin(2 * np.pi * f * 1.41 * tv) * 3 * np.exp(-tv / 0.1)
    x = np.sin(2 * np.pi * f * tv + mod) * np.exp(-tv / 0.25) + hp(noise(d), 2000) * np.exp(-tv / 0.01) * 0.6
    add('sfx', x, t, 0.3 * g, pan=pan, send=0.35)


def roar(t, dur, g=1.0):
    n = int(dur * SR)
    tv = np.arange(n) / SR
    base = 55 * (1.35 - 0.35 * np.minimum(1, tv / 0.8)) * (1 + 0.02 * np.sin(2 * np.pi * 7 * tv))
    x = sum(saw(base * r_, dur) for r_ in (1.0, 1.005, 1.49, 2.01, 0.5))
    x = drive(lp(x, 900) * 0.6, 3.0)
    x += lp(noise(dur), 500) * 0.4
    x *= adsr(dur, 0.03, 0.4, 0.7, 2.5) * (0.8 + 0.2 * np.sin(2 * np.pi * 11 * tv))
    add('sfx', x, t, 0.5 * g, send=0.35)


def clap(t, g=1.0, pan=0.0):
    d = 0.25
    x = np.zeros(int(d * SR))
    for k in range(4):
        o = int((k * 0.009 + rng.random() * 0.003) * SR)
        b = bp(noise(d), 900, 2600) * expdec(d, 0.012 if k < 3 else 0.07)
        x[o:] += b[:len(x) - o]
    add('sfx', x, t, 0.17 * g, pan=pan, send=0.35)


def bubbles(t0, t1, rate=6, g=1.0):
    t = t0
    while t < t1:
        d = 0.05 + rng.random() * 0.05
        f = 250 + rng.random() * 500
        x = sine(np.geomspace(f, f * 2.4, int(d * SR)), d) * adsr(d, 0.004, 0.02, 0.5, 0.02)
        add('sfx', x, t, 0.08 * g, pan=rng.uniform(-0.7, 0.7), send=0.5)
        t += rng.exponential(1 / rate)


def heartbeat(t, g=1.0):
    for dt_, a in ((0, 1.0), (0.22, 0.7)):
        d = 0.35
        x = sine(52 * (1 + 0.5 * np.exp(-tt(d) / 0.03)), d) * expdec(d, 0.09)
        add('sfx', x, t + dt_, 0.55 * g * a)


def rewind_sfx(t, dur):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    f = 300 + 1600 * np.abs(np.sin(u * np.pi * 9)) * (1 - u * 0.5)
    x = saw(f, dur) * 0.4 + bp(noise(dur), 1500, 6000) * 0.3
    x *= adsr(dur, 0.02, 0.1, 0.9, 0.1)
    add('sfx', x, t, 0.22, send=0.2)


def drone(t, dur, g=1.0):
    x = (saw(hz('D1'), dur) + saw(hz('D2') * 1.003, dur) * 0.6 + saw(hz('A1'), dur) * 0.4)
    x = lp_sweep(x, lambda u: 120 + 700 * u ** 2)
    x *= adsr(dur, 2.0, 0.5, 0.9, 0.6)
    add('music', x, t, 0.22 * g, send=0.4)


# ── groove engine ────────────────────────────────────────────────────────────
PROG_MIN = [('D2', ['D3', 'F3', 'A3']), ('A#1', ['A#2', 'D3', 'F3']), ('C2', ['C3', 'E3', 'G3']), ('A1', ['A2', 'C#3', 'E3'])]
PROG_MAJ = [('D2', ['D3', 'F#3', 'A3']), ('A1', ['A2', 'C#3', 'E3']), ('B1', ['B2', 'D3', 'F#3']), ('G1', ['G2', 'B2', 'D3'])]
BEAT = 0.5


def groove(t0, t1, prog=PROG_MIN, kick_pat='4', snare_on=True, hats='8', bass_pat='8', pads=True, arp=False,
           g=1.0, pad_cut=1600, bass_cut=700, dist=1.5, brass_on=False, arp_cut=1.0):
    bar = 4 * BEAT
    nbars = int(np.ceil((t1 - t0) / bar))
    for b in range(nbars):
        tb = t0 + b * bar
        if tb >= t1:
            break
        root, chord = prog[b % len(prog)]
        if pads:
            pad(tb, chord, min(bar, t1 - tb), g=g, cut=pad_cut, a=0.25, r=0.6)
        if brass_on:
            brass(tb, chord, 0.45, g=g)
        for s in range(16):
            ts = tb + s * BEAT / 4
            if ts >= t1:
                break
            if kick_pat == '4' and s % 4 == 0:
                kick(ts, g)
            elif kick_pat == '2' and s in (0, 10):
                kick(ts, g)
            elif kick_pat == '16' and s % 2 == 0:
                kick(ts, g * 0.9)
            if snare_on and kick_pat != '2' and s in (4, 12):
                snare(ts, g)
            if snare_on and kick_pat == '2' and s == 8:
                snare(ts, g * 1.2)
            if hats == '8' and s % 2 == 0:
                hat(ts, g * (1.0 if s % 4 == 2 else 0.6))
            elif hats == '16':
                hat(ts, g * (0.9 if s % 4 == 2 else 0.5))
            if bass_pat == '8' and s % 2 == 0:
                f = hz(root) * (2 if s in (6, 14) else 1)
                bass(ts, f, BEAT / 2 * 0.9, g=g, cut=bass_cut, dist=dist)
            elif bass_pat == '16':
                f = hz(root) * (2 if s % 8 == 7 else 1)
                bass(ts, f, BEAT / 4 * 0.9, g=g, cut=bass_cut, dist=dist)
            elif bass_pat == 'half' and s in (0, 8):
                bass(ts, hz(root), BEAT * 1.8, g=g * 1.2, cut=bass_cut, dist=dist)
            if arp and s % 1 == 0:
                seq = [chord[0], chord[1], chord[2], chord[1]]
                f = hz(seq[s % 4]) * (2 if (s // 4) % 2 else 4) / 2
                pluck(ts, f, g=g * 0.8, bright=arp_cut, pan=0.4 * np.sin(s))




def mixdown(path, total, duck_times=(), tilt=True, fade=1.6):
    print('reverb…')
    ir_len = int(2.8 * SR)
    tv = np.arange(ir_len) / SR
    ir = np.vstack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)]) * np.exp(-tv / 0.75)
    ir[0] = lp(ir[0], 5000)
    ir[1] = lp(ir[1], 5000)
    ir[:, :int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.vstack([signal.fftconvolve(verb_send[i], ir[i])[:N] for i in range(2)])
    duck = np.ones(N)
    for t in duck_times:
        i0 = int(t * SR)
        n = int(1.2 * SR)
        e = 1 - 0.45 * np.exp(-np.arange(n) / SR / 0.35)
        duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], e[:max(0, min(n, N - i0))])
    mix = music * duck * 0.85 + sfx * 1.0 + wet * 0.55
    mix = hp(mix, 28)
    if tilt:   # master tilt EQ: tame the sub, open the top
        mix = mix - 0.55 * lp(mix, 100) + 0.6 * bp(mix, 900, 5000) + 0.35 * hp(mix, 5000)
    mix = np.tanh(mix * 1.1) / 1.1
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.93
    f0, f1 = int((total - fade) * SR), int(total * SR)
    mix[:, f0:f1] *= np.linspace(1, 0, f1 - f0) ** 1.5
    mix[:, f1:] = 0
    wavfile.write(path, SR, (mix.T * 32767).astype(np.int16))
    print('wrote', path, mix.shape[1] / SR, 's, peak', peak)
