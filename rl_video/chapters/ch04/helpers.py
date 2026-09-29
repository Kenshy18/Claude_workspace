"""第4章の部品: ブロック崩し風のミニゲーム、小さな MLP、各シーンの数値計算、図形。

画面に出す数値はすべてここで実際に計算する（乱数シードは固定）。
"""
from __future__ import annotations

import copy
import functools
from dataclasses import dataclass, field

import numpy as np
from manim import (DOWN, LEFT, RIGHT, UP, ORIGIN, UL, UR, DL, DR, Arc, Arrow, Circle, DashedLine, Dot, ImageMobject,
                   Line, Polygon, Rectangle, RoundedRectangle, Square, VGroup, VMobject, WHITE, BLACK,
                   GREY_A, GREY_B, GREY_C, GREY_D, GREY_E, ManimColor)
from manim.constants import RESAMPLING_ALGORITHMS

from common import style
from common.style import jt, mt

# ---------------------------------------------------------------------------
# ブロック崩し風のミニゲーム（84×84 の画素座標。原点は左下、y は上向き）
# ---------------------------------------------------------------------------
N_PX = 84
WALL_L, WALL_R, WALL_T = 3.0, 81.0, 78.0          # 内側の境界
BRICK_ROWS, BRICK_COLS = 6, 13
BRICK_W, BRICK_H = (WALL_R - WALL_L) / BRICK_COLS, 3.0
BRICK_Y0 = 52.0                                   # いちばん下の段の下端
PADDLE_W, PADDLE_H, PADDLE_Y = 12.0, 2.0, 6.0     # PADDLE_Y はパドルの下端
BALL = 2.0
# 自作の配色（段ごと）。グレースケール化したときの明るさも段ごとに変える。
BRICK_COLORS = ["#E07A8F", "#E8A06A", "#E6D27A", "#8BCB86", "#6FB6D9", "#9C8FE0"][::-1]
BRICK_GRAY = [96, 118, 140, 162, 184, 206][::-1]
WALL_GRAY, PADDLE_GRAY, BALL_GRAY = 110, 200, 236
ACT_LEFT, ACT_NOOP, ACT_RIGHT = -1, 0, 1
GAME_ACTIONS = [ACT_LEFT, ACT_NOOP, ACT_RIGHT]


@dataclass
class GameState:
    bx: float
    by: float
    vx: float
    vy: float
    px: float
    bricks: np.ndarray = field(default_factory=lambda: np.ones((BRICK_ROWS, BRICK_COLS), bool))
    done: bool = False

    def copy(self):
        return GameState(self.bx, self.by, self.vx, self.vy, self.px, self.bricks.copy(), self.done)


def game_step(s: GameState, action: int, paddle_speed=3.0) -> tuple[GameState, float]:
    """1ステップ進める。返り値は（次の状態, 報酬）。報酬はブロック1個につき +1。"""
    s = s.copy()
    if s.done:
        return s, 0.0
    half = PADDLE_W / 2
    s.px = float(np.clip(s.px + action * paddle_speed, WALL_L + half, WALL_R - half))
    y_prev = s.by
    s.bx += s.vx
    s.by += s.vy
    r = BALL / 2
    if s.bx - r < WALL_L:
        s.bx = 2 * (WALL_L + r) - s.bx
        s.vx = abs(s.vx)
    if s.bx + r > WALL_R:
        s.bx = 2 * (WALL_R - r) - s.bx
        s.vx = -abs(s.vx)
    if s.by + r > WALL_T:
        s.by = 2 * (WALL_T - r) - s.by
        s.vy = -abs(s.vy)
    reward = 0.0
    row = int((s.by - BRICK_Y0) // BRICK_H)
    col = int((s.bx - WALL_L) // BRICK_W)
    if 0 <= row < BRICK_ROWS and 0 <= col < BRICK_COLS and s.bricks[row, col]:
        s.bricks[row, col] = False
        s.vy = -s.vy
        reward = 1.0
    top = PADDLE_Y + PADDLE_H
    if s.vy < 0 and y_prev - r >= top - 0.01 and s.by - r <= top and abs(s.bx - s.px) <= half + r:
        s.by = 2 * (top + r) - s.by
        s.vy = abs(s.vy)
        s.vx = float(np.clip(s.vx + 0.9 * (s.bx - s.px) / half, -2.2, 2.2))
        if abs(s.vx) < 0.4:
            s.vx = 0.4 * (1 if s.vx >= 0 else -1)
    if s.by < 0:
        s.done = True
    return s, reward


def tracking_action(s: GameState, rng=None, eps=0.0, deadband=1.5):
    """ボールの x を追いかけるだけの簡単な方策（ε の確率でランダム）。"""
    if rng is not None and rng.random() < eps:
        return GAME_ACTIONS[rng.integers(3)]
    d = s.bx - s.px
    if d > deadband:
        return ACT_RIGHT
    if d < -deadband:
        return ACT_LEFT
    return ACT_NOOP


def initial_state(seed=0, holes=10):
    """ゲーム途中っぽい初期状態（ブロックがいくつか欠けている）。"""
    rng = np.random.default_rng(seed)
    s = GameState(bx=36.0, by=12.0, vx=1.6, vy=2.4, px=34.0)
    for k in rng.choice(BRICK_ROWS * BRICK_COLS, holes, replace=False):
        s.bricks[k // BRICK_COLS, k % BRICK_COLS] = False
    return s


@functools.lru_cache(maxsize=4)
def demo_episode(steps=260, seed=0):
    """Hook などで流すプレイ映像。ボールが落ちてくるたびに、狙う位置を少しずらして追いかける。"""
    rng = np.random.default_rng(seed)
    s = initial_state(seed)
    states = [s]
    off = 0.0
    for _ in range(steps):
        if s.vy < 0 and len(states) > 1 and states[-2].vy >= 0:
            off = rng.uniform(-5, 5)
        d = s.bx + off - s.px
        a = ACT_RIGHT if d > 1.5 else ACT_LEFT if d < -1.5 else ACT_NOOP
        s, _ = game_step(s, a)
        states.append(s)
    return tuple(states)


def raster(s: GameState) -> np.ndarray:
    """84×84 のグレースケール画像（uint8、行0が上）。"""
    img = np.zeros((N_PX, N_PX), np.uint8)

    def fill(x0, x1, y0, y1, v):
        c0, c1 = int(np.floor(x0)), int(np.ceil(x1))
        r0, r1 = N_PX - int(np.ceil(y1)), N_PX - int(np.floor(y0))
        img[max(r0, 0):max(r1, 0), max(c0, 0):max(c1, 0)] = v

    fill(0, WALL_L, 0, N_PX, WALL_GRAY)
    fill(WALL_R, N_PX, 0, N_PX, WALL_GRAY)
    fill(0, N_PX, WALL_T, N_PX, WALL_GRAY)
    for i in range(BRICK_ROWS):
        for j in range(BRICK_COLS):
            if s.bricks[i, j]:
                x0 = WALL_L + j * BRICK_W
                fill(round(x0), round(x0 + BRICK_W), BRICK_Y0 + i * BRICK_H, BRICK_Y0 + (i + 1) * BRICK_H,
                     BRICK_GRAY[i])
    fill(round(s.px - PADDLE_W / 2), round(s.px + PADDLE_W / 2), PADDLE_Y, PADDLE_Y + PADDLE_H, PADDLE_GRAY)
    if not s.done:
        fill(round(s.bx - 1), round(s.bx + 1), round(s.by - 1), round(s.by + 1), BALL_GRAY)
    return img


def pixel_image(arr: np.ndarray, width: float, tint=None) -> ImageMobject:
    """numpy の画素配列を、ぼかさずに（最近傍で）表示する。"""
    if tint is not None:
        rgb = np.stack([arr * t for t in tint], axis=-1).clip(0, 255).astype(np.uint8)
        im = ImageMobject(rgb)
    else:
        im = ImageMobject(arr)
    im.set_resampling_algorithm(RESAMPLING_ALGORITHMS["nearest"])
    im.width = width
    return im


class GameView(VGroup):
    """ゲーム画面のベクター描画（カラー）。update_state で状態を差し替える。"""

    def __init__(self, s: GameState, width=4.2, show_border=True, **kw):
        super().__init__(**kw)
        self.k = width / N_PX
        k = self.k
        self.bg = Rectangle(width=width, height=width, stroke_width=0, fill_color="#050507", fill_opacity=1)
        wall_c = "#6A6A74"
        self.walls = VGroup(
            Rectangle(width=WALL_L * k, height=N_PX * k, stroke_width=0, fill_color=wall_c, fill_opacity=1)
            .move_to(self._p(WALL_L / 2, N_PX / 2)),
            Rectangle(width=(N_PX - WALL_R) * k, height=N_PX * k, stroke_width=0, fill_color=wall_c,
                      fill_opacity=1).move_to(self._p((WALL_R + N_PX) / 2, N_PX / 2)),
            Rectangle(width=N_PX * k, height=(N_PX - WALL_T) * k, stroke_width=0, fill_color=wall_c,
                      fill_opacity=1).move_to(self._p(N_PX / 2, (WALL_T + N_PX) / 2)),
        )
        self.brick_mobs = VGroup()
        self.brick_index = []
        for i in range(BRICK_ROWS):
            for j in range(BRICK_COLS):
                b = Rectangle(width=BRICK_W * k * 0.9, height=BRICK_H * k * 0.8, stroke_width=0,
                              fill_color=BRICK_COLORS[i], fill_opacity=1)
                b.move_to(self._p(WALL_L + (j + 0.5) * BRICK_W, BRICK_Y0 + (i + 0.5) * BRICK_H))
                self.brick_mobs.add(b)
                self.brick_index.append((i, j))
        self.paddle = RoundedRectangle(width=PADDLE_W * k, height=PADDLE_H * k, corner_radius=PADDLE_H * k * 0.45,
                                       stroke_width=0, fill_color="#E8E8F0", fill_opacity=1)
        self.ball = Square(BALL * k * 1.5, stroke_width=0, fill_color=WHITE, fill_opacity=1)
        parts = [self.bg, self.walls, self.brick_mobs, self.paddle, self.ball]
        if show_border:
            self.border = Rectangle(width=width, height=width, stroke_color=GREY_C, stroke_width=2)
            parts.append(self.border)
        self.add(*parts)
        self.update_state(s)

    def _p(self, x, y):
        return self.bg.get_center() + np.array([(x - N_PX / 2) * self.k, (y - N_PX / 2) * self.k, 0])

    def update_state(self, s: GameState, alpha_ball=None):
        for b, (i, j) in zip(self.brick_mobs, self.brick_index):
            b.set_fill(opacity=1.0 if s.bricks[i, j] else 0.0)
        self.paddle.move_to(self._p(s.px, PADDLE_Y + PADDLE_H / 2))
        self.ball.move_to(self._p(s.bx, s.by))
        self.ball.set_fill(opacity=0.0 if s.done else 1.0)
        return self


def interp_state(states, t: float) -> GameState:
    """連続時間 t（ステップ単位）での状態。位置だけ線形補間する。"""
    t = float(np.clip(t, 0, len(states) - 1))
    i = int(np.floor(t))
    j = min(i + 1, len(states) - 1)
    u = t - i
    a, b = states[i], states[j]
    s = a.copy()
    # 反射をまたぐときに変な位置にならないよう、差が大きいときは補間しない
    if abs(b.bx - a.bx) < 4 and abs(b.by - a.by) < 4:
        s.bx = a.bx + u * (b.bx - a.bx)
        s.by = a.by + u * (b.by - a.by)
    s.px = a.px + u * (b.px - a.px)
    return s


def mc_q_values(s: GameState, gamma=0.97, hold=4, horizon=200, n=200, seed=0):
    """Q(s, a) をロールアウトで見積もる: a を hold ステップ続けたあと、ε=0.1 の追いかけ方策。"""
    rng = np.random.default_rng(seed)
    out = []
    for a in GAME_ACTIONS:
        tot = 0.0
        for _ in range(n):
            x, g, disc = s.copy(), 0.0, 1.0
            for t in range(horizon):
                act = a if t < hold else tracking_action(x, rng, eps=0.1)
                x, r = game_step(x, act)
                g += disc * r
                disc *= gamma
                if x.done:
                    break
            tot += g
        out.append(tot / n)
    return out


# ---------------------------------------------------------------------------
# 小さな MLP（1入力・tanh 隠れ層・1出力）
# ---------------------------------------------------------------------------
def mlp_init(h=24, seed=2, s1=8.0):
    rng = np.random.default_rng(seed)
    c = rng.uniform(-0.1, 1.1, h)
    W1 = rng.normal(0, s1, (h, 1))
    return dict(W1=W1, b1=-W1[:, 0] * c, W2=rng.normal(0, 0.1, (1, h)), b2=np.zeros(1))


def mlp(p, x):
    x = np.asarray(x, float)
    h = np.tanh(p["W1"] @ x[None, :] + p["b1"][:, None])
    return (p["W2"] @ h)[0] + p["b2"][0], h


def mlp_grads(p, x, y):
    yh, h = mlp(p, x)
    e = yh - y
    ge = 2 * e / len(x)
    gh = p["W2"].T @ ge[None, :] * (1 - h ** 2)
    return dict(W1=gh @ x[:, None], b1=gh.sum(1), W2=ge[None, :] @ h.T, b2=np.array([ge.sum()])), float((e ** 2).mean())


class Adam:
    def __init__(self, p, lr=0.01):
        self.m = {k: np.zeros_like(v) for k, v in p.items()}
        self.v = {k: np.zeros_like(v) for k, v in p.items()}
        self.t, self.lr = 0, lr

    def step(self, p, g):
        self.t += 1
        for k in p:
            self.m[k] = 0.9 * self.m[k] + 0.1 * g[k]
            self.v[k] = 0.999 * self.v[k] + 0.001 * g[k] ** 2
            mh = self.m[k] / (1 - 0.9 ** self.t)
            vh = self.v[k] / (1 - 0.999 ** self.t)
            p[k] -= self.lr * mh / (np.sqrt(vh) + 1e-8)


# ---------------------------------------------------------------------------
# Generalization: 訪れた数点だけから価値の曲線を当てはめる
# ---------------------------------------------------------------------------
GEN_X = np.array([0.06, 0.2, 0.33, 0.52, 0.64, 0.83, 0.95])


def gen_true(x):
    return 0.35 + 0.35 * np.sin(2 * np.pi * (np.asarray(x) * 0.9 + 0.1)) + 0.15 * np.asarray(x)


@functools.lru_cache(maxsize=1)
def generalization_fit():
    """返り値: (xs, ys, 学習後のパラメータ, 1点だけ目標を上げたときのパラメータの推移, その点の番号, 新しい目標)"""
    xs, ys = GEN_X, gen_true(GEN_X)
    p = mlp_init()
    opt = Adam(p, 0.01)
    for _ in range(4000):
        g, _ = mlp_grads(p, xs, ys)
        opt.step(p, g)
    i, bump = 3, 0.3
    q = copy.deepcopy(p)
    snaps = [copy.deepcopy(q)]
    for _ in range(30):
        g, _ = mlp_grads(q, xs[i:i + 1], np.array([ys[i] + bump]))
        g["b2"][:] = 0.0
        for k in q:
            q[k] -= 0.03 * g[k]
        snaps.append(copy.deepcopy(q))
    return xs, ys, p, snaps, i, ys[i] + bump


# ---------------------------------------------------------------------------
# Replay: 順番どおりに学習すると忘れる／ランダムに取り出すと忘れない
# ---------------------------------------------------------------------------
def replay_true(x):
    x = np.asarray(x)
    return 0.5 + 0.3 * np.sin(2 * np.pi * 1.2 * x) - 0.2 * x


@functools.lru_cache(maxsize=2)
def forgetting_run(mode: str, n_stream=400, stride=4, inner=8, batch=16, window=16, seed=0):
    """mode='seq'（直近の経験だけ）か 'replay'（それまでの全経験から一様に）。

    返り値: [(時刻 t, ミニバッチの x, パラメータ)] のリスト。
    """
    rng = np.random.default_rng(seed)
    p = mlp_init(seed=2)
    opt = Adam(p, 0.01)
    stream = np.linspace(0, 1, n_stream)
    rec = []
    for t in range(0, n_stream, stride):
        if mode == "seq":
            xb = stream[max(0, t + stride - window):t + stride]
        else:
            xb = rng.choice(stream[:t + stride], size=batch)
        for _ in range(inner):
            g, _ = mlp_grads(p, xb, replay_true(xb))
            opt.step(p, g)
        rec.append((t, xb.copy(), copy.deepcopy(p)))
    return rec


# ---------------------------------------------------------------------------
# MovingTarget: 2状態のトイ問題（s → s' は報酬0、s' → s は報酬1、γ=0.8）
# ---------------------------------------------------------------------------
MT_GAMMA = 0.8
MT_R = np.array([1.0, 1.0])


def moving_target_run(alpha=2.3, sync=None, steps=48, v0=(0.0, 0.0)):
    """V = θ（2状態）を、半勾配 TD で batch 更新する。

    sync=None: ターゲットネットなし（目標も今の θ で計算）
    sync=K   : K ステップごとに θ⁻ ← θ
    返り値: 配列 (steps+1, 3) = [予測 V(s), 目標 y(s), 損失（2状態の平均二乗 TD 誤差）]
    """
    P = np.array([[0, 1.0], [1.0, 0]])
    V = np.array(v0, float)
    Vm = V.copy()
    out = []
    for t in range(steps + 1):
        y = MT_R + MT_GAMMA * P @ (Vm if sync else V)
        out.append([V[0], y[0], float(((y - V) ** 2).mean())])
        V = V + alpha * 0.5 * (y - V)
        if sync and (t + 1) % sync == 0:
            Vm = V.copy()
    return np.array(out)


def moving_target_fixed_point():
    g = MT_GAMMA
    v1 = (MT_R[1] + g * MT_R[0]) / (1 - g * g)
    return MT_R[0] + g * v1


# ---------------------------------------------------------------------------
# Overestimation: 真の価値が全部 0 の4行動、ノイズ付きの推定
# ---------------------------------------------------------------------------
@functools.lru_cache(maxsize=1)
def overestimation_samples(n=4000, n_actions=4, seed=4):
    """返り値: (Q1 のサンプル (n,4), Q2 のサンプル (n,4), max Q1, Q2[argmax Q1])"""
    rng = np.random.default_rng(seed)
    q1 = rng.standard_normal((n, n_actions))
    q2 = rng.standard_normal((n, n_actions))
    mx = q1.max(1)
    dbl = q2[np.arange(n), q1.argmax(1)]
    return q1, q2, mx, dbl


def bias_chain(n_states=4, gamma=0.9, n=20000, n_actions=4, seed=5):
    """真の価値が全部 0 の連鎖で、ノイズの max をブートストラップしたときの偏り（モンテカルロで計算）。

    終端のひとつ手前から順に: 推定 = γ・max_a（次の状態の推定 + ノイズ）。
    """
    rng = np.random.default_rng(seed)
    v = np.zeros(n)
    out = []
    for _ in range(n_states):
        v = gamma * (v[:, None] + rng.standard_normal((n, n_actions))).max(1)
        out.append(float(v.mean()))
    return out


# ---------------------------------------------------------------------------
# DeadlyTriad: θ と 2θ の2状態で、左だけを TD 更新する
# ---------------------------------------------------------------------------
def triad_run(theta0=1.0, alpha=0.1, gamma=0.9, steps=40):
    th = [theta0]
    for _ in range(steps):
        t = th[-1]
        th.append(t + alpha * (gamma * 2 * t - t) * 1.0)
    return np.array(th)


# ---------------------------------------------------------------------------
# 図形
# ---------------------------------------------------------------------------
def lock_icon(size=0.5, color=GREY_A):
    body = RoundedRectangle(width=size, height=0.75 * size, corner_radius=0.1 * size, stroke_width=0,
                            fill_color=color, fill_opacity=1)
    shackle = Arc(radius=0.3 * size, start_angle=0, angle=np.pi, stroke_color=color,
                  stroke_width=max(2.0, 9 * size))
    shackle.next_to(body, UP, buff=-0.02 * size)
    hole = Circle(radius=0.08 * size, stroke_width=0, fill_color=style.BG, fill_opacity=1).move_to(body)
    return VGroup(shackle, body, hole)


def cross_mark(size=0.5, color=None, width=7):
    from manim import RED
    return VGroup(Line(UL, DR), Line(UR, DL)).set_stroke(color or RED, width).scale(size / 2)


def conv_block(w=0.35, h=2.2, depth=0.5, color="#5B7FA8"):
    """畳み込み層の特徴マップを、奥行きのある直方体で。"""
    front = Rectangle(width=w, height=h, stroke_color=WHITE, stroke_width=1.5, fill_color=color, fill_opacity=0.9)
    d = np.array([depth * 0.8, depth * 0.55, 0])
    tl, tr, br = front.get_corner(UL), front.get_corner(UR), front.get_corner(DR)
    top = Polygon(tl, tr, tr + d, tl + d, stroke_color=WHITE, stroke_width=1.5,
                  fill_color=ManimColor(color).lighter(0.25), fill_opacity=0.9)
    side = Polygon(tr, br, br + d, tr + d, stroke_color=WHITE, stroke_width=1.5,
                   fill_color=ManimColor(color).darker(0.3), fill_opacity=0.9)
    return VGroup(side, top, front)


def tiny_network(layers=(5, 7, 5), width=2.6, height=2.8, color=GREY_B, r=0.11):
    cols = VGroup()
    for k, n in enumerate(layers):
        col = VGroup(*[Circle(r, stroke_color=color, stroke_width=2, fill_color=BLACK, fill_opacity=1)
                       for _ in range(n)])
        col.arrange(DOWN, buff=(height - n * 2 * r) / max(n - 1, 1))
        col.move_to(RIGHT * (k - (len(layers) - 1) / 2) * width / max(len(layers) - 1, 1))
        cols.add(col)
    edges = VGroup()
    for a, b in zip(cols[:-1], cols[1:]):
        for c1 in a:
            for c2 in b:
                edges.add(Line(c1.get_center(), c2.get_center(), stroke_width=0.8, stroke_color=GREY_D))
    return VGroup(edges, cols)


def action_glyph(a: int, color=style.ACTION, length=0.5, width=6):
    """ゲームの行動: 左 / そのまま / 右。"""
    if a == ACT_NOOP:
        return Dot(radius=0.09 * length / 0.5, color=color)
    v = RIGHT * a * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.45,
                 max_stroke_width_to_length_ratio=14)


def section_tag(text):
    return jt(text, size=30, color=GREY_B).to_corner(UL, buff=0.45)


def polyline(points, color=WHITE, width=4, opacity=1.0):
    m = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    m.set_points_as_corners([np.array(p) for p in points])
    return m


def smooth_curve(points, color=WHITE, width=4):
    m = VMobject(stroke_color=color, stroke_width=width)
    m.set_points_smoothly([np.array(p) for p in points])
    return m


# ---------------------------------------------------------------------------
# タイトル（common.titles.play_title_card と同じ演出。長いタイトルが画面からはみ出さないよう縮める）
# ---------------------------------------------------------------------------
def play_title_card_fit(scene, number: int, title: str, subtitle: str | None = None, hold: float = 2.6,
                        max_width: float = 12.4):
    from manim import Create, FadeIn, FadeOut, Write
    from common.titles import SERIES_TITLE
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


# ---------------------------------------------------------------------------
# 手書き数字（第1章と同じ「7」）
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
    frame = Rectangle(width=size + 0.04, height=size + 0.04, color=GREY_C, stroke_width=1.5)
    return VGroup(grp, frame)


# ---------------------------------------------------------------------------
# 縦棒グラフ（負の値も描ける）
# ---------------------------------------------------------------------------
class Bars(VGroup):
    """values を縦棒で。baseline は y=0 の線。scale は値1あたりの高さ。"""

    def __init__(self, values, labels=None, slot=1.0, scale=1.0, bar_ratio=0.6, colors=None,
                 label_buff=0.2, **kw):
        super().__init__(**kw)
        n = len(values)
        self.n, self.slot, self.scale_, self.bar_ratio = n, slot, scale, bar_ratio
        self.baseline = Line(LEFT * n * slot / 2, RIGHT * n * slot / 2, stroke_color=GREY_C, stroke_width=2)
        colors = colors or [style.VALUE] * n
        self.bars = VGroup(*[Rectangle(width=slot * bar_ratio, height=0.01, stroke_width=0,
                                       fill_color=colors[i], fill_opacity=0.9) for i in range(n)])
        self.add(self.baseline, self.bars)
        self.labels = VGroup()
        if labels is not None:
            for i, l in enumerate(labels):
                l.move_to(self.x_of(i) + DOWN * label_buff)
                self.labels.add(l)
            self.add(self.labels)
        self.values = list(values)
        self.set_values(values)

    def x_of(self, i):
        return self.baseline.get_left() + RIGHT * self.slot * (i + 0.5)

    def top_of(self, i):
        return self.x_of(i) + UP * self.values[i] * self.scale_

    def set_values(self, values):
        for i, (b, v) in enumerate(zip(self.bars, values)):
            h = max(abs(v) * self.scale_, 0.005)
            b.stretch_to_fit_height(h)
            b.move_to(self.x_of(i) + UP * np.sign(v) * h / 2 if v != 0 else self.x_of(i))
        self.values = list(values)
        return self
