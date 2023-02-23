from django.conf.urls import url

from .views import LearnView

urlpatterns = [
    url(r"^$", LearnView.as_view(), name="learn"),
    url(r"^my-downloads$", LearnView.as_view(), name="my_downloads"),
]
