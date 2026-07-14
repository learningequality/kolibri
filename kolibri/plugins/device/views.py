from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@cache_no_user_data
class DeviceManagementView(TemplateView):
    template_name = "device_management.html"
