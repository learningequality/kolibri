from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@cache_no_user_data
class UserProfileView(TemplateView):
    template_name = "user_profile/user_profile.html"
