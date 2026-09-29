"""第2章「価値という考え方」— 価値関数、ベルマン方程式、方策評価、Q、方策反復、価値反復。

レンダリング:  python tools/build.py ch02 [-q l]
"""
from __future__ import annotations

import numpy as np
from manim import *

from common import style
from common.mobjects import ACTION_VEC, GridView, Robot, goal_icon, pit_icon, value_color
from common.rl import (ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP,
                       discounted_return)
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene

from chapters.ch02.helpers import (GAMMA, GOAL, NONTERM, PE_HIST, PI_ROUNDS, PI_STAR, PIT, Q_STAR,
                                   Q_UNI, UNIFORM, V_STAR, V_UNI, VI_HIST, WORLD, arrow_glyph,
                                   bellman, bellman_pieces, clean, cross_glyph, fx, heat_anims,
                                   labels_group, local_view, n_vec, node_box, path_line, pe_errors,
                                   pieces_P, pieces_pi, policy_arrow, policy_arrow_map, pulse, q_tri_grid,
                                   q_tri_labels, q_tris, set_heat, value_labels)

CHAPTER_TITLE = "第2章 価値という考え方"

SCENES = [
    "Hook", "Title", "StateValue", "Bellman", "Evaluation", "ActionValue", "Improvement",
    "Optimality", "RiskAverse", "Limits", "Outro",
]


# ---------------------------------------------------------------------------
# 章内の小道具
# ---------------------------------------------------------------------------
def top_of(g: GridView, s, k=0.28):
    """マスの上寄りの位置（数字にロボットが重ならないように）。"""
    return g.center_of(s) + k * g.cell * UP


def neighbours(s):
    out = []
    for a in ACTIONS:
        n = WORLD.move(s, a)
        if n != s and n not in out:
            out.append(n)
    return out


def cell_box(g: GridView, s, color=style.STATE, width=6):
    return Square(g.cell, stroke_color=color, stroke_width=width).move_to(g.center_of(s))


def bump(c, d, cell, color=GREY_A, width=4):
    """壁にぶつかってその場にとどまる、を表す短い矢印と壁の印。"""
    d = np.array(d, dtype=float)
    end = c + d * cell * 0.44
    ar = Arrow(c + d * 0.1, end, buff=0, stroke_width=width, color=color,
               max_tip_length_to_length_ratio=0.3, max_stroke_width_to_length_ratio=12)
    perp = np.array([-d[1], d[0], 0.0])
    wall = Line(end + perp * 0.24 + d * 0.05, end - perp * 0.24 + d * 0.05, stroke_width=7, color=WHITE)
    return VGroup(ar, wall)


def equation_system(size=30):
    """15本の連立方程式（ベルマン方程式をマスごとに並べたもの）。"""
    rows = VGroup()
    for i, s in enumerate(NONTERM):
        r = fx(f"V_{{{i + 1}}}", "=", r"\sum_{a}", r"\pi", r"\sum_{s'}", "P", r"\big[", "r", "+",
               r"\gamma", "V", r"\big]", size=size)
        r[0][0].set_color(style.VALUE)
        rows.add(r)
    left = VGroup(*rows[:8]).arrange(DOWN, aligned_edge=LEFT, buff=0.24)
    right = VGroup(*rows[8:]).arrange(DOWN, aligned_edge=LEFT, buff=0.24)
    cols = VGroup(left, right).arrange(RIGHT, buff=0.7, aligned_edge=UP)
    brace = Brace(cols, LEFT, color=GREY_B)
    return VGroup(brace, cols)


def v_at(coord: str):
    """V^π(3,3) のような部品列。"""
    return [r"V^{\pi}", coord]


# ---------------------------------------------------------------------------
# 1. つかみ
# ---------------------------------------------------------------------------
class Hook(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.35).move_to(0.35 * DOWN)
        set_heat(g, V_STAR)
        labs = value_labels(g, V_STAR, size=34)
        lab_g = labels_group(labs)
        robot = Robot(height=0.4).move_to(top_of(g, WORLD.start, 0.31))

        with self.voice("前回の最後に、こんな絵をお見せしました。{A}マスごとに書かれた、この数字。"
                        "これが分かっていれば、ロボットは、{B}となりのマスのうち、数字の大きい方へ進んでいくだけで、"
                        "星にたどり着けます。") as v:
            self.play(FadeIn(g), FadeIn(lab_g), run_time=1.2)
            self.play(FadeIn(robot, scale=0.8), run_time=0.5)
            self.play(robot.blink())
            self.wait_to(v, "A")
            self.play(LaggedStart(*[Indicate(l, color=WHITE, scale_factor=1.35) for l in labs.values()],
                                  lag_ratio=0.06), run_time=1.8)
            self.wait_to(v, "B")
            path = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3)]
            per = min(1.1, max(0.75, (v.remaining() + 0.8) / 7))
            for s, n in zip(path[:-1], path[1:]):
                cands = neighbours(s)
                boxes = {c: Square(g.cell * 0.94, stroke_color=GREY_A, stroke_width=4).move_to(g.center_of(c))
                         for c in cands}
                others = [c for c in cands if c != n]
                look0 = n_vec(s, others[0]) if others else n_vec(s, n)
                self.play(*[Create(b) for b in boxes.values()], robot.animate.look(look0), run_time=per * 0.35)
                self.play(boxes[n].animate.set_stroke(style.REWARD, 7), *[FadeOut(boxes[c]) for c in others],
                          robot.animate.look(n_vec(s, n)), run_time=per * 0.3)
                if n == GOAL:
                    self.play(robot.animate.move_to(g.center_of(n) + 0.1 * UP), FadeOut(boxes[n]),
                              run_time=per * 0.35)
                    self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.6, num_lines=12),
                              robot.animate(rate_func=there_and_back).shift(0.25 * UP), run_time=0.6)
                else:
                    self.play(robot.animate.move_to(top_of(g, n, 0.31)), FadeOut(boxes[n]), run_time=per * 0.35)

        # 二つの問い
        world = VGroup(g, lab_g)
        big = labs[(0, 0)].copy()
        q1 = mt(r"=\ ?", size=84, color=GREY_A)
        with self.voice("でも、{A}この数字は、いったい何を表しているのでしょうか。"
                        "そして、{B}どうやって計算すればいいのでしょうか。"
                        "今回は、{C}この二つの問いに答えていきます。") as v:
            self.play(FadeOut(robot, shift=2.5 * LEFT), world.animate.shift(2.5 * LEFT), run_time=1.0)
            self.wait_to(v, "A")
            target = big.copy().scale(2.4).move_to(RIGHT * 3.6 + UP * 1.0)
            q1.next_to(target, RIGHT, buff=0.3)
            self.play(Indicate(labs[(0, 0)], color=style.REWARD, scale_factor=1.4), run_time=0.8)
            self.play(big.animate.scale(2.4).move_to(target), run_time=0.9)
            self.play(FadeIn(q1, shift=0.2 * LEFT), run_time=0.6)
            self.wait_to(v, "B")
            qs = {s: jt("?", size=40, color=GREY_B).move_to(g.center_of(s)) for s in labs}
            self.play(*[ReplacementTransform(labs[s], qs[s]) for s in labs],
                      *[g.cells[s].animate.set_fill(style.BG, 1) for s in labs], run_time=1.2)
            self.play(LaggedStart(*[Wiggle(q, scale_value=1.2) for q in qs.values()], lag_ratio=0.04),
                      run_time=1.4)
            self.wait_to(v, "C")
            labs2 = value_labels(g, V_STAR, size=34)
            self.play(*[ReplacementTransform(qs[s], labs2[s]) for s in labs],
                      *[g.cells[s].animate.set_fill(value_color(V_STAR[s]), 1) for s in labs],
                      Indicate(VGroup(big, q1), color=WHITE), run_time=1.4)
        self.play(FadeOut(VGroup(g, *labs2.values(), big, q1)), run_time=0.9)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 2, "価値という考え方")


# ---------------------------------------------------------------------------
# 3. 状態価値
# ---------------------------------------------------------------------------
SV_START = (2, 1)
SV_SEED = 768  # 最初の5回に「星」と「穴」が混ざり、平均が真の値の近くに落ち着く系列


def sv_episodes(n=1000):
    rng = np.random.default_rng(SV_SEED)
    eps = [WORLD.rollout(UNIFORM, rng, start=SV_START, max_steps=300) for _ in range(n)]
    G = np.array([discounted_return([x[2] for x in t], GAMMA) for t in eps])
    return eps, G, np.cumsum(G) / np.arange(1, n + 1)


class StateValue(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.2).move_to(LEFT * 3.5 + 0.3 * UP)
        robot = Robot(height=0.5).move_to(g.center_of(SV_START))
        focus = cell_box(g, SV_START)
        eps, G, avg = sv_episodes()

        with self.voice("あるマスの「良さ」を測る、いちばん素直な方法は何でしょう。") as v:
            self.play(FadeIn(g), run_time=1.0)
            self.play(FadeIn(robot, scale=0.8), Create(focus), run_time=0.8)
            self.play(robot.blink())
            self.play(robot.animate.look(UR), run_time=0.5)

        traces = VGroup()
        rets = VGroup()
        col_x, col_y, col_dy = 1.0, 2.55, 0.62

        def play_episode(k, run_time):
            t = eps[k]
            states = [t[0][0]] + [x[3] for x in t]
            end = states[-1]
            col = style.REWARD if end == GOAL else RED
            line = path_line(g, states, color=GREY_A, jitter=0.13, seed=k + 11, width=3, opacity=0.9)
            rob = Robot(height=0.5).move_to(g.center_of(SV_START))
            if k > 0:
                self.add(rob)
            else:
                rob = robot
            self.add(line, rob)
            self.play(Create(line), MoveAlongPath(rob, line), run_time=run_time, rate_func=linear)
            lab = mt(f"G = {G[k]:+.2f}", size=40, color=col)
            lab.move_to(RIGHT * col_x + UP * (col_y - k * col_dy), aligned_edge=LEFT)
            fx_end = (Flash(g.center_of(end), color=col, flash_radius=0.5, num_lines=10, run_time=0.5))
            self.play(rob.animate.scale(0.2).set_opacity(0), fx_end,
                      line.animate.set_stroke(color=col, opacity=0.22),
                      FadeIn(lab, shift=0.2 * LEFT), run_time=0.5)
            self.remove(rob)
            traces.add(line)
            rets.add(lab)

        sep = Line(RIGHT * (col_x - 0.1), RIGHT * (col_x + 3.6), stroke_color=GREY_C, stroke_width=2)
        sep.shift(UP * (col_y - 4.6 * col_dy))
        avg_lab = jt("平均", size=34, color=WHITE)
        avg_num = DecimalNumber(G[0], num_decimal_places=2, include_sign=True, font_size=44, color=WHITE)
        avg_row = VGroup(avg_lab, avg_num).arrange(RIGHT, buff=0.35)
        avg_row.next_to(sep, DOWN, buff=0.3).align_to(sep, LEFT).shift(0.1 * RIGHT)

        with self.voice("そのマスから何度もスタートして、{A}実際にリターンを測り、{B}その平均を取ることです。") as v:
            ghosts = VGroup(*[Robot(height=0.5).move_to(g.center_of(SV_START)).set_opacity(0.35)
                              for _ in range(3)])
            self.play(LaggedStart(*[Indicate(gh, scale_factor=1.3) for gh in ghosts], lag_ratio=0.3),
                      run_time=min(1.6, v.until("A")))
            self.remove(*ghosts)
            self.wait_to(v, "A")
            play_episode(0, 1.6)
            self.wait_to(v, "B")
            self.play(Create(sep), FadeIn(avg_row, shift=0.1 * UP), run_time=0.7)

        with self.voice("このロボットが、でたらめに動くとしましょう。すると、あるときは星にたどり着き、"
                        "あるときは穴に落ちる。リターンは毎回ばらばらですが、{A}たくさん集めて平均すれば、"
                        "ある[値|あたい]に落ち着いていきます。") as v:
            per = max(1.0, (v.until("A") - 0.3) / 4 - 0.8)
            for k in range(1, 5):
                play_episode(k, per)
                self.play(ChangeDecimalToValue(avg_num, avg[k]), Indicate(avg_row, scale_factor=1.05),
                          run_time=0.35)

            # 早回し: 1000回分の平均の推移（横軸は対数）
            ymax = 0.4
            ax = Axes(x_range=[0, 3, 1], y_range=[-ymax, ymax, 0.2], x_length=5.0, y_length=3.8, tips=False,
                      axis_config={"color": GREY_C, "stroke_width": 2, "include_ticks": True,
                                   "tick_size": 0.06}).move_to(RIGHT * 3.6 + 0.35 * UP)
            xt = VGroup(*[mt(t, size=28, color=GREY_B).next_to(ax.c2p(i, -ymax), DOWN, buff=0.15)
                          for i, t in enumerate(["1", "10", "100", "1000"])])
            yt = VGroup(*[mt(t, size=26, color=GREY_B).next_to(ax.c2p(0, y), LEFT, buff=0.15)
                          for t, y in [("+0.4", 0.4), ("0", 0.0), ("-0.4", -0.4)]])
            xl = jt("エピソード数", size=28, color=GREY_B).next_to(xt, DOWN, buff=0.2)
            yl = jt("平均リターン", size=28, color=GREY_B).next_to(ax, UP, buff=0.2).align_to(ax, LEFT)
            zero = DashedLine(ax.c2p(0, 0), ax.c2p(3, 0), stroke_color=GREY_D, stroke_width=1.5)
            pts = [ax.c2p(np.log10(n), float(np.clip(avg[n - 1], -ymax, ymax))) for n in range(1, len(avg) + 1)]
            curve = VMobject(stroke_color=WHITE, stroke_width=3).set_points_as_corners(pts)
            cnt_lab = jt("エピソード", size=28, color=GREY_B)
            cnt = Integer(1000, font_size=40, color=WHITE)
            counter = VGroup(cnt_lab, cnt).arrange(RIGHT, buff=0.25).next_to(ax, UP, buff=0.75).align_to(ax, RIGHT)
            cnt.set_value(5)
            self.wait_to(v, "A")
            self.play(FadeOut(rets), FadeOut(sep), FadeOut(avg_row), run_time=0.5)
            self.play(Create(ax), FadeIn(xt), FadeIn(yt), FadeIn(xl), FadeIn(yl), Create(zero), FadeIn(counter),
                      run_time=0.8)
            self.play(Create(curve, rate_func=linear),
                      UpdateFromAlphaFunc(cnt, lambda m, a: m.set_value(int(round(10 ** (3 * a))))), run_time=4.0)

        v_true = V_UNI[SV_START]
        vline = DashedLine(ax.c2p(0, v_true), ax.c2p(3, v_true), stroke_color=style.VALUE, stroke_width=4)
        vnum = DecimalNumber(v_true, num_decimal_places=2, include_sign=True, font_size=40, color=style.VALUE)
        vword = jt("価値", size=40, color=style.VALUE)
        VGroup(vword, vnum).arrange(RIGHT, buff=0.25).move_to(ax.c2p(2.15, -0.26))
        in_cell = DecimalNumber(v_true, num_decimal_places=2, font_size=30, color=WHITE, edge_to_fix=ORIGIN)
        in_cell.move_to(g.center_of(SV_START))
        vdef = fx(r"V^{\pi}", "(", "s", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "G_t", r"\mid", "s_t", "=",
                  "s", r"\big]", size=56).move_to(DOWN * 3.1)
        with self.voice("この平均の行き着く先を、その状態の{A}価値と呼びます。式で書くと、{B}こうなります。"
                        "{C}状態[s|エス]から出発して、{D}方策パイに従って動いたときの、{E}リターンの期待値です。") as v:
            self.play(Create(vline), FadeIn(vnum), run_time=0.9)
            self.wait_to(v, "A")
            self.play(FadeIn(vword, shift=0.1 * RIGHT), traces.animate.set_stroke(opacity=0.06), run_time=0.6)
            self.play(TransformFromCopy(vnum, in_cell), g.cells[SV_START].animate.set_fill(value_color(v_true), 1),
                      run_time=1.0)
            self.wait_to(v, "B")
            self.play(Write(vdef), run_time=1.3)
            self.wait_to(v, "C")
            self.play(Indicate(vdef[9:12], color=style.STATE), Indicate(focus, color=style.STATE), run_time=1.0)
            self.wait_to(v, "D")
            self.play(Indicate(vdef[5], color=style.POLICY, scale_factor=1.4), run_time=1.0)
            self.wait_to(v, "E")
            self.play(Circumscribe(vdef[5:], color=style.VALUE), run_time=1.2)

        # 方策によって価値が変わる
        rnd = eps[3]
        rnd_states = [rnd[0][0]] + [x[3] for x in rnd]
        l_rnd = path_line(g, rnd_states, color=GREY_B, jitter=0.12, seed=5, width=4)
        smart = [(2, 1), (2, 2), (2, 3), (3, 3), (4, 3)]
        l_smart = path_line(g, smart, color=style.REWARD, width=7)
        leg_r = VGroup(Line(LEFT * 0.4, RIGHT * 0.4, stroke_color=GREY_B, stroke_width=4),
                       jt("でたらめに動く", size=34, color=GREY_A)).arrange(RIGHT, buff=0.3)
        leg_s = VGroup(Line(LEFT * 0.4, RIGHT * 0.4, stroke_color=style.REWARD, stroke_width=7),
                       jt("賢く動く", size=34, color=GREY_A)).arrange(RIGHT, buff=0.3)
        legend = VGroup(leg_r, leg_s).arrange(DOWN, aligned_edge=LEFT, buff=0.5).move_to(RIGHT * 3.4 + 0.2 * DOWN)
        with self.voice("ここで大事なのは、価値は{A}方策によって変わる、ということです。"
                        "同じマスにいても、{B}でたらめに動くロボットと、{C}賢く動くロボットとでは、"
                        "この先の未来が違うからです。") as v:
            chart = VGroup(ax, xt, yt, xl, yl, zero, curve, counter, vline, vnum, vword)
            self.play(FadeOut(chart), FadeOut(traces), vdef.animate.scale(0.9).move_to(RIGHT * 3.4 + UP * 2.6),
                      run_time=1.0)
            self.wait_to(v, "A")
            self.play(Indicate(vdef[0][1], color=style.POLICY, scale_factor=1.8),
                      Indicate(vdef[5][1], color=style.POLICY, scale_factor=1.8), run_time=1.2)
            self.wait_to(v, "B")
            self.play(Create(l_rnd), FadeIn(leg_r), run_time=1.6)
            self.wait_to(v, "C")
            self.play(Create(l_smart), FadeIn(leg_s), run_time=1.2)

        # でたらめな方策の価値 vs 賢い方策の価値
        gL = GridView(WORLD, cell=1.2).move_to(LEFT * 3.45 + 0.45 * DOWN)
        gR = GridView(WORLD, cell=1.2).move_to(RIGHT * 3.45 + 0.45 * DOWN)
        hL = jt("でたらめな方策", size=36, color=GREY_A).next_to(gL, UP, buff=0.35)
        hR = jt("賢い方策", size=36, color=GREY_A).next_to(gR, UP, buff=0.35)
        labsL = value_labels(gL, V_UNI, size=30)
        labsR = value_labels(gR, V_STAR, size=30)
        danger = [s for s in NONTERM if V_UNI[s] < -0.1]
        with self.voice("{A}左は、でたらめな方策の価値。{B}右は、賢い方策の価値です。"
                        "{C}でたらめに動くと、穴の周りは危険なので、価値がマイナスになっています。") as v:
            self.play(FadeOut(VGroup(l_rnd, l_smart, legend, vdef, focus, in_cell)), run_time=0.6)
            self.play(ReplacementTransform(g, gL), FadeIn(hL), run_time=0.8)
            self.wait_to(v, "A")
            self.play(*heat_anims(gL, V_UNI), LaggedStart(*[FadeIn(l) for l in labsL.values()], lag_ratio=0.04),
                      run_time=1.2)
            self.wait_to(v, "B")
            self.play(FadeIn(gR), FadeIn(hR), run_time=0.6)
            self.play(*heat_anims(gR, V_STAR), LaggedStart(*[FadeIn(l) for l in labsR.values()], lag_ratio=0.04),
                      run_time=1.2)
            self.wait_to(v, "C")
            rings = VGroup(*[cell_box(gL, s, color=RED, width=5) for s in danger])
            self.play(Create(rings), Indicate(gL.icons[PIT], color=RED, scale_factor=1.3), run_time=1.0)
            self.play(LaggedStart(*[Indicate(labsL[s], color=RED, scale_factor=1.3) for s in danger],
                                  lag_ratio=0.2), run_time=1.4)
        self.play(FadeOut(VGroup(gL, gR, hL, hR, rings, *labsL.values(), *labsR.values())), run_time=0.9)


# ---------------------------------------------------------------------------
# 4. ベルマン方程式
# ---------------------------------------------------------------------------
class Bellman(VoiceScene):
    def construct(self):
        vdef = fx(r"V^{\pi}", "(", "s", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "G_t", r"\mid", "s_t", "=",
                  "s", r"\big]", size=52).move_to(UP * 2.9)
        rec = fx("G_t", "=", "r_{t+1}", "+", r"\gamma", "G_{t+1}", size=58).move_to(UP * 1.3)
        rec_box = SurroundingRectangle(rec, color=style.REWARD, buff=0.25, corner_radius=0.1)
        with self.voice("では、価値はどうやって計算すればいいのか。ここで、前回の最後に出てきた、"
                        "{A}リターンの再帰的な関係が効いてきます。") as v:
            self.play(Write(vdef), run_time=1.4)
            self.wait_to(v, "A")
            self.play(Write(rec), run_time=1.2)
            self.play(Create(rec_box), run_time=0.6)

        eq3 = fx(r"\mathbb{E}_{\pi}", r"\big[", "G_t", r"\mid", "s_t", "=", "s", r"\big]", "=", r"\mathbb{E}_{\pi}",
                 r"\big[", "r_{t+1}", "+", r"\gamma", "G_{t+1}", r"\mid", "s_t", "=", "s", r"\big]",
                 size=52).move_to(DOWN * 0.5)
        eq4 = fx(r"V^{\pi}", "(", "s", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "r_{t+1}", "+", r"\gamma",
                 "G_{t+1}", r"\mid", "s_t", "=", "s", r"\big]", size=52).move_to(DOWN * 0.5)
        with self.voice("{A}両辺の、期待値を取ってみましょう。{B}左辺は、定義により、価値そのものです。") as v:
            self.wait_to(v, "A")
            pairs = [(0, 2), (1, 8), (2, 11), (3, 12), (4, 13), (5, 14)]
            new = [i for i in range(len(eq3)) if i not in {j for _, j in pairs}]
            self.play(*[TransformFromCopy(rec[i], eq3[j]) for i, j in pairs],
                      *[FadeIn(eq3[i]) for i in new], run_time=1.5)
            self.wait_to(v, "B")
            self.play(Indicate(eq3[0:8], color=style.VALUE), Indicate(vdef, color=WHITE, scale_factor=1.05),
                      run_time=1.0)
            self.play(ReplacementTransform(eq3[0:8], eq4[0:4]), ReplacementTransform(eq3[8:], eq4[4:]),
                      run_time=1.0)

        # 時間の流れ: 過去 … s_t → s_{t+1} → 未来
        y0 = -1.0
        xs = [-5.8, -4.3, -2.6, -0.5, 1.4, 3.0, 4.6]
        nodes = VGroup(*[Circle(0.22, stroke_color=style.STATE if i in (2, 3) else GREY_C, stroke_width=4,
                                fill_color=style.BG, fill_opacity=1).move_to(RIGHT * x + UP * y0)
                         for i, x in enumerate(xs)])
        dots = mt(r"\cdots", size=48, color=GREY_C).move_to(RIGHT * 5.9 + UP * y0)
        links = VGroup(*[Arrow(nodes[i].get_right(), nodes[i + 1].get_left(), buff=0.08, stroke_width=3,
                               color=WHITE if i == 2 else GREY_C, max_tip_length_to_length_ratio=0.15)
                         for i in range(len(xs) - 1)])
        l_st = mt("s_t", size=44).next_to(nodes[2], DOWN, buff=0.25)
        l_sn = mt("s_{t+1}", size=44).next_to(nodes[3], DOWN, buff=0.25)
        l_r = mt("r_{t+1}", size=40).next_to(links[2], DOWN, buff=0.12)
        past = VGroup(nodes[0], nodes[1], links[0], links[1])
        fut_span = VGroup(nodes[3], nodes[4], nodes[5], nodes[6], dots)
        brace = Brace(fut_span, UP, color=GREY_B)
        bG = mt("G_{t+1}", size=46).next_to(brace, UP, buff=0.12)
        bV = fx(r"V^{\pi}", "(", "s_{t+1}", ")", size=46).next_to(brace, UP, buff=0.12)
        eq5 = fx(r"V^{\pi}", "(", "s", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "r_{t+1}", "+", r"\gamma",
                 r"V^{\pi}", "(", "s_{t+1}", ")", r"\mid", "s_t", "=", "s", r"\big]", size=52).move_to(UP * 1.4)
        timeline = VGroup(nodes, dots, links, l_st, l_sn, l_r)
        with self.voice("右辺の、{A}次の時刻からのリターンの期待値は、{B}次の状態がどこになるかさえ分かれば、"
                        "その状態の価値に置き換えられます。{C}マルコフ性のおかげで、そこから先の未来は、"
                        "それまでの経緯と関係ないからです。") as v:
            self.play(FadeOut(VGroup(rec, rec_box)), eq4.animate.move_to(UP * 1.4), run_time=0.8)
            self.play(FadeIn(timeline, lag_ratio=0.05), run_time=1.2)
            self.wait_to(v, "A")
            hl = SurroundingRectangle(eq4[9:11], color=style.VALUE, buff=0.1)
            self.play(Create(hl), GrowFromCenter(brace), TransformFromCopy(eq4[10], bG), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Indicate(nodes[3], color=style.STATE, scale_factor=1.5), Indicate(l_sn, color=style.STATE),
                      run_time=0.9)
            self.play(ReplacementTransform(bG, bV), run_time=0.9)
            self.play(ReplacementTransform(eq4[0:10], eq5[0:10]), ReplacementTransform(eq4[10], eq5[10:14]),
                      ReplacementTransform(eq4[11:], eq5[14:]), hl.animate.become(
                          SurroundingRectangle(eq5[9:14], color=style.VALUE, buff=0.1)), run_time=1.2)
            self.wait_to(v, "C")
            self.play(past.animate.set_opacity(0.12), links[2].animate.set_opacity(0.3), run_time=1.2)
            self.play(Indicate(fut_span, color=style.STATE, scale_factor=1.05), run_time=1.2)

        box5 = SurroundingRectangle(eq5, color=style.VALUE, buff=0.28, corner_radius=0.1)
        bname = jt("ベルマン方程式", size=44, color=WHITE).next_to(box5, DOWN, buff=0.45)
        with self.voice("つまり、{A}あるマスの価値は、{B}一歩進んでもらえる報酬と、{C}行き着いた先のマスの価値のガンマ倍、"
                        "{D}その平均に等しい。これが、{E}ベルマン方程式です。") as v:
            self.play(FadeOut(VGroup(timeline, brace, bV, vdef, hl)), eq5.animate.move_to(UP * 0.6),
                      run_time=1.0)
            box5.move_to(eq5)
            bname.next_to(box5, DOWN, buff=0.45)
            self.wait_to(v, "A")
            self.play(Indicate(eq5[0:4], color=style.VALUE), run_time=0.8)
            self.wait_to(v, "B")
            self.play(Indicate(eq5[7], color=style.REWARD, scale_factor=1.4), run_time=0.8)
            self.wait_to(v, "C")
            self.play(Indicate(eq5[9:14], color=style.VALUE, scale_factor=1.15), run_time=0.9)
            self.wait_to(v, "D")
            self.play(Indicate(VGroup(eq5[5:7], eq5[18]), color=style.POLICY, scale_factor=1.2), run_time=0.9)
            self.wait_to(v, "E")
            self.play(Create(box5), FadeIn(bname, shift=0.15 * UP), run_time=1.0)

        eq6 = bellman(size=52).move_to(DOWN * 0.6)
        b_pi = Brace(eq6[5:12], DOWN, color=style.ACTION)
        t_pi = jt("行動を選ぶ", size=32, color=style.ACTION).next_to(b_pi, DOWN, buff=0.12)
        b_P = Brace(eq6[12:21], DOWN, color=style.STATE)
        t_P = jt("行き先が決まる", size=32, color=style.STATE).next_to(b_P, DOWN, buff=0.12)
        with self.voice("期待値の中身を、きちんと書き下してみましょう。{A}まず、方策に従って行動を選び、"
                        "{B}次に、遷移確率に従って行き先が決まります。") as v:
            self.play(VGroup(eq5, box5, bname).animate.scale(0.8).move_to(UP * 2.55), run_time=1.0)
            self.play(TransformFromCopy(eq5[0:5], eq6[0:5]), FadeIn(eq6[5:], shift=0.1 * DOWN), run_time=1.4)
            self.wait_to(v, "A")
            self.play(GrowFromCenter(b_pi), FadeIn(t_pi, shift=0.1 * DOWN), run_time=0.8)
            self.wait_to(v, "B")
            self.play(GrowFromCenter(b_P), FadeIn(t_P, shift=0.1 * DOWN), run_time=0.8)

        # バックアップ図
        root_p = UP * 1.75
        ax_x = [-3.9, -1.3, 1.3, 3.9]
        leaf_dx = [-0.8, 0.0, 0.8]
        root = Circle(0.3, stroke_color=style.STATE, stroke_width=5, fill_color=style.BG, fill_opacity=1).move_to(root_p)
        acts = VGroup(*[Dot(RIGHT * x + UP * 0.15, radius=0.15, color=style.ACTION) for x in ax_x])
        e1 = VGroup(*[Line(root.get_center(), a.get_center(), stroke_color=GREY_B, stroke_width=3,
                           buff=0.3) for a in acts])
        leaves = VGroup()
        e2 = VGroup()
        for a in acts:
            for dx in leaf_dx:
                lf = Circle(0.2, stroke_color=style.STATE, stroke_width=4, fill_color=style.BG,
                            fill_opacity=1).move_to(a.get_center() + RIGHT * dx + DOWN * 1.7)
                leaves.add(lf)
                e2.add(Line(a.get_center(), lf.get_center(), stroke_color=GREY_B, stroke_width=2.5, buff=0.2))
        for ln in (*e1, *e2):
            ln.set_z_index(-1)
        rl_s = mt("s", size=44).next_to(root, RIGHT, buff=0.2)
        row_labels = VGroup(jt("状態", size=30, color=style.STATE).move_to(LEFT * 5.9 + UP * 1.75),
                            jt("行動", size=30, color=style.ACTION).move_to(LEFT * 5.9 + UP * 0.15),
                            jt("次の状態", size=30, color=style.STATE).move_to(LEFT * 5.9 + DOWN * 1.55))
        pl = fx(*pieces_pi(), size=38).move_to(RIGHT * 5.65 + UP * 1.05)
        Pl = fx(*pieces_P(), size=38).move_to(RIGHT * 5.55 + DOWN * 0.7)
        lb = Brace(leaves, DOWN, color=GREY_B, buff=0.15)
        lv = fx("r", "+", r"\gamma", r"V^{\pi}", "(", "s'", ")", size=42).next_to(lb, DOWN, buff=0.12)
        bk = jt("バックアップ", size=40, color=style.VALUE).next_to(root, LEFT, buff=0.5)
        with self.voice("図にすると、こうなります。{A}一番上が、今の状態。そこから、{B}選びうる行動に枝分かれし、"
                        "それぞれの行動から、{C}滑った先の状態に枝分かれする。{D}一番下の[値|あたい]を、枝の確率で重み付けしながら、"
                        "{E}[下|した]から[上|うえ]へと集めてくる。この操作を、{F}バックアップと呼びます。") as v:
            self.play(FadeOut(VGroup(eq5, box5, bname, b_pi, t_pi, b_P, t_P)),
                      eq6.animate.scale(0.8).move_to(UP * 3.2), run_time=1.0)
            self.play(GrowFromCenter(root), FadeIn(rl_s), run_time=0.6)
            self.wait_to(v, "A")
            self.play(Indicate(root, color=style.STATE, scale_factor=1.4), FadeIn(row_labels[0]),
                      Indicate(eq6[0:4], color=style.STATE), run_time=0.9)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[Create(e) for e in e1], lag_ratio=0.15),
                      LaggedStart(*[GrowFromCenter(a) for a in acts], lag_ratio=0.15),
                      FadeIn(row_labels[1]), FadeIn(pl), Indicate(eq6[5:12], color=style.ACTION), run_time=1.2)
            self.wait_to(v, "C")
            self.play(LaggedStart(*[Create(e) for e in e2], lag_ratio=0.04),
                      LaggedStart(*[GrowFromCenter(l) for l in leaves], lag_ratio=0.04),
                      FadeIn(row_labels[2]), FadeIn(Pl), Indicate(eq6[12:21], color=style.STATE), run_time=1.4)
            self.wait_to(v, "D")
            self.play(GrowFromCenter(lb), FadeIn(lv, shift=0.1 * UP),
                      *[l.animate.set_fill(value_color(0.6), 1) for l in leaves], run_time=1.0)
            self.wait_to(v, "E")
            d1 = VGroup(*[Dot(l.get_center(), radius=0.09, color=style.VALUE) for l in leaves])
            self.add(d1)
            self.play(*[d.animate.move_to(acts[i // 3].get_center()) for i, d in enumerate(d1)],
                      *[l.animate.set_fill(style.BG, 1) for l in leaves], run_time=1.0)
            self.remove(d1)
            d2 = VGroup(*[Dot(a.get_center(), radius=0.1, color=style.VALUE) for a in acts])
            self.add(d2)
            self.play(*[d.animate.move_to(root.get_center()) for d in d2], run_time=0.9)
            self.remove(d2)
            self.play(root.animate.set_fill(value_color(0.8), 1), Flash(root, color=style.VALUE, flash_radius=0.5),
                      run_time=0.6)
            self.wait_to(v, "F")
            self.play(FadeIn(bk, shift=0.2 * RIGHT), run_time=0.7)
        tree = VGroup(root, acts, e1, e2, leaves, rl_s, row_labels, pl, Pl, lb, lv, bk)

        # 具体例: 星のすぐ左のマス（まわりだけ拡大して見せる）
        s33 = (3, 3)
        cl = 2.1
        loc_states = [(2, 3), (3, 3), (4, 3), (2, 2), (3, 2), (4, 2)]
        loc, lpos, lcells, licons = local_view(loc_states, LEFT * 3.45 + 0.45 * DOWN, cl, (3, 2.5))
        top_wall = Line(lpos((2, 3)) + np.array([-cl / 2, cl / 2, 0]), lpos((4, 3)) + np.array([cl / 2, cl / 2, 0]),
                        stroke_color=GREY_A, stroke_width=9)
        c = lpos(s33)
        focus = Square(cl, stroke_color=style.STATE, stroke_width=6).move_to(c)
        pol = Arrow(c + LEFT * 0.5, c + RIGHT * 0.5, buff=0, color=style.POLICY, stroke_width=10,
                    max_tip_length_to_length_ratio=0.3)
        f_star = Arrow(c, lpos(GOAL), buff=0.38, color=style.STATE, stroke_width=10,
                       max_tip_length_to_length_ratio=0.25)
        p8 = mt("0.8", size=42).next_to(f_star, UP, buff=0.12)
        b_up = bump(c, UP, cl)
        b_dn = bump(c, DOWN, cl)
        p1u = mt("0.1", size=38, color=GREY_A).next_to(b_up[0], LEFT, buff=0.18)
        p1d = mt("0.1", size=38, color=GREY_A).next_to(b_dn[0], LEFT, buff=0.18)
        plus1 = mt("+1", size=44, color=style.REWARD).next_to(licons[GOAL], DOWN, buff=0.12)
        wall_lab = jt("外壁", size=28, color=GREY_B).next_to(top_wall, UP, buff=0.12)

        row0 = fx(*v_at("(3,3)"), "=", "0.8", r"\times", "1", size=44)
        row0[5].set_color(style.REWARD)
        row1 = fx("+", "0.1", r"\times", r"\gamma", *v_at("(3,3)"), size=44)
        row2 = fx("+", "0.1", r"\times", r"\gamma", *v_at("(3,3)"), size=44)
        row0.move_to(UP * 1.55).align_to(RIGHT * 0.55, LEFT)
        for r, y in ((row1, 0.75), (row2, -0.05)):
            r.move_to(UP * y)
            r.shift(RIGHT * (row0[3].get_left()[0] - r[1].get_left()[0]))
        with self.voice("実際の数字で確かめてみましょう。{A}星のすぐ左のマスです。{B}賢い方策は、ここで右を選びます。"
                        "{C}80%で星に入って、プラス1。{D}残りの20%は、[上|うえ]の外壁か[下|した]の壁にぶつかって、"
                        "その場にとどまります。") as v:
            self.play(FadeOut(tree), eq6.animate.scale(0.9).move_to(UP * 3.3), run_time=0.8)
            self.play(FadeIn(loc), Create(top_wall), run_time=0.8)
            self.wait_to(v, "A")
            self.play(Create(focus), Indicate(licons[GOAL], color=style.REWARD, scale_factor=1.3), run_time=0.9)
            self.wait_to(v, "B")
            self.play(GrowArrow(pol), run_time=0.7)
            self.wait_to(v, "C")
            self.play(FadeOut(pol), GrowArrow(f_star), FadeIn(p8), run_time=0.8)
            self.play(Flash(lpos(GOAL), color=style.REWARD, flash_radius=0.7), FadeIn(plus1, shift=0.2 * UP),
                      FadeIn(row0, shift=0.2 * LEFT), run_time=0.8)
            self.wait_to(v, "D")
            self.play(GrowFromCenter(b_up), FadeIn(p1u), FadeIn(wall_lab), FadeIn(row1, shift=0.2 * LEFT), run_time=0.8)
            self.play(GrowFromCenter(b_dn), FadeIn(p1d), FadeIn(row2, shift=0.2 * LEFT),
                      Indicate(lcells[(3, 2)], color=GREY_A), run_time=0.8)

        row3 = fx("=", "0.8", "+", "0.2", r"\gamma", *v_at("(3,3)"), size=44)
        row3.move_to(UP * -1.0)
        row3.shift(RIGHT * (row0[2].get_left()[0] - row3[0].get_left()[0]))
        sol = 0.8 / (1 - 0.2 * GAMMA)
        assert round(sol, 2) == round(V_STAR[s33], 2)
        row4 = fx(*v_at("(3,3)"), "=", r"\frac{0.8}{1-0.2\gamma}", r"\approx", f"{sol:.2f}", size=46)
        row4[3][-1].set_color(style.GAMMA)
        row4[5].set_color(style.VALUE)
        row4.move_to(DOWN * 2.5).align_to(RIGHT * 0.7, LEFT)
        box4 = SurroundingRectangle(row4, color=style.VALUE, buff=0.2, corner_radius=0.1)
        loc_labs = {s: DecimalNumber(V_STAR[s], num_decimal_places=2, font_size=40, color=WHITE).move_to(lpos(s))
                    for s in loc_states if s not in WORLD.walls and s not in WORLD.terminals}
        with self.voice("おや、{A}右辺にも、このマス自身の価値が出てきました。"
                        "価値は、ほかのマスの価値、そして自分自身の価値と、方程式でつながっているんです。"
                        "解いてみると、{B}約0.98。{C}さっきの図の数字と、ぴったり一致します。") as v:
            self.wait_to(v, "A")
            self.play(Circumscribe(row1[4:6], color=style.VALUE), Circumscribe(row2[4:6], color=style.VALUE),
                      Indicate(focus, color=style.VALUE), run_time=1.2)
            self.play(FadeIn(row3, shift=0.1 * DOWN), run_time=0.9)
            self.play(Indicate(row3[5:7], color=style.VALUE, scale_factor=1.15), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Write(row4), run_time=1.2)
            self.play(Create(box4), run_time=0.5)
            self.wait_to(v, "C")
            self.play(FadeOut(VGroup(f_star, p8, b_up, b_dn, p1u, p1d, plus1)),
                      *[lcells[s].animate.set_fill(value_color(V_STAR[s]), 1) for s in loc_labs],
                      *[FadeIn(l) for l in loc_labs.values()], run_time=1.0)
            self.play(Indicate(loc_labs[s33], color=WHITE, scale_factor=1.5), Indicate(row4[5], color=WHITE,
                                                                                    scale_factor=1.3), run_time=1.0)

        g = GridView(WORLD, cell=1.2).move_to(LEFT * 3.4 + 0.4 * DOWN)
        nums = VGroup(*[mt(str(i + 1), size=34, color=WHITE).move_to(g.center_of(s)) for i, s in enumerate(NONTERM)])
        system = equation_system(size=30).move_to(RIGHT * 2.5 + DOWN * 0.1)
        with self.voice("壁と星と穴を除くと、{A}マスは15個。つまりベルマン方程式は、{B}15本の連立方程式です。") as v:
            self.play(FadeOut(VGroup(row0, row1, row2, row3, row4, box4, focus, eq6, loc, top_wall, wall_lab,
                                     *loc_labs.values())), run_time=0.8)
            self.play(FadeIn(g), run_time=0.7)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(n, scale=0.5) for n in nums], lag_ratio=0.08), run_time=1.5)
            self.wait_to(v, "B")
            self.play(VGroup(g, nums).animate.scale(0.62).move_to(LEFT * 4.9 + 0.3 * DOWN), run_time=0.9)
            self.play(GrowFromCenter(system[0]),
                      LaggedStart(*[FadeIn(r, shift=0.2 * RIGHT) for col in system[1] for r in col], lag_ratio=0.06),
                      run_time=2.0)
        self.play(FadeOut(VGroup(g, nums, system)), run_time=0.9)


# ---------------------------------------------------------------------------
# 5. 反復方策評価
# ---------------------------------------------------------------------------
class Evaluation(VoiceScene):
    def construct(self):
        system = equation_system(size=30).move_to(RIGHT * 0.3)
        upd = bellman(lhs=[r"V_{k+1}", "(", "s", ")"], arrow=r"\leftarrow", vnext=r"V_k", size=46).move_to(UP * 3.15)
        g = GridView(WORLD, cell=1.25).move_to(LEFT * 2.5 + 0.55 * DOWN)
        labs = value_labels(g, PE_HIST[0], size=30)
        k_lab = mt("k", "=", size=56)
        k_num = Integer(0, font_size=56)
        counter = VGroup(k_lab, k_num).arrange(RIGHT, buff=0.2).move_to(RIGHT * 4.0 + UP * 1.1)
        with self.voice("この連立方程式は、直接解くこともできますが、{A}もっと面白い解き方があります。") as v:
            self.play(FadeIn(system), run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeOut(system, scale=0.7), run_time=0.7)
            self.play(FadeIn(g), Write(upd), run_time=1.3)

        with self.voice("まず、すべてのマスの価値を、{A}0と置きます。もちろん、でたらめな[値|あたい]です。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(l, scale=0.6) for l in labs.values()], lag_ratio=0.05),
                      FadeIn(counter), run_time=1.2)

        flashes = VGroup(*[cell_box(g, s, color=WHITE, width=4) for s in NONTERM])
        with self.voice("そして、ベルマン方程式の右辺を使って、{A}すべてのマスの[値|あたい]を、一斉に計算し直します。") as v:
            self.play(Indicate(upd[5:], color=WHITE, scale_factor=1.05), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(flashes), run_time=0.3)
            self.play(*heat_anims(g, PE_HIST[1], labs), FadeOut(flashes), k_num.animate.set_value(1), run_time=1.0)

        with self.voice("これを何度も繰り返すと、{A}星と穴のまわりから、価値がじわじわと染み出していきます。") as v:
            self.wait_to(v, "A")
            ks = list(range(2, 9))
            per = min(0.9, max(0.45, (v.remaining() - 0.1) / len(ks)))
            for k in ks:
                self.play(*heat_anims(g, PE_HIST[k], labs), k_num.animate.set_value(k), run_time=per)

        name = jt("反復方策評価", size=42, color=style.VALUE).next_to(counter, DOWN, buff=0.7)
        with self.voice("そしてやがて、ある[値|あたい]に{A}落ち着きます。これが、でたらめな方策の、{B}本当の価値です。"
                        "この方法を、{C}反復方策評価と呼びます。") as v:
            ks = list(range(9, 25))
            per = max(0.12, (v.until("A") - 0.2) / len(ks))
            for k in ks:
                self.play(*heat_anims(g, PE_HIST[k], labs), k_num.animate.set_value(k), run_time=per)
            self.play(*heat_anims(g, PE_HIST[60], labs), k_num.animate.set_value(60), run_time=0.5)
            self.wait_to(v, "B")
            self.play(Circumscribe(g.board, color=style.VALUE), run_time=1.2)
            self.wait_to(v, "C")
            self.play(FadeIn(name, shift=0.1 * UP), run_time=0.8)

        # 誤差のプロット（縦軸は対数）
        errs = pe_errors(31)
        ax = Axes(x_range=[0, 30, 5], y_range=[-3.3, 0, 1], x_length=6.8, y_length=4.6, tips=False,
                  axis_config={"color": GREY_C, "stroke_width": 2, "tick_size": 0.06}).move_to(RIGHT * 2.95 + 0.55 * DOWN)
        xt = VGroup(*[mt(str(k), size=28, color=GREY_B).next_to(ax.c2p(k, -3.3), DOWN, buff=0.15) for k in (0, 10, 20, 30)])
        yt = VGroup(*[mt(t, size=28, color=GREY_B).next_to(ax.c2p(0, y), LEFT, buff=0.15)
                      for t, y in [("1", 0), ("0.1", -1), ("0.01", -2), ("0.001", -3)]])
        xl = mt("k", size=36, color=GREY_B).next_to(xt[-1], RIGHT, buff=0.35)
        yl = jt("真の値からのずれ（最大）", size=28, color=GREY_B).next_to(ax, UP, buff=0.25).align_to(ax, LEFT)
        grid_small = VGroup(g, *labs.values())
        dots = VGroup(*[Dot(ax.c2p(k, np.log10(e)), radius=0.06, color=style.VALUE) for k, e in enumerate(errs)])
        segs = VGroup(*[Line(dots[k].get_center(), dots[k + 1].get_center(), stroke_color=style.VALUE, stroke_width=3)
                        for k in range(len(dots) - 1)])
        with self.voice("なぜ、必ず落ち着くのでしょうか。{A}繰り返すたびに、真の[値|あたい]からどれだけずれているかを、"
                        "プロットしてみました。{B}縦軸は対数です。") as v:
            self.play(FadeOut(name), FadeOut(labels_group(labs)), g.animate.scale(0.68).move_to(LEFT * 4.75 + 0.9 * DOWN),
                      counter.animate.scale(0.8).move_to(LEFT * 4.75 + 1.9 * UP), run_time=1.0)
            self.play(Create(ax), FadeIn(xt), FadeIn(yt), FadeIn(xl), FadeIn(yl), run_time=0.8)
            self.wait_to(v, "A")
            set_heat(g, PE_HIST[0])
            k_num.set_value(0)
            self.play(FadeIn(dots[0], scale=2), run_time=0.3)
            for k in range(1, len(dots)):
                rt = 0.28 if k < 8 else 0.14
                self.play(*heat_anims(g, PE_HIST[k]), k_num.animate.set_value(k), Create(segs[k - 1]),
                          FadeIn(dots[k], scale=2), run_time=rt)
            self.wait_to(v, "B")
            self.play(Indicate(yt, color=WHITE, scale_factor=1.15), run_time=1.0)

        ratio = fx(r"\mathrm{err}_{k+1}", r"\le", r"\gamma", r"\,\mathrm{err}_{k}", size=44)
        ratio.move_to(ax.c2p(19, -0.45))
        ref = DashedLine(ax.c2p(0, np.log10(errs[0])), ax.c2p(30, np.log10(errs[0] * GAMMA ** 30)),
                         stroke_color=style.GAMMA, stroke_width=4, dash_length=0.12)
        ref_lab = fx(r"\gamma^k", size=44).next_to(ref.get_end(), UP, buff=0.15)
        with self.voice("{A}きれいな直線になっています。{B}1回ごとに、ずれが、少なくともガンマ倍に縮むからです。"
                        "{C}点線は、ちょうどガンマ倍ずつ縮む場合の線。実際のずれは、いつもその下にあります。") as v:
            self.wait_to(v, "A")
            self.play(segs.animate.set_stroke(width=7), rate_func=there_and_back, run_time=1.2)
            self.wait_to(v, "B")
            self.play(FadeIn(ratio, shift=0.1 * UP), run_time=0.8)
            self.wait_to(v, "C")
            self.play(Create(ref), FadeIn(ref_lab), run_time=1.4)
            self.play(LaggedStart(*[Indicate(d, color=WHITE, scale_factor=1.8) for d in dots], lag_ratio=0.05),
                      run_time=2.0)

        # 直感: 確かな部分 + γ×(ずれを含む部分)
        plot = VGroup(ax, xt, yt, xl, yl, dots, segs, ratio, ref, ref_lab)
        eqi = fx(r"V_{k+1}", "(", "s", ")", r"\leftarrow", r"\mathbb{E}_{\pi}", r"\Big[", "r", "+", r"\gamma",
                 r"V_k", "(", "s'", ")", r"\Big]", size=60).move_to(UP * 2.3)
        br_r = Brace(eqi[7], DOWN, color=style.REWARD)
        tx_r = jt("確かな部分", size=32, color=style.REWARD).next_to(br_r, DOWN, buff=0.1).align_to(br_r, RIGHT)
        br_v = Brace(eqi[9:14], DOWN, color=style.VALUE)
        tx_v = jt("次のマスの値", size=32, color=style.VALUE).next_to(br_v, DOWN, buff=0.1).align_to(br_v, LEFT)

        bar_y = -1.0
        w_r, w_v, w_e = 1.8, 3.0, 2.6
        seg_r = Rectangle(width=w_r, height=0.75, stroke_width=0, fill_color=style.REWARD, fill_opacity=0.85)
        seg_v = Rectangle(width=w_v, height=0.75, stroke_width=0, fill_color=style.VALUE, fill_opacity=0.85)
        seg_e = Rectangle(width=w_e, height=0.75, stroke_width=0, fill_color=RED, fill_opacity=0.85)
        VGroup(seg_r, seg_v, seg_e).arrange(RIGHT, buff=0.04).move_to(UP * bar_y + LEFT * 0.4)
        lb_r = mt("r", size=44, color=style.REWARD).next_to(seg_r, DOWN, buff=0.2)
        lb_v = fx(r"\gamma", r"V^{\pi}", "(", "s'", ")", size=40).next_to(seg_v, DOWN, buff=0.2)
        lb_e = VGroup(mt(r"\gamma\,\times", size=40, color=style.GAMMA), jt("ずれ", size=34, color=RED)).arrange(RIGHT, buff=0.12)
        lb_e.next_to(seg_e, DOWN, buff=0.2)
        times = mt(r"\times\gamma", size=44, color=style.GAMMA).next_to(seg_e, UP, buff=0.2)
        bound = fx(r"\max_{s}", r"\big|", r"V_k", "(", "s", ")", "-", r"V^{\pi}", "(", "s", ")", r"\big|", r"\le",
                   r"\gamma^k", r"\,\max_{s}", r"\big|", r"V_0", "(", "s", ")", "-", r"V^{\pi}", "(", "s", ")", r"\big|",
                   size=44).move_to(DOWN * 2.95)
        with self.voice("直感的には、こういうことです。{A}1回の更新で、どのマスの[値|あたい]も、{B}報酬という確かな部分と、"
                        "{C}ガンマ倍された、次のマスの[値|あたい]の部分の和になります。{D}間違っているのは後ろの部分だけで、"
                        "{E}それは毎回ガンマ倍に縮められる。だから、最初に置いたでたらめな[値|あたい]の影響は、"
                        "{F}ガンマの[k|ケー]乗で消えていくんです。") as v:
            self.play(FadeOut(plot), FadeOut(g), FadeOut(counter), ReplacementTransform(upd, eqi), run_time=1.2)
            self.wait_to(v, "A")
            self.play(Indicate(eqi, color=WHITE, scale_factor=1.05), run_time=0.9)
            self.wait_to(v, "B")
            self.play(GrowFromCenter(br_r), FadeIn(tx_r), GrowFromEdge(seg_r, LEFT), FadeIn(lb_r), run_time=0.9)
            self.wait_to(v, "C")
            self.play(GrowFromCenter(br_v), FadeIn(tx_v), GrowFromEdge(seg_v, LEFT), GrowFromEdge(seg_e, LEFT),
                      FadeIn(lb_v), run_time=1.0)
            self.wait_to(v, "D")
            self.play(FadeIn(lb_e), Indicate(seg_e, color=RED, scale_factor=1.08), run_time=0.9)
            self.wait_to(v, "E")
            self.play(FadeIn(times), run_time=0.4)
            w = w_e
            n_steps = 10
            per = max(0.22, min(0.4, (v.until("F") - 0.3) / n_steps))
            for _ in range(n_steps):
                w *= GAMMA
                self.play(seg_e.animate.stretch_to_fit_width(w, about_edge=LEFT),
                          Indicate(times, scale_factor=1.15), run_time=per)
            self.wait_to(v, "F")
            self.play(FadeIn(bound, shift=0.1 * UP), run_time=1.0)
            self.play(Indicate(bound[13], color=style.GAMMA, scale_factor=1.4), run_time=0.8)

        # 縮小写像: どこから始めても同じ一点へ
        def pe_step(V):
            out = {}
            for s in WORLD.states:
                if WORLD.is_terminal(s):
                    out[s] = 0.0
                    continue
                out[s] = sum(0.25 * sum(p * (r + (0 if WORLD.is_terminal(n) else GAMMA * V[n]))
                                        for p, n, r in WORLD.outcomes(s, a)) for a in ACTIONS)
            return out

        rng = np.random.default_rng(4)
        starts = []
        for _ in range(7):
            V0 = {s: (0.0 if WORLD.is_terminal(s) else float(rng.uniform(-0.95, 0.95))) for s in WORLD.states}
            starts.append(V0)
        sx, sy = (3, 3), (4, 1)
        T = 26
        trajs = []
        for V0 in starts:
            V = V0
            pts = [(V[sx], V[sy])]
            for _ in range(T):
                V = pe_step(V)
                pts.append((V[sx], V[sy]))
            trajs.append(pts)
        pl = Axes(x_range=[-1, 1, 0.5], y_range=[-1, 1, 0.5], x_length=6.0, y_length=6.0, tips=False,
                  axis_config={"color": GREY_D, "stroke_width": 2, "tick_size": 0.05}).move_to(0.5 * DOWN)
        pxl = fx("V", "(3,3)", size=38).next_to(pl.c2p(1, 0), RIGHT, buff=0.2)
        pyl = fx("V", "(4,1)", size=38).next_to(pl.c2p(0, 1), RIGHT, buff=0.2).shift(0.2 * DOWN)
        fixed = (V_UNI[sx], V_UNI[sy])
        fstar = Star(n=5, outer_radius=0.17, inner_radius=0.08, color=style.VALUE, fill_opacity=1).move_to(pl.c2p(*fixed))
        flab = fx(r"V^{\pi}", size=40).next_to(fstar, DR, buff=0.08)
        cname = jt("縮小写像", size=44, color=WHITE).move_to(UP * 3.2)
        pdots = VGroup(*[Dot(pl.c2p(*t[0]), radius=0.1, color=WHITE) for t in trajs])
        with self.voice("こういう性質を持つ写像を、{A}縮小写像と呼びます。{B}出発点がどこであっても、"
                        "同じ一点に吸い寄せられていく。この性質は、この先、何度も顔を出します。") as v:
            self.play(FadeOut(VGroup(eqi, br_r, tx_r, br_v, tx_v, seg_r, seg_v, seg_e, lb_r, lb_v, lb_e, times, bound)),
                      run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(cname, shift=0.1 * DOWN), Create(pl), FadeIn(pxl), FadeIn(pyl), run_time=1.0)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[FadeIn(d, scale=2) for d in pdots], lag_ratio=0.1), run_time=0.8)
            trails = VGroup()
            for k in range(1, T + 1):
                segs2 = VGroup(*[Line(pl.c2p(*t[k - 1]), pl.c2p(*t[k]), stroke_color=GREY_B, stroke_width=2,
                                      stroke_opacity=0.6) for t in trajs])
                trails.add(segs2)
                self.add(segs2, pdots)
                rt = 0.35 if k < 6 else 0.15
                self.play(*[d.animate.move_to(pl.c2p(*t[k])) for d, t in zip(pdots, trajs)],
                          Create(segs2), run_time=rt)
            self.play(GrowFromCenter(fstar), FadeIn(flab), run_time=0.6)
        self.play(FadeOut(VGroup(cname, pl, pxl, pyl, pdots, trails, fstar, flab)), run_time=0.9)


# ---------------------------------------------------------------------------
# 6. 行動価値
# ---------------------------------------------------------------------------
class ActionValue(VoiceScene):
    def construct(self):
        vdef = fx(r"V^{\pi}", "(", "s", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "G_t", r"\mid", "s_t", "=",
                  "s", r"\big]", size=48).move_to(UP * 3.15)
        qdef = fx(r"Q^{\pi}", "(", "s", ",", "a", ")", "=", r"\mathbb{E}_{\pi}", r"\big[", "G_t", r"\mid", "s_t",
                  "=", "s", ",", "a_t", "=", "a", r"\big]", size=48).move_to(UP * 2.2)
        qdef.align_to(vdef, LEFT)
        g = GridView(WORLD, cell=1.1).move_to(LEFT * 3.55 + 1.05 * DOWN)
        with self.voice("価値には、もう一つ、よく使う形があります。") as v:
            self.play(FadeIn(g), Write(vdef), run_time=1.4)

        s0 = (0, 0)
        robot = Robot(height=0.5).move_to(g.center_of(s0))
        focus = cell_box(g, s0)
        a_arrow = Arrow(g.center_of(s0), g.center_of((1, 0)), buff=0.3, color=style.ACTION, stroke_width=9,
                        max_tip_length_to_length_ratio=0.3)
        # その後は方策（でたらめ）に従う: 行き先がばらばらになる3本を選ぶ
        found, seed = [], 0
        while len(found) < 3:
            t = WORLD.rollout(UNIFORM, np.random.default_rng(seed), start=(1, 0), max_steps=7)
            seed += 1
            st = [(1, 0)] + [x[3] for x in t]
            if st[-1] in WORLD.terminals or len(set(st)) < 4:
                continue
            if all(abs(st[-1][0] - f[-1][0]) + abs(st[-1][1] - f[-1][1]) >= 2 for f in found):
                found.append(st)
        conts = VGroup()
        for i, st in enumerate(found):
            ln = path_line(g, st, color=style.POLICY, jitter=0.1, seed=30 + i, width=4, opacity=0.85)
            conts.add(VGroup(ln, Dot(ln.get_end(), radius=0.07, color=style.POLICY)))
        with self.voice("状態だけでなく、{A}最初の一手まで指定したときの価値です。{B}状態[s|エス]で、"
                        "{C}まず行動[a|エー]を取り、{D}その後は方策パイに従ったときの、リターンの期待値。"
                        "これを行動価値と呼び、{E}[Q|キュー]で表します。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(robot, scale=0.8), run_time=0.6)
            self.wait_to(v, "B")
            self.play(Create(focus), run_time=0.6)
            self.wait_to(v, "C")
            self.play(GrowArrow(a_arrow), robot.animate.look(RIGHT), run_time=0.7)
            self.play(robot.animate.move_to(g.center_of((1, 0))), run_time=0.5)
            self.wait_to(v, "D")
            self.play(LaggedStart(*[Create(cc) for cc in conts], lag_ratio=0.3), FadeOut(robot), run_time=1.8)
            self.wait_to(v, "E")
            self.play(Write(qdef), run_time=1.4)
            self.play(Indicate(qdef[14:18], color=style.ACTION, scale_factor=1.15), run_time=0.9)

        s33 = (3, 3)
        zc = RIGHT * 3.4 + 1.0 * DOWN
        zsize = 3.0
        qv = {a: Q_UNI[s33, a] for a in ACTIONS}
        ztris = q_tris(zc, zsize, qv, stroke_width=2.5, stroke=GREY_D)
        zlabs = q_tri_labels(zc, zsize, qv, font=38, dist=0.31)
        zframe = Square(zsize, stroke_color=GREY_B, stroke_width=3).move_to(zc)
        src = cell_box(g, s33, color=WHITE, width=4)
        con = VGroup(DashedLine(g.cells[s33].get_corner(UR), zframe.get_corner(UL), stroke_color=GREY_C, stroke_width=2),
                     DashedLine(g.cells[s33].get_corner(DR), zframe.get_corner(DL), stroke_color=GREY_C, stroke_width=2))
        tri_map = q_tri_grid(g, Q_UNI)
        with self.voice("マスを四つの三角形に分けて、それぞれの向きの行動価値で色を塗ると、{A}こんな絵になります。") as v:
            self.play(FadeOut(VGroup(focus, a_arrow, conts)), run_time=0.5)
            self.play(Create(src), Create(con), Create(zframe), run_time=0.8)
            diag = VGroup(Line(zframe.get_corner(UL), zframe.get_corner(DR)), Line(zframe.get_corner(UR), zframe.get_corner(DL)))
            diag.set_stroke(GREY_B, 2.5)
            self.play(Create(diag), run_time=0.6)
            self.play(FadeIn(ztris), FadeOut(diag), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(l, scale=0.7) for l in zlabs], lag_ratio=0.15), run_time=0.8)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(t) for t in tri_map.values()], lag_ratio=0.05), run_time=1.6)
            self.bring_to_front(g.terminal_icons, src)

        rel1 = fx(r"V^{\pi}", "(", "s", ")", "=", r"\sum_{a}", *pieces_pi(), r"Q^{\pi}", "(", "s", ",", "a", ")",
                  size=46).move_to(UP * 3.15)
        rel2 = fx(r"Q^{\pi}", "(", "s", ",", "a", ")", "=", r"\sum_{s'}", *pieces_P(), r"\Big[", "r", "+", r"\gamma",
                  r"V^{\pi}", "(", "s'", ")", r"\Big]", size=46).move_to(UP * 2.15)
        vbadge = VGroup(Circle(0.44, stroke_color=WHITE, stroke_width=3, fill_color=value_color(V_UNI[s33]),
                               fill_opacity=1),
                        DecimalNumber(V_UNI[s33], num_decimal_places=2, font_size=32, color=WHITE)).move_to(zc)
        vbadge[1].move_to(vbadge[0])
        star_ic = goal_icon(0.7).move_to(zc + RIGHT * 2.35)
        into_r = Arrow(star_ic.get_left(), zc + RIGHT * 1.2 + DOWN * 0.5, buff=0.1, color=style.REWARD, stroke_width=5,
                       max_tip_length_to_length_ratio=0.25)
        loop_r = CurvedArrow(vbadge.get_top() + 0.05 * UP, zc + RIGHT * 0.95 + 0.35 * UP, angle=-1.6,
                             color=style.VALUE, stroke_width=4)
        with self.voice("状態価値と行動価値は、{A}互いに行き来できます。{B}状態価値は、方策の確率で、行動価値を平均したもの。"
                        "{C}行動価値は、一歩進んだ先の、状態価値から計算できます。") as v:
            self.play(FadeOut(vdef), FadeOut(qdef), run_time=0.6)
            self.wait_to(v, "A")
            self.play(Indicate(ztris, scale_factor=1.05), run_time=0.9)
            self.wait_to(v, "B")
            self.play(Write(rel1), run_time=1.2)
            copies = VGroup(*[l.copy() for l in zlabs])
            self.play(*[c.animate.move_to(zc).scale(0.6).set_opacity(0.0) for c in copies],
                      FadeIn(vbadge, scale=0.4), run_time=1.2)
            self.remove(copies)
            self.wait_to(v, "C")
            self.play(Write(rel2), run_time=1.2)
            self.play(FadeIn(star_ic), GrowArrow(into_r), Create(loop_r),
                      Indicate(zlabs[A_RIGHT], color=style.REWARD, scale_factor=1.3), run_time=1.2)

        best = max(ACTIONS, key=lambda a: qv[a])
        outline = ztris[best].copy().set_fill(opacity=0).set_stroke(WHITE, 6)
        z_arrow = Arrow(zc + LEFT * 0.45, zc + RIGHT * 0.42, buff=0, color=style.POLICY, stroke_width=12,
                        max_tip_length_to_length_ratio=0.4)
        g_arrow = policy_arrow(g, s33, best, length=0.6)
        with self.voice("[Q|キュー]の便利なところは、{A}どの行動が良いかが、[一目|ひとめ]で分かることです。"
                        "{B}一番大きな[Q|キュー]を持つ行動を選べばいい。") as v:
            self.play(FadeOut(VGroup(star_ic, into_r, loop_r)), run_time=0.5)
            self.wait_to(v, "A")
            self.play(Create(outline), Indicate(zlabs[best], color=WHITE, scale_factor=1.4), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeOut(vbadge), GrowArrow(z_arrow), GrowArrow(g_arrow), run_time=0.9)
        self.play(FadeOut(VGroup(g, *tri_map.values(), src, con, zframe, ztris, zlabs, outline, z_arrow, g_arrow,
                                 rel1, rel2)), run_time=0.9)


# ---------------------------------------------------------------------------
# 7. 方策改善と方策反復
# ---------------------------------------------------------------------------
class Improvement(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.25).move_to(LEFT * 3.3 + 0.4 * DOWN)
        tri_map = q_tri_grid(g, Q_UNI)
        head = VGroup(fx(r"Q^{\pi}", size=52), jt("でたらめな方策", size=34, color=GREY_A)).arrange(RIGHT, buff=0.35)
        head.move_to(RIGHT * 3.5 + UP * 2.8)
        with self.voice("ここで、面白いことに気づきます。{A}でたらめな方策の、行動価値を計算したとしましょう。") as v:
            self.play(FadeIn(g), run_time=0.9)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(t) for t in tri_map.values()], lag_ratio=0.05), FadeIn(head), run_time=1.5)
            self.bring_to_front(g.terminal_icons)

        greedy1 = {s: max(ACTIONS, key=lambda a: Q_UNI[s, a]) for s in NONTERM}
        outlines = VGroup(*[tri_map[s][greedy1[s]].copy().set_fill(opacity=0).set_stroke(WHITE, 5) for s in NONTERM])
        arrows1 = policy_arrow_map(g, greedy1, length=0.6)
        gform = fx(r"\pi'", "(", "s", ")", "=", r"\arg\max_{a}", r"Q^{\pi}", "(", "s", ",", "a", ")", size=50)
        gform.move_to(RIGHT * 3.5 + UP * 2.85)
        gname = jt("貪欲な方策", size=38, color=style.POLICY).next_to(gform, DOWN, buff=0.3)
        with self.voice("各マスで、{A}[Q|キュー]が一番大きい行動だけを選ぶ、新しい方策を作ります。"
                        "{B}これを、[Q|キュー]に対して貪欲な方策と呼びます。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[Create(o) for o in outlines], lag_ratio=0.06), run_time=1.4)
            self.play(*[tri_map[s].animate.set_fill(opacity=0.3) for s in NONTERM], FadeOut(outlines),
                      LaggedStart(*[GrowArrow(arrows1[s]) for s in NONTERM], lag_ratio=0.04), run_time=1.3)
            self.wait_to(v, "B")
            self.play(FadeOut(head), FadeIn(gform, shift=0.1 * DOWN), run_time=0.8)
            self.play(FadeIn(gname, shift=0.1 * UP), run_time=0.6)

        better = fx(r"V^{\pi'}", "(", "s", ")", r"\ge", r"V^{\pi}", "(", "s", ")", size=50).next_to(gname, DOWN, buff=0.4)
        s33 = (3, 3)
        qv = [Q_UNI[s33, a] for a in ACTIONS]
        base = RIGHT * 3.3 + DOWN * 2.8
        scale = 2.5
        slot = 1.15
        bars = VGroup()
        for i, q in enumerate(qv):
            b = Rectangle(width=0.75, height=q * scale, stroke_width=0, fill_color=style.VALUE, fill_opacity=0.85)
            b.move_to(base + RIGHT * (i - 1.5) * slot + UP * q * scale / 2)
            bars.add(b)
        baseline = Line(base + LEFT * 2.4, base + RIGHT * 2.4, stroke_color=GREY_C, stroke_width=2)
        glyphs = VGroup(*[arrow_glyph(a, color=GREY_B, length=0.36).next_to(base + RIGHT * (i - 1.5) * slot, DOWN, buff=0.15)
                          for i, a in enumerate(ACTIONS)])
        vals = VGroup(*[mt(f"{q:.2f}", size=30, color=WHITE).move_to(b.get_top() + 0.24 * DOWN) for q, b in zip(qv, bars)])
        mean = V_UNI[s33]
        mline = DashedLine(base + LEFT * 2.4 + UP * mean * scale, base + RIGHT * 2.4 + UP * mean * scale,
                           stroke_color=WHITE, stroke_width=3)
        mlab = fx(r"V^{\pi}", "(", "s", ")", size=36).next_to(mline.get_end(), UP, buff=0.12).shift(0.55 * LEFT)
        ib = int(np.argmax(qv))
        mx = SurroundingRectangle(bars[ib], color=WHITE, buff=0.05)
        mxl = mt(r"\max", size=36).next_to(bars[ib], UP, buff=0.12)
        sbox = cell_box(g, s33, color=WHITE, width=5)
        with self.voice("この新しい方策は、元の方策より、{A}必ず良いか、少なくとも同じです。"
                        "{B}どのマスでも、一手目を、元の方策より良い手に変えているからです。"
                        "一手目を良くして、その後も同じように良い手を選び続ければ、悪くなりようがありません。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(better, shift=0.1 * DOWN), run_time=0.9)
            self.wait_to(v, "B")
            self.play(Create(sbox), Create(baseline), FadeIn(glyphs), run_time=0.6)
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars], lag_ratio=0.1), FadeIn(vals), run_time=1.0)
            self.play(Create(mline), FadeIn(mlab), run_time=0.8)
            self.play(Create(mx), FadeIn(mxl), Indicate(arrows1[s33], color=WHITE, scale_factor=1.4), run_time=0.9)

        # 方策反復のループ図
        ev = node_box("評価", style.VALUE, size=40, width=2.6)
        im = node_box("改善", style.POLICY, size=40, width=2.6)
        ev.move_to(RIGHT * 3.5 + UP * 1.35)
        im.move_to(RIGHT * 3.5 + DOWN * 1.35)
        ev_t = fx(r"\pi", r"\to", r"V^{\pi}", size=36).next_to(ev, UP, buff=0.2)
        im_t = fx(r"V^{\pi}", r"\to", r"\pi'", size=36).next_to(im, DOWN, buff=0.2)
        a_down = CurvedArrow(ev.get_right() + 0.1 * RIGHT, im.get_right() + 0.1 * RIGHT, angle=-1.9,
                             color=GREY_B, stroke_width=5)
        a_up = CurvedArrow(im.get_left() + 0.1 * LEFT, ev.get_left() + 0.1 * LEFT, angle=-1.9,
                           color=GREY_B, stroke_width=5)
        loop = VGroup(ev, im, ev_t, im_t, a_down, a_up)
        pname = jt("方策反復", size=44, color=WHITE).move_to(RIGHT * 3.5 + UP * 3.2)
        crosses = {s: cross_glyph(g, s, length=0.28) for s in NONTERM}
        with self.voice("新しい方策が手に入ったら、{A}また価値を評価して、{B}また貪欲に改善する。"
                        "{C}これを繰り返すのが、方策反復です。") as v:
            self.play(FadeOut(VGroup(gform, gname, better, bars, baseline, glyphs, vals, mline, mlab, mx, mxl, sbox)),
                      run_time=0.7)
            self.play(FadeIn(ev), FadeIn(im), FadeIn(ev_t), FadeIn(im_t), Create(a_down), Create(a_up), run_time=1.0)
            self.wait_to(v, "A")
            self.play(pulse(ev, style.VALUE), a_up.animate.set_color(WHITE), run_time=0.9)
            self.wait_to(v, "B")
            self.play(pulse(im, style.POLICY), a_down.animate.set_color(WHITE), run_time=0.9)
            self.wait_to(v, "C")
            self.play(FadeIn(pname, shift=0.1 * DOWN),
                      *[FadeOut(tri_map[s]) for s in NONTERM], *[FadeOut(arrows1[s]) for s in NONTERM],
                      run_time=0.9)
            self.play(LaggedStart(*[FadeIn(crosses[s]) for s in NONTERM], lag_ratio=0.03), run_time=0.9)

        cnt_n = Integer(1, font_size=44)
        cnt = VGroup(cnt_n, jt("回目", size=34, color=GREY_A)).arrange(RIGHT, buff=0.12).move_to(RIGHT * 3.5 + DOWN * 3.3)
        cur = dict(crosses)
        with self.voice("やってみましょう。") as v:
            self.play(Indicate(VGroup(*crosses.values()), color=WHITE, scale_factor=1.1), run_time=0.9)
        def do_round(k):
            """k 回目: π_k を評価（色）→ 貪欲に改善（矢印）。変わったマスを光らせる。"""
            V, pol, changed = PI_ROUNDS[k]
            new_arrows = {s: policy_arrow(g, s, pol[s], length=0.6) for s in changed}
            first = [FadeIn(cnt)] if k == 0 else [cnt_n.animate.set_value(k + 1)]
            self.play(*first, pulse(ev, style.VALUE), *heat_anims(g, V), run_time=1.0)
            self.play(pulse(im, style.POLICY),
                      *[ReplacementTransform(cur[s], new_arrows[s]) for s in changed], run_time=0.9)
            if k > 0:
                self.play(*[Flash(g.center_of(s), color=WHITE, flash_radius=0.45, num_lines=10) for s in changed],
                          run_time=0.6)
            cur.update(new_arrows)

        # ナレーションは台本に出るよう、1回ずつ文字列で書く
        with self.voice("1回目。", pad=0.2):
            do_round(0)
        with self.voice("2回目。", pad=0.2):
            do_round(1)
        with self.voice("3回目。", pad=0.2):
            do_round(2)
        with self.voice("4回目。", pad=0.2):
            do_round(3)

        V_last, pol_last, changed_last = PI_ROUNDS[-1]
        assert not changed_last and len(PI_ROUNDS) == 5
        stable = jt("変化なし", size=38, color=WHITE).next_to(cnt, UP, buff=0.3)
        with self.voice("これ以上改善しようとしても、{A}もう方策は変わりません。") as v:
            self.play(cnt_n.animate.set_value(5), pulse(ev, style.VALUE), *heat_anims(g, V_last), run_time=1.0)
            self.wait_to(v, "A")
            self.play(pulse(im, style.POLICY), FadeIn(stable, shift=0.1 * UP), run_time=0.9)

        cond = fx(r"\pi", "(", "s", ")", "=", r"\arg\max_{a}", r"Q^{\pi}", "(", "s", ",", "a", ")", size=48)
        cond.move_to(RIGHT * 3.4 + UP * 0.9)
        opt = VGroup(jt("最適な方策", size=40, color=style.POLICY), fx(r"\pi^{*}", size=52)).arrange(RIGHT, buff=0.3)
        opt.next_to(cond, DOWN, buff=0.8)
        with self.voice("方策が変わらなくなったとき、その方策は、{A}自分自身の価値に対して、貪欲になっています。"
                        "{B}実はこれが、最適な方策であるための条件なんです。") as v:
            self.play(FadeOut(VGroup(loop, pname, stable, cnt)), run_time=0.7)
            self.play(Write(cond), run_time=1.2)
            self.wait_to(v, "A")
            self.play(Indicate(cond[0], color=style.POLICY, scale_factor=1.5),
                      Indicate(cond[6][1], color=style.POLICY, scale_factor=1.6), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeIn(opt, shift=0.15 * UP), *[Indicate(a, color=WHITE, scale_factor=1.25) for a in cur.values()],
                      run_time=1.2)
        self.play(FadeOut(VGroup(g, *cur.values(), cond, opt)), run_time=0.9)


# ---------------------------------------------------------------------------
# 8. ベルマン最適方程式と価値反復
# ---------------------------------------------------------------------------
class Optimality(VoiceScene):
    def construct(self):
        eq = bellman(size=54).move_to(UP * 0.9)
        eq_s = bellman(v=r"V^{*}", size=54).move_to(UP * 0.9)
        opt_p = bellman_pieces(v=r"V^{*}", policy=False)
        eq_o = fx(*opt_p, size=54).move_to(UP * 0.9)
        with self.voice("最適な方策の価値を、{A}[V*|ブイスター]と書きます。{B}最適な方策は、どのマスでも、"
                        "一番良い行動を選ぶはずです。だから、ベルマン方程式の、{C}方策による平均が、"
                        "{D}最大値に置き換わります。") as v:
            self.play(Write(eq), run_time=1.5)
            self.wait_to(v, "A")
            self.play(ReplacementTransform(eq[0], eq_s[0]), ReplacementTransform(eq[25], eq_s[25]),
                      *[ReplacementTransform(eq[i], eq_s[i]) for i in range(len(eq)) if i not in (0, 25)],
                      run_time=1.0)
            self.play(Indicate(VGroup(eq_s[0], eq_s[25]), color=style.VALUE, scale_factor=1.25), run_time=0.9)
            self.wait_to(v, "C")
            hl = SurroundingRectangle(eq_s[5:12], color=style.POLICY, buff=0.1)
            self.play(Create(hl), run_time=0.7)
            self.wait_to(v, "D")
            self.play(ReplacementTransform(eq_s[5:12], eq_o[5]), ReplacementTransform(eq_s[0:5], eq_o[0:5]),
                      ReplacementTransform(eq_s[12:], eq_o[6:]),
                      hl.animate.become(SurroundingRectangle(eq_o[5], color=style.ACTION, buff=0.1)), run_time=1.3)

        box = SurroundingRectangle(eq_o, color=style.VALUE, buff=0.28, corner_radius=0.1)
        name = jt("ベルマン最適方程式", size=46, color=WHITE).next_to(box, DOWN, buff=0.5)
        with self.voice("これを、{A}ベルマン最適方程式と呼びます。") as v:
            self.play(FadeOut(hl), run_time=0.4)
            self.wait_to(v, "A")
            self.play(Create(box), FadeIn(name, shift=0.15 * UP), run_time=1.0)

        upd = fx(*bellman_pieces(v=r"V^{*}", policy=False, lhs=[r"V_{k+1}", "(", "s", ")"], arrow=r"\leftarrow",
                                 vnext=r"V_k"), size=46).move_to(UP * 3.15)
        g = GridView(WORLD, cell=1.25).move_to(LEFT * 2.4 + 0.55 * DOWN)
        labs = value_labels(g, VI_HIST[0], size=30)
        k_num = Integer(0, font_size=56)
        counter = VGroup(mt("k", "=", size=56), k_num).arrange(RIGHT, buff=0.2).move_to(RIGHT * 4.1 + UP * 1.2)
        vname = jt("価値反復", size=44, color=style.VALUE).next_to(counter, DOWN, buff=0.7)
        merge = VGroup(jt("評価", size=34, color=style.VALUE), jt("＋", size=34, color=GREY_B),
                       jt("改善", size=34, color=style.POLICY)).arrange(RIGHT, buff=0.2).next_to(vname, DOWN, buff=0.5)
        with self.voice("この右辺を、さっきと同じように、{A}何度も繰り返し当てはめていくのが、{B}価値反復です。"
                        "{C}評価と改善を、一度にまとめてやってしまうわけです。") as v:
            self.play(Indicate(eq_o[5:], color=WHITE, scale_factor=1.05), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeOut(VGroup(box, name)), ReplacementTransform(eq_o, upd), run_time=1.2)
            self.play(FadeIn(g), LaggedStart(*[FadeIn(l) for l in labs.values()], lag_ratio=0.03), FadeIn(counter),
                      run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeIn(vname, shift=0.1 * UP), run_time=0.7)
            self.wait_to(v, "C")
            self.play(FadeIn(merge[0]), FadeIn(merge[2]), run_time=0.6)
            self.play(FadeIn(merge[1]), merge[0].animate.shift(0.1 * RIGHT), merge[2].animate.shift(0.1 * LEFT),
                      run_time=0.6)

        def it(k, rt):
            self.play(*heat_anims(g, VI_HIST[k], labs), k_num.animate.set_value(k), run_time=rt)

        with self.voice("0から始めると、{A}まず、星のとなりのマスだけに、価値が生まれます。{B}次の回には、そのまたとなりへ。"
                        "{C}星から、価値が波のように広がっていきます。") as v:
            self.wait_to(v, "A")
            it(1, 0.9)
            self.play(Indicate(labs[(3, 3)], color=WHITE, scale_factor=1.5), run_time=0.7)
            self.wait_to(v, "B")
            it(2, 0.9)
            self.play(Indicate(labs[(2, 3)], color=WHITE, scale_factor=1.5), run_time=0.7)
            self.wait_to(v, "C")
            for k in (3, 4, 5):
                it(k, 0.9)

        far = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3)]
        far_line = path_line(g, far, color=WHITE, width=4, offset=0.34 * g.cell * DL)
        far_line = DashedVMobject(far_line, num_dashes=40)
        assert VI_HIST[6][(0, 0)] == 0 and VI_HIST[7][(0, 0)] > 0
        with self.voice("[k|ケー]回目の[値|あたい]は、あと[k歩|ケーほ]のうちに得られる、最善の結果、と読むことができます。"
                        "{A}遠いマスほど、価値が届くのに時間がかかるのは、そのためです。") as v:
            it(6, 1.0)
            self.play(Create(far_line), run_time=1.5)
            self.wait_to(v, "A")
            it(7, 1.0)
            self.play(Flash(g.center_of((0, 0)), color=WHITE, flash_radius=0.6),
                      Indicate(labs[(0, 0)], color=WHITE, scale_factor=1.6), run_time=0.9)

        arrows = policy_arrow_map(g, PI_STAR, length=0.62, shift=0.26 * g.cell * UP)
        pname = VGroup(jt("最適方策", size=40, color=style.POLICY), fx(r"\pi^{*}", size=52)).arrange(RIGHT, buff=0.25)
        pname.move_to(merge.get_center() + 1.3 * DOWN)
        last = len(VI_HIST) - 1
        with self.voice("{A}やがて、[値|あたい]は落ち着きます。{B}最後に、各マスで一番良い行動に矢印を引けば、それが最適方策です。") as v:
            self.play(FadeOut(far_line), run_time=0.4)
            for k in range(8, last + 1):
                it(k, 0.3 if k < 14 else 0.1)
            self.wait_to(v, "B")
            for s in NONTERM:
                labs[s].generate_target()
                labs[s].target.scale(0.9).move_to(g.center_of(s) + 0.27 * g.cell * DOWN)
            self.play(*[MoveToTarget(labs[s]) for s in NONTERM], run_time=0.6)
            self.play(LaggedStart(*[GrowArrow(arrows[s]) for s in NONTERM], lag_ratio=0.05), FadeIn(pname), run_time=1.5)
        self.play(FadeOut(VGroup(g, *labs.values(), *arrows.values(), upd, counter, vname, merge, pname)), run_time=0.9)


# ---------------------------------------------------------------------------
# 9. 穴の下の矢印
# ---------------------------------------------------------------------------
class RiskAverse(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.3).move_to(0.3 * DOWN)
        set_heat(g, V_STAR)
        arrows = policy_arrow_map(g, PI_STAR, length=0.6)
        s41 = (4, 1)
        with self.voice("ところで、この矢印を、よく見てください。{A}穴のすぐ下のマスで、矢印が、[下|した]を向いています。"
                        "{B}星とは、反対の方向です。") as v:
            self.play(FadeIn(g), LaggedStart(*[GrowArrow(a) for a in arrows.values()], lag_ratio=0.03), run_time=1.5)
            self.wait_to(v, "A")
            self.play(Circumscribe(g.cells[s41], color=WHITE), run_time=1.0)
            self.play(Indicate(arrows[s41], color=WHITE, scale_factor=1.5), run_time=0.9)
            self.wait_to(v, "B")
            ghost = DashedLine(g.center_of(s41) + 0.2 * UP, g.center_of(GOAL) + 0.35 * DOWN, color=GREY_B,
                               stroke_width=4)
            self.play(Create(ghost), Indicate(g.icons[GOAL], color=style.REWARD, scale_factor=1.3), run_time=1.0)

        # 左右に並べて比べる
        left_route = [(4, 1), (3, 1), (2, 1), (2, 2), (2, 3), (3, 3), (4, 3)]
        down_route = [(4, 1), (4, 0), (3, 0), (2, 0), (2, 1), (2, 2), (2, 3), (3, 3), (4, 3)]
        board = VGroup(g, *arrows.values())
        k_small = 0.6
        crop_states = [(3, 2), (4, 2), (3, 1), (4, 1), (3, 0), (4, 0)]
        cc = 1.5
        cropA, posA, cellsA, iconsA = local_view(crop_states, RIGHT * -0.2 + 0.5 * DOWN, cc, (3.5, 1), heat=V_STAR)
        cropB, posB, cellsB, iconsB = local_view(crop_states, RIGHT * 4.3 + 0.5 * DOWN, cc, (3.5, 1), heat=V_STAR)
        hA = VGroup(arrow_glyph(A_LEFT, length=0.55), jt("左に進む", size=38, color=WHITE)).arrange(RIGHT, buff=0.2)
        hB = VGroup(arrow_glyph(A_DOWN, length=0.55), jt("下に進む", size=38, color=WHITE)).arrange(RIGHT, buff=0.2)
        hA.next_to(cropA, UP, buff=0.3)
        hB.next_to(cropB, UP, buff=0.3)

        def fan(pos, a):
            c = pos(s41)
            out, labs = VGroup(), VGroup()
            for prob, aa in [(0.8, a), (0.1, (a + 1) % 4), (0.1, (a + 3) % 4)]:
                n = WORLD.move(s41, aa)
                big = prob > 0.5
                col = RED if n == PIT else (style.STATE if big else GREY_A)
                d = ACTION_VEC[aa]
                perp = np.array([-d[1], d[0], 0.0])
                if n == s41:
                    ar = bump(c, d, cc, color=GREY_A)
                    anchor = c + d * cc * 0.3
                else:
                    ar = Arrow(c, pos(n), buff=0.25, color=col, stroke_width=10 if big else 6,
                               max_tip_length_to_length_ratio=0.25)
                    anchor = ar.get_center()
                if abs(perp[0]) > 0 and n != s41:
                    perp = -perp if perp[0] < 0 and d[1] > 0 else perp
                lab = mt(f"{prob:.1f}", size=38 if big else 34, color=RED if n == PIT else WHITE)
                lab.move_to(anchor + perp * 0.36)
                out.add(ar)
                labs.add(lab)
            return out, labs

        fanA, flabA = fan(posA, A_LEFT)
        fanB, flabB = fan(posB, A_DOWN)
        with self.voice("{A}左に進めば、近道に見えます。でも、左に進もうとすると、{B}10%の確率で、[上|うえ]に滑ってしまう。"
                        "{C}[上|うえ]は、穴です。") as v:
            self.play(FadeOut(ghost), board.animate.scale(k_small).move_to(LEFT * 4.75 + 0.2 * DOWN), run_time=1.0)
            l_left = path_line(g, left_route, color=GREY_A, width=4)
            l_down = path_line(g, down_route, color=style.REWARD, width=4)
            steps_l = VGroup(Line(ORIGIN, RIGHT * 0.4, stroke_color=GREY_A, stroke_width=4),
                             jt(f"{len(left_route) - 1}歩", size=32, color=GREY_A)).arrange(RIGHT, buff=0.15)
            steps_d = VGroup(Line(ORIGIN, RIGHT * 0.4, stroke_color=style.REWARD, stroke_width=4),
                             jt(f"{len(down_route) - 1}歩", size=32, color=style.REWARD)).arrange(RIGHT, buff=0.15)
            steps_l.next_to(g, DOWN, buff=0.35).align_to(g, LEFT)
            steps_d.next_to(g, DOWN, buff=0.35).align_to(g, RIGHT)
            self.wait_to(v, "A")
            self.play(FadeIn(cropA), FadeIn(hA), Create(l_left), FadeIn(steps_l), run_time=1.2)
            self.wait_to(v, "B")
            self.play(GrowArrow(fanA[0]), FadeIn(flabA[0]), run_time=0.6)
            self.play(*[GrowArrow(x) if isinstance(x, Arrow) else GrowFromCenter(x) for x in fanA[1:]],
                      FadeIn(flabA[1:]), run_time=0.8)
            self.wait_to(v, "C")
            pit_i = [i for i, aa in enumerate([A_LEFT, A_UP, A_DOWN]) if WORLD.move(s41, aa) == PIT][0]
            self.play(Flash(posA(PIT), color=RED, flash_radius=0.7, num_lines=12),
                      Indicate(fanA[pit_i], color=RED, scale_factor=1.3), Indicate(flabA[pit_i], color=RED, scale_factor=1.5),
                      run_time=1.0)

        with self.voice("{A}[下|した]に進む場合は、{B}横に滑っても、左か右。{C}穴に落ちる心配はありません。"
                        "{D}遠回りにはなりますが、そのぶん安全なんです。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(cropB), FadeIn(hB), GrowArrow(fanB[0]), FadeIn(flabB[0]), run_time=1.0)
            self.wait_to(v, "B")
            self.play(*[GrowArrow(x) if isinstance(x, Arrow) else GrowFromCenter(x) for x in fanB[1:]],
                      FadeIn(flabB[1:]), run_time=0.9)
            self.wait_to(v, "C")
            safe = SurroundingRectangle(cellsB[PIT], color=style.ACTION, buff=0.0, stroke_width=6)
            self.play(Create(safe), run_time=0.7)
            self.wait_to(v, "D")
            self.play(Create(l_down), FadeIn(steps_d), run_time=1.5)

        # 行動価値で比べる
        qv = [Q_STAR[s41, a] for a in ACTIONS]
        base = RIGHT * 2.1 + UP * 0.9
        sc, slot = 2.3, 1.7
        bars = VGroup()
        for i, q in enumerate(qv):
            b = Rectangle(width=1.0, height=abs(q) * sc, stroke_width=0,
                          fill_color=style.VALUE if q >= 0 else RED, fill_opacity=0.85)
            b.move_to(base + RIGHT * (i - 1.5) * slot + UP * q * sc / 2)
            bars.add(b)
        baseline = Line(base + LEFT * 3.3, base + RIGHT * 3.3, stroke_color=GREY_C, stroke_width=2)
        glyphs = VGroup()
        vals = VGroup()
        for i, (a, q, b) in enumerate(zip(ACTIONS, qv, bars)):
            gl = arrow_glyph(a, color=GREY_A, length=0.42)
            gl.next_to(base + RIGHT * (i - 1.5) * slot, DOWN if q >= 0 else UP, buff=0.15)
            glyphs.add(gl)
            val = mt(f"{q:+.2f}", size=36, color=WHITE)
            val.next_to(b, UP if q >= 0 else DOWN, buff=0.12)
            vals.add(val)
        qhead = fx(r"Q^{*}", "(", "s", ",", "a", ")", size=50).move_to(RIGHT * 2.1 + UP * 3.15)
        ibest = int(np.argmax(qv))
        assert ACTIONS[ibest] == A_DOWN == PI_STAR[s41]
        best_box = SurroundingRectangle(VGroup(bars[ibest], vals[ibest]), color=WHITE, buff=0.1)

        pivot = RIGHT * 2.1 + DOWN * 2.45
        fulcrum = Triangle(color=GREY_B, fill_opacity=1, fill_color=GREY_D).scale(0.3).move_to(pivot + 0.28 * DOWN)
        half = 2.4
        beam = Line(pivot + LEFT * half, pivot + RIGHT * half, stroke_color=GREY_A, stroke_width=6)
        w_time = jt("時間のコスト", size=32, color=style.GAMMA)
        w_risk = jt("穴のリスク", size=32, color=RED)

        def place_weights(angle):
            lp = pivot + half * np.array([-np.cos(angle), -np.sin(angle), 0])
            rp = pivot + half * np.array([np.cos(angle), np.sin(angle), 0])
            return lp + 0.35 * UP, rp + 0.35 * UP

        with self.voice("実際に、{A}このマスの行動価値を比べてみると、{B}[下|した]が一番大きい。"
                        "{C}割引による時間のコストと、{D}10%で穴に落ちるリスク。{E}この二つを、ベルマン方程式が、"
                        "自動的に天秤にかけてくれたわけです。") as v:
            self.play(FadeOut(VGroup(cropA, cropB, hA, hB, fanA, fanB, flabA, flabB, safe)), run_time=0.7)
            self.wait_to(v, "A")
            self.play(FadeIn(qhead), Create(baseline), FadeIn(glyphs), Circumscribe(g.cells[s41], color=WHITE), run_time=0.9)
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN if q >= 0 else UP) for b, q in zip(bars, qv)], lag_ratio=0.15),
                      FadeIn(vals), run_time=1.2)
            self.wait_to(v, "B")
            self.play(Create(best_box), Indicate(arrows[s41], color=WHITE, scale_factor=1.5), run_time=0.9)
            self.wait_to(v, "C")
            lp, rp = place_weights(0)
            w_time.move_to(lp)
            w_risk.move_to(rp)
            self.play(FadeIn(fulcrum), Create(beam), FadeIn(w_time, shift=0.2 * DOWN), run_time=0.8)
            self.play(Rotate(beam, 0.12, about_point=pivot), w_time.animate.move_to(place_weights(0.12)[0]),
                      run_time=0.6)
            self.wait_to(v, "D")
            ang = -0.16
            w_risk.move_to(place_weights(0.12)[1])
            self.play(FadeIn(w_risk, shift=0.2 * DOWN), run_time=0.5)
            self.play(Rotate(beam, ang - 0.12, about_point=pivot), w_time.animate.move_to(place_weights(ang)[0]),
                      w_risk.animate.move_to(place_weights(ang)[1]), run_time=0.8)
            self.wait_to(v, "E")
            self.play(Rotate(beam, 0.06, about_point=pivot), w_time.animate.move_to(place_weights(ang + 0.06)[0]),
                      w_risk.animate.move_to(place_weights(ang + 0.06)[1]), rate_func=there_and_back, run_time=0.8)
            self.play(Indicate(bars[ibest], color=WHITE), Circumscribe(l_down, color=style.REWARD), run_time=1.2)

        balance = VGroup(fulcrum, beam, w_time, w_risk)
        opt = fx(*bellman_pieces(v=r"V^{*}", policy=False), size=44).move_to(UP * 3.2)
        rob = Robot(height=0.5)
        with self.voice("{A}危ない場所では慎重に。そんなルールを、誰も書いていないのに、{B}方程式から自然に出てくる。"
                        "これが、価値で考えることの力です。") as v:
            self.play(FadeOut(VGroup(bars, baseline, glyphs, vals, qhead, best_box, balance, l_left, steps_l, steps_d,
                                     l_down)),
                      board.animate.scale(1.0 / k_small * 0.95).move_to(0.55 * DOWN), run_time=1.0)
            rob.move_to(top_of(g, s41, 0.3))
            self.wait_to(v, "A")
            self.play(FadeIn(rob, scale=0.8), run_time=0.4)
            trail = VGroup()
            for s, n in zip(down_route[:-1], down_route[1:]):
                seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.REWARD, stroke_width=5)
                trail.add(seg)
                self.add(seg, rob)
                self.play(rob.animate.move_to(top_of(g, n, 0.3) if n != GOAL else g.center_of(n)).look(n_vec(s, n)),
                          Create(seg), run_time=0.38)
            self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.6), run_time=0.5)
            self.wait_to(v, "B")
            self.play(Write(opt), run_time=1.4)
        self.play(FadeOut(VGroup(board, trail, rob, opt)), run_time=0.9)


# ---------------------------------------------------------------------------
# 10. 限界
# ---------------------------------------------------------------------------
class Limits(VoiceScene):
    def construct(self):
        eq = fx(*bellman_pieces(v=r"V^{*}", policy=False), size=56).move_to(UP * 0.6)
        with self.voice("ただし、ここまでの方法には、大きな前提がありました。{A}遷移確率と、報酬の仕組みを、"
                        "すべて知っている、という前提です。") as v:
            self.play(Write(eq), run_time=1.5)
            self.wait_to(v, "A")
            b1 = SurroundingRectangle(eq[7:15], color=WHITE, buff=0.1)
            b2 = SurroundingRectangle(eq[16], color=style.REWARD, buff=0.1)
            t1 = jt("遷移確率", size=34, color=WHITE).next_to(b1, DOWN, buff=0.3)
            t2 = jt("報酬", size=34, color=style.REWARD).next_to(b2, DOWN, buff=0.3)
            self.play(Create(b1), FadeIn(t1), run_time=0.8)
            self.play(Create(b2), FadeIn(t2), run_time=0.8)

        # 遷移確率の表（状態×行動 → 次の状態）
        rows = [(s, a) for s in NONTERM for a in ACTIONS]
        cols = WORLD.states
        sq = 0.25
        table = VGroup()
        for i, (s, a) in enumerate(rows):
            probs = {n: p for p, n, r in WORLD.outcomes(s, a)}
            for j, n in enumerate(cols):
                p = probs.get(n, 0.0)
                cell = Square(sq, stroke_color=GREY_E, stroke_width=1,
                              fill_color=style.STATE if p > 0 else "#15151A", fill_opacity=(0.25 + 0.75 * p) if p > 0 else 1)
                cell.move_to(RIGHT * (j - len(cols) / 2 + 0.5) * sq + DOWN * i * sq)
                table.add(cell)
        table.move_to(ORIGIN).align_to(UP * 2.25, UP)
        mask = Rectangle(width=14.4, height=3.0, stroke_width=0, fill_color=style.BG, fill_opacity=1)
        mask.next_to(UP * 2.4, UP, buff=0).set_z_index(5)
        col_h = jt("次の状態", size=30, color=style.STATE).next_to(table, UP, buff=0.18).set_z_index(6)
        row_h = jt("状態 × 行動", size=30, color=GREY_A).rotate(PI / 2).next_to(table, LEFT, buff=0.3)
        row_h.set_y(0).set_z_index(6)
        row_h_cnt = mt(r"15 \times 4 = 60", size=32, color=GREY_B).rotate(PI / 2).next_to(row_h, LEFT, buff=0.2)
        col_h_cnt = mt("17", size=32, color=GREY_B).next_to(col_h, RIGHT, buff=0.2).set_z_index(6)
        # 1行だけ拡大して読めるように
        ex_i = rows.index(((4, 1), A_LEFT))
        ex_probs = {n: p for p, n, r in WORLD.outcomes((4, 1), A_LEFT)}
        lens_items = VGroup()
        for n in cols:
            p = ex_probs.get(n, 0.0)
            lens_items.add(mt(f"{p:.1f}" if p > 0 else "0", size=30,
                              color=(RED if n == PIT else WHITE) if p > 0 else GREY_D))
        lens_items.arrange(RIGHT, buff=0.22)
        lens_head = VGroup(mt("(4,1)", size=30), arrow_glyph(A_LEFT, length=0.34)).arrange(RIGHT, buff=0.15)
        lens = VGroup(lens_head, lens_items).arrange(RIGHT, buff=0.4)
        lens_bg = SurroundingRectangle(lens, color=WHITE, buff=0.2, corner_radius=0.1, fill_color="#141418",
                                       fill_opacity=1, stroke_width=2)
        lens_grp = VGroup(lens_bg, lens).move_to(DOWN * 2.8).set_z_index(7)
        lens.set_z_index(8)
        qmark = jt("？", size=120, color=GREY_A).set_z_index(9)
        with self.voice("ベルマン方程式の右辺を計算するには、どの行動で、どこへ、どれくらいの確率で行くのか、"
                        "{A}その表が、丸ごと必要でした。{B}現実の問題では、こんな表は、まず手に入りません。") as v:
            self.play(FadeOut(VGroup(b1, b2, t1, t2)), eq.animate.scale(0.78).move_to(UP * 3.25), run_time=0.9)
            eq.set_z_index(7)
            self.add(mask)
            self.play(FadeIn(table, lag_ratio=0.0005), FadeIn(col_h), FadeIn(col_h_cnt), FadeIn(row_h), FadeIn(row_h_cnt),
                      run_time=1.2)
            self.wait_to(v, "A")
            shift = 7.0
            self.play(table.animate.shift(UP * shift), run_time=max(2.0, v.until("B") - 1.4), rate_func=smooth)
            row_rect = SurroundingRectangle(VGroup(*table[ex_i * len(cols):(ex_i + 1) * len(cols)]), color=WHITE,
                                            buff=0.03, stroke_width=3)
            self.play(Create(row_rect), FadeIn(lens_grp, shift=0.2 * UP), run_time=0.9)
            self.wait_to(v, "B")
            self.play(table.animate.set_opacity(0.25), row_rect.animate.set_stroke(opacity=0.3), FadeIn(qmark, scale=0.6),
                      run_time=1.0)

        # 状態の数
        head = jt("状態の数", size=42, color=style.STATE).move_to(UP * 3.1)
        mini = GridView(WORLD, cell=0.32, show_terminal_labels=False)
        lab_g = jt("マス目の世界", size=32, color=GREY_A)
        n_g = mt("15", size=52, color=WHITE)
        row1 = VGroup(lab_g, mini, n_g).arrange(RIGHT, buff=0.4)
        lab_c = jt("チェス", size=32, color=GREY_A)
        digits_c = mt("1" + "0" * 40, size=34, color=WHITE)
        n_c = mt(r"> 10^{40}", size=40, color=GREY_A)
        lab_go = jt("囲碁", size=32, color=GREY_A)
        go_str = "1" + "0" * 170
        go_lines = VGroup(*[mt(go_str[i:i + 43], size=34, color=WHITE) for i in range(0, len(go_str), 43)])
        go_lines.arrange(DOWN, aligned_edge=LEFT, buff=0.14)
        n_go = mt(r"\approx 10^{170}", size=40, color=GREY_A)
        x0 = -4.3
        row1.move_to(UP * 1.95).align_to(RIGHT * -6.6, LEFT)
        lab_c.move_to(UP * 0.75).align_to(RIGHT * -6.6, LEFT)
        digits_c.move_to(UP * 0.75).align_to(RIGHT * x0, LEFT)
        n_c.next_to(digits_c, DOWN, buff=0.15).align_to(digits_c, RIGHT)
        lab_go.move_to(DOWN * 0.7).align_to(RIGHT * -6.6, LEFT)
        go_lines.next_to(RIGHT * x0 + DOWN * 0.45, DOWN, buff=0).align_to(RIGHT * x0, LEFT)
        n_go.next_to(go_lines, DOWN, buff=0.15).align_to(go_lines, RIGHT)
        with self.voice("もう一つの問題は、{A}状態の数です。{B}このマス目の世界なら15個ですが、{C}チェスなら、10の40乗以上。"
                        "{D}囲碁なら、10の170乗。{E}すべての状態を一つずつ更新するのは、不可能です。") as v:
            self.play(FadeOut(VGroup(table, row_rect, lens_grp, qmark, col_h, col_h_cnt, row_h, row_h_cnt, eq)),
                      run_time=0.8)
            self.remove(mask)
            self.wait_to(v, "A")
            self.play(FadeIn(head, shift=0.1 * DOWN), run_time=0.6)
            self.wait_to(v, "B")
            self.play(FadeIn(row1, shift=0.2 * RIGHT), run_time=0.8)
            self.wait_to(v, "C")
            self.play(FadeIn(lab_c), Write(digits_c), run_time=1.2)
            self.play(FadeIn(n_c), run_time=0.4)
            self.wait_to(v, "D")
            self.play(FadeIn(lab_go), LaggedStart(*[Write(l) for l in go_lines], lag_ratio=0.3), run_time=2.0)
            self.play(FadeIn(n_go), run_time=0.4)
            self.wait_to(v, "E")
            self.play(Indicate(go_lines, color=RED, scale_factor=1.03), run_time=1.2)

        rob = Robot(height=1.1).move_to(DOWN * 0.3)
        qm = jt("？", size=80, color=GREY_A).next_to(rob, UP, buff=0.25)
        icon_rows = rows[20:32]
        tbl_icon = VGroup()
        for (s_, a_) in icon_rows:
            probs = {n: p for p, n, r in WORLD.outcomes(s_, a_)}
            for n in cols[4:14]:
                pr = probs.get(n, 0.0)
                tbl_icon.add(Square(0.26, stroke_color=GREY_D, stroke_width=1,
                                    fill_color=style.STATE if pr > 0 else "#15151A",
                                    fill_opacity=(0.25 + 0.75 * pr) if pr > 0 else 1))
        tbl_icon.arrange_in_grid(len(icon_rows), 10, buff=0).move_to(LEFT * 4.3 + DOWN * 0.6)
        tbl_lab = fx(*pieces_P(), size=44).next_to(tbl_icon, UP, buff=0.3)
        tbl_q = jt("？", size=90, color=WHITE).move_to(tbl_icon)
        big_n = mt(r"10^{170}", size=72, color=GREY_A).move_to(RIGHT * 4.3 + DOWN * 0.3)
        n_lab = jt("状態の数", size=34, color=style.STATE).next_to(big_n, UP, buff=0.4)
        with self.voice("{A}ルールを知らない世界で、しかも、{B}膨大な状態の中で、価値を学ぶには、どうすればいいのか。") as v:
            self.play(FadeOut(VGroup(head, row1, lab_c, digits_c, n_c, lab_go, go_lines, n_go)), run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(tbl_icon), FadeIn(tbl_lab), FadeIn(rob, scale=0.8), run_time=0.8)
            self.play(tbl_icon.animate.set_opacity(0.15), FadeIn(tbl_q, scale=0.7), rob.animate.look(LEFT), run_time=0.8)
            self.wait_to(v, "B")
            self.play(FadeIn(big_n, shift=0.2 * LEFT), FadeIn(n_lab), rob.animate.look(RIGHT), run_time=0.8)
            self.play(FadeIn(qm, shift=0.2 * UP), rob.animate.look(UP), run_time=0.7)
            self.play(rob.blink())
        self.play(FadeOut(VGroup(rob, qm, tbl_icon, tbl_lab, tbl_q, big_n, n_lab)), run_time=0.9)


# ---------------------------------------------------------------------------
# 11. 次回予告
# ---------------------------------------------------------------------------
class Outro(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.3).move_to(0.5 * DOWN)
        fog = {s: g.cells[s].copy().set_fill("#050506", 0.92).set_stroke(width=0) for s in WORLD.states
               if s not in WORLD.walls}
        qms = {s: jt("?", size=36, color=GREY_C).move_to(g.center_of(s)) for s in fog}
        robot = Robot(height=0.55).move_to(g.center_of(WORLD.start))
        # 手探りで動き回る（一様ランダムの実際のロールアウト。いろいろなマスを通って星に着く系列）
        traj = WORLD.rollout(UNIFORM, np.random.default_rng(38), max_steps=40)
        with self.voice("次回は、ロボットに世界のルールを教えないまま、{A}実際に動いて得た経験だけから、価値を学ばせます。"
                        "そこで登場するのが、{B}[TD学習|ティーディーがくしゅう]と、{C}[Q学習|キューがくしゅう]です。") as v:
            self.play(FadeIn(g), FadeIn(VGroup(*fog.values())), FadeIn(VGroup(*qms.values())), run_time=1.0)
            self.play(FadeIn(robot, scale=0.8), FadeOut(fog[WORLD.start]), FadeOut(qms[WORLD.start]), run_time=0.6)
            seen = {WORLD.start}
            self.wait_to(v, "A")
            td = jt("TD学習", size=52, color=style.VALUE).move_to(LEFT * 3.0 + UP * 3.15)
            ql = jt("Q学習", size=52, color=style.VALUE).move_to(RIGHT * 3.0 + UP * 3.15)
            t_b, t_c = v.start + v.at("B"), v.start + v.at("C")
            t_end = v.start + v.duration + 1.2
            shown = set()
            for s, a, r, n in traj:
                if self.time > t_end:
                    break
                anims = [robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)) if n != s else
                         robot.animate(rate_func=there_and_back).shift(0.12 * g.cell * ACTION_VEC[a])]
                if n not in seen and n in fog:
                    seen.add(n)
                    anims += [FadeOut(fog[n]), FadeOut(qms[n])]
                if "B" not in shown and self.time >= t_b:
                    shown.add("B")
                    anims.append(FadeIn(td, shift=0.2 * DOWN))
                if "C" not in shown and self.time >= t_c:
                    shown.add("C")
                    anims.append(FadeIn(ql, shift=0.2 * DOWN))
                self.play(*anims, run_time=0.26)
                if n == GOAL:
                    self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.6), run_time=0.5)
            if "B" not in shown:
                self.play(FadeIn(td, shift=0.2 * DOWN), run_time=0.5)
            if "C" not in shown:
                self.wait_to(v, "C")
                self.play(FadeIn(ql, shift=0.2 * DOWN), run_time=0.5)
            self.play(Indicate(VGroup(td, ql), color=WHITE, scale_factor=1.08), run_time=1.0)
        rest = [m for s, m in fog.items() if s not in seen] + [m for s, m in qms.items() if s not in seen]
        self.play(FadeOut(VGroup(g, robot, td, ql, *rest)), run_time=1.0)
        play_end_card(self, next_title="第3章　経験から学ぶ")
