"""
This module contains constants representing the extensions of FileFormat.
"""
from django.utils.translation import ugettext_lazy as _

# constants for Video format
AVI = ".avi"
MP4 = ".mp4"
MOV = ".mov"
WEBM = ".webm"
FLV = ".flv"
MKV = ".mkv"
RM = ".rm"
RMVB = ".rmvb"

# constants for Subtitle format
SSF = ".ssf"

# constants for Audio format
MP3 = ".mp3"
AAC = ".aac"
OGG = ".ogg"

# constants for Exercise format
HTML = ".html"
CSS = ".css"

# constants for Document format
PDF = ".pdf"
TXT = ".txt"

# constants for Image format
PNG = ".png"
JPEG = ".jpeg"
BMP = ".bmp"
GIF = ".gif"
SVG = ".svg"

choices = (
    (AVI, _("avi")),
    (MP4, _("mp4")),
    (MOV, _("mov")),
    (WEBM, _("webm")),
    (FLV, _("flv")),
    (MKV, _("mkv")),
    (RM, _("rm")),
    (RMVB, _("rmvb")),

    (SSF, _("ssf")),

    (MP3, _("mp3")),
    (AAC, _("aac")),
    (OGG, _("ogg")),

    (HTML, _("html")),
    (CSS, _("css")),

    (PDF, _("pdf")),
    (TXT, _("txt")),

    (PNG, _("png")),
    (JPEG, _("jpeg")),
    (BMP, _("bmp")),
    (GIF, _("gif")),
    (SVG, _("svg")),
)
