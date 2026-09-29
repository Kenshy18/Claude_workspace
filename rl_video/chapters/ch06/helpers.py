"""第6章だけで使う部品と、画面に出す数値の計算。

数値はすべてここで実際に計算する（乱数はシード固定）。
"""
from __future__ import annotations

import numpy as np
from manim import *

from common import config as rconf
from common import style
from common.rl import ACTIONS, main_world
from common.style import jt, mt
from common.titles import SERIES_TITLE

WORLD = main_world()
V_STAR = WORLD.value_iteration()[-1]
PI_STAR = WORLD.greedy(V_STAR)
GOAL, PIT = (4, 3), (4, 2)

POS = GREEN          # アドバンテージ > 0
NEG = RED            # アドバンテージ < 0
KL = MAROON_B        # KL ペナルティ
CHIP_FILL = "#16161A"
PANEL_FILL = "#131317"
USER_FILL = "#23324A"
BOT_FILL = "#1C1C22"


# ---------------------------------------------------------------------------
# タイトル（章題が長いので幅に収める。中身は common.titles.play_title_card と同じ）
# ---------------------------------------------------------------------------
def play_title_card_fit(scene, number: int, title: str, subtitle: str | None = None,
                        hold: float = 2.6, max_width: float = 12.4):
    series = jt(f"{SERIES_TITLE}　第{number}章", size=34, color=GREY_B)
    main = jt(title, size=76, color=WHITE, weight="MEDIUM")
    if main.width > max_width:
        main.scale_to_fit_width(max_width)
    group = VGroup(series, main).arrange(DOWN, buff=0.45)
    line = Line(LEFT, RIGHT, stroke_color=GREY_D, stroke_width=2)
    line.set_width(min(main.width + 1.2, 13.4)).next_to(main, DOWN, buff=0.35)
    items = [series, main, line]
    if subtitle:
        items.append(jt(subtitle, size=28, color=GREY_C).next_to(line, DOWN, buff=0.35))
    VGroup(*items).move_to(0.2 * UP)
    scene.play(FadeIn(series, shift=0.15 * DOWN), run_time=0.8)
    scene.play(Write(main), Create(line), run_time=1.6)
    if subtitle:
        scene.play(FadeIn(items[-1]), run_time=0.6)
    scene.wait(hold)
    scene.play(*[FadeOut(m) for m in items], run_time=0.9)


def play_end_card_plain(scene, hold: float = 3.0):
    """次回予告なしのクレジット（common.titles.play_end_card と同じ見た目）。"""
    from common.titles import play_end_card
    play_end_card(scene, next_title=None, hold=hold)


# ---------------------------------------------------------------------------
# 小道具
# ---------------------------------------------------------------------------
def token_chip(t, size=40, color=WHITE, stroke=GREY_C, fill=CHIP_FILL, pad=0.4):
    txt = jt(t, size=size, color=color)
    box = RoundedRectangle(width=txt.width + pad, height=0.85 * size / 40, corner_radius=0.12,
                           stroke_color=stroke, stroke_width=1.5, fill_color=fill, fill_opacity=1)
    return VGroup(box, txt.move_to(box))


def math_chip(tex, size=48, color=WHITE):
    m = mt(tex, size=size, color=color)
    box = SurroundingRectangle(m, buff=0.12, corner_radius=0.08, stroke_width=2, color=color)
    return VGroup(m, box)


def section_tag(text):
    return jt(text, size=30, color=GREY_B).to_corner(UL, buff=0.45)


def person_icon(height=0.9, color=GREY_B):
    h = height
    head = Circle(radius=0.2 * h, fill_color=color, fill_opacity=1, stroke_width=0)
    body = RoundedRectangle(width=0.72 * h, height=0.46 * h, corner_radius=0.22 * h,
                            fill_color=color, fill_opacity=1, stroke_width=0)
    head.move_to(UP * 0.27 * h)
    body.move_to(DOWN * 0.24 * h)
    # 下端をまっすぐに切る
    cut = Rectangle(width=0.8 * h, height=0.12 * h, fill_color=style.BG, fill_opacity=1,
                    stroke_width=0).move_to(body.get_bottom() + 0.05 * h * UP)
    return VGroup(body, cut, head)


def check_mark(size=0.5, color=GREEN, width=8):
    m = VMobject(stroke_color=color, stroke_width=width)
    m.set_points_as_corners([LEFT * 0.5 + UP * 0.02, DOWN * 0.38 + LEFT * 0.12, UP * 0.5 + RIGHT * 0.5])
    m.scale(size)
    m.joint_type = LineJointType.ROUND
    return m


def cross_mark(size=0.45, color=RED, width=8):
    return VGroup(Line(UL, DR), Line(UR, DL)).set_stroke(color, width).scale(size / 2)


def bubble(text, size=32, fill=BOT_FILL, stroke=GREY_D, text_color=WHITE, pad=(0.5, 0.35),
           tail=None, min_width=0.0, line_spacing=0.9):
    """角丸の吹き出し（自作の汎用UI）。tail='left'/'right' で小さな尾をつける。"""
    txt = jt(text, size=size, color=text_color, line_spacing=line_spacing)
    w = max(txt.width + 2 * pad[0], min_width)
    box = RoundedRectangle(width=w, height=txt.height + 2 * pad[1], corner_radius=0.22,
                           fill_color=fill, fill_opacity=1, stroke_color=stroke, stroke_width=1.5)
    txt.move_to(box)
    parts = [box]
    if tail in ("left", "right"):
        s = -1 if tail == "left" else 1
        c = box.get_corner(DL if tail == "left" else DR) + UP * 0.28 + RIGHT * (-s * 0.1)
        tri = Polygon(c + UP * 0.1, c + DOWN * 0.14, c + RIGHT * s * 0.3 + DOWN * 0.22,
                      fill_color=fill, fill_opacity=1, stroke_width=0)
        parts.insert(0, tri)
    g = VGroup(*parts, txt)
    g.box, g.text = box, txt
    return g


def node_box(label, color=GREY_B, size=32, w=None, h=0.9, fill=PANEL_FILL, stroke_width=2.5,
             text_color=None):
    txt = jt(label, size=size, color=text_color or WHITE) if isinstance(label, str) else label
    width = w if w is not None else txt.width + 0.6
    box = RoundedRectangle(width=width, height=h, corner_radius=0.16, stroke_color=color,
                           stroke_width=stroke_width, fill_color=fill, fill_opacity=1)
    g = VGroup(box, txt.move_to(box))
    g.box, g.label = box, txt
    return g


def doc_stack(n=4, w=0.7, h=0.9, color=GREY_B):
    """文書の束（事前学習の「大量の文章」）。"""
    docs = VGroup()
    for i in range(n):
        d = VGroup(RoundedRectangle(width=w, height=h, corner_radius=0.06, stroke_color=color,
                                    stroke_width=1.5, fill_color=PANEL_FILL, fill_opacity=1))
        for k in range(4):
            ln = Line(LEFT * w * 0.3, RIGHT * w * (0.3 if k < 3 else 0.05), stroke_color=GREY_D,
                      stroke_width=2).shift(UP * (h * 0.28 - k * h * 0.17))
            d.add(ln)
        d.shift(RIGHT * 0.12 * i + UP * 0.1 * i)
        docs.add(d)
    return docs


def mini_net(layers=(3, 4, 3), width=1.4, height=1.0, color=GREY_B, r=0.07):
    cols = VGroup()
    for k, n in enumerate(layers):
        col = VGroup(*[Circle(r, stroke_color=color, stroke_width=1.5, fill_color=BLACK, fill_opacity=1)
                       for _ in range(n)])
        col.arrange(DOWN, buff=(height - n * 2 * r) / max(n - 1, 1))
        col.move_to(RIGHT * (k - (len(layers) - 1) / 2) * width / (len(layers) - 1))
        cols.add(col)
    edges = VGroup()
    for a, b in zip(cols[:-1], cols[1:]):
        for c1 in a:
            for c2 in b:
                edges.add(Line(c1.get_center(), c2.get_center(), stroke_width=0.7, stroke_color=GREY_D))
    return VGroup(edges, cols)


def loop_arrow(radius=0.45, color=GREY_B, width=4):
    arc = Arc(radius=radius, start_angle=PI * 0.6, angle=-PI * 1.7, stroke_color=color, stroke_width=width)
    arc.add_tip(tip_length=0.18, tip_width=0.18)
    arc.get_tip().set_color(color)
    return arc


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


# ---------------------------------------------------------------------------
# StepSize: 大きすぎる1回の更新で方策が壊れる（表形式ソフトマックス方策の REINFORCE）
# ---------------------------------------------------------------------------
def _softmax(z):
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def reinforce_crash(seed=24, lr=3.0, big_lr=300.0, big_at=28, updates=50, batch=16, max_steps=40):
    """いつもの世界で REINFORCE（バッチ平均をベースライン）を回す。

    big_at 回目の更新だけ、学習率を big_lr にする（＝一回だけ大きく動きすぎる）。
    返り値: (各更新前のバッチ平均リターン, 各更新前の方策 {s: probs} のリスト（最後に最終方策）)
    """
    S = [s for s in WORLD.states if not WORLD.is_terminal(s)]
    rng = np.random.default_rng(seed)
    Z = {s: np.zeros(4) for s in S}
    curve, snaps = [], []
    for u in range(updates):
        grads = {s: np.zeros(4) for s in S}
        rets, eps = [], []
        for _ in range(batch):
            s = WORLD.start
            traj = []
            for _ in range(max_steps):
                p = _softmax(Z[s])
                a = rng.choice(4, p=p)
                n, r, done = WORLD.sample(s, a, rng)
                traj.append((s, a, r))
                s = n
                if done:
                    break
            G, gs = 0.0, []
            for (_, _, r_) in reversed(traj):
                G = r_ + WORLD.gamma * G
                gs.append(G)
            gs = gs[::-1]
            eps.append((traj, gs))
            rets.append(gs[0])
        bl = float(np.mean(rets))
        for traj, gs in eps:
            for (s_, a_, _), G in zip(traj, gs):
                p = _softmax(Z[s_])
                g = -p
                g[a_] += 1
                grads[s_] += (G - bl) * g
        curve.append(float(np.mean(rets)))
        snaps.append({s: _softmax(Z[s]).copy() for s in S})
        step = big_lr if u == big_at else lr
        for s in S:
            Z[s] += step * grads[s] / batch
    snaps.append({s: _softmax(Z[s]).copy() for s in S})
    return curve, snaps


# ---------------------------------------------------------------------------
# Clip: 同じデータで何エポックも更新したときの比 r の広がり
# ---------------------------------------------------------------------------
def ppo_ratio_epochs(clip: bool, epochs=10, lr=0.15, eps=0.2, seed=0, nS=12, nA=6, N=48):
    """表形式ソフトマックス方策。古い方策で集めた N 個の (s, a, Â) に対し、
    代理目的（クリップあり/なし）の勾配上昇を epochs 回。各エポックの比 r_i を返す。"""
    rng = np.random.default_rng(seed)
    Z0 = rng.normal(0, 0.5, (nS, nA))
    P0 = np.array([_softmax(z) for z in Z0])
    s = rng.integers(nS, size=N)
    a = np.array([rng.choice(nA, p=P0[k]) for k in s])
    A = rng.normal(0, 1, N)
    A = (A - A.mean()) / A.std()
    Z = Z0.copy()
    hist = []
    for ep in range(epochs + 1):
        P = np.array([_softmax(z) for z in Z])
        r = P[s, a] / P0[s, a]
        hist.append(r.copy())
        if ep == epochs:
            break
        G = np.zeros_like(Z)
        for i in range(N):
            if clip and ((A[i] > 0 and r[i] > 1 + eps) or (A[i] < 0 and r[i] < 1 - eps)):
                continue  # min の中でクリップ側が選ばれている → 勾配 0
            g = -P[s[i]].copy()
            g[a[i]] += 1
            G[s[i]] += A[i] * r[i] * g
        Z += lr * G / N * nS
    return hist


# ---------------------------------------------------------------------------
# GAE: 実際の軌跡の TD 誤差（価値は ε-greedy 方策の真の価値）
# ---------------------------------------------------------------------------
def noisy_policy(eps=0.35):
    pol = {s: {a: (1 - eps) * (a == PI_STAR[s]) + eps / 4 for a in ACTIONS} for s in PI_STAR}
    for s in WORLD.terminals:
        pol[s] = {a: 0.25 for a in ACTIONS}
    return pol


def gae_example(seed=1071, start=(2, 1)):
    pol = noisy_policy()
    V = WORLD.policy_evaluation(pol)[-1]
    traj = WORLD.rollout(pol, np.random.default_rng(seed), start=start, max_steps=30)
    g = WORLD.gamma
    deltas = [r + (0.0 if WORLD.is_terminal(n) else g * V[n]) - V[s] for s, a, r, n in traj]
    G = sum(g ** k * x[2] for k, x in enumerate(traj))
    return traj, deltas, V, G - V[traj[0][0]]


def gae_value(deltas, gamma, lam):
    return float(sum((gamma * lam) ** l * d for l, d in enumerate(deltas)))


def mc_td_targets(state=(2, 1), n=400, seed=5):
    """あるマスでの MC の目標（リターン）と TD の目標 r+γV(s') のサンプル。"""
    pol = noisy_policy()
    V = WORLD.policy_evaluation(pol)[-1]
    rng = np.random.default_rng(seed)
    g = WORLD.gamma
    mc, td = [], []
    for _ in range(n):
        t = WORLD.rollout(pol, rng, start=state, max_steps=60)
        mc.append(sum(g ** k * x[2] for k, x in enumerate(t)))
        s, a, r, nx = t[0]
        td.append(r + (0.0 if WORLD.is_terminal(nx) else g * V[nx]))
    return np.array(mc), np.array(td), V[state]


def gae_tokens(rewards, values, gamma=1.0, lam=0.95):
    """トークン列の GAE。values は各トークン時点の V(s_t)、終端後は 0。"""
    T = len(rewards)
    adv = np.zeros(T)
    last = 0.0
    for t in reversed(range(T)):
        nv = values[t + 1] if t + 1 < T else 0.0
        delta = rewards[t] + gamma * nv - values[t]
        last = delta + gamma * lam * last
        adv[t] = last
    return adv


def grpo_advantages(rewards):
    r = np.asarray(rewards, dtype=float)
    mu, sd = r.mean(), r.std()
    return (r - mu) / sd, mu, sd
