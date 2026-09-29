"""ナレーションの読み（カナ）を一覧して、読み間違いを探す。

    python tools/kana_check.py ch01 [--grep 方策]
"""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from common import tts  # noqa: E402
from tools.narration import extract  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("chapter")
p.add_argument("--grep", default=None)
a = p.parse_args()

for cls, texts in extract(ROOT / "chapters" / a.chapter / "scenes.py"):
    print(f"== {cls}")
    for t in texts:
        for disp, kana in tts.kana_report(t):
            if a.grep and a.grep not in disp:
                continue
            print(f"  {disp}\n    {kana}")
