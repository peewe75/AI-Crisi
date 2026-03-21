import io
import json
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer


def strip_inline_markdown(value: str) -> str:
    replacements = [
        ("**", ""),
        ("__", ""),
        ("`", ""),
        ("~~", ""),
    ]
    result = value
    for src, dest in replacements:
        result = result.replace(src, dest)
    return result.strip()


def parse_blocks(markdown: str):
    lines = markdown.replace("\r\n", "\n").split("\n")
    blocks = []
    paragraph = []
    i = 0

    def flush_paragraph():
        nonlocal paragraph
        text = strip_inline_markdown(" ".join(part.strip() for part in paragraph).strip())
        if text:
            blocks.append({"type": "paragraph", "text": text})
        paragraph = []

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            flush_paragraph()
            i += 1
            continue

        if line.startswith("### ") or line.startswith("## ") or line.startswith("# "):
            flush_paragraph()
            level = 3 if line.startswith("### ") else 2 if line.startswith("## ") else 1
            text = strip_inline_markdown(line[level + 1 :])
            if text:
                blocks.append({"type": "heading", "level": level, "text": text})
            i += 1
            continue

        if line.startswith(">"):
            flush_paragraph()
            quote_lines = [strip_inline_markdown(line[1:].strip())]
            i += 1
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(strip_inline_markdown(lines[i].strip()[1:].strip()))
                i += 1
            blocks.append({"type": "blockquote", "text": " ".join(q for q in quote_lines if q)})
            continue

        if line.startswith("- ") or line.startswith("* "):
            flush_paragraph()
            items = []
            while i < len(lines):
                candidate = lines[i].strip()
                if not (candidate.startswith("- ") or candidate.startswith("* ")):
                    break
                items.append(strip_inline_markdown(candidate[2:].strip()))
                i += 1
            blocks.append({"type": "bullet-list", "items": [item for item in items if item]})
            continue

        if len(line) > 2 and line[0].isdigit() and (line[1:3] == ". " or line[1:3] == ") "):
            flush_paragraph()
            items = []
            while i < len(lines):
                candidate = lines[i].strip()
                if not candidate or not candidate[0].isdigit():
                    break
                marker = ". " if ". " in candidate[:4] else ") " if ") " in candidate[:4] else None
                if marker is None:
                    break
                items.append(strip_inline_markdown(candidate.split(marker, 1)[1].strip()))
                i += 1
            blocks.append({"type": "ordered-list", "items": [item for item in items if item]})
            continue

        paragraph.append(line)
        i += 1

    flush_paragraph()
    return blocks


def build_pdf(payload):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title=payload["title"],
        author="AI Crisi",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ActTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=10,
    )
    meta_style = ParagraphStyle(
        "ActMeta",
        parent=styles["BodyText"],
        alignment=TA_CENTER,
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        spaceAfter=18,
    )
    body_style = ParagraphStyle(
        "ActBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=10,
    )
    quote_style = ParagraphStyle(
        "ActQuote",
        parent=body_style,
        fontName="Helvetica-Oblique",
        leftIndent=10,
        borderPadding=8,
        borderWidth=1,
        borderColor=colors.HexColor("#10b981"),
        borderLeft=True,
        backColor=colors.HexColor("#ecfdf5"),
    )
    heading_styles = {
        1: ParagraphStyle(
            "HeadingOne",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        2: ParagraphStyle(
            "HeadingTwo",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        3: ParagraphStyle(
            "HeadingThree",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=4,
        ),
    }

    story = [
        Paragraph(payload["title"], title_style),
        Paragraph(
            f"{payload['companyName']} - {payload['documentTypeLabel']}"
            + (f" - v{payload['version']}" if payload.get("version") else ""),
            meta_style,
        ),
        Spacer(1, 4),
    ]

    for block in parse_blocks(payload["markdown"]):
        block_type = block["type"]
        if block_type == "heading":
            story.append(Paragraph(block["text"], heading_styles[block["level"]]))
        elif block_type == "paragraph":
            story.append(Paragraph(block["text"], body_style))
        elif block_type == "blockquote":
            story.append(Paragraph(block["text"], quote_style))
        elif block_type == "bullet-list":
            items = [
                ListItem(Paragraph(item, body_style), leftIndent=12)
                for item in block["items"]
            ]
            story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=16))
            story.append(Spacer(1, 6))
        elif block_type == "ordered-list":
            items = [
                ListItem(Paragraph(item, body_style), leftIndent=12)
                for item in block["items"]
            ]
            story.append(ListFlowable(items, bulletType="1", leftIndent=16))
            story.append(Spacer(1, 6))

    doc.build(story)
    return buffer.getvalue()


def main():
    payload = json.loads(sys.stdin.read())
    sys.stdout.buffer.write(build_pdf(payload))


if __name__ == "__main__":
    main()

