"""第3章「経験から学ぶ」の部品。

前半: シミュレーション（崖歩き、3台のスロットマシン、TD(0)、探索付きスタートの Q 学習）。
後半: 図形（三角形の Q 表示、ヒストグラム、スロットマシン、崖のグリッド）。

画面に出す数値はすべてここで実際に計算する。乱数はシード固定。
"""
from __future__ import annotations

import numpy as np
from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, UL, UR, DL, DR, Arrow, Circle, Dot, Line,
                   LineJointType, Polygon, Rectangle, RoundedRectangle, Square, VGroup, VMobject,
                   GREY_B, GREY_C, GREY_D, GREY_E, RED, RED_E, WHITE, BLACK, Flash, FadeIn,
                   FadeOut, rush_into, there_and_back)

from common import style
from common.mobjects import ACTION_VEC, GridView, Robot, goal_icon, value_color
from common.rl import ACTIONS, DELTA, discounted_return, main_world
from common.style import jt, mt

# ---------------------------------------------------------------------------
# いつもの世界
# ---------------------------------------------------------------------------
WORLD = main_world()
V_STAR = WORLD.value_iteration()[-1]
PI_STAR = WORLD.greedy(V_STAR)
Q_STAR = WORLD.q_from_v(V_STAR)
GOAL, PIT = (4, 3), (4, 2)
UNIFORM = WORLD.uniform_policy()
V_UNI = WORLD.policy_evaluation(UNIFORM, iters=2000)[-1]   # でたらめな方策の本当の価値
NONTERM = [s for s in WORLD.states if not WORLD.is_terminal(s)]


def find_seed(pred, fn, limit=20000, start=0):
    for seed in range(start, start + limit):
        out = fn(seed)
        if pred(out):
            return seed, out
    raise RuntimeError("seed not found")


def uniform_rollout(seed, start=(0, 0), max_steps=400):
    return WORLD.rollout(UNIFORM, np.random.default_rng(seed), start=start, max_steps=max_steps)


def ret(traj, gamma=WORLD.gamma):
    return discounted_return([t[2] for t in traj], gamma)


def mc_samples(n, seed=0, start=(2, 1)):
    """でたらめな方策で start から n 回走らせる。[(軌跡, リターン)]。"""
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        t = WORLD.rollout(UNIFORM, rng, start=start, max_steps=1000)
        out.append((t, ret(t)))
    return out


def td_target(tr, V):
    s, a, r, n = tr
    return r + (0.0 if WORLD.is_terminal(n) else WORLD.gamma * V[n])


def td0(policy, episodes, alpha, seed, start=(2, 1), V0=None):
    """表形式の TD(0)。推定値 V（dict）を返す。"""
    rng = np.random.default_rng(seed)
    V = dict(V0) if V0 else {s: 0.0 for s in WORLD.states}
    for _ in range(episodes):
        for tr in WORLD.rollout(policy, rng, start=start, max_steps=1000):
            s = tr[0]
            V[s] += alpha * (td_target(tr, V) - V[s])
    return V


def eps_greedy_rollout(policy, eps, seed, start=(0, 0), max_steps=40):
    """決定的な方策 policy に ε の揺らぎを加えて走らせる。[(s, a, r, s', 探索したか)]。"""
    rng = np.random.default_rng(seed)
    s, out = start, []
    for _ in range(max_steps):
        explore = rng.random() < eps
        a = ACTIONS[rng.integers(4)] if explore else policy[s]
        n, r, done = WORLD.sample(s, a, rng)
        out.append((s, a, r, n, explore and a != policy[s]))
        s = n
        if done:
            break
    return out


# ---------------------------------------------------------------------------
# 探索付きスタートの Q 学習（いつもの世界）
# ---------------------------------------------------------------------------
def q_learning_es(episodes, seed, eps=0.3, power=0.7, max_steps=100, snapshots=(), record=()):
    """スタート地点をランダムに選ぶ Q 学習。α = 1 / (訪問回数)^power で減衰させる。

    返り値: (Q, snaps, recorded)
      Q: dict (s, a) -> 値
      snaps: {エピソード番号: Q のコピー}（その回の終了時点）
      recorded: {エピソード番号: [(s, a, r, s', Q[s,a] 更新後)]}
    """
    rng = np.random.default_rng(seed)
    g = WORLD.gamma
    Q = {(s, a): 0.0 for s in WORLD.states for a in ACTIONS}
    N = {(s, a): 0 for s in WORLD.states for a in ACTIONS}
    snaps, recorded = {}, {}
    snapshots, record = set(snapshots), set(record)
    if 0 in snapshots:
        snaps[0] = dict(Q)
    outs = {(s, a): WORLD.outcomes(s, a) for s in WORLD.states for a in ACTIONS}
    for ep in range(1, episodes + 1):
        s = NONTERM[rng.integers(len(NONTERM))]
        traj = []
        for _ in range(max_steps):
            if rng.random() < eps:
                a = ACTIONS[rng.integers(4)]
            else:
                qs = [Q[s, x] for x in ACTIONS]
                m = max(qs)
                best = [x for x in ACTIONS if qs[x] == m]
                a = best[rng.integers(len(best))]
            o = outs[s, a]
            k = rng.choice(len(o), p=[x[0] for x in o]) if len(o) > 1 else 0
            _, n, r = o[k]
            done = WORLD.is_terminal(n)
            N[s, a] += 1
            alpha = 1.0 / N[s, a] ** power
            target = r + (0.0 if done else g * max(Q[n, x] for x in ACTIONS))
            Q[s, a] += alpha * (target - Q[s, a])
            if ep in record:
                traj.append((s, a, r, n, Q[s, a]))
            s = n
            if done:
                break
        if ep in record:
            recorded[ep] = traj
        if ep in snapshots:
            snaps[ep] = dict(Q)
    return Q, snaps, recorded


def greedy_from_q(Q):
    return {s: max(ACTIONS, key=lambda a: Q[s, a]) for s in NONTERM}


# ---------------------------------------------------------------------------
# 崖歩き（12×4）
# ---------------------------------------------------------------------------
class Cliff:
    W, H = 12, 4
    start = (0, 0)
    goal = (11, 0)
    cliff = frozenset((x, 0) for x in range(1, 11))

    @classmethod
    def step(cls, s, a):
        dx, dy = DELTA[a]
        n = (min(max(s[0] + dx, 0), cls.W - 1), min(max(s[1] + dy, 0), cls.H - 1))
        if n in cls.cliff:
            return cls.start, -100.0, False, n  # 落ちたマス n を返す（演出用）
        return n, -1.0, n == cls.goal, None


def _eps_greedy(q, eps, rng):
    if rng.random() < eps:
        return int(rng.integers(4))
    m = q.max()
    b = np.flatnonzero(q == m)
    return int(b[rng.integers(len(b))])


def cliff_learn(method, episodes=500, alpha=0.5, eps=0.1, seed=0):
    """method: 'sarsa' or 'q'。返り値: (Q, エピソードごとの報酬合計, 落ちた回数)。"""
    rng = np.random.default_rng(seed)
    Q = {(x, y): np.zeros(4) for x in range(Cliff.W) for y in range(Cliff.H)}
    rets, falls = [], []
    for _ in range(episodes):
        s = Cliff.start
        a = _eps_greedy(Q[s], eps, rng)
        G, nf = 0.0, 0
        for _ in range(100000):
            n, r, done, fell = Cliff.step(s, a)
            G += r
            nf += fell is not None
            if method == "sarsa":
                a2 = _eps_greedy(Q[n], eps, rng)
                target = r + (0.0 if done else Q[n][a2])
            else:
                target = r + (0.0 if done else Q[n].max())
            Q[s][a] += alpha * (target - Q[s][a])
            if done:
                break
            s = n
            a = a2 if method == "sarsa" else _eps_greedy(Q[s], eps, rng)
        rets.append(G)
        falls.append(nf)
    return Q, np.array(rets), np.array(falls)


def cliff_greedy_path(Q, max_steps=60):
    s, path = Cliff.start, [Cliff.start]
    for _ in range(max_steps):
        a = int(np.argmax(Q[s]))
        n, r, done, fell = Cliff.step(s, a)
        if fell is not None:
            path.append(fell)
            break
        path.append(n)
        s = n
        if done:
            break
    return path


def cliff_experiment(n_seeds=50, episodes=500, window=10):
    """SARSA と Q 学習を n_seeds 回ずつ学習させた結果。"""
    out = {}
    for m in ("sarsa", "q"):
        R, F, paths = [], [], []
        for seed in range(n_seeds):
            Q, rets, falls = cliff_learn(m, episodes=episodes, seed=seed)
            R.append(rets)
            F.append(falls)
            paths.append(cliff_greedy_path(Q))
        R = np.array(R)
        mean = R.mean(axis=0)
        kern = np.ones(window) / window
        smooth = np.convolve(np.pad(mean, (window - 1, 0), mode="edge"), kern, mode="valid")
        out[m] = dict(mean=mean, smooth=smooth, falls=np.array(F).sum(axis=1).mean(),
                      paths=paths, greedy_return=-(len(paths[0]) - 1))
    return out


# ---------------------------------------------------------------------------
# 3台のスロットマシン
# ---------------------------------------------------------------------------
BANDIT_P = (0.3, 0.5, 0.8)


def bandit_run(seed, eps, T, p=BANDIT_P):
    """標本平均で見積もる ε-greedy。[(台, 当たり, 探索だったか, 推定値, 回数)]。"""
    rng = np.random.default_rng(seed)
    est = np.zeros(3)
    cnt = np.zeros(3, dtype=int)
    hist = []
    for _ in range(T):
        explore = rng.random() < eps
        if explore:
            a = int(rng.integers(3))
        else:
            m = est.max()
            b = np.flatnonzero(est == m)
            a = int(b[rng.integers(len(b))])
        r = float(rng.random() < p[a])
        cnt[a] += 1
        est[a] += (r - est[a]) / cnt[a]
        hist.append((a, r, explore, est.copy(), cnt.copy()))
    return hist


def td_error_curve(episodes, seed, power=0.7):
    """でたらめな方策の TD(0)（スタートはランダム、α は訪問回数で減衰）。

    返り値: 各エピソード終了時の、真の価値からのずれ（RMS）のリスト。先頭は学習前。
    """
    rng = np.random.default_rng(seed)
    V = {s: 0.0 for s in WORLD.states}
    N = {s: 0 for s in WORLD.states}

    def err():
        return float(np.sqrt(np.mean([(V[s] - V_UNI[s]) ** 2 for s in NONTERM])))

    errs = [err()]
    for _ in range(episodes):
        s0 = NONTERM[rng.integers(len(NONTERM))]
        for tr in WORLD.rollout(UNIFORM, rng, start=s0, max_steps=1000):
            s = tr[0]
            N[s] += 1
            V[s] += (td_target(tr, V) - V[s]) / N[s] ** power
        errs.append(err())
    return errs


# ===========================================================================
# 図形
# ===========================================================================
def n_vec(s, n):
    return np.array([n[0] - s[0], n[1] - s[1], 0.0])


def step_anims(robot: Robot, g, s, a, n, run_time=0.4):
    """1ステップ分のロボットの動き。ぶつかったら小さく揺れる。"""
    d = ACTION_VEC[a]
    if n == s:
        return [robot.animate(rate_func=there_and_back, run_time=run_time).shift(0.12 * g.cell * d)]
    return [robot.animate(run_time=run_time).move_to(g.center_of(n)).look(n_vec(s, n))]


def path_line(g, states, color=style.STATE, jitter=0.0, seed=0, width=4, opacity=1.0):
    """マスの中心を結ぶ折れ線。jitter>0 なら少し揺らす（同じマスの往復が重ならない）。"""
    rng = np.random.default_rng(seed)
    pts = [g.center_of(s) + rng.uniform(-1, 1, 3) * jitter * g.cell * np.array([1, 1, 0])
           for s in states]
    line = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    line.set_points_as_corners(pts)
    line.joint_type = LineJointType.ROUND
    return line


def arrow_glyph(a, color=style.ACTION, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def dice(n=5, size=0.42, color=GREY_B):
    """サイコロの目。"""
    sq = RoundedRectangle(width=size, height=size, corner_radius=0.08 * size / 0.42,
                          stroke_color=color, stroke_width=2, fill_color="#26262c", fill_opacity=1)
    o = 0.26 * size
    spots = {1: [(0, 0)], 2: [(-1, 1), (1, -1)], 3: [(-1, 1), (0, 0), (1, -1)],
             4: [(-1, 1), (1, 1), (-1, -1), (1, -1)], 5: [(-1, 1), (1, 1), (0, 0), (-1, -1), (1, -1)],
             6: [(-1, 1), (1, 1), (-1, 0), (1, 0), (-1, -1), (1, -1)]}[n]
    pips = VGroup(*[Dot(radius=0.045 * size / 0.42, color=WHITE).move_to(np.array([x * o, y * o, 0]))
                    for x, y in spots])
    return VGroup(sq, pips)


# ---------------------------------------------------------------------------
# 三角形の Q 表示
# ---------------------------------------------------------------------------
class QTriangles(VGroup):
    """各マスを4つの三角形（上右下左）に分け、Q の値で塗る。"""

    def __init__(self, g, Q=None, vmax=1.0, stroke_color="#3a3a42", stroke_width=1.5, **kw):
        super().__init__(**kw)
        self.g, self.vmax = g, vmax
        self.tris = {}
        h = g.cell / 2
        for s in g.nonterminal_states():
            c = g.center_of(s)
            tl, tr = c + np.array([-h, h, 0]), c + np.array([h, h, 0])
            br, bl = c + np.array([h, -h, 0]), c + np.array([-h, -h, 0])
            pts = {0: [c, tl, tr], 1: [c, tr, br], 2: [c, br, bl], 3: [c, bl, tl]}
            for a in ACTIONS:
                q = 0.0 if Q is None else Q[s, a]
                t = Polygon(*pts[a], stroke_color=stroke_color, stroke_width=stroke_width,
                            fill_color=value_color(q, vmax), fill_opacity=1)
                self.tris[s, a] = t
                self.add(t)

    def set_q(self, Q):
        for k, t in self.tris.items():
            t.set_fill(value_color(Q[k], self.vmax), 1)
        return self

    def anims(self, Q, prev=None):
        out = []
        for k, t in self.tris.items():
            if prev is not None and abs(prev[k] - Q[k]) < 1e-9:
                continue
            out.append(t.animate.set_fill(value_color(Q[k], self.vmax), 1))
        return out

    def centroid(self, s, a):
        return np.mean(self.tris[s, a].get_vertices(), axis=0)


# ---------------------------------------------------------------------------
# スロットマシン
# ---------------------------------------------------------------------------
class SlotMachine(VGroup):
    def __init__(self, width=2.0, height=2.5, accent=GREY_B, **kw):
        super().__init__(**kw)
        body = RoundedRectangle(width=width, height=height, corner_radius=0.22, stroke_color=accent,
                                stroke_width=3, fill_color="#1c1c23", fill_opacity=1)
        crown = RoundedRectangle(width=width * 0.8, height=0.34, corner_radius=0.12,
                                 stroke_color=accent, stroke_width=2, fill_color="#2a2a33",
                                 fill_opacity=1).next_to(body, UP, buff=-0.05)
        window = RoundedRectangle(width=width * 0.74, height=height * 0.42, corner_radius=0.1,
                                  stroke_color=GREY_C, stroke_width=2.5, fill_color="#0c0c10",
                                  fill_opacity=1).move_to(body.get_center() + 0.17 * height * UP)
        slot = RoundedRectangle(width=width * 0.5, height=0.16, corner_radius=0.06, stroke_width=0,
                                fill_color="#08080a", fill_opacity=1).move_to(
            body.get_bottom() + 0.28 * height * UP)
        pivot = body.get_right() + 0.05 * height * DOWN
        stick = Line(pivot, pivot + 0.22 * RIGHT + 0.85 * UP, stroke_color=GREY_B, stroke_width=6)
        knob = Circle(radius=0.16, stroke_width=0, fill_color=RED, fill_opacity=1).move_to(stick.get_end())
        self.lever = VGroup(stick, knob)
        self.pivot = pivot
        self.body, self.window = body, window
        self.add(crown, body, window, slot, self.lever)

    def pull(self, run_time=0.35):
        pivot = self.lever[0].get_start()  # 動かしたあとでも正しい支点
        return self.lever.animate(rate_func=there_and_back, run_time=run_time).rotate(
            -1.9, about_point=pivot)


# ---------------------------------------------------------------------------
# 崖歩きのグリッド
# ---------------------------------------------------------------------------
class CliffView(VGroup):
    def __init__(self, cell=1.0, **kw):
        super().__init__(**kw)
        self.cell = cell
        self.cells = {}
        W, H = Cliff.W, Cliff.H
        self.origin = np.array([-(W - 1) * cell / 2, -(H - 1) * cell / 2, 0])
        board = VGroup()
        for y in range(H):
            for x in range(W):
                sq = Square(side_length=cell, stroke_color=GREY_D, stroke_width=2,
                            fill_color=style.BG, fill_opacity=1).move_to(self._pos((x, y)))
                board.add(sq)
                self.cells[x, y] = sq
        self.board = board
        self.cliff = VGroup(*[self.cells[c] for c in sorted(Cliff.cliff)])
        self.goal = goal_icon(0.55 * cell).move_to(self._pos(Cliff.goal))
        self.add(board, self.goal)

    def _pos(self, s):
        return self.origin + np.array([s[0] * self.cell, s[1] * self.cell, 0])

    def center_of(self, s):
        return self.cells[s].get_center()

    def paint_cliff(self):
        return [c.animate.set_fill("#5C1F1F", 1).set_stroke("#8A2E2E", 2) for c in self.cliff]


# ---------------------------------------------------------------------------
# ブロック崩し風の画面（84×84、256階調）
# ---------------------------------------------------------------------------
def breakout_pixels(ball=(46, 52), paddle_x=38, seed=3):
    rng = np.random.default_rng(seed)
    img = np.zeros((84, 84), dtype=np.uint8)
    img[4:6, 2:82] = 142            # 上の壁
    img[4:80, 2:4] = 142            # 左の壁
    img[4:80, 80:82] = 142          # 右の壁
    levels = [200, 180, 160, 140, 120, 100]
    for r, lv in enumerate(levels):
        y0 = 14 + r * 3
        for x0 in range(4, 80, 4):
            if rng.random() < 0.12 and r > 1:
                continue            # 壊れたブロック
            img[y0:y0 + 2, x0:x0 + 3] = lv
    img[76:78, paddle_x:paddle_x + 10] = 200
    by, bx = ball
    img[by:by + 2, bx:bx + 2] = 230
    return img
