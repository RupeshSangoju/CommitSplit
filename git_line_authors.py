#!/usr/bin/env python3
"""
Usage: python git_line_authors.py <file> [--include-whitespace]
"""

import subprocess, sys, os, argparse
from collections import defaultdict

RESET  = "\033[0m";  BOLD = "\033[1m";  DIM = "\033[2m"
PALETTE = ["\033[31m","\033[32m","\033[33m","\033[34m",
           "\033[35m","\033[36m","\033[91m","\033[92m","\033[93m","\033[94m"]

def run(cmd, cwd):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout

def get_blame_stats(filepath, ignore_whitespace=True):
    filepath = os.path.abspath(filepath)
    dirpath  = os.path.dirname(filepath)

    try:
        run(["git", "rev-parse", "--is-inside-work-tree"], dirpath)
    except RuntimeError:
        raise RuntimeError("Not inside a git repository.")

    try:
        run(["git", "ls-files", "--error-unmatch", filepath], dirpath)
    except RuntimeError:
        raise RuntimeError("File is not tracked by git. Commit it first.")

    output = run(["git", "blame", "--porcelain", filepath], dirpath)

    author_map = defaultdict(lambda: {"email": "", "lines": 0})
    total_lines = 0
    current_author = current_email = ""
    in_entry = False

    for line in output.split("\n"):
        if len(line) > 40 and line[:40].isalnum() and line[40] == " ":
            in_entry = True
            current_author = current_email = ""
        elif in_entry and line.startswith("author "):
            current_author = line[7:].strip()
        elif in_entry and line.startswith("author-mail "):
            current_email = line[12:].strip().strip("<>")
        elif in_entry and line.startswith("\t"):
            if not ignore_whitespace or line[1:].strip():
                author_map[current_author]["email"] = current_email
                author_map[current_author]["lines"] += 1
                total_lines += 1
            in_entry = False

    stats = [
        {"author": a, "email": d["email"], "lines": d["lines"],
         "percentage": d["lines"] / total_lines * 100 if total_lines else 0}
        for a, d in author_map.items()
    ]
    stats.sort(key=lambda x: x["lines"], reverse=True)
    return stats, total_lines

def color_for(name):
    h = 0
    for ch in name:
        h = (h * 31 + ord(ch)) & 0xFFFFFFF
    return PALETTE[h % len(PALETTE)]

def print_table(stats, total_lines, filename):
    BAR_MAX = 30
    print(f"\n{BOLD}Line Authorship  --  {filename}{RESET}")
    print(f"{DIM}Total tracked lines: {total_lines:,}{RESET}\n")

    ca = max(len(s["author"]) for s in stats) + 2
    ce = max(len(s["email"])  for s in stats) + 2

    hdr = f"  {'#':<4}{'Author':<{ca}}{'Email':<{ce}}{'Lines':>8}  {'%':>7}  Contribution"
    print(f"{BOLD}{DIM}{hdr}{RESET}")
    print(DIM + "─" * (len(hdr) + BAR_MAX) + RESET)

    for i, s in enumerate(stats):
        c  = color_for(s["author"])
        filled = round(s["percentage"] / 100 * BAR_MAX)
        bar = "█" * filled + "░" * (BAR_MAX - filled)
        print(f"  {i+1:<4}{c}{BOLD}{s['author']:<{ca}}{RESET}"
              f"{DIM}{s['email']:<{ce}}{RESET}"
              f"{s['lines']:>8,}  {s['percentage']:>6.1f}%  {c}{bar}{RESET}")
    print()

def main():
    ap = argparse.ArgumentParser(description="Per-author line stats for a git file.")
    ap.add_argument("file")
    ap.add_argument("--include-whitespace", action="store_true")
    args = ap.parse_args()

    if not os.path.isfile(args.file):
        print(f"Error: file not found: {args.file}", file=sys.stderr); sys.exit(1)

    try:
        stats, total = get_blame_stats(args.file, not args.include_whitespace)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr); sys.exit(1)

    if not stats:
        print("No blame data. Commit the file first."); sys.exit(0)

    print_table(stats, total, os.path.basename(args.file))

if __name__ == "__main__":
    main()
