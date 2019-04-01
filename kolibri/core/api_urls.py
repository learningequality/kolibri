from django.conf.urls import include
from django.conf.urls import url

urlpatterns = [
    url(r"^auth/", include("kolibri.core.auth.api_urls")),
    url(r"^content/", include("kolibri.core.content.api_urls")),
    url(r"^logger/", include("kolibri.core.logger.api_urls")),
    url(r"^tasks/", include("kolibri.core.tasks.api_urls")),
    url(r"^exams/", include("kolibri.core.exams.api_urls")),
    url(r"^device/", include("kolibri.core.device.api_urls")),
    url(r"^lessons/", include("kolibri.core.lessons.api_urls")),
    url(r"^discovery/", include("kolibri.core.discovery.api_urls")),
    url(r"^notifications/", include("kolibri.core.analytics.api_urls")),
    url(r"^public/", include("kolibri.core.public.api_urls")),
]
