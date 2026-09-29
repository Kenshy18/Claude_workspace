"""効果音と BGM を numpy で合成する（外部素材を使わないので権利の心配がない）。

    path = sfx_path("chime")           # .cache/sfx/chime.wav を作って返す
    make_bgm(seconds, seed, out_wav)   # 章の長さぶんのアンビエント BGM（ステレオ）

BGM は Dメジャーの I–vi–IV–V を、柔らかいパッドとエレピ風の音でゆっくり鳴らすだけの控えめなもの。
ナレーションの下で鳴らす前提なので、build.py 側でサイドチェインで音量を下げる。
"""
from __future__ import annotations

import pathlib
import subprocess
import wave

import numpy as np

from . import config

SR = 48000
SFX_DIR = config.CACHE_DIR / "sfx"
_VERSION = 2


# ---------------------------------------------------------------------------
# 基本部品
# ---------------------------------------------------------------------------
def _t(sec):
    return np.arange(int(SR * sec)) / SR


def _env(n, attack=0.005, decay=0.2, sustain=0.0, release=0.0, total=None):
    """アタック → 指数減衰（sustain まで）→ リリース。"""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = sustain + (1 - sustain) * np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4))
    e = a * d
    if release > 0 and total is not None:
        rel_start = total - release
        e *= np.clip((total - t) / release, 0, 1) ** 1.5 * (t >= rel_start) + (t < rel_start)
    return e


def _lowpass(x, cutoff):
    """1次のローパス（cutoff は Hz、配列でも可）。"""
    if np.isscalar(cutoff):
        from scipy.signal import lfilter
        alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([alpha], [1, alpha - 1], x)
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha[i] * (x[i] - acc)
        y[i] = acc
    return y


def _write(path, x: np.ndarray):
    """x: (n,) か (n, 2) の float。"""
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    x = np.asarray(x, dtype=float)
    ch = 1 if x.ndim == 1 else x.shape[1]
    y = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())


def _read(path) -> np.ndarray:
    with wave.open(str(path)) as w:
        ch = w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32767
    return x.reshape(-1, ch) if ch > 1 else x


def _norm(x, peak=0.9):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


# ---------------------------------------------------------------------------
# 効果音
# ---------------------------------------------------------------------------
def _pop():
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    f = 620 * (1.6 ** (t / 0.07))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * _env(n, 0.002, 0.035)
    return _norm(x, 0.7)


def _tick():
    n = int(SR * 0.05)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 2100 * t) * 0.6 + np.sin(2 * np.pi * 3300 * t) * 0.3) * _env(n, 0.001, 0.008)
    return _norm(x, 0.5)


def _bell(freq, dur=1.6, bright=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    partials = [(1.0, 1.0, 1.0), (2.0, 0.45 * bright, 0.55), (3.01, 0.2 * bright, 0.35),
                (4.2, 0.08 * bright, 0.2), (5.43, 0.05 * bright, 0.12)]
    x = np.zeros(n)
    for ratio, amp, dec in partials:
        x += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (dur * dec * 0.45))
    return x * _env(n, 0.003, 10.0)


def _chime():
    a = _bell(1318.5, 1.8)          # E6
    b = _bell(1975.5, 1.6, 0.8)     # B6
    x = np.zeros(int(SR * 2.0))
    x[:len(a)] += a
    off = int(SR * 0.09)
    x[off:off + len(b)] += 0.8 * b[: len(x) - off]
    return _norm(x, 0.6)


def _fall():
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    f = 520 * (90 / 520) ** (t / 0.6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * _env(n, 0.005, 0.35) * 0.6
    thump_n = int(SR * 0.25)
    tt = np.arange(thump_n) / SR
    thump = np.sin(2 * np.pi * 70 * tt) * np.exp(-tt / 0.08)
    s = int(SR * 0.42)
    x[s:s + thump_n] += thump[: n - s] * 0.9
    return _norm(x, 0.6)


def _whoosh():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    noise = rng.standard_normal(n)
    shape = np.sin(np.pi * np.clip(t / 0.6, 0, 1)) ** 2
    cutoff = 300 + 2500 * shape
    x = _lowpass(noise, cutoff) - _lowpass(_lowpass(noise, cutoff), 250)
    return _norm(x * shape, 0.45)


def _sparkle():
    x = np.zeros(int(SR * 1.4))
    notes = [1760.0, 2217.5, 2637.0, 3520.0]
    for k, f in enumerate(notes):
        b = _bell(f, 1.0, 0.6) * (0.9 - 0.12 * k)
        off = int(SR * 0.07 * k)
        x[off:off + len(b)] += b[: len(x) - off]
    return _norm(x, 0.45)


def _thud():
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (95 - 40 * t) * t) * np.exp(-t / 0.09)
    return _norm(x, 0.7)


def _soft_hit():
    """ラベルが出る・枠が付くときの柔らかい合図。"""
    return _norm(_bell(987.8, 0.7, 0.4) * 0.8, 0.45)


_SFX = {
    "pop": _pop, "tick": _tick, "chime": _chime, "fall": _fall, "whoosh": _whoosh,
    "sparkle": _sparkle, "thud": _thud, "hit": _soft_hit,
}


def sfx_path(name: str) -> str:
    p = SFX_DIR / f"{name}_v{_VERSION}.wav"
    if not p.exists():
        _write(p, _SFX[name]())
    return str(p)


# ---------------------------------------------------------------------------
# BGM
# ---------------------------------------------------------------------------
def _midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# D–Bm–G–A（I–vi–IV–V）。パッドの和音と、エレピが使う音。
_CHORDS = [
    dict(pad=[50, 57, 61, 64, 66], bass=38, mel=[74, 76, 78, 81, 73, 69]),   # Dmaj9
    dict(pad=[47, 54, 57, 61, 62], bass=35, mel=[73, 74, 78, 81, 71, 69]),   # Bm9
    dict(pad=[43, 50, 54, 57, 59], bass=31, mel=[74, 78, 79, 81, 71, 67]),   # Gmaj9
    dict(pad=[45, 52, 55, 59, 62], bass=33, mel=[73, 76, 79, 81, 74, 69]),   # A7sus/add9
]


def _pad_note(freq, dur, rng):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        f = freq * (1 + det)
        ph = rng.uniform(0, 2 * np.pi)
        # 帯域制限したノコギリ波（倍音 8 本まで）
        for h in range(1, 9):
            x += np.sin(2 * np.pi * f * h * t + ph * h) / h
    x = _lowpass(x / 3, 700)
    att, rel = 2.2, 2.8
    env = np.clip(t / att, 0, 1) * np.clip((dur - t) / rel, 0, 1)
    return x * env ** 1.3


def _ep_note(freq, dur, vel):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * freq * t) * np.exp(-t / 1.6)
         + 0.28 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.6)
         + 0.08 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t / 0.3))
    # FM 風の少しの金属感
    x += 0.06 * np.sin(2 * np.pi * freq * t + 1.2 * np.sin(2 * np.pi * freq * 14 * t) * np.exp(-t / 0.05))
    x *= np.clip(t / 0.004, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    return x * vel


def make_bgm(seconds: float, seed: int, out_wav: str | pathlib.Path) -> str:
    """seconds 秒のステレオ BGM を書き出す（キャッシュあり）。"""
    out_wav = pathlib.Path(out_wav)
    rng = np.random.default_rng(seed)
    beat = 60 / 66
    chord_len = 8 * beat  # 2小節
    n = int(SR * (seconds + 4))
    L = np.zeros(n)
    R = np.zeros(n)

    def add(sig, start, pan=0.0, gain=1.0):
        s = int(SR * start)
        if s >= n:
            return
        e = min(n, s + len(sig))
        gl = gain * np.cos((pan + 1) * np.pi / 4)
        gr = gain * np.sin((pan + 1) * np.pi / 4)
        L[s:e] += sig[: e - s] * gl
        R[s:e] += sig[: e - s] * gr

    t0 = 0.0
    k = 0
    while t0 < seconds + 2:
        ch = _CHORDS[k % 4]
        # パッド（和音を少し重ねてつなぐ）
        for j, m in enumerate(ch["pad"]):
            add(_pad_note(_midi(m), chord_len + 2.8, rng), t0, pan=(j - 2) * 0.25, gain=0.055)
        # ベース（やわらかいサイン）
        bn = int(SR * (chord_len + 1.5))
        bt = np.arange(bn) / SR
        bass = np.sin(2 * np.pi * _midi(ch["bass"]) * bt) * np.clip(bt / 1.5, 0, 1) * np.clip((chord_len + 1.5 - bt) / 2, 0, 1)
        add(bass, t0, gain=0.10)
        # エレピ（まばらなアルペジオ。8拍のうち 3〜5 音）
        slots = sorted(rng.choice(8, size=rng.integers(3, 6), replace=False))
        prev = None
        for s in slots:
            choices = [m for m in ch["mel"] if m != prev]
            m = int(rng.choice(choices))
            prev = m
            vel = rng.uniform(0.45, 0.8)
            start = t0 + s * beat + rng.normal(0, 0.012)
            add(_ep_note(_midi(m), 3.0, vel), max(0, start), pan=rng.uniform(-0.4, 0.4), gain=0.16)
        t0 += chord_len
        k += 1

    dry = np.stack([L, R], axis=1)[: int(SR * seconds)]
    fade = int(SR * 3)
    dry[:fade] *= np.linspace(0, 1, fade)[:, None]
    dry[-fade:] *= np.linspace(1, 0, fade)[:, None]
    dry = _norm(dry, 0.5)
    tmp = out_wav.with_suffix(".dry.wav")
    _write(tmp, dry)
    # sox のリバーブで空間を足す（リバーブ量, 減衰, 部屋の大きさ, …, ウェットのみにはしない）
    subprocess.run(["sox", str(tmp), str(out_wav), "reverb", "55", "50", "100", "100", "15", "0",
                    "gain", "-n", "-3"], check=True)
    tmp.unlink()
    return str(out_wav)
