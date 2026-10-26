from django.urls import re_path

from kolibri.core.auth.middleware import session_exempt
from kolibri.plugins.zim_viewer.views import ZimResolveBatchView

urlpatterns = [
    re_path(
        r"^zim/resolve_batch/(?P<filename>[0-9a-f]{32}\.zim)$",
        session_exempt(ZimResolveBatchView.as_view()),
        name="zim_resolve_batch",
    ),
]
