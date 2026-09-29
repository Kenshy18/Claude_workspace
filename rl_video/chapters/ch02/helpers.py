"""第2章だけで使う部品と、画面に出す数値（すべて common/rl.py で実際に計算したもの）。"""
from __future__ import annotations

import numpy as np
from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, Arrow, ChangeDecimalToValue, DecimalNumber, Square,
                   GREY_B, GREY_D, GREY_E, LineJointType, Polygon, RoundedRectangle, VGroup,
                   VMobject, WHITE)

from common import style
from common.mobjects import ACTION_VEC, GridView, value_color
from common.rl import ACTIONS, DOWN as A_DOWN, LEFT as A_LEFT, RIGHT as A_RIGHT, UP as A_UP, main_world
from common.style import jt, mt

# ---------------------------------------------------------------------------
# 数値
# ---------------------------------------------------------------------------
WORLD = main_world()
GAMMA = WORLD.gamma
GOAL, PIT = (4, 3), (4, 2)
NONTERM = [s for s in WORLD.states if not WORLD.is_terminal(s)]  # 15 マス

UNIFORM = WORLD.uniform_policy()
PE_HIST = WORLD.policy_evaluation(UNIFORM, iters=1000)  # 一様ランダム方策の反復方策評価
V_UNI = PE_HIST[-1]
Q_UNI = WORLD.q_from_v(V_UNI)

VI_HIST = WORLD.value_iteration()  # 価値反復
V_STAR = VI_HIST[-1]
Q_STAR = WORLD.q_from_v(V_STAR)
PI_STAR = WORLD.greedy(V_STAR)


def pe_errors(n=31):
    """反復方策評価の最大誤差 max_s |V_k(s) - V^π(s)|（k = 0..n-1）。"""
    return [max(abs(PE_HIST[k][s] - V_UNI[s]) for s in WORLD.states) for k in range(n)]


def policy_iteration_rounds():
    """方策反復（一様ランダムから開始）。

    返り値: [(V_eval, new_policy, changed_states), ...]
    k 番目の要素は「π_k を評価した価値」と「それに貪欲な π_{k+1}」。
    最後の要素で方策が変わらない（changed_states が空）。
    """
    rounds = []
    pol = UNIFORM
    prev = None
    for _ in range(20):
        V = WORLD.policy_evaluation(pol, iters=2000)[-1]
        g = WORLD.greedy(V)
        changed = [s for s in g if prev is None or prev[s] != g[s]]
        rounds.append((V, g, changed))
        if prev is not None and g == prev:
            break
        prev = g
        pol = {s: {a: (1.0 if a == g.get(s, A_UP) else 0.0) for a in ACTIONS} for s in WORLD.states}
    return rounds


PI_ROUNDS = policy_iteration_rounds()


def clean(v):
    return 0.0 if abs(v) < 0.005 else float(v)


# ---------------------------------------------------------------------------
# 図形の小道具（第1章と同じもの）
# ---------------------------------------------------------------------------
def n_vec(s, n):
    return np.array([n[0] - s[0], n[1] - s[1], 0.0])


def path_line(g: GridView, states, color=GREY_B, jitter=0.0, seed=0, width=4, opacity=1.0,
              offset=ORIGIN):
    """マスの中心を結ぶ折れ線。jitter>0 なら手描き風に揺らす。"""
    rng = np.random.default_rng(seed)
    pts = [g.center_of(s) + offset + rng.uniform(-1, 1, 3) * jitter * g.cell * np.array([1, 1, 0])
           for s in states]
    line = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    line.set_points_as_corners(pts)
    line.joint_type = LineJointType.ROUND
    return line


def arrow_glyph(a, color=style.ACTION, length=0.42, width=5):
    v = ACTION_VEC[a] * length / 2
    return Arrow(-v, v, buff=0, color=color, stroke_width=width, max_tip_length_to_length_ratio=0.4,
                 max_stroke_width_to_length_ratio=14)


def section_tag(text):
    return jt(text, size=30, color=GREY_B).to_corner(UL, buff=0.45)


# ---------------------------------------------------------------------------
# 数式：上付き・下付きのある部品を色分けする
# ---------------------------------------------------------------------------
_PAINT = {
    r"V^{\pi}": [(0, 1, style.VALUE), (1, None, style.POLICY)],
    r"Q^{\pi}": [(0, 1, style.VALUE), (1, None, style.POLICY)],
    r"V^{\pi'}": [(0, 1, style.VALUE), (1, None, style.POLICY)],
    r"V^{*}": [(0, None, style.VALUE)],
    r"Q^{*}": [(0, None, style.VALUE)],
    r"V_k": [(0, 1, style.VALUE)],
    r"V_0": [(0, 1, style.VALUE)],
    r"V_{k+1}": [(0, 1, style.VALUE)],
    r"\mathbb{E}_{\pi}": [(1, None, style.POLICY)],
    r"\sum_{a}": [(1, None, style.ACTION)],
    r"\sum_{s'}": [(1, None, style.STATE)],
    r"\max_{a}": [(3, None, style.ACTION)],
    r"\arg\max_{a}": [(6, None, style.ACTION)],
    r"\pi'": [(0, None, style.POLICY)],
    r"\pi^{*}": [(0, None, style.POLICY)],
    r"\gamma^k": [(0, None, style.GAMMA)],
    r"s_{t-1}": [(0, None, style.STATE)],
    r"s_{t+2}": [(0, None, style.STATE)],
}


def fx(*pieces, size=52, color=WHITE):
    """mt() に加えて、V^π や Σ_a のような部品の中の文字も意味の色で塗る。"""
    m = mt(*pieces, size=size, color=color)
    for part in m.submobjects:
        key = getattr(part, "tex_string", "").strip()
        for i, j, c in _PAINT.get(key, []):
            part[i:j].set_color(c)
    return m


# よく使う式の部品列
def pieces_pi():
    return [r"\pi", "(", "a", r"\mid", "s", ")"]


def pieces_P():
    return ["P", "(", "s'", r"\mid", "s", ",", "a", ")"]


def bellman_pieces(v=r"V^{\pi}", lhs=None, arrow="=", policy=True, vnext=None):
    """V(s) = Σ_a π(a|s) Σ_s' P(s'|s,a) [ r + γ V(s') ] の部品列。"""
    lhs = lhs or [v, "(", "s", ")"]
    vnext = vnext or v
    mid = [r"\sum_{a}", *pieces_pi()] if policy else [r"\max_{a}"]
    return [*lhs, arrow, *mid, r"\sum_{s'}", *pieces_P(), r"\Big[", "r", "+", r"\gamma", vnext, "(", "s'", ")",
            r"\Big]"]


def bellman(v=r"V^{\pi}", size=52, **kw):
    return fx(*bellman_pieces(v, **kw), size=size)


# ---------------------------------------------------------------------------
# ヒートマップ
# ---------------------------------------------------------------------------
def value_labels(g: GridView, V, size=30, states=None, shift=ORIGIN):
    labs = {}
    for s in states or NONTERM:
        d = DecimalNumber(clean(V[s]), num_decimal_places=2, font_size=size, color=WHITE,
                          edge_to_fix=ORIGIN)
        d.move_to(g.center_of(s) + shift)
        labs[s] = d
    return labs


def set_heat(g: GridView, V, labs=None, states=None):
    for s in states or NONTERM:
        g.cells[s].set_fill(value_color(V[s]), 1)
        if labs is not None:
            labs[s].set_value(clean(V[s]))
    return g


def heat_anims(g: GridView, V, labs=None, states=None):
    anims = []
    for s in states or NONTERM:
        anims.append(g.cells[s].animate.set_fill(value_color(V[s]), 1))
        if labs is not None:
            anims.append(ChangeDecimalToValue(labs[s], clean(V[s])))
    return anims


def labels_group(labs):
    return VGroup(*labs.values())


# ---------------------------------------------------------------------------
# 行動価値の三角形
# ---------------------------------------------------------------------------
def tri_points(c, h):
    ul, ur = c + np.array([-h, h, 0]), c + np.array([h, h, 0])
    dr, dl = c + np.array([h, -h, 0]), c + np.array([-h, -h, 0])
    return {A_UP: (ul, ur), A_RIGHT: (ur, dr), A_DOWN: (dr, dl), A_LEFT: (dl, ul)}


def q_tris(center, size, qvals, stroke_width=1.5, stroke=GREY_E):
    """1マス分の4つの三角形（ACTIONS 順: 上右下左）。qvals: {a: Q}。"""
    h = size / 2
    pts = tri_points(np.array(center, dtype=float), h)
    grp = VGroup()
    for a in ACTIONS:
        p = Polygon(np.array(center, dtype=float), *pts[a], stroke_color=stroke, stroke_width=stroke_width,
                    fill_color=value_color(qvals[a]), fill_opacity=1)
        grp.add(p)
    return grp


def q_tri_grid(g: GridView, Q, states=None):
    return {s: q_tris(g.center_of(s), g.cell * 0.985, {a: Q[s, a] for a in ACTIONS})
            for s in states or NONTERM}


def q_tri_labels(center, size, qvals, font=34, dist=0.3):
    out = VGroup()
    for a in ACTIONS:
        d = DecimalNumber(clean(qvals[a]), num_decimal_places=2, font_size=font, color=WHITE,
                          edge_to_fix=ORIGIN)
        d.move_to(np.array(center, dtype=float) + ACTION_VEC[a] * size * dist)
        out.add(d)
    return out


# ---------------------------------------------------------------------------
# 方策の矢印
# ---------------------------------------------------------------------------
def policy_arrow(g: GridView, s, a, color=style.POLICY, length=0.55, stroke_width=6, shift=ORIGIN):
    return g.arrow(s, a, color=color, length=length, stroke_width=stroke_width).shift(shift)


def policy_arrow_map(g: GridView, pi, **kw):
    return {s: policy_arrow(g, s, a, **kw) for s, a in pi.items()}


def cross_glyph(g: GridView, s, color=style.POLICY, length=0.3, stroke_width=3, shift=ORIGIN):
    """一様ランダム方策（4方向に同じ確率）を表す小さな十字の矢印。"""
    c = g.center_of(s) + shift
    return VGroup(*[Arrow(c, c + ACTION_VEC[a] * g.cell * length, buff=0, color=color,
                          stroke_width=stroke_width, max_tip_length_to_length_ratio=0.35,
                          max_stroke_width_to_length_ratio=12) for a in ACTIONS])


def node_box(text, color, size=36, width=None):
    t = jt(text, size=size, color=color)
    box = RoundedRectangle(width=width or t.width + 0.6, height=t.height + 0.5, corner_radius=0.18,
                           stroke_color=color, stroke_width=3, fill_color="#141418", fill_opacity=1)
    return VGroup(box, t.move_to(box))


def local_view(states, center, cell, ref, heat=None):
    """states のマスだけを切り出して拡大した盤面。ref（小数も可）のマス位置が center に来る。

    返り値: (VGroup, pos(s) -> 座標, {s: Square}, {s: アイコン})
    """
    from common.mobjects import goal_icon, pit_icon
    center = np.array(center, dtype=float)

    def pos(s):
        return center + np.array([(s[0] - ref[0]) * cell, (s[1] - ref[1]) * cell, 0.0])

    grp = VGroup()
    cells, icons = {}, {}
    for s in states:
        sq = Square(cell, stroke_color=GREY_D, stroke_width=2, fill_color=style.BG, fill_opacity=1).move_to(pos(s))
        if s in WORLD.walls:
            sq.set_fill("#3A3A40", 1)
        elif heat is not None and s not in WORLD.terminals:
            sq.set_fill(value_color(heat[s]), 1)
        cells[s] = sq
        grp.add(sq)
    for s in states:
        if s in WORLD.terminals:
            ic = goal_icon(0.52 * cell) if WORLD.terminals[s] > 0 else pit_icon(0.62 * cell)
            icons[s] = ic.move_to(pos(s))
            grp.add(ic)
    return grp, pos, cells, icons


def pulse(node, color, scale=1.12):
    """node_box を光らせる。グループ全体に掛けて、箱が文字の上に来ないようにする。"""
    from manim import ApplyFunction, there_and_back

    def f(m):
        m[0].set_stroke(width=9)
        m[1].set_color(WHITE)
        m.scale(scale)
        return m
    return ApplyFunction(f, node, rate_func=there_and_back)


# ---------------------------------------------------------------------------
# v2: 価値の3D地形（第1章 Outro3D と同じ見た目）
# ---------------------------------------------------------------------------
TERRAIN_CELL = 1.25


def terrain_height(v):
    """第1章 Outro3D と同じ換算（価値 0 で 0.25、価値 1 で 3.25）。"""
    return 0.25 + 3.0 * v


def terrain_pos(s, cell=TERRAIN_CELL):
    W, H = WORLD.width, WORLD.height
    origin = np.array([-(W - 1) * cell / 2, -(H - 1) * cell / 2, 0])
    return origin + np.array([s[0] * cell, s[1] * cell, 0])


def terrain_tile(s, v, cell=TERRAIN_CELL, depth=None):
    from manim import OUT, Prism
    h = terrain_height(v) if depth is None else depth
    p = Prism(dimensions=[cell * 0.94, cell * 0.94, h])
    p.set_fill(value_color(v), 1).set_stroke(GREY_E, 0.6)
    p.move_to(terrain_pos(s, cell) + h / 2 * OUT)
    return p


def terrain_walls(cell=TERRAIN_CELL):
    from manim import OUT, Prism
    return VGroup(*[Prism(dimensions=[cell * 0.94, cell * 0.94, 0.3]).set_fill("#3A3A40", 1).set_stroke(GREY_E, 0.6)
                    .move_to(terrain_pos(s, cell) + 0.15 * OUT) for s in WORLD.walls])


def terrain_extras(cell=TERRAIN_CELL):
    """床の枠線、星（球）、穴（円）。"""
    from manim import OUT, RED, Circle, Sphere
    board = VGroup(*[Square(cell, stroke_color=GREY_D, stroke_width=1.5).move_to(terrain_pos((x, y), cell))
                     for x in range(WORLD.width) for y in range(WORLD.height)])
    goal = Sphere(radius=0.28, resolution=(12, 24)).set_color(style.REWARD).move_to(terrain_pos(GOAL, cell) + 0.3 * OUT)
    pit = Circle(radius=0.42, stroke_color=RED, stroke_width=4, fill_color="#050506", fill_opacity=1)
    pit.move_to(terrain_pos(PIT, cell))
    return board, goal, pit


def tile_anim(tile, s, v, cell=TERRAIN_CELL):
    """柱の高さと色を価値 v に合わせるアニメーション。"""
    from manim import OUT
    h = terrain_height(v)
    return tile.animate.stretch_to_fit_depth(h).move_to(terrain_pos(s, cell) + h / 2 * OUT).set_fill(value_color(v), 1)


# ---------------------------------------------------------------------------
# v2: 縮小写像の実験（同じ方策の評価を、違う初期値から2本走らせる）
# ---------------------------------------------------------------------------
def pe_step(V, policy=None):
    policy = policy or UNIFORM
    out = {}
    for s in WORLD.states:
        if WORLD.is_terminal(s):
            out[s] = 0.0
            continue
        out[s] = sum(pa * sum(p * (r + (0 if WORLD.is_terminal(n) else GAMMA * V[n]))
                              for p, n, r in WORLD.outcomes(s, a)) for a, pa in policy[s].items())
    return out


def two_start_runs(n=31, seed=7):
    """全部0から と [-1,1] の乱数から の反復方策評価。(histA, histB, dist)"""
    rng = np.random.default_rng(seed)
    A = {s: 0.0 for s in WORLD.states}
    B = {s: (0.0 if WORLD.is_terminal(s) else float(rng.uniform(-1, 1))) for s in WORLD.states}
    ha, hb, d = [], [], []
    for _ in range(n):
        ha.append(A)
        hb.append(B)
        d.append(max(abs(A[s] - B[s]) for s in WORLD.states))
        A, B = pe_step(A), pe_step(B)
    return ha, hb, d
