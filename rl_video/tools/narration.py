"""シーンファイルからナレーション文字列を抜き出す（ast で静的に解析）。"""
from __future__ import annotations

import ast
import pathlib


def extract(path: str | pathlib.Path) -> list[tuple[str, list[str]]]:
    """[(クラス名, [ナレーション, ...]), ...] をソース順に返す。"""
    tree = ast.parse(pathlib.Path(path).read_text())
    out = []
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        texts = []
        for sub in ast.walk(node):
            if (isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute)
                    and sub.func.attr in ("voice", "say")
                    and isinstance(sub.func.value, ast.Name) and sub.func.value.id == "self"
                    and sub.args
                    and isinstance(sub.args[0], ast.Constant)
                    and isinstance(sub.args[0].value, str)):
                texts.append((sub.lineno, sub.args[0].value))
        texts.sort()
        if texts:
            out.append((node.name, [t for _, t in texts]))
    return out
