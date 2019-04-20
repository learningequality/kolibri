from django.conf.urls import url

from . import views

urlpatterns = [url(r"^$", views.SetupWizardView.as_view(), name="setupwizard")]
