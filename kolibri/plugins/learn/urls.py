from django.conf.urls import url

from .views import LearnView

urlpatterns = [url(r"^$", LearnView.as_view(), name="learn")]
