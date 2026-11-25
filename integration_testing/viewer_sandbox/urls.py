from django.urls import re_path

from . import views

viewer_sandbox = views.ViewerSandboxView.as_view()
viewer_sandbox.provisioning_exempt = True

urlpatterns = [re_path(r"^$", viewer_sandbox, name="viewer_sandbox")]
