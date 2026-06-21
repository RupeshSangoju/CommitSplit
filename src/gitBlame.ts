import * as cp from "child_process";
import * as path from "path";

export interface AuthorStat {
  author: string;
  email: string;
  lines: number;
  percentage: number;
}

export interface BlameResult {
  stats: AuthorStat[];
  totalLines: number;
  filePath: string;
  isGitRepo: boolean;
}

function runCommand(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function getBlameStats(
  filePath: string,
  ignoreWhitespace: boolean
): Promise<BlameResult> {
  const dir = path.dirname(filePath);

  // Verify this is a git repository
  try {
    await runCommand("git rev-parse --is-inside-work-tree", dir);
  } catch {
    return { stats: [], totalLines: 0, filePath, isGitRepo: false };
  }

  // Check if the file is tracked
  try {
    await runCommand(`git ls-files --error-unmatch "${filePath}"`, dir);
  } catch {
    throw new Error(
      "File is not tracked by git. Commit the file first to see author stats."
    );
  }

  // Run git blame with porcelain format for reliable parsing
  const blameOutput = await runCommand(
    `git blame --porcelain "${filePath}"`,
    dir
  );

  const authorMap = new Map<string, { email: string; lines: number }>();
  // git blame --porcelain only emits author/author-mail the first time a
  // commit's hash appears in the output; later lines from the same commit
  // (whether contiguous or in a separate chunk) only repeat the hash.
  const commitInfo = new Map<string, { author: string; email: string }>();
  let totalLines = 0;

  const lines = blameOutput.split("\n");

  let currentSha = "";
  let currentAuthor = "";
  let currentEmail = "";
  let inEntry = false;

  for (const line of lines) {
    if (/^[0-9a-f]{40} \d+ \d+/.test(line)) {
      // New blame entry header (the trailing line-count field is only
      // present on the first line of a chunk, so don't require it)
      inEntry = true;
      currentSha = line.slice(0, 40);
      const cached = commitInfo.get(currentSha);
      currentAuthor = cached?.author ?? "";
      currentEmail = cached?.email ?? "";
    } else if (inEntry && line.startsWith("author ")) {
      currentAuthor = line.slice("author ".length).trim();
    } else if (inEntry && line.startsWith("author-mail ")) {
      currentEmail = line
        .slice("author-mail ".length)
        .trim()
        .replace(/^<|>$/g, "");
      commitInfo.set(currentSha, { author: currentAuthor, email: currentEmail });
    } else if (inEntry && line.startsWith("\t")) {
      // The actual source line content (tab-prefixed in porcelain)
      const content = line.slice(1);
      const isWhitespaceOnly = content.trim().length === 0;

      if (!ignoreWhitespace || !isWhitespaceOnly) {
        const existing = authorMap.get(currentAuthor);
        if (existing) {
          existing.lines++;
        } else {
          authorMap.set(currentAuthor, { email: currentEmail, lines: 1 });
        }
        totalLines++;
      }
      inEntry = false;
    }
  }

  const stats: AuthorStat[] = Array.from(authorMap.entries())
    .map(([author, { email, lines }]) => ({
      author,
      email,
      lines,
      percentage: totalLines > 0 ? (lines / totalLines) * 100 : 0,
    }))
    .sort((a, b) => b.lines - a.lines);

  return { stats, totalLines, filePath, isGitRepo: true };
}
