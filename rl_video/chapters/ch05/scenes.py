"""第5章「方策を直接動かす」— 方策勾配法。

レンダリング:  python tools/build.py ch05 [-q h]
画面に出る数値（1次元ガウス方策の更新、勾配推定値のヒストグラム、グリッドでの学習）は
chapters/ch05/helpers.py で実際に計算したもの。
"""
from __future__ import annotations

import numpy as np
from manim import *

from chapters.ch05 import helpers as H
from common import style
from common.mobjects import ACTION_VEC, GridView, ProbBars, Robot
from common.rl import ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene

CHAPTER_TITLE = "第5章 方策を直接動かす"

SCENES = [
    "Hook", "Title", "Parametrize", "ScoreFunction", "Intuition", "Causality", "Baseline",
    "ActorCritic", "Demo", "Outro",
]

WORLD = H.WORLD
GOAL, PIT = (4, 3), (4, 2)
GOOD = GREEN_C      # アドバンテージ正
BAD = RED           # アドバンテージ負
ENV_FILL = "#1c1c22"


# ---------------------------------------------------------------------------
# 共通の小道具
# ---------------------------------------------------------------------------
def arrow_glyph(a, color=GREY_B, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def cross_mark(size=0.5, color=RED, width=8):
    return VGroup(Line(UL, DR), Line(UR, DL)).set_stroke(color, width).scale(size / 2)


def gnode(tex, color=WHITE, w=1.25, size=56, h=1.15):
    m = mt(tex, size=size, color=color)
    box = RoundedRectangle(width=max(w, m.width + 0.5), height=h, corner_radius=0.16,
                           stroke_color=GREY_B, stroke_width=2.5)
    return VGroup(box, m.move_to(box))


class CompGraph(VGroup):
    """第1章の計算グラフ θ → π_θ → a → [環境] → r → J。"""

    def __init__(self, buff=0.7, size=56, **kw):
        super().__init__(**kw)
        self.theta = gnode(r"\theta", style.THETA, size=size)
        self.pi = gnode(r"\pi_\theta", style.POLICY, size=size)
        self.a = gnode("a", style.ACTION, size=size)
        env = RoundedRectangle(width=2.6, height=1.8, corner_radius=0.2, stroke_color=GREY_B,
                               stroke_width=2.5, fill_color=ENV_FILL, fill_opacity=1)
        self.env = VGroup(env, jt("環境", size=40, color=WHITE).move_to(env))
        self.r = gnode("r", style.REWARD, size=size)
        self.J = gnode("J", WHITE, size=size)
        self.nodes = VGroup(self.theta, self.pi, self.a, self.env, self.r, self.J).arrange(RIGHT, buff=buff)
        pairs = list(zip(self.nodes[:-1], self.nodes[1:]))
        self.fwd = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.08, color=GREY_B, stroke_width=4)
                            for a, b in pairs])
        self.back = VGroup(*[CurvedArrow(b.get_bottom() + 0.12 * DOWN + 0.15 * LEFT,
                                         a.get_bottom() + 0.12 * DOWN + 0.15 * RIGHT, angle=-1.2,
                                         color=RED, stroke_width=5, tip_length=0.22) for a, b in pairs])
        self.add(self.nodes, self.fwd)

    def dice(self):
        d = VGroup(*[Square(0.4, stroke_color=GREY_A, stroke_width=2, fill_color="#26262c", fill_opacity=1)
                     for _ in range(2)]).arrange(RIGHT, buff=0.16)
        pips = VGroup(*[Dot(radius=0.045, color=WHITE).move_to(x) for x in d])
        return VGroup(d, pips).move_to(self.env).shift(0.4 * DOWN)


def policy_glyphs(g: GridView, P, color=style.POLICY, scale=1.0):
    """各マスに、確率に比例した太さ・長さの4本の矢印（塗りつぶしの多角形）。"""
    grp = VGroup()
    c = g.cell * scale
    for s in g.nonterminal_states():
        i = WORLD.index[s]
        cell = VGroup()
        for a in ACTIONS:
            p = float(P[i, a])
            d = ACTION_VEC[a]
            n = np.array([-d[1], d[0], 0.0])
            start = g.center_of(s) + d * 0.07 * c
            L = c * (0.15 + 0.26 * p)
            w = c * (0.03 + 0.12 * p)
            hw = max(w * 2.1, c * 0.06)
            hl = min(L * 0.5, c * (0.06 + 0.1 * p))
            pts = [start + n * w / 2, start + d * (L - hl) + n * w / 2, start + d * (L - hl) + n * hw / 2,
                   start + d * L, start + d * (L - hl) - n * hw / 2, start + d * (L - hl) - n * w / 2,
                   start - n * w / 2]
            cell.add(Polygon(*pts, stroke_width=0, fill_color=color, fill_opacity=0.5 + 0.5 * p))
        grp.add(cell)
    return grp


def path_line(g: GridView, states, color=BLUE_B, width=4, opacity=1.0, jitter=0.0, seed=0):
    rng = np.random.default_rng(seed)
    pts = [g.center_of(s) + rng.uniform(-1, 1, 3) * jitter * g.cell * np.array([1, 1, 0]) for s in states]
    line = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    line.set_points_as_corners(pts)
    line.joint_type = LineJointType.ROUND
    return line


def token_chip(t, size=40, color=WHITE, stroke=GREY_C):
    txt = jt(t, size=size, color=color)
    box = RoundedRectangle(width=txt.width + 0.4, height=0.85 * size / 40, corner_radius=0.12,
                           stroke_color=stroke, stroke_width=1.5, fill_color="#16161A", fill_opacity=1)
    return VGroup(box, txt.move_to(box))


# ---------------------------------------------------------------------------
# 1次元ガウス方策の描画
# ---------------------------------------------------------------------------
class Line1D:
    """行動 x の数直線の上に、方策の山（紫）と報酬の曲線（黄）を描く。"""

    def __init__(self, xmin=-4.2, xmax=4.6, left=-6.2, right=6.2, y=-2.4, pdf_h=2.4, r_h=2.2):
        self.xmin, self.xmax = xmin, xmax
        self.sx = (right - left) / (xmax - xmin)
        self.left = left
        self.y = y
        self.pdf_scale = pdf_h / H.gauss_pdf(0.0, 0.0)
        self.r_h = r_h

    def X(self, x):
        return self.left + (x - self.xmin) * self.sx

    def pt(self, x, h=0.0):
        return np.array([self.X(x), self.y + h, 0.0])

    def axis(self, label=True):
        ln = Arrow(self.pt(self.xmin) + 0.1 * LEFT, self.pt(self.xmax) + 0.35 * RIGHT, buff=0,
                   color=GREY_B, stroke_width=3, max_tip_length_to_length_ratio=0.02)
        if not label:
            return VGroup(ln)
        lab = VGroup(jt("行動", size=30, color=style.ACTION), mt("x", size=40, color=style.ACTION))
        lab.arrange(RIGHT, buff=0.12).next_to(ln.get_end(), DOWN, buff=0.18).shift(0.35 * LEFT)
        return VGroup(ln, lab)

    def mountain(self, mu, color=style.POLICY):
        xs = np.linspace(mu - 4.2, mu + 4.2, 121)
        xs = xs[(xs >= self.xmin - 0.2) & (xs <= self.xmax + 0.2)]
        pts = [self.pt(x, self.pdf_scale * H.gauss_pdf(x, mu)) for x in xs]
        fill = Polygon(self.pt(xs[0]), *pts, self.pt(xs[-1]), stroke_width=0, fill_color=color,
                       fill_opacity=0.3)
        edge = VMobject(stroke_color=color, stroke_width=4).set_points_smoothly(pts)
        return VGroup(fill, edge)

    def reward_curve(self, shift_h=0.0, color=style.REWARD, width=4):
        xs = np.linspace(self.xmin, self.xmax, 121)
        pts = [self.pt(x, shift_h + self.r_h * H.reward_1d(x)) for x in xs]
        return VMobject(stroke_color=color, stroke_width=width).set_points_smoothly(pts)

    def sample_dot(self, x, r=None):
        col = GREY_B if r is None else interpolate_color(ManimColor(GREY_B), ManimColor(style.REWARD),
                                                           float(np.clip(r / 0.8, 0, 1)))
        return Dot(self.pt(x), radius=0.085, color=col)


def faded(mob, op):
    """不透明度を op 倍にしたコピー（Transform 用。set_opacity だと曲線の矢印が塗りつぶされるため）。"""
    t = mob.copy()
    for m in t.family_members_with_points():
        m.set_stroke(opacity=m.get_stroke_opacity() * op)
        m.set_fill(opacity=m.get_fill_opacity() * op)
    return t


def grow(m):
    return GrowArrow(m) if isinstance(m, Arrow) else FadeIn(m)


def weight_color(w):
    """重み（リターン）の色。0 に近いほど灰色、大きいほど黄色。"""
    return interpolate_color(ManimColor(GREY_C), ManimColor(style.REWARD), float(np.clip(w / 0.7, 0, 1)))


# ---------------------------------------------------------------------------
# 1. つかみ
# ---------------------------------------------------------------------------
class Hook(VoiceScene):
    def construct(self):
        G = CompGraph().move_to(0.5 * UP)
        dice = G.dice()
        with self.voice("第1章で、こんな図をお見せしました。{A}パラメータから報酬までの途中に、"
                        "微分できない環境が挟まっていて、{B}勾配の道が、途切れている。") as v:
            parts = [G.theta, G.fwd[0], G.pi, G.fwd[1], G.a, G.fwd[2], G.env, G.fwd[3], G.r, G.fwd[4], G.J]
            self.play(LaggedStart(*[FadeIn(m) for m in parts], lag_ratio=0.12), run_time=min(2.2, v.until("A")))
            self.wait_to(v, "A")
            self.play(Indicate(G.theta, color=style.THETA), Indicate(G.r, color=style.REWARD), run_time=0.9)
            self.play(G.env[0].animate.set_stroke(RED, 4), G.env[1].animate.shift(0.35 * UP), FadeIn(dice),
                      run_time=0.7)
            self.wait_to(v, "B")
            self.play(Create(G.back[4]), run_time=0.45)
            self.play(Create(G.back[3]), run_time=0.45)
            self.play(Create(G.back[2]), run_time=0.45)
            cross = cross_mark(0.55).move_to(G.back[2].point_from_proportion(0.5))
            self.play(Create(cross), Transform(G.back[2], faded(G.back[2], 0.3)), run_time=0.6)
            self.play(Wiggle(G.env), run_time=0.8)

        # 価値を経由する道（第2〜4章）
        qn = gnode("Q", style.VALUE, size=52).move_to(np.array([G.env.get_center()[0], -2.75, 0]))
        qn[0].set_stroke(style.VALUE, 3)
        q1 = CurvedArrow(G.r.get_bottom() + 0.1 * DOWN, qn.get_right() + 0.1 * RIGHT, angle=-0.9,
                         color=style.VALUE, stroke_width=5)
        q2 = CurvedArrow(qn.get_left() + 0.1 * LEFT, G.pi.get_bottom() + 0.1 * DOWN, angle=-0.9,
                         color=style.VALUE, stroke_width=5)
        q_lab = jt("価値ベース（第2〜4章）", size=30, color=style.VALUE).next_to(qn, DOWN, buff=0.2)
        amax = mt(r"\arg\max", size=42, color=style.VALUE).next_to(q2.point_from_proportion(0.5), DL, buff=0.08)
        detour = DashedVMobject(CurvedArrow(G.J.get_top() + 0.12 * UP, G.theta.get_top() + 0.12 * UP, angle=0.75,
                                            color=style.POLICY, stroke_width=6), num_dashes=40)
        qm = jt("？", size=56, color=style.POLICY).next_to(detour, UP, buff=0.05)
        with self.voice("前回までは、この道を避けて、価値を経由する方法を見てきました。"
                        "今回は、いよいよ、{A}この途切れた道を、正面から迂回します。") as v:
            broken = VGroup(G.back[2:], cross)
            broken_orig = broken.copy()
            self.play(Transform(broken, faded(broken, 0.3)), run_time=0.5)
            self.play(Create(q1), FadeIn(qn), run_time=1.0)
            self.play(Create(q2), FadeIn(amax), FadeIn(q_lab, shift=0.1 * UP), run_time=1.0)
            self.wait_to(v, "A")
            vpath = VGroup(qn, q1, q2, q_lab, amax)
            self.play(Transform(vpath, faded(vpath, 0.3)), Transform(broken, broken_orig), run_time=0.6)
            self.play(Create(detour), run_time=1.6)
            self.play(FadeIn(qm, scale=0.6), run_time=0.5)
        self.play(FadeOut(VGroup(G, G.back[2:], cross, dice, qn, q1, q2, q_lab, amax, detour, qm)), run_time=0.9)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 5, "方策を直接動かす", subtitle="方策勾配法")


# ---------------------------------------------------------------------------
# 3. 方策のパラメータ化（ソフトマックス）
# ---------------------------------------------------------------------------
ORDER = [A_UP, A_RIGHT, A_DOWN, A_LEFT]


def softmax(z):
    e = np.exp(np.asarray(z) - np.max(z))
    return e / e.sum()


class Parametrize(VoiceScene):
    def construct(self):
        s0 = (2, 0)
        g = GridView(WORLD, cell=0.76, show_terminal_labels=False).move_to(LEFT * 4.85 + 0.75 * DOWN)
        robot = Robot(height=0.4).move_to(g.center_of(s0))
        focus = SurroundingRectangle(g.cells[s0], color=style.STATE, stroke_width=5, buff=0.0)
        head = mt(r"\pi", r"_\theta", "(", "a", r"\mid", "s", ")", size=64)
        head[1].set_color(style.THETA)
        head.move_to(UP * 2.9)
        th_lab = jt("パラメータ", size=30, color=style.THETA).next_to(head, RIGHT, buff=0.5)

        with self.voice("まず、方策を、{A}パラメータで表します。") as v:
            self.play(FadeIn(g), FadeIn(robot), Create(focus), run_time=1.0)
            self.play(Write(head), run_time=v.until("A"))
            self.play(Indicate(head[1], color=style.THETA, scale_factor=1.6), FadeIn(th_lab, shift=0.1 * LEFT))

        # ロジット（桃）→ ソフトマックス → 確率（紫）
        z = ValueTracker(1.0)
        base_z = [0.5, None, -0.5, 0.0]

        def zs():
            return [base_z[0], z.get_value(), base_z[2], base_z[3]]

        zx0, zslot, zy, zs_ = -2.0, 0.8, -0.8, 0.8  # ロジット欄: 左端, 1本の幅, 0 の高さ, 1単位の高さ
        zcenters = [np.array([zx0 + zslot * (k + 0.5), zy, 0]) for k in range(4)]
        z_axis = Line(np.array([zx0, zy, 0]), np.array([zx0 + 4 * zslot, zy, 0]), stroke_color=GREY_D,
                      stroke_width=2)
        z_glyphs = VGroup(*[arrow_glyph(a, length=0.38).move_to(zcenters[k] + DOWN * 1.3)
                            for k, a in enumerate(ORDER)])

        def make_zbars():
            grp = VGroup()
            for k, val in enumerate(zs()):
                h = max(abs(val) * zs_, 0.01)
                r = Rectangle(width=zslot * 0.6, height=h, stroke_width=0, fill_color=style.THETA,
                              fill_opacity=0.85)
                r.move_to(zcenters[k] + (UP if val >= 0 else DOWN) * h / 2)
                num = DecimalNumber(val, num_decimal_places=1, include_sign=True, font_size=30, color=style.THETA)
                if val >= 0:
                    num.next_to(r, UP, buff=0.08)
                else:
                    num.next_to(r, DOWN, buff=0.08)
                grp.add(VGroup(r, num))
            return grp

        z_title = VGroup(jt("ロジット", size=32, color=style.THETA), mt("z", size=44, color=style.THETA))
        z_title.arrange(RIGHT, buff=0.15).move_to(np.array([zx0 + 2 * zslot, 1.95, 0]))

        pb_center = np.array([4.4, -1.3, 0])

        def make_pbars():
            p = softmax(zs())
            bars = ProbBars(list(p), labels=[arrow_glyph(a, length=0.4) for a in ORDER], width=3.8,
                            height=3.2, colors=[style.POLICY] * 4)
            bars.shift(pb_center - bars.baseline.get_center())
            vals = VGroup(*[DecimalNumber(pp, num_decimal_places=2, font_size=30, color=GREY_A).next_to(b, UP, buff=0.08)
                            for pp, b in zip(p, bars.bars)])
            return VGroup(bars, vals)

        p_title = VGroup(jt("確率", size=32, color=style.POLICY), mt(r"\pi_\theta(a\mid s)", size=40))
        p_title.arrange(RIGHT, buff=0.15).move_to(np.array([pb_center[0], 1.95, 0]))
        link = DashedLine(focus.get_right(), np.array([zx0 - 0.15, zy, 0]), color=GREY_C, stroke_width=2.5)
        sm_arrow = Arrow(np.array([zx0 + 4 * zslot + 0.15, zy, 0]), np.array([2.35, zy, 0]), buff=0,
                         color=GREY_B, stroke_width=5)
        sm_lab = mt(r"\mathrm{softmax}", size=34, color=GREY_B).next_to(sm_arrow, DOWN, buff=0.15)
        formula = mt(r"\pi", r"_\theta", "(", "a", r"\mid", "s", ")", "=",
                     r"{\exp(z_a) \over \sum_b \exp(z_b)}", size=52)
        formula[1].set_color(style.THETA)
        formula.move_to(UP * 2.9)

        zbars_static = make_zbars()
        pbars_static = make_pbars()
        with self.voice("各行動に、{A}ロジットと呼ばれる、好き嫌いの点数を割り当てて、{B}ソフトマックスで確率に変換します。"
                        "分類モデルの出力層と、まったく同じです。") as v:
            self.play(FadeOut(th_lab), run_time=0.4)
            self.wait_to(v, "A")
            self.play(Create(link), FadeIn(z_title), Create(z_axis), FadeIn(z_glyphs), run_time=0.8)
            self.play(LaggedStart(*[GrowFromEdge(b[0], DOWN if val >= 0 else UP) for b, val in zip(zbars_static, zs())],
                                  lag_ratio=0.15),
                      LaggedStart(*[FadeIn(b[1]) for b in zbars_static], lag_ratio=0.15), run_time=1.2)
            self.wait_to(v, "B")
            self.play(GrowArrow(sm_arrow), FadeIn(sm_lab), run_time=0.7)
            self.play(FadeIn(pbars_static[0]), FadeIn(p_title), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(x) for x in pbars_static[1]], lag_ratio=0.1), run_time=0.6)
            self.play(TransformMatchingTex(head, formula), run_time=1.2)

        zbars = always_redraw(make_zbars)
        pbars = always_redraw(make_pbars)
        self.remove(*zbars_static.get_family(), *pbars_static.get_family())
        self.add(zbars, pbars)
        total = VGroup(jt("合計", size=30, color=GREY_B), mt("=", size=38, color=GREY_B),
                       DecimalNumber(1.0, num_decimal_places=2, font_size=38, color=WHITE))
        total.arrange(RIGHT, buff=0.15).move_to(np.array([pb_center[0], -2.95, 0]))
        total[2].add_updater(lambda d: d.set_value(float(softmax(zs()).sum())))
        with self.voice("{A}右のロジットを上げれば、右を選ぶ確率が上がり、{B}ほかの確率は、そのぶん下がります。"
                        "確率の合計は、いつも1です。") as v:
            self.wait_to(v, "A")
            self.play(z.animate.set_value(2.6), run_time=max(1.2, v.until("B") - 0.1))
            self.wait_to(v, "B")
            downs = VGroup(*[Arrow(UP * 0.3, DOWN * 0.3, buff=0, color=GREY_A, stroke_width=4)
                             .next_to(pbars[0].bars[i], RIGHT, buff=0.04).shift(0.1 * UP) for i in (0, 2, 3)])
            self.play(FadeIn(downs, shift=0.15 * DOWN), run_time=0.6)
            self.play(FadeIn(total), run_time=0.6)
            self.play(FadeOut(downs), run_time=0.4)
            self.play(z.animate.set_value(0.2), run_time=1.3)
            self.play(z.animate.set_value(1.6), run_time=1.0)
            self.play(Indicate(total, color=WHITE), run_time=0.8)
        total[2].clear_updaters()
        zbars.clear_updaters()
        pbars.clear_updaters()

        # ニューラルネット or 表
        panel = VGroup(zbars, pbars, z_axis, z_glyphs, z_title, p_title, sm_arrow, sm_lab, total, link)
        net = tiny_network().scale(0.85)
        s_in = VGroup(jt("状態", size=30, color=style.STATE), mt("s", size=42)).arrange(RIGHT, buff=0.1)
        z_out = mt("z", size=48, color=style.THETA)
        nn = VGroup(s_in, net, z_out).arrange(RIGHT, buff=0.45)
        a1 = Arrow(s_in.get_right(), net.get_left(), buff=0.1, color=GREY_C, stroke_width=3)
        a2 = Arrow(net.get_right(), z_out.get_left(), buff=0.1, color=GREY_C, stroke_width=3)
        nn_lab = jt("ニューラルネット", size=32, color=GREY_A)
        nn_grp = VGroup(nn, a1, a2)
        nn_lab.next_to(nn_grp, DOWN, buff=0.35)
        left = VGroup(nn_grp, nn_lab).move_to(LEFT * 2.4 + 0.2 * DOWN)

        tg = GridView(WORLD, cell=0.62, show_terminal_labels=False)
        chips = VGroup()
        rng = np.random.default_rng(5)
        for st in tg.nonterminal_states():
            c = tg.center_of(st)
            for k, dvec in enumerate([UP, RIGHT, DOWN, LEFT]):
                chips.add(Square(0.12, stroke_width=0, fill_color=style.THETA,
                                 fill_opacity=0.35 + 0.6 * rng.random()).move_to(c + dvec * 0.16))
        tab = VGroup(tg, chips)
        tab_lab = jt("マスごとの表", size=32, color=GREY_A).next_to(tab, DOWN, buff=0.35)
        right = VGroup(tab, tab_lab).move_to(RIGHT * 3.6 + 0.2 * DOWN)
        or_t = jt("または", size=30, color=GREY_C).move_to((left.get_right() + right.get_left()) / 2)

        upd = mt(r"\theta", r"\leftarrow", r"\theta", "+", r"\alpha", r"\nabla_\theta", "J(", r"\theta", ")", size=64)
        for i in (0, 2, 7):
            upd[i].set_color(style.THETA)
        upd.move_to(DOWN * 0.6)
        up_lab = jt("期待リターンが大きくなる方向へ", size=32, color=GREY_B).next_to(upd, DOWN, buff=0.5)
        with self.voice("ロジットは、状態を入力とするニューラルネットで計算してもいいですし、"
                        "この小さな世界なら、マスごとの表でも構いません。いずれにしても、目標は一つ。"
                        "{A}期待リターン[J|ジェー]が大きくなる方向に、パラメータを動かすことです。") as v:
            self.play(FadeOut(panel), FadeOut(VGroup(g, robot, focus)), formula.animate.scale(0.8).to_edge(UP, buff=0.35),
                      run_time=0.9)
            self.play(FadeIn(nn_grp, shift=0.2 * RIGHT), FadeIn(nn_lab), run_time=1.0)
            self.play(FadeIn(or_t), FadeIn(tab), FadeIn(tab_lab), run_time=1.0)
            self.play(LaggedStart(*[Indicate(c, color=style.THETA, scale_factor=1.6) for c in chips[::6]],
                                  lag_ratio=0.05), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeOut(VGroup(left, right, or_t)), run_time=0.6)
            self.play(Write(upd), run_time=1.2)
            self.play(FadeIn(up_lab, shift=0.1 * UP), run_time=0.6)
        self.play(FadeOut(VGroup(formula, upd, up_lab)), run_time=0.8)


def tiny_network(layers=(4, 6, 4), width=2.2, height=2.2, color=GREY_B):
    cols = VGroup()
    for k, n in enumerate(layers):
        col = VGroup(*[Circle(0.1, stroke_color=color, stroke_width=2, fill_color=BLACK, fill_opacity=1)
                       for _ in range(n)])
        col.arrange(DOWN, buff=(height - n * 0.2) / max(n - 1, 1))
        col.move_to(RIGHT * (k - (len(layers) - 1) / 2) * width / (len(layers) - 1))
        cols.add(col)
    edges = VGroup()
    for a, b in zip(cols[:-1], cols[1:]):
        for c1 in a:
            for c2 in b:
                edges.add(Line(c1.get_center(), c2.get_center(), stroke_width=0.8, stroke_color=GREY_D))
    return VGroup(edges, cols)


# ---------------------------------------------------------------------------
# 4. 対数微分トリック（この章の山場）
# ---------------------------------------------------------------------------
TRAJ_START = (4, 0)
TRAJ_EPISODES = 30  # 学習途中（Actor-Critic 30 エピソード後）の方策で、右下のマスから出発


def traj_color(R):
    if R >= 0:
        return interpolate_color(ManimColor("#6b5d1a"), ManimColor(style.REWARD), float(np.clip(R / 0.75, 0, 1)))
    return interpolate_color(ManimColor("#5a2320"), ManimColor(RED), float(np.clip(-R / 0.8, 0, 1)))


class ScoreFunction(VoiceScene):
    def construct(self):
        theta0 = H.actor_critic(episodes=TRAJ_EPISODES, lr_actor=1.0, lr_critic=0.3, seed=0,
                                snap_every=TRAJ_EPISODES)["theta"]
        trajs = H.top_trajectories(H.softmax_rows(theta0), k=24, max_len=14, start=TRAJ_START)
        gdir = H.exact_grad(theta0, start=TRAJ_START)
        gdir = gdir / np.linalg.norm(gdir)
        eps = ValueTracker(0.0)

        def probs_at(e):
            P = H.softmax_rows(theta0 + e * gdir)
            return np.array([H.traj_prob(P, t[2]) for t in trajs])

        E_UP, E_DN = 0.5, -0.4
        pmax = max(probs_at(e).max() for e in (E_DN, 0.0, E_UP))
        n = len(trajs)
        x0, x1, yb, hmax = -6.3, 6.3, -3.0, 2.6
        slot = (x1 - x0) / (n + 1.2)

        def bar_x(i):
            return x0 + slot * (i + 0.5)

        def make_bars():
            ps = probs_at(eps.get_value())
            grp = VGroup()
            for i, (p, t) in enumerate(zip(ps, trajs)):
                h = max(hmax * p / pmax, 0.004)
                r = Rectangle(width=slot * 0.72, height=h, stroke_width=0, fill_color=traj_color(t[1]),
                              fill_opacity=1)
                r.move_to(np.array([bar_x(i), yb + h / 2, 0]))
                grp.add(r)
            return grp

        base = Line(np.array([x0 - 0.1, yb, 0]), np.array([x1, yb, 0]), stroke_color=GREY_C, stroke_width=2)
        dots = mt(r"\cdots", size=44, color=GREY_B).move_to(np.array([bar_x(n) + 0.15, yb + 0.25, 0]))
        x_lab = VGroup(jt("ありうる軌跡", size=30, color=GREY_B), mt(r"\tau", size=40, color=GREY_B))
        x_lab.arrange(RIGHT, buff=0.15).next_to(base, DOWN, buff=0.2)
        y_lab = mt(r"p_\theta(\tau)", size=40, color=GREY_A).move_to(np.array([bar_x(0) + 0.9, yb + hmax - 0.1, 0]))
        legend = VGroup(
            VGroup(Square(0.26, fill_color=style.REWARD, fill_opacity=1, stroke_width=0), jt("星", size=28, color=GREY_A)).arrange(RIGHT, buff=0.12),
            VGroup(Square(0.26, fill_color=RED, fill_opacity=1, stroke_width=0), jt("穴", size=28, color=GREY_A)).arrange(RIGHT, buff=0.12),
        ).arrange(RIGHT, buff=0.35)
        legend_t = VGroup(mt(r"R(\tau)", size=34, color=style.REWARD), mt(":", size=34), legend).arrange(RIGHT, buff=0.18)
        legend_t.move_to(np.array([3.9, yb + hmax - 0.1, 0]))

        # 右上: 軌跡のミニ表示
        mg = GridView(WORLD, cell=0.56, show_terminal_labels=False).move_to(np.array([5.05, 2.5, 0]))
        mstart = Robot(height=0.3).move_to(mg.center_of(TRAJ_START))

        eq1 = mt("J(", r"\theta", ")", "=", r"\sum_\tau", r"p_\theta(\tau)", r"R(\tau)", size=58)
        eq1[1].set_color(style.THETA)
        eq1[6].set_color(style.REWARD)
        eq1.move_to(np.array([0, 2.75, 0])).to_edge(LEFT, buff=0.55)

        bars_static = make_bars()
        with self.voice("期待リターンを、{A}ありうるすべての軌跡についての和で書いてみます。"
                        "それぞれの軌跡が起きる確率に、その軌跡のリターンを掛けて、足し合わせたものです。") as v:
            self.play(Write(eq1[:4]), Create(base), FadeIn(mg), FadeIn(mstart), run_time=1.0)
            self.wait_to(v, "A")
            self.play(Write(eq1[4]), LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars_static], lag_ratio=0.04),
                      FadeIn(dots), FadeIn(x_lab), run_time=1.6)
            self.play(Write(eq1[5]), FadeIn(y_lab), run_time=0.7)
            self.play(Write(eq1[6]), FadeIn(legend_t), run_time=0.7)
            for k in (0, 1):
                t = trajs[k]
                states = [t[2][0][0]] + [x[3] for x in t[2]]
                line = path_line(mg, states, color=traj_color(t[1]), width=6, jitter=0.08, seed=k)
                hl = SurroundingRectangle(bars_static[k], color=WHITE, buff=0.05, stroke_width=2.5)
                self.play(Create(hl), Create(line), run_time=0.8)
                self.play(Indicate(eq1[5], color=WHITE), Indicate(eq1[6], color=style.REWARD), run_time=0.8)
                self.play(FadeOut(hl), FadeOut(line), run_time=0.4)

        bars = always_redraw(make_bars)
        self.remove(*bars_static.get_family())
        self.add(bars)
        eq2 = mt(r"\nabla_\theta J(", r"\theta", ")", "=", r"\sum_\tau", r"\nabla_\theta p_\theta(\tau)", r"R(\tau)", size=58)
        eq2[1].set_color(style.THETA)
        eq2[6].set_color(style.REWARD)
        eq2.next_to(eq1, DOWN, buff=0.45).align_to(eq1, LEFT)
        with self.voice("軌跡の確率は、{A}方策のパラメータによって変わります。だから、パラメータで微分すると、"
                        "{B}確率の微分が出てきます。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(eq1[1], color=style.THETA, scale_factor=1.6), run_time=0.6)
            self.play(eps.animate.set_value(E_UP), run_time=1.1)
            self.play(eps.animate.set_value(E_DN), run_time=1.3)
            self.play(eps.animate.set_value(0.0), run_time=0.8)
            bars.clear_updaters()
            self.wait_to(v, "B")
            self.play(TransformMatchingTex(eq1.copy(), eq2), run_time=1.3)
            self.play(Circumscribe(eq2[5], color=WHITE), run_time=1.0)

        # 期待値の形ではない
        tmpl = mt(r"\mathbb{E}_{\tau\sim p_\theta}[f]", "=", r"\sum_\tau", r"p_\theta(\tau)", r"f(\tau)", size=44,
                  color=GREY_A)
        tmpl.next_to(eq2, RIGHT, buff=0.7)
        tmpl_lab = jt("期待値の形", size=28, color=GREY_B).next_to(tmpl, UP, buff=0.15)
        with self.voice("ここで困ったことがあります。この式は、{A}すべての軌跡についての和で、期待値の形をしていません。"
                        "つまり、実際にロボットを走らせて得たサンプルの平均で、{B}代わりにすることができないんです。") as v:
            self.play(FadeOut(VGroup(mg, mstart, legend_t)), run_time=0.5)
            self.wait_to(v, "A")
            self.play(Indicate(eq2[4], color=WHITE, scale_factor=1.3),
                      LaggedStart(*[Indicate(b, color=WHITE, scale_factor=1.15) for b in bars], lag_ratio=0.05),
                      run_time=1.5)
            self.play(FadeIn(tmpl), FadeIn(tmpl_lab), run_time=0.8)
            self.play(Indicate(tmpl[3], color=WHITE, scale_factor=1.3), Indicate(eq2[5], color=RED, scale_factor=1.2),
                      run_time=1.2)
            self.wait_to(v, "B")
            crs = cross_mark(0.8).move_to(tmpl)
            self.play(Create(crs), run_time=0.5)

        # 対数微分トリック
        self.play(FadeOut(VGroup(bars, base, dots, y_lab, x_lab, tmpl, tmpl_lab, crs)), run_time=0.7)
        t1 = mt(r"\nabla_\theta \log p_\theta(\tau)", "=", r"{\nabla_\theta p_\theta(\tau) \over p_\theta(\tau)}", size=56)
        t1.move_to(DOWN * 0.7)
        t2 = mt(r"\nabla_\theta p_\theta(\tau)", "=", r"p_\theta(\tau)", r"\nabla_\theta \log p_\theta(\tau)", size=60)
        t2.move_to(DOWN * 2.3)
        t2_box = SurroundingRectangle(t2, color=style.POLICY, buff=0.25, corner_radius=0.1)
        hint = mt(r"(\log x)' = \dfrac{x'}{x}", size=46, color=GREY_B).next_to(t1, RIGHT, buff=0.8)
        with self.voice("そこで、一つトリックを使います。{A}対数の微分は、元の関数の微分を、元の関数で割ったもの。"
                        "これを並べ替えると、{B}確率の微分は、確率かける、対数確率の微分、と書けます。") as v:
            self.wait_to(v, "A")
            self.play(Write(t1), run_time=1.4)
            self.play(FadeIn(hint, shift=0.1 * LEFT), run_time=0.6)
            self.wait_to(v, "B")
            self.play(TransformMatchingShapes(t1.copy(), t2), run_time=1.6)
            self.play(Create(t2_box), run_time=0.6)

        eq3 = mt(r"\nabla_\theta J(", r"\theta", ")", "=", r"\sum_\tau", r"p_\theta(\tau)",
                 r"\nabla_\theta \log p_\theta(\tau)", r"R(\tau)", size=58)
        eq3[1].set_color(style.THETA)
        eq3[7].set_color(style.REWARD)
        eq3.move_to(eq2).align_to(eq2, LEFT)
        eq4 = mt(r"\nabla_\theta J(", r"\theta", ")", "=", r"\mathbb{E}_{\tau\sim p_\theta}", r"\big[",
                 r"\nabla_\theta \log p_\theta(\tau)", r"R(\tau)", r"\big]", size=58)
        eq4[1].set_color(style.THETA)
        eq4[7].set_color(style.REWARD)
        eq4.move_to(DOWN * 0.4)
        est = mt(r"\approx", r"{1 \over N}\sum_{i=1}^{N}", r"\nabla_\theta \log p_\theta(\tau_i)", r"R(\tau_i)",
                 size=50)
        est[3].set_color(style.REWARD)
        est.next_to(eq4, DOWN, buff=0.55).align_to(eq4[3], LEFT)
        check = VGroup(Line(LEFT * 0.2 + UP * 0.02, DOWN * 0.2), Line(DOWN * 0.2, UR * 0.35)).set_stroke(GOOD, 8)
        check.next_to(est, RIGHT, buff=0.4)
        trick_lab = jt("対数微分トリック", size=34, color=style.POLICY)
        with self.voice("これを代入すると、{A}確率が、外に出てきました。確率を掛けて足しているので、これは、{B}期待値です。"
                        "サンプルの平均で、推定できる形に{C}戻ったわけです。対数微分トリック、と呼ばれています。") as v:
            self.play(FadeOut(hint), FadeOut(t1), run_time=0.5)
            self.play(FadeOut(eq2[5]), TransformFromCopy(t2[2], eq3[5]), TransformFromCopy(t2[3], eq3[6]),
                      ReplacementTransform(eq2[:5], eq3[:5]), ReplacementTransform(eq2[6], eq3[7]), run_time=1.4)
            self.wait_to(v, "A")
            self.play(Indicate(eq3[5], color=WHITE, scale_factor=1.3), run_time=0.9)
            self.play(FadeOut(VGroup(t2, t2_box)), FadeOut(eq1), eq3.animate.move_to(UP * 2.4), run_time=0.8)
            self.wait_to(v, "B")
            eq4.move_to(UP * 0.9)
            sp = SurroundingRectangle(eq3[4:6], color=WHITE, buff=0.1)
            self.play(Create(sp), run_time=0.4)
            self.play(TransformFromCopy(eq3[:4], eq4[:4]), TransformFromCopy(eq3[4:6], eq4[4]),
                      TransformFromCopy(eq3[6], eq4[6]), TransformFromCopy(eq3[7], eq4[7]),
                      FadeIn(eq4[5]), FadeIn(eq4[8]), run_time=1.3)
            est.next_to(eq4, DOWN, buff=0.6).align_to(eq4[3], LEFT)
            check.next_to(est, RIGHT, buff=0.4)
            self.wait_to(v, "C")
            self.play(FadeIn(est, shift=0.1 * DOWN), run_time=0.8)
            self.play(Create(check), run_time=0.4)
            trick_lab.next_to(est, DOWN, buff=0.7)
            self.play(FadeIn(trick_lab, shift=0.1 * UP), FadeOut(sp), run_time=0.6)

        # 軌跡の確率を分解
        top = eq4
        self.play(FadeOut(VGroup(eq3, est, check, trick_lab)), top.animate.scale(0.82).to_edge(UP, buff=0.35),
                  run_time=0.9)
        top_box = SurroundingRectangle(top[6], color=style.POLICY, buff=0.08)

        # 軌跡の鎖: ρ → s0 →π→ a0 →P→ s1 →π→ a1 →P→ s2 …
        toks = VGroup(mt("s_0", size=48), mt("a_0", size=48), mt("s_1", size=48), mt("a_1", size=48),
                      mt("s_2", size=48), mt(r"\cdots", size=48))
        for k in (0, 2, 4):
            toks[k].set_color(style.STATE)
        for k in (1, 3):
            toks[k].set_color(style.ACTION)
        toks.arrange(RIGHT, buff=1.25).move_to(UP * 1.75 + RIGHT * 0.6)
        links = VGroup()
        link_labs = VGroup()
        for k in range(5):
            ar = Arrow(toks[k].get_right(), toks[k + 1].get_left(), buff=0.12, stroke_width=4,
                       color=style.POLICY if k % 2 == 0 else GREY_B)
            links.add(ar)
            if k < 4:
                lab = mt(r"\pi_\theta" if k % 2 == 0 else "P", size=38,
                         color=style.POLICY if k % 2 == 0 else GREY_A).next_to(ar, UP, buff=0.08)
                link_labs.add(lab)
        rho_ar = Arrow(toks[0].get_left() + LEFT * 1.1, toks[0].get_left(), buff=0.12, stroke_width=4, color=GREY_B)
        rho_lab = mt(r"\rho", size=38, color=GREY_A).next_to(rho_ar, UP, buff=0.08)
        pi_group = VGroup(links[0], links[2], link_labs[0], link_labs[2])
        env_group = VGroup(links[1], links[3], link_labs[1], link_labs[3])

        prod = mt(r"p_\theta(\tau)", "=", r"\rho(s_0)", r"\prod_t", r"\pi_\theta(a_t \mid s_t)",
                  r"P(s_{t+1} \mid s_t, a_t)", size=48)
        prod[4].set_color(style.POLICY)
        prod.move_to(UP * 0.45)

        def row(lhs, sign, term, color):
            m = mt(lhs, sign, term, size=48)
            m[2].set_color(color)
            return m

        rows = VGroup(row(r"\log p_\theta(\tau)", "=", r"\log \rho(s_0)", GREY_A),
                      row(r"\phantom{\log p_\theta(\tau)}", "+", r"\sum_t \log \pi_\theta(a_t \mid s_t)", style.POLICY),
                      row(r"\phantom{\log p_\theta(\tau)}", "+", r"\sum_t \log P(s_{t+1} \mid s_t, a_t)", GREY_A))
        rows.arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to(DOWN * 2.2)
        for r in rows[1:]:
            r.shift((rows[0][1].get_center()[0] - r[1].get_center()[0]) * RIGHT)
        for r in rows:
            r[2].next_to(r[1], RIGHT, buff=0.25)

        with self.voice("次に、軌跡の対数確率を、中身に分解してみましょう。軌跡の確率は、最初の状態の確率と、"
                        "{A}方策が行動を選ぶ確率と、{B}環境が次の状態を選ぶ確率の、掛け算です。{C}対数を取ると、足し算になります。") as v:
            self.play(Create(top_box), run_time=0.5)
            self.play(LaggedStart(FadeIn(rho_ar), FadeIn(rho_lab), *[FadeIn(t) for t in toks],
                                  *[GrowArrow(l) for l in links], lag_ratio=0.08), run_time=1.6)
            self.play(Write(prod[:3]), Indicate(rho_lab, color=WHITE), run_time=v.until("A"))
            self.play(Write(prod[3:5]), Indicate(pi_group, color=style.POLICY, scale_factor=1.15),
                      FadeIn(link_labs[0]), FadeIn(link_labs[2]), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Write(prod[5]), FadeIn(link_labs[1]), FadeIn(link_labs[3]), run_time=0.8)
            self.play(Indicate(env_group, color=WHITE, scale_factor=1.15), run_time=0.8)
            self.wait_to(v, "C")
            self.play(LaggedStart(*[FadeIn(r, shift=0.15 * DOWN) for r in rows], lag_ratio=0.3), run_time=1.5)

        grows = VGroup(row(r"\nabla_\theta \log p_\theta(\tau)", "=", r"\nabla_\theta \log \rho(s_0)", GREY_A),
                       row(r"\phantom{\nabla_\theta \log p_\theta(\tau)}", "+",
                           r"\sum_t \nabla_\theta \log \pi_\theta(a_t \mid s_t)", style.POLICY),
                       row(r"\phantom{\nabla_\theta \log p_\theta(\tau)}", "+",
                           r"\sum_t \nabla_\theta \log P(s_{t+1} \mid s_t, a_t)", GREY_A))
        grows.arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        for r in grows[1:]:
            r.shift((grows[0][1].get_center()[0] - r[1].get_center()[0]) * RIGHT)
        for r in grows:
            r[2].next_to(r[1], RIGHT, buff=0.25)
        grows.move_to(DOWN * 1.35)
        zeros = VGroup(*[mt("0", size=52, color=GREY_B).move_to(grows[k][2]) for k in (0, 2)])
        no_th = VGroup(*[jt("θ を含まない", size=28, color=GREY_B).next_to(grows[k], RIGHT, buff=0.35) for k in (0, 2)])
        with self.voice("さあ、ここが一番大事なところです。これを、パラメータで微分すると、{A}最初の状態の確率も、"
                        "環境の遷移確率も、パラメータを含んでいないので、{B}消えてしまいます。") as v:
            self.play(FadeOut(prod), FadeOut(VGroup(toks, links, link_labs, rho_ar, rho_lab)), run_time=0.7)
            self.play(ReplacementTransform(rows, grows), run_time=1.3)
            self.wait_to(v, "A")
            b0 = SurroundingRectangle(grows[0][2], color=GREY_B, buff=0.08)
            b2 = SurroundingRectangle(grows[2][2], color=GREY_B, buff=0.08)
            self.play(Create(b0), FadeIn(no_th[0]), run_time=0.6)
            self.play(Create(b2), FadeIn(no_th[1]), run_time=0.6)
            self.wait_to(v, "B")
            self.play(ReplacementTransform(grows[0][2], zeros[0]), ReplacementTransform(grows[2][2], zeros[1]),
                      FadeOut(b0), FadeOut(b2), FadeOut(no_th), run_time=0.9)
            self.play(FadeOut(zeros, scale=0.3), FadeOut(grows[2][:2]), run_time=0.8)
            self.play(FadeOut(grows[1][1]), grows[1][2].animate.next_to(grows[0][1], RIGHT, buff=0.25), run_time=0.8)

        # 残るのは方策の項だけ → 道がつながる
        final = mt(r"\nabla_\theta J(\theta)", "=", r"\mathbb{E}", r"\Big[", r"\sum_t",
                   r"\nabla_\theta \log \pi_\theta(a_t \mid s_t)", r"R(\tau)", r"\Big]", size=60)
        final[5].set_color(style.POLICY)
        final[6].set_color(style.REWARD)
        final.move_to(UP * 2.25)
        final_box = SurroundingRectangle(final, color=style.POLICY, buff=0.22, corner_radius=0.1)
        G = CompGraph(size=50)
        VGroup(G, G.back).scale(0.9).move_to(DOWN * 1.55)
        G.env[1].shift(0.3 * UP)
        dice = G.dice().scale(0.9).move_to(G.env).shift(0.35 * DOWN)
        cross = cross_mark(0.5).move_to(G.back[2].point_from_proportion(0.5))
        detour = CurvedArrow(G.J.get_top() + 0.12 * UP, G.theta.get_top() + 0.12 * UP, angle=0.75,
                             color=style.POLICY, stroke_width=7, tip_length=0.3)
        with self.voice("残るのは、{A}方策の項だけ。環境の中身を知らなくても、微分できなくても、関係ない。"
                        "{B}途切れていた道が、つながりました。") as v:
            self.wait_to(v, "A")
            keep = grows[1][2]
            self.play(FadeOut(grows[0][:2]), keep.animate.scale(1.1).move_to(DOWN * 0.2), run_time=0.8)
            self.play(Indicate(keep, color=style.POLICY, scale_factor=1.1), run_time=0.8)
            self.play(FadeOut(top_box), FadeOut(top[6]), ReplacementTransform(top[0:3], final[0]),
                      ReplacementTransform(top[3], final[1]), ReplacementTransform(top[4], final[2]),
                      ReplacementTransform(top[5], final[3]), ReplacementTransform(keep, final[4:6]),
                      ReplacementTransform(top[7], final[6]), ReplacementTransform(top[8], final[7]), run_time=1.4)
            self.play(Create(final_box), run_time=0.5)
            self.play(FadeIn(G), FadeIn(dice), FadeIn(G.back[2:]), FadeIn(cross), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Create(detour), run_time=1.5)
            self.play(Indicate(G.theta, color=style.THETA, scale_factor=1.25), run_time=0.8)

        pgt = jt("方策勾配定理", size=38, color=style.POLICY).next_to(final_box, DOWN, buff=0.3)
        with self.voice("自分が選んだ行動の、対数確率の勾配に、リターンを掛けて、平均する。"
                        "これが、{A}方策勾配定理の、もっとも基本的な形です。") as v:
            self.play(Indicate(final[5], color=style.POLICY, scale_factor=1.1), run_time=1.2)
            self.play(Indicate(final[6], color=style.REWARD, scale_factor=1.2), run_time=1.0)
            self.play(Indicate(final[2], color=WHITE, scale_factor=1.3), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(pgt, shift=0.1 * UP), run_time=0.8)
        self.play(FadeOut(VGroup(final, final_box, pgt, G, G.back[2:], cross, dice, detour)), run_time=0.9)


# ---------------------------------------------------------------------------
# 5. 直感: 1次元ガウス方策
# ---------------------------------------------------------------------------
def score_arrows(L: Line1D, mu, xs, weights, y0=0.35, dy=0.3, scale=1.0, color_fn=None, width=5):
    """μ から各サンプルの方向へ、長さ ∝ weight·(x−μ) の水平の矢印。近いサンプルほど下の段。"""
    order = np.argsort(np.abs(np.asarray(xs) - mu))
    rows = {int(i): k for k, i in enumerate(order)}
    grp = VGroup()
    for i, (x, w) in enumerate(zip(xs, weights)):
        y = L.y + y0 + dy * rows[i]
        start = np.array([L.X(mu), y, 0])
        end = np.array([L.X(mu + scale * w * (x - mu)), y, 0])
        col = color_fn(i) if color_fn else WHITE
        if np.linalg.norm(end - start) < 0.05:
            grp.add(Dot(start, radius=0.03, color=col))
        else:
            grp.add(Arrow(start, end, buff=0, color=col, stroke_width=width, tip_length=0.16,
                          max_tip_length_to_length_ratio=0.5, max_stroke_width_to_length_ratio=20))
    return grp


class Intuition(VoiceScene):
    def construct(self):
        steps = H.pg_steps_1d(mu0=H.MU0, n=8, steps=7, lr=2.5, seed=3)
        lr = 2.5
        L = Line1D(y=-2.55, pdf_h=3.3, r_h=3.0)
        axis = L.axis()
        mu0 = steps[0]["mu"]
        mnt = L.mountain(mu0)
        pi_lab = mt(r"\pi_\theta(x)", size=48, color=style.POLICY).next_to(L.pt(mu0, 3.3), UP, buff=0.15)
        rc = L.reward_curve()
        r_lab = mt("R(x)", size=48, color=style.REWARD).next_to(L.pt(H.R_CENTER + 1.4, 3.0 * H.reward_1d(H.R_CENTER + 1.4)),
                                                               RIGHT, buff=0.1)
        mu_line = DashedLine(L.pt(mu0), L.pt(mu0, 3.3), color=style.POLICY, stroke_width=2.5)
        mu_lab = mt(r"\mu", size=40, color=style.POLICY).next_to(L.pt(mu0), DOWN, buff=0.15)

        with self.voice("この式の意味を、絵で見てみましょう。{A}方策が、行動の上の、こんな山の形の分布だとします。"
                        "そして、{B}報酬は、右の方の行動ほど大きい、としましょう。") as v:
            self.play(Create(axis[0]), FadeIn(axis[1]), run_time=1.0)
            self.wait_to(v, "A")
            self.play(DrawBorderThenFill(mnt), FadeIn(pi_lab, shift=0.1 * UP), run_time=1.2)
            self.play(Create(mu_line), FadeIn(mu_lab), run_time=0.5)
            self.wait_to(v, "B")
            self.play(Create(rc), FadeIn(r_lab), run_time=1.4)

        st = steps[0]
        xs, R = st["xs"], st["R"]
        sdots = VGroup(*[L.sample_dot(x) for x in xs])
        raw = score_arrows(L, mu0, xs, np.ones_like(xs), color_fn=lambda i: GREY_A)
        conns = VGroup(*[DashedLine(a.get_end(), L.pt(x), stroke_width=1.5, color=GREY_C, dash_length=0.06)
                         for a, x in zip(raw, xs)])
        weighted = score_arrows(L, mu0, xs, R, scale=1.0, color_fn=lambda i: weight_color(R[i]), width=6)
        grad_lab = mt(r"\nabla_\mu \log \pi(x_i)", size=46, color=GREY_A).move_to(np.array([-4.0, 3.1, 0]))
        grad_lab2 = mt(r"\nabla_\mu \log \pi(x_i)", r"\cdot", r"R(x_i)", size=46).move_to(grad_lab)
        grad_lab2[2].set_color(style.REWARD)
        with self.voice("方策から、{A}いくつか行動をサンプルします。対数確率の勾配は、{B}分布を、その点に寄せる方向を向いています。"
                        "それに、リターンを掛けるので、{C}良い結果を出した点ほど、強く引き寄せます。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(d, shift=0.4 * DOWN) for d in sdots], lag_ratio=0.12), run_time=1.2)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[grow(a) for a in raw], lag_ratio=0.1), FadeIn(grad_lab), run_time=1.4)
            self.play(Create(conns), run_time=0.6)
            self.wait_to(v, "C")
            self.play(*[d.animate.set_color(weight_color(r)) for d, r in zip(sdots, R)], FadeOut(conns), run_time=0.6)
            self.play(ReplacementTransform(raw, weighted), TransformMatchingTex(grad_lab, grad_lab2), run_time=1.4)
            self.play(Indicate(weighted[int(np.argmax(R))], color=style.REWARD, scale_factor=1.2), run_time=0.8)

        # 平均 → 山が動く。数ステップ繰り返す
        step_lab = VGroup(jt("更新", size=34, color=GREY_B), Integer(0, font_size=46, color=WHITE)).arrange(RIGHT, buff=0.2)
        step_lab.move_to(np.array([4.8, 3.1, 0]))
        trail = VGroup()

        def mean_arrow(mu, g):
            y = L.y + 0.12
            return Arrow(np.array([L.X(mu), y, 0]), np.array([L.X(mu + lr * g), y, 0]), buff=0,
                         color=WHITE, stroke_width=9, tip_length=0.25, max_tip_length_to_length_ratio=0.5)

        def do_step(k, arrows, dots, fast):
            stp = steps[k]
            mu, g = stp["mu"], stp["g"]
            ma = mean_arrow(mu, g)
            rt = 0.45 if fast else 0.9
            self.play(ReplacementTransform(arrows, ma), run_time=rt)
            shift = (L.X(stp["mu_next"]) - L.X(mu)) * RIGHT
            tick = Line(L.pt(mu, -0.08), L.pt(mu, 0.08), color=style.POLICY, stroke_width=3)
            trail.add(tick)
            self.add(tick)
            self.play(VGroup(mnt, pi_lab, mu_line, mu_lab).animate.shift(shift), FadeOut(ma), FadeOut(dots),
                      step_lab[1].animate.set_value(k + 1), run_time=rt)

        with self.voice("全部を平均すると、{A}分布は、報酬の高い方へと、少しずつ動いていきます。") as v:
            self.play(FadeIn(step_lab), run_time=0.4)
            self.wait_to(v, "A")
            do_step(0, weighted, sdots, fast=False)
            for k in range(1, len(steps)):
                stp = steps[k]
                d = VGroup(*[L.sample_dot(x, r) for x, r in zip(stp["xs"], stp["R"])])
                arr = score_arrows(L, stp["mu"], stp["xs"], stp["R"], color_fn=lambda i, R=stp["R"]: weight_color(R[i]),
                                   width=6)
                self.play(FadeIn(d, shift=0.3 * DOWN), run_time=0.35)
                self.play(LaggedStart(*[grow(a) for a in arr], lag_ratio=0.05), run_time=0.45)
                do_step(k, arr, d, fast=True)

        picture = VGroup(axis, mnt, pi_lab, rc, r_lab, mu_line, mu_lab, trail, step_lab, grad_lab2)

        # 交差エントロピーとの対比
        sup = mt(r"\nabla_\theta \log \pi_\theta(", "y", r"\mid", "x", ")", size=70)
        sup[1].set_color(style.REWARD)
        pg = mt(r"\nabla_\theta \log \pi_\theta(", "a_t", r"\mid", "s_t", ")", r"\cdot", r"R(\tau)", size=70)
        pg[1].set_color(style.ACTION)
        pg[3].set_color(style.STATE)
        pg[6].set_color(style.REWARD)
        sup_lab = jt("教師あり学習", size=38, color=GREY_A)
        pg_lab = jt("方策勾配", size=38, color=style.POLICY)
        sup_row = VGroup(sup_lab, sup).arrange(RIGHT, buff=0.6)
        pg_row = VGroup(pg_lab, pg).arrange(RIGHT, buff=0.6)
        VGroup(sup_row, pg_row).arrange(DOWN, buff=1.5, aligned_edge=LEFT).move_to(UP * 0.9 + LEFT * 0.4)
        pg.align_to(sup, LEFT)
        pg_lab.align_to(sup_lab, LEFT)
        sup_note = jt("正解ラベル", size=30, color=style.REWARD).next_to(sup[1], DOWN, buff=0.35)
        pg_note = jt("自分で選んだ行動", size=30, color=style.ACTION).next_to(pg[1], DOWN, buff=0.35)
        pg_note.align_to(pg[1], RIGHT).shift(0.35 * RIGHT)
        pg_center = pg.copy().move_to(UP * 0.4)
        with self.voice("機械学習エンジニアなら、この形に、見覚えがあるはずです。{A}教師あり学習の、交差エントロピーの勾配は、"
                        "正解ラベルの対数確率の勾配でした。") as v:
            self.play(FadeOut(picture), run_time=0.7)
            self.play(Write(pg_center), run_time=1.3)
            self.wait_to(v, "A")
            self.play(ReplacementTransform(pg_center, pg), FadeIn(pg_lab), run_time=0.9)
            self.play(FadeIn(sup_lab), Write(sup), run_time=1.2)
            self.play(FadeIn(sup_note, shift=0.1 * UP), Indicate(sup[1], color=style.REWARD, scale_factor=1.4), run_time=0.9)

        weight_box = SurroundingRectangle(pg[5:], color=style.REWARD, buff=0.1)
        weight_note = jt("うまくいった分だけ強く", size=30, color=style.REWARD).next_to(weight_box, UP, buff=0.25)
        rf = jt("REINFORCE", size=66, color=WHITE, weight="BOLD").move_to(DOWN * 2.35)
        rf_sub = jt("リターンで重み付けした最尤推定", size=34, color=GREY_B).next_to(rf, DOWN, buff=0.25)
        with self.voice("方策勾配では、{A}自分がサンプルした行動を、正解ラベルだと思って学習します。"
                        "ただし、{B}うまくいった分だけ強く。つまり、リターンで重み付けした、最尤推定なんです。"
                        "このアルゴリズムは、{C}[REINFORCE|リインフォース]と呼ばれています。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(pg_note, shift=0.1 * UP), Indicate(pg[1], color=style.ACTION, scale_factor=1.4), run_time=0.9)
            self.play(Indicate(VGroup(sup[1], pg[1]), color=WHITE, scale_factor=1.2), run_time=0.9)
            self.wait_to(v, "B")
            self.play(Create(weight_box), FadeIn(weight_note), run_time=0.8)
            self.wait_to(v, "C")
            self.play(Write(rf), FadeIn(rf_sub), run_time=1.2)
        self.play(FadeOut(VGroup(sup_row, pg_row, sup_note, pg_note, weight_box, weight_note, rf, rf_sub)), run_time=0.8)


# ---------------------------------------------------------------------------
# 6. 因果性（reward-to-go）
# ---------------------------------------------------------------------------
class Causality(VoiceScene):
    def construct(self):
        spec = [("s_0", style.STATE), ("a_0", style.ACTION), ("r_1", style.REWARD), (r"\cdots", GREY_B),
                ("r_t", style.REWARD), ("s_t", style.STATE), ("a_t", style.ACTION), ("r_{t+1}", style.REWARD),
                ("s_{t+1}", style.STATE), (r"\cdots", GREY_B), ("r_T", style.REWARD)]
        toks = VGroup(*[mt(t, size=66, color=c) for t, c in spec]).arrange(RIGHT, buff=0.5)
        toks.move_to(UP * 0.1)
        at = toks[6]
        at_box = SurroundingRectangle(at, color=style.ACTION, buff=0.12, corner_radius=0.08)
        past = [toks[2], toks[4]]
        fut = [toks[7], toks[10]]
        with self.voice("一つ、簡単な改良ができます。{A}ある時刻の行動は、それより前にもらった報酬には、影響を与えられません。"
                        "過去は変えられないからです。") as v:
            self.play(LaggedStart(*[FadeIn(t, shift=0.2 * RIGHT) for t in toks], lag_ratio=0.08), run_time=1.6)
            self.wait_to(v, "A")
            self.play(Create(at_box), run_time=0.5)
            pa = VGroup(*[CurvedArrow(at.get_top() + 0.15 * UP, p.get_top() + 0.15 * UP, angle=2.2 if p is toks[4] else 1.6,
                                      color=GREY_B, stroke_width=5) for p in past])
            fa = VGroup(*[CurvedArrow(at.get_bottom() + 0.15 * DOWN, f.get_bottom() + 0.15 * DOWN,
                                      angle=2.2 if f is toks[7] else 1.4, color=style.REWARD, stroke_width=5)
                          for f in fut])
            past_lab = jt("過去の報酬", size=30, color=GREY_B).next_to(pa[0], UP, buff=0.12)
            fut_lab = jt("未来の報酬", size=30, color=style.REWARD).next_to(fa[1], DOWN, buff=0.12)
            self.play(Create(pa), FadeIn(past_lab), run_time=1.0)
            crosses = VGroup(*[cross_mark(0.5).move_to(a.point_from_proportion(0.7)) for a in pa])
            self.play(Create(crosses), Transform(pa, faded(pa, 0.4)), run_time=0.6)
            self.play(Create(fa), FadeIn(fut_lab), run_time=1.0)

        eq = mt(r"\nabla_\theta J(\theta)", "=", r"\mathbb{E}", r"\Big[", r"\sum_t",
                r"\nabla_\theta \log \pi_\theta(a_t \mid s_t)", r"R(\tau)", r"\Big]", size=56)
        eq[5].set_color(style.POLICY)
        eq[6].set_color(style.REWARD)
        eq.move_to(UP * 3.05)
        eq2 = mt(r"\nabla_\theta J(\theta)", "=", r"\mathbb{E}", r"\Big[", r"\sum_t",
                 r"\nabla_\theta \log \pi_\theta(a_t \mid s_t)", r"G_t", r"\Big]", size=56)
        eq2[5].set_color(style.POLICY)
        eq2[6].set_color(style.REWARD)
        eq2.move_to(eq)
        br = Brace(VGroup(toks[7], toks[10]), DOWN, color=style.REWARD, buff=1.45)
        gt = mt("G_t", "=", r"r_{t+1}", "+", r"\gamma", r"r_{t+2}", "+", r"\cdots", size=44)
        gt[0].set_color(style.REWARD)
        gt[2].set_color(style.REWARD)
        gt[4].set_color(style.GAMMA)
        gt[5].set_color(style.REWARD)
        gt.next_to(br, DOWN, buff=0.2)
        rt = VGroup(Brace(toks, DOWN, color=GREY_B, buff=1.45))
        rtl = mt(r"R(\tau)", size=44, color=GREY_B).next_to(rt, DOWN, buff=0.15)
        with self.voice("だから、各時刻の行動に掛けるのは、{A}軌跡全体のリターンではなく、{B}その時刻から先のリターンで十分です。"
                        "{C}余計な項を減らすと、推定のばらつきも減ります。") as v:
            self.play(Write(eq), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeOut(fut_lab), GrowFromCenter(rt), FadeIn(rtl), Indicate(eq[6], color=style.REWARD, scale_factor=1.3),
                      run_time=0.9)
            self.wait_to(v, "B")
            self.play(FadeOut(rt), FadeOut(rtl), GrowFromCenter(br), FadeIn(gt, shift=0.1 * DOWN), run_time=0.9)
            self.play(TransformMatchingTex(eq, eq2), run_time=1.2)
            self.wait_to(v, "C")
            self.play(Circumscribe(eq2[6], color=style.REWARD), run_time=1.0)
        self.play(FadeOut(VGroup(toks, at_box, pa, crosses, fa, eq2, br, gt, past_lab)), run_time=0.8)


# ---------------------------------------------------------------------------
# 7. ベースライン
# ---------------------------------------------------------------------------
class Histo(VGroup):
    """勾配推定値のヒストグラム（1行）。"""

    def __init__(self, data, lo, hi, left, right, y, h=1.0, bins=64, color=style.POLICY, neg_color=None, **kw):
        super().__init__(**kw)
        edges = np.linspace(lo, hi, bins + 1)
        counts, _ = np.histogram(np.clip(data, lo, hi - 1e-9), edges)
        sx = (right - left) / (hi - lo)
        self.bars = VGroup()
        cmax = counts.max()
        for c, e0, e1 in zip(counts, edges[:-1], edges[1:]):
            hh = max(h * c / cmax, 0.0)
            col = neg_color if (neg_color is not None and e1 <= 0) else color
            r = Rectangle(width=(e1 - e0) * sx * 0.92, height=max(hh, 0.003), stroke_width=0, fill_color=col,
                          fill_opacity=0.9 if c > 0 else 0)
            r.move_to(np.array([left + ((e0 + e1) / 2 - lo) * sx, y + hh / 2, 0]))
            self.bars.add(r)
        self.base = Line(np.array([left, y, 0]), np.array([right, y, 0]), stroke_color=GREY_D, stroke_width=2)
        self.add(self.base, self.bars)


class Baseline(VoiceScene):
    def construct(self):
        B = H.baseline_study(mu=-0.7, n=10, batches=4000)
        mu = B["mu"]
        rbar = B["V5"] - 5.0
        L = Line1D(xmin=-4.0, xmax=3.6, left=-6.5, right=-0.6, y=-2.3, pdf_h=2.6, r_h=1.6)
        axis = L.axis()
        mnt = L.mountain(mu)
        rc = L.reward_curve()
        r_lab = mt("R", size=44, color=style.REWARD).next_to(L.pt(3.2, 1.6 * H.reward_1d(3.2)), UP, buff=0.12)
        mu_line = DashedLine(L.pt(mu), L.pt(mu, 2.6), color=style.POLICY, stroke_width=2.5)
        rng = np.random.default_rng(21)
        batches = [np.sort(rng.normal(mu, H.SIGMA, 8)) for _ in range(6)]

        with self.voice("ただし、[REINFORCE|リインフォース]には、大きな弱点があります。{A}推定のばらつきが、とても大きいんです。") as v:
            self.play(Create(axis[0]), FadeIn(axis[1]), DrawBorderThenFill(mnt), Create(mu_line), Create(rc),
                      FadeIn(r_lab), run_time=1.5)
            self.wait_to(v, "A")
            est = VGroup()
            est_lab = jt("推定値", size=30, color=GREY_B).move_to(np.array([L.X(mu) - 1.7, L.y + 3.35, 0]))
            self.play(FadeIn(est_lab), run_time=0.3)
            for k in range(5):
                xs = batches[k]
                R = H.reward_1d(xs)
                d = VGroup(*[L.sample_dot(x, r) for x, r in zip(xs, R)])
                g = float(np.mean(R * H.score_mu(xs, mu)))
                y = L.y + 2.95 + 0.32 * k
                ma = Arrow(np.array([L.X(mu), y, 0]), np.array([L.X(mu + 4.0 * g), y, 0]), buff=0, color=WHITE,
                           stroke_width=7, tip_length=0.2, max_tip_length_to_length_ratio=0.5)
                est.add(ma)
                self.play(FadeIn(d, shift=0.3 * DOWN), run_time=0.3)
                self.play(grow(ma), FadeOut(d), run_time=0.45)
            self.play(Indicate(est, color=WHITE, scale_factor=1.1), run_time=0.8)
        self.play(FadeOut(est), FadeOut(est_lab), run_time=0.5)

        # 右: ヒストグラム
        lo, hi = -5.5, 5.5
        hl, hr = 0.9, 6.5
        rows_y = [1.55, -0.35, -2.25]
        sx = (hr - hl) / (hi - lo)

        def X(v):
            return hl + (v - lo) * sx

        h0 = Histo(B["e0"], lo, hi, hl, hr, rows_y[0], h=1.2, color=style.POLICY)
        h5 = Histo(B["e5"], lo, hi, hl, hr, rows_y[1], h=1.2, color=style.POLICY, neg_color=BAD)
        hb = Histo(B["eb"], lo, hi, hl, hr, rows_y[2], h=1.2, color=GOOD)
        labs = VGroup(mt("R", size=38, color=style.REWARD), mt("R+5", size=38, color=style.REWARD),
                      mt("R+5-b", size=38, color=style.REWARD))
        for lab, y in zip(labs, rows_y):
            lab.move_to(np.array([hl + 0.1, y + 0.9, 0]), aligned_edge=LEFT)
        true_x = X(B["true"])
        tline = DashedLine(np.array([true_x, rows_y[2] - 0.15, 0]), np.array([true_x, rows_y[0] + 1.45, 0]),
                           color=WHITE, stroke_width=2.5, dash_length=0.1)
        tlab = jt("正しい勾配", size=26, color=GREY_A).next_to(tline, UP, buff=0.08)
        h_title = jt("勾配の推定値（10サンプルずつ、4000回）", size=26, color=GREY_B)
        h_title.move_to(np.array([(hl + hr) / 2, rows_y[2] - 0.55, 0]))
        wrong = (B["e5"] < 0).mean()
        wrong_lab = jt(f"逆向き {wrong * 100:.0f}%", size=28, color=BAD).next_to(h5.base, DOWN, buff=0.12)
        wrong_lab.align_to(h5.base, LEFT).shift(0.1 * RIGHT)

        # +5 底上げ
        rc5 = L.reward_curve(shift_h=1.3)
        plus5 = mt("+5", size=40, color=style.REWARD)
        lift = Arrow(L.pt(-3.3, 0.05), L.pt(-3.3, 1.3), buff=0, color=style.REWARD, stroke_width=5)
        plus5.next_to(lift, RIGHT, buff=0.1)
        xs = batches[3]
        R5 = H.reward_1d(xs) + 5.0
        d5 = VGroup(*[L.sample_dot(x, 0.8) for x in xs])
        pulls = score_arrows(L, mu, xs, R5 / R5.max(), y0=0.3, dy=0.24, color_fn=lambda i: style.REWARD, width=5)
        with self.voice("例えば、{A}報酬を全部、5ずつ底上げしてみます。問題の本質は、何も変わっていません。"
                        "でも、{B}すべてのサンプルのリターンがプラスになるので、どの行動も、引き寄せられる方向に押されます。"
                        "{C}どれを、どれだけ押すかの、わずかな差でしか、正しい方向が分からない。推定値は、大きくばらつきます。") as v:
            self.play(FadeIn(h_title), FadeIn(h0), FadeIn(labs[0]), Create(tline), FadeIn(tlab), run_time=1.0)
            self.wait_to(v, "A")
            self.play(GrowArrow(lift), FadeIn(plus5), ReplacementTransform(rc, rc5),
                      r_lab.animate.shift(1.3 * UP), run_time=1.2)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[FadeIn(d, shift=0.3 * DOWN) for d in d5], lag_ratio=0.08), run_time=0.8)
            self.play(LaggedStart(*[grow(a) for a in pulls], lag_ratio=0.06), run_time=1.0)
            self.wait_to(v, "C")
            self.play(FadeIn(labs[1]), LaggedStart(*[GrowFromEdge(b, DOWN) for b in h5.bars], lag_ratio=0.01),
                      FadeIn(h5.base), run_time=2.0)
            self.play(FadeIn(wrong_lab), run_time=0.6)
        self.play(FadeOut(VGroup(pulls, d5)), run_time=0.5)

        # ベースラインを引く
        b_y = 1.3 + 1.6 * rbar
        bline = DashedLine(L.pt(L.xmin, b_y), L.pt(L.xmax, b_y), color=WHITE, stroke_width=3)
        b_lab = mt("b", size=40, color=WHITE).next_to(bline, LEFT, buff=0.1)
        Rb = H.reward_1d(xs) + 5.0 - B["V5"]
        signed = score_arrows(L, mu, xs, Rb / np.abs(Rb).max(), y0=0.3, dy=0.24,
                              color_fn=lambda i: GOOD if Rb[i] > 0 else BAD, width=6)
        d5b = VGroup(*[L.sample_dot(x, 0.8) for x in xs])
        with self.voice("そこで、{A}リターンから、ある基準値を引きます。ベースラインです。{B}平均より良かった行動は引き寄せ、"
                        "{C}平均より悪かった行動は、押しのける。") as v:
            self.wait_to(v, "A")
            self.play(Create(bline), FadeIn(b_lab), run_time=0.9)
            self.play(FadeIn(d5b, shift=0.3 * DOWN), run_time=0.6)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[grow(signed[i]) for i in range(len(xs)) if Rb[i] > 0], lag_ratio=0.1),
                      run_time=0.9)
            self.wait_to(v, "C")
            self.play(LaggedStart(*[grow(signed[i]) for i in range(len(xs)) if Rb[i] <= 0], lag_ratio=0.1),
                      run_time=0.9)

        left_panel = VGroup(axis, mnt, mu_line, rc5, r_lab, lift, plus5, bline, b_lab, signed, d5b)
        right_panel = VGroup(h_title, h0, h5, labs[:2], tline, tlab, wrong_lab)

        # なぜ引いてもいいのか
        l1 = mt(r"\mathbb{E}_{a\sim\pi_\theta}\big[\nabla_\theta \log \pi_\theta(a\mid s)\, b\big]", "=",
                r"\sum_a \pi_\theta(a\mid s)\,\nabla_\theta \log \pi_\theta(a\mid s)\, b", size=50)
        l2 = mt(r"\phantom{\mathbb{E}_{a\sim\pi_\theta}\big[\nabla_\theta \log \pi_\theta(a\mid s)\, b\big]}", "=",
                r"b\, \nabla_\theta \sum_a \pi_\theta(a\mid s)", size=50)
        l3 = mt(r"\phantom{\mathbb{E}_{a\sim\pi_\theta}\big[\nabla_\theta \log \pi_\theta(a\mid s)\, b\big]}", "=",
                r"b\, \nabla_\theta 1", "=", "0", size=50)
        lines = VGroup(l1, l2, l3).arrange(DOWN, buff=0.4, aligned_edge=LEFT).move_to(UP * 1.7)
        for l in (l2, l3):
            l.shift((l1[1].get_center()[0] - l[1].get_center()[0]) * RIGHT)
        l3[4].set_color(GOOD)
        sum_box = SurroundingRectangle(l2[2][2:], color=style.POLICY, buff=0.08)
        one = mt("= 1", size=44, color=style.POLICY).next_to(sum_box, RIGHT, buff=0.15)
        ask = mt("=", "?", size=50).next_to(l1[0], RIGHT, buff=0.25)
        b_note = jt("b は行動によらない", size=30, color=GREY_B).next_to(l1[0], DOWN, buff=0.4).align_to(l1[0], LEFT)
        with self.voice("基準値を引いてしまって、答えが変わらないのでしょうか。{A}実は、変わりません。"
                        "基準値が行動によらなければ、その項の期待値は、{B}確率の合計の微分、つまり、{C}1の微分になって、0だからです。") as v:
            self.play(FadeOut(left_panel), FadeOut(right_panel), run_time=0.8)
            self.play(Write(l1[0]), FadeIn(ask), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeOut(ask), Write(l1[1:]), run_time=1.3)
            self.play(FadeIn(b_note, shift=0.1 * UP), run_time=0.6)
            self.wait_to(v, "B")
            self.play(Write(l2[1:]), run_time=1.0)
            self.play(Create(sum_box), FadeIn(one), run_time=0.6)
            self.wait_to(v, "C")
            self.play(Write(l3[1:]), run_time=1.0)
            self.play(Indicate(l3[4], color=GOOD, scale_factor=1.6), run_time=0.8)

        # 確率の棒: どれかを上げれば、どれかが下がる
        pv = ValueTracker(0.0)
        base_p = np.array([0.2, 0.45, 0.15, 0.2])

        def make_pb():
            t = pv.get_value()
            z = np.log(base_p) + np.array([0, t, 0, 0])
            p = softmax(z)
            bars = ProbBars(list(p), labels=[arrow_glyph(a, length=0.4) for a in ORDER], width=4.4, height=2.5,
                            colors=[style.POLICY] * 4)
            bars.move_to(np.array([-2.0, -2.2, 0]))
            return bars

        pb = make_pb()
        ssum = VGroup(mt(r"\sum_a \pi_\theta(a\mid s)", "=", "1", size=50)).next_to(pb, RIGHT, buff=0.8).shift(0.3 * UP)
        ghost = VGroup(*[b.copy().set_fill(opacity=0).set_stroke(GREY_B, 2).stretch(1.35, 1, about_edge=DOWN)
                         for b in pb.bars])
        no_up = cross_mark(0.8).move_to(ghost)
        with self.voice("確率は、どれかを上げれば、どれかが下がる。全体を持ち上げる方向は、そもそも存在しないんです。") as v:
            self.play(FadeIn(pb), FadeIn(ssum), run_time=0.7)
            self.remove(pb)
            pbd = always_redraw(make_pb)
            self.add(pbd)
            self.play(pv.animate.set_value(1.2), run_time=1.0)
            self.play(pv.animate.set_value(-0.8), run_time=1.0)
            self.play(pv.animate.set_value(0.0), run_time=0.6)
            pbd.clear_updaters()
            self.play(FadeIn(ghost), run_time=0.5)
            self.play(Create(no_up), run_time=0.5)

        # ばらつきの比較（実際の計算）
        ratio = B["var5"] / B["varb"]
        with self.voice("平均を変えずに、ばらつきだけを減らせる。{A}実際に計算してみると、ばらつきは、このくらい小さくなります。") as v:
            self.play(FadeOut(VGroup(lines, sum_box, one, pbd, ssum, ghost, no_up, b_note)), run_time=0.7)
            right_panel2 = VGroup(h_title, h0, h5, labs[:2], tline, tlab, wrong_lab)
            self.play(FadeIn(right_panel2), run_time=0.7)
            self.wait_to(v, "A")
            self.play(FadeIn(labs[2]), FadeIn(hb.base), LaggedStart(*[GrowFromEdge(b, DOWN) for b in hb.bars], lag_ratio=0.01),
                      run_time=1.4)
        var_txt = VGroup(jt("分散", size=34, color=GREY_B),
                         mt(f"{B['var5']:.2f}", r"\to", f"{B['varb']:.4f}", size=46),
                         jt(f"約 1/{ratio:.0f}", size=38, color=GOOD))
        var_txt[:2].arrange(RIGHT, buff=0.2)
        var_txt[2].next_to(var_txt[:2], DOWN, buff=0.3)
        var_txt.move_to(np.array([-3.3, -1.3, 0]))
        arrow_v = Arrow(var_txt.get_right() + 0.1 * RIGHT, np.array([hl - 0.1, rows_y[2] + 0.4, 0]), buff=0.1,
                        color=GOOD, stroke_width=4)
        same_mean = jt("平均は同じ", size=36, color=GREY_A).move_to(np.array([-3.3, 1.9, 0]))
        same_arrow = Arrow(same_mean.get_right() + 0.1 * RIGHT, tlab.get_left() + 0.1 * LEFT, buff=0.1,
                           color=GREY_B, stroke_width=3)
        self.play(FadeIn(same_mean), GrowArrow(same_arrow), Indicate(tline, color=WHITE), run_time=1.0)
        self.play(FadeIn(var_txt, shift=0.1 * RIGHT), GrowArrow(arrow_v), run_time=1.0)
        self.wait(1.5)

        # アドバンテージ（学習途中の方策で、実際に走らせたリターン）
        T = H.tables()
        ac = H.actor_critic(episodes=50, lr_actor=1.0, lr_critic=0.3, seed=0, snap_every=50)
        P50 = ac["snaps"][-1][1]
        Vpi = T.values(P50)[T.start]
        Gs = H.sample_returns(P50, 12, seed=0)
        nline = NumberLine(x_range=[0, 0.6, 0.1], length=10.0, include_numbers=False, color=GREY_B,
                           stroke_width=3).move_to(np.array([0, -1.5, 0]))
        nums = VGroup(*[mt(f"{v:.1f}", size=34, color=GREY_B).next_to(nline.n2p(v), DOWN, buff=0.2)
                        for v in (0.0, 0.2, 0.4, 0.6)])
        g_lab = VGroup(jt("リターン", size=28, color=style.REWARD), mt("G", size=40, color=style.REWARD))
        g_lab.arrange(RIGHT, buff=0.1).next_to(nline, RIGHT, buff=0.2)
        vpt = nline.n2p(Vpi)
        vline = Line(vpt + 0.25 * DOWN, vpt + 2.7 * UP, color=style.VALUE, stroke_width=5)
        v_lab = mt("V(s)", size=40, color=style.VALUE).next_to(vline, UP, buff=0.12)
        placed = []
        gdots = VGroup()
        grey = VGroup()
        advs = VGroup()
        for g in sorted(Gs):
            x = nline.n2p(g)[0]
            k = sum(1 for px in placed if abs(px - x) < 0.24)
            placed.append(x)
            y = nline.get_center()[1] + 0.3 + 0.36 * k
            col = GOOD if g > Vpi else BAD
            gdots.add(Dot(np.array([x, y, 0]), radius=0.11, color=col))
            grey.add(Dot(np.array([x, y, 0]), radius=0.11, color=GREY_B))
            advs.add(Arrow(np.array([vpt[0], y, 0]), np.array([x, y, 0]), buff=0.12, color=col, stroke_width=4,
                           tip_length=0.16, max_tip_length_to_length_ratio=0.3))
        adv = mt("A_t", "=", "G_t", "-", "V(s_t)", size=60)
        adv[2].set_color(style.REWARD)
        adv[4].set_color(style.VALUE)
        adv.move_to(UP * 2.6 + RIGHT * 1.2)
        adv_lab = jt("アドバンテージ", size=36, color=WHITE).next_to(adv, LEFT, buff=0.6)
        grad_adv = mt(r"\nabla_\theta J(\theta)", "=", r"\mathbb{E}", r"\Big[", r"\sum_t",
                      r"\nabla_\theta \log \pi_\theta(a_t \mid s_t)", r"\big(G_t - V(s_t)\big)", r"\Big]", size=46)
        grad_adv[5].set_color(style.POLICY)
        grad_adv.move_to(DOWN * 3.1)
        plus_l = jt("平均より良い", size=32, color=GOOD)
        minus_l = jt("平均より悪い", size=32, color=BAD)
        with self.voice("基準値には、{A}その状態の価値、[V|ブイ]を使うのが自然です。リターンから価値を引いたものを、"
                        "{B}アドバンテージと呼びます。「平均と比べて、どれだけ良かったか」を表す量です。") as v:
            self.play(FadeOut(VGroup(right_panel2, labs[2], hb, var_txt, arrow_v, same_mean, same_arrow)), run_time=0.7)
            self.play(Create(nline), FadeIn(nums), FadeIn(g_lab), run_time=0.7)
            self.play(LaggedStart(*[FadeIn(d, shift=0.3 * DOWN) for d in grey], lag_ratio=0.05), run_time=1.0)
            self.wait_to(v, "A")
            self.play(Create(vline), FadeIn(v_lab), run_time=0.8)
            self.play(*[d.animate.set_color(c.get_color()) for d, c in zip(grey, gdots)], run_time=0.5)
            self.play(LaggedStart(*[grow(a) for a in advs], lag_ratio=0.05), run_time=1.0)
            top_y = max(d.get_center()[1] for d in grey) + 0.45
            plus_l.move_to(np.array([vpt[0] + 1.6, top_y, 0]))
            minus_l.move_to(np.array([vpt[0] - 1.6, top_y, 0]))
            self.play(FadeIn(plus_l), FadeIn(minus_l), run_time=0.5)
            self.wait_to(v, "B")
            self.play(Write(adv), FadeIn(adv_lab), run_time=1.2)
            self.play(FadeIn(grad_adv, shift=0.1 * UP), run_time=0.8)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.9)


# ---------------------------------------------------------------------------
# 8. アクター・クリティック
# ---------------------------------------------------------------------------
class ActorCritic(VoiceScene):
    def construct(self):
        adv = mt("A_t", "=", "G_t", "-", "V(s_t)", size=64)
        adv[2].set_color(style.REWARD)
        adv[4].set_color(style.VALUE)
        adv.move_to(UP * 0.6)
        qm = jt("？", size=56, color=style.VALUE).next_to(adv[4], UP, buff=0.2)
        td = mt("V(s)", r"\leftarrow", "V(s)", "+", r"\alpha", r"\big[", "r", "+", r"\gamma", "V(s')", "-", "V(s)",
                r"\big]", size=54)
        for i in (0, 2, 9, 11):
            td[i].set_color(style.VALUE)
        td[6].set_color(style.REWARD)
        td[8].set_color(style.GAMMA)
        td.move_to(DOWN * 1.2)
        td_br = Brace(td[6:12], DOWN, color=GREY_B, buff=0.1)
        td_lab = VGroup(jt("TD誤差", size=32, color=GREY_A), mt(r"\delta", size=46)).arrange(RIGHT, buff=0.15)
        td_lab.next_to(td_br, DOWN, buff=0.12)
        ch3 = jt("第3章", size=30, color=GREY_B).next_to(td, LEFT, buff=0.5)
        with self.voice("では、その価値は、どうやって手に入れるのか。{A}第3章の、TD学習で学べばいい。") as v:
            self.play(FadeIn(adv), run_time=0.8)
            self.play(Indicate(adv[4], color=style.VALUE, scale_factor=1.3), FadeIn(qm, shift=0.1 * DOWN), run_time=1.0)
            self.wait_to(v, "A")
            self.play(Write(td), FadeIn(ch3), run_time=1.4)
            self.play(GrowFromCenter(td_br), FadeIn(td_lab), run_time=0.7)

        def box(title, sym, color, w=3.7, h=1.9):
            r = RoundedRectangle(width=w, height=h, corner_radius=0.2, stroke_color=color, stroke_width=4,
                                 fill_color="#141418", fill_opacity=1)
            t = jt(title, size=36, color=color)
            sm = mt(sym, size=52, color=color)
            VGroup(t, sm).arrange(DOWN, buff=0.2).move_to(r)
            return VGroup(r, t, sm)

        actor = box("アクター", r"\pi_\theta(a\mid s)", style.POLICY).move_to(np.array([-4.5, 1.0, 0]))
        critic = box("クリティック", r"V_\phi(s)", style.VALUE).move_to(np.array([4.5, 1.0, 0]))
        actor_sub = jt("方策を動かす", size=30, color=GREY_B).next_to(actor, UP, buff=0.2)
        critic_sub = jt("価値を見積もる", size=30, color=GREY_B).next_to(critic, UP, buff=0.2)
        with self.voice("方策を動かす役を、{A}アクター。価値を見積もる役を、{B}クリティックと呼びます。") as v:
            self.play(FadeOut(VGroup(adv, qm, td_br, td_lab, ch3)), td.animate.scale(0.72).to_edge(UP, buff=0.25),
                      run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(actor, shift=0.2 * RIGHT), FadeIn(actor_sub), run_time=0.8)
            self.wait_to(v, "B")
            self.play(FadeIn(critic, shift=0.2 * LEFT), FadeIn(critic_sub), run_time=0.8)

        # 環境（ミニグリッド）と1ステップ（Actor-Critic を 40 エピソード学習させたときのクリティックの値）
        ac = H.actor_critic(episodes=40, lr_actor=1.0, lr_critic=0.3, seed=0, snap_every=40)
        Vt = ac["Vsnaps"][-1][1]
        g = GridView(WORLD, cell=0.56, show_terminal_labels=False).move_to(np.array([-0.55, -2.15, 0]))
        s, n = (2, 2), (2, 3)
        robot = Robot(height=0.36).move_to(g.center_of(s))
        vs, vn = Vt[WORLD.index[s]], Vt[WORLD.index[n]]
        delta = 0.0 + WORLD.gamma * vn - vs
        assert delta > 0  # 「予想より良かった」と一致させる
        a_arrow = Arrow(actor.get_bottom() + 0.05 * DOWN, g.get_left() + 0.15 * LEFT + 0.5 * UP, buff=0.1,
                        color=style.ACTION, stroke_width=5)
        a_lab = mt("a", size=46, color=style.ACTION).next_to(a_arrow.point_from_proportion(0.5), UR, buff=0.1)
        e_arrow = Arrow(g.get_right() + 0.15 * RIGHT + 0.5 * UP, critic.get_bottom() + 0.05 * DOWN, buff=0.1,
                        color=GREY_B, stroke_width=5)
        e_lab = mt("s,\\ r,\\ s'", size=40, color=GREY_A).next_to(e_arrow.point_from_proportion(0.5), UL, buff=0.1)
        c_arrow = Arrow(critic.get_left(), actor.get_right(), buff=0.15, color=WHITE, stroke_width=6)
        c_lab = mt(r"\delta", size=52, color=WHITE).next_to(c_arrow, UP, buff=0.1)
        d_eq = mt(r"\delta", "=", "r", "+", r"\gamma", "V(s')", "-", "V(s)", size=40)
        d_eq[2].set_color(style.REWARD)
        d_eq[4].set_color(style.GAMMA)
        d_eq[5].set_color(style.VALUE)
        d_eq[7].set_color(style.VALUE)
        d_num = mt("=", "0", "+", "0.9", r"\times", f"{vn:.2f}", "-", f"{vs:.2f}", "=", f"{delta:+.2f}", size=36)
        d_num[9].set_color(GOOD)
        calc = VGroup(d_eq, d_num).arrange(DOWN, buff=0.25, aligned_edge=LEFT)
        calc.move_to(np.array([0, -2.35, 0])).to_edge(RIGHT, buff=0.35)
        up_eq = mt(r"\theta", r"\leftarrow", r"\theta", "+", r"\alpha", r"\delta",
                   r"\nabla_\theta \log \pi_\theta(a\mid s)", size=40)
        up_eq[0].set_color(style.THETA)
        up_eq[2].set_color(style.THETA)
        up_eq[6].set_color(style.POLICY)
        up_eq.move_to(np.array([0, -2.35, 0])).to_edge(LEFT, buff=0.3)
        good_lab = jt("予想より良かった", size=30, color=GOOD).next_to(c_arrow, DOWN, buff=0.15)
        with self.voice("クリティックは、{A}一歩進むたびに、TD誤差を計算します。予想より良かったか、悪かったか。"
                        "{B}これを、アドバンテージの見積もりとして、アクターに渡します。"
                        "{C}エピソードの最後まで待つ必要も、ありません。") as v:
            self.play(FadeIn(g), FadeIn(robot), run_time=0.6)
            self.play(GrowArrow(a_arrow), FadeIn(a_lab), run_time=0.6)
            self.wait_to(v, "A")
            self.play(robot.animate.move_to(g.center_of(n)), run_time=0.5)
            self.play(GrowArrow(e_arrow), FadeIn(e_lab), run_time=0.6)
            self.play(Write(d_eq), run_time=0.9)
            self.play(FadeIn(d_num, shift=0.1 * DOWN), run_time=0.7)
            self.wait_to(v, "B")
            self.play(GrowArrow(c_arrow), FadeIn(c_lab), run_time=0.7)
            tok = mt(r"\delta", size=52, color=GOOD).move_to(critic.get_left())
            self.play(tok.animate.move_to(actor.get_right() + 0.3 * LEFT), FadeIn(good_lab), run_time=0.8)
            self.play(FadeOut(tok), Write(up_eq), run_time=1.0)
            self.wait_to(v, "C")
            self.play(robot.animate.move_to(g.center_of((3, 3))), run_time=0.4)
            self.play(robot.animate.move_to(g.center_of((4, 3))).scale(0.7), run_time=0.4)
            self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.3), run_time=0.5)

        # 二本の道の合流
        loop = VGroup(actor, critic, actor_sub, critic_sub, g, robot, a_arrow, a_lab, e_arrow, e_lab, c_arrow, c_lab,
                      d_eq, d_num, up_eq, good_lab, td)
        top = mt(r"\max_\pi J(\pi)", size=56).move_to(np.array([-5.0, 0.0, 0]))
        p_v = np.array([-1.6, 1.6, 0])
        p_p = np.array([-1.6, -1.6, 0])
        merge = np.array([1.6, 0.0, 0])
        road_v = VMobject(stroke_color=style.VALUE, stroke_width=10).set_points_smoothly(
            [top.get_right() + 0.2 * RIGHT, np.array([-3.0, 1.2, 0]), p_v, np.array([0.8, 1.2, 0]), merge])
        road_p = VMobject(stroke_color=style.POLICY, stroke_width=10).set_points_smoothly(
            [top.get_right() + 0.2 * RIGHT, np.array([-3.0, -1.2, 0]), p_p, np.array([0.8, -1.2, 0]), merge])
        lv = jt("価値ベース（第2〜4章）", size=32, color=style.VALUE).next_to(p_v, UP, buff=0.3)
        lp = jt("方策ベース（第5章）", size=32, color=style.POLICY).next_to(p_p, DOWN, buff=0.3)
        ac_node = VGroup(RoundedRectangle(width=4.9, height=1.2, corner_radius=0.2, stroke_color=WHITE, stroke_width=3,
                                          fill_color="#141418", fill_opacity=1),
                         jt("アクター・クリティック", size=32, color=WHITE))
        ac_node[1].move_to(ac_node[0])
        ac_node.next_to(merge, RIGHT, buff=-0.05)
        with self.voice("価値を学ぶ道と、方策を学ぶ道。{A}第1章で分かれた二本の道が、ここで合流しました。"
                        "アクター・クリティックは、現代の強化学習の、ほとんどの手法の土台になっています。") as v:
            self.play(FadeOut(loop), run_time=0.8)
            self.play(Write(top), run_time=0.8)
            self.play(Create(road_v), FadeIn(lv), run_time=1.1)
            self.play(Create(road_p), FadeIn(lp), run_time=1.1)
            self.wait_to(v, "A")
            self.play(FadeIn(ac_node, scale=0.8), run_time=0.8)
            self.play(Indicate(ac_node, color=WHITE, scale_factor=1.08), run_time=1.0)
        self.play(FadeOut(VGroup(top, road_v, road_p, lv, lp, ac_node)), run_time=0.9)


# ---------------------------------------------------------------------------
# 9. デモ: いつもの世界で Actor-Critic
# ---------------------------------------------------------------------------
DEMO_EPISODES = 600
DEMO_SHOW = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 130, 160, 200, 250, 300, 400, 500, 600]


class Demo(VoiceScene):
    def construct(self):
        res = H.actor_critic(episodes=DEMO_EPISODES, lr_actor=1.0, lr_critic=0.3, seed=0, snap_every=5)
        snaps = dict(res["snaps"])
        Js = res["J"]
        Vs, pis, Jstar = H.optimal()

        g = GridView(WORLD, cell=1.25).move_to(np.array([-3.35, -0.35, 0]))
        glyphs = policy_glyphs(g, snaps[0])
        tag = jt("アクター・クリティック（マスごとの表）", size=30, color=GREY_B).to_edge(UP, buff=0.3)
        ep_lab = VGroup(jt("エピソード", size=34, color=GREY_B), Integer(0, font_size=44, color=WHITE)).arrange(RIGHT, buff=0.2)
        ep_lab.next_to(g, UP, buff=0.3).align_to(g, LEFT)

        # 学習曲線
        ax = Axes(x_range=[0, DEMO_EPISODES, 100], y_range=[-0.1, 0.5, 0.1], x_length=5.2, y_length=4.0,
                  axis_config=dict(color=GREY_B, stroke_width=2, include_tip=False),
                  tips=False).move_to(np.array([3.75, -0.2, 0]))
        yl = VGroup(*[mt(f"{v:.1f}", size=30, color=GREY_B).next_to(ax.c2p(0, v), LEFT, buff=0.12) for v in (0.0, 0.2, 0.4)])
        xl = VGroup(*[mt(str(v), size=30, color=GREY_B).next_to(ax.c2p(v, -0.1), DOWN, buff=0.12) for v in (0, 300, 600)])
        y_title = mt(r"J(\theta)", size=42, color=WHITE).next_to(ax, UP, buff=0.2).align_to(ax, LEFT)
        x_title = jt("エピソード", size=30, color=GREY_B).next_to(xl, DOWN, buff=0.1)
        opt = DashedLine(ax.c2p(0, Jstar), ax.c2p(DEMO_EPISODES, Jstar), color=style.VALUE, stroke_width=2.5)
        opt_lab = VGroup(jt("最適", size=30, color=style.VALUE), mt(f"{Jstar:.2f}", size=34, color=style.VALUE)).arrange(RIGHT, buff=0.1)
        opt_lab.next_to(opt, UP, buff=0.08).align_to(opt, RIGHT)
        J_val = DecimalNumber(Js[0][1], num_decimal_places=2, font_size=40, color=style.POLICY)

        with self.voice("いつもの世界で、試してみましょう。{A}最初は、どのマスでも、四つの方向を同じ確率で選びます。") as v:
            self.play(FadeIn(g), run_time=1.0)
            self.play(FadeIn(ax), FadeIn(yl), FadeIn(xl), FadeIn(y_title), FadeIn(x_title), Create(opt), FadeIn(opt_lab),
                      run_time=1.0)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(c, scale=0.6) for c in glyphs], lag_ratio=0.04), FadeIn(ep_lab), FadeIn(tag),
                      run_time=1.2)

        Jd = dict(Js)
        curve = VGroup()
        with self.voice("学習が進むにつれて、{A}良い方向の矢印が、だんだん太くなっていきます。{B}価値を経由せずに、"
                        "方策そのものを、少しずつ変えていく。これが、方策勾配法です。") as v:
            self.wait_to(v, "A")
            total = v.remaining() - 0.4
            per = total / (len(DEMO_SHOW) - 1)
            J_val.next_to(ax.c2p(0, Js[0][1]), RIGHT, buff=0.1)
            for e0, e1 in zip(DEMO_SHOW[:-1], DEMO_SHOW[1:]):
                pts = [ax.c2p(e, Jd[e]) for e in range(e0, e1 + 1, 5)]
                seg = VMobject(stroke_color=style.POLICY, stroke_width=4).set_points_as_corners(pts)
                curve.add(seg)
                new = policy_glyphs(g, snaps[e1])
                self.play(Transform(glyphs, new), Create(seg), ep_lab[1].animate.set_value(e1), run_time=per,
                          rate_func=linear)
            J_val.set_value(Jd[DEMO_SHOW[-1]]).next_to(ax.c2p(DEMO_EPISODES, Jd[DEMO_SHOW[-1]]), DOWN, buff=0.15).shift(0.3 * LEFT)
            self.play(FadeIn(J_val), run_time=0.4)

        # 最適方策との比較
        P = snaps[DEMO_EPISODES]
        diff = [s for s in pis if int(np.argmax(P[WORLD.index[s]])) != pis[s]]
        assert len(diff) == 1, diff  # ナレーション「一マスだけ」と一致させる
        marks = VGroup(*[SurroundingRectangle(g.cells[s], color=BAD, buff=-0.04, stroke_width=5) for s in diff])
        with self.voice("よく通る道では、第2章で求めた最適方策と、同じ向きになりました。"
                        "{A}ほとんど通らない[下|した]の段には、まだ迷いが残っていて、{B}[一マス|ひとマス]だけ、最適とは違う向きを選んでいます。") as v:
            main = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3)]
            ns = g.nonterminal_states()
            self.play(LaggedStart(*[Indicate(glyphs[ns.index(s)], color=style.POLICY, scale_factor=1.2) for s in main],
                                  lag_ratio=0.12), run_time=1.8)
            self.wait_to(v, "A")
            bottom = [k for k, s in enumerate(g.nonterminal_states()) if s[1] == 0 and s != (0, 0)]
            self.play(LaggedStart(*[Indicate(glyphs[k], color=WHITE, scale_factor=1.15) for k in bottom], lag_ratio=0.1),
                      run_time=1.4)
            self.wait_to(v, "B")
            self.play(Create(marks), run_time=0.6)
            for s in diff:
                ar = g.arrow(s, pis[s], color=WHITE, length=0.55, stroke_width=5).shift(0.3 * g.cell * DOWN)
                lab = jt("最適", size=28, color=WHITE).next_to(g.cells[s], DOWN, buff=0.1)
                self.play(GrowArrow(ar), FadeIn(lab), run_time=0.6)
                marks.add(ar, lab)
        self.play(FadeOut(VGroup(g, glyphs, tag, ep_lab, ax, yl, xl, y_title, x_title, opt, opt_lab, curve, J_val, marks)),
                  run_time=0.9)


# ---------------------------------------------------------------------------
# 10. 次回予告: 更新幅と方策オン
# ---------------------------------------------------------------------------
class Outro(VoiceScene):
    def construct(self):
        big = H.pg_steps_1d(mu0=H.MU0, n=8, steps=14, lr=10.0, seed=5)
        small = H.pg_steps_1d(mu0=H.MU0, n=8, steps=14, lr=2.5, seed=3)
        mus_b = [s["mu"] for s in big] + [big[-1]["mu_next"]]
        mus_s = [s["mu"] for s in small] + [small[-1]["mu_next"]]
        J_b = [H.expected_reward(m) for m in mus_b]
        J_s = [H.expected_reward(m) for m in mus_s]
        crash = int(np.argmax(np.diff(mus_b))) + 1  # 大きく飛んだステップ

        L = Line1D(xmin=-3.8, xmax=9.8, left=-6.3, right=6.0, y=0.45, pdf_h=2.0, r_h=1.8)
        axis = L.axis(label=False)
        rc = L.reward_curve()
        mnt = L.mountain(mus_b[0])
        r_lab = mt("R(x)", size=36, color=style.REWARD).next_to(L.pt(H.R_CENTER + 1.2, 1.8 * H.reward_1d(H.R_CENTER + 1.2)),
                                                                 RIGHT, buff=0.1)
        pi_lab = mt(r"\pi_\theta", size=40, color=style.POLICY).next_to(L.pt(mus_b[0], 2.0), UP, buff=0.1)

        ax = Axes(x_range=[0, len(mus_b) - 1, 2], y_range=[0, 0.8, 0.2], x_length=8.4, y_length=2.5,
                  axis_config=dict(color=GREY_B, stroke_width=2, include_tip=False), tips=False)
        ax.move_to(np.array([-0.2, -2.35, 0]))
        y_title = mt(r"J(\theta)", size=42).next_to(ax, LEFT, buff=0.25).shift(0.8 * UP)
        x_title = jt("更新の回数", size=30, color=GREY_B).next_to(ax.x_axis, RIGHT, buff=0.2)
        c_s = VMobject(stroke_color=GREY_B, stroke_width=4).set_points_as_corners([ax.c2p(k, j) for k, j in enumerate(J_s)])
        s_lab = jt("小さな更新", size=30, color=GREY_B).next_to(ax.c2p(len(J_s) - 1, J_s[-1]), UP, buff=0.15).shift(0.6 * LEFT)
        b_lab = jt("大きすぎる更新", size=30, color=BAD)

        with self.voice("ただし、方策勾配法には、扱いの難しいところがあります。{A}一度に大きく更新しすぎると、"
                        "方策が壊れてしまい、{B}その壊れた方策で集めたデータで、また学習することになるんです。"
                        "教師あり学習と違って、データセットが、自分の失敗で汚れてしまう。") as v:
            self.play(Create(axis), Create(rc), FadeIn(r_lab), DrawBorderThenFill(mnt), FadeIn(pi_lab), FadeIn(ax),
                      FadeIn(y_title), FadeIn(x_title), Create(c_s), FadeIn(s_lab), run_time=1.4)
            segs = VGroup()
            per = max(0.25, (v.until("A") - 0.2) / (crash - 1))
            for k in range(crash - 1):
                seg = Line(ax.c2p(k, J_b[k]), ax.c2p(k + 1, J_b[k + 1]), color=BAD, stroke_width=5)
                segs.add(seg)
                self.play(Create(seg), VGroup(mnt, pi_lab).animate.shift((L.X(mus_b[k + 1]) - L.X(mus_b[k])) * RIGHT),
                          run_time=per)
            self.wait_to(v, "A")
            k = crash - 1
            seg = Line(ax.c2p(k, J_b[k]), ax.c2p(k + 1, J_b[k + 1]), color=BAD, stroke_width=5)
            segs.add(seg)
            self.play(Create(seg), VGroup(mnt, pi_lab).animate.shift((L.X(mus_b[k + 1]) - L.X(mus_b[k])) * RIGHT),
                      run_time=1.2)
            b_lab.next_to(ax.c2p(crash, J_b[crash]), UR, buff=0.1).shift(0.3 * UP)
            self.play(FadeIn(b_lab), Flash(ax.c2p(crash, J_b[crash]), color=BAD, flash_radius=0.3), run_time=0.6)
            self.wait_to(v, "B")
            rng = np.random.default_rng(2)
            for k in range(crash, len(mus_b) - 1):
                if k < crash + 3:
                    xs = rng.normal(mus_b[k], 1.0, 8)
                    d = VGroup(*[L.sample_dot(x, H.reward_1d(x)) for x in xs])
                    self.play(FadeIn(d, shift=0.3 * DOWN), run_time=0.35)
                    self.play(FadeOut(d), run_time=0.3)
                seg = Line(ax.c2p(k, J_b[k]), ax.c2p(k + 1, J_b[k + 1]), color=BAD, stroke_width=5)
                segs.add(seg)
                self.play(Create(seg), VGroup(mnt, pi_lab).animate.shift((L.X(mus_b[k + 1]) - L.X(mus_b[k])) * RIGHT),
                          run_time=0.3)

        # データは使い捨て（方策オン）
        self.play(FadeOut(VGroup(axis, rc, r_lab, mnt, pi_lab, ax, y_title, x_title, c_s, s_lab, b_lab, segs)), run_time=0.8)

        def card(color=style.POLICY):
            r = RoundedRectangle(width=1.1, height=1.4, corner_radius=0.1, stroke_color=color, stroke_width=2.5,
                                 fill_color="#141418", fill_opacity=1)
            pts = [r.get_center() + np.array([-0.3, -0.45, 0]), r.get_center() + np.array([-0.3, 0.1, 0]),
                   r.get_center() + np.array([0.1, 0.1, 0]), r.get_center() + np.array([0.1, 0.45, 0]),
                   r.get_center() + np.array([0.35, 0.45, 0])]
            ln = VMobject(stroke_color=color, stroke_width=3).set_points_as_corners(pts)
            return VGroup(r, ln)

        cards = VGroup(*[card() for _ in range(4)]).arrange(RIGHT, buff=0.25).scale(1.2).move_to(np.array([-3.4, 0.9, 0]))
        c_lab = VGroup(mt(r"\pi_\theta", size=46, color=style.POLICY), jt("で集めたデータ", size=34, color=GREY_A)).arrange(RIGHT, buff=0.12)
        c_lab.next_to(cards, UP, buff=0.35)
        upd = mt(r"\theta", r"\to", r"\theta'", size=70)
        upd[0].set_color(style.THETA)
        upd[2].set_color(style.THETA)
        upd.move_to(np.array([2.8, 0.9, 0]))
        u_ar = Arrow(cards.get_right(), upd.get_left(), buff=0.3, color=GREY_B, stroke_width=5)
        onp = jt("方策オン", size=40, color=WHITE).move_to(np.array([2.8, -1.4, 0]))
        with self.voice("しかも、集めたデータは、{A}その時点の方策でしか使えません。方策を少し変えるたびに、データを集め直す必要があります。") as v:
            self.play(LaggedStart(*[FadeIn(c, shift=0.2 * UP) for c in cards], lag_ratio=0.15), FadeIn(c_lab), run_time=1.0)
            self.play(GrowArrow(u_ar), Write(upd), run_time=1.0)
            self.wait_to(v, "A")
            self.play(Transform(cards, faded(cards, 0.25)), Transform(c_lab, faded(c_lab, 0.35)), run_time=0.8)
            xs_ = VGroup(*[cross_mark(0.5).move_to(c) for c in cards])
            self.play(Create(xs_), run_time=0.6)
            new_cards = VGroup(*[card(color=style.THETA) for _ in range(4)]).arrange(RIGHT, buff=0.25).scale(1.2)
            new_cards.next_to(cards, DOWN, buff=0.6)
            nl = VGroup(mt(r"\pi_{\theta'}", size=46, color=style.THETA), jt("で集め直す", size=34, color=GREY_A)).arrange(RIGHT, buff=0.12)
            nl.next_to(new_cards, DOWN, buff=0.3)
            self.play(LaggedStart(*[FadeIn(c, shift=0.2 * UP) for c in new_cards], lag_ratio=0.15), FadeIn(nl), run_time=1.2)
            self.play(FadeIn(onp), run_time=0.6)

        # 安全な範囲で更新し、データを使い回したい
        c0 = np.array([-3.2, 0.0, 0])
        th_dot = Dot(c0, radius=0.13, color=style.THETA)
        th_l = mt(r"\theta", size=52, color=style.THETA).next_to(th_dot, DL, buff=0.1)
        safe = DashedVMobject(Circle(radius=1.6, color=GREY_B, stroke_width=3), num_dashes=44).move_to(c0)
        safe_l = jt("安全な範囲", size=32, color=GREY_B).next_to(safe, UP, buff=0.15)
        ok_ar = Arrow(c0, c0 + np.array([1.2, 0.6, 0]), buff=0.12, color=GOOD, stroke_width=7)
        bad_ar = Arrow(c0, c0 + np.array([2.9, -1.4, 0]), buff=0.12, color=BAD, stroke_width=7)
        bad_x = cross_mark(0.5).move_to(bad_ar.get_end() + 0.1 * LEFT)
        cards2 = VGroup(*[card() for _ in range(3)]).arrange(RIGHT, buff=0.25).scale(1.2).move_to(np.array([3.4, -0.4, 0]))
        reuse = CurvedArrow(cards2.get_right() + 0.2 * RIGHT + 0.2 * UP, cards2.get_left() + 0.2 * LEFT + 0.2 * UP,
                            angle=2.2, color=style.POLICY, stroke_width=6)
        reuse_l = jt("何度も使う", size=32, color=style.POLICY).next_to(reuse, UP, buff=0.15)
        ppo = jt("PPO", size=110, color=WHITE, weight="BOLD").move_to(UP * 0.4)
        ppo_sub = jt("最終章の主役", size=36, color=GREY_B).next_to(ppo, DOWN, buff=0.4)
        toks = VGroup(*[token_chip(t, size=40) for t in ["強化", "学習", "は", "面白い"]]).arrange(RIGHT, buff=0.12)
        toks.next_to(ppo_sub, DOWN, buff=0.7)
        with self.voice("更新を、{A}安全な範囲にとどめながら、{B}集めたデータを、できるだけ有効に使いたい。"
                        "{C}その答えが、最終章の主役、PPOです。{D}そしてそれは、大規模言語モデルの学習へと、まっすぐつながっていきます。") as v:
            self.play(FadeOut(VGroup(cards, c_lab, upd, u_ar, xs_, new_cards, nl, onp)), run_time=0.7)
            self.play(FadeIn(th_dot), FadeIn(th_l), run_time=0.4)
            self.wait_to(v, "A")
            self.play(Create(safe), FadeIn(safe_l), run_time=0.8)
            self.play(GrowArrow(ok_ar), run_time=0.5)
            self.play(GrowArrow(bad_ar), run_time=0.5)
            self.play(Create(bad_x), run_time=0.4)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[FadeIn(c, shift=0.2 * UP) for c in cards2], lag_ratio=0.15), run_time=0.8)
            self.play(Create(reuse), FadeIn(reuse_l), run_time=0.9)
            self.wait_to(v, "C")
            self.play(FadeOut(VGroup(th_dot, th_l, safe, safe_l, ok_ar, bad_ar, bad_x, cards2, reuse, reuse_l)),
                      Write(ppo), run_time=1.0)
            self.play(FadeIn(ppo_sub), run_time=0.6)
            self.wait_to(v, "D")
            self.play(LaggedStart(*[FadeIn(t, shift=0.2 * RIGHT) for t in toks], lag_ratio=0.2), run_time=1.2)
        self.play(FadeOut(VGroup(ppo, ppo_sub, toks)), run_time=0.9)
        play_end_card(self, next_title="第6章　言語モデルを強化学習で鍛える")
