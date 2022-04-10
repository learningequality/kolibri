"""
This is here to enable redirects from the old /user endpoint to /auth
"""
from django.conf.urls import include
from django.conf.urls import url
from django.views.generic.base import RedirectView

from kolibri.core.device.translation import i18n_patterns

redirect_patterns = [
    url(
        r"^user/$",
        RedirectView.as_view(
            pattern_name="kolibri:kolibri.plugins.user_auth:user_auth", permanent=True
        ),
        name="redirect_user",
    ),
]

urlpatterns = [url(r"", include(i18n_patterns(redirect_patterns)))]
