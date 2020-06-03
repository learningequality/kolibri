from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.utils.decorators import method_decorator
from django.views.generic.base import TemplateView
from django.http import JsonResponse
from rest_framework.decorators import api_view

from kolibri.core.decorators import cache_no_user_data
from kolibri.core.auth.models import FacilityUser


@api_view(["GET"])
def sanitized_facility_users(request):
    def sanitize(fac_user):
        return {
            "id": fac_user.id,
            "username": fac_user.username,
            "full_name": fac_user.full_name,
            "facility_id": fac_user.facility_id,
            "is_learner": len(fac_user.get_roles_for_user(fac_user)) == 0,
            "needs_password": fac_user.password == "NOT_SPECIFIED" or not fac_user.password

        }
    return JsonResponse(
        list(map(sanitize, FacilityUser.objects.all())),
        safe=False
    )


@method_decorator(cache_no_user_data, name="dispatch")
class UserView(TemplateView):
    template_name = "user/user.html"
