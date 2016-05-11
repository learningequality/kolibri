"""
This module contains constants representing the ids of FormatPreset.
"""
from django.utils.translation import ugettext_lazy as _

# constants for FormatPreset
HIGH_RES_VIDEO = "high_res_video"
MID_RES_VIDEO = "mid_res_video"
LOW_RES_VIDEO = "low_res_video"
VECTOR_VIDEO = "vertor_video"

EN_SUBTITLE = "en_subtitle"
ES_SUBTITLE = "es_subtitle"
ZH_SUBTITLE = "zh_subtitle"

THUMBNAIL = "thumbnail"

choices = (
    (HIGH_RES_VIDEO, _("High resolution video")),
    (MID_RES_VIDEO, _("Medium resolution video")),
    (LOW_RES_VIDEO, _("Low resolution video")),
    (VECTOR_VIDEO, _("Vertor video")),

    (THUMBNAIL, _("Thumbnail")),

    (EN_SUBTITLE, _("English subtitle")),
    (ES_SUBTITLE, _("Spanish subtitle")),
    (ZH_SUBTITLE, _("Chinese subtitle")),
)
