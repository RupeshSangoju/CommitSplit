# Git Line Authors

See who wrote what. Git Line Authors runs `git blame` on a file and breaks down
how many lines — and what percentage of the file — each contributor actually
wrote. Available as a **VS Code extension** and as a **standalone Python
script** for terminal use.

## Features

- **Status bar summary** — shows the top contributor for the active file at a
  glance (`⎇ Jane Doe: 64%`), updated automatically when you switch files or save.
- **Author stats panel** — a webview with a full breakdown per author: rank,
  avatar (colored initials), email, line count, and a percentage bar.
- **Quick notification view** — a lighter popup with the same stats as plain
  text, with a button to open the full panel.
- **Works on any file, not just the open one** — right-click a file in the
  Explorer sidebar, or run a command from the Palette and pick a file from a
  dialog.
- **Configurable** — toggle the status bar item, and choose whether
  whitespace-only lines count toward the totals.

## Installation

### From a `.vsix` file

1. Build or download `git-line-authors-0.1.0.vsix`.
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **Extensions: Install from VSIX...** and select the file.
4. Reload VS Code when prompted.

### From source

```bash
git clone https://github.com/rupeshsangoju/commitsplit.git
cd commitsplit
npm install
npm run compile
npx vsce package
```

This produces `git-line-authors-<version>.vsix`, installable the same way as above.

### From the Marketplace

Once published, search **"Git Line Authors"** in the Extensions view
(`Ctrl+Shift+X`) and click Install — works the same on every device, no file
download required.

## Usage

| Action | How |
|---|---|
| See top contributor at a glance | Look at the status bar (bottom right) while a tracked file is open |
| Quick stats popup | Command Palette → **Git Line Authors: Show Author Stats for Current File** |
| Full stats panel | Command Palette → **Git Line Authors: Open Author Stats Panel** |
| Stats for a file you haven't opened | Right-click the file in the Explorer sidebar → **Git Line Authors: Open Author Stats Panel** |
| Stats with nothing open | Run either command from the Palette with no editor open — a file picker dialog appears |

The panel and popup both require the file to be tracked by git with at least
one commit; untracked or unsaved files show a warning instead of stats.

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `gitLineAuthors.showOnStatusBar` | `true` | Show the top-contributor summary in the status bar |
| `gitLineAuthors.ignoreWhitespaceOnly` | `true` | Exclude lines that contain only whitespace from the line counts and percentages |

## How it works

Stats come from `git blame --porcelain <file>`, parsed in
[`src/gitBlame.ts`](src/gitBlame.ts). Git's porcelain format only emits an
author's name/email the *first* time their commit appears anywhere in the
output — every later line from that same commit (even in a separate, non-
contiguous chunk) repeats only the commit hash. The parser keeps a
per-commit cache of `{ author, email }` so every line gets attributed
correctly, no matter where in the blame output its commit's metadata was
first introduced.

## Standalone Python script

For terminal-only use without VS Code, [`git_line_authors.py`](git_line_authors.py)
does the same git-blame analysis and prints a colored table directly in your
shell. No dependencies beyond the Python standard library.

```bash
python git_line_authors.py <file> [--include-whitespace]
```

Example:

```
$ python git_line_authors.py src/gitBlame.ts

Line Authorship  --  gitBlame.ts
Total tracked lines: 118

  #   Author      Email                       Lines        %  Contribution
──────────────────────────────────────────────────────────────────────────────
  1   Jane Doe    jane@example.com              94    79.7%  ████████████████████████░░░░░
  2   John Smith  john@example.com              24    20.3%  ██████░░░░░░░░░░░░░░░░░░░░░░░░
```

- `--include-whitespace` counts whitespace-only lines toward the totals (by
  default they're excluded, matching the extension's default behavior).
- The file must be tracked by git with at least one commit, or the script
  exits with an error.

## Requirements

- Git installed and available on your `PATH`.
- The file being analyzed must be inside a git repository and tracked
  (committed at least once).

## Development

```bash
npm install
npm run watch     # recompile on save
```

Press `F5` in VS Code to launch an Extension Development Host for manual
testing.

## License

MIT — see [LICENSE](LICENSE).
