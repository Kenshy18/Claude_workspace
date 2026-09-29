"""動画で見せる数値を「本物」にするための小さな強化学習ライブラリ（numpy のみ）。

画面に出る価値や方策はすべてここで実際に計算したもの。
"""
from __future__ import annotations

import numpy as np

UP, RIGHT, DOWN, LEFT = 0, 1, 2, 3
ACTIONS = [UP, RIGHT, DOWN, LEFT]
DELTA = {UP: (0, 1), RIGHT: (1, 0), DOWN: (0, -1), LEFT: (-1, 0)}
ACTION_NAMES = {UP: "上", RIGHT: "右", DOWN: "下", LEFT: "左"}


class GridMDP:
    """滑りのあるグリッドワールド。

    意図した方向に 1-slip の確率で進み、slip/2 ずつ左右（直交方向）にずれる。
    壁や外周にぶつかるとその場にとどまる。終端マスに入ると報酬を得て終了。
    """

    def __init__(self, width=5, height=4, walls=(), terminals=None, start=(0, 0),
                 step_reward=0.0, slip=0.2, gamma=0.9):
        self.width, self.height = width, height
        self.walls = set(walls)
        self.terminals = dict(terminals or {})
        self.start = start
        self.step_reward = step_reward
        self.slip = slip
        self.gamma = gamma
        self.states = [(x, y) for y in range(height) for x in range(width)
                       if (x, y) not in self.walls]
        self.index = {s: i for i, s in enumerate(self.states)}

    # ---- dynamics -------------------------------------------------------
    def is_terminal(self, s):
        return s in self.terminals

    def move(self, s, a):
        dx, dy = DELTA[a]
        n = (s[0] + dx, s[1] + dy)
        if not (0 <= n[0] < self.width and 0 <= n[1] < self.height) or n in self.walls:
            return s
        return n

    def outcomes(self, s, a):
        """[(確率, 次状態, 報酬)] を返す。"""
        if self.is_terminal(s):
            return [(1.0, s, 0.0)]
        res = {}
        for prob, aa in [(1 - self.slip, a), (self.slip / 2, (a + 1) % 4), (self.slip / 2, (a + 3) % 4)]:
            if prob <= 0:
                continue
            n = self.move(s, aa)
            r = self.step_reward + self.terminals.get(n, 0.0)
            key = (n, r)
            res[key] = res.get(key, 0.0) + prob
        return [(p, n, r) for (n, r), p in res.items()]

    def sample(self, s, a, rng):
        outs = self.outcomes(s, a)
        i = rng.choice(len(outs), p=[o[0] for o in outs])
        _, n, r = outs[i]
        return n, r, self.is_terminal(n)

    # ---- planning -------------------------------------------------------
    def q_from_v(self, V):
        Q = {}
        for s in self.states:
            for a in ACTIONS:
                Q[s, a] = sum(p * (r + (0 if self.is_terminal(n) else self.gamma * V[n]))
                              for p, n, r in self.outcomes(s, a))
        return Q

    def value_iteration(self, iters=100, tol=1e-10):
        """各反復の V（dict）のリストを返す。先頭は全部 0。"""
        V = {s: 0.0 for s in self.states}
        hist = [dict(V)]
        for _ in range(iters):
            Q = self.q_from_v(V)
            newV = {s: (0.0 if self.is_terminal(s) else max(Q[s, a] for a in ACTIONS))
                    for s in self.states}
            delta = max(abs(newV[s] - V[s]) for s in self.states)
            V = newV
            hist.append(dict(V))
            if delta < tol:
                break
        return hist

    def policy_evaluation(self, policy, iters=100, tol=1e-10):
        """policy: dict s -> {a: prob}。各反復の V のリスト。"""
        V = {s: 0.0 for s in self.states}
        hist = [dict(V)]
        for _ in range(iters):
            newV = {}
            for s in self.states:
                if self.is_terminal(s):
                    newV[s] = 0.0
                    continue
                v = 0.0
                for a, pa in policy[s].items():
                    v += pa * sum(p * (r + (0 if self.is_terminal(n) else self.gamma * V[n]))
                                  for p, n, r in self.outcomes(s, a))
                newV[s] = v
            delta = max(abs(newV[s] - V[s]) for s in self.states)
            V = newV
            hist.append(dict(V))
            if delta < tol:
                break
        return hist

    def greedy(self, V):
        Q = self.q_from_v(V)
        return {s: max(ACTIONS, key=lambda a: Q[s, a]) for s in self.states
                if not self.is_terminal(s)}

    def uniform_policy(self):
        return {s: {a: 0.25 for a in ACTIONS} for s in self.states}

    # ---- rollouts -------------------------------------------------------
    def rollout(self, policy, rng, start=None, max_steps=50):
        """policy: dict s -> action（決定的）か s -> {a: p}。[(s, a, r, s')] を返す。"""
        s = start or self.start
        traj = []
        for _ in range(max_steps):
            pa = policy[s]
            if isinstance(pa, dict):
                acts = list(pa)
                a = acts[rng.choice(len(acts), p=[pa[x] for x in acts])]
            else:
                a = pa
            n, r, done = self.sample(s, a, rng)
            traj.append((s, a, r, n))
            s = n
            if done:
                break
        return traj


def discounted_return(rewards, gamma):
    g = 0.0
    for r in reversed(rewards):
        g = r + gamma * g
    return g


# シリーズを通して使う「いつもの世界」
def main_world(**kw) -> GridMDP:
    params = dict(
        width=5, height=4,
        walls=[(1, 1), (1, 2), (3, 2)],
        terminals={(4, 3): 1.0, (4, 2): -1.0},
        start=(0, 0), step_reward=0.0, slip=0.2, gamma=0.9,
    )
    params.update(kw)
    return GridMDP(**params)


def q_learning(mdp: GridMDP, episodes=300, alpha=0.2, eps=0.2, seed=0, max_steps=60,
               record=(), gamma=None, q_init=0.0):
    """表形式の Q 学習（ε-greedy）。

    返り値: (Q, lengths, returns, recorded)。recorded は {エピソード番号: 軌跡}。
    """
    rng = np.random.default_rng(seed)
    g = mdp.gamma if gamma is None else gamma
    Q = {(s, a): q_init for s in mdp.states for a in ACTIONS}
    lengths, returns, recorded = [], [], {}
    record = set(record)
    for ep in range(1, episodes + 1):
        s = mdp.start
        traj = []
        for _ in range(max_steps):
            if rng.random() < eps:
                a = ACTIONS[rng.integers(4)]
            else:
                qs = [Q[s, x] for x in ACTIONS]
                best = [x for x in ACTIONS if qs[x] == max(qs)]
                a = best[rng.integers(len(best))]
            n, r, done = mdp.sample(s, a, rng)
            target = r + (0.0 if done else g * max(Q[n, x] for x in ACTIONS))
            Q[s, a] += alpha * (target - Q[s, a])
            traj.append((s, a, r, n))
            s = n
            if done:
                break
        lengths.append(len(traj))
        returns.append(discounted_return([t[2] for t in traj], g))
        if ep in record:
            recorded[ep] = traj
    return Q, lengths, returns, recorded
