#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_corpus.py — tier-2 코드 코퍼스를 브라우저 번들로 emit.

corpus/**/* 의 모든 텍스트 파일을 window.CORPUS = { "상대경로": "내용" } 로 직렬화.
에이전트의 tier-2 도구(grep_code·read_file·find_refs)가 이 위에서 동작한다.
(실제 프로덕션은 라이브 레포 grep 으로 무손실 스왑 — 데모는 번들 동봉, 인터페이스 동일.)
"""
import json, os, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

def build():
    corpus = {}
    for p in sorted(glob.glob(os.path.join(ROOT, "corpus", "**", "*"), recursive=True)):
        if os.path.isfile(p):
            rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
            with open(p, encoding="utf-8") as f:
                corpus[rel] = f.read()
    return corpus

if __name__ == "__main__":
    corpus = build()
    out = os.path.join(ROOT, "data", "corpus-index.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 생성됨: build/build_corpus.py — 직접 수정 금지. window.CORPUS 전역.\n")
        f.write("window.CORPUS = ")
        json.dump(corpus, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write(";\n")
    print(f"[corpus] {len(corpus)} files → {os.path.normpath(out)}")
    for k in corpus:
        print(f"  {k}")
