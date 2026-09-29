"""見た目の約束事。シリーズを通して同じ概念には同じ色を使う。

    状態 s        BLUE      （青）
    行動 a        GREEN     （緑）
    報酬 r        YELLOW    （黄）
    価値 V, Q     TEAL      （青緑）
    方策 π        PURPLE_B  （紫）
    割引率 γ      ORANGE    （橙）
    パラメータ θ  PINK      （桃）
"""
from __future__ import annotations

from manim import (BLUE, BLUE_E, GREEN, GREY_A, GREY_B, GREY_C, GREY_D, ORANGE, PINK,
                   RED, TEAL, WHITE, YELLOW, MathTex, Tex, TexTemplate, Text, VGroup,
                   config, ManimColor)

BG = "#0B0B0D"
config.background_color = BG

STATE = BLUE
ACTION = GREEN
REWARD = YELLOW
VALUE = TEAL
POLICY = ManimColor("#B189D6")
GAMMA = ORANGE
THETA = PINK
ADV = RED
TEXT = GREY_A
SUBTLE = GREY_C
FAINT = GREY_D

JP_FONT = "Noto Sans CJK JP"
JP_SERIF = "Noto Serif CJK JP"

# xelatex + xeCJK: 日本語と数式を1つの Tex に混ぜたいとき用
JP_TEX = TexTemplate(tex_compiler="xelatex", output_format=".xdv")
JP_TEX.add_to_preamble(r"\usepackage{xeCJK}\setCJKmainfont{Noto Sans CJK JP}")
JP_TEX.add_to_preamble(r"\usepackage{amsmath,amssymb}")

# 数式中で色付けしたい記号の既定マップ（MathTex の {{ }} で切り出したときに使う）
TEX_COLORS = {
    r"s": STATE, r"s'": STATE, r"s_t": STATE, r"s_{t+1}": STATE, r"s_0": STATE,
    r"a": ACTION, r"a'": ACTION, r"a_t": ACTION, r"a_0": ACTION,
    r"r": REWARD, r"r_t": REWARD, r"r_{t+1}": REWARD, r"R": REWARD,
    r"\gamma": GAMMA,
    r"\pi": POLICY,
    r"\theta": THETA,
    r"V": VALUE, r"Q": VALUE,
}


def jt(text: str, size: float = 34, color=TEXT, weight: str = "NORMAL",
       t2c: dict | None = None, font: str = JP_FONT, **kw) -> Text:
    """日本語テキスト。size はおおよそ pt 相当。"""
    return Text(text, font=font, font_size=size, color=color, weight=weight,
                t2c=t2c or {}, **kw)


def jtex(tex: str, size: float = 34, color=TEXT, **kw) -> Tex:
    """日本語混じりの Tex（xelatex）。数式は $...$ で。"""
    return Tex(tex, tex_template=JP_TEX, font_size=size, color=color, **kw)


def mt(*tex: str, size: float = 40, colors: dict | None = None, **kw) -> MathTex:
    """MathTex。{{ }} で囲った部分や分割引数に colors の色を当てる。"""
    kw.setdefault("color", WHITE)
    m = MathTex(*tex, font_size=size, **kw)
    cmap = dict(TEX_COLORS)
    if colors:
        cmap.update(colors)
    for sub in m.submobjects:
        key = getattr(sub, "tex_string", "").strip()
        if key in cmap:
            sub.set_color(cmap[key])
    return m


def label_box(mob, color=GREY_B, buff=0.15, corner=0.08, width=1.5):
    from manim import SurroundingRectangle
    return SurroundingRectangle(mob, color=color, buff=buff, corner_radius=corner,
                                stroke_width=width)

# 文字サイズの目安（1080p で読みやすい大きさ）
FS_TITLE = 48
FS_BODY = 36
FS_SMALL = 28
FS_MATH = 52
