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
    re_path(r"^discovery/", include("kolibri.core.discovery.api_urls")),
    re_path(r"^notifications/", include("kolibri.core.analytics.api_urls")),
    re_path(r"^public/", include("kolibri.core.public.api_urls")),
]
