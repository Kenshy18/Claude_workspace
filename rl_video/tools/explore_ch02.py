"""第2章で画面に出す数値を確認するためのスクリプト（台本づくり用）。"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from common.rl import ACTIONS, DOWN, LEFT, RIGHT, UP, main_world  # noqa: E402

w = main_world()
ARROWS = {UP: "↑", RIGHT: "→", DOWN: "↓", LEFT: "←"}


def show(V, pi=None):
    for y in reversed(range(w.height)):
        row = ""
        for x in range(w.width):
            s = (x, y)
            if s in w.walls:
                row += "   ##   "
            elif s in w.terminals:
                row += f"  [{w.terminals[s]:+.0f}]  "
            else:
                row += f" {V[s]:+.2f}{ARROWS[pi[s]] if pi else ' '} "
        print(row)


hr = w.policy_evaluation(w.uniform_policy(), iters=500)
print("uniform V, sweeps", len(hr))
show(hr[-1])
Vr = hr[-1]
errs = [max(abs(h[s] - Vr[s]) for s in w.states) for h in hr[:30]]
print("errs", [round(e, 4) for e in errs[:12]])
print("ratios", [round(errs[i + 1] / errs[i], 3) for i in range(10)])

pol = w.uniform_policy()
for it in range(8):
    V = w.policy_evaluation(pol, iters=1000)[-1]
    g = w.greedy(V)
    print("PI iter", it)
    show(V, g)
    newpol = {s: {a: (1.0 if a == g.get(s, UP) else 0.0) for a in ACTIONS} for s in w.states}
    if newpol == pol:
        print("stable")
        break
    pol = newpol

vi = w.value_iteration()
print("VI iters", len(vi))
Vs = vi[-1]
Q = w.q_from_v(Vs)
for s in [(4, 1), (3, 1), (4, 0), (2, 3), (3, 3), (0, 0)]:
    print(s, {ARROWS[a]: round(Q[s, a], 3) for a in ACTIONS})
for k in [1, 2, 3, 5, 8, 12, 20]:
    print("VI k", k, {s: round(vi[k][s], 2) for s in [(3, 3), (2, 3), (0, 0), (4, 1)]})
