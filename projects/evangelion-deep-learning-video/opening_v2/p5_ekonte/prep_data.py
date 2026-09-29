"""Precompute every number/curve the p5_ekonte film shows. Output: js/data_p5.js
All values are either computed here (seeded, deterministic) or real published values quoted in NOTES.md."""
import json, math, numpy as np
out = {}
root = '../shared/data/'
g = json.load(open(root + 'grokking.json'))
st = np.array(g['steps']); ta = np.array(g['train_acc']); va = np.array(g['val_acc'])
tl = np.array(g['train_loss']); vl = np.array(g['val_loss'])
# grokking: thin curves (every 250 steps) for pencil plots
idx = np.arange(0, len(st), 5)
out['grok'] = {
    'steps': st[idx].tolist(), 'train_acc': ta[idx].round(4).tolist(), 'val_acc': va[idx].round(4).tolist(),
    'train_loss': tl[idx].round(5).tolist(), 'val_loss': vl[idx].round(4).tolist(),
    'train100': int(st[np.argmax(ta >= 0.999)]),
    'val50': int(st[np.argmax(va >= 0.5)]), 'val99': int(st[np.argmax(va >= 0.99)]),
    'table': [[int(s), float(tl[i]), float(vl[i]), float(ta[i]), float(va[i])] for i, s in enumerate(st) if s % 1000 == 0],
}
snaps = g['snap_steps']; E = np.array(g['emb2d'])
pick = [0, 2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 50, 52, 54, 56, 60, 80, 120]
out['emb'] = {'steps': [snaps[i] for i in pick], 'pts': [E[i].round(3).tolist() for i in pick]}
out['embFinalK'] = int(np.argmax(g['fourier'][-1]) + 1)

# optimizer portraits on an ill-conditioned quadratic f = 1/2 (a u^2 + b v^2), rotated by -25 deg
th = math.radians(-25); R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
Hd = np.diag([1.0, 12.0]); H = R @ Hd @ R.T
f = lambda x: 0.5 * x @ H @ x
grad = lambda x: H @ x
x0 = np.array([-3.2, 1.9])
def run(name, steps=40):
    rng = np.random.default_rng(7)
    x = x0.copy(); path = [x.copy()]; m = np.zeros(2); v = np.zeros(2); G = np.zeros(2)
    for t in range(1, steps + 1):
        gr = grad(x)
        if name == 'sgd':
            gr = gr + rng.normal(0, 0.9, 2); x = x - 0.13 * gr
        elif name == 'momentum':
            m = 0.8 * m + gr; x = x - 0.05 * m
        elif name == 'nesterov':
            gl = grad(x - 0.05 * 0.8 * m); m = 0.8 * m + gl; x = x - 0.05 * m
        elif name == 'adagrad':
            G += gr ** 2; x = x - 0.9 * gr / (np.sqrt(G) + 1e-8)
        elif name == 'adam':
            m = 0.9 * m + 0.1 * gr; v = 0.999 * v + 0.001 * gr ** 2
            mh = m / (1 - 0.9 ** t); vh = v / (1 - 0.999 ** t); x = x - 0.3 * mh / (np.sqrt(vh) + 1e-8)
        elif name == 'gd':
            x = x - 0.155 * gr
        path.append(x.copy())
    return np.array(path).round(4).tolist()
out['opt'] = {k: run(k) for k in ['sgd', 'momentum', 'nesterov', 'adagrad', 'adam', 'gd']}
out['optH'] = H.round(5).tolist()
out['optFinal'] = {k: round(float(f(np.array(v[-1]))), 5) for k, v in out['opt'].items()}

# Chinchilla (Hoffmann et al. 2022, approach 3 fit): L = E + A/N^a + B/D^b, C = 6ND
Ec, A, B, al, be = 1.69, 406.4, 410.7, 0.34, 0.28
Gc = (al * A / (be * B)) ** (1 / (al + be))
def nopt(C): return Gc * (C / 6) ** (be / (al + be))
def dopt(C): return (C / 6) ** (al / (al + be)) / Gc
iso = []
for C in [1e19, 1e20, 1e21, 1e22, 1e23]:
    Ns = np.logspace(7, 11.6, 60)
    L = Ec + A / Ns ** al + B / (C / (6 * Ns)) ** be
    iso.append({'C': C, 'N': np.log10(Ns).round(3).tolist(), 'L': L.round(4).tolist(), 'Nopt': math.log10(nopt(C)),
                'Lopt': Ec + A / nopt(C) ** al + B / dopt(C) ** be})
out['iso'] = iso
Cg = 5.76e23
out['chin'] = {'a': be / (al + be), 'b': al / (al + be), 'G': Gc, 'NoptGopher': nopt(Cg), 'DoptGopher': dopt(Cg),
               'L70B': Ec + A / 70e9 ** al + B / 1.4e12 ** be, 'C70B': 6 * 70e9 * 1.4e12}

# sinusoidal positional encodings -> per-head dot-product attention softmax(P_h P_h^T / sqrt(d_h))
n, d, heads = 24, 64, 8
pos = np.arange(n)[:, None]; i2 = np.arange(0, d, 2)[None, :]
ang = pos / (10000 ** (i2 / d)); P = np.zeros((n, d)); P[:, 0::2] = np.sin(ang); P[:, 1::2] = np.cos(ang)
att = []
for h in range(heads):
    Ph = P[:, h * 8:(h + 1) * 8]
    Ph = (Ph - Ph.mean(0)) / (Ph.std(0) + 1e-6)          # centred + standardised band (so slow bands still vary)
    S = Ph @ Ph.T / math.sqrt(8) * 1.5
    S = S - S.max(1, keepdims=True); Aw = np.exp(S); Aw /= Aw.sum(1, keepdims=True)
    att.append(Aw.round(3).tolist())
out['att'] = att
# one causal query row over 64 keys for the "attention eye" iris (head 1 band, query at position 63)
n2 = 64; pos2 = np.arange(n2)[:, None]; ang2 = pos2 / (10000 ** (i2 / d)); P2 = np.zeros((n2, d)); P2[:, 0::2] = np.sin(ang2); P2[:, 1::2] = np.cos(ang2)
q = P2[40, 8:16] * 3; K = P2[:, 8:16] * 3
s = K @ q / math.sqrt(8); s = s - s.max(); w = np.exp(s); w /= w.sum()
out['eyeRow'] = w.round(4).tolist()

# softmax saturation: 6 logits with Var = d_k = 64 (unscaled) vs /sqrt(64)
rng = np.random.default_rng(3)
qv = rng.normal(0, 1, (6, 64)); kv = rng.normal(0, 1, 64)
z = qv @ kv
sm = lambda z: np.exp(z - z.max()) / np.exp(z - z.max()).sum()
out['sat'] = {'z': z.round(2).tolist(), 'p_raw': sm(z).round(3).tolist(), 'p_scaled': sm(z / 8).round(3).tolist(), 'std_emp': float(np.std(rng.normal(0,1,(4000,64)) @ rng.normal(0,1,64)))}
# empirical Var(q.k) for d = 64 over 20000 draws (shown next to the derivation)
qq = rng.normal(0, 1, (20000, 64)); kk = rng.normal(0, 1, (20000, 64))
out['varEmp'] = float(np.var((qq * kk).sum(1)))

# sklearn digits: three held-out "classmates" + logistic-regression probabilities
from sklearn.datasets import load_digits
from sklearn.linear_model import LogisticRegression
dg = load_digits(); X, y = dg.data / 16.0, dg.target
hold = [int(np.where(y == c)[0][5]) for c in (3, 7, 2, 0, 5)]
mask = np.ones(len(y), bool); mask[hold] = False
clf = LogisticRegression(max_iter=2000, C=1.0).fit(X[mask], y[mask])
pr = clf.predict_proba(X[hold])
out['digits'] = [{'img': (X[i].reshape(8, 8)).round(3).tolist(), 'y': int(y[i]), 'p': float(pr[j, y[i]]), 'pred': int(pr[j].argmax())} for j, i in enumerate(hold)]
out['digitsAcc'] = float(clf.score(X[mask], y[mask]))

# Adam bias correction factors 1/(1-b^t)
out['adamCorr'] = {'t': list(range(1, 41)), 'c1': [1 / (1 - 0.9 ** t) for t in range(1, 41)], 'c2': [1 / (1 - 0.999 ** t) for t in range(1, 41)]}

# Transformer lr schedule (Vaswani+ 2017 eq. 3): d^-0.5 * min(s^-0.5, s * w^-1.5), d=512, w=4000
ss = np.linspace(1, 100000, 200)
out['lr'] = {'s': ss.round(0).tolist(), 'lr': (512 ** -0.5 * np.minimum(ss ** -0.5, ss * 4000 ** -1.5)).round(7).tolist(), 'peak': float(512 ** -0.5 * 4000 ** -0.5)}

# ILSVRC top-5 classification error of the winning entries (published)
out['ilsvrc'] = [[2010, 28.2], [2011, 25.8], [2012, 15.3], [2013, 11.7], [2014, 6.7], [2015, 3.57]]

def conv(o):
    if isinstance(o, float): return round(o, 6)
    if isinstance(o, list): return [conv(x) for x in o]
    if isinstance(o, dict): return {k: conv(v) for k, v in o.items()}
    return o
open('js/data_p5.js', 'w').write('// generated by prep_data.py — do not edit\nwindow.D5 = ' + json.dumps(conv(out), separators=(',', ':')) + ';\n')
print('chinchilla', out['chin'])
print('optFinal', out['optFinal'])
print('sat', out['sat'], 'varEmp', out['varEmp'])
print('digits', [(d['y'], d['pred'], round(d['p'], 3)) for d in out['digits']], 'acc', out['digitsAcc'])
print('lr peak', out['lr']['peak'])
print('grok', {k: out['grok'][k] for k in ['train100', 'val50', 'val99']})
