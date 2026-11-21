from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data
from kolibri.core.decorators import connect_to_any_http_origin


@connect_to_any_http_origin
@cache_no_user_data
class DeviceManagementView(TemplateView):
    template_name = "device_management.html"
