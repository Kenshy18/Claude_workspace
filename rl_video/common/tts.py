"""VOICEVOX によるナレーション合成。

ナレーション文字列には2種類のマークアップが書ける。

    [表示|よみ]   字幕には「表示」を出し、音声では「よみ」を読ませる
    {name}        ブックマーク。その位置が音声の何秒目かを Narration.marks で引ける

文（。！？ で区切る）ごとに合成してつなぐので、字幕のタイミングは文単位で正確。
文の途中のブックマークは「先頭からその位置までのモーラ数」を数え、
全文の AudioQuery の音素長を積算して時刻を求めている。

合成結果は .cache/tts/ に（声・話速・辞書・本文の）ハッシュで保存する。
"""
from __future__ import annotations

import dataclasses
import hashlib
import io
import json
import re
import threading
import wave

import numpy as np

from . import config, lexicon

_FORMAT_VERSION = 3
_TOKEN_RE = re.compile(r"\[([^\]|]*)\|([^\]]*)\]|\{([A-Za-z0-9_]+)\}")
_SENTENCE_END = "。！？!?"
_SILENT = "「」『』"  # 字幕には出すが読み上げない（余計な間が入るため）
_lock = threading.Lock()
_synth = None


@dataclasses.dataclass
class Sentence:
    display: str
    spoken: str
    marks: list  # [(name, spoken_offset)]


@dataclasses.dataclass
class Narration:
    path: str
    duration: float
    marks: dict  # name -> seconds from start
    sentences: list  # [{"start", "end", "text", "kana"}]


def _normalize(markup: str) -> str:
    lines = [ln.strip() for ln in markup.strip().splitlines()]
    return "".join(lines)


def parse(markup: str) -> list[Sentence]:
    """マークアップを文のリストに分解する。"""
    text = _normalize(markup)
    sentences: list[Sentence] = []
    cur = Sentence("", "", [])

    def close():
        nonlocal cur
        if cur.spoken.strip() or cur.marks:
            sentences.append(cur)
        cur = Sentence("", "", [])

    def add_plain(chunk: str):
        for ch in chunk:
            cur.display += ch
            if ch not in _SILENT:
                cur.spoken += ch
            if ch in _SENTENCE_END:
                close()

    pos = 0
    for m in _TOKEN_RE.finditer(text):
        add_plain(text[pos:m.start()])
        if m.group(3) is not None:
            cur.marks.append((m.group(3), len(cur.spoken)))
        else:
            cur.display += m.group(1)
            cur.spoken += m.group(2)
        pos = m.end()
    add_plain(text[pos:])
    close()
    return sentences


def display_text(markup: str) -> str:
    return "".join(s.display for s in parse(markup))


def _get_synth():
    global _synth
    if _synth is not None:
        return _synth
    from voicevox_core import UserDictWord
    from voicevox_core.blocking import (Onnxruntime, OpenJtalk, Synthesizer,
                                        UserDict, VoiceModelFile)

    ort = Onnxruntime.load_once(
        filename=str(config.VENDOR / "onnxruntime/lib/libvoicevox_onnxruntime.so.1.17.3"))
    ojt = OpenJtalk(str(config.VENDOR / "dict"))
    ud = UserDict()
    for surface, pron, accent in lexicon.WORDS:
        ud.add_word(UserDictWord(surface=surface, pronunciation=pron, accent_type=accent))
    ojt.use_user_dict(ud)
    syn = Synthesizer(ort, ojt, cpu_num_threads=4)
    vvm = config.VOICES[config.NARRATOR_STYLE][0]
    with VoiceModelFile.open(str(config.VENDOR / "models" / vvm)) as model:
        syn.load_voice_model(model)
    _synth = syn
    return syn


def _style_query(syn, spoken: str):
    aq = syn.create_audio_query(spoken, config.NARRATOR_STYLE)
    aq.speed_scale = config.SPEED
    aq.pitch_scale = config.PITCH
    aq.intonation_scale = config.INTONATION
    aq.pre_phoneme_length = config.PRE_PHONEME
    aq.post_phoneme_length = config.POST_PHONEME
    for ap in aq.accent_phrases:
        pm = ap.pause_mora
        if isinstance(pm, dict):  # バインディングの都合で dict のことがある
            pm["vowel_length"] *= config.COMMA_PAUSE_SCALE
        elif pm is not None:
            pm.vowel_length *= config.COMMA_PAUSE_SCALE
    return aq


def _mora_starts(aq):
    """各モーラの開始時刻（話速適用前）と全体長を返す。"""
    t = aq.pre_phoneme_length
    starts = []
    for ap in aq.accent_phrases:
        for mora in ap.moras:
            starts.append(t)
            t += (mora.consonant_length or 0.0) + mora.vowel_length
        pm = ap.pause_mora
        if isinstance(pm, dict):
            t += pm["vowel_length"]
        elif pm is not None:
            t += pm.vowel_length
    return starts, t + aq.post_phoneme_length


def _count_moras(syn, text: str) -> int:
    text = text.strip(" 、，,")
    if not text:
        return 0
    try:
        aps = syn.create_accent_phrases(text, config.NARRATOR_STYLE)
    except Exception:
        return 0
    return sum(len(ap.moras) for ap in aps)


def _wav_to_array(data: bytes):
    with wave.open(io.BytesIO(data)) as w:
        sr = w.getframerate()
        frames = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        if w.getnchannels() == 2:
            frames = frames.reshape(-1, 2).mean(axis=1).astype(np.int16)
    return sr, frames


def _cache_key(markup: str) -> str:
    payload = json.dumps([
        _FORMAT_VERSION, config.NARRATOR_STYLE, config.SPEED, config.PITCH,
        config.INTONATION, config.PRE_PHONEME, config.POST_PHONEME,
        config.SENTENCE_GAP, config.COMMA_PAUSE_SCALE, lexicon.WORDS,
        _normalize(markup),
    ], ensure_ascii=False)
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:20]


def synthesize(markup: str) -> Narration:
    key = _cache_key(markup)
    cache = config.CACHE_DIR / "tts"
    wav_path = cache / f"{key}.wav"
    meta_path = cache / f"{key}.json"
    if wav_path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text())
        return Narration(str(wav_path), meta["duration"], meta["marks"], meta["sentences"])

    with _lock:
        syn = _get_synth()
        sentences = parse(markup)
        chunks = []
        marks: dict[str, float] = {}
        subs = []
        t = 0.0
        sr = 24000
        for i, s in enumerate(sentences):
            if not s.spoken.strip():
                for name, _ in s.marks:
                    marks[name] = t
                continue
            if i > 0 and chunks:
                gap = np.zeros(int(sr * config.SENTENCE_GAP), dtype=np.int16)
                chunks.append(gap)
                t += len(gap) / sr
            aq = _style_query(syn, s.spoken)
            sr, audio = _wav_to_array(syn.synthesis(aq, config.NARRATOR_STYLE))
            dur = len(audio) / sr
            starts, total = _mora_starts(aq)
            scale = dur / total if total > 0 else 1.0
            for name, off in s.marks:
                n = _count_moras(syn, s.spoken[:off])
                local = starts[n] if n < len(starts) else total
                marks[name] = t + local * scale
            subs.append({"start": t, "end": t + dur, "text": s.display, "kana": aq.kana})
            chunks.append(audio)
            t += dur
        audio = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.int16)
        cache.mkdir(parents=True, exist_ok=True)
        with wave.open(str(wav_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(audio.tobytes())
        duration = len(audio) / sr
        meta = {"duration": duration, "marks": marks, "sentences": subs}
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return Narration(str(wav_path), duration, marks, subs)


def kana_report(markup: str) -> list[tuple[str, str]]:
    """（字幕表示, 読み）のリスト。読み間違いのチェック用。"""
    syn = _get_synth()
    out = []
    for s in parse(markup):
        if s.spoken.strip():
            out.append((s.display, syn.create_audio_query(s.spoken, config.NARRATOR_STYLE).kana))
    return out
