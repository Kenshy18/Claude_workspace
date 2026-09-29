// Cut boundaries of the real 1995 OP, measured frame-by-frame (30 fps) from reference/op_original.mp4
// (frame differences + visual check of every frame in the fast sections). f0 = first frame of the cut.
// The storyboard writes each cut's true duration in 24-koma seconds ("s+k"), with boundaries rounded to
// the nearest koma so the column adds up exactly to 1'30"+12 (90.5 s = 2172 koma).
const CUT_F0 = [
  0, 72, 219, 312, 425, 479, 523, 547, 687, 702,            // C-001..010  intro, title, verse A
  1136, 1249, 1452, 1510, 1525, 1542, 1554, 1568, 1574, 1583, // C-011..020  verse B, pre-chorus
  1637, 1659, 1697, 1752, 1764, 1778, 1791, 1806, 1864, 1871, // C-021..030
  1876, 1891, 1903, 1916,                                    // C-031..034  (wings)
  2002, 2016, 2018, 2023, 2030, 2042, 2046, 2057, 2061, 2068, // C-035..044  chorus
  2075, 2080, 2082, 2086, 2092, 2098, 2105, 2112, 2115, 2137, // C-045..054
  2141, 2152, 2156, 2167, 2171, 2178, 2182, 2190, 2198, 2206, // C-055..064
  2211, 2220, 2226, 2230, 2236, 2240, 2242, 2245, 2248, 2254, // C-065..074
  2264, 2267, 2279, 2284, 2294, 2310, 2316, 2322, 2330, 2336, // C-075..084
  2342, 2364, 2366, 2376, 2380, 2389, 2391, 2394, 2404, 2410, // C-085..094
  2415, 2422, 2429, 2434, 2441, 2449, 2471, 2479, 2511, 2589, // C-095..104
  2618, 2630, 2638, 2646,                                    // C-105..108
];
const TOTAL_F = 2715;
const koma = (f) => Math.round(f * 24 / 30);
function secKoma(k) { return `${Math.floor(k / 24)}+${k % 24}`; }
function totalStr(k) { const s = Math.floor(k / 24), m = Math.floor(s / 60); return (m ? `${m}′` : '') + `${String(s % 60).padStart(m ? 2 : 1, '0')}″+${k % 24}`; }
