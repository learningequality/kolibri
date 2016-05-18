"""
This module contains constants representing the ids of FormatPreset.
"""
from django.utils.translation import ugettext_lazy as _

# constants for FormatPreset
VIDEO_HIGH_RES = "high_res_video"
VIDEO_LOW_RES = "low_res_video"
VIDEO_VECTOR = "vector_video"

VIDEO_THUMBNAIL = "thumbnail"
DOC_THUMBNAIL = "thumbnail"

VIDEO_CAPTION = "caption"

choices = (
    (VIDEO_HIGH_RES, _("High resolution video")),
    (VIDEO_LOW_RES, _("Low resolution video")),
    (VIDEO_VECTOR, _("Vertor video")),

    (VIDEO_THUMBNAIL, _("Thumbnail")),
    (DOC_THUMBNAIL, _("Thumbnail")),

    (VIDEO_CAPTION, _("Caption")),
)
