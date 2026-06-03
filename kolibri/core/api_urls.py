"""
Kolibri Core API URL Configuration.

WARNING: These APIs are internal and designed for Kolibri's own frontend.
They may change without notice between releases. Do not build external
applications that depend on these endpoints.

For stable APIs, use only the /public/ endpoints defined in
kolibri.core.public.api_urls - these are maintained with backwards
compatibility for external integrations.
"""

from django.urls import include
from django.urls import re_path

urlpatterns = [
    re_path(r"^auth/", include("kolibri.core.auth.api_urls")),
    re_path(r"^bookmarks/", include("kolibri.core.bookmarks.api_urls")),
    re_path(r"^content/", include("kolibri.core.content.api_urls")),
    re_path(r"^logger/", include("kolibri.core.logger.api_urls")),
    re_path(r"^tasks/", include("kolibri.core.tasks.api_urls")),
    re_path(r"^exams/", include("kolibri.core.exams.api_urls")),
    re_path(r"^device/", include("kolibri.core.device.api_urls")),
    re_path(r"^lessons/", include("kolibri.core.lessons.api_urls")),
    re_path(r"^courses/", include("kolibri.core.courses.api_urls")),
    re_path(r"^discovery/", include("kolibri.core.discovery.api_urls")),
    re_path(r"^notifications/", include("kolibri.core.analytics.api_urls")),
    re_path(r"^attendance/", include("kolibri.core.attendance.api_urls")),
    re_path(r"^public/", include("kolibri.core.public.api_urls")),
]
