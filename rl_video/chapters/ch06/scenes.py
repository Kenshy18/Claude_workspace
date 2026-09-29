"""第6章「言語モデルを強化学習で鍛える」— PPO・GAE・RLHF・GRPO（最終章）。

レンダリング:  python tools/build.py ch06 [-q h]
"""
from __future__ import annotations

import numpy as np
from manim import *

from chapters.ch06.helpers import (BOT_FILL, CHIP_FILL, GOAL, KL, NEG, PANEL_FILL, PI_STAR, PIT, POS,
                                   USER_FILL, WORLD, V_STAR, bubble, check_mark, cross_mark, doc_stack,
                                   gae_example, gae_tokens, gae_value, grpo_advantages, loop_arrow,
                                   math_chip, mc_td_targets, mini_net, node_box, person_icon,
                                   ppo_ratio_epochs, reinforce_crash, section_tag, sigmoid, token_chip)
from common import style
from common.mobjects import ACTION_VEC, GridView, ProbBars, Robot, glow_dot, value_color
from common.rl import ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene

CHAPTER_TITLE = "第6章 言語モデルを強化学習で鍛える"

SCENES = [
    "Hook", "Title", "StepSize", "Ratio", "Clip", "GAE", "RLHF_Pipeline", "RewardModel",
    "TokenMDP", "RewardHacking", "GRPO", "Map", "Outro",
]


# ---------------------------------------------------------------------------
# 共通の小道具
# ---------------------------------------------------------------------------
def n_vec(s, n):
    return np.array([n[0] - s[0], n[1] - s[1], 0.0])


def arrow_glyph(a, color=style.ACTION, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def frac(num, den, size=44, color=WHITE, buff=0.1):
    """分数を手組みする（分子・分母に別々の色を塗れるように）。"""
    n = num if isinstance(num, Mobject) else mt(num, size=size, color=color)
    d = den if isinstance(den, Mobject) else mt(den, size=size, color=color)
    w = max(n.width, d.width) + 0.15
    bar = Line(LEFT * w / 2, RIGHT * w / 2, stroke_width=2.5, color=WHITE)
    n.next_to(bar, UP, buff=buff)
    d.next_to(bar, DOWN, buff=buff)
    return VGroup(n, bar, d)


def polyline(points, color=WHITE, width=4):
    m = VMobject(stroke_color=color, stroke_width=width)
    m.set_points_as_corners(points)
    return m


def fade_all(scene, run_time=0.9):
    mobs = [m for m in scene.mobjects]
    if mobs:
        scene.play(*[FadeOut(m) for m in mobs], run_time=run_time)


# ---------------------------------------------------------------------------
# 1. つかみ
# ---------------------------------------------------------------------------
class Hook(VoiceScene):
    def construct(self):
        win = RoundedRectangle(width=11.8, height=4.3, corner_radius=0.3, stroke_color=GREY_D,
                               stroke_width=2, fill_color="#0F0F13", fill_opacity=1).move_to(UP * 1.25)
        top_y = win.get_top()[1] - 0.5
        bar = Line([win.get_left()[0], top_y, 0], [win.get_right()[0], top_y, 0], stroke_color=GREY_D,
                   stroke_width=1.5)
        dots = VGroup(*[Dot(radius=0.07, color=c) for c in (GREY_C, GREY_D, GREY_D)]).arrange(RIGHT, buff=0.14)
        dots.move_to([win.get_left()[0] + 0.6, top_y + 0.25, 0])
        frame = VGroup(win, bar, dots)

        user = person_icon(0.7).move_to([win.get_right()[0] - 0.7, 2.15, 0])
        q = bubble("強化学習って、ひとことで言うと？", size=32, fill=USER_FILL, tail="right")
        q.next_to(user, LEFT, buff=0.3)
        bot = Robot(height=0.62).move_to([win.get_left()[0] + 0.8, 0.6, 0])
        ans_text = jt("試行錯誤から学ぶ方法です", size=36, color=WHITE)
        spans = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 12)]
        toks = VGroup(*[VGroup(*ans_text[a:b]) for a, b in spans])
        ans_box = RoundedRectangle(width=ans_text.width + 1.0, height=ans_text.height + 0.75, corner_radius=0.22,
                                   fill_color=BOT_FILL, fill_opacity=1, stroke_color=GREY_D, stroke_width=1.5)
        ans_box.next_to(bot, RIGHT, buff=0.3)
        ans_text.move_to(ans_box)

        # 学習の流れ：長い事前学習と、最後の短い仕上げ
        pre = Rectangle(width=9.2, height=0.42, stroke_width=0, fill_color=GREY_D, fill_opacity=1)
        rl = Rectangle(width=2.1, height=0.42, stroke_width=0, fill_color=style.POLICY, fill_opacity=1)
        VGroup(pre, rl).arrange(RIGHT, buff=0.08).move_to(DOWN * 2.2)
        pre_lab = jt("大量の文章で、次の単語を予測", size=30, color=GREY_B).next_to(pre, DOWN, buff=0.22)
        rl_lab = jt("仕上げ：強化学習", size=30, color=style.POLICY).next_to(rl, DOWN, buff=0.22)
        rl_lab.align_to(rl, RIGHT)

        with self.voice("対話型のAIは、大量の文章を読んで、次の単語を予測する練習をしたあと、"
                        "{A}最後の仕上げに、強化学習で鍛えられています。") as v:
            self.sfx("pop", offset=0.3)
            self.play(FadeIn(frame), FadeIn(user), FadeIn(q, shift=0.2 * LEFT), run_time=0.9)
            self.play(FadeIn(bot), FadeIn(ans_box), bot.animate.look(RIGHT), run_time=0.5)
            for t in toks:
                self.play(FadeIn(t, shift=0.08 * RIGHT), run_time=0.22)
            self.play(bot.blink(), run_time=0.25)
            self.play(GrowFromEdge(pre, LEFT), FadeIn(pre_lab), run_time=max(0.6, v.until("A") - 0.1))
            self.wait_to(v, "A")
            self.sfx("sparkle")
            self.play(GrowFromEdge(rl, LEFT), FadeIn(rl_lab, shift=0.1 * UP), run_time=0.8)
            self.play(Indicate(rl, color=style.POLICY, scale_factor=1.15), bot.change("happy"), run_time=0.8)

        # 言語モデル = 方策、状態 = ここまでのテキスト、行動 = 次のトークン
        pi_lab = VGroup(jt("方策", size=30, color=style.POLICY), mt(r"\pi_\theta", size=40, color=style.POLICY))
        pi_lab.arrange(RIGHT, buff=0.12).next_to(bot, DOWN, buff=0.25)
        s_lab = VGroup(jt("状態", size=34, color=style.STATE), jt("＝ ここまでのテキスト", size=30, color=GREY_B))
        s_lab.arrange(RIGHT, buff=0.2).move_to(LEFT * 3.4 + DOWN * 1.55)
        a_lab = VGroup(jt("行動", size=34, color=style.ACTION), jt("＝ 次のトークン", size=30, color=GREY_B))
        a_lab.arrange(RIGHT, buff=0.2).move_to(RIGHT * 3.4 + DOWN * 1.55)

        def state_boxes(k):
            b1 = SurroundingRectangle(q.box, color=style.STATE, buff=0.05, corner_radius=0.22, stroke_width=4)
            b2 = SurroundingRectangle(VGroup(*toks[:k]), color=style.STATE, buff=0.1, corner_radius=0.08,
                                      stroke_width=4)
            return VGroup(b1, b2)

        def act_box(k):
            return SurroundingRectangle(toks[k], color=style.ACTION, buff=0.1, corner_radius=0.08, stroke_width=5)

        with self.voice("第1章で見たように、{A}言語モデルは、それ自体が《方策》です。{S}状態は、ここまでのテキスト、"
                        "{T}行動は、次のトークン。{B}一つの回答は、一本の軌跡です。") as v:
            self.play(FadeOut(VGroup(pre, rl, pre_lab, rl_lab)), bot.change("normal"), run_time=0.6)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(pi_lab, shift=0.1 * UP), Indicate(bot, color=style.POLICY), run_time=0.9)
            self.wait_to(v, "S")
            sb = state_boxes(2)
            for t in toks[2:]:
                t.set_opacity(0.25)
            self.sfx("pop")
            self.play(Create(sb), FadeIn(s_lab), run_time=0.8)
            self.wait_to(v, "T")
            self.sfx("pop")
            ab = act_box(2)
            self.play(Create(ab), toks[2].animate.set_opacity(1), FadeIn(a_lab), run_time=0.7)
            self.play(Transform(sb, state_boxes(3)), Transform(ab, act_box(3)),
                      toks[3].animate.set_opacity(1), run_time=0.5)
            self.play(toks[4:].animate.set_opacity(1), run_time=0.3)

            # 第1章の「s0 a0 r1 …」の系列に重ねる
            seq = VGroup()
            for k in range(4):
                seq.add(mt(f"s_{k}", size=50, color=style.STATE))
                seq.add(mt(f"a_{k}", size=50, color=style.ACTION))
                seq.add(mt(f"r_{{{k + 1}}}", size=50, color=style.REWARD))
            seq.add(mt(r"\cdots", size=50))
            seq.arrange(RIGHT, buff=0.44).move_to(DOWN * 1.75)
            chips = VGroup(*[SurroundingRectangle(t, buff=0.12, corner_radius=0.08, stroke_width=2,
                                                  color=t.get_color()) for t in seq[:-1]])
            under = VGroup()
            for k in range(4):
                c = token_chip(["試行", "錯誤", "から", "学ぶ"][k], size=32, stroke=style.ACTION)
                c.next_to(seq[3 * k + 1], DOWN, buff=0.35)
                under.add(c)
            self.play(FadeOut(VGroup(s_lab, a_lab, sb, ab)),
                      LaggedStart(*[FadeIn(VGroup(t, c), shift=0.15 * RIGHT) for t, c in zip(seq[:-1], chips)],
                                  lag_ratio=0.08), FadeIn(seq[-1]), run_time=1.0)
            self.wait_to(v, "B")
            self.play(*[FadeIn(under[k][0]) for k in range(4)], run_time=0.3)
            self.sfx("whoosh")
            self.play(*[TransformFromCopy(toks[k], under[k][1]) for k in range(4)], run_time=0.8)
            tau = VGroup(jt("一つの回答 ＝ 一本の軌跡", size=32, color=GREY_A), mt(r"\tau", size=48))
            tau.arrange(RIGHT, buff=0.3).move_to(DOWN * 3.3)
            self.play(FadeIn(tau, shift=0.1 * UP), run_time=0.6)
        self.wait(1.4)

        self.play(FadeOut(VGroup(frame, user, q, bot, ans_box, ans_text, pi_lab, seq, chips, under, tau)),
                  run_time=0.8)

        # これまでの部品 → この章の主役
        parts1 = ["MDP", "価値", "ベルマン方程式", "TD学習", "Q学習"]
        parts2 = ["DQN", "方策勾配", "ベースライン", "Actor-Critic"]
        row1 = VGroup(*[token_chip(p, size=32, color=GREY_A) for p in parts1]).arrange(RIGHT, buff=0.25)
        row2 = VGroup(*[token_chip(p, size=32, color=GREY_A) for p in parts2]).arrange(RIGHT, buff=0.25)
        rows = VGroup(row1, row2).arrange(DOWN, buff=0.3).move_to(UP * 1.7)
        goal = VGroup(*[token_chip(p, size=48, color=style.REWARD, stroke=style.REWARD)
                        for p in ["PPO", "GAE", "RLHF", "GRPO"]]).arrange(RIGHT, buff=0.4).move_to(DOWN * 1.6)
        arrow = Arrow(rows.get_bottom() + 0.1 * DOWN, goal.get_top() + 0.15 * UP, buff=0.1, color=GREY_B,
                      stroke_width=5)
        with self.voice("最終章では、ここまで組み立ててきた部品を使って、{A}言語モデルを強化学習で鍛える仕組みを、"
                        "中身から理解していきます。") as v:
            self.play(LaggedStart(*[FadeIn(c, shift=0.15 * UP) for c in [*row1, *row2]], lag_ratio=0.12),
                      run_time=min(2.4, max(1.0, v.until("A") - 0.2)))
            self.wait_to(v, "A")
            self.play(GrowArrow(arrow), run_time=0.6)
            self.sfx("sparkle")
            srcs = [row2[1], row1[3], row2[3], row2[2]]  # 方策勾配→PPO, TD→GAE, AC→RLHF, ベースライン→GRPO
            self.play(LaggedStart(*[TransformFromCopy(sc, c) for sc, c in zip(srcs, goal)], lag_ratio=0.2),
                      run_time=1.4)
        self.play(FadeOut(VGroup(rows, arrow, goal)), run_time=0.9)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 6, "言語モデルを強化学習で鍛える", subtitle="PPO・RLHF・GRPO")


# ---------------------------------------------------------------------------
# 3. 更新の幅の問題
# ---------------------------------------------------------------------------
def landscape(x):
    return 0.35 + 1.4 * np.exp(-((x - 2.4) / 1.1) ** 2) - 1.2 / (1 + np.exp(-(x - 3.9) * 5))


def landscape_slope(x, h=1e-4):
    return (landscape(x + h) - landscape(x - h)) / (2 * h)


class StepSize(VoiceScene):
    def construct(self):
        curve, snaps = reinforce_crash()
        CR = 28  # この更新だけ、学習率が100倍（大きく動きすぎる）
        n_up = len(curve)

        upd = mt(r"\theta", r"\leftarrow", r"\theta", "+", r"\alpha", r"\nabla_\theta J", size=56)
        upd[0].set_color(style.THETA)
        upd[2].set_color(style.THETA)
        upd.move_to(LEFT * 3.35 + UP * 2.95)
        br = Brace(upd[4:], DOWN, color=GREY_B, buff=0.08)
        br_lab = jt("更新の幅", size=30, color=GREY_A).next_to(br, DOWN, buff=0.1)

        ax = Axes(x_range=[0, 50, 10], y_range=[-0.1, 0.5, 0.1], x_length=5.4, y_length=3.4,
                  axis_config=dict(color=GREY_B, stroke_width=2, include_tip=False), tips=False)
        ax.move_to(LEFT * 3.35 + DOWN * 0.75)
        xt = VGroup(*[mt(str(x), size=26, color=GREY_B).next_to(ax.c2p(x, -0.1), DOWN, buff=0.12)
                      for x in (0, 50)])
        yt = VGroup(*[mt(f"{y:.1f}", size=26, color=GREY_B).next_to(ax.c2p(0, y), LEFT, buff=0.12)
                      for y in (0.0, 0.2, 0.4)])
        xl = jt("更新回数", size=28, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.55)
        yl = jt("平均リターン", size=28, color=GREY_B).next_to(ax.c2p(0, 0.5), UP, buff=0.2).shift(0.3 * RIGHT)
        plot = VGroup(ax, xt, yt, xl, yl)
        pts = [ax.c2p(u, max(curve[u], -0.1)) for u in range(n_up)]
        line1 = polyline(pts[:CR + 1], color=style.REWARD, width=4)
        line2 = polyline(pts[CR:CR + 2], color=RED, width=4)
        line3 = polyline(pts[CR + 1:], color=RED, width=4)

        with self.voice("前回、方策勾配法の弱点として、{A}更新の幅の難しさを挙げました。") as v:
            self.play(Write(upd), Create(ax), FadeIn(xt), FadeIn(yt), FadeIn(xl), FadeIn(yl), run_time=1.2)
            self.play(Create(line1), run_time=max(0.8, v.until("A") - 0.2), rate_func=linear)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(GrowFromCenter(br), FadeIn(br_lab), Indicate(upd[4], color=style.GAMMA), run_time=0.9)

        # 右：目的関数の地形と接線
        lax = Axes(x_range=[0, 6, 1], y_range=[-1.0, 2.2, 1], x_length=5.4, y_length=3.4,
                   axis_config=dict(color=GREY_D, stroke_width=2, include_tip=False, include_ticks=False),
                   tips=False).move_to(RIGHT * 3.6 + DOWN * 0.75)
        l_xl = mt(r"\theta", size=40, color=style.THETA).next_to(lax.x_axis, RIGHT, buff=0.1).shift(0.25 * DOWN)
        l_yl = mt("J", size=40).next_to(lax.c2p(0, 2.2), LEFT, buff=0.1)
        land = lax.plot(landscape, x_range=[0, 6, 0.02], color=WHITE, stroke_width=4)
        x0 = 1.0
        dot = Dot(lax.c2p(x0, landscape(x0)), radius=0.1, color=style.THETA)
        k = landscape_slope(x0)
        tan = Line(lax.c2p(0.2, landscape(x0) + k * (0.2 - x0)), lax.c2p(3.0, landscape(x0) + k * (3.0 - x0)),
                   stroke_color=style.THETA, stroke_width=3)
        near = Rectangle(width=lax.x_axis.unit_size * 0.8, height=3.4, stroke_width=0, fill_color=style.THETA,
                         fill_opacity=0.12).move_to([lax.c2p(x0, 0)[0], lax.get_center()[1], 0])
        with self.voice("勾配は、今の方策の、すぐ近くでだけ正しい方向を教えてくれます。{A}大きく動きすぎると、方策が《壊れて》しまう。"
                        "しかも強化学習では、{B}壊れた方策で集めたデータで、次の学習をすることになります。"
                        "教師あり学習のように、データセットが守ってくれないんです。") as v:
            self.play(FadeOut(br), FadeOut(br_lab), Create(lax), FadeIn(l_xl), FadeIn(l_yl), Create(land),
                      run_time=1.2)
            self.play(FadeIn(dot, scale=0.5), Create(tan), run_time=0.8)
            self.play(FadeIn(near), run_time=0.6)
            x1 = 1.5
            ghost = dot.copy().set_opacity(0.4)
            self.add(ghost)
            self.play(dot.animate.move_to(lax.c2p(x1, landscape(x1))), run_time=0.8)
            self.wait_to(v, "A")
            # 大きすぎる一歩：接線の上では上がるはずが、実際は崖の下
            x2 = 4.8
            self.sfx("whoosh")
            self.play(dot.animate.move_to(lax.c2p(3.0, landscape(x0) + k * (3.0 - x0))), run_time=0.6)
            self.sfx("fall")
            fall = DashedLine(lax.c2p(3.0, landscape(x0) + k * (3.0 - x0)), lax.c2p(x2, landscape(x2)),
                              color=RED, stroke_width=3)
            self.play(Create(fall), dot.animate.move_to(lax.c2p(x2, landscape(x2))).set_color(RED),
                      Create(line2), run_time=0.8)

            # 実際に壊れたマス：星の左隣 (3,3)
            g = GridView(WORLD, cell=0.66, show_terminal_labels=False).move_to(RIGHT * 2.2 + UP * 1.35)
            s_bad = (3, 3)
            focus = SurroundingRectangle(g.cells[s_bad], color=style.STATE, buff=0.0, stroke_width=5)
            before, after = snaps[CR][s_bad], snaps[CR + 1][s_bad]
            glyphs = [arrow_glyph(a, color=GREY_A, length=0.42) for a in ACTIONS]
            pb = ProbBars(list(before), labels=glyphs, width=2.5, height=1.8,
                          colors=[style.POLICY] * 4).move_to(RIGHT * 5.3 + UP * 1.05)

            def big_vals(probs):
                return VGroup(*[mt(f"{p:.2f}", size=30, color=WHITE).next_to(b, UP, buff=0.08)
                                for p, b in zip(probs, pb.bars) if p >= 0.05])
            vals = big_vals(before)
            link = DashedLine(focus.get_right(), pb.get_left() + 0.3 * UP, color=GREY_C, stroke_width=2)
            robot = Robot(height=0.38).move_to(g.center_of(s_bad))
            self.play(FadeOut(VGroup(lax, l_xl, l_yl, land, dot, tan, near, ghost, fall)),
                      FadeIn(g), FadeIn(robot), run_time=0.7)
            self.play(Create(focus), Create(link), FadeIn(pb), FadeIn(vals), run_time=0.7)
            self.play(Indicate(vals[0], color=style.POLICY, scale_factor=1.3), run_time=0.8)
            self.play(FadeOut(vals), pb.animate.set_probs(list(after)), run_time=1.0)
            vals = big_vals(after).set_color(RED)
            self.sfx("thud")
            drop = robot.sweat()
            self.play(FadeIn(vals), Indicate(pb.bars[3], color=RED, scale_factor=1.1), robot.change("worried"),
                      FadeIn(drop, shift=0.05 * DOWN), run_time=0.7)

            # 壊れた方策で集めたデータ（実際のロールアウト）
            self.wait_to(v, "B")
            pol = {s: {a: float(p[a]) for a in ACTIONS} for s, p in snaps[-1].items()}
            rows = VGroup()
            trajs = []
            seed = 0
            while len(trajs) < 3:
                t = WORLD.rollout(pol, np.random.default_rng(100 + seed), start=s_bad, max_steps=40)
                seed += 1
                if t[-1][3] not in WORLD.terminals:
                    trajs.append(t)
            for t in trajs:
                glyph_row = VGroup(*[arrow_glyph(a, color=style.ACTION, length=0.34, width=4) for (_, a, _, _) in t[:9]])
                glyph_row.arrange(RIGHT, buff=0.14)
                ret = mt("G=0", size=30, color=GREY_B)
                rows.add(VGroup(glyph_row, mt(r"\cdots", size=30, color=GREY_B), ret).arrange(RIGHT, buff=0.2))
            rows.arrange(DOWN, buff=0.28, aligned_edge=LEFT).move_to(RIGHT * 3.6 + DOWN * 1.9)
            data_lab = jt("集めたデータ", size=28, color=GREY_B).next_to(rows, UP, buff=0.18).align_to(rows, LEFT)
            self.play(FadeIn(data_lab), run_time=0.4)
            t0 = trajs[0]
            self.play(FadeOut(drop), run_time=0.2)
            for i, (s, a, r, n) in enumerate(t0[:9]):
                anims = [FadeIn(rows[0][0][i], shift=0.05 * RIGHT)]
                if n == s:
                    anims.append(robot.animate(rate_func=there_and_back).shift(0.12 * g.cell * ACTION_VEC[a]))
                else:
                    anims.append(robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)))
                self.play(*anims, run_time=0.28)
            self.play(FadeIn(rows[0][1:]), LaggedStart(*[FadeIn(r) for r in rows[1:]], lag_ratio=0.4),
                      Create(line3), run_time=1.6)
        self.sfx("whoosh")
        self.play(FadeOut(VGroup(upd, plot, line1, line2, line3, g, robot, focus, link, pb, vals, rows, data_lab)),
                  run_time=0.8)

        # データ集めは高くつく：1トークンごとにネットワークを1回動かす
        net = mini_net((3, 4, 4, 3), width=1.9, height=1.4, r=0.08)
        lm = VGroup(RoundedRectangle(width=3.0, height=2.7, corner_radius=0.2, stroke_color=style.POLICY,
                                     stroke_width=2.5, fill_color=PANEL_FILL, fill_opacity=1))
        net.move_to(lm[0]).shift(0.3 * UP)
        lm_lab = jt("言語モデル", size=34, color=WHITE).next_to(net, DOWN, buff=0.28)
        lm.add(net, lm_lab)
        lm.move_to(LEFT * 4.9 + UP * 0.9)
        words = ["毎日", "少し", "ずつ", "声に", "出して"]
        chips = VGroup(*[token_chip(w, size=40, stroke=style.ACTION) for w in words])
        chips.arrange(RIGHT, buff=0.14).next_to(lm, RIGHT, buff=0.5)
        dots_chip = token_chip("…", size=40)
        dots_chip.next_to(chips, RIGHT, buff=0.14)
        cnt_lab = jt("ネットワークの計算", size=36, color=GREY_B)
        cnt = Integer(0, font_size=60, color=WHITE)
        times = mt(r"\times", size=48, color=GREY_B)
        counter = VGroup(cnt_lab, times, cnt).arrange(RIGHT, buff=0.25).move_to(DOWN * 1.3)
        with self.voice("一方で、データを集めるのは高くつきます。言語モデルなら、{A}一つの回答を生成するのに、"
                        "何百回もネットワークを動かします。{B}集めたデータは、何度か使い回したい。") as v:
            self.play(FadeIn(lm), FadeIn(counter), run_time=0.8)
            per = max(0.4, (v.until("A") - 0.2) / len(chips))
            for i, c in enumerate(chips):
                self.sfx("tick")
                self.play(Indicate(net, color=style.POLICY, scale_factor=1.05), FadeIn(c, shift=0.2 * RIGHT),
                          cnt.animate.set_value(i + 1), run_time=per)
            self.wait_to(v, "A")
            for k in range(4):
                self.sfx("tick", offset=0.5 * k)
            self.play(FadeIn(dots_chip), ChangeDecimalToValue(cnt, 312), run_time=2.2, rate_func=linear)
            self.wait_to(v, "B")
            answer = VGroup(chips, dots_chip)
            stack = VGroup(*[RoundedRectangle(width=2.2, height=1.3, corner_radius=0.12, stroke_color=GREY_B,
                                              stroke_width=2, fill_color=PANEL_FILL, fill_opacity=1)
                             .shift(0.12 * i * (UP + RIGHT)) for i in range(3)])
            stack_lab = jt("回答データ", size=30, color=WHITE).move_to(stack[-1])
            data = VGroup(stack, stack_lab).move_to(RIGHT * 3.2 + DOWN * 1.2)
            loop = loop_arrow(radius=1.25, color=style.REWARD, width=5).move_to(data)
            reuse = jt("何度か使い回したい", size=30, color=style.REWARD).next_to(loop, DOWN, buff=0.2)
            self.sfx("pop")
            self.play(ReplacementTransform(answer, stack), FadeIn(stack_lab), FadeOut(counter), run_time=1.0)
            self.play(Create(loop), FadeIn(reuse), run_time=1.0)

        # 安全な範囲 × 同じデータを何度も → PPO
        small_ax = Axes(x_range=[0, 6, 1], y_range=[-1.0, 2.2, 1], x_length=3.4, y_length=2.1,
                        axis_config=dict(color=GREY_D, stroke_width=2, include_tip=False, include_ticks=False),
                        tips=False).move_to(LEFT * 4.3 + DOWN * 0.3)
        s_land = small_ax.plot(landscape, x_range=[0, 6, 0.02], color=WHITE, stroke_width=3)
        s_dot = Dot(small_ax.c2p(1.0, landscape(1.0)), radius=0.08, color=style.THETA)
        s_band = Rectangle(width=small_ax.x_axis.unit_size * 0.8, height=2.1, stroke_width=0,
                           fill_color=style.THETA, fill_opacity=0.18).move_to([small_ax.c2p(1.0, 0)[0], small_ax.get_center()[1], 0])
        safe_lab = jt("安全な範囲で", size=32, color=style.THETA).next_to(small_ax, UP, buff=0.25)
        safe = VGroup(small_ax, s_land, s_band, s_dot, safe_lab)
        ppo = jt("PPO", size=96, color=WHITE, weight="BOLD").move_to(UP * 0.1)
        ppo_sub = jt("Proximal Policy Optimization", size=28, color=GREY_B).next_to(ppo, DOWN, buff=0.25)
        with self.voice("安全な範囲で、{B}同じデータを、何度も使う。{A}これを両立させるのが、PPOです。") as v:
            self.play(FadeOut(lm), VGroup(data, loop).animate.scale(0.8).move_to(RIGHT * 4.3 + DOWN * 0.1),
                      reuse.animate.move_to(RIGHT * 4.3 + UP * 1.55), FadeIn(safe), run_time=1.0)
            self.wait_to(v, "B")
            reuse2 = jt("同じデータを、何度も", size=32, color=style.REWARD).move_to(reuse)
            self.play(Rotate(loop, -2 * PI, about_point=data.get_center()), Transform(reuse, reuse2), run_time=1.2)
            self.wait_to(v, "A")
            a1 = Arrow(small_ax.get_right(), ppo.get_left(), buff=0.3, color=GREY_B, stroke_width=4)
            a2 = Arrow(loop.get_left(), ppo.get_right(), buff=0.3, color=GREY_B, stroke_width=4)
            self.sfx("sparkle")
            self.play(GrowArrow(a1), GrowArrow(a2), FadeIn(ppo, scale=0.8), run_time=1.0)
            self.play(FadeIn(ppo_sub, shift=0.1 * UP), run_time=0.6)
        fade_all(self)


# ---------------------------------------------------------------------------
# 4. 重要度比
# ---------------------------------------------------------------------------
TOK5 = ["面白い", "難しい", "奥深い", "便利", "魔法"]
P_OLD = [0.38, 0.27, 0.20, 0.12, 0.03]
P_NEW = [0.45, 0.24, 0.17, 0.11, 0.03]
P_FAR = [0.12, 0.10, 0.08, 0.20, 0.50]


class PairedBars(VGroup):
    """古い方策（灰）と新しい方策（紫）の確率を並べた棒グラフ。"""

    def __init__(self, p_old, p_new, labels, slot=1.6, height=6.2, bar_w=0.5, **kw):
        super().__init__(**kw)
        n = len(p_old)
        self.slot, self.h, self.bar_w = slot, height, bar_w
        W = slot * n
        self.baseline = Line(LEFT * W / 2, RIGHT * W / 2, stroke_color=GREY_C, stroke_width=2)
        self.old = VGroup()
        self.new = VGroup()
        for i in range(n):
            self.old.add(Rectangle(width=bar_w, height=max(1e-3, p_old[i] * height), stroke_width=0,
                                   fill_color=GREY_B, fill_opacity=0.85))
            self.new.add(Rectangle(width=bar_w, height=max(1e-3, p_new[i] * height), stroke_width=0,
                                   fill_color=style.POLICY, fill_opacity=0.9))
        self.labels = VGroup(*[jt(t, size=32, color=GREY_A) for t in labels])
        self.add(self.baseline, self.old, self.new, self.labels)
        self._place(p_old, p_new)

    def cx(self, i):
        return self.baseline.get_left() + RIGHT * self.slot * (i + 0.5)

    def _place(self, p_old, p_new):
        for i in range(len(p_old)):
            self.old[i].move_to(self.cx(i) + LEFT * 0.28 + UP * self.old[i].height / 2)
            self.new[i].move_to(self.cx(i) + RIGHT * 0.28 + UP * self.new[i].height / 2)
            self.labels[i].next_to(self.cx(i), DOWN, buff=0.2)

    def new_anims(self, p_new):
        anims = []
        for i, p in enumerate(p_new):
            h = max(1e-3, p * self.h)
            target = Rectangle(width=self.bar_w, height=h, stroke_width=0, fill_color=style.POLICY,
                               fill_opacity=0.9).move_to(self.cx(i) + RIGHT * 0.28 + UP * h / 2)
            anims.append(Transform(self.new[i], target))
        return anims


class Ratio(VoiceScene):
    def construct(self):
        ctx = VGroup(*[token_chip(t, size=36) for t in ["強化", "学習", "は"]]).arrange(RIGHT, buff=0.1)
        q = token_chip("？", size=36, color=style.ACTION, stroke=style.ACTION).next_to(ctx, RIGHT, buff=0.1)
        head = VGroup(ctx, q).move_to(UP * 3.0).align_to(LEFT * 6.3, LEFT)
        bars = PairedBars(P_OLD, P_NEW, TOK5)
        bars.shift(np.array([-2.35, -1.9, 0]) - bars.baseline.get_center())
        leg_old = VGroup(Square(0.28, stroke_width=0, fill_color=GREY_B, fill_opacity=0.9),
                         jt("古い方策", size=30, color=GREY_B), mt(r"\pi_{\theta_{\rm old}}", size=40, color=GREY_B))
        leg_old.arrange(RIGHT, buff=0.15)
        leg_new = VGroup(Square(0.28, stroke_width=0, fill_color=style.POLICY, fill_opacity=0.9),
                         jt("新しい方策", size=30, color=style.POLICY), mt(r"\pi_\theta", size=40, color=style.POLICY))
        leg_new.arrange(RIGHT, buff=0.15)
        legend = VGroup(leg_old, leg_new).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        legend.move_to(UP * 1.85).align_to(LEFT * 6.3, LEFT)

        num = mt(r"\pi_\theta(a_t \mid s_t)", size=42, color=style.POLICY)
        den = mt(r"\pi_{\theta_{\rm old}}(a_t \mid s_t)", size=42, color=GREY_B)
        rdef = VGroup(mt(r"r_t(\theta)", "=", size=48), frac(num, den)).arrange(RIGHT, buff=0.2)
        rdef.move_to(RIGHT * 4.35 + UP * 0.8)
        i_pick = 0
        r_val = P_NEW[i_pick] / P_OLD[i_pick]
        rnum = VGroup(mt("=", size=44), frac(mt(f"{P_NEW[i_pick]:.2f}", size=40, color=style.POLICY),
                                             mt(f"{P_OLD[i_pick]:.2f}", size=40, color=GREY_B)),
                      mt(rf"\approx {r_val:.2f}", size=44)).arrange(RIGHT, buff=0.2)
        rnum.next_to(rdef, DOWN, buff=0.45).align_to(rdef[0][1], LEFT)

        with self.voice("まず、データの使い回しです。{A}データを集めたときの、古い方策と、{C}今、学習中の新しい方策。"
                        "その確率の比を、{B}[rₜ|アールティー]とします。") as v:
            self.play(FadeIn(head), Create(bars.baseline), FadeIn(bars.labels), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars.old], lag_ratio=0.1), FadeIn(leg_old),
                      run_time=1.0)
            self.wait_to(v, "C")
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars.new], lag_ratio=0.1), FadeIn(leg_new),
                      run_time=1.0)
            self.wait_to(v, "B")
            pick = SurroundingRectangle(VGroup(bars.old[i_pick], bars.new[i_pick], bars.labels[i_pick]),
                                        color=style.ACTION, buff=0.12, corner_radius=0.08)
            self.sfx("hit")
            self.play(Create(pick), Write(rdef), run_time=1.0)
            self.play(FadeIn(rnum, shift=0.1 * UP), run_time=0.7)

        # 重要度サンプリング：古い棒に比を掛けると新しい棒になる
        ratios = [pn / po for pn, po in zip(P_NEW, P_OLD)]
        rl = VGroup(*[mt(rf"\times{r:.2f}", size=30, color=WHITE) for r in ratios])
        for i, m in enumerate(rl):
            m.next_to(VGroup(bars.old[i], bars.new[i]), UP, buff=0.12)
        is_eq = mt(r"\mathbb{E}_{a\sim\pi_\theta}\big[f(a)\big]", "=",
                   r"\mathbb{E}_{a\sim\pi_{\theta_{\rm old}}}\Big[", r"r(a)", r"\,f(a)\Big]", size=44)
        is_eq[0].set_color(style.POLICY)
        is_eq[2].set_color(GREY_B)
        is_eq.move_to(UP * 3.0).align_to(LEFT * 6.3, LEFT)
        is_lab = jt("重要度サンプリング", size=34, color=WHITE).next_to(is_eq, RIGHT, buff=0.6)
        with self.voice("古いデータで計算した値に、この比を掛けると、{A}新しい方策で集めたかのように、補正できます。"
                        "{B}重要度サンプリングと呼ばれる、統計の古典的な道具です。") as v:
            self.play(FadeOut(pick), FadeOut(head), LaggedStart(*[FadeIn(m, shift=0.1 * DOWN) for m in rl],
                                                                lag_ratio=0.1), run_time=1.2)
            self.wait_to(v, "A")
            copies = VGroup(*[b.copy() for b in bars.old])
            self.add(copies)
            targets = []
            for c, b, p in zip(copies, bars.new, P_NEW):
                h = p * bars.h
                targets.append(c.animate.stretch_to_fit_height(h).move_to(b.get_bottom() + UP * h / 2)
                               .set_fill(style.POLICY, 0.9))
            self.sfx("sparkle")
            self.play(*targets, run_time=1.4)
            self.play(FadeOut(copies), Write(is_eq), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeIn(is_lab, shift=0.1 * UP), run_time=0.6)

        # 目的関数と勾配
        L = mt(r"L(\theta)", "=", r"\mathbb{E}_t\big[", r"r_t(\theta)", r"\,\hat{A}_t", r"\big]", size=56)
        L[4].set_color(style.ADV)
        L.move_to(UP * 2.2)
        same = mt(r"\theta = \theta_{\rm old}", r"\ \Rightarrow\ ", r"r_t(\theta) = 1", size=44).move_to(UP * 0.8)
        grad = mt(r"\nabla_\theta\, r_t(\theta)\Big|_{\theta_{\rm old}}", "=",
                  r"\frac{\nabla_\theta\, \pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\rm old}}(a_t\mid s_t)}", "=",
                  r"\nabla_\theta \log \pi_\theta(a_t\mid s_t)", size=42).move_to(DOWN * 0.7)
        grad[4].set_color(style.POLICY)
        pg = mt(r"\nabla_\theta L", "=", r"\mathbb{E}_t\big[", r"\nabla_\theta \log \pi_\theta(a_t\mid s_t)",
                r"\,\hat{A}_t", r"\big]", size=48).move_to(DOWN * 2.5)
        pg[3].set_color(style.POLICY)
        pg[4].set_color(style.ADV)
        pg_box = SurroundingRectangle(pg, color=style.POLICY, buff=0.2, corner_radius=0.1)
        pg_lab = jt("第5章の方策勾配", size=30, color=style.POLICY).next_to(pg_box, RIGHT, buff=0.3)
        if pg_lab.get_right()[0] > 6.7:
            pg_lab.next_to(pg_box, UP, buff=0.15).align_to(pg_box, RIGHT)
        chart = VGroup(bars, rl, legend)
        with self.voice("この比に、アドバンテージを掛けたものを、目的関数にします。{A}新旧の方策が同じなら、比は1で、"
                        "{B}その勾配は、前回の方策勾配と、ぴったり一致します。") as v:
            self.play(FadeOut(VGroup(chart, is_eq, is_lab, rnum)), rdef.animate.scale(0.8).to_corner(UR, buff=0.4),
                      run_time=0.9)
            self.play(Write(L), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(same, shift=0.1 * DOWN), run_time=0.8)
            self.wait_to(v, "B")
            self.play(Write(grad), run_time=1.4)
            self.sfx("hit")
            self.play(TransformFromCopy(grad[4], pg[3]), FadeIn(VGroup(pg[:3], pg[4:])), Create(pg_box),
                      FadeIn(pg_lab), run_time=1.1)

        # 離れすぎると補正が当てにならない
        chart2 = VGroup(bars, legend, head)
        ratios_far = [pn / po for pn, po in zip(P_FAR, P_OLD)]
        rl2 = VGroup(*[mt(rf"\times{r:.1f}", size=32, color=RED if (r > 3 or r < 0.34) else WHITE)
                       for r in ratios_far])
        rng = np.random.default_rng(2)
        counts = rng.multinomial(20, P_OLD)
        while counts[-1] != 0:  # 念のため（シード固定なので実際は1回）
            counts = rng.multinomial(20, P_OLD)
        with self.voice("ただし、{A}比が1から大きく離れると、この補正は、とたんに《当てにならなく》なります。"
                        "{B}新しい方策が、古いデータの外側へ、どんどん出て行ってしまうからです。") as v:
            self.play(FadeOut(VGroup(L, same, grad, pg, pg_box, pg_lab, rdef)), run_time=0.5)
            self.play(FadeIn(chart2), run_time=0.5)
            self.wait_to(v, "A")
            self.play(*bars.new_anims(P_FAR), run_time=1.4)
            for m, b in zip(rl2, bars.new):
                m.next_to(VGroup(b, bars.old[list(bars.new).index(b)]), UP, buff=0.15)
            self.play(LaggedStart(*[FadeIn(m, shift=0.1 * DOWN) for m in rl2], lag_ratio=0.1), run_time=1.0)
            self.wait_to(v, "B")
            dots = VGroup()
            for i, c in enumerate(counts):
                col = VGroup(*[Dot(radius=0.07, color=GREY_B) for _ in range(c)])
                if c:
                    col.arrange_in_grid(rows=(c + 1) // 2, cols=2, buff=0.07)
                    col.next_to(bars.labels[i], DOWN, buff=0.2)
                dots.add(col)
            dlab = jt("古い方策で集めたデータ", size=28, color=GREY_B).next_to(bars.baseline, RIGHT, buff=0.3)
            dlab.shift(DOWN * 1.2)
            self.play(LaggedStart(*[FadeIn(d, shift=0.1 * UP) for d in dots], lag_ratio=0.1), FadeIn(dlab),
                      run_time=1.2)
            qm = jt("？", size=56, color=RED).next_to(bars.labels[4], DOWN, buff=0.25)
            self.sfx("thud")
            self.play(FadeIn(qm, scale=0.6), Indicate(bars.new[4], color=RED), Indicate(rl2[4], color=RED),
                      run_time=1.0)
        fade_all(self)


# ---------------------------------------------------------------------------
# 5. クリップ（山場1）
# ---------------------------------------------------------------------------
EPS = 0.2


def clip_plot(sign, center):
    """横軸 r、縦軸 目的関数（Â = ±1）。"""
    yr = [0, 2.0, 0.5] if sign > 0 else [-2.0, 0, 0.5]
    ax = Axes(x_range=[0, 2.0, 0.2], y_range=yr, x_length=6.0, y_length=3.9,
              axis_config=dict(color=GREY_B, stroke_width=2.5, include_tip=False, include_ticks=False),
              tips=False).move_to(center)
    y0 = 0.0
    y_far = 2.0 * sign
    band = Polygon(ax.c2p(1 - EPS, y0), ax.c2p(1 + EPS, y0), ax.c2p(1 + EPS, y_far), ax.c2p(1 - EPS, y_far),
                   stroke_width=0, fill_color=GREY_B, fill_opacity=0.10)
    one = DashedLine(ax.c2p(1, y0), ax.c2p(1, y_far), color=GREY_C, stroke_width=2, dash_length=0.08)
    ticks = VGroup()
    labs = VGroup()
    for x, t in [(1 - EPS, r"1-\epsilon"), (1, "1"), (1 + EPS, r"1+\epsilon")]:
        tk = Line(ax.c2p(x, 0) + DOWN * 0.08, ax.c2p(x, 0) + UP * 0.08, stroke_color=GREY_B, stroke_width=2.5)
        ticks.add(tk)
        m = mt(t, size=32, color=GREY_A)
        inside = (x == 1)  # 「1」は軸の内側に置いて、1±ε の文字と重ならないようにする
        if (sign > 0) != inside:
            m.next_to(ax.c2p(x, 0), DOWN, buff=0.18)
        else:
            m.next_to(ax.c2p(x, 0), UP, buff=0.18)
        labs.add(m)
    rlab = mt("r", size=42).set_color(WHITE)
    if sign > 0:
        rlab.next_to(ax.c2p(2.0, 0), RIGHT, buff=0.15)
    else:
        rlab.next_to(ax.c2p(2.0, 0), RIGHT, buff=0.15)
    g = VGroup(band, one, ax, ticks, labs, rlab)
    g.ax = ax
    return g


def clip_lines(ax, sign):
    s = sign
    unclipped = DashedLine(ax.c2p(0, 0), ax.c2p(2.0, 2.0 * s), color=GREY_B, stroke_width=3, dash_length=0.1)
    clipped = polyline([ax.c2p(0, (1 - EPS) * s), ax.c2p(1 - EPS, (1 - EPS) * s), ax.c2p(1 + EPS, (1 + EPS) * s),
                        ax.c2p(2.0, (1 + EPS) * s)], color=GREY_C, width=3)
    if s > 0:
        slope = polyline([ax.c2p(0, 0), ax.c2p(1 + EPS, 1 + EPS)], color=style.POLICY, width=8)
        flat = polyline([ax.c2p(1 + EPS, 1 + EPS), ax.c2p(2.0, 1 + EPS)], color=style.POLICY, width=8)
    else:
        slope = polyline([ax.c2p(2.0, -2.0), ax.c2p(1 - EPS, -(1 - EPS))], color=style.POLICY, width=8)
        flat = polyline([ax.c2p(1 - EPS, -(1 - EPS)), ax.c2p(0, -(1 - EPS))], color=style.POLICY, width=8)
    return unclipped, clipped, slope, flat


def lclip(r, sign):
    c = min(max(r, 1 - EPS), 1 + EPS)
    return min(r * sign, c * sign)


class Clip(VoiceScene):
    def construct(self):
        # 比の数直線に「はさみ」を入れる
        nl = NumberLine(x_range=[0, 2, 0.2], length=11, color=GREY_B, stroke_width=3, include_tip=False,
                        tick_size=0.06).move_to(DOWN * 0.4)
        nums = VGroup(*[mt(t, size=40, color=GREY_A).next_to(nl.n2p(x), DOWN, buff=0.25)
                        for x, t in [(0, "0"), (1, "1"), (2, "2")]])
        rt = ValueTracker(1.0)
        r_static = Dot(nl.n2p(1.0), radius=0.13, color=WHITE)
        r_name = mt("r", size=48).set_color(WHITE).next_to(r_static, UP, buff=0.25)
        with self.voice("そこで、PPOは、{A}比に、《はさみ》を入れます。比が、{B}[1−ε|イチマイナス、イプシロン]から、"
                        "[1+ε|イチプラス、イプシロン]の範囲を出たら、{C}切り落とすんです。{D}イプシロンは、よく0.2が使われます。") as v:
            self.play(Create(nl), FadeIn(nums), FadeIn(r_static, scale=0.5), FadeIn(r_name), run_time=1.2)
            self.wait_to(v, "A")
            cuts = VGroup(*[Line(nl.n2p(x) + DOWN * 0.45, nl.n2p(x) + UP * 0.45, stroke_color=RED, stroke_width=6)
                            for x in (1 - EPS, 1 + EPS)])
            self.sfx("hit")
            self.sfx("hit", offset=0.35)
            self.play(LaggedStart(*[Create(c) for c in cuts], lag_ratio=0.4), run_time=0.8)
            self.play(*[Flash(c.get_center(), color=RED, flash_radius=0.4, line_length=0.2) for c in cuts],
                      run_time=0.6)
            self.wait_to(v, "B")
            elabs = VGroup(mt(r"1-\epsilon", size=48, color=WHITE).next_to(cuts[0], UP, buff=0.15),
                           mt(r"1+\epsilon", size=48, color=WHITE).next_to(cuts[1], UP, buff=0.15))
            clipf = mt(r"\mathrm{clip}(r,\ 1-\epsilon,\ 1+\epsilon)", size=52, color=style.POLICY).move_to(UP * 2.4)
            self.play(FadeIn(elabs, shift=0.1 * DOWN), FadeOut(r_name), run_time=0.6)
            self.play(Write(clipf), run_time=0.9)
            # 動く r と、クリップされた値
            r_dot = always_redraw(lambda: Dot(nl.n2p(rt.get_value()), radius=0.13, color=WHITE))
            c_dot = always_redraw(lambda: Dot(nl.n2p(min(max(rt.get_value(), 1 - EPS), 1 + EPS)) + UP * 0.0,
                                              radius=0.17, color=style.POLICY).set_opacity(0.9))
            r_lab = always_redraw(lambda: mt("r", size=44).set_color(WHITE)
                                  .next_to(nl.n2p(rt.get_value()), DOWN, buff=0.3))
            self.remove(r_static)
            self.add(c_dot, r_dot, r_lab)
            self.play(FadeOut(nums), run_time=0.3)
            self.play(rt.animate.set_value(1.7), run_time=1.3)
            self.wait(0.3)
            self.play(rt.animate.set_value(0.35), run_time=1.6)
            self.wait_to(v, "C")
            outer = VGroup(Line(nl.n2p(0), nl.n2p(1 - EPS), stroke_color=GREY_D, stroke_width=8),
                           Line(nl.n2p(1 + EPS), nl.n2p(2), stroke_color=GREY_D, stroke_width=8))
            inner = Line(nl.n2p(1 - EPS), nl.n2p(1 + EPS), stroke_color=style.POLICY, stroke_width=8)
            self.play(Create(outer), Create(inner), rt.animate.set_value(1.0), run_time=0.9)
            self.wait_to(v, "D")
            for m in (r_dot, c_dot, r_lab):
                m.clear_updaters()
            nums2 = VGroup(*[mt(t, size=40, color=GREY_A).next_to(nl.n2p(x), DOWN, buff=0.55)
                             for x, t in [(0, "0"), (0.8, "0.8"), (1.2, "1.2"), (2, "2")]])
            epsv = mt(r"\epsilon = 0.2", size=52).move_to(DOWN * 2.4)
            self.play(FadeOut(r_lab), FadeIn(nums2), Write(epsv), run_time=0.9)
        self.play(FadeOut(VGroup(nl, cuts, elabs, outer, inner, nums2, epsv, r_dot, c_dot)),
                  clipf.animate.scale(0.7).set_opacity(0), run_time=0.8)
        self.remove(clipf)

        # 目的関数とグラフ
        L = mt(r"L^{\rm CLIP}(\theta)", "=", r"\mathbb{E}_t\Big[", r"\min", r"\big(", r"r_t(\theta)\,\hat{A}_t", ",",
               r"\ \mathrm{clip}(r_t(\theta),\,1-\epsilon,\,1+\epsilon)\,\hat{A}_t", r"\big)", r"\Big]", size=44)
        L.move_to(UP * 3.15)
        left = clip_plot(+1, LEFT * 3.5 + DOWN * 0.85)
        right = clip_plot(-1, RIGHT * 3.5 + DOWN * 0.7)
        axL, axR = left.ax, right.ax
        uL, cL, sL, fL = clip_lines(axL, +1)
        uR, cR, sR, fR = clip_lines(axR, -1)
        tL = VGroup(mt(r"\hat{A} > 0", size=40, color=POS), jt("良かった行動", size=30, color=POS)).arrange(DOWN, buff=0.12)
        tL.move_to(axL.c2p(0.55, 1.6))
        tR = VGroup(mt(r"\hat{A} < 0", size=40, color=NEG), jt("悪かった行動", size=30, color=NEG)).arrange(DOWN, buff=0.12)
        tR.move_to(axR.c2p(0.55, -1.6))

        with self.voice("グラフで見てみましょう。{A}アドバンテージがプラス、つまり、良かった行動の場合です。"
                        "{C}確率を上げるほど、目的関数は増えますが、{B}1.2倍を超えたところで、平らになります。"
                        "それ以上上げても、得をしない。") as v:
            self.play(Write(L), run_time=1.3)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(FadeIn(left), FadeIn(tL), run_time=0.8)
            self.play(Create(uL), run_time=0.8)
            self.wait_to(v, "C")
            ball = Dot(axL.c2p(1.0, 1.0), radius=0.14, color=WHITE)
            self.play(Create(sL), run_time=0.8)
            self.play(FadeIn(ball, scale=0.5), run_time=0.3)
            self.play(ball.animate.move_to(axL.c2p(1 + EPS, 1 + EPS)), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Create(fL), ball.animate.move_to(axL.c2p(1.85, 1 + EPS)), run_time=1.3)
            self.play(Indicate(left[4][2], color=WHITE, scale_factor=1.4), run_time=0.8)

        with self.voice("{A}アドバンテージがマイナス、つまり、悪かった行動の場合は、逆です。{C}確率を下げると得をしますが、"
                        "{B}0.8倍を下回ったところで、平らになります。") as v:
            self.sfx("pop")
            self.play(FadeIn(right), FadeIn(tR), run_time=0.8)
            self.play(Create(uR), run_time=0.8)
            self.wait_to(v, "C")
            ball2 = Dot(axR.c2p(1.0, -1.0), radius=0.14, color=WHITE)
            self.play(Create(sR), run_time=0.8)
            self.play(FadeIn(ball2, scale=0.5), run_time=0.3)
            self.play(ball2.animate.move_to(axR.c2p(1 - EPS, -(1 - EPS))), run_time=0.8)
            self.wait_to(v, "B")
            self.play(Create(fR), ball2.animate.move_to(axR.c2p(0.15, -(1 - EPS))), run_time=1.3)
            self.play(Indicate(right[4][0], color=WHITE, scale_factor=1.4), run_time=0.8)

        # 平らなところは勾配 0
        z1 = mt(r"\nabla = 0", size=40, color=RED).next_to(axL.c2p(1.6, 1 + EPS), UP, buff=0.35)
        z2 = mt(r"\nabla = 0", size=40, color=RED).next_to(axR.c2p(0.4, -(1 - EPS)), DOWN, buff=0.35)
        gL = Arrow(axL.c2p(0.45, 0.45), axL.c2p(0.95, 0.95), buff=0, color=POS, stroke_width=6,
                   max_tip_length_to_length_ratio=0.3).shift(0.22 * (LEFT + UP))
        gR = Arrow(axR.c2p(1.75, -1.75), axR.c2p(1.3, -1.3), buff=0, color=NEG, stroke_width=6,
                   max_tip_length_to_length_ratio=0.3).shift(0.22 * (RIGHT + UP))
        with self.voice("平らなところでは、{A}勾配が0なので、それ以上、方策は動きません。"
                        "{B}一回のデータで、確率を大きく変えすぎないように、自然とブレーキがかかるわけです。") as v:
            # カメラを「平らになる点」に寄せ、ボールが坂を登って平らな所で止まるのを見せる
            self.sfx("whoosh")
            self.play(self.focus_on(axL.c2p(1.15, 0.95), height=4.3), ball.animate.move_to(axL.c2p(0.3, 0.3)),
                      run_time=1.0)
            self.play(GrowArrow(gL), run_time=0.5)
            self.wait_to(v, "A")
            self.play(ball.animate.move_to(axL.c2p(1 + EPS, 1 + EPS)), run_time=0.8, rate_func=rate_functions.ease_in_sine)
            self.play(ball.animate.move_to(axL.c2p(1.45, 1 + EPS)), run_time=0.7, rate_func=rate_functions.ease_out_cubic)
            self.sfx("hit")
            self.play(FadeIn(z1, shift=0.1 * DOWN), fL.animate.set_color(RED),
                      Flash(ball.get_center(), color=RED, flash_radius=0.3, line_length=0.15), run_time=0.6)
            self.play(self.reset_frame(), run_time=0.9)
            self.play(GrowArrow(gR), FadeIn(z2, shift=0.1 * UP), fR.animate.set_color(RED), run_time=0.7)
            self.wait_to(v, "B")
            self.play(left[0].animate.set_fill(style.POLICY, 0.25), right[0].animate.set_fill(style.POLICY, 0.25),
                      run_time=0.8)
            self.play(left[0].animate.set_fill(GREY_B, 0.10), right[0].animate.set_fill(GREY_B, 0.10), run_time=0.8)

        # min をとる＝悲観的な見積もり
        shL = Polygon(axL.c2p(0, 0), axL.c2p(1 - EPS, 1 - EPS), axL.c2p(0, 1 - EPS), stroke_width=0,
                      fill_color=RED, fill_opacity=0.3)
        shR = Polygon(axR.c2p(1 + EPS, -(1 + EPS)), axR.c2p(2.0, -2.0), axR.c2p(2.0, -(1 + EPS)), stroke_width=0,
                      fill_color=RED, fill_opacity=0.3)
        lowL = jt("低い方を採用", size=28, color=RED).next_to(axL.c2p(0.4, 0.8), UP, buff=0.12)
        lowR = jt("低い方を採用", size=28, color=RED).next_to(axR.c2p(1.6, -1.2), UP, buff=0.12)
        with self.voice("マックスではなく、{A}《ミニマム》を取っているのもポイントです。{B}目的関数が得をする方向の変化だけを、切り落とす。"
                        "{C}悲観的に見積もることで、安全側に倒しているんです。") as v:
            self.play(FadeOut(VGroup(gL, gR)), run_time=0.4)
            self.wait_to(v, "A")
            self.play(L[3].animate.set_color(style.REWARD), Circumscribe(L[3], color=style.REWARD), run_time=1.0)
            self.play(Create(cL), Create(cR), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Indicate(fL, color=RED, scale_factor=1.05), Indicate(fR, color=RED, scale_factor=1.05),
                      Indicate(z1), Indicate(z2), run_time=1.2)
            self.wait_to(v, "C")
            self.sfx("sparkle")
            self.play(FadeIn(shL), FadeIn(shR), FadeIn(lowL), FadeIn(lowR), run_time=1.0)

        plots = VGroup(left, right, uL, cL, sL, fL, uR, cR, sR, fR, tL, tR, ball, ball2, z1, z2, shL, shR, lowL, lowR)
        self.play(FadeOut(plots), FadeOut(L), run_time=0.8)

        # 同じデータで何エポックも更新したときの比の広がり（実際に計算）
        h_free = ppo_ratio_epochs(clip=False)
        h_clip = ppo_ratio_epochs(clip=True)
        E = len(h_free) - 1
        axis = NumberLine(x_range=[0, 2.2, 0.2], length=10.4, color=GREY_B, stroke_width=2.5, include_tip=False,
                          tick_size=0.05).move_to(RIGHT * 1.0 + DOWN * 2.55)
        tick_labs = VGroup(*[mt(t, size=30, color=GREY_A).next_to(axis.n2p(x), DOWN, buff=0.18)
                             for x, t in [(0, "0"), (0.8, "0.8"), (1, "1"), (1.2, "1.2"), (2, "2")]])
        r_ax = mt("r", size=40).set_color(WHITE).next_to(axis, RIGHT, buff=0.15)
        ys = {"free": 0.95, "clip": -1.05}
        band = Rectangle(width=axis.n2p(1.2)[0] - axis.n2p(0.8)[0], height=4.9, stroke_width=0,
                         fill_color=style.POLICY, fill_opacity=0.14).move_to([axis.n2p(1.0)[0], -0.05, 0])
        one = DashedLine([axis.n2p(1)[0], 2.4, 0], [axis.n2p(1)[0], -2.45, 0], color=GREY_C, stroke_width=2)
        lab_free = jt("クリップなし", size=32, color=GREY_B).move_to([-5.4, ys["free"], 0])
        lab_clip = jt("PPO", size=40, color=style.POLICY, weight="BOLD").move_to([-5.4, ys["clip"], 0])
        rng = np.random.default_rng(4)
        jit = rng.uniform(-0.55, 0.55, len(h_free[0]))

        def dots_at(hist, ep, y, color):
            return VGroup(*[Dot([axis.n2p(min(r, 2.2))[0], y + j, 0], radius=0.07, color=color).set_opacity(0.85)
                            for r, j in zip(hist[ep], jit)])
        d_free = dots_at(h_free, 0, ys["free"], GREY_B)
        d_clip = dots_at(h_clip, 0, ys["clip"], style.POLICY)
        ep_lab = jt("同じデータでの更新", size=30, color=GREY_B)
        ep_num = Integer(0, font_size=48, color=WHITE)
        ep_unit = jt("回目", size=30, color=GREY_B)
        ep = VGroup(ep_lab, ep_num, ep_unit).arrange(RIGHT, buff=0.2).move_to(UP * 3.0)
        ep_unit.add_updater(lambda m: m.next_to(ep_num, RIGHT, buff=0.2))
        with self.voice("これで、同じデータで、何回か勾配を計算し直しても、{A}方策は、古い方策の近くにとどまります。"
                        "{B}PPOは、実装が簡単で、しかも安定していることから、強化学習の定番になりました。") as v:
            self.play(Create(axis), FadeIn(tick_labs), FadeIn(r_ax), FadeIn(band), Create(one), FadeIn(lab_free),
                      FadeIn(lab_clip), FadeIn(ep), FadeIn(d_free), FadeIn(d_clip), run_time=0.9)
            per = max(0.22, (v.until("A") - 0.2) / E)
            for e in range(1, E + 1):
                if e % 2 == 1:
                    self.sfx("tick")
                self.play(Transform(d_free, dots_at(h_free, e, ys["free"], GREY_B)),
                          Transform(d_clip, dots_at(h_clip, e, ys["clip"], style.POLICY)),
                          ep_num.animate.set_value(e), run_time=per)
            self.wait_to(v, "A")
            near = jt("古い方策の近く", size=34, color=style.POLICY).move_to([4.4, ys["clip"], 0])
            self.sfx("sparkle")
            self.play(Indicate(d_clip, color=style.POLICY, scale_factor=1.05), FadeIn(near, shift=0.1 * DOWN),
                      run_time=1.0)
            self.wait_to(v, "B")
            cite = jt("PPO：Schulman ら（2017）", size=28, color=GREY_B).to_corner(DR, buff=0.35)
            cite.shift(0.0 * UP)
            self.play(FadeIn(cite), run_time=0.8)
        fade_all(self)


# ---------------------------------------------------------------------------
# 6. GAE
# ---------------------------------------------------------------------------
class GAE(VoiceScene):
    def construct(self):
        traj, deltas, V, g_minus_v = gae_example()
        gamma = WORLD.gamma
        T = len(deltas)

        # 第3章の復習：TD（1歩先）とモンテカルロ（最後まで）
        g = GridView(WORLD, cell=0.95).move_to(LEFT * 3.7 + DOWN * 0.3)
        robot = Robot(height=0.45).move_to(g.center_of(traj[0][0]))
        states = [traj[0][0]] + [x[3] for x in traj]
        pts = VGroup(*[Dot(radius=0.11, color=style.STATE) for _ in states]).arrange(RIGHT, buff=0.55)
        pts.move_to(RIGHT * 3.4 + DOWN * 0.6)
        pts[-1].set_color(RED)
        s_labs = VGroup(mt("s_t", size=36, color=style.STATE).next_to(pts[0], LEFT, buff=0.2), VMobject())
        end_lab = jt("終わり", size=28, color=RED).next_to(pts[-1], DOWN, buff=0.2)
        segs = VGroup(*[Line(a.get_center(), b.get_center(), stroke_color=GREY_D, stroke_width=3)
                        for a, b in zip(pts[:-1], pts[1:])])
        td_arc = ArcBetweenPoints(pts[0].get_center() + DOWN * 0.2, pts[1].get_center() + DOWN * 0.2, angle=PI * 0.8,
                                  color=style.VALUE, stroke_width=5)
        mc_arc = ArcBetweenPoints(pts[0].get_center() + UP * 0.2, pts[-1].get_center() + UP * 0.2, angle=-PI * 0.55,
                                  color=style.REWARD, stroke_width=5)
        mid_arc = DashedVMobject(ArcBetweenPoints(pts[0].get_center() + UP * 0.2, pts[3].get_center() + UP * 0.2,
                                                  angle=-PI * 0.7, color=WHITE, stroke_width=4), num_dashes=16)
        td_t = jt("TD", size=34, color=style.VALUE).next_to(td_arc, DOWN, buff=0.1)
        mc_t = jt("モンテカルロ", size=34, color=style.REWARD).next_to(mc_arc, UP, buff=0.1)
        mid_t = jt("？", size=44, color=WHITE).next_to(mid_arc, UP, buff=0.05)
        with self.voice("アドバンテージの見積もり方も、一つ紹介しておきます。{A}第3章で、TDとモンテカルロの間を取る方法がある、"
                        "と言いました。") as v:
            self.play(FadeIn(g), FadeIn(robot), FadeIn(pts[0]), FadeIn(s_labs[0]), run_time=0.8)
            trail = VGroup()
            for i, (s, a, r, n) in enumerate(traj):
                seg = Line(g.center_of(s), g.center_of(n), stroke_color=GREY_B, stroke_width=4)
                trail.add(seg)
                self.add(seg, robot)
                anims = [Create(seg), Create(segs[i]), FadeIn(pts[i + 1])]
                if n in WORLD.terminals:
                    anims.append(robot.animate.move_to(g.center_of(n)).scale(0.3).set_opacity(0))
                else:
                    anims.append(robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)))
                self.play(*anims, run_time=0.3)
            self.play(FadeIn(s_labs[1]), FadeIn(end_lab), run_time=0.4)
            self.wait_to(v, "A")
            self.play(Create(td_arc), FadeIn(td_t), run_time=0.7)
            self.play(Create(mc_arc), FadeIn(mc_t), run_time=0.9)
            self.play(Create(mid_arc), FadeIn(mid_t), run_time=0.7)
        self.play(FadeOut(VGroup(g, trail, robot, pts, s_labs, end_lab, segs, td_arc, mc_arc, mid_arc, td_t, mc_t,
                                 mid_t)), run_time=0.7)

        # δ の棒に (γλ)^l を掛けて足す
        F = mt(r"\hat{A}_t", "=", r"\sum_{l\ge 0}", r"(\gamma\lambda)^l", r"\,\delta_{t+l}", size=52)
        F[0].set_color(style.ADV)
        F[3].set_color(style.GAMMA)
        F.to_corner(UL, buff=0.4)
        dd = mt(r"\delta_t", "=", r"r_{t+1}", "+", r"\gamma", r"V(s_{t+1})", "-", r"V(s_t)", size=36)
        dd[2].set_color(style.REWARD)
        dd[4].set_color(style.GAMMA)
        dd[5].set_color(style.VALUE)
        dd[7].set_color(style.VALUE)
        dd.to_corner(UR, buff=0.5)

        slot, x0 = 1.0, -4.9
        base_d, sc_d = 1.05, 1.35      # δ の棒
        base_w, sc_w = -2.3, 1.1       # 重みの棒
        lam = ValueTracker(0.9)
        mix = ValueTracker(0.0)

        def xs(l):
            return x0 + slot * (l + 0.5)

        def weights():
            m = mix.get_value()
            return [(1 - m) + m * (gamma * lam.get_value()) ** l for l in range(T)]

        def bar(x, base, h, color, width=0.5, opacity=0.9, stroke=0):
            h = h if abs(h) > 1e-3 else 1e-3
            r = Rectangle(width=width, height=abs(h), stroke_width=stroke, stroke_color=color, fill_color=color,
                          fill_opacity=opacity)
            return r.move_to([x, base + h / 2, 0])

        outlines = VGroup(*[bar(xs(l), base_d, d * sc_d, GREY_B, opacity=0.0, stroke=2) for l, d in enumerate(deltas)])
        d_axis = Line([x0, base_d, 0], [x0 + slot * T, base_d, 0], stroke_color=GREY_C, stroke_width=2)
        w_axis = Line([x0, base_w, 0], [x0 + slot * T, base_w, 0], stroke_color=GREY_C, stroke_width=2)
        d_labs = VGroup(*[mt(r"\delta_{t}" if l == 0 else rf"\delta_{{t+{l}}}", size=30, color=GREY_A)
                          .move_to([xs(l), base_d + 0.55, 0]) for l in range(T)])
        row_d = jt("TD誤差", size=28, color=GREY_B).next_to(d_axis, LEFT, buff=0.25)
        row_w = mt(r"(\gamma\lambda)^l", size=34, color=style.GAMMA).next_to(w_axis, LEFT, buff=0.2).shift(0.35 * UP)

        def make_dbars():
            w = weights()
            return VGroup(*[bar(xs(l), base_d, w[l] * d * sc_d, POS if d > 0 else NEG) for l, d in enumerate(deltas)])

        def make_wbars():
            w = weights()
            return VGroup(*[bar(xs(l), base_w, w[l] * sc_w, style.GAMMA, width=0.4) for l in range(T)])

        def a_value():
            w = weights()
            return float(sum(wi * d for wi, d in zip(w, deltas)))

        # 右側：合計 Â と λ のつまみ
        read_lab = mt(r"\hat{A}_t", "=", size=52)
        read_lab[0].set_color(style.ADV)
        read_num = DecimalNumber(a_value(), num_decimal_places=2, include_sign=True, font_size=56)
        readout = VGroup(read_lab, read_num).arrange(RIGHT, buff=0.2).move_to(RIGHT * 4.55 + UP * 1.35)
        sl_x0, sl_x1, sl_y = 3.0, 6.1, -0.35
        slider = Line([sl_x0, sl_y, 0], [sl_x1, sl_y, 0], stroke_color=GREY_B, stroke_width=4)
        sl_lab = mt(r"\lambda", size=44).next_to(slider, LEFT, buff=0.25)
        sl_0 = mt("0", size=30, color=GREY_A).next_to(slider.get_start(), DOWN, buff=0.18)
        sl_1 = mt("1", size=30, color=GREY_A).next_to(slider.get_end(), DOWN, buff=0.18)
        td_end = jt("TD", size=30, color=style.VALUE).next_to(slider.get_start(), UP, buff=0.22)
        mc_end = jt("MC", size=30, color=style.REWARD).next_to(slider.get_end(), UP, buff=0.22)

        def make_knob():
            x = sl_x0 + (sl_x1 - sl_x0) * lam.get_value()
            return Circle(radius=0.15, fill_color=WHITE, fill_opacity=1, stroke_width=0).move_to([x, sl_y, 0])

        # 第3章のヒストグラム（MC は幅広、TD は幅狭）
        mc, td, v_true = mc_td_targets()

        def hist(samples, color, center, w=1.9, h=1.2, bins=16, lo=-1.0, hi=1.0):
            cnt, edges = np.histogram(samples, bins=bins, range=(lo, hi))
            cnt = cnt / cnt.max()
            bw = w / bins
            grp = VGroup()
            for i, c in enumerate(cnt):
                if c <= 0:
                    continue
                grp.add(Rectangle(width=bw * 0.9, height=c * h, stroke_width=0, fill_color=color, fill_opacity=0.85)
                        .move_to(center + np.array([-w / 2 + bw * (i + 0.5), c * h / 2, 0])))
            base = Line(center + LEFT * w / 2, center + RIGHT * w / 2, stroke_color=GREY_C, stroke_width=2)
            vx = center[0] - w / 2 + w * (v_true - lo) / (hi - lo)
            vline = DashedLine([vx, center[1], 0], [vx, center[1] + h + 0.1, 0], color=WHITE, stroke_width=2)
            return VGroup(base, grp, vline)
        h_td = hist(td, style.VALUE, np.array([3.55, -2.75, 0]))
        h_mc = hist(mc, style.REWARD, np.array([5.65, -2.75, 0]))
        h_note = jt("目標のばらつき（第3章）", size=26, color=GREY_B).move_to(RIGHT * 4.55 + DOWN * 3.4)

        with self.voice("一歩ごとのTD誤差を、{A}先の方ほど、ガンマ・ラムダ倍ずつ小さくして、足し合わせます。"
                        "{B}ラムダが0なら、最初の一歩だけ。つまりTD。{C}ラムダが1なら、最後まで全部。つまりモンテカルロ。"
                        "{D}[その間|そのあいだ]で、ばらつきと偏りのバランスを取ります。") as v:
            dbars = make_dbars()
            self.play(Write(F), FadeIn(dd), Create(d_axis), FadeIn(row_d), run_time=0.9)
            self.play(LaggedStart(*[GrowFromEdge(b, UP if d < 0 else DOWN) for b, d in zip(dbars, deltas)],
                                  lag_ratio=0.1), FadeIn(d_labs), run_time=max(0.6, v.until("A") - 0.9))
            self.wait_to(v, "A")
            self.add(outlines)
            wbars = make_wbars()
            self.play(Create(w_axis), FadeIn(row_w), FadeIn(wbars), run_time=0.6)
            dbars.add_updater(lambda m: m.become(make_dbars()))
            wbars.add_updater(lambda m: m.become(make_wbars()))
            read_num.add_updater(lambda m: m.set_value(a_value()))
            self.play(mix.animate.set_value(1.0), run_time=1.6)
            arrow = CurvedArrow(dbars.get_right() + RIGHT * 0.2 + UP * 0.3, readout.get_left() + LEFT * 0.15,
                                angle=-0.6, color=GREY_B, stroke_width=4)
            sig = mt(r"\sum", size=40, color=GREY_B).next_to(arrow, UP, buff=0.05)
            knob = make_knob()
            self.play(Create(arrow), FadeIn(sig), FadeIn(readout), run_time=0.8)
            self.play(Create(slider), FadeIn(sl_lab), FadeIn(sl_0), FadeIn(sl_1), FadeIn(knob), FadeIn(td_end),
                      FadeIn(mc_end), run_time=0.8)
            knob.add_updater(lambda m: m.become(make_knob()))
            self.wait_to(v, "B")
            self.play(lam.animate.set_value(0.0), run_time=1.5)
            self.play(Indicate(td_end, color=style.VALUE), FadeIn(h_td, shift=0.1 * UP), run_time=0.8)
            self.wait_to(v, "C")
            self.play(lam.animate.set_value(1.0), run_time=1.8)
            gv = mt(r"= G_t - V(s_t)", size=40, color=GREY_A).next_to(readout, DOWN, buff=0.25)
            self.play(Indicate(mc_end, color=style.REWARD), FadeIn(h_mc, shift=0.1 * UP), FadeIn(gv), run_time=0.8)
            self.wait_to(v, "D")
            self.play(lam.animate.set_value(0.9), FadeOut(gv), FadeIn(h_note), run_time=1.3)
        for m in (dbars, wbars, read_num, knob):
            m.clear_updaters()

        chart = VGroup(dbars, wbars, outlines, d_axis, w_axis, d_labs, row_d, row_w, readout, arrow, sig, slider,
                       sl_lab, sl_0, sl_1, knob, td_end, mc_end, h_td, h_mc, h_note, dd)
        F2 = F.copy().scale(1.25).move_to(UP * 1.2)
        box = SurroundingRectangle(F2, color=style.ADV, buff=0.25, corner_radius=0.1)
        name = VGroup(jt("一般化アドバンテージ推定", size=40, color=WHITE), jt("（GAE）", size=40, color=WHITE))
        name.arrange(RIGHT, buff=0.1).next_to(box, DOWN, buff=0.5)
        combo = token_chip("PPO ＋ GAE", size=44, color=style.REWARD, stroke=style.REWARD).next_to(name, DOWN, buff=0.5)
        with self.voice("これを、一般化アドバンテージ推定、{A}GAEと呼びます。PPOと組み合わせて使うのが、定番です。") as v:
            self.play(FadeOut(chart), Transform(F, F2), run_time=0.9)
            self.play(Create(box), run_time=0.6)
            self.wait_to(v, "A")
            self.play(FadeIn(name, shift=0.1 * RIGHT), run_time=0.7)
            self.play(FadeIn(combo, shift=0.1 * UP), run_time=0.7)
        fade_all(self)


# ---------------------------------------------------------------------------
# 7. RLHF の流れ
# ---------------------------------------------------------------------------
def stage_box(num, title, sub, icon, color, w=2.75, h=2.6):
    box = RoundedRectangle(width=w, height=h, corner_radius=0.2, stroke_color=GREY_D, stroke_width=2.5,
                           fill_color=PANEL_FILL, fill_opacity=1)
    badge = VGroup(Circle(radius=0.22, stroke_width=0, fill_color=GREY_D, fill_opacity=1),
                   mt(str(num), size=30, color=WHITE))
    badge.move_to(box.get_corner(UL) + np.array([0.32, -0.32, 0]))
    icon.move_to(box.get_center() + UP * 0.45)
    t = jt(title, size=34, color=WHITE).move_to(box.get_center() + DOWN * 0.55)
    s = jt(sub, size=26, color=GREY_B).next_to(t, DOWN, buff=0.14)
    veil = RoundedRectangle(width=w - 0.08, height=h - 0.08, corner_radius=0.18, stroke_width=0,
                            fill_color=style.BG, fill_opacity=0.7).move_to(box)
    g = VGroup(box, badge, icon, t, s, veil)
    g.box, g.badge, g.icon, g.title, g.sub, g.hue, g.veil = box, badge, icon, t, s, color, veil
    return g


def light(stage):
    return AnimationGroup(stage.box.animate.set_stroke(stage.hue, 4),
                          stage.badge[0].animate.set_fill(stage.hue, 1),
                          stage.badge[1].animate.set_color(BLACK),
                          stage.veil.animate.set_fill(opacity=0))


def sft_icon():
    p = person_icon(0.75)
    b = bubble("…", size=26, pad=(0.25, 0.1), fill=USER_FILL).next_to(p, RIGHT, buff=0.12).shift(0.25 * UP)
    return VGroup(p, b)


def pref_icon():
    a = RoundedRectangle(width=0.8, height=0.55, corner_radius=0.1, stroke_color=GREY_B, stroke_width=2,
                         fill_color=BOT_FILL, fill_opacity=1)
    b = a.copy()
    ta = mt("A", size=30).move_to(a)
    tb = mt("B", size=30).move_to(b)
    A = VGroup(a, ta)
    B = VGroup(b, tb)
    VGroup(A, B).arrange(RIGHT, buff=0.35)
    ck = check_mark(0.45, color=POS, width=6).next_to(A, UP, buff=0.08)
    return VGroup(A, B, ck)


def rl_icon():
    r = Robot(height=0.5)
    loop = loop_arrow(radius=0.55, color=style.POLICY, width=4).move_to(r)
    return VGroup(loop, r)


class RLHF_Pipeline(VoiceScene):
    def construct(self):
        title = jt("RLHF", size=56, color=WHITE, weight="BOLD")
        sub = jt("人間のフィードバックからの強化学習", size=30, color=GREY_B)
        head = VGroup(title, sub).arrange(RIGHT, buff=0.45, aligned_edge=DOWN).to_edge(UP, buff=0.4)
        stages = VGroup(
            stage_box(1, "事前学習", "次の単語を予測", doc_stack(4, w=0.62, h=0.8), GREY_A),
            stage_box(2, "SFT", "お手本で学習", sft_icon(), style.STATE),
            stage_box(3, "報酬モデル", "人の好みを学ぶ", pref_icon(), style.REWARD),
            stage_box(4, "強化学習", "PPO で最適化", rl_icon(), style.POLICY),
        ).arrange(RIGHT, buff=0.6).move_to(UP * 0.85)
        arrows = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.06, color=GREY_B, stroke_width=4,
                                max_tip_length_to_length_ratio=0.35) for a, b in zip(stages[:-1], stages[1:])])

        with self.voice("いよいよ、言語モデルです。人間のフィードバックからの強化学習、{A}[RLHF|アールエルエイチエフ]の流れは、"
                        "こうなっています。") as v:
            self.play(FadeIn(sub, shift=0.1 * DOWN), run_time=0.8)
            self.wait_to(v, "A")
            self.play(Write(title), run_time=0.7)
            self.play(LaggedStart(*[FadeIn(m) for m in [stages[0], arrows[0], stages[1], arrows[1], stages[2],
                                                        arrows[2], stages[3]]], lag_ratio=0.2), run_time=1.6)

        br = Brace(VGroup(stages[0], stages[1]), DOWN, color=GREY_B, buff=0.15)
        br_t = jt("ここまでは教師あり学習", size=30, color=GREY_B).next_to(br, DOWN, buff=0.12)
        with self.voice("まず、{A}大量の文章で事前学習したモデルを、{B}人が書いたお手本の回答で、教師あり学習します。"
                        "ここまでは、おなじみの世界です。") as v:
            self.wait_to(v, "A")
            self.play(light(stages[0]), run_time=0.8)
            self.wait_to(v, "B")
            self.play(light(stages[1]), arrows[0].animate.set_color(WHITE), run_time=0.8)
            self.play(GrowFromCenter(br), FadeIn(br_t), run_time=0.8)

        # 「良い回答」は一つに決まらない → 二つを比べるなら判断できる
        user = person_icon(0.5).move_to(LEFT * 6.3 + DOWN * 2.2)
        qb = bubble("短い詩を書いて", size=28, fill=USER_FILL, pad=(0.3, 0.25)).next_to(user, RIGHT, buff=0.15)
        qb.shift(0.2 * UP)
        poems = ["春の風\n窓をたたく", "夜の海\n月ひとつ", "雨の音\n数えて眠る"]
        answers = VGroup(*[bubble(t, size=28, line_spacing=0.8, pad=(0.3, 0.25)) for t in poems])
        answers.arrange(RIGHT, buff=0.25).move_to(DOWN * 2.6).align_to(RIGHT * 6.45, RIGHT)
        qms = VGroup(*[jt("？", size=40, color=GREY_A).next_to(a, UP, buff=0.1) for a in answers])
        with self.voice("問題は、その先です。「良い回答」には、{A}正解が一つに決まりません。"
                        "{B}でも、二つの回答を見比べて、どちらが良いかなら、人は判断できます。") as v:
            self.play(FadeOut(VGroup(br, br_t)), FadeIn(user), FadeIn(qb, shift=0.1 * RIGHT), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(a, shift=0.1 * UP) for a in answers], lag_ratio=0.3), run_time=1.4)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(q, scale=0.6) for q in qms], lag_ratio=0.15), run_time=0.8)
            self.wait_to(v, "B")
            A, B = answers[0], answers[2]
            la = mt("A", size=40).next_to(A, UP, buff=0.12)
            lb = mt("B", size=40).next_to(B, UP, buff=0.12)
            judge = person_icon(0.7).move_to(answers[1])
            ck = check_mark(0.55, color=POS).next_to(la, RIGHT, buff=0.15)
            vs = mt(r"A \succ B", size=44).next_to(judge, UP, buff=0.2)
            self.play(FadeOut(qms), FadeOut(answers[1]), FadeIn(la), FadeIn(lb), run_time=0.6)
            self.play(FadeIn(judge, shift=0.1 * UP), run_time=0.5)
            self.play(Create(ck), FadeIn(vs), A.box.animate.set_stroke(POS, 3), run_time=0.8)

        comp = VGroup(A, B, la, lb, judge, ck, vs)
        reward_arc = CurvedArrow(stages[2].get_top() + UP * 0.05, stages[3].get_top() + UP * 0.05, angle=-0.9,
                                 color=style.REWARD, stroke_width=5)
        r_lab = jt("報酬", size=30, color=style.REWARD).next_to(reward_arc, UP, buff=0.05)
        cite = jt("InstructGPT（Ouyang ら, 2022）の構成", size=26, color=GREY_C).to_corner(DR, buff=0.35)
        with self.voice("そこで、{A}人の好みを学んだ、報酬モデルを作り、{B}それを報酬にして、強化学習をします。") as v:
            self.wait_to(v, "A")
            self.play(light(stages[2]), arrows[1].animate.set_color(WHITE),
                      comp.animate.scale(0.35).move_to(stages[2].icon).set_opacity(0), FadeOut(VGroup(user, qb)),
                      run_time=1.0)
            self.remove(comp)
            self.wait_to(v, "B")
            self.play(light(stages[3]), arrows[2].animate.set_color(WHITE), Create(reward_arc), FadeIn(r_lab),
                      run_time=1.0)
            self.play(Rotate(stages[3].icon[0], -2 * PI, about_point=stages[3].icon[1].get_center()), FadeIn(cite),
                      run_time=1.2)
        fade_all(self)


# ---------------------------------------------------------------------------
# 8. 報酬モデル（ブラッドリー・テリー）
# ---------------------------------------------------------------------------
class RewardModel(VoiceScene):
    def construct(self):
        q = bubble("おすすめの勉強法は？", size=32, fill=USER_FILL).move_to(LEFT * 3.6 + UP * 3.0)
        A = bubble("毎日少しずつ、\n声に出して復習しよう。", size=30, line_spacing=0.8).move_to(LEFT * 3.35 + UP * 1.4)
        B = bubble("がんばってください。", size=30).move_to(LEFT * 3.35 + DOWN * 0.45)
        B.align_to(A, LEFT)
        judge = person_icon(0.8).move_to(LEFT * 6.15 + UP * 0.5)
        ck = check_mark(0.5, color=POS).move_to(A.box.get_corner(UR) + np.array([-0.05, 0.05, 0]))
        yw = mt("y_w", size=40, color=POS).next_to(A, DOWN, buff=0.08).align_to(A, RIGHT)
        yl = mt("y_l", size=40, color=NEG).next_to(B, DOWN, buff=0.08).align_to(B, RIGHT)
        with self.voice("報酬モデルの学習は、{A}比較のデータから行います。{B}同じ質問への二つの回答と、{C}人が選んだ方。") as v:
            self.play(FadeIn(q, shift=0.1 * DOWN), run_time=0.7)
            self.wait_to(v, "B")
            self.play(FadeIn(A, shift=0.1 * RIGHT), FadeIn(B, shift=0.1 * RIGHT), run_time=0.8)
            self.wait_to(v, "C")
            self.play(FadeIn(judge), run_time=0.4)
            self.play(Create(ck), A.box.animate.set_stroke(POS, 3), FadeIn(yw), FadeIn(yl), run_time=0.7)

        # 報酬モデル → スコア → 差 → シグモイド
        rm = RoundedRectangle(width=2.5, height=2.5, corner_radius=0.2, stroke_color=style.REWARD, stroke_width=3,
                              fill_color=PANEL_FILL, fill_opacity=1).move_to(RIGHT * 0.75 + UP * 0.5)
        rm_net = mini_net((3, 4, 1), width=1.3, height=0.9).move_to(rm.get_center() + UP * 0.55)
        rm_t = jt("報酬モデル", size=30, color=WHITE).move_to(rm.get_center() + DOWN * 0.35)
        rm_s = mt(r"r_\phi", size=40, color=style.REWARD).next_to(rm_t, DOWN, buff=0.12)
        RM = VGroup(rm, rm_net, rm_t, rm_s)
        ina = Arrow(A.get_right(), rm.get_left() + UP * 0.6, buff=0.1, color=GREY_B, stroke_width=4)
        inb = Arrow(B.get_right(), rm.get_left() + DOWN * 0.6, buff=0.1, color=GREY_B, stroke_width=4)
        sA, sB = 1.8, -0.6
        numA = DecimalNumber(sA, num_decimal_places=1, include_sign=True, font_size=56, color=style.REWARD)
        numB = DecimalNumber(sB, num_decimal_places=1, include_sign=True, font_size=56, color=style.REWARD)
        numA.move_to(RIGHT * 2.85 + UP * 1.25)
        numB.move_to(RIGHT * 2.85 + DOWN * 0.25)
        outa = Arrow(rm.get_right() + UP * 0.6, numA.get_left(), buff=0.08, color=GREY_B, stroke_width=3)
        outb = Arrow(rm.get_right() + DOWN * 0.6, numB.get_left(), buff=0.08, color=GREY_B, stroke_width=3)

        sax = Axes(x_range=[-4, 4, 2], y_range=[0, 1, 0.5], x_length=2.9, y_length=2.6,
                   axis_config=dict(color=GREY_B, stroke_width=2, include_tip=False, include_ticks=False),
                   tips=False).move_to(RIGHT * 5.2 + UP * 0.4)
        s_curve = sax.plot(lambda x: float(sigmoid(x)), x_range=[-4, 4, 0.05], color=WHITE, stroke_width=4)
        s_name = mt(r"\sigma", size=44).next_to(sax, UP, buff=0.1)
        one_lab = mt("1", size=28, color=GREY_B).next_to(sax.c2p(0, 1), LEFT, buff=0.08)
        zero_lab = mt("0", size=28, color=GREY_B).next_to(sax.c2p(0, 0), DOWN, buff=0.1)
        diff = ValueTracker(sA - sB)
        d_lab = VGroup(jt("差", size=34, color=GREY_A),
                       DecimalNumber(sA - sB, num_decimal_places=1, font_size=48, color=WHITE))
        d_lab.arrange(RIGHT, buff=0.15).next_to(sax, DOWN, buff=0.3)
        p_lab = VGroup(mt("P", size=48, color=POS), mt("=", size=48),
                       DecimalNumber(float(sigmoid(sA - sB)), num_decimal_places=2, font_size=48, color=POS))
        p_lab.arrange(RIGHT, buff=0.12).next_to(sax, UP, buff=0.15).shift(0.5 * RIGHT)

        def pt():
            x = diff.get_value()
            return VGroup(
                DashedLine(sax.c2p(x, 0), sax.c2p(x, float(sigmoid(x))), color=style.REWARD, stroke_width=2.5),
                DashedLine(sax.c2p(x, float(sigmoid(x))), sax.c2p(0, float(sigmoid(x))), color=POS, stroke_width=2.5),
                Dot(sax.c2p(x, float(sigmoid(x))), radius=0.09, color=POS))
        bt = mt(r"P(y_w \succ y_l)", "=", r"\sigma\big(", r"r_\phi(x, y_w)", "-", r"r_\phi(x, y_l)", r"\big)", size=48)
        bt[3].set_color(style.REWARD)
        bt[5].set_color(style.REWARD)
        bt.move_to(DOWN * 2.35)
        bt_name = jt("ブラッドリー・テリー・モデル", size=32, color=WHITE).next_to(bt, DOWN, buff=0.3)
        with self.voice("報酬モデルは、{A}回答ごとに、一つの数字、スコアを出します。{B}二つのスコアの差を、シグモイド関数に通したものを、"
                        "{C}「人がこちらを選ぶ確率」とみなします。"
                        "{D}ブラッドリー・テリー・モデルと呼ばれる、スポーツのレーティングなどでも使われる考え方です。") as v:
            self.play(FadeIn(RM), GrowArrow(ina), GrowArrow(inb), run_time=0.9)
            self.wait_to(v, "A")
            self.play(Indicate(rm_net, color=style.REWARD), GrowArrow(outa), GrowArrow(outb), FadeIn(numA),
                      FadeIn(numB), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Create(sax), Create(s_curve), FadeIn(s_name), FadeIn(one_lab), FadeIn(zero_lab), run_time=1.0)
            self.play(TransformFromCopy(VGroup(numA, numB), d_lab), run_time=0.9)
            p = pt()
            self.play(Create(p[0]), FadeIn(p[2]), run_time=0.6)
            self.wait_to(v, "C")
            self.play(Create(p[1]), FadeOut(s_name), FadeIn(p_lab), run_time=0.8)
            self.play(Write(bt), run_time=1.2)
            self.wait_to(v, "D")
            self.play(FadeIn(bt_name, shift=0.1 * UP), run_time=0.7)

        loss = mt(r"L_{\rm RM}", "=", r"-\log", r"\sigma\big(", r"r_\phi(x, y_w)", "-", r"r_\phi(x, y_l)", r"\big)", size=48)
        loss[4].set_color(style.REWARD)
        loss[6].set_color(style.REWARD)
        loss.move_to(bt)
        ce = jt("交差エントロピー", size=32, color=WHITE).move_to(bt_name)
        self.add(p)
        with self.voice("あとは、人が選んだ方の確率が高くなるように、{A}交差エントロピーで学習するだけ。"
                        "{B}スコアの絶対値ではなく、差だけが意味を持つ、というのがポイントです。") as v:
            self.play(TransformMatchingTex(bt, loss), FadeOut(bt_name), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(ce), run_time=0.5)
            p.add_updater(lambda m: m.become(pt()))
            d_lab[1].add_updater(lambda m: m.set_value(diff.get_value()))
            p_lab[2].add_updater(lambda m: m.set_value(float(sigmoid(diff.get_value()))))
            self.play(ChangeDecimalToValue(numA, 2.3), ChangeDecimalToValue(numB, -1.0), diff.animate.set_value(3.3),
                      run_time=1.3)
            self.wait_to(v, "B")
            self.play(ChangeDecimalToValue(numA, 5.3), ChangeDecimalToValue(numB, 2.0), run_time=1.4)
            self.play(Indicate(d_lab, color=WHITE), run_time=0.8)
        for m in (p, d_lab[1], p_lab[2]):
            m.clear_updaters()
        fade_all(self)


# ---------------------------------------------------------------------------
# 9. トークン単位の MDP
# ---------------------------------------------------------------------------
TOK6 = ["毎日", "少し", "ずつ", "復習", "する", "。"]
V_TOK = [0.8, 1.4, 0.9, 1.0, 1.3, 1.1]      # クリティックの見積もり（学習途中の例）
RM_SCORE = 1.3
KL_TOK = [0.02, 0.05, 0.01, 0.03, 0.04, 0.02]  # β log(π_θ/π_ref) の例


class TokenMDP(VoiceScene):
    def construct(self):
        slot, x0 = 1.7, -3.9
        xs = [x0 + slot * (i + 0.5) for i in range(len(TOK6))]
        y_tok, y_rew, y_v0, y_v1, y_adv = 1.4, 0.15, -1.75, -0.8, -2.65
        prompt = token_chip("おすすめの勉強法は？", size=34, stroke=GREY_B).move_to(UP * 2.9)
        prompt.align_to(LEFT * 6.4, LEFT)
        toks = VGroup(*[token_chip(t, size=40, stroke=GREY_C).move_to([x, y_tok, 0]) for t, x in zip(TOK6, xs)])
        lab_x = -5.55
        with self.voice("強化学習の部分を、第1章の言葉で書き直してみましょう。{A}状態は、質問と、ここまでに生成したトークン。"
                        "{C}行動は、次のトークン。"
                        "{B}回答を最後まで生成したところで、報酬モデルのスコアが、報酬として届きます。") as v:
            self.play(FadeIn(prompt, shift=0.1 * DOWN), run_time=0.7)
            per = max(0.3, (v.until("A") - 0.9) / len(toks))
            for c in toks:
                self.play(FadeIn(c, shift=0.15 * RIGHT), run_time=per)
            self.wait_to(v, "A")

            def sbox(k):
                return VGroup(SurroundingRectangle(prompt, color=style.STATE, buff=0.07, stroke_width=4, corner_radius=0.1),
                              SurroundingRectangle(VGroup(*toks[:k]), color=style.STATE, buff=0.09, stroke_width=4,
                                                   corner_radius=0.1))

            def abox(k):
                return SurroundingRectangle(toks[k], color=style.ACTION, buff=0.09, stroke_width=5, corner_radius=0.1)
            s_lab = VGroup(jt("状態", size=36, color=style.STATE), mt("s_t", size=44, color=style.STATE)).arrange(RIGHT, buff=0.12)
            s_lab.next_to(prompt, RIGHT, buff=0.5)
            a_lab = VGroup(jt("行動", size=36, color=style.ACTION), mt("a_t", size=44, color=style.ACTION)).arrange(RIGHT, buff=0.12)
            a_lab.next_to(s_lab, RIGHT, buff=0.6)
            sb = sbox(3)
            for c in toks[3:]:
                c.set_opacity(0.3)
            self.play(Create(sb), FadeIn(s_lab), run_time=0.8)
            self.wait_to(v, "C")
            ab = abox(3)
            self.play(Create(ab), toks[3].animate.set_opacity(1), FadeIn(a_lab), run_time=0.7)
            self.play(Transform(sb, sbox(4)), Transform(ab, abox(4)), toks[4].animate.set_opacity(1), run_time=0.6)
            self.play(Transform(sb, sbox(5)), Transform(ab, abox(5)), toks[5].animate.set_opacity(1), run_time=0.6)
            self.wait_to(v, "B")
            rm = node_box("報酬モデル", color=style.REWARD, size=30, h=0.8).move_to(RIGHT * 5.0 + UP * 2.9)
            cells = VGroup()
            for i, x in enumerate(xs):
                box = RoundedRectangle(width=1.4, height=0.66, corner_radius=0.1, stroke_color=GREY_D, stroke_width=2,
                                       fill_color=CHIP_FILL, fill_opacity=1).move_to([x, y_rew, 0])
                cells.add(box)
            vals = VGroup(*[mt("0", size=32, color=GREY_B).move_to(c) for c in cells[:-1]])
            last = DecimalNumber(RM_SCORE, num_decimal_places=1, include_sign=True, font_size=34, color=style.REWARD)
            last.move_to(cells[-1])
            r_row = VGroup(jt("報酬", size=32, color=style.REWARD), mt("r", size=42, color=style.REWARD)).arrange(RIGHT, buff=0.12)
            r_row.move_to([lab_x, y_rew, 0])
            self.play(FadeOut(VGroup(sb, ab, s_lab, a_lab)), FadeIn(rm), run_time=0.7)
            flow = Arrow(toks[-1].get_top(), rm.get_bottom() + LEFT * 0.3, buff=0.1, color=style.REWARD, stroke_width=4)
            self.play(GrowArrow(flow), FadeIn(cells), FadeIn(vals), FadeIn(r_row), run_time=0.8)
            score = last.copy().move_to(rm.get_bottom() + DOWN * 0.35 + RIGHT * 0.6)
            self.play(FadeIn(score), run_time=0.3)
            self.play(score.animate.move_to(last), cells[-1].animate.set_stroke(style.REWARD, 3), run_time=0.8)
            self.remove(score)
            self.add(last)

        # 信用割り当て → クリティックと GAE
        credit = CurvedArrow(cells[-1].get_bottom() + DOWN * 0.08, cells[0].get_bottom() + DOWN * 0.08, angle=-0.35,
                             color=style.REWARD, stroke_width=4)
        qms = VGroup(*[jt("?", size=34, color=GREY_B).next_to(t, UP, buff=0.12) for t in toks[:-1]])
        vmap = lambda val: y_v0 + (val - 0.6) / (1.5 - 0.6) * (y_v1 - y_v0)
        v_pts = [np.array([x, vmap(val), 0]) for x, val in zip(xs, V_TOK)]
        v_line = polyline(v_pts, color=style.VALUE, width=4)
        v_dots = VGroup(*[Dot(p, radius=0.08, color=style.VALUE) for p in v_pts])
        v_row = VGroup(jt("価値", size=30, color=style.VALUE), mt("V", size=40, color=style.VALUE)).arrange(RIGHT, buff=0.12)
        v_row.move_to([lab_x, (y_v0 + y_v1) / 2, 0])
        adv0 = gae_tokens([0, 0, 0, 0, 0, RM_SCORE], V_TOK, gamma=1.0, lam=0.95)
        adv_axis = Line([xs[0] - slot / 2, y_adv, 0], [xs[-1] + slot / 2, y_adv, 0], stroke_color=GREY_C, stroke_width=2)
        a_row = mt(r"\hat{A}_t", size=44, color=WHITE).move_to([lab_x, y_adv, 0])
        a_sub = jt("GAE", size=26, color=GREY_B).next_to(a_row, DOWN, buff=0.08)
        ASC = 2.0

        def adv_bars(adv):
            grp = VGroup()
            for x, a in zip(xs, adv):
                h = max(abs(a) * ASC, 1e-3)
                b = Rectangle(width=0.6, height=h, stroke_width=0, fill_color=POS if a >= 0 else NEG, fill_opacity=0.9)
                b.move_to([x, y_adv + np.sign(a) * h / 2, 0])
                n = DecimalNumber(a, num_decimal_places=2, include_sign=True, font_size=28, color=GREY_A)
                n.next_to(b, UP if a >= 0 else DOWN, buff=0.06)
                grp.add(VGroup(b, n))
            return grp
        bars = adv_bars(adv0)
        actor = jt("アクター", size=28, color=style.POLICY).move_to([lab_x, y_tok + 0.2, 0])
        actor_s = mt(r"\pi_\theta", size=36, color=style.POLICY).next_to(actor, DOWN, buff=0.06)
        critic = jt("クリティック", size=26, color=style.VALUE).next_to(v_row, UP, buff=0.12)
        with self.voice("報酬が、{A}何百トークンも後に、一度だけ届く。第1章で見た、信用割り当て問題そのものです。"
                        "{B}そこで、各トークンの時点での価値を見積もるクリティックを用意し、{C}GAEで、トークンごとのアドバンテージを計算します。"
                        "{D}第5章の、アクター・クリティックです。") as v:
            self.wait_to(v, "A")
            self.play(Create(credit), run_time=1.2)
            self.play(LaggedStart(*[FadeIn(q, shift=0.1 * DOWN) for q in reversed(qms)], lag_ratio=0.15), run_time=1.2)
            self.wait_to(v, "B")
            self.play(FadeOut(credit), FadeOut(qms), FadeIn(v_row), run_time=0.6)
            self.play(Create(v_line), LaggedStart(*[FadeIn(d) for d in v_dots], lag_ratio=0.1), run_time=1.2)
            self.wait_to(v, "C")
            self.play(Create(adv_axis), FadeIn(a_row), FadeIn(a_sub), run_time=0.5)
            self.play(LaggedStart(*[GrowFromEdge(b[0], DOWN if a >= 0 else UP) for b, a in zip(bars, adv0)],
                                  lag_ratio=0.1), LaggedStart(*[FadeIn(b[1]) for b in bars], lag_ratio=0.1), run_time=1.3)
            self.wait_to(v, "D")
            self.play(FadeIn(actor), FadeIn(actor_s), FadeIn(critic), run_time=0.6)
            self.play(Indicate(VGroup(actor, actor_s), color=style.POLICY), Indicate(VGroup(critic, v_row), color=style.VALUE),
                      run_time=1.0)

        # KL ペナルティ
        R = mt(r"R(x,y)", "=", r"r_\phi(x,y)", "-", r"\beta", r"\log\frac{\pi_\theta(y\mid x)}{\pi_{\rm ref}(y\mid x)}",
               size=44)
        R[2].set_color(style.REWARD)
        R[4].set_color(KL)
        R[5].set_color(KL)
        R.move_to(LEFT * 1.3 + UP * 3.05)
        kl_br = Brace(R[4:], RIGHT, color=KL, buff=0.1)
        kl_t = jt("元のモデルからの\nずれ（KL）", size=28, color=KL, line_spacing=0.8).next_to(kl_br, RIGHT, buff=0.12)
        new_r = [-k for k in KL_TOK]
        new_r[-1] += RM_SCORE
        adv1 = gae_tokens(new_r, V_TOK, gamma=1.0, lam=0.95)
        kl_vals = VGroup(*[DecimalNumber(-k, num_decimal_places=2, include_sign=True, font_size=30, color=KL).move_to(c)
                           for k, c in zip(KL_TOK[:-1], cells[:-1])])
        last2 = DecimalNumber(new_r[-1], num_decimal_places=2, include_sign=True, font_size=30, color=style.REWARD)
        last2.move_to(cells[-1])
        with self.voice("そして、もう一つ、大事な項があります。{A}元のモデルからどれだけ離れたか、を表す、"
                        "{B}KLダイバージェンスのペナルティです。") as v:
            self.play(FadeOut(VGroup(prompt, rm, flow)), run_time=0.6)
            self.play(Write(R[:4]), run_time=0.9)
            self.wait_to(v, "A")
            self.play(Write(R[4:]), run_time=1.0)
            self.play(GrowFromCenter(kl_br), FadeIn(kl_t), run_time=0.6)
            self.wait_to(v, "B")
            self.play(*[ReplacementTransform(a, b) for a, b in zip(vals, kl_vals)], ReplacementTransform(last, last2),
                      *[c.animate.set_stroke(KL, 2) for c in cells[:-1]], run_time=1.0)
            self.play(Transform(bars, adv_bars(adv1)), run_time=0.8)
        fade_all(self)


# ---------------------------------------------------------------------------
# 10. 報酬ハッキングと KL
# ---------------------------------------------------------------------------
def r_formula(size=48):
    R = mt(r"R(x,y)", "=", r"r_\phi(x,y)", "-", r"\beta", r"\log\frac{\pi_\theta(y\mid x)}{\pi_{\rm ref}(y\mid x)}",
           size=size)
    R[2].set_color(style.REWARD)
    R[4].set_color(KL)
    R[5].set_color(KL)
    return R


def ruler(width=8.4, height=1.0, n=28, color=style.REWARD):
    body = RoundedRectangle(width=width, height=height, corner_radius=0.08, stroke_color=color, stroke_width=3,
                            fill_color="#1A1810", fill_opacity=1)
    ticks = VGroup()
    for i in range(1, n):
        x = -width / 2 + width * i / n
        h = height * (0.45 if i % 5 == 0 else 0.25)
        ticks.add(Line([x, height / 2, 0], [x, height / 2 - h, 0], stroke_color=color, stroke_width=2))
    return VGroup(body, ticks)


HACK_LINES = [
    "毎日少しずつ復習しよう。",
    "とても大切なことですが、とても大切なのは、",
    "とても大切なことを、とても大切にすることで、",
    "とても大切なことが、とても大切に……",
]


class RewardHacking(VoiceScene):
    def construct(self):
        R = r_formula(52).move_to(UP * 0.4)
        kl_box = SurroundingRectangle(R[4:], color=KL, buff=0.12, corner_radius=0.1)
        qm = jt("？", size=64, color=KL).next_to(kl_box, RIGHT, buff=0.25)
        with self.voice("なぜ、KLのペナルティが必要なのでしょうか。") as v:
            self.play(FadeIn(R), run_time=0.8)
            self.play(Create(kl_box), FadeIn(qm, scale=0.6), run_time=0.8)

        # 不完全なものさし
        rl = ruler().move_to(UP * 0.9 + RIGHT * 0.9)
        rl_lab = jt("報酬モデル ＝ 不完全なものさし", size=38, color=style.REWARD).next_to(rl, UP, buff=0.55)
        cards = VGroup(*[VGroup(RoundedRectangle(width=1.2, height=0.72, corner_radius=0.08, stroke_color=GREY_B,
                                                 stroke_width=1.5, fill_color=PANEL_FILL, fill_opacity=1),
                                mt(r"A \succ B", size=32, color=GREY_A)) for _ in range(3)])
        for c in cards:
            c[1].move_to(c[0])
        cards.arrange(DOWN, buff=0.12).next_to(rl, LEFT, buff=0.5)
        data_lab = jt("限られたデータ", size=28, color=GREY_B).next_to(cards, DOWN, buff=0.15)
        marker = Triangle(fill_color=style.POLICY, fill_opacity=1, stroke_width=0).scale(0.22).rotate(PI)
        mk_x = ValueTracker(rl.get_left()[0] + 0.8)
        marker.add_updater(lambda m: m.move_to([mk_x.get_value(), rl.get_top()[1] + 0.2, 0]))
        robot = Robot(height=0.85).next_to(rl, DOWN, buff=0.6).align_to(rl, LEFT)
        hole = Ellipse(width=1.1, height=0.7, fill_color=BLACK, fill_opacity=1, stroke_color=RED, stroke_width=4)
        hole.move_to(rl[0].get_center() + RIGHT * 2.8)
        hole_lab = jt("ものさしの穴", size=32, color=RED).next_to(hole, UP, buff=0.45).shift(RIGHT * 1.0)
        with self.voice("報酬モデルは、{A}人の好みを、限られたデータから真似しただけの、不完全なものさしです。"
                        "{D}強化学習は、そのものさしの点数を、とにかく上げようとします。"
                        "{B}すると、ものさしの穴を突く方法を、見つけてしまうんです。"
                        "{E}例えば、長い回答ほど点数が高くなる癖があれば、{C}中身のない長文を書くようになる。"
                        "{F}報酬ハッキングと呼ばれる現象です。") as v:
            self.play(FadeOut(VGroup(kl_box, qm)), R.animate.scale(0.6).to_edge(UP, buff=0.25), run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(rl), FadeIn(rl_lab, shift=0.1 * DOWN), run_time=0.8)
            self.play(LaggedStart(*[FadeIn(c, shift=0.2 * RIGHT) for c in cards], lag_ratio=0.2), FadeIn(data_lab),
                      run_time=1.0)
            self.wait_to(v, "D")
            self.add(marker)
            self.play(FadeIn(robot), run_time=0.4)
            self.play(mk_x.animate.set_value(rl.get_center()[0] + 0.6), robot.animate.shift(RIGHT * 3.6).look(RIGHT),
                      run_time=2.0)
            self.wait_to(v, "B")
            self.play(FadeIn(hole, scale=0.5), run_time=0.6)
            self.play(mk_x.animate.set_value(hole.get_center()[0]), robot.animate.move_to(hole.get_bottom() + DOWN * 0.8),
                      run_time=1.0)
            self.play(Wiggle(hole), FadeIn(hole_lab), run_time=0.9)

            self.wait_to(v, "E")
            marker.clear_updaters()
            self.play(FadeOut(VGroup(cards, data_lab, robot, marker, hole_lab)),
                      VGroup(rl, hole).animate.scale(0.55).move_to(UP * 2.0 + RIGHT * 3.4),
                      rl_lab.animate.scale(0.8).move_to(UP * 2.75 + RIGHT * 3.4), run_time=0.8)
            txt = jt("\n".join(HACK_LINES[:1]), size=30, color=WHITE, line_spacing=0.9)
            bub = bubble(HACK_LINES[0], size=30, pad=(0.35, 0.3))
            bub.move_to(LEFT * 2.2 + UP * 0.2).align_to(LEFT * 6.3, LEFT)
            gauge_bg = Rectangle(width=0.7, height=3.6, stroke_color=GREY_B, stroke_width=2).move_to(RIGHT * 5.4 + DOWN * 1.0)
            glev = ValueTracker(0.25)
            fill = always_redraw(lambda: Rectangle(width=0.62, height=3.52 * glev.get_value(), stroke_width=0,
                                                   fill_color=style.REWARD, fill_opacity=0.9)
                                 .align_to(gauge_bg.get_bottom() + UP * 0.04, DOWN).set_x(gauge_bg.get_x()))
            g_lab = jt("スコア", size=30, color=style.REWARD).next_to(gauge_bg, UP, buff=0.15)
            n_chars = Integer(len(HACK_LINES[0]), font_size=40, color=WHITE)
            len_lab = VGroup(jt("文字数", size=30, color=GREY_B), n_chars).arrange(RIGHT, buff=0.2)
            len_lab.next_to(gauge_bg, LEFT, buff=0.6).align_to(gauge_bg, DOWN)
            self.play(FadeIn(bub), FadeIn(gauge_bg), FadeIn(g_lab), FadeIn(len_lab), run_time=0.8)
            self.add(fill)
            self.wait_to(v, "C")
            for k in range(2, len(HACK_LINES) + 1):
                nb = bubble("\n".join(HACK_LINES[:k]), size=30, pad=(0.35, 0.3), line_spacing=0.9)
                nb.align_to(bub, LEFT).align_to(bub, UP)
                total = sum(len(x) for x in HACK_LINES[:k])
                self.play(Transform(bub, nb), glev.animate.set_value(0.25 + 0.72 * (k - 1) / (len(HACK_LINES) - 1)),
                          ChangeDecimalToValue(n_chars, total), run_time=0.7)
            self.wait_to(v, "F")
            hack = jt("報酬ハッキング", size=48, color=RED, weight="BOLD").move_to(DOWN * 3.0 + LEFT * 2.0)
            self.play(FadeIn(hack, scale=0.8), Indicate(gauge_bg, color=RED), run_time=0.9)
        fill.clear_updaters()
        self.play(FadeOut(VGroup(rl, hole, rl_lab, bub, gauge_bg, fill, g_lab, len_lab, hack, R)), run_time=0.8)

        # 模式図：KL が大きくなるほど…
        ax = Axes(x_range=[0, 10, 1], y_range=[0, 10, 2], x_length=8.0, y_length=4.9,
                  axis_config=dict(color=GREY_B, stroke_width=2.5, include_tip=False, include_ticks=False),
                  tips=False).move_to(LEFT * 1.3 + DOWN * 0.15)
        xl = jt("元のモデルからの KL", size=30, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.25).align_to(ax.x_axis, RIGHT)
        yl = jt("報酬", size=30, color=GREY_B).next_to(ax.y_axis, UP, buff=0.15)
        schem = VGroup(RoundedRectangle(width=1.6, height=0.62, corner_radius=0.1, stroke_color=GREY_B, stroke_width=2),
                       jt("模式図", size=28, color=GREY_B))
        schem[1].move_to(schem[0])
        schem.to_corner(UR, buff=0.4)
        rm_f = lambda x: 9.0 * (1 - np.exp(-x / 4.0))
        q_f = lambda x: 6.0 * (x / 3.0) * np.exp(1 - x / 3.0)
        rm_c = ax.plot(rm_f, x_range=[0, 10, 0.05], color=style.REWARD, stroke_width=5)
        q_c = ax.plot(q_f, x_range=[0, 10, 0.05], color=POS, stroke_width=5)
        rm_t = jt("報酬モデルの\nスコア", size=30, color=style.REWARD, line_spacing=0.8).next_to(ax.c2p(10, rm_f(10)), RIGHT, buff=0.2)
        q_t = jt("本当の品質", size=30, color=POS).next_to(ax.c2p(10, q_f(10)), RIGHT, buff=0.2)
        peak = Dot(ax.c2p(3, q_f(3)), radius=0.1, color=POS)
        with self.voice("{A}元のモデルから離れるほど、報酬モデルのスコアは上がり続けますが、{B}本当の品質は、あるところから、"
                        "下がり始めます。") as v:
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(schem), run_time=0.8)
            self.play(Create(rm_c), FadeIn(rm_t), run_time=1.8)
            self.wait_to(v, "B")
            self.play(Create(q_c), FadeIn(q_t), run_time=2.0)
            self.play(FadeIn(peak, scale=0.5), Indicate(q_t, color=POS), run_time=0.8)

        # 命綱：π_ref と π_θ をつなぐ
        ref = Dot(ax.c2p(0, 0), radius=0.14, color=GREY_B)
        ref_lab = VGroup(mt(r"\pi_{\rm ref}", size=40, color=GREY_B)).next_to(ref, DOWN, buff=0.2)
        pos = ValueTracker(0.0)
        pi = always_redraw(lambda: Dot(ax.c2p(pos.get_value(), 0), radius=0.16, color=style.POLICY))
        pi_lab = always_redraw(lambda: mt(r"\pi_\theta", size=40, color=style.POLICY)
                               .next_to(ax.c2p(pos.get_value(), 0), UP, buff=0.25))

        def rope():
            x1 = pos.get_value()
            n = 24
            pts = [ax.c2p(x1 * i / n, 0) + UP * (0.12 * np.sin(i * PI / 2) if 0 < i < n else 0) for i in range(n + 1)]
            return polyline(pts, color=KL, width=4)
        rope_m = always_redraw(rope)
        rope_lab = jt("KL の命綱", size=30, color=KL).move_to(ax.c2p(2.4, 0.8))
        ref_note = jt("事前学習＋SFT で\n身につけた力", size=28, color=GREY_B, line_spacing=0.8)
        ref_note.next_to(ref_lab, RIGHT, buff=0.3).align_to(ref_lab, UP)
        bad = Rectangle(width=ax.c2p(10, 0)[0] - ax.c2p(5.5, 0)[0], height=4.9, stroke_width=0, fill_color=RED,
                        fill_opacity=0.14).move_to([(ax.c2p(10, 0)[0] + ax.c2p(5.5, 0)[0]) / 2, ax.get_center()[1], 0])
        bad_t = jt("報酬モデルが\n信用できない", size=30, color=RED, line_spacing=0.8).move_to(bad).shift(DOWN * 0.3)
        with self.voice("KLのペナルティは、{A}元のモデルから離れすぎないようにする、命綱です。"
                        "{C}人間らしい文章を書く力は、事前学習とSFTで身につけたもの。"
                        "{B}そこから大きく外れた場所では、報酬モデルは、もはや信用できないからです。") as v:
            self.play(FadeIn(ref), FadeIn(ref_lab), run_time=0.5)
            self.add(pi, pi_lab)
            self.play(pos.animate.set_value(8.5), run_time=0.8)
            self.wait_to(v, "A")
            self.add(rope_m)
            self.play(FadeIn(rope_lab), run_time=0.3)
            self.play(pos.animate.set_value(3.2), run_time=1.4, rate_func=rate_functions.ease_out_back)
            self.wait_to(v, "C")
            self.play(FadeIn(ref_note), Indicate(ref, color=WHITE, scale_factor=1.5), run_time=0.9)
            self.wait_to(v, "B")
            self.play(FadeIn(bad), FadeIn(bad_t), run_time=0.9)
        for m in (pi, pi_lab, rope_m):
            m.clear_updaters()
        fade_all(self)

        # KL 付きの目的関数は、最適方策を式で書ける → DPO
        obj = mt(r"\max_{\pi_\theta}\ ", r"\mathbb{E}\big[r_\phi(x,y)\big]", "-", r"\beta\,", r"\mathrm{KL}(\pi_\theta\,\|\,\pi_{\rm ref})",
                 size=46)
        obj[1].set_color(style.REWARD)
        obj[3].set_color(KL)
        obj[4].set_color(KL)
        obj.move_to(UP * 2.8)
        opt = mt(r"\pi^*(y\mid x)", r"\ \propto\ ", r"\pi_{\rm ref}(y\mid x)", r"\,\exp\!\big(r_\phi(x,y)/\beta\big)", size=52)
        opt[0].set_color(style.POLICY)
        opt[2].set_color(GREY_B)
        opt.move_to(UP * 1.2)
        opt_lab = jt("最適な方策", size=30, color=style.POLICY).next_to(opt, LEFT, buff=0.3)
        if opt_lab.get_left()[0] < -6.7:
            opt_lab.next_to(opt, UP, buff=0.15).align_to(opt, LEFT)
        chain_n = [node_box("比較データ", GREY_B, size=30), node_box("報酬モデル", style.REWARD, size=30),
                   node_box("強化学習", style.POLICY, size=30), node_box("方策", style.POLICY, size=30)]
        chain = VGroup(*chain_n).arrange(RIGHT, buff=0.75).move_to(DOWN * 1.9)
        c_ar = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.08, color=GREY_B, stroke_width=4)
                        for a, b in zip(chain[:-1], chain[1:])])
        bypass = CurvedArrow(chain[0].get_bottom() + DOWN * 0.05, chain[3].get_bottom() + DOWN * 0.05, angle=0.55,
                             color=WHITE, stroke_width=6)
        dpo = jt("DPO", size=44, color=WHITE, weight="BOLD").next_to(bypass, DOWN, buff=0.05)
        cite = jt("DPO：Rafailov ら（2023）", size=26, color=GREY_C).to_corner(DR, buff=0.3)
        with self.voice("ちなみに、このKL付きの目的関数は、{B}最適な方策の形を、式で書き下せます。それを利用して、強化学習のループを使わずに、"
                        "{A}比較データから直接、方策を学ぶ、[DPO|ディーピーオー]という方法も広く使われています。") as v:
            self.play(Write(obj), run_time=1.4)
            self.wait_to(v, "B")
            self.play(Write(opt), FadeIn(opt_lab), run_time=1.4)
            self.play(LaggedStart(*[FadeIn(m) for m in [chain[0], c_ar[0], chain[1], c_ar[1], chain[2], c_ar[2], chain[3]]],
                                  lag_ratio=0.2), run_time=1.6)
            self.wait_to(v, "A")
            self.play(Create(bypass), VGroup(chain[1], chain[2], c_ar).animate.set_opacity(0.3), run_time=1.0)
            self.play(FadeIn(dpo, shift=0.1 * UP), FadeIn(cite), run_time=0.7)
        fade_all(self)


# ---------------------------------------------------------------------------
# 11. GRPO と検証可能な報酬（山場2）
# ---------------------------------------------------------------------------
GRPO_ANS = ["5050", "4950", "5000", "5050", "10100", "5050", "5049", "2550"]
GRPO_R = [1 if a == "5050" else 0 for a in GRPO_ANS]
REASONING = [
    "1 + 100 = 101、2 + 99 = 101、……",
    "101 が 50 組あるので、101 × 50 = 5050。",
    "待って、検算しよう。",
    "(1 + 100) × 100 ÷ 2 = 5050。合っている。",
    "答え：5050",
]


def answer_card(ans, w=1.3, h=0.95):
    box = RoundedRectangle(width=w, height=h, corner_radius=0.12, stroke_color=GREY_C, stroke_width=2,
                           fill_color=BOT_FILL, fill_opacity=1)
    dots = jt("……", size=22, color=GREY_C).move_to(box.get_center() + UP * 0.22)
    t = mt(ans, size=34, color=WHITE).move_to(box.get_center() + DOWN * 0.15)
    g = VGroup(box, dots, t)
    g.box = box
    return g


class GRPO(VoiceScene):
    def construct(self):
        # 検証可能な報酬：数学の答え、プログラムのテスト
        judge = node_box("自動で判定", color=GREY_A, size=32, h=0.9).move_to(DOWN * 0.3)
        mq = bubble("1から100までの整数の和は？", size=30, fill=USER_FILL).move_to(LEFT * 3.6 + UP * 2.4)
        ma = bubble("…… 答え：5050", size=30).move_to(LEFT * 3.6 + UP * 1.15)
        code_txt = jt("def add(a, b):\n    return a + b", size=28, color=GREY_A, font="Noto Sans Mono CJK JP",
                      line_spacing=0.9)
        code = VGroup(RoundedRectangle(width=code_txt.width + 0.7, height=code_txt.height + 0.5, corner_radius=0.15,
                                       stroke_color=GREY_C, stroke_width=2, fill_color=BOT_FILL, fill_opacity=1), code_txt)
        code[1].move_to(code[0])
        code.move_to(RIGHT * 3.6 + UP * 1.75)
        test_lab = jt("テストを実行", size=28, color=GREY_B).next_to(code, DOWN, buff=0.15)
        res_m = VGroup(check_mark(0.5, color=POS), jt("正解", size=32, color=POS), mt(r"\to", size=40),
                       mt("1", size=48, color=style.REWARD)).arrange(RIGHT, buff=0.2).move_to(LEFT * 3.6 + DOWN * 1.7)
        res_c = VGroup(check_mark(0.5, color=POS), jt("通過", size=32, color=POS), mt(r"\to", size=40),
                       mt("1", size=48, color=style.REWARD)).arrange(RIGHT, buff=0.2).move_to(RIGHT * 3.6 + DOWN * 1.7)
        vr = jt("検証可能な報酬", size=44, color=style.REWARD, weight="MEDIUM").move_to(DOWN * 3.0)
        with self.voice("最近では、{A}答えが正しいかどうかを、機械的に確かめられる問題でも、強化学習がよく使われます。"
                        "{C}数学の問題の、最終的な答え。{D}プログラムが、テストに通るかどうか。{B}検証可能な報酬、と呼ばれます。") as v:
            self.play(FadeIn(mq, shift=0.1 * DOWN), run_time=0.7)
            self.wait_to(v, "A")
            self.play(FadeIn(judge, scale=0.9), run_time=0.7)
            self.play(FadeIn(code), run_time=0.7)
            self.wait_to(v, "C")
            self.play(FadeIn(ma, shift=0.1 * DOWN), run_time=0.6)
            a1 = Arrow(ma.get_bottom(), judge.get_left() + UP * 0.1, buff=0.1, color=GREY_B, stroke_width=4)
            o1 = Arrow(judge.get_left() + DOWN * 0.2, res_m.get_top(), buff=0.1, color=GREY_B, stroke_width=4)
            self.play(GrowArrow(a1), run_time=0.5)
            self.play(Indicate(judge), GrowArrow(o1), FadeIn(res_m), run_time=0.8)
            self.wait_to(v, "D")
            a2 = Arrow(test_lab.get_bottom(), judge.get_right() + UP * 0.1, buff=0.1, color=GREY_B, stroke_width=4)
            o2 = Arrow(judge.get_right() + DOWN * 0.2, res_c.get_top(), buff=0.1, color=GREY_B, stroke_width=4)
            self.play(FadeIn(test_lab), GrowArrow(a2), run_time=0.6)
            self.play(Indicate(judge), GrowArrow(o2), FadeIn(res_c), run_time=0.8)
            self.wait_to(v, "B")
            self.play(FadeIn(vr, shift=0.1 * UP), Indicate(res_m[3], color=style.REWARD),
                      Indicate(res_c[3], color=style.REWARD), run_time=0.9)
        self.play(FadeOut(VGroup(judge, ma, code, test_lab, res_m, res_c, vr, a1, o1, a2, o2)),
                  mq.animate.move_to(UP * 3.1).align_to(RIGHT * 6.4, RIGHT), run_time=0.9)

        # GRPO：8つの回答を比べる
        title = jt("GRPO", size=52, color=WHITE, weight="BOLD")
        sub = jt("DeepSeekMath（2024）で提案", size=26, color=GREY_C)
        head = VGroup(title, sub).arrange(DOWN, buff=0.08, aligned_edge=LEFT).to_corner(UL, buff=0.35)
        robot = Robot(height=0.8).move_to(LEFT * 6.0 + UP * 1.2)
        cards = VGroup(*[answer_card(a) for a in GRPO_ANS]).arrange(RIGHT, buff=0.12)
        cards.move_to(UP * 1.75).align_to(RIGHT * 6.4, RIGHT)
        marks = VGroup(*[(check_mark(0.38, color=POS, width=6) if r else cross_mark(0.32, color=RED, width=6))
                         .move_to(c.box.get_corner(UR) + np.array([-0.18, -0.18, 0])) for c, r in zip(cards, GRPO_R)])
        base_r, sc_r = -0.2, 0.9
        rbars = VGroup(*[Rectangle(width=0.55, height=max(r * sc_r, 0.02), stroke_width=0, fill_color=style.REWARD,
                                   fill_opacity=0.9 if r else 0.5).move_to([c.get_x(), base_r + max(r * sc_r, 0.02) / 2, 0])
                         for c, r in zip(cards, GRPO_R)])
        rnums = VGroup(*[mt(str(r), size=32, color=style.REWARD if r else GREY_B).next_to(b, UP, buff=0.08)
                         for b, r in zip(rbars, GRPO_R)])
        r_axis = Line([cards.get_left()[0], base_r, 0], [cards.get_right()[0], base_r, 0], stroke_color=GREY_C, stroke_width=2)
        r_row = VGroup(jt("報酬", size=30, color=style.REWARD), mt("r_i", size=40, color=style.REWARD)).arrange(RIGHT, buff=0.1)
        r_row.move_to([-5.95, base_r + 0.4, 0])
        with self.voice("ここでよく使われるのが、{A}[GRPO|ジーアールピーオー]という方法です。同じ問題に対して、{B}回答を、"
                        "何通りもサンプルします。この例では8通り。そのうち、{C}正解したものに報酬1、それ以外に0を与えます。") as v:
            self.wait_to(v, "A")
            self.play(Write(title), FadeIn(sub), FadeIn(robot), run_time=1.0)
            self.play(robot.animate.look(UR), run_time=0.4)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[TransformFromCopy(robot.copy().scale(0.5).set_opacity(0), c) for c in cards],
                                  lag_ratio=0.12), robot.animate.look(RIGHT), run_time=1.8)
            self.play(robot.blink(), run_time=0.3)
            self.wait_to(v, "C")
            self.play(FadeOut(robot), LaggedStart(*[Create(m) for m in marks], lag_ratio=0.1), run_time=1.0)
            self.play(Create(r_axis), FadeIn(r_row), LaggedStart(*[GrowFromEdge(b, DOWN) for b in rbars], lag_ratio=0.08),
                      LaggedStart(*[FadeIn(n) for n in rnums], lag_ratio=0.08), run_time=1.2)

        adv, mu, sd = grpo_advantages(GRPO_R)
        mean_y = base_r + mu * sc_r
        mean_line = DashedLine([cards.get_left()[0] - 0.1, mean_y, 0], [cards.get_right()[0] + 0.1, mean_y, 0],
                               color=WHITE, stroke_width=3)
        stats = VGroup(jt("平均", size=30, color=GREY_A), mt(f"{mu:.3f}", size=40),
                       jt("標準偏差", size=30, color=GREY_A), mt(f"{sd:.3f}", size=40))
        stats[1].next_to(stats[0], RIGHT, buff=0.15)
        stats[2].next_to(stats[1], RIGHT, buff=0.6)
        stats[3].next_to(stats[2], RIGHT, buff=0.15)
        stats.move_to([cards.get_x(), -0.62, 0])
        F = mt(r"\hat{A}_i = \frac{r_i - \mathrm{mean}(r)}{\mathrm{std}(r)}", size=44)
        F.to_corner(UL, buff=0.4)
        base_a, sc_a = -2.5, 0.8
        a_axis = Line([cards.get_left()[0], base_a, 0], [cards.get_right()[0], base_a, 0], stroke_color=GREY_C, stroke_width=2)
        abars = VGroup()
        anums = VGroup()
        for c, a in zip(cards, adv):
            h = abs(a) * sc_a
            b = Rectangle(width=0.55, height=h, stroke_width=0, fill_color=POS if a > 0 else NEG, fill_opacity=0.9)
            b.move_to([c.get_x(), base_a + np.sign(a) * h / 2, 0])
            abars.add(b)
            anums.add(mt(f"{a:+.2f}", size=30, color=POS if a > 0 else NEG).next_to(b, UP if a > 0 else DOWN, buff=0.08))
        a_row = mt(r"\hat{A}_i", size=44, color=WHITE).move_to([-5.95, base_a, 0])
        with self.voice("そして、{A}グループの中での平均を引き、{D}標準偏差で割ったものを、アドバンテージにします。"
                        "{B}平均より良かった回答は、確率を上げ、{C}平均より悪かった回答は、下げる。") as v:
            self.wait_to(v, "A")
            self.play(Create(mean_line), FadeIn(stats[:2]), run_time=0.9)
            self.wait_to(v, "D")
            self.play(FadeIn(stats[2:]), FadeOut(head), FadeIn(F), run_time=0.8)
            self.play(Create(a_axis), FadeIn(a_row), LaggedStart(*[GrowFromEdge(b, DOWN if a > 0 else UP)
                                                                  for b, a in zip(abars, adv)], lag_ratio=0.06),
                      LaggedStart(*[FadeIn(n) for n in anums], lag_ratio=0.06), run_time=1.3)
            self.wait_to(v, "B")
            good = [c for c, r in zip(cards, GRPO_R) if r]
            bad = [c for c, r in zip(cards, GRPO_R) if not r]
            self.play(*[c.animate.scale(1.12).set_stroke(POS, 4) for c in good],
                      *[Indicate(b, color=POS) for b, a in zip(abars, adv) if a > 0], run_time=0.9)
            self.wait_to(v, "C")
            self.play(*[c.animate.scale(0.88).set_opacity(0.45) for c in bad], run_time=0.9)

        # 第5章のベースラインとの対応、そして価値ネットワークが要らない
        grp = VGroup(cards, marks, rbars, rnums, r_axis, r_row, mean_line, stats, a_axis, abars, anums, a_row, mq)
        ch5 = mt(r"\hat{A}_t", "=", r"G_t", "-", r"V(s_t)", size=52)
        ch5[4].set_color(style.VALUE)
        gr = mt(r"\hat{A}_i", "=", r"\big(r_i", "-", r"\mathrm{mean}(r)", r"\big)\,/\,\mathrm{std}(r)", size=52)
        gr[4].set_color(style.REWARD)
        lab5 = jt("第5章", size=32, color=GREY_B)
        labg = jt("GRPO", size=32, color=GREY_B)
        rows = VGroup(VGroup(lab5, ch5).arrange(RIGHT, buff=0.5), VGroup(labg, gr).arrange(RIGHT, buff=0.5))
        rows.arrange(DOWN, buff=1.05, aligned_edge=LEFT).move_to(UP * 1.75 + LEFT * 0.8)
        b5 = SurroundingRectangle(ch5[4], color=style.VALUE, buff=0.1)
        bg = SurroundingRectangle(gr[4], color=style.REWARD, buff=0.1)
        link = DoubleArrow(b5.get_bottom(), bg.get_top(), buff=0.05, color=WHITE, stroke_width=4,
                           max_tip_length_to_length_ratio=0.3)
        base_t = jt("ベースライン", size=30, color=WHITE).next_to(link, RIGHT, buff=0.2)
        models = VGroup(*[node_box(t, c, size=30, w=2.85, h=1.3) for t, c in
                          [("方策モデル", style.POLICY), ("参照モデル", GREY_B), ("報酬モデル", style.REWARD),
                           ("価値モデル", style.VALUE)]]).arrange(RIGHT, buff=0.3).move_to(DOWN * 2.2)
        for m in models:
            m.label.shift(0.3 * DOWN)
            net = mini_net((3, 4, 3), width=1.0, height=0.5, r=0.05).move_to(m.box.get_center() + UP * 0.28)
            m.add(net)
        same = jt("どれも言語モデルと同じ規模", size=28, color=GREY_B).next_to(models, UP, buff=0.2)
        xx = cross_mark(1.0, color=RED, width=10).move_to(models[3])
        nocritic = jt("クリティックなし", size=32, color=RED).next_to(models[3], UP, buff=0.2)
        with self.voice("見覚えがありますね。{A}第5章のベースラインを、同じ問題への、ほかの回答の平均で代用しているんです。"
                        "こうすると、{B}巨大な言語モデルと同じ規模の、価値ネットワークを、別に用意しなくて済みます。") as v:
            self.play(FadeOut(grp), FadeOut(F), FadeIn(rows[0]), run_time=0.9)
            self.wait_to(v, "A")
            self.play(FadeIn(rows[1]), run_time=0.7)
            self.play(Create(b5), Create(bg), GrowFromCenter(link), FadeIn(base_t), run_time=1.0)
            self.play(LaggedStart(*[FadeIn(m, shift=0.1 * UP) for m in models], lag_ratio=0.15), FadeIn(same),
                      run_time=1.4)
            self.wait_to(v, "B")
            self.play(Create(xx), models[3].animate.set_opacity(0.35), FadeOut(same), run_time=0.9)
            self.play(FadeIn(nocritic, shift=0.1 * DOWN), run_time=0.6)
        self.play(FadeOut(VGroup(rows, b5, bg, link, base_t, models, xx, nocritic)), run_time=0.8)

        # 長い推論が育つ
        q2 = bubble("1から100までの整数の和は？", size=30, fill=USER_FILL).move_to(UP * 3.0).align_to(RIGHT * 6.4, RIGHT)
        bot = Robot(height=0.6).move_to(LEFT * 6.0 + UP * 1.8)
        lines = [jt(t, size=30, color=WHITE) for t in REASONING]
        lines[2].set_color(style.REWARD)
        body = VGroup(*lines).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        frame = RoundedRectangle(width=9.6, height=body.height + 0.7, corner_radius=0.22, stroke_color=GREY_D, stroke_width=1.5,
                                 fill_color=BOT_FILL, fill_opacity=1)
        frame.next_to(bot, RIGHT, buff=0.3).align_to(bot, UP).shift(0.3 * UP)
        body.move_to(frame).align_to(frame, LEFT).shift(0.35 * RIGHT)
        cite = jt("DeepSeek-R1（2025）などの報告", size=26, color=GREY_C).to_corner(DR, buff=0.3)
        only = VGroup(jt("与えた報酬は", size=30, color=GREY_B), check_mark(0.45, color=POS), mt(r"\to 1", size=44, color=style.REWARD),
                      jt("だけ", size=30, color=GREY_B)).arrange(RIGHT, buff=0.2).move_to(DOWN * 3.0 + LEFT * 1.5)
        with self.voice("正しいかどうかだけを報酬にして、こうした強化学習を続けると、{A}モデルが、自分で検算したり、途中で考え直したりする、"
                        "長い推論を身につけていった、という報告もあります。"
                        "{B}誰も、考え方そのものを、教えていないのに、です。") as v:
            self.play(FadeIn(q2), FadeIn(bot), FadeIn(frame), run_time=0.8)
            self.play(FadeIn(lines[0]), run_time=0.6)
            self.wait_to(v, "A")
            for ln in lines[1:]:
                self.play(FadeIn(ln, shift=0.1 * DOWN), run_time=0.6)
                self.wait(0.35)
            self.play(Indicate(lines[2], color=style.REWARD), FadeIn(cite), run_time=0.9)
            self.wait_to(v, "B")
            self.play(FadeIn(only, shift=0.1 * UP), run_time=0.8)
            self.play(Indicate(only[2], color=style.REWARD, scale_factor=1.3), run_time=0.8)
        fade_all(self)


# ---------------------------------------------------------------------------
# 12. シリーズ全体の地図
# ---------------------------------------------------------------------------
MAP_NODES = {
    # key: (表示, 章, 位置)   左の列＝価値の道、右の列＝方策の道
    "mdp": ("MDP", 1, (-0.75, 3.1)),
    "value": ("価値", 2, (-3.9, 2.0)),
    "bellman": ("ベルマン方程式", 2, (-3.9, 0.8)),
    "vi": ("価値反復", 2, (-0.45, 0.8)),
    "td": ("TD学習", 3, (-3.9, -0.4)),
    "q": ("Q学習", 3, (-3.9, -1.6)),
    "dqn": ("DQN", 4, (-3.9, -2.8)),
    "policy": ("方策", 1, (2.4, 2.0)),
    "pg": ("方策勾配", 5, (2.4, 0.8)),
    "base": ("ベースライン", 5, (2.4, -0.4)),
    "ac": ("Actor-Critic", 5, (2.4, -1.6)),
    "gae": ("GAE", 6, (-0.75, -2.35)),
    "ppo": ("PPO", 6, (2.4, -2.8)),
    "llm": ("RLHF・GRPO", 6, (5.15, -2.8)),
}
MAP_EDGES = [("mdp", "value"), ("value", "bellman"), ("bellman", "vi"), ("bellman", "td"), ("td", "q"), ("q", "dqn"),
             ("mdp", "policy"), ("policy", "pg"), ("pg", "base"), ("base", "ac"), ("ac", "ppo"), ("ppo", "llm"),
             ("td", "ac"), ("td", "gae"), ("gae", "ppo")]
CH_COLOR = {1: GREY_A, 2: style.VALUE, 3: style.VALUE, 4: style.VALUE, 5: style.POLICY, 6: style.REWARD}


class Map(VoiceScene):
    def construct(self):
        nodes = {}
        for k, (t, ch, (x, y)) in MAP_NODES.items():
            n = node_box(t, color=GREY_D, size=32, h=0.74)
            g = VGroup(n)
            g.move_to([x, y, 0])
            g.n, g.ch = n, ch
            nodes[k] = g
        edges = {}
        for a, b in MAP_EDGES:
            A, B = nodes[a], nodes[b]
            e = Arrow(A.n.box.get_center(), B.n.box.get_center(), buff=0, color=GREY_D, stroke_width=3,
                      max_tip_length_to_length_ratio=0.12, max_stroke_width_to_length_ratio=10)
            # 箱の縁から縁へ
            start = A.n.box.get_boundary_point(e.get_unit_vector())
            end = B.n.box.get_boundary_point(-e.get_unit_vector())
            e.put_start_and_end_on(start + e.get_unit_vector() * 0.05, end - e.get_unit_vector() * 0.05)
            edges[(a, b)] = e
        td_lab = jt("TD誤差", size=28, color=style.VALUE).move_to((nodes["td"].get_center() + nodes["ac"].get_center()) / 2
                                                                + UP * 0.35 + LEFT * 0.3)
        all_nodes = VGroup(*nodes.values())
        all_edges = VGroup(*edges.values())

        def lit(*keys, edge_keys=()):
            anims = []
            for k in keys:
                g = nodes[k]
                c = CH_COLOR[g.ch]
                anims += [g.n.box.animate.set_stroke(c, 4).set_fill("#1A1A20", 1), g.n.label.animate.set_color(WHITE)]
            for ek in edge_keys:
                e = edges[ek]
                c = CH_COLOR[nodes[ek[1]].ch]
                anims.append(e.animate.set_color(c))
            return anims

        for g in nodes.values():
            g.n.label.set_color(GREY_D)
        with self.voice("最後に、ここまでの道のりを、振り返ってみましょう。") as v:
            self.play(LaggedStart(*[FadeIn(g, scale=0.9) for g in nodes.values()], lag_ratio=0.05), Create(all_edges),
                      run_time=2.2)

        with self.voice("正解のない世界で、報酬だけを頼りに学ぶ、という問題を、{A}マルコフ決定過程として書きました。"
                        "{B}リターンの再帰的な関係から、ベルマン方程式が生まれ、"
                        "{C}経験からの学習、TDとQ学習へ。{D}表をニューラルネットに置き換えて、[DQN|ディーキューエヌ]へ。") as v:
            self.wait_to(v, "A")
            self.play(*lit("mdp"), run_time=0.8)
            self.wait_to(v, "B")
            self.play(*lit("value", "bellman", "vi", edge_keys=[("mdp", "value"), ("value", "bellman"), ("bellman", "vi")]),
                      run_time=1.0)
            self.wait_to(v, "C")
            self.play(*lit("td", "q", edge_keys=[("bellman", "td"), ("td", "q")]), run_time=1.0)
            self.wait_to(v, "D")
            self.play(*lit("dqn", edge_keys=[("q", "dqn")]), run_time=0.8)

        with self.voice("もう一方の道では、{A}途切れた勾配を、対数微分のトリックで迂回し、{B}ベースラインと価値を組み合わせて、アクター・クリティックへ。"
                        "{C}更新にブレーキをかけたPPO、そして、{D}言語モデルを鍛えるRLHFやGRPOへと、たどり着きました。") as v:
            self.wait_to(v, "A")
            self.play(*lit("policy", "pg", edge_keys=[("mdp", "policy"), ("policy", "pg")]), run_time=1.0)
            self.wait_to(v, "B")
            self.play(*lit("base", "ac", edge_keys=[("pg", "base"), ("base", "ac"), ("td", "ac")]), FadeIn(td_lab),
                      run_time=1.0)
            self.wait_to(v, "C")
            self.play(*lit("gae", "ppo", edge_keys=[("td", "gae"), ("gae", "ppo"), ("ac", "ppo")]), run_time=1.0)
            self.wait_to(v, "D")
            self.play(*lit("llm", edge_keys=[("ppo", "llm")]), run_time=0.8)
            self.play(Flash(nodes["llm"].get_center(), color=style.REWARD, flash_radius=1.7, line_length=0.3), run_time=0.8)

        keys4 = ["bellman", "td", "pg", "base"]
        others = VGroup(*[g for k, g in nodes.items() if k not in keys4], all_edges, td_lab)
        with self.voice("最新の手法も、中身を開けてみれば、{A}ベルマン方程式、{B}TD誤差、{C}方策勾配、{D}ベースライン。"
                        "{E}第1章から一つずつ積み上げてきた部品の、組み合わせでできています。") as v:
            self.play(others.animate.set_opacity(0.25), run_time=0.8)
            for mark, k in zip("ABCD", keys4):
                self.wait_to(v, mark)
                self.play(Circumscribe(nodes[k], color=WHITE, buff=0.08), nodes[k].animate.scale(1.12), run_time=0.7)
            self.wait_to(v, "E")
            self.play(others.animate.set_opacity(1), *[nodes[k].animate.scale(1 / 1.12) for k in keys4], run_time=1.0)
            self.play(Circumscribe(nodes["llm"], color=style.REWARD, buff=0.1), run_time=1.0)
        fade_all(self)


# ---------------------------------------------------------------------------
# 13. おわりに
# ---------------------------------------------------------------------------
class Outro(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.35).move_to(0.35 * DOWN)
        robot = Robot(height=0.66).move_to(g.center_of(WORLD.start))
        tries = []
        for seed in range(200):
            t = WORLD.rollout(WORLD.uniform_policy(), np.random.default_rng(seed), max_steps=14)
            if len(t) >= 8:
                tries.append(t)
            if len(tries) == 3:
                break
        with self.voice("強化学習は、{A}正解を教えてもらえない問題で、試行錯誤から学ぶための、数学です。") as v:
            self.play(FadeIn(g), FadeIn(robot), run_time=1.0)
            self.wait_to(v, "A")
            for i, t in enumerate(tries):
                states = [t[0][0]] + [x[3] for x in t]
                rng = np.random.default_rng(i)
                pts = [g.center_of(s) + rng.uniform(-1, 1, 3) * 0.1 * g.cell * np.array([1, 1, 0]) for s in states]
                pts[0] = g.center_of(states[0])
                line = polyline(pts, color=GREY_B, width=4).set_stroke(opacity=0.8)
                self.add(line, robot)
                self.play(Create(line), MoveAlongPath(robot, line.copy()), run_time=1.1, rate_func=linear)
                self.play(line.animate.set_stroke(opacity=0.25), robot.animate.move_to(g.center_of(WORLD.start)),
                          run_time=0.3)
                tries[i] = line

        clean = None
        for seed in range(2000):
            t = WORLD.rollout(PI_STAR, np.random.default_rng(seed))
            if len(t) == 7 and t[-1][3] == GOAL:
                clean = t
                break
        trail = VGroup()
        with self.voice("小さなマス目の世界の、小さなロボットから始まった話が、言語モデルの学習にまでつながっている。"
                        "{A}その道筋が、少しでもクリアに見えるようになっていたら、うれしいです。") as v:
            self.play(FadeOut(VGroup(*tries)), run_time=0.8)
            for s, a, r, n in clean:
                seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.REWARD, stroke_width=6)
                trail.add(seg)
                self.add(seg, robot)
                self.play(robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)), Create(seg), run_time=0.55)
            star = g.icons[GOAL]
            self.play(Flash(g.center_of(GOAL), color=style.REWARD, line_length=0.4, num_lines=14, flash_radius=0.8),
                      robot.animate(rate_func=there_and_back).shift(0.25 * UP), run_time=0.8)
            self.play(robot.animate.scale(0.75).move_to(g.center_of(GOAL) + g.cell * (0.31 * LEFT + 0.31 * UP)).look(DR),
                      run_time=0.6)
            self.wait_to(v, "A")
            glow = VGroup(*[Circle(radius=0.3 + 0.18 * k, stroke_width=0, fill_color=style.REWARD,
                                   fill_opacity=0.12).move_to(g.center_of(GOAL)) for k in range(5)])
            self.play(FadeIn(glow, scale=0.5), star.animate.scale(1.4), trail.animate.set_stroke(width=9),
                      run_time=1.2)
            self.play(trail.animate.set_stroke(width=6), run_time=0.8)

        with self.voice("最後まで見てくださって、ありがとうございました。") as v:
            self.play(FadeOut(VGroup(g.board, robot, trail, *[i for s, i in g.icons.items() if s != GOAL])),
                      run_time=1.2)
        self.play(FadeOut(VGroup(star, glow)), run_time=0.9)
        play_end_card(self)
