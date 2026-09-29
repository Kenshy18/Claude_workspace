"""
A real grokking run: 2-layer MLP on (a + b) mod p, full-batch AdamW, 30% of pairs for training.
Train accuracy saturates early (memorization); validation accuracy jumps much later (generalization),
and the token embeddings reorganize into a few Fourier modes (circles). Logs everything the
opening films need into grokking.json. Pure NumPy, hand-written backprop.
"""
import json, numpy as np
P, D, HID, FRAC, STEPS = 97, 128, 256, 0.3, 30000
LR, WD, B1, B2 = 1e-3, 1.0, 0.9, 0.98
rng = np.random.default_rng(0)
pairs = np.array([(a, b) for a in range(P) for b in range(P)])
y_all = (pairs[:, 0] + pairs[:, 1]) % P
perm = rng.permutation(len(pairs)); ntr = int(FRAC * len(pairs))
tr, va = perm[:ntr], perm[ntr:]
params = {
    'E': rng.normal(0, 1, (P, D)) / np.sqrt(D),
    'W1': rng.normal(0, 1, (2 * D, HID)) / np.sqrt(2 * D), 'b1': np.zeros(HID),
    'W2': rng.normal(0, 1, (HID, P)) / np.sqrt(HID), 'b2': np.zeros(P),
}
m = {k: np.zeros_like(v) for k, v in params.items()}; v = {k: np.zeros_like(x) for k, x in params.items()}

def forward(idx):
    a, b = pairs[idx, 0], pairs[idx, 1]
    x = np.concatenate([params['E'][a], params['E'][b]], 1)
    h_pre = x @ params['W1'] + params['b1']; h = np.maximum(h_pre, 0)
    logits = h @ params['W2'] + params['b2']
    return a, b, x, h_pre, h, logits

def loss_acc(idx):
    *_, logits = forward(idx)
    lg = logits - logits.max(1, keepdims=True)
    lp = lg - np.log(np.exp(lg).sum(1, keepdims=True))
    y = y_all[idx]
    return float(-lp[np.arange(len(idx)), y].mean()), float((logits.argmax(1) == y).mean())

def fourier_power(E):
    x = np.arange(P)
    pw = []
    for k in range(1, P // 2 + 1):
        c = np.cos(2 * np.pi * k * x / P); s = np.sin(2 * np.pi * k * x / P)
        pw.append(float(np.linalg.norm(c @ E) ** 2 + np.linalg.norm(s @ E) ** 2))
    pw = np.array(pw); return (pw / pw.sum()).round(5).tolist()

log = {'p': P, 'frac': FRAC, 'wd': WD, 'lr': LR, 'steps': [], 'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': [], 'wnorm': [], 'snap_steps': [], 'fourier': [], 'emb2d': []}
for step in range(STEPS + 1):
    if step % 50 == 0:
        tl, ta = loss_acc(tr); vl, vacc = loss_acc(va)
        wn = float(np.sqrt(sum((x ** 2).sum() for x in params.values())))
        for k, val in zip(['steps', 'train_loss', 'val_loss', 'train_acc', 'val_acc', 'wnorm'], [step, tl, vl, ta, vacc, wn]):
            log[k].append(round(val, 5) if isinstance(val, float) else val)
        if step % 1000 == 0: print(step, f'train {tl:.3f}/{ta:.3f}  val {vl:.3f}/{vacc:.3f}  |w| {wn:.1f}', flush=True)
    if step % 250 == 0:
        E = params['E']; fp = fourier_power(E)
        k = int(np.argmax(fp)) + 1; x = np.arange(P)
        # project embeddings onto the dominant Fourier plane (cos/sin directions in embedding space)
        u = np.cos(2 * np.pi * k * x / P) @ E; w = np.sin(2 * np.pi * k * x / P) @ E
        u /= np.linalg.norm(u) + 1e-9; w -= (w @ u) * u; w /= np.linalg.norm(w) + 1e-9
        pts = np.stack([E @ u, E @ w], 1); pts /= np.abs(pts).max() + 1e-9
        log['snap_steps'].append(step); log['fourier'].append(fp); log['emb2d'].append(pts.round(4).tolist())
    if step == STEPS: break
    a, b, x, h_pre, h, logits = forward(tr)
    lg = logits - logits.max(1, keepdims=True); pr = np.exp(lg); pr /= pr.sum(1, keepdims=True)
    pr[np.arange(len(tr)), y_all[tr]] -= 1; dl = pr / len(tr)
    g = {'W2': h.T @ dl, 'b2': dl.sum(0)}
    dh = dl @ params['W2'].T; dh[h_pre <= 0] = 0
    g['W1'] = x.T @ dh; g['b1'] = dh.sum(0)
    dx = dh @ params['W1'].T
    gE = np.zeros_like(params['E']); np.add.at(gE, a, dx[:, :D]); np.add.at(gE, b, dx[:, D:]); g['E'] = gE
    t = step + 1
    for k_ in params:
        m[k_] = B1 * m[k_] + (1 - B1) * g[k_]; v[k_] = B2 * v[k_] + (1 - B2) * g[k_] ** 2
        mh = m[k_] / (1 - B1 ** t); vh = v[k_] / (1 - B2 ** t)
        params[k_] -= LR * (mh / (np.sqrt(vh) + 1e-8) + WD * params[k_])
json.dump(log, open(__file__.replace('.py', '.json'), 'w'), separators=(',', ':'))
print('saved')
