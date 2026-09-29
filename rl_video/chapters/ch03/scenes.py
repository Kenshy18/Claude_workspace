"""第3章「経験から学ぶ」— モデルフリーの学習（MC, TD, SARSA, Q学習, 探索と活用）。

レンダリング:  python tools/build.py ch03 [-q l]
"""
from __future__ import annotations

import numpy as np
from manim import *

from common import style
from common.mobjects import ACTION_VEC, GridView, ProbBars, Robot, glow_dot, goal_icon, pit_icon, value_color
from common.rl import ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene
from chapters.ch03.helpers import (
    BANDIT_P, DA_CUE, DA_REWARD, DA_T, GOAL, NONTERM, PI_STAR, PIT, Q_STAR, UNIFORM, V_STAR, V_UNI, WORLD, Cliff as CliffEnv,
    CliffView, QTriangles, SlotMachine, arrow_glyph, bandit_run, breakout_pixels,
    cliff_experiment, dice, dopamine_td, eps_greedy_rollout, find_seed, greedy_from_q, mc_samples, n_vec,
    path_line, q_learning_es, ret, spike_raster, step_anims, td0, td_error_curve, td_target,
    uniform_rollout)

CHAPTER_TITLE = "第3章 経験から学ぶ"

SCENES = [
    "Hook", "Title", "MonteCarlo", "TD", "Dopamine", "BiasVariance", "Control", "Exploration", "Cliff",
    "QLearningDemo", "Outro",
]

S21 = (2, 1)  # 前回の「でたらめな方策」の例と同じマス
BANG = "！"    # 吹き出しの文字（robot.say("…") と直接書くと、台本の抽出にナレーションとして拾われる）


# ---------------------------------------------------------------------------
# 共通の小道具
# ---------------------------------------------------------------------------
def reach_goal(scene, robot, g, goal=GOAL, run_time=0.45, plus=True):
    c = g.center_of(goal)
    scene.play(robot.animate.move_to(c), run_time=run_time)
    anims = [Flash(c, color=style.REWARD, line_length=0.3, num_lines=12, flash_radius=0.45 * g.cell),
             robot.animate(rate_func=there_and_back).shift(0.2 * g.cell * UP)]
    lab = None
    if plus:
        lab = mt("+1", size=44, color=style.REWARD).next_to(g.cells[goal], RIGHT, buff=0.12)
        anims.append(FadeIn(lab, shift=0.3 * UP))
    scene.play(*anims, run_time=0.55)
    if lab is not None:
        scene.play(FadeOut(lab, shift=0.3 * UP), run_time=0.35)


def fall_into(scene, robot, center, anchor, text="-1", run_time=0.6):
    scene.play(robot.animate.move_to(center).scale(0.05).set_opacity(0), run_time=run_time,
               rate_func=rush_into)
    minus = mt(text, size=44, color=RED).next_to(anchor, RIGHT, buff=0.12)
    scene.play(FadeIn(minus, shift=0.3 * UP), run_time=0.3)
    scene.play(FadeOut(minus, shift=0.3 * UP), run_time=0.4)


def morph(scene, src, dst, mapping, run_time=1.2, shift=0.35 * UP):
    """src[i] → dst[j] を対応づけて変形する。対応のない部分は消える／現れる。"""
    anims = [ReplacementTransform(src[i], dst[j]) for i, j in mapping.items()]
    used = set(mapping.values())
    anims += [FadeOut(src[i], shift=shift) for i in range(len(src)) if i not in mapping]
    anims += [FadeIn(dst[j], shift=shift) for j in range(len(dst)) if j not in used]
    scene.play(*anims, run_time=run_time)
    scene.remove(*dst.submobjects)
    scene.add(dst)


def hourglass(size=0.36, color=GREY_B):
    top = Triangle(stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.25)
    top.rotate(PI).set_height(size / 2)
    bot = Triangle(stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.6)
    bot.set_height(size / 2)
    return VGroup(top, bot).arrange(DOWN, buff=0)


def check_mark(size=0.3, color=GREEN):
    m = VMobject(stroke_color=color, stroke_width=6)
    m.set_points_as_corners([np.array([-0.5, 0.05, 0]), np.array([-0.15, -0.35, 0]),
                             np.array([0.5, 0.4, 0])])
    return m.scale(size)


def cross_mark(mob, color=RED, width=7, pad=0.1):
    w, h = mob.width / 2 + pad, mob.height / 2 + pad
    c = mob.get_center()
    return VGroup(Line(c + np.array([-w, h, 0]), c + np.array([w, -h, 0])),
                  Line(c + np.array([-w, -h, 0]), c + np.array([w, h, 0]))).set_stroke(color, width)


def v_parts(s="s"):
    return ["V", "(", s, ")"]


def q_parts(s="s", a="a"):
    return ["Q", "(", s, ",", a, ")"]


MC_EQ = [*v_parts(), r"\leftarrow", *v_parts(), "+", r"\alpha", r"\big(", "G", "-", *v_parts(),
         r"\big)"]
TD_EQ = [*v_parts(), r"\leftarrow", *v_parts(), "+", r"\alpha", r"\big(", "r", "+", r"\gamma",
         *v_parts("s'"), "-", *v_parts(), r"\big)"]
# MC_EQ[12] = G。TD_EQ[12:19] = r + γ V(s')
MC_TO_TD = {**{i: i for i in range(12)}, **{i: i + 6 for i in range(13, 19)}}

SARSA_EQ = [*q_parts(), r"\leftarrow", *q_parts(), "+", r"\alpha", r"\big(", "r", "+", r"\gamma",
            *q_parts("s'", "a'"), "-", *q_parts(), r"\big)"]
QL_EQ = [*q_parts(), r"\leftarrow", *q_parts(), "+", r"\alpha", r"\big(", "r", "+", r"\gamma",
         r"\max_{a'}", *q_parts("s'", "a'"), "-", *q_parts(), r"\big)"]
# SARSA_EQ[19:25] = Q(s',a')。QL_EQ[19] = max, [20:26] = Q(s',a')
SARSA_TO_QL = {**{i: i for i in range(19)}, **{i: i + 1 for i in range(19, 33)}}


def eq(parts, size=52):
    m = mt(*parts, size=size)
    for i, p in enumerate(parts):
        if p == "G":
            m[i].set_color(style.REWARD)
    return m


# ---------------------------------------------------------------------------
# 1. つかみ：遷移確率を知らないロボット
# ---------------------------------------------------------------------------
class Hook(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.2).move_to(LEFT * 3.5 + 0.25 * DOWN)
        for s in g.nonterminal_states():
            g.cells[s].set_fill(value_color(V_STAR[s]), 1)
        c = g.center_of((2, 0))
        fan = VGroup(Arrow(c, g.center_of((2, 1)), buff=0.12, color=WHITE, stroke_width=10),
                     Arrow(c, g.center_of((1, 0)), buff=0.12, color=GREY_A, stroke_width=6),
                     Arrow(c, g.center_of((3, 0)), buff=0.12, color=GREY_A, stroke_width=6))
        probs = VGroup(mt("0.8", size=46).next_to(fan[0], RIGHT, buff=0.1).shift(0.3 * UP),
                       mt("0.1", size=42, color=GREY_A).next_to(fan[1], DOWN, buff=0.08),
                       mt("0.1", size=42, color=GREY_A).next_to(fan[2], DOWN, buff=0.08))
        P = mt("P(", "s'", r"\mid", "s", ",", "a", ")", size=72).move_to(RIGHT * 3.6 + UP * 0.3)
        P_lab = jt("遷移確率", size=40, color=GREY_B).next_to(P, UP, buff=0.4)
        known = jt("ぜんぶ既知", size=32, color=GREY_B).next_to(P, DOWN, buff=0.4)
        with self.voice("前回は、{A}遷移確率を全部知っている、という、ちょっとずるい前提で、{B}価値を計算しました。") as v:
            self.play(FadeIn(g), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[GrowArrow(a) for a in fan], lag_ratio=0.2), FadeIn(probs),
                      FadeIn(P_lab), Write(P), run_time=1.2)
            self.play(FadeIn(known, shift=0.1 * UP), run_time=0.5)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[Indicate(g.cells[s], color=style.VALUE, scale_factor=1.05)
                                    for s in g.nonterminal_states()], lag_ratio=0.05), run_time=1.2)

        q_goal = jt("?", size=60, color=GREY_B).move_to(g.center_of(GOAL))
        q_pit = jt("?", size=60, color=GREY_B).move_to(g.center_of(PIT))
        robot = Robot(height=0.62).move_to(g.center_of(WORLD.start))
        cross = cross_mark(P)
        with self.voice("今回は、その前提を捨てます。ロボットは、{F}床がどれくらい滑るのかも、{P}どこに穴があるのかも、知りません。"
                        "{A}できるのは、実際に動いてみて、何が起きたかを、記録することだけです。") as v:
            self.sfx("hit")
            self.play(Create(cross), run_time=0.6)
            # 遷移確率の式が消え、ヒートマップの色が抜けて、ロボットが現れる
            self.sfx("pop", offset=0.4)
            self.play(FadeOut(VGroup(P, P_lab, cross, known), shift=0.3 * RIGHT),
                      *[g.cells[s].animate.set_fill(style.BG, 1) for s in g.nonterminal_states()],
                      GrowFromCenter(robot), run_time=1.0)
            self.wait_to(v, "F")
            self.play(FadeOut(fan), FadeOut(probs), robot.animate.look(DOWN), run_time=0.8)
            self.wait_to(v, "P")
            bubble = robot.think("？", direction=UR)
            self.sfx("pop")
            self.play(ReplacementTransform(g.icons[GOAL], q_goal),
                      ReplacementTransform(g.icons[PIT], q_pit), robot.animate.set_mood("worried").look(UR),
                      FadeIn(bubble, scale=0.8), run_time=0.9)
            # 経験ノート
            self.wait_to(v, "A")
            cols = [1.45, 3.05, 4.3, 5.95]
            title = jt("経験ノート", size=40, color=WHITE).move_to(RIGHT * 3.7 + UP * 3.3)
            head = VGroup(mt("s", size=64), mt("a", size=64), mt("r", size=64), mt("s'", size=64))
            for h, x in zip(head, cols):
                h.move_to(RIGHT * x + UP * 2.55)
            rule = Line(RIGHT * 0.75 + UP * 2.12, RIGHT * 6.7 + UP * 2.12, stroke_color=GREY_D,
                        stroke_width=2)
            self.sfx("pop")
            self.play(FadeOut(bubble), robot.animate.set_mood("determined").look(RIGHT),
                      FadeIn(title, shift=0.1 * DOWN), FadeIn(head), Create(rule), run_time=0.7)

        _, traj = find_seed(lambda t: 6 <= len(t) <= 8 and t[-1][3] == PIT,
                            lambda sd: uniform_rollout(sd, start=(0, 0), max_steps=40))

        def row(i, s, a, r, n):
            y = 1.66 - 0.53 * i
            rc = style.REWARD if r > 0 else (RED if r < 0 else GREY_B)
            parts = VGroup(mt(f"({s[0]},{s[1]})", size=44, color=style.STATE),
                           arrow_glyph(a, length=0.42, width=6),
                           mt("0" if r == 0 else f"{r:+.0f}", size=46, color=rc),
                           mt(f"({n[0]},{n[1]})", size=44, color=style.STATE))
            for p, x in zip(parts, cols):
                p.move_to(RIGHT * x + UP * y)
            return parts

        rows = VGroup()
        for i, (s, a, r, n) in enumerate(traj):
            rw = row(i, s, a, r, n)
            rows.add(rw)
            if n == PIT:
                self.play(FadeIn(rw[:2], shift=0.1 * LEFT), robot.animate.look(UP), run_time=0.4)
                pit = pit_icon(0.62 * g.cell).move_to(g.center_of(PIT))
                self.play(robot.change("surprised"), run_time=0.25)
                self.sfx("fall")
                self.play(robot.animate.move_to(g.center_of(PIT)).scale(0.05).set_opacity(0),
                          rate_func=rush_into, run_time=0.6)
                self.sfx("thud")
                self.play(ReplacementTransform(q_pit, pit), FadeIn(rw[2:], shift=0.1 * LEFT),
                          Flash(g.center_of(PIT), color=RED, flash_radius=0.5), run_time=0.6)
            else:
                self.play(*step_anims(robot, g, s, a, n, run_time=0.42),
                          FadeIn(rw, shift=0.1 * LEFT, run_time=0.42))

        col_items = [VGroup(head[k], *[r[k] for r in rows]) for k in range(4)]
        col_colors = [style.STATE, style.ACTION, style.REWARD, style.STATE]
        tup = mt("(", "s", ",", "a", ",", "r", ",", "s'", ")", size=72).move_to(RIGHT * 3.7 + DOWN * 3.1)
        mf = jt("モデルフリー", size=48, color=WHITE, weight="MEDIUM").move_to(LEFT * 3.5 + DOWN * 3.2)
        with self.voice("{S}今の状態、{Ac}選んだ行動、{R}もらった報酬、そして{N}次の状態。この{A}四つ組が、ロボットの手に入る、《唯一の》情報です。"
                        "こういう設定を、{B}モデルフリーと呼びます。") as v:
            boxes = [SurroundingRectangle(ci, color=cc, buff=0.12, corner_radius=0.08, stroke_width=3)
                     for ci, cc in zip(col_items, col_colors)]
            prev = None
            for k, mark in enumerate(["S", "Ac", "R", "N"]):
                self.wait_to(v, mark)
                anims = [Create(boxes[k])]
                if prev is not None:
                    anims.append(FadeOut(prev))
                self.play(*anims, run_time=0.45)
                prev = boxes[k]
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeOut(prev), *[TransformFromCopy(head[k], tup[2 * k + 1]) for k in range(4)],
                      FadeIn(VGroup(tup[0], tup[2], tup[4], tup[6], tup[8])), run_time=1.0)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(mf, shift=0.15 * UP), run_time=0.8)

        qs = VGroup(*[jt("?", size=44, color=style.VALUE).move_to(g.center_of(s))
                      for s in g.nonterminal_states() if s != WORLD.start])
        robot = Robot(height=0.62).move_to(g.center_of(WORLD.start)).set_mood("determined")
        with self.voice("経験だけから、価値を学ぶことは、できるのでしょうか。") as v:
            self.sfx("pop")
            self.play(GrowFromCenter(robot), run_time=0.5)
            self.play(LaggedStart(*[FadeIn(q, scale=0.6) for q in qs], lag_ratio=0.06),
                      robot.animate.look(UR), run_time=1.6)
        self.play(FadeOut(VGroup(g, q_goal, pit, qs, title, head, rule, rows, tup, mf, robot)), run_time=0.9)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 3, "経験から学ぶ")


# ---------------------------------------------------------------------------
# 3. モンテカルロ法 ＝ リターンへの回帰
# ---------------------------------------------------------------------------
def mc_top_eq():
    """MonteCarlo の最後と TD の最初に、同じ位置・大きさで置く式（シーンの継ぎ目）。"""
    return eq(MC_EQ, size=44).move_to(UP * 3.2)


class MonteCarlo(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=0.95).move_to(LEFT * 4.3 + UP * 1.55)
        focus = SurroundingRectangle(g.cells[S21], color=style.STATE, stroke_width=5, buff=0)
        robot = Robot(height=0.46).move_to(g.center_of(S21))

        # 数直線（リターン G の軸）
        NY, X0, X1 = -1.95, -6.0, 6.0

        def nx(val):
            return X0 + (val + 1) / 2 * (X1 - X0)

        axis = Line([X0, NY, 0], [X1, NY, 0], stroke_color=GREY_C, stroke_width=2)
        ticks = VGroup()
        for val in (-1, -0.5, 0, 0.5, 1):
            ticks.add(Line([nx(val), NY - 0.1, 0], [nx(val), NY + 0.1, 0], stroke_color=GREY_C,
                           stroke_width=2))
            ticks.add(mt(f"{val:g}", size=30, color=GREY_B).move_to([nx(val), NY - 0.5, 0]))
        axis_lab = VGroup(jt("リターン", size=28, color=GREY_B), mt("G", size=38, color=style.REWARD))
        axis_lab.arrange(RIGHT, buff=0.12).move_to([X0 + 0.9, NY + 0.75, 0])
        tri = Triangle(fill_color=style.VALUE, fill_opacity=1, stroke_width=0).rotate(PI)
        tri.set_height(0.26).move_to([0, NY + 0.45, 0])
        mlab = mt("V", "(", "s", ")", size=40).next_to(tri, UP, buff=0.1)
        marker = VGroup(tri, mlab)

        rng = np.random.default_rng(11)
        _, first = find_seed(lambda t: t[-1][3] == GOAL and 5 <= len(t) <= 8,
                             lambda sd: uniform_rollout(sd, start=S21, max_steps=100))
        samples = [(first, ret(first))] + mc_samples(99, seed=1)
        Gs = [G for _, G in samples]

        def sample_dot(G):
            return Dot([nx(G), NY + rng.uniform(-0.22, 0.22), 0], radius=0.055,
                       color=style.REWARD).set_opacity(0.8)

        state = {"n": 0, "V": 0.0}
        dots = VGroup()

        def update_to(n):
            """n 個目までのサンプルの平均（α = 1/n の逐次更新と同じ）へ。"""
            state["n"] = n
            state["V"] = float(np.mean(Gs[:n]))
            return marker.animate.set_x(nx(state["V"]))

        # --- N1 ---
        with self.voice("一番素直なのは、前回の最初にやった方法です。{A}エピソードを最後まで走らせて、{B}実際のリターンを測り、{C}平均を取る。"
                        "これを、{D}モンテカルロ法と呼びます。") as v:
            self.play(FadeIn(g), run_time=0.8)
            self.sfx("pop")
            self.play(Create(focus), GrowFromCenter(robot), run_time=0.7)
            self.wait_to(v, "A")
            trail = VGroup()
            for s, a, r, n in first[:-1]:
                if n != s:
                    seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.STATE, stroke_width=4)
                    trail.add(seg)
                    self.add(seg, robot)
                self.play(*step_anims(robot, g, s, a, n, run_time=0.3))
            s, a, r, n = first[-1]
            seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.STATE, stroke_width=4)
            trail.add(seg)
            self.add(seg, robot)
            self.sfx("chime")
            reach_goal(self, robot, g, run_time=0.3)
            self.play(robot.change("happy"), run_time=0.3)
            k = len(first) - 1
            G1 = Gs[0]
            gtxt = mt("G", "=", r"\gamma^{%d}" % k, r"\times", "1", r"\approx", f"{G1:.2f}", size=54)
            gtxt[0].set_color(style.REWARD)
            gtxt[2].set_color(style.GAMMA)
            gtxt[4].set_color(style.REWARD)
            gtxt.move_to(RIGHT * 2.5 + UP * 1.6)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(Write(gtxt), run_time=0.9)
            self.play(Create(axis), FadeIn(ticks), FadeIn(axis_lab), run_time=0.6)
            d = sample_dot(G1)
            dots.add(d)
            self.sfx("pop")
            self.play(TransformFromCopy(gtxt[-1], d), run_time=0.6)
            marker.set_x(nx(G1))
            state.update(n=1, V=G1)
            self.wait_to(v, "C")
            self.play(FadeIn(marker, shift=0.2 * DOWN), run_time=0.5)
            self.wait_to(v, "D")
            mc_lab = jt("モンテカルロ法", size=46, color=WHITE, weight="MEDIUM").move_to(RIGHT * 1.9 + UP * 3.0)
            self.sfx("hit")
            # ロボットは「見物役」として右上の隅へ
            self.play(FadeIn(mc_lab, shift=0.1 * DOWN), FadeOut(trail),
                      robot.animate.set_mood("normal").scale(1.3).move_to([6.05, 3.0, 0]).look(LEFT), run_time=0.9)

        # --- N2: 逐次更新（数直線に寄って、推定値が引っ張られるところを見る） ---
        upd = eq(MC_EQ, size=54).move_to(RIGHT * 2.3 + UP * 1.6)
        with self.voice("平均は、全部のデータを取っておかなくても、{A}一つずつ更新できます。"
                        "新しいリターンが届くたびに、{B}今の推定値を、その方向へ、少しだけ動かすんです。") as v:
            self.play(Indicate(dots, color=WHITE, scale_factor=1.6), run_time=1.0)
            self.wait_to(v, "A")
            self.play(ReplacementTransform(gtxt[0], upd[12]), FadeOut(gtxt[1:], shift=0.2 * UP),
                      FadeIn(VGroup(*[upd[i] for i in range(len(upd)) if i != 12]), shift=0.2 * UP), run_time=0.9)
            self.remove(*upd.get_family())
            self.add(upd)
            self.wait_to(v, "B")
            G2, V_old, V_new = Gs[1], state["V"], float(np.mean(Gs[:2]))
            cx = (nx(V_old) + nx(G2)) / 2
            cam = Dot([cx + 0.5, NY + 0.95, 0], radius=0.01).set_opacity(0)
            self.sfx("whoosh")
            self.play(self.focus_on(cam, height=4.4), run_time=1.1)
            d = sample_dot(G2)
            dots.add(d)
            self.sfx("pop")
            self.play(FadeIn(d, shift=0.5 * DOWN), run_time=0.5)
            yA = NY + 1.95
            red = Arrow([nx(V_old), yA, 0], [nx(G2), yA, 0], buff=0, color=RED, stroke_width=6,
                        max_tip_length_to_length_ratio=0.1)
            lab_r = mt("G", "-", *v_parts(), size=34).next_to(red, UP, buff=0.1)
            lab_r[0].set_color(style.REWARD)
            self.play(GrowArrow(red), FadeIn(lab_r), run_time=0.7)
            teal = Arrow([nx(V_old), yA, 0], [nx(V_new), yA, 0], buff=0, color=style.VALUE, stroke_width=10,
                         max_tip_length_to_length_ratio=0.2)
            lab_t = mt(r"\alpha", r"\big(", "G", "-", *v_parts(), r"\big)", size=34).next_to(teal, DOWN, buff=0.1)
            lab_t[2].set_color(style.REWARD)
            self.play(GrowArrow(teal), marker.animate.set_x(nx(V_new)), FadeIn(lab_t), run_time=1.4)
            state.update(n=2, V=V_new)

        # --- N3: 学習率・早回し ---
        true_line = DashedLine([nx(V_UNI[S21]), NY - 0.95, 0], [nx(V_UNI[S21]), NY + 0.35, 0],
                               color=WHITE, stroke_width=4, dash_length=0.08)
        true_lab = jt("真の値", size=30, color=GREY_A).move_to([nx(V_UNI[S21]), NY - 1.25, 0])
        cnt_lab = jt("エピソード", size=28, color=GREY_B)
        cnt = Integer(2, font_size=38, color=WHITE)
        counter = VGroup(cnt_lab, cnt).arrange(RIGHT, buff=0.2).move_to([4.7, NY + 0.95, 0])
        a_note = mt(r"\alpha", "=", r"\tfrac{1}{2}", size=40).next_to(lab_t, RIGHT, buff=0.3)
        mean_note = jt("平均なら α = 1/n", size=30, color=GREY_B).next_to(upd, DOWN, buff=0.3).align_to(upd, RIGHT)
        with self.voice("動かす割合の、{AL}アルファは、学習率です。{A}この式、どこかで見覚えがありませんか。") as v:
            self.wait_to(v, "AL")
            self.sfx("hit")
            self.play(Indicate(lab_t[0], color=WHITE, scale_factor=1.6), FadeIn(a_note, shift=0.1 * LEFT), run_time=0.9)
            self.sfx("whoosh")
            self.play(self.reset_frame(), FadeOut(VGroup(red, teal, lab_r, lab_t, a_note)), FadeIn(counter),
                      FadeIn(mean_note), run_time=1.1)
            batch = 7
            idx = list(range(2, 100))
            groups = [idx[i:i + batch] for i in range(0, len(idx), batch)]
            per = max(0.18, (v.until("A") - 0.8) / len(groups))
            for grp in groups:
                new = VGroup(*[sample_dot(Gs[i]) for i in grp])
                dots.add(*new)
                self.play(FadeIn(new, shift=0.25 * DOWN), update_to(grp[-1] + 1),
                          ChangeDecimalToValue(cnt, grp[-1] + 1), run_time=per)
            self.play(Create(true_line), FadeIn(true_lab), run_time=0.6)
            self.wait_to(v, "A")
            bubble = robot.think("？", direction=LEFT)
            self.sfx("pop")
            self.play(Circumscribe(upd, color=WHITE, buff=0.15), FadeIn(bubble, scale=0.8), run_time=1.2)

        # --- N4: 回帰と同じ ---
        loss = mt("L", "=", r"\tfrac{1}{2}", r"\big(", "G", "-", *v_parts(), r"\big)^2", size=48)
        loss[4].set_color(style.REWARD)
        grad = mt(r"-\frac{\partial L}{\partial V}", "=", "G", "-", *v_parts(), size=48)
        grad[2].set_color(style.REWARD)
        VGroup(loss, grad).arrange(RIGHT, buff=1.2).move_to(UP * 0.3)
        lab_loss = jt("二乗誤差", size=30, color=GREY_B).next_to(loss, UP, buff=0.25)
        lab_grad = jt("負の勾配", size=30, color=GREY_B).next_to(grad, UP, buff=0.25)
        box2 = SurroundingRectangle(VGroup(*grad[2:8]), color=RED, buff=0.08, corner_radius=0.06)
        label_note = jt("正解ラベル", size=30, color=style.REWARD)
        with self.voice("そう。これは、{A}推定値と、観測したリターンとの二乗誤差を、{B}勾配降下で小さくする更新、そのものです。"
                        "{C}リターンを正解ラベルとみなした、《回帰》なんです。") as v:
            bang = robot.say(BANG, direction=LEFT)
            self.play(FadeOut(VGroup(g, focus, mc_lab, mean_note)), upd.animate.move_to(UP * 2.55),
                      ReplacementTransform(bubble, bang), robot.change("surprised"), run_time=0.9)
            self.wait_to(v, "A")
            # 更新式の (G − V(s)) から、損失の式を作る
            self.play(*[TransformFromCopy(upd[12 + k], loss[4 + k]) for k in range(6)],
                      FadeIn(VGroup(*loss[:4], loss[10])), FadeIn(lab_loss), run_time=1.1)
            self.wait_to(v, "B")
            self.play(*[TransformFromCopy(loss[4 + k], grad[2 + k]) for k in range(6)],
                      FadeIn(VGroup(grad[0], grad[1])), FadeIn(lab_grad), run_time=1.1)
            box1 = SurroundingRectangle(VGroup(*upd[12:18]), color=RED, buff=0.08, corner_radius=0.06)
            self.sfx("hit")
            self.play(Create(box1), Create(box2), run_time=0.6)
            self.play(Indicate(VGroup(*upd[12:18]), color=RED), Indicate(VGroup(*grad[2:8]), color=RED),
                      run_time=0.9)
            self.wait_to(v, "C")
            label_note.next_to(loss[4], DOWN, buff=0.55)
            la = Arrow(label_note.get_top(), loss[4].get_bottom(), buff=0.08, color=style.REWARD,
                       stroke_width=4, max_tip_length_to_length_ratio=0.3)
            self.sfx("sparkle")
            self.play(FadeIn(label_note, shift=0.1 * UP), GrowArrow(la), Indicate(dots, color=style.REWARD),
                      FadeOut(bang), robot.change("happy"), run_time=1.0)
            self.play(robot.hop(), run_time=0.5)

        # --- N5: 二つの弱点 ---
        _, long_ep = find_seed(lambda t: 26 <= len(t) <= 32,
                               lambda sd: uniform_rollout(sd, start=S21, max_steps=100), start=100)
        G_long = ret(long_ep)
        hg = hourglass().next_to(tri, RIGHT, buff=0.25)
        with self.voice("ただし、モンテカルロ法には、弱点が二つあります。{A}一つは、エピソードが終わるまで、何も学べないこと。"
                        "{B}もう一つは、リターンのばらつきが大きいことです。途中で振られた、たくさんのサイコロの目が、{C}全部リターンに積み重なるからです。") as v:
            self.play(FadeOut(VGroup(loss, grad, lab_loss, lab_grad, box1, box2, label_note, la)),
                      upd.animate.scale(0.85).move_to(RIGHT * 2.5 + UP * 2.4), run_time=0.9)
            # 見物役のロボットがグリッドに戻って、長いエピソードを走る
            self.play(FadeIn(g), Create(focus),
                      robot.animate.set_mood("normal").scale(1 / 1.3).move_to(g.center_of(S21)).look(ORIGIN),
                      run_time=0.9)
            self.wait_to(v, "A")
            self.play(tri.animate.set_fill(GREY_D), mlab.animate.set_color(GREY_C), FadeIn(hg), run_time=0.4)
            trail = VGroup()
            step_t = max(0.08, (v.until("B") - 1.2) / len(long_ep))
            for k, (s, a, r, n) in enumerate(long_ep):
                if WORLD.is_terminal(n):
                    break
                if k == 10:
                    self.play(robot.change("worried"), run_time=0.2)
                if n != s:
                    seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.STATE, stroke_width=3,
                               stroke_opacity=0.7)
                    trail.add(seg)
                    self.add(seg, robot)
                self.play(*step_anims(robot, g, s, a, n, run_time=step_t))
            s, a, r, n = long_ep[-1]
            self.sfx("fall")
            self.play(robot.change("surprised"), run_time=0.15)
            self.play(robot.animate.move_to(g.center_of(n)).scale(0.05).set_opacity(0), rate_func=rush_into,
                      run_time=0.4)
            d_long = sample_dot(G_long).set_color(WHITE)
            self.sfx("pop")
            self.play(FadeIn(d_long, scale=2), FadeOut(hg), tri.animate.set_fill(style.VALUE),
                      mlab.animate.set_color(WHITE), run_time=0.5)
            self.wait_to(v, "B")
            lo, hi = min(Gs), max(Gs)
            spread = DoubleArrow([nx(lo), NY + 0.5, 0], [nx(hi), NY + 0.5, 0], buff=0, color=style.REWARD,
                                 stroke_width=5, tip_length=0.2)
            sp_lab = jt("ばらつき", size=36, color=style.REWARD).next_to(spread, UP, buff=0.15)
            self.play(FadeOut(counter), FadeOut(marker), FadeOut(axis_lab), GrowFromCenter(spread),
                      FadeIn(sp_lab), run_time=0.8)
            drng = np.random.default_rng(5)
            path_states = [x[3] for x in long_ep[:-1]]
            picks = path_states[::3][:10]
            ds = VGroup(*[dice(int(drng.integers(1, 7)), size=0.34).move_to(
                g.center_of(p) + drng.uniform(-0.2, 0.2, 3) * np.array([1, 1, 0])) for p in picks])
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(x, scale=0.5) for x in ds], lag_ratio=0.12), run_time=1.4)
            self.wait_to(v, "C")
            self.play(LaggedStart(*[x.animate.move_to(d_long.get_center()).scale(0.1).set_opacity(0)
                                    for x in ds], lag_ratio=0.08), run_time=1.3)
            self.play(Flash(d_long, color=WHITE, flash_radius=0.3), run_time=0.5)
        # 更新式だけを残して、次のシーン（TD）の冒頭と同じ位置へ
        self.play(FadeOut(VGroup(g, focus, trail, axis, ticks, dots, d_long, true_line, true_lab, spread, sp_lab)),
                  Transform(upd, mc_top_eq()), run_time=1.0)


# ---------------------------------------------------------------------------
# 4. TD 学習
# ---------------------------------------------------------------------------
def timeline(n_steps=3, size=72):
    toks = VGroup()
    for k in range(n_steps):
        toks.add(mt(f"s_{k}", size=size))
        toks.add(mt(f"a_{k}", size=size, color=style.ACTION))
        toks.add(mt(f"r_{k + 1}", size=size, color=style.REWARD))
    toks.add(mt(f"s_{n_steps}", size=size))
    for t in toks[::3]:
        t.set_color(style.STATE)
    return toks.arrange(RIGHT, buff=0.42)


def td_bottom_eq():
    """TD の最後と Dopamine の最初に、同じ位置・大きさで置く式（シーンの継ぎ目）。"""
    return eq(TD_EQ, size=66).scale(0.75).move_to(DOWN * 3.1)


class TD(VoiceScene):
    def construct(self):
        top = mc_top_eq()
        self.add(top)
        # --- N1: MC は最後に、TD は一歩ごとに ---
        mc_row = timeline().move_to(RIGHT * 1.3 + UP * 1.15)
        td_row = timeline().move_to(RIGHT * 1.3 + DOWN * 1.9)
        mc_lab = jt("モンテカルロ", size=34, color=GREY_B).next_to(mc_row, LEFT, buff=0.4)
        td_lab = jt("TD", size=40, color=GREY_B).next_to(td_row, LEFT, buff=0.4).align_to(mc_lab, RIGHT)
        states_mc = mc_row[::3]
        states_td = td_row[::3]
        with self.voice("そこで、発想を変えます。{W}エピソードの最後まで待つ代わりに、{A}一歩だけ進んで、そこで判断するんです。") as v:
            self.play(FadeIn(mc_lab), LaggedStart(*[FadeIn(t, shift=0.2 * RIGHT) for t in mc_row],
                                                  lag_ratio=0.15), run_time=1.6)
            self.wait_to(v, "W")
            fan = VGroup(*[CurvedArrow(states_mc[-1].get_top() + 0.12 * UP, s.get_top() + 0.12 * UP,
                                       angle=0.8 if i < 2 else 1.1, color=style.VALUE, stroke_width=4.5)
                           for i, s in enumerate(states_mc[:-1])])
            self.play(LaggedStart(*[Create(a) for a in fan], lag_ratio=0.15), run_time=1.1)
            self.play(*[Flash(s, color=style.VALUE, flash_radius=0.45, line_length=0.2) for s in states_mc[:-1]],
                      run_time=0.6)
            self.wait_to(v, "A")
            self.play(FadeIn(td_lab), FadeIn(td_row[0], shift=0.2 * RIGHT), run_time=0.4)
            hops = VGroup()
            per = max(0.45, (v.remaining() + 0.6) / 3)
            for k in range(3):
                new = td_row[3 * k + 1:3 * k + 4]
                hop = CurvedArrow(states_td[k + 1].get_bottom() + 0.12 * DOWN,
                                  states_td[k].get_bottom() + 0.12 * DOWN, angle=-1.2,
                                  color=style.VALUE, stroke_width=4.5)
                hops.add(hop)
                self.play(LaggedStart(*[FadeIn(t, shift=0.2 * RIGHT) for t in new], lag_ratio=0.3),
                          run_time=per * 0.55)
                self.sfx("tick")
                self.play(Create(hop), Flash(states_td[k], color=style.VALUE, flash_radius=0.45,
                                             line_length=0.2), run_time=per * 0.45)

        # --- N2: 一歩先の見積もり ---
        with self.voice("一歩進むと、{A}報酬と、次の状態が分かります。{U}そこから先のリターンは、まだ分かりません。"
                        "でも、その見積もりなら、手元にあります。{B}次の状態の、価値の推定値です。") as v:
            self.play(FadeOut(VGroup(mc_row, mc_lab, fan, td_lab, hops)), td_row.animate.move_to(DOWN * 0.5),
                      run_time=0.9)
            self.play(td_row[2:].animate.set_opacity(0.15), run_time=0.5)
            self.wait_to(v, "A")
            self.play(td_row[2:4].animate.set_opacity(1), run_time=0.4)
            self.play(Indicate(td_row[2:4], scale_factor=1.25), run_time=0.7)
            self.wait_to(v, "U")
            future = td_row[4:]
            br = Brace(future, UP, color=GREY_B)
            br_lab = jt("この先のリターン", size=32, color=GREY_B).next_to(br, UP, buff=0.15)
            qm = jt("?", size=72, color=GREY_B).next_to(br_lab, UP, buff=0.2)
            self.play(GrowFromCenter(br), FadeIn(br_lab), FadeIn(qm, scale=0.6), run_time=0.8)
            self.wait_to(v, "B")
            vs = mt(r"\approx", "V", "(", "s_1", ")", size=72).move_to(qm)
            vs[3].set_color(style.STATE)
            halo = SurroundingRectangle(td_row[3], color=style.VALUE, buff=0.12, corner_radius=0.08)
            self.play(Create(halo), run_time=0.5)
            self.sfx("pop")
            self.play(ReplacementTransform(qm, vs), TransformFromCopy(td_row[3], vs[3]), run_time=1.0)

        # --- N3: G を置き換える（タイムラインの r₁ と V(s₁) がそのまま式に入る） ---
        mc_eq = eq(MC_EQ, size=66).move_to(UP * 0.4)
        td_eq = eq(TD_EQ, size=66).move_to(UP * 0.4)
        strip = VGroup(td_row, br, br_lab, vs, halo)
        with self.voice("そこで、モンテカルロ法の[G|ジー]を、{A}報酬、足す、ガンマ倍の、次の状態の価値、で置き換えます。") as v:
            self.play(strip.animate.scale(0.62).move_to(DOWN * 2.6), Transform(top, mc_eq), run_time=1.1)
            self.remove(*top.get_family())
            self.add(mc_eq)
            g_box = SurroundingRectangle(mc_eq[12], color=style.REWARD, buff=0.1)
            self.play(Create(g_box), run_time=0.5)
            self.wait_to(v, "A")
            self.sfx("hit")
            anims = [ReplacementTransform(mc_eq[i], td_eq[j]) for i, j in MC_TO_TD.items()]
            anims += [FadeOut(mc_eq[12], shift=0.5 * UP), FadeOut(g_box, shift=0.5 * UP),
                      TransformFromCopy(td_row[2], td_eq[12]), FadeIn(td_eq[13]), FadeIn(td_eq[14]),
                      TransformFromCopy(VGroup(*vs[1:5]), VGroup(*td_eq[15:19]))]
            self.play(*anims, run_time=1.5)
            self.remove(*td_eq.get_family())
            self.add(td_eq)
            self.play(Indicate(VGroup(*td_eq[12:19]), color=style.VALUE, scale_factor=1.08),
                      FadeOut(strip), run_time=0.9)

        # --- N4: TD 学習と TD 誤差 ---
        title = jt("TD学習", size=52, color=WHITE, weight="MEDIUM").move_to(UP * 3.1)
        full = Text("Temporal Difference", font_size=34, color=GREY_B, slant=ITALIC)
        full_jp = jt("時間的な差分", size=32, color=GREY_B)
        sub = VGroup(full, full_jp).arrange(RIGHT, buff=0.4).next_to(title, DOWN, buff=0.25)
        b_tgt = Brace(VGroup(*td_eq[12:19]), DOWN, color=style.VALUE)
        l_tgt = jt("一歩先から見た見積もり", size=30, color=style.VALUE).next_to(b_tgt, DOWN, buff=0.12)
        b_now = Brace(VGroup(*td_eq[20:24]), DOWN, color=GREY_B)
        l_now = jt("今の見積もり", size=30, color=GREY_B).next_to(b_now, DOWN, buff=0.12)
        l_now.shift(RIGHT * max(0, l_tgt.get_right()[0] + 0.3 - l_now.get_left()[0]))
        b_del = Brace(VGroup(*td_eq[12:24]), UP, color=RED)
        l_del = VGroup(jt("TD誤差", size=36, color=RED), mt(r"\delta", size=60, color=RED)).arrange(RIGHT, buff=0.2)
        l_del.next_to(b_del, UP, buff=0.12)
        with self.voice("これが、[TD|ティーディー]学習です。[TD|ティーディー]は、テンポラル・ディファレンス、時間的な差分の略です。"
                        "{A}括弧の中身、{T}一歩先から見た見積もりと、{N}今の見積もりとの差を、{D}[TD|ティーディー]誤差と呼び、デルタで表します。") as v:
            self.sfx("hit")
            self.play(FadeIn(title, shift=0.1 * DOWN), run_time=0.7)
            self.play(FadeIn(sub, shift=0.1 * DOWN), run_time=0.7)
            self.wait_to(v, "A")
            self.play(FadeOut(sub), Indicate(VGroup(*td_eq[11:25]), color=WHITE, scale_factor=1.05), run_time=0.8)
            self.wait_to(v, "T")
            self.play(GrowFromCenter(b_tgt), FadeIn(l_tgt), run_time=0.6)
            self.wait_to(v, "N")
            self.play(GrowFromCenter(b_now), FadeIn(l_now), run_time=0.6)
            self.wait_to(v, "D")
            self.sfx("hit")
            self.play(GrowFromCenter(b_del), FadeIn(l_del, shift=0.1 * DOWN), run_time=0.8)

        # --- N5: ブートストラップ ---
        boot = VGroup(
            Polygon([-0.5, -0.75, 0], [1.05, -0.75, 0], [1.1, -0.45, 0], [0.8, -0.22, 0], [0.2, -0.1, 0],
                    [0.2, 0.95, 0], [-0.5, 0.95, 0], stroke_color=GREY_A, stroke_width=3,
                    fill_color="#6b5240", fill_opacity=1),
            Rectangle(width=0.7, height=0.14, stroke_width=0, fill_color="#4a382b", fill_opacity=1).move_to([-0.15, 0.82, 0]),
            ArcBetweenPoints([-0.48, 0.93, 0], [-0.2, 0.93, 0], angle=-PI * 1.5, stroke_color=GREY_A,
                             stroke_width=5))
        boot.scale(1.15).move_to(LEFT * 5.0 + DOWN * 1.35)
        bot = Robot(height=0.75).next_to(boot, RIGHT, buff=0.35).align_to(boot, DOWN).look(LEFT)
        strap = Line(boot[2].get_top(), bot.get_left() + 0.1 * UP, stroke_color=GREY_A, stroke_width=3)
        lift = Arrow(boot[2].get_top() + 0.3 * LEFT + 0.05 * UP, boot[2].get_top() + 0.3 * LEFT + 1.1 * UP, buff=0,
                     color=WHITE, stroke_width=6)
        bs_lab = jt("ブートストラップ", size=40, color=WHITE).next_to(VGroup(boot, bot), DOWN, buff=0.35)
        errs = td_error_curve(1000, seed=0)
        ax = Axes(x_range=[0, 3, 1], y_range=[0, 0.2, 0.1], x_length=5.8, y_length=3.0, tips=False,
                  axis_config={"stroke_color": GREY_C, "stroke_width": 2, "include_ticks": True})
        ax.move_to(RIGHT * 3.3 + DOWN * 1.4)
        curve = VMobject(stroke_color=style.VALUE, stroke_width=5)
        curve.set_points_as_corners([ax.c2p(np.log10(i), min(errs[i], 0.2)) for i in range(1, len(errs))])
        xt = VGroup(*[mt(lab, size=30, color=GREY_B).next_to(ax.c2p(x, 0), DOWN, buff=0.15)
                      for x, lab in [(0, "1"), (1, "10"), (2, "100"), (3, "1000")]])
        xl = jt("エピソード（対数）", size=28, color=GREY_B).next_to(xt, DOWN, buff=0.1)
        yl = jt("真の価値とのずれ", size=30, color=GREY_B).next_to(ax, UP, buff=0.2).align_to(ax, LEFT)
        with self.voice("推定値を使って、推定値を更新する。{A}自分の靴紐を引っ張って、自分を持ち上げるような、この方法を、{B}《ブートストラップ》と呼びます。"
                        "{I}一見インチキのようですが、{C}ちゃんと、ベルマン方程式の解に収束します。") as v:
            self.play(FadeOut(VGroup(b_tgt, l_tgt, b_now, l_now, b_del, l_del, title)),
                      td_eq.animate.move_to(UP * 1.9), run_time=0.8)
            loop = CurvedArrow(td_eq[15].get_top() + 0.1 * UP, td_eq[5].get_top() + 0.1 * UP, angle=0.7,
                               color=style.VALUE, stroke_width=4)
            self.play(Create(loop), Indicate(td_eq[15:19], color=style.VALUE), Indicate(td_eq[5:9], color=style.VALUE),
                      run_time=1.2)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(FadeIn(boot, shift=0.2 * UP), FadeIn(bot), Create(strap), run_time=0.6)
            self.play(bot.change("determined"), run_time=0.3)
            self.play(GrowArrow(lift), VGroup(boot, strap).animate.shift(0.35 * UP), bot.animate.shift(0.35 * UP),
                      run_time=0.8)
            self.play(VGroup(boot, bot, strap).animate.shift(0.25 * UP), rate_func=there_and_back, run_time=0.6)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(bs_lab, shift=0.1 * UP), run_time=0.6)
            self.wait_to(v, "I")
            self.play(bot.change("worried"), run_time=0.4)
            self.wait_to(v, "C")
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(xt), bot.animate.look(RIGHT), run_time=0.7)
            self.play(Create(curve), run_time=2.0)
            self.sfx("chime")
            self.play(bot.change("happy"), run_time=0.3)
            self.play(bot.hop(), run_time=0.45)

        # --- N6: バックアップの枝を1本だけ ---
        root = Circle(radius=0.3, stroke_color=style.STATE, stroke_width=4, fill_color=style.BG,
                      fill_opacity=1).move_to(UP * 2.6)
        acts, e1, e2, kids = VGroup(), VGroup(), VGroup(), VGroup()
        for x in (-3.9, -1.3, 1.3, 3.9):
            ad = Dot([x, 0.9, 0], radius=0.14, color=style.ACTION)
            e1.add(Line(root.get_center(), ad.get_center(), stroke_color=GREY_B, stroke_width=2.5))
            acts.add(ad)
            kk = VGroup()
            for dx in (-0.85, 0, 0.85):
                c = Circle(radius=0.22, stroke_color=style.STATE, stroke_width=3, fill_color=style.BG,
                           fill_opacity=1).move_to([x + dx, -0.9, 0])
                e2.add(Line(ad.get_center(), c.get_center(), stroke_color=GREY_C, stroke_width=2))
                kk.add(c)
            kids.add(kk)
        tree = VGroup(e1, e2, root, acts, kids)
        pi_lab = mt(r"\pi(a\mid s)", size=48, color=style.POLICY).next_to(e1[0].get_center(), UL, buff=0.1)
        p_lab = mt(r"P(s'\mid s,a)", size=44).next_to(e2[0].get_center(), LEFT, buff=0.12)
        ai, ki = 1, 0  # 実際に起きた枝
        chosen_leaf = kids[ai][ki]
        leaf_lab = mt("r", "+", r"\gamma", *v_parts("s'"), size=58).next_to(chosen_leaf, DOWN, buff=0.3)
        with self.voice("実はこれは、前回のバックアップの、{A}すべての枝の平均の代わりに、{B}実際に起きた一本の枝だけを使ったもの、と見ることもできます。"
                        "{C}遷移確率を知らなくても、実際の経験が、その代わりをしてくれるわけです。") as v:
            self.play(FadeOut(VGroup(boot, lift, bs_lab, ax, curve, xl, yl, xt, loop, strap)),
                      td_eq.animate.become(td_bottom_eq()),
                      bot.animate.set_mood("normal").scale(0.48).move_to(chosen_leaf.get_center()).look(UP),
                      run_time=0.9)
            self.play(FadeIn(root), LaggedStart(*[Create(l) for l in e1], lag_ratio=0.1), FadeIn(acts),
                      run_time=0.8)
            self.bring_to_front(bot)
            self.play(LaggedStart(*[Create(l) for l in e2], lag_ratio=0.03), FadeIn(kids), FadeIn(pi_lab),
                      FadeIn(p_lab), run_time=0.9)
            self.bring_to_front(bot)
            self.wait_to(v, "A")
            ups1 = [Dot(c.get_center(), radius=0.07, color=style.VALUE) for kk in kids for c in kk]
            tgt1 = [acts[i // 3].get_center() for i in range(12)]
            self.play(*[MoveAlongPath(d, Line(d.get_center(), t)) for d, t in zip(ups1, tgt1)], run_time=0.9)
            self.remove(*ups1)
            ups2 = [Dot(a.get_center(), radius=0.08, color=style.VALUE) for a in acts]
            self.play(*[MoveAlongPath(d, Line(d.get_center(), root.get_center())) for d in ups2], run_time=0.8)
            self.remove(*ups2)
            self.play(Flash(root, color=style.VALUE, flash_radius=0.5), run_time=0.5)
            self.wait_to(v, "B")
            others = VGroup(*[e1[i] for i in range(4) if i != ai], *[acts[i] for i in range(4) if i != ai],
                            *[e2[3 * i + j] for i in range(4) for j in range(3) if (i, j) != (ai, ki)],
                            *[kids[i][j] for i in range(4) for j in range(3) if (i, j) != (ai, ki)], pi_lab)
            self.play(others.animate.set_opacity(0.12), e1[ai].animate.set_stroke(WHITE, 5),
                      e2[3 * ai + ki].animate.set_stroke(WHITE, 5), run_time=0.9)
            self.play(Write(leaf_lab), run_time=0.8)
            d = Dot(chosen_leaf.get_center(), radius=0.09, color=style.VALUE)
            path = VMobject().set_points_as_corners([chosen_leaf.get_center(), acts[ai].get_center(),
                                                     root.get_center()])
            self.play(MoveAlongPath(d, path), run_time=1.0)
            self.remove(d)
            self.play(Flash(root, color=style.VALUE, flash_radius=0.5), run_time=0.5)
            self.wait_to(v, "C")
            px = cross_mark(p_lab, width=5)
            self.sfx("hit")
            self.play(Create(px), run_time=0.5)
            self.play(FadeOut(VGroup(p_lab, px)), bot.change("happy"), run_time=0.6)
        # 式だけを残す（次のシーンの冒頭と同じ位置）
        self.play(FadeOut(VGroup(tree, leaf_lab, bot, pi_lab)), run_time=0.9)


# ---------------------------------------------------------------------------
# 4b. ドーパミンと TD 誤差（この章いちばんの「なるほど」）
# ---------------------------------------------------------------------------
def lamp_icon(size=0.42, lit=False):
    bulb = Circle(radius=size / 2, stroke_color=GREY_A, stroke_width=2.5,
                  fill_color=CUE_COLOR if lit else "#1c1c22", fill_opacity=1)
    base = RoundedRectangle(width=size * 0.5, height=size * 0.28, corner_radius=0.03, stroke_width=0,
                            fill_color=GREY_B, fill_opacity=1).next_to(bulb, DOWN, buff=-0.02)
    return VGroup(bulb, base)


def juice_icon(size=0.46):
    cup = Polygon([-0.5, 0.5, 0], [0.5, 0.5, 0], [0.36, -0.5, 0], [-0.36, -0.5, 0], stroke_color=GREY_A,
                  stroke_width=2.5, fill_color="#16161A", fill_opacity=1).scale(size / 1.0)
    liquid = Polygon([-0.44, 0.15, 0], [0.44, 0.15, 0], [0.36, -0.5, 0], [-0.36, -0.5, 0], stroke_width=0,
                     fill_color=style.REWARD, fill_opacity=0.9).scale(size / 1.0)
    liquid.align_to(cup, DOWN).shift(0.02 * UP)
    return VGroup(cup, liquid)


def neuron_icon(scale=1.0):
    soma = Circle(radius=0.34, stroke_color=WHITE, stroke_width=3, fill_color="#20202a", fill_opacity=1)
    nucleus = Dot(radius=0.08, color=GREY_B)
    dend = VGroup(*[Line(ORIGIN, 0.75 * np.array([np.cos(a), np.sin(a), 0]), stroke_color=WHITE, stroke_width=3)
                    .shift(0.3 * np.array([np.cos(a), np.sin(a), 0])) for a in (1.9, 2.6, 3.4, 4.2)])
    axon = Line(0.34 * RIGHT, 1.6 * RIGHT, stroke_color=WHITE, stroke_width=3)
    term = VGroup(*[Line(1.6 * RIGHT, 1.6 * RIGHT + 0.35 * np.array([np.cos(a), np.sin(a), 0]), stroke_color=WHITE,
                         stroke_width=3) for a in (-0.6, 0, 0.6)])
    return VGroup(dend, axon, term, soma, nucleus).scale(scale)


CUE_COLOR = ManimColor("#9FD8FF")


class Dopamine(VoiceScene):
    def construct(self):
        td_eq = td_bottom_eq()
        self.add(td_eq)
        deltas, omit = dopamine_td()
        MID = 9                                   # 「途中」として見せる試行
        conds = [deltas[0], deltas[MID - 1], deltas[-1], omit]

        # ---- レイアウト ----
        COLS = [(-5.0, -0.9), (0.3, 4.4)]          # δ（計算）と、発火（模式図）の横の範囲
        ROW_Y = [1.95, 0.55, -0.85, -2.25]
        step = (COLS[0][1] - COLS[0][0]) / DA_T

        def tx(col, t):
            return COLS[col][0] + t * step

        # ---- N1: TD 誤差に注目 ----
        robot = Robot(height=0.8).move_to([5.9, -0.2, 0])
        with self.voice("[TD|ティーディー]誤差には、驚くような後日談があります。") as v:
            self.play(td_eq.animate.become(eq(TD_EQ, size=60).move_to(UP * 0.6 + LEFT * 0.4)), run_time=1.0)
            b = Brace(VGroup(*td_eq[12:24]), DOWN, color=RED)
            dl = mt(r"\delta", size=72, color=RED).next_to(b, DOWN, buff=0.15)
            self.sfx("pop")
            self.play(GrowFromCenter(b), FadeIn(dl, shift=0.1 * UP), FadeIn(robot), run_time=0.8)
            self.play(robot.animate.look(LEFT), run_time=0.3)

        # ---- N2: 1997年、サルのドーパミン神経細胞 ----
        neuron = neuron_icon(1.1).move_to([2.2, 0.2, 0])
        electrode = Line([3.3, 2.6, 0], neuron[3].get_center() + 0.25 * UR, stroke_color=GREY_B, stroke_width=3)
        trace = VMobject(stroke_color=WHITE, stroke_width=2)
        trng = np.random.default_rng(4)
        pts, x = [], 0.0
        while x < 4.2:
            if trng.random() < 0.12:
                pts += [[x, 0, 0], [x + 0.03, 0.55, 0], [x + 0.06, -0.2, 0], [x + 0.09, 0, 0]]
                x += 0.09
            else:
                pts.append([x, trng.uniform(-0.03, 0.03), 0])
                x += 0.06
        trace.set_points_as_corners(np.array(pts))
        trace.next_to(neuron, DOWN, buff=0.35)
        cite = VGroup(Text("Schultz, Dayan & Montague (1997)", font_size=28, color=GREY_B),
                      Text("Science", font_size=28, color=GREY_B, slant=ITALIC)).arrange(RIGHT, buff=0.2)
        cite.to_edge(DOWN, buff=0.45)
        who = jt("サルの中脳の、ドーパミン神経細胞", size=32, color=GREY_A).move_to([2.2, -2.72, 0])
        with self.voice("1997年、サルの脳の、ドーパミンを出す神経細胞の記録が、{A}[TD|ティーディー]誤差と、そっくりの振る舞いをすることが報告されました。") as v:
            eq_grp = VGroup(td_eq, b)
            self.play(eq_grp.animate.scale(0.55).move_to([-3.6, 2.6, 0]), dl.animate.scale(1.2).move_to([-3.6, 0.2, 0]),
                      run_time=1.0)
            self.sfx("pop")
            self.play(FadeIn(neuron, scale=0.8), Create(electrode), FadeIn(who, shift=0.1 * DOWN), run_time=1.0)
            self.play(Create(trace), FadeIn(cite), run_time=1.4)
            self.wait_to(v, "A")
            sim = mt(r"\approx", size=90, color=WHITE).move_to([-1.3, 0.2, 0])
            self.sfx("sparkle")
            self.play(FadeIn(sim, scale=0.5), Indicate(dl, color=RED, scale_factor=1.3),
                      robot.change("surprised"), run_time=0.9)

        # ---- 表の枠：見出し、合図とジュースの時刻、4段の行 ----
        head_l = VGroup(jt("TD誤差", size=32, color=WHITE), mt(r"\delta_t", size=48, color=RED),
                        jt("（計算）", size=28, color=GREY_B)).arrange(RIGHT, buff=0.15)
        head_l.move_to([(COLS[0][0] + COLS[0][1]) / 2, 3.42, 0])
        head_r = jt("ドーパミン神経の発火（模式図）", size=28, color=WHITE)
        head_r.move_to([(COLS[1][0] + COLS[1][1]) / 2, 3.42, 0])
        mini = neuron_icon(0.26).next_to(head_r, RIGHT, buff=0.2)
        ev = VGroup()
        lamps, cups = [], []
        for col in (0, 1):
            lp = lamp_icon(0.4).move_to([tx(col, DA_CUE + 0.5), 2.85, 0])
            cp = juice_icon(0.42).move_to([tx(col, DA_REWARD + 0.5), 2.85, 0])
            lamps.append(lp)
            cups.append(cp)
            ev.add(lp, cp)
        guides = VGroup()
        for col in (0, 1):
            for t, colr in ((DA_CUE + 0.5, CUE_COLOR), (DA_REWARD + 0.5, style.REWARD)):
                guides.add(DashedLine([tx(col, t), 2.55, 0], [tx(col, t), -2.95, 0], color=colr,
                                      stroke_width=2, dash_length=0.08).set_opacity(0.45))
        axes_lines = VGroup(*[Line([COLS[c][0], y, 0], [COLS[c][1], y, 0], stroke_color=GREY_D, stroke_width=2)
                              for y in ROW_Y for c in (0, 1)])
        row_names = ["1回目", "途中", "学習後", "報酬なし"]
        row_labs = VGroup(*[jt(n, size=30, color=GREY_A).move_to([-6.05, y, 0]) for n, y in zip(row_names, ROW_Y)])
        time_labs = VGroup(*[jt("時間 →", size=26, color=GREY_C).move_to([(COLS[c][0] + COLS[c][1]) / 2, -3.3, 0])
                             for c in (0, 1)])

        def bars(delta, y):
            g = VGroup()
            for t, d in enumerate(delta):
                h = float(d) * 0.55
                if abs(h) < 0.004:
                    h = 0.004 if h >= 0 else -0.004
                r = Rectangle(width=step * 0.7, height=abs(h), stroke_width=0,
                              fill_color=style.REWARD if d >= 0 else RED, fill_opacity=0.95)
                r.move_to([tx(0, t + 0.5), y + h / 2, 0])
                g.add(r)
            return g

        def raster(delta, y, seed):
            sp = spike_raster(delta, lanes=7, seed=seed)
            g = VGroup()
            for i, lane in enumerate(sp):
                yy = y - 0.46 + i * 0.155
                for tt in lane:
                    g.add(Line([tx(1, tt), yy, 0], [tx(1, tt), yy + 0.13, 0], stroke_color=WHITE, stroke_width=2.2))
            return g

        # ---- N3: 1回目：ジュースが来た瞬間に反応 ----
        bars0 = bars(conds[0], ROW_Y[0])
        ras0 = raster(conds[0], ROW_Y[0], seed=1)
        with self.voice("ランプが光った少しあとに、{J}ジュースがもらえる。最初のうちは、{A}ジュースが来た瞬間に、神経細胞が強く反応します。"
                        "予想していなかった、良いことが起きたからです。") as v:
            self.play(ReplacementTransform(dl, head_l[1]), FadeIn(head_l[0]), FadeIn(head_l[2]),
                      ReplacementTransform(neuron, mini), FadeIn(head_r),
                      FadeOut(VGroup(eq_grp, sim, electrode, trace, who, cite)),
                      robot.change("normal"), run_time=1.2)
            self.play(FadeIn(ev), Create(guides), FadeIn(axes_lines), FadeIn(row_labs[0]), FadeIn(time_labs),
                      run_time=0.9)
            self.sfx("pop")
            self.play(*[lp[0].animate.set_fill(CUE_COLOR) for lp in lamps], robot.animate.look(UL), run_time=0.4)
            self.play(*[Flash(lp, color=CUE_COLOR, flash_radius=0.35, line_length=0.12) for lp in lamps], run_time=0.5)
            self.play(*[lp[0].animate.set_fill("#1c1c22") for lp in lamps], run_time=0.3)
            self.wait_to(v, "J")
            self.sfx("chime")
            self.play(*[Flash(cp, color=style.REWARD, flash_radius=0.4, line_length=0.14) for cp in cups],
                      robot.animate.look(UP), run_time=0.6)
            self.wait_to(v, "A")
            bang = robot.say(BANG, direction=UP)
            self.play(FadeIn(bars0, lag_ratio=0.05), FadeIn(ras0, lag_ratio=0.002), robot.change("surprised"),
                      FadeIn(bang, scale=0.7), run_time=1.3)
            self.play(robot.change("happy"), run_time=0.4)
            self.play(Indicate(bars0[DA_REWARD], color=WHITE, scale_factor=1.4), run_time=0.8)

        # ---- N4: 学習が進むと、合図の瞬間に移る ----
        bars1 = bars(conds[0], ROW_Y[1])
        n_cnt = Integer(1, font_size=34, color=GREY_B)
        n_lab = VGroup(n_cnt, jt("回目", size=26, color=GREY_B)).arrange(RIGHT, buff=0.06)
        n_lab.next_to(row_labs[1], DOWN, buff=0.12)
        bars2 = bars(conds[2], ROW_Y[2])
        ras2 = raster(conds[2], ROW_Y[2], seed=2)
        with self.voice("ところが、学習が進むと、{A}反応は、ランプが光った瞬間に移り、{B}ジュースそのものには、反応しなくなります。"
                        "ジュースが来ることは、もう予想できているからです。") as v:
            self.play(FadeOut(bang), robot.change("normal"), FadeIn(row_labs[1]), FadeIn(n_lab), FadeIn(bars1), run_time=0.6)
            per = max(0.22, (v.until("A") - 0.3) / (MID - 1))
            for n in range(2, MID + 1):
                self.play(Transform(bars1, bars(deltas[n - 1], ROW_Y[1])), ChangeDecimalToValue(n_cnt, n),
                          run_time=per)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(row_labs[2]), FadeIn(bars2, lag_ratio=0.05), FadeIn(ras2, lag_ratio=0.002),
                      robot.animate.set_mood("happy").look(UL), run_time=1.2)
            self.play(Indicate(bars2[DA_CUE], color=WHITE, scale_factor=1.4), run_time=0.8)
            self.wait_to(v, "B")
            ring = VGroup(*[Circle(radius=0.36, stroke_color=style.REWARD, stroke_width=4)
                            .move_to([tx(c, DA_REWARD + 0.5), ROW_Y[2] + 0.1, 0]) for c in (0, 1)])
            self.play(Create(ring), robot.change("normal"), run_time=0.7)
            self.play(ring.animate.set_opacity(0.0), run_time=1.2)
            self.remove(ring)

        # ---- N5: ジュースを抜くと、来るはずの時刻に下がる ----
        bars3 = bars(conds[3], ROW_Y[3])
        ras3 = raster(conds[3], ROW_Y[3], seed=3)
        no_juice = VGroup(*[VGroup(juice_icon(0.3), cross_mark(juice_icon(0.3), width=4, pad=0.05))
                            .move_to([tx(c, DA_REWARD + 0.5) + 0.42, ROW_Y[3] + 0.76, 0]) for c in (0, 1)])
        with self.voice("そして、{A}ジュースを抜くと、来るはずだった時刻に、活動が、ふだんより下がります。予想より悪かった、という信号です。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(row_labs[3]), FadeIn(no_juice), run_time=0.6)
            self.sfx("thud")
            self.play(FadeIn(bars3, lag_ratio=0.05), FadeIn(ras3, lag_ratio=0.002),
                      robot.animate.set_mood("sad").look(DL), run_time=1.3)
            dip = SurroundingRectangle(bars3[DA_REWARD], color=RED, buff=0.08)
            self.play(Create(dip), run_time=0.6)
            hole = Rectangle(width=0.9 * step * 2.2, height=1.15, stroke_color=RED, stroke_width=3)
            hole.move_to([tx(1, DA_REWARD + 0.45), ROW_Y[3], 0])
            self.play(Create(hole), run_time=0.6)

        # ---- N6: 報酬ではなく、予想とのずれ ----
        with self.voice("報酬そのものではなく、{A}《予想とのずれ》。脳は、[TD|ティーディー]学習のようなことを、しているのかもしれません。") as v:
            self.play(FadeOut(VGroup(dip, hole)), robot.change("normal"), run_time=0.6)
            self.wait_to(v, "A")
            peaks = VGroup(bars0[DA_REWARD], bars2[DA_CUE], bars3[DA_CUE], bars3[DA_REWARD])
            self.sfx("sparkle")
            self.play(*[Indicate(p, color=WHITE, scale_factor=1.35) for p in peaks],
                      Indicate(VGroup(ras0, ras2, ras3), color=style.REWARD, scale_factor=1.02),
                      robot.change("happy"), run_time=1.4)
            self.play(robot.hop(), run_time=0.5)
        self.play(FadeOut(VGroup(head_l, head_r, mini, ev, guides, axes_lines, row_labs, time_labs, n_lab,
                                 bars0, ras0, bars1, bars2, ras2, bars3, ras3, no_juice, robot)), run_time=1.0)


# ---------------------------------------------------------------------------
# 5. バイアスとバリアンス
# ---------------------------------------------------------------------------
class BiasVariance(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=0.62, show_terminal_labels=False).move_to(LEFT * 5.0 + UP * 0.2)
        focus = SurroundingRectangle(g.cells[S21], color=style.STATE, stroke_width=4, buff=0)
        robot = Robot(height=0.32).move_to(g.center_of(S21))
        pol_lab = jt("でたらめな方策", size=28, color=GREY_B).next_to(g, DOWN, buff=0.3)

        X0, X1 = -2.4, 6.4

        def nx(val):
            return X0 + (val + 1) / 2 * (X1 - X0)

        MC_Y, TD_Y, HB = 2.05, -1.3, 0.5

        def band_axis(y):
            ax = Line([X0, y - HB - 0.12, 0], [X1, y - HB - 0.12, 0], stroke_color=GREY_C, stroke_width=2)
            tk = VGroup()
            for val in (-1, -0.5, 0, 0.5, 1):
                p = np.array([nx(val), y - HB - 0.12, 0])
                tk.add(Line(p + 0.07 * UP, p + 0.07 * DOWN, stroke_color=GREY_C, stroke_width=2))
                tk.add(mt(f"{val:g}", size=26, color=GREY_B).next_to(p, DOWN, buff=0.12))
            return VGroup(ax, tk)

        mc_axis, td_axis = band_axis(MC_Y), band_axis(TD_Y)
        mc_lab = VGroup(jt("モンテカルロの目標", size=30, color=WHITE), mt("G", size=42, color=style.REWARD))
        mc_lab.arrange(RIGHT, buff=0.25).move_to([X0, MC_Y + HB + 0.75, 0], aligned_edge=LEFT)
        td_f = mt("r", "+", r"\gamma", *v_parts("s'"), size=42)
        td_lab = VGroup(jt("TDの目標", size=30, color=WHITE), td_f).arrange(RIGHT, buff=0.25)
        td_lab.move_to([X0, TD_Y + HB + 1.15, 0], aligned_edge=LEFT)
        vt = V_UNI[S21]
        true_mc = DashedLine([nx(vt), MC_Y - HB - 0.12, 0], [nx(vt), MC_Y + HB + 0.1, 0], color=WHITE,
                             stroke_width=3, dash_length=0.08)
        true_td = DashedLine([nx(vt), TD_Y - HB - 0.12, 0], [nx(vt), TD_Y + HB + 0.1, 0], color=WHITE,
                             stroke_width=3, dash_length=0.08)
        true_lab = VGroup(jt("真の値", size=28, color=GREY_A), mt("V", "(", "s", ")", size=36))
        true_lab.arrange(RIGHT, buff=0.15).move_to([nx(vt), TD_Y - HB - 0.98, 0])

        N = 300
        samples = mc_samples(N, seed=7)
        G = np.array([x[1] for x in samples])
        ends = [x[0][-1][3] for x in samples]
        first_steps = [x[0][0] for x in samples]
        T_true = np.array([td_target(tr, V_UNI) for tr in first_steps])
        V_hat = td0(UNIFORM, 20, 0.5, seed=1)
        T_hat = np.array([td_target(tr, V_hat) for tr in first_steps])
        rng = np.random.default_rng(3)
        jit_mc = rng.uniform(-HB, HB, N)
        jit_td = rng.uniform(-HB, HB, N)
        mc_dots = VGroup(*[Dot([nx(G[i]), MC_Y + jit_mc[i], 0], radius=0.048,
                               color=style.REWARD if ends[i] == GOAL else RED).set_opacity(0.75)
                           for i in range(N)])
        td_dots = VGroup(*[Dot([nx(T_true[i]), TD_Y + jit_td[i], 0], radius=0.048,
                               color=style.VALUE).set_opacity(0.75) for i in range(N)])

        with self.voice("モンテカルロと、[TD|ティーディー]。二つの目標を、同じマスで比べてみましょう。") as v:
            self.play(FadeIn(g), Create(focus), FadeIn(robot), FadeIn(pol_lab), run_time=1.0)
            self.play(FadeIn(mc_axis), FadeIn(td_axis), FadeIn(mc_lab), FadeIn(td_lab), run_time=1.0)
            self.play(Create(true_mc), Create(true_td), FadeIn(true_lab), run_time=0.8)

        star_i = goal_icon(0.42).move_to([nx(0.97), MC_Y, 0])
        pit_i = pit_icon(0.44).move_to([nx(-0.96), MC_Y, 0])
        with self.voice("{A}モンテカルロの目標、つまり実際のリターンは、こんなふうに、大きくばらつきます。"
                        "{B}星にたどり着く回もあれば、穴に落ちる回もあるからです。") as v:
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(d, shift=0.6 * DOWN) for d in mc_dots[:30]], lag_ratio=0.12),
                      run_time=1.6)
            self.play(LaggedStart(*[FadeIn(d, shift=0.6 * DOWN) for d in mc_dots[30:]], lag_ratio=0.01),
                      run_time=1.8)
            self.wait_to(v, "B")
            pos = VGroup(*[d for d, e in zip(mc_dots, ends) if e == GOAL])
            neg = VGroup(*[d for d, e in zip(mc_dots, ends) if e != GOAL])
            self.play(FadeIn(star_i, scale=0.5), Indicate(pos, color=style.REWARD, scale_factor=1.4),
                      robot.change("happy"), run_time=1.0)
            self.play(FadeIn(pit_i, scale=0.5), Indicate(neg, color=RED, scale_factor=1.4),
                      robot.change("worried"), run_time=1.0)

        with self.voice("{A}[TD|ティーディー]の目標は、一歩分のばらつきしか含まないので、ずっと狭い範囲に収まります。") as v:
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(d, shift=0.6 * DOWN) for d in td_dots[:30]], lag_ratio=0.12),
                      robot.change("normal"), run_time=1.4)
            self.play(LaggedStart(*[FadeIn(d, shift=0.6 * DOWN) for d in td_dots[30:]], lag_ratio=0.01),
                      run_time=1.6)
            w_mc = DoubleArrow([nx(G.min()), MC_Y + HB + 0.15, 0], [nx(G.max()), MC_Y + HB + 0.15, 0], buff=0,
                               color=GREY_A, stroke_width=3, tip_length=0.16)
            w_td = DoubleArrow([nx(T_true.min()), TD_Y + HB + 0.15, 0], [nx(T_true.max()), TD_Y + HB + 0.15, 0],
                               buff=0, color=GREY_A, stroke_width=3, tip_length=0.16)
            self.play(GrowFromCenter(w_mc), GrowFromCenter(w_td), run_time=0.8)

        td_f_hat = mt("r", "+", r"\gamma", r"\hat V", "(", "s'", ")", size=42).move_to(td_f, aligned_edge=LEFT)
        td_f_hat[3].set_color(style.VALUE)
        hat_note = jt("学習途中の推定値", size=26, color=style.VALUE).next_to(td_lab, RIGHT, buff=0.3)
        m_hat = float(T_hat.mean())
        bias_line = DashedLine([nx(m_hat), TD_Y - HB - 0.12, 0], [nx(m_hat), TD_Y + HB + 0.1, 0], color=style.VALUE,
                               stroke_width=3, dash_length=0.08)
        with self.voice("その代わり、[TD|ティーディー]の目標は、{A}今の推定値が間違っていると、そのぶん、ずれてしまいます。"
                        "{B}偏り、つまり《バイアス》があるわけです。") as v:
            self.play(FadeOut(w_td), run_time=0.4)
            self.wait_to(v, "A")
            self.play(TransformMatchingTex(td_f, td_f_hat), FadeIn(hat_note), run_time=0.8)
            self.play(*[d.animate.set_x(nx(T_hat[i])) for i, d in enumerate(td_dots)], run_time=1.6)
            self.wait_to(v, "B")
            barr = DoubleArrow([nx(vt), TD_Y + HB + 0.28, 0], [nx(m_hat), TD_Y + HB + 0.28, 0], buff=0, color=RED,
                               stroke_width=5, tip_length=0.16)
            b_lab = jt("バイアス", size=32, color=RED).next_to(barr, RIGHT, buff=0.2)
            self.sfx("hit")
            self.play(Create(bias_line), GrowFromCenter(barr), FadeIn(b_lab), robot.change("worried"), run_time=0.9)

        # --- まとめと、中間の方法 ---
        rows = VGroup()
        specs = [("1歩（TD）", ["r_{1}", "+", r"\gamma", "V(s_1)"]),
                 ("2歩", ["r_{1}", "+", r"\gamma", "r_{2}", "+", r"\gamma^2", "V(s_2)"]),
                 ("3歩", ["r_{1}", "+", r"\gamma", "r_{2}", "+", r"\gamma^2", "r_{3}", "+", r"\gamma^3", "V(s_3)"]),
                 ("最後まで（MC）", ["r_{1}", "+", r"\gamma", "r_{2}", "+", r"\gamma^2", "r_{3}", "+", r"\cdots"])]
        for name, parts in specs:
            f = mt(*parts, size=54)
            for i, p in enumerate(parts):
                if p.startswith("r_"):
                    f[i].set_color(style.REWARD)
                elif p.startswith(r"\gamma"):
                    f[i].set_color(style.GAMMA)
                elif p.startswith("V"):
                    f[i].set_color(style.VALUE)
            rows.add(VGroup(jt(name, size=34, color=GREY_B), f))
        for r in rows:
            r[0].move_to([-3.6, 0, 0], aligned_edge=RIGHT)
            r[1].move_to([-3.1, 0, 0], aligned_edge=LEFT)
        for i, r in enumerate(rows):
            r.shift(UP * (1.75 - 1.15 * i))
        final = jt("→ 最終章", size=34, color=GREY_A).move_to(RIGHT * 4.6 + DOWN * 3.2)
        with self.voice("ばらつきは大きいけれど、偏りのないモンテカルロ。{T}ばらつきは小さいけれど、偏りうる[TD|ティーディー]。"
                        "{A}実は、何歩か進んでから見積もる、中間の方法もあります。{B}この考え方は、最終章で、もう一度登場します。") as v:
            self.play(Indicate(mc_dots, scale_factor=1.3, color=WHITE), Indicate(w_mc, color=WHITE), run_time=1.3)
            self.wait_to(v, "T")
            self.play(Indicate(td_dots, scale_factor=1.3, color=WHITE), Indicate(barr, color=RED), run_time=1.3)
            self.wait_to(v, "A")
            self.play(FadeOut(VGroup(g, focus, robot, pol_lab, mc_axis, td_axis, hat_note,
                                     true_mc, true_td, true_lab, mc_dots, td_dots, star_i, pit_i, w_mc, bias_line,
                                     barr, b_lab)),
                      ReplacementTransform(td_lab[0], rows[0][0]), ReplacementTransform(td_f_hat, rows[0][1]),
                      ReplacementTransform(mc_lab[0], rows[3][0]), ReplacementTransform(mc_lab[1], rows[3][1]),
                      run_time=1.2)
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(r, shift=0.15 * RIGHT) for r in rows[1:3]], lag_ratio=0.35), run_time=1.3)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(Indicate(VGroup(rows[1], rows[2]), color=WHITE, scale_factor=1.04), FadeIn(final), run_time=1.0)
        self.play(FadeOut(VGroup(rows, final)), run_time=0.8)


# ---------------------------------------------------------------------------
# 6. V から Q へ、SARSA と Q 学習
# ---------------------------------------------------------------------------
class Control(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.2).move_to(LEFT * 3.6 + 0.2 * DOWN)
        heat = VGroup(*[g.cells[s].copy().set_fill(value_color(V_STAR[s]), 1).set_stroke(GREY_D, 2)
                        for s in g.nonterminal_states()])
        labs = g.value_labels(V_STAR, size=30)
        focus = SurroundingRectangle(g.cells[S21], color=style.STATE, stroke_width=6, buff=0)
        cands = VGroup(*[g.arrow(S21, a, color=GREY_A, length=0.4, stroke_width=5).shift(
            ACTION_VEC[a] * 0.3 * g.cell) for a in ACTIONS])
        bot = Robot(height=0.44).move_to(g.center_of(S21))
        qmark = bot.think("どっち？", direction=UL, size=30)
        calc1 = mt(*q_parts(), "=", size=50)
        calc2 = mt(r"\sum_{s'}", "P", "(", "s'", r"\mid", "s", ",", "a", ")", r"\big[", "r", "+",
                   r"\gamma", *v_parts("s'"), r"\big]", size=50)
        calc = VGroup(calc1, calc2).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        calc2.shift(0.35 * RIGHT)
        calc.move_to(RIGHT * 3.3 + UP * 1.0)
        calc_P = VGroup(*calc2[1:9])
        with self.voice("さて、価値が分かっても、{A}それだけでは動けません。{B}前回は、遷移確率を使って、どの行動が良いかを計算しました。"
                        "{C}でも、今は、その遷移確率がありません。") as v:
            self.play(FadeIn(g), FadeIn(heat), FadeIn(VGroup(*labs.values())), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(Create(focus), FadeOut(labs[S21]), FadeIn(bot, scale=0.6), run_time=0.6)
            self.play(LaggedStart(*[GrowArrow(a) for a in cands], lag_ratio=0.1), FadeIn(qmark, scale=0.7),
                      bot.animate.set_mood("worried").look(UP), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Write(calc), run_time=1.4)
            self.play(Indicate(calc_P, color=WHITE), run_time=0.8)
            self.wait_to(v, "C")
            px = cross_mark(calc_P, width=6)
            self.sfx("hit")
            self.play(Create(px), calc2.animate.set_opacity(0.5), run_time=0.7)

        tris = QTriangles(g, Q_STAR)
        q_big = mt(*q_parts(), size=80).move_to(RIGHT * 3.3 + UP * 1.3)
        q_name = jt("行動価値", size=40, color=style.VALUE).next_to(q_big, UP, buff=0.35)
        amax = mt(r"\arg\max_{a}", *q_parts(), size=56).next_to(q_big, DOWN, buff=0.9)
        arrows = g.policy_arrows(greedy_from_q(Q_STAR), color=WHITE, length=0.46, stroke_width=4)
        best = tris.tris[S21, PI_STAR[S21]]
        with self.voice("そこで、{A}最初から、行動価値[Q|キュー]を学ぶことにします。"
                        "[Q|キュー]なら、遷移確率がなくても、{B}一番大きな[値|あたい]の行動を選ぶだけで済みます。") as v:
            self.play(FadeOut(VGroup(calc2, px, calc1[6])), FadeOut(qmark), run_time=0.5)
            self.wait_to(v, "A")
            # V のマス目が、4つの三角形（行動ごとの Q）に割れる
            self.sfx("whoosh")
            cell_of = {s: sq for s, sq in zip(g.nonterminal_states(), heat)}
            self.play(FadeOut(VGroup(*[l for s, l in labs.items() if s != S21])), FadeOut(cands),
                      *[ReplacementTransform(cell_of[s], VGroup(*[tris.tris[s, a] for a in ACTIONS]))
                        for s in g.nonterminal_states()],
                      ReplacementTransform(VGroup(*calc1[:6]), q_big), FadeIn(q_name, shift=0.1 * DOWN),
                      bot.animate.set_mood("normal"), run_time=1.5)
            self.remove(*tris.get_family())
            self.add(tris, focus, bot)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(Indicate(best, color=WHITE, scale_factor=1.25), FadeIn(amax, shift=0.1 * DOWN),
                      bot.animate.set_mood("happy"), run_time=1.0)
            self.play(LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.05),
                      bot.animate.scale(0.75).move_to(g.cells[S21].get_corner(DR) + 0.26 * UL), run_time=1.3)

        # --- SARSA ---
        s_eq = eq(SARSA_EQ, size=50).move_to(UP * 2.1)
        s_name = jt("SARSA", size=40, color=style.POLICY, weight="MEDIUM").move_to(s_eq.get_left() + UP * 0.85, aligned_edge=LEFT)
        nxt_box = SurroundingRectangle(VGroup(*s_eq[19:25]), color=style.ACTION, buff=0.08, corner_radius=0.06)
        letters_src = [2, 4, 16, 21, 23]
        letters = VGroup(*[jt(ch, size=60, color=col, weight="BOLD") for ch, col in
                           zip("SARSA", [style.STATE, style.ACTION, style.REWARD, style.STATE, style.ACTION])])
        letters.arrange(RIGHT, buff=0.5).move_to(DOWN * 0.3)
        with self.voice("[TD|ティーディー]学習を[Q|キュー]に当てはめると、{A}こうなります。{N}次の状態で、実際に選んだ次の行動の[Q|キュー]を使う。"
                        "{S}状態、行動、報酬、状態、行動の頭文字をとって、{B}[SARSA|サルサ]と呼ばれます。") as v:
            self.play(FadeOut(VGroup(g, tris, focus, arrows, q_name, amax, bot)),
                      q_big.animate.move_to(s_eq[0:6]).set(height=s_eq[0:6].height), run_time=0.9)
            self.wait_to(v, "A")
            self.play(ReplacementTransform(q_big, VGroup(*s_eq[0:6])), Write(VGroup(*s_eq[6:])), run_time=1.6)
            self.remove(*s_eq.get_family())
            self.add(s_eq)
            self.wait_to(v, "N")
            self.play(Create(nxt_box), Indicate(s_eq[23], color=style.ACTION, scale_factor=1.5), run_time=0.9)
            self.wait_to(v, "S")
            copies = [s_eq[i].copy() for i in letters_src]
            self.sfx("pop")
            self.play(*[c.animate.move_to(l).scale(1.6) for c, l in zip(copies, letters)], run_time=0.9)
            self.play(*[ReplacementTransform(c, l) for c, l in zip(copies, letters)], run_time=0.8)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(ReplacementTransform(letters, s_name), FadeOut(nxt_box), run_time=1.0)

        # --- Q 学習 ---
        q_eq = eq(QL_EQ, size=50).move_to(DOWN * 0.3)
        q_name_l = jt("Q学習", size=40, color=style.VALUE, weight="MEDIUM").move_to(q_eq.get_left() + UP * 0.85, aligned_edge=LEFT)
        with self.voice("もう一つの選択肢は、{A}次の状態で、一番大きな[Q|キュー]を使うことです。これが、{B}[Q|キュー]学習です。") as v:
            src = s_eq.copy()
            self.play(src.animate.move_to(DOWN * 0.3), run_time=0.9)
            self.wait_to(v, "A")
            self.sfx("whoosh")
            morph(self, src, q_eq, SARSA_TO_QL, run_time=1.3)
            mx_box = SurroundingRectangle(VGroup(*q_eq[19:26]), color=style.VALUE, buff=0.08, corner_radius=0.06)
            self.play(Create(mx_box), run_time=0.6)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(q_name_l, shift=0.1 * RIGHT), run_time=0.7)

        # --- 方策オン／オフ ---
        sa_box = SurroundingRectangle(VGroup(*s_eq[19:25]), color=style.POLICY, buff=0.08, corner_radius=0.06)
        gm = GridView(WORLD, cell=0.7, show_terminal_labels=False).move_to(RIGHT * 1.6 + DOWN * 2.35)
        traj = eps_greedy_rollout(PI_STAR, 0.3, seed=2468)
        act_states = [traj[0][0]] + [x[3] for x in traj]
        jr = np.random.default_rng(4)
        act_pts = [gm.center_of(x) + jr.uniform(-1, 1, 3) * 0.12 * gm.cell * np.array([1, 1, 0])
                   for x in act_states]
        act_line = VGroup(*[Line(p0, p1, stroke_color=style.POLICY, stroke_width=5)
                            for p0, p1 in zip(act_pts[:-1], act_pts[1:])])
        ideal = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3)]
        ideal_line = DashedVMobject(path_line(gm, ideal, color=style.VALUE, width=5), num_dashes=30)
        leg_a = VGroup(Line(ORIGIN, RIGHT * 0.7, stroke_color=style.POLICY, stroke_width=5),
                       jt("実際の足取り", size=30, color=GREY_A)).arrange(RIGHT, buff=0.2)
        leg_b = VGroup(DashedLine(ORIGIN, RIGHT * 0.7, color=style.VALUE, stroke_width=5),
                       jt("最善を仮定した足取り", size=30, color=GREY_A)).arrange(RIGHT, buff=0.2)
        legend = VGroup(leg_a, leg_b).arrange(DOWN, aligned_edge=LEFT, buff=0.35).move_to(LEFT * 4.2 + DOWN * 2.3)
        rb = Robot(height=0.38).move_to(gm.center_of((0, 0)))
        detours = VGroup(*[dice(4, size=0.3).move_to(gm.center_of(x[0]) + 0.25 * UR) for x in traj if x[4]])
        with self.voice("違いは、《たった》これだけ。でも、意味は大きく違います。{A}[SARSA|サルサ]は、自分が実際に取る行動の、価値を学びます。"
                        "{B}[Q|キュー]学習は、次からは最善の行動を取る、と仮定した価値、つまり、最適な行動価値を学びます。"
                        "{C}実際の行動が、ときどき寄り道していたとしても、です。") as v:
            self.play(Create(sa_box), Indicate(VGroup(*s_eq[19:25]), color=style.POLICY),
                      Indicate(VGroup(*q_eq[19:26]), color=style.VALUE), run_time=1.2)
            self.play(FadeIn(gm), FadeIn(rb), run_time=0.9)
            self.wait_to(v, "A")
            self.play(FadeIn(leg_a), run_time=0.4)
            per = max(0.22, (v.until("B") - 0.6) / len(traj))
            for k, (s, a, r, n, ex) in enumerate(traj):
                self.add(act_line[k], rb)
                self.play(rb.animate.move_to(gm.center_of(n)).look(n_vec(s, n)), Create(act_line[k]),
                          run_time=per)
            self.wait_to(v, "B")
            self.play(FadeIn(leg_b), Create(ideal_line), run_time=1.2)
            self.play(Indicate(VGroup(*q_eq[19:26]), color=style.VALUE), run_time=0.8)
            self.wait_to(v, "C")
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in detours], lag_ratio=0.3), run_time=0.8)
            self.play(Indicate(act_line, color=style.POLICY), run_time=1.0)

        on = jt("方策オン型", size=32, color=GREY_A).next_to(s_name, RIGHT, buff=0.5)
        off = jt("方策オフ型", size=32, color=GREY_A).next_to(q_name_l, RIGHT, buff=0.5)
        bell = mt("Q^*", "(", "s", ",", "a", ")", "=", r"\sum_{s'}", r"P(s'\mid s,a)", r"\big[", "r", "+", r"\gamma",
                  r"\max_{a'}", "Q^*", "(", "s'", ",", "a'", ")", r"\big]", size=50).move_to(DOWN * 2.3)
        bell[0].set_color(style.VALUE)
        bell[14].set_color(style.VALUE)
        bell_lab = jt("ベルマン最適方程式", size=30, color=GREY_B).next_to(bell, UP, buff=0.25).align_to(bell, LEFT)
        tgt_q = SurroundingRectangle(VGroup(*q_eq[16:26]), color=style.VALUE, buff=0.08, corner_radius=0.06)
        tgt_b = SurroundingRectangle(VGroup(*bell[10:20]), color=style.VALUE, buff=0.08, corner_radius=0.06)
        sum_b = Brace(VGroup(*bell[7:9]), DOWN, color=GREY_B)
        sum_l = jt("経験1回で置き換え", size=30, color=GREY_B).next_to(sum_b, DOWN, buff=0.12)
        with self.voice("前者を、{A0}方策オン型、後者を、{A1}方策オフ型と呼びます。{A}[Q|キュー]学習は、ベルマン最適方程式を、経験から、一回ずつ近似しているわけです。") as v:
            self.wait_to(v, "A0")
            self.play(FadeIn(on, shift=0.1 * LEFT), run_time=0.6)
            self.wait_to(v, "A1")
            self.play(FadeIn(off, shift=0.1 * LEFT), run_time=0.6)
            self.wait_to(v, "A")
            # Q 学習の目標が、そのままベルマン最適方程式の [ ] の中身になる
            self.play(FadeOut(VGroup(gm, rb, act_line, ideal_line, legend, leg_a, leg_b, detours, mx_box)),
                      FadeIn(bell_lab), TransformFromCopy(VGroup(*q_eq[16:26]), VGroup(*bell[10:20])),
                      FadeIn(VGroup(*bell[:10], bell[20]), shift=0.1 * UP), run_time=1.5)
            self.remove(*bell.get_family())
            self.add(bell)
            self.sfx("sparkle")
            self.play(Create(tgt_q), Create(tgt_b), run_time=0.8)
            self.play(GrowFromCenter(sum_b), FadeIn(sum_l), run_time=0.8)
        self.play(FadeOut(VGroup(s_eq, s_name, sa_box, q_eq, q_name_l, on, off, bell, bell_lab, tgt_q, tgt_b,
                                 sum_b, sum_l)), run_time=0.9)


# ---------------------------------------------------------------------------
# 7. 探索と活用（3台のスロットマシン）
# ---------------------------------------------------------------------------
class Exploration(VoiceScene):
    def construct(self):
        xs = [-4.2, 0.0, 4.2]
        MY, BASE, H = 1.5, -3.25, 2.3
        machines = VGroup(*[SlotMachine(width=2.4, height=2.45).move_to([x, MY, 0]) for x in xs])
        wins = [jt("?", size=72, color=GREY_B).move_to(m.window) for m in machines]
        base_line = Line([-5.6, BASE, 0], [5.6, BASE, 0], stroke_color=GREY_C, stroke_width=2)
        bars = VGroup(*[Rectangle(width=1.4, height=0.001, stroke_width=0, fill_color=style.VALUE,
                                  fill_opacity=0.9).move_to([x, BASE, 0], aligned_edge=DOWN) for x in xs])
        est = VGroup(*[DecimalNumber(0, num_decimal_places=2, font_size=46, color=style.VALUE) for _ in xs])
        for d, b in zip(est, bars):
            d.add_updater(lambda m, b=b: m.next_to(b, UP, buff=0.12))
        cnts = VGroup()
        for x in xs:
            n = Integer(0, font_size=50, color=WHITE)
            u = jt("回", size=36, color=GREY_B)
            u.add_updater(lambda m, n=n: m.next_to(n, RIGHT, buff=0.1))
            grp = VGroup(n, u)
            n.move_to([x - 0.2, -0.1, 0])
            u.next_to(n, RIGHT, buff=0.08)
            cnts.add(grp)
        est_lab = jt("推定値", size=32, color=GREY_B).move_to([-6.15, BASE + 0.5, 0])
        cnt_lab = jt("回数", size=32, color=GREY_B).move_to([-6.15, -0.1, 0])

        def show(state, rt):
            e, c = state
            anims = []
            for i in range(3):
                h = max(0.001, e[i] * H)
                anims.append(bars[i].animate.stretch_to_fit_height(h).move_to([xs[i], BASE, 0], aligned_edge=DOWN))
                anims.append(ChangeDecimalToValue(est[i], float(e[i])))
                anims.append(ChangeDecimalToValue(cnts[i][0], int(c[i])))
            self.play(*anims, run_time=rt)

        def result_icon(i, r):
            if r:
                return goal_icon(0.9).move_to(machines[i].window)
            return jt("×", size=72, color=GREY_C).move_to(machines[i].window)

        def pull_one(h, rt=0.5, show_dice=False):
            """1回回す。ロボットは台を見て、当たりなら喜び、はずれならしょんぼりする。"""
            a, r, ex, e, c = h
            icon = result_icon(a, r)
            anims = [machines[a].pull(run_time=rt * 0.6), FadeOut(wins[a], run_time=rt * 0.3),
                     robot.animate(run_time=rt * 0.3).look(machines[a].window.get_center() - robot.get_center())]
            extra = []
            if show_dice and ex:
                dc = dice(3, size=0.55).next_to(machines[a], UP, buff=0.2)
                extra.append(dc)
                anims.append(FadeIn(dc, scale=0.5, run_time=rt * 0.4))
                self.sfx("pop")
            self.play(*anims, run_time=rt * 0.6)
            if r:
                self.sfx("chime", gain=-16)
            self.play(FadeIn(icon, scale=0.6), robot.animate.set_mood("happy" if r else "sad"), run_time=rt * 0.3)
            show((e, c), rt * 0.4)
            self.play(FadeOut(icon), FadeIn(wins[a]), *[FadeOut(x) for x in extra],
                      robot.animate.set_mood("normal"), run_time=rt * 0.25)

        # --- N1 ---
        w1 = jt("探索", size=72, color=WHITE, weight="MEDIUM")
        w2 = jt("活用", size=72, color=WHITE, weight="MEDIUM")
        sw = mt(r"\rightleftarrows", size=72, color=GREY_B)
        words = VGroup(w1, sw, w2).arrange(RIGHT, buff=0.8)
        robot = Robot(height=1.1).move_to(UP * 1.8)
        with self.voice("ここで、第1章で予告した問題が、顔を出します。{A}探索と活用です。") as v:
            self.play(GrowFromCenter(robot), run_time=0.7)
            self.play(robot.animate.look(LEFT), run_time=0.4)
            self.play(robot.animate.look(RIGHT), run_time=0.5)
            self.wait_to(v, "A")
            words.next_to(robot, DOWN, buff=0.9)
            self.play(FadeIn(w1, shift=0.2 * RIGHT), FadeIn(w2, shift=0.2 * LEFT), FadeIn(sw), run_time=0.9)

        # --- N2 ---
        with self.voice("単純な例で考えましょう。{A}当たる確率の違う、スロットマシンが三台あります。確率は、ロボットには分かりません。") as v:
            # ロボットは、そのまま左端の「席」へ
            self.play(FadeOut(words), robot.animate.scale(0.82 / 1.1).move_to([-6.15, 1.55, 0]).look(RIGHT), run_time=0.9)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(m, shift=0.3 * UP) for m in machines], lag_ratio=0.2), run_time=1.2)
            self.play(LaggedStart(*[FadeIn(w, scale=0.6) for w in wins], lag_ratio=0.2),
                      robot.animate.set_mood("worried"), run_time=0.8)
            self.play(Create(base_line), FadeIn(est_lab), FadeIn(cnt_lab), FadeIn(cnts), FadeIn(bars), FadeIn(est),
                      run_time=0.8)

        # --- N3: 貪欲だけ ---
        greedy = bandit_run(seed=0, eps=0.0, T=100)
        assert greedy[0][0] == 1 and greedy[0][1] == 1
        tag = jt("いつも一番良い台を選ぶ", size=30, color=GREY_B).to_corner(UL, buff=0.4)
        truth = VGroup(*[mt(f"{p:.1f}", size=72, color=style.REWARD).move_to(m.window) for p, m in zip(BANDIT_P, machines)])
        tlines = VGroup(*[DashedLine([x - 0.95, BASE + p * H, 0], [x + 0.95, BASE + p * H, 0], color=style.REWARD,
                                     stroke_width=3, dash_length=0.1) for x, p in zip(xs, BANDIT_P)])
        with self.voice("いつも、今までで一番良かった台を選ぶ、とします。{A}最初に回した台で、たまたま当たりが出ると、"
                        "その台の見積もりが一番高くなり、{B}ほかの台は、二度と試されません。本当は、{C}右の台の方が、ずっと当たりやすいのに、です。") as v:
            self.play(FadeIn(tag, shift=0.1 * DOWN), run_time=0.6)
            self.wait_to(v, "A")
            pull_one(greedy[0], rt=1.4)
            self.wait_to(v, "B")
            batches = [greedy[i:i + 11] for i in range(1, 100, 11)]
            per = max(0.3, (v.until("C") - 0.3) / len(batches))
            self.play(robot.animate.set_mood("determined").look(machines[1].window.get_center() - robot.get_center()),
                      run_time=0.3)
            for b in batches:
                a, r, ex, e, c = b[-1]
                self.sfx("tick")
                self.play(machines[1].pull(run_time=per * 0.6), run_time=per * 0.6)
                show((e, c), per * 0.4)
            self.wait_to(v, "C")
            self.sfx("hit")
            self.play(*[ReplacementTransform(w, t) for w, t in zip(wins, truth)], Create(tlines),
                      robot.animate.set_mood("surprised").look(machines[2].window.get_center() - robot.get_center()),
                      run_time=1.0)
            self.play(Circumscribe(machines[2], color=style.REWARD, buff=0.15), run_time=1.2)

        # --- N4: ε-greedy ---
        wins = [jt("?", size=72, color=GREY_B).move_to(m.window) for m in machines]
        rule_w = 7.0
        seg_e = Rectangle(width=rule_w * 0.1, height=0.5, stroke_width=0, fill_color=style.ACTION, fill_opacity=0.9)
        seg_g = Rectangle(width=rule_w * 0.9, height=0.5, stroke_width=0, fill_color=style.VALUE, fill_opacity=0.7)
        rule = VGroup(seg_e, seg_g).arrange(RIGHT, buff=0.04).move_to(DOWN * 0.95)
        lab_e = VGroup(dice(5, size=0.5), mt(r"\varepsilon", size=60)).arrange(RIGHT, buff=0.15).next_to(seg_e, DOWN, buff=0.2)
        lab_g = VGroup(mt(r"1-\varepsilon", size=52), jt("一番良い台", size=36, color=GREY_A)).arrange(RIGHT, buff=0.3)
        lab_g.next_to(seg_g, DOWN, buff=0.22)
        name = jt("イプシロン・グリーディ法", size=34, color=WHITE, weight="MEDIUM").to_corner(UL, buff=0.4)
        with self.voice("そこで、{A}《ときどき、わざと》、でたらめに選ぶことにします。確率イプシロンでランダムに、それ以外は、一番良い台を選ぶ。"
                        "{B}[イプシロン・グリーディ法|イプシロングリーディほう]です。") as v:
            self.play(*[ReplacementTransform(t, w) for t, w in zip(truth, wins)], FadeOut(tag),
                      tlines.animate.set_stroke(opacity=0.5), robot.animate.set_mood("normal").look(RIGHT), run_time=0.8)
            show((np.zeros(3), np.zeros(3, dtype=int)), 0.8)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(FadeIn(rule), FadeIn(lab_e), FadeIn(lab_g), run_time=0.9)
            self.play(Indicate(lab_e, scale_factor=1.3), run_time=0.9)
            self.play(Indicate(lab_g, scale_factor=1.15), run_time=0.9)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(name, shift=0.1 * DOWN), run_time=0.7)

        # --- N5: ε-greedy で回す ---
        hist = bandit_run(seed=23, eps=0.1, T=300)
        with self.voice("こうすると、{A}最初は運が悪くても、いずれ、右の台の良さに気づくことができます。") as v:
            self.play(FadeOut(VGroup(rule, lab_e, lab_g)), run_time=0.5)
            for h in hist[:5]:
                pull_one(h, rt=0.55, show_dice=True)
            rest = hist[5:]
            batches = [rest[i:i + 15] for i in range(0, len(rest), 15)]
            per = max(0.25, (v.remaining() + 1.2) / len(batches))
            for k, b in enumerate(batches):
                arms = [x[0] for x in b]
                top = max(set(arms), key=arms.count)
                a, r, ex, e, c = b[-1]
                if k % 3 == 0:
                    self.sfx("tick")
                self.play(machines[top].pull(run_time=per * 0.6),
                          robot.animate(run_time=per * 0.3).look(machines[top].window.get_center() - robot.get_center()),
                          run_time=per * 0.6)
                show((e, c), per * 0.4)
            self.sfx("sparkle")
            self.play(robot.animate.set_mood("happy"), Indicate(bars[2], color=WHITE), run_time=0.6)
            self.play(robot.hop(), run_time=0.45)

        exploit = jt("活用", size=44, color=style.REWARD, weight="MEDIUM").next_to(machines[2], UP, buff=0.08)
        explore = VGroup(jt("探索", size=44, color=style.ACTION, weight="MEDIUM"), dice(2, size=0.46)).arrange(RIGHT, buff=0.2)
        explore.next_to(VGroup(machines[0], machines[1]), UP, buff=0.08)
        with self.voice("知っていることを使って稼ぐか、{B}知らないことを調べに行くか。{C}強化学習のエージェントは、いつも、このジレンマの中で行動しています。") as v:
            self.sfx("hit")
            self.play(FadeOut(name), FadeIn(exploit, shift=0.2 * DOWN), Indicate(machines[2], color=style.REWARD),
                      robot.animate.set_mood("normal").look(machines[2].window.get_center() - robot.get_center()),
                      run_time=1.0)
            self.wait_to(v, "B")
            self.sfx("pop")
            self.play(FadeIn(explore, shift=0.2 * DOWN),
                      robot.animate.set_mood("worried").look(machines[0].window.get_center() - robot.get_center()),
                      run_time=0.8)
            self.play(Wiggle(explore), run_time=1.0)
        for d in est:
            d.clear_updaters()
        self.play(FadeOut(VGroup(machines, *wins, base_line, bars, est, cnts, est_lab, cnt_lab, tlines, exploit,
                                 explore, robot)), run_time=0.9)


# ---------------------------------------------------------------------------
# 8. 崖歩き
# ---------------------------------------------------------------------------
class Cliff(VoiceScene):
    def construct(self):
        res = cliff_experiment()
        cv = CliffView(cell=1.0).move_to(DOWN * 0.4)
        l_s = jt("SARSA", size=60, color=style.POLICY, weight="MEDIUM")
        l_q = jt("Q学習", size=60, color=style.VALUE, weight="MEDIUM")
        vs = jt("vs", size=40, color=GREY_B)
        head = VGroup(l_s, vs, l_q).arrange(RIGHT, buff=0.8)
        with self.voice("探索が入ると、[SARSA|サルサ]と[Q|キュー]学習の違いが、はっきり表れます。有名な、{A}崖歩きの問題を見てみましょう。") as v:
            self.sfx("pop")
            self.play(FadeIn(l_s, shift=0.2 * RIGHT), FadeIn(l_q, shift=0.2 * LEFT), FadeIn(vs), run_time=1.0)
            self.wait_to(v, "A")
            self.play(head.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.7)
            self.sfx("whoosh")
            self.play(FadeIn(cv, shift=0.2 * UP), run_time=0.7)

        robot = Robot(height=0.55).move_to(cv.center_of(CliffEnv.start))
        st_lab = jt("スタート", size=28, color=GREY_B).next_to(cv.cells[CliffEnv.start], DOWN, buff=0.15)
        gl_lab = jt("ゴール", size=28, color=GREY_B).next_to(cv.cells[CliffEnv.goal], DOWN, buff=0.15)
        cliff_lab = jt("崖", size=44, color=WHITE, weight="MEDIUM").move_to(cv.center_of((5, 0)) + 0.5 * RIGHT)
        with self.voice("{S}左下から、{G}右下へ行きたいのですが、{A}その[間|あいだ]は崖です。"
                        "{B}一歩ごとにマイナス1、{C}崖に落ちるとマイナス100で、スタートに戻されます。") as v:
            self.wait_to(v, "S")
            self.sfx("pop")
            self.play(GrowFromCenter(robot), FadeIn(st_lab), run_time=0.6)
            self.wait_to(v, "G")
            self.play(Indicate(cv.goal, color=style.REWARD, scale_factor=1.4), FadeIn(gl_lab),
                      robot.animate.look(RIGHT), run_time=0.8)
            self.wait_to(v, "A")
            self.play(LaggedStart(*cv.paint_cliff(), lag_ratio=0.06), FadeIn(cliff_lab),
                      robot.animate.set_mood("worried").look(DR), run_time=1.0)
            self.wait_to(v, "B")
            m1 = mt("-1", size=44, color=style.REWARD).next_to(cv.cells[(0, 1)], UP, buff=0.1)
            self.play(robot.animate.move_to(cv.center_of((0, 1))).look(UP), run_time=0.5)
            self.play(FadeIn(m1, shift=0.2 * UP), run_time=0.3)
            self.play(robot.animate.move_to(cv.center_of((1, 1))).look(RIGHT), FadeOut(m1, shift=0.2 * UP), run_time=0.5)
            self.wait_to(v, "C")
            self.play(robot.change("surprised"), run_time=0.2)
            self.sfx("fall")
            self.play(robot.animate.move_to(cv.center_of((1, 0))).scale(0.1).set_opacity(0), rate_func=rush_into,
                      run_time=0.6)
            m100 = mt("-100", size=56, color=RED).move_to(cv.center_of((2, 1)) + 0.3 * RIGHT)
            self.sfx("thud")
            self.play(FadeIn(m100, shift=0.2 * UP), Flash(cv.center_of((1, 0)), color=RED, flash_radius=0.5), run_time=0.5)
            robot = Robot(height=0.55).move_to(cv.center_of(CliffEnv.start)).set_mood("sad")
            self.play(FadeIn(robot, scale=0.5), FadeOut(m100), run_time=0.6)

        # 2枚に分けて、学習後の経路
        cv2 = cv.copy()
        top_pos, bot_pos = RIGHT * 0.95 + UP * 1.85, RIGHT * 0.95 + DOWN * 1.95
        lq = jt("Q学習", size=40, color=style.VALUE, weight="MEDIUM").move_to(LEFT * 5.4 + UP * 1.85)
        ls = jt("SARSA", size=40, color=style.POLICY, weight="MEDIUM").move_to(LEFT * 5.4 + DOWN * 1.95)
        q_path, s_path = res["q"]["paths"][0], res["sarsa"]["paths"][0]
        with self.voice("どちらも、[イプシロン・グリーディ|イプシロングリーディ]で学習させてみました。{A}[Q|キュー]学習が見つけたのは、崖のふちを行く、最短ルート。"
                        "{B}[SARSA|サルサ]が見つけたのは、崖から離れた、遠回りのルートです。") as v:
            self.play(FadeOut(VGroup(st_lab, gl_lab, cliff_lab, robot, vs)), run_time=0.5)
            self.add(cv2)
            # 見出しの「Q学習」「SARSA」が、そのまま2枚のグリッドの名札になる
            self.sfx("whoosh")
            self.play(cv.animate.scale(0.8).move_to(top_pos), cv2.animate.scale(0.8).move_to(bot_pos),
                      ReplacementTransform(l_q, lq), ReplacementTransform(l_s, ls), run_time=1.2)
            ql = path_line(cv, q_path, color=style.VALUE, width=7)
            sl = path_line(cv2, s_path, color=style.POLICY, width=7)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(Create(ql), run_time=1.8)
            self.wait_to(v, "B")
            self.sfx("pop")
            self.play(Create(sl), run_time=2.0)

        rq = Robot(height=0.44).move_to(cv.center_of(CliffEnv.start)).set_mood("determined")
        rs = Robot(height=0.44).move_to(cv2.center_of(CliffEnv.start))
        with self.voice("どちらが正しいのでしょう。{A}[Q|キュー]学習は、この先は最善の行動しか取らない、という前提で考えるので、《崖っぷち》でも平気です。"
                        "{B}でも実際には、イプシロンの確率で、でたらめに動いてしまう。"
                        "{C}[SARSA|サルサ]は、自分がときどき、よろけることまで込みで、価値を学ぶので、崖から距離を取るんです。") as v:
            self.play(FadeIn(rq), FadeIn(rs), run_time=0.6)
            self.wait_to(v, "A")
            for s, n in zip(q_path[:5], q_path[1:6]):
                self.play(rq.animate.move_to(cv.center_of(n)).look(n_vec(s, n)), run_time=0.35)
            self.wait_to(v, "B")
            here = q_path[5]
            down = (here[0], 0)
            # 崖っぷちのロボットに寄る
            self.sfx("whoosh")
            self.play(self.focus_on(cv.cells[(here[0], 1)], height=3.4), run_time=0.9)
            dc = dice(6, size=0.4).next_to(rq, UP, buff=0.12)
            self.sfx("pop")
            self.play(FadeIn(dc, scale=0.5), rq.animate.set_mood("surprised").look(DOWN), run_time=0.5)
            self.sfx("fall")
            self.play(rq.animate.move_to(cv.center_of(down)).scale(0.1).set_opacity(0), FadeOut(dc),
                      rate_func=rush_into, run_time=0.6)
            m100 = mt("-100", size=48, color=RED).next_to(cv.cells[down], RIGHT, buff=0.08)
            self.sfx("thud")
            self.play(Flash(cv.center_of(down), color=RED, flash_radius=0.4), FadeIn(m100, shift=0.2 * UP), run_time=0.5)
            rq = Robot(height=0.44).move_to(cv.center_of(CliffEnv.start)).set_mood("sad")
            self.play(self.reset_frame(), FadeIn(rq, scale=0.5), FadeOut(m100), run_time=0.9)
            self.wait_to(v, "C")
            for s, n in zip(s_path[:6], s_path[1:7]):
                self.play(rs.animate.move_to(cv2.center_of(n)).look(n_vec(s, n)), run_time=0.3)
            here = s_path[6]
            dc = dice(2, size=0.4).next_to(rs, UP, buff=0.12)
            self.sfx("pop")
            self.play(FadeIn(dc, scale=0.5), run_time=0.3)
            below = (here[0], here[1] - 1)
            self.play(rs.animate.move_to(cv2.center_of(below)).set_mood("worried").look(DOWN), FadeOut(dc), run_time=0.4)
            self.play(Indicate(cv2.cells[below], color=style.POLICY), run_time=0.6)
            self.play(rs.animate.move_to(cv2.center_of(here)).set_mood("happy").look(UP), run_time=0.4)
            for s, n in zip(s_path[6:9], s_path[7:10]):
                self.play(rs.animate.move_to(cv2.center_of(n)).look(n_vec(s, n)), run_time=0.3)

        # 学習曲線
        E = len(res["q"]["smooth"])
        ax = Axes(x_range=[0, E, 100], y_range=[-100, 0, 25], x_length=7.9, y_length=5.0, tips=False,
                  axis_config={"stroke_color": GREY_C, "stroke_width": 2}).move_to(LEFT * 1.95 + DOWN * 0.3)
        xt = VGroup(*[mt(str(x), size=30, color=GREY_B).next_to(ax.c2p(x, -100), DOWN, buff=0.15)
                      for x in range(0, E + 1, 100)])
        yt = VGroup(*[mt(str(y), size=30, color=GREY_B).next_to(ax.c2p(0, y), LEFT, buff=0.15)
                      for y in (-100, -50, 0)])
        xl = jt("エピソード", size=30, color=GREY_B).next_to(xt, DOWN, buff=0.12)
        yl = jt("1エピソードの報酬の合計（学習中）", size=30, color=GREY_B).next_to(ax, UP, buff=0.25).align_to(ax, LEFT)

        def curve(m, color):
            ys = np.clip(res[m]["smooth"], -100, 0)
            c = VMobject(stroke_color=color, stroke_width=4)
            c.set_points_as_corners([ax.c2p(i, y) for i, y in enumerate(ys)])
            return c

        cs, cq = curve("sarsa", style.POLICY), curve("q", style.VALUE)
        falls_s, falls_q = res["sarsa"]["falls"], res["q"]["falls"]
        gq, gs = res["q"]["greedy_return"], res["sarsa"]["greedy_return"]

        def prow(color, name, value, dashed=False):
            sw = (DashedLine(ORIGIN, RIGHT * 0.55, color=color, stroke_width=5, dash_length=0.1) if dashed
                  else Line(ORIGIN, RIGHT * 0.55, stroke_color=color, stroke_width=5))
            nm = jt(name, size=30, color=color)
            return VGroup(sw, nm, value).arrange(RIGHT, buff=0.22)

        PX = 2.75
        h1 = jt("崖に落ちた回数", size=30, color=GREY_B)
        r1 = prow(style.POLICY, "SARSA", jt(f"{falls_s:.0f}回", size=30, color=WHITE))
        r2 = prow(style.VALUE, "Q学習", jt(f"{falls_q:.0f}回", size=30, color=WHITE))
        leg = VGroup(h1, r1, r2).arrange(DOWN, aligned_edge=LEFT, buff=0.2).move_to([PX, 2.1, 0], aligned_edge=LEFT)
        r2[2].align_to(r1[2], LEFT)
        h2 = jt("探索をやめると", size=30, color=GREY_B)
        r3 = prow(style.VALUE, "Q学習", mt(str(int(gq)), size=44, color=WHITE), dashed=True)
        r4 = prow(style.POLICY, "SARSA", mt(str(int(gs)), size=44, color=WHITE), dashed=True)
        after = VGroup(h2, r3, r4).arrange(DOWN, aligned_edge=LEFT, buff=0.2).move_to([PX, -0.6, 0], aligned_edge=LEFT)
        r3[2].align_to(r4[2], LEFT)
        dq = DashedLine(ax.c2p(0, gq), ax.c2p(E, gq), color=style.VALUE, stroke_width=3, dash_length=0.12)
        ds = DashedLine(ax.c2p(0, gs), ax.c2p(E, gs), color=style.POLICY, stroke_width=3, dash_length=0.12)
        with self.voice("学習中の成績を比べると、{A}[SARSA|サルサ]の方が、崖に落ちる回数が少なく、成績が良くなります。"
                        "{B}一方、探索をやめたあとの、最終的な方策の良さでは、[Q|キュー]学習が勝ちます。{C}何を学びたいのか、が違うわけです。") as v:
            self.play(FadeOut(VGroup(cv, cv2, ql, sl, rq, rs, lq, ls)), run_time=0.7)
            self.play(Create(ax), FadeIn(xt), FadeIn(yt), FadeIn(xl), FadeIn(yl), run_time=0.8)
            self.wait_to(v, "A")
            self.play(Create(cs), Create(cq), run_time=2.2)
            self.play(FadeIn(leg), run_time=0.7)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(Create(dq), Create(ds), FadeIn(after), run_time=1.2)
            self.play(Indicate(r3, color=style.VALUE, scale_factor=1.08), run_time=0.9)
            self.wait_to(v, "C")
            self.play(Indicate(r1, color=style.POLICY, scale_factor=1.08), Indicate(r3, color=style.VALUE, scale_factor=1.08),
                      run_time=1.0)
        self.play(FadeOut(VGroup(ax, xt, yt, xl, yl, cs, cq, leg, dq, ds, after)), run_time=0.9)


# ---------------------------------------------------------------------------
# 9. いつもの世界で Q 学習
# ---------------------------------------------------------------------------
QL_SEED = 84
QL_SNAPS = [10, 30, 100, 300, 1000, 3000, 10000, 30000]


class QLearningDemo(VoiceScene):
    def construct(self):
        Q, snaps, rec = q_learning_es(QL_SNAPS[-1], seed=QL_SEED, snapshots=set(QL_SNAPS) | {3},
                                      record={1, 2, 3})
        pi_q = greedy_from_q(Q)
        same = [s for s in NONTERM if pi_q[s] == PI_STAR[s]]
        g = GridView(WORLD, cell=1.35).move_to(LEFT * 2.4 + DOWN * 0.4)
        tris = QTriangles(g)
        formula = eq(QL_EQ, size=40).to_edge(UP, buff=0.3)
        cnt = Integer(0, font_size=48, color=WHITE)
        counter = VGroup(jt("エピソード", size=32, color=GREY_B), cnt).arrange(RIGHT, buff=0.25)
        counter.move_to(RIGHT * 4.2 + UP * 1.4)
        curQ = {k: 0.0 for k in tris.tris}

        with self.voice("いつもの世界に戻って、[Q|キュー]学習を走らせてみましょう。ロボットは、遷移確率を知りません。") as v:
            self.play(FadeIn(g), run_time=0.8)
            self.play(FadeIn(tris), Write(formula), FadeIn(counter), run_time=1.4)

        def run_episode(ep, per, trail_color=GREY_B, robot_h=0.5):
            traj = rec[ep]
            rb = Robot(height=robot_h).move_to(g.center_of(traj[0][0]))
            self.play(FadeIn(rb, scale=0.6), ChangeDecimalToValue(cnt, ep), run_time=0.3)
            trail = VGroup()
            for k, (s, a, r, n, qv) in enumerate(traj):
                anims = []
                if abs(qv - curQ[s, a]) > 1e-12:
                    curQ[s, a] = qv
                    anims.append(tris.tris[s, a].animate.set_fill(value_color(qv), 1))
                if n != s:
                    seg = Line(g.center_of(s), g.center_of(n), stroke_color=trail_color, stroke_width=3,
                               stroke_opacity=0.8)
                    trail.add(seg)
                    self.add(seg, rb)
                if WORLD.is_terminal(n):
                    anims.append(rb.animate.move_to(g.center_of(n)).scale(0.3).set_opacity(0))
                else:
                    anims += step_anims(rb, g, s, a, n, run_time=per)
                self.play(*anims, run_time=per)
            return rb, trail

        # --- N2: 最初のエピソード ---
        t1 = rec[1]
        with self.voice("{A}最初は、どの三角形も0です。星にたどり着いた、その一手にだけ、{B}価値が生まれます。") as v:
            self.wait_to(v, "A")
            self.play(tris.animate.set_stroke(WHITE, 2.5), rate_func=there_and_back, run_time=0.9)
            rb = Robot(height=0.5).move_to(g.center_of(t1[0][0]))
            self.play(FadeIn(rb, scale=0.6), ChangeDecimalToValue(cnt, 1), run_time=0.4)
            trail = VGroup()
            per = max(0.22, (v.until("B") - 0.3) / (len(t1) - 1))
            for s, a, r, n, qv in t1[:-1]:
                if n != s:
                    seg = Line(g.center_of(s), g.center_of(n), stroke_color=GREY_B, stroke_width=3)
                    trail.add(seg)
                    self.add(seg, rb)
                self.play(*step_anims(rb, g, s, a, n, run_time=per))
            s, a, r, n, qv = t1[-1]
            self.wait_to(v, "B")
            curQ[s, a] = qv
            self.sfx("chime")
            self.play(rb.animate.move_to(g.center_of(n)).set_mood("happy"), run_time=0.35)
            self.play(tris.tris[s, a].animate.set_fill(value_color(qv), 1),
                      Flash(tris.centroid(s, a), color=style.VALUE, flash_radius=0.4),
                      Flash(g.center_of(n), color=style.REWARD, flash_radius=0.5),
                      rb.animate.scale(0.3).set_opacity(0), run_time=0.7)
            self.play(Indicate(tris.tris[s, a], color=style.VALUE, scale_factor=1.3), FadeOut(trail), run_time=0.8)

        # --- N3: 価値が後ろ向きに伝わる ---
        with self.voice("エピソードを重ねるごとに、{A}価値が、星から後ろ向きに、少しずつ伝わっていきます。"
                        "{B}前回の価値反復とよく似ていますが、今回は、実際に通った道の上だけを、伝わっていきます。") as v:
            rb2, tr2 = run_episode(2, 0.3)
            self.play(FadeOut(tr2), run_time=0.3)
            self.wait_to(v, "A")
            rb3, tr3 = run_episode(3, max(0.06, (v.until("B") - 1.0) / len(rec[3])))
            self.play(FadeOut(tr3), run_time=0.3)
            self.wait_to(v, "B")
            per = max(0.5, (v.remaining() - 0.2) / len(QL_SNAPS))
            prev = dict(curQ)
            for k, ep in enumerate(QL_SNAPS):
                if k % 2 == 0:
                    self.sfx("tick")
                self.play(*tris.anims(snaps[ep], prev), ChangeDecimalToValue(cnt, ep), run_time=per)
                prev = snaps[ep]

        arrows = g.policy_arrows(pi_q, color=WHITE, length=0.5, stroke_width=5)
        with self.voice("{A}十分に学習したあと、各マスで一番大きな[Q|キュー]に矢印を引いてみると、"
                        "{B}前回、遷移確率を使って計算した最適方策と、《同じ矢印》が並びました。{C}穴の下の、あの下向きの矢印もです。") as v:
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.06), run_time=1.5)
            self.wait_to(v, "B")
            left = VGroup(g, tris, arrows)
            self.play(FadeOut(formula), FadeOut(counter), left.animate.scale(0.76).move_to(LEFT * 3.45 + DOWN * 0.35),
                      run_time=1.0)
            g2 = GridView(WORLD, cell=1.35 * 0.76).move_to(RIGHT * 3.45 + DOWN * 0.35)
            heat2 = VGroup(*[g2.cells[s].copy().set_fill(value_color(V_STAR[s]), 1).set_stroke(GREY_D, 2)
                             for s in g2.nonterminal_states()])
            arr2 = g2.policy_arrows(PI_STAR, color=style.POLICY, length=0.5, stroke_width=5)
            lab1 = jt("Q学習（経験だけ）", size=32, color=style.VALUE).next_to(left, UP, buff=0.35)
            lab2 = jt("価値反復（前回）", size=32, color=style.POLICY).next_to(g2, UP, buff=0.35)
            self.play(FadeIn(g2), FadeIn(heat2), FadeIn(lab1), FadeIn(lab2), run_time=0.8)
            self.play(LaggedStart(*[GrowArrow(a) for a in arr2], lag_ratio=0.04), run_time=1.0)
            checks = VGroup(*[check_mark(0.28).move_to(g.cells[s].get_corner(UR) + np.array([-0.2, -0.18, 0]))
                              for s in same])
            self.sfx("sparkle")
            self.play(LaggedStart(*[Create(c) for c in checks], lag_ratio=0.06), run_time=1.2)
            self.wait_to(v, "C")
            # 穴の真下のマスに寄る
            self.sfx("whoosh")
            self.play(self.focus_on(VGroup(g.cells[(4, 1)], g.cells[PIT]), height=3.2),
                      Circumscribe(g.cells[(4, 1)], color=style.REWARD, buff=0.02), run_time=1.1)
            self.play(Indicate(arrows[NONTERM_INDEX[(4, 1)]], color=style.REWARD, scale_factor=1.5), run_time=0.9)
            self.play(self.reset_frame(), Indicate(arr2[NONTERM_INDEX[(4, 1)]], color=style.REWARD, scale_factor=1.4),
                      run_time=1.0)

        _, run = find_seed(lambda t: t[-1][3] == GOAL and len(t) <= 9,
                           lambda sd: WORLD.rollout(pi_q, np.random.default_rng(sd)))
        with self.voice("ルールを一度も教わらずに、経験だけから、最適な振る舞いにたどり着いたわけです。") as v:
            rb = Robot(height=0.42).move_to(g.center_of(WORLD.start))
            self.play(FadeIn(rb, scale=0.6), run_time=0.4)
            for s, a, r, n in run[:-1]:
                self.play(*step_anims(rb, g, s, a, n, run_time=0.32))
            self.sfx("chime")
            reach_goal(self, rb, g, run_time=0.3, plus=False)
            self.play(rb.animate.set_mood("happy"), run_time=0.3)
        # 学習した Q のグリッドだけを残して、次のシーン（Outro）の冒頭と同じ位置へ
        tgt_scale = (OUTRO_CELL / 1.35) / 0.76
        self.play(FadeOut(VGroup(arrows, g2, heat2, arr2, lab1, lab2, checks, rb)),
                  VGroup(g, tris).animate.scale(tgt_scale).move_to(OUTRO_GRID_POS), run_time=1.1)


NONTERM_INDEX = {s: i for i, s in enumerate([s for s in WORLD.states if not WORLD.is_terminal(s)])}
OUTRO_CELL = 1.1
OUTRO_GRID_POS = LEFT * 3.7 + DOWN * 0.2


def outro_grid(Q):
    """QLearningDemo の最後と Outro の最初で同じになる、学習した Q の三角形グリッド。"""
    g = GridView(WORLD, cell=1.35)
    tris = QTriangles(g, Q)
    VGroup(g, tris).scale(OUTRO_CELL / 1.35).move_to(OUTRO_GRID_POS)
    return g, tris


# ---------------------------------------------------------------------------
# 10. 表の限界 → 次回
# ---------------------------------------------------------------------------
def tiny_network(layers=(5, 7, 3), width=2.4, height=2.6, color=GREY_B):
    cols = VGroup()
    for k, n in enumerate(layers):
        col = VGroup(*[Circle(0.11, stroke_color=color, stroke_width=2, fill_color=BLACK, fill_opacity=1)
                       for _ in range(n)])
        col.arrange(DOWN, buff=(height - n * 0.22) / max(n - 1, 1))
        col.move_to(RIGHT * (k - (len(layers) - 1) / 2) * width / (len(layers) - 1))
        cols.add(col)
    edges = VGroup()
    for a, b in zip(cols[:-1], cols[1:]):
        for c1 in a:
            for c2 in b:
                edges.add(Line(c1.get_center(), c2.get_center(), stroke_width=0.8, stroke_color=GREY_D))
    return VGroup(edges, cols)


def pixel_frame(height=3.6, **kw):
    im = ImageMobject(breakout_pixels(**kw))
    im.set_resampling_algorithm(RESAMPLING_ALGORITHMS["nearest"])
    im.height = height
    frame = SurroundingRectangle(im, buff=0.03, color=GREY_C, stroke_width=2)
    return Group(im, frame)


class Outro(VoiceScene):
    def construct(self):
        Q, _, _ = q_learning_es(QL_SNAPS[-1], seed=QL_SEED)
        g, tris = outro_grid(Q)
        self.add(g, tris)  # 前のシーンの最後と同じ位置・同じ色
        states = [s for s in WORLD.states if not WORLD.is_terminal(s)]
        xs = [1.35, 2.75, 3.95, 5.15, 6.35]
        head = VGroup(jt("状態", size=30, color=style.STATE), *[arrow_glyph(a, length=0.4) for a in ACTIONS])
        for h, x in zip(head, xs):
            h.move_to([x, 3.2, 0])
        rows = VGroup()
        for i, s in enumerate(states):
            y = 2.62 - 0.4 * i
            r = VGroup(mt(f"({s[0]},{s[1]})", size=34, color=style.STATE),
                       *[DecimalNumber(Q[s, a], num_decimal_places=2, font_size=32, color=WHITE) for a in ACTIONS])
            for m, x in zip(r, xs):
                m.move_to([x, y, 0])
            rows.add(r)
        rule = Line([0.7, 2.9, 0], [6.8, 2.9, 0], stroke_color=GREY_D, stroke_width=2)
        with self.voice("ただ、この方法は、{A}状態ごと、行動ごとに、数字を一つずつ、表に持っています。") as v:
            self.play(Indicate(tris, color=WHITE, scale_factor=1.02), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(head), Create(rule), run_time=0.5)
            # 三角形の一つ一つが、表の数字になる
            self.sfx("whoosh")
            self.play(LaggedStart(*[AnimationGroup(FadeIn(r[0]), *[TransformFromCopy(tris.tris[s, a], r[k + 1])
                                                                   for k, a in enumerate(ACTIONS)])
                                    for s, r in zip(states, rows)], lag_ratio=0.1), run_time=2.4)

        frame = pixel_frame(height=4.2).move_to(LEFT * 3.4 + UP * 0.2)
        cap = jt("84×84 画素・256 階調", size=30, color=GREY_B).next_to(frame, DOWN, buff=0.3)
        n_states = int(np.floor(84 * 84 * np.log10(256)))
        c1 = VGroup(jt("状態の数", size=34, color=style.STATE), mt(r"256^{84\times 84}", r"\approx", f"10^{{{n_states}}}", size=56))
        c1.arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        c2 = VGroup(jt("宇宙の原子の数", size=34, color=GREY_B), mt(r"\approx", "10^{80}", size=56))
        c2.arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        cmp = VGroup(c1, mt(r"\gg", size=64, color=WHITE), c2).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        cmp.move_to(RIGHT * 3.3 + UP * 0.2)
        big = VGroup()
        brng = np.random.default_rng(2)
        for i in range(44):
            row = VGroup(*[Square(0.52, stroke_color=GREY_D, stroke_width=1.5,
                                  fill_color=(value_color(brng.uniform(-0.6, 0.9)) if brng.random() < 0.06 else "#141418"),
                                  fill_opacity=1) for _ in range(4)]).arrange(RIGHT, buff=0.05)
            big.add(row)
        big.arrange(DOWN, buff=0.05).move_to(RIGHT * 3.0, aligned_edge=UP).shift(UP * 3.7)
        robot = Robot(height=0.8).move_to([5.75, -2.75, 0])
        drop = robot.sweat()
        with self.voice("テレビゲームの画面を、そのまま状態にすると、{A}状態の数は、宇宙の原子の数よりも、はるかに多くなります。"
                        "{B}表では、とても持ちきれませんし、{C}一度も訪れない状態の方が、ほとんどです。") as v:
            self.play(FadeOut(VGroup(g, tris, head, rule, rows)), run_time=0.7)
            self.sfx("pop")
            self.play(FadeIn(frame), FadeIn(cap, shift=0.1 * UP), FadeIn(robot), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(c1, shift=0.1 * DOWN), robot.animate.set_mood("surprised").look(UL), run_time=0.9)
            self.play(FadeIn(cmp[1]), FadeIn(c2, shift=0.1 * DOWN), FadeIn(drop, shift=0.1 * DOWN), run_time=0.9)
            self.wait_to(v, "B")
            self.play(FadeOut(cmp), FadeOut(drop), robot.animate.set_mood("worried"), run_time=0.5)
            self.add(big)
            self.sfx("whoosh")
            self.play(big.animate.shift(UP * (big.height - 7.2)), run_time=max(1.5, v.until("C") - 0.2),
                      rate_func=rate_functions.ease_in_quad)
            self.wait_to(v, "C")
            grey = VGroup(*[sq for row in big for sq in row if sq.get_fill_color().to_hex().upper() == "#141418"])
            qs = VGroup(*[jt("?", size=30, color=GREY_C).move_to(sq) for sq in grey
                          if -3.6 < sq.get_center()[1] < 3.6])
            self.sfx("pop")
            self.play(FadeIn(qs, lag_ratio=0.01), run_time=1.2)

        f1 = pixel_frame(height=2.5, ball=(46, 52)).move_to(LEFT * 4.9 + UP * 1.45)
        f2 = pixel_frame(height=2.5, ball=(44, 55)).move_to(LEFT * 4.9 + DOWN * 1.75)
        l1 = jt("見たことのある状態", size=30, color=GREY_B).next_to(f1, UP, buff=0.12)
        l2 = jt("初めての状態", size=30, color=GREY_B).next_to(f2, DOWN, buff=0.12)
        sim_arrow = DoubleArrow(f1.get_right() + 0.3 * RIGHT + 0.6 * DOWN, f2.get_right() + 0.3 * RIGHT + 0.6 * UP,
                                buff=0, color=GREY_A, stroke_width=4, tip_length=0.2)
        sim = jt("似ている", size=32, color=GREY_A).next_to(sim_arrow, RIGHT, buff=0.15)
        net = tiny_network().move_to(RIGHT * 0.6 + DOWN * 1.75)
        a_in = Arrow(f2.get_right(), net.get_left(), buff=0.25, color=GREY_C, stroke_width=4)
        outs = VGroup()
        for a in (A_LEFT, None, A_RIGHT):
            q = mt("Q", "(", "s", ",", size=42)
            glyph = arrow_glyph(a, length=0.34) if a is not None else Dot(radius=0.07, color=style.ACTION)
            close = mt(")", size=42)
            outs.add(VGroup(q, glyph, close).arrange(RIGHT, buff=0.08))
        outs.arrange(DOWN, buff=0.35).next_to(net, RIGHT, buff=0.6)
        a_out = VGroup(*[Line(net[1][-1][i].get_right(), o.get_left() + 0.1 * LEFT, stroke_color=GREY_C, stroke_width=2)
                         for i, o in enumerate(outs)])
        with self.voice("見たことのない状態でも、似た状態の経験から、価値を推測したい。{A}そう、《ニューラルネット》の出番です。") as v:
            self.play(FadeOut(VGroup(big, qs)), FadeOut(cap), frame.animate.scale(2.5 / 4.2).move_to(f1),
                      robot.animate.set_mood("normal"), run_time=0.9)
            self.remove(frame)
            self.add(f1)
            self.play(FadeIn(l1), FadeIn(f2, shift=0.2 * DOWN), FadeIn(l2), run_time=1.0)
            self.play(GrowFromCenter(sim_arrow), FadeIn(sim), run_time=0.7)
            self.wait_to(v, "A")
            self.sfx("sparkle")
            self.play(GrowArrow(a_in), FadeIn(net), robot.animate.set_mood("happy").look(LEFT), run_time=0.7)
            self.play(Create(a_out), LaggedStart(*[FadeIn(o, shift=0.1 * RIGHT) for o in outs], lag_ratio=0.15),
                      run_time=0.8)
        self.play(Indicate(outs, color=style.VALUE, scale_factor=1.1), robot.hop(), run_time=1.0)
        self.wait(0.8)
        self.play(FadeOut(Group(f1, f2, l1, l2, sim, sim_arrow, net, a_in, a_out, outs, robot)), run_time=0.9)
        play_end_card(self, next_title="第4章　価値をニューラルネットで近似する")
