"""第4章「価値をニューラルネットで近似する」— DQN。

レンダリング:  python tools/build.py ch04 [-q h]
"""
from __future__ import annotations

import functools

import numpy as np
from manim import *

from common import style
from common.mobjects import ACTION_VEC, Robot, value_color
from common.rl import ACTIONS, main_world, q_learning
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene
from chapters.ch04.helpers import (ACT_LEFT, ACT_NOOP, ACT_RIGHT, GAME_ACTIONS, Adam, Bars, GameView,
                                   bias_chain, conv_block, cross_mark, demo_episode, dice_face, dice_samples,
                                   digit_image,
                                   forgetting_run, gen_true, generalization_fit, interp_state, lock_icon,
                                   mc_q_values, mlp, moving_target_fixed_point, moving_target_run,
                                   overestimation_samples, pixel_image, play_title_card_fit, raster,
                                   replay_true, section_tag, tiny_network, triad_run, action_glyph)

CHAPTER_TITLE = "第4章 価値をニューラルネットで近似する"

SCENES = [
    "Hook", "Title", "Generalization", "QNetwork", "Loss", "MovingTarget", "Replay",
    "Overestimation", "Algorithm", "DeadlyTriad", "Outro",
]

WORLD = main_world()
EP = demo_episode()          # ブロック崩し風ゲームのプレイ（実際にシミュレーションしたもの）
GAME_RATE = 20.0             # 1秒あたりのゲームのステップ数


# ---------------------------------------------------------------------------
# 共通の小道具
# ---------------------------------------------------------------------------
def arrow_glyph(a, color=style.ACTION, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def thumb(step, width=1.0):
    return pixel_image(raster(EP[step]), width)


def framed_thumb(step, width=1.0, stroke=GREY_C):
    im = thumb(step, width)
    fr = Rectangle(width=width + 0.04, height=width + 0.04, stroke_color=stroke, stroke_width=1.5).move_to(im)
    return Group(im, fr)


def _glyphs(m):
    """MathTex 全体（部分が1つ）でも、その部分でも、文字の並びを返す。"""
    return m[0] if isinstance(m, MathTex) else m


def paint_q(part, theta_glyphs=1):
    """Q_{θ}(...) の Q を青緑、θ（θ⁻）を桃色に。"""
    part.set_color(style.VALUE)
    _glyphs(part)[1:1 + theta_glyphs].set_color(style.THETA)
    return part


def paint_theta(part, idx):
    _glyphs(part)[idx].set_color(style.THETA)
    return part


def paint_max(part):
    """\\max_{a'} の a' を緑に。"""
    _glyphs(part)[3:].set_color(style.ACTION)
    return part


def dqn_target_tex(size=52, theta="\\theta"):
    """y = r + γ max_{a'} Q_θ(s', a')"""
    m = mt("y", "=", "r", "+", r"\gamma", r"\max_{a'}", f"Q_{{{theta}}}(s',a')", size=size)
    m[0].set_color(style.REWARD)
    paint_max(m[5])
    paint_q(m[6], 2 if "^" in theta else 1)
    return m


def loss_tex(size=56):
    """L(θ) = ( y − Q_θ(s,a) )²"""
    m = mt(r"L(\theta)", "=", r"\big(", "y", "-", r"Q_{\theta}(s,a)", r"\big)^2", size=size)
    paint_theta(m[0], 2)
    m[3].set_color(style.REWARD)
    paint_q(m[5])
    return m


def node_box(tex_or_mob, w=1.8, h=1.0, color=GREY_B, size=48):
    m = mt(tex_or_mob, size=size) if isinstance(tex_or_mob, str) else tex_or_mob
    box = RoundedRectangle(width=max(w, m.width + 0.5), height=h, corner_radius=0.16, stroke_color=color,
                           stroke_width=2.5, fill_color="#141418", fill_opacity=1)
    return VGroup(box, m.move_to(box))


def dashed_arrow(start, end, color=GREY_B, width=4, dash_length=0.12):
    start, end = np.array(start), np.array(end)
    d = (end - start) / np.linalg.norm(end - start)
    line = DashedLine(start, end - 0.18 * d, color=color, stroke_width=width, dash_length=dash_length)
    tip = Arrow(end - 0.3 * d, end, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.9,
                max_stroke_width_to_length_ratio=20)
    return VGroup(line, tip)


def pulse(card, color=WHITE, scale=1.15):
    """画像入りのカードを強調する（Indicate だと画像が単色に塗られてしまうため）。"""
    return AnimationGroup(card.animate(rate_func=there_and_back).scale(scale),
                          Circumscribe(card, color=color, buff=0.04, fade_out=True))


def run_game(scene, tk, dt):
    """ゲームのトラッカーを dt 秒ぶん進める。"""
    scene.play(tk.animate(rate_func=linear).set_value(tk.get_value() + GAME_RATE * dt), run_time=dt)


# ---------------------------------------------------------------------------
# 1. つかみ: 画素から学ぶとしたら
# ---------------------------------------------------------------------------
def q_table(Q, states, cw=1.6, ch=0.8):
    col_w = [2.1] + [cw] * 4
    xs = np.cumsum([0] + col_w[:-1]) + np.array(col_w) / 2
    rows = VGroup()
    head = [jt("状態", size=36, color=style.STATE)] + [arrow_glyph(a, length=0.5) for a in ACTIONS]
    rows.add(VGroup(*[m.move_to(RIGHT * x) for m, x in zip(head, xs)]))
    for k, s in enumerate(states):
        y = -(k + 1) * ch
        cells = VGroup(mt(f"({s[0]},{s[1]})", size=36, color=GREY_A).move_to(RIGHT * xs[0] + UP * y))
        for j, a in enumerate(ACTIONS):
            v = Q[s, a]
            box = Rectangle(width=cw - 0.08, height=ch - 0.08, stroke_width=0, fill_color=value_color(v),
                            fill_opacity=1).move_to(RIGHT * xs[j + 1] + UP * y)
            num = DecimalNumber(v, num_decimal_places=2, font_size=34, color=WHITE).move_to(box)
            cells.add(VGroup(box, num))
        rows.add(cells)
    rows.add(mt(r"\vdots", size=40, color=GREY_B).move_to(RIGHT * xs[0] + UP * (-(len(states) + 1) * ch)))
    return rows


class Hook(VoiceScene):
    def construct(self):
        Q, _, _, _ = q_learning(WORLD, episodes=400, seed=3)
        table = q_table(Q, [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3)]).move_to(0.2 * DOWN)
        with self.voice("前回までは、状態ごとに、価値を表に書き込んできました。") as v:
            self.sfx("pop", offset=0.1)
            self.play(LaggedStart(*[FadeIn(r, shift=0.15 * DOWN) for r in table], lag_ratio=0.18),
                      run_time=2.4)

        t_start = 20
        tk = ValueTracker(t_start)
        gv = GameView(EP[t_start], width=4.6).move_to(LEFT * 0.4 + 0.1 * DOWN)
        robot = Robot(height=0.95).move_to(RIGHT * 4.1 + DOWN * 1.9)
        robot.look(LEFT)
        with self.voice("でも、例えばこんなゲームを、{A}画面の画素から学ぶとしたら、どうでしょう。") as v:
            self.sfx("whoosh")
            self.play(table.animate.scale(0.3).to_corner(UL, buff=0.3).set_opacity(0.4),
                      FadeIn(gv, scale=0.92), FadeIn(robot, shift=0.3 * LEFT), run_time=1.0)
            gv.add_updater(lambda m: m.update_state(interp_state(EP, tk.get_value())))
            robot.add_updater(lambda m: m.look(gv.ball.get_center() - m.get_center()))
            run_game(self, tk, v.until("A"))
            self.play(tk.animate(rate_func=linear).set_value(tk.get_value() + GAME_RATE * 1.2),
                      Circumscribe(gv, color=WHITE, stroke_width=3), run_time=1.2)
            run_game(self, tk, v.remaining() + self.default_pad)

        with self.voice("画面を、{A}84かける84の、白黒の画像に縮めて、動きが分かるように、"
                        "{B}4枚重ねたものを、状態とします。") as v:
            run_game(self, tk, v.until("A"))
            t0 = int(round(tk.get_value()))
            gv.clear_updaters()
            robot.clear_updaters()
            gv.update_state(EP[t0])
            img = pixel_image(raster(EP[t0]), 4.6).move_to(gv)
            self.sfx("pop")
            self.play(FadeIn(img), robot.change("surprised"), run_time=0.9)
            self.remove(gv)
            size_lab = mt(r"84 \times 84", size=48).next_to(img, DOWN, buff=0.3)
            # 画素の格子にぐっと寄る（1マス = 1画素、数字は明るさ 0〜255）
            arr = raster(EP[t0])
            px = 4.6 / 84
            ul = img.get_corner(UL)
            bcol, brow = int(round(EP[t0].bx)), 84 - int(round(EP[t0].by))
            rows_v = range(max(0, brow - 9), min(84, brow + 5))
            cols_v = range(max(0, bcol - 12), min(84, bcol + 12))
            nums = VGroup()
            for i in rows_v:
                for j in cols_v:
                    val = int(arr[i, j])
                    nums.add(mt(str(val), size=3.2, color=BLACK if val > 128 else GREY_B).move_to(
                        ul + RIGHT * (j + 0.5) * px + DOWN * (i + 0.5) * px))
            gridl = VGroup(*[Line(ul + RIGHT * j * px + DOWN * rows_v[0] * px, ul + RIGHT * j * px + DOWN * (rows_v[-1] + 1) * px,
                                  stroke_width=0.4, stroke_color=GREY_D) for j in range(cols_v[0], cols_v[-1] + 2)],
                           *[Line(ul + DOWN * i * px + RIGHT * cols_v[0] * px, ul + DOWN * i * px + RIGHT * (cols_v[-1] + 1) * px,
                                  stroke_width=0.4, stroke_color=GREY_D) for i in range(rows_v[0], rows_v[-1] + 2)])
            focus = ul + RIGHT * (bcol + 0.5) * px + DOWN * (brow - 2) * px
            self.sfx("whoosh")
            self.add(size_lab)
            self.play(self.focus_on(focus, height=0.75, run_time=1.2), FadeIn(size_lab, run_time=1.2), rate_func=smooth)
            self.play(FadeIn(gridl), FadeIn(nums, lag_ratio=0.002), run_time=0.5)
            hold = v.until("B") - 1.0
            if hold > 0.1:
                self.wait(hold)
            self.play(self.reset_frame(run_time=1.0), FadeOut(nums), FadeOut(gridl), robot.change("normal"), run_time=1.0)
            front_pos = LEFT * 3.5 + DOWN * 0.75
            self.play(img.animate.scale_to_fit_width(3.6).move_to(front_pos),
                      size_lab.animate.move_to(front_pos + DOWN * 2.25), run_time=0.8)
            img.set_z_index(10)
            olds = []
            for k in range(1, 4):
                o = pixel_image(raster(EP[t0 - 3 * k]), 3.6).move_to(front_pos + k * 0.34 * (UP + RIGHT))
                o.set_z_index(10 - k)
                olds.append(o)
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(o, shift=0.3 * (UP + RIGHT)) for o in olds], lag_ratio=0.35),
                      run_time=1.1)
            times4 = mt(r"\times 4", size=48).next_to(olds[-1], RIGHT, buff=0.25).shift(1.0 * UP)
            s_lab = VGroup(jt("状態", size=36, color=style.STATE), mt("s", size=52, color=style.STATE))
            s_lab.arrange(RIGHT, buff=0.15).next_to(olds[-1], UP, buff=0.25)
            self.play(FadeIn(times4), FadeIn(s_lab, shift=0.1 * DOWN), run_time=0.6)

        # 状態の数: 256^(84·84·4) = 10^67970.16…（指数を数え上げる）
        f1 = mt(r"256^{\,84\times 84\times 4}", size=58)
        f2 = mt(r"\approx 10", size=66)
        expn = Integer(0, font_size=46, group_with_commas=False)
        VGroup(f1, f2).arrange(DOWN, buff=0.55, aligned_edge=LEFT).move_to(RIGHT * 3.0 + UP * 1.0)

        def stick(m):
            m.next_to(f2, RIGHT, buff=0.05, aligned_edge=UP).shift(0.28 * UP)

        stick(expn)
        with self.voice("画素の値の組み合わせは、{A}10の6万7千乗を超えます。"
                        "{B}表を作るどころか、同じ画面に《二度》出会うことすら、まずありません。") as v:
            self.play(robot.animate.move_to(RIGHT * 5.6 + DOWN * 2.6).look(UL), run_time=0.6)
            self.play(Write(f1), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(f2), FadeIn(expn), run_time=0.3)
            expn.add_updater(stick)
            self.sfx("tick")
            self.sfx("tick", offset=0.4)
            self.sfx("tick", offset=0.8)
            self.play(ChangeDecimalToValue(expn, 67970, rate_func=rush_from), run_time=1.6)
            expn.clear_updaters()
            self.sfx("hit")
            self.play(robot.change("surprised"), Flash(expn.get_center(), color=WHITE, flash_radius=0.8), run_time=0.5)
            self.play(robot.hop(), run_time=0.45)
            self.wait_to(v, "B")
            stack = Group(img, *olds, size_lab, times4, s_lab)
            one_line = VGroup(f1.copy(), VGroup(f2.copy(), expn.copy())).arrange(RIGHT, buff=0.35).scale(0.8)
            one_line.to_edge(UP, buff=0.3)
            fexp = VGroup(f2, expn)
            # 隅にしまっておいた表が、画面の表に「なる」
            col_x = [-3.4, -1.6, -0.4, 0.8, 2.9]
            header = VGroup(jt("画面", size=30, color=style.STATE),
                            *[action_glyph(a, length=0.5) for a in GAME_ACTIONS],
                            jt("出会った回数", size=28, color=GREY_B))
            for m, x in zip(header, col_x):
                m.move_to(RIGHT * x + UP * 1.75)
            hline = Line(LEFT * 4.2, RIGHT * 4.1, stroke_color=GREY_D, stroke_width=2).move_to(UP * 1.3)
            self.play(FadeOut(stack), Transform(f1, one_line[0]), Transform(fexp, one_line[1]),
                      ReplacementTransform(table, VGroup(header, hline)), robot.change("worried"), run_time=0.9)
            row_h = 1.05
            steps = [0, 31, 57, 88, 112, 140, 166, 190, 217, 243, 12, 45, 70, 101, 129, 155, 178, 204, 230, 255]

            def make_row(st, y):
                th = framed_thumb(st, 0.85).move_to(RIGHT * col_x[0] + UP * y)
                qs = VGroup(*[jt("?", size=34, color=GREY_C).move_to(RIGHT * x + UP * y) for x in col_x[1:4]])
                cnt = mt("1", size=40, color=WHITE).move_to(RIGHT * col_x[4] + UP * y)
                return Group(th, qs, cnt)

            rows = []
            y_top = 0.65
            n_push = min(len(steps), max(4, int((v.remaining() + 0.3) / 0.36)))
            for k in range(n_push):
                if k % 3 == 0:
                    self.sfx("tick")
                if k < 4:
                    new = make_row(steps[k], y_top - k * row_h)
                    self.play(FadeIn(new, shift=0.3 * UP), run_time=0.34)
                else:
                    new = make_row(steps[k], y_top - 3 * row_h)
                    self.play(FadeOut(rows[k - 4], shift=0.4 * UP), *[r.animate.shift(row_h * UP) for r in rows[k - 3:k]],
                              FadeIn(new, shift=0.3 * UP), run_time=0.34)
                rows.append(new)
        table2 = Group(header, hline, *rows[-4:])

        net = tiny_network((5, 7, 7, 3), width=4.4, height=3.2, r=0.13).move_to(UP * 0.55 + RIGHT * 0.3)
        ins = Group(*[pixel_image(raster(EP[t0 - 3 * k]), 1.9).move_to(LEFT * 4.6 + UP * 0.45 + k * 0.2 * (UP + RIGHT))
                      for k in range(3, -1, -1)])
        a_in = Arrow(LEFT * 3.2 + UP * 0.55, net.get_left() + 0.1 * LEFT, buff=0.1, color=GREY_C, stroke_width=4)
        outs = VGroup(*[action_glyph(a, length=0.7) for a in GAME_ACTIONS]).arrange(DOWN, buff=0.55)
        outs.next_to(net, RIGHT, buff=0.6)
        dqn = jt("DQN", size=96, color=WHITE, weight="BOLD").move_to(DOWN * 2.45)
        year = jt("2015", size=40, color=GREY_B).next_to(dqn, RIGHT, buff=0.4).shift(0.15 * DOWN)
        with self.voice("この問題に、ニューラルネットで挑んだのが、{A}2015年に発表された、[DQN|ディーキューエヌ]です。") as v:
            # 表の行の画面が、ネットワークへの入力に「なる」
            thumbs = [r[0] for r in rows[-4:]]
            self.play(FadeOut(Group(header, hline)), FadeOut(f1), FadeOut(fexp),
                      *[FadeOut(Group(*r[1:])) for r in rows[-4:]],
                      *[th.animate.scale_to_fit_width(1.94).move_to(ins[3 - k]) for k, th in enumerate(thumbs)],
                      robot.change("normal"), run_time=1.0)
            self.remove(*thumbs)
            self.add(ins)
            self.play(GrowArrow(a_in), FadeIn(net), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(o, shift=0.1 * RIGHT) for o in outs], lag_ratio=0.2),
                      robot.animate.look(UL), run_time=0.8)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(Write(dqn), FadeIn(year, shift=0.1 * LEFT), robot.change("happy"), run_time=1.1)
            self.play(robot.hop(), run_time=0.45)
        self.play(FadeOut(Group(net, ins, a_in, outs, dqn, year, robot)), run_time=0.9)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 4, "価値をニューラルネットで近似する", subtitle="DQN")


# ---------------------------------------------------------------------------
# 3. 汎化
# ---------------------------------------------------------------------------
class Generalization(VoiceScene):
    def construct(self):
        xs, ys, p0, snaps, iu, yup = generalization_fit()
        ax = Axes(x_range=[0, 1, 0.1], y_range=[0, 1.2, 0.2], x_length=10.6, y_length=4.6, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False))
        ax.move_to(RIGHT * 0.35 + DOWN * 0.3)
        xl = VGroup(jt("状態", size=32, color=style.STATE), mt("s", size=44, color=style.STATE)).arrange(RIGHT, buff=0.12)
        yl = jt("価値", size=32, color=style.VALUE).next_to(ax.y_axis, LEFT, buff=0.25).align_to(ax.y_axis, UP)
        nb = 20
        wbin = 1.0 / nb
        slot_y = ax.c2p(0, 0)[1] - 0.32
        slots = VGroup(*[Rectangle(width=ax.x_length * wbin - 0.05, height=0.3, stroke_color=GREY_D, stroke_width=1.5)
                         .move_to([ax.c2p((b + 0.5) * wbin, 0)[0], slot_y, 0]) for b in range(nb)])
        xl.next_to(slots, DOWN, buff=0.15).align_to(slots, RIGHT)

        with self.voice("鍵になるのは、{A}《汎化》です。") as v:
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), run_time=0.9)
            self.wait_to(v, "A")
            key = jt("汎化", size=64, color=WHITE, weight="MEDIUM").move_to(UP * 2.9)
            self.sfx("hit")
            self.play(Write(key), run_time=0.7)
        tag = section_tag("汎化")
        self.play(ReplacementTransform(key, tag), run_time=0.6)

        visited = [int(x // wbin) for x in xs]
        bars = VGroup()
        for b, y in zip(visited, ys):
            cx = (b + 0.5) * wbin
            r = Rectangle(width=ax.x_length * wbin * 0.8, height=ax.c2p(0, y)[1] - ax.c2p(0, 0)[1],
                          stroke_width=0, fill_color=style.VALUE, fill_opacity=0.85)
            r.move_to(ax.c2p(cx, y / 2))
            bars.add(r)
        mode = jt("表", size=44, color=WHITE).move_to(UP * 2.9)
        with self.voice("表では、ある状態で学んだことは、{A}その状態にしか反映されません。"
                        "{B}ほんの少しだけ違う状態は、まったくの別物として扱われます。") as v:
            self.play(FadeIn(mode), Create(slots), run_time=0.8)
            self.sfx("pop")
            self.play(*[slots[b].animate.set_fill(style.VALUE, 0.7) for b in visited],
                      LaggedStart(*[GrowFromEdge(r, DOWN) for r in bars], lag_ratio=0.12), run_time=1.4)
            self.wait_to(v, "A")
            k = 3
            b = visited[k]
            new_h = bars[k].height + (ax.c2p(0, 0.25)[1] - ax.c2p(0, 0)[1])
            self.sfx("hit")
            self.play(bars[k].animate.stretch_to_fit_height(new_h, about_edge=DOWN).set_fill(style.REWARD),
                      Flash(bars[k].get_top() + UP * (new_h - bars[k].height), color=style.REWARD, flash_radius=0.4),
                      run_time=0.8)
            self.play(bars[k].animate.set_fill(style.VALUE), run_time=0.4)
            self.wait_to(v, "B")
            nbx = slots[b + 1]
            hl = SurroundingRectangle(nbx, color=style.REWARD, buff=0.03, stroke_width=4)
            hl0 = SurroundingRectangle(slots[b], color=GREY_A, buff=0.03, stroke_width=3)
            qm = jt("?", size=52, color=GREY_A).move_to([nbx.get_center()[0], ax.c2p(0, 0.35)[1], 0])
            self.play(Create(hl0), Create(hl), run_time=0.6)
            self.sfx("pop")
            self.play(FadeIn(qm, scale=0.6), run_time=0.6)
            self.play(Wiggle(qm), run_time=1.0)

        grid = np.linspace(0, 1, 201)
        Y = np.array([mlp(sn, grid)[0] for sn in snaps])
        dots = VGroup(*[Dot(ax.c2p(x, y), radius=0.1, color=WHITE) for x, y in zip(xs, ys)])
        curve0 = VMobject(stroke_color=style.VALUE, stroke_width=5).set_points_smoothly(
            [ax.c2p(x, y) for x, y in zip(grid, Y[0])])
        vlab = mt(r"V_{\theta}", "(", "s", ")", size=48)
        vlab[0].set_color(style.VALUE)
        vlab[0][1].set_color(style.THETA)
        vlab.next_to(ax.c2p(1.0, Y[0][-1]), UR, buff=0.1).shift(0.1 * LEFT)
        mode2 = jt("パラメータを持つ関数", size=40, color=WHITE).move_to(UP * 2.9)
        with self.voice("そこで、価値を、{A}パラメータを持つ関数で表します。すると、似た状態には、自然と似た価値が割り当てられ、"
                        "{B}一度も訪れていない状態の価値も、推測できるようになります。") as v:
            # データ点（訪れた状態と、そこで学んだ値）だけを残す
            new_bars = [bars[i].copy().set_fill(style.VALUE) for i in range(len(bars))]
            self.play(*[ReplacementTransform(bars[i], dots[i]) for i in range(len(bars))],
                      FadeOut(VGroup(hl, hl0, qm)), slots.animate.set_fill(opacity=0).set_stroke(opacity=0.0),
                      FadeOut(mode), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("whoosh")
            self.play(Create(curve0), FadeIn(vlab), FadeIn(mode2), run_time=1.6)
            # 似た状態には似た価値
            pa, pb = 0.40, 0.445
            probes = VGroup()
            for xq in (pa, pb):
                yq = float(mlp(snaps[0], np.array([xq]))[0][0])
                probes.add(VGroup(DashedLine(ax.c2p(xq, 0), ax.c2p(xq, yq), color=GREY_B, stroke_width=2.5),
                                  Dot(ax.c2p(xq, yq), radius=0.08, color=WHITE)))
            self.play(LaggedStart(*[FadeIn(pr) for pr in probes], lag_ratio=0.4), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeOut(probes), run_time=0.4)
            xt = ValueTracker(0.66)

            def probe():
                xq = xt.get_value()
                yq = float(mlp(snaps[0], np.array([xq]))[0][0])
                d = DecimalNumber(yq, num_decimal_places=2, font_size=36, color=WHITE)
                d.next_to(ax.c2p(xq, yq), UP, buff=0.2)
                return VGroup(DashedLine(ax.c2p(xq, 0), ax.c2p(xq, yq), color=GREY_B, stroke_width=2.5),
                              Dot(ax.c2p(xq, yq), radius=0.1, color=WHITE), d)

            pr = always_redraw(probe)
            self.add(pr)
            self.sfx("sparkle")
            self.play(xt.animate.set_value(0.8), run_time=1.6)
            self.play(xt.animate.set_value(0.72), run_time=0.8)
        pr.clear_updaters()
        self.play(FadeOut(pr), run_time=0.4)

        kt = ValueTracker(0)

        def curve_at():
            k = kt.get_value()
            i = int(np.floor(k))
            j = min(i + 1, len(Y) - 1)
            u = k - i
            yy = (1 - u) * Y[i] + u * Y[j]
            return VMobject(stroke_color=style.VALUE, stroke_width=5).set_points_smoothly(
                [ax.c2p(x, y) for x, y in zip(grid, yy)])

        def band():
            k = kt.get_value()
            i = int(np.floor(k))
            j = min(i + 1, len(Y) - 1)
            u = k - i
            yy = (1 - u) * Y[i] + u * Y[j]
            pts = [ax.c2p(x, y) for x, y in zip(grid, yy)] + [ax.c2p(x, y) for x, y in zip(grid[::-1], Y[0][::-1])]
            return Polygon(*pts, stroke_width=0, fill_color=style.VALUE, fill_opacity=0.3)

        target = Dot(ax.c2p(xs[iu], yup), radius=0.11, color=style.REWARD)
        up_arrow = Arrow(ax.c2p(xs[iu], ys[iu]), ax.c2p(xs[iu], yup), buff=0.1, color=style.REWARD, stroke_width=5,
                         max_tip_length_to_length_ratio=0.3)
        ghost = DashedVMobject(curve0.copy().set_stroke(GREY_B, 3), num_dashes=80)
        with self.voice("裏を返すと、{A}一つの状態の値を動かすと、そのまわりの値も、一緒に動いてしまいます。"
                        "{B}これが、あとで問題の種になります。覚えておいてください。") as v:
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(GrowArrow(up_arrow), FadeIn(target, scale=0.5), Indicate(dots[iu], color=WHITE),
                      run_time=0.8)
            self.add(ghost)
            live = always_redraw(curve_at)
            fill = always_redraw(band)
            self.remove(curve0)
            self.add(fill, live, dots, target)
            self.sfx("whoosh")
            self.play(kt.animate.set_value(len(Y) - 1), self.focus_on(ax.c2p(xs[iu], 0.55), height=6.0),
                      run_time=2.6, rate_func=smooth)
            nb_arrows = VGroup()
            for j in (iu - 1, iu + 1):
                yj = float(Y[-1][int(round(xs[j] * 200))])
                nb_arrows.add(Arrow(ax.c2p(xs[j], ys[j]), ax.c2p(xs[j], yj), buff=0.05, color=WHITE,
                                    stroke_width=4, max_tip_length_to_length_ratio=0.35))
            self.sfx("hit")
            self.play(LaggedStart(*[GrowArrow(a) for a in nb_arrows], lag_ratio=0.3), run_time=0.8)
            self.wait_to(v, "B")
            live.clear_updaters()
            fill.clear_updaters()
            self.play(fill.animate.set_fill(style.REWARD, 0.45), rate_func=there_and_back, run_time=1.2)
            self.play(self.reset_frame(), run_time=1.0)
        self.play(FadeOut(VGroup(ax, xl, yl, tag, mode2, live, fill, ghost, dots, target, up_arrow, vlab, nb_arrows,
                                 slots)), run_time=0.9)


# ---------------------------------------------------------------------------
# 4. Q ネットワーク
# ---------------------------------------------------------------------------
Q_STATE_PX = 40.0


def q_state():
    s = EP[70].copy()
    s.bx, s.by, s.vx, s.vy, s.px = 58.0, 40.0, 1.2, -2.4, Q_STATE_PX
    return s


QN_Y0 = -0.25


@functools.lru_cache(maxsize=1)
def q_values_demo():
    return tuple(mc_q_values(q_state(), gamma=0.99, horizon=300, n=300, seed=0))


def qnet_final():
    """QNetwork の終わりの状態（次の Loss の冒頭でも同じ物を同じ位置に置いて、切れ目なくつなぐ）。"""
    y0 = QN_Y0
    blocks = VGroup(conv_block(0.26, 3.3, 1.0), conv_block(0.4, 2.6, 0.85), conv_block(0.55, 1.9, 0.7))
    for b, x in zip(blocks, (-3.05, -1.8, -0.6)):
        b.move_to(RIGHT * x + UP * y0)
    fc = tiny_network((7, 7), width=1.0, height=3.2, r=0.12).move_to(RIGHT * 1.1 + UP * y0)
    arrs = VGroup(
        Arrow(np.array([-4.05, y0, 0]), blocks[0].get_left(), buff=0.12, color=GREY_C, stroke_width=4),
        Arrow(blocks[2].get_right() + 0.3 * RIGHT, fc.get_left(), buff=0.1, color=GREY_C, stroke_width=4),
    )
    a_out = Arrow(fc.get_right(), np.array([2.05, -0.05, 0]), buff=0.12, color=GREY_C, stroke_width=4)
    frames = []
    base = q_state()
    for k in range(3, -1, -1):  # 奥の3枚は少し前の時刻（ボールを速度の逆向きに戻した位置）
        st = base.copy()
        st.bx -= base.vx * 3 * k
        st.by -= base.vy * 3 * k
        im = pixel_image(raster(st), 2.1).move_to(LEFT * 5.35 + UP * y0 + k * 0.2 * (UP + RIGHT) + 0.2 * (DOWN + LEFT))
        im.set_z_index(10 - k)
        frames.append(im)
    qs = list(q_values_demo())
    heads = Bars(qs, labels=[action_glyph(a, length=0.7) for a in GAME_ACTIONS], slot=1.45, scale=0.72,
                 colors=[style.VALUE] * 3, label_buff=0.4)
    heads.shift(RIGHT * 4.45 + DOWN * 1.55 - heads.baseline.get_center())
    vals = VGroup(*[DecimalNumber(q, num_decimal_places=2, font_size=40, color=WHITE).next_to(heads.bars[i], UP, buff=0.12)
                    for i, q in enumerate(qs)])
    qlab = mt(r"Q_{\theta}", "(", "s", ",", "a", ")", size=58)
    paint_q(qlab[0])
    qlab.move_to(RIGHT * 4.45 + UP * 2.25)
    return dict(stack=Group(*frames), blocks=blocks, fc=fc, arrs=arrs, a_out=a_out, heads=heads, vals=vals, qlab=qlab,
                qs=qs)


class QNetwork(VoiceScene):
    def construct(self):
        y0 = QN_Y0
        L = qnet_final()
        blocks, fc, arrs, a_out, stack, heads, vals, qlab, qs = (L[k] for k in
                                                                 ("blocks", "fc", "arrs", "a_out", "stack", "heads",
                                                                  "vals", "qlab", "qs"))
        digit = digit_image(2.6).move_to(LEFT * 5.35 + UP * y0)
        probs = [0.02, 0.03, 0.04, 0.05, 0.03, 0.03, 0.02, 0.70, 0.05, 0.03]
        cls = Bars(probs, labels=[mt(str(i), size=32, color=GREY_B) for i in range(10)], slot=0.47, scale=3.3,
                   colors=[GREY_B] * 10, label_buff=0.3)
        cls.shift(RIGHT * 4.45 + DOWN * 1.55 - cls.baseline.get_center())
        soft = VGroup(mt(r"\mathrm{softmax}", size=40, color=GREY_A), jt("＝ クラスの確率", size=32, color=GREY_B))
        soft.arrange(RIGHT, buff=0.2).move_to(RIGHT * 4.45 + UP * 1.75)
        cnn_lab = jt("畳み込み層", size=32, color=GREY_B).next_to(blocks, DOWN, buff=0.4)
        with self.voice("[DQN|ディーキューエヌ]のネットワークは、見た目は、画像分類のモデルとそっくりです。") as v:
            self.sfx("pop")
            self.play(FadeIn(digit), run_time=0.6)
            self.play(GrowArrow(arrs[0]), LaggedStart(*[FadeIn(b, shift=0.1 * RIGHT) for b in blocks], lag_ratio=0.25),
                      FadeIn(cnn_lab), run_time=1.2)
            self.play(GrowArrow(arrs[1]), FadeIn(fc), run_time=0.7)
            self.play(GrowArrow(a_out), FadeIn(cls), FadeIn(soft), run_time=0.9)

        ghost = cls.copy().set_opacity(0.5).scale(0.5).move_to(RIGHT * 5.3 + UP * 2.95)
        ghost_lab = jt("分類なら", size=30, color=GREY_B).next_to(ghost, LEFT, buff=0.3)
        with self.voice("{A}画像を畳み込み層に通して、最後に、{B}行動の数だけ出力を出します。"
                        "{C}分類なら、ここはクラスごとのスコアでした。") as v:
            self.sfx("whoosh")
            self.play(FadeOut(digit), FadeIn(stack, shift=0.2 * RIGHT), run_time=0.8)
            self.play(LaggedStart(*[Indicate(b, color=WHITE, scale_factor=1.06) for b in blocks], lag_ratio=0.3),
                      run_time=1.3)
            self.wait_to(v, "B")
            self.sfx("pop")
            self.play(ReplacementTransform(cls.bars, heads.bars), ReplacementTransform(cls.labels, heads.labels),
                      ReplacementTransform(cls.baseline, heads.baseline), run_time=1.2)
            self.wait_to(v, "C")
            self.play(FadeIn(ghost, shift=0.2 * DOWN), FadeIn(ghost_lab), run_time=0.8)

        cross = cross_mark(0.55).move_to(soft[0])
        ret_lab = jt("リターンの見積もり", size=34, color=GREY_A).next_to(qlab, UP, buff=0.2)
        reg = VGroup(jt("分類", size=44, color=GREY_B), mt(r"\rightarrow", size=48, color=GREY_B),
                     jt("回帰", size=48, color=style.VALUE, weight="MEDIUM")).arrange(RIGHT, buff=0.35)
        reg.move_to(DOWN * 3.2 + RIGHT * 4.45)
        reg_x = cross_mark(0.55).move_to(reg[0])
        with self.voice("ただし、ここに出てくるのは、{A}確率ではなく、{B}それぞれの行動を取ったときの、"
                        "リターンの見積もり、つまり行動価値です。{C}分類ではなく、《回帰》なんです。") as v:
            self.wait_to(v, "A")
            self.sfx("thud")
            self.play(Create(cross), run_time=0.5)
            self.play(FadeOut(VGroup(soft, cross, ghost, ghost_lab)), run_time=0.5)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(LaggedStart(*[FadeIn(d, shift=0.1 * UP) for d in vals], lag_ratio=0.2), Write(qlab), run_time=1.2)
            self.play(FadeIn(ret_lab, shift=0.1 * DOWN), run_time=0.6)
            self.wait_to(v, "C")
            self.play(FadeIn(reg[0]), run_time=0.3)
            self.sfx("hit")
            self.play(Create(reg_x), FadeIn(reg[1:], shift=0.2 * RIGHT), run_time=0.8)

        best = int(np.argmax(qs))
        box = SurroundingRectangle(VGroup(heads.bars[best], vals[best], heads.labels[best]), color=style.REWARD,
                                   buff=0.12, stroke_width=4)
        with self.voice("行動を選ぶときは、{A}一番大きな出力を選ぶだけ。"
                        "{B}一回の計算で、全部の行動の価値が出てくるように作ってあるわけです。") as v:
            self.wait_to(v, "A")
            self.sfx("chime")
            self.play(Create(box), heads.labels[best].animate.scale(1.25), run_time=0.7)
            self.wait_to(v, "B")
            self.play(FadeOut(box), heads.labels[best].animate.scale(1 / 1.25), run_time=0.4)
            sweep = Rectangle(width=0.2, height=4.0, stroke_width=0, fill_color=WHITE, fill_opacity=0.35)
            sweep.move_to(LEFT * 6.3 + UP * y0)
            self.add(sweep)
            self.sfx("whoosh")
            self.play(sweep.animate.move_to(RIGHT * 2.2 + UP * y0), run_time=1.1, rate_func=linear)
            self.remove(sweep)
            self.sfx("sparkle")
            self.play(*[Flash(heads.top_of(i) + UP * 0.35, color=style.VALUE, flash_radius=0.35) for i in range(3)],
                      *[Indicate(d, color=style.VALUE) for d in vals], run_time=0.9)
        # ネットワークは残したまま、次の Loss の冒頭へ切れ目なくつなぐ
        self.play(FadeOut(VGroup(ret_lab, cnn_lab, reg, reg_x)), run_time=0.8)


# ---------------------------------------------------------------------------
# 5. 損失関数
# ---------------------------------------------------------------------------
class Loss(VoiceScene):
    def construct(self):
        L = qnet_final()
        pipeline = Group(L["stack"], L["blocks"], L["fc"], L["arrs"], L["a_out"], L["heads"], L["vals"], L["qlab"])
        self.add(pipeline)   # 前のシーンの終わりと同じ絵から始める
        th = mt(r"\theta", "=", "\\,?", size=64)
        th[0].set_color(style.THETA)
        th.next_to(L["blocks"], DOWN, buff=0.5).shift(RIGHT * 1.0)
        qupd = mt("Q(s,a)", r"\leftarrow", "Q(s,a)", "+", r"\alpha", r"\Big(", "r", "+", r"\gamma", r"\max_{a'}",
                  "Q(s',a')", "-", "Q(s,a)", r"\Big)", size=48)
        for i in (0, 2, 10, 12):
            qupd[i].set_color(style.VALUE)
        paint_max(qupd[9])
        qupd.move_to(UP * 0.9)
        qtag = jt("Q学習の更新式", size=30, color=GREY_B).next_to(qupd, UP, buff=0.5).align_to(qupd, LEFT)
        with self.voice("では、どうやって学習するのか。{A}前回のQ学習の更新式を、思い出してください。") as v:
            self.sfx("pop")
            self.play(Write(th), L["blocks"].animate.set_stroke(style.THETA, 3), L["fc"][1].animate.set_stroke(style.THETA, 3),
                      run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeOut(pipeline, shift=0.4 * DOWN), FadeOut(th, shift=0.4 * DOWN), run_time=0.6)
            self.sfx("hit")
            self.play(Write(qupd), FadeIn(qtag), run_time=1.6)

        b_t = Brace(qupd[6:11], DOWN, color=style.REWARD)
        t_t = jt("目標", size=34, color=style.REWARD).next_to(b_t, DOWN, buff=0.12)
        b_c = Brace(qupd[12], DOWN, color=style.VALUE)
        t_c = jt("今の見積もり", size=34, color=style.VALUE).next_to(b_c, DOWN, buff=0.12)
        yt = dqn_target_tex(size=54).move_to(UP * 0.7)
        lt = loss_tex(size=58).move_to(DOWN * 1.2)
        ybox = SurroundingRectangle(yt, color=style.REWARD, buff=0.15, corner_radius=0.08)
        ylab = jt("ラベル", size=32, color=style.REWARD).next_to(ybox, LEFT, buff=0.3)
        pbox = SurroundingRectangle(lt[5], color=style.VALUE, buff=0.1, corner_radius=0.08)
        plab = jt("予測", size=32, color=style.VALUE).next_to(pbox, DOWN, buff=0.2)
        ltag = jt("DQN の損失", size=30, color=GREY_B).next_to(lt, LEFT, buff=0.5)
        with self.voice("括弧の中は、{A}目標の値と、{B}今の見積もりの差でした。そこで、{C}この目標を「ラベル」とみなして、"
                        "二乗誤差を小さくする回帰問題にします。{D}これが、[DQN|ディーキューエヌ]の損失関数です。") as v:
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(GrowFromCenter(b_t), FadeIn(t_t), run_time=0.6)
            self.wait_to(v, "B")
            self.sfx("pop")
            self.play(GrowFromCenter(b_c), FadeIn(t_c), run_time=0.6)
            self.wait_to(v, "C")
            top = VGroup(qupd, qtag)
            self.play(FadeOut(VGroup(b_c, t_c, b_t, t_t)), top.animate.scale(0.72).to_edge(UP, buff=0.35).set_opacity(0.55),
                      run_time=0.8)
            self.play(TransformFromCopy(qupd[6:11], yt[2:]), FadeIn(yt[:2]), run_time=1.1)
            self.sfx("hit")
            self.play(Create(ybox), FadeIn(ylab), run_time=0.6)
            self.play(Write(lt), run_time=1.0)
            self.play(Create(pbox), FadeIn(plab), run_time=0.6)
            self.wait_to(v, "D")
            self.sfx("sparkle")
            self.play(Circumscribe(lt, color=WHITE), FadeIn(ltag), run_time=1.2)

        sl = mt(r"L(\theta)", "=", r"\big(", "y", "-", r"f_{\theta}(x)", r"\big)^2", size=58)
        paint_theta(sl[0], 2)
        paint_theta(sl[5], 1)
        sl[3].set_color(style.REWARD)
        stag = jt("教師あり学習", size=30, color=GREY_B)
        watcher = Robot(height=0.85).move_to(RIGHT * 6.0 + DOWN * 3.0)
        with self.voice("教師あり学習の、見慣れた形と{A}そっくりですね。{B}ただし、決定的に違うところがあります。") as v:
            self.play(FadeOut(VGroup(qupd, qtag)), FadeIn(watcher, shift=0.2 * UP), run_time=0.5)
            ygrp = VGroup(yt, ybox, ylab)
            self.play(FadeOut(ygrp, shift=0.4 * DOWN), run_time=0.4)
            ygrp.move_to(DOWN * 2.3)
            self.play(VGroup(lt, pbox, plab, ltag).animate.move_to(UP * 0.35 + LEFT * 0.0),
                      FadeIn(ygrp, shift=0.3 * UP), run_time=0.8)
            sl.move_to(UP * 2.3)
            sl.shift((lt[1].get_center()[0] - sl[1].get_center()[0]) * RIGHT)
            stag.next_to(sl, LEFT, buff=0.5).align_to(ltag, RIGHT)
            self.play(FadeIn(sl, shift=0.2 * DOWN), FadeIn(stag), run_time=0.8)
            self.wait_to(v, "A")
            self.play(Indicate(sl[2:5], color=WHITE), Indicate(lt[2:5], color=WHITE), watcher.change("happy"), run_time=1.0)
            self.wait_to(v, "B")
            self.play(watcher.animate.set_mood("normal").look(UL), run_time=0.4)
            fixed = jt("データの中の正解", size=26, color=GREY_B).next_to(sl[3], UP, buff=0.2)
            self.play(FadeIn(fixed, shift=0.1 * DOWN), run_time=0.6)

        inner = SurroundingRectangle(yt[6], color=style.THETA, buff=0.08, stroke_width=4)
        link = CurvedArrow(inner.get_right() + 0.1 * RIGHT, pbox.get_right() + 0.1 * RIGHT + 0.1 * DOWN, angle=1.2,
                           color=style.THETA, stroke_width=4)
        same = VGroup(jt("同じ", size=34, color=style.THETA), mt(r"\theta", size=48, color=style.THETA)).arrange(RIGHT, buff=0.1)
        same.next_to(link, RIGHT, buff=0.1)
        bang = watcher.say("！", direction=UL, size=40)
        with self.voice("{A}ラベルの中に、学習しているネットワーク《自身》が、入っているんです。") as v:
            self.sfx("hit")
            self.play(Create(inner), Indicate(yt[6][1], color=style.THETA, scale_factor=1.6),
                      watcher.animate.set_mood("surprised").look(LEFT), run_time=0.9)
            self.play(FadeIn(bang, scale=0.8), run_time=0.3)
            self.play(Create(link), FadeIn(same), Indicate(lt[5][1], color=style.THETA, scale_factor=1.6), run_time=1.2)

        lock = lock_icon(0.5, GREY_A).next_to(ybox, RIGHT, buff=0.3).shift(0.15 * UP)
        const = jt("定数とみなす", size=30, color=GREY_A).next_to(lock, DOWN, buff=0.15)
        grad = Arrow(pbox.get_top() + UP * 0.95, pbox.get_top() + 0.05 * UP, buff=0, color=RED, stroke_width=6,
                     max_tip_length_to_length_ratio=0.3)
        glab = mt(r"\nabla_{\theta}", size=42, color=RED).next_to(grad, RIGHT, buff=0.12)
        with self.voice("勾配を計算するときは、{A}ラベルの側は、定数とみなします。"
                        "{B}ラベルの側まで微分してしまうと、目標そのものを、予測に近づけてしまうからです。") as v:
            self.play(FadeOut(VGroup(link, same, sl, stag, fixed, bang)), watcher.change("normal"), run_time=0.5)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(lock, scale=0.6), FadeIn(const), inner.animate.set_stroke(GREY_A), run_time=0.8)
            self.play(GrowArrow(grad), FadeIn(glab), run_time=0.7)
            self.wait_to(v, "B")
            # 小さな数直線: ラベル側まで微分すると、目標のほうが予測に寄ってきてしまう
            nl = NumberLine(x_range=[0, 1, 0.25], length=6.0, include_ticks=False, color=GREY_C).move_to(UP * 2.9 + RIGHT * 1.2)
            pd = Dot(nl.n2p(0.1), radius=0.14, color=style.VALUE)
            td = Dot(nl.n2p(0.9), radius=0.14, color=style.REWARD)
            pl = jt("予測", size=32, color=style.VALUE).next_to(pd, DOWN, buff=0.2)
            tl = jt("目標", size=32, color=style.REWARD).next_to(td, UP, buff=0.2)
            pl.add_updater(lambda m: m.next_to(pd, DOWN, buff=0.2))
            tl.add_updater(lambda m: m.next_to(td, UP, buff=0.2))
            cap1 = jt("ラベルまで微分すると", size=30, color=GREY_A).next_to(nl, LEFT, buff=0.4)
            cap2 = jt("ラベルは定数", size=30, color=GREY_A).next_to(nl, LEFT, buff=0.4).align_to(cap1, RIGHT)
            self.play(Create(nl), FadeIn(pd), FadeIn(td), FadeIn(pl), FadeIn(tl), FadeIn(cap1), run_time=0.6)
            self.play(pd.animate.move_to(nl.n2p(0.45)), td.animate.move_to(nl.n2p(0.55)), run_time=1.4)
            bad = cross_mark(0.45).next_to(td, UR, buff=0.05)
            self.sfx("thud")
            self.play(Create(bad), run_time=0.4)
            self.play(td.animate.move_to(nl.n2p(0.9)), pd.animate.move_to(nl.n2p(0.1)), FadeOut(bad),
                      ReplacementTransform(cap1, cap2), run_time=0.6)
            self.play(pd.animate.move_to(nl.n2p(0.9)), Indicate(lock, color=WHITE), run_time=1.2)
            self.sfx("chime")
            self.play(watcher.change("happy"), run_time=0.3)
        pl.clear_updaters()
        tl.clear_updaters()
        self.play(FadeOut(VGroup(lt, pbox, plab, ltag, yt, ybox, ylab, inner, lock, const, grad, glab,
                                 nl, pd, td, pl, tl, cap2, watcher)), run_time=0.9)


# ---------------------------------------------------------------------------
# 6. 動く標的とターゲットネットワーク
# ---------------------------------------------------------------------------
def shadow_of(robot: Robot):
    """ロボットの「影」＝目標。黄色い縁取りの半透明のシルエット。"""
    g = robot.copy()
    g.set_fill("#3A3410", 0.75).set_stroke(style.REWARD, 2.5)
    return g


class MovingTarget(VoiceScene):
    def construct(self):
        # 2状態のトイ問題（s ⇄ s'、報酬1、γ=0.8、学習率 2.3）で実際に更新を繰り返した値
        online = moving_target_run(alpha=2.3, steps=36, v0=(0.0, 0.6))
        frozen = moving_target_run(alpha=2.3, sync=6, steps=54, v0=(0.0, 0.6))
        v_true = moving_target_fixed_point()
        yt = dqn_target_tex(size=46)
        lt = loss_tex(size=46)
        eqs = VGroup(lt, yt).arrange(RIGHT, buff=0.7).scale(0.85).to_corner(UL, buff=0.3)

        ax = Axes(x_range=[0, 54, 6], y_range=[0, 8, 2], x_length=10.4, y_length=3.7, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(RIGHT * 1.0 + DOWN * 1.5)
        y_nums = VGroup(*[mt(str(k), size=28, color=GREY_B).next_to(ax.c2p(0, k), LEFT, buff=0.15) for k in (0, 4, 8)])
        y_lab = jt("価値", size=30, color=GREY_B).next_to(ax.c2p(0, 8), LEFT, buff=0.5)
        x_lab = jt("更新の回数", size=28, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.15).align_to(ax.x_axis, RIGHT)
        true_line = DashedLine(ax.c2p(0, v_true), ax.c2p(54, v_true), color=GREY_C, stroke_width=2.5)
        true_lab = jt("本当の価値", size=28, color=GREY_B).next_to(ax.c2p(0, v_true), LEFT, buff=0.2)

        # 上段: ロボット（予測）が、自分の影（目標）を追いかける。位置 = 価値
        track_y = 1.35
        x0, x1 = ax.c2p(0, 0)[0], ax.c2p(54, 0)[0]

        def track_x(vv):
            return x0 + (x1 - x0) * float(np.clip(vv, -0.3, 8.3)) / 8.0

        track = Line([x0 - 0.3, track_y, 0], [x1 + 0.3, track_y, 0], stroke_color=GREY_D, stroke_width=3)
        flag = VGroup(DashedLine([track_x(v_true), track_y, 0], [track_x(v_true), track_y + 1.05, 0], color=GREY_C,
                                 stroke_width=2))

        kv = ValueTracker(0.0)
        data = {"run": online}

        def val(col, k=None):
            run = data["run"]
            k = kv.get_value() if k is None else k
            i = int(np.floor(k))
            j = min(i + 1, len(run) - 1)
            u = k - i
            if col == 1:  # 目標は更新のたびに切り替わる（あいだは一定）
                return run[min(int(np.floor(k + 1e-6)), len(run) - 1), 1]
            return (1 - u) * run[i, col] + u * run[j, col]

        def pt(col):
            return ax.c2p(kv.get_value(), float(np.clip(val(col), 0, 8)))

        def trace(col, color, width):
            run = data["run"]
            k = kv.get_value()
            n = int(np.floor(k))
            pts = []
            if col == 0:
                pts = [ax.c2p(t, run[t, 0]) for t in range(n + 1)] + [pt(0)]
            else:
                for t in range(n + 1):
                    pts += [ax.c2p(t, run[t, 1]), ax.c2p(min(t + 1, k), run[t, 1])]
            m = VMobject(stroke_color=color, stroke_width=width)
            m.set_points_as_corners(pts if len(pts) > 1 else pts * 2)
            return m

        robot = Robot(height=0.9)
        rh = robot.height
        ghost = shadow_of(robot)

        def follow_robot(m):
            m.move_to([track_x(val(0)), track_y + rh / 2 + 0.02, 0])
            m.look(RIGHT if val(1) >= val(0) else LEFT)

        def follow_ghost(m):
            m.move_to([track_x(val(1)), track_y + rh / 2 + 0.02, 0])

        follow_robot(robot)
        follow_ghost(ghost)
        r_lab = jt("予測", size=28, color=style.VALUE)
        g_lab = jt("目標", size=28, color=style.REWARD)
        r_lab.add_updater(lambda m: m.next_to(robot, DOWN, buff=0.12))
        g_lab.add_updater(lambda m: m.next_to(ghost, UP, buff=0.1))

        pred = always_redraw(lambda: Dot(pt(0), radius=0.12, color=style.VALUE))
        targ = always_redraw(lambda: Circle(0.16, color=style.REWARD, stroke_width=5).move_to(pt(1)))
        ptr = always_redraw(lambda: trace(0, style.VALUE, 4))
        ttr = always_redraw(lambda: trace(1, style.REWARD, 4))

        with self.voice("ラベルが、自分と一緒に動くと、何が起きるでしょうか。") as v:
            self.play(FadeIn(eqs, shift=0.1 * DOWN), Create(track), run_time=0.8)
            self.sfx("pop")
            self.play(FadeIn(robot, shift=0.2 * UP), FadeIn(r_lab), run_time=0.5)
            self.add(ghost, robot)
            self.play(FadeIn(ghost), FadeIn(g_lab), robot.animate.look(RIGHT), run_time=0.6)
            self.play(Create(ax), FadeIn(y_nums), FadeIn(y_lab), FadeIn(x_lab), run_time=0.8)
            self.add(ttr, ptr, pred, targ)
            self.play(Indicate(lt[3], color=style.REWARD, scale_factor=1.4), Indicate(lt[5], color=style.VALUE),
                      run_time=1.0)
        robot.add_updater(follow_robot)
        ghost.add_updater(follow_ghost)

        with self.voice("予測を{A}目標に近づけようと、パラメータを動かすと、{B}同じパラメータを使っている目標も、"
                        "一緒に動いてしまいます。{C}前に話した、汎化のせいです。") as v:
            self.wait_to(v, "A")
            # 予測が動くところと、目標が動くところを順に見せる（実際には同じ1回の更新で両方が変わる）
            data["run"] = np.array([[online[0, 0], online[0, 1], 0], [online[1, 0], online[0, 1], 0]])
            robot.set_mood("determined")
            self.play(kv.animate.set_value(0.999), run_time=1.3)
            self.wait_to(v, "B")
            self.play(Indicate(yt[6][1], color=style.THETA, scale_factor=1.8),
                      Indicate(lt[5][1], color=style.THETA, scale_factor=1.8), run_time=0.9)
            data["run"] = online
            self.sfx("whoosh")
            self.play(kv.animate.set_value(1.0), run_time=0.3)
            robot.set_mood("surprised")
            self.play(Flash(pt(1), color=style.REWARD, flash_radius=0.35), run_time=0.8)
            self.wait_to(v, "C")
            xs, ys, p0, snaps, iu, yup = generalization_fit()
            iax = Axes(x_range=[0, 1, 0.5], y_range=[0, 1.2, 0.5], x_length=3.0, y_length=1.3, tips=False,
                       axis_config=dict(stroke_color=GREY_D, stroke_width=1.5, include_ticks=False))
            iax.move_to(RIGHT * 4.6 + DOWN * 0.3)
            grid = np.linspace(0, 1, 101)
            c0 = iax.plot_line_graph(grid, mlp(snaps[0], grid)[0], add_vertex_dots=False,
                                     line_color=GREY_B, stroke_width=2.5)
            c1 = iax.plot_line_graph(grid, mlp(snaps[-1], grid)[0], add_vertex_dots=False,
                                     line_color=style.VALUE, stroke_width=3.5)
            gtag = jt("汎化", size=30, color=GREY_B).next_to(iax, LEFT, buff=0.2)
            self.play(FadeIn(iax), Create(c0), FadeIn(gtag), run_time=0.6)
            self.play(ReplacementTransform(c0.copy(), c1), run_time=0.9)
        inset = VGroup(iax, c0, c1, gtag)

        drop = robot.sweat()
        with self.voice("まるで、《自分の影》を追いかけるようなもので、{A}学習が振動したり、ときには発散したりします。") as v:
            robot.set_mood("determined")
            self.play(FadeOut(inset), FadeIn(true_line), FadeIn(true_lab), FadeIn(flag), run_time=0.6)
            osc = jt("振動", size=36, color=ORANGE).move_to(ax.c2p(15, 7.2))
            div = jt("発散", size=36, color=RED).move_to(ax.c2p(41.5, 4.6))
            div_arr = VGroup(Arrow(ax.c2p(37.5, 5.2), ax.c2p(37.5, 7.6), buff=0, color=RED, stroke_width=4),
                             Arrow(ax.c2p(37.5, 4.0), ax.c2p(37.5, 1.6), buff=0, color=RED, stroke_width=4))
            self.play(kv.animate.set_value(24), run_time=max(1.5, v.until("A") + 0.4), rate_func=linear)
            robot.set_mood("worried")
            self.play(kv.animate.set_value(36), FadeIn(osc), run_time=1.4, rate_func=linear)
            self.sfx("thud")
            drop = robot.sweat()
            self.play(FadeIn(div), GrowArrow(div_arr[0]), GrowArrow(div_arr[1]), FadeIn(drop, shift=0.1 * DOWN), run_time=0.6)
        for m in (ptr, ttr):
            m.clear_updaters()

        # ターゲットネットワーク
        net_on = VGroup(tiny_network((3, 4, 3), width=1.0, height=0.8, r=0.06),
                        mt(r"Q_{\theta}", size=40)).arrange(RIGHT, buff=0.15)
        paint_q(net_on[1])
        net_on.move_to(RIGHT * 3.4 + UP * 3.25)
        net_tg = VGroup(tiny_network((3, 4, 3), width=1.0, height=0.8, r=0.06, color=GREY_A),
                        mt(r"Q_{\theta^-}", size=40)).arrange(RIGHT, buff=0.15)
        paint_q(net_tg[1], 2)
        net_tg.move_to(RIGHT * 5.75 + UP * 3.25)
        yt2 = dqn_target_tex(size=46, theta=r"\theta^-").scale(0.85).move_to(yt).align_to(yt, LEFT)
        tg_lab = jt("ターゲットネットワーク", size=30, color=WHITE).next_to(net_tg, DOWN, buff=0.12)
        tg_lab.shift((min(6.75, tg_lab.get_right()[0]) - tg_lab.get_right()[0]) * RIGHT)
        with self.voice("そこで[DQN|ディーキューエヌ]は、{A}目標を計算するためだけの、ネットワークのコピーを用意します。"
                        "{B}ターゲットネットワークです。") as v:
            self.play(FadeOut(VGroup(osc, div, div_arr, ptr, ttr, drop)), run_time=0.5)
            data["run"] = frozen
            robot.set_mood("normal")
            self.play(kv.animate.set_value(0), run_time=0.8)
            ptr2 = always_redraw(lambda: trace(0, style.VALUE, 4))
            ttr2 = always_redraw(lambda: trace(1, style.REWARD, 4))
            self.add(ttr2, ptr2, pred, targ)
            self.play(FadeIn(net_on), run_time=0.6)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(TransformFromCopy(net_on, net_tg), run_time=1.0)
            self.play(TransformMatchingShapes(yt, yt2), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeIn(tg_lab, shift=0.1 * UP), Indicate(net_tg[1], color=GREY_A, scale_factor=1.3), run_time=0.8)

        lock = lock_icon(0.34, GREY_A)
        lock.add_updater(lambda m: m.next_to(ghost, RIGHT, buff=0.08))
        per = 6
        with self.voice("コピーのパラメータは、しばらくのあいだ{A}固定しておき、数千ステップごとに、"
                        "{B}最新のパラメータで上書きします。{C}[その間|そのあいだ]は、ラベルが動かないので、"
                        "普通の回帰問題として、落ち着いて学習できるわけです。") as v:
            self.play(FadeOut(tg_lab), run_time=0.4)
            self.wait_to(v, "A")
            self.add(lock)
            self.sfx("hit")
            self.play(FadeIn(lock, scale=0.5), run_time=0.4)
            robot.set_mood("determined")
            t_first = max(1.0, v.until("B") - 0.3)
            self.play(kv.animate.set_value(2.0), run_time=t_first * 0.45, rate_func=linear)
            self.sfx("chime")
            robot.set_mood("happy")
            self.play(robot.hop(), kv.animate(rate_func=linear).set_value(per - 0.001), run_time=t_first * 0.55)
            n_sync = (len(frozen) - 1) // per
            dt = (v.remaining() + 1.0) / max(1, n_sync - 1)
            for k in range(1, n_sync):
                pulse = Arrow(net_on.get_right(), net_tg.get_left(), buff=0.1, color=style.THETA, stroke_width=5)
                kv.set_value(k * per)
                robot.set_mood("determined")
                if k <= 3 or k == n_sync - 1:
                    self.sfx("whoosh")
                self.play(GrowArrow(pulse), Indicate(net_tg[1], color=style.THETA),
                          Flash(pt(1), color=style.REWARD, flash_radius=0.3), run_time=min(0.5, dt * 0.3))
                self.play(FadeOut(pulse), kv.animate(rate_func=linear).set_value(k * per + 2.0), run_time=max(0.3, dt * 0.3))
                robot.set_mood("happy")
                self.play(robot.hop(height=0.2), kv.animate(rate_func=linear).set_value(k * per + per - 0.001),
                          run_time=max(0.35, dt * 0.4))
            self.sfx("chime")
        for m in (lock, robot, ghost, r_lab, g_lab, pred, targ, ptr2, ttr2):
            m.clear_updaters()
        self.play(FadeOut(VGroup(eqs, yt2, ax, y_nums, y_lab, x_lab, true_line, true_lab, pred, targ,
                                 ptr2, ttr2, net_on, net_tg, lock, robot, ghost, r_lab, g_lab, track, flag)), run_time=0.9)


# ---------------------------------------------------------------------------
# 7. 経験リプレイ
# ---------------------------------------------------------------------------
class Replay(VoiceScene):
    def construct(self):
        # 上段: 時間の順に並んだ画面（フィルム）
        first = 60
        n_film = 44
        pitch = 1.08
        film = Group(*[framed_thumb(first + k, 0.95).move_to(RIGHT * (-5.9 + k * pitch) + UP * 2.55) for k in range(n_film)])
        film_bg = Rectangle(width=14.6, height=1.35, stroke_width=0, fill_color="#16161A", fill_opacity=1).move_to(UP * 2.55)
        holes = VGroup(*[RoundedRectangle(width=0.18, height=0.1, corner_radius=0.03, stroke_width=0, fill_color=GREY_E,
                                          fill_opacity=1).move_to(RIGHT * (-7.0 + 0.4 * k) + UP * (2.55 + s * 0.6))
                         for k in range(36) for s in (-1, 1)])
        film_speed = 0.55  # 単位/秒
        # 最初は画面の中央に大きく出し、グラフが出るときに上段へ縮める
        BIG = 1.6
        film_all = Group(film_bg, holes, film)
        film_all.scale(BIG, about_point=film_bg.get_center()).shift(DOWN * 2.05)

        # 下段: 場面（時刻）と価値
        ax = Axes(x_range=[0, 1, 0.1], y_range=[0, 1, 0.25], x_length=11.0, y_length=2.9, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(DOWN * 1.9 + RIGHT * 0.3)
        xl = jt("場面（時刻）", size=28, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.15).align_to(ax.x_axis, RIGHT)
        yl = jt("価値", size=28, color=style.VALUE).next_to(ax.y_axis, UP, buff=0.12)
        grid = np.linspace(0, 1, 201)
        truth = DashedVMobject(ax.plot(lambda x: float(replay_true(x)), x_range=[0, 1, 0.005], color=GREY_B,
                                       stroke_width=3), num_dashes=70)
        t_lab = jt("目標", size=26, color=GREY_B).next_to(ax.c2p(1.0, replay_true(1.0)), RIGHT, buff=0.1)

        with self.voice("もう一つの問題は、{A}データの性質です。") as v:
            self.play(FadeIn(film_bg), FadeIn(holes), FadeIn(film), run_time=0.6)
            self.play(film.animate(rate_func=linear).shift(LEFT * film_speed * BIG * v.until("A")), run_time=v.until("A"))
            self.play(film.animate(rate_func=linear).shift(LEFT * film_speed * BIG * 1.2), Indicate(film_bg, color=GREY_D),
                      run_time=1.2)

        seq = forgetting_run("seq")
        rep = forgetting_run("replay")
        # ミニバッチ = 連続した4コマ
        with self.voice("ゲームを遊びながら集めた経験は、{A}時間の順に並んでいて、隣り合う場面は、ほとんど同じです。"
                        "{B}確率的勾配降下法が前提にしている、独立で同じ分布から来たデータ、とは、ほど遠いんです。") as v:
            self.play(film.animate(rate_func=linear).shift(LEFT * film_speed * BIG * v.until("A")), run_time=v.until("A"))
            # 画面中央付近の4コマを囲む
            xs_now = [f.get_center()[0] for f in film]
            k0 = int(np.argmin([abs(x - (-1.9)) for x in xs_now]))
            four = Group(*film[k0:k0 + 4])
            br = SurroundingRectangle(four, color=style.REWARD, buff=0.1, stroke_width=5)
            mb_lab = jt("ミニバッチ", size=46, color=style.REWARD).next_to(br, DOWN, buff=0.2)
            self.sfx("hit")
            self.play(Create(br), FadeIn(mb_lab), run_time=0.7)
            self.play(LaggedStart(*[pulse(f, WHITE, 1.12) for f in four], lag_ratio=0.25), run_time=1.4)
            c = film_bg.get_center()
            self.play(Group(film_all, br, mb_lab).animate.scale(1 / BIG, about_point=c).shift(UP * (2.55 - c[1])),
                      run_time=0.9)
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), Create(truth), FadeIn(t_lab), run_time=1.0)
            # 全体の分布（薄い点）と、ミニバッチ（連続 = 一か所に固まる）
            allx = np.linspace(0.02, 0.98, 49)
            cloud = VGroup(*[Dot(ax.c2p(x, replay_true(x)), radius=0.05, color=GREY_C) for x in allx])
            self.wait_to(v, "B")
            self.play(LaggedStart(*[FadeIn(d) for d in cloud], lag_ratio=0.02), run_time=1.0)
            bx = np.linspace(0.40, 0.43, 4)
            mdots = VGroup(*[Dot(ax.c2p(x, replay_true(x)), radius=0.1, color=style.REWARD) for x in bx])
            self.play(TransformFromCopy(VGroup(*[f[1] for f in four]), mdots), run_time=1.0)
            iid = VGroup(jt("独立・同じ分布", size=30, color=GREY_A), cross_mark(0.45)).arrange(RIGHT, buff=0.2)
            iid.next_to(ax.c2p(0.43, replay_true(0.43)), UP, buff=0.6)
            self.play(FadeIn(iid[0]), run_time=0.5)
            self.sfx("thud")
            self.play(Create(iid[1]), run_time=0.5)

        # 順番どおりに学習 → 前の場面を忘れる（実際に小さな MLP を学習させた結果）
        kt = ValueTracker(0)
        cur = {"rec": seq}

        def fit_curve():
            # それまでに経験した場面の範囲だけ描く（まだ見ていない先の場面は関係ない）
            rec = cur["rec"]
            i = int(np.clip(round(kt.get_value()), 0, len(rec) - 1))
            x_end = min(1.0, (rec[i][0] + 4) / 399)
            gx = grid[grid <= x_end + 1e-9]
            if len(gx) < 2:
                gx = np.array([0.0, 0.005])
            yy = np.clip(mlp(rec[i][2], gx)[0], -0.05, 1.05)
            return VMobject(stroke_color=style.VALUE, stroke_width=5).set_points_as_corners(
                [ax.c2p(x, y) for x, y in zip(gx, yy)])

        def batch_dots():
            rec = cur["rec"]
            i = int(np.clip(round(kt.get_value()), 0, len(rec) - 1))
            xb = rec[i][1]
            return VGroup(*[Dot(ax.c2p(x, replay_true(x)), radius=0.08, color=style.REWARD) for x in xb])

        with self.voice("そのまま順番に学習すると、{A}今いる場面のことばかり覚えて、前に学んだことを、忘れてしまいます。") as v:
            self.play(FadeOut(VGroup(iid, mdots, br, mb_lab)), cloud.animate.set_opacity(0.35), run_time=0.5)
            fc = always_redraw(fit_curve)
            bd = always_redraw(batch_dots)
            self.add(fc, bd)
            self.play(kt.animate.set_value(len(seq) - 1), film.animate.shift(LEFT * 2.0), run_time=v.until("A") + 2.6,
                      rate_func=linear)
            fc.clear_updaters()
            bd.clear_updaters()
            last = seq[-1][2]
            yy = mlp(last, grid)[0]
            mask = grid < 0.55
            pts = [ax.c2p(x, np.clip(y, -0.05, 1.05)) for x, y in zip(grid[mask], yy[mask])] + \
                  [ax.c2p(x, replay_true(x)) for x in grid[mask][::-1]]
            err = Polygon(*pts, stroke_width=0, fill_color=RED, fill_opacity=0.35)
            forgot = jt("忘れた", size=32, color=RED).next_to(ax.c2p(0.12, 1.0), DOWN, buff=0.0)
            self.sfx("fall")
            self.play(FadeIn(err), FadeIn(forgot), run_time=0.8)

        # リプレイバッファ
        rows, cols, cs, gap = 3, 12, 0.56, 0.07
        buf_center = LEFT * 1.6 + UP * 2.5
        slot_pos = [buf_center + RIGHT * (c - (cols - 1) / 2) * (cs + gap) + DOWN * (r - 1) * (cs + gap)
                    for r in range(rows) for c in range(cols)]
        rng = np.random.default_rng(3)
        card_steps = [int(s) for s in np.linspace(4, 250, rows * cols + 3)]
        cards = [framed_thumb(card_steps[i], cs) for i in range(rows * cols + 3)]
        for i, c in enumerate(cards[:rows * cols]):
            c.move_to(slot_pos[(i % rows) * cols + i // rows])
        half = cs / 2 + 0.1
        buf_frame = SurroundingRectangle(Group(*[Dot(p) for p in slot_pos]), color=GREY_B, buff=half, stroke_width=2.5,
                                         corner_radius=0.12)
        buf_lab = jt("リプレイバッファ", size=30, color=GREY_A).next_to(buf_frame, DOWN, buff=0.12).align_to(buf_frame, RIGHT)
        mb_center = RIGHT * 5.25 + UP * 2.5
        mb_pos = [mb_center + RIGHT * (c - 1.5) * (cs + gap) + DOWN * (r - 0.5) * (cs + gap) for r in range(2) for c in range(4)]
        mb_frame = SurroundingRectangle(Group(*[Dot(p) for p in mb_pos]), color=style.REWARD, buff=half, stroke_width=2.5,
                                        corner_radius=0.12)
        mb_lab2 = jt("ミニバッチ", size=30, color=style.REWARD).next_to(mb_frame, DOWN, buff=0.12)
        with self.voice("そこで、{A}経験を、いったん大きなバッファに貯めておき、"
                        "{B}学習のときは、そこからランダムに取り出してミニバッチを作ります。{C}《経験リプレイ》です。") as v:
            self.play(FadeOut(VGroup(err, forgot)), run_time=0.5)
            self.wait_to(v, "A")
            # フィルムの画面が、そのままバッファの棚に入っていく（列ごとに時間順）
            vis = sorted([f for f in film if -6.9 < f.get_center()[0] < 6.9], key=lambda f: f.get_center()[0])
            n_vis = min(len(vis), rows * cols)
            others = [f for f in film if all(f is not g for g in vis[:n_vis])]
            for i in range(n_vis):
                cards[i] = vis[i]
            self.sfx("whoosh")
            self.play(*[vis[i].animate.scale_to_fit_width(cs + 0.04).move_to(slot_pos[(i % rows) * cols + i // rows])
                        for i in range(n_vis)],
                      FadeOut(Group(film_bg, holes, *others)), Create(buf_frame), FadeIn(buf_lab), run_time=1.2)
            self.play(LaggedStart(*[FadeIn(cards[i], shift=0.2 * LEFT) for i in range(n_vis, rows * cols)], lag_ratio=0.04),
                      run_time=1.0)
            # 新しい経験が入ると、いちばん古い列が押し出される
            old_col = [cards[i] for i in range(rows)]
            newc = cards[rows * cols:]
            for j, c in enumerate(newc):
                c.move_to(slot_pos[j * cols + cols - 1])
            shift_anims = [cards[i].animate.shift(LEFT * (cs + gap)) for i in range(rows, rows * cols)]
            self.sfx("pop")
            self.play(*[FadeOut(c, shift=0.4 * LEFT) for c in old_col], *shift_anims,
                      *[FadeIn(c, shift=0.4 * LEFT) for c in newc], run_time=0.9)
            live = cards[rows:]
            self.wait_to(v, "B")
            pick = sorted(rng.choice(len(live), 8, replace=False))
            glows = VGroup(*[SurroundingRectangle(live[i], color=style.REWARD, buff=0.03, stroke_width=4) for i in pick])
            self.sfx("tick")
            self.sfx("tick", offset=0.4)
            self.play(LaggedStart(*[Create(g) for g in glows], lag_ratio=0.08), run_time=0.8)
            copies = [live[i].copy() for i in pick]
            self.play(Create(mb_frame), FadeIn(mb_lab2), *[c.animate.move_to(p) for c, p in zip(copies, mb_pos)], run_time=1.1)
            self.wait_to(v, "C")
            er = jt("経験リプレイ", size=40, color=WHITE, weight="MEDIUM").move_to(UP * 0.5 + LEFT * 1.6)
            self.sfx("hit")
            self.play(Write(er), run_time=0.8)

        with self.voice("これで、ミニバッチの中の相関が断ち切られ、{A}しかも、同じ経験を何度も使い回せるので、"
                        "データの無駄も減ります。{B}Q学習が、方策オフ型だからこそ使える手です。"
                        "古い方策で集めたデータからでも、学べるからです。") as v:
            cur["rec"] = rep
            kt.set_value(0)
            fc2 = always_redraw(fit_curve)
            bd2 = always_redraw(batch_dots)
            self.remove(fc, bd)
            self.add(fc2, bd2)
            self.play(kt.animate.set_value(len(rep) - 1), run_time=max(2.0, v.until("A") - 0.3), rate_func=linear)
            self.sfx("sparkle")
            fc2.clear_updaters()
            bd2.clear_updaters()
            # 同じ経験を何度も
            j = pick[2]
            cnt = VGroup(mt(r"\times 2", size=32, color=style.REWARD)).next_to(live[j], DOWN, buff=0.05)
            for k, lab in enumerate([r"\times 2", r"\times 3"]):
                c = live[j].copy()
                self.play(pulse(live[j], style.REWARD, 1.25), run_time=0.5)
                self.play(c.animate.move_to(mb_pos[(k + 3) % 8]).set_opacity(1), FadeOut(copies[(k + 3) % 8]), run_time=0.6)
                copies[(k + 3) % 8] = c
            self.wait_to(v, "B")
            old = [live[i] for i in range(0, 9)]
            tint = VGroup(*[SurroundingRectangle(c, color=style.POLICY, buff=0.02, stroke_width=0, fill_color=style.POLICY,
                                                 fill_opacity=0.35) for c in old])
            old_lab = jt("古い方策のデータ", size=30, color=style.POLICY).next_to(buf_frame, DOWN, buff=0.12).align_to(buf_frame, LEFT)
            self.sfx("pop")
            self.play(FadeIn(tint), FadeIn(old_lab), run_time=0.8)
            c = old[4].copy()
            self.play(pulse(old[4], style.POLICY, 1.25), run_time=0.6)
            self.play(c.animate.move_to(mb_pos[6]), FadeOut(copies[6]), run_time=0.8)
            copies[6] = c
        self.play(FadeOut(Group(*live, *copies, glows, tint, old_lab, buf_frame, buf_lab, mb_frame, mb_lab2, ax, xl, yl,
                                truth, t_lab, cloud, fc2, bd2, er)), run_time=0.9)


# ---------------------------------------------------------------------------
# 8. max による過大評価と Double DQN
# ---------------------------------------------------------------------------
class Overestimation(VoiceScene):
    def construct(self):
        q1, q2, mx, dbl = overestimation_samples()
        yt = dqn_target_tex(size=60, theta=r"\theta^-").move_to(UP * 0.4)
        max_box = SurroundingRectangle(yt[5], color=RED, buff=0.1, stroke_width=4)
        with self.voice("[DQN|ディーキューエヌ]には、もう一つ、見落としやすい落とし穴があります。{A}目標の中の、マックスです。") as v:
            self.play(Write(yt), run_time=1.5)
            self.wait_to(v, "A")
            self.play(Create(max_box), Indicate(yt[5], color=RED, scale_factor=1.2), run_time=0.9)
        head = VGroup(yt, max_box)

        # 左: 4つの行動の推定値（本当の価値はすべて 0）
        slot, sc, cx = 1.1, 0.8, -4.1
        glyphs = [arrow_glyph(a, color=style.ACTION, length=0.5) for a in (0, 1, 2, 3)]
        bars = Bars([0, 0, 0, 0], labels=glyphs, slot=slot, scale=sc, colors=[style.VALUE] * 4, label_buff=0.0)
        bars.shift(RIGHT * cx + UP * 0.25 - bars.baseline.get_center())
        for i, g in enumerate(bars.labels):
            g.move_to(bars.x_of(i) + DOWN * 2.45)
        zero = DashedLine(bars.baseline.get_left() + 0.2 * LEFT, bars.baseline.get_right() + 0.2 * RIGHT, color=WHITE,
                          stroke_width=2.5)
        leg_z = VGroup(DashedLine(ORIGIN, RIGHT * 0.6, color=WHITE, stroke_width=2.5),
                       jt("本当の価値 = 0", size=30, color=GREY_A)).arrange(RIGHT, buff=0.15)
        leg_e = VGroup(Square(0.26, stroke_width=0, fill_color=style.VALUE, fill_opacity=0.9),
                       jt("推定値", size=30, color=style.VALUE)).arrange(RIGHT, buff=0.15)
        legend = VGroup(leg_z, leg_e).arrange(RIGHT, buff=0.5).move_to(RIGHT * cx + UP * 2.55)

        # 右: ヒストグラム
        hx = Axes(x_range=[-3, 4, 1], y_range=[0, 0.9, 0.3], x_length=6.0, y_length=3.4, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(RIGHT * 3.75 + DOWN * 0.6)
        hx.y_axis.set_opacity(0)
        tick_labs = VGroup(*[mt(str(k), size=30, color=GREY_B).next_to(hx.c2p(k, 0), DOWN, buff=0.15) for k in (-2, 0, 2, 4)])
        hz = DashedLine(hx.c2p(0, 0), hx.c2p(0, 0.9), color=WHITE, stroke_width=2.5)
        edges = np.arange(-3, 4.001, 0.25)
        bw = edges[1] - edges[0]

        def hist(data, n, color, opacity=0.85):
            d = data[:max(1, int(n))]
            cnt, _ = np.histogram(d, bins=edges)
            dens = cnt / (len(d) * bw)
            g = VGroup()
            for c, e0 in zip(dens, edges[:-1]):
                if c <= 0:
                    continue
                h = hx.c2p(0, min(c, 0.9))[1] - hx.c2p(0, 0)[1]
                r = Rectangle(width=hx.c2p(bw, 0)[0] - hx.c2p(0, 0)[0] - 0.02, height=h, stroke_width=0,
                              fill_color=color, fill_opacity=opacity)
                r.move_to(hx.c2p(e0 + bw / 2, 0), aligned_edge=DOWN)
                g.add(r)
            return g

        # まず身近な例: サイコロ4個の最大値（実際に 2000 回振った結果）
        rolls, dmax = dice_samples()
        dice_pos = [RIGHT * (cx + (i - 1.5) * slot) + UP * 0.9 for i in range(4)]

        def dice_row(vals, hi=None):
            g = VGroup()
            for i, (vv, p) in enumerate(zip(vals, dice_pos)):
                d = dice_face(vv, size=0.9).move_to(p)
                if hi is not None and i == hi:
                    d[0].set_stroke(style.REWARD, 5)
                    d[1].set_color(style.REWARD)
                g.add(d)
            return g

        dx = Axes(x_range=[0.5, 6.5, 1], y_range=[0, 0.6, 0.2], x_length=5.2, y_length=3.2, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(RIGHT * 3.45 + DOWN * 0.55)
        dx.y_axis.set_opacity(0)
        d_ticks = VGroup(*[mt(str(k), size=32, color=GREY_B).next_to(dx.c2p(k, 0), DOWN, buff=0.15) for k in range(1, 7)])

        def dice_hist(data, n, color, opacity, shift=0.0, width=0.36):
            d = data[:max(1, int(n))].ravel()
            cnt = np.bincount(d, minlength=7)[1:] / len(d)
            g = VGroup()
            for k, c in enumerate(cnt, start=1):
                h = dx.c2p(0, min(c, 0.6))[1] - dx.c2p(0, 0)[1]
                if h <= 0.002:
                    continue
                r = Rectangle(width=width, height=h, stroke_width=0, fill_color=color, fill_opacity=opacity)
                r.move_to(dx.c2p(k + shift, 0), aligned_edge=DOWN)
                g.add(r)
            return g

        leg_d = VGroup(VGroup(Square(0.26, stroke_width=0, fill_color=GREY_B, fill_opacity=0.8),
                              jt("サイコロ1つ", size=28, color=GREY_B)).arrange(RIGHT, buff=0.12),
                       VGroup(Square(0.26, stroke_width=0, fill_color=style.REWARD, fill_opacity=0.9),
                              jt("4つの最大値", size=28, color=style.REWARD)).arrange(RIGHT, buff=0.12))
        leg_d.arrange(RIGHT, buff=0.45).next_to(dx, UP, buff=0.55)
        with self.voice("身近な例で、確かめてみましょう。{A}サイコロを4つ振って、一番大きい目だけを、記録していきます。"
                        "{B}サイコロ1つの目の平均は、3.5ですが、{C}4つの最大値の平均は、およそ5.2。"
                        "{D}最大値だけを拾うと、平均より上に偏るんです。") as v:
            self.play(head.animate.scale(0.8).to_edge(UP, buff=0.3), run_time=0.8)
            self.wait_to(v, "A")
            self.sfx("pop")
            dice = dice_row(rolls[0])
            self.play(LaggedStart(*[FadeIn(d, scale=0.6) for d in dice], lag_ratio=0.15),
                      Create(dx.x_axis), FadeIn(d_ticks), FadeIn(leg_d), run_time=0.9)
            n_manual = 6
            per = max(0.45, (v.until("B") - 0.9) / n_manual)
            for k in range(n_manual):
                hi = int(np.argmax(rolls[k]))
                new = dice_row(rolls[k], hi)
                self.play(*[Transform(dice[i], new[i]) for i in range(4)], run_time=per * 0.45)
                self.play(dice[hi].animate(rate_func=there_and_back).scale(1.18), run_time=per * 0.55)
            nd = ValueTracker(n_manual)
            h_single = always_redraw(lambda: dice_hist(rolls, nd.get_value(), GREY_B, 0.75, shift=-0.2))
            h_max = always_redraw(lambda: dice_hist(dmax, nd.get_value(), style.REWARD, 0.9, shift=0.2))
            self.add(h_single, h_max)
            self.sfx("tick")
            self.play(nd.animate.set_value(len(dmax)), run_time=1.6, rate_func=rush_into)
            h_single.clear_updaters()
            h_max.clear_updaters()
            self.wait_to(v, "B")
            m_s, m_m = float(rolls.mean()), float(dmax.mean())
            ls = DashedLine(dx.c2p(m_s, 0), dx.c2p(m_s, 0.6), color=GREY_A, stroke_width=4)
            ls_lab = VGroup(jt("平均", size=30, color=GREY_A),
                            DecimalNumber(m_s, num_decimal_places=2, font_size=38, color=GREY_A)).arrange(RIGHT, buff=0.1)
            ls_lab.next_to(ls.get_top(), UP, buff=0.1).align_to(ls, RIGHT).shift(0.1 * LEFT)
            self.play(Create(ls), FadeIn(ls_lab), run_time=0.7)
            self.wait_to(v, "C")
            lm = DashedLine(dx.c2p(m_m, 0), dx.c2p(m_m, 0.6), color=style.REWARD, stroke_width=4)
            lm_lab = VGroup(jt("平均", size=30, color=style.REWARD),
                            DecimalNumber(m_m, num_decimal_places=2, font_size=38, color=style.REWARD)).arrange(RIGHT, buff=0.1)
            lm_lab.next_to(lm.get_top(), UP, buff=0.1).align_to(lm, LEFT).shift(0.1 * RIGHT)
            if lm_lab.get_right()[0] > 6.75:
                lm_lab.shift((6.75 - lm_lab.get_right()[0]) * RIGHT)
            self.sfx("hit")
            self.play(Create(lm), FadeIn(lm_lab), run_time=0.7)
            self.wait_to(v, "D")
            gap_d = Arrow(dx.c2p(m_s, 0.47), dx.c2p(m_m, 0.47), buff=0, color=style.REWARD, stroke_width=6,
                          max_tip_length_to_length_ratio=0.25)
            self.sfx("sparkle")
            self.play(GrowArrow(gap_d), run_time=0.7)
        dice_hist_group = VGroup(dx.x_axis, d_ticks, leg_d, h_single, h_max, ls, ls_lab, lm, lm_lab, gap_d)

        with self.voice("四つの行動の、本当の価値が、{A}全部0だったとしましょう。でも、推定値には、誤差があります。"
                        "{B}たまたま大きく見積もられた行動が、毎回一つくらいはあります。") as v:
            # 4つのサイコロが、4つの行動に「なる」
            self.play(FadeOut(dice_hist_group, shift=0.3 * DOWN),
                      *[ReplacementTransform(dice[i], bars.labels[i]) for i in range(4)], run_time=1.0)
            self.play(Create(bars.baseline), run_time=0.4)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(Create(zero), FadeIn(leg_z), run_time=0.7)
            self.play(FadeIn(leg_e), bars.animate.set_values(list(q1[100])), run_time=0.7)
            for k in (101, 102, 103):
                self.play(bars.animate.set_values(list(q1[k])), run_time=0.45)
            self.wait_to(v, "B")
            hl = SurroundingRectangle(bars.bars[int(np.argmax(q1[103]))], color=style.REWARD, buff=0.06, stroke_width=4)
            self.sfx("hit")
            self.play(Create(hl), run_time=0.4)
            for k in (104, 105, 106):
                self.play(bars.animate.set_values(list(q1[k])), run_time=0.4)
                self.play(hl.animate.become(SurroundingRectangle(bars.bars[int(np.argmax(q1[k]))], color=style.REWARD,
                                                                 buff=0.06, stroke_width=4)), run_time=0.25)

        chips = VGroup()
        stack_h = {}
        chip_h = 0.16

        def drop(val, color):
            b = int(np.clip((val - edges[0]) // bw, 0, len(edges) - 2))
            n = stack_h.get(b, 0)
            stack_h[b] = n + 1
            ch = Rectangle(width=hx.c2p(bw, 0)[0] - hx.c2p(0, 0)[0] - 0.03, height=chip_h - 0.02, stroke_width=0,
                           fill_color=color, fill_opacity=0.95)
            ch.move_to(hx.c2p(edges[b] + bw / 2, 0) + UP * (n * chip_h + chip_h / 2))
            return ch

        cnt_num = Integer(0, font_size=38, color=WHITE, group_with_commas=False)
        n_counter = VGroup(jt("試行", size=30, color=GREY_B), cnt_num, jt("回", size=30, color=GREY_B))

        def place_counter(g):
            g.arrange(RIGHT, buff=0.12, aligned_edge=DOWN).next_to(hx, UP, buff=0.75).align_to(hx, RIGHT)

        place_counter(n_counter)
        with self.voice("マックスは、{A}その「たまたま大きい」ものを、選んでしまいます。何度も繰り返すと、平均は0ではなく、"
                        "{B}プラスに偏ります。{C}ノイズの最大値は、《上に》偏るんです。") as v:
            self.play(Create(hx), FadeIn(tick_labs), Create(hz), FadeIn(n_counter), run_time=0.8)
            self.wait_to(v, "A")
            n_manual = 8
            per = max(0.45, (v.until("B") - 2.4) / n_manual)
            for k in range(n_manual):
                self.play(bars.animate.set_values(list(q1[k])),
                          hl.animate.become(SurroundingRectangle(bars.bars[int(np.argmax(q1[k]))], color=style.REWARD,
                                                                 buff=0.06, stroke_width=4)), run_time=per * 0.45)
                i = int(np.argmax(q1[k]))
                ch = drop(q1[k, i], style.REWARD)
                src = bars.bars[i].copy().set_fill(style.REWARD)
                cnt_num.set_value(k + 1)
                place_counter(n_counter)
                self.sfx("tick")
                self.play(ReplacementTransform(src, ch), run_time=per * 0.55)
                chips.add(ch)
            nt = ValueTracker(n_manual)
            hmax = always_redraw(lambda: hist(mx, nt.get_value(), style.REWARD))
            cnt_num.add_updater(lambda m: m.set_value(int(nt.get_value())))
            n_counter.add_updater(place_counter)
            self.play(FadeOut(chips), FadeIn(hmax), run_time=0.4)
            self.play(nt.animate.set_value(len(mx)), run_time=2.0, rate_func=rush_into)
            hmax.clear_updaters()
            cnt_num.clear_updaters()
            n_counter.clear_updaters()
            self.wait_to(v, "B")
            m1 = float(mx.mean())
            mline = DashedLine(hx.c2p(m1, 0), hx.c2p(m1, 0.9), color=RED, stroke_width=4)
            mlab = VGroup(jt("平均", size=32, color=RED), DecimalNumber(m1, num_decimal_places=2, include_sign=True,
                                                                     font_size=40, color=RED)).arrange(RIGHT, buff=0.12)
            mlab.next_to(hx.c2p(m1, 0.9), UP, buff=0.1).shift(0.5 * RIGHT)
            self.sfx("hit")
            self.play(Create(mline), FadeIn(mlab), run_time=0.8)
            self.wait_to(v, "C")
            gap = Arrow(hx.c2p(0, 0.75), hx.c2p(m1, 0.75), buff=0, color=RED, stroke_width=5,
                        max_tip_length_to_length_ratio=0.3)
            self.play(GrowArrow(gap), run_time=0.6)

        # ブートストラップで偏りが伝わる（連鎖の各状態で max を取り直した結果をモンテカルロで計算）
        bias = bias_chain()
        xs_n = [-6.1, -4.8, -3.5, -2.2]
        nodes = VGroup(*[Circle(0.42, color=style.STATE, stroke_width=4).move_to(RIGHT * x + UP * 1.75) for x in xs_n])
        term = Square(0.6, color=GREY_B, stroke_width=3).move_to(RIGHT * -0.9 + UP * 1.75)
        links = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.06, color=GREY_B, stroke_width=4)
                         for a, b in zip([*nodes], [*nodes[1:], term])])
        bb = Bars([0, 0, 0, 0], slot=1.3, scale=1.0, colors=[RED] * 4, bar_ratio=0.55)
        bb.shift(RIGHT * (np.mean(xs_n)) + DOWN * 2.3 - bb.baseline.get_center())
        back = CurvedArrow(term.get_top() + 0.15 * UP, nodes[0].get_top() + 0.15 * UP, angle=0.35, color=GREY_B,
                           stroke_width=3.5)
        back_lab = jt("ブートストラップ", size=28, color=GREY_A).next_to(back, UP, buff=0.05)
        blabs = VGroup()
        chain_bias = list(reversed(bias))  # 終端から遠いほど偏りが溜まる
        with self.voice("しかも、この偏った値が、次の目標として使われ、{A}ブートストラップで、ほかの状態にも伝わっていきます。") as v:
            self.play(FadeOut(VGroup(bars, zero, legend, hl)), run_time=0.5)
            self.play(LaggedStart(*[FadeIn(n) for n in nodes], FadeIn(term), lag_ratio=0.15),
                      LaggedStart(*[GrowArrow(a) for a in links], lag_ratio=0.15), Create(bb.baseline), run_time=1.2)
            self.wait_to(v, "A")
            self.sfx("whoosh")
            self.play(Create(back), FadeIn(back_lab), run_time=0.7)
            vals = [0, 0, 0, 0]
            for i in range(3, -1, -1):
                vals[i] = chain_bias[i]
                self.sfx("pop")
                self.play(bb.animate.set_values(list(vals)), Indicate(nodes[i], color=RED), run_time=0.5)
                lab = DecimalNumber(chain_bias[i], num_decimal_places=2, include_sign=True, font_size=36, color=RED)
                lab.next_to(bb.bars[i], UP, buff=0.1)
                self.play(FadeIn(lab), run_time=0.25)
                blabs.add(lab)

        # Double DQN: 選ぶ役（Q_θ）と、値を読む役（Q_θ⁻）を分ける
        sc2, cx2 = 0.45, -4.35
        top = Bars([0, 0, 0, 0], slot=slot, scale=sc2, colors=[style.VALUE] * 4)
        top.shift(RIGHT * cx2 + UP * 1.35 - top.baseline.get_center())
        bot = Bars([0, 0, 0, 0], slot=slot, scale=sc2, colors=[GREY_B] * 4)
        bot.shift(RIGHT * cx2 + DOWN * 1.6 - bot.baseline.get_center())
        g_row = VGroup(*[arrow_glyph(a, length=0.4) for a in (0, 1, 2, 3)])
        for i, g in enumerate(g_row):
            g.move_to((top.x_of(i) + bot.x_of(i)) / 2 + UP * 0.12)
        lab_top = VGroup(mt(r"Q_{\theta}", size=44), jt("で選ぶ", size=30, color=GREY_A)).arrange(DOWN, buff=0.1)
        paint_q(lab_top[0])
        lab_top.next_to(top.baseline, RIGHT, buff=0.35)
        lab_bot = VGroup(mt(r"Q_{\theta^-}", size=44), jt("で値を読む", size=30, color=GREY_A)).arrange(DOWN, buff=0.1)
        paint_q(lab_bot[0], 2)
        lab_bot.next_to(bot.baseline, RIGHT, buff=0.35)
        dd = mt("y", "=", "r", "+", r"\gamma", r"Q_{\theta^-}", r"\big(s',", r"\arg\max_{a'}", r"Q_{\theta}(s',a')", r"\big)",
                size=50)
        dd[0].set_color(style.REWARD)
        paint_q(dd[5], 2)
        dd[7][6:].set_color(style.ACTION)
        paint_q(dd[8])
        dd.to_edge(UP, buff=0.3)
        dd_lab = jt("ダブルDQN", size=36, color=style.VALUE, weight="MEDIUM")
        with self.voice("対策は、意外なほど簡単です。{A}どの行動を選ぶかは、学習中のネットワークで決めて、"
                        "{B}その行動の値は、ターゲットネットワークで読む。選ぶ役と、評価する役を分けると、"
                        "誤差が同じ方向にそろわなくなり、{C}偏りが消えます。{D}これを、ダブル[DQN|ディーキューエヌ]と呼びます。") as v:
            self.play(FadeOut(VGroup(nodes, term, links, bb, blabs, back, back_lab)), hmax.animate.set_fill(opacity=0.3),
                      mline.animate.set_stroke(opacity=0.5), mlab.animate.set_opacity(0.5), FadeOut(gap), run_time=0.7)
            cnt_num.set_value(0)
            place_counter(n_counter)
            self.play(Create(top.baseline), Create(bot.baseline), FadeIn(g_row), FadeIn(lab_top), FadeIn(lab_bot),
                      run_time=0.8)
            chips2 = VGroup()
            stack_h.clear()
            self.wait_to(v, "A")
            k = 0
            self.play(top.animate.set_values(list(q1[k])), bot.animate.set_values(list(q2[k])), run_time=0.5)
            i = int(np.argmax(q1[k]))
            gbox = SurroundingRectangle(top.bars[i], color=style.ACTION, buff=0.06, stroke_width=4)
            self.sfx("hit")
            self.play(Create(gbox), Indicate(lab_top, color=style.ACTION, scale_factor=1.05), run_time=0.6)
            self.wait_to(v, "B")
            ybox2 = SurroundingRectangle(bot.bars[i], color=style.REWARD, buff=0.06, stroke_width=4)
            self.sfx("hit")
            self.play(Create(ybox2), Indicate(lab_bot, color=style.REWARD, scale_factor=1.05), run_time=0.6)
            ch = drop(q2[k, i], style.VALUE)
            cnt_num.set_value(1)
            place_counter(n_counter)
            self.play(ReplacementTransform(bot.bars[i].copy().set_fill(style.VALUE), ch), run_time=0.6)
            chips2.add(ch)
            n_more = 5
            per = max(0.5, (v.until("C") - 3.0) / n_more)
            for k in range(1, 1 + n_more):
                i = int(np.argmax(q1[k]))
                self.play(top.animate.set_values(list(q1[k])), bot.animate.set_values(list(q2[k])), run_time=per * 0.3)
                self.play(gbox.animate.become(SurroundingRectangle(top.bars[i], color=style.ACTION, buff=0.06, stroke_width=4)),
                          ybox2.animate.become(SurroundingRectangle(bot.bars[i], color=style.REWARD, buff=0.06, stroke_width=4)),
                          run_time=per * 0.3)
                ch = drop(q2[k, i], style.VALUE)
                cnt_num.set_value(k + 1)
                place_counter(n_counter)
                self.play(ReplacementTransform(bot.bars[i].copy().set_fill(style.VALUE), ch), run_time=per * 0.4)
                chips2.add(ch)
            nt2 = ValueTracker(n_more + 1)
            hdbl = always_redraw(lambda: hist(dbl, nt2.get_value(), style.VALUE, 0.85))
            cnt_num.add_updater(lambda m: m.set_value(int(nt2.get_value())))
            n_counter.add_updater(place_counter)
            self.play(FadeOut(chips2), FadeIn(hdbl), run_time=0.4)
            self.play(nt2.animate.set_value(len(dbl)), run_time=1.8, rate_func=rush_into)
            hdbl.clear_updaters()
            cnt_num.clear_updaters()
            n_counter.clear_updaters()
            self.wait_to(v, "C")
            m2 = float(dbl.mean())
            mline2 = DashedLine(hx.c2p(m2, 0), hx.c2p(m2, 0.9), color=style.VALUE, stroke_width=4)
            mlab2 = VGroup(jt("平均", size=32, color=style.VALUE),
                           DecimalNumber(m2, num_decimal_places=2, include_sign=True, font_size=40, color=style.VALUE))
            mlab2.arrange(RIGHT, buff=0.12).next_to(hx.c2p(m2, 0.9), UP, buff=0.1).shift(1.0 * LEFT)
            self.sfx("sparkle")
            self.play(Create(mline2), FadeIn(mlab2), run_time=0.8)
            self.wait_to(v, "D")
            dd_lab.next_to(dd, DOWN, buff=0.2)
            self.sfx("hit")
            self.play(FadeOut(head), FadeIn(dd, shift=0.1 * DOWN), run_time=0.9)
            self.play(FadeIn(dd_lab), run_time=0.5)
        self.play(FadeOut(Group(top, bot, g_row, lab_top, lab_bot, gbox, ybox2, hx, tick_labs, hz, hmax, hdbl,
                                mline, mlab, mline2, mlab2, n_counter, dd, dd_lab)), run_time=0.9)


# ---------------------------------------------------------------------------
# 9. 全体の流れ
# ---------------------------------------------------------------------------
class Algorithm(VoiceScene):
    def construct(self):
        t_env = 150
        gv = GameView(EP[t_env], width=2.3).move_to(LEFT * 5.3 + UP * 1.75)
        env_lab = jt("環境", size=32, color=GREY_B).next_to(gv, DOWN, buff=0.15)
        robot = Robot(height=1.0).move_to(LEFT * 1.9 + UP * 1.75)
        eg = jt("ε-greedy", size=32, color=style.ACTION).next_to(robot, UP, buff=0.25)
        a_act = CurvedArrow(robot.get_left() + 0.15 * LEFT + 0.25 * UP, gv.get_right() + 0.1 * RIGHT + 0.5 * UP,
                            angle=0.5, color=style.ACTION, stroke_width=4)
        a_obs = CurvedArrow(gv.get_right() + 0.1 * RIGHT + 0.5 * DOWN, robot.get_left() + 0.15 * LEFT + 0.25 * DOWN,
                            angle=0.5, color=style.STATE, stroke_width=4)
        cs = 0.46
        buf_c = LEFT * 1.9 + DOWN * 1.45
        buf_pos = [buf_c + RIGHT * (c - 2.5) * (cs + 0.06) + DOWN * (r - 0.5) * (cs + 0.06) for r in range(2) for c in range(6)]
        steps = [int(s) for s in np.linspace(10, 240, 13)]
        buf_cards = [framed_thumb(steps[i], cs) for i in range(12)]
        for c, p in zip(buf_cards, buf_pos):
            c.move_to(p)
        buf_frame = SurroundingRectangle(Group(*buf_cards), color=GREY_B, buff=0.15, corner_radius=0.1, stroke_width=2.5)
        buf_lab = jt("リプレイバッファ", size=30, color=GREY_B).next_to(buf_frame, DOWN, buff=0.15)
        mb_c = RIGHT * 1.05 + DOWN * 1.45
        mb_frame = RoundedRectangle(width=1.5, height=1.2, corner_radius=0.1, stroke_color=style.REWARD, stroke_width=2.5).move_to(mb_c)
        mb_lab = jt("ミニバッチ", size=30, color=style.REWARD).next_to(mb_frame, DOWN, buff=0.15)
        on = node_box(r"Q_{\theta}", w=1.9, h=1.0)
        paint_q(on[1])
        on.move_to(RIGHT * 3.7 + UP * 0.35)
        tg = node_box(r"Q_{\theta^-}", w=1.9, h=1.0)
        paint_q(tg[1], 2)
        tg.move_to(RIGHT * 3.7 + DOWN * 2.6)
        loss = node_box(r"L(\theta)", w=1.6, h=1.0)
        paint_theta(loss[1], 2)
        loss.move_to(RIGHT * 5.9 + DOWN * 1.1)
        a_store = Arrow(robot.get_bottom() + 0.25 * DOWN, buf_frame.get_top(), buff=0.1, color=GREY_B, stroke_width=4)
        sars = mt("(s,a,r,s')", size=38, color=GREY_A).next_to(a_store, RIGHT, buff=0.15)
        a_rand = Arrow(buf_frame.get_right(), mb_frame.get_left(), buff=0.1, color=GREY_B, stroke_width=4)
        a_on = Arrow(mb_frame.get_right(), on.get_left(), buff=0.12, color=GREY_B, stroke_width=4)
        a_tg = Arrow(mb_frame.get_right(), tg.get_left(), buff=0.12, color=GREY_B, stroke_width=4)
        a_l1 = Arrow(on.get_right(), loss.get_top(), buff=0.1, color=style.VALUE, stroke_width=4)
        a_l2 = Arrow(tg.get_right(), loss.get_bottom(), buff=0.1, color=style.REWARD, stroke_width=4)
        y_lab = mt("y", size=44, color=style.REWARD).next_to(a_l2, RIGHT, buff=0.05).shift(0.2 * DOWN)
        a_upd = CurvedArrow(loss.get_top() + 0.1 * UP + 0.3 * RIGHT, on.get_top() + 0.1 * UP, angle=0.9, color=RED,
                            stroke_width=5)
        upd_lab = mt(r"\nabla_{\theta}", size=40, color=RED).next_to(a_upd, UP, buff=0.05)
        a_copy = dashed_arrow(on.get_bottom() + 0.1 * DOWN, tg.get_top() + 0.1 * UP, color=style.THETA, width=4)
        copy_lab = mt(r"\theta^- \leftarrow \theta", size=40, color=style.THETA).next_to(a_copy, LEFT, buff=0.12)
        a_pol = dashed_arrow(on.get_left() + 0.2 * UP + 0.1 * LEFT, robot.get_right() + 0.2 * RIGHT, color=GREY_C, width=3)

        parts = [gv, env_lab, robot, eg, a_act, a_obs, *buf_cards, buf_frame, buf_lab, mb_frame, mb_lab, on, tg, loss,
                 a_store, sars, a_rand, a_on, a_tg, a_l1, a_l2, y_lab, a_upd, upd_lab, a_copy, copy_lab, a_pol]
        with self.voice("ここまでの部品を、組み立ててみましょう。") as v:
            self.sfx("whoosh")
            self.play(LaggedStart(*[FadeIn(m) for m in parts], lag_ratio=0.03), run_time=2.0)
        tk = ValueTracker(t_env)

        def frame_for(*mobs):
            return SurroundingRectangle(Group(*mobs), color=style.REWARD, buff=0.15, corner_radius=0.12, stroke_width=4)

        with self.voice("{A}ロボットは、[イプシロン・グリーディ|イプシロングリーディ]で行動し、{B}経験をリプレイバッファに貯めます。"
                        "{C}そこからランダムにミニバッチを取り出し、{D}ターゲットネットワークで目標を計算して、"
                        "{E}二乗誤差を小さくするように、ネットワークを更新する。"
                        "{F}そして、ときどき、ターゲットネットワークに重みをコピーする。") as v:
            hl = frame_for(gv, robot, eg)
            self.play(Create(hl), robot.change("determined"), run_time=0.4)
            gv.add_updater(lambda m: m.update_state(interp_state(EP, tk.get_value())))
            self.play(ShowPassingFlash(a_act.copy().set_stroke(WHITE, 7), time_width=0.5),
                      tk.animate(rate_func=linear).set_value(t_env + 25), robot.animate.look(LEFT), run_time=1.2)
            self.play(ShowPassingFlash(a_obs.copy().set_stroke(WHITE, 7), time_width=0.5),
                      tk.animate(rate_func=linear).set_value(t_env + 45), run_time=1.0)
            self.wait_to(v, "B")
            self.sfx("tick")
            self.play(hl.animate.become(frame_for(buf_frame, buf_lab, a_store, sars)), run_time=0.5)
            newc = framed_thumb(int(tk.get_value()), cs).move_to(robot)
            self.play(newc.animate.move_to(buf_pos[-1]), FadeOut(buf_cards[-1]), run_time=0.9)
            buf_cards[-1] = newc
            self.wait_to(v, "C")
            self.sfx("tick")
            self.play(hl.animate.become(frame_for(buf_frame, mb_frame, mb_lab)), run_time=0.5)
            pk = [1, 4, 8, 10]
            outs = [buf_cards[i].copy() for i in pk]
            self.play(*[pulse(buf_cards[i], style.REWARD, 1.2) for i in pk], run_time=0.6)
            self.play(*[c.animate.scale(0.8).move_to(mb_c + RIGHT * (j % 2 - 0.5) * 0.5 + DOWN * (j // 2 - 0.5) * 0.5)
                        for j, c in enumerate(outs)], run_time=0.9)
            self.wait_to(v, "D")
            self.sfx("tick")
            self.play(hl.animate.become(frame_for(tg, y_lab)), run_time=0.5)
            self.play(Indicate(tg[1], color=style.REWARD, scale_factor=1.3), tg[0].animate(rate_func=there_and_back).set_stroke(style.REWARD, 5),
                      ShowPassingFlash(a_l2.copy().set_stroke(WHITE, 7)), run_time=1.0)
            self.wait_to(v, "E")
            self.sfx("tick")
            self.play(hl.animate.become(frame_for(on, loss, a_upd, upd_lab)), run_time=0.5)
            self.play(Indicate(loss[1], color=WHITE, scale_factor=1.3), loss[0].animate(rate_func=there_and_back).set_stroke(WHITE, 5),
                      run_time=0.7)
            self.play(ShowPassingFlash(a_upd.copy().set_stroke(RED, 9), time_width=0.6),
                      Indicate(on[1][0][1], color=style.THETA, scale_factor=1.8), run_time=1.1)
            self.wait_to(v, "F")
            self.sfx("tick")
            self.play(hl.animate.become(frame_for(a_copy, copy_lab, tg[1])), run_time=0.5)
            self.play(ShowPassingFlash(Line(a_copy.get_top(), a_copy.get_bottom()).set_stroke(style.THETA, 9), time_width=0.6),
                      Indicate(tg[1][0][1], color=style.THETA, scale_factor=1.8), run_time=1.1)
            self.play(FadeOut(hl), robot.change("happy"), run_time=0.5)
        gv.clear_updaters()

        # 49 のゲーム（抽象的なタイル）
        rng = np.random.default_rng(11)
        pal = ["#E07A8F", "#E8A06A", "#E6D27A", "#8BCB86", "#6FB6D9", "#9C8FE0", "#D9D9E0"]
        tiles = VGroup()
        for k in range(49):
            t = VGroup(Square(0.72, stroke_color=GREY_D, stroke_width=1.5, fill_color="#050507", fill_opacity=1))
            kind = k % 4
            for _ in range(rng.integers(2, 5)):
                col = pal[rng.integers(len(pal))]
                w, h = rng.uniform(0.08, 0.3), rng.uniform(0.05, 0.22)
                shape = (Rectangle(width=w, height=h) if kind != 1 else Circle(radius=h / 1.4))
                shape.set_stroke(width=0).set_fill(col, 1)
                shape.move_to(t[0].get_center() + np.array([rng.uniform(-0.22, 0.22), rng.uniform(-0.22, 0.22), 0]))
                t.add(shape)
            tiles.add(t)
        tiles.arrange_in_grid(7, 7, buff=0.08).scale(0.92).move_to(RIGHT * 3.75 + DOWN * 0.05)
        n49 = jt("49種類のゲーム", size=36, color=WHITE).next_to(tiles, UP, buff=0.25)
        human = VGroup(Circle(0.17, color=GREY_A, fill_opacity=1, fill_color=GREY_A),
                       RoundedRectangle(width=0.46, height=0.5, corner_radius=0.18, color=GREY_A, fill_opacity=1,
                                        fill_color=GREY_A)).arrange(DOWN, buff=0.05)
        with self.voice("2015年に発表された[DQN|ディーキューエヌ]は、この仕組みで、{A}49種類のゲームを、"
                        "同じネットワーク構造、同じ設定のまま、画面の画素だけから学習し、"
                        "{B}その多くで、人間のプロのテスターに匹敵するスコアを出しました。") as v:
            on_screen = [m for m in [*parts, *buf_cards, *outs] if m in self.mobjects]
            diagram = Group(*dict.fromkeys(on_screen))
            self.play(diagram.animate.scale(0.45).move_to(LEFT * 3.75 + UP * 0.2), run_time=1.2)
            dqn_lab = jt("DQN", size=44, color=WHITE, weight="BOLD").next_to(diagram, DOWN, buff=0.3)
            same = jt("同じネットワーク・同じ設定", size=30, color=GREY_B).next_to(diagram, UP, buff=0.35)
            self.play(FadeIn(dqn_lab), run_time=0.6)
            self.wait_to(v, "A")
            arr = Arrow(diagram.get_right() + 0.05 * RIGHT, tiles.get_left() + 0.05 * LEFT, buff=0.08, color=GREY_B,
                        stroke_width=5)
            self.sfx("sparkle")
            self.play(LaggedStart(*[FadeIn(t, scale=0.6) for t in tiles], lag_ratio=0.02), FadeIn(n49), GrowArrow(arr),
                      run_time=1.8)
            self.play(FadeIn(same, shift=0.1 * DOWN), run_time=0.8)
            self.wait_to(v, "B")
            rob = Robot(height=0.62)
            vs = VGroup(rob, mt(r"\approx", size=48, color=GREY_A), human).arrange(RIGHT, buff=0.3)
            pro = jt("人間のプロ", size=30, color=GREY_A)
            row = VGroup(vs, pro).arrange(RIGHT, buff=0.2).next_to(tiles, DOWN, buff=0.18)
            self.sfx("chime")
            self.play(FadeIn(row), run_time=0.8)
            self.play(LaggedStart(*[t.animate(rate_func=there_and_back).scale(1.18) for t in tiles], lag_ratio=0.02),
                      Circumscribe(tiles, color=style.REWARD, buff=0.1), run_time=2.0)
        self.play(FadeOut(Group(diagram, dqn_lab, same, tiles, n49, arr, row)), run_time=0.9)


# ---------------------------------------------------------------------------
# 10. 死の三つ組
# ---------------------------------------------------------------------------
class DeadlyTriad(VoiceScene):
    def construct(self):
        s1 = Circle(1.0, color=style.STATE, stroke_width=5).move_to(LEFT * 4.5 + UP * 1.75)
        s2 = Circle(1.0, color=style.STATE, stroke_width=5).move_to(LEFT * 0.6 + UP * 1.75)
        robot = Robot(height=0.95).move_to(RIGHT * 5.95 + DOWN * 0.35)
        with self.voice("最後に、少し怖い話をしておきます。") as v:
            self.sfx("pop")
            self.play(FadeIn(robot, shift=0.3 * LEFT), run_time=0.6)
            self.play(Create(s1), Create(s2), robot.change("worried"), run_time=1.2)
            self.play(robot.animate.look(LEFT + 0.4 * UP), run_time=0.4)

        v1 = mt(r"\theta", size=66, color=style.THETA).move_to(s1)
        v2 = mt("2", r"\theta", size=66).move_to(s2)
        v2[1].set_color(style.THETA)
        arr = Arrow(s1.get_right(), s2.get_left(), buff=0.12, color=GREY_B, stroke_width=6)
        r0 = mt("r=0", size=44, color=style.REWARD).next_to(arr, UP, buff=0.12)
        shared = mt(r"\theta", size=56, color=style.THETA).move_to((s1.get_center() + s2.get_center()) / 2 + DOWN * 1.9)
        sh_box = SurroundingRectangle(shared, color=style.THETA, buff=0.18, corner_radius=0.1, stroke_width=3)
        sh_lines = VGroup(Line(sh_box.get_left(), s1.get_bottom() + 0.1 * DOWN, color=style.THETA, stroke_width=3),
                          Line(sh_box.get_right(), s2.get_bottom() + 0.1 * DOWN, color=style.THETA, stroke_width=3))
        with self.voice("ここに、{A}たった二つの状態があるとします。左の価値はシータ、{B}右の価値は、その2倍。"
                        "{C}一つのパラメータを共有しています。{D}左から右へは、報酬0で移ります。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(s1, color=style.STATE), Indicate(s2, color=style.STATE), run_time=0.9)
            self.play(Write(v1), run_time=0.6)
            self.wait_to(v, "B")
            self.play(Write(v2), run_time=0.7)
            self.wait_to(v, "C")
            self.play(FadeIn(shared), Create(sh_box), Create(sh_lines), run_time=0.9)
            self.wait_to(v, "D")
            self.play(GrowArrow(arr), FadeIn(r0), robot.change("normal"), run_time=0.8)

        e1 = mt("y", "=", r"\gamma", r"\cdot", "2", r"\theta", "=", "2", r"\gamma", r"\theta", size=56)
        e1[0].set_color(style.REWARD)
        for i in (2, 8):
            e1[i].set_color(style.GAMMA)
        for i in (5, 9):
            e1[i].set_color(style.THETA)
        e1.move_to(RIGHT * 4.0 + UP * 2.45)
        e2 = mt("2", r"\gamma", r"\theta", ">", r"\theta", r"\iff", r"\gamma", ">", "0.5", size=54)
        for i in (1, 6):
            e2[i].set_color(style.GAMMA)
        for i in (2, 4):
            e2[i].set_color(style.THETA)
        e2.move_to(RIGHT * 4.0 + UP * 1.1)
        tdarc = CurvedArrow(s1.get_top() + 0.1 * UP + 0.5 * LEFT, s1.get_top() + 0.1 * UP + 0.5 * RIGHT, angle=-2.4,
                            color=style.REWARD, stroke_width=5)
        with self.voice("左の状態で、TD学習をしてみます。目標は、ガンマ倍の、右の価値、つまり{A}2ガンマ・シータ。"
                        "今の値はシータなので、ガンマが0.5より大きいと、シータは、{B}大きくなる方向へ動きます。") as v:
            self.play(Create(tdarc), Indicate(s1, color=style.REWARD), run_time=1.0)
            self.play(FadeIn(e1[:6], shift=0.1 * DOWN), Indicate(v2, color=style.REWARD), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(e1[6:], shift=0.1 * LEFT), run_time=0.8)
            self.play(FadeIn(e2[:5]), run_time=0.8)
            self.play(FadeIn(e2[5:]), run_time=0.8)
            self.wait_to(v, "B")
            up = Arrow(sh_box.get_right() + 0.3 * RIGHT + 0.35 * DOWN, sh_box.get_right() + 0.3 * RIGHT + 0.55 * UP,
                       buff=0, color=style.THETA, stroke_width=7, max_tip_length_to_length_ratio=0.35)
            self.sfx("pop")
            self.play(GrowArrow(up), robot.animate.look(LEFT + 0.2 * DOWN), run_time=0.6)

        # θ の推移（実際に更新を繰り返した値）
        th = triad_run()
        ax = Axes(x_range=[0, 40, 10], y_range=[0, 24, 8], x_length=10.5, y_length=2.1, tips=False,
                  axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(DOWN * 2.55 + RIGHT * 0.6)
        yl = mt(r"\theta", size=44, color=style.THETA).next_to(ax.y_axis, LEFT, buff=0.5).shift(0.3 * UP)
        xl = jt("更新の回数", size=28, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.15).align_to(ax.x_axis, RIGHT)
        tick = VGroup(*[mt(str(k), size=28, color=GREY_B).next_to(ax.c2p(0, k), LEFT, buff=0.15) for k in (0, 20)])
        s2_self = CurvedArrow(s2.get_top() + 0.1 * UP + 0.5 * LEFT, s2.get_top() + 0.1 * UP + 0.5 * RIGHT, angle=-2.4,
                              color=GREY_C, stroke_width=4)
        s2_self = DashedVMobject(s2_self, num_dashes=12)
        no_data = cross_mark(0.5).move_to(s2.get_top() + 0.8 * UP)
        nd_lab = jt("データが来ない", size=30, color=RED).next_to(no_data, RIGHT, buff=0.15)
        kt = ValueTracker(0)

        def th_curve():
            n = int(np.floor(kt.get_value()))
            pts = [ax.c2p(t, min(th[t], 24)) for t in range(0, n + 1)]
            if len(pts) < 2:
                pts = pts * 2
            return VMobject(stroke_color=RED, stroke_width=5).set_points_as_corners(pts)

        with self.voice("でも、シータが大きくなると、{A}右の価値も大きくなり、目標も、もっと大きくなる。"
                        "{B}本来なら、右の状態でも学習して、つじつまが合うはずですが、右のデータが来なければ、"
                        "{C}シータは、どこまでも大きくなってしまいます。") as v:
            self.play(FadeOut(up), run_time=0.3)
            self.wait_to(v, "A")
            self.play(Indicate(v2, color=style.THETA, scale_factor=1.4), s2.animate.set_fill(style.STATE, 0.35),
                      robot.change("worried"), run_time=0.8)
            self.play(Indicate(e1[:6], color=style.REWARD), run_time=0.8)
            self.wait_to(v, "B")
            self.play(Create(s2_self), run_time=0.8)
            self.play(Create(no_data), FadeIn(nd_lab), s2_self.animate.set_opacity(0.3), run_time=0.8)
            self.play(Create(ax), FadeIn(yl), FadeIn(xl), FadeIn(tick), run_time=0.8)
            curve = always_redraw(th_curve)
            self.add(curve)
            self.wait_to(v, "C")
            t_run = max(2.2, v.remaining() - 0.2)
            self.play(kt.animate.set_value(26), s1.animate.set_fill(RED, 0.2), s2.animate.set_fill(RED, 0.3),
                      run_time=t_run * 0.55, rate_func=linear)
            drop = robot.sweat()
            self.sfx("thud")
            self.play(kt.animate.set_value(40), s1.animate.set_fill(RED, 0.35), s2.animate.set_fill(RED, 0.5),
                      FadeIn(drop, shift=0.15 * DOWN), robot.animate.look(DOWN + LEFT), run_time=t_run * 0.45,
                      rate_func=linear)
            curve.clear_updaters()
            self.play(robot.shake(), drop.animate.shift(0.12 * DOWN), run_time=0.5)
            val = VGroup(mt(r"\theta \approx", size=40, color=RED), DecimalNumber(th[40], num_decimal_places=1, font_size=40, color=RED))
            val.arrange(RIGHT, buff=0.12).next_to(ax.c2p(40, min(th[40], 24)), LEFT, buff=0.25).shift(0.1 * DOWN)
            self.play(FadeIn(val), run_time=0.5)

        # 三つ組
        R = 1.9
        c_fa = Circle(R, color=BLUE_C, stroke_width=5).move_to(LEFT * 2.35 + UP * 0.5)
        c_bs = Circle(R, color=ORANGE, stroke_width=5).move_to(RIGHT * -0.05 + UP * 0.5)
        c_op = Circle(R, color=style.POLICY, stroke_width=5).move_to(LEFT * 1.2 + DOWN * 1.45)
        l_fa = jt("関数近似", size=38, color=BLUE_C).next_to(c_fa, LEFT, buff=0.15).shift(0.9 * UP)
        l_bs = jt("ブートストラップ", size=38, color=ORANGE).next_to(c_bs, RIGHT, buff=0.15).shift(0.9 * UP)
        l_op = jt("方策オフ", size=38, color=style.POLICY).next_to(c_op, DOWN, buff=0.1)
        center = Intersection(Intersection(c_fa, c_bs), c_op, stroke_width=0, fill_color=RED, fill_opacity=0.85)
        danger = jt("発散しうる", size=36, color=RED, weight="MEDIUM").move_to(LEFT * 5.1 + DOWN * 2.3)
        d_arrow = Arrow(danger.get_top() + 0.05 * UP, center.get_center() + 0.1 * LEFT, buff=0.12, color=RED,
                        stroke_width=5)
        title = jt("死の三つ組", size=54, color=RED, weight="MEDIUM").move_to(LEFT * 1.2 + UP * 3.3)
        tricks = VGroup(jt("ターゲットネットワーク", size=28, color=WHITE), jt("経験リプレイ", size=28, color=WHITE),
                        jt("ダブルDQN", size=28, color=WHITE))
        tricks.arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        tbox = SurroundingRectangle(tricks, color=style.VALUE, buff=0.25, corner_radius=0.12)
        tgroup = VGroup(tbox, tricks).move_to(RIGHT * 4.45 + DOWN * 1.9)
        ttag = jt("DQN の工夫", size=32, color=style.VALUE).next_to(tbox, UP, buff=0.15)
        with self.voice("{A}関数近似、{B}ブートストラップ、そして{C}方策オフ。{D}この三つがそろうと、学習は発散しうる。"
                        "{E}《死の三つ組》と呼ばれています。{F}[DQN|ディーキューエヌ]の工夫は、この危うい組み合わせを、"
                        "実用上なんとか手なずけるためのもの、とも言えます。") as v:
            old = VGroup(s1, s2, v1, v2, arr, r0, shared, sh_box, sh_lines, tdarc, e1, e2, s2_self, no_data, nd_lab, ax, yl,
                         xl, tick, curve, val, robot, drop)
            self.sfx("pop")
            self.play(FadeOut(old), Create(c_fa), FadeIn(l_fa), run_time=0.7)
            self.wait_to(v, "B")
            self.sfx("pop")
            self.play(Create(c_bs), FadeIn(l_bs), run_time=0.7)
            self.wait_to(v, "C")
            self.sfx("pop")
            self.play(Create(c_op), FadeIn(l_op), run_time=0.7)
            self.wait_to(v, "D")
            self.sfx("thud")
            self.play(FadeIn(center), Write(danger), GrowArrow(d_arrow), run_time=0.9)
            self.play(center.animate.set_fill(opacity=1.0), rate_func=there_and_back, run_time=0.8)
            self.wait_to(v, "E")
            self.sfx("hit")
            self.play(Write(title), run_time=0.9)
            self.wait_to(v, "F")
            self.play(Create(tbox), FadeIn(ttag), LaggedStart(*[FadeIn(t, shift=0.1 * LEFT) for t in tricks], lag_ratio=0.3),
                      run_time=1.4)
            self.sfx("chime")
            self.play(center.animate.set_fill(ORANGE, 0.6), run_time=1.0)
        self.play(FadeOut(VGroup(c_fa, c_bs, c_op, l_fa, l_bs, l_op, center, danger, d_arrow, title, tricks, tbox, ttag)),
                  run_time=0.9)


# ---------------------------------------------------------------------------
# 11. 価値ベースの限界 → 第5章へ
# ---------------------------------------------------------------------------
def magnifier(r=0.32, color=WHITE):
    ring = Circle(r, color=color, stroke_width=4)
    handle = Line(ring.point_at_angle(-PI / 4), ring.point_at_angle(-PI / 4) + 0.35 * (DOWN + RIGHT),
                  color=color, stroke_width=7)
    return VGroup(ring, handle)


class Outro(VoiceScene):
    def construct(self):
        Q, _, _, _ = q_learning(WORLD, episodes=400, seed=3)   # 冒頭の表と同じ Q学習の結果
        qv = [Q[(2, 3), a] for a in ACTIONS]
        bars = Bars(qv, labels=[arrow_glyph(a, length=0.55) for a in ACTIONS], slot=1.4, scale=3.2,
                    colors=[style.VALUE] * 4, label_buff=0.4)
        bars.shift(DOWN * 1.9 - bars.baseline.get_center())
        qnums = VGroup(*[DecimalNumber(q, num_decimal_places=2, font_size=36, color=GREY_A).next_to(bars.bars[i], UP, buff=0.12)
                         for i, q in enumerate(qv)])
        mq = mt(r"\max_{a}", "Q(s,a)", size=62)
        mq[0][3].set_color(style.ACTION)
        mq[1].set_color(style.VALUE)
        mq.to_edge(UP, buff=0.5)
        mg = magnifier(0.36).move_to(bars.top_of(0) + UP * 0.95)
        with self.voice("価値ベースの方法には、もう一つ、根本的な制約があります。行動を選ぶたびに、"
                        "{A}全部の行動の中から、マックスを取らなければならないことです。") as v:
            self.play(Create(bars.baseline), FadeIn(bars.labels), run_time=0.8)
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars.bars], lag_ratio=0.15), FadeIn(qnums), run_time=1.2)
            self.sfx("hit")
            self.play(Write(mq), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(mg), run_time=0.3)
            for i in range(1, 4):
                self.sfx("tick")
                self.play(mg.animate.move_to(bars.top_of(i) + UP * 0.95), run_time=0.45)
            best = int(np.argmax(qv))
            self.play(mg.animate.move_to(bars.top_of(best) + UP * 0.95), bars.bars[best].animate.set_fill(style.REWARD),
                      qnums[best].animate.set_color(style.REWARD), run_time=0.6)

        # 連続的な行動: ロボットアームの関節トルク
        base = LEFT * 4.9 + DOWN * 2.0
        j1 = base + UP * 2.0
        j2 = j1 + RIGHT * 1.6 + UP * 1.0
        tip = j2 + RIGHT * 1.4 + DOWN * 0.4
        arm = VGroup(Rectangle(width=1.2, height=0.25, stroke_width=0, fill_color=GREY_D, fill_opacity=1).move_to(base + DOWN * 0.1),
                     Line(base, j1, stroke_width=12, color=GREY_B), Line(j1, j2, stroke_width=10, color=GREY_B),
                     Line(j2, tip, stroke_width=8, color=GREY_B),
                     *[Dot(p, radius=0.12, color=WHITE) for p in (base, j1, j2)])
        torque = CurvedArrow(j1 + 0.45 * RIGHT + 0.1 * DOWN, j1 + 0.45 * UP + 0.1 * LEFT, angle=1.4, color=style.ACTION,
                             stroke_width=5)
        slider = NumberLine(x_range=[-1, 1, 1], length=3.4, color=GREY_B, include_ticks=False).move_to(LEFT * 3.9 + DOWN * 3.15)
        knob = Dot(slider.n2p(0.3), radius=0.13, color=style.ACTION)
        tq_lab = jt("トルク", size=32, color=style.ACTION).next_to(slider, LEFT, buff=0.2)
        cax = Axes(x_range=[-1, 1, 0.5], y_range=[0, 1, 0.5], x_length=5.8, y_length=3.3, tips=False,
                   axis_config=dict(stroke_color=GREY_C, stroke_width=2, include_ticks=False)).move_to(RIGHT * 3.1 + DOWN * 0.8)
        f = lambda a: 0.35 + 0.3 * np.exp(-((a - 0.35) / 0.18) ** 2) + 0.18 * np.exp(-((a + 0.5) / 0.25) ** 2) + 0.05 * np.sin(9 * a)
        qc = cax.plot(f, x_range=[-1, 1, 0.01], color=style.VALUE, stroke_width=5)
        c_x = VGroup(jt("行動", size=32, color=style.ACTION), mt("a", size=40, color=style.ACTION)).arrange(RIGHT, buff=0.1)
        c_x.next_to(cax.x_axis, DOWN, buff=0.2).align_to(cax.x_axis, RIGHT)
        c_y = mt("Q(s,a)", size=40, color=style.VALUE).next_to(cax.y_axis, UP, buff=0.1)
        # 語彙
        rng = np.random.default_rng(2)
        V = 2400
        logits = rng.gumbel(size=V) * 0.9 - 0.00025 * np.arange(V)
        vals = np.exp(logits - logits.max())
        img = np.zeros((120, V), np.uint8)
        hts = (vals / vals.max()) ** 0.35 * 118
        for i, h in enumerate(hts):
            img[120 - int(h):, i] = 150
        vocab = pixel_image(img, 11.5)
        vocab.stretch_to_fit_height(1.9).move_to(DOWN * 1.0)
        v_lab = jt("語彙（何万個）", size=34, color=GREY_A).next_to(vocab, DOWN, buff=0.2).align_to(vocab, LEFT)
        seq = VGroup(*[RoundedRectangle(width=0.62, height=0.5, corner_radius=0.08, stroke_color=GREY_B, stroke_width=2)
                       for _ in range(7)], mt(r"\cdots", size=40, color=GREY_B)).arrange(RIGHT, buff=0.12)
        seq.next_to(vocab, UP, buff=0.35).align_to(vocab, LEFT)
        seq_lab = jt("× 長い系列", size=34, color=GREY_A).next_to(seq, RIGHT, buff=0.3)
        with self.voice("行動が、上下左右のように、少数なら問題ありません。でも、{A}ロボットの関節を、どれだけの力で動かすか、"
                        "のような連続的な行動や、{B}何万もの語彙から、次々と単語を選んでいく、言語モデルの行動では、どうでしょう。") as v:
            self.play(Indicate(bars.labels, color=style.ACTION), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("whoosh")
            self.play(FadeOut(VGroup(bars, mg, qnums)), FadeIn(arm), run_time=0.7)
            self.play(Create(torque), FadeIn(slider), FadeIn(knob), FadeIn(tq_lab), run_time=0.7)
            self.play(knob.animate.move_to(slider.n2p(-0.6)), run_time=0.6)
            self.play(Create(cax), Create(qc), FadeIn(c_x), FadeIn(c_y), run_time=0.9)
            mg2 = magnifier(0.36).move_to(cax.c2p(-0.8, f(-0.8)) + UP * 0.5)
            self.play(FadeIn(mg2), run_time=0.3)
            for a in (-0.3, 0.7, 0.1, 0.5):
                self.play(mg2.animate.move_to(cax.c2p(a, f(a)) + UP * 0.5), knob.animate.move_to(slider.n2p(a)), run_time=0.45)
            self.wait_to(v, "B")
            self.play(FadeOut(VGroup(arm, torque, slider, knob, tq_lab, cax, qc, c_x, c_y, mg2)), run_time=0.6)
            self.sfx("whoosh")
            self.play(FadeIn(vocab), FadeIn(v_lab), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(s) for s in seq], lag_ratio=0.1), FadeIn(seq_lab), run_time=1.0)
            mg3 = magnifier(0.4).move_to(vocab.get_left() + RIGHT * 1.0 + UP * 0.3)
            seeker = Robot(height=0.9).move_to(RIGHT * 5.5 + UP * 1.55).set_mood("worried")
            self.play(FadeIn(mg3), FadeIn(seeker, shift=0.2 * LEFT), run_time=0.4)
            for xq in (3.5, 1.8, 7.0, 5.2):
                self.play(mg3.animate.move_to(vocab.get_left() + RIGHT * xq + UP * 0.3), run_time=0.5)
            qm = seeker.think("？", direction=UL)
            self.sfx("pop")
            self.play(FadeIn(qm, scale=0.8), seeker.animate.look(DOWN + LEFT), run_time=0.5)

        # 第1章の「途切れた勾配の道」
        def node(tex, color=WHITE, w=1.2):
            m = mt(tex, size=52, color=color)
            box = RoundedRectangle(width=max(w, m.width + 0.45), height=1.1, corner_radius=0.16, stroke_color=GREY_B,
                                   stroke_width=2.5)
            return VGroup(box, m.move_to(box))

        n_th = node(r"\theta", style.THETA)
        n_pi = node(r"\pi_{\theta}", style.POLICY)
        n_a = node("a", style.ACTION, w=0.95)
        env = RoundedRectangle(width=2.3, height=1.6, corner_radius=0.18, stroke_color=RED, stroke_width=2.5)
        n_env = VGroup(env, jt("環境", size=38, color=WHITE).move_to(env))
        n_r = node("r", style.REWARD, w=0.95)
        n_J = node("J", WHITE, w=0.95)
        chain = VGroup(n_th, n_pi, n_a, n_env, n_r, n_J).arrange(RIGHT, buff=0.6).move_to(DOWN * 0.8)
        fwd = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.06, color=GREY_B, stroke_width=3.5)
                       for a, b in zip(chain[:-1], chain[1:])])
        back = VGroup(*[Arrow(b.get_left() + 0.8 * DOWN, a.get_right() + 0.8 * DOWN, buff=0.06, color=RED, stroke_width=5)
                        for a, b in zip(chain[:-1], chain[1:])])
        cut = cross_mark(0.5).move_to(back[2])
        detour = CurvedArrow(n_J.get_top() + 0.15 * UP, n_th.get_top() + 0.15 * UP, angle=0.8, color=style.POLICY, stroke_width=7)
        pi_big = mt(r"\pi_{\theta}(a \mid s)", size=96, color=style.POLICY).move_to(UP * 0.4)
        pi_lab = jt("方策そのもの", size=40, color=style.POLICY).next_to(pi_big, DOWN, buff=0.4)
        with self.voice("価値を経由せずに、{A}《方策そのもの》を、直接学ぶことはできないのか。"
                        "{B}第1章で、途中で途切れていた、あの勾配の道に戻るときが来ました。") as v:
            self.play(FadeOut(Group(vocab, v_lab, seq, seq_lab, mg3, qm, mq)), seeker.change("normal"), run_time=0.6)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(Write(pi_big), FadeIn(pi_lab, shift=0.1 * UP),
                      seeker.animate.set_mood("determined").look(LEFT), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeOut(pi_lab), pi_big.animate.scale(0.7).to_edge(UP, buff=0.4), run_time=0.7)
            self.play(LaggedStart(*[FadeIn(m) for m in chain], lag_ratio=0.12), LaggedStart(*[GrowArrow(a) for a in fwd], lag_ratio=0.12),
                      run_time=1.2)
            self.play(LaggedStart(*[GrowArrow(a) for a in reversed(back)], lag_ratio=0.2), run_time=1.0)
            self.sfx("thud")
            self.play(Create(cut), back[2].animate.set_opacity(0.3), run_time=0.5)
            self.sfx("sparkle")
            self.play(Create(detour), run_time=1.2)
        self.play(FadeOut(VGroup(chain, fwd, back, cut, detour, pi_big, seeker)), run_time=1.0)
        play_end_card(self, next_title="第5章　方策を直接動かす")
