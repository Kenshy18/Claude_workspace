"""シリーズ共通の図形部品。"""
from __future__ import annotations

import numpy as np
from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, Arrow, Circle, DecimalNumber, Dot, Ellipse,
                   Line, Rectangle, RoundedRectangle, Square, Star, VGroup, VMobject,
                   interpolate_color, ManimColor, GREY_D, GREY_E, WHITE, BLACK, RED, RED_E,
                   YELLOW, BLUE_D, BLUE_E, BLUE_C, Animation, Succession, ApplyMethod, AnimationGroup,
                   rate_functions, Polygon)

from . import style
from .rl import DELTA, GridMDP

ACTION_VEC = {a: np.array([dx, dy, 0.0]) for a, (dx, dy) in DELTA.items()}


# --------------------------------------------------------------------------
# エージェント（小さなロボット）
# --------------------------------------------------------------------------
class Robot(VGroup):
    """シリーズの主人公。丸い胴体に目が2つ。目線で「どこを見ているか」を表現できる。"""

    def __init__(self, height=0.62, color=BLUE_D, **kw):
        super().__init__(**kw)
        h = height
        body = RoundedRectangle(width=1.1 * h, height=h, corner_radius=0.28 * h,
                                fill_color=color, fill_opacity=1, stroke_color=BLUE_E,
                                stroke_width=2)
        face = RoundedRectangle(width=0.82 * h, height=0.5 * h, corner_radius=0.2 * h,
                                fill_color="#10202A", fill_opacity=1, stroke_width=0)
        face.move_to(body.get_center() + 0.06 * h * UP)
        eyes = VGroup()
        pupils = VGroup()
        for sgn in (-1, 1):
            e = Circle(radius=0.12 * h, fill_color=WHITE, fill_opacity=1, stroke_width=0)
            e.move_to(face.get_center() + sgn * 0.19 * h * RIGHT)
            p = Circle(radius=0.065 * h, fill_color="#0B0B0D", fill_opacity=1, stroke_width=0)
            p.move_to(e.get_center())
            eyes.add(e)
            pupils.add(p)
        stem = Line(body.get_top(), body.get_top() + 0.2 * h * UP, stroke_color=GREY_E,
                    stroke_width=3)
        bulb = Circle(radius=0.07 * h, fill_color=style.REWARD, fill_opacity=1,
                      stroke_width=0).move_to(stem.get_end())
        self.body, self.face, self.eyes, self.pupils = body, face, eyes, pupils
        self.antenna = VGroup(stem, bulb)
        self.add(self.antenna, body, face, eyes, pupils)
        self._h = h

    def look(self, direction=ORIGIN):
        """目線を direction に向ける（ORIGIN で正面）。"""
        d = np.array(direction, dtype=float)
        n = np.linalg.norm(d)
        if n > 0:
            d = d / n
        for e, p in zip(self.eyes, self.pupils):
            p.move_to(e.get_center() + 0.045 * self._h * d)
        return self

    def blink(self, run_time=0.25):
        eyes_and_pupils = VGroup(self.eyes, self.pupils)
        return Succession(
            ApplyMethod(eyes_and_pupils.stretch, 0.12, 1, run_time=run_time / 2),
            ApplyMethod(eyes_and_pupils.stretch, 1 / 0.12, 1, run_time=run_time / 2),
        )


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
