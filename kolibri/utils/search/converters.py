import os
import zipfile

import PyPDF2
from bs4 import BeautifulSoup


def get_pdf_text(filename):
    text = ""
    try:
        pdf = PyPDF2.PdfFileReader(filename)
        for i in range(pdf.numPages):
            page = pdf.getPage(i)
            text += page.extractText()
    except PyPDF2.utils.PdfReadError:
        pass

    return text


def get_text_from_zip(filename):
    text = ""
    zip = zipfile.ZipFile(filename)
    files = zip.namelist()
    for afile in files:
        name_parts = os.path.splitext(afile)
        if len(name_parts) > 1 and name_parts[1].startswith(".htm"):
            content = zip.read(afile)
            text += BeautifulSoup(content).get_text()

    return text


def get_text_for_files(node):
    text = ""
    for afile in node.files.all():
        filename = afile.local_file.get_file_on_disk()
        if not os.path.exists(filename):
            continue
        ext = os.path.splitext(filename)[1]
        if ext == ".pdf":
            text += get_pdf_text(filename)
        elif ext in [".zip", ".epub"]:
            text += get_text_from_zip(filename)
    return text
