"""
This module contains constants representing the kinds of ContentKind.
"""
from django.utils.translation import ugettext_lazy as _

# constants for ContentKind
TOPIC = "topic"
VIDEO = "video"
AUDIO = "audio"
EXERCISE = "exercise"
DOCUMENT = "document"
IMAGE = "image"

choices = (
    (TOPIC, _("Topic")),
    (VIDEO, _("Video")),
    (AUDIO, _("Audio")),
    (EXERCISE, _("Exercise")),
    (DOCUMENT, _("Document")),
    (IMAGE, _("Image")),
)
