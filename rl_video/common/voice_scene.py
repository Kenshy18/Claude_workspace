"""ナレーションに同期してアニメーションを組むための Scene 基底クラス。

使い方:

    class MyScene(VoiceScene):
        def construct(self):
            with self.voice("まず{A}状態を考えます。{B}次に行動です。") as v:
                self.play(FadeIn(x), run_time=v.until("A"))
                self.play(Write(s))
                self.wait_to(v, "B")
                self.sfx("pop")
                self.play(Write(a))
            # with を抜けると、音声が終わるまで自動で待つ

字幕（.srt）は manim の subcaption 機能で文ごとに書き出される。
3D の場面には VoiceScene3D を使う（ThreeDScene のカメラ操作がそのまま使える）。
"""
from __future__ import annotations

from contextlib import contextmanager

from manim import MovingCameraScene, ThreeDScene, config

from . import audio
from . import style  # noqa: F401  背景色などの設定を反映させる
from . import tts

# 効果音の既定の音量（dB）。ナレーションより控えめに。
SFX_GAIN = {
    "pop": -14, "tick": -18, "chime": -10, "fall": -10, "whoosh": -16, "sparkle": -12,
    "thud": -12, "hit": -14,
}


class Tracker:
    def __init__(self, scene, narration: tts.Narration, start: float):
        self.scene = scene
        self.narration = narration
        self.start = start

    @property
    def duration(self) -> float:
        return self.narration.duration

    def at(self, mark: str) -> float:
        """ナレーション開始からブックマークまでの秒数。"""
        return self.narration.marks[mark]

    def until(self, mark: str, min_time: float = 0.25) -> float:
        """今からブックマークまでの秒数（最低 min_time）。"""
        return max(min_time, self.start + self.at(mark) - self.scene.time)

    def remaining(self, min_time: float = 0.25) -> float:
        return max(min_time, self.start + self.duration - self.scene.time)

    def elapsed(self) -> float:
        return self.scene.time - self.start


class VoiceMixin:
    #: with self.voice(...) を抜けたあとに置く「間」（秒）
    default_pad = 0.65

    @contextmanager
    def voice(self, markup: str, pad: float | None = None):
        n = tts.synthesize(markup)
        start = self.time
        self.add_sound(n.path)
        for s in n.sentences:
            self.add_subcaption(s["text"], duration=s["end"] - s["start"], offset=s["start"])
        tr = Tracker(self, n, start)
        yield tr
        pad = self.default_pad if pad is None else pad
        rest = start + n.duration + pad - self.time
        if rest > 1.0 / config.frame_rate:
            self.wait(rest)

    def say(self, markup: str, pad: float | None = None):
        """画面は止めたまま喋るだけ。"""
        with self.voice(markup, pad=pad):
            pass

    def wait_to(self, tr: Tracker, mark: str):
        t = tr.start + tr.at(mark) - self.time
        if t > 1.0 / config.frame_rate:
            self.wait(t)

    def play_to(self, tr: Tracker, mark: str, *anims, min_time: float = 0.3, **kw):
        """ブックマークの位置でちょうど終わるように再生する。"""
        self.play(*anims, run_time=tr.until(mark, min_time), **kw)

    def sfx(self, name: str, gain: float | None = None, offset: float = 0.0):
        """効果音を今の時刻（+offset 秒）に鳴らす。name は common/audio.py の一覧。"""
        g = SFX_GAIN.get(name, -12) if gain is None else gain
        self.add_sound(audio.sfx_path(name), time_offset=offset, gain=g)


class VoiceScene(VoiceMixin, MovingCameraScene):
    """2D の場面。self.camera.frame を動かしてズーム・パンができる。"""

    @property
    def frame(self):
        return self.camera.frame

    def focus_on(self, mob, height: float | None = None, scale: float | None = None, **kw):
        """カメラを mob に寄せるアニメーション（self.play(self.focus_on(g, height=4)) のように使う）。"""
        anim = self.camera.frame.animate(**kw).move_to(mob)
        if height is not None:
            anim = anim.set(height=height)
        elif scale is not None:
            anim = anim.scale(scale)
        return anim

    def reset_frame(self, **kw):
        from manim import ORIGIN
        return self.camera.frame.animate(**kw).move_to(ORIGIN).set(height=config.frame_height)


class VoiceScene3D(VoiceMixin, ThreeDScene):
    """3D の場面（価値の地形など）。"""
