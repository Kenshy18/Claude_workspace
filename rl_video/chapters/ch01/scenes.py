"""第1章「報酬から学ぶ」— 強化学習の問題設定。

レンダリング:  python tools/build.py ch01 [-q h]
"""
from __future__ import annotations

import numpy as np
from manim import *

from common import style
from common.mobjects import ACTION_VEC, GridView, ProbBars, Robot, glow_dot, value_color
from common.rl import (ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP,
                       main_world, q_learning)
from common.style import jt, mt
from common.titles import play_end_card, play_title_card
from common.voice_scene import VoiceScene, VoiceScene3D

CHAPTER_TITLE = "第1章 報酬から学ぶ"

SCENES = [
    "Hook", "Title", "Supervised", "Differences", "Beyond", "Loop", "MDP", "Markov", "Policy",
    "Return", "Discount", "Survival", "Recursion", "Objective", "RewardHacking", "Roadmap",
    "Outro3D", "End",
]

WORLD = main_world()
V_STAR = WORLD.value_iteration()[-1]
PI_STAR = WORLD.greedy(V_STAR)
GOAL, PIT = (4, 3), (4, 2)


# ---------------------------------------------------------------------------
# 共通の小道具
# ---------------------------------------------------------------------------
def n_vec(s, n):
    return np.array([n[0] - s[0], n[1] - s[1], 0.0])


def step_anims(robot: Robot, g: GridView, s, a, n, run_time=0.4):
    """1ステップ分のロボットの動き。ぶつかったら小さく揺れる。"""
    d = ACTION_VEC[a]
    if n == s:
        return [robot.animate(rate_func=there_and_back, run_time=run_time).shift(0.12 * g.cell * d)]
    return [robot.animate(run_time=run_time).move_to(g.center_of(n)).look(n_vec(s, n))]


def fall_into_pit(scene, robot: Robot, g: GridView, pit=PIT, run_time=0.8):
    c = g.center_of(pit)
    scene.play(robot.animate.move_to(c).scale(0.05).set_opacity(0), run_time=run_time,
               rate_func=rush_into)
    minus = mt("-1", size=48, color=RED).next_to(g.cells[pit], RIGHT, buff=0.15)
    scene.play(FadeIn(minus, shift=0.3 * UP), run_time=0.4)
    scene.play(FadeOut(minus, shift=0.3 * UP), run_time=0.6)


def reach_goal(scene, robot: Robot, g: GridView, goal=GOAL, run_time=0.5):
    c = g.center_of(goal)
    plus = mt("+1", size=48, color=style.REWARD).next_to(g.cells[goal], RIGHT, buff=0.15)
    scene.play(robot.animate.move_to(c), run_time=run_time)
    scene.play(Flash(c, color=style.REWARD, line_length=0.35, num_lines=12, flash_radius=0.6),
               FadeIn(plus, shift=0.3 * UP),
               robot.animate(rate_func=there_and_back).shift(0.25 * UP), run_time=0.6)
    scene.play(FadeOut(plus, shift=0.3 * UP), run_time=0.5)


def path_line(g: GridView, states, color=BLUE_B, jitter=0.0, seed=0, width=4, opacity=1.0):
    """マスの中心を結ぶ折れ線。jitter>0 なら手描き風に揺らす（同じマスの往復が重ならない）。"""
    rng = np.random.default_rng(seed)
    pts = [g.center_of(s) + rng.uniform(-1, 1, 3) * jitter * g.cell * np.array([1, 1, 0])
           for s in states]
    line = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    line.set_points_as_corners(pts)
    line.joint_type = LineJointType.ROUND
    return line


def find_seed(pred, fn, limit=5000):
    for seed in range(limit):
        out = fn(seed)
        if pred(out):
            return seed, out
    raise RuntimeError("seed not found")


def uniform_rollout(seed, start=(0, 0), max_steps=40):
    return WORLD.rollout(WORLD.uniform_policy(), np.random.default_rng(seed), start=start,
                         max_steps=max_steps)


def arrow_glyph(a, color=style.ACTION, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def token_chip(t, size=40, color=WHITE, stroke=GREY_C):
    txt = jt(t, size=size, color=color)
    box = RoundedRectangle(width=txt.width + 0.4, height=0.85 * size / 40, corner_radius=0.12,
                           stroke_color=stroke, stroke_width=1.5, fill_color="#16161A", fill_opacity=1)
    return VGroup(box, txt.move_to(box))


def section_tag(text):
    return jt(text, size=30, color=GREY_B).to_corner(UL, buff=0.45)


# ---------------------------------------------------------------------------
# 1. つかみ
# ---------------------------------------------------------------------------
class Hook(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.4).shift(0.15 * DOWN)
        robot = Robot(height=0.7).move_to(g.center_of(WORLD.start))
        # 暗闇の中のロボットに寄ったところから始めて、世界を見せる
        self.frame.set(height=2.6).move_to(robot)

        with self.voice("ここに、小さなロボットがいます。") as v:
            self.sfx("pop", offset=0.2)
            self.play(GrowFromCenter(robot), run_time=0.7)
            self.play(robot.blink())
            self.play(robot.animate.look(LEFT), run_time=0.4)
            self.play(robot.animate.look(RIGHT), run_time=0.4)

        with self.voice("このロボットは、右上の{A}星にたどり着くと、ごほうびがもらえます。"
                        "逆に、[その下|そのした]の{B}赤い穴に落ちると、罰を受けます。") as v:
            self.sfx("whoosh")
            self.add(g.board)
            self.bring_to_front(robot)
            self.play(self.reset_frame(run_time=1.8), FadeIn(g.board, lag_ratio=0.02, run_time=1.8),
                      robot.animate(run_time=1.8).look(UP))
            self.wait_to(v, "A")
            self.sfx("sparkle")
            self.play(FadeIn(g.icons[GOAL], scale=0.5), robot.animate.look(UR), run_time=0.8)
            self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.55, num_lines=14))
            self.wait_to(v, "B")
            self.sfx("thud")
            self.play(FadeIn(g.icons[PIT], scale=0.6), robot.animate.look(RIGHT + 0.6 * UP), run_time=0.8)
            self.play(robot.change("worried"), Indicate(g.icons[PIT], color=RED, scale_factor=1.15))

        bubble = robot.think("？", direction=UR)
        with self.voice("ところが、ロボットは最初、このルールを、《何も》知りません。"
                        "どちらに進めばいいのかも、そもそも何が「良いこと」なのかも、分からないんです。") as v:
            self.play(robot.change("normal"), run_time=0.4)
            self.play(robot.animate.look(LEFT), run_time=0.5)
            self.play(robot.animate.look(RIGHT), run_time=0.6)
            self.sfx("pop")
            self.play(FadeIn(bubble, shift=0.15 * UP, scale=0.8), robot.animate.look(UR), run_time=0.6)
            self.play(robot.blink())

        # でたらめに動いて穴に落ちる（一様ランダム方策の実際のロールアウト）
        _, traj = find_seed(lambda t: t[-1][3] == PIT and 9 <= len(t) <= 13, uniform_rollout)
        with self.voice("だから、はじめは、でたらめに動いてみるしかありません。") as v:
            self.play(FadeOut(bubble), run_time=0.5)
        dots = VGroup()
        for s, a, r, n in traj[:-1]:
            dot = Dot(g.center_of(s), radius=0.06, color=GREY_B).set_opacity(0.6)
            dots.add(dot)
            self.add(dot, robot)
            self.play(*step_anims(robot, g, s, a, n, run_time=0.36))
        with self.voice("あ、落ちてしまいました。", pad=0.3):
            self.play(robot.change("surprised"), robot.animate.look(UR), run_time=0.25)
            self.sfx("fall")
            fall_into_pit(self, robot, g)

        # 学習の早回し：Q学習の実際のエピソード
        _, _, _, rec = q_learning(WORLD, episodes=400, seed=3, record={1, 2, 5, 20, 60, 150})
        label = jt("エピソード", size=34, color=GREY_B)
        num = Integer(1, font_size=48, color=WHITE)
        counter = VGroup(label, num).arrange(RIGHT, buff=0.3).to_corner(UL, buff=0.6)
        with self.voice("でも、何度も何度も試していくうちに、動き方が、少しずつ変わっていきます。") as v:
            self.play(FadeOut(dots), FadeIn(counter), run_time=0.6)
            per = (v.remaining() - 0.2) / 6
            prev = None
            for ep in [1, 2, 5, 20, 60, 150]:
                t = rec[ep]
                states = [t[0][0]] + [x[3] for x in t]
                ok = t[-1][2] > 0
                line = path_line(g, states, color=style.REWARD if ok else RED, jitter=0.1,
                                 seed=ep, width=3.5, opacity=0.85)
                anims = [Create(line), num.animate.set_value(ep)]
                if prev is not None:
                    anims.append(FadeOut(prev))
                self.sfx("tick")
                self.play(*anims, run_time=per * 0.8)
                self.wait(per * 0.2)
                prev = line
        self.play(FadeOut(prev), FadeOut(counter), run_time=0.5)

        # 学習後：最適方策でまっすぐ星へ
        robot = Robot(height=0.7).move_to(g.center_of(WORLD.start)).set_mood("determined")
        _, clean = find_seed(lambda t: len(t) == 7 and t[-1][3] == GOAL,
                             lambda sd: WORLD.rollout(PI_STAR, np.random.default_rng(sd)))
        trail = VGroup()
        with self.voice("そして、やがてロボットは、穴をうまく避けながら、星へまっすぐ向かうようになります。") as v:
            self.sfx("pop")
            self.play(FadeIn(robot, scale=0.8), run_time=0.5)
            for s, a, r, n in clean[:-1]:
                seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.REWARD, stroke_width=5)
                trail.add(seg)
                self.add(seg, robot)
                self.play(*step_anims(robot, g, s, a, n, run_time=0.42), Create(seg, run_time=0.42))
            s, a, r, n = clean[-1]
            seg = Line(g.center_of(s), g.center_of(n), stroke_color=style.REWARD, stroke_width=5)
            trail.add(seg)
            self.add(seg, robot)
            self.play(Create(seg), run_time=0.3)
            self.sfx("chime")
            reach_goal(self, robot, g)
            self.play(robot.change("happy"), run_time=0.3)
            self.play(robot.hop())
        with self.voice("誰も、正しい動き方を、《一度も》教えていないのに、です。") as v:
            self.play(trail.animate.set_stroke(width=8), rate_func=there_and_back, run_time=1.2)

        world = VGroup(g, robot, trail)
        title = jt("強化学習", size=80, color=WHITE, weight="MEDIUM").shift(0.6 * UP)
        with self.voice("試行錯誤から学ぶ。この仕組みを、数学の言葉で扱えるようにしたのが、{A}強化学習です。") as v:
            self.play(world.animate.set_opacity(0.25), run_time=1.0)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeOut(world, scale=0.9), Write(title), run_time=1.4)

        keys = ["MDP", "価値", "ベルマン方程式", "TD学習", "Q学習", "DQN", "方策勾配", "PPO", "RLHF"]
        chips = VGroup(*[jt(k, size=30, color=GREY_B) for k in keys]).arrange(RIGHT, buff=0.42)
        chips.set_width(min(chips.width, 12.8)).next_to(title, DOWN, buff=1.0)
        with self.voice("このシリーズでは、強化学習を、ゼロから一歩ずつ組み立てていきます。"
                        "最終的な目標は、{A}大規模言語モデルの学習に使われている手法を、その中身から理解することです。") as v:
            self.play(LaggedStart(*[FadeIn(c, shift=0.15 * UP) for c in chips], lag_ratio=0.15),
                      run_time=v.until("A"))
            self.sfx("sparkle")
            self.play(chips[-2:].animate.set_color(style.REWARD), run_time=0.8)
        self.play(FadeOut(VGroup(title, chips)), run_time=1.0)


# ---------------------------------------------------------------------------
# 2. タイトル
# ---------------------------------------------------------------------------
class Title(VoiceScene):
    def construct(self):
        play_title_card(self, 1, "報酬から学ぶ")


# ---------------------------------------------------------------------------
# 3. 教師あり学習
# ---------------------------------------------------------------------------
SEVEN = [
    "..######",
    "......##",
    ".....##.",
    "....##..",
    "...##...",
    "...#....",
    "..##....",
    "..#.....",
]


def digit_image(size=2.0, pattern=SEVEN):
    n = len(pattern)
    px = size / n
    grp = VGroup()
    for i, row in enumerate(pattern):
        for j, ch in enumerate(row):
            sq = Square(px, stroke_width=0.5, stroke_color=GREY_E,
                        fill_color=WHITE if ch == "#" else "#111114", fill_opacity=1)
            sq.move_to(np.array([(j - n / 2 + 0.5) * px, (n / 2 - i - 0.5) * px, 0]))
            grp.add(sq)
    frame = SurroundingRectangle(grp, buff=0.02, color=GREY_C, stroke_width=1.5)
    return VGroup(grp, frame)


def tiny_network(layers=(5, 7, 5), width=2.6, height=2.8, color=GREY_B):
    cols = VGroup()
    for k, n in enumerate(layers):
        col = VGroup(*[Circle(0.11, stroke_color=color, stroke_width=2, fill_color=BLACK,
                              fill_opacity=1) for _ in range(n)])
        col.arrange(DOWN, buff=(height - n * 0.22) / max(n - 1, 1))
        col.move_to(RIGHT * (k - (len(layers) - 1) / 2) * width / (len(layers) - 1))
        cols.add(col)
    edges = VGroup()
    for a, b in zip(cols[:-1], cols[1:]):
        for c1 in a:
            for c2 in b:
                edges.add(Line(c1.get_center(), c2.get_center(), stroke_width=0.8,
                               stroke_color=GREY_D))
    return VGroup(edges, cols)


class Supervised(VoiceScene):
    def construct(self):
        head = jt("教師あり学習", size=56, color=WHITE, weight="MEDIUM")
        tag = section_tag("教師あり学習")
        with self.voice("まずは、よく知っている世界から出発しましょう。{A}教師あり学習です。") as v:
            self.play(Write(head), run_time=1.2)
            self.wait_to(v, "A")
            self.play(Indicate(head, color=WHITE, scale_factor=1.05))
        self.play(ReplacementTransform(head, tag), run_time=0.8)

        img = digit_image(2.7).move_to(LEFT * 5.0 + 0.3 * DOWN)
        net = tiny_network().move_to(LEFT * 1.4 + 0.3 * DOWN)
        probs0 = [0.06, 0.05, 0.12, 0.2, 0.07, 0.08, 0.05, 0.19, 0.1, 0.08]
        bars = ProbBars(probs0, labels=[str(i) for i in range(10)], width=5.0, height=3.6,
                        colors=[GREY_B] * 10, label_size=30).move_to(RIGHT * 4.2 + 0.9 * DOWN)
        a1 = Arrow(img.get_right(), net.get_left(), buff=0.25, color=GREY_C, stroke_width=4)
        a2 = Arrow(net.get_right(), bars.get_left() + 0.8 * UP, buff=0.25, color=GREY_C, stroke_width=4)
        cap_in = jt("入力", size=30, color=GREY_C).next_to(img, DOWN, buff=0.35)
        cap_out = jt("モデルの出力", size=30, color=GREY_C).next_to(bars, DOWN, buff=0.2)

        with self.voice("たとえば手書き数字の認識なら、画像の一枚一枚に、{A}「これは7」という、正解ラベルが付いています。") as v:
            self.play(FadeIn(img), FadeIn(cap_in), run_time=1.0)
            self.play(GrowArrow(a1), FadeIn(net), run_time=1.0)
            self.play(GrowArrow(a2), FadeIn(bars), FadeIn(cap_out), run_time=1.0)
            self.wait_to(v, "A")
            label = jt("正解：7", size=40, color=style.REWARD).next_to(bars, UP, buff=1.3)
            box = SurroundingRectangle(bars.labels[7], color=style.REWARD, buff=0.08)
            self.play(FadeIn(label, shift=0.2 * DOWN), Create(box))

        loss = MathTex(r"\mathcal{L}", font_size=64, color=RED).next_to(label, RIGHT, buff=0.8)
        with self.voice("モデルの出力と正解を{A}比べれば、どれだけ間違っているかが、損失として分かります。"
                        "そして{B}その勾配が、パラメータをどちらに動かせばいいかを、教えてくれます。") as v:
            self.wait_to(v, "A")
            self.play(bars.bars[7].animate.set_color(style.REWARD), FadeIn(loss, shift=0.2 * LEFT))
            self.wait_to(v, "B")
            back = CurvedArrow(loss.get_top() + 0.1 * UP, net.get_top() + 0.25 * UP, angle=0.7,
                               color=RED, stroke_width=5)
            grad = MathTex(r"\nabla_\theta \mathcal{L}", font_size=48, color=RED).next_to(back, UP, buff=0.1)
            self.play(Create(back), FadeIn(grad), run_time=1.0)
            target = [0.02, 0.02, 0.04, 0.05, 0.03, 0.03, 0.02, 0.72, 0.04, 0.03]
            self.play(bars.animate.set_probs(target), run_time=1.6)

        sup = VGroup(img, net, bars, a1, a2, cap_in, cap_out, label, box, loss, back, grad)
        self.play(FadeOut(sup, shift=0.3 * UP), run_time=0.8)

        # 言語モデルの事前学習
        toks = ["吾輩", "は", "猫", "で"]
        chips = VGroup(*[token_chip(t, size=44) for t in toks]).arrange(RIGHT, buff=0.14)
        chips.move_to(LEFT * 3.6 + UP * 0.9)
        nxt = ProbBars([0.46, 0.2, 0.18, 0.16], labels=["ある", "す", "も", "は"], width=5.0, height=3.0,
                       colors=[GREY_B] * 4, label_size=36).move_to(RIGHT * 3.5 + 0.1 * DOWN)
        arr = Arrow(chips.get_right(), nxt.get_left() + 1.0 * UP, buff=0.3, color=GREY_C, stroke_width=4)
        data = jt("データ：「吾輩は猫である。名前はまだ無い。」", size=34, color=GREY_B).move_to(DOWN * 2.9)
        with self.voice("言語モデルの事前学習も、同じ構図です。{A}次に来るべきトークンが、正解として、データの中に書いてあります。") as v:
            self.play(LaggedStart(*[FadeIn(c, shift=0.2 * RIGHT) for c in chips], lag_ratio=0.2), run_time=1.2)
            self.play(GrowArrow(arr), FadeIn(nxt), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(data, shift=0.2 * UP))
            hl = SurroundingRectangle(nxt.labels[0], color=style.REWARD, buff=0.1)
            self.play(Create(hl), nxt.bars[0].animate.set_color(style.REWARD))

        with self.voice("つまり教師あり学習では、どの入力に対しても、「本当はこう出力すべきだった」という答えが、いつも手元にあるわけです。") as v:
            self.play(Indicate(hl, color=style.REWARD), run_time=1.2)
        self.play(FadeOut(VGroup(chips, nxt, arr, data, hl, tag)), run_time=0.8)


# ---------------------------------------------------------------------------
# 4. 三つの違い
# ---------------------------------------------------------------------------
def make_card(content, label, sub=None, width=2.0, height=1.45):
    """図をそのまま縮めて入れる、まとめ用のカード。"""
    box = RoundedRectangle(width=width, height=height, corner_radius=0.14, stroke_color=GREY_C,
                           stroke_width=2, fill_color="#141418", fill_opacity=1)
    c = content.copy()
    c.scale_to_fit_height(height - 0.3)
    if c.width > width - 0.3:
        c.scale_to_fit_width(width - 0.3)
    c.move_to(box)
    texts = VGroup(jt(label, size=28, color=WHITE))
    if sub:
        texts.add(jt(sub, size=22, color=GREY_C))
    texts.arrange(DOWN, aligned_edge=LEFT, buff=0.1)
    card = VGroup(box, c)
    row = VGroup(card, texts).arrange(RIGHT, buff=0.25)
    return row


def place_card(card, y):
    """右の列（仕切り線の右）に左詰めで置く。"""
    return card.next_to(RIGHT * 1.95 + UP * y, RIGHT, buff=0)


class Differences(VoiceScene):
    def construct(self):
        divider = Line(UP * 3.5, DOWN * 3.5, stroke_color=GREY_E, stroke_width=2).move_to(RIGHT * 1.75)
        slots = [2.3, 0.0, -2.3]

        g = GridView(WORLD, cell=1.12).move_to(LEFT * 2.9 + 0.8 * UP)
        s0 = (2, 1)
        robot = Robot(height=0.58).move_to(g.center_of(s0))
        tag = section_tag("強化学習")

        with self.voice("強化学習では、ここが根本的に違います。") as v:
            self.play(FadeIn(tag), FadeIn(g), FadeIn(robot), Create(divider), run_time=1.2)
        rew = VGroup(jt("報酬", size=40, color=style.REWARD), mt("0", size=56, color=style.REWARD)).arrange(RIGHT, buff=0.25)
        rew.next_to(g, DOWN, buff=0.6)
        with self.voice("ロボットが今、{A}右に進んだとしましょう。環境から返ってくるのは、{B}「報酬ゼロ」という、数字だけです。") as v:
            self.wait_to(v, "A")
            self.play(robot.animate.move_to(g.center_of((3, 1))).look(RIGHT), run_time=0.6)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(rew, shift=0.2 * UP))

        ghost = Robot(height=0.58).move_to(g.center_of(s0)).set_opacity(0.35)
        up_arrow = DashedLine(g.center_of(s0), g.center_of((2, 2)), color=GREY_B, stroke_width=4)
        qm = robot.think("上なら？", direction=UR, size=28)
        with self.voice("{A}上に進んでいたら、もっと良かったのか。それは誰も教えてくれません。知りたければ、実際に上に進んでみるしかないんです。") as v:
            self.play(FadeIn(ghost), Create(up_arrow), robot.animate.look(UL), run_time=0.8)
            self.sfx("pop")
            self.play(FadeIn(qm, scale=0.8))
            self.play(robot.change("worried"))

        card1 = place_card(make_card(VGroup(g, robot, rew), "評価しかもらえない", "正解は教えてもらえない"), slots[0])
        with self.voice("一つ目の違いはこれです。もらえるのは、{A}正解ではなく、{B}評価だけ。") as v:
            self.play(FadeOut(VGroup(ghost, up_arrow, qm)), robot.change("normal"), run_time=0.6)
            self.wait_to(v, "A")
            self.play(FadeIn(card1[0][0]), run_time=0.3)
            self.play(TransformFromCopy(VGroup(g, robot, rew), card1[0][1]), run_time=1.1)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(FadeIn(card1[1], shift=0.1 * RIGHT), run_time=0.6)
        self.play(FadeOut(rew), robot.animate.move_to(g.center_of((0, 0))).look(ORIGIN), run_time=0.8)

        # 2. 遅れてくる報酬
        path = [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1), (2, 1), (2, 2), (2, 3), (3, 3), (4, 3)]
        acts = [A_RIGHT, A_RIGHT, A_RIGHT, A_UP, A_LEFT, A_UP, A_UP, A_RIGHT, A_RIGHT]
        steps = VGroup()
        for k, a in enumerate(acts):
            ar = arrow_glyph(a, length=0.46)
            last = k == len(acts) - 1
            rv = mt("+1" if last else "0", size=38, color=style.REWARD if last else GREY_C)
            steps.add(VGroup(ar, rv).arrange(DOWN, buff=0.22))
        steps.arrange(RIGHT, buff=0.36).next_to(g, DOWN, buff=0.65)
        with self.voice("二つ目。報酬は、たいてい、遅れてやってきます。") as v:
            self.play(Indicate(g.icons[GOAL], color=style.REWARD, scale_factor=1.3), run_time=1.2)
        with self.voice("{A}9歩動いて、星にたどり着き、最後に{B}プラス1をもらえたとしましょう。この成功は、どの一手のおかげだったのでしょうか。") as v:
            trail = VGroup()
            for k, a in enumerate(acts):
                s, n = path[k], path[k + 1]
                seg = Line(g.center_of(s), g.center_of(n), stroke_color=BLUE_B, stroke_width=4)
                trail.add(seg)
                self.add(seg, robot)
                self.play(robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)), Create(seg),
                          FadeIn(steps[k][0]), FadeIn(steps[k][1]), run_time=0.34)
            self.wait_to(v, "B")
            self.sfx("chime")
            self.play(Flash(g.center_of(GOAL), color=style.REWARD, flash_radius=0.5),
                      Indicate(steps[-1][1], color=style.REWARD, scale_factor=1.4), robot.change("happy"))
            qms = VGroup(*[jt("?", size=34, color=GREY_B).next_to(st, UP, buff=0.15) for st in steps])
            self.play(LaggedStart(*[FadeIn(q, shift=0.1 * DOWN) for q in qms], lag_ratio=0.08), run_time=1.2)

        with self.voice("{A}最後の一歩でしょうか。それとも、ずっと前に、{B}穴から離れた、あの判断でしょうか。") as v:
            self.play(qms[-1].animate.set_color(style.REWARD).scale(1.3), steps[-1][0].animate.set_color(style.REWARD),
                      trail[-1].animate.set_color(style.REWARD), run_time=0.6)
            self.wait_to(v, "B")
            self.play(qms[4].animate.set_color(style.REWARD).scale(1.3), steps[4][0].animate.set_color(style.REWARD),
                      trail[4].animate.set_color(style.REWARD).set_stroke(width=7),
                      Indicate(g.cells[(3, 1)], color=style.REWARD), run_time=0.8)

        credit_arrow = CurvedArrow(steps[-1].get_bottom() + 0.1 * DOWN, steps[0].get_bottom() + 0.1 * DOWN,
                                   angle=-0.45, color=style.REWARD, stroke_width=4)
        card2 = place_card(make_card(VGroup(steps, qms, credit_arrow), "報酬が遅れて届く", "信用割り当て問題"), slots[1])
        with self.voice("結果から、原因となった行動をさかのぼって、手柄を割り振らなければならない。これは{A}信用割り当て問題と呼ばれています。") as v:
            self.play(Create(credit_arrow), run_time=1.5)
            self.wait_to(v, "A")
            self.play(FadeIn(card2[0][0]), run_time=0.3)
            self.play(TransformFromCopy(VGroup(steps, qms, credit_arrow), card2[0][1]), run_time=1.1)
            self.sfx("hit")
            self.play(FadeIn(card2[1], shift=0.1 * RIGHT), run_time=0.6)
        self.play(FadeOut(VGroup(steps, qms, credit_arrow, trail, robot, g)), run_time=0.8)

        # 3. データを自分で集める
        rng = np.random.default_rng(1)
        table = VGroup()
        for i in range(3):
            for j in range(4):
                px = VGroup(*[Square(0.11, stroke_width=0, fill_color=WHITE,
                                     fill_opacity=float(rng.random() > 0.72)) for _ in range(49)])
                px.arrange_in_grid(7, 7, buff=0)
                frame = SurroundingRectangle(px, buff=0.03, color=GREY_C, stroke_width=1)
                lab = mt(str(rng.integers(10)), size=30, color=GREY_B).next_to(frame, DOWN, buff=0.1)
                table.add(VGroup(px, frame, lab))
        table.arrange_in_grid(3, 4, buff=(0.35, 0.3))
        lock = jt("最初から決まっている", size=30, color=GREY_C)
        ds = VGroup(table, lock.next_to(table, DOWN, buff=0.35)).move_to(LEFT * 2.9 + 0.3 * UP)
        with self.voice("三つ目。教師あり学習では、{A}データセットは最初から決まっていて、学習の途中で変わることはありません。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(r, shift=0.1 * DOWN) for r in table], lag_ratio=0.05), FadeIn(lock))

        g = GridView(WORLD, cell=1.12).move_to(LEFT * 2.9 + 0.3 * UP)
        robot = Robot(height=0.58).move_to(g.center_of((0, 0)))
        glow = VGroup()
        with self.voice("一方、強化学習では、どんなデータが手に入るかは、{A}ロボット自身の行動で決まります。") as v:
            self.play(FadeOut(ds, shift=0.3 * LEFT), FadeIn(g), FadeIn(robot), run_time=1.0)
            self.wait_to(v, "A")
            left_path = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3)]
            for s, n in zip(left_path[:-1], left_path[1:]):
                c = g.cells[s].copy().set_fill(BLUE_E, 0.55).set_stroke(width=0)
                glow.add(c)
                self.add(c, robot)
                self.play(robot.animate.move_to(g.center_of(n)).look(n_vec(s, n)), run_time=0.3)
            c = g.cells[(3, 3)].copy().set_fill(BLUE_E, 0.55).set_stroke(width=0)
            glow.add(c)
            self.add(c, robot)

        unknown = [(2, 0), (3, 0), (4, 0), (2, 1), (3, 1), (4, 1), (2, 2)]
        fog = VGroup(*[g.cells[s].copy().set_fill(BLACK, 0.8).set_stroke(width=0) for s in unknown])
        qs = VGroup(*[jt("?", size=34, color=GREY_C).move_to(g.center_of(s)) for s in unknown])
        with self.voice("もしロボットが、左の通路ばかり通っていたら、{A}右側がどうなっているのかは、永遠に分かりません。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(fog), LaggedStart(*[FadeIn(q) for q in qs], lag_ratio=0.1), robot.animate.look(DR), run_time=1.2)

        card3 = place_card(make_card(VGroup(g, robot, glow, fog, qs), "データを自分で集める", "探索と活用"), slots[2])
        with self.voice("今知っている一番良い行動を取るべきか、それとも、まだ試していない行動を探ってみるべきか。"
                        "このジレンマは、{A}探索と活用のトレードオフと呼ばれ、第3章で詳しく扱います。") as v:
            self.play(robot.change("worried"), Indicate(qs, color=WHITE), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(card3[0][0]), run_time=0.3)
            self.play(TransformFromCopy(VGroup(g, robot, glow, fog, qs), card3[0][1]), run_time=1.1)
            self.sfx("hit")
            self.play(FadeIn(card3[1], shift=0.1 * RIGHT), run_time=0.6)

        cards = VGroup(card1, card2, card3)
        with self.voice("評価しかもらえない。報酬が遅れて届く。データを自分で集める。"
                        "この三つが、強化学習を、教師あり学習とは、まったく別の問題にしています。") as v:
            self.play(FadeOut(VGroup(g, robot, glow, fog, qs, divider)), run_time=0.6)
            final = VGroup()
            for c in cards:
                t = c.copy()
                t[1].arrange(DOWN, buff=0.12)
                VGroup(t[0], t[1]).arrange(DOWN, buff=0.3)
                final.add(t)
            final.arrange(RIGHT, buff=0.6)
            final.scale_to_fit_width(min(12.8, final.width * 1.3)).move_to(0.2 * DOWN)
            self.play(*[Transform(c, f) for c, f in zip(cards, final)], run_time=1.4)
            for c in cards:
                self.play(Indicate(c[1][0], color=style.REWARD, scale_factor=1.08), run_time=0.8)
        self.play(FadeOut(VGroup(cards, tag)), run_time=0.9)


# ---------------------------------------------------------------------------
# 4b. お手本を超える
# ---------------------------------------------------------------------------
def go_board(n=9, size=3.2):
    step = size / (n - 1)
    lines = VGroup()
    for i in range(n):
        lines.add(Line(LEFT * size / 2 + UP * (i * step - size / 2), RIGHT * size / 2 + UP * (i * step - size / 2),
                       stroke_color="#2b2112", stroke_width=2))
        lines.add(Line(UP * size / 2 + RIGHT * (i * step - size / 2), DOWN * size / 2 + RIGHT * (i * step - size / 2),
                       stroke_color="#2b2112", stroke_width=2))
    wood = Square(size + 0.5, stroke_width=0, fill_color="#C9A162", fill_opacity=1)
    stones = VGroup()
    pattern = [(2, 2, 1), (6, 6, 0), (2, 6, 1), (6, 2, 0), (4, 4, 1), (3, 4, 0), (4, 3, 1), (5, 4, 0),
               (4, 5, 1), (3, 3, 0), (5, 5, 1), (6, 4, 0)]
    for x, y, black in pattern:
        st = Circle(radius=step * 0.45, stroke_width=1, stroke_color=GREY_D,
                    fill_color="#111111" if black else "#F2F2F2", fill_opacity=1)
        st.move_to(RIGHT * (x * step - size / 2) + UP * (y * step - size / 2))
        stones.add(st)
    return VGroup(wood, lines, stones)


class Beyond(VoiceScene):
    def construct(self):
        ax = Axes(x_range=[0, 10, 1], y_range=[0, 1.2, 0.2], x_length=7.2, y_length=4.4,
                  axis_config=dict(color=GREY_C, include_ticks=False, stroke_width=2),
                  tips=True).move_to(0.2 * DOWN)
        xl = jt("学習の進み", size=28, color=GREY_B).next_to(ax.x_axis, DOWN, buff=0.25).align_to(ax.x_axis, RIGHT)
        yl = jt("うまさ", size=28, color=GREY_B).next_to(ax.y_axis, UP, buff=0.15).align_to(ax.y_axis, LEFT)
        teacher_y = 0.75
        teacher = DashedLine(ax.c2p(0, teacher_y), ax.c2p(10, teacher_y), color=GREY_A, stroke_width=3)
        tlab = jt("お手本", size=30, color=GREY_A).next_to(teacher, RIGHT, buff=0.15)
        sl = ax.plot(lambda x: teacher_y * 0.96 * (1 - np.exp(-0.7 * x)), x_range=[0, 10], color=BLUE_B, stroke_width=5)
        rl = ax.plot(lambda x: 1.1 / (1 + np.exp(-(x - 5.0) * 0.9)) - 1.1 / (1 + np.exp(4.5)),
                     x_range=[0, 10], color=style.REWARD, stroke_width=5)
        def legend_row(color, text):
            return VGroup(Line(ORIGIN, RIGHT * 0.5, stroke_color=color, stroke_width=5),
                          jt(text, size=28, color=color)).arrange(RIGHT, buff=0.2)
        sll = legend_row(BLUE_B, "教師あり学習（真似る）")
        rll = legend_row(style.REWARD, "強化学習（評価で鍛える）")
        VGroup(rll, sll).arrange(DOWN, aligned_edge=LEFT, buff=0.18).next_to(ax.c2p(0.4, 1.2), DR, buff=0)
        rll.align_to(sll, LEFT)
        note = jt("イメージ", size=22, color=GREY_C).to_corner(DL, buff=0.4)

        with self.voice("こう並べると、強化学習は、ずいぶん不便な設定に見えるかもしれません。"
                        "でも、この不便さと引き換えに、《とても大きなもの》が手に入ります。") as v:
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(note), run_time=1.2)
        with self.voice("教師あり学習は、{A}お手本を真似る学習です。どんなに上手に真似ても、{B}お手本より上には、なかなか行けません。") as v:
            self.play(Create(teacher), FadeIn(tlab), run_time=0.8)
            self.wait_to(v, "A")
            self.play(Create(sl), FadeIn(sll), run_time=2.0)
            self.wait_to(v, "B")
            self.play(Indicate(teacher, color=WHITE), Flash(ax.c2p(10, teacher_y * 0.96), color=BLUE_B))
        with self.voice("強化学習に必要なのは、{A}結果の良し悪しを判定する方法だけ。お手本は、いりません。だから、{B}お手本を《超える》ことができるんです。") as v:
            self.wait_to(v, "A")
            self.play(Create(rl), run_time=v.until("B"))
            self.sfx("sparkle")
            self.play(FadeIn(rll, shift=0.1 * UP), Flash(ax.c2p(10, 1.08), color=style.REWARD, flash_radius=0.5))
        graph = VGroup(ax, xl, yl, teacher, tlab, sl, rl, sll, rll, note)

        board = go_board().scale(0.9).move_to(RIGHT * 3.9 + 0.6 * UP)
        r1 = Robot(height=0.75).next_to(board, LEFT, buff=0.35).shift(0.9 * DOWN)
        r2 = Robot(height=0.75, color=MAROON_B).next_to(board, RIGHT, buff=0.35).shift(0.9 * DOWN)
        loop = VGroup(CurvedArrow(r1.get_bottom() + 0.1 * DOWN, r2.get_bottom() + 0.1 * DOWN, angle=0.9, color=GREY_B),
                      )
        selfplay = jt("自分自身と対局", size=28, color=GREY_B).next_to(board, DOWN, buff=1.1)
        score = VGroup(jt("以前の版", size=28, color=GREY_B), mt("0", ":", "100", size=56),
                       jt("ゼロ", size=28, color=style.REWARD)).arrange(RIGHT, buff=0.35)
        score[1][2].set_color(style.REWARD)
        score.next_to(board, UP, buff=0.35)
        with self.voice("有名な例が、囲碁です。2017年に発表された、アルファ碁ゼロは、{A}人間の棋譜を一切使わず、自分自身との対局だけから学び、"
                        "{B}人間の棋譜から学んだ、以前のバージョンに、100戦100勝しました。") as v:
            self.play(graph.animate.scale(0.62).to_edge(LEFT, buff=0.3), run_time=1.0)
            self.play(FadeIn(board, shift=0.2 * UP), run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(r1), FadeIn(r2), Create(loop), FadeIn(selfplay), run_time=1.0)
            self.play(r1.animate.look(RIGHT), r2.animate.look(LEFT))
            self.wait_to(v, "B")
            self.sfx("chime")
            self.play(FadeIn(score, shift=0.2 * DOWN), r2.change("happy"), r1.change("sad"))

        with self.voice("言語モデルでも、同じことが言えます。お手本の文章を真似るだけでなく、{A}答えの良し悪しで評価して鍛えることで、"
                        "お手本を超えた力を引き出そうとしている。{B}それが、このシリーズの最終章のテーマです。") as v:
            self.play(FadeOut(VGroup(board, r1, r2, loop, selfplay, score)), run_time=0.7)
            self.wait_to(v, "A")
            self.play(graph.animate.scale(1 / 0.62).move_to(0.2 * DOWN), run_time=1.0)
            self.wait_to(v, "B")
            self.play(Indicate(rll, color=style.REWARD), run_time=1.2)
        self.play(FadeOut(graph), run_time=0.8)


# ---------------------------------------------------------------------------
# 5. エージェントと環境
# ---------------------------------------------------------------------------
class Loop(VoiceScene):
    def construct(self):
        agent = Robot(height=1.4)
        with self.voice("では、この状況を、数学の言葉で書いていきましょう。") as v:
            self.sfx("pop", offset=0.1)
            self.play(GrowFromCenter(agent), run_time=0.8)
            self.play(agent.blink())

        agent_pos = LEFT * 4.3 + 0.5 * UP
        agent_lab = jt("エージェント", size=36, color=WHITE).next_to(agent_pos, DOWN, buff=1.0)
        env_box = RoundedRectangle(width=5.0, height=3.7, corner_radius=0.25, stroke_color=GREY_B,
                                   stroke_width=2.5).move_to(RIGHT * 3.4 + 0.5 * UP)
        mini = GridView(WORLD, cell=0.66, show_terminal_labels=False).move_to(env_box)
        mini_robot = Robot(height=0.34).move_to(mini.center_of((2, 1)))
        env_lab = jt("環境", size=36, color=WHITE).next_to(env_box, DOWN, buff=0.3)

        with self.voice("登場するのは二つです。行動を選んで学習する{A}エージェントと、それ以外のすべてをひっくるめた、{B}環境です。") as v:
            self.wait_to(v, "A")
            self.play(agent.animate.move_to(agent_pos), FadeIn(agent_lab, shift=0.1 * UP))
            self.sfx("pop")
            self.wait_to(v, "B")
            self.play(Create(env_box), FadeIn(mini), FadeIn(mini_robot), FadeIn(env_lab, shift=0.1 * UP))

        top = CurvedArrow(agent.get_top() + 0.3 * UP + 0.3 * RIGHT, env_box.get_top() + 0.1 * UP + 0.8 * LEFT,
                          angle=-0.5, color=style.ACTION, stroke_width=5)
        bot = CurvedArrow(env_box.get_bottom() + 0.75 * DOWN + 0.8 * LEFT, agent_lab.get_bottom() + 0.1 * DOWN + 0.4 * RIGHT,
                          angle=-0.5, color=style.STATE, stroke_width=5)
        t_lab = VGroup(mt("t", size=52), mt("=", size=52), Integer(0, font_size=52)).arrange(RIGHT, buff=0.18)
        t_lab.to_corner(UL, buff=0.55)
        s_tex = VGroup(jt("状態", size=32, color=style.STATE), mt("s_t", size=48)).arrange(RIGHT, buff=0.15)
        s_tex.next_to(agent, UP, buff=0.45).shift(0.4 * LEFT)
        a_tex = VGroup(jt("行動", size=32, color=style.ACTION), mt("a_t", size=48)).arrange(RIGHT, buff=0.15)
        a_tex.next_to(top, UP, buff=0.12)
        with self.voice("時刻[t|ティー]で、エージェントは、今の{A}状態、[sₜ|エスティー]を見て、{B}行動、[aₜ|エーティー]を選びます。") as v:
            self.play(FadeIn(t_lab), run_time=0.6)
            self.wait_to(v, "A")
            self.play(FadeIn(s_tex, shift=0.1 * DOWN), agent.animate.look(RIGHT))
            self.wait_to(v, "B")
            self.play(Create(top), FadeIn(a_tex, shift=0.1 * UP), run_time=1.0)

        sp = VGroup(jt("次の状態", size=32, color=style.STATE), mt("s_{t+1}", size=48)).arrange(RIGHT, buff=0.15)
        rp = VGroup(jt("報酬", size=32, color=style.REWARD), mt("r_{t+1}", size=48, color=style.REWARD)).arrange(RIGHT, buff=0.15)
        VGroup(sp, rp).arrange(RIGHT, buff=0.7).next_to(bot, DOWN, buff=0.15)
        with self.voice("すると環境が、{A}次の状態、[sₜ₊₁|エスティープラスワン]と、{B}報酬、[rₜ₊₁|アールティープラスワン]を返してきます。") as v:
            self.play(mini_robot.animate.move_to(mini.center_of((2, 2))).look(UP), run_time=0.6)
            self.wait_to(v, "A")
            self.play(Create(bot), FadeIn(sp, shift=0.1 * DOWN), run_time=1.0)
            self.wait_to(v, "B")
            self.play(FadeIn(rp, shift=0.1 * DOWN))

        with self.voice("そしてまた、エージェントが次の行動を選ぶ。{A}この繰り返しです。") as v:
            seq = [((2, 2), (2, 3)), ((2, 3), (3, 3)), ((3, 3), (4, 3))]
            for k, (s, n) in enumerate(seq):
                d1 = Dot(color=style.ACTION, radius=0.1)
                d2 = Dot(color=style.STATE, radius=0.1)
                self.play(MoveAlongPath(d1, top), run_time=0.5)
                self.remove(d1)
                self.play(mini_robot.animate.move_to(mini.center_of(n)).look(n_vec(s, n)), run_time=0.35)
                self.sfx("tick")
                self.play(MoveAlongPath(d2, bot), t_lab[2].animate.set_value(k + 1), run_time=0.5)
                self.remove(d2)

        with self.voice("報酬の添え字が[t+1|ティープラスワン]になっているのは、行動を選んだ{A}あとで届くものだからです。"
                        "細かいようですが、この先の式を読むときに効いてきます。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(rp[1], color=style.REWARD, scale_factor=1.3), run_time=1.0)

        loop = VGroup(agent, agent_lab, env_box, mini, mini_robot, env_lab, top, bot, s_tex, a_tex, sp, rp, t_lab)
        self.play(FadeOut(loop), run_time=0.8)

        # 軌跡を並べる：1エピソードを実際に動かしながら
        g = GridView(WORLD, cell=0.78, show_terminal_labels=False).move_to(UP * 1.9)
        rob = Robot(height=0.4).move_to(g.center_of((2, 1)))
        traj = [((2, 1), A_UP, 0, (2, 2)), ((2, 2), A_UP, 0, (2, 3)), ((2, 3), A_RIGHT, 0, (3, 3)),
                ((3, 3), A_RIGHT, 1, (4, 3))]
        tokens = VGroup()
        for k, (s, a, r, n) in enumerate(traj):
            tokens.add(mt(f"s_{k}", size=52))
            tokens.add(mt(f"a_{k}", size=52))
            tokens.add(mt(f"r_{k + 1}", size=52, color=style.REWARD))
        tokens.add(mt("s_4", size=52))
        tokens.arrange(RIGHT, buff=0.46).move_to(DOWN * 1.1)
        details = VGroup()
        for k, (s, a, r, n) in enumerate(traj):
            details.add(mt(f"({s[0]},{s[1]})", size=28, color=GREY_B).next_to(tokens[3 * k], DOWN, buff=0.3))
            details.add(arrow_glyph(a, length=0.4).next_to(tokens[3 * k + 1], DOWN, buff=0.35))
            details.add(mt(str(r), size=34, color=style.REWARD if r else GREY_C).next_to(tokens[3 * k + 2], DOWN, buff=0.3))
        details.add(mt("(4,3)", size=28, color=GREY_B).next_to(tokens[-1], DOWN, buff=0.3))

        with self.voice("このやり取りを、{A}時間の順に横に並べると、状態、行動、報酬が交互に並んだ、一本の系列ができあがります。"
                        "これを{B}軌跡、あるいはエピソードと呼びます。") as v:
            self.play(FadeIn(g), FadeIn(rob), run_time=0.8)
            self.wait_to(v, "A")
            per = 0.28
            self.play(FadeIn(tokens[0], shift=0.2 * RIGHT), FadeIn(details[0]), run_time=per)
            for k, (s, a, r, n) in enumerate(traj):
                self.play(FadeIn(tokens[3 * k + 1], shift=0.2 * RIGHT), FadeIn(details[3 * k + 1]), run_time=per)
                self.play(rob.animate.move_to(g.center_of(n)).look(n_vec(s, n)), run_time=per)
                self.play(FadeIn(tokens[3 * k + 2], shift=0.2 * RIGHT), FadeIn(details[3 * k + 2]),
                          FadeIn(tokens[3 * k + 3], shift=0.2 * RIGHT), FadeIn(details[3 * k + 3]), run_time=per * 1.4)
            self.wait_to(v, "B")
            tau = mt(r"\tau", "=", r"(s_0, a_0, r_1, s_1, a_1, r_2, \dots)", size=48)
            lab = jt("軌跡（エピソード）", size=34, color=GREY_B)
            VGroup(lab, tau).arrange(RIGHT, buff=0.4).move_to(DOWN * 3.2)
            self.play(FadeIn(lab), Write(tau))

        chips = VGroup(*[SurroundingRectangle(t, buff=0.12, corner_radius=0.08, stroke_width=2,
                                              color=t.get_color()) for t in tokens])
        with self.voice("言語モデルに慣れている人には、{A}トークンの列のように見えるかもしれません。"
                        "実はこの見方は、最終章で、言語モデルに強化学習を適用するときに、そのまま使うことになります。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[Create(c) for c in chips], lag_ratio=0.05), run_time=1.5)
        self.play(FadeOut(VGroup(g, rob, tokens, details, chips, tau, lab)), run_time=0.9)


# ---------------------------------------------------------------------------
# 6. MDP の定義
# ---------------------------------------------------------------------------
class MDP(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.3).move_to(LEFT * 3.3 + 0.35 * UP)
        s0 = (2, 0)
        robot = Robot(height=0.62).move_to(g.center_of(s0))
        px = 1.0  # 右側パネルの左端

        def row(name, color, tex, note=None):
            parts = [jt(name, size=38, color=color), mt(tex, size=50)]
            if note:
                parts.append(jt(note, size=28, color=GREY_B))
            return VGroup(*parts).arrange(RIGHT, buff=0.3)

        with self.voice("次に、ロボットの世界を、もう少し正確に定義しておきましょう。") as v:
            self.play(FadeIn(g), FadeIn(robot), run_time=1.2)

        s_row = row("状態", style.STATE, r"s \in \mathcal{S}", "（17個）")
        a_row = row("行動", style.ACTION, r"a \in \mathcal{A}", "（上下左右）")
        p_row = VGroup(jt("遷移確率", size=38, color=WHITE),
                       mt("P(", "s'", r"\mid", "s", ",", "a", ")", size=50)).arrange(RIGHT, buff=0.3)
        r_row = row("報酬", style.REWARD, r"r", "（+1, −1, 0）")
        panel = VGroup(s_row, a_row, p_row, r_row).arrange(DOWN, aligned_edge=LEFT, buff=0.6)
        panel.next_to(RIGHT * px, RIGHT, buff=0).shift(0.9 * UP)

        with self.voice("まず{A}状態。ここでは、ロボットがいるマスが、状態です。壁を除くと、全部で{B}17個あります。") as v:
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(s_row[:2], shift=0.1 * LEFT))
            outlines = VGroup(*[g.cells[s].copy().set_fill(opacity=0).set_stroke(style.STATE, 5)
                                for s in WORLD.states])
            self.play(LaggedStart(*[Create(o) for o in outlines], lag_ratio=0.05), run_time=v.until("B"))
            self.play(FadeIn(s_row[2]), FadeOut(outlines), run_time=0.8)

        arrows = VGroup(*[g.arrow(s0, a, color=style.ACTION, length=0.9).shift(ACTION_VEC[a] * 0.5)
                          for a in ACTIONS])
        with self.voice("次に{A}行動。上、下、左、右の4つです。") as v:
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(a_row[:2], shift=0.1 * LEFT), LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.15))
            self.play(FadeIn(a_row[2]))
        self.play(FadeOut(arrows), run_time=0.5)

        # 遷移
        with self.voice("ただし、この世界の床は、少し滑ります。{A}上に進もうとしても、確実に上に行けるとは限りません。") as v:
            self.wait_to(v, "A")
            intent = g.arrow(s0, A_UP, color=style.ACTION, length=0.9).shift(UP * 0.5)
            self.play(GrowArrow(intent), robot.animate.look(UP))

        c = g.center_of(s0)
        fan_up = Arrow(c, g.center_of((2, 1)), buff=0.4, color=style.STATE, stroke_width=9)
        fan_l = Arrow(c, g.center_of((1, 0)), buff=0.4, color=style.STATE, stroke_width=4)
        fan_r = Arrow(c, g.center_of((3, 0)), buff=0.4, color=style.STATE, stroke_width=4)
        p_up = mt("0.8", size=40, color=WHITE).next_to(fan_up, RIGHT, buff=0.1)
        p_l = mt("0.1", size=34, color=GREY_A).next_to(fan_l, UP, buff=0.06)
        p_r = mt("0.1", size=34, color=GREY_A).next_to(fan_r, UP, buff=0.06)
        with self.voice("{A}80%の確率で、狙いどおり、[上|うえ]へ。{B}残りの20%は、左右に10%ずつ、横滑りしてしまいます。") as v:
            self.wait_to(v, "A")
            self.play(FadeOut(intent), GrowArrow(fan_up), FadeIn(p_up))
            self.wait_to(v, "B")
            self.play(GrowArrow(fan_l), GrowArrow(fan_r), FadeIn(p_l), FadeIn(p_r))
        fan = VGroup(fan_up, fan_l, fan_r, p_up, p_l, p_r)

        with self.voice("壁や外周にぶつかったときは、{A}その場にとどまります。") as v:
            self.play(FadeOut(fan), run_time=0.5)
            self.wait_to(v, "A")
            self.sfx("thud")
            self.play(robot.animate(rate_func=there_and_back, run_time=0.5).shift(0.22 * DOWN).look(DOWN))
            self.play(robot.animate(rate_func=there_and_back, run_time=0.5).shift(0.22 * DOWN))
            self.play(robot.animate.look(ORIGIN), run_time=0.3)

        ex = mt(r"P(", r"s'", r"=(2,1)", r"\mid", r"s", r"=(2,0),\,", r"a", r"=\uparrow", r")", r"=0.8", size=40)
        ex.next_to(g, DOWN, buff=0.45)
        with self.voice("状態[s|エス]で行動[a|エー]を選んだとき、次に状態[s'|エスダッシュ]になる確率。"
                        "これを{A}遷移確率と呼び、{B}このように書きます。") as v:
            self.play(FadeIn(fan), run_time=0.6)
            self.wait_to(v, "A")
            self.play(FadeIn(p_row[0], shift=0.1 * LEFT))
            self.wait_to(v, "B")
            self.play(Write(p_row[1]))
            self.play(FadeIn(ex, shift=0.1 * UP))
        self.play(FadeOut(fan), run_time=0.4)

        with self.voice("最後に{A}報酬。星に入ればプラス1、{B}穴に落ちればマイナス1、それ以外のマスでは0です。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(r_row[:2], shift=0.1 * LEFT), Indicate(g.icons[GOAL], color=style.REWARD, scale_factor=1.3))
            self.wait_to(v, "B")
            self.play(Indicate(g.icons[PIT], color=RED, scale_factor=1.3), FadeIn(r_row[2]))

        tuple_ = mt(r"(\mathcal{S},\ \mathcal{A},\ P,\ R)", size=60)
        mdp_lab = jt("マルコフ決定過程（MDP）", size=34, color=WHITE)
        tgroup = VGroup(mdp_lab, tuple_).arrange(DOWN, buff=0.3).next_to(panel, DOWN, buff=0.7).align_to(panel, LEFT)
        with self.voice("状態、行動、遷移確率、報酬。この4つの組を、{A}マルコフ決定過程、略してMDPと呼びます。"
                        "強化学習で扱う問題は、ほとんどが、この形で書かれます。") as v:
            self.play(LaggedStart(*[Indicate(m[0], scale_factor=1.1) for m in panel], lag_ratio=0.3),
                      run_time=v.until("A"))
            self.play(FadeIn(mdp_lab), Write(tuple_), run_time=1.2)
            self.play(Circumscribe(tgroup, color=GREY_B), run_time=1.2)
        self.play(FadeOut(VGroup(g, robot, panel, ex, tgroup)), run_time=0.9)


# ---------------------------------------------------------------------------
# 7. マルコフ性
# ---------------------------------------------------------------------------
class Markov(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.3).move_to(LEFT * 3.1 + 0.2 * DOWN)
        meet = (2, 0)
        with self.voice("名前にある「マルコフ」には、大事な意味があります。") as v:
            self.play(FadeIn(g), run_time=1.0)

        p1 = [(0, 3), (0, 2), (0, 1), (0, 0), (1, 0), (2, 0)]
        p2 = [(3, 3), (2, 3), (2, 2), (2, 1), (2, 0)]
        l1 = path_line(g, p1, color=TEAL_B, width=6)
        l2 = path_line(g, p2, color=MAROON_B, width=6)
        robot = Robot(height=0.58).move_to(g.center_of(p1[0]))

        def fan_panel(color):
            return ProbBars([0.8, 0.1, 0.1], labels=[arrow_glyph(A_UP, color=GREY_B, length=0.38),
                                                     arrow_glyph(A_LEFT, color=GREY_B, length=0.38),
                                                     arrow_glyph(A_RIGHT, color=GREY_B, length=0.38)],
                            width=2.6, height=1.7, colors=[color] * 3)

        with self.voice("ロボットが{A}この道を通って、このマスに来たとしましょう。{B}別の道を通って、同じマスに来た場合と比べて、この先に起こることは、違うでしょうか。") as v:
            self.play(FadeIn(robot))
            self.play(Create(l1), MoveAlongPath(robot, l1), run_time=max(1.0, v.until("B") - 1.0))
            f1 = fan_panel(TEAL_B).move_to(RIGHT * 3.9 + UP * 1.35)
            h1 = jt("道Aを通ってきた場合", size=30, color=TEAL_B).next_to(f1, UP, buff=0.25)
            self.play(FadeIn(f1), FadeIn(h1), run_time=0.5)
            self.play(FadeOut(robot), l1.animate.set_stroke(opacity=0.35), run_time=0.4)
            robot2 = Robot(height=0.58).move_to(g.center_of(p2[0]))
            self.add(robot2)
            self.play(Create(l2), MoveAlongPath(robot2, l2), run_time=2.0)
            f2 = fan_panel(MAROON_B).move_to(RIGHT * 3.9 + DOWN * 2.2)
            h2 = jt("道Bを通ってきた場合", size=30, color=MAROON_B).next_to(f2, UP, buff=0.25)
            self.play(FadeIn(f2), FadeIn(h2), run_time=0.5)

        eq = mt("=", size=72).move_to(RIGHT * 3.9 + DOWN * 0.35)
        prop = mt(r"P(s_{t+1} \mid s_t, a_t, s_{t-1}, a_{t-1}, \dots) = P(s_{t+1} \mid s_t, a_t)", size=44)
        prop.to_edge(UP, buff=0.4)
        with self.voice("この世界では、{A}違いません。次に何が起こるかは、今いるマスと、今選ぶ行動だけで決まり、そこまでの道のりには依存しない。"
                        "これを{B}マルコフ性と呼びます。") as v:
            self.wait_to(v, "A")
            self.play(Write(eq), Indicate(f1.bars, scale_factor=1.05), Indicate(f2.bars, scale_factor=1.05))
            self.play(l1.animate.set_stroke(opacity=0.15), l2.animate.set_stroke(opacity=0.15), run_time=1.0)
            self.wait_to(v, "B")
            self.play(VGroup(g, l1, l2, robot2, f1, f2, h1, h2, eq).animate.shift(0.45 * DOWN), Write(prop),
                      run_time=1.5)

        box = SurroundingRectangle(g.cells[meet], color=style.STATE, stroke_width=6, buff=0.0)
        with self.voice("裏を返すと、状態とは、{A}未来を予測するのに必要な情報を、すべて詰め込んだもの、ということです。") as v:
            self.wait_to(v, "A")
            self.play(Create(box), Indicate(g.cells[meet], color=style.STATE))

        world = VGroup(g, l1, l2, robot2, f1, f2, h1, h2, eq, box)
        self.play(FadeOut(world), run_time=0.8)
        text = "昔々あるところに、おじいさんとおばあさんが"
        chars = VGroup(*[jt(ch, size=46, color=WHITE) for ch in text]).arrange(RIGHT, buff=0.05)
        chars.move_to(UP * 0.2)
        state_box = SurroundingRectangle(chars, color=style.STATE, buff=0.22, corner_radius=0.1)
        st_lab = VGroup(jt("状態", size=36, color=style.STATE), mt("s_t", size=48)).arrange(RIGHT, buff=0.15)
        st_lab.next_to(state_box, DOWN, buff=0.4)
        with self.voice("たとえば、言語モデルで文章を生成する場合は、{A}それまでに書いたテキスト全体を、状態とみなします。"
                        "そうすれば、マルコフ性は、自然に成り立ちます。") as v:
            self.play(LaggedStart(*[FadeIn(c) for c in chars], lag_ratio=0.04), run_time=v.until("A"))
            self.play(Create(state_box), FadeIn(st_lab, shift=0.1 * UP))
        self.play(FadeOut(VGroup(chars, state_box, st_lab, prop)), run_time=0.8)


# ---------------------------------------------------------------------------
# 8. 方策
# ---------------------------------------------------------------------------
class Policy(VoiceScene):
    def construct(self):
        g = GridView(WORLD, cell=1.25).move_to(LEFT * 3.4 + 0.2 * DOWN)
        s = (2, 0)
        robot = Robot(height=0.6).move_to(g.center_of(s))
        pi_lab = jt("方策", size=44, color=style.POLICY)
        pi_sym = mt(r"\pi", size=64)
        head = VGroup(pi_lab, pi_sym).arrange(RIGHT, buff=0.3).move_to(RIGHT * 3.7 + UP * 3.0)
        with self.voice("さて、エージェントの振る舞いを決めるルールを、{A}方策と呼びます。記号では、{B}パイで表します。") as v:
            self.play(FadeIn(g), FadeIn(robot), run_time=1.0)
            self.wait_to(v, "A")
            self.play(FadeIn(pi_lab, shift=0.1 * DOWN))
            self.wait_to(v, "B")
            self.play(Write(pi_sym))

        probs = [0.2, 0.6, 0.1, 0.1]
        order = [A_UP, A_RIGHT, A_DOWN, A_LEFT]
        bars = ProbBars(probs, labels=[arrow_glyph(a, color=GREY_B, length=0.42) for a in order],
                        width=4.2, height=3.0, colors=[style.POLICY] * 4).move_to(RIGHT * 3.7 + DOWN * 0.9)
        formula = mt(r"\pi(", "a", r"\mid", "s", ")", size=60).move_to(RIGHT * 3.7 + UP * 1.75)
        focus = SurroundingRectangle(g.cells[s], color=style.STATE, stroke_width=6, buff=0.0)
        link = DashedLine(focus.get_right(), bars.get_left() + 0.8 * UP, color=GREY_C, stroke_width=2.5)
        with self.voice("[π(a｜s)|パイ、エー、ギブン、エス]は、{A}状態[s|エス]にいるときに、行動[a|エー]を選ぶ確率です。") as v:
            self.play(Write(formula), run_time=1.0)
            self.wait_to(v, "A")
            self.play(Create(focus), Create(link), FadeIn(bars), run_time=1.0)

        vals = bars.value_labels(size=32)
        with self.voice("たとえば、このマスでは、{A}右に60%、上に20%、といった具合です。行動を選ぶときは、この確率に従って、{B}サイコロを振ります。") as v:
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(x) for x in vals], lag_ratio=0.1), Indicate(bars.bars[1], color=WHITE))
            self.wait_to(v, "B")
            hl = SurroundingRectangle(bars.bars[0], color=WHITE, buff=0.06)
            self.play(Create(hl), run_time=0.2)
            for k, i in enumerate([1, 2, 3, 0, 1, 2, 3, 0, 1]):
                self.play(hl.animate.become(SurroundingRectangle(bars.bars[i], color=WHITE, buff=0.06)),
                          run_time=0.08 + 0.03 * k)
            self.play(Indicate(bars.bars[1], color=WHITE), robot.animate.move_to(g.center_of((3, 0))).look(RIGHT),
                      run_time=0.7)
            self.play(FadeOut(hl), run_time=0.3)

        rng = np.random.default_rng(7)
        minis = VGroup()
        for st in g.nonterminal_states():
            p = rng.dirichlet(np.ones(4) * 1.4)
            mb = ProbBars(list(p), width=0.9, height=0.72, colors=[style.POLICY] * 4, bar_ratio=0.7)
            mb.move_to(g.center_of(st) + 0.2 * DOWN)
            minis.add(mb)
        with self.voice("つまり確率的な方策とは、{A}すべてのマスに、それぞれ専用のサイコロを置いておくようなものです。") as v:
            self.play(FadeOut(robot), FadeOut(focus), FadeOut(link), run_time=0.5)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(m, scale=0.5) for m in minis], lag_ratio=0.05), run_time=1.5)

        arrows = g.policy_arrows(PI_STAR, color=style.POLICY, length=0.55)
        det = jt("決定的な方策", size=34, color=GREY_A).next_to(g, DOWN, buff=0.35)
        with self.voice("一方、各マスで取る行動を、{A}一つに決めてしまった方策を、決定的な方策と呼びます。") as v:
            self.wait_to(v, "A")
            self.play(*[ReplacementTransform(m, a) for m, a in zip(minis, arrows)], FadeIn(det), run_time=1.4)
        self.play(FadeOut(VGroup(g, arrows, det, bars, vals, formula)), run_time=0.8)

        # 言語モデル = 方策
        lm_box = VGroup(RoundedRectangle(width=4.2, height=1.5, corner_radius=0.2, stroke_color=GREY_B,
                                         stroke_width=2.5), jt("言語モデル", size=48, color=WHITE))
        lm_box[1].move_to(lm_box[0])
        with self.voice("ここでも、言語モデルとのつながりを見ておきましょう。実は、{A}言語モデルは、それ自体が方策です。") as v:
            self.play(head.animate.move_to(RIGHT * 2.2 + UP * 0.2), FadeIn(lm_box.move_to(LEFT * 2.6 + UP * 0.2)),
                      run_time=1.0)
            eq = mt("=", size=64).move_to(UP * 0.2 + LEFT * 0.1)
            self.wait_to(v, "A")
            self.play(Write(eq), Indicate(head, color=style.POLICY))
        self.play(FadeOut(VGroup(lm_box, eq)), head.animate.move_to(UP * 3.1), run_time=0.8)
        ctx = VGroup(*[token_chip(t, size=42) for t in ["強化", "学習", "は"]]).arrange(RIGHT, buff=0.12)
        ctx.move_to(LEFT * 4.3 + UP * 0.9)
        cands = ["面白い", "難しい", "、", "報酬"]
        lm = ProbBars([0.38, 0.27, 0.2, 0.15], labels=cands, width=6.0, height=2.8,
                      colors=[style.POLICY] * 4, label_size=34).move_to(RIGHT * 3.3 + DOWN * 0.3)
        arr = Arrow(ctx.get_right() + 1.3 * RIGHT, lm.get_left() + 1.0 * UP, buff=0.2, color=GREY_C, stroke_width=4)
        s_note = VGroup(jt("状態", size=34, color=style.STATE), jt("＝ ここまでのテキスト", size=32, color=GREY_B)).arrange(RIGHT, buff=0.2)
        s_note.next_to(ctx, DOWN, buff=0.5).align_to(ctx, LEFT)
        a_note = VGroup(jt("行動", size=34, color=style.ACTION), jt("＝ 次のトークン", size=32, color=GREY_B)).arrange(RIGHT, buff=0.2)
        a_note.next_to(lm, DOWN, buff=0.35)
        p_note = mt(r"\pi_\theta(a \mid s) = \mathrm{softmax}\big(z_\theta(s)\big)_a", size=44).next_to(lm, UP, buff=0.55)
        with self.voice("{A}状態は、ここまでのテキスト。{B}行動は、次に出すトークン。そして{C}方策は、語彙全体の上の、ソフトマックス分布です。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(ctx, shift=0.2 * RIGHT), FadeIn(s_note))
            self.wait_to(v, "B")
            self.play(GrowArrow(arr), FadeIn(lm), FadeIn(a_note))
            self.wait_to(v, "C")
            self.play(Write(p_note))
            pick = SurroundingRectangle(lm.labels[0], color=WHITE, buff=0.1)
            self.play(Create(pick))
            new = token_chip("面白い", size=42, color=style.ACTION, stroke=style.ACTION).next_to(ctx, RIGHT, buff=0.12)
            self.play(FadeIn(new[0]), run_time=0.3)
            self.play(TransformFromCopy(lm.labels[0], new[1]),
                      arr.animate.put_start_and_end_on(new.get_right() + 0.2 * RIGHT, lm.get_left() + 1.0 * UP),
                      run_time=0.9)

        self.say("強化学習の目的は、この方策を、より良いものへと変えていくことです。では、「良い方策」とは、何でしょうか。")
        self.play(FadeOut(VGroup(head, ctx, lm, arr, s_note, a_note, p_note, pick, new)), run_time=0.8)


# ---------------------------------------------------------------------------
# 9. リターン
# ---------------------------------------------------------------------------
def return_tex(discounted: bool, size=56):
    if discounted:
        m = mt("G_t", "=", "r_{t+1}", "+", r"\gamma", "r_{t+2}", "+", r"\gamma^2", "r_{t+3}", "+", r"\cdots", size=size)
        for i in (2, 5, 8):
            m[i].set_color(style.REWARD)
        m[4].set_color(style.GAMMA)
        m[7].set_color(style.GAMMA)
    else:
        m = mt("G_t", "=", "r_{t+1}", "+", "r_{t+2}", "+", "r_{t+3}", "+", r"\cdots", size=size)
        for i in (2, 4, 6):
            m[i].set_color(style.REWARD)
    return m


class Return(VoiceScene):
    def construct(self):
        rewards = VGroup()
        for k in range(7):
            val = 1 if k == 6 else 0
            box = RoundedRectangle(width=1.1, height=1.1, corner_radius=0.12, stroke_color=GREY_D,
                                   stroke_width=2, fill_color="#141418", fill_opacity=1)
            num = mt(str(val), size=46, color=style.REWARD if val else GREY_C).move_to(box)
            idx = mt(f"r_{{{k + 1}}}", size=36, color=style.REWARD).next_to(box, DOWN, buff=0.18)
            rewards.add(VGroup(box, num, idx))
        rewards.arrange(RIGHT, buff=0.22).move_to(UP * 1.7)
        with self.voice("エージェントが目指すのは、目先の報酬ではありません。{A}これから先に受け取る報酬の、合計です。") as v:
            self.play(LaggedStart(*[FadeIn(r, shift=0.2 * UP) for r in rewards], lag_ratio=0.1), run_time=2.0)
            self.play(Indicate(rewards[0], color=GREY_A), run_time=0.8)
            self.wait_to(v, "A")
            brace = Brace(rewards, DOWN, color=GREY_B).shift(0.1 * DOWN)
            self.play(GrowFromCenter(brace))

        g0 = return_tex(False)
        lab = jt("リターン", size=38, color=WHITE)
        VGroup(lab, g0).arrange(RIGHT, buff=0.5).next_to(brace, DOWN, buff=0.6)
        with self.voice("時刻tより先の報酬の合計を、{A}リターンと呼び、[Gₜ|ジーティー]と書きます。") as v:
            self.play(TransformFromCopy(VGroup(rewards[0][2], rewards[1][2], rewards[2][2]),
                                        VGroup(g0[2], g0[4], g0[6])),
                      FadeIn(g0[3]), FadeIn(g0[5]), FadeIn(g0[7:]), run_time=1.4)
            self.wait_to(v, "A")
            self.sfx("hit")
            self.play(FadeIn(g0[0:2], shift=0.2 * RIGHT), FadeIn(lab, shift=0.1 * RIGHT), run_time=1.0)

        with self.voice("ただ、単純に足すだけだと、困ったことが起こります。") as v:
            self.play(FadeOut(VGroup(rewards, brace)), VGroup(g0, lab).animate.to_edge(UP, buff=0.5), run_time=1.0)

        ga = GridView(WORLD, cell=1.0).move_to(LEFT * 3.4 + 0.3 * DOWN)
        gb = GridView(WORLD, cell=1.0).move_to(RIGHT * 3.4 + 0.3 * DOWN)
        fast = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3)]
        slow = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (4, 1), (3, 1), (3, 0), (2, 0), (2, 1), (2, 2),
                (2, 1), (2, 2), (2, 3), (1, 3), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3)]
        la = path_line(ga, fast, color=style.REWARD, width=6)
        lb = path_line(gb, slow, color=GREY_B, width=4, jitter=0.1, seed=4)
        ca = jt("7歩", size=36, color=GREY_B).next_to(ga, DOWN, buff=0.3)
        cb = jt("19歩", size=36, color=GREY_B).next_to(gb, DOWN, buff=0.3)
        with self.voice("{A}7歩で星にたどり着いても、{B}あちこち寄り道して19歩かかっても、リターンは、どちらも同じプラス1です。"
                        "これでは、急ぐ理由がありません。") as v:
            self.play(FadeIn(ga), FadeIn(gb), run_time=0.6)
            self.wait_to(v, "A")
            self.play(Create(la), FadeIn(ca), run_time=1.2)
            self.wait_to(v, "B")
            self.play(Create(lb), FadeIn(cb), run_time=2.0)
            ra = mt("G=+1", size=44, color=style.REWARD).next_to(ca, RIGHT, buff=0.5)
            rb = mt("G=+1", size=44, color=style.REWARD).next_to(cb, RIGHT, buff=0.5)
            self.play(FadeIn(ra), FadeIn(rb))
        self.play(FadeOut(VGroup(ga, gb, la, lb, ca, cb, ra, rb)), VGroup(g0, lab).animate.move_to(UP * 0.8),
                  run_time=0.8)

        g1 = return_tex(True).move_to(g0).align_to(g0, LEFT)
        with self.voice("そこで、{A}未来の報酬ほど、少しずつ割り引いて足すことにします。") as v:
            self.wait_to(v, "A")
            self.play(TransformMatchingTex(g0, g1), run_time=1.5)

        b1 = Brace(g1[4:6], DOWN, color=GREY_B)
        t1 = jt("1歩先", size=30, color=GREY_B).next_to(b1, DOWN, buff=0.12)
        b2 = Brace(g1[7:9], DOWN, color=GREY_B)
        t2 = jt("2歩先", size=30, color=GREY_B).next_to(b2, DOWN, buff=0.12)
        gam = VGroup(jt("割引率", size=40, color=style.GAMMA), mt(r"\gamma", size=60, color=style.GAMMA)).arrange(RIGHT, buff=0.2)
        gam.move_to(DOWN * 1.9)
        with self.voice("{A}1歩先の報酬は、ガンマ倍、{B}2歩先は、ガンマの2乗倍、というふうに、遠い未来の報酬ほど、小さく数えるわけです。"
                        "このガンマを、{C}割引率と呼びます。") as v:
            self.wait_to(v, "A")
            self.play(GrowFromCenter(b1), FadeIn(t1))
            self.wait_to(v, "B")
            self.play(GrowFromCenter(b2), FadeIn(t2))
            self.wait_to(v, "C")
            self.play(FadeIn(gam, shift=0.2 * UP))
        self.play(FadeOut(VGroup(b1, t1, b2, t2, gam, lab)), g1.animate.to_edge(UP, buff=0.45), run_time=0.8)


# ---------------------------------------------------------------------------
# 10. 割引率
# ---------------------------------------------------------------------------
class Discount(VoiceScene):
    def construct(self):
        g1 = return_tex(True).to_edge(UP, buff=0.45)
        self.add(g1)

        K = 40
        base = LEFT * 6.1 + DOWN * 2.4
        W, H = 12.2, 3.9
        dx = W / K
        gamma = ValueTracker(0.9)

        def make_bars():
            gm = gamma.get_value()
            grp = VGroup()
            for k in range(K):
                h = H * gm ** k
                r = Rectangle(width=dx * 0.72, height=max(h, 0.002), stroke_width=0,
                              fill_color=style.GAMMA, fill_opacity=0.85)
                r.move_to(base + RIGHT * (k + 0.5) * dx + UP * h / 2)
                grp.add(r)
            return grp

        bars = always_redraw(make_bars)
        axis = Line(base, base + RIGHT * W, stroke_color=GREY_C, stroke_width=2)
        ticks = VGroup(*[mt(str(k), size=30, color=GREY_B).next_to(base + RIGHT * (k + 0.5) * dx, DOWN, buff=0.15)
                         for k in (0, 5, 10, 20, 30)])
        xlab = jt("何歩先か", size=30, color=GREY_B).next_to(axis, DOWN, buff=0.55).align_to(axis, RIGHT)
        g_disp = VGroup(mt(r"\gamma", "=", size=56), DecimalNumber(0.9, num_decimal_places=2, font_size=56))
        g_disp[0][0].set_color(style.GAMMA)
        g_disp.arrange(RIGHT, buff=0.15).move_to(RIGHT * 0.2 + UP * 1.75)
        g_disp[1].add_updater(lambda d: d.set_value(gamma.get_value()))

        with self.voice("割引率は、0から1のあいだの数です。{A}縦棒の高さは、何歩先の報酬を、どれだけの重みで数えるかを、表しています。") as v:
            self.play(Create(axis), FadeIn(ticks), FadeIn(xlab), FadeIn(g_disp), run_time=0.8)
            self.wait_to(v, "A")
            self.play(FadeIn(bars), run_time=1.0)

        def horizon_marker():
            gm = gamma.get_value()
            hz = 1 / (1 - gm)
            lab = VGroup(mt(r"\frac{1}{1-\gamma}", size=40, color=GREY_A), mt(r"\approx", size=40, color=GREY_A),
                         Integer(round(hz), font_size=40, color=GREY_A)).arrange(RIGHT, buff=0.12)
            lab[0][0][4].set_color(style.GAMMA)
            if hz < K:
                x = base + RIGHT * (hz + 0.5) * dx
                ln = DashedLine(x, x + UP * (H * 0.72), color=GREY_B, stroke_width=3)
                lab.next_to(ln, UP, buff=0.1).shift(0.9 * RIGHT)
                return VGroup(ln, lab)
            x = base + RIGHT * W + UP * (H * 0.62)
            ar = Arrow(x + LEFT * 1.6, x, buff=0, color=GREY_B, stroke_width=4)
            lab.next_to(ar, UP, buff=0.12).align_to(ar, RIGHT)
            return VGroup(ar, lab)

        with self.voice("ガンマを{A}小さくすると、重みはあっという間にしぼんで、目先の報酬しか気にしない、せっかちなエージェントになります。") as v:
            self.wait_to(v, "A")
            self.play(gamma.animate.set_value(0.5), run_time=2.0)
        with self.voice("逆に、{A}1に近づけると、ずっと先の報酬まで大事にする、辛抱強いエージェントになります。") as v:
            self.wait_to(v, "A")
            self.play(gamma.animate.set_value(0.99), run_time=2.5)
        with self.voice("目安として、エージェントは、{A}だいたい、[1/(1−γ)|イチマイナスガンマぶんのいち][歩|ほ]くらい先までを、見ている、と考えるとよいでしょう。"
                        "{B}ガンマが0.9なら10歩、{C}0.99なら100歩です。") as v:
            self.wait_to(v, "A")
            self.play(gamma.animate.set_value(0.9), run_time=1.0)
            marker = always_redraw(horizon_marker)
            self.add(marker)
            self.wait_to(v, "B")
            self.play(Flash(marker[1].get_center(), color=WHITE, flash_radius=0.7))
            self.wait_to(v, "C")
            self.play(gamma.animate.set_value(0.99), run_time=1.5)
        self.play(gamma.animate.set_value(0.9), run_time=1.0)
        for m in (marker, bars, g_disp[1]):
            m.clear_updaters()
        chart = VGroup(bars, axis, ticks, xlab, marker, g_disp)
        self.play(FadeOut(chart), run_time=0.8)

        # 2つの道に戻る
        ra = VGroup(jt("7歩", size=40, color=GREY_B), mt(r"G_0 = \gamma^{6} \cdot 1 = 0.9^{6} \approx 0.53", size=52))
        rb = VGroup(jt("19歩", size=40, color=GREY_B), mt(r"G_0 = \gamma^{18} \cdot 1 = 0.9^{18} \approx 0.15", size=52))
        for r in (ra, rb):
            r.arrange(RIGHT, buff=0.5)
            r[1][0][3].set_color(style.GAMMA)
        VGroup(ra, rb).arrange(DOWN, buff=0.7, aligned_edge=LEFT).move_to(DOWN * 0.3)
        with self.voice("さっきの二つの道に戻りましょう。ガンマを0.9とすると、{A}7歩で着いたときのリターンは、0.9の6乗で、約0.53。"
                        "{B}19歩かかると、0.9の18乗で、約0.15です。これで、早く着いた方が、得になりました。") as v:
            self.wait_to(v, "A")
            self.play(FadeIn(ra, shift=0.2 * RIGHT))
            self.wait_to(v, "B")
            self.play(FadeIn(rb, shift=0.2 * RIGHT))
        self.play(FadeOut(VGroup(ra, rb)), run_time=0.8)


# ---------------------------------------------------------------------------
# 10b. 割引率のもう一つの見方：生き残る確率
# ---------------------------------------------------------------------------
SURVIVAL_SEED = 24


def survival_sim(n=100, steps=15, p_stop=0.1, seed=SURVIVAL_SEED):
    """各ステップで確率 p_stop で止まるロボット n 台。died[k] = k 歩目で止まった台の番号。"""
    rng = np.random.default_rng(seed)
    alive = np.ones(n, bool)
    died, counts = [], [n]
    for _ in range(steps):
        stop = alive & (rng.random(n) < p_stop)
        died.append(np.flatnonzero(stop))
        alive &= ~stop
        counts.append(int(alive.sum()))
    return died, counts


class Survival(VoiceScene):
    def construct(self):
        g1 = return_tex(True).to_edge(UP, buff=0.45)
        self.add(g1)
        died, counts = survival_sim()
        K = len(counts)

        bots = VGroup(*[Robot(height=0.26) for _ in range(100)])
        bots.arrange_in_grid(10, 10, buff=(0.14, 0.12)).move_to(LEFT * 4.35 + DOWN * 0.45)
        base = RIGHT * -0.9 + DOWN * 2.6
        Wc, Hc = 7.4, 3.9
        dx = Wc / K
        axis = Line(base, base + RIGHT * Wc, stroke_color=GREY_C, stroke_width=2)
        ticks = VGroup(*[mt(str(k), size=28, color=GREY_B).next_to(base + RIGHT * (k + 0.5) * dx, DOWN, buff=0.12)
                         for k in (0, 5, 10)])
        ylab = jt("動いている台数", size=28, color=GREY_B).next_to(axis, UP, buff=Hc + 0.15).align_to(axis, LEFT)
        k_lab = VGroup(mt("k", "=", size=44), Integer(0, font_size=44)).arrange(RIGHT, buff=0.12)
        k_lab.next_to(bots, UP, buff=0.3)

        def bar(k, frac, color=BLUE_C, fill=0.85, stroke=0):
            h = max(Hc * frac, 0.002)
            r = Rectangle(width=dx * 0.7, height=h, stroke_width=stroke, stroke_color=color,
                          fill_color=color, fill_opacity=fill)
            r.move_to(base + RIGHT * (k + 0.5) * dx + UP * h / 2)
            return r

        with self.voice("割引率には、もう一つ、とても面白い見方があります。") as v:
            self.play(LaggedStart(*[FadeIn(b, scale=0.5) for b in bots], lag_ratio=0.01), run_time=1.6)
        with self.voice("ロボットが、{A}1歩進むごとに、10%の確率で電池が切れて、そこで止まってしまう、と考えてみましょう。") as v:
            self.wait_to(v, "A")
            demo = bots[44]
            batt = VGroup(RoundedRectangle(width=0.9, height=0.42, corner_radius=0.06, stroke_color=GREY_A, stroke_width=2),
                          Rectangle(width=0.08, height=0.18, stroke_width=0, fill_color=GREY_A, fill_opacity=1))
            batt[1].next_to(batt[0], RIGHT, buff=0)
            level = Rectangle(width=0.78, height=0.3, stroke_width=0, fill_color=GREEN, fill_opacity=0.9).move_to(batt[0])
            batt.add(level)
            batt.next_to(bots, RIGHT, buff=0.5).shift(1.6 * UP)
            p_txt = mt(r"1-\gamma = 0.1", size=40).next_to(batt, DOWN, buff=0.3)
            p_txt[0][2].set_color(style.GAMMA)
            self.play(FadeIn(batt), Indicate(demo, scale_factor=2.0), run_time=1.0)
            self.play(level.animate.stretch_to_fit_width(0.05, about_edge=LEFT).set_color(RED), FadeIn(p_txt), run_time=1.2)
            self.play(FadeOut(VGroup(batt, p_txt)), run_time=0.5)

        bars = VGroup(bar(0, 1.0))
        with self.voice("100台のロボットを、同時に歩かせてみます。{A}1歩ごとに、およそ1割ずつ、止まっていきます。") as v:
            self.play(Create(axis), FadeIn(ticks), FadeIn(ylab), FadeIn(k_lab), FadeIn(bars[0]), run_time=0.8)
            self.wait_to(v, "A")
            per = min(0.55, max(0.3, v.remaining() / 6))
            for k in range(1, K):
                idx = died[k - 1]
                b = bar(k, counts[k] / 100)
                bars.add(b)
                anims = [k_lab[1].animate.set_value(k), GrowFromEdge(b, DOWN)]
                if len(idx):
                    anims.append(AnimationGroup(*[bots[i].animate.set_mood("sad").set_opacity(0.16) for i in idx]))
                self.sfx("tick")
                self.play(*anims, run_time=per)

        ref = VGroup(*[bar(k, 0.9 ** k, color=style.GAMMA, fill=0.0, stroke=4) for k in range(K)])
        ref_lab = mt(r"\gamma^k", size=48, color=style.GAMMA).next_to(ref[3], UR, buff=0.15).shift(0.6 * RIGHT)
        with self.voice("{A}動いている台数の、この棒グラフに、{B}さっきの、ガンマのk乗の棒を重ねてみると、ほとんど、ぴったり重なります。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(bars, color=WHITE, scale_factor=1.03), run_time=1.0)
            self.wait_to(v, "B")
            self.sfx("sparkle")
            self.play(LaggedStart(*[Create(r) for r in ref], lag_ratio=0.06), FadeIn(ref_lab), run_time=1.6)

        f1 = mt(r"P(\text{k歩先まで動いている})", "=", r"\gamma^k", size=44, tex_template=style.JP_TEX)
        f1[2].set_color(style.GAMMA)
        f2 = mt(r"\mathbb{E}\Big[\sum_k \mathbf{1}[\text{k歩先まで動いている}]\, r_{t+k+1}\Big]", "=",
                r"\sum_k", r"\gamma^k", r"r_{t+k+1}", size=40, tex_template=style.JP_TEX)
        f2[3].set_color(style.GAMMA)
        f2[4].set_color(style.REWARD)
        fs = VGroup(f1, f2).arrange(DOWN, buff=0.45).move_to(DOWN * 0.4)
        with self.voice("k歩先の報酬を受け取れるのは、k歩先まで、動き続けられた場合だけです。"
                        "だから、{A}いつ止まるか分からない世界で、報酬を割り引かずに足したときの期待値は、{B}割り引いたリターンと、ちょうど同じになるんです。") as v:
            self.play(FadeOut(VGroup(bots, k_lab)), VGroup(axis, ticks, ylab, bars, ref, ref_lab).animate.scale(0.55).to_corner(DR, buff=0.4),
                      run_time=1.2)
            self.play(Write(f1), run_time=1.2)
            self.wait_to(v, "A")
            self.play(FadeIn(f2[0:2], shift=0.1 * UP), run_time=1.2)
            self.wait_to(v, "B")
            self.play(FadeIn(f2[2:], shift=0.1 * LEFT), run_time=1.0)
            self.play(Circumscribe(f2[3], color=style.GAMMA))
        with self.voice("割引率とは、{A}未来が本当に来るかどうか、分からない、という不確かさを表したもの、と見ることもできるわけです。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(g1[4], color=style.GAMMA, scale_factor=1.4), Indicate(g1[7], color=style.GAMMA, scale_factor=1.4))
        self.play(FadeOut(VGroup(f1, f2, axis, ticks, ylab, bars, ref, ref_lab)), g1.animate.move_to(UP * 1.8), run_time=0.9)


# ---------------------------------------------------------------------------
# 10c. リターンの再帰構造
# ---------------------------------------------------------------------------
class Recursion(VoiceScene):
    def construct(self):
        g1 = return_tex(True).move_to(UP * 1.8)
        self.add(g1)

        # 再帰構造
        g2 = mt("G_t", "=", "r_{t+1}", "+", r"\gamma", "(", "r_{t+2}", "+", r"\gamma", "r_{t+3}", "+", r"\cdots", ")", size=56)
        for i in (2, 6, 9):
            g2[i].set_color(style.REWARD)
        g2[4].set_color(style.GAMMA)
        g2[8].set_color(style.GAMMA)
        g2.move_to(UP * 0.1)
        with self.voice("もう一つ、リターンの式には、面白い性質が隠れています。{A}2項目から先を、ガンマでくくってみてください。") as v:
            self.wait_to(v, "A")
            self.play(TransformMatchingTex(g1.copy(), g2), run_time=1.6)

        br = Brace(g2[6:12], DOWN, color=GREY_B)
        brl = mt("G_{t+1}", size=48).next_to(br, DOWN, buff=0.15)
        g3 = mt("G_t", "=", "r_{t+1}", "+", r"\gamma", "G_{t+1}", size=68)
        g3[2].set_color(style.REWARD)
        g3[4].set_color(style.GAMMA)
        g3.move_to(DOWN * 2.6)
        box = SurroundingRectangle(g3, color=style.REWARD, buff=0.25, corner_radius=0.1)
        with self.voice("{A}括弧の中身は、ちょうど、一つ先の時刻からのリターンになっています。"
                        "つまり、{B}今のリターンは、次の報酬と、次の時刻からのリターンのガンマ倍を、足したもの。") as v:
            self.wait_to(v, "A")
            self.play(GrowFromCenter(br), FadeIn(brl, shift=0.1 * DOWN))
            self.wait_to(v, "B")
            self.play(Write(g3), run_time=1.2)
            self.play(Create(box))
        with self.voice("この何気ない関係式が、次回の主役、ベルマン方程式の出発点になります。覚えておいてください。") as v:
            self.play(FadeOut(VGroup(g1, g2, br, brl)), VGroup(g3, box).animate.move_to(ORIGIN).scale(1.1), run_time=1.2)

        tup4 = mt(r"(\mathcal{S},\ \mathcal{A},\ P,\ R)", size=52)
        tup5 = mt(r"(\mathcal{S},\ \mathcal{A},\ P,\ R,\ ", r"\gamma", ")", size=52)
        tup5[1].set_color(style.GAMMA)
        lab = jt("MDP", size=38, color=GREY_B)
        grp4 = VGroup(lab, tup4).arrange(RIGHT, buff=0.4).move_to(DOWN * 2.5)
        with self.voice("ちなみに、先ほどのMDPの組に、この割引率ガンマを{A}加えて、5つ組で書くことも多いです。") as v:
            self.play(VGroup(g3, box).animate.shift(0.8 * UP), FadeIn(grp4))
            self.wait_to(v, "A")
            tup5.move_to(tup4).align_to(tup4, LEFT)
            self.play(TransformMatchingTex(tup4, tup5))
        self.play(FadeOut(VGroup(g3, box, lab, tup5)), run_time=0.8)


# ---------------------------------------------------------------------------
# 11. 目的関数と「微分できない壁」
# ---------------------------------------------------------------------------
class Objective(VoiceScene):
    def construct(self):
        # やや不確かな方策（最適方策に ε=0.35 の揺らぎ）で6回走らせる
        eps = 0.35
        noisy = {s: {a: (1 - eps) * (a == PI_STAR[s]) + eps / 4 for a in ACTIONS} for s in PI_STAR}
        runs, seed = [], 0
        want = ["goal", "goal", "pit", "goal", "goal", "goal"]
        for kind in want:
            while True:
                t = WORLD.rollout(noisy, np.random.default_rng(seed), max_steps=30)
                seed += 1
                end = t[-1][3]
                if len(t) <= 14 and ((kind == "goal" and end == GOAL) or (kind == "pit" and end == PIT)):
                    runs.append(t)
                    break
        grids = VGroup(*[GridView(WORLD, cell=0.56, show_terminal_labels=False) for _ in range(6)])
        grids.arrange_in_grid(2, 3, buff=(0.9, 0.95)).move_to(UP * 0.85)
        robots = [Robot(height=0.32).move_to(gr.center_of(WORLD.start)) for gr in grids]
        with self.voice("さて、同じ方策でロボットを走らせても、毎回同じ結果になるとは限りません。"
                        "床が滑りますし、方策そのものが確率的なこともあるからです。") as v:
            self.play(LaggedStart(*[FadeIn(gr) for gr in grids], lag_ratio=0.1), *[FadeIn(r) for r in robots],
                      run_time=1.5)

        gamma = WORLD.gamma
        rets = []
        labels = VGroup()
        trails = VGroup()
        with self.voice("{A}同じ方策で、6回、走らせてみました。すんなり着く回もあれば、{B}滑って、穴に落ちてしまう回もあります。") as v:
            self.wait_to(v, "A")
            T = max(len(t) for t in runs)
            per = min(0.35, (v.until("B") + 2.0) / T)
            for step in range(T):
                anims = []
                for r, gr, t in zip(robots, grids, runs):
                    if step < len(t):
                        s, a, rw, n = t[step]
                        if n != s:
                            seg = Line(gr.center_of(s), gr.center_of(n), stroke_color=GREY_B, stroke_width=3)
                            trails.add(seg)
                            self.add(seg, r)
                        if n in WORLD.terminals:
                            anims.append(r.animate.move_to(gr.center_of(n)).scale(0.6).set_opacity(0.0))
                        else:
                            anims.append(r.animate.move_to(gr.center_of(n)))
                self.play(*anims, run_time=per)
            for gr, t in zip(grids, runs):
                G = sum(gamma ** k * x[2] for k, x in enumerate(t))
                rets.append(G)
                col = style.REWARD if G > 0 else RED
                labels.add(mt(f"G={G:.2f}", size=36, color=col).next_to(gr, DOWN, buff=0.18))
            self.play(LaggedStart(*[FadeIn(l, shift=0.1 * UP) for l in labels], lag_ratio=0.15), run_time=1.2)
            self.play(Indicate(labels[want.index("pit")], color=RED, scale_factor=1.2))

        J = mt("J(", r"\pi", ")", "=", r"\mathbb{E}_{\tau \sim \pi}", r"\left[", "G_0", r"\right]", size=60)
        J_lab = jt("期待リターン", size=34, color=GREY_B)
        avg = mt(r"\approx", f"{np.mean(rets):.2f}", size=52, color=GREY_A)
        VGroup(J_lab, J, avg).arrange(RIGHT, buff=0.35).move_to(DOWN * 3.3)
        with self.voice("だから、方策の良さは、{A}リターンの期待値で測ります。方策パイに従って動いたときに、平均して、どれだけのリターンが得られるか。") as v:
            self.wait_to(v, "A")
            self.play(Write(J), FadeIn(J_lab), run_time=1.3)
            self.play(FadeIn(avg))

        goal = mt(r"\pi^* = \arg\max_{\pi} J(\pi)", size=64)
        with self.voice("強化学習の目標を一言で言えば、{A}この[J|ジェー]を最大にする方策を見つけること、です。") as v:
            self.play(FadeOut(VGroup(grids, labels, trails, *robots, avg)),
                      VGroup(J_lab, J).animate.move_to(UP * 0.8), run_time=1.0)
            self.wait_to(v, "A")
            goal.next_to(J, DOWN, buff=0.8)
            self.play(Write(goal))
        self.play(FadeOut(VGroup(J, J_lab, goal)), run_time=0.7)

        # 計算グラフ
        def node(tex, color=WHITE, w=1.2):
            m = mt(tex, size=52, color=color)
            box = RoundedRectangle(width=max(w, m.width + 0.45), height=1.1, corner_radius=0.16,
                                   stroke_color=GREY_B, stroke_width=2.5)
            return VGroup(box, m.move_to(box))

        n_theta = node(r"\theta", style.THETA)
        n_pi = node(r"\pi_\theta", style.POLICY)
        n_a = node("a", style.ACTION, w=1.05)
        env = RoundedRectangle(width=2.5, height=1.7, corner_radius=0.2, stroke_color=GREY_B, stroke_width=2.5,
                               fill_color="#1c1c22", fill_opacity=1)
        env_t = jt("環境", size=38, color=WHITE).move_to(env)
        n_env = VGroup(env, env_t)
        n_r = node("r", style.REWARD, w=1.05)
        n_J = node("J", WHITE, w=1.05)
        chain = VGroup(n_theta, n_pi, n_a, n_env, n_r, n_J).arrange(RIGHT, buff=0.6).move_to(DOWN * 0.9)
        fwd = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.08, color=GREY_B, stroke_width=4)
                       for a, b in zip(chain[:-1], chain[1:])])
        nn_lab = jt("ニューラルネット", size=30, color=GREY_C).next_to(VGroup(n_theta, n_pi), UP, buff=0.3)

        with self.voice("機械学習エンジニアなら、ここで自然に、こう考えるはずです。"
                        "{A}方策をニューラルネットで表して、[J|ジェー]を勾配法で最大化すればいい、と。") as v:
            self.play(LaggedStart(*[FadeIn(m) for m in [n_theta, fwd[0], n_pi, fwd[1], n_a]], lag_ratio=0.25),
                      FadeIn(nn_lab), run_time=1.5)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(m) for m in [fwd[2], n_env, fwd[3], n_r, fwd[4], n_J]], lag_ratio=0.2),
                      run_time=1.5)

        with self.voice("ところが、ここに大きな壁があります。{A}パラメータから報酬にたどり着くまでの途中に、{B}環境が挟まっているんです。") as v:
            self.wait_to(v, "A")
            self.play(Indicate(n_theta, color=style.THETA), Indicate(n_r, color=style.REWARD), run_time=1.0)
            self.wait_to(v, "B")
            self.play(n_env[0].animate.set_stroke(RED, 4), Indicate(n_env, color=RED, scale_factor=1.1))

        dice = VGroup(*[Square(0.42, stroke_color=GREY_A, stroke_width=2, fill_color="#26262c", fill_opacity=1)
                        for _ in range(2)]).arrange(RIGHT, buff=0.18).move_to(n_env).shift(0.35 * DOWN)
        pips = VGroup(*[Dot(radius=0.045, color=WHITE).move_to(d) for d in dice])
        with self.voice("環境の中身、つまり遷移確率や報酬の仕組みは、ふつう分かりません。"
                        "仮に分かったとしても、{A}サイコロを振った結果を、パラメータで微分することは、できません。") as v:
            self.play(env_t.animate.shift(0.4 * UP), run_time=0.5)
            self.wait_to(v, "A")
            self.play(FadeIn(dice), FadeIn(pips))
            self.play(Rotate(dice[0], PI / 2), Rotate(dice[1], -PI / 2), run_time=0.6)

        # 教師あり学習との対比（上段）
        s_theta = node(r"\theta", style.THETA)
        s_f = node(r"f_\theta")
        s_y = node(r"\hat{y}", w=1.05)
        s_L = node(r"\mathcal{L}", RED, w=1.05)
        sl = VGroup(s_theta, s_f, s_y, s_L).arrange(RIGHT, buff=0.6).move_to(UP * 2.3).align_to(chain, LEFT)
        sl_f = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.08, color=GREY_B, stroke_width=4)
                        for a, b in zip(sl[:-1], sl[1:])])
        sl_b = VGroup(*[Arrow(b.get_left() + 0.75 * DOWN, a.get_right() + 0.75 * DOWN, buff=0.08, color=RED,
                              stroke_width=5) for a, b in zip(sl[:-1], sl[1:])])
        sl_tag = jt("教師あり学習", size=30, color=GREY_B).next_to(sl, RIGHT, buff=0.5)
        back = VGroup(*[Arrow(b.get_left() + 0.8 * DOWN, a.get_right() + 0.8 * DOWN, buff=0.08, color=RED,
                              stroke_width=5) for a, b in zip(chain[:-1], chain[1:])])
        cross = VGroup(Line(UL, DR), Line(UR, DL)).set_stroke(RED, 8).scale(0.32).move_to(back[2])
        with self.voice("教師あり学習では、損失からパラメータまで、{A}勾配が一直線に流れていました。"
                        "強化学習では、その道が、{B}途中で、途切れているんです。") as v:
            self.play(FadeOut(nn_lab), FadeIn(sl), FadeIn(sl_f), FadeIn(sl_tag), run_time=0.8)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[GrowArrow(a) for a in reversed(sl_b)], lag_ratio=0.4), run_time=1.2)
            self.play(GrowArrow(back[4]), run_time=0.4)
            self.play(GrowArrow(back[3]), run_time=0.4)
            self.wait_to(v, "B")
            self.play(GrowArrow(back[2]), run_time=0.4)
            self.play(Create(cross), back[2].animate.set_opacity(0.3), run_time=0.6)
            self.play(Wiggle(n_env), run_time=0.8)

        self.say("これこそが、強化学習を、独特で、そして面白い分野にしている理由です。")
        self.play(FadeOut(VGroup(chain, fwd, back, cross, dice, pips, sl, sl_f, sl_b, sl_tag)), run_time=0.8)


# ---------------------------------------------------------------------------
# 11b. 報酬は人間が決める：ボートレースの例
# ---------------------------------------------------------------------------
class RewardHacking(VoiceScene):
    def construct(self):
        water = "#1B2A38"
        c0 = LEFT * 1.3 + DOWN * 0.35
        outer = RoundedRectangle(width=8.0, height=4.4, corner_radius=2.1, stroke_color=GREY_C,
                                 stroke_width=3, fill_color=water, fill_opacity=1).move_to(c0)
        inner = RoundedRectangle(width=4.8, height=1.3, corner_radius=0.65, stroke_color=GREY_C,
                                 stroke_width=3, fill_color=style.BG, fill_opacity=1).move_to(c0)
        mid = RoundedRectangle(width=6.4, height=2.85, corner_radius=1.4).move_to(c0)
        lag_c = RIGHT * 4.7 + DOWN * 1.45
        lagoon = Circle(radius=1.15, stroke_color=GREY_C, stroke_width=3, fill_color=water,
                        fill_opacity=1).move_to(lag_c)
        channel = Rectangle(width=1.6, height=0.9, stroke_width=0, fill_color=water,
                            fill_opacity=1).move_to(RIGHT * 3.05 + DOWN * 1.45)
        # チェッカーのゴールライン（上の直線部分）
        sq = 0.16
        flag = VGroup(*[Square(sq, stroke_width=0, fill_color=WHITE if (i + j) % 2 else "#111111", fill_opacity=1)
                        for i in range(2) for j in range(9)])
        flag.arrange_in_grid(9, 2, buff=0).move_to(c0 + UP * 1.47 + LEFT * 0.2)
        finish = jt("ゴール", size=28, color=GREY_A).next_to(outer, UP, buff=0.12).align_to(flag, LEFT).shift(0.5 * LEFT)
        course = VGroup(outer, channel, lagoon, inner, flag, finish)

        def coin(p):
            return VGroup(Circle(radius=0.14, stroke_color=style.REWARD, stroke_width=3, fill_color=style.REWARD,
                                 fill_opacity=0.35), Dot(radius=0.05, color=style.REWARD)).move_to(p)
        track_coins = VGroup(*[coin(mid.point_from_proportion(t)) for t in (0.08, 0.3, 0.55, 0.8)])
        lag_r = 0.6
        lag_angles = [PI / 2, PI / 2 + 2 * PI / 3, PI / 2 + 4 * PI / 3]
        lag_coins = VGroup(*[coin(lag_c + lag_r * np.array([np.cos(a), np.sin(a), 0])) for a in lag_angles])

        score_lab = jt("点数", size=32, color=GREY_B)
        score = Integer(0, font_size=48, color=style.REWARD)
        hud = VGroup(score_lab, score).arrange(RIGHT, buff=0.25).to_corner(UR, buff=0.5)
        watcher = Robot(height=0.8).to_corner(DL, buff=0.5)

        with self.voice("ところで、この報酬は、誰が決めるのでしょうか。{A}人間です。") as v:
            self.play(FadeIn(watcher, shift=0.2 * UP), run_time=0.6)
            self.play(watcher.animate.look(UR), run_time=0.4)
            self.wait_to(v, "A")
            self.play(watcher.blink())
        with self.voice("そして強化学習は、報酬の合計を大きくすることに、{A}恐ろしいほど忠実です。"
                        "たとえそれが、人間の意図と、違っていても。") as v:
            self.play(FadeIn(course, lag_ratio=0.05), run_time=1.6)
            self.wait_to(v, "A")
            self.play(watcher.change("worried"))

        boat = glow_dot(mid.point_from_proportion(0.0), color=ORANGE, radius=0.13, spread=2.6)
        with self.voice("2016年に報告された、有名な例があります。ボートレースのゲームで、{A}コース上の目標物に当たると、点数がもらえる、"
                        "という報酬で学習させたところ、エージェントは、{B}レースを完走するのを、やめてしまいました。") as v:
            self.play(FadeIn(boat, scale=0.5), FadeIn(hud), run_time=0.6)
            self.wait_to(v, "A")
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(c, scale=0.4) for c in track_coins], lag_ratio=0.2),
                      LaggedStart(*[FadeIn(c, scale=0.4) for c in lag_coins], lag_ratio=0.2), run_time=1.2)
            intended = DashedVMobject(mid.copy().set_stroke(GREY_B, 2.5), num_dashes=60)
            itext = jt("意図していた動き：コースを回ってゴール", size=26, color=GREY_B).next_to(outer, DOWN, buff=0.2)
            self.play(Create(intended), FadeIn(itext), run_time=1.5)
            self.wait_to(v, "B")
            self.play(watcher.change("surprised"), FadeOut(intended), FadeOut(itext))

        # 学習したエージェントの動き：入り江に入って回り続ける
        to_lagoon = VMobject().set_points_smoothly([
            boat.get_center(), c0 + DOWN * 1.42 + RIGHT * 1.8, RIGHT * 3.0 + DOWN * 1.45, lag_c + LEFT * lag_r])
        circle_path = Arc(radius=lag_r, start_angle=PI, angle=-2 * PI, arc_center=lag_c)
        trail = TracedPath(boat.get_center, stroke_color=ORANGE, stroke_width=3, dissipating_time=0.8)
        self.add(trail)
        with self.voice("代わりに見つけたのは、{A}入り江の中を、ぐるぐると回り続けて、何度も復活する目標物に、当たり続ける方法です。"
                        "{B}点数は、人間のプレイヤーよりも、高くなったそうです。") as v:
            self.play(MoveAlongPath(boat, to_lagoon), run_time=1.6, rate_func=smooth)
            self.wait_to(v, "A")
            total = 0
            laps = 4
            for lap in range(laps):
                # 1周のあいだに3つの目標物に当たる
                seg_t = 0.9
                for j, ang in enumerate([PI * 5 / 6, PI / 6, -PI / 2]):
                    part = Arc(radius=lag_r, start_angle=PI - j * 2 * PI / 3, angle=-2 * PI / 3, arc_center=lag_c)
                    hit = lag_coins[(j + 1) % 3]
                    total += 100
                    self.play(MoveAlongPath(boat, part), run_time=seg_t, rate_func=linear)
                    self.sfx("pop")
                    self.play(hit.animate.scale(0.01).set_opacity(0), score.animate.set_value(total), run_time=0.15)
                    hit.scale(100).set_opacity(1)
                    self.add(hit)
            self.wait_to(v, "B")
            self.sfx("hit")
            self.play(Indicate(hud, color=style.REWARD, scale_factor=1.2))
            no_finish = VGroup(jt("完走", size=30, color=GREY_B), Cross(stroke_color=RED, stroke_width=5).scale(0.18)).arrange(RIGHT, buff=0.2)
            no_finish.next_to(hud, DOWN, buff=0.3).align_to(hud, RIGHT)
            self.play(FadeIn(no_finish), watcher.change("sad"))

        with self.voice("報酬は、エージェントに、何をしてほしいかを伝える、ほとんど唯一の言葉です。"
                        "{A}言葉の選び方を間違えると、望んだものとは違うものを、全力で最適化してしまう。"
                        "{B}この問題は、最終章で、言語モデルの訓練の中に、もう一度登場します。") as v:
            trail.clear_updaters()
            self.play(FadeOut(trail), run_time=0.3)
            self.wait_to(v, "A")
            self.play(Indicate(lag_coins, color=style.REWARD), watcher.animate.look(RIGHT), run_time=1.2)
            self.wait_to(v, "B")
            self.play(watcher.change("determined"))
        self.play(FadeOut(VGroup(course, track_coins, lag_coins, boat, hud, no_finish, watcher)), run_time=0.9)


# ---------------------------------------------------------------------------
# 12. ロードマップ
# ---------------------------------------------------------------------------
class Roadmap(VoiceScene):
    def construct(self):
        top = mt(r"\max_\pi J(\pi)", size=60).move_to(UP * 3.0)
        with self.voice("では、どうすればいいのか。大きく分けて、二つの道があります。") as v:
            self.play(Write(top), run_time=1.0)

        xl, xr = -3.6, 3.6
        lv = jt("価値ベース", size=42, color=style.VALUE, weight="MEDIUM").move_to(RIGHT * xl + UP * 1.6)
        lp = jt("方策ベース", size=42, color=style.POLICY, weight="MEDIUM").move_to(RIGHT * xr + UP * 1.6)
        e1 = Line(top.get_bottom() + 0.1 * DOWN, lv.get_top() + 0.15 * UP, stroke_color=GREY_C, stroke_width=2.5)
        e2 = Line(top.get_bottom() + 0.1 * DOWN, lp.get_top() + 0.15 * UP, stroke_color=GREY_C, stroke_width=2.5)

        def chapter_list(items, color, x):
            rows = VGroup()
            for n, t in items:
                rows.add(VGroup(jt(f"第{n}章", size=28, color=color), jt(t, size=30, color=GREY_A)).arrange(RIGHT, buff=0.3))
            rows.arrange(DOWN, aligned_edge=LEFT, buff=0.32)
            rows.set_width(min(rows.width, 6.4))
            return rows.move_to(RIGHT * x + DOWN * 0.3)

        cv = chapter_list([(2, "価値とベルマン方程式"), (3, "TD学習とQ学習"), (4, "DQN：価値をニューラルネットで")],
                          style.VALUE, xl)
        cp = chapter_list([(5, "方策勾配法とActor-Critic"), (6, "PPOと言語モデルの強化学習")],
                          style.POLICY, xr)

        heat = GridView(WORLD, cell=0.62, show_terminal_labels=False).move_to(RIGHT * xl + DOWN * 0.6)
        for s in heat.nonterminal_states():
            heat.cells[s].set_fill(value_color(V_STAR[s]), 1)
        arrows = heat.policy_arrows(PI_STAR, color=WHITE, length=0.5, stroke_width=3)
        with self.voice("一つ目は、{A}それぞれの状態や行動が、どれくらい良いのかを、まず見積もる方法です。"
                        "この見積もりを、{B}価値と呼びます。価値さえ分かれば、あとは、一番価値の高い行動を選べばいい。") as v:
            self.wait_to(v, "A")
            self.play(Create(e1), FadeIn(lv, shift=0.1 * DOWN))
            self.wait_to(v, "B")
            self.play(FadeIn(heat), run_time=1.0)
            self.play(LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.05), run_time=1.2)

        # 迂回のイメージ：θ → [環境] → J を上から回り込む矢印
        def small(tex, color):
            m = mt(tex, size=40, color=color)
            b = RoundedRectangle(width=0.95, height=0.85, corner_radius=0.12, stroke_color=GREY_B, stroke_width=2)
            return VGroup(b, m.move_to(b))
        th = small(r"\theta", style.THETA)
        ev = VGroup(RoundedRectangle(width=1.6, height=1.0, corner_radius=0.15, stroke_color=RED, stroke_width=2.5),
                    jt("環境", size=28, color=WHITE))
        ev[1].move_to(ev[0])
        jj = small("J", WHITE)
        mini = VGroup(th, ev, jj).arrange(RIGHT, buff=0.7).move_to(RIGHT * xr + DOWN * 1.0)
        f1 = Arrow(th.get_right(), ev.get_left(), buff=0.08, color=GREY_B, stroke_width=3)
        f2 = Arrow(ev.get_right(), jj.get_left(), buff=0.08, color=GREY_B, stroke_width=3)
        detour = CurvedArrow(jj.get_top() + 0.1 * UP, th.get_top() + 0.1 * UP, angle=1.2, color=style.POLICY,
                             stroke_width=5)
        with self.voice("二つ目は、{A}途切れた勾配の道を、ある数学的なトリックで迂回して、方策そのものを、直接改善していく方法です。") as v:
            self.wait_to(v, "A")
            self.play(Create(e2), FadeIn(lp, shift=0.1 * DOWN))
            self.play(FadeIn(mini), GrowArrow(f1), GrowArrow(f2), run_time=0.8)
            self.play(Create(detour), run_time=1.2)

        merge = jt("大規模言語モデルの強化学習", size=38, color=WHITE).move_to(DOWN * 3.1)
        m1 = Line(cv.get_bottom() + 0.15 * DOWN, merge.get_top() + 0.15 * UP + 1.2 * LEFT, stroke_color=GREY_C, stroke_width=2.5)
        m2 = Line(cp.get_bottom() + 0.15 * DOWN, merge.get_top() + 0.15 * UP + 1.2 * RIGHT, stroke_color=GREY_C, stroke_width=2.5)
        with self.voice("この後、{A}次の三つの章で一つ目の道を、{B}その後の二つの章で、二つ目の道を歩きます。"
                        "最後には、この二つが合流して、大規模言語モデルの学習へと、つながっていきます。") as v:
            self.play(FadeOut(VGroup(heat, arrows, mini, f1, f2, detour)), run_time=0.6)
            self.wait_to(v, "A")
            self.play(LaggedStart(*[FadeIn(r, shift=0.1 * RIGHT) for r in cv], lag_ratio=0.3), run_time=1.5)
            self.wait_to(v, "B")
            self.play(LaggedStart(*[FadeIn(r, shift=0.1 * RIGHT) for r in cp], lag_ratio=0.3), run_time=1.2)
            self.play(Create(m1), Create(m2), FadeIn(merge, shift=0.1 * UP), run_time=1.2)
        self.play(FadeOut(VGroup(top, lv, lp, e1, e2, cv, cp, merge, m1, m2)), run_time=0.9)


# ---------------------------------------------------------------------------
# 13. 次回予告
# ---------------------------------------------------------------------------
class Outro3D(VoiceScene3D):
    """価値を「高さ」にした地形。第2章の予告。"""

    def construct(self):
        self.set_camera_orientation(phi=0, theta=-90 * DEGREES, zoom=1.0)
        cell = 1.25
        W, H = WORLD.width, WORLD.height
        origin = np.array([-(W - 1) * cell / 2, -(H - 1) * cell / 2, 0])

        def pos(s):
            return origin + np.array([s[0] * cell, s[1] * cell, 0])

        tiles, tops = VGroup(), {}
        heights = {}
        for s in WORLD.states:
            if s in WORLD.terminals:
                continue
            v = V_STAR[s]
            h = 0.25 + 3.0 * v
            heights[s] = h
            p = Prism(dimensions=[cell * 0.94, cell * 0.94, 0.04])
            p.set_fill(value_color(v), 1).set_stroke(GREY_E, 0.6)
            p.move_to(pos(s) + 0.02 * OUT)
            tiles.add(p)
            tops[s] = p
        walls = VGroup(*[Prism(dimensions=[cell * 0.94, cell * 0.94, 0.3]).set_fill("#3A3A40", 1).set_stroke(GREY_E, 0.6)
                         .move_to(pos(s) + 0.15 * OUT) for s in WORLD.walls])
        goal = Sphere(radius=0.28, resolution=(12, 24)).set_color(style.REWARD).move_to(pos(GOAL) + 0.3 * OUT)
        pit = Circle(radius=0.42, stroke_color=RED, stroke_width=4, fill_color="#050506", fill_opacity=1).move_to(pos(PIT))
        board = VGroup(*[Square(cell, stroke_color=GREY_D, stroke_width=1.5).move_to(pos((x, y)))
                         for x in range(W) for y in range(H)])

        with self.voice("次回のテーマは、価値です。") as v:
            self.play(FadeIn(board), FadeIn(tiles), FadeIn(walls), FadeIn(goal), FadeIn(pit), run_time=1.2)

        title = jt("価値　＝　高さ", size=40, color=WHITE).to_corner(UL, buff=0.5)
        with self.voice("もしロボットが、すべてのマスの良さを、{A}こんなふうに、高さとして知っていたら、どう動けばいいかは、一目瞭然ですよね。"
                        "{B}ほとんどの場所では、ただ、坂を登っていけばいい。") as v:
            self.wait_to(v, "A")
            self.sfx("whoosh")
            self.move_camera(phi=62 * DEGREES, theta=-62 * DEGREES, zoom=0.95, run_time=2.0,
                             added_anims=[p.animate.stretch_to_fit_depth(heights[s]).move_to(pos(s) + heights[s] / 2 * OUT)
                                          for s, p in tops.items()])
            self.add_fixed_in_frame_mobjects(title)
            self.play(FadeIn(title), run_time=0.6)
            self.wait_to(v, "B")
            route = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3)]
            ball = Sphere(radius=0.16, resolution=(10, 20)).set_color(BLUE_C)
            ball.move_to(pos(route[0]) + (heights[route[0]] + 0.16) * OUT)
            self.play(FadeIn(ball), run_time=0.4)
            for s in route[1:]:
                self.play(ball.animate.move_to(pos(s) + (heights[s] + 0.16) * OUT), run_time=0.45)
            self.sfx("chime")
            self.play(ball.animate.move_to(pos(GOAL) + 0.45 * OUT), run_time=0.5)
            self.begin_ambient_camera_rotation(rate=0.08)

        rec = mt("G_t", "=", "r_{t+1}", "+", r"\gamma", "G_{t+1}", size=56)
        rec[2].set_color(style.REWARD)
        rec[4].set_color(style.GAMMA)
        rec.to_corner(UR, buff=0.5)
        with self.voice("では、この地形は、どうすれば求められるのでしょうか。その鍵を握るのが、{A}さっき見た、リターンの再帰的な関係です。") as v:
            self.wait_to(v, "A")
            self.add_fixed_in_frame_mobjects(rec)
            self.play(Write(rec), run_time=1.2)
        self.stop_ambient_camera_rotation()
        self.play(FadeOut(VGroup(board, tiles, walls, goal, pit, ball)), FadeOut(title), FadeOut(rec), run_time=1.0)


class End(VoiceScene):
    def construct(self):
        play_end_card(self, next_title="第2章　価値という考え方")
