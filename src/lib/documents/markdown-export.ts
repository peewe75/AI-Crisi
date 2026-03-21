export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string };

function normalizeLine(line: string) {
  return line.replace(/\r/g, "").trim();
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .trim();
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    const text = stripInlineMarkdown(paragraphBuffer.join(" ").trim());
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphBuffer = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = normalizeLine(rawLine);

    if (!line) {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = stripInlineMarkdown(headingMatch[2] ?? "");
      if (text) {
        blocks.push({ type: "heading", level, text });
      }
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quoteLines = [stripInlineMarkdown(line.replace(/^>\s?/, ""))];
      while (index + 1 < lines.length) {
        const nextLine = normalizeLine(lines[index + 1] ?? "");
        if (!nextLine.startsWith(">")) {
          break;
        }
        quoteLines.push(stripInlineMarkdown(nextLine.replace(/^>\s?/, "")));
        index += 1;
      }
      const text = quoteLines.join(" ").trim();
      if (text) {
        blocks.push({ type: "blockquote", text });
      }
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      const items = [stripInlineMarkdown(bulletMatch[1] ?? "")];
      while (index + 1 < lines.length) {
        const nextLine = normalizeLine(lines[index + 1] ?? "");
        const nextBullet = nextLine.match(/^[-*]\s+(.*)$/);
        if (!nextBullet) {
          break;
        }
        items.push(stripInlineMarkdown(nextBullet[1] ?? ""));
        index += 1;
      }
      blocks.push({ type: "bullet-list", items: items.filter(Boolean) });
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      const items = [stripInlineMarkdown(orderedMatch[1] ?? "")];
      while (index + 1 < lines.length) {
        const nextLine = normalizeLine(lines[index + 1] ?? "");
        const nextOrdered = nextLine.match(/^\d+[.)]\s+(.*)$/);
        if (!nextOrdered) {
          break;
        }
        items.push(stripInlineMarkdown(nextOrdered[1] ?? ""));
        index += 1;
      }
      blocks.push({ type: "ordered-list", items: items.filter(Boolean) });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

