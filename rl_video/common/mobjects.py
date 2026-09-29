"""シリーズ共通の図形部品。"""
from __future__ import annotations

import numpy as np
from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, UR, PI, Arc, Arrow, Circle, DecimalNumber, Dot,
                   Ellipse, Line, Rectangle, RoundedRectangle, Square, Star, Triangle, VGroup,
                   VMobject, interpolate_color, ManimColor, GREY_B, GREY_D, GREY_E, WHITE, BLACK,
                   RED, RED_E, YELLOW, BLUE_B, BLUE_D, BLUE_E, BLUE_C, Animation, Succession,
                   ApplyMethod, AnimationGroup, rate_functions, Polygon)

from . import style
from .rl import DELTA, GridMDP

ACTION_VEC = {a: np.array([dx, dy, 0.0]) for a, (dx, dy) in DELTA.items()}


# --------------------------------------------------------------------------
# エージェント（小さなロボット）
# --------------------------------------------------------------------------
class Robot(VGroup):
    """シリーズの主人公。丸い胴体に目が2つ。

    目線（look）、まばたき（blink）、表情（change）、跳ねる（hop）、吹き出し（say / think）で
    感情を表現できる。表情: "normal", "happy", "surprised", "sad", "worried", "determined"
    """

    def __init__(self, height=0.62, color=BLUE_D, **kw):
        super().__init__(**kw)
        h = height
        body = RoundedRectangle(width=1.1 * h, height=h, corner_radius=0.28 * h,
                                fill_color=color, fill_opacity=1, stroke_color=BLUE_E,
                                stroke_width=2)
        face = RoundedRectangle(width=0.82 * h, height=0.5 * h, corner_radius=0.2 * h,
                                fill_color="#10202A", fill_opacity=1, stroke_width=0)
        face.move_to(body.get_center() + 0.06 * h * UP)
        stem = Line(body.get_top(), body.get_top() + 0.2 * h * UP, stroke_color=GREY_E,
                    stroke_width=3)
        bulb = Circle(radius=0.07 * h, fill_color=style.REWARD, fill_opacity=1,
                      stroke_width=0).move_to(stem.get_end())
        self.body, self.face = body, face
        self.antenna = VGroup(stem, bulb)
        self._h = h
        self._look = np.zeros(3)
        self.mood = "normal"
        self.eyes, self.pupils, self.brows = self._make_eyes("normal")
        self.add(self.antenna, body, face, self.eyes, self.pupils, self.brows)

    # ---- 形の生成 ----------------------------------------------------------
    def _scale(self):
        return self.face.width / (0.82 * self._h)

    def _make_eyes(self, kind, look=None):
        h = self._h * self._scale()
        c = self.face.get_center()
        look = self._look if look is None else look
        eyes, pupils, brows = VGroup(), VGroup(), VGroup()
        for sgn in (-1, 1):
            ec = c + sgn * 0.19 * h * RIGHT
            if kind == "happy":
                e = Arc(radius=0.1 * h, start_angle=0, angle=PI, stroke_color=WHITE,
                        stroke_width=max(2.0, 7 * h), fill_opacity=0).move_to(ec + 0.02 * h * DOWN)
                p = Circle(radius=0.01 * h, fill_opacity=0, stroke_width=0).move_to(ec)
            else:
                r = 0.12 * h * (1.22 if kind == "surprised" else 1.0)
                e = Circle(radius=r, fill_color=WHITE, fill_opacity=1, stroke_width=0).move_to(ec)
                if kind in ("sad", "worried"):
                    e.stretch(0.78, 1).shift(0.015 * h * DOWN)
                if kind == "determined":
                    e.stretch(0.72, 1)
                pr = 0.065 * h * (0.62 if kind == "surprised" else 1.0)
                d = look if kind != "sad" else np.array([0, -1.0, 0])
                p = Circle(radius=pr, fill_color="#0B0B0D", fill_opacity=1, stroke_width=0)
                p.move_to(ec + 0.045 * h * d)
            # 眉（普段は見えない）
            if kind in ("sad", "worried"):
                a, b = ec + 0.15 * h * UP + sgn * 0.1 * h * RIGHT, ec + 0.2 * h * UP - sgn * 0.06 * h * RIGHT
                op = 1.0
            elif kind == "determined":
                a, b = ec + 0.2 * h * UP + sgn * 0.1 * h * RIGHT, ec + 0.13 * h * UP - sgn * 0.08 * h * RIGHT
                op = 1.0
            else:
                a, b = ec + 0.2 * h * UP + sgn * 0.1 * h * RIGHT, ec + 0.2 * h * UP - sgn * 0.08 * h * RIGHT
                op = 0.0
            br = Line(a, b, stroke_color=WHITE, stroke_width=max(1.5, 5 * h), stroke_opacity=op)
            eyes.add(e)
            pupils.add(p)
            brows.add(br)
        return eyes, pupils, brows

    # ---- 動き -------------------------------------------------------------
    def look(self, direction=ORIGIN):
        """目線を direction に向ける（ORIGIN で正面）。animate にも使える。"""
        d = np.array(direction, dtype=float)
        n = np.linalg.norm(d)
        if n > 0:
            d = d / n
        self._look = d
        if self.mood == "happy":
            return self
        h = self._h * self._scale()
        for e, p in zip(self.eyes, self.pupils):
            p.move_to(e.get_center() + 0.045 * h * d)
        return self

    def set_mood(self, kind):
        """表情を即座に変える（animate の中でも使える）。"""
        eyes, pupils, brows = self._make_eyes(kind)
        self.eyes.become(eyes)
        self.pupils.become(pupils)
        self.brows.become(brows)
        self.mood = kind
        return self

    def change(self, kind, run_time=0.45):
        """表情を変えるアニメーション。例: self.play(robot.change("happy"))"""
        return self.animate(run_time=run_time).set_mood(kind)

    def blink(self, run_time=0.25):
        eyes_and_pupils = VGroup(self.eyes, self.pupils)
        return Succession(
            ApplyMethod(eyes_and_pupils.stretch, 0.12, 1, run_time=run_time / 2),
            ApplyMethod(eyes_and_pupils.stretch, 1 / 0.12, 1, run_time=run_time / 2),
        )

    def hop(self, height=0.3, run_time=0.45):
        return self.animate(rate_func=rate_functions.there_and_back, run_time=run_time).shift(
            height * self._scale() * UP)

    def shake(self, run_time=0.5):
        from manim import Wiggle
        return Wiggle(self, scale_value=1.0, rotation_angle=0.08 * PI, n_wiggles=4, run_time=run_time)

    # ---- 吹き出し -----------------------------------------------------------
    def say(self, content, direction=UR, **kw):
        return Bubble(content, self, direction=direction, kind="speech", **kw)

    def think(self, content, direction=UR, **kw):
        return Bubble(content, self, direction=direction, kind="thought", **kw)

    def sweat(self):
        """冷や汗のしずく（別の図形として返す）。"""
        h = self._h * self._scale()
        drop = VGroup(
            Circle(radius=0.07 * h, fill_color=BLUE_B, fill_opacity=1, stroke_width=0),
            Triangle(fill_color=BLUE_B, fill_opacity=1, stroke_width=0).scale(0.06 * h).stretch(1.6, 1),
        )
        drop[1].next_to(drop[0], UP, buff=-0.035 * h)
        drop.next_to(self.body, UR, buff=-0.12 * h).shift(0.05 * h * LEFT)
        return drop


class Bubble(VGroup):
    """ロボットの吹き出し。content は文字列（日本語）か Mobject。"""

    def __init__(self, content, speaker: Robot, direction=UR, kind="speech", size=34,
                 color=WHITE, fill="#15151A", pad=0.28):
        super().__init__()
        if isinstance(content, str):
            content = style.jt(content, size=size, color=color)
        box = RoundedRectangle(width=content.width + 2 * pad, height=content.height + 2 * pad,
                               corner_radius=min(0.3, (content.height + 2 * pad) / 2.2),
                               stroke_color=GREY_B, stroke_width=2.5, fill_color=fill, fill_opacity=1)
        d = np.array(direction, dtype=float)
        box.next_to(speaker, d, buff=0.35)
        content.move_to(box)
        anchor = speaker.get_critical_point(d) * 0.6 + speaker.get_center() * 0.4
        near = box.get_critical_point(-np.sign(d) * np.array([1, 1, 0]))
        if kind == "speech":
            base = box.get_center() * 0.25 + near * 0.75
            perp = np.array([-(near - anchor)[1], (near - anchor)[0], 0])
            perp = perp / (np.linalg.norm(perp) + 1e-6) * 0.14
            tail = Polygon(base + perp, base - perp, anchor + (near - anchor) * 0.35,
                           stroke_color=GREY_B, stroke_width=2.5, fill_color=fill, fill_opacity=1)
            self.add(tail, box, content)
            # 境界線の継ぎ目を隠す
            cover = Line(base + perp * 0.9, base - perp * 0.9, stroke_color=fill, stroke_width=5)
            self.add(cover)
            self.remove(content)
            self.add(content)
        else:
            dots = VGroup(*[Circle(radius=r, stroke_color=GREY_B, stroke_width=2, fill_color=fill,
                                   fill_opacity=1) for r in (0.05, 0.08)])
            for k, dot in enumerate(dots):
                dot.move_to(anchor + (near - anchor) * (0.35 + 0.3 * k))
            self.add(dots, box, content)
        self.box, self.content = box, content

# --------------------------------------------------------------------------
# グリッドワールド
# --------------------------------------------------------------------------
def goal_icon(size=0.5):
    s = Star(n=5, outer_radius=size / 2, inner_radius=size / 4.6, fill_color=style.REWARD,
             fill_opacity=1, stroke_color=style.REWARD, stroke_width=1)
    return s


def pit_icon(size=0.62):
    hole = Ellipse(width=size, height=size * 0.62, fill_color="#050506", fill_opacity=1,
                   stroke_color=RED, stroke_width=3)
    inner = Ellipse(width=size * 0.7, height=size * 0.62 * 0.62, fill_color="#000000",
                    fill_opacity=1, stroke_width=0).move_to(hole.get_center() + 0.03 * DOWN)
    return VGroup(hole, inner)


class GridView(VGroup):
    """GridMDP を描く。s=(x, y) で y は上向き。"""

    def __init__(self, mdp: GridMDP, cell=1.15, stroke=GREY_D, show_terminal_labels=True,
                 **kw):
        super().__init__(**kw)
        self.mdp = mdp
        self.cell = cell
        self.cells = {}
        self.icons = {}
        W, H = mdp.width, mdp.height
        self.origin = np.array([-(W - 1) * cell / 2, -(H - 1) * cell / 2, 0])
        board = VGroup()
        for y in range(H):
            for x in range(W):
                sq = Square(side_length=cell, stroke_color=stroke, stroke_width=2,
                            fill_color=style.BG, fill_opacity=1)
                sq.move_to(self._pos((x, y)))
                if (x, y) in mdp.walls:
                    sq.set_fill("#3A3A40", 1).set_stroke(GREY_D, 2)
                board.add(sq)
                self.cells[(x, y)] = sq
        self.board = board
        self.add(board)
        term = VGroup()
        for s, r in mdp.terminals.items():
            icon = goal_icon(0.52 * cell) if r > 0 else pit_icon(0.62 * cell)
            icon.move_to(self._pos(s))
            if show_terminal_labels:
                lab = style.mt(f"{r:+.0f}", size=max(18, 26 * cell / 1.15), color=style.REWARD if r > 0 else RED)
                lab.next_to(icon, DOWN, buff=0.06 * cell)
                if r > 0:
                    lab.set_color(style.REWARD)
                else:
                    lab.set_color(RED)
                icon = VGroup(icon, lab)
                icon.move_to(self._pos(s))
            self.icons[s] = icon
            term.add(icon)
        self.terminal_icons = term
        self.add(term)

    def _pos(self, s):
        return self.origin + np.array([s[0] * self.cell, s[1] * self.cell, 0])

    def center_of(self, s):
        return self.cells[s].get_center()

    def arrow(self, s, a, color=style.ACTION, length=0.5, stroke_width=5, buff=0.0):
        c = self.center_of(s)
        v = ACTION_VEC[a] * self.cell * length / 2
        return Arrow(c - v, c + v, buff=buff, color=color, stroke_width=stroke_width,
                     max_tip_length_to_length_ratio=0.35,
                     max_stroke_width_to_length_ratio=12)

    def policy_arrows(self, policy: dict, color=style.POLICY, **kw):
        return VGroup(*[self.arrow(s, a, color=color, **kw) for s, a in policy.items()])

    def value_labels(self, V: dict, size=26, decimals=2, color=WHITE):
        labs = {}
        for s in self.mdp.states:
            if self.mdp.is_terminal(s):
                continue
            d = DecimalNumber(V[s], num_decimal_places=decimals, font_size=size, color=color,
                              include_sign=False)
            d.move_to(self.center_of(s))
            labs[s] = d
        return labs

    def nonterminal_states(self):
        return [s for s in self.mdp.states if not self.mdp.is_terminal(s)]


def value_color(v, vmax=1.0):
    """価値を色に。正は青緑、負は赤、0 は背景に近い暗さ。"""
    t = float(np.clip(abs(v) / vmax, 0, 1)) ** 0.8
    base = ManimColor("#16161A")
    if v >= 0:
        return interpolate_color(base, ManimColor("#2E8C79"), t)
    return interpolate_color(base, ManimColor("#9C3A34"), t)


# --------------------------------------------------------------------------
# 確率の棒グラフ（方策の表示などに使う）
# --------------------------------------------------------------------------
class ProbBars(VGroup):
    def __init__(self, probs, labels=None, width=2.4, height=1.6, colors=None,
                 label_size=24, bar_ratio=0.62, **kw):
        super().__init__(**kw)
        n = len(probs)
        self.width_, self.height_ = width, height
        self.slot = width / n
        colors = colors or [style.ACTION] * n
        self.baseline = Line(LEFT * width / 2, RIGHT * width / 2, stroke_color=GREY_D,
                             stroke_width=2)
        self.bars = VGroup()
        for i, p in enumerate(probs):
            b = Rectangle(width=self.slot * bar_ratio, height=max(1e-3, p * height),
                          fill_color=colors[i], fill_opacity=0.85, stroke_width=0)
            b.move_to(self._x(i) + UP * p * height / 2)
            self.bars.add(b)
        self.add(self.baseline, self.bars)
        self.labels = VGroup()
        if labels:
            for i, l in enumerate(labels):
                m = l if isinstance(l, VMobject) else style.jt(l, size=label_size)
                m.next_to(self._x(i), DOWN, buff=0.15)
                self.labels.add(m)
            self.add(self.labels)
        self.probs = list(probs)

    def _x(self, i):
        return self.baseline.get_left() + RIGHT * self.slot * (i + 0.5)

    def value_labels(self, size=26, fmt="{:.1f}", color=None):
        from manim import GREY_A
        return VGroup(*[style.mt(fmt.format(p), size=size, color=color or GREY_A).next_to(b, UP, buff=0.08)
                        for p, b in zip(self.probs, self.bars)])

    def set_probs(self, probs):
        for i, (b, p) in enumerate(zip(self.bars, probs)):
            h = max(1e-3, p * self.height_)
            b.stretch_to_fit_height(h)
            b.move_to(self._x(i) + UP * h / 2)
        self.probs = list(probs)
        return self


# --------------------------------------------------------------------------
# 光るもの
# --------------------------------------------------------------------------
def glow_dot(point, color=YELLOW, radius=0.12, layers=8, spread=3.2, opacity=0.45):
    """3Blue1Brown 風の、ぼんやり光る点。"""
    g = VGroup()
    for k in range(layers, 0, -1):
        r = radius * (1 + (spread - 1) * k / layers)
        g.add(Circle(radius=r, stroke_width=0, fill_color=color,
                     fill_opacity=opacity * (1 - k / (layers + 1)) ** 2 / layers * 3))
    g.add(Circle(radius=radius, stroke_width=0, fill_color=color, fill_opacity=1))
    return g.move_to(point)


def glow_copy(mob, color=None, layers=6, max_width=18, opacity=0.25):
    """線の図形に後光をつける（太くて薄いコピーを重ねる）。"""
    g = VGroup()
    base_w = max(mob.get_stroke_width(), 1)
    for k in range(layers, 0, -1):
        c = mob.copy().set_fill(opacity=0)
        c.set_stroke(color=color or mob.get_stroke_color(), width=base_w + max_width * k / layers,
                     opacity=opacity / layers * (layers - k + 1) / 2)
        g.add(c)
    return g
