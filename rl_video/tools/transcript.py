"""章のナレーションを台本（Markdown）として書き出す。

    python tools/transcript.py ch01            # chapters/ch01/scenes.py -> chapters/ch01/script.md
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from common import tts  # noqa: E402
from tools.narration import extract  # noqa: E402


def main(ch: str):
    src = ROOT / "chapters" / ch / "scenes.py"
    mod_globals: dict = {}
    title = ch
    try:
        code = src.read_text()
        for line in code.splitlines():
            if line.startswith("CHAPTER_TITLE"):
                exec(line, mod_globals)
                title = mod_globals["CHAPTER_TITLE"]
    except Exception:
        pass
    lines = [f"# {title}", "", "（このファイルは `tools/transcript.py` で scenes.py から自動生成）", ""]
    for cls, texts in extract(src):
        lines.append(f"## {cls}")
        lines.append("")
        for t in texts:
            lines.append(tts.display_text(t))
            lines.append("")
    out = src.with_name("script.md")
    out.write_text("\n".join(lines))
    print(out)


if __name__ == "__main__":
    main(sys.argv[1])
