from django.conf.urls import url

from . import views

urlpatterns = [
    url('^', views.SetupWizardView.as_view(), name='setupwizard'),
]
