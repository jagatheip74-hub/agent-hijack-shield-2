from io import BytesIO
import xml.etree.ElementTree as ET
import zlib
from zipfile import BadZipFile, ZipFile

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
MAX_DOCX_XML_BYTES = 2 * 1024 * 1024
MAX_DOCUMENT_TEXT = 12_000
MAX_PDF_PAGES = 100


def extract_docx_text(content: bytes) -> str:
    if not content or len(content) > MAX_DOCUMENT_BYTES:
        raise ValueError("DOCX files must be between 1 byte and 5 MiB.")

    try:
        with ZipFile(BytesIO(content)) as archive:
            entries = archive.infolist()
            document_entry = next(
                (entry for entry in entries if entry.filename == "word/document.xml"),
                None,
            )
            if document_entry is None:
                raise ValueError("The file is not a valid Word DOCX document.")

            xml_entries = [
                entry for entry in entries
                if entry.filename.startswith("word/") and entry.filename.endswith(".xml")
            ]
            text_parts: list[str] = []
            total_xml_bytes = 0
            total_text_length = 0
            for entry in xml_entries:
                remaining_xml_bytes = MAX_DOCX_XML_BYTES - total_xml_bytes
                if entry.file_size > remaining_xml_bytes:
                    raise ValueError("DOCX text content exceeds the scanner's size limit.")
                with archive.open(entry) as xml_file:
                    xml_content = xml_file.read(remaining_xml_bytes + 1)
                if len(xml_content) > remaining_xml_bytes:
                    raise ValueError("DOCX text content exceeds the scanner's size limit.")
                total_xml_bytes += len(xml_content)
                root = ET.fromstring(xml_content)
                for element in root.iter():
                    if element.tag.rsplit("}", 1)[-1] in {"t", "instrText"} and element.text:
                        text_parts.append(element.text)
                        total_text_length += len(element.text)
                        if total_text_length > MAX_DOCUMENT_TEXT:
                            raise ValueError("DOCX text exceeds the scanner's 12,000-character limit.")

    except BadZipFile as error:
        raise ValueError("The uploaded file is not a valid DOCX archive.") from error
    except ET.ParseError as error:
        raise ValueError("The DOCX contains invalid document XML.") from error
    except (EOFError, NotImplementedError, RuntimeError, zlib.error) as error:
        raise ValueError("The DOCX uses unsupported or encrypted compression.") from error

    text = " ".join(text_parts).strip()
    if not text:
        raise ValueError("No readable text was found in the DOCX.")
    return text


def extract_pdf_text(content: bytes) -> str:
    if not content or len(content) > MAX_DOCUMENT_BYTES:
        raise ValueError("PDF files must be between 1 byte and 5 MiB.")

    try:
        reader = PdfReader(BytesIO(content), strict=True)
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs cannot be scanned; remove the password and try again.")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ValueError(f"PDFs with more than {MAX_PDF_PAGES} pages cannot be scanned.")

        text_parts: list[str] = []
        total_text_length = 0
        for page in reader.pages:
            page_text = page.extract_text() or ""
            total_text_length += len(page_text)
            if total_text_length > MAX_DOCUMENT_TEXT:
                raise ValueError("PDF text exceeds the scanner's 12,000-character limit.")
            if page_text:
                text_parts.append(page_text)
    except PdfReadError as error:
        raise ValueError("The uploaded file is not a readable PDF.") from error

    text = "\n".join(text_parts).strip()
    if not text:
        raise ValueError("No readable text was found in the PDF; image-only PDFs are not supported.")
    return text
