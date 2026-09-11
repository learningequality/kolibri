from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@cache_no_user_data
class PoliciesView(TemplateView):
    template_name = "policies/policies.html"
