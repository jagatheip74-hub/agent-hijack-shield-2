from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "SETUP-ANOTHER-LAPTOP.md"
OUTPUT = ROOT / "Agent-Hijack-Shield-Setup-Guide.pdf"
PAGE_WIDTH = 612
PAGE_HEIGHT = 792
LEFT = 54
TOP = 744
LINE_HEIGHT = 14
MAX_CHARS = 88


def source_lines():
    result = []
    in_code = False
    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if not line:
            result.append("")
            continue
        line = re.sub(r"^#{1,3}\s+", "", line)
        line = re.sub(r"^[-*]\s+", "  - ", line)
        line = re.sub(r"^\d+\.\s+", "  * ", line)
        line = line.replace("`", "")
        prefix = "    " if in_code else ""
        result.extend(textwrap.wrap(prefix + line, width=MAX_CHARS, replace_whitespace=False) or [""])
    return result


def pdf_escape(text):
    safe = text.encode("ascii", "replace").decode("ascii")
    return safe.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines):
    lines_per_page = (TOP - 54) // LINE_HEIGHT
    page_chunks = [lines[i:i + lines_per_page] for i in range(0, len(lines), lines_per_page)]
    objects = [b""]
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids = []

    for chunk in page_chunks:
        content = ["BT", "/F1 10 Tf", f"{LEFT} {TOP} Td", f"{LINE_HEIGHT} TL"]
        for line in chunk:
            if not line:
                content.append("T*")
                continue
            content.append(f"({pdf_escape(line)}) Tj")
            content.append("T*")
        content.append("ET")
        stream = "\n".join(content).encode("ascii")
        content_id = len(objects)
        objects.append(
            b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n"
            + stream + b"\nendstream"
        )
        page_id = len(objects)
        page_ids.append(page_id)
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>".encode("ascii")
        )

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects[1:], start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects)}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        f"trailer\n<< /Size {len(objects)} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    OUTPUT.write_bytes(output)


if __name__ == "__main__":
    make_pdf(source_lines())
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
