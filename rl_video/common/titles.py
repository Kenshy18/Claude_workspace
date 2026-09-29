"""章タイトルと終わりのクレジット。"""
from __future__ import annotations

from manim import (DOWN, UP, LEFT, RIGHT, Create, FadeIn, FadeOut, Line, VGroup, Write,
                   GREY_B, GREY_C, GREY_D, WHITE, LaggedStart, smooth)

from . import config as rconf
from . import style

SERIES_TITLE = "強化学習の本質"


def play_title_card(scene, number: int, title: str, subtitle: str | None = None,
                    hold: float = 2.6):
    series = style.jt(f"{SERIES_TITLE}　第{number}章", size=34, color=GREY_B)
    main = style.jt(title, size=76, color=WHITE, weight="MEDIUM")
    group = VGroup(series, main).arrange(DOWN, buff=0.45)
    line = Line(LEFT, RIGHT, stroke_color=GREY_D, stroke_width=2)
    line.set_width(main.width + 1.2).next_to(main, DOWN, buff=0.35)
    items = [series, main, line]
    if subtitle:
        sub = style.jt(subtitle, size=28, color=GREY_C).next_to(line, DOWN, buff=0.35)
        items.append(sub)
    VGroup(*items).move_to(0.2 * UP)
    scene.play(FadeIn(series, shift=0.15 * DOWN), run_time=0.8)
    scene.play(Write(main), Create(line), run_time=1.6)
    if subtitle:
        scene.play(FadeIn(items[-1]), run_time=0.6)
    scene.wait(hold)
    scene.play(*[FadeOut(m) for m in items], run_time=0.9)


def play_end_card(scene, next_title: str | None = None, hold: float = 3.0):
    lines = []
    if next_title:
        lines.append(style.jt("次回", size=32, color=GREY_C))
        lines.append(style.jt(next_title, size=54, color=WHITE, weight="MEDIUM"))
    credit = style.jt(f"ナレーション　{rconf.narrator_credit()}", size=28, color=GREY_C)
    tools = style.jt("アニメーション　Manim Community", size=28, color=GREY_C)
    g_top = VGroup(*lines).arrange(DOWN, buff=0.3) if lines else VGroup()
    g_bot = VGroup(credit, tools).arrange(DOWN, buff=0.18)
    if lines:
        VGroup(g_top, g_bot).arrange(DOWN, buff=1.4)
    scene.play(LaggedStart(*[FadeIn(m, shift=0.1 * UP) for m in [*lines, credit, tools]],
                           lag_ratio=0.2), run_time=1.6)
    scene.wait(hold)
    scene.play(*[FadeOut(m) for m in [*lines, credit, tools]], run_time=1.0)
