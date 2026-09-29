"""第5章（方策勾配法）で画面に出す数値を計算する。

- 1次元ガウス方策 N(μ, σ²) と報酬の山 R(x): 方策勾配のステップ、勾配推定値のばらつき
- いつもの世界（main_world）での表形式ソフトマックス方策: 軌跡の確率、学習（REINFORCE / Actor-Critic）

乱数はすべてシード固定。numpy だけで、シーンの import 時に重くならないよう関数を呼んだときに計算する。
"""
from __future__ import annotations

import functools
import heapq

import numpy as np

from common.rl import ACTIONS, GridMDP, main_world

# ---------------------------------------------------------------------------
# 1次元ガウス方策
# ---------------------------------------------------------------------------
SIGMA = 1.0          # 方策の標準偏差（固定）
MU0 = -1.6           # 最初の平均
R_CENTER = 2.0       # 報酬の山の位置
R_WIDTH = 1.3        # 報酬の山の幅


def reward_1d(x):
    """報酬 R(x)。右の方に山がある（0〜1）。"""
    x = np.asarray(x, dtype=float)
    return np.exp(-(x - R_CENTER) ** 2 / (2 * R_WIDTH ** 2))


def gauss_pdf(x, mu, sigma=SIGMA):
    x = np.asarray(x, dtype=float)
    return np.exp(-(x - mu) ** 2 / (2 * sigma ** 2)) / (np.sqrt(2 * np.pi) * sigma)


def score_mu(x, mu, sigma=SIGMA):
    """∇_μ log N(x; μ, σ²) = (x − μ) / σ²"""
    return (np.asarray(x, dtype=float) - mu) / sigma ** 2


def _quad(mu, f, sigma=SIGMA, n=4001):
    xs = np.linspace(mu - 9 * sigma, mu + 9 * sigma, n)
    w = gauss_pdf(xs, mu, sigma)
    return float(np.trapezoid(w * f(xs), xs))


def expected_reward(mu, shift=0.0, sigma=SIGMA):
    """E_{x∼N(μ,σ²)}[R(x) + shift]"""
    return _quad(mu, lambda x: reward_1d(x) + shift, sigma)


def true_grad(mu, sigma=SIGMA):
    """∇_μ E[R(x)] = E[R(x) (x−μ)/σ²]（底上げしても変わらない）"""
    return _quad(mu, lambda x: reward_1d(x) * score_mu(x, mu, sigma), sigma)


def pg_steps_1d(mu0=MU0, n=8, steps=7, lr=1.1, seed=3):
    """REINFORCE を数ステップ。各ステップ: dict(mu, xs, R, score, g, mu_next)。"""
    rng = np.random.default_rng(seed)
    mu = mu0
    out = []
    for _ in range(steps):
        xs = np.sort(rng.normal(mu, SIGMA, n))
        R = reward_1d(xs)
        sc = score_mu(xs, mu)
        g = float(np.mean(R * sc))
        out.append(dict(mu=mu, xs=xs, R=R, score=sc, g=g, mu_next=mu + lr * g))
        mu = mu + lr * g
    return out


def grad_estimates(mu, shift=0.0, baseline=None, n=10, batches=4000, seed=11):
    """1バッチ n 個のサンプルから作った勾配推定値を batches 回ぶん。

    baseline=None なら引かない。数値ならその値を引く（行動によらない定数）。
    """
    rng = np.random.default_rng(seed)
    xs = rng.normal(mu, SIGMA, (batches, n))
    ret = reward_1d(xs) + shift
    if baseline is not None:
        ret = ret - baseline
    return (ret * score_mu(xs, mu)).mean(axis=1)


@functools.lru_cache(None)
def baseline_study(mu=MU0 + 0.9, n=10, batches=4000):
    """底上げなし / +5 / +5 からベースライン V を引いた場合の、勾配推定値のばらつき。"""
    V5 = expected_reward(mu, shift=5.0)
    e0 = grad_estimates(mu, 0.0, None, n, batches, seed=11)
    e5 = grad_estimates(mu, 5.0, None, n, batches, seed=11)
    eb = grad_estimates(mu, 5.0, V5, n, batches, seed=11)
    return dict(mu=mu, V5=V5, true=true_grad(mu), e0=e0, e5=e5, eb=eb,
                var0=float(e0.var()), var5=float(e5.var()), varb=float(eb.var()))


# ---------------------------------------------------------------------------
# グリッドワールド: 表形式ソフトマックス方策
# ---------------------------------------------------------------------------
WORLD = main_world()


class Tables:
    """行列形式の遷移（厳密な方策評価用）。"""

    def __init__(self, mdp: GridMDP):
        self.mdp = mdp
        S = len(mdp.states)
        self.S = S
        self.P = np.zeros((S, 4, S))
        self.R = np.zeros((S, 4))
        for s in mdp.states:
            i = mdp.index[s]
            if mdp.is_terminal(s):
                continue
            for a in ACTIONS:
                for p, n, r in mdp.outcomes(s, a):
                    self.R[i, a] += p * r
                    if not mdp.is_terminal(n):
                        self.P[i, a, mdp.index[n]] += p
        self.start = mdp.index[mdp.start]
        self.nonterm = [mdp.index[s] for s in mdp.states if not mdp.is_terminal(s)]

    def values(self, pi):
        """pi: (S, 4) の確率表。V（終端は 0）。"""
        Ppi = np.einsum("sa,sat->st", pi, self.P)
        rpi = (pi * self.R).sum(1)
        return np.linalg.solve(np.eye(self.S) - self.mdp.gamma * Ppi, rpi)

    def J(self, pi):
        return float(self.values(pi)[self.start])


@functools.lru_cache(None)
def tables():
    return Tables(WORLD)


def softmax_rows(theta):
    z = theta - theta.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def _sample_episode(mdp, pi, rng, max_steps):
    s = mdp.start
    traj = []
    for _ in range(max_steps):
        i = mdp.index[s]
        a = int(rng.choice(4, p=pi[i]))
        n, r, done = mdp.sample(s, a, rng)
        traj.append((s, a, r, n))
        s = n
        if done:
            break
    return traj


def actor_critic(episodes=600, lr_actor=0.5, lr_critic=0.3, seed=0, max_steps=100,
                 snap_every=10, gamma_power=False):
    """1ステップ Actor-Critic（表形式ソフトマックス方策 + 表形式の V）。

    返り値: dict(snaps=[(episode, pi)], J=[(episode, J)], returns=[G_0 ...])
    """
    mdp = WORLD
    T = tables()
    rng = np.random.default_rng(seed)
    S = T.S
    theta = np.zeros((S, 4))
    V = np.zeros(S)
    g = mdp.gamma
    snaps, Js, rets = [(0, softmax_rows(theta))], [(0, T.J(softmax_rows(theta)))], []
    Vsnaps = [(0, V.copy())]
    for ep in range(1, episodes + 1):
        s = mdp.start
        I = 1.0
        rews = []
        for _ in range(max_steps):
            i = mdp.index[s]
            pi = softmax_rows(theta[i:i + 1])[0]
            a = int(rng.choice(4, p=pi))
            n, r, done = mdp.sample(s, a, rng)
            j = mdp.index[n]
            delta = r + (0.0 if done else g * V[j]) - V[i]
            V[i] += lr_critic * delta
            grad = -pi
            grad[a] += 1.0
            theta[i] += lr_actor * (I if gamma_power else 1.0) * delta * grad
            I *= g
            rews.append(r)
            s = n
            if done:
                break
        G = 0.0
        for r in reversed(rews):
            G = r + g * G
        rets.append(G)
        if ep % snap_every == 0:
            P = softmax_rows(theta)
            snaps.append((ep, P))
            Js.append((ep, T.J(P)))
            Vsnaps.append((ep, V.copy()))
    return dict(snaps=snaps, J=Js, returns=rets, V=V, theta=theta, Vsnaps=Vsnaps)


def reinforce(episodes=600, lr=0.5, lr_v=0.2, seed=0, max_steps=100, snap_every=10,
              baseline=True):
    """REINFORCE（reward-to-go、ベースライン V は表形式でモンテカルロ学習）。"""
    mdp = WORLD
    T = tables()
    rng = np.random.default_rng(seed)
    theta = np.zeros((T.S, 4))
    V = np.zeros(T.S)
    g = mdp.gamma
    snaps, Js, rets = [(0, softmax_rows(theta))], [(0, T.J(softmax_rows(theta)))], []
    for ep in range(1, episodes + 1):
        pi = softmax_rows(theta)
        traj = _sample_episode(mdp, pi, rng, max_steps)
        G = 0.0
        Gs = []
        for (s, a, r, n) in reversed(traj):
            G = r + g * G
            Gs.append(G)
        Gs.reverse()
        rets.append(Gs[0])
        for (s, a, r, n), Gt in zip(traj, Gs):
            i = mdp.index[s]
            p = softmax_rows(theta[i:i + 1])[0]
            adv = Gt - (V[i] if baseline else 0.0)
            V[i] += lr_v * (Gt - V[i])
            grad = -p
            grad[a] += 1.0
            theta[i] += lr * adv * grad
        if ep % snap_every == 0:
            P = softmax_rows(theta)
            snaps.append((ep, P))
            Js.append((ep, T.J(P)))
    return dict(snaps=snaps, J=Js, returns=rets, V=V, theta=theta)


def optimal():
    """価値反復の V* と最適方策、J*。"""
    V = WORLD.value_iteration()[-1]
    return V, WORLD.greedy(V), V[WORLD.start]


# ---------------------------------------------------------------------------
# 軌跡の確率（「ありうる軌跡」の棒グラフ用）
# ---------------------------------------------------------------------------
def top_trajectories(pi, k=40, max_len=30, min_prob=1e-7, start=None):
    """確率の大きい順に k 本の完結した軌跡を列挙する（最良優先探索）。

    pi: (S, 4)。返り値: [(prob, return, [(s, a, r, s'), ...])]
    """
    mdp = WORLD
    g = mdp.gamma
    heap = [(-1.0, 0, start or mdp.start, ())]
    out = []
    cnt = 1
    while heap and len(out) < k:
        negp, _, s, steps = heapq.heappop(heap)
        p = -negp
        if steps and mdp.is_terminal(steps[-1][3]):
            G = sum(g ** t * x[2] for t, x in enumerate(steps))
            out.append((p, G, list(steps)))
            continue
        if len(steps) >= max_len:
            continue
        i = mdp.index[s]
        for a in ACTIONS:
            pa = pi[i, a]
            if pa <= 0:
                continue
            for q, n, r in mdp.outcomes(s, a):
                pp = p * pa * q
                if pp < min_prob:
                    continue
                heapq.heappush(heap, (-pp, cnt, n, steps + ((s, a, r, n),)))
                cnt += 1
    return out


def traj_prob(pi, steps):
    mdp = WORLD
    p = 1.0
    for s, a, r, n in steps:
        q = sum(pp for pp, nn, rr in mdp.outcomes(s, a) if nn == n)
        p *= pi[mdp.index[s], a] * q
    return p


def exact_grad(theta, start=None):
    """表形式ソフトマックス方策の厳密な方策勾配 ∇_θ V(start)（(S, 4)）。"""
    T = tables()
    mdp = WORLD
    pi = softmax_rows(theta)
    V = T.values(pi)
    Q = T.R + mdp.gamma * np.einsum("sat,t->sa", T.P, V)
    A = Q - V[:, None]
    Ppi = np.einsum("sa,sat->st", pi, T.P)
    e = np.zeros(T.S)
    e[mdp.index[start or mdp.start]] = 1.0
    d = np.linalg.solve(np.eye(T.S) - mdp.gamma * Ppi.T, e)  # 割引訪問頻度
    return d[:, None] * pi * A


def sample_returns(pi, n, seed, start=None, max_steps=100):
    """方策 pi で n 回走らせた G_0 のリスト。"""
    rng = np.random.default_rng(seed)
    mdp = WORLD
    out = []
    for _ in range(n):
        s = start or mdp.start
        rews = []
        for _ in range(max_steps):
            i = mdp.index[s]
            a = int(rng.choice(4, p=pi[i]))
            s, r, done = mdp.sample(s, a, rng)
            rews.append(r)
            if done:
                break
        G = 0.0
        for r in reversed(rews):
            G = r + mdp.gamma * G
        out.append(G)
    return out


# ---------------------------------------------------------------------------
# おもちゃの言語モデル（Intuition の言語モデルの例）
# ---------------------------------------------------------------------------
LM_PROMPT = "日本の首都は"
# 位置ごとの候補トークンと、今の方策の確率（ロジット = log p とみなす）
LM_TABLE = [
    (["東京", "大阪", "京都", "名古屋"], [0.45, 0.30, 0.15, 0.10]),
    (["です", "。", "だ", "かな"], [0.60, 0.20, 0.12, 0.08]),
    (["。", "よ", "ね", "！"], [0.70, 0.12, 0.10, 0.08]),
]


def lm_update(choice, weight, lr=1.0):
    """選んだトークン列 choice（位置ごとの候補番号）の対数確率を weight で重み付けして1回更新する。

    ソフトマックスのロジット z に z += lr * weight * (onehot - p) を足す（= ∇ log p の方向）。
    返り値: [(トークン, 更新前の確率, 更新後の確率)]
    """
    out = []
    for (toks, p), k in zip(LM_TABLE, choice):
        p = np.asarray(p, dtype=float)
        onehot = np.eye(len(p))[k]
        z = np.log(p) + lr * weight * (onehot - p)
        q = np.exp(z - z.max())
        q /= q.sum()
        out.append((toks[k], float(p[k]), float(q[k])))
    return out
