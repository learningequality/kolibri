from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.generic.base import TemplateView


@method_decorator(never_cache, name="dispatch")
class ViewerSandboxView(TemplateView):
    template_name = "viewer_sandbox/viewer_sandbox.html"
