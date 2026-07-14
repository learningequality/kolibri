from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@cache_no_user_data
class UserAuthView(TemplateView):
    """Authenticated users are redirected away on the frontend, in app.js."""

    template_name = "user_auth/user_auth.html"
