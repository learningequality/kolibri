from django.utils.decorators import method_decorator
from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@method_decorator(cache_no_user_data, name="dispatch")
class UserProfileView(TemplateView):
    template_name = "user_profile/user_profile.html"
