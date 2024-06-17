from django.utils.decorators import method_decorator
from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@method_decorator(cache_no_user_data, name="dispatch")
class DeviceManagementView(TemplateView):
    template_name = "device_management.html"


@method_decorator(cache_no_user_data, name="dispatch")
class ManageUsersView(TemplateView):
    template_name = "users.html"
