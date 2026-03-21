import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import {
  parseMarkdownBlocks,
  stripInlineMarkdown,
  type MarkdownBlock,
} from "@/lib/documents/markdown-export";

export type GeneratedActExportFormat = "md" | "docx";

export type GeneratedActExportPayload = {
  title: string;
  companyName: string;
  documentTypeLabel: string;
  version: number | null;
  markdown: string;
};

function createParagraph(text: string) {
  return new Paragraph({
    spacing: { after: 180, line: 276 },
    children: [
      new TextRun({
        text,
        font: "Aptos",
        size: 24,
      }),
    ],
  });
}

function createListParagraph(text: string, ordered = false) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    bullet: ordered ? undefined : { level: 0 },
    numbering: ordered
      ? {
          reference: "generated-act-numbering",
          level: 0,
        }
      : undefined,
    children: [
      new TextRun({
        text,
        font: "Aptos",
        size: 24,
      }),
    ],
  });
}

function createDocxParagraphs(blocks: MarkdownBlock[]) {
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      paragraphs.push(
        new Paragraph({
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
          spacing: { before: 260, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              font: "Aptos Display",
            }),
          ],
        })
      );
      continue;
    }

    if (block.type === "paragraph") {
      paragraphs.push(createParagraph(block.text));
      continue;
    }

    if (block.type === "blockquote") {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 180, line: 276 },
          indent: { left: 480 },
          border: {
            left: {
              color: "15803D",
              size: 18,
              space: 6,
              style: "single",
            },
          },
          children: [
            new TextRun({
              text: block.text,
              italics: true,
              color: "334155",
              font: "Aptos",
              size: 24,
            }),
          ],
        })
      );
      continue;
    }

    if (block.type === "bullet-list") {
      for (const item of block.items) {
        paragraphs.push(createListParagraph(item));
      }
      continue;
    }

    if (block.type === "ordered-list") {
      for (const item of block.items) {
        paragraphs.push(createListParagraph(item, true));
      }
    }
  }

  return paragraphs;
}

export async function buildDocxBuffer(payload: GeneratedActExportPayload) {
  const blocks = parseMarkdownBlocks(payload.markdown);
  const doc = new Document({
    creator: "AI Crisi",
    title: payload.title,
    description: `${payload.documentTypeLabel} - ${payload.companyName}`,
    numbering: {
      config: [
        {
          reference: "generated-act-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: payload.title,
                bold: true,
                font: "Aptos Display",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: `${payload.companyName} - ${payload.documentTypeLabel}${
                  payload.version ? ` - v${payload.version}` : ""
                }`,
                italics: true,
                color: "475569",
                font: "Aptos",
              }),
            ],
          }),
          ...createDocxParagraphs(blocks),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function buildMarkdownBuffer(payload: GeneratedActExportPayload) {
  return Buffer.from(payload.markdown, "utf8");
}

export function buildExportFilename(params: {
  baseFilename: string;
  format: GeneratedActExportFormat;
}) {
  const stem = params.baseFilename.replace(/\.md$/i, "");
  return `${stem}.${params.format}`;
}

export function getContentType(format: GeneratedActExportFormat) {
  if (format === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "text/markdown; charset=utf-8";
}

export function normalizeExportFormat(format: string | null | undefined) {
  if (format === "docx" || format === "md") {
    return format;
  }

  return "md";
}

export function buildExportPayload(params: {
  title: string;
  companyName: string;
  documentTypeLabel: string;
  version: number | null;
  markdown: string;
}): GeneratedActExportPayload {
  return {
    title: stripInlineMarkdown(params.title),
    companyName: stripInlineMarkdown(params.companyName),
    documentTypeLabel: stripInlineMarkdown(params.documentTypeLabel),
    version: params.version,
    markdown: params.markdown,
  };
}

